/**
 * Run with `npm run check:scoping`. Needs the seeded database up
 * (`npm run infra:up && npm run db:push && npm run db:seed`).
 *
 * Everything the ERP keeps private is private because of one function. The list
 * endpoints build a scoped `where`, but the by-id endpoints — a medical record,
 * an invoice, a child's messages — have nothing to filter on, so they ask
 * `canSeeStudent` and trust the answer. For a while that answer was "yes" for
 * anyone who was not a parent, which meant a teacher at one campus could read a
 * child's medical history at the other by guessing an id.
 *
 * These tests are written from the attacker's side: each one takes a real login
 * and a real id that login has no business touching, and insists on a refusal.
 * A test that only proved the happy path would have passed against the bug.
 */
import "dotenv/config";
import { prisma } from "../../src/backend/database/client";
import { canSeeStudent, type Scope } from "../../src/backend/utils/scope.util";
import { feeService } from "../../src/backend/services/fee.service";
import { opsService } from "../../src/backend/services/ops.service";
import { learningService } from "../../src/backend/services/learning.service";
import { auditService } from "../../src/backend/services/audit.service";
import { ROLES, type Role } from "@/shared/constants/roles";

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

/** Asserts the call is refused. A call that *succeeds* is the bug. */
async function refuses(label: string, run: () => Promise<unknown>) {
  try {
    await run();
    check(label, false, "— call was allowed");
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    check(label, name === "AppError" || name === "ForbiddenError", `— threw ${name}`);
  }
}

async function allows(label: string, run: () => Promise<unknown>) {
  try {
    await run();
    check(label, true);
  } catch (e) {
    check(label, false, `— threw ${e instanceof Error ? e.message : String(e)}`);
  }
}

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

async function main() {
  const branches = await prisma.branch.findMany({ orderBy: { createdAt: "asc" } });
  if (branches.length < 2) throw new Error("Seed the database first — need two branches.");
  const [branchA, branchB] = branches;

  const studentA = await prisma.student.findFirst({
    where: { branchId: branchA.id, classroomId: { not: null }, status: "ACTIVE" },
  });
  const studentB = await prisma.student.findFirst({
    where: { branchId: branchB.id, classroomId: { not: null }, status: "ACTIVE" },
  });
  if (!studentA || !studentB) throw new Error("Need an active, placed student at each branch.");

  // An admin who runs branch A, and a teacher who teaches exactly one room in it.
  const adminA = scopeOf({ role: ROLES.ADMIN, branchId: branchA.id });
  const superAdmin = scopeOf({ role: ROLES.SUPER_ADMIN, branchId: null });
  const teacherOfA = scopeOf({
    role: ROLES.TEACHER,
    branchId: branchA.id,
    classroomIds: [studentA.classroomId as string],
  });
  const parentOfA = scopeOf({ role: ROLES.PARENT, studentIds: [studentA.id] });

  console.log("\ncanSeeStudent — the gate itself");
  check("parent sees their own child", await canSeeStudent(parentOfA, studentA.id));
  check("parent cannot see another family's child", !(await canSeeStudent(parentOfA, studentB.id)));
  check("super admin sees every branch", await canSeeStudent(superAdmin, studentB.id));
  check("admin sees a child at their own branch", await canSeeStudent(adminA, studentA.id));
  check(
    "admin cannot see a child at the other branch",
    !(await canSeeStudent(adminA, studentB.id)),
  );
  check("teacher sees a child in their own room", await canSeeStudent(teacherOfA, studentA.id));
  check(
    "teacher cannot see a child at the other branch",
    !(await canSeeStudent(teacherOfA, studentB.id)),
  );
  // An id that does not exist must not read as permission.
  check("an unknown child id is refused", !(await canSeeStudent(adminA, "stu_does_not_exist")));

  console.log("\nA teacher in a room they do not teach");
  const otherRoom = await prisma.classroom.findFirst({
    where: { branchId: branchA.id, id: { not: studentA.classroomId as string } },
  });
  if (otherRoom) {
    const strangerInSameBranch = await prisma.student.findFirst({
      where: { classroomId: otherRoom.id, status: "ACTIVE" },
    });
    if (strangerInSameBranch) {
      check(
        "teacher cannot see a child in another room at the same branch",
        !(await canSeeStudent(teacherOfA, strangerInSameBranch.id)),
      );
    }
  }

  console.log("\nBy-id endpoints — the paths that have nothing to filter on");
  const invoiceB = await prisma.invoice.findFirst({ where: { studentId: studentB.id } });
  check("precondition: an invoice exists at the other branch", invoiceB !== null);
  if (invoiceB) {
    await refuses("admin cannot fetch the other branch's invoice by id", () =>
      feeService.getInvoice(adminA, invoiceB.id),
    );
    await refuses("teacher cannot fetch an invoice by id", () =>
      feeService.getInvoice(teacherOfA, invoiceB.id),
    );
    await refuses("parent cannot fetch another family's invoice by id", () =>
      feeService.getInvoice(parentOfA, invoiceB.id),
    );
    await allows("super admin can fetch any invoice by id", () =>
      feeService.getInvoice(superAdmin, invoiceB.id),
    );
  }

  await refuses("admin cannot read the other branch's medical profile", () =>
    opsService.medicalProfile(adminA, studentB.id),
  );
  await refuses("teacher cannot read the other branch's medical profile", () =>
    opsService.medicalProfile(teacherOfA, studentB.id),
  );
  await refuses("parent cannot read another family's medical profile", () =>
    opsService.medicalProfile(parentOfA, studentB.id),
  );
  await refuses("admin cannot list the other branch's emergency contacts", () =>
    opsService.emergencyContacts(adminA, studentB.id),
  );

  console.log("\nEditing someone else's row while naming your own child");
  // The IDOR: the check used to be on the studentId in the body, which the
  // caller picks. Pair your own child with a stranger's contact id and the
  // update walks their row over to you.
  // The row under attack is created here rather than looked for in the seed:
  // the seed happens to carry only three contacts, none of them at branch B, so
  // a `findFirst` would skip this — quietly, which for the sharpest test in the
  // file is worse than failing.
  const contactB = await prisma.emergencyContact.create({
    data: {
      studentId: studentB.id,
      name: "Real Guardian",
      relation: "GRANDMOTHER",
      phone: "+91 98000 00000",
      priority: 1,
    },
  });
  try {
    await refuses("admin cannot re-point another branch's contact at their own student", () =>
      opsService.upsertEmergencyContact(adminA, contactB.id, {
        studentId: studentA.id,
        name: "Attacker",
        relation: "UNCLE",
        phone: "+91 90000 00000",
        priority: 1,
      }),
    );
    const after = await prisma.emergencyContact.findUnique({ where: { id: contactB.id } });
    check(
      "the contact still belongs to the child it belonged to",
      after?.studentId === studentB.id,
      `— now ${after?.studentId}`,
    );
    check("and its details are untouched", after?.name === "Real Guardian", `— now ${after?.name}`);
  } finally {
    await prisma.emergencyContact.delete({ where: { id: contactB.id } }).catch(() => {});
  }

  const milestoneB = await prisma.milestone.findFirst({ where: { studentId: studentB.id } });
  check("precondition: a milestone exists at the other branch", milestoneB !== null);
  if (milestoneB) {
    await refuses("teacher cannot delete a milestone belonging to another branch", () =>
      learningService.deleteMilestone(teacherOfA, milestoneB.id),
    );
    const still = await prisma.milestone.findUnique({ where: { id: milestoneB.id } });
    check("the milestone is still there", still !== null);
  }

  // --- The audit trail ------------------------------------------------------
  // The last unscoped read in the codebase. `list()` took only a limit, so a
  // branch admin opening /admin/audit read the other campus's trail: who
  // enrolled which child, which invoice was written off, who was messaged.
  console.log("\nThe audit trail belongs to the branch it records");

  const entries = await Promise.all(
    [
      { branchId: branchA.id, actorName: "Admin A", action: "test.audit.branchA" },
      { branchId: branchB.id, actorName: "Admin B", action: "test.audit.branchB" },
      { branchId: null, actorName: "Super", action: "test.audit.global" },
    ].map((data) =>
      prisma.auditEntry.create({
        data: { ...data, actorRole: data.branchId ? ROLES.ADMIN : ROLES.SUPER_ADMIN },
      }),
    ),
  );

  try {
    const seenByA = await auditService.list(adminA);
    const actions = new Set(seenByA.map((e) => e.action));
    check("an admin sees their own branch's entries", actions.has("test.audit.branchA"));
    check("and not the other branch's", !actions.has("test.audit.branchB"));
    check(
      "and not the ones a super admin recorded across all branches",
      !actions.has("test.audit.global"),
    );

    const seenBySuper = new Set((await auditService.list(superAdmin)).map((e) => e.action));
    check("a super admin sees every branch", seenBySuper.has("test.audit.branchA") && seenBySuper.has("test.audit.branchB"));
    check("including the unbranched entries", seenBySuper.has("test.audit.global"));

    // An admin row with no branch is an admin of one branch that has not been
    // set, not an admin of all of them. Filtering on `branchId: null` would
    // hand them exactly the entries reserved for SUPER_ADMIN.
    const branchlessAdmin = scopeOf({ role: ROLES.ADMIN, branchId: null });
    check("an admin with no branch sees nothing at all", (await auditService.list(branchlessAdmin)).length === 0);

    // The limit is still the caller's, and it must not become a way to page
    // past the branch filter.
    const limited = await auditService.list(adminA, 1);
    check("the limit still applies within the branch", limited.length <= 1);
    check(
      "and what it returns is still the admin's own branch",
      limited.every((e) => e.action !== "test.audit.branchB" && e.action !== "test.audit.global"),
    );
  } finally {
    await prisma.auditEntry.deleteMany({ where: { id: { in: entries.map((e) => e.id) } } });
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
