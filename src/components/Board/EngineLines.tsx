import { useMemo } from 'react';
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../../types';

interface EngineLinesProps {
  lines: AnalysisLine[];
  fen: string;
  className?: string;
}

/**
 * Convert a list of UCI moves into SAN notation for display.
 * Shows up to `maxMoves` from the PV line.
 */
function uciToSan(uciMoves: string[], fen: string, maxMoves: number = 6): string {
  try {
    const chess = new Chess(fen);
    const result: string[] = [];
    for (let i = 0; i < Math.min(uciMoves.length, maxMoves); i++) {
      const from = uciMoves[i].slice(0, 2);
      const to = uciMoves[i].slice(2, 4);
      const promotion = uciMoves[i].length > 4 ? uciMoves[i][4] : undefined;
      const move = chess.move({ from, to, promotion });
      if (!move) break;
      // Prefix with move number for white moves
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
    // Fallback to UCI if parsing fails
    return uciMoves.slice(0, maxMoves).join(' ');
  }
}

function formatEval(line: AnalysisLine): string {
  if (line.mate !== null) {
    return line.mate > 0 ? `M${line.mate}` : `-M${Math.abs(line.mate)}`;
  }
  const pawns = line.evaluation / 100;
  return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

/**
 * Compact engine lines display — shows top Stockfish lines with eval + SAN moves.
 * Designed to fit in a single row per line without scrolling on mobile.
 */
export function EngineLines({ lines, fen, className = '' }: EngineLinesProps): JSX.Element {
  const sortedLines = useMemo(() =>
    [...lines].sort((a, b) => a.rank - b.rank),
    [lines],
  );

  if (sortedLines.length === 0) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 text-xs text-theme-text-muted ${className}`}
        data-testid="engine-lines"
      >
        Analyzing...
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-0 ${className}`} data-testid="engine-lines">
      {sortedLines.map((line) => (
        <div
          key={line.rank}
          className="flex items-center gap-2 px-3 py-0.5 text-xs"
          data-testid={`engine-line-${line.rank}`}
        >
          <span
            className={`font-mono font-bold w-12 text-right shrink-0 ${
              line.evaluation > 0 || (line.mate !== null && line.mate > 0)
                ? 'text-green-500'
                : line.evaluation < 0 || (line.mate !== null && line.mate < 0)
                  ? 'text-red-500'
                  : 'text-theme-text-muted'
            }`}
          >
            {formatEval(line)}
          </span>
          <span className="font-mono text-theme-text truncate">
            {line.moves.length > 0 ? uciToSan(line.moves, fen) : '...'}
          </span>
        </div>
      ))}
    </div>
  );
}
