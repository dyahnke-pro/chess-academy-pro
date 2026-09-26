import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderFundamentalVerdict } from './principleVoice';
import { FUNDAMENTAL_IDS, FUNDAMENTAL_TAG } from './principleAttribution';
import type { PrincipleAttribution } from './principleAttribution';

/**
 * 🔒 THE AUDIT'S FUND_RE MUST SEE EVERY FUNDAMENTAL IT GRADES.
 *
 * `audit-review-overhaul-prod.mjs`'s FUNDLEAD row decides "did this ply lead
 * with a fundamental" by matching the spoken lead against a hand-listed set of
 * phrasings. On 2026-09-21 that list covered only the ORIGINAL fundamentals, so
 * a ply leading with a section-14 verdict scored as "no fundamental" — the row
 * reported 0/4 on a run where ply 48 had led with "The move looks fine for two
 * moves — then bxc6 lands." It under-reported the product AND the fix under
 * test, which reads as "the change did nothing".
 *
 * Adding the missing stems by hand fixes today and rots tomorrow: the next
 * fundamental, or a reworded one, shrinks the row's vision silently and in the
 * same direction. So this gate DERIVES the check — it renders every
 * `FundamentalId` through the REAL renderer and asserts the REAL regex, read
 * out of the audit file, matches it. Neither side can drift without failing
 * here.
 *
 * Facts are REALISTIC, not empty. A first cut passed `{}` and reported 13
 * misses — including `same-piece-twice`, which the regex does cover: with no
 * facts it renders "the same undefined for the NaNth time" and fails a pattern
 * ("same (knight|bishop|…)") it matches perfectly in production. That is this
 * gate committing the very error it exists to catch, so the fact bag below
 * covers every `${f.*}` key the renderers use.
 */
// NB `nth` is fed through `nth(Number(f.nth))`, not interpolated directly, so
// it does not appear in a `${f.*}` grep — omitting it rendered "its NaNth trip"
// and produced two FALSE misses. A fixture that cannot render the real sentence
// cannot test whether the real sentence is recognised.
const FACTS: Record<string, string | number> = {
  better: 'Nf3', bishop: 'dark-squared bishop', blocker: 'Nd4', book: 'e5', cost: 2,
  depth: 5, drop: 3, file: 'd', homeMinors: 'two', kick: 'h6', kind: 'knight',
  king: 'e1', move: 'Qh5', opening: 'Caro-Kann', pawn: 'd4', pawns: 'c5 and e5',
  piece: 'knight', plan: 'seize the d-file', played: 'Nf6', punish: 'Bxf7+', nth: 3,
  push: 'b5', reason: 'the centre is open', rook: 'Rd1', square: 'd5', target: 'f7',
};
function fundRe(): RegExp {
  const src = readFileSync(join(process.cwd(), 'scripts/audit-review-overhaul-prod.mjs'), 'utf8');
  const m = src.match(/const FUND_RE = (\/.*\/[a-z]*);/);
  if (!m) throw new Error('FUND_RE not found in audit-review-overhaul-prod.mjs — did it move or get renamed?');
  const body = m[1].slice(1, m[1].lastIndexOf('/'));
  const flags = m[1].slice(m[1].lastIndexOf('/') + 1);
  return new RegExp(body, flags);
}

function render(id: (typeof FUNDAMENTAL_IDS)[number], ply: number): string {
  const attr = {
    id, tag: FUNDAMENTAL_TAG[id], weight: 3, coOccurrence: false,
    evidence: { squares: ['d5'], moves: ['Nf3'], pvMoves: ['Nf3'] }, facts: FACTS,
  } as unknown as PrincipleAttribution;
  return renderFundamentalVerdict([attr], { replySan: null, ply, seen: new Set() });
}

describe('FUNDLEAD stems cover every fundamental', () => {
  it('is reading a real regex out of the audit', () => {
    // Non-vacuous: a regex that matched everything, or nothing, would make the
    // sweep below meaningless in one direction or the other.
    const re = fundRe();
    expect(re.test('The move looks fine for two moves — then bxc6 lands.')).toBe(true);
    expect(re.test('You: that was an inaccuracy, costing about 0.9 points — the')).toBe(false);
  });

  it('every FundamentalId renders a lead the audit can recognise', () => {
    const re = fundRe();
    const missed: string[] = [];
    for (const id of FUNDAMENTAL_IDS) {
      // Stems rotate on the ply, so check every rotation — a stem set that
      // matches one phrasing and misses its siblings is the same blindness,
      // just rarer and therefore harder to catch.
      // EVERY rotation, not just one. The coach rotates stems on the ply, so a
      // stem set that matches one phrasing and misses its siblings is the same
      // blindness — just rarer, and therefore harder to catch.
      const variants = [...new Set([0, 1, 2, 3, 4].map((p) => render(id, p)))];
      for (const v of variants) {
        if (!re.test(v)) missed.push(`${id} → "${v.slice(0, 90)}"`);
      }
    }
    expect(
      missed,
      `${missed.length} fundamental(s) render a lead FUND_RE cannot see, so FUNDLEAD will score them as ` +
        `"no fundamental" and silently under-report the coach:\n  • ${missed.join('\n  • ')}`,
    ).toEqual([]);
  });
});
