import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { _SUBLINE_NARRATION } from './sublineNarration';
import { SUBLINE_NARRATION_E4E5 } from './sublineNarrationE4E5';
import { SUBLINE_NARRATION_E4OTHER } from './sublineNarrationE4Other';
import { SUBLINE_NARRATION_D4FLANK } from './sublineNarrationD4Flank';
import { isResolvableSource } from '../narrationSources';
import sublinesData from '../course-sublines.json';
import type { CourseSubline } from '../../services/openingCourse';

// Gate for HAND-AUTHORED subline narration (David 2026-06-17: "these are hand
// authored"). Holds authored entries to the masterclass bar: every entry binds
// to a REAL subline in course-sublines.json, the line is legal, every beat lands
// on a real ply, vision-arrow origins sit on real pieces (lead-the-eye), Learn
// cues are ≤8 words, and every source resolves. Board-CLAIM accuracy (no "the
// f6-knight" when f6 is empty) is hand-verified by the author; this gate seals
// the structural contract so an authored entry can never silently drift off its
// data.

const byOpening = sublinesData as Record<string, Record<string, CourseSubline[]>>;

function findSubline(openingId: string, varIndex: string, trigger: string, atPly: number): CourseSubline | null {
  const list = byOpening[openingId]?.[varIndex] ?? [];
  return list.find((s) => s.triggerMove === trigger && s.atPly === atPly) ?? null;
}

const entries = Object.entries(_SUBLINE_NARRATION);

// Duplicate-key guard across the three parallel-session group maps. The merged
// map in sublineNarration.ts is built by object-spread, which SILENTLY keeps the
// last map's value on a key collision and drops the other group's work — and the
// authored-entry tests below only see the survivor, so they can never catch it.
// This asserts the three maps are disjoint, failing loudly with the offending
// key + groups. Owned by the D4FLANK (last/largest) group; the other group files
// must not touch it.
describe('no duplicate keys across group maps', () => {
  it('each subline key is authored by exactly one group', () => {
    const maps = {
      E4E5: SUBLINE_NARRATION_E4E5,
      E4OTHER: SUBLINE_NARRATION_E4OTHER,
      D4FLANK: SUBLINE_NARRATION_D4FLANK,
    };
    const seen = new Map<string, string>();
    for (const [group, map] of Object.entries(maps)) {
      for (const key of Object.keys(map)) {
        expect(seen.has(key), `dup key ${key} in ${group} and ${seen.get(key)}`).toBe(false);
        seen.set(key, group);
      }
    }
  });
});

describe('hand-authored subline narration', () => {
  it('has at least one authored entry', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const [key, narration] of entries) {
    describe(key, () => {
      // key = `${openingId}::${varIndex}::${trigger}@${atPly}`
      const m = /^(.+)::(\d+)::(.+)@(\d+)$/.exec(key);
      it('key is well-formed', () => expect(m).not.toBeNull());
      if (!m) return;
      const [, openingId, varIndex, trigger, atPlyStr] = m;
      const atPly = Number(atPlyStr);
      const subline = findSubline(openingId, varIndex, trigger, atPly);

      it('binds to a real subline in course-sublines.json', () => {
        expect(subline, `no subline ${trigger}@${atPly} in ${openingId} var ${varIndex}`).not.toBeNull();
      });
      if (!subline) return;

      it('the line is legal from the start', () => {
        const c = new Chess();
        for (const san of subline.moves) expect(() => c.move(san)).not.toThrow();
      });

      it('intro is present', () => {
        expect(narration.intro?.say?.length).toBeGreaterThan(0);
      });

      it('intro cue is ≤ 8 words', () => {
        const cue = narration.intro.sayShort;
        if (cue) expect(cue.trim().split(/\s+/).length).toBeLessThanOrEqual(8);
      });

      it('every beat lands on a real ply, with ≤8-word cues', () => {
        for (const bt of narration.beats ?? []) {
          expect(bt.atMove, `atMove ${bt.atMove} out of range`).toBeGreaterThanOrEqual(0);
          expect(bt.atMove).toBeLessThan(subline.moves.length);
          expect(bt.say.length).toBeGreaterThan(0);
          if (bt.sayShort) expect(bt.sayShort.trim().split(/\s+/).length).toBeLessThanOrEqual(8);
        }
      });

      it('vision-arrow origins sit on a real piece (lead-the-eye)', () => {
        for (const bt of narration.beats ?? []) {
          if (!bt.arrows?.length) continue;
          const c = new Chess();
          for (let i = 0; i <= bt.atMove; i++) c.move(subline.moves[i]);
          for (const a of bt.arrows) {
            expect(c.get(a.from as Parameters<typeof c.get>[0]), `arrow from empty ${a.from} at move ${bt.atMove}`).toBeTruthy();
          }
        }
      });

      it('every source resolves', () => {
        for (const src of narration.sources ?? []) expect(isResolvableSource(src), `unresolvable ${src}`).toBe(true);
      });
    });
  }
});
