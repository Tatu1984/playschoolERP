"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CATALOGUE } from "@/shared/fixtures";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { BalloonPop } from "./games/BalloonPop";
import { MemoryMatch } from "./games/MemoryMatch";
import { LetterTrace } from "./games/LetterTrace";
import { WordBuilder } from "./games/WordBuilder";
import {
  ChoiceGame,
  animalSoundQuestions,
  countingQuestions,
  mathQuestions,
  patternQuestions,
  scienceQuestions,
} from "./games/ChoiceGame";
import { COLOR_BUCKETS, COLOR_PIECES, SHAPE_BUCKETS, SHAPE_PIECES, SortGame } from "./games/SortGame";

/** Maps a game slug to its engine. Every SoW age tier has playable content. */
export function GamePlayer({ slug }: { slug: string }) {
  const game = CATALOGUE.games.find((g) => g.slug === slug);

  if (!game) {
    return (
      <EmptyState
        emoji="🕹️"
        title="Game not found"
        description="It may have been renamed."
        action={
          <Button asChild>
            <Link href="/kids/games">Back to games</Link>
          </Button>
        }
      />
    );
  }

  switch (game.engine) {
    case "BALLOON_POP":
      return <BalloonPop game={game} />;
    case "MEMORY_CARDS":
      return <MemoryMatch game={game} />;
    case "TRACING":
      return <LetterTrace game={game} />;
    case "WORD_BUILDER":
      return <WordBuilder game={game} />;
    case "SHAPE_MATCH":
      return (
        <SortGame
          game={game}
          buckets={SHAPE_BUCKETS}
          pieces={SHAPE_PIECES}
          prompt="Tap a shape, then tap the box it belongs in"
        />
      );
    case "COLOR_SORT":
      return (
        <SortGame
          game={game}
          buckets={COLOR_BUCKETS}
          pieces={COLOR_PIECES}
          prompt="Tap something, then tap the basket of the same colour"
        />
      );
    case "SOUND_MATCH":
      return <ChoiceGame game={game} makeQuestions={animalSoundQuestions} />;
    case "COUNTING":
      return <ChoiceGame game={game} makeQuestions={countingQuestions} />;
    case "PATTERN":
      return <ChoiceGame game={game} makeQuestions={patternQuestions} rounds={6} />;
    case "MATH_ADVENTURE":
      return <ChoiceGame game={game} makeQuestions={mathQuestions} />;
    case "QUIZ":
      return <ChoiceGame game={game} makeQuestions={scienceQuestions} />;
    default:
      return <EmptyState emoji="🚧" title="Coming soon" description="This game is still being built." />;
  }
}
