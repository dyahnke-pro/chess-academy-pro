// Tab → middlegame-plan map for the Naroditsky Alapin pro-rep build.
// Keys: 'main' (the 2...Nf6 spine) + the variation tab names, lower-
// cased. MUST match the variation.name field in
// src/data/pro-repertoires.json under pro-naroditsky-alapin.
//
// Plans without a variation home (none yet) fall through to the
// empty state on their tab — David 2026-05-28 "empty > generic >
// invented". Add new variation-keyed plans here when authored.

export const PRO_NARODITSKY_ALAPIN_TAB_PLAN_IDS: Record<string, string[]> = {
  // Main spine (2...Nf6) — exd6 en passant + Bc4 f7 pressure
  main: [
    'mp-pronaroAlapin-exd6-enpassant',
    'mp-pronaroAlapin-bc4-f7-pressure',
  ],
  // 2…d5 Open — Nb5 fork + Be3 buildup
  '2…d5 open variation': [
    'mp-pronaroAlapin-d5open-nb5-fork',
    'mp-pronaroAlapin-d5open-be3-pressure',
  ],
  // 2…e6 French — O-O castle + dxc5 trade
  '2…e6 french-style': [
    'mp-pronaroAlapin-e6french-oo-castle',
    'mp-pronaroAlapin-e6french-dxc5-trade',
  ],
  // 2…d6 Mainline — h3 prophylaxis + g4 prep
  '2…d6 mainline': [
    'mp-pronaroAlapin-d6main-h3-prophylaxis',
  ],
  // 2…Nc6 Line — Nc3 tempo + Bd3 buildup
  '2…nc6 line': [
    'mp-pronaroAlapin-nc6-bd3-buildup',
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
