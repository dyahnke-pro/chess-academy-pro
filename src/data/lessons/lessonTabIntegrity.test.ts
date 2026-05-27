import { describe, it, expect } from 'vitest';
import repertoireData from '../repertoire.json';
import proRepertoireData from '../pro-repertoires.json';
import { buildVariationTabs } from '../../services/variationTabs';
import { getLessonScript, getVariationLessonScript } from './index';
import { FIRST_CLASS_OPENING_IDS } from './registry';

// DUP-LINE GATE (David 2026-05-24): "We need a gate to prevent the dup lines
// in future builds." A masterclass variation TAB resolves its lesson by the
// repertoire variation's NAME (getVariationLessonScript). If a curated tab is
// added without a matching lesson key (a name mismatch), the lookup misses and
// the tab silently falls back to the MAIN-line lesson — the app "works" (a
// board mounts) but teaches the WRONG, duplicate content (e.g. the old Caro
// main==Classical dup; a Ruy tab showing "The Ruy Lopez — A Master Class").
//
// This build-time gate proves, for every masterclass opening, that EVERY tab
// buildVariationTabs surfaces resolves to a NON-NULL, DISTINCT lesson — no
// fallback-to-main, no two tabs sharing a lesson. The interactive audit
// (audit-punish-gems-loop) catches it at runtime too; this catches it before
// it ever ships.

interface RepOpening { id: string; variations?: Array<{ name: string }> }
// repertoire.json is an array of opening records; pro masterclasses live in
// pro-repertoires.json (David 2026-05-27) — merge so pro tabs resolve too.
const OPENINGS = [
  ...(repertoireData as unknown as RepOpening[]),
  ...((proRepertoireData as unknown as { openings: RepOpening[] }).openings),
];

describe('masterclass tabs resolve to distinct lessons — no dup/fallback lines', () => {
  for (const id of FIRST_CLASS_OPENING_IDS) {
    const op = OPENINGS.find((o) => o.id === id);

    it(`${id}: every variation tab has its own distinct lesson`, () => {
      expect(op, `${id} not found in repertoire.json`).toBeTruthy();
      if (!op) return;
      const main = getLessonScript(id);
      expect(main, `${id} has no main-line lesson`).toBeTruthy();

      const tabs = buildVariationTabs(id, op.variations ?? []);
      expect(tabs.length, `${id} surfaces no variation tabs`).toBeGreaterThan(0);

      // Title → the tab that owns it. Seed with the main line so a variation
      // that falls back to the main lesson is flagged as a duplicate.
      const owner = new Map<string, string>();
      owner.set(main!.title, 'Main line');

      for (const tab of tabs) {
        const variation = (op.variations ?? [])[tab.index];
        expect(variation, `${id} tab "${tab.label}" points at a missing variation index ${tab.index}`).toBeTruthy();
        if (!variation) continue;

        const lesson = getVariationLessonScript(id, variation.name);
        // No lesson → the tab falls back to the main line = a duplicate line.
        expect(
          lesson,
          `${id} tab "${tab.label}" (variation "${variation.name}") has NO backing lesson — it would fall back to the main-line lesson (DUPLICATE). Add a lesson keyed "${id}::${variation.name}" or drop the tab.`,
        ).toBeTruthy();
        if (!lesson) continue;

        const clash = owner.get(lesson.title);
        expect(
          clash,
          `${id} tab "${tab.label}" loads the SAME lesson ("${lesson.title}") as "${clash}" — duplicate line.`,
        ).toBeUndefined();
        owner.set(lesson.title, tab.label);
      }
    });
  }
});
