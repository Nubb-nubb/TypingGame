import type { GameState } from "../game/gameState";
import { computeWordsPerMinute } from "../game/gameState";

export function showGameOverOverlay(
  overlayElement: HTMLDivElement,
  statsElement: HTMLParagraphElement,
  state: GameState,
  elapsedSeconds: number
): void {
  const wordsPerMinute = computeWordsPerMinute(
    elapsedSeconds,
    state.totalCorrectCharacters
  );

  statsElement.textContent = `Segments: ${state.segmentsCompleted} | Time: ${elapsedSeconds}s | WPM: ${wordsPerMinute}`;
  overlayElement.style.display = "flex";
}

export function attachRestartHandler(
  restartButton: HTMLButtonElement,
  onRestart: () => void
): void {
  restartButton.addEventListener("click", () => {
    onRestart();
  });
}
