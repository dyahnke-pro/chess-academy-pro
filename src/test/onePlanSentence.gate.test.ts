// ONE PRODUCER PER PLAN SENTENCE (OS-11 duplicate map #7, 2026-10-20): "… So
// the plan: …" was built from one template in planThread and boardPlanFacts,
// and "The plan changes here" had a stem in planThread and one in positionFacts.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files: string[] = [];
const walk = (dir: string): void => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f) && !/\.test\./.test(f)) files.push(p);
  }
};
walk('src');
const owners = (phrase: string): string[] => files.filter((f) => readFileSync(f, 'utf8').split('\n').some((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && l.includes(phrase)));

describe('each plan sentence has one producer', () => {
  it('"So the plan:" is built only by planChoice.methodPlanSentence', () => {
    expect(owners('So the plan:')).toEqual(['src/services/planChoice.ts']);
  });
  it('"The plan changes here" is built only by planMemory.planChangeSentence', () => {
    expect(owners('The plan changes here')).toEqual(['src/services/planMemory.ts']);
  });
});

describe('one worst piece (census 8): every caller reads nextPlans.worstPieceNote', () => {
  it('no second "weakest by scope" definition', () => {
    expect(owners('strongestWeakestPiece(')).toEqual([]);
  });
  it('g3 before 14.Rc1: a rook at home is not the worst piece, in the plan levers or the chat', async () => {
    const { Chess } = await import('chess.js');
    const { boardPlanFacts } = await import('../services/boardPlanFacts');
    const { worstPieceNote } = await import('../services/nextPlans');
    const c = new Chess();
    for (const s of 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3 Na5 Be2 a6 c4 O-O Nc2 Re8 d3 b5 Nf3 c5 O-O Bc7 b4 cxb4 Nxb4 Bb7'.split(' ')) c.move(s);
    const worst = worstPieceNote(c.fen(), 'w');
    const levers = boardPlanFacts(c.fen(), 'white')?.levers.filter((l) => l.kind === 'worst') ?? [];
    expect(levers.map((l) => l.squares[0])).toEqual(worst ? [worst.square] : []);
    expect(levers.map((l) => l.squares[0])).not.toContain('a1');
  });
});
