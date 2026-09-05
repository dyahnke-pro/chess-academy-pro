import { useEffect, useRef, useState, type RefObject } from 'react';

/** Pull-down distance (px) at which releasing triggers a refresh. */
export const PULL_TO_REFRESH_THRESHOLD_PX = 80;
/** Visual travel cap so the indicator never runs away on a long drag. */
const PULL_MAX_PX = 120;

/** Surfaces where a downward drag is a MOVE, not a pull. A touch that starts
 *  inside any of these never arms the refresh. */
const PULL_EXCLUDED_SELECTOR = [
  '[data-testid="chess-board-container"]',
  '[data-testid="consistent-chessboard-static"]',
  '[data-square]',
  '[data-piece]',
  'input',
  'textarea',
  '[contenteditable="true"]',
].join(',');

export interface PullToRefreshState {
  /** Current pull travel in px (0 when idle). Drive the indicator with it. */
  pullDistance: number;
  /** True once the pull has crossed the release threshold. */
  ready: boolean;
  /** True from release-past-threshold until the page reloads. */
  refreshing: boolean;
}

/** Find the element that actually scrolls under a touch: the nearest ancestor
 *  with a vertical overflow of auto/scroll. In this app every page is its own
 *  scroller (AppLayout's <main> is overflow-hidden), so this is the page root. */
function nearestScroller(start: Element | null, stopAt: Element): Element | null {
  let el: Element | null = start;
  while (el && el !== stopAt) {
    const oy = getComputedStyle(el).overflowY;
    if (oy === 'auto' || oy === 'scroll') return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Native-style pull-to-refresh for the whole app (David 2026-09-05: "I also
 * want pull up to refresh the app").
 *
 * Neither the home-screen PWA nor the Capacitor WKWebView gives us Safari's
 * built-in pull-to-refresh, so this reimplements the gesture on the layout:
 *
 *   - arms ONLY when the touch starts with the page's scroller at scrollTop 0
 *     (otherwise a normal upward-content scroll is happening);
 *   - never arms on a board, a square, a piece or a text field — a drag there
 *     is a move or a selection, not a pull;
 *   - tracks the downward travel while the scroller stays at the top and
 *     reports it so the layout can draw an indicator;
 *   - on release past PULL_TO_REFRESH_THRESHOLD_PX it hard-reloads the page.
 *     A full reload is deliberate: besides refreshing data it applies any
 *     downloaded service-worker / OTA bundle that a "reload DEFERRED: active
 *     session hold" was waiting on.
 *
 * Attach to the element that wraps every page (AppLayout's <main>). Listeners
 * are passive, so the gesture never blocks native scrolling.
 */
export function usePullToRefresh(
  containerRef: RefObject<HTMLElement | null>,
  onRefresh: () => void = () => window.location.reload(),
): PullToRefreshState {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const scrollerRef = useRef<Element | null>(null);
  const distanceRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reset = (): void => {
      startYRef.current = null;
      scrollerRef.current = null;
      distanceRef.current = 0;
      setPullDistance(0);
    };

    const onTouchStart = (e: TouchEvent): void => {
      if (refreshing || e.touches.length !== 1) return;
      const target = e.target as Element | null;
      if (!target || target.closest(PULL_EXCLUDED_SELECTOR)) return;
      const scroller = nearestScroller(target, el) ?? el;
      if (scroller.scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
      scrollerRef.current = scroller;
    };

    const onTouchMove = (e: TouchEvent): void => {
      if (startYRef.current === null) return;
      const scroller = scrollerRef.current;
      // The content took the scroll (user pulled up after all) — stand down.
      if (scroller && scroller.scrollTop > 0) { reset(); return; }
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) { distanceRef.current = 0; setPullDistance(0); return; }
      // Ease the travel so the indicator feels tethered, not 1:1.
      const eased = Math.min(PULL_MAX_PX, dy * 0.6);
      distanceRef.current = eased;
      setPullDistance(eased);
    };

    const onTouchEnd = (): void => {
      if (startYRef.current === null) return;
      const fired = distanceRef.current >= PULL_TO_REFRESH_THRESHOLD_PX;
      reset();
      if (fired) {
        setRefreshing(true);
        onRefresh();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', reset, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', reset);
    };
  }, [containerRef, onRefresh, refreshing]);

  return { pullDistance, ready: pullDistance >= PULL_TO_REFRESH_THRESHOLD_PX, refreshing };
}
