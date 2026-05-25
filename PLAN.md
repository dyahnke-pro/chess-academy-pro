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

## Environment notes
- **2026-05-25 session (zen-tesla):** the egress allowlist DIFFERS from the
  prior session — the `api/lichess-explorer` proxy **IS reachable here** (200,
  live data, both `source=masters` and `source=lichess`). So gem mining +
  deep-theory spine extension run **locally**, no CI round-trip needed. Always
  re-test the proxy per session (playbook); don't trust a stale "firewalled".
- **Stockfish 16** installed via `apt-get install -y stockfish`
  (`/usr/games/stockfish` after install) — offline soundness + spine extension.
- **Local masters-db** (`public/data/openings-masters-db.json`, 131,895
  positions, 4-field-FEN keyed, frequency-sorted) = the spine source
  (sanctioned, playbook §0.6). It THINS at depth (see open items).
- **Pro-games cache** at `docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json`
  (7.2MB, ~2000 real PGNs) for model games offline.
- Tab ORDER should be amateur-frequency (explorer); firewalled → using
  masters-db frequency as a proxy, **flagged for prod verification**.

## DB-anchored spines — ALL 8 at 22 plies (✅ P0 done)
Extended via the LIVE masters explorer (`scripts/_qg-extend.mjs`); every ply
masters-backed (game counts = the audit trail). Final lines:

| Variation | Spine (SAN) |
|---|---|
| Classical (MAIN pill) | d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 |
| Exchange | d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 Nbd7 Qc2 O-O Nge2 Re8 O-O Nf8 f3 Be6 |
| Tartakower | d4 d5 c4 e6 Nc3 Be7 Nf3 Nf6 Bg5 h6 Bh4 O-O e3 b6 Be2 Bb7 Bxf6 Bxf6 cxd5 exd5 b4 c6 |
| QGA | d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Bxc5 Qxd8+ Kxd8 Be2 Ke7 Nbd2 Bd7 b3 Bb5 |
| Slav | d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 Ne5 Nbd7 Nxc4 Qc7 g3 e5 dxe5 Nxe5 Bf4 Nfd7 Bg2 g5 |
| Semi-Slav | d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Qc2 Bd6 Bd3 O-O O-O dxc4 Bxc4 b5 Be2 Bb7 Rd1 Qc7 |
| Catalan | d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4 Bd7 Qxc4 Bc6 Bg5 Bd5 Qc2 Be4 |
| Anti-QGD Bf4 | d4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5 Nh5 Bd3 Nxf4 exf4 b6 b4 a5 a3 c6 |

Notes for lesson authoring: the live explorer's most-played line replaced
several planned sub-lines with the true masters main line (Slav → 11.Ne5
modern main; QGA → early queen trade endgame; Anti-QGD Bf4 = Harrwitz w/ c5
clamp, re-anchor resolved). Revisit the QGA queen-trade spine when authoring —
confirm it best shows White's pull, else re-steer to a queens-on line.

## Progress (2026-05-25, zen-tesla)
- ✅ **P0** spines (all 8 → 22 ply, masters-backed) + scaffold.
- ✅ **P1** lessons: main (Orthodox/Capablanca) + 6 variation lessons (Exchange,
  QGA, Slav, Semi-Slav, Tartakower, Anti-Bf4). Content gates green.
- ✅ **P2** wiring: registry (gate+runtime), CURATED tabs (Classical→main pill,
  Catalan dropped→own class), tab→plan map, OpeningDetailPage branch, repertoire
  pgn → Classical spine, BASE_DATA_REVISION bump. Tab-integrity + wiring green.
- ✅ **P3** 7 middlegame plans (one per tab) + lead-the-eye. Planner gate green.
- ✅ **P6 (partial)** manifest entry (variations 8, plans 7, keyIdeas 4; gems/
  models 0 for now). ship-check green; pushed (commit 5c8c282, PR #669).
- ✅ **Masterclasses tab → White/Black color sub-tabs** (David). QG files under White.
- ✅ **P4** gems: mined 8 (Stockfish+live explorer); hand-narrated the 3 soundest
  (Slav …Nd5, Exchange …b6, QGA …Nc6). Others stay dark (doctrine). Pushed 39dc0e7.
- ✅ **P5** model games: 4 real White wins (Karpov–Short Tartakower, Carlsen–Kramnik
  Exchange, Carlsen–Mamedyarov QGA, Kasparov–Morozevich Slav) via the masters
  game-export proxy; criticalMoments authored; PROTECTED + floor=4. Pushed 9b82372.
- **WHITE queens-gambit class = COMPLETE** (lessons, 6 tabs, 7 plans, 3 gems,
  4 model games, manifest, color sub-tabs). Optional polish remaining: common-
  mistakes pitfalls + checkpoint quizzes (self-hide if absent).
- ⏳ **P7** post-merge audits (G1) once #669 lands on main.
- ⏭ **NEXT classes (David's build order):** qgd (BLACK) → qga (BLACK) →
  catalan-opening (white). Black classes orient black; lessons teach the
  defender's plans. They auto-file into the Masterclasses Black sub-tab.

## NEXT CLASS — QGD (BLACK) — P0 spines done (`scripts/_qgd-extend.mjs`)
Student = BLACK (defending the QGD). 7/8 spines at 22 ply, masters-backed:

| Variation | Spine (SAN) |
|---|---|
| Orthodox (MAIN pill) | d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 |
| Lasker Defense | d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 Ne4 Bxe7 Qxe7 Rc1 c6 Bd3 Nxc3 Rxc3 dxc4 |
| Tartakower | d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 Be2 Bb7 Bxf6 Bxf6 cxd5 exd5 b4 c6 |
| Exchange | d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Bf5 Qf3 Bg6 Bxf6 Qxf6 Qxf6 gxf6 Nf3 Nd7 Nh4 Be7 |
| Ragozin | d4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 Bg5 h6 Bxf6 Qxf6 e3 O-O Rc1 dxc4 Bxc4 c5 O-O cxd4 Ne4 Qe7 |
| Cambridge Springs | d4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 e3 c6 Nf3 Qa5 Nd2 Bb4 Qc2 O-O Be2 c5 O-O cxd4 Nb3 Qb6 |
| Bf4 QGD | d4 d5 c4 e6 Nc3 Nf6 Bf4 Be7 e3 O-O Nf3 Nbd7 c5 Nh5 Bd3 Nxf4 exf4 b6 b4 a5 a3 c6 |

⚠ **Vienna QGD** spine thins in masters at 15 ply (rare sharp …Bb4/…g5 line).
Re-anchor to the mainline Vienna (3.Nf3 …dxc4 4.Nc3) or DROP the tab if it
doesn't clear §0.1 (faced + distinct + student-win game). Decide at authoring.
Note: Orthodox/Tartakower/Bf4 spines mirror the White QG (same line, BLACK
orientation + Black-defensive narration); lessons must be authored fresh for
the black side, not reused. Model games = BLACK wins.

## Phased plan
- **P0 — research + scaffold + PLAN** … _in progress_
  - [x] Confirm pick + scope (all 8); confirm tooling (scaffold, Stockfish, miner, pro-cache).
  - [x] Walk DB spines (`_qg-spines.mjs`); 2/8 at full depth.
  - [x] Extend all 8 spines to 22 ply via LIVE masters explorer (`_qg-extend.mjs`); Anti-QGD Bf4 re-anchored (Harrwitz + c5). Every ply masters-backed.
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
- 2026-05-25 — **STRUCTURE (David): `qgd` and `qga` become their OWN separate masterclasses, oriented BLACK (student defending). `queens-gambit` stays the WHITE class (push c4, handle Black's replies as tabs).** The split is by COLOR/side, not by carving the White opening up. Counts (named, faced, distinct candidate set from the repertoire records): QGD(black) = 8 (Orthodox, Lasker, Tartakower, Cambridge Springs, Ragozin, Vienna, Exchange, Bf4/Harrwitz); QGA(black) = 7 (Classical …c5, Smyslov …a6, Sadler …Bg4, Central 3.e4, Alekhine 4.Nc3, Modern Rd1, Janowski …Qd5). Final tab count per playbook = every line that passes §0.1 (a)–(d), no cap.
- 2026-05-25 — **FINAL (David): build ALL 4 of the QG family as SEPARATE masterclasses, each its own class:** (1) `queens-gambit` — WHITE; (2) `qgd` — BLACK (8 variations); (3) `qga` — BLACK (7 variations); (4) `catalan-opening` — WHITE (own g3 system). Catalan is its OWN class, not a `queens-gambit` tab → drop the "Catalan Transposition" tab from the White QG. Each built to the Vienna keystone standard, one at a time.
- 2026-05-25 — **BUILD ORDER + BLACK PERSPECTIVE (David):** finish the WHITE `queens-gambit` first, THEN build the Black-perspective classes (`qgd`, `qga` — student defending as Black, orientation black per their records), then Catalan (white). The Black classes' lessons orient BLACK (black-at-bottom), narration teaches Black's defensive plans.
- 2026-05-25 — **MASTERCLASSES TAB → COLOR SUB-TABS (David): "place each opening in the correct color tab."** Reorganize `MasterclassesTab` into White / Black sub-tabs; group `getMasterclassOpenings()` by each record's `color`. White: queens-gambit, catalan-opening, ruy-lopez, vienna-game, italian-game, scotch-game. Black: qgd, qga, pirc-defence, caro-kann. Sub-tab placement is data-driven off `color` so a new class auto-files itself. (Small UI change — build alongside the class work.)

## Build status (this session — paused pending structure decisions)
- **P0 done:** all 8 White-QG spines extended to 22 plies via live masters explorer (`scripts/_qg-extend.mjs`); scaffold run.
- **P1 partial:** the WHITE `queens-gambit` MAIN lesson (`src/data/lessons/queensGambit.ts`) is authored — 17 beats, two registers, lead-the-eye markers — and PASSES all 5 content gates (lessonIntegrity, narrationAccuracy, narrationGrounding, lessonDepth, wlppNarration) when registered. It is currently UN-registered in `registry.ts` so the repo stays gate-green while the structure is finalized (registering forces a manifest + tabs that aren't built yet). Re-add the one import + OPENINGS line to resume.
- **Next:** finalize structure (Catalan), then author the 7 White variation lessons, wire (P2), plans/gems/model-games/manifest (P3–P6), gates + audits (P7). Then the separate BLACK `qgd`/`qga` masterclasses.

## Next-session pickup
Resume at P0: extend the 6 short spines to ≥20 ply via Stockfish (local) +/or
CI explorer mining; re-anchor Anti-QGD Bf4 (the early 4.Bf4 is rare in
masters — try the Harrwitz `…3.Nf3 …Bf4` order or ask David). Then scaffold
and author `_qg-content.json`. `scripts/_qg-spines.mjs` holds the steering map.
