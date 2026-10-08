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
- `countMethod` deliberately stays silent when the raw count and the pin-aware count disagree (`countMethod.ts:5-7`) — which is exactly this case.

### 11. The piece that only looks loose — IDENTIFY
**He teaches:**
- Explain why a piece that looks loose cannot be taken (TB:683).

**We say:**
- On G1 7...O-O-O: "That left your knight hanging." (rev-g1:19).
- Castling had just pinned the d5 pawn to the queen (dxc6 Rxd1+). The piece really hanging was the bishop (52-errors #12).

**The computer:**
- The turning-point cause uses `findHangingBySee` (`positionReadingService.ts:361`), which treats every legal capture as real and so ignores a pin to the queen (probe: the cause comes out as "hung:n", the knight).
- `heldByTactic` and `takeTheSting` (`speedRunReads.ts:162`, `:400`) cover this idea, but only Learn reaches them. PARTIAL.

### 12. Check the queen's exits before the grab; see the net being built — PREVENT (habit)
**He teaches:**
- Safety checks before grabbing material: list the piece's exits (TB:716, teach.md:592).
- Trapping a queen by covering its escape squares (TB:634).
- Crediting the opponent's good defence (TB:882).

**We say:**
- On 21...Qxa2: "Your queen on a2 pins their bishop on c2 against their queen on e2 — you saw this idea on move 4. The plan changes here — now it's to get your passed pawn on a7 promoting…" (rev-g2:36).

**The board:**
- After Qxa2 the queen had three safe exits: a5, d5, and taking on c2.
- 22.Nb3 covered a5, blocked the d5 diagonal, and opened Qe2's guard of c2. One exit (a4) was left, and the review said nothing.
- After 23.Ra1, no exits. Then the trap is announced four ways (rev-g2:37).

**The computer:**
- `findTrappedPieces` (`tacticsDetector.ts:451`) only sees a piece once it is attacked (`:469`).
- `noRetreat` (`moveInsight.ts:957`) only covers pawn pushes.
- **MISSING:** an exit count for the grabbing piece.

### 13. Desperado: the doomed piece takes the most it can — KNOWLEDGE (golden nugget)
**He teaches:**
- TB:473.

**We say:**
- On 23...Re5: "…Your rook on e5 now eyes their knight on e4, fights for d5." (rev-g2:38).
- On 24...Rd5: "Your rook to d5 takes the open d-file, where the rook belongs…" (rev-g2:40).
- Both times the engine's move was to cash the trapped queen for a rook (23...Qxa1; 24...Qb2 then …Qxb1).

**The computer:**
- **MISSING.** The only mention in code is a comment at `exchangeLedger.ts:419`.

### 14. Grade the opponent's blunder with its board reason (22.Qe4??) — IDENTIFY
**He teaches:**
- Grade their move and punish it; take what they left (TB:1000, :1002, :753).

**We say:**
- "Their queen on e4 now eyes your rook on e8… Their plan is taking shape: getting the bishop to g7…" (rev-g1:47).
- "You took on e4 — that was their queen." (rev-g1:48).
- The fact that the queen walked onto a square the d5 pawn covers is never said.

**The computer:**
- The student-side "That wins…" line (`coachFeatureService.ts:2023`) needs the played move to be the engine's (the engine had Rxe4, `:2006`).
- `buildOpponentMoveTeaching` only reads the student's pieces (`reviewOpponentCommentary.ts:73`). PARTIAL.

### 15. "Again": name the repeated mistake — RECOGNIZE
**He teaches:**
- Repeat on purpose, shorter each time (TB:856).
- "You met this idea before" (TB:855).

**We say:**
- Callbacks only for the student's pins: "it was the idea from move 4 again" (rev-g1:7); "the same idea as move 4… the same idea as move 17" (rev-g2:31).
- Never for the student's repeated loss of a piece to a pawn (four times in G2).

**The computer:**
- `noteSlip` (`learnBoardTeaching.ts:900`, called by Review at `coachFeatureService.ts:2068`) keys on the first attributed fundamental. 15...Bc5 gets no fundamental because the attribution needs the *engine's* line to take on d4 (`principleAttribution.ts:590-605`), even though the game reply cxd4 did.
- The turning-point tally is per piece (`hung:${piece}`, `turningPoints.ts:144`) and skips every slip once the game is decided (`:33`, `:245`).
- `motifLedger.ts:42-44` tracks motifs, not mistakes.
- **MISSING:** one cause class covering all four losses.

### 16. One thesis per game: the moral — STRATEGIZE
**He teaches:**
- One thesis per game (TB:820).
- The moral: the principle the loser broke (TB:786).
- Trace the result back to its cause (TB:784, :1008).

**We say:**
- "This is the thread of the game — clean chess on both sides, decided by one moment: knight to c6 at move 6." (rev-g2:12). False.
- "The through-line of this game was the open file… controlling the only open file is what decided it" said three times (rev-g2:41, :43, :44). False: the student lost the queen.
- "The game turned at move 22, queen to e4 — it cost more than a piece." (rev-g1:53). The opponent's move, with no reason.

**The computer:**
- Producers exist: `gameThemeClassifier.ts:116`, `reviewFullData.ts:1201/1247`, `teachingSelector.ts:347/360`, `principleVoice.ts:770`. None is keyed on the recurring cause.
- **MISSING:** a thesis built from the recurring cause.

### 17. Think out loud at the decision, don't grade it — CONSEQUENCES (F18 steps 2-5)
**He teaches:**
- Name the candidates, reject each with a short line, then give the move with its reason (TB:814, :635, :643).

**We say:**
- A report template: "You: that was a blunder, costing about two pawns — the stronger move was…" (rev-g1:11, :20, :28, :31; rev-g2:11, :17) and "Your opponent: that was a blunder…" (rev-g1:17, :25, :30, :45).
- Bh5, Bf5 and Bxf3 are never weighed against the natural Nc6.

**The computer:**
- `thinkAloud.ts:226` (with `:145` notYet and `:114` sayLine) exists. Its only caller is `positionFacts.ts:1009`, and Review imports neither.

### 18. Play the line out with whose move is whose, ending on what it saves — CONSEQUENCES
**He teaches:**
- TB:815, :898.

**We say:**
- "Here's how it gets punished from here: h-pawn takes g4, castle queenside, bishop to d3 and knight takes g4 — you come out behind on material, a pawn for a bishop." (rev-g1:11). No owners on any move.
- The "Show me" line ends: "That line still comes out behind, by about a pawn." (rev-g1:61). It never says Bf5 saved a whole bishop.

**The computer:**
- The punishment text is `coachFeatureService.ts:4061`; the "Show me" close is `CoachGameReview.tsx:1672-1682`.
- `thinkAloud.sayLine` already names the owners: "The h-pawn takes g4, you castle long, their bishop to d3, then your knight takes g4, and you come out two pawns down." (probe). But it caps lines at 4 plies and only Learn reaches it.
- **MISSING:** comparing the better line with the move actually played.

### 19. Say the move's purpose, not its reach — PLAN / PREVENT
**He teaches:**
- What a move prepares and what it stops (TB:411, :525, :945-946).

**We say:**
- "Your knight on f6 now fights for e4 and d5." (rev-g1:6).
- "Your queen on b6 now eyes their bishop on b5, fights for d4." (rev-g1:35). That move was a check.
- "Your queen to f4, check takes aim at the center…" (rev-g1:43).

**The computer:**
- "now eyes / fights for" comes from `reviewFullData.ts:1286`.
- `moveIntent.ts:124` exists, but its sole importer is CoachTeachPage.
- `deliberation.moveWhy` (`:334`) reaches Review only as the turning-point fallback (`turningPoints.ts:262`).

### 20. Join the plan to the verdict with a "so"; give a method when lost — STRATEGIZE / PLAN
**He teaches:**
- How to fight on when lost (TB:401, :981).
- The plan as steps tied to the position (TB:423).

**We say:**
- A template plan: "The plan from here is to attack their king stuck on e1… first make sure your OWN king is tucked away, then double both rooks onto the open d-file…" (rev-g2:23).
- Then a verdict that contradicts it: "…you're in trouble… and it isn't enough." (rev-g2:24).

**The computer:**
- `nextPlans.ts:215` (template) and `reviewPositionalAssessment.ts:306` (balance sheet) exist.
- The "behind, keep pieces on and complicate" line exists in Review only for an opponent's trade while ahead (`reviewConcepts.ts:115-124`).
- **MISSING:** the F0c composer that joins verdict to plan.

## What already matches him (keep)
- "Their g3 costs them f3: no pawn of theirs can ever guard it again, and your knight on d4 can jump straight in." (rev-g2:27, `theirMoveCost.ts:84`).
- "Their king to f1 gives up castling — the king has to find safety by hand now." (rev-g2:26, `:126`).
- "The timing of bishop to g4 matters — a move earlier…" (rev-g1:7, `moveTiming.ts:85`).
- The principle with its reason on 1...d5 (rev-g1:2).
- "…bishop to f5 first was the preventive move" (rev-g1:11).
- Turning points ask before they tell (S4).
- **Not testable on these tapes:** why they resigned, and the last chance. Both games stop at 49 plies with no result.

## Latent defects found while comparing
- **Attribution depends on line length.** The ignored-threat read fires on 6...Nc6 with the 8-move line Review stores, but returns nothing with the engine's 10-move line (`principleAttribution.ts:481-491`, `:590-605`). Review is safe today only because stored lines are cut at 8 (`gameAnalysisService.ts:486`, `:595`, `:1974`).
- **A false "undefended" claim.** `principleVoice.ts:363` says "undefended" about 17...Bc3, which Qa5 guards (probe). The same wording appears on the Learn tape (learn5.log:64). This breaks D10.
- **Computed but not spoken.** The opponent-move alarm for 3.Nc3 and 15.c3 and the principle verdict for 6...Nc6 were all computed by the same functions the walk calls, but none reached either tape. The coach-decision rows (D9) should show which gate dropped them.