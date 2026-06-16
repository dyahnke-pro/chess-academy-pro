import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LichessExplorerResult } from '../types';

// Mock the network layer the scanner depends on so the test is deterministic.
const fetchLichessExplorer = vi.fn();
const fetchCloudEval = vi.fn();
vi.mock('./lichessExplorerService', () => ({
  fetchLichessExplorer: (...args: unknown[]) => fetchLichessExplorer(...args),
  fetchCloudEval: (...args: unknown[]) => fetchCloudEval(...args),
}));

import { scanPositionForTrap, evaluateExplorerCandidates } from './positionTrapScan';

function explorerMove(
  san: string,
  total: number,
): LichessExplorerResult['moves'][number] {
  // Split the total across white/draws/black; detector sums them.
  return {
    uci: '',
    san,
    averageRating: 1600,
    white: total,
    draws: 0,
    black: 0,
    game: null,
  };
}

function explorer(moves: LichessExplorerResult['moves']): LichessExplorerResult {
  return { white: 0, draws: 0, black: 0, moves, topGames: [], opening: null };
}

// A legal white-to-move position after 1.e4 e5 2.Bc4 — popular Italian-ish
// shape; Qh5 / Qf3 are legal here so we can stage a "popular but losing"
// candidate cleanly.
const FEN_WHITE_TO_MOVE =
  'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3';

beforeEach(() => {
  fetchLichessExplorer.mockReset();
  fetchCloudEval.mockReset();
});

describe('scanPositionForTrap', () => {
  it('flags a popular move the engine says is losing for the mover', async () => {
    // Qh5 is legal here, "popular" (≥40 games), and we stage it as losing.
    fetchCloudEval.mockImplementation(async (fen: string) => {
      // The resulting FEN after Qh5 — return a losing-for-white cp. Any other
      // candidate returns roughly equal.
      const cp = fen.includes(' b ') && /Q/.test(fen) ? -350 : 10;
      return { pvs: [{ cp }] };
    });
    const trap = await scanPositionForTrap({
      fen: FEN_WHITE_TO_MOVE,
      mover: 'w',
      explorer: explorer([explorerMove('Qh5', 120), explorerMove('Nf3', 5000)]),
      engineBestSan: 'Nf3',
      legalSan: undefined,
    });
    expect(trap).not.toBeNull();
    expect(trap?.trapMove).toBe('Qh5');
    expect(trap?.evalCpForMover).toBeLessThanOrEqual(-200);
    expect(trap?.refutationSan).toBe('Nf3');
  });

  it('returns null when no explorer coverage (off-book → silent, G3)', async () => {
    fetchLichessExplorer.mockResolvedValue(explorer([]));
    const trap = await scanPositionForTrap({
      fen: FEN_WHITE_TO_MOVE,
      mover: 'w',
    });
    expect(trap).toBeNull();
  });

  it('fetches the explorer itself when none is passed', async () => {
    fetchLichessExplorer.mockResolvedValue(explorer([explorerMove('Nf3', 5000)]));
    fetchCloudEval.mockResolvedValue({ pvs: [{ cp: 15 }] });
    const trap = await scanPositionForTrap({ fen: FEN_WHITE_TO_MOVE, mover: 'w' });
    expect(fetchLichessExplorer).toHaveBeenCalledTimes(1);
    // Nf3 is fine, not a trap.
    expect(trap).toBeNull();
  });

  it('skips an unpopular move even if losing', async () => {
    fetchCloudEval.mockResolvedValue({ pvs: [{ cp: -500 }] });
    const trap = await scanPositionForTrap({
      fen: FEN_WHITE_TO_MOVE,
      mover: 'w',
      explorer: explorer([explorerMove('Qh5', 3)]), // below POPULAR_MOVE_MIN_GAMES
    });
    expect(trap).toBeNull();
  });
});

describe('evaluateExplorerCandidates', () => {
  it('normalises cloud-eval to the mover POV (flips for black)', async () => {
    fetchCloudEval.mockResolvedValue({ pvs: [{ cp: 200 }] }); // +200 white POV
    // Black to move after 1.e4: a legal black move set.
    const blackFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const evals = await evaluateExplorerCandidates(blackFen, ['e5'], 'b');
    expect(evals).toHaveLength(1);
    expect(evals[0].san).toBe('e5');
    // +200 white POV → −200 for the black mover.
    expect(evals[0].evalCp).toBe(-200);
  });

  it('skips candidates with no cloud eval rather than mis-flagging', async () => {
    fetchCloudEval.mockResolvedValue({ pvs: [] });
    const evals = await evaluateExplorerCandidates(FEN_WHITE_TO_MOVE, ['Nf3'], 'w');
    expect(evals).toHaveLength(0);
  });
});
