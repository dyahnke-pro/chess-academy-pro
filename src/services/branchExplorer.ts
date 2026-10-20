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
import { Chess } from 'chess.js';
import { branchesAt, type OpeningBranch } from './openingBranches';
import { masterMovesCachedSync } from './masterPlayLookup';

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

// ── THE ADVENTURE BOOK IN FREE PLAY (David 2026-10-19) ──────────────────────
//
// "a choose your own adventure path so a user can have the computer play
// different moves at the forks" → "default to the most popular lines, but
// pickers can adjust the lines if the user wants" → "learn still needs to be
// adaptive. cannot have coach outplaying new opponents".
//
// So the roads at THEIR fork are the moves players at the student's own level
// play there (the rating-band book the computer already draws from), most
// played first — the computer takes the first by default — and the masters'
// main line is marked among them, added when the band never plays it. Every
// road is a real move from real games (G3); the names come from the opening
// DB where a named line starts there.

/** A road out of their fork. */
export interface Road {
  san: string;
  /** Games at the student's level that went this way (0 for a masters-only road). */
  games: number;
  /** Its share of those games, 0–1. */
  share: number;
  /** The opening line it starts, when the DB names one. */
  name: string | null;
  /** The masters' most played move here — the main line. */
  main: boolean;
}

/** A road is a real choice when at least 1 game in 20 at this level goes
 *  that way, over at least this many games. */
const ROAD_MIN_SHARE = 0.05;
const ROAD_MIN_GAMES = 20;

/**
 * The roads out of this board from the band's candidates (`getAdaptiveMove`'s
 * `roads`), most played first, with the masters' main line marked (and added
 * when the band never plays it). Illegal moves are dropped.
 */
export function roadsFrom(
  fen: string,
  historySans: readonly string[],
  candidates: ReadonlyArray<{ san: string; games: number }>,
): Road[] {
  let legal: Set<string>;
  try { legal = new Set(new Chess(fen).moves()); } catch { return []; }
  const total = candidates.reduce((n, c) => n + c.games, 0);
  const named = new Map(branchesAt(historySans).map((b) => [b.san, b.name]));
  const mainSan = [...(masterMovesCachedSync(fen) ?? [])]
    .filter((m) => m.games > 0 && legal.has(m.san))
    .sort((a, b) => b.games - a.games)[0]?.san ?? null;
  const roads: Road[] = total <= 0 ? [] : candidates
    .filter((c) => legal.has(c.san) && c.games >= ROAD_MIN_GAMES && c.games / total >= ROAD_MIN_SHARE)
    .sort((a, b) => b.games - a.games)
    .map((c) => ({ san: c.san, games: c.games, share: c.games / total, name: named.get(c.san) ?? null, main: c.san === mainSan }));
  if (roads.length > 0 && mainSan && !roads.some((r) => r.san === mainSan)) {
    roads.push({ san: mainSan, games: 0, share: 0, name: named.get(mainSan) ?? null, main: true });
  }
  return roads;
}

/** A fork is a board with more than one road. */
export function isRoadFork(roads: readonly Road[] | null | undefined): roads is Road[] {
  return !!roads && roads.length > 1;
}

/** The chip's label: the line's own name ("Najdorf Variation"), else the move. */
export function roadLabel(road: Road): string {
  if (!road.name) return road.san;
  const part = road.name.split(':').pop()?.split(',')[0]?.trim();
  return part && part.length > 0 ? part : road.name;
}

/** The fork's identity for the memory: the position, so transpositions share
 *  their walked roads. */
export function roadForkId(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}
