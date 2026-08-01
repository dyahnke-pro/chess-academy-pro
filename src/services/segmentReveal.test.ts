// Arrows arrive AS they are spoken (David 2026-08-01: "can we have the arrows
// appear as they are being spoken?" / "maybe give them to the llm in a package
// before each sentence is spoken?").
//
// The walkthrough runtime already set each segment's arrows immediately before
// speaking it — but the generator emitted ONE segment per ply holding every
// arrow, so eight landed at once while the coach was still on the first clause.
// These pin the split: a sentence gets exactly the arrows it names, the trail
// never blinks out, and nothing is dropped for being hard to place.
import { describe, it, expect } from 'vitest';
import { splitSegmentBySentence, groundedSegmentArrows } from './openingGenerator';
import { Chess } from 'chess.js';

const fenAfter = (sans: string[]): { from: string; to: string; fen: string } => {
  const c = new Chess();
  let last = { from: '', to: '' };
  for (const s of sans) {
    const m = c.move(s);
    last = { from: m.from, to: m.to };
  }
  return { ...last, fen: c.fen() };
};

describe('splitSegmentBySentence', () => {
  const move = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);

  it('gives each sentence only the arrows it names', () => {
    const text = 'Black kicks the bishop with a6. Later Nf6 develops with tempo.';
    const grounded = groundedSegmentArrows(text, text, move);
    const segments = splitSegmentBySentence({ text, arrows: grounded.arrows }, grounded.spans);
    expect(segments.length).toBe(2);

    const greenOf = (i: number): string[] =>
      (segments[i].arrows ?? []).filter((a) => a.color !== 'orange').map((a) => `${a.from}-${a.to}`);
    expect(greenOf(0)).toContain('a7-a6');
    expect(greenOf(0)).not.toContain('g8-f6');
    expect(greenOf(1)).toContain('g8-f6');
    expect(greenOf(1)).not.toContain('a7-a6');
  });

  it('keeps the orange trail on EVERY segment — the played move must not blink out', () => {
    const text = 'Black kicks the bishop with a6. Later Nf6 develops with tempo.';
    const grounded = groundedSegmentArrows(text, text, move);
    for (const seg of splitSegmentBySentence({ text, arrows: grounded.arrows }, grounded.spans)) {
      expect((seg.arrows ?? []).filter((a) => a.color === 'orange').map((a) => `${a.from}-${a.to}`))
        .toEqual(['f1-b5']);
    }
  });

  it('never loses an arrow across the split', () => {
    const text = 'The plan is a6, then Nf6 and later d6. That is the whole setup.';
    const grounded = groundedSegmentArrows(text, text, move);
    const before = (grounded.arrows ?? []).filter((a) => a.color !== 'orange').map((a) => `${a.from}-${a.to}`).sort();
    const after = splitSegmentBySentence({ text, arrows: grounded.arrows }, grounded.spans)
      .flatMap((s) => (s.arrows ?? []).filter((a) => a.color !== 'orange').map((a) => `${a.from}-${a.to}`))
      .sort();
    expect(after).toEqual(before);
  });

  it('leaves a single-sentence beat exactly as it was', () => {
    const text = 'Black kicks the bishop with a6.';
    const grounded = groundedSegmentArrows(text, text, move);
    const seg = { text, arrows: grounded.arrows };
    expect(splitSegmentBySentence(seg, grounded.spans)).toEqual([seg]);
  });

  it('speaks the short cue once, on the first segment only', () => {
    const text = 'Black kicks the bishop with a6. Later Nf6 develops with tempo.';
    const grounded = groundedSegmentArrows(text, text, move);
    const segments = splitSegmentBySentence(
      { text, arrows: grounded.arrows, shortText: 'a6 — kick the bishop' },
      grounded.spans,
    );
    expect(segments[0].shortText).toBe('a6 — kick the bishop');
    expect(segments[1].shortText).toBeUndefined();
  });

  it('places an unplaceable arrow on the first segment rather than dropping it', () => {
    const text = 'One sentence here. And a second one.';
    const grounded = groundedSegmentArrows(text, text, move);
    // A span the text never mentions — must still be carried somewhere.
    const segments = splitSegmentBySentence(
      { text, arrows: [...grounded.arrows, { from: 'b1', to: 'c3', color: 'green' }] },
      grounded.spans,
    );
    const all = segments.flatMap((s) => (s.arrows ?? []).map((a) => `${a.from}-${a.to}`));
    expect(all).toContain('b1-c3');
  });
});
