import { describe, it, expect } from 'vitest';
import { fitBoardWidth, MIN_FIT_BOARD_PX } from './useBoardFit';

// The 2026-10-04 SE walk: 375×667, nav top at 610, board 343px wide, the
// Hint / Show solution row ending at 760 — 158px under the nav.
const SE = { viewportHeight: 667, navTop: 610, boardWidth: 343, containerWidth: 343 };

describe('fitBoardWidth — board + controls above the bottom nav', () => {
  it('shrinks the board by exactly the overflow (plus the gap) so the controls clear the nav', () => {
    const w = fitBoardWidth({ ...SE, keepBottom: 660 });
    expect(w).toBe(343 - (660 - (610 - 8)));
  });

  it('leaves a board alone when the controls already fit', () => {
    expect(fitBoardWidth({ ...SE, keepBottom: 500 })).toBe(343);
  });

  it('grows back to the container width on a taller screen, never past it', () => {
    expect(fitBoardWidth({ ...SE, boardWidth: 280, keepBottom: 400 })).toBe(343);
  });

  it('never goes below the tappable minimum — scrolling beats tiny squares', () => {
    expect(fitBoardWidth({ ...SE, keepBottom: 1200 })).toBe(MIN_FIT_BOARD_PX);
  });

  it('uses the viewport bottom when no bottom nav is showing (desktop)', () => {
    expect(fitBoardWidth({ ...SE, navTop: null, keepBottom: 700 })).toBe(343 - (700 - (667 - 8)));
  });
});
