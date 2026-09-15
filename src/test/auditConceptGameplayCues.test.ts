import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { tacticInvariant } from '../services/conceptEngine';

/**
 * The gameplay audit recognises a SPOKEN computed concept by its NAME plus a
 * cue phrase from the engine's invariant — not the exact sentence, because the
 * phrasing pass may reword it. This pins every cue to the engine's own text so
 * the audit cannot drift from the source it claims to verify (2026-09-15: an
 * exact-sentence regex called a correctly voiced pin a miss).
 */
describe('audit-concept-gameplay-prod CONCEPT_CUES are anchored to the engine invariants', () => {
  const src = readFileSync('scripts/audit-concept-gameplay-prod.mjs', 'utf8');
  const block = src.slice(src.indexOf('export const CONCEPT_CUES'), src.indexOf('];', src.indexOf('export const CONCEPT_CUES')));
  const entries = [...block.matchAll(/type: '([a-z_]+)', name: \/(.+?)\/i, cue: \/(.+?)\/i/g)]
    .map((m) => ({ type: m[1], name: new RegExp(m[2], 'i'), cue: new RegExp(m[3], 'i') }));

  it('parses the cue table out of the audit', () => {
    expect(entries.length).toBeGreaterThanOrEqual(8);
  });

  it('every cue matches the engine invariant for its type, and the name matches the tactic word', () => {
    for (const e of entries) {
      const inv = tacticInvariant(e.type);
      expect(inv, `no engine invariant for ${e.type}`).not.toBeNull();
      expect(e.cue.test(inv!.full), `cue /${e.cue.source}/ not in engine invariant for ${e.type}: "${inv!.full}"`).toBe(true);
      expect(e.name.test(inv!.full), `name /${e.name.source}/ not in engine invariant for ${e.type}: "${inv!.full}"`).toBe(true);
    }
  });

  it('recognises the reworded pin line prod actually spoke', () => {
    const spoken = "That's a pin: the piece in front is frozen — it cannot move without exposing the more valuable piece behind it, so you can pile on.";
    expect(entries.some((e) => e.name.test(spoken) && e.cue.test(spoken))).toBe(true);
  });
});
