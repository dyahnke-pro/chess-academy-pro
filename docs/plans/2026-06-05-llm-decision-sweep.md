# LLM-Decision Sweep — "the LLM only speaks the grounded truth handed to it"

David, 2026-06-05: *"Run a check for anywhere else the LLM is making
decisions and pull that out by the root. The only thing the LLM does is
speak the grounded truth that is handed to it."*

Two read-only explorer sweeps mapped every site where the LLM produces or
chooses chess content vs. only narrating pre-decided data. Result: the app
is ~95% already inverted (the hard-won G3 doctrine). One real ROOT
violation found + removed; the rest are either already grounded or bounded
NLU classifications (forks for David).

## ✅ ROOT VIOLATION — REMOVED

**`generateOnce` / `emit_walkthrough_tree` (openingGenerator.ts).** The LLM
emitted an entire `WalkthroughTree` of SAN moves from memory — the exact
"ask the LLM for data we already have" disease the DB-narration inversion
(build a48b721) was supposed to kill. It survived as a FALLBACK: when
`generateOpeningFromDbNarration` returned null — which happens ONLY for an
opening NOT in the Lichess DB — `generateOpening` fell back to `generateOnce`
and let the LLM invent the whole line. That directly violates G3 ("if the
lichess db does not have side lines then they don't exist; we don't make
stuff up").

Fix: `generateOpening` now goes DB-narration (grounded) → `buildFallbackTreeFromDb`
(grounded: DB canonical PGN, chess.js replay, template prose — no LLM move
choice) → honest `{ ok:false }`. The caller (CoachTeachPage) already renders
that as "I couldn't put together a clean lesson for X — try a standard
opening name," which is the G3-correct behavior (empty > invented). Deleted
by the root (~500 lines): `generateOnce`, `WALKTHROUGH_TREE_SCHEMA`,
`buildSystemPrompt` + `ROOT_STRUCTURE_EXAMPLE` + `VIENNA_SAMPLE` few-shots,
`parseGeneratedTree` + `ParseResult`, `describeTreeShape`,
`firstSansAlongLeftSpine`, and the now-unused `validateWalkthroughTree`
import. Shared helpers (`assertTreeShape`, `validateMoveLegality`,
`validateTreeMoveLegality`, `preprocessForParse`, `buildBookSourceBlock`,
`formatDbEntriesForPrompt`) were verified still used by the grounded path
and kept. Typecheck green.

## ✅ ALREADY GROUNDED (verified — no action)

- **Opponent moves in Play-with-Coach** → Stockfish (`coachPlaySession.getCoachMove`)
  + Lichess book, never the LLM.
- **Kid puzzles** → DB-only selection (`kidPuzzleService`), LLM never picks.
- **Stage gen** (drill/findMove/punish) → DB + chess.js; LLM writes prose only.
- **Walkthrough / middlegame / model-game narration** → moves from DB/JSON;
  LLM narrates pre-decided moves.
- **`play_move`** → LLM emits SAN, chess.js validates legality before play
  (operator action, gated).
- **`set_board_position`** → opening-phase positions MUST be real `moves`
  replayed by chess.js (fantasy FENs collapse); raw FEN only for deep
  positions, chess.js-legality-checked.
- **master-play grounding (Layers A/B/D)** + the answer gates (SAN / eval /
  player-stat / board claim validators) bound the coach's chat claims to
  injected data.
- **Engine-anchored plans (NEW, 2026-06-05)** — plan questions now pre-inject
  the Stockfish PV as the move backbone (`enginePlanContext` →
  `LiveState.enginePlan`); LLM teaches the idea, doesn't invent the moves.

## 🔶 BOUNDED NLU CLASSIFICATIONS — forks for David (NOT removed)

These are NOT chess-truth decisions (the doctrine's real target) — they're
natural-language classification from a CLOSED menu with validators/safe
defaults. Left in place; flagging for a call:

1. **`classifyWithLlmFallback` (coachSessionRouter)** — when regex routing
   misses, a 60-token/2s LLM call classifies the message into
   play/review/walkthrough/puzzle/explain/qa, else falls back to `qa` (safe
   general chat). It routes UX, not chess content. Remove → default to `qa`
   deterministically (drops a round-trip; edge phrasings just chat instead
   of auto-launching a session). Recommendation: acceptable bounded
   exception; remove if you want literally zero LLM decisions.

2. **`misconceptionClassifier`** — LLM tags a student's slip with one of a
   CLOSED set of misconception ids (validated by `isMisconceptionTagId`;
   null on miss). The blunder/mistake SEVERITY is already eval-delta-derived;
   this only labels the TYPE for teaching/tracking. Inverting it fully to a
   deterministic tactics-detector classification is a larger rebuild that may
   lose teaching nuance. Recommendation: keep as bounded, or schedule a
   deterministic rebuild.

3. **`set_board_position` deep raw-FEN provenance** — deep (fullmove>12) raw
   FENs are legality-checked but not provenance-verified (could be an
   LLM-recalled position). Minor residual; opening-phase (the dangerous case)
   is already forced through replayed `moves`.

## Status

- generateOnce removal: DONE (typecheck green), ships with this batch.
- Engine-anchored plans: shipped + prod-verified (audit-stream shows
  `enginePlan pre-injected` events).
- Audit hardening (coach-response-loop): material-balance color-attribution,
  white-to-move occupied-square fixture, `staleSetposRead` heuristic removed
  (precondition guard + family checks are the authoritative gates).
- Next: ship batch → prod audit (coach-response-loop v6 + audit-coach-teach-unknown-line
  to verify the graceful-failure path for a not-in-DB opening).
