// The spoken register of a corpus note — explains only, no move dictation,
// capped at a sentence boundary. David 2026-08-05: "a bit too wordy … it
// droned on with long strings of FENs which lost me." The full beat stays
// available (`teachingBeatText`) for prompt blocks; this is what the VOICE gets.
import { describe, it, expect } from 'vitest';
import { spokenBeatText, teachingBeatText, type DanyaNote } from './danyaTeachingService';

const note = (over: Partial<DanyaNote>): DanyaNote => ({
  id: 'x', lineSan: ['e4'], opening: null, phase: 'opening',
  explains: '', teaches: '', plans: '', concepts: [], sources: [],
  ...over,
});

describe('spokenBeatText', () => {
  it('speaks explains only — teaches and plans stay written', () => {
    const n = note({
      explains: 'The bishop belongs outside the pawn chain.',
      teaches: 'A whole paragraph of teaching that must not be spoken per ply.',
      plans: 'And a plan paragraph on top of it.',
    });
    expect(spokenBeatText(n)).toBe('The bishop belongs outside the pawn chain.');
    // …while the full beat still carries all three for prompt contexts.
    expect(teachingBeatText(n)).toContain('paragraph of teaching');
  });

  it('drops a sentence that recites a move list', () => {
    // The droning class from the prod log: 7 SAN tokens TTS-expanded into
    // "knight to c3, d-pawn takes e4, knight takes e4…". The board plays the
    // moves; the voice carries only what the picture does not.
    const n = note({
      explains: 'After e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6, White often plays Bd3. The doubled f-pawns give Black an open g-file to attack down.',
    });
    expect(spokenBeatText(n)).toBe('The doubled f-pawns give Black an open g-file to attack down.');
  });

  it('has NO word cap — every teaching sentence of explains is kept (David: "remove cap.")', () => {
    const s = 'This sentence carries exactly ten words of teaching for you.';
    const n = note({ explains: `${s} ${s} ${s} ${s} ${s} ${s} ${s} ${s}` });
    const spoken = spokenBeatText(n);
    expect(spoken.split(/\s+/).length).toBe(80); // all 8 sentences survive
    expect(spoken.endsWith('.')).toBe(true);
  });

  it('returns empty when nothing survives — the caller falls back', () => {
    expect(spokenBeatText(note({ explains: '' }))).toBe('');
    expect(spokenBeatText(note({ explains: 'The line runs e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6.' }))).toBe('');
  });

  it('drops a THREE-move sentence — the measured droning class', () => {
    // The bar was 4 moves per sentence, and 31.2% of the 6,768 speakable
    // corpus notes still got through carrying a three-moves-in-one-breath
    // sentence. At 3 that class is empty. This is the exact shape: three
    // moves the student is already watching land on the board.
    const n = note({
      explains: 'After Bg5, Black can play Be7 and later Nh5. The pin is the only thing holding the position together.',
    });
    expect(spokenBeatText(n)).toBe('The pin is the only thing holding the position together.');
  });

  it('keeps a TWO-move sentence — two moves is teaching, not dictation', () => {
    const n = note({ explains: 'Once White pushes e5, Black hits back with f6.' });
    expect(spokenBeatText(n)).toBe('Once White pushes e5, Black hits back with f6.');
  });

  it('keeps a normal short beat untouched', () => {
    const n = note({ explains: 'White grabs space; Black will strike at the base with c5.' });
    expect(spokenBeatText(n)).toBe('White grabs space; Black will strike at the base with c5.');
  });
});

// The corpus's own prose frequently opens by reciting the line that reached the
// position — which is exactly how `scripts/derive-note-anchors.mjs` recovers an
// anchor, so the two are correlated: a note anchored FROM its recitation is the
// most likely to lead with one. David 2026-08-08: "missing maturity of the
// corpus."
describe('spokenBeatText — the anchor recitation', () => {
  const note = (over: Partial<DanyaNote>): DanyaNote => ({
    id: 'x', lineSan: ['e4'], opening: null, phase: 'opening',
    explains: '', teaches: '', plans: '', concepts: [], sources: [],
    ...over,
  });

  it('drops a leading recitation of the note\'s OWN anchor and keeps the teaching', () => {
    // Real shape, from hp-3lz. Before this, the recited prefix alone blew the
    // 3-SAN budget and the whole sentence — teaching included — went silent.
    const n = note({
      lineSan: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
      explains: 'After d4 Nf6 c4 e6 Nc3 Bb4, Black gets the bishop pair in return for the doubled pawns.',
    });
    expect(spokenBeatText(n)).toBe('Black gets the bishop pair in return for the doubled pawns.');
  });

  it('leaves a recitation of a DIFFERENT line for the dictation rule to judge', () => {
    // Only the note's own anchor is redundant — the student is looking at that
    // board. Somebody else's line is dictation and the SAN rule owns it.
    const n = note({
      lineSan: ['d4', 'Nf6', 'c4', 'e6'],
      explains: 'After e4 e5 Nf3 Nc6 Bc4 Bc5, White has the Italian.',
    });
    expect(spokenBeatText(n)).toBe('');
  });

  it('says nothing when the note only restated where we are', () => {
    const n = note({
      lineSan: ['e4', 'c6', 'd4', 'd5'],
      explains: 'After e4 c6 d4 d5.',
    });
    expect(spokenBeatText(n)).toBe('');
  });
});

describe('spokenBeatText — a stranded sentence is not spoken', () => {
  const note = (over: Partial<DanyaNote>): DanyaNote => ({
    id: 'x', lineSan: ['e4'], opening: null, phase: 'opening',
    explains: '', teaches: '', plans: '', concepts: [], sources: [],
    ...over,
  });

  it('drops a backward reference whose antecedent was pruned', () => {
    // Heard on the real corpus: the first sentence recited a line and was cut,
    // leaving "It is one of the oldest and most analyzed openings" — of WHAT?
    const n = note({
      explains: 'The line runs e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6. It is one of the oldest openings.',
    });
    expect(spokenBeatText(n)).toBe('');
  });

  it('KEEPS a backward reference when its antecedent survived', () => {
    // The guard is about the pruning, not about the word — "This" is fine when
    // the thing it points at was just spoken.
    const n = note({
      explains: 'The bishop sits outside the pawn chain. This is the whole point of the variation.',
    });
    expect(spokenBeatText(n)).toBe(
      'The bishop sits outside the pawn chain. This is the whole point of the variation.',
    );
  });

  it('drops a clause whose subject was left in the previous sentence', () => {
    const n = note({
      explains: 'White met the pin with a4 b5 axb5 axb5 Rxa8. c4 and forced the bishop back to d2.',
    });
    expect(spokenBeatText(n)).toBe('');
  });

  it('still speaks a move-first sentence that is a real claim about this board', () => {
    // "dxe4 would be a threat…" opens on a move and is complete and useful.
    // The fragment rule must not swallow it.
    const n = note({ explains: 'dxe4 would be a threat once Black gets more pieces out.' });
    expect(spokenBeatText(n)).toBe('dxe4 would be a threat once Black gets more pieces out.');
  });
});

describe('spokenBeatText — the fragment rule stays narrow', () => {
  const note = (over: Partial<DanyaNote>): DanyaNote => ({
    id: 'x', lineSan: ['e4'], opening: null, phase: 'opening',
    explains: '', teaches: '', plans: '', concepts: [], sources: [],
    ...over,
  });

  it('keeps a sentence whose SUBJECT is the moves themselves', () => {
    // "e4 and d4 are both playable" opens on a move followed by "and" — the
    // same shape as the fragment, and not one. What separates them is whether
    // a second move follows the "and".
    const n = note({ explains: 'e4 and d4 are both playable here.' });
    expect(spokenBeatText(n)).toBe('e4 and d4 are both playable here.');
  });
});

// Found by dumping the spoken teaching across all 43 taught openings and
// reading it. The narration voice rules put this first: "Don't restate the
// board — voice carries only what the picture doesn't", and "Silence is
// acceptable."
describe('spokenBeatText — a move announcement is not teaching', () => {
  const note = (over: Partial<DanyaNote>): DanyaNote => ({
    id: 'x', lineSan: ['e4'], opening: null, phase: 'opening',
    explains: '', teaches: '', plans: '', concepts: [], sources: [],
    ...over,
  });

  it.each([
    ['a bare move', 'Be7.'],
    ['a bare pawn push', 'd6.'],
    ['a move with a motion verb', 'g6 follows.'],
    ['a side playing a move', 'White plays Be3. Bg7.'],
  ])('says nothing for %s', (_label, explains) => {
    expect(spokenBeatText(note({ explains }))).toBe('');
  });

  it('KEEPS a short line that carries real content', () => {
    // This is not a length rule — "Accept it." is two words and is exactly the
    // kind of punchy coaching the voice should keep. What disqualifies a
    // sentence is having nothing left once the moves are removed.
    expect(spokenBeatText(note({ explains: 'Accept it.' }))).toBe('Accept it.');
  });

  it('KEEPS a move-bearing sentence that also teaches', () => {
    expect(spokenBeatText(note({ explains: 'Be7 unpins the knight and frees the rook.' })))
      .toBe('Be7 unpins the knight and frees the rook.');
  });

  it('drops a clause that lost its subject to the sentence before it', () => {
    // "…the resulting structure. is dubious." — a bare copula opener.
    expect(spokenBeatText(note({ explains: 'is dubious.' }))).toBe('');
  });
});

describe('spokenBeatText — an opening parenthetical is a cut clause', () => {
  const note = (over: Partial<DanyaNote>): DanyaNote => ({
    id: 'x', lineSan: ['e4'], opening: null, phase: 'opening',
    explains: '', teaches: '', plans: '', concepts: [], sources: [],
    ...over,
  });

  it('drops a sentence that opens ON a parenthetical', () => {
    // Heard walking the Vienna Gambit on 2026-08-08: "(old) or Qf3 (new), the
    // recommended practical response is …Nc6." The distiller cut the clause the
    // aside belonged to, so the sentence begins by qualifying something never
    // said. `startsBroken` already caught a stray CLOSING paren; an opening one
    // is the same truncation from the other end.
    expect(spokenBeatText(note({ explains: '(old) or Qf3 (new), the practical response is Nc6.' }))).toBe('');
  });

  it('keeps a normal sentence that merely contains a parenthetical', () => {
    expect(spokenBeatText(note({ explains: 'The bishop (already developed) covers the diagonal.' })))
      .toBe('The bishop (already developed) covers the diagonal.');
  });
});
