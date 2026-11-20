// A try no pure reader finds a reason for (Rd5 in "in pursuit of zugzwang",
// stored Stockfish lines) is read again with the engine-backed computers on
// its futures — on Review, never on a live board (G8.5: the engine-backed
// difference reader had no production caller).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { boardReadFacts, type BoardReadInput } from './boardReadFacts';
import { standingRefutations, type ChangeReasonArgs } from './weighedMoves';
import type { AnalysisLine } from '../types';

const FEN = '8/2R3p1/3p2k1/3P1p1p/3r1P1K/6PP/8/8 b - - 0 46';
const TRY = ['d4d5', 'c7c8', 'd5d3', 'c8f8', 'd6d5', 'g3g4', 'h5g4', 'h3g4', 'f5g4', 'f4f5', 'g6h7'];
const BEST = ['g6h6', 'g3g4', 'h5g4', 'c7d7', 'd4f4', 'd7d6', 'g7g6', 'd6d8', 'f4f3', 'd8h8', 'h6g7', 'h8c8', 'g4h3', 'd5d6'];
const reads = [{ evaluation: -252, mate: null, moves: BEST }, { evaluation: -5, mate: null, moves: TRY }];
const considered = new Map([['d4d5', { why: 'king' as const }]]);
const afterTry = (() => { const c = new Chess(FEN); c.move({ from: 'd4', to: 'd5' }); return c.fen(); })();

describe('the engine-backed difference reader has its production caller', () => {
  it('a try dropped for no reason hands its futures, and an engine reason lets it be said', () => {
    const handed: ChangeReasonArgs[] = [];
    const pure = standingRefutations({ fen: FEN, student: 'b', rating: 1800, reads, considered: considered as never, onDrop: (_u, g, f) => { if (g === 'no-reason' && f) handed.push(f); } });
    expect(pure.some((t) => t.uci === 'd4d5')).toBe(false);
    expect(handed.map((f) => f.tryLine.moves[0])).toContain('d4d5');
    const said = standingRefutations({ fen: FEN, student: 'b', rating: 1800, reads, considered: considered as never, engineReasons: new Map([['d4d5', 'Zugzwang: on your move this loses.']]) });
    expect(said.find((t) => t.uci === 'd4d5')?.text).toMatch(/Zugzwang: on your move this loses\./);
  });

  const run = async (engineFutures: boolean): Promise<string[]> => {
    const sources: string[] = [];
    const line = (moves: string[], cp: number): AnalysisLine[] => [{ rank: 1, evaluation: cp, mate: null, moves }];
    const input: BoardReadInput = {
      fen: FEN, studentColor: 'b', rating: 1800, before: line(BEST, -252), history: [], theory: false, tense: 'now',
      withhold: false, readTempting: true, engineFutures, studentNeedContext: null,
      read: async (fen, source) => { sources.push(source); return fen === afterTry ? line(TRY.slice(1), -5) : null; },
    };
    await boardReadFacts(input);
    return sources;
  };
  it('Review reads the futures; a live board does not', async () => {
    expect(await run(true)).toContain('future');
    expect(await run(false)).not.toContain('future');
  }, 60_000);
});
