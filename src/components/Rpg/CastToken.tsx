import { castImage } from './rpgCast';

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
}

/**
 * Renders a modern full-body character token (a background-stripped render) with
 * a soft ground shadow, bottom-anchored so the figure "stands" on its square.
 * The figure may overflow the footprint width (e.g. the mounted knight) — it's
 * centred and allowed to extend. Motion is applied by the parent via transforms.
 */
export function CastToken({ type, color, w, h, glow, flip }: CastTokenProps): JSX.Element {
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
        src={castImage(type, color)}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          bottom: h * 0.03,
          left: '50%',
          transform: `translateX(-50%) ${flip ? 'scaleX(-1)' : ''}`,
          height: h * 0.97,
          width: 'auto',
          maxWidth: w * 1.7,
          filter: glow,
          userSelect: 'none',
        }}
      />
    </div>
  );
}
