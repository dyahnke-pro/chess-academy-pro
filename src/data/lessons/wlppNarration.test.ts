import { describe, it, expect } from 'vitest';
import { sanToSpeech } from '../../utils/sanToSpeech';
import { lessonToPlayableLine } from './index';
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
