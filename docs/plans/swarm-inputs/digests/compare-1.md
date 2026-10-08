**Gap list: our Learn tape (learn5.log) compared with the reference coach**

Scope: two Learn games, student Black, Scandinavian Lasker. Game 1 (canonical, learn5.log:5, tape :25-40). Game 2 (typo, learn5.log:12, tape :43-69).

Sources:
- `[n]` = report.json spokenLines row: `audit-reports/concept-gameplay-2026-10-07T00-03-25-206Z/report.json`.
- Engine figures are my own Stockfish 18 lite runs at depth 13 (scratch `games-eval.txt`), not the app's.
- Our computers were probed read-only on the same positions (scratch `probe-a…e.out`).
- The reference coach's own Scandinavian notes (`vc-26ZXZEiudhA`, `vc-hzotV0aslmY`, `vc-1zfJ7ABoh8k`, `vc-BzN6MEleBlQ`, `vc-ieznxMQccW0`) are all from White's seat. Only the facts carry over; the wording flips seat (V16).

## Part 1: The ten gaps behind most misses (ranked)

**1. A pawn hitting a defended piece is invisible to every live threat computer.**
- Where: 6.h3 in both games, 7.d5, and 9.g5. Three pieces were lost to pawns with no warning.
- HE: "their pawn hits your bishop. A defender doesn't help when the attacker is cheaper; answer it now." (teach-brief.md:685, :698)
- WE: silent at 6.h3 ([30]; game 2 has no row). At 9.g5 the coach talked about d4 instead (learn5.log:54-55).
- COMPUTER: EXISTING but switched off by a floored SEE.
  - The branch built for this case is `CoachTeachPage.tsx:8275-8308`. It stands down at :8294-8295 when the student can "take the attacker" and lose nothing, scored by `legalSeeGainFor`. That function is floored at 0 (`positionReadingService.ts:212-215`), so a losing capture counts as an answer.
  - Probe: 6.h3 Bxh3 scores 0 floored but −2 signed. 7.d5 scores −2 on both h3 and d5. 9.g5 Qxg5 scores 0 floored but −8 signed (scratch `probe-c.out`).
  - Every other door is blind by definition:
    - `detectNewThreat` needs a capture worth at least 3 (`groundedAnswer.ts:6954-6955`). hxg4 Nxg4 is worth 2.
    - `findHangingPieces` skips defended pieces (`tacticClassifier.ts:569-570`).
    - `computeMustDefend` reads that list (`threatOut.ts:92`), so `positionAsk` says "Finish developing before anything else" at 6.h3 and 7.d5.
  - The right sentence exists only in How-to-Think (`thinkingSafetyStep.ts:51-53`: "guarded, but their pawn attacks it — the cheaper piece wins it anyway"). `findHangingBySee` (`positionReadingService.ts:355-361`) is not wired into Learn's live lanes.
- F01: IDENTIFY, PREVENT, KNOWLEDGE (count by value).

**2. The opponent's defended but losing pieces are never offered as targets.**
- Where: 21.Be8 and 22.Qe4. The coach gave away a bishop, then a queen.
- HE: "they've left it: hit twice, held once. Take it." (teach-brief.md:1002, :753)
- WE: silent ([89]-[94]). Computed but never spoken at 22.Qe4: "The capture on e4 isn't going anywhere — leave it hanging over them…" ([93]). That advises against taking a queen that can simply move away.
- COMPUTER: EXISTING, wrong reader.
  - The "something to win" lane (`CoachTeachPage.tsx:8104-8123`) reads `findHangingPieces` (`liveTacticsContext.ts:376-380`). The probe shows the e8 bishop (guarded by Qe2) and the e4 queen (guarded by Nc3) are not listed.
  - `threatStronger` (`speedRunReads.ts:144-157`) claims "the material will keep" without checking that the target can't move.
  - The coach's own Be8 was costed at 0cp ([92]), so the "you were let off" lane (`opponentGap.ts:38-75`, called from `CoachTeachPage.tsx:9559-9568`) had nothing to say. Why it was 0cp is not traced.
- F01: IDENTIFY, CONSEQUENCES.

**3. The opening is named, never taught (F02, V19).**
- Where: moves 1-6.
- The identity line is computed but never offered. No `openingIdentity` or `openingIdea` lane appears in any of the 83 door rows; 34 of those rows offered nothing at all (scratch `spoken-all.txt`).
- The opening's bargain (the queen comes out early and gets hit with tempo) is not in the identity facts.
- The tempo fact is computed only from White's seat.
- There is no theory menu on the student's book moves and no warning that h3 is coming.
- The book-departure line names the book move but never says what it did.
- Detail per move in Part 2.

**4. Critical moments are flagged but not thought through (S3, F18).**
- At 10.Bb5 the coach said "only one move" but never named d4 or the real reason.
- At 7.d5, also a single-move position (Bxf3), there was no flag at all.
- `criticalMoment.ts:285`: the Learn register "never names the move". This contradicts S3.
- The deliberation lanes were offered and then held ([57]; hold rules `learnTurnDoor.ts:394-420`).

**5. "Why the better move was better" picks a plan clause over the real, often defensive, reason.**
- `whyBetter` (`inaccuracyCall.ts:306-420`) only knows "take the X" or the best line's plan clause.
- `moveFundamentals` already computes the right reason ("steps out of the pawn's reach…"). These are two producers for one question (census A6).
- Examples: 9…Ng4, 10…d4, 17…f5, 6…Bf5/Bxf3. Details in Part 2.

**6. Knowledge and method computers this tape needed that don't exist** (details in Part 2):
- desperado: 7…Bxf3, 23…Qxa1, 24…Qxb3
- two-pieces-attacked checklist: 7.d5
- which rook: 21…
- check the queen's exits before grabbing: 21…Qxa2
- the line cuts both ways: 8.hxg4
- last chance: 11…, 24…
- priority first: 9.g5
- counter-blow first: 13.Nce4
- count by value: 15.c3
- the opponent's two-branch dilemma: 10…

**7. False or wrong-seat claims about the student's standing.** Two are clearly false:
- "keeps you clearly on top" at about −2.1.
- "two moves keep the win" at about −3.8.

Wrong register:
- "hit the gas" while a knight down.
- "imprecise" for a lost piece.
- "Drop everything" on a book position.
- An illusory "Not urgent yet" alarm.

First person (V1/V2):
- "That was a blunder from me" (`inaccuracyCall.ts:729-735`).
- "I let you off there" (`opponentGap.ts:87-88`).

**8. Repetition and memory.**
- The pin definition was repeated word for word the next game (`learnMemory.ts:270-277` clears taught terms every game; V18).
- `threatStronger` fired on two consecutive moves. It sets no once-a-game claim (`speedRunReads.ts:157`; compare `goodInEveryBranch`'s claim at :396).
- Game 2, 3.Nc3: one fact in four lines, and the answer came before the question.
- One line (d1–d5–d8) was read from both ends as two findings (D4).

**9. Computed but never heard; rhythm.**
- At the audit's pace (about 2 seconds a ply), queued lines are dropped when the next move arrives (`CoachTeachPage.tsx:10155`, :10167, :10181). Rows [16], [36], [43], [61], [132], [138], [147] were all lost this way.
- The V2 row "47/move" (learn5.log:72) divides all 1,173 words of the run by 25 moves. Per game it is about 12 words a move (game 1, 300 words) and about 27 (game 2, 678 words). The reference coach runs about 46 a move (teach-brief.md:248).
- Game 1 from 17.Be3 to 25.Bxg7, the stretch where the coach hung a bishop and a queen, has one line.

**10. The closing habit never comes.**
- The run logged 0 method beats in 49 decision rows (learn5.log:84). Meanwhile the student ignored a pawn threat three times, and the post-game recap named "ignoring a threat" (learn5.log:42).
- `methodBeat.ts:142-149` (the opponent-threat habit) exists; why it never fired is not traced.
- HE: "Closes on the habit that finds it next time" (teach-brief.md:441).

## Part 2: Move by move

### Game 1

**1…d5 / 2.exd5 (opening named)**
- HE: names it with what it is and what it costs: "it hits e4 at once; the price is an early queen that gets kicked, and at club level it's hard to play well." (teach-brief.md:371, :556; notes vc-26ZXZEiudhA-2, vc-hzotV0aslmY-3)
- WE: "This game is the Scandinavian Defense." (learn5.log:29)
- COMPUTER:
  - EXISTING, unvoiced: `openingIdentityLine` (`openingIdentity.ts:85`) returns "It challenges the centre at once: they almost always take on d5, and the pawn is taken back." It is queued once per game at `CoachTeachPage.tsx:8466-8478` but was never offered (not traced; the file loads lazily, `openingIdentity.ts:34-41`).
  - MISSING: the bargain. `opening-identity.json` has provokes:null for "Mieses-Kotroc" and "Lasker", and the provokes kinds (`openingIdentity.ts:104-121`) have no "developing move hits your queen" kind.
  - Also computed, never voiced: "d5 follows a rule worth keeping…" ([16]).
- F01: RECOGNIZE, STRATEGIZE.

**2…Qxd5 (student)**
- HE: "the queen recaptures early, and Nc3 is coming to hit it." (vc-ieznxMQccW0-3/4; teach-brief.md:741, :931)
- WE: silent.
- COMPUTER: MISSING (warning of the opponent's usual reply to a book move). The idea exists only as a fault label: `principleAttribution.ts:889` early-queen-sortie, spoken by `principleVoice.ts:252-255`.
- F01: PREVENT, CONSEQUENCES.

**3.Nc3 (coach)**
- HE: "the knight develops with tempo on your queen. That's the opening's price. The main retreat is a5; d8 and d6 are respectable." (vc-26ZXZEiudhA-5, vc-hzotV0aslmY-5/-6; teach-brief.md:379, :560)
- WE: "Drop everything — your queen on d5 is attacked and nothing's defending it. It's the Mieses-Kotroc Variation." (learn5.log:30)
- COMPUTER:
  - The tempo fact EXISTS for the mover: `moveFundamentals.ts:501-509` gives "develops into the game with tempo, hitting the queen on d5" (probe). But `theirMoveChanged(Nc3)` is null (probe; `moveInsight.ts:573-600`), so it never reaches Black's seat.
  - "Drop everything" comes from `dangerLevel`: any piece worth 5 or more is "decisive" (`liveTacticsContext.ts:770-787`), with no exception for a book position.
  - MISSING: the retreat menu with theory status. The book reads speak only at a departure (`openingAnnouncement.ts:93-105`).
- F01: RECOGNIZE, KNOWLEDGE.

**3…Qa5 (student)**
- HE: "the main line; a5 is the queen's standard post, and c6 later gives it a home. Most play d4 now; b4 is the trappy pawn offer." (vc-hzotV0aslmY-6, vc-1zfJ7ABoh8k-12, vc-BzN6MEleBlQ-6)
- WE: silent ([25]). Game 2 computed, never voiced: "That's what strong players play here — it saves the queen from their knight on c3…" ([132]).
- COMPUTER: EXISTING (`strongChoice`; `moveFundamentals` "saves the queen from their knight on c3", probe). MISSING: a warning about the trap in the line ahead. The b4 gambit is in `opening-identity.json` ("Main Line, Leonhardt Gambit", taken 91%) but is only readable once b4 is played.
- F01: KNOWLEDGE, PREVENT.

**4.d4 (coach)**
- HE: "they take the full centre, and with d2 empty your queen now pins their knight to the king." (vc-26ZXZEiudhA-7; teach-brief.md:735)
- WE: silent. The pin came one move late (learn5.log:31).
- COMPUTER: `theirMoveChanged(d4)` says "now only the pawn on b2 guards their knight on c3" (probe). MISSING: a pin created or broken by their own move (`moveInsight.ts:573-600`).
- F01: IDENTIFY.

**5.Nf3 (the pin line)**
- HE: judges whether the pin bites: the knight is held by the b2 pawn, so it's an annoyance rather than a win. (teach-brief.md:486)
- WE: "You have a pin … Remember — a pin freezes the piece in front … so it can be piled on." (learn5.log:31)
- COMPUTER: `pinBites` (`pinGeometry.ts:178-187`) checks only whether the pin is valid; the definition comes from `conceptEngine.ts:126`. MISSING: a spoken judgment of whether the pin wins anything.
- F01: RECOGNIZE.

**5…Bg4 (student)**
- HE: "it pins their knight and leans on d4; h3 will ask it the question right away." (vc-26ZXZEiudhA-10/-11; teach-brief.md:931)
- WE: silent ([30]).
- COMPUTER: "their usual answer is h3" exists only as an identity 'pawn-hits' entry (`openingIdentity.ts:104-109`). `opening-identity.json` has it under "Valencian Variation, Main Line" (82%), not under this line's names. MISSING per position.
- F01: PLAN, PREVENT.

**6.h3 (coach): the key moment of both games**
- HE: "h3 asks your bishop the question, and you must answer: a pawn takes a bishop even though your knight guards it. Bh5 keeps the pin (book); Bxf3 trades." (vc-1zfJ7ABoh8k-13/-14; teach-brief.md:685, :410)
- WE: silent, both games. The student then left the bishop to be taken twice.
- COMPUTER: Part 1 #1, root cause `CoachTeachPage.tsx:8294-8295`. The book move's job is already computed: `moveFundamentals` gives Bh5 "steps out of the pawn's reach and keeps the pressure on the knight on f3" (probe-e).
- F01: IDENTIFY, PREVENT, KNOWLEDGE.

**6…Nc6 → 7.d5 (student blunder; coach misses hxg4)**
- HE:
  - "Out of book: Bh5 stepped out of the pawn's reach and kept the pin; Nc6 leaves the bishop to the h-pawn." (teach-brief.md:561)
  - Then: "they let you off. Now two pieces are hit by pawns (g4 and c6), so the doomed bishop takes first: Bxf3, Qxf3, then Nd4 hits the queen." (teach-brief.md:640, :473, :854; engine 7…Bxf3 −0.01 vs O-O-O −2.74)
- WE: "You left the book with the knight to c6; the usual move there was the bishop to h5." (learn5.log:32). Computed, never voiced, and first person: "That was a blunder from me — … Your bishop on g4 is still hanging, though — see to it." ([36])
- COMPUTER:
  - The departure line (`openingAnnouncement.ts:93-105`) doesn't read the book move's job. PARTIAL.
  - "Two things of yours are hit at once" (`moveInsight.ts:213-216`) is reachable only from the hint and drill paths (`CoachTeachPage.tsx:2870`, :11939, :11968), and is blind here anyway (probe: "Finish developing").
  - Desperado: MISSING (only an exclusion in `exchangeLedger.ts:418-420`).
- F01: IDENTIFY, CONSEQUENCES, KNOWLEDGE.

**7…O-O-O → 8.hxg4 (the bishop falls)**
- HE:
  - "That's a piece for nothing. Twice a pawn took aim and nothing answered it. Habit: after every enemy move, ask what it attacks."
  - "Their d5 pawn is pinned to their queen by your rook. It can't take your knight (dxc6? Rxd1+). Hit it: e6, three attackers against two." (teach-brief.md:441, :598, :731; chess.js confirms 9.dxc6 allows Rxd1+)
- WE: "Not urgent yet, but see it coming — their pawn on d5 is a discovered attack in waiting — moving it unveils their queen on d1 against your rook on d8. Remember — … You have a pin: your rook on d8 pins their pawn on d5 against their queen on d1 …" (learn5.log:33, 78 words)
  - One line read from both ends.
  - The alarm half is false: if the pawn moves, your rook takes their queen.
  - The lost bishop is never mentioned.
  - Computed, never voiced: "Ask the question — e6 hits the pawn at once." and "Count before you take on d5: 3 … 2" ([43]).
- COMPUTER: the discovery detector (`tacticsDetector.ts:580-621`) has no "the target hits back and it's their move" test, so "the line cuts both ways" is MISSING (teach.md:670). Habit: Part 1 #10.
- F01: RECOGNIZE, IDENTIFY.

**9.Bd2 (coach)**
- HE: "their bishop breaks your pin; their pawn still hits your knight. Don't retreat it, take the attacker: exd5." Plus the stock-take with a plan: "a piece down: keep pieces on, make it messy." (teach-brief.md:735, :639, :981)
- WE: "Prefer the e-pawn taking on d5 to the knight to e7 — the forcing move comes first." (learn5.log:34) and "Taking stock as the middlegame begins: you're in trouble — they're up a piece and they have the bishop pair." (learn5.log:35)
- COMPUTER:
  - `tacticalRead.ts:658-674` gives a slogan, not the board reason.
  - `theirMoveChanged(Bd2)` says "…their pawn on d5 is attacked more times than it is defended" (probe). "Pin broken" is MISSING.
  - `phaseVerdictLine` (`reviewPositionalAssessment.ts:276-311`) gives the verdict with no plan. The plan line (`positionCharacter.ts:102`) never fired in game 1.
- F01: IDENTIFY, STRATEGIZE.

**10.Bb5 (coach slip; only one move holds)**
- HE: "One move. Their bishop on b5 is held only by the knight on c3 and your queen hits it. Kick the guard: d4. If the knight moves, Qxb5; if it stays, dxc3. Nxg4 just grabs a pawn." (teach-brief.md:814, :492, :749; engine d4 +0.27 vs Nxg4 −2.23)
- WE: "Critical moment — only one move keeps you level. Slow down here. The capture on g4 isn't going anywhere — leave it hanging over them and make the useful move first; the threat is the stronger weapon." (learn5.log:36)
- COMPUTER:
  - The Learn register withholds the move (`criticalMoment.ts:285`).
  - `threatStronger` (`speedRunReads.ts:144-157`) supplies the wrong reason.
  - "attack-defender" covers piece moves only (`moveFundamentals.ts:842`, :846), so d4 reads as "kicks their knight off c3, gaining time" (probe-d; [61]).
  - The deliberation lanes were held ([57]).
  - Two-branch dilemma: MISSING (teach.md:688).
- F01: CONSEQUENCES, IDENTIFY.

**10…Nxg4 / 11.O-O / 11…Bc5**
- HE: "they let you off again. d4 still works, for the last time: after Qe2, b5 is covered." On Bc5: "it develops, but the chance is gone." (teach-brief.md:854, :785; engine 11…d4 −0.59 vs Bc5 −2.11)
- WE: "bishop to c5 keeps you clearly on top, but d4 was cleaner — it would win a piece for a pawn." (learn5.log:37). This is false: Black is about −2.1. Computed, never voiced at 11.O-O: "…d4 was the answer to their slip…" ([61]).
- COMPUTER:
  - `inaccuracyCall.ts:787-792` says "keeps you clearly on top" when the eval it is handed is at least 150 (`STILL_BETTER_CP`, :1018). The eval it received matches White's side; the caller (`CoachTeachPage.tsx:10506-10526`) is not traced.
  - "Last chance": MISSING (teach.md:724).
- F01: IDENTIFY, CONSEQUENCES.

**12.Qe2 / 12…Bxf2+ 13.Rxf2 Nxf2 14.Kxf2**
- HE: "their queen covers b5, so the d4 shot is gone." Then: "count it: bishop and knight for rook and pawn. What does it buy? Their king just walks out." (teach-brief.md:740, :402)
- WE: silent ([68], [69]; the split-the-board line [70] was never voiced).
- COMPUTER:
  - `theirMoveChanged(Qe2)` is null (probe).
  - `threatStoppedBy` (`opponentMovePurpose.ts:58-110`) only sees threats the student's last move created; losing a standing resource is MISSING.
  - `sacrificeCompensation` (`reviewSacrifice.ts:44`) runs in Review only.
- F01: IDENTIFY, CONSEQUENCES.

**15.Kf1**
- HE: an honest verdict plus the recovery method: don't trade, keep pieces active, make them decide every move. (teach-brief.md:401, :981)
- WE: "Narrow here — two moves keep the win, and nothing else does." (learn5.log:38). This is false: Black is about −3.8. The numbers fit White's decision one ply earlier (15.Kf1 +3.81, 15.Kg3 +3.06, next +0.65).
- COMPUTER: `readCriticalMoment` (`criticalMoment.ts:164-262`, via `positionFacts.ts:567-568`) was fed that fan; not traced. The recovery line (`positionCharacter.ts:102`) never fired.
- F01: IDENTIFY, STRATEGIZE.

**15…Nd4 16.Nxd4 Qxd4**
- HE: "you're behind; every trade helps them. Keep the knight." (teach-brief.md:620)
- WE: silent. The right line came three moves late and was never voiced: "You're down material — don't trade…" ([86]).
- F01: STRATEGIZE.

**17.Be3**
- HE: the threat plus the answer: move the queen with gain, for example Qf6+. (teach-brief.md:809, :854)
- WE: "Careful — your queen on d4 is attacked and nothing's defending it." (learn5.log:39)
- COMPUTER: `threatAnswer` (`threatAnswer.ts:58-161`) was not offered on this turn ([78] offered only the threat).
- F01: PREVENT.

**21.Be8 (free bishop)**
- HE: "hit twice, held once: take it, with the idle h-rook so the d-rook keeps the file." (teach-brief.md:1002, :638; engine Rhxe8 +0.49 vs Rdxe8 +0.08)
- WE: silent.
- COMPUTER: Part 1 #2. Which rook: MISSING (`recaptureChoice.ts:56-95` has no rook facts).
- F01: IDENTIFY, PLAN.

**22.Qe4 (free queen) / 22…dxe4**
- HE: "their queen walked onto a square your pawn takes. Take it. Now the job changes: simplify and convert." (teach-brief.md:753, :851, :850)
- WE: silent; the computed line advised the opposite ([93]).
- COMPUTER: Part 1 #2. A mindset-change computer exists (`positionCharacter.ts:130`), but no lane spoke after dxe4 ([94]).
- F01: IDENTIFY, STRATEGIZE.

### Game 2

**3.Nc3**
- HE: a rhetorical question answered at once. Or, if the record justifies a real question, it first says why (F05; the record said "ignoring a threat", learn5.log:42). (teach-brief.md:861)
- WE: "Drop everything — your queen on d5 is attacked…", then "Which of your pieces could they win right now?", then "What do you do about it?", then "Your queen on d5 is attacked and nothing guards it." (learn5.log:46-49)
- COMPUTER: the How-to-Think safety step (`thinkingSafetyStep.ts:72`, :50) runs beside the live alert (`CoachTeachPage.tsx:8264`). The F05 "say why first" preface is MISSING.
- F01: IDENTIFY.

**5.Nf3**
- HE: repeats shorter each time. (teach-brief.md:856)
- WE: the full pin definition again, word for word (learn5.log:50).
- COMPUTER: per-student term memory MISSING (`learnMemory.ts:270-277`).
- F01: RECOGNIZE.

**7.hxg4**
- HE: "the same h-pawn trick as last game; Bh5 or Bxf3 saved it." (teach-brief.md:855)
- WE: "You left the book with the knight to c6; the usual move there was the bishop to h5." (learn5.log:51). Nothing about the piece just lost. Computed, never voiced: "You've walked into this before … Bxf3 was the move — it would trade off the knight." ([147]). The reason should be that it saves the bishop.
- F01: IDENTIFY, CONSEQUENCES.

**8.Bd3**
- HE: first what their move changed: "their bishop joins the rook on h1 against h7" (chess.js: attackers d3 and h1; defenders h8 and f6).
- WE: "Don't cash in on d4 yet — …" and "Your pawn has a move that works whatever they answer — the next-best choice leaves your pawn on h7 to be taken." (learn5.log:52-53). A riddle with no named move and no named threat.
- COMPUTER: `goodInEveryBranch` idea form (`speedRunReads.ts:383-396`). `theirMoveChanged(Bd3)` reads d4, not h7 (probe-d).
- F01: IDENTIFY.

**9.g5**
- HE: "priority: the pawn hits your knight on f6. Save it (Ng4); d4 can wait." (teach-brief.md:442; engine Ng4 −3.85)
- WE: "You could take on d4 right now, but the threat is stronger than carrying it out — the material will keep…" and "The middlegame starts here, so take stock: … and it isn't enough." (learn5.log:54-55). 72 words, none of them about the knight.
- COMPUTER: Part 1 #1 (signed SEE −8). Priority framing: MISSING (teach.md:123).
- F01: PREVENT, PLAN.

**9…Nxd4 (verdict)**
- HE: "the real loss is the knight on f6. Ng4 steps out of the pawn's reach."
- WE: "That pawn was defended: your knight takes on d4 and is taken on the spot — … knight takes d4 was imprecise. knight to g4 was the move — it would swing pieces toward their king." (learn5.log:56). The game went 10.gxf6.
- COMPUTER: `moveFundamentals` gives Ng4 "steps out of the pawn's reach, keeping the knight…" (probe-d), but the verdict used `whyBetter`'s plan clause (`inaccuracyCall.ts:306-420`) and `principleVoice.ts:534`.
- F01: IDENTIFY, CONSEQUENCES.

**13.Nce4**
- HE: "their knight hits your bishop and the f6 pawn behind it. Kick it first: f5." (teach-brief.md:639; engine f5 −4.63)
- WE: "Your bishop has a move that works whatever they answer — the next-best choice leaves your pawn on f6 to be taken." (learn5.log:59)
- COMPUTER: counter-blow first: MISSING (teach.md:490).
- F01: PREVENT.

**15.c3 → 15…Bc5 16.cxd4**
- HE: "a pawn hits your knight. Guarding it doesn't help. Move it (Nf5)." (teach-brief.md:698; engine Nf5 −4.71)
- WE: "Careful — your knight on d4 is attacked and nothing's defending it." (learn5.log:61). Then, after cxd4, a knight down: "…the position just opened up, so hit the gas…" (learn5.log:62)
- COMPUTER: `threatAnswer` printed "How do you meet it?" but no answer was ever voiced ([207]). `countMethod` counts heads and stays silent when the count and the exchange disagree (`countMethod.ts:5-6`, :17-40). `positionOpened` (`speedRunReads.ts:224-237`) has no material gate.
- F01: KNOWLEDGE, PREVENT.

**17…Bc3 (verdict)**
- HE: "a blunder: the bishop just hangs. f5 kicks the knight on e4." (chess.js: f5 hits e4)
- WE: "…bishop to c3 was imprecise. f5 was the move — the idea is to create a passed pawn on e6." (learn5.log:64)
- COMPUTER: `moveFundamentals` gives f5 "kicks their knight off e4" (probe-d), but `whyBetter`'s plan clause won (Part 1 #5).
- F01: CONSEQUENCES.

**20…Qd5 / 21.Rb1 / 21…Qxa2**
- HE (before the grab): "before taking a pawn with the queen, count its exits." (teach-brief.md:716)
- WE: "Their rook to b1 prepares queen to b5…" (learn5.log:66). Then "Their knight to b3 does two jobs…" (learn5.log:67, good), but no "get your queen out now".
- COMPUTER: MISSING (teach.md:592). `findTrappedPieces` needs the piece already attacked (`tacticsDetector.ts:469`; the probe shows "trapped" only after 23.Ra1).
- F01: PREVENT.

**23.Ra1 / 24.Be3**
- HE: "it's lost anyway, so make it pay: Qxa1" (engine's best). At 24.Be3, the last chance: "Qxb3." (teach-brief.md:473, :785)
- WE: "Watch out — your queen on a2 … is trapped … You have a pin: your queen on a2 pins their bishop on c2…" (learn5.log:68). Silent at 24.Be3 ([253], [255]).
- COMPUTER: desperado and last chance: both MISSING.
- F01: KNOWLEDGE, CONSEQUENCES.

## Part 3: Where we already teach the way he does

All of these are reads of the opponent's move in calm positions:
- learn5.log:57: the recovery method (`positionCharacter.ts:102`).
- learn5.log:58: castling given up, their intent, and split the board (`theirMoveCost.ts:126`, `splitPosition.ts:23`).
- learn5.log:60: their g3 costs them f3.
- learn5.log:63 and :65: pile on the pinned piece (`pinPressure`).
- learn5.log:67: one move doing two jobs (`moveIntent.ts:362`).
- learn5.log:69: the duty read answering "couldn't they just move it?".

## Caveats

- Lines marked "computed, never voiced" are delivery gaps caused by the audit's 2-second pace, not missing computers.
- The false-standing cause (the sign or position handed to the producer) is not traced.
- Outside the moves, learn5.log:26-27 and :41-42 are first person and talk about the app (V1, V5).
- Not built and not proposed here (B6): every MISSING item above goes to David.

Scratch evidence is in `/tmp/claude-0/-home-user-chess-academy-pro/61fdf752-44c7-57cb-be1e-44a85a8d5754/scratchpad/cmp/`:
- `games-eval.txt`: engine evals.
- `spoken-all.txt`: door rows.
- `probe-a.out` to `probe-e.out`: our computers on these positions.
- `chk.out`: chess.js checks.