# Data-sweep findings — 2026-07-07 (48h PostHog sweep)

David asked to fine-tooth-comb the telemetry and fix every problem. This is the
full ledger with root cause + fix status, so the next session/build acts on it
without re-deriving.

## Fixed this session (on `main`)
- **Blunder-alert accuracy** (`d21ccff`) — generic "loses material" fired on
  positional blunders (false); hanging-piece line picked ANY piece incl. the
  opponent's. Now: student's-own-hanging-piece only; honest positional verdict
  otherwise. `CoachGamePage.tsx` ~3598.
- **Hallucination root** (`c6a77f2`) — `TACTICAL_AWARENESS_BLOCK` rule 1/6 no
  longer force the LLM to name a tactic every turn (the 24 tacticClaimGate + 12
  boardClaimGate trips). `identity.ts`.
- **Voice-fallover diagnostic** (`32ec6bd`) — the fallover event now records WHY
  Polly failed (server http/AWS vs client iOS playback) in the SUMMARY (PostHog
  drops `details`). This is what pins the voice-drop root on the next game.

## Fixed in the in-review external build (native-engine build, Apple review)
- **Tactics/game board freeze** — ROOT: iOS fell back to crashy WASM Stockfish
  (`asm`/`single` — OOM / call_indirect-trap / init-hang) instead of
  `ios-native`. The in-review build is native-first with an asm.js-ONLY fallback
  (asm is bulletproof plain-JS; the crashy ones were `single`/`multi` WASM).
  Fragility to watch: `_nativeFallbackAttempted` permanently drops a session to
  the fallback after ONE native failure (`stockfishEngine.ts:491`).
- **Spanish accents** — the OLD build's Web Speech fallback used the device's
  system voice (device locale zh-CN). Current code has
  `WEB_SPEECH_FALLBACK_ENABLED = false` → no Web Speech → no Spanish accents
  (trades to SILENT drops → the voice-drop item below).
- **iOS TTS decode (code=3 "Media failed to decode")** — already fixed: iOS
  Capacitor routes through `playViaElementBuffered` (object-URL), not the
  chunked direct URL. The one `[tts-url]` event was the old build.
- **Native mic** — the `@capacitor-community/speech-recognition` path is in the
  build (old build took the dead webkitSpeechRecognition path).

## Graceful / not a bug
- **lichess_error (54, circuit opened ×5)** — transient Lichess upstream 502s on
  `source=masters`; proxy verified HEALTHY now (200, correctly-empty for obscure
  deep FENs). Circuit breaker opens after 3 fails, auto-resets in 2 min. Working
  as designed. `lichessExplorerService.ts`.
- **coach_narration_skipped (133)** — `narrationMode-off` (coach's own moves) +
  `empty-commentary` (routine moves). Expected.
- **CoachReviewSessionPage.adapt $exception (1)** — a `teach-` game with empty
  PGN → `adaptGameRecord` returns null, logs it, degrades to error state.
  Edge case; mislabeled `stockfish-error`. Low priority.

## OPEN — needs the new build + a fresh game
- **Voice drops (114 `voice_fallover`)** — Polly fails on iOS → silent (Web
  Speech disabled). NOT the decode bug (fixed) and NOT a server issue
  (`/api/tts` verified healthy). Root unknown until the shipped diagnostic runs
  on David's device. Likely candidates: the overlapping-narration FLOOD
  (~170 attempts / 22 min — the code comments name this as a Polly→drop cause)
  or an AVAudioSession state issue. **Do NOT blind-edit the iOS voice flow** —
  the diagnostic on the next game names the cause; fix it then.
  - Candidate fix once confirmed: pace/coalesce narration on iOS so a still-
    playing utterance isn't superseded (root of the flood-drop), OR a single
    retry of the buffered playback before the silent fallover.

## Next step
David plays a game on the in-review build once Apple approves it → the
`voice_fallover` summary + `tts_failure` reasons reveal the exact iOS cause →
close out the voice drops + confirm the freeze is gone.
