import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ChevronLeft, SkipForward, Target, CheckCircle2, XCircle } from 'lucide-react';
import { ChessBoard } from '../Board/ChessBoard';
import { getOpeningById } from '../../services/openingService';
import {
  buildDrillLines,
  selectNextLine,
  isStudentPly,
  type DrillLine,
  type TrainerProgress,
} from '../../services/courseTrainer';
import type { OpeningRecord } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';

type Status = 'playing' | 'wrong' | 'lineDone';

/**
 * The adaptive tree-trainer (course-sparring). The opponent's moves are auto-
 * played; the student plays their own moves on the board, validated against the
 * line. Lines are chosen weighted by the learner signal (missed lines return
 * more). Self-contained — does NOT touch the locked /coach/play room.
 */
export function CourseTrainerPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<OpeningRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<DrillLine[]>([]);

  const progressRef = useRef<Record<string, TrainerProgress>>({});
  const chessRef = useRef(new Chess());
  const [line, setLine] = useState<DrillLine | null>(null);
  const [fen, setFen] = useState('start');
  const [boardKey, setBoardKey] = useState(0);
  const [plyPtr, setPlyPtr] = useState(0);
  const [status, setStatus] = useState<Status>('playing');
  const [hint, setHint] = useState<string | null>(null);
  const [score, setScore] = useState({ done: 0, correct: 0, attempts: 0 });

  useEffect(() => {
    let alive = true;
    if (!id) { setLoading(false); return; }
    void getOpeningById(id).then((o) => {
      if (!alive) return;
      setOpening(o ?? null);
      if (o) setLines(buildDrillLines(o));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [id]);

  /** Set up a line: auto-play the opponent's leading moves to the student's turn. */
  const startLine = useCallback((l: DrillLine) => {
    const c = new Chess();
    let ply = 0;
    while (ply < l.moves.length && !isStudentPly(ply, l.studentColor)) { c.move(l.moves[ply]); ply++; }
    chessRef.current = c;
    setLine(l);
    setPlyPtr(ply);
    setFen(c.fen());
    setBoardKey((k) => k + 1);
    setStatus(ply >= l.moves.length ? 'lineDone' : 'playing');
    setHint(null);
  }, []);

  const nextLine = useCallback(() => {
    const next = selectNextLine(lines, progressRef.current);
    if (next) startLine(next);
  }, [lines, startLine]);

  // Kick off the first line once lines are ready.
  useEffect(() => {
    if (lines.length > 0 && !line) nextLine();
  }, [lines, line, nextLine]);

  const recordAttempt = (lineId: string, missed: boolean): void => {
    const p = progressRef.current[lineId] ?? { attempts: 0, misses: 0 };
    progressRef.current[lineId] = { attempts: p.attempts + 1, misses: p.misses + (missed ? 1 : 0) };
  };

  const handleMove = (move: MoveResult): void => {
    if (!line || status !== 'playing') return;
    const expected = line.moves[plyPtr];
    if (move.san === expected) {
      // correct — apply + auto-play opponent reply to the next student turn
      const c = chessRef.current;
      c.move(expected);
      let ply = plyPtr + 1;
      while (ply < line.moves.length && !isStudentPly(ply, line.studentColor)) { c.move(line.moves[ply]); ply++; }
      if (ply >= line.moves.length) {
        recordAttempt(line.id, false);
        setScore((s) => ({ done: s.done + 1, correct: s.correct + 1, attempts: s.attempts + 1 }));
        setStatus('lineDone');
        setFen(c.fen());
        setBoardKey((k) => k + 1);
      } else {
        setPlyPtr(ply);
        setFen(c.fen());
        setBoardKey((k) => k + 1);
      }
    } else {
      // wrong — record a miss (line is re-weighted to return), show the right move
      recordAttempt(line.id, true);
      setScore((s) => ({ done: s.done + 1, correct: s.correct, attempts: s.attempts + 1 }));
      setHint(expected);
      setStatus('wrong');
      setBoardKey((k) => k + 1); // snap board back to the pre-move position
    }
  };

  const accuracy = score.attempts > 0 ? Math.round((score.correct / score.attempts) * 100) : 100;

  const shell = (children: JSX.Element): JSX.Element => (
    <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6" style={{ color: 'var(--color-text)' }} data-testid="course-trainer">
      {children}
    </div>
  );

  if (loading) return shell(<p className="text-sm text-theme-text-muted py-8 text-center">Loading trainer…</p>);
  if (!opening) return shell(
    <div className="py-8 text-center flex flex-col gap-3" data-testid="trainer-notfound">
      <p className="text-sm text-theme-text-muted">Course not found.</p>
      <button onClick={() => void navigate('/academy')} className="text-indigo-400 text-sm font-semibold">← Back to The Academy</button>
    </div>,
  );
  if (lines.length === 0) return shell(<p className="text-sm text-theme-text-muted py-8 text-center" data-testid="trainer-empty">No lines to train yet.</p>);

  return shell(
    <>
      <div className="max-w-lg mx-auto w-full flex items-center gap-2">
        <button onClick={() => void navigate(`/academy/course/${opening.id}`)} aria-label="Back to course" className="p-1 text-theme-text-muted hover:text-theme-text"><ChevronLeft size={22} /></button>
        <Target size={16} className="text-rose-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-theme-text-muted">Spar · {opening.name}</span>
      </div>

      {/* Status line */}
      <div className="max-w-lg mx-auto w-full flex items-center justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span data-testid="trainer-linelabel" className="truncate">{line?.label}</span>
        <span data-testid="trainer-score">{score.correct}/{score.attempts} · {accuracy}%</span>
      </div>

      <div className="max-w-lg mx-auto w-full">
        <ChessBoard
          key={boardKey}
          initialFen={fen}
          orientation={opening.color}
          onMove={handleMove}
        />
      </div>

      {/* Prompt / feedback */}
      <div className="max-w-lg mx-auto w-full min-h-[3rem]">
        {status === 'playing' && (
          <p className="text-sm font-semibold text-center text-indigo-300" data-testid="trainer-prompt">Your move — play the line.</p>
        )}
        {status === 'wrong' && (
          <div className="flex flex-col items-center gap-2" data-testid="trainer-wrong">
            <p className="text-sm font-semibold text-rose-400 flex items-center gap-1"><XCircle size={16} /> Not the move here.</p>
            {hint && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>The line goes <span className="font-mono font-bold text-theme-text">{hint}</span>.</p>}
            <button onClick={nextLine} className="mt-1 rounded-xl bg-indigo-500/20 border-2 border-indigo-400/60 px-5 py-2 font-bold text-indigo-100" data-testid="trainer-next-after-wrong">Next line →</button>
          </div>
        )}
        {status === 'lineDone' && (
          <div className="flex flex-col items-center gap-2" data-testid="trainer-linedone">
            <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1"><CheckCircle2 size={16} /> Line complete.</p>
            <button onClick={nextLine} className="mt-1 rounded-xl bg-indigo-500/20 border-2 border-indigo-400/60 px-5 py-2 font-bold text-indigo-100" data-testid="trainer-next">Next line →</button>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto w-full flex justify-center">
        <button onClick={nextLine} className="text-xs text-theme-text-muted hover:text-theme-text flex items-center gap-1" data-testid="trainer-skip"><SkipForward size={12} /> Skip this line</button>
      </div>
    </>,
  );
}
