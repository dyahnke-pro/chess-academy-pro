// MOVE INTENT — measured against Naroditsky's own "what is it for" moments.
//
// Reads `data/sources/acc-naro/intent-reads.json` (built by
// `scripts/scoreboard/intent-probe.mjs`: his purpose / prevention / two-jobs
// moments on the student's moves, plus an 8% control sample of moments where
// he says nothing of the kind). Reports how often the computer fires on his
// moments against the control, and prints each line beside his for reading.
//
// Not a gate. Skips unless the reads exist and MOVE_INTENT=1.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { moveIntent, type IntentReads } from './moveIntent';
import type { AnalysisLine } from '../types';

interface Raw { cp: number | null; mate: number | null; pv: string[] }
interface Moment {
  game: string; ply: number; fenBefore: string; san: string;
  before: Raw[]; after: Raw[]; passBefore: Raw[]; passAfter: Raw[];
  his: string | null; codes: string[]; target: boolean;
}

const SRC = 'data/sources/acc-naro/intent-reads.json';
const HAVE = existsSync(SRC) && process.env.MOVE_INTENT === '1';

const lines = (r: Raw[]): AnalysisLine[] => r.map((l, i) => ({ rank: i + 1, evaluation: l.cp ?? 0, moves: l.pv, mate: l.mate }));

describe.skipIf(!HAVE)('moveIntent on his moments', () => {
  it('fires on his purpose moments far more than on the control', () => {
    const ms = JSON.parse(readFileSync(SRC, 'utf8')) as Moment[];
    const res = ms.map((m) => {
      const reads: IntentReads = { before: lines(m.before), after: lines(m.after), passBefore: lines(m.passBefore), passAfter: lines(m.passAfter) };
      return { m, out: moveIntent(m.fenBefore, m.san, reads, 'student') };
    });
    const t = res.filter((r) => r.m.target); const c = res.filter((r) => !r.m.target);
    const rate = (xs: typeof res): number => xs.filter((r) => r.out).length / Math.max(1, xs.length);
    const prevOn = (xs: typeof res, code: string): string => {
      const ys = xs.filter((r) => r.m.codes.includes(code));
      return `${ys.filter((r) => r.out?.prevents).length}/${ys.length} prevents, ${ys.filter((r) => r.out?.prepares).length}/${ys.length} prepares`;
    };
    console.log(`[intent] target ${t.length}: fires ${(100 * rate(t)).toFixed(0)}% · control ${c.length}: fires ${(100 * rate(c)).toFixed(0)}%`);
    console.log(`[intent] his PREVENT moments: ${prevOn(t, 'M-PURPOSE-PREVENT')}`);
    console.log(`[intent] his QUIET-PURPOSE moments: ${prevOn(t, 'M-PURPOSE-QUIET')}`);
    for (const r of res.filter((x) => x.m.target).slice(0, 60)) {
      console.log(`\n${r.m.game}:${r.m.ply} ${r.m.san}\n  HIM: ${r.m.his}\n  US:  ${r.out?.text ?? '—'}`);
    }
    for (const r of res.filter((x) => !x.m.target && x.out).slice(0, 25)) {
      console.log(`\n[control] ${r.m.game}:${r.m.ply} ${r.m.san}\n  HIM: ${r.m.his ?? '(silent)'}\n  US:  ${r.out?.text}`);
    }
    expect(res.length).toBeGreaterThan(20);
  }, 120_000);
});
