// The opening page's auto-start rules, pinned.
//
// 🚨 WHY THIS EXISTS. David 2026-09-03: "after someone clicked on the Ruy Lopez
// it just auto starts the first main line walkthrough. No selecting." The
// measurement behind it: 64 of 67 native App Store users have never finished a
// single WLPP rung, and 32 of 39 spent one ~4-minute session. They reach the
// opening page and then choose nothing, so the choice is what gets removed.
//
// A shortcut that fires when it should not is worse than no shortcut, because it
// overrides what the student actually asked for. Three conditions hold it back,
// and the deep-link one was found by an existing test failing rather than by
// reasoning — auto-play was trampling `?line=marshall`.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, 'OpeningDetailPage.tsx'), 'utf8');

/** The body of the auto-start effect, so assertions cannot match stray code. */
function autoStartEffect(): string {
  const i = SRC.indexOf('const autoStartedRef');
  expect(i, 'the auto-start effect is gone from OpeningDetailPage').toBeGreaterThan(-1);
  const body = SRC.slice(i, i + 1400);
  const end = body.indexOf('}, [opening, viewMode');
  expect(end, 'could not find the end of the auto-start effect').toBeGreaterThan(-1);
  return body.slice(0, end);
}

describe('opening walkthrough auto-start', () => {
  const effect = autoStartEffect();

  it('does not fire when the main-line Watch is already complete', () => {
    // A returning student lands on the page so they can pick Learn or Practice,
    // and never has to sit through or skip a replay.
    expect(effect).toContain("isRungComplete(opening, MAIN_LINE_INDEX, 'watch')");
  });

  it('does not fire when a variation was deep-linked', () => {
    // `?line=marshall` is an explicit request; auto-playing the MAIN line over
    // the top of it answers a question nobody asked.
    expect(effect).toContain("searchParams.get('line')");
  });

  it('does not fire for an opening with no curated lesson', () => {
    // Without a LessonScript the Watch hands off to the coach, and launching
    // someone into a handoff they did not ask for is worse than the page they
    // expected.
    expect(effect).toContain('hasLessonScript(opening.id)');
  });

  it('fires at most once per mount', () => {
    expect(effect).toContain('autoStartedRef.current = true');
    expect(effect).toContain('if (autoStartedRef.current) return');
  });

  it('returns to the opening page when the walkthrough finishes', () => {
    // "when done bounce to the main Ruy page" — and the reload lands first, so
    // the page they return to already shows Watch ticked and Learn promoted.
    expect(SRC).toMatch(/markRungComplete\(opening\.id, MAIN_LINE_INDEX, 'watch'\)[\s\S]{0,200}setViewMode\('detail'\)/);
  });
});

describe('WLPP primary action', () => {
  it('promotes the NEXT rung to a single big primary button', () => {
    // Watch → Learn → Practice → Play as the student progresses. Derived from
    // `ladderNext`, the same source as the "Next: …" hint, so the button and the
    // hint cannot disagree.
    expect(SRC).toContain('const primaryRung = ladderNext');
    expect(SRC).toContain('data-primary');
  });

  it('numbers the four loop steps and leaves Kids Mode unnumbered', () => {
    const dash = readFileSync(resolve(__dirname, '../Dashboard/DashboardPage.tsx'), 'utf8');
    // The four loop sections carry step 1-4, rendered large in place of the
    // icon. Kids Mode is NOT part of the loop and must stay a picture.
    for (const n of [1, 2, 3, 4]) expect(dash).toContain(`step: ${n},`);
    const kids = dash.slice(dash.indexOf('const KIDS_SECTION'));
    expect(kids.slice(0, 400)).not.toContain('step:');
  });

  it('the home tiles do not absorb the column and cut off the page', () => {
    const dash = readFileSync(resolve(__dirname, '../Dashboard/DashboardPage.tsx'), 'utf8');
    const bars = dash.slice(dash.indexOf('{[...SECTIONS, KIDS_SECTION]') - 400, dash.indexOf('{[...SECTIONS, KIDS_SECTION]'));
    // `flex-1 content-center` belonged to the square grid; with five full-height
    // bars it swallowed the column and pushed the Table of Contents out of the
    // scroll area entirely.
    expect(bars).not.toContain('flex-1 content-center');
  });

  it('keeps the other rungs visible rather than hiding the ladder', () => {
    // Focus, without losing the sense of what the opening contains.
    expect(SRC).toContain("primary ? 'grid-cols-3' : 'grid-cols-4'");
  });
});
