import { describe, it, expect } from 'vitest';
import { WELCOME_MESSAGES, getRandomWelcome } from './welcomeMessages';

describe('welcomeMessages', () => {
  it('has at least 10 unique messages', () => {
    const unique = new Set(WELCOME_MESSAGES);
    expect(unique.size).toBeGreaterThanOrEqual(10);
    expect(unique.size).toBe(WELCOME_MESSAGES.length);
  });

  it('getRandomWelcome returns a message from the pool', () => {
    const msg = getRandomWelcome();
    expect(WELCOME_MESSAGES).toContain(msg);
  });

  it('getRandomWelcome avoids the lastUsed message', () => {
    const lastUsed = WELCOME_MESSAGES[0];
    // Run multiple times to be confident
    for (let i = 0; i < 50; i++) {
      const msg = getRandomWelcome(lastUsed);
      expect(msg).not.toBe(lastUsed);
    }
  });

  it('getRandomWelcome works when lastUsed is not in pool', () => {
    const msg = getRandomWelcome('not a real message');
    expect(WELCOME_MESSAGES).toContain(msg);
  });
});
