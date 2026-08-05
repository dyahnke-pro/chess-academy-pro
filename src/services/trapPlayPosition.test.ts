// The trap play-out must hand the student the position they can still learn
// from — the mistake on the board, the punishment NOT yet played.
//
// Two ways to get it wrong, both of which destroy the exercise: start a ply
// early and the student plays the opponent's blunder; start a ply late and the
// board already shows the move the whole lesson was about.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { trapPlayPosition } from './trapPlayPosition';
import type { PunishLesson } from '../types/walkthroughTree';

const base = (over: Partial<PunishLesson>): PunishLesson => ({
  name: 'test', setupMoves: [], inaccuracy: '', punishment: '',
  whyBad: '', whyPunish: '', distractors: [], ...over,
});

describe('trapPlayPosition', () => {
  it('stops on the student to move, with the mistake played', () => {
    // Légal-ish shape: Black's ...Nge7?? and White's Bxf7+ answer. What matters
    // is that we hand back the board BEFORE Bxf7+, with White to move.
    const lesson = base({
      setupMoves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'],
      inaccuracy: 'Nf6',
      punishment: 'Qxf7#',
    });
    const spot = trapPlayPosition(lesson);
    expect(spot).not.toBeNull();
    expect(spot?.studentColor).toBe('white');

    const chess = new Chess(spot?.fen);
    expect(chess.turn(), 'the student must be the side to move').toBe('w');
    // The mistake is on the board…
    expect(chess.get('f6')?.type, 'the inaccuracy must already be played').toBe('n');
    // …and the punishment is still available to find.
    expect(chess.moves().includes('Qxf7#')).toBe(true);
  });

  it('replays a puzzle-derived lesson from its own setupFen', () => {
    // setupMoves on these is context, not a path from the start — replaying it
    // would throw. The FEN is the only legal starting point.
    // Scholar's-mate shape with the queen already on h5, Black to move.
    const setupFen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 4 3';
    const spot = trapPlayPosition(base({
      setupFen,
      setupMoves: ['this', 'is', 'not', 'a', 'legal', 'path'],
      inaccuracy: 'Nf6',
      punishment: 'Qxf7#',
    }));
    expect(spot?.studentColor, 'side comes from the FEN, not the opening').toBe('white');
    expect(new Chess(spot?.fen).moves().includes('Qxf7#')).toBe(true);
  });

  it('returns null rather than a guessed position when the moves do not replay', () => {
    // The leaf hides the button on null. Offering a play-out from a position we
    // could not reconstruct would drop the student somewhere arbitrary.
    expect(trapPlayPosition(base({ setupMoves: ['e4'], inaccuracy: 'Qh8' }))).toBeNull();
    expect(trapPlayPosition(base({ setupMoves: ['zz'], inaccuracy: 'e5' }))).toBeNull();
    expect(trapPlayPosition(base({ inaccuracy: '' }))).toBeNull();
    expect(trapPlayPosition(null)).toBeNull();
  });

  it('reads the student side off the board, not off the opening colour', () => {
    // A puzzle-derived trap can sit on either side. After White's slip it is
    // BLACK who punishes, whatever colour the opening is filed under.
    const spot = trapPlayPosition(base({
      setupMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Nxe5'],
      inaccuracy: 'Nxe5',
      punishment: 'd4',
    }));
    expect(spot?.studentColor).toBe('white');
  });
});
