import { describe, expect, it } from 'vitest';
import type { MisconceptionTagRecord } from '../types';
import type { MisconceptionTagId } from '../data/misconceptionTags';
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
const caps = summariseEvidence(davidEvidence, davidSlips);
/** The bar this replaced: a held streak of 2 across 2 games. */
const oldStreakGreen = (tag: MisconceptionTagId): boolean => {
  const e = caps.get(tag);
  return !!e && (e.streakCredit ?? e.heldStreak) >= 2 && e.streakGames >= 2;
};
const fade = fadeLevelsFrom(record.heat);

describe("the hold rate on David's drop", () => {
  it.each([
    ['missed-tactic', 3 / 19.5],
    ['missed-opponents-threat', 11 / 19],
  ] as const)('%s: the old streak said proven; held under 75% of the last 20 → red, taught in full, every threat spoken', (tag, rate) => {
    expect(oldStreakGreen(tag)).toBe(true);                // the old green
    expect(capabilityProven(caps.get(tag))).toBe(false);   // the one green now
    const tile = record.heat.get(tag);
    expect(tile?.hold.posed).toBe(HOLD_WINDOW);
    expect(tile?.hold.rate).toBeCloseTo(rate, 5);
    expect(tile?.state).toBe('red');
    expect(fade.get(tag)).toBeUndefined();
    expect(threatVoice(tile!.state, 'simple').voice).toBe('full');
  });
  it('hung-material: the old streak said proven; 14 held, 6 misses of which 3 inaccuracies (half each) → 76%, SHORT', () => {
    expect(oldStreakGreen('hung-material')).toBe(true);
    expect(capabilityProven(caps.get('hung-material'))).toBe(false);
    const tile = record.heat.get('hung-material');
    expect(tile?.hold).toMatchObject({ posed: 20, held: 14, missed: 4.5 });
    expect(tile?.state).toBe('short');
    expect(fade.get('hung-material')).toBe('lighter');
    expect(threatVoice(tile!.state, 'simple').voice).toBe('short');
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
const slip = (game: string, move: number, createdAt = 1e13, playedAt?: number): MisconceptionTagRecord => ({
  id: `s:${game}:${move}`, tag: 'hung-material', source: 'auto-analysis', createdAt, fen: FEN(move),
  ...(playedAt !== undefined ? { playedAt } : {}),
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
  it("a slip sorts by its GAME's played date, not by when it was analysed", () => {
    // Game "a" was played first; its slip was analysed long after.
    const ev = Array.from({ length: 20 }, (_, i) => row('held', `b${i}`, 1, 10 + i));
    expect(hold(ev, [slip('a', 2, 1e13, 1)]).missed).toBe(0);   // played first → aged out
    expect(hold(ev, [slip('a', 2, 1e13)]).missed).toBe(1);      // no played date → logged time
  });
  it('an inaccuracy slip is half a miss', () => {
    const ev = Array.from({ length: 9 }, (_, i) => row('held', `g${i}`, 1, i));
    expect(hold(ev, [{ ...slip('x', 3, 100), grade: 'inaccuracy' }])).toMatchObject({ posed: 10, held: 9, missed: 0.5 });
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

// ─── WO-LEARN-FOCUS-01: prompted both ways, one move once, steered half ─────

describe('the hold rate reads the moment honestly (WO-LEARN-FOCUS-01)', () => {
  it('a PROMPTED slip is filed but not counted — the miss half reads the flag the find half reads', () => {
    const ev = Array.from({ length: 9 }, (_, i) => row('held', `g${i}`, 1, i));
    // Before the fix a told miss still counted: the score could only drop.
    expect(hold(ev, [{ ...slip('x', 3, 100), prompted: true }])).toMatchObject({ posed: 9, held: 9, missed: 0 });
    expect(hold(ev, [slip('x', 3, 100)])).toMatchObject({ posed: 10, missed: 1 });
  });
  it('ONE MOVE POSES A SKILL ONCE across writers: a learn row and a review row of one move are one event', () => {
    const review = row('held', 'g', 5);
    const learn: CapabilityEvidenceRecord = { ...review, id: 'learn-row', origin: 'learn' };
    expect(hold([review, learn])).toMatchObject({ posed: 1, held: 1 });
    // …and a miss by either writer makes the move a miss.
    expect(hold([review, { ...learn, outcome: 'broken' }])).toMatchObject({ posed: 1, held: 0, missed: 1 });
  });
  it('rows with no game (puzzles) stay separate events', () => {
    const noGame = (i: number): CapabilityEvidenceRecord => ({ ...row('held', 'g', 5), id: `p${i}`, sourceGameId: undefined, origin: 'puzzle' });
    expect(hold([noGame(1), noGame(2)]).posed).toBe(2);
  });
  it('a STEERED hold counts half; a steered miss counts in full', () => {
    const steered = (outcome: 'held' | 'broken', game: string): CapabilityEvidenceRecord => ({ ...row(outcome, game, 1), steered: true });
    // 8 steered holds + 2 misses: 4 / (4 + 2) = 67% red, where unsteered it is 80% short.
    const ev = [...Array.from({ length: 8 }, (_, i) => steered('held', `s${i}`)), row('broken', 'm1', 1), row('broken', 'm2', 1)];
    const h = hold(ev);
    expect(h).toMatchObject({ posed: 10, held: 8, missed: 2 });
    expect(h.rate).toBeCloseTo(4 / 6, 5);
    expect(holdState(h)).toBe('red');
    const plain = hold([...Array.from({ length: 8 }, (_, i) => row('held', `s${i}`, 1)), row('broken', 'm1', 1), row('broken', 'm2', 1)]);
    expect(holdState(plain)).toBe('short');
    // A steered miss is a full miss.
    expect(hold([steered('broken', 'x')]).missed).toBe(1);
  });
});
