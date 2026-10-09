/**
 * BoardQuestionBox — "Ask the coach" about the board in front of the student,
 * on any screen that is not a chat (the tactics boards). ONE COACH: the
 * question goes through the same door as every chat (reading, requests,
 * language, proofs), the proof line is walkable on the screen's board, and
 * "show me" plays it there (WO-CHAT-01).
 *
 * A screen mounts it only when its question is over (a solved or revealed
 * puzzle): asked mid-puzzle, "what's the best move?" would hand over the
 * answer the student is still looking for.
 */
import { useCallback, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { dispatchCoachTurn } from '../../coach/dispatchCoachTurn';
import type { LiveState } from '../../coach/types';
import { sanitizeCoachText } from '../../services/sanitizeCoachText';
import { voiceService } from '../../services/voiceService';
import { WalkLineButton } from './WalkLineButton';
import type { WalkableLine } from '../../types';

export interface BoardQuestionBoxProps {
  /** The position the question is about. */
  fen: string;
  studentColor: 'white' | 'black';
  /** The route, so the coach knows which screen it was asked on. */
  route: string;
  /** Plays a line on the screen's board — the walk button and "show me". */
  onWalkLine: (line: WalkableLine) => void;
  /** The engine's best move here, when the screen already knows it. */
  engineBestMoveUci?: string;
  moveHistory?: string[];
  /** A computed answer to fall back on when the coach has nothing. */
  fallback?: (question: string) => Promise<string>;
  /** Prefix for the test ids (`${prefix}-input` …). */
  testIdPrefix: string;
  placeholder?: string;
}

export function BoardQuestionBox({
  fen, studentColor, route, onWalkLine, engineBestMoveUci, moveHistory, fallback, testIdPrefix, placeholder,
}: BoardQuestionBoxProps): JSX.Element {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [line, setLine] = useState<WalkableLine | null>(null);

  const ask = useCallback(async (): Promise<void> => {
    const question = input.trim();
    if (!question || loading) return;
    setLoading(true);
    setReply('');
    setLine(null);
    voiceService.stop();
    try {
      const liveState: LiveState = {
        surface: 'standalone-chat',
        fen,
        whoseTurn: fen.split(' ')[1] === 'b' ? 'black' : 'white',
        studentColor,
        currentRoute: route,
        userJustDid: question,
        ...(engineBestMoveUci ? { engineBestMoveUci } : {}),
        ...(moveHistory && moveHistory.length > 0 ? { moveHistory } : {}),
      };
      let text = '';
      try {
        const answer = await dispatchCoachTurn(
          { surface: 'standalone-chat', ask: question, liveState },
          { maxToolRoundTrips: 1 },
        );
        text = sanitizeCoachText(answer.text);
        setLine(answer.lines?.[0] ?? null);
        if (answer.autoWalk) onWalkLine(answer.autoWalk);
      } catch {
        text = '';
      }
      if (!text && fallback) text = await fallback(question);
      setReply(text || 'The coach could not be reached just now — try again in a moment.');
      if (text) void voiceService.speakGrounded(text, fen);
      setInput('');
    } finally {
      setLoading(false);
    }
  }, [input, loading, fen, studentColor, route, engineBestMoveUci, moveHistory, fallback, onWalkLine]);

  return (
    <div className="flex flex-col gap-1.5" data-testid={`${testIdPrefix}-box`}>
      <label htmlFor={`${testIdPrefix}-input`} className="text-xs text-theme-text-muted flex items-center gap-1">
        <MessageCircle size={12} />
        Ask the coach
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id={`${testIdPrefix}-input`}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading && input.trim()) {
              e.preventDefault();
              void ask();
            }
          }}
          placeholder={placeholder ?? 'Why did this work? What about …?'}
          disabled={loading}
          className="flex-1 px-3 py-2 rounded-lg bg-theme-surface text-sm text-theme-text placeholder:text-theme-text-muted border border-theme-border focus:outline-none focus:border-theme-accent disabled:opacity-50"
          data-testid={`${testIdPrefix}-input`}
        />
        <button
          type="button"
          onClick={() => void ask()}
          disabled={loading || !input.trim()}
          className="px-3 rounded-lg bg-theme-accent text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
          data-testid={`${testIdPrefix}-send`}
          aria-label="Send question to coach"
        >
          <Send size={16} />
        </button>
      </div>
      {loading && (
        <p className="text-xs text-theme-text-muted italic" data-testid={`${testIdPrefix}-loading`}>
          Coach is thinking…
        </p>
      )}
      {reply && !loading && (
        <p className="text-sm text-theme-text bg-theme-accent/5 border border-theme-accent/30 rounded-lg p-3 mt-1" data-testid={`${testIdPrefix}-reply`}>
          {reply}
        </p>
      )}
      {line && !loading && (
        <WalkLineButton line={line} onWalk={onWalkLine} testId={`${testIdPrefix}-walk-line-btn`} />
      )}
    </div>
  );
}
