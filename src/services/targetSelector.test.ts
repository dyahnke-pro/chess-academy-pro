import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { opponentTargets, pressureLine, pressureOf, stackedAttackers, standingTarget, targetLine } from './targetSelector';
import { readBoardAll } from './boardComputers';

// Danya's article boards (reference only, never quoted): Karpov–Spassky's
// isolated d5 pawn and Alekhine's gun; Larsen's backward e3 pawn; Keres
// tying White's rook to the isolated d5 pawn.
const KARPOV = '3r2k1/pp2bpp1/1qr1b2p/3p4/8/P1B1PB2/1P2QPPP/3R1RK1 w - - 0 22';
// Stockfish 18, MultiPV 2 after 22.Rd3: …Rc7 Rfd1 Rcd7 Rd2 Qc6 Qd1 b6 g3.
const KARPOV_AFTER_RD3 = 'c6c7 f1d1 c7d7 d1d2 b6c6 e2d1 b7b6 g2g3'.split(' ');
const LARSEN = 'r2q1rk1/pb3nbp/1p4p1/n1pp1p2/P2P1P2/2P1PN1Q/1P3R1P/R1BBN1K1 b - - 0 19';
const KERES = '3R4/2p3p1/3p2kp/3P1p2/5P1K/6PP/2r5/8 b - - 0 42';
// Bronstein–Boleslavsky: "no accessible weaknesses" for Black.
const BRONSTEIN = '5rk1/2p1q1p1/brn1p2p/p1Np1p2/P2P1P2/Q1P3P1/4P1BP/R4RK1 w - - 0 21';
// Sadler: White's c5 pawn is isolated, but Black's only target is f2.
const SADLER = '1r4k1/2p1qpp1/p3pn1p/2P1N3/P1Q5/4P1P1/1r3P1P/2RR2K1 b - - 0 22';
// Tate–Yudasin: h7 beside Black's king with the queens on — the attack's, not the structure's.
const TATE = 'r2qrnk1/4bp1p/p2p4/3n2PQ/1P6/7R/1BP2P1P/5R1K w - - 0 27';

describe('stackedAttackers', () => {
  it('counts the rook behind the rook and the queen behind them', () => {
    // After Rd3, Rd2 and Qd1 on the Karpov board: rooks d3, d2, queen d1, bishop f3.
    const b = new Chess(KARPOV);
    for (const u of ['d1d3', ...KARPOV_AFTER_RD3.slice(0, 6)]) b.move({ from: u.slice(0, 2), to: u.slice(2, 4) });
    expect(stackedAttackers(b, 'd5', 'w').sort()).toEqual(['d1', 'd2', 'd3', 'f3']);
  });
});

describe('opponentTargets', () => {
  it('names the isolated d5 pawn on the Karpov board with its count', () => {
    const t = opponentTargets(KARPOV, 'w')[0];
    expect(t.square).toBe('d5');
    expect(t.why).toBe('isolated');
    expect(t.attackers.sort()).toEqual(['d1', 'f3']);
    expect(t.guards.sort()).toEqual(['d8', 'e6']);
    expect(targetLine(t, KARPOV, 'your')).toMatch(/their pawn on d5/);
    expect(targetLine(t, KARPOV, 'your')).toMatch(/Two of your pieces hit it, and two of their pieces guard it\./);
  });

  it('leaves a pawn beside their king to the king attack while the queens are on', () => {
    expect(opponentTargets(TATE, 'w').some((t) => t.square === 'h7')).toBe(false);
  });
});

describe('standingTarget — only where the engine goes after it', () => {
  it('Larsen: Qe7 goes after the backward e3 pawn', () => {
    const t = standingTarget(LARSEN, 'b', 54, 'd8e7');
    expect(t?.square).toBe('e3');
    expect(t?.why).toBe('backward');
  });

  it('Keres: Rc5 goes after the isolated d5 pawn', () => {
    expect(standingTarget(KERES, 'b', 115, 'c2c5')?.square).toBe('d5');
  });

  it('Karpov: h3 does not touch d5, so no target is said', () => {
    expect(standingTarget(KARPOV, 'w', 70, 'h2h3')).toBeNull();
  });

  it('Bronstein: Nxa6 takes a bishop — no weak pawn is the story', () => {
    expect(standingTarget(BRONSTEIN, 'w', 0, 'c5a6')).toBeNull();
  });

  it('Sadler: Nd5 is about f2, never White\'s c5 pawn', () => {
    expect(standingTarget(SADLER, 'b', -29, 'f6d5')).toBeNull();
  });

  it('says nothing in a decided middlegame', () => {
    expect(standingTarget(LARSEN, 'b', 400, 'd8e7')).toBeNull();
  });
});

describe('pressureOf — the siege the engine line builds', () => {
  it('Karpov Rd3: steps up the d-file, and the line builds Alekhine\'s gun with Qd1', () => {
    const p = pressureOf(KARPOV, 'Rd3', KARPOV_AFTER_RD3);
    expect(p?.target).toBe('d5');
    expect(p?.form).toBe('gun');
    expect(p?.completedBy).toBe('Qd1');
    expect(p?.stack).toEqual(['d3', 'd2', 'd1']);
    const line = pressureLine(p!, KARPOV, 'your');
    expect(line).toMatch(/steps up the d-file against their pawn on d5/);
    expect(line).toMatch(/After Qd1, it is Alekhine's gun/);
    expect(line).toMatch(/four attackers against four guards/);
  });

  it('a line that never stacks says no formation', () => {
    const p = pressureOf(KARPOV, 'Rd3', []);
    expect(p).toBeNull();
  });

  it('Larsen Qe7: a new attacker on e3, no file siege', () => {
    const p = pressureOf(LARSEN, 'Qe7', 'e1d3 f7d6 f2g2 d6e4'.split(' '));
    expect(p?.target).toBe('e3');
    expect(p?.form).toBeNull();
    expect(pressureLine(p!, LARSEN, 'your')).toMatch(/one attacker against one guard\./);
  });

  it('the registry holds a move the engine refutes', () => {
    const ok = readBoardAll('targetPressure', { fenBefore: KARPOV, san: 'Rd3', student: 'w', lineAfter: KARPOV_AFTER_RD3, costCp: 30 });
    expect(ok).toHaveLength(1);
    expect(ok[0].computer).toBe('pressureOf');
    const refuted = readBoardAll('targetPressure', { fenBefore: KARPOV, san: 'Rd3', student: 'w', lineAfter: KARPOV_AFTER_RD3, costCp: 131 });
    expect(refuted).toHaveLength(0);
  });
});
