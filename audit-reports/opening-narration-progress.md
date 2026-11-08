# Opening narration — progress (branch `opening-narration`)

David's spec 2026-11-07/08 (PLAN.md "OPENING NARRATION + REVIEW'S DEEP DIVE"). Review's deep dive is NOT built (design with David first).

## Step 1 — the computer, wired into Learn (done)
- `src/services/openingSlip.ts`: ONE computer. Student left the book → ORDER (the move is the book's own next move, played early), SQUARE (the book moves the same piece elsewhere), LINE (anything else).
  - ORDER and LINE speak only when the move hands them a shot (mate in one, a piece they can win by SEE, a winning fork) or gives up one the book had (a pin; for ORDER a pin whose target is not out yet). A pin still there to play next move is delayed, not lost: silent.
  - SQUARE speaks the hang, or the book square's job (`bookMoveWhy`, plus what the student's move left undone — new `left` field).
  - Book builders: `mastersBook(history)` (masters' moves ≥ MIN_BOOK_GAMES, cached sync; named lines from `openingDetectionService.bookLinesThrough`) and `bookFromLines(proLines, history)`.
- Learn's `bookMove` board computer now reads `openingSlip` (computer renamed `openingSlip` in coachFact / computerRoles).
- Measured on David's record (local masters file, 954 games): he left the book in 278; 58 slips spoken (25 line-hangs, 21 square-job, 7 square-hangs, 3 order-hangs, 1 fork, 1 pin), 184 silent; 101 departures the old lane spoke are now silent (no tactic changed), 19 newly spoken (hangs it never said). Run: `OPENING_SLIP_MEASURE=1 DATA_DROP=<drop> npx vitest run src/services/openingSlip.measure.test.ts`.
- Tests: `openingSlip.test.ts` (14, real theory lines + his games), `bookMoveWhy.test.ts` registry cases updated, gate `learnNamesNoMoveUnasked` updated.

## Step 2 — the Openings Play rung, their departure (done)
- `bookMoveRead(history, student, proLines)` (openingSlip.ts): one read per move on the Play rung until the game leaves the book — the pro's pet lines (the line played, the main line, its variations), the masters' where those are thin. The student's departure says the opening slip (the same computer Learn reads); theirs says "They left the book with …" — `openingAnnouncement.leftBookSentence`, the one wording Learn's opening lane also says.
- `OpeningPlayMode`: warms the masters' book per board, reads `bookMoveRead` on each new move, speaks the line once (logged `coach-narration-spoken`, source `OpeningPlayMode.openingSlip`); a takeback past the departure opens the book again; a set-up position (trap lines from a FEN) reads nothing.
- Found on the way, fixed at the root: e9fe65e made the board teacher say "Your/Their knight …", and `reviewMoveBriefing.toClause` / `joinReview` only knew "The" as a subject, so every Review/lesson turn said "They play Nc6 — it their knight joins the fight" (the decision baseline caught it on 4 games). Both now read Your/Their as a subject; the baseline passes unchanged (no refresh needed). Test: `reviewMoveBriefing.test.ts` "keeps its subject" (red on the old code).
