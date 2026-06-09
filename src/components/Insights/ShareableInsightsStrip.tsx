import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { ShareableInsightCard } from './ShareableInsightCard';
import {
  computeShareableInsights,
  type ShareableInsight,
} from '../../services/shareableInsightsService';

/** Horizontal swipe threshold — fingers drift a few pixels while
 *  tapping or scrolling, so we need a meaningful minimum to register
 *  as a deliberate swipe. 40px is comfortable for mobile thumbs
 *  without competing with the vertical scroll handler. */
const SWIPE_THRESHOLD_PX = 40;

/** Direction-aware slide variants for the card carousel. `direction`
 *  is +1 (went to the next card) or -1 (went to the previous): the
 *  incoming card enters from the side we're heading toward and the
 *  outgoing card exits the opposite side — the native iOS page-slide
 *  feel. Percent offsets keep it responsive to the card width. */
const SLIDE_VARIANTS = {
  enter: (direction: number) => ({ x: direction >= 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? '-100%' : '100%', opacity: 0 }),
};

/**
 * ShareableInsightsStrip — the carousel of "did you know" cards at
 * the top of the Game Insights page. Each card is individually
 * share-worthy; the strip lets the user flick through a few so they
 * can pick their favorite.
 *
 * Auto-hides when the user has <5 analyzed games (no honest insights
 * yet — we don't want to surface noise).
 */
export function ShareableInsightsStrip(): JSX.Element | null {
  const [insights, setInsights] = useState<ShareableInsight[] | null>(null);
  const [index, setIndex] = useState(0);

  // Swipe-to-navigate refs — captures touch + pointer drags on the
  // card container. Records the start X on touchstart/pointerdown,
  // then on release computes the horizontal delta and advances/
  // retreats if it crosses SWIPE_THRESHOLD_PX. Vertical-dominant
  // gestures fall through to the native scroll handler so the user
  // can still scroll the page through this section.
  // Hoisted ABOVE the early returns so the hook count is stable
  // across renders — fixes React error #310 reported by David on
  // mobile (the loading-state render only called 3 hooks; the
  // loaded-state render called 5).
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  // Slide direction for the iPhone-style card transition: +1 = the
  // next card slides in from the right, -1 = the previous card slides
  // in from the left. Drives the AnimatePresence enter/exit offsets so
  // the whole card image glides across rather than hard-cutting.
  const [direction, setDirection] = useState(0);

  // Centralised index movers so the slide direction is always set in
  // lockstep with the index — tapping arrows AND swiping route through
  // these, keeping the animation honest about which way we moved.
  function goNext(): void {
    setDirection(1);
    setIndex((i) => Math.min((insights?.length ?? 1) - 1, i + 1));
  }
  function goPrev(): void {
    setDirection(-1);
    setIndex((i) => Math.max(0, i - 1));
  }

  useEffect(() => {
    let cancelled = false;
    void computeShareableInsights()
      .then((result) => {
        if (!cancelled) setInsights(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.warn('[ShareableInsightsStrip] compute failed:', err);
          setInsights([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading — return null for now (skeletons would add noise).
  if (insights === null) return null;
  // No insights worth showing — strip stays hidden. Don't upsell,
  // don't show empty state. The user will see insights once they
  // import / analyze enough games.
  if (insights.length === 0) return null;

  const current = insights[index];
  const insightCount = insights.length;
  const hasPrev = index > 0;
  const hasNext = index < insightCount - 1;
  function onSwipeStart(x: number, y: number): void {
    swipeStartXRef.current = x;
    swipeStartYRef.current = y;
  }
  function onSwipeEnd(x: number, y: number): void {
    const startX = swipeStartXRef.current;
    const startY = swipeStartYRef.current;
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
    if (startX === null || startY === null) return;
    const dx = x - startX;
    const dy = y - startY;
    // Vertical-dominant — don't consume; user is probably scrolling.
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (dx < 0 && hasNext) goNext();
    else if (dx > 0 && hasPrev) goPrev();
  }

  return (
    <section
      className="mb-5"
      aria-label="Shareable chess insights"
      data-testid="shareable-insights-strip"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          <Sparkles size={12} style={{ color: 'var(--color-accent)' }} />
          Your Chess, In A Nutshell
        </div>
        {insights.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              disabled={!hasPrev}
              aria-label="Previous insight"
              className="p-1 rounded hover:opacity-80 disabled:opacity-30"
              style={{ color: 'var(--color-text-muted)' }}
              data-testid="shareable-insight-prev"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
              {index + 1} / {insights.length}
            </span>
            <button
              onClick={goNext}
              disabled={!hasNext}
              aria-label="Next insight"
              className="p-1 rounded hover:opacity-80 disabled:opacity-30"
              style={{ color: 'var(--color-text-muted)' }}
              data-testid="shareable-insight-next"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      <div
        onTouchStart={(e) => onSwipeStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={(e) => onSwipeEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
        onPointerDown={(e) => {
          // Only register left-button drags on desktop (skip
          // right-clicks + middle-clicks). Mobile touch handlers
          // above own the touch path; this is the desktop / stylus
          // fallback for users without touchscreens.
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          onSwipeStart(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => onSwipeEnd(e.clientX, e.clientY)}
        // `touch-action: pan-y` lets the user keep scrolling
        // vertically (touch-action lives in CSS, but Tailwind v4
        // covers it via arbitrary property).
        style={{ touchAction: 'pan-y', cursor: insights.length > 1 ? 'grab' : 'default' }}
        data-testid="shareable-insight-swipe-region"
      >
        {/* iPhone-style slide: the outgoing card glides off one edge
            while the incoming card glides in from the other. `custom`
            feeds the direction into the variants so next/prev move the
            opposite ways. `overflow-hidden` clips the off-screen card;
            `mode="popLayout"` keeps the section height stable mid-slide. */}
        <div className="relative overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={index}
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 320, damping: 34 },
                opacity: { duration: 0.18 },
              }}
            >
              <ShareableInsightCard insight={current} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
