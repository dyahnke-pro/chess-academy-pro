// tacticGeometry — every act on a real chess.js-validated board, each with a
// position where the computer must stay silent, and each read carrying its
// proof. The engine lines are handed in (the computer's contract), and every
// one is checked legal here before it is used.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  geometryReads, geometryMotif, pvGain,
  pinnerIsPinned, falseMateBlock, interferenceCut, clearanceTempo, decoyDeflection, discoveryAudit,
  zwischenzugRefuted, forkForPlan, kickFails, counterfactualFork, pawnBlockGone, interposeFacing, loadedLine,
  type GeometryContext, type GeometryRead,
} from './tacticGeometry';
import { isProof } from './proof';
import { isPinnedPiece } from './nextPlans';
import { detectTacticType } from './missedTacticService';
import { depthClauses } from './thinkAloud';
import { readBoardAll } from './boardComputers';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';
import { FACT_ROLE, FACT_PROOF } from './reviewFacetRank';

const live = (fen: string, pv: string[], extra: Partial<GeometryContext> = {}): GeometryContext => {
  const c = new Chess(fen);
  for (const u of pv) expect(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }), `illegal ${u}`).toBeTruthy();
  return { fen, me: fen.split(' ')[1] as 'w' | 'b', pv, register: 'live', ...extra };
};
const proven = (r: GeometryRead | null): GeometryRead => {
  expect(r).not.toBeNull();
  expect(isProof(r!.proof)).toBe(true);
  // DNA: no we/our, no move numbers.
  expect(r!.text).not.toMatch(/\b(we|our|us)\b/i);
  expect(r!.text).not.toMatch(/\d+\.\s?[NBRQK]?[a-h]/);
  return r!;
};
const afterSans = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

const MOSCOW = afterSans(['e4', 'c5', 'Nf3', 'd6']);
const DECOY = 'r7/p4ppk/2b5/8/1P6/6P1/P1P2P1P/3Q2K1 w - - 0 1';
const INTERFERE = '3r2k1/5ppp/8/8/1N1nP3/8/1Q3PPP/6K1 w - - 0 1';
const CLEARANCE = '3q2kr/7p/4pn2/8/3N4/8/1B3PPP/R5K1 w - - 0 1';

describe('2. the would-be pinner is itself pinned', () => {
  it('names the square it cannot reach and the pin that stops it', () => {
    const r = proven(pinnerIsPinned(live('4k1n1/ppp1bppp/8/8/8/2N5/PPP1QPPP/4K3 w - - 0 1', [])));
    expect(r.text).toBe("Their bishop on e7 can't pin your knight from b4: your queen on e2 pins it to their king.");
  });
  it('silent when the bishop is free to go there', () => {
    // Same board, the queen off the e-file: the bishop CAN pin from b4.
    expect(pinnerIsPinned(live('4k1n1/ppp1bppp/8/8/8/2N5/PPPQ1PPP/4K3 w - - 0 1', []))).toBeNull();
  });
});

describe('3. interference, both ways', () => {
  it('the check that is not mate: it blocks your own cover of the escape square', () => {
    const r = proven(falseMateBlock(live('6kr/5ppp/8/3N4/1B6/8/5PPP/6K1 w - - 0 1', ['g1h1'])));
    expect(r.text).toMatch(/^The knight to e7 gives check, but it isn't mate: it lands between your bishop on b4 and f8/);
    expect(r.motif).toBe('interference');
  });
  it('silent when the check really is mate-proof for other reasons (they can capture the checker)', () => {
    expect(falseMateBlock(live('6kr/5ppp/2n5/3N4/1B6/8/5PPP/6K1 w - - 0 1', ['g1h1']))).toBeNull();
  });
  it('the cut: a piece dropped on their guard line, and the guarded piece falls', () => {
    const r = proven(interferenceCut(live(INTERFERE, ['b4d5', 'g7g6', 'b2d4', 'h7h6'])));
    expect(r.text).toBe('The knight to d5 cuts the line between their rook on d8 and their knight on d4, so the knight loses its guard and falls.');
    expect(r.stakes?.points).toBe(3);
  });
  it('silent when the engine line does not take the cut-off piece', () => {
    expect(interferenceCut(live(INTERFERE, ['b4d5', 'g7g6', 'h2h3', 'h7h6']))).toBeNull();
  });
});

describe('4. clearance with tempo', () => {
  it('moves the blocker with a capture that hits the queen, and the pin lands', () => {
    const r = proven(clearanceTempo(live(CLEARANCE, ['d4e6', 'd8d7', 'b2f6', 'h7h6'])));
    expect(r.text).toBe("Your knight on d4 is in your bishop's way. Move it off with tempo: the knight takes e6, hitting their queen, and the bishop's line opens onto their knight on f6, pinning it to their rook.");
    expect(r.motif).toBe('clearance');
  });
  it('silent when the move clears nothing (a quiet knight move off the long diagonal wins nothing)', () => {
    expect(clearanceTempo(live(CLEARANCE, ['h2h3', 'h7h6']))).toBeNull();
  });
});

describe('5. decoy and deflection, live', () => {
  it('the decoy: push first, they take, the check hits the piece where it landed', () => {
    const r = proven(decoyDeflection(live(DECOY, ['b4b5', 'c6b5', 'd1d3', 'g7g6', 'd3b5', 'a8b8'])));
    expect(r.act).toBe('decoy');
    expect(r.text).toBe('First the pawn to b5: once their bishop takes on b5, the queen to d3 is check, and it hits the bishop there.');
  });
  it('silent when they decline the bait (the engine line Stockfish actually plays here)', () => {
    expect(decoyDeflection(live(DECOY, ['b4b5', 'c6e4', 'f2f3', 'e4g6']))).toBeNull();
  });
  it('the deflection: their rook takes, and stops guarding the queening square', () => {
    // A real master game (model-games.json), move 36.
    const fen = '5rk1/1P3pp1/R6p/3B4/6P1/2B1rQ2/2K3P1/6q1 w - - 1 36';
    const r = proven(decoyDeflection(live(fen, ['d5f7', 'f8f7', 'b7b8q', 'g8h7'])));
    expect(r.act).toBe('deflection');
    expect(r.text).toMatch(/it no longer guards b8, and your pawn queens on b8\.$/);
  });
});

describe('6. the discovery audit', () => {
  it('a pawn kick that opens their queen onto yours', () => {
    const r = proven(discoveryAudit(live('3q2k1/5ppp/8/8/3n4/8/2P2PPP/3Q2K1 w - - 0 1', ['g1h1'])));
    expect(r.text).toMatch(/^The pawn to c3 would kick their knight on d4, but it opens their queen on d8 onto your queen on d1 — check every square the knight can land on first/);
    expect(r.motif).toBe('discovered_attack');
  });
  it('silent when nothing stands behind the kicked piece', () => {
    expect(discoveryAudit(live('6k1/5ppp/8/8/3n4/8/2P2PPP/3Q2K1 w - - 0 1', ['g1h1']))).toBeNull();
  });
});

describe('7. their in-between move, one step further', () => {
  const before = '6k1/p6p/4b3/3N4/8/8/PPP1K2P/8 b - - 0 1'; // they owe Bxd5
  const c = new Chess(before); c.move('Bg4+');
  it('the king steps up and the piece stays yours', () => {
    const r = proven(zwischenzugRefuted(live(c.fen(), ['e2e3', 'a7a6'], { lastOpponentMove: { fenBefore: before, san: 'Bg4+' } })));
    expect(r.text).toMatch(/in-between check .* the king to e3, and your knight on d5 (stays yours|is safe again)\.$/);
    expect(r.motif).toBe('zwischenzug');
  });
  it('silent when they owed nothing (the knight was defended, so the check is just a check)', () => {
    const calm = '6k1/p6p/4b3/3N4/2P5/8/PP2K2P/8 b - - 0 1';
    const d = new Chess(calm); d.move('Bg4+');
    expect(zwischenzugRefuted(live(d.fen(), ['e2e3', 'a7a6'], { lastOpponentMove: { fenBefore: calm, san: 'Bg4+' } }))).toBeNull();
  });
});

describe('8. the fork that serves a plan', () => {
  const fen = '4q1k1/1p3rpp/4b3/8/8/5N2/P4PPP/R5K1 w - - 0 1';
  it('hits two pieces, wins nothing, and their answer loosens a pawn', () => {
    const r = proven(forkForPlan(live(fen, ['f3g5', 'f7f5', 'g5e6', 'e8e6'])));
    expect(r.text).toBe('The knight to g5 hits their rook and bishop. It wins nothing, but after the rook to f5 their pawn on b7 has no defender left.');
  });
  it('silent when the double attack wins material (that is a fork, not a plan)', () => {
    expect(forkForPlan(live(fen, ['f3g5', 'e6d5', 'g5f7', 'd5f7']))).toBeNull();
  });
});

describe('9. their usual reply is unavailable', () => {
  // A real master game (model-games.json): after Qa4, the b5 kick drops the pawn.
  const fen = 'rn3rk1/p1p1qpp1/1p2b2p/3p4/3P4/4PN2/PP3PPP/2RQKB1R w K - 2 12';
  it('the pawn kick against the posted piece loses material', () => {
    const r = proven(kickFails(live(fen, ['d1a4'])));
    expect(r.text).toBe("After the queen to a4, kicking it with the pawn to b5 doesn't work here: the bishop takes b5, winning a pawn.");
  });
  it('silent when the kick works (the punishment was there before it)', () => {
    expect(kickFails(live('5rk1/p1p2ppp/8/8/7q/2N2Q2/5PPP/6K1 w - - 0 1', ['c3b5']))).toBeNull();
  });
});

describe('10. the counterfactual pattern', () => {
  it('a checking knight jump that would fork the queen if it stepped there', () => {
    const r = proven(counterfactualFork(live('6k1/p4ppp/1q6/5N2/8/8/P4PPP/6K1 w - - 0 1', ['g1h1'])));
    expect(r.text).toMatch(/^Keep the knight jump to e7 in mind: it gives check, so if their queen ever lands on [a-h][1-8], the jump forks king and queen\.$/);
  });
  it('silent when the jump would hang the knight', () => {
    expect(counterfactualFork(live('6k1/p3pppp/1q6/5N2/8/8/P4PPP/6K1 w - - 0 1', ['g1h1']))).toBeNull();
  });
});

describe('11. a pushed pawn cannot block a check', () => {
  it('the Moscow Sicilian: the c-pawn on c5 cannot come back to c6', () => {
    const r = proven(pawnBlockGone(live(MOSCOW, ['f1b5'])));
    expect(r.text).toBe("Their c-pawn is already on c5, so the check from b5 can't be blocked by a pawn on c6 — the block has to come from a piece.");
  });
  it('silent where a pawn can still block (1.e4 d6 2.d4 Nf6, Bb5+ c6)', () => {
    expect(pawnBlockGone(live(afterSans(['e4', 'd6', 'd4', 'Nf6']), ['f1b5']))).toBeNull();
  });
});

describe('12. interposition between facing pieces', () => {
  it('the rook steps between your queen and their rook on the d-file', () => {
    const r = proven(interposeFacing(live('3rk3/5ppp/8/8/R7/8/5PPP/3Q2K1 w - - 0 1', ['a4d4'])));
    expect(r.text).toBe("The rook to d4 steps in between your queen on d1 and their rook on d8, facing each other down the d-file, taking your queen out of their rook's line.");
    expect(r.stakes?.points).toBe(9);
  });
  it('silent when the move lands on no facing line', () => {
    expect(interposeFacing(live('3rk3/5ppp/8/8/R7/8/5PPP/3Q2K1 w - - 0 1', ['a4a5']))).toBeNull();
  });
});

describe('13. the loaded line', () => {
  it('your pawn in front of your bishop, aimed at their king', () => {
    const r = proven(loadedLine(live('8/p6k/8/8/4P3/8/8/1B4K1 w - - 0 1', ['g1g2'])));
    expect(r.text).toBe('Your pawn on e4 is loaded: when it moves, your bishop on b1 behind it gives check, so that pawn moves with tempo.');
  });
  it('their loaded line is a warning in their words', () => {
    const r = proven(loadedLine(live('1b5k/7p/8/4p3/8/8/P6K/8 w - - 0 1', ['h2g2'])));
    expect(r.text).toMatch(/^Their pawn on e5 is loaded: when it moves, their bishop on b8 behind it checks your king/);
  });
  it('silent when the pawn cannot leave the line (a file pawn with nothing to take)', () => {
    expect(loadedLine(live('7k/8/8/8/7P/8/8/4K2R w - - 0 1', ['e1e2']))).toBeNull();
  });
});

describe('the start position says nothing', () => {
  it('no read on move one', () => {
    expect(geometryReads(live(new Chess().fen(), ['e2e4', 'e7e5']))).toEqual([]);
  });
});

describe('pvGain — counted where the mover is to move again', () => {
  it('a pawn sacrificed and a bishop won nets two', () => {
    expect(pvGain(DECOY, ['b4b5', 'c6b5', 'd1d3', 'g7g6', 'd3b5', 'a8b8'], 'w')).toBe(2);
  });
});

describe('isPinnedPiece — a piece off every king line is never pinned (latent defect fixed here)', () => {
  it('a rook on d6 is not pinned to a king on g1 by a queen on b8', () => {
    const c = new Chess('bq2r1k1/1r4bp/Q2Rp3/6P1/P3P2R/1NN5/1Pn3BP/6K1 b - - 0 37');
    expect(isPinnedPiece(c, 'd6', 'w')).toBe(false);
  });
  it('a real pin still reads as one', () => {
    expect(isPinnedPiece(new Chess('4k1n1/ppp1bppp/8/8/8/2N5/PPP1QPPP/4K3 w - - 0 1'), 'e7', 'b')).toBe(true);
  });
});

describe('DIAGNOSE — the one tactic classifier names what these reads teach', () => {
  it('interference, deflection and clearance reach the record instead of the sentinel', () => {
    expect(detectTacticType(INTERFERE, 'b4d5', ['b4d5', 'g7g6', 'b2d4', 'h7h6'])).toBe('interference');
    expect(detectTacticType(DECOY, 'b4b5', ['b4b5', 'c6b5', 'd1d3', 'g7g6', 'd3b5', 'a8b8'])).toBe('deflection');
    expect(detectTacticType(CLEARANCE, 'd4e6', ['d4e6', 'd8d7', 'b2f6', 'h7h6'])).toBe('clearance');
    expect(geometryMotif(INTERFERE, ['b4d5', 'g7g6', 'h2h3', 'h7h6'])).toBeNull();
  });
});

describe('WIRED — a real read comes out of every surface', () => {
  it('the registry hands it over with its proof and motif', () => {
    const reads = readBoardAll('tacticGeometry', live(INTERFERE, ['b4d5', 'g7g6', 'b2d4', 'h7h6']));
    const r = reads.find((x) => x.key.startsWith('geo:interference'));
    expect(r && isProof(r.proof)).toBe(true);
    expect(r?.motif).toBe('interference');
  });
  it('Learn and read-position: the one producer emits a `tactic` clause, proven; held back it speaks only the idea', () => {
    const topLines = [{ moves: ['b4d5', 'g7g6', 'b2d4', 'h7h6'], evaluation: 600, mate: null }];
    const named = depthClauses({ fen: INTERFERE, history: [], topLines, studentColor: 'w', nameMove: true });
    const t = named.find((d) => d.kind === 'tactic' && /cuts the line/.test(d.text));
    expect(t?.proof && isProof(t.proof)).toBe(true);
    expect(t?.motif).toBe('interference');
    const held = depthClauses({ fen: INTERFERE, history: [], topLines, studentColor: 'w', nameMove: false });
    expect(held.some((d) => d.kind === 'tactic' && /cuts the line/.test(d.text))).toBe(false);
    expect(held.some((d) => /a piece dropped onto that line cuts it/.test(d.text))).toBe(true);
  });
  it('the one vocabulary: a live `tactic` teaches and owes a proof', () => {
    expect(FACT_ROLE.tactic).toBe('teach');
    expect(FACT_PROOF.tactic).toBe('proven');
  });
  it('Review: the move that was there, said retrospectively — and never when the student played it', () => {
    const fenBefore = MOSCOW;
    const ctx = (san: string) => {
      const c = new Chess(fenBefore); c.move(san);
      return {
        seenFundamentals: new Set<never>(), teaching: NO_TEACHING_CONTEXT, fenBefore, fenAfter: c.fen(), san, ply: 5,
        moverColor: 'white' as const, playerColor: 'white' as const, studentColorWB: 'w' as const, evaluation: 20, preMoveEval: 30, costCp: 10,
        classification: 'inaccuracy', bestMoveSan: 'Bb5+', prevCap: { square: null, capturedValue: 0 }, allSans: ['e4', 'c5', 'Nf3', 'd6', san],
        forcedRunStartPly: null, playedLineUci: [], bestLineUci: ['f1b5'], replyBestSan: null,
      };
    };
    const proofs = new Map();
    const facets = computeMoveFacets(ctx('Bc4'), undefined, undefined, undefined, undefined, undefined, proofs);
    const f = facets.find((x) => x.startsWith('[tactic]') && /c-pawn was already on c5/.test(x));
    expect(f).toBeTruthy();
    expect(isProof(proofs.get(f))).toBe(true);
    // The student PLAYED it: no "the check couldn't be blocked" find (G4.5.2).
    expect(computeMoveFacets(ctx('Bb5+')).some((x) => /c-pawn was already on c5/.test(x))).toBe(false);
  });
});
