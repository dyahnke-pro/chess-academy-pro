# Learn replay — David's Smith-Morra (teach-mvfhdihq-7i8vk5), his record loaded, 2026-10-19
Engine: Stockfish depth 16. Replay: learn-replay-…20-15-39-411Z.json (+ .graded.json)

## 1 Leaks the student's next move (Learn names no move unasked)
- 2.d4: "Strong players play Nf3 here" (said for the position after cxd4, student to move)
- 3.c3: "your bishop on f1 usually goes to c4 (Bc4)"
- 8.Bxf7+: "Look ahead — if you play the knight to d5 … your rook to e1 …"
- 12.Qb3: "Two plans hold … getting the queen to h4"
- 25.Rf1+: after …Kg8: "Nhf6+ comes with check … After Nhf6+, exf6, Nxf6+, your knight forks …"
- 26.Nhf6+: "the plan: getting the knight to g4, by way of f6, to take the bishop"
- 27: "Their bishop on g4 has nothing defending it, so taking it costs you nothing back"
- 15/16/43: "Take it — one capture removes the queen/bishop/knight doing it"
## 2 Contradictions
- 15: "Take it — one capture removes the queen" (Qxb4) → 16: "Why not Qxb4? … Bxf2+ refutes it"
- 46: "Kg6 was the only move that kept the win" + "Two moves keep the win here" (eval +6.8, decided)
## 3 Late / stale lines
- 17→18 and 48→49: last sentence of a plan line spoken a turn late ("Nothing of theirs can stop your pawn on d6" with the pawn on d7)
- 37→38: "What's the priority here?" — answer spoken a move later
- 30: "their knight on c6 gets there in three" after …Nd4
## 4 Missed / wrong verdicts (engine)
- 14.Rd5 −201cp (best e5): no verdict
- 10.Bf4 −107cp (best Qb3): no verdict
- 19 …Rxb2 gave ~207cp: called "imprecise"
## 5 Repeats
- plan lecture 4 and 5 verbatim; g6 plan 17 and 18; "knight on f6 hides their king" 27/29/30
- same line twice in one turn: 16, 23, 27, 43, 47, 48
## 6 Length — avg 106 words/turn (target avg 80), max 385 (move 8)
## 7 Bad reasons / garble
- 1.e4 "to free your bishop on f1 for Be2"; 11 "…Qa5 first, so that …Rf8"; 22 "Nd5 first, so that b4"; 29 "Nf6 first, so that g4"
- 3 "It's the Accepted of the Sicilian Defense"; 17 ". ."; 15/21 "Rook to g5 takes your rook out of the attack"; 34 "capturing their rook on f4 removes the guard of your king"
- 48: plan lecture on a forced-mate turn
## Instrument
- every line captured twice (SAN copy + spoken copy) — grader collapses them
- grader v1 misreads played-out lines / future plans as false claims — tighten
