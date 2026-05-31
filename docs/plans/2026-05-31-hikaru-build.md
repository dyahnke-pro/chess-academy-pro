# Hikaru Nakamura Pro-Rep — BUILD PLAN (2026-05-31)

David's pick of pro deferred to me → Hikaru. His rationale (locked): "Hikaru is
the best blitz/rapid player in the world — it would be a mistake to discount those
games as valid play. But use them cautiously." So: blitz/rapid IS valid elite play
(don't filter the games out), but apply STATISTICAL caution — lean on frequency +
volume + opponent strength + engine-eval, never a one-off bullet move as theory.

## STEP 1 — DATA MINING (DONE)
Fetched 68,554 games (data/sources/hikaru-chesscom/, 150 monthly files, gitignored).
Discovery script: scripts/pro-repertoire/_discover-hikaru.cjs (frequency-rank by
color over 68,282 RATED games). His REAL repertoire (frequency = his actual choice):

### WHITE (build these)
1. **Nimzo-Larsen Attack 1.b3** — 7,546 games (21.9%), 84% — his SIGNATURE #1 weapon
2. **Réti / KIA (Nf3 + g3)** — 4,859 (14.1%), 79%
3. **Closed / Grand Prix Sicilian (e4 c5 Nc3)** — 2,388 (6.9%), 86%
4. **1.d3 (Mengarini / "Hikaru's d3")** — 1,600 (4.7%), 87% — genuine signature oddball
5. (vs-Black-defences fold into the above white systems)

### BLACK (build these)
1. **Pirc / Modern** — 5,926 (17.5%), 83% — his main answer to 1.e4
2. **1...e5 (Open Games)** — 2,974 (8.8%), 63% [lower win = sharper; build carefully]
3. **Caro-Kann** — 1,735 (5.1%), 76%
4. **King's Indian / Grünfeld** (under "vs d4") — pull the real split next

## STEP 2-15 — per §G9.2 procedure (the locked playbook), per opening:
- extract-opening-tree.mjs + pick-model-games.mjs → spine (most-played, MIN_BRANCH ≥5,
  eval-verified — the CAUTION rail: verify each spine move with engine + strong-opp games)
- deep-build-data.mjs per variation → middlegame patterns + endgame breakdown
- author lessons (2 registers, no move-number prefixes per G9.4, lead-the-eye)
- mine-punish-gems.mjs (add hikaru seeds) → narrate
- extract-endgames.cjs → endgames where his games reach real endings
- model games (his wins vs strong opp), pitfalls, sources
- register in LESSONS map + pro-repertoires.json + bump PRO_DATA_REVISION
- gates green (ship-check) → push main → 3-instrument audit

## NEXT-SESSION PICKUP
Hikaru player metadata ALREADY exists in pro-repertoires.json (id:hikaru). 0 openings
built yet. Start with the **Nimzo-Larsen (1.b3)** — his biggest, most characterful,
most distinctive-from-Levy/Naroditsky weapon. Run extract-opening-tree.mjs hikaru
nimzo-larsen first (add it to the OPENINGS map with minPrefix ['b3']).

---
## NIMZO-LARSEN — DATA COMPLETE (STEP 2-4 done, 2026-05-31)
Tree: 7,481 games, 87.3%. 8 variation tabs deep-built (data/sources/hikaru-deep/
nimzo-larsen-*.json — spine + endgameTypeBreakdown + topModelGames each):

| tab | games | spine reaches | endgame data | model games |
|---|---|---|---|---|
| e5-main | 1315 | move 12 | R+minor+P (2), minor+P | 3 |
| d5      | 1830 | move 8  | (middlegame) | 4 |
| nf6     | 1701 | move 9  | R+minor+P (1) | 3 |
| c5      | 415  | move 8  | Q+P (2), minor+P | 5 |
| b6      | 389  | move 7  | (middlegame) | 3 |
| g6      | 300  | move 8  | R+minor+P (2) | 4 |
| e6      | 287  | move 9  | R+P (1) | 4 |
| d6      | 191  | move 5  | R+minor+P (1) | 5 |

Main spine: 1.b3 e5 2.Bb2 Nc6 3.e3 Nf6 4.Bb5 Bd6 5.Na3 Na5 6.Be2 a6 7.c4 O-O
8.Nc2 Nc6 9.d4 exd4 10.exd4 Re8 11.Nf3 Bf8 12.d5 — reaches a real middlegame.
Voice corpus: data/sources/hikaru-voice/per-opening/nimzo-larsen.md.

## PIRC/MODERN — DATA COMPLETE (tree extracted)
5,503 games, 86.1%. Spine 1.e4 g6 2.d4 Bg7 3.Nc3 a6 4.Be3 b5 5.Qd2 Bb7 6.f3 d6
7.h4 h5 8.Nh3 e6 9.Ng5 — his signature Modern/hippo hybrid (...a6/...b5). Variation
tabs: vs Nc3, vs Nf3, vs c3, vs c6-setups. Voice: pirc-modern.md. Deep-build next.

## AUTHORING (next — data all in hand, no more mining):
Per §G9.2 STEP 7+: author Nimzo-Larsen main lesson (12-beat, the b2-bishop story
from the voice corpus) + 7 variation lessons + middlegame plans (the data spines)
+ gems (run mine-punish-gems with hikaru seeds) + endgames (e5-main/nf6/g6 R+minor+P
from real games) + model games (his wins, already picked) + pitfalls + register +
pro-repertoires.json entry + PRO_DATA_REVISION bump. Then gates + ship + audit.
