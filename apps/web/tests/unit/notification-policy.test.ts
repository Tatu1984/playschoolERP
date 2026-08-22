/**
 * Run with `npm run check:notification-policy`. Needs nothing running.
 *
 * These are the rules that decide whether a parent's phone rings. Two of them
 * are worth being careful about: quiet hours normally wrap midnight, which is
 * the case a naive `from <= now && now < to` gets backwards, and an emergency
 * has to ignore them.
 */
import {
  decideChannel,
  inWindow,
  localMinutesIn,
  type RecipientPreferences,
} from "../../src/backend/utils/notification-policy.util";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label} ${detail}`);
  }
}

const prefs = (over: Partial<RecipientPreferences> = {}): RecipientPreferences => ({
  channels: { PUSH: true, EMAIL: true, SMS: false, WHATSAPP: false, IN_APP: true },
  mutedKinds: [],
  quietHours: null,
  ...over,
});

const at = (hh: number, mm = 0) => hh * 60 + mm;

console.log("\nQuiet hours wrap around midnight");
const night = { from: "21:30", to: "07:00" };
check("22:00 is inside", inWindow(night, at(22)));
check("02:00 is inside", inWindow(night, at(2)));
check("06:59 is inside", inWindow(night, at(6, 59)));
check("07:00 is outside — the window ends there", !inWindow(night, at(7)));
check("15:00 is outside", !inWindow(night, at(15)));

const day = { from: "13:00", to: "15:00" };
check("a same-day window still works", inWindow(day, at(14)));
check("and excludes its own end", !inWindow(day, at(15)));

check("a zero-length window is empty, not the whole day", !inWindow({ from: "09:00", to: "09:00" }, at(9)));
check("nonsense is not a window", !inWindow({ from: "later", to: "07:00" }, at(3)));
check("nor is 25:00", !inWindow({ from: "25:00", to: "07:00" }, at(3)));

console.log("\nWhat the recipient asked for");
check(
  "a channel switched off is not used",
  decideChannel({
    channel: "PUSH",
    kind: "NOTICE",
    prefs: prefs({ channels: { PUSH: false } }),
    urgent: false,
    localMinutes: at(10),
  }).send === false,
);
check(
  "and the reason says so, for the delivery record",
  decideChannel({
    channel: "PUSH",
    kind: "NOTICE",
    prefs: prefs({ channels: { PUSH: false } }),
    urgent: false,
    localMinutes: at(10),
  }).reason.includes("turned this channel off"),
);
check(
  "a muted kind is not sent",
  decideChannel({
    channel: "PUSH",
    kind: "FEE",
    prefs: prefs({ mutedKinds: ["FEE"] }),
    urgent: false,
    localMinutes: at(10),
  }).send === false,
);
check(
  "but a different kind still is",
  decideChannel({
    channel: "PUSH",
    kind: "MESSAGE",
    prefs: prefs({ mutedKinds: ["FEE"] }),
    urgent: false,
    localMinutes: at(10),
  }).send === true,
);
check(
  "nothing ordinary arrives during quiet hours",
  decideChannel({
    channel: "PUSH",
    kind: "ACTIVITY",
    prefs: prefs({ quietHours: night }),
    urgent: false,
    localMinutes: at(2),
  }).send === false,
);

console.log("\nAn emergency is different");
check(
  "a critical broadcast wakes a phone at 2am",
  decideChannel({
    channel: "PUSH",
    kind: "EMERGENCY",
    prefs: prefs({ quietHours: night }),
    urgent: true,
    localMinutes: at(2),
  }).send === true,
);
check(
  "and is not stopped by a muted kind",
  decideChannel({
    channel: "PUSH",
    kind: "EMERGENCY",
    prefs: prefs({ mutedKinds: ["EMERGENCY"] }),
    urgent: true,
    localMinutes: at(2),
  }).send === true,
);
check(
  "but it still does not use a channel that was switched off",
  decideChannel({
    channel: "EMAIL",
    kind: "EMERGENCY",
    prefs: prefs({ channels: { EMAIL: false } }),
    urgent: true,
    localMinutes: at(2),
  }).send === false,
);
check(
  "the in-app row is always written, whatever the preferences say",
  decideChannel({
    channel: "IN_APP",
    kind: "EMERGENCY",
    prefs: prefs({ channels: { IN_APP: false }, mutedKinds: ["EMERGENCY"], quietHours: night }),
    urgent: false,
    localMinutes: at(2),
  }).send === true,
);

console.log("\nQuiet hours are the school's clock, not the server's");
// 18:30 UTC is midnight in Kolkata: a server that used its own clock would put
// this parent in the middle of the afternoon.
const evening = new Date("2026-08-21T18:30:00Z");
check("Asia/Kolkata reads midnight", localMinutesIn("Asia/Kolkata", evening) === 0);
check("UTC reads 18:30", localMinutesIn("UTC", evening) === at(18, 30));
check(
  "an unknown zone falls back rather than throwing",
  localMinutesIn("Mars/Olympus_Mons", evening) === at(18, 30),
);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
