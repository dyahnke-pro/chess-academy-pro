import { describe, expect, it } from 'vitest';
import { buildSsmlForEngine } from './ssml';

describe('buildSsmlForEngine prosody modes', () => {
  const rateOf = (ssml: string): number => Number(/rate="(\d+)%"/.exec(ssml)?.[1]);
  it('critical slows the neural rate below the base; spike lifts it', () => {
    const base = rateOf(buildSsmlForEngine('Hi.', 'neural'));
    expect(rateOf(buildSsmlForEngine('Hi.', 'neural', undefined, 'critical'))).toBe(base - 8);
    expect(rateOf(buildSsmlForEngine('Hi.', 'neural', undefined, 'spike'))).toBe(base + 8);
  });
  it('generative voices take no prosody', () => {
    expect(buildSsmlForEngine('Hi.', 'generative', undefined, 'critical')).toBe('<speak><p>Hi.</p></speak>');
  });
});
