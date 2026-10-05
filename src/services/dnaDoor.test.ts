import { describe, expect, it } from 'vitest';
import { decideTurn } from './learnTurnDoor';
import { buildVoicePackage, stripMoveNumbers } from './voicePackage';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

describe('the DNA outline at the door', () => {
  it('rule 7 — a move-number prefix is rephrased away, the move kept', () => {
    expect(stripMoveNumbers('After 3.Bb5 the pin is on, and 3...a6 asks it.')).toBe('After Bb5 the pin is on, and …a6 asks it.');
    expect(stripMoveNumbers('Worth 1.5 pawns, played in 12. of the games.')).toBe('Worth 1.5 pawns, played in 12. of the games.');
  });

  it('praise and interface talk never reach the voice; teaching that uses the word "good" does', () => {
    const pkg = buildVoicePackage([
      { kind: 'computed', text: 'Great move! The knight is safe.', fen: FEN },
      { kind: 'computed', text: 'Tap the button to continue.', fen: FEN },
      { kind: 'computed', text: 'The knight on f3 is the only good move defender of e5.', fen: FEN },
    ]);
    expect(pkg.dropped.map((d) => d.reason)).toEqual(expect.arrayContaining(['dna: praise', 'dna: interface talk']));
    expect(pkg.spoken).not.toMatch(/Great move|Tap/);
  });

  // DANGER FIRST (David 2026-10-05): the threat now opens the turn; the rest
  // keep the DNA beat — what the move does, then its cost.
  it('the beat order: danger first, then what the move does, then its cost', () => {
    const d = decideTurn([
      { lane: 'threat', text: 'Their knight on c6 hits the pawn on e5.', fen: FEN, squares: ['c6', 'e5'] },
      { lane: 'mistake', text: 'The knight on f3 left the pawn on e5 short of a defender.', fen: FEN, squares: ['f3', 'e5'] },
      { lane: 'movePoint', text: 'The knight on f3 attacks the pawn on e5.', fen: FEN, squares: ['f3', 'e5'] },
    ]);
    const s = d.pkg.spoken;
    expect(s.indexOf('attacks the pawn')).toBeLessThan(s.indexOf('short of a defender'));
    expect(s.indexOf('Their knight on c6')).toBeLessThan(s.indexOf('attacks the pawn'));
  });
});

describe('a definition never stands alone', () => {
  it('drops "Remember — …" when the fact it explains was already said', () => {
    const pin = 'Your rook on e2 pins their bishop on e6 against their king on e8.';
    const board = '4k3/8/4b3/8/8/8/4R3/4K3 w - - 0 1';
    const pkg = buildVoicePackage([
      { kind: 'computed', text: `${pin} Remember — a pin freezes the piece in front: it can't move without exposing the more valuable piece behind it.`, fen: board },
    ], pin);
    expect(pkg.spoken).toBe('');
  });
  it('keeps it when the fact is new', () => {
    const board = '4k3/8/4b3/8/8/8/4R3/4K3 w - - 0 1';
    const pkg = buildVoicePackage([
      { kind: 'computed', text: 'Your rook on e2 pins their bishop on e6 against their king on e8. Remember — a pin freezes the piece in front.', fen: board },
    ]);
    expect(pkg.spoken).toMatch(/Remember — a pin freezes/);
  });
});
