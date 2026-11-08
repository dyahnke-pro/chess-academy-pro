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
