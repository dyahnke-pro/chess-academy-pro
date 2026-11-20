import { describe, it, expect } from 'vitest';
import { desperadoAt, desperadoLine } from './desperado';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import { writerFor } from './writerRegister';

// A pawn on d4 forks the knight on c3 and the bishop on e3; the knight can take
// the knight on b5 before it goes. Engine best (depth 16): Nxb5.
const FEN = '4k3/8/8/1n6/3p4/2N1B3/PP3PPP/4K3 w - - 0 1';

describe('desperado: two pieces hanging, sell the one you cannot save', () => {
  it('names the sale when the student played something else', () => {
    const d = desperadoAt(FEN, 'Bd2', 'c3b5');
    expect(d?.found).toBe(false);
    const l = desperadoLine(d!, 'your', FEN);
    expect(l).toMatch(/Nxb5/);
    expect(l).toMatch(/knight/);
    expect(l).not.toMatch(/ — /); // one idea a sentence, no dash chains
  });
  it('credits the sale when it was played', () => {
    const d = desperadoAt(FEN, 'Nxb5', 'c3b5');
    const l = desperadoLine(d!, 'your', FEN);
    expect(l).toMatch(/(takes|grabs|sells itself for) a knight/);
    expect(l).not.toMatch(/ — /);
  });
  it('rotates its phrasing on the board: three variants, never a coin flip', () => {
    const seen = new Set<string>();
    for (const f of [FEN, FEN.replace(' 0 1', ' 0 2'), FEN.replace(' 0 1', ' 0 3'), FEN.replace(' 0 1', ' 0 4'), FEN.replace(' 0 1', ' 0 5'), FEN.replace(' 0 1', ' 0 6')]) {
      seen.add(desperadoLine(desperadoAt(FEN, 'Nxb5', 'c3b5')!, 'your', f).split('.')[0]);
    }
    expect(seen.size).toBeGreaterThan(1);
    expect(desperadoLine(desperadoAt(FEN, 'Nxb5', 'c3b5')!, 'your', FEN)).toBe(desperadoLine(desperadoAt(FEN, 'Nxb5', 'c3b5')!, 'your', FEN));
  });
  it('says nothing with one piece hanging, or when the best move is no capture by a hanging piece', () => {
    expect(desperadoAt('4k3/8/8/1n6/3p4/2N5/PP3PPP/4K3 w - - 0 1', 'Nxb5', 'c3b5')).toBeNull();
    expect(desperadoAt(FEN, 'Bd2', 'e3d2')).toBeNull();
  });
});

// ONE PIECE LOST ANYWAY: the knight on a8 is attacked by the queen and both
// its squares are pawns of theirs; no move saves it. Stockfish (depth 16):
// Nxb6, the knight taking a pawn on its way out.
const LOST = 'N2qk3/p1p5/1p6/8/8/8/8/4K3 w - - 0 1';

describe('desperado: one piece lost anyway', () => {
  it('names the sale when the knight could not be saved', () => {
    const d = desperadoAt(LOST, 'Ke2', 'a8b6');
    expect(d?.other).toBeNull();
    expect(d?.found).toBe(false);
    expect(desperadoLine(d!, 'your', LOST)).toMatch(/Nxb6/);
    expect(desperadoLine(d!, 'your', LOST)).toMatch(/(lost anyway|Nothing could save)/);
  });
  it('credits it when played', () => {
    const d = desperadoAt(LOST, 'Nxb6', 'a8b6');
    expect(d?.found).toBe(true);
    expect(desperadoLine(d!, 'your', LOST)).not.toMatch(/Nxb6/);
  });
  it('a piece that can still be saved is no desperado (negative control)', () => {
    // The b6 pawn gone: the knight walks out to b6.
    expect(desperadoAt('N2qk3/p1p5/8/8/8/8/8/4K3 w - - 0 1', 'Nb6', 'a8b6')).toBeNull();
  });
  it('taking the attacker, or a piece worth more, is a trade, never a sale', () => {
    // Two white pieces hang to the d2 queen, and the bishop takes it: winning a
    // queen is no desperado (Danya, "How to Ruin Your Pawn Structure").
    expect(desperadoAt('1r2k2r/4bp2/p2pbp1p/1p2p3/4P1P1/P3BP2/1PPq3P/1K1R1B1R w k - 0 18', 'Bxd2', 'e3d2')).toBeNull();
  });
});

describe('the one composer says it', () => {
  it('a lesson or Review move from the fork board carries the sale', () => {
    const facts = moveThoughtFacts({ moveReads: writerFor('review').moveReads, namesPlayedMove: true,
      plainThreatsSeen: false, story: false, theory: false, tense: 'past', fenBefore: FEN, san: 'Bd2', moverIsStudent: true,
      prev: NO_PREV_CAPTURE, line: null, history: [], theirLast: null, phrases: null, costCp: 300,
      reads: { before: [{ rank: 1, evaluation: -150, moves: ['c3b5'], mate: null }, { rank: 2, evaluation: -450, moves: ['e3d2'], mate: null }] as never, after: [], passBefore: [], passAfter: [] },
    });
    expect(facts.some((f) => f.computer === 'desperadoAt' && /Nxb5/.test(f.text))).toBe(true);
  }, 30_000);
});
