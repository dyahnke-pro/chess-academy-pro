/**
 * HOW TO SPOT IT, MEASURED ON THE STUDENT'S OWN PUZZLES. Reads every mistake
 * puzzle in the data drop and reports, per motif, how many got a cue the
 * board showed, how many a habit, and which cues were said — so a cue that
 * never reaches anyone, or a motif that only ever gets its habit, is a number.
 *
 *   SPOT_MEASURE=1 [SPOT_FIXTURE=<drop.json>] npx vitest run src/services/spotCue.measure.test.ts
 *
 * Writes audit-reports/spot-cues-reach.json.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { MOTIF_OF_TACTIC } from '../data/tacticMotifs';
import { pickSpotCue } from './spotCue';
import type { TacticType } from '../types';

const FIXTURE = process.env.SPOT_FIXTURE ?? 'audit-reports/.fixtures/data-drop-david.json';
const RUN = process.env.SPOT_MEASURE === '1' && existsSync(FIXTURE);

describe.skipIf(!RUN)('spot cues on the student\'s own puzzles', () => {
  it('reports board cues against habits, per motif', () => {
    const drop = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { stores: { mistakePuzzles: Array<{ fen: string; moves: string; tacticType?: TacticType | null }> } };
    const rows = drop.stores.mistakePuzzles;
    let named = 0;
    const per: Record<string, { puzzles: number; board: number; habit: number; cues: Record<string, number> }> = {};
    for (const p of rows) {
      const m = p.tacticType ? MOTIF_OF_TACTIC[p.tacticType] : null;
      if (!m) continue;
      named += 1;
      const c = pickSpotCue(m, 'yours', { fen: p.fen, line: p.moves.split(' ').filter(Boolean) });
      const r = (per[m] ??= { puzzles: 0, board: 0, habit: 0, cues: {} });
      r.puzzles += 1;
      if (!c) continue;
      r[c.read] += 1;
      r.cues[c.when] = (r.cues[c.when] ?? 0) + 1;
    }
    const report = { puzzles: rows.length, withMotif: named, perMotif: per };
    writeFileSync('audit-reports/spot-cues-reach.json', `${JSON.stringify(report, null, 1)}\n`);
    console.log(`puzzles ${rows.length} · with a named motif ${named}`);
    for (const [m, r] of Object.entries(per).sort((a, b) => b[1].puzzles - a[1].puzzles)) {
      console.log(`${m.padEnd(20)} ${String(r.puzzles).padStart(5)} · board ${r.board} · habit ${r.habit} · ${Object.entries(r.cues).sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ${n}`).join(', ')}`);
    }
    expect(rows.length).toBeGreaterThan(0);
  });
});
