# Danya full review — every source, what the coach still lacks (2026-09-29)

David: *"Review all of Danya's information. Not just corpus notes. But distilled videos."* Plan only.

## What was read
- **All 430 distilled videos** (`data/video-narration-voiced/`, 14k spoken beats), end to end, 8 readers in parallel.
- **Every other Danya source**: voice notes (8 md), manifest (607 videos), deep builds (27), trees (36), trap candidates (10 files, ~992 patterns), `danya-teachings.json` (122), `danya-floating.json` (9,928), `danya-play-db.json` (31,842 FENs), voiced corpus (7,477 / 205 walkthroughs / 46 matchups), pro-rep lessons (25 files, 739 beats), pro-game-references (530 of his games).

Builds on `2026-09-17-corpus-teaching-structures.md` (22 structures), `2026-09-24-speedrun-target.md` (L1–L11, H1–H14) and WO-DANYA-01 in PLAN.md.

## How a video is built (8/8 readers agree)
1. Name the opening + place it (popular / what your level plays).
2. State ONE thesis early — a target square, a weak pawn, a break ("everything aims at d4").
3. Middlegame: every beat points back at the thesis; ~1 idea per beat, routine plies bare or silent.
4. Critical moment: the monologue — candidates, rejected moves with a short refuting line, the choice.
5. Conversion: a NAMED method (develop first, trade, passer, king, watch stalemate).
6. **Rewind (60–70% of videos):** jump back to the 2–5 decision points, branch "if they X → you Y", prune the tree ("no independent value"), then takeaways.
7. Callbacks: "that's why the knight went to c4" — causal, not repeated phrases.

Density is the lesson: silence on routine plies, monologue where it turns. Our Learn piles 5–8 facts on one move — that is the biggest remaining gap in FEEL.

## Corrections to the 09-17 study
- **ELICIT is overrated there.** Mostly rhetorical, answered in the same breath. Do NOT build question cards. Confirms "Learn names the move WITH its reason".
- **COND is really RULE → EXCEPTION ("circumstances changed")** — his dominant pattern-teaching move, ~all parts, 8–15 videos each. Not rare.
- **HABIT is too coarse** — splits into trigger→scan, autopilot guard, safety precheck, opponent-intent read. All computable.
- **TRANS is mostly STRUCTURE transfer** ("a Pirc a tempo up", "reversed Dragon") — computable, not metaphor.
- **RATING aloud is mostly repertoire advice / opponent's rating**, not the student's level.
- Mega-beats (300–1,300 words) and ~25 bare move-log videos are DISTILLATION ARTIFACTS — exclude from any parity measurement.

## New behaviours (beyond the 22), ranked by frequency × computability
| # | Behaviour | Videos (~) | Computable from |
|---|---|---|---|
| 1 | **RULE→EXCEPTION / anti-dogma / re-eval** — principle said, then broken for a concrete reason; a move rejected earlier is now right | 60+ | principle fires (`principleAttribution`) AND engine top line violates it; rejected candidate re-enters top-N |
| 2 | **WHAT-CHANGED / drawback read** — after any pawn move or trade: which square vacated, what's loose, what their move gave up | 40+ | attack-map diff before/after, both seats |
| 3 | **MULTI-JOB** — "one move, three jobs" | 45+ | count distinct computed functions of the move (defends / attacks / develops / prevents / unpins) |
| 4 | **CONVERSION protocol + material threshold** — method chosen by margin; diminishing returns; stalemate watch | 60+ | eval + material + king exposure → method table (`conversionMethod` partial) |
| 5 | **STAKES / equal choice** — "doesn't matter, 10 seconds, taste" | 30+ | MultiPV gap < x cp (inverse of MOMENT) |
| 6 | **REWIND / branch drill / takeaways** | 200+ | criticality + refutedAlternative + explorer freq × engine for tree pruning |
| 7 | **CALLBACK payoff** — "that's why…" | 60+ | causalChain / planArc: a later fact whose cause is an earlier student move |
| 8 | **TRIGGER→SCAN habits** — f3 pushed → look for X; K+Q a knight apart → fork square; before recapture check zwischenzug; before grabbing list its escapes | 45+ | detectors already exist; the HABIT framing + pre-check does not |
| 9 | **LOOSE pieces "type two"** listed before calculating | 30+ | `[loose]` exists; the method framing doesn't |
| 10 | **TEST / litmus / contrast** — best-case test, "would you play it if the threat vanished", two near-identical positions | 25+ | null-move probe; engine on a one-change FEN |
| 11 | **STRUCTURE transfer / opening map** | 45+ | colour-flip the FEN and look it up in `openings-lichess.json` ("reversed X, a tempo up"); pawn-structure hash across openings |
| 12 | **OPPONENT'S BEST / intent read** — the right plan for the other side | 25+ | engine best for the non-student side; null-move threat |
| 13 | **TEMP vs PERM assets; keep the tension; induce** | ~15 | development lead vs structure classifier; capture-release eval cost |
| 14 | **ROUTE by destination** — find the square, then the path | ~10 | outposts + knight shortest path |
| 15 | **KING-HUNT method** — map escape squares, quiet restricting move beats checks | ~5 | escape count; quiet move in PV beats checks |
| — | Authored only: lineage/history, imagery, opponent psychology, clock, study method, repertoire advice, self-error anecdotes | 10–20 each | chat / teach-X only; never synthesized ("fake modesty") |

## Under-used Danya data already in the repo
- **Trap candidates (~992 real opponent blunders with frequency + punish)** — only hand-authored trap lessons use them. → feed live gem detection on Learn/Play/review ("a common slip here").
- **`danya-play-db` (31,842 positions of his games)** — review only. → "his choice here, N games, X%" on Learn.
- **`danyaBehaviors.ts`** (25 behaviours weighted by corpus rate) — Learn only, absent from review. Header count stale.
- **Floating `teaches` text** — a catalogue of METHODS we have no computer for (wishlist, least-valuable piece, remove the cause). Mine it for the computer list; do not speak it (corpus-scope rule).
- **`danya-review-openings.json` is misnamed** — it is Lichess masters data. Rename.
- **Voiced corpus**: only 945/7,477 have `teaches`, zero concepts — can't feed concept weights.

## 🎯 SCOPE (David 2026-09-29): "I am interested in his in-game analysis. I want his narrations to match ours when free play in learn with coach." → corrected same day: "Our narrations to match his." His line is the answer key.

So: LEARN FREE PLAY ONLY, his IN-GAME beats only. Out of scope: the post-game rewind/branch drill (P5 below), review, the authored layer (history, psychology, repertoire advice). The phases below are re-ordered for that scope in "Learn free-play plan".

### Learn free-play plan
- **L0 Match instrument (the whole point).** Take his speedrun games from the voiced corpus (in-game plies only — cut each video at the first ply reset, which is where the rewind starts; drop the ~25 bare/defective videos). Replay each game through Learn free play with `hand-driver.mjs` (his moves on the student's seat, the opponent's dictated), MUTED. At every ply put HIS beat beside OURS and score: (a) did we speak where he spoke / stay quiet where he was quiet; (b) same idea — the structure detectors on both texts; (c) board-true. Output a per-structure match table + the worst plies. This turns "match his narrations" into a number every build must move.
- **L1 One idea per beat** (open item B, subsumption not a cap) — his in-game median is one idea; ours is 5–8.
- **L2 Rule→exception** (#1).
- **L3 What-changed / drawback read, both seats** (#2), incl. "what did their move weaken" and re-eval of a rejected move.
- **L4 Multi-job + stakes** (#3, #5).
- **L5 Callbacks to the thesis** (#7) on the live board, via `planArc` / causal chain.
- **L6 Conversion method with the choice** (#4).
- **L7 Habit split into `methodBeat`** (#8, #9).
- **L8 Opponent's best / intent as a two-step plan** (#12), structure transfer on the opening name (#11).
- **L9 His data on the live board**: `danya-play-db` "his move here", trap candidates as gems.
- Each phase: re-run L0, report the row it moved, hand-walk one of his games per the walk-then-fix standard.


## 🔗 MERGED COMPUTER LIST — every computer ever suggested for his in-game voice (2026-09-29)

Merges: 08-23 coverage matrix (#), 09-17 22 structures, 09-24 speedrun target (L/H), WO-DANYA-01 open items, and this review (R#). Status from a grep of `src/services`, not memory. Readers' raw reports: `docs/plans/danya-review-2026-09-29/`.

**BUILT** — pressureCount (#5/L2), findPassedPawns (#20/#33), conversionMethod (L10), planRace, planArc (plan arc), forkTrick, refutedAlternative (TEMPT/L7), methodBeat (4 habits), thinkAloud, standingRefrains, deliberation + nextMoveAdvice (ALOUD, move named where earned), pieceOptions ("couldn't X just move"), bluff, gems, opponentIntent, latentDanger (H3).

**PARTIAL — extend, don't rebuild**
| computer | sources | what's missing |
|---|---|---|
| conversion CHOICE | L8, R4 | picks a method but never says why this one; no stalemate watch / diminishing returns |
| moveTiming | H13, R13 | "switch to attack once pieces are in" |
| structure naming / transfer | #1, H1, R11 | "reversed Dragon, a tempo up" — colour-flip DB lookup |
| phaseVerdictLine | H8 | picks THE one reason, not a list |
| lookaheadPlan / route | #11, H11, R14 | destination first, then path |
| opponent intent as 2-step plan | L1, H14, R12 | "he wants X, then Y" |
| board delta | #28 L11 H12 R2 | squares only as prose; structural cost of THEIR move |
| methodBeat habits | L3, R8 | trigger→scan, autopilot guard, safety precheck |

**MISSING — new computers, ranked for Learn free play**
1. **Rule→exception** (#19, L4, COND, R1) — principle fires, engine disagrees, say why here.
2. **What changed / drawback read** (L11, H12, R2) — both seats, after every pawn move or trade.
3. **Multi-job** (#23, L6, R3) — count the move's jobs.
4. **Stakes / equal choice** (R5) — MultiPV gap small → "any of these, taste".
5. **Practical vs objective** (PRACT) — how many moves hold vs lose.
6. **Method beats** (H5 split the position, H6 three ways to meet check, H7 question the knee-jerk, FEAR).
7. **Wishlist + least-valuable piece** (H9, H10).
8. **Target switch / re-eval** (#24, R1) — rejected move now right.
9. **Tension / wasted move / punish the slow move** (#15, #16, #21, R13).
10. **Test / contrast** (R10) — best-case test, one-change comparison.
11. **King-hunt method** (R15).

**THE ONE THAT GATES THEM ALL:** L0 match instrument + L1 one idea per beat (B). Without L0 none of these can say it moved us closer to him.

## Phased plan (full, all surfaces — superseded for now by the scope above)
- **P0 Measure.** Parity instrument: the 22 detectors + the new ones above, run over coach output at the voiced corpus's exact positions, plus a density metric (ideas per beat, share of silent routine plies). Exclude the ~25 bare/defective videos. Every later phase must move its row.
- **P1 One idea per beat** (open item B — subsumption, never a cap).
- **P2 Rule→exception** computer (#1) — the biggest missing voice.
- **P3 What-changed / drawback read** (#2) incl. the weakening-question chain and re-eval of rejected moves.
- **P4 Multi-job + stakes** (#3, #5) — cheap, both from data we hold.
- **P5 Review shape**: rewind to decision points, branch drill with pruning, callbacks, closing takeaways (#6, #7); wire `danyaBehaviors` into review.
- **P6 Conversion protocol with the CHOICE and its reason** (#4).
- **P7 Habit split** (#8, #9) into `methodBeat`: trigger→scan, autopilot guard, safety precheck.
- **P8 Structure transfer** (#11) via colour-flipped DB lookup.
- **P9 Data wiring**: trap candidates → gems with frequency; play-db → Learn.
- **P10 Label lexicon**: ~15 of his reusable terms (type-two piece, one-move threat, biting on granite, glue move) as authored WORDING on computed triggers, rotated.
- Parked: practical-vs-objective, fear/bluff, test/contrast, king-hunt, route, temp/perm (all computable; after P0 says where the gap is biggest).

## Questions for David
1. ~~Surface first~~ — ANSWERED: Learn free play, in-game only.
2. L0 match: how many of his games per run (all ~300 in-game videos in a batch, or a fixed set of ~20 across ratings)?
3. P10: OK to reuse his coined terms (paraphrased labels, not his sentences)?
3. P5: should review get a real "rewind" pass after the walk, or fold the branches into the walk?
4. Authored layer (history, psychology, repertoire advice): chat only, or skip entirely?

---

# ✅ FINAL PLAN — after the two-round brainstorm (2026-09-29)

Team: two coach brains (studied his videos), skeptic, engineer, dialogue. Round 2 ran on a REAL prod tape (`danya-review-2026-09-29/tape-3UqPa5eV2e0-prod.md`: his 1870 game through Learn + 14 chat questions). All reports in `danya-review-2026-09-29/brainstorm-r1/`.

**David's two corrections drive it:** "he never stops talking" → the gap is SHAPE (one continuous thought), not volume. "The coach can never answer any question I ask" → chat is the biggest failure (tape 7/14; real App Store typed questions ~17% answered, 38% got the stock "can't verify").

**All five agree. The L2–L9 computer list is PARKED until 1–3 land** — more lanes today = more disconnected labels.

0. **Hours — bugs the tape caught:** `[VOICE:` markup leaking into chat + voice on a typo; "why not X" routed to the best-move lane (`questionIntents.ts:437`); "I'll answer with the Caro-Kann" then played e5; takeback stalled the coach.
1. **One door — `composeLearnTurn` (~1 wk, first).** Move Learn's ~15 lanes out of `CoachTeachPage` (today only one goes through `decide()`, the rest queue prose straight to the voice, `:8522`) into one pure service; every lane emits a structured fact into `decide()`. Makes 2 possible and lets his games run headless.
2. **One continuous thought per turn (~1–2 wk).** The BOARD picks the CURRENT plan (their concession / the structure, `planArc`'s dominant aim) — **NOT locked (David 2026-09-29: "Plans change as the board does… tactical to positional back to tactics")**: re-read every turn; when the position changes character (a tactic appears, material changes, the structure changes, a plan lands or dies) the plan SWITCHES and the switch is SAID ("the position has changed — now it's about…"), the way he does it. `decide()` leads with the fact that serves or threatens it; stakes break ties. Rendered as one chain: my aim → their aim → what I checked → why this move. Plus "first X, so that Y" for quiet setup moves, a closing verdict ("plan complete"), and **plan-aware grading** — a plan move that keeps its compensation is "deliberate", never "a mistake" (tape plies 29, 41).
3. **A coach you can talk to (~2 wk, parallel with 2).** The model only PARSES the question into a closed `BoardQuery` (kind: why / why-not / what-if / is-good / plan / meaning / eval / meta; subject: a SAN, "that" = last move by seat, a piece, the plan; chess.js-validated). Code answers. "Why not X?" plays X and the refutation on a scratch board, then snaps back — his exact habit. The answer echoes the question so a misparse shows. Can't resolve → ask ("the queen move or the pawn take?"), never the stock line. Chat reads the same state as 2, so "explain that last move" replays that move's reasoning and "what's the plan" names the thesis.
4. **Repeats that shrink (~1 wk).** Per concept, across games: full rule → "there it is again" → cue only → deliberate silence at the trigger, then speak to the result ("you found it"). The student's record picks the step, never the rating; silent repeats are the only honest green evidence.

**How we know it's working:** hand-label ~200 in-game plies from ~20 of his games by IDEA (not words) and score our `coach-decision` rows against them; for chat, re-ask the tape's 14 questions and the 86 real ones — target most answered, zero stock lines. Hand-walk one of his games after each phase.

**Must NOT:** add lanes before 1–2; gate on a word-overlap score; trim toward his distilled 0.6 sentences/ply; let the model answer chess (parse only).

**David's calls (2026-09-29): YES to both** — (a) the model parses the question only, never decides the chess; (b) the Learn board plays a line out, then snaps back.
