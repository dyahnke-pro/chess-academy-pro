import { Chess } from 'chess.js';
// The question that catches the slip (David 2026-10-14: verdicts into thinking).
import { describe, it, expect } from 'vitest';
import { BLUNDER_CHECK_QUESTION, slipQuestion } from './learnBoardTeaching';

describe('slipQuestion — the thinking step a lost piece failed, read off the board', () => {
  it('the move itself made the piece losable: the blunder check', () => {
    // White's knight on f3 goes to d4, where the e5 pawn takes it.
    const q = slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', 'd4', 'w', new Set(), 0, null, null);
    expect(q?.key).toBe('claim:method:blunder-check');
    expect(q?.text).toMatch(/your knight on d4/);
    expect(q?.text).toMatch(/blunder check/i);
    expect(q?.text).toMatch(/CCT/);
  });
  it('the piece was already attacked before the move: answer the danger', () => {
    // The d5 pawn already hits the bishop on c4; any other move loses it.
    const q = slipQuestion('4k3/8/8/3p4/2B5/8/8/4K3 w - - 0 1', 'Kd1', 'c4', 'w', new Set(), 0, null, null);
    expect(q?.key).toBe('claim:method:opponent-threat');
    expect(q?.text).toMatch(/what did their last move attack\?/);
  });
  it('once per step per game; nothing without a lost piece', () => {
    const said = new Set<string>();
    expect(slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', 'd4', 'w', said, 0, null, null)).not.toBeNull();
    expect(slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', 'd4', 'w', said, 1, null, null)).toBeNull();
    expect(slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', undefined, 'w', new Set(), 0, null, null)).toBeNull();
  });
});

describe('one blunder-check habit, one say-once key (no second computer)', () => {
  it('the lane already taught it this game: the slip question stays quiet', () => {
    const said = new Set<string>(['claim:method:blunder-check']);
    expect(slipQuestion('4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', 'Nd4', 'd4', 'w', said, 0, null, null)).toBeNull();
  });
});

// ONE HABIT, ONE KEY (WO-STORY-MATRIX-01 P1-9): "what did their last move
// attack?" is the opponent-threat habit the live beat teaches as "their threat
// first, your idea second". It sat under its own `answer-danger` key, so a game
// that had heard the live beat heard the same habit again in other words.
describe('the threat habit taught live is not asked again after a slip', () => {
  it('the live beat said opponent-threat: the slip question stays quiet', async () => {
    const { liveHabitKey } = await import('./methodBeat');
    const { claimKey } = await import('./voicePackage');
    // What the live beat's spoken claim leaves in the game's ledger.
    const said = new Set<string>([claimKey(liveHabitKey('opponent-threat'))]);
    expect(slipQuestion('4k3/8/8/3p4/2B5/8/8/4K3 w - - 0 1', 'Kd1', 'c4', 'w', said, 0, null, null)).toBeNull();
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
    const q = slipQuestion(fen, 'Nc3', 'e3', 'w', new Set(), 0, null, { fen: after.fen(), uci: ['d5d4', 'e3d4', 'c6d4', 'g3g4', 'h5g6', 'f3e5'] });
    expect(q?.text).toContain('a threat: d4 took nothing, but it left your knight on c3 and your bishop on e3 under attack');
    expect(q?.text).not.toContain('was there to take');
  });
  it('a pawn lost seven moves later is no blunder-check miss (8…e5, d6 falls on their seventh move)', () => {
    const fen = 'r1bqk2r/pp2ppbp/2np1np1/8/2B1P3/2N5/PPP1NPPP/R1BQ1RK1 b kq - 5 8';
    const after = new Chess(fen); after.move('e5');
    expect(slipQuestion(fen, 'e5', 'd6', 'b', new Set(), 0, null, { fen: after.fen(), uci: ['c1g5', 'h7h6', 'g5f6', 'g7f6', 'd1d3', 'e8g8', 'a1d1', 'c6b4', 'd3d2', 'f6g5', 'd2d6', 'd8d6'] })).toBeNull();
  });
  it('with no line, a piece that was not takeable gets the question, never an invented answer', () => {
    const fen = 'r1bqk2r/pp2ppbp/2np1np1/8/2B1P3/2N5/PPP1NPPP/R1BQ1RK1 b kq - 5 8';
    const q = slipQuestion(fen, 'e5', 'd6', 'b', new Set(), 0, null, null);
    expect(q?.text).toBe(BLUNDER_CHECK_QUESTION);
  });
});
