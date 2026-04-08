import { useState, useCallback, useEffect } from 'react';
import { ControlledChessBoard } from '../Board/ControlledChessBoard';
import { useChessGame } from '../../hooks/useChessGame';
import { MoveTree } from '../Openings/MoveTree';
import { ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, Download, Bot, Loader2 } from 'lucide-react';
import { useBoardContext } from '../../hooks/useBoardContext';
import { requestGameReview } from '../../services/gameReviewService';
import type { GameRecord } from '../../types';

interface GameViewerProps {
  game: GameRecord;
  onClose: () => void;
}

export function GameViewer({ game, onClose }: GameViewerProps): JSX.Element {
  const chessGame = useChessGame();
  const moves = parsePgnMoves(game.pgn);
  const [moveIdx, setMoveIdx] = useState(-1);
  const [coachAnalysis, setCoachAnalysis] = useState(game.coachAnalysis);
  const [reviewing, setReviewing] = useState(false);

  const currentFen = moveIdx >= 0 && moveIdx < moves.length
    ? moves[moveIdx].fen
    : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // Publish board context for global coach drawer
  const turn = currentFen.split(' ')[1] === 'b' ? 'b' : 'w';
  const viewerHistory = moves.slice(0, Math.max(0, moveIdx + 1)).map((m) => m.san);
  useBoardContext(currentFen, game.pgn, Math.max(0, moveIdx + 1), 'white', turn, undefined, viewerHistory);

  const handleKeyDown = useCallback((e: KeyboardEvent): void => {
    if (e.key === 'ArrowRight') {
      setMoveIdx((i) => Math.min(i + 1, moves.length - 1));
    } else if (e.key === 'ArrowLeft') {
      setMoveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Home') {
      setMoveIdx(-1);
    } else if (e.key === 'End') {
      setMoveIdx(moves.length - 1);
    }
  }, [moves.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCoachReview = useCallback(async (): Promise<void> => {
    if (reviewing || !game.id) return;
    setReviewing(true);
    let streamed = '';
    try {
      await requestGameReview(game.id, (chunk) => {
        streamed += chunk;
        setCoachAnalysis(streamed);
      });
    } catch {
      // If streaming fails, coachAnalysis stays as-is
    } finally {
      setReviewing(false);
    }
  }, [game.id, reviewing]);

  const handleExportPgn = (): void => {
    const blob = new Blob([game.pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.white}_vs_${game.black}_${game.date}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" data-testid="game-viewer">
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--color-surface)' }}
          data-testid="close-viewer-btn"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-sm">{game.white} vs {game.black}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{game.result} · {game.date}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleCoachReview()}
            disabled={reviewing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="coach-review-btn"
          >
            {reviewing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
            {reviewing ? 'Reviewing…' : 'Coach Review'}
          </button>
          <button
            onClick={handleExportPgn}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ background: 'var(--color-surface)' }}
            data-testid="export-pgn-btn"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="w-full md:max-w-[420px] mx-auto">
        <ControlledChessBoard
          game={chessGame}
          positionOverride={currentFen}
          interactive={false}
          showFlipButton
          showUndoButton={false}
          showResetButton={false}
        />
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setMoveIdx(-1)} className="p-2 rounded hover:opacity-80" style={{ background: 'var(--color-surface)' }} data-testid="nav-start">
          <ChevronsLeft size={18} />
        </button>
        <button onClick={() => setMoveIdx((i) => Math.max(i - 1, -1))} className="p-2 rounded hover:opacity-80" style={{ background: 'var(--color-surface)' }} data-testid="nav-prev">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm px-3" style={{ color: 'var(--color-text-muted)' }}>
          {moveIdx + 1}/{moves.length}
        </span>
        <button onClick={() => setMoveIdx((i) => Math.min(i + 1, moves.length - 1))} className="p-2 rounded hover:opacity-80" style={{ background: 'var(--color-surface)' }} data-testid="nav-next">
          <ArrowRight size={18} />
        </button>
        <button onClick={() => setMoveIdx(moves.length - 1)} className="p-2 rounded hover:opacity-80" style={{ background: 'var(--color-surface)' }} data-testid="nav-end">
          <ChevronsRight size={18} />
        </button>
      </div>

      {/* Move list */}
      {game.pgn && (
        <div
          className="rounded-xl p-4 border max-h-48 overflow-y-auto"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
        >
          <MoveTree
            mainLinePgn={stripPgnHeaders(game.pgn)}
            currentMoveIndex={moveIdx}
            onMoveSelect={(idx) => setMoveIdx(idx)}
          />
        </div>
      )}

      {coachAnalysis && (
        <div
          className="rounded-xl p-4 border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          data-testid="coach-analysis-panel"
        >
          <h3 className="font-semibold text-sm mb-2">Coach Analysis</h3>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-muted)' }}>
            {coachAnalysis}
          </p>
        </div>
      )}
    </div>
  );
}

interface ParsedMove {
  san: string;
  fen: string;
}

function stripPgnHeaders(pgn: string): string {
  return pgn
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\{.*?\}/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
    .replace(/\d+\.\.\./g, '')
    .replace(/\d+\./g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function parsePgnMoves(pgn: string): ParsedMove[] {
  // Simple PGN move extraction — strip headers and result
  const moveText = pgn
    .replace(/\[.*?\]/g, '')
    .replace(/\{.*?\}/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
    .trim();

  if (!moveText) return [];

  const tokens = moveText.split(/\s+/).filter((t) => !t.match(/^\d+\.+$/));
  // Return tokens as moves with placeholder FENs (real FEN requires chess.js replay)
  return tokens.map((san) => ({
    san,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  }));
}
