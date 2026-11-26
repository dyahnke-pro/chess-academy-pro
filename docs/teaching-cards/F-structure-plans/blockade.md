# Card — `blockade` (family F)

### A. Identity
- `blockade(fenBefore, san)` — `src/services/blockade.ts:92-122`; `setRead` :124, renderer `blockadeLine` :141, `worthSaying` :85, `canPush` :65, `KNIGHT_ACTIVE = 6` :49. Uses the one blockade read `findBlockades` (positionReadingService).
- Adapter `boardComputers.ts:6937-6956`, kind `judgement`. Surfaces: lesson, review, play, chat, think, learn (via thought), tactics; weaknesses: not.
- Census: 22 / 21 said (T).

### B. Facts
- **B1** `BlockadeRead` :28-45: `kind` set|lifted, `side`, `piece`, `square`, `pawn`, `passed`, `unkickable`, `knightSquares`, `noBishop`, `key`.
- **B2 dropped**: on LIFTED, `canPush` proves the pawn can now step safely (:114) but the pawn's next square and its distance to queen are dropped; on SET, the SEE gate value (:106, `legalSeeGainFor(fenAfter, set.blocker, enemy)`) dropped.
- **B3 cheap**: LIFTED — what the pawn hits/threatens after one push, plies to queen, whether a piece of the blockader's side can re-blockade; SET-missed — the passer was free BEFORE the student's move and the student didn't blockade (passer pushed next): run `findBlockades` + passed pawns on fenBefore.
- **B4 gates**: not check/mate (:98); SET: moved piece lands in front, worth saying (N/B in front of a passed pawn or an isolated c–f pawn on its 3rd rank+; R/K only for passed; never a queen, :85-90), new (not there before, :105), safe (SEE ≤ 0, :106); LIFTED: quiet move (:112), blockader of a PASSED pawn left the square empty, pawn can push safely (:113-114).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | kind, piece, unkickable, noBishop | general rule clause exists ("While the blockade holds, the passed pawn goes nowhere") |
| CONSEQUENCE | partly | lifted → "can push again" | how far / what it hits |
| BETTER MOVE + JOB | no | — | engine best keeping the blockader |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BL1 | consequence — S lifted own blockade | S | kind lifted, side S, cost ≥ inaccuracy | piece, pawn | "Blockade a passed pawn and keep the piece there: the moment it leaves, the pawn runs." / "A passed pawn's blockader has one job, standing still: d4 is empty now, and the pawn on d3 can run." | "It reaches d2 next, two squares from queening." (B3) | "Keeping the knight on d4 kept the pawn frozen." | "When your blockader moves, re-check every push it was stopping." | after | the move wins material ≥ the passer's worth (costReason none) | H + C |
| BL2 | prevent — missed blockade | S | B3: O passer free on fenBefore, best move blockades, S played other, cost ≥ mistake | | "The square in front of a passed pawn is the place to stop it." | "It pushes next." | "Nd6 would have blockaded it." | "Every move, ask: is there a passed pawn, and who stands in front of it?" | after | — | C |
| BL3 | knowledge — best blockader | either | set, piece = knight | | "The knight is the best blockader: it stops the pawn and still hits squares around it." | | | | Review/chat | knightSquares < 6 | H |
| BL4 | knowledge — unkickable / no bishop | either | set, unkickable or noBishop | | "A blockader no pawn can ever kick, and no bishop of theirs can challenge, holds forever." | | | | Review | | H |
| BL5 | O lifted theirs | O | kind lifted, side O, and their move's cost ≥ mistake (it is their mistake) | pawn | "A blockader that walks away frees the pawn behind it: your pawn on b5 has its square back." | — (the push is the student's next move) | — | — | Learn: lesson only, never "push it" | their move not a mistake → silent | H |
| BL8 | phase — endgame | either | BL1/BL5 and `phaseOfFen` endgame | | "In the endgame a freed passed pawn is often the whole game: every piece has to drop what it is doing to stop it." | | | | after | middlegame → BL1 stem | C (phaseOfFen) |
| BL6 | IQP blockade | either | set, not passed (isolated) | | "Against an isolated pawn, blockade the square in front of it: the pawn is stuck and the square is yours." | | | | Review | | H |
| BL7 | record | — | `passed-pawn-neglected` (for BL1/BL2) RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- Cause names (errorWhy §D): BL1 → **E15 positional** (new concession `blockade-lifted`, F3) or **E12 allowed-threat** / **E11 allowed-capture** when the push wins something in the window; BL2 → E12 allowed-threat (the push it let through); BL5 → E15 read on their move (O seat); BL8 rides on BL1/BL5.
- BL1/BL2: no named cause today; nearest is `positionalReason` `passed-pawn-neglected` (tagged for the MOVER's own passer) — the blockade-lifted / blockade-missed mistake needs a cause `blockade-lifted` (S let THEIR passer run). Today it can only arrive via costReason `allowed` if the passer wins material within the window.
- BL3/BL4/BL6: Review/chat; BL5 seat O.

### F. Build changes
1. Add to `BlockadeRead`: `pushTo: Square|null`, `toQueen: number|null` (LIFTED, from `canPush`).
2. New `blockadeMissed(fenBefore, san, best)` (BL2).
3. New `DrawbackKind 'blockade-lifted'` in `concessionBeat.ts:30` (S's move lets an enemy passer push) — mapped to `passed-pawn-neglected` or a new tag (H1).
4. `mistakeLesson`: `blockade-lifted` → BL1/BL5.

### G. Proof boards
- SET: `vc-1rcEbI44WqE-67` (`8/1ppkb3/2n1pr1p/2PrB1p1/3PR3/5N1P/P5PK/4R3 b`) bishop on e5 blockades e6; `vc-1PI3xfMiUE4-24` (their Nd4 in front of your passed d3, knight covers eight); `vc-1zfJ7ABoh8k-50` (their Rb6 blockades your b5).
- LIFTED: none in the census lines shown; find in the build.
- Guard: check moves (:98), queens as blockaders (:86).

### H. Open questions
1. New tag for "let their passer run" vs reuse `passed-pawn-neglected` (whose note says "the better move makes a passed pawn")?
