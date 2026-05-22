// §5b grounding gate — every marker endpoint is a square the narration names.
//
// Per playbook §5b: every highlight + every vision-arrow endpoint must be a
// square the annotation actually NAMES (bare `f5` or piece-token `Nf5` or
// SAN capture `fxe5`). The orange move-squares are exempt — they ARE the
// move. middlegamePlanner.test.ts enforces this for PLAN playableLines;
// this gate closes the gap for LESSON beats.
//
// Hole 2 fix (2026-05-22): this used to be VIENNA-ONLY (the comment said
// "Ruy/Pirc can be swept in follow-up"). It now sweeps the WHOLE lesson
// registry (ALL_LESSONS). Ruy/Pirc lessons that pre-date the gate carry
// §5b violations; rather than block, they're parked in BASELINE_VIOLATIONS
// (the shrinking-allowlist pattern from lessonDepth/repertoire-orientation)
// so the gate is GREEN now, surfaces the backlog, and HARD-FAILS any NEW
// violation. The allowlist must SHRINK, never grow — a new opening cannot
// add to it.

import { describe, it, expect } from 'vitest';
import { ALL_LESSONS } from './registry';
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

// Pre-gate backlog (Ruy/Pirc lessons authored before §5b swept them in).
// Keyed by the registry key. Value = exact violation count tolerated. The
// gate fails if a key produces MORE violations than parked here, if a NEW
// key appears, or if a parked key drops to zero (forces cleanup of the
// entry). SHRINK this list; never grow it. Populated from the measurement
// pass — see the report in the PR.
// Measured 2026-05-22 sweeping §5b across the full registry for the first
// time. Vienna = 0 (authored under this gate). Ruy = 50, Pirc = 5 markers
// that lead the eye to a square the narration names by ROLE ("its
// defender", "these two squares", "the doubled c-pawns", "the d-file")
// rather than by coordinate — which the sentence-grained reveal can't
// anchor. Real backlog, not regex noise (verified against the narration
// text). Fix = name the square in the narration, or move the marker.
const BASELINE_VIOLATIONS: Record<string, number> = {
  'The Ruy Lopez — A Master Class': 8,
  'ruy-lopez::Berlin Defense': 5,
  'ruy-lopez::Open Ruy Lopez': 3,
  'ruy-lopez::Marshall Attack': 7,
  'ruy-lopez::Exchange Variation': 9,
  'ruy-lopez::Closed Ruy Lopez (Breyer)': 4,
  'ruy-lopez::Closed Ruy Lopez (Chigorin)': 3,
  'ruy-lopez::Closed Ruy Lopez (Zaitsev)': 4,
  'ruy-lopez::Anti-Marshall (8.a4)': 1,
  'ruy-lopez::Arkhangelsk Variation': 3,
  'fishing-pole': 2,
  'marshall-onlymove': 1,
  'The Pirc Defence — A Master Class': 1,
  'pirc-defence::Classical System': 2,
  'pirc-defence::Fianchetto System': 2,
};

describe('§5b grounding — every arrow + highlight endpoint is grounded in the narration', () => {
  for (const { scope, key, lesson } of ALL_LESSONS) {
    it(`[${scope}] ${key}: markers grounded (or within baseline)`, () => {
      const violations = violationsFor(lesson);
      const allowed = BASELINE_VIOLATIONS[key] ?? 0;
      if (violations.length > allowed) {
        expect(
          violations.length,
          `${key}: ${violations.length} §5b violation(s), baseline allows ${allowed}:\n  ${violations.join('\n  ')}`,
        ).toBeLessThanOrEqual(allowed);
      }
      // Force the allowlist to shrink: a parked entry that's now clean must
      // be removed from BASELINE_VIOLATIONS.
      if (allowed > 0 && violations.length < allowed) {
        expect(
          violations.length,
          `${key}: now has ${violations.length} violations but baseline reserves ${allowed} — lower/remove its BASELINE_VIOLATIONS entry`,
        ).toBe(allowed);
      }
    });
  }
});

// Hole 4 — the lead-the-eye-MISSING defect (David's "shitty work": bare
// move-arrows while the narration talks about squares with nothing pointing
// there). The STRICT inverse ("every named square must have a marker") is
// unusable — 176/264 beats name a square in passing that carries no marker,
// which is fine (you don't paint every square you mention). The defensible,
// low-noise form: a beat whose narration NAMES at least one square must
// carry AT LEAST ONE marker — i.e. no totally-bare beat that names squares
// and leads the eye to none of them. Exactly 1 such beat exists today.
const SQUARE_RE_H4 = /\b[a-h][1-8]\b/;
const BARE_BEAT_BASELINE = new Set<string>([
  'ruy-lopez::Berlin Defense::b4', // names c3/f4/e6, zero markers — Ruy lead-the-eye backlog
]);

describe('lead-the-eye present — a beat that names squares carries ≥1 marker', () => {
  for (const { scope, key, lesson } of ALL_LESSONS) {
    it(`[${scope}] ${key}: no bare named-square beats (or baselined)`, () => {
      const bare: string[] = [];
      for (const beat of lesson.beats) {
        const namesSquare = SQUARE_RE_H4.test(`${beat.say} ${beat.sayShort ?? ''}`);
        const markers = (beat.arrows?.length ?? 0) + (beat.highlights?.length ?? 0);
        if (namesSquare && markers === 0 && !BARE_BEAT_BASELINE.has(`${key}::${beat.id}`)) {
          bare.push(beat.id);
        }
      }
      expect(
        bare,
        `${key}: beat(s) name a square but carry NO arrow/highlight to lead the eye there: ${bare.join(', ')}`,
      ).toEqual([]);
    });
  }
});
