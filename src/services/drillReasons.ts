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
  const you = sayMoveClause(wrongSan);
  // 1. Mate in one for the opponent.
  for (const reply of after.moves({ verbose: true })) {
    const probe = new Chess(after.fen());
    probe.move(reply.san);
    if (probe.isCheckmate()) return `${cap(you)} walks into ${sayMoveClause(reply.san)} — mate. Look again.`;
  }
  // 2. A piece of yours it leaves loose (value-aware, pin-aware).
  const loose = findHangingBySee(after.fen()).filter((h) => h.color === mover && h.piece !== 'k').sort((a, b) => b.gain - a.gain)[0];
  if (loose) {
    return `${cap(you)} leaves your ${PIECE_NAME[loose.piece]} on ${loose.square} loose — they take it for free. Find a move that keeps everything protected.`;
  }
  // 3. A capture that wins material outright for them (their best one-ply grab).
  const grab = after.moves({ verbose: true }).filter((m) => m.captured && m.captured !== 'k')
    .map((m) => ({ m, net: pieceValue(m.captured as string) - (isRecapturable(after.fen(), m.to) ? pieceValue(m.piece) : 0) }))
    .filter((x) => x.net >= 2).sort((a, b) => b.net - a.net)[0];
  if (grab) return `${cap(you)} lets them play ${sayMoveClause(grab.m.san)} and come out ahead. Look again.`;
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
}): string | null {
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
  return `${cap(sayMoveClause(args.wrongSan))} is a good move${wins}. There is something stronger here, though: before you settle, look for a move that does even more.`;
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

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * The IDEA behind a solved line when no concept is named (walk 2026-10-04
 * defect 10: the solve was a bare move list). Replays the line and says what
 * it wins, naming the biggest piece taken and whether it was loose before the
 * line started. Null when the line wins no material (a mate or a positional
 * line has its own words elsewhere).
 */
export function lineGainIdea(fen: string, solutionSan: readonly string[]): string | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const me = c.turn();
  const start = new Chess(fen);
  let net = 0;
  let prize: { piece: string; square: Square } | null = null;
  for (const san of solutionSan) {
    let m;
    try { m = c.move(san); } catch { return null; }
    if (!m) return null;
    if (m.captured) {
      const v = VALUE[m.captured] ?? 0;
      if (m.color === me) {
        net += v;
        if (!prize || v > (VALUE[prize.piece] ?? 0)) prize = { piece: m.captured, square: m.to };
      } else {
        net -= v;
      }
    }
  }
  if (c.isCheckmate()) return null;
  if (net <= 0 || !prize) return null;
  const them = me === 'w' ? 'b' : 'w';
  const wasLoose = start.get(prize.square)?.color === them && start.attackers(prize.square, them).length === 0;
  const what = `the ${PIECE_NAME[prize.piece]}${prize.square ? ` on ${prize.square}` : ''}`;
  return wasLoose
    ? `The point: ${what} had no defender, so it was a target from the start — and the line wins it.`
    : `The point: the line wins ${what}${net > (VALUE[prize.piece] ?? 0) ? ' and more' : ''}.`;
}
