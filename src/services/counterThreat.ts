// counterThreat — DANGER LEVELS (David 2026-10-18: "I'm defending my knight by
// attacking a more valuable piece, this concept is called danger levels").
//
// A move that leaves one of the mover's pieces attacked and, instead of saving
// it, puts a MORE VALUABLE enemy piece under attack. The bigger threat comes
// first: the side that takes the smaller piece loses the bigger one.
//
// DUAL-USE (one computer, both seats): when THEY do it, the coach teaches why
// their piece was left; when the STUDENT does it, the coach credits the find.
//
// Pure: chess.js and the one must-defend computer (SEE-verified, so a "threat"
// is a piece that really falls).
import { Chess } from 'chess.js';
import { computeMustDefend } from './threatOut';
import { CAPTURE_VALUE } from './pieceValues';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface CounterThreat {
  /** The mover's piece left under attack. */
  left: { piece: string; square: string };
  /** The bigger enemy piece the move attacks. */
  hit: { piece: string; square: string; by: string };
  /** Taking the piece left, then losing the bigger one — the proof line. */
  line: { fen: string; sans: string[] } | null;
  squares: string[];
}

/**
 * `fenBefore`: the board the move is played from (the mover to move).
 * Null unless the mover's piece (a knight or bigger) was attacked before the
 * move, is still attacked after it, and the move newly attacks an enemy piece
 * worth MORE.
 */
export function counterThreat(fenBefore: string, san: string): CounterThreat | null {
  let before: Chess;
  try { before = new Chess(fenBefore); } catch { return null; }
  const mover = before.turn();
  const foe = mover === 'w' ? 'b' : 'w';
  const threatened = computeMustDefend(fenBefore, mover).pieces.filter((p) => (CAPTURE_VALUE[p.piece] ?? 0) >= 3 && p.piece !== 'k');
  if (threatened.length === 0) return null;
  const after = new Chess(fenBefore);
  let played;
  try { played = after.move(san); } catch { return null; }
  if (!played) return null;
  const fenAfter = after.fen();
  // The piece it left must still be the one attacked (it did not move, and the
  // move did not guard it out of danger).
  const stillHangs = computeMustDefend(fenAfter, mover).pieces;
  const left = threatened.find((t) => t.square !== played.from && stillHangs.some((s) => s.square === t.square));
  if (!left) return null;
  // The enemy piece newly hit, worth more than the piece left.
  const wasHanging = new Set(computeMustDefend(fenBefore, foe).pieces.map((p) => p.square));
  const hit = computeMustDefend(fenAfter, foe).pieces
    .filter((p) => !wasHanging.has(p.square) && p.piece !== 'k' && (CAPTURE_VALUE[p.piece] ?? 0) > (CAPTURE_VALUE[left.piece] ?? 0))
    .sort((a, b) => (CAPTURE_VALUE[b.piece] ?? 0) - (CAPTURE_VALUE[a.piece] ?? 0))[0];
  if (!hit) return null;
  // The proof: the other side takes the piece left; the mover takes the bigger one.
  let line: CounterThreat['line'] = null;
  try {
    const c = new Chess(fenAfter);
    const take = c.moves({ verbose: true })
      .filter((m) => m.to === left.square && !!m.captured)
      .sort((a, b) => (CAPTURE_VALUE[a.piece] ?? 0) - (CAPTURE_VALUE[b.piece] ?? 0))[0];
    if (take) {
      c.move(take.san);
      const back = c.moves({ verbose: true }).find((m) => m.to === hit.square && !!m.captured);
      if (back) line = { fen: fenAfter, sans: [take.san, back.san] };
    }
  } catch { line = null; }
  return {
    left: { piece: left.piece, square: left.square },
    hit: { piece: hit.piece, square: hit.square, by: played.to },
    line,
    squares: [left.square, hit.square, played.to],
  };
}

/** The line, from the student's seat. `byStudent`: the student made the move. */
export function counterThreatLine(c: CounterThreat, byStudent: boolean): string {
  const left = NAME[c.left.piece] ?? 'piece';
  const hit = NAME[c.hit.piece] ?? 'piece';
  const idea = "That's danger levels: answer a threat with a threat to something worth more.";
  if (byStudent) {
    return `You left your ${left} on ${c.left.square} and went after their ${hit} on ${c.hit.square} instead — the bigger threat comes first. ${idea}`;
  }
  const proof = c.line ? ` Take the ${left} with ${c.line.sans[0]}, and ${c.line.sans[1]} takes your ${hit}.` : '';
  return `They left their ${left} on ${c.left.square} and hit your ${hit} on ${c.hit.square} instead — the bigger threat comes first. ${idea}${proof}`;
}
