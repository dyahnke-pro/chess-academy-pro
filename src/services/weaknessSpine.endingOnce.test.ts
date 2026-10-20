// THE ENDING A GAME FINISHED IN IS READ ONCE PER GAME (OS-18 replay
// 2026-10-20, 14.Rd5): every profile read replayed each thrown win's PGN to
// classify its ending — about 0.45 s of main thread mid-turn on David's record.
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';
import { aggregateConversionFailures } from './weaknessSpine';
import type { ConversionFailure } from './conversionDetector';
import type { GameRecord } from '../types';

const PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7';
const failure: ConversionFailure = { gameId: 'end-1', fen: new Chess().fen(), peakCp: 400, finalCp: 0, result: 'draw', playerColor: 'white', openingName: null, date: '2026-10-01', peakMoveNumber: 3 };
const g = { id: 'end-1', pgn: PGN } as GameRecord;

describe('the conversion row reads a game\'s ending once', () => {
  it('a second read of the same game does not replay its PGN', () => {
    const spy = vi.spyOn(Chess.prototype, 'loadPgn');
    try {
      aggregateConversionFailures([failure], [g]);
      const first = spy.mock.calls.length;
      aggregateConversionFailures([failure], [{ ...g }]);
      expect(first).toBe(1);
      expect(spy.mock.calls.length).toBe(1);
      aggregateConversionFailures([failure], [{ ...g, pgn: `${PGN} 6. Re1` }]);
      expect(spy.mock.calls.length).toBe(2);
    } finally {
      spy.mockRestore();
    }
  });
});
