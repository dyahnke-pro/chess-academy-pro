> **LIVE PLAN (2026-09-18).** Read AFTER CLAUDE.md (level I) and `docs/STATE.md`
> (level II, generated — it carries the numbers this file only names). The
> nav-capture plan that used to sit here landed 2026-09-12 and is archived at
> `docs/plans/2026-09-12-nav-capture.md`; the unified-coach build is
> `docs/plans/2026-09-15-one-coach-need-selector.md` (N0–N7 built).

# PLAN — closing the loop (2026-09-18)


## THE CRITICAL MOMENT — one computer, two registers (design, 2026-09-18)

David: "I want the only question to come at the critical moment. That is where
the teaching has most effect." → "This will also take place in review." →
"In learn, I want coach to say, this is a critical moment only one move keeps
equality. On review, we are more free to ask questions. No question on learn,
question on review." → "maybe say how many moves keep equality? Algo that for
users."

### What already exists (measured, not recalled)

- **The critical moment is computed on every live ply.** `severityFromGap(gap12,
  rating)` in `positionFacts` → `'critical' | 'only-move'`, from the MultiPV fan,
  rating-scaled. It already reaches `coachDecider` and ranks 65 / 85.
- **Learn already announces it**, and already says different things at the two
  severities (`positionFacts` ~886). It is gated on `studentToMove &&
  a.slowDownOwed`, so a student whose slow-down habit is CLOSED hears nothing —
  already algo-based. What it lacks is the STAKE.
- **`scanCriticality` (the full scanner) has ONE production caller**
  (`onlyMoveSequence`). The live lane derives severity itself from the top-2 gap.
- **Review already has a question card** — pick, reveal, judge, all wired.

### The defect this fixes

Review's question is selected by SWING, not criticality:
`buildTurningPointQuestion` → `turningPointCandidates(...)` → biggest single
swing in pawns, asked once at the END of the walk.

Swing is what it COST; criticality is how much the CHOICE mattered. They come
apart exactly where teaching is best: a position where the student FOUND the
only move has a swing of ZERO, so it can never be the question — and that is the
most instructive moment in the game. On the So–Carlsen draw (2026-09-18 audit)
the card never fired at all: "fewer than 2 costed moments", on a GM draw full of
real forks. This is CLAUDE.md's own importance doctrine, failure mode #1
(sharp-but-flat), living in the review question.

### The build

**ONE computer: how many moves still hold, and what they hold.**

1. **The count IS the trigger — one tolerance, not two.** Count the fan's moves
   scoring within tolerance of the best: `>=3` nothing hinges (SILENT), `2` a
   forgiving fork, `1` only one move holds. Measured 2026-09-18 on real games:
   only-one-move and critical came out 5/5, 24/25, 29/30 — the trigger and the
   count are the same question, and treating them as two was my error.

   🔴 **THE PERSONAL cp-LOSS TOLERANCE IS DISPROVEN — DO NOT BUILD IT.** The
   design here previously said the tolerance should be a robust statistic of the
   student's own per-ply cp-loss distribution ("their own typical error"),
   derived from the `evaluation` + `bestMoveEval` already stored on every
   annotated ply. `scripts/measure-critical-moments.mjs` measured it on 6 real
   games at two rating bands (143 plies, depth 12) and it fails on both axes:

   - **it does not differentiate.** amateur ~1200 vs strong ~2000 came out
     statistically identical — p50 23 vs 23, p75 49 vs 53, p90 116 vs 106,
     mean 41 vs 42. Differentiating students was the ONLY reason to build it.
   - **it nags.** p50 fires 15x/game (every other move) in BOTH cohorts; p75
     fires 8x. The rating band fires 2.5x/game for the amateur, which is the
     right volume for "stop and think".

   So it would make the coach 3-6x chattier AND treat a beginner and an expert
   the same. The claim is deleted rather than annotated (the Lake Butler rule) so
   no future session re-derives it from the same appealing reasoning.

   (One thing it did settle: mean/median ratio 1.8x — a MEAN would have been the
   wrong statistic regardless.)

   **THE RIGHT PERSONAL NUMBER is not "how big are your errors" but "DO YOU FIND
   THE ONLY MOVE WHEN THERE IS ONE"** — press/no-press at critical moments. That
   signal does not exist yet, and it is exactly what this build creates. So the
   shape is the app's standard one and David's own words ("This is gray function.
   Once we have data it algos"): the RATING BAND is the cold-start prior, the
   answer is recorded, and the personal number takes over once there is data. A
   student who reliably finds only-moves earns a LOOSER tolerance (fewer
   positions are forks for them); one who keeps missing them, a tighter one.

2. **The MultiPV cap is a NON-ISSUE — measured, fork closed.** The worry was
   that MultiPV=3 cannot tell "three" from "seven". It cannot, and it never
   matters: we speak ONLY when the count is 1 or 2, and a count of 1 or 2 is
   precisely the case the fan resolved. The positions where 3 of 3 sit within
   tolerance (79% at the amateur band, 53% at the strong one) are exactly the
   positions where nothing hinges and the coach stays SILENT. No wider fan, no
   second engine call, no cost. Do not reopen this.
3. **The stake, computed from the eval, never templated.** "Keeps equality" is a
   claim about the evaluation: false when they are winning (it keeps the WIN) and
   false when they are lost (it promises a draw that is not there). Bands off the
   best line, mover-POV: keeps the win / keeps you on top / keeps you level /
   keeps you in it / limits the damage. Mate is its own answer, never a
   centipawn band. Omit the clause rather than claim a stake with no line to read.

**LEARN — a STATEMENT, never a question.** The student is mid-calculation; a
blocking card takes over the decision (which is why they were removed in Aug).
  "Critical moment — only one move keeps you level. Slow down here."
  "Critical moment — two moves keep you on top; everything else concedes."

**REVIEW — the same computer as a QUESTION**, asked AT that ply during the walk,
not as an end-of-game afterthought. Same count, same tolerance, same stake; only
the register differs. Retargets the existing card from swing → criticality.

**PHRASING — rotate the stem, never the claim** (David 2026-09-18: "I like the
multiple ways of saying the same thing. Keeps it less computer and more like a
coach"). The sanctioned idiom already exists in `methodBeat`: `pick(variants, v)
= variants[Math.abs(v) % variants.length]`, keyed on the PLY — resume-safe,
testable, and NOT `Math.random` (that is #67, five services still rolling).
Three or four variants per shape. The COUNT and the STAKE are facts and never
vary; only the wrapper does.

**RECORDING — DECIDED: a prompted find is GREY** (David 2026-09-18: "This is
gray function. Once we have data it algos"). When Learn announces the moment and
the student then finds the move, that is not evidence they can do it unaided, so
it writes NO `held` row. `CapabilityEvidenceRecord` gains a REQUIRED `prompted`
flag (a new writer must answer); the profile counts prompted rows as neither
held nor broken, so the tag stays GREY -> grey raises rank -> the coach keeps
teaching it. If they find it unaided later, that is a clean `held` and it goes
green on its own.

This is the heat map applied to its own evidence, and it is self-correcting: the
announcement can never inflate the model. Same shape as #34 (a chat-ask reveal
is recorded, not free).

### Measure BEFORE writing any of it

✅ **DONE 2026-09-18** — `scripts/measure-critical-moments.mjs`, 6 real games at
two rating bands through the app's explorer proxy, real Stockfish, no fixtures.
Results above: the cap is a non-issue, the count IS the trigger, and the personal
cp-loss tolerance is disproven.

⚠️ **Sample caveat, stated rather than buried:** 6 games, 143 plies, depth 12,
one seat, all from 1.e4 e5. The IDENTICAL distributions could be a sampling
artifact. The result is strong enough to decide DIRECTION (don't build the
cp-loss tolerance, don't widen MultiPV, keep the band until press/no-press data
exists) and not strong enough to pin a threshold. Re-run with more games and a
deeper search before tuning any number.


## 2026-09-18 — end of night: the two owed post-deploy audits

Both run against the live bundle `index-7h-hez6i.js` (commit `cb2ef99b1`),
SEQUENTIALLY, nothing else on the box.

**LEARN — `audit-concept-gameplay-prod` 8/8 GREEN.** The rating change is
verified on the surface it could have broken. Real prose off the listener:
the coach named the opening aloud ("This game is now the Scandinavian
Defense"), then spoke the computed invariant mid-GAME — *"Careful — your
queen on d5 is attacked and nothing's defending it. There's a pin here for
you — have a look. Remember — a pin freezes the piece in front: it can't
move without exposing the more valuable piece behind it."* Correct seat,
correct board, concept voiced from the live computer rather than a bake.

**REVIEW — `audit-review-overhaul-prod`.** Every PRODUCT contract passed
across 54 narrated plies (board-accuracy, seat, no-trade-win, need
coverage 11/12 owed plies, exchange ledger, perspective). The two reds were
both the INSTRUMENT, and both are fixed:

- RECAP/FUNDLEAD concluded "the engine flagged NO student ply" from the
  WALK, and RECAP hardcoded "the seeded game has two" from the days this
  audit ran one fixture. It now rotates a fresh master game each run, so a
  GM draw with genuinely zero flagged plies red-failed a healthy product
  against a constant about a different game. Both now corroborate against
  the annotation record in Dexie (`[engine record] 0 flagged student
  ply(s)`), which took FUNDLEAD red → green on proof instead of
  self-declaration.
- HEAP printed "renderer heap exploded" on a run whose heap sat flat at
  350MB and whose only trip was the worker census. It now names which of
  its three trip causes fired.

**Two findings carried forward, not fixed tonight:**
- **#21** the pthread census is the multi-threaded SINGLETON, not the pool
  (which has been single-thread since 2026-09-07), and it is INTERMITTENT —
  70 workers in one run, 1 in the next on the same game.
- **#70** the review audit's verdict is not reproducible: three runs, three
  different red sets, because the background deep dive is a race the
  harness neither waits on nor reports. A verdict that changes run to run
  makes both colours meaningless.


## The one disease behind everything landed tonight

**A computer wired ONE WAY ONLY, with prose describing the half that is not
connected.** Every instance passed every gate, because no gate can check a
comment against its code. Three found in one session:

| computer | computed | consumed | why nobody noticed |
|---|---|---|---|
| opening announcement | 5× per game | **0×** | flag spent at QUEUE time, and the late queue was nulled on most turns |
| `capabilityEvidence` green | every reviewed game | **0 readers** | `getCapabilityProfile` had 3 call sites, all in its own test |
| coach-games K=32 ELO | every boot | **0** | only `imported-games` was applied; the rest waited on a picker deleted 2026-09-02 |

When you find a doc comment describing a system, GREP FOR ITS READER before you
trust it. That is the cheapest check in this repo and it found three defects.

## Landed (2026-09-18, all on `main`, ship-check green)

- [x] `7cecd3d5c` — **level II of context is generated + verified.**
      `scripts/state-of-build.mjs` derives the state from the code;
      `--verify` runs in ship-check and fails the push when `docs/STATE.md` is
      stale. Proven non-vacuous (mutate the file → exit 1).
- [x] `37daa3a25` — **opening name: queueing is not saying.** Split
      `announcedOpeningName` into `detectedOpeningName` (context, immediate) and
      `spokenOpeningName` (written only where a voice package kept an `opening`
      fact). `hasInstantTeaching` → `noteTaughtThisTurn` (`kind === 'note'`);
      it had been nulling the whole late queue on any substantive fact.
      Prod-verified: game 2 computed 5→10, **spoken 0→10**.
- [x] `cc501a2e0` — **the heat map can lower.** `capabilityTerm` in `needScore`
      is the first term that can reduce need. GREY (absent) and RED (any
      `broken`) lower nothing; GREEN (held ≥ 3, zero broken) goes quiet. The
      ply→tag join is COMPUTED by `capabilitiesShown` — the same computer that
      writes green — so no fourth fact-to-hole mapping was authored.
      `docs/STATE.md` moved 0 readers → 2.
- [x] `53b5189c6` — **the adaptive rating never adapted.** `calibrateStrength`
      re-estimates on every boot and applies any MEASURED source
      (`imported-games` or `coach-games`); guesses (`profile`, `default`) still
      write nothing. `needsPicker` deleted; `strengthCalibrated` bridged (still
      persisted for `DashboardPage`, no longer freezes re-estimation).

## ROADBLOCKS — every open item in coach (2026-09-18)

Three buckets. A thing is a roadblock if it stops the LOOP closing, stops an
INSTRUMENT being believable, or reaches the STUDENT as a wrong/repeated line.

### A. The loop cannot close (highest — these are the app, not polish)

0. ✅ **FIXED (#77) — CLICK-TO-MOVE SILENTLY DROPPED THE STUDENT'S MOVE.**
   🔴 The entry here previously read "the first coach reply of a game
   intermittently blows 90s" and blamed a cold LLM / the serialized Stockfish
   singleton. THAT WAS WRONG and is deleted rather than annotated. The coach was
   never slow: measured on prod it answered in 4.5–4.9s every time.

   What actually happened: `useChessGame.onSquareClick` read the current
   selection out of REACT STATE, so the second tap of a click-move only saw the
   first tap's selection if React had COMMITTED a render in between. When it had
   not, the tap fell through to "select this square instead" — and an
   enemy-occupied destination has no legal moves for the side to move, so the
   selection cleared and THE MOVE VANISHED with no error, no sound, no feedback.

   Proven on prod, same position, same two squares: a 250ms gap between taps was
   REFUSED; a 2.5s gap landed in 0.5s; a DRAG always worked (a drag needs no
   state to survive between two events). The window stretches past 250ms exactly
   when the coach's narration pipeline is running engine analyses on the main
   thread — i.e. right after its reply, which is when the student is tapping.

   Fix: the selection is now held in REFS, which update synchronously; the state
   still drives the selection ring and the legal-move dots. Both refs are written
   in the only two places that write the selection, so they cannot drift. It
   lands on all 39 surfaces that use `useChessGame` at once.

   Why no test caught it: the existing test put each click in its own `act`, so
   React always committed in between — and its comment said each click "must be
   a separate act", writing the defect down as a requirement. Two new tests put
   both clicks in ONE `act` (one of them the real `Qxd5` capture), and were
   verified to FAIL on the old code and pass on the new.

   The Learn audit's row C red was downstream of this all along: the audit's own
   clicks were being dropped, so the game never reached the ply that poses the
   concept, and the audit reported it as "no coach reply".

1. ✅ **DONE (fe8e50cd3 + c4715f593) — GREY TEACHES, and it feeds the RANKER.**
   Not the per-tag need prior this item originally described: David corrected the
   framing ("the ranking computer decides"), and grey went into
   `computeImportance`'s student term instead, where the `rank > 0` guard makes
   it structurally unable to manufacture a moment on a quiet ply. RED > GREY >
   GREEN, MAX not sum. Both lanes feed it. Gate: `studentMomentBoost.test.ts`.
2. 🟡 **PARTLY — one writer, and the sharpest signal is still missing** (#25).
   `capabilityEvidence` DOES record `held` rows, but from exactly ONE production
   writer (`autoAnalyzeGame:139`, post-game analysis). The record type declares
   four origins (play/review/learn/drill) and one fires: 19 modules record a
   MISS, 4 record a HOLD. So a capability can go RED from anywhere and can only
   go GREEN through analysis. The missing piece is press/no-press AT A CRITICAL
   MOMENT — the purest strength signal there is, and the thing the
   critical-moment build (below) creates.
3. **The rating INPUT is still split** (`docs/STATE.md` MODEL): 39 files read
   `currentRating` off the store, 2 read the adaptive estimate, 63 inline
   `?? 1200`. The number is correct at the source now; threading it is the rest.
   Fix the INPUT before tuning any threshold.
4. 🟡 **REVIEW DONE (f2e609313) — ENDGAME STILL ZERO.** Review now splices an
   exact-position corpus note in `buildReviewSegments` (the producer; the
   component only renders it), seat-required, board-graded, register-gated,
   once per game. Measured 14/18 plies retrieve on a real Ruy line with the FULL
   corpus loaded. `docs/STATE.md` SAY: review 0 -> 1. Endgame remains 0.
5. **Provenance is not on every weakness signal** (#32) — one shape, all sources,
   so any surface can say "you met this against X thirteen days ago".
6. **No concept-level spaced retrieval** (#28). SRS is keyed to `openingId` and
   covers MOVES, not ideas.
7. **A chat-ask unlocks any capability but the reveal is not recorded** (#34) —
   asking is evidence, and it is being thrown away.

### B. The instruments are not believable (a green here means nothing)

8. **The review audit's verdict is not reproducible** (#70) — three runs on one
   bundle gave three different red sets, because the background deep dive is a
   race the harness neither waits on nor reports.
9. **The pthread census is intermittent** (#21) — 70 workers one run, 1 the next
   on the same game. Carrier is the multi-threaded SINGLETON, not the pool.
10. **`tsconfig.app.json` excludes every test file** (#61), so test type errors
    are invisible until runtime.
11. **The GothamChess pro-rep audit fails on prod** (#58) — header selector and
    walkthrough click both miss.

### C. The student hears something wrong or repeated

12. **"the queen takes d5 is about as good"** (#51) — the close-call stem renders
    a SAN as a noun phrase. Fired 3x in one 5-ply run.
13. **Stems are ROLLED, not rotated** (#67) — `Math.random` in 5 services, so
    variation is not resume-safe or testable. Same complaint as 12; fix together.
14. **Curated beats re-announce the same move on consecutive plies** (#60).
15. **The voiced corpus is in the wrong register** (#22) — 1,146 he/his, 521
    first-person, 81 fragments.
16. **Read-position: voice fires but the banner never appears** (#59).
17. **The plan lane says the vague thing** while the computer beside it has the
    concrete one (#64) — structures AND pieces.
18. **Two shared positions go silent in game 2** (#68) — n=1; WIDEN THE SAMPLE
    before fixing.
19. Open questions, not yet defects: mistake-puzzle narration and Rule 3 (#23);
    "chat input never usable" after the player-games lane (#19); caching
    `voiceFacts` so a repeat does not bill twice (#35); the Alapin tape's
    remaining prose defects (#36); a pinned review need-coverage baseline (#69);
    the corpus study of his teaching structures vs what we compute (#42); the
    running REMOVAL CANDIDATES list (#33).

## Next-session pickup

1. Gain all four levels (CLAUDE.md → `docs/STATE.md` → `surface-map.mjs --changed` → the code).
2. Take open item 1 or 2 above.
3. Audits run SEQUENTIALLY and with NOTHING beside them — no typecheck, no vitest.
   A review run was invalidated twice this session by CPU stacked next to it.
