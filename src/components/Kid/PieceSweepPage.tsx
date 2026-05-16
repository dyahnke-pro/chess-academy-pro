import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { SquareHandlerArgs } from 'react-chessboard';
import { KidChessboard } from '../Chessboard/KidChessboard';
import { StarDisplay } from './StarDisplay';
import { voiceService } from '../../services/voiceService';
import { PIECE_SWEEP_LEVELS } from '../../data/pieceSweepLevels';
import {
  getPieceSweepLegalMoves,
  buildPieceSweepPieceMap,
  completePieceSweepLevel,
} from '../../services/pieceSweepService';
import type { ChessPiece } from '../../types';

// Per-piece sweep — capture every target in fewest moves. Routed at
// /kid/<piece>-games/sweep/:level. Reuses the piece-maze chassis but
// with multi-target win condition + capture-aware legal moves.

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

export function PieceSweepPage({ piece }: Props): JSX.Element {
  const { level: levelParam } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const levelId = parseInt(levelParam ?? '1', 10);
  const level = useMemo(
    () => PIECE_SWEEP_LEVELS.find((l) => l.piece === piece && l.id === levelId),
    [piece, levelId],
  );

  const [piecePos, setPiecePos] = useState(level?.pieceStart ?? 'a1');
  const [remaining, setRemaining] = useState<string[]>(level?.targets ?? []);
  const [moveCount, setMoveCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [voiceOn, setVoiceOn] = useState(true);
  const [stars, setStars] = useState(0);
  const hasSpoken = useRef(false);

  const obstaclesSet = useMemo(
    () => new Set(level?.obstacles ?? []),
    [level?.obstacles],
  );
  const remainingSet = useMemo(() => new Set(remaining), [remaining]);

  const legalMoves = useMemo(
    () => (phase === 'playing' && level
      ? getPieceSweepLegalMoves(piece, piecePos, obstaclesSet, remainingSet)
      : []),
    [phase, level, piece, piecePos, obstaclesSet, remainingSet],
  );
  const legalSet = useMemo(() => new Set(legalMoves), [legalMoves]);

  const pieceMap = useMemo(() => {
    if (!level) return {};
    return buildPieceSweepPieceMap(piece, piecePos, remaining, level.obstacles);
  }, [piece, piecePos, remaining, level]);

  useEffect(() => {
    if (!level) {
      void navigate(PIECE_HUB_ROUTE[piece]);
      return;
    }
    if (!hasSpoken.current && voiceOn) {
      hasSpoken.current = true;
      void voiceService.speak(`${PIECE_LABEL[piece]} sweep. Capture every target.`);
    }
  }, [level, piece, voiceOn, navigate]);

  const handleSquareClick = useCallback(({ square }: SquareHandlerArgs): void => {
    if (phase !== 'playing' || !level) return;
    if (!legalSet.has(square)) return;
    const nextMoves = moveCount + 1;
    setPiecePos(square);
    setMoveCount(nextMoves);
    // If this square was a target, remove it.
    let nextRemaining = remaining;
    if (remainingSet.has(square)) {
      nextRemaining = remaining.filter((t) => t !== square);
      setRemaining(nextRemaining);
    }
    if (nextRemaining.length === 0) {
      setPhase('won');
      void completePieceSweepLevel(piece, level.id, nextMoves, level.par).then((p) => {
        setStars(p.stars);
        if (voiceOn) {
          const msg = p.stars === 3 ? 'Perfect run!'
            : p.stars === 2 ? 'Nicely done.'
            : 'You cleared it.';
          void voiceService.speak(msg);
        }
      });
    }
  }, [phase, level, legalSet, moveCount, remaining, remainingSet, piece, voiceOn]);

  const handleRestart = useCallback((): void => {
    if (!level) return;
    setPiecePos(level.pieceStart);
    setRemaining(level.targets);
    setMoveCount(0);
    setPhase('playing');
    setStars(0);
    voiceService.stop();
  }, [level]);

  const handleToggleVoice = useCallback((): void => {
    voiceService.stop();
    setVoiceOn((v) => !v);
  }, []);

  if (!level) return <></>;

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
      data-testid={`piece-sweep-${piece}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => void navigate(PIECE_HUB_ROUTE[piece])}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ background: 'var(--color-surface)' }}
            aria-label="Back to hub"
            data-testid="piece-sweep-back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-xl font-bold">
            {PIECE_LABEL[piece]} Sweep · {level.name}
          </h2>
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

      <div className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Moves: <span data-testid="piece-sweep-move-count">{moveCount}</span>
        {' '}· Par: {level.par}
        {' '}· Remaining: <span data-testid="piece-sweep-remaining">{remaining.length}</span>
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
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-accent)',
          }}
          data-testid="piece-sweep-won"
        >
          <p className="text-xl font-bold mb-2">All targets captured!</p>
          <StarDisplay earned={stars} total={3} size="lg" />
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {moveCount} moves · Par {level.par}
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={handleRestart}
              className="px-4 py-2 rounded-lg font-semibold border"
              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
              data-testid="piece-sweep-replay"
            >
              <RotateCcw size={14} className="inline mr-1" />
              Replay
            </button>
            <button
              onClick={() => void navigate(PIECE_HUB_ROUTE[piece])}
              className="px-4 py-2 rounded-lg font-semibold"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              data-testid="piece-sweep-back-to-hub"
            >
              Back to {PIECE_LABEL[piece]} Games
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
