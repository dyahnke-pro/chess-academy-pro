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

### 3. Hints, not dictation
The locked honesty contract already says name the opportunity and withhold the
move. This extends it to plans:

- "The e5 square is the whole game here — if it falls, your position falls with it."
- "I want to attack d5. Watch what happens to it over the next few moves."
- NOT "play Nf3 now."

The student is led to the move; they are not handed it.

### 4. The concession beat — the part that is genuinely new
Compare the coach's ACTUAL move against the PV move for its side.

- Same move → nothing to say.
- Materially worse (a cp threshold, tuned) → the coach just made a real
  concession, and it knows what it gave up. It says so in the first person, in
  the voice built for exactly this (`opponentVoice.ts`), and points the student
  at what opened up: *"I don't rate your attack — I've taken a defender off e5
  to play on the other wing. That's your chance to take the square."*

This is the highest-value beat in the design and the only one with no
precedent in the app. It also makes the coach's weakness into a feature rather
than something to apologise for.

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

- **Concession threshold.** How much worse than the PV move counts as a
  concession worth announcing? Too low and the coach apologises every move; too
  high and it stays silent through real gifts. Needs measuring against real
  games, not picking.
- **PV depth to narrate.** The first 6–8 plies are worth describing as
  intention. Past that both sides are being credited with a future neither has
  committed to.
- **Rating adaptation.** A 1684 coach against a 900 student concedes constantly.
  Does every concession get announced, or only ones the student could plausibly
  punish?

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
