# Pilot cards — full angle grid

Every fact is run through every angle. Each row: **angle · condition (deterministic) · data (H = already computed / C = compute, how) · the lesson · guard (when it would be false, so never said there)**.
Seats: every lesson is written for both sides; "S" = student's side, "O" = opponent's. Learn never names the student's next move or square unasked; the lesson stays, the move is held.
Record: RED/GREY = full lesson · AMBER = lesson in one clause · GREEN = silent.

---

# CARD 1 — `pictureVerdict` (src/services/pictureVerdict.ts)

Facts: **V** verdict (kind, step) · **T** each failed try (look, target, reply, replier, took, by, cost, eye) · **W** the try that works (net) · **P** the surviving plan (move, links, board plan, named manoeuvre) · **L** their counterplay alive/dead.

## V — the verdict

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| STRAT | hard-to-finish, S better | H | Being better doesn't mean you can win right away. When nothing works directly, stop forcing and start improving your pieces. | not when a try works (W) |
| STRAT (O seat) | hard-to-finish, O better | H | When they're better but can't break through, your job is to give them nothing to aim at: keep every piece guarded and wait. | not when their direct try works |
| STRAT + L dead | hard-to-finish, no counterplay | H | When your opponent has nothing to do, time is on your side: improve slowly and let them run out of good moves. | not when counterplay is alive |
| PREV + L alive | better, counterplay alive | H | Before you press for more, stop their one source of play. A won position is lost by ignoring the counterattack. | — |
| PLAN | no-direct-way, level | H | In a level position with no direct way in, the game is won by the better plan, not the better shot. | — |
| STRAT | tries-worsen | H | Sometimes every active move makes your position worse. Then the strongest move is a quiet one that improves a piece. | — |
| CALC | works-now | H (net) | When you're better, look for the direct shot first. If the forcing line wins material, play it before they fix it. | net must be ≥ a pawn after the line settles |
| STRAT (timing) | works-now, didn't work a move earlier | C: same try on the previous board's saved read | Chances come and go. The shot that didn't work a move ago works now because something changed: notice what changed. | previous read must show it failing |
| EVAL | any | H (step) | The evaluation is a summary of what each side can do, not a promise. | — |
| phase: endgame | step ≥1, ending | H | In the endgame, an advantage you can't convert is just a draw. Convert with the king and the passer, not with tricks. | ending detected |
| combo: + king in centre (readPosition) | hard-to-finish, their king in centre | H | When their king is stuck in the centre, the way through is to open lines toward it, not to win material. | king can't castle |
| combo: + bad piece | no-direct-way, S has a bad piece | H | When nothing direct works, fix your worst piece first. | — |
| exception | works-now but costs king safety | C: king-exposure read after the line | The direct win is right even though it looks risky: the forcing line leaves them no time to hit back. | line ends with S king safe |
| record | — | — | RED/GREY: full lesson · AMBER: "Better, but nothing direct works — improve first." · GREEN: silent | — |

## T — each failed try (the "but")

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| RECOG | eye high | H (eye) | The move that jumps out first is often the one your opponent is ready for. | eye ≥ top 3 |
| CONSEQ (material) | by = material, reply takes | H | A piece is only free if nothing can take back. Before you grab, check every recapture. | reply is a capture |
| CONSEQ (result) | by = result | H (refuter's reason) | A move can look active and still lose: check what it allows, not just what it attacks. | — |
| CONSEQ (tempo) | by = returns | H | A move that has to be taken back is two moves wasted. If the reply sends your piece home, don't start the trip. | board after 4 plies = board before |
| IDENT | always | C: piece on replyFrom (chess.js) | Find the piece that answers your idea: that is the piece doing their defending. | — |
| STRAT | ≥2 tries refuted by one piece | C: group by replyFrom | When one piece refutes all your tries, that piece is the real target. Trade it off or chase it, and the tries start working. | same square and same piece |
| KNOW (capture) | look = capture | H | Every capture changes the board in two ways: what you take, and what opens. Check both. | — |
| KNOW (check) | look = check | H | A check is only good if it gains something. A check they simply step out of gives them a tempo. | reply is a king move |
| KNOW (threat) | look = threat | H | A threat is only strong if they can't answer it with a bigger threat. | reply creates a threat ≥ yours |
| KNOW (lever) | look = lever | H | A pawn break is a good idea at the wrong time if the pawn it hits is defended enough. Add support first, then break. | target defended ≥ attacked |
| KNOW (passer) | look = passer | H | A passed pawn pushed without support is a lost pawn. Bring a piece behind it first. | — |
| KNOW (king, ending) | look = king | H | In the endgame the king walk is strong only when it can't be cut off. Check which ranks and files their rook controls. | ending |
| CALC (target) | look = plan, target set | C: attackers vs defenders on target | Count before you attack: you need more attackers than they have defenders, or the piece is safe. | count from chess.js |
| STRAT (storm) | look = storm | H | A pawn storm only works if it's faster than their answer. Count how long each side's attack takes. | — |
| PLAN (prepares) | a link answers this try | H (links) | When the direct try fails, ask what one quiet move would make it work, and play that first. | link exists |
| seat O | the try is theirs | H | When their natural move fails, expect them to find the quieter one. Watch for it. | — |
| timing: Learn before move | S to move, try is S's | H | Learn: "The obvious capture here doesn't work — ask what they take back with." (no move named) | never name the try's square to the student before the move |
| timing: Review | after the move | H | Review names the try, the reply and the lesson in full. | — |
| counterfactual | S played the try | H (cost) | This is the move you played: the reply was there, and it cost you [n]. Next time, check the reply first. | S's move = the try |
| habit | any failed try | H | Before the obvious move, ask what their best reply is. | — |
| record | — | — | AMBER: "The obvious try fails — check the reply." GREEN: silent | — |

## W — the try that works

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| CALC | works | H (net) | When the forcing line wins material and their best defence doesn't change it, play it now. | net after settle ≥ 100 |
| CONSEQ | works | H | Material won by force is the clearest advantage in chess: once you have it, trade pieces and convert. | — |
| HABIT | works, S missed it | H (S played other) | You had a winning shot here. Every move, look at checks, captures and threats first: that's how you find it. | S's move ≠ W |
| seat O | works for them | H | They have a forcing line here. When you see one for them, stop it before your own plan. | — |
| timing: Learn before move | S to move | H | Learn: "There's a direct way to win material here." (move held) | never name W before the move unless asked |

## P — the plan that survives

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| PLAN | plan exists | H | When the direct moves fail, the quiet move that improves a piece is the plan. | — |
| PLAN (guards-taken) | link guards-taken | H | The best preparation removes the reason the attack failed: guard the thing their reply would take. | link holds at that ply |
| PLAN (hits-replier) | link hits-replier | H | Attack the defender, and what it defends becomes weak. | replier still on its square |
| CALC (adds-attacker) | link adds-attacker | H | Adding one more attacker changes the count, and then the target falls. | count after > count before |
| KNOW (rook lift) | named = rook lift | H | When the files are closed, lift the rook up the board and swing it across to the king. | rook climbs then crosses |
| PLAN (steps) | board plan steps | H | A plan is a few steps in order: name them, then play the first one. | — |
| STRAT (order) | link at later move | H | Order matters: the first move makes the second one work. | moveIndex > 0 |
| seat O | plan is theirs | H | Their quiet move is preparing something: ask what it makes possible next. | — |
| timing: Learn | S to move | H | Learn: "The direct way fails — which of your pieces would make it work?" | move held |

## L — counterplay

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| PREV | alive | H | Find their one source of play and take it away before anything else. | — |
| STRAT | dead | H | With no counterplay to fear, you can take your time. | — |

---

# CARD 2 — `readPosition` (src/services/positionalRead.ts)

14 observation kinds. Each is a fact family run through the grid.

## K — king in the centre / king on an open file

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| RECOG | S king on d/e, uncastled | H | A king in the middle is in the way of every line that opens. | not in an ending |
| CONSEQ | central file open / opening | H | Once a central file opens, a king still in the middle can be checked down it. | file open or break pending |
| PLAN | castling one move away | H | Castle before the centre opens, not after. | can castle |
| IDENT | which side safer | H (castlingWing) | Castle on the side where the pawns in front of your king are still home. | — |
| PLAN | castling blocked | C: piece between king and rook | Clear the way to castle: the last piece out is often the one blocking it. | piece on f1/g1 or b1–d1 |
| PLAN | can't castle | H (castleByHand) | When you can't castle, walk the king to safety by hand. | lost rights |
| seat O / STRAT | their king stuck | H | When their king is stuck in the centre, open lines toward it before it gets out. | can't castle |
| PLAN (O) | their king stuck | C: the break that opens toward the king | The pawn break that opens the centre is the attack on their king. | break legal |
| KNOW | always | H | The further the king is from the centre, the safer it is in the middlegame. | not in an ending |
| phase: endgame | ending | H | In the endgame the rule flips: bring the king to the centre, it's a strong piece now. | ending |
| combo: + development lead | S king centre, O ahead | H | Behind in development with your king in the centre is the worst combination: castle and develop before anything else. | — |
| exception | queens off, ending near | H | With the queens off, a king in the centre is often fine. | queens traded |
| habit | S uncastled past move 10 | H | Every move, ask: if the centre opened now, would my king be safe? | — |

## D — development

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| RECOG | minors at home | H | A piece still at home can't fight. | — |
| STRAT (ahead) | S ahead | H | When you're ahead in development, open the position before they catch up. | — |
| STRAT (behind) | S behind | H | When you're behind in development, keep it closed and catch up. | — |
| IDENT | which piece next | C: home minor + best square (squareChoice) | Develop the piece with the fewest good squares first: the others can wait. | — |
| CONSEQ | piece moved twice, others home | H (pieceMovedAgain) | Moving the same piece twice in the opening hands your opponent a free move. | opening |
| exception | twice with a threat | H (ruleException) | Moving a piece twice is fine when it wins something or forces a reply. | the move threatens |
| KNOW | always | H | Knights before bishops; castle early; don't bring the queen out too soon. | opening |
| seat O | they're behind | H | When they leave pieces at home, punish it fast: open lines before they develop. | — |
| phase | middlegame on | — | doesn't apply after development is complete — reason: no home minors | — |

## G — best-placed piece

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| RECOG | good piece found | H | Know which of your pieces is doing the most: that's the one to keep and build around. | — |
| IDENT | target on its line | H | A piece is strong when it hits something. Name what it's aiming at. | target exists |
| CALC | target loose | H | An attacked piece with no guard is a target right now. | no defenders |
| CALC | target guarded | C: attackers vs defenders | Count the attackers and defenders: one more attacker and it falls. | count correct |
| PLAN | heavy piece can join | C: heavyPieceToFile | Doubling on a file doubles the pressure: the second piece wins the target. | piece can reach |
| CONSEQ | target pinned / tied | C: pin & tied readers | A pinned piece can't escape, so pile on it. | pin holds |
| STRAT | always | H | Don't trade your best piece for one of their worse ones. | — |
| KNOW (outpost) | outpost | H | A knight on a square no pawn can attack is worth as much as a rook in some positions. | no pawn can ever hit it |
| KNOW (seventh) | rook on seventh | H | A rook on the seventh eats pawns and shuts the king in. | — |
| seat O | their best piece | H | Their best piece is the one to trade off. | — |
| combo: + their worst | S best vs O worst | H | Trade their good piece, keep their bad one: the game turns on the pieces left. | — |

## B — worst piece / bad bishop / stranded

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| RECOG | few squares | H | Your weakest piece decides how well your whole army plays. | — |
| IDENT | why bad | H | A bishop behind its own pawns on its own colour is a tall pawn. | pawns on its colour |
| PLAN | has a route | C: pieceRoute/pieceWish | Find the route that brings your worst piece into the game. | route legal |
| STRAT (O) | theirs bad | H | Keep their bad piece bad: don't trade it, and don't open lines for it. | — |
| PLAN (pawns) | bad bishop, own pawns | C: pawn moves that free it | Move your pawns off the bishop's colour to free it. | — |
| exception | bad bishop defends | H | A bad bishop can still be a good defender: don't trade it if it holds your weak squares. | it guards a weak square |
| KNOW | always | H | Improve your worst piece. | — |

## S — pawn structure (isolated, doubled, backward)

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| RECOG | weak pawn | H | A pawn no other pawn can guard needs a piece to babysit it. | — |
| IDENT | the square in front | C: square ahead + who can land there | The square in front of an isolated pawn is the best home for an enemy knight. | knight can reach |
| STRAT (owner IQP) | S has IQP | H | With an isolated pawn, keep pieces on and attack: it gives you space and open files. | middlegame |
| STRAT (vs IQP) | O has IQP | H | Against an isolated pawn, trade pieces and blockade the square in front. | — |
| CALC | attackers vs defenders | C: count | Count the pressure on the weak pawn: when attackers outnumber defenders, it falls. | — |
| CONSEQ | guard is tied | H | A piece that has to guard a pawn can't do anything else. | — |
| phase | endgame | H | Weak pawns are a small problem in the middlegame and a big one in the endgame. | — |
| KNOW (doubled) | doubled | H | Doubled pawns can't guard each other, but they open a file for your rook. | — |
| KNOW (backward) | backward | H | A backward pawn on a half-open file is a target, and the square in front is a hole. | — |
| exception | harmless | H (harmlessWeakPawns) | A weak pawn only matters if the opponent can get at it. | no enemy piece can reach |

## L — pawn break (the biggest gap)

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| RECOG | break exists | H | Every structure has a pawn break that decides the play. Know yours and theirs. | — |
| IDENT | target pawn | H | A break is aimed at a pawn: find which one. | — |
| CONSEQ (file) | exchange opens a file | C: play break + capture | A pawn exchange opens a file, and the side whose rook gets there first owns it. | file opens after the capture |
| CONSEQ (isolated) | exchange leaves a lone pawn | C: structure read after | When a pawn trade leaves a pawn with no neighbours, only pieces can guard it from then on. | — |
| CONSEQ (wins pawn) | SEE after push > 0 | C: SEE | A break that hits a pawn guarded fewer times than it's attacked just wins it. | SEE ≥ 100 |
| PREV (guard) | O break | C: count | Against a pawn break, the simplest defence is to guard the target as many times as it's attacked. | legal guard exists |
| PREV (take first) | O break | C: exchange on the break square | You can meet a break by taking first: you choose how the structure changes, not them. | capture legal |
| PREV (stop) | O break | C: piece/pawn covers the push square | The best time to stop a break is before it's played: cover the square it needs. | square coverable |
| PLAN (own) | S break | H (breakPrep) | Prepare your break: the push works when the square it lands on is supported. | — |
| STRAT (timing) | S king uncastled / dev behind | H | Don't open the centre while your own king is still in it. | — |
| STRAT (tension) | tension present | H (tensionKept) | Keep the tension: the side that takes first often helps the other side develop. | — |
| KNOW (chain) | pawn chain | H (chainBase) | Attack a pawn chain at its base. The base holds up the whole chain. | — |
| KNOW (named) | named structure | H (namedPawnStructure) | Every pawn structure has its typical breaks: in the [name], it's [break]. | name matches |
| seat O | their break | H | Ask every move: which break do they want, and is it ready? | — |
| timing: Learn | S to move, S break | H | Learn: "Their pawn on e4 is the one to challenge." (push held) | never name the push square before the move unasked |
| phase: endgame | ending | H | In the endgame a pawn break is how you create a passed pawn. | — |
| combo: + their king centre | S break opens toward their king | H | The break that opens the centre is the attack when their king hasn't castled. | king uncastled |
| habit | always | H | Every move, ask which pawn break each side wants. | — |

## X — bishop pair, colour complex, minority attack, passer, file

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| STRAT (pair) | S has pair | H | Two bishops work best in an open position: open lines for them. | — |
| CONSEQ (pair given up) | trade gives up pair | H | Giving up a bishop gives up control of its colour. Ask which squares you're giving away. | — |
| IDENT (complex) | bishop gone, theirs remains | H + C: targets on that colour incl. pawns | When your bishop of one colour is gone, their bishop of that colour rules those squares. Watch your pawns on that colour. | their same-colour bishop on board |
| PLAN (complex) | a minor can settle | H | Plant a piece on the weak colour's squares: they have nothing to chase it with. | piece reaches the hole |
| PLAN (minority) | minority attack | H | A minority attack uses fewer pawns to leave their bigger group with a weak pawn. | lever legal |
| PREV (passer, O) | their passer | H | Blockade a passed pawn: the square in front of it is the place to stop it. | — |
| PLAN (passer, S) | own passer | H | Passed pawns must be pushed. | — |
| KNOW (passer) | passer | H | The best blocker of a passed pawn is a knight. | — |
| PLAN (file) | open file | H | Rooks belong on open files. | — |
| combo: complex + bishop given up | trade just played | H | Before you trade a bishop, ask which colour you're giving away. | — |

---

## Data still to compute (C) for these two cards

All chess.js on saved boards plus the saved engine reads. No new engine runs:
- the try's refuting piece, and grouping tries by it;
- counts of attackers vs defenders (try target, best piece's target, weak pawn, break target);
- the same try on the previous board;
- the king's way to castle, and the break toward their king;
- the next piece to develop;
- heavy piece to the file; pins and tied pieces on the target;
- worst piece's route; pawn moves that free a bad bishop;
- the square in front of a weak pawn;
- break consequences: file, lone pawn, SEE;
- the three ways to meet a break;
- colour-complex targets including pawns;
- king safety after a winning line.
