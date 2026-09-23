import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computePvLine, renderPlyFactLine, pvFactsForVoice, plyFactsForMove, plyFactsClause, computePlyFacts, tacticWord, tacticWinsMaterial, pvDepthForRating, type PvEngine } from './pvPlayback';
import type { StockfishAnalysis } from '../types';

/** Canned engine: maps fen → analysis. Unknown fen → throws (like a dead worker). */
function cannedEngine(map: Record<string, Partial<StockfishAnalysis>>): PvEngine {
  return {
    analyzePosition: (fen: string): Promise<StockfishAnalysis> => {
      const hit = map[fen];
      if (!hit) return Promise.reject(new Error(`no canned analysis for ${fen}`));
      return Promise.resolve({
        bestMove: hit.bestMove ?? '',
        evaluation: hit.evaluation ?? 0,
        isMate: false,
        mateIn: null,
        depth: 14,
        topLines: hit.topLines ?? [],
        nodesPerSecond: 0,
      });
    },
  };
}

// Scholar's-mate-adjacent position: White to move, Qxf7# available.
// 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? → Qxf7#
const MATE_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';

describe('pvDepthForRating — deeper for stronger, capped at the reliable window (Phase 2)', () => {
  it('scales UP with rating', () => {
    expect(pvDepthForRating(900)).toBe(3);
    expect(pvDepthForRating(1400)).toBe(4);
    expect(pvDepthForRating(1700)).toBe(5);
    expect(pvDepthForRating(1900)).toBe(6);
    expect(pvDepthForRating(2300)).toBe(7);
  });
  it('a stronger player gets a DEEPER line than a weaker one (David 2026-09-07)', () => {
    expect(pvDepthForRating(1800)).toBeGreaterThan(pvDepthForRating(1400));
    expect(pvDepthForRating(1400)).toBeGreaterThan(pvDepthForRating(1000));
  });
  it('never exceeds the depth-14 reliable window (7) or drops below a teachable floor (3)', () => {
    for (const r of [200, 800, 1500, 2600, 3200]) {
      const d = pvDepthForRating(r);
      expect(d).toBeGreaterThanOrEqual(3);
      expect(d).toBeLessThanOrEqual(7);
    }
  });
});

describe('pvPlayback — computePvLine (Phase 1)', () => {
  it('replays the PV through chess.js: SAN, fens, mate fact; a mate line delivers', async () => {
    const engine = cannedEngine({
      [MATE_FEN]: {
        evaluation: 9999,
        topLines: [{ rank: 1, evaluation: 9999, moves: ['h5f7'], mate: 1 }],
      },
    });
    const line = await computePvLine(MATE_FEN, { engine });
    expect(line).not.toBeNull();
    expect(line!.plies).toHaveLength(1);
    expect(line!.plies[0].san).toBe('Qxf7#');
    expect(line!.plies[0].facts.isMate).toBe(true);
    expect(line!.plies[0].facts.captured).toBe('pawn');
    expect(line!.delivers).toBe(true); // mate needs no verify pass
  });

  it('seeds from the stored best move (R3 consistency with the shot question)', async () => {
    const start = new Chess();
    start.move('e4');
    const fen = start.fen();
    // Primary PV starts with a DIFFERENT move than the stored best (d7d5);
    // a multipv line matching the stored move exists and must be chosen.
    const engine = cannedEngine({
      [fen]: {
        evaluation: 30,
        topLines: [
          { rank: 1, evaluation: 30, moves: ['e7e5', 'g1f3'], mate: null },
          { rank: 2, evaluation: 20, moves: ['d7d5', 'e4d5'], mate: null },
        ],
      },
      // terminal verify for the seeded line: after d5 exd5.
      [((): string => { const c = new Chess(fen); c.move('d5'); c.move('exd5'); return c.fen(); })()]: {
        evaluation: 25,
        topLines: [{ rank: 1, evaluation: 25, moves: ['g8f6'], mate: null }],
      },
    });
    const line = await computePvLine(fen, { engine, firstUci: 'd7d5' });
    expect(line).not.toBeNull();
    expect(line!.plies[0].san).toBe('d5');
    expect(line!.plies[1].san).toBe('exd5');
  });

  it('R3: a line whose terminal eval collapses does NOT deliver', async () => {
    // WHITE to move; the line promises +3 for the mover but the terminal
    // re-analysis holds only +0.2 → the promise collapsed, don't teach it.
    const fen = new Chess().fen();
    const afterE4 = ((): string => { const c = new Chess(fen); c.move('e4'); return c.fen(); })();
    const engine = cannedEngine({
      [fen]: {
        evaluation: 300, // promises +3 for White (the mover)
        topLines: [{ rank: 1, evaluation: 300, moves: ['e2e4'], mate: null }],
      },
      [afterE4]: {
        evaluation: 20, // …but the end holds only +0.2 → refuted
        topLines: [{ rank: 1, evaluation: 20, moves: ['e7e5'], mate: null }],
      },
    });
    const line = await computePvLine(fen, { engine });
    expect(line).not.toBeNull();
    expect(line!.delivers).toBe(false);
  });

  it('R3: verify pass UNAVAILABLE → delivers=false (never teach unverified)', async () => {
    const start = new Chess();
    start.move('e4');
    const fen = start.fen();
    const engine = cannedEngine({
      [fen]: {
        evaluation: 300,
        topLines: [{ rank: 1, evaluation: 300, moves: ['e7e5'], mate: null }],
      },
      // terminal fen NOT canned → verify throws.
    });
    const line = await computePvLine(fen, { engine });
    expect(line).not.toBeNull();
    expect(line!.delivers).toBe(false);
  });

  it('reports the close-alternative decision tension when candidates are within 40cp', async () => {
    const start = new Chess();
    const fen = start.fen();
    const afterE4 = ((): string => { const c = new Chess(fen); c.move('e4'); return c.fen(); })();
    const engine = cannedEngine({
      [fen]: {
        evaluation: 30,
        topLines: [
          { rank: 1, evaluation: 30, moves: ['e2e4'], mate: null },
          { rank: 2, evaluation: 10, moves: ['d2d4'], mate: null },
        ],
      },
      [afterE4]: {
        evaluation: 28,
        topLines: [{ rank: 1, evaluation: 28, moves: ['e7e5'], mate: null }],
      },
    });
    const line = await computePvLine(fen, { engine });
    expect(line!.closeAlternative).toEqual({ san: 'd4', gapCp: 20 });
  });

  it('engine dead → null, never throws', async () => {
    const engine: PvEngine = { analyzePosition: () => Promise.reject(new Error('worker dead')) };
    expect(await computePvLine(MATE_FEN, { engine })).toBeNull();
  });
});

describe('plyFactsForMove — no phantom tactics (David 2026-07-20)', () => {
  it('a KNIGHT move never claims a pin (knights cannot pin)', () => {
    // The real Pirc game position before 12.Nc3 — the walk narrated "the knight
    // lands on c3 and suddenly it's pinning", which is board-false.
    const c = new Chess();
    for (const m of ['e4', 'd6', 'd4', 'g6', 'f4', 'e6', 'Be3', 'b6', 'c4', 'Bg7', 'Qd2', 'Nf6', 'Bd3', 'Na6', 'Nf3', 'c6', 'O-O', 'Nc7', 'e5', 'Nd7', 'exd6', 'Na6']) c.move(m);
    const out = plyFactsForMove(c.fen(), 'Nc3');
    if (out) expect(out).not.toMatch(/pin/i);
  });

  it('a ROYAL fork (king + rook) is a real landed fork — the king counts as a target', () => {
    // Nb5-c7+ forks king e8 and rook a8. The rook "defends" e8 along the rank
    // and the king is worth 0, so the two-winnable-targets rule dropped the
    // textbook royal fork as a false alarm (found 2026-09-14).
    const out = plyFactsForMove('r3k3/8/8/1N6/8/8/8/6K1 w - - 0 1', 'Nc7+');
    expect(out).toMatch(/fork/);
  });

  it('a fork on two DEFENDED, cheaper pieces still does not land (no king involved)', () => {
    // Knight to d5 hits two pawns each defended by a pawn — geometry, not a win.
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bc4', 'Bc5']) c.move(m);
    const out = plyFactsForMove(c.fen(), 'Nd5');
    if (out) expect(out).not.toMatch(/fork/);
  });

  it('returns a grounded fact string or null (never throws on a legal move)', () => {
    const out = plyFactsForMove(new Chess().fen(), 'e4');
    // 1.e4 is a quiet developing push — no concrete tactic/capture → silence.
    expect(out === null || typeof out === 'string').toBe(true);
  });
});

describe('deterministic fallback voice + batch facts', () => {
  it('renderPlyFactLine speaks facts, stays silent on a quiet ply', async () => {
    const engine = cannedEngine({
      [MATE_FEN]: {
        evaluation: 9999,
        topLines: [{ rank: 1, evaluation: 9999, moves: ['h5f7'], mate: 1 }],
      },
    });
    const line = (await computePvLine(MATE_FEN, { engine }))!;
    expect(renderPlyFactLine(line.plies[0])).toMatch(/checkmate/i);
    // A quiet ply (no capture/check/structure change) → null (silence rule).
    const quiet = {
      ...line.plies[0],
      san: 'Nf3',
      facts: {
        captured: null, isCheck: false, isMate: false, promotion: null,
        tacticLanded: null, materialGained: 0, newOpenFiles: [],
        newPassedPawns: [], passedPawnsHanded: [], outpostGained: null, shieldLost: 0,
      },
    };
    expect(renderPlyFactLine(quiet)).toBeNull();
  });

  it('pvFactsForVoice numbers one bundle per ply (split-back contract)', async () => {
    const engine = cannedEngine({
      [MATE_FEN]: {
        evaluation: 9999,
        topLines: [{ rank: 1, evaluation: 9999, moves: ['h5f7'], mate: 1 }],
      },
    });
    const line = (await computePvLine(MATE_FEN, { engine }))!;
    const facts = pvFactsForVoice(line);
    expect(facts).toMatch(/^1\) The move Qxf7#/);
    expect(facts.split('\n')).toHaveLength(1);
  });
});

describe('material truth + tactic agent (David 2026-07-20 Opera nitpick)', () => {
  // fenBefore for the Opera move under test, from the game's SAN prefix.
  const fenBefore = (sans: string[]): string => {
    const c = new Chess();
    for (const s of sans) c.move(s);
    return c.fen();
  };
  const OPERA = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7', 'Qb8+', 'Nxb8', 'Rd8#'];

  it('a RECAPTURE claims no material windfall (even trade nets 0)', () => {
    // After 4...Bxf3, White recaptures 5.Qxf3 — an even knight-for-bishop trade.
    // The subjectless clause states the capture but must claim NO material (the
    // recapture nets 0). NB: the WALK's plyFactsForMove now stays silent on a
    // bare even-trade capture (David 2026-07-23 dial-in — don't restate what the
    // student saw); the material-truth is asserted here on plyFactsClause, which
    // is what the PV renders speak.
    const fb = fenBefore(OPERA.slice(0, 8)); // up to ...Bxf3
    const prev = { square: 'f3', capturedValue: 3 }; // Black just took the knight on f3
    const clause = plyFactsClause(fb, 'Qxf3', prev) ?? '';
    expect(clause).toMatch(/captures the bishop/i);
    expect(clause).not.toMatch(/wins \d+ point/i);
    // And the walk suppresses the bare even-trade restatement entirely.
    expect(plyFactsForMove(fb, 'Qxf3', prev, true)).toBeNull();
  });

  it('a piece that just MOVED to the square is not a "recapture" — the even trade goes through SEE and claims nothing', () => {
    // David's Alapin: 4.d4 cxd4 5.cxd4. The d4 pawn arrived last ply (no capture);
    // 4...cxd4 is a fresh capture of a defended pawn — an even trade, not a win.
    // Before the fix, prev={square:'d4', capturedValue:0} made it a "recapture"
    // netting 1 − 0 and the walk spoke "You capture the pawn, win material."
    const fb = fenBefore(['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4']);
    const prev = { square: 'd4', capturedValue: 0 }; // 4.d4 landed here, captured nothing
    const clause = plyFactsClause(fb, 'cxd4', prev) ?? '';
    expect(clause).not.toMatch(/wins? material|wins \d+ point/i);
    expect(plyFactsForMove(fb, 'cxd4', prev, true)).toBeNull();
  });

  it('a real hanging capture DOES win material', () => {
    // White knight on e5 hangs; Black's d6 pawn takes it for free.
    const fb = 'rnbqkbnr/ppp2ppp/3p4/4N3/8/8/PPPPPPPP/RNBQKB1R b KQkq - 0 1';
    const line = plyFactsForMove(fb, 'dxe5') ?? '';
    // "wins material" — no point count spoken (David 2026-07-24: "sounds bad").
    expect(line).toMatch(/wins material/i);
    expect(line).not.toMatch(/wins \d+ point/i);
  });

  it('does NOT credit the mover for the OPPONENT\'s pin (backstop move)', () => {
    // 11...Rd8 lands BEHIND White\'s pinned-knight setup — it is White\'s Rd1
    // pin, not Black\'s. The mover must not be credited with "lands a pin".
    const fb = fenBefore(OPERA.slice(0, 23)); // up to O-O-O, Black to play Rd8
    const clause = plyFactsClause(fb, 'Rd8') ?? '';
    expect(clause).not.toMatch(/pin/i);
  });

  it('keeps a REAL pin the moved slider makes (Bg5 pins the f6 knight)', () => {
    const fb = fenBefore(OPERA.slice(0, 16)); // up to ...c6, White to play Bg5
    const line = plyFactsForMove(fb, 'Bg5') ?? '';
    expect(line).toMatch(/pin/i);
  });
});

describe('tacticWord — no snake_case enum ever reaches the voice (David 2026-09-07)', () => {
  it('maps every snake_case detector type to English prose', () => {
    // David heard "landing a mate_threat" in his own prod Traxler review — a
    // program identifier spoken aloud. Every multi-word enum must become prose.
    expect(tacticWord('mate_threat')).toBe('mating threat');
    expect(tacticWord('removal_of_guard')).toBe('removal of the defender');
    expect(tacticWord('back_rank')).toBe('back-rank threat');
    expect(tacticWord('trapped_piece')).toBe('piece trap');
    // Clean single-word types pass through unchanged.
    expect(tacticWord('fork')).toBe('fork');
    expect(tacticWord('pin')).toBe('pin');
    // An UNKNOWN future enum never leaks raw — underscores become spaces.
    expect(tacticWord('some_new_tactic')).toBe('some new tactic');
    expect(tacticWord('some_new_tactic')).not.toContain('_');
  });
});

describe('a fork whose agent can simply be captured is not a fork (2026-09-21)', () => {
  // Both positions are real plies of `mg-lichess-8I2YuiTC`, the game whose
  // narration `reviewCorpusSweep` caught claiming "lands a fork" on a move that
  // won nothing (red on `main`, found 2026-09-21).
  //
  // They are kept TOGETHER on purpose: the pair is what makes the rule
  // board-true rather than merely stricter. One must be rejected and the other
  // must still be accepted, and a rule written with `attackers()` geometry
  // would fail the second while "fixing" the first.
  it('REJECTS Qf4+ — the forked queen attacks the forking square', () => {
    // Qf4+ forks Bf6, Qh6 and the king on h2. The royal rule accepted it on its
    // single "winnable" target, the undefended h6 queen — but that queen
    // ANSWERS with Qxf4, so the fork buys nothing.
    const before = '6k1/5p2/5B1Q/1p1P1q2/4r3/1p6/6PK/6R1 b - - 1 36';
    const after = new Chess(before);
    after.move('Qf4+');
    expect(after.moves(), 'the forked queen can take the forker').toContain('Qxf4');
    expect(plyFactsForMove(before, 'Qf4+') ?? '').not.toMatch(/lands a fork/i);
  });

  it('ACCEPTS Qxf2+ — the king ATTACKS f2 but cannot legally capture it', () => {
    // The mirror case, and the reason the rule is decided by LEGALITY. chess.js
    // reports the white king as an attacker of f2, yet Kxf2 is ILLEGAL (the
    // queen is defended down the b6 diagonal), so White's only replies are
    // Kh2/Kh1 and the fork on the king plus the UNDEFENDED g3 knight is real.
    const before = '4r1k1/3b1pB1/1b1p1Qn1/1p1P4/1p2P3/5NNP/2q2PP1/4R1K1 b - - 0 25';
    const after = new Chess(before);
    after.move('Qxf2+');
    expect(after.moves().sort(), 'no legal capture of the forker').toEqual(['Kh1', 'Kh2']);
    expect(plyFactsForMove(before, 'Qxf2+') ?? '').toMatch(/lands a fork/i);
  });
});

/**
 * 🔒 ONE DEFINITION OF "THIS TACTIC WINS SOMETHING" — the gate that makes the
 * 2026-09-21 drift unreopenable.
 *
 * `tacticWinsMaterial` was inline in `computePlyFacts` and had grown a second,
 * hand-written copy in `reviewCorpusSweep.test.ts`. Two corrections were made
 * in the product and never in the copy — the ROYAL FORK rule and `winnableBy`'s
 * king rule — so the sweep failed three REAL royal forks as "empty tactics" and
 * blamed the product. The copy is gone and both readers now call this.
 *
 * These cases pin the two rules that drifted. They are not a restatement of the
 * implementation: each one is a BOARD, and the claim is what a coach would say
 * about it.
 */
describe('tacticWinsMaterial — the royal carve-outs that drifted', () => {
  it('a ROYAL fork is real with ONE other winnable target', () => {
    // White knight on c7 forks the black king on e8 and the rook on a8. The
    // textbook family fork: the check forces the king to move and the rook
    // falls. The king is worth 0 and never passes `winnable`, so without the
    // royal rule the count is 1 and this reads as a false alarm.
    const board = new Chess('r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1');
    expect(tacticWinsMaterial(board, { type: 'fork', involvedSquares: ['c7', 'e8', 'a8'] })).toBe(true);
  });

  it('a NON-royal fork still needs TWO winnable targets', () => {
    // Same knight, forking two DEFENDED, equal-or-greater-value targets is the
    // case the bar exists for; here it hits one lone rook and nothing else.
    const board = new Chess('r7/2N5/8/8/8/8/8/4K2k b - - 0 1');
    expect(tacticWinsMaterial(board, { type: 'fork', involvedSquares: ['c7', 'a8'] })).toBe(false);
  });

  it('an uncovered KING is never counted as a winnable target on its own', () => {
    // `winnableBy` returns false for a king, so a bare check against a lone
    // king is not a fork. Rc8+ against a defended knight used to pass here
    // (found 2026-09-15) — the king looked like an undefended target.
    const board = new Chess('2R1k3/8/8/8/8/8/8/4K3 b - - 0 1');
    expect(tacticWinsMaterial(board, { type: 'fork', involvedSquares: ['c8', 'e8'] })).toBe(false);
  });

  it('a pin is kept without a material test — the immobilization IS the point', () => {
    const board = new Chess('rnbqkb1r/pppp1ppp/5n2/4p1B1/4P3/8/PPPP1PPP/RN1QKBNR b KQkq - 0 1');
    expect(tacticWinsMaterial(board, { type: 'pin', involvedSquares: ['g5', 'f6', 'd8'] })).toBe(true);
  });
});

describe('passed pawns are owned by a side (walk 5, R16)', () => {
  it('a capture that frees the OTHER side\'s pawn hands them the passer — it never creates one for the mover', () => {
    const fen = '6k1/pp4pp/4pn2/4P3/8/8/PP4PP/6K1 w - - 0 20';
    const c = new Chess(fen);
    const mv = c.move('exf6');
    const f = computePlyFacts(fen, c.fen(), { captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion });
    expect(f.newPassedPawns).toEqual([]);
    expect(f.passedPawnsHanded).toEqual(['e6']);
    expect(plyFactsClause(fen, 'exf6')).not.toMatch(/creates a passed pawn/);
    expect(plyFactsClause(fen, 'exf6')).toMatch(/leaves the other side a passed pawn on e6/);
  });
});


describe('an even trade is a removal of the defender only if the target still falls (walk 6, R8)', () => {
  const landed = (fen: string, san: string): string | null => {
    const c = new Chess(fen);
    const mv = c.move(san);
    return computePlyFacts(fen, c.fen(), { captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion }).tacticLanded;
  };
  it('Qxb5 Rxb5 re-guards f5 — a plain queen trade', () => {
    expect(landed('1r4k1/8/8/1q3b2/7N/1Q6/8/6K1 w - - 0 1', 'Qxb5')).not.toBe('removal_of_guard');
  });
  it('Qxb5 cxb5 leaves f5 to the knight — a real removal', () => {
    expect(landed('6k1/8/2p5/1q3b2/7N/1Q6/8/6K1 w - - 0 1', 'Qxb5')).toBe('removal_of_guard');
  });
});
