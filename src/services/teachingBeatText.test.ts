// The beat handed to the coach must be the WHOLE beat. `plans` was dropped at
// the walkthrough splice and in the think-aloud facts, which cost two things at
// once: the forward-looking half of the teaching went unspoken, and the
// lead-the-eye pass — which derives arrows from this very string — could never
// arrow a move that is named only in `plans`.

import { describe, it, expect } from 'vitest';
import { teachingBeatText } from './danyaTeachingService';
import { mentionedMoveArrows } from './mentionedMoveArrows';
import type { DanyaNote } from './danyaTeachingService';

const note = (over: Partial<DanyaNote>): DanyaNote => ({
  id: 'n', lineSan: [], opening: null, phase: 'opening',
  explains: '', teaches: '', plans: '', concepts: [], sources: [], ...over,
});

describe('teachingBeatText', () => {
  it('carries explains, teaches AND plans', () => {
    const beat = teachingBeatText(note({
      explains: 'The centre is fixed.', teaches: 'Fixed centres reward manoeuvring.', plans: 'Black prepares ...f5.',
    }));
    expect(beat).toBe('The centre is fixed. Fixed centres reward manoeuvring. Black prepares ...f5.');
  });

  it('omits empty parts without leaving double spaces', () => {
    expect(teachingBeatText(note({ explains: 'A.', teaches: 'B.' }))).toBe('A. B.');
  });

  it('a move named only in plans still reaches the arrow pass', () => {
    // Italian-ish position, white to move. The plan names d4 — a move that is
    // NOT played on this ply, which is exactly the case David asked for:
    // "moves the narrations mention but don't actually play out".
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const withoutPlans = teachingBeatText(note({ explains: 'White is developed.', teaches: 'Develop before striking.' }));
    const withPlans = teachingBeatText(note({
      explains: 'White is developed.', teaches: 'Develop before striking.', plans: 'White prepares d4 to open the centre.',
    }));
    expect(mentionedMoveArrows(withoutPlans, fen, [])).toEqual([]);
    const arrows = mentionedMoveArrows(withPlans, fen, []);
    expect(arrows.some((a) => a.to === 'd4'), 'no arrow for the move named in plans').toBe(true);
  });
});
