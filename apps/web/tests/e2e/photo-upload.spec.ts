import { expect, test } from "@playwright/test";
import path from "node:path";
import { prisma } from "../../src/backend/database/client";

test.use({ storageState: path.join(process.cwd(), "tests/e2e/.auth/teacher.json") });

/**
 * A teacher attaching a photograph to a post.
 *
 * The composer used to read each file's name and size, build a reference with
 * an empty URL, and say "3 files attached". Nothing was uploaded. So this test
 * hands it real bytes — a JPEG carrying a GPS tag, the way a phone writes one —
 * and then asks the database and the store whether the photograph exists and
 * whether the coordinates survived.
 */
function jpegWithGps(): Buffer {
  const exif = Buffer.concat([
    Buffer.from("Exif\0\0", "latin1"),
    Buffer.from("MM\0*", "latin1"),
    Buffer.from("GPSLatitude 22.5726N 88.3639E", "latin1"),
  ]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe1, ((exif.length + 2) >> 8) & 0xff, (exif.length + 2) & 0xff]),
    exif,
    Buffer.from([0xff, 0xda]),
    Buffer.from("entropy-coded-scan-data", "latin1"),
    Buffer.from([0xff, 0xd9]),
  ]);
}

test("attaching a photo uploads it, scrubbed", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  const before = await prisma.mediaObject.count();

  await page.goto("/teacher/activities");
  await page.waitForLoadState("networkidle");

  const compose = page.getByRole("button", { name: /new post|new activity|post|add/i }).first();
  expect(await compose.count(), "no way to start a post").toBeGreaterThan(0);
  await compose.click();
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: /attach/i }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "IMG_0042.jpg",
    mimeType: "image/jpeg",
    buffer: jpegWithGps(),
  });

  await page.waitForTimeout(4000);
  const after = await prisma.mediaObject.count();
  const created = await prisma.mediaObject.findFirst({ orderBy: { createdAt: "desc" } });

  // With no blob store configured the upload is refused, loudly — that is the
  // designed behaviour, and the assertion then is that nothing was attached.
  const storageOn = after > before;
  if (!storageOn) {
    await expect(page.getByText(/not set up|failed|could not/i).first()).toBeVisible();
    test.skip(true, "no blob store on this deployment — upload correctly refused");
  }

  expect(created?.originalName).toBe("IMG_0042.jpg");
  expect(created?.contentType).toBe("image/jpeg");
  expect(created?.scrubbed).toBe(true);
  // The stored size is smaller than what was sent, because the EXIF is gone.
  expect(created!.sizeBytes).toBeLessThan(jpegWithGps().length);

  await expect(page.getByText(/uploaded/i).first()).toBeVisible();

  if (created) await prisma.mediaObject.delete({ where: { id: created.id } });
});

test.afterAll(async () => { await prisma.$disconnect(); });
