# Card — `findMinorityAttack` (family F)

### A. Identity
- `findMinorityAttack(fen, color)` — `src/services/positionReadingService.ts:1078-1127`; the promise check `leverLeavesWeakPawn` :1144-1175. Also read inside `readPosition` (`positionalRead.ts:603-616`, kind `minority`, RANK 65).
- Adapter `minority` `boardComputers.ts:5762-5790`, kind `minority`, both seats ("You have a minority attack on the queenside — b5 makes contact and leaves them a weak pawn on c6" / "They have … leaving you a weak pawn on c3 to watch"). Surfaces: lesson, review, play, chat, think, learn (via thought), tactics; weaknesses: not.
- Census: 24 / 4 said; unsupported 7, already-said 9, in-flux 4. Map: P.

### B. Facts
- **B1** `MinorityAttack` :1062-1071: `flank`, `leverSan`, `leverFrom`, `leverTo`, `target` (the enemy pawn the lever hits — the future weakness).
- **B2 dropped**: the pawn counts per flank (`mine.length`, `theirFiles`, :1100-1104); the RECAPTURING pawn and the square the weak pawn will stand on (`recapturers`, :1162 — the true future weakness is the recaptured pawn, often not `target` itself); that the file is half-open (`for r … pawnAt(tf, r, color)`, :1173).
- **B3 cheap**: the mistake view — S had a minority attack on fenBefore and S's move made it impossible (pushed the wrong pawn, traded the lever pawn), or O's minority attack exists after S's move and S's move made the target pawn weaker (gave up a defender of the future weak pawn).
- **B4 gates**: ≥2 own pawns on the flank, strictly fewer than the enemy's FILES, enemy ≥3 files (:1104); no doubled own pawns (:1108); a legal quiet push landing diagonally on an enemy pawn of the flank (:1110-1121) that `leverLeavesWeakPawn`: the lever stands (SEE), a pawn recaptures, no other enemy pawn can guard the recaptured pawn, own file half-open (:1144-1175).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | flank, lever, target | general rule ("fewer pawns to leave their bigger group with a weak pawn"); the recaptured pawn's square |
| CONSEQUENCE | partly | "leaves them a weak pawn on c6" | the half-open file against it |
| BETTER MOVE + JOB | partly | leverSan (before-move pointer — names the student's next move) | after the move only |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MA1 | own plan missed | S | minority on fenBefore for S, best = the lever (or its prep), S played elsewhere, cost ≥ inaccuracy | flank, lever, recaptured square | "A minority attack uses fewer pawns to leave their bigger group with a weak pawn: two of yours against three of theirs on the queenside." / "Push the minority and trade: the pawn they take back with is left alone on a half-open file." | "c6 would be weak for the rest of the game." | "b5 was the lever." (past) | "In a Carlsbad-type structure, ask whether the minority attack is ready." | after | lever loses the pawn (SEE, :1157) | H + C (B2) |
| MA2 | prevent — their minority | O | O minority exists after S's move; S's move removed a guard of the future weak pawn or was passive (cost ≥ inaccuracy) | | "Against a minority attack, don't let them trade into a weak pawn: meet the lever with a pawn move of your own, or keep a piece guarding the square." | "c3 is left weak after b4-b5." | best | | after | | C |
| MA3 | knowledge — named | either | the Carlsbad structure on the board (namedStructure) | | "In the Carlsbad structure White's plan is the minority attack, b4 and b5." | | | | joins NS1 | | H |
| MA4 | record | — | `no-plan` RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- MA1: `no-plan` / `mistimed-pawn-break` (positionalReason :219-220). MA2: `created-pawn-weakness` (S's move weakened the future target).

### F. Build changes
1. Add to `MinorityAttack`: `counts {mine, theirFiles}`, `weakAfter: Square` (the recaptured pawn's square, from `recapturers`), `fileHalfOpen: true`.
2. Fix the claim: "leaves them a weak pawn on c6" names `target`; the weak pawn after the trade is the RECAPTURED one (often on the same square when …bxc6 recaptures, but not always) — say `weakAfter` (F1).
3. Learn: the before-move "b5 makes contact" pointer leaves Learn; MA1 after the move.
4. `mistakeLesson`: `no-plan` / `mistimed-pawn-break` + minority on fenBefore → MA1.

### G. Proof boards
- Review census: "They have a minority attack on the queenside — b4 is the lever, leaving you a weak pawn on c3 to watch." (seat O).
- Guard: doubled minority (:1108; "h3+h5 after gxh5" walk); lever lost by SEE; no recapturing pawn.

### H. Open questions
- none.
