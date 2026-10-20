/**
 * A VERDICT TURN IS WEIGHED BY THE ONE GRADE (OS-11 C4, 2026-10-20). The turn
 * door held plan and character lanes "for the verdict" whenever the raw cost
 * reached 100cp, while the verdict itself spoke only when the one graded,
 * settled price said slip — so on g1 21.Rg5 (127cp in a lost position) three
 * lanes were held for a verdict that never came, and the turn said nothing.
 * Now the door reads `saidSlipCp`: one reading of one price.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { decideTurn, type LaneFact } from './learnTurnDoor';
import { onLearnTurn, type LearnTurnRow } from './coachDecisionEvents';
import { saidSlipCp } from './backwardLook';
import { costStakes } from './factStakes';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';

// David's Keres Sicilian (White), 2026-10-19 hand walk.
const GAME = 'e4 c5 Ne2 Nc6 Nbc3 e5 Ng3 Nf6 Bc4 d6 h3 Be7 Bb5 O-O O-O Nd4 Bc4 Be6 d3 Nd7 Nd5 Bh4 Bb3 Nxb3'.split(' ');
const at = (plies: number): string => { const c = new Chess(); for (const m of GAME.slice(0, plies)) c.move(m); return c.fen(); };
const BEFORE_BB3 = at(22);
const TURN_BOARD = at(24); // after 12.Bb3 Nxb3
const ctx = { studentColor: 'white' as const, fenBefore: BEFORE_BB3, playedSan: 'Bb3', bestSan: 'Nxe7+', historySans: GAME.slice(0, 23) };

const plan: LaneFact = { lane: 'planArc', text: 'Your plan is the f-file: the pawn on f2 goes to f4 to open it for your rook.', fen: TURN_BOARD, squares: ['f2', 'f4', 'f1'], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE };
const character: LaneFact = { lane: 'character', text: 'The centre is closed, so the game is about the wings.', fen: TURN_BOARD, proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE };
const verdict = (cp: number): LaneFact => ({ lane: 'mistake', text: 'Bishop to b3 was a mistake: it lets their knight take it and wreck your pawns.', fen: TURN_BOARD, squares: ['b3', 'd4'], stakes: costStakes(cp) ?? undefined, proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE });

const rows: LearnTurnRow[] = [];
let off: (() => void) | null = null;
afterEach(() => { off?.(); off = null; rows.length = 0; });
const turn = (kind: 'instant' | 'late', slipCp: number | null) => ({ kind, ply: 23, slipCp, priceSettled: true, price: null, midExchange: null });

describe('saidSlipCp — the one grade the door reads', () => {
  it('12.Bb3 at an UNSETTLED 104: no slip is said yet, so it is not a verdict turn', () => {
    expect(saidSlipCp({ costCp: 104, scores: { bestWhiteCp: 64, playedWhiteCp: -40 }, settled: false }, ctx)).toBeNull();
  });
  it('12.Bb3 settled as a mistake (+0.64 → −0.73): the slip is said, at its price', () => {
    expect(saidSlipCp({ costCp: 137, scores: { bestWhiteCp: 64, playedWhiteCp: -73 }, settled: true }, ctx)).toBe(137);
  });
  it('a 127cp cost in a lost position (21.Rg5, −5.00 → −6.27) grades quiet: no slip', () => {
    expect(saidSlipCp({ costCp: 127, scores: { bestWhiteCp: -500, playedWhiteCp: -627 }, settled: true }, ctx)).toBeNull();
  });
  it('unpriced, or the best move, is never a slip', () => {
    expect(saidSlipCp(null, ctx)).toBeNull();
    expect(saidSlipCp({ costCp: 0, scores: null, settled: true }, ctx)).toBeNull();
  });
});

describe('the door holds for a verdict only when the grade says one', () => {
  it('21.Rg5: a quiet grade holds nothing for a verdict — plan and character speak', () => {
    off = onLearnTurn((r) => rows.push(r));
    const slip = saidSlipCp({ costCp: 127, scores: { bestWhiteCp: -500, playedWhiteCp: -627 }, settled: true }, ctx);
    const d = decideTurn([plan, character], '', undefined, null, null, false, turn('late', slip));
    expect(Object.values(rows.at(-1)?.heldWhy ?? {})).not.toContain('verdict-turn');
    expect(d.spoke).toContain('planArc');
  });
  it('12.Bb3 unsettled: the instant wave is not a verdict turn', () => {
    off = onLearnTurn((r) => rows.push(r));
    const slip = saidSlipCp({ costCp: 104, scores: { bestWhiteCp: 64, playedWhiteCp: -40 }, settled: false }, ctx);
    decideTurn([plan], '', undefined, null, null, false, turn('instant', slip));
    expect(rows.at(-1)?.heldWhy.planArc).not.toBe('verdict-turn');
  });
  it('12.Bb3 settled mistake: the instant wave holds the plan, and the verdict speaks first', () => {
    off = onLearnTurn((r) => rows.push(r));
    const slip = saidSlipCp({ costCp: 137, scores: { bestWhiteCp: 64, playedWhiteCp: -73 }, settled: true }, ctx);
    const instant = decideTurn([plan], '', undefined, null, null, false, turn('instant', slip));
    expect(instant.spoke).toEqual([]);
    expect(rows.at(-1)?.heldWhy.planArc).toBe('verdict-turn');
    const late = decideTurn([plan, verdict(137)], '', undefined, null, null, false, turn('late', slip));
    expect(late.spoke[0]).toBe('mistake');
    expect(late.pkg.spoken.startsWith('Bishop to b3 was a mistake')).toBe(true);
  });
});
