// Tab-plan resolver for the GothamChess (Levy Rozman) Vienna Game pro-rep.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs. Without this, the plans surface only under
// the main opening tab (STEP 12.5 of the pro-rep doctrine).
//
// The pro entry carries 3 tabs. The gambit sub-lines (…f5, …Nc6, accepted)
// home on the Gambit Main Line tab as the related sharp plans; the quiet Bc4
// plan homes on the Quiet tab; the …Nc6+…Bc5 tab takes the quiet plan too.

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-vie-gambit-main-attack',
    'mp-progothamchess-vie-nc6-forcing',
  ],
  'vienna gambit main line': [
    'mp-progothamchess-vie-gambit-main-attack',
    'mp-progothamchess-vie-nc6-forcing',
    'mp-progothamchess-vie-f5-buildup',
    'mp-progothamchess-vie-accepted-space',
  ],
  'vienna quiet (bc4 + d3)': ['mp-progothamchess-vie-quiet-bc4-na4'],
  'vienna with …nc6 + …bc5': ['mp-progothamchess-vie-quiet-bc4-na4'],
};

export function getProGothamchessViennaTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-vienna') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
