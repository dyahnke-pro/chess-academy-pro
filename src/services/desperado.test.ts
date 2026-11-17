import { describe, it, expect } from 'vitest';
import { desperadoAt, desperadoLine } from './desperado';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';

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

describe('the one composer says it', () => {
  it('a lesson or Review move from the fork board carries the sale', () => {
    const facts = moveThoughtFacts({
      plainThreatsSeen: false, story: false, theory: false, tense: 'past', fenBefore: FEN, san: 'Bd2', moverIsStudent: true,
      prev: NO_PREV_CAPTURE, line: null, history: [], theirLast: null, phrases: null, costCp: 300,
      reads: { before: [{ rank: 1, evaluation: -150, moves: ['c3b5'], mate: null }, { rank: 2, evaluation: -450, moves: ['e3d2'], mate: null }] as never, after: [], passBefore: [], passAfter: [] },
    });
    expect(facts.some((f) => f.computer === 'desperadoAt' && /Nxb5/.test(f.text))).toBe(true);
  }, 30_000);
});
