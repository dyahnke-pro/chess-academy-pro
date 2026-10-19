# Learn free play — hand walk, 2026-10-19 (helper session for the Learn fix)

**Builds:**
- `main` b629e25 — the baseline game was free-played here.
- `learn-standard-wip` **b494915** — the main session's build, and the one graded.

**Record:** David's data drop, 32,189 rows (his rating estimate is 1414 from 923 imported games). The fixture's redacted audit secret was cleared first; see H1.

**Voice:** muted. The board was graded with Stockfish 16 at depth 18–20. Times are US Central.

**Scope change.** The WO started as "replay a Learn game David played as Black". The lead then changed it twice:
- to free-play one White and one Black game;
- to OS-1 (measurement).

So this file covers:
- **White, 42 moves.** A Sicilian (Keres, 2.Ne2), free-played at ~1500 strength with three planned slips (12.Bb3 a mistake, 22.Rxa5 a blunder, 33.Ne8 a mistake). It was played on `main`, then replayed move for move on b494915 with the computer's moves dictated, for a direct comparison.
- **Black, the first 4 moves.** A Center Game, free-played on b494915. It was cut when OS-1 arrived. The OS-1 replays (two Black games among them) are in `opening-measure-2026-10-19.md`.

**Graded from:** the heard tape, i.e. the app's own `learnTranscript` events from `voiceService.speakCloud`/`speakPackage`. The driver's per-turn lines log each utterance twice (once in SAN, once in spoken form); they are not used for counts.

**The picture each turn was graded against** is in the appendix, distilled from CLAUDE.md, the 98-rule Rulebook and the design docs.

## Harness defects (fix before trusting any real-record audit)

- **H1 — Every fixture-loaded audit heard nothing.**
  - The drop's `profile.preferences.auditStreamSecret` is a redaction placeholder.
  - `fixture-loader.mjs` writes it over the live profile.
  - `appAuditor.ts:1340-1351` (`loadAuditStreamConfig`) then keeps the profile secret over the listener's, so every listener POST is refused with "bad secret".
  - Result on `main`: 15 turns, 0 words.
  - Fixed on b494915: the loader now nulls `auditStreamUrl` and `auditStreamSecret`.
- **H2 — The hand driver ends a turn too early and cuts the coach off.**
  - `/turn` ends a turn after 4 s with no new line.
  - Muted speech is paced at about 150 wpm (`voiceService.ts:2158`), so a 57-word line holds the voice for about 23 s.
  - Queued lines therefore start after the driver has moved on, and the next move or dictation kills them.
  - My runs now wait for the expected end of the last heard line plus 3 s (`waitVoiceIdle`).
  - Every audit on `/turn` undercounts what a patient student hears until the driver does the same.

## Defects on b494915, ranked by how often a student meets them

| # | move | what the student heard (exact) | the fact (engine d18–20 / board) | producer | root-cause fix |
|---|---|---|---|---|---|
| 1 | 12.Bb3 (−0.7), 22.Rxa5 (−5.3 blunder), 26 | Bb3: chat shows "Nf6+? That drops the rook on a1. Bb3 was a mistake — it cost about a point…", but the voice says only "Checks, captures, threats: nothing of yours can be taken… find it. So the plan: break open with the pawn push that is ready now." Rxa5: the voice says only "No rush yet — if you play b4 and they answer Ra1, their rook on a1 pins your bishop on c1 against your king on g1." | The verdicts are logged `CoachTeachPage.trackA` "track A spoke" (t=139797, 259282, 305906), but no `voice-speak-invoked` / `speakCloud` event carries them: **the mistake and the blunder were never voiced.** | `CoachTeachPage.tsx:10893-10937` `speakTrackA` — and the door: the 12.Bb3 `learn-turn-decision` row reads `spoke=[mistake,positionFacts] lead=positionFacts held={register:aside, positionFacts:verdict-turn, rejectedTempting:aside}` — on a costly turn the lead was the CCT/plan fact, not the mistake | It logs at enqueue. The late-wave verdict queues in `speechChainRef` behind the instant wave's long plan line, and the `trackAGenRef` check drops it on the next action (student move or typed message). On a verdict turn the verdict must lead the voice (pre-empt the instant wave's slow lanes), and "spoke" must be emitted when `voiceService` starts the line. Partly reinforced by H2, but a student who moves while the plan line is still talking loses it the same way. |
| 2 | 2.Ne2, 7.Bb5, Black 1…e5 | "It's level, so make chances: one move here creates an imbalance — doubled pawns for them — and the quiet move keeps it level." | False. After 1.e4 c5 2.Ne2 Nc6 the top line is d4 cxd4 Nxd4 (+0.39): Black's d7 + d4 are "doubled" for one ply only, until Nxd4. In the Black game, 2…Nc6 3.dxe5 is undone by …Nxe5. | `planJudgement.ts:252-277` `fightingLine`; `imbalanceOf(fen, first 2 plies)` at :265-266 | Read the imbalance at the quiet end of the line, after recaptures (the gem doctrine's rule), never mid-trade. |
| 3 | 16.Ne3 | "Knight to e3 heads for their king — knight to f5 next brings the knight to bear." | Names the student's next move, Nf5. | `kingAttack.ts:132` ('heads-for-king' puts `next.san` in the sentence) | Hold the square ("…one more knight move brings it to bear"), or make the lane take the one REQUIRED may-name flag (see #4). |
| 4 | 16, 20, 21; Black 1…e5 | 16: "walk it to c3, by way of d2"; 20: "chase it with c3 … on c3 it would cover that square"; 21: "The order matters: rook to f2 before knight to c4."; Black 1…e5: "you almost always take on d4 … you gain time hitting it with the knight to c6" | Each names a move the student has not played: Bd2/Bc3, c3, Nc4, …exd4 and …Nc6 (the last still in book, so the theory carve-out does not apply). | `squareJudgement.ts:230` (c3); `moveOrder.ts:134` (Nc4 — and its reason sentence was dropped, so the line has no why); the opening-identity lane (`openingIdentityTeaching`, learnBoardTeaching.ts ~780); the plan route in the planArc "Here's how" body (`planThread.ts:166`) | One decision, eight flag names (`namesBetterMove` / `namesMove` / `nameMove` / `namesMoves` / `holdPlayable` / `namesBestMove` / `holdStudentMoves` / `namesStudentMoves`). `Read.namesMove` and `holdStudentMoves` are optional (`speedRunReads.ts:37`, `arrowDoor.ts:71`). Make one REQUIRED may-name field on every fact, so a producer that names a student move cannot compile without answering it. |
| 5 | 12, 13, 22 | 12 (after …Nxb3): "Your pawn break: one is ready to push right now — find it. So the plan: break open…"; 13 (after …Bxg3 took your knight): "Your knight on d5 is your best piece — overprotect it…"; 22 (blunder): "No rush yet — if you play b4…" | Plan, slow and look-ahead lanes are spoken while a recapture is forced or a blunder has just happened. | `planChoice.ts:281`; `speedRunReads.ts:231`; `liveTacticsContext.ts:798` | A forced recapture or a costly move must make it a verdict/now turn in BOTH waves. Today the instant wave speaks before the verdict is known. |
| 6 | 12 | "Checks, captures, threats: nothing of yours can be taken, and nothing of theirs is free." | False after 12…Nxb3. The knight on b3 attacks your undefended rook on a1 and your bishop on c1, and the knight itself is undefended and attacked by a2 and c2. | `planChoice.ts:149` `cctRead` ← `readBoardUrgency` | The urgency read misses a capturer standing en prise and the pieces it forks. Count "take back the capturer" as both a win and a save. |
| 7 | 13→14 (and 51/53/59/65) | 13: "Your knight on d5 is your best piece — overprotect it…"; 14: "Give your knight on d5 a second guard — it is your best piece…"; 51/59/65: "You keep pushing the pawns in front of your own king — two/three/four so far…" | The same claim on consecutive turns, under rotated stems. | `speedRunReads.ts:231` `overprotect` returns no `claim` (only 6 reads in the file set one); `thinkAloud.ts:204` | Make `Read.claim` REQUIRED, keyed by fact and square (`srr:overprotect:d5`), so say-once catches the rotated stems. Count-reminders should say once per game, or only when the count grows *and* a hole is used. |
| 8 | 14, 19 | "F-pawn takes g3 was the only move that kept you level." / "G-pawn takes h4 was the only move… b4 didn't work: queen takes g3" | True (the others are −4.6), but it praises an obvious recapture of a piece or queen just taken. | `criticalMoment.ts:445` `criticalMomentFound`; :392 `failedCandidates` | The critical-moment read must exclude "the trade finishing", the way `deliberation` already does with `opponentLastSan`. |
| 9 | 18 | "Your pawn on g3 needs help, and the first defence that comes to mind fails. Look again…" | Spoken after …Qxh4: the move is gxh4, the g3 pawn taking the queen. | `methodBeat.ts:322` (look-again) | `defenceFails` ignores capturing the attacker. Same class as #6. |
| 10 | 33.Ne8 (→ Kxe8) | "On e8 your knight touches only four squares; in the centre it would touch eight." | False: the king just took that knight. | `exchangeIdeas.ts:731` | Reads `r.m.to` on the board before the reply. Read the board as it stands on the student's turn (the branch's own rule for concepts). |
| 11 | 3.Nbc3 → …e5 | "Their e5 prepares b4." | The move is …Bb4 (e5 opens f8–b4). The piece letter is dropped, so the student hears a pawn move. | moveIntent "prepares" render (`moveIntent.ts:396-403` family) | Render the prepared move as full SAN or in words ("the bishop to b4"). |
| 12 | Arrows, whole game | 12 of 42 turns drew any arrow. 2.Ne2 drew a green f2–f4 (a student move not played). 13.axb3 drew a green c2–b3, the REJECTED recapture. | Most named moves get no arrow: Nf6+, Nxb3, Bxd5, Nf5, c3, Nc4, b4/Ra1. | arrow doors (`keptLines` is late-wave only, CoachTeachPage ~12138; instant-wave lines never drawn) | Draw from each kept fact's own line, every wave. Never draw a held student move; a refuted move is red, never green. |
| 13 | 22.Rxa5 | (gate) `voicePackage.mistake.narrationGate` tripped ×3 on "That took the pawn on a5, but the pawn on b6 takes back — you lose a rook for a pawn." | That is true: …b6 does take on a5 (on `main`, "the rook on a7 takes back" also tripped). The gate stripped a true consequence. | narrationGate | Fix the gate's false positive (recapture by a pawn); a gate that fires on truth hides the lesson. |
| 14 | 26 (chat only) | "…The natural alternative, …Kf8, fails: Kf8 and, three moves later, Kxd8 — you come out ahead on material, winning a rook and a pawn for a bishop." | False. d20 after 26.Ng3 Kf8 gives Bxh6+ Ke8 Nh5 Kd7 Nf6+ Kc8 Bg7 Ra1+ at −4.34 for the student: no Kxd8, the student is not ahead, and …Kf8 is only 0.45 off best. | `decisiveReason.ts:233` | It weighs the OPPONENT's alternative inside the reason for the student's move, and prints a loss line that isn't that board's PV. |
| 15 | 24 | "stack your heavy pieces on its file…" | One rook, no queens. | `nextPlans.ts:314-317` (any rook counts as "heavy pieces") | Name what is there ("your rook"). |
| 16 | 36.Rxa1 | "Taking stock as the endgame begins: you're losing…" spoken twice, 157 words in the turn | Repeat inside one turn. | `reviewPositionalAssessment.ts:307` via the phase lane | Say-once on the phase claim across both phase emitters. |

**Fixed on b494915 vs `main`** (same game):
- 1.e4 no longer says "to free your bishop on f1 for Be2".
- 15.Qh5 lost "Bd2 completes your development … the opening move here".
- 12.Bb3 now carries a verdict (in chat; see #1 for the voice).

**True claims checked:**
- the f7 count (2 attackers v 3 defenders);
- the b5 hole after …a5;
- the b8 knight's three squares;
- "h5 freezes the g-pawn" (g6 runs into hxg6, g5 is taken en passant);
- the d2 bishop bearing on a5;
- the c3 knight touching eight squares, up from three.

**Trends:**
- **Words:** 58 heard words per turn on average (target 80 or fewer), counting only voiced `speakCloud` lines and excluding the replay's own "Got it — after your move…" confirmations (an earlier draft said 73 because it counted them). Long turns: 157 (36.Rxa1), 130 (24.h6), 107 (28.Nf6), 104 (3.Nbc3).
- **Reply time:** 3.6 s average from move to reply.
- **Board size:** 426 px on every move, with no drift.

## Appendix — the grading picture


Distilled from CLAUDE.md, the live Rulebook (98 rules, db `rules`), the design docs, and the
OUTLINE/PLAN state. Each line of a walk is graded against this, not against what the code emits.

## After the student's move, in order
1. **Danger first** when something of theirs is hanging, attacked or about to be mated, unless the
   student has a forced mate (Rulebook D5, `learnTurnDoor.ts:380-381, 534-544`).
2. **The opening named once**, when it settles. After a book departure, the book move is named
   with its job on the board and what the played move left undone (CLAUDE.md "THEORY" carve-out).
3. **What their move changed: its own reason**, good moves included (WHY measure 2, ≥70% of turns).
   A mistake gets its why from the one error computer, then the grade (never a bare grade).
4. **The weighing.** The moves they would consider and why each falls short. The good move is
   held unless asked; a held move they find is credited; a missed one is not named.
5. **"Not yet, first this."**
6. **The line played out, with their reply in words**, carrying its proof. The voice says the
   shape and the board shows the detail. Engine lines are said in short form only. Arrows build
   move by move as spoken; a line is drawn in full.
7. **The opponent's move.** Its purpose and its cost; their better move when theirs was weaker
   (carve-out 2). On their slip: what it lets you do; never the answer after a miss.
8. **What the opponent keeps doing wrong.**
9. **A term defined once**, in context.
10. **Earned praise only** (decision / only move / save / punish, plus the streak), with its why.
11. **Close on the habit** — to the mover only, last, never generic.

## Never
- The student's next or better move unasked (incl. "for Be2", "prepares h4", plan routes,
  look-ahead lines and arrows that show it). Exceptions: the book move after a departure; the
  opponent's past better move.
- Two "here"s about different boards; a forward weighing with no frame, so it reads as a
  verdict on the move just played.
- Praise or "only move" the engine contradicts, or praise on a forced recapture.
- A costly move (≥1.5, game not decided) with no verdict, or a verdict without a why.
- A plan, lecture or slow lane beside a mate, a blunder or a live threat.
- Repeats across turns, including the same idea under another key.
- Phase-wrong lanes: opening or development advice in a middlegame or ending, castling talk in
  an ending, "heavy pieces" with none on the board.
- Garble (". .", "they guard it no times", "— the opening move here").
- we/our/us, I/my, he/his; interface talk; move numbers; corpus or library notes.

## Measures
- 100% of board claims true (piece, square, seat, legality in sequence, counts, engine eval at
  depth 18–20). Undecided claims counted separately.
- Average ≤ 80 heard words per turn — an average, not a limit.
- Turn latency (move to reply) and board size per move, as trends.
- Before calling a lane silent, check `learn-turn-decision`: held and never-fired are different bugs.


## The games (on record)

**Game 1 — White, 42 moves.** Sicilian, Keres (2.Ne2). Free-played on `main` b629e25, then replayed with the same moves on b494915. Move numbers in the table refer to this game:

```
e4 c5 Ne2 Nc6 Nbc3 e5 Ng3 Nf6 Bc4 d6 h3 Be7 Bb5 O-O O-O Nd4 Bc4 Be6 d3 Nd7 Nd5 Bh4 Bb3 Nxb3 axb3 Bxg3 fxg3 Nb8 Qh5 a5 Ne3 b6 Qh4 Nc6 Ra3 Qxh4 gxh4 Rfd8 h5 Nd4 Rf2 Ra7 Rxa5 Rxa5 Bd2 Ra7 h6 gxh6 Nf1 Kg7 Ng3 Rg8 Nh5+ Kf8 Nf6 Rg6 h4 Kg7 Ne8+ Kf8 Nxd6 Nxc2 h5 Rg8 Ne8 Kxe8 Bxh6 Ra1+ Rf1 Kd7 Rxa1 Kc6 Rf1 Kb5 Bd2 Nd4 Kh2 Nxb3 Be3 Rg4 Kg1 Rh4 Bg5 Rg4
```

Planned slips: 12.Bb3 (mistake), 22.Rxa5 (blunder), 33.Ne8 (mistake). 7.Bb5, 17.Qh4 and 28.Nf6 were small inaccuracies.

**Game 2 — Black, Center Game.** Fair pace, cut at move 4 when OS-1 arrived:

```
e4 e5 d4 exd4 c3 d5 exd5 Qxd5 cxd4
```

**Game 3 — Black, French Exchange.** Fast pace (before the voice-idle fix), cut at move 7:

```
e4 e6 Nf3 d5 exd5 exd5 d4 Nf6 Bg5 Bd6 Be2 Na6 Nc3 Be6 Bxa6
```

**Unvoiced-verdict timestamps** (ms from the game start, the app's own `learnTranscript`, game 1 on b494915):
- t=139797: 12.Bb3 verdict;
- t=259282: 22.Rxa5 blunder verdict;
- t=305906: the 26.Ng3 "Move it with gain…" line.

None of the three is followed by a `voice-speak-invoked` / `speakCloud` event carrying its text.
