import { useMemo } from 'react';
import { Chess } from 'chess.js';
import type { LichessCloudEval } from '../../types';

interface LichessLinesProps {
  cloudEval: LichessCloudEval;
  fen: string;
  className?: string;
}

/**
 * Convert a space-separated string of UCI moves into SAN notation.
 */
function uciStringToSan(uciString: string, fen: string, maxMoves: number = 6): string {
  try {
    const chess = new Chess(fen);
    const uciMoves = uciString.split(' ').filter(Boolean);
    const result: string[] = [];
    for (let i = 0; i < Math.min(uciMoves.length, maxMoves); i++) {
      const from = uciMoves[i].slice(0, 2);
      const to = uciMoves[i].slice(2, 4);
      const promotion = uciMoves[i].length > 4 ? uciMoves[i][4] : undefined;
      const move = chess.move({ from, to, promotion });
      if (move.color === 'w') {
        result.push(`${chess.moveNumber() - 1}.${move.san}`);
      } else if (i === 0) {
        result.push(`${chess.moveNumber()}...${move.san}`);
      } else {
        result.push(move.san);
      }
    }
    return result.join(' ');
  } catch {
    return uciString.split(' ').slice(0, maxMoves).join(' ');
  }
}

function formatPvEval(pv: { cp?: number; mate?: number }): string {
  if (pv.mate !== undefined) {
    return pv.mate > 0 ? `M${pv.mate}` : `-M${Math.abs(pv.mate)}`;
  }
  if (pv.cp !== undefined) {
    const pawns = pv.cp / 100;
    return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
  }
  return '0.0';
}

function evalColorClass(pv: { cp?: number; mate?: number }): string {
  if (pv.mate !== undefined) {
    return pv.mate > 0 ? 'text-green-500' : 'text-red-500';
  }
  if (pv.cp !== undefined) {
    return pv.cp > 0 ? 'text-green-500' : pv.cp < 0 ? 'text-red-500' : 'text-theme-text-muted';
  }
  return 'text-theme-text-muted';
}

/**
 * Compact Lichess cloud eval lines display.
 * Shows top lines from the Lichess cloud evaluation database.
 */
export function LichessLines({ cloudEval, fen, className = '' }: LichessLinesProps): JSX.Element {
  const lines = useMemo(() => cloudEval.pvs.slice(0, 3), [cloudEval.pvs]);

  return (
    <div className={`flex flex-col gap-0 ${className}`} data-testid="lichess-lines">
      <div className="flex items-center gap-1 px-3 py-0.5">
        <span className="text-[10px] font-medium text-theme-text-muted uppercase tracking-wide">
          Lichess Cloud · d{cloudEval.depth}
        </span>
      </div>
      {lines.map((pv, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 px-3 py-0.5 text-xs"
          data-testid={`lichess-line-${idx + 1}`}
        >
          <span className={`font-mono font-bold w-12 text-right shrink-0 ${evalColorClass(pv)}`}>
            {formatPvEval(pv)}
          </span>
          <span className="font-mono text-theme-text truncate">
            {pv.moves ? uciStringToSan(pv.moves, fen) : '...'}
          </span>
        </div>
      ))}
    </div>
  );
}
