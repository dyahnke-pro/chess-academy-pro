/**
 * LEARN FOCUS CARDS (WO-LEARN-FOCUS-01, David 2026-10-21) — the design is
 * `docs/LEARN-FOCUS.md`.
 *
 * Learn free play teaches ONE focus per game, chosen from the user's record.
 * A focus is a PATTERN FAMILY read from both seats: DEFEND (your side — your
 * loose pieces, their tactics against you, your king) and EXPLOIT (their side —
 * their loose pieces, your tactics, their king). Each seat names exactly the
 * record tags its own check writes, so the picker reads the rows the focus
 * records: one vocabulary, both directions.
 *
 * The record has ONE tag for "you had a winning shot" (`missed-tactic`), so
 * every exploit seat writes it; the defend seats are disjoint and decide the
 * picker. Splitting `missed-tactic` by motif needs a population difficulty
 * refit (`skill-difficulty.json`) — a follow-up, not a reason to invent a tag.
 *
 * Phrases are FIXED and rotated on the ply (never random): repetition builds
 * the habit, and a replay says the same thing.
 */
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import type { CoachDials } from '../../missions/missionCard';
import { countWord } from '../../utils/andList';

/** Every focus. A new member fails to compile until `FOCUS_CARDS` has its card. */
export type FocusId = 'loose-pieces' | 'tactics' | 'kings';

/** Which side of the board the question is about. */
export type FocusSeat = 'defend' | 'exploit';

/** How much the coach scaffolds this game, from the focus's hold state. */
export type FocusMode =
  /** Red or grey: named before the game, the first chance asked, misses taught. */
  | 'teach'
  /** Short (75–89%): unannounced; a taught miss reveals it. */
  | 'test'
  /** Green (every focus green): a silent watch, misses still taught. */
  | 'watch';

/** A gate in the ladder: a focus may be picked only when this one holds ≥ 75%. */
export interface FocusGate {
  focus: FocusId;
  /** One seat only; absent = the whole focus. */
  seat?: FocusSeat;
}

export interface FocusSeatSpec {
  /** The record tags this seat's check writes and the picker reads. */
  tags: readonly MisconceptionTagId[];
  /** "you left three pieces loose" — the seat's misses in the user's recent games. */
  missesWords: (n: number) => string;
}

export interface FocusCard {
  id: FocusId;
  /** The focus in a sentence's subject position ("Loose pieces"). */
  title: string;
  /** Said before a red/grey game: "Today: …". */
  announce: string;
  /** Said before a grey game (never asked) — why it comes first. */
  greyWhy: string;
  seats: Record<FocusSeat, FocusSeatSpec>;
  /** Must hold ≥ 75% before this focus can be picked (the ladder). */
  gates: readonly FocusGate[];
}

export const FOCUS_CARDS: Record<FocusId, FocusCard> = {
  'loose-pieces': {
    id: 'loose-pieces',
    title: 'Loose pieces',
    announce: 'Today: loose pieces, yours and theirs.',
    greyWhy: 'It is the first thing every strong player checks.',
    seats: {
      defend: { tags: ['hung-material', 'missed-opponents-threat'], missesWords: (n) => (n === 1 ? 'you left a piece loose' : `you left ${countWord(n)} pieces loose`) },
      exploit: { tags: ['missed-tactic'], missesWords: (n) => (n === 1 ? 'you let a free piece go' : `you let ${countWord(n)} free pieces go`) },
    },
    gates: [],
  },
  tactics: {
    id: 'tactics',
    title: 'Tactics',
    announce: 'Today: tactics — forks, pins and skewers, yours and theirs.',
    greyWhy: 'Most games at this level are decided by one.',
    seats: {
      defend: { tags: ['missed-their-fork', 'missed-their-pin', 'missed-their-skewer', 'missed-their-discovery'], missesWords: (n) => (n === 1 ? 'one of their tactics landed' : `${countWord(n)} of their tactics landed`) },
      exploit: { tags: ['missed-tactic', 'calculation-depth'], missesWords: (n) => (n === 1 ? 'you missed a shot' : `you missed ${countWord(n)} shots`) },
    },
    gates: [{ focus: 'loose-pieces' }],
  },
  kings: {
    id: 'kings',
    title: 'The kings',
    announce: 'Today: the kings — yours and theirs.',
    greyWhy: 'A king left in the open loses faster than anything else.',
    seats: {
      defend: { tags: ['king-stuck-center', 'weakened-king-safety', 'missed-their-mate'], missesWords: (n) => (n === 1 ? 'your king got caught once' : `your king got caught ${countWord(n)} times`) },
      exploit: { tags: ['missed-tactic', 'overvalued-attack'], missesWords: (n) => (n === 1 ? 'you missed an attack on their king' : `you missed ${countWord(n)} attacks on their king`) },
    },
    gates: [{ focus: 'loose-pieces' }],
  },
};

/** The ladder order: grey focuses are taught in this order. */
export const FOCUS_LADDER: readonly FocusId[] = ['loose-pieces', 'tactics', 'kings'];

/** Every tag a focus owns, both seats. */
export function focusTags(id: FocusId): ReadonlySet<MisconceptionTagId> {
  const c = FOCUS_CARDS[id];
  return new Set([...c.seats.defend.tags, ...c.seats.exploit.tags]);
}

/** The coach's dials in a focus game (`docs/LEARN-FOCUS.md` §7): its own
 *  level, attacks allowed, NO planned trap (a gift is the Campaign's job), no
 *  plant; the focus scorer is weighted through `MissionDialsOpt.focus`. */
export const FOCUS_DIALS: CoachDials = {
  attacksOnPieces: 'on',
  plannedTrap: 'off',
  plantFreePiece: 'off',
  trades: 'normal',
  rewinds: 'every-miss',
  strengthOffset: 0,
  steer: 'off',
};

/** How sharply a focus chance posed its question (clears the green bar). */
export const FOCUS_POSED_IMPORTANCE = 90;

/** Said before an unannounced game (short, or a silent watch). */
export const UNANNOUNCED_LINE = "One skill is being watched today — you'll find out which after the game.";

/** The one exception outside the focus, once a game. */
export const DECIDING_LINE = 'That one decides the game. Want it back?';

/** Closes the game-over line. */
export const REVIEW_HAS_THE_REST = 'Review has the rest.';
