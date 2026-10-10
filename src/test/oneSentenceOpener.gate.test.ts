/**
 * ONE SENTENCE OPENER. A coach line that starts with a move ("b4, Nxe4,
 * bxa5…") must not be capitalised into "B4" — that reads as a bishop. Sixty
 * hand-written `s[0].toUpperCase() + s.slice(1)` copies each got this wrong
 * on their own; `openSentence` is the one capitaliser that keeps notation
 * lower-case. Its twin `continueSentence` lowers a plain leading word after a
 * colon and leaves a move alone ("nxe4 wins" was the same disease, the other
 * way). New coach prose calls them; a hand copy fails here.
 *
 * The three sites allowed are NORMALISERS, not sentences: they rebuild a
 * typed SAN token or a language name (Title-case then lower the rest), which
 * is a different job and must stay as written.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/services', 'src/coach'];
const HAND_CAP = /(?:charAt\(0\)|\[0\])\.to(?:Upper|Lower)Case\(\)(?:\s*\+|\}\$\{)/;
const NORMALISERS = new Set([
  'src/services/openingDetectionService.ts',
  'src/coach/chatTurnParser.ts',
  'src/coach/questionIntents.ts',
]);

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('one sentence opener', () => {
  it('coach prose capitalises through openSentence, never a hand copy', () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const file of walk(root, [])) {
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (!HAND_CAP.test(line)) return;
          if (NORMALISERS.has(file) && /\.toLowerCase\(\)/.test(line)) return;
          offenders.push(`${file}:${i + 1}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
