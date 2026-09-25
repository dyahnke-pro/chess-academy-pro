import { Chess } from 'chess.js';
import { describe, it, expect } from 'vitest';
import { parseCoachMoveCommand } from './coachMoveCommand';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// After 1.d4 Nf6 2.c4 — Black to move.
const AFTER_C4 = 'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKB1R b KQkq - 0 2';

describe('parseCoachMoveCommand', () => {
  it('parses "play d4" at the start (the Benko case)', () => {
    const cmd = parseCoachMoveCommand('play d4', START);
    expect(cmd).not.toBeNull();
    expect(cmd!.san).toBe('d4');
    expect(cmd!.playableNow).toBe(true);
  });

  it('parses spoken piece-word form: "you play knight to f3"', () => {
    const cmd = parseCoachMoveCommand('you play knight to f3', START);
    expect(cmd?.san).toBe('Nf3');
  });

  it('parses a coach-side move while it is the student\'s turn (flipped board)', () => {
    // Black to move; "play e4" is a WHITE move — parses on the flipped board.
    const cmd = parseCoachMoveCommand('play Nc3', AFTER_C4);
    expect(cmd).not.toBeNull();
    expect(cmd!.san).toBe('Nc3');
    expect(cmd!.playableNow).toBe(false);
  });

  it('handles polite prefixes: "ok now play d4"', () => {
    expect(parseCoachMoveCommand('ok now play d4', START)?.san).toBe('d4');
  });

  it('never treats a move REPORT as a command', () => {
    expect(parseCoachMoveCommand('I played d4', START)).toBeNull();
    expect(parseCoachMoveCommand('I just played e4. Your move.', START)).toBeNull();
  });

  it('never treats an opening request as a command', () => {
    expect(parseCoachMoveCommand('play the Benko Gambit', START)).toBeNull();
    expect(parseCoachMoveCommand("let's play the Italian", START)).toBeNull();
    expect(parseCoachMoveCommand('teach me the Vienna', START)).toBeNull();
  });

  it('never treats a question as a command', () => {
    expect(parseCoachMoveCommand('should I play d4?', START)).toBeNull();
    expect(parseCoachMoveCommand('can you play d4?', START)).toBeNull();
  });

  it('parses a black reply dictated at the start as a flipped-board pending move', () => {
    const cmd = parseCoachMoveCommand('play d5', START);
    expect(cmd?.san).toBe('d5');
    expect(cmd?.playableNow).toBe(false);
  });

  it('rejects an illegal dictated move', () => {
    expect(parseCoachMoveCommand('play Ke2', START)).toBeNull(); // illegal on both sides
  });
});

// ── CORRECTING THE MOVE JUST PLAYED (David 2026-09-17) ────────────────────────
// "i want all three options available to the user": play it now, queue it for
// next, or take the last one back and replace it. Only the phrasing tells the
// three apart, so the phrasing is what is pinned here.
describe('correction intent', () => {
  const AFTER_1E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

  it('"no, play Nc3 instead" is a CORRECTION, not a queued move', () => {
    const cmd = parseCoachMoveCommand('no, play Nc3 instead', AFTER_1E4);
    expect(cmd?.san).toBe('Nc3');
    expect(cmd?.corrects).toBe(true);
  });

  it('"take that back and play Nc3" is a correction', () => {
    const cmd = parseCoachMoveCommand('take that back and play Nc3', AFTER_1E4);
    expect(cmd?.san).toBe('Nc3');
    expect(cmd?.corrects).toBe(true);
  });

  it('a trailing "instead" alone marks the correction', () => {
    expect(parseCoachMoveCommand('play Nc3 instead', AFTER_1E4)?.corrects).toBe(true);
  });

  it('a PLAIN dictation is NOT a correction — it still queues the next reply', () => {
    const cmd = parseCoachMoveCommand('play Nc3', AFTER_1E4);
    expect(cmd?.san).toBe('Nc3');
    expect(cmd?.corrects).toBe(false);
  });

  it('spoken form survives the correction wrapper', () => {
    const cmd = parseCoachMoveCommand('no, play knight to c3 instead', AFTER_1E4);
    expect(cmd?.san).toBe('Nc3');
    expect(cmd?.corrects).toBe(true);
  });

  it('a correction naming an ILLEGAL move still parses as nothing', () => {
    expect(parseCoachMoveCommand('no, play Nc9 instead', AFTER_1E4)).toBeNull();
  });

  // STACKED corrections — the shape a person actually says, and the shape this
  // missed. "no, take that back and play Nc3" is David's own wording for the
  // feature; one strip pass removed "no, ", left "take that back and play Nc3",
  // found no verb and returned NULL. The sentence then went to the brain, whose
  // take_back TOOL undid the coach's move and played nothing — so the board
  // looked exactly like a half-run correction and the prod audit read it as a
  // broken branch rather than a parse miss.
  it.each([
    'no, take that back and play Nc3',
    'take that back and play Nc3',
    'no, take it back and play Nc3',
    'undo and play Nc3',
    'wait, no, play Nc3 instead',
    'actually take that back and play Nc3 instead',
  ])('parses the stacked correction %j', (text) => {
    const cmd = parseCoachMoveCommand(text, AFTER_1E4);
    expect(cmd?.san).toBe('Nc3');
    expect(cmd?.corrects).toBe(true);
  });

  it('a bare takeback with NO move named is not a move command', () => {
    // It is a takeback request for the brain's tool, not a dictation — parsing
    // it as a command would swallow the tool call.
    expect(parseCoachMoveCommand('no, take that back', AFTER_1E4)).toBeNull();
    expect(parseCoachMoveCommand('undo', AFTER_1E4)).toBeNull();
  });
});

describe('parseCoachMoveCommand — a reply that only exists after the student moves', () => {
  it('"play Qxd5" before exd5 is armed (nothing on d5 to take yet)', () => {
    // 1.e4 d5 — White to move; Qxd5 only becomes legal after 2.exd5.
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
    const cmd = parseCoachMoveCommand('play Qxd5', fen);
    expect(cmd?.san).toBe('Qxd5');
    expect(cmd?.playableNow).toBe(false);
  });
  it('NEGATIVE CONTROL: a move no reply can ever reach arms nothing', () => {
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
    expect(parseCoachMoveCommand('play Qh1', fen)).toBeNull();
  });
});

describe('parseCoachMoveCommand — the coach\'s side is read first on the student\'s turn', () => {
  // Naroditsky's Scandinavian, after 5...Bg4 — White to move. "play c6" was
  // parsed as White's Bc6+ (legal on this board) instead of Black's pawn.
  const board = new Chess();
  for (const m of ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'g3', 'Nf6', 'Bg2', 'Bg4']) board.move(m);
  it('"play c6" arms Black\'s pawn, not White\'s bishop check', () => {
    const cmd = parseCoachMoveCommand('play c6', board.fen(), 'black');
    expect(cmd?.san).toBe('c6');
    expect(cmd?.playableNow).toBe(false);
  });
  it('NEGATIVE CONTROL: without the coach\'s colour the old reading returns', () => {
    expect(parseCoachMoveCommand('play c6', board.fen())?.san).toBe('Bc6+');
  });
  it('the game-start hand-over still works ("you play d4" gives the coach White)', () => {
    const cmd = parseCoachMoveCommand('you play d4', new Chess().fen(), 'black');
    expect(cmd?.san).toBe('d4');
    expect(cmd?.playableNow).toBe(true);
  });
});

