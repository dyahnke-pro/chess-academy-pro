# bothSaved — card

## A. Identity
- `bothSaved(fenBefore, san, replies)` — `src/services/bothSaved.ts` (`lost`, main fn); words `bothSavedLine`.
- Board computer `bothSaved` — `src/services/boardComputers.ts:3904-3922`, kind `defence-idea`; fires on the move PLAYED.
- Sibling: `desperadoAt` (when no single move saves both).
- Census: 4 fired / 4 said (review 2, lesson 2).

## B. Facts
### B1. Handed over (`BothSaved`)
`moved` {piece, from, to}, `other` {piece, square} (the second hanging piece the moved one now guards), `san`, `key`.
### B2. Dropped
- The hanging list before the move (`findHangingBySee` ≥ 2) — what each hung to (attacker squares).
- `lost()`'s verdict per piece against the engine's replies — the proof that after the move nothing is lost.
- It reads only the PLAYED move: a save that EXISTED but wasn't played (the mistake) is not searched.
### B3. Cheap
- Search: for each legal move of the student on fenBefore, `bothSaved(fenBefore, m.san, replies-after-m)` — needs the saved reads per move (only the best line's is saved); fallback without engine: the moved hanging piece lands where it attacks the other and SEE on both ≤ 0 (`legalSeeGainFor`).
### B4. Gates
Not in check; ≥ 2 of the mover's non-pawns hanging (SEE); the played move is quiet, moves one hanging piece, lands guarding another; none of them is lost after it (SEE 0, or the engine's top reply doesn't take, or taking costs ≥ 30cp vs best).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "With two pieces hanging, look for a move of one that guards the other." | — |
| CONSEQUENCE | partly | "saves both" | for the miss: "you lost the knight" |
| BETTER MOVE + JOB | partly | moved.to + "guards the knight" | only on the played move; the missed save needs B3 |
| HABIT | yes | stem 3 | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BS-1 | prevent (missed the double save) | S mistake | ≥2 hanging on fenBefore, best move = a both-save (B3 on the best line), S played other, errorWhy lost-the-piece/abandoned | moved, other | "When two pieces hang, look for one move that saves both: step one out and make it guard the other. Your queen could have gone to g3 and guarded the bishop on d3." | "Instead the bishop fell." | "Qg3 was the move — out of the attack, guarding d3." (once past) | "With two pieces hanging, look for a move of one that guards the other." | after | no single save exists → desperado card | C |
| BS-2 | found (positive) | S | fires (played) | — | "One move saved both — the queen stepped out and guarded the bishop." | | | | Review / praise | — | H |
| BS-3 | their seat | O | O found it | — | "They saved both pieces with one move — the queen to f3 guards the knight." | | | | Review | — | H |
| BS-4 | combination | S | BS-1 false AND desperado found=false | — | → desperadoAt DS-1 | | | | | | |
| BS-REC | record | — | `hung-material` | | RED/GREY full; AMBER "One move saved both."; GREEN silent | | | | | | holdRate |
n/a: phase, plan, calculate (one move).

## E. Mistake link
- whyItFailed `lost-the-piece` / errorWhy with best = a both-save → BS-1 (S).
- Order with desperado: both-save first (no loss), sale second (paid loss).

## F. Build changes
1. bothSaved.ts — export `findBothSave(fenBefore, replies|null)`: scans legal moves; without per-move reads uses the SEE-only test (B3) → BS-1.
2. Expose the hanging list with attackers (B2).
3. Recipe `missed-both-save` attaches when errorWhy's best === the found save.

## G. Proof boards
- Text (lines-0): "Your queen on g4 and bishop on d3 were both hanging. One move saves the two of them: the queen goes to g3, out of the attack, and guards the bishop." (BS-2); lines-1: "Their queen on f4 and knight on c3 were both hanging … the queen goes to f3 …" (BS-3).
- Guard: a capture-save (mv.captured) → null (desperado territory).

## H. Open questions
1. none
