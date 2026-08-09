// A family is not a line you can play.
//
// David 2026-08-09: "add pickers for sublines when player requests an opening
// to be played." The subline picker already existed for "teach me the
// Sicilian" and was skipped for anything carrying a stage hint — so a request
// to PLAY a family started a game on the family's bare stub: three moves of
// theory that a dozen genuinely different games share, with no way to say
// which one you meant. Choosing between the Najdorf and the Dragon is not a
// detour before playing the Sicilian; it is the first real decision of it, and
// it determines every line the coach follows and every note it can reach.
//
// Two things decide the feature and both are tested for real here rather than
// mirrored: WHETHER a picker appears (findLinePickerOptions) and WHICH SIDE the
// student lands on once a tile is tapped (studentSideForPlay). The third — the
// guards on inheriting the intent through a TYPED pick — is mirrored, because
// it lives inline in handleSubmit.
import { describe, it, expect } from 'vitest';
import {
  findLinePickerOptions,
  studentSideForPlay,
  inferStudentSideFromName,
} from '../../services/openingDetectionService';

describe('which requests raise a picker', () => {
  it.each([
    'Sicilian Defense',
    'Italian Game',
    'French Defense',
  ])('a family splits into lines you must choose between: %s', (family) => {
    const picker = findLinePickerOptions(family);
    expect(picker, `${family} should offer sublines`).not.toBeNull();
    expect(picker!.options.length).toBeGreaterThanOrEqual(2);
  });

  it.each([
    'Latvian Gambit',
    'Sicilian Defense: Najdorf Variation',
    'Sicilian Defense: Grand Prix Attack',
  ])('a request that already names a line starts immediately: %s', (line) => {
    // The whole point of gating on this: a student who said what they wanted
    // must not be made to tap again. This is what keeps "play the Latvian
    // against me" a one-message interaction.
    expect(findLinePickerOptions(line)).toBeNull();
  });

  it('every option is a real, playable line under the family', () => {
    const picker = findLinePickerOptions('Sicilian Defense');
    expect(picker).not.toBeNull();
    for (const opt of picker!.options) {
      expect(opt.fullName.startsWith(picker!.canonicalName)).toBe(true);
      // A tile that resolves to another picker would loop the student.
      expect(findLinePickerOptions(opt.fullName)).toBeNull();
    }
  });
});

describe('which side the student ends up on', () => {
  it('"against me" hands the line to the coach', () => {
    expect(studentSideForPlay({ lineSide: 'black', coachPlaysIt: true })).toBe('white');
    expect(studentSideForPlay({ lineSide: 'white', coachPlaysIt: true })).toBe('black');
  });

  it('otherwise the student plays the line themselves', () => {
    expect(studentSideForPlay({ lineSide: 'black', coachPlaysIt: false })).toBe('black');
    expect(studentSideForPlay({ lineSide: 'white', coachPlaysIt: false })).toBe('white');
  });

  it('an explicit side beats both readings', () => {
    expect(studentSideForPlay({ lineSide: 'black', coachPlaysIt: true, sideOverride: 'black' })).toBe('black');
    expect(studentSideForPlay({ lineSide: 'white', coachPlaysIt: false, sideOverride: 'black' })).toBe('black');
  });

  it('the tile inherits the terms of the request that raised it', () => {
    // "Play the Sicilian against me" → tap Najdorf. The Najdorf is Black's
    // line, the coach was asked to take it, so the student is White. Reading
    // the tile alone would have handed the student the side they had just
    // asked the coach to play.
    const picker = findLinePickerOptions('Sicilian Defense');
    const najdorf = picker!.options.find((o) => /najdorf/i.test(o.fullName));
    expect(najdorf, 'the Sicilian picker should offer the Najdorf').toBeDefined();
    expect(studentSideForPlay({ lineSide: najdorf!.studentSide, coachPlaysIt: true })).toBe('white');
    expect(studentSideForPlay({ lineSide: najdorf!.studentSide, coachPlaysIt: false })).toBe('black');
  });

  it('agrees with the side a directly-named line would have started on', () => {
    // The dot on the tile and the game the tile starts must not disagree, and
    // neither may disagree with typing the same name instead of tapping it.
    const picker = findLinePickerOptions('Sicilian Defense');
    for (const opt of picker!.options) {
      const typed = studentSideForPlay({
        lineSide: inferStudentSideFromName(opt.fullName),
        coachPlaysIt: true,
      });
      const tapped = studentSideForPlay({ lineSide: opt.studentSide, coachPlaysIt: true });
      expect(tapped, `${opt.fullName}: tapping and typing must agree`).toBe(typed);
    }
  });
});

// Mirrors the inheritance guards in handleSubmit. A stage hint sends the input
// down a branch that takes whatever is left as the opening name — no
// question-mark guard, no control-word guard, unlike bare-name routing — so a
// pending play intent must not be inherited by anything that could not be a
// name.
const CONTROL = /^(?:start|go|stop|end|next|resume|pause|new|new lesson|back)$/i;
const inherits = (text: string): boolean =>
  text.trim().length <= 60 && !text.includes('?') && !CONTROL.test(text.trim());

describe('a typed pick keeps the intent; a question does not', () => {
  it.each(['Najdorf', 'Sicilian Defense: Dragon Variation', 'the Dragon'])(
    'a typed line name is still a request to play: %s',
    (t) => { expect(inherits(t)).toBe(true); },
  );

  it.each([
    'which of those is sharpest?',
    'what do you recommend?',
    'stop',
  ])('a follow-up is not an opening name: %s', (t) => {
    expect(inherits(t)).toBe(false);
  });
});
