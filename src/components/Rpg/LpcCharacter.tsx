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

/** One stacked sprite layer (body, then clothes, headgear, weapon …). */
export interface CharacterLayer {
  sheet: string;
  /** Optional CSS filter for this layer (e.g. a team hue tint). */
  tint?: string;
}

interface LpcCharacterProps {
  /** Layers drawn bottom-to-top — all share the LPC 832×1344 geometry. */
  layers: CharacterLayer[];
  action: LpcAction;
  direction?: LpcDirection;
  fps?: number;
  loop?: boolean;
  playing?: boolean;
  size?: number;
  /** Filter applied to the whole composited character (e.g. a team glow). */
  glow?: string;
  onComplete?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Composites several LPC layer sheets into one animated character, driven by a
 * SINGLE shared frame clock so the layers never desync. Pure CSS
 * background-position; idle characters (playing=false) hold frame 0 and run no
 * timer, so a full board of them is cheap.
 */
export function LpcCharacter({
  layers,
  action,
  direction = 'down',
  fps = 11,
  loop = false,
  playing = true,
  size = 60,
  glow,
  onComplete,
  className,
  style,
}: LpcCharacterProps): JSX.Element {
  const [frame, setFrame] = useState(0);
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
  }, [action, direction, playing, loop, fps]);

  const row = lpcRow(action, direction);
  const bgPos = `-${frame * size}px -${row * size}px`;
  const bgSize = `${SHEET_COLS * size}px ${SHEET_ROWS * size}px`;

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size, filter: glow, ...style }}
      data-testid="lpc-character"
      data-action={action}
    >
      {layers.map((layer, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${layer.sheet}")`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: bgSize,
            backgroundPosition: bgPos,
            // Smooth scaling (not 'pixelated') so the characters read as
            // illustrated figures, not blocky Lego pixels.
            imageRendering: 'auto',
            filter: layer.tint,
          }}
        />
      ))}
    </div>
  );
}
