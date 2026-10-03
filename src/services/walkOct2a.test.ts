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
    const w = whyItFailed({ fenBefore: c.fen(), playedSan: 'Be7', studentColor: 'black', playedLineUci: null });
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

import { assessPositionalEdge } from './reviewPositionalAssessment';

describe('Learn walk oct2a F7', () => {
  it('a castled king is not called a developed piece', () => {
    // White: Bd2, Bf3, castled; Black: Nc6 — two pieces to one, plus castling.
    const fen = 'r2qkb1r/ppp2ppp/2n1p3/3p4/3P4/4PB2/PPPB1PPP/R2Q1RK1 b kq - 1 9';
    const r = assessPositionalEdge(fen, 'w', 120).reasons.join(' ');
    expect(r).not.toMatch(/two pieces further developed/);
    expect(r).toMatch(/ahead in development: two pieces out and castled, against one piece out/);
  });
});

import { replyKeptWinOf } from './backwardLook';
import { callInaccuracyDetailed } from './inaccuracyCall';

describe('Learn walk oct3a #18', () => {
  const fenBefore = 'k1r5/pp3pp1/q1r1p1p1/b2p4/3P1B1P/Q1P3P1/PP1R1P2/K6R w - - 9 29';
  const fenAfter = 'k1r5/pp3pp1/q1r1p1p1/b2p3P/3P1B2/Q1P3P1/PP1R1P2/K6R b - - 0 29';
  // The engine's replies to 28.h5 (depth 18): …g5 +2.92, …Rxc3 +2.33.
  const lines = [{ moves: ['g6g5'], evaluation: 292 }, { moves: ['c6c3'], evaluation: 233 }, { moves: ['g6h5'], evaluation: 143 }];
  it('…Rxc3 is another road to the win, not a miss', () => {
    expect(replyKeptWinOf(fenAfter, 'Rxc3', lines)).toBe(true);
    expect(replyKeptWinOf(fenAfter, 'gxh5', lines)).toBe(false);
    const v = callInaccuracyDetailed({
      fenBefore, playedSan: 'h5', bestSan: 'Kb1', cpLoss: 290, evalBeforeMoverCp: 0, evalAfterMoverCp: -290,
      side: 'student', moverColor: 'white', replyLineUci: ['g6g5', 'f4e5', 'f7f6', 'e5f6'], replySan: 'Rxc3',
      replyKeptWin: true, priorMove: null,
    } as unknown as Parameters<typeof callInaccuracyDetailed>[0]);
    expect(JSON.stringify(v)).not.toMatch(/missed it/);
  });
});

import { characterOf } from './positionCharacter';

describe('Learn walk oct3a #33', () => {
  it('after 9.bxc3 with …exd4 to come, Black is not "down material"', () => {
    const fen = 'r1bqk2r/pppp1pp1/5n1p/4p3/3NP2B/2PP4/P1P1BPPP/R2QK2R b KQkq - 0 9';
    expect(characterOf({ fen, studentColor: 'black', tacticLive: false, bestGapCp: 20 })).not.toBe('defence');
  });
});

import { backwardLook } from './backwardLook';

describe('Learn walk oct3a #40', () => {
  it('a coach move that drops +5.75 to +4.25 is not "a mistake" — backwardLook passes the eval through', () => {
    const fenBefore = 'r2qk2r/p2b1p1n/7p/1p1QP1p1/2PP4/3P2B1/P3BPPP/1R2K2R w Kkq - 0 18';
    const after = new Chess(fenBefore); after.move('c5');
    const look = backwardLook({ priorMove: null, replySan: null, fenBefore, fenAfter: after.fen(),
      playedSan: 'c5', bestSan: 'e6', bestPvUci: ['e5e6', 'd7e6', 'd5b5'], cpLoss: 150,
      moverEvalAfterCp: 425, studentColor: 'white', side: 'coach', dictated: true });
    expect(look?.line ?? '').not.toMatch(/is a mistake/);
  });
});

import { principleLine } from './moveFundamentals';

describe('Learn walk oct3a #47', () => {
  it('a queen on a half-open file is never told "a rook needs an open file"', () => {
    const fen = '3qk2r/p1P2p1n/1r2b2p/1pQ1P1p1/3P4/3P2B1/P3BPPP/1R2K2R b Kk - 0 21';
    const s = JSON.stringify(principleLine(fen, 'Qc8', 'black', new Set(), 0) ?? '');
    expect(s).not.toMatch(/a rook needs/);
  });
});

import { renderFundamentalVerdict } from './principleVoice';

describe('Learn walk oct3a #57', () => {
  it('a grabber taken after a trade is never "captured straight away / on the spot"', () => {
    const attr = { id: 'poisoned-pawn', weight: 4, tag: 'poisoned-pawn', coOccurrence: [],
      evidence: { squares: ['c7'], moves: [], pvMoves: [], counterfactualClean: true },
      facts: { piece: 'knight', square: 'c7', fled: 0, immediate: 0 } };
    for (let ply = 0; ply < 6; ply++) {
      const s = renderFundamentalVerdict([attr] as unknown as Parameters<typeof renderFundamentalVerdict>[0], { ply, seen: new Set(), replySan: null } as unknown as Parameters<typeof renderFundamentalVerdict>[1]);
      expect(s).not.toMatch(/straight away|on the spot|the moment it lands/);
    }
  });
});

describe('Learn walk oct3a #86', () => {
  it('a pawn the engine does not take is not "won" by the knight', () => {
    const fenBefore = '2r1k3/p2p1ppr/1q3n1p/5N2/1n2p3/6P1/3Q1P1P/R4RK1 b - - 1 25';
    const after = new Chess(fenBefore); after.move('g6');
    const look = backwardLook({ priorMove: null, replySan: 'Nd6+', fenBefore, fenAfter: after.fen(),
      playedSan: 'g6', bestSan: 'Nd3', bestPvUci: [], replyPvUci: ['f5d6', 'e8d8', 'd6c8', 'd8c8'],
      cpLoss: 120, moverEvalAfterCp: 190, studentColor: 'black' });
    expect(look?.line ?? '').not.toMatch(/knight on f5 wins it/);
  });
});
