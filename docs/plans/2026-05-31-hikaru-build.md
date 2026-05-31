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

---
## HIKARU COMPLETE (2026-05-31) — all 5 openings + variation voice
All 5 data-discovered openings built to G9.1 shape + hand-authored variation voice:
- Nimzo-Larsen 1.b3 (main + 7 var), Grand Prix/Closed Sicilian (main + 3 var),
  Réti (main + 3 var), Modern 1...g6 (main + 4 var), Caro-Kann (main + 3 var).
- 25 lessons total, all gates green (board-accuracy, coverage Gate A, depth Gate B,
  voice G9.4, sources). Shipped to main.

### Gems: re-checked (David: "gems are always checked — amateurs play these lines")
First pass mined 0 from the curated variation pgns — WRONG conclusion. Per-node engine
re-audit (every anchored opponent node, Stockfish-graded) found the real cause: Hikaru's
repertoire curates the QUIET mainline (`…Bf5`, `…Bg4`), so the variation pgns walk equal
lines. The gems live in the OPPONENT's amateur side-tries the pgns never visit — exactly
where Naroditsky's/Gotham's Caro gems came from (Fantasy f3, h4-lunge, dxc5). Added
`EXTRA_WALK` seeds to `mine-punish-gems.mjs` (the common dubious tries the student FACES),
re-mined → **6 real gems**, all engine-verified + DB-anchored + masters-vetoed + narrated:
- Caro-Kann ×5 — Fantasy `dxe5`/`Nxd4`→…Qh4+ attacks (confirmed +1.0/+1.1/+1.2), the
  `Ne5` lunge (positional +0.8), Two Knights `Neg5` rim-hunt (positional +0.7).
- Closed Sicilian ×1 — Black's `…Nf6` into the f-pawn → `e5!` tempo + towering centre
  (confirmed +1.0).
- Pirc/Modern ×0 — Black's solid `…a6/…b5` setups hold vs the Austrian/150 tries (honest empty).
- Nimzo-Larsen / Réti ×0 — STRUCTURAL: 1.b3 anchors only ~5 plies in the Lichess opening
  DB (Hikaru's `…e3` leaves book at move 5), Réti-into-b3 only 3. Below the gem
  spine-anchor gate (≥6, G3) — no DB anchor = no gem, correctly enforced, NOT a bug.

**Rule for future solid-system pro builds:** a positional repertoire's gems live in the
opponent's side-tries, not the curated mainline. When a pro's variation pgns mine 0, seed
`EXTRA_WALK` with the common dubious opponent moves the student will face BEFORE concluding
"no gems." Every gem is still DB-anchored + masters-vetoed + engine-graded — the seed only
directs the walk.

### Endgame opportunity (next): Nimzo-Larsen e5-main / nf6 / g6 variations carry
R+minor+P endgame data in their deep-build files — author per the locked endgame rule
(real game → transition FEN → conversion). Pirc/Modern + Caro are middlegame/positional
(self-hide where no decisive ending). Same honest scope as the other pros.
