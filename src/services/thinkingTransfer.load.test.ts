import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../db/schema';
import type { CapabilityEvidenceRecord } from './capabilityEvidence';
import type { GameRecord, MisconceptionTagRecord } from '../types';
import {
  finishThinkingLesson, gamePlayedAt, habitPendingFrom, loadThinkingTransfer, lessonStepForCard,
  resetTransferReportForTests, type PlannedLesson,
} from './thinkingLessonStart';
import { onThinkingTransfer, resetThinkingTransferListeners, type ThinkingTransferRow } from './thinkingTransferEvents';
import { BUILT_THINKING_STEPS } from './thinkingSteps.built';

const FENS = ['4k3/8/8/8/8/8/8/R3K3 w - - 0 1', '4k3/8/8/8/8/8/8/1R2K3 w - - 0 1'];
const GREEN_AT = Date.UTC(2026, 0, 10);

const lessonRow = (i: number): CapabilityEvidenceRecord => ({
  id: `k${i}`, tag: 'missed-tactic', outcome: 'held', fen: FENS[i], playedSan: 'a1',
  posedImportance: 100, recordedAt: GREEN_AT - 1 + i, origin: 'lesson', prompted: false,
});
const game = (id: string, date: string, over: Partial<GameRecord> = {}): GameRecord =>
  ({ id, pgn: '', white: 'me', black: 'them', result: '1-0', date, event: '', eco: null, whiteElo: null, blackElo: null, source: 'lichess', isMasterGame: false, ...over }) as unknown as GameRecord;
const slipRow = (id: string, gameId: string, over: Partial<MisconceptionTagRecord> = {}): MisconceptionTagRecord =>
  ({ id, tag: 'missed-tactic', source: 'auto', createdAt: Date.now(), fen: FENS[0], sourceGameId: gameId, status: 'open', masteryHits: 0, ...over }) as unknown as MisconceptionTagRecord;

async function seedGap(): Promise<void> {
  await db.capabilityEvidence.bulkAdd([lessonRow(0), lessonRow(1)]);
  await db.games.bulkAdd([
    game('before', '2026.01.02'),
    game('after', '2026-01-20'),
    game('demo', '2026.01.21', { fixture: true }),
    game('master', '2026.01.22', { isMasterGame: true }),
    game('unanalysed', '2026.01.23'),
  ]);
  await db.misconceptionTags.bulkAdd([
    slipRow('s1', 'before'), slipRow('s2', 'after'),
    slipRow('s3', 'demo'), slipRow('s4', 'master'),
    slipRow('s5', 'after', { counted: false }),
  ]);
}

describe('loadThinkingTransfer — the I/O door', () => {
  let rows: ThinkingTransferRow[];
  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
    resetTransferReportForTests();
    resetThinkingTransferListeners();
    rows = [];
    onThinkingTransfer((r) => rows.push(r));
  });
  afterEach(() => resetThinkingTransferListeners());

  it('reads KNOW from lessons and USE from slips by game DATE, and emits the distribution', async () => {
    await seedGap();
    const all = await loadThinkingTransfer();
    const forcing = all.find((t) => t.step === 'forcing-moves')!;
    // Demo, master, unanalysed and display-only rows never count.
    expect(forcing.before).toEqual({ games: 1, slips: 1 });
    expect(forcing.after).toEqual({ games: 1, slips: 1 });
    expect(forcing.cls).toBe('known-not-used');
    expect(rows).toHaveLength(1);
    expect(rows[0].games).toBe(2);
    expect(rows[0].steps).toHaveLength(all.length);
    expect(Object.values(rows[0].counts).reduce((a, b) => a + b, 0)).toBe(all.length);
    // An unchanged reading is not re-reported inside the window.
    await loadThinkingTransfer();
    expect(rows).toHaveLength(1);
  });

  it('a fresh device reads all grey and still emits', async () => {
    const all = await loadThinkingTransfer();
    expect(all.every((t) => t.cls === 'grey')).toBe(true);
    expect(rows[0]?.counts.grey).toBe(all.length);
  });

  it('the habit gate marks known-not-used steps only, and a fresh card is unchanged', async () => {
    const all = await loadThinkingTransfer();
    expect(BUILT_THINKING_STEPS.some((s) => habitPendingFrom(all)(s))).toBe(false);
    const pendingAll = habitPendingFrom(all.map((t) => ({ ...t, cls: 'known-not-used' as const })));
    expect(BUILT_THINKING_STEPS.every((s) => pendingAll(s))).toBe(true);
    expect((await lessonStepForCard([], false, all))?.reason).toBe('next-unknown');
  });

  it('the lesson close names the gap when no tier opened', async () => {
    await seedGap();
    const plan = { kit: { step: 'am-i-safe' }, reason: 'next-unknown', openTier: 1, candidates: [], available: () => true, standingBefore: new Map(), gameWeight: () => 0 } as unknown as PlannedLesson;
    const line = await finishThinkingLesson(plan, 'test');
    expect(line).toMatch(/lessons/i);
    expect(line).toMatch(/your games/i);
  });

  it('the lesson close says nothing extra on a fresh record', async () => {
    const plan = { kit: { step: 'am-i-safe' }, reason: 'next-unknown', openTier: 1, candidates: [], available: () => true, standingBefore: new Map(), gameWeight: () => 0 } as unknown as PlannedLesson;
    // The close still names what is next; no gap wording on a fresh record.
    expect(await finishThinkingLesson(plan, 'test')).not.toMatch(/your games/i);
  });
});

describe('gamePlayedAt', () => {
  it('reads PGN and ISO dates, and refuses a non-date', () => {
    expect(gamePlayedAt('2026.01.02')).toBe(Date.parse('2026-01-02'));
    expect(gamePlayedAt('2026-01-20T10:00:00Z')).toBe(Date.parse('2026-01-20T10:00:00Z'));
    expect(gamePlayedAt('????.??.??')).toBeNull();
    expect(gamePlayedAt(null)).toBeNull();
  });
});
