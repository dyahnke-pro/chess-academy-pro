# Spending the computed narration across the coach tab

**David, 2026-08-10:** *"plan how we can use this new compute narrations in rest
of coach tab. I see it being valuable with review with coach."*

Plan only. Nothing here is built.

## What there is to spend

Five pieces landed this session, all deterministic, all board-verified, none of
them wired anywhere except Learn:

| piece | what it produces |
|---|---|
| `lookaheadPlan` | both sides' plans, ranked key squares, and a read of the board as it stands — from ONE engine line |
| `concessionBeat` | a nameable drawback: forward (the coach's move) and backward (the student's) |
| `positionalRead` | symmetric ranked observations, with proved joins |
| `hintRegister` | subtlety + frequency, driven by the student's found-the-move rate |
| `voicePackage` | deterministic ordering, spoken to TTS verbatim |

The property that makes them cheap to reuse: **they take a FEN and a line, and
return English.** No surface state, no React, no model. Any surface that already
has an engine read can have all of it for the cost of a function call.

## Why review is the right first target

David named it, and the architecture agrees for three reasons that are worth
separating, because only one of them is obvious.

**1. The engine work is already paid for.** Review analyses every ply of the
game to produce its evals. Those analyses contain the PV at every position and
then discard it. So in review the look-ahead plan is not "one extra engine call
per ply" — it is *free*, reading something already computed and thrown away.
That is the opposite of the situation in Learn, and it is the strongest argument
for doing review first.

**2. The register already matches.** The locked two-register rule says review is
RETROSPECTIVE — about the user's own game, mistake-aware, hindsight — while
Learn is present-tense live teaching. `findStudentDrawback` is natively
retrospective: it takes a move already played and says what it gave up. It was
built for Learn and it is *more* at home in review.

**3. Review is one of the three surfaces with literal ZERO corpus access.**
Per the 2026-08-03 integration audit, ~20 facet computers and not one of them
can reach a teaching note. The computed lanes do not fix that gap — the corpus
wiring is its own job — but they stop the surface being purely mechanical while
it waits.

There is also a pending task this simply *is*: **#44, "explain why the played
move wasn't best."** That is the backward look, already built, unwired.

## The order, and why this order

### 1. Post-game review — the backward look per ply
The smallest change with the largest payoff. Review already knows, for every
ply: the position before, what was played, and what the engine preferred. That
is exactly `findStudentDrawback`'s signature. Every ply where code can NAME what
the move gave up gets a sentence; the rest stay as they are.

Fires on ~4.5% of moves by measurement, so it is an occasional beat, not a new
wall of text.

### 2. Post-game review — both sides' plans at the turning points
Not every ply — the turning points review already identifies. At those, the
plan says what each side was trying to do, which is the thing a student cannot
reconstruct from an eval graph. Uses the PV that analysis already produced.

**Blocked on one thing:** the plan speaks in the present tense ("they want to
open the d-file"). Review needs the past ("they were going for the d-file").
That is a tense variant of `describePlan`, not a new computation — but it must
exist before this ships, or the two registers blur, which is a locked rule.

### 3. "Read this position" — `usePositionNarration`
The cheapest win in the app: this surface is a READ of the board, and
`positionReadLine` + the plan are a read of the board. It is one call. Today the
surface has no corpus and no computed read.

### 4. Tactics drills
Two uses, both existing machinery pointed at a new surface:
- **After a failed drill:** why the move chosen was worse — the backward look.
- **Before/around the drill:** the positional read for "what am I even looking
  at", at the register the student has earned.

17,972 corpus notes carry a tactical concept tag, so the corpus wiring matters
more here than the computed lanes; these are the floor, not the ceiling.

### 5. Endgame
`PositionRead` already classifies the endgame type, and the plan's vocabulary —
material swing, passed pawns weighted by rank, king proximity — *is* endgame
vocabulary. The endgame corpus is 7,120 notes but only 1.4% position-keyed, so
this surface lives on computed reads more than most.

### 6. Play — phase transitions ONLY
Play is a pure playing surface (locked). No blocking, nothing volunteered
mid-game. But phase-transition narration already exists there, and "you are
entering a middlegame where b5 is the square both sides want" is exactly what a
transition should say. Strictly transitions; nothing else.

### Never
Kid surfaces. Excluded by contract.

## What has to be decided before any of it

1. **The past-tense register.** Blocks #2 and colours #1. Not a computation — a
   second phrasing of the same computed facts, subject to the same rule that the
   words are assembled from templates and never a model.

2. **Where the corpus sits in review's order.** Learn's answer is settled: note
   first, then drawback → plan → gem → threat. Review has no corpus wiring at
   all yet, so the question is whether it inherits the same ladder when it gets
   one. Assume yes unless David says otherwise.

3. **Does the hint register apply to review?** Its dials are subtlety and
   frequency during a live game. In review the student is not choosing a move,
   so "withhold the answer" may be wrong — a review is where the answer belongs.
   Leaning: register governs Learn/Play/Tactics; review speaks plainly. Needs
   David's call, because it is a product decision, not a technical one.

4. **How much of a review to narrate.** Every ply with a nameable drawback could
   be several dozen sentences on a long game. The turning points are already
   identified; that is probably the budget.

## What would prove each one

The same bar as the build itself: not "the function was called" but "a real note
came out for a real position."

- Review: seed a real unanalysed game, run the genuine pipeline, walk every ply,
  and assert the drawback sentences are true of the boards they describe.
  `audit-review-real-game.mjs` is the template and already does the first three.
- Read-this-position: one prod probe, PostHog read-back by run id.
- Tactics / endgame: the existing drill audits, extended with board-truth
  assertions on the new lines.

## The thing not to do

Do not wire these as a fourth teaching lane that competes with the corpus. The
locked 90/10 rule stands: the notes are the coach's voice, and computed
narration is what speaks when the corpus has nothing for that board — which is
most of the board, which is why this is worth doing at all.
