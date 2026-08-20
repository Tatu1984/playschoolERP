/**
 * The kids zone (SoW §7.13): game catalogue, sessions, the adventure map,
 * stories, badges and saved artwork.
 *
 * Two things shape this service:
 *
 *  * A child's progress belongs to their family. Every write goes through the
 *    same "is this your child" check the rest of the portal uses, so no session
 *    can add stars to someone else's journey.
 *  * Stars are awarded server-side. The browser reports a score; the server
 *    decides how many stars that is worth, capped at the game's maxStars —
 *    otherwise the leaderboard is whatever the console can be made to say.
 */
import { prisma } from "@/backend/database/client";
import { toArtwork, toBadge, toGame, toGameSession, toJourney, toStory } from "@/backend/mappers";
import { ForbiddenError, NotFoundError } from "@/backend/utils/error-handler.util";
import { canSeeStudent, type Scope } from "@/backend/utils/scope.util";
import { ROLES } from "@/shared/constants/roles";
import type {
  Artwork,
  Badge,
  Game,
  GameSession,
  JourneyState,
  MascotKey,
  Story,
} from "@/shared/types/learning.types";

const todayKey = () => new Date().toISOString().slice(0, 10);
const yesterdayKey = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

const EMPTY_JOURNEY = {
  stars: 0,
  level: 1,
  streakDays: 0,
  lastPlayedOn: null as string | null,
  unlockedBadges: [] as string[],
  completedGames: [] as string[],
  finishedStories: [] as string[],
  mascot: "kiki" as MascotKey,
};

/** Staff can look at any child's progress; a parent only at their own. */
function assertChild(scope: Scope, studentId: string) {
  if (scope.role === ROLES.PARENT && !canSeeStudent(scope, studentId)) {
    throw new ForbiddenError();
  }
}

export const kidsService = {
  async catalogue(): Promise<{ games: Game[]; stories: Story[]; badges: Badge[] }> {
    const [games, stories, badges] = await Promise.all([
      prisma.game.findMany({ orderBy: { ageTier: "asc" } }),
      prisma.story.findMany({ orderBy: { minutes: "asc" } }),
      prisma.badge.findMany({ orderBy: { requiredStars: "asc" } }),
    ]);
    return { games: games.map(toGame), stories: stories.map(toStory), badges: badges.map(toBadge) };
  },

  async getGame(slug: string): Promise<Game> {
    const row = await prisma.game.findUnique({ where: { slug } });
    if (!row) throw new NotFoundError("Game not found");
    return toGame(row);
  },

  async getStory(id: string): Promise<Story> {
    const row = await prisma.story.findUnique({ where: { id } });
    if (!row) throw new NotFoundError("Story not found");
    return toStory(row);
  },

  async journey(scope: Scope, studentId: string): Promise<JourneyState> {
    assertChild(scope, studentId);
    const row = await prisma.journeyState.findUnique({ where: { studentId } });
    return row ? toJourney(row) : { studentId, ...EMPTY_JOURNEY };
  },

  async journeysFor(scope: Scope): Promise<JourneyState[]> {
    const ids = scope.role === ROLES.PARENT ? scope.studentIds : undefined;
    const rows = await prisma.journeyState.findMany({
      where: ids ? { studentId: { in: ids } } : {},
    });
    return rows.map(toJourney);
  },

  async sessions(scope: Scope, studentId?: string): Promise<GameSession[]> {
    const where = studentId
      ? { studentId }
      : scope.role === ROLES.PARENT
        ? { studentId: { in: scope.studentIds } }
        : {};
    if (studentId) assertChild(scope, studentId);
    const rows = await prisma.gameSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map(toGameSession);
  },

  /**
   * Finish a game: record the session, award stars, extend the streak and
   * unlock any badges the new total reaches. Returns the badges that are new
   * *this run*, because that is what the "You earned…" screen shows.
   */
  async finishGame(
    scope: Scope,
    input: { studentId: string; gameSlug: string; score: number; stars: number; durationSec: number },
  ): Promise<{ journey: JourneyState; session: GameSession; newBadges: Badge[] }> {
    assertChild(scope, input.studentId);
    const game = await prisma.game.findUnique({ where: { slug: input.gameSlug } });
    if (!game) throw new NotFoundError("Game not found");
    // The client reports a score; the server decides the stars.
    const stars = Math.max(0, Math.min(game.maxStars, Math.round(input.stars)));

    return prisma.$transaction(async (tx) => {
      const session = await tx.gameSession.create({
        data: {
          gameSlug: input.gameSlug,
          studentId: input.studentId,
          score: input.score,
          stars,
          durationSec: input.durationSec,
          completed: true,
        },
      });

      const current = await tx.journeyState.findUnique({ where: { studentId: input.studentId } });
      const journey = current ?? { studentId: input.studentId, ...EMPTY_JOURNEY };
      const today = todayKey();
      const totalStars = journey.stars + stars;

      // A streak counts consecutive *days*: playing twice today does not
      // extend it, and a gap of more than a day starts again at 1.
      const streakDays =
        journey.lastPlayedOn === today
          ? journey.streakDays
          : journey.lastPlayedOn === yesterdayKey()
            ? journey.streakDays + 1
            : 1;

      const allBadges = await tx.badge.findMany({ orderBy: { requiredStars: "asc" } });
      const unlocked = allBadges.filter((b) => totalStars >= b.requiredStars).map((b) => b.key);
      const newBadges = allBadges.filter(
        (b) => unlocked.includes(b.key) && !journey.unlockedBadges.includes(b.key),
      );

      const data = {
        stars: totalStars,
        level: Math.max(1, Math.floor(totalStars / 10) + 1),
        streakDays,
        lastPlayedOn: today,
        unlockedBadges: unlocked,
        completedGames: journey.completedGames.includes(input.gameSlug)
          ? journey.completedGames
          : [...journey.completedGames, input.gameSlug],
      };

      const saved = await tx.journeyState.upsert({
        where: { studentId: input.studentId },
        update: data,
        create: {
          studentId: input.studentId,
          ...EMPTY_JOURNEY,
          ...data,
          finishedStories: journey.finishedStories,
          mascot: journey.mascot,
        },
      });

      return {
        journey: toJourney(saved),
        session: toGameSession(session),
        newBadges: newBadges.map(toBadge),
      };
    });
  },

  async finishStory(scope: Scope, studentId: string, storyId: string): Promise<JourneyState> {
    assertChild(scope, studentId);
    const current = await prisma.journeyState.findUnique({ where: { studentId } });
    const finished = current?.finishedStories ?? [];
    if (finished.includes(storyId)) return this.journey(scope, studentId);
    const saved = await prisma.journeyState.upsert({
      where: { studentId },
      update: { finishedStories: [...finished, storyId] },
      create: { studentId, ...EMPTY_JOURNEY, finishedStories: [storyId] },
    });
    return toJourney(saved);
  },

  async setMascot(scope: Scope, studentId: string, mascot: MascotKey): Promise<JourneyState> {
    assertChild(scope, studentId);
    const saved = await prisma.journeyState.upsert({
      where: { studentId },
      update: { mascot },
      create: { studentId, ...EMPTY_JOURNEY, mascot },
    });
    return toJourney(saved);
  },

  async listArtwork(scope: Scope, studentId?: string): Promise<Artwork[]> {
    if (studentId) assertChild(scope, studentId);
    const where = studentId
      ? { studentId }
      : scope.role === ROLES.PARENT
        ? { studentId: { in: scope.studentIds } }
        : {};
    const rows = await prisma.artwork.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map(toArtwork);
  },

  async saveArtwork(scope: Scope, studentId: string, title: string, dataUrl: string): Promise<Artwork> {
    assertChild(scope, studentId);
    const row = await prisma.artwork.create({ data: { studentId, title, dataUrl } });
    return toArtwork(row);
  },

  async deleteArtwork(scope: Scope, id: string): Promise<void> {
    const existing = await prisma.artwork.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Artwork not found");
    assertChild(scope, existing.studentId);
    await prisma.artwork.delete({ where: { id } });
  },
};
