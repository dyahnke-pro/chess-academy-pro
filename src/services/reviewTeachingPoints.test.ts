import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  attackerDefenderCount, royalDefenderTarget, rookOnSeventh,
  badEnemyBishop, worstPlacedFriendlyPiece, passedPawnPush,
} from './reviewTeachingPoints';

function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

describe('reviewTeachingPoints — the missing Naroditsky messages (David 2026-07-20)', () => {
  it('M2 counts attackers vs defenders on a winnable enemy piece (offense only)', () => {
    // After 4...Bxf3: the black bishop on f3 has 2 white attackers (Q d1, g2 pawn) and 0 defenders.
    const t = attackerDefenderCount(fenAfter(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3']), 'w');
    expect(t).not.toBeNull();
    expect(t).toMatch(/attackers? to .*defender/i);
    expect(t).toMatch(/it falls/i);
    // Pluralization: "0 defenders" not "0 defender"; a lone attacker is singular.
    expect(t).not.toMatch(/\b1 defenders\b|\b1 attackers\b/);
  });

  it('M2 never flags the student\'s OWN overloaded (sacrificed) piece', () => {
    // A student piece hanging is not reported — only enemy winnable targets.
    const t = attackerDefenderCount(fenAfter(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3']), 'w');
    expect(t).not.toMatch(/shore it up|your \w+ on/i);
  });

  it('M6 flags an enemy piece guarded only by the king (worst defender)', () => {
    // Opera after 15...Nxd7: the knight on d7 is guarded only by the e8 king,
    // attacked by the white queen — the "worst defender" motif.
    const opera = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7'];
    const t = royalDefenderTarget(fenAfter(opera), 'w');
    expect(t).not.toBeNull();
    expect(t).toMatch(/worst defenders/i);
    expect(t).toMatch(/guarded only by the king/i);
  });

  it('M20 names a rook on the seventh', () => {
    const opera13 = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7'];
    const t = rookOnSeventh(fenAfter(opera13), 'w');
    expect(t).toMatch(/seventh on d7/i);
  });

  it('M8 does NOT call an undeveloped starting bishop a bad bishop (opening false positive)', () => {
    expect(badEnemyBishop(fenAfter(['e4', 'e5']), 'w')).toBeNull();
    expect(badEnemyBishop(fenAfter(['e4', 'd6', 'd4', 'Nf6']), 'w')).toBeNull();
  });

  it('M14/M23 pushes a passer and notes knights are poor blockers', () => {
    const t = passedPawnPush(fenAfter(['e4', 'e5', 'Nf3', 'Nc6']), 'w', 'c2');
    expect(t).toMatch(/passed pawn on c2/i);
    expect(t).toMatch(/poor blocker|bad at stopping/i);
  });

  it('passedPawnPush returns null with no passer', () => {
    expect(passedPawnPush(new Chess().fen(), 'w', null)).toBeNull();
  });

  it('worstPlacedFriendlyPiece stays quiet in the opening', () => {
    expect(worstPlacedFriendlyPiece(fenAfter(['e4', 'e5', 'Nf3', 'Nc6']), 'w')).toBeNull();
  });
});
