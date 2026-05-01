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
import { Send, RotateCcw, GraduationCap } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { coachService } from '../../coach/coachService';
import { logAppAudit } from '../../services/appAuditor';
import { voiceService } from '../../services/voiceService';
import { useAppStore } from '../../stores/appStore';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import { db } from '../../db/schema';
import type { LiveState } from '../../coach/types';

interface ChatTurn {
  id: string;
  role: 'student' | 'coach';
  text: string;
}

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

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setInput('');
    const turnId = `t-${Date.now()}`;
    // Kickoff sends a system-style ask to seed the lesson — don't
    // render it as a "student said" turn in the transcript. Only the
    // coach's reply (the actual lesson plan) shows up.
    if (!opts?.kickoff) {
      setTurns((prev) => [...prev, { id: `${turnId}-u`, role: 'student', text }]);
    }
    setStreaming('');

    // Stop in-flight speech so the new teaching response starts clean.
    voiceService.stop();

    let firstSpeakPromise: Promise<void> | null = null;
    let buffer = '';
    const SENTENCE_END = /([^.!?\n]+[.!?\n])(?=\s|$)/;
    const speakOrQueue = (sentence: string): void => {
      if (!sentence) return;
      if (!firstSpeakPromise) {
        firstSpeakPromise = Promise.resolve(voiceService.speakForced(sentence))
          .catch(() => undefined);
      } else {
        void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(sentence));
      }
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
            buffer += chunk;
            setStreaming((prev) => (prev ?? '') + chunk);
            let match: RegExpExecArray | null;
            while ((match = SENTENCE_END.exec(buffer)) !== null) {
              speakOrQueue(match[1].trim());
              buffer = buffer.slice(match.index + match[1].length);
            }
          },
        },
      );

      // Flush any tail.
      const tail = buffer.trim();
      if (tail) speakOrQueue(tail);

      const finalText = result.text.trim();
      if (finalText) {
        setTurns((prev) => [...prev, { id: `${turnId}-c`, role: 'coach', text: finalText }]);
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
      setTurns((prev) => [...prev, {
        id: `${turnId}-c`,
        role: 'coach',
        text: 'Hit a snag — say it again?',
      }]);
    } finally {
      setStreaming(null);
      setBusy(false);
    }
  }, [busy, activeProfile, handlePlayMove, handleTakeBack, handleSetBoardPosition, handleResetBoard, navigate]);

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
      const recent = await db.games
        .reverse()
        .limit(5)
        .toArray()
        .catch(() => []);
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

      // Pipe kickoff through handleSubmit with the kickoff flag so it
      // uses the same streaming TTS + tool callbacks but doesn't
      // render the system-flavored ask as a student turn.
      void handleSubmit(kickoffAsk, { kickoff: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  return (
    <div
      className="flex flex-col gap-3 p-4 flex-1 overflow-hidden max-w-2xl mx-auto w-full"
      data-testid="coach-teach-page"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap size={22} style={{ color: 'rgb(6, 182, 212)' }} />
          <h1 className="text-lg font-bold">Learn with Coach</h1>
        </div>
        <button
          onClick={() => { void resetBoard(); }}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          data-testid="teach-reset-board"
          aria-label="Reset board"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </header>

      <div className="flex-shrink-0">
        <ConsistentChessboard
          fen={fen}
          interactive={false}
        />
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border p-3 space-y-2"
           style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
           data-testid="teach-transcript">
        {turns.length === 0 && !streaming && (
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
        {turns.map((t) => (
          <div
            key={t.id}
            className={`text-sm ${t.role === 'student' ? 'text-right' : ''}`}
            data-testid={`teach-turn-${t.role}`}
          >
            <div
              className="inline-block px-3 py-2 rounded-2xl max-w-[85%]"
              style={{
                background: t.role === 'student' ? 'rgb(6, 182, 212)' : 'var(--color-bg)',
                color: t.role === 'student' ? '#fff' : 'var(--color-text)',
                border: t.role === 'coach' ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {t.text}
            </div>
          </div>
        ))}
        {streaming !== null && (
          <div className="text-sm" data-testid="teach-streaming">
            <div
              className="inline-block px-3 py-2 rounded-2xl max-w-[85%]"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              {streaming || <span style={{ opacity: 0.5 }}>thinking...</span>}
            </div>
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); void handleSubmit(input); }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the coach to teach you something..."
          disabled={busy}
          className="flex-1 px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-testid="teach-input"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="p-2 rounded-lg disabled:opacity-40"
          style={{ background: 'rgb(6, 182, 212)', color: '#fff' }}
          data-testid="teach-submit"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
