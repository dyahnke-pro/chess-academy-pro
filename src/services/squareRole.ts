// squareRole — WHAT A SQUARE IS FOR (David 2026-10-15: "Start replacing
// descriptions with teachings. That is how we keep narrations from running
// away"). "The knight now fights for d5" says what a piece touches; the
// teaching is why that square matters, read on the board:
//   - their pawn's next step       → "holding back their d-pawn"
//   - a hole no pawn of theirs can cover → "a square no pawn of theirs can cover"
//   - a square their piece wants   → "keeping their knight off it"
//   - your own pawn's next step     → "backing your d-pawn's push there"
// No role → no clause: a square without a reason is scenery, and is not said.
// Leaf: chess.js and the shared piece values.
import type { Chess, Color, Square } from 'chess.js';
import { noPawnCanChallenge } from './outpost';
import { CAPTURE_VALUE } from './pieceValues';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const NONE: ReadonlySet<string> = new Set<string>();

/** `owner` is how the OTHER side's pieces are said from the speaker's seat:
 *  'their' to the student about the opponent, 'your' about the student, 'the'
 *  where the line names no seat. Required, so a caller decides its seat. */
export function squareRole(
  chess: Chess,
  sq: Square,
  me: Color,
  owner: 'their' | 'your' | 'the',
  piece: 'covers' | 'stands',
  named: ReadonlySet<string> = NONE,
): string | null {
  return squareRoleWords(chess, sq, me, owner, piece, named)?.full ?? null;
}

/** A square's role two ways: `full`, said after the square ("d5, holding back
 *  their d-pawn"), and `bare`, said with no square at all ("holding back their
 *  d-pawn") — for a sentence that already has its squares on the board and
 *  must not read a third one out (David 2026-11-05). */
interface RoleWords { full: string; bare: string }

function squareRoleWords(
  chess: Chess,
  sq: Square,
  me: Color,
  owner: 'their' | 'your' | 'the',
  /** Does the piece COVER the square, or will it STAND on it? Required (prod
   *  walk 2026-10-19: a plan route said "on g6 it would be backing your
   *  g-pawn's push there" — a bishop standing on g6 blocks that push). */
  piece: 'covers' | 'stands',
  /** Squares of their pieces the sentence has already named ("with tempo,
   *  hitting the queen on d5"): no role re-describes them ("…d5, attacking the
   *  queen there, and e4, keeping the queen on d5 off it"). */
  named: ReadonlySet<string> = NONE,
): RoleWords | null {
  const them: Color = me === 'w' ? 'b' : 'w';
  const ownerWord = owner === 'the' ? 'the' : owner;
  // WITH NO SEAT the piece is named by its square ("holding back the pawn on
  // d7"), which the seat stamper turns into your/their — never "the enemy"
  // (lead 2026-10-20, Review noise walk: say your/their).
  // …and by its file, so the sentence reads out no third square (David
  // 2026-11-05): "holding back the d-pawn".
  const theirPawn = (at: string): string => (owner === 'the' ? `the ${at[0]}-pawn` : `${owner} ${file}-pawn`);
  const file = sq[0];
  const rank = Number(sq[1]);
  // AN ENEMY PIECE ON IT is the reason itself (ship #72: "Nf3 attacks the
  // e5 pawn" was lost when occupied squares were dropped); your own piece on
  // it is only guarded — no reason, not said.
  const on = chess.get(sq);
  // With no seat, the square already says which piece: "attacking the pawn there".
  if (on) {
    if (on.color !== them || on.type === 'k' || named.has(sq)) return null;
    const attacking = `attacking ${ownerWord} ${NAME[on.type]} there`;
    const hitting = `hitting ${ownerWord} ${on.type === 'p' ? `${file}-pawn` : NAME[on.type]}`;
    // A PIECE ONLY ITS KING GUARDS is the classic target (P4: the Italian's
    // written note — "f7, the only square near Black's king defended by
    // nothing but the king"; the computed line said only "attacking their
    // pawn there"). Read on the board: its one guard is the king.
    const guards = chess.attackers(sq, them);
    const kingOnly = guards.length === 1 && chess.get(guards[0])?.type === 'k';
    // A HIT IS A THREAT, OR IT IS NOT A REASON (David 2026-11-05: "Quiet
    // moves should get something … I don't want 'it attacks x'"; the Colle
    // read, 5…Nc6: "attacking your pawn there" of a d4 pawn three pieces
    // guard). Said only when the attackers outnumber its guards, the cheapest
    // attacker is worth less than it, or only its king guards it.
    const hits = chess.attackers(sq, me);
    // A king is an attacker that can never be the cheaper one (CAPTURE_VALUE k).
    const cheapest = Math.min(...hits.map((s) => CAPTURE_VALUE[chess.get(s)?.type ?? 'k']));
    const pressed = guards.length === 0 || hits.length > guards.length || cheapest < CAPTURE_VALUE[on.type];
    if (!pressed && !kingOnly) return null;
    const only = kingOnly ? `, which only ${owner === 'the' ? 'its' : owner} king guards` : '';
    return { full: `${attacking}${only}`, bare: `${hitting}${only}` };
  }
  // THEIR PAWN'S NEXT STEP: a pawn of theirs one square behind (or two, from
  // its start rank with the way clear).
  const back = them === 'w' ? -1 : 1;
  const one = `${file}${rank + back}` as Square;
  const p1 = chess.get(one);
  const heldBack = { full: '', bare: `holding back ${ownerWord} ${file}-pawn` };
  if (p1 && p1.type === 'p' && p1.color === them) return { ...heldBack, full: `holding back ${theirPawn(one)}` };
  const two = `${file}${rank + 2 * back}` as Square;
  const p2 = chess.get(two);
  const startRank = them === 'w' ? 2 : 7;
  if (!p1 && p2 && p2.type === 'p' && p2.color === them && Number(two[1]) === startRank) return { ...heldBack, full: `holding back ${theirPawn(two)}` };
  // YOUR PAWN'S PUSH: a square your own pawn steps to next (one step, or two
  // from its start rank) — a piece covering it backs the advance.
  const fwd = me === 'w' ? -1 : 1;
  const own1 = chess.get(`${file}${rank + fwd}` as Square);
  const own2 = chess.get(`${file}${rank + 2 * fwd}` as Square);
  const ownStart = me === 'w' ? 2 : 7;
  // With no seat, the push says whose: a piece backs its own side's advance.
  const mine = owner === 'their' ? 'your' : owner === 'your' ? 'their' : 'the';
  if (piece === 'covers' && ((own1 && own1.type === 'p' && own1.color === me) || (!own1 && own2 && own2.type === 'p' && own2.color === me && rank + 2 * fwd === ownStart))) {
    return { full: `backing ${mine} ${file}-pawn's push there`, bare: `backing ${mine} ${file}-pawn's push` };
  }
  // A HOLE: no pawn of theirs on a neighbouring file can ever reach a square
  // that attacks it — the one hole test (`noPawnCanChallenge`).
  const coverable = !noPawnCanChallenge(chess, sq, me);
  // A hole is a square in the middle of the board: the back ranks are never
  // covered by pawns, and saying so teaches nothing.
  // A hole has no square to name its owner by, so with no seat it is not said.
  if (!coverable && rank >= 3 && rank <= 6 && owner !== 'the') {
    const hole = `a square no pawn of ${owner === 'your' ? 'yours' : 'theirs'} can cover`;
    return { full: hole, bare: `eyeing ${hole}` };
  }
  // A SQUARE THEIR PIECE WANTS: one of their minor or major pieces reaches it.
  const wantsAt = chess.attackers(sq, them).find((s) => { const p = chess.get(s); return !!p && p.type !== 'p' && p.type !== 'k' && !named.has(s); });
  const wants = wantsAt ? chess.get(wantsAt) : null;
  if (wants && wantsAt) {
    return {
      full: owner === 'the' ? `keeping the ${NAME[wants.type]} on ${wantsAt} off it` : `keeping ${owner} ${NAME[wants.type]} off it`,
      bare: `keeping ${ownerWord} ${NAME[wants.type]} off a square it wants`,
    };
  }
  return null;
}

/** The squares that HAVE a role, each with it, joined so each item keeps its
 *  own comma ("d4, holding back their d-pawn, and e5, …"). Null when none do:
 *  a list of squares without reasons is not said. */
export function namedSquares(chess: Chess, squares: readonly string[], me: Color, owner: 'their' | 'your' | 'the', named: ReadonlySet<string> = NONE): string | null {
  const items = squares.flatMap((sq) => { const role = squareRoleWords(chess, sq as Square, me, owner, 'covers', named); return role ? [{ sq, role }] : []; });
  if (!items.length) return null;
  const said = items.map((i) => `${i.sq}, ${i.role.full}`);
  if (said.length <= 2) return said.length === 1 ? said[0] : `${said[0]}, and ${said[1]}`;
  // THREE OR MORE: one square read out, the rest by what they do (David
  // 2026-11-05: "We still need to name squares. We just need to do it like a
  // human would") — every one still lit by the fact's squares. The piece it
  // attacks leads, the most concrete of them.
  const lead = items.find((i) => i.role.full.startsWith('attacking')) ?? items[0];
  const rest = items.filter((i) => i !== lead).map((i) => i.role.bare);
  return `${lead.sq}, ${lead.role.full}, and also ${rest.length === 1 ? rest[0] : `${rest.slice(0, -1).join(', ')} and ${rest[rest.length - 1]}`}`;
}

/** The squares `namedSquares` says — the ones with a role, in its order. A
 *  fact marks and claims exactly these, never a square its sentence leaves out
 *  (G8.5: no marks without words). */
export function squaresWithRole(chess: Chess, squares: readonly string[], me: Color, owner: 'their' | 'your' | 'the', named: ReadonlySet<string> = NONE): string[] {
  return squares.filter((sq) => squareRole(chess, sq as Square, me, owner, 'covers', named) !== null);
}
