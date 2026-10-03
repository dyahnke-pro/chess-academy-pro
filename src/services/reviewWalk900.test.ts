// Review hand-walk, game N900 (2026-09-26): four claims that were false on the
// board, each pinned at the real position it was spoken on.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import { detectConcept } from './reviewConcepts';
import { buildMiddlegameOrientation } from './reviewStrategicOrientation';
import { moveMeetsThreat } from './coachFeatureService';
import { reachesInOneMove } from './lookaheadPlan';

const GAME = 'e4 c5 Nf3 d6 c3 Nf6 e5 dxe5 Nxe5 Nbd7 Nxd7 Bxd7 Bc4 Bc6 O-O e6 Na3 a6 Bb3 b5 Nc2 Bd6 c4 h5 d4 bxc4 Bxc4 Ng4 h3 Qc7 Ne3 Bh2+ Kh1 Bg1 Nxg4 hxg4 Kxg1 gxh3 d5 hxg2 Kxg2 Qh2+ Kf3 Rh3+ Ke2 exd5 Bd3 Kf8 Kd2 Re8 Kc2 c4 Bf5 Ba4+ b3 cxb3+ Kb1 bxa2+ Rxa2 Bxd1 Rxd1 Rb3+'.split(' ');
function fenAt(ply: number): string {
  const c = new Chess();
  for (const m of GAME.slice(0, ply)) c.move(m);
  return c.fen();
}

describe('review walk 900 — claims the board did not support', () => {
  it('a queen whose side is in check is not "trapped" (…bxa2+, Qd2 and Qg4 were safe)', () => {
    const trapped = detectTactics(fenAt(58)).tactics.filter((t) => t.type === 'trapped_piece');
    expect(trapped).toEqual([]);
  });

  it('no "two bishops against your single minor" when the other side has NO minor (Rxd1)', () => {
    const beat = detectConcept({
      fenBefore: fenAt(60), fenAfter: fenAt(61), san: 'Rxd1', moverColor: 'w',
      evalBefore: -900, evalAfter: -900, studentColor: 'b', priorMove: null,
    });
    expect(beat?.concept).not.toBe('two-bishops');
  });

  it('no pawn race with bare kings and one a-pawn to throw (…Rb3+)', () => {
    const beat = buildMiddlegameOrientation(fenAt(62), 'b', 'Rb3+', 'student');
    expect(beat?.text ?? '').not.toMatch(/opposite wings/);
  });

  it('…Ng4 is not prophylaxis against dxc5 — dxc5 is still on after it', () => {
    expect(moveMeetsThreat(fenAt(27), 'Ng4', 'dxc5')).toBe(false);
  });

  it('a move that defends the threatened square IS prophylaxis (…Nc6 against Nxe5)', () => {
    const c = new Chess(); c.move('e4'); c.move('e5'); c.move('Nf3');
    expect(moveMeetsThreat(c.fen(), 'Nc6', 'Nxe5')).toBe(true);
  });

  it('a bishop that reaches its square in one move was not rerouted (d6→c7 "by way of h2")', () => {
    expect(reachesInOneMove(fenAt(29), 'd6', 'c7')).toBe(true);
    // the Ruy knight b1→g3 is a real regrouping
    expect(reachesInOneMove(new Chess().fen(), 'b1', 'g3')).toBe(false);
  });
});

describe('review walk 900 — one outpost test', () => {
  it('a bishop checking from the enemy corner is not on an outpost (…Bh2+)', async () => {
    const { isOutpost } = await import('./outpost');
    expect(isOutpost(new Chess(fenAt(32)), 'h2', 'b', false)).toBe(false);
  });
  it('a supported knight on d5 no pawn can kick IS an outpost', async () => {
    const { isOutpost } = await import('./outpost');
    // White knight d5, pawn e4 supports, no black c/e pawn behind it.
    const b = new Chess('4k3/p4ppp/8/3N4/4P3/8/5PPP/4K3 w - - 0 1');
    expect(isOutpost(b, 'd5', 'w', true)).toBe(true);
  });
});
