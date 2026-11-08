import { describe, it, expect } from 'vitest';
import { puzzleMethodLine, mistakeSlipRead, cpFromThemes, type StudentRecord } from './puzzleMethod';
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
    expect(puzzleMethodLine('Qc5', 197, new Set<MethodHabit>(), COLD, null)).toBeNull();
  });

  it('a forcing answer with a real swing teaches the forcing scan, once', () => {
    const said = new Set<MethodHabit>();
    const first = puzzleMethodLine('Nxd6#', 300, said, COLD, null);
    expect(first).toMatch(/check|capture/i);
    expect(puzzleMethodLine('Rxe8+', 300, said, COLD, null)).toBeNull(); // said once per session
  });

  it('a small swing is not worth the habit — for a student with no record', () => {
    expect(puzzleMethodLine('Bxf7+', 40, new Set<MethodHabit>(), COLD, null)).toBeNull();
  });

  it('THE WHOLE RECORD decides: an open tactic hole from their games lowers the bar', () => {
    // Same puzzle, same 40cp — the student whose own games keep missing
    // tactics hears the habit; the cold student above does not.
    expect(puzzleMethodLine('Bxf7+', 40, new Set<MethodHabit>(), tacticHole({}), null)).toMatch(/check|capture/i);
  });

  it('a habit their record says they have fixed is not re-taught', () => {
    const fixed = tacticHole({ lifecycleStatus: 'fixed' });
    expect(puzzleMethodLine('Nxd6#', 300, new Set<MethodHabit>(), fixed, null)).toBeNull();
  });
});

describe('cpFromThemes — the Lichess tag says how much the answer wins', () => {
  it('reads decisive and clear-edge tags, and nothing else', () => {
    expect(cpFromThemes(['mate', 'mateIn1'])).toBe(300);
    expect(cpFromThemes(['crushing', 'fork'])).toBe(300);
    expect(cpFromThemes(['advantage', 'pin'])).toBe(150);
    expect(cpFromThemes(['endgame'])).toBeNull();
  });

  // WO-DEPTH-01 — a My Mistakes puzzle carries the engine's answer, and the
  // habit says how the piece fell (David's 7.Nc3?! …d4, game 144328983994).
  it('a puzzle from the student\'s own slip says how the piece fell', () => {
    const slip = mistakeSlipRead({
      fen: 'r2qkb1r/ppp1ppp1/2n2n1p/3p3b/8/3PBNPP/PPP1PPB1/RN1QK2R w KQkq - 0 7', playerMoveSan: 'Nc3', playerColor: 'white',
      punishUci: ['d5d4', 'e3d4', 'c6d4', 'g3g4', 'h5g6', 'f3e5'],
    });
    expect(slip?.lostSquare).toBe('d4');
    expect(puzzleMethodLine('a3', 300, new Set<MethodHabit>(), COLD, slip)).toContain('a threat: d4 took nothing, but it left your knight on c3 and your bishop on e3 under attack, and your bishop fell on their next move');
  });
  it('a puzzle filed without the answer line keeps the habit its solution earns', () => {
    expect(mistakeSlipRead({ fen: 'r2qkb1r/ppp1ppp1/2n2n1p/3p3b/8/3PBNPP/PPP1PPB1/RN1QK2R w KQkq - 0 7', playerMoveSan: 'Nc3', playerColor: 'white' })).toBeNull();
  });
});
