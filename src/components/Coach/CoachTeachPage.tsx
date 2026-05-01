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
import { ArrowLeft, RotateCcw, Loader2 } from 'lucide-react';
import { ControlledChessBoard } from '../Board/ControlledChessBoard';
import { useChessGame, type MoveResult } from '../../hooks/useChessGame';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { coachService } from '../../coach/coachService';
import { anthropicProvider } from '../../coach/providers/anthropic';
import { logAppAudit } from '../../services/appAuditor';
import { sanitizeCoachText, sanitizeCoachStream, formatForSpeech } from '../../services/sanitizeCoachText';
import { parseBoardTags } from '../../services/boardAnnotationService';
import { voiceService } from '../../services/voiceService';
import { useAppStore } from '../../stores/appStore';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import { db } from '../../db/schema';
import { analyzeRecentGames, gameNeedsAnalysis } from '../../services/gameAnalysisService';
import type { LiveState } from '../../coach/types';
import type { ChatMessage as ChatMessageType, BoardArrow, BoardHighlight } from '../../types';

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

  // ─── LLM-driven board mutations ─────────────────────────────────────
  // The brain emits [[ACTION:play_move {"san":"Nf3"}]] etc. These
  // handlers translate the marker into useChessGame mutations. SAN →
  // from/to is resolved via a probe Chess instance against the current
  // FEN (chess.js's verbose move list), then routed through
  // `game.makeMove` so lastMove highlight + selection state stay
  // consistent with the manual move path.

  const handlePlayMove = useCallback((san: string): { ok: boolean; reason?: string } => {
    try {
      const probe = new Chess(game.fen);
      const verboseMoves = probe.moves({ verbose: true });
      const match = verboseMoves.find((m) => m.san === san);
      if (!match) {
        return { ok: false, reason: `chess.js rejected "${san}" from FEN ${game.fen}: Invalid move: ${san}` };
      }
      const result = game.makeMove(match.from, match.to, match.promotion);
      if (!result) return { ok: false, reason: `makeMove failed for ${san}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }, [game]);

  const handleTakeBack = useCallback((count: number): { ok: boolean; reason?: string } => {
    try {
      for (let i = 0; i < count; i++) {
        game.undoMove();
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }, [game]);

  const handleSetBoardPosition = useCallback((newFen: string): { ok: boolean; reason?: string } => {
    try {
      // chess.js validates FEN on construction.
      new Chess(newFen);
      const ok = game.loadFen(newFen);
      return ok ? { ok: true } : { ok: false, reason: 'loadFen returned false' };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }, [game]);

  const handleResetBoard = useCallback((): { ok: boolean } => {
    game.resetGame(STARTING_FEN);
    return { ok: true };
  }, [game]);

  const handleSubmit = useCallback(async (text: string, opts?: { kickoff?: boolean }): Promise<void> => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const turnId = `t-${Date.now()}`;
    // Kickoff sends a system-style ask to seed the lesson — don't
    // render it as a "student said" turn in the transcript. Only the
    // coach's reply (the actual lesson plan) shows up.
    if (!opts?.kickoff) {
      setMessages((prev) => [...prev, {
        id: `${turnId}-u`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      }]);
    }
    setStreaming('');

    // Stop in-flight speech so the new teaching response starts clean.
    // Then reset the speech chain so the next queued sentence starts
    // a fresh sequence (otherwise it'd be `.then(...)`-chained off a
    // dead promise from the previous turn).
    voiceService.stop();
    speechChainRef.current = Promise.resolve();

    // Two-stage buffer: `markupBuffer` holds raw streamed chunks until
    // any in-flight `[[DIRECTIVE...]]` tag closes (sanitizeCoachStream
    // returns it as `pending`); `sentenceBuffer` collects sanitized
    // prose for sentence-by-sentence TTS dispatch. WO-COACH-TTS-STRIP-01.
    let markupBuffer = '';
    let sentenceBuffer = '';
    let displayBuffer = '';
    // Negative lookbehind on `\d` keeps SAN move numbers (e.g. "1.",
    // "12.") from being treated as sentence terminators — without it
    // Polly voices "1." / "Nc3 Nc6 3." / "Bc4" as separate utterances.
    const SENTENCE_END = /([^.!?\n]+(?<!\d)[.!?\n])(?=\s|$)/;
    // Chain every sentence through speakForced. Each call's audio is
    // awaited inside the chain so subsequent sentences only start
    // after the previous one finishes — preventing speakInternal's
    // unconditional this.stop() from cutting itself off mid-utterance.
    const queueSpeak = (raw: string): void => {
      const sentence = formatForSpeech(raw);
      if (!sentence) return;
      speechChainRef.current = speechChainRef.current
        // Polly-only — no Web Speech fallback. Production audit
        // showed Polly cooldowns triggering Web Speech mid-chain,
        // and Safari's speechSynth cancel-tail overlapped the next
        // Polly sentence ("two voices"). Skipping the sentence
        // audibly when Polly fails is preferable; chat bubble still
        // shows the text. Polly recovers naturally after cooldown.
        .then(() => voiceService.speakForcedPollyOnly(sentence))
        .catch(() => undefined);
    };

    const liveState: LiveState = {
      surface: 'teach',
      currentRoute: '/coach/teach',
      fen: game.fen,
      moveHistory: game.history,
      userJustDid: text,
      // Tell the brain explicitly whose turn it is. Without this the
      // LLM was confusing sides — emitting `play_move {"san":"e5"}`
      // when it was Black's turn but the position needed White's
      // response, then chess.js rejected it 5 trips in a row.
      whoseTurn: game.turn === 'w' ? 'white' : 'black',
    };

    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachTeachPage',
      summary: `surface=teach viaSpine=true ask="${text.slice(0, 60)}"`,
      details: JSON.stringify({ fen: game.fen, turn: game.turn }),
    });

    useCoachMemoryStore.getState().appendConversationMessage({
      surface: 'chat-teach',
      role: 'user',
      text,
      fen: game.fen,
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
          maxToolRoundTrips: 6,
          personality: activeProfile?.preferences.coachPersonality,
          profanity: activeProfile?.preferences.coachProfanity,
          mockery: activeProfile?.preferences.coachMockery,
          flirt: activeProfile?.preferences.coachFlirt,
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
            const params = new URLSearchParams();
            params.set('subject', opening);
            if (orientation) params.set('orientation', orientation);
            void navigate(`/coach/session/walkthrough?${params.toString()}`);
            return { ok: true };
          },
          onChunk: (chunk: string) => {
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
            // Append to sentence buffer for TTS dispatch.
            sentenceBuffer += safe;
            let match: RegExpExecArray | null;
            while ((match = SENTENCE_END.exec(sentenceBuffer)) !== null) {
              queueSpeak(match[1].trim());
              sentenceBuffer = sentenceBuffer.slice(match.index + match[1].length);
            }
          },
        },
      );

      // Flush: anything left in the markup buffer is either an
      // unclosed marker (which we don't want to speak/render) or
      // trailing prose. Sanitize once more to drop any unclosed
      // markup, then flush as a final sentence.
      const tail = sanitizeCoachText(markupBuffer + sentenceBuffer);
      if (tail) queueSpeak(tail);

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
          fen: game.fen,
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
  }, [busy, activeProfile, handlePlayMove, handleTakeBack, handleSetBoardPosition, handleResetBoard, navigate, kickoffStatus]);

  // Student-driven moves go through ControlledChessBoard's onMove
  // callback (below). useChessGame already handles the click-to-move
  // + drag + legal-dot UI internally, so the parent just needs to
  // observe completed moves and tell the coach about them.
  const handleStudentMove = useCallback((move: MoveResult): void => {
    if (busy) return;
    void handleSubmit(`I played ${move.san}. What do you think?`);
  }, [busy, handleSubmit]);

  // ─── Lesson-plan kickoff ─────────────────────────────────────────────────
  // On mount, pull the student's last 5 games + weakness profile and ask
  // the coach to open with a personalized lesson plan. The coach's first
  // line is "based on your last few games, here's what we should work on
  // today." If there are no games yet, fire a generic kickoff that asks
  // the student what they want to learn.
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

      setKickoffStatus({ label: 'Loading your weakness profile…', step: 3, total: 4 });
      const summaryLines: string[] = [];
      if (recent.length > 0) {
        summaryLines.push(`Recent games (${recent.length}):`);
        for (const g of recent) {
          const opening = g.openingId || g.eco || 'unknown opening';
          const result = g.result ?? 'unknown';
          const playerColor = g.white === activeProfile.name ? 'white' : 'black';
          summaryLines.push(`- ${opening} as ${playerColor}, result: ${result}`);
        }
      } else {
        summaryLines.push('Student has no completed games yet.');
      }
      const prefs = activeProfile.preferences;
      // weaknessProfile stored on prefs as freeform notes — pass through.
      const weakness = (prefs as { weaknessProfile?: { weaknesses?: string[] } }).weaknessProfile;
      if (weakness?.weaknesses && weakness.weaknesses.length > 0) {
        summaryLines.push(`Weakness profile: ${weakness.weaknesses.slice(0, 5).join(', ')}`);
      }
      summaryLines.push(`Rating: ${activeProfile.currentRating ?? 'unknown'}.`);

      const kickoffAsk =
        recent.length > 0
          ? `The student just walked into your classroom. Here's their data:\n\n${summaryLines.join('\n')}\n\nOpen with a PERSONALIZED LESSON PLAN. Pick 1-2 specific things from their recent games or weaknesses to work on TODAY. Be concrete — name a pattern, name a square, name a typical mistake. Set up the relevant board position via set_board_position if it helps. Then ask them: "want to start there, or pick something else?" Don't generic-coach. Don't lecture. Walk in like you've watched their games and you know what they need.`
          : `The student just walked into your classroom for the first time. They have no game history yet. Open warmly and ask ONE direct scoping question: tactics drill, opening study, or endgame technique? When they answer, drive into the lesson with the full teaching shape (set up positions, demonstrate, ground in Stockfish, name the IDEA).`;

      setKickoffStatus({ label: 'Coach is preparing your lesson plan…', step: 4, total: 4 });
      // Pipe kickoff through handleSubmit with the kickoff flag so it
      // uses the same streaming TTS + tool callbacks but doesn't
      // render the system-flavored ask as a student turn.
      void handleSubmit(kickoffAsk, { kickoff: true });
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
        {/* Header — same shape as the play page's header row 1 */}
        <div className="px-3 py-2 md:p-4 border-b border-theme-border">
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
            <button
              onClick={() => { void handleResetBoard(); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-theme-border text-theme-text-muted"
              data-testid="teach-reset-board"
              aria-label="Reset board"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </div>

        {/* Board — same `<ControlledChessBoard>` Play uses, so click-
            to-move, legal-move dots, drag-and-drop, last-move highlight
            all work identically. No eval bar, no flip/undo/reset chrome
            (chrome on this surface is just the small Reset button in
            the header above). showVoiceMic={false} so the mic doesn't
            draw under the board (we already have the chat input). */}
        <div className="px-2 py-1 flex justify-center w-full">
          <div className="w-full md:max-w-[420px]">
            <ControlledChessBoard
              game={game}
              interactive={!busy}
              showFlipButton={false}
              showUndoButton={false}
              showResetButton={false}
              showEvalBar={false}
              showVoiceMic={false}
              showLastMoveHighlight
              onMove={handleStudentMove}
              arrows={arrows.length > 0 ? arrows : undefined}
              annotationHighlights={highlights.length > 0 ? highlights : undefined}
            />
          </div>
        </div>
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
