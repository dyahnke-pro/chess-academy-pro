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
