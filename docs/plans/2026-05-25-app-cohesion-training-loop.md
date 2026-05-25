# App Cohesion — One Training Loop (2026-05-25)

David: *"Best to get a proper plan for how the entire app should work
because it all blends and ties into each other. No tab or function
should be standing alone. This is one cohesive training platform and
every tab should feed the overall training structure."*

This plan started as a function/wiring audit (info-bubble claims vs.
actual code) and expanded to the whole app. The info bubbles already
describe the intended loop almost verbatim across Dashboard,
Weaknesses, and Tactics:

> **Learn it → play it → find the holes → drill them shut.**

The job: make the code BE that one loop. Today several tabs stand
alone — they consume the loop but emit nothing back, or emit to a
store nothing downstream reads.

---

## 1. The intended loop (the spec the bubbles promise)

```
        ┌─────────────────────────────────────────────────────────┐
        │                                                         │
   ┌────▼─────┐   play / import    ┌──────────┐  analyze + capture │
   │ OPENINGS │──────────────────► │  GAMES   │───────────────┐    │
   │ (WLPP)   │                    │ (yours)  │               │    │
   └────┬─────┘                    └──────────┘               │    │
        │ favorites + learned lines                           ▼    │
        │                                          ┌─────────────────────┐
        │                                          │  WEAKNESS SPINE      │
        │                                          │ (your holes, ranked) │
        │                                          └──────────┬──────────┘
        │                                                     │
        │            ┌────────────────────────────────────────┼───────────────┐
        │            ▼                     ▼                    ▼               │
        │     ┌────────────┐       ┌──────────────┐    ┌───────────────┐       │
        │     │ WEAKNESSES │       │   TACTICS     │    │ TRAINING PLAN │       │
        │     │  (profile) │       │ (drills/SRS)  │    │  (the hub)    │       │
        │     └────────────┘       └──────────────┘    └───────┬───────┘       │
        │                                                       │ today's reps  │
        └───────────────────────────────────────────────────────┘ (back to    │
                                                                    openings)   │
        DASHBOARD = the live status board for the whole loop ──────────────────┘
```

Every arrow above is a claim made by an info bubble. The audit below
marks which arrows are real wire vs. prose-only.

---

## 2. The spine (Dexie stores) and who feeds / reads each

| Store | Written by | Read by | Status |
|---|---|---|---|
| `openings` | WLPP rungs (`markRungComplete`), favorites toggle | OpeningDetail, TrainingPlan rolodex, weaknessAnalyzer (repertoire) | OK |
| `games` | import (lichess/chesscom), coach play | review, analyze, mistake-gen | OK |
| `mistakePuzzles` | **Analyze pipeline only** (`generateMistakePuzzlesFromGame`) | Weaknesses page, My Mistakes, Tactics daily | **silo A** |
| `misconceptionTags` | conversational capture (play / opening-play / review button) | Misconceptions tab, **Training Plan** | **silo B** |
| `openingWeakSpots` | opening blunder detection | Weaknesses page | OK (under A) |
| `puzzles` | `recordAttempt` (solve/miss + SRS) | Tactics daily, theme skills, Tactical Profile | OK |
| `srsOpeningCards` | **manual enroll only** (`enrollOpening`) | SRS Trainer page only | **dead-ish** |
| `setupPuzzles` | Setup Trainer | Setup Trainer only | **dead-end** |
| `sessions` | (gutted) | nothing | **dead** |

---

## 3. The structural disease (why tabs stand alone)

### 3.1 TWO weakness pipelines that never merge (the central break)
- **Silo A — `mistakePuzzles`** (engine/Analyze-derived) → feeds
  Weaknesses page, My Mistakes, Tactics drills.
- **Silo B — `misconceptionTags`** (conversational-capture) → feeds
  Misconceptions tab + Training Plan.

A mistake captured in **review/play** (silo B) never appears in
**Weaknesses** or becomes a **Tactics drill**. A mistake from
**Analyze** (silo A) never drives the **Training Plan**. The two
halves of "find the holes → drill them" are siloed, so multiple info
bubbles are literally false:
- Review bubble: *"mistakes found here become your Weaknesses and
  Tactics drills"* — review writes silo B; those surfaces read silo A.
- Training Plan bubble: *"pulls Openings, Tactics, and Weaknesses
  together"* — it reads only silo B + favorites (rolodex), not the
  Analyze mistakes or SRS.

**This is the disease.** Everything else is a symptom or an orphan.

### 3.2 Orphaned / dead-end surfaces (built, not wired into the loop)
| # | Surface | Problem | File:line |
|---|---|---|---|
| O1 | **Review walk** | `useReviewBlunderCapture` (coach asks "why did you play that?" at each blunder, classifies + logs) is built + tested but imported by ZERO components. Manual `GameReviewWeaknessCapture` button renders only on the summary-card branch, not the walk. So the review walk captures NOTHING automatically. | `useReviewBlunderCapture.ts` (no importers); `CoachGameReview.tsx:1644` |
| O2 | **Training Plan** | `buildTodaysReps` accepts `srsDue` + `newLines` but is passed `[]` for both → only weakness reps ever surface. Bubble promises "a line to Learn, a weakness to drill, a position to review" (3 kinds); delivers 1. | `TrainingPlanRolodexPage.tsx:67` |
| O3 | **SRS for openings** | Learning a line (`markRungComplete('learn')`) does NOT enroll it in SRS; enrollment is manual-only. So `srsOpeningCards` stays empty and "spaced review" never happens organically. | `srsOpeningService.ts:151`; `openingService.ts:327` |
| O4 | **Tactical Profile** | Page reads `getThemeSkills()` (puzzle accuracy) only; ignores the miss-aware `computeTacticalProfile` (which reads `mistakePuzzles`). Feeds nothing downstream — pure read-only view. | `TacticalProfilePage.tsx:66`; `tacticalProfileService.ts:43` |
| O5 | **Dashboard** | Static tiles. Reads nothing from Dexie for content (only `seedDatabase` + `updateStreak`). The "loop" exists only in its help prose, not as live state (due counts, next action, recent error). | `DashboardPage.tsx:21-100` |
| O6 | **Setup Trainer** | Consumes the loop (reads `mistakePuzzles`) but emits nothing back — its own SRS track in `setupPuzzles` feeds no profile/plan. | `tacticSetupService.ts` |
| O7 | **coachTrainingService** | A parallel recommender (`getTrainingRecommendations`) feeding only `CoachTrainPage`, duplicating the Training Plan's job on a different code path. | `coachTrainingService.ts:60`; `CoachTrainPage.tsx:21` |

### 3.3 Opening-internal correctness bugs (smaller, contained)
| # | Bug | File:line |
|---|---|---|
| B1 | **Pitfall "Play" leaks to generic `/coach/play`** instead of the in-page locked `OpeningPlayMode customLine` — violates the locked WLPP Play-lock rule; passes only the main-line pgn, so the room wanders off the pitfall line. (Gem-play + named-trap-play correctly use `OpeningPlayMode`.) | `OpeningDetailPage.tsx:344` |
| B2 | **Coach chat (MasterclassCoachChat) injects line scope but no live FEN** — knows WHICH line, not the live board position; Q&A is in-memory only. | `MasterclassCoachChat.tsx:50` |

---

## 4. Target architecture — one spine, every tab on it

**Principle:** one canonical "weakness profile" that BOTH capture
pipelines feed and ALL drill surfaces read. The Training Plan is the
hub; the Dashboard is the status board.

### 4.1 Unify the weakness read-layer (resolves the disease)
Build `getUnifiedWeaknessProfile()` (or extend `weaknessAnalyzer`'s
`computeWeaknessProfile`) to merge, by closed-set motif tag:
- `mistakePuzzles` (already aggregated by `analyzeMistakePuzzles`)
- `misconceptionTags` (already aggregated by `getMisconceptionProfile`)
- `openingWeakSpots`

Then point all three readers at it:
- **Weaknesses page** — ranks the merged tags (today: silo A only).
- **Training Plan** — weakness reps from the merged profile (today:
  silo B only).
- **Tactical Profile** — overlays the merged miss-data on theme skills.

**Why a read-layer merge, not a store migration:** the two stores
hold different shapes (position-puzzles vs. tag-aggregates) and serve
different drill modes. A merge layer is low-risk, reversible, and
doesn't touch existing writes. (Alternative considered: dual-write
every capture to `mistakePuzzles` too — heavier, riskier, and
position-puzzles need a FEN+bestMove that conversational capture
doesn't always have. Rejected for v1.)

### 4.2 Every capture writes the spine
- Mount `useReviewBlunderCapture` into the review **walk** so the
  coach asks "why?" at each of your blunders and logs the answer
  (O1). Keep the summary-card capture as the bulk "add all" path.
- Auto-enroll an opening line in SRS on `markRungComplete('learn')`
  (O3) so learned lines become "due" later with no manual step.

### 4.3 Training Plan = the real hub (O2)
Feed `buildTodaysReps` the two missing pools:
- `srsDue` ← `getEnrolledOpenings()` filtered `dueCards>0`, joined to
  opening names (`srsOpeningService.ts:284`).
- `newLines` ← new helper: for each favorited opening, enumerate
  `[main, ...variations]` minus `linesLearned` → openings with ≥1
  unlearned line.
- weakness reps ← the unified profile (§4.1), so Analyze mistakes
  drive the plan too.
- Consolidate `coachTrainingService` recs into this path or retire
  the duplicate (O7).

### 4.4 Dashboard = live status board (O5)
Replace static tiles' subtext with real loop state: today's-reps
count, SRS-due count, mistakes-due count, streak, and a single
"next action" CTA that deep-links into the plan. Tiles stay, but
they now reflect where the user is in the loop.

### 4.5 Tactical Profile feeds + reflects (O4)
Page uses `computeTacticalProfile` (miss-aware) and the unified
profile; "tap a weak motif" routes to a drill scoped to that motif's
actual mistake positions (already supported by `weaknessPuzzleService`).

### 4.6 Setup Trainer back-feeds (O6)
Surface `setupPuzzles` due-count into Daily/plan, and feed solve
outcomes into the tactical profile. (Lower priority — it already
consumes the loop; this closes the return arrow.)

### 4.7 Opening-internal fixes
- B1: Pitfall Play → in-page `OpeningPlayMode customLine` (the pitfall
  antidote line), matching gem/trap Play.
- B2: pass `currentFen` into `MasterclassCoachChat`'s coach call so
  it's position-aware.

---

## 5. Phased plan (each phase = one shippable unit + gates)

| Phase | Scope | Resolves | Risk |
|---|---|---|---|
| **P1. Spine merge** | `getUnifiedWeaknessProfile()`; repoint Weaknesses + Training Plan + Tactical Profile reads | 3.1, O4 (read side) | M — central; gated by a new `weaknessSpine.test` |
| **P2. Capture wiring** | Mount `useReviewBlunderCapture` in the walk; auto-enroll SRS on learn | O1, O3 | L-M |
| **P3. Plan = hub** | Feed `srsDue` + `newLines`; weakness reps from unified profile; retire `coachTrainingService` dup | O2, O7 | M |
| **P4. Dashboard live** | Real loop-state counts + next-action CTA | O5 | L |
| **P5. Opening fixes** | Pitfall Play lock; coach-chat live FEN | B1, B2 | L |
| **P6. Guards + copy** | Wiring gates (à la `OpeningDetailPage.wiring`) for each newly-wired link; reconcile any bubble copy that still over-promises; post-deploy audits | regression-proofing | L |

**Sequencing logic:** P1 first — it's the spine everything else reads;
once the unified profile exists, P2 (more capture into it) and P3
(plan reads it) compound. P4 reads P1+P3 outputs. P5 is independent
(opening-internal) and can land any time. P6 locks it so nothing
silently orphans again.

---

## 6. The one genuine fork for David

**§4.1 — how to unify the two weakness buckets.**
- **Recommended (read-layer merge):** keep both stores, build one
  merged profile that all surfaces read. Low-risk, reversible.
- **Alternative (dual-write):** make every capture also write a
  `mistakePuzzles` record so there's literally one store. Heavier,
  needs a FEN+bestMove for every conversational capture, but gives a
  single physical source of truth.

Everything else in this plan is unambiguous "make it work like the
bubble says." This is the only call that changes the data model.

---

## 7. Decisions log
- 2026-05-25 — Plan written; awaiting David's call on §6 (merge vs
  dual-write). Default = merge unless told otherwise.
- 2026-05-25 — David: "Do both." Built read-merge (Option A) +
  dual-write (Option B).
- 2026-05-25 — David: "work down the list ... all tied together in a
  pretty bow." Closed the remaining standalone surfaces (below).

## 9. Implementation status (2026-05-25)

| Item | Status |
|---|---|
| 3.1 two-bucket disease | ✅ DONE — `weaknessSpine.getUnifiedWeaknessProfile()` (merge + dedup); read by Weaknesses page, Training Plan, Dashboard, Tactical Profile. |
| Option B dual-write | ✅ DONE — `addMistakePuzzleFromCapture` from `captureMisconception`. |
| O1 review walk capture | ✅ DONE — `useReviewBlunderCapture` mounted in the walk. |
| O2 plan srs/new pools | ✅ DONE — `getSrsDueOpenings` + `getUnlearnedFavoriteOpenings` feed `buildTodaysReps`. |
| O3 SRS auto-enroll | ✅ DONE — `markRungComplete('learn')` → `enrollOpeningLine`. |
| O4 Tactical Profile | ✅ DONE — "From your games" section from the unified spine; taps drill via `/tactics/adaptive`. |
| O5 Dashboard live | ✅ DONE — `TodayStatus` strip (plan reps + setup-due). |
| O7 duplicate recommender | ✅ DONE — `/coach/train` redirects to `/coach/plan`; `CoachTrainPage` unmounted. |
| Weakness rep → real drill | ✅ DONE — weakness reps deep-link to `/tactics/adaptive` with the tag's themes; completion spaces the misconception tag (`recordTagDrillResult`) — closes the capture→drill→space loop that was never wired. |
| O6 Setup Trainer | ✅ tied in — `getDueSetupPuzzleCount` surfaced on the Dashboard daily strip (it already consumes the spine as a source). |
| B1 Pitfall Play lock | ✅ DONE — in-page `OpeningPlayMode`. |
| Endgame | ✅ DONE — endgame mistakes flow through the `endgame` bucket of the unified profile, AND a spaced-review due-model (`getDueEndgameLessons`/`getDueEndgameCount`, derived from `timesPlayed`+`lastPlayedAt`, no schema bump) feeds the unified scheduler. |
| B2 coach-chat live FEN | ✅ DONE — `buildCourseScope` now folds the line's resulting FEN (computed from the real DB line PGN) into the system prompt, so the coach is anchored to the position the line reaches, not move 1. |
| Cross-store "due today" scheduler | ✅ DONE — `dueToday.getDueTodayTracks()` aggregates all standalone SRS stores (tactical puzzles, game mistakes, opening reviews, setup puzzles, endgame reviews) into one routable board, surfaced on the Dashboard. (The plan feed still owns weakness/SRS-opening/new-line reps; the board covers the drill stores the feed doesn't, so no double-count.) |

## 8. Next-session pickup
Start at Phase 1 once §6 is decided. The audit findings + file:line
anchors in §3 are the punch list. Root `PLAN.md` is a different
(Sicilian) session's living doc — do not clobber it.
