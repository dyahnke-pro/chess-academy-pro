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
import { openSentence } from '../utils/openSentence';
import { Chess, type Square } from 'chess.js';
import { detectNewThreat } from './groundedAnswer';
import { legalSeeGainFor, seeReadsStanding, standsSafe } from './positionReadingService';
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
 * hits nothing of the other side's, or the engine's best reply (`bestReplySan`,
 * null when unknown) answers the piece.
 */
export function detectBluff(fenBefore: string, san: string, bestReplySan: string | null): Bluff | null {
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
  if (legalSeeGainFor(after.fen(), mv.to, victim) > 0 || !seeReadsStanding(after.fen(), mv.to, victim)) return null;
  const targets: Bluff['targets'] = [];
  for (const row of after.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== victim || cell.type === 'k') continue;
      const sq = cell.square;
      const hitsNow = after.attackers(sq, mover).includes(mv.to);
      if (!hitsNow) continue;
      // Can the mover win it? Then it is a threat, not a bluff — PAWNS
      // INCLUDED (walk 2340, move 22: "Rd3 wins nothing" while it won c3).
      if (!standsSafe(after.fen(), sq, mover)) return null;
      // A PIN IS NOT A BLUFF (walk 2340, moves 7 and 10: "Bb4 wins nothing —
      // no need to react" beside "watch out — it pins your knight"). A slider
      // with the victim's king or a bigger piece behind its target binds it.
      if (pinsBehind(after, mv.to, sq, victim)) return null;
      // A GUARD IT TRADES OFF IS NOT A BLUFF (Danya lyUZn 10.Bg5: "it wins
      // nothing — no need to react" — Bxf6 and the pawn on e4 the knight
      // guarded falls). After the trade on the target, the mover wins
      // something else.
      if (removesGuard(after, mv.to, sq, mover)) return null;
      if (cell.type !== 'p') targets.push({ piece: cell.type, square: sq });
    }
  }
  if (targets.length === 0) return null;
  // The one door for real threats: forks, mates, winning captures elsewhere.
  if (detectNewThreat(fenBefore, after.fen(), mover)) return null;
  // "No need to react" is false when the best reply IS a reaction — it takes
  // the piece, or moves one it hits (Blumenfeld walk F25: "take on h5, it
  // forces matters" and "their knight on h5 wins nothing — no need to react"
  // on one move). REQUIRED, so a caller cannot forget to ask the engine.
  if (bestReplySan) {
    try {
      const reply = new Chess(after.fen()).move(bestReplySan);
      if (reply.to === mv.to || targets.some((t) => t.square === reply.from)) return null;
    } catch { /* an unplayable reply says nothing about the bluff */ }
  }
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
  return `Their ${NAME[b.piece]} on ${b.square} looks aggressive, hitting ${list}, but it wins nothing — no need to react. ${openSentence(next)}`;
}

/** Does taking `target` with the piece on `from` (and their cheapest take-back)
 *  leave the mover a winning capture somewhere else — a guard removed? */
function removesGuard(board: Chess, from: Square, target: Square, mover: 'w' | 'b'): boolean {
  try {
    const c = new Chess(board.fen());
    const victim: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
    const fen0 = c.fen().split(' ');
    fen0[1] = mover; fen0[3] = '-';
    const t = new Chess(fen0.join(' '));
    if (!t.move({ from, to: target })) return false;
    const backs = t.moves({ verbose: true }).filter((m) => m.to === target && !!m.captured)
      .sort((a, b) => (MATERIAL_VALUE[a.piece] ?? 0) - (MATERIAL_VALUE[b.piece] ?? 0));
    if (backs[0]) t.move(backs[0].san);
    if (t.turn() !== mover) return false;
    const fen = t.fen();
    // Only what the TARGET itself was guarding: the guard removed, never a
    // piece another recapturer left behind.
    for (const row of t.board()) for (const p of row) {
      if (!p || p.color !== victim || p.type === 'k') continue;
      if (!board.attackers(p.square, victim).includes(target)) continue;
      if (legalSeeGainFor(fen, p.square, mover) > 0) return true;
    }
    return false;
  } catch { return false; }
}
