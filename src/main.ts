import "./style.css";
import { addJunkWord, clearJunk } from "./game/junkEngine";

import {
  getCurrentSegment,
  advanceToNextSegment,
  type PlayerId,
} from "./game/segmentManager";
import { timerState, startTimer, stopTimer, resetTimer } from "./game/timer";

import {
  prepareSegmentRendering,
  renderSegmentWords,
  //start
  getEffectiveSegmentText,
  getWordIndexForChar,
  //end
} from "./ui/renderSegment";

import { renderHearts } from "./ui/renderHearts";
import { renderStats } from "./ui/renderStats";
import { showGameOverOverlay, attachRestartHandler } from "./ui/renderGameOver";
import { MAX_PLAYER_HEARTS, type GameState } from "./game/gameState";

//PlayerContext to encapsulate per-player runtime state
type PlayerContext = {
  id: PlayerId;
  state: GameState;
  inputField: HTMLInputElement;
  heartsDisplay: HTMLSpanElement;
  statsDisplay: HTMLDivElement;
  segmentTargetElement: HTMLElement;
  getSegmentText: () => string;
  setSegmentText: (text: string) => void;
};

// per-player segment text
let currentSegmentP1 = getCurrentSegment("p1");
let currentSegmentP2 = getCurrentSegment("p2");

let segmentTextP1 = currentSegmentP1.text;
let segmentTextP2 = currentSegmentP2.text;

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
      gap: 300px;
      align-items: flex-start;
      justify-items: center;
      max-width: 1100px;  
      margin: 0 auto;
      padding: 20px 0;  
    "
  >
    <div
      style="
        width: 100%;
        background: #ffffff;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #e5e5e5;
        text-align: center;
        min-height: 300px;
      "
    >
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

    <div
      style="
        width: 100%;
        background: #ffffff;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #e5e5e5;
        text-align: center;
        min-height: 300px;
      "
    >
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

const segmentTargetElementP1 = document.querySelector<HTMLElement>(
  "#segment-target-text-p1"
)!;
const segmentTargetElementP2 = document.querySelector<HTMLElement>(
  "#segment-target-text-p2"
)!;

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

//construct per-player contexts
const player1Context: PlayerContext = {
  id: "p1",
  state: player1State,
  inputField: inputFieldP1,
  heartsDisplay: heartsDisplayP1,
  statsDisplay: statsDisplayP1,
  segmentTargetElement: segmentTargetElementP1,
  getSegmentText: () => segmentTextP1,
  setSegmentText: (text: string) => {
    segmentTextP1 = text;
  },
};

const player2Context: PlayerContext = {
  id: "p2",
  state: player2State,
  inputField: inputFieldP2,
  heartsDisplay: heartsDisplayP2,
  statsDisplay: statsDisplayP2,
  segmentTargetElement: segmentTargetElementP2,
  getSegmentText: () => segmentTextP2,
  setSegmentText: (text: string) => {
    segmentTextP2 = text;
  },
};

// inputs enabled by default; timer starts on first keypress
inputFieldP1.disabled = false;
inputFieldP2.disabled = false;

// initial UI render
renderHearts(heartsDisplayP1, player1State.playerHearts, "Player 1");
renderHearts(heartsDisplayP2, player2State.playerHearts, "Player 2");
renderStats(statsDisplayP1, player1State, timerState.elapsedSeconds);
renderStats(statsDisplayP2, player2State, timerState.elapsedSeconds);

// prepare rendering separately for each player
prepareSegmentRendering("p1", segmentTextP1);
prepareSegmentRendering("p2", segmentTextP2);
renderSegmentWords("p1", 0, "", segmentTargetElementP1);
renderSegmentWords("p2", 0, "", segmentTargetElementP2);

// Timer UI
timerDisplay.textContent = `Time: ${timerState.elapsedSeconds}s`;

//timer bootstrap helper
function ensureTimerStarted(typedText: string): void {
  if (!timerState.hasStarted && typedText.length > 0) {
    startTimer((elapsedSeconds) => {
      timerDisplay.textContent = `Time: ${elapsedSeconds}s`;
      renderStats(statsDisplayP1, player1State, elapsedSeconds);
      renderStats(statsDisplayP2, player2State, elapsedSeconds);
    });
  }
}

//generic per-player helpers

function updateHeartsForPlayer(player: PlayerContext): void {
  const label = player.id === "p1" ? "Player 1" : "Player 2";
  renderHearts(player.heartsDisplay, player.state.playerHearts, label);
}

function updateStatsForPlayer(player: PlayerContext): void {
  renderStats(player.statsDisplay, player.state, timerState.elapsedSeconds);
}

function loadNextSegmentFor(player: PlayerContext): void {
  clearJunk(player.id);
  const nextSegment = advanceToNextSegment(player.id);
  player.setSegmentText(nextSegment.text);

  player.segmentTargetElement.textContent = player.getSegmentText();

  prepareSegmentRendering(player.id, player.getSegmentText());
  renderSegmentWords(player.id, 0, "", player.segmentTargetElement);

  player.inputField.value = "";
  player.inputField.disabled = false;
  player.inputField.focus();
}

function handleIncorrectCharacter(player: PlayerContext): void {
  player.inputField.value = player.inputField.value.slice(0, -1);

  player.state.playerHearts--;
  updateHeartsForPlayer(player);

  if (player.state.playerHearts <= 0) {
    handlePlayerDefeat(player);
  }
}

function completeCurrentSegment(player: PlayerContext): void {
  const segmentText = player.getSegmentText();
  const targetId: PlayerId = player.id === "p1" ? "p2" : "p1";
  const targetContext = targetId === "p1" ? player1Context : player2Context;

  // opponent's current char index in their segment
  const opponentTypedLength = targetContext.inputField.value.length;
  const opponentCurrentIndex = opponentTypedLength - 1;

  // which word are they on now?
  const currentWordIndex = getWordIndexForChar(targetId, opponentCurrentIndex);

  const targetSegment = getCurrentSegment(targetId);
  const totalWords = targetSegment.text.split(" ").length;

  // next word index (clamped to last word if needed)
  let junkWordIndex = currentWordIndex + 1;
  if (junkWordIndex >= totalWords) {
    junkWordIndex = totalWords - 1;
  }

  addJunkWord(targetId, junkWordIndex);
  player.state.segmentsCompleted++;
  player.state.totalJunkSent++;
  player.state.totalCorrectCharacters += segmentText.length;
  updateStatsForPlayer(player);

  // later: send junk to the opposing player based on player.id
  loadNextSegmentFor(player);
}

function setupPlayerInput(player: PlayerContext): void {
  player.inputField.addEventListener("input", () => {
    const typedText = player.inputField.value;
    const currentIndex = typedText.length - 1;

    ensureTimerStarted(typedText);

    if (currentIndex < 0) {
      renderSegmentWords(player.id, 0, typedText, player.segmentTargetElement);
      return;
    }

    //start: update word + character highlighting on every keystroke
    renderSegmentWords(
      player.id,
      currentIndex,
      typedText,
      player.segmentTargetElement
    );
    //end

    const segmentText = getEffectiveSegmentText(player.id);
    const expectedCharacter = segmentText[currentIndex];
    const actualCharacter = typedText[currentIndex];

    if (actualCharacter !== expectedCharacter) {
      handleIncorrectCharacter(player);
      return;
    }

    if (typedText === segmentText) {
      completeCurrentSegment(player);
    }
  });
}


//game over + restart helpers

function handlePlayerDefeat(loser: PlayerContext): void {
  stopTimer();
  inputFieldP1.disabled = true;
  inputFieldP2.disabled = true;

  const winnerLabel = loser.id === "p1" ? "Player 2" : "Player 1";

  gameOverTitle.textContent = `${winnerLabel} wins`;

  showGameOverOverlay(
    gameOverOverlay,
    gameOverStats,
    loser.state,
    timerState.elapsedSeconds
  );
}

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

  updateHeartsForPlayer(player1Context);
  updateHeartsForPlayer(player2Context);
  updateStatsForPlayer(player1Context);
  updateStatsForPlayer(player2Context);
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

// wire handlers
setupPlayerInput(player1Context);
setupPlayerInput(player2Context);
attachRestartHandler(restartButton, resetGame);
