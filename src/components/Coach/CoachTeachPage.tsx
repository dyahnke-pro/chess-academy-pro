/**
 * CoachTeachPage — dedicated teaching surface using the SAME board
 * primitives as Play with Coach (`/coach/play`). Chess state runs
 * through `useChessGame()`; the board renders via `ControlledChessBoard`
 * with all the same affordances Play has — click-to-move, legal-move
 * dots, drag-and-drop, last-move highlight. The student plays moves
 * exactly as they would in Play; the LLM coach drives the board from
 * the OTHER side via play_move / take_back_move / set_board_position
 * / reset_board markers parsed from its response. Same room, different
 * actions.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { uid } from '../../utils/uid';
import { acquireSwReloadHold } from '../../utils/swReloadHold';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ArrowLeft, Lightbulb, SkipBack, RefreshCw, Flag, Loader2, ChevronRight, X, Check, MessageCircle, Zap, Undo2, RotateCcw, Volume2 } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { ChessBoard } from '../Board/ChessBoard';
import { NarrationArrowOverlay } from './NarrationArrowOverlay';
import { AnalysisToggles } from '../Board/AnalysisToggles';
import { useChessGame, type MoveResult } from '../../hooks/useChessGame';
import { usePositionNarration } from '../../hooks/usePositionNarration';
import { useTeachWalkthrough, isStartablePunishLesson, isValidConceptsQuestion, isValidFindMoveQuestion, isValidDrillLine } from '../../hooks/useTeachWalkthrough';
import { useEnginePonder } from '../../hooks/useEnginePonder';
import { ProAttributionNotice } from '../Openings/ProAttributionNotice';
import { resolveWalkthroughTree, inferStudentSide } from '../../data/openingWalkthroughs';
import { pickGreeting, pickSuggestedQuestions, weaknessNudgeFromItem } from '../../data/coachGreetings';
import { getStoredWeaknessProfile } from '../../services/weaknessAnalyzer';
import type {
  WalkthroughTree,
  WalkthroughTreeNode,
} from '../../types/walkthroughTree';
import {
  generateOpening,
  getCachedOpening,
  cacheOpening,
  generateMissingStagesInBackground,
} from '../../services/openingGenerator';
import {
  readSharedCache,
  writeSharedCache,
} from '../../services/sharedOpeningCache';
import {
  getOpeningMoves,
  findLinePickerOptions,
  findOpeningByPgnPrefix,
  resolveCuratedVariation,
  type LinePickerOption,
} from '../../services/openingDetectionService';
import { fuzzyMatchOpening } from '../../services/openingFuzzyMatcher';
import { planOpeningMatchup, buildMatchupLine, inferMatchupColor } from '../../services/openingMatchup';
import {
  initialContinuationState,
  continuationNarration,
  continuationResult,
} from '../../services/narratedContinuation';
import { parseCoachIntent } from '../../services/coachAgent';
import { matchTrainingAidRoute } from '../../services/trainingAidRouter';
import {
  pickCoachDrill,
  isDrillableAid,
  buildMistakeDrillQueue,
  advanceMistakeDrill,
  hasImportedGames,
  type CoachDrill,
  type DrillProgress,
} from '../../services/coachDrillService';
import { gradeMistakePuzzle } from '../../services/mistakePuzzleService';
import { reportCoachReask, isMoveReport } from '../../services/coachNonAnswer';
import { tryCaptureOpeningIntent, tryCaptureForgetIntent } from '../../services/openingIntentCapture';
import { findPlansForOpening, sessionFromPlan } from '../../services/middlegamePlanner';
import { MiddlegamePlanInline } from './MiddlegamePlanInline';
import { parsePlayerGameRequest } from '../../services/playerGameRequest';
import {
  classifyWalkthroughControl,
  isWalkthroughControlPhrase,
} from '../../services/walkthroughControlIntent';
import { lookupPlayerGamesTool } from '../../coach/tools/cerebellum/lookupPlayerGames';
import { buildSession } from '../../services/walkthroughAdapter';
import { fetchChesscomPlayerGames } from '../../services/chesscomGamesService';
import { OpeningPlayMode } from '../Openings/OpeningPlayMode';
import type { WalkthroughSession } from '../../types/walkthrough';
import { classifyPhase } from '../../services/gamePhaseService';
import { useDiscussionPractice } from '../../hooks/useDiscussionPractice';
import { shouldOfferGuidedFind, buildGuidedFindChallenge, judgeGuidedFindAttempt, type GuidedFindChallenge } from '../../services/guidedFindTheMove';
import { buildThreatCheckQuestion, judgeThreatCheckPick, type ThreatCheckQuestion } from '../../services/threatCheck';
import { buildOpeningChainFacts } from '../../services/openingFactChains';
import { buildForkTalk, type ForkTalk } from '../../services/forkTalk';
import { parseSpokenMove } from '../../services/spokenMoveParser';
import { parseCoachMoveCommand } from '../../services/coachMoveCommand';
import { sanToSpeech } from '../../utils/sanToSpeech';
import { noteAtPosition } from '../../services/danyaTeachingService';
import { buildThinkAloud } from '../../services/thinkAloud';
import { warmAmateurPlay, buildRatingRealityFact } from '../../services/amateurPlayCache';
import { masterPlayCache } from '../../services/masterPlayCache';

/** Min plies between think-aloud deliberations — a coach who deliberates on
 *  every move stops being listened to (same cadence family as the questions). */
const THINK_ALOUD_MIN_PLY_GAP = 6;

/** Fork-in-the-road deliberations per game (David 2026-07-11: "3 total"). */
const FORK_TALK_MAX_PER_GAME = 3;
import { captureEvent } from '../../services/analytics';

/** Min plies between guided find-the-move questions — the coach quizzes at
 *  real moments, not every move of a won game. */
const GUIDED_FIND_MIN_PLY_GAP = 6;
/** Min plies between threat-check questions — the danger drill fires at
 *  moments, not on every hanging pawn of a sloppy game. */
const THREAT_CHECK_MIN_PLY_GAP = 8;
import { getNeonColor, scaledShadow } from '../../utils/neonColors';
import {
  getCompletedStages,
  type ProgressStage,
} from '../../services/openingProgress';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { DifficultyToggle } from './DifficultyToggle';
import type { CoachDifficulty, MiddlegamePlan } from '../../types';
import { PlayerInfoBar } from './PlayerInfoBar';
import { getCapturedPieces, getMaterialAdvantage } from '../../services/boardUtils';
import { DiscussionPracticePanel } from '../Openings/DiscussionPracticePanel';
import { coachService, isProgressQuestion, isImprovementTrendQuestion, isConceptQuestion, isOpeningProfileQuestion, isStatsQuestion, isStrengthsQuestion, isOpeningAccuracyQuestion, isOpeningTrapsQuestion, isReviewDueQuestion, isMistakesQuestion, isTacticsProfileQuestion, isPhaseQuestion, isRepertoireGapQuestion, isAccuracyQuestion, isConsistencyQuestion, isConvertingQuestion, isColorQuestion, isRecordsQuestion, isRecordVsQuestion, isMoveRatingQuestion, isTrainingRequest, isPuzzleStatsQuestion, isTransferGapQuestion, isSkillRadarQuestion } from '../../coach/coachService';
import { logAppAudit, mintTurnId, setCurrentTurnId } from '../../services/appAuditor';
import { resolveCoachNarration } from '../../utils/coachNarration';
import { recoverCoachMoveFromText } from '../../utils/recoverCoachMove';
import { sanitizeCoachText, sanitizeCoachStream, formatForSpeech, SENTENCE_END_RE } from '../../services/sanitizeCoachText';
import { stripDisprovenSentences } from '../../services/boardClaimValidator';
import { parseBoardTags } from '../../services/boardAnnotationService';
import { voiceService } from '../../services/voiceService';
import { applyCoachSetting } from '../../services/coachSettingsAction';
import { detectLanguage } from '../../utils/detectLanguage';
import { translateToEnglish } from '../../services/coachApi';
import { useAppStore } from '../../stores/appStore';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import { useSettings } from '../../hooks/useSettings';
import { getFavoriteOpenings, getOpeningById, searchOpenings } from '../../services/openingService';
import type { OpeningRecord, OpeningVariation } from '../../types';
import type { LiveState, TacticsLiveContext } from '../../coach/types';
import type { ChatMessage as ChatMessageType, BoardArrow, BoardHighlight } from '../../types';
import { stockfishEngine } from '../../services/stockfishEngine';
import { buildTacticsLiveContext, buildFedTacticsContext } from '../../services/liveTacticsContext';
import { explainBestMoveGrounded } from '../../services/groundedAnswer';
import { stripUngroundedTacticSentences } from '../../services/tacticClaimValidator';
import { applyCandidateArrows, candidateHighlightMarkers } from '../../services/coachAnswerGates';
import { groundArrows, dedupeArrowsBySquarePair } from '../../utils/arrowGrounding';
import type { StockfishAnalysis } from '../../types';
import { fetchLichessExplorer } from '../../services/lichessExplorerService';
import { getAdaptiveMove, getRandomLegalMove, getTargetStrength } from '../../services/coachGameEngine';
import { withTimeout } from '../../coach/withTimeout';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Cheap gate: does the request look like a "X vs Y" matchup? Only then do
 *  we run the (fuzzy-per-side) matchup resolver. */
const MATCHUP_HINT_RE = /\b(?:vs\.?|versus|against)\b/i;

/** The exact chip label that starts the narrated middle+endgame continuation
 *  after a lesson (David 2026-07-18). Kept as a constant so the leaf offer
 *  and the handleSubmit intercept can't drift apart. */
const CONTINUE_GAME_CHIP = 'Watch the middlegame and endgame';
/** Also match a user who TYPES the intent, not just taps the chip.
 *  Broadened (David 2026-07-26 gambit-switch bug): the old pattern only matched
 *  "middlegame"/"endgame" as ONE word, so a natural "see the middle game" /
 *  "watch it play out" / "play the line out" fell THROUGH to the walkthrough-
 *  control classifier, which tore the current opening down and let the next
 *  message generate a DIFFERENT opening (the reported "clicked yes → different
 *  opening"). Now matches the spaced forms + "play (it/the line) out". */
const CONTINUE_GAME_RE =
  /(?:\b(?:watch|see|show|play|continue|finish|keep going|carry on).{0,40}\b(?:middle\s?game|end\s?game|rest of (?:the )?game|whole game|full game|entire game|play out)\b)|(?:\bplay (?:it|this|the line|the game) out\b)/i;
/** A bare affirmative ("yes", "sure", "ok", "please do") — meaningful ONLY when
 *  the coach has just offered to continue at the leaf, where an affirmative
 *  unambiguously means "yes, keep going". Gated on walkthrough.phase==='leaf'
 *  at the call site so it can never hijack a "yes" in another context. */
const CONTINUE_AFFIRM_RE =
  /^(?:yes|yea|yeah|yep|yup|sure|ok(?:ay)?|please(?:\s+do)?|go(?:\s+(?:on|ahead))?|do it|sounds good|let'?s go)\b[\s.!]*$/i;

// Monotonic suffix for chat-message id bases. `Date.now()` alone collides
// when two ids are minted in the SAME millisecond — which happens under
// rapid interaction (two turns back-to-back, a turn that appends user +
// coach quickly, StrictMode's double-invoke). Colliding ids made two
// `<ChatMessage>` siblings share a React key → "Encountered two children
// with the same key" + duplicated/omitted messages. Surfaced by the
// adversarial loop audit (2026-06-12). `freshTurnId` appends an ever-
// increasing counter so every minted base is unique regardless of timing.
let __coachMsgSeq = 0;
function freshTurnId(topic?: string): string {
  __coachMsgSeq += 1;
  return `t-${Date.now()}-${__coachMsgSeq.toString(36)}${topic ? `-${topic}` : ''}`;
}

// Arrows passed to the board must be unique by square-pair (react-chessboard
// keys on it). Shared dedupe lives in arrowGrounding. Surfaced by the
// adversarial loop audit (2026-06-12, key="chessboard-arrow-c2-c3"):
// un-grounded code-derived arrows appended to prior arrows duplicated a
// square-pair and flooded "Encountered two children with the same key".
const uniqueArrows = dedupeArrowsBySquarePair;

const SUGGESTIONS = [
  'Walk me through the Vienna opening',
  'Teach me about pins and skewers',
  'Show me the Italian Game main line',
  'How do I attack a castled king?',
  'What is the Sicilian Defense and why play it?',
];

/** Action modes the picker offers above the chat input. Each maps to
 *  a typed-input phrasing that `handleSubmit`'s STAGE_PATTERNS regexes
 *  recognize — tapping a mode + opening combination becomes the same
 *  text input the user could have typed by hand, so the picker is
 *  purely additive UI and never bypasses the normal routing. */
const PICKER_ACTIONS = [
  {
    id: 'teach',
    label: 'Teach me',
    description: 'Walk through the opening from move 1 with voice narration.',
    buildInput: (opening: string) => opening,
  },
  {
    id: 'drill',
    label: 'Drill',
    description: 'Practice the moves on the board, ply by ply.',
    buildInput: (opening: string) => `drill ${opening}`,
  },
  {
    id: 'quiz',
    label: 'Quiz me on',
    description: 'Multiple-choice questions on the key ideas.',
    buildInput: (opening: string) => `quiz me on ${opening}`,
  },
  {
    id: 'trap',
    label: 'Trap lines for',
    description: 'Common opponent slips and how to punish them.',
    buildInput: (opening: string) => `punish lines for ${opening}`,
  },
  {
    id: 'play',
    label: 'Play',
    description: 'Live game vs the coach starting from this opening.',
    buildInput: (opening: string) => `play it for real ${opening}`,
  },
  {
    // "How a pro plays" — routes a free-text question to the coach brain,
    // which calls the grounded player tools (lookup_player_opening_moves +
    // lookup_player_games). The phrasing the opening-chip onClick builds
    // for this mode ("How does <player> play the <opening>?") is
    // load-bearing: the leading "How does" dodges TEACH_PATTERN and the
    // trailing "?" trips the bare-name router's `!includes('?')` guard, so
    // the input falls through to coachService.ask with the full tool
    // registry instead of being fuzzy-matched as an opening. Do NOT drop
    // the "?" or prefix it with "show me/teach me" — that silently breaks
    // the grounding route. buildInput is unused here (the onClick branches
    // because this mode needs a player AND an opening).
    id: 'player',
    label: 'How a pro plays',
    description: "See a named player's REAL moves in this opening, pulled from their games.",
    buildInput: (opening: string) => opening,
  },
] as const;
type PickerActionId = (typeof PICKER_ACTIONS)[number]['id'];

/** The pros with a bundled real-game corpus (`pro-game-references.json`),
 *  shown as quick chips for the "How a pro plays" picker mode. Any other
 *  Lichess username works too via the free-text field — the live
 *  lookup_player_opening_moves tool reads the player's Lichess history. The
 *  id list mirrors the 8 bundled corpus ids; the display name is what the
 *  coach query is phrased with (it resolves through the tool's name->Lichess
 *  alias map). */
const BUNDLED_PROS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'carlsen', name: 'Magnus Carlsen' },
  { id: 'hikaru', name: 'Hikaru Nakamura' },
  { id: 'caruana', name: 'Fabiano Caruana' },
  { id: 'naroditsky', name: 'Daniel Naroditsky' },
  { id: 'gothamchess', name: 'Levy Rozman' },
  { id: 'ericrosen', name: 'Eric Rosen' },
  { id: 'aman', name: 'Aman Hambleton' },
  { id: 'samayraina', name: 'Samay Raina' },
];

/** Build the brain-routed query for the "How a pro plays" picker mode.
 *  Load-bearing shape: the leading "How does" keeps it clear of
 *  TEACH_PATTERN (which requires a teach/show/walk verb), and the trailing
 *  "?" trips the bare-name router's `!includes('?')` guard — together they
 *  guarantee the input falls through to `coachService.ask` with the grounded
 *  player tools instead of being fuzzy-matched as an opening name. Keep BOTH
 *  the "How does" prefix and the "?" or the grounding route silently breaks.
 *  Exported so the routing contract is unit-tested (CoachTeachPage.playerQuery.test). */
export function buildPlayerStyleQuery(player: string, opening: string): string {
  return `How does ${player} play the ${opening}?`;
}

/** Fallback openings shown when the student has no favorites yet —
 *  a curated mix of the most-asked-about ones across both colors. */
const FALLBACK_OPENING_NAMES: string[] = [
  'Sicilian Defense',
  'Italian Game',
  'Caro-Kann Defense',
  'French Defense',
  "Queen's Gambit",
  'Vienna Game',
];

/** A deep-dive entry point pulled from the walkthrough tree. Every
 *  fork branch in the tree is a natural deep-dive candidate — when
 *  the user picked the Classical Pirc in the walkthrough, they can
 *  later come back and dive deeper into the Austrian Attack or 150
 *  Attack as separate, focused lessons.
 *
 *  pathSans is the SAN sequence to reach the fork's parent (the
 *  position where the choice was offered); label is the child's
 *  SAN (the branch's first move); subtitle is the prose chip text
 *  ("Main line — natural development", etc.). */
interface DeepDiveOption {
  pathSans: string[];
  label: string;
  subtitle: string;
  /** The actual SAN of the chosen branch's first move (e.g. "Nf3"
   *  for the Classical Pirc fork). Combined with pathSans this gives
   *  the full move sequence for the branch, which we look up against
   *  the Lichess DB to find the canonical opening name. Without this,
   *  the click handler had to glue label/subtitle prose onto the
   *  parent name and produced garbage like "Pirc Defense: Classical
   *  Variation: Solid and flexible" — production audit (build
   *  3ad9a2b). */
  childSan: string;
  /** Straight-line extension SANs along this branch (the auto-played
   *  middlegame chain after the fork's first move). Included in the
   *  deep-dive canonical-prefix lookup so a branch labeled "Greco
   *  Gambit" actually resolves to "Italian Game: Classical Variation,
   *  Greco Gambit, Modern Line" instead of the bare parent. */
  extensionSans: string[];
}

/** One real game returned by the `lookup_player_games` function — the
 *  fields CoachTeachPage's player-game handler reads off the result. */
interface FoundPlayerGame {
  id: string;
  player: string;
  studentSide: 'white' | 'black';
  opponent: string;
  opponentRating: number | null;
  result: string;
  date: string | null;
  source: string;
  variationLabel: string;
  plyCount: number;
  pgn: string;
}

/** "1-0" / "0-1" / "1/2-1/2" → a word from the named player's side.
 *  The lookup already filters out the player's losses, so this is win
 *  or draw in practice. */
function gameResultWord(result: string, side: 'white' | 'black'): string {
  if (result === '1/2-1/2') return 'a draw';
  const studentWon =
    (side === 'white' && result === '1-0') || (side === 'black' && result === '0-1');
  return studentWon ? 'a win' : 'a loss';
}

/** Title-case a free-text span ("catalan opening" → "Catalan Opening"). */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}


/** Walk every fork in the tree and emit one DeepDiveOption per
 *  child. Limited to the FIRST fork's children for surface clarity —
 *  a tree with three forks would emit 9 options otherwise, which
 *  overwhelms the menu. The first fork is always the most pedagogically
 *  significant ("3.Nc3 vs 3.f3 vs 3.Bd3" in the Pirc). Returns
 *  empty array when the tree has no fork (linear walkthrough). */
function extractDeepDiveOptions(tree: WalkthroughTree): DeepDiveOption[] {
  const options: DeepDiveOption[] = [];
  function walk(node: WalkthroughTreeNode, pathSans: string[]): boolean {
    if (node.children.length > 1) {
      for (const child of node.children) {
        if (child.label && child.forkSubtitle && child.node.san) {
          options.push({
            pathSans: [...pathSans],
            label: child.label,
            subtitle: child.forkSubtitle,
            childSan: child.node.san,
            extensionSans: collectStraightLineSansFromNode(child.node),
          });
        }
      }
      // Stop after finding the first fork — see comment above.
      return true;
    }
    for (const child of node.children) {
      const childPath = node.san === null ? pathSans : [...pathSans, node.san];
      if (walk(child.node, childPath)) return true;
    }
    return false;
  }
  walk(tree.root, []);
  return options;
}

/** Build the canonical deep-dive query for a chosen branch:
 *    1. Replay path + childSan against the Lichess DB.
 *    2. If the resulting move sequence matches a named DB entry, use
 *       that canonical name verbatim ("Pirc Defense: Classical
 *       Variation").
 *    3. Otherwise fall back to "${parentName}: ${labelOrSubtitle}"
 *       and let the surface-router's canonicalization sort it out.
 *  Production audit (build 3ad9a2b): the old code blindly glued
 *  forkSubtitle prose ("Solid and flexible") onto the parent name,
 *  producing nonsense queries that pre-flight rejected and the brain
 *  re-routed to a different, bare-named walkthrough — trampling the
 *  in-progress lesson. */
/** Walk a fork option's node down its single-child chain, collecting
 *  the SANs that the walkthrough engine would auto-play between this
 *  fork and the next branchpoint. Used to pull the branch's
 *  middlegame extension moves for the deep-dive query so the
 *  canonical-prefix lookup lands on the actual sub-variation, not
 *  just the parent. */
function collectStraightLineSansFromNode(node: WalkthroughTreeNode): string[] {
  const sans: string[] = [];
  let current = node;
  // Walk while there's exactly one child (linear extension);
  // stop at branchpoints and leaves.
  while (current.children.length === 1) {
    const next = current.children[0].node;
    if (!next.san) break;
    sans.push(next.san);
    current = next;
  }
  return sans;
}

function buildDeepDiveQuery(
  parentName: string,
  pathSans: string[],
  childSan: string,
  fallbackLabel: string,
  /** Optional extension SANs from the fork branch's chain. When
   *  provided, included in the canonical-prefix lookup so the deep-
   *  dive resolves to the actual sub-variation (e.g. "Italian Game:
   *  Classical Variation, Greco Gambit, Modern Line") instead of the
   *  parent ("Italian Game: Classical Variation"). */
  extensionSans: string[] = [],
): string {
  const fullPath = [...pathSans, childSan, ...extensionSans];
  const canon = findOpeningByPgnPrefix(fullPath);
  if (canon) return canon.canonicalName;
  // Try again with just one move ahead — covers cases where the
  // extension doesn't exactly match a DB PGN but the immediate fork
  // does.
  const shorterCanon = findOpeningByPgnPrefix([...pathSans, childSan]);
  if (shorterCanon) return shorterCanon.canonicalName;
  // Last resort: parent + label. The DB uses ", " (comma-space)
  // between sub-variation segments, not ":", so use that form for a
  // better chance of name-resolution success downstream.
  return `${parentName}, ${fallbackLabel}`;
}

/**
 * Build a minimal OpeningRecord so OpeningPlayMode can play out a
 * middlegame-plan position in-page. OpeningPlayMode derives the
 * student's color from the FEN side-to-move and (with no customLine)
 * plays adaptive Stockfish from `startFen`, so most fields are stubs.
 */
function syntheticOpeningFromSession(session: WalkthroughSession): OpeningRecord {
  const fen = session.startFen ?? STARTING_FEN;
  const color: 'white' | 'black' = fen.split(' ')[1] === 'b' ? 'black' : 'white';
  return {
    id: `play-out-${session.kind ?? 'plan'}`,
    eco: '',
    name: session.title,
    pgn: session.steps.map((s) => s.san).join(' '),
    uci: '',
    fen,
    color,
    style: '',
    isRepertoire: false,
    overview: null,
    keyIdeas: null,
    traps: null,
    warnings: null,
    variations: null,
    drillAccuracy: 0,
    drillAttempts: 0,
    lastStudied: null,
    woodpeckerReps: 0,
    woodpeckerSpeed: null,
    woodpeckerLastDate: null,
    isFavorite: false,
  };
}

export function CoachTeachPage(): JSX.Element {
  const navigate = useNavigate();
  // Quick Tour mode: ?mode=tour in the URL flips lessons into a
  // snappier playthrough — same spine + branches (so variation
  // choice still works), but shorter narrations, shorter branch
  // extensions, and no background quiz / drill / punish gens.
  // User: "Add a quick walk through mode from coach." Default 'full'.
  const [searchParams, setSearchParams] = useSearchParams();
  const pace: 'full' | 'tour' = searchParams.get('mode') === 'tour' ? 'tour' : 'full';
  const togglePace = useCallback((): void => {
    const next = new URLSearchParams(searchParams);
    if (pace === 'tour') {
      next.delete('mode');
    } else {
      next.set('mode', 'tour');
    }
    setSearchParams(next, { replace: true });
  }, [pace, searchParams, setSearchParams]);
  const activeProfile = useAppStore((s) => s.activeProfile);

  // In-page middlegame plan (David 2026-05-29): when the student asks
  // "middle game plans in the Pirc" we resolve the opening's AUTHORED
  // plans and play them HERE, on the Learn-with-Coach board — never a
  // route hand-off. `middlegameSession` is the active plan; when an
  // opening carries more than one plan, `middlegamePlanChoices` holds
  // the picker options (tap to start one).
  const [middlegameSession, setMiddlegameSession] = useState<WalkthroughSession | null>(null);
  const [middlegamePlanChoices, setMiddlegamePlanChoices] = useState<{
    plans: MiddlegamePlan[];
    side: 'white' | 'black';
  } | null>(null);
  // In-page model-game viewer (David 2026-06-11): when the student asks
  // "show me a game that magnus played the catalan" we resolve their REAL
  // game in code (no LLM tool round-trip) and walk it HERE, on this board.
  // Reuses the generic voice-gated session player (MiddlegamePlanInline).
  const [modelGameSession, setModelGameSession] = useState<WalkthroughSession | null>(null);
  const startMiddlegamePlan = useCallback((plan: MiddlegamePlan, orientation: 'white' | 'black'): void => {
    const session = sessionFromPlan(plan, { orientation });
    if (!session) return;
    setMiddlegamePlanChoices(null);
    setMiddlegameSession(session);
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachTeachPage.startMiddlegamePlan',
      summary: `in-page middlegame plan started: ${plan.id} (${plan.openingId})`,
    });
  }, []);

  // "Play it out" — at the end of an in-page plan the student can play
  // the position out against the coach WITHOUT leaving this tab (David
  // 2026-05-29). We mount OpeningPlayMode (its own board + Stockfish,
  // color derived from the FEN side-to-move) from the plan's starting
  // position. `playOutSession` holds the session whose startFen we play.
  const [playOutSession, setPlayOutSession] = useState<WalkthroughSession | null>(null);
  const handlePlayOutPlan = useCallback((session: WalkthroughSession): void => {
    setMiddlegameSession(null);
    setPlayOutSession(session);
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachTeachPage.handlePlayOutPlan',
      summary: `in-page play-out started from plan position ("${session.title}")`,
    });
  }, []);

  // "Play this line out yourself" at the walkthrough LEAF — the student
  // has just watched the taught line into the middlegame; now they play
  // it out. We mount OpeningPlayMode IN-PAGE, LOCKED to the taught line
  // via `customLine` (it plays the exact watched moves move-for-move
  // through the opening, then hands to ADAPTIVE STOCKFISH in the
  // middlegame — David 2026-07-15: "then stockfish gets used to the
  // middlegame"). This replaces the old `navigate('/coach/play?opening=…')`
  // handoff, which left the page AND started the generic play room from
  // scratch — losing the taught line + the middlegame position, and
  // violating the WLPP Play-lock (never hand a taught line to the generic
  // /coach/play room). `null` = not playing out a line.
  const [leafPlayOut, setLeafPlayOut] = useState<{
    opening: OpeningRecord;
    customLine: OpeningVariation;
  } | null>(null);

  // Game state via the canonical hook — same primitive Play uses. Gives
  // us click-to-move + legal dots + drag, plus loadFen/resetGame/undoMove
  // for LLM-driven mutations.
  const game = useChessGame(STARTING_FEN, 'white');

  // In-place walkthrough runtime. When active, takes over the board
  // (renders walkthrough.fen instead of game.fen, board is read-only)
  // and shows fork tap targets / leaf options below. Replaces the
  // navigate-to-/coach/session/walkthrough flow that lost the chat
  // panel. See `useTeachWalkthrough` + `data/openingWalkthroughs/`.
  const walkthrough = useTeachWalkthrough();

  // Ponder on the student's clock (David 2026-07-03) — while the free-play board
  // is interactive (no walkthrough auto-driving it), warm the engine cache for
  // the current position so coach positional grounding + Read Position are
  // instant. Skipped during active auto-play walkthroughs (the position churns
  // every advance) and when the game is over.
  useEnginePonder(
    game.fen,
    (!walkthrough.isActive || walkthrough.phase === 'paused') && !game.isGameOver,
  );

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The board is locked ONLY while the opponent is computing its reply (the
  // engine call + the natural 1-2s think pad) — NOT while the coach narrates
  // afterward. David 2026-06-10: "I want to be able to move as soon as the
  // opponent's turn is over" without waiting 3+s for narration to finish. The
  // ref is the synchronous guard inside handlers; the state drives the board's
  // `interactive` prop. Keep them in lock-step via setOpponentThinking.
  const [opponentThinking, setOpponentThinkingState] = useState(false);
  const opponentThinkingRef = useRef(false);
  const setOpponentThinking = useCallback((v: boolean): void => {
    opponentThinkingRef.current = v;
    setOpponentThinkingState(v);
  }, []);
  // Brain-emitted answer chips. Set when the streaming response
  // contains a `[CHOICES: A | B | C]` marker (typically because
  // the brain is asking a disambiguation question — e.g.
  // "Did you mean Najdorf or Dragon?"). Tapping a chip submits
  // the chosen text and clears the chips so the next turn starts
  // fresh. null = no choices on offer.
  const [coachChoices, setCoachChoices] = useState<string[] | null>(null);
  // Picker state — drives the starter chips shown above the chat
  // input while the transcript is empty. `pickerAction` is the
  // currently-selected mode (Teach / Drill / Quiz / Trap / Play);
  // tapping an opening chip combines the action with the opening
  // and submits via the normal handleSubmit path so the picker is
  // purely additive UI.
  const [pickerAction, setPickerAction] = useState<PickerActionId>('teach');
  // "How a pro plays" mode: which player the opening chip phrases the
  // query for. `pickerPlayerCustom` (any Lichess username) overrides the
  // chip selection when non-empty.
  const [pickerPlayer, setPickerPlayer] = useState<string>('Magnus Carlsen');
  const [pickerPlayerCustom, setPickerPlayerCustom] = useState<string>('');
  const [favoriteOpenings, setFavoriteOpenings] = useState<OpeningRecord[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await getFavoriteOpenings();
        if (!cancelled) setFavoriteOpenings(rows);
      } catch {
        if (!cancelled) setFavoriteOpenings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [linePicker, setLinePicker] = useState<{
    canonicalName: string;
    options: LinePickerOption[];
  } | null>(null);
  // 'play' = student studies the chosen variation as its natural side
  // (Black for Sicilian, White for Italian, etc.); 'face' = student
  // studies the OPPOSITE side's main-line counter (Sicilian Najdorf
  // → White learns to face it via English Attack or similar). The
  // mode flips on toggle and re-renders the dot+routing on each tile.
  const [linePickerMode, setLinePickerMode] = useState<'play' | 'face'>('play');
  // Coach-drawn arrows + square highlights. The LLM uses
  // `[BOARD: arrow:e2-e4:green]` markers to suggest hypothetical
  // moves WITHOUT committing them on the board — the arrow channel
  // for "you could play Nf3 here, attacking the queen" beats
  // play_move for not-yet-decided lines. parseBoardTags strips the
  // markers from the prose; the parsed annotations get rendered on
  // the board until the next coach turn clears them.
  const [arrows, setArrows] = useState<BoardArrow[]>([]);
  const [highlights, setHighlights] = useState<BoardHighlight[]>([]);
  // "Hint" button — Stockfish computes the best move for the current
  // position and we lead the eye to it with an arrow. The engine decides
  // (G0/G3), never the LLM. `hintBusy` gates the spinner.
  const [hintBusy, setHintBusy] = useState(false);
  const [kickoffStatus, setKickoffStatus] = useState<{
    label: string;
    step: number;
    total: number;
  } | null>(null);
  // Tracks an in-flight LLM opening generation. When non-null, the
  // chat panel shows a "Putting together the lesson..." banner with
  // an estimated-progress bar and typing is disabled (busy is also
  // set). Cleared when generation completes (success: walkthrough.start
  // fires; failure: ack message rendered). startedAt drives the
  // progress bar's elapsed-time math.
  const [generationStatus, setGenerationStatus] = useState<{
    openingName: string;
    startedAt: number;
  } | null>(null);

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const speechChainRef = useRef<Promise<void>>(Promise.resolve());
  // Per-turn abort flag for the speech chain. Replaces the broken
  // gen-check pattern (speakInternal's internal stop() bumped gen
  // every speak, killing all subsequent chain links). On a new
  // handleSubmit we set the previous turn's flag to true and create
  // a fresh one — orphan chain links observe `aborted=true` and skip,
  // current chain links observe `aborted=false` and proceed.
  const turnAbortRefRef = useRef<{ aborted: boolean } | null>(null);
  // Late-bound handle to startNarratedContinuation (defined far below, near
  // the other chip handlers). handleSubmit calls through this ref so it
  // doesn't need the callback in its dependency array (which would TDZ on a
  // const declared later). Assigned once the real callback exists.
  const startContinuationRef = useRef<() => Promise<void>>(async () => {});
  // Guard for the narrated middle+endgame continuation (see
  // startNarratedContinuation). Declared early so handleSubmit can cancel it.
  const continuationRef = useRef(false);
  // gameRef is the closure-staleness escape hatch. React state updates
  // are batched per render, so when ControlledChessBoard's `onMove`
  // fires (synchronously inside the click/drag handler) and we call
  // `handleSubmit(...)` in the same tick, `game.fen` in the closure
  // still holds the PRE-move FEN. The ref updates synchronously after
  // each render, so reading `gameRef.current.fen` from inside async
  // brain trips always returns the latest state — including after the
  // brain itself plays a move via `handlePlayMove` mid-handleSubmit.
  // Production audit (build 38d4ace) showed the brain's `play_move e5`
  // call rejected because liveFen was the starting position 2s after
  // the student played e4; this ref is the fix.
  const gameRef = useRef(game);
  gameRef.current = game;
  // Audit-instrumentation phase-3 (2026-05-19): track recent user
  // messages so handleSubmit can detect "retry" patterns — the same
  // user typing two semantically similar inputs in a row, signal
  // that the prior turn's resolution didn't satisfy them. Surfaces
  // the "I wanted the danish gambit" → re-tap pattern from the live
  // audit log. Capped at the last 3 entries to bound memory.
  const recentUserInputsRef = useRef<Array<{ text: string; at: number }>>([]);
  // True once the student has submitted ANYTHING (typed, chip-tapped, or
  // played a board move). Used to suppress the deferred kickoff greeting +
  // weakness-nudge session-opener when they fire LATE (activeProfile loads
  // after the user already started a conversation) — otherwise the opener
  // dumps "keep one thing in mind — recurring mistakes in vienna game" on
  // top of an active KIA-vs-Dragon exchange (David 2026-07-18 screenshot).
  const userInteractedRef = useRef(false);
  // Rolling response-length tracking per verbosity tier — when the
  // brain's responses at `brief` average > prompt budget, that's the
  // signal we need to tighten the rules. Capped at 20 entries per
  // tier (rolling). Computed p50/p90 on every emit.
  const responseLengthsRef = useRef<Record<string, number[]>>({});
  // liveFenRef is the SYNCHRONOUS source of truth for the FEN — written
  // by every successful handler (handlePlayMove, handleTakeBack,
  // handleSetBoardPosition, handleResetBoard) immediately after the
  // chess instance mutates, plus by the studentMove path with the
  // post-move FEN. gameRef updates only on React render, so multiple
  // brain trips inside one coachService.ask call (which run
  // synchronously without yielding to React) all see the SAME stale
  // gameRef value. Production audit (build eb38d11) showed the brain
  // play Nxe4 successfully on trip 2 then re-play it on trip 3
  // because trip 3's getLiveFen still returned the pre-Nxe4 FEN —
  // user perceived this as "the coach made my move." liveFenRef fixes
  // that: each play_move handler writes the chess instance's current
  // FEN into it, and getLiveFen reads from this ref. */
  const liveFenRef = useRef(game.fen);
  /** Latest handleStudentMove — lets the (earlier-declared) handleSubmit hand a
   *  typed move report to the exact board-move flow without a TDZ dep. */
  const handleStudentMoveRef = useRef<((move: MoveResult) => void) | null>(null);
  // Active in-place drill (David 2026-07-03: the coach sets a REAL puzzle
  // up ON THE BOARD under Learn, no tab routing). `step` indexes the NEXT
  // expected move in `drill.solutionSan` (student moves at even indices,
  // opponent replies auto-played at odd). Null = no drill running, so all
  // existing walkthrough/play flows are untouched.
  const activeDrillRef = useRef<{
    drill: CoachDrill;
    step: number;
    /** Present in mistake-queue mode; absent for a single fallback drill. */
    progress?: DrillProgress;
    /** True once this puzzle has been SRS-graded this session (one grade
     *  per review — first outcome wins, so an in-session retry to learn
     *  doesn't double-count). */
    graded: boolean;
    /** ms epoch when this puzzle was loaded, for the SRS solve-time. */
    startedAt: number;
  } | null>(null);
  // Background-fed tactics context (real PV tactics) for the SPOKEN + displayed
  // tactic strips, so the brain call never blocks on an engine read.
  const fedTacticsRef = useRef<TacticsLiveContext | null>(null);
  // Keep liveFenRef in sync with the rendered fen on every render too,
  // so external mutations to `game` (loadFen, resetGame, undoMove
  // called from non-coach paths) flow through.
  liveFenRef.current = game.fen;
  // Auto-save the live FEN to coach memory on every render. The
  // store is debounced (250ms) and short-circuits when the FEN
  // hasn't changed, so calling it every render is cheap. Survives
  // app exit via Dexie persistence — the brain's
  // `restore_saved_position` tool falls back to this slot when the
  // student didn't explicitly say "remember this position." User
  // requested this so a sudden close doesn't lose progress.
  useEffect(() => {
    useCoachMemoryStore.getState().setAutoSavedPosition(game.fen);
  }, [game.fen]);

  // Live Stockfish eval of the current position → eval bar.
  // Debounced 250ms to coalesce rapid FEN changes (e.g. brain plays a
  // move while the user is mid-typing). Cancels in-flight analysis
  // when the FEN changes again before the previous one completes —
  // we only care about the latest position. Wrapped in withTimeout
  // so a stuck Stockfish call doesn't hang the bar forever.
  useEffect(() => {
    let cancelled = false;
    const fen = game.fen;
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const wrapped = await withTimeout(
            stockfishEngine.analyzePosition(fen, 12),
            5_000,
            'teach-eval-bar',
          );
          if (cancelled) return;
          if (!wrapped.ok) return;
          const a = wrapped.value;
          setLatestEval(a.evaluation);
          setLatestIsMate(a.isMate);
          setLatestMateIn(a.isMate ? a.evaluation : null);
          // Mirror into the ref so handleSubmit can inject ground-
          // truth engine eval into the envelope without a stale
          // closure. Keyed by FEN so a one-ply-stale eval can't be
          // misattributed to the new position.
          latestEvalRef.current = {
            fen,
            evalCp: a.isMate ? 0 : a.evaluation,
            mateIn: a.mateIn,
            // Capture the full StockfishAnalysis so handleSubmit can
            // pre-compute the tactical context block (forks/pins/
            // threats/opportunities) without re-querying the engine.
            analysis: a,
          };
        } catch {
          // Stockfish hiccup — leave the bar at the last known value
          // rather than reset to null. Less jarring visually.
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [game.fen]);

  // Prefetch Lichess explorer + masters data on every FEN change so
  // the brain sees ECO / opening name / amateur top moves / master
  // top moves / master games in [Live state] without spending a
  // round-trip on the tool. Debounced 350ms to coalesce rapid FEN
  // changes; cancelled when the FEN changes again before settle. Both
  // calls run in parallel. Failures (proxy 401 / circuit open) are
  // swallowed silently — the snapshot just stays stale and the brain
  // can still fall back to the active tools.
  useEffect(() => {
    let cancelled = false;
    const fen = game.fen;
    // Skip the empty / starting position to save a request — the
    // brain already knows what 1.e4 / 1.d4 / etc. are. The prefetch
    // becomes valuable once the lesson has navigated INTO an opening.
    if (fen === STARTING_FEN) {
      lichessSnapshotRef.current = null;
      return;
    }
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const [amateur, masters] = await Promise.all([
            fetchLichessExplorer(fen, 'lichess').catch(() => null),
            fetchLichessExplorer(fen, 'masters').catch(() => null),
          ]);
          if (cancelled) return;
          if (!amateur && !masters) return;
          const opening = amateur?.opening ?? masters?.opening ?? null;
          const topAmateurMoves = (amateur?.moves ?? []).slice(0, 5).map((m) => {
            const total = m.white + m.draws + m.black;
            const whitePct = total > 0
              ? Math.round(((m.white + m.draws * 0.5) / total) * 100)
              : null;
            return { san: m.san, total, whitePct };
          });
          const topMasterMoves = (masters?.moves ?? []).slice(0, 5).map((m) => ({
            san: m.san,
            total: m.white + m.draws + m.black,
            averageRating: m.averageRating,
          }));
          const topMasterGames = (masters?.topGames ?? []).slice(0, 3).map((g) => ({
            white: g.white.name,
            black: g.black.name,
            winner: g.winner,
            year: g.year,
          }));
          lichessSnapshotRef.current = {
            fen,
            snapshot: {
              eco: opening?.eco ?? null,
              name: opening?.name ?? null,
              topAmateurMoves,
              topMasterMoves,
              topMasterGames,
            },
          };
        } catch {
          // Proxy hiccup — leave the snapshot stale; the brain can
          // still call the active tool.
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [game.fen]);

  // Chrome state — kept here so the layout matches /coach/play
  // button-for-button. Color selector picks who the student plays
  // (orientation hand-off), difficulty + coach-tips are visually
  // present for parity even though teach mode doesn't run engine
  // moves; eval-bar / engine-lines toggles drive the board overlays.
  const { settings } = useSettings();
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [difficulty, setDifficulty] = useState<CoachDifficulty>('medium');

  // Discussion-Practice faucet — on a genuine slip during guided play it
  // raises the coach's "why did you play that?" question (David 2026-06-04:
  // the question should pop up on a blunder/mistake in Learn too). No longer
  // silent: with the engine playing the coach's reply, the brain narrates
  // the COACH's move (not the student's slip), so the "why?" prompt fills
  // the gap instead of conflicting. Honors the coachInGameDiscussion setting
  // (falls back to silent capture when the user turned the interjection off).
  const discussion = useDiscussionPractice(true, {
    surface: 'coach-teach',
    interruptive: true,
    // After the student answers "why did you play that?", the picker pop-up
    // disappears and the reveal (best move + the engine's why) lands in the
    // chat — no lingering card (David 2026-07-10).
    onReveal: (text) => setMessages((prev) => [...prev, { id: uid('why-reveal'), role: 'assistant', content: text, timestamp: Date.now() }]),
  });
  const [coachTipsOn, setCoachTipsOn] = useState<boolean>(true);
  const [evalBarOverride, setEvalBarOverride] = useState<boolean | null>(null);

  // GUIDED FIND-THE-MOVE (P2 of the faucet — David 2026-07-11: "I would love
  // for the coach to ask the user questions"). When the student is clearly
  // winning and the engine's move is notable, the coach names the piece + goal
  // and WITHHOLDS the square; the student answers by playing it on the board.
  // Everything computed (guidedFindTheMove.ts); the narration LLM is handed
  // ONLY the question, never the answer, so it cannot leak it. The card below
  // the board carries Hint (reveals) + Skip.
  const [guidedFind, setGuidedFind] = useState<GuidedFindChallenge | null>(null);
  const guidedFindRef = useRef<GuidedFindChallenge | null>(null);
  const guidedFindAttemptsRef = useRef(0);
  /** Ply of the last question asked — min-gap throttle so the coach doesn't
   *  quiz every single move of a won game. */
  const guidedFindLastAskPlyRef = useRef(-999);

  const clearGuidedFind = useCallback((): void => {
    guidedFindRef.current = null;
    guidedFindAttemptsRef.current = 0;
    setGuidedFind(null);
  }, []);

  const handleGuidedFindHint = useCallback((): void => {
    const ch = guidedFindRef.current;
    if (!ch) return;
    captureEvent('guided_find_result', { surface: 'coach-teach', outcome: 'hint', attempts: guidedFindAttemptsRef.current, answer: ch.answerSan });
    setMessages((prev) => [...prev, { id: uid('guided-hint'), role: 'assistant', content: ch.hint, timestamp: Date.now() }]);
    void voiceService.speakForced(ch.hint).catch(() => undefined);
    clearGuidedFind(); // answer revealed — the student plays on freely
  }, [clearGuidedFind]);

  const handleGuidedFindSkip = useCallback((): void => {
    const ch = guidedFindRef.current;
    if (!ch) return;
    captureEvent('guided_find_result', { surface: 'coach-teach', outcome: 'skip', attempts: guidedFindAttemptsRef.current, answer: ch.answerSan });
    clearGuidedFind();
  }, [clearGuidedFind]);

  // THREAT-CHECK question (David 2026-07-11) — after the coach's reply, when
  // one of the STUDENT's pieces is genuinely hanging, the coach asks WHICH
  // piece is in danger before they move. Chips computed (threatCheck.ts);
  // the tactics narration facts are suppressed while it's open so nothing
  // leaks the answer.
  const [threatCheck, setThreatCheck] = useState<ThreatCheckQuestion | null>(null);
  const threatCheckRef = useRef<ThreatCheckQuestion | null>(null);
  const threatCheckLastAskPlyRef = useRef(-999);
  /** Traps/gems already announced this game (openingFactChains dedup) — the
   *  same lurking line isn't re-announced on every ply it stays live. */
  const announcedTrapsRef = useRef(new Set<string>());
  // FORK IN THE ROAD (David 2026-07-11: "when there is a fork in the road the
  // coach could talk about both options… advantages and disadvantages of
  // both"). Near-equal, different-character options get deliberated — the
  // student answers BY PLAYING (never a card). Max 3 per game; after the pick,
  // ONE road-affirming clause, then quiet ("less waste, more impact").
  const forkTalkCountRef = useRef(0);
  const pendingForkRef = useRef<ForkTalk | null>(null);
  // DICTATED COACH MOVE (David 2026-07-12: "It needs to play every move I
  // tell it to"). A move the student commanded while it wasn't the coach's
  // turn — armed here and consumed FIRST by resolveCoachReplyMove, so the
  // coach's next reply is exactly the dictated move (validated legal at
  // consume time; silently dropped with an audit if the position moved on).
  const pendingCoachMoveRef = useRef<string | null>(null);
  /** Last ply a think-aloud deliberation fired (#20 throttle). */
  const thinkAloudLastPlyRef = useRef(-999);
  // SESSION BOOKENDS (David 2026-07-11): running tallies for the closing
  // takeaway spoken on End Lesson — questions asked/found + slips stopped on.
  // All computed; the closer is a deterministic line (no LLM needed).
  const sessionStatsRef = useRef({ slips: 0, questions: 0, correct: 0 });
  const lastPromptCountedRef = useRef(false);
  useEffect(() => {
    if (discussion.prompt && !lastPromptCountedRef.current) {
      lastPromptCountedRef.current = true;
      sessionStatsRef.current.slips += 1;
    } else if (!discussion.prompt) {
      lastPromptCountedRef.current = false;
    }
  }, [discussion.prompt]);

  /** The chain's lead-the-eye arrows/highlights for the CURRENT position
   *  (David 2026-07-11: "help the user visualize the moves the coach is
   *  talking about"). Painted the moment the reply lands and merged into the
   *  narration's own arrow pass so the later setArrows doesn't wipe them.
   *  Cleared on the student's next move with the rest of the board art. */
  const chainArrowsRef = useRef<BoardArrow[]>([]);
  const chainHighlightsRef = useRef<BoardHighlight[]>([]);

  const clearThreatCheck = useCallback((): void => {
    threatCheckRef.current = null;
    setThreatCheck(null);
  }, []);

  const handleThreatCheckPick = useCallback((picked: string): void => {
    const q = threatCheckRef.current;
    if (!q) return;
    const correct = judgeThreatCheckPick(q, picked);
    if (correct) sessionStatsRef.current.correct += 1;
    const text = `${correct ? "That's the one." : 'Not quite.'} ${q.reveal}`;
    captureEvent('threat_check_result', { surface: 'coach-teach', outcome: correct ? 'correct' : 'wrong', picked, answer: q.answer });
    clearThreatCheck();
    setMessages((prev) => [...prev, { id: uid('threat-reveal'), role: 'assistant', content: text, timestamp: Date.now() }]);
    void voiceService.speakForced(text).catch(() => undefined);
  }, [clearThreatCheck]);

  const handleThreatCheckSkip = useCallback((): void => {
    const q = threatCheckRef.current;
    if (!q) return;
    captureEvent('threat_check_result', { surface: 'coach-teach', outcome: 'skip', answer: q.answer });
    clearThreatCheck();
  }, [clearThreatCheck]);

  // A walkthrough taking over the board supersedes any open question — the
  // judge's stale-FEN check already refuses to score a drifted board; this
  // just removes the card so it never lingers over a lesson.
  useEffect(() => {
    if (walkthrough.isActive) {
      clearGuidedFind();
      clearThreatCheck();
    }
  }, [walkthrough.isActive, clearGuidedFind, clearThreatCheck]);

  // A live walkthrough must survive a deploy: hold the service-worker update
  // reload (index.html controllerchange handler) until the lesson ends.
  useEffect(() => {
    if (!walkthrough.isActive) return;
    return acquireSwReloadHold();
  }, [walkthrough.isActive]);

  // Auto-flip the board when a walkthrough loads a tree whose
  // studentSide differs from the current orientation. Black-side
  // openings (Sicilian, French, Caro-Kann, Pirc, etc.) render with
  // Black on bottom so the moves animate from the student's
  // perspective. User asked for this directly. The flip fires on
  // tree change — start, cache hit, LLM gen success, punish lesson
  // entry, parent restore on punish exit. Manual color toggle still
  // works after the auto-flip; the user can override.
  useEffect(() => {
    if (!walkthrough.tree) return;
    const target =
      walkthrough.tree.studentSide ??
      inferStudentSide(walkthrough.tree.openingName);
    if (target !== playerColor) {
      setPlayerColor(target);
      game.setOrientation(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkthrough.tree]);
  // Live Stockfish evaluation of the current position. Drives the
  // eval bar on the board so it moves with each ply (matches what
  // /coach/play and /coach/review already do). Debounced — every
  // game.fen change kicks off an analyzePosition with a 250ms delay
  // so rapid sequences (kickoff reset → first move) don't queue
  // multiple analyses; only the last FEN's analysis runs. null while
  // analysis is pending so the bar can fall back to 50/50 silently.
  const [latestEval, setLatestEval] = useState<number | null>(null);
  const [latestIsMate, setLatestIsMate] = useState(false);
  const [latestMateIn, setLatestMateIn] = useState<number | null>(null);
  // Mirror the eval into a ref keyed by FEN so handleSubmit can inject
  // ground-truth engine eval into the brain's [Live state] envelope
  // WITHOUT a stale-closure on latestEval (handleSubmit's deps don't
  // include eval state). The brain otherwise self-counts material and
  // hallucinates ("up a pawn" after a queen-for-knight trade) —
  // production audit (build 4e628e5). We only surface the eval when
  // its FEN matches the FEN we're asking about, so a one-ply-stale
  // eval doesn't get misattributed to the new position.
  const latestEvalRef = useRef<{
    fen: string;
    evalCp: number;
    mateIn: number | null;
    analysis: StockfishAnalysis | null;
  } | null>(null);
  // Pre-fetched Lichess explorer snapshot for the current FEN. Same
  // pattern as the eval bar — the surface fires the expensive request
  // BEFORE the brain has to ask for it, then injects the compact
  // result into the [Live state] envelope so opening names + master
  // moves + master games are available for free on every turn. Brain
  // still has the active lichess_opening_lookup / lichess_master_games
  // tools for branch FENs the lesson hasn't navigated to yet.
  const lichessSnapshotRef = useRef<{
    fen: string;
    snapshot: NonNullable<LiveState['lichessSnapshot']>;
  } | null>(null);
  const [engineLinesOverride, setEngineLinesOverride] = useState<boolean | null>(null);
  const showEvalBarEffective = evalBarOverride ?? settings.showEvalBar;
  const showEngineLinesEffective = engineLinesOverride ?? settings.showEngineLines;

  // ─── LLM-driven board mutations ─────────────────────────────────────
  // The brain emits [[ACTION:play_move {"san":"Nf3"}]] etc. These
  // handlers translate the marker into useChessGame mutations. SAN →
  // from/to is resolved via a probe Chess instance against the current
  // FEN (chess.js's verbose move list), then routed through
  // `game.makeMove` so lastMove highlight + selection state stay
  // consistent with the manual move path.

  const handlePlayMove = useCallback((san: string): { ok: boolean; reason?: string } => {
    // Audit rejections so paste-back logs surface "the brain tried X
    // and the surface refused" without needing DevTools. Same shape
    // CoachGamePage uses (audit #12).
    const finish = (result: { ok: boolean; reason?: string }): { ok: boolean; reason?: string } => {
      if (!result.ok) {
        void logAppAudit({
          kind: 'coach-tool-callback-rejected',
          category: 'subsystem',
          source: 'CoachTeachPage.handlePlayMove',
          summary: `san=${san} reason=${result.reason ?? 'unknown'}`,
        });
      }
      return result;
    };
    try {
      // Validate against liveFenRef (the SYNCHRONOUS post-move FEN)
      // rather than gameRef.current.fen (which only updates on render).
      // Multiple brain trips inside one coachService.ask call run
      // without yielding to React, so the only correct source of truth
      // for "where the board is right now" is the ref each handler
      // updates synchronously after every successful mutation.
      const liveFen = liveFenRef.current;
      // USER SOVEREIGNTY: refuse to move the student's pieces. The
      // brain plays only the side OPPOSITE the student. If the FEN's
      // side-to-move matches the student's color, this move would be
      // moving one of THEIR pieces — even if it's just a demo. Tell
      // the brain to use arrows + set_board_position for hypotheticals
      // instead. Production audit (build abf2a2b) showed the brain
      // emitting play_move Qxd5 from a white-to-move FEN while the
      // student plays white, demonstrating "what if you grabbed the
      // pawn" — the user perceived this as "the coach moved my piece
      // without asking."
      const fenSideToMove = liveFen.split(' ')[1] === 'w' ? 'white' : 'black';
      const studentColor = playerColor;
      if (fenSideToMove === studentColor) {
        return finish({
          ok: false,
          reason: `Refused: it's ${studentColor} to move and the student plays ${studentColor}. You may not move the student's pieces. For hypothetical demos, use [BOARD: arrow:from-to:color] arrows OR set_board_position to a separate position. play_move is reserved for YOUR moves on your own turns.`,
        });
      }
      const probe = new Chess(liveFen);
      const verboseMoves = probe.moves({ verbose: true });
      const match = verboseMoves.find((m) => m.san === san);
      if (!match) {
        return finish({ ok: false, reason: `chess.js rejected "${san}" from FEN ${liveFen}: Invalid move: ${san}` });
      }
      const result = gameRef.current.makeMove(match.from, match.to, match.promotion);
      if (!result) return finish({ ok: false, reason: `makeMove failed for ${san}` });
      // Write the post-move FEN back so the next trip's getLiveFen
      // reads the up-to-date board, even before React re-renders.
      liveFenRef.current = result.fen;
      return finish({ ok: true });
    } catch (err) {
      return finish({ ok: false, reason: err instanceof Error ? err.message : String(err) });
    }
  }, [playerColor]);

  // Play a move the STUDENT explicitly dictated for the coach ("play d4").
  // Bypasses handlePlayMove's user-sovereignty guard on purpose: the guard
  // exists so the BRAIN can't move the student's pieces uninvited; a move the
  // student commanded is the student's own sovereignty exercised. Also avoids
  // the stale `playerColor` closure during a game-start side swap. chess.js
  // validates; an illegal SAN is a no-op.
  const playDictatedMove = useCallback((san: string): boolean => {
    try {
      const probe = new Chess(liveFenRef.current);
      const match = probe.moves({ verbose: true }).find((m) => m.san === san);
      if (!match) return false;
      const result = gameRef.current.makeMove(match.from, match.to, match.promotion);
      if (!result) return false;
      liveFenRef.current = result.fen;
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleTakeBack = useCallback((count: number): { ok: boolean; reason?: string } => {
    const finish = (result: { ok: boolean; reason?: string }): { ok: boolean; reason?: string } => {
      if (!result.ok) {
        void logAppAudit({
          kind: 'coach-tool-callback-rejected',
          category: 'subsystem',
          source: 'CoachTeachPage.handleTakeBack',
          summary: `count=${count} reason=${result.reason ?? 'unknown'}`,
        });
      }
      return result;
    };
    try {
      for (let i = 0; i < count; i++) {
        gameRef.current.undoMove();
      }
      // Re-derive the post-takeback FEN from the live game object so
      // subsequent trips see the rolled-back state.
      liveFenRef.current = gameRef.current.fen;
      return finish({ ok: true });
    } catch (err) {
      return finish({ ok: false, reason: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const handleSetBoardPosition = useCallback((newFen: string): { ok: boolean; reason?: string } => {
    const finish = (result: { ok: boolean; reason?: string }): { ok: boolean; reason?: string } => {
      if (!result.ok) {
        void logAppAudit({
          kind: 'coach-tool-callback-rejected',
          category: 'subsystem',
          source: 'CoachTeachPage.handleSetBoardPosition',
          summary: `reason=${result.reason ?? 'unknown'}`,
          fen: newFen,
        });
      }
      return result;
    };
    try {
      new Chess(newFen);
      const ok = gameRef.current.loadFen(newFen);
      if (ok) liveFenRef.current = newFen;
      return ok ? finish({ ok: true }) : finish({ ok: false, reason: 'loadFen returned false' });
    } catch (err) {
      return finish({ ok: false, reason: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const handleResetBoard = useCallback((): { ok: boolean } => {
    gameRef.current.resetGame(STARTING_FEN);
    liveFenRef.current = STARTING_FEN;
    return { ok: true };
  }, []);

  // ─── In-place drills (coach sets a REAL puzzle up on the board) ──────
  // David 2026-07-03: "the coach sets them up on the board under learn
  // tab" — not routed to the tactics tab, and NEVER an LLM-invented
  // drill (G0). The puzzle + solution come from coachDrillService (the
  // Lichess DB + chess.js); the coach only voices the prompt/feedback.

  /** Append a coach line to the chat + memory and speak it. */
  const coachDrillSay = useCallback((text: string): void => {
    const id = `drill-say-${Date.now()}`;
    setMessages((prev) => [...prev, { id, role: 'assistant', content: text, timestamp: Date.now() }]);
    useCoachMemoryStore.getState().appendConversationMessage({
      surface: 'chat-teach', role: 'coach', text, fen: gameRef.current.fen, trigger: null,
    });
    void voiceService.speak(text);
  }, []);

  /** Put a drill's position on the board (no announce) + arm the ref. */
  const loadDrillOntoBoard = useCallback((drill: CoachDrill, progress?: DrillProgress): void => {
    gameRef.current.loadFen(drill.setupFen);
    liveFenRef.current = drill.setupFen;
    activeDrillRef.current = { drill, step: 0, progress, graded: false, startedAt: Date.now() };
    setArrows([]);
    setHighlights([]);
  }, []);

  /** Grade the current drill through the SAME SRS pipeline the rest of
   *  the app uses (gradeMistakePuzzle → 'mastered' after MASTERY_REPETITIONS
   *  correct spaced reps). One grade per puzzle per session — the first
   *  outcome wins (David 2026-07-03). No-ops for a DB-fallback drill whose
   *  id isn't a stored mistake. */
  const gradeDrillOnce = useCallback((correct: boolean): void => {
    const cur = activeDrillRef.current;
    if (!cur || cur.graded) return;
    cur.graded = true;
    const solveTimeMs = Math.max(0, Date.now() - cur.startedAt);
    void gradeMistakePuzzle(cur.drill.puzzleId, correct ? 'good' : 'again', correct, solveTimeMs);
  }, []);

  /** Set a real drill up on the board and announce the challenge. When
   *  `progress` is passed the drill is part of the adaptive mistake queue;
   *  `lead` prefixes the announce (e.g. "Starting with your Forks."). */
  const startCoachDrill = useCallback((drill: CoachDrill, progress?: DrillProgress, lead?: string): void => {
    walkthrough.stop();
    voiceService.stop();
    loadDrillOntoBoard(drill, progress);
    const intro = `${lead ? `${lead} ` : ''}${drill.prompt} Play your move on the board.`;
    setMessages((prev) => [...prev, {
      id: uid('drill-intro'), role: 'assistant', content: intro, timestamp: Date.now(),
    }]);
    useCoachMemoryStore.getState().appendConversationMessage({
      surface: 'chat-teach', role: 'coach', text: intro, fen: drill.setupFen, trigger: null,
    });
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachTeachPage.startCoachDrill',
      summary: `in-place drill ${drill.aid} puzzle=${drill.puzzleId} r=${drill.rating} queue=${progress ? `${progress.themeIdx}.${progress.puzzleIdx}` : 'single'}`,
    });
    void voiceService.speak(intro);
  }, [walkthrough, loadDrillOntoBoard]);

  /** Load the user's mistake queue (most-common weakness first) and start
   *  drilling it. Returns false when the user has no mistakes yet, so the
   *  caller can fall back to a single DB-sourced drill. */
  const startMistakeDrills = useCallback(async (): Promise<boolean> => {
    const queue = await buildMistakeDrillQueue();
    if (queue.length > 0) {
      const progress: DrillProgress = { queue, themeIdx: 0, puzzleIdx: 0 };
      startCoachDrill(queue[0].drills[0], progress, `We'll start with your most common weakness — ${queue[0].label}. Get these right over a few days and they'll test out.`);
      return true;
    }
    // Nothing due. Two cases (David 2026-07-03):
    //  - the user HAS uploaded games → they're genuinely caught up on
    //    reviews; say so, don't serve a generic puzzle.
    //  - no uploaded games at all → fall back to a DB tactic (return false
    //    so the caller picks one).
    if (await hasImportedGames()) {
      coachDrillSay(
        "You're all caught up — no mistakes are due to review today. The spaced-repetition tool will bring them back when it's time. Want a fresh tactic instead? Just say “drill tactics.”",
      );
      return true;
    }
    return false;
  }, [startCoachDrill, coachDrillSay]);

  /** Called when the student SOLVES the current drill (whole line done).
   *  Single drill → offer another. Mistake-queue → advance to the next due
   *  mistake / next weakness. The SRS grade (real "test out") is applied
   *  by the caller before this runs. */
  const completeDrill = useCallback((solved: { drill: CoachDrill; step: number; progress?: DrillProgress }): void => {
    if (!solved.progress) {
      activeDrillRef.current = null;
      coachDrillSay('Solved — nice. Say “drill” again for another.');
      return;
    }
    const adv = advanceMistakeDrill(solved.progress);
    if (adv.done) {
      activeDrillRef.current = null;
      coachDrillSay(
        adv.completedLabel
          ? `That's your due ${adv.completedLabel} — and every weakness due today. Solve them right across a few days and they'll test out for good.`
          : "That's every mistake due today. Solve them right across a few days and they'll test out for good.",
      );
      return;
    }
    if (!adv.next) { activeDrillRef.current = null; return; }
    loadDrillOntoBoard(adv.next.drill, adv.next.progress);
    coachDrillSay(
      adv.themeCompleted
        ? `Nice — that's your due ${adv.completedLabel} for today. On to ${adv.nextLabel}. ${adv.next.drill.prompt}`
        : `Good. ${adv.next.drill.prompt}`,
    );
  }, [coachDrillSay, loadDrillOntoBoard]);

  /** Validate a student board move against the active drill's solution.
   *  Returns true when the move was consumed by a drill (so the normal
   *  student-move flow must NOT run). Correct → auto-play the opponent
   *  reply and advance; wrong → undo + hint and let them retry. */
  const processDrillMove = useCallback((move: MoveResult): boolean => {
    const cur = activeDrillRef.current;
    if (!cur) return false;
    voiceService.stop();
    const strip = (s: string): string => s.replace(/[+#]$/, '');
    const expected = cur.drill.solutionSan[cur.step];
    const correct = move.san === expected || strip(move.san) === strip(expected);
    if (!correct) {
      // Wrong → SRS-grade 'again' (first outcome only; resets the rep
      // streak so this mistake comes back sooner), undo, hint, retry.
      gradeDrillOnce(false);
      gameRef.current.undoMove();
      liveFenRef.current = gameRef.current.fen;
      setArrows([]);
      setHighlights([]);
      coachDrillSay("That's not the strongest here — take another look and try again.");
      return true;
    }
    liveFenRef.current = move.fen;
    const step = cur.step + 1;
    if (step >= cur.drill.solutionSan.length) {
      // Student played the final move of the line → solved.
      gradeDrillOnce(true);
      completeDrill(cur);
      return true;
    }
    // Auto-play the opponent's reply, then hand the move back.
    const oppReply = cur.drill.solutionSan[step];
    const afterOppStep = step + 1;
    activeDrillRef.current = { ...cur, step };
    window.setTimeout(() => {
      const r = handlePlayMove(oppReply);
      if (!r.ok) { activeDrillRef.current = null; return; }
      liveFenRef.current = gameRef.current.fen;
      if (afterOppStep >= cur.drill.solutionSan.length) {
        gradeDrillOnce(true);
        completeDrill(cur);
      } else {
        activeDrillRef.current = { ...cur, step: afterOppStep };
        coachDrillSay('Good. Keep going — find the next move.');
      }
    }, 650);
    return true;
  }, [coachDrillSay, handlePlayMove, completeDrill, gradeDrillOnce]);

  // Hand-off from another surface: `/coach/teach?drill=<aid>` (play /
  // chat / voice route drill requests here so the coach sets them up ON
  // THE BOARD in Learn, per David 2026-07-03). Runs once, then strips the
  // param so a reload doesn't re-trigger.
  const drillParamHandledRef = useRef(false);
  useEffect(() => {
    if (drillParamHandledRef.current) return;
    const drillAid = searchParams.get('drill');
    if (!drillAid) return;
    drillParamHandledRef.current = true;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drill');
      return next;
    }, { replace: true });
    if (!isDrillableAid(drillAid)) return;
    void (async () => {
      // Prefer the user's own mistakes (most common first, adaptive);
      // fall back to a single DB-sourced drill for a new user.
      if (await startMistakeDrills()) return;
      const rating = activeProfile?.puzzleRating ?? activeProfile?.currentRating ?? 1200;
      const drill = pickCoachDrill(drillAid, { rating });
      if (drill) startCoachDrill(drill);
    })();
  }, [searchParams, setSearchParams, activeProfile, startCoachDrill, startMistakeDrills]);

  /** Notify the user when a background-generated stage finishes
   *  loading. Pushes a coach chat message + refreshes the
   *  walkthrough's in-memory tree so the leaf-menu picks up the new
   *  content. User: "How would a user know there are new lines now?
   *  Need to figure out a way for coach to let them know that punish
   *  lines and quizzes have loaded." */
  const handleStageMerged = useCallback(
    (stage: 'concepts' | 'findMove' | 'drill' | 'punish'): void => {
      void walkthrough.mergeStagesFromCache();
      const labels: Record<typeof stage, string> = {
        concepts: 'Quiz questions',
        findMove: 'Find-the-move puzzles',
        drill: 'Drill lines',
        punish: 'Punish (trap) lessons',
      };
      const msg = `${labels[stage]} just loaded — they'll show up in the menu when you reach the end of the walkthrough.`;
      const id = `stage-loaded-${stage}-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id, role: 'assistant', content: msg, timestamp: Date.now() },
      ]);
      useCoachMemoryStore.getState().appendConversationMessage({
        surface: 'chat-teach',
        role: 'coach',
        text: msg,
        fen: gameRef.current.fen,
        trigger: null,
      });
    },
    [walkthrough],
  );

  // Coach asks the student whether they want to play the line out
  // themselves the first time they reach the leaf of a given opening.
  // Conversational prompt that matches the user's path into the
  // lesson (typed chat → walkthrough plays → coach asks at the end).
  // Tracks per-opening so re-visits / backtrack→leaf cycles don't
  // re-ask. The "Play this line out yourself" button at the leaf
  // panel is the one-click action that closes the loop.
  const playOutPromptedFor = useRef<Set<string>>(new Set());
  useEffect(() => {
    const openingName = walkthrough.tree?.openingName;
    if (walkthrough.phase !== 'leaf' || !openingName) return;
    // Derived trees (punish one-shots) aren't an opening line you "play
    // out into the middlegame against me" — they end on a tactical shot
    // (often mate). The whyPunish outro already closes them; don't tack
    // on the play-out invitation with the composite display name.
    if (walkthrough.tree?.derived) return;
    if (playOutPromptedFor.current.has(openingName)) return;
    playOutPromptedFor.current.add(openingName);
    // Offer to CONTINUE into a full narrated game (David 2026-07-18: "once
    // the opening teaching has been completed the coach should ask the user
    // if they want the game/teaching to continue so they can see a middle
    // and endgame") — via a tappable chip, alongside playing it out yourself.
    const msg = `That's the ${openingName} through the opening. Want to keep going and watch the middlegame and endgame play out? Tap below — or use the Play button to play the line out yourself against me.`;
    const id = `play-out-prompt-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id,
        role: 'assistant',
        content: msg,
        timestamp: Date.now(),
        choices: [CONTINUE_GAME_CHIP],
      },
    ]);
    useCoachMemoryStore.getState().appendConversationMessage({
      surface: 'chat-teach',
      role: 'coach',
      text: msg,
      fen: gameRef.current.fen,
      trigger: null,
    });
    // Speak a tight summary — the full sentence above is long for
    // voice. The position changing in the student's favor IS the
    // acknowledgment (per CLAUDE.md narration rules); voice carries
    // only the ask itself.
    void voiceService
      .speakForced(`Want to watch the middlegame and endgame play out? Or play the line out yourself?`)
      .catch(() => undefined);
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachTeachPage.leafPlayOutPrompt',
      summary: `leaf reached — asked student to play out "${openingName}"`,
    });
  }, [walkthrough.phase, walkthrough.tree?.openingName, walkthrough.tree?.derived]);

  const handleSubmit = useCallback(async (
    text: string,
    opts?: {
      kickoff?: boolean;
      /** Explicit post-move FEN override. Required when handleSubmit
       *  is called from a board onMove callback because React hasn't
       *  re-rendered yet — `gameRef.current` still holds the previous
       *  render's value at that moment. The MoveResult emitted by
       *  useChessGame already carries the post-move FEN, so the move
       *  callback hands it in. Without this the brain saw the pre-move
       *  FEN and replied "e4 hasn't landed yet" after the student
       *  played e4 (production audit, build cf2fe0b). */
      fenOverride?: string;
      /** Engine-driven step-by-step turn (GROUNDING TRUTH): the engine/DB
       *  ALREADY played the coach's reply (this SAN) in code; the brain must
       *  only NARRATE it. Defined (a SAN, or '' when there was no legal
       *  reply) means "this is the step-by-step path; play_move is disabled
       *  so the LLM cannot pick or play a move." Undefined = legacy path. */
      coachReplyPlayed?: string;
      /** GROUNDING COMPLETENESS (David 2026-06-15): the captured-piece +
       *  squares fact for the coach's reply, computed in code (chess.js).
       *  The SAN alone (e.g. "Qxg5") tells the LLM a capture happened but NOT
       *  what was taken — and the after-FEN can't tell it either (the victim
       *  is gone). Without this the LLM fabricates the victim ("queen takes
       *  queen"). Handed in so the LLM narrates the REAL capture, never an
       *  invented one. */
      coachReplyFact?: string;
    },
  ): Promise<void> => {
    if (!text.trim() || busy) return;
    // Audit-instrumentation phase-1 (2026-05-19): mint a turn id and
    // make it the module-default for the duration of this handleSubmit.
    // Every logAppAudit call from any code reached during this turn
    // (chat surface, brain, tools, voice service, etc.) auto-stamps
    // the id, so the audit log is pivotable by turn.
    const turnAuditId = mintTurnId('teach');
    setCurrentTurnId(turnAuditId);
    // Mark the session active so a late-firing kickoff greeting/opener
    // won't interrupt (see userInteractedRef).
    if (!opts?.kickoff) userInteractedRef.current = true;

    // Any new user turn cancels a running narrated continuation.
    continuationRef.current = false;
    // CONTINUE-THE-GAME intent (David 2026-07-18): the leaf "Watch the
    // middlegame and endgame" chip, or a typed equivalent, kicks off the
    // coach playing + narrating the rest of the game. Intercept BEFORE any
    // opening/matchup routing so it isn't parsed as an opening name.
    {
      const t = text.trim();
      // Only continue when there's a REAL opening/position on the board to
      // continue from — an active walkthrough, or one paused at the leaf where
      // the coach just offered "want to keep going?". Without this guard a
      // "show me the middlegame" with nothing loaded would narrate a game from
      // the start position; and it keeps the intent from being stolen from the
      // opening router when the user genuinely wants a NEW opening.
      const haveLineToContinue = walkthrough.isActive || walkthrough.phase === 'leaf';
      const isContinueIntent =
        t === CONTINUE_GAME_CHIP ||
        (haveLineToContinue &&
          (CONTINUE_GAME_RE.test(t) ||
            // A bare "yes"/"sure" ONLY at the leaf, where the offer is showing.
            (walkthrough.phase === 'leaf' && CONTINUE_AFFIRM_RE.test(t))));
      if (isContinueIntent) {
        setCoachChoices(null);
        setMessages((prev) => [...prev, { id: uid('cont-u'), role: 'user', content: text, timestamp: Date.now() }]);
        void startContinuationRef.current();
        return;
      }
    }

    // Audit-instrumentation phase-3: user-retry detection. Compare
    // this input against the previous user input. When the two share
    // a major content token AND the previous turn isn't very old,
    // emit a `user-retry-detected` event — signal the prior turn's
    // resolution probably missed what they wanted.
    const trimmedText = text.trim();
    {
      const prev = recentUserInputsRef.current[recentUserInputsRef.current.length - 1];
      // A step-by-step move report ("I played e4." → "I played dxc6.") is NOT
      // a re-ask — consecutive reports share "I played" and falsely tripped the
      // token-overlap heuristic, spamming coach_non_answer (David 2026-06-16).
      if (prev && !isMoveReport(trimmedText) && !isMoveReport(prev.text) && Date.now() - prev.at < 5 * 60_000) {
        const norm = (s: string) =>
          s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
        const prevTokens = new Set(norm(prev.text).split(' ').filter((t) => t.length >= 4));
        const currTokens = norm(trimmedText).split(' ').filter((t) => t.length >= 4);
        const shared = currTokens.filter((t) => prevTokens.has(t));
        if (shared.length >= 1 && shared.length / Math.max(currTokens.length, 1) >= 0.4) {
          void logAppAudit({
            kind: 'user-retry-detected',
            category: 'subsystem',
            source: 'CoachTeachPage.handleSubmit.retryDetector',
            summary: `user retry: "${trimmedText.slice(0, 50)}" follows "${prev.text.slice(0, 50)}" (shared tokens: ${shared.join(', ')})`,
            details: JSON.stringify({
              currentInput: trimmedText,
              previousInput: prev.text,
              previousAt: prev.at,
              gapMs: Date.now() - prev.at,
              sharedTokens: shared,
            }),
          });
          // Also surface the re-ask to PostHog as a coach non-answer so the
          // error-watch cron + autofix pipeline triage it — the prior answer
          // didn't satisfy (David 2026-06-14: he re-asked "weakest aspect").
          reportCoachReask({ surface: 'coach-teach', priorQuestion: prev.text, reask: trimmedText });
        }
      }
      // Track current input for the NEXT retry check. Cap at 3 entries.
      recentUserInputsRef.current.push({ text: trimmedText, at: Date.now() });
      if (recentUserInputsRef.current.length > 3) recentUserInputsRef.current.shift();
    }

    // Audit-instrumentation phase-5 (2026-05-19): classify the user's
    // ask when it's a future-moves / positional-ideas question — the
    // shape that hits stockfish_eval + lookup_master_play. Lets us
    // pivot the audit log by question type and see whether the brain
    // answers these well (e.g. cites grounded data vs invents lines).
    {
      const lowered = trimmedText.toLowerCase();
      const futureMoves =
        /\b(best move|best response|what should i play|what should i do|what would you play|what now|what.s next|continuation|continue with|best continuation|best line|what move)\b/.test(lowered);
      const positionalIdeas =
        /\b(plan|plans|strategy|positional|maneuver|idea|ideas|what.s the (point|plan|idea)|long.term|long term|midgame plan|middlegame plan|pawn structure|piece activity)\b/.test(lowered);
      if (futureMoves || positionalIdeas) {
        void logAppAudit({
          kind: 'followup-context-check',
          category: 'subsystem',
          source: 'CoachTeachPage.questionClassifier',
          summary:
            `coach question: ${futureMoves ? 'future-moves ' : ''}${positionalIdeas ? 'positional-ideas ' : ''}` +
            `"${trimmedText.slice(0, 50)}" — expecting Stockfish + master-play grounding`,
          details: JSON.stringify({
            currentInput: trimmedText,
            classifications: {
              futureMoves,
              positionalIdeas,
            },
            walkthroughOpening: walkthrough.tree?.openingName ?? null,
            currentFen: gameRef.current.fen,
            // These are the audit kinds we expect to see fire downstream
            // on this turn — if the brain replied without one of them
            // the grounding pipeline missed.
            expectedAudits: [
              'coach-brain-tool-called (stockfish_eval)',
              futureMoves ? 'master-play-prefetch / master-play-lookup' : null,
            ].filter(Boolean),
          }),
        });
      }
    }

    // Audit-instrumentation phase-3: followup-context-check. Short
    // followups (< 5 words) after a state-changing prior turn often
    // expose context-loss bugs (e.g. user types "which is most
    // aggressive?" right after the coach set the board to Danish
    // Gambit; if the brain replies about a different opening, the
    // context was lost). Captures the prior opening on the board so
    // post-turn analysis can compare against the brain's reply.
    {
      const wordCount = trimmedText.split(/\s+/).length;
      const prior = recentUserInputsRef.current[recentUserInputsRef.current.length - 2];
      if (wordCount < 5 && prior) {
        void logAppAudit({
          kind: 'followup-context-check',
          category: 'subsystem',
          source: 'CoachTeachPage.handleSubmit.followupDetector',
          summary: `short follow-up (${wordCount} words): "${trimmedText}" — expecting context: ${walkthrough.tree?.openingName ?? '(none)'}`,
          details: JSON.stringify({
            currentInput: trimmedText,
            wordCount,
            walkthroughOpening: walkthrough.tree?.openingName ?? null,
            priorInput: prior.text,
            currentFen: gameRef.current.fen,
          }),
        });
      }
    }

    // Any new turn invalidates an outstanding [CHOICES:] prompt —
    // the brain's previous question has been answered (or
    // superseded), so clear the chips before the new response
    // streams. tryExtractChoicesMarker re-sets them if the new
    // response is itself another disambiguation.
    setCoachChoices(null);

    // ─── Walkthrough control intent (deterministic — BYPASS the brain) ───
    // A walkthrough on the board (paused OR mid-narration) turns control
    // phrases into COMMANDS, not opening searches. Before this, typing a
    // control word like "start" / "go" / "new lesson" on a PAUSED
    // walkthrough fell into the bare-name fuzzy router: it fuzzy-matched
    // "start" as an opening NAME and surfaced a nonsense "I don't have an
    // exact match for 'start'. Did you mean one of these?" picker with
    // random openings, while the paused walkthrough just sat there — the
    // coach never stopped what it was doing, never started a new lesson,
    // never resumed (David 2026-06-12, screenshot). Pure regex over the
    // student's text; the LLM is never in this loop (G0). Runs BEFORE the
    // auto-pause below so walkthrough.phase still reflects reality.
    if (
      !opts?.kickoff &&
      opts?.coachReplyPlayed === undefined &&
      walkthrough.isActive
    ) {
      const control = classifyWalkthroughControl(trimmedText);
      if (control === 'new' || control === 'stop') {
        const priorOpening = walkthrough.tree?.openingName ?? null;
        const ctlTurnId = freshTurnId('walkthrough-control');
        setMessages((prev) => [...prev, {
          id: `${ctlTurnId}-u`,
          role: 'user',
          content: text,
          timestamp: Date.now(),
        }]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach',
          role: 'user',
          text,
          fen: opts?.fenOverride ?? gameRef.current.fen,
          trigger: null,
        });
        // Tear the walkthrough down and clear the board / overlays so the
        // next ask starts from a clean slate.
        voiceService.stop();
        walkthrough.stop();
        handleResetBoard();
        setArrows([]);
        setLinePicker(null);
        setCoachChoices(null);
        const ack = control === 'new'
          ? `Done with ${priorOpening ?? 'that line'}. What would you like to learn next? Name an opening and we'll dive in.`
          : `Ended the ${priorOpening ?? 'walkthrough'}. Ask me anything, or name an opening to start a new lesson.`;
        setMessages((prev) => [...prev, {
          id: `${ctlTurnId}-c`,
          role: 'assistant',
          content: ack,
          timestamp: Date.now(),
        }]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach',
          role: 'coach',
          text: ack,
          fen: gameRef.current.fen,
          trigger: null,
        });
        void voiceService.speakForced(ack).catch(() => undefined);
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'CoachTeachPage.handleSubmit.walkthroughControl',
          summary: `walkthrough control "${control}" — tore down ${priorOpening ?? '(none)'} via "${trimmedText.slice(0, 40)}"`,
        });
        return;
      }
      if (control === 'resume' && walkthrough.phase === 'paused') {
        const ctlTurnId = freshTurnId('walkthrough-control');
        setMessages((prev) => [...prev, {
          id: `${ctlTurnId}-u`,
          role: 'user',
          content: text,
          timestamp: Date.now(),
        }]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach',
          role: 'user',
          text,
          fen: opts?.fenOverride ?? gameRef.current.fen,
          trigger: null,
        });
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'CoachTeachPage.handleSubmit.walkthroughControl',
          summary: `walkthrough control "resume" — continued ${walkthrough.tree?.openingName ?? '(none)'}`,
        });
        walkthrough.resume();
        return;
      }
    }

    // ─── Control phrase with NOTHING running (deterministic — G7 out-of-order) ───
    // "stop" / "resume" / "start" with no walkthrough active used to fall all
    // the way through to the unmapped-turn grounded default, which answered
    // with a best-move readout — a nonsense reply to a control phrase (found
    // driving the surface 2026-07-28: "stop" → "The best move is e4…").
    // Acknowledge honestly instead. Pure regex; the LLM is never in this
    // loop (G0).
    if (
      !opts?.kickoff &&
      opts?.coachReplyPlayed === undefined &&
      !walkthrough.isActive
    ) {
      const idleControl = classifyWalkthroughControl(trimmedText);
      if (idleControl !== null) {
        const idleTurnId = freshTurnId('walkthrough-control-idle');
        const ack =
          idleControl === 'stop'
            ? "Nothing's running right now — the board is all yours. Name an opening to start a lesson."
            : "There's no lesson running right now. Name an opening and we'll dive in.";
        setMessages((prev) => [
          ...prev,
          { id: `${idleTurnId}-u`, role: 'user', content: text, timestamp: Date.now() },
          { id: `${idleTurnId}-c`, role: 'assistant', content: ack, timestamp: Date.now() },
        ]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach', role: 'user', text, fen: opts?.fenOverride ?? gameRef.current.fen, trigger: null,
        });
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach', role: 'coach', text: ack, fen: gameRef.current.fen, trigger: null,
        });
        void voiceService.speakForced(ack).catch(() => undefined);
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'CoachTeachPage.handleSubmit.walkthroughControlIdle',
          summary: `idle control "${idleControl}" acked deterministically via "${trimmedText.slice(0, 40)}"`,
        });
        return;
      }
    }

    // ─── Typed MOVE REPORT (deterministic — the step-by-step branch) ───
    // "I played e4." / "I played e4. Your move." typed with no walkthrough
    // active used to fall to the unmapped-turn default: the student's move
    // never touched the board and the reply was a canned best-move readout
    // naming the move they had JUST played (found driving the surface
    // 2026-07-28). A typed report IS a board move: parse the SAN, validate +
    // apply via chess.js on the student's own turn, then hand off to the SAME
    // engine-reply flow a board move takes (handleStudentMove) — so words and
    // board can never diverge (G0/G3).
    if (
      !opts?.kickoff &&
      opts?.coachReplyPlayed === undefined &&
      !walkthrough.isActive &&
      !activeDrillRef.current
    ) {
      const report = trimmedText.match(
        /^i\s+(?:just\s+)?played\s+([a-hNBRQKO][a-hxNBRQK1-8=+#O-]*)\s*[.!]?\s*(?:your\s+(?:move|turn)\s*[.!]?)?$/i,
      );
      if (report) {
        const sanRaw = report[1].replace(/[.,!?]+$/, '');
        const reportTurnId = freshTurnId('typed-move-report');
        const say = (reply: string): void => {
          setMessages((prev) => [
            ...prev,
            { id: `${reportTurnId}-u`, role: 'user', content: text, timestamp: Date.now() },
            { id: `${reportTurnId}-c`, role: 'assistant', content: reply, timestamp: Date.now() },
          ]);
          void voiceService.speakForced(reply).catch(() => undefined);
        };
        const liveFen = liveFenRef.current;
        const sideToMove = liveFen.split(' ')[1] === 'w' ? 'white' : 'black';
        if (sideToMove !== playerColor) {
          say("Hold on — it's my move in this position, not yours. Let me reply first.");
          return;
        }
        let applied: MoveResult | null = null;
        try {
          const probe = new Chess(liveFen);
          const strip = (s: string): string => s.replace(/[+#]/g, '');
          const match = probe
            .moves({ verbose: true })
            .find((mv) => mv.san === sanRaw || strip(mv.san) === strip(sanRaw));
          if (match) applied = gameRef.current.makeMove(match.from, match.to, match.promotion);
        } catch {
          applied = null;
        }
        if (!applied) {
          say(`${sanRaw} isn't a legal move in this position — take another look at the board and try again.`);
          return;
        }
        // Post the user's report to the transcript, then run the exact
        // board-move flow (slip faucet, engine reply, narration).
        setMessages((prev) => [
          ...prev,
          { id: `${reportTurnId}-u`, role: 'user', content: text, timestamp: Date.now() },
        ]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach', role: 'user', text, fen: liveFen, trigger: null,
        });
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'CoachTeachPage.handleSubmit.typedMoveReport',
          summary: `typed report "${sanRaw}" applied to board; routed to board-move flow`,
        });
        handleStudentMoveRef.current?.(applied);
        return;
      }
    }

    // ─── Dictated coach move (deterministic — BYPASS the brain) ───
    // David 2026-07-12: "Coach can't play d4 when I told it to. It needs to
    // play every move I tell it to." "Play d4" / "you play Nf3" / "castle
    // kingside" is a COMMAND: parsed against chess.js's own legal-move list
    // (never invented — G0/G3 by construction) and executed in code. Three
    // shapes: (a) it's the coach's turn → play it now; (b) game start on the
    // student's side-to-move (the Benko case: student flipped to Black, told
    // the coach to open d4) → the coach TAKES that side, the board flips, the
    // move plays; (c) mid-game on the student's turn → armed as the coach's
    // next reply (resolveCoachReplyMove consumes it first).
    if (
      !opts?.kickoff &&
      opts?.coachReplyPlayed === undefined &&
      !walkthrough.isActive
    ) {
      const cmd = parseCoachMoveCommand(trimmedText, liveFenRef.current);
      if (cmd) {
        const cmdTurnId = freshTurnId('coach-move-command');
        const appendTurn = (ack: string): void => {
          setMessages((prev) => [
            ...prev,
            { id: `${cmdTurnId}-u`, role: 'user', content: text, timestamp: Date.now() },
            { id: `${cmdTurnId}-c`, role: 'assistant', content: ack, timestamp: Date.now() },
          ]);
          const mem = useCoachMemoryStore.getState();
          mem.appendConversationMessage({ surface: 'chat-teach', role: 'user', text, fen: liveFenRef.current, trigger: null });
          mem.appendConversationMessage({ surface: 'chat-teach', role: 'coach', text: ack, fen: liveFenRef.current, trigger: null });
          voiceService.stop();
          void voiceService.speakForced(ack).catch(() => undefined);
        };
        const fenSide: 'white' | 'black' = liveFenRef.current.split(' ')[1] === 'w' ? 'white' : 'black';
        const atStart = gameRef.current.history.length === 0;
        if (cmd.playableNow && fenSide !== playerColor) {
          // (a) The coach's turn — play the dictated move immediately.
          if (playDictatedMove(cmd.san)) {
            captureEvent('coach_move_command', { surface: 'coach-teach', mode: 'played-now', san: cmd.san });
            appendTurn(`${sanToSpeech(cmd.san)} — done. Your move.`);
            return;
          }
        } else if (cmd.playableNow && fenSide === playerColor && atStart) {
          // (b) Game start, move belongs to the student's current side — the
          // student is handing that side to the coach ("you play d4" → the
          // coach takes White, the student plays Black). Flip, then play.
          const newStudentColor: 'white' | 'black' = fenSide === 'white' ? 'black' : 'white';
          if (playDictatedMove(cmd.san)) {
            setPlayerColor(newStudentColor);
            gameRef.current.setOrientation(newStudentColor);
            captureEvent('coach_move_command', { surface: 'coach-teach', mode: 'side-swap-open', san: cmd.san });
            appendTurn(`I'll take ${fenSide}. ${sanToSpeech(cmd.san)} — your move.`);
            return;
          }
        } else {
          // (c) The student's turn mid-game (or a coach-side move parsed on
          // the flipped board) — arm it as the coach's next reply.
          pendingCoachMoveRef.current = cmd.san;
          captureEvent('coach_move_command', { surface: 'coach-teach', mode: 'armed-pending', san: cmd.san });
          appendTurn(`Got it — after your move, I'll play ${sanToSpeech(cmd.san)} if it's still legal.`);
          return;
        }
        // Legal-parse succeeded but the board refused (shouldn't happen —
        // both read the same FEN). Fall through to normal routing.
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'CoachTeachPage.handleSubmit.coachMoveCommand',
          summary: `dictated move ${cmd.san} parsed but failed to play — fell through to normal routing`,
        });
      }
    }

    // If a walkthrough is mid-narration when the student types a
    // question, pause it so voice doesn't talk over the coach's
    // reply. The student can hit Resume on the walkthrough panel
    // when they're ready to continue. Idempotent — safe even when
    // already paused (cleanupNarration is a no-op then).
    if (walkthrough.isActive && walkthrough.phase !== 'paused') {
      walkthrough.pause();
    }

    // ─── Deterministic walkthrough routing (BYPASS THE BRAIN) ───
    // Production audit (build 2ab2726) caught the LLM hallucinating
    // that it had called start_walkthrough_for_opening (its [VOICE:]
    // marker literally said "the walkthrough is queued but keeps
    // hitting a dead loop") while the actual tool dispatch chained
    // 3× set_board_position calls instead — the in-place walkthrough
    // never fired. Six prior audits showed the same brain ignoring
    // the tool's prompt-side description. We can't trust the model
    // for this routing; pattern-match at the surface and call
    // walkthrough.start() directly when the student types an obvious
    // "teach me / walk me through / show me [opening]" ask. The
    // brain only sees asks that DON'T match.
    //
    // Live audit (build 7eca7c3) caught the user message being
    // appended to chat-teach memory TWICE on every non-opening
    // input: once at line ~852 inside the surface-routing branch
    // (`if (requestedName)`), and again at line ~1419 in the main
    // brain path. The flag short-circuits the second append when the
    // first one fired. It MUST be declared outside the
    // `if (!opts?.kickoff)` block — the brain-path reference at
    // line ~1419 is reachable even when the kickoff branch is taken
    // (kickoff sets the flag false → falls through to the brain
    // path), and a chat ask like "What general opening principles
    // should I know?" also falls through. Production audit (build
    // 7edb4bb): the brain path threw `userMessageAppended is not
    // defined` because the let was scoped inside the kickoff block.
    let userMessageAppended = false;
    if (!opts?.kickoff) {
      // /clearcache — emergency lever for the user when iOS Safari's
      // Reset Website Data hasn't been cooperating. Wipes Dexie's
      // cachedOpenings table (all LLM-generated lesson trees), then
      // hard-refreshes (clears Cache Storage + unregisters service
      // workers + reloads). Used to force regeneration with the
      // current build's prompts after an architectural change.
      const cmd = text.trim().toLowerCase();
      if (cmd === '/clearcache' || cmd === 'clear cache' || cmd === 'clear cached openings') {
        try {
          const { db } = await import('../../db/schema');
          await db.cachedOpenings.clear();
          setMessages((prev) => [...prev, {
            id: uid('clearcache'),
            role: 'assistant',
            content: 'Cleared cached openings. Reloading the app to refresh service worker + cache storage…',
            timestamp: Date.now(),
          }]);
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'CoachTeachPage.handleSubmit.clearcache',
            summary: 'user cleared cached openings + triggered hard refresh',
          });
          // Hard refresh (clears Cache Storage + unregisters SW + reloads).
          const { hardRefresh } = await import('../../utils/hardRefresh');
          await hardRefresh();
        } catch (err) {
          setMessages((prev) => [...prev, {
            id: uid('clearcache-err'),
            role: 'assistant',
            content: `Cache clear failed: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now(),
          }]);
        }
        return;
      }

      // ─── Settings-as-actions (David 2026-07-10 settings audit). "turn off
      // hints" / "set narration to silent|brief|full" / "switch to dark theme"
      // fell through to a greeting on Learn — the coach must change SAFE prefs
      // from EVERY surface, like Play does via dispatchCoachTurn. applyCoachSetting
      // resolves the command, persists it (Dexie + live store), and returns the
      // confirmation; unrelated input returns null and falls through. ───
      {
        // Multilingual settings on Learn (David 2026-07-10): applyCoachSetting is
        // an English matcher, so translate a non-English command first.
        const settingLang = detectLanguage(text);
        const settingText = settingLang.nonEnglish ? await translateToEnglish(text) : text;
        const settingResult = await applyCoachSetting(settingText);
        if (settingResult) {
          setMessages((prev) => [...prev, {
            id: uid('setting'),
            role: 'assistant',
            content: settingResult.confirmation,
            timestamp: Date.now(),
          }]);
          void voiceService.speak(settingResult.confirmation);
          void logAppAudit({
            kind: 'coach-setting-changed',
            category: 'subsystem',
            source: 'CoachTeachPage.handleSubmit.setting',
            summary: `key=${settingResult.key} — ${settingResult.confirmation}`,
          });
          return;
        }
      }

      // ─── Player-game request (BYPASS opening-name resolution) ───
      // "show me a game that magnus played the catalan" / "how does
      // carlsen play the catalan" must surface the PLAYER'S REAL game —
      // NOT get fuzzy-matched as an opening NAME and bounced back with a
      // "Did you mean Catalan Opening?" picker (David 2026-06-11: the ask
      // never reached the lookup, even though we ship 5 Carlsen Catalan
      // wins on disk). This is the inverted/no-tools pattern: code parses
      // the ask and calls `lookup_player_games` as a PLAIN FUNCTION, then
      // walks the game in-page. The LLM is never in this loop — no tool-use
      // round-trip, no toolbelt tokens, nothing to "decide" (G0). Runs
      // BEFORE the fuzzy matcher so the hijack can't happen.
      {
        const pgReq = parsePlayerGameRequest(text);
        if (pgReq) {
          const fuzzy = fuzzyMatchOpening(pgReq.openingQuery);
          const openingName =
            fuzzy.candidates[0]?.canonicalName ?? titleCase(pgReq.openingQuery);
          const openingIsReal = fuzzy.candidates.length > 0;

          // FAST PATH — DETERMINISTIC on-disk lookup. The tool's execute()
          // is just an async function over bundled data (+ model-game
          // fallback). No LLM, no tool-use round-trip, no tokens.
          let diskGames: FoundPlayerGame[] = [];
          try {
            const res = await lookupPlayerGamesTool.execute({
              player: pgReq.player,
              openingName,
              limit: 6,
              fullPgn: true,
            });
            const payload = res.ok
              ? (res.result as { games?: FoundPlayerGame[] } | undefined)
              : undefined;
            if (payload && Array.isArray(payload.games)) diskGames = payload.games;
          } catch {
            diskGames = [];
          }

          // Only short-circuit when we can ACT: a game on disk, or the
          // opening is a real opening (so online lookup / an honest "no
          // game" is correct). Otherwise fall through to normal routing —
          // a rare misparse must not get eaten here.
          if (diskGames.length > 0 || openingIsReal) {
            const pgTurnId = freshTurnId('player-game');
            setMessages((prev) => [...prev, {
              id: `${pgTurnId}-u`,
              role: 'user',
              content: text,
              timestamp: Date.now(),
            }]);
            useCoachMemoryStore.getState().appendConversationMessage({
              surface: 'chat-teach',
              role: 'user',
              text,
              fen: opts?.fenOverride ?? gameRef.current.fen,
              trigger: null,
            });

            // Normalize on-disk + online games into one mountable shape so
            // both sources walk the board identically.
            interface MountableGame {
              player: string;
              studentSide: 'white' | 'black';
              opponent: string;
              opponentRating: number | null;
              result: string;
              date: string | null;
              pgn: string;
            }
            // The on-disk lookup returns the REPERTOIRE title as `player`
            // for pro-rep games (e.g. "The Universal Grandmaster
            // Repertoire") — that reads wrong as a person ("Here's The
            // Universal Grandmaster Repertoire in the Catalan"). Prefer the
            // person's name the student typed when the tool name looks like
            // a repertoire title; keep it when it's a real name (the
            // model-game fallback returns "Magnus Carlsen").
            const displayPlayer = (toolName: string): string =>
              /repertoire|^the\s/i.test(toolName) ? titleCase(pgReq.player) : toolName;
            let mountable: MountableGame[] = diskGames.map((g) => ({
              player: displayPlayer(g.player),
              studentSide: g.studentSide,
              opponent: g.opponent,
              opponentRating: g.opponentRating,
              result: g.result,
              date: g.date,
              pgn: g.pgn,
            }));
            let source: 'disk' | 'chesscom' = 'disk';

            // ONLINE "deeper" layer — nothing on disk, so pull from the
            // player's LIVE chess.com history (David 2026-06-11). Wins the
            // player wielded in this opening; bounded + degrades to [].
            if (mountable.length === 0) {
              const searchingId = `${pgTurnId}-searching`;
              setMessages((prev) => [...prev, {
                id: searchingId,
                role: 'assistant',
                content: `Nothing on disk — checking ${titleCase(pgReq.player)}'s chess.com games…`,
                timestamp: Date.now(),
              }]);
              try {
                const online = await fetchChesscomPlayerGames({
                  player: pgReq.player,
                  opening: pgReq.openingQuery,
                  limit: 3,
                });
                mountable = online.map((g) => ({
                  player: titleCase(pgReq.player),
                  studentSide: g.studentSide,
                  opponent: g.opponent,
                  opponentRating: g.opponentRating,
                  result: g.result,
                  date: g.date,
                  pgn: g.pgn,
                }));
                if (mountable.length > 0) source = 'chesscom';
              } catch {
                mountable = [];
              }
            }

            if (mountable.length > 0) {
              const top = mountable[0];
              const sideWord = top.studentSide === 'white' ? 'with White' : 'with Black';
              const oppRating = top.opponentRating ? ` (${top.opponentRating})` : '';
              const when = top.date ? ` in ${top.date}` : '';
              const srcNote = source === 'chesscom' ? ' — pulled live from his chess.com games' : '';
              const more =
                mountable.length > 1
                  ? ` I found ${mountable.length} — ask again for another.`
                  : '';
              const prose =
                `Here's ${top.player} ${sideWord} in the ${openingName} — ` +
                `${gameResultWord(top.result, top.studentSide)} over ${top.opponent}${oppRating}${when}${srcNote}. ` +
                `Walking it on the board now — tap Play or step through with the arrows.${more}`;

              // Build a silent walkthrough of the REAL game and mount it.
              const session = buildSession({
                pgn: top.pgn,
                title: `${top.player} vs ${top.opponent}`,
                subtitle: `${openingName} · ${top.result}${when}`,
                orientation: top.studentSide,
                kind: 'opening',
                source: `player-game-${source}`,
              });
              setModelGameSession(session);

              setMessages((prev) => [...prev, {
                id: `${pgTurnId}-c`,
                role: 'assistant',
                content: prose,
                timestamp: Date.now(),
              }]);
              useCoachMemoryStore.getState().appendConversationMessage({
                surface: 'chat-teach',
                role: 'coach',
                text: prose,
                fen: opts?.fenOverride ?? gameRef.current.fen,
                trigger: null,
              });
              void logAppAudit({
                kind: 'coach-surface-migrated',
                category: 'subsystem',
                source: 'CoachTeachPage.handleSubmit.playerGame',
                summary:
                  `player-game "${text.slice(0, 50)}" → ${top.player} / ${openingName} ` +
                  `(${source}, ${mountable.length} found) — mounted ${session.steps.length}-ply game`,
              });
            } else {
              const prose =
                `I couldn't find one of ${titleCase(pgReq.player)}'s ${openingName} games on disk or in their chess.com history. ` +
                `Want me to walk the ${openingName} itself? Just say "teach me the ${openingName}".`;
              setMessages((prev) => [...prev, {
                id: `${pgTurnId}-c`,
                role: 'assistant',
                content: prose,
                timestamp: Date.now(),
              }]);
              useCoachMemoryStore.getState().appendConversationMessage({
                surface: 'chat-teach',
                role: 'coach',
                text: prose,
                fen: opts?.fenOverride ?? gameRef.current.fen,
                trigger: null,
              });
              void logAppAudit({
                kind: 'coach-surface-migrated',
                category: 'subsystem',
                source: 'CoachTeachPage.handleSubmit.playerGame',
                summary: `player-game "${text.slice(0, 50)}" → no game for ${pgReq.player} in ${openingName} (disk+online)`,
              });
            }
            return;
          }
        }
      }

      // ─── Training-aid drills (BYPASS opening-name resolution) ──────
      // "drill calculation" / "give me a fork puzzle" / "practice mating
      // patterns" / "endgame drill" / "work on my weaknesses" must route
      // to the REAL training surface — NOT get eaten by the STAGE_PATTERNS
      // below, which strip the drill verb and try to resolve the
      // remainder ("calculation" / "tactics") as an OPENING name (it
      // isn't one → fuzzy-match garbage or a brain hallucination). G0:
      // the LLM invents no drills. Shared matcher (trainingAidRouter) so
      // the Learn surface behaves like the play/chat surfaces. Opening
      // drills ("drill the Vienna") return null here and fall through to
      // the opening stage router below, unchanged.
      {
        const aid = matchTrainingAidRoute(text);
        if (aid) {
          const aidTurnId = freshTurnId('training-aid');
          // Always echo the user's request.
          setMessages((prev) => [...prev, {
            id: `${aidTurnId}-u`, role: 'user', content: text, timestamp: Date.now(),
          }]);
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-teach', role: 'user', text,
            fen: opts?.fenOverride ?? gameRef.current.fen, trigger: null,
          });
          // Drillable aid → set a REAL puzzle up ON THE BOARD, in-place
          // (David 2026-07-03: coach sets them up on the board under
          // Learn, never the tactics tab, never an LLM-invented drill).
          if (isDrillableAid(aid.aid)) {
            // Prefer the user's OWN mistakes — most common weakness first,
            // adaptive until they test out, then the next (David 2026-07-03).
            if (await startMistakeDrills()) {
              return;
            }
            // No mistakes on file yet → a single DB-sourced drill of the
            // requested type so a new user still gets a real drill.
            const rating =
              activeProfile?.puzzleRating ?? activeProfile?.currentRating ?? 1200;
            const drill = pickCoachDrill(aid.aid, { rating });
            if (drill) {
              startCoachDrill(drill);
              return;
            }
            // No puzzle matched (rare) — fall through to the brain rather
            // than a dead navigation.
          } else {
            // Lesson-shaped aid (eval-lab / principles / drawing /
            // weaknesses / mistakes) → its real surface, NOT the tactics
            // tab. These aren't a single-position board drill.
            setMessages((prev) => [...prev, {
              id: `${aidTurnId}-c`, role: 'assistant', content: aid.ack, timestamp: Date.now(),
            }]);
            useCoachMemoryStore.getState().appendConversationMessage({
              surface: 'chat-teach', role: 'coach', text: aid.ack,
              fen: opts?.fenOverride ?? gameRef.current.fen, trigger: null,
            });
            void logAppAudit({
              kind: 'coach-surface-migrated',
              category: 'subsystem',
              source: 'CoachTeachPage.handleSubmit.trainingAid',
              summary: `lesson-aid intent "${text.slice(0, 50)}" → ${aid.aid} (${aid.path})`,
            });
            void navigate(aid.path);
            return;
          }
        }
      }

      // ─── Middlegame-plan intent (BYPASS opening-name resolution) ───
      // "middle game plans in the Pirc" / "I want to learn middle game
      // plans" / "teach me the middle game plans" must resolve to the
      // opening's AUTHORED middlegame plans — NOT get fuzzy-matched as
      // an opening NAME. Production audit (build 6384475, 2026-05-29)
      // caught all three of those asks falling through to the brain,
      // where the lone token "Pirc" fuzzy-matched Evans Gambit's
      // "Pierce Defense" (0.56) and surfaced it as a "did you mean…",
      // while the Pirc's 7 real plans (mp-pircdefence-*) sat
      // unreachable. parseCoachIntent already classifies this as
      // continue-middlegame and pulls an optional subject; we resolve
      // the subject (explicit, else the in-context walkthrough opening)
      // and hand off to /coach/session/middlegame, which owns the plan
      // runner (lead-the-eye arrows + voice-gated advance). This runs
      // BEFORE the fuzzy matcher so the garbage match can't happen.
      {
        const intent = parseCoachIntent(text);
        if (intent.kind === 'continue-middlegame') {
          const contextOpening = walkthrough.tree?.openingName ?? null;
          // The opening the student NAMED (explicit subject) or is
          // sitting in (walkthrough context). Used for clean messaging.
          const namedSubject = intent.subject ?? contextOpening ?? null;
          // What we actually resolve plans against: the named opening if
          // we have one, else the raw ask — findPlansForOpening matches
          // on DISTINCTIVE tokens only, so it pulls "caro kann" out of a
          // bare "midgame plans caro kann" and returns nothing for an
          // opening we don't cover (no fuzzy-matched wrong opening).
          const probe = namedSubject ?? trimmedText;
          const subject = namedSubject;
          const mgTurnId = freshTurnId('middlegame-intent');
          setMessages((prev) => [...prev, {
            id: `${mgTurnId}-u`,
            role: 'user',
            content: text,
            timestamp: Date.now(),
          }]);
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-teach',
            role: 'user',
            text,
            fen: opts?.fenOverride ?? gameRef.current.fen,
            trigger: null,
          });

          const plans = findPlansForOpening(probe);
          if (plans.length > 0) {
            const side: 'white' | 'black' =
              walkthrough.tree?.studentSide ?? inferStudentSide(subject ?? probe);
            void logAppAudit({
              kind: 'coach-surface-migrated',
              category: 'subsystem',
              source: 'CoachTeachPage.handleSubmit.surfaceRouting',
              summary:
                `middlegame-plan intent "${text.slice(0, 50)}" → ${plans.length} in-page plan(s) for ${plans[0].openingId} ` +
                (plans.length === 1 ? `(auto-start ${plans[0].id})` : '(picker)'),
            });
            if (plans.length === 1) {
              // Single authored plan — play it straight away in-page.
              startMiddlegamePlan(plans[0], side);
            } else {
              // Multiple plans for this opening — let the student pick
              // which variation's plan to walk (the Pirc has 8). A short
              // coach line + picker chips rendered below the board.
              const label = subject ?? plans[0].openingId.replace(/-/g, ' ');
              const prose = `The ${label} has ${plans.length} middlegame plans. Pick one to walk through:`;
              setMessages((prev) => [...prev, {
                id: `${mgTurnId}-c`,
                role: 'assistant',
                content: prose,
                timestamp: Date.now(),
              }]);
              useCoachMemoryStore.getState().appendConversationMessage({
                surface: 'chat-teach',
                role: 'coach',
                text: prose,
                fen: opts?.fenOverride ?? gameRef.current.fen,
                trigger: null,
              });
              setMiddlegamePlanChoices({ plans, side });
            }
            return;
          }

          // No subject, or no authored plan for it — be honest. Do NOT
          // fall through to the opening-name fuzzy matcher (which is
          // exactly what surfaced the "Pierce Defense" garbage). Empty
          // > generic > invented.
          const prose = subject
            ? `I don't have hand-authored middlegame plans for "${subject}" yet. I do for openings like the Pirc, Italian, Caro-Kann and Sicilian — name one (e.g. "middle game plans in the Pirc") and I'll walk you through them.`
            : `Which opening's middlegame plans? Name it — e.g. "middle game plans in the Pirc" — and I'll walk you through them.`;
          setMessages((prev) => [...prev, {
            id: `${mgTurnId}-c`,
            role: 'assistant',
            content: prose,
            timestamp: Date.now(),
          }]);
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-teach',
            role: 'coach',
            text: prose,
            fen: opts?.fenOverride ?? gameRef.current.fen,
            trigger: null,
          });
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'CoachTeachPage.handleSubmit.surfaceRouting',
            summary: `middlegame-plan intent "${text.slice(0, 50)}" — no authored plan for subject="${subject ?? '(none)'}", asked user to name an opening`,
          });
          return;
        }
      }

      // Two-pass routing.
      // Pass 1 (verb-prefix): "teach me X", "walk me through X", etc.
      // Pass 2 (bare-name): if input is short and resolveWalkthroughTree
      //   resolves it directly. Catches "The Vienna" / "Vienna please"
      //   / "Italian" — phrases the user typed in build 3e2263c that
      //   the verb-prefix pattern missed.
      const TEACH_PATTERN =
        /\b(teach\s+me|walk\s+(?:me\s+)?through|show\s+me|let'?s\s+do|let'?s\s+go\s+over|let'?s\s+try|tell\s+me\s+about|review)\b\s+(?:the\s+)?(.+?)(?:\s+(?:opening|defense|defence|game|gambit|attack|variation|line|system))?[.?!]*\s*$/i;
      // Stage-keyword detection: user inputs like "drill Vienna" /
      // "Vienna punish" / "quiz me on the Sicilian" should skip the
      // walkthrough animation and land directly at that stage. User
      // request: "Is there a way for users to skip the opening
      // walkthrough and go straight to punish lines after their
      // first session?" Each pattern strips the keyword from the
      // input; the cleaned text is then resolved as the opening name.
      const STAGE_PATTERNS: Array<{
        regex: RegExp;
        stage: 'concepts' | 'findMove' | 'drill' | 'punish' | 'play-real';
      }> = [
        { regex: /\b(?:drill|practice)\s+(?:the\s+)?/i, stage: 'drill' },
        { regex: /\b(?:the\s+)?(?:.+?)\s+drill(?:s)?\b/i, stage: 'drill' },
        { regex: /\bpunish(?:ment)?(?:\s+lines?)?\s+(?:in\s+|for\s+|from\s+)?(?:the\s+)?/i, stage: 'punish' },
        { regex: /\b(?:the\s+)?(?:.+?)\s+punish(?:ment)?(?:\s+lines?)?\b/i, stage: 'punish' },
        { regex: /\b(?:quiz\s+me\s+on|quiz)\s+(?:the\s+)?/i, stage: 'concepts' },
        { regex: /\b(?:concept(?:\s+check)?|concepts)\s+(?:for\s+|of\s+)?(?:the\s+)?/i, stage: 'concepts' },
        { regex: /\b(?:find(?:\s+the)?\s+moves?|recognition)\s+(?:in\s+|for\s+)?(?:the\s+)?/i, stage: 'findMove' },
        { regex: /\bplay\s+(?:it\s+)?(?:for\s+)?real\s+(?:the\s+)?/i, stage: 'play-real' },
      ];
      const trimmed = text.trim();
      // `userMessageAppended` is hoisted to the outer scope — see the
      // long comment block above `if (!opts?.kickoff)`. Don't
      // re-declare it here; doing so would shadow the outer let and
      // re-introduce the "not defined" pageerror on the brain path.
      let stageHint:
        | 'concepts'
        | 'findMove'
        | 'drill'
        | 'punish'
        | 'play-real'
        | null = null;
      let stageStrippedInput = trimmed;
      for (const sp of STAGE_PATTERNS) {
        const sm = stageStrippedInput.match(sp.regex);
        if (sm) {
          stageHint = sp.stage;
          stageStrippedInput = stageStrippedInput.replace(sp.regex, ' ').replace(/\s+/g, ' ').trim();
          break;
        }
      }
      // FACE-mode routing: when the line picker submits "Face: X" we
      // strip the prefix, set the face flag, and proceed through the
      // normal name-resolution path. Generation later passes the flag
      // to buildSystemPrompt, which switches to a "teach the counter
      // against X" prompt.
      let faceMode = false;
      let workingInput = trimmed;
      if (/^face:\s*/i.test(workingInput)) {
        faceMode = true;
        workingInput = workingInput.replace(/^face:\s*/i, '').trim();
      }

      // A MOVE REPORT ("I played e4." — with or without "Your move.") or an
      // engine-driven step turn is NEVER an opening-name query. Skip the
      // opening-name router entirely so it can't fuzzy-match "e4" as an
      // opening and surface a disambiguation picker INSTEAD of narrating the
      // move (David 2026-06-04 root cause: the engine-driven message dropped
      // "Your move.", so "I played e4." fell into the fuzzy router, popped a
      // picker, the narration turn never ran, and the coach went silent).
      const isMoveReport =
        opts?.coachReplyPlayed !== undefined ||
        /^\s*i\s+(?:just\s+)?played\b/i.test(workingInput);

      // DETERMINISTIC requested-opening capture (David 2026-06-04 audit: a deep
      // coach audit caught the coach NOT playing the requested opening — typing
      // "let's play the Italian Game" then 1.e4 got ...e6 (French), because the
      // intended opening was only ever set by the LLM's set_intended_opening
      // tool — non-deterministic and racing the student's next move. The
      // `tryCaptureOpeningIntent` helper existed but was wired into NO surface
      // (only tests). Capture it here, regex-first, BEFORE the brain round-trip
      // and before the next resolveCoachReplyMove, so the spine plays exactly
      // the opening the user asked for. The student plays White in Learn; the
      // coach plays Black. Safe on any chat text — it only writes when the input
      // actually names a resolvable opening (a move report / Q&A never matches).
      if (!isMoveReport && !opts?.kickoff) {
        if (!tryCaptureForgetIntent(workingInput, 'coach-teach')) {
          tryCaptureOpeningIntent(workingInput, 'coach-teach', 'white');
        }
      }

      const m = isMoveReport
        ? null
        : (stageHint ? stageStrippedInput : workingInput).match(TEACH_PATTERN);
      let requestedName: string | null = null;
      if (isMoveReport) {
        requestedName = null;
      } else if (m && m[2]) {
        requestedName = m[2].trim();
      } else if (stageHint && stageStrippedInput.length > 0 && stageStrippedInput.length <= 60) {
        // Stage keyword stripped → remaining text is the opening name.
        requestedName = stageStrippedInput;
      } else if (
        workingInput.length <= 60 &&
        !workingInput.includes('?') &&
        // A walkthrough control word ("start", "go", "stop", "new
        // lesson", …) is NEVER an opening name — keep it out of the
        // fuzzy matcher so it can't surface a bogus "did you mean
        // <opening>?" picker. With an active walkthrough these are
        // already handled by the control-intent block up top; this
        // guard covers the idle case (David 2026-06-12).
        !isWalkthroughControlPhrase(workingInput)
      ) {
        // Bare-name routing: "The Vienna", "Pirc defense", "Italian".
        // Production audit (build 7e4f52b) caught "Pirc defense"
        // falling through to the brain instead of the LLM generator
        // because Pirc isn't in the static registry — we previously
        // only routed when registry hit. Now we route through the
        // full three-tier pipeline (registry → cache → LLM gen) for
        // any short bare-name input.
        // Length cap was 40 — production audit (build 0c6c02c) caught
        // deep-dive queries like "Pirc Defense: Baz Counter-gambit"
        // (33 chars OK) but variations like "King's Indian Defense:
        // Mar del Plata" (39) sat right at the limit and longer named
        // sub-variations broke. 60 catches the long ones without
        // letting full sentences through (sentences usually have a
        // verb, > 60 chars, or end with ?/.).
        requestedName = workingInput;
      }
      // MATCHUP: "teach X vs Y" — CONSTRUCT the two openings colliding on one
      // board from each opening's own DB setup + Stockfish (David 2026-07-18:
      // "show or teach any two different openings against each other … use the
      // DBs and stockfish", and "when they can't meet the coach should say
      // that but then use stockfish to still make the request happen"). White
      // plays the White opening's setup, Black the Black opening's — so "KIA
      // vs Sicilian Dragon" shows the actual Dragon (…g6 …Bg7), not a French
      // move order. Same-colour pairs can't share a board → honest chips.
      if (requestedName && MATCHUP_HINT_RE.test(requestedName)) {
        const plan = planOpeningMatchup(requestedName);
        if (plan) {
          const mTurnId = freshTurnId('matchup');
          setMessages((prev) => [...prev, {
            id: `${mTurnId}-u`, role: 'user', content: text, timestamp: Date.now(),
          }]);
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-teach', role: 'user', text,
            fen: opts?.fenOverride ?? gameRef.current.fen, trigger: null,
          });
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'CoachTeachPage.handleSubmit.matchup',
            summary: `matchup "${plan.query}" → ${plan.sameColor ? 'same-colour' : (plan.meets ? 'meets' : 'constructed')} (${plan.whiteName} vs ${plan.blackName})`,
          });
          if (plan.sameColor) {
            // Two same-colour openings physically can't face each other.
            const colorWord = inferMatchupColor(plan.whiteName) === 'white' ? 'White' : 'Black';
            const xProse =
              `${plan.whiteName} and ${plan.blackName} are both ${colorWord} openings, ` +
              `so they can't face each other on one board. Want to learn either one on its own?`;
            setMessages((prev) => [...prev, {
              id: `${mTurnId}-c`, role: 'assistant', content: xProse,
              timestamp: Date.now(), choices: [plan.whiteName, plan.blackName],
            }]);
            useCoachMemoryStore.getState().appendConversationMessage({
              surface: 'chat-teach', role: 'coach', text: xProse,
              fen: opts?.fenOverride ?? gameRef.current.fen, trigger: null,
            });
            return;
          }
          // Construct + teach. The note (when they don't normally meet) IS the
          // intro; otherwise a plain "here's how they meet" line.
          const canonicalName = `${plan.whiteName} vs ${plan.blackName}`;
          const intro = plan.note
            ?? `Here's the ${plan.whiteName} against the ${plan.blackName}. ` +
               `White plays the ${plan.whiteName} setup, Black answers with the ${plan.blackName}. Watch how they meet.`;
          setMessages((prev) => [...prev, {
            id: `${mTurnId}-c`, role: 'assistant', content: intro, timestamp: Date.now(),
          }]);
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-teach', role: 'coach', text: intro,
            fen: opts?.fenOverride ?? gameRef.current.fen, trigger: null,
          });
          setGenerationStatus({ openingName: canonicalName, startedAt: Date.now() });
          void (async (): Promise<void> => {
            try {
              // Merge both DB setups + Stockfish bridge/extend toward a middlegame.
              const moves = await buildMatchupLine(plan, 20);
              if (moves.length < 4) {
                setGenerationStatus(null);
                setMessages((prev) => [...prev, {
                  id: `${mTurnId}-err`, role: 'assistant',
                  content: `I couldn't build that matchup this time. Try again in a moment.`,
                  timestamp: Date.now(),
                }]);
                return;
              }
              const result = await generateOpening(canonicalName, {
                mode: 'learn',
                entryOverride: { canonicalName, eco: plan.eco, moves },
              });
              setGenerationStatus(null);
              if (result.ok && result.tree) {
                await cacheOpening(canonicalName, result.tree);
                voiceService.stop();
                walkthrough.start(result.tree);
                return;
              }
              setMessages((prev) => [...prev, {
                id: `${mTurnId}-err`, role: 'assistant',
                content: `I couldn't build the ${canonicalName} walkthrough this time. Try again in a moment.`,
                timestamp: Date.now(),
              }]);
            } catch {
              setGenerationStatus(null);
              setMessages((prev) => [...prev, {
                id: `${mTurnId}-err`, role: 'assistant',
                content: `I couldn't build that matchup this time. Try again in a moment.`,
                timestamp: Date.now(),
              }]);
            }
          })();
          return;
        }
      }
      // Tier 0: fuzzy-match the user's request against the Lichess
      // DB BEFORE any routing tiers run. Three outcomes:
      //
      //   - autoAccept: top candidate is dominant (score ≥ 0.92, gap
      //     ≥ 0.15 to runner-up). Canonicalize requestedName to it
      //     and continue through the routing tiers.
      //   - candidates without autoAccept: emit a "did you mean..."
      //     coach message with [CHOICES: ...] picker chips so the
      //     student taps a canonical answer. Short-circuit — no
      //     further tier runs.
      //   - no candidates: leave requestedName as the user typed.
      //     Tier 2.5 pre-flight rejection will catch it and drop to
      //     brain handling.
      //
      // David's wide-berth rule (2026-05-19): when in doubt, ASK —
      // never silently pick. The matcher's auto-accept gate is the
      // tight cutoff that decides "ask" vs "go."
      // Pure DIAGNOSIS / PROGRESS ("am I improving?", "I keep hanging my
      // queen", "what's my worst opening") and CONCEPT ("what is a fork")
      // questions need NO opening — they are grounded Q&A. Skip the fuzzy
      // opening matcher for them, or it hijacks the ask into a bogus
      // "did you mean <opening>?" picker and the student never reaches the
      // grounded weakness/concept answer (David 2026-07-04 adversarial audit:
      // "am i improving" → "did you mean one of these?"). Falls through to the
      // Tier 2.5 pre-flight → brain, where isProgressQuestion/isConceptQuestion
      // route to the grounded voiceFacts path.
      if (requestedName && !isProgressQuestion(text) && !isImprovementTrendQuestion(text) && !isConceptQuestion(text) && !isOpeningProfileQuestion(text) && !isStatsQuestion(text) && !isStrengthsQuestion(text) && !isOpeningAccuracyQuestion(text) && !isOpeningTrapsQuestion(text) && !isReviewDueQuestion(text) && !isMistakesQuestion(text) && !isTacticsProfileQuestion(text) && !isPhaseQuestion(text) && !isRepertoireGapQuestion(text) && !isAccuracyQuestion(text) && !isConsistencyQuestion(text) && !isConvertingQuestion(text) && !isColorQuestion(text) && !isRecordsQuestion(text) && !isRecordVsQuestion(text) && !isMoveRatingQuestion(text) && !isTrainingRequest(text) && !isPuzzleStatsQuestion(text) && !isTransferGapQuestion(text) && !isSkillRadarQuestion(text)) {
        // EXACT curated-variation names bypass the fuzzy matcher. A
        // line-picker tile submits `${parent}: ${variation}` (e.g. "Italian
        // Game: Italian: Two Knights with d4") — an EXACT curated line the gen
        // path resolves via resolveCuratedVariation. The fuzzy matcher scores
        // that compound below autoAccept and wrongly bounced it to a "did you
        // mean…" picker (David 2026-07-25 audit papercut: tapping a picker chip
        // dropped to disambiguation). If the name IS a curated variation, it's
        // already canonical — skip fuzzy and let the routing tiers gen it.
        const curatedHit = resolveCuratedVariation(requestedName);
        const fuzzy = curatedHit
          ? { candidates: [], autoAccept: false, query: requestedName }
          : fuzzyMatchOpening(requestedName);
        if (fuzzy.autoAccept && fuzzy.candidates[0]) {
          const top = fuzzy.candidates[0];
          if (top.canonicalName !== requestedName) {
            void logAppAudit({
              kind: 'coach-surface-migrated',
              category: 'subsystem',
              source: 'CoachTeachPage.handleSubmit.surfaceRouting',
              summary: `canonicalized "${requestedName}" → "${top.canonicalName}" (fuzzy/${top.source}, score=${top.score.toFixed(2)})`,
            });
            requestedName = top.canonicalName;
          }
        } else if (fuzzy.candidates.length > 0) {
          // Ambiguous — surface the picker. Append the user's ask
          // first so the transcript shows what they typed.
          //
          // Audit-instrumentation phase-1: capture every candidate
          // score, not just the names. Lets us see whether the
          // runner-up gap was tight (close call — maybe retune
          // AUTO_ACCEPT_GAP) or wide (clear "did you mean…" case).
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'CoachTeachPage.fuzzyPickerScores',
            summary:
              `fuzzy candidates for "${fuzzy.query}": ` +
              fuzzy.candidates
                .map((c) => `${c.canonicalName} (${c.score.toFixed(2)})`)
                .join(' | '),
            details: JSON.stringify({
              query: fuzzy.query,
              candidates: fuzzy.candidates.map((c) => ({
                canonicalName: c.canonicalName,
                eco: c.eco,
                score: c.score,
                source: c.source,
              })),
              autoAcceptThreshold: 0.92,
              autoAcceptGapThreshold: 0.15,
              autoAccepted: fuzzy.autoAccept,
              topScore: fuzzy.candidates[0]?.score ?? null,
              runnerUpScore: fuzzy.candidates[1]?.score ?? null,
              gap: fuzzy.candidates.length >= 2
                ? (fuzzy.candidates[0].score - fuzzy.candidates[1].score)
                : null,
            }),
          });
          const ambiguousTurnId = freshTurnId('fuzzy-picker');
          setMessages((prev) => [...prev, {
            id: `${ambiguousTurnId}-u`,
            role: 'user',
            content: text,
            timestamp: Date.now(),
          }]);
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-teach',
            role: 'user',
            text,
            fen: opts?.fenOverride ?? gameRef.current.fen,
            trigger: null,
          });
          const topNames = fuzzy.candidates.map((c) => c.canonicalName);
          // Attach the picker chips to THIS message (message.choices), so
          // they render inline under the bubble and PERSIST in the
          // transcript. The old input-bar `coachChoices` was transient —
          // typing the next message cleared it (line ~1614), stranding the
          // "did you mean?" prompt with no chips (David 2026-07-18 report).
          const prose = topNames.length === 1
            ? `I don't have an exact match for "${fuzzy.query}". Did you mean ${topNames[0]}? Tap it to start.`
            : `I don't have an exact match for "${fuzzy.query}". Did you mean one of these? Tap one to start.`;
          setMessages((prev) => [...prev, {
            id: `${ambiguousTurnId}-c`,
            role: 'assistant',
            content: prose,
            timestamp: Date.now(),
            choices: topNames,
          }]);
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-teach',
            role: 'coach',
            text: prose,
            fen: opts?.fenOverride ?? gameRef.current.fen,
            trigger: null,
          });
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'CoachTeachPage.handleSubmit.surfaceRouting',
            summary: `fuzzy ambiguity for "${fuzzy.query}" — surfacing picker (${topNames.length} options): ${topNames.join(' | ')}`,
          });
          return;
        }
      }
      // Cache key includes face-mode + tour-mode prefixes so the
      // same opening doesn't collide between "learn Najdorf as
      // Black" / "face Najdorf as White" / "quick tour of Najdorf"
      // — they're entirely different lessons (different shapes,
      // different narration depths).
      const baseName =
        requestedName && faceMode ? `Face: ${requestedName}` : requestedName;
      const cacheKey =
        baseName && pace === 'tour' ? `Tour: ${baseName}` : baseName;
      if (requestedName) {
        // Three-tier resolution: static registry (Vienna lives here),
        // Dexie cache (previously LLM-generated), runtime LLM
        // generation (last resort). Each later tier is slower but
        // covers more openings.
        const staticTree = resolveWalkthroughTree(requestedName);
        const surfaceTurnId = freshTurnId('walkthrough-surface');
        // Always show the user's ask in the transcript.
        setMessages((prev) => [...prev, {
          id: `${surfaceTurnId}-u`,
          role: 'user',
          content: text,
          timestamp: Date.now(),
        }]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach',
          role: 'user',
          text,
          // Self-audit (2026-05-15): use the override FEN when the
          // caller provides one (board onMove callback). Without this
          // the first append stores the PRE-move position — and the
          // dedup flag below blocks the second append that would have
          // had the correct POST-move FEN. Audit log finding 33 (pre-
          // move state) vs finding 28 (post-move) confirmed the FEN
          // skew before this fix.
          fen: opts?.fenOverride ?? gameRef.current.fen,
          trigger: null,
        });
        userMessageAppended = true;

        // ── Tier 1: Static registry (instant). ─────────────────
        if (staticTree) {
          // Decide entry mode:
          //   1. stageHint present (e.g. "drill Vienna") → jump
          //      directly to that stage (or play-real navigates).
          //   2. Walkthrough already completed → show chooser
          //      (returning visitor: walk again vs pick a stage).
          //   3. Otherwise → play the walkthrough (first-time).
          if (stageHint === 'play-real') {
            walkthrough.stop();
            void navigate(`/coach/play?opening=${encodeURIComponent(staticTree.openingName)}`);
            return;
          }
          const completed = await getCompletedStages(staticTree.openingName);
          const walkthroughDone = completed.has('walkthrough');
          const ack = stageHint
            ? `Sure — jumping straight to ${stageHint === 'concepts' ? 'concept check' : stageHint === 'findMove' ? 'find the move' : stageHint} for the ${staticTree.openingName}.`
            : walkthroughDone
              ? `Welcome back to the ${staticTree.openingName}. Pick how you want to learn.`
              : `Sure — let's walk through the ${staticTree.openingName}.`;
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'CoachTeachPage.handleSubmit.surfaceRouting',
            summary: `surface-routed (static): "${text.slice(0, 60)}" → ${staticTree.openingName} ${stageHint ? `[stage=${stageHint}]` : walkthroughDone ? '[chooser]' : '[walkthrough]'}`,
          });
          setMessages((prev) => [...prev, {
            id: `${surfaceTurnId}-c`,
            role: 'assistant',
            content: ack,
            timestamp: Date.now(),
          }]);
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-teach',
            role: 'coach',
            text: ack,
            fen: gameRef.current.fen,
            trigger: null,
          });
          voiceService.stop();
          if (stageHint) {
            walkthrough.startAtStageMenu(staticTree, stageHint);
          } else if (walkthroughDone) {
            walkthrough.start(staticTree, { showChooser: true });
          } else {
            walkthrough.start(staticTree);
          }
          return;
        }

        // ── Tier 1.5: Line picker for BROAD openings ───────────
        // User feedback (build 6d73f88): "We need to get the coach
        // back to tier one after each training session." Translation:
        // typing a broad opening name like "Sicilian" should ALWAYS
        // surface the line picker — not silently load the cached
        // overview tree. The picker is the entry point; cache is
        // per-VARIATION, not per-family.
        //
        // Specific variations (Najdorf, Dragon, Two Knights, etc.)
        // return null from findLinePickerOptions and continue through
        // Tier 2 cache → Tier 3 gen as before. So a user who types
        // "Najdorf Sicilian" still hits cache instantly; only a
        // user typing the broad family name "Sicilian" gets the
        // picker every time.
        if (!stageHint && !faceMode) {
          const pickerData = findLinePickerOptions(requestedName);
          if (pickerData) {
            // Two messages:
            //  1. Short ack for UI + TTS — the user doesn't need to
            //     hear all 15 variation names read aloud.
            //  2. Hidden context message in conversationHistory only —
            //     so the brain can answer follow-ups like "which has
            //     the most traps?" with the picker visible. Production
            //     audit (build 998f5c4) caught the brain answering
            //     about Sicilian when asked which Italian variation
            //     had the most traps.
            const ack = `The ${pickerData.canonicalName} branches into many lines. Pick one to dive in deep, or just type the variation name.`;
            const variationList = pickerData.options
              .map((o) => o.label)
              .join(', ');
            const pickerContextNote = `[ui-state: line picker visible for "${pickerData.canonicalName}". Variations on screen: ${variationList}.]`;
            setMessages((prev) => [...prev, {
              id: `${surfaceTurnId}-c`,
              role: 'assistant',
              content: ack,
              timestamp: Date.now(),
            }]);
            useCoachMemoryStore.getState().appendConversationMessage({
              surface: 'chat-teach',
              role: 'coach',
              text: ack,
              fen: gameRef.current.fen,
              trigger: null,
            });
            // Hidden context entry: stays in conversationHistory for
            // the brain envelope but is never rendered or spoken.
            useCoachMemoryStore.getState().appendConversationMessage({
              surface: 'chat-teach',
              role: 'coach',
              text: pickerContextNote,
              fen: gameRef.current.fen,
              trigger: null,
            });
            voiceService.stop();
            void voiceService.speakForced(ack).catch(() => undefined);
            setLinePicker(pickerData);
            void logAppAudit({
              kind: 'coach-surface-migrated',
              category: 'subsystem',
              source: 'CoachTeachPage.handleSubmit.surfaceRouting',
              summary: `line picker shown for "${pickerData.canonicalName}" — ${pickerData.options.length} variations (pre-cache)`,
            });
            return;
          }
        }

        // ── Tier 2: Dexie cache (instant). ─────────────────────
        const cachedTree = await getCachedOpening(cacheKey ?? requestedName);
        if (cachedTree) {
          if (stageHint === 'play-real') {
            walkthrough.stop();
            void navigate(`/coach/play?opening=${encodeURIComponent(cachedTree.openingName)}`);
            return;
          }
          const completed = await getCompletedStages(cachedTree.openingName);
          const walkthroughDone = completed.has('walkthrough');
          const ack = stageHint
            ? `Jumping straight to ${stageHint === 'concepts' ? 'concept check' : stageHint === 'findMove' ? 'find the move' : stageHint} for the ${cachedTree.openingName}.`
            : walkthroughDone
              ? `Welcome back to the ${cachedTree.openingName}. Pick how you want to learn.`
              : `Welcome back to the ${cachedTree.openingName} — let's go.`;
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'CoachTeachPage.handleSubmit.surfaceRouting',
            summary: `surface-routed (cached): "${text.slice(0, 60)}" → ${cachedTree.openingName} ${stageHint ? `[stage=${stageHint}]` : walkthroughDone ? '[chooser]' : '[walkthrough]'}`,
          });
          setMessages((prev) => [...prev, {
            id: `${surfaceTurnId}-c`,
            role: 'assistant',
            content: ack,
            timestamp: Date.now(),
          }]);
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-teach',
            role: 'coach',
            text: ack,
            fen: gameRef.current.fen,
            trigger: null,
          });
          voiceService.stop();
          if (stageHint) {
            walkthrough.startAtStageMenu(cachedTree, stageHint);
          } else if (walkthroughDone) {
            walkthrough.start(cachedTree, { showChooser: true });
          } else {
            walkthrough.start(cachedTree);
          }
          // Re-fire background gen for any stages still missing
          // from the cache. Production audit (build c95ccc9) caught
          // the user returning to Pirc and finding no Punish tile —
          // that stage failed the first time (before per-entry
          // repairs shipped) and was never re-attempted. Now we try
          // again every visit; the merge step is idempotent (only
          // writes if there's data to write) and getMissingStages
          // makes this a no-op when everything's already cached.
          // Tour mode skips quiz / drill / punish stages entirely —
          // it's a quick playthrough, not a full lesson. The stages
          // become available again the moment the user re-loads in
          // full mode (different cache key).
          if (pace !== 'tour') {
            void generateMissingStagesInBackground(
              cachedTree.openingName,
              cachedTree,
              handleStageMerged,
            );
          }
          return;
        }

        // ── Tier 2.5: Pre-validate against the Lichess opening DB
        // before the slow LLM call. Production audit (build a802d1c)
        // caught chat fragments like "Ok" and "Let's best opening
        // for a complete beginner" being routed as opening names —
        // the bare-name length cap (60 chars) lets short fragments
        // through and we'd burn ~60 seconds generating a bogus
        // lesson. getOpeningMoves returns null when the name doesn't
        // resolve to ANY opening in the Lichess DB (~3000 named
        // entries with aliases / sub-variations). When it returns
        // null, refuse politely and route the input back to chat.
        const dbHit = getOpeningMoves(requestedName);
        // A curated-repertoire VARIATION name (e.g. a line-picker tile's
        // "Italian Game: Italian: Two Knights with d4") is NOT a Lichess-DB
        // entry, so getOpeningMoves returns null — but it IS a real, teachable
        // curated line the gen path resolves via resolveCuratedVariation. Treat
        // it as a valid opening so it reaches Tier 3 gen instead of the
        // "doesn't resolve → route to brain" rejection (David 2026-07-25 audit:
        // tapping a picker chip bounced to "did you mean…").
        const curatedPreflight = dbHit ? null : resolveCuratedVariation(requestedName);
        if (!dbHit && !curatedPreflight) {
          // RESCUE (David 2026-07-16): getOpeningMoves filters out
          // terminal-short lines (short namesakes like the Scandi Panov) and
          // returns null even for real openings the student explicitly named,
          // so typing "Scandi panov" fell to the brain's "can't verify from
          // grounded data" refusal instead of a lesson. Before giving up, try
          // the UNFILTERED openings search (the same matcher the openings page
          // uses; abbreviations expanded), and if it resolves, teach that exact
          // line straight from its DB PGN via the entryOverride path (option B).
          // Q&A intents were already excluded upstream (the isProgress/isConcept/
          // … guards at Tier 0), so this only rescues inputs already committed to
          // teaching. G3-safe: the moves are the DB record's, not the LLM's.
          // searchOpenings self-expands abbreviations on an empty raw match,
          // so a casual "Scandi panov" still resolves here.
          const rescued = await searchOpenings(requestedName);
          const rescueHit = rescued[0];
          const rescueMoves = rescueHit?.pgn?.trim().split(/\s+/).filter(Boolean) ?? [];
          if (rescueHit && rescueMoves.length > 0) {
            void logAppAudit({
              kind: 'coach-surface-migrated',
              category: 'subsystem',
              source: 'CoachTeachPage.handleSubmit.teachRescue',
              summary: `teach rescue: "${requestedName}" → "${rescueHit.name}" via unfiltered search (option B)`,
            });
            try {
              setGenerationStatus({ openingName: rescueHit.name, startedAt: Date.now() });
              const result = await generateOpening(rescueHit.name, {
                mode: 'learn',
                entryOverride: { canonicalName: rescueHit.name, eco: rescueHit.eco, moves: rescueMoves },
              });
              setGenerationStatus(null);
              if (result.ok && result.tree) {
                await cacheOpening(rescueHit.name, result.tree);
                voiceService.stop();
                walkthrough.start(result.tree);
                return;
              }
            } catch {
              setGenerationStatus(null);
            }
          }
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'CoachTeachPage.handleSubmit.surfaceRouting',
            summary: `pre-flight: input doesn't resolve to an opening — routing to brain (conversational): "${text.slice(0, 60)}"`,
          });
          // Don't take over the chat flow — fall through to the
          // brain so the user gets a normal coach reply. Setting
          // requestedName to null short-circuits the gen path.
          // Continue to brain handling below.
        } else {

        // (Line picker for broad openings now runs at Tier 1.5,
        // before the cache check — see above. Specific variation
        // names that fall through to here always go straight to
        // LLM gen because findLinePickerOptions returns null for them.)

        // ── Tier 2.5: Shared Supabase cache (cross-user). ──────
        // Anyone who's previously generated this opening has mirrored
        // their tree into a public Supabase table. Pull it before
        // spending an LLM call. Validates structurally + legally before
        // returning so a broken row from another user doesn't poison
        // this one. Skips silently when Supabase isn't configured.
        // readSharedCache now sanitizes the foreign tree's stage arrays
        // at its own boundary (David 2026-07-15 sweep), so callers get
        // clean stages without remembering to repair.
        const sharedTree = await readSharedCache(cacheKey ?? requestedName);
        if (sharedTree) {
          // Persist into local Dexie too so future visits are instant
          // without the Supabase round-trip.
          await cacheOpening(cacheKey ?? requestedName, sharedTree);
          const ack = `Found a cached lesson for the ${sharedTree.openingName} (someone else generated this earlier — instant load).`;
          setMessages((prev) => [...prev, {
            id: `${surfaceTurnId}-c`,
            role: 'assistant',
            content: ack,
            timestamp: Date.now(),
          }]);
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-teach',
            role: 'coach',
            text: ack,
            fen: gameRef.current.fen,
            trigger: null,
          });
          voiceService.stop();
          if (stageHint === 'play-real') {
            walkthrough.stop();
            void navigate(`/coach/play?opening=${encodeURIComponent(sharedTree.openingName)}`);
          } else if (stageHint) {
            walkthrough.startAtStageMenu(sharedTree, stageHint);
          } else {
            walkthrough.start(sharedTree);
          }
          // Kick off background stage gens for any missing stages
          // (the shared row may not have all of them populated).
          if (pace !== 'tour') {
            void generateMissingStagesInBackground(
              sharedTree.openingName,
              sharedTree,
              handleStageMerged,
            );
          }
          return;
        }

        // ── Tier 3: LLM generation (slow — ~30-60s). ───────────
        // Show the working banner so the student knows we're not
        // hung. Disable typing until generation completes (busy
        // gets set true; we set false in a finally below).
        setBusy(true);
        setGenerationStatus({ openingName: requestedName, startedAt: Date.now() });
        // Pre-flip the board based on the requested name's heuristic
        // BEFORE the LLM finishes — otherwise the student watches a
        // black-side opening load with white on bottom for 30-60s,
        // then a jarring flip at the end. Heuristic gets corrected
        // when the tree loads if the LLM-set studentSide disagrees.
        const guessedSide = inferStudentSide(requestedName);
        if (guessedSide !== playerColor) {
          setPlayerColor(guessedSide);
          game.setOrientation(guessedSide);
        }
        const ackBuilding = `Putting together ${lessonLabel(requestedName)} — this takes about a minute. The first time only; after this it'll be instant.`;
        setMessages((prev) => [...prev, {
          id: `${surfaceTurnId}-c`,
          role: 'assistant',
          content: ackBuilding,
          timestamp: Date.now(),
        }]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach',
          role: 'coach',
          text: ackBuilding,
          fen: gameRef.current.fen,
          trigger: null,
        });
        try {
          const result = await generateOpening(requestedName, {
            mode: faceMode ? 'face' : 'learn',
            pace,
          });
          if (result.ok && result.tree) {
            // Persist locally for instant re-load.
            await cacheOpening(cacheKey ?? requestedName, result.tree);
            // Mirror to shared Supabase cache so next user (or this
            // user on another device) gets it instantly. Fire-and-forget;
            // failures don't block the lesson from starting.
            void writeSharedCache(cacheKey ?? requestedName, result.tree);
            const successAck = `Ready — let's walk through the ${result.tree.openingName}.`;
            setMessages((prev) => [...prev, {
              id: `${surfaceTurnId}-c2`,
              role: 'assistant',
              content: successAck,
              timestamp: Date.now(),
            }]);
            useCoachMemoryStore.getState().appendConversationMessage({
              surface: 'chat-teach',
              role: 'coach',
              text: successAck,
              fen: gameRef.current.fen,
              trigger: null,
            });
            voiceService.stop();
            // Stage hint takes precedence even on first-time gen.
            // play-real navigates away. Otherwise: walkthrough on
            // first visit (no chooser since this IS the first visit).
            if (stageHint === 'play-real') {
              walkthrough.stop();
              void navigate(`/coach/play?opening=${encodeURIComponent(result.tree.openingName)}`);
            } else if (stageHint) {
              walkthrough.startAtStageMenu(result.tree, stageHint);
            } else {
              walkthrough.start(result.tree);
            }
            // Fire-and-forget: generate missing stages in background.
            // Each is a focused smaller LLM call that's more reliable
            // than packing everything into the main gen. Cache fills
            // progressively while user is engaged.
            if (pace !== 'tour') {
              void generateMissingStagesInBackground(
                requestedName,
                result.tree,
                handleStageMerged,
              );
            }
          } else {
            // Generation failed both attempts. Render an honest fallback.
            const failAck = `I couldn't put together a clean lesson for "${requestedName}" — ${result.reason ?? 'unknown error'}. Try a more standard opening name (e.g. "Italian Game", "Sicilian Defense", "Caro-Kann Defense") or ask me a question instead.`;
            setMessages((prev) => [...prev, {
              id: `${surfaceTurnId}-c2`,
              role: 'assistant',
              content: failAck,
              timestamp: Date.now(),
            }]);
            useCoachMemoryStore.getState().appendConversationMessage({
              surface: 'chat-teach',
              role: 'coach',
              text: failAck,
              fen: gameRef.current.fen,
              trigger: null,
            });
          }
        } finally {
          setGenerationStatus(null);
          setBusy(false);
        }
        return;
        } // end of dbHit-was-found branch
      }
    }

    setBusy(true);
    const turnId = freshTurnId();
    // Kickoff sends a system-style ask to seed the lesson — don't
    // render it as a "student said" turn in the transcript. Only the
    // coach's reply (the spoken greeting) shows up.
    if (!opts?.kickoff) {
      setMessages((prev) => [...prev, {
        id: `${turnId}-u`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      }]);
    }
    setStreaming('');

    // Stop any in-flight TTS so the new turn starts clean. Capture a
    // local abort flag so this turn's chain links can be killed if the
    // page unmounts mid-response. Note: we DO NOT use
    // voiceService.currentStopGeneration as the chain abort signal —
    // speakInternal calls this.stop() at the START of every speak,
    // which bumps stopGeneration. So after the FIRST speak in a chain,
    // gen has already advanced and any captured "turnGeneration" no
    // longer matches. Build abf2a2b audit confirmed: only the first
    // sentence of a 1218-char trip got spoken because the gen check
    // caused all subsequent chain links to short-circuit.
    // Abort any orphan speech chain from the previous turn. New flag
    // for this turn — current chain links capture this object and
    // observe its `aborted` field on every step.
    if (turnAbortRefRef.current) {
      turnAbortRefRef.current.aborted = true;
    }
    voiceService.stop();
    speechChainRef.current = Promise.resolve();
    const turnAbortRef = { aborted: false };
    turnAbortRefRef.current = turnAbortRef;

    // Two-stage buffer: `markupBuffer` holds raw streamed chunks until
    // any in-flight `[[DIRECTIVE...]]` tag closes (sanitizeCoachStream
    // returns it as `pending`); `sentenceBuffer` collects sanitized
    // prose for chat display. We do NOT speak every sentence — voice
    // is reserved for an explicit `[VOICE: short summary]` marker the
    // brain emits at the start of each response. The long teaching
    // text streams to chat without flooding Polly with a 1000-char
    // monologue. If the brain forgets the [VOICE:] marker, we fall
    // back to speaking the first sentence after streaming completes.
    let markupBuffer = '';
    let sentenceBuffer = '';
    let displayBuffer = '';
    // Raw stream buffer used solely for VOICE marker extraction. The
    // brain emits ONE `[VOICE: ...]` marker per response containing a
    // complete summary of the important info: what just happened on
    // the board, positional/structural assessment, future plans. The
    // voice speaks that summary AND the chat shows that same summary —
    // text == narration (David 2026-06-11). The long teaching prose that
    // streams after the marker is used only for board annotations
    // (arrows / tactic grounding), never shown as a divergent transcript.
    // We extract the first closed marker we see and ignore further VOICE
    // markers in the same turn — rambling-by-multiple-markers is not the goal.
    let voiceRawBuffer = '';
    let voiceSpokenForTurn = false;
    // The EXACT text we spoke this turn (raw `[VOICE:]` inner, or the
    // fallback first sentence). The chat bubble shows THIS, not the long
    // teaching prose — David 2026-06-11: "i want the text to match the
    // narration." The voice and the transcript are one source now; the
    // old "voice speaks a summary, chat shows the deeper essay" split is
    // what made the student hear one thing and read another (and made it
    // feel like a second LLM call wrote the chat text — it never was).
    let spokenDisplayText = '';
    let choicesExtractedForTurn = false;
    // Chips the brain offered via a `[CHOICES:]` marker this turn. Captured
    // here so they attach INLINE to the finalized coach message (persist in
    // the transcript), not just to the transient input-bar picker.
    let extractedChoices: string[] = [];
    /** `[VOICE: summary]` — captures inner content lazily so the
     *  marker closes on the first `]` rather than greedily consuming
     *  past it. Multi-line content allowed because the summary itself
     *  may span 3-4 sentences (positional, structural, plan). */
    const VOICE_MARKER_RE = /\[VOICE:\s*([\s\S]*?)\]/g;
    /** `[CHOICES: A | B | C]` — answer chips the brain offers when
     *  asking a discrete question. Same lazy-close shape as the
     *  voice marker so a `]` mid-prose can't accidentally swallow
     *  the rest of the stream. */
    const CHOICES_MARKER_RE = /\[CHOICES:\s*([\s\S]*?)\]/g;
    /** Pull chips out of the raw stream once per turn. Same one-shot
     *  pattern as voice: scan the buffer for a closed `[CHOICES:]`
     *  block, split on `|`, trim, surface as picker state. Subsequent
     *  markers in the same turn are ignored. */
    const tryExtractChoicesMarker = (): void => {
      if (choicesExtractedForTurn) return;
      CHOICES_MARKER_RE.lastIndex = 0;
      const match = CHOICES_MARKER_RE.exec(voiceRawBuffer);
      if (!match) return;
      const inner = match[1].trim();
      if (!inner) return;
      choicesExtractedForTurn = true;
      const items = inner
        .split('|')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 6); // hard cap so a runaway brain can't overflow
      if (items.length === 0) return;
      extractedChoices = items;
      void logAppAudit({
        kind: 'coach-voice-marker-extracted',
        category: 'subsystem',
        source: 'CoachTeachPage.tryExtractChoicesMarker',
        summary: `extracted [CHOICES: ...] (${items.length} options)`,
        details: JSON.stringify({ count: items.length, preview: items.slice(0, 4) }),
      });
    };
    let lastQueuedSentence = '';
    /** Track every line we hand to TTS so the Bug A2 post-process can
     *  check whether the LLM honored the "Setting the board to {name}."
     *  prompt rule on state-changing turns. */
    const spokenForTurn: string[] = [];
    const queueSpeak = (raw: string): void => {
      // GROUND every spoken line against the live board before it leaves the
      // device. The chat prose is grounded post-hoc, but the [VOICE:] marker
      // is spoken mid-stream and would otherwise bypass that gate — letting
      // the voice say things that aren't true on the board ("a pin was
      // broken" with no pin). Strip any disproven sentence so the voice can
      // ONLY speak board-true claims (David 2026-06-06: "EVERYTHING NEEDS TO
      // BE GROUNDED — we grounded the entire coach"). Fall back to the raw
      // text only if the FEN won't parse, so the coach never goes silent.
      let grounded = raw;
      try {
        const res = stripDisprovenSentences(raw, fen);
        grounded = res.clean;
        if (res.dropped.length > 0) {
          void logAppAudit({
            kind: 'claim-validator-trip',
            category: 'subsystem',
            source: 'CoachTeachPage.queueSpeak.boardGrounding',
            summary: `voice grounding stripped ${res.dropped.length} ungrounded sentence(s)`,
            details: JSON.stringify({
              fen,
              dropped: res.dropped.map((d) => d.sentence).slice(0, 5),
            }),
          });
        }
      } catch { /* unparseable FEN — speak raw rather than go silent */ }
      // ALSO strip any sentence claiming a TACTIC that isn't in the bounded
      // live context. The board gate above only catches false piece-on-square
      // claims, so a hallucinated "knight fork" with no false piece claim used
      // to be SPOKEN here — before the (audit-only) final-text check ever ran
      // (David 2026-06-16: false knight-fork claim on /coach/teach). This is
      // the only gate between the brain and the voice, so it must ENFORCE, not
      // just audit. Guarded so it never silences a turn on a fault.
      try {
        const tac = stripUngroundedTacticSentences(grounded, fedTacticsRef.current ?? tacticsForAsk);
        if (tac.dropped.length > 0) {
          grounded = tac.clean;
          void logAppAudit({
            kind: 'claim-validator-trip',
            category: 'subsystem',
            source: 'CoachTeachPage.queueSpeak.tacticGrounding',
            summary: `voice grounding stripped ${tac.dropped.length} ungrounded tactic sentence(s)`,
            details: JSON.stringify({ fen, dropped: tac.dropped.slice(0, 5) }),
          });
        }
      } catch { /* context not ready / parse fault — speak board-grounded text */ }
      const sentence = formatForSpeech(grounded);
      if (!sentence) return;
      if (sentence === lastQueuedSentence) return;
      lastQueuedSentence = sentence;
      spokenForTurn.push(sentence);
      speechChainRef.current = speechChainRef.current
        .then(() => {
          if (turnAbortRef.aborted) return;
          return voiceService.speakForced(sentence);
        })
        .catch(() => undefined);
    };
    /** Scan the raw stream for closed `[VOICE: ...]` markers. Speaks
     *  the first one we find; subsequent markers in the same turn are
     *  ignored (one spoken summary per turn). Called from onChunk on
     *  every delta so voice fires the moment the marker closes. */
    const tryExtractVoiceMarker = (): void => {
      if (voiceSpokenForTurn) return;
      VOICE_MARKER_RE.lastIndex = 0;
      const match = VOICE_MARKER_RE.exec(voiceRawBuffer);
      if (!match) return;
      const inner = match[1].trim();
      if (!inner) return;
      voiceSpokenForTurn = true;
      // The transcript shows exactly what the voice speaks (text == narration).
      spokenDisplayText = inner;
      // SUPPRESS brain [VOICE:] when the walkthrough is the priority
      // audio. Production audit (build e6c3c7b, finding 45) showed
      // the brain's "I kicked off the Vienna walkthrough anyway"
      // chat acknowledgement firing concurrently with the walkthrough
      // intro narration; both used force=true so the brain's voice
      // killed the walkthrough's mid-word. Walkthrough audio always
      // wins — render the brain's prose in chat but skip the speech.
      const walkthroughOwnsAudio =
        walkthrough.isActive && walkthrough.phase !== 'paused';
      void logAppAudit({
        kind: 'coach-voice-marker-extracted',
        category: 'subsystem',
        source: 'CoachTeachPage.tryExtractVoiceMarker',
        summary: walkthroughOwnsAudio
          ? `SUPPRESSED [VOICE: ...] (walkthrough owns audio, ${inner.length} chars)`
          : `extracted [VOICE: ...] block (${inner.length} chars)`,
        details: JSON.stringify({ length: inner.length, preview: inner.slice(0, 80) }),
      });
      if (!walkthroughOwnsAudio) {
        queueSpeak(inner);
      }
    };

    // Resolve the live FEN with the following priority:
    //   1. opts.fenOverride — required when handleSubmit is called
    //      from a board onMove (React hasn't re-rendered yet, so
    //      gameRef.current is one tick stale).
    //   2. walkthrough's displayed FEN — when a walkthrough or stage
    //      (drill, punish quiz, find-the-move quiz, trap-playing) is
    //      active, the board is showing the walkthrough's path/quiz
    //      position, NOT the underlying chess game state. Production
    //      audit (build 859956e): user asked "do I not just take the
    //      bishop with the pond" during a punish quiz at FEN
    //      r1b1kb1r/... and the brain saw the starting position FEN
    //      because gameRef hadn't moved. Brain answered as if at the
    //      start of a new game. Match the same priority used by the
    //      board renderer (drill > trap > walkthrough.fen).
    //   3. gameRef.current — fresh after the next render commit, which
    //      covers async coach trips and chat-input submissions when
    //      no walkthrough is active.
    // Derive turn from the FEN string ('w' or 'b' field) rather than
    // game.turn so override + turn always agree on the same FEN.
    const overrideFen = opts?.fenOverride;
    const liveGame = gameRef.current;
    const walkthroughFen = walkthrough.isActive
      ? (walkthrough.phase === 'drill'
          ? walkthrough.drillFen
          : walkthrough.trapFen ?? walkthrough.fen)
      : null;
    const fen = overrideFen ?? walkthroughFen ?? liveGame.fen;
    const fenTurn: 'white' | 'black' = fen.split(' ')[1] === 'b' ? 'black' : 'white';
    // Inject the latest Stockfish eval into the envelope when its FEN
    // matches the FEN we're asking about. The brain otherwise
    // self-counts material and gets it wrong — production audit
    // (build 4e628e5) caught it claiming "up a pawn" after losing a
    // queen for a knight. The eval bar effect populates this ref
    // 250ms after every FEN change, cached, so it's usually fresh.
    // When stale (FEN mismatch) we omit eval rather than misattribute.
    const evalSnapshot = latestEvalRef.current;
    const evalForAsk =
      evalSnapshot && evalSnapshot.fen === fen
        ? { evalCp: evalSnapshot.evalCp, evalMateIn: evalSnapshot.mateIn ?? undefined }
        : undefined;
    // Same FEN-keyed gate as the eval — only inject when the
    // snapshot's FEN matches the FEN we're asking about, so a
    // one-ply-stale snapshot can't be misattributed to the new
    // position.
    const lichessRef = lichessSnapshotRef.current;
    const lichessForAsk =
      lichessRef && lichessRef.fen === fen
        ? { lichessSnapshot: lichessRef.snapshot }
        : undefined;
    // Tactical context (Phase 1+2 of WO-COACH-TACTICAL-AWARENESS):
    // pre-compute named tactics in the live FEN + threats and
    // opportunities scanned through Stockfish's PV up to the
    // rating-adaptive lookahead depth (4 plies for intermediate
    // students per David's call). The brain's tactical vocabulary
    // is bounded by this block — G3 contract identical to the
    // master-play / opening-name grounding pattern. Only attaches
    // when we have a fresh analysis for this exact FEN; stale evals
    // would mislead the scan.
    const cachedAnalysis =
      latestEvalRef.current && latestEvalRef.current.fen === fen
        ? latestEvalRef.current.analysis
        : null;
    const studentColor = fenTurn === 'white' ? 'w' : 'b';
    // Rating proxy = puzzleRating (1200 fresh, drifts up/down with
    // adaptive puzzles). Drives lookahead depth via
    // `getTacticLookahead` — 4 plies once the student crosses 1400.
    const studentRating = activeProfile?.puzzleRating ?? 1200;
    // Tactics context for the prompt — SYNC, no engine await (David 2026-06-17:
    // trim the ~2.5s the blocking fed-read added to every turn's pre-flight).
    // A warm engine already makes this RICH via cachedAnalysis; the spine's
    // enforcing tactic gate works off it either way (a thin context still
    // strips inventions — empty > invented). The richer FED context (real PV
    // tactics, hang-protected) is fetched in the BACKGROUND and lands in
    // `fedTacticsRef` by the time the voice streams / the reply is graded, so
    // the spoken + displayed tactic strips use it without blocking the brain.
    const tacticsForAsk = buildTacticsLiveContext(fen, cachedAnalysis, studentColor, studentRating);
    fedTacticsRef.current = tacticsForAsk;
    void buildFedTacticsContext(fen, studentColor, studentRating, cachedAnalysis)
      .then((fed) => { fedTacticsRef.current = fed; })
      .catch(() => { /* engine down — keep the sync context */ });
    // Position trap detection (David 2026-06-16) is CENTRALIZED in
    // coachService.ask — every surface that routes through the grounded coach
    // inherits the same `scanPositionForTrap` → `liveState.trapSignal`, gated
    // on a trap/tactics question. Nothing to compute here; we just pass the
    // FEN + engineBestMoveUci (below) and the chokepoint does the scan.
    const liveState: LiveState = {
      surface: 'teach',
      currentRoute: '/coach/teach',
      fen,
      moveHistory: liveGame.history,
      userJustDid: text,
      // Tell the brain explicitly whose turn it is. Without this the
      // LLM was confusing sides — emitting `play_move {"san":"e5"}`
      // when it was Black's turn but the position needed White's
      // response, then chess.js rejected it 5 trips in a row.
      whoseTurn: fenTurn,
      tactics: tacticsForAsk,
      // GROUNDING INVERSION (STEP A): thread Stockfish's best move (UCI) so the
      // chat layer can COMPUTE a best-move answer and voice it via voiceFacts —
      // grounding even OFF-BOOK positions the master-play DB can't cover. Only
      // when the cached analysis is for THIS exact FEN (same gate as the eval).
      engineBestMoveUci: cachedAnalysis?.bestMove || undefined,
      // Step-by-step move narration: the engine-driven reply (coachReplyPlayed
      // defined) OR a typed "I played X. Your move." report, outside a
      // walkthrough. Tells the grounding pipeline this turn is move discussion
      // (coach narrates the played move + tactical ideas a ply ahead), so the
      // bare-SAN gate is skipped — the deep Learn game stocked out ~half its
      // turns otherwise (David 2026-06-04).
      moveNarration:
        !walkthrough.isActive &&
        (opts?.coachReplyPlayed !== undefined ||
          /\bi\s+(?:just\s+)?played\b[\s\S]*\byour\s+(?:move|turn)\b/i.test(text)),
      // The COMPUTED narration bundle for the engine-driven step turn. When
      // present, coachApi voices it straight through voiceFacts — no intent
      // detection, no assemblers, no "I can't verify" stock-out (2026-07-12:
      // every coach reply spoke the stock line after the injected-block strip
      // left this turn matching no assembler). Everything in it is computed:
      // the played reply, capture truth, why-strong, live tactics, question /
      // fork / chain directives.
      moveNarrationFacts:
        !walkthrough.isActive && opts?.coachReplyPlayed && opts.coachReplyPlayed.length > 0
          ? `The student played ${text.replace(/^i\s+played\s+/i, '').replace(/\.$/, '')}. ` +
            `The coach replied ${opts.coachReplyPlayed} — it is already on the board; never suggest playing it. ` +
            `${opts?.coachReplyFact ?? ''} ` +
            `Narrate the coach's reply and its idea in one or two sentences, then prompt the student's move.`
          : undefined,
      ...(evalForAsk ?? {}),
      ...(lichessForAsk ?? {}),
    };
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachTeachPage.buildLiveTactics',
      summary: `tactics ctx: immediate=${tacticsForAsk.immediate.length} hanging=${tacticsForAsk.hanging.length} threats=${tacticsForAsk.threats.length} opps=${tacticsForAsk.opportunities.length} depth=${tacticsForAsk.lookaheadDepth}`,
    });

    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachTeachPage',
      summary: `surface=teach viaSpine=true ask="${text.slice(0, 60)}"`,
      details: JSON.stringify({ fen, turn: fenTurn, overrideFen: !!overrideFen }),
    });

    if (!userMessageAppended) {
      useCoachMemoryStore.getState().appendConversationMessage({
        surface: 'chat-teach',
        role: 'user',
        text,
        fen,
        trigger: null,
      });
      userMessageAppended = true;
    }

    // Auto-pause the walkthrough when the student asks a chat
    // question while it's running. This frees the audio channel so
    // the brain's voice answer plays instead of being suppressed,
    // and freezes the board so the student can think about the
    // current position alongside the answer. The existing pause UI
    // (Resume / End buttons) lets them restart manually. User: "I
    // want that. Pause walkthrough and answer questions then confirm
    // continuation with user before restarting walkthrough."
    const autoPausedThisTurn =
      walkthrough.isActive && walkthrough.phase !== 'paused';
    if (autoPausedThisTurn) {
      walkthrough.pause();
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'CoachTeachPage.handleSubmit',
        summary: 'auto-paused walkthrough — student asked a chat question',
      });
    }

    // Step-by-step move report ("I played e4. Your move.") with NO
    // active walkthrough. Without this, the brain treats it as ordinary
    // chat and bleeds the PRIOR topic — the audit (2026-06-02) caught it
    // answering "I played e4. Your move." with "Back to where we were —
    // three pillars of Black's French strategy" instead of replying to
    // the move. Augment the ask with a focused directive (and trigger
    // the G6 arrow obligation) WITHOUT mutating the displayed message.
    const STEP_BY_STEP_RE = /\bi\s+(?:just\s+)?played\b[\s\S]*\byour\s+(?:move|turn)\b/i;
    // `coachReplyPlayed` defined = the ENGINE already played the coach's reply
    // (the grounding-truth path); play_move is disabled below so the LLM
    // cannot move — it only narrates. A non-empty value is the SAN to narrate.
    const replyPlayed = opts?.coachReplyPlayed;
    const engineDrivenStep = replyPlayed !== undefined;
    const isStepByStepReport =
      (STEP_BY_STEP_RE.test(text) || engineDrivenStep) && !walkthrough.isActive;
    const effectiveAsk =
      replyPlayed && replyPlayed.length > 0
        ? `${text}\n\n[STEP-BY-STEP NARRATION — the engine already played the coach's reply ${replyPlayed}; it is ALREADY on the board. ${opts?.coachReplyFact ?? ''} You do NOT and CANNOT play moves (play_move is disabled). NARRATE ${replyPlayed} using ONLY the grounded fact above for what it captured — never invent a captured piece. Name the idea behind the move, draw [BOARD: arrow:from-to:green] on that move AND on every SAN you mention in prose. Put your SPOKEN narration in a [VOICE: ...] marker — one or two plain sentences naming the move and its idea — so the coach speaks it aloud (this is REQUIRED; without it the student hears nothing). Do NOT summarize or continue any earlier topic; narrate this reply, then prompt the student's turn. If you name a move for the student to play, it MUST be the engine move named in the grounded facts above — recommend ONLY that one. If the facts name no engine move, do NOT name any move; just say it's their turn. NEVER invent a move, NEVER tell them to move a piece to a square it already occupies, and NEVER recommend a move that isn't in the facts above.]`
        : engineDrivenStep
          ? text // no legal coach reply (game over) — narrate the student's move only
          : isStepByStepReport
            ? `${text}\n\n[STEP-BY-STEP: the student reported THEIR move. The coach's reply has NOT been computed by the engine — you do NOT know it. You MUST NOT name, narrate, or invent ANY coach reply move: no "queen takes queen", no fabricated capture, no guessed continuation. Inventing a move that wasn't played is a hallucination and is forbidden. Acknowledge ONLY the student's reported move and its idea, draw an arrow on every SAN you ACTUALLY mention, then prompt for their next move WITHOUT naming a specific move for them to play — you have no engine recommendation here, so just say it's their turn. If you have nothing grounded to say about THEIR move, be brief or stay silent — never fill the gap with an invented reply OR an invented move suggestion.]`
            : text;
    if (isStepByStepReport) {
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'CoachTeachPage.handleSubmit',
        summary: 'step-by-step move report detected — focused move-by-move directive injected',
      });
    }

    try {
      const result = await coachService.ask(
        { surface: 'teach', ask: effectiveAsk, liveState },
        {
          // Provider routing: spine default (DeepSeek). The Anthropic
          // balance is exhausted as of 2026-05, so pinning Anthropic
          // here guaranteed an empty-budget 401 on every turn before
          // the fallback layer could fire. DeepSeek tool-use handles
          // the same teach surface — the DB anchors moves/FENs and
          // the LLM only writes narration, which `deepseek-chat`
          // produces fine at a fraction of the cost. Anthropic
          // remains wired in `coachApi.getCoachStructuredResponse`
          // as a best-effort fallback if DeepSeek errors.
          // 4 trips is enough: trip 1 thinks + tools (lichess /
          // stockfish), trip 2 emits play_move + teach text, trip 3-4
          // closes the prose. 6 was costing 18–30s of Opus latency
          // per turn; with liveFenRef preventing redundant retries
          // the budget can come down without losing coverage.
          maxToolRoundTrips: 4,
          // GROUNDING TRUTH: on the engine-driven step-by-step path the
          // engine already played the coach's reply, so play_move is removed
          // from the brain's toolbelt — the LLM physically cannot pick or
          // play a move; it only narrates.
          excludeTools: engineDrivenStep ? ['play_move'] : undefined,
          personality: activeProfile?.preferences.coachPersonality,
          profanity: activeProfile?.preferences.coachProfanity,
          mockery: activeProfile?.preferences.coachMockery,
          flirt: activeProfile?.preferences.coachFlirt,
          verbosity: activeProfile?.preferences.coachResponseLength,
          // Refresh ctx.liveFen at the start of every brain trip. The
          // brain's play_move validation re-reads from this getter so
          // trip N+1 sees the post-trip-N board state. Without it the
          // brain hallucinates extra moves on the wrong side.
          getLiveFen: () => liveFenRef.current,
          onPlayMove: (san: string) => handlePlayMove(san),
          onTakeBackMove: (count: number) => handleTakeBack(count),
          onSetBoardPosition: (newFen: string) => handleSetBoardPosition(newFen),
          onResetBoard: () => handleResetBoard(),
          onNavigate: (path: string) => { void navigate(path); },
          // Walkthrough handoff: when the LLM decides "let's drill this
          // opening line as a guided walkthrough," route the student
          // to the walkthrough surface seeded with the opening name.
          // Without this wired the brain tool would no-op and the
          // teach session couldn't escalate to a focused drill.
          onStartWalkthroughForOpening: async ({ opening, orientation }) => {
            // PRESERVE EXISTING WALKTHROUGH STATE.
            // Production audit (build e6c3c7b) caught a regression
            // where the brain re-called start_walkthrough_for_opening
            // mid-paused-walkthrough, restarting from the root and
            // destroying the student's progress. Here we short-circuit:
            // if a walkthrough is already running on this surface,
            // RESUME (if paused) or no-op (if active). Only start
            // fresh if nothing is in progress.
            if (walkthrough.isActive) {
              if (walkthrough.phase === 'paused') {
                walkthrough.resume();
                void logAppAudit({
                  kind: 'coach-surface-migrated',
                  category: 'subsystem',
                  source: 'CoachTeachPage.onStartWalkthroughForOpening',
                  summary: `RESUMED paused walkthrough instead of restarting (brain asked for "${opening}")`,
                });
              }
              return { ok: true };
            }
            // No walkthrough in progress — start fresh. Check the
            // static registry first, then the Dexie cache for any
            // LLM-generated tree from a prior visit. Production audit
            // (build 62a884d) caught Sicilian getting handed off to
            // /coach/session/walkthrough (the legacy surface) because
            // the static registry doesn't carry it — even when a
            // valid LLM-generated tree was already cached. The cache
            // fallback keeps the in-place walkthrough flow on
            // /coach/teach for everything we've ever generated.
            const tree =
              resolveWalkthroughTree(opening) ?? (await getCachedOpening(opening));
            if (tree) {
              // SILENCE THE BRAIN before the walkthrough starts speaking.
              // Production audit (build 3e2263c) caught a "two voices"
              // overlap: the brain emitted [VOICE: "the Vienna walkthrough
              // is launching..."] which Polly began speaking; 1.5s later
              // the walkthrough's intro started ("The Vienna Game. It's
              // the King's Pawn opening's quieter, sharper cousin..."),
              // both running concurrently. The brain's preamble was
              // redundant — the walkthrough has its own intro. Stopping
              // here cuts the brain mid-sentence in favor of the
              // walkthrough's authoritative narration.
              voiceService.stop();
              // Mark the turn's voice slot as already spent so the
              // brain's [VOICE:] fallback doesn't re-queue after the
              // walkthrough is running.
              turnAbortRef.aborted = true;
              walkthrough.start(tree);
              return { ok: true };
            }
            // No static / cached tree — generate in-place via the
            // canonical DB-narration path, exactly like the URL-param
            // kickoff at line ~1300. Previously this branch bounced
            // the user to /coach/session/walkthrough (the legacy
            // stripped-down surface); production audit (David,
            // 2026-05-19) confirmed the boomerang fired when the
            // brain tool emitted start_walkthrough for an opening
            // outside the static registry and uncached.
            const ackBuilding = `Putting together ${lessonLabel(opening)} — this takes about a minute. The first time only; after this it'll be instant.`;
            const brainTurnId = freshTurnId('brain-walk');
            setMessages((prev) => [...prev, {
              id: `${brainTurnId}-c`,
              role: 'assistant',
              content: ackBuilding,
              timestamp: Date.now(),
            }]);
            useCoachMemoryStore.getState().appendConversationMessage({
              surface: 'chat-teach',
              role: 'coach',
              text: ackBuilding,
              fen: gameRef.current.fen,
              trigger: null,
            });
            setBusy(true);
            setGenerationStatus({ openingName: opening, startedAt: Date.now() });
            // Pre-flip the board to the brain's requested side (or
            // the heuristic) BEFORE the LLM finishes — same trick
            // as the URL-param kickoff to avoid the 30-60s
            // wrong-orientation flash.
            const requestedSide =
              orientation === 'white' || orientation === 'black'
                ? orientation
                : inferStudentSide(opening);
            if (requestedSide !== playerColor) {
              setPlayerColor(requestedSide);
              game.setOrientation(requestedSide);
            }
            // Silence the brain's [VOICE:] preamble so we don't get
            // a "two voices" overlap when the generated walkthrough
            // starts narrating. Same guard as the cached-tree path
            // above.
            voiceService.stop();
            turnAbortRef.aborted = true;
            try {
              const genResult = await generateOpening(opening, {
                mode: 'learn',
                pace,
              });
              if (genResult.ok && genResult.tree) {
                await cacheOpening(opening, genResult.tree);
                void writeSharedCache(opening, genResult.tree);
                const successAck = `Ready — let's walk through the ${genResult.tree.openingName}.`;
                setMessages((prev) => [...prev, {
                  id: `${brainTurnId}-c2`,
                  role: 'assistant',
                  content: successAck,
                  timestamp: Date.now(),
                }]);
                useCoachMemoryStore.getState().appendConversationMessage({
                  surface: 'chat-teach',
                  role: 'coach',
                  text: successAck,
                  fen: gameRef.current.fen,
                  trigger: null,
                });
                walkthrough.start(genResult.tree);
                if (pace !== 'tour') {
                  void generateMissingStagesInBackground(
                    genResult.tree.openingName,
                    genResult.tree,
                    handleStageMerged,
                  );
                }
                return { ok: true };
              }
              const errAck = `I couldn't build the ${lessonLabel(opening)} walkthrough this time. Try again or pick a different opening.`;
              setMessages((prev) => [...prev, {
                id: `${brainTurnId}-err`,
                role: 'assistant',
                content: errAck,
                timestamp: Date.now(),
              }]);
              return { ok: false };
            } finally {
              setBusy(false);
              setGenerationStatus(null);
            }
          },
          onChunk: (chunk: string) => {
            // Two streams off each delta:
            //   1. voiceRawBuffer — looks for `[VOICE: ...]` markers
            //      and queues the FIRST one's content for speech.
            //   2. markupBuffer / displayBuffer — sanitized prose for
            //      the chat bubble. The SAME `[VOICE: ...]` marker is
            //      stripped here by SINGLE_MARKUP_RE so it doesn't
            //      double-show in the transcript.
            voiceRawBuffer += chunk;
            tryExtractVoiceMarker();
            tryExtractChoicesMarker();
            markupBuffer += chunk;
            const { safe, pending } = sanitizeCoachStream(markupBuffer);
            markupBuffer = pending;
            if (!safe) return;
            // First real prose chunk → tear down the kickoff progress
            // banner (the lesson is now visibly arriving).
            if (kickoffStatus) setKickoffStatus(null);
            // Render in chat — sanitized only. The bubble shows exactly
            // what the voice speaks: once the `[VOICE:]` marker has been
            // extracted (it leads the response), stream THAT, so the
            // transcript never balloons into the long teaching prose and
            // then snaps shorter (text == narration, David 2026-06-11).
            // Until the marker closes we show the live prose so the
            // student isn't staring at a blank bubble.
            displayBuffer += safe;
            setStreaming(
              spokenDisplayText.trim()
                ? sanitizeCoachText(spokenDisplayText)
                : displayBuffer,
            );
            sentenceBuffer += safe;
            // Drain sentence terminators only to keep the buffer
            // bounded. We do NOT queueSpeak per sentence — voice is
            // routed exclusively through the `[VOICE: ...]` marker.
            let match: RegExpExecArray | null;
            while ((match = SENTENCE_END_RE.exec(sentenceBuffer)) !== null) {
              sentenceBuffer = sentenceBuffer.slice(match.index + match[1].length);
            }
          },
        },
      );

      // Final attempt to extract `[VOICE: ...]` from the full raw
      // stream in case the marker straddled a chunk boundary that the
      // per-delta scan missed. Then a fallback: if the brain forgot
      // to emit `[VOICE: ...]` entirely, speak the first sentence of
      // the final response so the student isn't left in silence.
      tryExtractVoiceMarker();
      tryExtractChoicesMarker();

      // ── play_move SAFETY NET (David 2026-06-02: "coach didn't move a
      //    piece!!"). On a step-by-step move turn the brain is told to
      //    play its single reply via the play_move tool. A non-reasoner
      //    model sometimes WRITES the move in prose ("I'll mirror with
      //    d5") without ever calling the tool, so the board never updates
      //    — an old, intermittent bug the deepseek-chat latency fix made
      //    easier to hit. If NO play_move fired this turn, recover the
      //    coach's intended move from the response: the FIRST legal SAN
      //    for the side to move that the text actually names. handlePlayMove
      //    re-validates and refuses to touch the student's pieces, so a
      //    stray SAN can never move the wrong side — worst case we play a
      //    sound move the coach itself named, which always beats a frozen
      //    board.
      // Skip on the engine-driven path — the engine ALREADY played the
      // coach's reply in code, so there is nothing to recover (and firing
      // would double-move).
      if (!engineDrivenStep && isStepByStepReport && !result.dispatchedToolNames.includes('play_move')) {
        const liveFen = liveFenRef.current;
        const sideToMove = liveFen.split(' ')[1] === 'w' ? 'white' : 'black';
        if (sideToMove !== playerColor) {
          try {
            const scan = `${spokenForTurn.join(' ')} ${result.text}`;
            let chosen = recoverCoachMoveFromText(liveFen, scan);
            let recoverySource: 'narration' | 'db-explorer' = 'narration';
            // When the response names NO legal SAN, the OLD safety net froze
            // the board → "coach forgot its move." That happens when the
            // master-play grounding gate served its stock "I can't verify
            // which moves are sound" fallback (PostHog 2026-06-04:
            // master-play-enforcement-fallback on /coach/teach) or the
            // reasoner returned prose without a move. The board must NEVER
            // freeze on a step-by-step turn, so fall back to the most-played
            // book continuation from the explorer (DB = source of truth).
            // GUARD: skip when the brain genuinely asked a question (a
            // clarifying "which variation?" turn legitimately doesn't move) —
            // the stock fallback isn't phrased as a question, a real ask is.
            const looksLikeQuestion = /\?\s*$/.test(result.text.trim());
            if (!chosen && !looksLikeQuestion) {
              try {
                const explorer = await fetchLichessExplorer(liveFen, 'lichess');
                chosen = explorer.moves[0]?.san ?? null;
                if (chosen) recoverySource = 'db-explorer';
              } catch { /* network / rate-limit — leave chosen null */ }
            }
            if (chosen) {
              const recovered = handlePlayMove(chosen);
              void logAppAudit({
                kind: 'coach-surface-migrated',
                category: 'subsystem',
                source: 'CoachTeachPage.playMoveSafetyNet',
                summary: `no play_move dispatched on a step-by-step turn — recovered "${chosen}" via ${recoverySource} (${recovered.ok ? 'played' : 'rejected: ' + (recovered.reason ?? 'unknown')})`,
                fen: liveFen,
              });
            } else {
              void logAppAudit({
                kind: 'coach-surface-migrated',
                category: 'subsystem',
                source: 'CoachTeachPage.playMoveSafetyNet',
                summary: `no play_move dispatched and no move recovered (narration + explorer both empty${looksLikeQuestion ? '; response was a question — board left for the student to answer' : ''}) — board unchanged`,
                fen: liveFen,
              });
            }
          } catch { /* parse/validation failure — leave the board as-is */ }
        }
      }

      // Audit-instrumentation phase-3: verbosity response-length
      // distribution. Tracks the rolling p50/p90 per verbosity tier.
      // When the cap fires often or p50 drifts above the prompt budget
      // we know the brain is ignoring the rule and we tighten.
      {
        const verbosity = resolveCoachNarration(activeProfile?.preferences) ?? 'full';
        const lengths = responseLengthsRef.current[verbosity] ?? [];
        lengths.push(result.text.length);
        if (lengths.length > 20) lengths.shift();
        responseLengthsRef.current[verbosity] = lengths;
        const sorted = [...lengths].sort((a, b) => a - b);
        const p = (q: number): number => {
          if (sorted.length === 0) return 0;
          const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
          return sorted[idx];
        };
        const p50 = p(0.5);
        const p90 = p(0.9);
        void logAppAudit({
          kind: 'verbosity-response-length',
          category: 'subsystem',
          source: 'CoachTeachPage.responseLengthTracker',
          summary: `verbosity=${verbosity} length=${result.text.length}c rolling[n=${lengths.length}] p50=${p50} p90=${p90}`,
          details: JSON.stringify({
            verbosity,
            currentLength: result.text.length,
            rollingCount: lengths.length,
            p50,
            p90,
            min: sorted[0],
            max: sorted[sorted.length - 1],
          }),
        });
      }

      // Bug A2 enforcement audit (2026-05-19): when the brain called a
      // state-changing tool (set_board_position / start_walkthrough_for_opening)
      // its [VOICE:] block was supposed to begin with "Setting the
      // board to {name}." (or "Starting the {name} walkthrough.") so
      // the spoken signal matches the visual signal. Audit the
      // violations so we can observe how often the LLM ignores the
      // prompt rule. Active prepend is a follow-up — see
      // docs/plans/2026-05-19-coach-audit-rerun-9bugs.md (Bug A).
      const stateChangingTools = result.dispatchedToolNames.filter((n) =>
        n === 'set_board_position' || n === 'start_walkthrough_for_opening',
      );
      if (stateChangingTools.length > 0 && spokenForTurn.length > 0) {
        const firstSpoken = spokenForTurn[0].toLowerCase();
        const announcedBoard =
          firstSpoken.startsWith('setting the board') ||
          firstSpoken.startsWith('starting the ') ||
          firstSpoken.startsWith("let's set the board") ||
          firstSpoken.startsWith("i'm setting the board");
        if (!announcedBoard) {
          void logAppAudit({
            kind: 'claim-validator-trip',
            category: 'subsystem',
            source: 'CoachTeachPage.setBoardSentenceValidator',
            summary:
              `state-changing tools fired (${stateChangingTools.join(', ')}) ` +
              `but voice did NOT begin with "Setting the board to…": "${spokenForTurn[0].slice(0, 60)}"`,
            details: JSON.stringify({
              tools: stateChangingTools,
              firstSpoken: spokenForTurn[0].slice(0, 200),
              allSpokenForTurn: spokenForTurn.map((s) => s.slice(0, 80)),
            }),
            fen,
          });
        }
      }

      // Bug A spoken-vs-displayed divergence audit (audit-improvement
      // #1 from the 2026-05-19 discussion). Compares what the LLM
      // SPOKE (first voice line) against what the BOARD now shows
      // (walkthrough opening name) — when they don't both reference
      // the same opening, the student hears one thing and sees
      // another. Audit-only first cut; the data tells us how often
      // it happens before we decide on active fix-up.
      if (spokenForTurn.length > 0) {
        const boardOpeningName =
          walkthrough.tree?.openingName ?? null;
        if (boardOpeningName) {
          // Normalize for substring containment: drop punctuation,
          // lower-case. The spoken text mentions the opening name if
          // any meaningful token from the name appears in the voice.
          const norm = (s: string) =>
            s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
          const spokenNorm = norm(spokenForTurn.join(' '));
          const nameTokens = norm(boardOpeningName)
            .split(' ')
            .filter((t) => t.length >= 4); // ≥4 chars per Bug D guard
          const mentionedOnVoice =
            nameTokens.length === 0 ||
            nameTokens.some((t) => spokenNorm.includes(t));
          if (!mentionedOnVoice) {
            void logAppAudit({
              kind: 'claim-validator-trip',
              category: 'subsystem',
              source: 'CoachTeachPage.voiceDisplayedDivergence',
              summary:
                `voice did NOT mention the board opening "${boardOpeningName}" — ` +
                `student hears one thing, sees another. ` +
                `Spoken: "${spokenForTurn[0].slice(0, 60)}"`,
              details: JSON.stringify({
                boardOpeningName,
                spokenPreview: spokenForTurn[0].slice(0, 200),
                allSpokenForTurn: spokenForTurn.map((s) => s.slice(0, 80)),
              }),
              fen,
            });
          }
        }
      }
      if (!voiceSpokenForTurn) {
        const finalText = sanitizeCoachText(result.text);
        const firstSentenceMatch = SENTENCE_END_RE.exec(finalText);
        const firstSentence = firstSentenceMatch
          ? firstSentenceMatch[1].trim()
          : finalText.trim();
        // Grounded answers (stats / mistakes / repertoire-gap / …) are concise,
        // complete, and carry NO [VOICE:] marker — they must be spoken in FULL,
        // not truncated to one sentence (David 2026-07-04 voice attachments). The
        // brief-cap in voiceService.speakInternal still clips them to ≤2 sentences
        // on 'brief', so 'full' hears the whole answer and 'brief' hears the gist.
        // Long free-form prose (> ~600 chars) still falls back to the first
        // sentence so a rambling brain turn isn't read out wholesale.
        const speakText = finalText.length > 0 && finalText.length <= 600
          ? finalText.trim()
          : firstSentence;
        if (speakText) {
          voiceSpokenForTurn = true;
          // Transcript mirrors the spoken fallback too (text == narration).
          spokenDisplayText = speakText;
          // Same suppression as the [VOICE:] path: walkthrough audio
          // always wins. The fallback first-sentence speech also gets
          // suppressed when the walkthrough is running.
          const walkthroughOwnsAudio =
            walkthrough.isActive && walkthrough.phase !== 'paused';
          void logAppAudit({
            kind: 'coach-voice-marker-extracted',
            category: 'subsystem',
            source: 'CoachTeachPage.fallback',
            summary: walkthroughOwnsAudio
              ? `SUPPRESSED fallback voice (walkthrough owns audio, ${speakText.length} chars)`
              : `[VOICE:] missing — fallback spoke ${speakText.length === firstSentence.length ? 'first sentence' : 'full grounded answer'} (${speakText.length} chars)`,
            details: JSON.stringify({ length: speakText.length, preview: speakText.slice(0, 80) }),
          });
          if (!walkthroughOwnsAudio) {
            queueSpeak(speakText);
          }
        } else {
          void logAppAudit({
            kind: 'coach-voice-marker-extracted',
            category: 'subsystem',
            source: 'CoachTeachPage.fallback',
            summary: '[VOICE:] missing AND result.text empty — voice silent for this turn',
          });
        }
      }

      // Board annotations are CODE-DERIVED ONLY (G0): the LLM no longer
      // draws arrows or highlights. It just NAMES moves (→ arrows) and
      // squares (→ highlights) in prose; code resolves the geometry +
      // Stockfish-rank color below. Any `[BOARD: ...]` markup (or a prose
      // "Board arrows:" list) the LLM emitted anyway is stripped from the
      // display and IGNORED as a board source — that markup is exactly what
      // leaked to the student ("Board arrows: c6-c6 highlighting the hanging
      // pawn", David 2026-06-16) and produced ungrounded arrows. Clear this
      // turn's annotations up front; the code-derived set is applied after
      // the final text is known (see the candidate-annotation pass below).
      setArrows([]);
      setHighlights([]);

      // Sanitize the FINAL response too — both for transcript display
      // and for the conversation memory record. Memory rehydration on
      // the next turn re-feeds prior assistant text into the prompt;
      // unsanitized text would teach the LLM that markup is normal.
      let finalText = sanitizeCoachText(result.text);
      // ENFORCING tactic gate (David 2026-06-16: false knight-fork claim on
      // /coach/teach). This used to be AUDIT-ONLY — it logged the out-of-vocab
      // tactic and shipped the false claim to the student anyway. Now it STRIPS
      // any sentence claiming a tactic absent from the bounded live context,
      // from the SHOWN bubble + the memory record (the spoken path is gated in
      // queueSpeak). Negation/avoidance phrasing is kept; a real tactic that's
      // in the context is never touched. Mirrors the shared groundCoachReply
      // gate so there is one tactic-grounding standard.
      try {
        const ft = stripUngroundedTacticSentences(finalText, fedTacticsRef.current ?? tacticsForAsk);
        if (ft.dropped.length > 0) {
          finalText = ft.clean;
          void logAppAudit({
            kind: 'claim-validator-trip',
            category: 'subsystem',
            source: 'CoachTeachPage.tacticClaimGate',
            summary: `STRIPPED ${ft.dropped.length} ungrounded tactic sentence(s) from the reply`,
            details: JSON.stringify({ fen, dropped: ft.dropped.slice(0, 5) }),
            fen,
          });
        }
      } catch { /* never block the reply on a validator fault */ }
      // What the student READS is exactly what the voice SPOKE (text ==
      // narration, David 2026-06-11). `spokenDisplayText` is the raw
      // `[VOICE:]` inner (or the fallback first sentence) — the one thing
      // we actually said. Fall back to the full prose only when nothing
      // was spoken at all (empty response), so the bubble is never blank.
      let displayText = spokenDisplayText.trim()
        ? sanitizeCoachText(spokenDisplayText)
        : finalText;
      // The shown [VOICE:] inner bypasses the finalText strip above — clean it
      // too so the false tactic claim isn't READ even if it was caught before
      // being SPOKEN.
      try {
        const dt = stripUngroundedTacticSentences(displayText, fedTacticsRef.current ?? tacticsForAsk);
        if (dt.dropped.length > 0) displayText = dt.clean.trim() || finalText;
      } catch { /* never block the reply */ }
      if (finalText) {
        // Board annotations are CODE-DERIVED (G0): the LLM never draws arrows;
        // it just NAMES moves in prose. `arrowEngine` (via applyCandidateArrows)
        // is the SOLE board source — it strips any LLM markup, resolves each
        // named move's geometry in code, colors by Stockfish rank (GREEN=#1 /
        // YELLOW=#2-3; off-top-3 SUGGESTIONS draw nothing — we never point at a
        // bad move, David 2026-07-06), caps the count so the board never floods,
        // and EXCLUDES the just-played move (David 2026-07-13, below). This
        // SUPERSEDES the 2026-05-19 "synthesize an arrow for every named SAN"
        // enforcement (the old validateArrowClaims / arrowClaimValidator, now
        // deleted) — arrows are guaranteed by construction for real suggestions,
        // not detected-after-the-fact. Display text (`finalText`) stays as the
        // LLM wrote it; only the code-derived markers reach the board.
        // NOTE (David 2026-07-13): threats named ONLY in prose (not spoken) get
        // no arrow; "arrow threats only when the coach calls them out loud" is a
        // pending refinement (needs the spoken-text source + a threat color).
        // Arrows (David 2026-07-13): (1) NEVER arrow the move the coach just
        // played — it's already on the board (`replyPlayed` is the step-by-step
        // engine reply; undefined elsewhere). (2) A THREAT gets a red arrow only
        // when the coach CALLS IT OUT LOUD, so pass the spoken text — a threat
        // written only in the bubble stays un-arrowed.
        const spokenForArrows = spokenForTurn.join(' ').trim();
        const arrowed = await applyCandidateArrows(finalText, fen, 'CoachTeachPage', {
          excludeSan: replyPlayed,
          spokenText: spokenForArrows || undefined,
        });
        const highlightMarkers = candidateHighlightMarkers(finalText, 'CoachTeachPage');
        const annotated = highlightMarkers.length > 0
          ? `${arrowed} ${highlightMarkers.join(' ')}`
          : arrowed;
        const annoBoard = parseBoardTags(annotated);
        const codeArrows: BoardArrow[] = [];
        const codeHighlights: BoardHighlight[] = [];
        for (const cmd of annoBoard.commands) {
          if (cmd.type === 'arrow' && cmd.arrows) codeArrows.push(...cmd.arrows);
          if (cmd.type === 'highlight' && cmd.highlights) codeHighlights.push(...cmd.highlights);
        }
        // Merge the opening-chain's lead-the-eye arrows so the narration's
        // own arrow pass doesn't wipe them — both describe THIS reply.
        // groundArrows re-validates everything against the live fen.
        setArrows(uniqueArrows(groundArrows([...codeArrows, ...chainArrowsRef.current], fen)));
        setHighlights([...codeHighlights, ...chainHighlightsRef.current]);
        setMessages((prev) => [...prev, {
          id: `${turnId}-c`,
          role: 'assistant',
          content: displayText,
          timestamp: Date.now(),
          // Inline "did you mean…" chips the brain offered via a
          // `[CHOICES:]` marker — attached to the message so they persist
          // with the question instead of vanishing from the input bar on
          // the next turn (David 2026-07-18).
          ...(extractedChoices.length > 0 ? { choices: extractedChoices } : {}),
          // Opt-in follow-up picker the grounded answer attached
          // (David 2026-07-04) — tappable chip, never auto-launched.
          ...(result.actionOffer && result.actionOffer.length > 0
            ? { metadata: { actions: result.actionOffer } }
            : {}),
        }]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach',
          role: 'coach',
          text: displayText,
          fen: gameRef.current.fen,
          trigger: null,
        });
      }

      // If we auto-paused the walkthrough at the start of this turn,
      // tell the student how to continue. The Resume button is
      // already visible on the paused-state UI, but the explicit
      // chat prompt makes the workflow obvious. User: "...then
      // confirm continuation with user before restarting walkthrough."
      if (autoPausedThisTurn) {
        const resumeMsg = `Walkthrough is paused. Tap Resume to continue, or ask another question.`;
        setMessages((prev) => [...prev, {
          id: `${turnId}-resume-prompt`,
          role: 'assistant',
          content: resumeMsg,
          timestamp: Date.now(),
        }]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach',
          role: 'coach',
          text: resumeMsg,
          fen: gameRef.current.fen,
          trigger: null,
        });
      }
    } catch (err) {
      console.error('[CoachTeachPage] ask failed:', err);
      const snagAck = 'Hit a snag — say it again?';
      setMessages((prev) => [...prev, {
        id: `${turnId}-c`,
        role: 'assistant',
        content: snagAck,
        timestamp: Date.now(),
      }]);
      useCoachMemoryStore.getState().appendConversationMessage({
        surface: 'chat-teach',
        role: 'coach',
        text: snagAck,
        fen: gameRef.current.fen,
        trigger: null,
      });
    } finally {
      setStreaming(null);
      setBusy(false);
      setKickoffStatus(null);
      // Audit-instrumentation phase-1: clear the per-turn id so
      // out-of-turn events (route changes, background tasks) don't
      // get mis-tagged with the just-finished turn.
      setCurrentTurnId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracked for dedicated audit; current deps cover the live callers.
  }, [busy, activeProfile, handlePlayMove, handleTakeBack, handleSetBoardPosition, handleResetBoard, navigate, kickoffStatus, walkthrough, playerColor, playDictatedMove]);

  // Student-driven moves go through ControlledChessBoard's onMove
  // callback (below). useChessGame already handles the click-to-move
  // + drag + legal-dot UI internally, so the parent just needs to
  // observe completed moves and tell the coach about them.
  // GROUNDING TRUTH (David, from day one): LLMs cannot play chess, so the
  // coach's reply is chosen by the DB/engine, NEVER the LLM. Book
  // continuation while the student stays on the taught line; rating-matched
  // getAdaptiveMove (the SAME engine the WLPP Play rung uses) once they
  // deviate / leave book; random legal as the never-freeze floor.
  const resolveCoachReplyMove = useCallback(async (fen: string): Promise<string | null> => {
    // 0) A move the student DICTATED ("after your move, I'll play Nc3") wins
    //    over book and engine — the coach plays every move it's told to
    //    (David 2026-07-12). Validated legal on the live FEN; dropped with an
    //    audit if the position moved past it.
    const dictated = pendingCoachMoveRef.current;
    if (dictated) {
      pendingCoachMoveRef.current = null;
      try {
        const probe = new Chess(fen);
        const m = probe.move(dictated);
        if (m) {
          captureEvent('coach_move_command', { surface: 'coach-teach', mode: 'pending-played', san: m.san });
          return m.san;
        }
      } catch { /* fall through */ }
      captureEvent('coach_move_command', { surface: 'coach-teach', mode: 'pending-illegal', san: dictated });
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'CoachTeachPage.resolveCoachReplyMove',
        summary: `dictated reply ${dictated} no longer legal from ${fen} — falling back to book/engine`,
      });
    }
    // Half-moves already played, derived from the FEN (= index of the NEXT
    // move in the book line). Robust against any gameRef render lag.
    const parts = fen.split(' ');
    const fullmove = Number.parseInt(parts[5] ?? '1', 10) || 1;
    const ply = (fullmove - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
    // 1) Book continuation — the coach replies with the opening's next move
    //    while the student is still on the named line. Source the opening the
    //    USER chose: the loaded walkthrough line first, else the opening they
    //    committed to (intendedOpening) — so the spine plays the opening the
    //    user actually wants played, not a generic engine move (David
    //    2026-06-04: "make sure the spine can still play the opening the user
    //    wants played").
    const openingName =
      walkthrough.tree?.openingName ??
      useCoachMemoryStore.getState().intendedOpening?.name ??
      null;
    if (openingName) {
      try {
        const bookMoves = getOpeningMoves(openingName);
        if (bookMoves && ply < bookMoves.length) {
          const probe = new Chess(fen);
          if (probe.move(bookMoves[ply])) return bookMoves[ply];
        }
      } catch { /* fall through to engine */ }
    }
    // getAdaptiveMove / getRandomLegalMove return UCI ("e7e5"); handlePlayMove
    // matches by SAN, so convert before returning. (Audit 2026-06-04 caught
    // the engine reply silently failing off-book because UCI never matched a
    // SAN in handlePlayMove.)
    const uciToSan = (uci: string): string | null => {
      try {
        const c = new Chess(fen);
        const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
        return m?.san ?? null;
      } catch { return null; }
    };
    // 2) Out of book / deviation — difficulty-adjusted engine. Uses the SAME
    //    getTargetStrength(rating, difficulty) mapping /coach/play uses so the
    //    Easy/Medium/Hard pill actually changes the opponent's strength (it was
    //    ignored here — the coach always played at raw puzzleRating, David
    //    2026-06-21 "coach is not playing good moves at all").
    try {
      const rating = getTargetStrength(activeProfile?.puzzleRating ?? 1200, difficulty);
      const adaptive = await getAdaptiveMove(fen, rating);
      if (adaptive.move) {
        const san = uciToSan(adaptive.move);
        if (san) return san;
      }
    } catch { /* fall through */ }
    // 3) Never freeze.
    const random = getRandomLegalMove(fen);
    return random ? uciToSan(random) : null;
  }, [walkthrough.tree?.openingName, activeProfile?.puzzleRating, difficulty]);

  // "Read this position" — the SAME on-demand affordance Play carries
  // (David 2026-06-15: "You didn't like the read this position button?").
  // Reads the LIVE free-play position (not the walkthrough animation) so a
  // student stuck on a played-out move can hear the position explained.
  // Routes through usePositionNarration → voiceService.speakReadAloud
  // (bypassVerbosity, G5 third sanctioned exemption — an explicit tapped
  // read button). Declared before handleStudentMove so the move handler can
  // dismiss the banner on a board move (David: "make a move on the board to
  // close it out").
  const positionNarration = usePositionNarration({
    fen: game.fen,
    pgn: game.history.join(' '),
    moveNumber: Math.floor(game.history.length / 2) + 1,
    playerColor,
    openingName: walkthrough.tree?.openingName ?? null,
  });

  // Stream the "Read this position" narration into the CHAT as it arrives — the
  // banner is gone (David 2026-07-10: "read position and phase narration needs
  // to go in the chat section. No more special place for them."). One growing
  // assistant bubble per read; voice still plays live.
  const readStreamIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (positionNarration.isNarrating && positionNarration.currentText) {
      if (!readStreamIdRef.current) {
        const id = `read-${Date.now()}`;
        readStreamIdRef.current = id;
        setMessages((prev) => [...prev, { id, role: 'assistant', content: positionNarration.currentText, timestamp: Date.now() }]);
      } else {
        const id = readStreamIdRef.current;
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: positionNarration.currentText } : m)));
      }
    } else if (!positionNarration.isNarrating && readStreamIdRef.current) {
      readStreamIdRef.current = null; // read ended — the last content stays in chat
    }
  }, [positionNarration.isNarrating, positionNarration.currentText]);

  const handleStudentMove = useCallback((move: MoveResult): void => {
    // A board move DISMISSES the "Read this position" banner (clears its
    // text) — same as Play. The student answered the position by playing.
    positionNarration.cancel();
    // In-place drill: when a drill is running the board move is a SOLVE
    // attempt, validated against the puzzle's solution (code, not the
    // LLM). Consumes the move and skips the normal opening-reply flow.
    if (activeDrillRef.current) {
      if (processDrillMove(move)) return;
    }
    // Block a new move ONLY while the opponent is still computing its reply —
    // never while the coach is merely narrating the last move (that was the
    // 3+s lag David hit 2026-06-10). If the student moves while a prior
    // narration is still speaking, cut it immediately so the voice doesn't
    // drone over the new position.
    if (opponentThinkingRef.current) return;
    voiceService.stop();
    // Pre-move FEN (before we overwrite liveFenRef below) — the slip faucet
    // needs the position the student moved FROM.
    const fenBefore = liveFenRef.current;
    // An open "why did you play that?" is closed by playing on — the coach
    // lets it go and the slip is captured silently for review/drills (David
    // 2026-07-11: never a stale card over a live board).
    if (discussion.prompt) {
      discussion.dismissOnMove();
    }
    // An open THREAT-CHECK is answered by the move itself — the student chose
    // to act rather than tap a chip. Log it and clear; never block the move.
    if (threatCheckRef.current) {
      captureEvent('threat_check_result', { surface: 'coach-teach', outcome: 'moved-through', answer: threatCheckRef.current.answer });
      clearThreatCheck();
    }
    // GUIDED FIND-THE-MOVE answer attempt (P2 — David 2026-07-11: the coach
    // asks, the student answers ON THE BOARD). Found → confirm + the move
    // stands and play continues. Wrong → the move is taken back and the
    // student looks again (the doctrine's takeback-retry). Stale board
    // (reset/jump since the ask) → silently clear and treat as a normal move.
    const guidedChallenge = guidedFindRef.current;
    if (guidedChallenge) {
      const verdict = judgeGuidedFindAttempt(guidedChallenge, { san: move.san, from: move.from, to: move.to, fenBefore });
      if (verdict === 'stale') {
        clearGuidedFind();
      } else if (verdict === 'found') {
        sessionStatsRef.current.correct += 1;
        captureEvent('guided_find_result', { surface: 'coach-teach', outcome: 'found', attempts: guidedFindAttemptsRef.current + 1, answer: guidedChallenge.answerSan });
        setMessages((prev) => [...prev, { id: uid('guided-found'), role: 'assistant', content: guidedChallenge.confirm, timestamp: Date.now() }]);
        void voiceService.speakForced(guidedChallenge.confirm, { prosodySpike: true }).catch(() => undefined);
        clearGuidedFind();
        // fall through — the found move stands; the opponent replies normally.
      } else {
        guidedFindAttemptsRef.current += 1;
        captureEvent('guided_find_result', { surface: 'coach-teach', outcome: 'retry', attempts: guidedFindAttemptsRef.current, answer: guidedChallenge.answerSan });
        gameRef.current.undoMove();
        void voiceService.speakForced(guidedChallenge.retry).catch(() => undefined);
        return; // consumed — the board is back where it was; no opponent reply
      }
    }
    // Update liveFenRef SYNCHRONOUSLY with the post-move FEN that the
    // MoveResult already carries. This is what every brain trip's
    // getLiveFen will read, so trip 1 sees the post-student-move
    // position immediately — no waiting for React re-render.
    liveFenRef.current = move.fen;
    // Clear the PREVIOUS coach turn's arrows/highlights the instant the
    // student moves, so they "go away like they should" instead of lingering
    // on the board through the engine-reply + narration latency (David
    // 2026-06-04). The coach's narration repaints fresh arrows for its reply.
    setArrows([]);
    setHighlights([]);
    chainArrowsRef.current = [];
    chainHighlightsRef.current = [];
    // Silent faucet: a genuine eval-worsening slip during guided play feeds
    // the bucket so it resurfaces as a drill. No panel/voice — the brain is
    // already narrating this move.
    const openingName = walkthrough.tree?.openingName;
    void discussion.evaluatePlayerMove({
      fenBefore,
      fenAfter: move.fen,
      playedSan: move.san,
      playerColor,
      inBook: false,
      learned: !!openingName,
      gamePhase: classifyPhase(move.fen, (move.moveNumber ?? 1) * 2),
      moveNumber: move.moveNumber,
      openingName,
      studentRating: activeProfile?.puzzleRating ?? activeProfile?.currentRating ?? undefined,
    });
    // The ENGINE plays the coach's reply (in code), then the LLM is asked to
    // NARRATE that exact move — play_move is disabled on the narration call,
    // so the LLM can't pick or play. Words always match the board.
    setOpponentThinking(true);
    void (async () => {
      try {
        // Natural think-time. Book/engine replies resolve near-instantly, so the
        // opponent's move used to snap onto the board the moment the student let
        // go — it "messes with the natural timing of chess" (David 2026-06-04).
        // Pad the reply to a randomized 1-2s minimum, MEASURING the resolve time
        // so a genuinely slow engine call doesn't stack an extra wait on top.
        const thinkStart = Date.now();
        const reply = await resolveCoachReplyMove(move.fen);
        const minThink = 1000 + Math.floor(Math.random() * 1000); // 1000–2000ms
        const elapsed = Date.now() - thinkStart;
        if (elapsed < minThink) {
          await new Promise((resolve) => setTimeout(resolve, minThink - elapsed));
        }
        if (reply) {
          const played = handlePlayMove(reply);
          if (played.ok) {
            // GROUNDING COMPLETENESS (David 2026-06-15): compute what the
            // reply ACTUALLY did — captured piece + squares — from the BEFORE
            // position, so the LLM narrates the real move instead of inventing
            // the victim ("queen takes queen"). The SAN + after-FEN alone don't
            // carry the captured piece.
            let replyFact = '';
            try {
              const probe = new Chess(move.fen);
              const m = probe.move(reply);
              if (m) {
                const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
                const mover = NAME[m.piece] ?? 'piece';
                const facts: string[] = [];
                // 1. What it did — the victim is gone from the after-FEN, so this
                //    is the ONLY source of the captured piece.
                facts.push(m.captured
                  ? `CAPTURED the ${NAME[m.captured] ?? 'piece'} on ${m.to} (${mover} from ${m.from}).`
                  : `quiet ${mover} move ${m.from}->${m.to}, no capture.`);
                // 2. Check / mate / stalemate — straight from chess.js.
                if (probe.isCheckmate()) facts.push('This is CHECKMATE — the game is over.');
                else if (probe.isCheck()) facts.push('It gives CHECK.');
                else if (probe.isStalemate()) facts.push('This is STALEMATE — a draw.');
                // 3. Why it's strong — material/check judgment (no-LLM grounded "why").
                const coachColor: 'white' | 'black' = playerColor === 'white' ? 'black' : 'white';
                const why = explainBestMoveGrounded(move.fen, null, `${m.from}${m.to}${m.promotion ?? ''}`, coachColor);
                if (why) facts.push(`Why it's strong: ${why}.`);
                // 4. REAL tactics + loose pieces in the resulting position (student
                //    to move) — the true fork/pin/threat, so the coach narrates the
                //    ACTUAL tactic instead of inventing one (the validators were
                //    stripping invented "fork/discovery" all session).
                const rating = activeProfile?.puzzleRating ?? activeProfile?.currentRating ?? 1200;
                const studentCC: 'w' | 'b' = playerColor === 'white' ? 'w' : 'b';
                const tctx = buildTacticsLiveContext(probe.fen(), null, studentCC, rating);
                // Tactics facts are held back until the question decision
                // below — when a guided-find or threat-check question arms,
                // narrating the live tactics would hand over the very answer
                // the question withholds (honesty contract rule 1).
                const tacticsFacts: string[] = [];
                if (tctx.immediate.length > 0) tacticsFacts.push(`Real tactics on the board now: ${tctx.immediate.map((t) => t.description).join('; ')}.`);
                if (tctx.hanging.length > 0) tacticsFacts.push(`Undefended/attacked: ${tctx.hanging.map((h) => `${NAME[h.piece] ?? h.piece} on ${h.square}`).join(', ')}.`);
                let questionArmed = false;
                const historyAfterReply = [...move.history, m.san];
                // Rating-banded reality (#23): warm the amateur-band cache for
                // this opening position NOW — the engine analysis below gives
                // it ~1s to land, and opening positions repeat heavily across
                // games so the session cache compounds. Narration reads the
                // cache ONLY (the rate-limit contract).
                if (classifyPhase(probe.fen(), historyAfterReply.length) === 'opening') {
                  void warmAmateurPlay(probe.fen(), rating, 'coach-teach');
                }
                // ROAD CHOSEN — the student just answered an open fork by
                // playing. One computed affirming clause, then quiet (David:
                // "less waste more impact"). Any move closes the fork moment.
                const openFork = pendingForkRef.current;
                if (openFork) {
                  pendingForkRef.current = null;
                  const affirm = openFork.affirmBySan[move.san];
                  if (affirm) {
                    captureEvent('fork_talk_road_chosen', { surface: 'coach-teach', road: move.san });
                    facts.push(`ROAD CHOSEN: the student took the ${move.san} road at the fork. Affirm it in ONE short clause — "${affirm}" — then narrate normally. Do not re-open or mention the other road.`);
                  }
                }
                // The STUDENT'S recommended next move — COMPUTED in code, never the
                // LLM's pick (G0). The coach was telling the student to "develop the
                // knight to f3" with a knight ALREADY on f3, because the move it
                // recommended was invented from generic opening reflexes, not derived
                // from the board it was handed. Hand it the engine's move so it voices
                // a real one (or stays general when the engine is down). The read is
                // cached on a warm engine; the board already unlocked above, so this
                // only delays the async narration, never the student's next move.
                try {
                  const studentBest = await stockfishEngine.analyzeWithBudget(probe.fen(), 12, 1200);
                  const recUci = studentBest?.bestMove;
                  // GUIDED FIND-THE-MOVE (P2): student clearly winning + the
                  // engine's move is notable → ASK instead of telling. The
                  // narration is handed ONLY the square-free question — never
                  // the answer — so it cannot leak it (honesty by construction).
                  const studentPovEval = typeof studentBest?.evaluation === 'number'
                    ? (playerColor === 'white' ? studentBest.evaluation : -studentBest.evaluation)
                    : null;
                  const plyNow = (move.moveNumber ?? 1) * 2;
                  const mayAsk =
                    !guidedFindRef.current &&
                    !threatCheckRef.current &&
                    !activeDrillRef.current &&
                    plyNow - guidedFindLastAskPlyRef.current >= GUIDED_FIND_MIN_PLY_GAP &&
                    shouldOfferGuidedFind({ fen: probe.fen(), bestUci: recUci, evalCpStudentPov: studentPovEval });
                  const challenge = mayAsk && recUci ? buildGuidedFindChallenge(probe.fen(), recUci) : null;
                  // THREAT-CHECK (David 2026-07-11): when one of the STUDENT's
                  // pieces is genuinely hanging after the coach's reply, ask
                  // WHICH piece is in danger before they move — the
                  // check-what-changed discipline as a question. Guided-find
                  // takes priority (a winning shot usually answers the threat
                  // too); one question at a time, always.
                  const threatQ = !challenge &&
                    !threatCheckRef.current &&
                    !guidedFindRef.current &&
                    !activeDrillRef.current &&
                    plyNow - threatCheckLastAskPlyRef.current >= THREAT_CHECK_MIN_PLY_GAP
                    ? buildThreatCheckQuestion(probe.fen(), studentCC)
                    : null;
                  if (challenge) {
                    guidedFindRef.current = challenge;
                    guidedFindAttemptsRef.current = 0;
                    guidedFindLastAskPlyRef.current = plyNow;
                    setGuidedFind(challenge);
                    questionArmed = true;
                    sessionStatsRef.current.questions += 1;
                    captureEvent('guided_find_asked', { surface: 'coach-teach', answer: challenge.answerSan, eval_cp: studentPovEval });
                    facts.push(`Do NOT recommend, name, or hint at ANY move, threat, or tactic for the student in this reply. End your reply with exactly this question to the student, then stop: "${challenge.question}"`);
                  } else if (threatQ) {
                    threatCheckRef.current = threatQ;
                    threatCheckLastAskPlyRef.current = plyNow;
                    setThreatCheck(threatQ);
                    questionArmed = true;
                    sessionStatsRef.current.questions += 1;
                    captureEvent('threat_check_asked', { surface: 'coach-teach', answer: threatQ.answer });
                    facts.push(`Do NOT name any threat, attacked piece, undefended piece, or tactic in this reply. End your reply with exactly this question to the student, then stop: "${threatQ.question}"`);
                  } else {
                    // FORK IN THE ROAD — near-equal options with different
                    // characters get deliberated as two lives, not a readout.
                    // Fires INSTEAD of the plain best-move recommendation; the
                    // student answers by playing. Max 3 per game.
                    const forkLines = (studentBest?.topLines ?? [])
                      .slice(0, 3)
                      .filter((l) => typeof l.moves?.[0] === 'string' && typeof l.evaluation === 'number')
                      .map((l) => ({ uci: l.moves[0], evalCp: playerColor === 'white' ? l.evaluation : -l.evaluation }));
                    const fork = forkTalkCountRef.current < FORK_TALK_MAX_PER_GAME && forkLines.length >= 2
                      ? buildForkTalk({ fen: probe.fen(), historySans: historyAfterReply, options: forkLines })
                      : null;
                    if (fork) {
                      forkTalkCountRef.current += 1;
                      pendingForkRef.current = fork;
                      captureEvent('fork_talk_offered', { surface: 'coach-teach', roads: fork.options.map((o) => o.san).join('|'), count: forkTalkCountRef.current });
                      facts.push(fork.facts);
                      // Both roads on the board as the words land (green /
                      // blue), surviving the narration's own arrow pass.
                      chainArrowsRef.current = [...chainArrowsRef.current, ...fork.arrows];
                      setArrows((prev) => uniqueArrows([...prev, ...fork.arrows]));
                    } else {
                      // THINK ALOUD (#20, David 2026-07-11 "the user should be
                      // playing"): at a genuine decision moment in the
                      // MIDDLEGAME (one move clearly best — the fork covers
                      // near-equal), the coach deliberates what the position
                      // wants WITHOUT naming the move (the fact block is
                      // built without the best-move SAN — it cannot leak).
                      // The fork and the questions own their moments; the
                      // plain recommendation is the fallback.
                      let thinkMoment = null;
                      const thinkEligible =
                        plyNow - thinkAloudLastPlyRef.current >= THINK_ALOUD_MIN_PLY_GAP &&
                        classifyPhase(probe.fen(), historyAfterReply.length) === 'middlegame';
                      if (thinkEligible) {
                        try {
                          const thinkLines = (studentBest?.topLines ?? [])
                            .slice(0, 2)
                            .filter((l) => typeof l.moves?.[0] === 'string' && typeof l.evaluation === 'number')
                            .map((l) => {
                              const lp = new Chess(probe.fen());
                              const first = lp.move({ from: l.moves[0].slice(0, 2), to: l.moves[0].slice(2, 4), promotion: l.moves[0].slice(4, 5) || undefined });
                              let replySan: string | undefined;
                              if (first && typeof l.moves[1] === 'string') {
                                const second = lp.move({ from: l.moves[1].slice(0, 2), to: l.moves[1].slice(2, 4), promotion: l.moves[1].slice(4, 5) || undefined });
                                replySan = second?.san;
                              }
                              return first ? { san: first.san, evalCp: playerColor === 'white' ? l.evaluation : -l.evaluation, replySan } : null;
                            })
                            .filter((l): l is NonNullable<typeof l> => l !== null);
                          thinkMoment = buildThinkAloud({
                            fen: probe.fen(),
                            historySans: historyAfterReply,
                            studentColor: playerColor,
                            lines: thinkLines,
                          });
                        } catch { /* deliberation is a bonus, never a blocker */ }
                      }
                      if (thinkMoment) {
                        thinkAloudLastPlyRef.current = plyNow;
                        captureEvent('think_aloud_offered', { surface: 'coach-teach', withheld: thinkMoment.withheldSan });
                        facts.push(thinkMoment.facts);
                      } else if (recUci && recUci.length >= 4) {
                        const recProbe = new Chess(probe.fen());
                        const recMove = recProbe.move({ from: recUci.slice(0, 2), to: recUci.slice(2, 4), promotion: recUci.slice(4, 5) || undefined });
                        if (recMove) {
                          facts.push(`The student's strongest reply in THIS position is ${recMove.san} (engine). If you point them toward a move, name ONLY ${recMove.san} — never suggest any other move, and never tell them to move a piece to a square it already occupies.`);
                        }
                      }
                    }
                  }
                } catch { /* engine down → no move named; the prompt keeps the prompt-for-next-move general */ }
                // Tactics facts reach the narration ONLY when no question is
                // open — otherwise they leak the answer.
                if (!questionArmed) facts.push(...tacticsFacts);
                // OPENING FACT-CHAIN (David 2026-07-11: "the purpose of each
                // move and what traps might form") — during the opening, hand
                // the narration where the moves LEAD (named DB continuations)
                // + any engine-verified trap/gem forming on this exact path.
                // Suppressed while a question is open (nothing extra leaks),
                // and each lurking line is announced once per game.
                if (!questionArmed) {
                  try {
                    const chainHistory = historyAfterReply;
                    if (chainHistory.length <= 2) {
                      announcedTrapsRef.current.clear(); // fresh game
                      forkTalkCountRef.current = 0;
                      pendingForkRef.current = null;
                    }
                    if (classifyPhase(probe.fen(), chainHistory.length) === 'opening') {
                      const chain = buildOpeningChainFacts({
                        historySans: chainHistory,
                        studentColor: playerColor,
                        announcedTraps: announcedTrapsRef.current,
                      });
                      for (const n of chain.trapNames) announcedTrapsRef.current.add(n);
                      // Rating-banded reality (#23) — CACHE-ONLY reads: when
                      // both the amateur band and the masters data are warm
                      // for THIS position, the split becomes a fact ("at your
                      // level X is most common; masters prefer Y"). Cold
                      // caches → no fact (empty > generic).
                      try {
                        const masters = masterPlayCache.get(probe.fen());
                        const mTop = masters && masters.totalGames > 0 ? masters.moves[0] : null;
                        const banded = buildRatingRealityFact(probe.fen(), mTop && masters ? {
                          san: mTop.san,
                          pct: Math.round((mTop.games / masters.totalGames) * 100),
                          totalGames: masters.totalGames,
                        } : null);
                        if (banded) facts.push(banded);
                      } catch { /* the split is a bonus */ }
                      facts.push(...chain.facts);
                      // Lead the eye NOW — the arrows land with the words
                      // (green = named continuation, amber/red = lurking
                      // slip; yellow key squares). All chess.js-derived from
                      // moves legal on this exact board.
                      if (chain.arrows.length > 0) {
                        chainArrowsRef.current = chain.arrows;
                        chainHighlightsRef.current = chain.highlights;
                        setArrows((prev) => uniqueArrows([...prev, ...chain.arrows]));
                        setHighlights((prev) => [...prev, ...chain.highlights]);
                      }
                    }
                  } catch { /* the chain is a bonus, never a blocker */ }
                }
                // TEACHING NOTE at this exact position (David 2026-07-12:
                // "what he teaches in every position… his explanation… and
                // the future plans"). Curated corpus, code-selected by move
                // prefix; suppressed while a question is open (leak guard).
                if (!questionArmed) {
                  try {
                    const note = noteAtPosition(historyAfterReply, probe.fen());
                    if (note) {
                      facts.push(`Coaching note for THIS position: ${note.explains} ${note.teaches}${note.plans ? ` Plan: ${note.plans}` : ''}`);
                    }
                  } catch { /* corpus is a bonus, never a blocker */ }
                }
                replyFact = `GROUNDED FACTS (voice ONLY these — never invent a capture, check, tactic, or threat not listed here): ${facts.join(' ')}`;
              }
            } catch {
              /* probe is best-effort; absence just means no extra fact */
            }
            // Opponent's move is on the board — UNLOCK immediately so the
            // student can play again right away; the narration below runs
            // unblocked and is cut by voiceService.stop() if they do move.
            setOpponentThinking(false);
            void handleSubmit(`I played ${move.san}.`, {
              fenOverride: liveFenRef.current,
              coachReplyPlayed: reply,
              coachReplyFact: replyFact,
            });
            return;
          }
        }
        // No legal coach reply (game over) — narrate the student's move only,
        // still with play_move disabled (the LLM never moves).
        setOpponentThinking(false);
        void handleSubmit(`I played ${move.san}. Your move.`, {
          fenOverride: move.fen,
          coachReplyPlayed: '',
        });
      } finally {
        // Safety net: never leave the board stuck locked if anything threw.
        setOpponentThinking(false);
      }
    })();
  }, [handleSubmit, discussion, walkthrough.tree?.openingName, playerColor, resolveCoachReplyMove, handlePlayMove, setOpponentThinking, activeProfile?.puzzleRating, activeProfile?.currentRating, positionNarration, clearGuidedFind, clearThreatCheck]);

  // ─── Guided-opening-play kickoff ─────────────────────────────────────────
  // On mount, pull the student's last 5 games + weakness profile so the
  // brain has private context (which openings they've been playing,
  // their rating). The kickoff itself is a short greeting + "your move"
  // prompt — the lesson IS the game from the starting position. The
  // coach plays Black; the student plays White and moves first.
  // Snap to top when a new message lands or while the reply is
  // streaming in. Reverse-flow puts newest at the top so scrollTop=0
  // is always the active turn.
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [messages.length, streaming]);

  const kickoffFiredRef = useRef(false);
  useEffect(() => {
    if (kickoffFiredRef.current) return;
    if (!activeProfile) return;
    kickoffFiredRef.current = true;
    (() => {
      // Non-built-opening hand-off (David 2026-07-16). The student tapped an
      // opening on the openings page that has NO hand-built masterclass (a raw
      // Lichess ECO name), so OpeningDetailPage routed here with
      // `?teach=<name>&auto=1`. Tell them we don't have a masterclass for it
      // and AUTO-LAUNCH the walkthrough — no second ask. The walkthrough moves
      // come from the DB (`generateOpeningFromDbNarration`); the LLM writes
      // only the prose (G3). This is distinct from the `?opening=` rolodex
      // path below, which is an opt-in "Ready to start?" prompt.
      const autoTeach =
        searchParams.get('auto') === '1' ? searchParams.get('teach')?.trim() : null;
      if (autoTeach) {
        // Demand signal (David 2026-07-16): count every time the coach teaches
        // an opening we haven't hand-built, so a PostHog group-by on the name
        // ranks which openings most need a masterclass. Fires once (kickoff is
        // ref-guarded). `entry` distinguishes an opening-page tap from the
        // empty-search CTA (no eco/oid there).
        void logAppAudit({
          kind: 'unbuilt-opening-lesson',
          category: 'app',
          source: 'CoachTeachPage.autoTeachKickoff',
          summary: autoTeach,
          context: JSON.stringify({
            eco: searchParams.get('eco') ?? null,
            oid: searchParams.get('oid') ?? null,
            entry: searchParams.get('oid') ? 'opening-detail' : 'search-cta',
          }),
        });
        const intro = `We don't have a hand-built masterclass for the ${autoTeach} yet — so I'll teach it to you myself. Let's walk through it.`;
        const turnId = freshTurnId('autoteach');
        setKickoffStatus(null);
        setMessages((prev) => [...prev, {
          id: `${turnId}-c`,
          role: 'assistant',
          content: intro,
          timestamp: Date.now(),
        }]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach',
          role: 'coach',
          text: intro,
          fen: gameRef.current.fen,
          trigger: null,
        });
        voiceService.stop();
        speechChainRef.current = Promise.resolve(voiceService.speakForced(intro))
          .catch(() => undefined);
        // Launch the lesson. When we came from the openings page we have the
        // exact opening id, so load its record (getOpeningById is UNFILTERED)
        // and build the walkthrough straight from its PGN via generateOpening's
        // entryOverride — bypassing the name-resolution filters that hide
        // terminal-short lines (short namesakes like the Scandi Panov), which
        // otherwise make the coach unable to teach them at all (option B, David
        // 2026-07-16). G3-safe: the moves are the DB record's, not the LLM's.
        // No id (the search-CTA path) → fall back to name-based resolution.
        const teachOid = searchParams.get('oid');
        if (teachOid) {
          void (async (): Promise<void> => {
            try {
              const rec = await getOpeningById(teachOid);
              const moves = rec?.pgn?.trim().split(/\s+/).filter(Boolean) ?? [];
              if (rec && moves.length > 0) {
                setGenerationStatus({ openingName: rec.name, startedAt: Date.now() });
                const result = await generateOpening(rec.name, {
                  mode: 'learn',
                  entryOverride: { canonicalName: rec.name, eco: rec.eco, moves },
                });
                setGenerationStatus(null);
                if (result.ok && result.tree) {
                  await cacheOpening(rec.name, result.tree);
                  voiceService.stop();
                  walkthrough.start(result.tree);
                  return;
                }
              }
            } catch {
              setGenerationStatus(null);
            }
            // Record missing / generation failed → best-effort name resolution.
            void handleSubmit(autoTeach);
          })();
        } else {
          void handleSubmit(autoTeach);
        }
        return;
      }

      // 5-game Stockfish kickoff analysis REMOVED (David 2026-06-15):
      // entering Learn with Coach must NOT block on analyzing the
      // student's recent games — it stalled the lesson behind a
      // "Pulling your last 5 games… / Analyzing game X of Y" bar.
      // Recent-game context still reaches the brain organically through
      // coach memory on the first round-trip; the unanalyzed backlog is
      // processed when the user visits Game Insights. The lesson now
      // starts instantly with the canned welcome line below.

      // Hard-coded welcome line. Skipping the LLM here means:
      //   (a) the student always hears the SAME greeting (canon),
      //   (b) no token spend on a deterministic line,
      //   (c) the brain doesn't get a chance to ramble before the
      //       student's first input — they speak first now.
      // The greeting is appended to the transcript, voiced through
      // the same Polly pipeline as any other coach turn, and seeded
      // into conversation memory so the brain knows the greeting
      // already happened on the next round-trip.
      // Rolodex-aware welcome line (WO-ROLODEX-PLUMBING-01 item 3).
      // When the student arrived via `?opening=<name>` (rolodex deep
      // link), greet them with the named opening pre-selected and
      // invite them to start the walkthrough. Otherwise keep the
      // legacy open-ended classroom greeting.
      //
      // Per WO spec: do NOT auto-launch the walkthrough. The student
      // confirms by typing "yes" / "start" / tapping a Start button.
      const rolodexOpening = searchParams.get('opening');
      // Don't dump a greeting onto an active conversation. This kickoff is
      // gated on `activeProfile`, which can resolve AFTER the student has
      // already started typing — in which case the greeting + weakness
      // session-opener would append at the bottom as a non-sequitur (David
      // 2026-07-18: "recurring mistakes in vienna game" landed under a
      // KIA-vs-Dragon exchange). If the student has interacted, skip it.
      if (userInteractedRef.current) return;
      // Rotate the greeting + suggested-question chips per visit (David
      // 2026-07-04: "instead of always saying welcome to my classroom … it
      // should rotate through and give some pickers to choose"). Minute-
      // granularity index → a returning student rarely hears the same line
      // twice; the chips are grounded verticals the coach answers from
      // computed data, and tapping one SENDS it (opt-in discovery, never auto).
      const greetingRotation = Math.floor(Date.now() / 60000);
      const welcomeLine = rolodexOpening
        ? `Ready to start the ${rolodexOpening.trim()} walkthrough?`
        : pickGreeting(greetingRotation);
      setKickoffStatus(null);
      const turnId = freshTurnId('welcome');
      setMessages((prev) => [...prev, {
        id: `${turnId}-c`,
        role: 'assistant',
        content: welcomeLine,
        timestamp: Date.now(),
      }]);
      // On the open-ended (non-rolodex) entry, surface the suggested-question
      // pickers so the student sees what they can ask. When we already have a
      // computed weakness profile, lead with a data-driven nudge naming the
      // student's top weakness (David 2026-07-04: "the app should identify
      // something of weakness and suggest a study session") — still opt-in (a
      // chip they tap), still grounded (routes to a computed vertical). Cheap
      // stored read; null-guarded so a fresh profile just shows the generic set.
      if (!rolodexOpening) {
        const generic = pickSuggestedQuestions(greetingRotation, 4);
        // Show the generic set immediately, then asynchronously upgrade to a
        // nudge-led set if a stored weakness profile is available (non-blocking
        // — the kickoff IIFE is synchronous). Null-guarded end to end.
        setCoachChoices(generic);
        void getStoredWeaknessProfile()
          .then((profile) => {
            const top = (profile?.items ?? []).slice().sort((a, b) => b.severity - a.severity)[0];
            const nudge = top ? weaknessNudgeFromItem(top.category, top.label) : null;
            if (nudge) {
              setCoachChoices([nudge, ...generic.filter((q) => q !== nudge)].slice(0, 4));
            }
            // SESSION OPENER (David 2026-07-11 bookends): a coach names the
            // day's focus before the first move — computed from the stored
            // weakness profile, spoken AFTER the greeting resolves (the
            // speech chain serializes; never talks over the welcome line).
            // The profile read is async — the student may have started a
            // conversation while it resolved. Don't append the opener onto
            // an active transcript (the non-sequitur David caught).
            if (top && !userInteractedRef.current) {
              // Use the label VERBATIM (a colon, not a lowercased em-dash
              // splice): the label is a proper noun phrase — "Recurring
              // mistakes in the Vienna Game" — and `.toLowerCase()` mangled
              // it into "recurring mistakes in vienna game" (David 2026-07-18).
              const planLine = `One thing to keep in the back of your mind today: ${top.label}. That's the pattern that's been costing you the most, and I'll be watching for it.`;
              setMessages((prev) => [...prev, { id: uid('session-opener'), role: 'assistant', content: planLine, timestamp: Date.now() }]);
              speechChainRef.current = speechChainRef.current
                .then(() => voiceService.speakForced(planLine))
                .catch(() => undefined);
            }
          })
          .catch(() => { /* stored-profile read failed — generic chips stand */ });
      }
      useCoachMemoryStore.getState().appendConversationMessage({
        surface: 'chat-teach',
        role: 'coach',
        text: welcomeLine,
        fen: gameRef.current.fen,
        trigger: null,
      });
      voiceService.stop();
      speechChainRef.current = Promise.resolve(voiceService.speakForced(welcomeLine))
        .catch(() => undefined);
    })();

  // searchParams is read once in the kickoff to pick the welcome
  // line; we deliberately do NOT re-fire on later searchParams
  // changes (kickoffFiredRef guards against that anyway).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  // Layout mirrors CoachGamePage (Play with Coach) — same outer column
  // structure, same header bar shape (back + title + reset), same
  // PlayerInfoBar, same chess board container, same ChatMessage /
  // ChatInput chat primitives. Only the coaching actions differ:
  // there's no engine-driven move clock here — every coach message
  // comes from the LLM via the teach-mode prompt.

  // Game-over → game review (David 2026-06-15: "make learn trigger a game
  // review"). When a REAL played game in Learn ends (checkmate / stalemate /
  // etc.) — and NOT during a walkthrough lesson — save a minimal record and
  // route to /coach/review/<id>, which analyzes it post-hoc via Stockfish
  // (now that the engine works on iOS). Fixes the stuck-at-checkmate gap: the
  // board never declared mate and never advanced to review. Ref-guarded so it
  // fires exactly once per finished game.
  const teachGameOverHandledRef = useRef(false);
  useEffect(() => {
    if (!game.isGameOver) { teachGameOverHandledRef.current = false; return; }
    if (walkthrough.isActive || teachGameOverHandledRef.current || game.history.length < 4) return;
    teachGameOverHandledRef.current = true;
    const studentLoss = game.isCheckmate &&
      ((game.turn === 'w' && playerColor === 'white') ||
       (game.turn === 'b' && playerColor === 'black'));
    const won = game.isCheckmate && !studentLoss;
    const playerName = activeProfile?.name ?? 'Player';
    const rating = activeProfile?.currentRating ?? activeProfile?.puzzleRating ?? 1200;
    const gameId = `teach-${Date.now()}`;
    const pgn = game.history.join(' ');
    const openingId = walkthrough.tree?.openingName ?? null;
    void (async () => {
      try {
        const { db } = await import('../../db/schema');
        await db.games.add({
          id: gameId,
          pgn,
          white: playerColor === 'white' ? playerName : 'Coach',
          black: playerColor === 'black' ? playerName : 'Coach',
          result: playerColor === 'white'
            ? (won ? '1-0' : game.isCheckmate ? '0-1' : '1/2-1/2')
            : (won ? '0-1' : game.isCheckmate ? '1-0' : '1/2-1/2'),
          date: new Date().toISOString().split('T')[0],
          event: 'Learn with Coach',
          eco: null,
          whiteElo: playerColor === 'white' ? rating : null,
          blackElo: playerColor === 'black' ? rating : null,
          source: 'coach',
          annotations: null,
          coachAnalysis: null,
          isMasterGame: false,
          openingId,
        });
      } catch {
        /* save is best-effort; still route to review */
      }
      void navigate(`/coach/review/${gameId}`);
    })();
  }, [game.isGameOver, game.isCheckmate, game.turn, walkthrough.isActive, playerColor, game.history, activeProfile, navigate, walkthrough.tree?.openingName]);
  // Keep the latest board-move handler reachable from handleSubmit's typed
  // move-report branch (declared earlier in the file — ref avoids the TDZ).
  handleStudentMoveRef.current = handleStudentMove;

  // Captured-pieces tray (David 2026-06-15: "make Learn identical to Play —
  // it also shows which pieces have been captured"). Computed from the board's
  // CURRENTLY DISPLAYED fen (walkthrough drill > trap > path fen when a lesson
  // is animating; otherwise the live game). Mirrors Play's exact left/right
  // assignment so the trays read identically.
  const teachBoardFen = walkthrough.isActive
    ? (walkthrough.drillFen || walkthrough.trapFen || walkthrough.fen || game.fen)
    : game.fen;
  const teachCaptured = getCapturedPieces(teachBoardFen);
  const teachMaterialAdv = getMaterialAdvantage(teachBoardFen);
  const isTeachPlayerWhite = playerColor === 'white';

  const handleReadPosition = useCallback(() => {
    void positionNarration.narrate();
  }, [positionNarration]);

  // Hint: ask Stockfish for the best move at the live position and draw a
  // lead-the-eye arrow to it (yellow, from-square highlighted). Grounded in
  // the engine — the LLM invents nothing (G0/G3). Cleared on the next move
  // like every other board marker.
  const handleHint = useCallback(async () => {
    if (hintBusy) return;
    const fen = liveFenRef.current;
    setHintBusy(true);
    try {
      const analysis = await stockfishEngine.analyzePosition(fen, 15);
      const uci = analysis?.bestMove ?? '';
      if (uci.length >= 4) {
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        setArrows([{ startSquare: from, endSquare: to, color: '#eab308' }]);
        setHighlights([{ square: from, color: '#eab308' }]);
      }
    } catch {
      /* engine unavailable — no hint rather than a guess */
    } finally {
      setHintBusy(false);
    }
  }, [hintBusy]);

  // NARRATED CONTINUATION (David 2026-07-18): after a lesson, the coach can
  // play out both sides with Stockfish from where the opening ended and
  // narrate the middlegame + endgame to a conclusion. Grounded (G0): moves
  // are the engine's, narration is COMPUTED from the board
  // (narratedContinuation helpers) — the LLM decides nothing. A local Chess
  // mirror owns the logic; `gameRef.current.makeMove` drives the visible
  // board. Cancellable — any new user turn (or End) flips the guard.
  const startNarratedContinuation = useCallback(async function startNarratedContinuation(): Promise<void> {
    if (continuationRef.current) return;
    continuationRef.current = true;
    try {
      // The leaf position lives on the walkthrough (the board renders
      // walkthrough.fen while it's active); game.fen is still the start. So
      // capture it BEFORE stopping, then seed `game` with it so both the
      // visible board and the continuation begin from where the lesson ended.
      const startFen = walkthrough.fen || gameRef.current.fen;
      walkthrough.stop(); // release the board from the walkthrough state machine
      gameRef.current.loadFen(startFen);
      const intro = "Let's watch it play out. I'll take both sides and call out the turning points.";
      setMessages((prev) => [...prev, { id: uid('cont-intro'), role: 'assistant', content: intro, timestamp: Date.now() }]);
      speechChainRef.current = speechChainRef.current.then(() => voiceService.speakForced(intro)).catch(() => undefined);
      void logAppAudit({
        kind: 'coach-surface-migrated', category: 'subsystem',
        source: 'CoachTeachPage.narratedContinuation',
        summary: `started narrated continuation from ${startFen}`,
      });

      const local = new Chess(startFen);
      // Ply count from the FEN's fullmove clock (game.history is the free
      // board's, not the walkthrough's).
      const parts = startFen.split(' ');
      const fullmove = Number.parseInt(parts[5] ?? '1', 10) || 1;
      let ply = (fullmove - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
      let state = initialContinuationState(local.fen(), ply);
      const MAX_PLIES = 80;

      for (let i = 0; i < MAX_PLIES; i += 1) {
        if (!continuationRef.current) return; // cancelled
        if (local.isGameOver()) break;
        const uci = await stockfishEngine.getBestMove(local.fen(), 400).catch(() => '');
        if (!continuationRef.current) return;
        if (!uci || uci.length < 4) break;
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci.slice(4) : undefined;
        let landed;
        try {
          landed = local.move({ from, to, promotion });
        } catch {
          landed = null;
        }
        if (!landed) break;
        // Drive the visible board with the same move.
        gameRef.current.makeMove(from, to, promotion);
        ply += 1;
        const { text, state: next } = continuationNarration(local.fen(), ply, state);
        state = next;
        if (text) {
          setMessages((prev) => [...prev, { id: uid('cont-move'), role: 'assistant', content: text, timestamp: Date.now() }]);
          speechChainRef.current = speechChainRef.current.then(() => voiceService.speakForced(text)).catch(() => undefined);
        }
        // Pace it so the student can watch — a bit longer when we narrated.
        await new Promise((r) => setTimeout(r, text ? 1500 : 750));
      }

      if (!continuationRef.current) return;
      const resultLine = continuationResult(local.isCheckmate(), local.isDraw(), local.turn());
      setMessages((prev) => [...prev, { id: uid('cont-result'), role: 'assistant', content: resultLine, timestamp: Date.now() }]);
      speechChainRef.current = speechChainRef.current.then(() => voiceService.speakForced(resultLine)).catch(() => undefined);
    } finally {
      continuationRef.current = false;
    }
  }, [walkthrough]);
  // Bind the late ref so handleSubmit (defined earlier) can trigger it.
  startContinuationRef.current = startNarratedContinuation;

  // Shared tap handler for coach answer chips — both the inline
  // `message.choices` picker (ChatMessage) and the input-bar picker
  // (ChatInput) route through this: clear any transient input-bar picker,
  // then submit the chosen text through the normal resolution pipeline.
  const pickCoachChoice = useCallback((choice: string): void => {
    void logAppAudit({
      kind: 'chip-tap-resolved',
      category: 'subsystem',
      source: 'CoachTeachPage.coachChoiceChip',
      summary: `chip tap: "${choice.slice(0, 60)}" → routed through handleSubmit`,
      details: JSON.stringify({
        chipText: choice,
        source: 'coach-choice-chip',
        contextFen: gameRef.current.fen,
        walkthroughOpening: walkthrough.tree?.openingName ?? null,
      }),
      fen: gameRef.current.fen,
    });
    setCoachChoices(null);
    void handleSubmit(choice);
  }, [handleSubmit, walkthrough.tree]);

  return (
    <div
      className="relative flex flex-col md:flex-row h-full overflow-x-hidden overflow-y-auto md:overflow-hidden pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
      data-testid="coach-teach-page"
    >
      {/* In-page middlegame plan (David 2026-05-29). When the student
          asks for an opening's middlegame plans we play them HERE, on
          this board — not via a route hand-off. Full-bleed overlay so
          it owns the screen while the plan runs; "Lesson" returns. */}
      {middlegameSession && (
        <MiddlegamePlanInline
          session={middlegameSession}
          onExit={() => setMiddlegameSession(null)}
          onPlayOut={handlePlayOutPlan}
        />
      )}
      {/* In-page model game (David 2026-06-11): "show me a game that
          magnus played the catalan" walks the player's REAL game here.
          Same generic voice-gated session player; no onPlayOut (a model
          game isn't a plan to "play out"). "Lesson" returns. */}
      {modelGameSession && (
        <MiddlegamePlanInline
          session={modelGameSession}
          onExit={() => setModelGameSession(null)}
        />
      )}
      {/* In-page play-out (David 2026-05-29): after a plan, the student
          can play the position out against the coach from its starting
          position WITHOUT leaving this tab. OpeningPlayMode owns its own
          board + adaptive Stockfish; "Back" returns to the lesson. */}
      {playOutSession && (
        <div className="absolute inset-0 z-40 bg-theme-bg overflow-y-auto" data-testid="coach-teach-playout">
          <OpeningPlayMode
            opening={syntheticOpeningFromSession(playOutSession)}
            startFen={playOutSession.startFen}
            onExit={() => setPlayOutSession(null)}
          />
        </div>
      )}
      {/* Leaf "Play this line out yourself" — LOCKED to the taught line
          via customLine; plays it move-for-move then adaptive Stockfish
          in the middlegame. Kept in-page (no generic /coach/play). */}
      {leafPlayOut && (
        <div className="absolute inset-0 z-40 bg-theme-bg overflow-y-auto" data-testid="coach-teach-leaf-playout">
          <OpeningPlayMode
            opening={leafPlayOut.opening}
            customLine={leafPlayOut.customLine}
            onExit={() => setLeafPlayOut(null)}
          />
        </div>
      )}
      {/* Plan picker — shown when the opening carries more than one
          authored plan (the Pirc has 8). Tap a chip to start that
          variation's plan in-page. */}
      {middlegamePlanChoices && !middlegameSession && (
        <div
          className="absolute inset-0 z-30 flex flex-col justify-end bg-black/40"
          data-testid="middlegame-plan-picker"
          onClick={() => setMiddlegamePlanChoices(null)}
        >
          <div
            className="bg-theme-bg border-t border-theme-border rounded-t-2xl p-4 max-h-[70%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-theme-text">
                Pick a middlegame plan
              </h3>
              <button
                onClick={() => setMiddlegamePlanChoices(null)}
                className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Dismiss plan picker"
              >
                <X size={18} className="text-theme-text" />
              </button>
            </div>
            <div className="flex flex-col gap-2 max-w-lg mx-auto w-full">
              {middlegamePlanChoices.plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => startMiddlegamePlan(plan, middlegamePlanChoices.side)}
                  className="text-left p-3 rounded-xl border-2 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20"
                  data-testid={`middlegame-plan-choice-${plan.id}`}
                >
                  <div className="text-sm font-semibold text-theme-text">
                    {plan.title}
                  </div>
                  {plan.overview && (
                    <div className="text-xs text-theme-text-muted mt-0.5 line-clamp-2">
                      {plan.overview}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Left column: header + board. flex-none on mobile so this
          column is exactly board+header tall — without it the column
          grabbed flex-1 (half the screen) and left a big empty gap
          below the board, pushing the chat input down as the right
          column's content grew. With flex-none, board+header sit
          flush at the top and the right column takes ALL remaining
          space, planting the chat input directly under the board. */}
      <div className="flex flex-col flex-none md:w-3/5 min-h-0">
        {/* Header — mirrors CoachGamePage's two-row pattern. Row 1:
            back + title + color selector + analysis toggles. Row 2:
            difficulty + coach tips. Same chrome as /coach/play. */}
        <div className="px-3 py-2 md:p-4 border-b border-theme-border space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => void navigate('/coach/home')}
                className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Back to coach hub"
              >
                <ArrowLeft size={20} className="text-theme-text" />
              </button>
              <div>
                <h2 className="text-sm font-semibold text-theme-text">
                  Learn with Coach
                </h2>
                <p className="text-xs text-theme-text-muted">
                  Lessons + analysis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              {/* Color selector — matches Play. Disabled once a move
                  has been played in this session. */}
              <div className="flex items-center gap-0.5 rounded-lg border border-theme-border p-0.5" data-testid="color-selector">
                <button
                  onClick={() => { setPlayerColor('white'); game.setOrientation('white'); }}
                  disabled={game.history.length > 0}
                  className={`w-6 h-6 md:w-7 md:h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 ${
                    playerColor === 'white' ? 'ring-2 ring-theme-accent ring-inset' : ''
                  }`}
                  aria-label="Play as white"
                  data-testid="color-white-btn"
                >
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-white border border-neutral-300" />
                </button>
                <button
                  onClick={() => {
                    setPlayerColor('black');
                    game.setOrientation('black');
                    // The student took Black on a fresh board — the coach has
                    // White and MUST open, or the game just sits there (David
                    // 2026-07-12: he flipped to Black for the Benko and had to
                    // push the coach's d4 himself). Book/engine pick the move
                    // (or a dictated pending move); a deterministic ack speaks.
                    if (gameRef.current.history.length === 0 && liveFenRef.current.split(' ')[1] === 'w') {
                      void (async () => {
                        const opening = await resolveCoachReplyMove(liveFenRef.current);
                        if (
                          opening &&
                          gameRef.current.history.length === 0 &&
                          liveFenRef.current.split(' ')[1] === 'w' &&
                          playDictatedMove(opening)
                        ) {
                          captureEvent('coach_move_command', { surface: 'coach-teach', mode: 'auto-open-black', san: opening });
                          const ack = `I'll open with ${sanToSpeech(opening)}. Your move.`;
                          setMessages((prev) => [...prev, { id: freshTurnId('coach-open'), role: 'assistant', content: ack, timestamp: Date.now() }]);
                          voiceService.stop();
                          void voiceService.speakForced(ack).catch(() => undefined);
                        }
                      })();
                    }
                  }}
                  disabled={game.history.length > 0}
                  className={`w-6 h-6 md:w-7 md:h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 ${
                    playerColor === 'black' ? 'ring-2 ring-theme-accent ring-inset' : ''
                  }`}
                  aria-label="Play as black"
                  data-testid="color-black-btn"
                >
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-neutral-800 border border-neutral-600" />
                </button>
              </div>
              <AnalysisToggles
                showEvalBar={showEvalBarEffective}
                onToggleEvalBar={() => setEvalBarOverride((prev) => !(prev ?? settings.showEvalBar))}
                showEngineLines={showEngineLinesEffective}
                onToggleEngineLines={() => setEngineLinesOverride((prev) => !(prev ?? settings.showEngineLines))}
              />
            </div>
          </div>
          {/* Row 2: Difficulty toggle + Chat + Tips buttons — same widgets
              Play has. Difficulty is cosmetic in teach (LLM teaches
              regardless), but kept for visual parity. The Chat
              button is a permanent fixture per user request — it
              opens the global coach drawer for ad-hoc questions
              without taking the student out of the walkthrough. */}
          <div className="flex items-center justify-between pl-12 md:pl-14">
            <DifficultyToggle
              value={difficulty}
              onChange={setDifficulty}
              disabled={game.history.length > 0}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={togglePace}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: pace === 'tour' ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: pace === 'tour' ? 'var(--color-bg)' : 'var(--color-text-muted)',
                  borderTop: pace === 'tour' ? '1px solid rgba(201, 168, 76, 0.3)' : '1px solid var(--color-border)',
                  borderRight: pace === 'tour' ? '1px solid rgba(201, 168, 76, 0.3)' : '1px solid var(--color-border)',
                  borderLeft: pace === 'tour' ? '2px solid rgba(201, 168, 76, 0.8)' : '2px solid var(--color-border)',
                  borderBottom: pace === 'tour' ? '2px solid rgba(201, 168, 76, 0.8)' : '2px solid var(--color-border)',
                }}
                aria-label={pace === 'tour' ? 'Switch to full lesson' : 'Switch to quick tour'}
                aria-pressed={pace === 'tour'}
                data-testid="teach-pace-toggle"
              >
                <Zap size={16} />
                <span className="hidden sm:inline">{pace === 'tour' ? 'Tour' : 'Full'}</span>
              </button>
              <button
                onClick={() => {
                  // At md+ the chat panel is ALREADY inline (right column) —
                  // opening the floating GlobalCoachDrawer there duplicated the
                  // chat AND its fixed bottom-right card sat on top of the
                  // teach-picker tiles, swallowing their clicks (found driving
                  // the surface, David-approved fix 2026-07-28). Desktop: focus
                  // the inline input. Mobile (stacked): keep the drawer sheet.
                  const mdUp = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
                  if (mdUp) {
                    const el = document.querySelector<HTMLTextAreaElement>('[data-testid="chat-text-input"] textarea, [data-testid="chat-text-input"]');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.focus();
                      return;
                    }
                  }
                  useAppStore.getState().setCoachDrawerOpen(true);
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: 'var(--color-accent)',
                  color: 'var(--color-bg)',
                  borderTop: '1px solid rgba(201, 168, 76, 0.3)',
                  borderRight: '1px solid rgba(201, 168, 76, 0.3)',
                  borderLeft: '2px solid rgba(201, 168, 76, 0.8)',
                  borderBottom: '2px solid rgba(201, 168, 76, 0.8)',
                  boxShadow: '0 0 8px rgba(201, 168, 76, 0.6), 0 0 18px rgba(201, 168, 76, 0.35), 0 0 30px rgba(201, 168, 76, 0.2)',
                }}
                aria-label="Open chat"
                data-testid="teach-chat-button"
              >
                <MessageCircle size={16} />
                <span className="hidden sm:inline">Chat</span>
              </button>
              <button
                onClick={() => setCoachTipsOn((v) => !v)}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: coachTipsOn ? 'var(--color-accent)' : 'var(--color-surface)',
                color: coachTipsOn ? 'var(--color-bg)' : 'var(--color-text-muted)',
                borderTop: coachTipsOn ? '1px solid rgba(201, 168, 76, 0.3)' : '1px solid var(--color-border)',
                borderRight: coachTipsOn ? '1px solid rgba(201, 168, 76, 0.3)' : '1px solid var(--color-border)',
                borderLeft: coachTipsOn ? '2px solid rgba(201, 168, 76, 0.8)' : '2px solid rgba(234, 179, 8, 0.5)',
                borderBottom: coachTipsOn ? '2px solid rgba(201, 168, 76, 0.8)' : '2px solid rgba(234, 179, 8, 0.5)',
                boxShadow: coachTipsOn
                  ? '0 0 8px rgba(201, 168, 76, 0.6), 0 0 18px rgba(201, 168, 76, 0.35), 0 0 30px rgba(201, 168, 76, 0.2)'
                  : '0 0 6px rgba(234, 179, 8, 0.35), 0 0 14px rgba(234, 179, 8, 0.2), 0 0 24px rgba(234, 179, 8, 0.1)',
              }}
              aria-label={coachTipsOn ? 'Disable coach tips' : 'Enable coach tips'}
              aria-pressed={coachTipsOn}
              data-testid="coach-tips-toggle"
            >
              <Lightbulb size={16} />
              <span className="hidden sm:inline">Tips</span>
            </button>
            </div>
          </div>
        </div>

        {/* Coach (opponent) info bar */}
        <div className="px-2 pt-1">
          <PlayerInfoBar
            name="Coach"
            isBot
            capturedPieces={isTeachPlayerWhite ? teachCaptured.black : teachCaptured.white}
            materialAdvantage={isTeachPlayerWhite ? Math.max(0, -teachMaterialAdv) : Math.max(0, teachMaterialAdv)}
            isActive={busy}
          />
        </div>

        {/* The "Read this position" banner is GONE (David 2026-07-10: "no more
            special place for them"). The read now STREAMS into the chat panel
            (see the streaming effect above). Voice still plays live. */}

        {/* Board — same `<ControlledChessBoard>` Play uses, so click-
            to-move, legal-move dots, drag-and-drop, last-move highlight
            all work identically. No eval bar, no flip/undo/reset chrome
            (chrome on this surface is just the small Reset button in
            the header above). showVoiceMic={false} so the mic doesn't
            draw under the board (we already have the chat input).
            When the in-place walkthrough is active, swap the live
            board for a read-only `<ChessBoard>` driven by the
            walkthrough's computed FEN — the board animates through
            opening lines while the chat panel stays available for
            tangent questions. */}
        <div className="px-2 py-1 flex justify-center w-full">
          <div className="w-full md:max-w-[420px]">
            {walkthrough.isActive ? (
              // Wrap the board in a relative container so the
              // NarrationArrowOverlay sits absolutely on top.
              // In drill mode, the board becomes interactive — the
              // student plays moves on it and the hook routes them
              // through attemptDrillMove. Otherwise the board is
              // read-only and just shows the walkthrough's FEN.
              <div className="relative">
                {walkthrough.phase === 'drill' && walkthrough.drillMoveIndex >= 0 && !walkthrough.drillComplete && !walkthrough.drillWrongMove ? (
                  <ChessBoard
                    key={`drill-board-${walkthrough.drillFen}`}
                    initialFen={walkthrough.drillFen}
                    orientation={playerColor}
                    interactive={true}
                    showFlipButton={false}
                    showUndoButton={false}
                    showResetButton={false}
                    showEvalBar={false}
                    showVoiceMic={false}
                    showLastMoveHighlight
                    onMove={(move) => {
                      walkthrough.attemptDrillMove(move.san);
                    }}
                  />
                ) : (
                  // Board FEN selection priority: drill mode owns its
                  // own FEN; trap-playing mode owns trapFen (so the
                  // detour animates without mutating walkthrough path
                  // state); otherwise use the walkthrough's path FEN.
                  //
                  // Find-the-Move quiz: enable board interaction so
                  // the student can drag a piece to answer instead of
                  // tapping a multiple-choice tile. Production
                  // request from user: "Find the move should be able
                  // to move the piece on the board as another way to
                  // get the right answer."
                  (() => {
                    const isFindMoveQuiz =
                      walkthrough.phase === 'quiz' &&
                      walkthrough.activeStage === 'findMove' &&
                      walkthrough.quizSelected === null;
                    const fenToShow =
                      walkthrough.phase === 'drill'
                        ? walkthrough.drillFen
                        : walkthrough.trapFen ?? walkthrough.fen;
                    return (
                      <ChessBoard
                        key={`walkthrough-board-${fenToShow}`}
                        initialFen={fenToShow}
                        orientation={playerColor}
                        interactive={isFindMoveQuiz}
                        showFlipButton={false}
                        showUndoButton={false}
                        showResetButton={false}
                        showEvalBar={false}
                        showVoiceMic={false}
                        showLastMoveHighlight
                        onMove={
                          isFindMoveQuiz
                            ? (move) => {
                                walkthrough.attemptFindMoveAnswer(move.san);
                              }
                            : undefined
                        }
                      />
                    );
                  })()
                )}
                <NarrationArrowOverlay
                  arrows={walkthrough.narrationArrows}
                  highlights={walkthrough.narrationHighlights}
                  orientation={playerColor}
                />
              </div>
            ) : (
              <ConsistentChessboard
                game={game}
                interactive={!opponentThinking && !generationStatus && !kickoffStatus}
                showFlipButton={false}
                showUndoButton={false}
                showResetButton={false}
                showEvalBar={showEvalBarEffective}
                evaluation={latestEval}
                isMate={latestIsMate}
                mateIn={latestMateIn}
                showVoiceMic={false}
                showLastMoveHighlight
                onMove={handleStudentMove}
                arrows={arrows.length > 0 ? arrows : undefined}
                annotationHighlights={highlights.length > 0 ? highlights : undefined}
              />
            )}
          </div>
        </div>

        {/* Player (David) info bar — matches Play's layout below the
            board. */}
        <div className="px-2 pb-1">
          <PlayerInfoBar
            name={activeProfile?.name ?? 'You'}
            rating={activeProfile?.currentRating ?? undefined}
            capturedPieces={isTeachPlayerWhite ? teachCaptured.white : teachCaptured.black}
            materialAdvantage={isTeachPlayerWhite ? Math.max(0, teachMaterialAdv) : Math.max(0, -teachMaterialAdv)}
            isActive={!busy}
          />
        </div>

        {/* Guided find-the-move (P2 — the coach ASKS; the student answers on
            the board). Persistent card so the question survives after the
            voice line; Hint reveals the square, Skip dismisses. */}
        {guidedFind && (
          <div data-testid="guided-find-card" className="mx-4 my-1 rounded-xl border-2 border-purple-500/40 bg-purple-500/10 px-3 py-2">
            <div className="text-sm text-purple-100">{guidedFind.question}</div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs text-purple-300/70">Play your answer on the board.</span>
              <button
                type="button"
                data-testid="guided-find-hint"
                onClick={handleGuidedFindHint}
                className="ml-auto rounded-lg border border-purple-400/50 px-2.5 py-1 text-xs font-semibold text-purple-200 hover:bg-purple-500/20"
              >
                Hint
              </button>
              <button
                type="button"
                data-testid="guided-find-skip"
                onClick={handleGuidedFindSkip}
                className="rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Threat-check — "which of your pieces is in danger?" Chips computed;
            a board move answers it implicitly (never blocks). */}
        {threatCheck && (
          <div data-testid="threat-check-card" className="mx-4 my-1 rounded-xl border-2 border-rose-500/40 bg-rose-500/10 px-3 py-2">
            <div className="text-sm text-rose-100">{threatCheck.question}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {threatCheck.options.map((opt) => (
                <button key={opt} type="button" data-testid="threat-check-option"
                  onClick={() => handleThreatCheckPick(opt)}
                  className="rounded-lg border border-rose-400/50 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/20">
                  {opt}
                </button>
              ))}
              <button type="button" data-testid="threat-check-skip" onClick={handleThreatCheckSkip}
                className="ml-auto rounded-lg border border-slate-500/50 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-500/20">
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Coach "why did you play that?" question on a real slip — the same
            faucet Play uses, now surfaced in Learn (David 2026-06-04). The
            slip threshold is rating-adaptive (beginners: blunders only;
            2000+: inaccuracies too). */}
        <DiscussionPracticePanel
          phase={discussion.phase}
          prompt={discussion.prompt}
          teach={discussion.teach}
          onSubmit={(reason) => void discussion.submitReason(reason)}
          onSkip={() => void discussion.skip()}
          onDismissTeach={discussion.dismissTeach}
        />

        {/* Control buttons row — Takeback / Restart / Resign, same as
            Play. Resign on the teach surface ends the lesson and pops
            back to the coach hub. When a walkthrough is active, this
            row is replaced by the walkthrough control panel below. */}
        {walkthrough.isActive ? (
          <WalkthroughControls
            walkthrough={walkthrough}
            navigate={navigate}
            onDeepDive={(query) => void handleSubmit(query)}
            onPlayOutLine={(opening, customLine) => setLeafPlayOut({ opening, customLine })}
          />
        ) : (
          // Control buttons styled to MATCH Play's row exactly (David
          // 2026-06-15: "make these buttons match play") — outlined border-2 +
          // colored glow: Takeback amber, Restart cyan, End Lesson red (Play's
          // Resign). Same buttons + functions as before, so navigation is
          // unchanged; only the look matches Play. Plus the "Read this
          // position" row above (emerald, Volume2), identical to Play's.
          <div className="flex flex-col gap-2 px-4 py-2">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => void handleHint()}
              disabled={hintBusy}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-yellow-500/30 text-sm font-medium text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 disabled:opacity-40 transition-all duration-200"
              style={{ boxShadow: '0 0 10px rgba(234, 179, 8, 0.25), 0 0 3px rgba(234, 179, 8, 0.15)' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 18px rgba(234, 179, 8, 0.45), 0 0 6px rgba(234, 179, 8, 0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 10px rgba(234, 179, 8, 0.25), 0 0 3px rgba(234, 179, 8, 0.15)'; }}
              data-testid="teach-hint-btn"
              aria-label="Show a hint — the best move"
            >
              {hintBusy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Lightbulb size={16} />
              )}
              <span>{hintBusy ? 'Thinking…' : 'Hint'}</span>
            </button>
            <button
              onClick={handleReadPosition}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-emerald-500/30 text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200"
              style={{ boxShadow: '0 0 10px rgba(16, 185, 129, 0.25), 0 0 3px rgba(16, 185, 129, 0.15)' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 18px rgba(16, 185, 129, 0.45), 0 0 6px rgba(16, 185, 129, 0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.25), 0 0 3px rgba(16, 185, 129, 0.15)'; }}
              data-testid="teach-read-position-btn"
              aria-label={positionNarration.isNarrating ? 'Restart position narration' : 'Read this position aloud'}
            >
              {positionNarration.isNarrating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Volume2 size={16} />
              )}
              <span>{positionNarration.isNarrating ? 'Reading…' : 'Read this position'}</span>
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => game.undoMove()}
              disabled={busy || game.history.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-amber-500/30 text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 disabled:opacity-30 transition-all duration-200"
              style={{ boxShadow: '0 0 10px rgba(245, 158, 11, 0.25), 0 0 3px rgba(245, 158, 11, 0.15)' }}
              aria-label="Take back last move"
              data-testid="teach-takeback"
            >
              <Undo2 size={16} />
              <span>Takeback</span>
            </button>
            <button
              onClick={() => { void handleResetBoard(); }}
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-cyan-500/30 text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 transition-all duration-200"
              style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.25), 0 0 3px rgba(6, 182, 212, 0.15)' }}
              aria-label="Restart"
              data-testid="teach-restart"
            >
              <RotateCcw size={16} />
              <span>Restart</span>
            </button>
            <button
              onClick={() => {
                // SESSION CLOSER (David 2026-07-11 bookends): walk them out
                // with the computed takeaway — questions asked/found + slips
                // captured this session. Deterministic line, real numbers;
                // silent when the session had nothing to summarize. Voice is
                // a singleton, so it keeps speaking across the navigation.
                const s = sessionStatsRef.current;
                if (s.slips + s.questions > 0) {
                  const parts: string[] = [];
                  if (s.questions > 0) parts.push(`I asked you ${s.questions} question${s.questions === 1 ? '' : 's'} and you found ${s.correct}`);
                  if (s.slips > 0) parts.push(`we stopped on ${s.slips} slip${s.slips === 1 ? '' : 's'} — those are in your weakness profile now and they'll come back as drills`);
                  const closer = `Good session. ${parts.join(', and ')}.`;
                  captureEvent('session_closer_spoken', { surface: 'coach-teach', ...s });
                  void voiceService.speakForced(closer).catch(() => undefined);
                }
                void navigate('/coach/home');
              }}
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-red-500/30 text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30 transition-all duration-200"
              style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.2), 0 0 3px rgba(239, 68, 68, 0.1)' }}
              aria-label="End lesson"
              data-testid="teach-resign"
            >
              <Flag size={15} />
              <span>End Lesson</span>
            </button>
          </div>
          </div>
        )}
      </div>

      {/* Right column: stationary chat input directly under the board,
          reverse-flow messages list below. No avatar header, no
          intervening chrome — the input sits flush against the board
          so the student can type without scrolling. Older messages
          scroll DOWN. */}
      {/* `flex-none min-h-[60vh]` on mobile so the chat column keeps a real,
          usable height instead of collapsing to zero — `flex-1` made it shrink
          to fit the fixed-height parent, so the whole page never overflowed
          and couldn't scroll (David 2026-06-18 "can't scroll down in learn
          with coach"; same fix as #733 for /coach/play). */}
      <div className="flex flex-col flex-none md:flex-1 md:w-2/5 min-h-[60vh] md:min-h-0 border-t md:border-t-0 md:border-l border-theme-border bg-theme-bg">
        {/* Pinned input — first thing under the board. */}
        <div className="border-b border-theme-border">
          <ChatInput
            onSend={(text, modality) => {
              // VOICE ANSWER ROUTING (David 2026-07-11: "I would love for the
              // coach to ask the user questions" + the turn-taking mic). When
              // the "why did you play that?" picker is open, a SPOKEN
              // utterance IS the answer — route it into the picker (the
              // misconception classifier handles free text) instead of
              // spawning a chat turn over the open question. Typed chat still
              // goes to chat; the picker has its own typed input.
              if (modality === 'voice' && discussion.prompt) {
                void logAppAudit({
                  kind: 'discussion-voice-answer',
                  category: 'subsystem',
                  source: 'CoachTeachPage.voiceAnswerRouting',
                  summary: `spoken answer routed to open why-picker: "${text.slice(0, 60)}"`,
                });
                void discussion.submitReason(text);
                return;
              }
              // Spoken MOVE answer to an open guided find-the-move ("knight
              // to d5"). Parsed against chess.js's legal moves for the
              // challenge position (spokenMoveParser — never guesses). The
              // right move is PLAYED on the board and flows through
              // handleStudentMove's judge (confirm + play continues); a wrong
              // move gets the retry nudge; unparseable speech falls through
              // to a normal chat question.
              if (modality === 'voice' && guidedFindRef.current) {
                const ch = guidedFindRef.current;
                const parsed = parseSpokenMove(text, ch.fen);
                if (parsed) {
                  if (parsed.san === ch.answerSan || (parsed.from === ch.from && parsed.to === ch.to)) {
                    const result = game.makeMove(parsed.from, parsed.to);
                    if (result) {
                      handleStudentMove(result);
                      return;
                    }
                  } else {
                    guidedFindAttemptsRef.current += 1;
                    captureEvent('guided_find_result', { surface: 'coach-teach', outcome: 'retry', attempts: guidedFindAttemptsRef.current, answer: ch.answerSan, modality: 'voice' });
                    void voiceService.speakForced(ch.retry).catch(() => undefined);
                    return;
                  }
                }
              }
              void handleSubmit(text);
            }}
            disabled={busy}
            placeholder={busy ? 'Coach is typing…' : 'Ask your coach…'}
            coachChoices={coachChoices}
            onPickCoachChoice={pickCoachChoice}
          />
        </div>

        {/* Line picker — when the user typed a broad opening, render
            tappable variation tiles instead of immediately kicking
            off LLM gen. Each tile is glow-tinted by its style (sharp
            / solid / positional / etc.) using the same neon-color
            palette as the Openings tab cards. Tapping a tile clears
            the picker and re-submits the focused variation name
            through handleSubmit, which routes straight to LLM gen
            because findLinePickerOptions returns null for specific
            variation names. */}
        {linePicker && (
          <div className="px-3 py-2 border-b border-theme-border bg-theme-bg" data-testid="line-picker">
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="text-xs font-medium text-theme-text-muted">
                Pick a {linePicker.canonicalName} line to {linePickerMode === 'face' ? 'face' : 'learn'}
              </div>
              {/* Play / Face toggle. Switches what each tile does:
                  PLAY → study the variation as its natural side.
                  FACE → study the main-line counter from the
                  opposite side (LLM picks the counter). Tile dots
                  flip color to reflect which side you'll be on. */}
              <div className="inline-flex rounded-md border border-theme-border bg-theme-surface text-[10px] font-medium overflow-hidden">
                <button
                  type="button"
                  onClick={() => setLinePickerMode('play')}
                  className={
                    linePickerMode === 'play'
                      ? 'px-2 py-1 bg-theme-accent text-theme-bg'
                      : 'px-2 py-1 text-theme-text-muted hover:text-theme-text'
                  }
                  data-testid="line-picker-mode-play"
                >
                  Play
                </button>
                <button
                  type="button"
                  onClick={() => setLinePickerMode('face')}
                  className={
                    linePickerMode === 'face'
                      ? 'px-2 py-1 bg-theme-accent text-theme-bg'
                      : 'px-2 py-1 text-theme-text-muted hover:text-theme-text'
                  }
                  data-testid="line-picker-mode-face"
                >
                  Face
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(() => {
                // Only show the per-tile leading-side chip when the
                // picker has a mix of W-led and B-led variations.
                // Production audit (build cb36485): Pirc picker shows
                // every tile as "W-led" because every named Pirc
                // variation is White's attack system — the chip is
                // pure visual noise. Drop it when uniform.
                const sides = new Set(linePicker.options.map((o) => o.leadingSide));
                const showLeadingChip = sides.size > 1;
                return linePicker.options.map((opt) => {
                const neon = getNeonColor(opt.style);
                // In FACE mode the student plays the OPPOSITE side
                // (counter the variation, not play it).
                const effectiveSide: 'white' | 'black' =
                  linePickerMode === 'face'
                    ? opt.studentSide === 'white' ? 'black' : 'white'
                    : opt.studentSide;
                return (
                  <button
                    key={opt.fullName}
                    onClick={() => {
                      // Audit-instrumentation phase-1: every line-
                      // picker tile tap as chip-tap-resolved with the
                      // canonical destination opening + mode.
                      void logAppAudit({
                        kind: 'chip-tap-resolved',
                        category: 'subsystem',
                        source: 'CoachTeachPage.linePickerTile',
                        summary: `picker tile tap: "${opt.fullName}" mode=${linePickerMode}`,
                        details: JSON.stringify({
                          chipText: opt.fullName,
                          source: 'line-picker-tile',
                          mode: linePickerMode,
                          eco: opt.eco,
                          style: opt.style,
                          studentSide: opt.studentSide,
                          leadingSide: opt.leadingSide,
                          pickerCanonicalName: linePicker.canonicalName,
                          contextFen: gameRef.current.fen,
                        }),
                        fen: gameRef.current.fen,
                      });
                      setLinePicker(null);
                      // FACE mode submits a "Face: X" prefix that
                      // handleSubmit recognizes and routes to a
                      // counter-gen flow. PLAY mode submits the
                      // variation name directly.
                      const submission =
                        linePickerMode === 'face'
                          ? `Face: ${opt.fullName}`
                          : opt.fullName;
                      void handleSubmit(submission);
                    }}
                    className="flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[52px] transition-colors"
                    style={{
                      borderTop: `1px solid rgba(${neon.rgb}, 0.25)`,
                      borderRight: `1px solid rgba(${neon.rgb}, 0.25)`,
                      borderLeft: `2px solid rgba(${neon.rgb}, 0.7)`,
                      borderBottom: `2px solid rgba(${neon.rgb}, 0.7)`,
                      boxShadow: scaledShadow(neon.rgb, 70),
                    }}
                    data-testid={`line-picker-${opt.eco}`}
                    data-fullname={opt.fullName}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-theme-text-muted">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full border"
                        style={{
                          background: effectiveSide === 'white' ? '#f5f0e1' : '#1a1a1a',
                          borderColor: 'rgba(255,255,255,0.4)',
                        }}
                        aria-label={`You play ${effectiveSide}`}
                        title={`You play ${effectiveSide}`}
                      />
                      <span>{opt.eco}</span>
                      <span>·</span>
                      <span>{opt.style}</span>
                      {showLeadingChip && (
                        <>
                          <span>·</span>
                          <span title={`This line is named after ${opt.leadingSide}'s play in the Lichess DB`}>
                            {opt.leadingSide === 'white' ? 'W-led' : 'B-led'}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-theme-text leading-tight">{opt.label}</span>
                  </button>
                );
              });
              })()}
            </div>
            <button
              onClick={() => setLinePicker(null)}
              className="mt-2 w-full px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-xs transition-colors"
              data-testid="line-picker-dismiss"
            >
              Never mind — let me type something else
            </button>
          </div>
        )}

        {/* LLM opening-generation banner — real progress bar (not a
            spinner) so the student knows roughly how long is left.
            Bar fills 0→95% over the estimated 45s window using the
            startedAt timestamp; remains at 95% until the tree
            actually loads (then unmounts entirely). User asked
            specifically: "I want a progress bar instead of running
            circle." */}
        {generationStatus && (
          <GenerationProgressBanner
            openingName={generationStatus.openingName}
            startedAt={generationStatus.startedAt}
          />
        )}

        {/* Kickoff progress banner — sticky right under the input so
            the student sees what's happening without losing input
            access. */}
        {kickoffStatus && (
          <div
            className="px-4 py-2 border-b border-theme-border space-y-1.5"
            style={{ background: 'rgba(6, 182, 212, 0.06)' }}
            data-testid="teach-kickoff-progress"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--color-text)' }}>
              <Loader2 size={12} className="animate-spin" style={{ color: 'rgb(6, 182, 212)' }} />
              <span>{kickoffStatus.label}</span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: 'rgba(6, 182, 212, 0.15)' }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${(kickoffStatus.step / kickoffStatus.total) * 100}%`,
                  background: 'rgb(6, 182, 212)',
                }}
              />
            </div>
          </div>
        )}

        {/* Reverse-chronological message list. Newest at top
            (immediately under input), older messages scroll down.
            Streaming bubble renders FIRST so the in-progress reply is
            always visible. */}
        <div
          ref={transcriptRef}
          className="flex-1 overflow-y-auto p-3 min-h-0 flex flex-col gap-3"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Learn with Coach chat messages"
          data-testid="teach-transcript"
        >
          {streaming !== null && (
            <div
              className="rounded-lg p-1 -m-1"
              style={{
                background: 'rgba(6, 182, 212, 0.05)',
                outline: '1px solid rgba(6, 182, 212, 0.25)',
              }}
            >
              <ChatMessage
                message={{
                  id: 'teach-streaming',
                  role: 'assistant',
                  content: streaming,
                  timestamp: Date.now(),
                }}
                isStreaming
              />
            </div>
          )}

          {[...messages].reverse().map((msg, idxFromTop) => (
            // Newest finished message gets the same subtle highlight
            // as the streaming bubble. Everything older fades to
            // 70% opacity so the focus stays on the active turn.
            <div
              key={msg.id}
              className={
                idxFromTop === 0 && streaming === null
                  ? 'rounded-lg p-1 -m-1'
                  : ''
              }
              style={
                idxFromTop === 0 && streaming === null
                  ? { background: 'rgba(6, 182, 212, 0.05)', outline: '1px solid rgba(6, 182, 212, 0.25)' }
                  : { opacity: 0.7 }
              }
            >
              <ChatMessage message={msg} onPickChoice={pickCoachChoice} />
            </div>
          ))}

          {messages.length <= 1 && !streaming && !kickoffStatus && !linePicker && !walkthrough.isActive && (() => {
            const activeAction =
              PICKER_ACTIONS.find((a) => a.id === pickerAction) ?? PICKER_ACTIONS[0];
            const openingNames =
              favoriteOpenings.length > 0
                ? favoriteOpenings.slice(0, 8).map((o) => o.name)
                : FALLBACK_OPENING_NAMES;
            const openingsSourceLabel =
              favoriteOpenings.length > 0
                ? 'Your favorited openings'
                : 'Popular openings';
            return (
              <div
                className="space-y-3"
                data-testid="teach-picker"
                style={{ color: 'var(--color-text)' }}
              >
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Pick what you want to do, then tap an opening.
                </div>
                {/* Action chips */}
                <div
                  className="flex flex-wrap gap-1.5"
                  data-testid="teach-picker-actions"
                  role="radiogroup"
                  aria-label="Pick a lesson type"
                >
                  {PICKER_ACTIONS.map((a) => {
                    const selected = a.id === pickerAction;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setPickerAction(a.id)}
                        className="px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-colors"
                        style={{
                          borderColor: selected
                            ? 'var(--color-accent, #06b6d4)'
                            : 'var(--color-border)',
                          backgroundColor: selected
                            ? 'var(--color-accent, #06b6d4)'
                            : 'transparent',
                          color: selected
                            ? 'var(--color-bg)'
                            : 'var(--color-text)',
                        }}
                        data-testid={`teach-picker-action-${a.id}`}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
                {/* Description of what the selected action does. */}
                <div
                  className="text-xs italic px-1"
                  style={{ color: 'var(--color-text-muted)' }}
                  data-testid="teach-picker-description"
                >
                  {activeAction.description}
                </div>
                {/* Player selector — only for the "How a pro plays" mode.
                    Chips for the 8 bundled-corpus pros + a free-text field
                    for any Lichess username (the live per-player tool reads
                    their Lichess history). */}
                {pickerAction === 'player' && (
                  <div className="space-y-2">
                    <div
                      className="text-[11px] font-medium uppercase tracking-wide px-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Pick a player
                    </div>
                    <div
                      className="flex flex-wrap gap-1.5"
                      data-testid="teach-picker-players"
                      role="radiogroup"
                      aria-label="Pick a player"
                    >
                      {BUNDLED_PROS.map((p) => {
                        const selected = !pickerPlayerCustom.trim() && p.name === pickerPlayer;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => {
                              setPickerPlayer(p.name);
                              setPickerPlayerCustom('');
                            }}
                            className="px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-colors"
                            style={{
                              borderColor: selected ? 'var(--color-accent, #06b6d4)' : 'var(--color-border)',
                              backgroundColor: selected ? 'var(--color-accent, #06b6d4)' : 'transparent',
                              color: selected ? 'var(--color-bg)' : 'var(--color-text)',
                            }}
                            data-testid={`teach-picker-player-${p.id}`}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={pickerPlayerCustom}
                      onChange={(e) => setPickerPlayerCustom(e.target.value)}
                      placeholder="Or any Lichess username…"
                      className="w-full px-2.5 py-1.5 rounded-md border text-xs bg-transparent"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      data-testid="teach-picker-player-custom"
                      aria-label="Lichess username"
                    />
                    <ProAttributionNotice className="px-1" />
                  </div>
                )}
                {/* Opening chips — favorites if any, fallback popular otherwise. */}
                <div
                  className="text-[11px] font-medium uppercase tracking-wide px-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {openingsSourceLabel}
                </div>
                <div
                  className="flex flex-wrap gap-1.5"
                  data-testid="teach-picker-openings"
                >
                  {openingNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        // "How a pro plays" builds the load-bearing
                        // brain-routed phrasing (see PICKER_ACTIONS 'player'
                        // comment); every other mode uses its buildInput.
                        if (pickerAction === 'player') {
                          const who = pickerPlayerCustom.trim() || pickerPlayer;
                          void handleSubmit(buildPlayerStyleQuery(who, name));
                        } else {
                          void handleSubmit(activeAction.buildInput(name));
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-md border text-xs hover:opacity-80 transition-opacity"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                      data-testid={`teach-picker-opening-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {/* Free-form starter examples — kept compact under the picker
                    so the user knows they can also just type a question. */}
                <details
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <summary className="cursor-pointer select-none">
                    Or ask a free-form question…
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => void handleSubmit(s)}
                        className="block w-full text-left px-2 py-1.5 rounded-md border text-xs hover:bg-theme-bg"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        data-testid={`teach-suggestion-${s.slice(0, 12).replace(/\W+/g, '-').toLowerCase()}`}
                      >
                        "{s}"
                      </button>
                    ))}
                  </div>
                </details>
              </div>
            );
          })()}

          {/* Rolodex Start button (WO-ROLODEX-PLUMBING-01 item 3a).
              When the page was opened via `?opening=<name>`, the
              welcome line invites the student to start that specific
              walkthrough. The button below makes the start action a
              single tap instead of requiring a typed reply. Auto-
              hides once the student sends their first message
              (messages.length > 1 — welcome already present). */}
          {searchParams.get('opening') !== null && messages.length === 1 && !streaming && !kickoffStatus && (() => {
            const rolodexOpening = searchParams.get('opening') as string;
            const trimmed = rolodexOpening.trim();
            return (
              <button
                type="button"
                onClick={() => void handleSubmit(`Show me the ${trimmed} walkthrough.`)}
                className="block w-full mt-3 px-4 py-3 rounded-lg border-2 text-sm font-semibold"
                style={{
                  borderColor: 'var(--color-accent, #06b6d4)',
                  backgroundColor: 'rgba(6, 182, 212, 0.10)',
                  color: 'var(--color-text)',
                }}
                data-testid="rolodex-start-walkthrough"
              >
                Start the {trimmed} walkthrough
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/** Reusable gold-glow style for selectable buttons (fork tap targets,
 *  stage menu, quiz choices, drill picker, nav arrows). Matches the
 *  Coach Tips button style — same gold (rgba 201,168,76) palette,
 *  layered box-shadow for the glow, gold borders. The user asked for
 *  "selectable options highlighted in our gold glow" in the morning
 *  iteration. Applied via the inline `style` prop because Tailwind
 *  doesn't have an out-of-the-box utility for this multi-layer glow. */
const goldGlowStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(201, 168, 76, 0.3)',
  borderRight: '1px solid rgba(201, 168, 76, 0.3)',
  borderLeft: '2px solid rgba(201, 168, 76, 0.8)',
  borderBottom: '2px solid rgba(201, 168, 76, 0.8)',
  boxShadow:
    '0 0 8px rgba(201, 168, 76, 0.4), 0 0 18px rgba(201, 168, 76, 0.2), 0 0 30px rgba(201, 168, 76, 0.1)',
};

/** Slightly stronger gold glow for primary CTAs (Resume, Continue,
 *  Drill again — the action you want the user to most naturally tap). */
const goldGlowStrongStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(201, 168, 76, 0.5)',
  borderRight: '1px solid rgba(201, 168, 76, 0.5)',
  borderLeft: '2px solid rgba(201, 168, 76, 1)',
  borderBottom: '2px solid rgba(201, 168, 76, 1)',
  boxShadow:
    '0 0 12px rgba(201, 168, 76, 0.7), 0 0 24px rgba(201, 168, 76, 0.4), 0 0 40px rgba(201, 168, 76, 0.25)',
};

/** Green glow for deep-dive tiles. Visually differentiates "this
 *  branches into a new sub-lesson" from the gold "continue" tiles. */
const greenGlowStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(74, 222, 128, 0.3)',
  borderRight: '1px solid rgba(74, 222, 128, 0.3)',
  borderLeft: '2px solid rgba(74, 222, 128, 0.8)',
  borderBottom: '2px solid rgba(74, 222, 128, 0.8)',
  boxShadow:
    '0 0 8px rgba(74, 222, 128, 0.4), 0 0 18px rgba(74, 222, 128, 0.2), 0 0 30px rgba(74, 222, 128, 0.1)',
};

/** Red glow for trap / punish tiles. Signals "watch out — this
 *  shows what NOT to do." */
const redGlowStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(239, 68, 68, 0.3)',
  borderRight: '1px solid rgba(239, 68, 68, 0.3)',
  borderLeft: '2px solid rgba(239, 68, 68, 0.8)',
  borderBottom: '2px solid rgba(239, 68, 68, 0.8)',
  boxShadow:
    '0 0 8px rgba(239, 68, 68, 0.4), 0 0 18px rgba(239, 68, 68, 0.2), 0 0 30px rgba(239, 68, 68, 0.1)',
};

/** Purple glow for the quiz / concept-check tile. Signals
 *  "thinking-style content — recall and ideas". */
const purpleGlowStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(167, 139, 250, 0.3)',
  borderRight: '1px solid rgba(167, 139, 250, 0.3)',
  borderLeft: '2px solid rgba(167, 139, 250, 0.8)',
  borderBottom: '2px solid rgba(167, 139, 250, 0.8)',
  boxShadow:
    '0 0 8px rgba(167, 139, 250, 0.4), 0 0 18px rgba(167, 139, 250, 0.2), 0 0 30px rgba(167, 139, 250, 0.1)',
};

/** Estimated mean wall-clock time for an LLM opening generation.
 *  Drives the progress bar's fill rate. Real wall times observed:
 *  30-60s typical, up to 90s on retry. We aim for 95% fill at this
 *  estimate so the bar still shows progress past the mean without
 *  ever falsely-claiming completion. */
const GENERATION_ESTIMATE_MS = 45_000;

/** Format a lesson identifier for inclusion in user-facing status
 *  text. Proper opening names ("Italian Game", "Caro-Kann Defense")
 *  embed cleanly into "the X lesson". A long descriptive phrase
 *  ("Let's start with the best opening for a complete beginner")
 *  doesn't — produces "Putting together the Let's start … lesson"
 *  gibberish. In that case fall back to a generic label. */
function lessonLabel(name: string): string {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const looksLikePhrase =
    lower.startsWith("let's") ||
    lower.startsWith('lets ') ||
    lower.startsWith('how ') ||
    lower.startsWith('what ') ||
    lower.startsWith('best ') ||
    lower.includes(' lesson') ||
    trimmed.length > 40 ||
    trimmed.split(/\s+/).length > 5;
  return looksLikePhrase ? 'your lesson' : `the ${trimmed} lesson`;
}

/** Generation-progress banner with a real-time fill bar. Re-renders
 *  every 250ms via a setInterval so the bar stays smooth. Caps fill
 *  at 95% — the final 5% only completes when the actual generation
 *  resolves (and the parent unmounts this component). After the
 *  estimate window, switches messaging to set expectations.
 *
 *  Replaces the indeterminate Loader2 spinner per user feedback:
 *  "I want a progress bar instead of running circle. That way user
 *  doesn't have to guess if it's still working and they know how
 *  long they need to wait." */
function GenerationProgressBanner({
  openingName,
  startedAt,
}: {
  openingName: string;
  startedAt: number;
}): JSX.Element {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const elapsedMs = Math.max(0, now - startedAt);
  // Linear fill 0 → 95% over GENERATION_ESTIMATE_MS, then asymptote
  // at 95% (so the bar still has somewhere to go and never
  // false-completes).
  const fillPct = Math.min(95, (elapsedMs / GENERATION_ESTIMATE_MS) * 95);
  const overdue = elapsedMs > GENERATION_ESTIMATE_MS + 15_000;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  return (
    <div
      className="px-4 py-2 border-b border-theme-border space-y-1.5"
      style={{ background: 'rgba(168, 85, 247, 0.06)' }}
      data-testid="teach-generation-progress"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-xs font-medium" style={{ color: 'var(--color-text)' }}>
        <span>
          {overdue
            ? `Still working on ${lessonLabel(openingName)}…`
            : `Putting together ${lessonLabel(openingName)}…`}
        </span>
        <span className="text-[10px] text-theme-text-muted tabular-nums">
          {elapsedSec}s
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(168, 85, 247, 0.15)' }}
      >
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${fillPct}%`,
            background: 'rgb(168, 85, 247)',
          }}
        />
      </div>
      <div className="text-[10px] text-theme-text-muted">
        First time only — we'll cache it locally so future visits are instant.
      </div>
    </div>
  );
}

/** Render a stage's completion indicator. Done stages get a gold
 *  checkmark; pending stages get the chevron-right CTA. */
function StageStatus({ done }: { done: boolean }): JSX.Element {
  if (done) {
    return (
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(201, 168, 76, 0.2)',
          border: '1px solid rgba(201, 168, 76, 0.6)',
        }}
        aria-label="Completed"
      >
        <Check size={14} style={{ color: 'rgb(201, 168, 76)' }} strokeWidth={3} />
      </div>
    );
  }
  return <ChevronRight size={16} className="text-theme-text-muted flex-shrink-0" />;
}

/**
 * Walkthrough control panel — swaps in for the
 * Takeback / Restart / End Lesson row when an in-place walkthrough
 * is running. Renders one of four phase-specific UIs:
 *
 *   - 'narrating' : "Skip narration" + "End walkthrough" — student
 *                   wants to keep going faster, or bail entirely.
 *   - 'fork'      : Vertical-stacked tap targets, one per branch
 *                   (label + forkSubtitle). The user confirmed they
 *                   want forks as tap targets — "Tap targets. Keep
 *                   things consistent." Wraps with "Pause / End"
 *                   secondary controls so the lesson is interruptible.
 *   - 'leaf'      : "Back to last fork" (when canBacktrack), plus
 *                   "End walkthrough." Renders the leaf outro above
 *                   the buttons so the student sees the wrap-up text
 *                   even if voice was muted.
 *   - 'paused'    : "Resume" + "End walkthrough." Triggered when the
 *                   student types a chat question mid-narration —
 *                   handleSubmit calls walkthrough.pause() so voice
 *                   doesn't talk over the coach reply.
 */
function WalkthroughControls({
  walkthrough,
  navigate,
  onDeepDive,
  onPlayOutLine,
}: {
  walkthrough: ReturnType<typeof useTeachWalkthrough>;
  navigate: ReturnType<typeof useNavigate>;
  /** Fired when the student picks a deep-dive option from the stage
   *  menu. The parent submits the resulting query through the same
   *  surface routing that handles chat input, so existing typo
   *  tolerance + broad-vs-specific depth logic kicks in. */
  onDeepDive: (query: string) => void;
  /** Fired by the leaf "Play this line out yourself" button — the parent
   *  mounts OpeningPlayMode in-page, LOCKED to the taught line via
   *  customLine (plays it move-for-move, then adaptive Stockfish in the
   *  middlegame). Kept in the parent so the play-out overlay lives at the
   *  page root, not inside these controls. */
  onPlayOutLine: (opening: OpeningRecord, customLine: OpeningVariation) => void;
}): JSX.Element {
  const { phase, forkOptions, canBacktrack, leafOutro, tree } = walkthrough;

  // Fetch completed stages for the current opening so we can show
  // checkmarks on the stage menu. Re-fetch whenever we re-enter the
  // stage-menu phase (after completing a stage we want to see the
  // new checkmark immediately).
  const [completedStages, setCompletedStages] = useState<Set<ProgressStage>>(
    new Set(),
  );
  useEffect(() => {
    if (!tree?.openingName) return;
    if (phase !== 'stage-menu' && phase !== 'leaf') return;
    let cancelled = false;
    void getCompletedStages(tree.openingName).then((stages) => {
      if (!cancelled) setCompletedStages(stages);
    });
    return () => {
      cancelled = true;
    };
  }, [tree, phase]);

  // When an action-required phase appears (leaf / fork / stage-menu /
  // choose-mode / trap-prompt / pickers), scroll its control panel into
  // the clear zone so its buttons sit ABOVE the fixed bottom nav on
  // mobile. The board column is `flex-none` and can push these controls
  // below the fold / under the nav at the resting scroll position; a tap
  // there would otherwise land on the nav tab (David 2026-06-17 — the
  // "Continue learning" bounce-to-/coach/home). One-shot per phase change;
  // no-op on narration phases (no matching panel) and on desktop (the
  // panel is already in view). Pure UI — no LLM, no behavior change.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const el = document.querySelector(
        '[data-testid="walkthrough-leaf-panel"],[data-testid="walkthrough-fork-panel"],[data-testid="walkthrough-stage-menu"],[data-testid="walkthrough-choose-mode"],[data-testid="walkthrough-trap-prompt"],[data-testid="walkthrough-quiz-panel"],[data-testid="walkthrough-drill-picker"],[data-testid="walkthrough-punish-picker"]',
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Poll the cache while in stage-menu so background-generated
  // stages appear as cards when they finish. Stops polling once all
  // four optional stages are populated. Conservative 3s interval —
  // background gens typically take 10-30s each, so this picks them
  // up promptly without hammering Dexie.
  //
  // Production audit (build 23c484d): user reported "no quiz or drill"
  // even though drill+findMove had merged into Dexie before they
  // entered the stage menu. enterStageMenu calls mergeStagesFromCache
  // once on entry, but if THAT call raced with a freshly-completing
  // background gen, the user could see the menu render with stale
  // data and wait 3s for the next poll. Fire IMMEDIATELY on effect
  // mount as well so the first poll happens within React's render
  // cycle, not 3 seconds later.
  useEffect(() => {
    // Poll while in stage-menu OR at the leaf. Production audit
    // (build d9a5f28) caught a user reaching the leaf inside the
    // Anderssen Attack and seeing "nothing special after this
    // walkthrough" — no Continue Learning button, no Quiz / Drill /
    // Punish menu. Stages WERE in cache (audit shows merges 2 minutes
    // before leaf), but the walkthrough's in-memory tree hadn't
    // refreshed because polling was gated on stage-menu only. Now the
    // leaf phase also polls, so hasStages flips true the moment a
    // stage merges and the Continue Learning button surfaces.
    if (!tree) return;
    if (phase !== 'stage-menu' && phase !== 'leaf') return;
    const allStagesFilled =
      (tree.concepts?.length ?? 0) > 0 &&
      (tree.findMove?.length ?? 0) > 0 &&
      (tree.drill?.length ?? 0) > 0 &&
      (tree.punish?.length ?? 0) > 0;
    if (allStagesFilled) return;
    // Immediate first read — picks up any stage that just merged
    // milliseconds before this effect ran.
    void walkthrough.mergeStagesFromCache();
    const id = setInterval(() => {
      void walkthrough.mergeStagesFromCache();
    }, 3000);
    return () => clearInterval(id);
    // walkthrough.mergeStagesFromCache is intentionally OMITTED from
    // deps — it changes identity on every tree update and would
    // reset the interval each tick, never letting it fire. The
    // function reads from current state via closure on each call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, phase]);

  // Chooser shown to a returning student who's already completed
  // the walkthrough for this opening. User asked: "Maybe have the
  // coach ask with leaf selection buttons? Do you want to run from
  // beginning or pick what you want to learn?" Two big tap-target
  // buttons; gold glow primary on each. Resolves to either the
  // walkthrough animation (restart) or the stage menu hub.
  if (phase === 'choose-mode') {
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-choose-mode">
        <div className="text-sm text-theme-text px-1">
          {tree
            ? `You've already learned the ${tree.openingName}. How do you want to dive back in?`
            : 'How do you want to dive back in?'}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => walkthrough.restartWalkthrough()}
            className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[60px] transition-colors"
            style={goldGlowStrongStyle}
            data-testid="walkthrough-choose-walkthrough"
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-theme-text">Walk through it again</span>
              <span className="text-[11px] text-theme-text-muted">Replay the full lesson with narration + arrows</span>
            </div>
            <ChevronRight size={16} className="text-theme-text-muted flex-shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => walkthrough.enterStageMenu()}
            className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[60px] transition-colors"
            style={goldGlowStrongStyle}
            data-testid="walkthrough-choose-stages"
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-theme-text">Pick what to learn</span>
              <span className="text-[11px] text-theme-text-muted">Skip the walkthrough — go straight to drill, punish, quizzes</span>
            </div>
            <ChevronRight size={16} className="text-theme-text-muted flex-shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => walkthrough.stop()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-xs transition-colors"
            data-testid="walkthrough-choose-cancel"
          >
            <X size={12} />
            Never mind
          </button>
        </div>
      </div>
    );
  }

  // Inline trap-prompt: coach has just intro'd a "common mistake"
  // for the current fork position. User picks See / Skip. After the
  // trap (or if user skips), either prompts the next queued trap or
  // falls through to the regular fork picker.
  if (phase === 'trap-prompt' && walkthrough.pendingTrap) {
    const trap = walkthrough.pendingTrap;
    const hasMore = walkthrough.trapsQueuedAfter > 0;
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-trap-prompt">
        <div className="text-xs font-medium text-theme-text-muted px-1">
          ⚠️ Common mistake here: {trap.inaccuracy}
        </div>
        <div className="text-sm text-theme-text px-1 pb-1 leading-snug">
          {trap.whyBad}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => walkthrough.acceptTrap()}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[52px] transition-colors"
            style={redGlowStyle}
            data-testid="walkthrough-trap-accept"
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-theme-text">See the trap</span>
              <span className="text-[11px] text-theme-text-muted">Watch the bad move + how to punish it</span>
            </div>
            <ChevronRight size={16} className="text-theme-text-muted flex-shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => walkthrough.skipTrap()}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-theme-border bg-theme-bg hover:bg-theme-surface text-left min-h-[44px] transition-colors"
            data-testid="walkthrough-trap-skip"
          >
            <div className="flex flex-col">
              <span className="text-sm text-theme-text">
                {hasMore ? 'Skip — show next trap' : 'Skip — keep going with the walkthrough'}
              </span>
            </div>
            <ChevronRight size={14} className="text-theme-text-muted flex-shrink-0" />
          </button>
        </div>
      </div>
    );
  }

  // Trap is animating — render a small "playing" status. The board
  // is animating via trapFen above; no controls needed during the
  // animation itself.
  if (phase === 'trap-playing') {
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-trap-playing">
        <div className="text-xs font-medium text-theme-text-muted px-1">
          ⚠️ Playing the trap line…
        </div>
      </div>
    );
  }

  if (phase === 'fork') {
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-fork-panel">
        <div className="text-xs font-medium text-theme-text-muted px-1">
          Which line would you like to explore?
        </div>
        <div className="flex flex-col gap-2">
          {forkOptions.map((opt, idx) => {
            // Trap foreshadowing: red glow on fork tiles whose branch
            // contains a known punish lesson. Lets the student see
            // "watch out — this path has a trap" before committing.
            // Puzzle-DB-derived punishes (setupFen present) are NOT
            // anchored to the walkthrough path — their setupMoves is
            // the canonical opening's PGN purely for display, while
            // the actual position lives at setupFen (a mid-game
            // puzzle position). Glowing every fork tile under the
            // canonical spine for those is meaningless. Filter them.
            const childPath = [...walkthrough.pathSans, opt.node.san ?? ''];
            const hasTrapDownBranch = !!tree?.punish?.some(
              (p) =>
                !p.setupFen &&
                p.setupMoves.length >= childPath.length &&
                childPath.every((m, i) => p.setupMoves[i] === m),
            );
            return (
              <button
                key={`${opt.label ?? idx}-${idx}`}
                onClick={() => walkthrough.pickFork(idx)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[56px] transition-colors"
                style={hasTrapDownBranch ? redGlowStyle : goldGlowStyle}
                data-testid={`walkthrough-fork-option-${idx}`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-theme-text">
                    {opt.label ?? `Option ${idx + 1}`}
                    {hasTrapDownBranch && (
                      <span className="ml-1.5 text-[10px] font-medium text-red-400">
                        ⚠ trap ahead
                      </span>
                    )}
                  </span>
                  {opt.forkSubtitle && (
                    <span className="text-xs text-theme-text-muted">
                      {opt.forkSubtitle}
                    </span>
                  )}
                </div>
                <ChevronRight size={16} className="text-theme-text-muted flex-shrink-0" />
              </button>
            );
          })}
          {tree && forkOptions.length > 0 && (
            <>
              <div className="text-xs font-medium text-theme-text-muted px-1 pt-2">
                Or dive deeper into one of these
              </div>
              {forkOptions.map((opt, idx) => {
                const variationName =
                  (opt.forkSubtitle ?? '').split('—')[0].trim() ||
                  opt.label ||
                  `variation ${idx + 1}`;
                const childSan = opt.node.san ?? '';
                // Walk the branch's straight-line extension chain so
                // the deep-dive canonical lookup lands on the actual
                // sub-variation (e.g. "Italian Game: Classical
                // Variation, Greco Gambit") rather than the parent.
                const extensionSans = collectStraightLineSansFromNode(opt.node);
                const query = childSan
                  ? buildDeepDiveQuery(
                      tree.openingName,
                      walkthrough.pathSans,
                      childSan,
                      variationName,
                      extensionSans,
                    )
                  : `${tree.openingName}, ${variationName}`;
                return (
                  <button
                    key={`fork-deepdive-${idx}`}
                    onClick={() => {
                      walkthrough.stop();
                      onDeepDive(query);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-theme-bg hover:bg-theme-surface text-left min-h-[44px] transition-colors"
                    style={greenGlowStyle}
                    data-testid={`walkthrough-fork-deepdive-${idx}`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium text-theme-text-muted">Deep dive</span>
                      <span className="text-sm text-theme-text truncate">{variationName}</span>
                    </div>
                    <ChevronRight size={14} className="text-theme-text-muted flex-shrink-0" />
                  </button>
                );
              })}
            </>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={() => walkthrough.pause()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-xs transition-colors"
            data-testid="walkthrough-pause-from-fork"
          >
            Pause
          </button>
          <button
            onClick={() => walkthrough.stop()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-xs transition-colors"
            data-testid="walkthrough-end-from-fork"
          >
            <X size={12} />
            End walkthrough
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'leaf') {
    // Inside a punish-walkthrough sub-flow → leaf panel offers
    // "Back to lessons" instead of the standard menu (since the
    // tree we're in is a punish mini-tree, not the parent opening).
    if (walkthrough.isInPunishLesson) {
      return (
        <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-punish-leaf">
          {leafOutro && (
            <div className="text-xs text-theme-text-muted px-1 italic">
              {leafOutro}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => walkthrough.exitPunishToMenu()}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold min-h-[48px] transition-colors"
              style={goldGlowStrongStyle}
              data-testid="walkthrough-punish-back-to-lessons"
            >
              <ChevronRight size={16} />
              Back to lessons
            </button>
            <button
              onClick={() => walkthrough.stop()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-bg text-sm font-medium text-theme-text min-h-[44px] transition-colors"
              data-testid="walkthrough-end-from-punish"
            >
              <Flag size={14} />
              End for now
            </button>
          </div>
        </div>
      );
    }
    // Show "Continue to learning stages" only if any stage data
    // exists on the tree; otherwise the menu would be empty.
    const hasStages =
      (tree?.concepts ?? []).some(isValidConceptsQuestion) ||
      (tree?.findMove ?? []).some(isValidFindMoveQuestion) ||
      (tree?.drill ?? []).some(isValidDrillLine) ||
      (tree?.punish ?? []).some(isStartablePunishLesson);
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-leaf-panel">
        {leafOutro && (
          <div className="text-xs text-theme-text-muted px-1 italic">
            {leafOutro}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {hasStages && (
            <button
              onClick={() => walkthrough.enterStageMenu()}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold min-h-[48px] transition-colors"
              style={goldGlowStrongStyle}
              data-testid="walkthrough-continue-learning"
            >
              <ChevronRight size={16} />
              Continue learning
            </button>
          )}
          {tree && walkthrough.pathSans.length > 0 && (
            <button
              onClick={() => {
                // Play the taught line out IN-PAGE, LOCKED to it via
                // customLine: OpeningPlayMode replays the exact watched
                // moves through the opening, then adaptive Stockfish takes
                // over in the middlegame (David 2026-07-15). No navigate,
                // no generic /coach/play room, no wandering off the line.
                const side =
                  tree.studentSide ?? inferStudentSide(tree.openingName);
                const linePgn = walkthrough.pathSans.join(' ');
                const opening: OpeningRecord = {
                  id: `teach-playout-${tree.eco || tree.openingName}`,
                  eco: tree.eco ?? '',
                  name: tree.openingName,
                  pgn: linePgn,
                  uci: '',
                  fen: STARTING_FEN,
                  color: side,
                  style: '',
                  isRepertoire: false,
                  overview: null,
                  keyIdeas: null,
                  traps: null,
                  warnings: null,
                  variations: null,
                  drillAccuracy: 0,
                  drillAttempts: 0,
                  lastStudied: null,
                  woodpeckerReps: 0,
                  woodpeckerSpeed: null,
                  woodpeckerLastDate: null,
                  isFavorite: false,
                };
                const customLine: OpeningVariation = {
                  name: 'the line you just learned',
                  pgn: linePgn,
                  explanation: '',
                };
                void logAppAudit({
                  kind: 'coach-surface-migrated',
                  category: 'subsystem',
                  source: 'CoachTeachPage.leafPlayOut',
                  summary: `in-page play-out (locked to taught line, ${walkthrough.pathSans.length} plies) → adaptive Stockfish middlegame for "${tree.openingName}"`,
                });
                walkthrough.stop();
                onPlayOutLine(opening, customLine);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold min-h-[48px] transition-colors"
              style={goldGlowStrongStyle}
              data-testid="walkthrough-leaf-play-real"
            >
              <ChevronRight size={16} />
              Play this line out yourself
            </button>
          )}
          {tree && extractDeepDiveOptions(tree).length > 0 && (
            <>
              <div className="text-xs font-medium text-theme-text-muted px-1 pt-1">
                Dive deeper into a variation
              </div>
              {extractDeepDiveOptions(tree).map((opt, idx) => {
                const variationName =
                  opt.subtitle.split('—')[0].trim() ||
                  opt.label ||
                  `variation ${idx + 1}`;
                const query = buildDeepDiveQuery(
                  tree.openingName,
                  opt.pathSans,
                  opt.childSan,
                  variationName,
                  opt.extensionSans,
                );
                return (
                  <button
                    key={`leaf-deepdive-${idx}`}
                    onClick={() => {
                      walkthrough.stop();
                      onDeepDive(query);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-theme-bg hover:bg-theme-surface text-left min-h-[44px] transition-colors"
                    style={greenGlowStyle}
                    data-testid={`walkthrough-leaf-deepdive-${idx}`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium text-theme-text-muted">Deep dive</span>
                      <span className="text-sm text-theme-text truncate">{variationName}</span>
                    </div>
                    <ChevronRight size={14} className="text-theme-text-muted flex-shrink-0" />
                  </button>
                );
              })}
            </>
          )}
          {canBacktrack && (
            <button
              onClick={() => walkthrough.backtrackToLastFork()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-bg text-sm font-medium text-theme-text min-h-[44px] transition-colors"
              data-testid="walkthrough-backtrack"
            >
              <SkipBack size={14} />
              Try a different line
            </button>
          )}
          <button
            onClick={() => walkthrough.stop()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-bg text-sm font-medium text-theme-text min-h-[44px] transition-colors"
            data-testid="walkthrough-end-from-leaf"
          >
            <Flag size={14} />
            End walkthrough
          </button>
        </div>
      </div>
    );
  }

  // Stage-menu hub: pick one of the 4 stages or play it for real.
  if (phase === 'stage-menu') {
    // Only count entries that will actually work — a malformed cached
    // stage entry must not show a dead tile or crash the panel on tap
    // (David 2026-07-15; the punish fix + its sibling sweep).
    const conceptsCount = (tree?.concepts ?? []).filter(isValidConceptsQuestion).length;
    const findMoveCount = (tree?.findMove ?? []).filter(isValidFindMoveQuestion).length;
    const drillCount = (tree?.drill ?? []).filter(isValidDrillLine).length;
    const punishCount = (tree?.punish ?? []).filter(isStartablePunishLesson).length;
    const pendingJump = walkthrough.pendingStageJump;
    const pendingLabel: Record<string, string> = {
      punish: 'trap lines',
      findMove: 'find-the-move puzzles',
      concepts: 'quiz questions',
      drill: 'drill lines',
    };
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-stage-menu">
        {pendingJump && (
          <div
            className="rounded-lg border border-theme-border bg-theme-surface/80 px-3 py-3 flex items-center gap-3"
            data-testid="walkthrough-stage-pending"
            data-pending-stage={pendingJump}
          >
            <Loader2 size={16} className="animate-spin shrink-0 text-theme-accent" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-theme-text">
                Loading {pendingLabel[pendingJump] ?? pendingJump}…
              </div>
              <div className="text-[11px] text-theme-text-muted leading-snug">
                Hang tight — your pick will open the moment they finish generating.
              </div>
            </div>
            <button
              type="button"
              onClick={() => walkthrough.cancelPendingStageJump()}
              className="text-xs text-theme-text-muted hover:text-theme-text px-2 py-1 rounded-md hover:bg-theme-bg transition-colors shrink-0"
              data-testid="walkthrough-stage-pending-cancel"
              aria-label="Cancel and pick a different stage"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="text-xs font-medium text-theme-text-muted px-1">
          What's next?
        </div>
        <div className="flex flex-col gap-2">
          {punishCount > 0 && (
            <button
              onClick={() => walkthrough.startStage('punish')}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[52px] transition-colors"
              style={redGlowStyle}
              data-testid="walkthrough-stage-punish"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-theme-text">⚠ Trap lines</span>
                <span className="text-[11px] text-theme-text-muted">{punishCount} common opponent errors and how to crush them</span>
              </div>
              <StageStatus done={completedStages.has('punish')} />
            </button>
          )}
          {findMoveCount > 0 && (
            <button
              onClick={() => walkthrough.startStage('findMove')}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[52px] transition-colors"
              style={greenGlowStyle}
              data-testid="walkthrough-stage-findmove"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-theme-text">Find the move</span>
                <span className="text-[11px] text-theme-text-muted">{findMoveCount} recognition puzzles</span>
              </div>
              <StageStatus done={completedStages.has('findMove')} />
            </button>
          )}
          {conceptsCount > 0 && (
            <button
              onClick={() => walkthrough.startStage('concepts')}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[52px] transition-colors"
              style={purpleGlowStyle}
              data-testid="walkthrough-stage-concepts"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-theme-text">Quiz</span>
                <span className="text-[11px] text-theme-text-muted">{conceptsCount} questions on the big ideas</span>
              </div>
              <StageStatus done={completedStages.has('concepts')} />
            </button>
          )}
          {drillCount > 0 && (
            <button
              onClick={() => walkthrough.startStage('drill')}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[52px] transition-colors"
              style={goldGlowStyle}
              data-testid="walkthrough-stage-drill"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-theme-text">Drill</span>
                <span className="text-[11px] text-theme-text-muted">{drillCount} woodpecker lines — play them on the board</span>
              </div>
              <StageStatus done={completedStages.has('drill')} />
            </button>
          )}
          {tree && extractDeepDiveOptions(tree).length > 0 && (
            <>
              <div className="text-xs font-medium text-theme-text-muted px-1 pt-2">
                Dive deeper into a variation
              </div>
              {extractDeepDiveOptions(tree).map((opt, idx) => (
                <button
                  key={`deepdive-${idx}`}
                  onClick={() => {
                    // Resolve the chosen branch (path + childSan) to
                    // a canonical Lichess DB opening name so the
                    // deep-dive routes correctly. Production audit
                    // (build 3ad9a2b): the old code concatenated the
                    // LLM's forkSubtitle prose ("Solid and flexible")
                    // onto the parent name producing nonsense queries
                    // that pre-flight rejected and the brain
                    // re-routed to the BARE opening, trampling the
                    // in-progress walkthrough and freezing the board.
                    const variationName = opt.subtitle.split('—')[0].trim() || opt.label;
                    const query = buildDeepDiveQuery(
                      tree.openingName,
                      opt.pathSans,
                      opt.childSan,
                      variationName,
                      opt.extensionSans,
                    );
                    walkthrough.stop();
                    onDeepDive(query);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[52px] transition-colors"
                  style={greenGlowStyle}
                  data-testid={`walkthrough-deepdive-${idx}`}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold text-theme-text truncate">{opt.subtitle}</span>
                    <span className="text-[11px] text-theme-text-muted">
                      {opt.pathSans.length > 0
                        ? `after ${opt.pathSans.join(' ')} ${opt.label}`
                        : opt.label}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-theme-text-muted flex-shrink-0" />
                </button>
              ))}
            </>
          )}
          <button
            onClick={() => {
              const opening = tree?.openingName ?? '';
              walkthrough.stop();
              void navigate(`/coach/play?opening=${encodeURIComponent(opening)}`);
            }}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[52px] transition-colors"
            style={goldGlowStyle}
            data-testid="walkthrough-stage-play"
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-theme-text">Play it for real</span>
              <span className="text-[11px] text-theme-text-muted">Full game vs. coach starting from this opening</span>
            </div>
            <ChevronRight size={16} className="text-theme-text-muted flex-shrink-0" />
          </button>
          <button
            onClick={() => walkthrough.restartWalkthrough()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-xs transition-colors"
            data-testid="walkthrough-watch-again-from-menu"
          >
            <RefreshCw size={12} />
            Watch the walkthrough again
          </button>
          <button
            onClick={() => walkthrough.stop()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-xs transition-colors"
            data-testid="walkthrough-end-from-menu"
          >
            <X size={12} />
            End for now
          </button>
        </div>
      </div>
    );
  }

  // Quiz panel — handles concepts, findMove, and punish (all are MC).
  if (phase === 'quiz') {
    return <QuizPanel walkthrough={walkthrough} />;
  }

  // Drill panel — woodpecker, interactive board.
  if (phase === 'drill') {
    return <DrillPanel walkthrough={walkthrough} />;
  }

  if (phase === 'paused') {
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-paused-panel">
        <div className="text-xs text-theme-text-muted px-1">
          {tree ? `Walkthrough paused — ${tree.openingName}` : 'Walkthrough paused'}
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => walkthrough.resume()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-theme-accent text-theme-bg text-sm font-semibold transition-colors"
            style={goldGlowStrongStyle}
            data-testid="walkthrough-resume"
          >
            Resume
          </button>
          <button
            onClick={() => walkthrough.stop()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors"
            data-testid="walkthrough-end-from-paused"
          >
            <X size={14} />
            End walkthrough
          </button>
        </div>
      </div>
    );
  }

  // phase === 'narrating' (default)
  return (
    <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-narrating-panel">
      <div className="flex items-center justify-center gap-2 text-xs text-theme-text-muted">
        <Loader2 size={12} className="animate-spin" />
        <span>{tree ? `Teaching — ${tree.openingName}` : 'Teaching…'}</span>
      </div>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => walkthrough.skipNarration()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors"
          data-testid="walkthrough-skip"
        >
          <ChevronRight size={14} />
          Skip
        </button>
        <button
          onClick={() => walkthrough.pause()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors"
          data-testid="walkthrough-pause"
        >
          Pause
        </button>
        <button
          onClick={() => walkthrough.stop()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors"
          data-testid="walkthrough-end"
        >
          <X size={14} />
          End
        </button>
      </div>
    </div>
  );
}

/**
 * QuizPanel — handles the three MC-based stages (concepts /
 * findMove / punish). Same UI pattern: show prompt, render choices
 * as tap targets, on pick reveal the explanation, "Next" advances
 * (or returns to stage menu when done).
 */
function QuizPanel({
  walkthrough,
}: {
  walkthrough: ReturnType<typeof useTeachWalkthrough>;
}): JSX.Element {
  const {
    tree,
    activeStage,
    stageIndex,
    quizSelected,
    quizShowingFeedback,
  } = walkthrough;

  // Speak the question prompt aloud whenever a new question appears.
  // User asked for "the coach reads the question out loud — not the
  // answer, just the question." Fires on activeStage change (new
  // stage) or stageIndex change (next question). Stripped of the
  // multi-paragraph structure for punish (just the closing
  // question line so voice doesn't drone through the setup prose).
  useEffect(() => {
    if (!tree || !activeStage) return;
    let promptToSpeak = '';
    if (activeStage === 'concepts') {
      promptToSpeak = tree.concepts?.[stageIndex]?.prompt ?? '';
    } else if (activeStage === 'findMove') {
      promptToSpeak = tree.findMove?.[stageIndex]?.prompt ?? '';
    } else if (activeStage === 'punish') {
      const lesson = tree.punish?.[stageIndex];
      if (lesson) {
        // Speak the FULL lesson context — name + whyBad + the
        // question. The student needs the WHY for the punish stage.
        promptToSpeak = `${lesson.name}. ${lesson.whyBad} Black played ${lesson.inaccuracy}. What's your punishment?`;
      }
    }
    if (promptToSpeak.trim()) {
      // Use speakForced so it cuts any in-flight speech (e.g. the
      // walkthrough's narration just finished or a prior quiz answer's
      // explanation is being read).
      void voiceService.speakForced(promptToSpeak);
    }
     
  }, [activeStage, stageIndex, tree]);

  // Punish stage gets a LESSON PICKER (not the MC quiz UI) per user
  // morning iteration: "Punishment lines need to be in walk through
  // style following the same pattern we teach the opening in." Each
  // picked lesson runs as its own mini-walkthrough via
  // startPunishLesson; the picker re-renders here when the lesson
  // ends and exitPunishToMenu returns the user to the stage menu.
  // Hoisted BELOW the useEffect above to satisfy rules-of-hooks —
  // both are kept inside the component but always run in the same
  // order on every render.
  if (activeStage === 'punish' && (tree?.punish ?? []).some(isStartablePunishLesson)) {
    return <PunishLessonPicker walkthrough={walkthrough} />;
  }

  if (!tree || !activeStage) return <div data-testid="walkthrough-quiz-empty" />;

  // Resolve the question source.
  type AnyQuizQ = {
    prompt: string;
    multiSelect?: boolean;
    choices: { text: string; correct: boolean; explanation: string }[];
  };
  let questions: AnyQuizQ[] = [];
  let stageLabel = '';
  if (activeStage === 'concepts') {
    // Defend `q.choices` — a malformed cached concepts entry (no choices
    // array) must not throw at render (David 2026-07-15 sibling sweep);
    // it degrades to an empty question instead. The count gate already
    // keeps an all-malformed stage from surfacing a button.
    questions = (tree.concepts ?? []).map((q) => ({
      prompt: q.prompt ?? '',
      multiSelect: q.multiSelect,
      choices: (q.choices ?? []).map((c) => ({
        text: c.text,
        correct: c.correct,
        explanation: c.explanation,
      })),
    }));
    stageLabel = 'Concept check';
  } else if (activeStage === 'findMove') {
    questions = (tree.findMove ?? []).map((q) => ({
      prompt: q.prompt ?? '',
      choices: (q.candidates ?? []).map((c) => ({
        text: c.label,
        correct: c.correct,
        explanation: c.explanation,
      })),
    }));
    stageLabel = 'Find the move';
  } else if (activeStage === 'punish') {
    // For punish: the prompt is whyBad + "find the punishment". Choices
    // are SAN-only so the label doesn't give away the answer (build
    // e6c3c7b had "Qxg4 — find the punishment" as the choice text,
    // which was an obvious tell). The full explanation surfaces after
    // the student picks.
    questions = (tree.punish ?? []).map((p) => {
      // Deterministic but slightly randomized order so the punishment
      // isn't always at index 0. Sort by SAN string — same order every
      // time, but not "always first."
      const all: { san: string; correct: boolean; explanation: string; label: string }[] = [
        {
          san: p.punishment,
          correct: true,
          explanation: p.whyPunish,
          label: '',
        },
        ...p.distractors.map((d) => ({
          san: d.san,
          correct: false,
          explanation: d.explanation,
          label: d.label,
        })),
      ];
      const sorted = [...all].sort((a, b) => a.san.localeCompare(b.san));
      const choices = sorted.map((entry) => ({
        text: entry.san,
        correct: entry.correct,
        // After click, show the label (if any) + the explanation so
        // the student gets full pedagogy, not just "wrong."
        explanation: entry.label
          ? `${entry.label} — ${entry.explanation}`
          : entry.explanation,
      }));
      return {
        prompt: `${p.name}\n\n${p.whyBad}\n\nBlack played ${p.inaccuracy}. What's your punishment?`,
        choices,
      };
    });
    stageLabel = 'Punish mistakes';
  }

  if (stageIndex >= questions.length) {
    // All done — back to menu (defensive; shouldn't usually render).
    return (
      <div className="px-3 pb-3" data-testid="walkthrough-quiz-complete">
        <button
          onClick={() => walkthrough.backToStageMenu()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold min-h-[44px] transition-colors"
        >
          Back to menu
        </button>
      </div>
    );
  }

  const q = questions[stageIndex];

  return (
    <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-quiz-panel">
      <div className="flex items-center justify-between text-xs text-theme-text-muted px-1">
        <span className="font-semibold">{stageLabel}</span>
        <span>
          {stageIndex + 1} / {questions.length}
        </span>
      </div>
      <div className="text-sm text-theme-text px-1 whitespace-pre-line">
        {q.prompt}
      </div>
      <div className="flex flex-col gap-2">
        {q.choices.map((c, idx) => {
          const isSelected = quizSelected === idx;
          const showResult = quizShowingFeedback;
          // Color tint based on feedback state.
          let bg = 'bg-theme-surface';
          let border = 'border-theme-border';
          if (showResult && isSelected && c.correct) {
            bg = 'bg-green-500/15';
            border = 'border-green-500/50';
          } else if (showResult && isSelected && !c.correct) {
            bg = 'bg-red-500/15';
            border = 'border-red-500/50';
          } else if (showResult && c.correct && !isSelected) {
            bg = 'bg-green-500/10';
            border = 'border-green-500/40';
          }
          // Gold glow before answering; once feedback shows, the
          // green/red tint replaces it (using border classes from the
          // logic above).
          const choiceStyle: React.CSSProperties = showResult ? {} : goldGlowStyle;
          return (
            <button
              key={`${stageIndex}-${idx}`}
              type="button"
              disabled={showResult}
              onClick={(e) => {
                e.stopPropagation();
                walkthrough.pickQuizChoice(idx);
              }}
              className={`w-full text-left px-3 py-3 rounded-lg ${showResult ? `border ${border}` : ''} ${bg} hover:bg-theme-bg disabled:cursor-default disabled:opacity-100 text-sm text-theme-text min-h-[56px] transition-colors`}
              style={choiceStyle}
              data-testid={`walkthrough-quiz-choice-${idx}`}
            >
              <div className="font-medium pointer-events-none">{c.text}</div>
              {showResult && isSelected && (
                <div className="text-xs text-theme-text-muted mt-1 pointer-events-none">
                  {c.explanation}
                </div>
              )}
              {showResult && !isSelected && c.correct && (
                <div className="text-xs text-theme-text-muted mt-1 italic pointer-events-none">
                  {c.explanation}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {quizShowingFeedback && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => walkthrough.backToStageMenu()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-xs transition-colors"
          >
            Back to menu
          </button>
          <button
            onClick={() => walkthrough.nextQuizQuestion()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-theme-accent text-theme-bg text-sm font-semibold transition-colors"
            style={goldGlowStrongStyle}
            data-testid="walkthrough-quiz-next"
          >
            {stageIndex === questions.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * PunishLessonPicker — list of punish lessons available for the
 * current opening. Each lesson has a name + the inaccuracy SAN as
 * subtitle. Clicking a lesson kicks off a self-contained punish
 * walkthrough (setup → inaccuracy → fork → followup → leaf) using
 * the same animation engine as the opening walkthrough. Replaces the
 * MC-quiz UI for the punish stage per user morning iteration:
 * "Punishment lines need to be in walk through style following the
 * same pattern we teach the opening in."
 */
function PunishLessonPicker({
  walkthrough,
}: {
  walkthrough: ReturnType<typeof useTeachWalkthrough>;
}): JSX.Element {
  const { tree } = walkthrough;
  // Keep the ORIGINAL index — startPunishLesson(idx) indexes into
  // tree.punish — but only surface lessons that will actually start
  // (a malformed cached lesson must never appear as a clickable tile
  // that does nothing; David 2026-07-15).
  const startable = (tree?.punish ?? [])
    .map((lesson, idx) => ({ lesson, idx }))
    .filter(({ lesson }) => isStartablePunishLesson(lesson));
  if (startable.length === 0) {
    return <div data-testid="walkthrough-punish-empty" />;
  }
  return (
    <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-punish-picker">
      <div className="text-xs font-medium text-theme-text-muted px-1">
        Pick a lesson — Black plays a common mistake, you find the punishment.
        Plays out as a walkthrough on the board.
      </div>
      <div className="flex flex-col gap-2">
        {startable.map(({ lesson, idx }) => {
          // Per-lesson kind: 'trap' (forced tactical refutation),
          // 'mistake' (counting/structural blunder, default), 'theme'
          // (positional plan). Drives the colored chip on the tile so
          // the student knows whether they're about to find a hidden
          // tactic or learn a counting principle. User: "How would
          // you organize this mess of data" — Tier 2 of the taxonomy
          // cleanup surfaces the classification at every entry.
          const kind = lesson.kind ?? 'mistake';
          const chipStyle =
            kind === 'trap'
              ? 'bg-red-500/15 text-red-400 border-red-500/40'
              : kind === 'theme'
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/40';
          return (
            <button
              key={idx}
              onClick={() => walkthrough.startPunishLesson(idx)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[56px] transition-colors"
              style={goldGlowStyle}
              data-testid={`walkthrough-punish-lesson-${idx}`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-mono font-semibold tracking-wider ${chipStyle}`}
                    data-testid={`walkthrough-punish-kind-${idx}`}
                  >
                    {kind.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-theme-text">
                    {lesson.name}
                  </span>
                </div>
                <span className="text-[11px] text-theme-text-muted">
                  Black plays {lesson.inaccuracy}
                </span>
              </div>
              <ChevronRight size={16} className="text-theme-text-muted flex-shrink-0" />
            </button>
          );
        })}
        <button
          onClick={() => walkthrough.backToStageMenu()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-xs transition-colors"
        >
          Back to menu
        </button>
      </div>
    </div>
  );
}

/**
 * DrillPanel — woodpecker drill UI. Three sub-states:
 *   - No line selected yet → show line picker
 *   - drillWrongMove non-null → show "no, the move was X" feedback
 *   - drillComplete → show "Done! Restart or back to menu"
 *   - Otherwise → show "play your move" instruction
 *
 * The board itself is rendered by CoachTeachPage; this panel is
 * just the controls beneath.
 */
function DrillPanel({
  walkthrough,
}: {
  walkthrough: ReturnType<typeof useTeachWalkthrough>;
}): JSX.Element {
  const {
    tree,
    stageIndex,
    drillMoveIndex,
    drillWrongMove,
    drillComplete,
  } = walkthrough;

  const drillLines = tree?.drill ?? [];
  const currentLine = drillLines[stageIndex];
  // Only offer drill lines that will actually play — a malformed cached
  // line (no `moves`) must not show a dead tile or crash on
  // `line.moves.length` (David 2026-07-15 sibling sweep). Keep the
  // ORIGINAL index — selectDrillLine(idx) indexes into tree.drill.
  const startableDrill = drillLines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => isValidDrillLine(line));

  // No valid drill lines — defensive fallback.
  if (startableDrill.length === 0) {
    return (
      <div className="px-3 pb-3" data-testid="walkthrough-drill-empty">
        <button
          onClick={() => walkthrough.backToStageMenu()}
          className="w-full px-3 py-2 rounded-md bg-theme-surface hover:bg-theme-border text-sm text-theme-text"
        >
          Back to menu
        </button>
      </div>
    );
  }

  // Line picker — shown until selectDrillLine is called explicitly
  // OR right after startStage('drill') puts us here. We treat
  // drillMoveIndex===0 with no line picked as the picker state.
  // Once the user clicks a line, drillMoveIndex stays 0 but the line
  // is "active." We use a separate state to detect this — for now,
  // show the picker if drillMoveIndex===0 AND drillFen is the
  // starting position AND the first move hasn't been played yet.
  // Simpler: always show picker as a "switch line" option.
  const lineActive = drillMoveIndex > 0 || drillWrongMove !== null || drillComplete;

  if (!lineActive) {
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-drill-picker">
        <div className="text-xs font-medium text-theme-text-muted px-1">
          Pick a line to drill — play it on the board, opponent auto-replies, wrong moves reset.
        </div>
        <div className="flex flex-col gap-2">
          {startableDrill.map(({ line, idx }) => (
            <button
              key={idx}
              onClick={() => walkthrough.selectDrillLine(idx)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-bg text-left min-h-[52px] transition-colors"
              style={goldGlowStyle}
              data-testid={`walkthrough-drill-line-${idx}`}
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-theme-text">{line.name}</span>
                {line.subtitle && (
                  <span className="text-[11px] text-theme-text-muted">{line.subtitle}</span>
                )}
                <span className="text-[11px] text-theme-text-muted">
                  {Math.ceil(line.moves.length / 2)} full moves
                </span>
              </div>
              <ChevronRight size={16} className="text-theme-text-muted flex-shrink-0" />
            </button>
          ))}
          <button
            onClick={() => walkthrough.backToStageMenu()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-xs transition-colors"
          >
            Back to menu
          </button>
        </div>
      </div>
    );
  }

  if (drillComplete) {
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-drill-complete">
        <div className="text-sm font-semibold text-green-500 px-1">
          Clean playthrough! Line drilled.
        </div>
        <div className="text-[11px] text-theme-text-muted px-1">
          Repeat until automatic, then drill another line or move on.
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => walkthrough.restartDrill()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold min-h-[44px] transition-colors"
            style={goldGlowStrongStyle}
            data-testid="walkthrough-drill-restart"
          >
            <RefreshCw size={14} />
            Drill it again
          </button>
          <button
            onClick={() => walkthrough.backToStageMenu()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-bg text-sm font-medium text-theme-text min-h-[44px] transition-colors"
          >
            Back to menu
          </button>
        </div>
      </div>
    );
  }

  if (drillWrongMove) {
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-drill-wrong">
        <div className="text-sm font-semibold text-red-500 px-1">
          Not quite — you played {drillWrongMove.tried}, the move is {drillWrongMove.expected}.
        </div>
        {drillWrongMove.teaching ? (
          <div
            className="text-xs text-theme-text px-1 leading-snug"
            data-testid="walkthrough-drill-teaching"
          >
            {drillWrongMove.teaching}
          </div>
        ) : null}
        <div className="text-[11px] text-theme-text-muted px-1">
          Resetting to this position. Try again.
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => walkthrough.acknowledgeDrillMistake()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-theme-accent text-theme-bg text-sm font-semibold transition-colors"
            style={goldGlowStrongStyle}
            data-testid="walkthrough-drill-acknowledge"
          >
            Got it
          </button>
          <button
            onClick={() => walkthrough.restartDrill()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Restart line
          </button>
          <button
            onClick={() => walkthrough.backToStageMenu()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors"
          >
            Menu
          </button>
        </div>
      </div>
    );
  }

  // Active drill — student to play.
  const totalPlies = currentLine?.moves.length ?? 0;
  const progress = totalPlies > 0 ? Math.min(drillMoveIndex / totalPlies, 1) : 0;
  return (
    <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-drill-active">
      <div className="flex items-center justify-between text-xs text-theme-text-muted px-1">
        <span className="font-semibold">{currentLine?.name ?? 'Drill'}</span>
        <span>
          ply {drillMoveIndex} / {totalPlies}
        </span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: 'rgba(168, 85, 247, 0.15)' }}
      >
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${progress * 100}%`,
            background: 'rgb(168, 85, 247)',
          }}
        />
      </div>
      <div className="text-xs text-theme-text-muted px-1">
        Play the next move on the board. Opponent will auto-reply.
      </div>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => walkthrough.restartDrill()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-xs transition-colors"
        >
          <RefreshCw size={12} />
          Restart
        </button>
        <button
          onClick={() => walkthrough.backToStageMenu()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-xs transition-colors"
        >
          Menu
        </button>
      </div>
    </div>
  );
}
