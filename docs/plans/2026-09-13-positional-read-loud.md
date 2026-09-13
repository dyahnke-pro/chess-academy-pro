# Positional read — loud & proud on Learn, on-demand on Play (David 2026-09-13)

## What David asked

He saw the `buildPositionalRead` output ("Wow. That is a beautiful teaching
tool!") and wants it AUDIBLE:

- **Learn (`/coach/teach`)**: loud and proud, **checking every move** for a
  relevant board-true observation, **both sides** (opponent's pieces too),
  **never repeating a phrase**.
- **The rule, generalised** (his words): *"We gate double phrases. If it has
  nothing new to say it stays quiet. If something new is calculated, speak it.
  I want it checking every turn for new and different teaching phrases. Same
  with all of the other calculators!!"*
- He said **No** to "aside behind a note/plan" — so a corpus note still leads;
  the positional read does not bolt onto it.
- **Play (`/coach/play`)**: on-demand only, **when asked through the text
  field** — never volunteered mid-game (Play stays a pure playing surface).

## Why it was silent (the two blockers found)

1. `observation` (positionalRead's `VoiceFactKind`) is NOT in
   `DNA_VOICE_KINDS` (CoachTeachPage.tsx:345). With `NARRATE_DNA_ONLY=true`
   the package is rebuilt from DNA kinds only, so the observation is filtered
   out **every turn** — dead on Learn, not just Review. His own 2026-08-23 DNA
   whitelist excluded it as "generic filler"; today, having seen it, he's
   lifting that.
2. Cross-turn novelty doesn't exist. `buildVoicePackage` dedupes only WITHIN a
   turn (`alreadySaid`). Across turns, only positionalRead had its own set;
   every other lane could repeat a phrase all game.

## The build

### Learn
1. **Add `observation` to `DNA_VOICE_KINDS`** — the change that makes the tool
   audible. It stays rank-0, so it never displaces teaching and only fills the
   DNA 3-reason breath when there's room.
2. **Drop the `quietTurn` shackle** on the positionalRead offer
   (CoachTeachPage.tsx:7481) — compute it EVERY turn so it's "checking every
   move". Keep `!softStandDown` (yields behind a corpus note — honours "no
   aside behind a note" + note-primary). Dedup + rank + the 3-reason cap decide
   what's actually heard.
3. **Cross-turn novelty for ALL lanes** — a per-game `Set<string>` of spoken
   sentence-keys, threaded into `buildVoicePackage` as a new `priorKeys` param,
   seeded into `seen`, updated from each package that speaks. This is the "same
   with all the other calculators" — no lane repeats a phrase all game.

### voicePackage
- New optional 3rd param `priorKeys?: ReadonlySet<string>`. Backward-compatible
  (every existing 1-/2-arg caller unaffected). Seeds `seen` (reason
  `duplicate`, not `already said this turn`). Export a `spokenSentenceKeys(pkg)`
  helper so the caller can feed kept keys back into its per-game set.

### Play (and chat/teach on-demand)
- Enrich `assemblePositionAssessment` (groundedAnswer.ts) — what answers "read
  me the position / what's the plan / how do I stand" — to append the top
  `readPosition` observations (both sides), deduped against the eval/tactic
  lines already in the answer. On-demand via the text field on Play; it also
  improves the same on-demand answer on teach/chat. Never auto-narrated on Play.

## Files
- `src/services/voicePackage.ts` (+ `.test.ts`)
- `src/components/Coach/CoachTeachPage.tsx`
- `src/services/groundedAnswer.ts` (+ assessment test)
- gates: `boardComputerChatCoverage`, `laneReachability`, `positionalRead.test`

## Done =
ship-check green → push main → prod bundle advances → 3-instrument MUTED
post-deploy audit (Learn narration fires the observation lane + never repeats;
Play answers a typed "read the position" with the both-sides read) → report.

## Status
- [x] voicePackage priorKeys + spokenSentenceKeys + test (46 tests green)
- [x] CoachTeachPage: observation→DNA kinds; quietTurn shackle dropped; per-game
      novelty set threaded through all 4 buildVoicePackage sites + recorded at
      both speak sites; cleared on new game
- [x] groundedAnswer: assemblePositionAssessment appends readPosition (both
      sides) on demand; all 3 coachApi call sites already pass fen
- [x] tests/gates: voicePackage, groundedAnswer, positionalRead, laneReachability,
      boardComputerChatCoverage, computedVoiceGrounding, danyaDeviceCoverage,
      danyaExploitability, perspectiveVoice — all green; typecheck clean
- [ ] ship-check + push + deploy + audit
