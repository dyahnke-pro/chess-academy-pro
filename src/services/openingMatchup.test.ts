import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { planOpeningMatchup, buildMatchupLine, inferMatchupColor } from './openingMatchup';

describe('inferMatchupColor', () => {
  it('classifies defenses as Black, systems as White', () => {
    expect(inferMatchupColor("King's Indian Defense")).toBe('black');
    expect(inferMatchupColor('Sicilian Defense: Dragon Variation')).toBe('black');
    expect(inferMatchupColor('London System')).toBe('white');
    expect(inferMatchupColor('English Opening')).toBe('white');
  });
  it('treats "Attack" systems as White even inside a Black-named family', () => {
    expect(inferMatchupColor("King's Indian Attack")).toBe('white');
    expect(inferMatchupColor('Caro-Kann Defense: Panov Attack')).toBe('white');
  });
});

describe('planOpeningMatchup', () => {
  it('returns null for a non-matchup', () => {
    expect(planOpeningMatchup('Sicilian Defense')).toBeNull();
    expect(planOpeningMatchup('teach me the Vienna')).toBeNull();
  });

  it('sources the ACTUAL Dragon setup for "KIA vs Sicilian dragon" (not a French move order)', () => {
    const plan = planOpeningMatchup('KIA vs Sicilian dragon');
    expect(plan).not.toBeNull();
    expect(plan?.whiteName).toBe("King's Indian Attack");
    expect(plan?.blackName).toBe('Sicilian Defense: Dragon Variation');
    // White plays the KIA fianchetto; Black plays the Dragon fianchetto —
    // NOT the e6/d5 French order the named DB entry had.
    expect(plan?.whiteSetup).toContain('g3');
    expect(plan?.whiteSetup).toContain('Bg2');
    expect(plan?.blackSetup).toContain('g6');
    expect(plan?.blackSetup).toContain('Bg7');
    expect(plan?.sameColor).toBe(false);
  });

  it('builds a legal, gap-free collision line from the two setups', async () => {
    const plan = planOpeningMatchup('KIA vs Sicilian dragon');
    const moves = await buildMatchupLine(plan!, 16);
    expect(moves.length).toBeGreaterThanOrEqual(10);
    const g = new Chess();
    for (const san of moves) {
      expect(g.moves()).toContain(san); // every move legal from the prior position
      g.move(san);
    }
    // The Dragon fianchetto actually reaches the board.
    expect(moves).toContain('g6');
    expect(moves).toContain('Bg7');
  });

  it('flags a NON-meeting pair honestly but still plans it (David: show it anyway)', async () => {
    const plan = planOpeningMatchup('Queens Gambit vs Sicilian');
    expect(plan).not.toBeNull();
    expect(plan?.sameColor).toBe(false);
    expect(plan?.meets).toBe(false);
    expect(plan?.note).toMatch(/don't normally meet/i);
    // Still constructs a real line (White's QG setup vs Black's Sicilian).
    const moves = await buildMatchupLine(plan!, 14);
    expect(moves.length).toBeGreaterThanOrEqual(8);
    const g = new Chess();
    for (const san of moves) { expect(g.moves()).toContain(san); g.move(san); }
  });

  it('a meeting pair gets NO "don\'t meet" note', () => {
    expect(planOpeningMatchup('KIA vs Sicilian dragon')?.note).toBeNull();
    expect(planOpeningMatchup('London vs the KID')?.meets).toBe(true);
  });

  it('two SAME-colour openings are flagged (can\'t share a board), no construction', async () => {
    const plan = planOpeningMatchup('Najdorf vs Dragon');
    expect(plan?.sameColor).toBe(true);
    expect(await buildMatchupLine(plan!)).toEqual([]);
  });

  it('handles "versus" / "against" and leading articles', () => {
    expect(planOpeningMatchup('London against the KID')?.sameColor).toBe(false);
    expect(planOpeningMatchup('Italian versus the French')?.whiteName).toBe('Italian Game');
  });

  it('returns null when a side is unresolvable', () => {
    expect(planOpeningMatchup('asdfgh vs qwerty')).toBeNull();
  });
});
