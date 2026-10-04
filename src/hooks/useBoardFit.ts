import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** Smallest board the fit will ever produce — below this the squares stop
 *  being tappable, and scrolling is the lesser evil. */
export const MIN_FIT_BOARD_PX = 240;
/** Breathing room kept between the last control and the bottom nav. */
const NAV_GAP_PX = 8;

export interface BoardFitInput {
  /** Viewport height (px). */
  viewportHeight: number;
  /** Top of the fixed bottom nav in the viewport, or null when none shows. */
  navTop: number | null;
  /** Width the board has now (px). */
  boardWidth: number;
  /** Widest the board may grow (its container's width, px). */
  containerWidth: number;
  /** Bottom of the control row that must stay visible, measured as if the
   *  page were scrolled to the top (px from the viewport top). */
  keepBottom: number;
}

/**
 * The board width at which the control row under it ends just above the bottom
 * nav. The board is square, so every pixel taken off its width lifts the
 * controls by one pixel — one subtraction, no loop. Clamped to
 * [MIN_FIT_BOARD_PX, containerWidth].
 */
export function fitBoardWidth(i: BoardFitInput): number {
  const limit = (i.navTop ?? i.viewportHeight) - NAV_GAP_PX;
  const overflow = i.keepBottom - limit;
  const target = i.boardWidth - overflow;
  return Math.round(Math.max(MIN_FIT_BOARD_PX, Math.min(i.containerWidth, target)));
}

function scrollParentOf(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p) {
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return p;
    p = p.parentElement;
  }
  return null;
}

/** The fixed bottom nav, when it is showing (phones). */
function bottomNavTop(): number | null {
  const nav = document.querySelector<HTMLElement>('[data-bottom-nav]');
  if (!nav) return null;
  const r = nav.getBoundingClientRect();
  return r.height > 0 && getComputedStyle(nav).display !== 'none' ? r.top : null;
}

/**
 * Sizes a puzzle board so the board AND its controls (Hint, Show solution)
 * fit above the bottom nav without scrolling (David 2026-10-04: "shrink board
 * to fit"). Attach `boardRef` to the board's wrapper and `keepRef` to the
 * control row that must stay on screen; spread `boardStyle` on the wrapper.
 * `measureKey` re-fits when the layout above or below changes (e.g. the puzzle
 * state). Nothing changes on a screen tall enough already.
 */
export function useBoardFit(measureKey: unknown): {
  boardRef: React.RefObject<HTMLDivElement | null>;
  /** Callback ref: works on any element (a div row or a lone button). */
  keepRef: (el: HTMLElement | null) => void;
  boardStyle: React.CSSProperties | undefined;
} {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const keepEl = useRef<HTMLElement | null>(null);
  const keepRef = useCallback((el: HTMLElement | null): void => { keepEl.current = el; }, []);
  const [maxPx, setMaxPx] = useState<number | null>(null);

  const fit = useCallback((): void => {
    const board = boardRef.current;
    // No control row on screen (the puzzle resolved): hold the current size,
    // never let the board jump back up under the student's eyes.
    const keep = keepEl.current;
    const container = board?.parentElement;
    if (!board || !keep || !container) return;
    const scroller = scrollParentOf(board);
    const scrolled = scroller ? scroller.scrollTop : window.scrollY;
    const next = fitBoardWidth({
      viewportHeight: window.innerHeight,
      navTop: bottomNavTop(),
      boardWidth: board.getBoundingClientRect().width,
      containerWidth: container.clientWidth,
      keepBottom: keep.getBoundingClientRect().bottom + scrolled,
    });
    setMaxPx((prev) => (prev === next ? prev : next));
  }, []);

  useLayoutEffect(() => {
    fit();
    const raf = requestAnimationFrame(fit);
    window.addEventListener('resize', fit);
    // The page settles AFTER mount (fonts, the header row, a loading line
    // that becomes the controls), so re-fit whenever anything around the
    // board changes size. The formula is a fixed point — once the controls
    // sit on the line, the next fit returns the same width and stops.
    // Every ancestor from the board up to the scroll root grows when content
    // above or below it does, so those are what is watched.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fit()) : null;
    for (let el = boardRef.current?.parentElement ?? null; ro && el && el.tagName !== 'MAIN' && el !== document.body; el = el.parentElement) {
      ro.observe(el);
    }
    if (ro && keepEl.current) ro.observe(keepEl.current);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      ro?.disconnect();
    };
  }, [fit, measureKey]);

  return { boardRef, keepRef, boardStyle: maxPx === null ? undefined : { maxWidth: maxPx } };
}
