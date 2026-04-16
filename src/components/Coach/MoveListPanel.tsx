import { useEffect, useMemo, useRef, forwardRef } from 'react';
import { BookOpen } from 'lucide-react';
import { Chess } from 'chess.js';
import type { CoachGameMove, MoveClassification } from '../../types';
import { CLASSIFICATION_STYLES, getClassificationHighlightColor } from './classificationStyles';

const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const SUBOPTIMAL_CLASSIFICATIONS: MoveClassification[] = [
  'inaccuracy', 'mistake', 'blunder', 'miss',
];

/** Convert a UCI move (e.g. "e2e4", "g1f3", "a7a8q") into SAN at the
 *  given position. Returns null when the UCI is malformed or the
 *  position can't play that move (e.g. already-moved piece). Used to
 *  show a "best move" next to the student's played move. */
function uciToSan(uci: string | null, fenBefore: string): string | null {
  if (!uci || uci.length < 4) return null;
  try {
    const chess = new Chess(fenBefore);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    return move.san;
  } catch {
    return null;
  }
}

interface MoveListPanelProps {
  moves: CoachGameMove[];
  openingName: string | null;
  currentMoveIndex: number | null;
  onMoveClick?: (moveIndex: number) => void;
  className?: string;
}

const CLASSIFICATION_COLORS: Record<MoveClassification, string> = {
  brilliant: 'var(--color-success)',
  great: 'var(--color-success)',
  good: 'var(--color-text)',
  book: 'var(--color-accent)',
  miss: '#a855f7',
  inaccuracy: 'var(--color-warning)',
  mistake: 'var(--color-error)',
  blunder: 'var(--color-error)',
};

function formatEval(evalCp: number | null): string | null {
  if (evalCp === null) return null;
  const pawns = evalCp / 100;
  if (pawns >= 0) return `+${pawns.toFixed(1)}`;
  return pawns.toFixed(1);
}

export function MoveListPanel({
  moves,
  openingName,
  currentMoveIndex,
  onMoveClick,
  className = '',
}: MoveListPanelProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active move
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentMoveIndex]);

  // Precompute per-move "best alternative" SAN for suboptimal moves so
  // we can render "e4 (d5)" style in the list. The move.fen stored on
  // each record is the position AFTER the move, so we use the PREVIOUS
  // move's fen (or the starting position) to replay the best UCI.
  const bestAlternativeSan = useMemo((): (string | null)[] => {
    return moves.map((m, i) => {
      if (!m.classification || !SUBOPTIMAL_CLASSIFICATIONS.includes(m.classification)) {
        return null;
      }
      const fenBefore = i === 0 ? STARTING_FEN : moves[i - 1].fen;
      return uciToSan(m.bestMove, fenBefore);
    });
  }, [moves]);

  // Count the "book" opening moves so we can display
  // "In theory through move N" at the top of the list. This is
  // chess.com's "Out of book: move 12" treatment.
  const bookMoveCount = useMemo(() => {
    let i = 0;
    while (i < moves.length && moves[i].classification === 'book') i++;
    return i;
  }, [moves]);

  // Group moves into pairs (white + black)
  const pairs: Array<{ number: number; white: { move: CoachGameMove; index: number } | null; black: { move: CoachGameMove; index: number } | null }> = [];

  for (let i = 0; i < moves.length; i++) {
    const pairIndex = Math.floor(i / 2);
    if (!pairs[pairIndex]) {
      pairs[pairIndex] = { number: pairIndex + 1, white: null, black: null };
    }
    if (i % 2 === 0) {
      pairs[pairIndex].white = { move: moves[i], index: i };
    } else {
      pairs[pairIndex].black = { move: moves[i], index: i };
    }
  }

  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ background: 'var(--color-surface)' }}
      data-testid="move-list-panel"
    >
      {/* Opening name header */}
      {openingName && (
        <div
          className="px-3 py-1.5 text-xs font-medium border-b truncate flex items-center gap-1.5"
          style={{ color: 'var(--color-accent)', borderColor: 'var(--color-border)' }}
          data-testid="opening-name"
        >
          <BookOpen size={12} />
          {openingName}
        </div>
      )}

      {/* "Out of book" indicator — how many moves were still in theory */}
      {bookMoveCount > 0 && (
        <div
          className="px-3 py-1 text-[10px] border-b flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
          data-testid="out-of-book-indicator"
        >
          <BookOpen size={10} />
          <span>
            In theory through move {Math.ceil(bookMoveCount / 2)}
            {bookMoveCount < moves.length ? ' — out of book after' : ''}
          </span>
        </div>
      )}

      {/* Move list */}
      <div ref={scrollRef} className="overflow-y-auto flex-1 min-h-0">
        {pairs.length === 0 && (
          <div className="px-3 py-4 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
            Starting Position
          </div>
        )}
        {pairs.map((pair) => (
          <div key={pair.number} className="flex items-center text-xs">
            {/* Move number */}
            <span
              className="w-8 text-right pr-1.5 flex-shrink-0 select-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {pair.number}.
            </span>

            {/* White move */}
            {pair.white ? (
              <MoveCell
                move={pair.white.move}
                index={pair.white.index}
                isActive={currentMoveIndex === pair.white.index}
                bestAlternativeSan={bestAlternativeSan[pair.white.index]}
                onClick={onMoveClick}
                ref={currentMoveIndex === pair.white.index ? activeRef : null}
              />
            ) : (
              <span className="flex-1 px-1.5 py-0.5">&nbsp;</span>
            )}

            {/* Black move */}
            {pair.black ? (
              <MoveCell
                move={pair.black.move}
                index={pair.black.index}
                isActive={currentMoveIndex === pair.black.index}
                bestAlternativeSan={bestAlternativeSan[pair.black.index]}
                onClick={onMoveClick}
                ref={currentMoveIndex === pair.black.index ? activeRef : null}
              />
            ) : (
              <span className="flex-1 px-1.5 py-0.5">&nbsp;</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface MoveCellProps {
  move: CoachGameMove;
  index: number;
  isActive: boolean;
  /** Best move SAN at the pre-move position, when the student's choice
   *  was suboptimal (inaccuracy / mistake / blunder / miss). Rendered
   *  in small muted text next to the played move so the student sees
   *  the engine's preferred alternative at a glance. */
  bestAlternativeSan?: string | null;
  onClick?: (index: number) => void;
}

const MoveCell = forwardRef<HTMLButtonElement, MoveCellProps>(
  function MoveCell({ move, index, isActive, bestAlternativeSan, onClick }, ref) {
    const color = move.classification
      ? CLASSIFICATION_COLORS[move.classification]
      : 'var(--color-text)';

    const symbol = move.classification
      ? CLASSIFICATION_STYLES[move.classification].symbol
      : '';

    // Show symbol for non-neutral classifications
    const showSymbol = symbol && move.classification !== 'good' && move.classification !== 'book';

    // Active move: left border accent instead of full background
    const highlightColor = isActive && move.classification
      ? getClassificationHighlightColor(move.classification)
      : null;

    const evalText = formatEval(move.evaluation);

    return (
      <button
        ref={ref}
        onClick={onClick ? () => onClick(index) : undefined}
        className={`flex-1 px-1.5 py-0.5 text-left font-mono flex items-center gap-1 transition-colors ${
          onClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
        }`}
        style={{
          color,
          background: isActive
            ? (highlightColor ?? 'color-mix(in srgb, var(--color-accent) 15%, transparent)')
            : 'transparent',
          borderLeft: isActive ? `3px solid ${highlightColor ?? 'var(--color-accent)'}` : '3px solid transparent',
          borderRadius: isActive ? '0 2px 2px 0' : undefined,
        }}
        title={move.classification ? CLASSIFICATION_STYLES[move.classification].label : undefined}
        data-testid={`move-cell-${index}`}
      >
        {/* Classification icon dot — larger */}
        {showSymbol && move.classification && (
          <span
            className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[8px] font-bold text-white flex-shrink-0 leading-none"
            style={{ background: CLASSIFICATION_STYLES[move.classification].color }}
            data-testid={`move-icon-${index}`}
          >
            {symbol}
          </span>
        )}
        <span className="truncate">{move.san}</span>
        {/* Best alternative — only rendered when the played move was
            suboptimal AND the UCI→SAN conversion succeeded. */}
        {bestAlternativeSan && bestAlternativeSan !== move.san && (
          <span
            className="text-[9px] text-[rgb(52,211,153)] flex-shrink-0"
            title={`Best: ${bestAlternativeSan}`}
          >
            ({bestAlternativeSan})
          </span>
        )}
        {/* Eval text */}
        {evalText && isActive && (
          <span
            className="text-[9px] ml-auto flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {evalText}
          </span>
        )}
      </button>
    );
  },
);
