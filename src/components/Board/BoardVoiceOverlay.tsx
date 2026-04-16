import type { ReactNode, HTMLAttributes } from 'react';
import { VoiceChatMic } from './VoiceChatMic';

type BoardPosition = string | Record<string, unknown>;

interface BoardVoiceOverlayProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  fen: BoardPosition;
  pgn?: string;
  turn?: 'w' | 'b';
}

/** Convert a piece-map position to a human-readable string for LLM context. */
function positionToFen(pos: BoardPosition): string {
  if (typeof pos === 'string') return pos;
  const entries = Object.entries(pos);
  if (entries.length === 0) return '8/8/8/8/8/8/8/8 w - - 0 1';
  return entries
    .map(([sq, val]) => {
      const piece = typeof val === 'object' && val !== null && 'pieceType' in val
        ? (val as { pieceType: string }).pieceType
        : String(val);
      return `${piece}@${sq}`;
    })
    .join(', ');
}

/**
 * Wraps any board element and floats the VoiceChatMic in the top-right
 * corner of the overlay. Prior versions stacked the mic below the board,
 * which pushed the mic into nearby text whenever the wrapper had a
 * fixed height (e.g. `w-48 h-48`). Absolute positioning keeps the mic
 * out of the document flow entirely so no downstream content is pushed.
 * Use this around raw `<Chessboard>` components that don't go through
 * the custom `ChessBoard` wrapper (which has the mic built in).
 */
export function BoardVoiceOverlay({ children, fen, pgn, turn, className, ...rest }: BoardVoiceOverlayProps): JSX.Element {
  const fenStr = positionToFen(fen);
  return (
    <div className={`relative ${className ?? ''}`} {...rest}>
      {children}
      <div className="absolute top-1 right-1 z-10">
        <VoiceChatMic fen={fenStr} pgn={pgn} turn={turn} />
      </div>
    </div>
  );
}
