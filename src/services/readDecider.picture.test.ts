import { describe, it, expect } from 'vitest';
import { decideRead, type ReadFact, type ReadContext } from './readDecider';

// Danya, the positional rook lift #2 (Black to play): White's bishop on h6 is
// stranded — the detail behind why …Qf6 tempts and why the win is hard.
const FEN = '2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25';
const ctx: ReadContext = { fen: FEN, bucket: 'open', best: ['d8', 'd7'], withheld: [], puzzle: false, studentShot: false, said: new Set() };

describe('a read keeps the detail of its steps (WO-PICTURE-01 P4)', () => {
  const tempting: ReadFact = { from: 'tempting', kind: 'refuted', text: '…Qf6 to trap the bishop on h6 is met by Rh5.', squares: ['g6', 'f6', 'h6', 'h5'], stakes: 80 };
  const detail: ReadFact = { from: 'position', kind: 'concept', computer: 'readPosition', text: 'Their bishop on h6 is stranded: it has no safe way home.', squares: ['h6'], stakes: 1 };
  const rivalPlan: ReadFact = { from: 'position', kind: 'structure-plan', computer: 'boardPlanFacts', text: 'The plan: put a rook on the h file to hit their bishop on h6.', squares: ['h6'], stakes: 1 };
  const elsewhere: ReadFact = { from: 'position', kind: 'concept', text: 'The a-file is half-open.', squares: ['a1', 'a6'], stakes: 1 };
  const aLine: ReadFact = { from: 'position', kind: 'line', text: 'The queen to f6, the rook to h5.', squares: ['h6'] };

  it('a fact about the same piece follows the step it belongs to; a different square or a score sheet does not', () => {
    const { facts } = decideRead([tempting, detail, elsewhere, aLine, rivalPlan], ctx);
    const texts = facts.map((f) => f.text);
    expect(texts.indexOf(detail.text)).toBe(texts.indexOf(tempting.text) + 1);
    expect(texts).not.toContain(aLine.text);
  });

  it('a rival conclusion about the same piece is never its detail (rook lift #2: a second plan after the lift)', () => {
    const texts = decideRead([tempting, rivalPlan], ctx).facts.map((f) => f.text);
    expect(texts.indexOf(rivalPlan.text)).not.toBe(texts.indexOf(tempting.text) + 1);
  });

  it('a withheld square keeps its detail out too', () => {
    const { facts } = decideRead([tempting, detail], { ...ctx, withheld: ['h6'] });
    expect(facts.map((f) => f.text)).not.toContain(detail.text);
  });
});
