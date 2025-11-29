import "./style.css";
import { addJunkWord, clearJunk, getJunkWordIndices } from "./game/junkEngine";

import {
  getCurrentSegment,
  advanceToNextSegment,
  type PlayerId,
  resetSegments,
} from "./game/segmentManager";
import { timerState, startTimer, stopTimer, resetTimer } from "./game/timer";

import {
  prepareSegmentRendering,
  renderSegmentWords,
  //start
  getEffectiveSegmentText,
  //end
} from "./ui/renderSegment";

import { renderHearts } from "./ui/renderHearts";
import { renderStats } from "./ui/renderStats";
import { showGameOverOverlay, attachRestartHandler } from "./ui/renderGameOver";
import { MAX_PLAYER_HEARTS, type GameState } from "./game/gameState";

//start local/remote player selection
const url = new URL(window.location.href);
const localPlayerParam = url.searchParams.get("player");

// Default to p1 if not specified
const localPlayerId: PlayerId = localPlayerParam === "p2" ? "p2" : "p1";
//end local/remote player selection

// *comment*start: shared timer ownership (whoever types first on this tab becomes the timer owner)
let timerOwnerId: PlayerId | null = null;
// *comment*end

//start websocket client setup
const socket = new WebSocket("ws://localhost:8080");

socket.addEventListener("open", () => {
  console.log("Connected to WebSocket server as", localPlayerId);
});

socket.addEventListener("message", (event) => {
  try {
    const msg = JSON.parse(event.data as string);

    //start handle SEND_JUNK messages
    if (msg.type === "SEND_JUNK") {
      const attackerId: PlayerId = msg.from;
      const defenderId: PlayerId = attackerId === "p1" ? "p2" : "p1";

      const attackerContext =
        attackerId === "p1" ? player1Context : player2Context;
      const defenderContext =
        defenderId === "p1" ? player1Context : player2Context;

      sendJunkToOpponent(attackerContext, defenderContext);
    }
    //end handle SEND_JUNK messages

    // *comment*start: handle remote typing updates
    if (msg.type === "INPUT_UPDATE") {
      const playerId: PlayerId = msg.playerId;
      const typedText: string = msg.typedText;

      // Ignore our own echo messages; only apply remote player's typing
      if (playerId !== localPlayerId) {
        const ctx = playerId === "p1" ? player1Context : player2Context;

        ctx.inputField.value = typedText;

        const currentIndex = typedText.length - 1;
        renderSegmentWords(
          ctx.id,
          currentIndex < 0 ? 0 : currentIndex,
          typedText,
          ctx.segmentTargetElement
        );
      }
    }
    // *comment*end

    // *comment*start: apply shared timer ticks from the timer owner
    if (msg.type === "TIMER_TICK") {
      timerOwnerId = msg.ownerId as PlayerId;
      const elapsed: number = msg.elapsedSeconds;

      timerDisplay.textContent = `Time: ${elapsed}s`;
      renderStats(statsDisplayP1, player1State, elapsed);
      renderStats(statsDisplayP2, player2State, elapsed);
    }
    // *comment*end

    // *comment*start: sync hearts and stats from the other client
    if (msg.type === "STATE_SYNC") {
      const newP1 = msg.p1State as GameState;
      const newP2 = msg.p2State as GameState;

      Object.assign(player1State, newP1);
      Object.assign(player2State, newP2);

      updateHeartsForPlayer(player1Context);
      updateHeartsForPlayer(player2Context);
      updateStatsForPlayer(player1Context);
      updateStatsForPlayer(player2Context);
    }
    // *comment*end
  } catch (err) {
    console.error("Failed to parse WS message", err, event.data);
  }
});

socket.addEventListener("close", () => {
  console.log("WebSocket connection closed");
});

socket.addEventListener("error", (err) => {
  console.error("WebSocket error", err);
});
//end websocket client setup

// PlayerContext: encapsulates per-player runtime state
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

// Per-player segment text
let currentSegmentP1 = getCurrentSegment("p1");
let currentSegmentP2 = getCurrentSegment("p2");

let segmentTextP1 = currentSegmentP1.text;
let segmentTextP2 = currentSegmentP2.text;

// Per-player game state
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

      <!-- start: send junk button for Player 1 -->
      <button
        id="send-junk-p1"
        type="button"
        style="margin-top: 8px; padding: 6px 12px; font-size: 12px;"
      >
        Send junk
      </button>
      <!-- end -->
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

      <!-- start: send junk button for Player 2 -->
      <button
        id="send-junk-p2"
        type="button"
        style="margin-top: 8px; padding: 6px 12px; font-size: 12px;"
      >
        Send junk
      </button>
      <!-- end -->
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

//start: cache send-junk buttons
const sendJunkButtonP1 =
  document.querySelector<HTMLButtonElement>("#send-junk-p1")!;
const sendJunkButtonP2 =
  document.querySelector<HTMLButtonElement>("#send-junk-p2")!;
//end

// Per-player contexts
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

const localContext =
  localPlayerId === "p1" ? player1Context : player2Context;
const remoteContext =
  localPlayerId === "p1" ? player2Context : player1Context;

// Inputs: only local player can type
inputFieldP1.disabled = localPlayerId !== "p1";
inputFieldP2.disabled = localPlayerId !== "p2";

// Initial UI render
renderHearts(heartsDisplayP1, player1State.playerHearts, "Player 1");
renderHearts(heartsDisplayP2, player2State.playerHearts, "Player 2");
renderStats(statsDisplayP1, player1State, timerState.elapsedSeconds);
renderStats(statsDisplayP2, player2State, timerState.elapsedSeconds);

// Prepare rendering separately for each player
prepareSegmentRendering("p1", segmentTextP1);
prepareSegmentRendering("p2", segmentTextP2);
renderSegmentWords("p1", 0, "", segmentTargetElementP1);
renderSegmentWords("p2", 0, "", segmentTargetElementP2);

// Timer UI
timerDisplay.textContent = `Time: ${timerState.elapsedSeconds}s`;

// *comment*start: helper to broadcast hearts + stats to the other tab
function broadcastState(): void {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(
    JSON.stringify({
      type: "STATE_SYNC",
      from: localPlayerId,
      p1State: player1State,
      p2State: player2State,
    })
  );
}
// *comment*end

// Timer bootstrap helper
function ensureTimerStarted(typedText: string): void {
  if (typedText.length === 0) return;

  // *comment*start: on this tab, first non-empty input makes this player the timer owner
  if (!timerOwnerId) {
    timerOwnerId = localPlayerId;
  }
  // If this tab is not the timer owner, don't start a local timer loop
  if (timerOwnerId !== localPlayerId) {
    return;
  }
  // *comment*end

  if (!timerState.hasStarted) {
    startTimer((elapsedSeconds) => {
      // Local UI update
      timerDisplay.textContent = `Time: ${elapsedSeconds}s`;
      renderStats(statsDisplayP1, player1State, elapsedSeconds);
      renderStats(statsDisplayP2, player2State, elapsedSeconds);

      // *comment*start: broadcast timer ticks so the other tab stays in sync
      if (socket.readyState === WebSocket.OPEN && timerOwnerId) {
        socket.send(
          JSON.stringify({
            type: "TIMER_TICK",
            ownerId: timerOwnerId,
            elapsedSeconds,
          })
        );
      }
      // *comment*end
    });
  }
}

// Per-player helpers

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
  player.inputField.disabled = player.id !== localPlayerId;
  if (player.id === localPlayerId) {
    player.inputField.focus();
  }
}

function handleIncorrectCharacter(player: PlayerContext): void {
  player.inputField.value = player.inputField.value.slice(0, -1);

  player.state.playerHearts--;
  updateHeartsForPlayer(player);

  // *comment*start: sync hearts after a typo
  broadcastState();
  // *comment*end

  if (player.state.playerHearts <= 0) {
    handlePlayerDefeat(player);
  }
}

//start: segment completion only updates stats and loads the next segment
function completeCurrentSegment(player: PlayerContext): void {
  const segmentText = player.getSegmentText();

  player.state.segmentsCompleted++;
  player.state.totalCorrectCharacters += segmentText.length;
  updateStatsForPlayer(player);

  // *comment*start: sync stats on segment completion
  broadcastState();
  // *comment*end

  loadNextSegmentFor(player);
}
//end

//start: send junk helper (button-driven)
function sendJunkToOpponent(
  attacker: PlayerContext,
  defender: PlayerContext
): void {
  const defenderSegmentText = defender.getSegmentText();
  const totalWords = defenderSegmentText
    .split(" ")
    .filter((word) => word.length > 0).length;

  if (totalWords === 0) {
    return;
  }

  const currentJunkIndices = getJunkWordIndices(defender.id);

  // All words already junked → nothing more to do
  if (currentJunkIndices.size >= totalWords) {
    return;
  }

  // Pick the first non-junk word index
  let targetWordIndex = 0;
  while (
    currentJunkIndices.has(targetWordIndex) &&
    targetWordIndex < totalWords
  ) {
    targetWordIndex++;
  }

  if (targetWordIndex >= totalWords) {
    return;
  }

  addJunkWord(defender.id, targetWordIndex);

  attacker.state.totalJunkSent++;
  updateStatsForPlayer(attacker);

  const defenderTypedText = defender.inputField.value;
  const defenderCurrentIndex = defenderTypedText.length - 1;

  renderSegmentWords(
    defender.id,
    defenderCurrentIndex < 0 ? 0 : defenderCurrentIndex,
    defenderTypedText,
    defender.segmentTargetElement
  );

  // *comment*start: sync stats after sending junk
  broadcastState();
  // *comment*end
}
//end

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

    // *comment*start: broadcast local typing over WebSocket
    if (player.id === localPlayerId && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "INPUT_UPDATE",
          playerId: player.id,
          typedText,
        })
      );
    }
    // *comment*end

    if (typedText === segmentText) {
      completeCurrentSegment(player);
    }
  });
}

// Game over + restart helpers

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

  // Reset both players' segment streams back to the start (easy pool),
  // and clear any leftover junk state.
  resetSegments();
  clearJunk("p1");
  clearJunk("p2");

  resetTimer();

  updateHeartsForPlayer(player1Context);
  updateHeartsForPlayer(player2Context);
  updateStatsForPlayer(player1Context);
  updateStatsForPlayer(player2Context);
  timerDisplay.textContent = `Time: ${timerState.elapsedSeconds}s`;

  currentSegmentP1 = getCurrentSegment("p1");
  currentSegmentP2 = getCurrentSegment("p2");
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
  inputFieldP1.disabled = localPlayerId !== "p1";
  inputFieldP2.disabled = localPlayerId !== "p2";

  if (localPlayerId === "p1") {
    inputFieldP1.focus();
  } else {
    inputFieldP2.focus();
  }

  gameOverOverlay.style.display = "none";

  // *comment*start: reset shared timer owner and sync state after restart
  timerOwnerId = null;
  broadcastState();
  // *comment*end
}

// Wire handlers

// Only wire input for the local player
setupPlayerInput(localContext);
attachRestartHandler(restartButton, resetGame);

//start: wire send-junk buttons via WebSocket
if (localPlayerId === "p1") {
  sendJunkButtonP1.disabled = false;
  sendJunkButtonP2.disabled = true;
  sendJunkButtonP2.style.opacity = "0.4";
  sendJunkButtonP2.style.pointerEvents = "none";

  sendJunkButtonP1.addEventListener("click", () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "SEND_JUNK",
          from: "p1" as PlayerId,
        })
      );
    }
  });
} else {
  sendJunkButtonP1.disabled = true;
  sendJunkButtonP1.style.opacity = "0.4";
  sendJunkButtonP1.style.pointerEvents = "none";
  sendJunkButtonP2.disabled = false;

  sendJunkButtonP2.addEventListener("click", () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "SEND_JUNK",
          from: "p2" as PlayerId,
        })
      );
    }
  });
}
//end
