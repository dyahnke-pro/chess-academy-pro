// §5b grounding gate for Vienna lesson beats.
//
// Per playbook §5b: every highlight + every vision-arrow endpoint must be
// a square the annotation actually NAMES (bare `f5` or piece-token `Nf5`
// or SAN capture `fxe5`). The orange move-squares are exempt — they ARE
// the move.
//
// middlegamePlanner.test.ts enforces this for PLAN playableLines. This
// gate closes the gap for LESSON beats (Vienna only, for now — Ruy/Pirc
// can be swept in follow-up and added here once clean).
//
// Why a hard gate: the original Vienna shipped with 57 §5b violations
// because the only existing gate (lessonIntegrity.test.ts) checks
// legality + line-of-sight, not narration grounding. Adding this gate
// catches the violation class at author-time.

import { describe, it, expect } from 'vitest';
import { VIENNA_GAME_LESSON } from './vienna';
import { VIENNA_VARIATION_LESSONS } from './viennaVariations';
import { VIENNA_TRAP_LESSONS } from './viennaTrapLessons';
import type { LessonScript } from '../../types';

// Same regexes as narrationSegments.ts squaresInText — must stay in
// lockstep so the gate matches what the live LessonPlayer picks up.
const SQUARE_RE = /\b([a-h][1-8])\b/g;
const PIECE_SAN_RE = /\b[NBRQK][a-h]?[1-8]?x?([a-h][1-8])/g;
const PAWN_CAPTURE_RE = /\b[a-h]x([a-h][1-8])/g;

function squaresInText(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(PIECE_SAN_RE)) out.add(m[1]);
  for (const m of text.matchAll(PAWN_CAPTURE_RE)) out.add(m[1]);
  for (const m of text.matchAll(SQUARE_RE)) out.add(m[1]);
  return out;
}

function violationsFor(lesson: LessonScript): string[] {
  const out: string[] = [];
  for (const beat of lesson.beats) {
    const named = squaresInText(`${beat.say} ${beat.sayShort ?? ''}`);
    for (const a of beat.arrows ?? []) {
      if (!named.has(a.to)) {
        out.push(`beat ${beat.id}: vision-arrow endpoint '${a.to}' (from ${a.from}->${a.to}) is not a square the narration names`);
      }
    }
    for (const h of beat.highlights ?? []) {
      if (!named.has(h.square)) {
        out.push(`beat ${beat.id}: highlight on '${h.square}' is not a square the narration names`);
      }
    }
  }
  return out;
}

describe('§5b grounding — every marker endpoint is a square the narration names', () => {
  const allLessons: { name: string; lesson: LessonScript }[] = [
    { name: VIENNA_GAME_LESSON.title, lesson: VIENNA_GAME_LESSON },
    ...Object.entries(VIENNA_VARIATION_LESSONS).map(([k, l]) => ({ name: `Variation: ${k.split('::')[1]}`, lesson: l })),
    ...Object.entries(VIENNA_TRAP_LESSONS).map(([k, l]) => ({ name: `Trap: ${k}`, lesson: l })),
  ];
  for (const { name, lesson } of allLessons) {
    it(`${name}: every arrow + highlight endpoint is grounded in the narration`, () => {
      const violations = violationsFor(lesson);
      expect(violations, violations.join('\n  ')).toEqual([]);
    });
  }
});
