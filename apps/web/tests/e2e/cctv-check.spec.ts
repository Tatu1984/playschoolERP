import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../../src/backend/database/client";

test.use({ storageState: path.join(process.cwd(), "tests/e2e/.auth/parent.json") });

/**
 * The last mile of the CCTV plane: a parent opening the page and a frame
 * arriving.
 *
 * Everything up to here is provable without a media server — the access rules,
 * the view token, the authorize hook — and all of it was. This is the part that
 * needs MediaMTX publishing a real stream, so it skips when there is none,
 * which is every CI run. When it does run it asserts what nothing else can:
 * that the video element has pixels in it.
 *
 * Note the port. MediaMTX calls our authorize hook at the address in
 * infra/mediamtx.yml — port 3000 — so a server on any other port gets a 401
 * from the media plane and no video. That is not a bug; it is the media server
 * refusing a read it could not authorise.
 */
test("a parent actually sees a frame", async ({ page, request, baseURL }) => {
  // MediaMTX authorises every read by calling our hook at the address in
  // infra/mediamtx.yml. If this run is on a different port, the media server
  // cannot reach us and refuses the read — correctly. Skip rather than report
  // that as a broken camera.
  const config = readFileSync(path.join(process.cwd(), "../../infra/mediamtx.yml"), "utf8");
  const hookPort = /authHTTPAddress:.*?:(\d+)\//.exec(config)?.[1];
  const runningPort = baseURL ? new URL(baseURL).port : "";
  test.skip(
    hookPort !== runningPort,
    `MediaMTX calls the authorize hook on :${hookPort}; this run is on :${runningPort}`,
  );

  const media = await request.get("http://localhost:9997/v3/paths/list").catch(() => null);
  test.skip(!media?.ok(), "no MediaMTX on this machine — the media plane is separate infrastructure");
  const paths = (await media!.json()) as { items?: { name: string; ready: boolean }[] };
  test.skip(!paths.items?.some((p) => p.ready), "MediaMTX is up but nothing is publishing");

  const before = await prisma.cctvViewLog.count();
  await page.goto("/parent/cctv");
  await page.waitForLoadState("networkidle");

  const watch = page.getByRole("button", { name: /watch|start|play|live/i }).first();
  expect(await watch.count(), "no way to start the stream").toBeGreaterThan(0);
  await watch.click();

  // WebRTC negotiation takes a moment.
  await page.waitForTimeout(12_000);

  const video = await page.evaluate(() => {
    const v = document.querySelector("video");
    if (!v) return null;
    return { width: v.videoWidth, height: v.videoHeight, ready: v.readyState, paused: v.paused, src: !!v.srcObject };
  });
  expect(video, "no <video> element on the page at all").not.toBeNull();
  expect(video!.width, "the stream negotiated but no frame arrived").toBeGreaterThan(0);
  expect(video!.paused, "the video element is paused").toBeFalsy();

  // The watch is recorded. This is the row that answers "who watched which
  // child, and when" — the whole reason the CCTV plane is auditable at all.
  const after = await prisma.cctvViewLog.count();
  expect(after).toBeGreaterThan(before);
  const actions = (
    await prisma.cctvViewLog.findMany({ orderBy: { createdAt: "desc" }, take: 3 })
  ).map((r) => r.action);
  expect(actions, "the view was not logged").toContain("VIEW_START");
});

test.afterAll(async () => { await prisma.$disconnect(); });
