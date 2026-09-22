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
//   • solvedLineBeat — the SEQUENCE spoken as a line with the idea named:
//     "Nxd5 — then queen takes d5, bishop takes f7 check … That's the fork."
//   • hintBeat — the hint SAYS the piece, withholds the square (the honesty
//     contract), so the arrow is no longer silent.
import { Chess, type Square } from 'chess.js';
import { findHangingBySee } from './positionReadingService';
import { sayMoveClause } from './spokenMove';

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The reason the student's WRONG move fails, or null when the board shows
 *  nothing concrete (the caller then falls back to the drill's concept hint or
 *  the plain nudge — never a guessed reason). */
export function wrongMoveReason(fenBefore: string, wrongSan: string, expectedSan: string): string | null {
  let after: Chess;
  let mover: 'w' | 'b';
  try {
    after = new Chess(fenBefore);
    mover = after.turn();
    if (!after.move(wrongSan)) return null;
  } catch { return null; }
  const you = sayMoveClause(wrongSan);
  // 1. Mate in one for the opponent.
  for (const reply of after.moves({ verbose: true })) {
    const probe = new Chess(after.fen());
    probe.move(reply.san);
    if (probe.isCheckmate()) return `${cap(you)} walks into ${reply.san} — mate. ${sayMoveClause(expectedSan)} is the move to find.`;
  }
  // 2. A piece of yours it leaves loose (value-aware, pin-aware).
  const loose = findHangingBySee(after.fen()).filter((h) => h.color === mover && h.piece !== 'k').sort((a, b) => b.gain - a.gain)[0];
  if (loose) {
    return `${cap(you)} leaves your ${PIECE_NAME[loose.piece]} on ${loose.square} loose — they take it for free. ${cap(sayMoveClause(expectedSan))} keeps everything protected and does more.`;
  }
  // 3. A capture that wins material outright for them (their best one-ply grab).
  const grab = after.moves({ verbose: true }).filter((m) => m.captured && m.captured !== 'k')
    .map((m) => ({ m, net: pieceValue(m.captured as string) - (isRecapturable(after.fen(), m.to) ? pieceValue(m.piece) : 0) }))
    .filter((x) => x.net >= 2).sort((a, b) => b.net - a.net)[0];
  if (grab) return `${cap(you)} lets them play ${grab.m.san} and come out ahead. ${cap(sayMoveClause(expectedSan))} is the move to find.`;
  return null;
}

/** The solved line, spoken, with the idea named when the caller has one:
 *  "That's it — knight takes d5; then queen takes d5, bishop takes f7 check.
 *  The fork: one piece, two targets." */
export function solvedLineBeat(solutionSan: readonly string[], idea: string | null): string {
  if (solutionSan.length === 0) return idea ?? '';
  const [first, ...rest] = solutionSan;
  const opening = `That's it — ${sayMoveClause(first)}`;
  const tail = rest.length > 0 ? `; then ${rest.map(sayMoveClause).join(', ')}.` : '.';
  return `${opening}${tail}${idea ? ` ${idea}` : ''}`.trim();
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

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function pieceValue(p: string): number { return ({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as Record<string, number>)[p] ?? 0; }
/** Can the side to move (after `fen`) be recaptured on `sq` — i.e. is the square defended? */
function isRecapturable(fen: string, sq: Square): boolean {
  try {
    const c = new Chess(fen);
    const defender = c.turn() === 'w' ? 'b' : 'w';
    return c.isAttacked(sq, defender);
  } catch { return false; }
}
