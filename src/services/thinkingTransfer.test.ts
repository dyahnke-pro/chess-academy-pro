import { describe, it, expect } from 'vitest';
import type { CapabilityEvidenceRecord, EvidenceOrigin } from './capabilityEvidence';
import {
  classifyStepTransfer, knowGreenSince, thinkingTransfer, transferCounts, transferGapLine, worstGap,
  TRANSFER_CLASSES, type TransferGame, type TransferSlip,
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
function row(over: Partial<CapabilityEvidenceRecord> & { origin: EvidenceOrigin }): CapabilityEvidenceRecord {
  n += 1;
  return {
    id: `r${n}`, tag: 'missed-tactic', outcome: 'held', fen: FENS[n % FENS.length], playedSan: 'a1',
    posedImportance: 100, recordedAt: T0, prompted: false, ...over,
  };
}

/** Two clean lesson answers on two different boards = KNOW green (the one bar). */
const knownAt = (at: number): CapabilityEvidenceRecord[] => [
  row({ origin: 'lesson', fen: FENS[0], recordedAt: at - 1 }),
  row({ origin: 'lesson', fen: FENS[1], recordedAt: at }),
];

const games = (...days: number[]): TransferGame[] => days.map((d, i) => ({ id: `g${i}`, playedAt: T0 + d * DAY }));
const slip = (gameId: string, tag = 'missed-tactic'): TransferSlip => ({ tag, gameId });

const classify = (evidence: CapabilityEvidenceRecord[], g: TransferGame[], s: TransferSlip[]) =>
  classifyStepTransfer({ step: 'forcing-moves', evidence, useProfile: new Map(), games: g, slips: s });

describe('knowGreenSince — when the step went green, replayed through the one bar', () => {
  it('is the answer that made it green, and null while it is not', () => {
    expect(knowGreenSince(knownAt(T0 + 10 * DAY), ['missed-tactic'])).toBe(T0 + 10 * DAY);
    expect(knowGreenSince([row({ origin: 'lesson', recordedAt: T0 })], ['missed-tactic'])).toBeNull();
  });

  it('a break ends the green run; the next run starts where it went green again', () => {
    const rows = [
      ...knownAt(T0 + DAY),
      row({ origin: 'lesson', outcome: 'broken', recordedAt: T0 + 2 * DAY }),
      row({ origin: 'lesson', fen: FENS[0], recordedAt: T0 + 3 * DAY }),
      row({ origin: 'lesson', fen: FENS[2], recordedAt: T0 + 4 * DAY }),
    ];
    expect(knowGreenSince(rows, ['missed-tactic'])).toBe(T0 + 4 * DAY);
  });

  it('game rows never make a step KNOWN', () => {
    const rows = [row({ origin: 'play', sourceGameId: 'a', recordedAt: T0 }), row({ origin: 'play', sourceGameId: 'b', recordedAt: T0 + 1 })];
    expect(knowGreenSince(rows, ['missed-tactic'])).toBeNull();
  });
});

describe('classifyStepTransfer — KNOW against USE', () => {
  const greenDay = 10;

  it('transferred: the mistake dropped in games after the step went green', () => {
    const g = games(1, 2, 11, 12);
    const t = classify(knownAt(T0 + greenDay * DAY), g, [slip('g0'), slip('g1'), slip('g2')]);
    expect(t.before).toEqual({ games: 2, slips: 2 });
    expect(t.after).toEqual({ games: 2, slips: 1 });
    expect(t.cls).toBe('transferred');
  });

  it('known-not-used: known in lessons, the slips keep coming at the same rate', () => {
    const t = classify(knownAt(T0 + greenDay * DAY), games(1, 11), [slip('g0'), slip('g1')]);
    expect(t.cls).toBe('known-not-used');
  });

  it('known-not-used with no baseline: slips after green and no games before', () => {
    expect(classify(knownAt(T0 + greenDay * DAY), games(11), [slip('g0')]).cls).toBe('known-not-used');
  });

  it('only the step\'s own tags count as its slips', () => {
    const t = classify(knownAt(T0 + greenDay * DAY), games(1, 11), [slip('g0'), slip('g1', 'hung-material')]);
    expect(t.after.slips).toBe(0);
    expect(t.cls).toBe('transferred');
  });

  it('unmeasured: known, but no game since — absent is not evidence', () => {
    expect(classify(knownAt(T0 + greenDay * DAY), games(1, 2), [slip('g0')]).cls).toBe('unmeasured');
  });

  it('unmeasured: games since, no slips either side, and the game reading has not proven it', () => {
    expect(classify(knownAt(T0 + greenDay * DAY), games(11), []).cls).toBe('unmeasured');
  });

  it('transferred when the game reading itself proves the step and no slips came since', () => {
    const use = new Map([['missed-tactic' as const, { held: 2, broken: 0, heldStreak: 2, streakGames: 2 }]]);
    const t = classifyStepTransfer({ step: 'forcing-moves', evidence: knownAt(T0 + greenDay * DAY), useProfile: use, games: games(11), slips: [] });
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
  it('classes every step, and the counts add up', () => {
    const all = thinkingTransfer({ evidence: knownAt(T0 + 10 * DAY), games: games(1, 11), slips: [slip('g0'), slip('g1')] });
    expect(all.map((t) => t.step)).toEqual([...THINKING_STEP_ORDER]);
    const counts = transferCounts(all);
    expect(Object.keys(counts)).toEqual([...TRANSFER_CLASSES]);
    expect(TRANSFER_CLASSES.reduce((s, c) => s + counts[c], 0)).toBe(all.length);
    // missed-tactic is trained by three steps; each is known and still slips.
    // missed-tactic is the ONLY tag of forcing-moves and hit-two: both known,
    // both still slipping. their-targets also trains greedy-pawn-grab, never
    // proven, so it is asked-but-not-known.
    expect(all.filter((t) => t.cls === 'known-not-used').map((t) => t.step)).toEqual(['forcing-moves', 'hit-two']);
    expect(all.find((t) => t.step === 'their-targets')?.cls).toBe('not-known');
    expect(counts.grey).toBe(all.length - 3);
  });

  it('worstGap names the known step whose games slip the most, and the line says it', () => {
    const all = thinkingTransfer({ evidence: knownAt(T0 + 10 * DAY), games: games(1, 11), slips: [slip('g0'), slip('g1')] });
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
    expect(worstGap(thinkingTransfer({ evidence: [], games: [], slips: [] }))).toBeNull();
  });
});
