# The Danya Review Build (David 2026-07-18: "IF YOU CAN MAKE THIS REAL")

Companion to `2026-07-18-danya-review-standard-gap.md` (the measured gap).
This is the execution plan for the painted picture, in ranked order. Every
phase is G0-clean: facts computed (engine PV, DBs, eval trace, buckets),
voice only phrases.

David's refinement (locked): before the coach plays a winning line out, it
ASKS the student to SPOT THE SEQUENCE first — play their calculation on the
board, judged ply-by-ply against the PV. Failing deep in the line is not
"wrong", it's DATA: tag a `calculation-depth` weakness bucket ("long
tactical sequences") with the depth they reached. The spot-first flow is
the diagnostic; the playback is the teaching.

## Phase 1 — PV playback + spot-the-sequence (THE CORE)
- `src/services/pvPlayback.ts`: compute the full winning/punishment line
  from a review position (Stockfish PV at review time, chess.js-validated),
  with per-move grounded narration facts (captures, checks, threats,
  material delta) for the voice.
- Extend find-the-shot: after the first move is found/revealed, the coach
  asks "can you see the follow-up?" → student plays THEIR line for the
  mover's side on the board, engine answers for the defender; each student
  ply judged vs the PV (exact or eval-equivalent = credit). Reach the end →
  full credit, prosody spike. Fall off at ply N → capture
  `calculation-depth` bucket entry {reachedPlies, totalPlies, fen, pv} and
  the coach plays the WHOLE line out with narration.
- "Watch it play out": animate the PV on the walk board (arrows + voice),
  auto-paced, cancellable.
- Bucket: add `calculation` category entry to the weakness/misconception
  capture with sequence-depth metadata; surfaces in /weaknesses + drills.

## Phase 2 — model-game injection
- Theme-match the paused review position (motif signature: outpost /
  kingside storm / structure / endgame type + opening family) against
  `model-games.json` (646) + `pro-game-references.json`; when a match
  clears the bar, offer "watch how a GM handled this exact idea" → play the
  matching stretch on the board, then return to the review.

## Phase 3 — principle distillation
- Hand-authored principle text per misconception tag (G0: the tag is
  computed; the principle is curated, not LLM-invented), spoken at the
  reveal + "that's the Nth time this month" from bucket counts.

## Phase 4 — theory-departure moment
- Find the divergence ply vs `openings-lichess.json` (+ masters DB counts),
  offer "book ended here — want to see the main line?" → play the book
  continuation on the board, then return.

## Phase 5 — theme of the game
- Classify the dominant motif from the eval trace + mistake clusters +
  structures; open and close the review with it.

## 🔒 PREVIOUSLY PLAYED GAMES GET ALL OF THIS (David 2026-07-18: "I also
want this behavior for review with coach so previously played games get
the same post review.")

VERIFIED IN CODE (2026-07-18): `CoachReviewSessionPage` adapts EVERY stored
`GameRecord` (chess.com import / lichess import / past coach game) into the
SAME `CoachGameReview` component, and runs `analyzeSingleGame` (Stockfish)
on any game where `gameNeedsAnalysis` — filling per-ply evals +
classifications + bestMove-on-flagged-plies. So all five phases, built
inside CoachGameReview + its services, apply to previously played games
AUTOMATICALLY. Data nuances the build must respect:
- Stored analysis keeps `bestMove` only on MISTAKE plies (deeper pass) and
  stores NO PV. Fine: the question moments are exactly the flagged plies,
  and Phase 1 computes the PV at review time from the position (never from
  stored data). Do NOT add a PV column to the schema; compute + optional
  in-memory cache.
- Pre-fix pawn-unit records are already flagged for re-analysis by
  `gameNeedsAnalysis` — no extra migration needed.
- ACCEPTANCE GATE (every phase): the repro script must drive BOTH entry
  points — a fresh coach game's post-game review AND a STORED game via
  `/coach/review/:gameId` — and assert identical feature behavior.

## THE STEP-BY-STEP (engineered for first-time green)

Honest framing: nothing "guarantees" first-time success. What this plan
does is make every step VERIFIABLE BEFORE THE NEXT STARTS — the same
probe-first / services-before-UI / tests-before-wiring / repro-before-ship
discipline that took the Vienna Qf3 and Hikaru builds gate-green first try.
Nothing is authored from assumption; every integration point was read in
code before this plan was written.

### Phase 0 — preflight probes (before ANY authoring)
0.1 PV probe: confirm `stockfishEngine` can yield a FULL PV line (not just
    bestmove) — the UCI `pv` field. If `analyzePosition` doesn't expose it,
    extend the engine wrapper to return `pv: string[]` (one place,
    stockfishEngine.ts only, per the repo rule). VERIFY: throwaway script
    prints a 6–10-ply PV for 3 fixed FENs; every move chess.js-legal.
0.2 Board-animation probe: confirm the walk board can render a scripted
    move queue (today `walkExplorationFen` shows ONE explored position +
    engine reply — the playback needs a paced multi-ply queue). VERIFY:
    the mechanism drives 6 plies on the walk board in a repro script.
0.3 Bucket probe: read `MISCONCEPTION_TAGS` taxonomy + `logMisconception`
    input shape; confirm adding a `calculation` tag + metadata field is
    additive (no migration). VERIFY: unit test logs + aggregates it.

### Phase 1 — PV playback + spot-the-sequence + calculation bucket
1.1 `src/services/pvPlayback.ts` (pure service, no UI):
    `computePvLine(fen, firstUci?, maxPlies=8)` → `{ moves: san[],
    facts: per-ply grounded facts (capture/check/mate/threat/material
    delta via chess.js) }`. Engine-absent → null (empty > invented).
    TESTS: legality of every ply; facts board-true; graceful null.
1.2 `src/services/sequenceChallenge.ts` (pure): judge the student's
    attempted continuation vs the PV — exact SAN match OR eval-equivalent
    (engine probe within ~30cp) counts; returns per-ply verdicts +
    `reachedPlies/totalPlies`. TESTS: exact path, equivalent path,
    fall-off depth, drifted-board rejection.
1.3 Bucket: add `calculation` tag (label "Long tactical sequences") to the
    misconception taxonomy + drill mapping; `logMisconception` metadata
    carries `{reachedPlies, totalPlies, fen, pvSan}`. TESTS: taxonomy,
    aggregation, drill plan resolves.
1.4 UI wiring in `CoachGameReview` (smallest possible diff): after a shot
    resolves (found OR hint) and the PV has ≥4 plies → "Can you see the
    follow-up?" card → sequence mode: student plays THEIR side on the
    board, the defender's PV reply auto-plays; each ply judged (1.2).
    Complete → prosody-spike credit. Fall off → log bucket (1.3) + the
    coach PLAYS THE FULL LINE OUT (paced queue from 0.2) with per-ply
    voice from 1.1 facts. Interaction rules: never stacks with another
    card; any user turn cancels; arrows suppressed while the question is
    open (no answer leaks — same honesty contract as find-the-shot).
    TESTS: component test for card state machine.
1.5 Repro script (`scripts/audit-review-sequence.mjs`): drives BOTH entry
    points (fresh coach-game review + stored game via /coach/review/:id,
    fixture-loader seeded), asserts: card appears on a flagged moment,
    correct sequence → credit, wrong sequence → bucket row in Dexie +
    playback animates ≥4 plies, zero console/page errors.
1.6 ship-check → main → post-deploy audit battery for /coach/review.

### Phase 2 — model-game injection
2.1 Probe: motif signature of a review position (reuse detectTactics +
    structure facts) vs `model-games.json` (646) `criticalMoments` +
    opening family. Print top-3 matches for 5 test positions; hand-check
    they're genuinely thematic. NO SHIP until the probe convinces.
2.2 `modelGameMatcher.ts` (pure, scored match with a hard floor — below
    floor = NO cameo; empty > tenuous). TESTS on the probe corpus.
2.3 UI: "watch how a GM handled this idea" card → plays the matched
    stretch (same 0.2 queue) → returns to the review. Voice ties it back.
2.4 Repro + ship (same both-entry-points gate).

### Phase 3 — principle distillation
3.1 Hand-author one principle line per misconception tag (curated map in
    src/data — G0: tag computed, text curated, never LLM-invented).
3.2 Wire into the why-picker/shot reveals + "Nth time this month" from
    bucket counts. TESTS: every tag has a principle; counts accurate.
3.3 Repro + ship.

### Phase 4 — theory-departure moment
4.1 Divergence ply via `findOpeningByPgnPrefix` walk (openings-lichess) +
    masters-DB counts at the divergence node.
4.2 "Book ended here" card + book-line playback (0.2 queue). Self-hides
    when the game never left known book or DB has no continuation.
4.3 Repro + ship.

### Phase 5 — theme of the game
5.1 `gameThemeClassifier.ts`: dominant motif from eval trace + mistake
    clusters + structure (closed set of themes, each with a computable
    predicate — no LLM choice). TESTS per theme predicate.
5.2 Intro/closing lines reference the theme; turning-point reveal ties
    back to it. Repro + ship.

### Standing rules for every phase
- Services + tests land BEFORE any UI wiring (a red service test never
  reaches the component).
- Every new spoken line goes through voiceService (G5 verbosity contract)
  and states only computed facts (G0); questions never contain the answer.
- Every phase's repro drives BOTH review entry points (fresh + stored).
- Adversarial pass per the audit doctrine before calling a phase done:
  mash-tap during playback, cancel mid-sequence, cold-cache stored game,
  game with no flagged moves (cards must self-hide), engine unavailable.

## Status: PLAN LOCKED (David 2026-07-18: "Plan only. Lock it in. Will
build once usage resets."). No build started. Phase 0 begins on go-signal.
