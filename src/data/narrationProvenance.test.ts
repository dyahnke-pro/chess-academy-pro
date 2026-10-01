import { describe, it, expect } from 'vitest';
import endgamePrinciples from './endgame-principles.json';
import pawnEndings from './pawn-endings.json';
import rookEndings from './rook-endings.json';
import drawnPatterns from './drawn-patterns.json';
import matingPatterns from './mating-patterns.json';
import { sourcesAreValid } from './narrationSources';

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

  // SEALED 2026-05-25: all 37 mating patterns now carry a history line. No
  // exceptions — a new pattern without one fails.
  it('EVERY mating pattern records a history line — no exceptions', () => {
    const missing = mating.filter((m) => !hist(m));
    expect(missing.length, `${missing.length} mating patterns lack narration.history`).toBe(0);
  });

  // REWRITTEN IN OUR OWN WORDS, SOURCED (David 2026-10-01: "I'm ok with
  // using online sources. Maybe find books or other sources besides wiki").
  // The lesson captions were copied verbatim from Lichess Practice / Wikipedia,
  // and several history lines were invented ("used it so often it became his
  // signature", a military origin for the kill box, "ended more master games
  // than any other pattern"). Each pattern now names where it was checked —
  // Gutenberg books, game pages, articles — and the copied phrasing is gone.
  it('EVERY mating pattern names resolvable sources', () => {
    const bad = mating.filter((m) => !sourcesAreValid((m as unknown as { sources?: string[] }).sources));
    expect(bad.map((m) => (m as unknown as { id: string }).id)).toEqual([]);
  });

  it('no lesson caption carries the copied Lichess / Wikipedia text', () => {
    const COPIED = [
      /if played perfectly/i,
      /is a checkmate delivered by/i,
      /\binvolves the use of\b/i,
      /\bworks by (using|confining|attacking|trapping)\b/i,
      /named for [A-Z][a-z]+ [A-Z][a-z]+ and is a variation/i,
      /there are two important principles to follow/i,
    ];
    const hits = mating.flatMap((m) => (m as unknown as { lessonPositions: Array<{ sourceComment?: string }> }).lessonPositions
      .map((l) => l.sourceComment ?? '')
      .filter((c) => COPIED.some((re) => re.test(c)))
      .map((c) => `${(m as unknown as { id: string }).id}: ${c.slice(0, 60)}`));
    expect(hits).toEqual([]);
  });
});
