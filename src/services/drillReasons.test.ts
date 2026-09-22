// drillReasons — drills that TEACH (WO-HOME-OPENING-01 A5): a wrong move gets
// the reason it fails, the solve plays the sequence and names the idea, the
// hint says the piece and withholds the square.
import { describe, it, expect } from 'vitest';
import { hintBeat, solvedLineBeat, wrongMoveReason } from './drillReasons';

describe('wrongMoveReason — computed off the board the wrong move leaves', () => {
  it('a move that walks into mate in one says so', () => {
    // Scholar's mate is on: White threatens Qxf7#. …Nf6?? ignores it.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
    expect(wrongMoveReason(fen, 'Nf6', 'g6')).toMatch(/^The knight to f6 walks into Qxf7# — mate\./);
  });
  it('a move that leaves a piece loose names the piece and the square', () => {
    // White knight on e5 defended by nothing after Black plays …Nc6?? no — build: White to move, Nd5?? drops the knight? Use a clear case:
    // Black queen on d8, White plays Qxd5?? where d5 is defended by the e6 pawn... simpler: a knight moved to a square attacked by a pawn.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2';
    const r = wrongMoveReason(fen, 'Ng5', 'Nc3'); // Ng5 is hit by …Qxg5
    expect(r).toMatch(/leaves your knight on g5 loose/);
    expect(r).toMatch(/keeps everything protected/);
  });
  it('is null when the board shows nothing concrete (the nudge stands alone, never a guess)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(wrongMoveReason(fen, 'a3', 'e4')).toBeNull();
  });
  it('is null on an unparseable move', () => {
    expect(wrongMoveReason('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'Qh9', 'e4')).toBeNull();
  });
});

describe('solvedLineBeat — the sequence, spoken, with the idea', () => {
  it('spells the whole line and appends the idea', () => {
    expect(solvedLineBeat(['Nxd5', 'Qxd5', 'Bxf7+'], 'The fork: one piece, two targets.'))
      .toBe('That\'s it — the knight takes d5; then the queen takes d5, the bishop takes f7. The fork: one piece, two targets.');
  });
  it('a one-move line and no idea still speaks the move — never "Good."', () => {
    expect(solvedLineBeat(['O-O'], null)).toBe('That\'s it — castle short.');
    expect(solvedLineBeat(['e4'], null)).not.toMatch(/^Good\./);
  });
});

describe('hintBeat — names the piece, withholds the square', () => {
  it('a capture and a quiet move name the piece and its FROM square only', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2';
    expect(hintBeat(fen, 'Nxe5')).toBe('Your knight on f3 has a capture that changes everything — find it.');
    expect(hintBeat(fen, 'Nc3')).toBe('Your knight on b1 wants a better square — find it.');
    expect(hintBeat(fen, 'Nc3')).not.toContain('c3');
  });
  it('castling and an unparseable move', () => {
    expect(hintBeat('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'O-O')).toMatch(/castling/);
    expect(hintBeat('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'Qh9')).toBeNull();
  });
});
