# Drive coach hallucinations toward 0 (2026-06-03)

Goal (David): get hallucinations as close to 0 as the architecture allows.
Tiers: (1) pre-authored = literal 0; (2) invert generation + complete
verifier = near-0; (3) verified-or-silent policy. The gates are the net
wherever the LLM still authors prose.

## The streaming hole + the 7 ungated paths the sweep found

The spine's `groundCoachReply` gates the FINAL returned text. But
streaming-TTS surfaces hand sentences to Polly AS THEY ARRIVE, before the
final-text gate runs — so the spoken stream is ungated even when the
stored text is clean. The systematic fix is a per-sentence spoken gate at
each streaming dispatcher.

| # | Surface | Path | Fix | Status |
|---|---|---|---|---|
| 1 | coachMoveCommentary → CoachGamePage | spine (stored ✓) + streams to Polly | per-sentence spoken gate at dispatcher | pending |
| 2 | usePhaseNarration | spine + streams to speakForced | per-sentence spoken gate | pending |
| – | usePositionNarration | direct + streams | per-sentence board gate | DONE (1c91e9c) |
| 3 | middlegamePlanner.narratePvLine | getCoachChatResponse, display | groundCoachReply per annotation (per-move fen) | pending |
| 5 | walkthroughLlmNarrator | getCoachChatResponse, per-move fen, cached | groundCoachReply per move | pending |
| 4 | openingSectionNarrator | getCoachChatResponse, NO board | player-stat gate only | pending |
| 6 | coachFeatureService reports | getCoachCommentary, non-board | player-stat gate only | pending |
| 7 | puzzlesFamilyFallbackNotify | spine, navigation msg | n/a (no chess claim) | skip |

## Phases
- **A. Streaming spoken gate** — `gateSpokenSentence(sentence, fen)` in
  coachAnswerGates; wire usePhaseNarration + CoachGamePage dispatcher;
  refactor usePositionNarration onto it. (#1, #2)
## Status (2026-06-03 — shipped on main)
- **A. Streaming spoken gate — DONE** (`4b77e2d`): `isSpokenSentenceGrounded`
  in coachAnswerGates; wired into usePositionNarration, usePhaseNarration,
  CoachGamePage move-commentary dispatcher. Closes the streaming-TTS hole.
- **B. Non-streaming paths — DONE**: middlegamePlanner PV (`4b77e2d`),
  walkthroughLlmNarrator per-move (`4b77e2d`), player-stat gate into
  openingSectionNarrator + coachFeatureService (`c5c2899`).
- **C. Stockfish EVAL gate — DONE** (`c5c2899`): eval claims checked against
  the in-context `evalCp` (no new engine call); contradicted sentences
  dropped. Tactic gate stays AUDIT (out-of-vocab tactic ≠ provable lie;
  dropping risks false-positives on legit prose — revisit only with a
  tighter vocabulary).
- **D. Idea-source gate — NOT STARTED** (the frontier). Bind concrete
  plan/strategic claims to a DB line or book passage; drop unsourced.
  Needs claim-classification (factual-vs-general-principle) first; v1 narrow.
- **Content program — ONGOING**, not a code task: widen pre-authored
  masterclass coverage so high-traffic asks bypass the LLM = literal 0.

## Next-session pickup
Board-fact + eval + player-stat classes are gated on every surface/turn
incl. the streaming voice path. Residual = idea/plan-judgment (D) and
unverifiable claim types. Start D with claim-classification; keep the
verified-or-silent policy (drop unsourced, never invent).

## Original phase plan (for reference)
- **A. Streaming spoken gate** — `gateSpokenSentence(sentence, fen)`.
- **B. Non-streaming ungated paths** — groundCoachReply into
  middlegamePlanner (#3), walkthroughLlmNarrator (#5, per-move fen),
  player-stat gate into openingSectionNarrator (#4) + coachFeatureService (#6).
- **C. Tactic gate audit→DROP** + **Stockfish EVAL gate** — eval claims
  checked against the IN-CONTEXT engine eval (evalCp already in liveState;
  no new Stockfish call in the gate); drop contradicted sentences.
- **D. Idea-source gate (frontier)** — bind plan/strategic claims to a DB
  line or book passage; drop unsourced. Hard NLP; v1 narrow.
- **Content program (not a code task)** — widen pre-authored masterclass
  coverage so high-traffic asks bypass the LLM at runtime = literal 0.

## Follow-ups raised from the 2026-06-03 prod audit (build 1738f94)

These are PRE-EXISTING (not caused by the gate work) — captured for the
next pass:

1. **Tactic-call ↔ hint disconnect + false positives.** The "You have a
   tactic" announcer (`tacticAlertService.detectGameplayTactic`) fires when
   the best move is ≥150cp better than the 2nd-best + a geometry match — so
   a FORCED DEFENSIVE move (e.g. Rf1 stopping f2=Q in a lost position) trips
   it as a "tactic." The hint (`useHintSystem`) is a SEPARATE LLM call that
   reveals Stockfish's best move with generic prose and has no idea a tactic
   was announced. Fix: (a) tighten the call to require an eval/material
   SWING in the student's favour, not just best≫2nd; (b) thread the detected
   tactic into the hint so it NAMES it ("this is the pin — Rf1…").
2. **Play-surface narration "trips over itself."** Multiple narration
   sources (tactic alert, phase transition, opponent-move) fire overlapping
   non-forced `voiceService.speak` → `tts-concurrent-speak` collisions. Fix:
   serialize all play-surface narration through ONE queue; drop the
   over-triggered tactic alerts (see #1).
3. **iOS Polly streaming decode failure → mid-sentence cut-off.** Finding 6:
   `code=3 Media failed to decode` on iPhone iOS 18.7 → fallover to Web
   Speech mid-utterance ("…King ac"). Harden the iOS ManagedMediaSource
   streaming path (retry / buffered fallback) before bailing to Web Speech.
4. **DONE (this pass):** walkthrough narration board-gate softened to drop
   only the offending sentence, never blank the whole beat (was a possible
   Learn "cut off" contributor).

## Generator-gate unification (2026-06-03, David: "unify the rest of the app this way")
ONE shared narration gate — `gradeNarrationText(text, fen, source, evalCp?)` in
`coachAnswerGates.ts` — wraps the SAME boardClaimValidator/evalClaimValidator
primitives the spine uses. Every content generator now calls it (no drift):
- `openingGenerator` Learn walkthrough tree (idea/shortIdea/narration segs) ✓
- `openingGenerator` punish prose (whyBad@postInaccuracyFen, whyPunish@postPunishFen) ✓
- `walkthroughLlmNarrator` per-move ✓
- `middlegamePlanner` PV per-move ✓
- `openingSectionNarrator` + spine-bypass surfaces → `groundCoachReply` ✓
- `coachMoveCommentary` → spine ✓
- `kidPuzzleService` → STATIC templates, no LLM (no gate needed) ✓

REMAINING ungated generator prose (deferred — needs careful per-item FEN
mapping; wrong FEN = false-drops that break drills):
- `openingGenerator` findMove candidate `explanation`s (FEN per question)
- `openingGenerator` drill line annotations (FEN per move)
- `openingGenerator` concept Q&A `explanation`s (Q&A — may lack a board FEN)
Gate these with `gradeNarrationText` next, mapping each field to its FEN.

Note: per-move-spine regeneration was considered and REJECTED (N LLM calls,
worse coherence/cost, re-opens the parse problems the one-shot tree solved).
Unify at the GATE, not the generation.

## Decisions
- Keep the redundant crude player-stat refusal (David: redundancy is fine).
- Factual player NAME allowed; only ungrounded STAT dropped.
