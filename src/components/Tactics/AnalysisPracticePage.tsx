import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, ArrowRight, RefreshCw, Check, X, Minus, HelpCircle, Play, Mic } from 'lucide-react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { db } from '../../db/schema';
import { useAppStore } from '../../stores/appStore';
import { PageHelp } from '../Layout/PageHelp';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { buildFedTacticsContext } from '../../services/liveTacticsContext';
import { stockfishEngine } from '../../services/stockfishEngine';
import {
  samplePositionsFromGame,
  findMistakePositions,
  buildReadingQuestions,
  readingHint,
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

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Few-piece positions read as endgames (gates the endgame question bucket). */
function isEndgameFen(fen: string): boolean {
  try {
    const pieces = new Chess(fen).board().flat().filter(Boolean).length;
    return pieces <= 12;
  } catch { return false; }
}

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
  // One engine analysis: feeds the tactics package AND grounds who's-winning.
  let evalCp: number | null = null;
  let mateIn: number | null = null;
  let analysis = null;
  try {
    analysis = await stockfishEngine.analyzePosition(pick.fen, 14);
    evalCp = analysis.evaluation; // white-perspective cp (mate encodes as a huge value)
    mateIn = analysis.isMate ? analysis.mateIn : null;
  } catch { /* engine down → who's-winning is simply skipped, never guessed */ }
  // Convert the engine PV (UCI) to SAN for the plan + calculation drills.
  const pvSan: string[] = [];
  if (analysis?.topLines?.[0]?.moves?.length) {
    const c = new Chess(pick.fen);
    for (const uci of analysis.topLines[0].moves.slice(0, 8)) {
      try {
        const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
        if (!mv) break;
        pvSan.push(mv.san);
      } catch { break; }
    }
  }
  const tactics = await buildFedTacticsContext(pick.fen, sideToMove, rating, analysis);
  const questions = buildReadingQuestions(pick.fen, tactics, { evalCp, mateIn, isEndgame: isEndgameFen(pick.fen), rating, pvSan });
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
  const setCoachDrawerOpen = useAppStore((s) => s.setCoachDrawerOpen);
  const setCoachDrawerAutoListen = useAppStore((s) => s.setCoachDrawerAutoListen);
  const setGlobalBoardContext = useAppStore((s) => s.setGlobalBoardContext);
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
  const [hintTier, setHintTier] = useState(0);            // 0 = none, 1-3
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [demoFen, setDemoFen] = useState<string | null>(null); // non-null while the line plays out
  const [demoing, setDemoing] = useState(false);
  const askedRef = useRef(0);
  const correctRef = useRef(0);
  const attemptsRef = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernamesRef = useRef(usernames);
  usernamesRef.current = usernames;

  const question = position?.questions[qIndex] ?? null;

  const resetForQuestion = useCallback(() => {
    setGrade(null); setAnswer(''); setHintTier(0); setSelectedSquare(null); setDemoFen(null);
    attemptsRef.current = 0;
  }, []);

  const loadNext = useCallback(async (src: PositionSource) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setPhase('loading'); resetForQuestion(); setQIndex(0);
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
  }, [rating, resetForQuestion]);

  const switchSource = useCallback((src: PositionSource) => {
    if (src === source) return;
    setSource(src);
    captureEvent('analysis_practice_source_changed', { source: src });
    void loadNext(src);
  }, [source, loadNext]);

  useEffect(() => {
    captureEvent('analysis_practice_started', {});
    void loadNext('any');
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (!position) return;
    if (qIndex + 1 >= position.questions.length) {
      captureEvent('analysis_practice_completed', { asked: askedRef.current, correct: correctRef.current });
      void loadNext(source);
      return;
    }
    setQIndex((i) => i + 1);
    resetForQuestion();
  }, [position, qIndex, loadNext, source, resetForQuestion]);

  // "Talk to Coach" — seed the current position as the coach's board context
  // and open the drawer with the mic already listening, so you can ask "why is
  // this best?" out loud and hear the reply. Same path as the Coach-hub Talk
  // button, kept consistent (David 2026-07-14). Native recognizer in the App
  // Store build; Web Speech in a browser.
  const handleTalkToCoach = useCallback(() => {
    if (!position) return;
    let turn = 'w';
    try { turn = new Chess(position.fen).turn(); } catch { /* default white */ }
    setGlobalBoardContext({
      fen: position.fen,
      pgn: '',
      moveNumber: 1,
      playerColor: position.orientation,
      turn,
      lastMove: null,
      history: [],
      timestamp: Date.now(),
    });
    setCoachDrawerAutoListen(true);
    setCoachDrawerOpen(true);
  }, [position, setGlobalBoardContext, setCoachDrawerAutoListen, setCoachDrawerOpen]);

  // Play the grounded demo line out on the board (tell AND show the why).
  const playDemo = useCallback(async (line?: string[]) => {
    if (!line || line.length === 0 || !position) return;
    setDemoing(true);
    const c = new Chess(position.fen);
    for (const san of line) {
      try { c.move(san); } catch { break; }
      setDemoFen(c.fen());
      await sleep(750);
    }
    setDemoing(false);
  }, [position]);

  // The single grading path — text, a clicked square, or a played move all flow
  // through here (the answer key already carries acceptTokens for each mode).
  const gradeAnswer = useCallback(async (text: string) => {
    if (!question || grading || grade || demoing || !text.trim()) return;
    setGrading(true);
    const g = await gradeReadingAnswer(question, text);
    setGrading(false);
    askedRef.current += 1;
    void recordReadingResult(question.type, g.verdict === 'correct');
    captureEvent('analysis_practice_answer', { questionType: question.type, verdict: g.verdict, hintTier });
    if (g.verdict === 'correct') {
      correctRef.current += 1;
      setGrade(g);
      await playDemo(question.demoLine);               // show the why
      advanceTimer.current = setTimeout(() => next(), 900); // auto-advance, no click
      return;
    }
    // Wrong / partial → progressive GROUNDED hint, let them retry.
    attemptsRef.current += 1;
    if (attemptsRef.current >= 3) {
      setHintTier(3);
      setGrade(g);                                     // reveal answer + Next
      await playDemo(question.demoLine);
    } else {
      setHintTier(attemptsRef.current);
      setAnswer(''); setSelectedSquare(null);          // keep going
    }
  }, [question, grading, grade, demoing, hintTier, playDemo, next]);

  const onSquareClick = useCallback((sqr: string) => {
    if (grade || demoing) return;
    setSelectedSquare(sqr as Square);
    void gradeAnswer(sqr);
  }, [grade, demoing, gradeAnswer]);

  const onPieceDrop = useCallback((from: string, to: string): boolean => {
    if (grade || demoing || !position) return false;
    try {
      const c = new Chess(position.fen);
      const mv = c.move({ from, to, promotion: 'q' });
      if (!mv) return false;
      void gradeAnswer(mv.san);
      return true;
    } catch { return false; }
  }, [grade, demoing, position, gradeAnswer]);

  const showHint = useCallback(() => {
    if (grade) return;
    setHintTier((t) => Math.min((t || 0) + 1, 3));
  }, [grade]);

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
            { label: 'Learn to calculate', body: 'When a forcing line exists, the drill walks you through the calculation METHOD in order: name your candidate moves first (checks and captures), calculate the main line to its quiet end, then evaluate the endpoint — who is better. Calculation ends in a judgement, not just a move.' },
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

      {phase === 'ready' && position && question && (() => {
        const toMove = position.orientation === 'white' ? 'White' : 'Black';
        // Highlight the clicked square (and, once answered, the grounded answer squares).
        const squareStyles: Record<string, CSSProperties> = {};
        if (selectedSquare) squareStyles[selectedSquare] = { background: 'rgba(99,102,241,0.45)' };
        if (grade) for (const s of question.answerSquares ?? []) squareStyles[s] = { background: 'rgba(34,197,94,0.45)' };
        const hint = hintTier > 0 ? readingHint(question, Math.min(hintTier, 3) as 1 | 2 | 3) : null;
        // Two-column rectangle (David 2026-06-28): board + turn indicator on
        // the left, the discussion/answer panel on the right at md+, stacked
        // on mobile. Wider container so the board gets real room.
        return (
        <div className="flex flex-col md:flex-row md:items-start gap-4 max-w-4xl mx-auto w-full">
          {/* Left column — board */}
          <div className="flex flex-col gap-2 w-full md:flex-1 md:max-w-[460px]">
            {/* Prominent turn indicator (David: "I don't know whose turn it is"). */}
            <div className="flex items-center justify-center gap-2" data-testid="analysis-practice-turn">
              <span className="inline-block w-3 h-3 rounded-full border" style={{ background: toMove === 'White' ? '#f8fafc' : '#0f172a', borderColor: 'var(--color-border)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{toMove} to move</span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>· {position.gameLabel}</span>
            </div>

            <div className="w-full">
              <ConsistentChessboard
                fen={demoFen ?? position.fen}
                boardOrientation={position.orientation}
                interactive={!grade && !demoing}
                squareStyles={squareStyles}
                onSquareClick={(a) => onSquareClick(a.square)}
                onPieceDrop={(a) => onPieceDrop(a.sourceSquare, a.targetSquare ?? '')}
              />
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              Answer by typing, clicking a square, or playing the move on the board.
            </p>
            <button
              type="button"
              onClick={handleTalkToCoach}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 bg-rose-500/10 border-rose-500/30 text-rose-400 font-semibold hover:opacity-80 transition-all text-sm"
              data-testid="analysis-practice-talk-btn"
              aria-label="Talk to Coach about this position"
            >
              <Mic size={18} /> Talk to Coach
            </button>
          </div>

          {/* Right column — discussion / answer panel */}
          <div className="rounded-2xl border-2 p-4 w-full md:flex-1 md:self-stretch" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="font-semibold mb-3" style={{ color: 'var(--color-text)' }} data-testid="analysis-practice-prompt">
              {question.prompt}
            </p>

            {!grade && (
              <>
                {hint && (
                  <div className="rounded-xl p-3 text-sm mb-3 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-text)' }} data-testid="analysis-practice-hint">
                    <HelpCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <span><span style={{ color: 'var(--color-text-muted)' }}>Hint {hintTier}: </span>{hint}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void gradeAnswer(answer); } }}
                    rows={2}
                    placeholder="What do you see? Name the square, move, or idea…"
                    className="flex-1 rounded-xl p-3 text-sm resize-none outline-none"
                    style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    data-testid="analysis-practice-input"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={showHint}
                    disabled={hintTier >= 3 || grading}
                    className="px-4 py-2.5 rounded-xl border-2 font-semibold disabled:opacity-40 flex items-center gap-2"
                    style={{ borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', color: 'var(--color-text)' }}
                    data-testid="analysis-practice-hint-btn"
                  >
                    <HelpCircle size={16} /> Hint
                  </button>
                  <button
                    onClick={() => void gradeAnswer(answer)}
                    disabled={!answer.trim() || grading}
                    className="flex-1 px-4 py-2.5 rounded-xl border-2 font-semibold disabled:opacity-40"
                    style={{ borderColor: 'rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.12)', color: 'var(--color-text)' }}
                    data-testid="analysis-practice-submit"
                  >
                    {grading ? 'Checking…' : 'Send'}
                  </button>
                </div>
              </>
            )}

            {grade && (
              <div className="flex flex-col gap-3" data-testid="analysis-practice-grade">
                <div className="flex items-center gap-2" style={{ color: VERDICT_STYLE[grade.verdict].color }}>
                  {(() => { const Icon = VERDICT_STYLE[grade.verdict].icon; return <Icon size={18} />; })()}
                  <span className="font-bold" data-testid="analysis-practice-verdict">{VERDICT_STYLE[grade.verdict].label}</span>
                  {demoing && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><Play size={12} /> showing the line…</span>}
                </div>
                {grade.verdict !== 'correct' && (
                  <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }} data-testid="analysis-practice-answer">
                    <span style={{ color: 'var(--color-text-muted)' }}>Answer: </span>{grade.correctAnswer}
                  </div>
                )}
                {/* On a correct read the surface auto-advances; only the miss path needs a button. */}
                {grade.verdict !== 'correct' && (
                  <button
                    onClick={next}
                    className="w-full px-4 py-2.5 rounded-xl border-2 font-semibold flex items-center justify-center gap-2"
                    style={{ borderColor: 'rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.12)', color: 'var(--color-text)' }}
                    data-testid="analysis-practice-next"
                  >
                    {qIndex + 1 >= position.questions.length ? 'New position' : 'Next question'}
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
