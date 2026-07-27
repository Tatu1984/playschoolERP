import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "./generated";
import { PrismaPg } from "@prisma/adapter-pg";

// Self-contained (relative imports only) so `tsx` runs it without tsconfig
// path-alias resolution.
const url =
  process.env.DATABASE_URL ??
  "postgresql://playschool:playschool@localhost:5432/playschool";
const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

async function main() {
  const passwordHash = await bcrypt.hash("password12345", 12);

  const branch = await prisma.branch.upsert({
    where: { slug: "kathgola" },
    update: {},
    create: {
      name: "Climb Kiddo — Kathgola",
      slug: "kathgola",
      address: "Kathgola, Kolkata",
      timezone: "Asia/Kolkata",
    },
  });

  // Wide school-hours window (06:00–22:00 every day) so the demo shows "live
  // now" at most times while still exercising the time-gate at night.
  for (let dow = 0; dow < 7; dow++) {
    await prisma.schoolHours.upsert({
      where: { branchId_dayOfWeek: { branchId: branch.id, dayOfWeek: dow } },
      update: { openMin: 6 * 60, closeMin: 22 * 60 },
      create: { branchId: branch.id, dayOfWeek: dow, openMin: 6 * 60, closeMin: 22 * 60 },
    });
  }

  const classroom = await prisma.classroom.upsert({
    where: { id: "seed-classroom-toddler" },
    update: {},
    create: {
      id: "seed-classroom-toddler",
      name: "Toddler Room",
      ageGroup: "2-3",
      branchId: branch.id,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@climbkiddo.in" },
    update: {},
    create: {
      email: "admin@climbkiddo.in",
      passwordHash,
      name: "School Admin",
      role: "ADMIN",
      branchId: branch.id,
    },
  });

  const parent = await prisma.user.upsert({
    where: { email: "parent@example.com" },
    update: {},
    create: {
      email: "parent@example.com",
      passwordHash,
      name: "Priya Sharma",
      role: "PARENT",
      branchId: branch.id,
    },
  });

  // Teacher login so the /teacher panel is reachable in the demo.
  await prisma.user.upsert({
    where: { email: "teacher@climbkiddo.in" },
    update: {},
    create: {
      email: "teacher@climbkiddo.in",
      passwordHash,
      name: "Meera Banerjee",
      role: "TEACHER",
      branchId: branch.id,
    },
  });

  const student = await prisma.student.upsert({
    where: { id: "seed-student-aarav" },
    update: {},
    create: {
      id: "seed-student-aarav",
      firstName: "Aarav",
      lastName: "Sharma",
      branchId: branch.id,
      classroomId: classroom.id,
    },
  });

  await prisma.guardianship.upsert({
    where: { userId_studentId: { userId: parent.id, studentId: student.id } },
    update: {},
    create: {
      userId: parent.id,
      studentId: student.id,
      relation: "MOTHER",
      isPrimary: true,
    },
  });

  // Camera mapped to the toddler classroom, published at MediaMTX path
  // "classroom-a" (matches the docker-compose test stream).
  await prisma.camera.upsert({
    where: { streamPath: "classroom-a" },
    update: {},
    create: {
      name: "Toddler Room — Live",
      branchId: branch.id,
      classroomId: classroom.id,
      streamPath: "classroom-a",
      rtspUrl: "rtsp://mediamtx:8554/classroom-a",
      enabled: true,
      parentViewable: true,
    },
  });

  console.log("✅ Seed complete");
  console.log("   Admin  : admin@climbkiddo.in / password12345");
  console.log("   Teacher: teacher@climbkiddo.in / password12345");
  console.log("   Parent : parent@example.com / password12345");
  console.log(`   Branch : ${branch.name} (${admin.branchId})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
