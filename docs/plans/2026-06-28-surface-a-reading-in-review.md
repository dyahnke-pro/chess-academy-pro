# PLAN — Surface A: Reading challenges in game review (2026-06-28)

The killer use case from the position-reading design: during the review walk,
at the position the student faced **right before a critical mistake**, let them
prove what they can READ — then show the right answer. Reuses everything already
built in Surface B (the answer-key service, the two-tier grader, the loop-back
stats). The whole job is the *review integration*.

## The one hard constraint (learned, not guessed)

David RETIRED the old per-ply "why did you play that?" capture
(`useReviewBlunderCapture`, now an inert stub — 2026-06-11: "remove the pop-up…
we did away with this path"). It failed because it was an **auto-firing modal on
every blunder ply** — intrusive + redundant. Surface A must NOT repeat that:

- **Opt-in, never auto-fired.** No modal pops on landing. The student chooses to
  be quizzed.
- **Non-blocking.** A collapsible inline card (like the existing Ask panel), not
  a gate across the walk.
- **A READING challenge, not a confession.** "What do you see here?" (board
  vision) — not "why did you play X?" (justify your blunder).

## Why this is the *right* place (it slots into existing UI grammar)

At every flagged ply the walk ALREADY surfaces two buttons over the board
(`CoachGameReview.tsx:1365-1394`), shown when:
```
showBest = seg.classification ∈ {inaccuracy, mistake, blunder}
hasArrow = showBest && seg.bestMoveUci?.length >= 4        // :948-953
```
- **Explore this position** (`walk-explore-toggle-btn`) — try the move yourself.
- **Show me** (`walk-show-me-btn`) — watch the punishment line.

Surface A adds a **third sibling** at the SAME moments:
- **Read this position** (`walk-read-btn`) — get quizzed on what's there.

Natural learning sequence at a critical ply: **Read** (did I see it?) → **Show
me** (here's the move) → **Explore** (now I play it). It's the diagnostic David
wanted — separates "saw it, miscalculated" from "never saw it" — without ever
interrupting.

## The position to read = `seg.fenBefore`

The walk lands on the ply showing the move that WAS played (the blunder). Its
`fenBefore` is the position the student faced *before* deciding — exactly the
"right before the mistake" position. Build the answer key from `seg.fenBefore`.

## Data flow (all reused from Surface B)

1. `buildFedTacticsContext(seg.fenBefore, studentColor, rating)` → the package.
2. `buildReadingQuestions(seg.fenBefore, tactics)` → questions (we pick ONE —
   the most relevant to the miss; see Decision 3).
3. `gradeReadingAnswer(question, userAnswer)` → LLM-or-deterministic verdict +
   the computed answer.
4. `recordReadingResult(question.type, correct)` → the loop-back stat.

**Perf (the only real risk):** `buildFedTacticsContext` runs Stockfish (~2.5s)
when no cached analysis exists, which would stall if done on the tap. Fix:
**warm it in the background** when the walk lands on a flagged ply (a
non-blocking effect keyed by ply, result cached in a `Map<ply, question>`), so
by the time the student taps "Read this position" it's ready; show a brief
loading state if not. The arrow already renders instantly from `bestMoveUci`, so
nothing else waits on the engine.

## Integration points (file:line, from the map)

| Piece | Where |
|---|---|
| Flagged-ply detection | `CoachGameReview.tsx:948-953` (`hasArrow`) |
| Button row to extend | `:1365-1394` (Explore / Show-me) — add "Read" sibling |
| Card mount (scrollable middle) | `:1476` `review-scroll-middle` — render the read card here, mirroring the ask panel `:1622-1646` |
| Reset on ply change | `:774-779` (ask) — the read card resets the same way |
| Student color / rating | `reviewStudentColor` / `reviewStudentRating` (used by `handleAskSend`) |
| Board-lock contract | `:718-734` — read card shows the answer visually; no board writes |
| Opt-in setting precedent | `coachedReview` — `useSettings.ts:32/86/129`, `SettingsPage.tsx:948/1017`, `types/index.ts:848` |

## Phased build

**Phase 1 — the read card component (isolated, testable).**
`src/components/Coach/ReviewReadingChallenge.tsx` — props: `{ fen, studentColor,
rating, onGraded(type, correct) }`. Self-contained: builds the question (lazy +
cached), renders prompt + input + submit + grade + computed answer, calls the
grader + stats. Mirrors the Ask panel's shape. **Unit-testable in isolation**
(mock the service/grader) before it ever touches the 2,500-line file.

**Phase 2 — warm-on-land cache hook.**
`useReadingChallengePrefetch(seg, studentColor, rating)` — on landing a flagged
ply, background-build the question and cache it by ply. Returns the cached
question (or null/loading). Keeps Stockfish off the tap path.

**Phase 3 — wire into CoachGameReview (minimal surface area).**
Add the `walk-read-btn` sibling button (gated on `hasArrow` AND the new opt-in
setting); add the read card to the scrollable middle; reset on ply change. One
new state var (`readActive`), one component mount, one button. No change to the
walk runtime, the ask flow, or the board contract.

**Phase 4 — opt-in setting.**
`readingChallengesInReview?: boolean` (default **false** for v1 — opt-IN, so it
ships dark and David flips it on). Mirror `coachedReview` exactly: type, default,
`useSettings`, a Settings toggle ("Reading challenges in review").

**Phase 5 — tests + audit.**
- Component test for `ReviewReadingChallenge` (renders question, grades, shows
  answer on miss, records stat).
- Extend `audit-coach-review-gaps.mjs` with a `gap6-reading-challenge` scenario:
  on a seeded game with a blunder, walk to the flagged ply, tap Read, answer,
  assert the verdict + computed answer render.

## Decisions for David (genuine forks)

1. **Entry point** — opt-in "Read this position" button at flagged plies
   (recommended; matches Explore/Show-me, avoids the retired modal) vs a
   review-wide "quiz mode" toggle that auto-prompts (closer to the thing he
   retired). *Recommend: the button.*
2. **Which plies** — flagged only (inaccuracy/mistake/blunder, where the arrow
   already is) vs every ply. *Recommend: flagged only for v1.*
3. **One question or a set** — show the single most-relevant question (the
   tactic/threat that explains the miss) with a "another one" option, vs cycle
   the whole set. *Recommend: one focused question, optional more.*
4. **Read-gates-Show-me?** — keep Read fully independent (Show-me always
   available) vs require a read attempt before Show-me reveals the move (makes
   them commit first). *Recommend: independent — opt-in means opt-in.* But this
   is the one where his taste might differ (he may want the commit-first nudge).

## Definition of done
Opt-in setting ships; at a flagged ply the Read button appears; tapping it quizzes
the student on `fenBefore` with a computed answer key; grading + computed answer +
stat write all work; zero change to the walk/ask/board contracts; component test +
the review-gaps `gap6` scenario green; the retired-modal pattern is NOT
reintroduced (no auto-fire, non-blocking).
