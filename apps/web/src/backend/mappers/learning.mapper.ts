import type {
  Artwork,
  Badge,
  Banner,
  BlogPost,
  CmsPage,
  CurriculumUnit,
  Game,
  GameSession,
  JourneyState,
  Lesson,
  MediaAsset,
  Milestone,
  ProgressReport,
  SkillKey,
  Story,
  Testimonial,
} from "@/shared/types/learning.types";
import type { MediaRef } from "@/shared/types/common.types";
import type { AccentColor, ProgramSlug } from "@/shared/types/school.types";
import type * as P from "@/backend/database/generated";
import { asJson, iso, isoOrNull } from "./index";

type AgeTier = Game["ageTier"];

// ---------------------------------------------------------------- curriculum

export function toLesson(l: P.Lesson): Lesson {
  return {
    id: l.id,
    title: l.title,
    programSlug: l.programSlug as ProgramSlug,
    classroomId: l.classroomId,
    date: l.date,
    slot: l.slot,
    objective: l.objective,
    materials: l.materials,
    steps: l.steps,
    skillTags: l.skillTags,
    status: l.status,
    authorStaffId: l.authorStaffId,
    homework: l.homework,
    createdAt: iso(l.createdAt),
    updatedAt: iso(l.updatedAt),
  };
}

export function toCurriculumUnit(c: P.CurriculumUnit): CurriculumUnit {
  return {
    id: c.id,
    programSlug: c.programSlug as ProgramSlug,
    term: c.term,
    title: c.title,
    focus: c.focus,
    weeks: c.weeks,
    outcomes: c.outcomes,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  };
}

// ---------------------------------------------------------------- progress

export function toProgressReport(r: P.ProgressReport): ProgressReport {
  return {
    id: r.id,
    studentId: r.studentId,
    term: r.term,
    scores: asJson<Record<SkillKey, number>>(r.scores, {
      cognitive: 0,
      language: 0,
      motor: 0,
      social: 0,
      emotional: 0,
      creative: 0,
    }),
    teacherRemark: r.teacherRemark,
    strengths: r.strengths,
    focusAreas: r.focusAreas,
    attendancePct: r.attendancePct,
    publishedAt: isoOrNull(r.publishedAt),
    authorStaffId: r.authorStaffId,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

export function toMilestone(m: P.Milestone): Milestone {
  return {
    id: m.id,
    studentId: m.studentId,
    label: m.label,
    skill: m.skill,
    achievedOn: iso(m.achievedOn),
    note: m.note,
    emoji: m.emoji,
    createdAt: iso(m.createdAt),
  };
}

// ---------------------------------------------------------------- kids zone

export function toGame(g: P.Game): Game {
  return {
    slug: g.slug,
    title: g.title,
    tagline: g.tagline,
    ageTier: g.ageTier as AgeTier,
    engine: g.engine,
    emoji: g.emoji,
    accent: g.accent as AccentColor,
    skill: g.skill,
    maxStars: g.maxStars,
    instructions: g.instructions,
  };
}

export function toGameSession(s: P.GameSession): GameSession {
  return {
    id: s.id,
    gameSlug: s.gameSlug,
    studentId: s.studentId,
    score: s.score,
    stars: s.stars,
    durationSec: s.durationSec,
    completed: s.completed,
    createdAt: iso(s.createdAt),
    updatedAt: iso(s.updatedAt),
  };
}

export function toStory(s: P.Story): Story {
  return {
    id: s.id,
    title: s.title,
    moral: s.moral,
    ageTier: s.ageTier as AgeTier,
    emoji: s.emoji,
    accent: s.accent as AccentColor,
    minutes: s.minutes,
    pages: asJson<Story["pages"]>(s.pages, []),
  };
}

export function toBadge(b: P.Badge): Badge {
  return {
    key: b.key,
    label: b.label,
    description: b.description,
    emoji: b.emoji,
    requiredStars: b.requiredStars,
  };
}

export function toJourney(j: P.JourneyState): JourneyState {
  return {
    studentId: j.studentId,
    stars: j.stars,
    level: j.level,
    streakDays: j.streakDays,
    lastPlayedOn: j.lastPlayedOn,
    unlockedBadges: j.unlockedBadges,
    completedGames: j.completedGames,
    finishedStories: j.finishedStories,
    mascot: j.mascot,
  };
}

export function toArtwork(a: P.Artwork): Artwork {
  return {
    id: a.id,
    studentId: a.studentId,
    title: a.title,
    dataUrl: a.dataUrl,
    createdAt: iso(a.createdAt),
  };
}

// ---------------------------------------------------------------- CMS

export function toCmsPage(p: P.CmsPage): CmsPage {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    heroHeading: p.heroHeading,
    heroSub: p.heroSub,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    status: p.status,
    sections: asJson<CmsPage["sections"]>(p.sections, []),
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
  };
}

export function toBlogPost(p: P.BlogPost): BlogPost {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    body: p.body,
    category: p.category,
    tags: p.tags,
    author: p.author,
    coverEmoji: p.coverEmoji,
    readMinutes: p.readMinutes,
    status: p.status,
    publishedAt: isoOrNull(p.publishedAt),
    views: p.views,
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
  };
}

export function toBanner(b: P.Banner): Banner {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    ctaLabel: b.ctaLabel,
    ctaHref: b.ctaHref,
    accent: b.accent as AccentColor,
    active: b.active,
    startsOn: isoOrNull(b.startsOn),
    endsOn: isoOrNull(b.endsOn),
    createdAt: iso(b.createdAt),
    updatedAt: iso(b.updatedAt),
  };
}

export function toMediaAsset(m: P.MediaAsset): MediaAsset {
  return {
    id: m.id,
    label: m.label,
    kind: m.kind as MediaRef["kind"],
    category: m.category,
    sizeKb: m.sizeKb,
    emoji: m.emoji,
    url: m.url,
    usedOn: m.usedOn,
    createdAt: iso(m.createdAt),
    updatedAt: iso(m.updatedAt),
  };
}

export function toTestimonial(t: P.Testimonial): Testimonial {
  return {
    id: t.id,
    parentName: t.parentName,
    childName: t.childName,
    relation: t.relation,
    rating: t.rating,
    quote: t.quote,
    emoji: t.emoji,
    videoUrl: t.videoUrl,
    published: t.published,
    createdAt: iso(t.createdAt),
    updatedAt: iso(t.updatedAt),
  };
}
