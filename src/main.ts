import "./style.css";

import {
  getCurrentSegment,
  advanceToNextSegment,
  type PlayerId,
} from "./game/segmentManager";
import { timerState, startTimer, stopTimer, resetTimer } from "./game/timer";

import {
  prepareSegmentRendering,
  renderSegmentWords,
} from "./ui/renderSegment";
import { renderHearts } from "./ui/renderHearts";
import { renderStats } from "./ui/renderStats";
import {
  showGameOverOverlay,
  attachRestartHandler,
} from "./ui/renderGameOver";
import {
  MAX_PLAYER_HEARTS,
  type GameState,
} from "./game/gameState";

//start: per-player segment text
let currentSegmentP1 = getCurrentSegment("p1");
let currentSegmentP2 = getCurrentSegment("p2");

let segmentTextP1 = currentSegmentP1.text;
let segmentTextP2 = currentSegmentP2.text;
//end

// per-player game state
const player1State: GameState = {
  playerHearts: MAX_PLAYER_HEARTS,
  segmentsCompleted: 0,
  totalJunkSent: 0,
  totalCorrectCharacters: 0,
};

const player2State: GameState = {
  playerHearts: MAX_PLAYER_HEARTS,
  segmentsCompleted: 0,
  totalJunkSent: 0,
  totalCorrectCharacters: 0,
};

// DOM
const appElement = document.querySelector<HTMLDivElement>("#app")!;
appElement.innerHTML = `
  <div id="game-status" style="margin: 12px 0; text-align: center;">
    <span id="timer-display"></span>
  </div>

  <div
    id="players-grid"
    style="
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: flex-start;
      justify-items: center;
      max-width: 900px;
      margin: 0 auto;
    "
  >
    <div style="text-align: center; width: 100%;">
      <span id="hearts-display-p1"></span>
      <div id="stats-display-p1" style="font-size: 14px; margin-top: 4px;"></div>

      <h2 id="segment-target-text-p1" style="margin-top: 24px;">${segmentTextP1}</h2>

      <input
        id="player-input-p1"
        type="text"
        autocomplete="off"
        spellcheck="false"
        style="width: 80%; padding: 8px; border-radius: 8px; font-size: 12px; margin-top: 12px;"
        placeholder="Player 1: Start typing here..."
      />
    </div>

    <div style="text-align: center; width: 100%;">
      <span id="hearts-display-p2"></span>
      <div id="stats-display-p2" style="font-size: 14px; margin-top: 4px;"></div>

      <h2 id="segment-target-text-p2" style="margin-top: 24px;">${segmentTextP2}</h2>

      <input
        id="player-input-p2"
        type="text"
        autocomplete="off"
        spellcheck="false"
        style="width: 80%; padding: 8px; border-radius: 8px; font-size: 12px; margin-top: 12px;"
        placeholder="Player 2: Start typing here..."
      />
    </div>
  </div>

  <div id="game-over-overlay">
    <div id="game-over-content">
      <h3 id="game-over-title">Game Over</h3>
      <p id="game-over-stats"></p>
      <button id="restart-button">Restart</button>
    </div>
  </div>
`;

// Cache DOM elements
const timerDisplay = document.querySelector<HTMLSpanElement>("#timer-display")!;

const heartsDisplayP1 =
  document.querySelector<HTMLSpanElement>("#hearts-display-p1")!;
const heartsDisplayP2 =
  document.querySelector<HTMLSpanElement>("#hearts-display-p2")!;

const statsDisplayP1 =
  document.querySelector<HTMLDivElement>("#stats-display-p1")!;
const statsDisplayP2 =
  document.querySelector<HTMLDivElement>("#stats-display-p2")!;

const segmentTargetElementP1 =
  document.querySelector<HTMLElement>("#segment-target-text-p1")!;
const segmentTargetElementP2 =
  document.querySelector<HTMLElement>("#segment-target-text-p2")!;

const inputFieldP1 =
  document.querySelector<HTMLInputElement>("#player-input-p1")!;
const inputFieldP2 =
  document.querySelector<HTMLInputElement>("#player-input-p2")!;

const gameOverOverlay =
  document.querySelector<HTMLDivElement>("#game-over-overlay")!;
const gameOverStats =
  document.querySelector<HTMLParagraphElement>("#game-over-stats")!;
const restartButton =
  document.querySelector<HTMLButtonElement>("#restart-button")!;
const gameOverTitle =
  document.querySelector<HTMLHeadingElement>("#game-over-title")!;

// inputs enabled by default; timer starts on first keypress
inputFieldP1.disabled = false;
inputFieldP2.disabled = false;

// initial UI render
renderHearts(heartsDisplayP1, player1State.playerHearts, "Player 1");
renderHearts(heartsDisplayP2, player2State.playerHearts, "Player 2");
renderStats(statsDisplayP1, player1State, timerState.elapsedSeconds);
renderStats(statsDisplayP2, player2State, timerState.elapsedSeconds);

//start: prepare rendering separately for each player
prepareSegmentRendering("p1", segmentTextP1);
prepareSegmentRendering("p2", segmentTextP2);
renderSegmentWords("p1", 0, "", segmentTargetElementP1);
renderSegmentWords("p2", 0, "", segmentTargetElementP2);
//end

// Timer UI
timerDisplay.textContent = `Time: ${timerState.elapsedSeconds}s`;

// start timer (once) and refresh both stats
function ensureTimerStarted(typedText: string): void {
  if (!timerState.hasStarted && typedText.length > 0) {
    startTimer((elapsedSeconds) => {
      timerDisplay.textContent = `Time: ${elapsedSeconds}s`;
      renderStats(statsDisplayP1, player1State, elapsedSeconds);
      renderStats(statsDisplayP2, player2State, elapsedSeconds);
    });
  }
}

// Input logic - Player 1
inputFieldP1.addEventListener("input", () => {
  const typedText = inputFieldP1.value;
  const currentIndex = typedText.length - 1;

  ensureTimerStarted(typedText);

  if (currentIndex < 0) {
    renderSegmentWords("p1", 0, typedText, segmentTargetElementP1);
    return;
  }

  const expectedCharacter = segmentTextP1[currentIndex];
  const actualCharacter = typedText[currentIndex];

  renderSegmentWords("p1", currentIndex, typedText, segmentTargetElementP1);

  if (actualCharacter !== expectedCharacter) {
    handleIncorrectCharacter("p1");
    return;
  }

  if (typedText === segmentTextP1) {
    completeCurrentSegment("p1");
  }
});

// Input logic - Player 2
inputFieldP2.addEventListener("input", () => {
  const typedText = inputFieldP2.value;
  const currentIndex = typedText.length - 1;

  ensureTimerStarted(typedText);

  if (currentIndex < 0) {
    renderSegmentWords("p2", 0, typedText, segmentTargetElementP2);
    return;
  }

  const expectedCharacter = segmentTextP2[currentIndex];
  const actualCharacter = typedText[currentIndex];

  renderSegmentWords("p2", currentIndex, typedText, segmentTargetElementP2);

  if (actualCharacter !== expectedCharacter) {
    handleIncorrectCharacter("p2");
    return;
  }

  if (typedText === segmentTextP2) {
    completeCurrentSegment("p2");
  }
});

// Incorrect character handler
function handleIncorrectCharacter(player: PlayerId): void {
  if (player === "p1") {
    inputFieldP1.value = inputFieldP1.value.slice(0, -1);
    player1State.playerHearts--;
    renderHearts(heartsDisplayP1, player1State.playerHearts, "Player 1");
    if (player1State.playerHearts <= 0) {
      handlePlayerDefeat("Player 1", player1State);
    }
  } else {
    inputFieldP2.value = inputFieldP2.value.slice(0, -1);
    player2State.playerHearts--;
    renderHearts(heartsDisplayP2, player2State.playerHearts, "Player 2");
    if (player2State.playerHearts <= 0) {
      handlePlayerDefeat("Player 2", player2State);
    }
  }
}

// Player defeat / game over
// Player defeat / game over
function handlePlayerDefeat(loserLabel: string, loserState: GameState): void {
  stopTimer();
  inputFieldP1.disabled = true;
  inputFieldP2.disabled = true;

  const winnerLabel = loserLabel === "Player 1" ? "Player 2" : "Player 1";
  gameOverTitle.textContent = `${winnerLabel} wins`;

  showGameOverOverlay(
    gameOverOverlay,
    gameOverStats,
    loserState,
    timerState.elapsedSeconds
  );
}


// Load next segment for a specific player
function loadNextSegmentFor(player: PlayerId): void {
  if (player === "p1") {
    currentSegmentP1 = advanceToNextSegment("p1");
    segmentTextP1 = currentSegmentP1.text;

    segmentTargetElementP1.textContent = segmentTextP1;

    prepareSegmentRendering("p1", segmentTextP1);
    renderSegmentWords("p1", 0, "", segmentTargetElementP1);

    inputFieldP1.value = "";
    inputFieldP1.disabled = false;
    inputFieldP1.focus();
  } else {
    currentSegmentP2 = advanceToNextSegment("p2");
    segmentTextP2 = currentSegmentP2.text;

    segmentTargetElementP2.textContent = segmentTextP2;

    prepareSegmentRendering("p2", segmentTextP2);
    renderSegmentWords("p2", 0, "", segmentTargetElementP2);

    inputFieldP2.value = "";
    inputFieldP2.disabled = false;
    inputFieldP2.focus();
  }
}

// Segment completed
function completeCurrentSegment(winner: PlayerId): void {
  if (winner === "p1") {
    player1State.segmentsCompleted++;
    player1State.totalJunkSent++;
    player1State.totalCorrectCharacters += segmentTextP1.length;
    renderStats(statsDisplayP1, player1State, timerState.elapsedSeconds);
  } else {
    player2State.segmentsCompleted++;
    player2State.totalJunkSent++;
    player2State.totalCorrectCharacters += segmentTextP2.length;
    renderStats(statsDisplayP2, player2State, timerState.elapsedSeconds);
  }

  // later: send junk to the other player based on winner
  loadNextSegmentFor(winner);
}

// Reset everything on restart
function resetGame(): void {
  player1State.playerHearts = MAX_PLAYER_HEARTS;
  player1State.segmentsCompleted = 0;
  player1State.totalJunkSent = 0;
  player1State.totalCorrectCharacters = 0;

  player2State.playerHearts = MAX_PLAYER_HEARTS;
  player2State.segmentsCompleted = 0;
  player2State.totalJunkSent = 0;
  player2State.totalCorrectCharacters = 0;

  resetTimer();

  renderHearts(heartsDisplayP1, player1State.playerHearts, "Player 1");
  renderHearts(heartsDisplayP2, player2State.playerHearts, "Player 2");
  renderStats(statsDisplayP1, player1State, timerState.elapsedSeconds);
  renderStats(statsDisplayP2, player2State, timerState.elapsedSeconds);
  timerDisplay.textContent = `Time: ${timerState.elapsedSeconds}s`;

  currentSegmentP1 = advanceToNextSegment("p1");
  currentSegmentP2 = advanceToNextSegment("p2");
  segmentTextP1 = currentSegmentP1.text;
  segmentTextP2 = currentSegmentP2.text;

  segmentTargetElementP1.textContent = segmentTextP1;
  segmentTargetElementP2.textContent = segmentTextP2;

  prepareSegmentRendering("p1", segmentTextP1);
  prepareSegmentRendering("p2", segmentTextP2);
  renderSegmentWords("p1", 0, "", segmentTargetElementP1);
  renderSegmentWords("p2", 0, "", segmentTargetElementP2);

  inputFieldP1.value = "";
  inputFieldP2.value = "";
  inputFieldP1.disabled = false;
  inputFieldP2.disabled = false;
  inputFieldP1.focus();
  gameOverOverlay.style.display = "none";
}

attachRestartHandler(restartButton, resetGame);
