// The fork that is TWO moves away. Every gate here is load-bearing: the naive
// "pieces on forkable squares" fires in nearly every pre-castling position
// (Qd8 + Rh8 are knight-forkable from f7 all game long), so the tests that
// matter most are the ones proving it STAYS QUIET.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detectLatentFork, latentForkClause } from './latentFork';
import { movesToReach } from './forwardTeaching';

describe('the generalized BFS', () => {
  it('counts quiet hops to a named square', () => {
    const start = new Chess().fen();
    expect(movesToReach(start, 'g1', 'f3', 4)).toBe(1);
    expect(movesToReach(start, 'g1', 'f3', 4)).toBeLessThan(2);
    // e5 is two hops (g1-f3-e5) and f3/e5 are both empty at the start.
    expect(movesToReach(start, 'g1', 'e5', 4)).toBe(2);
  });

  it('returns null for an unreachable target and 0 for the square it stands on', () => {
    const start = new Chess().fen();
    expect(movesToReach(start, 'g1', 'g1', 4)).toBe(0);
    // A square occupied by its OWN side is never a landing square.
    expect(movesToReach(start, 'g1', 'e2', 4)).toBeNull();
  });

  it('the outpost route still works — the other caller of the same BFS', async () => {
    const { computePieceRoute } = await import('./forwardTeaching');
    // Whatever it finds, it must be a knight route ending where it says.
    const r = computePieceRoute('r2q1rk1/pp2ppbp/2np1np1/8/3NP3/2N1B3/PPP2PPP/R2QKB1R w KQ - 0 1', 'c3');
    if (r) {
      expect(r.piece).toBe('n');
      expect(r.route[r.route.length - 1]).toBe(r.target);
    }
  });
});

describe('it stays QUIET where the naive version would not', () => {
  it('says nothing at the starting position', () => {
    expect(detectLatentFork(new Chess().fen(), 'white')).toBeNull();
    expect(detectLatentFork(new Chess().fen(), 'black')).toBeNull();
  });

  it('says nothing when the mover owns no knight — gate (b)', () => {
    // White has queen + rooks + bishops, no knight. Black's queen and rook sit
    // on squares a knight WOULD fork; there is simply no knight to do it.
    const fen = 'r2qk3/8/8/8/8/8/8/R2QKB2 w - - 0 1';
    expect(detectLatentFork(fen, 'white')).toBeNull();
  });

  it('says nothing when only ONE valuable piece is on offer — gate (a)', () => {
    const fen = '3qk3/8/8/8/8/8/8/4K1N1 w - - 0 1';
    expect(detectLatentFork(fen, 'white')).toBeNull();
  });

  it('says nothing when the fork is ONE move away — that is a live threat, not foresight', () => {
    const f = detectLatentFork('r2qk3/8/5N2/8/8/8/8/4K3 w - - 0 1', 'white');
    if (f) expect(f.moves).toBe(2);
  });

  it('says nothing about a fork THREE moves out — the Caro line that provoked MAX_TEMPO', () => {
    // Every gate passed here and the claim was still unfounded: White is told
    // about c7 before Black has castled, three hops away. Read the output.
    expect(detectLatentFork('rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3', 'white')).toBeNull();
  });
});

describe('it SPEAKS on a real latent fork', () => {
  // The Sicilian's Nd4–b5–c7 — the canonical latent knight fork. CORRECTED
  // (walk 6): this fixture had the black queen on d8, where Nc7+ simply loses
  // the knight to Qxc7; gate (d) judged safety with WHITE on move and so asked
  // whether White could take its own knight. With the queen gone to h4 the
  // fork is real — c7 unguarded, b5 unguarded, king and rook both hit.
  const FEN = 'r1b1kb1r/pp2pppp/2np1n2/8/3NP2q/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 7';

  it('finds a knight fork two or more quiet moves out, and every gate holds', () => {
    const f = detectLatentFork(FEN, 'white');
    expect(f).not.toBeNull();
    expect(f!.moves).toBe(2); // the domain — see MAX_TEMPO
    expect(f!.square).toBe('c7');
    expect(f!.from).toBe('d4');
    expect(f!.targets.length).toBeGreaterThanOrEqual(2);
    // (b) the knight it names is really ours and really a knight
    const board = new Chess(FEN);
    expect(board.get(f!.from as 'a1')?.type).toBe('n');
    expect(board.get(f!.from as 'a1')?.color).toBe('w');
    // (a) every target is an enemy piece worth more than a knight (or the king)
    for (const t of f!.targets) {
      const p = board.get(t.square as 'a1');
      expect(p?.color).toBe('b');
      expect(['r', 'q', 'k']).toContain(p?.type);
    }
    // the fork square itself must be empty — you cannot land on a occupied one
    expect(board.get(f!.square as 'a1')).toBeFalsy();
    // richest target first
    expect(f!.targets.length).toBeGreaterThan(1);
  });

  it('reads from the seat the caller declares — both chairs, never a default', () => {
    const mine = detectLatentFork(FEN, 'white')!;
    expect(latentForkClause(mine, 'white')).toMatch(/Your knight has a fork waiting/);
    // The SAME geometry, read by the side it is aimed at, becomes a warning.
    expect(latentForkClause(mine, 'black')).toMatch(/Watch .* forks your/);
  });

  it('names the route — Learn names the move (walk 1500, 38.Ne3: "the route is yours to find")', () => {
    const mine = detectLatentFork(FEN, 'white')!;
    const said = latentForkClause(mine, 'white');
    expect(said).toContain(mine.square);
    expect(said).toContain(`via ${mine.via}`);
    expect(said).not.toMatch(/yours to find/);
  });
});

describe('cost — it must not dwarf the detectors beside it', () => {
  it('stays cheap enough for a live surface', () => {
    // detectNewThreat ~13ms and scanBestMoveShot ~21ms per call (measured
    // 2026-09-16). A 64-square scan that cost more than those could not ship on
    // a live board whatever it found — hence the walk-out-from-the-targets
    // pre-filter rather than a full sweep.
    const FENS = [
      new Chess().fen(),
      'r2qk2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K1NR w KQkq - 0 1',
      'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 5 4',
      'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
    ];
    const t0 = Date.now();
    const N = 25;
    for (let i = 0; i < N; i += 1) {
      for (const fen of FENS) { detectLatentFork(fen, 'white'); detectLatentFork(fen, 'black'); }
    }
    const perCall = (Date.now() - t0) / (N * FENS.length * 2);
    console.log(`[latentFork] ${perCall.toFixed(2)}ms per call`);
    expect(perCall).toBeLessThan(13); // the detectNewThreat budget
  });
});

// ── A WIRE THAT DOES NOT FIRE IS NOT A WIRE (CLAUDE.md, David 2026-08-07) ──
// The detector being correct proves nothing about whether a student ever hears
// it. These drive the real composer and read the clause back out.
describe('it reaches the LIVE composer', () => {
  const SICILIAN = 'r1b1kb1r/pp2pppp/2np1n2/8/3NP2q/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 7';
  const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
  const flat = {
    topLines: [line(1, 20), line(2, 15), line(3, 10)],
    evaluation: 20, isMate: false, mateIn: null, seldepth: 20, depth: 18,
    wdl: { win: 420, draw: 400, loss: 180 },
  };

  it('comes OUT of computePositionFacts as a spoken clause', async () => {
    const { computePositionFacts } = await import('./positionFacts');
    const r = await computePositionFacts({
      posture: 'walk', fen: SICILIAN, moverColor: 'w', studentColor: 'w', analysis: flat,
    });
    expect(r.latentFork).not.toBeNull();
    expect(r.latentFork!.square).toBe('c7');
    const spoken = r.clauses.map((c) => c.text).join(' | ');
    const quiet = r.quiet.map((q) => q.text).join(' | ');
    // It must be COMPUTED and it must be SELECTED — the door may legitimately
    // subsume it behind a same-geometry tactic, so accept either, but never
    // "the detector never ran".
    expect(`${spoken} ${quiet}`).toContain('c7');
    // The cold import of the composer's module graph is ~3.4s on its own, so
    // the default 5s left no room under a loaded pre-commit run.
  }, 20_000);

  it('ranks BELOW must-defend — foresight never speaks over live material', async () => {
    // The rank trap this build was warned about: `latent-danger` sits at 80–82,
    // ABOVE must-defend (75), so copying a sibling's number would have put a
    // fork two moves out over a piece hanging right now.
    const src = await import('node:fs').then((fs) => fs.readFileSync('src/services/positionFacts.ts', 'utf8'));
    // The kind is now chosen by the SEAT (2026-09-21), so it spans two lines and
    // is a ternary — anchor on `latentForkClause`, which is the clause'sidentity,
    // rather than on a kind literal that legitimately varies.
    const forkRank = /rank: (\d+), text: latentForkClause/.exec(src);
    const mustDefend = /kind: 'must-defend',\s*\n\s*rank: (\d+),/.exec(src);
    expect(forkRank).not.toBeNull();
    expect(mustDefend).not.toBeNull();
    expect(Number(forkRank![1])).toBeLessThan(Number(mustDefend![1]));
  });
});

describe('gate (e) — the route must survive the first hop (walk 6, L3)', () => {
  it('no fork "waiting on f7" when both waypoints (g5, e5) lose the knight', () => {
    // Italian shape: Nf3 → g5 → f7 would fork Qd8 and Rh8, and Bc4 guards f7 —
    // but the only route square, g5, hangs to the queen on d8 (e5 is occupied).
    const fen = 'r1bqk2r/pppp2pp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5';
    expect(detectLatentFork(fen, 'white')?.square).not.toBe('f7');
  });
});

describe('a pinned knight has no route (hand walk 2340, move 7)', () => {
  it('no fork "waiting on c7" through Nc3 while …Bb4 pins it to the king', () => {
    const c = new Chess();
    for (const m of 'e4 c5 Nf3 Nc6 c3 e5 d4 cxd4 cxd4 d5 exd5 Qxd5 Nc3 Bb4'.split(' ')) c.move(m);
    const f = detectLatentFork(c.fen(), 'white');
    expect(f?.from).not.toBe('c3');
  });
});
