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

## Status / next-session pickup
- Shipped to `main` today: perspective app-wide, mistake cpLoss+book, why-it-failed
  geometry (review+play), live-alert board-truth, hint plain-language+arrows,
  notation location-guard, **piece-purpose lane** (`12efa78f`, not yet deployed).
- Next: Part B catch-all (confirm analysis threading), then Part A lanes.
- Deploy: batch the pending commits (piece-purpose + this doc) to `main`, then the
  3-instrument audit hammering board questions (David's standing audit directive).
