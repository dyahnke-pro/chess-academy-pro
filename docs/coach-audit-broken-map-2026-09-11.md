# Coach Broken-Map — 2026-09-11 (Track 1: chat grounding)

The standing-net's findings register (plan:
`docs/plans/2026-09-10-coach-audit-standing-net.md`). One row per function:
verdict (works / **BROKEN** / cant-verify), severity (P0 breaks paid UX / wrong
at the board · P1 wrong teaching / degraded · P2 rough edge), and a one-line
symptom+disease. **NO fixes** — this only maps, per David's call.

## Summary (running)

**12 findings so far — Tracks 1 (chat grounding) + 2 (fact-computers/tacticsDetector).**

- **P1 (wrong at the board / wrong teaching, reaching paying users):** #10 the
  `findSkewers` false-skewer (voiced app-wide per G0 — the headline bug), its
  symptom #9; #1 `record-vs-target` hijack, #2 `transfer-gap` hijack, #3
  `strengths`+#4 `teaching-method` (shared "no lesson" mis-route), #8
  `review-game` action broken.
- **P2:** #11 `findForks` (no material validation), #5 `endgame-tablebase`, #6
  `last-game`, #7 `drill-stage`, #12 `tacticsDetector` test-coverage gap.
- **Confirmed SOUND (not everything is broken):** the coach's eval grounding is
  accurate + honest (5/5 positions, honesty test passed); `causalChain` verified
  (real-game acceptance gate); `findPins`, hanging/must-defend paths correct.
- **Disease clusters:** D1 (a "no specific lesson" catch-all swallows analytics
  lanes), D2 (training/move routers pre-empt analytics asks), D3 (tactic
  detectors validate geometry, not material — the biggest).
**Coverage so far — the DETERMINISTIC layer is mapped:**
- ✅ Track 1 (chat grounding): wiring + accuracy, 8 findings + eval sound.
- ✅ Track 2 (fact-computers): tacticsDetector D3 disease + gate sweep;
  causalChain/narrationImportance/threatOut/pins verified sound.
- ✅ Track 6 (tools): gating + grounding teeth verified sound.
- ✅ Track 7 (voice/verbosity/perspective): deterministic contracts verified sound.
- ✅ Track 3 (Learn walkthrough): HAND-DRIVEN, verified sound, 0 confirmed bugs (16 bot 'failures' debunked).
- ✅ Track 5 (Review): real-game 3-instrument audit MEETS STANDARD (15/15 text
  contracts); voice-half + mistake-game diagnostic cards owed.
- **Owed — the rest of the INTERACTIVE layer** (heavy prod-Playwright): Track 2
  remainder (positionFacts/importance/criticality/PV via a real-engine harness),
  Track 3 (Learn walkthrough live), Track 4 (Play silent-contract live), Track 5
  follow-on (a game WITH blunders → find-the-shot/rewind/trap cards + voice),
  Track 8 (WLPP full-play/endgame/fundamentals), Track 9 (learning-loop
  round-trip with seeded games), Track 1c (analytics accuracy with the games
  fixture).

---

Environment: prod (`chess-academy-pro.vercel.app`, bundle at run time). Oracle:
`/usr/games/stockfish` v16 run in-script, independent of the app's WASM engine.
Instruments: interactive Playwright on prod + per-lane grading. Cold profile (no
seeded games) — analytics lanes are tested for WIRING here; their ACCURACY needs
the seeded-games fixture (a follow-on sub-pass, noted below).

---

## Track 1a — WIRING baseline (does each lane GROUND vs fall to stock?)

Driver: `scripts/audit-coach-all-questions-prod.mjs` (existing; the committed
55-capability question matrix). Result: **49/56 on-contract, 7 BROKEN.** 0
pageerrors. This proves ROUTING, not correctness — its ACCEPT regexes are loose
(it passes a reply merely *shaped* like an answer), so it is a FLOOR on breakage,
not the full count (see Track 1b).

| # | lane | verdict | sev | symptom → disease |
|---|---|---|---|---|
| 1 | `record-vs-target` | BROKEN | P1 | "how do I do against d4"-type ask answered `"d4" is chess notation — the pawn moves to d4`. → the ask is hijacked by a move-explanation path before the record-vs assembler; deictic/opening object not parsed. |
| 2 | `transfer-gap` | BROKEN | P1 | "do I spot tactics in games as well as puzzles" answered with a **tactics drill** (`Tactics drill — White to move…`). → training-aid router catches "tactics" and starts a drill instead of the transfer-gap assembler. |
| 3 | `strengths` | BROKEN | P1 | "what am I good at" answered `I don't have a specific lesson on that idea yet.` → mis-routed to a lesson-lookup fallback. **Same fallback as `teaching-method` (below) — one shared disease.** |
| 4 | `teaching-method` | BROKEN* | P1 | "how do you teach X" answered `I don't have a specific lesson on that idea yet.` — *the wiring audit PASSED this (its ACCEPT regex matched the word "lesson"), a FALSE PASS. Real verdict BROKEN, same lesson-lookup mis-route as `strengths`.* |
| 5 | `endgame-tablebase` | BROKEN | P2 | endgame question on a non-endgame board answered with a middlegame plan instead of the lane's honest "this isn't an endgame yet." → endgame lane doesn't fire / doesn't gate on phase; plan lane wins. |
| 6 | `last-game` | BROKEN | P2 | "did I win my last game" answered with the generic weakness empty-state ("I can't read the mistakes you make yet…"). → cold-data path routes to the weakness empty-state instead of the last-game lane's own. (Honest, but wrong lane; re-check with seeded games.) |
| 7 | `drill-stage` | BROKEN | P2 | "drill me" answered `jumping straight to concept check for the French Defense: Advance Variation` — started a **concept check**, not a drill. → stage router picked the wrong stage. |
| 8 | `review-game` | BROKEN | P1 | "review my last game" — action did not route; URL stayed on `/games`, empty reply. → the review-game action route is broken from this surface. |

\* Finding #4 is a defect the wiring audit itself masked — logged here because the
accuracy read caught it. It also means the "49/56" is optimistic.

**Disease clusters (sweep, not spot):**
- **D1 — the "I don't have a specific lesson" lesson-lookup catch-all** swallows at
  least `strengths` + `teaching-method`. Likely `isFundamentalLessonQuestion` /
  a lesson resolver matching before the intended assembler. Worth grepping every
  lane that can produce this string.
- **D2 — training/move routers pre-empt analytics asks:** `transfer-gap`→drill,
  `record-vs-target`→move-explanation. A keyword ("tactics", a SAN-shaped token)
  in an analytics question is caught by an earlier deterministic router.

**Correctly wired (spot-checks worth keeping):** position-assessment, best-move,
why-best-move, plan, tactics-live, master-play (23,546-game frequency),
move-rating, player-games (Carlsen ref games), concept (passed-pawn), opening-
existence, settings-query, puzzle-stats, and every profile empty-state
(weakness/progress/trend/stats/opening-profile/…): honest "import your games"
from the RIGHT lane = wired, pending accuracy-with-data.

---

## Track 1b — ACCURACY (is the grounded CLAIM true vs an independent oracle?)

Driver: `scripts/audit-coach-track1-accuracy-prod.mjs` (new). Known FEN via
`/coach/analyse` → grade each claim vs in-script Stockfish (`/usr/games/stockfish`
v16, persistent-stdin) + `falseBoardClaims`. Negative controls gate the run.

**The headline is GOOD news: the coach's grounding is accurate.** Across 5
oracle-rich positions the eval assessment matched the independent oracle every
time, including the honesty test:

| position | oracle | coach said | verdict |
|---|---|---|---|
| Ruy (equal) | +0.36 | "about 0.4 in your favour — an edge" | ✅ eval correct |
| White up a rook | +6.11 | "about 5.8 points ahead" | ✅ correct |
| Black down a rook (honesty test) | −5.74 | "5.5 points against you — do not resign" | ✅ **honest** (did NOT claim a win) |
| free queen (Rxd5) | +4.94 | "a win for you — mate in 29" + best move **Rxd5** | ✅ eval + best-move correct |
| KQ v K | forced mate | "a win for you — mate in 15" | ✅ correct |

So the fluent-but-WRONG-eval fear — "am I winning" at −5, a "best move" that's a
blunder — did **not** reproduce. The eval grounding is solid and honest.

**BROKEN — 1 real accuracy finding:**

| # | lane | verdict | sev | symptom → disease |
|---|---|---|---|---|
| 9 | `tactics` (Ruy) | BROKEN | P1 | On the Ruy the coach's eval was right but it appended *"Bishop on b5 skewers knight on c6 with pawn on d7 behind it."* No skewer exists. **ROOT-CAUSED in Track 2 (finding #10): this is NOT an LLM hallucination — `detectTactics` the code emits it.** The LLM voiced a wrong computed fact (G0-compliant). Symptom recorded here; disease is #10. |

**Harness discipline (why this took several passes — the layered method working):**
the negative controls + real-vs-artifact rule caught **5** harness/grader bugs
*before* any false verdict entered the map — `spawnSync` EOF-ing Stockfish's
stdin (no scores), an in-check curated FEN, a "hanging" substring collision in the
tactic grader, a grader-signature mismatch (graded eval vs the FEN string →
faked winning/losing "BROKEN"s), and a follow-up capture race. A naive happy-path
audit would have reported the coach as riddled with bugs when its grounding is in
fact accurate. This is the point of the oracle layer.

**Owed (harness-limited, NOT product verdicts):** the targeted best-move and
tactics CHAT-lane asks on `/coach/analyse` hit a follow-up-capture load artifact
(prod LLM latency exceeded the capture window on some sequential asks → "no
reply"). Not recorded as product-broken. To grade those lanes reliably, a
follow-on needs a gated `__ask`/`__setPosition` drive-hook or a `/coach/teach`
set-position path (analyse's streaming follow-up is too flaky for automation).
Also owed: automate the pin/skewer-validity check (finding #9's class).

---

## Track 2 — FACT-COMPUTERS + spine (deterministic oracle)

The pure (engine-free) computers, driven directly with oracle FENs in vitest.
`positionFacts`, `narrationImportance`, `causalChain`, `tacticsDetector`,
`threatOut`, `theoryDeparture` are Node-testable; `criticalityScan`, `pvPlayback`
need the WASM worker (owed a real-engine harness). First probe (the pure
tactic/threat computers):

| # | computer | verdict | sev | symptom → disease |
|---|---|---|---|---|
| 10 | `tacticsDetector.findSkewers` (~line 240) | BROKEN | P1 | **Root cause of #9, exact.** The skewer condition is pure geometry + value-ordering with NO material-won check: `first.color===enemy && second.color===enemy && PIECE_VALUE[first] > PIECE_VALUE[second] && PIECE_VALUE[second] >= 1`. Two defects: **(a)** `>= 1` lets a **pawn** be the skewered "prize" (the Ruy d7 pawn — you can't skewer a knight to win a pawn); **(b)** no check that the front piece is undefended / that material is actually won — Nc6 is defended, so Bxc6 dxc6 is a plain trade, no skewer. It reports on ANY `sliding-piece → higher-value-enemy → lower-value-enemy(≥pawn)` ray. Blast radius: shared computer → the false skewer is voiced on every tactic surface (chat `tactics-live`, teach commentary, review) per G0. Bb5/Bg5 vs a knight is one of the most common opening shapes, so this fires constantly. **Fix direction (later): require the back piece to be worth winning AND verify net material gain (front undefended or the exchange favourable) — a value-ordering geometry check is not a skewer.** |

| 11 | `tacticsDetector.findForks` (~line 116) | DEGRADED | P2 | Reports a fork when a piece attacks ≥2 enemy pieces of value ≥3 — but **never checks the forker is SAFE or the targets are undefended/unsavable**. So it fires on "attacks two DEFENDED pieces" (wins nothing) and on a forker that is itself hanging (gets captured, not a fork). Milder than the skewer (it excludes pawn targets via `>= 3`), but the SAME disease. |

**Disease D3 — the detector validates GEOMETRY, not MATERIAL.** `findSkewers`,
`findForks` (and to a lesser extent the guard/overload/battery detectors) declare
a tactic from piece-on-a-ray + value-ordering alone, with no check that the
attacker is safe and the target is actually winnable (undefended / can't be
saved). A real tactic WINS material; these fire on trades and on attacks against
defended pieces. The fix class is uniform: gate every detector on a net-material
/ SEE check (the app already has `findHangingPieces`/SEE machinery in
`threatOut`; the detectors just don't consult it). `findPins` is the exception —
it uses real pin geometry (front less valuable than back) and did NOT false-fire
on the Ruy, matching the correct free-queen pins.

**Correct (spot-checks that passed):** `detectTactics` on startpos = clean (no
false positives); on the free-queen it correctly flags the hanging queen +
real d-file pins; `computeMustDefend(free-queen, black)` correctly returns the
d5 queen (net 9). So the hanging/pin/must-defend paths are sound — the defect is
the geometry-only skewer/fork detectors (D3).

**Gate sweep (existing fact-computer test files):** all 8 pure/engine computers
have a `*.test.ts`. The pure ones run green — `causalChain` (26 tests, real-game
acceptance on David's own game + silent-on-quiet negatives → **VERIFIED sound**),
`narrationImportance` (15), `threatOut` (7), `tacticsDetector` (**29 — all
GREEN**). 

| # | finding | verdict | sev | note |
|---|---|---|---|---|
| 12 | `tacticsDetector.test.ts` coverage gap | BROKEN (test) | P2 | The 29-test suite is GREEN while `findSkewers` ships the false skewer (#10). The suite has **no case for the skewer/fork material-validation class** — the bug lives precisely in the untested corner. "Green gate ≠ correct": this is the audit's whole premise, demonstrated. The fix for #10/#11 must ship WITH a gate that covers value/material validation (the Ruy skewer as a red case). |

**Track 2 remainder — gates GREEN (sound).** `positionFacts`, `criticalityScan`,
`pvPlayback`, `theoryDeparture` test suites pass (51 tests). Crucially,
`pvPlayback` explicitly asserts **"a knight move never claims a pin (knights
cannot pin)"** and **"a recapture claims no material windfall (even trade nets
0)"** — so the engine-PV narration path DOES carry the material/geometry
validation that `detectTactics` lacks. **This localizes D3 to `tacticsDetector`'s
`findSkewers`/`findForks` — it is NOT a systemic pattern across all computers.**
The rest of Track 2 (positionFacts aggregation, the userImportance selector,
causalChain) is gated + green.

---

## Track 6 — THE COACH'S HANDS (23 tools) — gating + grounding teeth

Driven by importing each tool's `execute(args, ctx)` directly (deterministic).

**VERIFIED SOUND — this is a positive result, no findings.** The security-critical
contract holds across the action tools:
- **Gating ("no fake success", David 2026-09-08):** `play_move`, `take_back_move`,
  `reset_board`, `quiz_user_for_move`, `start_walkthrough_for_opening` all return
  `{ok:false}` with a clear, actionable error when the surface callback is absent
  — none fake a success.
- **Grounding teeth all bite:** `set_board_position` rejects opening-phase raw
  FENs (fullmove ≤12 — the Catalan-Na3 hallucination guard) and demands real
  `moves`; `play_move` rejects illegal SAN (`e9`) with the legal-move list;
  `navigate_to_route` rejects an off-manifest path and accepts a valid one
  (`/coach/play`).

**Known caveat (from the tool inventory, not re-tested):** `record_blunder` is
registered but only partially wired — it appends a synthetic conversation entry
rather than writing a real `blunderPatterns` store (a documented PUNT). Low
severity (the record path still exists), flag for the fix phase.

**Owed:** an in-person test that a WIRED tool actually mutates the board
correctly (FEN before/after) on a real surface — the gating/teeth are verified
here; the actuation-correctness half needs a surface drive (Tracks 3–5 exercise
it live).

---

## Track 7 — VOICE / VERBOSITY / PERSPECTIVE (deterministic contracts)

**VERIFIED SOUND at the deterministic layer.** Gates green:
- **Verbosity (G5):** `coachNarration.test.ts` 33 tests — the brief-cap
  (`applyBriefVoiceCap`, ≤2 sentences / ≤30 words) and density logic hold.
- **Audit-mute (G1):** `voiceService.auditMute.test.ts` 4 tests — mute is off for
  real users, product code never sets the flag, a throwing storage read doesn't
  latch it off.
- **One perspective (no we/our):** `perspectiveVoice.test.ts` 7 tests — shipped
  narration carries no we/our/us; the 2026-08-28 migration held.

**Owed (live half):** that silent/brief/full actually fire the right voice
register in a running game, that read-aloud bypasses verbosity, and that the
in-game register speaks you/they correctly — exercised by interactive Tracks 3–5
(narration listener + register assertions).

---

## Track 3 — LEARN walkthrough (HAND-DRIVEN, step by step)

Driven by hand via `scripts/audit-lib/hand-step.mjs` (one action → dump the true
state: url, phase, visible testids, transcript, screenshot → decide the next
click). **NOT a fire-and-forget bot** (the 2026-07-24 standard).

**Verdict: the Learn walkthrough is SOUND — ZERO confirmed product bugs.** Hand-
confirmed working on prod (0 pageerrors throughout):
- Tap an opening tile → routes straight to `walkthrough-narrating-panel`
  ("Sure — let's walk through the Italian Game").
- `walkthrough-skip` advances beats; after 2 skips the lesson reaches a fork.
- The fork (`walkthrough-fork-bar`, two line options, deep-dive) **waits for a
  pick and offers no skip** — picking `walkthrough-fork-option-0` advances to the
  next branch, board updates correctly each time (Italian developing e4/e5/Bc4/…).

**The scripted bot (`audit-coach-teach-functional.mjs`) reported 16 ❌ — ALL
FALSE, debunked by hand:**
- `tile-routing` / `lesson-starts-from-click` "stuck at teach-picker" → **harness
  artifact.** The bot had accumulated page state from ~20 prior steps; on a fresh
  page the tile routes instantly. Not broken.
- `fork-auto-advance STALLED` → **correct by design.** A fork waits for the
  student's choice and has no skip; the "stall" IS the contract. Not broken.
- `wt-skip / wt-fork-pick / wt-leaf / stage-*` → all downstream of the above two;
  they never ran because the bot's tile-tap never started a lesson. Not product
  bugs.
- `line-picker-*` / `face-mode-toggle` → the Italian tile started a lesson
  directly (no line-picker for this tile), so those testids legitimately didn't
  appear — a test-scenario mismatch, not a break.

**Unconfirmed (NOT recorded as a finding, per "confirm broken"):** the bot's
"continue button never enabled — stages not gen within 60s" at a leaf. Reaching
a leaf via stateless hand-replay is many forks deep; not yet reproduced clean.
Almost certainly the same accumulated-state load, but it is NEITHER confirmed
broken NOR confirmed sound — owed a clean leaf-reach. It is not in the findings
count.

**Meta-lesson (validates David's insistence):** hand-driving turned 16 scripted
"failures" into 0 confirmed bugs. A fire-and-forget bot would have polluted the
map with 16 false findings.

---

## Track 5 — REVIEW (3-instrument real-game audit)

Ran `scripts/audit-review-real-game.mjs` on prod (seeds a real game unanalyzed,
runs the genuine pipeline, walks all 33 plies). **VERDICT: MEETS STANDARD —
mostly verified sound.**

- **15/15 experience contracts PASS:** opening named, why-density 100% (8/8),
  plan beats, mate named-not-pawns, **board-accuracy (no false piece-on-square
  claims — the skewer bug did NOT leak into this review)**, opponent commentary,
  no-repetition, queen-sac named + compensation taught, forced-finish framed,
  mate mechanism taught, no errors. Audit-stream: 503 real events emitted
  (storage=redis).
- **Turning-point card fired** correctly (ply 33).

**Caveats (owed, not failures):**
- **Voice unverified: the narration listener captured 0 spoken lines** (review
  ran voice-off, or the listener didn't attach). The review TEXT contracts pass,
  but that review actually SPEAKS — and speaks the right register — is not proven
  here. Same live-voice gap as Track 7.
- **Diagnostic cards need a game WITH student mistakes.** This game had none, so
  find-the-shot / spot-the-sequence / blunder-rewind / trap correctly did NOT
  fire (the audit confirms the skips are correct). A follow-on must seed a game
  with real blunders to exercise + oracle-grade those cards.

---

## Track 1c — analytics ACCURACY with seeded games (follow-on)

The profile/analytics lanes (weakness, trend, opening-profile, stats, records,
converting, time-trouble, skill-radar, …) return honest empty-states on a cold
context — WIRING-correct but UNTESTED for accuracy. Owed: seed David's real games
(`audit-lib/fixture-loader.mjs`) and recompute each stat from the fixture to
compare. Pending.
