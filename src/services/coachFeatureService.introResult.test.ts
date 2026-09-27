// "…you had Black and it ended in a draw" on an unfinished game (`*`) —
// Carlsen–Topalov review walk 2026-09-27. Only a drawn score is a draw.
import { describe, it, expect } from 'vitest';
import { defaultIntroText } from './coachFeatureService';

const base = { playerColor: 'black' as const, openingName: null, mistakeCount: 0 };
describe('the review intro names only a result it knows', () => {
  it('an unfinished game names no result', () => {
    const t = defaultIntroText({ ...base, result: '*' });
    expect(t).not.toMatch(/draw|win|loss/);
    expect(t).toMatch(/you had Black\./);
  });
  it('NEGATIVE CONTROL: scores still read as results', () => {
    expect(defaultIntroText({ ...base, result: '0-1' })).toMatch(/ended in a win/);
    expect(defaultIntroText({ ...base, result: '1-0' })).toMatch(/ended in a loss/);
    expect(defaultIntroText({ ...base, result: '1/2-1/2' })).toMatch(/ended in a draw/);
  });
});
