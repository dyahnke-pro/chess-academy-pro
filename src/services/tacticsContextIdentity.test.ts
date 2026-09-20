import { describe, it, expect } from 'vitest';
import { tacticsAreFreshFor, pieceIsOn } from './tacticsContextIdentity';
import { buildTacticsLiveContext } from './liveTacticsContext';
import { assembleTacticsAnswer, assemblePositionAssessment } from './groundedAnswer';
import { stripUngroundedTacticSentences } from './tacticClaimValidator';
import type { TacticsLiveContext } from '../coach/types';

// THE REPORTED DEFECT, as a board. On a real 22-ply Learn game the student
// heard "Your knight on b5 is hanging" fifteen plies after `axb5` had taken
// it, with no white knights left at all. Two boards: the one the package was
// built from (white knight on b5, attacked by the a6 pawn, undefended) and the
// one the student was looking at (no knights on the board).
const FEN_KNIGHT_ON_B5 = '4k3/8/p7/1N6/8/8/8/4K3 w - - 0 1';
const FEN_FIFTEEN_PLIES_LATER = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

describe('tacticsAreFreshFor — STALENESS: is the package about the board the consumer is rendering?', () => {
  it('is true for the same board, and ignores the clocks / bookkeeping fields', () => {
    const ctx = buildTacticsLiveContext(FEN_KNIGHT_ON_B5, null, 'w', 1500);
    expect(tacticsAreFreshFor(ctx, FEN_KNIGHT_ON_B5)).toBe(true);
    // Same placement + side to move, different halfmove/fullmove — the same
    // board, reached by a different route. Refusing here would silence a
    // package that is genuinely about the position in front of the student.
    expect(tacticsAreFreshFor(ctx, '4k3/8/p7/1N6/8/8/8/4K3 w - - 7 31')).toBe(true);
  });
  it('is false when the placement differs — the b5 case', () => {
    const ctx = buildTacticsLiveContext(FEN_KNIGHT_ON_B5, null, 'w', 1500);
    expect(tacticsAreFreshFor(ctx, FEN_FIFTEEN_PLIES_LATER)).toBe(false);
  });
  it('is false when the side to move differs — the same squares, a different question', () => {
    const ctx = buildTacticsLiveContext(FEN_KNIGHT_ON_B5, null, 'w', 1500);
    expect(tacticsAreFreshFor(ctx, FEN_KNIGHT_ON_B5.replace(' w ', ' b '))).toBe(false);
  });
  it('a consumer that does not know its own board has no licence to speak', () => {
    const ctx = buildTacticsLiveContext(FEN_KNIGHT_ON_B5, null, 'w', 1500);
    expect(tacticsAreFreshFor(ctx, null)).toBe(false);
    expect(tacticsAreFreshFor(ctx, undefined)).toBe(false);
    expect(tacticsAreFreshFor(ctx, '')).toBe(false);
    expect(tacticsAreFreshFor(null, FEN_KNIGHT_ON_B5)).toBe(false);
    expect(tacticsAreFreshFor({ fen: '' }, FEN_KNIGHT_ON_B5)).toBe(false);
  });
});

describe('pieceIsOn — INTERNAL CONSISTENCY: is the claim true of the board it says it is about?', () => {
  it('is true only for the right piece of the right colour on that square', () => {
    expect(pieceIsOn(FEN_KNIGHT_ON_B5, 'b5', 'n', 'w')).toBe(true);
    expect(pieceIsOn(FEN_KNIGHT_ON_B5, 'b5', 'n', 'b')).toBe(false); // THEIR knight is not YOUR knight
    expect(pieceIsOn(FEN_KNIGHT_ON_B5, 'b5', 'b', 'w')).toBe(false);
    expect(pieceIsOn(FEN_KNIGHT_ON_B5, 'c5', 'n', 'w')).toBe(false); // empty square
  });
  it('never throws — an unverifiable claim is simply not made', () => {
    expect(pieceIsOn('not-a-fen', 'b5', 'n', 'w')).toBe(false);
    expect(pieceIsOn(FEN_KNIGHT_ON_B5, 'z9', 'n', 'w')).toBe(false);
  });
});

describe('the package carries its own board — set at the single build site', () => {
  it('buildTacticsLiveContext stamps the fen it was given', () => {
    expect(buildTacticsLiveContext(FEN_KNIGHT_ON_B5, null, 'w', 1500).fen).toBe(FEN_KNIGHT_ON_B5);
  });
  it('a real detector run on the b5 board really does find the knight hanging (the positive control)', () => {
    const ctx = buildTacticsLiveContext(FEN_KNIGHT_ON_B5, null, 'w', 1500);
    expect(ctx.hanging).toEqual(expect.arrayContaining([expect.objectContaining({ square: 'b5', piece: 'n', color: 'w' })]));
  });
});

describe('a package whose fen does not match the consumer\'s board cannot produce a piece-on-square claim (negative-controlled)', () => {
  // Built for the OLD board — it is a true, internally consistent package.
  const stale = buildTacticsLiveContext(FEN_KNIGHT_ON_B5, null, 'w', 1500);

  it('POSITIVE CONTROL — against its OWN board the claim is made: the check is real, not vacuous', () => {
    const a = assembleTacticsAnswer(stale, 'white');
    expect(a?.facts).toContain('Your knight on b5 is hanging.');
    const kept = stripUngroundedTacticSentences('Your knight on b5 is hanging.', stale, undefined, FEN_KNIGHT_ON_B5);
    expect(kept.staleContext).toBe(false);
    expect(kept.clean).toContain('knight on b5');
  });

  it('the spoken gate, handed the LIVE board, refuses the stale vocabulary — the sentence is dropped', () => {
    const r = stripUngroundedTacticSentences('Your knight on b5 is hanging.', stale, undefined, FEN_FIFTEEN_PLIES_LATER);
    expect(r.staleContext).toBe(true);
    expect(r.clean).not.toContain('b5');
    expect(r.dropped).toHaveLength(1);
  });

  it('…but a claim that is TRUE on the live board still survives through the board-rescue (stale ≠ silent)', () => {
    // Live board: a white knight on d5 really is hanging to the c6 pawn.
    const live = '4k3/8/2p5/3N4/8/8/8/4K3 w - - 0 1';
    const r = stripUngroundedTacticSentences('Your knight on d5 is hanging.', stale, undefined, live);
    expect(r.staleContext).toBe(true);
    expect(r.clean).toContain('knight on d5');
    expect(r.dropped).toHaveLength(0);
  });

  it('the assembler verifies against the package\'s own fen unconditionally — an entry its board does not bear out is not spoken', () => {
    // A package whose `hanging` names a square its OWN fen does not hold (the
    // internal-inconsistency case — a detector or fixture that lied). Quiet in
    // every other respect, so the ONLY thing it could say is the lie.
    const inconsistent: TacticsLiveContext = {
      fen: stale.fen, lookaheadDepth: stale.lookaheadDepth,
      immediate: [], threats: [], opportunities: [], concepts: undefined, boardFacts: undefined,
      hanging: [{ square: 'g7', piece: 'q', color: 'w' }],
    };
    expect(assembleTacticsAnswer(inconsistent, 'white')).toBeNull();
    // And with an ask that would take the "danger note" branch.
    expect(assembleTacticsAnswer(inconsistent, 'white', 'is there a fork?')?.facts ?? '').not.toContain('g7');
    const assess = assemblePositionAssessment({ evalCp: -250, mateIn: null, studentColor: 'white', tactics: inconsistent });
    expect(assess?.facts ?? '').not.toContain('g7');
  });

  it('and that same check CANNOT see staleness — which is why the grounding gate exists', () => {
    // Stated as a test so no future session "simplifies" the gate away on the
    // grounds that the assembler already verifies: it verifies against the
    // package's own board, on which the b5 knight is genuinely hanging.
    const a = assembleTacticsAnswer(stale, 'white');
    expect(a?.facts).toContain('Your knight on b5 is hanging.');
  });
});
