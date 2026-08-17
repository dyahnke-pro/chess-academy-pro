import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { checkReason, checkReasons, survivingReasons, type Reason } from './reasonCheck';

/** Play a line from the start and return the FEN before the last move, plus
 *  that move — the two inputs every check takes. Positions are DERIVED, never
 *  typed: a hand-transcribed FEN once put a bishop on a square it had already
 *  been captured from, minutes after the rule against retyping was written. */
function upTo(sans: string[]): { fenBefore: string; san: string } {
  const game = new Chess();
  for (const san of sans.slice(0, -1)) game.move(san);
  return { fenBefore: game.fen(), san: sans[sans.length - 1] };
}

describe('reasonCheck', () => {
  // The worked example from the corpus. Naroditsky on 4...Bd7 in the
  // Scandinavian, giving THREE reasons in one breath — which is the whole case
  // for removing the one-reason cap.
  const SCANDI = ['e4', 'd5', 'exd5', 'Nf6', 'Bb5+', 'Bd7'];

  it('confirms a real move-reason from the corpus', () => {
    const { fenBefore, san } = upTo(SCANDI);
    // "it's depriving the B8 knight of a square"
    const verdict = checkReason(fenBefore, san, { kind: 'deprives', from: 'b8', square: 'd7' });
    expect(verdict.holds, verdict.note).toBe(true);
  });

  it('keeps every reason a move has, not just the best one', () => {
    const { fenBefore, san } = upTo(SCANDI);
    const reasons: Reason[] = [
      { kind: 'deprives', from: 'b8', square: 'd7' },   // the b8 knight's square
      { kind: 'blocks', from: 'd8', to: 'd5' },          // cuts the queen off the centre
    ];
    const survivors = survivingReasons(fenBefore, san, reasons);
    expect(survivors).toHaveLength(2);
  });

  it('drops a reason that is false on a SIMILAR position', () => {
    // THE POINT OF THE WHOLE MODULE. The student reaches a position like the
    // lesson's but not identical: their knight already stands on c6, so it was
    // never going to d7 and "deprives the b8 knight" is simply not true on
    // their board. One stored reason would force a choice between silence and
    // a false claim; a list lets the coach drop this one and keep teaching.
    const theirs = upTo(['e4', 'd5', 'exd5', 'Nc6', 'Bb5', 'Bd7']);
    const verdict = checkReason(theirs.fenBefore, theirs.san, { kind: 'deprives', from: 'b8', square: 'd7' });
    expect(verdict.holds).toBe(false);
    expect(verdict.note).toMatch(/no piece on b8/);
  });

  it('confirms a prevention only when the reply really was available', () => {
    // A prevention of something that was never on the board is the commonest
    // way a plausible-sounding reason is quietly false.
    const fake = upTo(['e4', 'e5', 'Nf3', 'Nc6', 'Be2']);
    const v = checkReason(fake.fenBefore, fake.san, { kind: 'prevents', san: 'Bg4' });
    expect(v.holds).toBe(false);
    expect(v.note).toMatch(/not available anyway/);
  });

  it('separates stopping a move from merely answering it', () => {
    // "we move it to E2 in order to stop Bishop G4" sounds like a legality
    // claim and is not: ...Bg4 stays perfectly legal after Be2, it is just met
    // by taking. Read as a prevention the true idea reads FALSE.
    const real = upTo(['e4', 'd5', 'exd5', 'Nf6', 'Bb5+', 'Bd7', 'Be2']);
    expect(checkReason(real.fenBefore, real.san, { kind: 'prevents', san: 'Bg4' }).holds).toBe(false);
    expect(checkReason(real.fenBefore, real.san, { kind: 'meets', san: 'Bg4' }).holds).toBe(true);
  });

  it('refuses the loose claims the transcripts actually made', () => {
    // Every one of these was said out loud in a lesson and would have shipped
    // as confident false teaching. "Trapped" is the one that cost the most:
    // the bishop had five squares.
    const { fenBefore, san } = upTo(['d4', 'd5', 'Bf4']);
    const trapped = checkReason(fenBefore, san, { kind: 'traps', square: 'c8' });
    expect(trapped.holds).toBe(false);
    expect(trapped.note).toMatch(/still has \d+ square/);
  });

  it('requires the MOVED piece to be the one doing the work', () => {
    // A square some other piece already covered is not a reason to play THIS
    // move. Without this the checker would bless nearly any developing move
    // with nearly any nearby claim.
    const { fenBefore, san } = upTo(['e4', 'e5', 'Nf3', 'Nc6', 'd3']);
    const v = checkReason(fenBefore, san, { kind: 'controls', square: 'd5' });
    expect(v.holds).toBe(false);
    expect(v.note).toMatch(/does not reach/);
  });

  it('does not read an empty square as an attack, or a friend as an enemy', () => {
    const { fenBefore, san } = upTo(['e4', 'e5', 'Nf3']);
    expect(checkReason(fenBefore, san, { kind: 'attacks', square: 'e6' }).note).toMatch(/empty/);
    expect(checkReason(fenBefore, san, { kind: 'attacks', square: 'd2' }).note).toMatch(/our own piece/);
  });

  it('rejects a line claim between squares that share no line', () => {
    const { fenBefore, san } = upTo(['e4', 'd5', 'exd5', 'Nf6', 'Bb5+', 'Bd7']);
    const v = checkReason(fenBefore, san, { kind: 'blocks', from: 'a1', to: 'c7' });
    expect(v.holds).toBe(false);
    expect(v.note).toMatch(/share no line/);
  });

  it('reports an illegal move rather than silently passing its reasons', () => {
    const verdicts = checkReasons(new Chess().fen(), 'Qh5', [{ kind: 'controls', square: 'e5' }]);
    expect(verdicts[0].holds).toBe(false);
    expect(verdicts[0].note).toMatch(/not legal/);
  });
});
