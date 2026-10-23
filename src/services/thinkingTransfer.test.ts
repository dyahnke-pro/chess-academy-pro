import { describe, it, expect } from 'vitest';
import type { CapabilityEvidenceRecord, EvidenceOrigin } from './capabilityEvidence';
import {
  classifyStepTransfer, knowGreenSince, thinkingTransfer, transferCounts, transferGapLine, worstGap,
  TRANSFER_CLASSES, TRANSFER_MIN_GAMES, type TransferGame, type TransferSlip,
} from './thinkingTransfer';
import { THINKING_STEP_ORDER } from './thinkingSteps';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);
const FENS = [
  '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
  '4k3/8/8/8/8/8/8/1R2K3 w - - 0 1',
  '4k3/8/8/8/8/8/8/2R1K3 w - - 0 1',
];

let n = 0;
/** A lesson row answers a STEP's question (`questionId`); game rows answer none. */
function row(over: Partial<CapabilityEvidenceRecord> & { origin: EvidenceOrigin }, step = 'forcing-moves'): CapabilityEvidenceRecord {
  n += 1;
  const answer = over.origin === 'lesson'
    ? { taps: [], extras: [], wrongAttempts: 0, msToFirst: null, msBetween: [], help: 'none' as const, spoken: false, chainDepth: 0, wrongTags: [], questionId: step, surface: 'thinking-lesson' }
    : undefined;
  return {
    id: `r${n}`, tag: 'missed-tactic', outcome: 'held', fen: FENS[n % FENS.length], playedSan: 'a1',
    posedImportance: 100, recordedAt: T0, prompted: false, ...(answer ? { answer } : {}), ...over,
  };
}

/** Eight clean lesson answers to `step` = KNOW green (the one bar: ≥ 90% of
 *  the last 20 posed, at least 8). The last one lands at `at`. */
const knownAt = (at: number, step = 'forcing-moves'): CapabilityEvidenceRecord[] =>
  Array.from({ length: 8 }, (_, i) => row({ origin: 'lesson', fen: FENS[i % FENS.length], recordedAt: at - 7 + i }, step));

const games = (...days: number[]): TransferGame[] => days.map((d, i) => ({ id: `g${i}`, playedAt: T0 + d * DAY }));
/** `count` games, one a day from `fromDay`. */
const run = (fromDay: number, count: number): number[] => Array.from({ length: count }, (_, i) => fromDay + i);
const M = TRANSFER_MIN_GAMES;
const slip = (gameId: string, tag = 'missed-tactic'): TransferSlip => ({ tag, gameId });

const classify = (evidence: CapabilityEvidenceRecord[], g: TransferGame[], s: TransferSlip[]) =>
  classifyStepTransfer({ step: 'forcing-moves', evidence, useProfile: new Map(), games: g, slips: s });

describe('knowGreenSince — when the step went green, replayed through the one bar', () => {
  it('is the answer that made it green, and null while it is not', () => {
    expect(knowGreenSince(knownAt(T0 + 10 * DAY), 'forcing-moves')).toBe(T0 + 10 * DAY);
    expect(knowGreenSince([row({ origin: 'lesson', recordedAt: T0 })], 'forcing-moves')).toBeNull();
  });

  it('a break ends the green run; the next run starts where it went green again', () => {
    const rows = [
      ...knownAt(T0 + DAY),
      row({ origin: 'lesson', outcome: 'broken', recordedAt: T0 + 2 * DAY }),   // 8 of 9: short
      row({ origin: 'lesson', fen: FENS[0], recordedAt: T0 + 3 * DAY }),          // 9 of 10: green
      row({ origin: 'lesson', fen: FENS[2], recordedAt: T0 + 4 * DAY }),
    ];
    expect(knowGreenSince(rows, 'forcing-moves')).toBe(T0 + 3 * DAY);
  });

  it('game rows never make a step KNOWN', () => {
    const rows = [row({ origin: 'play', sourceGameId: 'a', recordedAt: T0 }), row({ origin: 'play', sourceGameId: 'b', recordedAt: T0 + 1 })];
    expect(knowGreenSince(rows, 'forcing-moves')).toBeNull();
  });
});

describe('a step is proven only by its OWN answers (2026-10-23)', () => {
  it('answers to "their targets" never make "forcing moves" known, though they share missed-tactic', () => {
    expect(knowGreenSince(knownAt(T0 + 10 * DAY, 'their-targets'), 'forcing-moves')).toBeNull();
    expect(classify(knownAt(T0 + 10 * DAY, 'their-targets'), games(1), []).cls).toBe('grey');
  });
});

describe('a motif row counts toward the skill it refines (WO-MOTIFS-01)', () => {
  it('a "you missed a fork" slip is a missed shot for my forcing moves', () => {
    const g = games(...run(15, M));
    const t = classify(knownAt(T0 + 10 * DAY), g, [slip('g0', 'missed-your-fork')]);
    expect(t.greenAt).toBe(T0 + 10 * DAY);
    expect(t.after).toEqual({ games: M, slips: 1 });
    expect(t.cls).toBe('known-not-used');
  });
});

describe('classifyStepTransfer — KNOW against USE', () => {
  const greenDay = 10;

  // Games g0..g(M-1) are before green (days 1..M), g(M)..g(2M-1) after (days 11..).
  const beforeAfter = games(...run(1, M), ...run(11, M));
  const after0 = `g${M}`;

  it('transferred: the mistake dropped in games after the step went green', () => {
    const t = classify(knownAt(T0 + greenDay * DAY), beforeAfter, [slip('g0'), slip('g1'), slip(after0)]);
    expect(t.before).toEqual({ games: M, slips: 2 });
    expect(t.after).toEqual({ games: M, slips: 1 });
    expect(t.cls).toBe('transferred');
  });

  it('known-not-used: known in lessons, the slips keep coming at the same rate', () => {
    const t = classify(knownAt(T0 + greenDay * DAY), beforeAfter, [slip('g0'), slip(after0)]);
    expect(t.cls).toBe('known-not-used');
  });

  it('known-not-used with no baseline: slips after green and no games before', () => {
    expect(classify(knownAt(T0 + greenDay * DAY), games(...run(11, M)), [slip('g0')]).cls).toBe('known-not-used');
  });

  it('only the step\'s own tags count as its slips', () => {
    const t = classify(knownAt(T0 + greenDay * DAY), beforeAfter, [slip('g0'), slip(after0, 'hung-material')]);
    expect(t.after.slips).toBe(0);
    expect(t.cls).toBe('transferred');
  });

  it('unmeasured: known, but no game since — absent is not evidence', () => {
    expect(classify(knownAt(T0 + greenDay * DAY), games(1, 2), [slip('g0')]).cls).toBe('unmeasured');
  });

  it('unmeasured, never a verdict, on a thin sample (2026-10-23: one clean game read "transferred")', () => {
    // The old rule: one game after green with no slip, against a slip before → transferred.
    expect(classify(knownAt(T0 + greenDay * DAY), games(1, 11), [slip('g0')]).cls).toBe('unmeasured');
    // One slip in one game after → known-not-used, and the step was never served again.
    expect(classify(knownAt(T0 + greenDay * DAY), games(1, 11), [slip('g1')]).cls).toBe('unmeasured');
    // A full window after but a thin baseline: no drop can be read off it.
    const t = classify(knownAt(T0 + greenDay * DAY), games(1, ...run(11, M)), [slip('g0')]);
    expect(t.cls).toBe('unmeasured');
  });

  it('unmeasured: games since, no slips either side, and the game reading has not proven it', () => {
    expect(classify(knownAt(T0 + greenDay * DAY), games(...run(11, M)), []).cls).toBe('unmeasured');
  });

  it('transferred when the game reading itself proves the step and no slips came since', () => {
    const use = new Map([['missed-tactic' as const, { held: 8, broken: 0, heldStreak: 8, streakGames: 2, hold: { posed: 8, held: 8, heldWeight: 8, missed: 0, rate: 1 } }]]);
    const t = classifyStepTransfer({ step: 'forcing-moves', evidence: knownAt(T0 + greenDay * DAY), useProfile: use, games: games(...run(11, M)), slips: [] });
    expect(t.useProven).toBe(true);
    expect(t.cls).toBe('transferred');
  });

  it('not-known when asked in lessons and not green; grey when never asked', () => {
    expect(classify([row({ origin: 'lesson', outcome: 'broken' })], games(1), [slip('g0')]).cls).toBe('not-known');
    expect(classify([], games(1), [slip('g0')]).cls).toBe('grey');
    // Being told the answer is not being asked.
    expect(classify([row({ origin: 'lesson', prompted: true })], [], []).cls).toBe('grey');
  });
});

describe('the whole routine', () => {
  const g = games(...run(1, M), ...run(11, M));
  const slipsBoth = [slip('g0'), slip(`g${M}`)];

  it('classes every step, and the counts add up', () => {
    const all = thinkingTransfer({ evidence: knownAt(T0 + 10 * DAY), useProfile: new Map(), games: g, slips: slipsBoth });
    expect(all.map((t) => t.step)).toEqual([...THINKING_STEP_ORDER]);
    const counts = transferCounts(all);
    expect(Object.keys(counts)).toEqual([...TRANSFER_CLASSES]);
    expect(TRANSFER_CLASSES.reduce((s, c) => s + counts[c], 0)).toBe(all.length);
    // Only forcing-moves was answered. missed-tactic is also a tag of
    // their-targets and hit-two, but they were never asked: grey, not known.
    expect(all.filter((t) => t.cls === 'known-not-used').map((t) => t.step)).toEqual(['forcing-moves']);
    expect(all.find((t) => t.step === 'hit-two')?.cls).toBe('grey');
    expect(all.find((t) => t.step === 'their-targets')?.cls).toBe('grey');
    expect(counts.grey).toBe(all.length - 1);
  });

  it('worstGap names the known step whose games slip the most, and the line says it', () => {
    const all = thinkingTransfer({ evidence: knownAt(T0 + 10 * DAY), useProfile: new Map(), games: g, slips: slipsBoth });
    const gap = worstGap(all);
    expect(gap?.cls).toBe('known-not-used');
    const line = transferGapLine(gap!);
    expect(line).toMatch(/lessons/i);
    expect(line).toMatch(/your games/i);
    expect(line).not.toMatch(/\b(we|our|us)\b/i);
    // Rotated, not rolled: the same reading says the same thing.
    expect(transferGapLine(gap!)).toBe(line);
  });

  it('no gap on a fresh record', () => {
    expect(worstGap(thinkingTransfer({ evidence: [], useProfile: new Map(), games: [], slips: [] }))).toBeNull();
  });
});
