import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Timer } from 'lucide-react';
import type { SquareHandlerArgs } from 'react-chessboard';
import { KidChessboard } from '../Chessboard/KidChessboard';
import { StarDisplay } from './StarDisplay';
import { voiceService } from '../../services/voiceService';
import { PIECE_RACE_LEVELS } from '../../data/pieceRaceLevels';
import {
  getPieceRaceLegalMoves,
  buildPieceRacePieceMap,
  completePieceRaceLevel,
} from '../../services/pieceRaceService';
import type { ChessPiece } from '../../types';

// Time-trial race — capture every target as FAST as you can. The timer
// IS the point, so the clock is sanctioned here (kids non-negotiable
// #7's carve-out, like Color Wars). Reuses the sweep movement + board
// helpers; only the scoring (elapsed seconds) differs.

interface Props {
  piece: ChessPiece;
}

const PIECE_LABEL: Record<ChessPiece, string> = {
  king: 'King', queen: 'Queen', rook: 'Rook',
  bishop: 'Bishop', knight: 'Knight', pawn: 'Pawn',
};

const PIECE_HUB_ROUTE: Record<ChessPiece, string> = {
  king: '/kid/king-games',
  queen: '/kid/queen-games',
  rook: '/kid/rook-games',
  bishop: '/kid/bishop-games',
  knight: '/kid/knight-games',
  pawn: '/kid/pawn-games',
};

type Phase = 'playing' | 'won';

export function PieceRaceGame({ piece }: Props): JSX.Element {
  const { level: levelParam } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const levelId = parseInt(levelParam ?? '1', 10);
  const level = useMemo(
    () => PIECE_RACE_LEVELS.find((l) => l.piece === piece && l.id === levelId),
    [piece, levelId],
  );

  const [piecePos, setPiecePos] = useState(level?.pieceStart ?? 'a1');
  const [remaining, setRemaining] = useState<string[]>(level?.targets ?? []);
  const [phase, setPhase] = useState<Phase>('playing');
  const [voiceOn, setVoiceOn] = useState(true);
  const [stars, setStars] = useState(0);
  // Timer: starts on the FIRST move so the kid can study the board.
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalSec, setFinalSec] = useState(0);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSpoken = useRef(false);

  const obstaclesSet = useMemo(() => new Set(level?.obstacles ?? []), [level?.obstacles]);
  const remainingSet = useMemo(() => new Set(remaining), [remaining]);

  const legalMoves = useMemo(
    () => (phase === 'playing' && level
      ? getPieceRaceLegalMoves(piece, piecePos, obstaclesSet, remainingSet)
      : []),
    [phase, level, piece, piecePos, obstaclesSet, remainingSet],
  );
  const legalSet = useMemo(() => new Set(legalMoves), [legalMoves]);

  const pieceMap = useMemo(() => {
    if (!level) return {};
    return buildPieceRacePieceMap(piece, piecePos, remaining, level.obstacles ?? []);
  }, [piece, piecePos, remaining, level]);

  // Tick the clock while the race is running.
  useEffect(() => {
    if (!started || phase !== 'playing') return;
    intervalRef.current = setInterval(() => {
      if (startRef.current !== null) {
        setElapsed((Date.now() - startRef.current) / 1000);
      }
    }, 200);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [started, phase]);

  // Intro narration + missing-level redirect; stop voice on unmount.
  useEffect(() => {
    if (!level) {
      void navigate(PIECE_HUB_ROUTE[piece]);
      return;
    }
    if (!hasSpoken.current && voiceOn) {
      hasSpoken.current = true;
      void voiceService.speak(`${PIECE_LABEL[piece]} race! Capture every target as fast as you can.`);
    }
  }, [level, piece, voiceOn, navigate]);

  useEffect(() => () => { voiceService.stop(); }, []);

  const handleSquareClick = useCallback(({ square }: SquareHandlerArgs): void => {
    if (phase !== 'playing' || !level) return;
    if (!legalSet.has(square)) return;
    if (!started) { startRef.current = Date.now(); setStarted(true); }
    setPiecePos(square);
    let nextRemaining = remaining;
    if (remainingSet.has(square)) {
      nextRemaining = remaining.filter((t) => t !== square);
      setRemaining(nextRemaining);
    }
    if (nextRemaining.length === 0) {
      const sec = startRef.current !== null ? (Date.now() - startRef.current) / 1000 : elapsed;
      setFinalSec(sec);
      setPhase('won');
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      void completePieceRaceLevel(piece, level.id, sec, level.goldSec, level.silverSec).then((p) => {
        setStars(p.stars);
        if (voiceOn) {
          const msg = p.stars === 3 ? 'Lightning fast!'
            : p.stars === 2 ? 'Nice and quick.'
            : 'You finished the race.';
          void voiceService.speak(msg);
        }
      });
    }
  }, [phase, level, legalSet, started, remaining, remainingSet, elapsed, piece, voiceOn]);

  const handleRestart = useCallback((): void => {
    if (!level) return;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    startRef.current = null;
    setStarted(false);
    setElapsed(0);
    setFinalSec(0);
    setPiecePos(level.pieceStart);
    setRemaining(level.targets);
    setPhase('playing');
    setStars(0);
    voiceService.stop();
  }, [level]);

  const handleToggleVoice = useCallback((): void => {
    voiceService.stop();
    setVoiceOn((v) => !v);
  }, []);

  if (!level) return <></>;

  const shownSec = phase === 'won' ? finalSec : elapsed;
  const legalHighlight = Object.fromEntries(
    legalMoves.map((sq) => [sq, { background: 'rgba(59, 130, 246, 0.20)' }]),
  );
  const targetHighlight = Object.fromEntries(
    remaining.map((sq) => [sq, { background: 'rgba(239, 68, 68, 0.25)' }]),
  );

  return (
    <div
      className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid={`piece-race-${piece}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => void navigate(PIECE_HUB_ROUTE[piece])}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ background: 'var(--color-surface)' }}
            aria-label="Back to hub"
            data-testid="piece-race-back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-xl font-bold">{PIECE_LABEL[piece]} Race · {level.name}</h2>
        </div>
        <button
          onClick={handleToggleVoice}
          className="p-2 rounded-lg border transition-colors"
          style={{
            background: voiceOn ? 'var(--color-accent)' : 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: voiceOn ? 'var(--color-bg)' : 'var(--color-text-muted)',
          }}
          aria-label={voiceOn ? 'Mute voice' : 'Unmute voice'}
        >
          {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 text-lg font-bold" data-testid="piece-race-timer">
        <Timer size={18} />
        <span>{shownSec.toFixed(1)}s</span>
        <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>
          · ⭐ under {level.goldSec}s · Left: <span data-testid="piece-race-remaining">{remaining.length}</span>
        </span>
      </div>

      <div className="w-full md:max-w-[420px] mx-auto">
        <KidChessboard
          fen={pieceMap}
          onSquareClick={phase === 'playing' ? handleSquareClick : undefined}
          interactive={false}
          squareStyles={{ ...targetHighlight, ...legalHighlight }}
        />
      </div>

      {phase === 'won' && (
        <div
          className="rounded-2xl p-6 border-2 text-center"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-accent)' }}
          data-testid="piece-race-won"
        >
          <p className="text-xl font-bold mb-2">Race finished in {finalSec.toFixed(1)}s!</p>
          <StarDisplay earned={stars} total={3} size="lg" />
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            ⭐⭐⭐ under {level.goldSec}s · ⭐⭐ under {level.silverSec}s
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={handleRestart}
              className="px-4 py-2 rounded-lg font-semibold border"
              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
              data-testid="piece-race-replay"
            >
              <RotateCcw size={14} className="inline mr-1" />
              Race Again
            </button>
            <button
              onClick={() => void navigate(PIECE_HUB_ROUTE[piece])}
              className="px-4 py-2 rounded-lg font-semibold"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              data-testid="piece-race-back-to-hub"
            >
              Back to {PIECE_LABEL[piece]} Games
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
