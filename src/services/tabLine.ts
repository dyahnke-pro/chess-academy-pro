// tabLine — A TAB'S LINE AS MOVES, read the one way every built tab feature
// reads it (its replies, plan, traps and model game — `builtReplies`, and the
// plan computer `computedPlan`). A leaf (chess.js only) so a measure can read
// a tab's line without the page's engine-backed services.
import { Chess } from 'chess.js';
import type { OpeningRecord } from '../types';
import { MAIN_LINE_INDEX } from '../utils/wlppLadder';

/** The legal SANs of a PGN move string, move numbers dropped; stops at the
 *  first move that is not legal. Pure. */
export function sansOf(pgn: string | undefined): string[] {
  const out: string[] = [];
  const c = new Chess();
  for (const tok of (pgn ?? '').trim().split(/\s+/)) {
    if (!tok || /^\d+\.+$/.test(tok)) continue;
    const san = tok.replace(/^\d+\.+/, '');
    try { out.push(c.move(san).san); } catch { break; }
  }
  return out;
}

/** The ply a line first leaves `other`. Pure. */
export function branchPly(line: readonly string[], other: readonly string[]): number {
  let i = 0;
  while (i < line.length && i < other.length && line[i] === other[i]) i += 1;
  return i;
}

/** The moves of one tab (`lineIndex`, MAIN_LINE_INDEX for the main line). */
export function tabLineSans(opening: Pick<OpeningRecord, 'pgn' | 'variations'>, lineIndex: number): string[] {
  return sansOf(lineIndex === MAIN_LINE_INDEX ? opening.pgn : opening.variations?.[lineIndex]?.pgn);
}
