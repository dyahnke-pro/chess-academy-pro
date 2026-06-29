// GATE: every middlegame-plan playable line (FEN-anchored: criticalPositionFen +
// SAN moves, in middlegame-plans.json) must be LEGAL from its start FEN and leave
// the student NOT LOSING at its terminal, per the engine. Plans are the
// opening→middlegame handoff content; a plan line that walks the student into a
// lost position is the same class of bug as a losing opening tail. Flag only the
// depth-robust extremes (illegal / clearly losing). New violations fail; backlog
// grandfathered, shrinks only.
import { describe, it, expect } from 'vitest';
import { loadItems, toCp, loadBaseline, maybeWriteBaseline } from './grounding/groundingLib';

const LOSING_CP = -150;

describe('grounding gate: middlegame-plan lines are sound for the student', () => {
  const { items } = loadItems('plan');

  it('has the grounding data built', () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it('every plan line is legal + not losing for the student at its terminal', () => {
    const viol: string[] = [];
    const detail: Record<string, string> = {};
    for (const it of items) {
      const key = `${it.name}`;
      if (!it.terminalFen) { viol.push(`${key} :: ILLEGAL`); continue; }
      if (!it.eval) { viol.push(`${key} :: UNEVALUATED`); continue; }
      const cp = toCp(it.eval, it.color);
      if (cp == null) { viol.push(`${key} :: UNEVALUATED`); continue; }
      if (cp <= LOSING_CP) { const k = `${key} :: LOSING`; viol.push(k); detail[k] = (cp / 100).toFixed(2); }
    }
    if (maybeWriteBaseline('groundingPlans', viol)) return;
    const baseline = loadBaseline('groundingPlans');
    const fresh = viol.filter((v) => !baseline.has(v));
    expect(
      fresh,
      `NEW middlegame-plan grounding violations (not in baseline):\n` +
        fresh.map((v) => `  ${v}${detail[v] ? ` (student ${detail[v]})` : ''}`).join('\n'),
    ).toEqual([]);
  });
});
