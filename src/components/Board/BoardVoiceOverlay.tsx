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
 * Wraps any board element and floats the VoiceChatMic just ABOVE the
 * board's top-right corner (in the gap above the board), NOT on top of
 * the board — the prior `top-1 right-1` placement sat the Ask button on
 * the h8/g8 squares and covered pieces (David 2026-05-21). `bottom-full`
 * anchors the mic to the top edge of the board wrapper so it lives in
 * the header gap and never overlaps the play area. Absolute positioning
 * keeps it out of the document flow so no downstream content is pushed.
 * Use this around raw `<Chessboard>` components that don't go through
 * the custom `ChessBoard` wrapper (which has the mic built in).
 */
export function BoardVoiceOverlay({ children, fen, pgn, turn, className, ...rest }: BoardVoiceOverlayProps): JSX.Element {
  const fenStr = positionToFen(fen);
  return (
    <div className={`relative ${className ?? ''}`} {...rest}>
      {children}
      <div className="absolute bottom-full right-0 mb-2 z-10">
        <VoiceChatMic fen={fenStr} pgn={pgn} turn={turn} />
      </div>
    </div>
  );
}
