import type { PlayerId } from "./segmentManager";

export type JunkState = Record<PlayerId, Set<number>>;

const junkState: JunkState = {
  p1: new Set(),
  p2: new Set(),
};

/** Scramble a word into junk characters */
export function scrambleWord(word: string): string {
  if (word.length === 0) return "";

  const junkChars = `0123456789-/:;()$&@".,?!'`;

  let result = "";
  for (let i = 0; i < word.length; i++) {
    const randomIndex = Math.floor(Math.random() * junkChars.length);
    result += junkChars[randomIndex];
  }
  return result;
}

/** Add a junk word index for a player */
export function addJunkWord(playerId: PlayerId, wordIndex: number): void {
  junkState[playerId].add(wordIndex);
}

/** Gets all junk word indices for a player */
export function getJunkWordIndices(playerId: PlayerId): Set<number> {
  return junkState[playerId];
}

/** Clear junk words for a player (typically when loading next segment) */
export function clearJunk(playerId: PlayerId): void {
  junkState[playerId].clear();
}
