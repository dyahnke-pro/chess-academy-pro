# How the reference coach teaches — BRIEF (12 readers, 642 distinct teaching acts). Examples and the computer each maps to: teach.md — grep it.

## Readers
### Reader 1
Read voiced-teachings notes 0..749 (750 notes, 49 games; phases 304 opening / 295 middlegame / 151 endgame). The reference coach talks on every move but the volume is tiered: about 200 of 750 notes are under 12 words (a bare narration of a forced or routine move), about 17 are 80+ word lectures (a whole plan or a whole recovery method dumped at one decision point), and the rest are one or two sentences that pair the move with ONE reason. His signature acts, ranked by how often they appear: (1) naming the opening/structure on arrival (~95 notes) and the plan it implies; (2) "not X, but Y, because Z": rejecting the natural or tempting alternative before naming the move (~49 'rather than/instead' notes, ~49 'because/the point'); (3) the drawback or the squares a move abandons (~30); (4) prevention and prophylaxis, stopping a pin, a b5 kick or a lever before it happens (~30); (5) the consequence played as an if-then line (~30 'if they…'); (6) pins, x-rays and batteries (~67 mentions); (7) "first this, then that" move-order reasoning (~35); (8) rule plus its exception (f6 is bad unless it hits something; a rim knight is fine as a layover; you may break a principle only once you know it); (9) targets and weaknesses: the weakness's worth is the defenders it ties down; (10) traps and tricks in the opening (~18), stated as the trap the move sets or sidesteps (the centre-fork trick, Bg4 pin into d4); (11) endgame technique nuggets (attack a pawn from behind, defend a pawn with a pawn, freeze a pawn along its rank, queen against a seventh-rank pawn won by zugzwang, pawn breakthrough, keep checking and the mate arrives); (12) method/habit lines (define the concrete threat before reacting; the three answers to a check; when the king is weak start with captures beside it; re-read the plan after every enemy move; know which decisions matter so you don't burn the clock). Most acts already have a computer: refutedAlternative, deliberation, thinkAloud.notYet, ruleException, theirMoveCost, moveInsight.weakenedBy / theirMoveChanged / pawnHook / fileToOpen, forkTrick, latentDanger, pinGeometry / pinPressure, exchangeLedger / countMethod, recaptureChoice, tempoCount, outpost, planRace, endgamePawnReads, conversionMethod, conceptEngine, zugzwang, queenVsPawn, checkMethod, methodBeat, openingIdentity / openingAnnouncement, theoryDeparture, amateurPlayLookup, speedRunReads. Genuinely MISSING: a prophylaxis computer (what the opponent wants next and the quiet move that removes it, e.g. h3 against Bg4, a4 against b5, Kh2 against Nf4/sac on h3); a move-order computer ("e6 first BECAUSE it opens Bd6, which then guards e5"); a transposition / independent-value computer ("this move has no life of its own, it transposes"); a "what this setup buys you in move-order" computer (one setup against everything); a decision-importance-for-the-clock line (it has criticality numbers but no time-management habit sentence); a self-evaluation exercise ("list the factors, guess the number"); and a weakness-ties-defenders read (pressure on a defended point still pays because the guard can't leave), which exists only as prose in boardConcepts/moveInsight and not as a computed fact. Two things the reference coach does that we must NOT copy: thinking out loud with uncertainty or admitting he missed something (7 notes; F18 says the coach always knows the answer), and narrating his own blitz history or opponents' behaviour ("they pre-moved"). The name never appears in this report.
Rhythm: The opening is dense and personal. Almost every move gets a full clause: the opening's name, what the move prepares or stops, the trap it sets or dodges, and often the sideline the student might face ("the main move is X, but Y is the repu…

### Reader 2
Read notes[750..1499] of public/data/voiced-teachings.json (750 notes, 37 videos; 327 opening / 316 middlegame / 107 endgame). Only 56 carry a `teaches` field, 6 a `plans` field, 0 carry `concepts`, so the teaching lives in the `explains` prose. I sorted it into 34 distinct teaching acts below. Most already have a computer in src/services that could produce them; the real gaps are listed as MISSING.

How the reference coach teaches, in short:
- **Opening moves.** He names the opening or system and says why it exists. He gives the move's job (what it prepares, what it stops), its drawback, and the tempting move with why it fails. He picks a branch at a crossroads, and he warns about the trap around the move (the centre fork trick, Bxf7+ ideas, the stock pattern that fails here).
- **Middlegame.** He reads the structure (chain base, levers, holes, bad bishops). He judges every trade and every recapture, counts attackers against defenders, and scans for loose pieces and x-rays. He says the consequence as a line played out in words, all the way to mate or material. He states the long plan as numbered steps, and keeps referring back to standing plans.
- **Endgame.** King first and centralise, make the passer, simplify when ahead, push rather than defend, and stay alert to counterplay to the end.
- **Habits.** He closes on the habit: "always look at the undefended pieces and x-rays", "catalog their weaknesses", "make every threat meaningful".

Missing computers, in priority order:
1. Pin broken with tempo: the pinned piece leaves with check (notes 1040, 1404). This matches brief item 7.
2. The stock pattern that fails here: the familiar tactic that loses because of one counter-move (1027-1031).
3. A threat must be meaningful, not just hit the queen (1396).
4. Delay committing a piece until the opponent shows where theirs go (1113).
5. Opposite-side castling: attack with pieces, and pawn storms are often overrated (879-881, 1434).
6. The hook pawn a storm opens against (1434-1436).
7. A piece is only truly safe when a pawn defends it (1313).
8. Give up the exchange to keep the piece that delivers the attack (1146).
9. Fix the enemy pawns on your bishop's colour (1126).
10. Pressure piled on a point forces resources there, with a standing sacrifice threat (1133).
11. "Top priority" framing: save the vulnerable piece before anything else (1492).
12. One setup against every system: let them declare (1050, 1041).
13. Opening history, like when a line first appeared (1245). openingIdentity.ts gives purpose, not history.
14. King safe in a closed centre, so no need to castle (1087, 1134, 1447). This is the inverse of the central-king-danger read.

Rule flags for David:
- **F0d.** The notes are full of first-person career claims: a line "I played against" a famous GM, "I learned this from" a famous world champion's game, "my old over-the-board line", a well-known course "I learned the move" from. They also name the live opponent several times (notes 862-883), name a player's "question" (1271), and shout out another streamer (1416). If any of this is spliced verbatim it breaks F0d. Two service files are named after the reference coach (danyaBehaviors.ts, danyaTeachingService.ts). They don't ship as text, but they show where his voice was copied.
- **F05.** Questions to the audience ("who can explain why…", 1118) would breach F05 except for a long-standing weakness in the student's record.
- **Rating advice.** "For players in this range…" (1111) must come from the student's record, not their rating.
- **Data.** Many consecutive notes are fragments of one spoken sentence split across plies (791-796, 1033-1039, 1381-1382, 1462-1466). Treat them as one thought, not per-ply prose.
Rhythm: How much he says depends on the moment, not the phase. Measured over notes 750-1499 (`explains` word counts): - **Opening:** median 18 words, mean 30; 76 of 327 notes are 8 words or fewer, 19 are 60 or more. - **Middlegame:** median 18.5, …

### Reader 3
Teaching-track read of public/data/voiced-teachings.json notes[1500..2249]: 750 notes, 40 videos, 348 opening / 276 middlegame / 126 endgame, student White 444 / Black 306. The `concepts` field is empty on every note and `teaches` is filled on only 91, so the teaching sits almost entirely in `explains`. Rough keyword counts over that slice (they overlap): roughly 100 mention tactics or traps, ~89 name an opening or variation, ~83 reject an alternative ("not X", "rather than"), ~81 talk about opening or closing the position, ~69 are if-then consequence lines, ~69 explain a recapture choice, ~60 are about squares, holes or outposts, ~32 are about prevention, ~20 name a drawback, and 162 (about 22%) are bare move calls with no teaching.

The reference coach's core shape, which matches F18: state the move, name its PURPOSE (often two jobs), name the tempting or natural alternative and give the concrete reason it fails, give the consequence as "if they do X, you have Y", and close with a portable rule or habit. Openings are named, placed in history and reputation, compared with what most people at the student's level play, and every opponent deviation gets its punishment (the early f4 met by d5, the bishop-to-c5 sideline met by the centre fork trick, the Bg4 met by a sacrifice on f7). He makes the student THINK by asking the question before answering it ("what are you preparing with a3? ask it that way and the plan appears"; "does anybody see it?"; "how did I spot it? I looked at the drawback of their last move").

Most of these acts have a computer today. The densest are moveInsight.ts, speedRunReads.ts, deliberation.ts, moveIntent.ts, recaptureChoice.ts, ruleException.ts, refutedAlternative.ts, theoryDeparture.ts, openingAnnouncement.ts and forkTrick.ts. Clear MISSING items in this slice:
- the pin that breaks with tempo;
- who benefits when the centre opens or closes (the side with the space or square control wants it closed);
- the half-closed centre that shuts in an enemy fianchetto bishop, and a fianchetto bishop that has left home and cannot return;
- a knight's square count from the centre versus the rim (the "lords over eight squares" nugget);
- "prepare your ANSWER to their break" as the second kind of prophylaxis, beside preventing it;
- plan pacing: prepare slowly, strike fast, take small gains, finish development before running the plan;
- consistency: having made the commitment, follow through with its point;
- trading queens only when it speeds the mate, never when it dissolves the attack;
- giving up a bishop that is lost anyway for the most it can take (desperado);
- reversing a gambit.

Things in this slice the app must NOT copy: the coach admitting he is unsure, sloppy or wrong, playing on gut feel, and talk about the clock or the opponent's psychology (F18: the coach always knows the answer). Name drops, video self-reference and opponent-specific preparation are also out (F0d, and they teach nothing).

Rhythm: in the opening, nearly every move gets a reason, often several, plus the opening's name, its history and the side choices (V19). In the middlegame the coach stays terse until a decision point, then gives one big paragraph weighing candidates, the plan and the tactic (notes 1804, 1940, 2249). The endgame is mostly bare move calls, broken by technique nuggets (avoid stalemate, connected passers, deflecting the rook with one passer to queen the other). Notes 1639-1678 and 1806-1859 are pure move narration for whole games, which is exactly the "description, not teaching" the rulebook cuts. Our tape must not imitate those stretches. Everything above is paraphrased; the coach's name appears nowhere.
Rhythm: Opening, to the hilt: about one to three reasons per move, plus the opening's name and history, which moves are main lines or sidelines, what players at the student's level usually play, and the punishment for each deviation. A single move…

### Reader 4
Read all 750 notes in public/data/voiced-teachings.json [2250..2999] (430 opening, 270 middlegame, 50 endgame; every note's `concepts` array is empty, so the tags gave nothing and the teaching had to be read out of the prose). Repo: /home/user/wt-work. Read-only throughout.

I found 33 distinct teaching acts in this slice. Most of them already have a computer behind them: speedRunReads.ts holds about 22 small checks, plus moveOrder.ts:65, recaptureChoice.ts:103, ruleException.ts:70, falseAlarm.ts:37, bluffDetector.ts:37, countMethod.ts:17, deliberation.ts:144, thinkAloud.ts (notYet :145, opponentHabits :180), concessionBeat.findStudentDrawback :360, theirMoveCost.ts:60, pinGeometry.pinBites :178, endgameTechnique.ts and matePatterns.ts. These all exist. Whether they actually reach the student is the census's question, not this one.

The clear gaps are:
- **Accessible-target test:** whether a weak pawn can actually be reached and attacked. Doubled or isolated pawns are a weakness only if they can be attacked, and a weak SQUARE stays weak after a pawn move covers the PAWN.
- **Exact transposition:** naming a position as a known opening with extra moves thrown in, or the same opening with colours reversed and a move up.
- **Gambit handling:** accept the pawn, then give it back to get ahead in development.
- **Pawn-storm function:** what the storm is for (dislodge the defending knight, open a file, win squares) and how a pawn hook lets it open lines.
- **Mate method:** take away the escape square first, then mate; clear the last defender with check; the promotion square is also the mating square.
- **Endgame conversion:** sacrifice the extra pawn as a decoy to reach a won pawn ending; stop grabbing pawns and convert, because each extra pawn matters less than the last.
- **Two-front principle:** open a second weakness before cashing the first.
- **Rarity of a good move:** "few players under 2000 find this".
- **The pawn thought experiment:** "if you could remove one of your own pawns, which would it be?"

Partial gaps:
- **Purpose/drawback tied to the punishing reply:** "this move leaves the bishop stuck, so the punishing reply is X" (theirMoveCost is close).
- **Pin judged by convenience:** "you can take on that pin whenever you like".
- **Hole timing:** a hole exists, but occupying it now is too early.

**Rhythm.**
- **Opening:** two modes. In plain book lines almost every move gets a short clause naming the move, its purpose and the line's name. Wherever the opponent leaves theory or a choice arises, there are several sentences on one move: what it prepares, what it stops, what it costs, the trap around it, and the reply that punishes it.
- **Middlegame:** short clauses during manoeuvring, then one long monologue at the decision moment. That monologue lists the candidate moves, rules out the tempting ones with their refutations, and plays the chosen line out to the result.
- **Endgame:** terse statements of technique, and the mate is named when it lands.
- **Ending a moment:** he usually closes on the habit or principle that would find the move next time.

This corpus is also an authoring source with a flaw to clean up: some `explains` entries in this slice carry the creator's first person ("my coach's line", "I like", "I didn't see"), named people, and a stray typo ("the onemy whole life"). V1 and F0d say these must never ship as they are.
Rhythm: Opening (57% of the slice): the default is one clause per move: the move, its job, and the line's name. Examples of that shape: c3 in the Ruy is a retreat square plus prep for d4; h3 in the London keeps h2 for the bishop. It goes to the hi…

### Reader 5
Notes 3000–3749 of public/data/voiced-teachings.json come from 43 videos: 394 opening notes, 297 middlegame, 59 endgame. Only 68 have a `teaches` field and 5 have `plans`, so the teaching is in `explains`. The reference coach keeps doing four things. (1) He names what the move IS: the opening, the variation, its reputation and the level it is good for. (2) He weighs the choices out loud: the tempting move, why it fails, then the move he likes. (3) He states consequences as if-then lines with a reason. (4) He gives a portable principle or nugget, and he ranks principles against each other, for example that wrecking the king's shelter matters more than pawn structure in general (3212, 3356). Keyword counts over all 750 notes: king or castling 173, piece geometry (x-ray, diagonal, file, fork, pin, overload, discovery) 131, an evaluation word 70, move order or 'first' 64, if-then consequence 64, opening naming or theory 59, trap or blunder 57, a question put to the student 55, plan or reroute 50, principle 42, drawback 40, practical or human factor 37, structure 35, tempting-then-refuted 24, explicit attacker/defender counting only 5. Most teaching acts already have a computer: refutedAlternative / readWrongTry / buildDeliberation (weighing), findStudentDrawback (drawbacks), latentFork / pinGeometry / detectTactics (geometry and traps), exchangeChain / computeExchangeLedger (counting), kingSafety, tempoCount, planRace, openingIdentity, theoryDeparture, methodBeat (habits). MISSING: the question put to the student, move-order equivalence, 'this piece has done its job, reroute it', the ranking of one principle against another, human factors (clock, opponent level, betting on a slip), endgame conversion technique as one computer, and stating what a quiet opening move prepares, stops or allows (V19). In the opening he often says only the move and the opening's name; the full reasoning arrives at real decision points.
Rhythm: Measured on notes 3000-3749 (median words in `explains`): opening 18 words, middlegame 27, endgame 15. By ply: plies 0-9 median 14; plies 10-29 median 28-30 (the peak, where the first real choices and tactics appear); plies 30-39 median 23…

### Reader 6
Slice read: notes 3750-4499 (750 notes, 50 videos; 365 opening / 265 middlegame / 120 endgame). Every computer citation below was checked by grep in /home/user/wt-work/src/services.

The reference coach teaches through about 26 repeating acts, and nearly all of them hang on one habit. He names the TEMPTING or NATURAL choice, says the concrete reason it fails, then gives the move that works. Examples: "not Bf5, which runs into Nh4"; "not the queen recapture, that loses a tempo"; "not e5, it drops a pawn". He almost never says a move without its point. In the opening he says WHY the line is theory: what the move prepares, what it stops, and what it allows. A small or quiet move gets its hidden job named, for example c6 exists so d4 can come with gain of time later, and a5 stops b4. He states consequences as a chain: "if X then Y, and that is why". He also gives the condition under which the idea works ("only because the bishop on c4 already covers the escape square"; "f6 is safe here because they have no light-squared bishop").

Golden nuggets in this slice:
- a pin is fatal when no pawn defends the pinned piece;
- defend with the least valuable piece;
- bad bishops defend good pawns;
- how far a long-range piece retreats says nothing about whether the move is good;
- whenever a pawn moves, look for the weaknesses it leaves;
- two pieces a knight's distance apart means a fork should light up;
- queen and king on one line means look for a pin;
- a piece defended only once is a target;
- telling temporary from permanent;
- the best-case-scenario test before a pawn storm;
- give the material back when unsure in a gambit.

Most acts already have a computer in src/services. The strongest matches are speedRunReads.ts (keepTension :49, provokes :125, overprotect :209, bestCasePlan :435, rejectedMoveLater :486, forceConcession :512, flexibleFirst :549), refutedAlternative.ts:81, deliberation.ts:144, moveInsight.ts (weakenedBy :523, doubleAttack :83, mechanismContrast :459), latentFork/forkTrick, pinGeometry/pinPressure, outpost, recaptureChoice, positionTransformation, ruleException, kingSafety and endgamePawnReads.

MISSING:
1. A "condition-it-depends-on" computer: why the same move is bad in one position and good in another.
2. A "trapped piece by pawn advance" live detector. The tag exists only in the classifiers and the puzzle tools; there is no live board computer.
3. "Induce a move you want": a check or attack whose real point is the forced reply that ruins the opponent's structure.
4. "Temporary vs permanent" weighing.
5. "Uncastled / stranded king as a standing target, with the plan built round it". detectCentralKingDanger (kingSafety.ts:142) covers part of this.
6. "Defended once = target" (overload by count). Partly covered in speedRunReads, but there is no named computer.
7. "Retreat is not passive" (long-range piece keeps its line).
8. "Least valuable defender" as a teaching fact. It exists only in the capture-order lines of thinkingExchangeChain.ts:191.
9. "Give the material back" in gambits.

Negative examples worth logging as anti-patterns for F01 (description, not teaching):
- Two stretches are pure play-by-play. Notes 4137-4188 (a whole game) and 4404-4454 read like "You develop the knight to c3."
- Some notes carry clock, ego and "I" chatter: 3915, 3925, 4068.
Neither must ever be copied.
Rhythm: OPENING (book moves): one short clause per move that names the move and its single point ("You put the question to the bishop with a6"; "the knight to d2, not c3 — so the c-pawn can come to c3"). The opening is named the moment it appears,…

### Reader 7
Read all 1,500 notes (#4500-#5999; 100 videos; 760 opening / 592 middlegame / 148 endgame; 840 on the student's own move, 660 on the opponent's) end to end, and catalogued 97 distinct teaching acts, each mapped to verified code (file:line): 37 already computed, 48 partial, 11 missing, 1 not a computer by design.

The surprise is how much already exists. speedRunReads.ts holds about 27 of the reference coach's habits, and moveIntent, moveOrder, theirMoveCost, recaptureChoice, falseAlarm, bluffDetector, deliberation, buildRejectedTempting, tradeJudgement, conversionMethod, forkTrick, latentFork and the gem/trap-ahead computers cover most of the rest. The gap is mostly CONDITIONS and COMPARISONS, not whole computers.

OPENING GAPS (F02), highest value first:
1. The defining-move clause. openingIdentity.ts:20 computes `defining` offline, and nothing in src reads it. That is computed and then dropped (G8.5).
2. The opening's bargain in one sentence.
3. A contrast with the sibling opening.
4. On a book departure, the job the book move did that the played move doesn't.
5. Choosing, among close moves, the one that sets a trap, and setting bait.
6. Accepting vs declining a gambit.
7. Move-order safety at the repertoire level.

PATTERN-CONDITION GAPS (F04/S12):
- greekGift (moveInsight.ts:668) recognises the shape but checks none of its conditions.
- findOverloadedPieces skips duties to anything worth under 3 and duties to mating squares (tacticsDetector.ts:699).
- findTrappedPieces only counts a piece that is already attacked (tacticsDetector.ts:459-468), so nets built in advance are invisible (a rook in the corner, a queen after a pawn grab).

MISSING METHOD HABITS:
- don't move the attacked piece on reflex
- the two-pieces-attacked checklist
- which rook, decided by the other rook's job
- picture the board after castling
- which pawn gives real luft
- close the centre to attack on a wing
- whose attack lands first
- wait until they castle before storming
- credit the opponent's good defence
- create an imbalance to win an equal position
- give material back at the right moment
- pawns as anchors for pieces
- bad bishops defend good pawns

CORPUS HAZARDS if notes are voiced verbatim in 'teach me X opening' (S7):
- 169/1500 notes speak in the first person (V1).
- Teaching is credited to named people: #4693, #5555 (F0d).
- #5176 cites the coach's own game (V1).
- 10 notes carry digits or percentages: #4501, #4509, #4832, #5742 (V8).

TWO CODE FLAGS TO CHECK:
- theoryDeparture.ts:62 picks the 'what players at your level play' explorer band by rating (F10?).
- openingIdentity.ts:144 caps famous games at two with .slice(0, 2) (G4.5/V14).

On method: frequencies are regex counts over the slice (precision mixed, ±30%), anchored by the note ids given in each entry.
Rhythm: These figures are measured over all 1,500 notes; they are not estimates. WORDS PER NOTE: median 23, mean 27.6, p10 6, p90 51. By phase the median is 23 in the opening, 25 in the middlegame and 18 in the endgame. - 1-9 words: 21% - 10-24 wo…

### Reader 8
TEACHING TRACK, notes 6000-7476 (1,477 notes, 85 videos), read end to end. 70 distinct teaching acts are catalogued above, each with a paraphrased example, the note id, the kind of moment, a measured or approximate frequency (regex counts, roughly ±15%), and the computer that produces it today with file:line, or MISSING.

COVERAGE. About half of the acts have a working computer, but the computers mostly reach Learn only. Examples: moveIntent, moveOrder and positionCharacter are called only from CoachTeachPage. falseAlarm, ruleException, recaptureChoice, kingAttack, splitPosition, countMethod, checkMethod and safetyHabits are imported only by learnBoardTeaching.ts. The 27 speed-run reads run through thinkAloud.ts:257, and only on the student's turn. Review runs a parallel set (reviewTeachingPoints, reviewFullData, reviewSacrifice). This matches census F18/S1: one coach does not run everywhere.

MISSING, ranked by how often he does it in this slice:
1. Opening knowledge facts: a live 'main line / move to know' on the student's own move; the reason half of the opponent's opening verdict (theirOpeningVerdict at openingAnnouncement.ts:166 gives only a cost in words and is never joined with theirMoveCost.ts:60); transposition and gateway moves; closing timing windows; comparative tempo counts.
2. Pattern trigger rules ('whenever X, look for Y') with their conditions, and sacrifice patterns' when-it-fails half (F04, Q7).
3. Pin judgement rules: proximity, comparing pin strength, the kickable counter-pin, 'a pin removes a defender'.
4. Calculation and safety habits beyond methodBeat's four: start with the simplest move, look one step further, refresh after exchanges, the queen-escape check before grabbing, the in-between-check check before cashing in.
5. Golden-nugget knowledge: material imbalance rules, castling long activates the rook, bad bishops defend good pawns, doubled pawns are not as bad as feared (recaptureChoice.ts:68 always counts doubling as a drawback), the queen exploits a colour complex, self-blocking checks.
6. Attack method: fix the king, clear your own blocker (F0c OBSTACLE / REMOVE IT), choose the hunting piece.
7. Gambit-handling strategy, transfer between openings, and a choice as a statement of intent.
Practical and psychological reads (panic, bluffing, the clock) have no board fact behind them and are not computers.

DEFECTS FOUND (read-only, not fixed):
(a) V1 'we' in spoken templates: speedRunReads.ts:301 ('the … pawn break we talked about'), thinkingAnswerDangerStep.ts:104, thinkingForcingStep.ts:124, thinkingMoveSafetyStep.ts:69 (lesson intros).
(b) Half-built dual-use: forkTrick.ts:81 forkTrickFor computes the centre-fork trick, but only trickSidestepped (:126) is voiced. The student's own trick opportunity is never taught and never recorded as missed (F4/F5).
(c) Built but not wired: tacticalRead.ts:265 computeTacticalRead and :742 speakTemptingTurn have no production caller.
(d) Narrow reach: greekGift (moveInsight.ts:668) is voiced only in hints (useHintSystem.ts:373) and the position-ask direction (moveInsight.ts:109), and only when the engine's best move is the sac.
(e) Shipped voiced corpus, this slice: 82 notes carry the speaker's first person, 13 carry ratings or numbers, and note 6995 credits a recommendation to a named player. If spoken as-is these break V1, V8 and F0d. The seat guard (noteAnchorIntegrity.ts:430-447) does not filter them; I did not trace the full speak path end to end.

Working files: /tmp/claude-0/-home-user-chess-academy-pro/61fdf752-44c7-57cb-be1e-44a85a8d5754/scratchpad/teach-slice-6000-7476-q9x.txt (the slice dump) and teach-tag-q9x.cjs in the same folder (the act tagger behind the counts).
Rhythm: Measured over the slice (1,477 distilled notes from 85 videos; these are paraphrases, so word counts run below his raw speech, which thinkAloud.ts:1-8 measured at about 50 words a move). Median words per note: opening 19 (p90 41), middlega…

### Reader 9
Sources read end to end: RULEBOOK.md, swarm-inputs/questions.md, the duplicate census, the speed-run study (2026-09-24), the 430-game teaching census (2026-09-27-…-teaching-census.md), and the one raw transcript (-4hTQEnwa7s). The transcript is a ~10-minute commented 15+10 game, playing Black against an 1800. Its real moves come from the voiced-corpus notes vc--4hTQEnwa7s-*: 1.b3 e5 2.Bb2 Nc6 3.Nf3 e4 4.Ne5 Qf6 5.Nc4 Qg6 6.Ne3 Nf6 7.g3 d5 8.Bg2 Be6 9.O-O h5 10.h4 O-O-O 11.a4 Bd6 12.Kh2 Ng4+ 13.Nxg4 hxg4 14.Ba3 Be5 15.Ra2 Rxh4+ 16.Kg1, resigns. Every file:line below is under /home/user/wt-work/src/services/.

HOW THE REFERENCE COACH TEACHES: one thread across moves, never isolated facts. The opponent breaks opening principles, so he keeps them. They neglect the queenside, so he attacks before he is fully developed. He pushes the h-pawn at the g3 hook. Their king walks into his bishop's pin, so g3 stops guarding h4. The knight check opens the h-file. He refuses to rush the capture. He takes with check, then explains why they resigned and what the moral is. Every link is joined by a 'so' or a 'but' (F0b).

WHAT OUR CODE DOES WITH HIS GAME. Most single facts already exist; thinkAloud.ts:1-7 says it was measured on this very transcript. I ran a read-only probe of the pure computers on his actual positions: /tmp/claude-0/-home-user-chess-academy-pro/61fdf752-44c7-57cb-be1e-44a85a8d5754/scratchpad/probe/probe.mts, output in probe.log.

HITS:
- 7...d5: the principle with its reason (moveFundamentals.ts:1373).
- 12...Ng4+: 'the h-file opens toward their king' (thinkAloud.ts:114/:71).
- 14...Be5: 'not yet, first the bishop to e5' (thinkAloud.ts:145).
- 9...h5: the g3 hook (moveInsight.ts:782).
- 10.h4: leaves g3 with one guard (moveInsight.ts:573).
- 12.Kh2: the pin on g3 is named (tacticsDetector.ts:803).

MISSES:
- 6.Ne3, the same-piece-again habit: gated silent (tempoCount.ts:69, thinkAloud.ts:187).
- 9...h5: the hook is computed and then dropped for 'finish developing before anything else' (computed at moveInsight.ts:246, dropped by :250-264). That is the opposite of his decision, and h5's reason comes out as 'grabs space'.
- 12.Kh2: the pinned g3 pawn no longer guarding h4 is never said, because the guard count ignores pins (moveInsight.ts:494).
- 13...hxg4: the threat to win the h4 pawn with check is not detected, because a capture threat must win at least 3 points (groundedAnswer.ts:6955).
- 4...Qf6: his apparent self-pin is WARNED as a discovered attack instead of explained as harmless.
- 11.a4: gets no verdict.
- 16.Kg1, the finish: the rook-sacrifice line would be voiced as 'you come out 4 points down' (thinkAloud.ts:93), and the line is suppressed anyway (thinkAloud.ts:281).

MISSING COMPUTERS (new per B6, so they go to David):
- the pinned defender doesn't defend
- the line cuts both ways (dismissing an apparent drawback)
- the plan-level exception: attack early because they are further behind
- naming the opponent's only reply, and pawn-sized forcing threats
- the opponent's two-branch dilemma
- foreshadowing a sacrifice target
- the last chance
- why they resigned: the finishing line with its mating compensation
- a recap of the opponent's violations when the student wins
- candidate squares for one piece, asked as a question
- a sacrifice pattern taught with its conditions
- a pin broken with tempo
- the king-diagonal 'two goals at once' nugget
- setting a trap with a quiet move
- practical and clock play
- inviting the student to explore the position

The deeper gap is F0c. The links exist as about 40 separate lanes (speedRunReads alone has 25 reads, aggregated at speedRunReads.ts:585), and no composer carries one idea across moves the way he does. Two gates (tempoCount.ts:69 and moveInsight.ts:250-264) silence or contradict his key teaching moments in this game.
Rhythm: Measured on the raw transcript. The live commentary is 692 words over his 15 moves, about 46 words a move. The opening block (moves 1-5) runs about 150 words, roughly 30 a move. Routine developing or castling moves take 38-47 words. Decisi…

### Reader 10
TEACHING TRACK: how the reference coach teaches, each act mapped to the code. Read end to end: RULEBOOK.md, questions.md, the duplicate census, 2026-09-29 full review + all of danya-review-2026-09-29/ (parts 0-7, sources, both tapes, the five brainstorm-r1 reports), the 2026-09-16 behaviour audit, every file in data/sources/danielnaroditsky-voice/, plus the 09-17 structures study, 09-24 speedrun target, 09-27 census, 08-23 coverage matrix, docs/naroditsky-insight-catalogue.md, the swarm-input transcript, and the two tape games in public/data/voiced-teachings.json. Every computer named was opened, not recalled.

HOW HE TEACHES, IN ONE PARAGRAPH. A game is one story. He names the opening and says where it stands. He turns the opponent's first concession into the game's single thesis (a target square, a weak pawn, a break) and points later beats back at it. On every move he asks what the opponent's move changed or gave up. He states a principle and then its exception, because the circumstances changed. At the few moments that matter he thinks out loud: the candidates, each rejected with a short line played to where it lands, then the move with its reason. His habits are concrete triggers: count before you take, list the loose pieces, the three answers to a check, take the escape square first, check for an in-between move before recapturing. He converts by a named method chosen by the size of the edge. Afterwards he rewinds to the 2-5 decision points ("if they X, you Y"), prunes the side branches and closes on takeaways. He rarely waits for an answer; his questions are rhetorical and answered in the same breath. He names the move with its reason (supports S3/F05).

CATALOGUE COUNT (73 acts). About 44 built, 16 partial, 13 missing. The breadth is mostly built: the WO-TEACH-GAPS beats, the census computers (moveIntent, moveOrder, theirMoveCost, kingAttack, recaptureChoice, ruleException, falseAlarm, pushOrHold), about 26 reads in speedRunReads.ts, about 20 in moveInsight.ts, and the endgame and concept engines.

What is missing is the chain and the selection, not the facts:
1. No decider has a thesis or relevance term. grep for 'thesis' in coachDecider.ts, factSelector.ts, learnTurnDoor.ts and voicePackage.ts finds nothing. teachingSelector.ts:192/:347 builds a thesis only for Review, phase narration and openings.
2. The think-aloud producer (thinkAloud.ts:226 depthClauses) has one caller, positionFacts.ts:1009. It ranks clauses with a fixed table (positionFacts.ts:1009-1018: not-yet 90, stop-flaw 70, line 60, hole-access 50, speedrun-read 45), not by computed stakes.
3. Its documented step 'what I still owe' (thinkAloud.ts:5) has no clause kind (thinkAloud.ts:192).
4. Review (coachFeatureService.ts:2308) and Tactics (puzzleMethod.ts:41) call decide() directly and never get the think-aloud depth (F18 note confirmed).

MISSING COMPUTERS (bring to David; new per B6):
- A pin that breaks with tempo: pinGeometry.ts:135 isRealPin has no test for check, a bigger threat or a discovery.
- 'A pinned defender is not a defender': computed silently at whyItFailed.ts:134/:374, never spoken.
- A trap pattern taught with its conditions, and the unsound-sacrifice explanation (S12): moveInsight.ts:668 greekGift speaks only when the engine's best move is the sacrifice.
- The king that walks a diagonal and chases two goals at once.
- Honest 'this is murky'.
- Structure transfer by colour flip ('the reversed X, a tempo up'): only 3 hand-mapped structures at positionReadingService.ts:1041-1052.
- The 'if they X, you Y; if Z, then W' fork statement: deleted (opponentIntent.ts:88-96, comment at :93-95); the data still sits in OpponentPlan (:68-85).
- The opponent's concession turned into a named recipe.
- Per-student term memory (V18): learnMemory.ts:277 clears it every game.
- Repeats that shrink across games: the standingRefrains.ts:227 ledger is per game.
- Tree triage in the rewind.
- An opponent clock and speed read.
- A label lexicon.
- A least-valuable-piece advisor.
- Value of a defensive piece.
- 'What they wrongly believe'.
- Practical vs objective outside the pro-rep seam (courseWhyFacts.ts:84).
- Praise for a dodged habit (V6).

DUPLICATES FOUND WHILE MAPPING (F2/R5):
- The recapture reflex has 3 computers: kneeJerk.ts:15 (Learn, learnBoardTeaching.ts:180), moveInsight.ts:642 autopilotRecapture (Puzzles, PuzzleBoard.tsx:652) and safetyHabits.ts:42. The first two answer the same question with different gates.
- 'What their move gave up' has 4: moveInsight.ts:573/:523, theirMoveCost.ts:60, backwardLook.ts:470, concessionBeat.ts:131.
- 'What a move is for' has 2: moveIntent.ts:124 and deliberation.ts:354.
- Piece routes have 2: forwardTeaching.ts:186 and positionReadingService.ts:893.
- Trade verdicts have 2: tradeJudgement.ts:40 and tradeQuality.ts:124.
- The 'behind? complicate' line is written 5 times: reviewConcepts.ts:123, positionCharacter.ts:103, groundedAnswer.ts:1338, principleVoice.ts:437, moveInsight.ts:990.

A CAP THAT CONTRADICTS HIM. He plays a line to where it lands. sayLine is capped at 4 plies (thinkAloud.ts:114 maxPlies = 4), and the line's outcome is judged on 4 plies (thinkAloud.ts:280). This conflicts with S10 and G4.5.

SURFACE GAPS:
- The corpus-rate behaviour registry runs on Learn only: src/services/danyaBehaviors.ts:888, called once at CoachTeachPage.tsx:8726.
- mastersPlanRead is a Learn-only lane (computerRoles.ts:46).
- A real-game citation reaches Review (reviewStoryGame.ts:134) and opening identity (openingIdentity.ts:144). Learn and the lessons never reach for one.

DATA CONFIRMS F02. 48% of his beats are in the opening, and the densest, longest stretch is moves 7-12, where the thesis and the break are declared.

CAVEAT. The voiced corpus is our LLM rewrite of his structure, so the rhythm numbers measure his structure, not his words.
Rhythm: Measured on public/data/voiced-teachings.json (7,477 beats; 360 games with at least 5 in-game beats, cut at the first ply reset where the rewind starts). LENGTH. A spoken beat is short: median 20 words (p25 10, p75 31, p90 46, p99 110). DE…

### Reader 11
Read notes[0..186] of public/data/voiced-teachings.json: 8 games, 187 notes (87 opening, 86 middlegame, 14 endgame; 102 on the student's move, 85 on the opponent's). Below, n# means the index into notes[]. I catalogued 70 teaching acts and mapped each one to src/services with file:line. Seven things the coarse census missed:

1) Computers that exist but are gated so the reference coach's own examples don't fire. tempoCount needs the student to have a development lead (tempoCount.ts:69); at n7 they had 1 minor out against 2, so it stays silent. opponentHabits needs at least 2 minors at home (thinkAloud.ts:187). ruleException's pawn-in-front-of-the-king exception needs a castled king, and its early-queen exception needs the queen to hit something (ruleException.ts:115, :124), which misses n47 and n121. moveTiming ignores costs under 2 points (moveTiming.ts:33). trappedOnBoard looks at rooks and queens only (reviewTeachingPoints.ts:812). bluffDetector skips pawn lunges (bluffDetector.ts:43). findXrays needs a friendly blocker and a more valuable target (positionReadingService.ts:851, :860). isRealPin rejects a piece shielding an equal piece (pinGeometry.ts:146). retreatKeepsBreak misses a pawn double-step through the vacated square (speedRunReads.ts:429). deliberation only weighs alternatives proven by a material or line loss (deliberation.ts:260, :278), and most of the reference coach's alternatives fail for positional reasons.

2) Computers that only work for one seat or one tense. noRetreat and heavyTiedDown can read either side but are called only on the student's own pieces (moveInsight.ts:287, :288). findConcession runs only on moves already played (backwardLook.ts:180, :305), never on the tempting candidate. refutedAlternative only covers the student's popular alternative (refutedAlternativeCore.ts:87). payoffFor closes a promise only on the student's own move, within 16 plies (learnBoardTeaching.ts:897, :917). The reference coach's callbacks fire on the opponent's move, and one comes 20 plies later (n38 to n55).

3) One computer gives a provably wrong plan. The closed-centre template (positionReadingService.ts:1087-1094) tells the student "you break on the queenside with c5". In game 4 after 11.Be3, both b6 and d6 attack c5 (checked with chess.js), and the reference coach teaches the opposite wing (n84-85).

4) Two facts are computed and then thrown away. walkForcedSequence (onlyMoveSequence.ts:57) has no production importer. structureSignature.lockedCenter (boardStructure.ts:303) has no reader. These are exactly the facts behind his "it holds to a perpetual" (n95) and "in a locked centre the move order stops mattering" (n79).

5) Teaching families with no computer at all in this slice:
- a flag for strategic decisions, plus weighing candidates by positional reasons;
- forward chains of consequences for a plan move;
- choosing the pawn structure, and choosing the wing;
- a teaser now with the reveal on the opponent's move;
- the common small slip at a position (between F04's trap bar and silence);
- king-hunt technique;
- "prefer the simpler win";
- "this is only safe because of that earlier move".

6) Defects in the corpus itself (D10/V1).
- 10 notes (n95, 100, 103, 106, 107, 109, 110, 111, 115, 139) speak in the first person or say "let's". They pass src/data/perspectiveVoice.test.ts: it bans only we/our/us (:28), exempts "let's" (:26-27), and still allows "I/my" (:10-12), which contradicts RULEBOOK V1/V2.
- vc--PSQS88VdZU-9 credits White's 5.Nxd4 to Black.
- vc--FRuDd_oXz4-2 and -8 recast the reference coach's own repertoire history as the student's.
- vc--9fPYlSEkJ0-30 says the f4 bishop cannot retreat, but Be3 is legal (chess.js).
- vc--rqPeGKVPbA-8 says "Ng2" for a bishop fianchetto.

7) Other sessions were editing the working tree during this read (learnBoardTeaching.ts, gemCrushLines.ts and reviewFullData.ts were modified). I re-checked the cited lines in those files at the end.
Rhythm: He comments on every move. - 31 of the 187 notes cover two or more plies as one unit, usually a capture with its recapture or a move with the obvious reply. - In one fast game, 13 quiet plies become a single sentence (n102). Length per not…

### Reader 12
Close second reading of voiced-teachings.json notes[187..373]: 187 notes from 8 videos (KID fianchetto game, Najdorf lecture, Italian Bb4+/Nxe4 line, Rossolimo with dxc6, Scotch, a deliberate knight-sacrifice defence lesson, an early-Qh5 game, plus the tail of an English game). The insight catalogue had already mined part of this slice (it read 0ipLPOAN_m8 as game 8; its A1 and A12 entries come from 1PI3 and 1671), and four built computers cite these notes in their headers: moveTiming.ts:1 (#310), moveContrast.ts:1 (#312), recaptureChoice.ts:2 (the dxc6 idea), and the census build status (the Kh1-prepares-f4 move from 1PI3). I catalogued 77 distinct acts. About 18 have no computer and no entry in the catalogue, census or speedrun-target doc (grep-checked).

NEW acts with no computer:
- a counterfactual pattern: 'if their queen stood here, the knight jump would fork' (#284)
- their good move's future drawback: the knight is left with no home after their own e4 (#203)
- their piece placement hands you a tempo later: the queen on f6 invites a knight to d5 (#342)
- a threat met by making it cost them: h3, so if they play the skewer anyway you take the other bishop (#363). threatAnswer.ts:7-13 has no such class.
- the quiet strengthening move is the real danger (#371)
- their move made your break possible (#289). theirMoveChanged (moveInsight.ts:573) and readTiming (moveTiming.ts:47) miss this.
- material arithmetic toward level: a piece is worth three pawns (#349-350)
- a trade that thins their attack helps the defender (#361)
- a numbered argument carried across plies (#264-266)
- temporary vs permanent drawback (#302)
- a two-sided ledger between pieces (#309)
- a modest square justified by its duties (#290-291)
- the best defence both improves and sets a trap (#343)
- a pin that only looks like a pin. pinGeometry.ts:135 decides it, but nothing says it (#196).
- surprise value of a sound but rarely known move (#278)
- an indirectly defended pawn (#216). takeTheSting (speedRunReads.ts:400) and heldByTactic (:162) both skip pawns.
- the drawback → condition → remedy composite (#295). The pieces exist; no composer joins them.

Conflicts and decisions for David (B6):
1. #361 conflicts with code. 'Behind → keep pieces on, every trade helps them' is stated unconditionally in 5 places: moveInsight.ts:1012, tradeJudgement.ts:78, positionCharacter.ts:103, principleVoice.ts:437, reviewConcepts.ts:123. tradeJudgement reads only trades the student starts and ranks 'behind' (:78) before 'attacker-gone' (:91). In #361's situation that is false teaching risk.
2. Repertoire advice is stripped. openingGenerator.ts:2246 strips 'easy to learn' as filler (V4), yet learnability advice is a real act of the reference coach (#195, #270, #330; the census counts about 250 such lines).
3. Rhetorical questions vs F05. All 7 questions in the slice are rhetorical and answered by the coach within one ply. F05 should be read as governing blocking asks only. The only question device in code is methodBeat.ts:145/309.
4. V8 vs material arithmetic. Is 'a piece is worth three pawns' a forbidden number?

Compliance finding (verified): 16 of 187 slice notes, and 679 of 7,477 in the whole corpus, keep the reference coach's first person (I/my/me). That breaks V1 and F0d. The perspective gate scans this corpus (src/data/perspectiveVoice.test.ts:69) but bans only we/our/us (:28) and explicitly allows I/my (:11-12). The notes are spoken in 'teach me X opening' and chat (S6/S7).

Caveats:
- The corpus is distilled. One video keeps only 37% of plies, the phase field mislabels (#219-#230 are tagged endgame with queens on), and no raw transcripts for these 8 videos are on disk.
- Another agent is editing this worktree live (learnBoardTeaching.ts and gemCrushLines.ts are modified). All file:line citations were re-verified in a final pass.
- Scratch outputs: /tmp/claude-0/-home-user-chess-academy-pro/61fdf752-44c7-57cb-be1e-44a85a8d5754/scratchpad/slice.txt (the slice with chess.js context), stats.cjs, rhythm2.cjs, rhythm3.cjs.
Rhythm: Median 17 words per move across 187 notes. 20% are bare move statements of 8 words or fewer (castling, recaptures, opponent shuffles), and 11 notes run 40+ words. Coverage: 82-100% of plies in 6 of 8 videos, so no move passes in silence (V…

## Every distinct teaching act
- Names the opening/structure on arrival and states its identity (what it is famous for, how sound it is, who plays it) — First moves of a game; when a sideline is entered; when the move orde… [NAME]
- States the plan the opening implies right when the setup completes (break, lever, file, piece routes, which wing) — End of the opening (the handoff to the middlegame), often one long pa… [PLAN]
- Rejects the natural/tempting move first, says why it falls short, then gives the move ("not X, Y, because Z") — Any decision point where an obvious alternative exists; especially op… [WEIGH]
- Names the drawback or the squares a pawn move abandons (the cost side of a move) — Pawn pushes, fianchetto trades, recapture choices, any committal move [WARN]
- Prophylaxis: names what the opponent wants next and plays the quiet move that removes it before it lands — Quiet moves in the opening and early middlegame, especially before a … [PREVENT]
- Plays out the consequence as an if-then line, with the opponent's reply in words — After a move that sets a threat or allows a capture; when explaining … [CONSEQUENCE]
- Move order: 'first this, then that', where the first move enables or protects the second — When two good moves exist and the order decides whether a tactic works [SEQUENCE]
- States a principle, then the exception the board earns (the rule and when it bends) — When the played/best move breaks a beginner rule but the engine agree… [PRINCIPLE]
- Develops with tempo / warns against handing the opponent a tempo — Opening development, early queen sorties, pawn pushes near enemy piec… [TEMPO]
- Names the trap the move sets or sidesteps in the opening — Opening plies where a known trick exists; when the opponent's move si… [TRAP]
- Punishes the opponent's principle-breaking with principles: 'they shuffle, you just develop' — When the opponent violates opening principles (early queen, repeated … [PUNISH]
- Target selection: names the weakness and the TWO ways to hit it, and says the weakness's value is the defenders it ties down — Early middlegame, once structures are fixed [IDENTIFY]
- Pins, x-rays and batteries: reads geometry through pieces, including whether a pin really holds — Any ply with a line piece aimed through another piece [GEOMETRY]
- Golden nugget: 'a pin only holds while the pinned piece cannot move with check' / leaves with tempo — When a tactic hinges on a check that releases a pin or opens a file [NUGGET]
- Counting: count attackers vs defenders before fearing a break or making a capture — Tension in the centre; before a capture on a contested square [COUNT]
- Recapture choice: which piece/pawn takes back, and what each recapture keeps or gives up — Every capture with more than one recapture [RECAPTURE]
- Trade judgement: when to trade (ahead in material, killing their best piece) and when to refuse (the recapture activates their worst piece) — Exchange offers; central tension; when ahead or behind in material [TRADE]
- Outposts and piece routes: the square a piece is heading for and the hops to get there — Quiet middlegame maneuvers; retreats that look backward [ROUTE]
- Defines the concrete threat before reacting to a scary-looking move — After an aggressive-looking opponent move [IDENTIFY]
- Critical defence: list every threat, then find the one move that covers both — After winning material in an undeveloped position; when two threats c… [DEFEND]
- Re-evaluates the plan after each enemy move: a plan made three moves ago is not binding — After an opponent move that changes the structure or a key square [REASSESS]
- Wing-attack signals: hooks, opposite castling, opening a rook file toward the king — Opposite-side castling, pawn storms, h-file openings [ATTACK]
- When the enemy king is weak, start the search with captures and checks beside it — After the opponent weakens the king shelter [HABIT]
- Method lines about checks: the three answers to a check, and that the block is the one people forget — When a defence depends on an interposition [METHOD]
- Assesses the opponent's level and the human move: 'at this rating', 'most people play', 'the popular answer here is wrong' — Opening branch points; moments where the human-popular move differs f… [PREDICT]
- Theory context: the main move vs the reputable sideline, and when you've left book — Opening plies at a branch in theory [THEORY]
- Move-order immunity: 'one setup against everything' and what a universal system saves you from learning — Opening choice, first few moves [STRATEGIZE]
- Endgame technique nuggets: attack a pawn from behind, defend a pawn with a pawn, freeze a pawn along its rank, breakthrough sacrifice, rook… — Rook and pawn endings; conversion when ahead [TECHNIQUE]
- Zugzwang and queen-vs-pawn technique: win by making them move — Late endgames with a tempo decision [TECHNIQUE]
- Conversion method when ahead: simplify, bring the last piece in, don't allow counterplay — Decisive advantage reached [CONVERT]
- Recovery method when lost: complicate, keep pieces active, pose a question every move — Student clearly worse [METHOD]
- Sacrifice framed as a purchase: what the material buys (open centre, passer, attack) — Exchange and pawn sacrifices [CONSEQUENCE]
- Trapped/stranded pieces: deny the escape square, then collect — When an enemy piece is short of squares [RECOGNIZE]
- Loose pieces: log every undefended enemy piece as soon as it appears — Right after a trade or reroute leaves a piece unguarded [HABIT]
- Decision importance and the clock: 'this decision doesn't matter, don't spend five minutes' — Low-stakes positions where many moves are fine [HABIT]
- Self-assessment exercise: pause, list the factors giving one side the edge, then guess the evaluation — A calm position after a decisive strategic gain [ASSESS]
- Ugly but right / quiet move that hides the idea — When the best move looks unnatural [REASSURE]
- Thinking out loud with uncertainty / admitting a miss (DO NOT COPY: F18 says the coach always knows) — Live blitz commentary [(excluded)]
- Names the opening or system on arrival and states its reason for existing — The ply the opening, variation or system becomes identifiable [RECOGNIZE]
- Gives the move menu at a crossroads with popularity, then picks one and says why — Opening tabias and branch points [STRATEGIZE]
- States what a move PREPARES and what it STOPS — Nearly every opening move the student side plays [PREVENT]
- Names the drawback of a move, including the opponent's (what it weakens or leaves undefended) — Right after a pawn move, especially a king-side or a chain-committing… [IDENTIFY]
- Rejects the tempting move by showing how it fails — Whenever a natural capture, check or attack exists that is wrong [CONSEQUENCES]
- Move order subtlety: X first, because Y now allows a tempo-gaining reply — When two moves are both wanted and order matters [CONSEQUENCES]
- The trap around the opening move (centre fork trick, the f7 sacrifice with the right move order) — Opening plies where a known trick is live [PREVENT]
- Warns that a stock pattern from puzzles does NOT apply here, and why — When a familiar tactic is available but refuted by one counter-move [RECOGNIZE]
- Pawn-chain theory: hit the base, more levers means the initiative — Closed or locked centre structures in the opening [STRATEGIZE]
- Judges every trade: who it helps and why — Any exchange offer or capture that changes material balance by type [STRATEGIZE]
- Recapture choice: toward the centre, the one that opens a file, keep structure healthy — Every recapture with more than one legal option [STRATEGIZE]
- Counts attackers vs defenders on a target — A contested pawn or piece, before any capture [IDENTIFY]
- Loose-piece taxonomy and the scan habit (undefended, defended once, queen always loose, x-rays) — Middlegame tactical moments; closing habit [IDENTIFY]
- Says the consequence as a line in words, to the end (material or mate) — Critical moments, sacrifices, mating attacks [CONSEQUENCES]
- Plan stated as numbered steps — After the opening resolves into a structure [PLAN]
- One move doing several jobs at once — A strong multi-purpose move [RECOGNIZE]
- A rule and its exception — When the correct move breaks a principle [RECOGNIZE]
- Development lead means open the centre; who benefits from opening it — Central breaks while one side lags in development [STRATEGIZE]
- King safety judgement: safe in a closed centre, castle direction, don't castle on reflex — Castling decisions, closed centres [IDENTIFY]
- Opposite-side castling: attack with pieces, pawn storms are slow, use hooks — Opposite castling or pawn-storm positions [STRATEGIZE]
- Outposts and holes created by pawn moves; the right piece for the hole — After pawn moves that cannot be undone [IDENTIFY]
- Bad piece / good piece; bishop inside vs outside the chain; reroute the piece that finished its job — Piece placement decisions [IDENTIFY]
- Prophylaxis and useful waiting moves — When nothing forcing exists and the opponent has a plan [PREVENT]
- Keep the tension, trade only with a reason; flexible move first — Trade offers in the opening [STRATEGIZE]
- Delay committing a piece until the opponent shows where theirs go — Opening development order [PLAN]
- Grades the opponent's move with its consequence — After a notable opponent move [CONSEQUENCES]
- Pin escaped or broken with tempo — Pins where the pinned piece can move with check or a bigger threat [RECOGNIZE]
- Threats must be meaningful (no queen-attacks-queen reflex) — When an attacking move is available that achieves nothing [IDENTIFY]
- Converting a win: keep developing after winning material, take free material on the way, simplify, push the passer rather than defend it, w… — Clearly winning positions and endgames [STRATEGIZE]
- Endgame king first and passer-creation plan — Transition to and during endgames [PLAN]
- Give up the exchange to keep the attacking piece; fix pawns on your bishop's colour — Attacking middlegames; minor-piece endgames [STRATEGIZE]
- Refers back to a standing plan or weakness already taught — Later plies once a plan or weakness has been named [PLAN]
- Closes on the habit that finds it next time — End of a tactical sequence or key moment [RECOGNIZE]
- Priority framing: the most urgent thing first — When a piece is in danger amid quiet improving options [PLAN]
- Names the opening or variation the moment it arises, with its history, reputation and who plays it — First ply that defines an opening or variation [RECOGNIZE]
- Places a move against practice: main line vs sideline, what most players or the database play, what players at the student's level play — Opening plies, especially at the book-departure ply [RECOGNIZE]
- Names the immediate punishment for an opponent's early deviation from theory (the opening trap or refutation) — The ply right after an opponent's dubious opening move [PREVENT/CONSEQUENCE]
- States a move's PURPOSE: what it prepares and what it stops — Quiet-looking moves, especially opening pawn moves (V19) [PLAN/PREVENT]
- Celebrates a two-jobs move (attacks AND prevents, develops AND chases) — Any move with more than one function [PLAN]
- Names the tempting or knee-jerk move and says concretely why it fails — Decision points where a natural move is wrong [CONSEQUENCE]
- States the consequence as an if-then line, with the reply in words — Explaining why a pawn can be left or why a threat is fake [CONSEQUENCE]
- Explains which piece recaptures and why — Every capture with more than one recapture [IDENTIFY]
- Names the drawback of a move, including the student's own moves and the opponent's — After pawn moves, especially aggressive wing pawns [IDENTIFY]
- Finds a tactic by reading the DRAWBACK of the opponent's last move (method taught) — After an opponent's weakening move that sets up a shot [IDENTIFY (method)]
- Holes, outposts and square control drive the plan; route the right piece to the hole via transit squares — Middlegame once the structure is fixed [PLAN]
- Golden nugget: a knight's value is the squares it controls (centre eight, corner two); knights beat bishops in closed centres — Justifying a knight maneuver or a minor-piece trade [KNOWLEDGE]
- Asks who benefits from opening or closing the centre; keeps it closed when it is your space or your king — Pawn-break decisions [STRATEGIZE]
- Half-closes the centre to entomb an enemy fianchetto bishop; a fianchetto bishop that leaves home may never return — Fianchetto structures [STRATEGIZE]
- Move-order lessons: why this order and not the other — Forcing sequences and opening move orders [CONSEQUENCE]
- Counts attackers vs defenders, then names what complicates the count (a pin, a loose piece) — Before captures on a contested square [KNOWLEDGE/IDENTIFY]
- Rule and its exception — When the best move breaks a beginner rule [KNOWLEDGE]
- Patience: no rush, keep the tension, finish development before running the plan, don't reveal your hand — Quiet middlegame moments with a long-term plan [STRATEGIZE]
- Prophylaxis has two forms: stop their move, or prepare your answer to it — When the opponent's break is coming [PREVENT]
- Self-check habits: after a pawn push, recheck loose pieces; look for intermediate moves before recapturing; check for hanging pawns before … — Closing a move, as the method line [HABIT]
- Castling-side choice from the structure (hooks, the opposite-side race) and castling by hand — Opening-to-middlegame transition [PLAN]
- Sacrifice judgement: no forced mate means no panic; capture the sacrifice correctly; count the attackers available — Defending against unsound sacrifices [CONSEQUENCE]
- Trapped-piece hunt: a pawn thrust takes away a bishop's squares, then a pawn kick collects it — A bishop or knight running short of squares [RECOGNIZE]
- Pin nugget: a pin is broken when the pinned piece moves with tempo, or the pinned defender cannot capture — Pins in the opening and middlegame [KNOWLEDGE]
- Conversion philosophy: up material, consolidate first; don't trade into an endgame when you have a raging attack; trade queens only when it… — Winning positions [STRATEGIZE]
- Opponent's plan read and the threat to answer — After every meaningful opponent move [IDENTIFY]
- Structure-based plan named (minority attack, the weak central complex, half-open file squeeze) — Once pawn structure is set [STRATEGIZE]
- Asks the student the question first, pauses, then answers — Before a tactic or the reveal of a plan [HABIT (method)]
- Endgame technique nuggets — Endgames [KNOWLEDGE]
- Commitment consistency: having made the commitment, carry out its point — Follow-through on a prior plan move [STRATEGIZE]
- Desperado: a piece that is lost anyway takes the most it can on its way out — Tactical melees [KNOWLEDGE]
- Reversing a gambit: give back or offer a pawn to turn the opponent's sacrifice around — Gambit openings [PLAN]
- Names the opening or transposition the moment it happens, then says what the student should do about it (often: nothing changes, keep the s… — move 1-5, when the opponent's move fixes or changes the opening's name [RECOGNIZE]
- Identifies the position as a KNOWN opening with extra moves thrown in, or reversed colours a tempo up, and draws the conclusion from that. — early opening, on an unusual move order [RECOGNIZE]
- States the PURPOSE of a quiet opening move: what it prepares, what retreat square it makes, or which enemy idea it prevents. — quiet developing or pawn moves in the opening [PLAN / PREVENT]
- Names the DRAWBACK of a move (the student's or the opponent's): the piece it locks in, the square or diagonal it gives up, the line it allo… — immediately after a natural-looking move that concedes something [IDENTIFY / CONSEQUE…]
- Turns the opponent's drawback straight into the punishing move, with the chain of reasons. — opponent's early inaccuracy [CONSEQUENCES / PLAN]
- Weighs the tempting alternatives aloud and rules each out with its concrete refutation before naming the right move. — any real choice, especially opening crossroads and attack decisions [CONSEQUENCES / IDEN…]
- MOVE ORDER: X first, because playing Y right now runs into R. This includes the in-between capture that changes which piece wins. — when the natural order fails tactically [PLAN / CONSEQUENCES]
- TIMING: a move that failed a moment ago now works because one thing changed. Strike at the exact moment the opponent weakens a square. — after the opponent's move changes a tactical condition [IDENTIFY]
- COUNT attackers against defenders, and use the count to call a threat empty, or to show that a lost pawn costs the taker their structure. — tension on a central pawn [IDENTIFY (golden nu…]
- DON'T PANIC: a lone intruding piece or a scary jump is not a threat; name why and keep developing. — opponent makes an active-looking but empty move [IDENTIFY / PREVENT]
- An idea is not a threat: don't prevent everything. Ask what the move actually does if allowed. — opponent prepares a pawn advance [STRATEGIZE]
- Judges a PIN: whether it bites (the pinned piece is pawn-protected, so it doesn't); keep it and cash it whenever you like; a retreat that p… — a pin appears or is challenged [RECOGNIZE / IDENTIFY]
- RECAPTURE CHOICE with a reason: which piece takes back and what each option opens or concedes. — every recapture with more than one option [CONSEQUENCES]
- Doubled or isolated pawns judged by ACCESSIBILITY: a weakness only if it can be attacked; doubled pawns can be dynamic. — after a structure-changing capture [IDENTIFY / STRATEGI…]
- WEAK SQUARE vs weak pawn: a pawn move leaves a permanent hole; the hole persists even after the pawn is covered; a hole is not to be occupi… — pawn advance that abandons a square [IDENTIFY / STRATEGI…]
- Names the STOCK PLAN for the structure, and the named piece tour that serves it. — transition from opening to middlegame [PLAN / STRATEGIZE]
- Place pieces for the BREAK you'll make later, not only for the threat you can make now ('playing for your future self'). — slow manoeuvring phases [PLAN]
- Attack the base of a pawn chain, or the DEFENDER of the target (indirect pressure). — closed or chain structures [IDENTIFY / PLAN]
- Explains what a PAWN STORM is for: dislodge the defending knight, open a file, secure squares. Covers the pawn hook, doubling up before ope… — opposite-side castling attacks [PLAN / STRATEGIZE]
- RULE plus EXCEPTION: the textbook rule, why it bends here, and the board fact that justifies it. — student or opponent breaks an opening principle [STRATEGIZE (nugget)]
- Level-anchored knowledge: what players at the student's level usually play here, how rare a good reply is, and what to recommend at that ra… — opponent's common slip; recommendation of a line [RECOGNIZE]
- Names and refutes an OPENING TRAP attempt, or teaches the tactical resource a setup keeps in reserve. — trap-shaped opening positions [RECOGNIZE / PREVENT]
- SAFETY HABIT before committing: before castling, or before any attacking move, check for their fork, their mate threat or their counter-mat… — before a natural move that could hang something [PREVENT (habit)]
- PROPHYLAXIS by asking where the enemy piece wants to go, and taking the square first; includes luft or a bolt-hole made in advance. — quiet moments, especially when ahead [PREVENT]
- TRADE judgement: trade off the opponent's only trump; welcome trades that strip their king's defenders; when ahead, simplify; don't trade a… — exchange decisions [STRATEGIZE]
- PIECE QUALITY: bad bishop ('a big pawn'), rim knight as a target or trapped, a piece with no squares. — a piece is misplaced [IDENTIFY]
- FLEXIBILITY maxims: play the move you'll need anyway first; the most open-ended developing move; complete development before cashing a bank… — opening choices with no forcing line [PLAN]
- Reads the opponent's TENDENCY across moves and acts on it. — after 2+ opponent moves of the same type [IDENTIFY / STRATEGI…]
- Attack-justification principles: open the centre when ahead in development; closing it wastes the lead. A sacrifice is justified when the d… — development lead or king hunt [STRATEGIZE / CONSEQ…]
- GAMBIT handling: accept, then return the pawn for a development lead rather than clinging to material. — facing a gambit [STRATEGIZE]
- MATE METHOD: take the escape square first with a quiet move, then mate; remove the last defender with check; the promotion square can be th… — final phase of an attack [RECOGNIZE (techniqu…]
- ENDGAME CONVERSION technique: rook behind the passer, activate the king, sacrifice the extra pawn as a decoy to reach a won pawn ending, ro… — winning endgames [PLAN (technique)]
- Open a SECOND front before cashing the first weakness, so the defence is overloaded. — technical middlegame with a fixed target [STRATEGIZE]
- Thought experiment to find the plan: imagine removing one of your own pawns and see which would free your pieces, then make that happen. — position where the plan is unclear and the opponent is paralysed [PLAN (habit)]
- Socratic prompt: asks the student the question before answering it. — key opening ideas and critical moments [all (method)]
- Names the opening, the variation and its reputation, and says who the line suits — The ply where the opening or variation becomes identifiable; the firs… [name]
- Marks the first real branch point and asks the student to recall the main line — First divergence in the opening tree [ask]
- Weighs the tempting or natural move, refutes it concretely, then gives the move he prefers — Decision points where the obvious move is wrong; often in the opening… [weigh]
- Names the drawback of a move, including a pawn move: the square it weakens, the pawn left backward, the support it needs — Committal pawn moves and structural decisions, by either side [warn]
- States the consequence as if-then with the reason, often playing out the opponent's best reply — Whenever a threat or capture is in the air; mostly mid-opening into t… [consequence]
- Order of operations: not yet, do this first — Positions where the right idea needs a preparatory move [sequence]
- Geometry: forkable squares, x-rays, a pin that cannot be broken, overload, discovered check, a knight taking squares from the king — Any tactical moment; also latent, before it lands [see]
- Opening trap: the slip, the forced punish, and the specific mechanism it rests on — Early opening, where amateurs actually slip [trap]
- Golden nugget from counting attackers against defenders — Captures and central tension [count]
- Ranks one principle against another (what matters more here) — Strategic choices where two principles pull in opposite directions [prioritize]
- Plan: reroute a piece, keep a square free for it, the thematic placement — After development is complete, in the early middlegame [plan]
- Says when the move order does not matter — Flexible opening development; deviations from a calculated order [reassure]
- Counts development and tempo against wasted queen moves — Early opening, when the opponent moves one piece repeatedly [count]
- Evaluation in words, never numbers, tied to a reason — After the opening resolves; after a tactic lands [evaluate]
- Human and practical framing: the clock, a surprise weapon, betting on a blunder, what players at a level actually do — Sharp choices and sidelines; when the objectively best move and the p… [humanize]
- Says what the move prepares, stops and allows, several points in one breath — Quiet but meaningful moves, opening and early middlegame (V19) [explain]
- Endgame and conversion technique: simplify, push the majority, keep the extra pawn rather than trading it off — When the game is won or clearly better, late middlegame and endgame [convert]
- Alarm habit: name the pattern that should set off the student's warning bell — After a recognisable warning pattern appears [habit]
- Bare move with its name, nothing more — Routine book moves, recaptures, the opponent's expected reply, and mo… [name]
- Names the tempting/natural alternative, says the concrete reason it fails, then gives the move that works — Any decision point where a natural-looking move loses something concr… [PREVENT / CONSEQUEN…]
- States the hidden purpose of a quiet or prep move: what it prepares or what it stops — Small pawn moves and quiet developing moves in the opening and early … [PLAN / PREVENT]
- Explains why the theory is theory: the opening's idea, named, with the principle behind each main-line move — Opening book moves, especially the first time a system appears [RECOGNIZE / STRATEG…]
- Names the opponent's slip as a known, common mistake at this level, then the punishment as a line — The ply the opponent leaves good play in the opening [IDENTIFY / CONSEQUE…]
- Gives the CONDITION that makes a tactic or idea work (or not), naming the one piece or square that decides it — Before or at a tactical shot; when explaining why a familiar sac is p… [IDENTIFY]
- Teaches that the same move changes value when the position changes, and says what changed — When a previously rejected idea becomes good [RECOGNIZE]
- Names a golden-nugget principle in one line, stated as a reusable rule — Right after the move that shows it, as a takeaway [KNOWLEDGE (nugget)]
- Points out a drawback the move created and what it now means (weakened diagonal, hole, loose king) — After a weakening pawn move by either side [IDENTIFY / CONSEQUE…]
- Whenever a pawn advances, it scans for the weaknesses that move left behind — Opponent pawn moves in middlegame [IDENTIFY (habit)]
- Geometry cue: two pieces a knight's distance apart, or queen and king on one line, should set off the fork or pin alarm — When the shape appears, before the tactic is played [RECOGNIZE (geometry)]
- Weighs a pawn-storm/plan with the best-case-scenario test before committing — Before launching a pawn storm or a long plan [PLAN]
- Keep the tension: lets the opponent decide the central capture, explains why that burdens them — Pawn or piece tension in the centre [STRATEGIZE]
- Which recapture: picks the recapture by what it does for development or structure, says why the other is worse — Any recapture choice [PLAN / CONSEQUENCES]
- Transform an advantage: give up one edge (material, pawn mass, a piece back) to cash a lasting one — When up material or holding a static edge, especially vs gambits [STRATEGIZE]
- Temporary vs permanent: a short-term blemish is accepted for a permanent gain — Middlegame plan decisions [STRATEGIZE]
- Induce a move you want: a check or attack whose real point is the forced reply that damages the opponent — Opening/middlegame structural moments [PLAN / PREVENT]
- Outpost + support: plant a piece where no pawn can kick it, anchored by a pawn — Middlegame piece placement [RECOGNIZE / PLAN]
- Target the weak piece or structural target: name the weakest piece, then the plan to pile on it — After structure settles [IDENTIFY / PLAN]
- Piece defended only once / loose piece is a target — Middlegame scan [IDENTIFY]
- Trapped piece: shows how a pawn advance traps a piece with no retreat — When a piece strays to the edge or deep [RECOGNIZE]
- Stranded/uncastled king as the standing target; plan built around keeping it there — Opening-to-middlegame transition [IDENTIFY / STRATEGI…]
- A move that does two jobs is named as such; prefers the dual-purpose move — Choosing between candidate moves [PLAN]
- Retreats aren't passive: a long-range piece keeps its line from further back — Retreat moves by long-range pieces [KNOWLEDGE (nugget)]
- Order of operations: an in-between capture or move first turns a good position into a won one — Tactical sequences with move-order choice [CONSEQUENCES]
- Defensive discipline habit before an aggressive move: check the opponent's checks and tricks first — Before committing moves in sharp positions [PREVENT (habit)]
- Conversion technique: names the order for converting a material lead (simplify, centralise king, open files, make a passed pawn, activate e… — Winning middlegame into endgame [STRATEGIZE / KNOWLE…]
- Names the opening or structure on the move that defines it, and again when a transposition changes the family — The defining opening ply; a later transposition ply [RECOGNIZE (named pa…]
- States the opening's bargain or central question in one sentence — Early opening, once per game, right after the first characteristic mo… [STRATEGIZE]
- Names the system's key square or goal, then justifies later moves by it — When the opponent first challenges the key square; it recurs move aft… [PLAN]
- Contrasts the line with its sibling opening: the one difference that changes the plan — When a familiar setup arises by an unusual order, or the opponent app… [RECOGNIZE (knowledg…]
- Move-order and transposition safety at the repertoire level — Moves 2-6 of anti-lines; whenever a reply could transpose [PREVENT]
- Theory status of each opening move: main road, second-tier, rare, respectable — Each opening ply, especially at deviations [RECOGNIZE]
- Out of book: says what the book move would have done that the played move doesn't, then cashes it in — The departure ply, and the ply where the missing job becomes playable [IDENTIFY / CONSEQUE…]
- The popular club reply, and what it hands you — The opponent's popular-but-inferior opening move [IDENTIFY / CONSEQUE…]
- The only move, or only route to a playable position, in the opening — Forced moments in theory [IDENTIFY]
- Opening trap: the natural slip, the forced punishment, and the picture that makes it work — At the setup ply (invite or warn), and when the opponent walks in [RECOGNIZE / CONSEQU…]
- Avoiding their trap: the tempting move is exactly what they want — When the student's natural move walks into a known trap [PREVENT]
- Chooses, among close moves, the one that sets a trap, or sets bait — When several moves are close and one hands the opponent a natural los… [PLAN (practical)]
- Develop with tempo; when they're behind, every developing move should threaten — Early queen sorties; gambit positions [PLAN (principle)]
- Gambit decisions: accept or decline, and the compensation listed in one breath — On the gambit offer; when weighing a pawn-down position [STRATEGIZE / CONSEQ…]
- A formula for punishing offbeat openings, with honest expectations — The first moves against an offbeat system [STRATEGIZE]
- Two or more reasons for one move, ranked — The student's constructive quiet move [PLAN / PREVENT]
- The drawback of your own good move, stated and weighed — Committal pawn moves; defensive moves with a side effect [CONSEQUENCES]
- After every pawn push, the habit: what did it stop guarding? — Every opponent pawn move, and the student's own [IDENTIFY (habit)]
- What their move cost them, or which of their own pieces it blocked — The opponent's natural-looking opening moves [IDENTIFY / CONSEQUE…]
- What the move prevents (prophylaxis), including taking away a tempo; restrain first, act second — Quiet moves before the opponent's plan lands [PREVENT]
- Take the sting out, rather than physically stopping the attacker — A looming fork or attack where the direct defence is passive [PREVENT (golden nug…]
- Move order: this first, because... — Whenever two good moves conflict in order [PLAN]
- Skip the middleman: is the preparatory move needed at all? — Before preparing a pawn break [PLAN (habit)]
- Flexible move first; play the moves you'll need anyway; let them commit — Early opening or middlegame, while the plan is undecided [PLAN]
- Recapture choice, with its reason — Every recapture with more than one option [CONSEQUENCES]
- Which piece to keep: the one that can use the weakness — Trades near a hole or outpost [STRATEGIZE (knight …]
- In-between moves; never recapture or trade on reflex — Inside exchanges; whenever a recapture looks automatic [RECOGNIZE (habit)]
- Choose the capture that leaves them no in-between move; take the attacked piece first — Several captures are available [CONSEQUENCES]
- First question, what's their threat? Stated as their plan, with the clock it puts on yours — Every opponent move, especially quiet ones [IDENTIFY]
- Reads intent from a move, and deters it — The opponent's committal quiet move [IDENTIFY / PREVENT]
- Don't panic: the threat isn't real, or the activity is fake, with the reason — After aggressive-looking opponent moves [IDENTIFY (golden nu…]
- No trick without development: the lone-piece bluff — Early aggressive sorties [KNOWLEDGE: golden n…]
- Worst-case test: even if they got every move they wanted, could they win it? — Deciding whether to spend a move defending [IDENTIFY (method)]
- Counts attackers against defenders on a square or a break — Before a capture or a pawn break [KNOWLEDGE: golden n…]
- Names the opponent's slip as it happens: the refutation, and what they should have played — The opponent's mistake ply [IDENTIFY / CONSEQUE…]
- Narrates the missed kill (a Miss) — When a side fails to punish [IDENTIFY]
- Credits the opponent's good move or defensive resource — The opponent finds an only move or a strong resource [RECOGNIZE]
- What the opponent keeps doing wrong — After repeated tempo losses [IDENTIFY]
- Lists the loose pieces, then looks for one move that hits two — When a double attack exists [RECOGNIZE (method)]
- End-of-line check: is anything loose when the line stops? — At the end of every calculated line [KNOWLEDGE: golden n…]
- Alignment geometry: a discovery or skewer in waiting, for either side, plus the mental note — The moment an alignment appears [RECOGNIZE / PREVENT…]
- Forkable squares — Piece placement in the opening [RECOGNIZE (geometry)]
- The centre-fork trick: name it and react automatically, or note it's premature — Open games, moves 3-8 [RECOGNIZE (named pa…]
- Pins: judge them, exploit them, and know what a pinned piece cannot do — Whenever a pin appears [RECOGNIZE (geometry)]
- Overloaded defender, including pawns and mate duties — When one defender has two jobs [RECOGNIZE (tactic)]
- Trapped pieces, including the net built before the attack — Pieces wandering to the rim or deep into your camp [RECOGNIZE (geometry)]
- Mating mechanism found by the missing square: deflect its guard — Attacking near the enemy king [RECOGNIZE / CONSEQU…]
- A pattern taught with its conditions (the Greek gift) — When the sacrifice is in the air [RECOGNIZE (named pa…]
- Moves ruled out by a check on a newly opened diagonal — Open games once the e8-h5 or e1-h4 diagonal opens [KNOWLEDGE: golden n…]
- Pawns attack too: pawn forks, a pawn winning a piece — Middlegame tactics [RECOGNIZE]
- Picture the board after castling: the rook changes lines — Before castling, or a queen move next to the castled rook [PREVENT (geometry)]
- Which pawn makes real luft — Making luft against a battery [KNOWLEDGE: golden n…]
- Back rank: a mate threat needs pieces to deliver it; don't create one yourself — After trades, and in endgames [IDENTIFY / PREVENT]
- Pawn breaks: name the break, aim at the base of the chain, say why now — Structure-defining moments [PLAN]
- Hooks: their advanced pawn is your lever — The opponent pushes pawns near their king [PLAN (geometry)]
- Wing-attack principles: castle opposite, don't storm where your own king lives, close the centre to attack on a wing, open it when their ki… — Before launching a storm; when their king can't castle [STRATEGIZE (golden …]
- Meet a flank storm with a central strike — The opponent advances wing pawns [STRATEGIZE (golden …]
- Race assessment: whose attack lands first, so ignore the slower one — Opposite-side castling races [STRATEGIZE]
- Timing: not yet, or now is the moment — Before committal pawn or attacking moves [PLAN]
- Outposts: name it, route to it, say why it's permanent — Holes in the enemy camp [PLAN]
- Can it be kicked? A central piece needs an anchor — An enemy piece centralises [IDENTIFY (golden nu…]
- Pawns as anchors for pieces — Pieces developed without pawn support [KNOWLEDGE: golden n…]
- Use the least valuable piece for the job; the queen is the worst defender — Defensive choices [KNOWLEDGE: golden n…]
- Trade judgement: which trade, and who benefits — Every voluntary trade [STRATEGIZE]
- Trade on your terms: who recaptures decides the structure — Equal trades where the recapture shapes the position [STRATEGIZE / CONSEQ…]
- Keep pieces on, or trade down, according to the situation — Choosing whether to trade while ahead [STRATEGIZE]
- Keep the tension; let them be the one to release it — Central pawn tension [PLAN]
- The threat is stronger than the execution — When grabbing material would relieve the opponent [KNOWLEDGE: golden n…]
- A rule and its exception, stated with the condition — When the student's correct move breaks a beginner rule [KNOWLEDGE: golden n…]
- Accumulation: small edges add up — Quiet manoeuvring positions [STRATEGIZE]
- Re-evaluates when the position transforms — After a structural change or a new offer [STRATEGIZE (method)]
- Plays for a win in an equal position: create an imbalance, avoid drawish lines — Equal positions [STRATEGIZE]
- Material imbalance rules — When an imbalance is created [KNOWLEDGE: golden n…]
- Accept a structural cost for activity — When a concession buys something [STRATEGIZE / CONSEQ…]
- Callback: ties the current move to an earlier move's purpose — When an earlier preparatory move pays off [PLAN (thread across…]
- When winning: simple, healthy moves; material before mate; many good roads — A decisive advantage [STRATEGIZE (techniq…]
- Gives back material at the right moment — Material up but the position is passive [STRATEGIZE (golden …]
- Endgame rules: active king, pawns off your bishop's colour, rook behind the passer, don't walk the king back, fortress, stalemate check, a … — Entering and playing endgames [KNOWLEDGE: techniqu…]
- King hunt: cut off the retreat, and check from a distance — Attacking an exposed king [KNOWLEDGE: technique]
- Traps a queen methodically by covering its escape squares — A queen deep in your camp after a pawn grab [KNOWLEDGE: techniqu…]
- Lists the candidates, tests each, and names the choice with its deciding reason — Any decision of consequence [PLAN (F18 step 2)]
- Names the tempting, natural or popular move, then refutes it with its line — When the natural move isn't the best [CONSEQUENCES (F18 s…]
- Process of elimination for a piece's square — A piece with no obvious square [PLAN (method)]
- Which rook (or which piece): look at what the other one is doing — Rook placement [PLAN (method)]
- Don't move the attacked piece on reflex; look for the counter-blow first — A piece is attacked in the middle of your attack [KNOWLEDGE: golden n…]
- Two pieces attacked: the checklist — A double attack against the student [KNOWLEDGE: techniqu…]
- One-move-itis: ask whether they can simply stop it — A single flashy idea is tempting [PREVENT (habit)]
- Re-reads the board after captures or a flurry of exchanges — After exchange sequences [HABIT]
- Thinks a line through out loud, testing and then rejecting it — Before a decision involving tactics [CONSEQUENCES (F18 s…]
- Asks the student a question, then answers it — Instructive decisions [F05 (teach by quest…]
- Gives an honest verdict with nuance — After the opening, and at transitions [IDENTIFY]
- Weighs a weakness against a list of strengths — A visible flaw in the student's position [STRATEGIZE]
- Cites a master game, crediting the game — Opening identity moments [KNOWLEDGE (credit, …]
- Draws an analogy from another opening — A known idea reappears in a new setting [RECOGNIZE (transfer)]
- Overprotects the linchpin — When one central point carries the structure [PREVENT / STRATEGIZE]
- A centralised piece earns its keep without one specific job — Manoeuvring positions [KNOWLEDGE: golden n…]
- Practical advice: don't spiral, embrace discomfort, play quiet moves against stronger players — After a blunder; when choosing an opening; under time pressure [META]
- [OPENING] Name the opening or variation on the move that makes it true, plus one clause on what kind of game it makes — On the defining ply; refinements come later [RECOGNIZE]
- [OPENING] Say what the defining move or setup is trying to do: what it takes away, what it prepares, which break it aims at — First moves of a named system [PLAN / PREVENT]
- [OPENING] State a move's theory status: the main line, the reputable try, the move you must know, a sideline, dubious — Theory branch points, mostly plies 3-12 [KNOWLEDGE]
- [OPENING] Give a verdict on the opponent's opening move WITH the board reason, then show how to punish it — The ply the opponent leaves book or makes a passive move [IDENTIFY / CONSEQUE…]
- [OPENING] Say what players at the student's level usually play here, and whether that popular move is any good — Popular opening junctions [RECOGNIZE / CONSEQU…]
- [OPENING] Warn about a trap before the natural losing move is played, or point out the trap the student's move sets — At the trap position, before the move [PREVENT / RECOGNIZE]
- [OPENING] Move order: play this first, because the other order transposes into something worse or runs into a tactic — Opening move orders [CONSEQUENCES]
- [OPENING] Transposition and gateway knowledge: same position by either order, a move with no independent value, a reversed opening with an … — Early opening [KNOWLEDGE / RECOGNI…]
- [OPENING] Name the timing window: the break or commitment must happen now or the chance closes — Opening crossroads, early middlegame [PLAN / CONSEQUENCES]
- [OPENING] Count tempi: who spent moves on what, and how to win a tempo — Opening [KNOWLEDGE (arithmet…]
- [OPENING] State an opening principle with the reason it applies on this board — Opening [STRATEGIZE]
- [OPENING] Name the rule, then the reason it bends here (rule and exception) — When the right move breaks a beginner rule [KNOWLEDGE]
- [OPENING] Gambit handling: what the material buys, and the strategy for each side — Gambit openings [STRATEGIZE]
- [OPPONENT] Read what the opponent's move wants: the plan it signals, the next move it prepares — Every opponent move that carries intent [IDENTIFY / PREVENT]
- [OPPONENT] Say what their move changed: which square it stopped guarding, which defender it lifted, what it left loose — Right after the opponent's move [IDENTIFY]
- [OPPONENT] Credit the opponent's strong reply or defensive resource, saying what it does — When the opponent finds a good move [RECOGNIZE]
- [OPPONENT] Don't fear the scary move: the threat is not real, or you can ignore it — After an aggressive-looking enemy move [IDENTIFY (threat as…]
- [OPPONENT] Refute an unsound sacrifice or bluff calmly — After an opponent sac or odd move [CONSEQUENCES]
- [WHY THIS MOVE] List every job the move does (several points on one move) — Quiet, multi-purpose moves, especially in the opening [PLAN / PREVENT]
- [WHY THIS MOVE] Why this square and not the natural one — Development and retreat choices [PLAN]
- [WHY THIS MOVE] Name the drawback of the student's own move honestly — Committal moves [CONSEQUENCES]
- [WHY THIS MOVE] The lasting cost of a pawn push: the squares beside, behind or in front of it go weak — Pawn advances by either side [KNOWLEDGE (nugget)]
- [WHY THIS MOVE] Choose the recapture, and say why — Every recapture choice [CONSEQUENCES]
- [WHY THIS MOVE] Explain the non-move: what the student is deliberately NOT doing yet, and why — Quiet opening and middlegame moments [PLAN]
- [WHY THIS MOVE] Hold the central tension and let them release it, or release it before it closes — Central pawn tension [STRATEGIZE]
- [CHOICES] Weigh candidates out loud, correct yourself, and settle on one — Decision points [CONSEQUENCES (weigh…]
- [CHOICES] The tempting move, and why it fails, with their reply — Whenever a natural capture, check or attack fails [CONSEQUENCES]
- [CHOICES] Several moves are equally good, so don't agonise; this decision doesn't matter — Non-critical choices [STRATEGIZE (practic…]
- [CHOICES] A choice as a statement of intent: the peaceful line or the fighting one — Equal opening choices [STRATEGIZE]
- [CONSEQUENCES] Play the line out in words with their replies, ending on what it achieves; branch when they have two answers — Tactics and theory branches [CONSEQUENCES]
- [CONSEQUENCES] Not yet, first this: insert the forcing or intermediate move before cashing in — Tactical sequences [CONSEQUENCES]
- [CONSEQUENCES] Explain why a piece that looks loose cannot be taken — Pieces that look loose [IDENTIFY]
- [CONSEQUENCES] Strike now or wait: the threat is stronger than its execution, or hit while a weakness is only temporary — Middlegame decisions [STRATEGIZE]
- [THREAT] Spot their threat ('your job is to see it'), then the prophylactic answer — After each threatening opponent move [IDENTIFY / PREVENT]
- [PREVENT] Prophylaxis: this move stops what they want before they get it — Quiet moves [PREVENT]
- [PREVENT] Sidestep the coming pawn fork, or the fork trick, before it lands — Pawn-fork setups [PREVENT]
- [NUGGET] The cheapest defender: defend a pawn with a pawn rather than tying down a piece — Defending pawns [KNOWLEDGE (nugget)]
- [PATTERN] A named tactical pattern taught with its precondition: when it works and the check that tells it apart — Opening tactics [RECOGNIZE (named pa…]
- [PATTERN] Trigger rules: whenever you see X, look for Y — Trigger positions [RECOGNIZE]
- [PATTERN] A sacrifice pattern taught with its conditions: when it works and when it doesn't — Before and at the sacrifice [RECOGNIZE / CONSEQU…]
- [PATTERN] Recognise a mating pattern by name, and the one square or resource that stops it — Mating attacks [RECOGNIZE (named pa…]
- [GEOMETRY] Knight-fork geometry: king and queen a knight's move apart, forkable squares — Middlegame tactics [KNOWLEDGE (geometry)]
- [GEOMETRY] Line alarms: two valuable pieces on one line, x-rays, batteries — Whenever pieces align [KNOWLEDGE (geometry)]
- [GEOMETRY] Self-blocks in mating nets: a checking piece can block its own line — Mating attacks [KNOWLEDGE (geometry)]
- [NUGGET] Rules of thumb for material imbalances — Imbalanced trades [KNOWLEDGE (nugget)]
- [NUGGET] King and queen are the worst defenders; a heavy piece tied to one guard — Overloaded defenders [KNOWLEDGE (nugget)]
- [NUGGET] Count attackers against defenders, weighting by which pieces they are — Exchanges and attacks [KNOWLEDGE (arithmet…]
- [NUGGET] Structure knowledge, including the misconceptions (doubled pawns, bad bishops, the IQP, pawn hooks) — Structural moments [KNOWLEDGE (nugget)]
- [NUGGET] Colour-complex reasoning, and which piece exploits the weak colour — After bishop trades [KNOWLEDGE / STRATEG…]
- [NUGGET] A weakness counts only if the opponent can attack it — Evaluating weaknesses [IDENTIFY (D11)]
- [PLAN] A plan from the structure, said as a sequence of several moves — Middlegame [PLAN]
- [PLAN] Name the focal point the whole battle revolves around — Closed structures, opening battles [STRATEGIZE]
- [PLAN] Remove the square's defender first, then occupy the square — Outpost plans [PLAN (goal → obstac…]
- [PLAN] Plan by destination: where the piece wants to be, and the route — Manoeuvring [PLAN]
- [PLAN] Improve the idle or worst-placed piece; the maintenance move — Quiet middlegame [STRATEGIZE]
- [PLAN] Provoke a commitment or a concession: put the question to a piece — Opening and middlegame [STRATEGIZE]
- [STRATEGY] Trade judgement: trade when ahead (only when it's free), keep pieces when you have space, trade off their best piece, watch whos… — Trade decisions [STRATEGIZE]
- [STRATEGY] Judge a pin: when it matters, whose pin is stronger, how to break it — Pins in opening and middlegame [KNOWLEDGE / STRATEG…]
- [STRATEGY] King safety and castling judgement — Castling decisions [STRATEGIZE / KNOWLE…]
- [ATTACK] Build the attack: bring reserves, lift a rook, use half-open files, open lines once the king is weakened — Attacks [PLAN]
- [ATTACK] Attack method: fix the king first, take its escape squares first, pick the right hunting piece, clear your own blocker — King hunts [PLAN (goal → obstac…]
- [CONVERSION] The method for winning a won game, and the choice between attacking and trading — After winning material [STRATEGIZE / KNOWLE…]
- [ENDGAME] Endgame technique and knowledge: active king, rook on the 7th, giving material back for a won pawn ending, zugzwang, stalemate tr… — Endgames [KNOWLEDGE (techniqu…]
- [METHOD] Calculation habits beyond the forcing scan — Tactical moments [HABIT]
- [METHOD] Safety checks before cashing in or grabbing material — Before captures and simplifications [HABIT / PREVENT]
- [METHOD] Mindset lessons tied to a board moment: don't hurry, don't overpress, keep pressing, admit a plan failed, keep it simple — Turning points [HABIT]
- [THREAD] Call back to an earlier move: the payoff of a preparation — When an earlier move pays off [CONSEQUENCES (acros…]
- [THREAD] Carry an idea across to other openings or the student's earlier games — Familiar structures [RECOGNIZE (transfer)]
- [THREAD] Cite a real master game — Opening [KNOWLEDGE]
- [THREAD] Sum up the position in one judgement, with its reasons — After a sequence changes the position [IDENTIFY]
- [VOICE] Ask a question inside the think-aloud and answer it in the same breath — Mid-explanation [(delivery of F18)]
- [VOICE] A short clause on routine moves (never silent) — Routine plies [(delivery of V11)]
- [VOICE] Imagery and analogy as seasoning — Throughout [(phrasing)]
- [DO NOT COPY] Rule conflicts inside the corpus — Throughout the slice [n/a]
- Name the opening and the kind of game it is — First move the opening is identifiable; refinements held until the ga… [RECOGNIZE (knowledg…]
- The opening's purpose: what the setup provokes, and why — Right after the opponent's defining move [STRATEGIZE / RECOGN…]
- Why each opening move is played: the principle plus its reason — Every quiet opening move; when the student's move kept no rule, the r… [KNOWLEDGE / PLAN]
- Meet an attacked pawn by advancing it with tempo — A developing move hits a central pawn [PLAN / CONSEQUENCE]
- Chase instead of capture — An advanced enemy piece can be taken or harassed with gain of time [PLAN]
- Dismiss your own move's apparent drawback (the line cuts both ways) — Your move seems to walk into a pin or discovered attack that is harml… [RECOGNIZE (geometry)]
- Punish a principle-breaker by keeping the principles yourself — Opponent moves one piece repeatedly or neglects development in the fi… [STRATEGIZE (method)]
- Self-inventory: which opening jobs are still unfinished? — Quiet opening moment with nothing tactical live [PLAN (method)]
- Verdict on the opponent's choice: sound, or creative but unsound — The opponent leaves book, or lunges later with a flank pawn [IDENTIFY]
- Say what their move just changed — Every opponent move, first (F18 step 1) [IDENTIFY]
- What their move cost them structurally — An opponent pawn or king move that leaves a hole, shuts in a bishop o… [IDENTIFY / CONSEQUE…]
- Their king (or a piece) walked into a line — An opponent move lands on the line of your bishop, rook or queen [RECOGNIZE (geometry)]
- A pinned defender is no defender — A piece is guarded only by a piece pinned to the king [RECOGNIZE (golden n…]
- Name the opponent's only serious reply — Your move leaves them one move that holds: the forced king retreat, t… [IDENTIFY / CONSEQUE…]
- What their quiet move is for (it took the sting out of your threat) — An opponent move that threatens nothing [IDENTIFY]
- Their strongest idea and what it would win (the two-step plan) — Every move, before your own idea (every move at 700-level) [PREVENT]
- Flag the decision moment before deciding — A strategic fork (keep developing vs start the attack), not only an e… [STRATEGIZE (method)]
- Weigh two options out loud using a fact about the opponent — A decision point with two reasonable plans [STRATEGIZE]
- The plan-level exception: attack before you're fully developed because they're further behind — Opening or early middlegame, opponent with minors at home and a hook … [STRATEGIZE (rule an…]
- Candidate, the obvious objection, and the answer to it — A forcing candidate that seems to give material [CONSEQUENCE (method)]
- Don't rush the capture: a forcing move first, then take — A capture is available and will still be there after a forcing in-bet… [PLAN (move order)]
- If-then chains that end on what the line achieves — Any move whose point lies two or more plies away [CONSEQUENCE]
- Counterfactual: what if they had answered differently — Review, at the opponent's key replies [CONSEQUENCE]
- The opponent's dilemma: both answers cost something — After a lever or threat with two plausible replies [CONSEQUENCE / STRAT…]
- Foreshadow a target — After castling or a lever, when an enemy pawn will be the sacrifice p… [PLAN]
- The opponent-threat check every move (the hanging check) — Every move, especially at low levels [PREVENT (method)]
- Count attackers against defenders — Before an exchange on a square [KNOWLEDGE (golden n…]
- Take free material, and say why a tempting grab fails — A capture is on the board [IDENTIFY / CONSEQUE…]
- Don't panic: answer unsound aggression with calm development — The opponent lunges, or makes a scary-looking threat that isn't real [STRATEGIZE (method)]
- Bring everything in before the decisive strike — An attack is coming but pieces are still at home [STRATEGIZE (timing)]
- Pawn lever against the castled king (the hook) — Their king is castled behind a pawn that has stepped forward (g3/g6, … [PLAN]
- Move purpose: what it prevents, prepares, or both at once — Quiet moves by either side [PREVENT / PLAN]
- Recapture choice — Two or more ways to take back [PLAN]
- A principle and its exception (one move) — A move breaks a beginner rule, but the board justifies it [KNOWLEDGE]
- The common wrong answer, refuted, including the job it drops — A popular alternative exists at the student's level [CONSEQUENCE]
- When ahead: which way to win, and why that one — Material up or clearly better [STRATEGIZE]
- A plan for one side, and the route a piece takes (the wishlist) — Quiet positions [PLAN]
- Plan against plan — Both sides race for something, or the game revolves around one square [STRATEGIZE]
- Verdict by one clear comparison — The phase changes [IDENTIFY]
- Hidden danger — An alignment or a lone guard that a trade or one move would expose [PREVENT]
- Use the cheapest piece for the job; a heavy piece makes a poor defender — Choosing a defender, or a queen tied to guarding [KNOWLEDGE]
- Close on the habit that finds it next time — After the evidence, at the end of the thought [METHOD]
- Three ways to meet a check — In check with more than one kind of answer, and the king move is not … [METHOD]
- Question the knee-jerk recapture — They captured, and taking straight back is not best [METHOD]
- Split the board into separate battles — Complex positions with play on both wings [METHOD]
- Candidate squares for one piece, asked as a question — Developing a piece that has more than one good square [METHOD]
- Blunder check and visualising before letting go — Before committing a move, especially one that leaves something loose [METHOD]
- Name the pattern, with its invariant the first time — A tactic, mate or technique appears or lands [KNOWLEDGE (named pa…]
- A sacrifice pattern taught with its conditions (when it works vs fails, and the check) — A thematic sac (on f7 or h7) is on the board, sound or not [KNOWLEDGE / PREVENT]
- A pin that breaks with tempo (the illusory pin) — A pinned piece can leave with check, a bigger threat, or a discovery [KNOWLEDGE (golden n…]
- Pile on the pinned piece — You hold a real pin and can add an attacker [KNOWLEDGE]
- Traps: set one with a quiet move, warn of the trap ahead, say the punishment — Opening positions where a natural move at the student's level loses b… [PREVENT / RECOGNIZE]
- Endgame technique and geometry — The endgame types they apply to [KNOWLEDGE (techniqu…]
- Which material can and can't force mate — Lone-king endings [KNOWLEDGE (rules)]
- Push for the win or hold — Better-but-not-won or worse-but-not-lost endings [STRATEGIZE]
- The king walks a diagonal as fast as a straight line, so it can chase two goals — King-and-pawn races [KNOWLEDGE (golden n…]
- Why they resigned: play out the finish, the only defence, and how it fails — Review, at a resignation or an early collapse [CONSEQUENCE]
- The opponent's better move at each error, with its reason — Review, at each opponent error [IDENTIFY]
- Trace the result back to its cause — Review [CONSEQUENCE]
- The last chance — Review: the last ply where the losing side could still hold [IDENTIFY]
- The game's moral: the principle the loser broke — End of the review [STRATEGIZE]
- Credit a real game, or connect to an idea met before — The same idea from an earlier move, the student's own past games, or … [RECOGNIZE (transfer)]
- Transposition — The game reaches a known position by another move order [RECOGNIZE]
- Self-critique: the coach names what its own weaker move gave up — The coach plays a worse move with a nameable drawback (Learn) [IDENTIFY]
- Speed-run habits of thought — Each is earned by its own board condition [METHOD / STRATEGIZE]
- Practical play: the clock, an opponent playing fast, making it hard — Throughout live games [STRATEGIZE]
- Repertoire advice: classical openings first, experiment later — Review or chat, after an offbeat opening [STRATEGIZE (off-boa…]
- Invite the student to explore the position themselves — A rich position at the end of a line or in review [METHOD]
- Names the opening and places it: what it is, how theoretical or sharp it is, what its defining move invites — First identification in the first 1-6 plies; the settled name said on… [RECOGNIZE]
- States the opening's key idea: the break or square everything in the structure aims at — Right after naming the opening, and again as the middlegame begins [PLAN]
- Explains why each opening move is played, as a forward rule the student can reuse — Every opening move, the student's own above all (V19: explained to th… [RECOGNIZE]
- Says what a move prevents and what it prepares ('first X, so that Y'), and counts the jobs when one move does two or three — Quiet or prophylactic moves that look pointless; moves that serve sev… [PREVENT]
- Turns the opponent's opening concession (passive pawn move, same piece twice, undeveloped side) into the game's recipe — The ply the opponent departs from principled play [STRATEGIZE]
- Names the common wrong answer (what most players at this level play here) and refutes it with a short line to what it costs — Opening branch points; any ply where the popular move is a mistake [CONSEQUENCES]
- Warns about a trap before the student walks into it; when the opponent slips, shows the punishing sequence (the gem) — Opening positions where a natural move loses by force (F04: at least … [PREVENT]
- Teaches a sacrifice pattern WITH its conditions (when it works, when it fails, the one check that tells them apart), and explains a temptin… — Bishop-takes-f7/h7, knight-to-g5 type positions, sound or only tempti… [RECOGNIZE]
- The pin that is an illusion: the pinned piece leaves with tempo (check, a bigger threat, a discovery) and the pinning piece hangs — A pin where the pinned piece has a checking or forcing move [RECOGNIZE]
- A pinned defender isn't really defending: the count is said out loud — A king or piece walks into a pin and a guard silently stops counting [IDENTIFY]
- What their move changed: a defender removed, a square permanently weakened, a piece left loose, your plan now blocked — After every opponent move (every move has a drawback) [IDENTIFY]
- What your own move gave up, said only when they can use it — After the student's move, when the reply exploits the vacated square … [CONSEQUENCES]
- Reads the purpose behind the opponent's quiet or odd move: what it stops, what it prepares — Opponent moves that threaten nothing [IDENTIFY]
- Prophylaxis: what they want if it were their move, and the move that takes it away — Before the student's quiet moves [PREVENT]
- States the fork in the road aloud: if they play X you answer Y; if they prefer Z you have W — Before an opponent decision with two or more sensible replies; at ope… [PLAN]
- Names the threat, then what to do about it: take the attacker, step off the line, block, add a guard, or it can wait — The opponent creates a real threat [PREVENT]
- Dissolves a fear: the scary-looking move wins nothing (a bluff), or the real threat can wait because something comes first — The opponent's aggressive-looking move; a real threat the best move i… [IDENTIFY]
- Spots a hidden danger: two of your pieces lined up behind a cheaper one, a pin or skewer one trade away — Before trades that open a line onto your king or queen, especially in… [PREVENT]
- Sees the fork two moves away and the trick a quiet move allows (a centre fork after a sacrificed piece) — Two valuable pieces a knight's jump apart; a slow pawn move that lets… [RECOGNIZE]
- Flags the critical moment and says how many moves still hold — Only one or two moves keep the balance [IDENTIFY]
- Thinks out loud at the decision: names the candidates, rejects each with a short refuting line, then gives the move WITH its reason — The critical moment; his 60-150-word monologues cluster here [CONSEQUENCES]
- Plays the line out in words to where it lands, the opponent's replies named as theirs, ending on what it achieves — Whenever a line is the reason: a tactic, a break, a sacrifice [CONSEQUENCES]
- Not yet, first this: the capture or plan move will keep, so the forcing or preparing move comes first (move order) — A capture is available but an in-between move comes first; a move pla… [PLAN]
- Says when a choice doesn't matter (spend ten seconds), or names the one thing that separates two similar moves — Engine top moves nearly equal; two moves that look alike [IDENTIFY]
- Separates objective from practical: the engine's verdict vs what is hard to play at human speed — Sharp positions where one move holds and many lose; gambits [STRATEGIZE]
- Admits the limit honestly: the position is murky, nobody has worked it out — Off book, an unstable eval, no corpus note [IDENTIFY]
- One thesis per game: a target square, weak pawn or break declared early, with later beats pointed back at it — Declared around moves 7-12 and re-invoked 2-4 times; facts off the th… [STRATEGIZE]
- Callback and payoff: links a later move to its earlier cause, and closes the plan when it lands — An earlier idea pays off; the plan completes [PLAN]
- The position changed, so the plan changes, and it is said out loud (tactical to positional and back; switching targets) — Material changes, a tactic appears, the structure changes, a plan lan… [STRATEGIZE]
- Rule then exception: states the principle, then why it bends here — The best move breaks a beginner rule (same piece twice, a pawn in fro… [RECOGNIZE]
- Plans a piece's route by destination first (the wishlist), then the path — A misplaced piece; an outpost within reach [PLAN]
- Improve the worst piece; put the right piece in the hole; keep the good piece; overprotect your strong point — Quiet middlegames [STRATEGIZE]
- Pawn levers: the break you're aiming for, the hook their pawn hands you, the file that will open, finishing the break you started — Middlegame pawn tension; an enemy pawn advanced in front of its king [PLAN]
- King-safety strategy: their king is stuck in the centre so open it; which side to castle; castling by hand; opposite castling is a race — Development leads; uncastled kings; opposite-side castling [STRATEGIZE]
- King attack: bring one more piece, take a shelter pawn, open a file; ask which pieces aren't in the attack yet — Attacking a castled king [PLAN]
- Keep the tension and let them release it; provoke the commitment; force a concession; the threat is stronger than its execution — Mutual captures available; pawn-chain decisions; a capture that would… [STRATEGIZE]
- Temporary vs permanent advantages: cash in the dynamic edge before it runs out — Development leads, initiative, open lines [STRATEGIZE]
- Judges every trade (good deal or not) and which piece should take back — Every trade and recapture [CONSEQUENCES]
- Trades one advantage for another: gives material back to transform or keep the edge — Up material but facing counterplay; an exchange sac for a monster pas… [STRATEGIZE]
- Structure transfer: this is the structure of another opening (sometimes a tempo up with colours reversed), so its plans carry over — The structure matches another opening's skeleton [RECOGNIZE]
- Lists the loose pieces on both sides before calculating; the trigger-then-scan habit — Before looking for tactics; after a pawn push leaves pieces undefended [IDENTIFY]
- Counts attackers against defenders before taking — A contested square hit and defended at least twice [IDENTIFY]
- Safety habits: blunder-check before letting go of the piece; check for an in-between move before an autopilot recapture; list a grabbing pi… — After a costly reflex; before or after a material grab [PREVENT]
- Checklists: three ways to meet a check; four ways to stop a threat — In check with at least two kinds of answer; facing a threat [IDENTIFY]
- Duty and overload reads: a piece tied to a job, the queen as the only glue, a piece held only by a tactic; 'couldn't it just move?' answere… — A sole defender; a piece that survives only tactically; a student ask… [IDENTIFY]
- Take the sting out instead of stopping the threat; remove the cause, not the symptom; give the job to the least valuable piece — Facing a positional threat; choosing a defender [PREVENT]
- Takes away the escape square first: the quiet restricting move beats spraying checks — A near-mate where the king has one flight square [RECOGNIZE]
- An attack is not a plan: hitting a piece that simply steps away gains nothing — The student's attacking move that achieves nothing [CONSEQUENCES]
- Tests a plan before trusting it: the best case (even if all of it works, does it achieve anything?), the worst case, a move good in every b… — Slow plans; quiet moves whose value depends on the opponent's reply [STRATEGIZE]
- Names the pattern and its invariant: what makes a fork a fork; named mates — A tactic or mate appears or is threatened [RECOGNIZE]
- Defines a chess term the first time it comes up, using the board in front of the student; after that, just uses the word — First use of pin, outpost, fianchetto, battery with this student [RECOGNIZE]
- Endgame technique by name: opposition, key squares, rule of the square, building a bridge, the third-rank defence, cutting off the king, ro… — The technique's position arises [RECOGNIZE]
- Which material can and can't force mate: bishop-and-knight mate, two knights can't, not enough to mate, the basic mates — Bare-king and reduced-material positions [RECOGNIZE]
- Pawn-race arithmetic: count the pushes, and level counts go to the side to move — Passers running on both wings [RECOGNIZE]
- Pawn-ending method: zugzwang, triangulation, the outside passer as a decoy, the breakthrough, the king's course to the weakest pawn, queen … — King-and-pawn endings; promotion races [RECOGNIZE]
- Bishop geometry: good against bad bishop, colour complexes, the bishop pair — Fixed pawn structures; minor-piece trades [RECOGNIZE]
- Converts a won game by a method chosen by the margin: finish development, trade pieces not pawns, make a passer, escort it, cut off the kin… — Clearly ahead (or behind) in material [STRATEGIZE]
- Announces a change of mindset: now consolidate, now hit the gas, don't play the next few moves on autopilot — A material or eval threshold is crossed; the position opens [STRATEGIZE]
- Takes stock at a phase change through one decisive comparison — The middlegame or endgame begins [IDENTIFY]
- Post-game rewind: back to the 2-5 decision points, 'if they X you Y' branches, pruning ('that transposes', 'no independent value'), then ta… — After the game (60-70% of videos; the rewind is often longer than the… [CONSEQUENCES]
- Grades the opponent's moves out loud, and says when they let you off — The opponent's slips and missed punishments [IDENTIFY]
- Cross-game callback: you met this idea before, and the idea from your last game is still alive — A pattern recurs from the student's history [RECOGNIZE]
- Repeats on purpose, shorter each time: full rule, then 'there it is again', then the cue alone, then silence at the trigger (the silent rep… — A concept recurs across plies and across games [RECOGNIZE]
- Praise that names the improvement — The student dodges a habitual mistake, applies something taught, or f… [RECOGNIZE]
- Cites a real game where the same idea worked (credit for the game, never the teaching) — Rarely, as seasoning; mostly in openings [RECOGNIZE]
- Reads the opponent: clock, speed and psychology (blitzing, pre-moving, gambit players who hate dry endings) — Live games with a clock; choosing between near-equal lines [STRATEGIZE]
- Hangs coined labels on recurring shapes so they stick (a bishop smothered by its own pawns, a threat parried in one move, the second kind o… — The matching trigger fires [RECOGNIZE]
- A rhetorical question, answered in the same breath (rarely a real wait) — Before a reveal; at the critical moment [IDENTIFY]
- What the opponent wrongly believes: they grab, thinking it wins, but there is a hidden resource — The opponent takes material that loses along the engine line [CONSEQUENCES]
- A retreat or a purely defensive piece can be the right one; the ugly move that is correct — The best move goes backward, or a piece does only defensive work [STRATEGIZE]
- Runs a self-checklist of what is still owed (development, centre, king safety) and picks the move from what's missing — Quiet opening and early-middlegame moves [PLAN]
- The authored layer: lineage and history, repertoire advice for a level, study method and homework, imagery — Openings, recaps, chat [STRATEGIZE]
- Name their opening, then the principled answer to it — Moves 1-3, as soon as the opening can be named [RECOGNIZE, PLAN]
- What the opening is trying to do (for both sides) and the tension that defines it — The move that commits the structure or reveals the system's point [RECOGNIZE, STRATEGI…]
- Theory status and popularity of THEIR choice, plus the main line's move order — The opponent's move that leaves the main line [RECOGNIZE, IDENTIFY]
- Repertoire framing: which system to aim for and why it suits you — Moves 1-4, before the opening is fixed [STRATEGIZE]
- Frame the opponent's choice against the student's own history — The opponent picks a line that is new or rare for this student [RECOGNIZE (record-a…]
- The opening to-do list, asked as a question and answered by the move — A quiet opening move, once their threats stop [PLAN]
- Name their principle violation and the remedy: punish it by obeying the principles yourself — An opponent piece moves for the third time in the opening, or they lu… [RECOGNIZE, STRATEGI…]
- Prophylaxis before the break, then say 'now it works' when the condition changes — A planned break whose support can be pinned or attacked [PREVENT, PLAN]
- The common slip at this exact position, at the student's level — Positions where the natural move is a known small mistake, smaller th… [IDENTIFY, PREVENT]
- Name a trap pattern, then the move that removes it for good — Before the student develops into a known trick [RECOGNIZE, PREVENT,…]
- A quiet move that sets a trap for their natural reply, and credit when they avoid it — Just before the opponent's planned move would become a mistake [PREVENT, RECOGNIZE]
- What their move attacks, and the answer by method — Every opponent move that creates a threat [IDENTIFY, PREVENT]
- What their move cost them — Their pawn moves and passive developing moves [IDENTIFY, CONSEQUEN…]
- Their maneuver, where it is heading, and the real point of an earlier move — An opponent maneuver in progress, or the move that cashes in an earli… [IDENTIFY]
- Ask why they did it, then refute their plan with the line — An odd-looking opponent move [IDENTIFY, CONSEQUEN…]
- Verdict on how dangerous their idea is (harmless, unsound or toothless) and why — An aggressive-looking but empty opponent move, or a pin or sacrifice … [IDENTIFY, KNOWLEDGE…]
- Credit their correct defence or good move — The opponent avoids the student's trap or finds the best or only move [RECOGNIZE]
- Counterfactual for their alternative: had they played X, you'd answer Y — Right after the opponent chose between natural moves [CONSEQUENCES, PLAN]
- Their only defence: name it, and say whether they found it — After the student's threat, or when they miss their one defence [IDENTIFY, CONSEQUEN…]
- Name their standing resource or most testing setup, to keep in mind — Once the structure fixes the opponent's options [PREVENT, IDENTIFY]
- Name their looming tactic in advance, calmly — The opponent has a sacrifice or strike available [IDENTIFY, PREVENT, …]
- Flag the decision moment before explaining it — A strategic fork in the road, even when the engine gap is small [RECOGNIZE]
- List the candidates, then the one board feature that decides between them — Every real choice in the opening and early middlegame [PLAN, STRATEGIZE]
- Hold back the tempting move, then explain it by the squares it gives up — A tempting pawn push the student should skip [CONSEQUENCES, KNOWL…]
- Keep the tension when the recapture would help their worst piece — Central pawn contact with a capture available [STRATEGIZE, CONSEQU…]
- Choose the structure on purpose — Two pawn moves of similar value that lead to different structures [STRATEGIZE]
- When a piece is chased: keep it working, keep it central, keep it linked — A piece is kicked [PLAN, KNOWLEDGE]
- Not yet, first this, and the square that makes it work — A capture is available but a forcing or safety move should come first [PLAN, CONSEQUENCES,…]
- Prefer the simpler win — Winning, with several good moves [STRATEGIZE]
- Don't invite even a harmless risk, and don't repair their structure — Winning positions with several safe paths [PREVENT, CONSEQUENC…]
- Take a practical risk to play for a win — Equal positions where the student needs to win [STRATEGIZE]
- One move, several jobs — Almost every student move [PLAN]
- The line in words, with their reply, ending on what it achieves and tied back to the plan — Whenever a forcing idea is the reason for a move [CONSEQUENCES]
- The objection IS the point: a decoy or sacrifice that opens lines — Sacrifices and decoys [CONSEQUENCES, KNOWL…]
- King attack: open lines and let the pieces pour in — Attacking a castled king [PLAN]
- Compensation: what the material or the concession buys — Sacrifices, or accepting a structural concession [CONSEQUENCES, STRAT…]
- A chain of consequences from a natural plan move — Before committing to a plan move [CONSEQUENCES, PREVE…]
- Weigh the remedies for a flawed plan — A planned break that fails right now [PLAN]
- Switch plans, and name the conflict between two plans — The first plan proves flawed [STRATEGIZE, PLAN]
- Does their sacrifice work? Check it and say the result — An opponent sacrifice or a forced sequence [CONSEQUENCES]
- It only LOOKS like a trap — An opponent's scary tactical try [IDENTIFY, CONSEQUEN…]
- Two ways to win: name both — Winning positions [STRATEGIZE]
- An x-ray through their attacked piece decides where it can go — Attacking a piece that shields another piece on a line [KNOWLEDGE (geometry…]
- A discovered attack through your own piece gains time on a loose piece — An undefended enemy piece behind one of your own pieces on a line [KNOWLEDGE (geometry…]
- Watch your own lines and soft spots, and confirm nothing reaches them yet — After the king moves, or when a line may open [PREVENT, KNOWLEDGE]
- Before you jump, check who guards the landing square — Planning a knight jump [KNOWLEDGE, PREVENT]
- Restrict their piece, then trap it — An enemy minor piece with few squares [RECOGNIZE, PLAN]
- The hook: a pawn lever against their castled king — The opponent has castled behind a pawn that your pawn can reach [PLAN, KNOWLEDGE]
- Mark the sacrificial target in advance — Your pieces are converging on one pawn in front of their king [RECOGNIZE]
- Fix their wing pawn with yours, or provoke it and then freeze it — A flank pawn advance by either side [PREVENT, KNOWLEDGE]
- A piece can veto their break, and the bonus is revealed later — After an outpost move, once their break is gone [PREVENT, RECOGNIZE]
- The key-square battle: occupy it and clamp it — A hole in their structure [STRATEGIZE, PLAN]
- Golden nugget: a weakness is worth the defenders it ties down — A weak pawn on a half-open file [KNOWLEDGE (golden n…]
- Golden nugget: trade off their fianchetto bishop and its colour stays weak — A trade offer involving a fianchettoed bishop [KNOWLEDGE, CONSEQUE…]
- Golden nugget: note every loose enemy piece the moment it appears — The opponent leaves a piece undefended with no tactic yet [RECOGNIZE, KNOWLEDGE]
- Golden nugget: in a locked centre, the setup matters more than the move order — The centre locks [KNOWLEDGE, STRATEGI…]
- Golden nugget: don't put a piece in front of the pawn you need for the break — Developing in a pawn-chain structure [KNOWLEDGE, PLAN]
- Golden nugget: a rule and its exception, with the board condition that allows it — The student is considering a 'forbidden' move [KNOWLEDGE]
- Choose the wing by where your pieces are and whether the break can happen — Closed centres, once development is done [STRATEGIZE]
- Think in targets: one target per wing, one plan per target — The middlegame begins with weaknesses on both wings [IDENTIFY, PLAN]
- Method: committing to a plan doesn't mean closing your eyes — Just after an opponent move, while a plan is under way [IDENTIFY (method)]
- Method: patience. Finish developing, attack when ready, nurture the edge — Better but not yet winning, or the opponent is overextending [STRATEGIZE]
- Evaluation exercise: list the factors, then estimate — A quiet moment after a strategic success [IDENTIFY (method)]
- Conversion: force the queen trade, rooks to the centre and the seventh — Decisively ahead [STRATEGIZE, KNOWLED…]
- King hunt: herd the king with checks, don't chase the fastest mate — A king hunt in a won position [KNOWLEDGE (techniqu…]
- A teaser now, the reveal later — A quiet move whose point arrives with the opponent's reply [PLAN, PREVENT]
- Answer the student's worry before they ask — The student's move has an apparent drawback or invites a scary reply [CONSEQUENCES, PREVE…]
- This is only safe because of that earlier move — A move that depends on an earlier preventive placement [KNOWLEDGE, CONSEQUE…]
- A verdict with its reasons, at a natural pause — After an exchange sequence, or at the end of the opening [IDENTIFY]
- Post-mortem: the resource that was missed — Right after a missed chance [IDENTIFY]
- Name the opening or system the moment it is reached, including the opponent's setup and transpositions — opening, on the ply the name becomes true (often the opponent's move) [RECOGNIZE]
- Anticipate the coming variation as an open question before it is committed — early opening, where the student's own repertoire makes one road like… [RECOGNIZE / PLAN]
- Survey the menu at a branch point: name each main road, give each a one-line verdict, then choose — opening branch points, often spoken on the opponent's move to prepare… [RECOGNIZE / KNOWLED…]
- Characterize a line's standing and nature: respected try, old main line, what top players choose, theory-heavy, quiet but not boring, color… — opening, on book moves of either side [KNOWLEDGE]
- Recommend a line for its learnability and risk at the student's stage — opening branch points where both roads are sound [STRATEGIZE (reperto…]
- Call back the student's own repertoire to justify consistency — opening, when the student's history makes the choice personal [PLAN]
- Flag the critical opening moment before the natural wrong move, with its consequence and the right idea — opening, on the opponent's move just before the student's critical ch… [PREVENT / CONSEQUEN…]
- A theory-approved pawn grab that looks scary, plus its surprise value — opening, a sound but rarely known move [KNOWLEDGE]
- Cite a real high-level game for the main line and say what kind of game it gives — opening, at the main-line branch [KNOWLEDGE (game ref…]
- Say what a move prepares (its named follow-up) — quiet moves of both sides, every phase [PLAN]
- Say what a move prevents (prophylaxis), counted where needed — quiet moves of either side [PREVENT]
- One move, several jobs, enumerated and often numbered — quiet moves at turning points of a plan [PLAN]
- A pawn move that opens a line for your own piece, or a piece stepping aside to unmask one — middlegame levers and regroupings [PLAN]
- Put the question to an annoying piece with a pawn, or kick it off its post — when an enemy piece is strong or annoying [PLAN / PREVENT]
- Development order: finish development and castle, queen off its home square, rooks to the centre, then start concrete thinking — late opening and early middlegame [PLAN (principle)]
- Name the tempting or popular alternative and why it fails — at the student's decision, especially when the natural move is wrong [CONSEQUENCE]
- Eliminate candidates one by one by what each allows, then choose — decisions with several plausible moves [CONSEQUENCE / METHOD]
- Pose the decision as a question and answer it at once (thinking aloud, not a quiz) — decision points; all 7 questions in the slice are answered by the coa… [METHOD]
- Triage: say which decisions do not matter and move quickly — low-stakes moments (top moves nearly equal) [METHOD]
- Flag a real decision point before the move — before a move with a big gap between the best and the natural move [METHOD / IDENTIFY]
- Recapture choice with its reason — every recapture with more than one option [CONSEQUENCE]
- Choose between two pieces or squares by what each must still guard or reach — choosing among equal-looking options [CONSEQUENCE / PLAN]
- Prefer a preparatory move that is good on its own over one that works only if the plan succeeds — middlegame plan preparation [PLAN]
- A modest square is fine when it does its jobs, and the coach lists the jobs — development between solid and flashy squares [STRATEGIZE]
- Say 'this still wins, but X was cleaner' instead of grading — student far ahead, playing a winning but non-best move [CONSEQUENCE]
- When ahead, choose the safe option and skip unnecessary calculation — student ahead with a complex grab available [STRATEGIZE]
- Your own move's drawback: what it stops guarding or weakens — pawn moves and piece moves that release a guard [CONSEQUENCE]
- Drawback, its condition, why it does not bite here, and the remedy, in one breath — a move with a real but conditional drawback [CONSEQUENCE / IDENT…]
- A rule is not a law: the weakening is fine because nothing can exploit it — the student breaks a principle and the engine agrees [KNOWLEDGE (principl…]
- Temporary versus permanent drawback — piece placements with a short-lived cost [CONSEQUENCE]
- Their good move's conditional future drawback — an opponent move that is good now and awkward after their own plan [CONSEQUENCE / IDENT…]
- Their piece placement hands you a future tempo — an enemy queen or piece steps where your piece can attack it with gai… [IDENTIFY]
- Name the fixed weakness as THE target, give the general method, and track it — middlegame once a weakness is fixed [IDENTIFY / PLAN / S…]
- Count control of a key square, including indirect support — judging a weak square or a break [KNOWLEDGE (count) /…]
- Count before you fear their break, and say that even if it comes it helps you — opponent preparing a break [PREVENT / CONSEQUEN…]
- Their move is irrelevant to your plan, so keep going — a showy opponent move that ignores your plan [IDENTIFY / STRATEGI…]
- Their move just made your break possible — right after an opponent move that removes the obstacle to your break [RECOGNIZE]
- A pawn indirectly defended: taking it achieves nothing — defending a pawn without a direct guard [KNOWLEDGE / PREVENT]
- Timing: not yet, now, and why it was wrong a move earlier — breaks and pushes that depend on an opponent resource [PLAN / PREVENT]
- The deferred-move arc: a move turned down several times, then played when its reason arrives — across 10+ plies of one plan [STRATEGIZE]
- Name what their move wants or threatens, including the follow-up — after every opponent move that creates something [IDENTIFY]
- Meet a threat by making it cost them — defending against a threat that needs a free tempo [PREVENT]
- Defuse a threat by removing what it depends on — defending a mating net built on a deflection [PREVENT]
- The quiet strengthening move is the real danger — defending when forcing play fizzles [IDENTIFY / PREVENT]
- Count the draw: they have a perpetual; take it when worse — defence, when their attack can only repeat [CONSEQUENCE / STRAT…]
- Honest verdict and the practical plan when objectively lost — losing positions [STRATEGIZE]
- Material arithmetic toward level — after a sacrifice or a loss of material [KNOWLEDGE (golden n…]
- A trade that thins THEIR attack helps the defender, even when down — defending, after an exchange the opponent starts [CONSEQUENCE]
- The best defensive move improves your position AND sets a trap — defence, choosing between useful moves [PREVENT / STRATEGIZE]
- Provoke a natural reply that serves your plan — middlegame manoeuvring [PLAN]
- Bait a swindle when lost — objectively lost [STRATEGIZE]
- Keep your best piece when better, and name it as your main asset — trade offers when you stand better [STRATEGIZE]
- Name the imbalance a trade creates — minor-piece trades [RECOGNIZE]
- Outposts and what a piece sees from them — middlegame and endgame manoeuvres [RECOGNIZE / PLAN]
- Anchor a piece with a pawn so it can never be chased — consolidating a well-placed piece [PLAN]
- A buried piece counts as missing material — domination and restriction [KNOWLEDGE (golden n…]
- A two-sided ledger between pieces — weighing a mutual restriction [STRATEGIZE]
- A trapped piece as a consequence, then collect — after an opponent move that removes a piece's escape [RECOGNIZE]
- Name the structure reached and its thematic break — the move that fixes the centre [RECOGNIZE / PLAN]
- A pin that only looks like a pin — a bishop aims at a piece with a blocker behind it [RECOGNIZE (geometry)]
- Line geometry against your queen: x-ray, battery, frozen defenders — middlegame line play [RECOGNIZE (geometry)]
- Name the thematic sacrifice and what it buys — structural sacrifices [KNOWLEDGE (named pa…]
- Offer the queen trade as the weapon when your structural trump decides — conversion with a structural edge [STRATEGIZE]
- Your sole trump, so the plan — defence or imbalanced positions [STRATEGIZE]
- Grade their move and punish it — after an opponent error [RECOGNIZE]
- Credit their strong resource honestly — after a strong opponent move that upsets your plan [RECOGNIZE]
- Take what they left undefended — after an opponent move that leaves material loose [RECOGNIZE]
- Lesson thesis up front — start of a game or lesson [STRATEGIZE (framing)]
- A numbered argument carried across several plies — opening lectures, while routine moves are played [STRATEGIZE / KNOWLE…]
- Payoff callback: reveal why an earlier move was played when it bears fruit — when an earlier quiet move's purpose becomes visible [PLAN (follow-throug…]
- Plan milestones — as a multi-move plan advances [PLAN]
- Re-evaluate when the board shifts; an old plan is not binding — after an opponent move that changes the position [METHOD]
- Game recap naming the kind of win and the decisive mistake — end of game [STRATEGIZE (recap)]
- Teach a pattern by a counterfactual — to teach a fork shape the board almost has [KNOWLEDGE (geometry)]
- Analogy between openings — naming an opening that borrows another's idea [KNOWLEDGE (transfer)]
- A placement that is right whatever they do — opening choices against an annoying option [PLAN]
- Self-critique: honesty about what the coach missed — after the opponent refutes the coach's own idea [METHOD (honesty)]
