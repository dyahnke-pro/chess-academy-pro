import { useMemo } from 'react';
import { Chess } from 'chess.js';
import type { OpeningVariation } from '../../types';

export interface MoveTreeProps {
  /** The main line PGN (space-separated SAN tokens, no move numbers). */
  mainLinePgn: string;
  /** Optional variations branching from this opening. */
  variations?: OpeningVariation[] | null;
  /** Index of the currently highlighted move (0-based into mainLineMoves). */
  currentMoveIndex: number;
  /** Called when the user clicks a move in the tree. */
  onMoveSelect: (moveIndex: number, variationIndex?: number) => void;
  /** Index of the active variation (-1 for main line). */
  activeVariation?: number;
}

interface ParsedMove {
  san: string;
  moveNumber: number;
  isWhite: boolean;
}

function parsePgn(pgn: string): ParsedMove[] {
  const chess = new Chess();
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  const moves: ParsedMove[] = [];

  for (const san of tokens) {
    try {
      chess.move(san);
      const fullHistory = chess.history();
      const idx = fullHistory.length - 1;
      moves.push({
        san,
        moveNumber: Math.floor(idx / 2) + 1,
        isWhite: idx % 2 === 0,
      });
    } catch {
      break;
    }
  }
  return moves;
}

export function MoveTree({
  mainLinePgn,
  variations,
  currentMoveIndex,
  onMoveSelect,
  activeVariation = -1,
}: MoveTreeProps): JSX.Element {
  const mainMoves = useMemo(() => parsePgn(mainLinePgn), [mainLinePgn]);

  const parsedVariations = useMemo(
    () => (variations ?? []).map((v) => ({ ...v, moves: parsePgn(v.pgn) })),
    [variations],
  );

  return (
    <div className="space-y-3" data-testid="move-tree">
      {/* Main line */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted mb-1">
          Main Line
        </div>
        <div className="flex flex-wrap gap-0.5" data-testid="main-line-moves">
          {mainMoves.map((move, i) => (
            <span key={i} className="inline-flex items-center">
              {move.isWhite && (
                <span className="text-xs text-theme-text-muted mr-0.5">
                  {move.moveNumber}.
                </span>
              )}
              <button
                onClick={() => onMoveSelect(i)}
                className={`px-1.5 py-0.5 rounded text-sm font-mono transition-colors ${
                  activeVariation === -1 && i === currentMoveIndex
                    ? 'bg-theme-accent text-white font-bold'
                    : 'text-theme-text hover:bg-theme-surface'
                }`}
                data-testid={`main-move-${i}`}
              >
                {move.san}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Variations */}
      {parsedVariations.map((variation, vIdx) => (
        <div key={vIdx} className="pl-3 border-l-2 border-theme-border">
          <div className="text-xs font-semibold text-theme-accent mb-1">
            {variation.name}
          </div>
          <div className="flex flex-wrap gap-0.5" data-testid={`variation-${vIdx}-moves`}>
            {variation.moves.map((move, mIdx) => (
              <span key={mIdx} className="inline-flex items-center">
                {move.isWhite && (
                  <span className="text-xs text-theme-text-muted mr-0.5">
                    {move.moveNumber}.
                  </span>
                )}
                <button
                  onClick={() => onMoveSelect(mIdx, vIdx)}
                  className={`px-1.5 py-0.5 rounded text-sm font-mono transition-colors ${
                    activeVariation === vIdx && mIdx === currentMoveIndex
                      ? 'bg-theme-accent text-white font-bold'
                      : 'text-theme-text hover:bg-theme-surface'
                  }`}
                  data-testid={`var-${vIdx}-move-${mIdx}`}
                >
                  {move.san}
                </button>
              </span>
            ))}
          </div>
          <p className="text-xs text-theme-text-muted mt-1">{variation.explanation}</p>
        </div>
      ))}
    </div>
  );
}
