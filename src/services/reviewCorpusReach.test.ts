// DOES A REAL CORPUS NOTE COME OUT OF REVIEW?
//
// "EVERY COACHING SURFACE GETS THE CORPUS ... a surface that coaches without
// them is coaching from nothing." Review — where the diagnosis happens — had
// ZERO corpus calls until 2026-09-18. `docs/STATE.md` flagged it, and the
// producer is `buildReviewSegments`, not the component the instrument was
// scoping to, so the fix had to go in the service.
//
// 🚨 A WIRE THAT DOES NOT FIRE IS NOT A WIRE. This asserts a real note TEXT
// comes out for a real line, not that the function is imported. It loads the
// FULL corpus first: two of the four corpora are fetched from public/data at
// runtime, so a test without `loadFullCorpus` sees 19.6% of the notes and can
// pass while measuring almost nothing.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { noteAtPosition, spokenBeatText } from './danyaTeachingService';
import { beatRegister } from './curatedBeatSource';

/** A mainline Ruy Lopez — heavily covered by the farmed corpora. */
const RUY = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7',
  'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5'];

describe('review can reach the corpus', () => {
  beforeAll(() => { loadFullCorpus(); }, 60000);

  it('the producer asks the corpus at all', () => {
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    expect(src, 'buildReviewSegments is the producer — the component only renders it')
      .toMatch(/noteAtPosition\(priorSans, fenPair\.fenAfter/);
    expect(src, 'exact-position only: floating notes stay fenced to drill + endgame')
      .not.toMatch(/teachingNoteForBoard\(/);
    expect(src, 'the seat must be passed, never defaulted — both colours share a FEN')
      .toMatch(/const noteSeat = playerColor \?\? null;/);
  });

  it('a real note text comes out along a real line, from the student seat', () => {
    const c = new Chess();
    const spoke: string[] = [];
    for (let i = 0; i < RUY.length; i += 1) {
      c.move(RUY[i]);
      const note = noteAtPosition(RUY.slice(0, i + 1), c.fen(), 'Ruy Lopez', 'white');
      const text = note ? spokenBeatText(note)?.trim() : '';
      if (!text) continue;
      const reg = beatRegister(text, 'white');
      spoke.push(`[${reg}] ply ${i + 1} (${RUY[i]}): ${text.slice(0, 80)}`);
    }
    // eslint-disable-next-line no-console
    console.log(`REVIEW-CORPUS-REACH ${spoke.length}/${RUY.length} plies\n  ${spoke.slice(0, 5).join('\n  ')}`);
    expect(spoke.length, 'no note anywhere on a heavily-covered mainline means the wire is dead')
      .toBeGreaterThan(0);
  }, 60000);

  it('review refuses SPECTATOR-register notes — the coach must not narrate the student to a stranger', () => {
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    expect(src).toMatch(/beatRegister\(noteText, noteSeat\)/);
    expect(src).toMatch(/register === 'live-safe'/);
    // the classifier itself, on the exact prose this wire produced
    expect(beatRegister('White develops the knight and then pins with the bishop to b5.', 'white')).toBe('spectator');
  });

  it('the OTHER seat does not get this seat\'s prose', () => {
    // Both colours share every FEN, so position alone cannot tell the seats
    // apart. A seated note must not cross over.
    const c = new Chess();
    for (const san of RUY) c.move(san);
    const asWhite = noteAtPosition(RUY, c.fen(), 'Ruy Lopez', 'white');
    const asBlack = noteAtPosition(RUY, c.fen(), 'Ruy Lopez', 'black');
    if (asWhite && asBlack) expect(spokenBeatText(asWhite)).not.toBe(spokenBeatText(asBlack));
    else expect(true).toBe(true); // one seat having no note is a fine answer
  }, 60000);
});
