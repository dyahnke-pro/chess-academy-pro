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
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ArrowLeft, Lightbulb, SkipBack, RefreshCw, Flag, Loader2, ChevronRight, X } from 'lucide-react';
import { ControlledChessBoard } from '../Board/ControlledChessBoard';
import { ChessBoard } from '../Board/ChessBoard';
import { NarrationArrowOverlay } from './NarrationArrowOverlay';
import { AnalysisToggles } from '../Board/AnalysisToggles';
import { useChessGame, type MoveResult } from '../../hooks/useChessGame';
import { useTeachWalkthrough } from '../../hooks/useTeachWalkthrough';
import { resolveWalkthroughTree } from '../../data/openingWalkthroughs';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { DifficultyToggle } from './DifficultyToggle';
import type { CoachDifficulty } from '../../types';
import { PlayerInfoBar } from './PlayerInfoBar';
import { coachService } from '../../coach/coachService';
import { anthropicProvider } from '../../coach/providers/anthropic';
import { logAppAudit } from '../../services/appAuditor';
import { sanitizeCoachText, sanitizeCoachStream, formatForSpeech, SENTENCE_END_RE } from '../../services/sanitizeCoachText';
import { parseBoardTags } from '../../services/boardAnnotationService';
import { voiceService } from '../../services/voiceService';
import { useAppStore } from '../../stores/appStore';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import { useSettings } from '../../hooks/useSettings';
import { db } from '../../db/schema';
import { analyzeRecentGames, gameNeedsAnalysis } from '../../services/gameAnalysisService';
import type { LiveState } from '../../coach/types';
import type { ChatMessage as ChatMessageType, BoardArrow, BoardHighlight } from '../../types';
import { stockfishEngine } from '../../services/stockfishEngine';
import { fetchLichessExplorer } from '../../services/lichessExplorerService';
import { withTimeout } from '../../coach/withTimeout';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const SUGGESTIONS = [
  'Walk me through the Vienna opening',
  'Teach me about pins and skewers',
  'Show me the Italian Game main line',
  'How do I attack a castled king?',
  'What is the Sicilian Defense and why play it?',
];

export function CoachTeachPage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);

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
  const [coachTipsOn, setCoachTipsOn] = useState<boolean>(true);
  const [evalBarOverride, setEvalBarOverride] = useState<boolean | null>(null);
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
  const latestEvalRef = useRef<{ fen: string; evalCp: number; mateIn: number | null } | null>(null);
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
    },
  ): Promise<void> => {
    if (!text.trim() || busy) return;
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
    if (!opts?.kickoff) {
      const TEACH_PATTERN =
        /\b(teach\s+me|walk\s+(?:me\s+)?through|show\s+me|let'?s\s+do|let'?s\s+go\s+over|let'?s\s+try|tell\s+me\s+about|drill|review)\b\s+(?:the\s+)?(.+?)(?:\s+(?:opening|defense|defence|game|gambit|attack|variation|line|system))?[.?!]*\s*$/i;
      const m = text.trim().match(TEACH_PATTERN);
      if (m && m[2]) {
        const tree = resolveWalkthroughTree(m[2].trim());
        if (tree) {
          const surfaceTurnId = `t-${Date.now()}-walkthrough-surface`;
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'CoachTeachPage.handleSubmit.surfaceRouting',
            summary: `surface-routed walkthrough: "${text.slice(0, 60)}" → ${tree.openingName}`,
          });
          // Show the user's ask in the transcript.
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
            fen: gameRef.current.fen,
            trigger: null,
          });
          // Acknowledge in chat so the student knows what's happening
          // (no LLM round-trip — the canned line ships instantly).
          // Walkthrough's own intro narration handles the spoken side;
          // we don't queue this canned line through Polly so voice
          // doesn't double-speak.
          const ack = `Sure — let's walk through the ${tree.openingName}.`;
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
          // Stop any in-flight TTS from a prior turn before the
          // walkthrough's intro narration starts speaking.
          voiceService.stop();
          walkthrough.start(tree);
          return;
        }
      }
    }

    setBusy(true);
    const turnId = `t-${Date.now()}`;
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
    // voice speaks that summary in full while the chat shows the
    // deeper teaching detail. We extract the first closed marker we
    // see and ignore further VOICE markers in the same turn —
    // rambling-by-multiple-markers is not the goal.
    let voiceRawBuffer = '';
    let voiceSpokenForTurn = false;
    /** `[VOICE: summary]` — captures inner content lazily so the
     *  marker closes on the first `]` rather than greedily consuming
     *  past it. Multi-line content allowed because the summary itself
     *  may span 3-4 sentences (positional, structural, plan). */
    const VOICE_MARKER_RE = /\[VOICE:\s*([\s\S]*?)\]/g;
    let lastQueuedSentence = '';
    const queueSpeak = (raw: string): void => {
      const sentence = formatForSpeech(raw);
      if (!sentence) return;
      if (sentence === lastQueuedSentence) return;
      lastQueuedSentence = sentence;
      speechChainRef.current = speechChainRef.current
        .then(() => {
          if (turnAbortRef.aborted) return;
          return voiceService.speakForcedPollyOnly(sentence);
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
      void logAppAudit({
        kind: 'coach-voice-marker-extracted',
        category: 'subsystem',
        source: 'CoachTeachPage.tryExtractVoiceMarker',
        summary: `extracted [VOICE: ...] block (${inner.length} chars)`,
        details: JSON.stringify({ length: inner.length, preview: inner.slice(0, 80) }),
      });
      queueSpeak(inner);
    };

    // Resolve the live FEN with the following priority:
    //   1. opts.fenOverride — required when handleSubmit is called
    //      from a board onMove (React hasn't re-rendered yet, so
    //      gameRef.current is one tick stale).
    //   2. gameRef.current — fresh after the next render commit, which
    //      covers async coach trips and chat-input submissions.
    // Derive turn from the FEN string ('w' or 'b' field) rather than
    // game.turn so override + turn always agree on the same FEN.
    const overrideFen = opts?.fenOverride;
    const liveGame = gameRef.current;
    const fen = overrideFen ?? liveGame.fen;
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
      ...(evalForAsk ?? {}),
      ...(lichessForAsk ?? {}),
    };

    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachTeachPage',
      summary: `surface=teach viaSpine=true ask="${text.slice(0, 60)}"`,
      details: JSON.stringify({ fen, turn: fenTurn, overrideFen: !!overrideFen }),
    });

    useCoachMemoryStore.getState().appendConversationMessage({
      surface: 'chat-teach',
      role: 'user',
      text,
      fen,
      trigger: null,
    });

    try {
      const result = await coachService.ask(
        { surface: 'teach', ask: text, liveState },
        {
          // /coach/teach is the ONLY surface that uses Anthropic. Every
          // other surface stays on DeepSeek (the brain default). Anthropic
          // gives Sonnet/Haiku for the teaching content; DeepSeek stays
          // cost-effective for play, chat, hints, etc.
          providerOverride: anthropicProvider,
          // 4 trips is enough: trip 1 thinks + tools (lichess /
          // stockfish), trip 2 emits play_move + teach text, trip 3-4
          // closes the prose. 6 was costing 18–30s of Opus latency
          // per turn; with liveFenRef preventing redundant retries
          // the budget can come down without losing coverage.
          maxToolRoundTrips: 4,
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
          onPlayMove: async (san: string) => handlePlayMove(san),
          onTakeBackMove: async (count: number) => handleTakeBack(count),
          onSetBoardPosition: async (newFen: string) => handleSetBoardPosition(newFen),
          onResetBoard: async () => handleResetBoard(),
          onNavigate: (path: string) => { void navigate(path); },
          // Walkthrough handoff: when the LLM decides "let's drill this
          // opening line as a guided walkthrough," route the student
          // to the walkthrough surface seeded with the opening name.
          // Without this wired the brain tool would no-op and the
          // teach session couldn't escalate to a focused drill.
          onStartWalkthroughForOpening: ({ opening, orientation }) => {
            // In-place walkthrough on /coach/teach when a tree is
            // registered for the requested opening. Replaces the
            // legacy navigate-away behavior that lost the chat panel
            // (production audit, build c6cce89: user said "It routed
            // me to this stupid board"). For openings without a
            // curated tree, fall back to the legacy navigate.
            const tree = resolveWalkthroughTree(opening);
            if (tree) {
              walkthrough.start(tree);
              return { ok: true };
            }
            const params = new URLSearchParams();
            params.set('subject', opening);
            if (orientation) params.set('orientation', orientation);
            void navigate(`/coach/session/walkthrough?${params.toString()}`);
            return { ok: true };
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
            markupBuffer += chunk;
            const { safe, pending } = sanitizeCoachStream(markupBuffer);
            markupBuffer = pending;
            if (!safe) return;
            // First real prose chunk → tear down the kickoff progress
            // banner (the lesson is now visibly arriving).
            if (kickoffStatus) setKickoffStatus(null);
            // Render in chat — sanitized only.
            displayBuffer += safe;
            setStreaming(displayBuffer);
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
      if (!voiceSpokenForTurn) {
        const finalText = sanitizeCoachText(result.text);
        const firstSentenceMatch = SENTENCE_END_RE.exec(finalText);
        const firstSentence = firstSentenceMatch
          ? firstSentenceMatch[1].trim()
          : finalText.trim();
        if (firstSentence) {
          voiceSpokenForTurn = true;
          void logAppAudit({
            kind: 'coach-voice-marker-extracted',
            category: 'subsystem',
            source: 'CoachTeachPage.fallback',
            summary: `[VOICE:] missing — fallback spoke first sentence (${firstSentence.length} chars)`,
            details: JSON.stringify({ length: firstSentence.length, preview: firstSentence.slice(0, 80) }),
          });
          queueSpeak(firstSentence);
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
      setArrows(nextArrows);
      setHighlights(nextHighlights);

      // Sanitize the FINAL response too — both for transcript display
      // and for the conversation memory record. Memory rehydration on
      // the next turn re-feeds prior assistant text into the prompt;
      // unsanitized text would teach the LLM that markup is normal.
      const finalText = sanitizeCoachText(result.text);
      if (finalText) {
        setMessages((prev) => [...prev, {
          id: `${turnId}-c`,
          role: 'assistant',
          content: finalText,
          timestamp: Date.now(),
        }]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-teach',
          role: 'coach',
          text: finalText,
          fen: gameRef.current.fen,
          trigger: null,
        });
      }
    } catch (err) {
      console.error('[CoachTeachPage] ask failed:', err);
      setMessages((prev) => [...prev, {
        id: `${turnId}-c`,
        role: 'assistant',
        content: 'Hit a snag — say it again?',
        timestamp: Date.now(),
      }]);
    } finally {
      setStreaming(null);
      setBusy(false);
      setKickoffStatus(null);
    }
  }, [busy, activeProfile, handlePlayMove, handleTakeBack, handleSetBoardPosition, handleResetBoard, navigate, kickoffStatus, walkthrough]);

  // Student-driven moves go through ControlledChessBoard's onMove
  // callback (below). useChessGame already handles the click-to-move
  // + drag + legal-dot UI internally, so the parent just needs to
  // observe completed moves and tell the coach about them.
  const handleStudentMove = useCallback((move: MoveResult): void => {
    if (busy) return;
    // Update liveFenRef SYNCHRONOUSLY with the post-move FEN that the
    // MoveResult already carries. This is what every brain trip's
    // getLiveFen will read, so trip 1 sees the post-student-move
    // position immediately — no waiting for React re-render. Also
    // pass fenOverride for the kickoff envelope's input.liveState.fen
    // (used by trip 1 before getLiveFen kicks in on trip 2+).
    liveFenRef.current = move.fen;
    void handleSubmit(`I played ${move.san}. Your move.`, { fenOverride: move.fen });
  }, [busy, handleSubmit]);

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
    void (async () => {
      setKickoffStatus({ label: 'Pulling your last 5 games…', step: 1, total: 4 });
      const recent = await db.games
        .reverse()
        .limit(5)
        .toArray()
        .catch(() => []);

      // Analyze any of the 5 most-recent games that aren't already
      // Stockfish-analyzed. Sequential on the singleton engine so the
      // coach's stockfish_eval calls during the lesson don't compete
      // with a 6-worker batch chewing through hundreds of older games.
      // Lesson kicks off the moment these 5 are done — the rest of
      // the unanalyzed backlog stays untouched here and is processed
      // when the user navigates to Game Insights.
      const needsAnalysis = recent.filter(gameNeedsAnalysis).length;
      if (needsAnalysis > 0) {
        await analyzeRecentGames(5, ({ current, total, label }) => {
          // Encode per-game progress into the step bar so the user
          // sees "Analyzing game X of Y" with the bar moving forward.
          setKickoffStatus({
            label,
            step: Math.min(2 + current, 3 + total),
            total: 3 + total,
          });
        });
      }

      // Game pulling + analysis above is kept as a cache-warmer: it
      // populates the stockfish cache with the student's recent games
      // so the brain's first eval call during the lesson lands in
      // ms instead of seconds. The OLD code also built a summaryLines
      // block to seed the kickoff prompt with "you played the Vienna
      // 5x" stats; that prompt is gone now (canned greeting below) so
      // the summaryLines computation is gone too. Recent-game context
      // still reaches the brain organically through coach memory on
      // the first real round-trip.

      // Hard-coded welcome line. Skipping the LLM here means:
      //   (a) the student always hears the SAME greeting (canon),
      //   (b) no token spend on a deterministic line,
      //   (c) the brain doesn't get a chance to ramble before the
      //       student's first input — they speak first now.
      // The greeting is appended to the transcript, voiced through
      // the same Polly pipeline as any other coach turn, and seeded
      // into conversation memory so the brain knows the greeting
      // already happened on the next round-trip.
      const welcomeLine = 'Welcome to my classroom — what would you like to learn today?';
      setKickoffStatus(null);
      const turnId = `t-${Date.now()}-welcome`;
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
      speechChainRef.current = Promise.resolve(voiceService.speakForcedPollyOnly(welcomeLine))
        .catch(() => undefined);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  // Layout mirrors CoachGamePage (Play with Coach) — same outer column
  // structure, same header bar shape (back + title + reset), same
  // PlayerInfoBar, same chess board container, same ChatMessage /
  // ChatInput chat primitives. Only the coaching actions differ:
  // there's no engine-driven move clock here — every coach message
  // comes from the LLM via the teach-mode prompt.
  return (
    <div
      className="flex flex-col md:flex-row h-full overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
      data-testid="coach-teach-page"
    >
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
          {/* Row 2: Difficulty toggle + Coach Tips button — same widgets
              Play has. Difficulty is cosmetic in teach (LLM teaches
              regardless), but kept for visual parity. */}
          <div className="flex items-center justify-between pl-12 md:pl-14">
            <DifficultyToggle
              value={difficulty}
              onChange={setDifficulty}
              disabled={game.history.length > 0}
            />
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

        {/* Coach (opponent) info bar */}
        <div className="px-2 pt-1">
          <PlayerInfoBar
            name="Coach"
            isBot
            capturedPieces={[]}
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
              // Overlay's SVG viewBox is 8×8 squares, matching the
              // board's grid — Framer Motion `pathLength` draws each
              // arrow from source to destination over ~550ms when
              // the segment that owns it starts speaking.
              <div className="relative">
                <ChessBoard
                  key="walkthrough-board"
                  initialFen={walkthrough.fen}
                  orientation={playerColor}
                  interactive={false}
                  showFlipButton={false}
                  showUndoButton={false}
                  showResetButton={false}
                  showEvalBar={false}
                  showVoiceMic={false}
                  showLastMoveHighlight
                />
                <NarrationArrowOverlay
                  arrows={walkthrough.narrationArrows}
                  highlights={walkthrough.narrationHighlights}
                  orientation={playerColor}
                />
              </div>
            ) : (
              <ControlledChessBoard
                game={game}
                interactive={!busy}
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
            capturedPieces={[]}
            isActive={!busy}
          />
        </div>

        {/* Control buttons row — Takeback / Restart / Resign, same as
            Play. Resign on the teach surface ends the lesson and pops
            back to the coach hub. When a walkthrough is active, this
            row is replaced by the walkthrough control panel below. */}
        {walkthrough.isActive ? (
          <WalkthroughControls walkthrough={walkthrough} />
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
          />
        </div>

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

          {messages.length === 0 && !streaming && !kickoffStatus && (
            <div className="text-xs space-y-2" style={{ color: 'var(--color-text-muted)' }}>
              <div>Ask your coach to teach you anything chess. Try:</div>
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
          )}
        </div>
      </div>
    </div>
  );
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
}: {
  walkthrough: ReturnType<typeof useTeachWalkthrough>;
}): JSX.Element {
  const { phase, forkOptions, canBacktrack, leafOutro, tree } = walkthrough;

  if (phase === 'fork') {
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-fork-panel">
        <div className="text-xs font-medium text-theme-text-muted px-1">
          Which line would you like to explore?
        </div>
        <div className="flex flex-col gap-2">
          {forkOptions.map((opt, idx) => (
            <button
              key={`${opt.label ?? idx}-${idx}`}
              onClick={() => walkthrough.pickFork(idx)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-bg text-left min-h-[56px] transition-colors"
              data-testid={`walkthrough-fork-option-${idx}`}
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-theme-text">
                  {opt.label ?? `Option ${idx + 1}`}
                </span>
                {opt.forkSubtitle && (
                  <span className="text-xs text-theme-text-muted">
                    {opt.forkSubtitle}
                  </span>
                )}
              </div>
              <ChevronRight size={16} className="text-theme-text-muted flex-shrink-0" />
            </button>
          ))}
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
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-leaf-panel">
        {leafOutro && (
          <div className="text-xs text-theme-text-muted px-1 italic">
            {leafOutro}
          </div>
        )}
        <div className="flex flex-col gap-2">
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

  if (phase === 'paused') {
    return (
      <div className="px-3 pb-3 space-y-2" data-testid="walkthrough-paused-panel">
        <div className="text-xs text-theme-text-muted px-1">
          {tree ? `Walkthrough paused — ${tree.openingName}` : 'Walkthrough paused'}
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => walkthrough.resume()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-accent text-theme-bg text-sm font-semibold transition-colors"
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
