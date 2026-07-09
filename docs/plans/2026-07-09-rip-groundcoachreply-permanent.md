# ONE LLM COMMAND — the permanent grounding architecture

**David 2026-07-09, LOCKED:**
- "No bandaids! Root cause fixes only." / "No question about it. This needs to be
  a permanent fix."
- "I want one command that calls the llm. But it needs to allow for all of the
  fact checking. We need to double check to make sure all of the app's data
  points are computed correctly once done."
- The more LLM-calling commands there are, the more chances to hallucinate → collapse to ONE.

## The architecture (north star)

```
             ┌──────────────── ROUTER (code) ────────────────┐
 user turn → │  intent detect → pick fact-computer(s) → gather │ → facts
             └────────────────────────────────────────────────┘
                                     │
                                     ▼
                    voiceFacts(facts, {register})   ← THE ONLY LLM CALL
                                     │
                                     ▼
                          phrased coach text (cannot hallucinate:
                          nothing ungrounded went in)
```

1. **ONE LLM command — `voiceFacts(facts, {register})`** (`coachApi.ts`). The
   ONLY place the LLM is ever called. It phrases computed facts and adds nothing
   (number-fidelity net already enforces this). Registers (`plain` / `warm` /
   `kid`) are PARAMETERS, not new commands. It cannot hallucinate because nothing
   ungrounded is passed in.
2. **FACT-COMPUTERS — code, many is fine.** Every app data point is a computer
   that returns computed facts: chess.js / Stockfish / the DB. The ~40 `assemble*`
   in `groundedAnswer.ts` are these; more get added. They are SAFE to proliferate
   because they are code, not the LLM — an engine can't invent a piece.
3. **THE ROUTER — code (`buildQuestionGrounding` + the intent dispatch).** Decides
   WHICH computer(s) run for a turn, then GATHERS (runs tool/DB/engine lookups) —
   the LLM never decides what to fetch OR what to say. "Gather then voice."
4. **Unmapped tail → SAFE default** (`serveGroundedPositionDefault` → engine eval,
   or the honest "I can't verify" line). Never free-LLM chess.

## What gets DELETED (the 5 other LLM commands + the bandaid)

- `getCoachCommentary` (free prose/report) — replaced by computer→voiceFacts.
- `getCoachChatResponse` free fall-through + move-narration exemption — routed to
  the seal / a grounded narration computer.
- `coachService.ask` agentic FREE-COMPOSE — the tool loop becomes gather-only;
  its output is voiced by `voiceFacts`, never composed freely.
- `getKidLlmResponse` free path — kid routes through the SAME computers + the
  `kid` register of `voiceFacts` (already started: `getKidGroundedResponse`).
- **`groundCoachReply` / `runAnswerGates`** (`coachAnswerGates.ts` + the
  `coachService.ts:442` call + the 6 direct callers) — the validate-after bandaid.
  It is redundant the moment nothing free-composes → DELETE it entirely. Keep
  `applyCandidateArrows` (arrows = display, not a grounding gate).

## THE DATA-POINT CORRECTNESS AUDIT (David's "double check" — a hard gate)

Once every surface routes through one command, **verify that EVERY app data point
is computed correctly** — because the whole guarantee now rests on the computers.
The audit:
1. **Enumerate every fact-computer** and the data source it reads (openings/
   repertoire, pros, master DB, model games, middlegame plans, books/concepts,
   common-mistakes/punish, traps/gems, puzzles/tactics, endgames, misconception/
   weakness, progress/history, settings, app-structure, game review, move-eval).
2. **Per computer, a test that its computed facts are TRUE** — chess.js legality
   / Stockfish eval / DB-membership verified. No computer ships a fact the source
   doesn't support.
3. **The intent router maps every real question class to a computer** — measure
   the fall-through rate from real `coach-brain-ask-received` (PostHog) → ~0.
4. Cross-check the number-fidelity net never has to fire on a shipped answer
   (if it does, a computer emitted a fact the phrasing dropped/changed — bug).

## Phased execution (each phase: convert → typecheck/lint → test → verify)

- **P0 — inventory** (mostly done: the family table below / groundedAnswer's ~40
  assemblers). List every LLM-calling path + every data point.
- **P1 — replace free-composers with router→computer→voiceFacts:**
  `gameReviewService` (annotations → `assembleGameReviewAnswer`), `coachFeatureService`,
  `CoachPanel`, `openingSectionNarrator` (DB-narration; drop the wrapper),
  `MasterclassCoachChat` / `VoiceChatMic` / `CoachGameReview` (drop the redundant
  post-`groundCoachReply` — spine covers it until P3). Move-narration exemption →
  grounded narration computer.
- **P2 — the spine:** make `coachService.ask`'s tool loop gather-only; ensure its
  output is voiced, never free-composed.
- **P3 — DELETE** `groundCoachReply` + `runAnswerGates` + all callers once P1/P2
  land (grep proves zero callers).
- **P4 — DATA-POINT CORRECTNESS AUDIT** (above) — the "double check." Ship-gate:
  every computer tested correct; fall-through ~0.
- **P5 — 3-instrument prod audit + the single batched push.**

## Done this session (aligned with the above)
- `voiceFacts` gained `kid` + `warm` registers (params on the one command).
- `groundedMoveFeedback` computer (move eval + tactic + computed pedagogical
  moment) → `voiceFacts`; MiddlegamePractice + useLiveCoach use it; their
  free-LLM prompt machinery deleted.
- Kid tie-in: `getKidGroundedResponse` routes kid questions through the shared
  computers + the `kid` register.

## Non-negotiables
- G0: the LLM decides zero chess content. Compute → `voiceFacts`.
- NO new validator/gate/regen/claim-stripper (re-introducing the disease). If a
  phase tempts one, compute the answer instead.
- One batched push at the end (no incremental ship).
- UX: open-ended / live prose gets more grounded; the `warm` register keeps it
  human. Warmth is phrasing (kept); deciding chess is removed (the lies).
