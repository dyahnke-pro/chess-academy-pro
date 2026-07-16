// Tab-plan resolver for the GothamChess (Levy Rozman) English Opening pro-rep.
// Maps each variation tab (lowercased, matching pro-repertoires.json) to its
// hand-authored middlegame plan IDs. Without this, the plans surface only under
// the main opening tab (STEP 12.5 of the pro-rep doctrine).
//
// The pro entry carries 5 tabs; the …c6 Slav-style line got its own tab
// (2026-07-16) and its plan homes there.

const TAB_PLANS: Record<string, string[]> = {
  main: [
    'mp-progothamchess-english-botvinnik-main',
    'mp-progothamchess-english-flank-attack',
  ],
  'botvinnik system vs kid-setup': [
    'mp-progothamchess-english-botvinnik-main',
    'mp-progothamchess-english-flank-attack',
  ],
  'symmetric (…e5)': ['mp-progothamchess-eng-e5-reversedsicilian'],
  'anti-french (…e6)': ['mp-progothamchess-eng-e6-doublefianchetto'],
  'symmetric (…c5)': ['mp-progothamchess-eng-c5-maroczy'],
  'vs …c6 (slav-style)': ['mp-progothamchess-eng-c6-slav-g4'],
};

export function getProGothamchessEnglishTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-english') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
