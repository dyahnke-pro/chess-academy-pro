import { describe, expect, it } from 'vitest';
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import type { HoldRecord } from '../../services/holdRate';
import { summariseEvidence } from '../../services/capabilityEvidence';
import { davidEvidence, davidSlips } from '../../services/__fixtures__/davidRecord';
import { pickFocus, pooledHold, type FocusPickInput } from './focusPicker';
import { UNANNOUNCED_LINE } from './focusCard';

const rec = (held: number, missed: number): HoldRecord => ({ posed: held + missed, held, heldWeight: held, missed, rate: held + missed > 0 ? held / (held + missed) : null });
const GREEN = rec(19, 1);
const SHORT = rec(16, 4);
const RED = rec(5, 15);

const input = (holds: Partial<Record<MisconceptionTagId, HoldRecord>>, over: Partial<FocusPickInput> = {}): FocusPickInput => ({
  holds: new Map(Object.entries(holds) as Array<[MisconceptionTagId, HoldRecord]>),
  recentMisses: new Map(),
  last: null,
  lastTaught: {},
  ...over,
});

const LOOSE_GREEN = { 'hung-material': GREEN, 'missed-opponents-threat': GREEN, 'missed-tactic': GREEN } as const;

describe('pickFocus — the record decides', () => {
  it('a fresh record (all grey) starts the ladder: loose pieces, named, with why', () => {
    const p = pickFocus(input({}));
    expect(p).toMatchObject({ focus: 'loose-pieces', state: 'grey', mode: 'teach', reason: 'grey', announced: true });
    expect(p.line).toBe('Today: loose pieces, yours and theirs. It is the first thing every strong player checks.');
  });
  it('the ladder gate: with loose pieces red, nothing else can be picked — even a redder tactics record', () => {
    const p = pickFocus(input({ 'hung-material': RED, 'missed-their-fork': rec(0, 20) }, { recentMisses: new Map([['missed-their-fork', 9]]) }));
    expect(p.focus).toBe('loose-pieces');
  });
  it('once loose pieces holds, the red focus with the most recent misses is picked', () => {
    const p = pickFocus(input({ ...LOOSE_GREEN, 'missed-their-pin': RED, 'king-stuck-center': RED },
      { recentMisses: new Map([['king-stuck-center', 4], ['missed-their-pin', 1]]) }));
    expect(p).toMatchObject({ focus: 'kings', reason: 'red', weakerSeat: 'defend' });
    expect(p.line).toBe('Today: the kings — yours and theirs. In your last few games, your king got caught four times.');
  });
  it('last game\'s focus continues while it is still red or short, and says how it went', () => {
    const p = pickFocus(input({ 'hung-material': SHORT, 'missed-opponents-threat': SHORT, 'missed-tactic': SHORT }, { last: { focus: 'loose-pieces', found: 2, chances: 5 } }));
    expect(p).toMatchObject({ focus: 'loose-pieces', reason: 'continue', state: 'short', mode: 'test', announced: false });
    // Short is unannounced: the user is not told what is watched.
    expect(p.line).toBe(UNANNOUNCED_LINE);
  });
  it('a red continued focus names last game\'s result', () => {
    const p = pickFocus(input({ 'hung-material': RED }, { last: { focus: 'loose-pieces', found: 1, chances: 4 } }));
    expect(p.line).toBe('Today: loose pieces, yours and theirs. Last game you found one of four.');
  });
  it('never a green focus while another is open; grey comes before short', () => {
    const p = pickFocus(input({ ...LOOSE_GREEN, 'missed-their-fork': SHORT, 'missed-their-pin': SHORT, 'missed-their-skewer': SHORT, 'missed-their-discovery': SHORT, 'calculation-depth': SHORT }));
    // Tactics pools missed-tactic (green) with the short ones: short. The kings: grey.
    expect(p.focus).toBe('kings');
    expect(p.reason).toBe('grey');
  });
  it('every focus green: the least recently taught, as a silent watch', () => {
    const allGreen = Object.fromEntries((['hung-material', 'missed-opponents-threat', 'missed-tactic', 'calculation-depth', 'missed-their-fork', 'missed-their-pin', 'missed-their-skewer', 'missed-their-discovery', 'king-stuck-center', 'weakened-king-safety', 'missed-their-mate', 'overvalued-attack'] as const).map((t) => [t, GREEN]));
    const p = pickFocus(input(allGreen, { lastTaught: { 'loose-pieces': 30, tactics: 10, kings: 20 } }));
    expect(p).toMatchObject({ focus: 'tactics', reason: 'all-green', mode: 'watch', announced: false });
  });
  it('a steered hold counts half in the pooled rate', () => {
    const h = pooledHold(['hung-material'], new Map([['hung-material', { posed: 10, held: 10, heldWeight: 5, missed: 5, rate: 0.5 }]]));
    expect(h.rate).toBeCloseTo(0.5, 5);
  });
});

describe("pickFocus on David's real record (drop 2026-10-19 fixture)", () => {
  it('loose pieces, red, named before the game', () => {
    const caps = summariseEvidence(davidEvidence, davidSlips);
    const holds = new Map([...caps.entries()].map(([t, e]) => [t, e.hold] as const));
    const p = pickFocus({ holds, recentMisses: new Map(), last: null, lastTaught: {} });
    expect(p.focus).toBe('loose-pieces');
    expect(p.mode).toBe('teach');
    expect(p.announced).toBe(true);
  });
});
