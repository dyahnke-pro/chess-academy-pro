/**
 * NarrationArrowOverlay
 * ---------------------
 * Animated SVG overlay that draws arrows + square highlights ON TOP
 * of the walkthrough board. Drives the "real-time arrow as the coach
 * says the move" UX — each arrow draws from `from` to `to` over
 * ~550ms via Framer Motion's pathLength, then arrowhead fades in.
 *
 * Positioning: absolute, inset-0 — caller wraps the board in a
 * `relative` container and renders this overlay as a sibling. The
 * SVG viewBox is 8×8 (one unit per square) so the overlay scales
 * to whatever pixel size the board renders at.
 *
 * Inputs come from `useTeachWalkthrough`'s `narrationArrows` and
 * `narrationHighlights` state — those switch sets at each segment
 * boundary, and AnimatePresence fades the previous set out as the
 * new set animates in.
 */
import { motion, AnimatePresence } from 'framer-motion';
import type {
  NarrationArrow,
  NarrationHighlight,
} from '../../types/walkthroughTree';

interface Props {
  arrows: NarrationArrow[];
  highlights: NarrationHighlight[];
  /** Board orientation — flips the coordinate map for black-side
   *  walkthroughs so squares align with the rendered board. */
  orientation: 'white' | 'black';
}

/** Color palette — keyed by NarrationArrow['color'] / NarrationHighlight['color'].
 *  Tuned for visibility against both light and dark squares. */
const COLOR_MAP: Record<string, string> = {
  green: 'rgba(34, 197, 94, 0.85)',
  red: 'rgba(239, 68, 68, 0.85)',
  blue: 'rgba(59, 130, 246, 0.85)',
  yellow: 'rgba(234, 179, 8, 0.85)',
};

const HIGHLIGHT_FILL_OPACITY = 0.4;

/** Translate algebraic square notation to the SVG coordinate (center
 *  of the square in viewBox units). With viewBox="0 0 8 8" each square
 *  is a 1×1 unit; the center of "a1" from white's POV is (0.5, 7.5). */
function squareToCoord(
  square: string,
  orientation: 'white' | 'black',
): [number, number] {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0); // 0-7
  const rank = parseInt(square[1], 10) - 1; // 0-7
  if (orientation === 'white') {
    return [file + 0.5, 7 - rank + 0.5];
  }
  return [7 - file + 0.5, rank + 0.5];
}

/** Translate to the top-left corner of the square (for highlight
 *  rectangles). */
function squareToTopLeft(
  square: string,
  orientation: 'white' | 'black',
): [number, number] {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10) - 1;
  if (orientation === 'white') {
    return [file, 7 - rank];
  }
  return [7 - file, rank];
}

export function NarrationArrowOverlay({
  arrows,
  highlights,
  orientation,
}: Props): JSX.Element {
  return (
    <svg
      viewBox="0 0 8 8"
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      preserveAspectRatio="xMidYMid meet"
      data-testid="narration-arrow-overlay"
    >
      <defs>
        {(['green', 'red', 'blue', 'yellow'] as const).map((c) => (
          <marker
            key={c}
            id={`narration-arrowhead-${c}`}
            // markerUnits="strokeWidth" makes the marker scale with
            // the line stroke so the head stays proportional whatever
            // strokeWidth we use.
            markerUnits="strokeWidth"
            markerWidth={2.5}
            markerHeight={2.5}
            refX={2}
            refY={1.25}
            orient="auto"
          >
            <polygon points="0 0, 2.5 1.25, 0 2.5" fill={COLOR_MAP[c]} />
          </marker>
        ))}
      </defs>
      <AnimatePresence>
        {highlights.map((h, i) => {
          const [x, y] = squareToTopLeft(h.square, orientation);
          const color = COLOR_MAP[h.color ?? 'yellow'] ?? COLOR_MAP.yellow;
          return (
            <motion.rect
              key={`hl-${h.square}-${h.color ?? 'yellow'}-${i}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={color}
              initial={{ opacity: 0 }}
              animate={{ opacity: HIGHLIGHT_FILL_OPACITY }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          );
        })}
        {arrows.map((a, i) => {
          const [fx, fy] = squareToCoord(a.from, orientation);
          const [tx, ty] = squareToCoord(a.to, orientation);
          const color = a.color ?? 'green';
          return (
            <motion.line
              key={`arr-${a.from}-${a.to}-${color}-${i}`}
              x1={fx}
              y1={fy}
              x2={tx}
              y2={ty}
              stroke={COLOR_MAP[color] ?? COLOR_MAP.green}
              strokeWidth={0.16}
              strokeLinecap="round"
              markerEnd={`url(#narration-arrowhead-${color})`}
              // pathLength animation makes the line "draw" from
              // start to end. Arrowhead is part of the marker so
              // it appears once the tip arrives. Opacity fades the
              // whole shape in over a shorter window so the tip
              // doesn't pop instantly.
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                pathLength: { duration: 0.55, ease: 'easeOut' },
                opacity: { duration: 0.25, ease: 'easeOut' },
              }}
            />
          );
        })}
      </AnimatePresence>
    </svg>
  );
}
