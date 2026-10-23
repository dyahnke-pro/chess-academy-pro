import { useId } from 'react';

/**
 * ONE DOM ID PER BOARD (David's iPhone, 2026-10-23: the Campaign's K+Q try
 * board would not take a move). react-chessboard finds the square a touch
 * ended on with `document.getElementById(`${id}-square-${sq}`)`, and its `id`
 * defaults to `chessboard` — so with two boards on screen (a briefing sheet
 * over the game board) a tap on the second board was measured against the
 * FIRST board's square, never landed, and the click fallback is suppressed on
 * touch. Every board mount passes this id (`oneBoardDomId.gate.test.ts`).
 */
export function useBoardDomId(): string {
  return `board-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}
