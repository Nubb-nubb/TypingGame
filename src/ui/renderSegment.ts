// src/ui/renderSegment.ts
import type { PlayerId } from "../game/segmentManager";

type WordBoundary = { start: number; end: number };

type RendererState = {
  words: string[];
  boundaries: WordBoundary[];
};

//start: keep separate rendering state per player
const rendererStateByPlayer: Record<PlayerId, RendererState> = {
  p1: { words: [], boundaries: [] },
  p2: { words: [], boundaries: [] },
};
//end

// Split a segment into words and track character ranges for a specific player
export function prepareSegmentRendering(
  playerId: PlayerId,
  segmentText: string
): void {
  const words = segmentText.split(" ");
  const boundaries: WordBoundary[] = [];

  let position = 0;
  for (const word of words) {
    const start = position;
    const end = start + word.length - 1;
    boundaries.push({ start, end });

    // +1 for space after the word
    position = end + 2;
  }

  rendererStateByPlayer[playerId] = { words, boundaries };
}

// Render a segment for a specific player into a target element
export function renderSegmentWords(
  playerId: PlayerId,
  currentIndex: number,
  typedText: string,
  targetElement: HTMLElement
): void {
  const state = rendererStateByPlayer[playerId];
  const segmentWords = state.words;
  const wordBoundaries = state.boundaries;

  const htmlParts: string[] = [];
  let globalCharIndex = 0;

  for (let i = 0; i < segmentWords.length; i++) {
    const word = segmentWords[i];
    if (!word) continue;

    const bounds = wordBoundaries[i];

    let wordClassName = "word-pending";
    if (bounds) {
      if (currentIndex >= bounds.start && currentIndex <= bounds.end) {
        wordClassName = "word-current";
      } else if (currentIndex > bounds.end) {
        wordClassName = "word-done";
      }
    }

    const charSpans: string[] = [];
    for (let j = 0; j < word.length; j++) {
      const segmentCharacter = word[j];
      const typedCharacter = typedText[globalCharIndex] ?? null;

      let charClassName = "char";

      if (typedCharacter !== null) {
        if (typedCharacter === segmentCharacter) {
          charClassName += " char-correct";
        } else {
          charClassName += " char-wrong";
        }
      }

      charSpans.push(
        `<span class="${charClassName}">${segmentCharacter}</span>`
      );
      globalCharIndex++;
    }

    htmlParts.push(
      `<span class="${wordClassName}">${charSpans.join("")}</span>`
    );

    if (i < segmentWords.length - 1) {
      const typedSpace = typedText[globalCharIndex] ?? null;
      let spaceClassName = "char space";

      if (typedSpace !== null) {
        if (typedSpace === " ") {
          spaceClassName += " char-correct";
        } else {
          spaceClassName += " char-wrong";
        }
      }

      htmlParts.push(`<span class="${spaceClassName}"> </span>`);
      globalCharIndex++;
    }
  }

  targetElement.innerHTML = htmlParts.join(" ");
}
