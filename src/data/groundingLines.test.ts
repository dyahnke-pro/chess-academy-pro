// GATE: every opening line (repertoire + gambits + pro-rep, main + variations)
// must be LEGAL and leave the student NOT LOSING at its terminal, per the engine
// (Stockfish 18, evaluated offline into grounding-items.json). Gambits/sacrifice
// showcases are exempt from the eval floor (a sacrificed pawn is the point).
// New violations fail the build; the current backlog is grandfathered in
// groundingLines.baseline.json and may only SHRINK.
import { describe, it, expect } from 'vitest';
import { loadItems, toCp, loadBaseline, maybeWriteBaseline } from './grounding/groundingLib';

const LOSING_CP = -150; // student worse than -1.5 → a line that teaches a losing position

describe('grounding gate: opening lines are sound for the student', () => {
  const { items } = loadItems('line');

  it('has the grounding data built (run scripts/ci/build-grounding.cjs)', () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it('every line is legal + sound for the student at its terminal', () => {
    const viol: string[] = [];
    const detail: Record<string, string> = {};
    for (const it of items) {
      const key = `${it.id} :: ${it.name}`;
      if (!it.terminalFen) { viol.push(`${key} :: ILLEGAL`); continue; }
      if (!it.eval) { viol.push(`${key} :: UNEVALUATED`); continue; }
      if (it.isGambit) continue;
      const cp = toCp(it.eval, it.color);
      if (cp == null) { viol.push(`${key} :: UNEVALUATED`); continue; }
      if (cp <= LOSING_CP) { const k = `${key} :: LOSING`; viol.push(k); detail[k] = `${(cp / 100).toFixed(2)}`; }
    }
    if (maybeWriteBaseline('groundingLines', viol)) return;
    const baseline = loadBaseline('groundingLines');
    const fresh = viol.filter((v) => !baseline.has(v));
    expect(
      fresh,
      `NEW opening-line grounding violations (not in baseline):\n` +
        fresh.map((v) => `  ${v}${detail[v] ? ` (student ${detail[v]})` : ''}`).join('\n'),
    ).toEqual([]);
  });
});
