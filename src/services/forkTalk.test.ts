import { describe, it, expect } from 'vitest';
import { buildForkTalk, FORK_MAX_GAP_CP } from './forkTalk';

// "Two roads here" (David 2026-07-11). The fork fires only on near-equal
// options with genuinely different characters, deliberates both, and never
// recommends — the student answers by playing.

// Vienna Gambit declined-ish shape: after 1.e4 e5 2.Nc3 Nf6 3.f4 d6, White
// can go Nf3 (solid develop) or f4xe5-adjacent sharp play. Use the real
// Vienna fork David named: Qf3 vs Nf3 from a gambit structure.
const VIENNA_FEN = 'rnbqkb1r/ppp2ppp/3p1n2/4p3/4PP2/2N5/PPPP2PP/R1BQKBNR w KQkq - 0 4';
const VIENNA_HISTORY = ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd6'];

describe('buildForkTalk', () => {
  it('builds a two-road deliberation for near-equal, different-piece options', () => {
    const talk = buildForkTalk({
      fen: VIENNA_FEN,
      historySans: VIENNA_HISTORY,
      options: [
        { uci: 'g1f3', evalCp: 45 },  // Nf3 — solid develop
        { uci: 'f4e5', evalCp: 30 },  // fxe5 — sharp capture
      ],
    });
    expect(talk).not.toBeNull();
    expect(talk!.options.map((o) => o.san)).toEqual(['Nf3', 'fxe5']);
    expect(talk!.options[0].character).toBe('solid');
    expect(talk!.options[1].character).toBe('sharp');
    // The deliberation instruction never recommends.
    expect(talk!.facts).toContain('Do NOT recommend');
    expect(talk!.facts).toContain('Road one');
    expect(talk!.facts).toContain('Road two');
    // One arrow per road, distinct colors.
    expect(talk!.arrows).toHaveLength(2);
    expect(talk!.arrows[0].color).not.toBe(talk!.arrows[1].color);
    // Road-affirm clauses exist for both picks.
    expect(talk!.affirmBySan['Nf3']).toMatch(/patient/i);
    expect(talk!.affirmBySan['fxe5']).toMatch(/sharp|initiative/i);
  });

  it('rejects when the gap is too wide — that is a find-the-move moment, not a fork', () => {
    const talk = buildForkTalk({
      fen: VIENNA_FEN,
      historySans: VIENNA_HISTORY,
      options: [
        { uci: 'g1f3', evalCp: 200 },
        { uci: 'f4e5', evalCp: 200 - FORK_MAX_GAP_CP - 10 },
      ],
    });
    expect(talk).toBeNull();
  });

  it('rejects same-piece same-character alternatives (move-order noise)', () => {
    // Two quiet king-knight developments from the start position.
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const talk = buildForkTalk({
      fen: start,
      historySans: [],
      options: [
        { uci: 'g1f3', evalCp: 30 },
        { uci: 'g1h3', evalCp: 25 },
      ],
    });
    expect(talk).toBeNull();
  });

  it('rejects fewer than two options / illegal moves', () => {
    expect(buildForkTalk({ fen: VIENNA_FEN, historySans: VIENNA_HISTORY, options: [{ uci: 'g1f3', evalCp: 30 }] })).toBeNull();
    expect(
      buildForkTalk({
        fen: VIENNA_FEN,
        historySans: VIENNA_HISTORY,
        options: [{ uci: 'g1f3', evalCp: 30 }, { uci: 'a1a8', evalCp: 28 }],
      }),
    ).toBeNull();
  });
});
