// continuationMoveNarration — a spoken WHY plus arrows for EVERY move of the
// "watch the middlegame and endgame" play-out.
//
// David 2026-07-31: "The middle game plans were devoid of narration and
// arrows." He was right, and the cause was by design: narratedContinuation
// only spoke on a phase transition or a ≥2-point material swing, so a normal
// move returned null and nothing was said or drawn. In his session he was
// already in an endgame when the play-out began, so even the phase line never
// fired — sixteen moves in silence.
//
// This follows the IN-GAME register from CLAUDE.md, which is NOT the post-game
// review voice: present-tense teaching as a demo game unfolds, no "you
// blundered", no "the best move was" — nobody erred, it's a teaching line.
// "the lines come from stockfish best moves … we need the why stated behind
// the best moves as user watches."
//
// G0/G3: every clause is COMPUTED from the board (chess.js) or handed in from
// the engine. Nothing is invented. And per David 2026-07-19 — "be careful not
// to overstate the why, I don't want non-applicable reasons stated" — a clause
// is only spoken when it is TRUE of this move on this board, so a quiet move
// gets a short honest line rather than a padded one.
import { Chess, type Square } from 'chess.js';
import type { NarrationArrow } from '../types/walkthroughTree';
import { computeThreatDelta } from './engineDeltaLines';

export interface MoveNarration {
  /** Full spoken line for this move. Never empty. */
  say: string;
  /** ≤ 8-word cue for Brief verbosity. */
  short: string;
  /** Trail arrow for the move, plus a threat arrow when one exists. */
  arrows: NarrationArrow[];
}

const PIECE_WORD: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
const CENTRE = new Set(['d4', 'd5', 'e4', 'e5']);
const side = (wb: 'w' | 'b'): string => (wb === 'w' ? 'White' : 'Black');

/** Squares the piece now standing on `sq` attacks that hold an enemy piece. */
function attackedEnemies(fen: string, sq: Square): Array<{ square: string; piece: string }> {
  const out: Array<{ square: string; piece: string }> = [];
  try {
    const c = new Chess(fen);
    const me = c.get(sq);
    if (!me) return out;
    // Null-move so the mover can be shown "attacking" even when it isn't
    // their turn — the board fact is the same either way.
    for (const target of c.board().flat()) {
      if (!target || target.color === me.color) continue;
      if (c.attackers(target.square, me.color).includes(sq)) {
        out.push({ square: target.square, piece: PIECE_WORD[target.type] ?? 'piece' });
      }
    }
  } catch { /* unreadable position — say less, never guess */ }
  return out;
}

/** Is the piece on `sq` defended by its own side? */
function isDefended(fen: string, sq: Square, colour: 'w' | 'b'): boolean {
  try {
    return new Chess(fen).attackers(sq, colour).some((a) => a !== sq);
  } catch { return false; }
}

/**
 * Narrate ONE move of the play-out.
 *
 * @param fenBefore position before the move
 * @param fenAfter  position after it
 * @param san       the move in SAN
 * @param from/to   its squares (for the trail arrow)
 */
export function narrateContinuationMove(
  fenBefore: string,
  fenAfter: string,
  san: string,
  from: string,
  to: string,
): MoveNarration {
  const mover: 'w' | 'b' = fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
  const who = side(mover);
  const arrows: NarrationArrow[] = [{ from, to, color: 'orange' }];

  let movedType = 'p';
  let captured: string | null = null;
  let isCheck = false;
  let isMate = false;
  try {
    const c = new Chess(fenBefore);
    const mv = c.move(san);
    if (mv) {
      movedType = mv.piece;
      captured = mv.captured ? (PIECE_WORD[mv.captured] ?? 'piece') : null;
      const after = new Chess(fenAfter);
      isCheck = after.isCheck();
      isMate = after.isCheckmate();
    }
  } catch { /* fall through to the generic line below */ }
  const pieceWord = PIECE_WORD[movedType] ?? 'piece';

  // Clauses, strongest first — each one only added when TRUE on this board.
  const clauses: string[] = [];

  if (isMate) {
    return {
      say: `${who} delivers mate. That's the game.`,
      short: 'Checkmate.',
      arrows,
    };
  }
  if (captured) clauses.push(`taking the ${captured} on ${to}`);
  if (isCheck) clauses.push('with check, so the reply is forced');

  // What this piece now hits.
  const hits = attackedEnemies(fenAfter, to as Square).filter((h) => h.piece !== 'king');
  if (hits.length >= 2) {
    clauses.push(`hitting the ${hits[0].piece} on ${hits[0].square} and the ${hits[1].piece} on ${hits[1].square} at once`);
    for (const h of hits.slice(0, 2)) arrows.push({ from: to, to: h.square, color: 'green' });
  } else if (hits.length === 1 && !captured) {
    clauses.push(`eyeing the ${hits[0].piece} on ${hits[0].square}`);
    arrows.push({ from: to, to: hits[0].square, color: 'green' });
  }

  // Quiet-move observations — only when nothing sharper was true.
  if (clauses.length === 0) {
    if (CENTRE.has(to)) clauses.push('taking central space');
    else if (movedType === 'k') clauses.push('tucking the king to safety');
    else if (movedType === 'r' && /^[a-h]/.test(to)) clauses.push(`swinging the rook to the ${to[0]}-file`);
    else if (!isDefended(fenAfter, to as Square, mover)) clauses.push('stepping forward — undefended for the moment');
    else clauses.push('improving the piece');
  }

  // The live threat this move creates, if any — the same board-verified
  // computation the walkthrough's delta aside uses.
  const threat = computeThreatDelta(fenBefore, fenAfter, mover);
  if (threat) {
    clauses.push(threat.say.replace(/^And now\s+/i, '').replace(/\.$/, ''));
    for (const a of threat.arrows) arrows.push(a);
  }

  // NO CAP ON EITHER SIDE, AND THE TWO STAY TOGETHER.
  //
  // This spoke `clauses.slice(0, 2)` and drew `arrows.slice(0, 4)`, two
  // independent ceilings on the same turn — so a third clause (the live threat,
  // added last and often the most useful thing here) was dropped from the
  // sentence while the arrows it had already pushed stayed on the board. A mark
  // with nothing spoken behind it, and a truth the student never heard, from one
  // pair of slices.
  //
  // David 2026-08-10: "Remove all caps. We can add them back on once I see
  // everything working." If brevity is wanted back, cap the CLAUSES and drop
  // their arrows with them — never the two separately.
  const body = clauses.join(', ');
  return {
    say: `${who}'s ${pieceWord} to ${to}, ${body}.`,
    short: `${san} — ${clauses[0].split(',')[0]}`.slice(0, 60),
    arrows,
  };
}
