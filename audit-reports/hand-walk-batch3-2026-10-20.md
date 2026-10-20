# Hand walk — batch 3 (origin/batch3 b7d7093), 2026-10-20

**Setup:** localhost Vite on a clean batch3 worktree, muted hand driver, David's drop loaded (32,189 rows).
- Replay of his Smith-Morra (teach-mvfhdihq-7i8vk5), his moves played and the coach's moves dictated.
- `REPLAY_SETTLE_MS=9000`, so each turn's late wave is heard before the next dictation is typed. Without it the typed dictation cuts the late wave — a harness artifact, not product.
- Graded from the app's own learnTranscript (voiceService.speakCloud rows, +ms from the move).
- Engine: native Stockfish 16, depth 20, on every cost and "better move" claim.

**Instrument notes (fixed before grading):**
1. A fresh worktree has no `public/stockfish/*.js` (gitignored), so vite served index.html and the engine never loaded. 92 force-restarts; run discarded.
2. The driver's per-turn "lines" list each line twice (page + voice); the transcript is the source.

## Game 1 — Smith-Morra (White), 50 turns, to mate

| contract | result |
|---|---|
| C1 board-true | FAIL — 3 (below) + 1 unverified |
| C2 never names the student's move first | FAIL — 2 |
| C3 nothing twice | FAIL — 1 (+ the "That was the move here — it …" stem, 9×) |
| C4 verdict ≤ ~3 s on a costly move | FAIL — 14.Rd5 at +18.1 s; 8.Bxf7+ +4.1 s, 39.Kg5 +4.2 s (near) |
| C5 avg words ≤ 80 | 81.7 — just over |
| arrows on named moves | ~40 of 86 named moves had an arrow on that square (crude count) |

Engine truth for the costly moves (d20):
- 8.Bxf7+: −2.4.
- 14.Rd5: −1.8 (app 192 ✓).
- 18.Rg5: −1.3 — but from −4.5, so expected points barely move. Its silent verdict is the grader, not a defect.
- 10.Bf4: −0.7 (the app settled at 54 and did not praise it; the d16 "149" that drove the settled-price build was itself noise — d18 72, d20 67).

### C1 board-false
- 14.Rd5 +30.5 s: "if they go ahead with rook takes f4 anyway, you take their queen on a5" — the queen went to b4 on the reply. A stale read from the board before the reply (OS-11 #4, still live).
- 17.hxg3 +5.4 s: "Queen takes b4 would not have worked … bishop takes f2 with check refutes it" — the answer to 16.Nxh7's "Why not queen takes b4?", said one move later. Same split at 18.Rg5 → 19.axb3 ("Rook takes g4 would not have worked"). The rejectedTempting question and its answer straddle a move (OS-11 #4, still live).
- 21.Rg5 +13.5 s: "Rook to g5 wins by force: you come out ahead on material, winning a rook for a knight". White stays lost and behind (OS-11 #5, still live). "Rook takes d6 gives up about a point" — 2.4.
- 1.e4 +10.9 s: "one move here creates an imbalance — doubled pawns for them" — after 1…c5 no White move doubles a Black pawn. To verify at the producer.

### C2 names the move first
- 6.Nf3 +13.5 s: "You play knight to f3 first, so you can castle next" — the next move (moveIntent.ts castling exemption, OS-11 #1, still live).
- 23.Rxg4 +16.8 s: "you play rook takes g4, they answer bishop takes g4 and you play king takes f2" — names a student move two plies ahead.

### C3 twice
- 8.Bxf7+ (186 words): the verdict twice in one utterance — the poisoned-pawn record line, then the mistake lane (OS-11 #6, still live).
- "That was the move here — it …" 9× in the game, never rotated.

### C4 / speed — a regression from the settled price (mine)
14.Rd5: the reply landed at +7.5 s, "Careful — your bishop on f4 is attacked" spoke first (+11.5 s) and the verdict queued behind it (+18.1 s).

The reply waits for the reason reads ("THE REPLY WAITS FOR THE REASON", capped). On the single serialized engine, the settled price's deeper search now sits in front of those reads. Reply times on unsettled moves:

| move | before settled price | now |
|---|---|---|
| 10.Bf4 | 3.5 s | 8.2 s |
| 14.Rd5 | 10.1 s | 12.2 s |
| 15.Bg3 | 7.4 s | 9.0 s |

Fix: the deepening waits for the reply.

### Better than OS-11 (batch 2)
- 7.O-O: no "Nothing hinges on your next move", and no target-less "a discovery is two moves away".
- 10.Bf4 is no longer praised.
- Kg5's verdict holds (+4.2 s).
- Board-true checks that passed: Be5 "about a point" (1.3), Bd7 "about two points" (≥1.9), Rd5 "a mistake" (1.8), 20.Rxg6 "your rook on g6 hangs", the g3 passer "blockaded".

## Game 2 — Keres 2.Ne2 (White), 42 turns — David's game from the Black-walk report

**Build caveat:** run on batch3 plus two of my fixes (exchangeIdeas reply rule, moveIntent castle hold), which hot-reloaded into the dev server before this run. Neither touches the lines below.

Average 71.1 words/turn (C5 pass). Engine: SF16 d18 on the slips.

| planned slip | engine | heard |
|---|---|---|
| 12.Bb3 | −1.1 (a4 +0.57 → −0.52) | no verdict. The price was 105 and it graded *inaccuracy* by expected points; inaccuracyVoice is `middlegame=quiet` on David's record (by design: mistakes and blunders always speak) |
| 22.Rxa5 | −5.4 | verdict +5.7 s ✓ — but "They answer b-pawn takes a5, **you play h6**, and they play g-pawn takes h6": names his next move (C2) |
| 33.Ne8 | −1.7 from −5.2 | no verdict — decided game, expected points barely move: correct |

C1 board-false:
- 10.d3 +10.6 s: "c2, d3 and e4 form a chain: c2 is its base, **the one pawn nothing else guards**" — the queen on d1 guards c2 (OS-11's pawnJudgement.ts:210 finding, still live).

C2 / contradiction:
- 7.Bb5 +6.5 s: "Nothing hinges on your next move…" and, in the same breath, "one move here creates an imbalance — bishop for knight and doubled pawns for them" (Bxc6). Plus "Their king went kingside, and yours is still in the centre — … your pawns on f2, g2 and h3 … Pushed, they pry open files toward their king."
- Then 8.O-O +3.9 s: "Both kings on the kingside: no pawn race — pushing the pawns in front of your own king only weakens it". Opposite plans one move apart (OS-11 dup #6: splitPosition vs kingSafety, still live).

Checked TRUE: 9.Bc4 "one move creates doubled pawns" (Bxe6 fxe6); 29.Ne8+ "forks the king and the pawn on d6"; 36.Rxa1 "their king to c6 is imprecise — they could have won your rook".

Smith-Morra follow-up: 1.e4's "one move here creates an imbalance — doubled pawns for them" after 1…c5 — no White move doubles a Black pawn there. To check at the producer.

## Game 3 — French Exchange (Black), 19 turns: Game 3's moves to 8.Bxa6, then live

Live part: the student's moves are Stockfish d12, with the second-best move every fourth turn; the coach chose its own moves.
- Same build caveat as game 2.
- Average 62.7 words/turn.

- C1/contradiction, 10…h6 (+10.6 s): "Nothing hinges on your next move" and, in the same breath, "Order of operations: their threat first — your pawn on a6".
  - After 11.Bh4 the top four moves are within 0.25 of each other (O-O −0.80, Rc8 −0.88, g5 −1.00, a5 −1.05), so "nothing hinges" holds.
  - But none of them meets the threat, so "their threat first" asks for an answer that is not there. Two producers disagree in one turn (OS-11 speedRunReads finding, still live).
- 17…Kh7 (+10.6 s): "Before you take on c5, look past the trade: your knight on f6 would stand between their queen on g5 and your queen on d8" — checked TRUE (…Bxc5 vacates e7).
- 15…g5 "That was the move here" — TRUE (best, +0.85).
- 8…bxa6 "attack their king on e1 … look for a sacrifice on d2 or f2" — a generic plan; not board-false.
- No costly student move in this game, so no verdict test.

## OS-11 findings, re-checked on batch3

| OS-11 finding | batch3 |
|---|---|
| moveIntent "so you can castle next" | still live (6.Nf3) → **fixed** |
| stale late wave ("you take their queen on a5") | still live → **fixed** (exchangeIdeas) |
| rejectedTempting Q/A straddle a move | still live — **not fixed**: the past-tense answer is true of the board it was asked on; needs the live board inside the resolver. Lead's call |
| 21.Rg5 "wins by force … ahead on material" | still live — **not fixed**: from the app's own shallower line, which the record doesn't carry; d20 finds no forced win |
| 8.Bxf7+ verdict twice | still live, though de45034 (mistakeTurnLine) is in batch3 — the grade reported no lost square for a capture taken straight back (`held-by-defender`), so `sameLossAsGrade` never matched → **fixed** |
| speedRunReads "Nothing hinges" beside a threat | 7.O-O version gone; the French 10…h6 version is live — **open** |
| liveTacticsContext "removal of guard … grab it" | gate (`collects`) present; not reproduced in these games |
| "a discovery is two moves away" with no target | not heard in the three games |
| latentDanger "look past the trade" on …Qxg2+ | **fixed** (a capture that loses on its square is no trade) |
| pawnJudgement "the one pawn nothing else guards" | still live (Keres 10.d3) → **fixed** |
| splitPosition vs kingSafety, opposite plans | still live (Keres 7.Bb5 → 8.O-O) — **open** |

## Fixes on `learn-batch3-walk-fixes` (from origin/batch3 b7d7093)

1. **Settled price waits for the reply.** `liveMovePrice(…, { deepenAfter })`; Learn passes the reply's commit (6 s fallback), so the deeper search no longer delays the reply. Test: `settledPrice.bf4.test.ts`.
2. **A read of their reply is history once they have replied.** In `exchangeIdeas`, a student-move idea whose proof line starts with their move on the post-move board is dropped once the board is past it. Test: `exchangeIdeas.replied.test.ts` (14.Rd5 → Qb4).
3. **Castle held.** `moveIntent` says "clears the way to castle", never "castle next", when the prepared move is held. Test: `moveIntent.castleHeld.test.ts` (6.Nf3).
4. **The verdict's cost line doesn't name the student's next move** when the surface may not (`inaccuracyCall` costTail). Test: `costCarriesLine.test.ts`, updated: false → "They answer e5."; true → the full line.
5. **latentDanger: a capture that loses on its own square is not a trade.** Test: `latentDanger.notATrade.test.ts`.
6. **Chain base said truly** ("the one pawn no other pawn guards"). Test: `pawnJudgement.chainBase.test.ts`.
7. **Outpost: one definition, one key.**
   - `forwardTeaching.isKnightOutpost` deleted, so `outpost.isOutpost` is the one definition.
   - `nextPlans`' "a minor on an outpost is not the worst piece" check never fired (it used the empty-square copy on an occupied square); it now does.
   - The rule and the board teacher both claim `outpost:<sq>`. Test: `outpostOneKey.test.ts`.
8. **Hole: one key.** The opening story (cost and gift) and the pawn judgement mirror all claim `hole:<sq>`. Test: `holeOneKey.test.ts`.
9. **8.Bxf7+ said once.** `errorWhy`'s lost square now includes a capture taken back on its square, so the f7 fundamental and the grade are one loss. Test: `bxf7LostSquare.test.ts`.
10. **Isolated pawns: one owner.** `findWeakPawns.isolated` reads `boardStructure.pawnsOf`. Test: `isolatedOneOwner.test.ts`.

Not done from the dup map: a third outpost computer exists (`boardStructure.computeOutposts`, feeding the board teacher), and the hole's `findWeakSquares`/`holeAccess`/`planChoice` owner merge. Only the shared key landed.


`positionFacts.test` "says a standing fact once": its fixture's only standing clause was the false trade warning (Nxe5 there just loses the knight), so it moved to the passer-race board the plan test uses. The property it checks is unchanged.
