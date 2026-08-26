import { describe, it, expect } from 'vitest';
import { computeLeansOn } from './perturbation';
import { strongestByDelta, type PieceValue } from './pieceValueRead';

// Render a square→{piece,value} map into the Stockfish `eval` board format
// parseEvalTable reads (white pieces uppercase/+, black lowercase/−).
function renderTable(map: Record<string, { piece: string; value: number }>): string {
  const files = 'abcdefgh';
  const lines: string[] = [];
  for (let r = 8; r >= 1; r--) {
    const pcs: string[] = [], vals: string[] = [];
    for (let f = 0; f < 8; f++) {
      const e = map[files[f] + r];
      pcs.push(e ? e.piece : '');
      vals.push(e ? (e.value >= 0 ? '+' : '') + e.value.toFixed(2) : '');
    }
    lines.push('| ' + pcs.join(' | ') + ' |');
    lines.push('| ' + vals.join(' | ') + ' |');
  }
  return lines.join('\n');
}

describe('strongestByDelta', () => {
  const vals: PieceValue[] = [
    { square: 'e5', piece: 'N', color: 'w', value: 4.5 },
    { square: 'b1', piece: 'N', color: 'w', value: 3.0 },
    { square: 'e1', piece: 'K', color: 'w', value: 0 },
  ];
  it('picks the piece outperforming its own kind (not by absolute value)', () => {
    const s = strongestByDelta(vals, 'w');
    expect(s?.square).toBe('e5');
    expect(s?.delta).toBeCloseTo(0.75, 2);
  });
  it('returns null for a side with no non-pawn piece', () => {
    expect(strongestByDelta([{ square: 'e2', piece: 'P', color: 'w', value: 1 }], 'w')).toBeNull();
  });
});

describe('computeLeansOn — the perturbation why-probe', () => {
  // White Ne5 (star) defended by the d4 pawn; Nb1 sets the knight mean.
  const FEN = '4k3/8/8/4N3/3P4/8/8/1N2K3 w - - 0 1';
  const base = renderTable({ e5: { piece: 'N', value: 4.5 }, b1: { piece: 'N', value: 3.0 }, d4: { piece: 'P', value: 1.0 }, e1: { piece: 'K', value: 0 }, e8: { piece: 'k', value: 0 } });
  const noD4 = renderTable({ e5: { piece: 'N', value: 3.0 }, b1: { piece: 'N', value: 3.0 }, e1: { piece: 'K', value: 0 }, e8: { piece: 'k', value: 0 } });
  // Mock engine: the d4 pawn present → base table; removed → the knight drops.
  const evalBoard = (fen: string): Promise<string> => Promise.resolve(fen.includes('3P4') ? base : noD4);

  it('names the load-bearing supporter and the drop', async () => {
    const r = await computeLeansOn(FEN, 'w', evalBoard);
    expect(r).not.toBeNull();
    expect(r).toMatchObject({ piece: 'knight', square: 'e5', leansOn: { square: 'd4', piece: 'pawn' } });
    expect(r!.leansOn.drop).toBeCloseTo(1.5, 2);
  });

  it('stays silent when removing the supporter barely moves the eval', async () => {
    const flat = (fen: string): Promise<string> => Promise.resolve(fen.includes('3P4') ? base : renderTable({ e5: { piece: 'N', value: 4.3 }, b1: { piece: 'N', value: 3.0 }, e1: { piece: 'K', value: 0 }, e8: { piece: 'k', value: 0 } }));
    expect(await computeLeansOn(FEN, 'w', flat)).toBeNull(); // drop 0.2 < 0.5
  });
});
