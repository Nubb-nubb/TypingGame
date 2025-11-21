export const MAX_PLAYER_HEARTS = 5;

export type GameState = {
  playerHearts: number;
  segmentsCompleted: number;
  totalJunkSent: number;
  totalCorrectCharacters: number;
};

export const gameState: GameState = {
  playerHearts: MAX_PLAYER_HEARTS,
  segmentsCompleted: 0,
  totalJunkSent: 0,
  totalCorrectCharacters: 0,
};

export function resetGameStateValues(): void {
  gameState.playerHearts = MAX_PLAYER_HEARTS;
  gameState.segmentsCompleted = 0;
  gameState.totalJunkSent = 0;
  gameState.totalCorrectCharacters = 0;
}

export function computeWordsPerMinute(
  elapsedSeconds: number,
  totalCorrectCharacters: number
): number {
  const wordsTyped = totalCorrectCharacters / 5;
  if (elapsedSeconds <= 0) return 0;
  return Math.round((wordsTyped * 60) / elapsedSeconds);
}
