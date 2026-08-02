// The curated weapons reaching the COACH tab (David 2026-08-01: "we are
// building out the gem/punish lines in coach").
//
// These RUN the conversion over the whole shipped gem set rather than
// typechecking it — `tsc --noEmit` reported green on a real ReferenceError
// earlier in this build, so only execution is evidence.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { gemToPunishLesson, gemPunishLessonsForOpening, gemPunishLessonsForOpeningName } from './gemPunishLessons';
import { getAllPunishGems, isSurfaceableGem } from '../data/lessons/punishGems';

describe('gem → coach punish lesson', () => {
  it('every surfaceable gem converts, and every move replays legally (G3)', () => {
    let converted = 0;
    let withPlayout = 0;
    let forced = 0;
    for (const gem of getAllPunishGems()) {
      if (!isSurfaceableGem(gem)) continue;
      const lesson = gemToPunishLesson(gem);
      if (!lesson) {
        // The ONLY legitimate reason to drop a gem here: the refutation is
        // FORCED, so there is no second legal move to offer. A multiple-choice
        // with one option is not a question. Anything else is a bug.
        const probe = new Chess();
        for (const san of gem.lineMoves.split(/\s+/).filter(Boolean)) probe.move(san);
        probe.move(gem.inaccuracy);
        expect(
          probe.moves().filter((s) => s !== gem.punish).length,
          `${gem.openingId}:${gem.inaccuracy} dropped for a reason other than a forced reply`,
        ).toBe(0);
        forced += 1;
        continue;
      }
      converted += 1;
      if ((lesson.followup?.length ?? 0) > 0) withPlayout += 1;

      // Replay the whole thing exactly as the coach will animate it.
      const chess = new Chess();
      for (const san of lesson.setupMoves) {
        expect(chess.move(san), `${lesson.name}: illegal setup ${san}`).toBeTruthy();
      }
      expect(chess.move(lesson.inaccuracy), `${lesson.name}: illegal inaccuracy`).toBeTruthy();
      // Distractors are alternatives at the moment of CHOICE — legal here, and
      // never the punishment itself (that would put the answer in the options
      // twice).
      for (const d of lesson.distractors) {
        const probe = new Chess(chess.fen());
        expect(probe.move(d.san), `${lesson.name}: illegal distractor ${d.san}`).toBeTruthy();
        expect(d.san).not.toBe(lesson.punishment);
      }
      expect(chess.move(lesson.punishment), `${lesson.name}: illegal punishment`).toBeTruthy();
      for (const f of lesson.followup ?? []) {
        expect(chess.move(f.san), `${lesson.name}: illegal followup ${f.san}`).toBeTruthy();
      }
    }
    expect(converted).toBeGreaterThan(300);
    // The whole point of routing gems here: the line plays ON past the punish.
    expect(withPlayout).toBeGreaterThan(converted * 0.8);
    console.log(`converted ${converted} gems, ${withPlayout} carry a play-out, ${forced} dropped as forced`);
  }, 120000);

  it('every beat speaks — no silent ply reaches the student', () => {
    for (const gem of getAllPunishGems()) {
      if (!isSurfaceableGem(gem)) continue;
      const lesson = gemToPunishLesson(gem);
      if (!lesson) continue;
      expect(lesson.whyBad.trim().length, `${lesson.name}: empty whyBad`).toBeGreaterThan(0);
      expect(lesson.whyPunish.trim().length, `${lesson.name}: empty whyPunish`).toBeGreaterThan(0);
      for (const f of lesson.followup ?? []) {
        expect(f.idea.trim().length, `${lesson.name}: silent followup ${f.san}`).toBeGreaterThan(0);
      }
    }
  }, 120000);

  it('tiers map to the locked trap taxonomy — only a confirmed crush is a red TRAP', () => {
    for (const gem of getAllPunishGems()) {
      if (!isSurfaceableGem(gem)) continue;
      const lesson = gemToPunishLesson(gem);
      if (!lesson) continue;
      expect(lesson.kind).toBe(gem.tier === 'confirmed' ? 'trap' : 'mistake');
    }
  }, 120000);

  it('resolves by opening id and by the name the coach uses', () => {
    expect(gemPunishLessonsForOpening('italian-game').length).toBeGreaterThan(0);
    expect(gemPunishLessonsForOpeningName('Italian Game').length).toBeGreaterThan(0);
    // A variation inherits its family's weapons rather than getting none.
    expect(gemPunishLessonsForOpeningName('Italian Game: Giuoco Pianissimo').length).toBeGreaterThan(0);
    // An opening with no gems returns nothing and lets the puzzle path run.
    expect(gemPunishLessonsForOpeningName('Some Opening That Does Not Exist')).toEqual([]);
    expect(gemPunishLessonsForOpeningName(null)).toEqual([]);
    // The stage is bounded — a well-mined opening must not dump 15 lessons.
    expect(gemPunishLessonsForOpeningName('Italian Game').length).toBeLessThanOrEqual(5);
  // 30s, not the 5s default: each call replays whole gem lines through
  // chess.js and the set grows with every mining pass.
  }, 30000);
});

// David 2026-08-02: "Learn with coach cannot teach traps in x openings. Wire
// that in. Should be gem lines." The stage generator already preferred gems —
// but the NAME→id join was a plain lowercase compare, and `repertoire.json`
// writes British while the coach resolves American off the Lichess DB. So a
// request for the Caro-Kann or Scandinavian traps found none of their gems and
// fell through to the weaker puzzle path, while the French found all of theirs.
describe('gemPunishLessonsForOpeningName — joins on the opening, not the spelling', () => {
  it('finds the same weapons either side of the Defence/Defense split', () => {
    for (const [british, american] of [
      ['Caro-Kann Defence', 'Caro-Kann Defense'],
      ['Scandinavian Defence', 'Scandinavian Defense'],
      ['French Defence', 'French Defense'],
    ]) {
      const b = gemPunishLessonsForOpeningName(british);
      const a = gemPunishLessonsForOpeningName(american);
      expect(b.length, `${british} should have weapons`).toBeGreaterThan(0);
      expect(a.map((l) => l.name)).toEqual(b.map((l) => l.name));
    }
  });

  it('tolerates a missing apostrophe', () => {
    expect(gemPunishLessonsForOpeningName('Kings Gambit').length)
      .toBe(gemPunishLessonsForOpeningName("King's Gambit").length);
  });

  it('still returns nothing for an opening with no gems', () => {
    expect(gemPunishLessonsForOpeningName('Nonexistent Opening')).toEqual([]);
    expect(gemPunishLessonsForOpeningName(null)).toEqual([]);
  });
});
