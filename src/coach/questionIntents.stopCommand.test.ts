// "Stop" is a command, not a question (David 2026-09-24: "User is in control").
import { describe, it, expect } from 'vitest';
import { isStopCommand } from './questionIntents';

describe('isStopCommand', () => {
  it.each(['stop', 'Stop!', 'wait', 'hold on', 'shh', 'ok stop talking', 'coach, be quiet', 'wait a sec', 'pause please', 'enough.'])('%s → stop', (t) => {
    expect(isStopCommand(t)).toBe(true);
  });
  it.each(['stop — why is Nf3 bad?', 'wait, what does that pin do?', "couldn't they just move their queen?", 'stop sign', 'hold on to the pawn?', ''])('NEGATIVE CONTROL: %s → a question, not a stop', (t) => {
    expect(isStopCommand(t)).toBe(false);
  });
});
