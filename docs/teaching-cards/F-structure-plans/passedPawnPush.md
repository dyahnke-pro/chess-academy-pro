# Card — `passedPawnPush` (family F)

### A. Identity
- `passedPawnPush(fen, studentColor, passedSquare)` — `src/services/reviewTeachingPoints.ts:268-306` (returns a string). Adapter `passerPush` `boardComputers.ts:5743-5758`: takes the student's FIRST passer only (`passedPawns[student][0]`, :5745 — a second passer is never read) (skips when it is the pawn just `pushed`), kind `passer`.
- Surfaces: lesson, review, play-read, chat, think, learn (via thought), tactics-read; weaknesses: not ("an opportunity a move may take or leave without a fault").
- Census: 173 / 48 said; already-said 101, unsupported 13, beside-mate 7. Concept: "push it; its blocker is poor".

### B. Facts
- **B1** a STRING only: "your passed pawn on X is N pushes from queening — push it[, and their knight is a poor blocker]".
- **B2 dropped (all inside the function)**: `knightOnPath` (:281-288 — true when their knight stands on the path OR merely attacks a path square), `pushes` (:308, `pushesToPromote`), the race verdict `race.youQueenFirst` (:295-296), `kingCatchesPasser` result (:294), SEE on the front square (:304). None typed.
- **B3 cheap**: the mistake view — the student HAD this passer on fenBefore, the engine's best was the push (or a move supporting it), the student played something passive: cost of not pushing (saved read: best vs played). And the opponent's passer (same function, other seat) — today student only.
- **B4 gates**: student passer exists (adapter); king doesn't catch it now (:294); not losing a race (:296); the front square not lost by SEE (:300-306). The adapter marks the fact `namesStudentMove: false` (:5751) although the text says "push it" — the student's next move — so the Learn gate never treats it as naming a move.

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | the string ("push it") | typed fields; it is a BEFORE-move instruction ("push it") — names the student's next move |
| CONSEQUENCE | partly | pushes | what happens if not pushed (blockade arrives, king comes) |
| BETTER MOVE + JOB | partly | the push (engine best) | only after the move |
| HABIT | no | — | skill `passed-pawn-neglected` |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PP1 | counterfactual — S didn't push | S | B3: passer on fenBefore, best = the push (or supports it), S played other, cost ≥ inaccuracy | pawn, pushes | "Passed pawns must be pushed: the d-pawn was two pushes from queening, and every move you wait lets them bring a blocker." / "A passed pawn grows stronger the further it goes, and one that stands still gives them time to blockade it." | "Their king reaches d7 now and stops it." (if the king's distance shrank) | "d7 was the push: it's one square from queening, and their queen has to stop it." (after) | "Every move, ask: can my passed pawn go forward?" | after the move | push loses the pawn (SEE, :304) | C (B3) |
| PP2 | knowledge — knight poor blocker | either | knightOnPath | | "A knight chasing a pawn from the side is slow: it can stop the pawn only by landing in front of it." (only when `knightOnPath` is true by ATTACK, not by standing in front — see blockade BL3 and H1) | | | | Review/chat — word carefully (H1) | | C |
| PP3 | prevent — their passer | O | same function for O's passer, S's move didn't stop it | | "Their passed pawn is the danger: the square in front of it is where you stop it." | | | | after S's mistake | | C |
| PP4 | record | — | `passed-pawn-neglected` RED/GREY full; AMBER "The passer wanted to move."; GREEN silent | | | | | | | | |
- Not applying: before-move "push it" (deleted under this WO).

### E. Mistake link
- Cause names (errorWhy §D): PP1 → **E15 positional** `passed-pawn-neglected`; PP3 → **E12 allowed-threat** (their passer's push) or blockade BL2; PP2 Review/chat.
- PP1: `positionalReason` `passed-pawn-neglected` (`positionalReason.ts:214` "The passed pawn on X wanted to move") — this computer is its lesson (with the count). Seat S.
- PP3: seat O (S ignored their runner) — joins blockade BL2.

### F. Build changes
1. Return a typed `PasserPush { pawn, pushes, knightOnPath, raceSafe, kingCatches }` instead of a string; the string renderer moves to Review/chat.
2. Run it for BOTH seats and EVERY passer (today student only, first passer only, adapter `:5745`).
2b. Adapter `:5751`: `namesStudentMove` must be `true` while the text says "push it" (it names the student's next move); with the typed return (F1) the Learn path speaks only PP1 after the move.
3. Learn: delete the before-move "push it" instruction path (adapter is board-read on the student's turn); PP1 is read on fenBefore after the move.
4. `mistakeLesson`: `passed-pawn-neglected` → PP1.

### G. Proof boards
- `vc-_ZmPtTJHfNI-66` (`6k1/4Q3/p2P2pp/8/1ppq4/7P/2P2PPK/8 w`) "d6 is two pushes from queening — push it" (a before-move instruction said in a lesson).
- `vc-_X7t6o3o6JM-42` (`3r3k/pp2N3/4brp1/2n4n/3R2P1/4P3/PPP5/1K3B1R w`) e3 five pushes, knight a poor blocker.
- Guard: king catches it (:294); a race lost (:296); front square lost (:304).

### H. Open questions
1. "Their knight is a poor blocker" conflicts with the classical "the knight is the best blockader" (blockade card): keep the knight note only when the knight is NOT in front (it chases from the side)? Owner call on wording.
