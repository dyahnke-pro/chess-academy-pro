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
 * Wraps any board element and overlays the VoiceChatMic at the bottom-right.
 * Use this around raw `<Chessboard>` components that don't go through the
 * custom `ChessBoard` wrapper (which has the mic built in).
 */
export function BoardVoiceOverlay({ children, fen, pgn, turn, className, ...rest }: BoardVoiceOverlayProps): JSX.Element {
  const fenStr = positionToFen(fen);
  return (
    <div className={`relative ${className ?? ''}`} {...rest}>
      {children}
      <VoiceChatMic fen={fenStr} pgn={pgn} turn={turn} />
    </div>
  );
}
