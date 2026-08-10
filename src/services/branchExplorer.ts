// A choose-your-own-path walk through an opening's real branches.
//
// David 2026-08-09, on what Learn with Coach was always supposed to be: "Like a
// build your own story book… We need an ability to move back and forth among
// the different branches. Once the user is done exploring one branch, however
// far he wants to take it, he can hit the next picker — as long as the
// selection persists — and then walk the other paths."
//
// The two words carrying the weight are "persists" and "back and forth". A
// picker that forgets is a picker you cannot return to: the student explores
// the Najdorf twelve moves deep, comes back, and is offered the same three
// roads with no memory of which one they just walked. So a fork is recorded the
// first time it is MET, keyed by the moves that reach it, and it accumulates —
// which roads have been walked, and how far. Returning is replaying a recorded
// move list, never reconstructing from memory.
//
// The branches themselves come from `openingBranches`, i.e. from the opening
// DATABASE. That is load-bearing: the corpus looks like it knows the roads out
// of a position and does not — half its anchored notes are filed at boards
// their own named opening never reaches (see `openingReachesPosition`).
import { branchesAt, type OpeningBranch } from './openingBranches';

export interface ExploredBranch extends OpeningBranch {
  /** Has the student walked this road yet? */
  walked: boolean;
  /** How far past the fork they took it, in plies. 0 until walked. */
  depth: number;
}

export interface Fork {
  /** Stable identity: the moves that reach this fork. Two routes that
   *  transpose here are the same fork and share its history. */
  id: string;
  /** The moves to replay to come back. */
  historySans: string[];
  branches: ExploredBranch[];
}

/** Every fork met this session, in the order they were met. */
export type ForkLog = Fork[];

const idOf = (historySans: readonly string[]): string => historySans.join(' ');

/**
 * Record the fork at this position, if there is one.
 *
 * Returns the log unchanged when the position offers no real choice — a single
 * continuation is not a fork, and a picker there would be offering a decision
 * the student does not have. Meeting a known fork again (a transposition, or a
 * return trip) does NOT reset what has been walked; that is the persistence.
 */
export function noteFork(log: ForkLog, historySans: readonly string[]): ForkLog {
  const id = idOf(historySans);
  if (log.some((f) => f.id === id)) return log;
  const branches = branchesAt(historySans);
  if (branches.length < 2) return log;
  return [
    ...log,
    {
      id,
      historySans: [...historySans],
      branches: branches.map((b) => ({ ...b, walked: false, depth: 0 })),
    },
  ];
}

/**
 * Mark a road as walked, and how far.
 *
 * `depth` only ever grows: coming back to a branch you already took nine moves
 * deep and stepping two moves in must not report it as shallower than it was.
 */
export function markWalked(
  log: ForkLog,
  forkId: string,
  san: string,
  depth: number,
): ForkLog {
  return log.map((f) => (f.id !== forkId ? f : {
    ...f,
    branches: f.branches.map((b) => (b.san !== san ? b : {
      ...b,
      walked: true,
      depth: Math.max(b.depth, depth),
    })),
  }));
}

/** The roads out of this fork nobody has taken yet. */
export function unwalked(fork: Fork): ExploredBranch[] {
  return fork.branches.filter((b) => !b.walked);
}

/**
 * The fork to offer next: the most recent one with a road still untaken.
 *
 * Most recent first because that is where the student is standing. Walking
 * back to the deepest unfinished choice is the story-book move — finish this
 * chapter's alternatives before rewinding to an earlier one.
 */
export function nextForkToOffer(log: ForkLog): Fork | null {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    if (unwalked(log[i]).length > 0) return log[i];
  }
  return null;
}

/** Is there anything left to explore anywhere? */
export function hasUnexplored(log: ForkLog): boolean {
  return nextForkToOffer(log) !== null;
}

/**
 * How to say where things stand, without a model inventing it.
 *
 * "Two of the three roads walked" is a fact about the log, and the student
 * needs it to know whether going back is worth it.
 */
export function progressAt(fork: Fork): { walked: number; total: number } {
  return {
    walked: fork.branches.filter((b) => b.walked).length,
    total: fork.branches.length,
  };
}

/**
 * Record a fork the student was SHOWN rather than one derived from the board.
 *
 * `noteFork` reads the roads out of the opening DB for a position. The line
 * PICKER has already chosen its own set — the named variations of a family,
 * with their ECO codes — and those are the roads the student actually saw. A
 * fork the student was offered and a fork the database knows about are not the
 * same thing, and the one worth remembering is the one they were shown.
 *
 * Keyed by the family name, so returning to the Sicilian later meets the same
 * fork with its history intact.
 */
export function noteFamilyFork(
  log: ForkLog,
  familyName: string,
  roads: ReadonlyArray<{ id: string; label: string }>,
): ForkLog {
  if (roads.length < 2) return log; // one road is not a choice
  const existing = log.find((f) => f.id === familyName);
  if (existing) {
    // Met again — keep every walk, and add any road that is new to the offer.
    const known = new Set(existing.branches.map((b) => b.san));
    const fresh = roads.filter((r) => !known.has(r.id));
    if (fresh.length === 0) return log;
    return log.map((f) => (f.id !== familyName ? f : {
      ...f,
      branches: [...f.branches, ...fresh.map((r) => ({
        san: r.id, name: r.label, eco: r.id, lines: 1, deepestPgn: [],
        walked: false, depth: 0,
      }))],
    }));
  }
  return [
    ...log,
    {
      id: familyName,
      historySans: [],
      branches: roads.map((r) => ({
        san: r.id, name: r.label, eco: r.id, lines: 1, deepestPgn: [],
        walked: false, depth: 0,
      })),
    },
  ];
}
