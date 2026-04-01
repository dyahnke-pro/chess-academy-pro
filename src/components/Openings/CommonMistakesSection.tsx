import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { BoardVoiceOverlay } from '../Board/BoardVoiceOverlay';
import { Ban, ChevronDown, ChevronUp } from 'lucide-react';
import type { CommonMistake } from '../../types';

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
            <div key={i} className="rounded-lg border border-red-500/20 overflow-hidden" data-testid={`mistake-${i}`}>
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-500/5 transition-colors"
                data-testid={`mistake-toggle-${i}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-red-400 line-through">{mistake.wrongMove}</span>
                    <span className="text-theme-text-muted text-xs">→</span>
                    <span className="text-sm font-mono text-green-400">{mistake.correctMove}</span>
                  </div>
                  <p className="text-xs text-theme-text-muted mt-0.5 truncate">{mistake.explanation}</p>
                </div>
                {isExpanded
                  ? <ChevronUp size={14} className="text-theme-text-muted shrink-0" />
                  : <ChevronDown size={14} className="text-theme-text-muted shrink-0" />
                }
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="flex justify-center">
                    <BoardVoiceOverlay fen={mistake.fen} className="w-48 h-48">
                      <Chessboard
                        options={{
                          position: mistake.fen,
                          boardOrientation: boardOrientation,
                          allowDragging: false,
                        }}
                      />
                    </BoardVoiceOverlay>
                  </div>
                  <p className="text-sm text-theme-text leading-relaxed">{mistake.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
