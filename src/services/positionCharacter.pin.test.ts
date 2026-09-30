import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildTacticsLiveContext } from './liveTacticsContext';
import { provenTacticLive } from './positionCharacter';

// Hand walk 2026-09-30, Closed Ruy: a STANDING pin (…Bg4 on Nf3/d1) turned the
// position "sharp" and flipped it back twice. The detector reports the pin's
// geometry with no verdict, so it can't count as a live tactic; only a pattern
// a verifier proved wins something does. The engine's best-move gap still marks
// a pin that really costs material as sharp.
describe('provenTacticLive', () => {
  it('a standing pin with no verdict is NOT a live tactic (the real Ruy position)', () => {
    const c = new Chess();
    for (const m of 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O d3 Bg4 Nbd2'.split(' ')) c.move(m);
    const t = buildTacticsLiveContext(c.fen(), null, 'w', 1500);
    expect(t.immediate.map((x) => x.type)).toEqual(['pin']);
    expect(provenTacticLive(t.immediate)).toBe(false);
  });

  it('a verified fork IS (negative control: the rule is not just "never")', () => {
    const t = buildTacticsLiveContext('r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1', null, 'w', 1500);
    expect(t.immediate[0]?.wins).toBe('threat');
    expect(provenTacticLive(t.immediate)).toBe(true);
  });

  it('a fork the verifier rejects is not', () => {
    expect(provenTacticLive([{ wins: 'none' }])).toBe(false);
  });
});
