# OUTLINE — closing the loop, every item, done vs not

> **THIS IS THE ANSWER TO "where do we stand?"** When David asks where the
> outline stands, PRINT THIS FILE'S SHAPE — every work order and every roadblock
> item, one line each, with a marker. Not a prose summary, not a subset, not the
> row count of the last audit.
>
> **It is the INDEX, never the record.** `PLAN.md` holds the reasoning, the
> measurements and the corrections; this file holds one line per item so the
> whole board is readable in thirty seconds. A line here that contradicts
> `PLAN.md` is a bug in this file — PLAN wins, and you fix the line.
>
> **UPDATE IT IN THE SAME COMMIT AS THE WORK.** A status board that lags is
> worse than none: it reports finished work as open and open work as finished,
> and the next session picks up the wrong thing. Gate:
> `src/test/outlineCoverage.test.ts` fails the build when a numbered roadblock
> item or bucket in `PLAN.md` has no line here.

**Legend:** ✅ done and proven · 🔴 open, a real defect · 🟠 open, needs a
measurement or David's call · 🟡 open, low rank · ⛔ owned by another session

---

## 1. WO-CLOSEOUT-01 — code first, one push, one audit
- ✅ 1. Section-14 detectors built (`calculation-depth`, `left-book-early`, `no-plan`) — gated, but see E-10: zero real-game fires
- ✅ 2. Critical moment T1 (review scans flagged plies, the register decides) + T3 (Learn hands announced plies to the sweep, `prompted:true`)
- ✅ 3. Learn's half on a prod tape — `audit-second-game-memory-prod` rows E0/E1
- ✅ 4. D11 — `[delta]` squares already coupled (the PLAN entry was stale)
- ✅ 5. Hygiene — watermark hook, timeouts-vs-assertions, lint crash named, test-type ceiling 296→236, `BuildVersionWidget` regex, `formatTacticsSubBlock(tactics, boardFen)` required, multilingual row poll
- ✅ 6. Measurements — boot 15 files / 26.4 MB raw / 6.1 MB gzip; corpus reach 24/24 both tiers; corpus gates evened
- 🔴 `tactics-context-stale` count read off the listener — never done
- 🔴 47-game rerun — `data/sources/wo4-corpus/` absent on this machine
- **Audits:** loop 6/6 ✅ · Learn 8/8 ✅ · fundamentals-tab 19/19 ✅ · second-game 12/12 ✅

## 2. WO-LOOP-01 — prove the one-line definition on prod
- ✅ Phases 0–4, **6/6 on prod** (run 5, bundle `index-BggLa4Jm`; re-proven run 6 with an exact same-ply control)
- ✅ The five defects the instrument found, each gated: the review path never recorded · a game paired with itself · four seat resolvers ignoring the declared seat · the uncapped-facet path · GM games have nothing to record
- 🔴 OWED-1 the `other` attribution gap — the loop's ceiling (see E-10)
- ✅ OWED-2 Learn's half on a prod tape
- 🔴 OWED-3 **GREEN** — the coach going quiet when you improve. Not started; needs held evidence over days

## 3. The critical moment — one computer, two registers
- ✅ Built 2026-09-19 (`criticalMoment.ts`, both registers, the stake banded off the eval)
- ✅ T1 `ask`/`note` reachable on review · ✅ T2 Learn verified on prod · ✅ T3 Learn's `prompted` wire
- 🔴 T4 `prompted` is a record, not a lever — the personal tolerance from press/no-press
- 🔴 T5 the door on live play (`interrupt` posture still grades by gap; deliberately unchanged)
- 🔴 T6 two numbers never measured on a device — Learn statement volume; `scanCriticalMoments` on a phone

## 4. Bucket D — the student cannot get what they asked for
- ✅ All of it: D1–D13 and D-LANG (Thai plus 19 other writing systems), the transcript translation door, verified on prod

## 5. Bucket A — the loop cannot close
- ✅ CLOSED: #77 click-to-move, grey teaches and feeds the ranker, one computer both directions, the endgame zero was false, provenance, the `prompted` flag; item 6 deleted as a wrong bullet
- ✅ A-adjacent: the guessed seat, the walk budget constant

## 6. Bucket B — the instruments are not believable
- ✅ 7c dead-testid gate
- ✅ 8 (#70) the review audit's verdict is reproducible — determinism seam, CLOSED for the review audit
- ⛔ 9 (#21) **the wedge behind the engine storm** — the storm is fixed; the page's main thread still pins 100% and the walk never leaves ply 0. Another session's files. Blocks the standing review re-run
- 🟠 10 (#61) half done — the visibility half landed; the runtime half is 11e
- ✅ 11 (#58) the GothamChess pro-rep audit — four instrument layers, none of them the product
- ✅ 11a–11d ship-check hygiene
- 🔴 11e drive the test-type-error ceiling 236 → 0

## 7. Bucket C — the student hears something wrong or repeated
- ✅ 11f the read-position seat · 12 queen-takes · 13 stems rotated not rolled · 14 re-announced moves · 16 (#59, a dead selector) · 17 the chat plan lane · 18 the fresh-game reset (n=4, proven on prod)
- 🔴 15 (#22) **the voiced corpus is in the wrong register** — 1,146 he/his, 521 first-person, 81 fragments
- 🟡 19 open questions, not yet defects: #23 mistake-puzzle narration · #19 chat input after the player-games lane · #35 caching `voiceFacts` · #36 the Alapin tape's remaining prose · #69 a pinned need-coverage baseline · #42 the corpus study · #33 removal candidates

## 8. Bucket E — payload + delivery
- ✅ A new service worker may never take over a running page
- ✅ No un-positioned phrases in the boot payload (32.8 → 24.3 MB)
- ✅ 354 notes that described the video, not the board, are gone
- ✅ Post-deploy audits on live prod — SW 9/9, Learn 8/8, review 22/24
- ✅ 9. The fundamental-aware spine reader
- 🔴 0a. The two fundamentals reds, n=2 — measured offline: it is DETECTOR COVERAGE, not inputs (all five flagged plies return `[]`)
- 🔴 0b. Review audit 22/24 — the same two rows
- 🔴 2. The one SW check a single deploy cannot make — hold a session across deploy N → N+1
- 🟠 3. Measure the 8.2 MB entry chunk on a device (parse time, heap) before touching it — **David's call after the number**
- 🟠 4. Should the 1,282 archived anchored danya notes come back? — **David's call**
- 🟡 5. 57,204 un-positioned notes — a memory decision, never a boot one; never prune without measuring both ways
- 🟡 6. A cold first teaching reply draws on less corpus — watch it in the Learn audit
- ✅ 7. The corpus gates are even · ✅ 8. `BuildVersionWidget.test`
- ⛔ 10. **Section-14 detectors fire on nothing real** — theirs. The instrument half landed (`2d9f151`: each detector now names WHICH GATE it failed, so the 23% bucket is measurable); still never attributed on a real game

## 9. Carried over — the stale-tactics checklist (pickup §7)
- ✅ The whole `fen`-required sweep, both ref races, the gates, ship-check crash-as-green
- ✅ `formatTacticsSubBlock` now takes the board fen as a required parameter
- 🔴 `npm run ship-check` has never printed READY TO PUSH on that tree
- 🔴 Read the `tactics-context-stale` count off the listener
- ✅ `GameChatPanel.test` — MEASURED 2026-09-20: 16/16 green on a synced tree. The "red on untouched main" claim was stale and is deleted, not annotated
- ✅ Swept: ONE `crashed(out)` detector backs vitest, lint, tsc and the Playwright summarizer — the regex had already been hand-written twice, which is the drift the rot rule names

---

## THE OTHER SESSION'S BOARD — ⛔ THEIRS, DO NOT PICK UP (their report, 2026-09-20)

- ✅ All their work on `main` and live, bundle `index-BjQZ6ReX`. Nothing running or pending.
- ⛔ **The ~250 s regression** — the new insight sweep was AWAITED inside the function the review walk waits on. Detached and gated; their re-measure against the fixed bundle is the confirmation and is still owed.
- ⛔ **The wider critical fan**, a second slowdown candidate, unresolved until that deterministic re-measure.
- ✅ Three real bugs fixed on the way: the review path recorded nothing into the student model · four seat resolvers where only one read the declared seat · three fresh-game doors in Learn clearing different subsets of memory.

## WHERE IT STANDS IN ONE LINE

The loop is CLOSED and proven on prod in the RED direction, in both registers:
the coach learned the student in game A and said something different in game B.
What is left is the **ceiling** (the `other` attribution gap — another session),
the **wedge** (#21 — another session), and **GREEN** (the coach going quiet when
you improve). Green is the half of the main concept nobody owns: the mechanism
is built and has never once been shown to fire. See below.

## UNOWNED RIGHT NOW — and the ONLY one that is the main concept

**GREEN — the coach going quiet when you get better.** The heat map has three
states and the app can act on two. Measured 2026-09-20, not recalled:

| half | state |
|---|---|
| RECORD a hold (`capabilityEvidence`, both halves computed) | ✅ built, 8 modules |
| RECORD a miss | ✅ built, 21 modules — **the parity gap is 21 vs 8** |
| the PROFILE (`getCapabilityProfile`, prompted rows skipped) | ✅ built |
| a term that can LOWER need (`needScore.capabilityTerm`, held ≥ 3 + zero broken) | ✅ built, ONE production reader |
| **does real play ever reach held ≥ 3 with zero broken?** | ✅ **MEASURED 2026-09-20: YES, 6 of 6 game-seats, off ONE game each** |
| is the bar set right, i.e. does a proven tag SURVIVE later games? | 🔴 **NO — measured: 1 flip in 5 games, on the tag that proved fastest** |
| can a student who FIXES a weakness ever go green again? | 🔴 **NO — `broken > 0` is lifetime, so green is unrecoverable** |
| **has a student's Nth game ever gone quiet because of games 1..N-1?** | 🔴 **NEVER SHOWN** |

🔴 **The "21 vs 8 parity gap" I read off `docs/STATE.md` is a GREP RATIO, not a
hole — measured 2026-09-20, corrected here rather than left standing.** The two
lists overlap and count readers as writers; the hold side is wired at every live
surface. There is no recording half left to build. What is unproven is
everything to the RIGHT of the record.

🔴 **AND THE FIRST NUMBER FLIPPED THE RISK.** The worry was that green could
never fire. It fires easily: every game-seat measured proved at least one
capability from a SINGLE game (`passive-king-endgame 7h/0b` — the board asked
seven times and quiet accurate moves answered). The RED guard works correctly
(one break holds a tag red however many holds it has, e.g. `passive-rook
6h/3b`). So the defect risk is not a wire that cannot fire, it is a BAR SET TOO
LOW — the coach going quiet about something the student never demonstrated,
which is absent-≠-mastered pointing the other way. `HELD_FOR_PROVEN = 3` is the number under test, and the
sequence measurement answered it: ONE STUDENT, FIVE GAMES IN ORDER,
`neglected-development` proven after game 1, still proven through game 4,
BROKEN in game 5 — so the coach would have gone quiet about it for four games
and then watched them do it again. One flip in five games, on the tag that
proved fastest.

🔴 **AND THE OPPOSITE DEFECT, found by the same run: GREEN IS UNRECOVERABLE.**
`getCapabilityProfile` counts LIFETIME broken and `capabilityTerm` requires
`broken === 0`, so one break ever bars a tag from green permanently, however
many holds follow. The heat map exists to say "you have GOTTEN BETTER" and as
built it structurally cannot.

✅ **THE BAR IS NOW MEASURED, NOT CHOSEN (2026-09-20).** The first fix below
was the right SHAPE and the wrong VARIABLE, and the numbers said so: swapping
three lifetime holds for a 3-streak across 2 games moved flips 1 → 2, and a
full sweep found **2 flips at every count threshold from 3 to 6 holds and 2 to
3 games** — the count knob does not control the failure at all. What does is
`posedImportance`, already stamped on every row by `capabilitiesPosed` and read
by nothing. Over 15 real amateur games (198 held rows, real engine grades):

| difficulty floor | capabilities proven | proven then FAILED |
|---|---|---|
| 65 (≈ the old effective bar) | 4 | 2 tags, 17 events |
| 74–78 | 3 | 1 tag, 4 events |
| **80 (shipped — the knee, and a plateau with 82/84)** | **2** | **0** |
| 86+ | 1 | 0 |

So GREEN now requires a clean streak of **2**, spanning **2 distinct games**,
at **posedImportance ≥ 80**. The count is 2 rather than 3 because the sweep
showed it inert — it only ever created false negatives. An easy hold is not
evidence AND not a failure: it is skipped without resetting the streak. The
shipped bar is asserted on the real rows (`2 proven, 0 flipped over 13 games`),
and `summariseEvidence` / `capabilityProven` take the thresholds as optional
parameters purely so the calibration sweeps the REAL rule — baking the floor in
made the sweep report zero flips at every level, an instrument green for free.

Earlier, and still true: `capabilityProven` is now the ONE
definition of green, read by both consumers (it was written twice —
`needScore.capabilityTerm` and `studentMomentBoost.isUnproven` — which is the
duplicated-judgement the rot rule bans). Proven = a RECENT clean streak
(`heldStreak`) spanning at least TWO DISTINCT GAMES (`streakGames`), instead of
three lifetime holds with a lifetime-zero break count. A break now RESETS the
streak rather than closing the door, so a student who fixes a weakness can be
told so. Gates: six streak cases in `capabilityEvidence.test.ts` (one game is
not proven however long; two games are; a break ends it; green is recoverable;
a prompted row is neither; grey is never proven) and two new contracts in
`capabilityRead.test.ts`.

🔴 **AND THE HOLE THAT MADE THE BAR MOOT — `/coach/play` RECORDED NOTHING.**
`recordMoveEvidence` had exactly ONE call site, inside `evaluatePlayerMove`,
which `CoachGamePage` correctly stopped calling on 2026-06-04 (it ran a second
Stockfish pair and a second classifier that disagreed with the blunder
interceptor). The positive half was a side effect of that call and went with
it — so the surface where students play whole games against the coach
contributed ZERO holds, while mounting the hook with `capabilityOrigin:
'play'`, which makes it read as wired. ✅ Fixed by a `recordGradedMove` door
that takes the cpLoss the surface ALREADY computed, so the removed second
analysis cannot come back, and passes `gameState.gameId` — which is also the
game identity the new bar counts. Gates: three hook cases +
`playRecordsCapability.test.ts` (blames by statement, and asserts
`evaluatePlayerMove` stays gone).
Reports: `audit-reports/capability-green.json`,
`audit-reports/capability-green-sequence.json`.

🔴 **PROD RUN 1 REPORTED A GREEN THAT WAS NOISE, AND ITS NEGATIVE CONTROL
CAUGHT IT.** Three devices on one real amateur game (`PF8pYEpN`): control 2932
words, green 2464 (−468, "quieter"), prompted 2506→2320 — but the PROMPTED arm
must change NOTHING, since the profile skips prompted rows, and it moved more
than green did. A failing negative control invalidates the positive result; it
does not caveat it. Run 2 added a SECOND UNSEEDED CONTROL to measure the
instrument against itself: noise floor **117 words within a run**, while the
same unseeded config varied **592 words between runs**. Against that floor,
green moved **16 words**. Verdict: RUN UNUSABLE, printed by the audit itself.

🔴 **THE REASON IS THE SURFACE, NOT THE WIRE.** Review is `'walk'` posture, and
the locked rule (G4.5.15) is that on `walk` importance must NEVER decide
whether a ply speaks — every ply is a beat. So a term that LOWERS need cannot
make review quieter; it can only reorder. Green's quieting is only observable
on an `'interrupt'` posture surface (Play, live Learn), where silence is the
default and the coach must earn the interruption. **Retarget the instrument
there; the review arm proves nothing either way and should not be re-run.**

That is the exact shape the RED direction was in before WO-LOOP-01: every half
built and gated in isolation, the sentence never demonstrated end to end. The
red half was proven by SEEDING game A and reading game B's tape; green is
provable the same way, and the measurement comes first because if real play
never produces a proven capability then the lowering term can never fire and
`HELD_FOR_PROVEN` (or the posing bar) is the defect rather than the wire.

Not the main concept, and explicitly deprioritised (David 2026-09-20: "the
register doesnt get up to closing the loop"):
- 🔴 C15 the voiced corpus register — a real defect the student hears, but polish next to the loop.
- 🔴 11e the test-type-error ceiling 236 → 0 — hygiene, test files only.
- 🔴 E2 the two-deploy service-worker check — rides along with whatever ships next.
