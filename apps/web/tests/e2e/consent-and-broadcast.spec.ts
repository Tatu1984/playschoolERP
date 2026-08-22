import { expect, test } from "@playwright/test";
import path from "node:path";
import { prisma } from "../../src/backend/database/client";

/**
 * The two screens that existed only as endpoints until now: a family refusing
 * photography, and the office sending a safety broadcast.
 *
 * Both are checked the same way as everything else here — do the thing, then
 * ask the database. A consent screen that does not record consent produces a
 * family who believe they have refused, and a broadcast screen that does not
 * broadcast is the one this product must never have.
 */
const stamp = Date.now().toString(36);

test.describe("a parent refusing photography", () => {
  test.use({ storageState: path.join(process.cwd(), "tests/e2e/.auth/parent.json") });

  test("the switch writes a consent record", async ({ page }) => {
    const before = await prisma.photoConsent.findUnique({ where: { studentId: "stu_aarav" } });

    await page.goto("/parent/settings");
    await page.getByRole("tab", { name: /privacy/i }).click();
    await page.waitForLoadState("networkidle");

    const label = page.getByText(/Aarav/i).first();
    await expect(label, "the child is not on the privacy tab").toBeVisible({ timeout: 15_000 });

    const toggle = page.getByRole("switch").first();
    expect(await toggle.count(), "no consent switch").toBeGreaterThan(0);
    const wasOn = (await toggle.getAttribute("aria-checked")) === "true";
    await toggle.click();
    await page.waitForTimeout(2500);

    const after = await prisma.photoConsent.findUnique({ where: { studentId: "stu_aarav" } });
    expect(after, "no consent record was written").not.toBeNull();
    expect(after!.allowed, "the record did not change").toBe(!wasOn);
    // The record says who answered — a consent nobody can attribute is not one.
    expect(after!.decidedByName.length).toBeGreaterThan(0);

    // Put the school back as it was found.
    if (before) {
      await prisma.photoConsent.update({
        where: { studentId: "stu_aarav" },
        data: { allowed: before.allowed, decidedByName: before.decidedByName, note: before.note },
      });
    }
  });
});

test.describe("the office sending a broadcast", () => {
  test.use({ storageState: path.join(process.cwd(), "tests/e2e/.auth/admin.json") });

  test("sending one reaches the database and reports delivery", async ({ page }) => {
    await page.goto("/admin/emergency");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /new broadcast/i }).click();
    const title = `Drill ${stamp}`;
    await page.getByLabel(/title/i).first().fill(title);
    await page.getByLabel(/message/i).first().fill("This is a test of the broadcast path.");
    await page.getByRole("button", { name: /send now/i }).click();
    await page.waitForTimeout(4000);

    const row = await prisma.safetyBroadcast.findFirst({ where: { title } });
    expect(row, "the broadcast never reached the database").not.toBeNull();

    // Delivery runs after the response. The in-app notifications are written
    // inline, so they exist by now whatever the providers did.
    const notifications = await prisma.appNotification.count({ where: { title } });
    expect(notifications, "nobody was notified in the portal").toBeGreaterThan(0);
    expect(row!.recipientCount).toBeGreaterThan(0);

    await prisma.appNotification.deleteMany({ where: { title } });
    await prisma.safetyBroadcast.delete({ where: { id: row!.id } });
  });
});

test.afterAll(async () => { await prisma.$disconnect(); });
