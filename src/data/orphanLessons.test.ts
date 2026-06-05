// Orphan-Lesson Gate (David 2026-05-29, locked).
//
// Catches two failure modes that silently mis-route the UI:
//
// 1. VARIATION_LESSONS key without a matching variation in
//    pro-repertoires.json → the lesson is dead code (never reaches the
//    UI). Hit this session with Najdorf Bc4 Sozin: the LessonScript was
//    registered but pro-repertoires.json had only 3 Najdorf variations.
//
// 2. pro-repertoires.json variation without a matching VARIATION_LESSONS
//    key → falls through to the legacy WalkthroughMode (smaller board +
//    eval bar) instead of the consistent bigger-board PlayableLinePlayer.
//
// Both directions must hold. Test walks the LESSON registry +
// pro-repertoires.json and asserts every key→variation and
// variation→key pair lines up.

import { describe, it, expect } from 'vitest';
import { getAllVariationLessonKeys, getVariationLessonScript } from './lessons/index';
import proRepertoires from './pro-repertoires.json' assert { type: 'json' };

interface ProRepEntry {
  id: string;
  variations?: Array<{ name: string }>;
}

const PRO_OPENINGS: ProRepEntry[] = (proRepertoires.openings as ProRepEntry[]).filter(
  (op) => op.id.startsWith('pro-'),
);

describe('orphan-lesson gate — VARIATION_LESSONS ↔ pro-repertoires.json', () => {
  it('every VARIATION_LESSONS key has a matching variation in pro-repertoires.json', () => {
    const orphans: string[] = [];
    for (const key of getAllVariationLessonKeys()) {
      // Keys look like 'pro-naroditsky-kia::vs ...e5 (Reti gambit)'
      const [openingId, variationName] = key.split('::');
      if (!openingId || !variationName) {
        orphans.push(`${key} :: malformed key (expected '<openingId>::<variationName>')`);
        continue;
      }
      // Only enforce on pro-rep openings (the M-side has its own systems).
      if (!openingId.startsWith('pro-')) continue;
      const opening = PRO_OPENINGS.find((op) => op.id === openingId);
      if (!opening) {
        orphans.push(`${key} :: opening '${openingId}' not in pro-repertoires.json`);
        continue;
      }
      const variation = (opening.variations ?? []).find((v) => v.name === variationName);
      if (!variation) {
        orphans.push(
          `${key} :: variation '${variationName}' not in pro-repertoires.json variations[]. Available: [${(opening.variations ?? []).map((v) => `'${v.name}'`).join(', ')}]`,
        );
      }
    }
    expect(orphans).toEqual([]);
  });

  // Baseline of known-orphan (variation in JSON without a lesson) entries.
  // This list can ONLY SHRINK — new orphans cannot be added. As of
  // 2026-06-05 every pro-rep variation in pro-repertoires.json has an
  // authored VARIATION_LESSONS lesson, so the baseline is now EMPTY.
  const BASELINE_MISSING_LESSONS = new Set<string>([]);

  it('every pro-rep variation in pro-repertoires.json has a matching VARIATION_LESSONS key (NEW orphans blocked; baseline shrinks only)', () => {
    const missingLessons: string[] = [];
    for (const opening of PRO_OPENINGS) {
      for (const v of opening.variations ?? []) {
        if (!getVariationLessonScript(opening.id, v.name)) {
          missingLessons.push(`${opening.id}::${v.name}`);
        }
      }
    }
    const novel = missingLessons.filter((k) => !BASELINE_MISSING_LESSONS.has(k));
    expect(novel).toEqual([]);
    // Baseline can only shrink — block growth even if all current
    // entries are still baselined.
    expect(missingLessons.length).toBeLessThanOrEqual(BASELINE_MISSING_LESSONS.size);
  });

  it('baseline orphans only shrink — every baseline entry must still be missing (no stale exemptions)', () => {
    const stale: string[] = [];
    for (const baselineKey of BASELINE_MISSING_LESSONS) {
      const [openingId, variationName] = baselineKey.split('::');
      if (getVariationLessonScript(openingId, variationName)) {
        stale.push(`${baselineKey} — lesson now exists, drop from BASELINE_MISSING_LESSONS`);
      }
    }
    expect(stale).toEqual([]);
  });
});
