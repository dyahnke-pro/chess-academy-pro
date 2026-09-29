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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { moveIntent, type IntentReads, type IntentOptions, type MoveIntent } from './moveIntent';
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
  it('names what HE names, per variant', () => {
    const ms = JSON.parse(readFileSync(SRC, 'utf8')) as Moment[];
    const readsOf = (m: Moment): IntentReads => ({ before: lines(m.before), after: lines(m.after), passBefore: lines(m.passBefore), passAfter: lines(m.passAfter) });
    // "Names what he names": a square or move we name appears in his line.
    const squaresOf = (o: MoveIntent): string[] => [o.prevents?.uci.slice(2, 4), o.prepares?.uci.slice(2, 4)].filter((x): x is string => !!x);
    const agrees = (o: MoveIntent, his: string): boolean => squaresOf(o).some((sq) => his.includes(sq))
      || [o.prevents?.san, o.prepares?.san].some((sn) => !!sn && his.includes(sn.replace(/[+#x]/g, '').slice(-3)));
    const VARIANTS: IntentOptions[] = [
      { prepare: 'pass', prevent: 'any' }, { prepare: 'pass', prevent: 'concrete' },
      { prepare: 'line', prevent: 'any' }, { prepare: 'line', prevent: 'concrete' },
    ];
    const dump: Record<string, Record<string, { text: string | null; agrees: boolean }>> = {};
    for (const v of VARIANTS) {
      const res = ms.map((m) => ({ m, out: moveIntent(m.fenBefore, m.san, readsOf(m), 'student', v) }));
      const vk = `${v.prepare}/${v.prevent}`;
      for (const r of res) {
        const key = `${r.m.game}:${r.m.ply}`;
        (dump[key] ??= {})[vk] = { text: r.out?.text ?? null, agrees: !!r.out && agrees(r.out, r.m.his ?? '') };
      }
      const t = res.filter((r) => r.m.target && r.out); const tAll = res.filter((r) => r.m.target);
      const c = res.filter((r) => !r.m.target);
      const ag = t.filter((r) => agrees(r.out as MoveIntent, r.m.his ?? '')).length;
      console.log(`[intent] ${v.prepare}/${v.prevent}: fires on his ${t.length}/${tAll.length}, agrees ${ag} (${Math.round(100 * ag / Math.max(1, t.length))}% of fires) · control fires ${c.filter((r) => r.out).length}/${c.length}`);
      if (v.prepare === 'line' && v.prevent === 'concrete') {
        for (const r of t.slice(0, 40)) console.log(`${agrees(r.out as MoveIntent, r.m.his ?? '') ? '✓' : '✗'} ${r.m.game}:${r.m.ply} ${r.m.san} | ${r.out?.text} || ${(r.m.his ?? '').slice(0, 120)}`);
      }
    }
    if (process.env.MOVE_INTENT_DUMP) writeFileSync(process.env.MOVE_INTENT_DUMP, JSON.stringify(dump));
    expect(ms.length).toBeGreaterThan(20);
  }, 120_000);
});
