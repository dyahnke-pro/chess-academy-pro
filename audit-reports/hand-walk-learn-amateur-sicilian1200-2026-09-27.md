# Learn walk — amateur game 1ZmVtbO3 (Sicilian, Delayed Alapin, 1194 v 1299), White at 1200, 2026-09-27

**~36 of 40 distinct narration lines correct (90%)** — the ply-15 cluster (5 lines) is a CHAT ANSWER (`assemblePositionAssessment`) to the walk's dictation text on that turn, not narration, and is excluded; 37 of 45 (82%) if it is counted. The hardest game of the night: the student's side makes a mistake nearly every move from 27 on, so the verdict lanes all fire at once.

| ply | flag | status |
|---|---|---|
| 37 | Bxc5 Nxc5 recapture called "that sacrifice doesn't land" | FIXED — overvalued-attack excludes a capture on the square the opponent just captured on (no unit test: a synthetic line did not reach the detector, so the test was vacuous and was deleted; verified by re-walk) |
| 15 | bishop pair said twice | the second was the chat answer's balance sheet (instrument); the balance-sheet reason is now keyed `student-bishop-pair` anyway |
| 49 | "Qxc8 was the move" then "you'd love to play Qxc8 — it falls apart" — true about two different moments, contradictory when heard together | OPEN (lane timing) |
| 37 | back-rank sentence twice in one utterance | OPEN |
| 11/15 | "castling is ready" at moves 6 and 8 | the second was the chat answer; the positional read's keys are now also written to the standing memory the phase lane reads |
| 3 | "It's the Modern Variations." — a generic DB label | OPEN |
| 15 | stray "Material is even" + the cluster above | instrument: the dictation turn produced a position-assessment chat reply. OPEN QUESTION: why "play X" routed as a question on that turn — worth checking it is not a real routing bug |

## Re-walk (same game)
**~37 of 40 distinct narration lines correct (93%)**, up from 90%. No "failed sacrifice" on the recapture; no stray chat answer this run (so that one is intermittent — instrument timing); the bishop pair said once. Fixed after this run: the tempting read now opens "Now, you'd love to play…", so it cannot read as contradicting the verdict on the move just played; the timing clause names the piece that answers ("their queen would have taken on a8 and won your queen"). Still open: the back-rank sentence twice in one utterance (ply 37), "It's the Modern Variations".

## Re-walk 2
"Modern Variations" gone (the move-2 beat is now the principle behind Nf3); ply 49 reads "Qxc8 was the move… Now, you'd love to play the queen taking on c8 — but they take back and it falls apart", so the two moments are distinct. The back-rank line still repeats at ply 37. Diagnosis: the concept instance key the instant lane now writes DOES match the composer's (squares g8/d8/d1 on both), but the late composer snapshots `alreadySaid` before the instant lane records the tactic — an ordering race, not a key mismatch. OPEN: record the instant lane's claims before the late composer reads the ledger.

## Re-walk 3 — the claim ledger
**~46 of 50 distinct lines clean (92%)** (the ply-15 dictation-turn chat answer excluded, as before). Ply 37 now says the back-rank threat ONCE: every fact carries the claim it makes (`VoiceFact.claims`, `conceptInstanceKey`), and the voice package drops a fact whose claim is already in the game's spoken ledger at SPEAK time — so the lane that computed first cannot repeat a claim another lane spoke first. `claimKeyParity.test.ts` proves both lanes key the back-rank geometry identically on this position.

Flagged this run, fixed after it (each fenced on the real position in `replayFence.sicilian1200.test.ts`, real Stockfish lines, every fix negative-controlled by reverting it):

| ply | flag | root cause | fix |
|---|---|---|---|
| 33 | "your bishop takes on d4 and then gets trapped" — it was taken on the spot | poisoned-pawn never asked whether the grabber FLED | the detector counts flights; 0 = "that pawn was defended … taken on the spot" |
| 33, 37 | "That eyed the pawn on g7/b7, but the king/queen holds it" on two captures | the geometry reader took what the piece sees from its new square as the move's idea | a capture's idea is the capture; the eyed branch is for non-captures |
| 47 | "Nf6+ was a mistake — it let them in with Kg7" | the fallback named the first reply even when the check forced it | a forced non-capture reply to a check is not named |
| 15 | the dictation "play e6" answered as a position read (Look ahead + Material is even) | instrument timing, intermittent | OPEN question (routing), not narration |
