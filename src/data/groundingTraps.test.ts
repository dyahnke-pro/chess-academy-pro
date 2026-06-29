// GATE: trap weapons must actually WORK and warning anti-traps must actually
// PUNISH, per the engine. A `trapLines` entry (student's weapon) must end with
// the student clearly better; a `warningLines` entry (student fell into it) must
// end with the student clearly worse. Catches inverted/toothless traps the
// curator mislabeled. New violations fail; backlog grandfathered, shrinks only.
import { describe, it, expect } from 'vitest';
import { loadItems, toCp, loadBaseline, maybeWriteBaseline } from './grounding/groundingLib';

const TRAP_EDGE = 50;   // a weapon must leave the student ≥ +0.5
const WARN_EDGE = -50;  // an anti-trap must leave the student ≤ −0.5

describe('grounding gate: traps work, warnings punish', () => {
  const { items } = loadItems(['trap', 'warning']);

  it('has the grounding data built', () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it('trap weapons end better for the student; warnings end worse', () => {
    const viol: string[] = [];
    const detail: Record<string, string> = {};
    for (const it of items) {
      const key = `${it.name}`;
      if (!it.terminalFen) { viol.push(`${key} :: ILLEGAL`); continue; }
      if (!it.eval) { viol.push(`${key} :: UNEVALUATED`); continue; }
      const cp = toCp(it.eval, it.color);
      if (cp == null) { viol.push(`${key} :: UNEVALUATED`); continue; }
      if (it.cat === 'trap' && cp < TRAP_EDGE) {
        const k = `${key} :: TRAP-FAILS`; viol.push(k); detail[k] = `student ${(cp / 100).toFixed(2)}`;
      }
      if (it.cat === 'warning' && cp > WARN_EDGE) {
        const k = `${key} :: TOOTHLESS-WARNING`; viol.push(k); detail[k] = `student ${(cp / 100).toFixed(2)}`;
      }
    }
    if (maybeWriteBaseline('groundingTraps', viol)) return;
    const baseline = loadBaseline('groundingTraps');
    const fresh = viol.filter((v) => !baseline.has(v));
    expect(
      fresh,
      `NEW trap/warning grounding violations:\n` +
        fresh.map((v) => `  ${v}${detail[v] ? ` (${detail[v]})` : ''}`).join('\n'),
    ).toEqual([]);
  });
});
