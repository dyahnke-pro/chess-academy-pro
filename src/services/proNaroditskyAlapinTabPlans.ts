// Tab → middlegame-plan map for the Naroditsky Alapin pro-rep build.
// Keys: 'main' (the 2...Nf6 spine) + the variation tab names, lower-
// cased. MUST match the variation.name field in
// src/data/pro-repertoires.json under pro-naroditsky-alapin.
//
// Plans without a variation home (none yet) fall through to the
// empty state on their tab — David 2026-05-28 "empty > generic >
// invented". Add new variation-keyed plans here when authored.

export const PRO_NARODITSKY_ALAPIN_TAB_PLAN_IDS: Record<string, string[]> = {
  // Main spine (2…Nf6) — plans anchored at the FULL 32-ply spine end
  // (where the opening actually finishes), walking real middlegame +
  // endgame play from his game vs FaustinoOro (2971). Hand-written
  // narration per move. Rebuilt 2026-05-28 after David caught both
  // bugs (auto-generated narration + mid-opening anchors).
  main: [
    'mp-pronaroAlapin-nf6main-mg',
    'mp-pronaroAlapin-nf6main-endgame',
  ],
  '2…d5 open variation': [
    'mp-pronaroAlapin-d5open-mg',
    'mp-pronaroAlapin-d5open-endgame',
  ],
  '2…e6 french-style': [
    'mp-pronaroAlapin-e6french-mg',
    'mp-pronaroAlapin-e6french-endgame',
  ],
  '2…d6 mainline': [
    'mp-pronaroAlapin-d6main-mg',
    'mp-pronaroAlapin-d6main-endgame',
  ],
  '2…g6 hyper-dragon': [
    'mp-pronaroAlapin-g6dragon-mg',
    'mp-pronaroAlapin-g6dragon-endgame',
  ],
  '2…nc6 line': [
    'mp-pronaroAlapin-nc6-mg',
    'mp-pronaroAlapin-nc6-endgame',
  ],
  'spine 4…d6 bc4 gambit': [
    'mp-pronaroAlapin-spined6-mg',
    'mp-pronaroAlapin-spined6-endgame',
  ],
  'spine 4…e6 iqp lines': [
    'mp-pronaroAlapin-spinee6-mg',
    'mp-pronaroAlapin-spinee6-endgame',
  ],
};

export function getProNaroditskyAlapinTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-naroditsky-alapin') return null;
  return PRO_NARODITSKY_ALAPIN_TAB_PLAN_IDS[tabKey] ?? null;
}
