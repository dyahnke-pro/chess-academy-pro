/**
 * THE LEARN FOCUS CARD (WO-LEARN-FOCUS-01 → WO-FOCUS-TACTICS-01, David
 * 2026-10-22: "Tactics and loose pieces should always be a focus … loose
 * pieces drop off because of tactics"). The design is `docs/LEARN-FOCUS.md`.
 *
 * Learn free play has ONE focus, every game: tactics, finding and preventing
 * them. Loose pieces are its first rung (a fork wins the loose piece), and
 * mates — yours, and their mate threat — are tactics. The focus is read from
 * both seats: DEFEND (your side — your loose pieces, their tactics against
 * you) and EXPLOIT (their side — their loose pieces, your shots). Each seat
 * names exactly the record tags its own checks write, so the record the focus
 * files is the record it reads: one vocabulary, both directions.
 *
 * The motif rows come from the ONE master list (`tacticMotifs`, WO-MOTIFS-01):
 * every motif's two tags sit in the focus's two seats.
 *
 * Phrases are FIXED and rotated on the ply (never random): repetition builds
 * the habit, and a replay says the same thing.
 */
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import { MOTIFS, tagOpenAt, type MotifLevel } from '../../data/tacticMotifs';
import type { CoachDials } from '../../missions/missionCard';

/** Every focus. A new member fails to compile until `FOCUS_CARDS` has its card. */
export type FocusId = 'tactics';

/** A focus id an older build wrote on a `learnFocusResults` row (before the
 *  three lessons became one, 2026-10-22). Read, never written. */
export type LegacyFocusId = 'loose-pieces' | 'kings';

/** Which side of the board the question is about. */
export type FocusSeat = 'defend' | 'exploit';

export interface FocusSeatSpec {
  /** The record tags this seat's checks write. */
  tags: readonly MisconceptionTagId[];
}

export interface FocusCard {
  id: FocusId;
  /** The focus in a sentence's subject position ("Tactics"). */
  title: string;
  seats: Record<FocusSeat, FocusSeatSpec>;
}

/** Every motif's tag for one seat, in master-list order: their side defends,
 *  your side exploits. */
function motifSeatTags(seat: FocusSeat): MisconceptionTagId[] {
  return Object.values(MOTIFS)
    .map((m) => (seat === 'defend' ? m.theirs : m.yours))
    .filter((t): t is MisconceptionTagId => t !== null);
}

export const FOCUS_CARDS: Record<FocusId, FocusCard> = {
  tactics: {
    id: 'tactics',
    title: 'Tactics',
    seats: {
      // A piece of yours left to be won and their threat ignored are the
      // first rung of the defend seat (the free-piece row is `hung-material`).
      defend: { tags: [...motifSeatTags('defend'), 'missed-opponents-threat'] },
      // A shot the classifier cannot name stays the catch-all — still a shot.
      exploit: { tags: [...motifSeatTags('exploit'), 'missed-tactic', 'calculation-depth'] },
    },
  },
};

/** A seat's tags at the open motif levels (WO-MOTIFS-01 decision 3): a
 *  locked motif is still RECORDED, but it is not asked, so a seat is read
 *  only over what is open. */
export function openSeatTags(id: FocusId, seat: FocusSeat, open: ReadonlySet<MotifLevel>): MisconceptionTagId[] {
  return FOCUS_CARDS[id].seats[seat].tags.filter((t) => tagOpenAt(t, open));
}

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
  developRules: 'off',
  plannedTrap: 'off',
  plantFreePiece: 'off',
  plantDepth: 1,
  trades: 'normal',
  rewinds: 'every-miss',
  strengthOffset: 0,
  bestPlay: 'off',
  steer: 'off',
};

/** How sharply a focus chance posed its question (clears the green bar). */
export const FOCUS_POSED_IMPORTANCE = 90;

/** Said before EVERY focus game (David 2026-10-22, his words). */
export const PREGAME_LINE = "Today's focus is tactics, finding and preventing them! You will have at least one chance this game for a winning tactic, but your opponent will also be trying to set up its own tactics. Stay vigilant!";

/** The one exception outside the focus, once a game (rungs 0–1). */
export const DECIDING_LINE = 'That one decides the game. Want it back?';

/** Closes the game-over line. */
export const REVIEW_HAS_THE_REST = 'Review has the rest.';
