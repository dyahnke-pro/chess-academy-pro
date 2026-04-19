import { useEffect, useState } from 'react';

/**
 * Reads `prefers-reduced-motion` and returns true when the user has
 * requested reduced motion in their OS accessibility settings. Use
 * this to skip decorative animations (pulsing mic, scale bounces,
 * etc.) — never to gate functional motion like scroll or drag.
 *
 * SSR-safe: starts `false` when `window` is unavailable and updates
 * on mount + on media-query changes.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    // matchMedia types as non-null, but older browsers / jsdom can
    // leave it undefined — keep the runtime guard.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent): void => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
