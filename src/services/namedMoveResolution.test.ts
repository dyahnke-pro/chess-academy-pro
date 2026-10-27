// A NAMED MOVE IS PLAYED FROM WHERE THE OPENING STARTS (David 2026-10-27:
// "Tell me more about the a3 sicillian" got "There's no answer for that one
// yet"). The old resolver looked for the move inside the opening's LONGEST
// same-name entry — the Open Sicilian — so "a3 Sicilian" dropped the move and
// taught the bare Sicilian, "Nc3 Sicilian" taught the Dragon and "Bc4
// Sicilian" the Ginsberg Gambit. Every row below failed on that code.
import { describe, it, expect } from 'vitest';
import { resolveOpeningEntry, lineForNamedMoves } from './openingDetectionService';
import { fuzzyMatchOpening } from './openingFuzzyMatcher';

describe('a move named with an opening picks the line that move starts', () => {
  it.each([
    ['a3 Sicilian', 'Sicilian Defense: Mengarini Variation', ['e4', 'c5', 'a3']],
    ['the a3 sicilian', 'Sicilian Defense: Mengarini Variation', ['e4', 'c5', 'a3']],
    ['Sicilian a3', 'Sicilian Defense: Mengarini Variation', ['e4', 'c5', 'a3']],
    ['c3 Sicilian', 'Sicilian Defense: Alapin Variation', ['e4', 'c5', 'c3']],
    ['Nc3 Sicilian', 'Sicilian Defense: Closed', ['e4', 'c5', 'Nc3']],
    ['Bc4 Sicilian', 'Sicilian Defense: Bowdler Attack', ['e4', 'c5', 'Bc4']],
    ['b4 Sicilian', 'Sicilian Defense: Wing Gambit', ['e4', 'c5', 'b4']],
    ['g6 Sicilian', 'Sicilian Defense: Hyperaccelerated Dragon', ['e4', 'c5', 'Nf3', 'g6']],
    ['Bb5 Sicilian', 'Sicilian Defense: Nyezhmetdinov-Rossolimo Attack', ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5']],
    ['exd5 French', 'French Defense: Exchange Variation', ['e4', 'e6', 'd4', 'd5', 'exd5']],
    ['Nd2 French', 'French Defense: Tarrasch Variation', ['e4', 'e6', 'd4', 'd5', 'Nd2']],
    ['Be3 Najdorf', 'Sicilian Defense: Najdorf Variation, English Attack', undefined],
  ])('%s → %s', (query, name, moves) => {
    const r = resolveOpeningEntry(query);
    expect(r?.canonicalName).toBe(name);
    if (moves) expect(r?.moves).toEqual(moves);
  });

  it.each([
    // The opening's own family first — never a different opening that shares
    // the first moves.
    ['f3 KID', "King's Indian Defense: Sämisch Variation"],
    ['f4 Pirc', 'Pirc Defense: Austrian Attack'],
  ])('%s stays inside the opening named → %s', (query, name) => {
    expect(resolveOpeningEntry(query)?.canonicalName).toBe(name);
  });

  it('a move reached by another move order still finds the line that says it', () => {
    expect(resolveOpeningEntry('Giuoco Pianissimo with a6')?.canonicalName)
      .toBe('Italian Game: Classical Variation, Giuoco Pianissimo, with a6');
  });

  it('keeps the move-named lines that already worked', () => {
    expect(resolveOpeningEntry('Vienna Gambit main line with Qf3')?.canonicalName)
      .toBe('Vienna Game: Vienna Gambit, Paulsen Attack');
    expect(resolveOpeningEntry('Najdorf with a6')?.canonicalName).toBe('Sicilian Defense: Najdorf Variation');
    expect(resolveOpeningEntry('Polish Opening, with d5')?.canonicalName).toBe('Polish Opening, with d5');
  });
});

describe('a named move is never silently dropped', () => {
  it('a move no line of that opening plays is an honest no, not the bare opening', () => {
    expect(lineForNamedMoves('Sicilian Defense', ['Qh5']).kind).toBe('none');
    expect(resolveOpeningEntry('Qh5 Sicilian')).toBeNull();
  });

  it('a bare move names no opening', () => {
    expect(resolveOpeningEntry('a3')).toBeNull();
    expect(resolveOpeningEntry('Qf3')).toBeNull();
  });

  it('a move both sides play at the same stage goes to the line the database holds most', () => {
    // White's 3.e5 (the Advance, dozens of DB lines through it) against
    // Black's 2…e5 (one line): the Advance, without a picker.
    expect(resolveOpeningEntry('e5 Caro')?.canonicalName).toBe('Caro-Kann Defense: Advance Variation');
    // A sideline named like the main line: 2.e5 is the Steinitz Attack, the
    // line people mean is 1.e4 e6 2.d4 d5 3.e5.
    expect(resolveOpeningEntry('e5 French')?.canonicalName).toBe('French Defense: Advance Variation');
    expect(resolveOpeningEntry('exd5 French')?.canonicalName).toBe('French Defense: Exchange Variation');
  });

  it('two lines too close to call are asked, never guessed', () => {
    const r = lineForNamedMoves('Caro-Kann Defense', ['e6']);
    expect(r.kind).toBe('ambiguous');
    if (r.kind !== 'ambiguous') return;
    expect(r.entries).toHaveLength(2);
    expect(resolveOpeningEntry('e6 Caro')).toBeNull();
    const fuzzy = fuzzyMatchOpening('e6 Caro');
    expect(fuzzy.autoAccept).toBe(false);
    expect(fuzzy.candidates.map((c) => c.canonicalName)).toEqual(r.entries.map((e) => e.name));
  });

  it('a move already in the opening changes nothing', () => {
    expect(lineForNamedMoves('Sicilian Defense: Najdorf Variation', ['a6']).kind).toBe('unchanged');
  });
});

describe('the misspelt opening next to a named move (his exact words)', () => {
  it('"a3 sicillian" is the Mengarini, accepted without a picker', () => {
    const f = fuzzyMatchOpening('a3 sicillian');
    expect(f.autoAccept).toBe(true);
    expect(f.candidates.map((c) => c.canonicalName)).toEqual(['Sicilian Defense: Mengarini Variation']);
  });

  it('negative control: a misspelt name with no move still asks', () => {
    expect(fuzzyMatchOpening('sicillian').autoAccept).toBe(false);
  });
});

describe('the chat reader\'s own restatement of a move-named line (prod 2026-10-27)', () => {
  it('"Caro-Kann, e5 variation" is the Advance — the orphaned category word is dropped', () => {
    expect(resolveOpeningEntry('Caro-Kann, e5 variation')?.canonicalName).toBe('Caro-Kann Defense: Advance Variation');
    expect(resolveOpeningEntry('Sicilian, a3 line')?.canonicalName).toBe('Sicilian Defense: Mengarini Variation');
  });
  it('a real name that ends in a category word is untouched', () => {
    expect(resolveOpeningEntry('Caro-Kann Advance Variation')?.canonicalName).toBe('Caro-Kann Defense: Advance Variation');
  });
});
