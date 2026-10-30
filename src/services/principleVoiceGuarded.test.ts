import { describe, it, expect } from 'vitest';
import type { PrincipleAttribution } from './principleAttribution';
import { renderFundamentalVerdict, verdictAlone } from './principleVoice';


// A guarded piece a cheaper attacker wins is not "hanging" (walk 2026-10-11:
// "That left your knight on f6 hanging to gxf6" — the knight was guarded).
const loose = (guards: number): PrincipleAttribution => ({
  id: 'loose-piece', tag: 'hung-material', weight: 3, coOccurrence: false,
  evidence: { squares: ['f6'], moves: ['gxf6'], pvMoves: [], counterfactualClean: true },
  facts: { piece: 'knight', square: 'f6', guards },
});

describe('the loose-piece verdict says guarded when it is', () => {
  for (let ply = 1; ply <= 3; ply += 1) {
    it(`guarded (stem ${ply}): never "hanging" or "undefended"`, () => {
      const text = verdictAlone(renderFundamentalVerdict([loose(1)], { ply, seen: new Set(), replySan: null }));
      expect(text).toMatch(/f6/);
      expect(text).not.toMatch(/hang|undefended|free material/i);
    });
  }
  it('the missed version says "open to", not "hanging to"', () => {
    const text = verdictAlone(renderFundamentalVerdict([loose(1)], { ply: 1, seen: new Set(), replySan: 'Nc3' }));
    expect(text).not.toMatch(/hanging/);
  });
  it('an unguarded piece still hangs', () => {
    const texts = [1, 2, 3].map((ply) => verdictAlone(renderFundamentalVerdict([loose(0)], { ply, seen: new Set(), replySan: null })));
    expect(texts.some((t) => /hang|undefended|free/i.test(t))).toBe(true);
  });
});
