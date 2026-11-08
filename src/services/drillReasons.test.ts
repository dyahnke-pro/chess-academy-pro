// drillReasons — drills that TEACH (WO-HOME-OPENING-01 A5): a wrong move gets
// the reason it fails, the solve plays the sequence and names the idea, the
// hint says the piece and withholds the square.
import { describe, it, expect } from 'vitest';
import { goodButWeakerBeat, hintBeat, judgeAlternative } from './drillReasons';

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
    expect(line).toMatch(/good move — it wins a pawn/);
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

describe('judgeAlternative — the engine decides, never the answer key alone', () => {
  // White to move; evals are white's view.
  const W = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
  // Black to move: a black student's +3 is -300 from white's view.
  const B = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

  it('accepts a move as good as the key (David 2026-10-05: axb5 at +14.9 was refused)', () => {
    expect(judgeAlternative({ fenBefore: W, evalAfterWrong: 1490, evalAfterBest: 1500 })).toBe('accept');
    expect(judgeAlternative({ fenBefore: W, evalAfterWrong: 1200, evalAfterBest: 1500 })).toBe('accept');
  });
  it('reads from the mover’s side', () => {
    expect(judgeAlternative({ fenBefore: B, evalAfterWrong: -800, evalAfterBest: -820 })).toBe('accept');
    expect(judgeAlternative({ fenBefore: B, evalAfterWrong: 300, evalAfterBest: -300 })).toBe('loses');
  });
  it('a forced mate in the key is not matched by a merely winning move', () => {
    expect(judgeAlternative({ fenBefore: W, evalAfterWrong: 1490, evalAfterBest: 30000 })).toBe('good-but-weaker');
  });
  it('only a move the engine says throws material away is a loss', () => {
    expect(judgeAlternative({ fenBefore: W, evalAfterWrong: -200, evalAfterBest: 300 })).toBe('loses');
    expect(judgeAlternative({ fenBefore: W, evalAfterWrong: 0, evalAfterBest: 90 })).toBe('weaker');
  });
});
