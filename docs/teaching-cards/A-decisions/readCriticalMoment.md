# readCriticalMoment — how many moves still hold

## A. Identity
- `src/services/criticalMoment.ts:185` `readCriticalMoment({topLines, moverColor, fen?, seat?})`; `criticalMomentSpeaks` :311; Learn register `criticalMomentStatement(read, ply, after)` :335; `opponentOnlyMoveStatement` :166; `criticalMomentHeld(read, playedSan)` :488; the found-move verdict `criticalMomentFound` :500 (its own registry read `boardComputers.ts:5197`); Review's `criticalMomentReveal` :453. Also `gameAnalysisService.ts` (the record), `positionFacts.ts`, `boardTurnAnswer.ts`.
- Registry `criticalMoment` `boardComputers.ts:2951-2971`, kind `key-moment`, LIVE_READ surfaces; student seat = the PRE-MOVE "after their …, only one move keeps your edge. Slow down." Census 105/105 (learn 42, chat 63).

## B. Facts
- B1: `CriticalMomentRead { count, toleranceCp, gapCp, resolved, unresolvedReason, stake: mate|win|on-top|edge|level|in-it|damage, bestCp, holdingSans, discardedSans, discardedProofs[{san,text,line}], bestReason? }`.
- B2 dropped: in the registry, `holdingSans`/`discardedProofs`/`bestReason` are not used (Learn "never names the move"); the student's played move vs `holdingSans` IS compared — `criticalMomentHeld` (:488) — but only to credit a find (`criticalMomentFound` :500, registry :5197) and in Review (`reviewTurningPoint.ts:155`); the NOT-held case (the mistake) is computed and dropped.
- B3 cheap: no new code — `!criticalMomentHeld(read, playedSan)` on the board BEFORE the student's move → the mistake fact "only one move held, and this wasn't it"; `discardedProofs` entry for the played move = its refutation (exact same refutationProof as deliberation).
- B4: tolerance `criticalityThresholds().critical`; holds = inside the stake band floor (`STAKE_FLOOR` :112: win 300, on-top 100, edge 50, level −99, in-it −200) or within tolerance for `damage`; unresolved when bounded / fan < 2 / count fills fan / band edge (50 cp, `BAND_EDGE_CP` :115); speaks only count 1 or 2.

## C. Sentence readiness (post-move, the mistake)
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "one move keeps your edge … Slow down." | said BEFORE the move (banned in new Learn); the post-move form does not exist |
| CONSEQUENCE | partly | `gapCp` → gapWords ("gives up about a pawn") | the played move's own refutation (`discardedProofs`) |
| BETTER MOVE + JOB | partly | `holdingSans[0]` + `bestReason` (material reasons only) | job from deliberation `bestWhy` when bestReason is null |
| HABIT | yes | "Slow down." / "Take the extra minute." | record gate (methodBeat slow-down habit) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CR1 | strategize (fork in the road) | S | read on the board before the student's move: resolved, count 1, played ∉ holding, cost ≥ mistake | stake | "Some positions have one move that keeps {stake}, and every other move gives it up. This was one of those." / "At a fork in the road only one way holds; this move took the other." | "That gives up {gapWords}." + discardedProof of the played move | "{holding[0]} was the move — {bestReason ‖ bestWhy}." | "When the position is sharp, slow down and check every candidate." | after move | resolved only; `unresolvedReason` null | H (`criticalMomentHeld` :488, negated) |
| CR2 | same, count 2 | S | count 2, played ∉ holding | | "Two moves kept {stake} here; everything else gives up {gap}." | | "{h1} or {h2}." | CR1 | after | | C |
| CR3 | calculate (proof) | S | discardedProofs has the played move | proof | "Look one reply further: {proof}." | | | | after | refutationProof measured vs holding line | H |
| CR4 | their seat (knife edge) | O | count 1 for them, they missed it | | "They were on a knife-edge, with one move to keep {stake}, and they missed it." | | the punish is the student's → held | | Learn on their mistake | | C |
| CR5 | found it | S | played ∈ holding, count 1 | | Review/lesson praise ("one move held, and you found it") — methodBeat slow-down found-it stems | | | | silent in Learn | | H |
| CR6 | record | S | | | RED/GREY full · AMBER "Only one move held." · GREEN silent | | | | | | H |
| — | phase/endgame | — | the stake words cover every phase | | | | | | | | |
| — | their plan | — | n/a | | | | | | | | |

## E. Mistake link
- errorWhy: CR1–CR3 frame ANY cause (E1–E15) on a resolved count-1/2 board; CR4 the O-seat; CR5 Review/lesson only.
- Every errorWhy cause on a board where count ∈ {1,2} resolved — CR1/CR2 are the FRAME + HABIT for it (the "why it was hard"); methodBeat `slow-down` and onlyMove say the same claim: one claim `fork:<fen>`.

## F. Build changes
1. Registry `boardComputers.ts:2953`: drop the pre-move student read in Learn; add the post-move read on the mistake turn with `!criticalMomentHeld(read, playedSan)` (B3), beside the existing `criticalMomentFound` read at `:5197` → CR1–CR4.
2. Return `playedProof` (the discardedProofs entry for the played san).
3. One owner for "only one move holds": merge `onlyMove` into this read (onlyMove keeps the material words `gives`).
4. HABIT = methodBeat habit id `slow-down` (record-gated), never a second wording.

## G. Proof boards (pure run on the board before each mistake, 125 mistake plies)
- Resolved count 1: 36; count 2: 9; unresolved 80 (count-fills-fan 36, band-edge 38).
- CR1: g:1012441262#35 S `Bxf8` loss 268, `r4rk1/ppp4p/3p2pB/nq1Pp2n/4P3/2P1Q2P/PP1N1PP1/R3K2R w KQ - 0 18` → count 1, stake win, holding `b4`.
- CR4: g:1001055178#58 O `…Rc7` loss 157 → count 1, stake edge, holding `…Rd8`. g:1012441262#26 O `…Kg8` loss 103 → count 1, stake in-it, holding `…Rg8`.
- Guard: count-fills-fan boards (36) stay silent.

## H. Open questions
- None.
