import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Undo2, Eye, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Loader2, MessageCircle, Lightbulb, AlertTriangle, GraduationCap, Compass, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Chess } from 'chess.js';
import { safeChessFromFen } from '../../services/chessSafe';
import { useChessGame } from '../../hooks/useChessGame';
import { usePracticePosition } from '../../hooks/usePracticePosition';
import { useHintSystem } from '../../hooks/useHintSystem';
import { useCoachTips } from '../../hooks/useCoachTips';
import type { TacticLineData } from '../../hooks/useCoachTips';
import { ChessBoard } from '../Board/ChessBoard';
import { VoiceChatMic } from '../Board/VoiceChatMic';
import type { EngineSnapshot, LastMoveContext } from '../Board/VoiceChatMic';
import { EngineLines } from '../Board/EngineLines';
import { AnalysisToggles } from '../Board/AnalysisToggles';
import { DifficultyToggle } from './DifficultyToggle';
import { HintButton } from './HintButton';
import { CoachGameReview } from './CoachGameReview';
import { GameChatPanel } from './GameChatPanel';
import type { GameChatPanelHandle } from './GameChatPanel';
import { PlayerInfoBar } from './PlayerInfoBar';
import { MoveListPanel } from './MoveListPanel';
import { MobileChatDrawer } from './MobileChatDrawer';
import { ResignButton } from './ResignButton';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAppStore } from '../../stores/appStore';
import { useCoachSessionStore } from '../../stores/coachSessionStore';
import { narrateMove } from '../../services/coachAgentRunner';
import { useSettings } from '../../hooks/useSettings';
import { getAdaptiveMove, getRandomLegalMove, getTargetStrength, tryOpeningBookMove } from '../../services/coachGameEngine';
import { classifyPosition, scanUpcomingTactics } from '../../services/tacticClassifier';
import { getScenarioTemplate } from '../../services/coachTemplates';
import { generateMoveCommentary } from '../../services/coachMoveCommentary';
import {
  loadCoachPlayState,
  saveCoachPlayState,
  clearCoachPlayState,
  loadCoachPlayChat,
  saveCoachPlayChat,
} from '../../services/coachPlayPersistence';
import { fetchLichessExplorer, fetchCloudEval } from '../../services/lichessExplorerService';
import { detectTrapInPosition, formatTrapForPrompt, type MoveEvaluation } from '../../services/openingTrapDetector';

/** Max wall-clock for any Lichess lookup during opening teaching.
 *  Matches coachContextEnricher's FETCH_TIMEOUT_MS so the whole
 *  coach-narration path shares a budget. Past this, narration
 *  degrades to ungrounded prose rather than stalling the turn. */
const LICHESS_FETCH_TIMEOUT_MS = 2500;

/** Race a promise against a timeout. Matches coachContextEnricher's
 *  withTimeout helper — not imported to avoid cross-module coupling
 *  for a 3-line util. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Evaluate a set of candidate SAN moves on the position reached AFTER
 * each move. Uses Lichess cloud-eval (no auth, free, cached) per
 * candidate in parallel. Candidates whose FEN has no cloud eval
 * (404) are skipped — better to miss a trap than to mis-flag one.
 *
 * Eval is normalised to the MOVER's POV: positive = the candidate
 * player got better, negative = they lost ground. This matches what
 * `detectTrapInPosition` expects (it looks for popular moves where
 * evalCp &lt;= -200 for the mover).
 */
/** Max Lichess cloud-eval requests in flight at once. Previously
 *  Promise.all fired 5+ candidates in parallel on every trap check,
 *  which could 429 on the public endpoint or just pile up on slow
 *  networks. 2-at-a-time is enough to keep latency reasonable
 *  without burst. */
const LICHESS_CLOUD_EVAL_CONCURRENCY = 2;

async function evaluateExplorerCandidates(
  fen: string,
  sanList: string[],
  mover: 'w' | 'b',
): Promise<MoveEvaluation[]> {
  const ChessCtor = (await import('chess.js')).Chess;

  const evalOne = async (san: string): Promise<MoveEvaluation | null> => {
    try {
      const board = new ChessCtor(fen);
      const moved = board.move(san);
      if (!moved) return null;
      const resultingFen = board.fen();
      const eval_ = await withTimeout(fetchCloudEval(resultingFen, 1), LICHESS_FETCH_TIMEOUT_MS);
      if (!eval_ || !eval_.pvs || eval_.pvs.length === 0) return null;
      // cloud-eval cp is from WHITE's POV. Flip for black movers so
      // the detector gets a "this was good/bad for the MOVER" number.
      const cpWhitePov = eval_.pvs[0].cp ?? 0;
      const evalCp = mover === 'w' ? cpWhitePov : -cpWhitePov;
      return { san, evalCp };
    } catch {
      return null;
    }
  };

  // Chunked Promise.all — process LICHESS_CLOUD_EVAL_CONCURRENCY at a
  // time to cap outbound request bursts against the free Lichess API.
  const results: (MoveEvaluation | null)[] = [];
  for (let i = 0; i < sanList.length; i += LICHESS_CLOUD_EVAL_CONCURRENCY) {
    const chunk = sanList.slice(i, i + LICHESS_CLOUD_EVAL_CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map(evalOne));
    results.push(...chunkResults);
  }
  return results.filter((r): r is MoveEvaluation => r !== null);
}
import { resolveVerbosity, shouldCallLlmForMove } from '../../services/coachCommentaryPolicy';
import { getCoachChatResponse } from '../../services/coachApi';
import { EXPLORE_REACTION_ADDITION } from '../../services/coachPrompts';
import { stockfishEngine } from '../../services/stockfishEngine';
import { detectOpening, getOpeningMoves } from '../../services/openingDetectionService';
import { getCapturedPieces, getMaterialAdvantage } from '../../services/boardUtils';
import { uciMoveToSan, uciLinesToSan } from '../../utils/uciToSan';
import { db } from '../../db/schema';
import { calculateAccuracy, getClassificationCounts } from '../../services/accuracyService';
import { getPhaseBreakdown } from '../../services/gamePhaseService';
import { detectMissedTactics } from '../../services/missedTacticService';
import { detectBadHabitsFromGame } from '../../services/coachFeatureService';
import { generateMistakePuzzlesFromGame } from '../../services/mistakePuzzleService';
import { computeWeaknessProfile } from '../../services/weaknessAnalyzer';
import { reconstructMovesFromGame } from '../../services/gameReconstructionService';
import { voiceService } from '../../services/voiceService';
import type {
  CoachGameState, CoachGameMove, KeyMoment, DetectedOpening,
  CoachDifficulty, MoveClassification, MoveAnnotation,
  StockfishAnalysis, GameAnalysisSummary, GameRecord, AnalysisLine,
  GameResult, BoardArrow, BoardHighlight, BoardAnnotationCommand,
  ChatMessage,
} from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';
import { isMateEval } from '../../services/engineConstants';

function classifyMove(
  preMoveEval: number | null,
  postMoveEval: number,
  bestMoveEval: number | null,
  isEngineBestMove: boolean,
  playerColor: 'white' | 'black',
  secondBestEval?: number | null,
): MoveClassification {
  if (preMoveEval === null) return 'good';
  // Both evals are from White's perspective (normalized by stockfishEngine).

  // If the player delivered checkmate or found a forced mate, it's brilliant/great
  const postMoveGoodForPlayer = playerColor === 'white' ? postMoveEval > 0 : postMoveEval < 0;
  if (isMateEval(postMoveEval) && postMoveGoodForPlayer) {
    return isEngineBestMove ? 'brilliant' : 'great';
  }

  // If the player walked into a forced mate against them (was fine before), it's a blunder
  const postMoveBadForPlayer = playerColor === 'white' ? postMoveEval < 0 : postMoveEval > 0;
  if (isMateEval(postMoveEval) && postMoveBadForPlayer && !isMateEval(preMoveEval)) {
    return 'blunder';
  }

  // If both pre and post are mate evals (e.g. forced mate was already on the board),
  // the player maintained the line — classify as good unless they lost the mate
  if (isMateEval(preMoveEval) && isMateEval(postMoveEval)) {
    return 'good';
  }

  // cpLostVsBest = how much worse the played move is vs the engine's best
  const cpLostVsBest = bestMoveEval !== null
    ? (playerColor === 'white'
        ? bestMoveEval - postMoveEval
        : postMoveEval - bestMoveEval)
    : 0;

  // Brilliant: player found the engine's best move AND second-best was significantly worse.
  // This means the move was the *only* good option in a critical position (Chess.com-style).
  // We require second-best to be ≥150cp worse than best to qualify as brilliant.
  if (isEngineBestMove && secondBestEval !== null && secondBestEval !== undefined) {
    const secondBestGap = playerColor === 'white'
      ? (bestMoveEval ?? postMoveEval) - secondBestEval
      : secondBestEval - (bestMoveEval ?? postMoveEval);
    if (secondBestGap >= 150) return 'brilliant';
  }

  // Great: played the best move or very close (<10cp off)
  if (cpLostVsBest <= 10) return 'great';
  // Good: small inaccuracy vs best
  if (cpLostVsBest < 50) return 'good';
  // Suboptimal classifications based on cp lost vs best move
  if (cpLostVsBest < 100) return 'inaccuracy';
  if (cpLostVsBest < 250) return 'mistake';
  return 'blunder';
}

function findKeyMoments(moves: CoachGameMove[]): KeyMoment[] {
  const evaluated = moves.filter((m) => m.evaluation !== null && !m.isCoachMove);
  if (evaluated.length < 2) return [];

  // Find largest eval swings, clamping mate evals so they don't distort deltas
  const clampEval = (e: number): number => Math.max(-3000, Math.min(3000, e));

  const swings: { index: number; delta: number; move: CoachGameMove }[] = [];

  for (let i = 1; i < evaluated.length; i++) {
    const prev = evaluated[i - 1];
    const curr = evaluated[i];
    if (prev.evaluation !== null && curr.evaluation !== null) {
      const delta = Math.abs(clampEval(curr.evaluation) - clampEval(prev.evaluation));
      swings.push({ index: i, delta, move: curr });
    }
  }

  swings.sort((a, b) => b.delta - a.delta);

  return swings.slice(0, 5).map((s) => {
    const cls = s.move.classification;
    const type: KeyMoment['type'] = cls === 'brilliant' || cls === 'great'
      ? 'brilliant'
      : cls === 'blunder' || cls === 'mistake'
        ? 'blunder'
        : s.delta > 200 ? 'turning_point' : 'turning_point';

    return {
      moveNumber: s.move.moveNumber,
      fen: s.move.fen,
      explanation: s.move.commentary || `Move ${s.move.moveNumber}: ${s.move.san} — evaluation changed significantly.`,
      type,
    };
  });
}

function movesToAnnotations(moves: CoachGameMove[], playerColor: 'white' | 'black'): MoveAnnotation[] {
  return moves
    .filter((m): m is CoachGameMove & { classification: MoveClassification } =>
      !m.isCoachMove && m.classification !== null)
    .map((m) => ({
      moveNumber: Math.ceil(m.moveNumber / 2),
      color: playerColor,
      san: m.san,
      evaluation: m.evaluation,
      bestMove: m.bestMove,
      classification: m.classification,
      comment: m.commentary || null,
    }));
}

function buildAnalysisSummary(
  moves: CoachGameMove[],
  keyMoments: KeyMoment[],
  playerColor: 'white' | 'black',
  result: 'win' | 'loss' | 'draw',
): GameAnalysisSummary {
  const accuracy = calculateAccuracy(moves);
  const classificationCounts = getClassificationCounts(moves, playerColor);
  const phaseBreakdown = getPhaseBreakdown(moves, playerColor);
  const missedTactics = detectMissedTactics(moves, playerColor);

  return {
    accuracy,
    classificationCounts,
    phaseBreakdown,
    missedTactics,
    keyMoments,
    playerColor,
    result,
  };
}

export function CoachGamePage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reviewGameId = searchParams.get('review');
  const startMoveParam = searchParams.get('move');
  const activeProfile = useAppStore((s) => s.activeProfile);

  // ─── Guided Lesson State (review query param) ──────────────────────────────
  const [reviewGame, setReviewGame] = useState<GameRecord | null>(null);
  const [reviewMoves, setReviewMoves] = useState<CoachGameMove[] | null>(null);
  const [reviewLoading, setReviewLoading] = useState(!!reviewGameId);

  useEffect(() => {
    if (!reviewGameId) return;
    setReviewLoading(true);
    void db.games.get(reviewGameId).then((game) => {
      if (game) {
        setReviewGame(game);
        setReviewMoves(reconstructMovesFromGame(game));
      }
      setReviewLoading(false);
    });
  }, [reviewGameId]);

  const coachTipsOn = useAppStore((s) => s.coachTipsOn);
  const toggleCoachTips = useAppStore((s) => s.toggleCoachTips);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  // Ref to inject messages into GameChatPanel (hints, takeback msgs)
  const gameChatRef = useRef<GameChatPanelHandle>(null);

  const playerRating = activeProfile?.currentRating ?? 1420;

  // Dynamic sessions redirect here with query params set by SmartSearchBar
  // / chat intent routing ("play the Sicilian against me as black hard").
  // Honor those on mount so the student lands in a ready-to-play game
  // with the requested configuration, not the default.
  const difficultyParam = searchParams.get('difficulty');
  const sideParam = searchParams.get('side');
  const subjectParam = searchParams.get('subject');
  // Carried over from the coach-chat "let's play / yes let's do it"
  // affirmation flow. When present, the coach's per-move reactions
  // get prefixed with this agreed training focus so the session
  // doesn't feel like a cold reset from the chat conversation.
  const focusParam = searchParams.get('focus');
  // When the coach describes a position in chat (via the "Play from
  // this position" CTA), or the user asks to play a specific
  // middlegame setup, we seed the game with this FEN instead of the
  // standard start. The book-move auto-play driven by `subject` is
  // suppressed when `fen` is set — we're not starting from move 1.
  const fenParam = searchParams.get('fen');
  const initialDifficulty: CoachDifficulty =
    difficultyParam === 'easy' || difficultyParam === 'medium' || difficultyParam === 'hard'
      ? difficultyParam
      : 'medium';
  const initialSide: 'white' | 'black' = sideParam === 'black' ? 'black' : 'white';

  const [difficulty, setDifficulty] = useState<CoachDifficulty>(initialDifficulty);
  const targetStrength = getTargetStrength(playerRating, difficulty);

  // Player color selection (disabled once game has started)
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>(initialSide);
  // Capture the fen param once on mount so navigation or param-clearing
  // later in the session doesn't re-seed the game. fenParam is null for
  // normal "start-from-scratch" games.
  const [initialGameFen] = useState<string | undefined>(() => fenParam ?? undefined);
  const game = useChessGame(initialGameFen, playerColor);

  const [gameState, setGameState] = useState<CoachGameState>({
    gameId: `game-${Date.now()}`,
    playerColor,
    targetStrength,
    moves: [],
    hintsUsed: 0,
    currentHintLevel: 0,
    takebacksUsed: 0,
    status: 'playing',
    result: 'ongoing',
    keyMoments: [],
  });

  const isMobile = useIsMobile();
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [coachLastMove, setCoachLastMove] = useState<{ from: string; to: string } | null>(null);
  const previousFenRef = useRef<string | null>(null);
  const [isCoachThinking, setIsCoachThinking] = useState(false);
  const moveCountRef = useRef(0);

  // Requested opening — set via voice chat when user says "play the French Defense", etc.
  const [requestedOpeningMoves, setRequestedOpeningMoves] = useState<string[] | null>(null);

  const handleOpeningRequest = useCallback((openingName: string) => {
    const moves = getOpeningMoves(openingName);
    if (moves) {
      console.log('[CoachGame] Opening requested:', openingName, '— book moves:', moves.join(' '));
      setRequestedOpeningMoves(moves);
    } else {
      console.warn('[CoachGame] Opening not found in book:', openingName);
    }
  }, []);

  // Honor `?subject=` on mount once, so a dynamic session redirected
  // from /coach/session/play-against with ?subject=Sicilian seeds the
  // book moves as if the student had asked by voice. Skipped when
  // `?fen=` is set — a specific starting position overrides the
  // opening book (the student is jumping past the opening).
  const subjectAppliedRef = useRef(false);
  useEffect(() => {
    if (subjectAppliedRef.current) return;
    const seed = searchParams.get('opening') ?? subjectParam;
    if (!seed) return;
    if (initialGameFen) return;
    subjectAppliedRef.current = true;
    handleOpeningRequest(seed);
  }, [subjectParam, handleOpeningRequest, initialGameFen, searchParams]);

  // Resume a saved in-progress game from Dexie. Runs once on mount.
  // Only fires when the URL has no explicit game specifier (?fen,
  // ?review, ?subject, ?opening, ?side) — if the user is starting
  // something specific, we respect that over the saved snapshot.
  const resumeCheckedRef = useRef(false);
  useEffect(() => {
    if (resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;
    const hasExplicitStart =
      searchParams.has('fen') ||
      searchParams.has('review') ||
      searchParams.has('subject') ||
      searchParams.has('opening') ||
      searchParams.has('side');
    if (hasExplicitStart) return;
    void loadCoachPlayState().then((saved) => {
      if (!saved) return;
      // Only restore when we haven't made any moves yet (mount state).
      if (moveCountRef.current > 0) return;
      setDifficulty(saved.difficulty);
      setPlayerColor(saved.playerColor);
      const ok = game.loadFen(saved.fen);
      if (!ok) {
        // Saved FEN is corrupt — drop it and start fresh.
        void clearCoachPlayState();
        return;
      }
      if (saved.subject) {
        handleOpeningRequest(saved.subject);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the active game on every board change so the next visit
  // resumes where we left off. Skipped while a review is loaded
  // (review mode has its own state path), while the game is done
  // (clearCoachPlayState runs in the game-over path instead), and
  // while no real moves have been played yet (writing a starting
  // position as a resumable snapshot buys us nothing and just wastes
  // a DB write on every mount).
  useEffect(() => {
    if (reviewMoves) return;
    if (gameState.status !== 'playing') return;
    if (game.isGameOver) return;
    if (gameState.moves.length === 0) return;
    void saveCoachPlayState({
      fen: game.fen,
      playerColor,
      difficulty,
      subject: subjectParam ?? null,
      halfMoveCount: moveCountRef.current,
      updatedAt: Date.now(),
    });
  }, [
    game.fen,
    game.isGameOver,
    reviewMoves,
    gameState.status,
    gameState.moves.length,
    playerColor,
    difficulty,
    subjectParam,
  ]);

  // Honor `?narrate=1` from the agent's start_play action. Flips
  // both the session-store narrationMode and the appStore voice
  // toggle so the existing per-move commentary path actually speaks.
  const narrationAppliedRef = useRef(false);
  useEffect(() => {
    if (narrationAppliedRef.current) return;
    if (searchParams.get('narrate') !== '1') return;
    narrationAppliedRef.current = true;
    useCoachSessionStore.getState().setNarrationMode(true);
    if (!useAppStore.getState().coachVoiceOn) {
      useAppStore.getState().toggleCoachVoice();
    }
  }, [searchParams]);

  // Publish the current route to the agent's session store so its
  // context snapshot reflects "user is on the play screen."
  useEffect(() => {
    useCoachSessionStore.getState().setCurrentRoute('/coach/play');
  }, []);

  // Subscribe to pending narration from the agent. When the LLM emits
  // [[ACTION:narrate {text:...}]] from another surface (e.g., chat
  // drawer), the dispatcher pushes onto the queue and the play view
  // mirrors it into status text. The dispatcher already calls
  // voiceService.speak(text) so we only handle the visual surface here.
  const pendingNarration = useCoachSessionStore((s) => s.pendingNarration);
  const consumeNarration = useCoachSessionStore((s) => s.consumeNarration);
  useEffect(() => {
    if (!pendingNarration) return;
    consumeNarration();
  }, [pendingNarration, consumeNarration]);

  // ─── Blunder Interception State ──────────────────────────────────────────
  const [blunderPause, setBlunderPause] = useState<{
    explanation: string;
    bestMoveSan: string;
    bestMoveUci: string;
    preFen: string;
    playerMoveSan: string;
  } | null>(null);
  const [moveFlash, setMoveFlash] = useState<'blunder' | 'inaccuracy' | 'good' | null>(null);
  // Single shared flash-clear timer. Without this, back-to-back flashes
  // (player move then coach reply) leak the first timer, which fires
  // during the second flash and clears it early.
  const flashClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerMoveFlash = useCallback((flash: 'blunder' | 'inaccuracy' | 'good') => {
    if (flashClearTimerRef.current !== null) {
      clearTimeout(flashClearTimerRef.current);
    }
    setMoveFlash(flash);
    flashClearTimerRef.current = setTimeout(() => {
      setMoveFlash(null);
      flashClearTimerRef.current = null;
    }, 900);
  }, []);
  useEffect(() => {
    return () => {
      if (flashClearTimerRef.current !== null) {
        clearTimeout(flashClearTimerRef.current);
      }
    };
  }, []);

  // Track whether voice mic is active (listening or streaming) to suppress tips
  const [voiceActive, setVoiceActive] = useState(false);

  // Resizable split between move list and chat panel (percentage for chat)
  const [chatPercent, setChatPercent] = useState(80);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleDividerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
  }, []);

  const handleDividerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !rightColumnRef.current) return;
    const rect = rightColumnRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalHeight = rect.height;
    const moveListPercent = Math.max(15, Math.min(75, (y / totalHeight) * 100));
    setChatPercent(Math.max(25, Math.min(85, 100 - moveListPercent)));
  }, []);

  const handleDividerPointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Board annotation state (controlled by chat and voice)
  const [annotationArrows, setAnnotationArrows] = useState<BoardArrow[]>([]);
  const [voiceArrows, setVoiceArrows] = useState<BoardArrow[]>([]);
  const [annotationHighlights, setAnnotationHighlights] = useState<BoardHighlight[]>([]);
  const [temporaryFen, setTemporaryFen] = useState<string | null>(null);
  const [temporaryLabel, setTemporaryLabel] = useState<string | null>(null);

  // Practice position (reusable hook)
  const {
    practicePosition,
    practiceAttempts,
    handlePracticeMove: evaluatePracticeMove,
    exitPractice,
    setPracticeFromAnnotation,
  } = usePracticePosition();

  // Post-game practice bridge prompt
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(null);

  // In-game chat transcript, hydrated from Dexie on mount so the
  // conversation survives reload / navigation. Previously lost
  // because GameChatPanel's internal useState was the only home for
  // messages — the component exposes initialMessages + onMessagesUpdate
  // hooks but CoachGamePage wasn't wiring them.
  const [initialChatMessages, setInitialChatMessages] = useState<ChatMessage[] | null>(null);
  useEffect(() => {
    void loadCoachPlayChat().then((msgs) => setInitialChatMessages(msgs));
  }, []);
  const handleChatMessagesUpdate = useCallback((messages: ChatMessage[]) => {
    // Persist every transcript change. saveCoachPlayChat bounds the
    // array at 200 messages internally and swallows DB errors.
    void saveCoachPlayChat(messages);
  }, []);

  // Settings-driven analysis toggles (user can override in-game)
  const { settings } = useSettings();
  const [evalBarOverride, setEvalBarOverride] = useState<boolean | null>(null);
  const [engineLinesOverride, setEngineLinesOverride] = useState<boolean | null>(null);
  const showEvalBarEffective = evalBarOverride ?? settings.showEvalBar;
  const showEngineLinesEffective = engineLinesOverride ?? settings.showEngineLines;

  // Evaluation tracking for eval bar
  const [latestEval, setLatestEval] = useState<number>(0);
  const [latestIsMate, setLatestIsMate] = useState(false);
  const [latestMateIn, setLatestMateIn] = useState<number | null>(null);
  const [latestTopLines, setLatestTopLines] = useState<AnalysisLine[]>([]);

  // Pre-computed engine snapshot for voice chat (avoids re-running Stockfish)
  const voiceEngineSnapshot: EngineSnapshot | null = useMemo(() => {
    if (latestTopLines.length === 0) return null;
    const bestLine = latestTopLines[0];
    const bestMoveUci = bestLine.moves.length > 0 ? bestLine.moves[0] : '';
    return {
      bestMove: bestMoveUci ? uciMoveToSan(bestMoveUci, game.fen) : '',
      evaluation: latestEval,
      isMate: latestIsMate,
      mateIn: latestMateIn,
      topLines: latestTopLines.slice(0, 3).map((l) => ({
        moves: [uciLinesToSan(l.moves, game.fen, 5)],
        evaluation: l.evaluation,
        mate: l.mate,
      })),
    };
  }, [latestTopLines, latestEval, latestIsMate, latestMateIn, game.fen]);

  // Last move context for voice chat (so users can ask "was that an inaccuracy?")
  const voiceLastMoveContext: LastMoveContext | null = useMemo(() => {
    if (gameState.moves.length === 0) return null;
    const last = gameState.moves[gameState.moves.length - 1];
    // bestMove is UCI from Stockfish for the pre-move position
    // Use previous move's FEN as pre-move FEN; for the first move, use starting position
    const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const preFen = gameState.moves.length >= 2
      ? gameState.moves[gameState.moves.length - 2].fen
      : START_FEN;
    let bestMoveSan: string | null = null;
    if (last.bestMove) {
      try { bestMoveSan = uciMoveToSan(last.bestMove, preFen); } catch { /* skip */ }
    }
    return {
      san: last.san,
      player: last.isCoachMove ? 'opponent' : 'you',
      classification: last.classification,
      evalBefore: last.preMoveEval,
      evalAfter: last.evaluation,
      bestMove: bestMoveSan,
    };
  }, [gameState.moves]);

  // 3-tier visual hint system (Stockfish-powered, no knownMove)
  const isPlayersTurn =
    (playerColor === 'white' && game.turn === 'w') ||
    (playerColor === 'black' && game.turn === 'b');
  const { hintState, requestHint, resetHints } = useHintSystem({
    fen: game.fen,
    playerColor,
    enabled: gameState.status === 'playing' && isPlayersTurn && !game.isGameOver,
  });

  // Inject nudge text into chat when it appears
  const prevNudgeRef = useRef<string | null>(null);
  useEffect(() => {
    if (hintState.nudgeText && hintState.nudgeText !== prevNudgeRef.current) {
      prevNudgeRef.current = hintState.nudgeText;
      gameChatRef.current?.injectAssistantMessage(hintState.nudgeText);
    }
  }, [hintState.nudgeText]);

  // ─── Coach Tip Bubble (floating overlay near board) ─────────────────────────
  const [tipBubbleText, setTipBubbleText] = useState<string | null>(null);
  const [tipTacticLine, setTipTacticLine] = useState<TacticLineData | null>(null);
  const [showingTacticLine, setShowingTacticLine] = useState(false);
  const tipBubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tacticAnimTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ─── Show Mode Step Navigation ─────────────────────────────────────────────
  const [showFens, setShowFens] = useState<string[]>([]);
  const [showIndex, setShowIndex] = useState<number>(-1);

  // ─── Explore Ahead Mode ────────────────────────────────────────────────────
  const [isExploreMode, setIsExploreMode] = useState(false);
  const [exploreFen, setExploreFen] = useState<string | null>(null);
  const [exploreMessages, setExploreMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isExploreReacting, setIsExploreReacting] = useState(false);
  const [exploreEval, setExploreEval] = useState<number | null>(null);
  const [exploreIsMate, setExploreIsMate] = useState(false);
  const [exploreMateIn, setExploreMateIn] = useState<number | null>(null);
  const [exploreTopLines, setExploreTopLines] = useState<AnalysisLine[]>([]);
  const exploreChatRef = useRef<HTMLDivElement>(null);

  const clearTacticAnimation = useCallback(() => {
    tacticAnimTimersRef.current.forEach(clearTimeout);
    tacticAnimTimersRef.current = [];
  }, []);

  /** Auto-play interval ref for tactic line step-through */
  const tacticAutoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTacticAutoPlay = useCallback(() => {
    if (tacticAutoPlayRef.current) {
      clearInterval(tacticAutoPlayRef.current);
      tacticAutoPlayRef.current = null;
    }
  }, []);

  const showTipBubble = useCallback((text: string, tacticLine?: TacticLineData) => {
    if (tipBubbleTimerRef.current) clearTimeout(tipBubbleTimerRef.current);
    clearTacticAnimation();
    clearTacticAutoPlay();
    setTipBubbleText(text);
    setTipTacticLine(tacticLine ?? null);
    setShowingTacticLine(false);
    tipBubbleTimerRef.current = setTimeout(() => {
      setTipBubbleText(null);
      setTipTacticLine(null);
      setShowingTacticLine(false);
    }, 12000);
  }, [clearTacticAnimation, clearTacticAutoPlay]);

  /** Show button: build FEN array and auto-play through the tactic line */
  const handleShowTactic = useCallback(() => {
    if (!tipTacticLine) return;
    // Cancel auto-dismiss — user is actively viewing
    if (tipBubbleTimerRef.current) {
      clearTimeout(tipBubbleTimerRef.current);
      tipBubbleTimerRef.current = null;
    }
    setShowingTacticLine(true);
    clearTacticAnimation();
    clearTacticAutoPlay();

    try {
      const chess = new Chess(tipTacticLine.fen);
      const fens: string[] = [];
      for (const uci of tipTacticLine.uciMoves) {
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci[4] : undefined;
        chess.move({ from, to, promotion });
        fens.push(chess.fen());
      }

      setShowFens(fens);
      setShowIndex(0);
      setTemporaryFen(fens[0]);
      setTemporaryLabel('Tactic preview');

      // Auto-play through remaining moves at 800ms intervals
      if (fens.length > 1) {
        let step = 1;
        tacticAutoPlayRef.current = setInterval(() => {
          if (step >= fens.length) {
            clearTacticAutoPlay();
            return;
          }
          setShowIndex(step);
          setTemporaryFen(fens[step]);
          step++;
        }, 800);
      }
    } catch {
      // Fallback: just show the text notation
    }
  }, [tipTacticLine, clearTacticAnimation, clearTacticAutoPlay]);

  /** Step backward in the shown tactic line */
  const handleShowPrev = useCallback(() => {
    clearTacticAutoPlay();
    if (showIndex <= 0 || showFens.length === 0) return;
    const newIndex = showIndex - 1;
    setShowIndex(newIndex);
    setTemporaryFen(showFens[newIndex]);
  }, [showIndex, showFens, clearTacticAutoPlay]);

  /** Step forward in the shown tactic line */
  const handleShowNext = useCallback(() => {
    clearTacticAutoPlay();
    if (showIndex >= showFens.length - 1) return;
    const newIndex = showIndex + 1;
    setShowIndex(newIndex);
    setTemporaryFen(showFens[newIndex]);
  }, [showIndex, showFens, clearTacticAutoPlay]);

  /** Enter Explore Ahead mode from the current shown position */
  const handleEnterExplore = useCallback(() => {
    if (showFens.length === 0 || showIndex < 0) return;
    setIsExploreMode(true);
    const currentShowFen = showFens[showIndex];
    setExploreFen(currentShowFen);
    setExploreMessages([]);
    setExploreEval(null);
    setExploreIsMate(false);
    setExploreMateIn(null);
    setExploreTopLines([]);
    // Run initial engine analysis on the explore position
    void stockfishEngine.queueAnalysis(currentShowFen, 16).then((analysis) => {
      setExploreEval(analysis.evaluation);
      setExploreIsMate(analysis.isMate);
      setExploreMateIn(analysis.mateIn);
      setExploreTopLines(analysis.topLines);
    }).catch(() => { /* engine may be busy */ });
  }, [showFens, showIndex]);

  /** Handle a move made during Explore Ahead mode */
  const handleExploreMove = useCallback((moveResult: MoveResult) => {
    const newFen = moveResult.fen;
    setExploreFen(newFen);
    setTemporaryFen(newFen);

    // Run engine analysis on the new position
    void stockfishEngine.queueAnalysis(newFen, 16).then((analysis) => {
      setExploreEval(analysis.evaluation);
      setExploreIsMate(analysis.isMate);
      setExploreMateIn(analysis.mateIn);
      setExploreTopLines(analysis.topLines);

      // Fetch coach reaction with engine context
      setIsExploreReacting(true);
      const evalText = analysis.isMate
        ? `Mate in ${analysis.mateIn}`
        : `${analysis.evaluation > 0 ? '+' : ''}${(analysis.evaluation / 100).toFixed(1)}`;
      const bestMoveSan = analysis.topLines[0]?.moves[0] ?? 'unknown';

      const userMsg = `Position FEN: ${newFen}\nMove played: ${moveResult.san}\nStockfish eval after move: ${evalText}\nEngine best move: ${bestMoveSan}\nReact to this move in 1-2 sentences.`;

      const msgHistory: { role: 'user' | 'assistant'; content: string }[] = [
        ...exploreMessages,
        { role: 'user' as const, content: userMsg },
      ];

      // When the student arrived here via "let's play / yes let's do it",
      // prefix the reaction prompt with the agreed training focus so the
      // coach's commentary stays on-theme with the chat conversation.
      const systemPrompt = focusParam
        ? `${EXPLORE_REACTION_ADDITION}\n\nTraining focus for this game (carried over from the chat where the student agreed to play): ${focusParam}. Weave this focus into your reactions — praise moves that apply it, gently flag moves that miss it.`
        : EXPLORE_REACTION_ADDITION;

      void getCoachChatResponse(
        msgHistory,
        systemPrompt,
        undefined,
        'explore_reaction',
        256,
      ).then((reaction) => {
        setExploreMessages((prev) => [
          ...prev,
          { role: 'user', content: userMsg },
          { role: 'assistant', content: reaction },
        ]);
        setIsExploreReacting(false);
      }).catch(() => {
        setIsExploreReacting(false);
      });
    }).catch(() => { /* engine may be busy */ });
  }, [exploreMessages, focusParam]);

  /** Dismiss tip and snap board back to the live position */
  const handleDismissTip = useCallback(() => {
    if (tipBubbleTimerRef.current) {
      clearTimeout(tipBubbleTimerRef.current);
      tipBubbleTimerRef.current = null;
    }
    clearTacticAnimation();
    setTipBubbleText(null);
    setTipTacticLine(null);
    setShowingTacticLine(false);
    setTemporaryFen(null);
    setTemporaryLabel(null);
    // Reset show step state
    setShowFens([]);
    setShowIndex(-1);
    // Reset explore state
    setIsExploreMode(false);
    setExploreFen(null);
    setExploreMessages([]);
    setIsExploreReacting(false);
    setExploreEval(null);
    setExploreIsMate(false);
    setExploreMateIn(null);
    setExploreTopLines([]);
  }, [clearTacticAnimation]);

  // Proactive coach tips (positional awareness, tactics, key moments)
  const handleCoachTip = useCallback((tip: string, tacticLine?: TacticLineData) => {
    gameChatRef.current?.injectAssistantMessage(tip);
    showTipBubble(tip, tacticLine);
  }, [showTipBubble]);

  // Missed tactic alert — coach tells player they missed a tactic and suggests takeback
  const handleMissedTactic = useCallback((message: string) => {
    gameChatRef.current?.injectAssistantMessage(message);
    showTipBubble(message);
  }, [showTipBubble]);

  useCoachTips({
    fen: game.fen,
    playerColor,
    isPlayerTurn: isPlayersTurn,
    enabled: coachTipsOn && !voiceActive && gameState.status === 'playing' && !game.isGameOver,
    moves: gameState.moves,
    playerRating: activeProfile?.currentRating ?? 1200,
    onTip: handleCoachTip,
    onMissedTactic: difficulty === 'hard' || !settings.coachMissedTacticTakeback ? undefined : handleMissedTactic,
    blunderAlerts: settings.coachBlunderAlerts,
    tacticAlerts: settings.coachTacticAlerts,
    positionalTips: settings.coachPositionalTips,
  });

  // Move navigation — null means live position
  const [viewedMoveIndex, setViewedMoveIndex] = useState<number | null>(null);

  const handleBackToGame = useCallback(() => {
    setTemporaryFen(null);
    setTemporaryLabel(null);
    setAnnotationArrows([]);
    setVoiceArrows([]);
    setAnnotationHighlights([]);
    exitPractice();
  }, [exitPractice]);

  const handleVoiceArrows = useCallback((arrows: BoardArrow[]) => {
    setVoiceArrows(arrows);
  }, []);

  const handleBoardAnnotation = useCallback((commands: BoardAnnotationCommand[]) => {
    // Collect all arrows and highlights from the full response so they accumulate
    const newArrows: BoardArrow[] = [];
    const newHighlights: BoardHighlight[] = [];
    let hasClear = false;
    let hasPractice = false;

    for (const cmd of commands) {
      switch (cmd.type) {
        case 'arrow':
          newArrows.push(...(cmd.arrows ?? []));
          break;
        case 'highlight':
          newHighlights.push(...(cmd.highlights ?? []));
          break;
        case 'show_position':
          if (cmd.fen) {
            setTemporaryFen(cmd.fen);
            setTemporaryLabel(cmd.label ?? 'Analysis position');
          }
          break;
        case 'practice':
          hasPractice = true;
          break;
        case 'clear':
          hasClear = true;
          break;
      }
    }

    if (hasClear) {
      handleBackToGame();
    } else {
      if (hasPractice) setPracticeFromAnnotation(commands);
      if (newArrows.length > 0) setAnnotationArrows(newArrows);
      if (newHighlights.length > 0) setAnnotationHighlights(newHighlights);
    }
  }, [handleBackToGame, setPracticeFromAnnotation]);

  // Restart handler — resets board + game state back to the starting position
  // while keeping the current player color and difficulty. Used by the
  // Restart button and by the in-chat "restart the game" intent.
  // When the coach plays a variation, we snapshot the real-line FEN
  // BEFORE applying the first variation so return_to_game can snap
  // back. Cleared on restart (handleRestart) and whenever the student
  // lands back on the real position via return_to_game.
  const preVariationFenRef = useRef<string | null>(null);

  // Apply a what-if variation on command from the in-game chat coach:
  // rebuild the position by replaying the current move history minus
  // `undo` half-moves, then playing the supplied SAN moves forward.
  // Returns true on success; false on any illegal SAN / nothing to undo.
  // The coach can only invoke this via play_variation when the student
  // explicitly asks for a hypothetical — see coachPrompts.
  const handlePlayVariation = useCallback(
    ({ undo, moves }: { undo: number; moves: string[] }): boolean => {
      try {
        const sandbox = initialGameFen ? new Chess(initialGameFen) : new Chess();
        const currentHistory = game.history;
        const keep = Math.max(0, currentHistory.length - Math.max(0, undo));
        if (keep === currentHistory.length && moves.length === 0) {
          // Nothing requested — don't mutate the board.
          return false;
        }
        if (undo > currentHistory.length) {
          // Can't undo more than we've played.
          return false;
        }
        for (let i = 0; i < keep; i++) {
          const played = sandbox.move(currentHistory[i]);
          if (!played) return false;
        }
        for (const san of moves) {
          const played = sandbox.move(san);
          if (!played) return false;
        }
        // Snapshot the REAL-line FEN before we load the variation so
        // return_to_game can restore it. Capture only on the FIRST
        // variation of a session — subsequent variations shouldn't
        // overwrite the real-line anchor with another variation FEN.
        if (preVariationFenRef.current === null) {
          preVariationFenRef.current = game.fen;
        }
        return game.loadFen(sandbox.fen());
      } catch {
        return false;
      }
    },
    [game, initialGameFen],
  );

  // Snap the board back to the real game after exploring variations.
  // Returns false when the snapshot is empty (no variation in progress);
  // the dispatcher surfaces that as an error message to the LLM.
  const handleReturnToGame = useCallback((): boolean => {
    const saved = preVariationFenRef.current;
    if (!saved) return false;
    const ok = game.loadFen(saved);
    if (ok) preVariationFenRef.current = null;
    return ok;
  }, [game]);

  const handleRestart = useCallback((opts?: { keepRequestedOpening?: boolean }) => {
    // Explicit restart — drop the resumable snapshot so we don't
    // auto-load the abandoned game on next visit. Also clear the
    // pre-variation snapshot so return_to_game from a later chat
    // doesn't try to snap to a stale position from the old game.
    void clearCoachPlayState();
    preVariationFenRef.current = null;
    game.resetGame();
    moveCountRef.current = 0;
    setGameState({
      gameId: `game-${Date.now()}`,
      playerColor,
      targetStrength,
      moves: [],
      hintsUsed: 0,
      currentHintLevel: 0,
      takebacksUsed: 0,
      status: 'playing',
      result: 'ongoing',
      keyMoments: [],
    });
    setLatestEval(0);
    setLatestIsMate(false);
    setLatestMateIn(null);
    setViewedMoveIndex(null);
    if (!opts?.keepRequestedOpening) {
      setRequestedOpeningMoves(null);
    }
    resetHints();
    prevNudgeRef.current = null;
    handleBackToGame();
  }, [game, playerColor, targetStrength, handleBackToGame, resetHints]);

  // Color change handler — resets the game with the new color
  const handleColorChange = useCallback((color: 'white' | 'black') => {
    setPlayerColor(color);
    game.resetGame();
    moveCountRef.current = 0;
    setGameState({
      gameId: `game-${Date.now()}`,
      playerColor: color,
      targetStrength,
      moves: [],
      hintsUsed: 0,
      currentHintLevel: 0,
      takebacksUsed: 0,
      status: 'playing',
      result: 'ongoing',
      keyMoments: [],
    });
    setLatestEval(0);
    setLatestIsMate(false);
    setLatestMateIn(null);
    setViewedMoveIndex(null);
    setRequestedOpeningMoves(null);
    resetHints();
    prevNudgeRef.current = null;
    handleBackToGame();
  }, [game, targetStrength, handleBackToGame, resetHints]);

  // Move navigation handlers
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  const goToFirstMove = useCallback(() => {
    if (gameState.moves.length === 0) return;
    setViewedMoveIndex(-1);
    handleBackToGame();
  }, [gameState.moves.length, handleBackToGame]);

  const goToPrevMove = useCallback(() => {
    if (gameState.moves.length === 0) return;
    setViewedMoveIndex((prev) => {
      if (prev === null) return gameState.moves.length - 2;
      return Math.max(-1, prev - 1);
    });
    handleBackToGame();
  }, [gameState.moves.length, handleBackToGame]);

  const goToNextMove = useCallback(() => {
    if (gameState.moves.length === 0) return;
    setViewedMoveIndex((prev) => {
      if (prev === null) return null;
      if (prev >= gameState.moves.length - 1) return null;
      return prev + 1;
    });
  }, [gameState.moves.length]);

  const goToLastMove = useCallback(() => {
    setViewedMoveIndex(null);
  }, []);

  // Compute the displayed FEN based on navigation state
  const displayFen = practicePosition?.fen
    ?? temporaryFen
    ?? (viewedMoveIndex !== null
      ? (viewedMoveIndex === -1 ? START_FEN : gameState.moves[viewedMoveIndex]?.fen ?? game.fen)
      : game.fen);

  // Opening detection — recalculated when move history changes
  const detectedOpening = useMemo<DetectedOpening | null>(
    () => detectOpening(game.history),
    [game.history],
  );

  // Captured pieces — recalculated when FEN changes
  const capturedPieces = useMemo(
    () => getCapturedPieces(game.fen),
    [game.fen],
  );
  const materialAdv = useMemo(
    () => getMaterialAdvantage(game.fen),
    [game.fen],
  );

  // Resign handler
  const handleResign = useCallback(() => {
    const keyMoments = findKeyMoments(gameState.moves);
    setGameState((prev) => ({
      ...prev,
      status: 'postgame',
      result: 'loss',
      keyMoments,
    }));
  }, [gameState.moves]);

  // Inject coach message into the Game Chat panel (hints, takeback msgs)
  const coachSay = useCallback((text: string): void => {
    gameChatRef.current?.injectAssistantMessage(text);
  }, []);

  // Check for game over — transition to 'gameover' first to show final position
  useEffect(() => {
    if (game.isGameOver && gameState.status === 'playing') {
      const result: 'win' | 'loss' | 'draw' = game.isCheckmate
        ? (game.turn === 'w' && playerColor === 'white' ? 'loss' : 'win')
        : 'draw';

      const keyMoments = findKeyMoments(gameState.moves);

      // Show the final board position with game-over overlay before transitioning
      setGameState((prev) => ({
        ...prev,
        status: 'gameover',
        result,
        keyMoments,
      }));

      // Save game to DB
      const playerWon = result === 'win';
      const playerLost = result === 'loss';
      const pgnResult: GameResult = playerColor === 'white'
        ? (playerWon ? '1-0' : playerLost ? '0-1' : '1/2-1/2')
        : (playerWon ? '0-1' : playerLost ? '1-0' : '1/2-1/2');
      const tags: string[] = [difficulty === 'hard' ? 'Hard' : '', gameState.hintsUsed === 0 ? 'NoHints' : ''].filter(Boolean);

      const annotations = movesToAnnotations(gameState.moves, playerColor);
      const summary = buildAnalysisSummary(gameState.moves, keyMoments, playerColor, result);

      const playerName = activeProfile?.name ?? 'Player';
      const gameRecord = {
        id: gameState.gameId,
        pgn: game.history.join(' '),
        white: playerColor === 'white' ? playerName : 'Stockfish Bot',
        black: playerColor === 'black' ? playerName : 'Stockfish Bot',
        result: pgnResult,
        date: new Date().toISOString().split('T')[0],
        event: `Coach Game ${tags.join(' ')}`.trim(),
        eco: detectedOpening?.eco ?? null,
        whiteElo: playerColor === 'white' ? playerRating : targetStrength,
        blackElo: playerColor === 'black' ? playerRating : targetStrength,
        source: 'coach' as const,
        annotations,
        coachAnalysis: JSON.stringify(summary),
        isMasterGame: false,
        openingId: detectedOpening?.name ?? null,
      };

      void db.games.add(gameRecord).then(() => {
        if (!activeProfile) return;

        // Detect bad habits from game moves
        void detectBadHabitsFromGame(gameState.moves, activeProfile);

        // Generate mistake puzzles and refresh weakness profile
        void generateMistakePuzzlesFromGame(gameRecord.id).then(() => {
          // Refresh weakness profile with new game data and generated puzzles
          void computeWeaknessProfile(activeProfile);
        });

      });
    }
  }, [game.isGameOver, game.isCheckmate, game.turn, gameState.status, gameState.moves, playerColor, difficulty, gameState.hintsUsed, gameState.gameId, game.history, activeProfile, playerRating, targetStrength, setActiveProfile, detectedOpening]);

  // Auto-transition from gameover overlay to postgame review after showing final position
  useEffect(() => {
    if (gameState.status !== 'gameover') return;
    // Clear the resumable snapshot once the game actually ends so we
    // don't auto-restore a finished position on the next visit.
    void clearCoachPlayState();
    const timer = setTimeout(() => {
      setGameState((prev) => ({ ...prev, status: 'postgame' }));
    }, 3500);
    return () => clearTimeout(timer);
  }, [gameState.status]);

  // Coach makes a move when it's their turn.
  // Uses an AbortController (not a ref guard) to handle React strict-mode
  // double-invocation and dependency-change re-runs safely.
  useEffect(() => {
    const isCoachTurn =
      gameState.status === 'playing' &&
      !game.isGameOver &&
      ((playerColor === 'white' && game.turn === 'b') ||
       (playerColor === 'black' && game.turn === 'w'));

    if (!isCoachTurn) return;

    setIsCoachThinking(true);
    const abortController = new AbortController();
    const isCancelled = (): boolean => abortController.signal.aborted;

    const applyCoachMove = (
      result: MoveResult,
      evaluation: number,
      preMoveEval: number | null = null,
      bestMove: string | null = null,
    ): void => {
      moveCountRef.current += 1;

      const coachMove: CoachGameMove = {
        moveNumber: moveCountRef.current,
        san: result.san,
        fen: result.fen,
        isCoachMove: true,
        commentary: '',
        evaluation,
        classification: null,
        expanded: false,
        bestMove,
        bestMoveEval: null,
        preMoveEval,
      };

      setCoachLastMove({ from: result.from, to: result.to });
      setGameState((prev) => ({
        ...prev,
        moves: [...prev.moves, coachMove],
      }));
      // Narrate the coach's move when narration mode is on. Falls
      // back to a short SAN announcement since applyCoachMove doesn't
      // generate LLM commentary on the engine's side.
      // Stop any in-flight TTS (a stale voice-chat reply still playing,
      // the previous move's narration that overran) before the coach's
      // move speaks. Without this the coach narration and a prior
      // voice-chat reply can overlap — the student hears two voices
      // at once. Matches the player-move path's guard below.
      const coachSide: 'w' | 'b' = playerColor === 'white' ? 'b' : 'w';
      voiceService.stop();
      narrateMove({
        san: result.san,
        mover: coachSide,
        playerColor: playerColor === 'white' ? 'w' : 'b',
      });
    };

    const tryMakeMove = (moveUci: string): MoveResult | null => {
      const from = moveUci.slice(0, 2);
      const to = moveUci.slice(2, 4);
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
      return game.makeMove(from, to, promotion);
    };

    const makeCoachMove = async (): Promise<void> => {
      if (isCancelled()) return;

      try {
        console.log('[CoachGame] Coach thinking... FEN:', game.fen);

        // Sanity guard: verify chess.js ACTUALLY agrees it's AI's turn
        // before any engine / book call. React-state derived `game.turn`
        // can lag the real chess instance during rapid move sequences,
        // and without this check a stale effect firing could hand
        // Stockfish the user's side — letting the AI play BOTH sides.
        const fenTurn = game.fen.split(' ')[1] as 'w' | 'b' | undefined;
        const aiColor = playerColor === 'white' ? 'black' : 'white';
        const aiTurnChar = aiColor === 'white' ? 'w' : 'b';
        if (fenTurn !== aiTurnChar) {
          console.warn('[CoachGame] Abort — FEN says', fenTurn, 'but AI is', aiColor);
          return;
        }

        // Try opening book move first if a specific opening was requested
        const bookMove = tryOpeningBookMove(game.fen, game.history, requestedOpeningMoves, aiColor);

        let move: string;
        let analysis: StockfishAnalysis;

        if (bookMove) {
          console.log('[CoachGame] Playing opening book move:', bookMove);
          move = bookMove;
          // Still run a quick analysis for eval bar / commentary
          try {
            analysis = await stockfishEngine.analyzePosition(game.fen, 10);
          } catch {
            analysis = { bestMove: bookMove, evaluation: 0, isMate: false, mateIn: null, depth: 0, topLines: [], nodesPerSecond: 0 };
          }
        } else {
          const adaptive = await getAdaptiveMove(game.fen, targetStrength);
          move = adaptive.move;
          analysis = adaptive.analysis;
          // Clear requested opening if we've left the book
          if (requestedOpeningMoves) {
            console.log('[CoachGame] Left opening book, clearing requested opening');
            setRequestedOpeningMoves(null);
          }
        }

        if (isCancelled()) return;

        let result = tryMakeMove(move);

        // If move was invalid, fall back to a random legal move
        if (!result) {
          console.warn('[CoachGame] Move invalid:', move, '— trying random fallback');
          const randomMove = getRandomLegalMove(game.fen);
          if (randomMove) {
            result = tryMakeMove(randomMove);
          }
        }

        if (!result) {
          console.error('[CoachGame] No valid move could be made');
          return;
        }

        if (isCancelled()) return;

        console.log('[CoachGame] Coach played:', result.san);

        // Analyze the position AFTER the coach moved — this gives:
        // 1. Accurate eval/top lines for the player's upcoming turn (voice chat needs this)
        // 2. preMoveEval for the player's next move classification
        let postCoachAnalysis: StockfishAnalysis | null = null;
        try {
          postCoachAnalysis = await stockfishEngine.analyzePosition(result.fen, 10);
        } catch {
          // Fall back to pre-coach analysis if post-analysis fails
        }

        if (isCancelled()) return;

        const postCoachEval = postCoachAnalysis?.evaluation ?? analysis.evaluation;
        applyCoachMove(result, postCoachEval, analysis.evaluation, analysis.bestMove);
        // Track previous FEN for tactic classification
        previousFenRef.current = result.fen;

        // Classify the coach's move the same way the player's moves are
        // classified so users get a visual flash on the opponent's turn
        // too. Adaptive / book moves can still land as a blunder at low
        // difficulty, so this is informative rather than cosmetic.
        const coachColor: 'white' | 'black' = playerColor === 'white' ? 'black' : 'white';
        const isEngineBest = !!analysis.bestMove && move === analysis.bestMove;
        const secondBestEval = analysis.topLines.length > 1 ? analysis.topLines[1].evaluation : null;
        const coachClassification = classifyMove(
          analysis.evaluation,
          postCoachEval,
          analysis.evaluation,
          isEngineBest,
          coachColor,
          secondBestEval,
        );
        const coachFlashMap = new Map<string, 'blunder' | 'inaccuracy' | 'good'>([
          ['blunder', 'blunder'],
          ['mistake', 'blunder'],
          ['inaccuracy', 'inaccuracy'],
          ['brilliant', 'good'],
          ['great', 'good'],
        ]);
        const coachFlash = coachFlashMap.get(coachClassification);
        if (coachFlash && !isCancelled()) {
          triggerMoveFlash(coachFlash);
        }

        // Use POST-move analysis for eval bar + engine lines — these are for the
        // player's turn, which is what voice chat needs when answering "what should I play?"
        setLatestEval(postCoachEval);
        setLatestIsMate(postCoachAnalysis?.isMate ?? analysis.isMate);
        setLatestMateIn(postCoachAnalysis?.mateIn ?? analysis.mateIn);
        setLatestTopLines(postCoachAnalysis?.topLines ?? analysis.topLines);

        // Proactive warning: scan for opponent threats after coach's move
        if (postCoachAnalysis && !isCancelled()) {
          const playerColorCode = playerColor === 'white' ? 'w' : 'b';
          const upcoming = scanUpcomingTactics(
            result.fen,
            postCoachAnalysis.topLines.map((l) => ({ moves: l.moves, evaluation: l.evaluation, mate: l.mate })),
            playerColorCode,
          );
          const threats = upcoming.filter((u) => u.beneficiary === 'opponent' && u.depthAhead <= 2);
          if (threats.length > 0) {
            const warning = `Be careful — ${threats[0].pattern.description}.`;
            gameChatRef.current?.injectAssistantMessage(warning);
          }
        }
      } catch (error) {
        if (isCancelled()) return;
        console.error('[CoachGame] Coach move failed, attempting random fallback:', error);

        // Last resort: random legal move so the game never freezes
        const randomMove = getRandomLegalMove(game.fen);
        if (randomMove) {
          const result = tryMakeMove(randomMove);
          if (result) {
            console.log('[CoachGame] Fallback random move played:', result.san);
            applyCoachMove(result, 0);
            return;
          }
        }
        console.error('[CoachGame] All move attempts failed');
      } finally {
        // Only clear thinking state if this operation wasn't cancelled.
        // If cancelled, the cleanup function already handled it.
        if (!isCancelled()) {
          setIsCoachThinking(false);
        }
      }
    };

    // Small delay to feel natural
    const timer = setTimeout(() => void makeCoachMove(), 800);

    return () => {
      abortController.abort();
      clearTimeout(timer);
      setIsCoachThinking(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depend on specific game properties, not the whole object
  }, [game.turn, game.fen, game.isGameOver, gameState.status, playerColor, targetStrength, game.makeMove, requestedOpeningMoves]);

  // Handle player move
  const handlePlayerMove = useCallback(async (moveResult: MoveResult) => {
    // Clear any coach annotations, hints, and reset move navigation when player moves
    handleBackToGame();
    setViewedMoveIndex(null);
    resetHints();
    prevNudgeRef.current = null;

    // Capture pre-move FEN before making the move
    const preFen = game.fen;
    previousFenRef.current = preFen;

    // NOTE: We intentionally defer game.makeMove() until after analysis.
    // Calling it here would flip game.turn to the coach's color, and because
    // the analysis below is async, React would re-render between awaits,
    // allowing the coach-move useEffect to fire before we know whether this
    // move is a blunder.  Deferring keeps game.turn on the player's color
    // throughout the analysis window, preventing the coach from responding
    // prematurely.
    setCoachLastMove(null);
    moveCountRef.current += 1;

    // Analyze the position AFTER the player's move (for eval bar + post-move eval)
    let analysis: StockfishAnalysis | null = null;
    try {
      analysis = await stockfishEngine.analyzePosition(moveResult.fen, 12);
    } catch {
      // If analysis fails, default to 'good'
    }

    // Analyze the position BEFORE the player's move (for best move comparison)
    let preAnalysis: StockfishAnalysis | null = null;
    try {
      preAnalysis = await stockfishEngine.analyzePosition(preFen, 12);
    } catch {
      // If pre-analysis fails, we'll use simpler classification
    }

    // Update eval bar + engine lines
    if (analysis) {
      setLatestEval(analysis.evaluation);
      setLatestIsMate(analysis.isMate);
      setLatestMateIn(analysis.mateIn);
      setLatestTopLines(analysis.topLines);
    }

    // Check if the player played the engine's best move
    const playerUci = moveResult.from + moveResult.to + (moveResult.promotion ?? '');
    const isEngineBestMove = preAnalysis?.bestMove === playerUci;
    const bestMoveEval = preAnalysis?.topLines[0]?.evaluation ?? null;
    const secondBestEval = preAnalysis?.topLines[1]?.evaluation ?? null;

    // Compute classification and build the move record
    const prevMoves = gameState.moves;
    const preMoveEval = prevMoves.length > 0 ? (prevMoves[prevMoves.length - 1].evaluation ?? null) : 0;
    let classification = analysis
      ? classifyMove(preMoveEval, analysis.evaluation, bestMoveEval, isEngineBestMove, playerColor, secondBestEval)
      : 'good';

    const evalLoss = analysis && preMoveEval !== null
      ? Math.max(0, playerColor === 'white'
          ? preMoveEval - analysis.evaluation
          : analysis.evaluation - preMoveEval)
      : 0;

    // bestMove from pre-analysis = what the player SHOULD have played (convert UCI → SAN)
    const engineBestMoveUci = preAnalysis?.bestMove ?? null;
    let engineBestMoveSan = '?';
    if (engineBestMoveUci) {
      try {
        engineBestMoveSan = uciMoveToSan(engineBestMoveUci, preFen);
      } catch {
        engineBestMoveSan = engineBestMoveUci;
      }
    }

    // If the engine's best move matches what the player played, override to 'good'
    if (isEngineBestMove || engineBestMoveSan === moveResult.san) {
      classification = 'good';
    }

    // Run deterministic tactic classifier on the move
    let tacticSuffix = '';
    if (analysis) {
      try {
        const tacticResult = classifyPosition(
          preFen,
          moveResult.fen,
          moveResult.san,
          preMoveEval ?? 0,
          analysis.evaluation,
        );
        const realTactics = tacticResult.tactics.filter((t) => t.type !== 'none');
        if (realTactics.length > 0) {
          tacticSuffix = ` (${realTactics.map((t) => t.description).join('; ')})`;
        }
        if (tacticResult.hangingPieces.length > 0) {
          const hangingDescs = tacticResult.hangingPieces.map(
            (p) => `${p.color === 'w' ? 'White' : 'Black'} ${p.piece} on ${p.square}`,
          );
          tacticSuffix += ` Hanging: ${hangingDescs.join(', ')}.`;
        }
      } catch {
        // Tactic classification failed, continue without it
      }
    }

    // LLM commentary is gated on the user's coachCommentaryVerbosity
    // preference (default 'key-moments'). On non-key moves we skip the
    // LLM entirely and fall back to the deterministic tacticSuffix,
    // which cuts per-game LLM spend ~60% without losing the
    // pedagogically important commentary on blunders/brilliants.
    //
    // EXCEPTION: when a subject is set AND we're still in opening
    // theory (book depth OR configured book length), fire the LLM on
    // every move so the coach can teach the opening ideas in real
    // time. "Key moments only" would skip most opening book moves
    // because they classify as 'book' / 'best', killing the feature.
    let commentary = '';
    const verbosity = resolveVerbosity(useAppStore.getState().activeProfile);
    // Narration density — separate from the commentary-gate verbosity
    // above. Honors the user's Settings toggle (none/fast/medium/slow)
    // so the LLM output matches the chosen depth. 'none' short-circuits
    // the LLM call entirely so no tokens are burned producing text
    // we'd throw away.
    const narrationDensity =
      useAppStore.getState().activeProfile?.preferences.coachVerbosity ?? 'unlimited';
    const bookDepth = requestedOpeningMoves?.length ?? 0;
    const inOpeningTeaching =
      !!subjectParam && game.history.length <= Math.max(bookDepth, 12);
    const shouldFire =
      narrationDensity !== 'none' &&
      (inOpeningTeaching || shouldCallLlmForMove(verbosity, classification));
    if (shouldFire) {
      try {
        // safeChessFromFen returns null on malformed FEN instead of
        // throwing — a corrupt FEN here would previously tank the
        // whole narration pipeline for the move. Now we bail early
        // and still announce the SAN via the fallback path.
        const probe = safeChessFromFen(moveResult.fen);
        if (!probe) {
          console.warn('[CoachGame] bad FEN for narration probe:', moveResult.fen);
          return;
        }
        const mover: 'w' | 'b' = probe.turn() === 'w' ? 'b' : 'w';
        // Pull recent chat from the shared session store so narration
        // stays consistent with what was just said in chat.
        const sessionMessages = useCoachSessionStore.getState().messages;

        // In opening-teaching mode, ground the commentary in REAL
        // Lichess + engine data: pull the Opening Explorer for the
        // current position, cloud-eval each popular candidate on its
        // RESULTING position, and run the trap detector on the
        // combined result. The fetch is best-effort — wrapped in
        // withTimeout so a slow Lichess response never stalls
        // narration; failures fall through to prose without the
        // numbers.
        const groundedNotes: string[] = [];
        if (inOpeningTeaching) {
          try {
            const explorer = await withTimeout(
              fetchLichessExplorer(probe.fen(), 'lichess'),
              LICHESS_FETCH_TIMEOUT_MS,
            );
            if (explorer.moves && explorer.moves.length > 0) {
              const topMoves = explorer.moves
                .slice(0, 5)
                .map((m) => {
                  const total = m.white + m.draws + m.black;
                  const whitePct = total ? Math.round((m.white + m.draws * 0.5) / total * 100) : 0;
                  return `- ${m.san}: ${total.toLocaleString()} games, ${whitePct}% for White`;
                })
                .join('\n');
              const openingLabel = explorer.opening
                ? ` (${explorer.opening.eco} ${explorer.opening.name})`
                : '';
              groundedNotes.push(
                `[Lichess Opening Explorer at current position${openingLabel}]\n${topMoves}`,
              );

              // Trap detection — cloud-eval each top explorer move on
              // its RESULTING position to get a correct per-candidate
              // eval. The prior implementation paired explorer moves
              // (ranked by popularity) with Stockfish top-lines
              // (ranked by strength) by array index. Those arrays
              // don't align, so the detector was reading the wrong
              // eval for the wrong move. Now each candidate is
              // evaluated on its own resulting FEN; missing cloud
              // evals (404) are skipped, never misattributed.
              const evaluations = await evaluateExplorerCandidates(
                probe.fen(),
                explorer.moves.slice(0, 5).map((m) => m.san),
                mover,
              );
              if (evaluations.length > 0) {
                const trap = detectTrapInPosition({
                  explorer,
                  evaluations,
                  engineBestSan: engineBestMoveSan !== '?' ? engineBestMoveSan : undefined,
                  // Gate against the CURRENT legal-move set so an
                  // explorer/FEN mismatch can't surface a trap for a
                  // move that isn't playable right now.
                  legalSan: probe.moves(),
                });
                if (trap) {
                  groundedNotes.push(formatTrapForPrompt(trap));
                }
              }
            }
          } catch (err: unknown) {
            console.warn('[CoachGame] Lichess explorer fetch failed:', err);
          }
        }

        // Recent move classifications — feeds the [StudentState] block
        // so the coach can read the rhythm (just blundered? on a
        // streak?) and adapt tone. Take the newest 5.
        const recentMoveClassifications = gameState.moves
          .slice(-5)
          .map((m) => m.classification);
        // Tempo signal: time of the PREVIOUS user interaction (chat
        // message or board move), not "now". The builder treats <2s
        // as no-signal, so passing Date.now() always flagged FAST
        // and forced the LLM into "keep replies tight" mode — that
        // cancelled out Unlimited verbosity. Use the newest user
        // chat message timestamp (the student's last typed/spoken
        // turn); undefined when there is none so the block skips
        // tempo entirely.
        const lastUserChatMs = [...sessionMessages]
          .reverse()
          .find((m) => m.role === 'user')?.timestamp;

        const llm = await generateMoveCommentary({
          gameAfter: probe,
          mover,
          evalBefore: preMoveEval,
          evalAfter: analysis?.evaluation ?? null,
          bestReplySan: engineBestMoveSan !== '?' ? engineBestMoveSan : undefined,
          chatHistory: sessionMessages,
          // Threading the URL subject here activates the OPENING
          // TEACHING MODE branch of PLAY_SYSTEM_PROMPT.
          subject: subjectParam ?? undefined,
          verbosity: narrationDensity,
          groundedNotes,
          recentMoveClassifications,
          lastUserInteractionMs: lastUserChatMs,
        });
        commentary = llm ? llm + tacticSuffix : tacticSuffix.trim();
        // Mirror the commentary into the shared session so the next
        // chat turn (or the next move's narration) sees what we just
        // said. Skip empties and pure tactic suffixes — we only record
        // real narration.
        if (llm) {
          useCoachSessionStore.getState().appendMessage({
            id: `narr-${Date.now()}`,
            role: 'assistant',
            content: llm,
            timestamp: Date.now(),
          });
        }
      } catch {
        commentary = tacticSuffix.trim();
      }
    } else {
      // Non-key move — skip the LLM. The tactic classifier may still
      // have found something worth noting (hanging piece, fork motif);
      // keep that so the user isn't staring at a blank row.
      commentary = tacticSuffix.trim();
    }
    // Keep evalLoss referenced even when we drop the template so it's
    // still available for classification decisions above.
    void evalLoss;

    const playerMove: CoachGameMove = {
      moveNumber: moveCountRef.current,
      san: moveResult.san,
      fen: moveResult.fen,
      isCoachMove: false,
      commentary,
      evaluation: analysis?.evaluation ?? null,
      classification,
      expanded: false,
      bestMove: engineBestMoveUci,
      bestMoveEval: bestMoveEval,
      preMoveEval,
    };

    // Flash the board based on classification (map to MoveQuality type)
    const flashMap = new Map<string, 'blunder' | 'inaccuracy' | 'good'>([
      ['blunder', 'blunder'],
      ['mistake', 'blunder'],
      ['inaccuracy', 'inaccuracy'],
      ['brilliant', 'good'],
      ['great', 'good'],
    ]);
    const flash = flashMap.get(classification);
    if (flash) {
      triggerMoveFlash(flash);
    }

    // BLUNDER INTERCEPTION: pause game and explain
    if (classification === 'blunder' && engineBestMoveUci) {
      const explanation = commentary;

      // Sync the blunder move onto the game instance so undoMove() in
      // handleBlunderTryBestMove / handleBlunderTakeBack can reverse it.
      // Status is set to 'blunder_pause' in the same synchronous block,
      // so the coach-move useEffect never sees 'playing' + coach's turn.
      game.makeMove(moveResult.from, moveResult.to, moveResult.promotion);

      setBlunderPause({
        explanation,
        bestMoveSan: engineBestMoveSan,
        bestMoveUci: engineBestMoveUci,
        preFen,
        playerMoveSan: moveResult.san,
      });

      setGameState((prev) => ({
        ...prev,
        status: 'blunder_pause',
        moves: [...prev.moves, playerMove],
        currentHintLevel: 0,
      }));

      // Voice the explanation — stop any in-flight TTS first so a
      // previous narration or voice-chat reply doesn't overlap.
      voiceService.stop();
      void voiceService.speak(explanation);
      return;
    }

    // Non-blunder: sync the move and let the coach-move useEffect respond.
    game.makeMove(moveResult.from, moveResult.to, moveResult.promotion);

    // Speak the per-move commentary aloud. Two gates:
    //  - If narration mode is on (user asked the coach to narrate),
    //    always announce the move — use LLM commentary when it landed,
    //    otherwise a short SAN fallback. This is the belt-and-
    //    suspenders path so silence never happens mid-game.
    //  - Else the legacy path: speak only LLM commentary, only when
    //    coachVoiceOn is true.
    if (useCoachSessionStore.getState().narrationMode) {
      const mover: 'w' | 'b' = playerColor === 'white' ? 'w' : 'b';
      // Stop any in-flight TTS (a stale voice-chat reply still playing,
      // an earlier move's narration that overran) before the next move
      // speaks. Prevents the "I hear two narrations at once" overlap.
      voiceService.stop();
      narrateMove({
        san: moveResult.san,
        mover,
        playerColor: mover,
        commentary: commentary.trim() || null,
      });
    } else if (commentary.trim() && useAppStore.getState().coachVoiceOn) {
      voiceService.stop();
      void voiceService.speak(commentary.trim());
    }

    setGameState((prev) => ({
      ...prev,
      moves: [...prev.moves, playerMove],
      currentHintLevel: 0,
    }));
  }, [game, handleBackToGame, resetHints, playerColor, gameState.moves, triggerMoveFlash]);

  // Handle practice move (when in chat-driven practice mode)
  const handlePracticeMove = useCallback(async (moveResult: MoveResult) => {
    const result = await evaluatePracticeMove(moveResult);
    coachSay(result.message);
  }, [evaluatePracticeMove, coachSay]);

  // Handle board move routing — explore mode, practice mode, or normal gameplay
  const handleBoardMoveRouted = useCallback((moveResult: MoveResult) => {
    if (isExploreMode) {
      handleExploreMove(moveResult);
    } else if (practicePosition) {
      void handlePracticeMove(moveResult);
    } else {
      void handlePlayerMove(moveResult);
    }
  }, [isExploreMode, handleExploreMove, practicePosition, handlePracticeMove, handlePlayerMove]);

  // Handle practice-in-chat from post-game review
  const handlePracticeInChat = useCallback((prompt: string) => {
    // Transition from postgame back to playing mode with chat
    game.resetGame();
    moveCountRef.current = 0;
    setGameState({
      gameId: `game-${Date.now()}`,
      playerColor,
      targetStrength,
      moves: [],
      hintsUsed: 0,
      currentHintLevel: 0,
      takebacksUsed: 0,
      status: 'playing',
      result: 'ongoing',
      keyMoments: [],
    });
    setLatestEval(0);
    setLatestIsMate(false);
    setLatestMateIn(null);
    setViewedMoveIndex(null);
    setRequestedOpeningMoves(null);
    setPendingChatPrompt(prompt);
  }, [game, playerColor, targetStrength]);

  // Hint request — uses 3-tier visual hint system
  const handleHint = useCallback(() => {
    requestHint();
    setGameState((prev) => ({
      ...prev,
      currentHintLevel: Math.min(prev.currentHintLevel + 1, 3) as 0 | 1 | 2 | 3,
      hintsUsed: prev.hintsUsed + 1,
    }));
  }, [requestHint]);

  // Takeback — always undo two half-moves (opponent's reply + player's move)
  const handleTakeback = useCallback(() => {
    const moves = gameState.moves;
    if (moves.length === 0) return;
    // Undo the coach's reply + the player's previous move so it's the
    // player's turn again. When only the player's move exists (coach
    // hasn't replied, or we're taking the first half-move of the game
    // back), undo just that one. Lets the user tap Takeback repeatedly
    // all the way back to the starting position.
    const undoCount = Math.min(2, moves.length);

    for (let i = 0; i < undoCount; i++) {
      game.undoMove();
    }
    moveCountRef.current = Math.max(0, moveCountRef.current - undoCount);
    resetHints();
    prevNudgeRef.current = null;

    setGameState((prev) => ({
      ...prev,
      moves: prev.moves.slice(0, -undoCount),
      takebacksUsed: prev.takebacksUsed + 1,
    }));

    const msg = getScenarioTemplate('takeback_allowed');
    coachSay(msg);
  }, [game, coachSay, resetHints, gameState.moves]);

  // ─── Blunder Interception Handlers ──────────────────────────────────────
  const handleBlunderContinue = useCallback(() => {
    voiceService.stop();
    setBlunderPause(null);
    setGameState((prev) => ({ ...prev, status: 'playing' }));
  }, []);

  const handleBlunderTakeBack = useCallback(() => {
    voiceService.stop();
    // Undo just the player's move (coach hasn't responded yet during blunder_pause)
    game.undoMove();
    moveCountRef.current = Math.max(0, moveCountRef.current - 1);
    resetHints();
    prevNudgeRef.current = null;

    setBlunderPause(null);
    setGameState((prev) => ({
      ...prev,
      status: 'playing',
      moves: prev.moves.slice(0, -1),
      takebacksUsed: prev.takebacksUsed + 1,
    }));
  }, [game, resetHints]);

  const handleBlunderTryBestMove = useCallback(() => {
    voiceService.stop();
    if (!blunderPause) return;

    // Undo the blunder move
    game.undoMove();
    moveCountRef.current = Math.max(0, moveCountRef.current - 1);
    resetHints();
    prevNudgeRef.current = null;

    // Apply the best move instead
    const bestMoveUci = blunderPause.bestMoveUci;
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);
    const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
    const result = game.makeMove(from, to, promotion);

    if (result) {
      moveCountRef.current += 1;
      const bestMove: CoachGameMove = {
        moveNumber: moveCountRef.current,
        san: result.san,
        fen: result.fen,
        isCoachMove: false,
        commentary: `Great! ${blunderPause.bestMoveSan} is the right move here.`,
        evaluation: null,
        classification: 'great',
        expanded: false,
        bestMove: bestMoveUci,
        bestMoveEval: null,
        preMoveEval: null,
      };

      setBlunderPause(null);
      setGameState((prev) => ({
        ...prev,
        status: 'playing',
        moves: [...prev.moves.slice(0, -1), bestMove],
        takebacksUsed: prev.takebacksUsed + 1,
      }));
    } else {
      // If best move failed, just take back
      setBlunderPause(null);
      setGameState((prev) => ({
        ...prev,
        status: 'playing',
        moves: prev.moves.slice(0, -1),
        takebacksUsed: prev.takebacksUsed + 1,
      }));
    }
  }, [game, resetHints, blunderPause]);

  // Derive opponent/player info for PlayerInfoBar
  const isPlayerWhite = playerColor === 'white';
  const playerName = activeProfile?.name ?? 'Player';
  const opponentName = 'Stockfish Bot';
  const isPlayerTurn = (isPlayerWhite && game.turn === 'w') || (!isPlayerWhite && game.turn === 'b');

  // Guided Lesson Mode — review a past game
  if (reviewGameId) {
    if (reviewLoading) {
      return (
        <div className="flex items-center justify-center h-dvh" data-testid="coach-game-page">
          <div className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm">Loading game...</span>
          </div>
        </div>
      );
    }

    if (!reviewGame || !reviewMoves) {
      return (
        <div className="flex flex-col items-center justify-center h-dvh gap-3" data-testid="coach-game-page">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Game not found.</p>
          <button
            onClick={() => void navigate('/coach')}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          >
            Back to Coach
          </button>
        </div>
      );
    }

    const reviewPlayerColor: 'white' | 'black' = reviewGame.white !== 'Stockfish Bot' && reviewGame.white !== 'AI Coach' ? 'white' : 'black';
    const reviewPlayerName = reviewPlayerColor === 'white' ? reviewGame.white : reviewGame.black;
    const reviewOpponentRating = reviewPlayerColor === 'white' ? (reviewGame.blackElo ?? 1500) : (reviewGame.whiteElo ?? 1500);
    const reviewPlayerRating = reviewPlayerColor === 'white' ? (reviewGame.whiteElo ?? playerRating) : (reviewGame.blackElo ?? playerRating);

    return (
      <div className="flex flex-col md:flex-row h-full overflow-hidden" data-testid="coach-game-page">
        <CoachGameReview
          moves={reviewMoves}
          keyMoments={[]}
          playerColor={reviewPlayerColor}
          result={reviewGame.result}
          openingName={reviewGame.openingId}
          playerName={reviewPlayerName}
          playerRating={reviewPlayerRating}
          opponentRating={reviewOpponentRating}
          onPlayAgain={() => void navigate('/coach/play')}
          onBackToCoach={() => void navigate(startMoveParam ? '/coach/report' : '/coach')}
          isGuidedLesson
          pgn={reviewGame.pgn}
          initialMoveIndex={startMoveParam ? parseInt(startMoveParam, 10) : undefined}
        />
      </div>
    );
  }

  // Game-over overlay — show final position with checkmate/result before review
  if (gameState.status === 'gameover') {
    const resultLabel = gameState.result === 'win' ? 'Victory!' : gameState.result === 'loss' ? 'Defeat' : 'Draw';
    const resultColor = gameState.result === 'win' ? 'var(--color-success)' : gameState.result === 'loss' ? 'var(--color-error)' : 'var(--color-warning)';
    const resultDetail = game.isCheckmate
      ? 'Checkmate'
      : game.isStalemate
        ? 'Stalemate'
        : game.isDraw
          ? 'Draw'
          : 'Game Over';

    return (
      <div className="flex flex-col md:flex-row h-full overflow-hidden" data-testid="coach-game-page">
        <div className="flex flex-col flex-1 items-center justify-center min-h-0 relative">
          {/* Opponent info */}
          <div className="px-2 pt-1 w-full md:max-w-[460px]">
            <PlayerInfoBar
              name={opponentName}
              rating={targetStrength}
              isBot
              capturedPieces={isPlayerWhite ? capturedPieces.black : capturedPieces.white}
              materialAdvantage={isPlayerWhite ? Math.max(0, -materialAdv) : Math.max(0, materialAdv)}
              isActive={false}
            />
          </div>

          {/* Board with overlay */}
          <div className="px-2 py-1 flex justify-center relative w-full">
            <div className="w-full md:max-w-[420px] relative">
              <ChessBoard
                initialFen={game.fen}
                orientation={playerColor}
                interactive={false}
                showEvalBar={showEvalBarEffective}
                evaluation={latestEval}
                isMate={latestIsMate}
                mateIn={latestMateIn}
                showFlipButton={false}
                highlightSquares={coachLastMove}
              />
              {/* Result overlay */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              >
                <div
                  className="rounded-2xl px-8 py-5 flex flex-col items-center gap-1 shadow-2xl"
                  style={{
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span className="text-3xl font-black tracking-tight" style={{ color: resultColor }}>
                    {resultLabel}
                  </span>
                  <span className="text-sm font-medium text-white/80">
                    {resultDetail}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Player info */}
          <div className="px-2 w-full md:max-w-[460px]">
            <PlayerInfoBar
              name={playerName}
              rating={playerRating}
              capturedPieces={isPlayerWhite ? capturedPieces.white : capturedPieces.black}
              materialAdvantage={isPlayerWhite ? Math.max(0, materialAdv) : Math.max(0, -materialAdv)}
              isActive={false}
            />
          </div>

          {/* Skip to review button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-4"
          >
            <button
              onClick={() => setGameState((prev) => ({ ...prev, status: 'postgame' }))}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
              data-testid="skip-to-review-btn"
            >
              Review Game &rarr;
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Post-game review — same two-column layout as gameplay
  if (gameState.status === 'postgame') {
    return (
      <div className="flex flex-col md:flex-row h-full overflow-hidden" data-testid="coach-game-page">
        <CoachGameReview
          moves={gameState.moves}
          keyMoments={gameState.keyMoments}
          playerColor={playerColor}
          result={gameState.result === 'ongoing' ? 'draw' : gameState.result}
          openingName={detectedOpening?.name ?? null}
          playerName={playerName}
          playerRating={playerRating}
          opponentRating={targetStrength}
          onPlayAgain={() => {
            game.resetGame();
            moveCountRef.current = 0;
            setGameState({
              gameId: `game-${Date.now()}`,
              playerColor,
              targetStrength,
              moves: [],
              hintsUsed: 0,
              currentHintLevel: 0,
              takebacksUsed: 0,
              status: 'playing',
              result: 'ongoing',
              keyMoments: [],
            });
            setLatestEval(0);
            setLatestIsMate(false);
            setLatestMateIn(null);
            setViewedMoveIndex(null);
            setRequestedOpeningMoves(null);
            resetHints();
            prevNudgeRef.current = null;
          }}
          onBackToCoach={() => void navigate('/coach')}
          onPracticeInChat={handlePracticeInChat}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden" data-testid="coach-game-page">
      {/* Left column: board + controls */}
      <div className="flex flex-col flex-1 md:flex-none md:w-3/5 min-h-0 overflow-y-auto">
        {/* Header — two rows for compact mobile layout */}
        <div className="px-3 py-2 md:p-4 border-b border-theme-border space-y-1.5">
          {/* Row 1: Back + title + color selector + analysis toggles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <button onClick={() => void navigate('/coach')} className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center">
                <ArrowLeft size={20} className="text-theme-text" />
              </button>
              <div>
                <h2 className="text-sm font-semibold text-theme-text">
                  vs Stockfish Bot
                </h2>
                <p className="text-xs text-theme-text-muted">
                  ~{targetStrength} ELO
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              {/* Color selector */}
              <div className="flex items-center gap-0.5 rounded-lg border border-theme-border p-0.5" data-testid="color-selector">
                <button
                  onClick={() => handleColorChange('white')}
                  disabled={gameState.moves.length > 0}
                  className={`w-6 h-6 md:w-7 md:h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 ${
                    playerColor === 'white' ? 'ring-2 ring-theme-accent ring-inset' : ''
                  }`}
                  aria-label="Play as white"
                  data-testid="color-white-btn"
                >
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-white border border-neutral-300" />
                </button>
                <button
                  onClick={() => handleColorChange('black')}
                  disabled={gameState.moves.length > 0}
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
          {/* Row 2: Difficulty toggle + Coach Tips button */}
          <div className="flex items-center justify-between pl-12 md:pl-14">
            <DifficultyToggle
              value={difficulty}
              onChange={setDifficulty}
              disabled={gameState.moves.length > 0}
            />
            <button
              onClick={toggleCoachTips}
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

        {/* Opponent info bar (top) */}
        <div className="px-2 pt-1">
          <PlayerInfoBar
            name={opponentName}
            rating={targetStrength}
            isBot
            capturedPieces={isPlayerWhite ? capturedPieces.black : capturedPieces.white}
            materialAdvantage={isPlayerWhite ? Math.max(0, -materialAdv) : Math.max(0, materialAdv)}
            isActive={!isPlayerTurn && !game.isGameOver}
          />
        </div>

        {/* Temporary position banner */}
        <AnimatePresence>
          {temporaryFen && !practicePosition && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="rounded-lg mx-2 mt-1 p-2.5 flex items-center justify-between overflow-hidden"
              style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))' }}
              data-testid="temp-position-banner"
            >
              <div className="flex items-center gap-2">
                <Eye size={14} style={{ color: 'var(--color-accent)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                  {temporaryLabel}
                </span>
              </div>
              <button
                onClick={handleBackToGame}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                data-testid="back-to-game-btn"
              >
                Back to Game
              </button>
            </motion.div>
          )}
          {practicePosition && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="rounded-lg mx-2 mt-1 p-2.5 flex items-center justify-between overflow-hidden"
              style={{ background: 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))' }}
              data-testid="practice-position-banner"
            >
              <div className="flex items-center gap-2">
                <Eye size={14} style={{ color: 'var(--color-success, var(--color-accent))' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                  Practice: {practicePosition.label}
                </span>
              </div>
              <button
                onClick={handleBackToGame}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                data-testid="exit-practice-btn"
              >
                Back to Game
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Tip Bubble (now flows ABOVE the board, no overlay) ────────
             Previously this was `absolute top-0` on top of the board so
             the user couldn't see/move the pieces underneath. Moved
             to a normal block-flow sibling above the board container.
             User report: tactic preview popup covered the board. */}
        <AnimatePresence>
          {tipBubbleText && gameState.status !== 'blunder_pause' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className={`mx-2 mb-1 rounded-xl backdrop-blur-md border px-3 py-2.5 shrink-0 ${
                isExploreMode
                  ? 'border-purple-500/30'
                  : tipTacticLine && !tipTacticLine.forPlayer
                    ? 'border-red-500/30'
                    : 'border-blue-500/30'
              }`}
              style={{
                background: isExploreMode
                  ? 'color-mix(in srgb, var(--color-bg) 85%, rgba(168, 85, 247, 0.3))'
                  : tipTacticLine && !tipTacticLine.forPlayer
                    ? 'color-mix(in srgb, var(--color-bg) 85%, rgba(239, 68, 68, 0.3))'
                    : 'color-mix(in srgb, var(--color-bg) 85%, rgba(59, 130, 246, 0.3))',
              }}
              data-testid="coach-tip-bubble"
            >
              {/* Header: icon + tip text */}
              <div className="flex items-start gap-2">
                {isExploreMode
                  ? <Compass size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
                  : tipTacticLine && !tipTacticLine.forPlayer
                    ? <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    : <GraduationCap size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--color-text)' }}>
                    {isExploreMode ? 'Explore Ahead — make moves freely and get coach reactions' : tipBubbleText}
                  </p>
                  {showingTacticLine && tipTacticLine && !isExploreMode && (
                    <p className="text-xs font-mono mt-1.5 font-semibold text-emerald-400" data-testid="tactic-line-moves">
                      {uciLinesToSan(tipTacticLine.uciMoves, tipTacticLine.fen, 6)}
                    </p>
                  )}
                </div>
              </div>

              {/* Show Mode: step navigation arrows */}
              {showingTacticLine && showFens.length > 0 && !isExploreMode && (
                <div className="flex items-center justify-center gap-3 mt-2" data-testid="show-step-nav">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShowPrev(); }}
                    disabled={showIndex <= 0}
                    className="p-1.5 rounded-md text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 transition-all duration-200"
                    aria-label="Previous show move"
                    data-testid="show-prev-btn"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }} data-testid="show-step-counter">
                    Move {showIndex + 1} of {showFens.length}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShowNext(); }}
                    disabled={showIndex >= showFens.length - 1}
                    className="p-1.5 rounded-md text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 transition-all duration-200"
                    aria-label="Next show move"
                    data-testid="show-next-btn"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Explore Mode: engine eval + scrollable coach reaction history */}
              {isExploreMode && (
                <div className="mt-2">
                  {/* Engine analysis bar */}
                  {exploreEval !== null && (
                    <div className="flex items-center gap-2 mb-2 px-1" data-testid="explore-engine-eval">
                      <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                        Eval:
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${
                        exploreIsMate
                          ? (exploreMateIn !== null && exploreMateIn > 0 ? 'text-emerald-400' : 'text-red-400')
                          : exploreEval > 50 ? 'text-emerald-400' : exploreEval < -50 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {exploreIsMate ? `M${exploreMateIn}` : `${exploreEval > 0 ? '+' : ''}${(exploreEval / 100).toFixed(1)}`}
                      </span>
                      {exploreTopLines.length > 0 && exploreTopLines[0].moves.length > 0 && (
                        <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                          Best: {(() => {
                            try { return uciMoveToSan(exploreTopLines[0].moves[0], exploreFen ?? ''); } catch { return exploreTopLines[0].moves[0]; }
                          })()}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Scrollable reaction messages */}
                  <div
                    ref={exploreChatRef}
                    className="max-h-24 overflow-y-auto space-y-1.5 scrollbar-thin"
                    data-testid="explore-messages"
                  >
                    {exploreMessages.filter((m) => m.role === 'assistant').map((msg, i) => (
                      <p key={i} className="text-xs leading-relaxed px-1" style={{ color: 'var(--color-text)' }}>
                        {msg.content}
                      </p>
                    ))}
                    {isExploreReacting && (
                      <div className="flex items-center gap-1.5 px-1">
                        <Loader2 size={10} className="animate-spin text-purple-400" />
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Thinking...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-2">
                {/* Show button — only when tactic line is available and not yet showing */}
                {tipTacticLine && !showingTacticLine && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShowTactic(); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all duration-200"
                    style={{
                      background: 'rgba(52, 211, 153, 0.15)',
                      color: 'rgb(52, 211, 153)',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      boxShadow: '0 0 6px rgba(52, 211, 153, 0.2)',
                    }}
                    data-testid="show-tactic-line-btn"
                  >
                    <Eye size={12} />
                    Show
                  </button>
                )}
                {/* Explore from here button — available during show mode, not during explore */}
                {showingTacticLine && showIndex >= 0 && !isExploreMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEnterExplore(); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all duration-200"
                    style={{
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: 'rgb(168, 85, 247)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      boxShadow: '0 0 6px rgba(168, 85, 247, 0.2)',
                    }}
                    data-testid="explore-from-here-btn"
                  >
                    <Compass size={12} />
                    Explore from here
                  </button>
                )}
                {/* Dismiss button — always visible */}
                <button
                  onClick={handleDismissTip}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors"
                  style={{
                    background: 'rgba(148, 163, 184, 0.1)',
                    color: 'var(--color-text-muted)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                  data-testid="dismiss-tip-btn"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Board — flex-shrink-0 so it never shrinks regardless of content above/below */}
        <div className="px-2 py-1 flex justify-center flex-shrink-0">
          <div className="w-full md:max-w-[420px] relative">
            <ChessBoard
              key={`${gameState.gameId}-${playerColor}-${practicePosition?.fen ?? ''}-${practiceAttempts}-${exploreFen ?? ''}`}
              initialFen={displayFen}
              orientation={playerColor}
              interactive={(gameState.status === 'playing' && !isCoachThinking && !temporaryFen && viewedMoveIndex === null) || !!practicePosition || isExploreMode}
              onMove={handleBoardMoveRouted}
              showEvalBar={showEvalBarEffective || isExploreMode}
              evaluation={isExploreMode && exploreEval !== null ? exploreEval : latestEval}
              isMate={isExploreMode ? exploreIsMate : latestIsMate}
              mateIn={isExploreMode ? exploreMateIn : latestMateIn}
              moveQualityFlash={moveFlash}
              showFlipButton={false}
              showVoiceMic={false}
              highlightSquares={coachLastMove}
              arrows={[...hintState.arrows, ...annotationArrows, ...voiceArrows].length > 0 ? [...hintState.arrows, ...annotationArrows, ...voiceArrows] : undefined}
              annotationHighlights={annotationHighlights.length > 0 ? annotationHighlights : undefined}
              ghostMove={hintState.ghostMove}
              pgnForChat={game.history.join(' ')}
              onOpeningRequest={handleOpeningRequest}
              voiceEngineSnapshot={voiceEngineSnapshot}
              voiceLastMoveContext={voiceLastMoveContext}
              voicePlayerColor={playerColor}
              onVoiceActiveChange={setVoiceActive}
              onVoiceArrows={handleVoiceArrows}
            />

            {/* ─── Blunder Interception Overlay (on board) ──────────────────── */}
            <AnimatePresence>
              {gameState.status === 'blunder_pause' && blunderPause && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-0 left-0 right-0 z-20 rounded-t-2xl border-t-2 border-x-2 border-red-500/40 backdrop-blur-md overflow-hidden"
                  style={{ background: 'color-mix(in srgb, var(--color-error, #ef4444) 12%, var(--color-bg) 88%)' }}
                  data-testid="blunder-interception"
                >
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                      <span className="font-bold text-red-400 text-sm">Blunder Detected</span>
                    </div>
                    <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--color-text)' }}>
                      {blunderPause.explanation}
                    </p>
                  </div>
                  <div className="flex gap-2 px-3 pb-3">
                    <button
                      onClick={handleBlunderContinue}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border border-theme-border transition-colors"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
                      data-testid="blunder-continue"
                    >
                      Continue
                    </button>
                    <button
                      onClick={handleBlunderTakeBack}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                      style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                      data-testid="blunder-takeback"
                    >
                      Take Back
                    </button>
                    <button
                      onClick={handleBlunderTryBestMove}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 border-green-500/40 transition-colors"
                      style={{ background: 'color-mix(in srgb, var(--color-success, #22c55e) 15%, var(--color-surface))', color: 'var(--color-text)' }}
                      data-testid="blunder-try-best"
                    >
                      Try {blunderPause.bestMoveSan}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
          {isExploreMode && exploreTopLines.length > 0 && (
            <EngineLines lines={exploreTopLines} fen={exploreFen ?? ''} className="mt-1" />
          )}
          {!isExploreMode && showEngineLinesEffective && latestTopLines.length > 0 && (
            <EngineLines lines={latestTopLines} fen={game.fen} className="mt-1" />
          )}
        </div>

        {/* Player info bar (bottom) — rating shown in header, omitted here */}
        <div className="px-2">
          <PlayerInfoBar
            name={playerName}
            capturedPieces={isPlayerWhite ? capturedPieces.white : capturedPieces.black}
            materialAdvantage={isPlayerWhite ? Math.max(0, materialAdv) : Math.max(0, -materialAdv)}
            isActive={isPlayerTurn && !game.isGameOver}
          />
        </div>

        {/* Controls */}
        {gameState.status === 'playing' && (
          <div className="flex flex-col gap-1.5 px-4 py-2 flex-shrink-0">
            {/* Row 1: Hint, Takeback, Resign — primary actions */}
            <div className="flex items-center justify-center gap-2">
              <HintButton
                currentLevel={hintState.level}
                onRequestHint={handleHint}
                disabled={isCoachThinking || hintState.isAnalyzing}
              />
              <button
                onClick={handleTakeback}
                disabled={gameState.moves.length === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-amber-500/30 text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 disabled:opacity-30 transition-all duration-200"
                style={{ boxShadow: '0 0 10px rgba(245, 158, 11, 0.25), 0 0 3px rgba(245, 158, 11, 0.15)' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 18px rgba(245, 158, 11, 0.45), 0 0 6px rgba(245, 158, 11, 0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.25), 0 0 3px rgba(245, 158, 11, 0.15)'; }}
                data-testid="takeback-btn"
              >
                <Undo2 size={16} />
                <span>Takeback</span>
              </button>
              <button
                onClick={() => handleRestart()}
                disabled={gameState.moves.length === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-cyan-500/30 text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 transition-all duration-200"
                style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.25), 0 0 3px rgba(6, 182, 212, 0.15)' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 18px rgba(6, 182, 212, 0.45), 0 0 6px rgba(6, 182, 212, 0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 10px rgba(6, 182, 212, 0.25), 0 0 3px rgba(6, 182, 212, 0.15)'; }}
                data-testid="restart-btn"
                aria-label="Restart game"
              >
                <RotateCcw size={16} />
                <span>Restart</span>
              </button>
              <ResignButton onResign={handleResign} disabled={gameState.moves.length === 0} />
            </div>

            {/* Row 2: Ask (voice) button */}
            <div className="flex justify-center">
              <VoiceChatMic
                fen={game.fen}
                pgn={game.history.join(' ')}
                turn={game.turn}
                onOpeningRequest={handleOpeningRequest}
                engineSnapshot={voiceEngineSnapshot}
                lastMoveContext={voiceLastMoveContext}
                playerColor={playerColor}
                onListeningChange={setVoiceActive}
                onArrows={handleVoiceArrows}
              />
            </div>

            {/* Row 3: Move navigation */}
            <div className="flex items-center justify-center gap-0.5" data-testid="move-nav">
              <button
                onClick={goToFirstMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === -1}
                className="p-2 md:p-1.5 rounded-md text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="First move"
                data-testid="nav-first"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={goToPrevMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === -1}
                className="p-2 md:p-1.5 rounded-md text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Previous move"
                data-testid="nav-prev"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToNextMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === null}
                className="p-2 md:p-1.5 rounded-md text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Next move"
                data-testid="nav-next"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={goToLastMove}
                disabled={gameState.moves.length === 0 || viewedMoveIndex === null}
                className="p-2 md:p-1.5 rounded-md text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Last move"
                data-testid="nav-last"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Mobile: swipeable chat drawer + toggle button */}
      {isMobile && (
        <>
          <button
            onClick={() => setMobileChatOpen(true)}
            className="fixed z-30 flex items-center justify-center w-12 h-12 rounded-full bg-theme-accent text-white transition-transform hover:scale-105 active:scale-95"
            style={{
              right: '1rem',
              bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
            aria-label="Open chat"
            data-testid="mobile-chat-toggle"
          >
            <MessageCircle size={22} />
          </button>

          <MobileChatDrawer isOpen={mobileChatOpen} onClose={() => setMobileChatOpen(false)}>
            <GameChatPanel
              ref={gameChatRef}
              fen={game.fen}
              pgn={game.history.join(' ')}
              moveNumber={moveCountRef.current}
              playerColor={playerColor}
              turn={game.turn}
              isGameOver={game.isGameOver}
              gameResult={gameState.result}
              lastMove={game.lastMove && game.history.length > 0 ? { ...game.lastMove, san: game.history[game.history.length - 1] } : undefined}
              history={game.history}
              previousFen={previousFenRef.current}
              onBoardAnnotation={handleBoardAnnotation}
              onRestartGame={handleRestart}
              onPlayOpening={handleOpeningRequest}
              onPlayVariation={handlePlayVariation}
              onReturnToGame={handleReturnToGame}
              initialPrompt={pendingChatPrompt}
              initialMessages={initialChatMessages ?? undefined}
              onMessagesUpdate={handleChatMessagesUpdate}
              className="h-full"
            />
          </MobileChatDrawer>
        </>
      )}

      {/* Desktop: right column with move list + divider + chat */}
      {!isMobile && (
        <div
          ref={rightColumnRef}
          className="flex flex-col flex-1 border-l border-theme-border overflow-hidden"
        >
          <div
            className="min-h-0 overflow-hidden"
            style={{ height: `${100 - chatPercent}%` }}
          >
            <MoveListPanel
              moves={gameState.moves}
              openingName={detectedOpening?.name ?? null}
              currentMoveIndex={viewedMoveIndex !== null ? viewedMoveIndex : (gameState.moves.length > 0 ? gameState.moves.length - 1 : null)}
              className="h-full"
            />
          </div>

          <div
            className="flex-shrink-0 h-1.5 bg-theme-border hover:bg-theme-accent/50 cursor-row-resize flex items-center justify-center transition-colors"
            onPointerDown={handleDividerPointerDown}
            onPointerMove={handleDividerPointerMove}
            onPointerUp={handleDividerPointerUp}
            data-testid="panel-divider"
          >
            <div className="w-8 h-0.5 rounded-full bg-theme-text-muted/40" />
          </div>

          <div
            className="min-h-[120px] overflow-hidden"
            style={{ height: `${chatPercent}%` }}
          >
            <GameChatPanel
              ref={gameChatRef}
              fen={game.fen}
              pgn={game.history.join(' ')}
              moveNumber={moveCountRef.current}
              playerColor={playerColor}
              turn={game.turn}
              isGameOver={game.isGameOver}
              gameResult={gameState.result}
              lastMove={game.lastMove && game.history.length > 0 ? { ...game.lastMove, san: game.history[game.history.length - 1] } : undefined}
              history={game.history}
              previousFen={previousFenRef.current}
              onBoardAnnotation={handleBoardAnnotation}
              onRestartGame={handleRestart}
              onPlayOpening={handleOpeningRequest}
              onPlayVariation={handlePlayVariation}
              onReturnToGame={handleReturnToGame}
              initialPrompt={pendingChatPrompt}
            />
          </div>
        </div>
      )}
    </div>
  );
}
