// GATE: a punish-gem (a "weapon" the student plays to punish an opponent
// inaccuracy) must not BACKFIRE — flag only the unambiguous inversion where the
// played line ends with the student clearly WORSE. We do NOT re-impose the
// mine-time +0.5 tier bar here: a `positional` gem mined at +0.5 routinely reads
// ≈+0.3 on a depth-14 re-eval, and gems often end mid-forcing-sequence (a queen
// recapture still pending) where the instantaneous eval lags the real edge
// (the 2026-06-29 re-eval finding — e.g. Caruana KID Qxd1+ read +0.48). The mine
// (engineCp/tier) already enforced the +0.5/+1.0 tiers; this gate catches DRIFT
// to an actual loss. Illegal / uneval'd lines still hard-fail.
import { describe, it, expect } from 'vitest';
import { loadItems, toCp, loadBaseline, maybeWriteBaseline } from './grounding/groundingLib';

const GEM_INVERTED = -50; // a gem whose line leaves the student ≤ −0.5 is backfiring

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
      if (cp <= GEM_INVERTED) { const k = `${key} :: GEM-BACKFIRES`; viol.push(k); detail[k] = `student ${(cp / 100).toFixed(2)}`; }
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
