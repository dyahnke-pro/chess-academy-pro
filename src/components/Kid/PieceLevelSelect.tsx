import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { StarDisplay } from './StarDisplay';
import { PIECE_MAZE_LEVELS } from '../../data/pieceMazeLevels';
import { PIECE_SWEEP_LEVELS } from '../../data/pieceSweepLevels';
import { PIECE_RACE_LEVELS } from '../../data/pieceRaceLevels';
import { getPieceMazeProgress } from '../../services/pieceMazeService';
import { getPieceSweepProgress } from '../../services/pieceSweepService';
import { getPieceRaceProgress } from '../../services/pieceRaceService';
import type { ChessPiece } from '../../types';

// Reusable level picker for the generic per-piece games (maze / sweep /
// race). The hubs used to link straight to level 1, so levels 2+ were
// unreachable — this surfaces the whole set with the stars earned so
// far. Route: /kid/level-select/:piece/:game.

type Game = 'maze' | 'sweep' | 'race';

interface LevelRow { piece: string; id: number; name: string }

const GAME_LABEL: Record<Game, string> = { maze: 'Maze', sweep: 'Sweep', race: 'Race' };
const PIECE_LABEL: Record<ChessPiece, string> = {
  king: 'King', queen: 'Queen', rook: 'Rook', bishop: 'Bishop', knight: 'Knight', pawn: 'Pawn',
};
const PIECE_HUB_ROUTE: Record<ChessPiece, string> = {
  king: '/kid/king-games', queen: '/kid/queen-games', rook: '/kid/rook-games',
  bishop: '/kid/bishop-games', knight: '/kid/knight-games', pawn: '/kid/pawn-games',
};

const ALL_LEVELS: Record<Game, LevelRow[]> = {
  maze: PIECE_MAZE_LEVELS,
  sweep: PIECE_SWEEP_LEVELS,
  race: PIECE_RACE_LEVELS,
};
const PROGRESS_FN: Record<Game, () => Promise<{ levels: Record<string, { stars: number }> }>> = {
  maze: getPieceMazeProgress,
  sweep: getPieceSweepProgress,
  race: getPieceRaceProgress,
};

function isGame(g: string | undefined): g is Game {
  return g === 'maze' || g === 'sweep' || g === 'race';
}
function isPiece(p: string | undefined): p is ChessPiece {
  return !!p && p in PIECE_HUB_ROUTE;
}

export function PieceLevelSelect(): JSX.Element {
  const { piece, game } = useParams<{ piece: string; game: string }>();
  const navigate = useNavigate();
  const [stars, setStars] = useState<Record<string, number>>({});

  const valid = isPiece(piece) && isGame(game);

  const levels = useMemo(
    () => (valid ? ALL_LEVELS[game].filter((l) => l.piece === piece) : []),
    [valid, game, piece],
  );

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    void PROGRESS_FN[game]().then((p) => {
      if (cancelled) return;
      const map: Record<string, number> = {};
      for (const [k, v] of Object.entries(p.levels)) map[k] = v.stars;
      setStars(map);
    });
    return () => { cancelled = true; };
  }, [valid, game]);

  useEffect(() => {
    if (!valid) void navigate('/kid');
  }, [valid, navigate]);

  if (!valid) return <></>;
  const p = piece;
  const g = game;

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid={`level-select-${p}-${g}`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => void navigate(PIECE_HUB_ROUTE[p])}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--color-surface)' }}
          aria-label="Back to hub"
          data-testid="level-select-back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-xl font-bold">{PIECE_LABEL[p]} {GAME_LABEL[g]} — Pick a Level</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full">
        {levels.map((lvl) => {
          const earned = stars[`${p}:${lvl.id}`] ?? 0;
          return (
            <button
              key={lvl.id}
              onClick={() => void navigate(`/kid/${p}-games/${g}/${lvl.id}`)}
              className="rounded-2xl p-4 border-2 flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-accent)' }}
              data-testid={`level-select-${lvl.id}`}
            >
              <span className="text-2xl font-bold">{lvl.id}</span>
              <span className="text-sm font-semibold text-center">{lvl.name}</span>
              <StarDisplay earned={earned} total={3} size="sm" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
