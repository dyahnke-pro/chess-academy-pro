import { describe, it, expect } from 'vitest';
import { resolveVoicedWalkthrough, listVoicedWalkthroughs, resolveVoicedMatchup, listVoicedMatchups, voicedTreeContainsLine } from './voicedWalkthroughs';
import { resolveOpeningEntry } from '../services/openingDetectionService';
import { inferStudentSideFromName } from '../services/openingDetectionService';

const r = (q: string) => resolveVoicedWalkthrough(q, inferStudentSideFromName(q));

describe('resolveVoicedWalkthrough', () => {
  it('resolves a single-opening teach request to a voiced tree', () => {
    const caro = r('teach me the caro-kann');
    expect(caro).not.toBeNull();
    expect(caro?.openingName.toLowerCase()).toContain('caro');

    const italian = r('Italian Game');
    expect(italian?.openingName.toLowerCase()).toContain('italian');

    const kid = r('kings indian');
    expect(kid?.openingName.toLowerCase()).toContain('indian');
  });

  it('DECLINES an "X vs Y" matchup so the matchup planner owns it', () => {
    // A matchup is two openings colliding on one board — never one side's
    // voiced walkthrough. These must return null so planOpeningMatchup runs.
    expect(r('Italian vs French')).toBeNull();
    expect(r('show me Italian vs French')).toBeNull();
    expect(r('London versus Kings Indian')).toBeNull();
    expect(r('Ruy Lopez against the Sicilian')).toBeNull();
  });

  it('returns null for empty / no-content queries', () => {
    expect(r('')).toBeNull();
    expect(r('   ')).toBeNull();
    expect(r('zzz qqq nonsense')).toBeNull();
  });

  it('resolves a "X vs Y" matchup to a voiced walkthrough built from real videos', () => {
    // KIA vs French — we have a real video of exactly this pairing.
    const kf = resolveVoicedMatchup('KIA vs French');
    expect(kf).not.toBeNull();
    expect(kf?.openingName.toLowerCase()).toContain('indian attack');
    expect(kf?.openingName.toLowerCase()).toContain('french');
    // sides match in either order.
    expect(resolveVoicedMatchup('French vs KIA')?.openingName).toBe(kf?.openingName);
    expect(resolveVoicedMatchup("King's Indian Attack against the French")?.openingName).toBe(kf?.openingName);
  });

  it('returns null for a matchup we have no video of (caller constructs it)', () => {
    // A pairing with no real video in the corpus → null → planOpeningMatchup builds it.
    expect(resolveVoicedMatchup('Grünfeld vs Dutch')).toBeNull();
    // Not a matchup at all.
    expect(resolveVoicedMatchup('teach me the caro-kann')).toBeNull();
  });

  it('every matchup tree is a legal, note-bearing walkthrough', () => {
    for (const m of listVoicedMatchups()) {
      expect(m.matchupName).toContain(' vs ');
      expect(m.narratedNodes).toBeGreaterThan(0);
    }
  });

  it('every voiced tree in the catalogue is a legal, non-empty walkthrough', () => {
    const all = listVoicedWalkthroughs();
    expect(all.length).toBeGreaterThan(0);
    for (const w of all) {
      expect(w.openingName.length).toBeGreaterThan(2);
      expect(w.narratedNodes).toBeGreaterThan(0);
      expect(['white', 'black']).toContain(w.studentSide);
    }
  });
});

describe('resolveVoicedWalkthrough selects by the MOVES a tree teaches, never by name (2026-09-15)', () => {
  it('a sub-line the corpus never voiced returns null instead of the family lesson', () => {
    // The voiced "Scandinavian Defense" family tree forks at ply 3 and never
    // plays …Qa5 d4 Nf6 Nf3 Bg4 — serving it for the Lasker ask handed the
    // student a lesson with zero Lasker moves (prod, 2026-09-15).
    expect(r('Scandinavian Defense: Lasker Variation')).toBeNull();
    expect(r('Scandinavian Defense, Lasker Variation')).toBeNull();
    expect(r('scandinavian lasker')).toBeNull();
  });

  it('a line the corpus DOES voice resolves to a tree that contains every move of it', () => {
    // Every voiced Scandinavian is written from WHITE's seat, so it is served
    // to a White student and never to a Black one (the seat is part of the
    // selection — CLAUDE.md "THE SEAT IS PART OF THE SELECTION").
    expect(resolveVoicedWalkthrough('Scandinavian Defense: Main Line', 'black')).toBeNull();
    const tree = resolveVoicedWalkthrough('Scandinavian Defense: Main Line', 'white');
    expect(tree).not.toBeNull();
    expect(voicedTreeContainsLine(tree!, ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'])).toBe(true);
  });

  it('every DB-resolvable ask that returns a voiced tree returns one containing the resolved line', () => {
    const asks = [
      ...listVoicedWalkthroughs().map((e) => e.openingName),
      'caro-kann', 'Caro-Kann Defense: Fantasy Variation', 'Italian Game', 'kings indian',
      'French Defense: Advance Variation', 'Sicilian Defense: Najdorf Variation', 'London System',
    ];
    let checked = 0;
    for (const ask of asks) {
      const moves = resolveOpeningEntry(ask)?.moves ?? null;
      const tree = r(ask);
      if (!moves || !tree) continue;
      checked += 1;
      expect(voicedTreeContainsLine(tree, moves), `"${ask}" → ${tree.openingName} lacks ${moves.join(' ')}`).toBe(true);
    }
    expect(checked).toBeGreaterThan(5);
  }, 60_000);

  it('a voiced-only label still resolves by name when EVERY content token hits', () => {
    const adv = r('Scandinavian Defense (2.e5 Advance)');
    expect(adv?.openingName).toBe('Scandinavian Defense (2.e5 Advance)');
  });
});

describe('one seat per lesson, main line first (teach walk 2026-09-27)', () => {
  it('the Black King\'s Indian walks c4 and Nc3 first, never the 3.d5 bullet game', () => {
    const t = r("King's Indian Defense")!;
    const walk: string[] = [];
    let cur = t.root;
    for (let i = 0; i < 5 && cur.children.length; i += 1) { cur = cur.children[0].node; walk.push(cur.san ?? ''); }
    expect(walk).toEqual(['d4', 'Nf6', 'c4', 'g6', 'Nc3']);
  });
  it('a Black lesson carries no White-seat narration', () => {
    const t = r("King's Indian Defense")!;
    const c4 = t.root.children[0].node.children[0].node.children[0].node;
    expect(c4.san).toBe('c4');
    expect(c4.idea).not.toMatch(/^You /);
  });
  it('the seat selects the tree: asking as White gets the White-seat lesson or none', () => {
    const asWhite = resolveVoicedWalkthrough("King's Indian Defense", 'white');
    const asBlack = resolveVoicedWalkthrough("King's Indian Defense", 'black');
    expect(asBlack).not.toBeNull();
    expect(asWhite === null || asWhite.root !== asBlack!.root).toBe(true);
  });
});
