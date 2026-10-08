// Gate: middlegame-plan text is spoken (Watch reads the annotations, the
// Master header reads title + overview), so it follows the voice rules:
// evals in words, never numbers (V8); no percentages, ratings or game
// counts; and a side is "they", never "he/his/him" (V2).
import { describe, expect, it } from 'vitest';
import plansRaw from './middlegame-plans.json';

interface Line { title?: string; intro?: string; annotations?: string[]; learnCues?: string[] }
interface Plan { id: string; title?: string; overview?: string; playableLines?: Line[] }

const RULES: Array<[string, RegExp]> = [
  ['engine number', /[+−-]\d+\.\d/],
  ['percentage', /\d+(?:\.\d+)?%/],
  ['rating', /\(vs [^)]*\b\d{4}\)|\b\d{4}[- ]rated\b/],
  ['spoken eval', /\b(?:plus|minus) (?:zero|one|two|three|four|five) point\b|\b(?:tenth|fifth|quarter|third|half)(?: of a |-)pawn\b/i],
  ['game count', /\b\d+ (?:wins|losses|games)\b|\bcorpus\b/i],
  ['gendered side', /\b(?:he|his|him|himself)\b/i],
];

export function spokenProblems(text: string): string[] {
  return RULES.filter(([, re]) => re.test(text)).map(([name]) => name);
}

describe('plan text follows the voice rules', () => {
  it('no engine numbers, stats, ratings or he/his in spoken plan text', () => {
    const rows: string[] = [];
    for (const plan of plansRaw as unknown as Plan[]) {
      const fields: Array<[string, string | undefined]> = [['title', plan.title], ['overview', plan.overview]];
      (plan.playableLines ?? []).forEach((l, li) => {
        fields.push([`L${li}.title`, l.title], [`L${li}.intro`, l.intro]);
        (l.annotations ?? []).forEach((a, i) => fields.push([`L${li}.ann${i}`, a]));
        (l.learnCues ?? []).forEach((a, i) => fields.push([`L${li}.cue${i}`, a]));
      });
      for (const [k, v] of fields) {
        if (!v) continue;
        const bad = spokenProblems(v);
        if (bad.length) rows.push(`${plan.id} ${k} [${bad.join(', ')}]: ${v.slice(0, 120)}`);
      }
    }
    expect(rows).toEqual([]);
  });

  it('flags each banned form (negative control)', () => {
    expect(spokenProblems('White is +1.4 here')).toContain('engine number');
    expect(spokenProblems('wins 53% of games')).toContain('percentage');
    expect(spokenProblems('(vs Shankland 2934)')).toContain('rating');
    expect(spokenProblems('a fifth of a pawn to White')).toContain('spoken eval');
    expect(spokenProblems('seventeen wins in his corpus')).toEqual(expect.arrayContaining(['game count', 'gendered side']));
    expect(spokenProblems('White keeps a small edge')).toEqual([]);
  });
});
