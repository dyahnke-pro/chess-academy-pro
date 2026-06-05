import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface LandingEffectOverlayProps {
  /** Destination square the piece just landed on, e.g. "e4". */
  square: string;
  boardOrientation: 'white' | 'black';
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
 * Builds a jagged "lightning bolt" SVG path from the centre (50,50) of a
 * 100×100 viewBox outward along `angle`, zig-zagging perpendicular to it.
 */
function boltPath(angle: number, length: number): string {
  const segments = 4;
  const rad = (angle * Math.PI) / 180;
  const perp = rad + Math.PI / 2;
  const pts: Array<[number, number]> = [[50, 50]];
  for (let i = 1; i <= segments; i++) {
    const r = (length / segments) * i;
    // Zig-zag amount tapers to 0 at the tip so bolts end on a clean point.
    const sway = i === segments ? 0 : (i % 2 === 0 ? 1 : -1) * (7 - i);
    const x = 50 + Math.cos(rad) * r + Math.cos(perp) * sway;
    const y = 50 + Math.sin(rad) * r + Math.sin(perp) * sway;
    pts.push([x, y]);
  }
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
}

/**
 * A short green electric burst that fires on the square a piece just landed
 * on — radiating lightning bolts, a hot flash core, and an expanding shock
 * ring. Tuned to the app icon's emerald-energy look. ~600ms then unmounts via
 * `onDone`. The parent gates this on the Landing Effect setting + reduced
 * motion, so this component always animates when mounted.
 */
export function LandingEffectOverlay({
  square,
  boardOrientation,
  onDone,
}: LandingEffectOverlayProps): JSX.Element {
  const pos = squareToPercent(square, boardOrientation);

  // Six bolts radiating at jittered angles — recomputed per mount (the parent
  // remounts via a changing key each move) so no two landings look identical.
  const bolts = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = i * 60 + (Math.random() * 30 - 15);
      const length = 34 + Math.random() * 14;
      return boltPath(angle, length);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(onDone, 620);
    return () => clearTimeout(t);
  }, [onDone]);

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
      {/* Expanding shock ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: '-10%',
          border: '2px solid rgba(74, 222, 128, 0.85)',
          boxShadow: '0 0 14px 2px rgba(74, 222, 128, 0.5)',
        }}
        initial={{ scale: 0.3, opacity: 0.9 }}
        animate={{ scale: 1.9, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Hot flash core */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: '28%',
          background:
            'radial-gradient(circle, rgba(220,255,235,0.95) 0%, rgba(74,222,128,0.7) 45%, rgba(74,222,128,0) 75%)',
        }}
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
      />

      {/* Lightning bolts */}
      <motion.svg
        viewBox="0 0 100 100"
        className="absolute"
        style={{
          inset: '-40%',
          width: '180%',
          height: '180%',
          overflow: 'visible',
          filter: 'drop-shadow(0 0 4px rgba(74, 222, 128, 0.9))',
        }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 1, 0.55, 1, 0], scale: [0.6, 1.12, 1.15] }}
        transition={{ duration: 0.5, ease: 'easeOut', times: [0, 0.15, 0.4, 0.6, 1] }}
      >
        {bolts.map((d, i) => (
          <g key={i}>
            {/* Soft green halo stroke */}
            <path
              d={d}
              fill="none"
              stroke="rgba(74, 222, 128, 0.55)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Bright white-green core stroke */}
            <path
              d={d}
              fill="none"
              stroke="rgba(223, 255, 235, 0.95)"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </motion.svg>
    </div>
  );
}
