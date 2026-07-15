# Naroditsky opening buildout + coach "what to play against X" recommender (David 2026-07-15)

Two linked work streams from David's session:
1. **Build the missing Naroditsky openings — soundly, no mistakes.**
2. **Fix the coach so it RECOMMENDS a line to play against an opponent opening,
   grounded in Naroditsky's repertoire and backed by statistics.**

## The coach limitation (root cause, from the 2026-07-15 screenshot)
- "What should I play against the Pirc?" → coach answered *"the best move is e4…
  White +0.6"* — the **best-move interception fired on a repertoire question**
  (position eval, not a recommendation).
- "Which opening vs the KID and why?" → coach deflected to *"recurring mistakes
  in vienna game"* — a **weakness/plan non-answer**.

Root cause: **there is no "counter-repertoire recommendation" intent or grounded
computer.** The question falls through to `explainBestMoveGrounded` or the
weakness path. The stats engine EXISTS (the "0% vs Elephant Gambit over 8 games"
bubble comes from the opening-matchup/weakness computers) — it's just not wired
to a recommend-a-line capability.

## The fix — a grounded counter-repertoire recommender (G0-compliant)
The LLM decides nothing; it voices facts computed in code, through `voiceFacts`.

1. **New intent** (`src/coach/questionIntents.ts`, thesaurus pattern):
   `counter-repertoire` — "what should I play against the Pirc", "which opening
   vs the KID and why", "how do I meet the Caro", "what do you recommend against
   X". Must be classified BEFORE the best-move interception so it isn't hijacked.
2. **New data: `src/data/counter-repertoire.json`** — maps each opponent opening
   → the line the app recommends the student play, grounded in Naroditsky's
   actual repertoire (his pro-rep white anti-lines + the anti-openings set):
   `{ "pirc": { recommend: "pro-naroditsky-anti-pirc", why: "...", statSource } , "kings-indian-defence": {...}, ... }`.
   Each entry points at a REAL built opening (Gate: every target resolves to a
   registered lesson — no dangling recommendation).
3. **New grounded computer** `assembleCounterRepertoireAnswer(opponentOpening)`
   (`src/services/groundedAnswer.ts`, pure leaf): returns
   `{ recommendedOpeningName, routeToLesson, naroditskyStat, userMatchupStat }`.
   - **Naroditsky stat** = his win-rate in the recommended line, computed from the
     committed game references (`public/data/pro-game-references.json`) or the
     re-pullable corpus — "he scores 78% with this across 45 games".
   - **User matchup stat** = the student's own score vs the opponent opening (the
     SAME source as the Elephant-Gambit bubble) — "plugs your 13% hole".
   - Sources: `data:pro-game-references` + `data:your-games`. No invented content.
   - **🔒 MULTI-RECOMMENDATION + STYLE-MATCH (David 2026-07-15):** when the map
     carries MORE THAN ONE recommendation for an opponent opening (e.g. a sharp
     attacking line AND a solid positional line), the computer returns BOTH, each
     tagged with a `styleTag` ('aggressive'|'sharp'|'solid'|'positional'|
     'tactical'). The student's own style profile is computed by AGGREGATING
     `gameStyleClassifier.classifyGameStyle` across their analyzed games (an
     existing Stockfish-grounded engine — eval swings + mistake ratios per game;
     aggregate = modal style + counts). The answer then names both lines but
     RECOMMENDS the style-matched one, citing the style stat: "Both work: X
     (sharp) and Y (solid). Your games skew sharp (14 of 20), so start with X."
     Style-agnostic when the profile has too few analyzed games (< ~5) — then
     present both neutrally. All selection logic is code; the LLM only phrases.
4. **Wire** into `coachService`/`dispatchCoachTurn` so the intent routes to the
   computer → `voiceFacts` phrases it. Add a `Review my games` / `Learn this line`
   affordance routing to the recommended opening's WLPP page.
5. **Gate** the best-move interception: a `counter-repertoire` classification
   suppresses `isBestMoveQuestion`.
6. **Tests** (the thesaurus + gate pattern): `questionIntents` cases for the new
   phrasings; `groundedAnswer.test` for the computer; a routing test that "what
   should I play against the Pirc" no longer returns a best-move answer.

## Where new openings live (the data model — answer to "where do we put these")
Each Naroditsky opening is the STEP 1-15 G9 build, landing in:
- `src/data/pro-repertoires.json` — entry `pro-naroditsky-<x>` (spine pgn,
  variations, traps, warnings, sources).
- `src/data/lessons/proNaroditsky<X>.ts` + `...Variations.ts` — the hand-authored
  Watch/Learn `LessonScript`s (**the star — G9.3 Gate A**), registered in
  `src/data/lessons/index.ts` (`LESSONS` + `VARIATION_LESSONS`).
- `src/data/middlegame-plans.json` — middlegame + `-endgame` plans.
- `src/data/model-games.json` — 3-5 real student-side WINS per variation.
- `public/data/pro-game-references.json` — breadth layer (STEP 11.5, via
  `build-game-references.mjs`) so the coach teaches from his real games.
- `src/data/common-mistakes.json` — pitfalls; `src/data/punish-gems.json` — gems.
- Bump `PRO_DATA_REVISION` in `src/services/dataLoader.ts`.
- Registered in the runtime `LESSONS` map (not `registry.ts` — current pro-rep
  placement). Renders through the SAME `OpeningDetailPage` as masterclasses (G9).
- **Also add a `counter-repertoire.json` entry** so the coach can recommend it.

## Soundness guarantee ("make these without mistakes")
Structural, not best-effort — every line is:
- **Moves from his real games (chess.js-validated) + theory DB, never memory (G3).**
- **Stockfish-verified at the terminus** (soundness sweep — no line worse than
  ≈ −1.0 for the student except honest gambit showcases).
- **Board-accuracy gated** (`narrationAccuracy` rejects any claim untrue on the
  board — the "pins the knight with no knight" class).
- Run through the full G9 gate roster (`proRepLessonCoverage` Gate A,
  `variationMiddlegameDepth` Gate B, continuity Gate C, orientation, sources,
  `proRepNarrationVoice`) + `ship-check`.
- **When a line/idea isn't fully verifiable from his games/theory → STOCKFISH
  is the verification rung BEFORE leaving it blank (David 2026-07-15: "Use
  stockfish to help if this happens").** The ladder: (1) ground in his real
  games + theory DB; (2) if thin, engine-verify the line with Stockfish (the
  sanctioned verification tool, expressly not a banned "bot") — best-play
  playout, quiet-end eval from the student's side, same tiering as the gem
  doctrine; ship it labeled by what the engine PROVED (sound / positional edge),
  never claiming game-derived depth that isn't there; (3) only if the engine
  can't confirm soundness either → blank / skip / flag. Empty > generic >
  invented still holds — Stockfish just adds a real rung above "empty."

## Sequencing
- **Phase 1 — the recommender (highest leverage, fixes the visible bug NOW):**
  intent + `counter-repertoire.json` + computer + stats, wired to the openings we
  ALREADY have (11 Naroditsky + anti-openings). Immediately makes "what to play
  against X" answer correctly with his stats, for existing coverage.
- **Phase 2 — content builds, top-down by his teaching emphasis** (from
  `naroditsky-video-corpus-gap.md`): Scotch/Belgrade (20 vids) → Scandinavian →
  French → Philidor → Smith-Morra → London systems → Four Knights/Glek → Vienna →
  English → Grünfeld → QGD → the Pirc/Modern Bh6/d5 line David flagged → … Each a
  full sound G9 build with game references, each added to `counter-repertoire.json`.

Both phases feed the one recommender.
