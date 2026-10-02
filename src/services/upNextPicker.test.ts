import { describe, it, expect } from 'vitest';
import { rankUpNext, currentPick, WEAKNESS_BITE, type UpNextInput } from './upNextPicker';
import type { RepCandidate } from './trainingPlanSelector';

const weak: RepCandidate = { kind: 'weakness', key: 'weakness:hung-material:Hung a piece', label: 'Hung a piece or pawn', subtitle: '', tag: 'hung-material', puzzleThemes: ['hangingPiece'] };
const srs: RepCandidate = { kind: 'srs', key: 'srs:italian-game', label: 'Italian Game', subtitle: '', openingId: 'italian-game' };
const base: UpNextInput = { reps: [], latestGameSlip: null, grownPuzzle: null, freeOpeningOpen: false, coldStart: false };

describe('upNextPicker', () => {
  it('a first visit leads with a 60-second Deep Run', () => {
    const r = rankUpNext({ ...base, coldStart: true });
    expect(r[0].kind).toBe('deep-run');
    expect(r[0].path).toBe('/tactics/deep-run');
  });

  it('the latest game slip leads, then the weakness, then the opening', () => {
    const r = rankUpNext({ ...base, reps: [weak, srs], latestGameSlip: { puzzleId: 'p1', opponent: 'Rainbow', cpLoss: 300 } });
    expect(r.map((p) => p.kind).slice(0, 3)).toEqual(['game-slip', 'weakness', 'opening']);
    expect(r[0].reason).toContain('Rainbow');
  });

  it('every bite is short: a weakness asks for TWO puzzles, not a session', () => {
    const w = rankUpNext({ ...base, reps: [weak] }).find((p) => p.kind === 'weakness');
    expect(w?.state?.repCap).toBe(WEAKNESS_BITE);
    expect(w?.state?.repKey).toBe(w?.key);
  });

  it('the free opening only appears when a slot is open', () => {
    expect(rankUpNext(base).some((p) => p.kind === 'free-opening')).toBe(false);
    expect(rankUpNext({ ...base, freeOpeningOpen: true }).some((p) => p.kind === 'free-opening')).toBe(true);
  });

  it('there is always something to do, and Up next skips what is done', () => {
    const r = rankUpNext({ ...base, reps: [weak] });
    expect(r.length).toBeGreaterThan(0);
    const first = currentPick(r, new Set());
    const second = currentPick(r, new Set([first!.key]));
    expect(second?.key).not.toBe(first?.key);
  });

  it('keys are unique', () => {
    const r = rankUpNext({ ...base, reps: [weak, srs], coldStart: true, freeOpeningOpen: true });
    expect(new Set(r.map((p) => p.key)).size).toBe(r.length);
  });
  it('every puzzle bite opens straight onto a puzzle — a start screen is a bite with no finish line', () => {
    const r = rankUpNext({ ...base, reps: [weak, srs], coldStart: true, freeOpeningOpen: true });
    const puzzleBites = r.filter((p) => p.path === '/tactics/adaptive' || p.path === '/tactics/long');
    expect(puzzleBites.length).toBeGreaterThanOrEqual(2);
    for (const p of puzzleBites) expect((p.state as { autoStart?: boolean } | undefined)?.autoStart).toBe(true);
  });
});
