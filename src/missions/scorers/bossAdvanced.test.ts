import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { scoreCandidates, type ScoringContext, type ScorerId, type ScorerWeights } from '../moveScoring';
import { kingZoneAttacks } from './bossKingPressure';
import { AHEAD_CP } from './bossSimplify';
import { captureNet } from './trades';
import './bossImbalance';
import { ATTACKER } from '../bosses/attacker';
import { GRINDER } from '../bosses/grinder';

/** Every board here is reached by legal moves from the start (chess.js). */
const fenOf = (sans: string): string => { const b = new Chess(); for (const s of sans.split(' ')) b.move(s); return b.fen(); };
const ctxFor = (fen: string, coachEvalCp: number | null = 0): ScoringContext => ({
  fen, coach: fen.split(' ')[1] === 'b' ? 'b' : 'w', windowCp: 100, coachEvalCp, pattern: null, phase: null, bossId: null, targets: [], focus: null,
});
const likingW = (weights: ScorerWeights, fen: string, uci: string, coachEvalCp: number | null = 0): number =>
  scoreCandidates([{ uci, cpLoss: 0 }], ctxFor(fen, coachEvalCp), weights)[0].score;
const liking = (id: ScorerId, fen: string, uci: string, coachEvalCp: number | null = 0): number => likingW({ [id]: 1 }, fen, uci, coachEvalCp);

/** Both sides castled short, White to move. */
const CASTLED = fenOf('e4 e5 Nf3 Nc6 Bc4 Nf6 Nc3 Bc5 O-O O-O');
/** 1.e4 e5 2.Nc3 Nf6 3.Nd5 — Black to move; …Nxd5 exd5 is an even knight trade. */
const KNIGHT_TRADE = fenOf('e4 e5 Nc3 Nf6 Nd5');
/** The Ruy Lopez after 3…a6 — White to move; Bxc6 (d/bxc6) is an even bishop-for-knight trade. */
const RUY = fenOf('e4 e5 Nf3 Nc6 Bb5 a6');
/** 3…Nxd2 — White to move; Nxd2 RECAPTURES the knight (nothing takes back on d2). */
const RECAPTURE = fenOf('d4 Nf6 Nf3 Ne4 Nbd2 Nxd2');
/** 3…a6 — White to move; Bxg4 takes a knight nobody defends: a win, not a trade. */
const LOOSE_KNIGHT = fenOf('e4 Nf6 Nc3 Ng4 Be2 a6');

describe('kingPressure (the Attacker): more of its pieces bearing around the student\'s king', () => {
  it('counts every attack on the squares around the king, never the king\'s own square', () => {
    // Before: only Bc4 hits f7. After Ng5 the knight adds f7 and h7.
    expect(kingZoneAttacks(new Chess(CASTLED), 'w')).toBe(1);
    const afterNg5 = new Chess(CASTLED); afterNg5.move('Ng5');
    expect(kingZoneAttacks(afterNg5, 'w')).toBe(3);
  });

  it('likes a move that adds pressure, is neutral on a quiet one, dislikes pulling it away', () => {
    expect(liking('kingPressure', CASTLED, 'f3g5')).toBe(1);
    expect(liking('kingPressure', CASTLED, 'a2a3')).toBe(0);
    // Bb3 keeps the same diagonal on f7: no change.
    expect(liking('kingPressure', CASTLED, 'c4b3')).toBe(0);
    expect(liking('kingPressure', CASTLED, 'c4e2')).toBe(-1);
  });

  it('fail twin: a CHECK is not pressure on the king\'s squares — Bxf7+ leaves none hit', () => {
    expect(liking('kingPressure', CASTLED, 'c4f7')).toBe(-1);
  });

  it('reads the Black coach the same way (…Ng4 hits f2 and h2 beside White\'s king)', () => {
    const black = fenOf('e4 e5 Nf3 Nc6 Bc4 Nf6 Nc3 Bc5 O-O O-O a3');
    expect(liking('kingPressure', black, 'f6g4')).toBe(1);
    expect(liking('kingPressure', black, 'a7a6')).toBe(0);
  });
});

describe('imbalance (the Dynamo): bishop for knight yes, like for like no', () => {
  it('the fixtures are the trades they say (legal SEE)', () => {
    expect(captureNet(RUY, 'b5c6')).toBe(0);
    expect(captureNet(KNIGHT_TRADE, 'f6d5')).toBe(0);
    expect(captureNet(RECAPTURE, 'f3d2')).toBe(3);
    expect(captureNet(LOOSE_KNIGHT, 'e2g4')).toBe(3);
  });

  it('likes an even bishop-for-knight trade', () => {
    expect(liking('imbalance', RUY, 'b5c6')).toBe(1);
  });

  it('dislikes starting an even like-for-like trade', () => {
    expect(liking('imbalance', KNIGHT_TRADE, 'f6d5')).toBe(-1);
  });

  it('fail twins: a recapture of the same kind, a bishop winning a loose knight, a quiet move — all 0', () => {
    expect(liking('imbalance', RECAPTURE, 'f3d2')).toBe(0);
    expect(liking('imbalance', LOOSE_KNIGHT, 'e2g4')).toBe(0);
    expect(liking('imbalance', RUY, 'b5a4')).toBe(0);
    // A pawn trade is no imbalance: 1.e4 d5 exd5.
    expect(liking('imbalance', fenOf('e4 d5'), 'e4d5')).toBe(0);
  });
});

describe('simplify (the Grinder): even trades of pieces while a pawn or more up', () => {
  it('likes an even piece trade when the coach stands a pawn up', () => {
    expect(liking('simplify', KNIGHT_TRADE, 'f6d5', AHEAD_CP)).toBe(1);
    expect(liking('simplify', RUY, 'b5c6', 250)).toBe(1);
  });

  it('fail twins: not ahead enough, no read, a pawn trade, a capture that wins — all 0', () => {
    expect(liking('simplify', KNIGHT_TRADE, 'f6d5', AHEAD_CP - 1)).toBe(0);
    expect(liking('simplify', KNIGHT_TRADE, 'f6d5', null)).toBe(0);
    expect(liking('simplify', fenOf('e4 d5'), 'e4d5', 300)).toBe(0);
    expect(liking('simplify', LOOSE_KNIGHT, 'e2g4', 300)).toBe(0);
  });

  it("the Grinder's two halves: trades ahead, refuses the same trade behind, indifferent level", () => {
    expect(likingW(GRINDER.weights, KNIGHT_TRADE, 'f6d5', 150)).toBe(1);
    expect(likingW(GRINDER.weights, KNIGHT_TRADE, 'f6d5', -150)).toBe(-1);
    expect(likingW(GRINDER.weights, KNIGHT_TRADE, 'f6d5', 0)).toBe(0);
  });
});

describe('the advanced bosses stay inside their window', () => {
  it('the Attacker plays Ng5 over a3 inside the window, never when Ng5 costs more than the window', () => {
    const ctx = ctxFor(CASTLED);
    expect(scoreCandidates([{ uci: 'a2a3', cpLoss: 0 }, { uci: 'f3g5', cpLoss: 40 }], ctx, ATTACKER.weights)[0].uci).toBe('f3g5');
    expect(scoreCandidates([{ uci: 'a2a3', cpLoss: 0 }, { uci: 'f3g5', cpLoss: 150 }], ctx, ATTACKER.weights).map((c) => c.uci)).toEqual(['a2a3']);
  });

  it('an illegal candidate scores nothing (never a throw)', () => {
    for (const id of ['kingPressure', 'imbalance', 'simplify'] as const) expect(liking(id, CASTLED, 'a1a8', 300)).toBe(0);
  });
});
