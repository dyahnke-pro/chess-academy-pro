# WORKORDER — Thinking-Error Buckets: the code-first diagnosis layer

**Locked 2026-06-10 (David). Built on the gated grounding foundation** (the LLM
chokepoint + leak audit shipped + audited on `main` this session). This is the
feature the buckets conversation produced; the narration grounding it rests on
is done.

## The goal
Every in-game mistake gets a **thinking-error bucket**. The board computes it:
- **≥90% confidence (per-detector) → AUTO-TAG silently.** No pop-up, no LLM call.
- **<90% → POP-UP** with the 14-cell picker; the user taps the real bucket.
- **Imported games:** batch the detector over every flagged move on arrival →
  auto-tag the confident ones → the Thinking Errors tab + Training Plan are
  populated **before the user opens them**. Only the ambiguous moments queue.
- **Auto-tags are VISIBLE + 1-tap re-taggable** in the Thinking Errors tab, so a
  wrong silent tag is never permanent — which lets us tune the threshold DOWN
  later with real override data instead of guessing 80% blind.

This INVERTS the last LLM decision in the misconception path: today
`classifyMisconception` lets the LLM *pick the tag*. After this, **code picks the
tag**; the LLM is bounded to (a) matching the student's free-text reason to the
code-computed candidate set, and (b) phrasing the board-grounded `coachNote`. It
may never choose a tag the evidence doesn't support.

## The classifier spine — move-type × eval × cause
`diagnoseMisconception({ fenBefore, playedSan, bestUci, evalBefore, evalAfter,
tactics })` → ranked `candidates: [{ tag, confidence, evidence }]`.
- **eval-delta** (per-move, played vs best, already computed) = "a mistake
  happened" + its magnitude. The universal signal — shared by every bucket.
- **move TYPE** (chess.js: capture/trade · pawn-push/break · piece move · forcing
  (check/capture) · quiet) = the disambiguator.
- **cause**: did a tactic fire on the refutation (→ tactical bucket) or was it a
  slow positional decline (→ structural/judgment bucket)?
- **multi-cause ranking** (David): a move can trip several detectors. Rank by
  **eval-contribution** (which cause accounts for the largest share of the drop /
  which refutation the engine actually plays). Tag the dominant one if it's
  clearly ahead; if the top causes are genuinely tied → confidence < 90 → pop-up.

### Confidence is PER-DETECTOR, not one global number
- **Near-certain → auto (≥90):** hung en prise · allowed mate-in-1 ·
  **miscalculated** (entered a forcing line, eval flips *inside* it) · king left
  in the centre (castling available, centre open) · weakened king shelter (pawn
  push in front of the castled king) · created pawn weakness ·
  **overestimated my attack** (sac'd, defender consolidates) ·
  **underestimated my attack** (winning eval + forcing best, played quiet) ·
  **overestimated their attack** (defended a ≈harmless threat, worsened eval) ·
  underestimated their attack (a flagged threat landed) · bad trade (net trade +
  better alt existed) · mistimed pawn break (pawn break dropped eval).
- **Heuristic → pop-up (capped < 90):** misplaced-piece (needs the moved piece's
  resulting mobility read) · no-plan (aimless vs subtle — board can't tell) ·
  **wrong side / wrong plan** (activity/breaks point opposite the structure —
  computable but capped below the bar because a silent miss is costly).
- **random / not sure → NEVER code-assigned.** User-only honest escape so people
  don't mis-tag a real bucket just to dismiss the pop-up. A truthful "I don't
  know" is good data; a false confident pick poisons the Training Plan.

## Taxonomy: internal granular, picker = 14
Keep the **internal tags precise** (drills bind to them). Add the **4 orphans**
your example exposed (`misconceptionTags.ts`):
- `miscalculated` (tactical) — right idea, wrong line.
- `underestimated-my-attack` (tactical) — had a winning attack, didn't press.
- `overestimated-opponents-attack` (positional/judgment) — over-defended a phantom.
- `wrong-side` (positional) — correct to have a plan, wrong direction.
(`overvalued-attack` + `missed-opponents-threat` already cover the other two
diagonals.)

**The picker is 14 user-facing cells (5 / 5 / 4)**, each mapping to the code's
top internal tag. DECISION (no need to ask — decoupled): the picker FOLDS the 4
opening tags → one "Opening slip" cell and the 3 endgame tags → one "Endgame
slip" cell, purely for the UI; internal granularity is untouched so drills stay
sharp. Grid:
- **Row 1 — Calculation & tactics (5):** Hung a piece · Missed a tactic · Missed
  their threat · **Miscalculated** · **Overrated my attack**
- **Row 2 — Plan & position (5):** **Wrong plan / wrong side** · Weakened my king
  · Made a pawn weakness · Piece went passive · Bad trade
- **Row 3 — Phase & honest (4):** Opening slip · Endgame slip · No real plan ·
  **Random / not sure**

## Build order
1. **Taxonomy** — add the 4 new tags + their `coachCue`/`drill` to
   `misconceptionTags.ts`; add the picker grouping map (14 cells → tag(s)).
2. **Detector** — `misconceptionDiagnosis.ts` (pure leaf): `diagnoseMisconception`
   → ranked candidates + confidence, from move-type × eval × cause. Pure tests.
3. **Classifier inversion** — `classifyMisconception` runs the detector FIRST:
   top candidate ≥90 & clear → return it (NO LLM); else return the candidate set
   for the picker, and when a student reason is present, a bounded LLM matches it
   to the set (gate: returned tag ∈ candidate set). `coachNote` stays
   board-grounded (existing `stripDisprovenSentences`).
4. **Picker UI** — 5/5/4 grid below the written response, importance copy, the
   "random/not sure" cell; only shown when confidence < 90.
5. **Auto-tag UX** — auto-tags surface in the Thinking Errors tab with a 1-tap
   re-tag (correctable).
6. **Imported-game batch** — run the detector over flagged moves on import;
   auto-tag ≥90, queue the rest.

## Gates
- Pure detector tests (each bucket's trigger + confidence band).
- The bounded-LLM gate: the tag returned by the language-match step MUST be a
  member of the code-computed candidate set (no LLM-invented diagnosis).
- `confidence < 90 ⇒ pop-up` and `random is never code-assigned` covered by tests.

## File lane
Mine: `misconceptionTags.ts`, the new `misconceptionDiagnosis.ts`,
`misconceptionClassifier.ts`, `discussionPractice.ts`, the Thinking-Error UI
(`MisconceptionsTab` + the pop-up/picker components), `trainingPlanSelector` (drill
mapping for the new tags). NOT the trap session's content/data files.
