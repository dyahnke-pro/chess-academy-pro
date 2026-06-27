import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, ArrowRight, RefreshCw, Check, X, Minus } from 'lucide-react';
import { Chess } from 'chess.js';
import { db } from '../../db/schema';
import { useAppStore } from '../../stores/appStore';
import { PageHelp } from '../Layout/PageHelp';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { buildFedTacticsContext } from '../../services/liveTacticsContext';
import {
  samplePositionsFromGame,
  findMistakePositions,
  buildReadingQuestions,
  type ReadingQuestion,
  type ReadingGrade,
  type SampledPosition,
} from '../../services/positionReadingService';
import { gradeReadingAnswer } from '../../services/positionReadingGrader';
import { recordReadingResult } from '../../services/analysisPracticeStats';
import { determinePlayerColor } from '../../services/mistakePuzzleService';
import { captureEvent } from '../../services/analytics';
import { logAppAudit } from '../../services/appAuditor';
import type { GameRecord } from '../../types';

type Phase = 'loading' | 'empty' | 'error' | 'ready';
export type PositionSource = 'any' | 'mistakes';

interface LoadedPosition {
  fen: string;
  orientation: 'white' | 'black';
  questions: ReadingQuestion[];
  gameLabel: string;
}

interface Usernames { chesscom?: string; lichess?: string }

/** Build the answer-key question set for a sampled position (shared by both
 *  sources). Returns null when the position yields no concrete question. */
async function buildLoaded(pick: SampledPosition, game: GameRecord, rating: number): Promise<LoadedPosition | null> {
  let sideToMove: 'w' | 'b' = 'w';
  try { sideToMove = new Chess(pick.fen).turn(); } catch { return null; }
  const tactics = await buildFedTacticsContext(pick.fen, sideToMove, rating);
  const questions = buildReadingQuestions(pick.fen, tactics);
  if (questions.length === 0) return null;
  return {
    fen: pick.fen,
    orientation: sideToMove === 'w' ? 'white' : 'black',
    questions,
    gameLabel: `${game.white || 'White'} – ${game.black || 'Black'}`,
  };
}

/** Pull a position from the user's games — either ANY middlegame position, or
 *  one they faced RIGHT BEFORE a mistake (the diagnostic source). */
async function loadPosition(rating: number, source: PositionSource, usernames: Usernames): Promise<LoadedPosition | null> {
  const games = await db.games.toArray();
  if (games.length === 0) return null;

  if (source === 'mistakes') {
    const annotated = games.filter((g) => g.pgn && g.annotations && g.annotations.length > 0);
    const order = [...annotated].sort(() => Math.random() - 0.5).slice(0, 12);
    for (const game of order) {
      const username = game.source === 'chesscom' ? usernames.chesscom : game.source === 'lichess' ? usernames.lichess : undefined;
      const studentColor = determinePlayerColor(game, username);
      if (!studentColor) continue;
      const positions = findMistakePositions(
        game.pgn,
        (game.annotations ?? []).map((a) => ({ moveNumber: a.moveNumber, color: a.color, classification: a.classification })),
        studentColor,
        { count: 6 },
      );
      if (positions.length === 0) continue;
      const loaded = await buildLoaded(positions[Math.floor(Math.random() * positions.length)], game, rating);
      if (loaded) return loaded;
    }
    return null;
  }

  // 'any' — a random middlegame position from any game.
  const order = [...games].sort(() => Math.random() - 0.5).slice(0, 8);
  for (const game of order) {
    if (!game.pgn) continue;
    const positions = samplePositionsFromGame(game.pgn, { count: 6 });
    if (positions.length === 0) continue;
    const loaded = await buildLoaded(positions[Math.floor(Math.random() * positions.length)], game, rating);
    if (loaded) return loaded;
  }
  return null;
}

const VERDICT_STYLE = {
  correct: { icon: Check, color: '#22c55e', label: 'Correct' },
  partial: { icon: Minus, color: '#f59e0b', label: 'Close' },
  wrong: { icon: X, color: '#ef4444', label: 'Not quite' },
} as const;

export function AnalysisPracticePage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const rating = activeProfile?.currentRating ?? 1200;
  const usernames: Usernames = {
    chesscom: activeProfile?.preferences?.chessComUsername,
    lichess: activeProfile?.preferences?.lichessUsername,
  };

  const [source, setSource] = useState<PositionSource>('any');
  const [phase, setPhase] = useState<Phase>('loading');
  const [position, setPosition] = useState<LoadedPosition | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [grade, setGrade] = useState<ReadingGrade | null>(null);
  const [grading, setGrading] = useState(false);
  const askedRef = useRef(0);
  const correctRef = useRef(0);
  // Keep usernames out of loadNext's dep array (object identity churns each render).
  const usernamesRef = useRef(usernames);
  usernamesRef.current = usernames;

  const loadNext = useCallback(async (src: PositionSource) => {
    setPhase('loading');
    setGrade(null);
    setAnswer('');
    setQIndex(0);
    try {
      const next = await loadPosition(rating, src, usernamesRef.current);
      if (!next) { setPhase('empty'); return; }
      setPosition(next);
      setPhase('ready');
      captureEvent('analysis_practice_position_loaded', { questions: next.questions.length, source: src });
    } catch (err) {
      void logAppAudit({
        kind: 'stockfish-error', category: 'subsystem', source: 'AnalysisPracticePage.loadNext',
        summary: `failed to load a position: ${err instanceof Error ? err.message : String(err)}`,
      });
      setPhase('error');
    }
  }, [rating]);

  const switchSource = useCallback((src: PositionSource) => {
    if (src === source) return;
    setSource(src);
    captureEvent('analysis_practice_source_changed', { source: src });
    void loadNext(src);
  }, [source, loadNext]);

  useEffect(() => {
    captureEvent('analysis_practice_started', {});
    void loadNext('any');
    // Mount-only; subsequent loads go through loadNext/switchSource with the
    // chosen source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const question = position?.questions[qIndex] ?? null;

  const submit = useCallback(async () => {
    if (!question || !answer.trim() || grade || grading) return;
    setGrading(true);
    const g = await gradeReadingAnswer(question, answer);
    setGrade(g);
    setGrading(false);
    askedRef.current += 1;
    if (g.verdict === 'correct') correctRef.current += 1;
    void recordReadingResult(question.type, g.verdict === 'correct');
    captureEvent('analysis_practice_answer', { questionType: question.type, verdict: g.verdict });
  }, [question, answer, grade, grading]);

  const nextQuestion = useCallback(() => {
    if (!position) return;
    if (qIndex + 1 >= position.questions.length) {
      captureEvent('analysis_practice_completed', { asked: askedRef.current, correct: correctRef.current });
      void loadNext(source);
      return;
    }
    setQIndex((i) => i + 1);
    setGrade(null);
    setAnswer('');
  }, [position, qIndex, loadNext, source]);

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      data-testid="analysis-practice-page"
    >
      <div className="flex items-center justify-center gap-2 max-w-lg mx-auto w-full">
        <Lightbulb size={22} className="text-indigo-400" />
        <h1 className="text-xl font-bold text-center" style={{ color: 'var(--color-text)' }}>Analysis Practice</h1>
        <PageHelp
          helpId="analysis-practice"
          title="Analysis Practice"
          steps={[
            { label: 'Read the position', body: 'A position from one of your games appears. Answer the question in the box — tactics, threats, hanging pieces, material, pawn breaks.' },
            { label: 'Get graded', body: 'The coach checks your read against the engine + board facts and shows you the right answer when you miss. Nothing is invented — every answer is computed.' },
            { label: 'From my mistakes', body: 'Switch the source to drill the exact positions you faced right before your own inaccuracies and blunders — the diagnostic workout.' },
          ]}
        />
      </div>

      {/* Position source: any middlegame position, or the ones you faced right
          before your own mistakes (the diagnostic). */}
      <div className="flex items-center justify-center gap-1 max-w-lg mx-auto w-full" data-testid="analysis-practice-source">
        {([['any', 'Any position'], ['mistakes', 'From my mistakes']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => switchSource(val)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors"
            style={source === val
              ? { borderColor: 'rgba(99,102,241,0.6)', background: 'rgba(99,102,241,0.15)', color: 'var(--color-text)' }
              : { borderColor: 'var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)' }}
            data-testid={`analysis-practice-source-${val}`}
          >
            {label}
          </button>
        ))}
      </div>

      {phase === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-3 flex-1 text-center" data-testid="analysis-practice-loading">
          <RefreshCw size={28} className="animate-spin text-indigo-400" />
          <p style={{ color: 'var(--color-text-muted)' }}>Finding a position from your games…</p>
        </div>
      )}

      {phase === 'empty' && (
        <div className="flex flex-col items-center justify-center gap-4 flex-1 text-center max-w-md mx-auto" data-testid="analysis-practice-empty">
          <Lightbulb size={40} className="text-indigo-400/60" />
          <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>No games to read yet</p>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Analysis Practice pulls positions from your own games. Play or import a few games first, then come back.
          </p>
          <button
            onClick={() => { void navigate('/coach/play'); }}
            className="px-4 py-2 rounded-xl border-2 font-semibold"
            style={{ borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: 'var(--color-text)' }}
            data-testid="analysis-practice-empty-cta"
          >
            Play a game
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex flex-col items-center justify-center gap-4 flex-1 text-center max-w-md mx-auto" data-testid="analysis-practice-error">
          <X size={36} className="text-red-400" />
          <p style={{ color: 'var(--color-text)' }}>Something went wrong loading a position.</p>
          <button
            onClick={() => void loadNext(source)}
            className="px-4 py-2 rounded-xl border-2 font-semibold"
            style={{ borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: 'var(--color-text)' }}
            data-testid="analysis-practice-retry"
          >
            Try again
          </button>
        </div>
      )}

      {phase === 'ready' && position && question && (
        <div className="flex flex-col gap-4 max-w-lg mx-auto w-full">
          <div className="w-full md:max-w-[420px] mx-auto">
            <ConsistentChessboard fen={position.fen} boardOrientation={position.orientation} />
          </div>
          <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
            {position.gameLabel} · {position.orientation === 'white' ? 'White' : 'Black'} to move
          </p>

          <div className="rounded-2xl border-2 p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="font-semibold mb-3" style={{ color: 'var(--color-text)' }} data-testid="analysis-practice-prompt">
              {question.prompt}
            </p>

            {!grade && (
              <>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit(); }}
                  rows={2}
                  placeholder="What do you see? Name the square or the idea…"
                  className="w-full rounded-xl p-3 text-sm resize-none outline-none"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                  data-testid="analysis-practice-input"
                  autoFocus
                />
                <button
                  onClick={() => void submit()}
                  disabled={!answer.trim() || grading}
                  className="mt-3 w-full px-4 py-2.5 rounded-xl border-2 font-semibold disabled:opacity-40"
                  style={{ borderColor: 'rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.12)', color: 'var(--color-text)' }}
                  data-testid="analysis-practice-submit"
                >
                  {grading ? 'Checking…' : 'Check my read'}
                </button>
              </>
            )}

            {grade && (
              <div className="flex flex-col gap-3" data-testid="analysis-practice-grade">
                <div className="flex items-center gap-2" style={{ color: VERDICT_STYLE[grade.verdict].color }}>
                  {(() => { const Icon = VERDICT_STYLE[grade.verdict].icon; return <Icon size={18} />; })()}
                  <span className="font-bold" data-testid="analysis-practice-verdict">{VERDICT_STYLE[grade.verdict].label}</span>
                </div>
                {grade.verdict !== 'correct' && (
                  <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }} data-testid="analysis-practice-answer">
                    <span style={{ color: 'var(--color-text-muted)' }}>Answer: </span>{grade.correctAnswer}
                  </div>
                )}
                <button
                  onClick={nextQuestion}
                  className="w-full px-4 py-2.5 rounded-xl border-2 font-semibold flex items-center justify-center gap-2"
                  style={{ borderColor: 'rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.12)', color: 'var(--color-text)' }}
                  data-testid="analysis-practice-next"
                >
                  {qIndex + 1 >= position.questions.length ? 'New position' : 'Next question'}
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
