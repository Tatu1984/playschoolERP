import type { MascotKey } from "@/shared/types/learning.types";

export interface Mascot {
  key: MascotKey;
  name: string;
  emoji: string;
  tagline: string;
  /** What the mascot says when a game is won. */
  cheer: string[];
  /** What it says on a wrong answer — never scolding. */
  nudge: string[];
  bg: string;
}

export const MASCOTS: Record<MascotKey, Mascot> = {
  kiki: {
    key: "kiki",
    name: "Kiki",
    emoji: "🐨",
    tagline: "Loves climbing and counting",
    cheer: ["You did it!", "Wooooo!", "High five!", "Kiki is so proud!"],
    nudge: ["Nearly! Try again.", "Ooh, close one!", "Have another go."],
    bg: "from-ck-blue/25 to-ck-green/15",
  },
  dodo: {
    key: "dodo",
    name: "Dodo",
    emoji: "🦤",
    tagline: "Tells the best stories",
    cheer: ["Brilliant!", "Dodo is dancing!", "That was great!", "Star earned!"],
    nudge: ["Hmm, not that one.", "Try the next one!", "Keep going!"],
    bg: "from-ck-orange/25 to-ck-red/15",
  },
  mimi: {
    key: "mimi",
    name: "Mimi",
    emoji: "🐰",
    tagline: "Hops, sings and paints",
    cheer: ["Yaaay!", "Mimi is hopping!", "Perfect!", "Lovely work!"],
    nudge: ["Almost!", "One more try.", "You can do it."],
    bg: "from-ck-magenta/20 to-ck-lavender/40",
  },
};

export const MASCOT_LIST: Mascot[] = Object.values(MASCOTS);

/** Deterministic cheer picker so SSR and the client agree on first paint. */
export function cheerFor(mascot: Mascot, seed: number): string {
  return mascot.cheer[seed % mascot.cheer.length];
}

export function nudgeFor(mascot: Mascot, seed: number): string {
  return mascot.nudge[seed % mascot.nudge.length];
}
