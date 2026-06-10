import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface LandingEffectOverlayProps {
  /** Destination square the piece just landed on, e.g. "e4". */
  square: string;
  boardOrientation: 'white' | 'black';
  /** RGB triple (e.g. "0, 255, 136") for the effect color — the SAME glow that
   *  backlights the pieces, so the burst matches the board's look. */
  glowRgb: string;
  /** Called when the burst animation finishes so the parent can unmount it. */
  onDone: () => void;
}

/** Squares-from-edge → percentage offset (board is an 8×8 grid). */
function squareToPercent(
  square: string,
  orientation: 'white' | 'black',
): { left: string; top: string } {
  const file = square.charCodeAt(0) - 97; // a=0 … h=7
  const rank = parseInt(square[1], 10) - 1; // 1=0 … 8=7
  const col = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 7 - rank : rank;
  return { left: `${col * 12.5}%`, top: `${row * 12.5}%` };
}

/**
 * A thin, branching "string of light" filament from near the piece outward —
 * a delicate jagged line (with an optional fork) that flickers like the energy
 * crackle in the icon. Coordinates are in a 0–100 viewBox centred on the
 * square (50,50 = piece centre).
 */
function filamentPath(angle: number, innerR: number, length: number, fork: boolean): string {
  const rad = (angle * Math.PI) / 180;
  const perp = rad + Math.PI / 2;
  const segments = 4;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const r = innerR + (length / segments) * i;
    const sway = i === 0 || i === segments ? 0 : (i % 2 === 0 ? 1 : -1) * (3 + Math.random() * 2);
    pts.push([
      50 + Math.cos(rad) * r + Math.cos(perp) * sway,
      50 + Math.sin(rad) * r + Math.sin(perp) * sway,
    ]);
  }
  let d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
  if (fork) {
    // A small branch peeling off the second-to-last node.
    const [bx, by] = pts[segments - 1];
    const bAngle = angle + (Math.random() * 50 - 25);
    const bRad = (bAngle * Math.PI) / 180;
    const blen = length * 0.4;
    d += ` M${bx.toFixed(1)},${by.toFixed(1)} L${(bx + Math.cos(bRad) * blen).toFixed(1)},${(by + Math.sin(bRad) * blen).toFixed(1)}`;
  }
  return d;
}

interface Spark {
  x0: number; y0: number; x1: number; y1: number;
  r0: number; delay: number; dur: number;
}

/**
 * A short burst on the square a piece just landed on, styled after the app
 * icon: a soft energy halo, a few thin branching light-strings, and little
 * glowing sparks that drift away from the piece and fade — all tinted with the
 * board's piece-glow color. ~900ms then unmounts via `onDone`. The parent
 * gates this on the Landing Effect setting + reduced motion.
 */
export function LandingEffectOverlay({
  square,
  boardOrientation,
  glowRgb,
  onDone,
}: LandingEffectOverlayProps): JSX.Element {
  const pos = squareToPercent(square, boardOrientation);

  // Recomputed per mount (parent remounts via a changing key each move) so no
  // two landings look identical.
  const filaments = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const angle = (i * 360) / 5 + (Math.random() * 40 - 20);
        return filamentPath(angle, 15 + Math.random() * 4, 22 + Math.random() * 12, Math.random() > 0.5);
      }),
    [],
  );

  const sparks = useMemo<Spark[]>(() => {
    return Array.from({ length: 11 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const startR = 14 + Math.random() * 8;
      const endR = 48 + Math.random() * 55;
      const driftUp = 6 + Math.random() * 12; // float upward as they drift out
      return {
        x0: 50 + Math.cos(angle) * startR,
        y0: 50 + Math.sin(angle) * startR,
        x1: 50 + Math.cos(angle) * endR,
        y1: 50 + Math.sin(angle) * endR - driftUp,
        r0: 1.4 + Math.random() * 1.6,
        delay: Math.random() * 0.12,
        dur: 0.6 + Math.random() * 0.35,
      };
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(onDone, 920);
    return () => clearTimeout(t);
  }, [onDone]);

  const colored = (alpha: number): string => `rgba(${glowRgb}, ${alpha})`;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: pos.left,
        top: pos.top,
        width: '12.5%',
        height: '12.5%',
        zIndex: 8,
      }}
      data-testid="landing-effect-overlay"
    >
      {/* Soft energy halo bloom behind the piece */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: '-15%',
          background: `radial-gradient(circle, ${colored(0.4)} 0%, ${colored(0.12)} 45%, transparent 70%)`,
        }}
        initial={{ scale: 0.5, opacity: 0.9 }}
        animate={{ scale: 1.4, opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{ overflow: 'visible', filter: `drop-shadow(0 0 3px ${colored(0.85)})` }}
      >
        {/* Thin branching light-strings */}
        <motion.g
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: [0, 1, 0.4, 0.9, 0], scale: [0.85, 1.06, 1.12] }}
          transition={{ duration: 0.5, ease: 'easeOut', times: [0, 0.15, 0.45, 0.65, 1] }}
          style={{ transformOrigin: '50px 50px' }}
        >
          {filaments.map((d, i) => (
            <g key={i}>
              <path d={d} fill="none" stroke={colored(0.55)} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              <path d={d} fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth={0.6} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))}
        </motion.g>

        {/* Little sparks drifting away from the piece */}
        {sparks.map((s, i) => (
          <motion.circle
            key={i}
            fill={colored(0.95)}
            initial={{ cx: s.x0, cy: s.y0, r: s.r0, opacity: 0 }}
            animate={{ cx: s.x1, cy: s.y1, r: 0.4, opacity: [0, 1, 1, 0] }}
            transition={{ duration: s.dur, delay: s.delay, ease: 'easeOut', times: [0, 0.15, 0.7, 1] }}
          />
        ))}
      </svg>
    </div>
  );
}
