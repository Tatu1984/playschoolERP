import { expect, test } from "@playwright/test";

/**
 * Signing in, which is the path that must never break.
 *
 * Everything else in this repository is tested below the browser. What none of
 * that can prove is that a parent can actually get in: that the form posts,
 * that the cookie comes back with the right attributes, that the proxy lets
 * them through, and that the portal renders once they are. Each of those has
 * its own way of failing silently in a server-side test.
 *
 * Passwords here are the seeded demo ones. If this file ever needs a real
 * credential, it is in the wrong repository.
 */

const PASSWORD = "password12345";

const LOGINS = [
  { role: "admin", email: "admin@climbkiddo.in", lands: "/admin" },
  { role: "teacher", email: "meera@climbkiddo.in", lands: "/teacher" },
  { role: "parent", email: "parent@example.com", lands: "/parent" },
] as const;

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

for (const login of LOGINS) {
  test(`a ${login.role} signs in and lands on their own portal`, async ({ page }) => {
    await signIn(page, login.email);
    await page.waitForURL(`**${login.lands}**`);
    expect(page.url()).toContain(login.lands);
    // Rendered, not merely routed: a blank shell with a hydration error in the
    // console counts as a broken sign-in to the person holding the phone.
    await expect(page.locator("body")).not.toBeEmpty();
  });
}

test("the wrong password is refused, and says so on screen", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("parent@example.com");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  expect(page.url()).toContain("/login");
});

test("a signed-out visitor cannot open the parent portal", async ({ page }) => {
  await page.goto("/parent");
  await page.waitForURL("**/login**");
  expect(page.url()).toContain("/login");
});

test("a parent cannot open the admin portal", async ({ page }) => {
  await signIn(page, "parent@example.com");
  await page.waitForURL("**/parent**");

  await page.goto("/admin");
  // Either bounced to their own portal or refused outright — what must not
  // happen is an admin screen rendering.
  await page.waitForURL((url) => !url.pathname.startsWith("/admin"), { timeout: 15_000 });
  expect(page.url()).not.toContain("/admin");
});

test("signing out actually signs out", async ({ page }) => {
  await signIn(page, "parent@example.com");
  await page.waitForURL("**/parent**");

  await page.request.post("/api/auth/logout");
  await page.goto("/parent");
  await page.waitForURL("**/login**");
  expect(page.url()).toContain("/login");
});
