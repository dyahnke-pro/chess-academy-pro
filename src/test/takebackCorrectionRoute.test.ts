import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCoachMoveCommand } from '../services/coachMoveCommand';

// WO-0 — "take that back and play c6" undid the coach's move and then went
// silent: the generic command door undid it, saw `ok`, and returned before the
// correction branch (which undoes AND plays) was reached.
const SRC = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('a correction that names a move reaches the correction branch', () => {
  it('both command doors step aside for it', () => {
    expect(SRC).toMatch(/if \(routed && !correctionNamesAMove && \(routed\.kind === 'take_back_move'/);
    expect(SRC).toMatch(/if \(routed && !dictation && !correctionNamesAMove\)/);
  });

  it('the parser reads the tape phrase as a correction', () => {
    // After 1.e4 e5 the coach (Black) played …e5; the student asks for c6 instead.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const cmd = parseCoachMoveCommand('take that back and play c6', fen, 'black');
    expect(cmd?.corrects).toBe(true);
    expect(cmd?.san).toBe('c6');
  });

  it('a BARE takeback still takes back (negative control)', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(parseCoachMoveCommand('take that back', fen, 'black')?.corrects ?? false).toBe(false);
  });
});
