# Card — `picturePlan` (family F)

### A. Identity
- `picturePlan(i)` = `pictureVerdictOf(i).plan` — `src/services/pictureVerdict.ts:461-494` (the plan is built only where a direct try failed and none works, :462); parts: `planOfTheBoard` (the plan of the board), `rookLiftIn` (named manoeuvre), `linksOf` (how the quiet move answers each failed try: guards-taken, hits-replier, adds-attacker), `purposeFromLine` (intent).
- Adapter `boardComputers.ts:3735-3758`, kind `plan-now`, `namesStudentMove: mine`, skill `overvalued-attack` when mine, conclusion thread `PLAN_GOAL.picturePlan`. Surfaces PICTURE_SURFACES (lesson/learn/review…).
- Census: 387 / 313 said. Map: **S** ("So the quiet Bc1" — names the move, states).
- Pilot card 1 covers its parent (pictureVerdict, other family); this card re-cuts its P rows for the plan.

### B. Facts
- **B1** `PicturePlan`: `san`, `uci`, `plan: BoardPlan|null`, `named` ('the rook lift'|null), `links` [{kind, at, square, text}], `jobs` (texts), `text` ("So first X." + jobs), `squares`.
- **B2 dropped**: the `but` tries the plan answers are kept on the verdict, but the plan's text never says WHY the direct tries failed together ("every try runs into the knight on e5" — the grouping is the pilot's "one piece refutes all tries" lesson, uncomputed); `boardPlan.why` (PlanReason) is not used in the lead.
- **B3 cheap**: group `but` by refuting piece (`replyFrom`) — the pilot's STRAT row; whether the STUDENT played one of the failed tries (the mistake) — then the plan is the better move and the failed try's reply is the consequence.
- **B4 gates**: ≥2 reads; best not a mate; ≥1 failed try and no working try (:462; `works` needs a settled net ≥ 1 pawn, :456-457); the lead rotates "So first X." / "So the quiet X instead." (:476), or the rook-lift lead (:471-474), or the opponent's "So their move is the quiet X" (:477).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | lead is a restatement ("So the quiet Bc1") | the rule: "when the direct moves fail, the quiet move that improves a piece is the plan" |
| CONSEQUENCE | partly | links ("guards the h-pawn …Rxh5 took") | the failed try's reply when the student played it |
| BETTER MOVE + JOB | yes (after the move) | san + jobs | — |
| HABIT | no (skill overvalued-attack filed) | — | habit stem |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PP-1 | counterfactual — S played the failed try | S | S's move ∈ `but`; cost ≥ inaccuracy | try, reply, plan | "When the direct moves fail, the quiet move that improves a piece is the plan." / "Sometimes every active move makes your position worse: then the strongest move is a quiet one." | the try's reply (from `but`): "…Rxh5 takes the pawn your rook left." | "Bc1 was the quiet move: it guards d4 from b2." (san + jobs, past) | "Before the obvious move, ask what their best reply is." | after | S's move is the plan | H |
| PP-2 | strategize — one piece refutes all | either | B3: ≥2 failed tries share a replier square | replier | "When one piece refutes all your tries, that piece is the real target." | | the plan if it hits the replier (link hits-replier) | | after (as LESSON of PP-1) | same square and piece | C |
| PP-3 | link guards-taken | S | link kind guards-taken | | "The best preparation removes the reason the attack failed: guard what their reply would take." | | | | as LESSON variant | | H |
| PP-4 | link adds-attacker | S | adds-attacker | | "Adding one more attacker changes the count, and then the target falls." | | | | | | H |
| PP-5 | named — rook lift | S | `named` | | "When the files are closed, lift the rook up the board and swing it across." | | | | | rook climbs then crosses | H |
| PP-6 | their quiet move | O | mover O | | "Their quiet move is preparing something: ask what it makes possible next." | | | | after S's mistake only | | H |
| PP-7 | record | — | `overvalued-attack` RED/GREY full; AMBER BM clause; GREEN silent | | | | | | | | |

### E. Mistake link
- Cause names (errorWhy §D): PP-1 → E3 / E4 / E5 / E11 (the failed try's reply is the CONSEQUENCE, the plan the BETTER-MOVE job); PP-6 → **E12 allowed-threat** when their quiet move's preparation lands; PP-2..PP-5 are LESSON variants of PP-1.
- PP-1: costReason `allowed` (the failed try's reply) or `whyItFailed` (`answered-by-tactic`, `held-by-defender`) — picturePlan supplies the BETTER MOVE + JOB for those causes when the best move is quiet. Skill `overvalued-attack`. Seat S.

### F. Build changes
1. Delete the lead "So first X." / "So the quiet X instead." (pictureVerdict.ts:471-477) from Learn — it is the board restated with the move named; the plan's jobs become the BM slot in `mistakeLesson`.
2. Add `refuterGroups: { square, piece, tries }[]` (B3) to `PicturePlan`.
3. `mistakeLesson`: causes **E5 answered-by-check**, **E3 took-guarded** / **E4 eyed-guarded** (errorWhy splits whyItFailed's `held-by-defender` in two) and **E11 allowed-capture**, best move quiet → PP-1 with PP-2..PP-5 as LESSON variants.

### G. Proof boards
- `vc-_X7t6o3o6JM-26` (`2r2rk1/pp2ppb1/4bnp1/q1npN2p/5BPP/2N1PP2/PPPQ4/1K1R1B1R w`) "So their move is the quiet …Rfd8." (bare restatement — F1).
- `vc-_X7t6o3o6JM-18` "So they go slower, with …Nxc5. Later in the line, after …Nxe4, the knight on e4 hits your knight on c3…" (a link).
- David's ply 17 (best `g5c1`, played `g5f6`): the approved BM "Bc1 kept it, guarding d4 from b2" is this computer's job slot + the colourConceded lesson (findColorComplexWeakness card).

### H. Open questions
- none.
