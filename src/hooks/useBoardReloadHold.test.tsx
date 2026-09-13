import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { render } from '../test/utils';
import type { ChessboardOptions } from 'react-chessboard';

// ── THE DEPLOY RELOAD IS HELD BY THE BOARD, NOT BY EACH SURFACE ─────────────
// David 2026-09-13. `/coach/teach`'s play-out was reloaded out from under a
// live lesson because Learn's hold was wired to the walkthrough alone. Fixing
// that one caller left ~50 other board surfaces with no hold at all — the
// lesson-length ones (endgame trainer, SRS, tactics practice, the legacy
// walkthrough/drill/train/practice modes, every kid game) genuinely lose work.
//
// The hold now lives in the three primitives every one of them renders
// through, so no surface opts in and none can forget. THESE TESTS RENDER THE
// REAL PRIMITIVES and read the real hold count — a source-scan asserting "the
// hook is called somewhere" would pass on a call that never runs.
//
// Each test also has a negative twin (start position → no hold; display board
// → no hold), because a hold that is always on is the same bug as one that is
// always off: it would defer every deploy forever and nobody would notice.

vi.mock('react-chessboard', () => ({
  Chessboard: ({ options = {} }: { options?: ChessboardOptions }): JSX.Element => (
    <div data-testid="mock-chessboard" data-position={typeof options.position === 'string' ? options.position : ''} />
  ),
}));

import { ControlledChessBoard } from '../components/Board/ControlledChessBoard';
import { ChessBoard } from '../components/Board/ChessBoard';
import { ConsistentChessboard } from '../components/Chessboard/ConsistentChessboard';
import { swReloadHoldCount } from '../utils/swReloadHold';
import { isUntouchedStart } from './useBoardReloadHold';
import type { UseChessGameReturn } from './useChessGame';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// A real endgame a student would be mid-solving — the shape `loadFen` puts on
// the board for a puzzle, with an empty move history behind it.
const PUZZLE = '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1';

function mockGame(fen: string): UseChessGameReturn {
  return {
    fen,
    position: fen,
    turn: 'w',
    inCheck: false,
    isCheck: false,
    checkSquare: null,
    isGameOver: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    lastMove: null,
    history: [],
    pgn: '',
    selectedSquare: null,
    legalMoves: [],
    boardOrientation: 'white',
    makeMove: vi.fn().mockReturnValue(null),
    onDrop: vi.fn().mockReturnValue(null),
    onSquareClick: vi.fn().mockReturnValue(null),
    flipBoard: vi.fn(),
    setOrientation: vi.fn(),
    undoMove: vi.fn(),
    resetGame: vi.fn(),
    clearSelection: vi.fn(),
    getLegalMoves: vi.fn().mockReturnValue([]),
    getPiece: vi.fn().mockReturnValue(null),
    getFen: vi.fn().mockReturnValue(fen),
    reset: vi.fn(),
    loadFen: vi.fn().mockReturnValue(true),
    loadHistory: vi.fn().mockReturnValue(true),
  } as unknown as UseChessGameReturn;
}

describe('isUntouchedStart', () => {
  it('reads the placement only, so clocks and side-to-move do not matter', () => {
    expect(isUntouchedStart(START)).toBe(true);
    expect(isUntouchedStart('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 9 5')).toBe(true);
    expect(isUntouchedStart(PUZZLE)).toBe(false);
    expect(isUntouchedStart(undefined)).toBe(true);
  });
});

describe('every board primitive holds the deploy reload while it has work on it', () => {
  beforeEach(() => {
    expect(swReloadHoldCount(), 'a prior test leaked a hold').toBe(0);
  });
  afterEach(() => {
    cleanup();
    expect(swReloadHoldCount(), 'unmounting must release the hold').toBe(0);
  });

  it('ControlledChessBoard: holds on a position with work, not on the start', () => {
    const { unmount } = render(<ControlledChessBoard game={mockGame(START)} />);
    expect(swReloadHoldCount()).toBe(0);
    unmount();

    render(<ControlledChessBoard game={mockGame(PUZZLE)} />);
    expect(swReloadHoldCount()).toBe(1);
  });

  it('ChessBoard: holds on a seeded position even with an empty move history', () => {
    // The drill/puzzle shape: nothing played yet, but the position IS the work.
    const { unmount } = render(<ChessBoard initialFen={START} />);
    expect(swReloadHoldCount()).toBe(0);
    unmount();

    render(<ChessBoard initialFen={PUZZLE} />);
    expect(swReloadHoldCount()).toBe(1);
  });

  it('ConsistentChessboard static: an INTERACTIVE board holds, a display board never does', () => {
    // Display-only — thumbnails, search results, citation previews, model-game
    // viewers. These must not defer a deploy; there is nothing to lose.
    const { unmount } = render(<ConsistentChessboard fen={PUZZLE} />);
    expect(swReloadHoldCount(), 'a display board must not hold').toBe(0);
    unmount();

    render(<ConsistentChessboard fen={PUZZLE} interactive />);
    expect(swReloadHoldCount()).toBe(1);
  });

  it('a read-only lesson board starts holding once the coach moves a piece on it', () => {
    // THE HOLE `interactive` ALONE LEAVES. Lesson surfaces gate interactivity by
    // phase, so while the coach demonstrates, the board is read-only — the very
    // state the Learn play-out was reloaded in. A board that MOVES is a lesson;
    // a board that never moves is a picture.
    const demo = render(<ConsistentChessboard fen={PUZZLE} />);
    expect(swReloadHoldCount(), 'a still board is a picture').toBe(0);
    demo.rerender(<ConsistentChessboard fen={'8/8/8/4k3/4P3/4K3/8/8 b - - 0 1'} />);
    expect(swReloadHoldCount(), 'it moved — that is a lesson in progress').toBe(1);
  });

  it('composes: two live boards hold once each and release independently', () => {
    const a = render(<ControlledChessBoard game={mockGame(PUZZLE)} />);
    const b = render(<ChessBoard initialFen={PUZZLE} />);
    expect(swReloadHoldCount()).toBe(2);
    a.unmount();
    expect(swReloadHoldCount()).toBe(1);
    b.unmount();
    expect(swReloadHoldCount()).toBe(0);
  });
});
