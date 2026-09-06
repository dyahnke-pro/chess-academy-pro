# Move-Fundamentals — "fundamental first, then the rest of teaching"

David 2026-09-06: the hint "why" was weak — "develops the knight to f3, eyeing
d4 and e5" names the *mechanical effect* (which squares the piece hits), not the
transferable **fundamental**. His calls:

- **Woven** phrasing (fundamental leads the sentence, no `Label:` tag).
- **Fundamental first, then the rest of the teaching.**
- **Compute which fundamentals matter most; if two are just as important, state
  both.**
- **Wire it into ALL coach surfaces.**

## Design — one leaf, every surface

`src/services/moveFundamentals.ts` is a pure board-grounded (G3) leaf that, for a
strong move, computes the **positive fundamental(s) it serves**, ranked by
importance on THIS board, and renders them woven + fundamental-first. It imports
only chess.js + `seeGain` + `classifyPhase` (no `groundedAnswer`) so there is no
import cycle.

Fundamentals (each with a board test + phase-scaled weight):

| id | fires when | weight |
|---|---|---|
| king-safety | the move castles | 92 (45 in endgame) |
| outpost | minor lands where no pawn can evict it (advanced) | 84 |
| development | minor comes off the home rank into play | 55 + 6·(home minors) |
| center | central pawn advance / piece newly eyeing the center | 66 / 52 |
| open-file | rook (or queen) onto an open / half-open file | 72 (60 endgame) |
| king-activity | endgame king marches toward the center | 88 |
| passed-pawn | a passed pawn is pushed | 84 |

Ranking picks the top; a second is stated only if its weight is within 12 of the
top AND ≥ 55 (David: "if two are just as important state them both"). A global
recapture-safety guard (`seeGain(after, to) > 0` → the piece hangs) suppresses
all positive framing, mirroring the old `quietPurposePhrase` contract.

Two clause forms: **led** (verb-first, for appending after an already-named move
— the hint) and **selfContained** (names the piece — standalone use / review).

## Wiring (the sweep — treat the disease, not per-surface)

- `quietPurposePhrase` (groundedAnswer) delegates to the computer (selfContained).
  It is the shared positional-why leaf used by `explainBestMoveGrounded` +
  `describeMoveMerit`, which feed **review, teach, play commentary, chat, learn,
  the Why? button** — so upgrading the leaf lifts every surface at once.
- The **hint** (Tier 3) composes `describeMoveGeometry` (tactic, verb-first) →
  else `strategicWhyLed` — the led form, so it never restates the move it just
  named ("Your knight to f3 — develops into the game, fighting for the center on
  d4 and e5").

## Gates

- `moveFundamentals.test.ts` (new).
- `coachFeatureService.test.ts` — the `explainBestMoveGrounded` positional
  expectation updated to the new fundamental-first phrasing (living-audit rule).
- ship-check content gates + the prod hint audit.

Status: in progress.
