// Tab-plan resolver for the GothamChess (Levy Rozman) Caro-Kann pro-rep.
// Per STEP 12.5 of the pro-rep doctrine: without this, all plans surface
// only under the main opening tab. Each entry maps a variation tab name
// (lowercased, matching pro-repertoires.json) to its plan IDs.
//
// Created 2026-05-29 to wire the hand-authored middlegame + endgame plans
// (5 middlegame + 3 endgame) alongside the 3 pre-existing Classical/Advance
// plans. The d3-sideline endgame (a real win vs IM Eric Rosen) has no
// dedicated tab in this entry, so it homes on the main line as a
// representative "even the quiet lines convert" endgame.

const TAB_PLANS: Record<string, string[]> = {
  // Main line IS the Classical 4...Bf5 (opening.pgn), so it carries the two
  // Classical counter-race plans + the standalone d3-sideline endgame.
  main: [
    'mp-pro-gothamchess-carokann-c5',
    'mp-pro-gothamchess-carokann-solid',
    'mp-progothamchess-caro-d3-endgame',
  ],
  'classical 4...bf5 (main line)': [
    'mp-pro-gothamchess-carokann-c5',
    'mp-pro-gothamchess-carokann-solid',
  ],
  'classical capablanca 4...bf5 5.ng3 bg6 6.h4': [
    'mp-pro-gothamchess-carokann-c5',
    'mp-pro-gothamchess-carokann-solid',
  ],
  'tartakower / two knights 3...nf6': ['mp-progothamchess-caro-classical-bd6'],
  'two knights 2.nc3 d5 3.nf3 bg4': ['mp-progothamchess-caro-two-knights'],
  'advance variation 3.e5 bf5': ['mp-progothamchess-caro-bf5-trade'],
  'advance variation 3.e5 c5': ['mp-progothamchess-caro-advance-c5'],
  // Exchange: middlegame fianchetto plan only. A true Exchange (non-Panov)
  // endgame anchor is deferred — the cleanest R+B win in the corpus (vs Kobalia
  // 2777) was a long grind without a sharp teachable conversion (empty >
  // confusing, per doctrine).
  'exchange variation 3.exd5': ['mp-progothamchess-caro-exchange-fianchetto'],
  // Panov: the …g6 fianchetto plan hunting the isolani + the b3-bishop trade,
  // and the R+B endgame from his win over GM Bortnyk (2780) — the fianchetto
  // bishop converting against the isolani structure.
  'panov-botvinnik attack 3.exd5 cxd5 4.c4': [
    'mp-progothamchess-caro-panov',
    'mp-progothamchess-caro-panov-endgame',
  ],
  'fantasy variation 3.f3': [
    'mp-progothamchess-caro-fantasy-bd6',
    'mp-progothamchess-caro-fantasy-endgame',
  ],
};

export function getProGothamchessCaroTabPlanIds(
  openingId: string,
  tabKey: string,
): string[] | null {
  if (openingId !== 'pro-gothamchess-caro-kann') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
