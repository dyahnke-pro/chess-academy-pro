import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { moveOrderArrows, moveOrderOffsets } from './moveOrderArrows';

describe('the board walks the line the note recites', () => {
  it('draws dt-48c — the note that reached prod unbaked', () => {
    // "In the Englund Gambit, after d4 e5 dxe5 Nc6 Nf3, Black's main tricky
    // move is Qe7…" — four plies a beginner otherwise holds in their head from
    // audio. This is the note David heard; it is the reason the gate changed.
    const a = moveOrderArrows(
      "In the Englund Gambit, after d4 e5 dxe5 Nc6 Nf3, Black's main tricky move is Qe7, attacking the e5 pawn.",
      new Chess().fen(),
    );
    expect(a.map((x) => x.san)).toEqual(['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7']);
    expect(a[0]).toMatchObject({ from: 'd2', to: 'd4', order: 1, color: 'w' });
    expect(a[2]).toMatchObject({ from: 'd4', to: 'e5', color: 'w' });
    // Order is the reveal sequence, so it must be dense and 1-based.
    expect(a.map((x) => x.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('stops at the first token that is not legal from here', () => {
    // A note routinely names moves from MORE THAN ONE line ("if Black plays
    // Bf4 … after Qb4+ Bd2"). Skipping an illegal token and carrying on would
    // splice two variations into one sequence and present it as the move order.
    const a = moveOrderArrows('d4 e5 Qh8 Nc6 Nf3', new Chess().fen());
    expect(a.map((x) => x.san)).toEqual(['d4', 'e5']);
  });

  it('never turns a bare square into an arrow', () => {
    // "the e5 pawn" names a square, not a move. Drawing it would invent a move
    // the note never made.
    expect(moveOrderArrows('The e5 pawn and the d4 square matter here.', new Chess().fen())).toEqual([]);
  });

  it('says nothing when only one move is named', () => {
    // One move is the move being played — already drawn by the surface's own
    // highlight. A sequence needs at least two.
    expect(moveOrderArrows('White should answer with d4 here.', new Chess().fen())).toEqual([]);
  });

  it('replays from the ANCHOR position, not the start', () => {
    const b = new Chess();
    for (const m of ['e4', 'c5']) b.move(m);
    const a = moveOrderArrows('Then Nf3 d6 d4 follows.', b.fen());
    expect(a.map((x) => x.san)).toEqual(['Nf3', 'd6', 'd4']);
    expect(a[0]).toMatchObject({ from: 'g1', to: 'f3' });
  });

  it('marks whose move each one is', () => {
    const a = moveOrderArrows('d4 e5 dxe5 Nc6', new Chess().fen());
    expect(a.map((x) => x.color)).toEqual(['w', 'b', 'w', 'b']);
  });

  it('caps the walk so one note cannot paint the whole board', () => {
    const a = moveOrderArrows('e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7', new Chess().fen(), 4);
    expect(a).toHaveLength(4);
  });

  it('offsets track where each move is SAID, for lead-the-eye reveal', () => {
    const text = 'After d4 e5 the point is dxe5.';
    const offs = moveOrderOffsets(text);
    expect(offs).toHaveLength(3);
    expect(text.slice(offs[0], offs[0] + 2)).toBe('d4');
    expect(text.slice(offs[2], offs[2] + 4)).toBe('dxe5');
  });

  it('is silent on junk rather than guessing', () => {
    expect(moveOrderArrows('', new Chess().fen())).toEqual([]);
    expect(moveOrderArrows('d4 e5', 'not-a-fen')).toEqual([]);
  });
});
