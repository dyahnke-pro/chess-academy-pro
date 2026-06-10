# PLAN — Coach-chat grounding inversion: the LLM only voices computed facts

**Locked 2026-06-10 (David, emphatic).** The disease, named once:
**we let the LLM SELECT chess content instead of only VOICE content the
code already computed.** Every hallucination, every validator, every regen
exists because of that. The app already solved this for walkthroughs
(`generateOpeningFromDbNarration`) and the review path
(`explainBestMoveGrounded`, commit `2082eea9`). The **coach chat** is the
last ungrounded surface. This plan extends the inversion to it.

**The contract:** ALL data that runs through the LLM is HANDED to it —
moves, lines, evals, AND the *reason* a move is strong. The LLM generates
zero chess facts. Its entire job, on every path, is phrasing.

## Root cause in the code
`parseCoachIntent` (coachAgent.ts) routes `play-against / walkthrough /
puzzle / continue-middlegame` to structured flows — but **everything else
falls into `kind: 'qa'`**, the open swamp where the prompt hands the LLM a
blank check to reason about the board. The fix is to **fan `qa` out into
sub-intents, each routed to a code fact-computer**, assemble the facts, and
constrain the LLM to voice them. Validators demote to a thin backstop that
should almost never fire.

## The full question taxonomy → its existing fact-computer
Every one of these computers ALREADY exists; nothing new to invent, only to
wire.

| Sub-intent | Fact source (code, no LLM) |
|---|---|
| best move / what to play | Stockfish PV + `explainBestMoveGrounded` |
| what about X / what if I play X | chess.js legality + Stockfish eval(X) + resulting line |
| was my move bad / a blunder | eval delta + classification + `explainBestMoveGrounded` |
| who's winning / eval | Stockfish eval |
| is X better than Y | eval both, compare in code |
| anything hanging / threat / in danger | `liveTacticsContext` (threats, hanging, opp PV) |
| fork / pin / mate here | `liveTacticsContext` immediate + `boardFacts.mateInOne` |
| why did opponent play that | that move's computed threat/eval |
| what's my plan / aim | `middlegame-plans.json` for the structure + PV |
| key squares / pawn breaks | plan data + pawn-structure read |
| what opening / theory | openings DB + master-play frequencies |
| how do masters/pros play this | master-play DB + `pro-game-references` |
| teach me opening X | DB-narration walkthrough (already grounded) |
| win/hold this endgame | tablebase proxy (truth) + endgame plan data |
| what's a fork / concept Q | `chess-concepts.json` book corpus (ideas), never LLM memory |
| am I improving / what to work on | weakness profile + bad-habit data + game stats (Dexie) |
| encouragement / restating | persona config + computed position state |

## 🔒 EVERY LLM-TOUCHING PATH IN THE APP — wire ALL (David: "do not miss a single thing")
The `CoachTask` enum (`coachApi.ts`) is the canonical inventory — all 26, plus
the non-task paths, come under the inversion. None exempt.

| CoachTask | Fact source (compute in code; LLM voices) | Status (AS-IS) |
|---|---|---|
| `chat_response` | the full `qa` taxonomy above (Phases 1-6) | ⛔ swamp — biggest |
| `move_commentary` / `coachMoveCommentary` | move + eval + `explainBestMoveGrounded` | ⛔ |
| `whatif_commentary` | chess.js legality + Stockfish eval(X) + line | ⛔ |
| `position_analysis_chat` | Stockfish eval + `liveTacticsContext` | ⛔ |
| `hint` | next move from DB line / engine | ⛔ |
| `puzzle_feedback` | the puzzle's solution (puzzles DB) + move correctness | ⛔ |
| `explore_reaction` | Stockfish eval of explored position | ⛔ |
| `sideline_explanation` | the sideline's moves (openings DB) | ⛔ |
| `game_commentary` | per-move eval + classification | ⛔ |
| `game_opening_line` | the opening line (openings DB) | ⛔ |
| `game_narrative_summary` | computed game arc (evals + key moments) | ⛔ |
| `game_post_review` | evals + classifications + `explainBestMoveGrounded` | ✅ mostly |
| `interactive_review` | the review walk (computed evals/lines) | 🟡 |
| `post_game_analysis` | computed mistakes/evals | 🟡 |
| `deep_analysis` | Stockfish deep eval/PV | ⛔ |
| `opening_overview` | the opening's data (openings DB / repertoire) | ⛔ |
| `model_game_annotation` | the model game's moves + computed annotations | ⛔ |
| `middlegame_plan_generation` | `middlegame-plans.json` | 🟡 |
| `smart_search` | search index results (DB) | ⛔ |
| `intent_classify` | **make deterministic** — `parseCoachIntent` regex-first | ⛔ |
| `bad_habit_report` | bad-habit data from games (Dexie) | ⛔ |
| `weakness_report` | **weakness profile from games** (David's favourite) | ⛔ |
| `weekly_report` | weekly stats from games | ⛔ |
| `daily_lesson` | weakness-driven curated lesson | ⛔ |
| `session_plan_generation` | weakness-driven training plan | ⛔ |
| `kid_puzzle_gen` | DB-selected puzzle; kid prose only | ✅ |

**Non-CoachTask paths:** `generateOpeningFromDbNarration` (✅ gold standard),
`openingSectionNarrator`, `smartSearchService`, `misconceptionClassifier`
(→ deterministic), `socraticNudgeService`, kid `*.ts` (✅ gated). Bar: every
⛔/🟡 → ✅.

## 🔒 NON-NEGOTIABLE: EVERY question type, end to end (David, emphatic)
Not "ground best-move." EVERY row, end to end — none left in the `qa` swamp.
Not done until NO path reaches the LLM as free reasoning. Student-progress
("am I improving / what to work on") is a must.

## 🔮 FUTURE PHASE (LATER — David: "later todo") — the LEAK AUDIT
Instrument every coach LLM call as **grounded** vs **ungrounded**, emit
`coach-ungrounded-llm-call` (intent + raw question). Audit-stream / PostHog
then shows EVERY leak in prod → a closeable list. Build ≈Phase 6→7. Locked
here so it isn't lost.

## Architecture
1. **Sub-classifier**: extend the intent layer so a `qa` turn is further
   classified into the rows above (deterministic regex-first, like the
   existing `isBestMoveQuestion` / `isPlanQuestion`).
2. **Fact assembler** (`assembleGroundedAnswer(intent, position, history)`):
   one place that calls the right computer(s) and returns a structured
   `GroundedAnswer { facts, move?, line?, eval?, why?, sources[] }`.
3. **Voice-only prompt**: hand the LLM the assembled facts with a hard
   instruction — *"Here are the facts. Say them to the student as a coach.
   Introduce no move, number, or claim not in this block."*
4. **Validators → backstop**: keep `claimValidator` as a tripwire, but it
   should rarely fire; replace regen with sentence-level strip (it almost
   never runs once facts are pre-computed). Cost collapses to one call.

## Phased build (slice by slice; each ships + audits independently)
- **Phase 1 — move/eval questions** (best move, what-if X, was-it-bad,
  eval, compare). Computers all exist (Stockfish + `explainBestMoveGrounded`
  + chess.js). Highest value, lowest risk. ← START HERE.
- **Phase 2 — tactics/danger** (`liveTacticsContext` already computes it;
  just route + assemble).
- **Phase 3 — plans/strategy** (`middlegame-plans.json`).
- **Phase 4 — opening/theory + how-pros-play** (master-play DB + pro refs).
- **Phase 5 — endgame** (tablebase) + **concepts** (book corpus).
- **Phase 6 — student progress** (weakness/bad-habit profile).
- **Phase 7 — demote validators to backstop**, confirm one-call turns,
  measure cost drop.

## Key files
- `src/services/coachAgent.ts` — `parseCoachIntent` (sub-classify `qa` here).
- `src/coach/coachService.ts` — `isBestMoveQuestion` / `isPlanQuestion`
  (intent detectors live here; add the rest).
- `src/services/coachApi.ts` — `getCoachChatResponse` (assemble facts +
  voice-only prompt; `detectMoveQuestionIntent` at 1132 is the seam).
- `src/services/coachFeatureService.ts:918` — `explainBestMoveGrounded`
  (the proven "why" computer to lift into chat).
- `src/services/liveTacticsContext.ts` — the tactics/board-facts computer.
- `src/services/claimValidator.ts` — demote to backstop in Phase 7.

## Definition of done (per phase)
The targeted question type, asked on prod, returns an answer whose every
chess fact came from a computer (gate: the claim validator does NOT fire on
that path — because there's nothing ungrounded to catch). One LLM call.

## Next-session pickup
Start Phase 1: add a `moveEvalQuestion` sub-classifier, build
`assembleGroundedAnswer` for it (Stockfish best move + line + eval +
`explainBestMoveGrounded`), route the chat through it with a voice-only
prompt, prove the claim validator goes silent on best-move turns.
