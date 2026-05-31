# Coach Play — fast template TTS + voice fallback chain (2026-05-31)

David: *"i want the tts speech back. voice narration and thinking time
between coach moves are too slow in coach tab."* Plus a follow-up:
*"tts tries first, if fails then polly, if that fails then web speech"*
and *"board also reset on me mid game!"*

## Diagnosis (from the pasted /coach/play audit log, build e1ec6c4)

The surface is `CoachGamePage` (`/coach/play`), NOT `CoachPlaySessionView`.

1. **Per-move LLM commentary was the latency killer.**
   `coachMoveCommentary.getLlmCommentary` measured **4–15s per move**
   (Finding 79: `latencyMs=14674`; 209: `12564`; 137: `4648`). The
   coach's reply is gated behind it — `await generateMoveCommentary`
   (CoachGamePage ~3235) runs BEFORE `game.makeMove` (~3577) which
   triggers the coach-move effect. So every move stalled multiple
   seconds. → "thinking time between coach moves too slow" +
   "voice narration too slow".

2. **Polly was dropping to robotic Web Speech.** Findings 49/51/53/170/
   172/203 (`Polly failed → Web Speech`). Root cause: the LLM streamed
   multiple sentences to Polly at once (Findings 45–53: four `speakPolly`
   + three fallovers in the same instant; 62/300 `tts-concurrent-speak`).
   Each new `speak()` calls `stop()` which bumps `stopGeneration`, so the
   prior in-flight `playAudioFromStream` returns false and the superseded
   utterance wrongly falls to Web Speech. → "i want the tts speech back".

3. **Board reset mid-game** — the brain can emit `reset_board`, which
   `GameChatPanel` dispatches → `onResetBoard` → `handleChatResetBoard`
   → `handleRestart()` wipes the live game. (Open — see below.)

## Decisions (David)

- Per-move voice = **fast deterministic template**, LLM removed from the
  hot path (he picked "Fast template speech back").
- Voice fallback chain = **streaming TTS → buffered Polly → Web Speech**
  (Web Speech allowed as the genuine last resort).

## Changes landed

- **`src/utils/fastMoveNarration.ts` (new) + test.** Pure
  `buildFastMoveLine()` — turns the already-computed move + tactic +
  classification + density into ONE short concrete spoken line (or '' for
  silence). No invented chess (G3); MOVES come from chess.js. 9 unit tests.
- **`CoachGamePage.tsx`.** Module flag `USE_LLM_MOVE_COMMENTARY = false`.
  - Per-move commentary: `shouldFire` now ANDs the flag (LLM block dead,
    kept intact for revert); after it, speak `buildFastMoveLine(...)`
    instantly via the existing `speakIfFree` path.
  - Blunder alert: the `coachService.ask` LLM call is gated behind the
    same flag; the instant deterministic `explanation` template (the
    "Your knight on f6 is hanging." line) is used instead.
- **`voiceService.ts`.** `speakPolly` streaming branch: when
  `playAudioFromStream` fails to START *and the generation is still
  current* (i.e. not superseded/stopped), fall back to new
  `playBufferedPollyFallback(url, key)` before Web Speech. iOS → native
  `<audio>` element off the `/api/tts` URL (proven old-iPhone path);
  desktop → re-fetch + buffer + Web Audio + cache. G4-safe (client-side
  native buffering; server still streams).

### Device tiering (already existed, confirmed)
`canStreamProgressivePlaybackFor` (voiceService.ts:70): iOS 17.1+ &
desktop/Android stream; iOS <17.1 already plays full-MP3 Polly via the
`<audio>` element. BOTH tiers are real Polly (Ruth), not Web Speech.

## Validation
- `npm run typecheck` ✓  `npm run ship-check` ✓ READY TO PUSH
- `fastMoveNarration.test` 9/9 ✓ ; CoachGamePage + voiceService 65/65 ✓
- NOT yet run: the mandatory G1 3-instrument PROD audit (needs the live
  deploy + a device for the voice tiers). Route to David / post-deploy.

## Open — board reset mid-game (NOT yet fixed)
Root cause: brain-emitted `reset_board` → `handleChatResetBoard` →
`handleRestart()`. Two candidate triggers, fix differs per trigger:
- **Brain spontaneously emitted `[[ACTION:reset_board]]`** in chat text
  (`GameChatPanel.tsx:821 / :1109`). Fix: make those auto-dispatches a
  no-op when a game with moves is in progress (the coach should never
  wipe a live game unprompted).
- **Router mis-classified David's message as a reset intent**
  (`GameChatPanel.tsx:388`). Fix: tighten the intent router / require
  confirmation mid-game.
Need David's confirmation of what he typed before the reset to fix the
right one without breaking legitimate "restart the game" requests.
