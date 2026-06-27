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

Findings — root-caused + fixed (all were PROBE bugs, not app regressions):
- [x] **`gap5-deeplink-move-jumps`** RE-FIXED (the first fix was wrong). The app
      bug was real; my first patch passed its unit test but still showed Ply 0 on
      prod because my two effects fought (no-narration effect applied+marked the
      ply while narration was null, then the reset effect snapped to 0 when
      narration arrived). Unified to one apply-once source of truth + a
      regression test for the narration-after-moves ordering. (commit 315ccb5)
- [x] **`voice-pref-variance`** — PROBE measurement bug. It counted
      `voice-speak-invoked`, which `logSpeakInvoked` emits at the TOP of
      speakForced — BEFORE `speakInternal`'s silent gate — so silenced speaks
      still logged it (14 invoked + 1 silenced on silent = the identical-numbers
      signature). The silent gate (`voiceService.ts` speakInternal) is REAL and
      correct. Count only `coach-narration-spoken` (post-gate). (commit c162bb3)
- [x] **`gap2-automated-mistake-enrollment`** — PROBE design bug. The Morphy
      sample can never enroll (no student side → `determinePlayerColor` null).
      Seed a coach-vs-Stockfish-Bot game with a real white blunder (cpLoss 900),
      review THAT, assert enrollment. (commit e04d2be)
- [x] **`face-mode`** — flaky FACE submit (stalls at teach-picker). Re-submit
      once before judging; a genuine routing break still fails on retry. (e04d2be)

Findings — config/harness (NOT app bugs), need David / env:
- [ ] **`gap1-voice-marker-audit-fired`** (review) — CI repo secret
      `AUDIT_STREAM_SECRET` is empty (401). Set it. (Also makes voice-pref
      observable instead of not-tested.)
- [ ] **`gap3-explore-stockfish-reply`** (review) — Playwright board-drag
      mechanics; consider a coordinate/force drag.

### Confirmation runs (prod)
- clock-restore ✅ PASS (8d59d8e), face-mode ✅ PASS (8d59d8e) — both probe
  fixes verified green on prod.
- deeplink + mistake-enrollment: a `gid` ReferenceError I introduced in the
  enrollment seed aborted the review suite before they ran; fixed in ec686eb,
  re-dispatched to confirm.
- voice-pref → not-tested without the repo secret (honest).

### Loop-audit (punish-gems 3-pass) — INFRA finding
The full-sweep `audit-punish-gems-loop.mjs` never completed in any run — it
runs to the runner's 75-min cap across all masterclass + pro-rep openings. To
get a clean loop-audit verdict it must be scoped per-opening via `AUDIT_OPENING`
(or the job timeout raised / sharded). Not a code regression — a runtime-budget
mismatch in the audit job. Flag for David.

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

## Thread 3 — Position-Reading / Analysis Practice (BUILD STARTED 2026-06-27 night)

**Shipped (main) — the vertical slice + Surface B:**
- `src/services/positionReadingService.ts` (+ 20 tests) — the deterministic core:
  proper **SEE** for hanging (David's iff — a defended piece still hangs when a
  cheaper attacker wins the exchange; verified: Q-def-by-pawn-atk-by-knight → +6),
  PGN→middlegame-FEN sampler, question builder off `TacticsLiveContext`
  (tactic/threat/hanging/material/mate/pawn-break), offline deterministic grader.
- `src/components/Tactics/AnalysisPracticePage.tsx` + route `/tactics/analysis-
  practice` + Tactics-tab tile + PageHelp + loading/empty/error states + PostHog
  events. Pulls a position from the user's `games`, asks, grades the typed read,
  shows the right answer on a miss.

**Still TODO on this feature (morning):**
- [ ] Surface A — the pre-mistake question injection in `/coach/review`.
- [ ] LLM grader (`gradeReadingAnswer` via getCoachChatResponse, closed-world)
      layered over the deterministic fallback — for fuzzier natural-language reads.
- [ ] Good/bad-piece + plans question types (v2 — need the piece-quality computer).
- [ ] Weaknesses write-back (per-category reading score → `openingWeakSpots` etc.).
- [ ] Voice-in (after the mic fix is verified on device).
- [ ] Component test for AnalysisPracticePage (service core is tested; page is wiring).
- [ ] `audit-tactics-analysis-practice.mjs`.

### Original design notes (forks decided) follow.

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

### Surface B — "Analysis Practice" under the Tactics tab (David 2026-06-27)

A standalone drill (NOT tied to a blunder) under `/tactics`: pull a position
from the user's IMPORTED games (Dexie `games` store — real games), ask a
question, grade the free-text answer against the computed key, and **show the
computed right answer when they get it wrong**. "Ask about tactics, good or bad
pieces, plans, pawn breaks — a whole bunch of different questions!"

Same engine as Surface A (the answer key read backwards + the `gradePositionRead`
CoachTask) — only the position SOURCE and the question MIX differ. Two surfaces,
one grader.

**Position source (deterministic, NOT the LLM):** sample middlegame positions
(≈ply 12-30) from the `games` store; optionally bias toward structural moments.
Cold-empty when no games imported → empty state prompts an import.

**Question taxonomy → grounding source (every answer COMPUTED; G0):**
| Question | Answer key (computed) | v |
|---|---|---|
| Tactics ("any tactic? what's the threat?") | `TacticsLiveContext.immediate/threats/hanging/mateInOne` (engine) | v1 |
| Pawn breaks ("what's the right pawn break?") | `middlegame-plans.json pawnBreaks[]` (matched FEN) + a deterministic pawn-lever enumerator (a pawn push that attacks an enemy pawn / opens a file) | v1-v2 |
| Good / bad pieces | NEW deterministic piece-quality computer — bad bishop (own pawns on its colour), knight outpost (protected, in enemy half, unchallengeable by an enemy pawn), rook on open/semi-open file, bishop pair. Pure FEN geometry. | v2 |
| Plans ("what's the plan here?") | `middlegame-plans.json strategicThemes/pieceManeuvers` when the position matches a known plan; else the engine PV gives the concrete continuation. SOFT — grade ONLY where a ground source exists, else skip (empty > invented). | v2 |
| Material / king safety / hanging | `boardFacts.{material,inCheck,attackMap}` | v1 |

**Show-answer-on-wrong is free:** the grader already computes the key, so on a
MISS we render the computed correct answer (the hanging piece, the real break,
the threat) — no extra work.

**New surface checklist (standing orders):** register `/tactics/analysis-practice`
in `router.tsx` + a Tactics-tab nav/tile entry; loading/empty/error states (empty
= "import games to practice"); feature-flag name + activation cue + post-completion
route; PostHog events (`analysis_practice_started`, `analysis_practice_answer`
{questionType, correct}, `analysis_practice_completed`).

### Build order (when greenlit) — shared core first, two surfaces on top
1. SEE-based hanging (or engine-delta) answer-key helper.
2. `gradePositionRead` CoachTask + grader prompt (closed-world: HIT/MISS/MISREAD,
   cite a package fact, introduce nothing). Produces the score + the right answer.
3. Question-type pack: tactics + pawn-breaks + material/king-safety (v1
   grounded set); the piece-quality computer + plans (v2).
4. **Surface A** — pre-mistake FEN selection in review + the Q/A UI in `/coach/review`.
5. **Surface B** — `/tactics/analysis-practice`: game-position sampler + the
   Q/A UI + show-right-answer-on-wrong (router + nav + states + events above).
6. Per-category score persistence + weaknesses write-back (both surfaces feed it).
7. Voice-in wiring (after the mic fix is verified on device).
8. Audit tools: `audit-coach-position-reading.mjs` (review drill) +
   `audit-tactics-analysis-practice.mjs` (the Tactics-tab drill) — each asserts
   the grade matches a known-package fixture and the right answer shows on a miss.
