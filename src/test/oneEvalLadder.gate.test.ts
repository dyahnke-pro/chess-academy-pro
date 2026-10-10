/**
 * ONE EVAL LADDER (census 2026-10-10; David: "1 eval wording is fine"). Eleven
 * functions held their own cp thresholds for "better / winning / level", so
 * +1.2 read "clearly better" on one screen and "slightly better" on another,
 * and one called −2.8 "slightly worse". The band lives in `evalBand` now;
 * surfaces keep their own words but read the band from there.
 *
 * The shape of a private ladder — a cp threshold beside a verdict word — is
 * counted, and the count only shrinks. The three left are not ladders: a
 * popularity label (`linePickerPopularity`) and the two material tiers inside
 * the winning band in the model's prompt context (`envelope`).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CEILING = 3;

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const THRESHOLD = /[<>]=?\s*-?\d{2,3}\b/;
const SUBJECT = /\b(cp|Cp|eval|Eval|a|abs|mag|pawns|studentCp|evalCp)\b/;
const VERDICT = /['`"][^'`"]*\b(slightly|clearly|a bit|a touch) (better|worse)|['`"][^'`"]*\b(roughly (equal|balanced)|is winning|you're winning|level)\b/;

describe('one eval ladder', () => {
  it('no new private cp → verdict ladder', () => {
    const hits: string[] = [];
    for (const f of walk('src', [])) {
      if (f.endsWith('evalBand.ts')) continue;
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((l, i) => {
        if (!THRESHOLD.test(l) || !SUBJECT.test(l)) return;
        if (VERDICT.test(lines.slice(Math.max(0, i - 1), i + 3).join('\n'))) hits.push(`${f}:${i + 1}`);
      });
    }
    expect(hits.length, hits.join('\n')).toBeLessThanOrEqual(CEILING);
  });
});
