import { describe, expect, it } from 'vitest';
import { PLAY_OPENING_RE, resolvePlayName } from './playName';

describe('resolvePlayName — the real "play X" requests', () => {
  it.each([
    ['Sicilian', 'Sicilian Defense'],
    ['Caro khan', 'Caro-Kann Defense'],
    ['Carro Khan', 'Caro-Kann Defense'],
    ['scandi', 'Scandinavian Defense'],
  ])('"%s" resolves to %s', (q, want) => {
    const r = resolvePlayName(q);
    expect(r.kind).toBe('resolved');
    if (r.kind === 'resolved') expect(r.name).toBe(want);
  });

  it.each(["Let's do it", "Can you Carl O'Connor", 'Dammit', 'Books'])('"%s" never starts a game', (q) => {
    expect(resolvePlayName(q).kind).not.toBe('resolved');
  });
});

describe('PLAY_OPENING_RE', () => {
  it.each(['Play the Sicilian', 'Play Sicilian now', 'Can you play the Caro khan?', 'Play the Carro Khan'])('"%s" is a request to play an opening', (q) => {
    expect(PLAY_OPENING_RE.test(q)).toBe(true);
  });
  it.each(['Can you play f4 instead?', 'play e4', 'Play it out', 'play through the Vienna', 'Can I play Nf3?', 'Keep playing the line out'])('"%s" is not', (q) => {
    expect(PLAY_OPENING_RE.test(q)).toBe(false);
  });
});
