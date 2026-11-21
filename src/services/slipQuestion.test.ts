import { Chess } from 'chess.js';
// The question that catches the slip (David 2026-10-14: verdicts into thinking).
import { describe, it, expect } from 'vitest';
import { BLUNDER_CHECK_QUESTION, slipQuestion } from './learnBoardTeaching';

describe('slipQuestion — the thinking step a lost piece failed, read off the board', () => {
  it('the move itself made the piece losable: the blunder check', () => {
    // White's knight on f3 goes to d4, where the e5 pawn takes it.
    const q = slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', 'd4', 'w', null, null, 'Ke2', 300, false);
    expect(q!.key).toBe('claim:method:blunder-check');
    expect(q!.text).toMatch(/your knight on d4/);
    expect(q!.text).toMatch(/blunder check/i);
    expect(q!.text).toMatch(/CCT/);
  });
  it('the piece was already attacked before the move: answer the danger', () => {
    // The d5 pawn already hits the bishop on c4; any other move loses it.
    const q = slipQuestion('4k3/8/8/3p4/2B5/8/8/4K3 w - - 0 1', 'Kd1', 'c4', 'w', null, null, 'Bb5+', 300, false);
    expect(q!.key).toBe('claim:method:opponent-threat');
    expect(q!.text).toMatch(/what did their last move attack\?/);
  });
  it('every correction, the same words: no once-a-game rule (David 2026-11-18)', () => {
    const a = slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', 'd4', 'w', null, null, 'Ke2', 300, false);
    const b = slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', 'd4', 'w', null, null, 'Ke2', 300, false);
    expect(b!.text).toBe(a!.text);
  });
});

// A SLIP THAT LOST NOTHING STILL CLOSES ON ITS HABIT (the Learn preview of
// 2026-11-18: 15 of 16 corrections had none — the question fired only on a
// lost piece). Boards from the preview games.
describe('a correction with no piece lost gets its habit', () => {
  it('the move that was there was a capture: the forcing scan (800 Colle 16.Qg3, Rxe5 was there)', () => {
    const q = slipQuestion('r1bqrnk1/5ppp/p3p3/1p1pn1bN/3p2Q1/2PB4/PP3PPP/R1B1R1K1 w - - 0 16', 'Qg3', null, 'w', null, null, 'Rxe5', 217, false);
    expect(q!.key).toBe('claim:method:forcing-scan');
    expect(q!.text).toMatch(/checks, captures and threats/);
  });
  it('a move that ALLOWED a mate threat, nothing taken: the blunder check (31…f5 let Qb7 threaten Qg7#)', () => {
    const q = slipQuestion('2qr2k1/R4p1p/4p1p1/2p5/8/3PKQP1/7P/8 b - - 0 31', 'f5', null, 'b', null, null, 'Rf8', 234, true);
    expect(q!.key).toBe('claim:method:blunder-check');
    expect(q!.text).toMatch(/run CCT for them/);
  });
  it('a quiet better move: name the candidates (26…Rb3, Bd4 was there)', () => {
    const q = slipQuestion('2qr2k1/5p1p/4p1p1/1rp1b3/8/3PBQP1/RP1R2KP/8 b - - 0 26', 'Rb3', null, 'b', null, null, 'Bd4', 118, false);
    expect(q!.key).toBe('claim:method:candidates');
    expect(q!.text).toMatch(/candidate moves/);
  });
});

describe('the habit key is the ledger\'s own key', () => {
  it('habitSaidKey is claimKey of the habit claim, for every habit', async () => {
    const { habitSaidKey, liveHabitKey } = await import('./methodBeat');
    const { claimKey } = await import('./voicePackage');
    for (const h of ['opponent-threat', 'forcing-scan', 'blunder-check', 'what-it-guarded'] as const) expect(habitSaidKey(h)).toBe(claimKey(liveHabitKey(h)));
  });

  // WO-DEPTH-01 — the blunder check says how the piece ACTUALLY fell, on
  // David's own games (audit-reports/slip-reads, engine depth 12).
  it('names the threat that won the piece, never "it was there to take" (7.Nc3?! …d4)', () => {
    const fen = 'r2qkb1r/ppp1ppp1/2n2n1p/3p3b/8/3PBNPP/PPP1PPB1/RN1QK2R w KQkq - 0 7';
    const after = new Chess(fen); after.move('Nc3');
    const q = slipQuestion(fen, 'Nc3', 'e3', 'w', null, { fen: after.fen(), uci: ['d5d4', 'e3d4', 'c6d4', 'g3g4', 'h5g6', 'f3e5'] }, 'Ne5', 150, false);
    expect(q!.text).toContain('a threat: d4 took nothing, but it left your knight on c3 and your bishop on e3 under attack');
    expect(q!.text).not.toContain('was there to take');
  });
  it('a pawn lost seven moves later is no blunder-check miss (8…e5, d6 falls on their seventh move)', () => {
    const fen = 'r1bqk2r/pp2ppbp/2np1np1/8/2B1P3/2N5/PPP1NPPP/R1BQ1RK1 b kq - 5 8';
    const after = new Chess(fen); after.move('e5');
    // Not the blunder check: the quiet better move's habit closes it instead.
    const q = slipQuestion(fen, 'e5', 'd6', 'b', null, { fen: after.fen(), uci: ['c1g5', 'h7h6', 'g5f6', 'g7f6', 'd1d3', 'e8g8', 'a1d1', 'c6b4', 'd3d2', 'f6g5', 'd2d6', 'd8d6'] }, 'O-O', 110, false);
    expect(q!.key).not.toBe('claim:method:blunder-check');
  });
  it('with no line, a piece that was not takeable gets the question, never an invented answer', () => {
    const fen = 'r1bqk2r/pp2ppbp/2np1np1/8/2B1P3/2N5/PPP1NPPP/R1BQ1RK1 b kq - 5 8';
    const q = slipQuestion(fen, 'e5', 'd6', 'b', null, null, 'O-O', 110, false);
    expect(q!.text).toBe(BLUNDER_CHECK_QUESTION);
  });
});
