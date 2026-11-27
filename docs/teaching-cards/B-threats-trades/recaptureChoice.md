# recaptureChoice — which piece takes back, and why

## A. Identity
- File: `src/services/recaptureChoice.ts` (171 lines): `recaptureChoice(fenBefore, playedSan, theirReply, namesPlayedMove)` (129–171), `readRecapture(fenBefore, m, me, theirReply)` (73–~110, the facts), `recaptureOpensFile` (64–71), `hitWithTempo` (40–54).
- Registry: student's move only (`studentMove` adapter); kind `rule`. Reach: learn door, review, lesson, chat, tactics (tapped no). Census: 21 lines (16 said): "Bxf3, not gxf3, which would double your pawns on the f-file." / "Nxd4 — the knight lands in the centre on d4. Qxd4 would just lose the queen to Bxd4." Run: 33 fires (14 student recaptures; 19 opponent recaptures run for the census of the facts — the words are the mover's, so the registry never says those).

## B. Facts
- **B1** a sentence. Internally `RecaptureFacts {san, plus[], minus[]}` (16–25) for the played recapture and the first other option.
- **B2 dropped:** `readRecapture`'s full plus/minus lists for BOTH recaptures — only the differences, and only `plus[0]` / `minus[0]` (152–156); options beyond `options[0]` (148) — with three ways to take back, the third is never compared; the `hitWithTempo` move (the kick) is in words only.
- **B3 cheap:** export `readRecapture` per option (every recapture's facts): the recapture-mistake explanation (the played one's `minus`) comes for free — today the function **refuses** to explain a faulty recapture by design (the header 118–127: "a recapture that is a fault is the one error computer's to explain") and `errorWhy` does not read these facts.
- **B4 gates:** the played move captures, no promotion (142); another recapture on the same square exists (145); only differences are spoken (151–153); a placement-only plus ("the knight lands in the centre") is said only against the other's cost (165–167). No cost gate in the computer — the header (118–125) says the CALLER must not ask on a faulty recapture, and a caller does: the run found the praise on a costly recapture: g chesscom-1020779996 ply 63 Rxg2 (cost 217) "Rxg2, not Qxg2, which would just lose the queen to Bxg2."

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | the plus / minus clause ("would double your pawns") | the rule ("take back toward the centre"; "recapture with the piece that doesn't …") |
| CONSEQUENCE | yes | minus ("would just lose the queen to Bxd4") | — |
| BETTER MOVE + JOB | partly | the other recapture named | for a FAULTY recapture: refused by design |
| HABIT | no | — | "Before you take back, compare every way to take back." |

## D. Lesson recipes
Cause **RC-WRONG** (S): the student recaptured, another recapture existed, the student's recapture cost ≥ floor, and `readRecapture(played).minus` is non-empty (or the better recapture's plus explains the cost).

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RC1 | consequence (structure) | S | RC-WRONG, minus doubles / isolates | file | "Which pawn takes back decides your structure: that recapture doubled your pawns on the {file}-file." / "Take back toward the centre, and with the pawn that keeps your pawns together." | "Doubled pawns can't guard each other." | "{other} kept the pawns together." | "Before you take back, compare every way to take back." | full; "that recapture" (never the SAN) | the doubling opens a file the engine likes (cost < floor) | C (B3) |
| RC2 | consequence (loose recapturer) | S | RC-WRONG, minus "would just lose the {piece}" | piece, taker | "Recapture with the piece that can't be taken: your {piece} on {sq} is hit by {taker}." | "You lose the {piece}." | "{other}." | same | full | — | C |
| RC3 | consequence (queen kicked) | S | RC-WRONG, minus queen hit with tempo | kick | "Taking back with the queen often hands them a tempo: {kick} hits it at once." | "They develop with gain of time." | "{other}." | same | full | — | C |
| RC4 | consequence (castling) | S | RC-WRONG, king recapture with rights | — | "Taking back with the king gives up castling for good." | | "{other}." | | full | queens off (then the king recapture is often fine) | C |
| RC5 | knowledge (open file) | S | the better recapture's plus is "opens the {file}-file for your rook" | file | "A pawn recapture away from the centre can still be right when it opens a file for your rook." | | "{other} opened the {file}-file." | | full | — | C |
| RC6 | opponent seat | O | their recapture's minus | — | Review only ("They took back with {x}, doubling their pawns") — no student mistake | | | | | | C (seat words must flip: today the facts say "your") |
| RC7 | record | S | — | — | RED/GREY full · AMBER one clause · GREEN silent | | | | | | `holdState` on `wrong-recapture` (new) |

Not applicable: calculate a line (one-move comparison), plan.

## E. Mistake link
- Student: a recapture that cost — `costReason` **allowed** when material follows (RC2), else `positionalReason` (doubled / isolated: no tag today; `misplaced-piece` for the queen) — this computer names the specific reason. Needs a `MistakeCause` member `wrong-recapture:<minus kind>`.
- Opponent: RC6 (Review).

## F. Build changes
1. Export `readRecapture` and make its plus/minus typed: `{ kind: 'opens-file' | 'toward-centre' | 'away-from-centre' | 'doubles' | 'isolates' | 'frees-bishop' | 'centre-knight' | 'loses-piece' | 'queen-kicked' | 'castling', file?, square?, by? }[]` (B2/B3).
2. Lift the "never explain a faulty recapture" rule (118–127): `errorWhy` reads `readRecapture(played).minus` as the cause of a recapture mistake (RC-WRONG); `recaptureChoice` the sentence stays Review's for a sound recapture only — gate it on the move's cost < 50 (the run's Rxg2 praise at 217 cp must go silent).
3. Compare every option, not `options[0]` (148).
4. Seat words: the facts are written "your" — take the seat as a parameter so RC6 can be said for their recapture.

## G. Proof boards (run)
- RC-WRONG guard (praise on a costly recapture, must go silent): g chesscom-1020779996 ply 63 Rxg2 (student, cost 217).
- Sound recapture (Review): g chesscom-1018307238 ply 20 …Bxe3 "not …Qxe3, which would just lose the queen to fxe3" (cost 0); ply 12 …exd4 (cost 4).
- Their doubling (RC6): g chesscom-1036689856 ply 31 Kxe3 (opponent, cost 124) "not fxe3, which would double … pawns".
- Census: lines-1.jsonl:100, 1098, 2642.

## H. Open questions
- none.
