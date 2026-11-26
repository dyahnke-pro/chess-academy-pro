# Lesson principles — index

Every principle the coach states as a LESSON (MISTAKE-CAUSES.md §A, §B, §C + the extra motifs, and every lesson row of pilot-cards.md), each with ≥2 independent sources, a deterministic board check, and 5 phrasings ≤14 words with no move names. The recovery (REPAIR) principles live in `../recovery/` and are linked from the rows that share them.
Source keys: `concept:<id>` = `src/data/chess-concepts.json`; `Library: <page id>` = `src/data/library/*.json` (cf = Capablanca *Chess Fundamentals*, cc = Ed. Lasker *Chess and Checkers*, cs = Ed. Lasker *Chess Strategy*, csc = Em. Lasker *Common Sense*, ms = Nimzowitsch *My System*, mci = Steinitz *Modern Chess Instructor*, aoc = Mason *Art of Chess*).

| principle | sources | check | used by |
|---|---|---|---|
| [mate-first](mate-first.md) | 4 | Allowed: the engine PV after the student's move contains `#` for the opponent (mate-in-N, N ≤ 5), or the board is mate-in-1 for the side to move (ches | allowed-mate, missed-mate, king-hunt, motif checkmate, pictureVerdict CALC |
| [count-the-recapture](count-the-recapture.md) | 4 | Static exchange evaluation on the target square (the app's exchange ledger / SEE): free = SEE ≥ value of target with no recapture; trade = SEE ≈ 0; lo | took-guarded, eyed-guarded, pictureVerdict T CONSEQ/CALC(target), readPosition G CALC, S CALC, L CONSEQ(wins pawn) |
| [loose-pieces](loose-pieces.md) | 4 | Loose = a piece with 0 defenders (guard map) attacked by ≥1 enemy piece, or attackable next move. | left-hanging, allowed-capture, missed-win, motif hanging piece, pictureVerdict W HABIT, readPosition G CALC |
| [check-before-the-grab](check-before-the-grab.md) | 3 | Answered-by-check: after the student's capture, the opponent has a check that also attacks a student piece (chess.js: for each checking reply, list at | answered-by-check, motif zwischenzug, pictureVerdict T KNOW(threat) |
| [defender-has-a-job](defender-has-a-job.md) | 4 | Guard map before/after: the student's moved piece was the ONLY defender of a piece/square that the opponent's best line then wins (abandoned-defender) | abandoned-defender, motif deflection, overload, removing the guard, pictureVerdict T STRAT (one piece refutes all), P hits-replier |
| [fork](fork.md) | 3 | Fork square: a square from which one enemy piece attacks ≥2 student pieces of value ≥ the forker (or the king + any), reachable by that piece in 1 mov | abandoned-fork-square, walks-into-fork, motif fork |
| [pin](pin.md) | 3 | Pin: a student/enemy line piece, a front piece, and behind it a piece of higher value or the king on the same line (chess.js rays), the front piece un | motif pin, readPosition G CONSEQ (target pinned) |
| [skewer](skewer.md) | 2 | Ray from an enemy/student bishop/rook/queen: first piece hit is worth MORE than the second (or is the king), second piece undefended or worth more tha | motif skewer |
| [discovered-attack](discovered-attack.md) | 3 | Battery: a moving piece M and a line piece L of the same side on one ray toward an enemy target T, M between them. The discovered move = any legal mov | motif discovered attack, x-ray/battery rows |
| [x-ray-battery](x-ray-battery.md) | 3 | Count rays through the first piece (own or enemy) to the target when SEE is computed (x-ray attackers counted after the front piece captures/moves). | motif x-ray, battery rows |
| [interference](interference.md) | 2 | A line defender D guards target T along a ray; a legal move of the attacking side lands on a square strictly between D and T (SEE on that square may b | motif interference |
| [clearance](clearance.md) | 2 | A friendly piece F stands on a ray (or square) that a stronger friendly piece S needs for a threat; the stored winning line's first move moves F off i | motif clearance |
| [promotion](promotion.md) | 3 | Pawn on the 7th (2nd for Black) with its queening square empty or capturable; promotion legal next move; underpromotion flagged when the engine line c | motif promotion, passer-handed |
| [back-rank](back-rank.md) | 3 | The back-rank mate test (see recovery/back-rank-weak.md): king on back rank, forward squares blocked/attacked, enemy heavy piece with a path. | motif back rank (new record tag `back-rank` owed per plan), abandoned-defender |
| [trapped-piece](trapped-piece.md) | 3 | Trapped: a piece P attacked (or attackable in one move) where every legal move of P lands on a square with SEE < 0 for P and staying loses it; the eng | motif trapped piece, queenChased rows |
| [combination](combination.md) | 4 | 'Tactical sequence': the stored winning line has ≥2 consecutive forcing student moves and nets ≥ 100cp at the quiet end; the student played a non-forc | motif tactical sequence, pictureVerdict CALC works-now, W rows, habit CCT |
| [answer-the-threat](answer-the-threat.md) | 3 | `computeMustDefend` on the board after their move is non-empty; the student's move leaves it non-empty and the opponent's best reply executes it (igno | ignored-threat, still-hanging, allowed-threat, pictureVerdict W seat O, L PREV |
| [tempo-and-initiative](tempo-and-initiative.md) | 4 | tempo-wasted: the student's move creates no new threat (`computeMustDefend` empty for them), is not a capture, and the engine's best reply is a develo | tempo-wasted, allowed-threat, pictureVerdict T KNOW(check), T CONSEQ(tempo), readPosition D CONSEQ/exception |
| [king-shelter](king-shelter.md) | 4 | Shield: the 3 pawns on the king's file and adjacent files, ranks 2–3 from its side. king-hunt cause: ≥2 shield pawns gone/advanced and the opponent's  | king-hunt, readPosition K IDENT, recovery king-exposed |
| [king-in-the-centre](king-in-the-centre.md) | 5 | Uncastled S king on d/e file past move ~10, queens on, a central file (d/e) half-open or a central pawn break legal for the opponent. | readPosition K rows, pictureVerdict combo king-in-centre, phase endgame rows |
| [development](development.md) | 4 | Development count = minors off their home squares + castled; lead = difference ≥ 2. | readPosition D rows, pictureVerdict combo, tempo-wasted |
| [colour-complex](colour-complex.md) | 3 | Bishop-colour census: student has 0 bishops on colour C, opponent ≥1; targets = student pawns/holes on C attacked by that bishop. | colour-conceded, readPosition X CONSEQ/IDENT/PLAN/combo |
| [trades-change-structure](trades-change-structure.md) | 3 | Structure diff (`boardStructure.newPawnWeaknesses`): the trade's line ends with a new isolated/backward/fixed student pawn that passes the target test | traded-into-target, readPosition L CONSEQ(isolated) |
| [passed-pawns](passed-pawns.md) | 4 | See recovery/passer-against.md and recovery/passer-mine.md (passed-pawn test, rule of the square, SEE on the stop square, rook reach behind). | passer-handed, readPosition X PREV/PLAN/KNOW(passer), pictureVerdict T KNOW(passer) |
| [sacrifice-needs-a-return](sacrifice-needs-a-return.md) | 4 | See recovery/compensation-lost.md. gambit-offer: the opponent's pawn sac opens a file/diagonal (file census before/after) and the engine rates taking  | compensation-lost, gambit-offer |
| [stalemate-watch](stalemate-watch.md) | 2 | After the candidate, the enemy has 0 legal moves and is not in check (chess.js `isStalemate()`); the student is ≥ +3 in the ledger. | stalemate |
| [endgame-technique](endgame-technique.md) | 5 | technique-broken: a tablebase/engine flip (won→drawn, drawn→lost) on a move in a known class: K+P (opposition lost: kings on one file one apart, the s | technique-broken, pictureVerdict phase endgame, T KNOW(king ending) |
| [improve-before-forcing](improve-before-forcing.md) | 4 | pictureVerdict `hard-to-finish` / `no-direct-way` / `tries-worsen` (computed), no try with net ≥ 100cp; worst piece = lowest mobility (pieceRoute). | pictureVerdict V STRAT rows, P PLAN, combo bad piece, readPosition B KNOW |
| [prophylaxis](prophylaxis.md) | 3 | pictureVerdict L counterplay alive (computed): name its piece/break; a student move covering the break square or trading the counterplay piece exists  | pictureVerdict V PREV, L rows, readPosition L PREV(stop) |
| [forcing-moves-first](forcing-moves-first.md) | 3 | Habit fires when the stored read had a forcing line netting ≥ 100cp at the quiet end that the student didn't play (missed) or allowed for the opponent | pictureVerdict V CALC, W rows, T habit, motif tactical sequence |
| [reply-first](reply-first.md) | 3 | pictureVerdict T: the try's `eye` rank ≤ 3 and its refutation exists (reply, replier); grouping by replier square. | pictureVerdict T rows (RECOG, CONSEQ, IDENT, habit, counterfactual) |
| [pawn-breaks](pawn-breaks.md) | 4 | Break: a legal pawn push/capture contacting an enemy pawn; target = the contacted pawn; prepared = SEE on the landing square ≥ 0; chain base = the rea | readPosition L rows, pictureVerdict T KNOW(lever) |
| [pawn-tension](pawn-tension.md) | 3 | Tension = mutually attacking pawns; the student's capture recaptured by a developing move (piece leaves the back rank) or opening a file the opponent' | readPosition L STRAT(tension) |
| [minority-and-majority](minority-and-majority.md) | 4 | Majority: per wing (a–c, f–h) student pawns > enemy pawns; candidate = the pawn on a file with no enemy pawn ahead (or fewer). | readPosition X PLAN(minority), L phase endgame |
| [weak-pawns](weak-pawns.md) | 4 | See recovery/weak-pawn.md (classifier, target test, stop square, sole-defender). | readPosition S rows, traded-into-target |
| [holes-and-outposts](holes-and-outposts.md) | 4 | The one hole test (`noPawnCanChallenge`); outpost = hole in the enemy half occupied/reachable in ≤2 by a knight, defended by an own pawn (see recovery | readPosition G KNOW(outpost), X PLAN(complex), recovery outpost-conceded |
| [open-files-and-seventh](open-files-and-seventh.md) | 4 | Open file = no pawns; half-open = no own pawn. Entry square = a square on the file in the enemy 6th–8th ranks (from your side) not attacked by enemy p | readPosition G KNOW(seventh), PLAN(heavy piece to file), X PLAN(file), L CONSEQ(file) |
| [bishop-pair](bishop-pair.md) | 4 | Pair = two bishops on opposite colours vs not; openness = count of open/half-open files + number of central pawns (≤2 central pawns = open). | readPosition X STRAT(pair), CONSEQ(pair given up) |
| [good-and-bad-pieces](good-and-bad-pieces.md) | 4 | Piece quality: mobility + targets attacked (`findPieceQuality`); best = highest, worst = lowest. Trade check: a capture/trade that swaps the student's | readPosition G STRAT/seat O/combo, B rows, recovery bad-bishop/stranded-piece |
| [count-the-race](count-the-race.md) | 3 | Storm: kings castled on opposite wings, both sides' pawns advanced on the enemy king's wing; count pawn moves to contact with the shield. Passer race: | pictureVerdict T STRAT(storm) |
| [rook-lift](rook-lift.md) | 4 | named manoeuvre (pictureVerdict P `rook lift`): rook moves up its file to the 3rd/4th rank then laterally toward the enemy king's wing, the rank path  | pictureVerdict P KNOW(rook lift) |
| [convert-the-advantage](convert-the-advantage.md) | 3 | Ledger d ≥ +1 at the quiet end; endgame conversion: student passer + king distance. | pictureVerdict W CONSEQ, V phase endgame, recovery up-material |
| [evaluation-is-a-summary](evaluation-is-a-summary.md) | 2 | none (meta). | pictureVerdict V EVAL |

## Disputed — principles in our cards that are wrong, overstated, or thinly sourced
**Wrong as written (fix the card line):**
- `eyed-guarded` L1 "A threat on a guarded piece isn't a threat." False when the attacker is cheaper than the target (a pawn hitting a guarded knight wins it). Needs the value condition → [count-the-recapture](count-the-recapture.md).
- `allowed-mate` L1 "A king with no escape square dies to one check." Only if the check can't be blocked or the checker taken → [mate-first](mate-first.md).
- `walks-into-fork` L1 "Two pieces a knight's jump apart are a fork waiting." The fork geometry is two pieces both a knight's move from ONE reachable square, not a knight's move from each other → [fork](fork.md).
- pictureVerdict V EVAL "The evaluation is a summary…" Not a chess principle; meta-talk about the engine → [evaluation-is-a-summary](evaluation-is-a-summary.md). Recommend cutting.

**Overstated (soften the word):**
- readPosition G KNOW(outpost) "worth as much as a rook" — no source gives a rook-equivalence → [holes-and-outposts](holes-and-outposts.md).
- readPosition K KNOW "The further the king is from the centre, the safer" — a cornered king can be back-rank mated; sources say "behind its pawn shield" → [king-in-the-centre](king-in-the-centre.md).
- readPosition S phase "Weak pawns are a small problem in the middlegame" — a weak pawn on a half-open file can fall in the middlegame; sources say only that it gets WORSE in the ending → [weak-pawns](weak-pawns.md).
- readPosition L RECOG "Every structure has a pawn break that decides the play" — usually, not always (blocked structures) → [pawn-breaks](pawn-breaks.md).
- readPosition X PLAN "Passed pawns must be pushed" — sources (and our own KNOW row) require support / a safe stop square → [passed-pawns](passed-pawns.md).
- `took-guarded` L3 "A guarded piece isn't a gift, it's a trade" — only when the capturer is worth no more than the target → [count-the-recapture](count-the-recapture.md).
- pictureVerdict T RECOG "The move that jumps out first is often the one your opponent is ready for" — a maxim; sources support "check the reply", not the frequency claim → [reply-first](reply-first.md).
- readPosition B RECOG "Your weakest piece decides how well your whole army plays" — maxim; Turzo (chess.com) argues the worst piece is often not the priority → [good-and-bad-pieces](good-and-bad-pieces.md).

**Heuristic, not law (say "usually"):**
- readPosition D KNOW "Knights before bishops" — Capablanca (cf-5/cf-31) and Ed. Lasker (cs-6: "a shade better") support it as a guideline; chess.com's opening principles don't list it → [development](development.md).
- readPosition L STRAT(tension) "the side that takes first often helps the other develop" — sources frame tension as a choice; say only when the recapture actually develops → [pawn-tension](pawn-tension.md).
- pictureVerdict T KNOW(check) "A check is only good if it gains something" — supported as a tempo idea (concept:pos-tempo), no source states the rule → [tempo-and-initiative](tempo-and-initiative.md).

**Thin sources (two web sources, no book passage):** interference, clearance, rook-lift (chess-site articles only), and `still-hanging` ("their miss doesn't fix your problem" — folded into [answer-the-threat](answer-the-threat.md), supported only by the CCT/prophylaxis sources).
