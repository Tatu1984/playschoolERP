/**
 * Run with `npm run check:cctv`. Needs the seeded database up.
 *
 * This is live video of other people's children, so it is the one part of the
 * product where being wrong is not a bug report but an incident. Two gates
 * matter and they are independent on purpose:
 *
 *  * Issuance decides whether this login may watch this camera at all.
 *  * `authorizeMediaAccess` is what the media server asks before it opens a
 *    stream, and it re-checks from scratch rather than trusting that whoever
 *    holds a token was once allowed one.
 *
 * The tests below are mostly refusals, because that is what this code is for.
 * School hours are pinned open and restored afterwards — otherwise every
 * positive case would pass or fail depending on what time the suite ran.
 */
import "dotenv/config";
import { prisma } from "../../src/backend/database/client";
import { cctvService } from "../../src/backend/services/cctv.service";
import { verifyViewToken } from "../../src/backend/utils/jwt.util";
import { env } from "../../src/config/env";
import { ROLES } from "@/shared/constants/roles";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label} ${detail}`);
  }
}

async function refuses(label: string, run: () => Promise<unknown>) {
  try {
    await run();
    check(label, false, "— it was allowed");
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    check(label, name === "AppError" || name === "ForbiddenError" || name === "NotFoundError", `— threw ${name}`);
  }
}

const NO_CTX = {};

async function main() {
  const camera = await prisma.camera.findFirst({
    where: { enabled: true, parentViewable: true, classroomId: { not: null } },
    include: { branch: true },
  });
  if (!camera) throw new Error("Seed the database first — need an enabled, parent-viewable camera.");

  // A parent of a child in this camera's room, found the way the service does.
  const guardianship = await prisma.guardianship.findFirst({
    where: { student: { classroomId: camera.classroomId } },
    include: { guardian: true, student: true },
  });
  const parentUserId = guardianship?.guardian.userId;
  if (!parentUserId) throw new Error("Need a guardian with a login for that classroom.");

  // A parent whose children are in no room this camera covers.
  const otherGuardianship = await prisma.guardianship.findFirst({
    where: {
      student: { classroomId: { not: camera.classroomId } },
      guardian: { userId: { not: parentUserId } },
    },
    include: { guardian: true },
  });
  const otherParentUserId = otherGuardianship?.guardian.userId;

  // Pin the branch open for every day, so "is it school hours" stops being a
  // function of when this suite happens to run.
  const originalHours = await prisma.schoolHours.findMany({ where: { branchId: camera.branchId } });
  await prisma.schoolHours.deleteMany({ where: { branchId: camera.branchId } });
  await prisma.schoolHours.createMany({
    data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      branchId: camera.branchId,
      dayOfWeek,
      openMin: 0,
      closeMin: 24 * 60,
    })),
  });

  try {
    console.log("\nIssuing a view token");
    const issued = await cctvService.issueViewToken(parentUserId, ROLES.PARENT, camera.id, NO_CTX);
    check("a parent of a child in that room gets a token", typeof issued.token === "string");
    check("it is short-lived", issued.expiresInSeconds > 0 && issued.expiresInSeconds <= 300);

    const claims = await verifyViewToken(issued.token);
    check("the token names the camera", claims?.cameraId === camera.id);
    check("the token names the stream", claims?.streamPath === camera.streamPath);
    check("the token names the viewer", claims?.sub === parentUserId);

    if (otherParentUserId) {
      await refuses("another family is refused that camera", () =>
        cctvService.issueViewToken(otherParentUserId, ROLES.PARENT, camera.id, NO_CTX),
      );
    }

    await refuses("an unknown camera id is refused", () =>
      cctvService.issueViewToken(parentUserId, ROLES.PARENT, "cam_does_not_exist", NO_CTX),
    );

    console.log("\nThe media server's own check");
    const ok = await cctvService.authorizeMediaAccess({
      action: "read",
      path: camera.streamPath,
      token: issued.token,
    });
    check("a valid token opens its own stream", ok);

    // The token is for one camera. If it opened any stream, one family's token
    // would be a key to every classroom in the school.
    const otherCamera = await prisma.camera.findFirst({
      where: { id: { not: camera.id }, enabled: true },
    });
    if (otherCamera) {
      const crossed = await cctvService.authorizeMediaAccess({
        action: "read",
        path: otherCamera.streamPath,
        token: issued.token,
      });
      check("that token does not open a different camera's stream", !crossed);
    }

    check(
      "no token at all is refused",
      !(await cctvService.authorizeMediaAccess({ action: "read", path: camera.streamPath })),
    );
    check(
      "a forged token is refused",
      !(await cctvService.authorizeMediaAccess({
        action: "read",
        path: camera.streamPath,
        token: "not.a.token",
      })),
    );

    console.log("\nOnly reading and publishing, and publishing needs the internal secret");
    check(
      "a viewer's token cannot publish",
      !(await cctvService.authorizeMediaAccess({
        action: "publish",
        path: camera.streamPath,
        token: issued.token,
      })),
    );
    check(
      "the internal publisher credentials do publish",
      await cctvService.authorizeMediaAccess({
        action: "publish",
        path: camera.streamPath,
        user: env.CCTV_PUBLISHER_USER,
        password: env.CCTV_INTERNAL_SECRET,
      }),
    );
    check(
      "a wrong publisher password does not",
      !(await cctvService.authorizeMediaAccess({
        action: "publish",
        path: camera.streamPath,
        user: env.CCTV_PUBLISHER_USER,
        password: "wrong",
      })),
    );
    for (const action of ["playback", "api", "metrics", "pprof"]) {
      check(
        `${action} is refused outright`,
        !(await cctvService.authorizeMediaAccess({
          action,
          path: camera.streamPath,
          token: issued.token,
        })),
      );
    }

    console.log("\nA camera that is switched off, or not for parents");
    await prisma.camera.update({ where: { id: camera.id }, data: { enabled: false } });
    await refuses("a disabled camera issues nothing", () =>
      cctvService.issueViewToken(parentUserId, ROLES.PARENT, camera.id, NO_CTX),
    );
    check(
      "and an already-issued token stops working on it",
      !(await cctvService.authorizeMediaAccess({
        action: "read",
        path: camera.streamPath,
        token: issued.token,
      })),
    );
    await prisma.camera.update({ where: { id: camera.id }, data: { enabled: true } });

    await prisma.camera.update({ where: { id: camera.id }, data: { parentViewable: false } });
    await refuses("a camera not marked parent-viewable issues nothing to a parent", () =>
      cctvService.issueViewToken(parentUserId, ROLES.PARENT, camera.id, NO_CTX),
    );
    await prisma.camera.update({ where: { id: camera.id }, data: { parentViewable: true } });

    console.log("\nAn explicit revocation beats the classroom");
    await prisma.cameraAccessGrant.create({
      data: { userId: parentUserId, cameraId: camera.id, allow: false },
    });
    await refuses("a revoked parent is refused their own child's room", () =>
      cctvService.issueViewToken(parentUserId, ROLES.PARENT, camera.id, NO_CTX),
    );
    await prisma.cameraAccessGrant.deleteMany({
      where: { userId: parentUserId, cameraId: camera.id },
    });

    console.log("\nOutside school hours");
    await prisma.schoolHours.deleteMany({ where: { branchId: camera.branchId } });
    await refuses("with no hours configured, a parent sees nothing", () =>
      cctvService.issueViewToken(parentUserId, ROLES.PARENT, camera.id, NO_CTX),
    );

    console.log("\nEvery decision is written down");
    const logged = await prisma.cctvViewLog.count({
      where: { cameraId: camera.id, userId: parentUserId },
    });
    check("grants and refusals are logged", logged > 0, `— ${logged} entries`);
  } finally {
    await prisma.cameraAccessGrant.deleteMany({
      where: { userId: parentUserId, cameraId: camera.id },
    });
    await prisma.camera.update({
      where: { id: camera.id },
      data: { enabled: true, parentViewable: true },
    });
    await prisma.schoolHours.deleteMany({ where: { branchId: camera.branchId } });
    if (originalHours.length) {
      await prisma.schoolHours.createMany({
        data: originalHours.map(({ branchId, dayOfWeek, openMin, closeMin }) => ({
          branchId,
          dayOfWeek,
          openMin,
          closeMin,
        })),
      });
    }
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
