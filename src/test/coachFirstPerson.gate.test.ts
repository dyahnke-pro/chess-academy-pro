/**
 * 🔒 THE COACH NEVER SAYS "I" (RULEBOOK V1/V2, David 2026-10-07: the coach
 * never talks about itself).
 *
 * The all-screens walk (2026-10-09) heard "I can't read the mistakes you make
 * yet … I'll break down exactly what to drill" on every coach screen. A count
 * found ~160 string literals in coach and service code written in the coach's
 * first person. Some are prompts or a student's own words a parser matches,
 * so this is a per-file baseline that may only SHRINK: a NEW first-person line
 * fails here, and every site cleaned lowers its file's number.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import baseline from './coachFirstPerson.baseline.json';

const FIRST_PERSON = /(?:^|[^A-Za-z'])(?:I|I'm|I'll|I've|I'd)(?![A-Za-z'])/;
const ROOTS = ['src/coach', 'src/services'];

export function countFirstPersonLines(text: string): number {
  let n = 0;
  for (const l of text.split('\n')) {
    const t = l.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
    const lits = l.match(/`[^`]*`|'[^'\n]*'|"[^"\n]*"/g) ?? [];
    if (lits.some((x) => FIRST_PERSON.test(x.slice(1, -1)))) n += 1;
  }
  return n;
}

function scan(): Record<string, number> {
  const out: Record<string, number> = {};
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) {
        const n = countFirstPersonLines(fs.readFileSync(p, 'utf8'));
        if (n > 0) out[p.split(path.sep).join('/')] = n;
      }
    }
  };
  for (const r of ROOTS) if (fs.existsSync(r)) walk(r);
  return out;
}

describe('the coach never says "I"', () => {
  it('the scanner sees a first-person line (non-vacuous)', () => {
    expect(countFirstPersonLines("return `I can't read ${topic} yet.`;")).toBe(1);
    expect(countFirstPersonLines("return `There is nothing to read ${topic} from yet.`;")).toBe(0);
    expect(countFirstPersonLines('// I explain it here — a comment')).toBe(0);
  });

  it('no file has more first-person lines than its baseline', () => {
    const now = scan();
    const base = baseline as Record<string, number>;
    const grew = Object.entries(now)
      .filter(([f, n]) => n > (base[f] ?? 0))
      .map(([f, n]) => `${f}: ${n} (baseline ${base[f] ?? 0})`);
    expect(grew, `the coach talks about itself — say the fact, not "I":\n  ${grew.join('\n  ')}`).toEqual([]);
  });

  it('the baseline only shrinks — lower it when a site is cleaned', () => {
    const now = scan();
    const stale = Object.entries(baseline as Record<string, number>)
      .filter(([f, n]) => (now[f] ?? 0) < n)
      .map(([f, n]) => `${f}: ${now[f] ?? 0} (baseline ${n})`);
    expect(stale, 'lower these in coachFirstPerson.baseline.json').toEqual([]);
  });
});
