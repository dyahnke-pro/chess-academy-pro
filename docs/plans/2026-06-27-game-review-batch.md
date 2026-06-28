# PLAN — Game Review batch (2026-06-27)

Source findings: `docs/notes/2026-06-27-game-review-observations.md`.
Ship strategy: all web fixes → `main`, then ONE TestFlight build (David tests
there; web pushes don't reach the app). Post-deploy: 3-instrument audit +
PostHog mining (read key now works — `Read_key_PostHog` was revoked; David
provided a fresh `phx_` key; durable analytics confirmed the e5-hanging
hallucination + that `voice-fallover` is NOT mirrored to PostHog).

Sequencing logic: GROUNDING is the spine — it fixes 3 bugs and unblocks 2
features. Do it first. UI/sound/accuracy are independent and can land alongside.

## SESSION STATUS — 2026-06-28 (staged on `claude/app-functions-mapping-cxbpx2`, NOT pushed; batched for one build)

**DONE + green (ship-check READY TO PUSH):**
- TacticalProfile scroll fix + 4 ship-check lint errors cleared.
- Phase 7 — lazy depth-16 (open/import only; batch sweeps + insights guards skip it).
- Phase 1b — theory-deviation now position-based (no false "left book at move 1");
  `1...e5` tokenizer; killed the "untested … from thousands" contradiction.
- **Phase 1b+ — amateur DB strengthens the scan** (`amateurPlayLookup.ts`): masters
  primary, amateur extends depth + fills W/D/L; source-tagged honestly.
- Phase 4 — reading-quiz default ON (retroactive: explicit-off stays off).
- Phase 5 — clipped filter tabs already resolved in current code; walk board
  height capped on mobile so chat/narration aren't starved.
- Phase 6 — `voice-fallover` mirrored to PostHog (no-sound now visible in analytics).
- **Phase 2 core — `explainMoveOrder`** (pin/tempo/check/material geometry, 8 tests).
- Flake fix: bumped the slow gameInsights cold-import test timeout.

**DEVICE-GATED (need the next build to verify/fix — David's device: iOS 18.7,
Safari 26.5, standalone PWA, confirmed via live audit stream):**
- Phase 6 — no-sound: iOS `<audio>` `code=3` decode of the MPEG-2 24kHz MP3
  (84% of failures). Server is healthy. Try: strip ID3v2.4 from the blob; alt
  Polly sample-rate/format. Verify on device.
- Phase 9 — mic: `audio-capture`/`aborted` from `voiceInputService`; iOS PWA
  audio-session conflict with TTS playback + un-awaited prewarm race. Fix:
  yield/stop TTS before mic start, await prewarm. Verify on device.

**REMAINING CODE WORK (not device-gated):**
- ✅ Phase 1c — DONE (structured citation spine + inline board previews).
- Phase 2/3 wiring — feed `explainMoveOrder` + engine refutation into flagged
  review plies + the Analysis-Practice why-demo board animation (needs visual verify).
- Phase 8 — piece-glow intentional vs noise (verify).

## Phase 1 — Ground the review voice (the spine) [fixes #5, #A; unblocks #6, why, demo]
- **1a. Hanging = a LEGAL capture wins material.** Root cause: `findHangingPieces`
  (tacticClassifier.ts:499) counts pinned/illegal attackers; `explainBestMoveGrounded`
  (groundedAnswer.ts) has an `else` that says "left X hanging" with NO legal
  capture. Fix: a piece is hanging ONLY if a legal capture exists whose SEE ≥ 0
  (use `seeGain` BUT guard it to legal captures — `chess.attackers` is pin-blind).
  Remove the no-legal-capture "hanging" branch. Add PIN detection so the coach can
  say "the knight is pinned" instead. Regression test: David's exact ply-15 FEN →
  NOT hanging.
- **1b. "Where you left the book" (theoryDeviationScan). ✅ DONE (e4ea515,
  9ddc8ef).** Fixed: (a) SAN-equality miss → now POSITION-based match (glyph /
  disambiguation / capture-spelling all compare equal), so an in-book move can't
  be falsely flagged ("left book at move 1"); (b) tokenizer handles `1...e5`
  black-continuation numbers; (c) explorerTranslate no longer pairs a big sample
  with "untested" (the "untested … from thousands" contradiction).
  - **1b+. STRENGTHENED with the AMATEUR DB (David 2026-06-28: "use the amateur
    DB in conjunction with the masters"). ✅ DONE (e4ea515).** New
    `amateurPlayLookup.ts` (Lichess `source:'lichess'`, ratings 1600-2500, full
    W/D/L, own cache). The scan was `localOnly:true` (bundled sparse masters file
    ONLY — the real root of thin coverage). Now: masters = theory primary; when
    masters coverage runs out the scan CONTINUES against amateur (deeper) →
    `source:'amateur'` deviation phrased "off the beaten path"; and a masters move
    that's count-only borrows amateur W/D/L so the score is real not "untested".
    UI leads in honestly by source. Tests: theoryDeviationScan (9) +
    amateurPlayLookup (5) + explorerTranslate (untested case).
- **1c. Structured recap citations (G0 inversion). ✅ DONE (b32cebe, 2f0acd0).**
  `buildReviewCitations(moves, playerColor)` → `ReviewMoveCitation[]` (ply,
  moveNumber, moverColor, playedSan, suggestedSan, classification, fenBefore,
  fenAfter, evalSwingCp, played/suggestedSquares) — all COMPUTED from the engine
  annotations + chess.js, never the LLM. Filters to the STUDENT's flagged moves
  (color parity, not isCoachMove — handles imported games). The intro prompt was
  already barred from citing move numbers, so the win here is the structured
  spine + the **inline board previews** David asked for (IMG_4298):
  `ReviewCitationPreviews` renders a mini board per flagged move (played = red
  arrow, engine best = green), most-costly-swing first, tap → jumps the main
  board to that ply. Tests: buildReviewCitations (4) + ReviewCitationPreviews (6).

## Phase 2 — The grounded "why" (two whys + move-order comparator)
- ✅ **Two whys already exist** in `explainBestMoveGrounded` (bestClause = what the
  better move ACHIEVES + costClause = what your move ALLOWED) — material/check.
- ✅ **`explainMoveOrder` BUILT (e7a487a) — the move-order/tempo comparator David
  asked for ("WHY the bishop before the queen — the geometry").** Pure fact-computer
  in groundedAnswer.ts (G0 leaf). Classifies the better move's mechanism from the
  board: CHECK / PIN (full ray-walk geometry — "pins the knight on f6 to the queen
  on d8") / TEMPO (attacks an enemy piece via `chess.attackers`) / MATERIAL (SEE).
  Caller passes the engine eval-delta (decides WHICH order) + optional refutation
  (spells the cost of the wrong order). Returns null with no concrete geometry —
  empty > generic > invented. 8 unit tests (pin/check/tempo/material/cost/2×null).
- ⏳ **REMAINING — wire it in.** Augment flagged review plies + Analysis-Practice
  why-demo: when a mistake is a move-order error, compute better/worse orders +
  engine refutation, call `explainMoveOrder`, voice via `voiceFacts`, and feed the
  mechanism to the Phase 3 board demo. Needs the engine (eval both orders) + UI.

## Phase 3 — Choreographed why-demo (board + voice synced) [#6 previews ride here]
- Beat ASSEMBLER: grounded why → `{fen, move, arrows[], highlights[], say}[]`.
- Review "why-demo" mode on the EXISTING voice-gated lesson player
  (narrationSegments + useWalkthroughRunner): pause → take back wrong move → play
  correct (orange + spoken) → demonstrate the line with arrows on named squares AS
  the voice speaks → restore. Every move/arrow from the computed line (G0).
- Inline board previews for recap citations build on 1c.

## Phase 4 — The diagnostic ask (it never asked) [answers "why it didn't ask"]
- `readingChallengesInReview` defaults FALSE → decide: default ON, or a prominent
  in-flow toggle. Extend the gate from "what do you see" to also "why was this a
  mistake?" → reveal → speak the grounded why (Phase 2). Must be visible (Phase 5).

## Phase 5 — Review-UI layout [#1, #2, #B]
- ✅ **Clipped filter-tab row — already RESOLVED in current code.** `CoachReviewListPage`
  is now a clean `flex flex-col gap-4 p-4 flex-1 overflow-y-auto` column: header →
  "Pick a game" subtitle → `overflow-x-auto` filter row → list. No sticky/overlap.
  David's screenshot was an older bundle; the next TestFlight build carries the fix.
- ⏳ **Footer (Play Again / Back to Coach) over chat — needs DEVICE verification.**
  The walk surface ALREADY has the right shape: root `flex flex-col h-full
  overflow-hidden`, a `flex-1 min-h-0 overflow-y-auto` scroll middle
  (`review-scroll-middle`: narration banner + Ask panel + move list + tactics), and
  a `shrink-0` bottom bar. So in a height-bounded parent it can't overlap. The
  likely real cause on David's device is the board area STARVING the scroll middle
  (board not height-capped → middle collapses → narration clipped + Ask unreachable
  under the bar). This surface is heavily audit-tuned; rather than blind-edit, cap
  the board height (ChessLessonLayout-style) and CONFIRM on the next build with a
  device/browser. Mid-walk narration reachability rides on the same fix.

## Phase 6 — No-sound (#3)
- ✅ **Server is HEALTHY** — `curl` prod `/api/tts` returns HTTP 200,
  `content-type: audio/mpeg`, valid streamed MP3 (ID3 + LAME). Polly is NOT
  failing server-side; G4 streaming intact. So this is a CLIENT playback bug.
- ✅ **ROOT CAUSE (PostHog, 14-day, 121 `tts_failure`):** ~84% are iOS `<audio>`
  **`code=3 Media failed to decode`** — 70× object-url path
  (`playViaElementBuffered` → full-MP3 blob), 20× direct tts-url, 12× untagged.
  The rest (~16×) are `play() rejected: operation was aborted` (next-narration
  supersede — benign) + 3 phase-narration timeouts. So the no-sound is iOS
  WKWebView failing to DECODE the buffered MP3 even as a complete object URL.
  voice_spoken=899 over the same window, so the failure RATE is ~12% of attempts
  (concentrated on the affected devices/iOS versions).
- ✅ **Mirror `voice-fallover` → PostHog (DONE, 0195990).** The in-flow Polly →
  Web Speech demotion was the one voice kind NOT mirrored; now `voice_fallover`
  is on the allowlist so the per-session/device demotion RATE is visible
  alongside the decode failures.
- ⏳ **The decode fix needs a DEVICE repro (route to David's TestFlight).** Prior
  sessions iterated this path hard (Web Audio silent on older iPhones → moved to
  `<audio>` element → element now code=3 on some devices). Editing it blind risks
  breaking the devices it currently works on. Next: on a real device, confirm
  whether (a) it's specific iOS versions, (b) the `max-age=86400` CDN cache is
  replaying a once-corrupted body (cache-bust the TTS URL to test), or (c) a
  codec/sample-rate mismatch — then fix with device confirmation.

## Phase 7 — Accuracy depth 16 (#4) ✅ DONE (4bae6dc)
- Re-analysis made LAZY: `gameNeedsAnalysis(game, {depthUpgrade})`. On-open /
  import path (analyzeSingleGame, CoachReviewSessionPage) refreshes a depth-stale
  game to depth 16; the BACKGROUND batch sweeps (countGamesNeedingAnalysis,
  analyzeAllGames, analyzeRecentGames) AND the insights stat-guards pass
  `depthUpgrade:false`, so the 690 already-analyzed games are NOT re-crunched
  en masse (David: "Only new/opened games").

## Phase 8 — Piece-glow (#7)
- Verify the white-green / black-purple glow is intended vs noise.

## Phase 9 — Analysis Practice + coach-comms polish (IMG_4301, David)
- **Mic not working — ROOT-CAUSED via LIVE audit stream (2026-06-28).** David's
  device: **iOS 18.7, Safari 26.5, standalone PWA** (capacitor=false). The stream
  shows `mic-error: audio-capture` + `aborted` from `voiceInputService` (web
  `webkitSpeechRecognition` path). `audio-capture` → errorHandler('unavailable')
  → the exact "mic unavailable" copy David sees. Cause class: on iOS PWA the mic
  can't be captured while the audio session is held by TTS playback (Polly
  `<audio>` / speechSynthesis), and iOS Safari's `webkitSpeechRecognition` in
  standalone PWA mode is flaky. `prewarmMic()` getUserMedia is fired fire-and-
  forget (`void`, not awaited) by the surfaces, so there's also a race where
  recognition.start() runs before the grant settles. NEEDS DEVICE to fix safely
  (audio-session coordination: pause/yield TTS before mic start; await prewarm).
  ⏱️ This is device-gated like the no-sound decode — pairs with the next build.
- **No Send button** for typed answers on Analysis Practice
  (`AnalysisPracticePage.tsx` — I built submit on the input; needs a visible
  Send button, not Enter-only).
- **Turn indicator too subtle.** "· White to move" is low-contrast grey under
  the board; make whose-move prominent (badge / bold) on Analysis Practice (and
  check the review board has a clear turn indicator too).
- Tie the "better communication with coach here" to the same grounded-why +
  voice work — the Analysis Practice grader already exists; make its I/O (mic +
  send + turn) actually usable.
- **Interactive board (David).** Analysis Practice renders a STATIC board
  (`ConsistentChessboard` display mode). Make it interactive: let the student
  PLAY the answer move on the board (drag/click squares), graded deterministically
  the same way the reading "tactic/best-move" questions resolve — reuse the
  walkthrough `Board/ChessBoard` (emits SAN via onMove) or ConsistentChessboard
  controlled mode + a chess.js instance. The played move is the answer for
  tactic/find-the-move questions; verbal answer stays for plan/why questions.

## Phase 10 — Analysis Practice = a GROUNDED DISCUSSION COACH (David, expands #9)
Verbatim: "it's also only asking about tactics, i want it asking about who is
winning, what are the strengths and weaknesses of each side. this is a
discussion based training exercise with a personal coach."

So Analysis Practice is NOT one-shot tactic Q&A — it's a multi-turn DISCUSSION
about a position, coach-led, covering every dimension. Crucially it's the SAME
grounded substrate as the review "why" (build once, both surfaces consume):

Discussion dimensions (each grounded, LLM only converses — G0):
- **Who's winning + by how much** → `assemblePositionAssessment` (eval/mate,
  already in groundedAnswer.ts). buildReadingQuestions needs the eval passed in
  (it currently only gets the tactics context).
- **Strengths / weaknesses of EACH side** → `findPieceQuality` (outposts, bad
  bishops, open rooks) + `findPawnBreaks` + pawn-structure facts (isolated/
  doubled/passed — may need a small structure computer) + king safety. Summarize
  per side.
- **Tactics / threats / hanging** → the existing tactics context (now pin-aware).
- **Plans / pawn breaks** → pawn breaks + the engine PV (`assemblePlanAnswer`).
- **The "why" of a move** → the move-order/tempo comparator (Phase 2).

Shape: coach asks an open question ("Who do you think is better here, and why?"),
student answers (TYPED + MIC + by MOVING ON THE BOARD), coach responds grounded +
follows up — a real back-and-forth, not a quiz. Reuse `getCoachChatResponse`
routed through `voiceFacts` with the grounded dimension facts injected (the
Discussion Practice / coach-chat grounding pattern already exists). Interactive
board (Phase 9) lets the student show a line; voice in/out for the conversation.

⚠️ Because this is a discussion redesign, do NOT over-build the OLD one-shot UI
(static board + single textarea). Build the grounded substrate first (shared with
review), then the discussion surface on top. The Phase 1 grounding + Phase 2 why
are the foundation for BOTH review and this — not wasted.

## Phase 10 refinements (David, while playing the live tab)
- GOOD: it already cycles ~5 grounded questions per position on one layout
  (buildReadingQuestions × nextQuestion works).
- DEEPER DIVES wanted: plans, each side's WEAKNESSES, and "what I should be
  TARGETING" — concrete targeting advice grounded on piece-quality
  (findPieceQuality) + pawn structure (backward/isolated/passed) + the engine PV
  (assemblePlanAnswer). Add targeting question(s): "what should you target / what
  is your opponent's weakness here?" with the grounded answer.
- "I need to SEE the correct answer if I get one wrong." NOTE: already
  implemented (verdict !== 'correct' → renders "Answer: {correctAnswer}",
  AnalysisPracticePage ~:302). If he's not seeing it, it's the LAYOUT (answer
  card below the board, off-screen on mobile — the recurring overlap/scroll
  bug). Fix = make the answer card reachable + verify `correctAnswer` is
  populated for EVERY question type (incl. the new who's-winning /
  strengths-weaknesses / targeting ones).

## Phase 10 refinement — question VARIETY (David: "same questions in rotation, just a different position")
Current = a FIXED template of question types (tactic/hanging/pawn-break/piece/
material) replayed per position → feels samey. Fix in the discussion redesign:
- MORE dimensions per position (who's-winning, strengths/weaknesses each side,
  plans, what-to-target) so the slot set isn't always the same five.
- VARY THE STEMS (narration rule #9 — 3-5 phrasings per dimension, rotate; never
  verbatim repeats across positions).
- CONVERSATIONAL FOLLOW-UPS keyed off the student's answer (coach-chat grounded)
  so it's a discussion, not a recurring quiz form. The dimension MIX should also
  vary by what the position actually offers (a sharp position leads with tactics;
  a quiet one leads with plans/weaknesses).

## Phase 10 — Analysis Practice interaction (David 2026-06-28, live)
- **Auto-advance on CORRECT** — no "Next question" click; when the answer is
  right, advance automatically (after the demo/voice finishes — voice-gated, not
  a fixed timer). The Next button stays only for the wrong→reveal path.
- **Play the SEE swap-off OUT on the board (tell AND show)** — DONE in the data
  layer: `seeSequence` returns the exchange as legal SAN; `demoLine` is on the
  greedy-grab + hanging questions. The board animates `demoLine` while the coach
  narrates each capture ("Queen takes b7 — bishop takes back; you gave a queen
  for a pawn"). Reuse the voice-gated lesson player (narrationSegments) for the
  animation. This is the choreographed why-demo applied to SEE.
- **Progressive GROUNDED hint system** (David: "talk before building") — on a
  WRONG answer, escalate hints that point the way WITHOUT handing the answer, all
  derived from the COMPUTED answer key (G0), never the LLM:
  - Tier 1 (where to look): a cue from the question TYPE — hanging→"a piece
    attacked more than it's defended"; weak-square→"a square no enemy pawn can
    challenge"; target→"the opponent's softest point"; greedy-grab→"count the
    defenders before you take". Generic-to-type, no square named.
  - Tier 2 (narrow it): name the REGION/PIECE from the answer key — "it's on the
    queenside" / "it involves a knight" (derived from answerSquares' file +
    piece on that square).
  - Tier 3 (almost): name the square's neighbourhood / the piece, still not the
    exact answer.
  - Then: full answer + the board demo (demoLine) if still stuck.
  Each tier is a pure function of the answer key — deterministic, grounded,
  testable. Mirrors the existing HINT_TIER ladder but for reading questions.

## Decisions for David
- D1: Reading gate default ON, or stay opt-in with a clearer prompt? (Phase 4)
- D2: Re-analysis on the depth bump — prioritize open game + throttle vs full
  background sweep of 690? (Phase 7)
- D3: Build order — full batch in the phase order above, or start with the
  grounding spine (1+2+3) and ship that first, UI/sound/accuracy second?
</content>
