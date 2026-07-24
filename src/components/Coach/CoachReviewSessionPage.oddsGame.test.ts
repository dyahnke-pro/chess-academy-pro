import { describe, it, expect } from 'vitest';
import { adaptGameRecord } from './CoachReviewSessionPage';
import { replayPgnToFens } from '../../services/gameAnalysisService';
import type { GameRecord } from '../../types';

// Regression: the two-knights-ODDS game chesscom-996944614 crashed the review
// with "Invalid move: O-O" (prod, 2026-07-20 → 2026-07-24). Its PGN starts from
// a custom `[SetUp]`/`[FEN]` position with the knights removed, so 3.O-O is
// legal only on that board. Any code that replayed the SANs from a fresh
// STANDARD board (a knight still on g1) threw uncaught. Both the review adapter
// and the analysis FEN-builder must honor the starting FEN.
const ODDS_PGN = [
  '[Event "Let\'s Play!"]',
  '[Site "Chess.com"]',
  '[White "Knight_Mare_01"]',
  '[Black "jkern1013"]',
  '[Result "1-0"]',
  '[SetUp "1"]',
  '[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKB1R w KQkq - 0 1"]',
  '',
  '1. e4 e5 2. Bc4 Qe7 3. O-O Nc6 4. Kh1 Nf6 5. f4 d6 1-0',
].join('\n');

function makeGame(pgn: string): GameRecord {
  return {
    id: 'chesscom-996944614',
    pgn,
    white: 'Knight_Mare_01',
    black: 'jkern1013',
    result: '1-0',
    date: '2026.07.09',
    source: 'chesscom',
  } as unknown as GameRecord;
}

describe('review of a two-knights-odds game (custom [SetUp] FEN)', () => {
  it('adaptGameRecord replays every ply without throwing "Invalid move: O-O"', () => {
    const adapted = adaptGameRecord(makeGame(ODDS_PGN), 'white');
    expect(adapted).not.toBeNull();
    // 10 plies through 5...d6 — the walk must NOT truncate at 3.O-O.
    expect(adapted!.moves.length).toBe(10);
    expect(adapted!.moves.some((m) => m.san === 'O-O')).toBe(true);
  });

  it('replayPgnToFens returns the full FEN chain (never truncates at the odds castle)', () => {
    const { fens, moves } = replayPgnToFens(ODDS_PGN);
    expect(moves.length).toBe(10);
    expect(fens.length).toBe(11); // start + one per ply
    // The first FEN is the ODDS start (no knights), not the standard board.
    expect(fens[0]).toContain('R1BQKB1R');
  });
});
