// bluffDetector — "DON'T BUY THE BLUFF" (WO-LAYERS-01 step 4).
//
// A move Naroditsky teaches beginners again and again: "The knight jumps to d4
// — a move designed to scare a beginner. Look at it calmly and you'll see it
// just wanders in with nothing behind it." / "The queen to b4 looks
// intimidating, but the grab on b2 is simply unthinkable." / "At this level the
// margins are narrow; don't fear phantom threats."
//
// Beginners lose tempo after tempo answering attacks that win nothing. The app
// already computes the REAL threat (`detectNewThreat`); a bluff is its exact
// complement: the opponent's piece lands in the student's half and hits the
// student's pieces, and yet no threat exists — every piece it touches is safe.
//
// Pure chess.js, no engine (G0/G3). Dual-use: the same computer that teaches
// "no need to react" is the one that can see a student spend a move answering
// nothing.
import { Chess, type Square } from 'chess.js';
import { detectNewThreat } from './groundedAnswer';
import { legalSeeGainFor } from './positionReadingService';

export interface Bluff {
  /** The opponent piece that made the aggressive-looking move. */
  piece: 'n' | 'b' | 'r' | 'q';
  square: string;
  /** Student pieces it now hits, none of which it can win. */
  targets: Array<{ piece: string; square: string }>;
}

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * The bluff in the move just played, from the MOVER's side, or null.
 * Null when the move gives check, makes a real threat, lands on its own half,
 * or hits nothing of the other side's.
 */
export function detectBluff(fenBefore: string, san: string): Bluff | null {
  let after: Chess;
  try { after = new Chess(fenBefore); } catch { return null; }
  let mv;
  try { mv = after.move(san); } catch { return null; }
  if (!mv || mv.captured || after.inCheck()) return null;
  if (mv.piece !== 'n' && mv.piece !== 'b' && mv.piece !== 'r' && mv.piece !== 'q') return null;
  const mover = mv.color;
  const victim: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  // It has to LOOK aggressive: landed in the other side's half.
  const rank = Number(mv.to[1]);
  if (mover === 'w' ? rank < 5 : rank > 4) return null;
  // Whatever it now hits that it did not hit before.
  const targets: Bluff['targets'] = [];
  for (const row of after.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== victim || cell.type === 'k' || cell.type === 'p') continue;
      const sq = cell.square as Square;
      const hitsNow = after.attackers(sq, mover).includes(mv.to as Square);
      if (!hitsNow) continue;
      // Can the mover win it? Then it is a threat, not a bluff.
      if (legalSeeGainFor(after.fen(), sq, mover) > 0) return null;
      targets.push({ piece: cell.type, square: sq });
    }
  }
  if (targets.length === 0) return null;
  // The one door for real threats: forks, mates, winning captures elsewhere.
  if (detectNewThreat(fenBefore, after.fen(), mover)) return null;
  targets.sort((a, b) => (VALUE[b.piece] ?? 0) - (VALUE[a.piece] ?? 0));
  return { piece: mv.piece, square: mv.to, targets };
}

const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', p: 'pawn', k: 'king' };

/** Told to the side being bluffed ("you"), about "their" piece. */
export function bluffClause(b: Bluff, opening: boolean): string {
  const hit = b.targets.map((t) => `your ${NAME[t.piece]} on ${t.square}`);
  const list = hit.length === 1 ? hit[0] : `${hit.slice(0, -1).join(', ')} and ${hit[hit.length - 1]}`;
  const next = opening ? 'keep developing' : 'keep improving your pieces';
  return `Their ${NAME[b.piece]} on ${b.square} looks aggressive, hitting ${list}, but it wins nothing — no need to react; ${next}`;
}
