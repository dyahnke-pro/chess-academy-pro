# Gaps vs our tapes (5 comparers)

Each section is the HEAD of one comparer (its ranked gap list). The FULL text is in compare-N.md in this folder — grep it for the move-by-move detail. (Cap logged: heads are cut at 12,000 characters; nothing is dropped from the full files.)

## compare:1 — Learn tape (full: compare-1.md, 25889 chars)
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
- COMPUTER: Part 1 #1, root cause `CoachTeachPa

## compare:2 — Review tapes (full: compare-2.md, 21399 chars)
# Teaching gap list: what the reference coach teaches vs. our two Review tapes

**What I compared.** Both tapes review the student (Black, a bot) in the Scandinavian, Lasker line.
- G1 is learn5.log:5, reviewed in rev-g1.tape.
- G2 is learn5.log:12, reviewed in rev-g2.tape.
- `tape:N` means the line number in the tape file.

**How I checked.**
- Every board claim below was checked with chess.js.
- Best moves and costs come from Stockfish 18 lite (WASM), run in Node at depth 14.
- "Probe" means I ran the real computer from `src/services` on the game position, read-only. The scripts and outputs are in `/tmp/claude-0/-home-user-chess-academy-pro/61fdf752-44c7-57cb-be1e-44a85a8d5754/scratchpad/cmprev/` (p1.out, p2.json, p3.out).
- Act line numbers point to `docs/plans/swarm-inputs/digests/teach-brief.md` (TB).

## The gaps, most important first (the opening comes first, per F02)

### 1. Name their threat on the move that makes it — IDENTIFY / PREVENT
This is the gap that decided both games.

**He teaches:**
- "First question, what's their threat?" (TB:583).
- Spot their threat, then the answer to it (TB:685, :809, :976).

**We say:**
- On 6.h3 we say only "The line so far is the Scandinavian Defense: Lasker Variation." (rev-g1:8, rev-g2:8).
- On 9.g5 and 15.c3 in G2 there is no line at all (rev-g2:20→21, :27→28).

**The board:**
- h3 attacks Bg4, which only Nf6 guards. hxg4 Nxg4 wins a bishop for a pawn.
- g5 attacks Nf6, which g7 guards.
- c3 attacks Nd4, which nothing guards.

**The computer:**
- The fact already exists. `moveFundamentals.ts:393` computes "kicks their bishop off g4 / knight off f6 / knight off d4, gaining time" for all three moves (probe). But Review only voices fundamentals on the student's own clean moves (`reviewFullData.ts:1046`).
- Review's threat callout (`coachFeatureService.ts:2913`, "Careful — their move threatens…") reads `detectNewThreat`. That function:
  - drops any capture the victim can answer (`groundedAnswer.ts:6973`);
  - needs a net gain of at least 3 (`:6955`);
  - so it returns null on all three moves (probe).
- `computeMustDefend` (`threatOut.ts:71`) only counts pieces that are attacked AND undefended, so it finds nothing on h3 or g5.
- `buildOpponentMoveTeaching` (`reviewOpponentCommentary.ts:73`) only flags undefended pieces. Its 15.c3 line, "Watch out — that pawn attacks your knight on d4…" (probe), never reached the tape.
- **MISSING:** a threat read for a threat that can be answered, said from the student's seat: "their pawn attacks your bishop — move it, trade it, or lose it".

### 2. A piece hit by a pawn is lost even when it is defended — KNOWLEDGE (golden nugget)
**He teaches:**
- Count attackers against defenders, weighted by what they are (TB:698).
- Count, then name what complicates the count (TB:458).

**What happened in G2:** the student lost four pieces to pawns.
- Bg4 to h3 (guarded by Nf6).
- Nf6 to g5 (guarded by g7).
- Nd4 to c3. The student then *added* a guard with 15...Bc5, and it still fell to cxd4.
- Bc3 to b2xc3. Qa5 guards it, but Qxc3 loses the queen to Nxc3.

**We say:**
- 15...Bc5: no line.
- On 16.cxd4: "They take on d4 — that was your knight." (rev-g2:28).
- On 17...Bc3: "Your queen on a5 and your bishop on c3 form a battery on the diagonal, bearing down on their knight on d2." (rev-g2:29).

**The computer:**
- `countMethod.ts:17` needs at least 2 attackers and 2 defenders (`:29`), and only Learn uses it (`learnBoardTeaching.ts:411`).
- Review's `attackerDefenderCount` (`reviewTeachingPoints.ts:52`) only looks at enemy targets, skips pawns, and never checks the student's own pieces (`:58`, `:91`).
- **MISSING:** the cheaper-attacker rule ("a guard doesn't help when the attacker is worth less").

### 3. The turning-point question names the cause, and the habit fits the cause — IDENTIFY / PREVENT (habit)
**He teaches:**
- Flag the critical moment with what is at stake (TB:742, :813, :887).
- Close on the habit that finds it next time (TB:441, :767).

**We say:**
- "This is where the game turned. Find the move." (rev-g1:9, :18, :26; rev-g2:9).
- Then: "…That left your bishop hanging. Before you let go of a piece, check it is still defended." (rev-g1:10).
- But the bishop was attacked *before* the student's move. The student never let go of it; they ignored 6.h3.

**The computer:**
- `turningPoints.ts:53` has no "ignored-threat" kind of cause, so 6...Nc6 reads as "hung" (probe, `:139-144`).
- `turningQuestion` has no "hung" branch, so it falls to the bare prompt (`:189`).
- The "hung" habit is hard-coded at `:173`.
- The right cause and habit already exist:
  - `principleAttribution.ts:1032-1045` (ignored-threat; it fires on this exact board, probe);
  - `principleVoice.ts:84` ("Their move first, always…") and `:380`;
  - `methodBeat.ts:66`.
- `turningPoints.ts:21-25` imports none of them.

### 4. Priorities: answer the threat before you develop or castle — STRATEGIZE / PREVENT
**He teaches:**
- The most urgent thing first; save the piece in danger before quiet improving moves (TB:442).

**We say:**
- On 6...Nc6: "Your knight on c6 now eyes their pawn on d4, fights for e5." (rev-g2:11).
- `computeMoveFundamentals` files 6...Nc6 as "development: develops into the game, fighting for the center on d4 and e5" (probe).
- G1 7...O-O-O (bishop still attacked; the engine's move was Bxf3): "The move was bishop takes f3 — it lines up an x-ray at their rook on h1." (rev-g1:19).

**The computer:**
- **MISSING.** teach.md:123 marks it missing; the closest is `loosePieces.ts:35`.
- The ignored-threat verdict "Their threat first: the bishop on g4 was already attacked…" (`principleVoice.ts:380`) fires on G2 6...Nc6 when given the stored 8-move line (probe), but appears on neither tape.

### 5. Leaving book: what the book move did that yours doesn't — IDENTIFY / CONSEQUENCES
**He teaches:**
- Out of book: say the job the book move did (TB:561, teach.md:412).

**We say:**
- Neither tape has a departure line. 6...Nc6 goes straight to "Find the move." (rev-g1:9).
- Learn, on the same game, did say: "You left the book with the knight to c6; the usual move there was the bishop to h5." (learn5.log:32).

**The computer:**
- Learn's sentence is `openingAnnouncement.ts:106`, and only Learn uses it (CoachTeachPage.tsx:88). Review imports only `theirOpeningVerdict` from that file (`coachFeatureService.ts:75`).
- Review's `departureRecordSentence` (`openingRecordBeat.ts:40-55`):
  - is spoken in the intro only (`coachFeatureService.ts:3457`);
  - needs a precomputed departure row (`openingRecordBeat.ts:46`);
  - says WHAT was played instead, never WHY it matters.
- **MISSING:** comparing the book move's job with the played move's job.
- The trap library has 10 Scandinavian gems (`src/data/punish-gems.json`), none on this line.

### 6. Say what the opening is and what it costs, when it arrives — RECOGNIZE (knowledge)
**He teaches:**
- Name the opening and its bargain on arrival (TB:371, :556, :794).

**We say:**
- "Here's your game in the Scandinavian Defense: Lasker Variation — you had Black." (rev-g1:1).
- Later only the label again (rev-g1:8, rev-g2:8).

**The computer:**
- `openingIdentity.ts:85` exists, but Review only reaches it inside the optional "Opening theory" lecture button (`reviewOpeningTheory.ts:641`, `CoachGameReview.tsx:3863-3873`).
- It returns null for every name this game passes through: Mieses-Kotroc, Main Line and Lasker all have empty facts in `public/data/opening-identity.json` (probe).
- `identityFor` (`openingIdentity.ts:51`) never falls back to the family name. Only bare "Scandinavian Defense" produces a sentence.
- The `defining` field (`openingIdentity.ts:20`) is never read anywhere.

### 7. The tempo price of the early queen — KNOWLEDGE / CONSEQUENCES
**He teaches:**
- Develop with tempo, and warn about handing the opponent a tempo (TB:379; teach.md:14 "the knight to c3 develops AND hits the early queen").
- Count tempi (TB:522, :661).
- State the rule and its exception (TB:823).

**We say:**
- Plies 4 and 5 (2...Qxd5, 3.Nc3) are silent on both tapes (rev-g1:3→4).
- Then: "Your queen to a5: move the queen away from their knight on c3 before it is taken for nothing." (rev-g1:4). That is a rescue, not the trade-off.

**The computer:**
- `moveFundamentals.ts:507` computes 3.Nc3 as "develops into the game with tempo, hitting the queen on d5" (probe), but Review voices fundamentals only on the student's moves (`reviewFullData.ts:1046`).
- `reviewOpponentCommentary.ts:73` produces "Watch out — that knight attacks your queen…" (probe). That is an alarm, not the lesson, and it is not on the tape.
- `tempoCount.ts:32` only counts the opponent's third move with one piece (header lines 7-9), and only Learn uses it.
- The early-queen exception (`ruleException.ts:124`) only fires when the queen hits something, and only Learn uses it.
- **MISSING:** the student's own tempo ledger in the opening.

### 8. "They let you off — and your bishop is still attacked" — IDENTIFY / CONSEQUENCES
**He teaches:**
- Grade their slips and say when they let you off (TB:854, :590).

**We say:**
- On 7.d5 in G1 (the engine's best was hxg4; d5 cost about 3.8 pawns): "Your opponent: that was a blunder, costing about a piece — a central break with a bishop still at home — premature, opening the centre before they were ready for it; the stronger move was h-pawn takes g4…" (rev-g1:17).
- Nothing says the bishop is *still* attacked. The student then castled and lost it.

**The computer:**
- `opponentGap.ts:38` and `:100` exist, but only Learn uses them (sole importer CoachTeachPage).
- `prematureBreakWhy` (`reviewFullData.ts:98-133`) is placed ahead of the better move (`:479`, `:541`) without checking whether the development lag is what the move actually cost.
- The verdict "…hanging to hxg4 — they missed it this time." (`principleVoice.ts:712`) fires on 6...Nc6 (probe) but is not on rev-g1.

### 9. The reason for the better move is what's at stake, not a route — CONSEQUENCES
**He teaches:**
- Name the tempting move, give the concrete reason it fails, then give the move (TB:529).

**We say:**
- "the stronger move was bishop to f5 — it would walk your bishop on g4 round to g6, by way of f5" (rev-g1:11). The real reason ("…was the preventive move — it takes away their h-pawn takes g4") comes last in the same line.
- "lines up an x-ray at their rook on h1" (rev-g1:19).
- "it would walk their queen on e2 round to a4, by way of g4" (rev-g1:45).
- "the stronger move was h5." with no reason (rev-g2:29).

**The computer:**
- `betterMoveReason` (`inaccuracyCall.ts:194`) reads what the best LINE does (`phraseBetterMove`, `:170-172`), so a route outranks the stake.
- The prevention reason is appended last (`coachFeatureService.ts:4134`).
- The rescue reason exists too ("steps out of the pawn's reach", `moveFundamentals.ts:902`).
- **MISSING:** one stake-ranked reason chosen across these three producers.

### 10. A pinned defender is no defender — KNOWLEDGE / IDENTIFY
**He teaches:**
- TB:738 and :803.
- Corpus example vc-ADPy7sCbiUU-20 (paraphrased): more attackers than defenders on a square, and the pin is what complicates the count.

**The board:**
- G1 after 8...e6: d5 is hit by Rd8, e6, Nf6 and Qa5. It is "guarded" by Qd1 and Nc3, but Nc3 has no legal move because Qa5 pins it to the king.
- After 9.Bd2 the knight is free, but the bishop now blocks the queen's guard. That is 4 attackers against 1 defender.

**We say:**
- "e6 follows a rule worth keeping: open the diagonal for your bishop on f8…" (rev-g1:22).
- "Watch what they're building — left alone, their idea starts with d-pawn takes c6." (rev-g1:23).

**The computer:**
- `whyItFailed.ts:134` (`pinnedToMore`) computes the pin silently.
- `moveInsight.ts:573` would say on 9.Bd2 "…their pawn on d5 is attacked more times than it is defended" (probe), but Review imports nothing from moveInsight.
- `countMethod` deliberately stays silent when the raw count and the pin-aware count disagree (`countMethod.ts

## compare:3 — the 52 walk errors (full: compare-3.md, 24204 chars)
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
  - reviewStrategicOrientation knows the "don't push in front of your own king" rule but ap

## compare:4 — opening teaching (F02/F03/V19) (full: compare-4.md, 22631 chars)
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
- **Computer:** `openingAnnouncement.ts:93-106` produces only who left, with

## compare:5 — traps and gems (F04) + Bishop/Jobava lists (full: compare-5.md, 26503 chars)
# F04 Compare: how the reference coach teaches traps and gems, against our trap systems, plus hand-build lists for the Bishop's Opening and the Jobava London

Code was read in /home/user/wt-work (read-only, HEAD `ea7ddeaf0`; other sessions are editing coachApi.ts and reviewOpeningTheory.ts, so I re-checked those lines at the end). Note numbers are indexes into `public/data/voiced-teachings.json` `notes[i]`.

**How the engine numbers were made:** Stockfish 18 (single-thread WASM), depth 18, one line. Evals are in pawns, from the student's side (White), after the reply shown. Shares are Lichess blitz, rapid and classical games, pulled through the app's `/api/lichess-explorer` proxy:
- **lo** = 1000–1400
- **hi** = 1600–2000

**Not done yet** (owed when the lists are built by hand):
- A theory check against published sources.
- A `proofCut` ledger at the quiet end of each line. I used material counted along 14–20 plies of the engine line instead.
- The narration.

Raw results are in `/tmp/claude-0/-home-user-chess-academy-pro/61fdf752-44c7-57cb-be1e-44a85a8d5754/scratchpad/f04/`: `verify-{bishop,jobava,jobava-b,extra,extra2,extra3}.json` and `explorer-cache.json`.

## 1. Corrections to the brief (measured)

1. **The first gem loses.** In 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Bxf7+? Kxf7 5.Ng5+, Black answers 5...Qxg5! (lo 77.8% / hi 87.9%) and White is −5.06. The e7 square is empty, so the queen reaches g5, and nothing guards g5. Even after the line the brief gives, 5...Ke8? (14.4/7.0%) 6.Qxg4, White is only +2.03 — a pawn. Under F04 this is a PATTERN with conditions, not a trap (see P1 in §5).
2. **"Bishop's Opening: zero gems" is true only by opening id.** `getPunishGemsForOpening` filters on the id (punishGems.ts:107-110), and `gemTrapChoices('bishops-opening')` returns `[]` (gemTrapMenu.test.ts:40). But 62 mined gems sit on positions reachable in Bishop's move orders, 25 of them weapon-tier. The live lanes are keyed by position (gemCrushLines.ts:116-139), so they would already fire there. The Jobava has 0 gems by id and only 1 by transposition, and that one is not a weapon.
3. **The gem bar changed.** The code bar is now `TRAP_BAR_CP = 300` (punishGems.ts:66-70): 69 of 389 gems are weapons (344 mined + 45 gambit), all 69 are narrated, across 36 openings. But 20 of those 69 end their stored line with less than 3 points of material (an exchange or two pawns). So "≥ 300cp" and F04's "at least a piece" still disagree on 29% of them.
4. **The unlock ladder is no longer the blocker.** `areWeaponsUnlocked` returns true (wlppLadder.ts:62-64). Today a gem can be heard only from the opening page of those 36 openings: the gem's Watch or Learn, or its locked Play line (OpeningPlayMode.tsx:435). It never comes up in Learn's live game (see G11).
5. **The Jobava's hand-written "traps" are not traps.** There are 5 "Weapon:" lessons in `src/data/lessons/pro<RC>JobavaTrapLessons.ts` (`<RC>` stands for the reference coach's name). None wins material:
   - Four end level on material.
   - The fifth (Bd6) stops mid-exchange (Bxd6 is played but ...Qxd6 is not), so it is level too.
   - The first one is a 3.e4 French line, not the Jobava. It marks the main-line 4...Nf6 as "??" and names a top grandmaster with three ratings (:33).
   - :36 says "exf6 closes Black's bishop diagonal". There is no legal exf6 there (Black's e-pawn is on e6), and the main recapture, ...Qxf6, is never mentioned.
6. **Across all the hand-written trap lessons, few clear the bar.** Of the 57 lessons my parser could read in 16 `*TrapLessons.ts` files (the RULEBOOK says 17), only 18 end in mate or a piece won.

## 2. Our trap systems (each defines "trap" its own way)

| # | System | Bar | Reads / writes |
|---|---|---|---|
| 1 | Mined + gambit gems (punish-gems.json, gambit-punish-gems.json → punishGems.ts:66-100) | confirmed ≥ 300cp; known slip = confirmed or positional (:78-86) | Opening page (OpeningDetailPage.tsx:1742-1745), chat chips (gemTrapMenu.ts:72-85, coachApi.ts:4485), punish stage (gemPunishLessons.ts:184-209), Learn (findLivePunishment gemCrushLines.ts:747, trapAheadAt :564, teachableSlipAt :167), Review (reviewFullData.ts:990, coachFeatureService.ts:2960), OpeningPlayMode.tsx:435 |
| 2 | 16 hand-written `*TrapLessons.ts` files | `kind:'trap'` set by hand | Opening page named traps (OpeningDetailPage.tsx:907-985) and pro trapLines (:1143+) |
| 3 | repertoire / pro trapLines + trap-line-classifications.json + trap-engine-verification.json | 'trap' ≥ +200cp (trapEngineBacking.test.ts:42-52) | Chat downgrade (coachApi.ts:4392-4408) |
| 4 | openingTrapDetector + positionTrapScan | popular ≥ 40 games, ≤ −200cp (openingTrapDetector.ts:21-31) | Hands an LLM prompt with game counts and points (openingTrapDetector.ts:120-125 → CoachGamePage.tsx:3593-3603, coachService.ts:876, envelope.ts:763) |
| 5 | gemFinder (runs live per lesson, CoachTeachPage.tsx:1059) | +100cp and 2 pawns (gemFinder.ts:50-54); has an engine-only fallback with no human frequency (:79-86) | Bakes gems into the lesson tree |
| 6 | engineDeltaLines.detectEnginePunish | 150cp and 1 pawn (engineDeltaLines.ts:140, :195) | OpeningPlayMode.tsx:445 |
| 7 | openingBlunderService | Lichess puzzle themes 'opening' + a tactic theme (openingBlunderService.ts:19-37, :165-190) | /tactics/opening-traps (App.tsx:667); writes only the puzzle rating (OpeningBlundersPage.tsx:312-319) |
| 8 | openingGenerator punish stage | gems first (:4002), then puzzles found by ECO tag "NOT the opening's trap lines" (:3755-3757) | Coach stage |
| 9 | trapLearning (warn → test → green) | — | Record tag 'missed-opponents-threat' (trapLearning.ts:23); written only from Learn (CoachTeachPage.tsx:9076) |
| 10 | forkTrick | — | `trickSidestepped` is called (positionFacts.ts:896/900, learnBoardTeaching.ts:796, reviewFullData.ts:1111). `forkTrickFor` (:81) has no caller of its own, so the student's own fork trick is never said |

- **The parity test covers only one pair.** `trapBarParity.test.ts` checks that #1 agrees with the audit helper; nothing else is held to the bar.
- **Engine reads are separate (against D7).** #4, #5 and #6 each make their own engine reads.

## 3. How the reference coach teaches traps

**Setting a trap: only with a move that is sound anyway.**
- "It makes a perfectly sound theoretical move while quietly laying a snare" (2444, vc-HAMhInc37gI-8; also 4579).
- "the quiet c3 first. It looks like nothing, but it lays a trap" (62).
- "the best defensive moves both improve your position and set a trap" (343).
- Bc4 against the Philidor "sets an immediate trap" (1181).

**He refuses gimmicks.**
- "I don't want to make gimmicky trap-setting moves unless you're losing" (4517, vc-_X7t6o3o6JM-21).
- On trying to trap a bishop by overplaying the queenside: that is playing "for gimmicks" (2960).

**Patterns come with their conditions.**
- "The precondition is a bishop on c4" for the centre fork trick (6631-6634).
- Queens facing each other, kings uncastled, the enemy queen guarded only by its king: then the Bxf7+ deflection works (7150).

**When the opponent walks in, he names it and plays the refutation, including the simplest one.**
- "There it is … a Noah's Ark trap attempt … you can just take on b5 … And there's a direct refutation — the bishop to d5!" (2527).
- "And the trap springs — a knight to b5 … strong players walk right into it" (6157), then "don't overthink it" (6158), then castle long with check (6159).

**He credits a correct defence.**
- "Black finds the correct reply" (63).
- "a good way to sidestep the traps" (118).

**Avoiding a trap: the tempting move, why it is what they want, then the move that does the same job safely.**
- The tempting Bc3 "is exactly what Black wants" (5346); Nc3 instead: "same square, but no pin" (5347).
- "not the more natural square, which would walk into a fork" (5077).
- "don't take the bait" (5078).
- "two obvious candidate moves both fail" (7133-7134).
- "grabbing the offered pawn is a blunder" (4319).

**Each trap becomes a rule the student keeps.**
- "never lean on a pin alone to keep your queen safe" (3117).
- "back up to the last move where you had a choice" (3219).

**How often, in words, never numbers.**
- "strong players walk right into it", "a trap a lot of beginners miss" (2913).

## 4. Gaps

Each gap gives what he teaches, what we say (tape quote or template), the computer that should produce it, and the F01 verb.

**G1. Saying that the student's move sets a trap.**
- **He:** 62, 2444, 343, 6157.
- **We:** nothing. In three Learn games no gem or trapAhead lane spoke at all (learn5.log:76).
- **Computer:** the data exists. The gem index is keyed by position (gemCrushLines.ts:116-139), and `trapAheadAt` (:564) works for either side to move. But its only Learn caller returns null unless the student is to move (learnBoardTeaching.ts:541). MISSING: a "trap set" lane that runs after the student's move, and a `setup` field in the library so bait moves can be stored (Légal's Nxe5, the Jobava's Nb5).
- **Verb:** PLAN + CONSEQUENCES.

**G2. The opponent walks in: name it, show the refutation, say why.**
- **He:** 2527, 6157-6158.
- **We:** "That's a known trap at club level. Hold on — your opponent just slipped. There is a punish right here. Can you find it?" (gemCrushLines.ts:801-802 + :737). After the student's move: "That's the punish. …" or "That was the chance — …" (:942-943). Never heard on any tape.
- **Computer:** exists (findLivePunishment :747, gemResolution :928). Missing: the pattern name and the mechanism. Also, every student is asked, while F05 limits questions to a long-standing weakness (D3).
- **Verb:** IDENTIFY + CONSEQUENCES.

**G3. Name the trap or pattern (V10).**
- **He:** "a Noah's Ark trap attempt" (2527); "the center fork trick" (6631).
- **We:**
  - "after Bg4, punish with Bxf7+" (chat chips, coachApi.ts:4388-4391)
  - "Punish X with Y" (punishGems.ts:252)
  - "If White tries X here — natural-looking, but a mistake — Black crushes with Y, winning a piece." (gemCrushLines.ts:409)
- **Computer:** MISSING. `PunishGem` has no name or motif field (punishGems.ts:17-40).
- **Verb:** RECOGNIZE.

**G4. Pattern taught with its conditions (F04).**
- **He:** 6631, 7150.
- **We:** the pattern is named only when the engine's best move is the sacrifice, and only for Bxh7+ (greekGift, moveInsight.ts:668-676). No conditions, no failing case. The brief's first gem is exactly that failing case.
- **Computer:** MISSING `sacConditions`: who covers the landing square and what guards the target, from `chess.attackers` plus `proofCut`.
- **Verb:** KNOWLEDGE + RECOGNIZE.

**G5. A pin that breaks with tempo (brief item 7).**
- **He:** 3117; Légal's mate itself.
- **We:** "Remember — a pin freezes the piece in front: it can't move without exposing the more valuable piece behind it, so it can be piled on." (learn5.log:31). Said with no exception.
- **Computer:** `isRealPin` (pinGeometry.ts:135-165) has no test for the pinned piece leaving with check, a bigger threat or a discovery, nor for whether it lands safely. That second part is what kills the first gem.
- **Verb:** KNOWLEDGE.

**G6. An unsound sacrifice explained right after it is played (S12).**
- **He:** 3219, 2960.
- **We:** In Learn, nothing. In opening Watch: "Bxf7+? An unsound sacrifice … Black has everything covered — there is no real follow-up." (punishGemNarration.ts:3457). It names no failed condition.
- **Computer:** MISSING. Needs G4 plus one shared engine read.
- **Verb:** CONSEQUENCES.

**G7. Warn with the mechanism and the safe alternative.**
- **He:** 5346-5347, 5077, 7133-7134, 4319.
- **We:** "Careful here: {move} looks natural, and club players sometimes play it — but it walks into a known trap." (learnBoardTeaching.ts:573). It also draws every move of the punishment as arrows (:553-568) while the words name none of them (G8.5: no marks without words).
- **Computer:** `trapAheadAt` and `trapSpeaks` exist. Missing: the mechanism clause (from the tactic detector on 

