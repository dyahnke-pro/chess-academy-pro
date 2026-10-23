import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { render } from '../../test/utils';
import { ConsistentChessboard } from './ConsistentChessboard';

vi.mock('../../hooks/usePieceSound', () => ({
  usePieceSound: () => ({ playMoveSound: vi.fn(), playCelebration: vi.fn(), playEncouragement: vi.fn(), playErrorPing: vi.fn(), playSuccessChime: vi.fn() }),
}));

/**
 * TWO BOARDS ON SCREEN, A TAP ON THE SECOND (David's iPhone, 2026-10-23: the
 * Campaign's K+Q try board — a sheet over the game board — took no move).
 * react-chessboard measures a touch against `getElementById(`${id}-square-…`)`;
 * with one shared default id it measured the FIRST board's square. Real
 * react-chessboard here, the two boards placed apart on the page.
 */
describe('a touch tap lands on the board it was made on', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('the second of two boards takes a tap (fails with one shared board id)', () => {
    const tapsA = vi.fn();
    const tapsB = vi.fn();
    const FEN = '7k/5K2/6Q1/8/8/8/8/8 w - - 0 1';
    const { getByTestId } = render(
      <div>
        <div data-testid="board-a"><ConsistentChessboard fen={FEN} interactive onSquareClick={tapsA} /></div>
        <div data-testid="board-b"><ConsistentChessboard fen={FEN} interactive onSquareClick={tapsB} /></div>
      </div>,
    );
    const a = getByTestId('board-a');
    const b = getByTestId('board-b');
    // Board A sits far down the page, board B at the top left.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const at = a.contains(this) ? 1000 : 0;
      return { left: at, right: at + 10, top: at, bottom: at + 10, x: at, y: at, width: 10, height: 10, toJSON: () => ({}) } as DOMRect;
    });
    const square = b.querySelector('[data-square="g6"]');
    expect(square).not.toBeNull();
    const touch = { clientX: 5, clientY: 5 };
    fireEvent.touchStart(square as Element, { touches: [touch], changedTouches: [touch] });
    fireEvent.touchEnd(square as Element, { touches: [], changedTouches: [touch] });
    expect(tapsB).toHaveBeenCalledWith(expect.objectContaining({ square: 'g6' }));
    expect(tapsA).not.toHaveBeenCalled();
  });

  it('every board on the page has its own square ids', () => {
    const FEN = '8/8/8/8/8/8/8/K6k w - - 0 1';
    const { container } = render(
      <div>
        <ConsistentChessboard fen={FEN} />
        <ConsistentChessboard fen={FEN} />
      </div>,
    );
    const ids = [...container.querySelectorAll('[data-square="a1"]')].map((el) => el.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
