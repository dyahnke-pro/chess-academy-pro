import { describe, expect, it } from 'vitest';
import { IMAGERY, imageryFor } from './factImagery';

// Review of chesscom-1040709576 (2026-10-13): "Yesterday's move is paying
// today's bill" and "Two sentries staring at each other" restated a fact
// already said — description, which is cut.
describe('an image that only restates its fact never speaks', () => {
  it('the restating images are silent on every rotation', () => {
    for (let stem = 0; stem < 20; stem += 1) {
      for (const k of ['safe-because', 'duty-parity', 'threat-cost', 'deny-exchange', 'exchange-for-attacker', 'c-pawn-block'] as const) {
        expect(imageryFor(k, stem)).toBeNull();
      }
      // "The door is still open, but now there is a trap behind it." rode
      // "the threat costs them more than it wins" at 16…Nd4.
      expect(imageryFor('badbishop', stem) ?? '').not.toMatch(/staring at its own pawns/);
    }
  });
  it('NEGATIVE CONTROL: a teaching image still rotates in', () => {
    const said = Array.from({ length: 20 }, (_, i) => imageryFor('badbishop', i)).filter(Boolean);
    expect(said.length).toBeGreaterThan(0);
    expect(IMAGERY.badbishop.length).toBeGreaterThan(1);
  });
});
