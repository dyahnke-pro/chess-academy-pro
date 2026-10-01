/**
 * puzzleTeaching — what the coach says when a puzzle move is WRONG.
 *
 * David 2026-10-01: "Wire all of the computers in to tactics" → wrong try:
 * "Refute it, keep the answer." Every Tactics board used to answer a wrong try
 * with a canned nudge ("look at what your knight can do"). The board already
 * knows better: the engine's reply to THAT move, played out by the same line
 * computers Learn and Review use (`mateLine`, `lineWins`), else the geometry
 * `whyItFailed` reads with no engine at all.
 *
 * Two rules, both enforced here so no surface can break them:
 *  1. The refutation names THEIR moves only. The line starts with the
 *     opponent's reply to the wrong move, so the right answer is never said.
 *  2. Silence over a guess. No mate, no material, no geometry → null, and the
 *     surface keeps its own nudge.
 *
 * The engine is injected (`analyse`) so the computer is testable and every
 * surface can pass its own engine handle. A LEAF beside lineCalc: no Dexie,
 * no voice.
 */
import { Chess } from 'chess.js';
import { lineWins, mateLine, lineArrows } from './lineCalc';
import { whyItFailed } from './whyItFailed';
import type { ArrowClaim } from './arrowDoor';

/** The best line from a position, in UCI, side to move first. */
export type PuzzleLineAnalyser = (fen: string) => Promise<readonly string[] | null>;

export interface WrongTryRefutation {
  kind: 'mate' | 'material' | 'geometry';
  /** One or two sentences, from the solver's seat. */
  text: string;
  /** The board after the wrong move — where the line is played from. */
  fenAfter: string;
  /** Their punishing line from `fenAfter` (empty for a geometry read). */
  uci: string[];
  /** One arrow per ply of the line, each on its own board (arrow door). */
  arrows: ArrowClaim[];
}

const bare = (s: string): string => s.replace(/[+#?!]+$/, '');

/**
 * Why `wrongSan`, played from `fenBefore` by the side to move, fails. The line
 * comes from `analyse(fenAfter)` — their best play against it.
 */
export async function refuteWrongTry(args: {
  fenBefore: string;
  wrongSan: string;
  analyse: PuzzleLineAnalyser;
}): Promise<WrongTryRefutation | null> {
  let fenAfter: string;
  let solver: 'w' | 'b';
  let san: string;
  try {
    const c = new Chess(args.fenBefore);
    solver = c.turn();
    const m = c.move(args.wrongSan);
    if (!m) return null;
    san = bare(m.san);
    fenAfter = c.fen();
    if (c.isCheckmate()) return null; // a mate is never a wrong try
  } catch {
    return null;
  }
  const them: 'w' | 'b' = solver === 'w' ? 'b' : 'w';

  let line: readonly string[] | null = null;
  try { line = await args.analyse(fenAfter); } catch { line = null; }

  if (line && line.length) {
    const ml = mateLine(fenAfter, line, them, undefined, { minPlies: 1 });
    if (ml) {
      const uci = line.slice(0, ml.plies.length);
      return {
        kind: 'mate',
        text: `${san}? Then ${ml.sans.join(' ')} — they mate you.`,
        fenAfter, uci: [...uci], arrows: lineArrows(fenAfter, uci, 'puzzleTeaching.refute'),
      };
    }
    const w = lineWins(fenAfter, line, them, undefined, { minPlies: 1 });
    if (w) {
      const uci = line.slice(0, w.plies.length);
      return {
        kind: 'material',
        text: `${san}? Then ${w.sans.join(' ')} — they come out ${w.what} up.`,
        fenAfter, uci: [...uci], arrows: lineArrows(fenAfter, uci, 'puzzleTeaching.refute'),
      };
    }
  }

  const geo = whyItFailed({ fenBefore: args.fenBefore, playedSan: args.wrongSan, studentColor: solver === 'w' ? 'white' : 'black' });
  if (geo) {
    return { kind: 'geometry', text: `${san}? ${geo.line}`, fenAfter, uci: [], arrows: [] };
  }
  return null;
}
