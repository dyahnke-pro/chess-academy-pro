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

// The Watch rung must never fall back to legacy WalkthroughMode (G9.3 Gate A).
//
// That component narrates from `src/data/annotations/` — LLM-bulk-generated
// text that is never board-checked, and the source of the "Bg5 pins the knight"
// claim on a board with no knight. Every masterclass and pro opening now has a
// curated LessonScript, so the only openings that could reach the fallback are
// raw ECO rows; those hand off to the coach's DB-narration engine instead.
//
// WalkthroughMode is still legitimately mounted for the ~38 trap / warning
// lines that have no curated trap lesson yet — so this gate is deliberately
// narrow: it pins the MAIN and VARIATION Watch branches, not the whole file.
describe('OpeningDetailPage — Watch never falls back to the ungated walkthrough', () => {
  it('routes an uncurated main/variation Watch to the coach, not <WalkthroughMode>', () => {
    const branch = source.slice(
      source.indexOf("if (viewMode === 'walkthrough' || viewMode === 'variation-walkthrough')"),
    );
    expect(
      branch.length > 0,
      'the main/variation Watch fallback branch is gone — update this gate deliberately',
    ).toBe(true);
    // Look only at the branch body, up to its closing brace.
    const body = branch.slice(0, branch.indexOf('\n  }') + 4);
    expect(
      body.includes('<WalkthroughMode'),
      'the main/variation Watch rung mounts legacy WalkthroughMode again — that is the ungated auto-annotation path (G9.3 Gate A). Hand off to /coach/teach instead.',
    ).toBe(false);
    expect(
      body.includes('/coach/teach'),
      'the uncurated Watch fallback should hand off to the coach walkthrough engine',
    ).toBe(true);
  });
});
