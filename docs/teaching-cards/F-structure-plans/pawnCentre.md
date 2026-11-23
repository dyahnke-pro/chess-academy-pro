# Card — `pawnCentre` (family F)

### A. Identity
- `pawnCentre(fen, student)` — `src/services/pawnCentre.ts:77-102` (`centreOf` :61, `pawnHits` :46, `pawnCaptureSquares` :50).
- Adapter `boardComputers.ts:7174-7192`, kind `structure`, phase `NOT_ENDING`. Surfaces: lesson, review, play-read, chat, think, learn (via thought), tactics-read; weaknesses: not ("a standing description").
- Census: 202 / 35 said; not-said: already-said 157, unsupported 6, in-flux 4. Concept "centre" — today **P** (states who holds it).

### B. Facts
- **B1** `PawnCentre` :30-39: `side`, `pawns` (own 4th-rank d/e pawns), `joins` (3rd-rank pawns that can push safely beside), `takes` (squares in the enemy half the centre pawns cover), `text`, `squares`.
- **B2 dropped**: nothing substantive — the loop drops the *second* side when the first side qualifies (only one centre can exist since the other side must have no d/e centre pawn, :82). `pawnHits` result for joins (whether the join square is contested by a piece) not kept.
- **B3 cheap**
  - The **trade/move that gave the centre away** (the mistake): on fenBefore the mover HAD a centre pawn (d/e on its 4th) and after the move the other side owns an uncontested centre → the mover's move conceded it (a capture away from the centre, e.g. …dxc4 surrendering d5, or a pawn trade). One call on fenBefore + fenAfter.
  - Which enemy **pieces lost squares** (`takes` ∩ squares an enemy minor wanted: `chess.moves` of their knights/bishops before vs with the pawn there).
  - The **break that can challenge it** (findPawnBreaks for the other side onto a square touching `pawns`) — the counter-plan ("hit it with c5").
- **B4 gates**: ≥1 centre pawn and pawns+joins ≥ 2 (:81); other side has NO pawn on d4/e4/d5/e5 (:82); not in an ending (adapter phase).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | pawns, takes ("takes c5–f5 away from their pieces") | the WHY-it-matters rule is half there; the mistake that let it happen is not |
| CONSEQUENCE | partly | takes | which enemy piece lost its square; what the centre can do next (e4-e5 push) |
| BETTER MOVE + JOB | no | — | engine move that kept a centre pawn / challenged it |
| HABIT | no | — | no skill tie |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PC1 | consequence — S gave up the centre | S | B3: before S's move S had a d/e centre pawn, after it O owns an uncontested centre; cost ≥ inaccuracy | O pawns, takes | "Give up your last centre pawn and the centre is theirs: their d- and e-pawns now take c5 to f5 from your pieces." / "A pawn centre nobody challenges takes squares away from every piece you have." | "Your knight has no square in the centre now." (a minor's lost squares) | "…e5 kept a pawn in the centre." (engine best) | "Before you trade a centre pawn, ask who owns the centre after." | after | O centre contested by a piece trade-down (ending) | C (B3) |
| PC2 | consequence — O gave it up | O | B3 on O's move | S pawns | "Their trade left you the centre: your d- and e-pawns take the four squares from c5 to f5 away from their pieces." | — | — | — | after their mistake | — | C |
| PC3 | their plan — challenge | O vs S centre | S owns centre, O break exists | break sq | "A pawn centre is strong until it's attacked: expect c5 against d4." | — | — | — | Review/chat | break must be legal and survive (findPawnBreaks) | C |
| PC4 | own plan — the push | S | S centre + safe push d5/e5 | | "A centre is there to advance: the push gains space and kicks a piece." | — | — | — | Review/chat | push loses the pawn | C |
| PC5 | strategize — hypermodern | O centre, S fianchetto | S has a fianchettoed bishop on the long diagonal hitting a centre pawn | | "You can let them build a centre if you can attack it later: your bishop on g7 already hits d4." | — | — | — | Review/chat | — | C |
| PC6 | record | — | no skill exists — always full when attached to PC1 | | | | | | | | |
- Not applying: endgame (adapter `NOT_ENDING` — centre pawns are then passers/targets, other cards).

### E. Mistake link
- PC1: `positionalReason` tag `space-conceded` (`positionalReason.ts:189` — "… gives up space in the centre the better move kept") is EXACTLY this mistake: pawnCentre is its lesson. Seat S.
- PC2: same cause, seat O.
- PC3-PC5: Review/chat only.

### F. Build changes
1. New `centreConceded(fenBefore, san, student)` in `pawnCentre.ts`: the mover had a 4th-rank d/e pawn before, after the move the other side's `pawnCentre` holds → `{ mover, lost: Square, owner centre, takes }`. Enables PC1/PC2.
2. `pawnCentre.ts:30-39` — add `starved: {piece, square, lostSquares}[]` (enemy minors whose central squares are now in `takes`). Fills CONSEQUENCE.
3. `mistakeLesson`: cause `space-conceded` → PC1 (seat S) / PC2 (seat O).
4. Learn path stops speaking the standing description (`pawnCentre.ts:97` text) — only via the recipe.

### G. Proof boards
- `vc-_JQ-AH3OYQ4-9` (`rn1qk1nr/pbpp1ppp/1p2p3/8/1b1PP3/2NB4/PPP1NPPP/R1BQK2R b`) your d/e centre c5–f5.
- `vc--MtlVsMGiCo-26` their d4 + e3 joiner (seat O).
- Guard: any board where the other side has a pawn on d4/e4/d5/e5 (:82); endings.

### H. Open questions
1. Is PC1 said for an inaccuracy (space-conceded fires at any cost tier)?
