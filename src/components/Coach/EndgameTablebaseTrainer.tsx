/**
 * EndgameTablebaseTrainer — interactive endgame training with the SYZYGY
 * tablebase as truth (Batch B / P-V.2, David 2026-09-01: "not just walks out but
 * allows the user to play and explains the why behind any mistakes and allows for
 * the user to correct").
 *
 * Three phases over one position:
 *   1. WATCH   — the coach plays the ending out at tablebase-perfect play with a
 *                grounded note per move.
 *   2. PLAY    — the student plays their side; the tablebase plays the other side
 *                optimally. Every student move is GRADED against the tablebase.
 *   3. CORRECT — on a real mistake (threw the win / threw the draw), the coach
 *                explains WHY (the certain WDL consequence + the best move's board
 *                point), reverts to the decision, and lets the student try again.
 *
 * G0/G3: the tablebase decides win/draw/loss + the best move; chess.js validates
 * every move; the WHY is computed (endgameTablebaseService). The LLM is not in
 * this loop at all — the narration text is the computed note/why, spoken as-is.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import type { MoveResult } from '../../hooks/useChessGame';
import { voiceService } from '../../services/voiceService';
import {
  buildTablebaseWalk,
  bestEndgameMove,
  gradeEndgameMove,
  type EndgameWalkStep,
  type EndgameMoveGrade,
} from '../../services/endgameTablebaseService';

interface EndgameTablebaseTrainerProps {
  /** Start position (≤7 pieces). */
  fen: string;
  /** The side the student plays. */
  studentColor: 'white' | 'black';
  /** Display title, e.g. "Lucena's Position". */
  title: string;
  /** Optional one-line technique framing spoken at the start of Watch. */
  intro?: string;
  onExit?: () => void;
}

type Phase = 'watch' | 'play' | 'done';

export function EndgameTablebaseTrainer({ fen, studentColor, title, intro, onExit }: EndgameTablebaseTrainerProps): JSX.Element {
  const chessRef = useRef<Chess>(new Chess());
  const [phase, setPhase] = useState<Phase>('watch');
  const [boardFen, setBoardFen] = useState(fen);
  const [boardKey, setBoardKey] = useState(0);
  const [highlight, setHighlight] = useState<{ from: string; to: string } | null>(null);
  const [arrows, setArrows] = useState<Array<{ startSquare: string; endSquare: string; color: string }>>([]);
  const [status, setStatus] = useState<string>('Watch the technique first.');
  const [feedback, setFeedback] = useState<{ text: string; correctable: boolean } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [walk, setWalk] = useState<EndgameWalkStep[] | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  /** The FEN the student is to move from — the correction anchor. */
  const decisionFenRef = useRef<string>(fen);

  const say = useCallback((text: string) => { void voiceService.speakForced(text).catch(() => {}); }, []);

  // Load the start position + fetch the perfect walk once.
  useEffect(() => {
    try { chessRef.current.load(fen); } catch { /* invalid fen guarded below */ }
    setBoardFen(fen);
    let cancelled = false;
    void (async () => {
      const steps = await buildTablebaseWalk(fen, 24);
      if (cancelled) return;
      if (steps.length === 0) { setUnreachable(true); setStatus("I can't reach the tablebase for this ending right now."); return; }
      setWalk(steps);
    })();
    return () => { cancelled = true; };
  }, [fen]);

  // WATCH: step through the perfect line with a grounded note per move.
  const runWatch = useCallback(async () => {
    if (!walk) return;
    if (intro) { say(intro); await wait(1400); }
    const board = new Chess(fen);
    for (const step of walk) {
      setBoardFen(step.fenBefore);
      setBoardKey((k) => k + 1);
      const from = step.uci.slice(0, 2); const to = step.uci.slice(2, 4);
      setArrows([{ startSquare: from, endSquare: to, color: '#22c55e' }]);
      say(`${sideWord(step.mover, studentColor)} ${step.note}.`);
      await wait(1700);
      try { board.move({ from, to, promotion: step.uci.length > 4 ? step.uci[4] : undefined }); } catch { break; }
      setBoardFen(board.fen());
      setBoardKey((k) => k + 1);
      setHighlight({ from, to });
      await wait(900);
    }
    setArrows([]);
    startPlay();
  }, [walk, fen, intro, studentColor, say]);

  const startPlay = useCallback(() => {
    try { chessRef.current.load(fen); } catch { /* guarded */ }
    setBoardFen(fen);
    setBoardKey((k) => k + 1);
    setHighlight(null);
    setArrows([]);
    setFeedback(null);
    decisionFenRef.current = fen;
    setPhase('play');
    // If the opponent is to move first, let the tablebase open.
    const toMove: 'white' | 'black' = fen.split(' ')[1] === 'b' ? 'black' : 'white';
    if (toMove !== studentColor) { void opponentReply(); setStatus('The tablebase moves first…'); }
    else setStatus('Your move — play the technique.');
    say('Now you play it. I\'ll stop you if you go wrong and we\'ll fix it together.');
  }, [fen, studentColor, say]);

  // The tablebase plays the other side optimally.
  const opponentReply = useCallback(async () => {
    if (chessRef.current.isGameOver()) { finish(); return; }
    setThinking(true);
    try {
      const best = await bestEndgameMove(chessRef.current.fen());
      if (best) {
        try {
          const m = chessRef.current.move({ from: best.uci.slice(0, 2), to: best.uci.slice(2, 4), promotion: best.uci.length > 4 ? best.uci[4] : undefined });
          setBoardFen(chessRef.current.fen());
          setBoardKey((k) => k + 1);
          setHighlight({ from: m.from, to: m.to });
        } catch { /* leave the board to the student */ }
      }
    } finally {
      setThinking(false);
    }
    if (chessRef.current.isGameOver()) { finish(); return; }
    decisionFenRef.current = chessRef.current.fen();
    setStatus('Your move.');
  }, []);

  const finish = useCallback(() => {
    setPhase('done');
    const c = chessRef.current;
    let msg = 'Ending complete.';
    if (c.isCheckmate()) msg = c.turn() === (studentColor === 'white' ? 'b' : 'w') ? 'Checkmate — you converted it. Clean.' : 'Checkmate against you.';
    else if (c.isDraw() || c.isStalemate()) msg = 'Drawn.';
    setStatus(msg);
    say(msg);
  }, [studentColor, say]);

  // PLAY: the student moved. Grade it against the tablebase.
  const onStudentMove = useCallback(async (mr: MoveResult) => {
    const before = decisionFenRef.current;
    // Apply to the ref so the board + ref agree, then grade from `before`.
    try { chessRef.current.load(before); chessRef.current.move({ from: mr.from, to: mr.to, promotion: mr.promotion }); } catch { return; }
    const uci = `${mr.from}${mr.to}${mr.promotion ?? ''}`;
    const grade: EndgameMoveGrade | null = await gradeEndgameMove(before, uci);

    if (grade && grade.isMistake) {
      // CORRECT: revert to the decision, explain WHY, let them retry.
      try { chessRef.current.load(before); } catch { /* stays */ }
      setBoardFen(before);
      setBoardKey((k) => k + 1);
      setHighlight(null);
      setFeedback({ text: grade.why, correctable: true });
      setStatus('Not that one — take it back and try again.');
      say(grade.why);
      return;
    }

    // Accepted (optimal or a slower-but-holds). Commit + let the tablebase reply.
    setBoardFen(chessRef.current.fen());
    setBoardKey((k) => k + 1);
    setHighlight({ from: mr.from, to: mr.to });
    setFeedback(grade?.verdict === 'slower' ? { text: grade.why, correctable: false } : null);
    if (chessRef.current.isGameOver()) { finish(); return; }
    await opponentReply();
  }, [opponentReply, finish, say]);

  // "Show me" — play the best move for the student at the decision point, then
  // continue. The tablebase supplies the move; the student sees the right idea.
  const showBestMove = useCallback(async () => {
    const before = decisionFenRef.current;
    const best = await bestEndgameMove(before);
    if (!best) return;
    try {
      chessRef.current.load(before);
      const m = chessRef.current.move({ from: best.uci.slice(0, 2), to: best.uci.slice(2, 4), promotion: best.uci.length > 4 ? best.uci[4] : undefined });
      setBoardFen(chessRef.current.fen());
      setBoardKey((k) => k + 1);
      setHighlight({ from: m.from, to: m.to });
      setFeedback(null);
      say(`The move is ${m.san}.`);
    } catch { return; }
    if (chessRef.current.isGameOver()) { finish(); return; }
    await opponentReply();
  }, [opponentReply, finish, say]);

  const interactive = phase === 'play' && !thinking && !(feedback?.correctable);

  return (
    <div className="space-y-3" data-testid="endgame-tablebase-trainer">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-theme-text">{title}</h3>
        {onExit && (
          <button type="button" onClick={onExit} className="text-xs text-theme-text-muted underline" data-testid="endgame-trainer-exit">
            Exit
          </button>
        )}
      </div>

      <div className="w-full md:max-w-[420px] mx-auto">
        <ChessBoard
          initialFen={boardFen}
          key={boardKey}
          orientation={studentColor}
          interactive={interactive}
          showFlipButton
          showUndoButton={false}
          showResetButton={false}
          onMove={(mr) => { void onStudentMove(mr); }}
          highlightSquares={highlight}
          arrows={arrows.length > 0 ? arrows : undefined}
        />
      </div>

      <p className="text-sm text-theme-text-muted text-center" data-testid="endgame-trainer-status">
        {thinking ? 'Working it out…' : status}
      </p>

      {feedback && (
        <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/10 p-3 text-sm text-theme-text" data-testid="endgame-trainer-feedback">
          {feedback.text}
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        {phase === 'watch' && !unreachable && walk && (
          <button type="button" onClick={() => { void runWatch(); }} className="rounded-xl border-2 border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-theme-text" data-testid="endgame-trainer-watch">
            Watch it
          </button>
        )}
        {phase === 'watch' && !unreachable && walk && (
          <button type="button" onClick={startPlay} className="rounded-xl border-2 border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-bold text-theme-text" data-testid="endgame-trainer-skip-to-play">
            Let me try
          </button>
        )}
        {phase === 'play' && feedback?.correctable && (
          <button type="button" onClick={() => { void showBestMove(); }} className="rounded-xl border-2 border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-bold text-theme-text" data-testid="endgame-trainer-show-me">
            Show me
          </button>
        )}
        {phase === 'done' && (
          <button type="button" onClick={startPlay} className="rounded-xl border-2 border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-theme-text" data-testid="endgame-trainer-again">
            Play it again
          </button>
        )}
      </div>
    </div>
  );
}

function wait(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

/** "You" for the student's side, "the tablebase" for the opponent — the app-wide
 *  perspective standard (student = you, opponent = they, never we/our). */
function sideWord(mover: 'white' | 'black', studentColor: 'white' | 'black'): string {
  return mover === studentColor ? 'You' : 'They';
}
