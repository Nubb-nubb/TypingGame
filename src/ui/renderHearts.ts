import { MAX_PLAYER_HEARTS } from "../game/gameState";

export function renderHearts(
  heartsElement: HTMLElement,
  currentHearts: number,
  label = "Player 1"
): void {
  const heartsRemaining = "❤️".repeat(currentHearts);
  const heartsLost = "🖤".repeat(MAX_PLAYER_HEARTS - currentHearts);
  heartsElement.textContent = `${label}: ${heartsRemaining}${heartsLost}`;
}
