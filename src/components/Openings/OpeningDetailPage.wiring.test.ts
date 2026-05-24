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
  'ModelGamesSection',
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

  // The model-game viewer must also be mounted (the section's onSelectGame
  // routes into it). Without this, tapping a game would dead-end.
  it('renders <ModelGameViewer> (the model-game viewer route)', () => {
    expect(source.includes('<ModelGameViewer')).toBe(true);
  });
});
