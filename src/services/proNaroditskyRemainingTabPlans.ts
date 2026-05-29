// Tab-plan resolvers for the remaining Naroditsky openings (KIA,
// Rossolimo, Najdorf, Alekhine, Ruy Lopez, Jobava London). Per the
// doctrine STEP 12.5 rule: without this, plans surface only under
// the main opening tab. Each entry maps a variation tab name
// (lowercased) to its plan IDs (now 2 per variation per David's
// 2026-05-29 directive — "Always attempt for 2").

const TAB_PLANS: Record<string, Record<string, string[]>> = {
  'pro-naroditsky-kia': {
    'main': [],
    'g6 modern setup': ['mp-pronaroKIA-symmetric-attack', 'mp-pronaroKIA-symmetric-e5push'],
    'd5 kia mainline': ['mp-pronaroKIA-reti-attack', 'mp-pronaroKIA-reti-nc4'],
    'd4 kid transposition': ['mp-pronaroKIA-kid-transposition', 'mp-pronaroKIA-pirc-nh4'],
  },
  'pro-naroditsky-rossolimo': {
    'main': [],
    'nc6 rossolimo proper': ['mp-pronaroRoss-nc6-maroczy', 'mp-pronaroRoss-nc6-b4push'],
    'e6 open avoidance': ['mp-pronaroRoss-e6-taimanov', 'mp-pronaroRoss-e6-ne5'],
    'bxd7+ trade': ['mp-pronaroRoss-bd7-conversion', 'mp-pronaroRoss-bd7-attack'],
  },
  'pro-naroditsky-najdorf': {
    'main': [],
    'be3 english attack': ['mp-pronaroNaj-english-race', 'mp-pronaroNaj-english-bxh6'],
    'be2 classical': ['mp-pronaroNaj-classical-development', 'mp-pronaroNaj-classical-nb6'],
    'h3 adams attack': ['mp-pronaroNaj-adams-defense', 'mp-pronaroNaj-adams-counter'],
  },
  'pro-naroditsky-alekhine': {
    'main': [],
    'nc3 two knights': ['mp-pronaroAlek-twoknights-equality', 'mp-pronaroAlek-twoknights-trade'],
    'c4 modern main': ['mp-pronaroAlek-modern-development', 'mp-pronaroAlek-modern-nb4'],
    'nf3 / modern quiet': ['mp-pronaroAlek-modernquiet-conversion', 'mp-pronaroAlek-quiet-d5break'],
  },
  'pro-naroditsky-ruy-lopez': {
    'main': [],
    'berlin defense': ['mp-pronaroRuy-berlin-endgame', 'mp-pronaroRuy-berlin-bd2'],
    'closed with d3': ['mp-pronaroRuy-d3-positional', 'mp-pronaroRuy-d3-flank'],
    'steinitz defense': ['mp-pronaroRuy-steinitz-d4', 'mp-pronaroRuy-steinitz-e5push'],
  },
  'pro-naroditsky-jobava-london': {
    'main': [],
    'e6 french setup': ['mp-pronaroJob-french-attack', 'mp-pronaroJob-french-qg4'],
    'c6 slav-style': ['mp-pronaroJob-slav-trade', 'mp-pronaroJob-slav-rad1'],
    'a6 with ...c5': ['mp-pronaroJob-a6c5-bd3', 'mp-pronaroJob-a6c5-rad1'],
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
