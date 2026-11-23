# guardRemovalConcept — card

## A. Identity
- `guardRemovalConcept(fen, student)` — `src/services/boardTeachConcepts.ts:69-92`, over `findGuardRemovals(fen, holder)` — `src/services/guardRemoval.ts` (find loop + `everyReplyLosesAPiece`).
- Board computer `guardRemoval` — `src/services/boardComputers.ts:3200-3205`, kind `concept`, `LIVE_READ`. `isGuardRemovalMove` (record, by coordinates).
- Sibling: `detectTactics.findRemovableGuards` (static shape, Review) — two readers of one concept; this one is proven (every reply loses a piece).
- Census: 5 fired / 5 said (learn 1, chat 4).

## B. Facts
### B1. Handed over (`GuardRemoval`)
`side`, `target`, `targetPiece`, `guard`, `guardPiece`, `moves[]` {san, from, to, kind capture|chase}.
### B2. Dropped
- `kind` of the move is used only for the warning sentence ("chases it off" / "removes it"); for the student's chance it is dropped — the lesson differs (capture the guard vs chase it).
- `everyReplyLosesAPiece` net per reply — the proof that NO reply saves both is computed and not said (the "they can't save both" consequence).
- Rejected chasers: chasing with a piece worth ≥ the guard when the guard is defended; the chaser itself lost (guardRemoval.ts find loop) — exception rows.
### B3. Cheap
- The student's defence after the opponent's chance: add a second guard to `target` or move `target` (chess.js legal moves that make `attackers(target, student) ≥ 2` or move it to a safe square).
### B4. Gates
- Target ≥ minor, not king, attacked by holder, exactly ONE guard, guard not king; target not already won by SEE; capture of guard must be SEE ≥ 0; chase: cheaper piece or undefended guard, chaser safe; every reply must lose a piece (net ≥ 2) and a check reply defeats proof.
- Student's chance said without the move (boardTeachConcepts.ts:63-66 comment, :80-81) — correct; theirs names their move.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | `GUARD_REMOVAL_PRINCIPLE` / `_WARNING` | order: lesson starts with "Their queen has one guard" (board) — principle first |
| CONSEQUENCE | partly | target | "the queen falls" not said; "every reply loses a piece" (B2) |
| BETTER MOVE + JOB | partly | moves[0] | student's miss: "Bxe7 was the move — it took the only guard"; opponent's: way out (B3) |
| HABIT | yes | `_WARNING[1]` "Count your guards…" | spotCue removing-the-guard |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GR-1 | prevent | O chance after S's move | findGuardRemovals(after S move, them) non-empty, absent on fenBefore, errorWhy cost ≥ mistake | target, guard, moves[0] | "A piece held by one guard is only as safe as the guard. Your rook on e8 hangs on the rook on a8, and a check chases it off." / "One guard is a weak guard: chase it and the piece falls. Your knight on d4 is held only by the queen." | "Whatever they do with the guard, you lose a piece." | "Re1 was the move — a second guard for e8." (B3) | `GUARD_REMOVAL_WARNING[1]` | after | not caused (present before S's move) | H + C |
| GR-2 | own plan (missed) | S | holder S on fenBefore, S played ∉ moves | target, guard, kind | capture: "When one piece holds another, take the holder. Their bishop on e7 was the knight's only guard." chase: "Chase the guard and what it guards falls. A pawn on the bishop guarding d5 would have won the knight." | "Every reply would have lost them a piece." | "Bxe7 was the move — it took the knight's only guard." | spotCue removing-the-guard | after, past-only | chance still there after reply → hold | H |
| GR-3 | calculate | both | — | B2 | "Check every reply: if each one still loses a piece, the guard removal works." | | | | Review | | B2 |
| GR-4 | knowledge (chase vs capture) | both | kind | — | "You don't have to take the guard — attacking it with a cheaper piece works just as well." | | | | | chaser ≥ guard and guard defended | H |
| GR-5 | exception | both | guard is king | — | silent (gate; king guards are a check question) | | | | | | H |
| GR-REC | record | — | `missed-their-guard-removal`/`missed-your-guard-removal` | | RED/GREY full; AMBER "Your rook hangs on one guard."; GREEN silent | | | | | | holdRate |
n/a: phase (any), strategize (tactical). Combination with `overload` (detectTactics) — one guard holding two pieces → defer to DT-O1.

## E. Mistake link
- costReason `allowed` motif `removing_the_guard` (seat O) → GR-1; `missed` (seat S) → GR-2.
- whyItFailed `abandoned-defender` (the moved piece was the only guard) → GR-1's lesson stem applies (the student REMOVED their own guard): "A piece held by one guard is only as safe as the guard — and you moved it."

## F. Build changes
1. guardRemoval.ts `everyReplyLosesAPiece` — return the minimum net and the reply that comes closest (B2) → GR-3 proof.
2. Merge with `tacticsDetector.findRemovableGuards` (:498-557): one concept, two readers (static vs proven). The static one feeds Review's `tactic` line; make it read `findGuardRemovals` so a guard removal said in Review is the proven one (rot rule: two readers of one concept).
3. New `guardWaysOut(fen, gr, student)` → GR-1 BETTER-MOVE.
4. boardTeachConcepts.ts:78-81 — return typed GuardRemoval; recipe words it principle-first. No before-move speech in Learn.
5. Recipe `abandoned-defender` (whyItFailed) reuses GR-1 lesson stem.

## G. Proof boards
- GR-1 (O): voiced vc--4hTQEnwa7s-40 `2kr4/ppp2pp1/2n5/3p4/P3p1bq/BP2P1b1/R1PP2B1/1N1QR1K1 w - - 1 21` — said "Their queen has one guard, their rook on e1" (student Black: this is THEIR queen → student's chance, GR-2 shape).
- vc-0ipLPOAN_m8-56 (knight with one guard, their queen), vc-_X7t6o3o6JM-40 (rook on d8 guarded by f8).
- Text (lines-0, learn): "Your rook on e8 has one guard, the rook on a8, and Bd5+ chases it off." (GR-1).

- **Pure-function run (chess.js only, scratch vitest, deleted after):** `findGuardRemovals(after vc--4hTQEnwa7s-40, 'b')` → target d1 queen, guard e1 rook, move `Bf2+` (chase). Note the target is the QUEEN attacked by the bishop on g4 — the student (Black) chases the guard with check.

## H. Open questions
1. A removal the student's own move created (whyItFailed abandoned-defender) and one the opponent set up: same lesson stem, or separate wording for "you moved the guard"? (Behaviour.)
