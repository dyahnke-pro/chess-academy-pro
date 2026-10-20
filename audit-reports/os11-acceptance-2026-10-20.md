# OS-11 acceptance — Learn free play on batch 2 (2026-10-20)

**Build:** `origin/lead-verdict` **b7ab6d3** — the same tree as `main` **8a42c79**. Run on localhost (Vite dev server + the muted hand driver).

**Record:** David's newest data drop, `read-data-drop.mjs --latest` → exported 2026-10-19 1:07 PM CT, 32,189 rows. The profile's redacted stream secret was cleared so the listener hears.
- His fade levels at the start of each game changed from batch 1: 3 tags (greedy-pawn-grab lighter, overvalued-attack short, capture-toward-centre short) where b494915 had 19 at "short".

**Games:** the four OS-1 games, replayed move for move with the computer's moves dictated:

| game | line | seat | turns |
|---|---|---|---|
| g1 | David's own Smith-Morra (teach-mvfhdihq-7i8vk5), to mate | White | 50 |
| g2 | Najdorf, English Attack, to 14…d5 | Black | 14 |
| g3 | 1.b3 Nimzo-Larsen, to 16.a3 | White | 16 |
| g4 | Ruy Lopez with the student's 3…Qf6?!, to 16…Qxe4 | Black | 16 |

**Pace:** fair. After each student move the replay waits until the muted voice finishes (150 wpm, as voiceService paces it) plus 3 s.

**What was graded:** every line the voice actually spoke — `voiceService.speakCloud` rows in the app's own learnTranscript, stamped +ms from the student's move.
- `speakPackage` rows are the queue, not the voice, so they are not counted.
- The replay's own "Got it — after your move, they play …" dictation lines are excluded.

**Engine:** Stockfish 16. Every machine flag was checked by hand. Costs and "better move" / amount claims were re-run at depth 20–22, because depth 16 misprices moves in sharp positions (11.Re1 read -116 at d16 and -62 at d20).

**Grader:** `os11-grade.mjs` (scratchpad), plus a hand read of every turn.

**Contracts:**
1. Board-true, every claim.
2. No line names the student's move before they play it.
3. No claim said twice in a game unless it changed.
4. Every costly move (loss of 100cp or more at depth 20) gets its verdict within about 3 s.
5. Average heard words per turn at most 80.

Added: **C6, a voice cut** — a spoken line started on top of a line still playing (the app logs `tts-concurrent-speak` with force=true). The student never hears the first line.

**Muted-mode caveat:** the muted voice caps every line at 12 s (voiceService.ts, ~2163), so a 67-word line "finishes" in 12 s in the audit and in about 27 s on a phone. Every lag measured here is a FLOOR for the device.

## Verdict

**Not accepted.**
- C5 (length) passes in all four games.
- Every other contract has failures.
- New computers named the move again.
- The verdict on costly moves is late or missing in 3 of the 4 costly moves.

## The contracts, game by game

| | g1 Smith-Morra (W, 50) | g2 Najdorf (B, 14) | g3 1.b3 (W, 16) | g4 Ruy …Qf6 (B, 16) |
|---|---|---|---|---|
| C1 board-true | FAIL — 5 | FAIL — 5 | FAIL — 3 | FAIL — 4 |
| C2 never names the move first | FAIL — 3 | FAIL — 2 | FAIL — 5 | FAIL — 2 |
| C3 nothing said twice | FAIL | FAIL | FAIL | FAIL |
| C4 verdict ≤ ~3 s (loss ≥ 100cp) | FAIL — 3 of 4 costly moves | n/a (none ≥ 100) | n/a | n/a |
| C5 avg words ≤ 80 | PASS 70 | PASS 78 | PASS 68 | PASS 70 |
| C6 voice cut | 1 | 2 | 1 | 2 |

Counts are verified defects after the hand read. Every machine flag that turned out true is kept out and named "checked TRUE" in the game sections.

## Top defects, ranked (each with its producer)

1. **The student's next move is named before they play it — by producers the OS-10 "namesStudentMove" pass did not reach.**
   - `moveIntent.ts:413` — "You play <move> first, so you can castle next" in ALL FOUR games: g1 6.Nf3, g2 8…Be7, g3 10.Nf3, g4 14…Bd6. moveIntent.ts:400 exempts castling from `holdPrepared` on purpose (`!prepares.san.startsWith('O-O')`), so the stem always speaks.
   - `kingSafety.ts:212` — "Move your knight on g1, then castle short before the centre opens" (g3, the next TWO moves).
   - `moveFundamentals.ts:1353` — "The rule behind b3: fianchetto the bishop to b2" (g3, the next move).
   - `planJudgement.ts:197-201` — "your pawn on d6 is what blocks it — moving it brings it to life" (g2, next move …d5) and "your pawns on c4 and d3 … moving them brings it to life" (g3, next move c5). This one reads the move straight off the engine PV.
   - The winning-line proof at g1 21.Rg5: "it lands two moves later with knight takes f6".
   - Plans that name the capture or kick: g4 "take their pawn on c3" (…dxc3 two moves later); g3 "kick their knight off a5 with a pawn" (12.b4).
2. **Costly moves get no verdict, or a late one, and the app's own row shows it knew.** g1 has four moves that lose 100cp or more at depth 20:
   - 18.Rg5 (-220): no verdict. The app's row priced it 127 and HELD planArc and character with heldWhy "verdict-turn". The turn was reserved for a verdict, and no verdict lane spoke.
   - 14.Rd5 (-145, app 121): no verdict.
   - 8.Bxf7+ (-241): verdict at +16.7 s, queued behind a 39-word past-tense recap ("Before your move, checks, captures, threats …") that led the turn.
   - 39.Kg5 (-116): verdict at +2.6 s — the one pass.
   - On 10.Bf4 the row also held three lanes for "verdict-turn" with nothing spoken.
   - The app's price and the engine's differ by 50–90cp on five g1 moves: Bf4 127 vs 67, Rd5 121 vs 145, Rg5 127 vs 220, Nxh7 15 vs 66, Kg5 93 vs 116. The one-price fix (#4) is not in this batch.
3. **Tactic look-aheads promise what is not there, and contradict the line spoken beside them.**
   - `liveTacticsContext.ts:606/615` — g2 8.Be3: "there's a removal of guard in it for you, two moves deep. Find it. This is exactly the kind you tend to miss — grab it." Black's best is h5 at -0.32; nothing is won.
   - g1 7.O-O: "a discovery is two moves away: their knight to e5 and then their knight taking on c4" — never says what is uncovered or onto what.
   - In the same waves, `speedRunReads.ts:84` says "Nothing hinges on your next move" (g2, g1, g4, g3). In g1 the student's very next move was Bxf7+ (-241).
   - In g3 the two speedRun reads contradict each other 6 ms apart: "One pawn move here answers no" vs "several are about equally good".
   - The discovery and phase fixes (#2, #5/#6) are not in this batch.
4. **The late wave speaks facts read on the board BEFORE the reply, after the reply has changed them (stale board).**
   - g3 4.Bb5: "the only piece guarding the pawn on e5" — the same line names their reply Bd6, which guards e5 (`moveFundamentals.ts:885-905`).
   - g3 15.c5: "c5 prepares c6" — c6 now holds their knight.
   - g1 14.Rd5: "you take their queen on a5" — the queen had gone to b4.
   - g1 17.hxg3: "Queen takes b4 would not have worked" — the answer to the previous turn's "Why not queen takes b4?", spoken where Qxb4 is now the engine's BEST move (-4.53 vs -5.10). The rejectedTempting question and answer straddle a move.
5. **Computers that compute the wrong fact.**
   - `bookMoveWhy.ts:171-190` preparesJob — g4: "The book move is the pawn to a6: it prepares d5". The difference it measured was the queen leaving d8, not anything a6 does.
   - theirIntent — g4: "Their knight takes d4 stops your c6"; …c6 came two moves later.
   - `planRace.ts:118-145` stormRunner — counts any adjacent enemy pawn as contact, so g2's f3-f4 meeting Black's CENTRE pawn e5 became "one push from your king's pawns … their storm arrives first".
   - `latentDanger.ts:~180-205` — g4: "Before you take on g2, look past the trade … a pin". …Qxg2+ is met by Kxg2 and just loses the queen; the "trade" is never checked for being a trade.
   - movePoint — g1 21.Rg5: "wins by force: you come out ahead on material". White stays -4.07 and down material.
   - Amounts: "about a point" = 2.4 (g1), "about half a point" = 0.9 (g1) and 0.76 (g2).
   - `pawnJudgement.ts:210` — "the one pawn nothing else guards" (guarded by the K, Q and B).
   - `moveIntent.ts:414` — "a5 frees your knight on b8 to come out" (it could already).
6. **Duplicate producers — where old code hides (the lead's ask).**
   - The opposite-castling race has THREE producers, all heard in g2: `openingStory.ts:430` ("Kings on opposite wings: this is a race"), `splitPosition.ts:24` ("so split the board … It is a race"), `planRace.ts:413` ("both kings face a pawn storm"). Review has a fourth (`reviewStrategicOrientation.ts:604`).
   - `splitPosition.ts:74` ("Their king went kingside, and yours is still in the centre … your pawns on f2, g2 and h2 … Pushed, they pry open files") and `kingSafety.ts:212` ("castle short before the centre opens") give opposite plans for one situation two turns apart (g3), and the storm line also fired in g4.
   - The pin, twice in one turn: the threat lane plus `playedConcept.ts:61` ("With their Bb6, <how>") — g2.
   - The opening name, twice in one breath: opening plus openingTheirs (`openingStory.ts:378`) — g4 "It's the Ruy Lopez. They've gone for the Ruy Lopez".
   - The verdict, twice in one line: the poisoned-pawn record line plus the mistake lane — g1 Bxf7+.
   - A rule restating its fact: movePoint plus `moveFundamentals.ts:1353` ("The rule behind e5 …") — g2.
   - The cost of a pawn trade: one formula said twice in one line ("B-pawn takes c3 has a cost for them … D-pawn takes e4 has a cost for them …") — g4.
   - `openingStory.ts:411` "<move> pays that price" speaks with no price ever said (g2 ×2) and at move 21 of g1, out of the opening.
   - `deliberation.ts:653` "That was the move here — it …" ×7 in g1, never rotated.
7. **Voice cuts — the first line is never heard.**
   - Six forced interruptions.
   - The worst: g2 7…Be6, "Nothing hinges…" (50 words) cut after 0.18 s by an orphan tail.
   - g4 10…Bf5 / g3 8.Nc2: a 39-word line cut after 1–6 ms.
   - The orphan tails themselves ("One move stops it before it lands.", `prophylaxis.ts:274`; "Spot it before it lands.", `liveTacticsContext.ts:634`) are second halves whose first sentence was cut by the phase wave.

## What got better on this build
- The fork is named with its roads ("from here master games split into the Najdorf, the Classical and the Dragon").
- "You chose the Najdorf: a6 takes b5 away from …" is board-true.
- The threat-answer and prophylaxis lanes are HELD when they name a move (heldWhy "names-move", seen in g2, g4 and g1).
- The threat-habit question now carries its answer (g3 15.c5 — the OS-1 #6 case).
- Bad moves are weighed out loud without naming the good one ("Bishop to g4? Then two moves later…").
- Every "the only move" / "exactly one move keeps you level" claim checked against the engine was TRUE.

## Per game (every flagged line, read by hand)

## g1 — David's Smith-Morra (White), 50 turns to mate — b7ab6d3
Avg heard words 70 (C5 PASS). Engine: Stockfish 16, depth 20-22 on every flagged line.

C1 board-false
- 21.Rg5 (+11.0s): "Rook to g5 wins by force: you come out ahead on material, winning a rook for a knight — it lands two moves later with knight takes f6. Anything else, like rook takes d6, gives up about a point." — Rg5 is the best move, but White stays lost: after 21…Rf2 the best is -4.07 (d22); material after the line is still Black +1. "you come out ahead on material" is false, and Rxd6 is -6.76 vs Rg5 -4.31: 2.4 points, not "about a point".
- 17.hxg3 (+4.4s): "Queen takes b4 would not have worked: it grabs the queen on b4, but bishop takes f2 with check refutes it." — TRUE for the board it answers (after 16…Bxg3: Qxb4 Bxf2+ -6.88), but it is spoken after 17…Rxf2, where Qxb4 is now the BEST move (-4.53, next best Rc1 -5.10). The question ("Why not queen takes b4?", 16.Nxh7 turn +15.6s) and its answer straddle a move, so the answer lands on a board it is no longer true for. Same split at 18.Rg5 → 19.axb3 ("Why not rook takes g4?" … "Rook takes g4 would not have worked").
- 12.Qb3 (+6.0s): "No rush yet — if you play a-rook to d1 and they answer knight to h5, moving from f6 to h5 reveals their bishop on g7 attacking your knight on c3." — Rad1 is the engine's best move here and the student played it; the "revealed attack" wins nothing (c3 is guarded by b2 and the queen). A caution that is both empty and hands over the best move.
- 7.O-O (+9.1s): "Their bishop to g7 … it wins material. Anything else, like bishop to d7, gives up about half a point." — Bg7 +0.25 vs Bd7 -0.67 for Black: 0.9, not half; nothing is won.
- 13.Rad1 (+7.1s) "your bishop on f4 is the only defender of your knight on g5 … rook takes f4 — they win a bishop" — checked TRUE.
- 11.Re1 (+20.4s) "Your next move is not a big decision — several are about equally good" — checked TRUE (Rc1 -2.89, h3 -2.93, Nd5 -2.96).
- Dangling referents: 21.Rg5 "Rook to g5 pays that price: your rook now guards b5." (an opening-story beat at move 21; no price was ever named); 7.O-O "One move stops it before it lands." (the move it refers to was cut — prophylaxis.ts:274 tail).

C2 names the student's move before it is played
- 6.Nf3 (+5.7s): "You play knight to f3 first, so you can castle next" — the next move (7.O-O). Same moveIntent template as g2 8…Be7 and g4 14…Bd6.
- 21.Rg5 (+11.0s): "it lands two moves later with knight takes f6" — names the winning capture before it is played.
- 12.Qb3 (+6.0s): names Rad1 (above).

C3 said twice / formula
- "That was the move here — it …" ×7 in one game (deliberation.ts:653), never rotated.
- "The plan changes here … Here's how: plant your knight on …" ×3 (g6, d6, d5 targets).
- 15.Bxf7+ verdict says the same thing twice in one line: "That pawn was defended: your bishop takes on f7 and is taken on the spot — it cost you far more than a pawn …" then "Bishop takes f7 with check was a mistake. That took the pawn on f7, but the king on e8 takes back — you lose a bishop for a pawn." (poisoned-pawn record line + mistake lane).
- 7.O-O phase wave: "Nothing hinges on your next move" (+22.3s) then "Look ahead — a discovery is two moves away …" (+44.9s) and "Spot it before it lands." (+52.9s). True by the speed-run count (e5 -0.22, Qe2 -0.31, h3 -0.33), but the very next move was Bxf7+ (-2.41).
- Look-ahead with no target: 7.O-O "a discovery is two moves away: their knight to e5 and then their knight taking on c4" — never says what is uncovered or onto what.

C4 verdicts (costly = loss >= 100cp at depth 20)
- 8.Bxf7+ -241: verdict at +16.7s — LATE. It queued behind a 39-word past-tense recap ("Before your move, checks, captures, threats: nothing of yours could be taken…") that led the turn at +3.0s.
- 14.Rd5 -145 (app priced 121): NO verdict. The turn said "Careful — your bishop on f4 is attacked and nothing's defending it" (+7.2s) and then, stale, "if they go ahead with rook takes f4 anyway, you take their queen on a5" (+12.9s) — the queen had already left a5 for b4 on the reply.
- 18.Rg5 -220 (app priced 127): NO verdict, although the app's own row HELD planArc and character with heldWhy "verdict-turn". It spoke a threat line and "Why not rook takes g4?".
- 39.Kg5 -116: verdict at +2.6s ("King to g5 holds against the first replies, but … the line had to be followed to the end") — PASS.
- Inaccuracies, for the record: 10.Bf4 -67 (app 127: held threat/movePoint/theirIntent for "verdict-turn", no verdict spoken), 11.Re1 -62 (app 48), 16.Nxh7 -66 (app 15).
- The app's price and the engine's differ by 50-90cp on five moves (Bf4 127 vs 67, Rd5 121 vs 145, Rg5 127 vs 220, Nxh7 15 vs 66, Kg5 93 vs 116).

C5 long turns: 7.O-O 198 words (8 lines over 55s), 8.Bxf7+ 214.

C6 voice cut
- 24.Kxg2: "They play bishop takes g4 — they win a rook. Anything else, like rook to h8, gives up five points or more. That was the move here — it takes back the rook." cut after 1ms by "The plan here: plant the knight on the g5 outpost…".

## g2 — Najdorf, English Attack (Black), 14 turns — b7ab6d3
Engine: Stockfish 16, depth 20 on every flagged line. Avg heard words 79 (C5 PASS, baseline b494915 = 64).

C1 board-false
- 8.Be3 turn (+8.1s, phase wave): "Look a couple of moves ahead — there's a removal of guard in it for you, two moves deep." + (+16.7s) "Find it." + (+17.5s) "This is exactly the kind you tend to miss — grab it." — FALSE: Black has nothing; best h5 -0.32, Be7 -0.38. Phantom tactic, sold with a record claim.
- 10…a5 turn (+17.0s): "your pawn on a5 is two pushes from their king's pawns, theirs on f3 is one push from yours; their storm arrives first" — FALSE count: f3-f4 touches only e5/g5; Black's king pawns are f7/g7/h7 (three pushes to f6).
- 10…a5 turn: "Your a5 frees your knight on b8 to come out." — Nb8 could already go to c6 and d7; a5 only frees a6.
- 2…d6 turn: "e7 is its base, the one pawn nothing else guards" — e7 is guarded by the king, queen and Bf8; true only as "no pawn guards it".
- 14…d5 turn: "Anything else, like knight to c5, gives up about half a point." — engine: Bxc7 +0.57, Nc5 -0.19 = 0.76.
- Dangling referents: 7…Be6 "Bishop to e6 pays that price" and 12…Nc7 "Knight to c7 pays that price" — the price (d5 weak after …e5) is never said in the game. 7…Be6 "One move stops it before it lands." — no "it" was ever named (the clause naming it was cut).

C2 names the student's move before it is played
- 8…Be7 (+3.9s): "You play bishop to e7 first, so you can castle next" — the next move (9…O-O). moveIntent lane.
- 13…Qb8 (+5.3s): "your pawn on d6 is what blocks it — moving it brings it to life" — d6 can only go to d5: the next move (14…d5).
- borderline: 11…Na6 "One knight move here answers no" (narrows the next move, Nc7, to its piece; the count is TRUE: Nc7 -0.33, next Qb8 -0.51 loses a5 after Bg5/Nxa5); 2…d6 "Your d6 prepares e5" (played at move 6); 14…d5 "Their bishop takes c7 stops your d4".

C3 said twice
- 12…Nc7: the Bb6 pin at +2.0s and again at +18.0s; "guards d5"/"eyeing d5" twice.
- 6…e5: "e5 kicks their knight off d4, gaining time" then "The rule behind e5: kick their knight off d4 with a pawn and gain the time".
- opposite-wings race: 10…a5 ("Kings on opposite wings: this is a race") and 13…Qb8 ("The kings are on opposite wings … It is a race") — unchanged.
- "<piece> pays that price": 7…Be6, 12…Nc7.

C6 voice cut (muted pace 150 wpm, 12s cap)
- 7…Be6: "Bishop to e6 pays that price…" cut after 1.2s by "Nothing hinges on your next move…", which was itself cut after 0.18s by "One move stops it before it lands." (tts-concurrent-speak force=true) — the student hears neither line.

C4 verdicts
- No move cost 100cp. For the record: 10…a5 is -63cp at depth 20 (best b5 -0.49 → a5 -1.12) with no verdict; the app's own row priced it 25cp.

C5 turns over 80: d6 86, e5 94, Be6 108, O-O 131, Nc7 100, Qb8 92, d5 111 (avg 79).
Checked and TRUE (kept out of the defect list): 14…d5 "Careful — this costs a pawn if you ignore it … exd5 wins your pawn outright" — spoken +1.6s, AFTER 15.Bxc7 committed (+1.1s), so on that board (c7 guard gone) the count holds; engine line Bxc7 Qxc7 exd5 +0.57. 11…Na6 count claim TRUE (above).

Producers (for the duplicate-producer sweep):
- the opposite-castling race has THREE producers: openingStory.ts:430 (story:character, "Kings on opposite wings: this is a race"), splitPosition.ts:24 ("The kings are on opposite wings, so split the board … It is a race") and planRace.ts:413 ("both kings face a pawn storm") — plus reviewStrategicOrientation.ts:604 for Review. 10…a5 heard two of them, 13…Qb8 the third.
- the Bb6 pin: the threat lane (instant) and playedConcept.ts:61 ("With their Bb6, <how>") in the late wave — same claim, two producers, one turn.
- e5 kicks the knight: movePoint and moveFundamentals.ts:1353 ("The rule behind e5: …") — same claim restated as a rule.
- "One move stops it before it lands.": prophylaxis.ts:274 builds "Watch <san> — it would <verb> your <piece> on <sq>. One move stops it before it lands." The phase wave spoke ONLY the tail: the clause naming the move was cut and its consequence sentence left dangling.
- 7…Be6 phase wave: speedRunReads.ts:84 ("Nothing hinges on your next move") and liveTacticsContext.ts:615/606 ("there's a removal of guard in it for you … Find it … grab it") in the same wave — two producers contradict each other.
- planRace.stormRunner (planRace.ts:118-145): "contact" = any enemy pawn on the adjacent files one rank ahead, so f3-f4 meeting Black's CENTRE pawn e5 is counted and voiced as "one push from your king's pawns".
- pawnJudgement.ts:210: "the one pawn nothing else guards" — means "no pawn guards"; the base is guarded by pieces.
- openingStory.ts:411: "<move> pays that price" assumes the price beat was spoken; here it never was.

New and good: the fork is named with its roads at 2.Nf3 and 5.Nc3; "You chose the Najdorf: a6 takes b5 away from…" (true); the threat-answer and prophylaxis lanes were HELD for naming a move.

## g3 — 1.b3 Nimzo-Larsen (White), 16 turns — b7ab6d3
Avg heard words 68 (C5 PASS). No student move cost 100cp (C4 n/a; 1.b3's 58cp at d16 is the opening choice).

The OS-1 #6 question is answered on this build: at 15.c5 (ply 29) the instant wave now carries the threat (+3.5s, "It is attacked once and nothing guards it: knight takes b4 — they win a knight"), and the habit question is closed by its answer (+18.8s, "Run the question now — what are they threatening? They're after your knight on b4. Deal with that before your own plan.").

C1 board-false
- 4.Bb5 (+4.7s): "Your bishop to b5 goes after their knight on c6, the only piece guarding the pawn on e5." — FALSE when heard: the same line opens with "Their bishop to d6 clears the way to castle", and Bd6 guards e5 too. moveFundamentals.ts:885-905 ('attack-defender') reads the board after the student's move; the late wave speaks it after the reply without re-checking.
- 15.c5 (+18.8s): "c5 prepares c6, which would kick their bishop off b7." — c6 now holds their knight (15…Nc6, the reply). Same stale-board class.
- Contradicting plans on consecutive turns: 7.c4 (+3.8s) "Their king went kingside, and yours is still in the centre — so the plan changes: your pawns on f2, g2 and h2 now face it. Pushed, they pry open files toward their king." (splitPosition.ts:74), then 9.d3 (+5.5s) "Move your knight on g1, then castle short before the centre opens." (kingSafety.ts:212) — castling short puts the king behind the very pawns the first line told the student to push. The storm line also fired at g4 4…Nge7 with Black's king in the centre.
- 8.Nc2 (+5.2s): "Ask it of every candidate … One pawn move here answers no, whatever they reply — the next-best leaves your pawn on f4 to be taken." (speedRunReads.ts:431) cut after 6ms by (+5.2s) "Your next move is not a big decision — several are about equally good" (speedRunReads.ts:84). One computer says one move, the other says many, in the same 6ms.

C2 names the student's move before it is played
- 1.b3 (+7.7s): "The rule behind b3: fianchetto the bishop to b2, because …" — the next move (2.Bb2). moveFundamentals.ts:1353.
- 9.d3 (+5.5s): "Move your knight on g1, then castle short before the centre opens." — the next two moves (10.Nf3, 11.O-O). kingSafety.ts:212.
- 9.d3: "The plan here: kick their knight off a5 with a pawn and gain the time" — only b3-b4 does that; played at 12.b4.
- 10.Nf3 (+15.7s): "You play knight to f3 first, so you can castle next." — moveIntent.ts:413 castle stem (11.O-O next).
- 14.Rc1 (+15.3s): "Your bishop on e2 looks dead for now, but your pawns on c4 and d3 are what block it — moving them brings it to life." — the next move (15.c5). planJudgement.ts:197-201 reads it off the engine's PV.
- borderline: 8.Nc2 "One pawn move here answers no" (9.d3 next); 3.e3 "Your e3 prepares d4"; 9.d3 "Your d3 prepares e4" (never played).

C6 voice cut
- 8.Nc2: the 39-word "Ask it of every candidate…" line cut after 6ms (above).

## g4 — Ruy Lopez with 3…Qf6?! (Black), 16 turns — b7ab6d3
Avg heard words 70 (C5 PASS). Engine: Stockfish 16, depth 18-20.

C1 board-false
- 3…Qf6 (+2.4s): "The book move is the pawn to a6: it prepares d5: after it, your pawn can come to d5 and hold there — the queen to f6 leaves d5 a square your pawn cannot hold yet." — a6 does not prepare d5. bookMoveWhy.preparesJob (bookMoveWhy.ts:171-190) compares the book board with the played board and credits the book move with any central push that is safe on one and not the other; here the difference is the QUEEN leaving d8 (it no longer backs d5), not anything a6 does. The job must be one the book move's own piece performs.
- 5…Nd4 (+3.6s): "Their knight takes d4 stops your c6, which would hit their bishop on b5." — FALSE: Black played …c6 two moves later, hitting the bishop on b5. What Nxd4 removes is the knight that attacked b5 and f3. (Its second half, "Anything else, like bishop to e2, gives up about half a point", is TRUE: Nxd4 +0.77, Be2 +0.35.)
- 16…Qxe4 (+16.5s): "Before you take on g2, look past the trade: your pawn on c6 would stand between their queen on b7 and your queen on g2, all on one diagonal — a pin." — there is no trade: …Qxg2+ is met by Kxg2 and the queen is simply lost. latentDanger.ts (tradeDanger, ~180-205) loops over every capture without asking whether the capture itself loses the piece.
- 3…Qf6 (+15.3s), same turn as the book line: "Keep your options open — the pawn move will still be there later … Your queen goes to f6 first, so if they take on c6 it takes back instead of a pawn. Set the table before the guests arrive." — praises the off-book move right after the book line faulted it (factImagery.ts:35 'prepare-recapture'). Board-true, but the two producers contradict each other in one turn.
- Checked TRUE: 9…dxe4 "anything else, like bishop to c4, loses material" (Bxe4 +0.87, Bc4 -1.20); 16…Qxe4 "on this move, exactly one move keeps you level" (O-O -0.51, Rb8 -2.43); 11…order-of-operations d4 threat; 12…"a new isolated pawn on c3"; 13…"your knight on g6 is three moves from" a5 and c5.

C2 names the student's move before it is played
- 14…Bd6 (+14.4s): "You play bishop to d6 first, so you can castle next" (moveIntent, same template as g2 8…Be7).
- 9…dxe4 (+4.4s): "So the plan: take their pawn on c3, the piece attacking your pawn" — the student's capture …dxc3, played two moves later.
- Bad-move warnings ("Bishop to g4? Then two moves later…", "Rook to b8? …", "if you play knight to g6 and they answer exd5…") are the allowed weighing, not violations.

C3 said twice
- 2…Nc6 (+2.5s): "It's the Ruy Lopez. They've gone for the Ruy Lopez: …" — the name twice in one breath (opening + openingTheirs, openingStory.ts:378).
- 13…Ng6 (+18.2s): "B-pawn takes c3 has a cost for them: no pawn of theirs can cover a5 again, and your knight on g6 is three moves from it. D-pawn takes e4 has a cost for them: no pawn of theirs can cover c5 again, and your knight on g6 is three moves from it." — one formula twice in one line.
- "Nothing hinges on your next move" (speedRunReads.ts:84) again at 10…Bf5 (+13.3s), in the same wave as "Order of operations: their threat first — your pawn on d4" (+20.9s): the first says nothing matters, the second that d4 is attacked.

C4 verdicts
- 3…Qf6 is -41cp at depth 20 (book a6/Nf6 -0.34 → Qf6 -0.75); the app priced 40 and said the book line at +2.4s. PASS (under 50, and it was named).

C5 long turns: 10…Bf5 163 words (10 lines over 47s, phase wave), 12…Bxe4 122.

C6 voice cut (muted pace 150 wpm, 12s cap — on a phone the cut is the same)
- 10…Bf5: "Before your move, checks, captures, threats: your pawn on d4 was attacked…" (39 words) cut after 1ms by "Bishop to g4? …".
- 10…Bf5: "Look ahead — a pin is two moves away…" cut after 6.4s (needs ~8s) by "Their d3 frees their bishop…" (the app logged tts-concurrent-speak force=true).

## Instruments and reproducing
- Replays: `replay-san.mjs <seat> "<SAN line>" <out.json>` through `scripts/audit-lib/hand-driver.mjs` (muted, AUDIT_SANDBOX=1) against Vite on b7ab6d3. The app's own `learn-transcript.current` is saved with each game.
- Grader: `os11-grade.mjs <out.json> 16`. It counts only `voiceService.speakCloud` rows (the voice), drops the replay's dictation lines, flags C1–C6 candidates, and each flag is then read by hand against Stockfish at depth 20–22 (`engine-at.mjs`, `cost20.mjs`).
- Two grader lessons from this run:
  - `speakPackage` rows are the queue: counting them double-counts the phase wave.
  - The muted voice caps a line at 12 s, so a "cut" is only real when the next line starts before min(12 s, words × 400 ms).
- Lines the grader flagged that were checked TRUE stay out of the counts and are named in each game's section.
- The four games' PGNs and graded tapes are in the session scratchpad (`os11/*.os11.md`); the lines are the OS-1 lines in `opening-measure-2026-10-19.md`.
