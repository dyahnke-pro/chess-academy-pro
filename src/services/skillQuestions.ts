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
 *   overvalued-attack   — a capture next to their king loses material on the count;
 *   poisoned-pawn       — the queen can take a pawn that looks free (2026-10-20);
 *   overextended-pawn   — a pawn can step deep into their half with no pawn
 *                         that could ever stand behind it (2026-10-20);
 *   bad-trade-material  — an even trade is on offer with the material
 *                         unbalanced: trade when ahead, keep pieces when behind.
 *
 * The last three closed David's heat map on 2026-10-20 ("Still not filled
 * in!"): each had only ever been failed — 3, 7 and 6 times in 950 games —
 * so its tile could never leave grey.
 *
 * Held or broken is decided ONCE by the caller (`movePlayedCleanly` — the engine's
 * cost), never here: the board asks, the move answers. PURE: chess.js only.
 */
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { signedLegalSeeFor } from './positionReadingService';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { MATERIAL_VALUE, sideMaterial } from './pieceValues';

const VAL = MATERIAL_VALUE;

interface SkillQuestion { tag: MisconceptionTagId; posedImportance: number }

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

  // The poisoned pawn: the QUEEN can take a pawn the count says is safe —
  // the classic grab (…Qxb2) that a tempo-gaining reply traps or punishes.
  if (fullMove <= 20 && moves.some((m) => m.piece === 'q' && m.captured === 'p' && captureNet(fenBefore, m) >= 1)) {
    out.push({ tag: 'poisoned-pawn', posedImportance: POSED });
  }

  // The overextended pawn: a pawn can step into their half where no pawn of
  // yours on a neighbouring file stands behind it to ever support it.
  if (fullMove >= 6 && moves.some((m) => m.piece === 'p' && !m.captured && !m.promotion && pawnRunsAlone(c, m.to, side))) {
    out.push({ tag: 'overextended-pawn', posedImportance: POSED });
  }

  // The trade with the material unbalanced: an even trade is on offer and one
  // side is up at least two points — trade down when ahead, keep the pieces
  // when behind.
  const imbalance = Math.abs(sideMaterial(fenBefore, 'w') - sideMaterial(fenBefore, 'b'));
  if (imbalance >= 2 && out.some((q) => q.tag === 'bad-trade')) {
    out.push({ tag: 'bad-trade-material', posedImportance: POSED });
  }

  return out;
}

/** A pawn on `to`, in their half, with no pawn of `side` on a neighbouring
 *  file level with or behind it — nothing can ever defend it with a pawn. */
function pawnRunsAlone(c: Chess, to: Square, side: Color): boolean {
  const rank = Number(to[1]);
  if (side === 'w' ? rank < 5 : rank > 4) return false;
  const f = to.charCodeAt(0);
  for (const df of [-1, 1]) {
    const file = f + df;
    if (file < 97 || file > 104) continue;
    for (let r = 2; r <= 7; r += 1) {
      const behind = side === 'w' ? r <= rank : r >= rank;
      if (!behind) continue;
      const p = c.get(`${String.fromCharCode(file)}${r}` as Square);
      if (p && p.type === 'p' && p.color === side) return false;
    }
  }
  return true;
}
