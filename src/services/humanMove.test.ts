import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import model from '../data/human-move-model.json';
import {
  HUMAN_FEATURES, featureRows, humanMoveProbabilities, moveFeatures, pickHumanMove, weightsAt,
  type HumanMoveModel, type ScoredMove,
} from './humanMove';
import { winningChances } from './winChance';

const at = (x: number[], f: typeof HUMAN_FEATURES[number]): number => x[HUMAN_FEATURES.indexOf(f)];

// After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4: the knight on d4 attacks f3; White can take e5.
const ITALIAN = 'r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

function movesOf(fen: string): Map<string, ReturnType<Chess['moves']>[number] & object> {
  const c = new Chess(fen);
  return new Map(c.moves({ verbose: true }).map((m) => [m.san, m]));
}

describe('the human move features, read off the board', () => {
  it('names a capture, its value, a check and a piece left where it can be taken', () => {
    const c = new Chess(ITALIAN);
    const ms = movesOf(ITALIAN);
    const nxe5 = moveFeatures(c, ms.get('Nxe5')!, 0, true);
    expect(at(nxe5, 'capture')).toBe(1);
    expect(at(nxe5, 'captureValue')).toBeCloseTo(1 / 9);
    expect(at(nxe5, 'knight')).toBe(1);
    expect(at(nxe5, 'best')).toBe(1);
    // The knight on f3 is attacked by the knight on d4: moving it flees.
    expect(at(nxe5, 'flee')).toBe(1);
    const bxf7 = moveFeatures(c, ms.get('Bxf7+')!, 0.3, false);
    expect(at(bxf7, 'check')).toBe(1);
    // The king takes the bishop for free.
    expect(at(bxf7, 'leftHanging')).toBe(1);
    const castle = moveFeatures(c, ms.get('O-O')!, 0.1, false);
    expect(at(castle, 'castle')).toBe(1);
    expect(at(castle, 'king')).toBe(0);
  });

  it('a developing move, a retreat, an edge pawn, the centre', () => {
    const fen = new Chess().fen();
    const c = new Chess(fen);
    const ms = movesOf(fen);
    expect(at(moveFeatures(c, ms.get('Nc3')!, 0, false), 'develop')).toBe(1);
    expect(at(moveFeatures(c, ms.get('h4')!, 0, false), 'edgePawn')).toBe(1);
    expect(at(moveFeatures(c, ms.get('e4')!, 0, false), 'centre')).toBe(1);
    const back = new Chess(ITALIAN);
    expect(at(moveFeatures(back, movesOf(ITALIAN).get('Bf1')!, 0, false), 'backward')).toBe(1);
  });

  it('loss is read in winning chances: a pawn thrown away in a won game costs little', () => {
    const fen = new Chess().fen();
    const even: ScoredMove[] = [{ uci: 'e2e4', cp: 30 }, { uci: 'a2a3', cp: -70 }];
    const won: ScoredMove[] = [{ uci: 'e2e4', cp: 900 }, { uci: 'a2a3', cp: 800 }];
    const lossEven = at(featureRows(fen, even).find((r) => r.uci === 'a2a3')!.x, 'loss');
    const lossWon = at(featureRows(fen, won).find((r) => r.uci === 'a2a3')!.x, 'loss');
    expect(lossWon).toBeLessThan(lossEven / 3);
    expect(lossEven).toBeCloseTo(winningChances(30) - winningChances(-70));
  });

  it('a move the engine did not score is left out', () => {
    const rows = featureRows(new Chess().fen(), [{ uci: 'e2e4', cp: 30 }, { uci: 'zz', cp: 0 }]);
    expect(rows.map((r) => r.uci)).toEqual(['e2e4']);
  });
});

describe('the model picks like a player of the rating', () => {
  const toy: HumanMoveModel = {
    version: 1,
    features: [...HUMAN_FEATURES],
    base: HUMAN_FEATURES.map((f) => (f === 'loss' ? -6 : 0)),
    slope: HUMAN_FEATURES.map((f) => (f === 'loss' ? -6 : 0)),
    curve: HUMAN_FEATURES.map(() => 0),
    centre: 1500,
    scale: 500,
    shift: 0,
    range: [600, 2600],
  };
  const fen = new Chess().fen();
  const scored: ScoredMove[] = [{ uci: 'e2e4', cp: 30 }, { uci: 'f2f3', cp: -120 }, { uci: 'g2g4', cp: -250 }];

  it('a stronger player gives up less', () => {
    const weak = humanMoveProbabilities(fen, scored, 800, toy).find((p) => p.uci === 'e2e4')!.p;
    const strong = humanMoveProbabilities(fen, scored, 2200, toy).find((p) => p.uci === 'e2e4')!.p;
    expect(strong).toBeGreaterThan(weak);
  });

  it('ratings outside the fitted range read as its edge (no extrapolation)', () => {
    expect(weightsAt(300, toy)).toEqual(weightsAt(600, toy));
    expect(weightsAt(3000, toy)).toEqual(weightsAt(2600, toy));
  });

  it('draws a legal scored move, reporting what it gave up', () => {
    const pick = pickHumanMove(fen, scored, 1500, () => 0.999);
    expect(pick).not.toBeNull();
    expect(scored.map((s) => s.uci)).toContain(pick!.uci);
    expect(pick!.cpLoss).toBeGreaterThanOrEqual(0);
    expect(pick!.candidates).toBe(3);
  });
});

describe('the shipped model was fitted on real players', () => {
  const m = model as unknown as HumanMoveModel;
  it('is a fitted model, on this feature list', () => {
    expect(m.version).toBeGreaterThanOrEqual(1);
    expect(m.features).toEqual([...HUMAN_FEATURES]);
    expect(m.base.some((w) => w !== 0)).toBe(true);
  });

  it('every player shuns a free blunder, and a stronger one shuns it more', () => {
    // 1.e4 e5 2.Nf3 Nc6: Nxe5?? drops the knight; Bc4 and Bb5 are book.
    const pos = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const sc: ScoredMove[] = [{ uci: 'f1c4', cp: 30 }, { uci: 'f1b5', cp: 35 }, { uci: 'd2d4', cp: 25 }, { uci: 'f3e5', cp: -250 }, { uci: 'a2a3', cp: -10 }];
    const pBlunder = (r: number): number => humanMoveProbabilities(pos, sc, r).find((p) => p.uci === 'f3e5')!.p;
    expect(pBlunder(1000)).toBeLessThan(0.2);
    expect(pBlunder(2200)).toBeLessThan(pBlunder(1000));
  });
});
