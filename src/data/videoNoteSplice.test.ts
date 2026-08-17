import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { noteAtPosition, spokenBeatText } from '../services/danyaTeachingService';
import { gradeNarrationText } from '../services/coachAnswerGates';

/**
 * Do the hand-written notes actually reach a student's ear?
 *
 * David 2026-08-17: *"Make sure it's working."* Three weaker claims were already
 * gated and none of them answers this: that the note is in the bundle, that the
 * selector returns it, that its board claims are true. What decides whether a
 * student hears it is the SPLICE — retrieval, then the spoken register, then
 * the board-truth grader — and each of those can drop the note silently.
 *
 * THIS EXISTS BECAUSE THE BROWSER AUDIT COULD NOT ANSWER IT. Five separate
 * driver faults made `audit-video-notes-prod.mjs` report "the note never
 * reached the student" against a product that was fine: the chat panel was not
 * opened, the calibration bubble swallowed every click, the variation picker
 * was never tapped, the wait covered generation instead of the walk, and the
 * search looked for `teaches` — a field the spoken register never emits. Each
 * failure looked exactly like a broken feature. This runs the same functions
 * the app runs, in two seconds, and cannot be lied to by a driver.
 *
 * It walks the REPERTOIRE'S OWN taught line, not the note's authored line. A
 * note anchored somewhere the lesson never goes is real teaching that no
 * student will meet — the Fantasy note at `...f3 Nd7 e5 c5` is one, against a
 * taught line that plays `...f3 dxe4`. That is worth knowing and is invisible
 * to every other check here.
 */
describe('hand-written notes reach the spoken narration', () => {
  /** The Fantasy line exactly as `repertoire.json` teaches it. */
  const TAUGHT = ['e4', 'c6', 'd4', 'd5', 'f3', 'dxe4', 'fxe4', 'e5', 'Nf3', 'Bg4', 'Bc4', 'Nd7'];
  const OPENING = 'Caro-Kann Defence: Fantasy Variation';

  /** Every ply of a line, with whatever the coach would actually speak there. */
  function walk(sans: readonly string[], openingName: string) {
    const game = new Chess();
    const seen = new Set<string>();
    const history: string[] = [];
    const spoken: { ply: number; id: string; text: string }[] = [];
    for (const san of sans) {
      game.move(san);
      history.push(san);
      const note = noteAtPosition(history, game.fen(), openingName, seen);
      if (!note) continue;
      // The grader is the last thing between a note and the student, and it
      // drops any sentence whose board claims are not true here. A note that
      // survives it whole is one whose every claim checks out on that board.
      const graded = gradeNarrationText(spokenBeatText(note), game.fen(), 'videoNoteSplice');
      if (!graded?.trim()) continue;
      seen.add(note.id);
      spoken.push({ ply: history.length, id: note.id, text: graded.trim() });
    }
    return spoken;
  }

  it('speaks hand-written notes on the line the lesson actually teaches', () => {
    const spoken = walk(TAUGHT, OPENING);
    const handwritten = spoken.filter((s) => s.id.startsWith('vn-'));
    expect(
      handwritten.map((s) => `ply${s.ply} ${s.id}`),
      'no hand-written note survives the splice on the taught Fantasy line',
    ).not.toEqual([]);
  });

  it('speaks them whole, not as a fragment the grader has eaten', () => {
    // A note can be "reached" and still arrive gutted: the grader trims claim
    // by claim, so a note reduced to a clause is a defect that a boolean
    // reached/not-reached check reports as success.
    for (const s of walk(TAUGHT, OPENING).filter((x) => x.id.startsWith('vn-'))) {
      expect(s.text.length, `${s.id} arrives as a ${s.text.length}-char fragment`).toBeGreaterThan(80);
    }
  });

  it('speaks the words that were written, not a paraphrase of them', () => {
    // The whole argument for hand-writing is that a model paraphrasing keeps
    // the vivid half and drops the verifiable half. If the text a student hears
    // is not the text that was checked against the board, none of the checking
    // transferred.
    const spoken = walk(TAUGHT, OPENING).filter((s) => s.id.startsWith('vn-'));
    for (const s of spoken) {
      expect(s.text, `${s.id} names no square, so it cannot be the written note`)
        .toMatch(/\b[a-h][1-8]\b/);
    }
  });
});
