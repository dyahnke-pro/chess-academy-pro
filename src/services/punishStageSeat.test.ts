// ONE SEAT PER PUNISH STAGE — the student never plays the other side's pieces.
//
// Found reading a real prod lesson (2026-09-17). A student being taught the
// Scandinavian as BLACK heard, twice:
//
//   "One last game against a 1600 who trots out the Scandinavian, meeting YOUR
//    KING-PAWN with an immediate strike in the center."
//
// — true only from White's chair. The seat was NOT mis-inferred: this file's
// first assertion pins that `inferStudentSideFromName` gets every Scandinavian
// name right. The batch was MIXED, because a Lichess puzzle carries the
// opening's tag whichever side is solving and nothing filtered on that.
//
// The perspective gate cannot catch this — "your king-pawn" is a grammatically
// correct possessive. What is wrong is WHOSE pawn it attributes, and the only
// check for that is that the seat matches the lesson's own side.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { preparePunishFromPuzzle, punishStudentColor, type RawPuzzle } from './openingGenerator';
import { inferStudentSideFromName, resolveOpeningEntry } from './openingDetectionService';
import puzzleData from '../data/puzzles.json';

const PUNISH_THEMES = new Set([
  'mate', 'fork', 'pin', 'skewer', 'sacrifice', 'hangingPiece',
  'attraction', 'deflection', 'kingsideAttack', 'attackingF2F7', 'xRayAttack',
]);

describe('the seat was never the inference — it was the batch', () => {
  it('inferStudentSideFromName gets every Scandinavian name right', () => {
    for (const n of [
      'Scandinavian Defense',
      'Scandinavian Defense: Lasker Variation',
      'Scandinavian Defense: Mieses-Kotroc Variation',
      'Scandinavian Defense: Modern Variation, Gipslis Variation',
    ]) expect(inferStudentSideFromName(n)).toBe('black');
  });
});

describe('the student colour is READ OFF THE BOARD', () => {
  it('is the side to move after the opponent blunders, not the opening tag', () => {
    // Black to move plays a losing move; WHITE solves. Whatever tag this
    // carried, the student in this lesson is White.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
    const c = new Chess(fen);
    expect(c.turn()).toBe('b');
    const lesson = preparePunishFromPuzzle({
      id: 't1', fen, moves: 'd8g5 f3g5', rating: 1500, themes: ['hangingPiece'],
      openingTags: null, popularity: 90, nbPlays: 500,
    });
    expect(lesson).not.toBeNull();
    expect(lesson!.studentColor).toBe('white');
  });

  it('and the other way round on the same shape', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const lesson = preparePunishFromPuzzle({
      id: 't2', fen, moves: 'd1h5 d8h4', rating: 1500, themes: ['fork'],
      openingTags: null, popularity: 90, nbPlays: 500,
    });
    expect(lesson).not.toBeNull();
    expect(lesson!.studentColor).toBe('black');
  });
});

describe('the filter is NOT vacuous — half the corpus really is wrong-seated', () => {
  // A guard that removes nothing is the same as no guard, and reads identical
  // in a green run. This measures what it actually removes.
  it('measures the wrong-seat share over the real puzzle DB', () => {
    const t0 = Date.now();
    const puzzles = puzzleData as unknown as RawPuzzle[];
    const tagsOf = (p: RawPuzzle): string[] => {
      const raw = p.openingTags;
      const list = Array.isArray(raw) ? raw : (raw ?? '').split(/\s+/);
      return list.filter(Boolean).map((t) => t.toLowerCase().replace(/[_-]+/g, ' '));
    };
    // ONE pass over the 15k puzzle DB, not one per opening — this gate runs in
    // ship-check and a slow gate is a gate people stop running.
    const pool = puzzles.filter((p) =>
      p.popularity >= 70 && p.nbPlays >= 80
      && p.themes.some((t) => PUNISH_THEMES.has(t))
      && tagsOf(p).length > 0);
    let right = 0;
    let wrong = 0;
    for (const name of ['Scandinavian Defense', 'Caro-Kann Defense', 'Ruy Lopez', 'Italian Game', 'French Defense']) {
      const entry = resolveOpeningEntry(name);
      if (!entry) continue;
      const seat = inferStudentSideFromName(entry.canonicalName);
      const canon = entry.canonicalName.toLowerCase().split(/[:,]/)[0].trim();
      // Sorted and capped the way the generator itself walks the list —
      // popularity first, stopping early — so the share measured is the share
      // production actually meets, and the gate stays under a second.
      const matching = pool
        .filter((p) => tagsOf(p).some((t) => t.includes(canon) || canon.includes(t)))
        .sort((a, b) => (b.popularity - a.popularity) || (a.rating - b.rating))
        .slice(0, 30);
      for (const p of matching) {
        // `punishStudentColor` rather than the full prepare: the census only
        // needs the seat, and `computePunishFacts` is ~60ms a call.
        const colour = punishStudentColor(p.fen, p.moves.split(/\s+/).filter(Boolean));
        if (!colour) continue;
        if (colour === seat) right += 1; else wrong += 1;
      }
    }
    const total = right + wrong;
    expect(total).toBeGreaterThan(40); // the census has something to measure
    // Measured 2026-09-17 across 33 openings / 2,530 puzzles: 50.8% wrong-seated.
    // The assertion is deliberately loose — the point is that it is a LOT, not
    // a rounding error, so the filter is doing real work.
    expect(wrong / total).toBeGreaterThan(0.15);
    // And it must not take everything, or the stage dies everywhere.
    expect(right).toBeGreaterThanOrEqual(2);
    console.log(`[punish seat] ${wrong}/${total} wrong-seated (${(wrong / total * 100).toFixed(1)}%) across five openings — ${Date.now() - t0}ms`);
  }, 30_000);
});
