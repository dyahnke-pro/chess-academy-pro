# His teaching structures vs what we compute — a corpus study

David 2026-09-17: *"Read through the corpus and identify the teaching
structures/components that Naroditsky uses in his videos, then check against
what we compute. Notate the differences for me."*

## Method

Source: `data/video-narration-voiced/*.json` — **430 videos, 22,587 beats,
14,173 of them with spoken prose.** These are our own rewrites (reference-only,
never quoted), so the WORDS are ours and the STRUCTURE is his.

I read whole videos end to end first — the structure lives in the sequence, and
sampling scattered beats destroys it — then derived a taxonomy from what I read,
built a detector per structure, and counted across all 14,173. Two numbers per
structure: share of beats, and **share of videos that use it at all**, which is
the honest one (a structure used once per video is still a structure).

Every "we compute this" claim below is a grep with a file:line, not a memory.

## The 22 structures, by how often a video reaches for one

| # | structure | videos | beats | we compute it? |
|---|---|---|---|---|
| 1 | **NAME** the concept / opening / pattern | 74.6% | 5.5% | ✅ `detectOpening`, `tacticInvariant`, `matePatterns` |
| 2 | **TEMPT** — the natural-looking wrong move | 55.2% | 3.1% | 🟡 `refutedAlternative.ts` — teach only, first 12 plies |
| 3 | **PLAN** — where you are aiming | 50.8% | 2.8% | ✅ `boardPlan.structurePlan`, "The plan from here is…" |
| 4 | **ROLE** — piece roles, improve the worst piece | 48.5% | 2.2% | ✅ `[worst]`, `[badbishop]` facets |
| 5 | **ORDER** — move-order precision / too early | 48.0% | 2.3% | 🟡 `prematureBreakWhy`, `theoryDeparture` |
| 6 | **ELICIT** — asks the student before answering | 45.7% | 4.2% | 🔴 stranded on drill surfaces, absent from narration |
| 7 | **PURPOSE** — what the move is FOR | 42.7% | 2.0% | ✅ `explainBestMoveGrounded`, `groundedMoveWhy` |
| 8 | **FREQ** — what people actually play here | 40.3% | 2.7% | 🟡 masters DB — opening phase only |
| 9 | **RECALL** — "don't forget", the refrain | 39.9% | 2.0% | 🟡 `standingRefrains.ts` (2026-09-17), review verdicts only |
| 10 | **COST** — the trade-off you are accepting | 36.4% | 1.9% | 🟡 `exchangeLedger`, `[delta]` |
| 11 | **HABIT** — thinking-habit warning | 36.1% | 1.4% | 🟡 `methodBeat.ts` — 4 habits |
| 12 | **PRACT** — practical vs objective truth | 33.6% | 1.7% | 🔴 only in the pro-rep seam |
| 13 | **EPIST** — admits the limit of knowledge | 31.5% | 2.2% | 🔴 nothing |
| 14 | **EVALHON** — honest evaluation label | 28.9% | 1.2% | 🟡 `verdictBand` 5 bands |
| 15 | **PROPHY** — their idea, and preventing it | 28.7% | 1.2% | ✅ `opponentIntent`, `computeMustDefend` |
| 16 | **MOMENT** — flags the critical moment | 24.5% | 0.9% | ✅ `reviewMoveBriefing.ts:322` + `methodBeat` slow-down |
| 17 | **FEAR** — dissolves a fear | 21.2% | 1.0% | 🔴 hand-authored lessons only, no computer |
| 18 | **TRANS** — analogy to another idea | 20.7% | 0.8% | 🔴 own-game transfer only (`WeaknessProvenance`) |
| 19 | **RATING** — calibrates out loud to the level | 17.9% | 0.7% | 🔴 we SCALE by rating, we never SAY it |
| 20 | **RULE** — a reusable decision rule | 12.8% | 0.5% | 🔴 33 fundamentals, all error categories |
| 21 | **ALOUD** — shows the calculation, incl. rejects | 11.2% | 0.4% | 🟡 `thinkAloud.ts` — Learn only, gap-throttled |
| 22 | **COND** — when the pattern does NOT apply | 3.7% | 0.1% | 🟡 `tacticInvariant` is the nearest thing |

## The differences that matter, ranked

### 1. PRACTICAL vs OBJECTIVE — the biggest single gap (34% of videos, we have nothing)
He constantly separates *what the engine says* from *what you should do*:

> "is the move c4 a mistake? No, I don't think you can consider it a mistake — a
> million grandmasters have played it over the board. The point is that if a GM
> plays it, they know exactly how to…"

> "This is still equal, but White has to play like an engine; practically Black
> is doing great."

> "when you sense the opponent is steering into a line they know and you don't,
> you can sidestep the sharpest theory with a quiet move, accepting a slightly
> worse position in exchange for not being blown off the board."

We speak ONE number, the engine's. The seam exists but only in the pro-rep path
(`openingCourse.ts:38-44` — "the PRACTICAL line the player actually played…
objectively dubious"; `sublineLesson.ts:138` "TEACH BOTH"). Nothing in review,
Learn, Play or chat can say "objectively equal, practically much easier to
play." **This is computable**: difficulty-to-play is the share of moves inside
the PV window that hold the eval, which we already have from `computePvLine` —
a position where one move holds and twelve lose is hard, whatever the bar says.

### 2. ELICIT — he asks first, we answer first (46% of videos)
His questions are the teaching:

> "What square does this weaken, and where should your bishop go now?"
> "Do you know White's most challenging move — the one giving a small but
> nagging edge?"

We compute every answer and hand it over. Elicitation lives only on drill
surfaces (`mistakePuzzleService.ts:121`, `mistakeNarration.ts:249`,
`socraticNudgeService.ts`), **and `socraticNudgeService` has ZERO consumers** —
a whole elicitation computer, written, never wired. This confirms the
2026-09-16 teaching-behaviour audit rather than restating it.

### 3. THE WEAKENING QUESTION — his single most reusable chain, and we have every piece of it
> "This g5 lunge shows up constantly at this level — it's meant to intimidate.
> But the right question is: what did it weaken? Immediately the f5 square
> becomes a permanent hole. So the plan writes itself — steer a knight toward
> g3 or e3."

Question → observation → plan, in one beat. We compute weak squares, we compute
outposts, we compute knight routes. We never run them as a *method*, and we
never ask the question. Highest value per unit of work in this whole document.

### 4. FEAR — 21% of videos, zero computers
> "as scary as it looks, it's really no big deal"
> "don't fear one-move threats"
> "The pin with Bb4 that's coming looks scary to some of you."

He names the emotion, then dissolves it with a concrete line. We have this
*only* as hand-authored prose in `src/data/lessons/*.ts`. It is computable:
a move that LOOKS forcing (check, capture, a pin on the queen) but costs the
opponent eval is exactly "scary and harmless", and `computePvLine` already
knows both halves.

### 5. RATING — we scale by it silently, he says it out loud (18%)
> "At lower levels it isn't scary… most players under 2200 don't know"
> "players at this level don't always factor in squares"

Our rating scaling is invisible to the student. Saying it is free and it makes
the advice land: *why* this move is fine for you and not for a GM.

### 6. RULE — his fundamentals point FORWARD, ours point BACKWARD (13%)
> "whenever pawns are pushed, others are often left undefended, so always scan
> for loose pawns as well as weak squares"
> "Use the best-case-scenario test: assume White hands you everything…"
> "Any time your opponent is this underdeveloped, ideas that win a rook are
> prevalent and should always be considered."

Our 33 `FUNDAMENTAL_IDS` (`principleAttribution.ts:32`) are all error
categories — `same-piece-twice`, `tempo-handed`, `greedy-pawn-grab`. Every one
says *you did X wrong*. His are triggers-and-actions the student can run next
game. Same knowledge, opposite tense.

### 7. EPIST — he says when he does not know (32%)
> "I've never analyzed f3 — maybe a knight to e4 is a good reply."
> "There's opening ground I don't know, and you can't know everything."

We never do. There is a G0-honest version: when the engine's eval is unstable
across depths, or the position is off book with no corpus note, the honest line
is "this is murky" — not silence, and not false confidence.

### 8. COND — rare (3.7%) but the sharpest teaching in the corpus
> "the same f7 trick does NOT work here, because Black's bishop is still
> undeveloped, which paradoxically favours Black."

Teaching a pattern WITH its precondition is what stops a student applying it
blindly. `tacticInvariant` is the nearest thing we have and it is about what
makes a fork a fork, not about when the trick fails.

## What this study CORRECTS in the 2026-09-16 teaching-behaviour audit

- **"Say when to slow down" — now DONE**, not missing. `reviewMoveBriefing.ts:322`
  speaks "This was the moment to slow down" / "This is the critical moment",
  and `methodBeat` carries the slow-down habit. Close that item.
- **"Candidate-move discipline" — now DONE.** `methodBeat.ts:287` says it.
- **"Threat identification as a habit" — DONE** (`opponent-threat` habit).
- **"Transfer"** — half done. Own-game transfer has a shape
  (`WeaknessProvenance`, weaknessSpine.ts:64). Transfer across IDEAS
  ("Scandinavian-style envelope", "think of it like the Italian") does not.
- Its verdict "close to silent on METHOD" is **no longer true** — `methodBeat`
  landed four habits. Its verdict on ELICIT still is.

## Two dead computers found while checking

- `socraticNudgeService.ts` — zero consumers. It IS the elicitation engine the
  gap above asks for.
- `planByPly` / `planProgressText` — computed on every selection, read by
  nobody (logged separately in the removal-candidate list).

Neither is a delete without David: per CLAUDE.md, grep every consumer and
confirm graceful degradation first. Both look like WIRE candidates, not
removals.
