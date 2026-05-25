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

## DB-anchored spines — LOCKED (`scripts/_qg-spines.mjs`)
All 8 reach ≥20 plies: masters-anchored as deep as the local masters-db goes
(game counts printed per ply = audit trail), then Stockfish-extended (depth 16)
where it thins — every engine-extended ply shows a small balanced White edge
(+0.06..+0.52), so no spine drifts into a forced sequence.

| Variation | Masters ply | Total | Line |
|---|---|---|---|
| Classical (Orthodox/Capablanca, MAIN pill) | 22 | 22 | `d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3` |
| QGA | 20 | 20 | `d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Qb8` |
| Semi-Slav (Meran) | 19 | 20 | `d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7 O-O a6 e4 c5` |
| Slav (main, …Bf5) | 18 | 20 | `d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O` |
| Tartakower | 17 | 20 | `d4 d5 c4 e6 Nc3 Be7 Nf3 Nf6 Bg5 h6 Bh4 O-O e3 b6 Be2 Bb7 Bxf6 Bxf6 cxd5 exd5` |
| Anti-QGD Harrwitz (5.Bf4) | 16 | 20 | `d4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 Nbd7 c5 Nh5 Bd3 Nxf4 exf4 c6 O-O b6` |
| Catalan (Open) | 15 | 20 | `d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4 Nc6 Qxc4 Qd5 Nbd2 Rd8` |
| Exchange | 13 | 20 | `d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 O-O Nf3 Nbd7 Qc2 h6 Bh4 Re8` |

- **Anti-QGD Bf4 re-anchored to the Harrwitz Attack** (1.d4 d5 2.c4 e6 3.Nf3
  Nf6 4.Nc3 Be7 5.Bf4 — 10,906 master games at the Bf4 position). The repertoire's
  literal early-4.Bf4 is rare (166g); Harrwitz IS "Early Bf4 System" properly anchored.
- **Exchange spine** lands in the standard Qc2/Bh4 setup; the minority-attack
  push (b4–b5–bxc6) is the Exchange's identity and will live in its MIDDLEGAME
  PLAN (P3), with the lesson naming the plan — masters-db died at ply 13 so the
  thematic push isn't on the main spine (refine the tail toward Rab1/b4 during
  P1 if Stockfish keeps it sound, else teach it in the plan).

## Phased plan
- **P0 — research + scaffold + PLAN** … _spines locked; scaffold next_
  - [x] Confirm pick + scope (all 8); confirm tooling (scaffold, Stockfish, miner, pro-cache).
  - [x] Walk DB spines (`_qg-spines.mjs`); all 8 now ≥20 ply (masters + Stockfish-sound tail).
  - [x] Re-anchor Anti-QGD Bf4 → Harrwitz Attack.
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
