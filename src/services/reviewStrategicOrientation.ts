/**
 * reviewStrategicOrientation — §1 anchor + §2 both-sides plans for the post-game
 * review walk. Fired ONCE, when the game reaches the middlegame: a single beat
 * that names the structural anchor (opposite-side castling) and BOTH sides'
 * plans, derived from the PAWN MAJORITIES on each wing.
 *
 * Grounding: this is the classical, board-true basis for a plan — "play where
 * you have the pawn majority; advance it to make a passed pawn" (Capablanca /
 * Lasker, the injected concept corpus). Every claim is computed from chess.js
 * piece placement + boardStructure (G0/G3); nothing is invented. CONSERVATIVE:
 * a plan is stated only on a CLEAR majority (≥2 pawns, a real edge over the
 * opponent's count on that wing); when nothing is clear, it returns null and the
 * walk stays silent (empty > generic > invented; David 2026-07-19: "don't state
 * non-applicable reasons").
 *
 * REVIEW register (retrospective, the student's own game) — states the plans the
 * structure set up, in the second person for the student, third for the opponent.
 */
import { Chess } from 'chess.js';
import { describeStructure } from './boardStructure';

type Wing = 'queenside' | 'kingside';
const QUEENSIDE_FILES = new Set(['a', 'b', 'c']);
const KINGSIDE_FILES = new Set(['f', 'g', 'h']);

interface WingCounts {
  queenside: number;
  kingside: number;
}

function pawnCountsByWing(chess: Chess): Record<'w' | 'b', WingCounts> {
  const out: Record<'w' | 'b', WingCounts> = {
    w: { queenside: 0, kingside: 0 },
    b: { queenside: 0, kingside: 0 },
  };
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.type !== 'p') continue;
      const file = cell.square[0];
      if (QUEENSIDE_FILES.has(file)) out[cell.color].queenside += 1;
      else if (KINGSIDE_FILES.has(file)) out[cell.color].kingside += 1;
    }
  }
  return out;
}

/** The wing where `side` holds a CLEAR advanceable pawn majority, or null.
 *  Clear = the side has ≥2 pawns there AND at least one more than the opponent
 *  (a 2v1 / 3v2 majority — the textbook advanceable kind). If both wings
 *  qualify (rare), the larger edge wins; ties → null (no single clear plan). */
function majorityWing(counts: Record<'w' | 'b', WingCounts>, side: 'w' | 'b'): Wing | null {
  const enemy: 'w' | 'b' = side === 'w' ? 'b' : 'w';
  const qEdge = counts[side].queenside - counts[enemy].queenside;
  const kEdge = counts[side].kingside - counts[enemy].kingside;
  const qOk = counts[side].queenside >= 2 && qEdge >= 1;
  const kOk = counts[side].kingside >= 2 && kEdge >= 1;
  if (qOk && kOk) return qEdge === kEdge ? null : (qEdge > kEdge ? 'queenside' : 'kingside');
  if (qOk) return 'queenside';
  if (kOk) return 'kingside';
  return null;
}

/**
 * Build the one-shot middlegame orientation beat, or null when nothing clear.
 * `studentColorWB` is 'w' | 'b'.
 */
export function buildMiddlegameOrientation(fen: string, studentColorWB: 'w' | 'b'): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const struct = describeStructure(fen);
  if (!struct) return null;

  const counts = pawnCountsByWing(chess);
  const enemyWB: 'w' | 'b' = studentColorWB === 'w' ? 'b' : 'w';
  const studentWing = majorityWing(counts, studentColorWB);
  const enemyWing = majorityWing(counts, enemyWB);

  const parts: string[] = [];

  // Anchor: opposite-side castling is the clearest, unambiguous structural
  // signal — a pawn-storm race. (Only when both kings are actually off-centre.)
  const oppositeCastling =
    struct.kings.oppositeWings &&
    struct.kings.kingWing[studentColorWB] !== 'center' &&
    struct.kings.kingWing[enemyWB] !== 'center';
  if (oppositeCastling) {
    parts.push('The kings castled on opposite wings — this is a race, and whoever storms the enemy king first wins');
  }

  // Both sides' plans from the pawn majorities.
  if (studentWing) parts.push(`your plan is to advance your ${studentWing} pawn majority and make it count`);
  if (enemyWing) parts.push(`your opponent's plan is to push on the ${enemyWing}, where they hold the majority`);

  if (parts.length === 0) return null;
  // Capitalise the first part; join the rest as clauses.
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const rest = parts.slice(1);
  return rest.length ? `${first}; ${rest.join('; ')}.` : `${first}.`;
}
