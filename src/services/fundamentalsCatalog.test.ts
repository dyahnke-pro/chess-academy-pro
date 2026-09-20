import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { FUNDAMENTAL_IDS, type FundamentalId } from './principleAttribution';
import {
  FUNDAMENTAL_SECTION, FUNDAMENTAL_SECTION_IDS, FUNDAMENTAL_LABEL, FUNDAMENTAL_PILLAR,
  SECTION_TEACHING, fundamentalDevice, fundamentalDrill, fundamentalsBySection,
  fundamentalPillar, fundamentalsForPillar, pillarStanding, getFundamentalCounts,
  type FundamentalPillar, type FundamentalStat,
} from './fundamentalsCatalog';
import { assembleFundamentalsAnswer } from './groundedAnswer';
import { logMisconception } from './misconceptionService';

// Iterate the ONE list the catalog exports — a hand-copied section array here
// is the drifting-constant class this repo bans.
const SECTIONS = FUNDAMENTAL_SECTION_IDS;

describe('fundamentalsCatalog — every fundamental is catalogued', () => {
  it('places all 33 under exactly one section, each with a label + device', () => {
    for (const id of FUNDAMENTAL_IDS) {
      expect(SECTIONS, `${id} has a section`).toContain(FUNDAMENTAL_SECTION[id]);
      expect(FUNDAMENTAL_LABEL[id].length, `${id} has a label`).toBeGreaterThan(2);
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

// ─── J1 (WO-4, 2026-09-19): the two halves of the taxonomy are JOINED ────────
// The tab + the coach chat teach four classical PILLARS (`FundamentalsTopic`);
// the computer attributes 33 `FundamentalId`s. Nothing linked them, so the tab
// taught an idea the model could not file and the model filed ideas the tab
// could not teach. These are the gates that keep the join total and honest.

const PILLARS: readonly FundamentalPillar[] = ['piece-values', 'development', 'center', 'king-safety'];

describe('J1 — FUNDAMENTAL_PILLAR joins every fundamental to a pillar or an explicit null', () => {
  it('every fundamental has an ANSWER — a real pillar or an explicit null, never undefined', () => {
    for (const id of FUNDAMENTAL_IDS) {
      // `in` distinguishes "decided null" from "missing key"; the Record type
      // makes a missing key a compile error, this keeps it a runtime one too.
      expect(id in FUNDAMENTAL_PILLAR, `${id} is decided`).toBe(true);
      const p = fundamentalPillar(id);
      expect(p === null || PILLARS.includes(p), `${id} → ${String(p)} is a pillar or null`).toBe(true);
    }
  });

  it('every pillar the chat can teach is graded by at least one fundamental (piece-values used to be EMPTY)', () => {
    for (const p of PILLARS) {
      const ids = fundamentalsForPillar(p);
      expect(ids.length, `${p} has fundamentals`).toBeGreaterThan(0);
      // And the pillar the join points at is one the teaching side can actually
      // answer for — the two halves name the SAME string.
      expect(assembleFundamentalsAnswer(p)?.facts.length ?? 0, `${p} has authored teaching`).toBeGreaterThan(40);
    }
    expect(fundamentalsForPillar('piece-values')).toEqual(
      expect.arrayContaining(['loose-piece', 'wrong-trade-for-material', 'poisoned-pawn']),
    );
  });

  it('the null answers are the ones that GENUINELY have no pillar — endgame technique is never king-safety', () => {
    // The endgame king is a fighting piece; filing it under king-safety would
    // teach the opposite of the truth. The null here is a chess judgement.
    expect(fundamentalPillar('passive-king-endgame')).toBeNull();
    expect(fundamentalPillar('lost-the-opposition')).toBeNull();
    // A pillar'd fundamental and a null one both round-trip through the reverse.
    expect(fundamentalsForPillar('king-safety')).toEqual(['king-left-in-centre', 'weakened-king-shield']);
    const unfiled = FUNDAMENTAL_IDS.filter((id) => fundamentalPillar(id) === null);
    const filed = PILLARS.flatMap((p) => fundamentalsForPillar(p));
    expect(new Set([...unfiled, ...filed]).size).toBe(FUNDAMENTAL_IDS.length);
  });

  it('SECTION_TEACHING declares where EVERY section\'s prose comes from — no blank card is possible', () => {
    for (const sec of SECTIONS) {
      const t = SECTION_TEACHING[sec];
      const prose = t.kind === 'pillar' ? assembleFundamentalsAnswer(t.pillar)?.facts ?? '' : t.prose;
      expect(prose.length, `${sec} renders teaching`).toBeGreaterThan(80);
      expect(prose, `${sec} keeps the house perspective`).not.toMatch(/\b(we|our|us)\b/i);
    }
    // The three pillar-reading sections read the pillar their fundamentals are filed under.
    for (const sec of SECTIONS) {
      const t = SECTION_TEACHING[sec];
      if (t.kind !== 'pillar') continue;
      const under = fundamentalsBySection(sec);
      expect(under.some((id) => fundamentalPillar(id) === t.pillar), `${sec} section teaches the pillar its rows are graded on`).toBe(true);
    }
  });

  it('NEGATIVE CONTROL — a fundamental left out of the join would be caught, not skipped', () => {
    // Simulate the drift the type forbids: a map missing one key. The runtime
    // guard (`in`) must flag it, so a type-cast slip can never pass silently.
    const broken = { ...FUNDAMENTAL_PILLAR } as Partial<Record<FundamentalId, FundamentalPillar | null>>;
    delete broken['loose-piece'];
    const missing = FUNDAMENTAL_IDS.filter((id) => !(id in broken));
    expect(missing).toEqual(['loose-piece']);
  });
});

describe('J1 — pillarStanding is the join FIRING: a pillar can report the student\'s own record', () => {
  const counts = (o: Partial<Record<FundamentalId, number>>): Partial<Record<FundamentalId, FundamentalStat>> =>
    Object.fromEntries(Object.entries(o).map(([k, n]) => [k, { count: n, lastSeenAt: 1 }]));

  it('rolls up the fundamentals filed under the pillar and names the worst', () => {
    const s = pillarStanding('piece-values', counts({ 'loose-piece': 4, 'poisoned-pawn': 1, 'space-conceded': 9 }));
    expect(s.slips).toBe(5);            // space-conceded is centre, not piece-values — excluded
    expect(s.distinct).toBe(2);
    expect(s.worst).toBe('loose-piece');
    expect(s.asked).toBe(true);
  });

  it('GREY, not green: a pillar nothing has caught the student on is "never asked", never a pass', () => {
    const s = pillarStanding('king-safety', counts({ 'loose-piece': 4 }));
    expect(s.asked).toBe(false);
    expect(s.slips).toBe(0);
    expect(s.worst).toBeNull();
    // The pillar still knows what it WOULD grade — the join is total even at zero.
    expect(s.fundamentals).toEqual(['king-left-in-centre', 'weakened-king-shield']);
  });

  it('NEGATIVE CONTROL — a slip on a null-pillar fundamental reaches NO pillar (the null is honoured)', () => {
    const c = counts({ 'lost-the-opposition': 7, 'ignored-threat': 3 });
    for (const p of PILLARS) expect(pillarStanding(p, c).slips, `${p} unaffected`).toBe(0);
  });
});
