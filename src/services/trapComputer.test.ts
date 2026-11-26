import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { classifySlip, isSacrificeLine, KNOWN_MISTAKE_FLOOR_CP, TRAP_BAR_CP } from './trapComputer';
import { MATE_CP } from './mateScale';
import { isWeaponGem, type PunishGem } from '../data/lessons/punishGems';

const play = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
// 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 — White to move; 6.Nxf7 is a sacrifice.
const SAC_FEN = play(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5']);
// 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 — Black to move; …h6?? loses to Nxf7 (a fork), not a sacrifice.
const FORK_FEN = play(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5']);

describe('trapComputer — the one bar', () => {
  it('reads the bar from data/trap-bar.json: a piece or a mate', () => {
    expect(TRAP_BAR_CP).toBe(300);
    expect(KNOWN_MISTAKE_FLOOR_CP).toBe(50);
  });
  it('a read at the bar or a mate is a trap; between the floor and the bar a known mistake', () => {
    expect(classifySlip({ engineCp: 300 })).toBe('trap');
    expect(classifySlip({ engineCp: MATE_CP })).toBe('trap');
    expect(classifySlip({ engineCp: 299 })).toBe('known-mistake');
    expect(classifySlip({ engineCp: 50 })).toBe('known-mistake');
    expect(classifySlip({ engineCp: 49 })).toBeNull();
    expect(classifySlip({ engineCp: null })).toBeNull();
  });
  it('a sacrifice line is neither: "Nxf7, …Kxf7 wins" is the opponent giving a piece on purpose', () => {
    expect(isSacrificeLine(SAC_FEN, 'Nxf7', ['Kxf7', 'Qf3+'])).toBe(true);
    expect(classifySlip({ engineCp: 450, line: { fen: SAC_FEN, slip: 'Nxf7', punish: ['Kxf7', 'Qf3+'] } })).toBeNull();
  });
  it('a capture that reaches for more and fails is no sacrifice: the Elephant Trap', () => {
    const fen = play(['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Nbd7', 'cxd5', 'exd5']);
    const punish = ['Nxd5', 'Bxd8', 'Bb4+', 'Qd2', 'Bxd2+', 'Kxd2', 'Kxd8'];
    expect(isSacrificeLine(fen, 'Nxd5', punish)).toBe(false);
    expect(classifySlip({ engineCp: 327, line: { fen, slip: 'Nxd5', punish } })).toBe('trap');
  });
  it('a quiet slip that loses to a fork is a trap', () => {
    expect(isSacrificeLine(FORK_FEN, 'h6', ['Nxf7'])).toBe(false);
    expect(classifySlip({ engineCp: 400, line: { fen: FORK_FEN, slip: 'h6', punish: ['Nxf7'] } })).toBe('trap');
  });
  it('the gem door asks the one computer', () => {
    const gem = { tier: 'confirmed', engineCp: 300 } as PunishGem;
    expect(isWeaponGem(gem)).toBe(true);
    expect(isWeaponGem({ ...gem, engineCp: 299 })).toBe(false);
  });
});
