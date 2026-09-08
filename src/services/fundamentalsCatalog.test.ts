import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { FUNDAMENTAL_IDS } from './principleAttribution';
import {
  FUNDAMENTAL_SECTION, FUNDAMENTAL_LABEL, fundamentalDevice, fundamentalDrill,
  fundamentalsBySection, getFundamentalCounts, type FundamentalSectionId,
} from './fundamentalsCatalog';
import { logMisconception } from './misconceptionService';

const SECTIONS: FundamentalSectionId[] = [
  'opening-play', 'center', 'development', 'king-safety', 'pawn-structure', 'tactics-threats', 'endgame-technique',
];

describe('fundamentalsCatalog — every fundamental is catalogued', () => {
  it('places all 33 under exactly one section, each with a label + device', () => {
    for (const id of FUNDAMENTAL_IDS) {
      expect(SECTIONS, `${id} has a section`).toContain(FUNDAMENTAL_SECTION[id]);
      expect(FUNDAMENTAL_LABEL[id]?.length, `${id} has a label`).toBeGreaterThan(2);
      expect(fundamentalDevice(id).length, `${id} has a device/teach line`).toBeGreaterThan(10);
    }
  });

  it('every section holds at least one fundamental, and the union is all of them', () => {
    const seen = new Set<string>();
    for (const s of SECTIONS) {
      const ids = fundamentalsBySection(s);
      expect(ids.length, `${s} is non-empty`).toBeGreaterThan(0);
      for (const id of ids) seen.add(id);
    }
    expect(seen.size).toBe(FUNDAMENTAL_IDS.length);
  });

  it('a fundamental drills a puzzle set where its tag has themes, else own mistakes', () => {
    // poisoned-pawn's tag carries puzzleThemes → a themed drill.
    expect(fundamentalDrill('poisoned-pawn')).toEqual({ kind: 'themes', themes: expect.arrayContaining(['trappedPiece']) });
    // capture-toward-centre is a principle tag (no themes) → own flagged positions.
    expect(fundamentalDrill('capture-toward-centre')).toEqual({ kind: 'mistakes' });
  });
});

describe('getFundamentalCounts — reads the student\'s own slips by fundamentalId', () => {
  beforeEach(async () => { await db.misconceptionTags.clear(); });

  it('counts recorded fundamentals INCLUDING analyzed/display-only slips (David 2026-09-08)', async () => {
    await logMisconception({ tag: 'poisoned-pawn', fundamentalId: 'poisoned-pawn', source: 'auto-analysis', fen: '8/8/8/8/8/8/8/K6k w - - 0 1', counted: true });
    await logMisconception({ tag: 'poisoned-pawn', fundamentalId: 'poisoned-pawn', source: 'auto-analysis', fen: '8/8/8/8/8/8/8/K6k w - - 0 1', counted: true });
    // An imported/analyzed game logs counted:false to avoid double-counting the
    // weakness PROFILE — but it MUST still feed the fundamentals scorecard
    // (otherwise a heavy importer sees an empty fundamentals view).
    await logMisconception({ tag: 'tempo-handed', fundamentalId: 'tempo-handed', source: 'auto-analysis', fen: '8/8/8/8/8/8/8/K6k w - - 0 1', counted: false });
    const counts = await getFundamentalCounts();
    expect(counts['poisoned-pawn']?.count).toBe(2);
    expect(counts['tempo-handed']?.count).toBe(1);           // analyzed game now counts
    expect(counts['same-piece-twice']).toBeUndefined();      // never slipped → absent
  });
});
