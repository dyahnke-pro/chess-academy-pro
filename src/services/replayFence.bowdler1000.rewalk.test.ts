/**
 * REPLAY FENCE — Bowdler, 1000-rated (lichess K6K9k4lK, student Black),
 * re-walked by hand 2026-09-27 on the branch build.
 */
import { describe, it, expect } from 'vitest';
import { callInaccuracyDetailed } from './inaccuracyCall';

describe('ply 58 — …Rd4+ walked into a discovered check, and the grade says so', () => {
  // Real Stockfish 18, depth 16: before …Rd4+ Black is +166 (best …Kf8);
  // after it White answers Kf5+, the king leaving the g-file and the rook on g1
  // checking behind it.
  const args = {
    fenBefore: 'r5k1/pR6/5p1p/2p1b3/2P3KP/3r4/PP3P2/6R1 b - - 1 29', playedSan: 'Rd4+', bestSan: 'Kf8',
    bestLineUci: ['g8f8', 'g4h5', 'f6f5', 'f2f4', 'e5d4', 'g1g6'],
    cpLoss: 143, side: 'student' as const, moverColor: 'black' as const,
    replyLineUci: ['g4f5', 'g8h8', 'g1g6', 'f6f5', 'g6h6', 'h8g8'], replySan: 'Kf5+',
  };
  it('names the discovered check, not a bare grade', () => {
    const said = callInaccuracyDetailed(args).call?.said ?? '';
    expect(said).toMatch(/Rd4\+ was a mistake — it let them in with Kf5\+, a discovered check from the rook on g1/);
  });
});

describe('ply 16 — the material edge is said in pieces', async () => {
  const { materialEdgeWords } = await import('./reviewPositionalAssessment');
  const { Chess } = await import('chess.js');
  const pieces = (fen: string) => new Chess(fen).board().flat().filter((x): x is NonNullable<typeof x> => !!x);
  it('a bishop for two pawns, never "a pawn"', () => {
    // After 9.Qxe7+ Bxe7 — Black has both bishops, White two extra pawns.
    expect(materialEdgeWords(pieces('rnb4r/pp2bkpp/5n2/2p5/8/2N5/PPPP1PPP/R1B1K1NR w KQ - 0 9'), 'b', 'w')).toBe('a bishop for two pawns');
  });
  it('a plain extra pawn is still a pawn', () => {
    expect(materialEdgeWords(pieces('4k3/pp6/8/8/8/8/PPP5/4K3 w - - 0 1'), 'w', 'b')).toBe('a pawn');
  });
  it('the exchange reads as a rook for a knight', () => {
    expect(materialEdgeWords(pieces('4k3/pp1n4/8/8/8/8/PP6/R3K3 w - - 0 1'), 'w', 'b')).toBe('a rook for a knight');
  });
});

describe('plies 18 and 24 — the c7 fork is one claim across two lanes', async () => {
  const { Chess } = await import('chess.js');
  const { detectLatentFork } = await import('./latentFork');
  const { detectBehaviors } = await import('./danyaBehaviors');
  const { forkThreatKey } = await import('./conceptKey');
  const moves = 'e4 c5 Bc4 e6 Nc3 d5 exd5 exd5 Bxd5 Nf6 Bxf7+ Kxf7 Qe2 Qe7 Qxe7+ Bxe7 Nf3 Re8 O-O Bg4 Ne5+ Kg8 Nxg4 Nxg4 Nd5 Bd6 d3 Bxh2+ Kh1 Bd6'.split(' ');
  const fenAt = (n: number): string => { const c = new Chess(); for (const m of moves.slice(0, n)) c.move(m); return c.fen(); };
  it('the latent fork and the opponent-intent behaviour key the same fork', () => {
    const latent = detectLatentFork(fenAt(19), 'white');
    expect(latent?.square).toBe('c7');
    const latentKey = forkThreatKey(latent!.square, latent!.targets.map((t) => t.square));
    const hit = detectBehaviors({ fen: fenAt(25), studentColor: 'b' }).find((h) => /They want Nc7/.test(h.fact));
    expect(hit?.keys).toContain(latentKey);
  });
});

describe('ply 70 — a king is never a removable guard', async () => {
  const { detectTactics } = await import('./tacticsDetector');
  it('after …Rg7 Rh8+ no removal-of-the-guard names the king on f8', () => {
    // 35…Rg7 36.Rh8+ — the black king on f8 is in check and guards g7.
    const r = JSON.stringify(detectTactics('5k1R/p5r1/2K2p2/2p1b3/2Pr3P/8/PP3P2/6R1 b - - 2 36'));
    expect(r).not.toMatch(/king on f8 is the only defender/);
  });
});

describe('the piece-worded edge is still one standing refrain', async () => {
  const { STANDING_REFRAINS } = await import('./standingRefrains');
  it('"you\'re up a bishop for two pawns" is covered and keyed on the whole edge', () => {
    const r = STANDING_REFRAINS.find((x) => x.id === 'my-material')!;
    const m = new RegExp(r.re.source).exec("you're up a bishop for two pawns");
    expect(m?.[1]).toBe('a bishop for two pawns');
  });
});
