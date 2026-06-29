// GATE: every punish-gem (a "weapon" the student plays to punish an opponent
// inaccuracy) must still leave the student clearly better at the end of its
// played line, per a fresh engine eval — not just the engineCp stored at mine
// time. Catches gems whose line drifted or whose stored eval was overstated.
// New violations fail; backlog grandfathered, shrinks only.
import { describe, it, expect } from 'vitest';
import { loadItems, toCp, loadBaseline, maybeWriteBaseline } from './grounding/groundingLib';

const GEM_EDGE = 50; // a surfaced weapon must leave the student ≥ +0.5 at the line's end

describe('grounding gate: punish-gems still win', () => {
  const { items } = loadItems('gem');

  it('has the grounding data built', () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it('every gem line ends with a real student edge', () => {
    const viol: string[] = [];
    const detail: Record<string, string> = {};
    for (const it of items) {
      const key = `${it.name}`;
      if (!it.terminalFen) { viol.push(`${key} :: ILLEGAL`); continue; }
      if (!it.eval) { viol.push(`${key} :: UNEVALUATED`); continue; }
      const cp = toCp(it.eval, it.color);
      if (cp == null) { viol.push(`${key} :: UNEVALUATED`); continue; }
      if (cp < GEM_EDGE) { const k = `${key} :: GEM-WEAK`; viol.push(k); detail[k] = `student ${(cp / 100).toFixed(2)}`; }
    }
    if (maybeWriteBaseline('groundingGems', viol)) return;
    const baseline = loadBaseline('groundingGems');
    const fresh = viol.filter((v) => !baseline.has(v));
    expect(
      fresh,
      `NEW gem grounding violations:\n` +
        fresh.map((v) => `  ${v}${detail[v] ? ` (${detail[v]})` : ''}`).join('\n'),
    ).toEqual([]);
  });
});
