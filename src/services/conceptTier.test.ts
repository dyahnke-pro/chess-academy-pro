/**
 * The concept tier — teaching that belongs to a phase and an idea rather than
 * to an opening. It exists because 11,921 Saint Louis notes were being dropped
 * at merge for having no opening to hang on, and the attempt to give them one
 * produced generic endgame advice labelled Caro-Kann.
 */
import { describe, it, expect } from 'vitest';
import { conceptNotesFor, conceptsAvailable } from './danyaTeachingService';

describe('conceptTier', () => {
  it('returns nothing when asked for no concepts — never a blind grab-bag', () => {
    expect(conceptNotesFor({ phase: 'endgame', concepts: [] })).toEqual([]);
  });

  it('only returns notes from the phase that was asked for', () => {
    for (const phase of ['opening', 'middlegame', 'endgame'] as const) {
      const available = conceptsAvailable(phase);
      if (available.length === 0) continue;
      const notes = conceptNotesFor({ phase, concepts: [available[0].concept], limit: 8 });
      for (const n of notes) expect(n.phase, `${n.id} answered a ${phase} query`).toBe(phase);
    }
  });

  it('every returned note actually carries one of the requested concepts', () => {
    const available = conceptsAvailable('middlegame');
    if (available.length === 0) return;
    const wanted = available.slice(0, 2).map((a) => a.concept);
    for (const n of conceptNotesFor({ phase: 'middlegame', concepts: wanted, limit: 10 })) {
      const tags = n.concepts.map((c) => c.toLowerCase());
      expect(wanted.some((w) => tags.includes(w)), `${n.id}: matched none of ${wanted.join(', ')}`).toBe(true);
    }
  });

  it('ranks a note matching several requested ideas above one matching a single tag', () => {
    const available = conceptsAvailable('middlegame');
    if (available.length < 2) return;
    const wanted = available.slice(0, 3).map((a) => a.concept);
    const notes = conceptNotesFor({ phase: 'middlegame', concepts: wanted, limit: 12 });
    const score = (n: { concepts: string[] }) =>
      n.concepts.filter((c) => wanted.includes(c.toLowerCase())).length;
    for (let i = 1; i < notes.length; i += 1) {
      expect(score(notes[i - 1]), 'results are not ordered by how many ideas they match').toBeGreaterThanOrEqual(score(notes[i]));
    }
  });

  it('never returns the same note twice, though it is indexed once per concept', () => {
    const available = conceptsAvailable('endgame');
    if (available.length < 2) return;
    const notes = conceptNotesFor({ phase: 'endgame', concepts: available.slice(0, 4).map((a) => a.concept), limit: 20 });
    expect(new Set(notes.map((n) => n.id)).size).toBe(notes.length);
  });

  it('honours the limit', () => {
    const available = conceptsAvailable('endgame');
    if (available.length === 0) return;
    expect(conceptNotesFor({ phase: 'endgame', concepts: [available[0].concept], limit: 3 }).length).toBeLessThanOrEqual(3);
  });
});
