# Glek System → standalone masterclass (David 2026-07-03)

**Ask (verbatim):** *"Just make the Glek system its own masterclass. I feel
that's a complex enough opening to stand alone."*

## Why
David searched "Glek System" and landed on the raw Lichess ECO reference page
`c47-four-knights-game-glek-system` (Watch + book readings only — no tabs, plans,
model games, mistakes). The Glek content he built last night lives on the
`four-knights-game` masterclass (Glek tab), not that bare twin. His call: promote
the Glek to its own masterclass so the standalone page is rich.

## Design (grounded — masters explorer, all spines reach the middlegame)
- **id** `glek-system` · eco C47 · White. Main pill = 4...Bc5 calm line
  (Bg2 / d3 / O-O / Be3 trade / Nh4→f5). Reuses the gate-passing gl1–gl5 narration.
- **Variation tabs** (masters freq after 4.g3 — Bc5 884g[pill] · d5 663g · Bb4 182g · g6 52g):
  - **Central 4...d5** — `…d5 exd5 Nxd5 Bg2 Nxc3 bxc3 Bc5 O-O O-O Re1 Qf6 d3 Bb6` (masters spine)
  - **Pin 4...Bb4** — `…Bb4 Bg2 O-O O-O d6 d3 Bg4 h3 Bh5 g4 Bg6 Bg5 h6 Bh4` (proxy spine)
  - **Fianchetto 4...g6** — `…g6 Bg2 Bg7 O-O O-O d3 d6 h3 h6 Be3 Be6 Qd2 Kh7 d4 exd4 Nxd4` (proxy spine)
- **Middlegame plans (3):** `mp-gleksystem-bc5-f5` (Nh4→f5 on the main), `mp-gleksystem-f4trap`
  (Ne2/f4 bishop-trap — re-key), `mp-gleksystem-d5-outpost` (d5 structure — re-key).
- **Model games:** Mamedyarov–Kramnik 2013 1-0 (re-key) + more if sourced. studentSide white, wins only.
- **Common mistakes (≥3):** early …O-O fork-trick (Nxe5/d4), premature …f5 pawn ram, …d6 blunder (f4-trap).
- **Gems:** 0 — the f4-trap is +0.6 (below the +1.0 crush bar → lesson point, not a weapon-gem). Honest 0.
- **Endgame:** self-hides unless a real Glek game reaches a classifiable ending.

## Wiring checklist
- [x] spines grounded (masters/lichess), all reach middlegame
- [x] repertoire.json entry + reconcileBaseRepertoire insert-new-entries + bump BASE_DATA_REVISION
- [x] opening-manifests.json floors (variations 3 · plans 3 · modelGames 1 · keyIdeas 4)
- [x] variationTabs CURATED['glek-system'] + glekSystemMasterclassTabs service + wire in OpeningDetailPage
- [x] glekSystem.ts (main) + glekSystemVariations.ts (3) + register in lessons/index.ts
- [x] middlegame-plans.json (3: bc5-f5, f4trap, d5-outpost) · model-games.json (Mamedyarov 1-0) · common-mistakes.json (3)
- [x] OPENING_ID_ALIASES c47-four-knights-game-glek-system → glek-system + search dedupe
- [x] modelGames-orientation PROTECTED += glek-system
- [x] gates: all curated content gates + typecheck + lint green (glekSystemMasterclassTabs.test added)

## Status: BUILT — gates green. Post-deploy 3-instrument audit owed after it lands on prod.
