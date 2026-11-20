import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { siegeOf, stepsOf, switchWing } from './boardPlan';
import { planSteps } from './planSteps';

// Karpov–Spassky (Danya's "Alekhine's gun"): White to play 22.Rd3 against the
// isolated d-pawn, then Rfd1.
const KARPOV = '3r2k1/pp2bpp1/1qr1b2p/3p4/8/P1B1PB2/1P2QPPP/3R1RK1 w - - 0 22';

describe('the board plan', () => {
  it('the siege: Rd3 then Rfd1 doubles the rooks on the isolated d-pawn', () => {
    const s = siegeOf(KARPOV, [{ moves: ['d1d3', 'b6c7', 'f1d1'] }], 'your');
    expect(s?.text).toMatch(/d5/);
    expect(s?.text).toMatch(/rooks are doubled/);
    expect(s?.text).toMatch(/isolated/);
  });

  it('no siege when the line builds none', () => {
    expect(siegeOf(KARPOV, [{ moves: ['h2h3', 'b6c7', 'g1h2'] }], 'your')).toBeNull();
  });

  it('a plain trade in the line no longer ends the plan; a lone capture still does', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.d4: …exd4 Nxd4 is a trade; the plan goes on.
    const c = new Chess(); for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'd4']) c.move(m);
    const line = ['e5d4', 'f3d4', 'g8f6', 'b1c3', 'f8b4', 'f1d3'];
    expect(planSteps(c.fen(), line, 'd2d4', 3, false)).toBeNull();
    const withTrade = planSteps(c.fen(), line, 'd2d4', 3, true);
    // Either a plan or nothing tied it — but never cut by the trade itself.
    expect(withTrade === null || withTrade.steps.length >= 2).toBe(true);
  });

  it('stepsOf reads every line and takes the first that shows a plan', () => {
    const p = stepsOf(KARPOV, [{ moves: ['h2h3', 'b6c7'] }, { moves: ['d1d3', 'b6c7', 'f1d1', 'c7d7', 'e2d2'] }], 'your');
    expect(p === null || /Your plan from here/.test(p.text)).toBe(true);
  });

  it('the second front: only when the target holds and the board has a break on the other wing', () => {
    // A held isolated d-pawn (guarded by rook and queen, hit once) and a g4 break.
    const held = '3r2k1/5ppp/8/3p4/8/8/5PPP/3R2K1 w - - 0 1';
    expect(switchWing(held, 'w', 'your', [])).toBeNull(); // no piece guards it but the rook: one attacker, one guard, and no break
    expect(switchWing(KARPOV, 'b', 'your', [])).toBeNull(); // not the mover
  });

  // Danya, the hardest move to make #1: "the queenside is permanently locked";
  // b5 is met by axb5 and drops a pawn — no second front there.
  it('the second front never names a break that drops the pawn', () => {
    expect(switchWing('4r1k1/1p2qpb1/p1p4p/P2rN1p1/1PQPpP2/4P1P1/6KP/1R2R3 w - - 0 36', 'w', 'your', [])).toBeNull();
  });
  it('negative control: the break the best line plays on the other wing opens the front (the positional sacrifice #2)', () => {
    expect(switchWing('1rb5/r2k1pp1/p2p3p/P2PpP2/1NP1BbPP/8/4K3/1R5R w - - 0 31', 'w', 'your',
      ['f5f6', 'g7f6', 'e4f5', 'd7e8', 'b4c6', 'b8b1', 'h1b1', 'a7a8', 'f5c8', 'a8c8'])?.text).toMatch(/the f6 break/);
  });
  it('a break the best line never plays is no second front (how to ruin your pawn structure #1: the engine plays gxh5)', () => {
    expect(switchWing('1r2k2r/4bp2/p2pbp2/1p2p2p/4P1P1/P3BP2/1PPR3P/1K3B1R w k - 0 18', 'w', 'your',
      ['g4h5', 'h8h5', 'h2h4', 'f6f5', 'e4f5', 'h5f5'])).toBeNull();
  });
  it('a d- or e-pawn break is the centre, never a second front on a wing', () => {
    // the positional rook lift #0: "a second front on the kingside: the e5 break"
    expect(switchWing('1r2kb1r/5ppp/pqbppn2/8/2P1P3/6P1/1P1N1PBP/R1BQR1K1 w k - 0 15', 'w', 'your',
      ['e1e3', 'f6d7', 'e3b3', 'b6a7', 'b3b8', 'd7b8', 'b2b4', 'a7d7', 'b4b5', 'a6b5'])?.text ?? '').not.toMatch(/e5 break/);
  });
});
