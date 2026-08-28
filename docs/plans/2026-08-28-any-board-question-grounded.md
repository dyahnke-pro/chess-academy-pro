# Any board question, answered from grounded computer facts (never the free LLM)

**David 2026-08-28, LOCKED as the new focus:** "Let's get the coach able to
answer any and all board related questions. IT MUST route through grounded facts
tho. Not straight to the llm… routing to the computer facts will solve most
issues. The same computer we use to feed the llm." And on composition: "the
computer has all tools it needs including the dna outline which it should use to
phrase the response. Then hand to llm to speak what it wrote."

## How a coach turn routes today (the map)

1. **`coachService.ask`** (`src/coach/coachService.ts`) runs ~40 intent detectors
   (`src/coach/questionIntents.ts`) + computes live board facts (Stockfish
   snapshot + `detectTactics`), packs a `grounding` object, calls…
2. **`coachApi.getCoachChatResponse`** (`src/services/coachApi.ts`) — the grounded
   interception, an ordered dispatch (~lines 4200–4490). First matching flag →
   a deterministic `assemble*` in `src/services/groundedAnswer.ts` computes the
   answer → `voiceFacts` speaks it (LLM decides nothing, G0).
3. Lane matched → return grounded answer. ✅
4. **No lane matched → free LLM composes** with facts as *context*. ⚠️ THE LEAK —
   this is where board questions get weak/wrong, and the only place the full
   ~1,264-line `SYSTEM_PROMPT` (the DNA outline) is billed.

### Cost model (verified `coachApi.ts:2118` + register prompts)
- **Grounded lanes** = `voiceFacts(preferRaw:true)` → `speakableFacts(facts)`,
  **NO LLM call.** Zero DNA-outline cost. Optimal.
- **Warm live-teaching** = short ~200-word register prompt, phrasing facts. Modest.
- **Free-chat fallback (path 4)** = full SYSTEM_PROMPT. The only redundant DNA cost.
- **Verdict:** keep the DNA outline in the LLM for genuine open-ended chat; route
  every board question to a grounded lane so it never reaches path 4 — fixes the
  wrong answers AND stops paying the outline on those turns, in one move.

## The DNA composer already exists

`src/services/positionFacts.ts` — `computePositionFacts(input): PositionFactsResult`
ties every board-truth computer into one ordered, DNA-voiced clause packet:
criticality/importance, must-defend threats (`threatOut`), perturbation leans-on,
deliberation, latent danger, king safety, opponent intent, structure plan.
`clauseText(clauses, kinds)` extracts text. This IS "all the tools + the DNA
outline" in code. (Already consumed by `useHintSystem` + `whyBestMove`.)

## The fix — two parts

### Part A — add grounded lanes (one per board-question class)
Template = the piece-purpose lane shipped 2026-08-28 (`assemblePiecePurposeAnswer`).
Each: a small `assemble*` from chess.js / Stockfish / `detectTactics` /
`computePositionFacts`, detected in coachService (suppress best-move so it wins),
dispatched in coachApi before `bestMoveQuestion`, voiced via `voiceFacts`.
- [x] **piece purpose** — "what is my bishop on c4 aiming at?" (shipped `12efa78f`)
- [ ] **specific-move geometry** — "what does d5 do?", "what happens after Nf3?"
      (reuse `describeMoveGeometry` + a 1-ply lookahead)
- [ ] **threats** — "what's the threat?", "what is my opponent threatening?"
      (`computeMustDefend` / `opponentIntent` from positionFacts)
- [ ] **hanging / safety** — "is anything hanging?", "am I safe?", "can he take
      anything?" (`detectTactics` hanging + SEE)
- [ ] **square control** — "who controls e5?", "is d5 safe for my knight?"
      (chess.js attackers both colors + SEE)
- [ ] **defense** — "how do I defend?", "what's attacking my king?"
      (`kingSafety` + must-defend)

### Part B — the grounded CATCH-ALL (the systemic fix; highest leverage)
Detect "this is a board question" (mentions a piece / square / move / tactic /
the position / who's-winning / a plan) AND no specific lane fired → assemble the
FULL computed packet (`computePositionFacts` DNA clauses + best move + the named
piece's scope + any detected tactic + hanging/threats), compose the reply IN
CODE, hand to `voiceFacts` to SPEAK. Guarantees no board question hits path 4.
- Open detail: `computePositionFacts` needs a `StockfishAnalysis` (topLines).
  coachApi's `grounding` has `engineBestMoveUci`/`engineEvalCp`/`tactics` — confirm
  whether a full analysis (topLines/wdl) is threaded, or thread it from the surface
  snapshot, or degrade gracefully (facts that don't need MultiPV still compose).

## Gates / tests
- Per lane: a `*.test.ts` asserting board-truth on real FENs (piecePurpose.test.ts
  is the template — every named square verified against chess.js).
- Catch-all: a test that a board question with no specific lane still returns a
  grounded, board-true answer and NEVER a raw-LLM fallback.

## REVISED ARCHITECTURE (David 2026-08-28) — sort by board ENTITY, not phrasing; feed the weakness report

A flat bucket-list re-creates the 40-regex gap problem one layer up. Instead:

**Classify by what the question POINTS AT, derived from the deterministic breakdown
of a chess position.** Every component a position decomposes into = something a
user can ask = a bucket. ≈50 aspect-buckets across 10 components (`src/data/
boardQuestionBuckets.ts` is the source-of-truth catalog, mirroring
`misconceptionTags.ts`):

1. position (7): eval✓, wdl, phase, criticality, material, space, basics
2. side (6): my-plan✓, opponent-plan, my-threats, opponent-threats, initiative, development
3. square (4): control, safety, weakness/hole, occupant
4. piece (4): purpose✓, safety/hanging, activity, role
5. move (8): best✓, eval✓, purpose, consequence/PV, why-best✓, why-failed✓, legal/captures/checks, comparison✓
6. pawns (5): passed, weak, breaks, majorities, structure✓(partial)
7. king (5): mine, theirs, lines/attackers, checks, in-check/escapes
8. tactics (6): hanging, motifs✓(partial), trapped, mate-threat, loose, overload
9. endgame (2): result✓, technique
10. opening (3): name✓, master-play✓, plans

The 50 collapse to ~25 computer functions (one attackers/defenders engine serves
square-control + piece-safety + hanging + king-attackers).

**Router = focus extractor, multi-label, scoped catch-all:**
- `extractQuestionFocus(ask)` → `{squares[], pieces[], moves[], side, aspects[]}`.
  Phrasing-proof: "who owns e5 / is e5 mine / can I hold e5" all → `{square:e5,
  aspect:square-control|square-safety}`.
- Multi-label — an ask can fire several aspects; the answer composes them (mirrors
  the DNA composer, not one-error-one-bucket).
- Catch-all is SCOPED: unknown aspect but named entities → run the position
  computers scoped to those entities. Worst case = a focused read of exactly what
  they pointed at. NEVER a wrong best-move, never the free LLM.

**Every question feeds the weakness report (David 2026-08-28):**
- A question = an "I can't see this myself" signal — a purer weakness cue than an
  error. Each classified question logs `{component, aspect, answerSeverity,
  phase, ts}` to a Dexie question-signal store.
- Weight by the GROUNDED ANSWER's severity, not the topic: "is my knight safe?"
  → computer says NO → strong board-vision signal; says "obviously yes" → ~0.
- Gold = intersection with move-errors: ask about X AND err on X = confirmed blind
  spot, ranked first. Decay when they stop asking (reuse the misconception decay).
- The catalog's `weaknessTheme` column maps aspect → theme (board-vision /
  threat-awareness / king-safety / pawn-structure / planning / calculation /
  piece-activity / endgame / opening / evaluation). The weakness spine takes the
  question-signals as a SECOND input into the same profile → same report + drills.

**Build order (foundation first, unlocks the most at once):**
1. `boardQuestionBuckets.ts` — the 50-aspect catalog (component/theme/computer/needsEngine).
2. `boardQuestionRouter.ts` — `extractQuestionFocus` + `classifyBoardQuestion`.
3. shared attackers/defenders engine → square-control✓ + piece-safety + hanging + king-attackers.
4. `answerBoardQuestion(fen, ask, studentColor)` dispatcher (+ the logger hook w/ answerSeverity).
5. wire coachService (engage + suppress best-move) → coachApi dispatch.
6. Phase 2: Dexie question-signal store + weakness-spine integration + report/drill wiring.

## Status / next-session pickup
- Shipped to `main` today: perspective app-wide, mistake cpLoss+book, why-it-failed
  geometry (review+play), live-alert board-truth, hint plain-language+arrows,
  notation location-guard, **piece-purpose lane** (`12efa78f`, not yet deployed).
- Next: Part B catch-all (confirm analysis threading), then Part A lanes.
- Deploy: batch the pending commits (piece-purpose + this doc) to `main`, then the
  3-instrument audit hammering board questions (David's standing audit directive).
