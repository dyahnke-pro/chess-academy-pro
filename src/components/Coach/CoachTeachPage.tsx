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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ArrowLeft, Lightbulb, SkipBack, RefreshCw, Flag, Loader2, ChevronRight, X, Check, MessageCircle, Zap } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { ChessBoard } from '../Board/ChessBoard';
import { NarrationArrowOverlay } from './NarrationArrowOverlay';
import { AnalysisToggles } from '../Board/AnalysisToggles';
import { useChessGame, type MoveResult } from '../../hooks/useChessGame';
import { useTeachWalkthrough } from '../../hooks/useTeachWalkthrough';
import { ProAttributionNotice } from '../Openings/ProAttributionNotice';
import { resolveWalkthroughTree, inferStudentSide } from '../../data/openingWalkthroughs';
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
  type LinePickerOption,
} from '../../services/openingDetectionService';
import { fuzzyMatchOpening } from '../../services/openingFuzzyMatcher';
import { parseCoachIntent } from '../../services/coachAgent';
import { reportCoachReask } from '../../services/coachNonAnswer';
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
import { coachService } from '../../coach/coachService';
import { logAppAudit, mintTurnId, setCurrentTurnId } from '../../services/appAuditor';
import { resolveCoachNarration } from '../../utils/coachNarration';
import { recoverCoachMoveFromText } from '../../utils/recoverCoachMove';
import { sanitizeCoachText, sanitizeCoachStream, formatForSpeech, SENTENCE_END_RE } from '../../services/sanitizeCoachText';
import { stripDisprovenSentences } from '../../services/boardClaimValidator';
import { parseBoardTags } from '../../services/boardAnnotationService';
import { voiceService } from '../../services/voiceService';
import { useAppStore } from '../../stores/appStore';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import { useSettings } from '../../hooks/useSettings';
import { getFavoriteOpenings } from '../../services/openingService';
import type { OpeningRecord } from '../../types';
import type { LiveState } from '../../coach/types';
import type { ChatMessage as ChatMessageType, BoardArrow, BoardHighlight } from '../../types';
import { stockfishEngine } from '../../services/stockfishEngine';
import { buildTacticsLiveContext } from '../../services/liveTacticsContext';
import { validateTacticClaims } from '../../services/tacticClaimValidator';
import { applyCandidateArrows } from '../../services/coachAnswerGates';
import { groundArrows, dedupeArrowsBySquarePair } from '../../utils/arrowGrounding';
import type { StockfishAnalysis } from '../../types';
import { fetchLichessExplorer } from '../../services/lichessExplorerService';
import { getAdaptiveMove, getRandomLegalMove } from '../../services/coachGameEngine';
import { withTimeout } from '../../coach/withTimeout';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

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
  const discussion = useDiscussionPractice(true, { surface: 'coach-teach' });
  const [coachTipsOn, setCoachTipsOn] = useState<boolean>(true);
  const [evalBarOverride, setEvalBarOverride] = useState<boolean | null>(null);

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
    const msg = `That's the canonical line into the middlegame for the ${openingName}. Want to play it out yourself against me? Tap "Play this line out yourself" — or keep learning with quizzes and drills if you'd rather lock it in first.`;
    const id = `play-out-prompt-${Date.now()}`;
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
    // Speak a tight summary — the full sentence above is long for
    // voice. The position changing in the student's favor IS the
    // acknowledgment (per CLAUDE.md narration rules); voice carries
    // only the ask itself.
    void voiceService
      .speakForced(`Want to play this line out yourself? Or keep learning?`)
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

    // Audit-instrumentation phase-3: user-retry detection. Compare
    // this input against the previous user input. When the two share
    // a major content token AND the previous turn isn't very old,
    // emit a `user-retry-detected` event — signal the prior turn's
    // resolution probably missed what they wanted.
    const trimmedText = text.trim();
    {
      const prev = recentUserInputsRef.current[recentUserInputsRef.current.length - 1];
      if (prev && Date.now() - prev.at < 5 * 60_000) {
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
            id: `clearcache-${Date.now()}`,
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
            id: `clearcache-err-${Date.now()}`,
            role: 'assistant',
            content: `Cache clear failed: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now(),
          }]);
        }
        return;
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
      if (requestedName) {
        const fuzzy = fuzzyMatchOpening(requestedName);
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
          // Inline [CHOICES:] marker — the choices extractor on the
          // next user turn won't see this (it scans the brain
          // stream, not chat history), so we set the picker state
          // directly here.
          const prose = topNames.length === 1
            ? `I don't have an exact match for "${fuzzy.query}". Did you mean ${topNames[0]}?`
            : `I don't have an exact match for "${fuzzy.query}". Did you mean one of these?`;
          setMessages((prev) => [...prev, {
            id: `${ambiguousTurnId}-c`,
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
          setCoachChoices(topNames);
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
        if (!dbHit) {
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
      setCoachChoices(items);
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
    const tacticsForAsk = buildTacticsLiveContext(
      fen,
      cachedAnalysis,
      studentColor,
      studentRating,
    );
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
        ? `${text}\n\n[STEP-BY-STEP NARRATION — the engine already played the coach's reply ${replyPlayed}; it is ALREADY on the board. You do NOT and CANNOT play moves (play_move is disabled). NARRATE ${replyPlayed}: name the idea behind it, draw [BOARD: arrow:from-to:green] on that move AND on every SAN you mention in prose. Put your SPOKEN narration in a [VOICE: ...] marker — one or two plain sentences naming the move and its idea — so the coach speaks it aloud (this is REQUIRED; without it the student hears nothing). Do NOT summarize or continue any earlier topic; narrate this reply and prompt the student's next move.]`
        : engineDrivenStep
          ? text // no legal coach reply (game over) — narrate the student's move only
          : isStepByStepReport
            ? `${text}\n\n[STEP-BY-STEP: the student is walking a line move-by-move and just reported THEIR move. Respond ONLY to this latest move — narrate the line's reply and, per the arrow rule, draw an arrow on every SAN you mention in prose. Do NOT call play_move (the engine plays moves, not you). Do NOT summarize or continue any earlier conversation topic; answer this move and prompt for their next one.]`
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
        if (firstSentence) {
          voiceSpokenForTurn = true;
          // Transcript mirrors the spoken fallback too (text == narration).
          spokenDisplayText = firstSentence;
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
              ? `SUPPRESSED fallback first sentence (walkthrough owns audio, ${firstSentence.length} chars)`
              : `[VOICE:] missing — fallback spoke first sentence (${firstSentence.length} chars)`,
            details: JSON.stringify({ length: firstSentence.length, preview: firstSentence.slice(0, 80) }),
          });
          if (!walkthroughOwnsAudio) {
            queueSpeak(firstSentence);
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

      // Parse [BOARD: arrow:e2-e4:green] / highlight: / clear markers
      // out of the LLM's response and render them on the board. Each
      // new coach turn clears prior annotations and applies fresh
      // ones, so the board never accumulates stale arrows.
      const board = parseBoardTags(result.text);
      const nextArrows: BoardArrow[] = [];
      const nextHighlights: BoardHighlight[] = [];
      let cleared = false;
      for (const cmd of board.commands) {
        if (cmd.type === 'clear') cleared = true;
        if (cmd.type === 'arrow' && cmd.arrows) nextArrows.push(...cmd.arrows);
        if (cmd.type === 'highlight' && cmd.highlights) nextHighlights.push(...cmd.highlights);
      }
      // Always replace prior arrows/highlights with this turn's set —
      // a turn with no annotations clears the board (cleared=true is
      // the explicit form). Caller has the option to leave them by
      // emitting the same arrow markers in the follow-up turn.
      void cleared;
      // Ground the brain's arrows against the board before rendering: drop any
      // arrow that starts on an empty square or cuts a line the piece can't
      // actually see (and cap the count) so the board never shows ungrounded
      // arrows scattered across it (David's audit 2026-06-10). The synthesized
      // arrows appended below are chess.js-derived, so they're grounded by
      // construction.
      setArrows(uniqueArrows(groundArrows(nextArrows, fen)));
      setHighlights(nextHighlights);

      // Sanitize the FINAL response too — both for transcript display
      // and for the conversation memory record. Memory rehydration on
      // the next turn re-feeds prior assistant text into the prompt;
      // unsanitized text would teach the LLM that markup is normal.
      const finalText = sanitizeCoachText(result.text);
      // What the student READS is exactly what the voice SPOKE (text ==
      // narration, David 2026-06-11). `spokenDisplayText` is the raw
      // `[VOICE:]` inner (or the fallback first sentence) — the one thing
      // we actually said. Fall back to the full prose only when nothing
      // was spoken at all (empty response), so the bubble is never blank.
      const displayText = spokenDisplayText.trim()
        ? sanitizeCoachText(spokenDisplayText)
        : finalText;
      if (finalText) {
        // G3 enforcement (Phase 2.5 of WO-COACH-TACTICAL-AWARENESS):
        // scan the response for tactic vocabulary against the bounded
        // context we sent in the envelope. Audit-only for now — log
        // violations so we can observe how often the brain invents
        // tactics in prod. Future iteration: trigger a regen with a
        // strengthened addendum (mirrors the master-play claim
        // validator's regen pattern).
        const validation = validateTacticClaims(finalText, tacticsForAsk);
        if (validation.violations.length > 0) {
          void logAppAudit({
            kind: 'claim-validator-trip',
            category: 'subsystem',
            source: 'CoachTeachPage.tacticClaimValidator',
            summary: `out-of-vocab tactics: ${validation.violations.map((v) => v.type).join(', ')}`,
            details: JSON.stringify({
              violations: validation.violations,
              tacticContext: {
                immediateTypes: tacticsForAsk.immediate.map((t) => t.type),
                threatTypes: tacticsForAsk.threats.map((t) => t.type),
                opportunityTypes: tacticsForAsk.opportunities.map((t) => t.type),
                hangingCount: tacticsForAsk.hanging.length,
                lookaheadDepth: tacticsForAsk.lookaheadDepth,
              },
            }),
            fen,
          });
        }
        // Arrow-claim validator (Phase D of streaming-TTS standardization,
        // 2026-05-18). Scans the response for SAN-shaped move
        // mentions that don't have a matching [BOARD: arrow:from-to:color]
        // marker. The TEACH_MODE_ADDITION block has a NON-NEGOTIABLE
        // rule requiring arrows on every step-by-step move; this is
        // the observability layer that catches violations the prompt
        // missed (David's audit caught the brain shipping 5 coach
        // moves without arrows in a Vienna walkthrough).
        //
        // ENFORCEMENT (Bug E, 2026-05-19): when violations exist,
        // synthesize the missing arrows by replaying the SANs through
        // chess.js at the current FEN and emit `[BOARD: arrow:from-to:color]`
        // markers. The synthesized markers are re-parsed below so the
        // board renders the arrows the LLM forgot — closes the G6
        // loop without an extra LLM round-trip.
        // Arrow standard (G0): the LLM no longer emits arrow markers.
        // Code resolves every mentioned move's geometry and colors it by
        // Stockfish rank (the ONE arrow path, shared via arrowEngine).
        // Display text (`finalText`) stays as the LLM wrote it; we only
        // extract the code-derived markers onto the board.
        const arrowed = await applyCandidateArrows(finalText, fen, 'CoachTeachPage');
        if (arrowed !== finalText) {
          const arrowBoard = parseBoardTags(arrowed);
          const codeArrows: BoardArrow[] = [];
          for (const cmd of arrowBoard.commands) {
            if (cmd.type === 'arrow' && cmd.arrows) codeArrows.push(...cmd.arrows);
          }
          if (codeArrows.length > 0) {
            setArrows((prev) => uniqueArrows([...prev, ...codeArrows]));
          }
        }
        setMessages((prev) => [...prev, {
          id: `${turnId}-c`,
          role: 'assistant',
          content: displayText,
          timestamp: Date.now(),
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
  }, [busy, activeProfile, handlePlayMove, handleTakeBack, handleSetBoardPosition, handleResetBoard, navigate, kickoffStatus, walkthrough]);

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
    // 2) Out of book / deviation — rating-matched engine.
    try {
      const rating = activeProfile?.puzzleRating ?? 1200;
      const adaptive = await getAdaptiveMove(fen, rating);
      if (adaptive.move) {
        const san = uciToSan(adaptive.move);
        if (san) return san;
      }
    } catch { /* fall through */ }
    // 3) Never freeze.
    const random = getRandomLegalMove(fen);
    return random ? uciToSan(random) : null;
  }, [walkthrough.tree?.openingName, activeProfile?.puzzleRating]);

  const handleStudentMove = useCallback((move: MoveResult): void => {
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
            // Opponent's move is on the board — UNLOCK immediately so the
            // student can play again right away; the narration below runs
            // unblocked and is cut by voiceService.stop() if they do move.
            setOpponentThinking(false);
            void handleSubmit(`I played ${move.san}.`, {
              fenOverride: liveFenRef.current,
              coachReplyPlayed: reply,
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
  }, [handleSubmit, discussion, walkthrough.tree?.openingName, playerColor, resolveCoachReplyMove, handlePlayMove, setOpponentThinking, activeProfile?.puzzleRating, activeProfile?.currentRating]);

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
      const welcomeLine = rolodexOpening
        ? `Ready to start the ${rolodexOpening.trim()} walkthrough?`
        : 'Welcome to my classroom — what would you like to learn today?';
      setKickoffStatus(null);
      const turnId = freshTurnId('welcome');
      setMessages((prev) => [...prev, {
        id: `${turnId}-c`,
        role: 'assistant',
        content: welcomeLine,
        timestamp: Date.now(),
      }]);
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

  return (
    <div
      className="relative flex flex-col md:flex-row h-full overflow-hidden pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
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
                  onClick={() => { setPlayerColor('black'); game.setOrientation('black'); }}
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
                onClick={() => useAppStore.getState().setCoachDrawerOpen(true)}
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
          />
        ) : (
          <div className="flex items-center justify-center gap-2 px-3 pb-3">
            <button
              onClick={() => game.undoMove()}
              disabled={busy || game.history.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors disabled:opacity-40"
              aria-label="Take back last move"
              data-testid="teach-takeback"
            >
              <SkipBack size={14} />
              <span>Takeback</span>
            </button>
            <button
              onClick={() => { void handleResetBoard(); }}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors disabled:opacity-40"
              aria-label="Restart"
              data-testid="teach-restart"
            >
              <RefreshCw size={14} />
              <span>Restart</span>
            </button>
            <button
              onClick={() => void navigate('/coach/home')}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors disabled:opacity-40"
              aria-label="End lesson"
              data-testid="teach-resign"
            >
              <Flag size={14} />
              <span>End Lesson</span>
            </button>
          </div>
        )}
      </div>

      {/* Right column: stationary chat input directly under the board,
          reverse-flow messages list below. No avatar header, no
          intervening chrome — the input sits flush against the board
          so the student can type without scrolling. Older messages
          scroll DOWN. */}
      <div className="flex flex-col flex-1 md:w-2/5 min-h-0 border-t md:border-t-0 md:border-l border-theme-border bg-theme-bg">
        {/* Pinned input — first thing under the board. */}
        <div className="border-b border-theme-border">
          <ChatInput
            onSend={(text) => void handleSubmit(text)}
            disabled={busy}
            placeholder={busy ? 'Coach is typing…' : 'Ask your coach…'}
            coachChoices={coachChoices}
            onPickCoachChoice={(choice) => {
              // Audit-instrumentation phase-1: log every chip tap as
              // its own event kind so the audit log can answer "what
              // did the user actually tap, and where did it route?"
              // without spelunking through coach-surface-migrated
              // events for the resolution outcome.
              void logAppAudit({
                kind: 'chip-tap-resolved',
                category: 'subsystem',
                source: 'CoachTeachPage.coachChoiceChip',
                summary: `chip tap: "${choice.slice(0, 60)}" → routed through handleSubmit`,
                details: JSON.stringify({
                  chipText: choice,
                  source: 'coach-choice-chip',
                  // Context the resolver will see when handleSubmit
                  // runs: current FEN, walkthrough's opening, intended
                  // opening. Lets us replay the resolution if the
                  // outcome surprises us.
                  contextFen: gameRef.current.fen,
                  walkthroughOpening: walkthrough.tree?.openingName ?? null,
                }),
                fen: gameRef.current.fen,
              });
              setCoachChoices(null);
              void handleSubmit(choice);
            }}
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
              <ChatMessage message={msg} />
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
}: {
  walkthrough: ReturnType<typeof useTeachWalkthrough>;
  navigate: ReturnType<typeof useNavigate>;
  /** Fired when the student picks a deep-dive option from the stage
   *  menu. The parent submits the resulting query through the same
   *  surface routing that handles chat input, so existing typo
   *  tolerance + broad-vs-specific depth logic kicks in. */
  onDeepDive: (query: string) => void;
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
      (tree?.concepts && tree.concepts.length > 0) ||
      (tree?.findMove && tree.findMove.length > 0) ||
      (tree?.drill && tree.drill.length > 0) ||
      (tree?.punish && tree.punish.length > 0);
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
          {tree && (
            <button
              onClick={() => {
                walkthrough.stop();
                void navigate(`/coach/play?opening=${encodeURIComponent(tree.openingName)}`);
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
    const conceptsCount = tree?.concepts?.length ?? 0;
    const findMoveCount = tree?.findMove?.length ?? 0;
    const drillCount = tree?.drill?.length ?? 0;
    const punishCount = tree?.punish?.length ?? 0;
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
  if (activeStage === 'punish' && tree?.punish && tree.punish.length > 0) {
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
    questions = (tree.concepts ?? []).map((q) => ({
      prompt: q.prompt,
      multiSelect: q.multiSelect,
      choices: q.choices.map((c) => ({
        text: c.text,
        correct: c.correct,
        explanation: c.explanation,
      })),
    }));
    stageLabel = 'Concept check';
  } else if (activeStage === 'findMove') {
    questions = (tree.findMove ?? []).map((q) => ({
      prompt: q.prompt,
      choices: q.candidates.map((c) => ({
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
  if (!tree?.punish || tree.punish.length === 0) {
    return <div data-testid="walkthrough-punish-empty" />;
  }
  return (
    <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-punish-picker">
      <div className="text-xs font-medium text-theme-text-muted px-1">
        Pick a lesson — Black plays a common mistake, you find the punishment.
        Plays out as a walkthrough on the board.
      </div>
      <div className="flex flex-col gap-2">
        {tree.punish.map((lesson, idx) => {
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

  // No drill array at all — defensive fallback.
  if (drillLines.length === 0) {
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
          {drillLines.map((line, idx) => (
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
