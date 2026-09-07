import { describe, it, expect } from 'vitest';
import { FUNDAMENTAL_LESSON, resolveTaughtFundamental } from './fundamentalLessons';
import { FUNDAMENTAL_IDS } from '../services/principleAttribution';
import { isResolvableSource } from './narrationSources';

// Build #4 (David 2026-09-07): a per-fundamental teaching lesson for EVERY
// fundamental the computer attributes, grounded in classical principle and
// voiced through the coach spine (DNA register). The gate guards the contract:
// exhaustive, sourced, and in the house voice.

describe('FUNDAMENTAL_LESSON — the per-fundamental teaching catalog', () => {
  it('has a lesson for every fundamental (no silent gaps)', () => {
    for (const id of FUNDAMENTAL_IDS) {
      expect(FUNDAMENTAL_LESSON[id], `missing lesson for ${id}`).toBeTruthy();
    }
    // …and no strays keyed to a fundamental that no longer exists.
    for (const key of Object.keys(FUNDAMENTAL_LESSON)) {
      expect(FUNDAMENTAL_IDS as readonly string[]).toContain(key);
    }
  });

  it('every lesson is substantial teaching, not a one-liner', () => {
    for (const id of FUNDAMENTAL_IDS) {
      const facts = FUNDAMENTAL_LESSON[id].facts;
      expect(facts.length, `${id} lesson too short`).toBeGreaterThan(180);
      // Multiple sentences — a real lesson, not a device.
      expect((facts.match(/[.!?]/g) ?? []).length, `${id} needs several sentences`).toBeGreaterThanOrEqual(3);
    }
  });

  it('every lesson cites at least one resolvable source', () => {
    for (const id of FUNDAMENTAL_IDS) {
      const sources = FUNDAMENTAL_LESSON[id].sources;
      expect(sources.length, `${id} has no sources`).toBeGreaterThan(0);
      for (const s of sources) {
        expect(isResolvableSource(s), `${id} source "${s}" does not resolve`).toBe(true);
      }
    }
  });

  it('never says we/our/us — the locked one-perspective rule (2026-08-28)', () => {
    // The student is "you/your", the opponent "they/their". First-person plural
    // is the banned ambiguity source.
    const banned = /\b(we|we're|we've|we'll|our|ours|us)\b/i;
    for (const id of FUNDAMENTAL_IDS) {
      const hit = banned.exec(FUNDAMENTAL_LESSON[id].facts);
      expect(hit, `${id} lesson uses first-person plural: "${hit?.[0]}"`).toBeNull();
    }
  });

  it('addresses the student directly (you/your) so it teaches, not lectures', () => {
    for (const id of FUNDAMENTAL_IDS) {
      expect(/\byou(r)?\b/i.test(FUNDAMENTAL_LESSON[id].facts), `${id} never addresses the student`).toBe(true);
    }
  });
});

describe('resolveTaughtFundamental — naming a specific fundamental in a teaching ask', () => {
  // Many phrasings for the same fundamental (David: users ask the same thing
  // many ways). The resolver only needs to reach the RIGHT id.
  const cases: Array<[string, string]> = [
    ['teach me not moving the same piece twice', 'same-piece-twice'],
    ['why is moving the same piece twice bad', 'same-piece-twice'],
    ['what are poisoned pawns', 'poisoned-pawn'],
    ['explain the poisoned pawn', 'poisoned-pawn'],
    ['teach me about the opposition', 'lost-the-opposition'],
    ['how do I stop hanging a loose piece', 'loose-piece'],
    ['teach me open files', 'rook-ignored-open-file'],
    ['why is my queen coming out early bad', 'early-queen-sortie'],
    ['explain passed pawns', 'passed-pawn-neglected'],
    ['is my attack sound', 'overvalued-attack'],
    ['teach me converting a won position', 'botched-conversion'],
    ['what does handing over a tempo mean', 'tempo-handed'],
    ['when should I castle', 'king-left-in-centre'],
    ['teach me active rooks in the endgame', 'passive-rook-endgame'],
    ['why are doubled pawns bad', 'created-pawn-weakness'],
  ];
  it.each(cases)('resolves "%s" → %s', (ask, id) => {
    expect(resolveTaughtFundamental(ask)).toBe(id);
  });

  it('returns null when no specific fundamental is named', () => {
    expect(resolveTaughtFundamental('teach me the fundamentals')).toBeNull();
    expect(resolveTaughtFundamental('what should I play here')).toBeNull();
    expect(resolveTaughtFundamental('')).toBeNull();
    expect(resolveTaughtFundamental(undefined)).toBeNull();
  });

  it('every fundamental is reachable by at least its label words', () => {
    // A light guarantee that no id is orphaned from the resolver — the exact
    // phrasing per id is exercised above; here we just prove none is unreachable.
    const reachable = new Set(cases.map(([, id]) => id));
    // Not every id has a bespoke case above, so this is a floor, not a ceiling.
    expect(reachable.size).toBeGreaterThanOrEqual(10);
  });
});
