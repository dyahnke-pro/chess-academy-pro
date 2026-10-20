// ONE COST-WORDS TABLE (OS-11 item 6, 2026-10-20). A cost is said in points,
// from `engineConstants.costWords`; a second ladder (autoAnalyzeGame's
// "loses about a pawn" / "drops a piece's worth of advantage") drifted from
// it. Any centipawn ladder that returns its own cost wording fails here.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'data') out.push(...sources(p)); }
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

// `if (pawns >= 0.8) return 'loses about a pawn';` — a threshold on a cost
// returning a cost phrase.
const LADDER = /(?:cp|pawns|loss|gap|cost)\w*\s*>=?\s*[\d.]+\)\s*return\s*['"][^'"]*\b(?:loses|drops|gives (?:away|up)|costs?)\b[^'"]*\b(?:pawn|point|worth)/i;

describe('a cost is worded by one table', () => {
  it('no centipawn ladder outside costWords returns cost words', () => {
    const offenders = sources('src')
      .filter((f) => !f.endsWith('engineConstants.ts'))
      .filter((f) => readFileSync(f, 'utf8').split('\n').some((l) => LADDER.test(l)));
    expect(offenders).toEqual([]);
  });
});
