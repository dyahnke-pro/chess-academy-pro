// MOVE ORDER — "X first, because Y right now runs into R" (census #1, the most
// frequent thing he teaches that the coach did not: 540 of 11,435 lines).
//
// His habit: "The key move order — you take on d4 first." / "Capture on e5
// first; the immediate check is just met by a pawn move." / "Take the knight
// first, and only then does the check pick up the piece."
//
// The computer: the student played X. Their next move in the engine's own line
// after X is Y. Play Y FIRST instead and ask the engine what the opponent does
// (one search, handed in as `yFirst`). It is a move-order point only when ALL
// of these hold — each guard is a real false positive from 1,400 of his moves:
//   · Y-first costs at least a pawn against X (the engine's own numbers);
//   · their answer R is not simply taking the piece Y moved (that is "Y hangs",
//     a different lesson, and was most of the raw hits);
//   · X is still playable after Y and R, so the two moves really do swap;
//   · R wins material by exchange count, or mates — the line names a concrete
//     cost the student can see, never an engine number.
// Measured on 80 of his speedrun games: ~0.7 points a game, including his own
// "the key move order — you take on d4 first".
//
// Pure: the engine reads are handed in. Returns null rather than a vague line.
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';
import { legalSeeGainFor } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

/** Y-first must cost at least this much, in centipawns, against X. */
export const ORDER_COST_CP = 100;

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
const MATE = 100_000;

export interface MoveOrderPoint {
  text: string;
  /** X's landing square, Y's from/to, and R's squares — never empty. */
  squares: string[];
  /** The follow-up that must wait, and the answer it would run into. */
  followUp: { san: string; uci: string };
  answer: { san: string; uci: string };
  costCp: number;
  about: 'student' | 'opponent';
}

const valueFor = (l: AnalysisLine | undefined, pov: 'w' | 'b'): number | null => {
  if (!l) return null;
  const v = l.mate !== null && l.mate !== undefined ? (l.mate > 0 ? MATE : -MATE) : l.evaluation;
  if (typeof v !== 'number') return null;
  return pov === 'w' ? v : -v;
};
const moveOf = (uci: string): { from: string; to: string; promotion?: string } =>
  ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });

/** The student's next move in the engine's line after X: `after[0].moves[1]`. */
export function followUpOf(after: readonly AnalysisLine[]): string | null {
  const pv = after[0]?.moves ?? [];
  return pv.length >= 2 ? pv[1] : null;
}

/**
 * Is X a move-order point? `xLine` is the engine's best line after X (White
 * POV, as every `AnalysisLine`); `followUpUci` is Y; `yFirst` is the engine's
 * best line in the position where Y was played instead of X (opponent to move).
 */
export function moveOrder(
  fenBefore: string,
  playedSan: string,
  followUpUci: string,
  xLine: AnalysisLine,
  yFirst: AnalysisLine,
  /** Whose move X is, for the wording. REQUIRED — the seat is part of the claim. */
  seat: 'student' | 'opponent',
): MoveOrderPoint | null {
  let mover: 'w' | 'b';
  let x; let y; let yFen: string;
  try {
    const a = new Chess(fenBefore);
    mover = a.turn();
    x = a.move(playedSan);
    if (!x) return null;
    const b = new Chess(fenBefore);
    y = b.move(moveOf(followUpUci));
    if (!y) return null;
    yFen = b.fen();
  } catch { return null; }
  if (`${x.from}${x.to}` === `${y.from}${y.to}`) return null;
  const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';

  const vX = valueFor(xLine, mover);
  const vY = valueFor(yFirst, mover);
  if (vX === null || vY === null || vX - vY < ORDER_COST_CP) return null;

  const rUci = yFirst.moves?.[0];
  if (!rUci) return null;
  let r; let mates = false;
  try {
    const c = new Chess(yFen);
    r = c.move(moveOf(rUci));
    if (!r) return null;

    mates = c.isCheckmate();
    // Y simply hangs — a different lesson.
    if (r.to === y.to && r.captured) return null;
    // The order must really swap: X still playable after Y and R.
    if (!mates && !c.move(playedSan)) return null;
  } catch { return null; }

  // What R wins, counted by exchange on its square (their gain, in pawns).
  let cost: string | null = null;
  if (mates) cost = 'and it would have been mate';
  else if (r.captured) {
    const before = new Chess(yFen);
    const net = legalSeeGainFor(before.fen(), r.to, opp);
    const piece = NAME[r.captured] ?? 'piece';
    if (net >= (MATERIAL_VALUE[r.captured] ?? 0)) cost = `and the ${piece} on ${r.to} would simply have dropped`;
    else if (net > 0) cost = `and it would have cost material on ${r.to}`;
  }
  if (!cost) return null;

  const dot = (san: string, side: 'w' | 'b'): string => (side === 'b' ? `…${san}` : san);
  const X = dot(x.san, mover); const Y = dot(y.san, mover); const R = dot(r.san, opp);
  const key = stemKeyOf(fenBefore);
  const text = seat === 'student'
    ? rotateStem([
      `${X} first — ${Y} straight away would have run into ${R}, ${cost}.`,
      `The order matters: ${X} before ${Y}. ${Y} at once would have met ${R}, ${cost}.`,
    ], key)
    : rotateStem([
      `Their ${X} comes first for a reason — ${Y} straight away would have run into your ${R}.`,
      `They get the order right: ${X} before ${Y}, because ${Y} at once would have walked into your ${R}.`,
    ], key);
  return {
    text,
    squares: [...new Set([x.to, y.from, y.to, r.from, r.to])],
    followUp: { san: y.san, uci: followUpUci },
    answer: { san: r.san, uci: rUci },
    costCp: vX - vY,
    about: seat,
  };
}
