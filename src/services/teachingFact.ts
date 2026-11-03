// teachingFact — THE ONE FACT LEARN'S BOARD TEACHING HANDS ON
// (WO-STORY-MATRIX-01 P1-6b, M3: "producers emit CoachFact").
//
// `learnBoardTeaching` and `orderTeaching` used to hand the page a
// `TeachingHint` — a lane, words, squares and claims, with no kind, no seat,
// no computer and no board — and Review re-labelled each by its lane through a
// table of its own (`REVIEW_TAG_FOR_LANE`). Every fact they make is now the
// one fact (`CoachFact`): the computer that made it names itself, says what
// kind of fact it is, whose move it is about and the board it was computed
// on, and its place comes from its kind like every producer's. Beside it rides
// what the page does with it.
//
// A LEAF: types, and the one maker over coachFact and studentMoveNaming.
import { LOCAL_THREAD, placeFact, type CoachFact, type CoachFactKind, type ComputerName, type FactSeat } from './coachFact';
import { namesPlayableStudentMove, type NamesStudentMove } from './studentMoveNaming';
import type { FactProof } from './proof';
import type { FactStakes } from './factStakes';
import type { FacetRole } from './reviewFacetRank';
import type { LearnLane } from './learnTurnDoor';
import type { ArrowClaim } from './arrowDoor';
import type { MisconceptionTagId } from '../data/misconceptionTags';

/** A BOARD-TEACHING FACT — the one fact, with what the page does with it
 *  beside it: the Learn lane it rides (its speaking slot, until the Learn door
 *  reads the fact's own place, P1-6e), the analytics event it fires, the
 *  arrows that illustrate it and the held answer it records. Every one is
 *  made by `teachingFact`. */
export type TeachingFact = CoachFact & {
  lane: LearnLane;
  /** The analytics event this line fires when queued. */
  event: { name: string; props: Record<string, string | number | boolean> } | null;
  /** The arrows that illustrate THIS line, computed with it (David 2026-09-30:
   *  "make sure arrows are firing to illustrate the ideas being spoken"). They
   *  are validated by the arrow door on the live board and drawn only when the
   *  line survives the turn. */
  arrows: ArrowClaim[];
  /** DUAL-USE (P4): what this line proves the student CAN do, coupled at
   *  emission. Only HELD rows — a miss is already recorded by the live slip
   *  capture, so a broken row here would count it twice. */
  evidence?: TeachingEvidence;
  /** A reason for the student's OWN last move (`LaneFact.ownMoveReason`): the
   *  door keeps one reason per move across the turn's waves. */
  ownMoveReason?: true;
};

/** The held answer a board-teaching fact records (`recordTeachingEvidence`). */
interface TeachingEvidence { tag: MisconceptionTagId; posedImportance: number }

/** What a board-teaching computer says, before it is made the one fact:
 *  every field it answers itself — the computer that made it, the kind of
 *  fact it is, whose move or plan it is about, the board it was computed on,
 *  and the student's moves it names (REQUIRED, OS-10: the fact is held while
 *  one of them is legal for the student). */
interface TeachingParts {
  computer: ComputerName;
  kind: CoachFactKind;
  seat: FactSeat;
  fen: string;
  text: string;
  proof: FactProof;
  names: NamesStudentMove;
  squares: readonly string[];
  claims: readonly string[];
  /** What rides on it (`factStakes`), when its computer has a number. */
  stakes?: FactStakes;
  /** Teach or describe, when the computer knows (`CoachFact.role`): a
   *  consequence with no material number is still a reason, never an aside. */
  role?: FacetRole;
}

/** What the page does with the fact. */
interface TeachingRide {
  event: TeachingFact['event'];
  arrows: ArrowClaim[];
  evidence?: TeachingEvidence;
  ownMoveReason?: true;
}

/** THE ONE MAKER of a board-teaching fact. Its id is its computer and its
 *  claims (each claim is one idea, said once); its place comes from its kind
 *  (`placeFact`); it names a move the student has yet to find when one it
 *  names is legal for them on the board they move on next
 *  (`namesPlayableStudentMove`, answered once, here); it is on no plan thread. */
export function teachingFact(lane: LearnLane, p: TeachingParts, ride: TeachingRide): TeachingFact {
  const { names, stakes, role, kind, seat, ...said } = p;
  return {
    ...said,
    id: `${p.computer}:${p.claims.join('|')}`,
    ...placeFact(kind, seat),
    seat,
    stakes: stakes ?? null,
    namesStudentMove: namesPlayableStudentMove(names),
    thread: LOCAL_THREAD,
    ...(role ? { role } : {}),
    lane,
    event: ride.event,
    arrows: ride.arrows,
    ...(ride.evidence ? { evidence: ride.evidence } : {}),
    ...(ride.ownMoveReason ? { ownMoveReason: true as const } : {}),
  };
}
