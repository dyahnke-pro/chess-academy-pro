import { describe, expect, it } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';

// THE BETTER MOVE'S BOARD REASON SURVIVES THE ONE CAPTURE WORDING (review of
// the capture-once fix, 2026-10-31). The board half drops a reason that is
// only the capture's own lead — a trade is the move's first job, never why it
// beats another move. When the capture wording moved into `captureWords`, the
// material a winning capture nets and the capture's lead became the same
// words, so the drop swallowed "it would win a pawn" too: 126 of the 158
// winning-capture reasons on 12 master games went silent. Only a capture that
// wins nothing is dropped.
describe('betterMoveReason: a winning capture keeps its reason; a trade does not', () => {
  it('Nxd4 after …exd4 with nothing to take back: it would win a pawn', () => {
    const fen = 'rnbqkbnr/pp1p1ppp/4p3/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4';
    expect(betterMoveReason(fen, 'Nc3', 'Nxd4', [], 'white', null, false)).toBe('it would win a pawn, and nothing can take back');
  });

  it('exd5 that the queen takes back is a trade: no board reason', () => {
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(betterMoveReason(fen, 'Nc3', 'exd5', [], 'white', null, false)).toBeNull();
  });
});
