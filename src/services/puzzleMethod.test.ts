import { describe, it, expect } from 'vitest';
import { puzzleMethodLine, cpFromThemes } from './puzzleMethod';
import type { MethodHabit } from './methodBeat';

describe('puzzleMethodLine — a habit only when the puzzle earns it', () => {
  it('a quiet answer (Qc5 guarding d6) gets no "checks and captures" advice', () => {
    expect(puzzleMethodLine('Qc5', 197, new Set<MethodHabit>())).toBeNull();
  });

  it('a forcing answer with a real swing teaches the forcing scan, once', () => {
    const said = new Set<MethodHabit>();
    const first = puzzleMethodLine('Nxd6#', 300, said);
    expect(first).toMatch(/check|capture/i);
    expect(puzzleMethodLine('Rxe8+', 300, said)).toBeNull(); // said once per session
  });

  it('a small swing is not worth the habit', () => {
    expect(puzzleMethodLine('Bxf7+', 40, new Set<MethodHabit>())).toBeNull();
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
