import { useEffect, useState, useCallback, useRef } from 'react';
import { Eye, Check, X, Minus, Loader2, ArrowRight } from 'lucide-react';
import { buildFedTacticsContext } from '../../services/liveTacticsContext';
import {
  buildReadingQuestions,
  type ReadingQuestion,
  type ReadingGrade,
  type ReadingQuestionType,
} from '../../services/positionReadingService';
import { gradeReadingAnswer } from '../../services/positionReadingGrader';
import { recordReadingResult } from '../../services/analysisPracticeStats';

interface ReviewReadingChallengeProps {
  /** The position to read — the segment's `fenBefore` (what the student faced
   *  right before the move). */
  fen: string;
  studentColor: 'w' | 'b';
  rating: number;
  /** Fired after each graded read so the parent can react (analytics, etc.). */
  onGraded?: (type: ReadingQuestionType, correct: boolean) => void;
}

const VERDICT = {
  correct: { icon: Check, color: '#22c55e', label: 'Correct' },
  partial: { icon: Minus, color: '#f59e0b', label: 'Close' },
  wrong: { icon: X, color: '#ef4444', label: 'Not quite' },
} as const;

/**
 * Inline "read this position" challenge for the review walk (Surface A). Opt-in
 * and non-blocking — it only mounts when the student taps "Read this position"
 * at a critical ply, NEVER auto-fires (the retired blunder-capture's mistake).
 * It quizzes the student on what's in `fen`, grading their typed read against
 * the COMPUTED answer key (G0: the engine + board own the truth). Reuses the
 * whole Analysis-Practice stack — answer-key service, two-tier grader, the
 * per-category loop-back stat.
 */
export function ReviewReadingChallenge({ fen, studentColor, rating, onGraded }: ReviewReadingChallengeProps): JSX.Element {
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [grade, setGrade] = useState<ReadingGrade | null>(null);
  const [grading, setGrading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Build the question set for this position. Runs Stockfish via
  // buildFedTacticsContext (cached when the walk already analysed the ply);
  // a brief loading state covers a cold engine call.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setQuestions([]);
    setQIdx(0);
    setAnswer('');
    setGrade(null);
    void (async () => {
      try {
        const tactics = await buildFedTacticsContext(fen, studentColor, rating);
        const qs = buildReadingQuestions(fen, tactics);
        if (cancelled || !mounted.current) return;
        setQuestions(qs);
        setLoading(false);
      } catch {
        if (!cancelled && mounted.current) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fen, studentColor, rating]);

  const question = questions[qIdx] ?? null;

  const submit = useCallback(async () => {
    if (!question || !answer.trim() || grade || grading) return;
    setGrading(true);
    const g = await gradeReadingAnswer(question, answer);
    if (!mounted.current) return;
    setGrade(g);
    setGrading(false);
    void recordReadingResult(question.type, g.verdict === 'correct');
    onGraded?.(question.type, g.verdict === 'correct');
  }, [question, answer, grade, grading, onGraded]);

  const another = useCallback(() => {
    if (qIdx + 1 >= questions.length) return;
    setQIdx((i) => i + 1);
    setGrade(null);
    setAnswer('');
  }, [qIdx, questions.length]);

  return (
    <div className="px-3 py-2 border-t border-indigo-500/30 bg-indigo-500/5" data-testid="review-reading-challenge">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Eye size={12} style={{ color: '#818cf8' }} />
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#818cf8' }}>
          Read this position
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-1" data-testid="review-reading-loading">
          <Loader2 size={12} className="animate-spin" style={{ color: '#818cf8' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Reading the position…</span>
        </div>
      )}

      {!loading && !question && (
        <p className="text-xs py-1" style={{ color: 'var(--color-text-muted)' }} data-testid="review-reading-none">
          Nothing concrete to quiz here — it&apos;s a quiet position.
        </p>
      )}

      {!loading && question && (
        <>
          <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--color-text)' }} data-testid="review-reading-prompt">
            {question.prompt}
          </p>

          {!grade && (
            <div className="flex flex-col gap-2">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit(); }}
                rows={2}
                placeholder="What do you see? Name the square or the idea…"
                className="w-full rounded-lg p-2 text-xs resize-none outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                data-testid="review-reading-input"
              />
              <button
                onClick={() => void submit()}
                disabled={!answer.trim() || grading}
                className="self-start px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                style={{ background: 'rgba(129,140,248,0.15)', color: 'var(--color-text)', border: '1px solid rgba(129,140,248,0.4)' }}
                data-testid="review-reading-submit"
              >
                {grading ? 'Checking…' : 'Check my read'}
              </button>
            </div>
          )}

          {grade && (
            <div className="flex flex-col gap-2" data-testid="review-reading-grade">
              <div className="flex items-center gap-1.5" style={{ color: VERDICT[grade.verdict].color }}>
                {(() => { const Icon = VERDICT[grade.verdict].icon; return <Icon size={13} />; })()}
                <span className="text-xs font-bold" data-testid="review-reading-verdict">{VERDICT[grade.verdict].label}</span>
              </div>
              {grade.note && (
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{grade.note}</p>
              )}
              {grade.verdict !== 'correct' && (
                <p className="text-xs rounded-lg p-2" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }} data-testid="review-reading-answer">
                  <span style={{ color: 'var(--color-text-muted)' }}>Answer: </span>{grade.correctAnswer}
                </p>
              )}
              {qIdx + 1 < questions.length && (
                <button
                  onClick={another}
                  className="self-start flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(129,140,248,0.15)', color: 'var(--color-text)', border: '1px solid rgba(129,140,248,0.4)' }}
                  data-testid="review-reading-another"
                >
                  Ask me another <ArrowRight size={12} />
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
