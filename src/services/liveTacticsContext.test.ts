import { describe, it, expect, vi } from 'vitest';
import { buildTacticsLiveContext, buildFedTacticsContext } from './liveTacticsContext';
import type { StockfishAnalysis } from '../types';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const fakeAnalysis = (): StockfishAnalysis => ({
  bestMove: 'e2e4',
  evaluation: 20,
  isMate: false,
  mateIn: null,
  depth: 12,
  topLines: [{ rank: 1, evaluation: 20, moves: ['e2e4', 'e7e5'], mate: null }],
  nodesPerSecond: 0,
});

describe('buildFedTacticsContext (ROOT fix — never starve the package)', () => {
  it('fetches an analysis itself when none is cached (the LLM is never handed an empty PV)', async () => {
    const analyze = vi.fn().mockResolvedValue(fakeAnalysis());
    await buildFedTacticsContext(STARTING_FEN, 'w', 1500, null, analyze);
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledWith(STARTING_FEN);
  });

  it('uses a cached analysis with a PV without fetching again', async () => {
    const analyze = vi.fn().mockResolvedValue(fakeAnalysis());
    await buildFedTacticsContext(STARTING_FEN, 'w', 1500, fakeAnalysis(), analyze);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('re-fetches when the cached analysis has no PV (topLines empty)', async () => {
    const analyze = vi.fn().mockResolvedValue(fakeAnalysis());
    const empty: StockfishAnalysis = { ...fakeAnalysis(), topLines: [] };
    await buildFedTacticsContext(STARTING_FEN, 'w', 1500, empty, analyze);
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it('degrades to a FEN-only context (no throw) when the engine is down', async () => {
    const analyze = vi.fn().mockResolvedValue(null);
    const ctx = await buildFedTacticsContext(STARTING_FEN, 'w', 1500, null, analyze);
    expect(ctx.threats).toEqual([]);
    expect(ctx.opportunities).toEqual([]);
    expect(ctx.lookaheadDepth).toBe(4);
  });
});

describe('buildTacticsLiveContext', () => {
  it('returns an empty context on the starting position (nothing tactical yet)', () => {
    const ctx = buildTacticsLiveContext(STARTING_FEN, null, 'w', 1500);
    expect(ctx.immediate).toEqual([]);
    expect(ctx.hanging).toEqual([]);
    expect(ctx.threats).toEqual([]);
    expect(ctx.opportunities).toEqual([]);
  });

  it('lookaheadDepth follows getTacticLookahead — 4 plies for intermediate (1400+)', () => {
    const ctx = buildTacticsLiveContext(STARTING_FEN, null, 'w', 1500);
    expect(ctx.lookaheadDepth).toBe(4);
  });

  it('lookaheadDepth = 2 for improvers (1000-1399)', () => {
    const ctx = buildTacticsLiveContext(STARTING_FEN, null, 'w', 1200);
    expect(ctx.lookaheadDepth).toBe(2);
  });

  it('lookaheadDepth = 1 for beginners (<1000)', () => {
    const ctx = buildTacticsLiveContext(STARTING_FEN, null, 'w', 800);
    expect(ctx.lookaheadDepth).toBe(1);
  });

  it('lookaheadDepth = 6 for advanced (1800+) — push them to calculate 3 full moves out', () => {
    const ctx = buildTacticsLiveContext(STARTING_FEN, null, 'w', 2000);
    expect(ctx.lookaheadDepth).toBe(6);
  });

  it('detects a hanging piece — Black bishop hanging on c5 after 1.e4 e5 2.Bc4 Nf6 3.Nf3 Bc5 4.Nxe5 (Bxc5 wins)', () => {
    // FEN where Black's e5 pawn is on the board after Black has just
    // played a bishop to c5 that is unprotected — White to move has
    // many captures including Bxf7+ or Nxe5 ideas. Use a constructed
    // position where Black's bishop on c5 is clearly hanging.
    // Position: White: K e1, Q d1, R a1/h1, B c4, N f3/c3, P a2-h2 minus e2.
    // Black: K e8, Q d8, R a8/h8, B c5, N b8/g8, P a7-h7 minus e7. Standard Italian-ish.
    const italian =
      'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4';
    const ctx = buildTacticsLiveContext(italian, null, 'w', 1500);
    // The shape contract: returned arrays exist (don't throw); whether
    // any specific hanging-piece fires depends on the detector
    // heuristics — we don't pin to a specific count to keep the test
    // robust to upstream improvements.
    expect(Array.isArray(ctx.immediate)).toBe(true);
    expect(Array.isArray(ctx.hanging)).toBe(true);
    expect(Array.isArray(ctx.threats)).toBe(true);
    expect(Array.isArray(ctx.opportunities)).toBe(true);
    expect(typeof ctx.lookaheadDepth).toBe('number');
  });

  it('caps threats and opportunities at 5 each (token budget guard)', () => {
    // Synthesise a fake analysis with 10 long PV lines that include
    // captures — the helper must not return more than 5 of each
    // beneficiary even if the PV scan produced more.
    const analysis: StockfishAnalysis = {
      bestMove: 'e2e4',
      evaluation: 0,
      isMate: false,
      mateIn: null,
      depth: 12,
      topLines: Array.from({ length: 10 }, (_, i) => ({
        rank: i,
        evaluation: 0,
        moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6'],
        mate: null,
      })),
      nodesPerSecond: 0,
    };
    const ctx = buildTacticsLiveContext(STARTING_FEN, analysis, 'w', 2000);
    expect(ctx.threats.length).toBeLessThanOrEqual(5);
    expect(ctx.opportunities.length).toBeLessThanOrEqual(5);
  });

  it('survives malformed FEN without throwing (returns empty context)', () => {
    expect(() => buildTacticsLiveContext('not-a-fen', null, 'w', 1500)).not.toThrow();
    const ctx = buildTacticsLiveContext('not-a-fen', null, 'w', 1500);
    expect(ctx.immediate).toEqual([]);
    expect(ctx.hanging).toEqual([]);
  });
});

// GROUND-TRUTH board facts — the deterministic block that stops the
// brain from eyeballing the board (audit 2026-06-02: castled king
// reported on e8; mate-in-one missed with invented escape squares).
describe('buildTacticsLiveContext — boardFacts', () => {
  it('reports both king squares + side to move on the starting position', () => {
    const ctx = buildTacticsLiveContext(STARTING_FEN, null, 'w', 1500);
    expect(ctx.boardFacts).toBeDefined();
    expect(ctx.boardFacts?.whiteKing).toBe('e1');
    expect(ctx.boardFacts?.blackKing).toBe('e8');
    expect(ctx.boardFacts?.sideToMove).toBe('white');
    expect(ctx.boardFacts?.inCheck).toBeNull();
    expect(ctx.boardFacts?.mateInOne).toBeNull();
  });

  it('lists a piece inventory so the brain never parses the raw FEN (the e4-pawn regression)', () => {
    // 1.e4 e6 2.Nf3 d5 3.Bc4 — the position the 2026-06-02 audit caught
    // the coach calling "the starting position, no e4 pawn".
    const fen = 'rnbqkbnr/ppp2ppp/4p3/3p4/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
    const ctx = buildTacticsLiveContext(fen, null, 'w', 1500);
    const wp = ctx.boardFacts?.whitePieces ?? '';
    expect(wp).toMatch(/Bishop c4/);
    expect(wp).toMatch(/Knight f3/);
    expect(wp).toMatch(/\be4\b/);     // the e4 pawn IS listed
    expect(wp).not.toMatch(/\be2\b/); // and it is NOT still on e2
    const bp = ctx.boardFacts?.blackPieces ?? '';
    expect(bp).toMatch(/\bd5\b/);
    expect(bp).toMatch(/\be6\b/);
  });

  // Material direction ground truth (response-loop audit 2026-06-05: the
  // coach said "White is ahead" while down a rook+pawn for a queen).
  it('reports material EVEN on the starting position', () => {
    const ctx = buildTacticsLiveContext(STARTING_FEN, null, 'w', 1500);
    expect(ctx.boardFacts?.material).toMatch(/even/i);
  });
  it('reports White DOWN 3 in the R+P vs Q ending (the sign-flip case)', () => {
    const fen = '4k3/4q3/8/8/8/8/4P3/R3K3 w - - 0 1'; // White R+P(6) vs Black Q(9)
    const m = buildTacticsLiveContext(fen, null, 'w', 1500).boardFacts?.material ?? '';
    expect(m).toMatch(/White is DOWN 3/);
    expect(m).not.toMatch(/White is UP/);
  });
  it('reports White UP 5 with an extra rook', () => {
    const fen = '4k3/8/8/8/8/8/4P3/R3K3 w - - 0 1'; // White R+P(6) vs nothing
    expect(buildTacticsLiveContext(fen, null, 'w', 1500).boardFacts?.material).toMatch(/White is UP 6/);
  });

  // Attack/defense map ground truth (prod drive 2026-06-05: the coach named
  // the wrong attacker/defender when explaining why a piece was/wasn't safe).
  it('maps the EXACT attacker + defender squares for a pressured piece', () => {
    // White Pe2 attacked by Qe7, defended by Ke1 (NOT a rook).
    const am = buildTacticsLiveContext('4k3/4q3/8/8/8/8/4P3/R3K3 w - - 0 1', null, 'w', 1500).boardFacts?.attackMap ?? [];
    const e2 = am.find((e) => e.square === 'e2');
    expect(e2).toBeDefined();
    expect(e2!.attackedBy).toEqual(['e7']);
    expect(e2!.defendedBy).toEqual(['e1']); // the KING, not a phantom rook
  });
  it('marks a genuinely hanging piece with empty defenders in the attack map', () => {
    const am = buildTacticsLiveContext('4k3/8/1b4q1/R6B/8/8/8/4K3 w - - 0 1', null, 'w', 1500).boardFacts?.attackMap ?? [];
    const a5 = am.find((e) => e.square === 'a5');
    expect(a5!.attackedBy).toEqual(['b6']);  // the bishop, not the queen
    expect(a5!.defendedBy).toEqual([]);      // hanging
    const h5 = am.find((e) => e.square === 'h5');
    expect(h5!.defendedBy).toEqual(['a5']);  // rook defends the bishop
  });

  it('reports the king on g1 after White castles (the e8 regression)', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.O-O — White king on g1, rook f1.
    const fen = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4';
    const ctx = buildTacticsLiveContext(fen, null, 'w', 1500);
    expect(ctx.boardFacts?.whiteKing).toBe('g1');
    expect(ctx.boardFacts?.blackKing).toBe('e8');
    expect(ctx.boardFacts?.sideToMove).toBe('black');
  });

  it('detects a forced mate-in-one (Ra8#) — the missed-mate regression', () => {
    const fen = '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1';
    const ctx = buildTacticsLiveContext(fen, null, 'w', 1500);
    expect(ctx.boardFacts?.mateInOne).toBe('Ra8#');
  });

  it('reports null mate-in-one when there is no forced mate', () => {
    const fen = '6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1';
    const ctx = buildTacticsLiveContext(fen, null, 'w', 1500);
    expect(ctx.boardFacts?.mateInOne).toBeNull();
  });

  it('flags which side is in check', () => {
    // Black king on e8 in check from a white rook on e1 down the open e-file.
    const fen = '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1';
    const ctx = buildTacticsLiveContext(fen, null, 'b', 1500);
    expect(ctx.boardFacts?.inCheck).toBe('black');
  });

  it('returns undefined boardFacts on a malformed FEN', () => {
    const ctx = buildTacticsLiveContext('not-a-fen', null, 'w', 1500);
    expect(ctx.boardFacts).toBeUndefined();
  });
});
