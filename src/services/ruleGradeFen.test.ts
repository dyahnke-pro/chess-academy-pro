import { describe, it, expect } from 'vitest';
import { buildVoicePackage } from './voicePackage';

describe('the rule behind the last move is graded on the board it describes (prod audit 2026-10-06)', () => {
  const afterD5 = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
  const afterExd5 = 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2';
  const text = 'd5 follows a rule worth keeping: open up the center — challenge their pawn on e4.';
  it('on the reply board it reads false and is dropped', () => {
    expect(buildVoicePackage([{ kind: 'computed', text, fen: afterExd5 }]).spoken).toBe('');
  });
  it('on the board right after …d5 it is true and speaks', () => {
    expect(buildVoicePackage([{ kind: 'computed', text, fen: afterD5 }]).spoken).toContain('challenge their pawn on e4');
  });
});
