# Opening teaching: where our coach falls short of the reference coach (F02, F03, V19)

All code paths are under `/home/user/wt-work`. I did not change anything in the repo.

## Evidence

- **Learn tape:** `docs/plans/swarm-inputs/learn5.log`, plus the door rows in `audit-reports/concept-gameplay-2026-10-07T00-03-25-206Z/spoken-canonical.json` and `report.json`. Two games of the Scandinavian Lasker with the student as Black (1.e4 d5 2.exd5 Qxd5 3.Nc3 Qa5 4.d4 Nf6 5.Nf3 Bg4 6.h3 Nc6). 83 door rows in total.
- **Review tapes:** `rev-g1.tape` and `rev-g2.tape`, for the same games.
- **Lessons:** the hand-written lesson scripts in `src/data/lessons/*.ts` (Watch, and tier 1 of "teach me X opening").
- **Probe for the generated lessons (tier 3 of "teach me X opening"):** a read-only script outside the repo that calls the same function `computedPlyBeat` calls (`buildReviewMoveBriefing` with `register:'teach'`, `openingGenerator.ts:1689-1700`) and the same spine resolver. Output files:
  - `/tmp/claude-0/-home-user-chess-academy-pro/61fdf752-44c7-57cb-be1e-44a85a8d5754/scratchpad/cmp-opening-v19/probe.out`
  - `/tmp/claude-0/-home-user-chess-academy-pro/61fdf752-44c7-57cb-be1e-44a85a8d5754/scratchpad/cmp-opening-v19/probe2.out`
  - This is not a live tape. A library note, hand-written prose, a refuted alternative or a weighing can lead or follow a move.

**What the Learn tape says for the student's first six moves (game 1), in full:**
- "This game is the Scandinavian Defense."
- "Drop everything — your queen on d5 is attacked and nothing's defending it. It's the Mieses-Kotroc Variation."
- "You have a pin: your queen on a5 pins their knight on c3 against their king on e1. Remember — a pin freezes the piece in front…"
- "You left the book with the knight to c6; the usual move there was the bishop to h5."

That is 85 words over 6 moves, about 14 a move. The reference coach's opening runs about 30 a move (teach-brief, Reader 9). The turns after …Qa5 and …Bg4 were completely silent (spoken-canonical #25 and #30: `lanes offered=[]`). Not one of the student's own moves got its reason.

Across all 83 door rows, the opening lanes were offered this often:

| Lane | Offered |
|---|---|
| openingIdentity | 0 |
| openingIdea | 0 |
| trapAhead | 0 |
| gem | 0 |
| moveOrder | 0 |
| tempo | 0 |
| ruleException | 0 |
| fundamental | 0 |
| moveIntent | 1 |
| strongChoice | 1 |

## The gaps

**G1. Every opening move's own job: what it prepares, stops and allows (V19)**
- **He teaches:** each move's specific job, often several per move.
  - "…c6, making a little home for the queen" (vc-1zfJ7ABoh8k-12)
  - "Ne2, not f3 — f3 would block your own fianchettoed bishop" (-11)
  - "Bb3, not d3 — you went to c4 to stay on this diagonal" (vc-6nEI2p3ftgk-13)
- **We say instead:**
  - Learn: silent after …Qa5 and …Bg4. …Nf6 got only the pin definition.
  - Review: "Your knight on f6 now fights for e4 and d5. The rule behind knight to f6: develop into the game…". Nothing at all on …Qxd5 or 3.Nc3 (rev-g1).
  - Tier 3 (probe): "You play Qa5, the queen clamps down on c5, d5, e5, and f5, fighting for the center." · "You play Nf6, the knight bears down on d5 and e4, fighting for the center." · "You play Bc4, the bishop rakes toward d5, e6, and f7."
- **Computer: partial; the per-move job computer is missing.**
  - `principleLine` says the general rule once (`moveFundamentals.ts:1269-1281`). After that, repeats of development, centre, open diagonal and king safety return null (`:1291-1295`, `:1421`). The oct1 walk counted 7 of 9 owed opening plies silenced this way.
  - `moveIntent` needs an engine-proven gain (THREAT_CP 100 and PREPARE_CP 50, `moveIntent.ts:71,73`). Positional opening jobs rarely clear it.
  - Tier 3 falls back to board-description templates (`reviewMoveTeaching.ts:392`, `:398`, `:518`, `:544`). That file's own header says it is the Review register, not the teaching voice (`:14`).
  - Missing: a per-move opening-job computer — the square a move vacates or guards, the piece it makes room for, the line it keeps open, and what it allows.
- **F01 verbs:** PLAN, PREVENT, CONSEQUENCES

**G2. Lessons fold several moves into one beat, so most moves get no explanation of their own**
- **He teaches:** a clause on every move, and one long paragraph only at the end of the opening.
- **We say instead:**
  - About 2,215 of 3,179 lesson plies (about 70%, counted by a parser over 158 lesson files) sit inside a multi-move beat.
  - `caroKann.ts:50` ck3 covers 8 plies (Ng3 … Bh7) with one paragraph; …Nd7 is never explained.
  - `kingsIndianDefence.ts:24` 'e5' covers 6 plies.
  - In tier 1 those plies become silent moves (`masterclassWalkthroughAdapter.ts:188` creates `idea:''`; narration is attached only to the beat's last move, `:213`).
  - In the Openings Learn rung those plies have no written text below the board (`src/data/lessons/index.ts:953-966`).
- **Computer:** the lesson data and adapter exist. Missing: a beat per move, or G1's computer to fill the inner moves.
- **F01 verb:** PLAN

**G3. "Putting the question to a piece": the pawn kick, and a live bug**
- **He teaches:** "…Bg4, the classic pressure you have to answer" leading to "h3, taking g4 away before the pin can happen" (vc-26ZXZEiudhA-10/11), and "the bishop slides back to h5" (vc-1zfJ7ABoh8k-14).
- **We say instead:**
  - Learn, both games: nothing at 6.h3 (#30). The next turn says "You left the book with the knight to c6; the usual move there was the bishop to h5."
  - The bishop was lost to hxg4 in game 2. In game 1, "Your bishop on g4 is still hanging, though — see to it." was computed one move late and never spoken (#36).
  - Tier 3: "They play h3, kicks your bishop off g4, gaining time." This names no choice and is ungrammatical (template at `reviewMoveTeaching.ts:239`).
- **Computer: exists but is broken.**
  - The alert for a piece attacked by something cheaper (`CoachTeachPage.tsx:8275-8296`) treats the attack as "answered by a capture" whenever `legalSeeGainFor(...) >= 0`.
  - That exchange count is floored at zero (`positionReadingService.ts:150`), so the test is always true.
  - The probe at 6.h3 confirms it: Black's attackers of h3 = [g4], floored count 0, signed count −2 (the signed version is at `positionReadingService.ts:242`). This explains the silence. It is a small fix at the root (B4).
- **F01 verbs:** IDENTIFY, PREVENT

**G4. Traps around the opening move: setting them, avoiding them, and why they work (F03)**
- **He teaches:**
  - "Bc4 first — it sets an immediate trap" (vc-6nEI2p3ftgk-5)
  - "beware the centre fork trick: …Nxe4, then …d5" (-12)
  - "c5 — a typical mistake at this level" (vc-UXKY-hKJs6Q-12)
  - names the opponent's trap attempt and how to refute it (vc-IMBSR0A9nJs-12)
- **We say instead:**
  - No trap or gem line in either Learn game.
  - When the trap warning does fire, it says only: "Careful here: {move} looks natural, and club players {often} play it — but it walks into a known trap." (`learnBoardTeaching.ts:573`). It never gives the mechanism or the condition that decides it (F04).
- **Computer: partial.**
  - The warning reads only gems that win at least 3 pawns (`gemCrushLines.ts:564-573`; `punishGems.ts:66-70`). That is 54 of 344 gems, in 29 of 86 openings.
  - The live punish lane needs a slip with hand-written narration (`punishGems.ts:84-86`; `gemCrushLines.ts:757-764`).
  - Missing: the sentence that gives the trap's mechanism and condition, and the trap that the student's own move sets.
- **F01 verbs:** RECOGNIZE, PREVENT, CONSEQUENCES

**G5. The pin that breaks with tempo (David's first gem)**
- **He teaches:** "a pin only holds while the pinned piece can't move with check."
- **We say instead (tier 3 probe on 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Bxf7+ Kxf7 5.Ng5+ Ke8 6.Qxg4):**
  - "They play Bg4, landing a pin."
  - "You play Bxf7+, checking the king, forcing a reply, prising open their king's cover."
  - "You play Ng5+, landing a discovered attack, checking the king, forcing a reply."
  - "You play Qxg4, winning the bishop."
  - No warning on …Bg4 and no gem for this line (its engine value is still to be checked, as the brief says).
- **Computer: missing.** `isRealPin` (`pinGeometry.ts:135-165`) has no test for the pinned piece leaving with check, a bigger threat, or a discovery.
- **F01 verbs:** KNOWLEDGE (a golden nugget), RECOGNIZE

**G6. The centre fork trick, both ways (V19's own example)**
- **He teaches:** that a slow move allows the trick, warned before it lands.
- **We say instead:** only "X sidesteps their fork trick: …" (`forkTrick.ts:156`, through `trickSidestepped` at `:126`).
- **Computer: exists but only half wired.**
  - `forkTrickFor` (`forkTrick.ts:81`) has no production caller except `trickSidestepped`.
  - Nothing says "you have the trick now" or "your quiet move just allowed theirs", and neither direction is recorded (F4, F5).
- **F01 verbs:** RECOGNIZE, PREVENT

**G7. What the opening IS: its bargain, said when it arrives**
- **He teaches:** the opening's name and its deal in one breath. Our own Watch lesson already says it by hand: "Yes, the queen will be hit and cost a tempo — but Black spends that time developing with purpose" (`scandinavianDefence.ts:23`).
- **We say instead:**
  - Learn: "This game is the Scandinavian Defense." and "It's the Mieses-Kotroc Variation."
  - Review intro: "Here's your game in the Scandinavian Defense: Lasker Variation — you had Black."
  - Tier 3 lesson end: "Drill the moves to lock them in." (`openingGenerator.ts:2493`)
- **Computer: `openingIdentity.ts` is partial and partly broken.**
  - 627 of its 1,577 entries (40%) produce no sentence at all, including the Italian, Giuoco Piano, Najdorf, Queen's Gambit Declined, Caro-Kann Classical and Vienna.
  - The lookup (`identityFor`, `:51-63`) returns the exact-name entry even when that entry is empty. In 272 cases an empty variation entry hides a family entry that would speak.
  - Learn looks up the identity using the refined name (`CoachTeachPage.tsx:8468-8470`). So "It challenges the centre at once: they almost always take on d5, and the pawn is taken back." is lost once the name refines to Mieses-Kotroc or Lasker, both empty. The lane was offered 0 times. Review has the same problem (`reviewOpeningTheory.ts:641`).
  - The `capture` kind (239 entries) is never turned into a sentence (`:107-119`).
  - The `defining` field (`:20`) has no reader anywhere.
  - The bargain sentence itself is missing.
- **F01 verbs:** RECOGNIZE, STRATEGIZE

**G8. Learn and Review cannot reach the app's own opening lessons**
- **He teaches:** one coach, so a position gets the same teaching wherever it comes up (F2).
- **We say instead:**
  - Plies 1-8 of the Learn game are exactly the Scandinavian lesson's main line, and hand-written beats exist for those positions (`scandinavianDefence.ts:22-25`).
  - For example, the 'qa5' beat: "…Qa5 — the main line. From a5 the queen stays active, rakes the a5-e1 diagonal, and supports a quick …Bb4 and …c6…". Learn was silent at …Qa5.
- **Computer: exists but can't be reached.**
  - Nothing in Learn or Review reads the lesson beats. The only production importers of `src/data/lessons` are the openings page, its coach chat, variation tabs, `coachApi`, the walkthrough adapter and the kids coach.
  - CLAUDE.md still says `curatedBeatAt` keeps these beats on the live Learn board. That function no longer exists in `src`; only a comment remains (`planRace.ts:20`).
- **F01 verbs:** all of them (capability parity)

**G9. Leaving book: what the book move did, and what the departure allows**
- **He teaches:** on a departure, what the book move did that the played move doesn't, then how to cash it in ("c6 is odd here… so open with d4", vc-IMBSR0A9nJs-6/7).
- **We say instead:** "You left the book with the knight to c6; the usual move there was the bishop to h5." It never says that …Nc6 left the g4 bishop to the h-pawn.
- **Computer:** `openingAnnouncement.ts:93-106` produces only who left, with which move, and the usual move. `droppedJob` (`refutedAlternativeCore.ts:63`) exists but isn't joined to the departure. The join is missing.
- **F01 verbs:** IDENTIFY, CONSEQUENCES

**G10. Their opening move: the reason and the punishment, not just a cost**
- **He teaches:** "Nc3 with tempo, hitting the queen — a free move" (vc-26ZXZEiudhA-5), and a verdict on their move with its board reason and how to punish it.
- **We say instead:**
  - At 3.Nc3: "Drop everything — your queen on d5 is attacked…". The opening's known cost is spoken as an emergency.
  - At a departure: "That is a dubious choice — X is the move here, and this one costs them …" (`openingAnnouncement.ts:177-178`), spoken on its own (`CoachTeachPage.tsx:10985-10988`).
- **Computer: partial.** It is never joined to `theirMoveCost.ts:60` or to the line that punishes the move.
- **F01 verbs:** IDENTIFY, CONSEQUENCES

**G11. Theory status and the choices at a crossroads, in words**
- **He teaches:** "the queen recaptures — multiple options" (vc-BzN6MEleBlQ-4); "…Qd6, a modern, fully respectable branch" (vc-26ZXZEiudhA-7); "most play d4, some the trappy b4" (vc-BzN6MEleBlQ-6).
- **We say instead:**
  - Learn: no choices offered at 3.Nc3.
  - Review lecture: "Masters play X here — N percent of M games. At your level Y is the popular pick, P percent." (`CoachGameReview.tsx:2474-2479`). This breaks V8; the code disagrees with the rule.
  - The book line then plays out silently (`:2483-2505`), which breaks V11.
  - A wrong guess hears only "Not that one — look again." (`:2539`).
- **Computer:** the data exists (book departure, theory departure, master and amateur lookups). Missing: a crossroads computer that gives the main line, the respectable alternatives and the dubious ones, each with one reason.
  - Also flagged: "your level" is picked by rating (`theoryDeparture.ts:62` and `:114`), which conflicts with F10 and F17.
- **F01 verb:** RECOGNIZE

**G12. A rule and its exception: the early queen**
- **He teaches:** "the queen out early is bad — except…". The Scandinavian is the textbook case.
- **We say instead:** Review: "Your queen to a5: move the queen away from their knight on c3 before it is taken for nothing." Learn: nothing.
- **Computer: exists, but its conditions are too narrow.**
  - The early-queen exception fires only when the queen attacks something (`ruleException.ts:123-124`).
  - A capture never counts (`:83`), so …Qxd5 and …Qa5 can never qualify.
- **F01 verb:** KNOWLEDGE (rule and exception)

**G13. Counting tempo for both sides**
- **He teaches:** who has spent moves on what ("a free move").
- **We say instead:** nothing about the student's own lost tempi.
- **Computer: exists for one side only (F4).** `tempoCount.ts:59-69` counts only the opponent's piece moving for the third time, and only when the student has more minor pieces out.
- **F01 verbs:** KNOWLEDGE (arithmetic), CONSEQUENCES

**G14. Prevention in the opening**
- **He teaches:** h3 before …Bg4; "a4, the direct prevention that stops b5" (vc-6nEI2p3ftgk-15); "h3, as in the Glek" (vc-DnJl1cmihNQ-11).
- **We say instead:** "They play h3, kicks your bishop off g4, gaining time." (tier 3), and nothing on the Learn tape.
- **Computer:** the "prevents" half of `moveIntent` needs a threat worth at least a pawn (`moveIntent.ts:71`). Missing: a positional read of the square their piece wants.
- **F01 verb:** PREVENT

**G15. Move order, flexibility and transposition**
- **He teaches:**
  - "White didn't play Nf3, so …Nf6 exploits it" (vc-MvaAX4pTvYU-4)
  - "you've transposed into an Italian" (-7)
  - "the order really doesn't matter" (-9)
- **We say instead:** "By a different move order, the game has transposed into the X." (`openingAnnouncement.ts:82`), with nothing on what that changes.
- **Computer: partial.**
  - `moveOrder` fires only when playing the follow-up first loses material (offered 0 times).
  - `structureTransfer` knows only 3 structures (`positionReadingService.ts:1043-1053`).
  - Missing: the computers for "exploit the move they left out", "the order doesn't matter here" and "this move has no independent value".
- **F01 verbs:** RECOGNIZE, PLAN

**G16. The plan the opening hands you, when the middlegame starts**
- **He teaches:** one paragraph naming the break, the lever, the file and where each piece goes. This is the largest single thing he does (1,711 lines, 15% of his teaching).
- **We say instead:** "Taking stock as the middlegame begins: you're in trouble — they're up a piece and they have the bishop pair." Material only. "The opening is over…" and "The plan in this structure…" never appear on the tape.
- **Computer: partial, with a risky dependency.**
  - `openingPlanTeaching` and `openingSummaryLine` (`learnBoardTeaching.ts:627` and `:665`) were offered 0 times.
  - Both wait on the 37 MB masters file (`:628`, leading to `masterPlayLookup.ts:131,192`). `bookDeparture.ts:10-15` deliberately refuses to load that file on a phone because it is "the memory spike iOS kills apps for".
  - When the plan does speak, it names the break but not why.
- **F01 verbs:** PLAN, STRATEGIZE

**G17. Gambits: what the material buys**
- **He teaches:** accept or decline, with the compensation in the same breath.
- **We say instead (tier 3, Bishop's Opening spine):**
  - "You play b4, kicks their bishop off c5, gaining time."
  - "They play Bxb4, winning the pawn, leaving you with an isolated pawn on the a-file."
  - "They play exf4, winning the pawn, but conceding doubled pawns on the f-file of their own."
  - The sacrifice is never called a sacrifice and no compensation is named.
- **Computer:** the identity file has a gambit sentence, but only when the entry carries one (`openingIdentity.ts:121-125`). Missing from the per-move beat.
- **F01 verbs:** STRATEGIZE, CONSEQUENCES

**G18. The line taught must be the line people actually play**
- **He teaches:** the main road. His 39 Bishop's Opening notes run 2…Nf6 3.d3 Nc6 4.Nf3 (vc-MvaAX4pTvYU-4..9).
- **We say instead:**
  - "Teach me the Bishop's Opening" has no lesson, so it walks the 17-ply Four Pawns Gambit (e4 e5 Bc4 Bc5 b4 Bxb4 f4 exf4 Nf3 Be7 d4 Bh4+ g3 fxg3 O-O gxh2+ Kh1). The student ends four pawns down by material count, and the library has 0 notes on that line.
  - "Bishop's Opening: Berlin Defense" walks the Urusov Gambit.
- **Computer:** the spine is chosen as the longest database line, not the most played (`openingDetectionService.ts:565-590`). Missing: choosing the spine by how often it is played.
- **F01 verb:** RECOGNIZE (theory)

**G19. False statements in the generated lesson beats (D10)**
- **We say instead (tier 3 probe):**
  - "You play e4, loosening your own king's cover." This is said on every first central pawn push (e4, d4, d5, f4). It counts d, e and f pawns in front of an uncastled king as king cover (`reviewMoveBriefing.ts:269-270`). It contradicts the app's own "e4 follows a rule worth keeping: stake out the center…" (`moveFundamentals.ts:1279`).
  - "You play Qxd5, winning the pawn." and "They play exd5, but conceding doubled pawns…". A recapture is read as a win, and a pawn about to be retaken is read as damage, because `computedPlyBeat` never passes the recapture context (`openingGenerator.ts:1689-1700`; `reviewMoveBriefing.ts:156`).
- **Computer:** exists, but with wrong inputs and a wrong rule.
- **F01 verb:** none (truth problem); it pushes out PLAN

**G20. Caps that prevent "several points on one move" (V14, V19)**
- `reviewMoveBriefing.ts:286` keeps only the top 3 points.
- `openingGenerator.ts:2236-2248` enforces "two beats per move, not three" by cutting to the first sentence.
- `:2283`, `:2286` and `:2289` make the landed tactic, the refuted alternative and the weighing mutually exclusive.
- `:2132` stops the weighing after the first 16 plies (`DELIB_PLY_CAP = 16`).

**G21. A rule without its exception at the plan level**
- **He teaches:** "attack before you're fully developed — they're further behind."
- **We say instead:** "You are still in the opening — … Finish developing before anything else." This throws away the pawn hook it has just computed (`moveInsight.ts:246-264`).
- **Computer:** the rule exists; the exception is missing.
- **F01 verb:** STRATEGIZE

**G22. Statistics where words belong (V8)**
- **He teaches:** in words — "a respectable choice", "most players".
- **We say instead:** 114 spoken lesson lines in 50 files carry a number. For example, "scores an excellent 54% for Black at club level" (`scandinavianDefenceVariations.ts:21`), and "dxe4 — 320 of 376 games here (85%)". The Review lecture does the same (G11).
- **F01 verb:** RECOGNIZE

**G23. The F03 progression meter**
- **Computer: missing.** Nothing measures, from the student's own games, whether opening traps still decide them. So nothing shifts the coach's weight from traps to thinking. `trapLearning.ts` tracks each trap separately (`:46-60`).
- **F01 verb:** STRATEGIZE

**Not proven:** for 1…d5, the rule "d5 follows a rule worth keeping…" was computed and queued (#15-16) but never spoken. The live speech path drops a queued line once a newer turn starts (`CoachTeachPage.tsx:10139-10150`), and the audit moves fast (49 plies in 99 seconds). This is probably a pace effect, but book moves are fast in real play too, so it needs measuring.

## Causes that run through the list

1. **Category rules instead of move jobs.** The opening "why" is a general rule said once plus a description of the board, never this move's own job. So saying each thing once (V13) silences every later move.
2. **Opening knowledge is walled off.** It lives in the hand-written lessons and the library, and neither reaches Learn or Review. The computed path has no theory-based purpose, bargain, choice or departure computer.
3. **Opening lanes arrive too late or not at all.** They depend on the engine or on files (the 37 MB masters file, the lazily fetched identity file), so a fast opening hears only the name, a threat and a pin.
4. **Caps and truncation** in the generated lessons cut the several points a move deserves.
5. **Broken or one-sided computers:** the floored exchange count, one-seat tempo counting, the fork trick that only says "sidestepped", and the identity shadowing.

## For David (B6)

- **G8:** may the hand-written lesson beats speak in Learn free play? S7 bars library notes, not lesson beats. CLAUDE.md says they do speak there, but the code is gone.
- **G20:** his two-beats rule from 2026-09-12 conflicts with V19. He needs to rule on which wins.
- **G11:** "your level" is currently picked by rating. Should it come from the student's measured skill instead?