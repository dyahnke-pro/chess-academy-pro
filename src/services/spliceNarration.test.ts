// A HAND-WRITTEN NOTE IS THE WHOLE NARRATION FOR ITS PLY.
//
// David 2026-08-19: *"the narrations are also good enough to turn off the
// computed narrations. so any lines that has had written teachings should not
// play the computed narrations."*
//
// The failure this closes is the one he found in a Caro-Kann Tartakower lesson:
// the generated half of the beat narrated Queen's-Gambit Tartakower ideas —
// rooks lining up against a c4 pawn that was not on the board — because the
// model reaches for the opening's NAME when it has nothing computed to say.
// Where a hand-written note already speaks, that half is now simply absent.
import { describe, it, expect } from 'vitest';
import { spliceNarration } from './openingGenerator';

const GENERATED = 'Nc3 develops toward the centre.';

describe('splicing a note with the generated sentence', () => {
  it('drops the generated sentence when the note is hand-written', () => {
    const out = spliceNarration({ text: 'The bishop holds d4.', handwritten: true }, GENERATED);
    expect(out).toBe('The bishop holds d4.');
    expect(out).not.toContain(GENERATED);
  });

  it('keeps a hand-written note whole even with nothing generated', () => {
    expect(spliceNarration({ text: 'The bishop holds d4.', handwritten: true }, '')).toBe('The bishop holds d4.');
  });

  // Farmed notes are distillations of speech — thinner, and not written to
  // carry a ply alone — so they LEAD the generated prose instead of replacing
  // it. Without this the change would silently halve the app's coverage:
  // hand-written notes reach 131 lessons, farmed notes reach the rest.
  it('still leads the generated sentence when the note is farmed', () => {
    const out = spliceNarration({ text: 'A common plan here.', handwritten: false }, GENERATED);
    expect(out).toBe(`A common plan here. ${GENERATED}`);
  });

  it('does not leave a dangling space when a farmed note has nothing to lead', () => {
    expect(spliceNarration({ text: 'A common plan here.', handwritten: false }, '   ')).toBe('A common plan here.');
  });
});

// A WIRE THAT DOES NOT FIRE IS NOT A WIRE. The rule above is only worth
// anything if `noteArrowSourceAt` actually reports `handwritten` for a real
// hand-written note at a real position — the flag is what the splice reads.
describe('the origin flag on a real spliced note', () => {
  it('marks a hand-written note as hand-written at its own position', async () => {
    const { Chess } = await import('chess.js');
    const { noteArrowSourceAt } = await import('./openingGenerator');
    const { ALL_NOTES } = await import('./danyaTeachingService');

    const written = ALL_NOTES.filter((n) => n.origin === 'handwritten' && n.lineSan.length >= 3);
    expect(written.length, 'no hand-written notes in the pool').toBeGreaterThan(0);

    // Walk until one splices: a note can be dropped by the board grader or by
    // the opening scope, and the claim here is about the flag, not about which
    // particular note survives.
    let seen = false;
    for (const n of written.slice(0, 60)) {
      const g = new Chess();
      let legal = true;
      for (const san of n.lineSan) { try { if (!g.move(san)) { legal = false; break; } } catch { legal = false; break; } }
      if (!legal) continue;
      const out = noteArrowSourceAt(n.lineSan, g.fen(), new Set<string>(), n.opening);
      if (!out) continue;
      seen = true;
      expect(out.handwritten, `${n.id} spliced but was not flagged hand-written`).toBe(true);
      expect(out.text.trim().length).toBeGreaterThan(0);
      break;
    }
    expect(seen, 'no hand-written note spliced at any of its own positions').toBe(true);
  });
});
