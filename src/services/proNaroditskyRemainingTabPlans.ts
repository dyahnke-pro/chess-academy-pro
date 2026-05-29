// Tab-plan resolvers for the remaining Naroditsky openings (KIA,
// Rossolimo, Najdorf, Alekhine, Ruy Lopez, Jobava London). Per the
// doctrine STEP 12.5 rule: without this, plans surface only under
// the main opening tab. Each entry maps a variation tab name
// (lowercased) to its plan ID(s).

const TAB_PLANS: Record<string, Record<string, string[]>> = {
  'pro-naroditsky-kia': {
    'main': [],
    'g6 modern setup': ['mp-pronaroKIA-symmetric-attack'],
    'd5 kia mainline': ['mp-pronaroKIA-reti-attack'],
    'd4 kid transposition': ['mp-pronaroKIA-kid-transposition'],
  },
  'pro-naroditsky-rossolimo': {
    'main': [],
    'nc6 rossolimo proper': ['mp-pronaroRoss-nc6-maroczy'],
    'e6 open avoidance': ['mp-pronaroRoss-e6-taimanov'],
    'bxd7+ trade': ['mp-pronaroRoss-bd7-conversion'],
  },
  'pro-naroditsky-najdorf': {
    'main': [],
    'be3 english attack': ['mp-pronaroNaj-english-race'],
    'be2 classical': ['mp-pronaroNaj-classical-development'],
    'h3 adams attack': ['mp-pronaroNaj-adams-defense'],
  },
  'pro-naroditsky-alekhine': {
    'main': [],
    'nc3 two knights': ['mp-pronaroAlek-twoknights-equality'],
    'c4 modern main': ['mp-pronaroAlek-modern-development'],
    'nf3 / modern quiet': ['mp-pronaroAlek-modernquiet-conversion'],
  },
  'pro-naroditsky-ruy-lopez': {
    'main': [],
    'berlin defense': ['mp-pronaroRuy-berlin-endgame'],
    'closed with d3': ['mp-pronaroRuy-d3-positional'],
    'steinitz defense': ['mp-pronaroRuy-steinitz-d4'],
  },
  'pro-naroditsky-jobava-london': {
    'main': [],
    'e6 french setup': ['mp-pronaroJob-french-attack'],
    'c6 slav-style': ['mp-pronaroJob-slav-trade'],
    'a6 with ...c5': ['mp-pronaroJob-a6c5-bd3'],
  },
};

export function getProNaroditskyRemainingTabPlanIds(
  openingId: string,
  tabKey: string
): string[] | null {
  const opening = TAB_PLANS[openingId];
  if (!opening) return null;
  return opening[tabKey.toLowerCase()] ?? null;
}
