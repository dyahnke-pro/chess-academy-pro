import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  SHEET_COLS,
  SHEET_ROWS,
  lpcRow,
  lpcFrameCount,
  type LpcAction,
  type LpcDirection,
} from './lpcLayout';

interface LpcSpriteProps {
  /** URL of an LPC character sheet (832×1344). */
  sheet: string;
  action: LpcAction;
  direction?: LpcDirection;
  /** Frames per second for the animation. Defaults to 11 (LPC standard cadence). */
  fps?: number;
  /** Loop the action (walk) vs play once and hold the last frame (thrust/hurt). */
  loop?: boolean;
  /** When false, the sprite holds frame 0 (a standing idle). */
  playing?: boolean;
  /** Rendered square size in px. */
  size?: number;
  /** Fires once when a non-looping action reaches its final frame. */
  onComplete?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders a single 64px frame window into a Universal LPC character sheet and
 * animates it (walk / thrust / slash / hurt …) by stepping the frame column.
 * Pure CSS background-position — no canvas, no animation library.
 */
export function LpcSprite({
  sheet,
  action,
  direction = 'down',
  fps = 11,
  loop = false,
  playing = true,
  size = 72,
  onComplete,
  className,
  style,
}: LpcSpriteProps): JSX.Element {
  const [frame, setFrame] = useState(0);
  // Keep onComplete out of the effect deps so it doesn't restart the animation.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setFrame(0);
    if (!playing) return;
    const frames = lpcFrameCount(action);
    if (frames <= 1) return;
    let f = 0;
    const id = window.setInterval(() => {
      f += 1;
      if (f >= frames) {
        if (loop) {
          f = 0;
          setFrame(0);
        } else {
          window.clearInterval(id);
          setFrame(frames - 1);
          onCompleteRef.current?.();
        }
        return;
      }
      setFrame(f);
    }, 1000 / fps);
    return () => window.clearInterval(id);
  }, [sheet, action, direction, playing, loop, fps]);

  const row = lpcRow(action, direction);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        backgroundImage: `url("${sheet}")`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${SHEET_COLS * size}px ${SHEET_ROWS * size}px`,
        backgroundPosition: `-${frame * size}px -${row * size}px`,
        imageRendering: 'pixelated',
        // Tiny shadow puddle so the character reads as standing on the square.
        filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.35))',
        ...style,
      }}
      data-testid="lpc-sprite"
      data-action={action}
      data-direction={direction}
    />
  );
}
