# PLAN — Queen's Gambit Masterclass (2026-05-25)

Build the `queens-gambit` masterclass to the LOCKED Vienna keystone standard
(`docs/opening-masterclass-playbook.md` §0.7). White opening (student =
White). Autonomous build per §0.5 — every pick bound to a ground source +
gate; unsure → leave blank / skip / ask.

## Scope decision (David, 2026-05-25)
Asked the scope fork (Slav/Semi-Slav/Catalan each exist as their own
first-class repertoire entries). **David chose: ALL 8 repertoire variations.**
So the tabs are the full repertoire list. A Slav/Catalan TAB here teaches
WHITE's handling from the QG move order (orientation white), distinct from a
future Black-side `slav-defence` / `catalan-opening` masterclass — different
openingId, so the de-dup contract (STEP 9) is satisfied.

- **Main-line pill (showcase):** Classical Mainline → the Orthodox/Capablanca QGD.
- **Tabs:** Exchange · Tartakower · QGA · Slav · Semi-Slav · Catalan · Anti-QGD Bf4.

## Environment notes (this session)
- **ONLY GitHub reachable.** The live Lichess explorer / `api/lichess-explorer`
  proxy returns "Host not in allowlist" — gem mining + deep-theory extension
  go to a **GitHub Actions runner** (open network).
- **Stockfish present** at `/usr/games/stockfish` (offline soundness +
  spine-extension past the DB anchor).
- **Local masters-db** (`public/data/openings-masters-db.json`, 131,895
  positions, 4-field-FEN keyed, frequency-sorted) = the spine source
  (sanctioned, playbook §0.6). It THINS at depth (see open items).
- **Pro-games cache** at `docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json`
  (7.2MB, ~2000 real PGNs) for model games offline.
- Tab ORDER should be amateur-frequency (explorer); firewalled → using
  masters-db frequency as a proxy, **flagged for prod verification**.

## DB-anchored spines (walked from masters-db, `scripts/_qg-spines.mjs`)
Game counts per ply printed by the walker = the audit trail. Status vs the
≥20-ply lessonDepth gate:

| Variation | Plies | Status |
|---|---|---|
| Classical (Orthodox/Capablanca, MAIN pill) | 22 | ✅ full depth, all masters-anchored |
| QGA (Classical, …a6/…b5) | 20 | ✅ full depth |
| Semi-Slav (Meran) | 19 | ⚠ extend ~1–3 ply |
| Slav (main, …dxc4 …Bf5) | 18 | ⚠ extend ~2–4 ply |
| Tartakower | 17 | ⚠ extend ~3–5 ply |
| Catalan (Open, …dxc4) | 15 | ⚠ extend ~5–7 ply |
| Exchange (minority attack) | 13 | ⚠ extend ~7 ply (masters-db dies early) |
| Anti-QGD Bf4 | 10 | ⚠ THIN in masters; re-anchor move order (Harrwitz) or ask |

The local masters-db simply lacks these lines past the listed depth. Two
grounded extension paths (playbook): each past-DB ply must be **masters-backed
(CI explorer) OR engine-sound (local Stockfish)**; the soundness gate (6b/7b)
verifies and baselines deliberate divergences.

## Phased plan
- **P0 — research + scaffold + PLAN** … _in progress_
  - [x] Confirm pick + scope (all 8); confirm tooling (scaffold, Stockfish, miner, pro-cache).
  - [x] Walk DB spines (`_qg-spines.mjs`); 2/8 at full depth.
  - [ ] Extend the 6 short spines to ≥20 ply (Stockfish-sound, masters-backed where CI can reach); re-anchor Anti-QGD Bf4.
  - [ ] `node scripts/scaffold-opening.mjs queens-gambit "Queen's Gambit" white`.
- **P1 — lessons** (`scripts/_qg-content.json` + `_check-beats.mjs` validator + `_gen-qg.mjs`): main + 7 variation lessons, two registers (`say`/`sayShort`), lead-the-eye arrows/highlights. → lessonIntegrity, narrationAccuracy, narrationGrounding, lessonDepth, wlppNarration.
- **P2 — register + tabs**: `registry.ts` (1 line), `index.ts`, `variationTabs.ts` CURATED, `queensGambitMasterclassTabs.ts`, `OpeningDetailPage.tsx` branch. → lessonTabIntegrity, openingWiring.
- **P3 — middlegame plans** (one per tab) in `middlegame-plans.json` + `add-leadeye-to-plans.mjs`. → middlegamePlanner.
- **P4 — gems**: mine on CI runner (amateur explorer) → `punish-gems.json`; hand-author `punishGemNarration.ts`; seed in `mine-punish-gems.mjs`. → punishGems + audit-punish-gems-loop (3-pass).
- **P5 — model games**: curate from pro-cache / CI export (White wins per variation); PROTECTED list. → modelGames-orientation.
- **P6 — manifest + misc**: `opening-manifests.json` floors; `common-mistakes.json` pitfalls; checkpoint quizzes; `BASE_DATA_REVISION` bump.
- **P7 — gates + audits**: `npm run ship-check` green; `AUDIT_OPENING=queens-gambit` walkthrough + punish-gems 3-pass + leadeye + named-traps; route unlock-write check to David.
- **DONE** = lands on `main` + post-deploy audit green (playbook §0.5 Definition of Done).

## Decisions log
- 2026-05-25 — Pick = Queen's Gambit (first 1.d4 masterclass; classical → book-grounded; pillar opening).
- 2026-05-25 — Scope = all 8 repertoire variations (David).
- 2026-05-25 — Classical main pill steered to Orthodox/Capablanca line (NOT the Exchange) so the pill is distinct from the Exchange tab; every steered move verified in masters-db.

## Next-session pickup
Resume at P0: extend the 6 short spines to ≥20 ply via Stockfish (local) +/or
CI explorer mining; re-anchor Anti-QGD Bf4 (the early 4.Bf4 is rare in
masters — try the Harrwitz `…3.Nf3 …Bf4` order or ask David). Then scaffold
and author `_qg-content.json`. `scripts/_qg-spines.mjs` holds the steering map.
