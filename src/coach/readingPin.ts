/**
 * THE READING PICKS THE BRANCH (WO-CHAT-01 P3a).
 *
 * The brain answers a question through one of ~60 branches, each fired by a
 * flag on the grounding object. Those flags are set by matching the student's
 * WORDS (`buildQuestionGrounding` + coachService's engage guards), so after the
 * reader had decided what a turn asked, the words decided again — and won
 * whenever an earlier branch's phrase also matched (the live walk: "can they
 * attack my bishop?" read as attack-piece, answered as the best move).
 *
 * Pinning makes the reading the only decider: when the turn was read, every
 * question flag is switched off except the one its kind's lane fires on.
 * The board, engine and record data on the grounding are untouched — only
 * the WHICH-question flags are.
 *
 * `LANE_FLAG` is a `Record` over the lanes a flag drives, so a new lane fails
 * to compile until someone names the flag that fires it.
 */
import type { MasterGroundingOptions } from '../services/coachApi';
import { CHAT_KINDS, type ChatKind, type FastPathLane } from './chatTurn';

/** Lanes that are not driven by one grounding flag: commands, the pre-lanes
 *  that answer before the brain, and the board-aspect lanes that share
 *  `groundedBoardQuestion`. A reading of these kinds is not pinned. */
type UnpinnedLane =
  | 'command' | 'none' | 'stop' | 'conversational-reply' | 'piece-options'
  | 'alternatives' | 'compare-moves' | 'whose-turn' | 'live-colour' | 'mate' | 'draw';

type Flag = keyof MasterGroundingOptions;

export const LANE_FLAG: Record<Exclude<FastPathLane, UnpinnedLane>, Flag> = {
  'record-vs': 'recordVsTarget',
  'training-request': 'trainingRequestKind',
  'retrospective-move': 'retrospectiveMoveQuestion',
  method: 'methodQuestion',
  'move-rating': 'moveRatingQuestion',
  strengths: 'strengthsQuestion',
  stats: 'statsQuestion',
  'opening-accuracy': 'openingAccuracyQuestion',
  'opening-traps': 'openingTrapsQuestion',
  'review-due': 'reviewDueQuestion',
  'weakness-lifecycle': 'weaknessLifecycleKind',
  'weakness-briefing': 'weaknessBriefingQuestion',
  mistakes: 'mistakesQuestion',
  'errors-by-situation': 'errorsBySituationQuestion',
  misconceptions: 'misconceptionsQuestion',
  'tactics-profile': 'tacticsProfileQuestion',
  'phase-profile': 'phaseQuestion',
  'counter-repertoire': 'counterRepertoireQuestion',
  'repertoire-gap': 'repertoireGapQuestion',
  accuracy: 'accuracyQuestion',
  consistency: 'consistencyQuestion',
  'time-trouble': 'timeTroubleQuestion',
  'last-game': 'lastGameQuestion',
  converting: 'convertingQuestion',
  color: 'colorQuestion',
  records: 'recordsQuestion',
  'puzzle-stats': 'puzzleStatsQuestion',
  'transfer-gap': 'transferGapQuestion',
  'skill-radar': 'skillRadarQuestion',
  trend: 'trendQuestion',
  progress: 'progressQuestion',
  'opening-profile': 'openingProfileQuestion',
  concept: 'conceptQuestion',
  theory: 'theoryQuestion',
  'teaching-method': 'teachingMethodQuestion',
  settings: 'settingsQuestion',
  'name-opening': 'nameOpeningQuestion',
  'app-help': 'appHelpQuestion',
  'why-best-move': 'whyBestMoveQuestion',
  'opponent-move': 'opponentMoveQuestion',
  'last-move': 'lastMoveQuestion',
  'candidate-move': 'candidateMoveQuestion',
  hint: 'hintQuestion',
  endgame: 'endgameQuestion',
  'best-move': 'bestMoveQuestion',
  plan: 'planQuestion',
  'opening-identity': 'openingIdentityName',
  'opening-existence': 'openingExistenceName',
  'last-game-mistake': 'lastGameMistakeQuestion',
  tactics: 'tacticsQuestion',
  'master-play': 'masterPlayQuestion',
  'player-games': 'playerGamesQuestion',
  'endgame-weakness': 'endgameWeaknessQuestion',
  positional: 'positionalTopic',
  'position-assessment': 'positionAssessmentQuestion',
};

/** Flags that carry DATA the words supplied (a target, a name, a topic). The
 *  reading cannot invent that data, so pinning keeps the value as found —
 *  a kind whose data the words did not yield answers honestly that it cannot. */
const DATA_FLAGS: ReadonlySet<Flag> = new Set<Flag>([
  'recordVsTarget', 'trainingRequestKind', 'weaknessLifecycleKind',
  'openingIdentityName', 'openingExistenceName', 'positionalTopic',
]);

/** Every flag that says WHICH question this is — the lane flags plus the
 *  question flags no single lane owns. Board, engine and record data are not
 *  here and are never touched. */
const QUESTION_FLAGS: readonly Flag[] = [
  ...new Set<Flag>([
    ...Object.values(LANE_FLAG),
    'compareMoves', 'compareOnly', 'groundedBoardQuestion', 'opponentHypothetical', 'trade',
    'attackQuestion', 'gameMistakeQuestion', 'captureOn', 'pawnStrength',
    'fundamentalsQuestion', 'fundamentalLessonQuestion', 'famousGameQuestion',
  ]),
];

/** The flag a kind's lane fires on, or null when the kind is not pinned. */
export function pinnedFlagFor(kind: ChatKind): Flag | null {
  const lane = CHAT_KINDS[kind].lane as string;
  return (LANE_FLAG as Record<string, Flag>)[lane] ?? null;
}

/**
 * The grounding with only the reading's question left on. Pure; returns the
 * input unchanged for a kind that is not pinned.
 */
export function pinGroundingToReading<T extends Partial<MasterGroundingOptions>>(g: T, kind: ChatKind | null | undefined): T {
  if (!kind) return g;
  const flag = pinnedFlagFor(kind);
  if (!flag) return g;
  const drop = new Set<string>(QUESTION_FLAGS.filter((f) => f !== flag));
  const out: Record<string, unknown> = Object.fromEntries(Object.entries(g).filter(([k]) => !drop.has(k)));
  if (!DATA_FLAGS.has(flag) && !out[flag]) out[flag] = true;
  return out as T;
}
