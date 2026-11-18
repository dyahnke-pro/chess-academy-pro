# WO-DANYA-READS-01 — every idea Danya reads off a board, computed (David 2026-11-18: "If not, that goes top of list. But keep that list! It is VERY important all of that gets done")

**Status: TOP OF THE LIST. Nothing on it is built yet.**

## The measurement (2026-11-17/18, four agents)

- **Source:** Danya's Chess.com instructional articles. 85 of 107 came through; 229 diagrams are exact, legal boards with his written read beside them. They are kept in a gitignored research folder as **reference only, never quoted** (the same rule as the transcripts).
- **Method:** our full computed read of each board was compared with the ideas he names, with evidence required on both sides.
- **Result:** 202 boards, **673 of his ideas**.

| | Ideas | Share |
|---|---|---|
| We say correctly | 189 | 28% |
| We say wrongly | 69 | 10% |
| We miss | 415 | 62% |

On top of that, **261 of our own lines were flagged false or pointless.**

**Verdict:** we are good at face-value facts (material, a direct attack, a named break, a one-sided verdict). We are weak at his real work: why the tempting move fails, the king attack, the reasons behind an evaluation, plans, practical chances and endgame technique.

**Caveat on the method:** each board's annotated game was cut at 600 characters, but 193 boards carry about 2,600 characters of his notes, which is where he walks the line. The second pass below fixes that.

## Step 1 — fix the false-line producers (a few root fixes clear dozens of lines)

| Pattern (all four agents agree) | Lines | What is wrong |
|---|---|---|
| "First, take X — that comes before any plan" | ≥ 22 | Recommends a grab the engine refutes; some walk into mate (Qxd6?? Qxd1#) or lose the queen (Qxc3, b2 guards). |
| Light/dark-square and colour-complex slogans | ~45 | Said on boards where it is irrelevant. |
| Passed-pawn, "second front" and "long-term trump" slogans | ~16 | Said on tactical boards. |
| "Minority attack" for any pawn lever | ~13 | Misused. |
| Isolated pawn, hole, "trade pieces not pawns" slogans | ~25 | Unrelated to the board. |
| Verdict contradicting the engine ("you're winning" at −876 or +75) | several | Wrong evaluation said out loud. |
| "Problem piece, stuck on the rim" | several | Said for the knight heading *to* its best square. |
| "Creates a passed pawn" | 1+ | Said when the pawn is taken en passant. |
| A pinned rook called "best placed" | 1+ | |

Each fix is made at its producer, with a test on his board that fails on the old code.

## Step 2 — the second pass, on his full line notes

The same four packets, with the uncut annotations: does our line explanation match the way he walks the line? About 400k tokens per agent. **Ask David before starting it** (swarm rule).

## Step 3 — the computers to build, ranked by how often he uses the idea

Counts are summed across the four agents (some ideas overlap).

1. **The king attack and threats to your own king (~90).**
   - Attackers versus defenders around each king, and which far-away pieces cannot help.
   - What a sacrifice opens and the forced follow-up that proves it.
   - Mating nets and quiet mate threats.
   - Discovered checks through a pinned blocker; back-rank weakness.
   - The opponent's threat read first (a null-move read) before any "take first" advice.
   - Existing pieces to extend: `everyMate`, `provenThreatLine`, `threatAnswer`, `queenNet`, `kingSquares`, `perpetualCheck`. New: `attackersVsDefenders`.
2. **The reasons behind the evaluation (~80).**
   - Active pieces against pawn count, coordination, mobility and stranded pieces.
   - Space, the bishop pair, which "weak" pawns are actually defended.
   - Passive pieces and outpost occupants.
   - **Who has the initiative** when the engine says level.
   - "Material even, nothing decided" must stop being the default verdict.
   - New: `pieceActivity`, `initiativeRead`, `verdictWithReasons`. Extend: `boardStructure`, `compensation`, `minorMatchup`.
3. **Plans (~60).**
   - The break and when it is due; the enabling move and prophylaxis.
   - Doubling on a file (Alekhine's gun) and rook lifts.
   - The worst piece and its route; opening a second front.
   - The **opponent's** real targets and strong points (today we name the student's own weaknesses instead).
   - Extend: `pawnBreak`, `planSteps`, `findEnablingMove`, `pieceRoute`. New: `targetSelector`.
4. **Why the tempting move fails (~55).**
   - For every natural or greedy candidate the read offers, play the engine's reply and say the refutation.
   - Replaces the "First, take X" line.
   - Extend: `temptingRefuted`, `ifTheyPlay`, `priorityFirst`.
5. **Endgame technique (~34).**
   - Opposition, triangulation, the rule of the square, zugzwang, breakthroughs.
   - Fortresses and how to break them; Lucena and Philidor by name with their steps.
   - Counting races; promotion choice (Q/R/B/N, stalemate, knight with check).
   - New: `oppositionRead`, `zugzwangRead`, `theoreticalEnding`, `raceCount`, `promotionChoice`.
6. **Trades (~24).** Which trade helps whom, the key defender and the plan to trade it off, material given up for a square, the exchange sacrifice. Extend: `tradeKeptAt`, `exchangeSacrifice`, `compensation`.
7. **Practical chances when worse (~22).** Rank candidate moves by the problems they pose the opponent: only-moves, how deep the refutation lies. Also why a passive hold loses, desperado play, bluffs. New: `practicalChance`.
8. **Hidden combinations and traps (~14).** Sacrifices the shallow top line does not show. The opponent's most natural reply to the best move that loses (the trap). Extend: `exchangeSacrifice`, `baitBranch`, `poisonedPiece`. New: `deepCombination`.
9. **The habit that closes a position read (~14).** One fixed habit cue for the board's decisive feature. Corrections already end on `correctionHabit` (2026-11-18); position reads do not yet.
10. **A blunder check before the student's candidate (~6).** Their checks, captures, double attacks and in-between moves after it.

## The yardstick

After every round, re-run the 202 boards and report the said / said-wrongly / missed shares and the false-line count. Done means:
- the false lines are near zero;
- the missed share is falling round over round;
- nothing is said wrongly.

## Rules for this work

- Every idea is **computed** (G0) and checked on the board. Never his words, never an LLM.
- New computers go through the one door and the shared fact set (gate `oneCoachSurfaces.gate.test.ts` and the door gates), in the human voice.
- The board read before a puzzle is solved speaks **only when the student taps for it** (David 2026-11-18); nothing reads a board automatically before the solve.
