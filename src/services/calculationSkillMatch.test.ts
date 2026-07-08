import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { matchCalculationThemes } from './calculationSkillMatch';

/** Replay a UCI line and return whether it is fully legal + whether the
 *  final position is checkmate — guards the hand-built fixtures below so
 *  a mistyped FEN fails the test loudly instead of silently mis-asserting. */
function replay(fen: string, uci: string[]): { legal: boolean; mate: boolean } {
  const chess = new Chess(fen);
  for (const u of uci) {
    try {
      chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined });
    } catch {
      return { legal: false, mate: false };
    }
  }
  return { legal: true, mate: chess.isCheckmate() };
}

describe('matchCalculationThemes', () => {
  it('tags a forced mate as mateInN by the student ply count', () => {
    // White to move: Qb7 (waiting), Kg8 forced, Qb8#. 2 student moves.
    const fen = '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1';
    const line = ['b1b7', 'h8g8', 'b7b8'];
    expect(replay(fen, line)).toEqual({ legal: true, mate: true });

    const themes = matchCalculationThemes(fen, line);
    expect(themes).toContain('mateIn2');
    expect(themes).not.toContain('mateIn1');
  });

  it('does NOT tag a mate when the line is truncated before checkmate', () => {
    const fen = '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1';
    // Only the first student move — never reaches `#`.
    const themes = matchCalculationThemes(fen, ['b1b7']);
    expect(themes.some((t) => t.startsWith('mateIn'))).toBe(false);
  });

  it('tags a genuine sacrifice → mate (smothered mate) as sacrifice + mateIn2', () => {
    // Qg8+ Rxg8 (queen sacrificed) Nf7# smothered mate.
    const fen = '5r1k/6pp/7N/8/8/1Q6/6PP/6K1 w - - 0 1';
    const line = ['b3g8', 'f8g8', 'h6f7'];
    expect(replay(fen, line)).toEqual({ legal: true, mate: true });

    const themes = matchCalculationThemes(fen, line);
    expect(themes).toContain('sacrifice');
    expect(themes).toContain('mateIn2');
    // First move is a check, so it is NOT a quiet move.
    expect(themes).not.toContain('quietMove');
  });

  it('tags a non-forcing first move as quietMove', () => {
    // Rb7 — invade the 7th, no check, no capture.
    const fen = '6k1/5ppp/8/8/8/8/1R3PPP/6K1 w - - 0 1';
    const themes = matchCalculationThemes(fen, ['b2b7']);
    expect(themes).toContain('quietMove');
    expect(themes.some((t) => t.startsWith('mateIn'))).toBe(false);
  });

  it('tags a promotion as promotion + advancedPawn, never quietMove', () => {
    const fen = '8/P5k1/8/8/8/8/6K1/8 w - - 0 1';
    const themes = matchCalculationThemes(fen, ['a7a8q']);
    expect(themes).toContain('promotion');
    expect(themes).toContain('advancedPawn');
    expect(themes).not.toContain('quietMove');
  });

  it('tags a pawn push to the 7th rank as advancedPawn (no promotion)', () => {
    const fen = '8/6k1/1P6/8/8/8/6K1/8 w - - 0 1';
    const themes = matchCalculationThemes(fen, ['b6b7']);
    expect(themes).toContain('advancedPawn');
    expect(themes).not.toContain('promotion');
  });

  it('tags a ≥3-student-move line as long (forcing sequence)', () => {
    // Three quiet rook shuffles for the student (opp king shuffles between).
    const fen = '6k1/8/8/8/8/8/R7/6K1 w - - 0 1';
    const line = ['a2a3', 'g8f8', 'a3a4', 'f8g8', 'a4a5'];
    expect(replay(fen, line).legal).toBe(true);
    const themes = matchCalculationThemes(fen, line);
    expect(themes).toContain('long');
  });

  it('carries deflection through from the stored motif tag', () => {
    const fen = '6k1/5ppp/8/8/8/8/1R3PPP/6K1 w - - 0 1';
    const themes = matchCalculationThemes(fen, ['b2b7'], { tacticType: 'deflection' });
    expect(themes).toContain('deflection');
  });

  it('tags an endgame-phase position with endgame (feeds the Adaptive tile)', () => {
    const fen = '8/6k1/1P6/8/8/8/6K1/8 w - - 0 1';
    const themes = matchCalculationThemes(fen, ['b6b7'], { gamePhase: 'endgame' });
    expect(themes).toContain('endgame');
  });

  it('returns [] when the line matches no calculation pattern', () => {
    // Single capturing move, middlegame, no mate / promotion / sac.
    const fen = '6k1/5ppp/8/8/4r3/8/4R1PP/6K1 w - - 0 1';
    const themes = matchCalculationThemes(fen, ['e2e4'], { gamePhase: 'middlegame' });
    expect(themes).toEqual([]);
  });

  it('returns [] for an illegal / empty line', () => {
    expect(matchCalculationThemes('6k1/8/8/8/8/8/R7/6K1 w - - 0 1', [])).toEqual([]);
    expect(matchCalculationThemes('6k1/8/8/8/8/8/R7/6K1 w - - 0 1', ['a2a9'])).toEqual([]);
  });
});
