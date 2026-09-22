// C6 (WO-STANDARD-01, 2026-09-22) — A HELD ROW IN DEXIE COMES OUT AS A LOWERED
// SIGNAL. This is the OUTPUT half of the gate: `weaknessSignal.test.ts` proves
// the pure rule, this proves the WIRE — the loader reads the positive record
// beside the negative one and the join lands on the signal the ranker reads.
//
// Real fake-indexeddb, real aggregators, no mocks. Each negative control writes
// the SAME misconception row and varies only the positive evidence, so a false
// green cannot hide behind the fixture: prompted rows are not proof, another
// tag's proof is not this hole's, and no rows is a gap that lowers nothing.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { loadWeaknessSignals, invalidateWeaknessSignals } from './weaknessSignalLoader';
import { boostFor } from './weaknessSignal';
import { PROVEN_MIN_IMPORTANCE, type CapabilityEvidenceRecord } from './capabilityEvidence';
import type { MisconceptionTagRecord } from '../types';

const TAG = 'neglected-development';
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

function slip(id: string, gameId: string): MisconceptionTagRecord {
  return {
    id, tag: TAG, source: 'auto-analysis', createdAt: Date.now() - 3 * 86_400_000,
    fen: FEN, playedSan: 'a3', bestSan: 'Bc4', cpLoss: 120, gamePhase: 'opening',
    moveNumber: 3, sourceGameId: gameId, status: 'open', masteryHits: 0,
    dueAt: Date.now() - 1000, counted: true,
  };
}

function held(id: string, gameId: string, over: Partial<CapabilityEvidenceRecord> = {}): CapabilityEvidenceRecord {
  return {
    id, tag: TAG, outcome: 'held', fen: FEN, playedSan: 'Bc4',
    posedImportance: PROVEN_MIN_IMPORTANCE + 5, recordedAt: Date.now() - 86_400_000,
    origin: 'review', prompted: false, sourceGameId: gameId, ...over,
  };
}

async function signalFor(tag: string) {
  invalidateWeaknessSignals();
  const sigs = await loadWeaknessSignals();
  const s = sigs.find((x) => x.clusterId === tag);
  expect(s, `the loader produced no signal for ${tag} — the fixture is broken, not the product`).toBeTruthy();
  return s!;
}

describe('C6 — the loader joins the positive record onto the signal', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    invalidateWeaknessSignals();
    await db.misconceptionTags.add(slip('m1', 'game-red'));
  });

  it('a PROVEN capability for the same tag — two clean answers across two games — lowers the signal to green', async () => {
    await db.capabilityEvidence.bulkAdd([held('h1', 'game-a'), held('h2', 'game-b')]);
    const s = await signalFor(TAG);
    expect(s.capabilityTag).toBe(TAG);
    expect(s.proven).toBe(true);
    expect(boostFor(s)).toBe(0);
  });

  it('NEGATIVE CONTROL — no positive rows at all: a gap in the record lowers nothing', async () => {
    const s = await signalFor(TAG);
    expect(s.proven).toBe(false);
    expect(boostFor(s)).toBeGreaterThan(0);
  });

  it('NEGATIVE CONTROL — PROMPTED answers are not proof; the coach cannot green its own teaching', async () => {
    await db.capabilityEvidence.bulkAdd([held('h1', 'game-a', { prompted: true }), held('h2', 'game-b', { prompted: true })]);
    const s = await signalFor(TAG);
    expect(s.proven).toBe(false);
    expect(boostFor(s)).toBeGreaterThan(0);
  });

  it('NEGATIVE CONTROL — proof of ANOTHER capability leaves this hole red', async () => {
    await db.capabilityEvidence.bulkAdd([
      held('h1', 'game-a', { tag: 'space-conceded' }),
      held('h2', 'game-b', { tag: 'space-conceded' }),
    ]);
    const s = await signalFor(TAG);
    expect(s.proven).toBe(false);
    expect(boostFor(s)).toBeGreaterThan(0);
  });

  it('NEGATIVE CONTROL — one game of clean answers is not proven (green claims "again NEXT time")', async () => {
    await db.capabilityEvidence.bulkAdd([held('h1', 'game-a'), held('h2', 'game-a')]);
    const s = await signalFor(TAG);
    expect(s.proven).toBe(false);
  });
});
