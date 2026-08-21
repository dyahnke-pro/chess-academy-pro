# LLM-Narration Grounding + Tactical-Read Sweep (2026-08-21)

David: "Learn with coach tier 3 narrations need to have this. Also the hint
function. Anywhere LLM computes narrations." — i.e. every place an LLM phrases
a narration must (a) carry the tactical-read facts (the but-turn / best line /
verdict) where a move/tactic is being taught, and (b) have the hallucination
guards (board-claim + tactic + move grounding).

## Coverage map (measured 2026-08-21)

| path | board-claim grade | tactic gate | move-guard | tactical-read facts |
|---|---|---|---|---|
| TacticDrillPage (computed narration) | ✅ | (facts) | ✅ | ✅ |
| usePositionNarration (Read this position) | ✅ via voiceService | — | directive | ✅ |
| useHintSystem (HINT) | ✅ validateBoardClaims | ✅ stripUngroundedTactic | ❌ | ❌ |
| usePhaseNarration (Learn/Play phases) | ✅ via buildVoicePackage | — | ❌ | ❌ |
| coach chat answer (assembleMoveEvalAnswer) | preferRaw / facts | — | n/a (raw) | ✅ |
| GameChatPanel (Play/Learn ask) | via chat | — | n/a | ✅ |
| openingGenerator TIER-3 Learn walkthrough | build-time narrationAccuracy | — | ❌ | ❌ |
| useLiveCoach | speakForced (source-dependent) | — | ❌ | ❌ |
| coachMoveCommentary / mistakeNarrationVoice / openingSectionNarrator | verify | — | ❌ | ❌ |

Guard primitives that already exist and should be the shared vocabulary:
- `validateBoardClaims` / `stripDisprovenSentences` (false SQUARES) — universal via `voiceService.speakGrounded`.
- `stripUngroundedTacticSentences` (false fork/pin) — hint uses it.
- `voiceNamesUngroundedMove` (invented MOVES) — new; needs the line context.
- `tacticalReadFacts` / `assembleMoveEvalAnswer` topLines (the but-turn).

## Two LOCKED contracts this sweep collides with — need David's call

1. **Hint honesty-reveal contract.** A hint is a GRADUATED reveal: name the
   piece + goal, WITHHOLD the square. The tactical read's but-turn NAMES the
   tempting move (a square). Injecting the full read into a hint could over-help
   / break the graduated-reveal. DECISION NEEDED: does the but-turn belong in a
   hint (and at which hint level), or only its "don't be fooled" shape?

2. **Walkthrough "keep computed for now" + "NO LLM decides a walkthrough
   teaching."** Tier-3 Learn narration is generated in `openingGenerator`
   (baked/computed floor). The tactical read is a RUNTIME engine computation.
   Adding it to tier-3 means either (a) computing the read at generation time,
   or (b) a runtime splice — both touch the locked walkthrough doctrine.
   DECISION NEEDED: generation-time vs runtime, and whether this is the moment
   to extend the walkthrough beyond "keep computed for now."

## Phased plan (safe → contract-touching)

- **P1 (safe, no contract):** ensure every LLM-computed narration path is
  board-graded. Route ungraded LLM prose (verify useLiveCoach, the service
  narrators) through `speakGrounded`. Pure hallucination-hardening, no feature.
- **P2 (safe):** extend `voiceNamesUngroundedMove` coverage where a line/PV is
  available (already on drill).
- **P3 (contract 1):** the hint's tactical-read — pending the reveal-contract call.
- **P4 (contract 2):** tier-3 Learn tactical-read — pending the walkthrough call.

## Status
- Done: drill, review, read-position, coach chat, Play-on-ask, Learn-on-ask.
- Not done: tier-3 Learn walkthrough, hint (feature); P1 grading gaps (verify).
