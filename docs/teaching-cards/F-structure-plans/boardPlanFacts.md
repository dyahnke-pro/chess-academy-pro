# Card — `boardPlanFacts` (family F)

### A. Identity
- `boardPlanFacts(fen, side, voice)` — `src/services/boardPlanFacts.ts:76-209`; renderer `leverSentence` :233; `homeWords` :214. Calls `structurePlanFact` (trump), `deriveNextPlanFacts` (plans, nextPlans.ts:310), `findPawnBreaks`+`breakContacts`, `findOpenFiles`, `holeTargets`, `worstPieceNote`/`worstPieceRoute`, `methodRead`/`methodPlanSentence` (planChoice.ts).
- Adapter `boardPlans` `boardComputers.ts:3157-3176`, kind `structure-plan`, surfaces `LIVE_READ`. Census: 2,030 / 1,737 said (all CHAT in the census). Map: T.

### B. Facts
- **B1** `BoardPlanFacts` :46-66 (`PlanSentence` :44): `trump`/`trumpSquares` (string), `plans` [{text, squares, claim}], `levers` [{kind develop|break|file|outpost|worst, phrase, squares, claim}], `why`, `ordered`, `method`, `methodSquares`.
- **B2 dropped**: the break lever keeps only `hits[0]` (:103-104; all hits found at :98) — the other breaks and targets dropped (G4.5 calls this a phrasing choice, OK); the break's consequence is never computed; for files, `pawnsHit` vs `entries` collapsed into a phrase (:141-148); `road.route`, `road.via` partly kept in squares; `worst.reason`/`kind` (worstPieceNote) dropped from the phrase.
- **B3 cheap**: does the student's PLAYED move belong to a lever (same piece/square as `levers[i].squares`)? → "the move followed the plan" vs "the move ignored it". With the saved engine best: which lever the engine's best move executes → the BETTER MOVE's JOB in plan words.
- **B4 gates**: break only when the side is to move (or `they` voice flips) and a target exists (:92-106); file only for a side with a rook (:139), not a file a rook stands on (:134), a pawn at its end or an uncovered entry (:111-149); outpost via `holeTargets` (knight first, :153-160); develop only undeveloped minors in the opening (:163-173); worst only when a road exists and past the opening / misplaced (:176-195); method only when the first plan isn't passer/convert (:199-201).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | levers' phrases | it is a BEFORE-move instruction ("The plan: post a bishop on a3") — names the student's next move; the general rule per lever kind is missing |
| CONSEQUENCE | partly | break/file phrases name a target | what follows |
| BETTER MOVE + JOB | yes (after the move) | the lever matching the engine best gives the job in words | the match (B3) |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE (job) | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BP1 | own plan — the move ignored the plan | S | read on fenBefore; S's move ≠ any lever; engine best executes lever L; cost ≥ inaccuracy (`no-plan`) | L.kind, L.squares | develop: "In the opening, every move should bring a new piece out." / break: "Every structure has a break that decides the play: here it's the one that hits d5." / file: "Rooks belong on open files — and the e-file leads to their pawn on e6." / outpost: "A hole in their camp is a home for your knight." / worst: "Improve your worst piece: the knight on h5 has no future there." | — | "Nb1-d2 was the plan: development comes first." / "c4 was the break: it hits d5." (L.phrase, past tense) | "Before a quiet move, ask what the plan is: break, file, outpost or worst piece." | after | the played move IS a lever (then it's not a no-plan mistake) | C (B3) |
| BP2 | their plan | O | `voice:'they'` read on the board after S's move; S's move cost ≥ inaccuracy; O's engine best executes a lever | L.kind, L.squares | "When they have a plan, a quiet move that doesn't slow it down is a free tempo for them: their rook is headed for the c-file and c3." / "Look at their plan before your own: the c-file leads straight to c3." | | | | after | | C |
| BP3 | the standing plan | S | — | | (the existing `leverSentence`) | | | | chat only (asked) | | H |
| BP5 | both seats — their move ignored their plan | O | the BP1 check on THEIR move (their move ≠ any of their levers, their cost ≥ mistake) | | "A quiet move with no plan behind it is a free move for the other side." | | | | Review/chat only (the punishment is the student's next move) | — | C (F1 with side=them) |
| BP4 | record | — | `no-plan` RED/GREY full; AMBER the BM clause only; GREEN silent | | | | | | | | |
- Not applying: calculate (no line read — the engine is not consulted, file header :8-10).

### E. Mistake link
- Cause names (errorWhy §D): BP1 → **E15 positional** with tag no-plan / neglected-development / passive-rook / misplaced-piece / mistimed-pawn-break (F2 table); BP2 → E15 read for the opponent's plan or **E12 allowed-threat** when their lever lands with tempo; BP5 Review/chat only.
- BP1: `positionalReason` `no-plan` (:220) and `neglected-development` (:154), `passive-rook` (:186), `misplaced-piece` (:192) — each lever kind maps to one of these tags. Seat S. BP2 seat O.

### F. Build changes
1. Add `leverOfMove(fenBefore, san, facts): PlanLever|null` — which lever a move executes (piece from/to ∈ lever squares). Enables BP1/BP2 and the BETTER-MOVE job.
2. Map `LeverKind` → positionalReason tag in one `Record<LeverKind, MisconceptionTagId>` (develop→neglected-development, break→mistimed-pawn-break, file→passive-rook, outpost→misplaced-piece, worst→misplaced-piece) so a new lever kind fails to compile until filed.
3. Learn: the `boardPlans` LIVE_READ speech is a before-move plan (it names the next move, e.g. "The plan: post a bishop on a3.") — removed from Learn under this WO; read only after the move through the recipe.

### G. Proof boards
- **Ran** on David's board after 9.Bxf6 Bxf6 (white): levers = develop (Nb1), break c4→d5, rook to the e-file at e6; plans [], trump null. Engine best there (`reads[ply 18]`) can be matched to a lever in the build.
- Census (chat): `vc-_4xbS0Crtic-12` "The plan: bring your other knight and your light-squared bishop into the game…"; `vc-_4xbS0Crtic-22` "The plan: post a bishop on a3."
- Guard: played move = the lever.

### H. Open questions
1. Does chat keep the before-move plan (it is ASKED there)? Plan says yes — confirm.
