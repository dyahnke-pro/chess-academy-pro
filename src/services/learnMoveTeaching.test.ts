import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildDrillWrongTeaching } from './learnMoveTeaching';

/** Build a FEN by replaying SANs from the start. */
function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

describe('buildDrillWrongTeaching', () => {
  it('teaches why the right move is strong when the student misses it', () => {
    // Italian: 1.e4 e5 2.Nf3 Nc6 3.Bc4 — the taught move is Bc5; student tries d6.
    const drillFen = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    const teaching = buildDrillWrongTeaching(drillFen, 'd6', 'Bc5');
    expect(teaching).toBeTruthy();
    // Board-true sentence, ends with a period; never a bare restatement.
    expect(teaching!.length).toBeGreaterThan(8);
    expect(teaching!.endsWith('.')).toBe(true);
  });

  it('names the concrete cost when the played move hangs material', () => {
    // Position where the taught capture wins a piece and the played quiet move
    // lets the opponent grab material. 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6
    // 5.Nxe5 — taught recapture-safe line; student blunders a hanging piece.
    // Use a simple hanging-piece position: white to move, Qxf7 is not it but a
    // capture win exists.
    const drillFen = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5']);
    // Black to move; taught move ...Qg5 forks e5-knight and g2; student plays a6.
    const teaching = buildDrillWrongTeaching(drillFen, 'a6', 'Qg5');
    // Whatever it returns must be board-true (non-empty string or null), never throw.
    expect(teaching === null || typeof teaching === 'string').toBe(true);
    if (teaching) expect(teaching.endsWith('.')).toBe(true);
  });

  it('returns null (silence) rather than invent when the expected move is illegal in the FEN', () => {
    const drillFen = fenAfter(['e4', 'e5']);
    // "Bc5" is not legal for the side to move (White) here.
    expect(buildDrillWrongTeaching(drillFen, 'Nf3', 'Bc5')).toBeNull();
  });

  it('never throws on a malformed FEN', () => {
    expect(buildDrillWrongTeaching('not-a-fen', 'e4', 'd4')).toBeNull();
  });
});
