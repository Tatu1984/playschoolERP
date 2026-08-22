/**
 * Create (or promote) an administrator on a database that has no demo data.
 *
 * The only way to get an admin account until now was `db:seed`, which inserts a
 * whole fictional school — two branches, twenty-four children, invented medical
 * notes. That is exactly right for a demo and exactly wrong for the first day of
 * a real one, and it left "how does the school actually get in" as an
 * undocumented step involving a database client.
 *
 *   npm run admin:create --workspace=@climbkiddo/web -- \
 *     --email head@theschool.in --name "Head Teacher"
 *
 * A password may be given with --password; otherwise one is generated and
 * printed once. Re-running against an existing account promotes it and, with
 * --password, resets it — so this is also the way back in when the last admin
 * is locked out and email is not configured yet.
 *
 * Nothing here is reachable over HTTP. It needs the database URL, which means
 * it needs someone with deployment access, which is the right bar for minting
 * an account that can read every child's medical record.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/backend/database/generated";

function arg(name: string): string | undefined {
  const flag = `--${name}`;
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1];
  }
  const inline = process.argv.find((a) => a.startsWith(`${flag}=`));
  return inline?.slice(flag.length + 1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Point it at the database you mean to change.");
  process.exit(1);
}

const email = arg("email")?.trim().toLowerCase();
const name = arg("name")?.trim();
const role = (arg("role") ?? "SUPER_ADMIN").toUpperCase();
const branchSlug = arg("branch");
let password = arg("password");
let generated = false;

if (!email || !name) {
  console.error(
    "Usage: npm run admin:create -- --email <address> --name <full name> " +
      "[--password <at least 12 characters>] [--role SUPER_ADMIN|ADMIN] [--branch <slug>]",
  );
  process.exit(1);
}
if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
  console.error(`--role must be SUPER_ADMIN or ADMIN, not ${role}`);
  process.exit(1);
}
if (password && password.length < 12) {
  console.error("A password given here must be at least 12 characters.");
  process.exit(1);
}
if (!password) {
  // 24 characters of base64url from 18 random bytes. Printed once, never stored
  // anywhere but the hash.
  password = randomBytes(18).toString("base64url");
  generated = true;
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  const database = url!.split("/").pop()?.split("?")[0];
  console.log(`Database: ${database}\n`);

  let branchId: string | null = null;
  if (branchSlug) {
    const branch = await prisma.branch.findUnique({ where: { slug: branchSlug } });
    if (!branch) {
      const known = (await prisma.branch.findMany({ select: { slug: true } })).map((b) => b.slug);
      console.error(
        `No branch with slug "${branchSlug}".` +
          (known.length ? ` Known: ${known.join(", ")}` : " There are no branches yet."),
      );
      process.exit(1);
    }
    branchId = branch.id;
  }

  const existing = await prisma.user.findUnique({ where: { email: email! } });
  const passwordHash = await bcrypt.hash(password!, 12);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: role as "SUPER_ADMIN" | "ADMIN",
        active: true,
        ...(branchId ? { branchId } : {}),
        ...(arg("password") || generated ? { passwordHash } : {}),
        // Any session issued before this moment is refused. Promoting an
        // account, or resetting its password, must not leave an older session
        // running with the older rights.
        sessionsValidFrom: new Date(),
      },
    });
    console.log(`Updated ${email}: role ${role}, active, all existing sessions signed out.`);
  } else {
    await prisma.user.create({
      data: { email: email!, name: name!, passwordHash, role: role as "SUPER_ADMIN" | "ADMIN", branchId },
    });
    console.log(`Created ${email} as ${role}.`);
  }

  if (generated) {
    console.log(`\n  Password: ${password}\n`);
    console.log("Shown once. Change it after the first sign-in — /forgot-password works once");
    console.log("RESEND_API_KEY is set, and this script is the way back in until then.");
  }

  const admins = await prisma.user.count({ where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } } });
  console.log(`\nThis database now has ${admins} administrator${admins === 1 ? "" : "s"}.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
