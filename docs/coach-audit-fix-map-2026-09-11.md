# Coach Audit — Root-Cause Fix Map (2026-09-11)

Root-cause fixes for every CONFIRMED finding in the broken-map
(`docs/coach-audit-broken-map-2026-09-11.md`). **This is still a MAP — no code
is changed here.** Each entry: the confirmed symptom → the root cause (file:line)
→ the minimal correct fix → the gate that must ship with it.

Ordering: fix the DISEASE, not each symptom. The 12 findings collapse into **3
root causes** (D3 detector class, D1 lesson-fallback catch-all, D2 router
pre-emption) plus a few one-offs.

---

## ROOT CAUSE A — D3: tactic detectors validate geometry, not material
Covers findings #9 (symptom), #10, #11, #12. Highest impact (P1, app-wide via G0).

### Fix A1 — `findSkewers` (tacticsDetector.ts ~240) — the false skewer (#10)
**Root cause (exact):** the emit condition is pure geometry + value-ordering:
```
first.color === enemyColor && second.color === enemyColor &&
PIECE_VALUE[first.type] > PIECE_VALUE[second.type] &&
PIECE_VALUE[second.type] >= 1        // ← pawn allowed as the "prize"
```
No check that (a) the back piece is worth winning, or (b) the skewer actually
NETS material (front piece capturable for gain / undefended).

**Fix:**
1. Raise the back-piece floor: `PIECE_VALUE[second.type] >= 3` (a skewer wins a
   real piece; you cannot skewer a knight to a pawn — kills the Ruy d7 case).
2. Add the material-won validation the SIBLING detectors already use: the front
   piece must be capturable for gain (undefended, or the slider ≤ its value and
   the exchange nets material) — reuse `chess.attackers()` / the SEE-style check
   from `findRemovableGuards`/`findTrappedPieces`. A pure value-ordering ray with
   a defended front piece (Bxc6 dxc6 = trade) is NOT a skewer.
Model it on `findDiscoveredAttacks`' "with tempo, or it isn't worth a word"
pattern — the fix already exists in-file, just not applied to skewers.

### Fix A2 — `findForks` (tacticsDetector.ts ~116) — no material/safety check (#11)
**Root cause:** fires when a piece attacks ≥2 enemy pieces of value ≥3, with NO
check that (a) the forker is SAFE (not itself capturable for free) or (b) the
targets are actually winnable (undefended / can't both be saved).
**Fix:** after collecting ≥2 targets, require the forking square is not defended
by a cheaper enemy piece (forker safe), AND at least one target is undefended or
unsavable (a real win). Reuse `attackersOfSquare` + the sole-defender logic from
`findOverloadedPieces`.

### Fix A3 — coverage gate (#12)
**Root cause:** `tacticsDetector.test.ts` (29 tests, green) has NO case for the
skewer/fork material class, so the bug shipped under a green gate.
**Fix:** add red-then-green cases to `tacticsDetector.test.ts`: the Ruy FEN
(`r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w …`) asserts NO skewer;
a real B→K→Q skewer asserts one IS found; a fork on two defended pieces asserts
NO fork; a real K+Q knight fork asserts one. Ship WITH A1/A2 so the gate goes
red first, green after.

> Note (G0): the coach is currently CORRECT to voice these — it faithfully
> speaks a computed fact. Fixing the computer fixes every downstream surface
> (chat tactics-live, teach commentary, review) at once. No LLM/prompt change.

---

## ROOT CAUSE B — D1: over-broad `isConceptQuestion` (findings #3, #4)
**One disease behind both.** `CONCEPT_QUESTION_RE` (`questionIntents.ts:952`,
detector `:980`) = `\bwhat(?:'?s| is| are| does)\s+(?:a|an|the\s+)?[a-z]+` matches
almost any "what's the/your X" ask; the self-knowledge guard (`:986`) only
excludes "what's **my** …". So `strengthsQuestion`/`teachingMethodQuestion` asks
are ALSO flagged `conceptQuestion=true`, and the concept lane
(`coachApi.ts:4760`) dispatches BEFORE the strengths (`:3629`) and teaching-method
(`:4824`) lanes — returning the "I don't have a specific lesson…" decline at
`coachApi.ts:4794`.

**Fix (one disease, two aligned edits):**
1. Tighten `isConceptQuestion` to defer: near `questionIntents.ts:986` add
   `if (isStrengthsQuestion(ask) || isTeachingMethodQuestion(ask) || isSkillRadarQuestion(ask)) return false;`
   (all same-file leaves). This fixes **#4 teaching-method** outright.
2. **#3 strengths** also has a detector GAP — `STRENGTHS_QUESTION_RE`
   (`questionIntents.ts:1471`) doesn't match "what's the strongest part of my
   game" (only "what's my strong…"). Add an alternative:
   `what(?:'?s| is)\s+the\s+(?:strongest|best)\s+(?:part|area|aspect)\s+of\s+my\s+(?:game|play|chess)`
   so it flags `strengthsQuestion` (then edit #1 keeps it out of concept + the
   upload-gate at `:3468` and strengths lane at `:3629` engage).
**Gate:** `questionMatrix.audit.test.ts` — assert these asks flag their own lane,
not `conceptQuestion`.

## ROOT CAUSE C — D2: earlier routers/intercepts pre-empt the ask (#1, #2)

### #1 `record-vs-target` → "d4 is chess notation"
**Root cause:** the early NOTATION-HELP intercept (`coachApi.ts:3330` →
`notationQuestionSan`, `groundedAnswer.ts:3113`) runs before the recordVs lane
(`:3511`). `notationQuestionSan` is too loose — accepts any ask with "what's/is"
+ any SAN-shaped token; its only exclusion (a preceding on/at/to/…) misses
`with`/`against`/`score`. So "what's my score with d4 openings?" decodes "d4".
**Fix:** at the top of `notationQuestionSan` add `if (recordVsTarget(text)) return null;`
(or anchor the token as the subject: `what('s| is) <SAN>` / `what does <SAN> mean`).
**Gate:** add "what's my score with d4 openings?" → recordVs, not notation.

### #2 `transfer-gap` → tactics drill
**Root cause:** `routeChatIntent` → `matchTrainingAidRoute`
(`coachSessionRouter.ts:180`) runs BEFORE the brain; inside
(`trainingAidRouter.ts:181,185`) `hasExplicitPuzzleWord = /\bpuzzles?\b/` drills
on the bare word "puzzles" with no framing verb — and the transfer-gap ask
contains "puzzles". (Sibling `trainingRequestKind` already excludes transfer-gap;
this router doesn't.)
**Fix:** guard in `trainingAidRouter.ts` (~line 118) —
`if (isTransferGapQuestion(lower)) return null;` (leaf import, no cycle), or
require `framed` for the puzzle-word branch.
**Gate:** transfer-gap ask must NOT return a training-aid route.

## One-offs

### #5 `endgame-tablebase` → middlegame plan on a non-endgame board
**Root cause:** `planQuestion` + `endgameQuestion` both set, no mutual exclusion
(`questionIntents.ts:2655`,`:2718`); the plan lane (`coachApi.ts:5231`) dispatches
before the endgame lane (`:5482`, which correctly phase-gates on `pieceCount>16`).
**Fix:** `planQuestion: isPlanQuestion(a) && !isEndgameQuestion(a)` at
`questionIntents.ts:2655` (mirrors the bestMove/candidate suppression at `:2665`).

### #6 `last-game` → generic weakness empty-state
**Root cause:** the upload-your-games gate (`coachApi.ts:3468`, engaged because
`personalGameDataQuestion` includes `lastGameQuestion` at `:1749`) runs before the
last-game lane (`:4317`), and its topic map (`:3473-3494`) has NO lastGame branch
→ falls to the default topic 'the mistakes you make' (`:3494`).
**Fix:** add a branch before the default at `coachApi.ts:3494`:
`: grounding.lastGameQuestion ? 'how your last game went'` (or drop lastGame from
`personalGameDataQuestion` so its own cold message at `:4324` serves).

### #7 `drill-stage` → concept check instead of a drill
**Root cause:** `STAGE_PATTERNS` in `CoachTeachPage.tsx:3827` maps
`/\b(?:quiz\s+me\s+on|quiz)\b/` → `stage:'concepts'`; the ack (`:4750`) then says
"concept check". A quiz/test-me request lands on the concept stage, not drill.
**Fix:** change that entry's `stage` to `'drill'` (and mirror "test me"), or split
"concept check" (informational) from "quiz me" (interactive drill) into distinct
stages.

### #8 `review-game` → doesn't route (stuck on /games)
**Root cause:** `routeChatIntent`'s review-game case
(`coachSessionRouter.ts:317-349`) returns a reply-only result with NO `path` when
`findLastMatchingGame` returns null (cold surface), so `dispatchCoachTurn` never
navigates; and even on a hit it targets `/coach/play?review=` or
`/coach/session/narrate`, not `/coach/review`. (The teach page has its own regex
→ `/coach/review` at `CoachTeachPage.tsx:2704`, which is why it works there.)
**Fix:** in the review-game case, route to `/coach/review` even with no specific
match (mirror the teach page), and change the hit target to the review surface.

---

## Sequencing
1. **A (D3 detectors)** first — one code area, P1, app-wide, self-contained,
   ships with its own gate. Biggest value per line.
2. **B (D1 catch-all)** — one shared mis-route fixes #3 + #4.
3. **C (D2 routers)** — reorder/tighten so analytics asks aren't pre-empted.
4. The one-offs.
Each fix ships with the gate that would have caught it (the audit's standing-net
principle), then the 3-instrument prod audit on the affected surface.
