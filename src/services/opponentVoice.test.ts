// Spoken by the player it was written for, a "wrong-side" note is right.
import { describe, it, expect } from 'vitest';
import { speakAsOpponent, framedOpponentPlan } from './opponentVoice';

const asBlack = (t: string) => speakAsOpponent(t, { coachSide: 'black' });

describe('the coach speaks as the player it is', () => {
  it("turns the opponent's repertoire into the opponent thinking out loud", () => {
    // The exact line David heard, playing White against the coach's Sicilian.
    expect(asBlack('Black should wait with a6, only infiltrating after White plays a4.'))
      .toBe('I should wait with a6, only infiltrating after you play a4.');
  });

  it('fixes verb agreement on both persons', () => {
    expect(asBlack('White has too few pieces to attack the king.'))
      .toBe('You have too few pieces to attack the king.');
    expect(asBlack('Black is winning the endgame.'))
      .toBe('I am winning the endgame.');
    expect(asBlack('Black pushes the a-pawn.')).toBe('I push the a-pawn.');
    expect(asBlack('White tries to consolidate.')).toBe('You try to consolidate.');
  });

  it('handles possessives', () => {
    expect(asBlack("Black's pawns leave no weakness to exploit."))
      .toBe('My pawns leave no weakness to exploit.');
    expect(asBlack("White's king is rarely safe on the queenside."))
      .toBe('Your king is rarely safe on the queenside.');
  });

  it('handles a colour in object position', () => {
    expect(asBlack('A passive rook hands Black the initiative.'))
      .toBe('A passive rook hands me the initiative.');
  });

  it('flips with the coach', () => {
    expect(speakAsOpponent('White must play d4 at once.', { coachSide: 'white' }))
      .toBe('I must play d4 at once.');
    expect(speakAsOpponent('White must play d4 at once.', { coachSide: 'black' }))
      .toBe('You must play d4 at once.');
  });
});

describe('what it must never touch', () => {
  it('leaves colour-as-terrain alone', () => {
    // "my squares" would be nonsense, and the corpus is full of these.
    expect(asBlack('The dark squares around the king are weak.'))
      .toBe('The dark squares around the king are weak.');
    for (const t of [
      'Trade off the light-squared bishop.',
      'Black squares are the battleground here.',
      'The bishop rules the long diagonal.',
    ]) {
      expect(asBlack(t)).toBe(t);
    }
  });

  it('leaves a colour used as an adjective alone', () => {
    expect(asBlack('Black pawns on dark squares limit the bishop.'))
      .toBe('Black pawns on dark squares limit the bishop.');
  });

  it('leaves a note that names no player completely untouched', () => {
    const t = 'The rook belongs behind the passed pawn, and the king walks up the board.';
    expect(asBlack(t)).toBe(t);
  });

  it('never invents or drops chess content', () => {
    // Squares and SAN survive verbatim — the rewrite is pronouns only.
    const out = asBlack('Black plays Bd7; if White takes on d7, Black recaptures with the knight.');
    for (const token of ['Bd7', 'd7', 'knight']) expect(out).toContain(token);
  });
});

describe('a note that already addresses its own side', () => {
  it('never leaves two players both called "you"', () => {
    // The note's "you" is Black, its reader. Mapping colours first made White
    // "you" as well and the sentence described two different players with one
    // pronoun.
    const out = asBlack('Black should play e5. If White saves the pawn, you gain a huge advantage.');
    expect(out).toBe('I should play e5. If you save the pawn, I gain a huge advantage.');
  });

  it('leaves the second person alone when the note is for the student', () => {
    // Written for White, spoken to a White student by a Black coach: "you"
    // already means the student, so it must not become "I".
    const out = asBlack('White should castle early. Then you can push f4.');
    expect(out).toBe('You should castle early. Then you can push f4.');
  });
});

describe('the student always knows whose plan it is', () => {
  it('never ships a first-person plan without saying whose it is', () => {
    const framed = framedOpponentPlan('Black should play a6 early to challenge the bishop.', {
      coachSide: 'black', ply: 0,
    });
    expect(framed).toBe("Here's my plan: I should play a6 early to challenge the bishop.");
  });

  it('varies the lead-in over a game but is stable for a given ply', () => {
    const at = (ply: number) => framedOpponentPlan('Black must hold the d5 square.', { coachSide: 'black', ply });
    expect(at(0)).not.toBe(at(1));
    expect(at(0)).toBe(at(0));
    // No Math.random: a repaint must not re-roll the phrasing, which would
    // also miss the TTS clip cache and cost real money.
    expect(at(4)).toBe(at(0));
  });

  it('says nothing rather than framing nothing', () => {
    expect(framedOpponentPlan('   ', { coachSide: 'black' })).toBe('');
  });
});
