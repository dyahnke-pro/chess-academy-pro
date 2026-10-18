/**
 * skillQuestions — the board POSING a question for a skill that, until now,
 * could only ever be failed (2026-10-18, David: "9 skills never get a row").
 *
 * A heat-map tile turns GREEN only on `capabilityEvidence`: the board asked and
 * the student answered cleanly, across games. Five skills had a detector that
 * files the miss and no reader that notices the question, so their tiles could
 * go RED and never GREEN. This is the other half, one computer per skill, each
 * reading only the board:
 *
 *   king-stuck-center   — castling is legal right now, past the opening's start;
 *   greedy-pawn-grab    — a piece can take a pawn that looks free;
 *   bad-trade           — an even trade is on offer (a piece for a like piece);
 *   capture-toward-centre — two of your pawns can take on the same square;
 *   overvalued-attack   — a capture next to their king loses material on the count.
 *
 * Held or broken is decided ONCE by the caller (`movePlayedCleanly` — the engine's
 * cost), never here: the board asks, the move answers. PURE: chess.js only.
 */
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { signedLegalSeeFor } from './positionReadingService';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { MATERIAL_VALUE } from './pieceValues';

const VAL = MATERIAL_VALUE;

export interface SkillQuestion { tag: MisconceptionTagId; posedImportance: number }

/** At the green bar: each one is a real decision the student has to make. */
const POSED = 80;
/** The castling question and the sacrifice by the king are sharper. */
const POSED_SHARP = 85;

/** What a capture nets on the count once they take back (pin-aware SEE). */
function captureNet(fen: string, m: Move): number {
  if (!m.captured) return 0;
  const c = new Chess(fen);
  c.move(m.san);
  const back = Math.max(0, signedLegalSeeFor(c.fen(), m.to, c.turn()));
  return VAL[m.captured] - back;
}

function kingSquare(c: Chess, color: Color): Square | null {
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}

const near = (a: Square, b: Square): boolean =>
  Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) <= 1 && Math.abs(Number(a[1]) - Number(b[1])) <= 1;

/** Every skill question this board asks the side to move. */
export function skillQuestions(fenBefore: string): SkillQuestion[] {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return []; }
  const side = c.turn();
  const fullMove = Number(fenBefore.split(' ')[5] ?? '1');
  const moves = c.moves({ verbose: true });
  const out: SkillQuestion[] = [];

  // Castle in time: the king can castle now, and the opening is well under way.
  if (fullMove >= 8 && moves.some((m) => m.san === 'O-O' || m.san === 'O-O-O')) {
    out.push({ tag: 'king-stuck-center', posedImportance: POSED_SHARP });
  }

  // The free-looking pawn: a piece can take a pawn the count says is safe —
  // is it really free, or is it bait that costs time and position?
  if (fullMove <= 20 && moves.some((m) => m.captured === 'p' && m.piece !== 'p' && captureNet(fenBefore, m) >= 1)) {
    out.push({ tag: 'greedy-pawn-grab', posedImportance: POSED });
  }

  // The even trade on offer: a minor for a minor, a rook for a rook, the
  // queens — and they can take back. Does the trade help you or them?
  if (moves.some((m) => {
    if (!m.captured || m.piece === 'p' || m.piece === 'k') return false;
    const same = VAL[m.piece] === VAL[m.captured];
    return same && captureNet(fenBefore, m) === 0;
  })) {
    out.push({ tag: 'bad-trade', posedImportance: POSED });
  }

  // Which pawn takes: two of your pawns can capture on the same square.
  const pawnCapsTo = new Map<string, number>();
  for (const m of moves) if (m.piece === 'p' && m.captured) pawnCapsTo.set(m.to, (pawnCapsTo.get(m.to) ?? 0) + 1);
  if ([...pawnCapsTo.values()].some((n) => n >= 2)) {
    out.push({ tag: 'capture-toward-centre', posedImportance: POSED });
  }

  // The sacrifice by their king: a capture next to it that loses on the count.
  const theirKing = kingSquare(c, side === 'w' ? 'b' : 'w');
  if (theirKing && moves.some((m) => m.captured && m.piece !== 'p' && near(m.to, theirKing) && captureNet(fenBefore, m) <= -2)) {
    out.push({ tag: 'overvalued-attack', posedImportance: POSED_SHARP });
  }

  return out;
}
