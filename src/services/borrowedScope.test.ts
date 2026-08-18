import { describe, expect, it } from 'vitest';
import { borrowedNoteIsOutOfScope } from './borrowedScope';

/**
 * Calibrated on the lines a real game actually produced, not on invented ones.
 *
 * A 20-move game driven on prod (David 2026-08-18) spoke ELEVEN borrowed notes —
 * one on nearly every move — and ten of them narrated a different game's move
 * sequence under the heading "As a rule in these positions:". Those ten are the
 * fixtures below, verbatim. The eleventh is kept on purpose: it is the one that
 * really was a transferable idea.
 */
describe('a borrowed note may carry an idea, never a continuation', () => {
  const HEARD_AND_REFUSED: ReadonlyArray<[why: string, text: string]> = [
    ['passes a verdict on one position',
     'The bishop pair and a knight anchored on the outpost give Black a winning grip. White cannot develop without losing a pawn.'],
    ['names a specific trade',
     "The bishop pin tempts White to capture and damage Black's pawns, but that trade surrenders the bishop pair."],
    ['names a specific trade',
     'The bishop pair and the half-open h-file are the prize after the capture, while the enemy king finds no shelter.'],
    ['passes a verdict on one position',
     'The pawn sacrifice buys the bishop pair and command of the light squares. Black is left with lasting pawn weaknesses.'],
    ['narrates a capture',
     'The bishop defends the weak square, but the real target is the knight. Capturing it wins material.'],
    ['names a specific trade',
     'The queen has two checking squares, and both are protected. Whatever she plays, the trade is forced.'],
    ['narrates a continuation',
     'The knight lunges in desperation, but the bishop simply takes it. When the rook recaptures, the pawn falls.'],
    ['narrates a continuation',
     'When a trade is offered here, take it. If the queen recaptures, the rook pins her to the king.'],
    ['narrates a continuation',
     'The queen trade is done, so recapturing with the rook is fine. If a knight checks from the side, just take it.'],
    ['narrates a continuation',
     'The knight sortie to chase the bishop back fails. Once that knight leaves its post, it stops guarding the rook.'],
  ];

  it.each(HEARD_AND_REFUSED)('refuses (%s) a note about another board', (why, text) => {
    expect(borrowedNoteIsOutOfScope(text)).toBe(why);
  });

  it('keeps the one that really was a transferable idea', () => {
    // The eleventh line of that game — a structure and a plan, no continuation.
    expect(borrowedNoteIsOutOfScope(
      'The bishop sits on a long, active diagonal. The plan: build a pawn chain that fences in the dark-squared bishop and keeps both black bishops idle.',
    )).toBeNull();
  });

  it('keeps standing ideas, which are the whole point of the tier', () => {
    // 🔒 The corpus is 90% of what this coach says (CLAUDE.md), and a scope
    // guard that fires nine times in ten is a silencer — that exact mistake is
    // on the record in voicePackage. These must survive, or the fix is worse
    // than what it replaced.
    for (const idea of [
      'The bishop pair wants open lines; every pawn trade makes it stronger.',
      'A knight on an outpost no pawn can challenge is worth more than a bishop.',
      'Space on the queenside is only an asset while the centre stays closed.',
      'Rooks belong behind passed pawns, whether they are yours or theirs.',
      'The king is a fighting piece once the queens leave the board.',
      'Doubled pawns are a weakness in an endgame and a half-open file in a middlegame.',
    ]) {
      expect(borrowedNoteIsOutOfScope(idea), idea).toBeNull();
    }
  });
});
