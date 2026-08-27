import { describe, it, expect } from 'vitest';
import { computeTurningPointHinge } from './reviewHinge';

// A tiny static-eval stub in the Stockfish `eval` table format perturbation reads.
function renderTable(map: Record<string, { piece: string; value: number }>): string {
  const files = 'abcdefgh';
  const lines: string[] = [];
  for (let r = 8; r >= 1; r--) {
    const pcs: string[] = [], vals: string[] = [];
    for (let f = 0; f < 8; f++) {
      const e = map[`${files[f]}${r}`];
      pcs.push(e ? e.piece : '');
      vals.push(e ? (e.value >= 0 ? '+' : '') + e.value.toFixed(2) : '');
    }
    lines.push('| ' + pcs.join(' | ') + ' |');
    lines.push('| ' + vals.join(' | ') + ' |');
  }
  return lines.join('\n');
}

describe('computeTurningPointHinge — retrospective, review register', () => {
  it('names what the position leaned on (past tense, no in-game voice)', async () => {
    // White Ne5 (star) leaning on the d4 pawn; Nb1 sets the knight mean.
    const FEN = '4k3/8/8/4N3/3P4/8/8/1N2K3 w - - 0 1';
    const base = renderTable({ e5: { piece: 'N', value: 4.5 }, b1: { piece: 'N', value: 3.0 }, d4: { piece: 'P', value: 1.0 }, e1: { piece: 'K', value: 0 }, e8: { piece: 'k', value: 0 } });
    const noD4 = renderTable({ e5: { piece: 'N', value: 3.0 }, b1: { piece: 'N', value: 3.0 }, e1: { piece: 'K', value: 0 }, e8: { piece: 'k', value: 0 } });
    const evalBoard = (fen: string): Promise<string> => Promise.resolve(fen.includes('3P4') ? base : noD4);

    const hinge = await computeTurningPointHinge({ fenBefore: FEN, studentColor: 'w', evalBoard });
    expect(hinge).toMatch(/was leaning on your knight on e5/);
    expect(hinge).toMatch(/turned on/);
  });

  it('falls back to a standing threat when nothing clearly leans', async () => {
    // White Ne5 hangs to ...dxe5 (a must-defend); flat eval so leans-on stays quiet.
    const FEN = 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5';
    const flat = (): Promise<string> => Promise.resolve(renderTable({ e5: { piece: 'N', value: 3.0 }, e1: { piece: 'K', value: 0 }, e8: { piece: 'k', value: 0 } }));
    const hinge = await computeTurningPointHinge({ fenBefore: FEN, studentColor: 'w', evalBoard: flat });
    expect(hinge).toMatch(/threat to meet first|knight on e5 was hanging/);
  });

  it('returns empty when nothing computes', async () => {
    const FEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const evalBoard = (): Promise<string> => Promise.resolve(renderTable({ e1: { piece: 'K', value: 0 }, e8: { piece: 'k', value: 0 } }));
    expect(await computeTurningPointHinge({ fenBefore: FEN, studentColor: 'w', evalBoard })).toBe('');
  });
});
