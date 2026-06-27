# PLAN — Coach audit tools + mic fix + Position-Reading feature (2026-06-27)

Three threads from David's 2026-06-27 session, in priority order.

---

## Thread 1 — Coach gap audit tools (BUILT, run on the runner)

Four new prod-only audit tools (sandbox egress proxy drops browser TLS;
dispatch via `post-deploy-audit.yml` `workflow_dispatch scripts=...`):

- `audit-coach-move-grounding.mjs` — proves the coach never *recommends* an
  illegal/own-occupied move (the "develop the knight to f3 with a knight on f3"
  class). **Classifies bare SAN as recommend/recap/ambiguous** and hard-fails
  only unambiguous recommendations (G7 #4). **Verdict on prod (ef19798): PASS** —
  the original FAIL was the probe miscounting a move recap, NOT a coach bug.
- `audit-coach-play-gaps.mjs`, `audit-coach-teach-gaps.mjs`,
  `audit-coach-review-gaps.mjs` — per-function GAP coverage grids.

Tool bugs found + fixed:
- `audit-lib/audit-listener.mjs` `stop()` drained forever (kept a runner job
  hung 39 min). Fixed: `closeAllConnections()` + 2s hard cap before
  `server.close()`. + teach-gaps closes browser before listener + 12-min watchdog.

### Audit-found findings — triage (run ef19798)

ARTIFACTS / config (NOT app bugs):
- **`voice-pref-variance`** (teach) — confirmed PROBE bug across two runs:
  full/brief/silent produce identical numbers → the probe never actually
  switches `coachNarration` before measuring. Fix the probe (reload after the
  Dexie write, or set via the store, before sampling), not the app.
- **`gap1-voice-marker-audit-fired`** (review) — 401: the GitHub **repo secret
  `AUDIT_STREAM_SECRET` is empty** (session env has it; repo doesn't). Set the
  repo secret. In-page voice-marker check passed regardless.
- **`gap3-explore-stockfish-reply`** (review) — Playwright couldn't perform the
  board drag. Harness limitation; consider `force`/coordinate drag.

Findings — resolved:
- [x] **`gap5-deeplink-move-jumps`** (review) — REAL bug, FIXED. The deep link
      seeded only legacy `reviewState`; the walk header reads
      `walkPlayback.currentPly` which booted at 0 and the narration-load effect
      snapped back to 0. Added `initialPly` to `useReviewPlayback` (lands the
      ply on first narration load + when narration never arrives, clamped,
      applied once). +4 regression tests. (commit ce117f9)
- [x] **`clock-restore-on-resume`** (play) — HARNESS-timing artifact, probe
      FIXED. `useChessClock` enables + seeds the base time on selection, but the
      player-info bars (clock chips) mount with the ACTIVE game view, not the
      pre-move setup screen — so the pre-move count was 0. Moved the clock
      assertion to after the first move. (commit 221dde2)

Findings — need a LIVE run to distinguish real-vs-artifact (NOT blind-fixed):
- [ ] **`voice-pref-variance`** (teach) — identical evDelta/transcriptLen across
      full/brief/silent → the setting isn't reaching the measured voice. The
      probe writes `profiles.preferences.coachNarration` + full-reloads (which
      should re-hydrate `activeProfile`), and the app reads exactly that field
      (`coachCommentaryPolicy.ts:42`, `coachNarration.ts:77`). So either the
      probe writes a non-active profile row, or the Vienna walkthrough voice
      path bypasses the gate. Confirm on a live browser: read back the value
      post-reload + check which path the listener counts, THEN fix probe-or-app.
- [ ] **`gap2-automated-mistake-enrollment`** (review) — fixture was "not found"
      → cold synthetic game with no classifiable mistakes to enroll. Re-run with
      the real-data fixture before calling it an app bug.
- [ ] **`face-mode`** (teach) — flaky (passed one run, failed next at the
      picker). Confirm timing vs real race on a live run.

NOT-TESTED (correctly, LLM-tool/reachability dependent): `quiz-wrong-answer`,
`play-variation-and-return`, `trap-prompt-accept/skip`, retired blunder-capture.

---

## Thread 2 — Mic "unavailable" on the native app (FIX SHIPPED to code)

David: external/TestFlight app says "mic is unavailable" on tap.

Root cause (likely) + hardening shipped in `voiceInputService.startNative()`:
- **Permissions FIRST, then `available()`.** On iOS `SFSpeechRecognizer.isAvailable`
  can read false until speech-recognition is authorized → the old order
  dead-ended on a bogus "unavailable" before asking. `available()` is now
  advisory (captured in the audit, not a hard bail) — if truly unusable,
  `start()` throws and we surface the REAL reason.
- **Stop swallowing the native error** (`.catch(()=>({available:false}))` hid the
  cause). A throw on requestPermissions → 'unavailable' (build problem: missing
  Info.plist string / unregistered plugin), a real 'denied' → 'permission-denied'.
- **Copy fix** (`VoiceChatMic.tsx`): platform-aware — a native user is no longer
  told to "use the native app"; gets iOS Settings steps instead.

Audit tool: `scripts/audit-mic-diagnostics.mjs` — pulls the live audit-stream
filtered to `mic-*` events, fully expanded (capability snapshot + raw
`available()` + permState), so a device repro pinpoints the cause. The service
already emits the events; this reads them.

NEXT (needs David's on-device confirm — the native path can't run headless):
- [ ] David reproduces on the iOS app with it open → run
      `AUDIT_STREAM_SECRET=… node scripts/audit-mic-diagnostics.mjs` → headline cause.
- [ ] The fix reaches his phone only via a NEW iOS/TestFlight build (on-demand
      per policy — David asks). Web prod gets it on the next main deploy.
- [ ] If `available()`/registration is the cause, verify the plugin pod is in the
      Xcode Cloud build (`cap sync` output) + Info.plist strings landed.

---

## Thread 3 — Position-Reading evaluation (DESIGN; forks decided)

A conversational drill that grades the user's ability to READ a position by
comparing their natural-language answer to the deterministic package the coach
already computes — the package read BACKWARDS as a graded answer key.

**Answer key (already built):** `buildTacticsLiveContext` / `buildFedTacticsContext`
→ `TacticsLiveContext` (`coach/types.ts:420`): `immediate[]` (tactics now),
`hanging[]` + `boardFacts.attackMap[]`, `threats[]`, `opportunities[]`,
`boardFacts.{mateInOne,inCheck,kings,material}`, rating-adaptive `lookaheadDepth`.

**G0-clean grading:** position chosen in code; coach asks an open question
templated from what the package contains; user answers; the LLM does ONE job —
closed-world match of the answer to the package facts (HIT / MISS / MISREAD,
each citing a package fact, introduce NO new features). New `CoachTask` through
`voiceFacts`. Per-category reading score (tactics/threats/hanging/material/mate).

**Killer use case:** in game review, stop ONE ply before a classified blunder,
build the package for THAT FEN, ask "what's the critical decision here?", grade.
Separates "saw it, miscalculated" from "never saw it" — different weaknesses,
different training. **No app has asked questions during game review; this will.**

**Loop-close:** write per-category reading scores back to the weaknesses Dexie
stores (`mistakePuzzles`/`classifiedTactics`/`openingWeakSpots`) → sources the
next position.

### Forks (David's calls, 2026-06-27)
1. **Open + guided BOTH** — open "what do you see?" first (unprompted vision),
   then specific probes for what they missed.
2. **v1 category scope = my call** → ship the deterministically-graded set
   (tactics, threats, hanging, material, mate, check). Defer structure/plans to v2.
3. **Voice-in = existing path** — grade SPOKEN answers via the existing speech
   path (depends on Thread 2's mic fix landing first).
4. **Surface = game review** — the questions live in `/coach/review`, at the
   pre-mistake plies.

### Known correctness gap (David caught it)
"A piece hangs iff attacked-and-undefended" is WRONG — that's *sufficient* not
*necessary*. A defended piece still hangs if its cheapest attacker is worth less
(Q defended by a pawn, attacked by a knight). The app's `attackMap` uses exactly
that simple heuristic. **The hanging answer-key needs a static-exchange (SEE)
check, not attacked-and-undefended**, or it will miss real hangs and mis-flag
safe pieces. SEE builder is a v1 dependency for the "hanging" category (or lean
on the engine eval delta as the ground truth instead).

### Build order (when greenlit)
1. SEE-based hanging (or engine-delta) answer-key helper.
2. `gradePositionRead` CoachTask + grader prompt (closed-world).
3. Pre-mistake FEN selection in review + the question/answer UI in `/coach/review`.
4. Per-category score persistence + weaknesses write-back.
5. Voice-in wiring (after mic fix verified on device).
6. Audit tool: `audit-coach-position-reading.mjs` (drives the review drill,
   asserts grade matches a known-package fixture).
