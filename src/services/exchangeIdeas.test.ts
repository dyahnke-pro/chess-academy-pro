// Computers batch 5 — every read on a real, chess.js-legal board, each with a
// silent case beside it. A read is only as good as the board it refuses.
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
  abandonedDuty, cPawnBlock, defenderTrade, denyExchange, dutyParity, exchangeForAttacker, exchangeIdeas,
  IDEA_KIND, knightSquares, maintenanceTrade, materialArithmetic, onlyDevelopedTrade, prepareRecapture,
  previousOwnMove, safeBecause, simplestWin, threatCost, tradeChoice, wingForCentre, type ExchangeIdea,
} from './exchangeIdeas';
import { imageryFor, IMAGERY } from './factImagery';
import { FACT_PROOF, FACT_ROLE, FACT_LAYER, TIE_ORDER, factKind } from './reviewFacetRank';
import { isProof } from './proof';

const fa = (moves: string): string => { const c = new Chess(); for (const m of moves.split(' ')) c.move(m); return c.fen(); };
const NO_DIGITS_IN_SPEECH = /\b\d+\s*(?:points?|%|percent)\b/;

/** Every emitted read: a real proof, squares on the board, the seat words. */
function wellFormed(x: ExchangeIdea | null): ExchangeIdea {
  expect(x).not.toBeNull();
  const r = x as ExchangeIdea;
  expect(isProof(r.proof)).toBe(true);
  expect(r.text).not.toMatch(/\b(?:we|our|us)\b/i);
  expect(r.text).not.toMatch(NO_DIGITS_IN_SPEECH);
  expect(r.text).not.toMatch(/\d\.\s?[NBRQKa-h]/); // no move numbers
  expect(r.kind).toBe(IDEA_KIND[r.id]);
  return r;
}

describe('trades', () => {
  it('trade off their only developed piece', () => {
    const r = wellFormed(onlyDevelopedTrade(fa('e4 e5 Nf3 Nc6 Bb5 a6'), 'Bxc6', 'w'));
    expect(r.text).toMatch(/only developed piece, the knight on c6/);
    expect(r.squares).toEqual(expect.arrayContaining(['c6', 'f8', 'g8', 'c8']));
    // Two developed pieces: no such fact.
    expect(onlyDevelopedTrade(fa('e4 e5 Nf3 Nc6 Bb5 Nf6'), 'Bxc6', 'w')).toBeNull();
  });

  it("the defender's trade: taking off one of their attackers", () => {
    const fen = 'r1bq1rk1/ppp2ppp/3b4/8/6n1/5N1P/PPPPBPP1/RNBQ1RK1 w - - 0 8';
    const r = wellFormed(defenderTrade(fen, 'hxg4', 'w'));
    expect(r.text).toMatch(/one of their attackers — their knight on g4 was aimed at your king/);
    expect(r.proof.line?.sans).toEqual(['hxg4', 'Bxg4']);
    // The same capture with only one attacker on the king is not a defence.
    expect(defenderTrade('r1bq1rk1/ppp2ppp/8/8/6n1/5N1P/PPPPBPP1/RNBQ1RK1 w - - 0 8', 'hxg4', 'w')).toBeNull();
  });

  it('the exchange for the key attacker, only where the engine agrees', () => {
    const fen = '6k1/ppp2ppp/3p4/4b3/8/8/PPP2PPP/4R1K1 w - - 0 1';
    const r = wellFormed(exchangeForAttacker(fen, 'Rxe5', 'w', 0));
    expect(r.text).toMatch(/your rook for their bishop on e5 — because that bishop was the piece attacking your king/);
    expect(exchangeForAttacker(fen, 'Rxe5', 'w', 180)).toBeNull(); // a mistake is not a plan
    expect(exchangeForAttacker(fen, 'Rxe5', 'w', null)).toBeNull(); // ungraded: unproven
  });

  it('deny the exchange that would double your pawns', () => {
    const r = wellFormed(denyExchange(fa('e4 e5 Nf3 Nc6 Bb5'), 'Nce7', 'b', null));
    expect(r.text).toMatch(/Your knight leaves c6, so their bishop can no longer take it there and double your pawns/);
    // Moving to d4 walks into the same damage (Nxd4 exd4 doubles the d-pawns).
    expect(denyExchange(fa('e4 e5 Nf3 Nc6 Bb5'), 'Nd4', 'b', null)).toBeNull();
  });

  it('the duty a recapture abandons: the back rank', () => {
    const r = wellFormed(abandonedDuty('3r2k1/pp3ppp/3q4/8/8/8/PP1Q1PPP/4R1K1 w - - 0 1', 'Qxd6', 'w'));
    expect(r.text).toBe('If they take back with the rook, it leaves the back rank, and Re8 is mate.');
    expect(r.proof.line?.sans).toEqual(['Qxd6', 'Rxd6', 'Re8#']);
    // With luft on h6 the rook's recapture costs nothing.
    expect(abandonedDuty('3r2k1/pp3pp1/3q3p/8/8/8/PP1Q1PPP/4R1K1 w - - 0 1', 'Qxd6', 'w')).toBeNull();
  });

  it('the trade is theirs to choose', () => {
    const r = wellFormed(tradeChoice(fa('e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6'), 'Be3', 'w'));
    expect(r.text).toMatch(/the choice is theirs: if they take on e3, you must take back with the f-pawn and double your pawns/);
    // Once the queen can take back on e3 too, nothing is forced on you.
    expect(tradeChoice(fa('e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 Qe2 d6'), 'Be3', 'w')).toBeNull();
  });

  it('duty parity: their attacker is as tied as your guard', () => {
    const r = wellFormed(dutyParity('6k1/5ppp/1q6/8/8/8/1P3PPP/1R4K1 w - - 0 1', 'w'));
    expect(r.text).toMatch(/your rook on b1 is tied to guarding the pawn on b2 — but their queen on b6 is just as tied/i);
    // A knight attacking is worth less than the rook guarding: the guard costs.
    expect(dutyParity('6k1/5ppp/8/8/2n5/8/1P3PPP/1R4K1 w - - 0 1', 'w')).toBeNull();
  });

  it('the maintenance trade keeps the pawn count', () => {
    const fen = fa('e4 e5 d4 d6 Nf3 Nc6 d5 Nce7 c4 f5');
    const r = wellFormed(maintenanceTrade(fen, 'exf5', 'w', 0));
    expect(r.text).toMatch(/Your pawn on e4 was attacked more often than it was defended, so it takes on f5 — that wins nothing/);
    // With a knight on c3 guarding e4, the pawn was never short of guards.
    expect(maintenanceTrade(fa('e4 e5 d4 d6 Nf3 Nc6 d5 Nce7 Nc3 f5'), 'exf5', 'w', 0)).toBeNull();
  });

  it('prepare the recapture before the capture', () => {
    const r = wellFormed(prepareRecapture(fa('d4 Nf6 c4 e6 Nc3 Bb4'), 'Qc2', 'w', null));
    expect(r.text).toBe('Your queen goes to c2 first, so if they take on c3 it takes back instead of a pawn.');
    expect(r.proof.line?.sans).toEqual(['Bxc3+', 'Qxc3']);
    // e3 does not give the knight a piece recapture.
    expect(prepareRecapture(fa('d4 Nf6 c4 e6 Nc3 Bb4'), 'e3', 'w', null)).toBeNull();
  });
});

describe('defence and conversion', () => {
  it('make the threat cost them', () => {
    const fen = '6k1/5ppp/1q6/8/6b1/5N2/PPP2PPP/3Q2K1 w - - 0 1';
    const r = wellFormed(threatCost(fen, 'h3', 'w'));
    expect(r.text).toBe('Now if they go ahead with Qxb2 anyway, you take their bishop on g4 — the threat costs them more than it wins.');
    expect(r.proof.line?.sans).toEqual(['Qxb2', 'hxg4']);
    // b3 simply removes the target: the threat is stopped, not made to cost.
    expect(threatCost(fen, 'b3', 'w')).toBeNull();
  });

  it('the simplest clean win among several', () => {
    const fen = '6k1/5ppp/8/3q4/8/8/5PPP/3R2K1 w - - 0 1';
    const lines = [{ moves: ['g2g3'], evaluation: 320, mate: null }, { moves: ['d1d5', 'g8f8'], evaluation: 900, mate: null }];
    const r = wellFormed(simplestWin(fen, 'w', lines));
    expect(r.text).toMatch(/Rxd5 is the simplest — it wins material straight away/);
    expect(r.namesMove).toBe(true);
    // Only one winning move: nothing to choose between.
    expect(simplestWin(fen, 'w', [lines[1], { moves: ['g2g3'], evaluation: 40, mate: null }])).toBeNull();
  });

  it('safe only because of an earlier move', () => {
    const now = '4r1k1/5ppp/8/8/8/7P/5PP1/3R2K1 w - - 0 1';
    const prev = { fenBefore: '4r1k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', san: 'h3' };
    const r = wellFormed(safeBecause(now, 'Rd7', 'w', prev));
    expect(r.text).toBe('Rd7 is fine only because your pawn is already on h3 — with it back on h2, Re1 would be mate.');
    // A move the earlier one did not make safe: nothing to say.
    expect(safeBecause(now, 'Kh2', 'w', prev)).toBeNull();
  });

  it('previousOwnMove reads the move before last from the game', () => {
    const hist = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'];
    expect(previousOwnMove(hist, fa('e4 e5 Nf3 Nc6'))).toEqual({ fenBefore: fa('e4 e5'), san: 'Nf3' });
    expect(previousOwnMove(hist, fa('d4 d5'))).toBeNull();
  });
});

describe('nuggets', () => {
  it('a wing pawn for a centre pawn', () => {
    const r = wellFormed(wingForCentre('6k1/5ppp/8/3p4/1n6/2N5/P4PPP/6K1 w - - 0 1', ['c3d5', 'b4a2'], 'w'));
    expect(r.text).toMatch(/wins their d-pawn for your a-pawn/);
    // Pieces traded on the way: not a pawn bargain.
    expect(wingForCentre('6k1/5ppp/8/3p4/1n6/2N5/P4PPP/6K1 w - - 0 1', ['c3d5', 'b4d5'], 'w')).toBeNull();
  });

  it('material arithmetic in words', () => {
    const r = wellFormed(materialArithmetic('6k1/pp3ppp/8/4p3/1b1PP3/8/PPP2PPP/6K1 w - - 0 1', 'dxe5', 'w'));
    expect(r.text).toBe('Three pawns for a piece — material is level.');
    expect(r.proof.kind).toBe('count');
    // An even trade of pawns changes no imbalance.
    expect(materialArithmetic(fa('e4 d5'), 'exd5', 'w')).toBeNull();
  });

  it('a knight is worth its squares', () => {
    const opp = wellFormed(knightSquares(fa('e4 e5 Nf3 Nc6 Bb5'), 'Na5', 'w', null));
    expect(opp.text).toMatch(/^On a5 their knight touches only four squares; in the centre it would touch eight/);
    expect(opp.proof.squares).toHaveLength(5);
    const back = wellFormed(knightSquares(fa('Na3 e5'), 'Nc4', 'w', 0));
    expect(back.text).toMatch(/Your knight on c4 now touches eight squares, up from four on a3/);
    // The student's own rim move that cost nothing is never criticised.
    expect(knightSquares(fa('Nc3 e5'), 'Na4', 'w', 10)).toBeNull();
  });

  it("don't block the c-pawn in a d-pawn opening", () => {
    const r = wellFormed(cPawnBlock(fa('d4 d5'), 'Nc3', 'w', null));
    expect(r.text).toMatch(/knight on c3 stands in front of your c-pawn — that pawn wants to go to c4/);
    expect(cPawnBlock(fa('d4 d5 c4 e6'), 'Nc3', 'w', null)).toBeNull(); // the c-pawn already moved
    expect(cPawnBlock(fa('d4 d5'), 'Nc3', 'w', 'Nc3')).toBeNull(); // the engine's own move
  });
});

describe('the aggregator and the one door', () => {
  it('every kind is a teaching, proven fact with a layer and a tie place', () => {
    for (const k of ['trade-idea', 'defence-idea', 'nugget'] as const) {
      expect(FACT_ROLE[k]).toBe('teach');
      expect(FACT_PROOF[k]).toBe('proven');
      expect(FACT_LAYER[k]).toBeDefined();
      expect(TIE_ORDER[k]).toBeGreaterThan(0);
      expect(factKind(`[${k}] x`)).toBe(k);
    }
  });

  it('a read names the next move only where the move is earned', () => {
    const fen = '6k1/5ppp/8/3q4/8/8/5PPP/3R2K1 w - - 0 1';
    const lines = [{ moves: ['g2g3'], evaluation: 320, mate: null }, { moves: ['d1d5'], evaluation: 900, mate: null }];
    expect(exchangeIdeas({ fen, student: 'w', lines, nameMove: false }).some((x) => x.id === 'simplest-win')).toBe(false);
    expect(exchangeIdeas({ fen, student: 'w', lines, nameMove: true }).some((x) => x.id === 'simplest-win')).toBe(true);
  });

  it('the start position says nothing', () => {
    expect(exchangeIdeas({ fen: new Chess().fen(), student: 'w', lines: [], nameMove: true })).toEqual([]);
  });

  it('imagery rotates on a stable key, with a quiet turn', () => {
    expect(imageryFor('badbishop', 1)).toBe(IMAGERY.badbishop[1]);
    expect(imageryFor('badbishop', 0)).toBeNull();
    expect(imageryFor('badbishop', 4)).toBe(imageryFor('badbishop', 4));
  });

  it('review: the maintenance trade reaches the facets with its proof', async () => {
    const { computeMoveFacets, NO_TEACHING_CONTEXT } = await import('./reviewFullData');
    const sans = 'e4 e5 d4 d6 Nf3 Nc6 d5 Nce7 c4 f5 exf5'.split(' ');
    const c = new Chess(); for (const s of sans.slice(0, 10)) c.move(s);
    const fenBefore = c.fen(); c.move('exf5');
    const proofs = new Map();
    const facets = computeMoveFacets({ seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore, fenAfter: c.fen(), san: 'exf5', ply: 11, moverColor: 'white', playerColor: 'white', studentColorWB: 'w',
      evaluation: 30, preMoveEval: 30, costCp: 0, classification: 'good', bestMoveSan: null, prevCap: { square: null, capturedValue: 0 },
      allSans: sans, forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], replyBestSan: null }, undefined, undefined, undefined, undefined, undefined, proofs);
    const f = facets.find((x) => x.startsWith('[trade-idea]') && /keeps the pawn count/.test(x));
    expect(f).toBeDefined();
    expect(isProof(proofs.get(f))).toBe(true);
  }, 30_000);

  it('Learn composer: duty parity speaks through the door as a trade idea', async () => {
    const { computePositionFacts } = await import('./positionFacts');
    const fen = '6k1/5ppp/1q6/8/8/8/1P3PPP/1R4K1 w - - 0 1';
    const line = (rank: number, evaluation: number): { rank: number; evaluation: number; moves: string[]; mate: null } => ({ rank, evaluation, moves: [], mate: null });
    const r = await computePositionFacts({ posture: 'walk', fen, moverColor: 'b', studentColor: 'w',
      analysis: { topLines: [line(1, 0), line(2, -10)], evaluation: 0, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 300, draw: 400, loss: 300 } } } as never);
    const c = r.clauses.find((x) => x.kind === 'trade-idea');
    expect(c?.text).toMatch(/just as tied to attacking it/);
    expect(c && isProof(c.proof)).toBe(true);
    expect(r.remember).toContain('duty-parity:b1b2b6');
  }, 30_000);
});

describe('diagnose: a capture that abandons its post is posed to the student model', () => {
  const FEN = '6k1/5ppp/8/5b2/4B3/1n6/3N1PPP/6K1 w - - 0 1';
  it('the knight that takes on b3 leaves the e4 bishop to fall', async () => {
    const { captureAbandonsDuty } = await import('./exchangeIdeas');
    expect(captureAbandonsDuty(FEN)).toBe('material');
    expect(captureAbandonsDuty(new Chess().fen())).toBeNull();
  });
  it('capabilitiesPosed carries it, so held/broken is recorded on every surface', async () => {
    const { capabilitiesPosed } = await import('./capabilityEvidence');
    const posed = capabilitiesPosed(FEN, 'Nxb3', 'white');
    expect(posed).toContainEqual({ tag: 'hung-material', posedImportance: 85 });
  });
});
