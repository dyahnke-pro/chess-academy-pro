/**
 * CoachTeachPage — dedicated teaching surface where the coach drives
 * the board. The student types or speaks a question ("walk me through
 * the Vienna," "show me the Italian opening," "teach me about pins"),
 * and the coach uses the full toolbelt to set up positions, play
 * candidate moves, take them back, narrate the IDEA — exactly the
 * shape mandated by OPERATOR_BASE_BODY's TEACHING MODE block.
 *
 * Design principles:
 *   1. The board state belongs to the coach during teaching. The
 *      student watches; the coach demonstrates. play_move /
 *      take_back_move / set_board_position / reset_board callbacks
 *      mutate this page's local Chess instance directly.
 *   2. The board is a static-mode `<ConsistentChessboard fen={fen} />`
 *      — pieces don't drag-and-drop. Teaching is the coach's hands;
 *      the student types or speaks. (Future: add a "free-play"
 *      override toggle for when the student wants to try a move.)
 *   3. surface='teach' on every coachService.ask so the brain can
 *      tune later if needed.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ArrowLeft, RotateCcw, Loader2 } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { PlayerInfoBar } from './PlayerInfoBar';
import { coachService } from '../../coach/coachService';
import { anthropicProvider } from '../../coach/providers/anthropic';
import { logAppAudit } from '../../services/appAuditor';
import { sanitizeCoachText, sanitizeCoachStream, formatForSpeech } from '../../services/sanitizeCoachText';
import { voiceService } from '../../services/voiceService';
import { useAppStore } from '../../stores/appStore';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import { db } from '../../db/schema';
import { analyzeRecentGames, gameNeedsAnalysis } from '../../services/gameAnalysisService';
import type { LiveState } from '../../coach/types';
import type { ChatMessage as ChatMessageType } from '../../types';

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

  // Local Chess instance — the coach's hands move pieces here.
  const chessRef = useRef<Chess>(new Chess());
  const [fen, setFen] = useState<string>(STARTING_FEN);

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Kickoff progress: opaque label + step counter so the student sees
  // why nothing has appeared yet (DB query → LLM call can take 5–30s).
  const [kickoffStatus, setKickoffStatus] = useState<{
    label: string;
    step: number;
    total: number;
  } | null>(null);

  // Stable chained promise so streaming sentences play in order through
  // the SAME Polly pipeline that handles the first sentence. Replaces
  // the previous design that used `voiceService.speakQueuedForced` for
  // sentences 2+, which is silently a no-op because
  // `WEB_SPEECH_FALLBACK_ENABLED = false` in voiceService — the audit
  // proved sentence 1 spoke and every later sentence was dropped.
  const speechChainRef = useRef<Promise<void>>(Promise.resolve());

  const resetBoard = useCallback((): { ok: boolean } => {
    chessRef.current = new Chess();
    setFen(STARTING_FEN);
    return { ok: true };
  }, []);

  // Callback wires for the coach's tools. All four: play, take-back,
  // set-position, reset. The brain uses these to demonstrate
  // variations exactly the way a human coach would push pieces around.
  const handlePlayMove = useCallback((san: string): { ok: boolean; reason?: string } => {
    try {
      const result = chessRef.current.move(san);
      if (!result) return { ok: false, reason: `illegal SAN "${san}"` };
      setFen(chessRef.current.fen());
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }, []);

  const handleTakeBack = useCallback((count: number): { ok: boolean; reason?: string } => {
    try {
      for (let i = 0; i < count; i++) {
        const undone = chessRef.current.undo();
        if (!undone) return { ok: false, reason: 'nothing to undo' };
      }
      setFen(chessRef.current.fen());
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }, []);

  const handleSetBoardPosition = useCallback((newFen: string): { ok: boolean; reason?: string } => {
    try {
      const probe = new Chess();
      probe.load(newFen);
      chessRef.current = probe;
      setFen(probe.fen());
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }, []);

  const handleResetBoard = useCallback((): { ok: boolean } => {
    return resetBoard();
  }, [resetBoard]);

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
        .then(() => voiceService.speakForced(sentence))
        .catch(() => undefined);
    };

    const liveState: LiveState = {
      surface: 'teach',
      currentRoute: '/coach/teach',
      fen: chessRef.current.fen(),
      moveHistory: chessRef.current.history(),
      userJustDid: text,
    };

    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'CoachTeachPage',
      summary: `surface=teach viaSpine=true ask="${text.slice(0, 60)}"`,
      details: JSON.stringify({ fen: chessRef.current.fen() }),
    });

    useCoachMemoryStore.getState().appendConversationMessage({
      surface: 'chat-teach',
      role: 'user',
      text,
      fen: chessRef.current.fen(),
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
          fen: chessRef.current.fen(),
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

  // Student-driven move from the interactive board. Plays the move
  // locally then notifies the coach via a short ask so the brain can
  // evaluate it ("the student just played Nxe5 — was that the right
  // call here?"). Returns false if illegal so react-chessboard
  // bounces the piece back to the source square.
  const handleStudentDrop = useCallback(({
    sourceSquare,
    targetSquare,
  }: { sourceSquare: string; targetSquare: string | null }): boolean => {
    if (!targetSquare || busy) return false;
    let san: string | null = null;
    try {
      const result = chessRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      san = result.san;
    } catch {
      return false;
    }
    setFen(chessRef.current.fen());
    if (san) {
      void handleSubmit(`I played ${san}. What do you think?`);
    }
    return true;
  }, [busy, handleSubmit]);

  // ─── Lesson-plan kickoff ─────────────────────────────────────────────────
  // On mount, pull the student's last 5 games + weakness profile and ask
  // the coach to open with a personalized lesson plan. The coach's first
  // line is "based on your last few games, here's what we should work on
  // today." If there are no games yet, fire a generic kickoff that asks
  // the student what they want to learn.
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
      {/* Left column: header + board (matches CoachGamePage flex pattern) */}
      <div className="flex flex-col flex-1 md:flex-none md:w-3/5 min-h-0 overflow-y-auto">
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
              onClick={() => { void resetBoard(); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-theme-border text-theme-text-muted"
              data-testid="teach-reset-board"
              aria-label="Reset board"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </div>

        {/* Coach (opponent) info bar — same component the Play page uses */}
        <div className="px-2 pt-1">
          <PlayerInfoBar
            name="Coach"
            isBot
            capturedPieces={[]}
            isActive={busy}
          />
        </div>

        {/* Board */}
        <div className="px-2 py-1 flex justify-center w-full">
          <div className="w-full md:max-w-[420px]">
            <ConsistentChessboard
              fen={fen}
              interactive={!busy}
              onPieceDrop={handleStudentDrop}
            />
          </div>
        </div>
      </div>

      {/* Right column: input-on-top reverse-flow chat. The text input
          is pinned right under the board so the student never has to
          scroll to type. The newest message renders immediately under
          the input (highlighted), older messages scroll DOWN.
          Chronologically newest-first ─ "you don't hunt for what just
          arrived." Board stays fully visible. */}
      <div className="flex flex-col flex-1 md:w-2/5 min-h-0 border-t md:border-t-0 md:border-l border-theme-border bg-theme-bg">
        {/* Slim avatar header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-theme-border">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold bg-theme-accent">
            C
          </div>
          <span className="text-sm font-semibold text-theme-text">Coach</span>
          <span className="text-xs text-theme-text-muted">
            {busy ? '· typing…' : '· online'}
          </span>
        </div>

        {/* Pinned input — always reachable, zero scroll to type. */}
        <div className="border-b border-theme-border">
          <ChatInput
            onSend={(text) => void handleSubmit(text)}
            disabled={busy}
            placeholder="Ask your coach…"
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
