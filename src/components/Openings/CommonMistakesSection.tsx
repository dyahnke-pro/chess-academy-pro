import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { BoardVoiceOverlay } from '../Board/BoardVoiceOverlay';
import { Ban, ChevronDown, ChevronUp } from 'lucide-react';
import type { CommonMistake } from '../../types';
import type { BoardArrow } from '../Chessboard/ConsistentChessboard';

/** Resolve a SAN move against a FEN into {from, to} squares. */
function resolveMoveSquares(
  fen: string,
  san: string,
): { from: string; to: string } | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);
    return { from: move.from, to: move.to };
  } catch {
    return null;
  }
}

const WRONG_ARROW_COLOR = 'rgba(239, 68, 68, 0.85)'; // red
const CORRECT_ARROW_COLOR = 'rgba(34, 197, 94, 0.85)'; // green

interface CommonMistakesSectionProps {
  mistakes: CommonMistake[];
  boardOrientation: 'white' | 'black';
}

export function CommonMistakesSection({
  mistakes,
  boardOrientation,
}: CommonMistakesSectionProps): JSX.Element {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (mistakes.length === 0) return <div data-testid="common-mistakes-empty" />;

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="common-mistakes-section">
      <div className="flex items-center gap-2 mb-3">
        <Ban size={14} className="text-red-400" />
        <h3 className="text-sm font-semibold text-theme-text">
          Common Mistakes ({mistakes.length})
        </h3>
      </div>
      <p className="text-xs text-theme-text-muted mb-3">
        Natural-looking moves that are actually wrong. Learn what NOT to play.
      </p>
      <div className="space-y-2">
        {mistakes.map((mistake, i) => {
          const isExpanded = expandedIndex === i;
          return (
            <MistakeCard
              key={i}
              index={i}
              mistake={mistake}
              isExpanded={isExpanded}
              onToggle={() => setExpandedIndex(isExpanded ? null : i)}
              boardOrientation={boardOrientation}
            />
          );
        })}
      </div>
    </div>
  );
}

interface MistakeCardProps {
  index: number;
  mistake: CommonMistake;
  isExpanded: boolean;
  onToggle: () => void;
  boardOrientation: 'white' | 'black';
}

function MistakeCard({
  index: i,
  mistake,
  isExpanded,
  onToggle,
  boardOrientation,
}: MistakeCardProps): JSX.Element {
  // Compute red arrow (wrong move) and green arrow (correct move) by
  // replaying each SAN against the position. Both failures render the
  // board without arrows rather than crashing — curated data sometimes
  // has moves in non-standard notation.
  const arrows = useMemo((): BoardArrow[] => {
    const out: BoardArrow[] = [];
    const wrong = resolveMoveSquares(mistake.fen, mistake.wrongMove);
    const correct = resolveMoveSquares(mistake.fen, mistake.correctMove);
    if (wrong) {
      out.push({ startSquare: wrong.from, endSquare: wrong.to, color: WRONG_ARROW_COLOR });
    }
    if (correct) {
      out.push({ startSquare: correct.from, endSquare: correct.to, color: CORRECT_ARROW_COLOR });
    }
    return out;
  }, [mistake.fen, mistake.wrongMove, mistake.correctMove]);

  return (
    <div
      className="rounded-lg border border-red-500/20 overflow-hidden"
      data-testid={`mistake-${i}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-500/5 transition-colors"
        data-testid={`mistake-toggle-${i}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-red-400 line-through">
              {mistake.wrongMove}
            </span>
            <span className="text-theme-text-muted text-xs">→</span>
            <span className="text-sm font-mono text-green-400">
              {mistake.correctMove}
            </span>
          </div>
          <p className="text-xs text-theme-text-muted mt-0.5 truncate">
            {mistake.explanation}
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-theme-text-muted shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-theme-text-muted shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex justify-center">
            <BoardVoiceOverlay fen={mistake.fen} className="w-48 h-48">
              <ConsistentChessboard
                fen={mistake.fen}
                boardOrientation={boardOrientation}
                arrows={arrows.length > 0 ? arrows : undefined}
              />
            </BoardVoiceOverlay>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-theme-text-muted">
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: WRONG_ARROW_COLOR }}
              />
              Wrong move
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: CORRECT_ARROW_COLOR }}
              />
              Correct move
            </span>
          </div>
          <p className="text-sm text-theme-text leading-relaxed">
            {mistake.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
