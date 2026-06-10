import { useEffect, useState } from 'react';
import { castImage } from './rpgCast';
import { spriteFrames, type SpriteAction, type Facing } from './rpgCastFrames';

interface CastTokenProps {
  type: string;
  color: 'w' | 'b';
  /** Footprint width (≈ a board square) and token height (taller, full-body). */
  w: number;
  h: number;
  /** Team glow / drop-shadow filter. */
  glow: string;
  /** Mirror horizontally to face the travel direction. */
  flip?: boolean;
  /** Animation action (pieces with a frame set play frames; others stay static). */
  action?: SpriteAction;
  /** Which way the figure faces (front/back) — picks the matching frame row. */
  facing?: Facing;
  /** Frames-per-second for an attack sequence. */
  fps?: number;
}

/**
 * Renders a full-body character token with a soft ground shadow, bottom-anchored
 * so the figure stands on its square. Pieces that have a generated frame set
 * (see rpgCastFrames) animate through their frames (e.g. the king's staff
 * swing); the rest show their single static render and rely on the board's
 * procedural motion.
 */
export function CastToken({ type, color, w, h, glow, flip, action = 'idle', facing = 'front', fps = 14 }: CastTokenProps): JSX.Element {
  const frames = spriteFrames(type, color, facing, action);
  const [fi, setFi] = useState(0);

  useEffect(() => {
    const list = spriteFrames(type, color, facing, action);
    if (!list || list.length < 2) {
      setFi(0);
      return;
    }
    let i = 0;
    setFi(0);
    const id = window.setInterval(() => {
      i += 1;
      if (i >= list.length) {
        window.clearInterval(id);
        setFi(list.length - 1); // hold the follow-through
        return;
      }
      setFi(i);
    }, 1000 / fps);
    return () => window.clearInterval(id);
  }, [type, color, facing, action, fps]);

  const src = frames ? frames[Math.min(fi, frames.length - 1)] : castImage(type, color);

  return (
    <div style={{ position: 'relative', width: w, height: h, pointerEvents: 'none' }}>
      {/* Ground shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: 1,
          left: '50%',
          transform: 'translateX(-50%)',
          width: w * 0.66,
          height: w * 0.16,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.5)',
          filter: 'blur(2px)',
        }}
      />
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          bottom: h * 0.03,
          left: '50%',
          transform: `translateX(-50%) ${flip ? 'scaleX(-1)' : ''}`,
          height: h * 0.97,
          width: 'auto',
          maxWidth: w * 2.4,
          filter: glow,
          userSelect: 'none',
        }}
      />
    </div>
  );
}
