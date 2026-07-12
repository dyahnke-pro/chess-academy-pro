import { describe, it, expect } from 'vitest';
import { buildThinkAloud, THINK_ALOUD_MIN_GAP_CP } from './thinkAloud';

// Italian-ish middlegame, white (student) to move — a busy real position.
const MIDGAME_SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O','Re1', 'a6', 'Bb3', 'Ba7', 'h3', 'h6', 'Nbd2', 'Be6'];
const MIDGAME_FEN = 'r2q1rk1/bpp2pp1/p1npbn1p/4p3/4P3/1BPP1N1P/PP1N1PP1/R1BQR1K1 w - - 3 11';

describe('buildThinkAloud', () => {
  it('fires at a genuine decision moment and NEVER contains the best move SAN (leak guard)', () => {
    const moment = buildThinkAloud({
      fen: MIDGAME_FEN,
      historySans: MIDGAME_SANS,
      studentColor: 'white',
      lines: [
        { san: 'Nf1', evalCp: 90, replySan: 'd5' },
        { san: 'a4', evalCp: -10, replySan: 'd5' },
      ],
    });
    expect(moment).not.toBeNull();
    expect(moment!.withheldSan).toBe('Nf1');
    expect(moment!.facts).not.toContain('Nf1');
    expect(moment!.facts).toMatch(/do NOT answer/i);
  });

  it('names the tempting second line with its gap', () => {
    const moment = buildThinkAloud({
      fen: MIDGAME_FEN,
      historySans: MIDGAME_SANS,
      studentColor: 'white',
      lines: [
        { san: 'Nf1', evalCp: 120 },
        { san: 'd4', evalCp: 0 },
      ],
    });
    expect(moment!.facts).toContain('d4');
    expect(moment!.facts).toContain('1.2 pawns');
  });

  it('stays quiet when the top lines are near-equal and no principle fired', () => {
    const moment = buildThinkAloud({
      fen: MIDGAME_FEN,
      historySans: MIDGAME_SANS,
      studentColor: 'white',
      lines: [
        { san: 'Nf1', evalCp: 30 },
        { san: 'a4', evalCp: 30 - (THINK_ALOUD_MIN_GAP_CP - 10) },
      ],
    });
    expect(moment).toBeNull();
  });

  it('stays quiet in dead-won positions', () => {
    const moment = buildThinkAloud({
      fen: MIDGAME_FEN,
      historySans: MIDGAME_SANS,
      studentColor: 'white',
      lines: [
        { san: 'Nf1', evalCp: 900 },
        { san: 'a4', evalCp: 400 },
      ],
    });
    expect(moment).toBeNull();
  });

  it('fires on a principle violation even without an eval gap', () => {
    // 1.e4 e5 2.Qh5?? — black (student) to move; white just violated the rule.
    const moment = buildThinkAloud({
      fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
      historySans: ['e4', 'e5', 'Qh5'],
      studentColor: 'black',
      lines: [
        { san: 'Nc6', evalCp: -20 },
        { san: 'g6', evalCp: -50 },
      ],
    });
    expect(moment).not.toBeNull();
    expect(moment!.facts).toMatch(/queen/i);
  });
});
