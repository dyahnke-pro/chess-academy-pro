// ONE TRAP WORDING: the phrases that call a slip a trap live in trapWords.ts.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\./.test(f)) out.push(p);
  }
  return out;
}
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('oneTrapWording', () => {
  it('no file but trapWords.ts hand-writes the trap phrases', () => {
    const phrase = /known trap|A trap for them|Their known mistakes?'|at club level\. /;
    const offenders = files('src').filter((f) => !f.endsWith('trapWords.ts') && phrase.test(strip(readFileSync(f, 'utf8'))));
    expect(offenders).toEqual([]);
  });
});
