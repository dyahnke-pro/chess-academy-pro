/**
 * OS-11 ROOT CAUSES 5 AND 6, ON #2'S REPLAY BOARDS (learn-rootcauses
 * 2026-10-19). 5: one claim said twice in a rotated wording — "Nothing
 * hinges…" from the phase lane on move 8, "…not a big decision" from the turn
 * door on move 12; "overprotect your knight on d5" on moves 27 and 34. 6: on
 * ply 13 the late wave held the calm read as "contradicts" and the phase wave
 * spoke it anyway. Engine lines are #2's Stockfish depth-20 reads.
 */
import { describe, it, expect } from 'vitest';
import { anyMoveFine, overprotect } from './speedRunReads';
import { coachTurn, decidePhaseWave } from './coachDecider';
import { decideTurn, spokenSentenceKeys } from './learnTurnDoor';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';

const F8 = 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8';
const L8 = [{ moves: ['e4e5'], evaluation: -17, mate: null }, { moves: ['c3d5'], evaluation: -28, mate: null }, { moves: ['c4d5'], evaluation: -30, mate: null }];
const F12 = 'r1b1k2r/pp2p1bp/2np1np1/q5N1/4PB2/2N5/PP3PPP/R2QR1K1 w - - 6 12';
const L12 = [{ moves: ['a1c1'], evaluation: -286, mate: null }, { moves: ['c3d5'], evaluation: -299, mate: null }, { moves: ['d1b3'], evaluation: -299, mate: null }];
const F27 = 'r5k1/pp6/2np1p2/3N4/4P1b1/1P4P1/6K1/5R2 w - - 0 27';
const F34 = 'r7/pp4k1/3p1R2/2nN2P1/4P3/8/6K1/8 w - - 4 34';
const ctx = { priorKeys: new Set<string>(), priorLead: null, green: null, beginner: false };

describe('root cause 5 — one claim, whatever wording it rotates to', () => {
  it('R1: the move-8 phase line ("Nothing hinges…") silences the move-12 door line ("…not a big decision")', () => {
    const a = anyMoveFine(F8, L8)!;
    const b = anyMoveFine(F12, L12)!;
    expect(a.idea).toMatch(/^Nothing hinges/);
    expect(b.idea).toMatch(/not a big decision/);
    const phase = decidePhaseWave([{ text: a.idea!, claims: [a.claim], proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE, factKind: 'speedrun-read' }],
      F8, { fen: F8, ply: 13, slipCp: null, priceSettled: true, midExchange: null, said: '', holds: new Set<string>() }, ctx)!;
    expect(phase.pkg.spoken).toMatch(/Nothing hinges/);
    const ledger = new Set(spokenSentenceKeys(phase.pkg));
    const later = decideTurn([{ lane: 'positionFacts', text: b.idea!, fen: F12, claims: [b.claim], proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE }], '', ledger);
    expect(later.pkg.spoken).toBe('');
  });

  it('R2: "overprotect the knight on d5" on move 27 silences its other wording on move 34', () => {
    const a = overprotect(F27, 'w')!;
    const b = overprotect(F34, 'w')!;
    expect(a.text).not.toBe(b.text);
    expect(a.claim).toMatch(/^srr:overprotect:d5$/);
    expect(b.claim).toBe(a.claim);
    const first = decideTurn([{ lane: 'positionFacts', text: a.text, fen: F27, squares: a.squares, claims: [a.claim], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE }]);
    expect(first.pkg.spoken).toMatch(/d5/);
    const second = decideTurn([{ lane: 'positionFacts', text: b.text, fen: F34, squares: b.squares, claims: [b.claim], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE }], '', new Set(spokenSentenceKeys(first.pkg)));
    expect(second.pkg.spoken).toBe('');
  });
});

describe('root cause 6 — the phase wave is part of its turn', () => {
  it('ply 13: the calm read the late wave held as "contradicts" is not spoken by the phase wave', () => {
    const calm = anyMoveFine(F8, L8)!;
    const holds = new Set<string>();
    const late = coachTurn({ posture: 'learn', turn: { kind: 'late', ply: 13, slipCp: null, priceSettled: true, midExchange: null }, facts: [
      { lane: 'positionFacts', text: 'Ask it of every candidate: after it, can they take anything of yours?', fen: F8, squares: ['c4'], claims: ['srr:every-branch'], stakes: { points: 3, plies: 2 }, proof: NO_PROOF.method, namesStudentMove: NAMES_NO_MOVE },
      { lane: 'positionFacts', text: calm.idea!, fen: F8, claims: [calm.claim], proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE },
    ], priorLead: null, green: null, beginner: false, turnHolds: holds });
    expect(late.pkg.spoken).not.toMatch(/Nothing hinges/);
    const phase = decidePhaseWave([{ text: calm.idea!, claims: [calm.claim], proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE, factKind: 'speedrun-read' }],
      F8, { fen: F8, ply: 13, slipCp: null, priceSettled: true, midExchange: null, said: late.pkg.spoken, holds }, ctx)!;
    expect(phase.pkg.spoken).toBe('');
    // NEGATIVE CONTROL: on a turn that held nothing, the same phase fact speaks.
    const fresh = decidePhaseWave([{ text: calm.idea!, claims: [calm.claim], proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE, factKind: 'speedrun-read' }],
      F8, { fen: F8, ply: 13, slipCp: null, priceSettled: true, midExchange: null, said: '', holds: new Set<string>() }, ctx)!;
    expect(fresh.pkg.spoken).toMatch(/Nothing hinges/);
  });
});
