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
import { admitArrows, type ArrowClaim } from './arrowDoor';
import { explainDrillConcept, type PuzzleConceptExplanation } from './puzzleConceptExplanation';
import type { BoardArrow } from '../types';

/** The best line from a position, in UCI, side to move first — and, when the
 *  engine gave one, its score in centipawns from WHITE's side (mate = ±big). */
export type PuzzleLineRead = readonly string[] | { moves: readonly string[]; cpWhite: number | null };
export type PuzzleLineAnalyser = (fen: string) => Promise<PuzzleLineRead | null>;

/** Below this (solver's view, after the wrong move) the win is gone. */
export const CHANCE_GONE_CP = 150;

export interface WrongTryRefutation {
  /** mate / material / geometry: what their reply wins. chance-gone: the
   *  move loses nothing but lets the win slip (their reply shown). not-best:
   *  it keeps an edge, and something stronger is there (no line — that would
   *  point at the answer). */
  kind: 'mate' | 'material' | 'geometry' | 'chance-gone' | 'not-best';
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
  let cpWhite: number | null = null;
  try {
    const read = await args.analyse(fenAfter);
    if (read && 'moves' in read) { line = read.moves; cpWhite = read.cpWhite; } else line = read;
  } catch { line = null; }

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
    // Their line answers the student's move: a take-back on its square is a trade.
    const w = lineWins(fenAfter, line, them, undefined, { fenBefore: args.fenBefore, san: args.wrongSan }, { minPlies: 1 });
    if (w) {
      const uci = line.slice(0, w.plies.length);
      return {
        kind: 'material',
        text: `${san}? Then ${w.sans.join(' ')} — they come out ${w.what} up.`,
        fenAfter, uci: [...uci], arrows: lineArrows(fenAfter, uci, 'puzzleTeaching.refute'),
      };
    }
  }

  const geo = whyItFailed({ fenBefore: args.fenBefore, playedSan: args.wrongSan, studentColor: solver === 'w' ? 'white' : 'black', playedLineUci: line ?? null });
  if (geo) {
    return { kind: 'geometry', text: `${san}? ${geo.line}`, fenAfter, uci: [], arrows: [] };
  }

  // NOTHING LOST — BUT THE WIN SLIPPED (hand walk 2026-10-01: "…a6" in a fork
  // puzzle drew only the old nudge). In a puzzle a slow move fails because it
  // gives them a move: show the reply that takes the chance away. Still their
  // move only — the answer is never named.
  if (line && line.length && cpWhite !== null) {
    const solverCp = solver === 'w' ? cpWhite : -cpWhite;
    if (solverCp < CHANCE_GONE_CP) {
      let reply = '';
      try { const c = new Chess(fenAfter); const m = c.move({ from: line[0].slice(0, 2), to: line[0].slice(2, 4), promotion: line[0][4] }); reply = `${them === 'b' ? '…' : ''}${m.san}`; } catch { reply = ''; }
      if (reply) {
        return {
          kind: 'chance-gone',
          text: `${san}? Then ${reply} — and the chance is gone.`,
          fenAfter, uci: [line[0]], arrows: lineArrows(fenAfter, [line[0]], 'puzzleTeaching.refute'),
        };
      }
    }
    return { kind: 'not-best', text: `${san} keeps an edge, but there is something stronger here.`, fenAfter, uci: [], arrows: [] };
  }
  return null;
}

/** The refutation's arrows, admitted through the arrow door on the board after
 *  the wrong move (each line ply carries its own board). */
export function refutationArrows(r: WrongTryRefutation): BoardArrow[] {
  const solver = r.fenAfter.split(' ')[1] === 'w' ? 'black' : 'white';
  return admitArrows(r.arrows, { fen: r.fenAfter, studentColor: solver }).arrows;
}

/** The concept behind a SOLVED student-to-move drill (Calculation, Opening
 *  Traps) — the same computed explanation the puzzle board gives. Here so a
 *  surface reaches it through the puzzle-teaching door, not a third import. */
export function solvedDrillConcept(setupFen: string, solutionSan: readonly string[], themes: string[] = []): PuzzleConceptExplanation | null {
  return explainDrillConcept({ setupFen, solutionSan: [...solutionSan], themes });
}
