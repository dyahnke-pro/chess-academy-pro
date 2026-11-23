# Card — `centreDuo` (family F)

### A. Identity
- `centreDuo(fen, student)` — `src/services/centreDuo.ts:22-50`. Adapter `boardComputers.ts:7195-7212`, kind `structure`, `NOT_ENDING`. Surfaces: lesson, review, play-read, chat, think, learn (via thought), tactics-read; weaknesses: not.
- Census: 21 / 3 said; not-said: already-said 9, unsupported 8.

### B. Facts
- **B1** `CentreDuo` :20: `side`, `duo` [two squares], `deformed` [{square, why: doubled|isolated}], `text`, `squares`.
- **B2 dropped**: the loop overwrites `duo` with the LAST pair found (:31-34) — a side with two duos (c+d and d+e) reports one; the rank (4th vs 5th) is dropped.
- **B3 cheap**: the move that **deformed** the centre (fenBefore no doubled/isolated d/e pawn, fenAfter yes — usually a recapture away from the centre, e.g. …exd5? or a trade that doubles); whether the duo can push safely (findPawnBreaks/landing safety); the square in front of the deformed pawn (a blockade/hole).
- **B4 gates**: duo on neighbouring files c–f, both on the side's 4th or 5th rank (:27-35); other side's d/e pawns include a doubled pair or an isolated pawn (`findWeakPawns`, :37-42); not an ending.

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | duo, deformed.why | the general rule ("two pawns side by side…"), the move that caused the deformity |
| CONSEQUENCE | partly | "cannot meet them as a pair" | which push comes and what it hits |
| BETTER MOVE + JOB | no | — | engine move that avoided the deformity |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CD1 | consequence — S deformed own centre | S | B3: S's move made S's d/e pawn doubled/isolated and O has a duo after; cost ≥ inaccuracy | O duo, S pawn, why | "Doubled centre pawns can't meet two pawns side by side: their e4 and f4 now roll, and your d-pawns can't stop them as a pair." / "A centre pawn with no neighbour can't challenge a duo." | "e5 is coming, and it kicks your knight." (if O's push hits a piece) | "Taking back toward the centre kept your pawns together." (engine best recapture) | "Recapture toward the centre." | after | the doubled pawns are guarded and harmless (harmlessWeakPawns) | C |
| CD2 | O did it | O | B3 on O's move | S duo | "Their recapture doubled their e-pawns: your c4 and d4 can now advance as a pair." | — | — | — | after their mistake | — | C |
| CD3 | knowledge — duo | either | duo | | "Two pawns side by side cover each other's squares in front and can advance together — the strongest pawn shape in the centre." | | | | Review/chat | — | H |
| CD4 | record | — | no skill → full | | | | | | | | |
- Not applying: endgame (gated).

### E. Mistake link
- CD1: `positionalReason` concession `pawn-weakened` (`concessionBeat` `DrawbackKind`) on a d/e pawn — the lesson when the opponent ALSO has a duo. Seat S. CD2 seat O.

### F. Build changes
1. `centreDuo.ts:31-34` — keep every duo (array), not the last; add `rank`.
2. New `deformedBy(fenBefore, san)` — the move made the mover's d/e pawns doubled/isolated (findWeakPawns diff). Enables CD1/CD2.
3. `mistakeLesson`: `pawn-weakened` + centreDuo on the other side → CD1/CD2.

### G. Proof boards
- `vc-1rcEbI44WqE-10` (`rnbqkb1r/ppp1pppp/1n6/4p3/2PP1P2/8/PP4PP/RNBQKBNR w`) — fires: "c4 and d4 … their central pawns are doubled (e7 and e5)".
- Guard: no deformity → silent; endings.

### H. Open questions
1. "Recapture toward the centre" is a habit stem the coach already uses elsewhere? Confirm one shared wording.
