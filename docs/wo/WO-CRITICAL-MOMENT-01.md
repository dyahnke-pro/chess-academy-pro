# WO-CRITICAL-MOMENT-01 — one computer, two registers

**Session 2 of 3 (2026-09-19).** Read CLAUDE.md (level I) → `docs/STATE.md`
(level II) → `node scripts/surface-map.mjs <your files>` (level III) → the code
(level IV) before writing a line. The design is `PLAN.md` §THE CRITICAL MOMENT;
this WO is its file-ownership contract plus what was already measured for you.

**The one sentence.** Review asks its question at the biggest SWING; the moment
worth teaching is the biggest CRITICALITY, and the two come apart exactly where
teaching is best — a student who FOUND the only move has a swing of zero, so
today it can never be the question.

---

## FILE OWNERSHIP — this is the collision contract, three sessions are running

**YOU OWN (no other session may edit these):**
- `src/services/positionFacts.ts`
- `src/services/reviewTurningPoint.ts`
- `src/services/teachingSelector.ts`
- `src/services/coachDecider.ts`
- `src/services/capabilityEvidence.ts`
- `src/services/gameAnalysisService.ts`
- `src/components/Coach/CoachGameReview.tsx`
- `src/components/Coach/CoachReviewSessionPage.tsx`
- `scripts/audit-review-overhaul-prod.mjs`

**DO NOT TOUCH (owned by the other two sessions):**
- `CoachTeachPage.tsx`, `CoachGamePage.tsx`, `coachApi.ts`, `coachService.ts`,
  `groundedAnswer.ts`, `deliberation.ts`, `guidedFindTheMove.ts`,
  `tacticalRead.ts`, `curatedBeatSource.ts`, `mistakeNarration.ts`,
  `gamesService.ts`, `openingNarrationService.ts` → **WO-LIVE-VOICE-01**
- everything under `src/components/Tactics/`, plus `puzzleService.ts`,
  `adaptivePuzzleService.ts`, `mistakePuzzleService.ts`, `misconceptionService.ts`,
  `weaknessSpine.ts`, `bucketPipelineAudit.ts`, `MyMistakesPage`,
  `WeaknessTagDrillPage`, `ImportPage` → **session 3 (tactics/drill chain)**
- `vite.config.ts`, `index.html`, the bundle/corpus payload → PLAN §E, unclaimed

You may **call** the weakness/mistake services; you may not **edit** them.
If you believe you must edit a file you do not own, stop and say so — do not
land it. PLAN.md already records what that costs: *"a blind fix into a surface
another session is actively editing is how two correct changes become one
broken one."*

---

## MEASURED FOR YOU — do not re-derive (verified 2026-09-19 on this tree)

| fact | anchor |
|---|---|
| The severity computer already exists, rating-scaled, from the top-2 gap | `positionFacts.ts:276` `severityFromGap`, called at `:382` and `:547` |
| **Learn ALREADY announces the moment** — and it lives in positionFacts, NOT in CoachTeachPage, so you need no edit on the Learn surface at all | `positionFacts.ts:885-888`, ranks 85 (`only-move`) / 65 (`critical`), gated `studentToMove && a.slowDownOwed` |
| Review's question is selected by SWING | `reviewTurningPoint.ts:107` `turningPointCandidates` → `:126` `buildTurningPointQuestion` |
| …and has **TWO** consumers, not one — changing it reaches the teaching selector too | `CoachGameReview.tsx:1234` **and** `teachingSelector.ts:186` |
| The live lane already has the MultiPV fan (singleton ships 3, widenable to 256) | `stockfishEngine.ts:1036`, `:1894` `setMultiPvLines` |
| **The review pool hardcodes MultiPV=1 and `MoveAnnotation` persists no fan** — so review cannot count how many moves hold from stored data | `gameAnalysisService.ts:602` |
| `prompted` is REQUIRED on the evidence record and **nothing writes `true` yet** — this build is its first writer | `capabilityEvidence.ts:89`, `:193-194`, `:214` |

## TWO THINGS ALREADY DISPROVEN — do not rebuild them

1. 🔴 **The personal cp-loss tolerance is DEAD.** Measured on 6 real games /
   143 plies / two rating bands: amateur ~1200 and strong ~2000 came out
   statistically identical (p50 23 vs 23, p75 49 vs 53, p90 116 vs 106) AND it
   nags — p50 fires 15×/game in both cohorts. It fails on the only axis that
   justified it. The right personal number is **press/no-press at a critical
   moment**, which does not exist yet and which this build creates.
2. 🔴 **The MultiPV=3 cap is a NON-ISSUE.** We speak only when the count is 1
   or 2, and that is precisely the case a 3-wide fan resolves. Positions where
   3 of 3 sit within tolerance are the ones where nothing hinges and the coach
   is SILENT. No wider fan, no second engine call. Do not reopen this.

---

## THE BUILD, in order

1. **ONE computer: how many moves still hold, and what they hold.** Count the
   fan's moves within tolerance of the best. `>=3` → nothing hinges, SILENT.
   `2` → a forgiving fork. `1` → only one move holds. The count IS the trigger;
   treating trigger and count as two questions was the design's own first error.
2. **The stake, computed from the eval, never templated.** "Keeps equality" is
   a claim about the evaluation and is FALSE when they are winning (it keeps the
   win) or lost (it promises a draw that is not there). Band off the best line,
   mover-POV: keeps the win / keeps you on top / keeps you level / keeps you in
   it / limits the damage. Mate is its own answer, never a centipawn band. Omit
   the clause rather than claim a stake with no line to read.
3. **LEARN — a STATEMENT, never a question.** The student is mid-calculation; a
   blocking card takes over the decision, which is why the mid-game cards were
   removed in August. Extend the two existing lines at `positionFacts.ts:885-888`
   with the COUNT and the STAKE. Ship this half FIRST — the fan is already there,
   so it costs no engine work.
4. **REVIEW — the same computer as a QUESTION**, asked AT that ply during the
   walk, not as the end-of-game afterthought it is today. Retarget the existing
   card from swing → criticality. This half needs a **new MultiPV>=3 pass over
   UNFLAGGED plies** (unflagged is the whole point — a found only-move has zero
   swing, which is why the current selector can never see it).
5. **PHRASING — rotate the stem, never the claim.** The sanctioned idiom already
   exists in `methodBeat`: `pick(variants, v) = variants[Math.abs(v) % variants.length]`,
   keyed on the PLY — resume-safe and testable. **Never `Math.random`.** Three or
   four variants per shape; the COUNT and the STAKE are facts and never vary.
6. **RECORDING — a prompted find is GREY.** When Learn announces the moment and
   the student then finds the move, that is not evidence they can do it unaided:
   write `prompted: true`, which the profile counts as neither held nor broken.
   The coach's own teaching must never inflate the model it uses to decide
   whether to teach.

## GATES

- A new test for the counter (negative-controlled: it must go red if the
  tolerance or the count is reverted).
- `positionFacts` / `reviewTurningPoint` existing tests stay green.
- **`teachingSelector.ts:186` is a second consumer** — prove you did not change
  what it selects, or change it deliberately and say so.
- `npm run typecheck` (NOT bare `npx tsc --noEmit` — the root tsconfig is
  `{"files": []}` and always exits 0 having checked nothing).
- `npm run ship-check` must print `READY TO PUSH`.

## AUDIT — and the serialization rule

`scripts/audit-review-overhaul-prod.mjs` against LIVE prod, muted:
```
AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-review-overhaul-prod.mjs
```
🚨 **Prod audits are a SHARED, SERIALIZED resource across the three sessions.**
They drive a real browser with real Stockfish workers; two at once starve each
other and produce timeouts that read exactly like product failures. A review run
was invalidated twice on 2026-09-16 by CPU stacked beside it. Announce before
you start one, run nothing else beside it, and never run one beside ship-check.

**Report the NARRATIONS, not the pass count.** Every real defect found this week
was found by READING output that every gate passed.
