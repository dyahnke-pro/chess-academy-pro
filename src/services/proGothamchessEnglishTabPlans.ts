// Tab-plan resolver for the GothamChess (Levy Rozman) English Opening pro-rep.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs. Without this, the plans surface only under
// the main opening tab (STEP 12.5 of the pro-rep doctrine).
//
// The pro entry carries 4 tabs. The …c6 Slav plan has no dedicated tab, so it
// homes on the Anti-French (…e6) tab as a related b3/Bb2 structure; the …g6
// Botvinnik plan homes on the Botvinnik tab.

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-eng-g6-botvinnik-storm',
    'mp-progothamchess-eng-c6-slav-g4',
  ],
  'botvinnik system vs kid-setup': ['mp-progothamchess-eng-g6-botvinnik-storm'],
  'symmetric (…e5)': ['mp-progothamchess-eng-e5-reversedsicilian'],
  'anti-french (…e6)': [
    'mp-progothamchess-eng-e6-doublefianchetto',
    'mp-progothamchess-eng-c6-slav-g4',
  ],
  'symmetric (…c5)': ['mp-progothamchess-eng-c5-maroczy'],
};

export function getProGothamchessEnglishTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-english') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
