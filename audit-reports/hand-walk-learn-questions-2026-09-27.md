# Learn question walk — Blumenfeld (e1zhfnut), Black at 1599, 2026-09-27

David: "throw in some questions … make sure the coach can answer board specific
questions. Ask if a sacrifice is sound … next level questions. And basic ones."
25 questions asked mid-game on the real board; each answer read against the board.

## Question lanes

| # | position | question | answer | verdict |
|---|---|---|---|---|
| Q1 | after 5.b3 | Is b5 a sound sacrifice? | "B5 isn't a legal move in this position." | ❌ played move treated as hypothetical |
| Q2 | after 5.b3 | What is White threatening? | eyeing b5, ~1 point | ✅ |
| Q3 | after 5.b3 | Is my b5 pawn hanging? | "Your pawn on b5 is hanging." | ✅ thin |
| Q4 | after 5.b3 | Who stands better and why? | "Neither side has anything concrete…" | ❌ no verdict |
| Q5 | after 7.cxb5 | Did I get enough for the pawn? | +0.3 then two weaknesses | 🟠 no material/compensation read |
| Q6 | after 7.cxb5 | What should I play here? | d4, stakes out the centre | ✅ |
| Q7 | after 11.O-O | Is my king safe? | safe | ✅ |
| Q8 | after 11.O-O | What is their plan? | Bd3 active, contest c/d files | 🟠 misses the e4 break the narration names next move |
| Q9 | after 13.Nxe5 | Should I take back with the pawn or the queen? | **TOOK BACK THE EXCHANGE** | 🔴 question routed as a takeback command |
| Q10 | after 13.Nxe5 | Should I recapture with the pawn or the queen? | "best move dxe5, wins the knight" | ❌ no comparison (…Qxe5?? Bxe5), "wins" for a recapture |
| Q11 | after 13.Nxe5 | What's hanging? | "Nothing of yours" | ❌ their knight on e5 is there to take |
| Q12 | after 15.Be2 | Why did they play Be2? | "Which player do you mean? Open a pro's page…" | ❌ routed to the pro-games lane |
| Q13 | after 15.Be2 | What is their plan? | Be2 most active, c/d files, f3 break | 🟠 |
| Q14 | after 16.Nf1 | Why Nf1? | "Nf1 isn't a legal move" | ❌ played move |
| Q15 | after 16.Nf1 | Why did they move the knight to f1? | best move Rfd8 | ❌ wrong lane |
| Q16 | after 18.Ng3 | Is my queen safe? | in trouble, g3 knight hits it | ✅ |
| Q17 | after 18.Ng3 | What happens if I take on b5? | "B5 isn't a legal move" | 🟠 true, but "nothing of yours can take on b5" |
| Q18 | after 21.Bxd6 | Who stands better and why? | 2.3 against, dark squares, c-file | 🟠 reasons don't explain the number |
| Q19 | after 21.Bxd6 | What should I play here? | Rxd6 | ✅ |
| Q20 | after 26.Rec1 | Is my d-pawn strong? | best move f5 | ❌ no passer read |
| Q21 | after 27.Rxc5 | Can they take on c5? | "I can't verify that…" | ❌ refusal; SEE exists |
| Q22 | after 32.Rxa8 | Can I win even though I'm down a piece? | material count only | ❌ no verdict |
| Q23 | after 33.Rc8 | Is it a sound sacrifice to promote on d1 with check? | grades d2 | ❌ answers the previous move |
| Q24 | after 33.Rc8 | What happens if I play d1=Q+? | "best move, gives check" | ❌ no line (…Bxd1 Rxd1#) |
| Q25 | after 33.Rc8 | Can I checkmate them? | "Yes — mate in 2" | 🟠 withholds the move on Learn |
| Q26 | after …Bxd1 | Is it mate if I take on d1 with the rook? | yes, twice in two stems | ✅ (double stem) |

## Narration

- N1 After 13.Nxe5 and after 27.Rxc5: "You'd love to play the natural move … Ne4 / Bd5" while a piece is
  waiting to be taken back — the natural move is the recapture.
- N2 After Rxd1#: "The position is roughly balanced. Their king on g1 has no escape square…" — narration after checkmate.
- N3 Recapture spoken as "wins the knight".
- N4 "Qd7 was a blunder — it let them in with Bxf6" — verify with the engine.
- N5 "f5 was the move — the idea is to walk the rook round to c8" — the idea is not f5's.

## Instrument (not product)
- `/setline` resets only the driver's own move list, not the page; `/open` does not reset it. Replay by dictation.

## Fixed (2026-09-27)

| flag | root cause | fix |
|---|---|---|
| Q9 | undo pattern `take.{0,15}back` claims the chess word for recapture | recapture sense + advice form → never an undo (`coachSessionRouter.recapture.test`) |
| Q1, Q12, Q14, Q15 | a named move is judged only against the board NOW | `tapeMoveRef`: illegal now + on the tape → the played move (retrospective lane) |
| Q1 | `normalizeSan("b5")` → "B5" (bishop) | a lower-case b straight onto a rank is the b-pawn |
| Q23 | "promote on d1" → "d1", illegal | pawn to the last rank reads as =Q; a legal named move beats the last-move grade |
| Q24 | candidate answer had no line; a best-move sac skipped the soundness verdict | `candidateLineUci` threaded; sac verdict before the affirm; "The line: …" |
| Q10 | no two-move lane | `compareMovesAsk` + `assembleCompareMovesAnswer` (worse move shown refuted) + only-one-can-take |
| Q21 | no capture-on lane | `captureOnAsk` + `assembleCaptureOnAnswer` (SEE) |
| Q11 | hanging read scanned one side | unscoped ask reads both sides |
| Q25 | mate lane said only "mate in N" | the engine line to the mate; plan built for mate asks |
| Q4, Q5, Q18 | assessment: dodge variant, material ignored | "It's level…"; material vs eval ("the compensation is real") |
| Q22 | endgame lane beyond the tablebase fell to a material count | falls back to the assessment |
| N1 | tempting move chosen with a free recapture on the board | a tempting move must out-appeal the best move |
| N2 | assessment after mate | a finished game is its result |
| N3 | "wins the knight" for a recapture | "takes back" when it only restores the count |

Still open: Q20 passer read ("is my d-pawn strong?"), Q8/Q13 plan answers thin, Q18 big-eval "why", N4 verify Qd7, N5 "f5 was the move — the idea is to walk the rook".
