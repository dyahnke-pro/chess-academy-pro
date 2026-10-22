import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useBoardFit } from './useBoardFit';

// The 2026-10-22 Review defect: the walk mounts its board and bar on Start
// walk while the fit's key (the ply) is still 0, so a fit keyed only on that
// key never measured the new elements — the bar sat under the nav until the
// first ply changed it. The fit must follow its ELEMENTS, not just its key.

function Harness({ show }: { show: boolean }): JSX.Element {
  const fit = useBoardFit(0); // the key never changes across the mount
  return (
    <div>
      {show && (
        <div data-testid="container">
          <div ref={fit.boardRef} style={fit.boardStyle} data-testid="board" />
          <div ref={fit.keepRef} data-testid="keep" />
        </div>
      )}
    </div>
  );
}

function rect(r: Partial<DOMRect>): DOMRect {
  return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, ...r, toJSON: () => ({}) } as DOMRect;
}

describe('useBoardFit — elements that mount after the hook', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('fits a board and bar that mount later with the same key', () => {
    // 343px board in a 343px container; the bar ends 40px past the limit
    // (jsdom: innerHeight 768, no bottom nav → limit 760).
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const id = this.getAttribute('data-testid');
      if (id === 'board') return rect({ width: 343, right: 343 });
      if (id === 'keep') return rect({ top: 756, bottom: 800 });
      return rect({});
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.getAttribute('data-testid') === 'container' ? 343 : 0;
    });
    const innerHeight = window.innerHeight;
    const { rerender, getByTestId } = render(<Harness show={false} />);
    rerender(<Harness show />);
    const limit = innerHeight - 8;
    expect(getByTestId('board').style.maxWidth).toBe(`${343 - (800 - limit)}px`);
  });
});
