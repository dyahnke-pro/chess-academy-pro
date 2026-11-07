/**
 * THE COACH'S FOUR MOMENTS (WO-COACH-NEXT-TO-YOU-01 C1, David 2026-11-06: "I
 * want it to feel like a chess coach is sitting next to you walking you
 * through a game. Teaching you how to identify weaknesses, induce mistakes,
 * identify tactics, set up tactics").
 *
 * A Learn turn has two halves: the answer to the move the student just played
 * (the credit or the why — the composer's one thought), and at most ONE moment
 * about what comes next. Each moment teaches one skill:
 *   1. `their-move` — their move lands: read it (identify weaknesses);
 *   2. `question`   — your turn at a real decision (identify tactics);
 *   3. `build`      — nothing tactical yet: the plan that builds one (set up
 *                     tactics);
 *   4. `bait`       — their likely reply is a mistake (induce mistakes).
 *
 * The part of the turn a fact belongs to is DERIVED from its group and seat
 * (`GROUP_PART`), the same way its step is (`GROUP_STEP`) — never typed per
 * lane, so a new kind lands in its group's part. A LEAF: types and tables.
 */
import type { FactGroup, FactSeat } from './coachFact';
import type { HeatState } from './holdRate';

export type CoachMoment = 'their-move' | 'question' | 'build' | 'bait';

/** Where a fact sits in a Learn turn: the answer to the student's own move,
 *  one of the four moments, or an aside that rides any turn (the opening's
 *  name). */
export type TurnPart = 'your-move' | CoachMoment | 'aside';

/** The skill each moment teaches. */
export type MomentSkill = 'weaknesses' | 'tactics' | 'set-up' | 'induce';

/** 🔒 One skill per moment: a fifth moment fails to compile until it names
 *  the skill it teaches. */
export const MOMENT_SKILL: Record<CoachMoment, MomentSkill> = {
  'their-move': 'weaknesses',
  question: 'tactics',
  build: 'set-up',
  bait: 'induce',
};

/** 🔒 THE PART OF THE TURN EACH GROUP IS SAID IN. A new group fails to compile
 *  until it says where it belongs.
 *  - what is attacked, what is forcing on the board and the moves to weigh
 *    are the question before the student's next move, whichever seat it
 *    serves (find yours, stop theirs) — the door's thread for the move to
 *    come (`CORE_STEPS`);
 *  - what a move changed is the answer to the student's move on their move,
 *    the read of their move on theirs; their side is always their move;
 *  - the line played out and the verdict answer the move just played;
 *  - "not yet, first this", the plan, the structure, the technique and the
 *    concepts are what builds the next chance;
 *  - a habit closes whichever move it is about. */
export const GROUP_PART: Record<FactGroup, (seat: FactSeat) => TurnPart> = {
  danger: () => 'question',
  tactics: () => 'question',
  move: (seat) => (seat === 'student' ? 'your-move' : 'their-move'),
  theirSide: () => 'their-move',
  choices: () => 'question',
  notYet: () => 'build',
  line: () => 'your-move',
  verdict: () => 'your-move',
  habit: (seat) => (seat === 'student' ? 'your-move' : 'their-move'),
  story: () => 'build',
  structure: () => 'build',
  technique: () => 'build',
  concepts: () => 'build',
  name: () => 'aside',
};

/** The part of the turn a fact of this group and seat belongs to. */
export function turnPartOf(group: FactGroup, seat: FactSeat): TurnPart {
  return GROUP_PART[group](seat);
}

/** Is this part one of the four moments (not the answer to the student's own
 *  move, not an aside)? */
export function isMoment(part: TurnPart): part is CoachMoment {
  return part !== 'your-move' && part !== 'aside';
}

/** HOW MUCH A MOMENT SAYS, BY THE STUDENT'S OWN RECORD OF ITS SKILL (C2,
 *  David 2026-11-06: "It also needs to adapt to the user. Give more guidance
 *  in some areas, but stay silent in others"). The hold rate's state
 *  (`holdRate.holdState`) — the same one computer the heat map, the fade and
 *  the threat voice read:
 *  - `ask-first`  red (< 75% held) or grey (never posed enough — absent is
 *                 not mastered): the question before the move, the why after;
 *  - `after-only` amber (75–89%): nothing before the move, the clue only
 *                 after a miss;
 *  - `silent`     green (≥ 90%): nothing before the move and no clue — a
 *                 miss is still explained (the door), and counts against the
 *                 green. Silence on green is how a find stays proof: a
 *                 prompted find never counts, either way. */
export type MomentDial = 'ask-first' | 'after-only' | 'silent';

/** 🔒 One answer per record state: a new state fails to compile until it says
 *  how much the coach says. */
export const MOMENT_DIAL: Record<HeatState, MomentDial> = {
  red: 'ask-first',
  grey: 'ask-first',
  short: 'after-only',
  green: 'silent',
};

/** Inside one game: this many finds of a skill and it is asked no more that
 *  game (the student has shown it today; the rest of the game measures it). */
export const IN_GAME_FINDS_TO_QUIET = 2;

/** The dial for a skill: its record state, then the in-game fade. */
export function momentDial(state: HeatState, foundThisGame: number): MomentDial {
  const d = MOMENT_DIAL[state];
  return d === 'ask-first' && foundThisGame >= IN_GAME_FINDS_TO_QUIET ? 'after-only' : d;
}
