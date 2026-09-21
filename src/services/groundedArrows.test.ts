// G0 for arrows (David 2026-08-01): "it shouldn't decide. the narrations are
// grounded in the notes. whatever the notes say about squares are what get
// arrows."
//
// Arrows used to be scraped off the model's FINISHED prose, so the model chose
// what the student's eye was led to simply by choosing what to mention. These
// tests pin the inversion: when a note grounds the ply, the note's squares are
// the arrows and the prose's squares are not.
//
// This RUNS the shipped helper rather than typechecking it — `tsc --noEmit`
// reported green on a genuine ReferenceError earlier in this build, so a green
// typecheck is not evidence that a path executes.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { groundedSegmentArrows } from './openingGenerator';

/** Replay SANs from the start and describe the final move the way the
 *  generator's segment builder does. */
const play = (sans: string[]): { from: string; to: string; fen: string } => {
  const chess = new Chess();
  let last = { from: '', to: '' };
  for (const san of sans) {
    const m = chess.move(san);
    last = { from: m.from, to: m.to };
  }
  return { ...last, fen: chess.fen() };
};

const green = (r: ReturnType<typeof groundedSegmentArrows>): string[] =>
  r.arrows.filter((a) => a.color === 'green').map((a) => `${a.from}-${a.to}`);

const orange = (r: ReturnType<typeof groundedSegmentArrows>): string[] =>
  r.arrows.filter((a) => a.color === 'orange').map((a) => `${a.from}-${a.to}`);

describe('groundedSegmentArrows — the note decides, not the model', () => {
  // After 1.e4 e5 2.Nf3 Nc6 3.Bb5 it is Black to move. The note talks about
  // ...a6; the model's prose talks about a different move entirely.
  const move = play(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);

  it('draws the NOTE\'s move, not the one the prose names', () => {
    const r = groundedSegmentArrows(
      'Black kicks the bishop with a6 before committing anywhere else.',
      'White will follow up with d4 and take the centre.',
      move,
    );
    expect(r.source).toBe('note');
    expect(green(r)).toContain('a7-a6');
    // d4 is the model's idea, and it must not reach the board.
    expect(green(r)).not.toContain('d2-d4');
  });

  it('falls back to the prose when no note grounds the ply', () => {
    const r = groundedSegmentArrows(null, 'Black kicks the bishop with a6.', move);
    expect(r.source).toBe('prose');
    expect(green(r)).toContain('a7-a6');
  });

  it('treats an empty / whitespace note as ungrounded rather than as silence', () => {
    // A blank note must not blank the arrows — that would silently strip the
    // board on any ply whose note graded down to nothing.
    for (const blank of ['', '   ', '\n']) {
      const r = groundedSegmentArrows(blank, 'Black kicks the bishop with a6.', move);
      expect(r.source).toBe('prose');
      expect(green(r)).toContain('a7-a6');
    }
  });

  it('always keeps the orange trail on the move just played', () => {
    for (const note of ['Black kicks the bishop with a6.', null, '']) {
      expect(orange(groundedSegmentArrows(note, 'anything at all', move))).toEqual(['f1-b5']);
    }
  });

  it('draws nothing green when the note names no move', () => {
    const r = groundedSegmentArrows('This is the main tabiya of the whole opening.', 'White plays d4.', move);
    expect(r.source).toBe('note');
    expect(green(r)).toEqual([]);
  });

  it('never draws a note move that is illegal at THIS position (G3)', () => {
    // The note is keyed to an opening, so its prose can name a move that is
    // not available on the live board. It must resolve or draw nothing.
    const r = groundedSegmentArrows('The knight belongs on d5 after Nxd5.', 'x', move);
    expect(r.source).toBe('note');
    expect(green(r)).toEqual([]);
  });
});
