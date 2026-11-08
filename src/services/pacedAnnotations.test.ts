import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { paceAnnotations } from './pacedAnnotations';
import { MS_PER_CHAR } from './markPacing';
import type { BoardAnnotationCommand } from '../types';

// The in-game chat panel handed every mark of an answer to the board in one
// batch when the stream ended (marks sweep 2026-11-08).
const FEN = (() => { const c = new Chess(); for (const s of ['e4', 'e5', 'Nf3', 'Nc6']) c.move(s); return c.fen(); })();
const TEXT = 'Their pawn on e5 is guarded once. Bb5 pins the knight that guards it.';
const ARROW: BoardAnnotationCommand = { type: 'arrow', arrows: [{ startSquare: 'f1', endSquare: 'b5', color: '#22c55e' }] };

describe('a chat answer puts its marks up as it says them', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('the square its words name lights at its word; the move goes up at its own', () => {
    const emit = vi.fn();
    paceAnnotations([ARROW], TEXT, FEN, 'w', emit, 0);
    expect(emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(TEXT.indexOf('e5') * MS_PER_CHAR);
    expect(emit).toHaveBeenLastCalledWith([{ type: 'highlight', highlights: [{ square: 'e5', color: '#eab308' }] }]);
    vi.advanceTimersByTime((TEXT.indexOf('Bb5') + 1 - TEXT.indexOf('e5')) * MS_PER_CHAR);
    expect(emit).toHaveBeenLastCalledWith([ARROW]);
  });

  it('marks whose words are already past go up at once', () => {
    const emit = vi.fn();
    paceAnnotations([ARROW], TEXT, FEN, 'w', emit, TEXT.length * MS_PER_CHAR);
    vi.advanceTimersByTime(0);
    expect(emit).toHaveBeenLastCalledWith([ARROW]);
  });

  it('a position switch is applied now; no voice puts every mark up at once', () => {
    const emit = vi.fn();
    paceAnnotations([{ type: 'show_position', fen: FEN, label: 'x' }, ARROW], '', FEN, 'w', emit, 0);
    expect(emit).toHaveBeenNthCalledWith(1, [{ type: 'show_position', fen: FEN, label: 'x' }]);
    expect(emit).toHaveBeenNthCalledWith(2, [ARROW]);
  });
});
