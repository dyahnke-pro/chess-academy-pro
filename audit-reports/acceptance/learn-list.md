# Learn acceptance list — the answer key

Written 2026-10-20T15:21:14.160Z, before any acceptance run. 753 items over six games (reason 146, noLeak 128, noRepeat 147, noStat 147, boardTrue 147, verdict 7, danger 12, identity 6, beat 4, once 2, banned 7).

Board facts: Stockfish 16, depth 18 per student move (cost = best − played, from the student's side); every verdict re-checked at depth 22 and every threat at depth 20 from the null-move board. Only items I am sure of are in; borderline ones are listed at the end as left out.


**Revised after the lead's review (before scoring):** a MUST SAY item is met only by ONE sentence carrying the square AND the relation together (e.g. the threatened square + attack / hang / take; d5 + cover / hole / guard). Every threat and beat item now has controls: a sentence that names the square with the wrong relation must FAIL it (`node scripts/audit-acceptance-list.mjs --selftest`, 59 of 59 hold). The 753 items are unchanged.

## How each kind is checked

Every spoken line (`voiceService.speakCloud` only) is placed in the window of the student move it follows: from that move to the student's next move. The dictation's "Got it — after your move, they play …" is the instrument and is dropped. Squares spoken as "g 4" are read as g4.

| kind | MUST | owed on | met when |
|---|---|---|---|
| reason | SAY | every student move but a mating one | a sentence in the window states a reason or consequence (the repo's `why-count` reader) AND refers to the move: its SAN, its square, "your <piece>", "this/that/the move", or "castle" |
| verdict | SAY | a move costing ≥150cp at d22, position within ±4 pawns, not a book move | a sentence in the window calls it a mistake / says what it cost / what it hangs |
| danger | SAY | a NEW plain threat after their quiet reply: passing loses a piece (undefended, or attacked by a cheaper piece) worth ≥250cp at d20, and it matters | a sentence after their reply names the target square or "your <piece>" |
| identity | SAY | once per game, by a given ply | the opening's name is heard |
| beat | SAY | the hand-picked teaching beats below | the named square / idea is heard in that window |
| noLeak | NOT | every move with a next move | the student's next move (when it cost <100cp and was not forced) is not named — SAN, "knight to f3", "e-pawn takes d5", "castle short" — and no "castle next / so you can castle / then castle" while castling is legal; "their/they" moves exempt |
| noRepeat | NOT | every move | no sentence of 6+ words that was already heard earlier in the game |
| noStat | NOT | every move | no percentage, count of games, win rate |
| boardTrue | NOT | every move | every "your/their <piece> on <square>" is true on the board before the move, after it, or after their reply; hypothetical / past-tense sentences exempt |
| once | NOT | named turns | the same claim no more than once in the turn |
| banned | NOT | named turns | a known false line (graded by hand on main 46c8eb2) is not heard |

## g1 — Smith-Morra Gambit (White) — OS-11 g1

`e4 c5 d4 cxd4 c3 dxc3 Nxc3 d6 Bc4 Nc6 Nf3 g6 O-O Bg7 Bxf7+ Kxf7 Ng5+ Ke8 Bf4 Nf6 Re1 Qa5 Qb3 Rf8 Rad1 Ng4 Rd5 Qb4 Bg3 Be5 Nxh7 Bxg3 hxg3 Rxf2 Rg5 Qxb3 axb3 Rxb2 Rxg6 Kf7 Rg5 Rf2 Nd5 Bd7 Rxg4 Rxg2+ Kxg2 Bxg4 Rf1+ Kg8 Nhf6+ exf6 Nxf6+ Kf8 Nxg4+ Ke7 Nf6 Kf7 g4 Nd4 g5 Nxb3 Nd5+ Kg7 Rf6 Nc5 Kf3 Rf8 Rxf8 Kxf8 g6 a5 Nc3 Nb3 Kf4 Nd4 Kg5 Ne6+ Kf6 Nf4 g7+ Kg8 Nb5 Nh5+ Kg6 a4 Kxh5 Kh7 g8=Q+ Kxg8 Kg6 d5 exd5 Kh8 d6 Kg8 d7 Kf8 d8=Q#`

| move | item | MUST | what |
|---|---|---|---|
| by ply 9 | g1-identity | MUST SAY | the opening's name — the Smith-Morra Gambit (3.c3); DB name at that ply: "Sicilian Defense: Smith-Morra Gambit Accepted" |
| 8.Bxf7+ | g1-15-verdict | MUST SAY | that 8.Bxf7+ was a mistake (engine: it costs 235cp at depth 22; best Ng5) |
| 20.Rxg6 | g1-39-danger | MUST SAY | after their Kf7: the threat Kxg6 on your rook on g6 (passing costs 707cp at depth 20) |
| 25.Rf1+ | g1-49-danger | MUST SAY | after their Kg8: the threat Kxh7 on your knight on h7 (passing costs 480cp at depth 20) |

Per move (every student move): reason 49, noRepeat / noStat / boardTrue 50 each, noLeak 45.

## g2 — Najdorf, English Attack (Black) — OS-11 g2

`e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 f3 e5 Nb3 Be6 Be3 Be7 Qd2 O-O O-O-O a5 Bb5 Na6 Kb1 Nc7 Bb6 Qb8 Ba4 d5 Bxc7`

| move | item | MUST | what |
|---|---|---|---|
| 6...e5 | g2-12-cost-d5 | MUST SAY | the price of …e5: d5 can no longer be covered by a pawn (structure cost) |
| by ply 14 | g2-identity | MUST SAY | the opening's name — the Najdorf (5…a6); DB name at that ply: "Sicilian Defense: Najdorf Variation" |
| 7...Be6 | g2-14-be6-d5 | MUST SAY | …Be6 pays that price: the bishop guards d5 |
| 10...a5 | g2-20-race-once | MUST NOT SAY | the race more than once in one turn (three producers said it at 10…a5) |
| 10...a5 | g2-20-storm-false | MUST NOT SAY | FALSE: "their storm arrives first" (f3-f4 meets the centre pawn on e5) |
| by ply 22 | g2-race | MUST SAY | kings on opposite wings: the middlegame is a race (after 9.O-O-O) |
| 12...Nc7 | g2-24-pin-once | MUST NOT SAY | the Bb6 pin more than once in one turn |

Per move (every student move): reason 14, noRepeat / noStat / boardTrue 14 each, noLeak 13.

## g3 — Nimzo-Larsen 1.b3 (White) — OS-11 g3

`b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3 Na5 Be2 a6 c4 O-O Nc2 Re8 d3 b5 Nf3 c5 O-O Bc7 b4 cxb4 Nxb4 Bb7 Rc1 d5 c5 Nc6 a3 a5`

| move | item | MUST | what |
|---|---|---|---|
| 2.Bb2 | g3-3-diagonal | MUST SAY | 2.Bb2 puts the bishop on the long diagonal |
| by ply 5 | g3-identity | MUST SAY | the opening's name — the Nimzo-Larsen Attack (1.b3); DB name at that ply: "Nimzo-Larsen Attack: Modern Variation" |
| 4.Bb5 | g3-7-defender-false | MUST NOT SAY | FALSE: "the only piece guarding the pawn on e5" (their bishop on d6 guards it too) |
| 7.c4 | g3-13-storm-advice | MUST NOT SAY | WRONG ADVICE: push the f2/g2/h2 pawns to "pry open files" while your king is uncastled and about to castle behind them |
| 15.c5 | g3-29-danger | MUST SAY | after their Nc6: the threat Nxb4 on your knight on b4 (passing costs 449cp at depth 20) |
| 15.c5 | g3-29-c6-false | MUST NOT SAY | FALSE: "c5 prepares c6, which would kick their bishop off b7" (their knight stands on c6) |
| 16.a3 | g3-31-danger | MUST SAY | after their a5: the threat axb4 on your knight on b4 (passing costs 465cp at depth 20) |

Per move (every student move): reason 16, noRepeat / noStat / boardTrue 16 each, noLeak 15.

## g4 — Ruy Lopez 3…Qf6 (Black) — OS-11 g4

`e4 e5 Nf3 Nc6 Bb5 Qf6 Nc3 Nge7 O-O Nd4 Nxd4 exd4 Ne2 c6 Bd3 d5 c3 dxe4 Bxe4 Bf5 d3 dxc3 bxc3 Bxe4 dxe4 Ng6 Be3 Bd6 Qb3 Qe7 Nd4 Qxe4 Qxb7`

| move | item | MUST | what |
|---|---|---|---|
| 3...Qf6 | g4-6-a6-false | MUST NOT SAY | FALSE: "the book move is a6: it prepares d5" |
| 4...Nge7 | g4-8-storm-advice | MUST NOT SAY | WRONG ADVICE: push the f7/g7/h7 pawns to "pry open files" with your own king in the centre |
| by ply 10 | g4-identity | MUST SAY | the opening's name — the Ruy Lopez (3.Bb5); DB name at that ply: "Ruy Lopez" |
| 5...Nd4 | g4-10-c6-false | MUST NOT SAY | FALSE: "their knight takes d4 … stops your c6" (…c6 was played two moves later) |
| 16...Qxe4 | g4-32-danger | MUST SAY | after their Qxb7: the threat Qxa8+ on your rook on a8 (passing costs 864cp at depth 20) |

Per move (every student move): reason 16, noRepeat / noStat / boardTrue 16 each, noLeak 15.

## dB — David's Rossolimo (Black), 2026-10-17

`e4 c5 Nf3 Nc6 Bb5 e6 c3 a6 Ba4 b5 Bc2 c4 O-O Bd6 d3 cxd3 Qxd3 Bb8 Re1 Qc7 Nbd2 Nf6 Nf1 Ng4 h3 h5 hxg4 hxg4 Nd4 Ne5 Qg3 Qb6 Bf4 f6 Ne3 g5 Nxg4 Nf3+ Qxf3 Bxf4 Nxf6+ Kf7 e5 Bb7 Qd3 Rh2 Qg6+ Ke7 Qg7+ Kd8 Qxd7#`

| move | item | MUST | what |
|---|---|---|---|
| by ply 8 | dB-identity | MUST SAY | the opening's name — the Sicilian, Rossolimo (3.Bb5); DB name at that ply: "Sicilian Defense: Nyezhmetdinov-Rossolimo Attack" |
| 8...cxd3 | dB-16-danger | MUST SAY | after their Qxd3: the threat Qxd6 on your bishop on d6 (passing costs 526cp at depth 20) |
| 12...Ng4 | dB-24-danger | MUST SAY | after their h3: the threat hxg4 on your knight on g4 (passing costs 505cp at depth 20) |
| 13...h5 | dB-26-verdict | MUST SAY | that 13...h5 was a mistake (engine: it costs 251cp at depth 22; best Nge5) |
| 19...Nf3+ | dB-38-verdict | MUST SAY | that 19...Nf3+ was a mistake (engine: it costs 381cp at depth 22; best gxf4) |

Per move (every student move): reason 25, noRepeat / noStat / boardTrue 25 each, noLeak 22.

## dW — David's Vienna (White), 2026-10-06

`e4 e5 Nc3 Nc6 Bc4 b6 d3 Nf6 f4 Bc5 fxe5 Nxe5 Bb3 Bb7 d4 Bb4 Bd2 Nc6 e5 Nxd4 exf6 Bxg2 Nge2 Qxf6 Nxd4 Bxh1 Qe2+ Be7 O-O-O Bb7 Bd5 O-O-O Bxb7+ Kxb7 Qe4+ c6 Nd5 Qh4 Bf4 Bc5 b4 f5 Nxf5 Rde8 Qg2 Qf2 Qxf2 Bxf2 Nd6+ Ka8 Nc7+ Kb8`

| move | item | MUST | what |
|---|---|---|---|
| by ply 7 | dW-identity | MUST SAY | the opening's name — the Vienna Game (2.Nc3); DB name at that ply: "Vienna Game: Max Lange Defense" |
| 9.Bd2 | dW-17-verdict | MUST SAY | that 9.Bd2 was a mistake (engine: it costs 373cp at depth 22; best dxe5) |
| 12.Nge2 | dW-23-verdict | MUST SAY | that 12.Nge2 was a mistake (engine: it costs 551cp at depth 22; best Qg4) |
| 14.Qe2+ | dW-27-danger | MUST SAY | after their Be7: the threat Qxd4 on your knight on d4 (passing costs 499cp at depth 20) |
| 17.Bxb7+ | dW-33-verdict | MUST SAY | that 17.Bxb7+ was a mistake (engine: it costs 365cp at depth 22; best Ndb5) |
| 19.Nd5 | dW-37-verdict | MUST SAY | that 19.Nd5 was a mistake (engine: it costs 243cp at depth 22; best Nf5) |
| 19.Nd5 | dW-37-danger | MUST SAY | after their Qh4: the threat Qxe4 on your queen on e4 (passing costs 704cp at depth 20) |
| 21.b4 | dW-41-danger | MUST SAY | after their f5: the threat fxe4 on your queen on e4 (passing costs 1346cp at depth 20) |
| 22.Nxf5 | dW-43-danger | MUST SAY | after their Rde8: the threat Rxe4 on your queen on e4 (passing costs 1177cp at depth 20) |
| 23.Qg2 | dW-45-danger | MUST SAY | after their Qf2: the threat Qxg2 on your queen on g2 (passing costs 1275cp at depth 20) |

Per move (every student move): reason 26, noRepeat / noStat / boardTrue 26 each, noLeak 18.

## Left out (not sure enough)

- g1 13.Rad1 → Ng4: d16 threat Bxc3 pc 262; d20 Bxc3 pc 327 (not plain) — no danger item
- g1 14.Rd5: d18 cost 169, d22 cost 134 — no verdict item
- g2 14...d5 → Bxc7: d16 threat Bxb8 pc 684; d20 Bxb8 pc 750 (reply took a piece) — no danger item
- dB 16...Qb6 → Bf4: d16 threat Bxe5 pc 362; d20 Bxe5 pc 332 (not plain) — no danger item
- dW 8.d4 → Bb4: d16 threat Bxc3+ pc 385; d20 Nxe4 pc 413 (not plain) — no danger item
- dW 21.b4: d18 cost 177, d22 cost 137 — no verdict item
- dW 24.Qxf2 → Bxf2: d16 threat cxd5 pc 983; d20 cxd5 pc 1017 (reply took a piece) — no danger item

- Threats where their reply took a piece (the recapture usually answers it), or the target is defended and attacked by an equal piece.
- "a5 prepares a4" (g2), "moving it brings it to life" (g2, g3), "Move your knight on g1" (g3): hint at a student move without naming it.
- The d5 hole said in three turns of g3: it may have changed between them.
- Praise of 3…Qf6 (g4): only 42cp at d18, under the verdict bar.
- Opponent-mistake verdicts and the beats I could not tie to a square (why this branch, branches out loud, instinctive vs concrete).
