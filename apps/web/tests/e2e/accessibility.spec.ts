import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

/**
 * WCAG 2.2 AA, on the screens a parent cannot avoid.
 *
 * An automated scan finds perhaps a third of what is wrong — it cannot tell
 * whether a label makes sense, whether a focus order matches the reading order,
 * or whether an error message helps. It catches the mechanical third reliably,
 * and that third is where colour contrast, missing labels and unlabelled
 * buttons live, which are the ones that stop a screen reader dead.
 *
 * This is not a substitute for the audit in §5 of the plan. It is the floor
 * beneath it: a regression here fails the build rather than waiting for the
 * next audit to notice.
 *
 * Parents include disabled parents. So do grandparents doing the school run.
 */

const asParent = { storageState: path.join(process.cwd(), "tests/e2e/.auth/parent.json") };
const asAdmin = { storageState: path.join(process.cwd(), "tests/e2e/.auth/admin.json") };

/** The tags that make up WCAG 2.2 AA, in the vocabulary axe uses. */
const STANDARD = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page: Page, url: string) {
  await page.goto(url);
  // Portal screens paint a skeleton first; scanning that measures the skeleton.
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page }).withTags(STANDARD).analyze();

  // Serious and critical only, deliberately. "Minor" in axe includes advice
  // that is contested, and a suite that cries wolf gets switched off — which
  // helps nobody who actually needs a screen reader.
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );

  const report = blocking
    .map(
      (v) =>
        `\n  [${v.impact}] ${v.id} — ${v.help}\n    ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join("\n    ")}`,
    )
    .join("");

  return { blocking, report };
}

test.describe("the public site", () => {
  for (const url of ["/", "/admissions", "/login", "/forgot-password"]) {
    test(`${url} has no serious accessibility violations`, async ({ page }) => {
      const { blocking, report } = await scan(page, url);
      expect(blocking, `${blocking.length} violation(s) on ${url}:${report}`).toEqual([]);
    });
  }
});

test.describe("the parent portal", () => {
  test.use(asParent);
  for (const url of ["/parent", "/parent/attendance", "/parent/payments"]) {
    test(`${url} has no serious accessibility violations`, async ({ page }) => {
      const { blocking, report } = await scan(page, url);
      expect(blocking, `${blocking.length} violation(s) on ${url}:${report}`).toEqual([]);
    });
  }
});

test.describe("the admin portal", () => {
  test.use(asAdmin);
  for (const url of ["/admin", "/admin/students"]) {
    test(`${url} has no serious accessibility violations`, async ({ page }) => {
      const { blocking, report } = await scan(page, url);
      expect(blocking, `${blocking.length} violation(s) on ${url}:${report}`).toEqual([]);
    });
  }
});

test.describe("keyboard only", () => {
  test("the sign-in form can be completed without a mouse", async ({ page }) => {
    await page.goto("/login");
    // Tab until the email field has focus rather than assuming a tab count: the
    // skip link and the header are both in the order, and both should be.
    await page.keyboard.press("Tab");
    for (let i = 0; i < 12; i++) {
      if (await page.getByLabel("Email").evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(page.getByLabel("Email")).toBeFocused();

    await page.keyboard.type("parent@example.com");
    await page.keyboard.press("Tab");
    // The "Forgot password?" link sits between the two fields, which is correct
    // reading order and means one more Tab, not a bug.
    if (!(await page.getByLabel("Password").evaluate((el) => el === document.activeElement))) {
      await page.keyboard.press("Tab");
    }
    await expect(page.getByLabel("Password")).toBeFocused();
    await page.keyboard.type("password12345");
    await page.keyboard.press("Enter");

    await page.waitForURL("**/parent**");
    expect(page.url()).toContain("/parent");
  });

  test("the skip link is the first thing a keyboard reaches", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /skip to content/i })).toBeFocused();
  });
});
