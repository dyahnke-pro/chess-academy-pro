**COMPARE: the 52 walk errors against the reference coach's teaching acts**

Inputs: learn5.log (L1, L2), rev-g1.tape (R1, the review of L1's game), rev-g2.tape (R2, the review of L2's game), all 642 acts in teach-brief.md, and 2026-10-07-duplicate-census.md (the census). I replayed every board claim below with chess.js in the scratchpad (`.../scratchpad/cmp52/*.mjs`). File:line citations point at the current `/home/user/wt-work/src`.

**Headline.** 20 gaps cover all 52 errors. In about half of them the chess fact is already computed, but the surface that speaks never reads it. 13 of the reference coach's acts have no computer at all. Both games were decided by the same opening slip, 6…Nc6, which left the g4 bishop to the h3 pawn. Learn never warned about it in either game (see O1–O3 below the gap list).

---

### The gap list

**G1. Name what their move just attacked first; the rescue is the reason.** Errors 1, 2. F01: IDENTIFY → CONSEQUENCES
- **Reference coach:** on every opponent move he first says what it changed. With a piece attacked, the priority is to get it out of danger. A counter-capture is only worth it if it wins more than the piece that's lost (count attackers vs defenders, then name what complicates the count).
- **Our tape (L2):** after 9.g5, no line mentions the attack on f6. The next line is "The middlegame starts here, so take stock: you're in trouble…". After 9…Nxd4 we say: "That pawn was defended: your knight takes on d4 and is taken on the spot — it cost you far more than a pawn. knight takes d4 was imprecise. knight to g4 was the move — it would swing pieces toward their king."
- **Board:**
  - The g5 pawn attacks the f6 knight.
  - d4 was attacked twice (Rd8, Nc6) and defended once (Nf3; Bd3 blocks Qd1), so the count favoured Black.
  - The piece actually lost was the f6 knight (10.gxf6), not the d4 knight.
- **Computer — EXISTS, but the verdict never reads it:**
  - The "steps out of the pawn's reach" reason exists: moveFundamentals.ts:881-905.
  - threatAnswer classifies the answer to a threat, including stepping out (threatAnswer.ts:21). It is Learn-only (learnBoardTeaching.ts:31).
  - The counting computer exists: countMethod.ts:17.
  - Learn's verdict reason comes from inaccuracyCall.whyBetter (inaccuracyCall.ts:306-455). It uses the capture, or else the top clause of the engine's planned line, "swing pieces toward…" (lookaheadPlan.ts:947-957).
  - moveIntent deliberately leaves rescues to the threat lanes (moveIntent.ts:167, :296).
  - "Taken on the spot" comes from principleAttribution.ts:441-458 reading the engine's line, and principleVoice.ts:534 says it as fact. The game's actual reply was gxf6.
- **MISSING:** the one reason chain should rank urgency (rescue, answer the threat) first, and say engine-line outcomes conditionally ("if they take…").

**G2. Two pieces attacked at once: the checklist, and the desperado.** Errors 12, 13, 35 (and 48). F01: KNOWLEDGE (golden nugget) / PREVENT
- **Reference coach:** with two pieces attacked, first ask whether one move saves both. If not, move one with a threat, or let the doomed one capture the most it can on its way out.
- **Our tape:**
  - R1 at 7…O-O-O: "The move was bishop takes f3 — it lines up an x-ray at their rook on h1. That left your knight hanging." Later the same ply also gets "it would trade off the knight."
  - R2 at 23.Ra1: "Your queen on a2 is attacked and has no safe square — it is trapped. Their rook on a1 now eyes your queen on a2. Watch out — that rook attacks your queen on a2, and nothing defends it. Watch what they're building — left alone, their idea starts with rook takes a2."
- **Board:**
  - After 7.d5, h3 attacks the g4 bishop and d5 attacks the c6 knight. White then took the bishop (8.hxg4).
  - After 23.Ra1, Qxa1 is legal: the queen takes a rook before Nxa1. The game went 23…Re5 and the queen was lost for nothing (25.Rxa2).
- **Computer — PARTIAL / MISSING:**
  - positionAsk says "Two things of yours are hit at once… decide what to give up" (moveInsight.ts:200-218). It only runs on ask and drill paths (whyBestMove.ts:93, thinkingAssessStep.ts:81, CoachTeachPage.tsx:2870/11939) and has no checklist order.
  - Review's cause keeps one piece only (turningPoints.ts:141-144) and named the knight. On the same ply, blunderCheck read the actual reply and named the bishop (safetyHabits.ts:39).
  - The Bxf3 reason came from deliberation.extraJobs (deliberation.ts:386).
  - Desperado exists only as a guard inside exchangeLedger.ts:419-424, so as a teaching fact it is MISSING.

**G3. Why the better move is better: one ranked list of reasons, the move's own job first.** Errors 3, 20, 47. F01: PLAN / PREVENT
- **Reference coach:** what the move prepares and what it stops; several jobs, ranked, said once; never a bare move.
- **Our tape:**
  - L2 on 17…Bc3: "f5 was the move — the idea is to create a passed pawn on e6."
  - R2 on the same move: "the stronger move was h5." with no reason.
  - R1, Bf5: "it steps out of the pawn's reach…", then "it would walk your bishop on g4 round to g6, by way of f5".
  - R1, Bxf3: "lines up an x-ray…", then "it would trade off the knight".
  - R1, d4: "it attacks the knight on c3" / "the idea is to set up a pin" / "kicks their knight off c3, gaining time".
- **Board:** …f5 attacks the e4 knight with a pawn.
- **Computer — EXISTS six times over, never as one list (census A row 6):**
  - The pawn kick exists: moveFundamentals.ts:369-395. whyBetter doesn't read it; it takes the far-end passed-pawn clause instead (lookaheadPlan.ts:972-979).
  - The turning-point reveal uses betterMoveReason, then a fallback (turningPoints.ts:257-262).
  - The Review verdict uses betterMoveReason with different inputs (reviewFullData.ts:506).
  - The bare fallback at reviewFullData.ts:536-539 breaks the file's own "named with its reason, or not named" rule (:518).
  - Learn picked f5 and Review picked h5 at the same position: two engine stacks disagree (census C §1, rule D7).
- **MISSING:** one ranked reason list (rule F0c).

**G4. Your own move's drawback, said when they can use it, before any description.** Error 14. F01: CONSEQUENCES
- **Reference coach:** say what your move gave up when the opponent can use it; before you move a piece, check who guards the square it lands on.
- **Our tape (R2, 17…Bc3):** "…the stronger move was h5. Your queen on a5 and your bishop on c3 form a battery on the diagonal, bearing down on their knight on d2. Your bishop on c3 now eyes…". On the same move, Learn said: "b-pawn takes c3 wins it outright."
- **Board:** c3 is attacked by the b2 pawn and the e4 knight and defended only by Qa5. After bxc3 Qxc3, Nxc3 wins the queen.
- **Computer — EXISTS for both surfaces:** the drop is rendered by renderFundamentalVerdict for Learn (learnFundamentalNarration.ts:119) and Review (reviewFullData.ts:581), worded at principleVoice.ts:363. It reached Learn's tape but not R2's turn. In Review the battery (tacticsDetector.ts:777) and the square list (reviewFullData.ts:1290) spoke instead.

**G5. Their move's purpose, read from the piece that moved.** Errors 4, 5. F01: IDENTIFY / PREVENT
- **Our tape (L2):** "Their rook to b1 prepares queen to b5, to take the half-open b-file." and "Their king to f1 prepares queen to e1, to take the half-open e-file."
- **Board:** after 21.Rb1 the b-file holds only Black's b7 pawn, so the rook itself already stands on the half-open file, aimed at b7 beside the c8 king.
- **Computer — EXISTS, with defects:**
  - whatItDoes gives the "take the file" verb to any rook or queen follow-up (moveIntent.ts:454-458).
  - The prepared move can be any newly possible move the engine played, including a queen stepping into the square the king just left. The vacated-square guard only applies when the engine never played the move (moveIntent.ts:217-219).
- **MISSING:** read the moved piece's own job first (here, the rook took the file).

**G6. Timing: name the one thing that changed.** Error 6. F01: CONSEQUENCES
- **Our tape (R1):** "The timing of d-rook takes e8 matters — a move earlier, their bishop would have taken on e8 and won your rook."
- **Root cause:** readTiming replays the move one turn earlier (moveTiming.ts:51-52). chess.js turns "Rdxe8" on an empty e8 into the quiet Rde8 (I checked this), and Bb5xe8 then wins the rook. The bishop was on b5, and nothing about timing changed: it simply walked into a capture.
- **Computer:** EXISTS (moveTiming.ts:47-87). Defect: the replayed move must stay the same kind of move (a capture stays a capture).

**G7. Their mistake is your chance: say it as a chance, and ask before telling.** Errors 7, 8, 9, 29, 30. F01: IDENTIFY → CONSEQUENCES
- **Reference coach:** name their mistake as it happens, with the punishment; if the student misses it, call it a Miss ("they let you off"). Review asks first.
- **Our tape (R1):**
  - On 10.Bb5: "Your opponent: that was a blunder, costing about a piece — your answer was d4, which kicks their knight off c3, gaining time." The student had played 10…Nxg4.
  - The same "your answer was d4…" again on 11.O-O.
  - Then: "This is where the game turned. Find the move." And d4 is named five more times afterwards.
- **Board:** after 10…d4 the c3 knight is attacked by the pawn and Qa5.
- **Computer — EXISTS but wired wrong:** slipAnswerText has 'found' and 'missed' wordings ("d4 was the answer to their slip", playCommentary.ts:1003-1034). Review always passes 'review' ("your answer was", reviewFullData.ts:1347-1353, called at :533). It speaks on the opponent's ply, before the student's question.
- **MISSING:** one owner for what to ask and what to hold back (census B §3 counts 11 systems).

**G8. One story per game: a thesis traced to the result, the chances related, the last chance named.** Errors 10, 11, 19, 21, 22, 32. F01: STRATEGIZE
- **Our tape:**
  - R2: "…clean chess on both sides, decided by one moment: knight to c6 at move 6."
  - R2: "The game turned at move 17, bishop to c3… It fits the thread of the game — the one slip that decided it."
  - R2, three times: "The through-line of this game was the open file… controlling the only open file is what decided it." The student lost the queen.
  - R1: three "This is where the game turned" questions, then "The game turned at move 22, queen to e4".
  - R1: the Bf5 reveal, followed straight away by "This is the moment — bishop takes f3 keeps you right in it."
- **Computers — four producers of "what the game was about", none reads the result:**
  - The one-slip theme fires when exactly one mistake or blunder is classified (gameThemeClassifier.ts:64-65, :107-116). Losses in an already lost position grade lower under rule G4, so they don't count.
  - computeThroughLine counts how often a rook or queen sits on an open file across the middlegame (reviewFullData.ts:1201-1243), yet says "is what decided it" (:1247).
  - renderThesis: teachingSelector.ts:347-361.
  - selectTurningPoints: turningPoints.ts:211-275.
  - The "This is the moment" line is generated per move: coachFeatureService.ts:1245-1248.
- **MISSING:** a thesis built from the eval and material trajectory; a "last chance" read (teach.md:724).

**G9. A plan changes because something changed, and the storm goes where their king lives.** Errors 23, 24, 34. F01: STRATEGIZE / PLAN
- **Our tape:**
  - R1: three "The plan changes here — now it's to…" lines with no cause (the g2 pawn; the e4 passer plus "convert your extra material"; the d-file).
  - R2: "…throwing your pawns at their king on the kingside…; your plan is to advance your queenside pawn majority and make it count." The student's king was on c8.
  - R2: the race is said twice in a row.
- **Computer — PARTIAL:**
  - Any new goal is stamped "The plan changes here" (coachFeatureService.ts:2125-2140).
  - deriveNextPlans emits four plans (nextPlans.ts:228/262/272/317), alongside readConversion (conversionMethod.ts:44).
  - reviewStrategicOrientation knows the "don't push in front of your own king" rule but applies it only to the move just played (reviewStrategicOrientation.ts:604-609). It still appends the plan for your own king's wing (:616-617); only that plan's arrows are suppressed (:618).
- **MISSING:** the cause of the plan change.

**G10. Verdict, then compensation, then the plan around your one trump; and say what moved the verdict.** Errors 16, 25, 42. F01: STRATEGIZE / IDENTIFY
- **Our tape:**
  - L1: "you're in trouble — they're up a piece and they have the bishop pair", then "only one move keeps you level", then "bishop to c5 keeps you clearly on top". No line in L1 names 10.Bb5, which R1 grades as "a blunder, costing about a piece".
  - R2: "The plan from here is to attack their king stuck on e1…", then "…what you have in return: your king is tucked away and theirs is still in the centre, and it isn't enough."
- **Computer — PARTIAL:**
  - The phase verdict line has the verdict and the compensation but no plan (reviewPositionalAssessment.ts:276-311).
  - The king-attack plan is a separate line (nextPlans.ts:215).
  - The "down material, make it hard" method exists in Learn only (positionCharacter.ts:102).
  - The critical-moment line (criticalMoment.ts:287) and the "keeps you clearly on top" clause (inaccuracyCall.ts:788-792) each read their own eval.
- **MISSING:** why the verdict changed, and one chain from verdict to trump to plan (rules F0b/F0c).

**G11. One line read from both sides is one fact: who wins the standoff.** Error 26. F01: RECOGNIZE (geometry)
- **Our tape (L1):** "their pawn on d5 is a discovered attack in waiting — moving it unveils their queen on d1 against your rook on d8. … You have a pin: your rook on d8 pins their pawn on d5 against their queen on d1 — you saw this idea on move 4."
- **Board:** on the d-file there are only Rd8, the d5 pawn and Qd1. If the pawn moves, Black is to move and takes the queen first.
- **Computer — PARTIAL:**
  - Both readings come from tacticsDetector (the discovery at :619; the pin from findPins).
  - The same-claim merge (factSelector.ts:79) is used only by coachDecider (coachDecider.ts:34). Learn's door (learnTurnDoor.ts:319-449) never merges.
  - mutualPins handles two separate pins (speedRunReads.ts:194-205), not one line read both ways.
- **MISSING:** the standoff verdict.

**G12. A pin: what it stops here and how they will break it, with the term taught once.** Error 41. F01: RECOGNIZE / KNOWLEDGE
- **Our tape, identical in L1 and L2:** "You have a pin: your queen on a5 pins their knight on c3 against their king on e1. Remember — a pin freezes the piece in front… so it can be piled on."
- **Computer — PARTIAL:**
  - The definition is at conceptEngine.ts:126.
  - Whether a pin is real and whether it bites: pinGeometry.ts:135/:178. Piling on: pinPressure.ts:85.
  - Learn's term memory is wiped every game (learnMemory.ts:270-277, conceptTaught.clear()), which breaks rule V18.
- **MISSING:** what the pinned piece can't do here, and how they will unpin (teach.md:585).

**G13. Ask first with the reason, or ask and answer in one breath.** Errors 27, 28, 46. F01: IDENTIFY (method)
- **Our tape:**
  - L2: "Drop everything — your queen on d5 is attacked…", then "Which of your pieces could they win right now?", then "What do you do about it?", then "Your queen on d5 is attacked and nothing guards it."
  - R1/R2: "This is where the game turned. Find the move." The cause is known: the bishop was hanging.
- **Computer — PARTIAL:**
  - The carry-over question fires on any red tile on the heat map (thinkingLessonPlan.ts:144-150; useThinkingLesson.ts:129-145). Rule F05 asks for a long-standing weakness.
  - It gives no reason before asking (thinkingSafetyStep.ts:72), and it runs independently of the threat lane, which had already given the answer.
  - threatAnswer is designed as question plus answer in one text (threatAnswer.ts:26, :37); the tape has the question alone.
  - turningQuestion has no wording for the 'hung' cause it computes (turningPoints.ts:141-144 vs :179-190).
- **MISSING:** one decider for what to ask and what to hold back.

**G14. At a deciding moment, name the move with its reason, never a riddle.** Errors 37, 43, 44, 45. F01: CONSEQUENCES / PLAN
- **Our tape:**
  - "Narrow here — two moves keep the win, and nothing else does."
  - "Critical moment — only one move keeps you level. Slow down here."
  - "…so hit the gas: forcing moves now…"
  - "Your pawn has a move that works whatever they answer…", plus the bishop version later the same game.
- **Computer — EXISTS but held back:**
  - The critical-moment line is written to never name the move (criticalMoment.ts:279-305), against rule S3.
  - thinkAloud speaks the hint form unless the move was earned (thinkAloud.ts:259-264), even though the line that names the move sits right beside it (speedRunReads.ts:395).
  - positionOpened only fires when the best move is forcing, yet it never names it (speedRunReads.ts:224-236).
  - The weighing of candidates exists (deliberation.ts:144) but isn't joined to the critical-moment line.

**G15. Before the queen grabs, check its way back; see the net before it closes.** Error 48. F01: PREVENT
- **Our tape (L2):**
  - Nothing at 21…Qxa2.
  - After 22.Nb3: "Their knight to b3 does two jobs: … it prepares rook to a1, to hit your queen on a2."
  - After 23.Ra1, the "trapped" line followed by "You have a pin… — you saw this idea on move 4."
- **Board:** after 22.Nb3 the queen had exactly one safe square, a4. After 23.Ra1 it had none.
- **Computer — PARTIAL:**
  - The trapped-piece detector skips any piece not yet attacked (tacticsDetector.ts:468), so the net is invisible until it closes.
  - The "grabs material but has no way out" read exists (moveInsight.ts:383-387) but only runs in chat (groundedAnswer.ts:7270) and Learn drills (CoachTeachPage.tsx:2869).
- **MISSING:** the escape-square check before a queen grabs.

**G16. A line said to where it lands, with their replies named as theirs and compared with the game.** Errors 33, 39, 49. F01: CONSEQUENCES
- **Our tape (R1):**
  - "their idea runs knight to a4, queen takes b5 and queen takes b5…"
  - Three times: "Notice the knight on c3 is NOT free — … giving up 9 points for 3."
  - "That line still comes out behind, by about a pawn."
- **Computer — EXISTS in Learn:**
  - thinkAloud.sayLine says whose move each reply is (thinkAloud.ts:113-130). Review never imports it.
  - Review joins bare moves with no owner (coachFeatureService.ts:3693-3711).
  - The "NOT free" note carries numbers and is regenerated on every move of the line (reviewTeachingPoints.ts:515-518).
  - The closing line states the end evaluation without comparing it to what was played (CoachGameReview.tsx:1673-1681).

**G17. Purpose, not a list of squares; a check's job is the reply it forces.** Errors 15, 40. F01: PLAN / PREVENT
- **Our tape:** "Your queen on a5 now eyes … fights for d5 and e5." (on nearly every ply) and "Your queen to f4, check takes aim at the center…"
- **Computer — EXISTS in Learn only:**
  - moveIntent is imported only by CoachTeachPage.tsx:36.
  - Review's per-move line is describeMoveInfluence (reviewFullData.ts:1286-1330).
  - The "takes aim at the center" reason fires on a queen check (moveFundamentals.ts:619-640). The check reason is only a last fallback (deliberation.ts:397-405).
  - isForcedReply (moveFundamentals.ts:1107) is only used to stay silent, never to teach.
- **MISSING:** "their only reply" as a teaching fact (teach.md:678).

**G18. One habit: the one that would have found it.** Error 38. F01: PREVENT (habit)
- **Our tape (R1, 7…O-O-O):** "Before you let go of a piece, check it is still defended." + "Blunder check before you let go of a piece…" + "Habit for positions like this: every check, every capture…"
- **Computer — three producers on one ply:**
  - turningPoints.ts:173.
  - safetyHabits.ts:39, reached via learnBoardTeaching.ts:206 and coachFeatureService.ts:82.
  - methodBeat.ts:154-160 (through coachDecider.ts:402). It chose the forcing-move habit because the best move was a capture, which is the wrong habit for a hanging-piece cause.

**G19. Say the grade as its consequence, in words, the way a coach would.** Errors 17, 18, 50, 51, 52. F01: IDENTIFY (plus rules V0/V8/V9)
- **Our tape:**
  - L2: "…b-pawn takes c3 wins it outright. bishop to c3 was imprecise."
  - R2: "You: that was an inaccuracy, costing about two pawns". The thesis prices the same move as "about a piece".
  - "You: that was a blunder…" / "Your opponent: that was a mistake…"
  - R1: "Your opponent captures the bishop, wins material."
  - R2: "— the same idea as move 4. … — the same idea as move 17."
- **Computer — EXISTS, with defects:**
  - The grade word comes from win chance (inaccuracyCall.ts:816) and sits beside another lane's material sentence (principleVoice.ts:363/:534).
  - The cost clause: reviewFullData.ts:476. The "You:" / "Your opponent:" prefix: reviewFullData.ts:286 and :551.
  - pvPlayback.ts:815-839 builds "Your opponent captures…, wins material."
  - motifLedger.ts:40-44 adds "the same idea as move N" to every new instance.

**G20. Say it once; when it comes back, shorter.** Errors 30, 31, 32, 34, 35, 36, 37. F01: delivery (serves RECOGNIZE)
- **Our tape:**
  - L2: "Don't cash in on d4 yet…", then two lines later "You could take on d4 right now, but the threat is stronger…".
  - The "open file" closing line three times in R2.
  - Three moves re-spoken after a turning question.
  - The trapped queen said four ways in one line.
- **Computer — PARTIAL:**
  - threatStronger has no claim key, so its three rotated wordings each get past the "already said" check (speedRunReads.ts:144-156). The every-branch read does have a claim key (:395) and still spoke twice.
  - Review adds the "watch what they're building" line after the deciding door (coachFeatureService.ts:4340), so the same-claim merge never sees it.
  - The census counts about 15 separate "already said" memories (B §2).
- **MISSING:** one memory per game, and repeats that get shorter across games (teach.md:873).

---

### Error → gap index (all 52)
- G1: 1, 2
- G2: 12, 13, 35
- G3: 3, 20, 47
- G4: 14
- G5: 4, 5
- G6: 6
- G7: 7, 8, 9, 29, 30
- G8: 10, 11, 19, 21, 22, 32
- G9: 23, 24, 34
- G10: 16, 25, 42
- G11: 26
- G12: 41
- G13: 27, 28, 46
- G14: 37, 43, 44, 45
- G15: 48
- G16: 33, 39, 49
- G17: 15, 40
- G18: 38
- G19: 17, 18, 50, 51, 52
- G20: 30, 31, 32, 34, 35, 36, 37

### On the same tapes but not among the 52 (opening, highest value under rule F02)
- **O1.** In both Learn games, 6.h3 (attacking the g4 bishop) was never mentioned before the student's reply. The bishop fell to hxg4 both times. The "attacked by a cheaper piece" warning exists (CoachTeachPage.tsx:8275-8303), but the tape has nothing between the pin line and "You left the book…". The reference coach would put the question to the bishop: "h3 asks the bishop: Bh5 keeps the pin, bishop takes f3 trades it — anything else and the pawn takes it."
- **O2.** "You left the book with the knight to c6; the usual move there was the bishop to h5." names the book move without its job (openingAnnouncement.ts:93-106). Reference act: say what the book move did that yours doesn't. That is MISSING (teach.md:412); Bh5's job is the keep-working fact at moveFundamentals.ts:881.
- **O3.** "Drop everything — your queen on d5 is attacked…" was said on 3.Nc3, the standard tempo in this opening. It is the loudest danger opener, used for any attacked queen (liveTacticsContext.ts:771, :780-791). The reference coach teaches the opening's trade-off instead: the queen came out early, Nc3 kicks it, Qa5 is the main line.

### MISSING computers (new under rule B6, to bring to David)
1. Desperado.
2. The two-pieces-attacked checklist.
3. The last chance.
4. The line standoff: whose pin wins.
5. Why the plan changed.
6. Why the verdict moved.
7. The queen's escape check before a grab, and the net before it closes.
8. "Their only reply" as a fact.
9. The job the book move did that yours doesn't.
10. What a pin stops here, and how they will unpin.
11. A thesis built from the result trajectory.
12. One decider for what to ask and what to hold back.
13. One ranked reason list per move, urgency first.