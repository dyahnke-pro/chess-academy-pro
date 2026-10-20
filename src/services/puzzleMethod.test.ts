import { describe, it, expect } from 'vitest';
import { puzzleMethodLine, cpFromThemes, type StudentRecord } from './puzzleMethod';
import type { MethodHabit } from './methodBeat';
import type { WeaknessSignal } from './weaknessSignal';

const COLD: StudentRecord = { weaknesses: [], capabilities: null, heat: new Map() };

function tacticHole(over: Partial<WeaknessSignal>): StudentRecord {
  const w = {
    clusterId: 'analysis:tactic:fork', bucket: 'tactical', label: 'Forks',
    openCount: 4, severity: 60, puzzleThemes: ['fork'], total: 4, ...over,
  } as WeaknessSignal;
  return { weaknesses: [w], capabilities: null, heat: new Map() };
}

describe('puzzleMethodLine — a habit only when the puzzle earns it', () => {
  it('a quiet answer (Qc5 guarding d6) gets no "checks and captures" advice', () => {
    expect(puzzleMethodLine('Qc5', 197, new Set<MethodHabit>(), COLD)).toBeNull();
  });

  it('a forcing answer with a real swing teaches the forcing scan, once', () => {
    const said = new Set<MethodHabit>();
    const first = puzzleMethodLine('Nxd6#', 300, said, COLD);
    expect(first).toMatch(/check|capture/i);
    expect(puzzleMethodLine('Rxe8+', 300, said, COLD)).toBeNull(); // said once per session
  });

  it('a small swing is not worth the habit — for a student with no record', () => {
    expect(puzzleMethodLine('Bxf7+', 40, new Set<MethodHabit>(), COLD)).toBeNull();
  });

  it('THE WHOLE RECORD decides: an open tactic hole from their games lowers the bar', () => {
    // Same puzzle, same 40cp — the student whose own games keep missing
    // tactics hears the habit; the cold student above does not.
    expect(puzzleMethodLine('Bxf7+', 40, new Set<MethodHabit>(), tacticHole({}))).toMatch(/check|capture/i);
  });

  it('a habit their record says they have fixed is not re-taught', () => {
    const fixed = tacticHole({ lifecycleStatus: 'fixed' });
    expect(puzzleMethodLine('Nxd6#', 300, new Set<MethodHabit>(), fixed)).toBeNull();
  });
});

describe('cpFromThemes — the Lichess tag says how much the answer wins', () => {
  it('reads decisive and clear-edge tags, and nothing else', () => {
    expect(cpFromThemes(['mate', 'mateIn1'])).toBe(300);
    expect(cpFromThemes(['crushing', 'fork'])).toBe(300);
    expect(cpFromThemes(['advantage', 'pin'])).toBe(150);
    expect(cpFromThemes(['endgame'])).toBeNull();
  });
});

describe('puzzleRecallLine — the loop on a puzzle (2026-10-15)', () => {
  const NOW_GAMES = [
    { gameId: 'g2', opponentName: 'Carlsen, M.', playedAt: Date.now() - 86_400_000 },
    { gameId: 'g1', opponentName: 'Svidler, P.', playedAt: Date.now() - 20 * 86_400_000 },
  ];
  const forks = {
    clusterId: 'analysis:tactic:fork', capabilityTag: null, proven: false, bucket: 'tactical',
    label: 'Forks', openCount: 2, severity: 40, puzzleThemes: ['fork'], total: 2, games: NOW_GAMES,
  } as unknown as WeaknessSignal;
  const record = { weaknesses: [forks], capabilities: null, heat: new Map() };

  it('solved clean on a motif their games failed: held, said once', async () => {
    const { puzzleRecallLine } = await import('./puzzleMethod');
    const memory = new Set<string>();
    expect(puzzleRecallLine('fork', 'clean', record, memory)).toMatch(/^That one has caught you before — forks — the last one was against Carlsen, M\. .*This time you held it\.$/);
    expect(puzzleRecallLine('fork', 'clean', record, memory)).toBeNull();
  });

  it('missed: names the games, never "the Nth game now" (a puzzle is no game)', async () => {
    const { puzzleRecallLine } = await import('./puzzleMethod');
    const line = puzzleRecallLine('fork', 'missed', record, new Set());
    expect(line).toMatch(/^The same pattern has caught you in your games — forks/);
    expect(line).not.toMatch(/game now/);
  });

  it('helped, an unrecorded motif or a fresh record: nothing', async () => {
    const { puzzleRecallLine } = await import('./puzzleMethod');
    expect(puzzleRecallLine('fork', 'helped', record, new Set())).toBeNull();
    expect(puzzleRecallLine('pin', 'clean', record, new Set())).toBeNull();
    expect(puzzleRecallLine('fork', 'clean', { weaknesses: [], capabilities: null, heat: new Map() }, new Set())).toBeNull();
  });
});
