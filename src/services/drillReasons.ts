// drillReasons — DRILLS THAT TEACH (WO-HOME-OPENING-01 A5, David 2026-09-22).
//
// The custom lesson and the mistake drill used to answer a wrong move with
// "not the strongest, try again" (no reason), a hint with a silent arrow, and
// the right move with "Good." — a drill called "missed tactical sequences"
// that never showed the sequence. Three computed beats, all board-true (G0),
// no engine, no model:
//   • wrongMoveReason — WHY the student's move fails, read off the position it
//     leaves: a piece it leaves loose (SEE), a mate or a winning capture it
//     walks into (a one-ply scan), else the drill's own concept hint.
//   • judgeAlternative — a move off the answer key is judged by the ENGINE:
//     as good → accepted; only an engine-confirmed loss is called one.
//   • hintBeat — the hint SAYS the piece, withholds the square (the honesty
//     contract), so the arrow is no longer silent.
import { openSentence } from '../utils/openSentence';
import { Chess, type Square } from 'chess.js';
import { findHangingBySee } from './positionReadingService';
import { sayMoveClause } from './spokenMove';
import { MATE_EVAL_THRESHOLD } from './engineConstants';

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The reason the student's WRONG move fails, or null when the board shows
 *  nothing concrete (the caller then falls back to the drill's concept hint or
 *  the plain nudge — never a guessed reason).
 *
 *  It NEVER names the move to play (walk 2026-10-04 defect 7: the first wrong
 *  try was answered "…the queen takes g7 keeps everything protected"). A drill
 *  is a question; the answer comes only when the student asks (Hint) or after
 *  the misses run out. `expectedSan` is kept in the signature for callers that
 *  reveal deliberately. */
export function wrongMoveReason(fenBefore: string, wrongSan: string, expectedSan: string): string | null {
  let after: Chess;
  let mover: 'w' | 'b';
  try {
    after = new Chess(fenBefore);
    mover = after.turn();
    if (!after.move(wrongSan)) return null;
  } catch { return null; }
  const you = sayMoveClause(wrongSan, fenBefore);
  // 1. Mate in one for the opponent.
  for (const reply of after.moves({ verbose: true })) {
    const probe = new Chess(after.fen());
    probe.move(reply.san);
    if (probe.isCheckmate()) return `${cap(you)} walks into ${sayMoveClause(reply.san, after.fen())} — mate. Look again.`;
  }
  // 2. A piece of yours it leaves HANGING (SEE: loses material — not the same
  //    as loose = undefended, `findLoosePieces`; value-aware, pin-aware).
  const loose = findHangingBySee(after.fen()).filter((h) => h.color === mover && h.piece !== 'k').sort((a, b) => b.gain - a.gain)[0];
  if (loose) {
    return `${cap(you)} leaves your ${PIECE_NAME[loose.piece]} on ${loose.square} hanging — they win material there. Find a move that keeps everything protected.`;
  }
  // 3. A capture that wins material outright for them (their best one-ply grab).
  const grab = after.moves({ verbose: true }).filter((m) => m.captured && m.captured !== 'k')
    .map((m) => ({ m, net: pieceValue(m.captured as string) - (isRecapturable(after.fen(), m.to) ? pieceValue(m.piece) : 0) }))
    .filter((x) => x.net >= 2).sort((a, b) => b.net - a.net)[0];
  if (grab) return `${cap(you)} lets them play ${sayMoveClause(grab.m.san, after.fen())} and come out ahead. Look again.`;
  void expectedSan;
  return null;
}

/** Clearly better for the student (centipawns, student's view). */
const STILL_GOOD_CP = 100;
/** How much better the drill's move must be for "there's stronger" to be true. */
const STRONGER_BY_CP = 80;

/**
 * A wrong move that is still GOOD (walk 2026-10-04 defect 9: Nxc7+ was +1.8,
 * the drill's Nxe7 +3.5, and the student heard only "not the strongest here").
 * Says the move is good, what it wins when it captures, and that there is
 * something stronger — without naming it. Evals are the engine's, white's
 * view; null when the move is not good enough to praise or not clearly weaker.
 */
export function goodButWeakerBeat(args: {
  fenBefore: string;
  wrongSan: string;
  evalAfterWrong: number;
  evalAfterBest: number;
}, opts: { withTail?: boolean } = {}): string | null {
  let mover: 'w' | 'b';
  let captured: string | undefined;
  try {
    const c = new Chess(args.fenBefore);
    mover = c.turn();
    const m = c.move(args.wrongSan);
    if (!m) return null;
    captured = m.captured;
  } catch { return null; }
  const pov = (e: number): number => (mover === 'w' ? e : -e);
  const wrong = pov(args.evalAfterWrong);
  const best = pov(args.evalAfterBest);
  if (wrong < STILL_GOOD_CP || best - wrong < STRONGER_BY_CP) return null;
  const wins = captured && captured !== 'k' ? ` — it wins the ${PIECE_NAME[captured]}` : ' — it keeps your edge';
  const head = `${cap(sayMoveClause(args.wrongSan, args.fenBefore))} is a good move${wins}.`;
  // withTail false: the caller follows with the position's own direction
  // (moveInsight.positionAsk), which says WHERE to look.
  return opts.withTail === false
    ? `${head} There is something stronger here, though.`
    : `${head} There is something stronger here, though: before you settle, look for a move that does even more.`;
}

/** Within this many centipawns of the drill's move, a different move is just
 *  as good — the drill must take it. */
const EQUAL_CP = 50;
/** Both moves win clearly (student's view) … */
const BOTH_WIN_CP = 300;
/** … and the other move keeps at least this share of the key move's edge. */
const BOTH_WIN_SHARE = 0.75;
/** A "your piece hangs / they win material" reason is spoken only when the
 *  engine agrees the move throws away at least this much. */
const LOSES_CP = 150;

export type AlternativeVerdict = 'accept' | 'good-but-weaker' | 'loses' | 'weaker';

/**
 * How a move that is not the drill's answer key actually stands, from the
 * engine's evals of both boards (white's view). A drill's key is ONE winning
 * line, not the only one — David's session, 2026-10-05: the drill refused
 * axb5 three times as "leaves your pawn on b5 hanging" while the engine had it
 * at +14.9. The one-ply SEE read cannot see a recapture-and-win; the engine
 * decides, and only a move the engine says LOSES may be called a loss.
 */
export function judgeAlternative(args: { fenBefore: string; evalAfterWrong: number; evalAfterBest: number }): AlternativeVerdict {
  let mover: 'w' | 'b' = 'w';
  try { mover = new Chess(args.fenBefore).turn(); } catch { /* white's view */ }
  const pov = (e: number): number => (mover === 'w' ? e : -e);
  const wrong = pov(args.evalAfterWrong);
  const best = pov(args.evalAfterBest);
  if (wrong >= best - EQUAL_CP) return 'accept';
  if (wrong >= BOTH_WIN_CP && best < MATE_EVAL_THRESHOLD && wrong >= best * BOTH_WIN_SHARE) return 'accept';
  if (wrong >= STILL_GOOD_CP) return 'good-but-weaker';
  if (best - wrong >= LOSES_CP) return 'loses';
  return 'weaker';
}

/** The hint names the PIECE and withholds the square (the honesty contract:
 *  the student still has to find it). Null when the move cannot be parsed. */
export function hintBeat(fen: string, expectedSan: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move(expectedSan);
    if (!m) return null;
    const piece = PIECE_NAME[m.piece];
    if (m.san === 'O-O' || m.san === 'O-O-O') return 'Your king wants safety — think about castling.';
    return m.captured
      ? `Your ${piece} on ${m.from} has a capture that changes everything — find it.`
      : `Your ${piece} on ${m.from} wants a better square — find it.`;
  } catch { return null; }
}

function cap(s: string): string { return openSentence(s); }
function pieceValue(p: string): number { return ({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as Record<string, number>)[p] ?? 0; }
/** Can the side to move (after `fen`) be recaptured on `sq` — i.e. is the square defended? */
function isRecapturable(fen: string, sq: Square): boolean {
  try {
    const c = new Chess(fen);
    const defender = c.turn() === 'w' ? 'b' : 'w';
    return c.isAttacked(sq, defender);
  } catch { return false; }
}

