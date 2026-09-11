# Coach Broken-Map — 2026-09-11 (Track 1: chat grounding)

The standing-net's findings register (plan:
`docs/plans/2026-09-10-coach-audit-standing-net.md`). One row per function:
verdict (works / **BROKEN** / cant-verify), severity (P0 breaks paid UX / wrong
at the board · P1 wrong teaching / degraded · P2 rough edge), and a one-line
symptom+disease. **NO fixes** — this only maps, per David's call.

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
| 9 | `tactics` (Ruy) | BROKEN | P1 | On the Ruy the coach's eval was right but it appended a **fabricated tactic**: *"Bishop on b5 skewers knight on c6 with pawn on d7 behind it."* No skewer exists — the d7 pawn blocks the b5–e8 line, and you cannot skewer a knight to a *pawn*. This is the classic Bb5-hallucination class (CLAUDE.md). → the coach embellishes a correct eval with an invented tactical justification. `falseBoardClaims` MISSED it (the squares b5/c6/d7 are all real — only the *relationship* is invented), so this class needs a pin/skewer **validator**, not just a piece-on-square check. |

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

## Track 1c — analytics ACCURACY with seeded games (follow-on)

The profile/analytics lanes (weakness, trend, opening-profile, stats, records,
converting, time-trouble, skill-radar, …) return honest empty-states on a cold
context — WIRING-correct but UNTESTED for accuracy. Owed: seed David's real games
(`audit-lib/fixture-loader.mjs`) and recompute each stat from the fixture to
compare. Pending.
