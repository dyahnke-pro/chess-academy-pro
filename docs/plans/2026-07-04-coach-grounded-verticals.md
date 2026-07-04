# Coach grounded-answer verticals — "wire ALL deterministic data into the coach"

**David 2026-07-04:** *"I want you to close this gap from every angle! The coach
brain should be tied to all deterministic data. We are basically writing in
Naraditski to the data. Make this app train users like he would!"* — and:
*"Keep working these types of questions to coach."*

Every "what's my X / how am I doing at Y" question about the student's OWN play
must be answered from COMPUTED data (G0: the LLM voices facts, decides nothing),
on EVERY talking surface (Learn most important, but Play, Tactics, opening-page
chat, voice — "Coach is master of its domain, one coherent unit").

## The pattern (every vertical follows it)

1. **Intent detector** — pure regex in `src/coach/questionIntents.ts`
   (`is<X>Question`). Ordered so more-specific intents win in the chokepoint.
2. **Pure assembler** — `assemble<X>Answer` in `src/services/groundedAnswer.ts`,
   takes a structural `<X>Like` input (a subset of the real data), returns a
   `GroundedAnswer | null` (null → caller voices a computed no-data line). No
   heavy deps, fully unit-tested.
3. **Chokepoint interception** — a block in `getCoachChatResponse`
   (`src/services/coachApi.ts`), gated on the grounding flag, that fetches the
   deterministic data, calls the assembler, and routes the facts through the
   single `voiceFacts` chokepoint. Ordered BEFORE `progress` when a positive/
   scoped intent would otherwise get a weakness-dump.
4. **Cross-surface wiring** — flag added to `MasterGroundingOptions`
   (coachApi), `buildQuestionGrounding` (questionIntents), `coachService.ask`
   autoGrounding, and the `CoachTeachPage` fuzzy-skip guard (so a meta-question
   isn't treated as an opening-name-to-teach).
5. **Adversarial post-deploy audit** — `scripts/audit-coach-<x>-grounding.mjs`:
   seeds real data via IndexedDB, drives the LIVE prod opening-page coach chat,
   throws off-canonical + collision + break inputs, classifies by reply content.
   PACED (≥2.5s between brain turns) so it doesn't manufacture false hangs.

## Shipped this session (all on `main`, all prod-verified)

| Vertical | Detector | Assembler | Data source | Audit |
|---|---|---|---|---|
| **Stats / record** ("what's my rating / record / win rate") | `isStatsQuestion` | `assembleStatsAnswer` | `getOverviewInsights` + `profile.currentRating` | `audit-coach-stats-strengths-grounding.mjs` (18/18 grounded) |
| **Strengths** ("what am I good at") | `isStrengthsQuestion` | `assembleStrengthsAnswer` | `getOverviewInsights().strengths` | same (inverse of weakness path — no more weakness-dump) |
| **Opening accuracy** ("how accurate am I in my opening / weakest part to work on") | `isOpeningAccuracyQuestion` | `assembleOpeningAccuracyAnswer` | `OpeningRecord.drillAccuracy/Attempts` + `variationAccuracy[]` + `getWeakSpotsForOpening` | `audit-coach-opening-accuracy-grounding.mjs` (7/7 grounded) |
| **Opening traps** ("traps in my strongest opening / watch out for / how do you teach these") | `isOpeningTrapsQuestion` (+`opensTrapsSystemAsk`) | `assembleOpeningTrapsAnswer` | `OpeningRecord.trapLines`/`warningLines` (named) + strongest-per-color | `audit-coach-opening-traps-grounding.mjs` (7/7; item-5 "how do you teach" → WLPP system, not a drill freestyle) |
| **Review due (SRS)** ("what's due for review today / how many cards to review") | `isReviewDueQuestion` | `assembleReviewDueAnswer` | live `srsOpeningCards`: `getDueCount` + `getEnrolledOpenings` + `getSrsDueOpenings` | `audit-coach-review-due-grounding.mjs` (guards the review-GAME collision) |

Pre-existing verticals (earlier sessions): progress/weakness, opening-profile
(which opening), bestMove, tactics, masterPlay, concept, endgame, playerGames,
plan, positionAssessment.

## Adversarial finding fixed this session

- `"my w-l record and how am i doing"` routed to the weakness path (`"w-l
  record"` wasn't in the stats detector). Widened the bare-`my …` stats pattern
  to catch `my record / my w-l record / my w/l`. Also moved the positive
  predicates (`good/best/strong/strengths`) OUT of `isProgressQuestion` into the
  dedicated strengths path so `"what am I good at"` stops colliding with
  progress.

## The FULL question inventory (David 2026-07-04: "all of those gaps are important … keep thinking of other phrases and add those")

The concept map — every question the coach should be grounded to. ✅ = shipped,
◻ = to build. Each ◻ is the same 5-step pattern (detector → assembler →
chokepoint → wiring → audit). Data availability is being confirmed by the scout;
build the data-backed ones, flag any NOT-AVAILABLE for a data-plumbing job.

**Your game — self-knowledge (no board):**
- ✅ Rating / record / win rate
- ✅ Strengths ("what am I good at")
- ✅ Weaknesses / what to train
- ✅ Opening profile (strongest / favorite / weakest)
- ✅ Opening accuracy (within one opening / weakest line)
- ✅ Review due (SRS)
- ◻ **Improvement / trend over time** — "am I getting better this month"
- ◻ **Record vs a specific opening** — "how do I do against the Sicilian"
- ◻ **Record vs a specific opponent** — "my record against <name>"
- ◻ **Most common mistakes / blunder rate** — "what mistakes do I make most"
- ◻ **Which tactics I miss most** — forks / pins / back-rank
- ◻ **Which phase I lose in** — opening / middlegame / endgame
- ◻ **Puzzle rating & count solved**
- ◻ **Overall game accuracy**
- ◻ **Win/loss streak & best time control**

**The position (live board):**
- ✅ Best move here
- ✅ Tactics / hanging pieces
- ✅ Who's winning / eval
- ✅ Plans & ideas
- ✅ How masters play
- ✅ Endgame technique (tablebase)
- ◻ **Rate my last move** — "was that good?" (assembleMoveEvalAnswer exists;
  needs the last-move + fen-before/after + engine eval threaded on the surface)

**Openings & study:**
- ✅ Opening traps / watch-out-for
- ✅ Games by a pro
- ✅ Chess concepts (book corpus)
- ◻ **What to play against X** — "what do I play vs 1.d4 / the Sicilian"
  (repertoire answer, from the user's repertoire keyed by what it responds to)
- ◻ **Repertoire overview** — "what should I play as White / Black"

**Actions (the picker layer — see `2026-07-04-coach-action-layer.md`):**
- ◻ **Quiz me on X** — launchable stage (walkthrough 'quiz'/'findMove'), an
  ACTION not an answer.
- ◻ every answer → **"want to drill/work on this?" picker** → real drill/review.

**App-facing discoverability (David 2026-07-04):**
- ◻ **Rotating greeting** — replace the static "welcome to my classroom" with a
  rotation of suggested questions + tappable pickers so users DISCOVER what they
  can ask. (Find the current greeting: coach chat mount / empty-state.)
- ◻ **Proactive weakness nudge** — the app identifies the user's biggest
  weakness (getUnifiedWeaknessProfile) and offers a study session UNPROMPTED
  (e.g. on coach home / chat open), gated behind a pick (never auto-launch).

Keep brainstorming more phrasings and fold them into the detectors as found.

## Older roadmap notes (still valid)

- **Play-eval threading** — on `/coach/play`, "am I winning / what's the eval"
  should voice the live Stockfish eval (thread `evalCp`/`bestMove` into the
  play surface's grounding; assemblers exist — `assemblePositionAssessment`).
- **Voice eval/tactics threading** — the mic surface (`VoiceChatMic`) already
  passes `buildQuestionGrounding`; confirm eval/tactics flags thread on voice.

Bigger ACTION change (needs a PLAN + interactive Playwright audit, NOT a
chat-reply audit):
- **Two-color trap-drill AUTO-LAUNCH** — "drill me on opening traps in my
  strongest opening for BOTH colors" should actually START the punish drill,
  sequenced across White's then Black's strongest opening. The single-named-
  opening launch already works (`"punish lines for X"` → STAGE_PATTERNS punish →
  `walkthrough.startAtStageMenu(tree, 'punish')` in `CoachTeachPage`). Missing:
  (a) resolve "my strongest opening" (no name) via `getStrongestOpenings(1,
  color)`; (b) sequence two openings on the single-tree walkthrough surface
  (drill White's, then a "next" continuation for Black's). Touches the
  walkthrough state machine → write it up + interactive audit of the launched
  drill (not just the chat reply). The shipped traps ANSWER already hands the
  user the exact `"punish lines for X"` phrase, so this is an ergonomic upgrade,
  not a gap.

Known limitation (both accuracy + traps verticals): a NAMED opening typed
without an active lesson ("traps in the Vienna", "how accurate am I in the
London") resolves to the strongest/weakest opening, not the named one, because
the coachApi block only uses `openingId` from context. Adding text→openingId
name resolution (via `openingDetectionService`) is the enhancement; David's
exact "my strongest opening" phrasing is handled correctly today.

## Files

- `src/coach/questionIntents.ts` — all `is<X>Question` detectors + regexes +
  `buildQuestionGrounding`. LEAF (no heavy deps). Re-exported from
  `coachService.ts`.
- `src/services/groundedAnswer.ts` — all `assemble<X>Answer` pure assemblers.
- `src/services/coachApi.ts` — `getCoachChatResponse` interception blocks +
  `MasterGroundingOptions` flags + the `voiceFacts` chokepoint.
- `src/coach/coachService.ts` — `ask()` autoGrounding + re-exports.
- `src/components/Coach/CoachTeachPage.tsx` — fuzzy-skip guard (Learn surface).
- `src/components/Board/VoiceChatMic.tsx` — voice surface grounding.
- `src/components/Openings/MasterclassCoachChat.tsx` — opening-page chat
  grounding (imports the LEAF directly).
- Tests: `src/coach/questionIntents.test.ts`, `src/services/groundedAnswer.test.ts`.
- Audits: `scripts/audit-coach-stats-strengths-grounding.mjs`,
  `scripts/audit-coach-opening-accuracy-grounding.mjs`,
  `scripts/audit-coach-opening-traps-grounding.mjs`.

## Follow-up cleanups (low priority)

- `coachContextEnricher.buildStudyProgressBlock()` injects a passive LLM-context
  line "Flashcards: N total, N due" reading the DORMANT legacy `db.flashcards`
  store, not the live `srsOpeningCards`. The grounded review-due chokepoint
  short-circuits before that context reaches the user for review questions, but
  for OTHER questions the ambient block reports stale/zero counts. Repoint it at
  `srsOpeningCards` (getDueCount + getTotalEnrolled) so the ambient context
  matches the grounded answer.

## Notes

- The `CoachTeachPage.test.tsx` jsdom timeout (4 tests) is a PRE-EXISTING flake
  (fails identically on clean `origin/main`) — unrelated to these changes.
  ship-check picks it up via changed-file mapping; verify it's the same 4 via
  `git stash` before treating a ship-check red as a regression.
- Deploy: straight to `main` (fast-forward from the feature branch), then poll
  the prod bundle hash to advance before auditing. Detached audits (`node …
  > log 2>&1 &`) so the 2-min foreground Bash cap doesn't kill the ~7-min run.
