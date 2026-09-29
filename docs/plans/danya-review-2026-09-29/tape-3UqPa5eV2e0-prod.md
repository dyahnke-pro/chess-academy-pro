# Tape — Chess Academy Pro Learn free-play vs Naroditsky speedrun (3UqPa5eV2e0, 1870, White)

Recorded 2026-09-29 against LIVE prod (chess-academy-pro.vercel.app) with scripts/audit-lib/hand-driver.mjs, TTS muted. Student = White playing his moves on the board; Black's moves dictated by typing "play X" on the student's turn (the app's dictation hook). 42 in-game plies (stopped at his post-game rewind).

Notes: the coach narrates a full move pair AFTER its own reply, so its lines are listed on the white ply and cover both plies. Each utterance arrives twice on the listener (page + voice service) and is de-duplicated. "Got it — after your move, I'll play …" dictation confirmations are harness noise and removed. Chat = newest assistant bubble (driver captures ≤400 chars; in this mode chat == spoken text).

Harness incidents: (1) first attempt: "let's play, I'll be white" → coach said "I'll take Black and answer with the Caro-Kann", then auto-played 1…e5 (King's Pawn Game). "take that back and play c6 instead" took back 2 plies, then the coach never replied to 1.e4 again (stalled >30s). Page reloaded. (2) after reload the SAME sentence got a different reply ("I don't have any of your games yet — upload…"); the game was then driven as plain free play.

## Per ply

ply | move | HIS beat | OUR spoken lines | OUR chat lines
---|---|---|---|---
1 | e4 | — | This game is the Caro-Kann Defense. / There's a rule behind e4: stake out the center and grab space with the pawn to e4. | (same as spoken)
2 | c6 | Black chooses the Caro-Kann, preparing to challenge your center with d5. | ↑ (narrated with ply 1) | ↑
3 | d4 | You take the full center with d4. | A pawn break is available on d5 — the pawn levers are where the play comes from. / d4 follows a principle worth keeping: stake out the center and grab space with the pawn to d4. | (same as spoken)
4 | d6 | But Black shirks the principled d5 for a passive d6 — a hybrid that hands you the center for free. | ↑ (narrated with ply 3) | ↑
5 | Nc3 | No need for anything clever — you just develop and let the extra space work for you. | They have a pawn break available on f5 — that is where their play comes from. / There's a rule behind Nc3: develop into the game, fighting for the center on d5 and e4. | (same as spoken)
6 | e6 | — | ↑ (narrated with ply 5) | ↑
7 | Nf3 | Keep it old-school: knights before bishops. The knight comes to f3 rather than grabbing more center with f4. | b6 is a hole in their camp — a piece planted there can't be kicked. They still have 4 minor pieces at home — a lead in development is only worth something while it lasts. / Nf3 develops into the game, fighting for the center on d4 and e5. | (same as spoken)
8 | a6 | — | ↑ (narrated with ply 7) | ↑
9 | Bd3 | — | Your king is still in the centre and castling is ready — getting it tucked away is worth more than anything else right now. / Bd3 develops into the game, fighting for the center on e4 and c4. | (same as spoken)
10 | h6 | — | ↑ (narrated with ply 9) | ↑
11 | O-O | — | O-O follows a principle worth keeping: castle your king to safety and bring the rook toward the center. / The middlegame starts here, so take stock: you're a bit better — your king is tucked away and theirs is still in the centre and you're 4 pieces further developed. / Material is even — nothing is decided yet; it's about the plans and the tactics. / They still have 4 minor pieces at home — a lead in development is only worth something while it lasts. | The middlegame starts here, so take stock: you're a bit better — your king is tucked away and theirs is still in the centre and you're 4 pieces further developed. Material is even — nothing is decided yet; it's about the plans and the tactics. They still have 4 minor pieces at home — a lead in development is only worth something while it lasts. A pawn break is available on d5 — the pawn levers a
12 | b6 | — | ↑ (narrated with ply 11) | ↑
13 | Be3 | — | A pawn break is available on d5 — the pawn levers are where the play comes from. / Their bishop on b7 is their problem piece — bad bishop (hemmed in behind its own pawns) — and a pawn to a5 would fix it, so stopping that pawn is worth more than it looks. / The principle behind Be3: get the last minor piece out, then bring the rooks. | Their bishop on b7 is their problem piece — bad bishop (hemmed in behind its own pawns) — and a pawn to a5 would fix it, so stopping that pawn is worth more than it looks. The principle behind Be3: get the last minor piece out, then bring the rooks.
14 | Bb7 | Black has spent the opening shuffling pawns and only now develops a piece to b7. Against passive play the recipe is fixed: pry the center open so your better-placed pieces can infiltrate — otherwise they consolidate and escape. | ↑ (narrated with ply 13) | ↑
15 | d5 | The d5 hammer is the move — not e5, which they'd meet with d5 and slam the door. You smash the center open and, crucially, keep it open. | You’d love to play the natural move with the knight to d4 — but they answer the pawn takes e4 and it falls apart. | (none)
16 | cxd5 | — | ↑ (narrated with ply 15) | ↑
17 | exd5 | — | c6 is a hole in their camp — a piece planted there can't be kicked. / Their knight on g8 is the piece doing the most work for them — trading it off takes the sting out of the position. Your knight on f3 is doing the least of anything you own — finding it a better square is worth more than a new plan. | (same as spoken)
18 | e5 | Black tries to shut it again with the pawn to e5. The plan now is to push f4, contest that pawn, and open the e-file — the main artery to their king. | ↑ (narrated with ply 17) | ↑
19 | Nd2 | But a knight blocks the f-pawn, so first you reroute it to d2 — not a random square: from there it heads to c4 to hit the b6-pawn. | f5 is a hole in their camp — a piece planted there can't be kicked. / Nd2 unpins your pawn on d5, freeing it to join the game. | (same as spoken)
20 | g5 | Going straight to c4 would have let them kick the knight with b5 — so patience first. | ↑ (narrated with ply 19) | ↑
21 | a4 | a4 handcuffs that pawn preemptively — like a surgeon, you stop b5 before it can happen. | They have a minority attack on the queenside — b5 is the lever, and it would leave you a weak pawn on a4. / a4 grabs space on the queenside. | (same as spoken)
22 | Nd7 | — | ↑ (narrated with ply 21) | ↑
23 | Nc4 | Now the knight lands on c4 unopposed, sandwiched into a fine square eyeing b6 and e5. | a5 is the pawn break that cracks the position open — and it's ready now. | (same as spoken)
24 | Ngf6 | — | ↑ (narrated with ply 23) | ↑
25 | Bf5 | Their position is riddled with holes, and f5 is the juiciest — you plant a bishop on it. | 2 attackers on b6 against 2 defenders — pile on one more and it falls. / Bf5 lands on the f5 outpost, a square none of their pawns can attack. | (same as spoken)
26 | Rg8 | — | ↑ (narrated with ply 25) | ↑
27 | Re1 | To open the e-file you first prepare it, bringing the rook to e1 so f4 comes with full force. | Your rook on e1 is your best-placed piece — it has the half-open e-file. / Re1 takes the half-open e-file, where the rook belongs. | (same as spoken)
28 | Be7 | — | ↑ (narrated with ply 27) | ↑
29 | a5 | a5 carves out an outpost on b6 for the knight — every pawn move here has a piece behind it. | Shallow read: a5 survives the first replies — after b5, Nb6, Nxb6 breaks it. The thread was lost deeper in the line. Here's how: Calculate to a QUIET position, not to a good feeling. Follow every forcing reply — check, capture, threat — until nothing forces, then judge. If the line ends while they still have a capture, you have not finished. That let them win a pawn. | (none)
30 | bxa5 | — | ↑ (narrated with ply 29) | ↑
31 | Nxa5 | You recapture with the knight, not the rook — the knight comes with a threat on the bishop and gains its own outpost. | Route the knight from a5 to c6 — a square no pawn can ever chase it from. Your rook on a1 is your best-placed piece — it has the half-open a-file. | (same as spoken)
32 | Qc7 | — | ↑ (narrated with ply 31) | ↑
33 | Ra4 | The rook lifts to a4, aiming to swing to c4 and chase the queen — rooks get activated too, not just minor pieces. | Your rook on a4 is your best-placed piece — it has the half-open a-file. / Ra4 takes the half-open a-file, where the rook belongs. | (same as spoken)
34 | h5 | — | ↑ (narrated with ply 33) | ↑
35 | Qa1 | You can't swing to c4 yet — the knight hangs — so the queen drops to a1 to defend it first, then the rook is free. | Qa1 takes the half-open a-file. | (none)
36 | Bxd5 | — | ↑ (narrated with ply 35) | ↑
37 | Nxd5 | — | knight takes d5: that wins material. / Your knight on a5 is your problem piece — knight on the rim, so improving it is a plan in itself. / After Be4, your bishop on e4 pins their knight on d5 against their rook on a8 — a pin freezes the piece in front: it can't move without exposing the more valuable piece behind it, so it can be piled on. The point of Nxd5: it stops your Nxc7 fork. Now you have the two bishops — open the position and they get stronger. | Nxd5: that wins material. / Your knight on a5 is your problem piece — knight on the rim, so improving it is a plan in itself. After Be4, your bishop on e4 pins their knight on d5 against their rook on a8 — a pin freezes the piece in front: it can't move without exposing the more valuable piece behind it, so it can be piled on. The point of Nxd5: it stops your Nxc7 fork. Now you have the two bishops — open the position and 
38 | Nxd5 | — | ↑ (narrated with ply 37) | ↑
39 | Rc4 | Plan complete. The pawn was sacrificed, not blundered — given up deliberately to blow the center open, which was the whole idea from the start. | You have a back-rank threat: the king on e8 has no escape square and the back rank can be invaded from c4. / Their king on e8 has no escape square and the back rank can be invaded from c4 — a back-rank weakness leaves the king boxed in by its own pawns, so a rook or queen reaching the last rank is mate. Rc4 takes aim at the center, hitting d4 and e4. | (same as spoken)
40 | Qb8 | — | ↑ (narrated with ply 39) | ↑
41 | Nc6 | The knight jumps into the c6 outpost, deep in their position and impossible to dislodge. | Your rook on e1 has the half-open e-file — build your play around it. Their light squares are weak — d5 and f5 are holes their bishop can't cover; a knight belongs on one. / Nc6 was a mistake — it let them in with Qb5, and they missed it. Rc6 was the move — the idea is to park a piece on a5, where none of their pawns can attack it. | (same as spoken)
42 | Qb7 | — | ↑ (narrated with ply 41) | ↑

## Q&A (asked on the student's turn, mid-game)

**Q1** (after ply 6: …d4 d6 Nc3 e6) — "what's their plan?"

> Their side of it: their queen on d8 is their most active piece; they can break with f5, c5, d5 and e5.

**Q2** (after ply 8: …Nc3 e6 Nf3 a6) — "what should I be thinking about here?"

> Here's the routine for this position. First, their idea: nothing of yours is hanging right now, so their last move was about position, not material — ask what it prepares. Then the forcing moves, in order: captures Bxa6. Look at each of those before any quiet move. Then candidates: name two or three and compare them — the pawn breaks d5 or e5 is where to start.

**Q3** (after ply 14: …O-O b6 Be3 Bb7) — "is this position good for me?"

> Clearly your position, 1.3 points up. Keep the initiative. Their bishop on b7 is their problem piece — bad bishop (hemmed in behind its own pawns) — and a pawn to a5 would fix it, so stopping that pawn is worth more than it looks. Their king is still in the centre — every line that opens toward it is worth looking at.

**Q4** (after ply 14: …O-O b6 Be3 Bb7) — "why not e5?"

> The engine plays Nd2 — it repositions the knight to d2, eyeing c4. If Nd7, then f4. If c5, then d5. White is clearly better (about 1.3 points).

**Q5** (after ply 18: …d5 cxd5 exd5 e5) — "why was that a bad move?"

> exd5 was the engine's top move — you gave up nothing.

**Q6** (after ply 18: …d5 cxd5 exd5 e5) — "what if I play f4?"

> f4 isn't a legal move in this position.

**Q7** (after ply 24: …a4 Nd7 Nc4 Ngf6) — "can their knight just take my pawn?"

> The best move is b3. You're clearly better (about 1.7 points).

**Q8** (after ply 24: …a4 Nd7 Nc4 Ngf6) — "whta shuold i do hear?"

> [VOICE: You've got a clear edge, about a pawn and a half.

**Q9** (after ply 26: …Nc4 Ngf6 Bf5 Rg8) — "what does Rg8 mean?"

> "Rg8" is chess notation — it means the rook moves to g8.

**Q10** (after ply 30: …Re1 Be7 a5 bxa5) — "explain that last move"

> I don’t have a specific lesson on that idea yet.

**Q11** (after ply 30: …Re1 Be7 a5 bxa5) — "help"

> What do you want to do here — should I explain something on the board, or is something confusing you about the position? explain the position what should I play is there a trap here start a walkthrough of an opening

**Q12** (after ply 32: …a5 bxa5 Nxa5 Qc7) — "why not Bxd7?"

> The engine plays Ra3 — it takes the half-open a-file, where the rook belongs. If Kf8, then Qd3. If Rh8, then Nxb7. White is clearly better (about 2.1 points).

**Q13** (after ply 36: …Ra4 h5 Qa1 Bxd5) — "how do I improve my middlegame?"

> The fastest way to sharpen your middlegame is to play a full game against me with that as the goal. Play one now — I'll watch the middlegame closely, coach it as it happens, and then break down how your middlegame went afterward. Play a game — I'll coach it →

**Q14** (after ply 36: …Ra4 h5 Qa1 Bxd5) — "what if I play Nxd5?"

> Yes — Nxd5 is the best move here.
## Verdicts on the Q&A (honest)

| Q | answered what was asked? |
|---|---|
| 1 plan | partly — lists breaks and "most active piece", no plan (yes, weak) |
| 2 thinking | yes — a real thinking routine |
| 3 good for me | yes |
| 4 why not e5 | NO — gives engine move Nd2, never says why not e5 (his beat: e5 is met by d5 and shuts the door) |
| 5 why was that bad (their e5) | NO — reads it as the student's own exd5 |
| 6 what if f4 | yes — correct, f4 is illegal (Nf3 blocks), but no why |
| 7 can their knight take my pawn | NO — "best move is b3" |
| 8 typo "what do i do" | NO — raw "[VOICE:" markup leaked into chat AND voice; evaluation only |
| 9 what does Rg8 mean | yes (literal notation) |
| 10 explain that last move | NO — "I don't have a specific lesson on that idea yet" |
| 11 help | yes — offers a menu |
| 12 why not Bxd7 | NO — engine move Ra3 instead |
| 13 improve middlegame | NO — pitch to play a game |
| 14 what if Nxd5 | yes |

**Real answers: 7 / 14 = 50%.** Every "why not X?" (2/2) got the engine's best move instead of a refutation of X.

## Counts

- Sentences per ply over the 42 in-game plies: **ours 1.29 (54 sentences)** vs **his 0.60 (25 sentences)** — ours after de-duplicating the two listener copies and dropping dictation confirmations.
- Plies where anyone spoke: ours = all 21 white plies (the coach speaks every move pair, never silent); his = 20 of 42, silent through the whole plies 8–13 shuffle.
