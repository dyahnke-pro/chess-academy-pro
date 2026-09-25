// WO-LAYERS-01 step 4 — "don't buy the bluff".
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detectBluff, bluffClause } from './bluffDetector';

const fen = (moves: string[]): string => { const c = new Chess(); for (const m of moves) c.move(m); return c.fen(); };

describe('detectBluff', () => {
  it("Rubinstein …Nd4: hits the b5-bishop and the f3-knight, wins nothing — a bluff", () => {
    const b = detectBluff(fen(['e4', 'e5', 'Nf3', 'Nf6', 'Nc3', 'Nc6', 'Bb5']), 'Nd4');
    expect(b).not.toBeNull();
    expect(b!.square).toBe('d4');
    expect(b!.targets.map((t) => t.square).sort()).toEqual(['b5', 'f3']);
    expect(bluffClause(b!, true)).toMatch(/wins nothing — no need to react; keep developing/);
  });

  it('negative control: the same jump onto a LOOSE piece is a real threat, not a bluff', () => {
    // Without Nc3 the b5-bishop is loose: …Nd4 hits it for real.
    expect(detectBluff(fen(['e4', 'e5', 'Nf3', 'Nf6', 'Bb5', 'Nc6', 'O-O']), 'Nd4')).toBeNull();
  });

  it('a check is never a bluff, and a move on its own half never looks aggressive', () => {
    expect(detectBluff(fen(['e4', 'e5', 'Nf3', 'd6']), 'Bb5+')).toBeNull();
    expect(detectBluff(new Chess().fen(), 'Nf3')).toBeNull();
  });
});

describe('the bluff reaches the LIVE composer (a wire that does not fire is not a wire)', () => {
  const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
  const flat = { topLines: [line(1, 20), line(2, 15), line(3, 10)], evaluation: 20, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 420, draw: 400, loss: 180 } };
  const before = fen(['e4', 'e5', 'Nf3', 'Nf6', 'Nc3', 'Nc6', 'Bb5']);
  const after = (() => { const c = new Chess(before); c.move('Nd4'); return c.fen(); })();

  it('Learn hears "wins nothing — no need to react" after …Nd4', async () => {
    const { computePositionFacts } = await import('./positionFacts');
    const r = await computePositionFacts({
      posture: 'walk', fen: after, moverColor: 'w', studentColor: 'w', analysis: flat,
      opponentLastMove: { fenBefore: before, san: 'Nd4' },
    });
    const all = [...r.clauses, ...r.quiet].map((c) => c.text).join(' | ');
    expect(all).toMatch(/Their knight on d4 looks aggressive.*wins nothing/);
  });

  it('negative control: without the opponent move there is nothing to read', async () => {
    const { computePositionFacts } = await import('./positionFacts');
    const r = await computePositionFacts({ posture: 'walk', fen: after, moverColor: 'w', studentColor: 'w', analysis: flat });
    expect([...r.clauses, ...r.quiet].map((c) => c.text).join(' ')).not.toMatch(/looks aggressive/);
  });
});

// Hand walk 2340 (Alapin): four moves where "it wins nothing — no need to
// react" contradicted a real threat said on the same move.
describe('never a bluff when something real is there', () => {
  const G = 'e4 c5 Nf3 Nc6 c3 e5 d4 cxd4 cxd4 d5 exd5 Qxd5 Nc3 Bb4 Bd2 Bxc3 Bxc3 Nge7 dxe5 Bg4 Be2 Qe4 O-O Rd8 Qe1 Nd5 Bd1 Qxe1 Rxe1 Nxc3 bxc3 O-O h3 Be6 Bc2 Rd1 Bb3 Rdd8 Bd1 Bb3 Bc2 Be6 Bb3 Rd3'.split(' ');
  const before = (upTo: number): string => { const c = new Chess(); for (const s of G.slice(0, upTo)) c.move(s); return c.fen(); };
  const at = (san: string, nth = 1): number => { let seen = 0; for (let i = 0; i < G.length; i++) if (G[i] === san && ++seen === nth) return i; return -1; };
  it('a pin on the knight to the king (7…Bb4)', () => {
    expect(detectBluff(before(at('Bb4')), 'Bb4')).toBeNull();
  });
  it('a pin on the knight to the queen (10…Bg4)', () => {
    expect(detectBluff(before(at('Bg4')), 'Bg4')).toBeNull();
  });
  it('a piece that can simply be taken (20…Bb3, axb3 wins it)', () => {
    expect(detectBluff(before(at('Bb3', 2)), 'Bb3')).toBeNull();
  });
  it('a rook that wins a pawn (22…Rd3 takes c3)', () => {
    expect(detectBluff(before(at('Rd3')), 'Rd3')).toBeNull();
  });
});
