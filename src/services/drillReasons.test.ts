// drillReasons — drills that TEACH (WO-HOME-OPENING-01 A5): a wrong move gets
// the reason it fails, the solve plays the sequence and names the idea, the
// hint says the piece and withholds the square.
import { describe, it, expect } from 'vitest';
import { goodButWeakerBeat, hintBeat, lineGainIdea, solvedLineBeat, wrongMoveReason } from './drillReasons';

describe('wrongMoveReason — computed off the board the wrong move leaves', () => {
  it('a move that walks into mate in one says so', () => {
    // Scholar's mate is on: White threatens Qxf7#. …Nf6?? ignores it.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
    const r = wrongMoveReason(fen, 'Nf6', 'g6');
    expect(r).toMatch(/^The knight to f6 walks into the queen takes f7.* — mate\./);
    expect(r).not.toMatch(/g6/);
  });
  it('a move that leaves a piece loose names the piece and the square', () => {
    // White knight on e5 defended by nothing after Black plays …Nc6?? no — build: White to move, Nd5?? drops the knight? Use a clear case:
    // Black queen on d8, White plays Qxd5?? where d5 is defended by the e6 pawn... simpler: a knight moved to a square attacked by a pawn.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2';
    const r = wrongMoveReason(fen, 'Ng5', 'Nc3'); // Ng5 is hit by …Qxg5
    expect(r).toMatch(/leaves your knight on g5 hanging/);
    // Never the answer on a miss (walk 2026-10-04 defect 7).
    expect(r).not.toMatch(/c3/);
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
    expect(solvedLineBeat(null, ['Nxd5', 'Qxd5', 'Bxf7+'], 'The fork: one piece, two targets.'))
      .toBe('That\'s it — the knight takes d5; then the queen takes d5, the bishop takes f7. The fork: one piece, two targets.');
  });
  it('a piece SAN tells apart is said with its FROM square off the drill board (walk 2026-10-04, defect 8)', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 3';
    expect(solvedLineBeat(fen, ['Nce7'], null)).toBe('That\'s it — the knight from c6 to e7.');
  });
  it('a one-move line and no idea still speaks the move — never "Good."', () => {
    expect(solvedLineBeat(null, ['O-O'], null)).toBe('That\'s it — castle short.');
    expect(solvedLineBeat(null, ['e4'], null)).not.toMatch(/^Good\./);
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

describe('goodButWeakerBeat — a good move is called good (walk 2026-10-04 defect 9)', () => {
  // White: Nd5 can take on c7 with check (+1.8) or on e7 (+3.5 in the walk).
  const fen = 'r3k3/2p1q3/8/3N4/8/8/8/7K w - - 0 1';
  it('names what it wins and that there is something stronger, without naming it', () => {
    const line = goodButWeakerBeat({ fenBefore: fen, wrongSan: 'Nxc7+', evalAfterWrong: 180, evalAfterBest: 350 });
    expect(line).toMatch(/good move — it wins the pawn/);
    expect(line).toMatch(/something stronger/);
    expect(line).not.toMatch(/e7/);
  });
  it('is null when the move is not good, or not clearly weaker', () => {
    expect(goodButWeakerBeat({ fenBefore: fen, wrongSan: 'Nxc7+', evalAfterWrong: 40, evalAfterBest: 350 })).toBeNull();
    expect(goodButWeakerBeat({ fenBefore: fen, wrongSan: 'Nxc7+', evalAfterWrong: 330, evalAfterBest: 350 })).toBeNull();
  });
  it('reads the evals from the mover\'s side (Black)', () => {
    const b = 'r6k/8/8/8/3n4/8/2P1Q3/4K3 b - - 0 1';
    expect(goodButWeakerBeat({ fenBefore: b, wrongSan: 'Nxc2+', evalAfterWrong: -180, evalAfterBest: -350 })).toMatch(/good move/);
  });
});

describe('lineGainIdea — the point of a solved line (walk 2026-10-04 defect 10)', () => {
  it('names a loose target the line wins', () => {
    // Black queen on b4 has no defender; White's bishop takes it.
    const fen = '4k3/8/8/8/1q6/8/3B4/4K3 w - - 0 1';
    expect(lineGainIdea(fen, ['Bxb4'])).toMatch(/queen on b4 had no defender/);
  });
  it('is null when the line wins nothing', () => {
    expect(lineGainIdea('4k3/8/8/8/8/8/8/4K2R w - - 0 1', ['Rh7'])).toBeNull();
  });
});
