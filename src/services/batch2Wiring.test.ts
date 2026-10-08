// Computers batch 2 — wired BOTH ways. Every new computer reaches the one door
// on the surfaces it applies to (Learn's live producer, Review's facets) with
// its proof coupled, and the quiet danger also files a posed question into
// the student model through the one posed-question computer.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { depthClauses } from './thinkAloud';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';
import { capabilitiesPosed } from './capabilityEvidence';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';
import { coldStudent } from './needScore';
import { FACT_ROLE, FACT_PROOF, FACT_LAYER } from './reviewFacetRank';
import { isProof, type FactProof } from './proof';
import { lastMoveIfOpponent } from './lastMoveOfLine';

const QUIET_BEFORE = 'r5k1/2q2ppp/8/8/8/R7/1B3PPP/6K1 b - - 0 1';
const quietAfter = (): string => { const c = new Chess(QUIET_BEFORE); c.move('Rd8'); return c.fen(); };

describe('LEARN — the one live producer speaks the new reads', () => {
  it('their quiet rook move arrives as a their-read clause with its proof', () => {
    const out = depthClauses({
      fen: quietAfter(), history: [], topLines: [], studentColor: 'w', nameMove: false,
      lastOpponentMove: { fenBefore: QUIET_BEFORE, san: 'Rd8' },
    });
    const read = out.find((d) => d.kind === 'their-read');
    expect(read?.text).toMatch(/mate/);
    expect(read?.proof && isProof(read.proof)).toBe(true);
  });
  it('a read that names your move waits where the move is not earned', () => {
    const before = '6k1/pp3ppp/1q6/8/8/2N5/PP3PPP/3R2K1 b - - 0 1';
    const c = new Chess(before); c.move('Qxb2');
    const args = { fen: c.fen(), history: [], topLines: [{ moves: ['d1b1', 'b2a3', 'b1b7'], evaluation: 150, mate: null }], studentColor: 'w' as const, lastOpponentMove: { fenBefore: before, san: 'Qxb2' } };
    expect(depthClauses({ ...args, nameMove: false }).some((d) => /expecting it to be free|looked free/.test(d.text))).toBe(false);
    expect(depthClauses({ ...args, nameMove: true }).some((d) => /expecting it to be free|looked free/.test(d.text))).toBe(true);
  });
  it('a known attacking structure arrives as an attack-pattern clause', () => {
    const out = depthClauses({ fen: 'r4rk1/ppq2pp1/2n1pn1p/8/3P4/2N1BN2/PPPQ1PPP/2KR3R w - - 0 1', history: [], topLines: [{ moves: ['g2g4'], evaluation: 40, mate: null }], studentColor: 'w', nameMove: false });
    expect(out.find((d) => d.kind === 'attack-pattern')?.text).toMatch(/opposite wings/);
  });
});

describe('CHAT — the tapped position read gets their last move', () => {
  it('derives their move from the game when they moved last, never when you did', () => {
    const c = new Chess(); ['e4', 'e5', 'Nf3', 'Nc6'].forEach((m) => c.move(m));
    expect(lastMoveIfOpponent(['e4', 'e5', 'Nf3', 'Nc6'], 'white', c.fen())?.san).toBe('Nc6');
    expect(lastMoveIfOpponent(['e4', 'e5', 'Nf3', 'Nc6'], 'black', c.fen())).toBeNull();
  });
});

describe('REVIEW — the same producer on the opponent\'s ply', () => {
  it('their quiet rook move carries a [their-read] facet and its proof', () => {
    const proofs = new Map<string, FactProof>();
    const facets = computeMoveFacets({
      seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore: QUIET_BEFORE, fenAfter: quietAfter(), san: 'Rd8', ply: 2, moverColor: 'black', playerColor: 'white', studentColorWB: 'w',
      evaluation: -900, preMoveEval: 0, costCp: null, classification: 'good', bestMoveSan: null, prevCap: { square: null, capturedValue: 0 },
      allSans: ['a4', 'Rd8'], forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], replyBestSan: null,
    }, undefined, undefined, undefined, undefined, undefined, proofs);
    const f = facets.find((x) => x.startsWith('[their-read]'));
    expect(f).toMatch(/mate/);
    expect(f && isProof(proofs.get(f))).toBe(true);
  });

  it('the game looked back on: the quiet move it turned on is spoken on its ply', () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nf6', 'h3', 'Nc6', 'Nc3', 'Bc5'];
    const evals = [20, 20, 20, 20, 20, 250, 260, 300];
    const c = new Chess();
    const inp = sans.map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 1, classification: i === 5 ? 'mistake' : 'good',
        preMoveEval: i === 0 ? 20 : evals[i - 1], evaluation: evals[i], bestMove: i === 4 ? 'h2h3' : null } as ReviewMoveInput;
    });
    const segs = buildReviewSegments(inp, 'white', null, true, 1200, [], coldStudent(1200), 'g');
    expect(segs.find((s) => s.ply === 5)?.narration ?? '').toMatch(/g4 (?:from|away from) their knight/);
  });
});

describe('DIAGNOSE — a mate threat against you is a posed question', () => {
  it('the board after their quiet rook move asks "do you see the mate?"', () => {
    const posed = capabilitiesPosed(quietAfter(), 'h3', 'white').map((p) => p.tag);
    expect(posed).toContain('missed-opponents-threat');
  });
  it('the opening board asks no such question', () => {
    expect(capabilitiesPosed(new Chess().fen(), 'e4', 'white').map((p) => p.tag)).not.toContain('missed-opponents-threat');
  });
});

describe('the shared tables answer for every new kind', () => {
  it('each new kind teaches, owes a proof, and has a layer', () => {
    for (const k of ['their-read', 'prevent-test', 'game-end', 'murky', 'attack-pattern'] as const) {
      expect(FACT_ROLE[k]).toBe('teach');
      expect(FACT_PROOF[k]).toBe('proven');
      expect(FACT_LAYER[k]).toBeTruthy();
    }
  });
});
