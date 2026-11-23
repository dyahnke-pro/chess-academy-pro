# Card — `namedStructureFormed` (family F)

### A. Identity
- `namedStructureFormed(fenBefore, san)` — `src/services/namedStructure.ts:113-118`; `RULES` :48-103 (8 structures: Carlsbad, French chain, KID chain, Maróczy, Stonewall, Hedgehog, Benoni, Scheveningen), `structuresOn` :103, renderer `namedStructureLine` :122.
- Adapter `boardComputers.ts:~6366-6378` (`structureFormed`, move-fact set, idea `structure`, weight 58, claim `structure:<name>`). Surfaces: FACT_SET_SURFACES.
- Census: 11 / 11 said (T).

### B. Facts
- **B1** `NamedStructure` :17-27: `name`, `title`, `owner` (whose pawns name it), `squares`, `plan: Record<Color, string>` (each side's plan, written text).
- **B2 dropped**: nothing computed is dropped; but the plans are hand-written STRINGS — the breaks and squares inside them ("…c5", "f4 and f5", "b4 and b5") are not typed, so nothing can check whether a student's move followed or ignored the plan.
- **B3 cheap**: typed plan moves per rule (break square, piece route) → compare with the student's move and the engine's best: "the plan's move" vs "a move against the plan". Also `structuresOn(fen)` (standing) is available every ply — the structure that is ON the board when the student errs.
- **B4 gates**: the structure is NEW after the move (not on fenBefore, :116). Exact pawn patterns only (never the opening's name).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | title + plan | — (knowledge lesson) |
| CONSEQUENCE | n/a | — | — |
| BETTER MOVE + JOB | partly | plan text | typed plan move to match the engine's best |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| NS1 | knowledge — the structure's plan, on a no-plan mistake | S | `structuresOn(fenBefore)` has a structure; S's move cost ≥ inaccuracy with `no-plan`/`mistimed-pawn-break`; engine best matches the S plan's typed move (B3) | title, plan | "Every pawn structure has its plan: in the French chain, you hit it at its base with …c5." / "In the Carlsbad structure the plan is the minority attack — b4 and b5 — to leave them a weak pawn on c6." | — | "…c5 was the plan's move." (after) | "When the pawns lock, ask which break this structure wants." | after | engine best ≠ plan move → only the LESSON clause, no BM | C (B3) |
| NS2 | their plan | O | structure on board, O's plan move is O's engine best after S's move | | "Their plan in the King's Indian chain is …f5 and a pawn storm — your move did nothing against it." | | | | after S's mistake | | C |
| NS3 | formed (today's line) | either | the move creates it | title, plans | (the existing `namedStructureLine`) | | | | Review/chat (a good/neutral move) | | H |
| NS4 | record | — | no-plan RED/GREY full; AMBER the plan clause only; GREEN silent | | | | | | | | |
- Not applying: calculate/count (a named plan is knowledge).

### E. Mistake link
- NS1: `positionalReason` `no-plan` ("X was the move the position asked for", `positionalReason.ts:220`) and `mistimed-pawn-break` (:219) — the structure gives the WHY. Seat S. NS2 seat O.

### F. Build changes
1. `namedStructure.ts:48-103` — add typed `planMoves: Record<Color, { breaks: Square[]; routes?: Square[] }>` per rule (e.g. French chain black `breaks: ['c5','f6']`, Carlsbad white `breaks: ['b4','b5']`). Enables NS1/NS2 matching.
2. Export `structuresOn` (standing read) for the recipe table.
3. `mistakeLesson`: `no-plan` / `mistimed-pawn-break` + a standing structure → NS1.

### G. Proof boards
- French chain: `vc--Am8glebGwQ-5` (`rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq -`); KID chain `vc-3nyxVHwDCTY-31`; Maróczy `vc-2Mys0GRUgM4-19` and `vc-3nyxVHwDCTY-30`.
- Guard: structure already on fenBefore (formed rule).

### H. Open questions
1. NS1 when the engine's best is NOT the structure's plan move — say the plan anyway (it's the general lesson) or stay silent? Plan says LESSON needs the board's example inside — staying silent is safer.
