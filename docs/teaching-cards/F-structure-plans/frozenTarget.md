# Card — `frozenTarget` (family F)

### A. Identity
- `frozenTarget(fen, student)` — `src/services/frozenTarget.ts:132-181`; `frozen` :97, `reachers` :86, `reach` :52, `safeOn` :47.
- Adapter `boardComputers.ts:7832-7850`, kind `structure`; skill `created-pawn-weakness` filed when the frozen pawn is the student's (:7840).
- Surfaces: lesson, review, play-read, chat, think, learn (via thought), tactics-read, **weaknesses: wired** (`moveInsight.ts`) — one of the few in this family wired to the record.
- Census: 193 / 81 said; not-said: already-said 103, beside-mate 6.

### B. Facts
- **B1** `FrozenTarget` :22-29: `side` (who wins it), `pawn`, `attackers: Reacher[]` / `defenders: Reacher[]` (`{square, type, moves: 0|1|2}`), `text`, `squares`.
- **B2 dropped**
  - WHY the pawn is weak: `findWeakPawns` gives isolated/backward/doubled separately (:139) and the three are merged into one set — the kind is dropped (the lesson differs: "an isolated pawn…", "a backward pawn on a half-open file…").
  - WHY it can't move: blocked square vs enemy pawn covering the step (:104-110) — dropped.
  - The `moves` per reacher is kept but never spoken as timing ("in two moves").
- **B3 cheap**
  - The move that MADE it frozen/weak (the mistake): compare `frozenTarget` on fenBefore vs fenAfter of a move — newly frozen pawn of the mover's = the move created a target. Or the last pawn move that left it without neighbours (findWeakPawns before/after).
  - The defender the student could have added (from the saved engine read's best move: does it increase `defenders`?).
  - Count in moves: attacker arrival `max(moves)` vs defender arrival.
- **B4 gates**: game not over (:135); pawn in `findWeakPawns` (:139); `frozen` — can't step, can't capture, no own pawn on a neighbouring file level or behind (:97-130); ≥1 attacker; **attackers.length > defenders.length** strictly (:145); reach ≤ 2 moves to a SAFE hitting square (`legalSeeGainOn < 1`).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | pawn, frozen, counts ("no pawn can come to its aid") | the weakness kind (isolated/backward/doubled) to pick the general rule |
| CONSEQUENCE | yes | counts → "will fall" | which comes first / how many moves |
| BETTER MOVE + JOB | no | — | engine move that adds a defender or trades an attacker |
| HABIT | partly | skill `created-pawn-weakness` filed | habit stem |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FT1 | consequence — S's move created it | S | B3: S pawn newly frozen+outnumbered after S's move, cost ≥ inaccuracy | pawn, kind, counts | "A pawn that can't move and has no pawn behind it is a target for the rest of the game: d5 is one now." / "Once no pawn can ever guard d5, only pieces can — and they have more pieces for it than you do." | "Four of theirs can reach it, three of yours can guard it: it falls." | "Keeping the c-pawn back kept d5 guarded." (engine best if it keeps a neighbour) | "Before you move a pawn, ask which pawn it stops guarding." | after the move | attackers ≤ defenders | C before/after |
| FT2 | prevent — the defender missed | S | frozen S pawn before S's move, S's move didn't add a defender, the best move did, cost ≥ mistake | counts before/after | "Count before you let a pawn go: d5 needed one more guard." / "When attackers outnumber defenders, the pawn falls unless you add a guard or trade an attacker." | "Their knight takes it next." | "Nb3 added the guard d5 needed." | "Every move, count the attackers and defenders on your weak pawns." | after | best doesn't change the count → BM slot dropped | C (count after best) |
| FT3 | own plan — siege | S | side = S (their pawn) | attackers | "A frozen pawn is the best target on the board: it can't run and nothing can come to help — bring every piece to bear on it." | "c3 falls when the fifth piece arrives." | — | — | Review; Learn only as consequence of THEIR mistake (they let it freeze) | — | H |
| FT4 | O mistake | O | B3 on O's move (their pawn newly frozen) | | "Their pawn move left c3 with no pawn behind it — a target for the rest of the game." | counts | — | — | after their move | — | C |
| FT5 | knowledge by kind | either | weak kind (B2) | | isolated: "An isolated pawn can only be guarded by pieces." / backward: "A backward pawn on a half-open file is a target, and the square in front of it is a hole." / doubled: "Doubled pawns can't guard each other." | | | | as LESSON variant of FT1/FT4 | kind exposed | C (B2) |
| FT6 | strategize — find play elsewhere | S losing it | side = O, S can't add a guard | | "When a pawn can't be held, don't spend every piece guarding it: make play where they're weak." | — | — | — | Review/chat | — | H |
| FT7 | phase — endgame | either | ending | | "Weak pawns are a small problem in the middlegame and a big one in the endgame: here it decides." | | | | Review | — | H |
| FT8 | record | — | RED/GREY full; AMBER "d5 is out-counted."; GREEN silent | | | | | | | | |
- Not applying: combination with tactics (a falling pawn is a count, not a motif) — see pictureTarget card for the shared count.

### E. Mistake link
- FT1/FT2: `positionalReason` concession `pawn-weakened` (S) and costReason `allowed` (pawn) — frozenTarget is the lesson for the pawn costReason names when the pawn is frozen.
- FT4: O's `pawn-weakened`.
- FT3/FT6/FT7: Review/chat.

### F. Build changes
1. `frozenTarget.ts:22-29` — add `weakness: 'isolated'|'backward'|'doubled'` (from :139 — keep which list the pawn came from) and `why: 'blocked'|'covered'` (:104-110). Enables FT5.
2. New `frozenBy(fenBefore, san, student)`: the pawn newly frozen and outnumbered by THIS move (fenBefore no / fenAfter yes) → enables FT1/FT4 as a mistake attachment.
3. `mistakeLesson`: cause `pawn-weakened` (concessionBeat) → FT1; costReason `allowed` on a pawn that `frozenTarget` reports → FT2.
4. Delete the long count recital in the text (:160-166 "Four of their pieces can reach it, their knight on f6, queen, knight on b8 …") from the Learn path — the recipe says the count, never the roll-call.

### G. Proof boards
- `vc-_WmByfLW-3g-16` (`rn1q1rk1/pp1bppbp/5np1/3P4/2BP4/2N2N2/PP3PPP/R1BQK2R w KQ -`) d5 four vs three — FT2/FT6 board.
- `vc--9fPYlSEkJ0-26` (`2rq1rk1/pp4pp/1b2pp2/1P1pn3/5Bn1/N1P3PN/P3PP1P/R2Q1RK1 w`) their c3 five vs four — FT3 board.
- Guard: a weak pawn with equal count (attackers ≤ defenders, :145).
- Seat check needed: `vc-_zT8aWZh2x0-44` (White to move) says "Your pawn on b7" — b7 is Black's pawn; the student seat on that voiced board must be Black. Verify in the build (§H2).

### H. Open questions
1. FT6 ("don't defend a lost pawn, play elsewhere") is a judgement — Review only, or allowed after a mistake?
2. Seat on `vc-_zT8aWZh2x0-44/51` lines — confirm the census student seat is Black there (not a defect if so).
