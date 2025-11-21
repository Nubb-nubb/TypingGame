// src/ui/renderSegment.ts
import type { PlayerId } from "../game/segmentManager";
import { getJunkWordIndices, scrambleWord } from "../game/junkEngine";

type WordBoundary = { start: number; end: number };

type RendererState = {
  words: string[];
  boundaries: WordBoundary[];
  // cache for stable junk words (per word index)
  junkWordOverrides: Record<number, string>;
};

const rendererStateByPlayer: Record<PlayerId, RendererState> = {
  p1: { words: [], boundaries: [], junkWordOverrides: {} },
  p2: { words: [], boundaries: [], junkWordOverrides: {} },
};

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

  rendererStateByPlayer[playerId] = {
    words,
    boundaries,
    junkWordOverrides: {},
  };
}

// Render a segment for a specific player into a target element
export function renderSegmentWords(
  playerId: PlayerId,
  currentIndex: number,
  typedText: string,
  targetElement: HTMLElement
): void {
  const state = rendererStateByPlayer[playerId];
  const segmentWords = getEffectiveWords(playerId);

  const wordBoundaries = state.boundaries;

  const htmlParts: string[] = [];
  let globalCharIndex = 0;

  const junkIndices = getJunkWordIndices(playerId);
  const junkOverrides = state.junkWordOverrides;

  for (let i = 0; i < segmentWords.length; i++) {
    const baseWord: string = segmentWords[i] ?? "";
    if (!baseWord) continue;

    let word = baseWord;

    const isJunk = junkIndices.has(i);
    if (isJunk) {
      const existingOverride = junkOverrides[i];
      if (existingOverride) {
        word = existingOverride;
      } else {
        const scrambled = scrambleWord(baseWord);
        junkOverrides[i] = scrambled;
        word = scrambled;
      }
    }

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

//start: return the *effective* text (original + junk) used for correctness checks
export function getEffectiveSegmentText(playerId: PlayerId): string {
  const state = rendererStateByPlayer[playerId];
  const { words, junkWordOverrides } = state;

  const resolvedWords = words.map((baseWord, index) => {
    const safeBase = baseWord ?? "";
    const override = junkWordOverrides[index];
    return override ?? safeBase;
  });

  return resolvedWords.join(" ");
}
export function getEffectiveWords(playerId: PlayerId): string[] {
  const state = rendererStateByPlayer[playerId];
  const { words, junkWordOverrides } = state;

  return words.map((word, index) => {
    const override = junkWordOverrides[index];
    return override ?? word ?? "";
  });
  
}
export function getWordIndexForChar(playerId: PlayerId, charIndex: number): number {
  const state = rendererStateByPlayer[playerId];
  const { boundaries } = state;

  if (boundaries.length === 0) return 0;
  if (charIndex < 0) return 0;

  for (let i = 0; i < boundaries.length; i++) {
    const bounds = boundaries[i];
    if (!bounds) continue;                     

    if (charIndex <= bounds.end) {
      return i;
    }
  }

  return boundaries.length - 1;             
}

