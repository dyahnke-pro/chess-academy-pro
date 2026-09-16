// The ledger exists because a projected line that ALTERNATES renders every
// capture as a subjectless "winning the X". Boards are the real ones the
// defect came from (David's Alapin, 2026-09-16).
import { describe, it, expect } from 'vitest';
import { computeExchangeLedger, describeExchange, exchangeNetForLine } from './exchangeLedger';

// After 15.Nc7+ — Black (the student) to move, forked king and rook.
const PLY29 = 'r3kb1r/ppNNpppp/2n5/8/3P4/8/PP2nPPP/R3K2R b KQkq - 1 15';

describe('exchangeLedger — the net of a forced sequence, from the student\'s seat', () => {
  it('the Alapin fork: you take a knight, they take the rook, and it says so', () => {
    const l = computeExchangeLedger(PLY29, ['Kxd7', 'Nxa8', 'Nexd4'], 'b');
    expect(l).not.toBeNull();
    expect(l?.studentWon).toEqual(['n', 'p']);
    expect(l?.opponentWon).toEqual(['r']);
    expect(l?.isExchange).toBe(true);
    expect(l?.netPawns).toBe(-1); // knight + pawn (4) vs rook (5)
    const text = describeExchange(l);
    expect(text).toBe('you come out behind on material, a knight and a pawn for a rook');
  });

  it('reads from the OPPONENT\'s seat as the mirror image', () => {
    const text = exchangeNetForLine(PLY29, ['Kxd7', 'Nxa8', 'Nexd4'], 'w');
    expect(text).toBe('you come out ahead on material, a rook for a knight and a pawn');
  });

  it('stays SILENT on a one-sided win — the line already said it', () => {
    // Only the student captures: nothing to confuse, no ledger.
    expect(exchangeNetForLine(PLY29, ['Kxd7'], 'b')).toBeNull();
  });

  it('stays SILENT on a plain recapture — the student watched it happen', () => {
    const c = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    expect(exchangeNetForLine(c, ['Nxe5', 'Nxe4'], 'w')).toBeNull(); // knight for knight
  });

  it('names an even but UNLIKE trade instead of going silent', () => {
    // A bishop for a knight is even in points but not the same piece.
    const l = { studentWon: ['b' as const], opponentWon: ['n' as const], netPawns: 0, isExchange: true };
    expect(describeExchange(l)).toBe('that trade is even, a bishop for a knight');
  });

  it('groups repeats in piece names, never a point total', () => {
    const l = { studentWon: ['n' as const, 'n' as const], opponentWon: ['r' as const], netPawns: 1, isExchange: true };
    expect(describeExchange(l)).toBe('you come out ahead on material, two knights for a rook');
    expect(describeExchange(l)).not.toMatch(/\d/);
  });

  it('returns null on an illegal line rather than guessing', () => {
    expect(computeExchangeLedger(PLY29, ['Qxh7'], 'b')).toBeNull();
    expect(computeExchangeLedger('not a fen', ['e4'], 'w')).toBeNull();
  });

  it('never counts a king capture', () => {
    const l = computeExchangeLedger(PLY29, ['Kxd7', 'Nxa8'], 'b');
    expect(l?.studentWon).not.toContain('k');
  });
});

describe('attribution — an alternating line never says a subjectless "winning the X"', () => {
  it('stamps each capture with the seat that made it', async () => {
    const { Chess } = await import('chess.js');
    const { narrateDnaLine } = await import('./dnaLineNarrator');
    const sans = ['Kxd7', 'Nxa8', 'Nexd4'];
    const c = new Chess(PLY29);
    const plies = sans.map((san) => { const fenBefore = c.fen(); c.move(san); return { fenBefore, san }; });
    const line = narrateDnaLine(plies, { studentColor: 'b' });
    expect(line).toMatch(/you win the knight/);
    expect(line).toMatch(/they take the rook/);
    expect(line).not.toMatch(/winning the rook/); // the ambiguity that started this
  });
  it('an unseated caller keeps the old subjectless register (no caller breakage)', async () => {
    const { Chess } = await import('chess.js');
    const { narrateDnaLine } = await import('./dnaLineNarrator');
    const c = new Chess(PLY29);
    const plies = ['Kxd7', 'Nxa8'].map((san) => { const fenBefore = c.fen(); c.move(san); return { fenBefore, san }; });
    expect(narrateDnaLine(plies)).toMatch(/winning the/);
  });
});

describe('one verdict computer — a verdict without its reason is the eval bar read aloud', () => {
  it('the projected line ends on the SAME vocabulary the per-move verdict uses', async () => {
    const { assessPositionalEdge } = await import('./reviewPositionalAssessment');
    // +120 for the student. The private `verdictWord` in augmentWithProjections
    // called this band "you're clearly better"; assessPositionalEdge calls it
    // "a bit better" — so one review could say both about the same number.
    expect(assessPositionalEdge('8/8/4k3/8/8/4K3/4P3/8 w - - 0 40', 'w', 120).verdict).toBe('a bit better');
    expect(assessPositionalEdge('8/8/4k3/8/8/4K3/4P3/8 w - - 0 40', 'w', 200).verdict).toBe('clearly better');
  });
  it('carries a BOARD reason at the end of the Alapin line, not just the word', async () => {
    const { Chess } = await import('chess.js');
    const { assessPositionalEdge } = await import('./reviewPositionalAssessment');
    const c = new Chess(PLY29);
    for (const san of ['Kxd7', 'Nxa8', 'Nexd4', 'Rd1', 'e5']) c.move(san);
    const a = assessPositionalEdge(c.fen(), 'b', 120);
    expect(a.reasons.length).toBeGreaterThan(0);
    expect(a.reasons.join(' ')).toMatch(/outpost on d4|further developed/);
  });
  it('no second cp-to-word ladder survives in the projection code', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'src/services/coachFeatureService.ts'), 'utf8');
    expect(src).not.toMatch(/const verdictWord\s*=/);
    expect(src).toMatch(/assessPositionalEdge/);
  });
});
