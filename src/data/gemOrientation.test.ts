// Gate: a punish-gem's slip is the OPPONENT's move (2026-10-08). The QGA gem
// filed the Black student's own …Nc6 as "the opponent's slip" and taught
// White's punishment on a Black lesson. The side that plays the inaccuracy
// must be the side opposite the opening's colour, for every shipped gem.
import { describe, it, expect } from 'vitest';
import { ALL_GEMS } from './lessons/punishGems';
import repertoire from './repertoire.json';
import pro from './pro-repertoires.json';
import gambits from './gambits.json';

interface Coloured { id: string; color?: string }
const colourOf = new Map<string, string>();
for (const o of [...(repertoire as Coloured[]), ...((pro as { openings: Coloured[] }).openings), ...(gambits as Coloured[])]) {
  if (o.color) colourOf.set(o.id, o.color);
}

describe('punish-gem orientation', () => {
  it('every gem slip is played by the opponent of the student', () => {
    const wrong: string[] = [];
    for (const g of ALL_GEMS) {
      const colour = colourOf.get(g.openingId);
      if (!colour) continue;
      const mover = g.lineMoves.trim().split(/\s+/).length % 2 === 0 ? 'white' : 'black';
      if (mover === colour) wrong.push(`${g.openingId}: ${g.lineMoves} ${g.inaccuracy}`);
    }
    expect(wrong).toEqual([]);
  });
  it('knows the colour of most gem openings (non-vacuous)', () => {
    const known = ALL_GEMS.filter((g) => colourOf.has(g.openingId)).length;
    expect(known).toBeGreaterThan(ALL_GEMS.length * 0.9);
  });
});
