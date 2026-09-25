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
import { MATERIAL_VALUE } from './pieceValues';

export interface Bluff {
  /** The opponent piece that made the aggressive-looking move. */
  piece: 'n' | 'b' | 'r' | 'q';
  square: string;
  /** Student pieces it now hits, none of which it can win. */
  targets: Array<{ piece: string; square: string }>;
}


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
  // A PIECE THAT CAN SIMPLY BE TAKEN IS NOT A BLUFF — it is a gift (hand walk
  // 2340, move 20: "their bishop on b3 has nothing defending it" and "it wins
  // nothing — no need to react" on one move). The other lane says take it.
  if (legalSeeGainFor(after.fen(), mv.to, victim) > 0) return null;
  const targets: Bluff['targets'] = [];
  for (const row of after.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== victim || cell.type === 'k') continue;
      const sq = cell.square;
      const hitsNow = after.attackers(sq, mover).includes(mv.to);
      if (!hitsNow) continue;
      // Can the mover win it? Then it is a threat, not a bluff — PAWNS
      // INCLUDED (walk 2340, move 22: "Rd3 wins nothing" while it won c3).
      if (legalSeeGainFor(after.fen(), sq, mover) > 0) return null;
      // A PIN IS NOT A BLUFF (walk 2340, moves 7 and 10: "Bb4 wins nothing —
      // no need to react" beside "watch out — it pins your knight"). A slider
      // with the victim's king or a bigger piece behind its target binds it.
      if (pinsBehind(after, mv.to, sq, victim)) return null;
      if (cell.type !== 'p') targets.push({ piece: cell.type, square: sq });
    }
  }
  if (targets.length === 0) return null;
  // The one door for real threats: forks, mates, winning captures elsewhere.
  if (detectNewThreat(fenBefore, after.fen(), mover)) return null;
  targets.sort((a, b) => (MATERIAL_VALUE[b.piece] ?? 0) - (MATERIAL_VALUE[a.piece] ?? 0));
  return { piece: mv.piece, square: mv.to, targets };
}

/** Does the slider on `from` see, through `target`, a victim king or a victim
 *  piece worth more than the target — i.e. is `target` pinned (absolute or
 *  relative) by it? */
function pinsBehind(board: Chess, from: Square, target: Square, victim: 'w' | 'b'): boolean {
  const slider = board.get(from);
  if (!slider || (slider.type !== 'b' && slider.type !== 'r' && slider.type !== 'q')) return false;
  const df = Math.sign(target.charCodeAt(0) - from.charCodeAt(0));
  const dr = Math.sign(Number(target[1]) - Number(from[1]));
  const diagonal = df !== 0 && dr !== 0;
  if (diagonal ? slider.type === 'r' : slider.type === 'b') return false;
  const front = board.get(target);
  let f = target.charCodeAt(0) + df;
  let r = Number(target[1]) + dr;
  while (f >= 97 && f <= 104 && r >= 1 && r <= 8) {
    const p = board.get(`${String.fromCharCode(f)}${r}` as Square);
    if (p) {
      if (p.color !== victim) return false;
      return p.type === 'k' || (MATERIAL_VALUE[p.type] ?? 0) > (MATERIAL_VALUE[front?.type ?? 'p'] ?? 0);
    }
    f += df; r += dr;
  }
  return false;
}

const NAME: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', p: 'pawn', k: 'king' };

/** Told to the side being bluffed ("you"), about "their" piece. */
export function bluffClause(b: Bluff, opening: boolean): string {
  const hit = b.targets.map((t) => `your ${NAME[t.piece]} on ${t.square}`);
  const list = hit.length === 1 ? hit[0] : `${hit.slice(0, -1).join(', ')} and ${hit[hit.length - 1]}`;
  const next = opening ? 'keep developing' : 'keep improving your pieces';
  return `Their ${NAME[b.piece]} on ${b.square} looks aggressive, hitting ${list}, but it wins nothing — no need to react; ${next}`;
}
