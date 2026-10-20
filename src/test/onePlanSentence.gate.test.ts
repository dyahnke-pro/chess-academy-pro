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

describe('one structure-plan computer (census 9): nextPlans owns what a structure asks of you', () => {
  // The phrases only a structure-plan sentence uses, read out of STRING
  // literals (a comment or a regex that parses a plan is not a producer).
  const PHRASES = [
    'is the trump', 'is a long-term trump', 'is the danger — get a piece in front', 'the plan from here is to ',
    'the isolated queen’s pawn', 'the wings decide', 'the break comes at the base of the chain', 'have the hanging pawns',
  ];
  const literals = (src: string): string[] => [...src.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2]);
  it('no file outside nextPlans builds a structure-plan sentence', () => {
    const out: string[] = [];
    for (const f of files) {
      if (f === 'src/services/nextPlans.ts' || f.startsWith('src/data/')) continue;
      const lits = literals(readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n'));
      for (const p of PHRASES) if (lits.some((l) => l.includes(p))) out.push(`${f}: ${p}`);
    }
    expect(out).toEqual([]);
  });
  it('the structure computers are defined once, in nextPlans', () => {
    for (const fn of ['structurePlanFact', 'namedPawnStructure', 'isolaniStructure']) {
      expect(owners(`export function ${fn}(`), fn).toEqual(['src/services/nextPlans.ts']);
    }
  });
  it('the isolani is one sentence on both lanes (structure trump and named structure)', async () => {
    const { structurePlanFact, namedPawnStructure } = await import('../services/nextPlans');
    const fen = 'r1bq1rk1/pp2bppp/2n1pn2/8/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 10';
    const named = namedPawnStructure(fen, 'w');
    const trump = structurePlanFact(fen, 'w');
    expect(named?.name).toMatch(/isolated queen/);
    expect(trump?.text).toContain(named!.plan);
    expect(trump?.ideaKey).toBe(`structure:${named!.name}`);
  });
});
