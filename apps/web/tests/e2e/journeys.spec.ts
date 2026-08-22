import { expect, test } from "@playwright/test";
import path from "node:path";

/**
 * The three journeys after signing in that a school would notice within a day:
 * a family enquiring, a parent paying, and a parent opening the camera.
 *
 * These are deliberately shallow. A browser test that reaches into the
 * application's state is a slow unit test wearing a costume; what a browser can
 * prove that nothing else can is that a real person clicking real things gets
 * somewhere. Correctness of the money, the scoping and the camera tokens is
 * asserted server-side, where it can be asserted properly.
 */

/**
 * Signed in already, by global-setup. Doing it through the form in every test
 * would re-test the sign-in path five times and trip the login rate limiter,
 * which is a real protection and should not be loosened for a test's
 * convenience.
 */
const asParent = { storageState: path.join(process.cwd(), "tests/e2e/.auth/parent.json") };

test("a family sends an enquiry from the public site", async ({ page }) => {
  await page.goto("/admissions");

  // Unique per run: this writes a real Inquiry row into the admissions
  // pipeline, and a test that cannot tell its own row from yesterday's is a
  // test nobody trusts.
  const name = `E2E Parent ${Date.now().toString(36)}`;
  await page.getByLabel("Parent's name").fill(name);
  await page.getByLabel("Phone").fill("+91 90000 00001");
  await page.getByLabel("Email").first().fill("e2e@example.com");

  await page.getByRole("button", { name: /send my enquiry/i }).click();

  // The form swaps itself for an acknowledgement. Either that, or a visible
  // error — what must not happen is a button that does nothing.
  await expect(
    page.getByText(/thank|we'?ll be in touch|received|sent/i).first(),
  ).toBeVisible({ timeout: 15_000 });
});

test.describe("as a signed-in parent", () => {
  test.use(asParent);

test("a parent pays an outstanding invoice and gets a receipt", async ({ page, playwright, baseURL }) => {
  // The seeded family has nothing due, so the office issues an invoice first —
  // through the real endpoint, as an admin. That is how one comes to exist in
  // life, and it means this test does not quietly pass by finding nothing to do.
  const office = await playwright.request.newContext({
    baseURL,
    storageState: path.join(process.cwd(), "tests/e2e/.auth/admin.json"),
  });
  const issued = await office.post("/api/fees/invoices", {
    data: {
      studentId: "stu_aarav",
      term: `E2E ${Date.now().toString(36)}`,
      lines: [{ label: "Playwright term fee", amount: 1500, qty: 1 }],
      dueOn: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
      publish: true,
    },
  });
  expect(issued.ok(), `issuing the invoice failed: ${issued.status()}`).toBeTruthy();
  const invoiceId = ((await issued.json()) as { invoice?: { id: string } }).invoice?.id;

  try {
    await page.goto("/parent/payments");
    // "Pay ₹1,500" in the header, "Pay now" in the list — either will do.
    const payButton = page.getByRole("button", { name: /^pay\b/i }).first();
    await expect(payButton).toBeVisible({ timeout: 20_000 });
    await payButton.click();

    await page.getByRole("button", { name: /pay|confirm/i }).last().click();
    await expect(page.getByText(/receipt|paid/i).first()).toBeVisible({ timeout: 30_000 });
  } finally {
    if (invoiceId) await office.delete(`/api/fees/invoices/${invoiceId}`).catch(() => {});
    await office.dispose();
  }
});

test("a parent opens the camera page and it says where the stream stands", async ({ page }) => {
  await page.goto("/parent/cctv");

  // The media server is not running in CI, and the page is built to say so
  // rather than to spin for ever. Either a live view or a plain explanation is
  // a pass; a blank panel is not.
  await expect(
    page
      .getByText(/camera|live|stream|not available|outside school hours|connecting/i)
      .first(),
  ).toBeVisible({ timeout: 20_000 });
});

test("the kids zone opens for a signed-in family", async ({ page }) => {
  await page.goto("/kids");
  await expect(page.locator("body")).not.toBeEmpty();
  expect(page.url()).toContain("/kids");
});

});
