# The mistake causes and their lessons — for David's sign-off

There is one list of causes, kept in the error computer (`MistakeCauseKind`). Every card points its lessons at it. Each cause has one recipe, in this order:
1. **L (lesson):** a general rule, with this board inside it.
2. **C (consequence):** what the mistake leads to.
3. **B (better move + its job):** only once that move is past.
4. **H (habit):** only when your record on that skill is red or grey.

Learn speaks only after the move, and it never names the move just played or your next move.

**Every slot has 3 phrasings of the same idea.** They are rotated on the board, never picked at random, and the facts stay the same. `{…}` is filled from the board. The focus clue and the mission lines are the only lines that stay word-for-word.

---

## A. Causes the error computer already computes

### allowed-mate
- **L**
  - A king with no escape square dies to one check.
  - Mate threats come before everything else.
  - When the king has no room, one check can end the game.
- **C**
  - Their first check, {check}, starts it.
  - It starts with {check}, and there's no way out.
  - {check} is the first of the checks, and they don't stop.
- **B**
  - {better} stopped it by covering {sq}.
  - {better} was the defence, and it took {sq} away from them.
  - {better} gave the king air on {sq}.
- **H**
  - Every move, ask what checks they have.
  - Before you let go, look at every check they could give.
  - Their checks first, every single move.

### missed-mate
- **L**
  - A forced mate beats any material.
  - When their king is short of squares, look at checks first.
  - Mate is worth more than every piece on the board.
- **C**
  - It slipped away.
  - The mate was there, and now it's gone.
  - That was the game, and it got away.
- **B**
  - {better} started it.
  - {better} was the first check of the mate.
  - It began with {better}.
- **H**
  - Checks first, every move.
  - Every time, look at your checks before anything else.
  - Start with checks, then captures, then threats.

### took-guarded
- **L**
  - A piece is only free if nothing can take back.
  - Before you capture, count who takes back: the {piece} on {sq} had the {guard} behind it.
  - A guarded piece isn't a gift, it's a trade.
- **C**
  - You come out {ledger}.
  - The trade leaves you {ledger}.
  - When it settles, you're {ledger}.
- **B**
  - {better} kept {what}.
  - {better} was safer: it kept {what}.
  - {better} held on to {what}.
- **H**
  - Before every capture, ask what takes back.
  - Count the recaptures before you take.
  - Every capture: who takes back, and what's left?

### eyed-guarded
- **L**
  - A threat on a guarded piece isn't a threat.
  - Aiming at a piece that's guarded gets you nothing.
  - Count the guards before you aim at something.
- **C**
  - The {guard} on {sq} holds it, so the attack goes nowhere.
  - The {guard} on {sq} covers it, and the threat is empty.
  - With the {guard} on {sq} behind it, there's nothing to win.
- **B**
  - {better} plus its job.
- **H**
  - Count attackers and defenders before you attack.
  - Before you aim at a piece, count its guards.
  - Attackers against defenders, every time.

### answered-by-check
- **L**
  - A grab is only safe if they have no check first.
  - A check that also hits your piece wins the time back.
  - A free piece isn't free if they can check and hit it at once.
- **C**
  - {check} checks and hits the {piece} on {sq} at once.
  - {check} comes with check and takes aim at the {piece} on {sq}.
  - They answer with {check}, and the {piece} on {sq} is hit too.
- **B**
  - {better} plus its job.
- **H**
  - Before a grab, look at their checks.
  - Check their checks before you take anything.
  - Before you capture, ask whether they have a check that hits back.

### left-hanging
- **L**
  - A piece on a square nothing guards can just be taken.
  - An unguarded piece is a target.
  - Where your piece lands, something has to cover it.
- **C**
  - The {taker} takes the {piece} on {sq}.
  - The {piece} on {sq} falls to the {taker}.
  - The {taker} just picks off the {piece} on {sq}.
- **B**
  - {better} kept it out of reach.
  - {better} kept the {piece} safe.
  - With {better}, the {piece} stayed guarded.
- **H**
  - Before you let go, ask whether the piece is guarded where it lands.
  - Every move, check the landing square: who covers it?
  - Look where the piece is going, and who guards it there.

### abandoned-defender
- **L**
  - A piece that guards something has a job, and when it moves, what it guarded falls.
  - Move a defender and the thing behind it is loose.
  - Every piece is guarding something, so know what before you move it.
- **C**
  - Their {attacker} can take the {piece} on {sq} once the guard has gone.
  - With the guard gone, the {piece} on {sq} drops to their {attacker}.
  - Nothing holds the {piece} on {sq} any more, and the {attacker} takes it.
- **B**
  - {better} plus its job.
- **H**
  - Before a piece moves, ask what it is guarding.
  - What does this piece protect? Ask before it leaves.
  - Check a piece's job before you move it.

### abandoned-fork-square
- **L**
  - A square can need a guard too.
  - A knight that lands on {sq} forks two pieces.
  - Some squares are dangerous on their own: {sq} is where their knight hits two things.
- **C**
  - Their knight is two moves from {sq}, where it hits the {a} and the {b}.
  - Once their knight reaches {sq}, the {a} and the {b} are both attacked.
  - From {sq}, their knight forks the {a} and the {b}.
- **B**
  - {better} kept {sq} covered.
  - {better} still guarded {sq}.
  - With {better}, {sq} stayed yours.
- **H**
  - Look at the squares your pieces guard, not just the pieces.
  - Before you move, check which squares go unguarded.
  - Watch the squares as well as the pieces.

### walks-into-fork
- **L**
  - Two pieces a knight's jump apart are a fork waiting to happen.
  - Pieces that a knight can hit at once are in danger.
  - Line up two pieces a knight's move apart and you invite the fork.
- **C**
  - {fork} hits the {a} and the {b}, and you can save only one.
  - The {a} and the {b} are both hit by {fork}, so one goes.
  - {fork} forks the {a} and the {b}.
- **B**
  - {better} plus its job.
- **H**
  - After your move, check every square their knight can reach.
  - Where can their knight jump next? Look before you let go.
  - Count the knight's squares before you put two pieces near it.

### allowed-capture
- **L**
  - Something was left loose, and they just take it.
  - A loose piece doesn't stay on the board for long.
  - Leave something unguarded and it gets taken.
- **C**
  - They win {what}.
  - That's {what} gone.
  - They pick up {what}.
- **B**
  - {better} kept {sq} guarded.
  - {better} held {sq}.
  - With {better}, {sq} stayed covered.
- **H**
  - Before you let go, scan their captures.
  - Every move, ask what they can take.
  - Look at their captures first.

### allowed-threat
- **L**
  - A move that lets them hit something with tempo hands them the initiative.
  - Give them a free attack and they take the lead.
  - When your piece can be hit with tempo, you lose a move getting it out.
- **C**
  - {reply} hits the {piece} on {sq}, and it has to move.
  - The {piece} on {sq} gets chased by {reply}.
  - {reply} attacks the {piece} on {sq}, and you spend a move.
- **B**
  - {better} plus its job.
- **H**
  - Ask what their best reply attacks.
  - Before you move, ask what they hit next.
  - Look for their most annoying reply.

### king-hunt
- **L**
  - A king without pawn cover can be chased across the board.
  - Open up your king and the checks keep coming.
  - The pawns in front of your king are its shield.
- **C**
  - {check1} and {check2} both come with check.
  - They start with {check1}, then {check2}.
  - The king gets chased: {check1}, then {check2}.
- **B**
  - {better} kept the king covered.
  - {better} kept the shield in place.
  - With {better}, the king stayed safe.
- **H**
  - Count their checks before you open your king.
  - Before you move a pawn in front of your king, count their checks.
  - Every pawn move near your king, ask who gets in.

### missed-win
- **L**
  - When their piece is loose, look for the capture first.
  - A loose piece of theirs is a chance to grab.
  - When they leave something hanging, take it.
- **C**
  - It was there to win {what}.
  - {what} was free for the taking.
  - You could have won {what}.
- **B**
  - {better} won it.
  - {better} was the capture.
  - {better} picked it up.
- **H**
  - Every move, look at checks, captures and threats first.
  - Checks, captures, threats: every time.
  - Before a quiet move, look for the forcing ones.

### still-hanging (their slip)
- **L**
  - A threat they don't take is still a threat.
  - Their miss doesn't fix your problem.
  - Just because they didn't take it doesn't make it safe.
- **C**
  - Your {piece} on {sq} is still loose.
  - The {piece} on {sq} is still attacked.
  - The {piece} on {sq} can still be taken.
- **B**
  - n/a
- **H**
  - Every move, check which of your pieces are still attacked.
  - Look again: what of yours is still loose?
  - After their move, recheck your loose pieces.

### gambit-offer
- **L**
  - A pawn offered to open a file is a practical try, not a free pawn.
  - Giving a pawn for a file is a bet, not a gift.
  - The pawn is the price, and the file is what you get.
- **C**
  - If they take, the {file}-file opens toward their king.
  - Taking opens the {file}-file at their king.
  - The pawn goes, and the {file}-file opens.
- **B** and **H**
  - Review only.

### Two more rows
- **positional:** each tag gets 3 phrasings, taken from the error computer card (E15). The note names the consequence, never the move just played.
- **unexplained:** silent, and logged.

---

## B. New causes

### ignored-threat
Fires when their last move made a threat, your move didn't answer it, and the threat lands.
- **L**
  - A threat doesn't go away by itself: answer it, or make a bigger one.
  - Their last move said what it wanted: the {piece} on {sq}.
  - When they attack something, that comes before your own plan.
- **C**
  - The {piece} on {sq} falls to the attack you left.
  - The attack lands, and the {piece} on {sq} goes.
  - They carry out the threat and take the {piece} on {sq}.
- **B**
  - {better} answered it by {job}.
  - {better} met the threat: {job}.
  - {better} was the answer, {job}.
- **H**
  - After every move of theirs, ask what it attacks.
  - Their move first: what does it threaten?
  - Before your plan, read their last move.

### tempo-wasted
Fires when the move does nothing their best line has to answer: a check that changes nothing, chasing a piece that just goes back, or retreating a piece you just developed.
- **L**
  - Every move should add something, and a move they can ignore is a move given away.
  - A check that changes nothing hands them the move.
  - In the opening, time is a piece too.
- **C**
  - They use the time: {their gain}.
  - That free move goes to them: {their gain}.
  - They get a move for nothing: {their gain}.
- **B**
  - {better} plus its job.
- **H**
  - Before you move, ask what it makes them do.
  - If they can ignore it, don't play it.
  - Every move, ask: does this force anything?

### colour-conceded
Fires when you trade your last bishop of one colour while they keep theirs. The targets are your pawns and squares on that colour.
- **L**
  - Trading off your {colour}-squared bishop hands them the {colour} squares, and {target} is the first target.
  - Without your {colour}-squared bishop, nothing of yours fights for the {colour} squares, so {target} feels it first.
  - Your last {colour}-squared bishop was holding the {colour} squares; give it up and they belong to them, starting with {target}.
- **C**
  - Their bishop on {sq} now rules the long diagonal.
  - Their bishop on {sq} has the diagonal to itself.
  - Nothing challenges their bishop on {sq} any more.
- **B**
  - {better} kept it, guarding {target} from {sq}.
  - {better} kept the bishop, and with it {target}.
  - With {better} the bishop stays and covers {target} from {sq}.
- **H**
  - Before you trade a bishop, ask which colour you're giving away.
  - Which squares does this bishop hold? Ask before you trade it.
  - Trade a bishop only when you know whose squares those become.

### traded-into-target
Fires when your trade leaves a pawn of yours fixed, isolated or backward where their pieces can reach it.
- **L**
  - A trade changes the pawns as well as the pieces: this one leaves your pawn on {sq} alone.
  - After a trade, look at what's left: your pawn on {sq} has no friends now.
  - Every trade leaves a pawn structure behind, and this one leaves a weak pawn on {sq}.
- **C**
  - Their {piece} can sit in front of it and pile up.
  - They can aim at it again and again.
  - It becomes the thing they attack for the rest of the game.
- **B**
  - {better} plus its job.
- **H**
  - Before you trade, look at the pawns that are left.
  - What does the trade do to your pawns? Ask first.
  - Count the weak pawns after the trade, not just the material.

### passer-handed
Fires when your move gives them a passed pawn, or lets theirs run.
- **L**
  - A passed pawn has to be kept under lock and key, and the one on {sq} now has a free road.
  - Give them a passed pawn and you'll spend pieces stopping it.
  - A pawn with nothing in front of it runs, and the one on {sq} just got loose.
- **C**
  - It is {n} squares from queening, and your king is {far}.
  - It has {n} squares to go, and your king is {far}.
  - It's {n} squares from a queen, and your king can't catch it.
- **B**
  - {better} kept it blocked on {sq}.
  - {better} kept a piece in front of it on {sq}.
  - With {better}, it stayed stuck on {sq}.
- **H**
  - Before you trade pawns, ask whether one of theirs comes out free.
  - Watch for a pawn of theirs with an open road.
  - Every pawn trade, check what it leaves free.

### compensation-lost
Fires when you gave material for an attack, then made a quiet move and the attack faded.
- **L**
  - When you're down material for an attack, every move must keep the pressure.
  - A sacrifice only pays while they're busy, and one quiet move lets them breathe.
  - Down material, you have to keep asking questions.
- **C**
  - They have time to {consolidate}, and you're just down {material}.
  - They {consolidate}, and now it's just {material} down.
  - The attack fades, and you're left {material} down.
- **B**
  - {better} kept the attack going by {job}.
  - {better} kept them busy: {job}.
  - {better} kept the pressure on, {job}.
- **H**
  - After a sacrifice, ask every move whether this keeps them busy.
  - Down material, every move must threaten something.
  - After a sacrifice, never give them a quiet move.

### stalemate
Fires when your winning side leaves their king with no legal move and no check.
- **L**
  - A king with no legal move and no check is stalemate, and a win becomes a draw.
  - Leave their king no squares without checking it and the game is drawn.
  - Stalemate turns a won game into a draw: their king needs a move.
- **C**
  - The game is drawn.
  - It's a draw on the spot.
  - That's half a point thrown away.
- **B**
  - {better} left it a square.
  - {better} gave the king room to move.
  - With {better}, the king had {sq}.
- **H**
  - When they have only the king, check its moves before every move.
  - Every move against a bare king, count its squares.
  - Before you move, make sure their king can still move.

### technique-broken
Fires when a known winning or holding method was broken: the king left the key square, the rook went in front of the passer, or the opposition was lost.
- **L**
  - Endings have rules that win by themselves: {rule}.
  - In this ending the rule is {rule}, and it does the work for you.
  - Some endings are won by method, not calculation: {rule}.
- **C**
  - The win slips: {consequence}.
  - Without it, {consequence}.
  - Now {consequence}.
- **B**
  - {better} kept {rule-piece} on {sq}.
  - {better} followed the rule: {rule-piece} on {sq}.
  - With {better}, {rule-piece} stayed on {sq}.
- **H**
  - In the ending, play the rule before you calculate.
  - Know the rule of the ending first.
  - Endings: method first, then moves.

---

## C. The 9 motifs with no rule today

Each motif has a lesson for three cases:
- **allowed:** your mistake let them play it;
- **missed:** you could have played it;
- **habit.**

### hanging piece
- **allowed**
  - A piece nothing guards can just be taken.
  - An unguarded piece is a target.
  - Loose pieces drop off.
- **missed**
  - When their piece is loose, take it before anything else.
  - A loose piece of theirs is free material.
  - They left it unguarded, so take it.
- **habit**
  - Every move, check what's loose, theirs and yours.
  - Look for loose pieces on both sides.
  - Loose pieces first, every move.

### deflection
- **allowed**
  - A defender that gets dragged away stops defending: the {piece} on {sq} was guarding {target}.
  - Lure the guard away and what it guarded falls.
  - Your {piece} on {sq} had one job, guarding {target}, and it got pulled off it.
- **missed**
  - Pull the guard away and what it guarded falls.
  - Their {piece} was holding {target}, so drag it off.
  - Make the defender take something, and its job is gone.
- **habit**
  - Ask which of their pieces is doing a job, and how to drag it off.
  - Find their busiest defender and give it a reason to move.
  - Look at what each defender is holding.

### interference
- **allowed**
  - A piece dropped between two of yours cuts the line that connected them.
  - Block a line and the piece behind loses its guard.
  - When they step in between, your pieces stop helping each other.
- **missed**
  - Block the line their defender guards along, and the target hangs.
  - Cut the line between their pieces.
  - Put a piece in the way of their defence.
- **habit**
  - Look at the lines your pieces guard along.
  - Watch the lines between your pieces.
  - Every guard runs along a line, so watch what can block it.

### clearance
- **allowed**
  - They moved one piece out of the way to open a line for another.
  - A piece that steps aside can unleash the one behind it.
  - When their piece clears a line, look at what's behind it.
- **missed**
  - Sometimes your own piece is in the way: move it with a threat and the line opens.
  - Clear the line, and the piece behind strikes.
  - Your piece was blocking a better one, so move it with tempo.
- **habit**
  - Ask which of your pieces is blocking a better one.
  - Look at what your own pieces block.
  - Check the lines your pieces are standing on.

### zwischenzug
- **allowed**
  - Before you recapture, look for their in-between move.
  - They don't have to take back straight away, and neither do you.
  - A check or a bigger threat can come before the recapture.
- **missed**
  - You don't have to take back at once: a check or bigger threat first can win more.
  - Look for an in-between move before you recapture.
  - Before the obvious recapture, look for something stronger.
- **habit**
  - Before every recapture, ask whether there's something better in between.
  - Recaptures aren't automatic.
  - Check for an in-between move every time.

### x-ray
- **allowed**
  - A piece behind another still counts: the {piece} on {sq} hit through.
  - Count the pieces behind, not just the front one.
  - The piece at the back of a line still has a say.
- **missed**
  - Line up behind your own piece: when the front one moves, the back one strikes.
  - A battery hits through.
  - Two pieces on one line count as two attackers.
- **habit**
  - Count every piece on a line, including the ones behind.
  - Look along the whole line.
  - Behind every piece, look for another.

### promotion
- **allowed**
  - A pawn two squares from queening is worth a piece, so stop it before it runs.
  - A runaway pawn costs you a piece to stop.
  - Let a pawn get close and it becomes a queen.
- **missed**
  - When your pawn can queen with tempo, the queen is the threat that wins.
  - Your pawn was close enough to run.
  - Push the passer when it gains time.
- **habit**
  - Every move, check which pawns can run.
  - Watch the passed pawns on both sides.
  - Count how far each passer is from queening.

### checkmate
- Uses allowed-mate and missed-mate from section A.

### tactical sequence
- Named by the motif it lands on. The set-up move is named with it, read from the full line.

---

## D. Habits

The record decides how much of a habit is said:
- **RED or GREY:** the full habit, in one of its 3 phrasings, rotated.
- **AMBER:** one short clause.
- **GREEN:** nothing.

## Owner calls on this page

1. **Wording.** Sign off on sections B and C, or change them.
2. **Nimzowitsch.** The "lock and key" line from Nimzowitsch is now said plainly, without the quote. Keep it plain, or quote him?
