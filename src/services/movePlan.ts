// movePlan — the §9 "missed PLAN, not just missed move" signal (David 2026-08-26:
// "why the whole idea was wrong, not just the square"). Compares the PLAN-CLASS
// of the move the student played against the engine's best move, and — only for
// the two clearest, board-true cases a beginner most needs — names the idea the
// position actually called for. G0/G3: the plan is read off the board with
// chess.js; the engine chose the move; this only phrases the contrast.
//
// Deliberately narrow. It fires ONLY when the best move is an unmistakable plan
// (castle the king, or strike the centre) and the played move is not that plan —
// so it never invents a vague "you should have had a better plan".
import { Chess } from 'chess.js';

export type PlanClass = 'castle' | 'center-break' | 'other';

const FILES = 'abcdefgh';
const CENTER_FILES = new Set([2, 3, 4, 5]); // c d e f

/** Is this UCI move a king castle? */
function isCastle(fen: string, uci: string): boolean {
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as never });
    return mv?.san === 'O-O' || mv?.san === 'O-O-O';
  } catch { return false; }
}

/** A central pawn break: a pawn move (to the c–f files) that makes capturing
 *  contact with an enemy pawn in the centre — it captures a central pawn, or it
 *  lands attacking one. This is the "strike the centre" idea, read off the board. */
function isCenterBreak(fen: string, uci: string): boolean {
  try {
    const c = new Chess(fen);
    const mover = c.get(uci.slice(0, 2) as Parameters<Chess['get']>[0]);
    if (!mover || mover.type !== 'p') return false;
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as never });
    if (!mv) return false;
    // (a) captured an enemy pawn in the centre.
    if (mv.captured === 'p') {
      const cf = FILES.indexOf(mv.to[0]);
      if (CENTER_FILES.has(cf)) return true;
    }
    // (b) the pawn now attacks an enemy pawn (creates central tension).
    const f = FILES.indexOf(mv.to[0]);
    const r = Number.parseInt(mv.to[1], 10) - 1;
    if (!CENTER_FILES.has(f)) return false;
    const dir = mover.color === 'w' ? 1 : -1;
    for (const df of [-1, 1]) {
      const nf = f + df; const nr = r + dir;
      if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
      const t = c.get(`${FILES[nf]}${nr + 1}` as Parameters<Chess['get']>[0]);
      if (t && t.type === 'p' && t.color !== mover.color) return true;
    }
    return false;
  } catch { return false; }
}

export function classifyPlan(fen: string, uci: string): PlanClass {
  if (isCastle(fen, uci)) return 'castle';
  if (isCenterBreak(fen, uci)) return 'center-break';
  return 'other';
}

function sanOf(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as never });
    return mv ? mv.san : null;
  } catch { return null; }
}

/**
 * A board-true "the idea was wrong" clause when the engine's plan and the played
 * move's plan clearly diverge, or '' when they don't (silence over a vague plan
 * claim). Only fires for the two high-confidence classes.
 */
export function missedPlanClause(fenBefore: string, playedUci: string, bestUci: string): string {
  if (!bestUci || bestUci.length < 4 || !playedUci || playedUci.length < 4) return '';
  if (playedUci === bestUci) return '';
  const best = classifyPlan(fenBefore, bestUci);
  const played = classifyPlan(fenBefore, playedUci);
  if (best === played) return '';
  if (best === 'castle') return `The real priority here was getting the king to safety — castling first.`;
  if (best === 'center-break') {
    const san = sanOf(fenBefore, bestUci);
    return san ? `The position was calling for the strike in the centre with ${san}, not a quiet move.` : '';
  }
  return '';
}
