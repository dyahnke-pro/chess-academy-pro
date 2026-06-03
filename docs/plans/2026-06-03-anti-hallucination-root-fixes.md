# Anti-hallucination gaps — closed at the root (2026-06-03)

David: *"close all of the gaps that you see. use first principles to close
the gap at the root cause. don't just slap bandaids."*

## The disease (one sentence)

The hallucination guards are strong but **applied opt-in per call-site**:
the shared runtime gate (`groundCoachReply` in `coachAnswerGates.ts`) and the
FEN it needs reach the brain through inconsistent channels, so whether a
surface is board-truth-gated depends on whether its author remembered to
wire it. That's how VoiceChatMic ended up passing a live FEN to the brain
and never gating the reply — a board lie ("the knight on f6 pins the
queen") could be spoken.

## What is NOT a gap (verified by reading the code, not the audit summary)

- **Off-book SAN "bypass" (claimValidator).** `buildGroundedSans`
  (coachApi.ts:1140) ALREADY injects chess.js legal moves on every surface;
  the off-book bare-SAN exemption is a *documented, deliberate* tradeoff (a
  plan names FUTURE moves not in the current legal set — forcing the check
  reintroduced the 2026-06-02 "give me a plan → stock fallback" regression).
  No change.
- **Prose-form piece-on-square at BUILD time (narrationAccuracy.test.ts:30-42).**
  TRIED and deliberately rejected — a static regex can't separate a claim
  ("the knight on e4") from a maxim ("a knight on f5 cannot be repelled"), a
  cross-opening comparison, a possessive, or a negation. Measured: 4 false
  positives, 0 real catches. boardClaimValidator wouldn't help (maxims carry
  no future-marker). Static build gate stays on the RELIABLE hyphen-form. No
  change. (Runtime is different: a live FEN + future-marker gating + the cheap
  cost of dropping one sentence make prose-form gating worth it THERE.)

## The fixes (root-cause)

### FIX 1 — Runtime board-gating by construction (the real one)
Move the board-claim / arrow / player-stat gate INSIDE `getCoachChatResponse`,
keyed on `grounding.currentFen`. Every caller that hands the brain a live
board FEN through the canonical channel is now gated by construction — no
per-caller `groundCoachReply` needed. Surfaces that want the richer
eval/tactic gates still layer `groundCoachReply` (idempotent: the
board/arrow/player pass finds nothing the second time).
- Board-truth needs the full reply before it's shown, so on a has-FEN turn
  the reply is collected → gated → emitted once (no token streaming). The
  move-question path already behaved this way; this extends it to has-FEN
  non-move-question turns. Accepted cost: board-truth > token stream.
- Migrate `coachAgentRunner` off the opaque-systemAddition FEN channel onto
  `grounding.currentFen` so it's gated by construction too.
- `coachSessionRouter` LLM classifier (one-word output) + `smartSearchService`
  (no board) correctly stay ungated.

### FIX 2 — Comparative gate: widen + harden (claimValidator)
- Widen `COMPARATIVE_PATTERNS` to the superlatives a coach actually uses:
  "main line", "critical move/line", "sharpest", "best try", "principled".
- HARDEN: only flag when the captured token is SAN-shaped (a move). Fixes a
  latent false positive in the existing patterns ("the main line is complex"
  → don't validate "complex" as a move).

### FIX 3 — Entity set widening (claimValidator)
Add strong GMs a coach cites that were missing (Topalov, Kramnik, Korchnoi,
Rapport, Abdusattorov, So, Dubov, Gukesh, …). Strictly additive (an unknown
name is simply not checked). A fully shape-based detector is a deliberate
NON-goal: opening eponyms (Réti, Bird, Evans, Caro) collide with surnames
and would cry wolf.

## Status
- [x] FIX 1 — getCoachChatResponse internal gate + coachAgentRunner migration
- [x] FIX 2 — comparative widen + SAN-shape guard
- [x] FIX 3 — entity set
- [x] tests + ship-check gates green

## Escalating audit campaign (David: "audit all night, each test harder")

Instruments used (honest constraints): (1) the **wired-gate driver** — real
`getCoachChatResponse` path with the LLM mocked as an adversary, which tests
THIS branch's code (prod runs the old code; no LLM key here for a live
coach); (2) **prod audit-stream pulls** (`/api/audit-stream`, secret present)
— HTTP 200 but empty all night = app not open; (3) a **chess.js game engine**
to play a real game and probe the gate at every position. A live 3-instrument
Playwright run is owed once this lands on `main` (Vercel has the LLM key).

| Pass | Focus | Result |
|---|---|---|
| 1 | basic board lies + fabricated stats | 14/14 caught |
| 2 | **hunt** board-fact evasions | found+fixed the **skewer geometry gap** ("A skewers B and C") |
| 3 | **play a game** — 91 positions × board-generated claims | 182/182 false caught, 91/91 true kept, 0 FP |
| 4 | disguised & buried (between truths, inside `[VOICE:]`/TTS, buried stat) | 7/7 caught |
| 5 | eval contradiction + FEN-keying (groundCoachReply paths) | 7/7 (incl. same sentence stripped on empty-f6, kept on knight-f6) |
| 6 | formatting evasion (caps/space/comma) + arrow synthesis (G6) | 8/8, no evasion gaps |
| 7 | subtle FALSE-POSITIVE hunt: negation/absence | found+fixed: gate **censored TRUE absence** statements ("there is no knight on f6") |
| 8 | multi-turn conversational game (25 turns, evolving board) | 25/25 position-specific lies caught, gated against each turn's fen |
| 9 | stress pass-7 fix: negation clause-scoping | holds (negation in one clause can't shield a lie in another) |
| 10 | false forced-MATE claims | found+fixed: eval gate had **no mate detection** ("White has mate in 3") |
| 11 | marker safety + generator gate (gradeNarrationText) | 8/8 — markers intact, generator path strips lies |
| 12 | capstone — every lie type in one packed reply | all stripped, all truths kept |
| 13 | edge-case boards (check/endgame/promotion/en-passant) | 11/11, robust + fails open on bad FEN |
| 14 | false CHECK / CHECKMATE announcements | found+added: gate had **no check-state**; chess.js ground truth, low-FP |
| 15 | false STALEMATE / insufficient-material | added; completes the board-STATE family (check/mate/stalemate/draw) |

**~195 tests green across 13 files.** **FIVE real issues found & addressed:**
skewer geometry (bug), true-absence censoring (bug), false forced-mate
(eval-gate gap), false check/checkmate (board-state gap), false stalemate/
insufficient-material (board-state gap). The board-STATE family is now
complete. Deliberately NOT gated (FP risk / not FEN-determinable): bare-draw
assessments, threefold repetition, verb-separated prose forms, the maxim FP,
departure-after-phrase. Kid path intentionally un-board-gated (no-master-play
contract) — flagged for David, not force-changed.

**Three real issues found & addressed in the first wave:**
(a) impossible-skewer geometry slipped, (b) the gate **censored true
absence** statements, (c) the eval gate missed **false forced-mate** claims.
Documented deferrals (measured tradeoffs, not blind patches): verb-separated
prose forms ("the knight occupies f6"), the maxim false-positive ("a knight
on f5 cannot be repelled"), and the departure-after-phrase case ("the knight
on f6 is gone") — each widening raises a competing false-positive rate.
The kid path is intentionally un-board-gated (no-master-play contract);
flagged for David, not force-changed.
