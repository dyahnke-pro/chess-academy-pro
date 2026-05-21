import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  logMisconception,
  getMisconceptionProfile,
  getAllMisconceptions,
  recordTagDrillResult,
  mapTagToDrills,
  isMisconceptionDue,
} from './misconceptionService';

const FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

beforeEach(async () => {
  await db.misconceptionTags.clear();
});

describe('logMisconception', () => {
  it('stores a valid closed-set tag', async () => {
    const rec = await logMisconception({
      tag: 'overvalued-attack',
      source: 'discussion-practice',
      fen: FEN,
      playedSan: 'Bxf7+',
      bestSan: 'O-O',
      cpLoss: 320,
    });
    expect(rec).not.toBeNull();
    expect(rec!.status).toBe('open');
    expect(rec!.masteryHits).toBe(0);
    const all = await getAllMisconceptions();
    expect(all).toHaveLength(1);
  });

  it('rejects a tag outside the closed set (LLM hallucination guard)', async () => {
    const rec = await logMisconception({
      tag: 'totally-made-up-tag',
      source: 'auto-analysis',
      fen: FEN,
    });
    expect(rec).toBeNull();
    expect(await getAllMisconceptions()).toHaveLength(0);
  });

  it("requires a customLabel for the 'other' catch-all", async () => {
    const bad = await logMisconception({ tag: 'other', source: 'game-review', fen: FEN });
    expect(bad).toBeNull();
    const good = await logMisconception({
      tag: 'other',
      source: 'game-review',
      fen: FEN,
      customLabel: 'castled into the attack',
    });
    expect(good).not.toBeNull();
    expect(good!.customLabel).toBe('castled into the attack');
  });
});

describe('getMisconceptionProfile', () => {
  it('ranks by due count, sinks well-spaced tags', async () => {
    for (let i = 0; i < 3; i++) {
      await logMisconception({ tag: 'hung-material', source: 'auto-analysis', fen: FEN });
    }
    await logMisconception({ tag: 'no-plan', source: 'auto-analysis', fen: FEN });

    const profile = await getMisconceptionProfile();
    expect(profile[0].tag).toBe('hung-material');
    expect(profile[0].openCount).toBe(3);
    expect(profile[0].label).toBe('Hung a piece or pawn');
  });

  it("keeps distinct 'other' free-text labels separate", async () => {
    await logMisconception({ tag: 'other', source: 'game-review', fen: FEN, customLabel: 'wrong rook' });
    await logMisconception({ tag: 'other', source: 'game-review', fen: FEN, customLabel: 'wrong rook' });
    await logMisconception({ tag: 'other', source: 'game-review', fen: FEN, customLabel: 'premature resignation' });

    const profile = await getMisconceptionProfile();
    const others = profile.filter((r) => r.tag === 'other');
    expect(others).toHaveLength(2);
    const wrongRook = others.find((r) => r.label === 'wrong rook');
    expect(wrongRook?.total).toBe(2);
  });
});

describe('recordTagDrillResult — SRS spacing, never graduate out', () => {
  it('spaces a tag further out on success but never removes it', async () => {
    await logMisconception({ tag: 'missed-tactic', source: 'discussion-practice', fen: FEN });
    // One success spaces it into the future — due count drops to 0 today.
    await recordTagDrillResult('missed-tactic', true);

    const all = await getAllMisconceptions();
    expect(all).toHaveLength(1); // still present — nothing graduated away
    expect(all[0].status).toBe('improving');
    expect(all[0].masteryHits).toBe(1);
    expect(all[0].dueAt).toBeGreaterThan(Date.now()); // resting, not gone
    expect(isMisconceptionDue(all[0])).toBe(false);

    const profile = await getMisconceptionProfile();
    expect(profile.find((r) => r.tag === 'missed-tactic')?.openCount).toBe(0);
    // …but the instance still counts toward the lifetime total.
    expect(profile.find((r) => r.tag === 'missed-tactic')?.total).toBe(1);
  });

  it('the interval lengthens with each consecutive success', async () => {
    await logMisconception({ tag: 'missed-tactic', source: 'discussion-practice', fen: FEN });
    await recordTagDrillResult('missed-tactic', true);
    const afterOne = (await getAllMisconceptions())[0];
    const gapOne = (afterOne.dueAt ?? 0) - Date.now();

    // Force it due again, then a second success should space it out FURTHER.
    await db.misconceptionTags.update(afterOne.id, { dueAt: Date.now() - 1 });
    await recordTagDrillResult('missed-tactic', true);
    const afterTwo = (await getAllMisconceptions())[0];
    const gapTwo = (afterTwo.dueAt ?? 0) - Date.now();

    expect(afterTwo.masteryHits).toBe(2);
    expect(gapTwo).toBeGreaterThan(gapOne);
  });

  it('a miss snaps the instance back to due so you see it sooner', async () => {
    await logMisconception({ tag: 'missed-tactic', source: 'discussion-practice', fen: FEN });
    await recordTagDrillResult('missed-tactic', true);
    // Make it due again to drill it, then miss.
    const rec = (await getAllMisconceptions())[0];
    await db.misconceptionTags.update(rec.id, { dueAt: Date.now() - 1 });
    await recordTagDrillResult('missed-tactic', false);

    const all = await getAllMisconceptions();
    expect(all[0].status).toBe('open');
    expect(all[0].masteryHits).toBe(0);
    expect(isMisconceptionDue(all[0])).toBe(true); // back in today's feed
  });
});

describe('mapTagToDrills', () => {
  it('maps a tactical tag to its puzzle themes + the user positions', async () => {
    await logMisconception({ tag: 'missed-tactic', source: 'auto-analysis', fen: FEN, playedSan: 'h3', bestSan: 'Nxe5' });
    const plan = await mapTagToDrills('missed-tactic');
    expect(plan).not.toBeNull();
    expect(plan!.kind).toBe('tactic');
    expect(plan!.puzzleThemes).toContain('fork');
    expect(plan!.positions[0].fen).toBe(FEN);
    expect(plan!.positions[0].bestSan).toBe('Nxe5');
  });

  it("treats 'other' as a review-only holding pen (no canned drill)", async () => {
    await logMisconception({ tag: 'other', source: 'game-review', fen: FEN, customLabel: 'odd' });
    const plan = await mapTagToDrills('other');
    expect(plan!.kind).toBe('review');
    expect(plan!.puzzleThemes).toHaveLength(0);
  });
});
