// Learn walk oct3c (2026-10-03): a recapture is not a trade the mover chose.
import { describe, it, expect } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';

describe('a recapture is not the idea (walk oct3c, 4.Qe2)', () => {
  const FEN = 'r1bqkbnr/pp1p1ppp/2n1p3/2p1P3/2B5/8/PPPP1PPP/RNBQK1NR w KQkq - 1 4';
  it('Nf3 …Qc7 O-O …Nxe5 Nxe5: Black started that trade — not "trade off the knight"', () => {
    const r = betterMoveReason(FEN, 'Qe2', 'Nf3',
      ['g1f3', 'd8c7', 'e1g1', 'c6e5', 'f3e5', 'c7e5', 'f1e1', 'e5f4'], 'white', null, false);
    expect(r ?? '').not.toMatch(/trade off/);
  });
  it('the mover opening the exchange still reads as its trade (positive control)', () => {
    // Bxc6 takes first on c6: that trade is White's own.
    const r = betterMoveReason('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4', 'O-O', 'Bxc6',
      ['b5c6', 'd7c6', 'e1g1', 'f7f6', 'd2d4', 'e5d4', 'f3d4', 'c6c5'], 'white', null, false);
    expect(r ?? '').toMatch(/trade off|take the knight/);
  });
});

describe('"still hanging" reads the line, not "is it attacked" (walk oct3c, 2.Bb5+)', () => {
  it('d5 is defended — exd5 Qxd5 is a trade, so it is not "hanging"', async () => {
    const { callInaccuracy } = await import('./inaccuracyCall');
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      playedSan: 'Bb5+', bestSan: 'exd5',
      bestLineUci: ['e4d5', 'd8d5', 'b1c3', 'd5d8', 'd2d4', 'g8f6', 'g1f3', 'e7e6'],
      cpLoss: 120, side: 'coach', dictated: true, moverColor: 'white' });
    expect(call?.said ?? '').not.toMatch(/still hanging/);
  });
});


describe('king cover is the one shield rule (walk oct3d, 11.Nxe5)', () => {
  it('…dxe5 from d6, in front of the king on e8, is king cover', async () => {
    const { readTrade } = await import('./tradeQuality');
    const r = readTrade('r1q1k1nr/p1p1bppp/1p1p4/3Pn3/8/2P2NP1/PP2QP1P/RNB1K2R w KQkq - 0 11', 'Nxe5', 'w', null, null);
    expect(r?.text ?? '').toMatch(/king's cover/);
  });
  it('NEGATIVE: a pawn three ranks in front of the king is not its cover', async () => {
    const { recaptureDamage } = await import('./tradeQuality');
    const { Chess } = await import('chess.js');
    // After Nxg4, Black's only recapture is …fxg4 from f5 — three ranks in
    // front of the king on g8, outside the shield.
    const after = new Chess('3q2k1/5p1p/8/5p2/6n1/4N3/5PPP/3Q2K1 w - - 0 1');
    after.move('Nxg4');
    expect(recaptureDamage(after, 'g4')).not.toBe('king-cover');
  });
});

describe('no capture is read off a board where the other side is in check (walk oct3e, 10.Bb5+)', () => {
  // After 10.Bb5+, Black to move and in check. f7 is hit by Ne5 and Qf3 and
  // held by the queen and the king; Black answers the check first.
  const FEN = 'rnb1k2r/p3qpbp/1p2p1pn/1B1pN3/6P1/1P3Q2/P1PP1P1P/RNB1K2R b KQkq - 2 10';
  it('the f7 pawn is not "winnable" for White on that board', async () => {
    const { signedLegalSeeFor, legalSeeGainFor, asIfToMove } = await import('./positionReadingService');
    expect(asIfToMove(FEN, 'w')).toBeNull();
    expect(signedLegalSeeFor(FEN, 'f7', 'w')).toBe(0);
    expect(legalSeeGainFor(FEN, 'f7', 'w')).toBe(0);
  });
  it('NEGATIVE CONTROL: no check — the flip stands and a real hang still reads', async () => {
    const { signedLegalSeeFor } = await import('./positionReadingService');
    // Black to move, not in check; the knight on g5 hangs to the queen.
    expect(signedLegalSeeFor('r1bqkbnr/pppp1ppp/2n5/6N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5', 'g5', 'b')).toBeGreaterThan(0);
  });
});

describe('a cramped bishop is not "a piece that can\'t move" (walk oct3g, 16.Na3)', () => {
  it('the verdict says the square count the detector computed', async () => {
    const { attributeLiveFundamental } = await import('./liveFundamental');
    const { renderFundamentalVerdict } = await import('./principleVoice');
    const fenBefore = 'r2q3r/1b1p1kp1/p2bpnpp/1pp5/7N/1PP3P1/P2PQP1P/RNB2RK1 w - - 2 16';
    const historySans = 'e4 c5 Bc4 e6 e5 Nc6 Qe2 a6 b3 Nd4 Qd3 h6 c3 Nc6 Qf3 Nxe5 Qe2 Bd6 Nf3 Ng6 g3 Nf6 O-O b5 Bd3 Bb7 Bxg6 fxg6 Nh4 Kf7 Na3'.split(' ');
    const attrs = attributeLiveFundamental({ fenBefore, historySans, playedSan: 'Na3', bestSan: 'd3', replySan: null,
      studentColor: 'white', costCp: 120, evalBeforeWhiteCp: -229, evalAfterWhiteCp: -291 });
    const buried = attrs.find((a) => a.id === 'buried-own-bishop');
    expect(buried, 'the detector should still name the cramped bishop').toBeTruthy();
    expect(buried?.facts.squaresLeft).toBe(1);
    for (let ply = 0; ply < 6; ply += 1) {
      const said = renderFundamentalVerdict([buried!], { ply, seen: new Set(), replySan: null });
      expect(said).not.toMatch(/can't move|nowhere to go/);
    }
  });
});

describe('a fork wins only when two targets are winnable (walk oct3g, 8…Nxe5)', () => {
  it('Nxe5 hits the queen and the c4 bishop, but b3 guards c4 — no fork', async () => {
    const { detectTactics } = await import('./tacticsDetector');
    const r = detectTactics('r1bqkbnr/1p1p1pp1/p3p2p/2p1n3/2B5/1PP2Q2/P2P1PPP/RNB1K1NR w KQkq - 0 9');
    const forks = r.tactics.filter((t) => t.type === 'fork' && t.involvedSquares[0] === 'e5');
    expect(forks).toEqual([]);
  });
  it('NEGATIVE CONTROL: a knight on two undefended pieces is still a fork', async () => {
    const { detectTactics } = await import('./tacticsDetector');
    const r = detectTactics('7k/8/8/5b2/3N4/1r6/8/7K b - - 0 1');
    const forks = r.tactics.filter((t) => t.type === 'fork' && t.involvedSquares[0] === 'd4');
    expect(forks.length).toBeGreaterThan(0);
  });
});

describe('"hanging" is a piece lost for at most a pawn (walk oct3g, 23.Nh4)', () => {
  it('g3 guards h4: …Bxh4 gxh4 …Qxh4 nets a pawn, not the knight', async () => {
    const { whyItFailed } = await import('./whyItFailed');
    const r = whyItFailed({
      fenBefore: 'r2q3r/1b1p1kp1/p3pb2/2p4p/1pP1n1p1/1P1Q1NP1/P1NP1P1P/1RB2RK1 w - - 0 23',
      playedSan: 'Nh4', studentColor: 'white',
      playedLineUci: ['e4g5', 'f2f3', 'g5h3', 'g1h1', 'f6h4', 'g3h4'],
    });
    expect(r?.line ?? '').not.toMatch(/hanging/);
    expect(r?.missed ?? '').not.toMatch(/hanging/);
  });
});

describe('what a plan took and gave is the ledger\'s list (walk oct3g, 30.Ng4)', () => {
  it('the punishing line wins the queen for a bishop — not "a rook"', async () => {
    const { punishmentOf } = await import('./inaccuracyCall');
    // The app's own recorded reply line after 30.Ng4.
    const R = 'e4g5 e2g2 b7g2 g1g2 g8g6 d2d4 g5h3 f1f6 g6g4 f6h6 d8g8 c2b4 h3f4 c1f4 g4f4 b4d3 f4f8'.split(' ');
    const p = punishmentOf('r2q2r1/1b1pk3/p3pb2/2p5/1pP1n3/1P2N1pP/P1NPQ3/1RB2RK1 w - - 1 30', 'Ng4', R, 'white');
    expect(p?.why ?? '').not.toMatch(/a rook/);
    expect(p?.why ?? '').toMatch(/the queen/);
  });
});

describe('"gives away real material" is a ledger fact (walk oct3g, 29…Ke7)', () => {
  const F = 'r2q2r1/1b1p1k2/p3pb2/2p5/1pP1n3/1P2N1pP/P1NPQ3/1RB2RK1 b - - 0 29';
  it('a blunder that only lets the win slip says the advantage, not material', async () => {
    const { callInaccuracy } = await import('./inaccuracyCall');
    const call = callInaccuracy({ priorMove: null, replySan: null, fenBefore: F, playedSan: 'Ke7', bestSan: 'Nf2',
      bestLineUci: ['e4f2', 'e2h5', 'g8g6', 'c1b2', 'd8h8', 'h5h8', 'a8h8', 'f1f2'],
      replyLineUci: ['d2d3', 'e4f2', 'e3f5', 'e7f7', 'e2h5', 'g8g6', 'h5h7'],
      cpLoss: 444, side: 'coach', dictated: true, moverColor: 'black' });
    expect(call?.said ?? '').toMatch(/blunder/);
    expect(call?.said ?? '').not.toMatch(/real material/);
  });
});
