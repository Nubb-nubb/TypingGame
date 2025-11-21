import type { GameState } from "../game/gameState";
import { computeWordsPerMinute } from "../game/gameState";

export function renderStats(
  statsElement: HTMLElement,
  state: GameState,
  elapsedSeconds: number
): void {
  const wordsPerMinute = computeWordsPerMinute(
    elapsedSeconds,
    state.totalCorrectCharacters
  );

  statsElement.textContent = `Segments: ${state.segmentsCompleted} | Junk sent: ${state.totalJunkSent} | Correct chars: ${state.totalCorrectCharacters} | WPM: ${wordsPerMinute}`;
}
