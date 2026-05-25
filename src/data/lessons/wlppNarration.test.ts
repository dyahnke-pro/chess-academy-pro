import { describe, it, expect } from 'vitest';
import { sanToSpeech } from '../../utils/sanToSpeech';
import { lessonToPlayableLine } from './index';
import { ALL_LESSONS } from './registry';
import { CARO_KANN_LESSON } from './caroKann';
import { CARO_VARIATION_LESSONS } from './caroKannVariations';
import { CARO_TRAP_LESSONS, getCaroTrapPlayableLine } from './caroKannTrapLessons';
import { getPunishGemsForOpening, gemToPlayableLine, type PunishGem } from './punishGems';
import type { LessonScript, PlayableMiddlegameLine } from '../../types';

// WLPP narration contract gate + text dump (David 2026-05-23):
//   Watch    = personally-authored prose narration (beats / annotations).
//   Learn    = TTS move DICTATION only ("Knight to f 3") — no prose.
//   Practice = silent (no narration) — enforced structurally in
//              PlayableLinePlayer (the guided/Watch speak paths don't fire).
//   Play     = the Play-with-Coach room (OpeningPlayMode), locked to opening.
// This covers every WLPP surface touched today: the Caro masterclass (main +
// variations), the Caro named trap, and the mined punish-gems.
//
// Run `npx vitest run src/data/lessons/wlppNarration.test.ts` to print the
// dump (the spoken text for every mode) so it can be eyeballed without voice.

interface Surface {
  title: string;
  /** Authored Watch narration, in order (every beat's spoken line). */
  watch: string[];
  /** The Learn/Practice teaching line. */
  line: PlayableMiddlegameLine;
}

function fromLesson(lesson: LessonScript): Surface {
  const line = lessonToPlayableLine(lesson);
  return {
    title: lesson.title,
    watch: lesson.beats.map((b) => b.say).filter(Boolean),
    // Should never be null for an authored lesson; assert below.
    line: line as PlayableMiddlegameLine,
  };
}

function fromTrap(id: string): Surface {
  const lesson = CARO_TRAP_LESSONS[id];
  return {
    title: lesson.title,
    watch: lesson.beats.map((b) => b.say).filter(Boolean),
    line: getCaroTrapPlayableLine(id) as PlayableMiddlegameLine,
  };
}

function fromGem(gem: PunishGem): Surface {
  const line = gemToPlayableLine(gem) as PlayableMiddlegameLine;
  return {
    title: `Gem — ${gem.openingId}: punish ${gem.inaccuracy} with ${gem.punish}`,
    watch: line.annotations.filter(Boolean),
    line,
  };
}

const surfaces: Surface[] = [
  fromLesson(CARO_KANN_LESSON),
  ...Object.values(CARO_VARIATION_LESSONS).map(fromLesson),
  ...Object.keys(CARO_TRAP_LESSONS).map(fromTrap),
  ...getPunishGemsForOpening('caro-kann').map(fromGem),
  ...getPunishGemsForOpening('ruy-lopez').map(fromGem),
  ...getPunishGemsForOpening('pirc-defence').map(fromGem),
];

describe('WLPP narration contract — Watch authored / Learn moves-only / Practice silent', () => {
  it('prints the spoken-text dump for every WLPP surface (eyeball without voice)', () => {
    const out: string[] = [];
    for (const s of surfaces) {
      out.push(`\n━━━ ${s.title} ━━━`);
      out.push('  WATCH (authored narration):');
      if (s.watch.length === 0) out.push('    (none)');
      s.watch.forEach((w, i) => out.push(`    ${i + 1}. ${w}`));
      out.push('  LEARN (TTS — moves only):');
      s.line.moves.forEach((m, i) => out.push(`    ${i + 1}. "${sanToSpeech(m)}"   [${m}]`));
      out.push('  PRACTICE: (silent — no narration)');
      out.push('  PLAY: Play-with-Coach room, locked to this opening.');
    }
    console.log(out.join('\n'));
    expect(surfaces.length).toBeGreaterThan(0);
  });

  for (const s of surfaces) {
    describe(s.title, () => {
      it('Watch carries authored prose narration', () => {
        expect(s.watch.length, 'no authored Watch narration').toBeGreaterThan(0);
        // Authored prose names squares/pieces/ideas — i.e. it is not just a
        // bare SAN echo. Every Watch line is more than one word.
        for (const w of s.watch) {
          expect(w.trim().split(/\s+/).length, `Watch line too thin: "${w}"`).toBeGreaterThan(2);
        }
      });

      it('Learn dictation is moves-only (clean spoken form, no SAN symbols, no prose)', () => {
        expect(s.line, 'no Learn line').toBeTruthy();
        expect(s.line.moves.length).toBeGreaterThan(0);
        for (const m of s.line.moves) {
          const spoken = sanToSpeech(m);
          expect(spoken, `empty dictation for ${m}`).toBeTruthy();
          // No raw SAN symbols leak into speech (+ → "check", # → "checkmate",
          // = handled, x → "takes").
          expect(spoken, `SAN symbol leaked: "${spoken}"`).not.toMatch(/[+#=x]/);
          // Spoken form, not a bare SAN token like "Nf3"/"Qa5".
          expect(spoken, `bare SAN not spelled out: "${spoken}"`).not.toMatch(/^[KQRBN][a-h]?x?[a-h][1-8]/);
        }
      });
    });
  }
});

// ── Learn short-cue length contract (David 2026-05-24) ──────────────────────
// The narration SETTING picks which authored variation Learn speaks: FULL →
// the beat's full `say`; LIMITED → the short `sayShort` cue. A cue must be a
// terse "move + 3-5 word echo" (≤8 words), NOT a re-read of the lecture.
// Enforced per opening; an opening is GRANDFATHERED only until its legacy long
// cues are rewritten — then remove it here so the gate enforces it. The 38
// future openings (not grandfathered) must comply from day one. This is the
// gate that was missing — the old contract only checked move-dictation form
// and never inspected sayShort, so cues drifted to 11-19 words unnoticed.
const CUE_WORD_CAP = 8;
const GRANDFATHERED_OPENINGS = new Set<string>([
  // Legacy openings with long cues, pending rewrite (shrink this list as each
  // is tightened — see docs/plans/2026-05-22-app-ux-todo.md):
  // ruy-lopez — DONE 2026-05-24.
  // pirc-defence — DONE 2026-05-24.
  // caro-kann — DONE 2026-05-24.
  // vienna-game — DONE 2026-05-24: all main + variation + trap cues ≤8 words.
]);

describe('Learn short-cue length — sayShort is a terse cue, not a lecture', () => {
  const overByOpening = new Map<string, string[]>();
  for (const { openingId, key, lesson } of ALL_LESSONS) {
    for (const beat of lesson.beats) {
      const cue = beat.sayShort?.trim();
      if (!cue) continue;
      // Count real words — a standalone em-dash / hyphen separating the move
      // from its echo ("Nd5 — fork the queen") isn't a word.
      const words = cue.split(/\s+/).filter((w) => !/^[—–-]+$/.test(w)).length;
      if (words > CUE_WORD_CAP) {
        const list = overByOpening.get(openingId) ?? [];
        list.push(`${key} [${beat.id}] (${words}w): "${cue}"`);
        overByOpening.set(openingId, list);
      }
    }
  }
  const openingIds = [...new Set(ALL_LESSONS.map((l) => l.openingId))];

  it(`non-grandfathered openings: every Learn cue (sayShort) ≤ ${CUE_WORD_CAP} words`, () => {
    const offenders: string[] = [];
    for (const oid of openingIds) {
      if (GRANDFATHERED_OPENINGS.has(oid)) continue;
      offenders.push(...(overByOpening.get(oid) ?? []));
    }
    expect(
      offenders,
      'Over-long Learn cues — tighten each to the move + a 3-5 word echo (≤8 words)',
    ).toEqual([]);
  });

  it('grandfather list only names real opening ids (shrink it as cues are tightened)', () => {
    const stale = [...GRANDFATHERED_OPENINGS].filter((id) => !openingIds.includes(id));
    expect(stale, 'GRANDFATHERED_OPENINGS has ids with no lessons — remove them').toEqual([]);
  });

  it('grandfather list is SEALED empty — no new cue-cap exemptions (David 2026-05-25)', () => {
    // The cue-cap escape hatch is closed. Every opening's Learn cues must be
    // ≤8 words; a future build cannot grandfather its way past the cap.
    expect(GRANDFATHERED_OPENINGS.size, 'No new grandfather exemptions — tighten the cues to ≤8 words instead').toBe(0);
  });

  // Both registers must be authored: a beat with full Watch prose (say) must
  // also carry a short Learn cue (sayShort). Otherwise Learn falls to bare
  // move-dictation for that beat — the regression we just fixed. Intermediate
  // moves inside a multi-move beat legitimately have no say AND no cue; this
  // only requires a cue where a say exists.
  it('every beat with a Watch say also has a Learn cue (both registers authored)', () => {
    const missing: string[] = [];
    for (const { key, lesson } of ALL_LESSONS) {
      for (const beat of lesson.beats) {
        if (beat.say?.trim() && !beat.sayShort?.trim()) missing.push(`${key} [${beat.id}]`);
      }
    }
    expect(missing, 'Beats with a Watch say but no Learn cue — author a ≤8-word sayShort').toEqual([]);
  });
});
