// GATE: trap weapons must not BACKFIRE and warning anti-traps must not be
// outright TOOTHLESS, per the engine. We deliberately flag only the unambiguous
// INVERSION — a `trapLines` weapon that leaves the student clearly WORSE, or a
// `warningLines` anti-trap that leaves the student clearly BETTER. We do NOT
// hard-gate the near-equal band: most curated traps win a POSITIONAL edge
// (bishop pair, doubled pawns, an outpost, a tempo) that a depth-14 engine reads
// as ≈0.00 — gating those at a material +0.5 bar cried wolf on ~45 correct,
// engine-verified Naroditsky traps (the 2026-06-29 re-eval finding). Illegal /
// uneval'd lines still hard-fail. New violations fail; backlog shrinks only.
import { describe, it, expect } from 'vitest';
import { loadItems, toCp, loadBaseline, maybeWriteBaseline } from './grounding/groundingLib';

const TRAP_INVERTED = -50; // a "weapon" that leaves the student ≤ −0.5 is backfiring
const WARN_INVERTED = 50;  // an "anti-trap" that leaves the student ≥ +0.5 is toothless

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
      if (it.cat === 'trap' && cp <= TRAP_INVERTED) {
        const k = `${key} :: TRAP-BACKFIRES`; viol.push(k); detail[k] = `student ${(cp / 100).toFixed(2)}`;
      }
      if (it.cat === 'warning' && cp >= WARN_INVERTED) {
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
