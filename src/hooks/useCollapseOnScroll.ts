import { useCallback, useState } from 'react';

/**
 * Collapse-on-scroll for page headers. Returns `collapsed` (true once the
 * attached scroll container is scrolled DOWN past `collapseAt`, false again
 * when it returns near the top within `expandAt`) and an `onScroll` handler to
 * spread onto the scrollable content `<div>`. The small hysteresis gap between
 * the two thresholds prevents flicker right at the boundary.
 *
 * David 2026-06-19: the Tactics-tab pages collapse their title on scroll-down
 * and re-expand at the top, using the Game Insights page as the guide — keep a
 * key row pinned, hide everything above it while scrolled.
 */
export function useCollapseOnScroll(
  collapseAt = 24,
  expandAt = 8,
): { collapsed: boolean; onScroll: (e: React.UIEvent<HTMLElement>) => void } {
  const [collapsed, setCollapsed] = useState(false);
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLElement>): void => {
      const top = e.currentTarget.scrollTop;
      setCollapsed((prev) => (prev ? top >= expandAt : top > collapseAt));
    },
    [collapseAt, expandAt],
  );
  return { collapsed, onScroll };
}
