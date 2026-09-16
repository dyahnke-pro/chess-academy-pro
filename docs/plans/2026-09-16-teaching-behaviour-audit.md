# What the coach DOES vs what TEACHING is — an evidence audit

David 2026-09-16: *"Calling out pins and forks isn't teaching. Future moves, how
to think, threat identification, that is teaching. I want you to identify other
teaching behaviors related to chess and tell me which ones my app is missing."*

He is right, and the codebase says so plainly. Below is every teaching behaviour
a strong coach uses, each checked against the code — not against memory.

## The one-line verdict

**The app is excellent at DESCRIBING and DIAGNOSING, good at FORESEEING, and
close to silent on METHOD and ELICITATION.** It tells the student what is on the
board and what they did wrong, with real rigour. It rarely teaches them *how to
think*, and — since the Learn cards were removed — it almost never makes them do
the thinking before handing over the answer.

Crucially, the teaching that DOES exist is **stranded on separate surfaces**
(tactics drills, analysis practice) while the narration that runs during review,
Learn and Play is descriptive. The student meets the method only if they go
looking for it.

## The seven modes, with evidence

### 1. DESCRIBE — what is on the board. **STRONG (arguably over-served)**
~20 of the 33 facet tags in `reviewFacetRank.FacetTag` are description: `does`,
`delta`, `loose`, `count`, `royal`, `trapped`, `king`, `rook7`, `passer`,
`badbishop`, `worst`, `minority`, `complex`, `structure`, `verdict`, `opening`,
`opp-dev`, `eval`, `move`, `tactic`. This is the layer David reacted to.

### 2. EXPLAIN — why a move is good or bad. **STRONG**
`computePlyFacts` why-clauses, `explainBestMoveGrounded`, and the
refuted-alternative beat (`refutedAlternative.ts`, N3) which names what humans
actually play here and what it costs.

### 3. DIAGNOSE — the principle you broke. **STRONG**
33 named fundamentals (`principleAttribution.FUNDAMENTAL_IDS`) across opening /
middlegame / endgame, attributed with board evidence and spoken by
`principleVoice`, then filed to a weakness tag and drilled.
⚠️ Note what they all are: **error categories**. Every one is "you did X wrong".
That is post-mortem teaching — one mode, not the whole of teaching.

### 4. FORESEE — what happens next. **GOOD**
The projection passes play lines out move by move (`augmentWithProjections`,
`computePvLine`), the deep-threat passes read 3–4 moves ahead for both sides,
and the exchange ledger states the net of a sequence.
⚠️ Framed as *"here is what happens"*, never as *"here is how you would have
seen it"* — foresight delivered as a result, not as a skill.

### 5. METHOD — how to think. **WEAK. The biggest gap.**
Total in-flow method teaching found in the whole coach:
- `playCommentary.ts:487` — one line: *"calculate the opponent's most forcing
  reply BEFORE trusting a tempting move."*
- `weaknessAnalyzer.ts:220` — a blunder-check habit, but in a weakness REPORT,
  not during a game.
- `AnalysisPracticePage.tsx:312` — the real method ("name your candidate moves
  first, calculate to the quiet end, then evaluate the endpoint") exists as
  **static UI copy on one drill page**. The coach never says it.

### 6. ELICIT — make the student think first. **WEAK in narration**
Elicitation lives only on separate surfaces: find-the-shot, the turning-point
card, position reading (`positionReadingService` — computed answer keys), the six
calculation drills (`calculationDrillService`), Guess the Move.
⚠️ Inside Learn it was **deliberately removed** (2026-08-05, the mid-game cards)
and never replaced with a non-blocking equivalent. The honesty contract — never
hand over the answer before the student commits — now applies to almost nothing
in the narration path.

### 7. CONSOLIDATE — make it stick. **PARTIAL**
Mistakes become drillable puzzles (`mistakePuzzleService`), and SRS exists —
but `FlashcardRecord` is keyed by `openingId`/`questionFen`/`answerMove`, so
**spaced retrieval covers opening MOVES, not IDEAS**. There is no concept-level
card, and no transfer beat ("this is the same idea as the game you played on
Tuesday") anywhere in the narration.

## What is missing, ranked by teaching value per unit of work

1. **Say when to slow down.** The app ALREADY computes criticality
   (`criticalityScan`, rating-scaled) and `coachDecider` now returns the tier.
   It never tells the student *"this was a moment to spend three minutes."*
   Highest value, lowest cost — the computer exists, the sentence does not.
2. **Teach threat identification as a habit, not an announcement.** Today the
   coach states the threat. A method beat asks the question first and then
   confirms, turning a fact into a routine.
3. **Candidate-move discipline in flow.** Name the two or three moves worth
   considering here and why the choice went the way it did. The data exists
   (`topLines`); only the framing is missing.
4. **Foresight as a skill.** When a line is played out, say what the *signal*
   was that it was there — the loose piece, the exposed king, the overworked
   defender — so the student can find the next one.
5. **Concept-level spaced retrieval.** Extend SRS beyond opening moves to the
   fundamentals the student keeps breaking.
6. **Transfer.** "You met this same idea two games ago." The weakness spine
   already tracks recurrence; nothing speaks it at the moment it recurs.
7. **Non-blocking elicitation in review.** A one-tap "what do you think they are
   threatening?" before the reveal, replacing what was removed from Learn
   without reintroducing an interruption.
8. **Plan versus plan.** The app names each side's plan; it rarely says whose is
   faster, which is the actual middlegame question.

## The structural recommendation

Method and elicitation are not new facts — they are a **register** applied to
facts the app already computes. They belong in the one deciding computer
(`coachDecider`) as a fact KIND, so the same decision that ranks a tactic can
rank "this was a slow-down moment" against it, on every surface at once.
