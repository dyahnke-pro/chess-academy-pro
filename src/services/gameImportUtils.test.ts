import { describe, it, expect } from 'vitest';
import { detectBlunders, extractClockMs } from './gameImportUtils';

describe('extractClockMs', () => {
  it('parses H:MM:SS clock tags in move order to ms', () => {
    const pgn = '1. e4 { [%clk 0:03:00] } e5 { [%clk 0:02:58] } 2. Nf3 { [%clk 0:02:55] } Nc6 { [%clk 0:02:50] } *';
    expect(extractClockMs(pgn)).toEqual([180_000, 178_000, 175_000, 170_000]);
  });

  it('handles tenths and M:SS / SS forms', () => {
    const pgn = '1. e4 { [%clk 0:00:09.3] } e5 { [%clk 1:05] } 2. Nf3 { [%clk 8] } *';
    expect(extractClockMs(pgn)).toEqual([9_300, 65_000, 8_000]);
  });

  it('returns [] for an untimed game with no clock tags', () => {
    expect(extractClockMs('1. e4 e5 2. Nf3 Nc6 *')).toEqual([]);
  });

  it('coexists with [%eval] comments without confusion', () => {
    const pgn = '1. e4 { [%eval 0.2] [%clk 0:03:00] } e5 { [%clk 0:02:59] [%eval 0.1] } *';
    expect(extractClockMs(pgn)).toEqual([180_000, 179_000]);
  });
});

describe('gameImportUtils', () => {
  describe('detectBlunders', () => {
    it('detects blunders from eval annotations', () => {
      // Simulating a game where Black blunders on move 2
      // Evals: +0.2, +0.3, +0.1, +4.0 (Black's move made eval jump from +0.1 to +4.0, drop=390cp)
      const pgn = `[Event "Test"]
1. e4 {[%eval 0.2]} e5 {[%eval 0.3]} 2. Nf3 {[%eval 0.1]} Nc6 {[%eval 4.0]} 1-0`;

      const result = detectBlunders(pgn);
      expect(result).toHaveLength(1);
      expect(result?.[0].moveNumber).toBe(2);
      expect(result?.[0].color).toBe('black');
      expect(result?.[0].classification).toBe('blunder');
    });

    it('detects White blunders', () => {
      // White blunders: eval goes from +2.0 to -1.0 on White's move
      const pgn = `[Event "Test"]
1. e4 {[%eval 0.5]} e5 {[%eval 0.5]} 2. Nf3 {[%eval 2.0]} Nc6 {[%eval 2.0]} 3. Bb5 {[%eval -1.0]} 1-0`;

      const result = detectBlunders(pgn);
      expect(result).toHaveLength(1);
      expect(result?.[0].color).toBe('white');
      expect(result?.[0].classification).toBe('blunder');
    });

    it('returns null when no blunders', () => {
      const pgn = `[Event "Test"]
1. e4 {[%eval 0.3]} e5 {[%eval 0.2]} 2. Nf3 {[%eval 0.3]} Nc6 {[%eval 0.2]} 1-0`;

      const result = detectBlunders(pgn);
      expect(result).toBeNull();
    });

    it('returns null when no eval annotations', () => {
      const pgn = '1. e4 e5 2. Nf3 Nc6 1-0';
      const result = detectBlunders(pgn);
      expect(result).toBeNull();
    });

    it('handles mate evaluations', () => {
      // Eval goes from +0.5 to mate (huge drop for Black)
      const pgn = `[Event "Test"]
1. e4 {[%eval 0.5]} e5 {[%eval 0.5]} 2. Qh5 {[%eval 0.0]} Nc6 {[%eval #1]} 1-0`;

      const result = detectBlunders(pgn);
      expect(result).not.toBeNull();
      // Black allowed mate
      const blackBlunder = result?.find((a) => a.color === 'black');
      expect(blackBlunder).toBeDefined();
      expect(blackBlunder?.classification).toBe('blunder');
    });

    it('classifies mistakes vs blunders by drop size', () => {
      // 150-299cp drop = mistake, 300+ = blunder
      const pgn = `[Event "Test"]
1. e4 {[%eval 0.5]} e5 {[%eval 0.5]} 2. Nf3 {[%eval 0.5]} Nc6 {[%eval 2.3]} 1-0`;

      const result = detectBlunders(pgn);
      expect(result).not.toBeNull();
      // Drop is 180cp (2.3 - 0.5 = 1.8 pawns), classified as mistake
      expect(result?.[0].classification).toBe('mistake');
    });

    it('handles mate eval with negative sign (#-2)', () => {
      // Eval goes from -0.5 to #-2 (Black is winning, then gives mate)
      const pgn = `[Event "Test"]
1. e4 {[%eval 0.5]} e5 {[%eval -0.5]} 2. Nf3 {[%eval 0.0]} Nc6 {[%eval #-2]} 1-0`;

      const result = detectBlunders(pgn);
      // #-2 is -10000cp, previous was 0. For Black's move (index 3),
      // drop = curr.cp - prev.cp = -10000 - 0 = -10000 (negative = good for Black, not a blunder)
      // So no blunder from Black's perspective
      // But the big swing might be caught by White's move
      expect(result).toBeNull(); // No blunder since eval went in Black's favor
    });

    it('handles mate eval #3 (White mating)', () => {
      const pgn = `[Event "Test"]
1. e4 {[%eval 0.3]} e5 {[%eval 0.3]} 2. Qh5 {[%eval #3]} Nc6 {[%eval 0.5]} 1-0`;

      const result = detectBlunders(pgn);
      // White's Qh5 at index 2: eval went from 0.3 (30cp) to #3 (10000cp)
      // For White move: drop = prev.cp - curr.cp = 30 - 10000 = -9970 (negative means improvement, not blunder)
      // Black's Nc6 at index 3: eval went from #3 (10000cp) to 0.5 (50cp)
      // For Black move: drop = curr.cp - prev.cp = 50 - 10000 = -9950 (negative = improvement for Black)
      // Actually let me re-read: Black's move (odd index), drop = curr.cp - prev.cp
      // 50 - 10000 = -9950, which is not > 150, so no blunder
      // Hmm, but the actual logic is that eval RISING is bad for Black.
      // prev=10000, curr=50: drop = 50 - 10000 = -9950 (negative, not a blunder for Black)
      // Wait: for Black, a BAD move means eval RISES (goes more positive)
      // prev=10000 to curr=50 means eval DROPPED from White perspective, so Black IMPROVED
      // So no blunder, which makes sense
      expect(result).toBeNull();
    });

    it('classifyDrop: exactly 150cp is mistake boundary', () => {
      // Create a scenario where eval drop is exactly 150cp
      const pgn = `[Event "Test"]
1. e4 {[%eval 0.0]} e5 {[%eval 0.0]} 2. Nf3 {[%eval 0.0]} Nc6 {[%eval 1.5]} 1-0`;

      const result = detectBlunders(pgn);
      // Black's move (index 3): drop = curr.cp - prev.cp = 150 - 0 = 150
      // 150 > 150 is false, so... the threshold is > 150, not >= 150
      // Actually: drop = 150, and condition is drop > BLUNDER_THRESHOLD_CP (150)
      // So 150 is NOT a blunder. Only > 150 is.
      expect(result).toBeNull();
    });

    it('classifyDrop: 151cp is a mistake', () => {
      const pgn = `[Event "Test"]
1. e4 {[%eval 0.0]} e5 {[%eval 0.0]} 2. Nf3 {[%eval 0.0]} Nc6 {[%eval 1.51]} 1-0`;

      const result = detectBlunders(pgn);
      expect(result).not.toBeNull();
      expect(result?.[0].classification).toBe('mistake');
    });

    it('classifyDrop: 300cp is blunder boundary', () => {
      const pgn = `[Event "Test"]
1. e4 {[%eval 0.0]} e5 {[%eval 0.0]} 2. Nf3 {[%eval 0.0]} Nc6 {[%eval 3.0]} 1-0`;

      const result = detectBlunders(pgn);
      expect(result).not.toBeNull();
      expect(result?.[0].classification).toBe('blunder');
    });

    it('returns null for single eval annotation', () => {
      const pgn = `[Event "Test"]
1. e4 {[%eval 0.5]} e5 1-0`;
      expect(detectBlunders(pgn)).toBeNull();
    });

    it('handles malformed PGN gracefully', () => {
      expect(detectBlunders('')).toBeNull();
      expect(detectBlunders('not a pgn at all')).toBeNull();
    });
  });

});
