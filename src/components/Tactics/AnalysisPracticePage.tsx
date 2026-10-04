import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import { voiceService } from '../../services/voiceService';
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
  readingAnswerShape,
  type ReadingQuestion,
  type ReadingGrade,
  type SampledPosition,
} from '../../services/positionReadingService';
import { gradeReadingAnswer } from '../../services/positionReadingGrader';
import { recordAnswer } from '../../services/answerRecord';
import { wrongTapTag } from '../../services/wrongTapTag';
import type { AnswerHelp } from '../../services/capabilityEvidence';
import { useSquareAnswer, type SquareAnswerSettled } from '../../hooks/useSquareAnswer';
import { determinePlayerColor } from '../../services/mistakePuzzleService';
import { captureEvent } from '../../services/analytics';
import { logAppAudit } from '../../services/appAuditor';
import { reward } from '../../services/rewardService';
import { rewardSeed } from '../../services/rewardEvents';
import { hintStartTier } from '../../services/skillScaling';
import { MISSES_BEFORE_SHOW } from '../../services/squareAnswerGrader';
import type { GameRecord } from '../../types';
import { DEFAULT_STUDENT_RATING } from '../../services/ratingBands';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** The board square a clicked-square or played-move answer landed on, so the
 *  reward light bursts from it; a typed answer has none. */
function selectedSquareFor(answer: string): string | undefined {
  const t = answer.trim();
  if (/^[a-h][1-8]$/.test(t)) return t;
  const san = /^(?:[NBRQK]?[a-h]?[1-8]?x?([a-h][1-8])(?:=[NBRQ])?[+#]?)$/.exec(t);
  return san?.[1];
}

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
  const rating = activeProfile?.currentRating ?? DEFAULT_STUDENT_RATING;
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
  // What the LAST submit got back, when it did not end the question. Every
  // submitted answer shows something (walk 2026-10-03: two answers the grader
  // could not read produced nothing at all, then a third read "Not quite").
  const [feedback, setFeedback] = useState<{ tone: 'shape' | 'partial' | 'wrong'; text: string } | null>(null);
  // Where the ladder STARTS, per student (David 2026-07-03: all training aids
  // adaptive). `hintStartTier` was written for exactly this ladder and never
  // wired, so every student at every rating began at tier 1 — the vaguest rung.
  // A 900-rated player tapped three times to reach the rung they needed; a
  // 2000 got the region handed to them on tap two. Algo-based: the recorded
  // tactics skill governs, the rating is only the cold-start prior.
  const startTier = hintStartTier(rating, activeProfile?.skillRadar?.tactics);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [demoFen, setDemoFen] = useState<string | null>(null); // non-null while the line plays out
  const [demoing, setDemoing] = useState(false);
  const askedRef = useRef(0);
  const correctRef = useRef(0);
  const attemptsRef = useRef(0);
  // The TEXT path's record (typed answers, played moves, and squares on a
  // question with no square key): the help already shown at the first wrong
  // submit, so a miss made before any hint stays clean evidence.
  const textFirstMissHelpRef = useRef<AnswerHelp | undefined>(undefined);
  const textStartedRef = useRef<number>(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernamesRef = useRef(usernames);
  usernamesRef.current = usernames;

  const question = position?.questions[qIndex] ?? null;

  const resetForQuestion = useCallback(() => {
    setGrade(null); setAnswer(''); setHintTier(0); setSelectedSquare(null); setDemoFen(null); setFeedback(null);
    attemptsRef.current = 0;
    textFirstMissHelpRef.current = undefined;
    textStartedRef.current = Date.now();
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
    // An answer to a DIFFERENT question ("Qa4+" to "who is ahead in material?")
    // is not a wrong read: say what kind of answer fits, cost no attempt.
    const shape = readingAnswerShape(question, text);
    if (shape) {
      setFeedback({ tone: 'shape', text: shape });
      setSelectedSquare(null);
      return;
    }
    setGrading(true);
    const g = await gradeReadingAnswer(question, text);
    setGrading(false);
    setFeedback(null);
    askedRef.current += 1;
    captureEvent('analysis_practice_answer', { questionType: question.type, verdict: g.verdict, hintTier, input: 'text' });
    // DUAL-USE (tactics map 2026-10-01): every question carries the
    // misconception it tests. The settled answer is recorded ONCE through the
    // one recorder — the KNOW evidence row, plus the tag's drill spacing that
    // used to be a separate call here beside a counter nobody read.
    const recordText = (solved: boolean, help: AnswerHelp): void => {
      if (!position) return;
      void recordAnswer({
        questionTag: question.misconceptionTag ?? null,
        fen: position.fen,
        origin: 'reading',
        solved,
        answer: {
          taps: [], extras: [], wrongAttempts: attemptsRef.current,
          ...(textFirstMissHelpRef.current !== undefined ? { firstMissHelp: textFirstMissHelpRef.current } : {}),
          msToFirst: Date.now() - textStartedRef.current, msBetween: [],
          help, spoken: false, chainDepth: 0, wrongTags: [], typed: text,
          questionId: question.id, keySize: question.answerSquares?.length ?? 0, surface: 'analysis-practice',
        },
      });
    };
    if (g.verdict === 'correct') {
      correctRef.current += 1;
      recordText(true, hintTier > 0 ? 'hint' : 'none');
      reward({ kind: 'solved', square: selectedSquareFor(text), seed: rewardSeed(`${position?.fen ?? ''}#${qIndex}`) });
      setGrade(g);
      // SAY the read and SHOW the line, then move on once both have landed —
      // a correct answer used to flash for 0.9 s, never spoken (hand walk
      // 2026-10-01, AP1). The computed answer is the confirmation; no praise.
      await Promise.all([
        playDemo(question.demoLine),
        voiceService.speak(question.answer).catch(() => undefined),
      ]);
      advanceTimer.current = setTimeout(() => next(), 1200);
      return;
    }
    // Wrong / partial → progressive GROUNDED hint, let them retry.
    reward({ kind: 'miss', square: selectedSquareFor(text) });
    if (textFirstMissHelpRef.current === undefined) textFirstMissHelpRef.current = hintTier > 0 ? 'hint' : 'none';
    attemptsRef.current += 1;
    if (attemptsRef.current >= MISSES_BEFORE_SHOW) {
      recordText(false, 'show');
      setHintTier(3);
      setGrade(g);                                     // reveal answer + Next
      await playDemo(question.demoLine);
    } else {
      setHintTier(Math.max(startTier, attemptsRef.current));
      setAnswer(''); setSelectedSquare(null);          // keep going
      const left = MISSES_BEFORE_SHOW - attemptsRef.current;
      const tries = `${left} ${left === 1 ? 'try' : 'tries'} left`;
      setFeedback(g.verdict === 'partial'
        ? { tone: 'partial', text: `Close — name the exact square or idea. ${tries}.` }
        : { tone: 'wrong', text: `Not quite — try again. ${tries}.` });
    }
  }, [question, grading, grade, demoing, hintTier, playDemo, next, startTier, position, qIndex]);

  // ── THE TAP PATH (P0c): a question with a computed square key is answered
  // by tapping, graded by the deterministic set grader through the one tap
  // hook — the tap no longer becomes a text string handed to an LLM grader.
  const tapKey: Square[] | null = question?.answerSquares && question.answerSquares.length > 0 ? question.answerSquares : null;

  const settleTap = useCallback(async (r: SquareAnswerSettled) => {
    if (!question || !position) return;
    askedRef.current += 1;
    captureEvent('analysis_practice_answer', { questionType: question.type, verdict: r.solved ? 'correct' : 'wrong', hintTier, input: 'tap' });
    void recordAnswer({
      questionTag: question.misconceptionTag ?? null,
      fen: position.fen,
      origin: 'reading',
      solved: r.solved,
      answer: { ...r.detail, questionId: question.id, surface: 'analysis-practice' },
    });
    setFeedback(null);
    if (r.solved) {
      correctRef.current += 1;
      const last = r.detail.taps[r.detail.taps.length - 1]?.square;
      reward({ kind: 'solved', square: last, seed: rewardSeed(`${position.fen}#${qIndex}`) });
      setGrade({ verdict: 'correct', correctAnswer: question.answer, note: '' });
      await Promise.all([
        playDemo(question.demoLine),
        voiceService.speak(question.answer).catch(() => undefined),
      ]);
      advanceTimer.current = setTimeout(() => next(), 1200);
      return;
    }
    setHintTier(3);
    setGrade({ verdict: 'wrong', correctAnswer: question.answer, note: '' });
    await playDemo(question.demoLine);
  }, [question, position, hintTier, qIndex, playDemo, next]);

  const squareAnswer = useSquareAnswer({
    key: tapKey,
    mode: question?.answerMode ?? 'any',
    questionKey: `${position?.fen ?? ''}#${qIndex}`,
    tagWrongTap: (sqr) => (question && position && tapKey
      ? wrongTapTag({
          fen: position.fen, key: tapKey, square: sqr,
          questionTag: question.misconceptionTag ?? null,
          studentColor: position.orientation === 'white' ? 'w' : 'b',
        })
      : null),
    onWrongTap: (sqr, misses) => {
      reward({ kind: 'miss', square: sqr });
      if (misses >= MISSES_BEFORE_SHOW) return;
      // The grounded hint ladder climbs on a miss, exactly as on the text path.
      setHintTier(Math.max(startTier, misses));
      squareAnswer.noteHelp('hint');
      const left = MISSES_BEFORE_SHOW - misses;
      setFeedback({ tone: 'wrong', text: `Not quite — try again. ${left} ${left === 1 ? 'try' : 'tries'} left.` });
    },
    onPartial: () => setFeedback(null),
    onNudge: () => {
      setFeedback({ tone: 'partial', text: 'Good — one more.' });
      void voiceService.speak('Good — one more.').catch(() => undefined);
    },
    onSettled: (r) => { void settleTap(r); },
  });

  const onSquareClick = useCallback((sqr: string) => {
    if (grade || demoing) return;
    if (tapKey) {
      squareAnswer.tap(sqr as Square);
      return;
    }
    // No square key (material, who-is-winning, a move question): the clicked
    // square is graded as text, as before.
    setSelectedSquare(sqr as Square);
    void gradeAnswer(sqr);
  }, [grade, demoing, gradeAnswer, tapKey, squareAnswer]);

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
    setHintTier((t) => (t === 0 ? startTier : Math.min(t + 1, 3)));
    squareAnswer.noteHelp('hint');
  }, [grade, startTier, squareAnswer]);

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 min-h-0 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
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
        const squareStyles: Record<string, CSSProperties> = tapKey ? { ...squareAnswer.squareStyles } : {};
        if (!tapKey && selectedSquare) squareStyles[selectedSquare] = { background: 'rgba(99,102,241,0.45)' };
        if (grade) for (const s of question.answerSquares ?? []) squareStyles[s] = { background: 'rgba(34,197,94,0.45)' };
        // Every hint revealed so far, in order — the student keeps hint 1 while
        // reading hint 2 (it used to be replaced, labelled "Hint 2" with hint 1
        // gone). A tier that repeats an earlier one adds nothing and is skipped.
        const hints: string[] = [];
        for (let t = 1; t <= Math.min(hintTier, 3); t += 1) {
          const h = readingHint(question, t as 1 | 2 | 3);
          if (h && !hints.includes(h)) hints.push(h);
        }
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
                {hints.length > 0 && (
                  <div className="rounded-xl p-3 text-sm mb-3 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-text)' }} data-testid="analysis-practice-hint">
                    <HelpCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <ol className="space-y-1">
                      {hints.map((h, i) => (
                        <li key={h}><span style={{ color: 'var(--color-text-muted)' }}>Hint {i + 1}: </span>{h}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {feedback && (
                  <p
                    className={`mb-3 text-sm font-semibold ${feedback.tone === 'wrong' ? 'text-red-500' : feedback.tone === 'partial' ? 'text-amber-500' : 'text-theme-text-muted'}`}
                    data-testid="analysis-practice-feedback"
                    data-tone={feedback.tone}
                  >
                    {feedback.text}
                  </p>
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
                <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }} data-testid="analysis-practice-answer">
                  <span style={{ color: 'var(--color-text-muted)' }}>Answer: </span>{grade.correctAnswer}
                </div>
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
