/**
 * Run with `npm run check:media`. Needs the seeded database up.
 *
 * The daily photo feed is the feature a playschool ERP is bought for, and it is
 * also the one that ends careers when it goes wrong. So this suite is written
 * around the two ways it goes wrong: a photograph of somebody's child being
 * readable by somebody else, and a photograph being taken of a child whose
 * family said no.
 *
 * It uses an in-memory blob store, because what is worth asserting is which
 * bytes were stored and who was allowed to read them — not whether Vercel's
 * storage was up.
 */
import "dotenv/config";
import { prisma } from "../../src/backend/database/client";
import { mediaService } from "../../src/backend/services/media.service";
import { feedService } from "../../src/backend/services/feed.service";
import { setBlobStore, type BlobStore, type StoredObject } from "../../src/backend/integrations/storage";
import { signMediaToken, signViewToken } from "../../src/backend/utils/jwt.util";
import { verifyMediaToken } from "../../src/backend/utils/jwt.util";
import { ROLES, type Role } from "@/shared/constants/roles";
import type { Scope } from "../../src/backend/utils/scope.util";

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
    check(label, false, "— call was allowed");
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    check(label, name === "AppError" || name === "ForbiddenError", `— threw ${name}`);
  }
}

/** Everything that was stored, so the test can look at the actual bytes. */
const stored = new Map<string, StoredObject>();
const memoryStore: BlobStore = {
  name: "test-memory",
  async put(key, body, contentType) {
    stored.set(key, { body, contentType });
  },
  async get(key) {
    return stored.get(key) ?? null;
  },
  async delete(key) {
    stored.delete(key);
  },
};

function scopeOf(over: Partial<Scope> & { role: Role }): Scope {
  return {
    userId: "",
    name: "test",
    branchId: null,
    staffId: null,
    studentIds: [],
    classroomIds: [],
    ...over,
  };
}

// A JPEG carrying a location, built the same way the unit suite builds one.
function jpegWithGps(): Uint8Array {
  const exif = Buffer.concat([
    Buffer.from("Exif\0\0", "latin1"),
    Buffer.from("MM\0*", "latin1"),
    Buffer.from("GPSLatitude 22.5726N 88.3639E", "latin1"),
  ]);
  const app1 = Buffer.concat([
    Buffer.from([0xff, 0xe1, ((exif.length + 2) >> 8) & 0xff, (exif.length + 2) & 0xff]),
    exif,
  ]);
  return Uint8Array.from(
    Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      app1,
      Buffer.from([0xff, 0xda]),
      Buffer.from("entropy-coded-scan-data", "latin1"),
      Buffer.from([0xff, 0xd9]),
    ]),
  );
}
const contains = (body: Uint8Array, needle: string) =>
  Buffer.from(body).includes(Buffer.from(needle, "latin1"));

async function main() {
  const previousStore = setBlobStore(memoryStore);
  const stamp = Date.now().toString(36);
  const cleanup: { activityIds: string[]; mediaIds: string[]; studentIds: string[] } = {
    activityIds: [],
    mediaIds: [],
    studentIds: [],
  };

  const classroom = await prisma.classroom.findFirst({ include: { branch: true } });
  const otherClassroom = await prisma.classroom.findFirst({
    where: { id: { not: classroom?.id } },
  });
  if (!classroom || !otherClassroom) throw new Error("Seed the database first.");

  const teacherStaff = await prisma.staff.findFirst({
    where: { classrooms: { some: { classroomId: classroom.id } } },
    include: { user: true },
  });
  if (!teacherStaff?.userId) throw new Error("Seed the database first — need a teacher.");

  const childA = await prisma.student.findFirst({
    where: { classroomId: classroom.id, status: "ACTIVE" },
  });
  const childB = await prisma.student.findFirst({
    where: { classroomId: otherClassroom.id, status: "ACTIVE" },
  });
  if (!childA || !childB) throw new Error("Seed the database first — need placed children.");

  // Real user rows: consent records who decided it, as a foreign key, because a
  // consent nobody can attribute is not verifiable consent.
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const guardianOfA = await prisma.guardianship.findFirst({
    where: { studentId: childA.id, guardian: { userId: { not: null } } },
    include: { guardian: true },
  });
  const guardianOfB = await prisma.guardianship.findFirst({
    where: { studentId: childB.id, guardian: { userId: { not: null } } },
    include: { guardian: true },
  });
  if (!adminUser || !guardianOfA?.guardian.userId || !guardianOfB?.guardian.userId) {
    throw new Error("Seed the database first — need an admin and a guardian login per child.");
  }

  const teacher = scopeOf({
    role: ROLES.TEACHER,
    userId: teacherStaff.userId,
    staffId: teacherStaff.id,
    branchId: teacherStaff.branchId,
    classroomIds: [classroom.id],
  });
  const admin = scopeOf({
    role: ROLES.ADMIN,
    userId: adminUser.id,
    name: adminUser.name,
    branchId: classroom.branchId,
  });
  const parentOfA = scopeOf({
    role: ROLES.PARENT,
    userId: guardianOfA.guardian.userId,
    studentIds: [childA.id],
    branchId: classroom.branchId,
  });
  const parentOfB = scopeOf({
    role: ROLES.PARENT,
    userId: guardianOfB.guardian.userId,
    studentIds: [childB.id],
    branchId: otherClassroom.branchId,
  });
  const otherTeacher = scopeOf({
    role: ROLES.TEACHER,
    userId: `teacher-other-${stamp}`,
    staffId: "staff-other",
    branchId: classroom.branchId,
    classroomIds: [otherClassroom.id],
  });

  // The seed records consent for the demo families, and this suite changes two
  // of them on purpose. Put them back, or the next run of the demo shows a
  // different school.
  const consentBefore = await prisma.photoConsent.findMany({
    where: { studentId: { in: [childA.id, childB.id] } },
  });

  try {
    // --- Taking the photograph in -------------------------------------------
    console.log("\nA photo comes in with a location in it");

    const original = jpegWithGps();
    const uploaded = await mediaService.upload(
      teacher,
      { bytes: original, name: "../../IMG_2231.jpg", declaredType: "image/jpeg" },
      { classroomId: classroom.id },
    );
    cleanup.mediaIds.push(uploaded.id);

    const row = await prisma.mediaObject.findUnique({ where: { id: uploaded.id } });
    const object = stored.get(row!.storageKey);
    check("it was stored", object !== undefined);
    check("the coordinates never reached storage", !contains(object!.body, "GPSLatitude"));
    check("the picture did", contains(object!.body, "entropy-coded-scan-data"));
    check("the recorded size is the stripped size", row?.sizeBytes === object?.body.length);
    check("the stored key is nothing like the filename", !row!.storageKey.includes("IMG_2231"));
    check("the filename was sanitised for display", row?.originalName === "IMG_2231.jpg");
    check("the URL is ours, not a blob URL", uploaded.url === `/api/media/${uploaded.id}`);
    check("and it is not a public link", !uploaded.url.startsWith("http"));

    console.log("\nWhat will not be accepted");
    await refuses("an HTML file dressed as a photo", () =>
      mediaService.upload(teacher, {
        bytes: Uint8Array.from(Buffer.from("<html><script>alert(1)</script>")),
        name: "photo.jpg",
        declaredType: "image/jpeg",
      }),
    );
    await refuses("an SVG, which can carry script", () =>
      mediaService.upload(teacher, {
        bytes: Uint8Array.from(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')),
        name: "drawing.svg",
        declaredType: "image/svg+xml",
      }),
    );
    await refuses("an empty file", () =>
      mediaService.upload(teacher, { bytes: new Uint8Array(), name: "x.jpg", declaredType: "image/jpeg" }),
    );
    await refuses("something larger than the cap", () =>
      mediaService.upload(teacher, {
        bytes: new Uint8Array(11 * 1024 * 1024),
        name: "huge.jpg",
        declaredType: "image/jpeg",
      }),
    );
    await refuses("a teacher uploading into a room that is not theirs", () =>
      mediaService.upload(teacher, { bytes: jpegWithGps(), name: "a.jpg", declaredType: "image/jpeg" }, {
        classroomId: otherClassroom.id,
      }),
    );
    await refuses("a parent uploading at all", () =>
      mediaService.upload(parentOfA, { bytes: jpegWithGps(), name: "a.jpg", declaredType: "image/jpeg" }),
    );

    // --- Who may look at it --------------------------------------------------
    console.log("\nWho may look at it");

    const seenByTeacher = await mediaService.read(teacher, uploaded.id);
    check("the teacher whose room it is can read it", seenByTeacher.body.length > 0);
    check("and gets the right content type", seenByTeacher.contentType === "image/jpeg");
    await refuses("a teacher from another room cannot", () =>
      mediaService.read(otherTeacher, uploaded.id),
    );
    check(
      "the branch admin can",
      (await mediaService.read(admin, uploaded.id)).body.length > 0,
    );
    await refuses("a parent cannot, before it is on a post", () =>
      mediaService.read(parentOfA, uploaded.id),
    );
    await refuses("a signed-out caller certainly cannot", () =>
      mediaService.read(scopeOf({ role: ROLES.PARENT }), uploaded.id),
    );
    await refuses("nor can anyone read a photo that does not exist", () =>
      mediaService.read(admin, "med_does_not_exist"),
    );

    // --- Consent -------------------------------------------------------------
    console.log("\nA family that said no");

    await mediaService.setConsent(admin, childA.id, { allowed: true });
    await mediaService.setConsent(admin, childB.id, { allowed: false, note: "No photographs" });

    const consentA = await mediaService.getConsent(admin, childA.id);
    check("consent is recorded with who decided it", consentA.decidedByName === adminUser.name);
    check("and when", consentA.decidedAt !== null);

    await refuses("a teacher cannot record consent — it constrains them", () =>
      mediaService.setConsent(teacher, childA.id, { allowed: true }),
    );
    await refuses("a parent cannot answer for another family's child", () =>
      mediaService.setConsent(parentOfA, childB.id, { allowed: true }),
    );

    const photoPost = await feedService.create(teacher, {
      classroomId: classroom.id,
      kind: "LEARNING",
      title: `Painting ${stamp}`,
      body: "We painted the garden.",
      media: [{ id: uploaded.id, url: uploaded.url, kind: "image" }],
      studentIds: [childA.id],
      published: true,
      internalNote: "",
    });
    cleanup.activityIds.push(photoPost.id);
    check("a photographed post naming a consenting child is allowed", photoPost.id.length > 0);

    // childB is in another room, so use a consenting-then-refused child in this
    // room to prove the refusal actually blocks the post.
    await mediaService.setConsent(admin, childA.id, { allowed: false, note: "Withdrawn" });
    await refuses("the same post is refused once that family withdraws consent", () =>
      feedService.create(teacher, {
        classroomId: classroom.id,
        kind: "LEARNING",
        title: `Painting again ${stamp}`,
        body: "More painting.",
        media: [{ id: uploaded.id, url: uploaded.url, kind: "image" }],
        studentIds: [childA.id],
        published: true,
        internalNote: "",
      }),
    );

    const written = await feedService.create(teacher, {
      classroomId: classroom.id,
      kind: "LEARNING",
      title: `A note home ${stamp}`,
      body: "Nothing photographic about this.",
      media: [],
      studentIds: [childA.id],
      published: true,
      internalNote: "",
    });
    cleanup.activityIds.push(written.id);
    check(
      "but a post with no photographs is unaffected — a note is not a photograph",
      written.id.length > 0,
    );

    let refusalNamesTheChild = false;
    try {
      await feedService.create(teacher, {
        classroomId: classroom.id,
        kind: "LEARNING",
        title: `Group photo ${stamp}`,
        body: "Everyone together.",
        media: [{ id: uploaded.id, url: uploaded.url, kind: "image" }],
        studentIds: [childA.id],
        published: true,
        internalNote: "",
      });
    } catch (e) {
      refusalNamesTheChild = e instanceof Error && e.message.includes(childA.firstName);
    }
    check("the refusal names the child to leave out, so the teacher can act", refusalNamesTheChild);

    await mediaService.setConsent(admin, childA.id, { allowed: true });

    // --- The parent's own child ----------------------------------------------
    console.log("\nThe parent whose child is in the picture");

    check(
      "can now read the photo, through the post",
      (await mediaService.read(parentOfA, uploaded.id)).body.length > 0,
    );
    await refuses("a parent at the other campus still cannot", () =>
      mediaService.read(parentOfB, uploaded.id),
    );

    // --- Signed URLs ---------------------------------------------------------
    console.log("\nA link for a client that cannot send the cookie");

    const url = await mediaService.signedUrl(parentOfA, uploaded.id, 300);
    const token = new URL(`http://x${url}`).searchParams.get("token") ?? "";
    check("the URL carries a token", token.length > 0);
    const claims = await verifyMediaToken(token);
    check("which names this photo", claims?.mediaId === uploaded.id);
    check("and the person it was minted for", claims?.sub === parentOfA.userId);
    check("an unsigned request has no token to verify", (await verifyMediaToken(null)) === null);
    check("a made-up token does not verify", (await verifyMediaToken("not.a.token")) === null);

    // The CCTV view token is signed with the same key and would otherwise open
    // a photograph as well as a camera.
    const cctvToken = await signViewToken(
      { sub: parentOfA.userId, cameraId: "cam_1", streamPath: "classroom-a" },
      60,
    );
    check("a camera token is not a photo token", (await verifyMediaToken(cctvToken)) === null);

    const expired = await signMediaToken({ sub: parentOfA.userId, mediaId: uploaded.id }, -10);
    check("an expired token does not verify", (await verifyMediaToken(expired)) === null);

    await refuses("and a parent cannot mint one for a photo they may not see", () =>
      mediaService.signedUrl(parentOfB, uploaded.id),
    );
  } finally {
    setBlobStore(previousStore);
    await prisma.photoConsent.deleteMany({ where: { studentId: { in: [childA.id, childB.id] } } });
    if (consentBefore.length > 0) {
      await prisma.photoConsent.createMany({ data: consentBefore });
    }
    await prisma.activity.deleteMany({ where: { title: { contains: stamp } } });
    await prisma.mediaObject.deleteMany({ where: { id: { in: cleanup.mediaIds } } });
    await prisma.student.deleteMany({ where: { id: { in: cleanup.studentIds } } });
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
