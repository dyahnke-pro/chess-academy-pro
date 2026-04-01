import type { ReactNode, HTMLAttributes } from 'react';
import { VoiceChatMic } from './VoiceChatMic';

interface BoardVoiceOverlayProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  fen: string;
  pgn?: string;
  turn?: 'w' | 'b';
}

/**
 * Wraps any board element and overlays the VoiceChatMic at the bottom-right.
 * Use this around raw `<Chessboard>` components that don't go through the
 * custom `ChessBoard` wrapper (which has the mic built in).
 */
export function BoardVoiceOverlay({ children, fen, pgn, turn, className, ...rest }: BoardVoiceOverlayProps): JSX.Element {
  return (
    <div className={`relative ${className ?? ''}`} {...rest}>
      {children}
      <VoiceChatMic fen={fen} pgn={pgn} turn={turn} />
    </div>
  );
}
