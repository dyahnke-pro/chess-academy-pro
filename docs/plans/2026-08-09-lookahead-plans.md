# The look-ahead plan — teaching from the PV, and from the coach's own mistakes

**David, 2026-08-09.** Captured verbatim because the wording *is* the spec:

> "This look ahead plan function replaces the corpus notes as primary first
> heard by user when corpus runs out. Second we narrate the plans to the user
> based off of the look ahead (if both sides play well) not just with move by
> move now play this, but with hints that lead them to playing well. Like this
> square is weak or black wants to attack this square and that leads the user to
> defend a key square. Or even say, this is a key square that cannot fall!! And
> if the coach plays poorly, which it should, the coach leads the user into how
> to take advantage. Like 'I do not take your attack seriously so I remove one
> defender to attack over here, now is your chance to take control of the key
> square' things like that."

And the corrections that followed, which change two of the pieces below:

> "First of all the coach should never apologize. Second I don't have a
> deterministic answer for that. If the coach plays a worse move that clearly
> has a draw back then coach needs to tell alert the user and point them in the
> direction of the punishment (don't just give them the answer, but something
> subtle that makes them think) this is probably the hardest concept to get
> right so far. But it's the most important. Also again, coach is adaptive. So
> higher ranked players get more subtle hints. This needs to be coded for. We
> use the same adaptive hint system that I think has been coded already."

> "Acknowledge that it's not a hint button, but the coach narrations that act
> like hints throughout the game. Stronger player more subtle and less often
> hints. Weaker player much more obvious and more often."

## Why this is the right shape

It resolves a question I had parked as a product decision. The coach plays at
about 1684 elo; the engine's PV is depth 12–15 best play. Narrating "here's my
plan" from the PV would describe a plan the coach is not going to follow, so I
asked whether to narrate the strong plan or the real one.

David's answer is neither, and it is better than both: **narrate the strong
plan as the map, play the weak move as the coach, and make the gap between them
the teaching.** A coach that plays a concession and then says so — "I'm not
taking your attack seriously, I've pulled a defender off e5" — is doing
something a book cannot, and it is honest, because it really did just play that.

## Where it sits

The tier order becomes:

```
corpus, position-anchored     ← unchanged, still first
LOOK-AHEAD PLAN               ← NEW: primary once the corpus has nothing here
corpus, borrowed tiers        ← demoted below the computed plan
computed positional read      ← the floor
```

That is the significant reordering. Today, when the position-anchored corpus
misses, the next voice is a borrowed note framed "as a rule in these positions"
— generic by construction. David's instruction is that a *computed plan about
this actual board* outranks a *real note about a different board*. Given that
50.4% of anchored notes are mis-filed and the borrowed tiers are what he heard
all game, that is plainly right.

## What it is built from

Everything needed is already computed and mostly unused:

- **`pvPlayback.ts`** already replays the PV ply by ply, tags every ply with
  `moverColor`, and computes per-ply facts — captures, checks, tactic landed,
  material swing, files newly opened, passed pawns, outposts established. Both
  sides' intentions are in there; they are currently rendered as one narrative
  instead of two plans.
- **`positionalRead.ts`** already computes `me` and `them`. Nine rungs, one
  string, eight of nine one-sided (see the build-up notes below).
- **`openingBranches.ts` / `branchExplorer.ts`** (landed 3daa4abf) for the
  branch walk this narration will eventually describe.

No second engine search is needed for the plan itself: one PV, read twice.

## The pieces to build

### 1. Key squares, from the look-ahead
A square both sides keep returning to across the PV — landed on, captured on,
defended, or attacked by both. Deterministic: replay the PV and count contested
squares, weight by how much material contests them and by the eval swing when
control changes hands.

Output ranks them, so "a key square" and "**the** key square that cannot fall"
are different claims backed by different numbers rather than by emphasis.

### 2. A plan per side
Group the PV's plies by `moverColor` and read each side's intention off its own
moves: which squares it heads for, what it is trying to trade, which file it is
opening. Two plans, one search.

### 3. Hints, not dictation — and the hint IS the narration
The locked honesty contract already says name the opportunity and withhold the
move. This extends it to plans:

- "The e5 square is the whole game here — if it falls, your position falls with it."
- "I want to attack d5. Watch what happens to it over the next few moves."
- NOT "play Nf3 now."

The student is led to the move; they are not handed it.

David 2026-08-09, and this is the part to get right before writing any code:
**"it's not a hint button, but the coach narrations that act like hints
throughout the game. Stronger player more subtle and less often hints. Weaker
player much more obvious and more often."**

So there is nothing to press. The adaptation is not a separate feature bolted
next to the narration — it IS the narration, turned up or down. Two dials, both
driven by one number:

- **Frequency** — how many positions earn a beat at all.
- **Subtlety** — how far the same fact sits from the move. The identical
  position yields *"e5 is the square this game turns on"* to a strong player and
  *"my knight is coming to e5 and nothing of yours is watching it"* to a
  beginner. Same computed fact, different distance from the answer.

**The dial is how often the student is finding the right move** (David
2026-08-09) — not rating. Rating is a stale prior, entered once and often wrong;
whether they found the last six moves is a live read on the player sitting there
right now. It is already computed: `isNearBest(cpLoss)` (≤20cp) runs on every
player move for the slip detector, so the running found/missed tally costs
nothing new. Keep the rating band as the OPENING position of the dial — it is
all we know at move one — and let the tally move it from there. A 1200 who finds
five straight gets left alone; a 1900 who has missed four in a row is handed
something obvious, whatever their profile says.

Two things to get right when it is built: a window short enough to track a
student warming up or tiring (a handful of moves, not the whole game), and
hysteresis, so the register does not flip every other move — a coach that
alternates between cryptic and blunt reads as broken rather than adaptive.

### 4. The concession beat — the part that is genuinely new
Compare the coach's ACTUAL move against the PV move for its side.

**The trigger is a NAMEABLE DRAWBACK, not a cp threshold** (David 2026-08-09:
*"I don't have a deterministic answer for that. If the coach plays a worse move
that clearly has a draw back then coach needs to alert the user and point them
in the direction of the punishment"*). That is a better test than a number and
also a stricter one: the beat fires only when code can SAY what was given up — a
defender left a square, a file was opened, a piece went offside, a pawn became
weak. A move that is 80cp worse for reasons the board-reader cannot name gets no
beat, because there is nothing to point at. This makes the detector, not a tuned
constant, the thing that decides — and it is the same positional-read machinery
being built up below, which is why the two are one job.

Then point at the punishment **without giving it**: *"I don't rate your attack —
I've taken a defender off e5 to play on the other wing."* Never *"so play Nxe5."*
Distance from the answer follows the dial in piece 3.

**The coach never apologizes** (David, locked). Not "sorry", not "that was
careless of me", not a hedge in either direction. It states what it did and what
that hands over — a strong player showing you the hole they just made, not a
teacher confessing. This is the highest-value beat in the design, the only one
with no precedent in the app, and it turns the coach's weakness into the lesson
instead of something to excuse.

## Building up the positional read

Currently 148 lines: nine rungs, returns the FIRST true one as a string, eight
of nine about the student only. Three separate problems, in payoff order:

1. **Make it symmetric** — every rung run for both colours. Prerequisite for
   plans-for-both-sides.
2. **Return a ranked list, not a string** — so the caller decides how much to
   say, and the urgency scoring has something to rank.
3. **Add the joins** — a bad piece plus the break that frees it is a PLAN;
   separately they are two facts. This is where teaching lives and there is no
   machinery for it.
4. Then widen the detectors: space, backward pawns, majorities and which wing
   to play on, colour complexes, rook lifts, contested (not merely open) files.

Steps 1–3 change how it sounds. Step 4 only makes it say more.

## Open questions

~~**Concession threshold**~~ — **CLOSED.** It was never a threshold; the trigger
is a nameable drawback (piece 4).

~~**Rating adaptation**~~ — **CLOSED.** The dial is the student's live
found-the-move rate, opened at their rating band (piece 3).

- **PV depth to narrate.** The first 6–8 plies are worth describing as
  intention. Past that both sides are being credited with a future neither has
  committed to.
- **Window and hysteresis for the dial.** How many recent moves the found/missed
  tally reads, and how much movement it takes to change register. Both want
  measuring against real games rather than picking — but neither blocks the
  build, since a fixed window ships and then gets tuned.

## Owed before this starts

1. **Prod verification** of the position tier firing in a live game, read from
   the app's own events. Everything measured since this morning is offline.
2. **The endgame collapse** — "Your strongest reply here is a3" six times in
   one game. That is the current fallback failing loudly, and this build
   replaces exactly that fallback, so fixing it and building this are the same
   work approached from two ends.
3. **The 50.4% anchor defect.** `openingReachesPosition` exists and is tested;
   it is not yet wired into selection. Everything downstream inherits the rot
   until it is.
