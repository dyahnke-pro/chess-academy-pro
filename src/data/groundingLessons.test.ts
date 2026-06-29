// GATE: every lesson SUBLINE — the deep beat-by-beat Watch/Learn tails in
// src/data/lessons/*.ts (2,700+ move-lines, the highest-risk LLM-authored
// content, where the Vienna g12 bug lived) — must be LEGAL and leave the student
// NOT LOSING at its terminal, per the engine (Stockfish 18, evaluated offline
// into grounding-items.json). Gambit/sacrifice showcases are exempt from the
// eval floor. We flag only the depth-robust extremes (illegal / clearly losing);
// the positional band the engine underrates at depth 14 is NOT hard-gated — the
// same discipline the 2026-06-29 re-eval forced across the line/trap/gem gates.
// New violations fail; the backlog is grandfathered and may only SHRINK.
import { describe, it, expect } from 'vitest';
import { loadItems, toCp, loadBaseline, maybeWriteBaseline } from './grounding/groundingLib';

const LOSING_CP = -150; // student worse than -1.5 at a lesson terminal → teaching a losing line

describe('grounding gate: lesson sublines are sound for the student', () => {
  const { items } = loadItems('lesson');

  it('has the grounding data built (run scripts/ci/build-grounding.cjs)', () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it('every lesson subline is legal + not losing for the student at its terminal', () => {
    const viol: string[] = [];
    const detail: Record<string, string> = {};
    for (const it of items) {
      const key = `${it.name}`;
      if (!it.terminalFen) { viol.push(`${key} :: ILLEGAL`); continue; }
      if (!it.eval) { viol.push(`${key} :: UNEVALUATED`); continue; }
      if (it.isGambit) continue;
      const cp = toCp(it.eval, it.color);
      if (cp == null) { viol.push(`${key} :: UNEVALUATED`); continue; }
      if (cp <= LOSING_CP) { const k = `${key} :: LOSING`; viol.push(k); detail[k] = `${(cp / 100).toFixed(2)}`; }
    }
    if (maybeWriteBaseline('groundingLessons', viol)) return;
    const baseline = loadBaseline('groundingLessons');
    const fresh = viol.filter((v) => !baseline.has(v));
    expect(
      fresh,
      `NEW lesson-subline grounding violations (not in baseline):\n` +
        fresh.map((v) => `  ${v}${detail[v] ? ` (student ${detail[v]})` : ''}`).join('\n'),
    ).toEqual([]);
  });
});
