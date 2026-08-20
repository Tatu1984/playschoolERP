/** Curriculum, progress reports and the kids-zone catalogue. */
import type {
  Badge,
  CurriculumUnit,
  Game,
  JourneyState,
  Lesson,
  Milestone,
  ProgressReport,
  SkillKey,
  Story,
} from "../types/learning.types";
import { addDays, dateKey, daysAgo, today } from "../utils/date.util";
import { seeded } from "../utils/common.util";
import { STUDENTS } from "./school.fixture";

// --------------------------------------------------------------- lessons

const LESSON_SEEDS: {
  title: string;
  classroomId: string;
  staffId: string;
  objective: string;
  materials: string[];
  steps: string[];
  skills: string[];
  homework: string;
  offset: number;
  slot: Lesson["slot"];
}[] = [
  {
    title: "Sound of the week: /s/",
    classroomId: "cr_rainbow",
    staffId: "st_ananya",
    objective: "Recognise and produce the /s/ sound in initial position.",
    materials: ["Phonic cards", "Sock basket", "Snake puppet"],
    steps: ["Snake puppet greeting", "Sound hunt around the room", "Sorting /s/ vs /m/ cards", "Trace the letter in sand"],
    skills: ["language", "cognitive"],
    homework: "Find three /s/ things at home.",
    offset: 0,
    slot: "MORNING",
  },
  {
    title: "Counting to 20 with bottle caps",
    classroomId: "cr_rainbow",
    staffId: "st_ananya",
    objective: "One-to-one correspondence up to 20.",
    materials: ["Bottle caps", "Number mats"],
    steps: ["Count together", "Fill the number mats", "Who has more?"],
    skills: ["cognitive"],
    homework: "Count the spoons at dinner.",
    offset: 0,
    slot: "MIDDAY",
  },
  {
    title: "Sensory bin: rice and scoops",
    classroomId: "cr_sunshine",
    staffId: "st_meera",
    objective: "Pincer grip and pouring control.",
    materials: ["Rice bin", "Scoops", "Cups"],
    steps: ["Free exploration", "Fill and pour", "Clean-up song"],
    skills: ["motor", "creative"],
    homework: "",
    offset: 0,
    slot: "MORNING",
  },
  {
    title: "CVC blending: -at words",
    classroomId: "cr_blossom",
    staffId: "st_rekha",
    objective: "Blend three sounds into -at family words.",
    materials: ["Word sliders", "Whiteboards"],
    steps: ["Model cat/bat/hat", "Slider practice", "Write two words", "Silly sentence game"],
    skills: ["language"],
    homework: "Read the -at slider to a grown-up.",
    offset: 1,
    slot: "MORNING",
  },
  {
    title: "Monsoon song — full run",
    classroomId: "cr_starlight",
    staffId: "st_farhan",
    objective: "Perform verse 1–3 with movements, in position.",
    materials: ["Speaker", "Paper umbrellas"],
    steps: ["Warm-up", "Positions", "Full run", "Notes"],
    skills: ["creative", "social"],
    homework: "Practise verse 3.",
    offset: 1,
    slot: "AFTERNOON",
  },
  {
    title: "Shapes in our classroom",
    classroomId: "cr_meadow",
    staffId: "st_sneha",
    objective: "Identify circle, square, triangle in the environment.",
    materials: ["Shape cutouts", "Camera"],
    steps: ["Shape song", "Shape hunt", "Class shape collage"],
    skills: ["cognitive", "creative"],
    homework: "Spot two circles at home.",
    offset: 2,
    slot: "MORNING",
  },
  {
    title: "Vegetable shop role play",
    classroomId: "cr_comet",
    staffId: "st_arjun",
    objective: "Use number words in a real exchange; take turns.",
    materials: ["Toy vegetables", "Play money", "Baskets"],
    steps: ["Set up stalls", "Shopkeeper/customer swap", "Count the takings"],
    skills: ["social", "cognitive"],
    homework: "",
    offset: -1,
    slot: "MIDDAY",
  },
  {
    title: "Emotions faces",
    classroomId: "cr_blossom",
    staffId: "st_rekha",
    objective: "Name four feelings and say when we feel them.",
    materials: ["Feeling cards", "Mirror"],
    steps: ["Mirror faces", "Story with pauses", "Draw your feeling"],
    skills: ["emotional", "social"],
    homework: "Tell someone about a happy moment today.",
    offset: -2,
    slot: "AFTERNOON",
  },
  {
    title: "Balance beam and hoops",
    classroomId: "cr_sunshine",
    staffId: "st_meera",
    objective: "Gross-motor confidence: walk, hop, land.",
    materials: ["Beam", "Hoops", "Cones"],
    steps: ["Warm-up march", "Beam walk with hand-hold", "Hoop hop", "Cool down"],
    skills: ["motor"],
    homework: "",
    offset: 3,
    slot: "MORNING",
  },
  {
    title: "Abacus L2 — carry over",
    classroomId: "cr_starlight",
    staffId: "st_pooja",
    objective: "Two-digit addition with a carry, on the frame.",
    materials: ["Abacus", "Speed sheets"],
    steps: ["Finger drill", "Model 2 sums", "Sheet A", "Speed round"],
    skills: ["cognitive"],
    homework: "Sheet B, first 10 sums.",
    offset: 4,
    slot: "MIDDAY",
  },
];

export const LESSONS: Lesson[] = LESSON_SEEDS.map((l, i) => {
  const d = addDays(today(), l.offset);
  const programByClass: Record<string, Lesson["programSlug"]> = {
    cr_sunshine: "toddlers",
    cr_rainbow: "nursery",
    cr_blossom: "junior-kg",
    cr_starlight: "senior-kg",
    cr_meadow: "nursery",
    cr_comet: "junior-kg",
  };
  return {
    id: `lsn_${i + 1}`,
    title: l.title,
    programSlug: programByClass[l.classroomId],
    classroomId: l.classroomId,
    date: dateKey(d),
    slot: l.slot,
    objective: l.objective,
    materials: l.materials,
    steps: l.steps,
    skillTags: l.skills,
    status: l.offset < 0 ? "DONE" : l.offset === 0 ? "IN_PROGRESS" : "PLANNED",
    authorStaffId: l.staffId,
    homework: l.homework,
    createdAt: daysAgo(7 - i),
  };
});

export const CURRICULUM: CurriculumUnit[] = [
  { id: "cu_1", programSlug: "toddlers", term: 1, title: "Me and my world", focus: "Senses, self-help, separation", weeks: 8, outcomes: ["Settles without tears", "Names body parts", "Drinks from a cup"], createdAt: daysAgo(200) },
  { id: "cu_2", programSlug: "toddlers", term: 2, title: "Colours and creatures", focus: "Colour naming, animal sounds", weeks: 8, outcomes: ["Names 4 colours", "Matches 6 animal sounds"], createdAt: daysAgo(200) },
  { id: "cu_3", programSlug: "nursery", term: 1, title: "Sounds all around", focus: "Phonic awareness A–M", weeks: 9, outcomes: ["Recognises 13 sounds", "Traces 8 letters"], createdAt: daysAgo(200) },
  { id: "cu_4", programSlug: "nursery", term: 2, title: "Numbers at play", focus: "Counting 1–20, sorting", weeks: 9, outcomes: ["Counts to 20", "Sorts by two attributes"], createdAt: daysAgo(200) },
  { id: "cu_5", programSlug: "junior-kg", term: 1, title: "I can read", focus: "CVC blending, sight words", weeks: 10, outcomes: ["Reads 25 sight words", "Blends CVC"], createdAt: daysAgo(200) },
  { id: "cu_6", programSlug: "junior-kg", term: 2, title: "How things work", focus: "Simple science, projects", weeks: 10, outcomes: ["Completes a group project", "Explains sink/float"], createdAt: daysAgo(200) },
  { id: "cu_7", programSlug: "senior-kg", term: 1, title: "Storyteller", focus: "Fluency, journal writing", weeks: 10, outcomes: ["Reads a page aloud", "Writes 4 sentences"], createdAt: daysAgo(200) },
  { id: "cu_8", programSlug: "senior-kg", term: 2, title: "Big school ready", focus: "Mental math, stage confidence", weeks: 10, outcomes: ["2-step sums", "Performs solo lines"], createdAt: daysAgo(200) },
];

// --------------------------------------------------------------- progress

const SKILLS: SkillKey[] = ["cognitive", "language", "motor", "social", "emotional", "creative"];

const REMARKS = [
  "A curious, warm child who has settled beautifully this term. Asks wonderful questions.",
  "Growing in confidence every week. Now volunteers to lead the rhyme circle.",
  "Strong with numbers and patterns. We are working on waiting for a turn.",
  "Enormously creative. Needs gentle nudging to finish what has been started.",
];

export const PROGRESS_REPORTS: ProgressReport[] = STUDENTS.flatMap((s, i) =>
  ["Term 1 · 2026-27", "Term 2 · 2026-27"].map((term, ti) => {
    const scores = SKILLS.reduce(
      (acc, skill, si) => {
        const base = 58 + Math.round(seeded(i * 11 + si * 3 + ti * 5) * 34);
        acc[skill] = Math.min(98, base + ti * 4);
        return acc;
      },
      {} as Record<SkillKey, number>,
    );
    return {
      id: `rep_${s.id}_t${ti + 1}`,
      studentId: s.id,
      term,
      scores,
      teacherRemark: REMARKS[(i + ti) % REMARKS.length],
      strengths: ti === 0 ? ["Curiosity", "Fine motor"] : ["Peer play", "Focus stamina"],
      focusAreas: ti === 0 ? ["Turn-taking"] : ["Pencil grip"],
      attendancePct: 88 + Math.round(seeded(i * 7 + ti) * 10),
      publishedAt: ti === 0 ? daysAgo(120, 10, 0) : i % 4 === 0 ? null : daysAgo(6, 10, 0),
      authorStaffId: "st_meera",
      createdAt: ti === 0 ? daysAgo(122) : daysAgo(8),
    };
  }),
);

const MILESTONE_SEEDS: { label: string; skill: SkillKey; emoji: string }[] = [
  { label: "Waved goodbye without tears", skill: "emotional", emoji: "👋" },
  { label: "Counted to 20 unaided", skill: "cognitive", emoji: "🔢" },
  { label: "Wrote own first name", skill: "language", emoji: "✍️" },
  { label: "Shared a toy unprompted", skill: "social", emoji: "🤝" },
  { label: "Walked the balance beam alone", skill: "motor", emoji: "🤸" },
  { label: "Told a 4-sentence story", skill: "language", emoji: "📖" },
  { label: "Finished a full painting", skill: "creative", emoji: "🎨" },
];

export const MILESTONES: Milestone[] = STUDENTS.flatMap((s, i) =>
  MILESTONE_SEEDS.filter((_, mi) => seeded(i * 5 + mi) > 0.35).map((m, mi) => ({
    id: `ms_${s.id}_${mi}`,
    studentId: s.id,
    label: m.label,
    skill: m.skill,
    achievedOn: daysAgo(10 + mi * 14 + (i % 5)),
    note: "",
    emoji: m.emoji,
    createdAt: daysAgo(10 + mi * 14 + (i % 5)),
  })),
);

// --------------------------------------------------------------- kids zone

export const GAMES: Game[] = [
  { slug: "balloon-pop", title: "Balloon Pop", tagline: "Pop the colour I call out!", ageTier: "2-3", engine: "BALLOON_POP", emoji: "🎈", accent: "red", skill: "motor", maxStars: 3, instructions: "Tap the balloon that matches the colour shown at the top. Ten pops to win." },
  { slug: "shape-drop", title: "Shape Drop", tagline: "Drag each shape to its hole", ageTier: "2-3", engine: "SHAPE_MATCH", emoji: "🔺", accent: "blue", skill: "cognitive", maxStars: 3, instructions: "Drag each shape onto its matching outline." },
  { slug: "animal-sounds", title: "Who Says That?", tagline: "Match the animal to its sound", ageTier: "2-3", engine: "SOUND_MATCH", emoji: "🐮", accent: "green", skill: "language", maxStars: 3, instructions: "Listen to the clue and tap the animal that makes that sound." },
  { slug: "colour-sort", title: "Colour Sort", tagline: "Put the socks in the right basket", ageTier: "2-3", engine: "COLOR_SORT", emoji: "🧦", accent: "magenta", skill: "cognitive", maxStars: 3, instructions: "Drag each sock into the basket of the same colour." },
  { slug: "letter-trace", title: "Letter Tracing", tagline: "Trace the letter with your finger", ageTier: "3-4", engine: "TRACING", emoji: "✏️", accent: "orange", skill: "motor", maxStars: 3, instructions: "Follow the dotted path with your finger or mouse. Cover the whole letter." },
  { slug: "memory-match", title: "Memory Match", tagline: "Find the matching pairs", ageTier: "3-4", engine: "MEMORY_CARDS", emoji: "🃏", accent: "navy", skill: "cognitive", maxStars: 3, instructions: "Flip two cards. If they match, they stay. Clear the board!" },
  { slug: "count-along", title: "Count Along", tagline: "How many do you see?", ageTier: "3-4", engine: "COUNTING", emoji: "🍎", accent: "green", skill: "cognitive", maxStars: 3, instructions: "Count the fruit and tap the right number." },
  { slug: "word-builder", title: "Word Builder", tagline: "Build the word from the sounds", ageTier: "4-5", engine: "WORD_BUILDER", emoji: "🔤", accent: "blue", skill: "language", maxStars: 3, instructions: "Tap the letters in order to spell the picture." },
  { slug: "pattern-party", title: "Pattern Party", tagline: "What comes next?", ageTier: "4-5", engine: "PATTERN", emoji: "🔷", accent: "magenta", skill: "cognitive", maxStars: 3, instructions: "Look at the pattern and pick the piece that comes next." },
  { slug: "math-adventure", title: "Math Adventure", tagline: "Add and subtract to cross the bridge", ageTier: "5-6", engine: "MATH_ADVENTURE", emoji: "🧮", accent: "orange", skill: "cognitive", maxStars: 3, instructions: "Solve each sum to lay the next plank of the bridge." },
  { slug: "science-quiz", title: "Mini Science Lab", tagline: "Sink or float? Day or night?", ageTier: "5-6", engine: "QUIZ", emoji: "🔬", accent: "green", skill: "cognitive", maxStars: 3, instructions: "Answer each question. Two guesses allowed per question." },
];

export const STORIES: Story[] = [
  {
    id: "st_umbrella",
    title: "The Umbrella That Wanted Rain",
    moral: "Patience brings its own season.",
    ageTier: "3-4",
    emoji: "☔",
    accent: "blue",
    minutes: 4,
    pages: [
      { text: "In the corner of a cupboard lived a small blue umbrella named Chhata.", emoji: "🌂" },
      { text: "Every morning Chhata peeked outside. Sunshine. Sunshine. More sunshine.", emoji: "☀️" },
      { text: "\"When will it rain?\" sighed Chhata. \"I have never once been opened.\"", emoji: "😔" },
      { text: "Then one grey Tuesday, the sky rumbled like a hungry tummy.", emoji: "⛈️" },
      { text: "A little hand grabbed Chhata and — whoosh! — open at last, keeping two shoes dry.", emoji: "👟" },
      { text: "That night Chhata dripped happily in the doorway. Worth the wait.", emoji: "💧" },
    ],
  },
  {
    id: "st_lion",
    title: "Sherni and the Very Loud Roar",
    moral: "Being loud is not the same as being brave.",
    ageTier: "4-5",
    emoji: "🦁",
    accent: "orange",
    minutes: 5,
    pages: [
      { text: "Sherni had the loudest roar in the whole jungle. She practised it daily.", emoji: "🦁" },
      { text: "The parrots left. The deer left. Even the beetles packed up and left.", emoji: "🦜" },
      { text: "One evening Sherni found a lost baby monkey crying near the river.", emoji: "🐒" },
      { text: "Roaring would only frighten him. So Sherni did something new. She hummed.", emoji: "🎵" },
      { text: "The monkey held her paw all the way home. The jungle came back to listen.", emoji: "🌳" },
    ],
  },
  {
    id: "st_star",
    title: "The Star Who Slept In",
    moral: "Everyone shines on their own schedule.",
    ageTier: "2-3",
    emoji: "⭐",
    accent: "navy",
    minutes: 3,
    pages: [
      { text: "Tara the little star always woke up late.", emoji: "⭐" },
      { text: "By the time she shone, the other stars were yawning.", emoji: "🌙" },
      { text: "But a baby on Earth only looked up at bedtime — and saw only Tara.", emoji: "👶" },
      { text: "\"That one is mine,\" said the baby. Tara shone her very brightest.", emoji: "✨" },
    ],
  },
  {
    id: "st_seed",
    title: "One Small Seed",
    moral: "Small things grow when you tend them.",
    ageTier: "5-6",
    emoji: "🌱",
    accent: "green",
    minutes: 5,
    pages: [
      { text: "Ishaan found a seed in his pocket and no idea where it came from.", emoji: "🫘" },
      { text: "He planted it in a cracked cup with dirt from the balcony.", emoji: "🪴" },
      { text: "Nothing happened. For eleven whole days, nothing happened.", emoji: "😐" },
      { text: "On day twelve there was a green comma poking through the soil.", emoji: "🌱" },
      { text: "By winter it was taller than his knee. He named it Bikash — growth.", emoji: "🌿" },
    ],
  },
];

export const BADGES: Badge[] = [
  { key: "first-star", label: "First Star", description: "Finish your very first game", emoji: "⭐", requiredStars: 1 },
  { key: "explorer", label: "Explorer", description: "Collect 10 stars", emoji: "🧭", requiredStars: 10 },
  { key: "streak-3", label: "Three in a Row", description: "Play three days in a row", emoji: "🔥", requiredStars: 6 },
  { key: "bookworm", label: "Bookworm", description: "Finish two stories", emoji: "🐛", requiredStars: 4 },
  { key: "artist", label: "Little Artist", description: "Save a drawing", emoji: "🎨", requiredStars: 3 },
  { key: "maestro", label: "Maestro", description: "Play a tune in the music studio", emoji: "🎹", requiredStars: 3 },
  { key: "champion", label: "Champion", description: "Collect 30 stars", emoji: "🏆", requiredStars: 30 },
  { key: "legend", label: "Legend", description: "Collect 60 stars", emoji: "👑", requiredStars: 60 },
];

export const JOURNEY: JourneyState = {
  studentId: "stu_aarav",
  stars: 12,
  level: 2,
  streakDays: 3,
  lastPlayedOn: dateKey(addDays(today(), -1)),
  unlockedBadges: ["first-star", "explorer", "bookworm"],
  completedGames: ["balloon-pop", "shape-drop", "animal-sounds"],
  finishedStories: ["st_star", "st_umbrella"],
  mascot: "kiki",
};
