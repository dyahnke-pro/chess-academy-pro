// THE SHIPPED CORPUS MUST MATCH ITS OWN TYPE.
//
// `DanyaNote.teaches` and `.plans` are declared `string`. The voiced generator
// wrote `m.teaches || ''` straight through, and the source bank writes EITHER a
// string or a LIST — so 691 `teaches` and 26 `plans` shipped as ARRAYS against
// a type that says otherwise.
//
// 🚨 IT FAILED SILENTLY, WHICH IS WHY IT SURVIVED. `teachingBeatText` does
// `(part ?? '').trim()` and threw `TypeError: .trim is not a function` on all
// 694 — and BOTH callers wrap it in a "the corpus is a bonus, never a blocker"
// catch. So the entire teaching line simply vanished from the facts package
// whenever one of those notes was selected, with nothing red anywhere. Five
// other readers interpolate the field into a template string instead, turning
// a list into comma-jammed prose ("the French central tension,the d4 break").
//
// Fixed at the generator (the root) and regenerated. This gate holds the data
// to its type so a future source file with a list cannot reopen it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { teachingBeatText } from './danyaTeachingService';
import type { DanyaNote } from './danyaTeachingService';

interface Bundle { notes: Array<Record<string, unknown>> }

const corpus = (): Bundle['notes'] => {
  const raw = JSON.parse(readFileSync('public/data/voiced-teachings.json', 'utf8')) as Bundle;
  return raw.notes ?? [];
};

describe('voiced corpus field shapes', () => {
  it('has a corpus to check — non-vacuity', () => {
    expect(corpus().length).toBeGreaterThan(5_000);
  });

  it('teaches and plans are STRINGS, never arrays', () => {
    const bad = corpus()
      .map((n, i) => ({ i, teaches: Array.isArray(n.teaches), plans: Array.isArray(n.plans) }))
      .filter((r) => r.teaches || r.plans);
    expect(
      bad.length,
      `${bad.length} note(s) carry a list where the type says string — `
      + 'the generator must coerce (asText), or teachingBeatText throws and the '
      + 'teaching silently vanishes into a bonus-catch',
    ).toBe(0);
  });

  it('teachingBeatText survives EVERY note in the shipped corpus', () => {
    // The direct proof: the function that used to throw, run over the real data.
    const failures: string[] = [];
    for (const n of corpus()) {
      try { teachingBeatText(n as unknown as DanyaNote); }
      catch (e) { failures.push(`${typeof n.id === 'string' ? n.id : '?'}: ${(e as Error).message}`); }
    }
    expect(failures.slice(0, 3).join(' | ')).toBe('');
    expect(failures.length).toBe(0);
  });

  it('a list-valued note would still be caught — the gate can fail', () => {
    // Guards the guard: if `teachingBeatText` were ever made total, the shape
    // assertion above would be the only thing left holding the line, so prove
    // the throw is real rather than assumed.
    expect(() => teachingBeatText({ explains: 'x', teaches: ['a', 'b'] } as unknown as DanyaNote)).toThrow();
  });
});
