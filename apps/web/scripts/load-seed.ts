/**
 * Fill a database with a school-sized year, so the portal's windows and caps
 * can be set from measurement rather than from a guess.
 *
 * `bootstrap.service.ts` bounds itself to 120 days and a few row caps, and
 * those numbers were chosen by reasoning rather than by timing anything. This
 * builds the volume a real school reaches — 400 children, a year of registers,
 * two years of correspondence — so the next script can time the thing.
 *
 * Run with `npm run load:seed`. It **refuses to run** unless DATABASE_URL names
 * a database ending in `_load`: it deletes everything it finds, and pointing it
 * at the demo database by accident would be a bad afternoon.
 *
 *   createdb playschool_load
 *   DATABASE_URL=postgresql://playschool:playschool@localhost:5432/playschool_load \
 *     npm run db:push && npm run load:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/backend/database/generated";

const url = process.env.DATABASE_URL ?? "";
const dbName = url.split("/").pop()?.split("?")[0] ?? "";
if (!dbName.endsWith("_load")) {
  console.error(
    `Refusing to run: DATABASE_URL names "${dbName}", which does not end in _load.\n` +
      "This script deletes everything it finds. Point it at a scratch database.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

/** A real Kathgola-sized school, two years in. */
const SCALE = {
  branches: 2,
  classroomsPerBranch: 8,
  studentsPerClassroom: 25, // 400 children
  teachersPerBranch: 10,
  attendanceDays: 250, // a full academic year of registers
  conversationsPerStudent: 1,
  messagesPerConversation: 60, // two years of correspondence
  activitiesPerClassroom: 200,
  invoicesPerStudent: 8, // termly, two years
  notificationsPerUser: 40,
};

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const dateKey = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  console.log(`Filling ${dbName} — this takes a couple of minutes.\n`);
  const startedAt = Date.now();

  // Order matters: children of a row go first.
  for (const table of [
    "notificationDelivery",
    "appNotification",
    "message",
    "conversationMember",
    "conversation",
    "activityTag",
    "activityComment",
    "activityReaction",
    "activity",
    "attendanceRecord",
    "payment",
    "invoice",
    "photoConsent",
    "guardianship",
    "guardian",
    "student",
    "staffClassroom",
    "staff",
    "classroom",
    "user",
    "branch",
  ] as const) {
    await (prisma[table] as { deleteMany: () => Promise<unknown> }).deleteMany();
  }

  const passwordHash = await bcrypt.hash("password12345", 4); // fast on purpose
  const step = (label: string, at: number) =>
    console.log(`  ${label.padEnd(28)} ${((Date.now() - at) / 1000).toFixed(1)}s`);

  // ---- branches, classrooms, staff -----------------------------------------
  let at = Date.now();
  const branches = Array.from({ length: SCALE.branches }, (_, i) => ({
    id: `ld_br_${i}`,
    name: `Branch ${i + 1}`,
    slug: `branch-${i + 1}`,
    code: `LD${i + 1}`,
    address: "Kathgola Road",
    city: "Kolkata",
  }));
  await prisma.branch.createMany({ data: branches });

  const classrooms = branches.flatMap((b, bi) =>
    Array.from({ length: SCALE.classroomsPerBranch }, (_, i) => ({
      id: `ld_cl_${bi}_${i}`,
      name: `Room ${i + 1}`,
      branchId: b.id,
      capacity: 30,
      programSlug: "nursery",
    })),
  );
  await prisma.classroom.createMany({ data: classrooms });

  const staffUsers = branches.flatMap((b, bi) =>
    Array.from({ length: SCALE.teachersPerBranch }, (_, i) => ({
      id: `ld_st_${bi}_${i}`,
      email: `teacher-${bi}-${i}@load.test`,
      name: `Teacher ${bi}-${i}`,
      passwordHash,
      role: "TEACHER" as const,
      branchId: b.id,
    })),
  );
  const admin = {
    id: "ld_admin",
    email: "admin@load.test",
    name: "Load Admin",
    passwordHash,
    role: "ADMIN" as const,
    branchId: branches[0].id,
  };
  await prisma.user.createMany({ data: [...staffUsers, admin] });
  await prisma.staff.createMany({
    data: staffUsers.map((u) => ({
      id: u.id,
      userId: u.id,
      name: u.name,
      email: u.email,
      role: "TEACHER",
      branchId: u.branchId!,
      joinedOn: daysAgo(700),
    })),
  });
  await prisma.staffClassroom.createMany({
    data: classrooms.map((c, i) => ({
      staffId: staffUsers[i % staffUsers.length].id,
      classroomId: c.id,
    })),
  });
  step("branches, rooms, staff", at);

  // ---- children and their families ------------------------------------------
  at = Date.now();
  const students = classrooms.flatMap((c, ci) =>
    Array.from({ length: SCALE.studentsPerClassroom }, (_, i) => ({
      id: `ld_stu_${ci}_${i}`,
      firstName: `Child${ci}`,
      lastName: `Number${i}`,
      admissionNo: `LD/${ci}/${i}`,
      dob: daysAgo(1200),
      branchId: c.branchId,
      classroomId: c.id,
      programSlug: "nursery",
      enrolledOn: daysAgo(700),
    })),
  );
  await prisma.student.createMany({ data: students });
  await prisma.photoConsent.createMany({
    data: students.map((s) => ({ studentId: s.id, allowed: true, decidedAt: daysAgo(700) })),
  });

  const parentUsers = students.map((s, i) => ({
    id: `ld_par_${i}`,
    email: `parent-${i}@load.test`,
    name: `Parent of ${s.firstName} ${s.lastName}`,
    passwordHash,
    role: "PARENT" as const,
    branchId: null,
  }));
  await prisma.user.createMany({ data: parentUsers });
  await prisma.guardian.createMany({
    data: parentUsers.map((u, i) => ({
      id: `ld_gd_${i}`,
      userId: u.id,
      name: u.name,
      email: u.email,
      relation: "MOTHER" as const,
    })),
  });
  await prisma.guardianship.createMany({
    data: students.map((s, i) => ({
      studentId: s.id,
      guardianId: `ld_gd_${i}`,
      isPrimary: true,
    })),
  });
  step(`${students.length} children + families`, at);

  // ---- a year of registers ---------------------------------------------------
  at = Date.now();
  const statuses = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "ABSENT", "LATE"] as const;
  for (let day = 0; day < SCALE.attendanceDays; day += 25) {
    const chunk: {
      studentId: string;
      classroomId: string;
      date: string;
      status: (typeof statuses)[number];
      markedByStaffId: string;
    }[] = [];
    for (let d = day; d < Math.min(day + 25, SCALE.attendanceDays); d++) {
      const date = dateKey(daysAgo(d));
      students.forEach((s, i) => {
        chunk.push({
          studentId: s.id,
          classroomId: s.classroomId,
          date,
          status: statuses[(i + d) % statuses.length],
          markedByStaffId: staffUsers[i % staffUsers.length].id,
        });
      });
    }
    await prisma.attendanceRecord.createMany({ data: chunk, skipDuplicates: true });
  }
  step(`${students.length * SCALE.attendanceDays} attendance rows`, at);

  // ---- two years of correspondence -------------------------------------------
  at = Date.now();
  const conversations = students.map((s, i) => ({
    id: `ld_cv_${i}`,
    studentId: s.id,
    parentName: `Parent of ${s.firstName}`,
    teacherName: `Teacher ${i % SCALE.teachersPerBranch}`,
    subject: "Daily updates",
  }));
  await prisma.conversation.createMany({ data: conversations });
  await prisma.conversationMember.createMany({
    data: conversations.flatMap((c, i) => [
      { conversationId: c.id, userId: parentUsers[i].id },
      { conversationId: c.id, userId: staffUsers[i % staffUsers.length].id },
    ]),
  });

  for (let start = 0; start < conversations.length; start += 50) {
    const slice = conversations.slice(start, start + 50);
    await prisma.message.createMany({
      data: slice.flatMap((c, ci) =>
        Array.from({ length: SCALE.messagesPerConversation }, (_, m) => ({
          conversationId: c.id,
          senderId: m % 2 === 0 ? parentUsers[start + ci].id : staffUsers[(start + ci) % staffUsers.length].id,
          senderName: m % 2 === 0 ? "Parent" : "Teacher",
          senderRole: m % 2 === 0 ? ("PARENT" as const) : ("TEACHER" as const),
          kind: "TEXT" as const,
          body: `Message ${m} about the day, with enough text to be realistic rather than a single word.`,
          createdAt: daysAgo(Math.floor((m / SCALE.messagesPerConversation) * 700)),
        })),
      ),
    });
  }
  step(`${conversations.length * SCALE.messagesPerConversation} messages`, at);

  // ---- feed, fees, notifications ---------------------------------------------
  at = Date.now();
  for (const [ci, c] of classrooms.entries()) {
    await prisma.activity.createMany({
      data: Array.from({ length: SCALE.activitiesPerClassroom }, (_, i) => ({
        id: `ld_act_${ci}_${i}`,
        classroomId: c.id,
        authorStaffId: staffUsers[ci % staffUsers.length].id,
        kind: "LEARNING" as const,
        title: `Activity ${i}`,
        body: "We played, we painted, we sang, and then we had a nap.",
        published: true,
        createdAt: daysAgo(i * 3),
      })),
    });
  }
  await prisma.invoice.createMany({
    data: students.flatMap((s, si) =>
      Array.from({ length: SCALE.invoicesPerStudent }, (_, i) => ({
        id: `ld_inv_${si}_${i}`,
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        branchId: s.branchId,
        number: `LD/${si}/${i}`,
        term: `Term ${i + 1}`,
        amount: 12000,
        paidAmount: i === 0 ? 0 : 12000,
        dueOn: daysAgo(i * 90),
        status: i === 0 ? ("SENT" as const) : ("PAID" as const),
        issuedOn: daysAgo(i * 90 + 15),
      })),
    ),
  });
  await prisma.appNotification.createMany({
    data: parentUsers.flatMap((u, ui) =>
      Array.from({ length: SCALE.notificationsPerUser }, (_, i) => ({
        userId: u.id,
        kind: "ACTIVITY" as const,
        title: `Notification ${i}`,
        body: "Something happened at school today.",
        read: i > 2,
        createdAt: daysAgo(i * 5 + (ui % 3)),
      })),
    ),
  });
  step("feed, fees, notifications", at);

  const counts = {
    students: await prisma.student.count(),
    attendance: await prisma.attendanceRecord.count(),
    messages: await prisma.message.count(),
    activities: await prisma.activity.count(),
    invoices: await prisma.invoice.count(),
    notifications: await prisma.appNotification.count(),
  };
  console.log("");
  console.table(counts);
  console.log(`Done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  console.log(`\nAdmin login : admin@load.test / password12345`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
