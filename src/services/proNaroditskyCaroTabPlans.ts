// Tab-plan resolver for the Naroditsky Caro-Kann pro-rep. Per STEP 12.5
// of the pro-rep doctrine: without this, all plans surface only under
// the main opening tab. Each entry maps a variation tab name
// (lowercased) to its plan IDs. Created 2026-05-29 to wire the 3
// newly-added missing-variation plans (Advance Bf5, Panov, d3 Sideline)
// alongside the 7 original plans.

const TAB_PLANS: Record<string, string[]> = {
  'main': [],
  'two knights variation (nc3)': ['mp-pronarocaro-twoknights-b5-coord', 'mp-pronarocaro-two-knights-endgame'],
  "king's indian attack (nf3)": ['mp-pronarocaro-kia-b5-expansion', 'mp-pronarocaro-kia-reti-endgame'],
  'exchange variation (exd5)': ['mp-pronarocaro-exchange-bg4-pin', 'mp-pronarocaro-exchange-endgame'],
  'classical variation (nc3)': ['mp-pronarocaro-classical-kingside-storm', 'mp-pronarocaro-classical-endgame'],
  'fantasy variation (f3)': ['mp-pronarocaro-fantasy-central-break', 'mp-pronarocaro-fantasy-endgame'],
  'modern defense transposition (d4 g6)': ['mp-pronarocaro-modern-trade-and-develop', 'mp-pronarocaro-modern-trans-endgame'],
  'advance variation (3.e5 c5)': ['mp-pronarocaro-advance-knight-reroute', 'mp-pronarocaro-advance-c5-endgame'],
  'advance variation (3.e5 bf5)': ['mp-pronarocaro-advance-bf5-piece-storm', 'mp-pronarocaro-advance-bf5-endgame'],
  'panov-botvinnik attack (4.c4)': ['mp-pronarocaro-panov-queenside-coordination', 'mp-pronarocaro-panov-endgame'],
  'd3 sideline (2.d3)': ['mp-pronarocaro-d3-bishop-trade-pressure', 'mp-pronarocaro-d3-sideline-endgame'],
};

export function getProNaroditskyCaroTabPlanIds(
  openingId: string,
  tabKey: string
): string[] | null {
  if (openingId !== 'pro-naroditsky-caro-kann') return null;
  return TAB_PLANS[tabKey.toLowerCase()] ?? null;
}
