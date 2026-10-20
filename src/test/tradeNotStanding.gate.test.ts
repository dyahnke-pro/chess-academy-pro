// THE TRADE, NEVER A STANDING (OS-11 2026-10-20). A line's material result is
// what changed hands in that line ("a rook for a knight", "the exchange"), so it
// is said as "win/lose <what>". Framed as "come out <what> up" it read as the
// student's overall standing (21.Rg5: "ahead on material" while still lost) and
// turned ungrammatical on a two-sided net ("they come out a rook for a knight up").
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

describe('a line\'s material result is said as a trade', () => {
  it('no template frames a line\'s result as "come out <what> up/down"', () => {
    const offenders = sources('src').filter((f) => /\bout \$\{[^}]*\.what\}\s*(?:up|down|ahead|behind)\b/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
