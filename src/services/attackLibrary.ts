// attackLibrary — KNOWN ATTACKING STRUCTURES, by their conditions (computers
// batch 2; the reference coach's "here the g- and h-pawn storm simply works",
// and RULEBOOK F18: never "it feels right" — a known structure is named by the
// conditions that make it work, each read off the board).
//
// An entry speaks only when EVERY condition holds on this board; the proof is
// the squares each condition stands on. The engine does not decide the entry
// (it is knowledge, the pattern's reputation), but an entry the engine
// disagrees with is never said: the student's side must not stand worse.
//
// Entries today:
//   opposite-storm — the kings castled on opposite wings, your own king not on
//                    the attacked wing, and a hook in their shelter your pawn
//                    reaches (the hook itself is `moveInsight.pawnHook`; this
//                    adds the structure's other conditions and its name).
// The Greek gift is its own computer (`moveInsight.greekGift`) and is not
// repeated here. Pure: chess.js.
import { Chess, type Square } from 'chess.js';
import { pawnHook } from './moveInsight';
import { squaresProof, type Proof } from './proof';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface KnownAttack {
  id: 'opposite-storm';
  text: string;
  squares: string[];
  proof: Proof;
  claim: string;
}

function king(c: Chess, color: 'w' | 'b'): string | null {
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}

function wing(sq: string): 'king' | 'queen' | null {
  const f = sq.charCodeAt(0) - 97;
  return f >= 5 ? 'king' : f <= 2 ? 'queen' : null;
}

/** The known attacking structure on this board for `me`, or null.
 *  `studentCp` is the engine's read from `me`'s seat, when the surface has it:
 *  a structure is never recommended from a worse position. */
export function knownAttack(fen: string, me: 'w' | 'b', studentCp: number | null): KnownAttack | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (studentCp !== null && studentCp < 0) return null;
  const them = me === 'w' ? 'b' : 'w';
  const mine = king(c, me); const theirs = king(c, them);
  if (!mine || !theirs) return null;
  const myHome = me === 'w' ? '1' : '8'; const theirHome = me === 'w' ? '8' : '1';
  // Both kings castled (on their back rank, on a wing), on OPPOSITE wings.
  if (mine[1] !== myHome || theirs[1] !== theirHome) return null;
  const mw = wing(mine); const tw = wing(theirs);
  if (!mw || !tw || mw === tw) return null;
  // Queens on: a storm is a middlegame attack.
  if (!c.board().flat().some((p) => p && p.type === 'q' && p.color === me)) return null;
  const hook = pawnHook(fen, me);
  if (!hook) return null;
  // The storm pawn must not be part of your own king's cover (opposite wing
  // already says so), and the hook must stand in their king's shelter.
  if (Math.abs(hook.hook.charCodeAt(0) - theirs.charCodeAt(0)) > 1) return null;
  const pawn = c.get(hook.pawn as Square);
  if (!pawn || pawn.type !== 'p' || pawn.color !== me) return null;
  const text = rotateStem([
    `This is a known attacking structure: kings on opposite wings, and their pawn on ${hook.hook} is a hook. Your pawn from ${hook.pawn} reaches ${hook.contact}, and since your own king is on the other wing, the pawn storm simply works here.`,
    `A textbook pattern: castled on opposite sides, a hook on ${hook.hook} in front of their king, and your king safe on the other wing — so the pawn storm from ${hook.pawn} to ${hook.contact} is the plan, with nothing of yours left behind.`,
  ], stemKeyOf(fen));
  const squares = [mine, theirs, hook.hook, hook.pawn, hook.contact];
  const proof = squaresProof(`Your king on ${mine}, theirs on ${theirs}; their pawn on ${hook.hook}, and your pawn from ${hook.pawn} reaches ${hook.contact}`, squares);
  if (!proof) return null;
  return { id: 'opposite-storm', text, squares, proof, claim: `known-attack:opposite-storm:${hook.hook}` };
}
