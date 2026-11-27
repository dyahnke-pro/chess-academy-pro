# desperadoAt — card

## A. Identity
- `desperadoAt(fenBefore, san, bestUci)` — `src/services/desperado.ts:43` (+ `lostAnyway` :84); words `desperadoLine` :104 (found / missed × one / two hanging × survives).
- Board computer `desperadoMove` — `src/services/boardComputers.ts:6299-6310` (`moveIdeaFact`, idea `rescue`, weight 66), kind `defence-idea`, FACT_SET_SURFACES.
- Census: 2 fired / 2 said (lesson).

## B. Facts
### B1. Handed over (`Desperado`)
`san/from/to/piece/captured` (the engine's best: a capture by a hanging piece), `other` (the second hanging piece, or null = the piece was lost anyway), `survives` (the seller survives → the other piece is the one that goes), **`found`** (the move played WAS the sale).
### B2. Dropped
- `found=false` is the MISTAKE (the mover let a doomed piece go for nothing) — the words exist ("Only one can be saved, so sell the other first. Qxg5 takes a bishop on its way out") but nothing attaches them to the cost.
- The material difference between selling and not selling (SEE of the sale vs what was lost) — not computed in words.
### B3. Cheap
- Cost of the miss = value of `captured` (the piece the sale would have taken) — from the board.
### B4. Gates
Mover has a hanging non-pawn (SEE); best is a capture BY a hanging piece of a piece ≤ its value; a sale that just trades for the attacker evenly when the seller dies is dropped; with no other hanging piece, the seller must be lost anyway (`lostAnyway`) unless it survives; with another hanging piece and the seller surviving, the other must really be lost.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "When two pieces hang, sell the one you can't save." / "A piece that is lost anyway should cost them something." | — |
| CONSEQUENCE | partly | "the piece you lose is paid for" | the miss's cost in material (B3) |
| BETTER MOVE + JOB | yes | `san` + "takes a bishop on its way out" (missed variant) | gate to after the move |
| HABIT | partly | the lesson stems are the habit | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DS-1 | strategize (sell the doomed piece) | S mistake | found=false, other≠null, cost ≥ inaccuracy | piece, other, captured | "When two pieces hang, you can only save one — so make the other cost something first. Your queen and knight were both hanging." / "Sell the piece you can't save: one capture on its way out." | "Instead the knight went for nothing." (B3) | "Qxg5 was the move — it took a bishop before the knight went." (once past) | "When a piece is lost anyway, look for what it can take on its way out." | after | found=true (positive) | H |
| DS-2 | strategize (lost anyway) | S mistake | found=false, other=null | piece, captured | "A piece that can't be saved should still take something. Nothing could save the queen on f4 — but it could take a bishop first." | "It went for nothing." | san (once past) | same | after | — | H |
| DS-3 | their seat | O | O missed their sale (found=false with O mover) | — | "A piece that's lost anyway should take something on its way out. Their queen on f4 was lost and went for nothing." | | | | after THEIR mistake (positive for S) | — | H |
| DS-4 | knowledge (found) | S | found=true | — | "Good: two pieces hung and the knight took a bishop on its way out." | | | | Review / praise | — | H |
| DS-REC | record | — | `hung-material` (two-pieces-hanging defence) | | RED/GREY full; AMBER "Sell the piece you can't save."; GREEN silent | | | | | | holdRate |
n/a: phase (any), prevent (the hanging state came earlier — bothSaved/errorWhy own that).

## E. Mistake link
- errorWhy cost where best = the desperado capture: a material costReason `missed` (the piece it could have taken) → DS-1/DS-2. No whyItFailed kind covers "missed the sale" — this card owns it.
- Combination: bothSaved (one move saves both) is the BETTER answer when it exists — desperado only when it doesn't.

## F. Build changes
1. Recipe `missed-desperado` keyed on `found === false`; CONSEQUENCE adds the value of `captured` (B3).
2. desperado.ts — no API change; the board computer must pass the record's cost so the recipe fires only on a graded mistake.
3. Words → recipe; delete `desperadoLine`'s 10 stems.

## G. Proof boards
- Text (lines-0, lesson): "Two of their pieces were hanging: the queen on d8 and the knight on e5. Only one can be saved, so sell the other first. Qxg5 takes a bishop on its way out." (DS-1 shape, O seat); "Nothing could save the queen on f4. Before it goes, Qxe5 takes a bishop." (DS-2).
- Guard: a capture that only trades the seller for its attacker evenly → null.

## H. Open questions
1. none
