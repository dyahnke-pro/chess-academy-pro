import { describe, it, expect } from 'vitest';
import { hasChessContentSignal, stripChessyStraySentences } from './coachApi';

// Phase 1 of the coach grounding build (RIP #2): the fall-through no longer
// calls a free LLM for chess. These two deterministic guards decide the lane —
// a chess turn goes to the computed default / stock line, a non-chess turn to
// the constrained conversational lane whose output is swept for stray chess.

describe('hasChessContentSignal', () => {
  it('flags explicit move/position questions as chess', () => {
    for (const q of [
      "what's the best move here?",
      'is Nf3 good?',
      'what about exd5?',
      'who is winning?',
      'what should I play?',
      'give me a plan',
      'is my knight hanging?',
      "what's the threat?",
      'how do masters play this?',
      'teach me the Caro-Kann', // "opening"-family vocab
      'is this a good trap?',
    ]) {
      expect(hasChessContentSignal(q), q).toBe(true);
    }
  });

  it('treats genuine non-chess conversation as non-chess', () => {
    for (const q of [
      'hi!',
      'thanks, that was helpful',
      'you rock',
      'how are you today?',
      'can you speak louder?',
      'what is your name?',
      'ok cool',
    ]) {
      expect(hasChessContentSignal(q), q).toBe(false);
    }
  });

  it('is empty-safe', () => {
    expect(hasChessContentSignal('')).toBe(false);
    expect(hasChessContentSignal('   ')).toBe(false);
  });
});

describe('stripChessyStraySentences', () => {
  it('drops sentences that stray into chess content', () => {
    const input = "You're doing great! Play Nf3 to develop. Keep it up.";
    const out = stripChessyStraySentences(input);
    expect(out).not.toMatch(/Nf3/);
    expect(out).toContain("You're doing great!");
    expect(out).toContain('Keep it up.');
  });

  it('drops stat / eval / masters-play claims', () => {
    expect(stripChessyStraySentences('Masters play this 55% of the time.')).toBe('');
    expect(stripChessyStraySentences('You are +2.3 here.')).toBe('');
    expect(stripChessyStraySentences('Grandmasters prefer the quiet line.')).toBe('');
  });

  it('keeps a clean conversational reply untouched', () => {
    const input = 'Anytime! Ask me whenever you want a hand.';
    expect(stripChessyStraySentences(input)).toBe(input);
  });

  it('returns empty when every sentence is chessy', () => {
    expect(stripChessyStraySentences('Play e4. Then Bc4. Then Qh5.')).toBe('');
  });

  it('never severs a directive marker', () => {
    const input = 'Nice work. [BOARD: arrow:e2-e4:green]';
    const out = stripChessyStraySentences(input);
    expect(out).toContain('[BOARD: arrow:e2-e4:green]');
  });
});
