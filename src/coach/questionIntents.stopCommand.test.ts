// "Stop" is a command, not a question (David 2026-09-24: "User is in control").
import { describe, it, expect } from 'vitest';
import { isStopCommand, LETS_PLAY_RE } from './questionIntents';

describe('isStopCommand', () => {
  it.each(['stop', 'Stop!', 'wait', 'hold on', 'shh', 'ok stop talking', 'coach, be quiet', 'wait a sec', 'pause please', 'enough.'])('%s → stop', (t) => {
    expect(isStopCommand(t)).toBe(true);
  });
  it.each(['stop — why is Nf3 bad?', 'wait, what does that pin do?', "couldn't they just move their queen?", 'stop sign', 'hold on to the pawn?', ''])('NEGATIVE CONTROL: %s → a question, not a stop', (t) => {
    expect(isStopCommand(t)).toBe(false);
  });
});

describe('LETS_PLAY_RE — a play request survives punctuation and phone apostrophes', () => {
  it('matches the forms the prod tape and phones type', () => {
    for (const t of ["let's play, I'll be white", 'let’s play as black', "lets play!", "can we play the Caro", "let's play the Vienna"]) {
      expect(LETS_PLAY_RE.test(t), t).toBe(true);
    }
  });
  it('leaves the seat behind when the request is stripped', () => {
    expect("let's play, I'll be white".replace(LETS_PLAY_RE, ' ').replace(/\s+/g, ' ').trim()).toBe("I'll be white");
  });
  it('never takes "play through" (a walkthrough ask)', () => {
    expect(LETS_PLAY_RE.test("let's play through the Najdorf")).toBe(false);
  });
});
