// EVERY COMPUTER IS DUAL-USE — THE TABLE THAT MAKES IT CHECKABLE (David
// 2026-09-30: "Make sure all other computers carry the same dual role"; the
// foundation's rule: "A computer only serves the loop if it is wired BOTH
// WAYS").
//
// Each Learn lane is one computer's voice, so the table is keyed by lane: a new
// lane FAILS TO COMPILE until someone answers, for it, what it teaches, what it
// records about the student, and which question on Play reaches it. Every
// answer is one of three honest states:
//   'wired' — the code path exists (named in `via`, and the gate checks it);
//   'owed'  — it should exist and does not yet (a shrink-only count);
//   'na'    — it genuinely cannot, with the reason written down (a
//             description of the opponent's move has no skill of the
//             student's to record; a line said BEFORE the move is prompted).
//
// RECORDS means a write to the student model: a `broken` row through the live
// slip capture (`useDiscussionPractice.evaluatePlayerMove` →
// `captureMisconception`, tagged by the attributor) or a `held` row through
// `recordTeachingEvidence` / `recordMoveEvidence`.
import type { LearnLane } from './learnTurnDoor';
import type { MisconceptionTagId } from '../data/misconceptionTags';

export type RoleState =
  | { state: 'wired'; via: string }
  | { state: 'owed'; what: string }
  | { state: 'na'; why: string };

export interface ComputerRole {
  /** The computer behind the lane (module name). */
  computer: string;
  /** The student-model tag this lane's question is about, or null. */
  tag: MisconceptionTagId | null;
  /** HELD — the student answered it. */
  held: RoleState;
  /** BROKEN — the student missed it. */
  broken: RoleState;
  /** Reachable on demand from a typed question on Play. */
  askable: RoleState;
}

const OPP = (what: string): RoleState => ({ state: 'na', why: `about the opponent's move (${what}) — no answer of the student's to record` });
const PRE = { state: 'na', why: 'said BEFORE the move — the answer after it is prompted, and prompted rows count as neither held nor broken (an UNANNOUNCED find is still recorded by recordMoveEvidence)' } as const;
const DESC = (what: string): RoleState => ({ state: 'na', why: `a description of the board (${what}) — no question posed to the student` });
const SLIP: RoleState = { state: 'wired', via: 'captureMisconception' };

export const COMPUTER_ROLES: Record<LearnLane, ComputerRole> = {
  gem: { computer: 'punishGems', tag: 'missed-tactic', held: PRE, broken: SLIP, askable: { state: 'wired', via: 'isTacticsQuestion' } },
  tactic: { computer: 'tacticsDetector', tag: 'missed-tactic', held: PRE, broken: SLIP, askable: { state: 'wired', via: 'isTacticsQuestion' } },
  threat: { computer: 'groundedAnswer.detectNewThreat', tag: 'missed-opponents-threat', held: PRE, broken: SLIP, askable: { state: 'wired', via: 'isOpponentMoveQuestion' } },
  threatAnswer: { computer: 'threatAnswer', tag: 'missed-opponents-threat', held: PRE, broken: SLIP, askable: { state: 'wired', via: 'isOpponentMoveQuestion' } },
  falseAlarm: { computer: 'falseAlarm', tag: 'missed-opponents-threat', held: { state: 'wired', via: 'recordTeachingEvidence' }, broken: SLIP, askable: { state: 'wired', via: 'theirMoveAnswerLines' } },
  mistake: { computer: 'backwardLook / inaccuracyCall', tag: null, held: { state: 'na', why: 'only speaks on a slip' }, broken: SLIP, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  fundamental: { computer: 'learnFundamentalNarration', tag: null, held: { state: 'wired', via: 'recordMoveEvidence (capabilitiesPosed)' }, broken: SLIP, askable: { state: 'wired', via: 'isFundamentalsQuestion' } },
  drawback: { computer: 'backwardLook.lookConcession', tag: null, held: { state: 'na', why: 'only speaks on a cost' }, broken: SLIP, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  blunderCheck: { computer: 'safetyHabits.blunderCheck', tag: 'hung-material', held: { state: 'na', why: 'only speaks when a piece was left and taken' }, broken: SLIP, askable: { state: 'wired', via: 'studentMoveAnswerLines' } },
  autopilot: { computer: 'safetyHabits.autopilotGuard', tag: null, held: { state: 'na', why: 'only speaks when the popular move cost' }, broken: SLIP, askable: { state: 'na', why: 'needs the amateur cache at the question\'s board, which Play\'s answer path does not warm' } },
  strongChoice: { computer: 'strongChoice (danya-play-db, depersonalized)', tag: null, held: { state: 'na', why: 'a data comparison, not a question the board posed' }, broken: { state: 'na', why: 'a different move is not a miss by itself — the grade judges it' }, askable: { state: 'wired', via: 'studentMoveAnswerLines' } },
  kneeJerk: { computer: 'kneeJerk', tag: 'calculation-depth', held: { state: 'na', why: 'only speaks when the reflex cost' }, broken: SLIP, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  foundMove: { computer: 'criticalMoment.criticalMomentFound', tag: 'calculation-depth', held: { state: 'wired', via: 'recordTeachingEvidence' }, broken: SLIP, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  trade: { computer: 'tradeJudgement', tag: 'bad-trade', held: { state: 'wired', via: 'recordTeachingEvidence' }, broken: SLIP, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  timing: { computer: 'moveTiming', tag: 'mistimed-pawn-break', held: { state: 'wired', via: 'recordTeachingEvidence' }, broken: SLIP, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  recapture: { computer: 'recaptureChoice', tag: 'capture-toward-centre', held: { state: 'wired', via: 'recordTeachingEvidence' }, broken: SLIP, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  moveOrder: { computer: 'moveOrder', tag: 'calculation-depth', held: { state: 'wired', via: 'recordHeld' }, broken: SLIP, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  moveIntent: { computer: 'moveIntent', tag: 'no-plan', held: { state: 'wired', via: 'recordHeld' }, broken: SLIP, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  kingAttack: { computer: 'kingAttack', tag: null, held: { state: 'na', why: 'describes what a sound move adds; no failure tag it answers' }, broken: { state: 'na', why: 'silent on a costly move' }, askable: { state: 'wired', via: 'isAttackAssessmentQuestion' } },
  ruleException: { computer: 'ruleException', tag: null, held: { state: 'na', why: 'a rule broken correctly is not a skill with its own tag' }, broken: { state: 'na', why: 'speaks only when the exception is right' }, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  movePoint: { computer: 'studentMovePoint', tag: null, held: { state: 'wired', via: 'recordMoveEvidence (capabilitiesPosed)' }, broken: { state: 'na', why: 'speaks on a clean move only' }, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  stalemate: { computer: 'stalemateWatch', tag: 'botched-conversion', held: { state: 'wired', via: 'capabilitiesPosed' }, broken: SLIP, askable: { state: 'wired', via: 'dangerAnswerLines' } },
  checkMethod: { computer: 'checkMethod', tag: null, held: PRE, broken: PRE, askable: { state: 'wired', via: 'dangerAnswerLines' } },
  priorityFirst: { computer: 'priorityFirst', tag: null, held: PRE, broken: PRE, askable: { state: 'wired', via: 'isBestMoveQuestion' } },
  rejectedTempting: { computer: 'playCommentary.buildRejectedTempting', tag: null, held: PRE, broken: PRE, askable: { state: 'wired', via: 'isCandidateMoveQuestion' } },
  register: { computer: 'deliberation', tag: null, held: PRE, broken: PRE, askable: { state: 'wired', via: 'isBestMoveQuestion' } },
  gap: { computer: 'gap nudge', tag: null, held: PRE, broken: PRE, askable: { state: 'wired', via: 'isOpponentMoveQuestion' } },
  pushOrHold: { computer: 'pushOrHold', tag: 'passive-king-endgame', held: { state: 'na', why: 'a plan read of the ending type, not an answer' }, broken: { state: 'na', why: 'a plan read of the ending type, not an answer' }, askable: { state: 'wired', via: 'isEndgameQuestion' } },
  coachMistake: { computer: 'backwardLook (coach side)', tag: null, held: OPP('the coach\'s own slip'), broken: OPP('the coach\'s own slip'), askable: { state: 'wired', via: 'isOpponentMoveQuestion' } },
  theirMoveCost: { computer: 'theirMoveCost', tag: null, held: OPP('what it cost them'), broken: OPP('what it cost them'), askable: { state: 'wired', via: 'isOpponentMoveQuestion' } },
  theirPurpose: { computer: 'theirPurpose', tag: null, held: OPP('what it stopped'), broken: OPP('what it stopped'), askable: { state: 'wired', via: 'isOpponentMoveQuestion' } },
  theirIntent: { computer: 'moveIntent (their seat)', tag: null, held: OPP('what it prepares'), broken: OPP('what it prepares'), askable: { state: 'wired', via: 'isOpponentMoveQuestion' } },
  tempo: { computer: 'tempoCount', tag: null, held: OPP('their wasted moves'), broken: OPP('their wasted moves'), askable: { state: 'wired', via: 'isOpponentMoveQuestion' } },
  causalChain: { computer: 'causalChain', tag: 'hung-material', held: { state: 'na', why: 'explains a slip across moves' }, broken: SLIP, askable: { state: 'wired', via: 'isMoveRatingQuestion' } },
  openingIdea: { computer: 'mastersPlanRead', tag: null, held: DESC('the masters plan'), broken: DESC('the masters plan'), askable: { state: 'wired', via: 'isPlanQuestion' } },
  planArc: { computer: 'planArc', tag: 'no-plan', held: { state: 'na', why: 'a plan only arrives after the coach announced it — always prompted' }, broken: { state: 'na', why: 'a dropped plan the student was never told is not a miss' }, askable: { state: 'wired', via: 'isPlanQuestion' } },
  opening: { computer: 'openingDetectionService', tag: null, held: DESC('the opening name'), broken: DESC('the opening name'), askable: { state: 'wired', via: 'isNameOpeningQuestion' } },
  structure: { computer: 'namedPawnStructure', tag: null, held: DESC('the pawn structure'), broken: DESC('the pawn structure'), askable: { state: 'wired', via: 'isPlanQuestion' } },
  pieceQuality: { computer: 'pieceValueRead', tag: 'misplaced-piece', held: DESC('best/worst piece'), broken: DESC('best/worst piece'), askable: { state: 'wired', via: 'isPositionAssessmentQuestion' } },
  commentary: { computer: 'playCommentary', tag: null, held: DESC('the board read'), broken: DESC('the board read'), askable: { state: 'wired', via: 'isPositionAssessmentQuestion' } },
  behavior: { computer: 'danya behaviours', tag: null, held: DESC('a behaviour line'), broken: DESC('a behaviour line'), askable: { state: 'na', why: 'rate-matched commentary, not a question topic' } },
  positional: { computer: 'positionalRead', tag: null, held: DESC('the positional read'), broken: DESC('the positional read'), askable: { state: 'wired', via: 'isPositionAssessmentQuestion' } },
  positionFacts: { computer: 'positionFacts (via coachDecider)', tag: null, held: { state: 'wired', via: 'recordMoveEvidence (capabilitiesPosed)' }, broken: SLIP, askable: { state: 'wired', via: 'isPositionAssessmentQuestion' } },
  character: { computer: 'positionCharacter', tag: null, held: DESC('what the position is about'), broken: DESC('what the position is about'), askable: { state: 'wired', via: 'isPositionAssessmentQuestion' } },
  phase: { computer: 'phaseTransitionDetector', tag: null, held: DESC('the phase change'), broken: DESC('the phase change'), askable: { state: 'wired', via: 'isPhaseQuestion' } },
  kingSafety: { computer: 'kingSafety', tag: 'king-stuck-center', held: { state: 'wired', via: 'recordMoveEvidence (capabilitiesPosed)' }, broken: SLIP, askable: { state: 'wired', via: 'isPositionAssessmentQuestion' } },
};

/** The "owed" entries, counted — the number the gate holds to shrink-only. */
export function owedRoles(): string[] {
  const out: string[] = [];
  for (const [lane, r] of Object.entries(COMPUTER_ROLES)) {
    for (const k of ['held', 'broken', 'askable'] as const) if (r[k].state === 'owed') out.push(`${lane}.${k}`);
  }
  return out;
}

/** Lanes spoken BEFORE the student moves (their held half is `PRE`): a move
 *  made after one of them spoke is PROMPTED, never unaided evidence. */
export const SAID_BEFORE_MOVE: ReadonlySet<LearnLane> = new Set([
  ...(Object.keys(COMPUTER_ROLES) as LearnLane[]).filter((l) => COMPUTER_ROLES[l].held === PRE),
  // Warned before the move, and its held half is still recorded — by the
  // board's own question (`capabilitiesPosed`), where an unwarned surface
  // (Play is silent) makes the find unaided.
  'stalemate',
]);
