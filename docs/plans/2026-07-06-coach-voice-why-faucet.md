# PLAN — The app's coach voice + the "why did you play that?" faucet

Owner: David · 2026-07-06 · Branch: `claude/calculation-teaching-material-1ean1y`

**Status of the doctrine:** LOCKED into `CLAUDE.md` (§"THE APP'S COACH VOICE +
THE 'WHY DID YOU PLAY THAT?' FAUCET"). This doc is the full spec + build plan.

## The voice (locked)

Naroditsky's instructive register, stripped of philosophy. Deterministic,
facts first, concept-first, one clipped spark of warmth ("clean", "there it
is"), never sentiment. Calibrated against his real teaching (the "How To
Calculate In Chess: CHECKS" cadence — reference-only, gitignored at
`data/sources/naroditsky-voice/transcripts/`, never quoted/shipped). Original
prose. Grounded per G0 — the coach VOICES computed facts (engine eval,
`detectTactics`, PV plan); it DECIDES nothing.

## SURFACE PLACEMENT (locked David 2026-07-06)

- **Learn (`/coach/teach`)** — the interruptive picker lives HERE.
- **Play (`/coach/play`, OpeningPlayMode play) — PURE PLAYING SURFACE.** No
  blocking picker. Only phase-transition narration (may mention a couple of
  mistakes with positional analysis). Never stop the game.
- **Post-game review** — the full diagnostic for Play games. **BUILT
  2026-07-06** (David prompted: "wire the new coach style into post game
  review… I want that section to respond like learn with coach"; chose "Full
  faucet (like Learn)"). Stepping onto one of the student's own mistakes in the
  review walk raises the SAME "why'd you play that?" picker → narrated grounded
  reveal → weakness bucket (source `game-review`), REPLACING the reading-
  challenge prompt on mistakes (same trigger + `readingChallengesInReview`
  toggle). Impl: `useDiscussionPractice.raiseSlipPrompt` (known-data entry, no
  engine re-eval) wired in `CoachGameReview.handleWalkForward` /
  `resumeAfterFaucet` + the `DiscussionPracticePanel`.
- **Also landed 2026-07-06:** good-move picker CUT → non-blocking spoken line;
  the grounded reveal is now NARRATED after the student commits (was card-only);
  `discussion_response` / `discussion_good_move` analytics; the bucket-delivery
  audit engine + gate.
- "We will talk about how to add to both surfaces together" — the Learn picker
  and the Play→review path are designed together, not unilaterally.

## Two channels, one coach

1. **Narration (voice, non-blocking)** — fires WHENEVER IT INSTRUCTS. Silent
   only when a word would be filler (quality rule, never cost). On Play this
   is the ONLY channel, at phase transitions. [v2]
2. **The "why did you play that?" picker (blocking)** — LEARN ONLY. Interrupts
   only when worth stopping play = the rating-adaptive gate
   (`slipDetector.slipWarrantsInterjection`): beginner→blunder,
   intermediate→mistake, advanced→inaccuracy. Pedagogy, not throttling.

## The picker flow — the honesty contract

1. **Clean neutral probe** — "Why'd you play that?" IDENTICAL good/bad, ZERO
   board facts (no piece/square/tactic, no "nice").
2. **Commit a reason** — deterministic PICKER chips (from move mechanics, with
   decoys) + "Type your answer" + **Hint** (reveals the grounded answer;
   tapping Hint = honest "I didn't know").
3. **Grounded reveal — ONLY AFTER commit** — grades the reason vs. the board.
4. **Bucket** — delta(said, board) → misconception tag → weakness bucket +
   drillable `mistakePuzzle` → ranked → next drill.

## Winning / keep-pressing = guided find-the-move [v2]

Name the PIECE + GOAL, WITHHOLD the square. Student plays it → right/press on;
wrong → "take that back and look again"; Hint reveals. Needs per-surface board
routing + takeback, so it's its own phase.

## Three unbreakable rules

1. The probe contains ZERO board facts.
2. The answer appears ONLY after the student commits.
3. Everything computed (G0) — Danya voices, never decides.

## Build reality

The whole chain exists; the ONLY dead link was `useDiscussionPractice` (an
inert no-op stub since the 2026-06-11 retirement — that retirement was a
mistake). The faucet is CORE, always-on, not disable-able.

### Phases

| Phase | Scope | State |
|---|---|---|
| P1 — restore the faucet (bad-move picker) | un-retire hook; clean probe; reason picker; Hint; grounded reveal; buckets; rating gate | **this build** |
| P1b — good-move recognition | near-best move that SET UP a tactic (`detectTactics(fenAfter)`) also fires a clean "why'd you play that?" | **this build** |
| P2 — guided find-the-move (winning) | name piece+goal, withhold square, board play + takeback + Hint | pending |
| P3 — narration channel to the Danya/grounded bar | hold existing in-game narration to the voice; instruct-whenever | pending |
| P4 — 3-instrument interactive audit on prod (G1/G7) | drive all 5 surfaces; probe honesty (no leak), picker gating, bucket write | pending |

### Files (P1/P1b)

- `src/services/moveReasonOptions.ts` (new) — deterministic reason chips.
- `src/services/slipDetector.ts` — `goodMoveWarrantsRecognition()` (near-best +
  created a tactic).
- `src/services/discussionPractice.ts` — neutralize `buildWhyPrompt`; add
  `buildGroundedReveal()` (Danya-voiced, from `detectTactics`/bestSan).
- `src/hooks/useDiscussionPractice.ts` — the real loop (un-stub).
- `src/components/Openings/DiscussionPracticePanel.tsx` — chips + Type + Hint.
- `DiscussionPrompt` type — `+ options`, `+ kind`, `+ hintReveal`.

### Next-session pickup

P2 (find-the-move) + P3 (narration) + P4 (audit). Do NOT re-stub the hook.
