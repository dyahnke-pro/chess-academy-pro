import { describe, it, expect } from 'vitest';
import { drillWrongTryReason } from './coachDrillService';
import { refuteWrongTry } from './puzzleTeaching';

// ONE WRONG-TRY COMPUTER (wire-19, 2026-11-08). Learn's drill read a wrong try
// with its own one-ply scan (`drillReasons.wrongMoveReason`) while the puzzles
// read `puzzleTeaching.refuteWrongTry`. The drill now reads the puzzles'
// computer; with no engine line it reads the board's own answer, a mate in one
// first (the old no-line path of the one computer called Scholar's mate "comes
// with check and hits your knight on f6").
describe('a drill\'s wrong try is refuted by the one wrong-try computer', () => {
  it('a move that walks into mate in one says so, without the engine', async () => {
    // Scholar's mate is on: White threatens Qxf7#. …Nf6?? ignores it.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
    const r = await drillWrongTryReason(fen, 'Nf6', null);
    expect(r).toBe('Nf6? Then they play Qxf7# — they mate you.');
    // The puzzles hear the same line when their engine read fails.
    expect((await refuteWrongTry({ fenBefore: fen, wrongSan: 'Nf6', analyse: () => Promise.resolve(null) }))?.text).toBe(r);
    // Never the answer (…g6).
    expect(r).not.toMatch(/g6/);
  });
  it('a move that drops a piece names what they win', async () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2';
    expect(await drillWrongTryReason(fen, 'Ng5', null)).toBe('Ng5? Then they play Qxg5 — they win a knight.');
  });
  it('reads the judge\'s engine line when it has one', async () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 2';
    expect(await drillWrongTryReason(fen, 'Ng5', ['d8g5'])).toBe('Ng5? Then they play Qxg5 — they win a knight.');
  });
  it('says nothing when the board shows nothing concrete', async () => {
    expect(await drillWrongTryReason('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'a3', null)).toBeNull();
  });
});
