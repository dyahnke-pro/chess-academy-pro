import { describe, it, expect } from 'vitest';
import endgamePrinciples from './endgame-principles.json';
import pawnEndings from './pawn-endings.json';
import rookEndings from './rook-endings.json';
import drawnPatterns from './drawn-patterns.json';
import matingPatterns from './mating-patterns.json';

// Provenance gate for the UNIVERSAL named-technique content (David 2026-05-25).
// Endgame lessons (Lucena, Philidor, opposition…) and named mating patterns
// (Anastasia, Boden, smothered…) are not opening-scoped, but they're still
// hand-authored teaching prose — their independent source is the named
// technique's own history/namesake, recorded in `narration.history`. Endgame is
// fully sourced (sealed at 0); mating has a shrinking backlog under a ceiling so
// it can only improve, never regress.

interface Narr { narration?: { history?: string; why?: string }; source?: string }
const endgames = [...endgamePrinciples, ...pawnEndings, ...rookEndings, ...drawnPatterns] as Narr[];
const mating = matingPatterns as Narr[];

const hist = (e: Narr): boolean => Boolean((e.narration?.history ?? e.source ?? '').trim());

describe('universal named-technique content records its provenance', () => {
  it('EVERY endgame lesson records a history/source — no exceptions', () => {
    const missing = endgames.filter((e) => !hist(e));
    expect(missing.length, `${missing.length} endgame lessons lack narration.history / source`).toBe(0);
  });

  // Mating backlog can only SHRINK — lower MATING_HISTORY_GAP_CEILING as the
  // remaining patterns get a history line; never raise it.
  const MATING_HISTORY_GAP_CEILING = 15;
  it(`mating-pattern history gap never grows (ceiling ${MATING_HISTORY_GAP_CEILING})`, () => {
    const missing = mating.filter((m) => !hist(m)).length;
    expect(missing, 'more mating patterns now lack a history line — author one instead of regressing').toBeLessThanOrEqual(MATING_HISTORY_GAP_CEILING);
  });
});
