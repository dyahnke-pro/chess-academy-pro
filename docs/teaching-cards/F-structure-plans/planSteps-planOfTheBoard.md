# Card — `planSteps` / `planOfTheBoard` (family F, one card)

### A. Identity
- `planSteps(fenAfter, line, lastMove, maxSteps=3, allowTrades, firstIsStep)` — `src/services/planSteps.ts:71-278`; `pieceManeuver` :385, `roadJob` :358, renderers `planStepsText` :477, `planStepsHeld` :469.
- `planOfTheBoard(i)` — `src/services/planOfTheBoard.ts:352-492`; candidates siege | road | kick | PlanKind | break | steps (`BoardPlanKind` :73); his flow step 2 `PlanReason` (target | their-idea | worst-piece | structure, `reasonOf` :493 and `REASONS`); gates `DECIDED_CP = 300` :120, `TACTIC_GAIN = 2` :122, `TACTIC_PLIES = 4` :124, `SUPPORT_MOVES = 4` :126.
- Adapters: `planSteps` `boardComputers.ts:3760-3790` kind `plan-steps`, **learn: LEARN** (direct), held form `planStepsHeld` (points no-plan); `planOfTheBoard` :3677-3708, **learn: not** ("read on a board whose move is shown, not played"), review: not; weaknesses: wired (moveInsight `planPosed`).
- Census: planSteps 150 / 134; planOfTheBoard 110 / 97 (lesson).

### B. Facts
- **B1 planSteps** `PlanSteps` :42-65: `steps` [{san, piece, from, to, castle, brk, lost, hits}], `aim`, `aimPiece`, `aimWhy` {weak, hits, guards, wins}, `line`, `maneuver` {piece, from, route, justMoved, job {kind king|piece|hole, square, piece}}, `squares`.
- **B1 planOfTheBoard** `BoardPlan` :98-116: `kind`, `text`, `why: PlanReason|null`, `planText`, `squares`, `target`, `starts` (which of the mover's best-line moves starts it), `claims`.
- **B2 dropped**: planOfTheBoard — the losing candidates (every other plan the board offered, ranked, `Cand[]`) are dropped after the winner is picked; the tactic/decided gate verdict is not returned (null hides "silent because tactic" vs "no plan"). planSteps — nothing major (it is unusually complete: `aimWhy` is the why).
- **B3 cheap**: THE MISTAKE CHECK (both files call themselves dual use): the plan's squares/piece vs the student's PLAYED move — did the move start the plan (`starts`), or go against it? With planOfTheBoard on fenBefore and the student's move, `followed = played.piece/from/to ∈ plan.squares`.
- **B4 gates**: planSteps — quiet line (no check/capture except a plain trade when allowed), ≥2 of the mover's steps, no shuffles; planOfTheBoard — not decided (|eval| < 300, no mate), not a tactic (2 pawns in 4 plies), the best line starts the plan within its first 4 mover moves.

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `why` (PlanReason) + planText; `aimWhy` | the general rule per plan kind |
| CONSEQUENCE | partly | aimWhy.wins / target | — |
| BETTER MOVE + JOB | yes (after the move) | planText / steps — the job in plan words | the followed/ignored match |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PS1 | own plan ignored | S | planOfTheBoard(fenBefore, S to move) exists; S's move not in its squares/piece; cost ≥ inaccuracy | kind, why, target | siege: "A weak pawn is won by stacking pieces on its file: c3 needed one more attacker." / road: "When a piece has no job, give it a road: the queen belonged on h5, hitting h7." / kick: "A pawn that kicks a piece gains time: e5 would have chased their queen off d4." / weak pawn: "Fix a weak pawn first, then win it." / outpost: "Take the outpost before they cover it." / break: "Prepare your break, then play it." | aimWhy ("two of your pieces hit it, one of theirs guards it") | planText past tense ("Bc4 was the plan: it blockades c3 and wins it later.") | "Before a quiet move, ask what the plan is and which move starts it." | after | played move starts the plan (then not a plan mistake) | C (B3) |
| PS2 | their plan | O | planOfTheBoard on the board after S's move (O to move), O's plan exists and S's move did nothing against it, S cost ≥ inaccuracy | | "They have a plan here — Nc4 and then the d3 break at your e4 pawn — and your move didn't slow it." | | engine best (a move against it) | "After their move, ask what they're building." | after | | H |
| PS3 | knowledge — plan = goal + way | either | any | | "A plan is a goal and a way: name the target, then the first move toward it." | | | | Review/chat | | H |
| PS4 | record | — | `no-plan` RED/GREY full; AMBER BM clause only; GREEN silent | | | | | | | | |
- Not applying: calculate (the line is the engine's, short form only); endgame-specific (the same plan kinds apply; PassedPawn plan via PlanKind).

### E. Mistake link
- PS1: `positionalReason` `no-plan` (:220) / `misplaced-piece` (:223 "The X belonged on Y") — planOfTheBoard is the WHY (goal + way) that note lacks. Seat S. PS2 seat O. The weakness record already wires it (`planPosed`, moveInsight).

### F. Build changes
1. `planOfTheBoard` — return the gate verdict (`silent: 'tactic'|'decided'|'no-plan'|null`) and the ranked runners-up (`alternatives`), so the recipe can tell "no plan" from "a tactic first".
2. Add `planFollowed(plan, fenBefore, san): 'started'|'against'|'neutral'` (B3) in planOfTheBoard.ts — the dual-use check its header promises.
3. Learn: planSteps is `learn: LEARN` today and speaks the student's next moves ("Your plan from here: Bg5, e3 and then the e4 break") — a before-move plan; under this WO it runs only after the move, as PS1's BM slot. planOfTheBoard stays out of Learn's before-move path (already `not`).
4. `mistakeLesson`: `no-plan`/`misplaced-piece` → PS1.

### G. Proof boards
- planOfTheBoard: `vc-_4xbS0Crtic-22` (`rnb1r1k1/pppp1p2/5q1p/2b2Np1/8/2P3B1/P1P1BPPP/R2QK2R w KQ -`) "win their weak pawn on c3 … plant your bishop on c4"; `vc-_zT8aWZh2x0-40` "kick their queen off d4 … e5"; `vc--FRuDd_oXz4-25` queen road via e2 to h5 hitting h7.
- planSteps: `vc-_X7t6o3o6JM-3` (`rnbqkb1r/pppppppp/5n2/8/3P4/2N5/PPP1PPPP/R1BQKBNR b KQkq -`) "Bg5, e3 and then the e4 break … at their pawn on d5" (a before-move plan said in the lesson).
- Guard: |eval| ≥ 300; a tactic in the first 4 plies.

### H. Open questions
1. Should PS1 fire on an inaccuracy when the plan's `starts` > 0 (the best move only prepares it)?
