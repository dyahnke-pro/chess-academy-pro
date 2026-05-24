import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// "Live-wiring" gate. The model-games section was once fully built, tested,
// and mounted NOWHERE — every interactive audit was green because audits test
// what's wired, not what SHOULD be. This gate is the cheap insurance against
// that class: it asserts OpeningDetailPage actually RENDERS each masterclass
// section component (a JSX `<Component` usage in the source), so a section
// can't silently go orphaned again.
//
// If you intentionally remove a section, update this list in the same commit —
// the friction is the point (a conscious decision, not a silent orphan).

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, 'OpeningDetailPage.tsx'), 'utf8');

// Sections that MUST render on the masterclass detail page.
const REQUIRED_SECTIONS = [
  'VariationTabs',
  'ClassicWisdomSection',
  'CheckpointQuiz',
  'MiddlegamePlansSection',
  'EndgamePlansSection',
  'CommonMistakesSection',
  'MasterclassCoachChat',
  'MasteryRing',
];

describe('OpeningDetailPage live-wiring — masterclass sections are mounted', () => {
  for (const name of REQUIRED_SECTIONS) {
    it(`renders <${name}>`, () => {
      expect(
        source.includes(`<${name}`),
        `OpeningDetailPage no longer renders <${name}>. If that's intentional, remove it from REQUIRED_SECTIONS; otherwise it has been orphaned (built but mounted nowhere) — wire it back in.`,
      ).toBe(true);
    });
  }

  // KNOWN GAP (2026-05-24): ModelGamesSection / ModelGameViewer consume
  // model-games.json + enforce the "student-side winning" guard but are
  // currently mounted NOWHERE (the renderer is orphaned; the DATA still feeds
  // the coach via loadModelGamesForLive). Wiring the renderer back into the
  // masterclass page is pending (David approved it). Once mounted, add
  // 'ModelGamesSection' to REQUIRED_SECTIONS above so it can't regress.
  it('documents ModelGamesSection as a pending wire-in (not yet mounted)', () => {
    expect(source.includes('<ModelGamesSection')).toBe(false);
  });
});
