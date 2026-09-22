/**
 * REPAIR OR EXPLAIN — the real PGN shapes a stored game can have (WO-STANDARD-01 H3).
 *
 * Every shape below is one the app has actually persisted: the chess.js
 * `pgn()` of a Learn game that began from a lesson position (with the
 * [SetUp]/[FEN] header), the pre-2026-09-03 headerless `history.join(' ')` of
 * the same game, a chess.com odds game, and a sample game carrying an illegal
 * move mid-line. The contract: a header row replays FROM its header; a broken
 * later move keeps the legal prefix and says so; nothing ever answers with a
 * blank.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { replayGamePgn, movetextTokens, startFenFromHeaders, STANDARD_START_FEN } from './gamePgnReplay';

const LEAF = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const LABEL = 'Your Learn with Coach game from 2026-09-02 (teach-1788396074396)';

function learnGamePgns(): { withHeader: string; headerless: string } {
  const c = new Chess(LEAF);
  for (const m of ['a6', 'Ba4', 'Nf6', 'O-O', 'Be7']) c.move(m);
  return { withHeader: c.pgn(), headerless: c.history().join(' ') };
}

describe('replayGamePgn', () => {
  it('a Learn game saved with its [FEN] header replays FROM that position', () => {
    const { withHeader } = learnGamePgns();
    const r = replayGamePgn(withHeader, LABEL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.startFen).toBe(LEAF);
    expect(r.sans).toEqual(['a6', 'Ba4', 'Nf6', 'O-O', 'Be7']);
    expect(r.repair).toBeNull();
  });

  it('a [FEN] header WITHOUT [SetUp] still replays from the header — the parser is not the judge', () => {
    const { withHeader } = learnGamePgns();
    const r = replayGamePgn(withHeader.replace(/\[SetUp "1"\]\n/, ''), LABEL);
    expect(r.ok && r.startFen).toBe(LEAF);
  });

  it('the pre-fix headerless Learn game FAILS with a sentence naming the game and the move', () => {
    const { headerless } = learnGamePgns();
    const r = replayGamePgn(headerless, LABEL);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain(LABEL);
    expect(r.reason).toContain('a6');
    expect(r.reason).toMatch(/lesson position that was not saved/);
  });

  it('an illegal move MID-line is REPAIRED to the legal prefix, and the note says where', () => {
    // sample-london-amateur-3 shipped with an illegal move partway; the
    // student should still see the game up to it, not a blank.
    const r = replayGamePgn('1. e4 e5 2. Nf3 Nc6 3. Qxe5 Nxe5', 'Your game A vs B from 2026-01-01');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.startFen).toBe(STANDARD_START_FEN);
    expect(r.sans).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(r.repair?.droppedFromPly).toBe(4);
    expect(r.repair?.san).toBe('Qxe5');
    expect(r.repair?.note).toMatch(/cut short at move 3 \(White's Qxe5/);
    expect(r.repair?.note).toContain('Your game A vs B');
  });

  it('a chess.com odds game (knights removed) replays its 3.O-O from the header board', () => {
    const odds = [
      '[SetUp "1"]',
      '[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKB1R w KQkq - 0 1"]',
      '',
      '1. e4 e5 2. Bc4 Qe7 3. O-O Nc6 4. Kh1 Nf6 5. f4 d6 1-0',
    ].join('\n');
    const r = replayGamePgn(odds, 'Your game Knight_Mare_01 vs jkern1013');
    expect(r.ok && r.sans.length).toBe(10);
    expect(r.ok && r.repair).toBeNull();
  });

  it('a plain standard game replays whole, result marker and all', () => {
    const r = replayGamePgn('1. e4 e5 2. Nf3 *', 'Your game');
    expect(r.ok && r.sans).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('an empty movetext is explained, not blank', () => {
    const r = replayGamePgn('[Event "?"]\n\n*', 'Your game X vs Y');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Your game X vs Y has no moves recorded/);
  });

  it('NEGATIVE CONTROL — the sentence is never the generic one', () => {
    const { headerless } = learnGamePgns();
    const r = replayGamePgn(headerless, LABEL);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).not.toMatch(/^We could not replay this game/);
  });
});

describe('the helpers', () => {
  it('movetextTokens strips headers, numbers, comments, NAGs and results', () => {
    expect(movetextTokens('[X "y"]\n\n1. e4 {best} e5 $1 2. Nf3 (2. Nc3) Nc6 1/2-1/2')).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(movetextTokens('3... a6 4. Ba4')).toEqual(['a6', 'Ba4']);
  });
  it('startFenFromHeaders reads the header and returns null without one', () => {
    expect(startFenFromHeaders(`[FEN "${LEAF}"]`)).toBe(LEAF);
    expect(startFenFromHeaders('1. e4')).toBeNull();
  });
});
