import { describe, it, expect } from 'vitest';
import { computeWhyBestMove } from './whyBestMove';
import type { StockfishAnalysis } from '../types';

function analysis(bestMove: string, evalCp: number): Pick<StockfishAnalysis, 'topLines' | 'evaluation' | 'isMate' | 'mateIn' | 'seldepth' | 'depth' | 'wdl' | 'bestMove'> {
  return {
    bestMove,
    evaluation: evalCp,
    isMate: false,
    mateIn: null,
    seldepth: 20,
    depth: 18,
    wdl: null,
    topLines: [{ pv: [bestMove], evaluation: evalCp, mate: null, depth: 18 }] as unknown as StockfishAnalysis['topLines'],
  };
}

describe('computeWhyBestMove — computed, board-true, no LLM', () => {
  it('leads with the strongest move in SAN and names its concrete point', async () => {
    // White knight b5 → Nc7+ forks the king on e8 and the rook on a8.
    const fen = 'r3k3/8/8/1N6/8/8/8/6K1 w - - 0 1';
    const why = await computeWhyBestMove({ fen, studentColor: 'white', analysis: analysis('b5c7', 300) });
    expect(why).toMatch(/strongest move is Nc7/);
    // The concrete point is present — a fork/check, not a generic "it's good".
    expect(why.length).toBeGreaterThan('The strongest move is Nc7.'.length);
    expect(why).not.toMatch(/\bgood move\b|\bstrong move\b(?! is)/i);
  });

  it('names what a winning capture takes', async () => {
    // White Nxe5 grabs an undefended pawn (nothing recaptures on e5).
    const fen = '6k1/8/8/4p3/8/5N2/8/6K1 w - - 0 1';
    const why = await computeWhyBestMove({ fen, studentColor: 'white', analysis: analysis('f3e5', 120) });
    expect(why).toMatch(/strongest move is Nxe5/);
  });

  it('returns empty when there is no best move (silence over a guess)', async () => {
    const fen = '6k1/8/8/8/8/8/8/6K1 w - - 0 1';
    const why = await computeWhyBestMove({ fen, studentColor: 'white', analysis: analysis('', 0) });
    expect(why).toBe('');
  });
});
