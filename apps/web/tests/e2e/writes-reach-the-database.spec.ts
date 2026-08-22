import { expect, test } from "@playwright/test";
import path from "node:path";
import { prisma } from "../../src/backend/database/client";

/**
 * Does an action taken in the browser actually reach Postgres?
 *
 * Every other test in this repository trusts one layer to speak for another:
 * the integration suites call services directly, and the journey suite watches
 * the screen. Neither can catch the failure where the screen updates, the
 * request fails, and nobody notices — which is exactly what was happening to
 * payments until this file was written.
 *
 * So each test does what a person does, then asks the database whether it
 * happened. Nothing here trusts a toast.
 */
const stamp = Date.now().toString(36);
const asTeacher = { storageState: path.join(process.cwd(), "tests/e2e/.auth/teacher.json") };
const asAdmin = { storageState: path.join(process.cwd(), "tests/e2e/.auth/admin.json") };
const asParent = { storageState: path.join(process.cwd(), "tests/e2e/.auth/parent.json") };

test.describe("teacher", () => {
  test.use(asTeacher);

  test("marking the register writes to the database", async ({ page }) => {
    await page.goto("/teacher/attendance");
    await page.waitForLoadState("networkidle");

    const before = await prisma.attendanceRecord.count({
      where: { date: new Date().toISOString().slice(0, 10) },
    });

    // The register marks a child with a status button per row.
    // Mark the first child ABSENT — a change from the seeded "present", so the
    // database has to show something different afterwards.
    const child = await prisma.student.findFirst({
      where: { classroom: { staff: { some: {} } }, status: "ACTIVE" },
      orderBy: { admissionNo: "asc" },
    });
    const absent = page.getByRole("button", { name: /absent/i }).first();
    expect(await absent.count(), "no way to mark a child absent").toBeGreaterThan(0);
    await absent.click();
    await page.waitForTimeout(2500);
    expect(child, "no child in a room this teacher teaches").not.toBeNull();
    const row = await prisma.attendanceRecord.findFirst({
      where: { studentId: child!.id, date: new Date().toISOString().slice(0, 10) },
    });
    expect(row?.status, "the register change never reached the database").toBe("ABSENT");

    // Put the demo register back as it was found.
    await prisma.attendanceRecord.updateMany({
      where: { studentId: child!.id, date: new Date().toISOString().slice(0, 10) },
      data: { status: "PRESENT" },
    });

    const after = await prisma.attendanceRecord.count({
      where: { date: new Date().toISOString().slice(0, 10) },
    });
    console.log("REGISTER rows today before/after:", before, after);
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

test.describe("admin", () => {
  test.use(asAdmin);

  test("publishing a notice writes to the database", async ({ page }) => {
    await page.goto("/admin/notices");
    await page.waitForLoadState("networkidle");
    const newButton = page.getByRole("button", { name: /new notice|add notice|publish|new/i }).first();
    expect(await newButton.count(), "no way to create a notice").toBeGreaterThan(0);
    await newButton.click();
    await page.waitForTimeout(500);

    const title = `E2E notice ${stamp}`;
    const titleField = page.getByLabel(/title/i).first();
    await titleField.fill(title);
    const body = page.getByLabel(/body|message|details/i).first();
    if (await body.count()) await body.fill("Written by the reality check.");

    await page.getByRole("button", { name: /save|publish|create|send/i }).last().click();
    await page.waitForTimeout(3000);

    const row = await prisma.notice.findFirst({ where: { title } });
    console.log("NOTICE in database:", row ? "yes" : "NO");
    expect(row, "the notice never reached the database").not.toBeNull();
    if (row) await prisma.notice.delete({ where: { id: row.id } });
  });
});

test.describe("parent", () => {
  test.use(asParent);

  test("sending a message writes to the database", async ({ page }) => {
    await page.goto("/parent/messages");
    await page.waitForLoadState("networkidle");

    const box = page.getByRole("textbox").last();
    expect(await box.count(), "no message box").toBeGreaterThan(0);
    const text = `Reality check ${stamp}`;
    await box.fill(text);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(3000);

    const row = await prisma.message.findFirst({ where: { body: text } });
    console.log("MESSAGE in database:", row ? "yes" : "NO");
    expect(row, "the message never reached the database").not.toBeNull();
    if (row) await prisma.message.delete({ where: { id: row.id } });
  });
});


test.describe("money and enrolment", () => {
  test.use(asAdmin);

  test("enrolling a child writes to the database", async ({ page }) => {
    await page.goto("/admin/students");
    await page.waitForLoadState("networkidle");
    const add = page.getByRole("button", { name: /add|new|enrol/i }).first();
    expect(await add.count(), "no way to add a student").toBeGreaterThan(0);
    await add.click();
    await page.waitForTimeout(600);

    const first = `E2E${stamp}`;
    await page.getByLabel(/first name/i).first().fill(first);
    await page.getByLabel(/last name|surname/i).first().fill("Child");
    const dob = page.getByLabel(/date of birth|dob/i).first();
    if (await dob.count()) await dob.fill("2023-04-01");
    const adm = page.getByLabel(/admission/i).first();
    if (await adm.count()) await adm.fill(`E2E/${stamp}`);

    await page.getByRole("button", { name: /save|add|create|enrol/i }).last().click();
    await page.waitForTimeout(3000);

    const row = await prisma.student.findFirst({ where: { firstName: first } });
    console.log("STUDENT in database:", row ? "yes" : "NO");
    expect(row, "the child never reached the database").not.toBeNull();
    if (row) await prisma.student.delete({ where: { id: row.id } });
  });
});

test.describe("paying", () => {
  test.use(asParent);

  test("paying an invoice writes a payment to the database", async ({ page, playwright, baseURL, request }) => {
    // Needs a payment driver — the real gateway, or the mock one outside
    // production. With payments switched off the API correctly refuses, and
    // the right assertion is the one in journeys.spec.ts: that the screen does
    // not claim a receipt. Skipping here is honest; passing would not be.
    const health = await request.get("/api/health");
    const driver = ((await health.json()) as { payments?: string }).payments;
    test.skip(driver === "disabled", `payments are switched off (driver: ${driver})`);

    const office = await playwright.request.newContext({
      baseURL,
      storageState: path.join(process.cwd(), "tests/e2e/.auth/admin.json"),
    });
    const issued = await office.post("/api/fees/invoices", {
      data: {
        studentId: "stu_aarav",
        term: `Reality ${stamp}`,
        lines: [{ label: "Reality check fee", amount: 2500, qty: 1 }],
        dueOn: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
        publish: true,
      },
    });
    const invoiceId = ((await issued.json()) as { invoice?: { id: string } }).invoice?.id;
    expect(invoiceId, "could not issue an invoice to pay").toBeTruthy();

    try {
      await page.goto("/parent/payments");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: /^pay\b/i }).first().click();
      await page.getByRole("button", { name: /pay|confirm/i }).last().click();
      await page.waitForTimeout(4000);

      const payments = await prisma.payment.findMany({ where: { invoiceId } });
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId! } });
      console.log("PAYMENT rows:", payments.length, "| invoice paidAmount:", invoice?.paidAmount, "| status:", invoice?.status);
      expect(payments.length, "no payment reached the database").toBeGreaterThan(0);
      expect(invoice?.paidAmount ?? 0).toBeGreaterThan(0);
    } finally {
      await prisma.payment.deleteMany({ where: { invoiceId } });
      if (invoiceId) await prisma.invoice.delete({ where: { id: invoiceId } }).catch(() => {});
      await office.dispose();
    }
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
