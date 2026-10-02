// Learn walk 2026-10-02 (three fresh sweep-corpus games, student Black): every
// false line the hand-check found, pinned on its own game position. Each case
// fails on the code that spoke it.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { costWords } from './engineConstants';
import { settledLeadFor, lastMoveOf } from './material';
import { tradeJudgement } from './tradeJudgement';
import { whyItFailed } from './whyItFailed';
import { computeMoveFundamentals } from './moveFundamentals';
import { betterMoveFact } from './inaccuracyCall';
import { openingIdentityLine } from './openingIdentity';
import { openingAnnouncement } from './openingAnnouncement';
import { attributePrinciples } from './principleAttribution';

const play = (sans: string): Chess => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c; };
const QGD = 'd4 d5 c4 e6 Nc3 Nf6 Nf3 c5 dxc5 Bxc5 Bg5 d4 Ne4';

describe('Learn walk oct2a', () => {
  it('F1/F10: cost words survive depth noise either side of an edge', () => {
    expect(costWords(20)).toBe('a little');
    expect(costWords(92)).toBe('about a pawn');
    expect(costWords(110)).toBe('about a pawn');
  });

  it('F3/F4: a recapture is not "behind in material"', () => {
    const c = play(`${QGD} Be7 Nxf6+`);           // Black to recapture on f6
    const after = new Chess(c.fen()); after.move('Bxf6');
    expect(settledLeadFor(after.fen(), 'b', lastMoveOf(after))).toBe(0);
    const t = tradeJudgement(c.fen(), 'Bxf6', 'Bxf6', 'b', 160);
    expect(t?.reason).not.toBe('behind');
  });

  it('F2: the abandoned pawn is not "won by the knight" when taking leaves their knight hanging', () => {
    const c = play(QGD);
    const w = whyItFailed({ fenBefore: c.fen(), playedSan: 'Be7', studentColor: 'black' });
    expect(w?.line ?? '').not.toMatch(/knight on f3 wins it/);
  });

  it('F5: development-complete does not send out rooks that are already out', () => {
    const c = play(`${QGD} Be7 Nxf6+ Bxf6 Bxf6 Qxf6 Qxd4 Qxd4 Nxd4 O-O g3 e5 Nb5 Na6 Bg2 Rd8 O-O Nc5 Nc7 Rb8 Nd5`);
    const f = computeMoveFundamentals(c.fen(), 'Be6', 'black').find((x) => x.id === 'development-complete');
    expect(f).toBeTruthy();
    expect(f?.imperative).not.toMatch(/rooks/);
  });

  it('F13: a knight two squares from the king is "close to", not "right next to"', () => {
    const c = play('e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4 Qxd4 Nf6 Bg5 Be7 Nc3 O-O Nd5 Re8 Nxf6+');
    const t = tradeJudgement(c.fen(), 'Bxf6', 'Bxf6', 'b', 0);
    expect(t?.reason).toBe('attacker-gone');
    expect(t?.text).toMatch(/close to your king/);
  });

  it('F8: a discovery the line takes straight back is not the reason for d5', () => {
    const fen = '1r3rk1/ppp2ppp/3bp3/5n2/3P4/2P5/PPBB1PPP/R3R1K1 w - - 0 18';
    const f = betterMoveFact(fen, 'Bxf5', 'd5', 'd4d5 b8e8 d5e6 f7e6 c2a4 c7c6 a4b3 f8f6'.split(' '), 'white', null);
    expect(JSON.stringify(f ?? '')).not.toMatch(/discovered/);
  });

  it('F14: a rook won and given back by the end of the line is not "win a rook"', () => {
    const fen = '7r/ppp1k1R1/3pbr1P/5p2/8/1P1B4/P1PK4/4R3 b - - 3 29';
    const f = betterMoveFact(fen, 'Kd8', 'Rf7', 'f6f7 e1e6 e7e6 d3c4 d6d5 c4d5 e6d5 g7f7'.split(' '), 'black', null);
    expect(JSON.stringify(f ?? '')).not.toMatch(/win a rook/);
  });

  it('F11: the King\'s Knight Opening is a waypoint — no identity paragraph', () => {
    expect(openingIdentityLine("King's Knight Opening: Normal Variation", 'b', 'seat')).toBeNull();
  });

  it('F12: the Scotch after a waypoint is named plainly, never as a transposition', () => {
    const line = openingAnnouncement({ name: 'Scotch Game: Lolli Variation' }, null, "King's Knight Opening", 'b', true);
    expect(line).toBe("It's the Scotch Game: Lolli Variation.");
  });

  it('F16: in check, the king move is an answer — no "walking in" lesson', () => {
    const c = play('e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4 Qxd4 Nf6 Bg5 Be7 Nc3 O-O Nd5 Re8 Nxf6+ Bxf6 Bxf6 Qxf6 Qxf6 Rxe4+ Be2 gxf6 f3 Re3 Kd2 Re7 Rad1 d6 g4 Be6 b3 Rd8 h4 f5 Rhg1 fxg4 fxg4 Kf8 h5 h6 g5 hxg5 Rxg5 f6 Rg6 Rf7 Rdg1 Ke7 h6 Rh8 Bd3 f5 Re1 Rf6 Rg7+ Kd8 h7 Rh6 Bxf5 Bxf5 Rg8+ Rxg8');
    const atts = attributePrinciples({ historySans: c.history(), bestSan: 'Kd7', classification: 'blunder', opponentReply: null } as never);
    expect(atts.map((a) => a.id)).not.toContain('passive-king-endgame');
  });
});
