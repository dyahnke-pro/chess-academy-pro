import { describe, expect, it } from 'vitest';
import { buildVoicePackage, spokenSentenceKeys } from './voicePackage';
import { familyLabel } from './openingStory';

// Prod Learn audit 2026-10-20: the branch-choice beat's head was a repeat and
// went; the student heard its tail alone ("The Modern is a position built
// around a fianchettoed bishop on the long diagonal.").
const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const HEAD = 'You chose the Najdorf.';
const BEAT = `${HEAD} The Modern Variation is a position built around a fianchettoed bishop; yours is built around a queenside pawn push.`;

describe('a fact speaks with its head or not at all', () => {
  it('drops the whole fact when its first sentence was already said', () => {
    const prior = new Set(spokenSentenceKeys({ kept: [{ kind: 'computed', text: HEAD, fen: FEN }] }));
    const pkg = buildVoicePackage([{ kind: 'computed', text: BEAT, fen: FEN }], undefined, prior);
    expect(pkg.kept).toEqual([]);
  });
  it('keeps the head when only a later sentence is a repeat', () => {
    const tail = 'The Modern Variation is a position built around a fianchettoed bishop; yours is built around a queenside pawn push.';
    const prior = new Set(spokenSentenceKeys({ kept: [{ kind: 'computed', text: tail, fen: FEN }] }));
    const pkg = buildVoicePackage([{ kind: 'computed', text: BEAT, fen: FEN }], undefined, prior);
    expect(pkg.kept.map((f) => f.text)).toEqual([HEAD]);
  });
});

describe('familyLabel keeps "Variation" on a plain-word name', () => {
  it('says "the Modern Variation", never "the Modern"', () => {
    expect(familyLabel('Sicilian Defense: Modern Variation')).toBe('Modern Variation');
    expect(familyLabel('Sicilian Defense: Najdorf Variation')).toBe('Najdorf');
  });
});
