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
  | 'order';

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
  'keep-working': 'develop',
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

/** ONE IDEA, TWO SENTENCES: the same kind on overlapping squares (or, where
 *  either names no square beyond the move, the same kind) is the same idea —
 *  said once, by whichever computer leads it. A different kind on the same
 *  squares is a second job of the move. */
export function sameIdea(a: { idea: IdeaKind; squares: readonly string[] }, b: { idea: IdeaKind; squares: readonly string[] }): boolean {
  if (a.idea !== b.idea) return false;
  if (a.squares.length === 0 || b.squares.length === 0) return true;
  return a.squares.some((s) => b.squares.includes(s));
}
