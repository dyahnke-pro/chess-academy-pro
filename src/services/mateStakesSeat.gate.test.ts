// A mate stake is never seat-less (2026-10-13): every mate fact is built by
// `mateStakes(side, plies, forced)`, so the Learn door can tell "you have mate"
// from "they threaten mate". A literal `points: MATE_POINTS` outside
// factStakes would ship a mate with no seat.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)) out.push(p);
  }
  return out;
}

describe('mate stakes carry their seat', () => {
  it('no literal MATE_POINTS stake outside factStakes', () => {
    const bad = walk('src').filter((p) => !p.endsWith('factStakes.ts'))
      .filter((p) => /points:\s*MATE_POINTS/.test(readFileSync(p, 'utf8')));
    expect(bad).toEqual([]);
  });

  it('positive control: the pattern is found where it lives', () => {
    expect(readFileSync('src/services/factStakes.ts', 'utf8')).toMatch(/points:\s*MATE_POINTS/);
  });
});
