import { describe, expect, it } from 'vitest';
import { renderFundamentalVerdict } from './principleVoice';
import type { PrincipleAttribution } from './principleAttribution';

// Clean-pass walk 2026-10-03, G1 ply 29: "Always run the forcing moves first:
// axb4 was decisive" at +1.76. The detector proves a forced material win (or
// mate), never a decisive result.
const attr = (gain: string): PrincipleAttribution => ({
  id: 'passive-when-forcing-existed', tag: 'missed-forcing', weight: 3, coOccurrence: [],
  evidence: { squares: ['b4'], moves: ['axb4'], pvMoves: [], counterfactualClean: true },
  facts: { better: 'axb4', gain },
} as unknown as PrincipleAttribution);

describe('the missed-forcing verdict says what the forcing move won', () => {
  for (let ply = 0; ply < 3; ply += 1) {
    it(`stem ${ply}: never "decisive"`, () => {
      const line = renderFundamentalVerdict([attr('material')], { ply, seen: new Set(), replySan: null }) ?? '';
      expect(line).not.toMatch(/decisive/);
    });
  }
  it('a mate is called a mate, not material', () => {
    const lines = [0, 1, 2].map((ply) => renderFundamentalVerdict([attr('mate')], { ply, seen: new Set(), replySan: null }) ?? '');
    expect(lines.join(' ')).not.toMatch(/won material/);
  });
});
