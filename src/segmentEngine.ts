// segmentEngine.ts

export type Segment = {
  id: string;
  text: string;
  difficulty: number; // 1–5+
  timeLimit: number; // seconds
  index: number; // segment number in match
};

const basePoolEasy = [
  "Stay positive.",
  "Let us begin.",
  "No rest for the weary.",
  "Let's light it up.",
  "Time to make an impact.",
  "We will rise again.",
  "No more cages.",
];

const basePoolMedium = [
  "The darker the night, the brighter the stars.",
  "We will not falter, we will not fail.",
  "All the world on one arrow.",
  "The balance of power must be preserved.",
  "Fortune doesn't favor fools.",
  "Trust nothing but your strength.",
  "By my will, this shall be finished.",
  "They are nothing before me.",
  "Victory is in my grasp.",
  "The horizon calls, and I must follow.",
  "The stars are not our destination, but our guide.",
  "Every second matters, every move counts.",
];

const basePoolHard = [
  "Those who soar among the clouds must never forget the ground beneath them.",
  "The difference between a butcher and a surgeon is only the patience of their cuts.",
  "Some stories are written in ink, others in blood and broken steel.",
  "Every mark, every scar, is just another line in the legend we are writing.",
  "When the world forgets your name, carve it again into stone, into steel, into the memory of those who stood against you.",
  "In the quiet between battles, when the cheering fades and the dust settles, that is when you decide who you truly are.",
  "The difference between hope and despair is often a single heartbeat, a single step, a single choice you refuse to run from.",
];

function choose(pool: string[]) {
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function generateSegment(segmentIndex: number): Segment {
  let difficulty = 1;

  if (segmentIndex >= 3 && segmentIndex < 6) difficulty = 2;
  if (segmentIndex >= 6 && segmentIndex < 9) difficulty = 3;
  if (segmentIndex >= 9 && segmentIndex < 12) difficulty = 4;
  if (segmentIndex >= 12) difficulty = 5;

  let baseText = "";

  if (difficulty === 1) baseText = choose(basePoolEasy);
  else if (difficulty === 2) baseText = choose(basePoolMedium);
  else baseText = choose(basePoolHard);

  const timeLimit = Math.max(10, 30 - segmentIndex * 1.5);

  return {
    id: crypto.randomUUID(),
    text: baseText,
    difficulty,
    timeLimit,
    index: segmentIndex,
  };
}

// Example driver:
export function* segmentStream() {
  let i = 0;
  while (true) {
    yield generateSegment(i++);
  }
}
