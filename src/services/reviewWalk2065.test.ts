// Review hand-walk, game N2065 (2026-09-26): each defect pinned at the real
// position it was spoken on.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readTiming } from './moveTiming';
import { prematureBreakWhy } from './reviewFullData';
import { sacrificeCompensation, describeSacBreaksKingShield } from './reviewSacrifice';
import { betterMoveReason } from './inaccuracyCall';

const GAME = 'e4 e5 Nf3 Nc6 Bb5 Nd4 Nxd4 exd4 O-O Bc5 d3 Qh4 Nd2 c6 Bc4 d6 Nf3 Qh5 Ng5 Ke7 Bxf7 Qxd1 Rxd1 h6 Bxg8 Rxg8 Nf3 Bg4 Re1 g5 Nd2 Raf8 Nb3 Bb6 Bd2 Bc7 e5 dxe5 Bb4+ Kd7 Bxf8 Rxf8 Nc5+ Kc8 Ne4 b6 f3 Be6 Re2 Bd5 Rae1 Bxe4 Rxe4 Kd7 h4 c5 hxg5 hxg5 Kf2 Rf4 Rxf4 gxf4 Rh1 Kc6 Rh7 a6 g4 fxg3+ Kxg3 e4+ Rxc7+ Kxc7 fxe4 Kd7 Kf4 Ke6 e5 b5 Ke4 a5 b3 a4 bxa4 bxa4 a3 Kd7 Kd5 Ke7 Kxc5 Ke6 Kxd4 Ke7 Kd5 Kd7 d4 Ke7 e6 Kf6 Kd6 Kf5 e7 Ke4 e8=R+ Kxd4 Re5 Kc4 Rc5+'.split(' ');
function fenAt(ply: number): string {
  const c = new Chess();
  for (const m of GAME.slice(0, ply)) c.move(m);
  return c.fen();
}
function uciLine(fromPly: number, sans: string[]): string[] {
  const c = new Chess(fenAt(fromPly));
  return sans.map((s) => { const m = c.move(s); return m.from + m.to + (m.promotion ?? ''); });
}

describe('review walk 2065', () => {
  it('Nf3 (ply 27): no timing line about a bishop that is no longer on f7', () => {
    expect(readTiming(fenAt(24), fenAt(26), 'Nf3')).toBeNull();
  });

  it('the better move Qxh5 is "take the queen", not "win a rook" (ply 21)', () => {
    const why = betterMoveReason(fenAt(20), 'Bxf7', 'Qxh5', uciLine(20, ['Qxh5', 'Be6', 'Bxe6', 'Rf8', 'Bb3']), 'white', null, false);
    expect(why).toMatch(/queen/);
    expect(why ?? '').not.toMatch(/rook/);
  });

  it("the opponent's premature break is theirs, not yours (…dxe5, ply 38)", () => {
    const why = prematureBreakWhy(fenAt(37), 'dxe5', 'opponent');
    if (why) expect(why).not.toMatch(/you're ready/);
  });

  it('Rxc7+ (ply 71): no "attack rolls on" with no attacker left; the pawn ending is the point', () => {
    expect(describeSacBreaksKingShield(fenAt(70), 'Rxc7+')).toBeNull();
    const comp = sacrificeCompensation(fenAt(71), 'w', 800, true, 800);
    expect(comp.join(' ')).toMatch(/king-and-pawn ending/);
  });
});
