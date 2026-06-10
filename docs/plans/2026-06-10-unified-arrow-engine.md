# Unified Arrow Engine — one code path for every arrow (G0)

**Date:** 2026-06-10 · **Branch:** `claude/friendly-bohr-1hsl0g`
**Owner directive (David):** *"get rid of [LLM-decided arrow color]
also, that can be coded in from stockfish. make sure all arrows are
generated from the same path. i don't want 2 separate standards."*

## Goal

Arrows are the last surface where the LLM decides chess content (G0).
Remove the LLM from arrows ENTIRELY — geometry AND color — and route
every arrow producer through ONE shared module. Then delete the
`validateArrowClaims` band-aid (a deleted validator is the G0 win).

## Locked decisions

- **One module:** `src/services/arrowEngine.ts` is the single arrow
  authority. No arrow geometry/color logic anywhere else.
- **Color policy = PURPOSE-BASED (David, 2026-06-10):**
  - `vision` arrows (walkthrough / plan lead-the-eye — "the knight
    heads to d5", "the bishop eyes f7"): **green cue**, no engine
    eval (keeps cached walkthrough gen fast; green = attention, not
    an eval verdict).
  - `candidate` arrows (chat coach suggests / judges a move):
    **Stockfish-rank color** — green = engine #1, blue = #2,
    yellow = #3, red = blunder / outside top-3 with real eval loss.
- **LLM emits ZERO arrow markers.** The `[BOARD: arrow:...]`
  instruction is removed from `envelope.ts` TEACH_MODE. Code injects
  every arrow.
- **One engine call per turn:** `analyzePosition(fen, depth,
  {multipv: 5})` ranks ALL mentioned candidates at once — no per-move
  eval.

## The module (`arrowEngine.ts`)

Sync geometry (moved out of `openingGenerator.ts`, shared):
- `resolveSanToArrow(san, fen)` → `{from,to} | null` (chess.js, with
  the running/original/turn-flipped retry from the old
  `synthesizeMissingArrows` so hypothetical/branch SANs resolve).
- `computeThreatArrow`, `computeLookAheadArrow`,
  `computeLeadEyeArrows(seq)` — the vision computers (already written
  in openingGenerator; relocate here).

Async candidate color + injection:
- `colorForRank(rank, evalLossCp)` → 'green'|'blue'|'yellow'|'red'.
- `injectCandidateArrows(text, fen, engine)` → strips any LLM-emitted
  `[BOARD: arrow:]`, extracts mentioned SANs (the SAN regex +
  non-move-preceder filter relocated from arrowClaimValidator),
  one multipv analyze, resolves geometry, colors by rank, appends
  markers. Returns `{ text, injected[] }`.

## File-by-file

1. **NEW `src/services/arrowEngine.ts`** — the module above.
2. **`openingGenerator.ts`** — delete the local `computeLeadEyeArrows`
   / `computeThreatArrow` / `computeLookAheadArrow` / `withSideToMove`
   / `LineMove` / `FromTo` (added earlier today) and import them from
   `arrowEngine`. Vision arrows, green. (No behavior change — pure
   relocation.)
3. **`CoachTeachPage.tsx:2784`** — replace the
   `validateArrowClaims` + `synthesizeMissingArrows(...,'green')` block
   with `await arrowEngine.injectCandidateArrows(finalText, fen,
   engine)` (engine-colored). handleSubmit is already async.
4. **`coachAnswerGates.ts:195`** — REMOVE the arrow gate from the sync
   `groundCoachReply`. Arrows become a separate async step the surface
   runs after `groundCoachReply` (sync gate stays sync). Provide
   `applyCandidateArrows(text, fen, engine)` re-export from arrowEngine
   for surfaces that used the gate's arrow step.
5. **`envelope.ts`** — remove the TEACH_MODE "MUST emit `[BOARD:
   arrow:from-to:color]`" rule + the color/rank mapping prose. Keep
   "name the square in prose" (the arrow lands on named squares
   automatically now). Update the `lichess_game_export` neighbor text
   if it referenced arrows.
6. **DELETE `src/services/arrowClaimValidator.ts`** + its test once
   both call sites are migrated. This drops `validateArrowClaims(` from
   the `coachInversion.gate` VALIDATOR_RE count (baseline shrinks —
   the inversion goal).
7. **CLAUDE.md G6** — update the NON-NEGOTIABLE arrow rule to reflect
   the inversion (arrows are code-injected from `arrowEngine`, not an
   LLM obligation policed by a validator). Careful, surgical edit.

## Sequencing

- **Step 1 (low risk, this pass):** module + openingGenerator repoint.
  Pure relocation; `openingGenerator.test.ts` (48) must stay green.
- **Step 2:** chat rewire (CoachTeachPage + coachAnswerGates) to
  async engine-colored injection. Riskier — live chat path.
- **Step 3:** envelope prompt cut + delete validator + gate/test +
  CLAUDE.md G6.
- **Step 4:** ship-check + the arrow/coach audits.

## Verify

- `openingGenerator.test.ts`, `coachInversion.gate.test.ts` (baseline
  should drop as validateArrowClaims goes), `coachLlmChokepoint.gate`,
  ship-check content gates.
- Audit: `scripts/audit-coach-teach-unknown-line.mjs` (arrows on
  step-by-step) + `scripts/audit-coach-master-integration.mjs`.

## Next-session pickup

If interrupted: arrowEngine + openingGenerator repoint is the safe
landed chunk. The chat rewire (steps 2-3) is the remaining work —
the live `[BOARD: arrow:]` injection must move to async engine-colored
in CoachTeachPage + coachAnswerGates, then the validator deletes.
