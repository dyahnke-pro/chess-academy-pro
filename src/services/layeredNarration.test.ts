import { describe, it, expect } from 'vitest';
import { buildLayeredNarration, addsSomething } from './layeredNarration';

// Real text, taken from the measured overlap at the Ruy's third move — the
// position that decided the ordering. Using the actual lines rather than lorem
// keeps the dedupe honest about the vocabulary it will really see.
const RUY_NOTE =
  'White does not attack the pawn. White attacks its defender — the c6-knight. That is the soul of the Spanish: patient, indirect pressure.';
const RUY_CORPUS =
  "The bishop's fianchetto was ahead of its time, a modern idea. Taking back with the knight is second best.";
const RUY_COMPUTED = 'The bishop moves to b5, pinning nothing yet; the engine calls it level.';

describe('layeredNarration', () => {
  it('speaks note, then corpus, then computed', () => {
    const out = buildLayeredNarration(
      { note: RUY_NOTE, corpus: RUY_CORPUS, computed: RUY_COMPUTED },
      'full',
    );
    expect(out.pieces.map((p) => p.layer)).toEqual(['note', 'corpus', 'computed']);
    // The stacked line preserves that order in the spoken text too.
    expect(out.text.indexOf(RUY_NOTE)).toBeLessThan(out.text.indexOf(RUY_CORPUS));
    expect(out.text.indexOf(RUY_CORPUS)).toBeLessThan(out.text.indexOf(RUY_COMPUTED));
  });

  it('keeps a lone layer whichever one it is', () => {
    // 91% of plies have exactly one source; the stack must not require three.
    for (const [k, v] of Object.entries({ note: RUY_NOTE, corpus: RUY_CORPUS, computed: RUY_COMPUTED })) {
      const out = buildLayeredNarration({ [k]: v }, 'full');
      expect(out.pieces).toHaveLength(1);
      expect(out.text).toBe(v);
    }
  });

  it('drops a layer that repeats what was already said', () => {
    // The real risk at a shared position: two sources, one idea, said twice.
    const restated = 'The knight on c6 is the defender, and White pressures that defender rather than the pawn.';
    const out = buildLayeredNarration({ note: RUY_NOTE, corpus: restated }, 'full');
    expect(out.pieces.map((p) => p.layer)).toEqual(['note']);
    expect(out.dropped).toContain('corpus');
  });

  it('keeps a layer that genuinely adds', () => {
    const out = buildLayeredNarration({ note: RUY_NOTE, corpus: RUY_CORPUS }, 'full');
    expect(out.pieces.map((p) => p.layer)).toEqual(['note', 'corpus']);
    expect(out.dropped).toHaveLength(0);
  });

  it('brief takes computed alone, never the prose layers', () => {
    // G5 caps brief at 2 sentences / 30 words; a stack cannot fit and clipping
    // one mid-thought is worse than picking the register that fits.
    const out = buildLayeredNarration(
      { note: RUY_NOTE, corpus: RUY_CORPUS, computed: RUY_COMPUTED },
      'brief',
    );
    expect(out.pieces.map((p) => p.layer)).toEqual(['computed']);
    expect(out.text).toBe(RUY_COMPUTED);
  });

  it('brief with no computed layer stays silent rather than substituting prose', () => {
    const out = buildLayeredNarration({ note: RUY_NOTE, corpus: RUY_CORPUS }, 'brief');
    expect(out.text).toBe('');
    expect(out.pieces).toHaveLength(0);
  });

  it('silent says nothing at all', () => {
    const out = buildLayeredNarration(
      { note: RUY_NOTE, corpus: RUY_CORPUS, computed: RUY_COMPUTED },
      'silent',
    );
    expect(out.text).toBe('');
  });

  it('treats absent and blank layers identically', () => {
    const out = buildLayeredNarration({ note: '   ', corpus: null, computed: RUY_COMPUTED }, 'full');
    expect(out.pieces.map((p) => p.layer)).toEqual(['computed']);
  });

  describe('addsSomething', () => {
    it('rejects a rephrasing of the same point', () => {
      expect(addsSomething(
        'The knight on c6 defends the pawn on e5.',
        'The c6-knight is defending the e5-pawn.',
      )).toBe(false);
    });

    it('accepts a different idea that shares a word or two', () => {
      expect(addsSomething(
        'Castling kingside tucks the king away before the centre opens.',
        'The c6-knight is defending the e5-pawn.',
      )).toBe(true);
    });

    it('accepts anything when nothing has been said yet', () => {
      expect(addsSomething('Any line at all.', '')).toBe(true);
    });

    it('rejects text with no content words of its own', () => {
      // "and then the" is not teaching, and must never occupy a layer slot.
      expect(addsSomething('and then the', RUY_NOTE)).toBe(false);
    });
  });
});
