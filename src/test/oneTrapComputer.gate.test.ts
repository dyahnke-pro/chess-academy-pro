// ONE TRAP COMPUTER: whether a slip is a trap, a known mistake or nothing is
// decided in services/trapComputer.ts against the bar in data/trap-bar.json.
// A gate is a backup; the door is `classifySlip`. This fails on a second place
// that holds its own trap bar.
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
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('oneTrapComputer', () => {
  const src = files('src');
  it('the bar value is read from trap-bar.json by the computer alone', () => {
    const offenders = src.filter((f) => !f.endsWith('trapComputer.ts') && /trap-bar\.json/.test(strip(readFileSync(f, 'utf8'))));
    expect(offenders).toEqual([]);
  });
  it('no file compares an engine read to the trap bar except through classifySlip', () => {
    const offenders = src.filter((f) => !f.endsWith('trapComputer.ts') && /TRAP_BAR_CP\s*[<>]=?|[<>]=?\s*TRAP_BAR_CP/.test(strip(readFileSync(f, 'utf8'))));
    expect(offenders).toEqual([]);
  });
  it('the weapon-gem door asks the computer', () => {
    expect(strip(readFileSync('src/data/lessons/punishGems.ts', 'utf8'))).toMatch(/classifySlip\(/);
  });
});
