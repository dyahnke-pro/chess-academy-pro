import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 🔒 THE BOTTOM TABS MIRROR THE HOME SCREEN (David 2026-09-05: "adjust the tabs
// at bottom of screen to match the order of the Home Screen").
//
// The home screen NUMBERS its sections 1-4 and prints the loop they belong to —
// "Learn it → play it → find the holes → drill them shut". That makes Openings,
// Coach, Weaknesses, Tactics a sequence the user is being taught, not an
// arbitrary list. The nav ran Tactics before Weaknesses, contradicting the
// numbered steps the same user had just read on the page above it.
//
// Nothing coupled the two, which is exactly how they drifted apart. This reads
// both files and fails if they disagree again — including if someone reorders
// the HOME screen and forgets the nav, which is the likelier direction.

const SRC = join(process.cwd(), 'src');
const layout = readFileSync(join(SRC, 'components/ui/AppLayout.tsx'), 'utf8');
const dashboard = readFileSync(join(SRC, 'components/Dashboard/DashboardPage.tsx'), 'utf8');

/** Nav labels, in declaration order, from the NAV_ITEMS array. */
function navLabels(): string[] {
  const start = layout.indexOf('const NAV_ITEMS: NavItem[] = [');
  expect(start, 'NAV_ITEMS not found — did the array get renamed?').toBeGreaterThan(-1);
  const body = layout.slice(start, layout.indexOf('\n];', start));
  return [...body.matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1]);
}

/** The four numbered home-screen sections, in the order they are declared in
 *  the page's section array — which is the order they render. */
function homeSectionLabels(): string[] {
  const wanted = new Set(['Openings', 'Coach', 'Weaknesses', 'Tactics']);
  return [...dashboard.matchAll(/label:\s*'([^']+)'/g)]
    .map((m) => m[1])
    .filter((l) => wanted.has(l));
}

describe('the bottom tabs follow the home screen', () => {
  it('finds all four numbered sections on the home screen', () => {
    // If this fails the home screen was restructured; fix the extractor rather
    // than deleting the coupling below.
    expect(homeSectionLabels()).toHaveLength(4);
  });

  it('orders the nav exactly as the home screen orders its numbered sections', () => {
    const home = homeSectionLabels();
    // Guard against passing vacuously: an empty extraction would make the
    // comparison below trivially true, which is how a broken coupling test
    // reports green forever.
    expect(home).toHaveLength(4);
    const navInHomeOrder = navLabels().filter((l) => home.includes(l));
    expect(navInHomeOrder).toEqual(home);
  });

  it('puts Home first, then the four sections — that is the phone tab bar', () => {
    // MOBILE_NAV_ITEMS is NAV_ITEMS.slice(0, 5), so the first five decide the
    // phone tabs. Kids Mode and Settings sit past the cut deliberately (Kids
    // Mode is reachable from its own home-screen row).
    expect(navLabels().slice(0, 5)).toEqual(['Home', 'Openings', 'Coach', 'Weaknesses', 'Tactics']);
    expect(layout).toContain('NAV_ITEMS.slice(0, 5)');
  });
});
