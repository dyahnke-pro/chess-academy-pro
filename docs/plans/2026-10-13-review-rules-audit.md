# Review vs the rules — chesscom-1040709576 (2026-10-13)

Sources: phone audit log + PostHog review_narration (device eb8cc1c1, build 0f60df0), prod replay tape (desktop, muted), Stockfish 18 depth 16. No code changed.

## Stockfish depth-16 per ply
```
 1 W e4     evalW     37 loss 10
 2 B c5     evalW     49 loss 12
 3 W Nf3    evalW     46 loss 3
 4 B Nc6    evalW     37 loss -9
 5 W c3     evalW     20 loss 17
 6 B d6     evalW     79 loss 59
 7 W d4     evalW     83 loss -4
 8 B cxd4   evalW     69 loss -14
 9 W cxd4   evalW     94 loss -25
10 B Bg4    evalW    156 loss 62
11 W Bc4    evalW     64 loss 92
12 B e6     evalW     69 loss 5
13 W Be3    evalW     31 loss 38
14 B Nf6    evalW     42 loss 11
15 W Nc3    evalW    -25 loss 67
16 B Nxe4   evalW    -12 loss 13
17 W Nxe4   evalW    -23 loss 11
18 B d5     evalW    -16 loss 7
19 W Bd3    evalW    -12 loss -4
20 B dxe4   evalW    -14 loss -2
21 W Bxe4   evalW    -16 loss 2
22 B Bb4+   evalW    -20 loss -4
23 W Bd2    evalW   -125 loss 105
24 B Bxf3   evalW   -133 loss -8
25 W Bxf3   evalW   -122 loss -11
26 B Qxd4   evalW   -122 loss 0
27 W O-O    evalW   -399 loss 277
28 B Qxd2   evalW   -380 loss 19
29 W Qb3    evalW   -486 loss 106
30 B O-O    evalW   -440 loss 46
31 W Rfd1   evalW   -510 loss 70
32 B Nd4    evalW   -512 loss -2
33 W Qc4    evalW   -525 loss 13
34 B Nxf3+  evalW   -501 loss 24
35 W gxf3   evalW   -506 loss 5
36 B Qg5+   evalW   -507 loss -1
37 W Kh1    evalW   -517 loss 10
38 B Bc5    evalW   -528 loss -11
39 W f4     evalW   -583 loss 55
40 B Qh5    evalW   -551 loss 32
41 W Rd7    evalW -10000 loss 9449
42 B Qf3+   evalW -10000 loss 0
43 W Kg1    evalW -10000 loss 0
44 B Bxf2+  evalW -10000 loss 0
45 W Kf1    evalW -10000 loss 0
46 B Bg3+   evalW -10000 loss 0
47 W Kg1    evalW -10000 loss 0
48 B Qf2+   evalW -10000 loss 0
49 W Kh1    evalW -10000 loss 0
50 Qxh2# end
```

## Phone narration (PostHog)
```
5 c3 mistake | Your opponent: that was a mistake, costing more than a pawn — the stronger move was Nc3 — it would develop into the game, fighting for the center on d5 and e4. The line so far is the Sicilian Defense: Old Sicilian.
6 d6 mistake | You: that was a mistake, costing more than a pawn — the stronger move was d5 — it would open up the center. Your pawn on d6 now fights for e5. e7, d6 and c5 form a chain: e7 is its base, the one pawn nothing else guards, so that is the pawn to look after. This was the moment to s
7 d4 good | Your opponent tears the centre open while your king is still in it — that's the danger of leaving the king in the middle; the open lines all point at it.
9 cxd4 great | They take on d4 — that was your pawn.
10 Bg4 inaccuracy | You: that was an inaccuracy — the stronger move was e6 — it would prepare d5 — when the d-pawn goes forward, it will be supported. Your bishop on g4 pins their knight on f3 against their queen on d1. Your bishop on g4 now eyes their knight on f3. Their knight on f3 sits in front 
11 Bc4 mistake | Your opponent: that was a mistake, costing more than a pawn — the stronger move was d5 — it would attack your knight on c6. Their bishop on c4 now eyes your pawn on f7, fights for d5. Their bishop reaches c4 because your b-pawn hasn't moved: on b5 it would cover that square.
12 e6 mistake | You: that was a mistake, costing more than a pawn — the stronger move was Bxf3 — it would take their knight on f3; it would also line up an x-ray at their rook on h1. Here, the bishop takes f3 — and it sees d1, so they can't castle long. The move you wanted was a forcing one, so 
13 Be3 blunder | Your opponent: that was a blunder, costing about two pawns — the stronger move was d5 — it would attack your knight on c6.
14 Nf6 mistake | You: that was a mistake, costing about a pawn — the stronger move was d5 — it would fork their bishop on c4 and their pawn on e4. Your knight on f6 now eyes their pawn on e4, fights for d5. Your knight on f6 now touches eight squares, up from three on g8. A knight is worth the sq
15 Nc3 inaccuracy | Your opponent: that was an inaccuracy — the stronger move was O-O — it would castle their king into safety and swing the rook toward the center.
16 Nxe4 good | The sacrifice holds either way: if they take with d5 or decline with d5, you are about level.
17 Nxe4 good | Their knight on e4 now eyes your pawn on d6. Their knight reaches e4 because your f-pawn hasn't moved: on f5 it would cover that square. The plan changes here — now it's to win their weak pawn on d4. Here's how: plant your knight on the square right in front of it, d5, so it can 
18 d5 good | Your pawn on d5 now eyes their bishop on c4 and their knight on e4. d5 follows a rule worth keeping: kick their bishop off c4 with a pawn and gain the time — every move they spend retreating is a move they do not spend developing. d5 freezes their d4 pawn on a dark square, where 
21 Bxe4 good | Their bishop on e4 now eyes your pawn on h7 and your knight on c6, fights for d5. Their bishop reaches e4 because your f-pawn hasn't moved: on f5 it would cover that square.
22 Bb4+ good | Your Bb4+: get the last minor piece out, then bring the rooks.
23 Bd2 mistake | Your opponent: that was a mistake, costing more than a pawn. Your knight on c6 is the only defender of your bishop on b4 — and it can be taken. Their bishop on d2 now eyes your bishop on b4.
26 Qxd4 good | Their bishop on d2 is a discovered attack in waiting — moving it unveils their queen on d1 against your queen on d4. Your queen on d4 now eyes their pawn on b2, their bishop on d2 and their pawn on f2, fights for e4, d5 and e5. The plan changes here — now it's to attack their kin
27 O-O blunder | Your opponent: that was a blunder, costing about a piece. They castled, so their king is out of the centre — the attack on it is off. That plan is off.
28 Qxd2 good | Their O-O pulled the king off e1 — the only piece guarding d2. You won the bishop — the capture on d2 came for free, with nothing left guarding it. You took on d2 — that was their bishop.
29 Qb3 inaccuracy | Your opponent: that was an inaccuracy — the stronger move was a3 — it would attack your bishop on b4. The new plan is to convert your extra material. Here's how: offer a trade of pieces at every chance but keep the pawns on, steer straight for an endgame where the extra piece is 
30 O-O inaccuracy | You: that was an inaccuracy — the stronger move was Nd4 — it would attack their queen on b3.
31 Rfd1 inaccuracy | Your opponent: that was an inaccuracy — the stronger move was Rad1 — it would attack your queen on d2.
32 Nd4 good | Their rook on d1 skewers your queen on d2 with your knight on d4 behind it. You're now threatening Qc2 — it forks their queen on b3 and their rook on d1. Now if they go ahead with Rxd2 anyway, you take their queen on b3 — the threat costs them more than it wins. The door is still
33 Qc4 good | Your queen on d2 is the only defender of your knight on d4 — and it can be taken — it's the idea from move 12 again. Your queen on d2 is tied to guarding your bishop on b4 — but their queen on c4 is just as tied to attacking it, so the guard costs you nothing. Two sentries starin
34 Nxf3+ good | Nxf3+ is a good trade — taking back doubles their pawns.
35 gxf3 good | Their pawn on f3 now fights for e4. Their gxf3: their pawn structure splinters — a new isolated pawn on f3. Watch what they're building — left alone, their idea runs Rxd2 and Bxd2 — you come out behind on material, a rook for a queen.
36 Qg5+ good | Newly undefended: your bishop on b4. Your queen on g5 now fights for d5 and e5. Their rook on d1's line just opened — it now reaches d8. Your Qg5+ saves the queen from their rook on d1.
37 Kh1 good | Watch what they're building — left alone, their idea runs Qxb4 — they win a bishop.
38 Bc5 good | Bc5 is fine only because your queen is already on g5 — with it back on d2, Rxd2 would cost you a queen. Your bishop on c5 now eyes their pawn on f2, fights for d4. Your Bc5 saves the bishop from their queen on c4.
39 f4 good | Your queen on g5 is the only defender of your bishop on c5 — and it can be taken — it's the idea from move 12 again. Your queen on g5 is tied to guarding your bishop on c5 — but their queen on c4 is just as tied to attacking it, so the guard costs you nothing. Their pawn on f4 no
40 Qh5 good | You're now threatening Qf3+ — it forks the king and rook on d1. Qh5 is fine only because your bishop is already on c5 — with it back on b4, Qxb4 would cost you a bishop. Yesterday's move is paying today's bill. Your queen on h5 now eyes their pawn on h2 and their rook on d1, figh
41 Rd7 blunder | Your opponent: that was a blunder — the stronger move was Qe4 — it would take the half-open e-file; it would also line up an x-ray at your rook on a8. Nothing was defending your pawn on b7 — but it was your move, and Qd1+ comes with check and hits their rook on d7 at the same tim
42 Qf3+ great | From here it is a forced checking run to mate — every move a check, no escape.
43 Kg1 good | Your bishop on c5 pins their pawn on f2 against their king on g1 — you saw this idea on move 5. Watch what they're building — left alone, their idea runs Qxc5 — they win a bishop.
44 Bxf2+ great | You: that was a great move.
45 Kf1 good | Your bishop on f2 is a discovered attack in waiting — moving it unveils your queen on f3 against their king on f1. Watch what they're building — left alone, their threat starts with Qe2.
47 Kg1 good | Watch what they're building — left alone, their threat runs hxg3 and Qxg3+ — you come out behind on material, a pawn for a bishop.
48 Qf2+ great | You have mate in one with your queen on f2.
49 Kh1 good | Watch what they're building — left alone, their threat runs hxg3, Qf3+, Kg1 and Qxg3+ — you come out behind on material, a pawn for a bishop.
50 Qxh2# good | Your queen on h2 and your bishop on g3 form a battery on the diagonal, bearing down on their pawn on f4. Your queen on h2 now eyes their pawn on b2. Your plan is to advance your kingside pawn majority and make it count.
```

## Prod replay tape
```
Here's your game in the Sicilian Defense: Grand Prix Attack — you had Black and it ended in a win. Clean play throughout — here's what worked.
Your pawn on c5 now fights for d4. c5 follows a rule worth keeping: fight for d4 from the side — a flank pawn that trades itself for a center pawn leaves you two center pawns against their one.
Your knight on c6 now fights for d4 and e5. Your knight on c6 now touches eight squares, up from three on b8. A knight is worth the squares it reaches. Put a knight in the middle and it sees the whole board. knight to c6 follows a rule worth keeping: develop into the game, fighting for the center on d4 and e5 — a piece left at home cannot join the fight, and whoever has more pieces out wins the fights when the center opens. The line so far is the Sicilian Defense: Old Sicilian.
Your pawn on d6 now fights for e5. e7, d6 and c5 form a chain: e7 is its base, the one pawn nothing else guards, so that is the pawn to look after. Your d6: guard e5 before the push, so the e-pawn arrives supported.
Your opponent tears the centre open while your king is still in it — that's the danger of leaving the king in the middle; the open lines all point at it.
You took on d4 — that was their pawn. Their knight on f3 sits in front of their own f2 pawn, so no pawn can ever come up to back up e4.
They take on d4 — that was your pawn.
Your bishop on g4 pins their knight on f3 against their queen on d1. Your bishop on g4 now eyes their knight on f3. You both wanted the open c-file and only your rook could take it — that was the moment to claim it. The plan from here is to seize the open c-file. Here's how: put a rook on it right away before they contest it, double the second rook behind the first so nothing can challenge you, and drive down to the seventh rank where a rook chews through pawns and pins the king back. The plan for you here: getting the knight to e4, by way of f6, to take the pawn there.
Their bishop on c4 now eyes your pawn on f7, fights for d5. Their bishop reaches c4 because your b-pawn hasn't moved: on b5 it would cover that square.
Your pawn on e6 now fights for d5. Your e6 prepares d5 — when the d-pawn goes forward, it will be supported.
Slightly off — e5 was sharper. It opens up the center.
Your opponent stakes a claim in the center and opens lines for the pieces.
Your knight on f6 now eyes their pawn on e4, fights for d5. Your knight on f6 now touches eight squares, up from three on g8.
You took on e4 — that was their pawn. Your move is a sacrifice — compensation: the position holds up completely. Their pawn on b2 is tied down now: you hit their knight on c3 once and it is guarded once — the pawn is the guard that holds it. That is what pressure buys — a piece that cannot leave. The sacrifice holds either way: if they take with knight takes e4 or decline with knight takes e4, you are about level.
Their knight on e4 now eyes your pawn on d6. Their knight reaches e4 because your f-pawn hasn't moved: on f5 it would cover that square. The plan changes here — now it's to win their weak pawn on d4. Here's how: plant your knight on the square right in front of it, d5, so it can never advance to free itself; then stack your heavy pieces on the file to gang up on it, trade off the pieces that defend it one by one, and either win it outright or tie their whole army to babysitting it. Watch what they're building — left alone, their idea starts with d5.
That was a critical moment. Only one move kept you level here, and it was d5. You found it over the board.
Your pawn on d5 now eyes their bishop on c4 and their knight on e4. d5 freezes their d4 pawn on a dark square, where your bishop can go after it. f7, e6 and d5 form a chain: f7 is its base, the one pawn nothing else guards, so that is the pawn to look after. Their weak d3 and d5 hide behind their bishop on c4; chase it with b5 and those squares open up again. d5 follows a rule worth keeping: kick their bishop off c4 with a pawn and gain the time — every move they spend retreating is a move they do not spend developing.
Watch what they're building — left alone, their idea starts with knight to c3.
Your queen on d8's line just opened — it now reaches d4, hitting their pawn on d4. Their bishop on e3 is tied down now: you hit their pawn on d4 twice and it is guarded twice — the bishop is the guard that holds it.
Their bishop on e4 now eyes your pawn on h7 and your knight on c6, fights for d5. Their bishop reaches e4 because your f-pawn hasn't moved: on f5 it would cover that square.
Your bishop to b4, check: get the last minor piece out, then bring the rooks.
Your opponent: that was a mistake, costing more than a pawn. Your knight on c6 is the only defender of your bishop on b4 — and it can be taken. Their bishop on d2 now eyes your bishop on b4. Here's how you take advantage: bishop takes f3, bishop takes f3 and queen takes d4 — you come out ahead on material, a knight and a pawn for a bishop.
You took on f3 — that was their knight.
Watch what they're building — left alone, their threat starts with bishop takes c6, check.
Their bishop on d2 is a discovered attack in waiting — moving it unveils their queen on d1 against your queen on d4. Your queen on d4 now eyes their pawn on b2, their bishop on d2 and their pawn on f2, fights for e4, d5 and e5. The timing of queen takes d4 matters — a move earlier, their knight would have taken on d4 and won your queen. Their queen on d1 is tied down now: you hit their bishop on d2 twice and it is guarded twice — the queen is the guard that holds it. The plan changes here — now it's to attack their king stuck on e1 before it ever reaches safety. Here's exactly how: first make sure your OWN king is tucked away, then double both rooks onto the open d-file so they bear straight down on the king; bring every piece into the attack with tempo — a move that develops AND threatens is worth two; and hunt for a sacrifice on the soft squares d2 and f2 that rips the cover off, because once the king is bare it's checks all the way to mate. Here is what you build toward: an attack on their king.
Your opponent: that was a mistake, costing about two pawns. They castled, so their king is out of the centre — the attack on it is off. That plan is off.
Their castle kingside pulled the king off e1 — the only piece guarding d2. You won the bishop — the capture on d2 came for free, with nothing left guarding it. You took on d2 — that was their bishop.
Your opponent: that was an inaccuracy — the stronger move was bishop takes c6, check — it would trade off the knight. The new plan is to convert your extra material. Here's how: offer a trade of pieces at every chance but keep the pawns on, steer straight for an endgame where the extra piece is decisive, and don't get greedy or complicate — simplicity is what wins a won game.
Your castle kingside castles your king into safety and swings the rook toward the center — a king left in the middle gets caught the moment the center opens.
Watch what they're building — left alone, their threat runs rook takes d2, bishop takes d2 and queen takes b7 — you come out behind on material, a rook for a queen and a pawn.
Their rook on d1 skewers your queen on d2 with your knight on d4 behind it. You're now threatening queen to c2 — it forks their queen on b3 and their rook on d1. Now if they go ahead with rook takes d2 anyway, you take their queen on b3 — the threat costs them more than it wins. The door is still open, but now there is a trap behind it. You: that was a great move. Your knight on d4 now eyes their queen on b3 and their bishop on f3. …knight to d4 heads for their king — …knight to e2, check next brings the knight to bear.
Your queen on d2 is the only defender of your knight on d4 — and it can be taken — it's the idea from move 12 again. Your queen on d2 is tied to guarding your bishop on b4 — but their queen on c4 is just as tied to attacking it, so the guard costs you nothing. Two sentries staring at each other — neither can walk away. Their queen on c4 now eyes your pawn on e6, your bishop on b4 and your knight on d4, fights for d5. The point of their queen to c4: it stops your queen to c2 fork. Watch what they're building — left alone, their threat runs rook takes d2, knight takes f3, check, g-pawn takes f3 and bishop takes d2 — you come out behind on material, a rook and a bishop for a queen and a knight.
knight takes f3, check is a good trade — taking back doubles their pawns.
Their pawn on f3 now fights for e4. Their g-pawn takes f3: their pawn structure splinters — a new isolated pawn on f3. Watch what they're building — left alone, their idea runs rook takes d2 and bishop takes d2 — you come out behind on material, a rook for a queen.
Newly undefended: your bishop on b4. Your queen on g5 now fights for d5 and e5. Their rook on d1's line just opened — it now reaches d8. Your queen to g5, check saves the queen from their rook on d1.
Watch what they're building — left alone, their idea runs queen takes b4 — they win a bishop.
bishop to c5 is fine only because your queen is already on g5 — with it back on d2, rook takes d2 would cost you a queen. Your bishop on c5 now eyes their pawn on f2, fights for d4. Your bishop to c5 saves the bishop from their queen on c4.
Your queen on g5 is the only defender of your bishop on c5 — and it can be taken — it's the idea from move 12 again. Your queen on g5 is tied to guarding your bishop on c5 — but their queen on c4 is just as tied to attacking it, so the guard costs you nothing. Their pawn on f4 now eyes your queen on g5, fights for e5. That is the kick a quiet move would have stopped — f4 would hit your queen on g5, and after e5 the pawn covers f4. Watch out — that pawn attacks your queen on g5, and nothing defends it. Watch what they're building — left alone, their idea runs f-pawn takes g5 and bishop takes f2 — you come out behind on material, a pawn for a queen.
You're now threatening queen to f3, check — it forks the king and rook on d1. queen to h5 is fine only because your bishop is already on c5 — with it back on b4, queen takes b4 would cost you a bishop. Yesterday's move is paying today's bill. Your queen on h5 now eyes their pawn on h2 and their rook on d1, fights for d5 and e5. Your queen to h5 steps out of the pawn's reach, keeping the queen rather than letting the pawn win it. Their rook on a1 is tied down now: you hit their rook on d1 once and it is guarded once — the rook is the guard that holds it.
Your opponent: that was a blunder — the stronger move was rook to d3 — it would walk their rook on d1 round to g3, by way of d3. Nothing was defending your pawn on b7 — but it was your move, and queen to d1, check comes with check and hits their rook on d7 at the same time. Here's how you take advantage: queen to f3, check, king to g1, queen takes f2, check, king to h1 and queen to f3, checkmate — and it's mate.
From here it is a forced checking run to mate — every move a check, no escape.
Your bishop on c5 pins their pawn on f2 against their king on g1 — you saw this idea on move 5. Watch what they're building — left alone, their threat runs queen takes c5, queen to g4, check, king to f1 and queen takes f4 — you come out behind on material, a pawn for a bishop.
Your bishop on f2 is a discovered attack in waiting — moving it unveils your queen on f3 against their king on f1. Watch what they're building — left alone, their idea starts with queen to e2. Their queen to e2 looks aimed at your queen on f3, but its real point is trading queens into an ending they win.
Watch what they're building — left alone, their idea starts with rook to f1.
You have mate in one with your queen on f2.
Watch what they're building — left alone, their idea runs h-pawn takes g3, a-rook to c8, rook to f1 and queen takes g3 — you come out behind on material, a pawn for a bishop.
Your queen on h2 and your bishop on g3 form a battery on the diagonal, bearing down on their pawn on f4.
The game turned at move 14, castle kingside — it cost about two pawns.
The through-line of this game was your material edge — once ahead, the job was to simplify and convert, and keeping it clean is the whole skill.
The through-line of this game was your material edge — once ahead, the job was to simplify and convert, and keeping it clean is the whole skill.```
