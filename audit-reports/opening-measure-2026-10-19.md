# OS-1 — what Learn's existing computers do in the opening, on David's record (2026-10-19/20)

**Build:** `learn-standard-wip` **b494915** (worktree, Vite dev server, muted hand driver). The model doc was read from ec656c6 (docs only).

**Record:** David's data drop (32,189 rows), loaded with `/fixture`. Its redacted audit secret was cleared so the listener can hear.
- His green fade levels at the start of every game (`loadFadeLevels`): 19 tags at **"short"**, including missed-opponents-threat, hung-material, missed-tactic and calculation-depth.

**Pace:** fair. After each student move the replay waits until the muted voice finishes the last heard line (about 400 ms per word, plus 3 s) before the next move. The hand driver's own 4 s quiet rule cuts the voice off, so it isn't relied on.

**Evidence:** for every turn, the app's own `learnTranscript`:
- HEARD lines (`voiceService.speakCloud`), stamped +ms from the student's move to voice start;
- chat-only lines;
- every `learn-turn-decision` row (offered / spoke / lead / held + heldWhy / faded / ownMove).

Each game's tables were filled by a reader and then corrected by an adversarial checker against the same prep file (checker notes are kept under each game).

**Graded against:** `docs/plans/2026-10-19-opening-explanation-model.md`, the 11 beats.

**Times:** US Central.

| game | line | seat | status |
|---|---|---|---|
| g1 | David's Smith-Morra, `teach-mvfhdihq-7i8vk5` (50 moves, to mate) | White | done |
| g2 | Naroditsky's Najdorf English Attack line, to 14…d5 | Black | done |
| g3 | 1.b3 Nimzo-Larsen; masters book to 10.Nf3, then engine | White | re-running (a container restart cut it at move 6) |
| g4 | Ruy Lopez with the student's deviation 3…Qf6?!, then engine | Black | queued |


---

# g1 Smith-Morra: OS-1 measurement (build b494915, David's record loaded)

**Before reading the tables:**
- The prep has **0 CHAT-ONLY lines**, so no beat can be EXISTS-BUT-UNVOICED, and no costly move got a chat-only verdict.
- **Phase lines are logged twice.** The raw transcript `g1-smithmorra.json` logs each one as `voiceService.speakPackage` and again as `voiceService.speakCloud`, but it is one utterance. This inflates the heard-word counts for plies 13 and 47. Deduplicated figures are given in D.
- **Opening window.** The core opening is plies 1–13: the app fired the opening→middlegame transition on O-O (`rule=castled-connected`). The extended window runs to ply 29. Black never castles.
- **Game id.** The raw transcript's game id is `teach-mvfubphz-9uuvuh`, a replay of `teach-mvfhdihq-7i8vk5`.

## A. The 11 beats

| # | Beat | Verdict | Evidence |
|---|---|---|---|
| 1 | Name the road at the fork, with the alternatives | **PARTIAL** | The name is given at each step. Ply 1: "This game is the Sicilian Defense." Ply 3: "It's the Smith-Morra Gambit of the Sicilian Defense. It offers a pawn, and they almost always take it on d4." Ply 11: "…Smith-Morra Gambit Accepted, Fianchetto Defense…". The only alternative ever implied is declining the pawn; no menu of families is given at any fork. `openingIdentity` and `openingIdea` were offered 0 times. `strongChoice` was offered at ply 7 but neither spoken nor held. narrationGate (`voicePackage.computed`) dropped "That's what strong players play here — it wins the pawn on c3." |
| 2 | One-line identity | **PARTIAL** | The "what makes it" part works. Ply 3, `opening` lane, +1973ms: "It offers a pawn, and they almost always take it on d4. In the main line you stay a pawn down for at least 4 moves, playing for time instead of material." Two parts are missing. Where the name comes from is never said. The model asks for the identity "once", but the name is re-announced at plies 1, 3, 5 and 11, including the broken "It's the Accepted of the Sicilian Defense" at ply 5. `openingIdentity` was offered 0 times. `openingEquivalence` names the sub-line at ply 11. |
| 3 | Their setup and its plan | **PARTIAL** | The name of their system is given at ply 11 ("Fianchetto Defense"), but its plan is not. Ply 11, `theirIntent` (lead): "They play g6 first, to free their bishop on f8 for bishop to g7." That is one move's purpose, not a plan over the next moves. At ply 7 `theirIntent` was held as "aside". At ply 13, `usePhaseNarration.spokenSentenceGate` dropped two phase sentences as ungrounded tactics: "They want the bishop to g4, pinning your knight." and "Watch Bg4 — it would pin your knight on f3." |
| 4 | Which branch you chose and why, against the other main branch | **PARTIAL** | Ply 7, +4279ms, `positionFacts` (spokeKind `refuted`): "Bishop to c4 is a common try here, and it costs you about half a point — nothing forcing, just a worse position. Knight takes c3 doesn't pay that." This compares move orders and scores Bc4 by an eval number. It does not choose a branch by where each one leads. The fact's FEN is the move-5 board (`…w KQkq - 0 5`); see E. |
| 5 | Your structure's built-in cost, and the move that pays it | **PARTIAL** | The price is named. Ply 3: "stay a pawn down … playing for time instead of material". Ply 5 (that row spoke `positionFacts` and `structureJudgement`): "Let them open the c-file: every square their rooks could use there, c2 and c4, is covered." Ply 13 phase: "the balance sheet: it's level — you're ahead in development … they're up a pawn — and the two hold each other." No move is named as paying the cost. White's own weakness is first heard at ply 47, in the endgame: "your pawn on e4 is isolated — a target they can pile on." |
| 6 | The middlegame's character, before it arrives | **PARTIAL** | Ply 3: "playing for time instead of material". Ply 5, +4853ms: "the position just opened up, so hit the gas: you have one check and 2 captures to look at, before they can close it again." At the transition (ply 13) only the balance sheet and "Nothing hinges on your next move — pick a sensible one…" are said; nothing says what kind of game this is. `character` is first offered at ply 17, after the blunder. `splitPosition` was offered 0 times. |
| 7 | The instinctive move first, then the concrete point | **PARTIAL** | None of the three examples does the model's beat. (1) Ply 7, `recapture`: "Knight takes c3, not b-pawn takes c3, which would leave an isolated pawn on c3." This is a routine recapture, and it gives the played move first, the reverse of the model's order. (2) Ply 11, `moveIntent`: "You play knight to f3 first, so you can castle next — a king left in the middle gets caught the moment the center opens." It gives the point but no instinctive alternative. (3) Ply 13 phase: "The obvious stop is the pawn to h3, but that pawn becomes a hook for their pawn on g6 — find another way." It has the model's shape, but it answers a threat the student never heard (that threat was dropped by the gate) and gives no concrete point. |
| 8 | The structural key move (the break) | **PARTIAL** (never named) | The break was raised only as a question and never named as the line's idea. `planArc` at ply 13 asks "where is your pawn break?", and the same fact answers "put a rook on the open c-file". e5 is heard only as a danger, at ply 19 in the `threat` lane: "No rush yet — if you play e5…". The record lists e5 as the engine's best move at ply 27 (Rd5, `bestSan=e5`). The break lanes were never offered in the opening: `openingIdea` 0 times, `breakRace` 0 times, `structure` not until ply 91. |
| 9 | Walk the branches out loud when the opponent has a choice | **PARTIAL** (opening: ply 3 only) | Ply 15: "They take back with king takes f7 — anything else, like king to f8, loses material in the line that follows." Ply 23: "Their rook to f8 stops your queen to f7, check. Anything else, like knight to h5, gives up about a point." Each gives the cost of one alternative, not both branches. In plies 1–13 the only instance is ply 3's "they almost always take it on d4". |
| 10 | Danger signs specific to the line | **PARTIAL** | Ply 13 phase, +48428ms: "Look ahead — a discovery is 4 moves away: their knight to e5 and then their knight taking on c4." then "Spot it before it lands." and "This is a pattern that keeps catching you — watch for it." This is a generic computed look-ahead (`liveTacticsContext`), not a sign tied to the line, and it never says what is discovered. The line-typical …Bg4 pin was dropped by the gate. `prophylaxis` was held as "aside" at ply 13. "Nothing of theirs is free" was heard only after the f7 grab (+4836ms at ply 15). `trapAhead` was offered 0 times. |
| 11 | Honest judgement of your own moves | **PARTIAL** | Ply 15, `mistake`, +17965ms: "That pawn was defended: your bishop takes on f7 and is taken on the spot — it cost you far more than a pawn. … Bishop takes f7, check was a mistake." Ply 27: "Rook to d5 was a mistake…". Three costly moves got no verdict. **O-O** (ply 13): the record shows misplaced-piece, 69cp lost, best Qb3. **Bf4** (ply 19): the record shows 112cp lost, best Qb3, yet the DECISION row says cost ? and `ownMove=affirm`. **Kg5** (ply 77): see E. `drawback` was offered 0 times all game. The coach's verdict on the coach's own moves (`coachMistake`) first appears at ply 37. |

## B. Threats

**Offer counts:**
- `threat` was offered on 8 rows (plies 19, 25, 27, 29, 31, 35, 45, 85), and every one was spoken.
- `threatAnswer` was offered on 3 rows (plies 19, 31, 85). All three were spoken and all three were faded.
- `dangerLevels`, `trapAhead` and `checkMethod` were offered 0 times.
- No threat lane was offered on plies 1–17.

| Ply | Line | Lane / status | Type |
|---|---|---|---|
| 13 | "Look ahead — a discovery is 4 moves away: their knight to e5 and then their knight taking on c4." | phase, spoken at +48428ms | hidden (4-move line); what is discovered is never said |
| 13 | "They want the bishop to g4, pinning your knight." / "Watch Bg4 — it would pin your knight on f3." | phase, **dropped** by `spokenSentenceGate` | hidden (pin) |
| 13 | `prophylaxis` | **held "aside"**; its text is not in the data. The phase path voiced an h3 "stop" for the same pin. | n/a |
| 19 | "No rush yet — if you play e5 and they answer d-pawn takes e5, … reveals their queen on d8 attacking your queen on d1." | threat (instant), +4158ms | hidden (discovered attack, 2 moves) |
| 19 | "Step out of it — take the queen off the line." | threatAnswer (faded), +17283ms | n/a |
| 25 | "Danger — a whole piece is at stake: your bishop on f4 is the only defender of your knight on g5 — and it can be taken." | threat (instant, faded), +2935ms | hidden (removing the guard) |
| 25 | "Knight takes h7? Knight takes h7 and, two moves later, bishop takes e1 — you come out behind…" | positionFacts, +17696ms | hidden (3 moves) |
| 27 | "Careful — your bishop on f4 is attacked and nothing's defending it." | threat (instant), +8118ms | simple |
| 29 | "Not urgent yet, but see it coming — their queen on b4 pins your knight on c3 against your rook on e1." | threat (faded), +5051ms | hidden (pin) |
| 31 | "Careful — your pawn on f2 guards your king, and they hit it three times…" / answer: "Take it — one capture removes the bishop doing it." | threat +4113ms; threatAnswer (faded) | simple |
| 35 | "Careful — this costs a pawn if you ignore it: your pawn on b2 is the only defender of your knight on c3 — and it can be taken." | threat (faded), +13653ms | hidden (removing the guard) |
| 35 | "Rook takes g4? Then queen takes b2 and, two moves later, queen takes c3…" | positionFacts (`rejectedTempting` held "aside") | hidden |
| 39 | "Knight to f8? Then king takes f8 — they win a knight. … move the rook away from their king on f7…" | positionFacts | simple |
| 45 | "Careful — their bishop on d7 hits your rook on g4, and a guard does not help…" | threat, +3365ms | simple |
| 59 | "Watch e3 — a knight lands there in 2 and forks your king on g2 and rook on f1…" | positionFacts (spokeKind `latent-danger`); the instant `tactic` row was faded and spoke nothing | hidden (latent fork) |
| 85 | "Careful — your pawn on g7 guards your king, and they hit it twice…" / answer: "Take it — one capture removes the knight doing it." | threat +2073ms; threatAnswer (faded) | simple |
| 87 | "Their king to h7 is a blunder — they could have won your pawn on g7, and it is still hanging — see to it." | coachMistake | simple |

**Turns where a threat lane was offered and held, so no threat line was heard:** none. The closest cases:
- **Ply 13:** `prophylaxis` was held and the pin sentences were dropped by the gate, though the discovery line was heard.
- **Ply 61:** the instant `tactic` lane was offered and spoke nothing, with no hold reason. That lane is an opportunity for the student, not a threat.

## C. Record terms

**(1) David's green.** All 19 tags in his fade list are set to "short", and the fade does reach Learn.
- Faded lanes appear on 16 plies: 19, 25, 27, 29, 31, 33, 35, 37, 41, 45, 53, 59, 77, 85, 91 and 97. None appear on plies 1–17.
- Lanes faded: threat (25, 29, 35), threatAnswer (19, 31, 85), countMethod (19, 27), foundMove (33, 37, 45, 53), moveIntent (41, 91), tactic (53, 59, 85), playedConcept (53, 97), fundamental (77).

A faded lane ended one of two ways:
- **Still spoken.** Examples: "Take it — one capture removes the bishop doing it." (31), "Take it — one capture removes the knight doing it." (85), "Step out of it — take the queen off the line." (19), "Count before you take on d6: 2 attackers against 2 defenders." (19), "A-pawn takes b3 was the only move that limited the damage." (37).
- **Silent.** countMethod at 27, foundMove at 45 and 53, playedConcept at 53, the instant tactic at 59. fundamental at 77 was also held "aside"; playedConcept at 97 was also held "mate-turn".

Which tag drove each fade: **NO DATA**. The DECISION rows carry lane names, not tags.

**(2) Was anything raised by a red tag?** At the door, no:
- `lastTimeHere` and `sameAsLastTime` were offered 0 times.
- No DECISION row's offer or lead can be traced to his record.

But the record did reach the spoken text twice, so the expected "nothing raised by red" is **refuted for the spoken text**:
- **Ply 15**, inside the `mistake` fact: "You've walked into this before — taking a poisoned pawn, the fourth game now." This is `misconceptionCallbacks.ts:228`.
- **Ply 13**, phase path: "This is a pattern that keeps catching you — watch for it." It comes from `liveTacticsContext.ts:603` and appends `holeTag` (lines 574–576) only when the motif matches a student hole (`isHole`). So his record tagged this warning. Line 556 (`deepThreats.find(isHole) ?? deepThreats[0]`) may also have chosen it over another threat; whether a second deep threat existed is not in the data.

**(3) The contradiction.** The fade list sets missed-opponents-threat, hung-material, missed-tactic and calculation-depth to "short". From ply 19 on the door faded threat, threatAnswer, tactic and fundamental lanes; which tag drove each fade is not in the data. The same game shows those skills are still being missed:
- At ply 13 the phase path calls the discovery "a pattern that keeps catching you".
- At ply 77, Kg5 was recorded as **calculation-depth, 115cp lost (best e5)**. The `fundamental` lane was faded and held "aside", and no verdict was heard.
- The end-of-game library re-analysis (EVENT rows under ply 99, truncated, so these are floors) files at least 15 hung-material, 7 missed-tactic and 3 missed-opponents-threat rows.
- The opening steer in `g1.out` names "missed tactical sequences, handing over a tempo, or missed hanging pieces".

## D. Words

- **Average:** 75 heard words per turn over 50 turns, as the header says; **71** with the double-logged lines removed. For plies 1–13 it is 96 raw, 79 deduplicated.
- **Longest turns, by raw count (header):** 13 (298), 15 (202), 47 (178), 41 (152).
- **Deduplicated:**
  1. **Ply 15, Bxf7+, 202 → 202.** The tail of ply 13's plan read (63 words, ply-13 FEN) plus the verdict package from `mistake`, `blunderCheck` and `theirIntent` (139 words, including the recurrence callback).
  2. **Ply 13, O-O, 298 → 180.** The method sentences plus the opening→middlegame phase package: 8 phase rows, 6 spoke, heard from +6.6s to +58.5s.
  3. **Ply 41, Rg5, 152 → 152.** "Threat met" plus `moveIntent` (faded), `positionFacts`, and the `planArc` passed-pawn plan, which is most of the length.
  4. **Ply 51, Nhf6+, 119 → 119.** It edges out **ply 47, Kxg2, 178 → 115**: their move's verdict, `foundMove`, then the endgame phase plan and balance sheet.
- **Silent turns:** none. The near-silent ones are plies 93, 95 and 97 (9, 9 and 6 words), which said only the instant mate line. Their late rows held foundMove, movePoint, planArc, playedConcept and positionFacts as "mate-turn", and structure as "out-of-phase".
- **Instrument note:** `trends` recorded 0 words for Nf3, O-O, Qb3 and Nd5. Their speech started +6.6s to +9.2s after the move, after the driver's window closed.

## E. Defects seen in passing

**Hints or names the student's next move before it is played:**
- Ply 7: "Bishop to c4 is a common try here…", said on the move-5 board. The next move was Bc4.
- Ply 13: "Commit the pawn last — a knight move now, the pawn later…", from a pre-move fact (FEN `…w kq - 2 8`).
- Ply 19: "Step out of it — take the queen off the line."
- Ply 27: "Your knight has a fork waiting on c7 — via b5, then c7…"
- Ply 31: "Take it — one capture removes the bishop doing it." The next move was hxg3.
- Ply 35: "The best move here is an ugly pawn move — it doubles your own pawns." The next move was axb3.
- Ply 47: "There is a check worth giving first…" The next move was Rf1+.
- Ply 85: "Take it — one capture removes the knight doing it." The next move was Kxh5.

**Costly moves with no verdict** (no chat-only lines exist):

| Ply | Move | What the record shows | What the student heard |
|---|---|---|---|
| 13 | O-O | 69cp lost, best Qb3, recorded at +6547ms | no verdict; DECISION cost ? |
| 19 | Bf4 | 112cp lost, best Qb3 | `ownMove=affirm` and "That is what pressure buys…" |
| 77 | Kg5 | door cost 63cp, record 115cp, best e5 | no verdict |

**Verdict lag:**
- Bxf7+ (198cp): the verdict came at **+17965ms**, after a neutral plan read at +4836ms.
- Rd5 (161cp): "was a mistake" came at +14007ms.
- Good-move verdicts came at +2586 to +6228ms.
- Two "instant" threats were slow: +8118ms (ply 27) and +13653ms (ply 35).

**Lines about a different board:**
- **Ply 15 at +4836ms:** "Checks, captures, threats: nothing of yours can be taken, and nothing of theirs is free… put a rook on the open c-file." This is the tail of ply 13's fact (ply-13 FEN `…R1BQ1RK1 w kq - 2 8`). speakCloud logged it at t=525908, after Bxf7+, with the student a bishop down. The student never heard "nothing of theirs is free" before the grab.
- **Ply 7:** "Bishop to c4 is a common try … costs you about half a point … Knight takes c3 doesn't pay that." The fact's FEN is the post-reply move-5 board (`…w KQkq - 0 5`), where Bc4 is the natural next move. Either a move-4 refutation was keyed to the wrong board, or the student's next move was named in advance as costly. The student played Bc4, and ply 9 affirmed it.
- **Ply 13:** "The obvious stop is the pawn to h3…" answers a Bg4 pin the student never heard (the gate dropped it).

**A gate fired but the sentence was still heard.** At ply 87 `voicePackage.computed.narrationGate` logged "g8=N? That drops the knight on g8." with `kept:""`. The same text is still a fact in that ply's spoken package (hintRegister) and was heard. Either the gate's drop was not applied or a second path carries it; the data does not say which.

**Contradictions:**
- Ply 19: "No rush yet — if you play e5…", then "Step out of it — take the queen off the line."
- Ply 13: "Nothing hinges on your next move…", and the next move, Bxf7+, cost 198cp.

**Wording:**
- Ply 5: "It's the Accepted of the Sicilian Defense." The refined name was "Sicilian Defense: Smith-Morra Gambit Accepted".
- Ply 3: "One of your pieces has a post here that their pawn can't kick it off" names no piece or square, and is ungrammatical.

**Repeated formulas.** These break the variety rule (no formula more than twice a game):

| Formula | Count | Plies |
|---|---|---|
| "X was their move" | 6 | 37, 43, 45, 49, 77, 87 |
| "— now X doesn't work: …" | 5 | 25, 41, 71, 73, 91 |
| "That wins a …" | 5 | 45, 51, 53, 85, 87 |
| "the only move / one of just two moves that…" | 5 | 33, 37, 47, 55, 91 |
| "…is a mistake — it throws away … a point of advantage" | 3 | 45, 49, 77 |
| "every push brings it closer to promotion" | 3 | 41, 63, 69 |
| "gets a pawn push ready" | 3 | 43, 57, 75 |

These appear exactly twice, which is within the rule:
- "nothing hits your … yet" (1, 9)
- "The plan changes here — now it's to win their weak pawn…" (33, 83)
- "stand a knight's jump apart" (23, 51)
- "Careful — your pawn on … guards your king" plus "Take it…" (31, 85)
- "Test the slow plan with…" (17, 89)
- "a piece no pawn can chase…" (47, 57)
- "pressure they have to answer" (65, 79)
- "Threat met" (29, 41)
- "seizing the initiative" (63, 81)
- "is weak for good" (59, 61)
- "The natural alternative … fails" (51, 81)

**Door accounting.** About 35 DECISION rows offered a lane that was then neither spoken, held nor faded. The worst case is `planArc`, an always-ride lane: unaccounted on 17 plies (45, 47, 51, 55, 57, 59, 61, 67, 73, 77, 79, 85, 87 and others). Others: `strongChoice` (7), `kingSafety`/`notYetPlayed` (11), `positional` (21), `moveIntent` (23), `movePoint` (31, 35, 39, 55, 75, 91), `structureJudgement` (91), `positionFacts` on many late rows, the instant `tactic` (61), and `countMethod` (27, faded only).

---

**Checker notes**
1. **Beat 2, WORKS → PARTIAL.** The model asks for the name, its origin and what makes it, said once. The origin is missing, and the name is repeated at plies 1, 3, 5 and 11.
2. **Beat 3.** Added that their system's name ("Fianchetto Defense", ply 11) was given but its plan was not.
3. **Beat 4.** Clarified that it is a move-order alternative scored by eval, and added the move-5 FEN. Verified the `refuted` spokeKind in the raw transcript.
4. **Beat 6.** Added ply 3's "playing for time instead of material" as early character evidence.
5. **Beat 7, WORKS → PARTIAL.** No example does the model's beat: the order is reversed on a routine recapture, Nf3 has no instinctive alternative, and the h3 line answers an unheard threat with no point.
6. **Beat 8, MISSING → PARTIAL.** A lane that can carry a plan was offered: `planArc` at ply 13 spoke "where is your pawn break?". e5 was named as a danger at ply 19. The record shows e5 as the engine's best move at ply 27. The break was still never named as an idea.
7. **Beat 9.** Fixed the wording "from ply 15 only", which contradicted the ply-3 instance the same row cites.
8. **Beat 10, WORKS → PARTIAL.** The warning is a generic look-ahead that does not say what is discovered and is not tied to the line. The line-typical pin was dropped by the gate, and "nothing of theirs is free" arrived after the grab (speakCloud t=525908).
9. **Beat 11.** Added the third unjudged move (Kg5) and that `drawback` was offered 0 times.
10. **B, ply 13 `prophylaxis`.** Removed the claim that the h3 line was its answer; the lane's text is not in the data.
11. **C(2).** Cited the producer line (`liveTacticsContext.ts:603`, `holeTag` 574–576). "Chose" softened to "tagged, possibly chose", because whether alternatives existed is not in the data.
12. **C(3).** Removed "accordingly", which contradicted C(1)'s NO DATA on which tag drove each fade. Threat-lane fades start at ply 19, not 13.
13. **D.** The ply-15 tail is 63 words, not about 59. The verdict package is 139 words. Recounted with deduplication; the average 71 and the window 96/79 check out.
14. **E, hints.** Added Bc4 (ply 7) and the Nb5–c7 route (ply 27).
15. **E, ply 87.** "A second producer" softened. The raw data shows the gated fact still in the spoken package, so the gate's drop may simply not have been applied.
16. **E, repeated formulas.** Added the formulas used more than twice: "X was their move" ×6, "— now X doesn't work" ×5, "That wins a" ×5, "only move" ×5, "closer to promotion" ×3. Also added the twice-used ones the draft had missed.
17. **E, door accounting.** Expanded: the gap is about 35 rows, not four, led by the always-ride `planArc` on 17 plies.
18. **Verified unchanged.** The double logging (speakPackage + speakCloud), the `trends` zeros, the record's best moves (Qb3, Qb3, e5) and timing (+6547ms), the "Accepted" announcement, the re-analysis floors (15 / 7 / 3) and every quoted line on its cited ply.

---

## g2: the Najdorf English Attack as Black (David's fade levels loaded)

The prep file has **no CHAT-ONLY lines**, so no beat can be EXISTS-BUT-UNVOICED. Every quote below was voiced.

### A. The 11 beats

| # | Beat | Verdict | Evidence |
|---|---|---|---|
| 1 | Name the road at the fork, with the alternatives | **PARTIAL: name only, no alternatives** | Ply 10 (a6): "It's the Najdorf Variation of the Sicilian Defense." Classical, Dragon and Scheveningen are never named. `openingIdentity` and `openingEquivalence` were never offered (0 rows). `strongChoice` was offered on ply 10 but is in neither spoke nor held, so it was dropped with no reason. |
| 2 | The choice in one line | **PARTIAL** | The Sicilian got a reason. Ply 2: "c5 fights for the center from the flank: d4, holding back their d-pawn." (lane `movePoint`). The Najdorf got its name only. `openingIdentity` was never offered on any turn. |
| 3 | Their setup and its plan | **PARTIAL** | Ply 10, late wave (lane `theirIntent`): "They play f3 first, so that g4 comes next." The English Attack is never named. Their storm shows up only as a race fact (ply 20: "theirs on f3 is one push from yours"; ply 26). Be3, Qd2, castling long and the storm are never given as one system. The same ply-10 turn names a different opening: "…this is the Sicilian Defense: Prins Variation." `theirIntent` was offered on ply 16 and dropped with no reason, held as "aside" on ply 18, and spoke on ply 28 about Bxc7, not their system. |
| 4 | Why this branch, against the other main one | **PARTIAL: no comparison** | Ply 12 (e5) gives reasons: "Your pawn reached e5 first — their e5 can never come now, so e5 is yours. e5 kicks their knight off d4, gaining time." Nothing compares it with …e6. `rejectedTempting` was not offered on ply 12. `strongChoice` was offered and dropped with no reason. |
| 5 | The cost of your structure, and the move that pays it | **PARTIAL: d5 hole never said; d6 never tied to …e5** | The d5 hole, and Be6 guarding it, are never said. Ply 14 gives Be6 a different point (lane `moveIntent`): "so that a pawn push can hit their pawn on e4". d6 is heard only as a target (ply 18 battery), a blocker (ply 18: "your pawn on d6 is what blocks it") and a guard duty (ply 26: "Your bishop on e7 is tied to guarding the pawn on d6"). It is never called the cost of …e5. The one "weak d6" sentence was gate-blocked (beat 8). `structureJudgement` was held as "aside" on ply 26. |
| 6 | The middlegame's character, announced early | **PARTIAL: arrives as the race starts, not before; 6 plies after the app's own phase change** | Ply 20 (a5, the first student turn after White castled long): "Both kings face a pawn storm: … their storm arrives first — slow it down before you push yours." In full on ply 26 (lane `splitPosition`): "The kings are on opposite wings, so split the board: … It is a race — a tempo matters more than a pawn here." Before that, `splitPosition` was held four times: ply 18 "off-topic", ply 20 "aside", ply 22 "aside", ply 24 "off-topic". The phase change came on ply 14 (move 7, rule central-pawns-resolved). Its turn carried no character line, and `character` was never offered. The model wants the character announced at Qd2, before long castling. |
| 7 | The instinctive move first, then the concrete point | **PARTIAL: point shown one move late; the instinctive alternative never named** | Ply 22: "Your knight to a6 completes your development — every minor piece is out, so the rooks come next." This is generic; ownMove=null. On ply 22, `movePoint` was offered and held "subsumed" (the prep does not show its content). The real point (c7, hitting b5) only shows on ply 24: "you hit the bishop on b5 once and it is guarded once". …Nc6 is never named. `rejectedTempting` was offered on ply 28 only, held "aside". |
| 8 | The structural key move (…d5) | **PARTIAL; the explicit sentence was gate-blocked** | Hinted twice. Ply 14: "so that a pawn push can hit their pawn on e4". Ply 18: "moving it brings it to life". The explicit sentence was stopped twice on ply 28 (`claim-validator-trip`, narrationGate) and never heard: "d5 is the direct way to get rid of your weak d6 pawn…". What was heard after d5 only describes it: "d5 and e5 stand side by side…". `openingIdea` was never offered. |
| 9 | Walk the branches when they have a real choice | **PARTIAL: one opponent choice, after the fact, not played out** | Ply 28, `theirIntent`: "Their bishop takes c7 stops your d4, which would hit their knight on c3. Anything else, like knight to c5, gives up about half a point." This is a consequence each way, after their choice: one of David's open options, in one sentence and with no line played out. `register` (candidate compare) was held as "aside" on ply 28. |
| 10 | Danger signs specific to this line | **PARTIAL: real danger signs, none tied to the line** | Ply 18: "Not urgent yet, but see it coming — their rook on d1 and their queen on d2 form a battery on the file, bearing down on your pawn on d6." This is the …e5 structure's d6 pawn in fact, but the line never says so. Its answer was empty ("It can wait — something stronger comes first."). The pins on ply 12 (Bg5) and ply 24 (Bb6) also landed; see B. `trapAhead` and `dangerLevels` were never offered. |
| 11 | Honest self-judgement | **NOT EXERCISED** | `coachMistake`, `drawback` and `mistake` were never offered. Every own move came back affirm or null. Move cost is "?" on every turn except ply 28, where it is 16. |

Offered lanes that were not spoken, not held and not faded (the row gives no reason):
- `strongChoice` on plies 4, 8, 10, 12, 14, 16, 18, 20 and 22. It spoke only on ply 6.
- `prophylaxis` on ply 14.
- `kingSafety` and `theirIntent` on ply 16.
- `structureJudgement` on plies 22 and 24.
- `moveIntent` on ply 24.
- `positional` on ply 26.
- `splitPosition` on ply 28.
- `opening` in the late wave of plies 2 and 10. It had already spoken in that turn's instant wave.

### B. Threats

| Ply | Lane | Status | Quote | Simple or hidden |
|---|---|---|---|---|
| 12 | threat (instant) | spoken | "No rush yet — if you play knight to c6 and they answer bishop to g5, their bishop on g5 pins your knight on f6 against your queen on d8." | Hidden in form (a 2-move conditional). On the ply-12 FEN the c1–g5 and g5–d8 diagonals are already open, so the pin does not seem to need Nc6. |
| 12 | prophylaxis (late) | spoken | "h6 first — it stops the pin with bishop to g5 before it lands. Bishop to g5 would pin your knight on f6, and after h6 the pawn covers g5." | Simple. This is the same pin said a second and third time. |
| 18 | threat (instant), **faded** | spoken | "Not urgent yet, but see it coming — … battery on the file, bearing down on your pawn on d6." | Simple: the queen sees d6 down the file, with the rook behind it. |
| 18 | threatAnswer, **faded**, lead | spoken | "It can wait — something stronger comes first." | It names no answer. |
| 24 | threat (instant), **faded** | spoken | "Watch out — their bishop on b6 pins your knight on c7 against your queen on d8." | Simple. |
| 24 | threatAnswer, **faded**, lead | spoken | "Step out of it — take the queen off the line." | — |
| 28 | threat (instant), not faded | spoken | "Careful — this costs a pawn if you ignore it: … E-pawn takes d5 wins your pawn outright — you cannot take back enough." | One move, proven by a capture count. No `threatAnswer` was offered, so the threat went out without its answer. |

- `dangerLevels`, `trapAhead`, `checkMethod`, `falseAlarm` and `countMethod` were never offered.
- No threat lane was ever held.
- `prophylaxis` was offered on ply 14 and dropped with no reason.

### C. The record

1. **His green (fade levels) reaches Learn, but only through the threat lanes.**
   - Faded lanes: ply 18 (`threat`, then `threatAnswer`) and ply 24 (`threat`, then `threatAnswer`).
   - On ply 18 the faded answer has no content: "It can wait — something stronger comes first."
   - On ply 24 the faded answer still says what to do: "take the queen off the line".
   - Ply 28's threat was not faded, under the same table. The prep has no data on why.
   - No other lane faded, even though 19 of 20 skills are at "short" (passive-king-endgame is "lighter"). The ply-20 plan line (`planArc`) ran in full: plan, how and why.
   - This game also writes green evidence: "held [no-plan]" on plies 4, 16 and 24, "held [no-plan] (prompted)" on plies 14 and 20, and "held [mistimed-pawn-break]" on plies 12 and 28.
2. **Nothing from his red (record of misses) was offered or spoken.**
   - `lastTimeHere`, `sameAsLastTime` and `fundamental` were never offered (0 rows). No heard line mentions last time or a past game.
   - The leads were opening, movePoint, moveIntent, strongChoice, threat, threatAnswer, positionFacts, phase, splitPosition and theirIntent. All are board or database lanes.
   - The prep has no data on whether his record holds misses at these positions.
3. **Not shown by this prep.**
   - The table puts missed-opponents-threat, hung-material, missed-tactic and calculation-depth all at "short", and the threat lessons on plies 18 and 24 spoke in the short register.
   - Whether his record shows he misses these skills cannot be checked: the prep has no data on his red.
   - The one inconsistency the prep does show is in item 1: the same table faded plies 18 and 24 but not ply 28.

### D. Words

- **Average:** 64 heard words over 14 turns (header).
- **Longest four:**
  - **Ply 20, a5 (114 words):** `planArc` gave plan, how and why on the e7 bishop being the worst piece (4 sentences). On top of that came the pawn-storm race from `positionFacts`, and "frees your knight on b8" from `moveIntent`.
  - **Ply 12, e5 (100):** five lanes spoke: `threat`, `prophylaxis`, `breakRace`, `structureJudgement` and `movePoint`. The Bg5 pin was described three times.
  - **Ply 28, d5 (94):** a threat with its capture count, `theirIntent` on Bxc7 plus "Anything else, like knight to c5…", and the "d5 and e5 stand side by side" structure line.
  - **Ply 14, Be6 (86):** "Nothing hinges on your next move…" was said twice; the second is likely from the `phase` row. Then "Commit the pawn last…" and the `moveIntent` line.
- **Silent turns:** none. The shortest is ply 2 (19 words).

### E. Defects seen in passing

- **Names the student's next move:** ply 12, "h6 first — it stops the pin…". The student played Be6. Ply 14 then contradicts it: "Commit the pawn last — a bishop move now, the pawn later if you still want it."
- **Borderline:** ply 24, "take the queen off the line" names the piece and the action. The student then played Qb8.
- **Two openings in one turn:** ply 10 names the Najdorf, then "…this is the Sicilian Defense: Prins Variation."
- **Threat contradicts the move's own cost:** ply 28 says "costs a pawn … wins your pawn outright", but the DECISION row says cost 16. On the ply-28 FEN it is also White to move, so "if you ignore it" leaves the student no move to answer with. The late wave then reports that White played Bxc7 instead.
- **The gate fired:** twice on ply 28, on "d5 is the direct way to get rid of your weak d6 pawn". It names a d6 pawn that is no longer on the board.
  - If it was a retrospective claim, it is the beat-8 sentence and the gate misfired.
  - If it was read off a stale board, the wrong sentence could still be produced.
  - The prep cannot tell which. Either way, a gate fired.
- **Repeats:**
  - "Nothing hinges on your next move…" twice word for word on ply 14, then again in other words on ply 16: "Your next move is not a big decision…"
  - The battery formula on ply 18 (d6) and ply 28 (d5).
  - "frees your knight on b8 to come out" on ply 4 and ply 20.
  - "You play X first, so …" on ply 14 (Be6) and ply 16 (Be7).
  - The e7 bishop on plies 18, 20 and 26.
  - The Bg5 pin three times within ply 12.
- **Irrelevant proverb:** ply 8, "A knight on the rim is dim." The knight being discussed is on f6.
- **Doubtful race fact:** ply 20, "theirs on f3 is one push from yours". f3–f4 touches e5 and g5, not f7, g7 or h7. Check this against the storm computer.
- **Board the threat lines describe:** the instant threats on plies 18 and 24 describe the board after the coach's reply. Ply 18 says "rook on d1", but its FEN has the rook on a1 and the king on e1. Ply 24 says "bishop on b6", but its FEN has the bishop on e3. Ply 28's instant threat matches its own pre-reply board. The prep has no data on whether the replies landed before the voice (+1856ms and +4146ms).
- **No CHAT-ONLY verdicts:** none in the prep.

### Checker notes

- **Header:** removed "b494915" and "record loaded". The prep has no commit hash and shows only the fade levels (green).
- **A3:** added that their storm is named on ply 20 and ply 26, as a race fact only, and that `theirIntent` spoke on ply 28.
- **A5:** "wrong cost" became "d5 hole never said; d6 never tied to …e5". The backward d6 pawn is a real cost of …e5, not a wrong one, and d6 is also heard as a blocker.
- **A6:** WORKS became PARTIAL. The model wants the character announced before it arrives (at Qd2). The app put the middlegame at ply 14 and the character came at ply 20, once both had castled.
- **A7:** MISSING became PARTIAL. `movePoint` was offered on ply 22 (held "subsumed") and the point was heard on ply 24, so a carrying lane existed.
- **A9:** MISSING became PARTIAL. The ply-28 `theirIntent` line walks both ways of the opponent's choice after it was made ("…Bxc7 stops your d4… Anything else, like knight to c5, gives up about half a point").
- **A10:** WORKS became PARTIAL. The danger signs are real, but none is tied to the line (the model's own to-build for beat 10), and the ply-18 answer was empty.
- **Unexplained-drop list:** added `structureJudgement` on ply 24 and `opening` in the late waves of plies 2 and 10.
- **B:** the ply-12 pin is said three times, not twice. Removed "no turn offered a threat lane and then said no threat", because `prophylaxis` was offered on ply 14 and dropped. Added `falseAlarm` and `countMethod` to the never-offered list.
- **C1:** "the faded register drops the answer's content" was true only on ply 18; the ply-24 faded answer has content. Added the "lighter" exception to the 19-of-20 count.
- **C2:** "Confirmed" became "nothing offered or spoken", and the list of leads is corrected (it was missing movePoint, strongChoice and phase).
- **C3:** "The contradiction is visible" is not supported, because the prep has no red data. Rewritten.
- **D:** ply 20's plan is 4 sentences (plan, how, why), not 3. The ply-12 pin is said three times. "From the phase row" is an inference, so it now reads "likely".
- **E:**
  - The board-mismatch note said plies 10, 18 and 24. Ply 10 has no threat line, so it now says plies 18 and 24, and notes that ply 28's threat matches its own board.
  - The gate entry contradicted A8 (A8 called the blocked sentence the desired one). It now states both possibilities.
  - Added the White-to-move point to the ply-28 cost entry.
  - Added the "You play X first, so" repeat and the doubtful f3 race fact.
