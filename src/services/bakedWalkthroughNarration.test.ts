import { describe, it, expect, vi } from 'vitest';

vi.mock('../data/walkthrough-narrations.json', () => ({
  default: {
    generatedAt: '2026-07-30',
    narrations: {
      'latvian gambit': {
        openingName: 'Latvian Gambit',
        spine: ['e4', 'e5', 'Nf3', 'f5'],
        sourceVideos: ['yt:abc'],
        intro: 'The gambit that dares White to refute it.',
        shortIntro: 'A romantic f5 gambit.',
        outro: 'Play it out.',
        ideas: [
          { text: 'e4 stakes the center.', shortText: 'e4 — center.' },
          { text: 'e5 answers symmetrically.', shortText: 'e5 — mirror.' },
          { text: 'Nf3 hits e5.', shortText: 'Nf3 attacks e5.' },
          { text: 'f5 — the Latvian, an f-pawn lunge.', shortText: 'f5 — the gambit.' },
        ],
      },
    },
  },
}));

import { bakedNarrationFor } from './bakedWalkthroughNarration';

describe('bakedNarrationFor', () => {
  it('hits when the name matches and the baked spine covers the runtime spine', () => {
    const hit = bakedNarrationFor('Latvian Gambit', ['e4', 'e5', 'Nf3', 'f5']);
    expect(hit?.intro).toContain('dares White');
    expect(hit?.ideas).toHaveLength(4);
  });

  it('hits on a shorter runtime spine (baked prefix-covers it)', () => {
    expect(bakedNarrationFor('Latvian Gambit', ['e4', 'e5', 'Nf3'])).not.toBeNull();
  });

  it('normalizes the name (case / punctuation)', () => {
    expect(bakedNarrationFor('latvian   gambit!', ['e4', 'e5'])).not.toBeNull();
  });

  it('MISSES when the runtime spine diverges — a name match on a different line never narrates it', () => {
    expect(bakedNarrationFor('Latvian Gambit', ['e4', 'e5', 'Bc4', 'f5'])).toBeNull();
  });

  it('MISSES when the runtime spine runs deeper than the bake', () => {
    expect(bakedNarrationFor('Latvian Gambit', ['e4', 'e5', 'Nf3', 'f5', 'Nxe5'])).toBeNull();
  });

  it('misses unknown openings', () => {
    expect(bakedNarrationFor('Grob Attack', ['g4'])).toBeNull();
  });
});
