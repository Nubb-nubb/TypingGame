import { segmentStream, type Segment } from "../segmentEngine";

export type PlayerId = "p1" | "p2";

let streamP1 = segmentStream();
let streamP2 = segmentStream();

let currentSegmentP1: Segment = streamP1.next().value as Segment;
let currentSegmentP2: Segment = streamP2.next().value as Segment;

export function getCurrentSegment(playerId: PlayerId): Segment {
  return playerId === "p1" ? currentSegmentP1 : currentSegmentP2;
}

export function advanceToNextSegment(playerId: PlayerId): Segment {
  const stream = playerId === "p1" ? streamP1 : streamP2;
  const nextSegment = stream.next().value as Segment;

  if (playerId === "p1") {
    currentSegmentP1 = nextSegment;
  } else {
    currentSegmentP2 = nextSegment;
  }

  return nextSegment;
}

export function resetSegments(): void {
  streamP1 = segmentStream();
  streamP2 = segmentStream();

  currentSegmentP1 = streamP1.next().value as Segment;
  currentSegmentP2 = streamP2.next().value as Segment;
}

