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

  it('caps at a sentence boundary, never mid-thought', () => {
    const s = 'This sentence carries exactly ten words of teaching for you.';
    const n = note({ explains: `${s} ${s} ${s} ${s} ${s} ${s} ${s} ${s}` });
    const spoken = spokenBeatText(n);
    const words = spoken.split(/\s+/).length;
    expect(words).toBeLessThanOrEqual(60);
    expect(spoken.endsWith('.')).toBe(true);
  });

  it('returns empty when nothing survives — the caller falls back', () => {
    expect(spokenBeatText(note({ explains: '' }))).toBe('');
    expect(spokenBeatText(note({ explains: 'The line runs e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6.' }))).toBe('');
  });

  it('keeps a normal short beat untouched', () => {
    const n = note({ explains: 'White grabs space; Black will strike at the base with c5.' });
    expect(spokenBeatText(n)).toBe('White grabs space; Black will strike at the base with c5.');
  });
});
