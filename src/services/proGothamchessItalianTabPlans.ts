// Tab-plan resolver for the GothamChess (Levy Rozman) Italian Game pro-rep.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs (STEP 12.5 of the pro-rep doctrine).
//
// The pro entry carries 3 tabs. The Two-Knights kingside plan homes on the
// Giuoco c3-d4 tab (it's the same f4-f5 attacking structure); the Evans
// big-centre plan homes on the Evans tab.

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-italian-evans-style',
    'mp-progothamchess-italian-twoknights-kside',
  ],
  'giuoco piano c3-d4': [
    'mp-progothamchess-italian-evans-style',
    'mp-progothamchess-italian-twoknights-kside',
  ],
  'slow italian d3': ['mp-progothamchess-italian-twoknights-kside'],
  'evans gambit': ['mp-progothamchess-italian-evans-bigcenter'],
};

export function getProGothamchessItalianTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-italian') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
