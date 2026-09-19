# WO-LIVE-VOICE-01 — what the student actually hears on Learn and Play

**Session 3 of 3 (2026-09-19).** Read CLAUDE.md (level I) → `docs/STATE.md`
(level II) → `node scripts/surface-map.mjs <your files>` (level III) → the code
(level IV) before writing a line. Sources: `BACKLOG.md` §4 (defects read off a
real 22-ply Learn game, 233 spoken lines) and `PLAN.md` §C + §"TWO SURFACES STOP
MAKING PROGRESS".

**The one sentence.** Every defect below was found by READING what a real
student heard, and every one of them passed every gate the repo has.

---

## FILE OWNERSHIP — this is the collision contract, three sessions are running

**YOU OWN (no other session may edit these):**
- `src/components/Coach/CoachTeachPage.tsx`, `src/components/Coach/CoachGamePage.tsx`
- `src/services/coachApi.ts`, `src/services/coachService.ts`
- `src/services/groundedAnswer.ts`, `src/services/deliberation.ts`,
  `src/services/guidedFindTheMove.ts`, `src/services/tacticalRead.ts`
- `src/services/curatedBeatSource.ts`, `src/services/mistakeNarration.ts`,
  `src/services/gamesService.ts`, `src/services/openingNarrationService.ts`
- `scripts/audit-concept-gameplay-prod.mjs`, `scripts/audit-learn-full-game.mjs`

**DO NOT TOUCH (owned by the other two sessions):**
- `positionFacts.ts`, `reviewTurningPoint.ts`, `teachingSelector.ts`,
  `coachDecider.ts`, `capabilityEvidence.ts`, `gameAnalysisService.ts`,
  `CoachGameReview.tsx`, `CoachReviewSessionPage.tsx` → **WO-CRITICAL-MOMENT-01**
- everything under `src/components/Tactics/`, plus `puzzleService.ts`,
  `adaptivePuzzleService.ts`, `mistakePuzzleService.ts`, `misconceptionService.ts`,
  `weaknessSpine.ts`, `bucketPipelineAudit.ts`, `MyMistakesPage`,
  `WeaknessTagDrillPage`, `ImportPage` → **session 3 (tactics/drill chain)**

You may **call** the weakness/mistake services; you may not **edit** them.
`positionFacts.ts` is the sharpest trap here — it is where the live narration
lines are ranked, and it belongs to WO-CRITICAL-MOMENT-01. If a fix below seems
to want a guard in `positionFacts` or `coachDecider`, that is the doctrine
telling you the fix is in the WRONG place: fix the PRODUCER, not a downstream
gate. **"A gate that fires means the wrong thing was still possible."**

---

## STEP 0 — the Learn stall is GONE. Do not bisect it.

`PLAN.md` used to record two surfaces stalling on bundle `index-C7Z2So9u`.
**Re-measured on prod 2026-09-19 17:41** (`ae10b89`): `audit-concept-gameplay-prod`
is 8/8, the canonical ask is 5 plies in **24 s** against 4 plies / 136 s twice on
the red bundle — faster than the 27 s pre-regression baseline.

| bundle | canonical ask | typo ask (picker) |
|---|---|---|
| `index-BBopxcK2` (last green) | 5 plies, 27 s ✅ | 5 plies, 26 s ✅ |
| `index-C7Z2So9u` (red, twice) | 4 plies, **136 s** ❌ | 5 plies, 30 s ✅ |
| prod after 2026-09-19 | **5 plies, 24 s** ✅ | 5 plies, 28 s ✅ |

**Do not spend a session on the bisect, and do not credit any one commit** —
three landed between the red and green bundles and one green run attributes
nothing. If it ever returns, that table is the baseline and the canonical ask is
`"Play the Scandinavian Defense, Lasker Variation with me"`.

🔴 **THE REVIEW HALF HAS NOT BEEN RE-MEASURED.** The same section recorded the
review walk sitting at **ply 0 of 93 for 1,100 seconds** while the readout read
correctly before and after it. Only the Learn half was re-run. That row belongs
to WO-CRITICAL-MOMENT-01's surface, so **do not fix it** — run
`audit-review-overhaul-prod` once, report what the walk does, and hand the
result to that session. One measurement, no code.

---

## PHASE 1 — the falsehoods (a student heard each of these)

### L1. The coach keeps coaching after checkmate
Ply 22 spoke *"Checkmate."* and then continued: *"The move is Rd1"*, *"Re1 is
playable, but not as precise"*, *"Their king is still in the centre."*

**Producers, measured:** `deliberation.ts:160` (`The move is ${d.best.san}.`),
`deliberation.ts:148` (`${c.san} is playable, but not as precise.`),
`guidedFindTheMove.ts:165`, `tacticalRead.ts:486`.

**Fix at the producer, never with a downstream gate.** A terminal position has
no next move, so each of these returns `null` on `isGameOver()`. Emit the win
line instead. NB the PLAY surface already got the mate half of this
(`CoachGamePage.tsx:3110` `endedInMate`, `:3131` `capEval`) — Learn did not;
**sweep both**, and check every `assembleSlipNarration(` call site for an
uncapped cpLoss while you are there.

### L2. A false claim about a piece captured 15 plies earlier
*"Your knight on b5 is hanging"* — b5 was captured at ply 7 (`axb5`) and the
student had **no knights left at all**.

The board-checker in the audit covered **116 of 233 lines** — only those
carrying a FEN — so 117 lines shipped ungraded and at least one was false.
**Fix the COVERAGE, not just the claim:** every spoken line must carry the FEN
it was spoken at, so the checker can grade all of it.
Instrument caveat, do not "fix" it wrongly: the checker false-positives on
HYPOTHETICALS (*"a4 would create a passed pawn on b4"* flagged because b4 is
empty now). Conditional and projected claims are not claims about the current
board and must not be graded as such.

### L3. Internal plumbing spoken aloud
`groundedAnswer.ts:1061-1062` — *"You're down 2 points of material here **(no
engine eval on this exact spot)**."* The parenthetical is the app explaining its
own wiring. Narration Voice Rule 2 bans interface references outright. Either
the clause is a fact worth saying or it is silence; it is never a status report.

### L4. A 184cp blunder graded "under the floor, nothing to call"
Two coach moves in one game — `Qc7` at 122cp, `Qxc5` at 184cp — classified as
not worth mentioning. The advanced band's own threshold is 50cp. Whatever floor
`coachVerdict` applies is mis-scaled or inverted. **Find the real floor before
changing a number**; a threshold tuned against the wrong input is worse than an
untuned one because it looks deliberate.

---

## PHASE 2 — the repeats

### L5. Consecutive plies re-announce the same move from different lessons
Ply 5 *"Bc4 — the Italian bishop"*, ply 6 *"Bc4 — the Italian bishop, pointed
straight at f7"*, then *"c3 — modest"*, *"c3 — quiet, but loaded"*, *"c3 and d3
— the Giuoco Pianissimo"*. Five beats, three ideas.

`CoachTeachPage.tsx:7607-7609` dedupes by `beat.id` (`learnMemRef.curatedBeatSeen`)
and `buildVoicePackage`'s novelty set matches whole SENTENCES — so two lessons
teaching the same move in different words evade both. **The missing dedupe term
is the beat's SUBJECT (the move it leads with), not its text.**

### L6. Stems are ROLLED, not rotated (#67)
Five sites roll `Math.random` for narration variety, so variation is neither
resume-safe nor testable — the app's law is *rotated, keyed on something stable*:
- `mistakeNarration.ts:29`
- `gamesService.ts:286`, `:296`, `:300`
- `openingNarrationService.ts:165`

Convert to `methodBeat`'s sanctioned idiom: `pick(variants, v) =
variants[Math.abs(v) % variants.length]`, keyed on the PLY.
**Leave these alone — they are ID generation, not stems:** `deviceIdentity.ts:52`,
`capabilityEvidence.ts:102`, `learnMemory.ts:162`, `mistakePuzzleService.ts:116`,
`trainingSessionLedger.ts:54`, and the shuffles in `gamesService.ts:45` /
`tacticCreateService.ts:145`.

### L7. VERIFY FIRST — #51 looks already fixed
PLAN lists *"the queen takes d5 is about as good"* (a SAN rendered as a noun
phrase) as open. On this tree `tacticalRead.ts:525` `uncertaintyClause` already
routes both move slots through `sayMoveNoun`. **Confirm before spending a
minute on it** — and if it is fixed, delete the PLAN bullet rather than
annotating it (the Lake Butler rule: leave no contradiction for the next reader).

---

## GATES + AUDIT

- A test per fix, each **negative-controlled** (revert the fix → the test goes red).
- `npm run typecheck` — NOT bare `npx tsc --noEmit`; the root tsconfig is
  `{"files": []}` and exits 0 having compiled nothing.
- `npm run ship-check` must print `READY TO PUSH`.
- Then `audit-concept-gameplay-prod` (it PLAYS a game — a mounted walkthrough is
  a FAIL row, by design) and `audit-learn-full-game`.

🚨 **Prod audits are a SHARED, SERIALIZED resource across the three sessions.**
Real browser + real Stockfish workers; two at once starve each other and produce
timeouts that read exactly like product failures. Announce before you start one,
run nothing beside it, never beside ship-check.

**Report the NARRATIONS, not the pass count.** Fire does not equal green.
