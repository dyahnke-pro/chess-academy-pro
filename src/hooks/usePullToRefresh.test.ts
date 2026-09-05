import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { usePullToRefresh, PULL_TO_REFRESH_THRESHOLD_PX } from './usePullToRefresh';

// Pull-to-refresh on the AppLayout wrapper (David 2026-09-05). The gesture must
// fire ONLY for a real top-of-page pull: at scrollTop 0, not on a board or a
// text field, and only past the release threshold. Each of those is a way it
// could misfire mid-game or mid-scroll, so each is pinned here.

let container: HTMLDivElement;

function pull(target: Element, from: number, to: number): void {
  fireEvent.touchStart(target, { touches: [{ clientY: from, clientX: 100 }] });
  fireEvent.touchMove(target, { touches: [{ clientY: to, clientX: 100 }] });
  fireEvent.touchEnd(target, { changedTouches: [{ clientY: to, clientX: 100 }] });
}

/** Raw drag distance that lands past the threshold after the hook's 0.6 easing. */
const FAR_ENOUGH = Math.ceil(PULL_TO_REFRESH_THRESHOLD_PX / 0.6) + 20;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => { container.remove(); });

describe('usePullToRefresh', () => {
  it('refreshes on a pull past the threshold from the top of the page', () => {
    const onRefresh = vi.fn();
    const ref = { current: container };
    renderHook(() => usePullToRefresh(ref, onRefresh));
    act(() => pull(container, 100, 100 + FAR_ENOUGH));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does NOT refresh on a short pull', () => {
    const onRefresh = vi.fn();
    renderHook(() => usePullToRefresh({ current: container }, onRefresh));
    act(() => pull(container, 100, 130));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does NOT arm when the page is already scrolled (that is a normal scroll)', () => {
    const onRefresh = vi.fn();
    renderHook(() => usePullToRefresh({ current: container }, onRefresh));
    container.scrollTop = 40;
    act(() => pull(container, 100, 100 + FAR_ENOUGH));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does NOT arm when the touch starts on a board square — that drag is a MOVE', () => {
    const onRefresh = vi.fn();
    renderHook(() => usePullToRefresh({ current: container }, onRefresh));
    const square = document.createElement('div');
    square.setAttribute('data-square', 'e2');
    container.appendChild(square);
    act(() => pull(square, 100, 100 + FAR_ENOUGH));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does NOT arm when the touch starts in a text field', () => {
    const onRefresh = vi.fn();
    renderHook(() => usePullToRefresh({ current: container }, onRefresh));
    const input = document.createElement('input');
    container.appendChild(input);
    act(() => pull(input, 100, 100 + FAR_ENOUGH));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('reports pull distance while dragging and resets on release', () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh({ current: container }, onRefresh));
    act(() => {
      fireEvent.touchStart(container, { touches: [{ clientY: 100, clientX: 100 }] });
      fireEvent.touchMove(container, { touches: [{ clientY: 150, clientX: 100 }] });
    });
    expect(result.current.pullDistance).toBeGreaterThan(0);
    expect(result.current.ready).toBe(false);
    act(() => { fireEvent.touchEnd(container, { changedTouches: [{ clientY: 150, clientX: 100 }] }); });
    expect(result.current.pullDistance).toBe(0);
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
