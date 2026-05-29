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
  // 2…d5 Open — plans anchored at the 25-ply spine end (Bb5+ Kf8 Nf3)
  // walking the conversion vs Sam Shankland (2934).
  '2…d5 open variation': [
    'mp-pronaroAlapin-d5open-mg',
    'mp-pronaroAlapin-d5open-endgame',
  ],
  // 2…e6 French — plan anchored at the 19-ply spine end (Ng5)
  // walking the Bxh6 sacrifice from vs Niko Theodorou (3131).
  '2…e6 french-style': [
    'mp-pronaroAlapin-e6french-mg',
  ],
  // 2…d6 Mainline — plan anchored at the 17-ply spine end (O-O)
  // walking the Bg5 + Bh4 pin sequence from vs Riley (2984).
  '2…d6 mainline': [
    'mp-pronaroAlapin-d6main-mg',
  ],
  // 2…Nc6 Line — plan anchored at the 20-ply spine end (a3 O-O)
  // walking the Bc2 + Qd3 battery sequence from vs Zanyglobal (2899).
  '2…nc6 line': [
    'mp-pronaroAlapin-nc6-mg',
  ],
  // 2…g6 Hyper-Dragon — no plans authored yet (data supports 3)
  '2…g6 hyper-dragon': [],
  // Spine 4…d6 Bc4 Gambit — no plans authored yet
  'spine 4…d6 bc4 gambit': [],
  // Spine 4…e6 IQP Lines — no plans authored yet
  'spine 4…e6 iqp lines': [],
};

export function getProNaroditskyAlapinTabPlanIds(openingId: string, tabKey: string): string[] | null {
  if (openingId !== 'pro-naroditsky-alapin') return null;
  return PRO_NARODITSKY_ALAPIN_TAB_PLAN_IDS[tabKey] ?? null;
}
