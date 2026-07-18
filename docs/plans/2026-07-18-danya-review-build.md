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

## RISK REGISTER — points of failure + mitigations (David 2026-07-18:
"identify points of failure … tell me your plans on how to mitigate them")

### R1 — Coach narration style/wording (David-flagged, HIGH)
FAILURE MODE: deterministic fact-templates drift robotic — every playback
ply announcing "captures the knight", bare-SAN TTS reads, filler on quiet
plies, the same stem 6 times in a row. Computed-correct but dead-voiced —
the exact thing the Narration Voice Rules ban and the thing that makes a
review feel machine-generated instead of Danya.
MITIGATIONS (structural, not vigilance):
- FACTS→PHRASE SEAM: `pvPlayback` emits STRUCTURED facts only; a separate
  hand-authored PHRASEBOOK (Danya register, curated per fact-class with
  3-5 rotated stem variants each — voice rule 9) renders them. Wording
  changes are then data edits, reviewable in one file.
- SILENCE DEFAULT: only keystone plies speak (capture/check/mate/landed
  tactic/eval jump). Hard cap ≤4 spoken lines per 8-ply playback; quiet
  plies animate silently (voice rules 4/8).
- GATES, not intentions: unit gate on every phrasebook literal — no
  move-number prefixes, no bare-SAN chains, word caps, stem-rotation
  asserted (no two consecutive spoken plies share a stem) — the
  proRepNarrationVoice pattern applied to this surface.
- BOARD-TRUTH GATE: every square/piece a phrase names is verified against
  the FEN at that ply (narrationAccuracy discipline extended to the
  dynamic path; corpus-driven unit test, runs in ship-check).
- GOLDEN TRANSCRIPTS: 5 fixed PVs → snapshot the rendered lines → one
  hand-review (David can read them) → locked. Any wording change is a
  visible diff, never silent drift.
- All speech routes through voiceService.speakInternal — G5 verbosity
  contract (brief caps / silent honors) applies automatically.

### R2 — The theme (David-flagged, HIGH; Phase 5)
FAILURE MODE: the theme is the review's FIRST claim and its closing
callback. A wrong theme ("this game was about d5" on a mutual blunderfest)
poisons the entire review's credibility; a vapid forced theme reads fake.
Highest blast-radius claim in the build.
MITIGATIONS:
- CLOSED THEME SET with computable predicates, each requiring MULTIPLE
  independent evidence points (e.g. "conversion collapse" = student held
  ≥ +2.0 for ≥10 plies then lost; "one-square story" = ≥2 flagged moves
  geometrically tied to the same square via chess.js; "opening disaster" =
  eval ≤ −1.5 by ply 12 attributable to student moves). No LLM choice.
- HARD CONFIDENCE FLOOR: below floor → NO theme; the review opens with
  today's factual intro. Empty > generic > wrong — the house doctrine.
- GEOMETRY-VERIFIED WORDING: the theme line may only name squares/pieces
  the evidence actually touched (checked, not vibed).
- PROBE BEFORE SHIP: run the classifier over the David-games fixture
  corpus; hand-agree ≥80% of assigned themes or Phase 5 DOESN'T SHIP.
  It is deliberately last and severable.

### R3 — PV wrongness / inconsistency (HIGH; Phase 1 core)
FAILURE MODE: review-time PV computed shallow is refutable a ply later —
the coach teaches a "winning line" that isn't; or the live PV's first move
contradicts the STORED bestMove the shot question just used.
MITIGATIONS: seed the PV from the stored bestMove (consistency by
construction); depth floor (≥14) + node budget; VERIFY THE LINE DELIVERS —
terminal eval of the PV must hold ≥ the initial advantage (soundness-sweep
doctrine per line), else truncate to the last verified ply or skip the
sequence question entirely. A line we can't verify is a line we don't ask.

### R4 — Sequence-judging false negatives (HIGH; the trust-killer)
FAILURE MODE: student plays an eval-EQUIVALENT move (or a transposition)
that isn't the literal PV move; naive SAN-matching marks them WRONG. One
"I was right and it said I wasn't" destroys trust in the whole feature —
and mis-tags the calculation bucket with false data.
MITIGATIONS: per-ply equivalence probe (engine eval of their move within
~30cp of the PV move → CREDIT, and the line re-seeds from their move);
transposition check (same resulting FEN after 2 plies → credit); when the
equivalence probe can't run (engine busy/timeout) → ACCEPT generously and
log for audit — never punish on missing data. The `calculation-depth`
bucket is tagged ONLY on eval-verified fall-off, never on ambiguity.

### R5 — Engine contention on device (MED-HIGH)
FAILURE MODE: review already runs whole-game analysis, engine lines, and
the exploration reply engine; adding PV compute + equivalence probes on
a phone's WASM Stockfish → stalls, "the coach froze".
MITIGATIONS: all new engine work goes through stockfishEngine's existing
priority queue at prefetch priority (never cancels user-facing analysis);
PV precomputed 1-2 plies BEFORE the card shows (prefetch during the walk);
hard time budget per call with graceful degradation — no PV in budget →
no sequence question this moment (plain reveal, as today). The walk UI is
never blocked on the engine.

### R6 — Card state-machine collisions (MED-HIGH)
FAILURE MODE: the review already juggles faucet/shot/rewind/turning-point/
reading-quiz cards as independent useStates; adding sequence + model-game
+ theory cards multiplies overlap bugs (two cards open, walk advancing mid
playback, playback running after navigation) — the class the 2026-06-12
adversarial audit exists for.
MITIGATIONS: REFACTOR FIRST — one `activeCard` discriminated-union owner
with an explicit priority order replaces the scattered booleans BEFORE any
new card lands (small, mechanical, test-covered). Playback holds a
cancellation token — any user turn/nav kills it. The per-phase adversarial
pass (mash-tap, cancel mid-sequence, out-of-order) is the enforcement.

### R7 — Model-game mismatch (MED; Phase 2)
FAILURE MODE: a tenuous GM cameo ("this is just like Fischer" when it
isn't) reads fake-deep — worse than no cameo.
MITIGATIONS: hard match floor on the motif signature; the cameo must cite
CONCRETE shared features verified on both boards (same outpost square /
same structure), else self-hide; probe corpus hand-checked before ship;
default is NO cameo.

### R8 — Theory-departure false confidence (MED; Phase 4)
FAILURE MODE: move-prefix matching against openings-lichess mislabels
transpositions — "book ended at move 6" when the position re-enters book
a move later.
MITIGATIONS: match by POSITION (FEN-set derived from DB lines), not move
order; claim departure only when the position leaves the known-FEN set
for good; show the masters-DB game count as the evidence; ambiguous →
self-hide.

### R9 — Stored-game data gaps (MED; the "previous games" promise)
FAILURE MODE: imported/old games lack bestMove on unflagged plies, may
carry stale pawn-unit evals, missing openingName — features silently
degrade exactly where David asked for parity.
MITIGATIONS: per-phase BOTH-ENTRY-POINTS acceptance gate (fresh + stored
via /coach/review/:gameId) with the David-games fixture as corpus;
`gameNeedsAnalysis` already flags stale records for re-analysis; every
card self-hides cleanly when its data precondition is absent (no broken
half-cards).

### R10 — Scope/latency of the build itself (MED)
FAILURE MODE: big-bang landing where phase 3's bug blocks phase 1's value.
MITIGATION: already structural — one phase = one main landing, severable;
Phase 5 explicitly droppable (R2); order is value-ranked so a stop after
any phase still shipped the most important remaining thing.

## Status: PLAN LOCKED (David 2026-07-18: "Plan only. Lock it in. Will
build once usage resets."). No build started. Phase 0 begins on go-signal.
