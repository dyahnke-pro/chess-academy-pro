import { describe, expect, it } from 'vitest';
import type { MisconceptionTagRecord } from '../types';
import { capabilityProven, summariseEvidence, type CapabilityEvidenceRecord } from './capabilityEvidence';
import { heatMap, holdRecords, holdState, HOLD_MIN_POSED, HOLD_WINDOW, type HoldRecord } from './heatMap';
import { studentRecordFrom } from './studentRecord';
import { fadeLevelsFrom } from './fadeText';
import { threatVoice } from './learnRecordTerms';
import { davidEvidence, davidSlips, davidNow } from './__fixtures__/davidRecord';

// THE HOLD RATE (David 2026-10-19, "Agreed"), proven on his real record. Under
// the old rule ("green wins over open slips": a held streak of 2 across 2
// games) the profile called hung-material, missed-tactic and
// missed-opponents-threat PROVEN while his record held 1,428 / 451 / 259 open
// misses for them — so the fade clipped them and a simple threat went silent.

const record = studentRecordFrom([], davidEvidence, davidSlips, davidNow);
const caps = summariseEvidence(davidEvidence);
const fade = fadeLevelsFrom(record.heat);

describe("the hold rate on David's drop", () => {
  it.each([
    ['hung-material', 0.7],
    ['missed-tactic', 0.15],
    ['missed-opponents-threat', 0.55],
  ] as const)('%s: the old streak said proven; held under 75% of the last 20 → red, taught in full, every threat spoken', (tag, rate) => {
    expect(capabilityProven(caps.get(tag))).toBe(true);     // the old green
    const tile = record.heat.get(tag);
    expect(tile?.hold.posed).toBe(HOLD_WINDOW);
    expect(tile?.hold.rate).toBeCloseTo(rate, 5);
    expect(tile?.state).toBe('red');
    expect(fade.get(tag)).toBeUndefined();
    expect(threatVoice(tile!.state, 'simple').voice).toBe('full');
  });
  it.each([
    ['missed-their-fork', 0.9],
    ['missed-their-pin', 0.95],
  ] as const)('%s: held ≥ 90% of the last 20 → green; a simple threat goes quiet', (tag, rate) => {
    const tile = record.heat.get(tag);
    expect(tile?.hold.rate).toBeCloseTo(rate, 5);
    expect(tile?.state).toBe('green');
    expect(fade.get(tag)).toBe('short');
    expect(threatVoice('green', 'simple').voice).toBe('quiet');
  });
  it('a skill never posed is grey and taught in full', () => {
    expect(record.heat.get('poisoned-pawn')?.state).toBe('grey');
    expect(fade.get('poisoned-pawn')).toBeUndefined();
  });
});

// ─── The rule itself, on small built records ───────────────────────────────

const FEN = (move: number): string => `rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 ${move}`;
const row = (outcome: 'held' | 'broken', game: string, move: number, at = move): CapabilityEvidenceRecord => ({
  id: `${game}:${move}:${outcome}`, tag: 'hung-material', outcome, fen: FEN(move), playedSan: 'e5',
  posedImportance: 90, recordedAt: at, origin: 'review', prompted: false, sourceGameId: game,
});
const slip = (game: string, move: number, createdAt = 1e13): MisconceptionTagRecord => ({
  id: `s:${game}:${move}`, tag: 'hung-material', source: 'auto-analysis', createdAt, fen: FEN(move),
  sourceGameId: game, status: 'open',
} as MisconceptionTagRecord);
const hold = (ev: CapabilityEvidenceRecord[], sl: MisconceptionTagRecord[] = []): HoldRecord =>
  holdRecords(ev, sl).get('hung-material')!;

describe('the hold-rate rule', () => {
  it('a miss is counted ONCE: a broken row and a slip on the same game + ply are one miss', () => {
    const ev = [...Array.from({ length: 9 }, (_, i) => row('held', 'g', i + 1)), row('broken', 'g', 10)];
    expect(hold(ev, [slip('g', 10)])).toMatchObject({ posed: 10, held: 9, missed: 1 });
    // A slip on a different ply is its own miss.
    expect(hold(ev, [slip('g', 11)])).toMatchObject({ posed: 11, missed: 2 });
  });
  it('fewer than 8 posed is grey, however clean', () => {
    const seven = Array.from({ length: HOLD_MIN_POSED - 1 }, (_, i) => row('held', `g${i}`, 1));
    expect(holdState(hold(seven))).toBe('grey');
    expect(holdState(hold([...seven, row('held', 'g9', 1)]))).toBe('green');
  });
  it('only the last 20 count: old misses age out', () => {
    const old = Array.from({ length: 10 }, (_, i) => row('broken', `old${i}`, 1, i));
    const recent = Array.from({ length: 20 }, (_, i) => row('held', `new${i}`, 1, 100 + i));
    expect(hold([...old, ...recent])).toMatchObject({ posed: 20, held: 20, rate: 1 });
  });
  it("a slip sorts by its GAME's time, not by when it was analysed", () => {
    // Game "a" was played first (evidence at t=1); its slip was analysed late.
    const ev = [row('held', 'a', 1, 1), ...Array.from({ length: 20 }, (_, i) => row('held', `b${i}`, 1, 10 + i))];
    expect(hold(ev, [slip('a', 2, 1e13)]).missed).toBe(0);     // aged out with its game
  });
  it('75–89% is SHORT: the fade says the lighter line, a threat one short line', () => {
    const ev = Array.from({ length: 20 }, (_, i) => row(i < 4 ? 'broken' : 'held', `g${i}`, 1, i));
    const tile = heatMap(ev, []).find((t) => t.tag === 'hung-material')!;
    expect(tile.hold.rate).toBe(0.8);
    expect(tile.state).toBe('short');
    expect(fadeLevelsFrom(new Map([[tile.tag, tile]])).get(tile.tag)).toBe('lighter');
    expect(threatVoice('short', 'simple').voice).toBe('short');
    expect(threatVoice('short', 'hidden').voice).toBe('short');
  });
});
