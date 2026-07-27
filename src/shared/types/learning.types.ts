import type { AccentColor, ProgramSlug } from "./school.types";
import type { Entity, ID, ISODate, MediaRef } from "./common.types";

// ---------------------------------------------------------------- curriculum

export interface Lesson extends Entity {
  title: string;
  programSlug: ProgramSlug;
  classroomId: ID | null;
  /** "YYYY-MM-DD" */
  date: string;
  slot: "MORNING" | "MIDDAY" | "AFTERNOON";
  objective: string;
  materials: string[];
  steps: string[];
  skillTags: string[];
  status: "PLANNED" | "IN_PROGRESS" | "DONE" | "SKIPPED";
  authorStaffId: ID;
  homework: string;
}

export interface CurriculumUnit extends Entity {
  programSlug: ProgramSlug;
  term: number;
  title: string;
  focus: string;
  weeks: number;
  outcomes: string[];
}

// ---------------------------------------------------------------- progress

export type SkillKey =
  | "cognitive"
  | "language"
  | "motor"
  | "social"
  | "emotional"
  | "creative";

export const SKILL_LABELS: Record<SkillKey, string> = {
  cognitive: "Cognitive",
  language: "Language",
  motor: "Motor skills",
  social: "Social",
  emotional: "Emotional",
  creative: "Creative",
};

export interface ProgressReport extends Entity {
  studentId: ID;
  term: string;
  /** 0–100 per skill. */
  scores: Record<SkillKey, number>;
  teacherRemark: string;
  strengths: string[];
  focusAreas: string[];
  attendancePct: number;
  publishedAt: ISODate | null;
  authorStaffId: ID;
}

export interface Milestone extends Entity {
  studentId: ID;
  label: string;
  skill: SkillKey;
  achievedOn: ISODate;
  note: string;
  emoji: string;
}

// ---------------------------------------------------------------- kids zone

export type AgeTier = "2-3" | "3-4" | "4-5" | "5-6";

export type GameEngine =
  | "BALLOON_POP"
  | "SHAPE_MATCH"
  | "SOUND_MATCH"
  | "COLOR_SORT"
  | "COUNTING"
  | "TRACING"
  | "MEMORY_CARDS"
  | "WORD_BUILDER"
  | "PATTERN"
  | "MATH_ADVENTURE"
  | "QUIZ";

export interface Game {
  slug: string;
  title: string;
  tagline: string;
  ageTier: AgeTier;
  engine: GameEngine;
  emoji: string;
  accent: AccentColor;
  skill: SkillKey;
  /** Stars awarded for a perfect run. */
  maxStars: number;
  instructions: string;
}

export interface GameSession extends Entity {
  gameSlug: string;
  studentId: ID;
  score: number;
  stars: number;
  durationSec: number;
  completed: boolean;
}

export interface Story {
  id: string;
  title: string;
  moral: string;
  ageTier: AgeTier;
  emoji: string;
  accent: AccentColor;
  minutes: number;
  pages: { text: string; emoji: string }[];
}

export interface Badge {
  key: string;
  label: string;
  description: string;
  emoji: string;
  /** Stars needed to unlock. */
  requiredStars: number;
}

export interface JourneyState {
  studentId: ID;
  stars: number;
  level: number;
  streakDays: number;
  lastPlayedOn: string | null;
  unlockedBadges: string[];
  completedGames: string[];
  finishedStories: string[];
  mascot: MascotKey;
}

export type MascotKey = "kiki" | "dodo" | "mimi";

export interface Artwork extends Entity {
  studentId: ID;
  title: string;
  /** data-URL PNG from the drawing canvas. */
  dataUrl: string;
}

// ---------------------------------------------------------------- CMS

export type PageStatus = "DRAFT" | "PUBLISHED";

export interface CmsPage extends Entity {
  slug: string;
  title: string;
  heroHeading: string;
  heroSub: string;
  seoTitle: string;
  seoDescription: string;
  status: PageStatus;
  sections: { id: ID; heading: string; body: string }[];
}

export interface BlogPost extends Entity {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  author: string;
  coverEmoji: string;
  readMinutes: number;
  status: PageStatus;
  publishedAt: ISODate | null;
  views: number;
}

export interface Banner extends Entity {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  accent: AccentColor;
  active: boolean;
  startsOn: ISODate | null;
  endsOn: ISODate | null;
}

export interface MediaAsset extends Entity {
  label: string;
  kind: MediaRef["kind"];
  category: string;
  sizeKb: number;
  emoji: string;
  url: string;
  usedOn: string[];
}

export interface Testimonial extends Entity {
  parentName: string;
  childName: string;
  relation: string;
  rating: number;
  quote: string;
  emoji: string;
  videoUrl: string | null;
  published: boolean;
}
