import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { theirMoveKey, theirMoveKit, theirMovePrompt, theirMoveReason, theirMoveWrongTapLine, withTheirMove } from './thinkingTheirMoveStep';

// Before: White knight c3, bishop on f4; Black bishop on c8. Black plays …Bg4? no —
// keep it simple: Black's bishop moves c8→g4, attacking White's queen on d1? use
// a direct attack: Black rook a8 → a3 attacks the White knight on c3.
const BEFORE = 'r3k3/8/8/8/8/2N5/8/4K3 b - - 0 1';
const c = new Chess(BEFORE);
c.move('Ra3');
const AFTER = c.fen();

describe('step 2 — what did their move change', () => {
  it('the key is what their move attacks NOW that it did not before', () => {
    expect(theirMoveKey(AFTER, BEFORE)?.key).toEqual(['c3']);
  });
  it('without the board before their move there is no question', () => {
    expect(theirMoveKey(AFTER, undefined)).toBeNull();
  });
  it('a candidate without the opponent\'s real move is dropped; with it, the lead names the move', () => {
    expect(withTheirMove({ fen: AFTER, origin: 'puzzle' })).toBeNull();
    const w = withTheirMove({ fen: AFTER, origin: 'game', prevSan: 'Ra3', beforeFen: BEFORE });
    expect(w?.lead).toMatch(/rook to a3/);
    expect(theirMoveKit().keyFor(AFTER, w!)?.key).toEqual(['c3']);
  });
  it('names who attacks it', () => {
    expect(theirMoveReason(AFTER, 'c3')).toMatch(/knight on c3 is attacked now — by their rook/);
  });
  it('a wrong tap names the method', () => {
    expect(theirMoveWrongTapLine(AFTER, 'a3')).toMatch(/theirs/);
    expect(theirMoveWrongTapLine(AFTER, 'h5')).toMatch(/empty square/);
  });
  it('the prompt never says how many', () => {
    for (let i = 0; i < 2; i++) expect(theirMovePrompt(i)).not.toMatch(/\d|one more|two|three/i);
  });
});
