# The Unified Coach — vision, blueprint, and phased build plan

**Read this before starting ANY coach build.** The architecture reference (how
the app is wired today) is `docs/coach-system-map.md`. This file is the TARGET
we build toward and the order we build it in.

**Locked with David 2026-09-07 → 2026-09-08.** His words drive it; the
engineering improvements on top are called out in §7 and the decisions log.

---

## 1. The vision (David's words)

> "Moves do not exist in isolation. Fact A caused fact B caused fact C — THIS IS
> CHESS! If we cannot link them together then we are not doing it right."

> "Tie all of this together to form a more well-rounded and unified coach!
> Imagine yourself at the controls of the computer — which wires and tools would
> you bring together to teach students? All tools at the fingertips of the coach,
> and it decides which ones are important for the user to hear."

> "The coach decides. Meaning the SPINE decides. NOT the LLM."

> "Does it hit a hole THIS student keeps falling in — YES!"

> "DO NOT RESTRICT TO 1-2! The coach needs to decide what is important per user.
> Some users need more information in a certain position."

> "The more advanced player should get a DEEPER calculation. Not a shorter one."

> "This will unlock custom lessons — when a user asks 'what should I learn?' or
> 'teach me something,' it should aggregate their errors and develop a custom
> coaching session. The coach also has takeback, reset, set up any position —
> build this in too."

The coach is not a bag of independent facts read off a ranked list. It is ONE
brain that (a) sees every tool it has, (b) knows THIS student's holes, (c)
decides — in CODE — what to say, how much, and how deep, and (d) can act on the
board with its own hands, then (e) learns from what happened.

---

## 2. The four-layer blueprint

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1 — CANDIDATE POOL  (everything the coach COULD say about this moment)  │
│   two kinds, both are "the coach's material" (David: "what it teaches from is  │
│   also the computer voice"):                                                   │
│   • COMPUTED-FROM-BOARD facts — positionFacts, tacticsDetector, causalChain,   │
│     threatOut+PV, criticalityScan, theoryDeparture, structurePlan, deliberation│
│   • RETRIEVED-AND-BOARD-GATED teaching — corpus notes (teachingNoteForBoard,   │
│     exact-position), book concepts, the opening's ideas.                       │
│   Every candidate is board-proven (G0/G3) or it does not enter the pool.       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2 — THE SPINE SELECTOR  (CODE decides — G0. never the LLM)              │
│   inputs:  the candidate pool  ×  the STUDENT MODEL  ×  position criticality   │
│            ×  rating  ×  surface/register                                      │
│   decides: WHICH candidates speak, in WHAT ORDER, at WHAT DEPTH, and HOW MUCH  │
│            (an adaptive budget — NOT a 1-2 cap).                               │
│   the load-bearing new input is STUDENT WEAKNESSES — a candidate that hits a   │
│   hole this student keeps falling in is boosted and gets MORE words/depth.     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3 — ACTUATORS  (deliver it, in the surface's register)                  │
│   • VOICE     → voiceFacts (phrasing chokepoint; preferRaw bypasses the LLM)   │
│   • HANDS     → board-control tools (takeback/reset/setBoardPosition/playMove/ │
│                 startWalkthrough) invoked BY THE SPINE, not only by the LLM     │
│   • EYES      → lead-the-eye arrows + key-square highlights per named square    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4 — THE LOOP  (the coach learns from what happened)                     │
│   what the student did → weakness spine (mistakes, misconceptions, book-      │
│   departures, repeated holes). what the coach TAUGHT → a taught-concept ledger │
│   so it can tell "I covered this; did it stick?" Both feed Layer 2 next time,  │
│   and the CAPSTONE: aggregate → a custom coaching session on demand.           │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Maps onto today's code:**

| Layer | Built today | The gap |
|---|---|---|
| 1 Pool | fact-computers + corpus retrieval all exist (§4 of the map) | none structural — they're just not gathered into one pool the selector sees |
| 2 Selector | `narrationImportance` + `positionFacts` + `criticalityScan` (position + rating) | **does not consult the student model.** `PositionFactsInput` (positionFacts.ts:32) has no `studentWeaknesses`. This is Phase 1. |
| 3 Voice | `voiceFacts` (coachApi.ts:2487) | fine |
| 3 Hands | tools exist (`src/coach/tools/cerebrum/`) | only the LLM calls them; the spine can't |
| 3 Eyes | `narrationArrows`, causalChain arrows/highlights | fine; extend per new fact |
| 4 Loop | `getUnifiedWeaknessProfile` (weaknessSpine.ts:538), `coachCurriculumService`, `theoryDeparture` (per-game) | weaknesses don't reach Layer 2; no taught-concept ledger; no book-departure AGGREGATE; no custom-session builder |

---

## 3. Locked principles (every phase obeys these)

1. **G0 — the SPINE decides, never the LLM.** All of Layer 2 is deterministic
   code. The LLM only phrases the already-selected, already-ordered facts.
2. **G3 — board truth only.** Every candidate is chess.js/Stockfish/DB proven.
   No invented moves, lines, or "why." Never hallucinate.
3. **Adaptive budget, NOT a cap.** The selector decides how much to say per
   student × position. Some moments warrant a lot; some warrant silence. A
   fixed 1-2 sentence cap is BANNED (that's David's explicit correction). The
   only hard budget is the verbosity setting (G5) which the user themself chose.
4. **Deeper for stronger, not shorter.** Calculation DEPTH scales UP with rating
   (1400 → 3-4 ply, 1800 → 4-6 ply). What scales DOWN with strength is
   HAND-HOLDING (the remedial "here's what a fork is"), never the line length.
5. **Withhold the student's OWN move-to-find; spell the opponent's threat out.**
   The find-the-move honesty contract applies to what the STUDENT should
   calculate. A threat AGAINST the student is spelled out fully for everyone.
6. **Empty > generic > invented.** Silence when nothing board-proven warrants
   voice. A wrong link/claim is worse than a flat list.
7. **Per-surface register, one brain.** Review retrospective; Learn/Watch
   present-tense; Play silent-until-asked. Perspective you/they, never we.

---

## 4. What is already SHIPPED (do not rebuild)

- **The causal-chain engine** — `causalChain.ts` + `causalChainVoice.ts`, wired
  into review, played/missed/allowed, 2 patterns, arrows/highlights,
  `fundamentalId` tags, validated on David's 930 real games, 226-check audit.
  Full detail: `docs/plans/2026-09-07-causal-chain-engine.md`. (PR #931 draft.)
- **The board-control hands** — the cerebrum tools exist and are tested.
- **The weakness spine** — `getUnifiedWeaknessProfile` is the canonical ranked
  query; it just isn't wired into live narration yet.
- **Per-game book departure** — `theoryDeparture.ts` computes it cleanly.
- **The curriculum sequencer** — `coachCurriculumService` orders weaknesses.

---

## 5. The phased plan (each phase shippable, each with a "note comes OUT" test)

### Phase 1 — WIRE THE STUDENT MODEL INTO THE SELECTOR  ← the keystone
The one wire that turns a fact-lister into a coach that hits THIS student's holes.
- Add `studentWeaknesses?: WeaknessSignal[]` to `PositionFactsInput`
  (positionFacts.ts:32). A `WeaknessSignal` is a lightweight, precomputed shape
  (tag, openCount, severity) derived from `getUnifiedWeaknessProfile` ONCE per
  game/session (NOT per ply — latency, §7).
- In `computeImportance` / the ranker: when a candidate fact's concept/tag
  matches a top student weakness, BOOST its rank and RAISE its depth/word budget
  (principle 3 + 4). A fork-blindness student gets the fork spelled out longer;
  a student who never has that hole gets it terse or silent.
- Surface-aware budget: same selection, register per surface (§7 principle).
- Test: a fixture student with "hangs pieces to forks" gets the fork candidate
  boosted to the lead with more depth than a default student, on the same board.

### Phase 2 — THREAT DEPTH REWORK
- KILL the remedial explainer (`describeThreatRecognition`, groundedAnswer.ts
  ~4973) from the default path. It's obvious, remedial, unwanted.
- Rating-scale threat depth via engine PV (`computePvLine`): 1400 → 3-4 ply,
  1800 → 4-6 ply, minimum 1 (David's numbers). Never hallucinate — cap depth at
  the reliable PV window.
- SPELL THE LINE OUT for everyone (opponent threat = not the student's
  find-the-move; principle 5). Frame forced vs best-but-not-forced honestly
  ("not forced, but their strongest try is…"). Best moves that lead to a losing
  position are valid content (David #4).
- Attach causal-chain logic to threats where a chain proves the WHY of the
  threat ("their queen on f3 blocks the knight, so … threatens to trap it").
- Test: threat narration at 1400 vs 1800 differs in depth; no remedial sentence;
  the spelled line is board-accurate every ply (extend the causal-chain audit).

### Phase 3 — BOOK-DEPARTURE WEAKNESS SIGNAL
- Aggregate `theoryDeparture` across a user's games → a per-user stat: do they
  leave book too early/often, and where (which opening, which ply)?
- Cost gate: only a departure that MEASURABLY hurt (eval drop after leaving)
  counts as a weakness — leaving book into a fine sideline is not a hole.
- New weakness bucket type folded into `getUnifiedWeaknessProfile` (so Phase 1
  automatically teaches it). The coach then explains the THEORY behind the
  right opening moves and why, in place of the repeated mistake.
- Test: a user with repeated costly early departures surfaces a book-departure
  weakness; a disciplined user does not.

### Phase 4 — SPINE-DRIVEN HANDS (the actuator wire)
- Let the SPINE invoke board-control tools deterministically (not only the LLM):
  offer a takeback after a proven blunder in Learn; set up a position to
  demonstrate a refutation; reset to a key FEN to drill a hole. Every position
  it sets up is board-legal and real (G3).
- Reuse the existing cerebrum tools; add a thin spine-side trigger layer with
  its own gates (when is a takeback OFFERED vs forced — never on Play).
- Test: the spine offers a takeback on a fixture blunder in Learn and stays
  hands-off on Play.

### Phase 5 — CUSTOM COACHING SESSION (the capstone)
- Entry points: "teach me something" / "what should I learn?" → aggregate the
  student's top weaknesses (spine + book-departures + repeated holes) via
  `coachCurriculumService` → generate a WLPP-shaped session built from REAL
  positions from the student's OWN games (G3 — their boards, not invented).
- The session teaches the concept, drills it (feeds My-Mistakes / SRS), and the
  taught-concept ledger (Layer 4) marks it covered so the loop can check if it
  stuck.
- Test: a fixture student with 3 known holes gets a 3-part session, each part
  anchored to a real position from their games, each feeding the drill queue.

### Phase 6 — CLOSE THE LOOP (taught-concept ledger)
- Record what the coach TAUGHT (concept, position, when). Next time the same
  hole appears, the selector knows "covered on <date>; repeated → escalate" vs
  "new → introduce." This is what makes "a hole THIS student keeps falling in"
  a real signal over time, not just a per-game count.
- Test: a concept taught then repeated escalates its treatment.

Sequencing logic: P1 is the keystone (nothing else personalizes without it). P2
is the highest-visibility slice and rides P1's rating/depth machinery. P3 adds a
new weakness the P1 wire then teaches for free. P4/P5/P6 are the "unified" payoff
and depend on P1–P3 being in place.

---

## 6. Is anything missing? (open questions that need a DECISION, not a guess)

These are the hard, underspecified parts of the vision — flagged now so we
decide them before building, not mid-build. (This is me stress-testing the idea,
per the no-yes-man rule.)

1. **The budget FUNCTION is undefined.** "Adaptive, not capped" is the
   principle, but the selector needs a concrete rule for HOW MANY facts / how
   many words a moment gets. Proposal: budget = f(criticality, weakness-match
   strength, phase, register) with NO upper cap except the user's verbosity
   setting — but the exact shape (e.g. "criticality band → base budget, ×boost
   per matched weakness") needs your sign-off. **Decision needed.**
2. **Conflict/ordering when many facts fire.** On one move a causal chain + a
   threat + a weakness-match + a book-departure can ALL fire. What leads?
   Proposal: safety/threat first (must-defend), then the weakness-matched
   teaching, then the causal "why," then positional. **Confirm the priority.**
3. **The feedback loop needs a taught-concept LEDGER (Phase 6) to truly know a
   "repeated hole."** Today "repeated" = a per-game count. Real "keeps falling
   in" needs memory of what was TAUGHT and whether it recurred after. Is that in
   scope now, or v2? **Decision needed.**
4. **Latency.** Corpus lookup is a fast sync index (90% of speech). Weakness
   profile is async Dexie; PV is the engine (slow). The plan precomputes the
   weakness profile once per game/session, not per ply — confirm that's
   acceptable (a mid-game newly-created weakness won't influence narration until
   the next game). **Confirm.**
5. **Book-departure "too early" threshold is rating-relative.** Leaving book at
   move 6 is fine for a 2000, a hole for an 800. Reuse `ratingBandFor` — but the
   "costly" eval-drop threshold per band needs a number. **Decision needed.**
6. **Custom-session SIZE + entry UX.** How long is a "custom session" (3 holes?
   adaptive?), and where does "teach me something" live (chat intent only, or a
   button on /coach/home)? **Decision needed.**
7. **Spine-driven takeback POLICY.** When does the coach OFFER a takeback vs just
   narrate the mistake? Never on Play (locked). In Learn — every proven blunder,
   or only weakness-matched ones? **Decision needed.**

None of these block writing code once decided; all of them would cause rework if
guessed. Everything ELSE from the session is captured in §1–§5.

---

## 7. Improvements made on the original idea (the no-yes-man record)

- **Eval-bar-movement importance filter → rejected, replaced.** "Anything that
  moves the eval bar is important" fails four ways (sharp-but-flat, decided
  blow-out, standing threat with flat bar, quiet lesson). Replaced with
  rating-scaled decision-leverage + realized-swing + must-defend + teaching-beat,
  all under a contested gate (silent in a decided game). (Already locked in
  `CLAUDE.md`.)
- **"Advanced = shorter" → corrected to "advanced = DEEPER."** Depth scales UP
  with strength; only hand-holding scales down. This inverted my first instinct
  and is now principle 4.
- **The candidate pool is BOTH computed facts AND retrieved notes** — your point
  that "what it teaches from is also the computer voice." Layer 1 treats them as
  one pool so the selector ranks a corpus note against a computed fact evenly.
- **The loop needs a taught-concept ledger, not just a mistake count** — flagged
  as the thing that makes "a hole THIS student keeps falling in" real over time
  (Phase 6 / open question 3).
- **Precompute-per-game weakness profile** — so personalization doesn't put an
  async Dexie read on the per-ply hot path (open question 4).

---

## 8. Decisions log

- 2026-09-07 — causal chain: rating-scaled depth; unprovable link = silent;
  all surfaces, shared engine, per-surface register. SHIPPED (PR #931 draft).
- 2026-09-08 — unified-coach vision captured. SPINE decides (G0), adaptive
  budget (no cap), deeper-for-stronger, board-truth. Build order P1→P6, P1
  (weakness→selector) is the keystone. **Open questions in §6 to be decided
  with David before P1 code.**

## 9. Next-session pickup

1. Get §6 decisions from David (esp. #1 budget function, #2 ordering).
2. Start Phase 1: add `studentWeaknesses` to `PositionFactsInput`
   (positionFacts.ts:32), precompute from `getUnifiedWeaknessProfile` once per
   game, boost/re-rank matched candidates in `computeImportance`. Ship with the
   "boosted fixture" test. Then Phase 2 (threat depth) as the first visible slice.
3. Every wire gets a "note comes OUT" test (David 2026-08-07). Keep it G0/G3.
