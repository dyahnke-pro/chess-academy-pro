// ONE IDEA VOCABULARY (WO-ONE-COACH-01). The computers that say what a move
// does each name the idea in their own words and their own enum — the book
// job's `stopsPin`, the fundamentals' `prophylaxis`, the board teacher's
// "takes g4 away from their bishop" — so a composer could not tell that three
// lines on h3 were one idea (the Danya bench: "keeps their bishop off g4",
// "takes the g4 square away from their bishop", "denying their bishop the g4
// square"), nor that "it keeps their bishop off g4" and "it makes luft" are two
// jobs of one move. Every producer maps its own kind here, by a `Record`, so a
// new kind fails to compile until someone says which idea it is.
import type { BookJobKind } from './bookMoveWhy';
import type { MoveFundamentalId } from './moveFundamentals';

export type IdeaKind =
  | 'mate' | 'win-material' | 'trade' | 'recapture' | 'rescue' | 'guard' | 'threat' | 'pressure'
  | 'tactic' | 'check' | 'prevent' | 'prepare' | 'unpin' | 'develop' | 'castle' | 'king-safety'
  | 'attack-king' | 'center' | 'space' | 'outpost' | 'file' | 'diagonal' | 'passed-pawn' | 'promote'
  | 'weakness' | 'tempo' | 'king-activity' | 'route' | 'set-up'
  /** The moves you'd weigh, and why each falls short (the choices step). */
  | 'choice'
  /** Move order: "not yet — first this, and take after". */
  | 'order'
  /** A choice between plans: the engine's two best lines carry two. */
  | 'plan'
  /** The position's standing in words — who is better and the board's reason
   *  ("you're a little better — their king is the more exposed"; "a pawn down,
   *  but level: two pieces ahead in development"). */
  | 'eval';

export const BOOK_JOB_IDEA: Record<BookJobKind, IdeaKind> = {
  rescue: 'rescue', guard: 'guard', stopsPin: 'prevent', stopsPush: 'prevent', tempo: 'tempo',
  prepares: 'prepare', castle: 'castle', develop: 'develop', center: 'center', recapture: 'recapture',
  capture: 'win-material', fork: 'tactic', attack: 'threat',
};

export const FUNDAMENTAL_IDEA: Record<MoveFundamentalId, IdeaKind> = {
  'king-safety': 'castle',
  outpost: 'outpost',
  development: 'develop',
  center: 'center',
  'open-file': 'file',
  'king-activity': 'king-activity',
  promotion: 'promote',
  'passed-pawn': 'passed-pawn',
  luft: 'king-safety',
  space: 'space',
  prophylaxis: 'prevent',
  'open-diagonal': 'prepare',
  tempo: 'tempo',
  'attack-defender': 'pressure',
  // A piece a pawn kicked, stepping out of its reach: the rescue the move's
  // job says ("takes your bishop out of reach of their pawn on f4"), so the
  // two are one idea, said once — as 'develop' it was said twice on 189 of
  // 259 such moves in his games, and its stock phrase was keyed as develop's.
  'keep-working': 'rescue',
  'prepare-break': 'prepare',
  'development-complete': 'develop',
  'rook-behind-pawn': 'file',
  'queen-off-file': 'file',
  'pile-on-pin': 'pressure',
  'remove-guard': 'tactic',
};

/** The claim an idea makes on its squares — the say-once key. */
export function ideaClaim(kind: IdeaKind, squares: readonly string[]): string {
  return `idea:${kind}:${[...new Set(squares)].sort().join(',')}`;
}

/** WHAT KIND OF JOB AN IDEA IS — the move's material (it wins, trades, takes
 *  back or saves something), an attack, a defence, where a piece now stands,
 *  the pawns, or the thinking (the choices, the order, the plan). Exhaustive:
 *  a new idea fails to compile until it is placed. */
export type IdeaFamily = 'material' | 'attack' | 'defence' | 'placement' | 'pawns' | 'thinking';
export const IDEA_FAMILY: Record<IdeaKind, IdeaFamily> = {
  'win-material': 'material', trade: 'material', recapture: 'material', rescue: 'material',
  mate: 'attack', threat: 'attack', pressure: 'attack', tactic: 'attack', check: 'attack', 'attack-king': 'attack',
  tempo: 'attack', 'set-up': 'attack',
  guard: 'defence', prevent: 'defence', unpin: 'defence', castle: 'defence', 'king-safety': 'defence',
  develop: 'placement', center: 'placement', space: 'placement', outpost: 'placement', file: 'placement',
  diagonal: 'placement', route: 'placement', 'king-activity': 'placement', prepare: 'placement',
  'passed-pawn': 'pawns', promote: 'pawns', weakness: 'pawns',
  choice: 'thinking', order: 'thinking', plan: 'thinking', eval: 'thinking',
};

/** A BY-PRODUCT, NOT A SECOND JOB (round 3, M-TWO-JOBS): when a move wins,
 *  trades, takes back or saves material, that is why it is played — where the
 *  piece now stands is what came with it ("Qxa1+ wins a rook. It also takes
 *  aim at the center"). His second jobs behind a material move are concrete
 *  ones: "takes a pawn and attacks a rook". Measured on his tagged speedruns
 *  (7,333 moves of his games, 130 he calls two jobs): holding it takes a
 *  second job off 4 of his 130 and 272 of the other 7,203, the same on either
 *  half of his videos (lift 1.38 / 1.39). */
export function isByProduct(lead: IdeaKind, second: IdeaKind): boolean {
  return IDEA_FAMILY[lead] === 'material' && IDEA_FAMILY[second] === 'placement';
}

/** ONE IDEA, TWO SENTENCES: the same kind on overlapping squares (or, where
 *  either names no square beyond the move, the same kind) is the same idea —
 *  said once, by whichever computer leads it. A different kind on the same
 *  squares is a second job of the move. */
export function sameIdea(a: { idea: IdeaKind; squares: readonly string[] }, b: { idea: IdeaKind; squares: readonly string[] }): boolean {
  if (a.idea !== b.idea) return false;
  // A RESCUE IS THE MOVED PIECE'S: a move saves one piece, whatever square
  // each line names beside it — the attacker it leaves ("out of reach of their
  // pawn on a6") or what it keeps hitting ("keeps the pressure on the knight
  // on c6"). Ba4 said both (round 3).
  if (a.idea === 'rescue') return true;
  if (a.squares.length === 0 || b.squares.length === 0) return true;
  return a.squares.some((s) => b.squares.includes(s));
}
