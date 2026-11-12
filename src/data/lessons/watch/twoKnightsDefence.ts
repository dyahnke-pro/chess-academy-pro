// Two Knights Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=two-knights-defence`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move, the app's teaching computers, and (pass two) the engine's second-order
// lines, the squares a pawn move gives up for good, what club players get wrong
// and each line's plan. Said the way Naroditsky teaches (the Danya style sheet).
// Standard: docs/OPENING-WATCH-BEATS.md. The student plays Black.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Be7', 'O-O', 'O-O', 'Re1', 'd6', 'c3', 'Na5', 'Bb5', 'a6', 'Ba4', 'b5', 'Bc2', 'c5', 'Nbd2', 'Nc6', 'Nf1', 'Re8', 'h3', 'h6', 'Ng3', 'Be6', 'd4', 'cxd4', 'cxd4', 'exd4', 'Nxd4', 'Nxd4', 'Qxd4', 'Rc8', 'Bb3', 'd5', 'e5', 'Nd7', 'Nh5', 'Bc5', 'Qf4', 'Qg5', 'Qxg5', 'hxg5', 'Bxg5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["Everything here starts with e4: the pawn takes the center and opens a road for the bishop on f1. Keep your eye on that bishop. In two moves it lands on c4, aimed at f7, the one square in your camp that only your king guards.", 'e4 — center, frees the f1-bishop.'],
  ["How do you meet e4? …e5 is the classical answer: pawn against pawn, your own share of the center, and the bishop on f8 can come out. In an open game like this one rule decides most fights: whoever has more pieces out when the center opens.", '…e5 — meets e4 head-on.'],
  ["Develop with a threat when you can, and Nf3 does exactly that: the knight hits your e5 pawn, which nothing guards. And if you ignore it with …Nf6 or …d6, d4 comes next and adds a second attacker.", 'Nf3 — develops and hits e5.'],
  ["Defend e5 with a pawn, or with a piece? …d6 holds it, but that pawn shuts in your bishop on f8. …Nc6 guards it with a piece that wanted to come out anyway. That's the rule: defend with a move that develops.", '…Nc6 — develops and guards e5.'],
  ["Bc4, the Italian, and the bishop goes straight for your weak point: f7, guarded only by your king. Remember that square. Most of the sharp lines in this course turn on it, and your next move decides how you meet it.", 'Bc4 — the bishop aims at f7.'],
  ["Here's the move the opening is named for: …Nf6, the second knight. Instead of guarding f7, you counterattack, because the knight hits e4 and nothing guards it. Now the question is theirs: open the center with d4, guard e4 with d3, or ignore it and go for f7 with Ng5. Each of those has its own tab.", '…Nf6 — two knights out, hits e4.'],
  ["d3 is the quiet answer: e4 gets a pawn guard, and the bishop on c1 can breathe. Club players reach for Ng5 more often, but this is the masters' road, a slow game where both sides finish developing and the fight comes later.", 'd3 — guards e4, a quiet game.'],
  ["Where does this bishop belong? On c5 it's more active, and it's the club favourite. …Be7 is the solid choice: it clears the way to castle next move, and behind your pawns nothing of theirs can hit it. In a slow game, safe beats active.", '…Be7 — solid, castle next.'],
  ["They castle, and the rook on f1 is one step from e1, where it backs up e4. And look at f7: once your king goes to g8, their bishop on c4 pins that pawn to it.", 'O-O — king safe, rook to e1 next.'],
  ["You castle too, and here's the price: with your king on g8, the bishop on c4 pins your f7 pawn to it. That bishop is their best piece. Your next few moves are a plan in themselves: chase it off that diagonal, or trade it.", '…O-O — safe, but f7 is pinned.'],
  ["Re1 puts a second guard behind e4, and it empties f1. Why does f1 matter? It's the middle stop on their queen's knight's road to the kingside, from d2 through f1.", 'Re1 — backs up e4, frees f1.'],
  ["…d6 does two quiet jobs: it gives e5 a pawn guard and opens the diagonal for your bishop on c8. The point comes next move. With e5 held by a pawn, your knight on c6 is free to leave, and it has a bishop to hunt.", '…d6 — props up e5, frees c8.'],
  ["c3 is the Italian's slow plan: a pawn on c3 so d4 can come with support behind it. It also empties c2, a retreat square for the bishop on c4. Keep that square in mind, because your next move sends the bishop looking for one.", 'c3 — prepares d4, empties c2.'],
  ["Here's the hunt: …Na5 hits the bishop on c4. A knight on the rim, yes, but it's there on business. If the bishop takes on f7 with check, …Rxf7 wins it for a pawn, so it has to move, or let itself be traded.", '…Na5 — hunts the bishop on c4.'],
  ["The natural retreat is Bb3, and then …Nxb3 trades it anyway and doubles their pawns. So they keep the bishop with Bb5, the engine's choice, out of your knight's reach. Notice the side effect: from b5 it no longer pins f7.", 'Bb5 — keeps the bishop, unpins f7.'],
  ["Ask again: …a6. The bishop can't take on a6, because …bxa6 wins it for a pawn. Every move it spends running is a move their knight on b1 and bishop on c1 stay at home.", '…a6 — chases the bishop again.'],
  ["Ba4 is the only good square. b4, hitting your knight, looks tempting, but …axb5 takes the bishop first, and after bxa5 your rook takes back: a bishop and a pawn for a knight. And Bc4 just walks into …Nxc4.", 'Ba4 — b4 would lose the bishop.'],
  ["…b5 kicks it a third time and grabs space on the queenside. If you know the Chigorin Ruy Lopez, you've seen this picture: a knight on a5, pawns on b5 and c5, their bishop tucked away on c2. Same ideas, same squares.", '…b5 — hits the bishop, gains space.'],
  ["Bc2, and the bishop is safe at last, on the square c3 emptied for it. But count the cost: four moves with one bishop, while their knight on b1 and bishop on c1 still haven't moved.", 'Bc2 — safe, after four bishop moves.'],
  ["…c5, and now d4 is yours. Their whole plan with c3 was the d4 break, and it runs straight into your pawns on c5 and e5. The knight on a5 has done its job. Watch it come back to the center.", '…c5 — clamps d4, the chase is over.'],
  ["Where does their last knight go? Their own pawn sits on c3, and on the rim your b-pawn would kick it. So Nbd2 starts a classic tour through f1 toward the kingside. That's what Re1 cleared f1 for.", 'Nbd2 — the knight heads for f1.'],
  ["The knight comes home: …Nc6. Its job on a5 was the bishop, and that's done. On c6 it joins your c5 and e5 pawns on d4: three of yours on that square against two of theirs, so their break needs more preparation.", '…Nc6 — back home, eyes d4.'],
  ["Nf1, the middle of the tour. On f1 the knight does very little, but it's only a stop: next comes g3, and from there it can jump to f5 or h5, right in front of your king.", 'Nf1 — on its way to g3.'],
  ["…Re8 puts your rook opposite theirs on the e-file. When the center opens, that file opens with it, and your rook is already there. It also frees f8, a quiet retreat square for the bishop on e7.", '…Re8 — meets their rook on the e-file.'],
  ["h3 is prophylaxis: it takes g4 away from your bishop, so …Bg4, pinning the knight on f3 to their queen, never happens. That knight is one of the pieces backing d4, and they want it free when the break comes.", 'h3 — keeps your bishop off g4.'],
  ["And you do the same on your side: …h6 takes g5 away. On g5 their bishop would hit your knight on f6, and a knight would hit f7. Now neither can land there.", '…h6 — no Bg5, no Ng5.'],
  ["Ng3, and the tour is done: d2, f1, g3. From g3 the knight eyes f5 and h5, the squares in front of your king. So where does your last minor piece go?", 'Ng3 — tour done, eyes f5.'],
  ["To e6. The bishop covers f5, so their knight can't jump in, and now every one of your minor pieces is out. That matters right now: their d4 break is ready, and when the center opens, the side with everything out wins the fights.", '…Be6 — covers f5, all pieces out.'],
  ["Here's the break they built for with c3: d4, hitting your pawns on c5 and e5 at once. Both sides are fully developed, so the center opens with everyone ready. If you take with the c-pawn, they take back with a pawn.", 'd4 — the break, hits c5 and e5.'],
  ["Which pawn takes? Both are fine, but …cxd4 first opens the c-file, and your e-pawn can still take on d4 next. Follow that file: a few moves from now, it's where your rook goes.", '…cxd4 — opens the c-file.'],
  ["They take back with the pawn, and now the c-file is open, with no pawn on it at all. The first rook to reach it owns it, and right now neither side has one there.", 'cxd4 — the c-file is open.'],
  ["…exd4, and you're a pawn up for the moment. But count it: their knight and queen both hit d4, and only your knight on c6 guards it. So the pawn comes back, and after the trades your d6 pawn stands alone, with no c- or e-pawn beside it.", '…exd4 — a pawn up, for a moment.'],
  ["Nxd4 wins the pawn back with a threat: the knight hits your knight on c6, which has no guard, and your bishop on e6 and your b5 pawn too. What's the simplest answer?", 'Nxd4 — pawn back, hits c6 and e6.'],
  ["Trade it: …Nxd4. Your knight even hits the bishop on c2 on the way, but on d4 it has no guard, so the queen takes back. One trade, and the pressure on e6 and b5 is gone.", '…Nxd4 — trade the knights.'],
  ["Qxd4 puts the queen in the middle, hitting d6 and your knight on f6. Both are guarded. But a queen this far forward is a target. If you push …d5 now, e5 hits your knight; if you play …Nd7, Nh5 piles onto g7.", 'Qxd4 — central queen, hits d6.'],
  ["Remember the c-file you opened with …cxd4? …Rc8 takes it first, with a threat: the bishop on c2 has no guard. That's the order to remember: grab the open file before their rooks can.", '…Rc8 — open file, hits c2.'],
  ["Bb3 saves the bishop with an offer: now it faces yours on e6. If you take, axb3 doubles their pawns, and that's a fine game. The main line does something sharper with its d-pawn.", 'Bb3 — saves it, offers a trade.'],
  ["…d5, the break. It hits e4, blocks the bishop on b3, and accepts an isolated pawn on d5. Here's what you can't see yet: with the d-pawn gone from d6, your bishop on e7 can reach c5 and hit the queen on d4. That time pays for the pawn.", '…d5 — the break, an isolated pawn.'],
  ["They don't take: e5 kicks the knight off f6 and grabs space. But it comes with a gift: with their e-pawn pushed past it, your d5 pawn is passed, and no pawn of theirs can ever stop it.", 'e5 — kicks the knight; d5 is passed.'],
  ["Where does the knight go? …Ne4 looks active, but f3 kicks it right back. On d7 it's safe, it hits e5, and once the bishop leaves e7, your queen's diagonal opens all the way to g5. Remember that.", '…Nd7 — safe square, hits e5.'],
  ["Nh5 jumps toward your king and hits g7, which only your king guards. It's sharp, but look at the knight: out on h5 it has no guard at all. The next two moves turn on that.", 'Nh5 — hits g7, but hangs loose.'],
  ["…Bc5 does two jobs. It hits the queen on d4, and the queen can't take on c5, because your knight takes back. And it clears e7, so your queen now sees down to g5, right next to the loose knight on h5.", '…Bc5 — hits the queen on d4.'],
  ["Where does their queen go? Qd1 or Qd3 looks safe, but …Qh4 hits the knight on h5 and f2 at once. On f4 the queen guards f2 and covers h4. Still, f2 stays pinned to their king by your bishop.", 'Qf4 — guards f2, covers h4.'],
  ["…Qg5 offers a queen trade, and it hits the knight on h5, which has no guard. If they don't take, that knight is in trouble. If they do, the queens come off, and in an endgame your passed d-pawn counts for even more.", '…Qg5 — offers a trade, hits h5.'],
  ["They take, and that saves the knight: with the queens off, nothing hits h5 any more. You have one way to take back. But is there a check to throw in first?", 'Qxg5 — queens come off.'],
  ["Is there a check first? …Bxf2 check looks tempting, but the king just takes it, and you've given a bishop for a pawn. So …hxg5. Note the new pawn on g5 has no guard: their bishop on c1 can take it.", '…hxg5 — takes back; g5 is loose.'],
  ["Bxg5 picks up that pawn, so they're a pawn up, and still it's about level. Why? Your d5 pawn is passed and your rook owns the c-file. Your plan: …d4. The bishops trade on e6, your rook takes back, and your other bishop drops to b6, behind the pawn that is your main trump.", 'Bxg5 — a pawn for them; …d4 next.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });


/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Two Knights: Italian Two Knights d4': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd4', 'exd4', 'e5', 'd5', 'Bb5', 'Ne4', 'Nxd4', 'Bd7', 'Bxc6', 'bxc6', 'O-O', 'Bc5', 'Be3', 'O-O', 'f3', 'Ng5', 'f4', 'Ne4', 'Nd2', 'Nxd2', 'Qxd2', 'Re8', 'Rae1'],
  'Two Knights: Fried Liver Defence 5...Na5': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Be2', 'h6', 'Nf3', 'e4', 'Ne5', 'Bd6', 'f4', 'exf3', 'Nxf3', 'O-O', 'd4'],
  'Two Knights: Traxler Counterattack': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'Bc5', 'Nxf7', 'Bxf2+', 'Kxf2', 'Nxe4+', 'Kg1', 'Qh4', 'g3', 'Nxg3', 'hxg3', 'Qxg3+'],
  'Two Knights: Max Lange Attack': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd4', 'exd4', 'O-O', 'Nxe4', 'Re1', 'd5', 'Bxd5', 'Qxd5', 'Nc3', 'Qd8', 'Rxe4+', 'Be7', 'Nxd4', 'f5', 'Rf4', 'O-O'],
  'Two Knights: Quiet Italian d3 with ...Be7': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Be7', 'O-O', 'O-O', 'Re1', 'd6', 'a4', 'Na5', 'Ba2', 'c5', 'c3', 'Nc6', 'Nbd2', 'Be6', 'Bxe6', 'fxe6', 'Nf1'],
  'Two Knights: Fritz Variation 5...Nd4': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nd4', 'c3', 'b5', 'cxd4', 'bxc4', 'dxe5', 'Qxd5', 'exf6', 'Qxg5', 'fxg7', 'Bxg7', 'O-O', 'Bb7'],
  'Two Knights: Ulvestad Variation': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'b5', 'Bf1', 'Nd4', 'c3', 'Nxd5', 'cxd4', 'Qxg5', 'Bxb5+', 'Kd8', 'Qf3', 'Bb7'],
  'Two Knights: 4.d3 Main Line with ...Be7': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Be7', 'O-O', 'O-O', 'Re1', 'd6', 'c3', 'Na5', 'Bb3', 'Nxb3', 'axb3', 'Bg4', 'Nbd2', 'a6', 'Nf1', 'h6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Two Knights: Italian Two Knights d4': [
    ["d4 is the sharp road: no slow d3, the center opens at once, and e4 is left without a guard. They're betting that speed is worth more than a pawn. After you take, they choose: kick your knight with a pawn, or castle and let you have e4.", 'd4 — opens the center at once.'],
    ["Take it: …exd4. You're a pawn up, and e4 still hangs to your knight on f6. They can't just leave it, so watch how they deal with that knight: a pawn kick here, a castle and a pin on the Max Lange tab.", '…exd4 — a pawn up, e4 still loose.'],
    ["e5 kicks the knight before it can take on e4, and notice what they skip: taking back on d4. That pawn isn't running away, so the threat comes first. Where does your knight go?", 'e5 — kicks the knight off f6.'],
    ["Don't retreat. Hit back: …d5 attacks the bishop on c4. …Ne4 at once is the other try, but Qe2 just hits it again. With …d5 first, the knight gets a pawn to stand on, and their bishop has to move.", '…d5 — counterattack, hits c4.'],
    ["Bb5 is the move: the bishop steps out of the attack and pins your knight on c6 to your king. Why that knight? It's the only piece guarding your d4 pawn, so the pin is really aimed at d4.", 'Bb5 — pins the knight guarding d4.'],
    ["The knight on f6 still has to move, and forward is best: …Ne4, a post your d5 pawn guards, hitting f2. Dropping back with …Ng8 just hands over d4 to Nxd4.", '…Ne4 — central post, guarded by d5.'],
    ["Nxd4 takes the pawn back, and your knight on c6 can't recapture: it's pinned. Now c6 is hit twice, by the bishop and the knight, and only your b7 pawn guards it. How do you hold it?", 'Nxd4 — pawn back, two hits on c6.'],
    ["Two ways to meet it. …Bc5 develops with a hit on the knight. …Bd7 gives c6 a second guard and ends the pin, since the bishop now stands in between. The main line picks …Bd7, ready to take back on c6 with a pawn.", '…Bd7 — guards c6, ends the pin.'],
    ["Bxc6 is the engine's choice: they give up the bishop, and on c6 it hits your d5 pawn, which has no guard, and pins your bishop on d7 to your king. So which piece takes back?", 'Bxc6 — trade, and d5 hangs.'],
    ["The pawn takes: …bxc6 guards d5 again, and you keep both your bishops. The price is doubled c-pawns. Follow it forward: in the open position this line heads for, those two bishops are your long-term trump.", '…bxc6 — guards d5, bishop pair.'],
    ["They castle and get the king off the e-file before it opens. Watch for f3 next, a pawn that kicks your knight off e4. If you play …Be7 now, that's exactly what comes.", 'O-O — king safe, f3 is coming.'],
    ["…Bc5 develops with a hit on the knight on d4 and clears the way to castle. Their queen guards the knight, so nothing hangs, but they have to keep it covered. And if f3 kicks your knight, it steps back to g5.", '…Bc5 — hits d4, castle next.'],
    ["Be3 gives the knight on d4 a second guard. Why not f4? There your g-pawn kicks it with …g5. Their plan is simple: hold d4, then kick your knight with f3.", 'Be3 — a second guard for d4.'],
    ["You castle, and both kings are safe. Now look at e5: right now nothing guards it. That pawn is their spearhead, and the next few moves are about whether they can prop it up with f4.", '…O-O — safe; e5 has no guard.'],
    ["Here's f3, hitting your knight on e4. It has a cost: no pawn of theirs can ever guard e3 again, and your bishop on c5 can land there in two moves, through d4.", 'f3 — kicks the knight off e4.'],
    ["Where does the knight go? …f5, propping it up, looks natural, but fxe4 simply takes it, and you've given a knight for a pawn. So it steps back to g5, out of the pawn's reach.", '…Ng5 — sidesteps; …f5 loses the knight.'],
    ["f4 kicks the knight again and backs e5 with a pawn. That's their dream setup: e5 and f4, space on the kingside. But look at the square they just left behind: e4, where no pawn of theirs can ever kick a piece again.", 'f4 — kicks it again, backs e5.'],
    ["And there's your answer: …Ne4, back to the square they just gave up. Now it's a real outpost, since no pawn can chase it. They are a little better on space, but this knight is why they have to spend a move trading it off.", '…Ne4 — back to the outpost.'],
    ["Nd2: if they can't kick your knight, they'll trade it. The knight on d2 challenges it head-on. And if you push …f6 instead of taking, they simply take on e4 themselves.", 'Nd2 — offers to trade knights.'],
    ["…Nxd2 accepts the trade, and your knight even hits the rook on f1 before it's taken back. They are a little better now. So which piece takes back? It isn't the obvious one.", '…Nxd2 — the trade.'],
    ["Why the queen and not the bishop? Bxd2 takes the last guard off the knight on d4, and …Bxd4 with check wins it. So the queen takes, and the knight keeps both its guards.", 'Qxd2 — keeps the knight on d4 guarded.'],
    ["…Re8 lines up on e5, but this is a real slip: the engine prefers …Bb6 first. Your bishop on c5 is a target, and Nb3 is coming to hit it. Move it before it's chased. They are a little better here.", '…Re8 — eyes e5; …Bb6 was better.'],
    ["Rae1 brings their last rook to the center. They are a little better: e5 and f4 give them kingside space. Your plan is patient: …a5 for room on the queenside, the dark-squared bishop back to f8 where it's safe, and the other one out to f5. Your two bishops are the long game.", 'Rae1 — rooks central; …a5 and …Bf8 next.'],
  ],
  'Two Knights: Fried Liver Defence 5...Na5': [
    ["Ng5 ignores e4 and goes straight for f7: knight and bishop on a square only your king guards. The threat is Nxf7, forking your queen and the rook on h8. It's the club players' favourite, so you have to know the answer.", 'Ng5 — two attackers on f7.'],
    ["How do you defend f7? Not by guarding it. Block the bishop: …d5 stands on its diagonal to f7 and hits the bishop and e4 at once. …Bc5 instead lets their knight take on f7, hitting your queen and rook at once, and that gamble is the Traxler, on its own tab.", '…d5 — blocks the bishop, hits c4.'],
    ["exd5 takes back and hits your knight on c6, and the pawn is guarded only by the bishop on c4. So the knight has to move, and here's the question every Two Knights player has to get right: where?", 'exd5 — hits c6; where does it go?'],
    ["Nearly half of club players take back with …Nxd5, and it's the classic mistake: Nxf7 sacrifices the knight, …Kxf7, Qf3 check, and your king has to walk out to e6. That's the Fried Liver. …Na5 instead hits the bishop, the only guard of d5.", '…Na5 — hits the bishop guarding d5.'],
    ["Bb5 check is the bishop's escape, and it comes with tempo. But look what it left behind: the d5 pawn has no guard now, and that's what your next move goes after.", 'Bb5+ — escapes with check; d5 is loose.'],
    ["Block with …c6: the pawn stops the check and hits both the bishop and the d5 pawn. If the bishop just steps away, …cxd5 gets your pawn back. Blocking with …Bd7 instead lets Qe2 hit e5 and guard the bishop at once.", '…c6 — blocks, hits b5 and d5.'],
    ["dxc6 is forced: any bishop retreat lets …cxd5 take your pawn back. So now you're two pawns down, and the new pawn on c6 hits b7. Don't panic. It's about level, as long as you take back the right way.", 'dxc6 — a second pawn, hits b7.'],
    ["Which piece takes? The pawn: …bxc6 hits the bishop on b5 again, so it has to move a second time. That's the logic of the whole gambit: take back with the move that comes with a threat, and every move their bishop spends running is one you spend developing.", '…bxc6 — the pawn takes, hitting b5.'],
    ["Be2 is fine. The move most club players reach for is Ba4, and it costs them: …h6 kicks the knight, …e4 kicks it again, and …Bc5 follows. Now count what you have for the pawn: time, and a knight on g5 far from home.", 'Be2 — fine; Ba4 is the club mistake.'],
    ["Now the gambit pays: …h6 kicks the knight on g5, which has no guard. That's the pattern of this whole line: every move you make comes with a threat, while their queenside sits at home.", '…h6 — kicks the knight on g5.'],
    ["Nf3 hits your e5 pawn. The masters split almost evenly here between Nf3 and Nh3, so this is a real choice. On f3, though, the knight walks straight into your next move.", 'Nf3 — hits e5, walks into …e4.'],
    ["Don't defend e5. Push it: …e4 kicks the knight again. And it does something lasting: their d-pawn is stuck. One step forward runs into a capture, and two steps get taken en passant.", '…e4 — kicks the knight, freezes d2.'],
    ["Ne5 is the only good square. Back to g1 loses more time, and Nh4 runs into …g5, trapping the knight on the edge. From e5 it hits your c6 and f7 pawns.", 'Ne5 — forward, hits c6 and f7.'],
    ["Two good squares for this bishop: on c5 it would eye f2, but …Bd6 hits the knight on e5 at once. And the knight has no guard: if they castle now, …Bxe5 just wins it.", '…Bd6 — develops, hits e5.'],
    ["f4 props up the knight, but the engine prefers d4, and here's why: their f-pawn just stepped past your e4 pawn with a two-square move, so you can take it en passant.", 'f4 — guards e5; d4 was better.'],
    ["…exf3 en passant: your pawn takes as if theirs had moved only one square. Now the knight on e5 has lost its pawn guard. If a pawn or the bishop takes back on f3, …Bxe5 wins the knight, so the knight itself has to take: its fifth move of the game.", '…exf3 — en passant; e5 is loose.'],
    ["Nxf3 is forced, so look at the scoreboard: their queenside hasn't moved, their king is still on e1, and the e-file in front of it is open. You're a pawn down and a little better.", 'Nxf3 — forced; the knight\'s fifth move.'],
    ["You castle first, and compare the kings: yours is safe on g8, theirs is still on e1, on an open file. That's what your pawn bought. A rook on e8 is the obvious next step.", "…O-O — your king is safe, theirs isn't."],
    ["d4 grabs the center, but it gives up e3 for good: no pawn of theirs can ever cover it again, and your bishop and both knights can land there. You're a pawn down and still a little better. Your plan: …Bb7, then …Re8 against the bishop on e2 with their king behind it, and …Qe7 to double on the e-file.", 'd4 — center, but e3 is weak.'],
  ],
  'Two Knights: Traxler Counterattack': [
    ["Here's the counterpunch: …Bc5, the Traxler. You ignore the threat to f7 and aim your bishop at f2, right next to their king. Be honest about it: the engine prefers …d5, and after …Bc5 they are clearly better if they find the right reply. You're betting they won't.", '…Bc5 — the Traxler: ignore f7, hit f2.'],
    ["Nxf7 takes the bait and forks your queen and the rook on h8. It's the engine's choice too. So, queen or rook? Neither. You answer with a check.", 'Nxf7 — forks the queen and rook.'],
    ["…Bxf2 check, the move that makes the Traxler work. Why check first? …Nxe4 at once lets Nxd8 take your queen. With check first, they have no time for that, and the bishop pulls their king into the open.", '…Bxf2+ — check first, no time for Nxd8.'],
    ["Kxf2 grabs the bishop, but the engine prefers Kf1, keeping the king on its back rank. Now the king stands on f2, in reach of your knight. They're only a little better.", 'Kxf2 — takes it; Kf1 was better.'],
    ["…Nxe4 check: a pawn, with check. Remember, their knight on f7 still hits your queen and rook, so every move you make has to be a check or a threat. …Ng4 check instead just drops the knight to the queen.", '…Nxe4+ — another check; keep the initiative.'],
    ["Kg1 heads for the corner, away from the checks. Now there's no check to answer, so Nxd8 is a real threat, and they are clearly better. Your queen has to move, and it has to move with a threat of its own.", 'Kg1 — the corner; Nxd8 is threatened.'],
    ["…Qh4 saves the queen and threatens …Qf2 mate: your knight on e4 guards f2, and their king has nowhere to run. …Qe7 is the natural move, and Nxh8 just takes your rook. They are a little better, but only with exact moves.", '…Qh4 — threatens …Qf2 mate.'],
    ["g3 blocks the mate and hits your queen. Most club players try Qf3 instead, and it costs them over a pawn and a half after …Rf8. Now, can your queen take on g3? No: the h-pawn takes back.", 'g3 — blocks the mate, hits the queen.'],
    ["…Nxg3 gives the knight back for the pawn and hits the rook on h1. And look what moving it uncovers: your queen on h4 now sees along the fourth rank to the bishop on c4, which has no guard. That's a discovered attack.", '…Nxg3 — discovered attack on c4.'],
    ["hxg3 takes the knight and hits your queen, and leaves the bishop on c4 hanging: they answer your threat with a bigger one. It's about level, and their kingside is down to a single pawn, on g3.", 'hxg3 — hits the queen; about level.'],
    ["…Qxg3 check, and their king's cover is gone. Don't grab the bishop on c4 first: Qh5 check turns the tables and Nxh8 takes your rook. Their king has one square, f1. It's about level. Your plan: …Rf8, saving the rook and pinning the knight on f7 to their king, then …d6 and …Qf4 check to keep the king running.", '…Qxg3+ — check; their king is bare.'],
  ],
  'Two Knights: Max Lange Attack': [
    ["O-O: instead of kicking your knight, they castle and leave e4 hanging. It's a gambit idea. If you take, the e-file opens with your king still on e8, and their rook gets there first.", 'O-O — e4 is offered.'],
    ["Most club players answer with …Bc5 here, and it costs them: e5 kicks the knight, and soon Re1 comes with check while your king is still in the middle. …Nxe4 just takes, and you're two pawns up for the moment.", '…Nxe4 — two pawns up, for now.'],
    ["Re1, and here's the bill: the rook pins your knight on e4 to your king, and nothing guards the knight. How do you save a pinned piece? Give it a guard. …f6 won't do: Rxe4 comes with check.", 'Re1 — pins the knight on e4.'],
    ["…d5 guards the knight and hits the bishop on c4 in one move. Why not block with …Be7? Then Rxe4, and the rook takes on e7 with check: you lose a bishop, a knight and a pawn for a rook.", '…d5 — guards e4, hits c4.'],
    ["Bxd5: they give the bishop back to take away the knight's guard. Now the pinned knight on e4 is hit twice, by the rook and the bishop, and nothing defends it. But the bishop on d5 is loose too.", "Bxd5 — removes the knight's guard."],
    ["…Qxd5 takes the bishop, and the queen guards your knight on e4. On the count you're a piece and a pawn up, and still it's only about level. Why? Look at their next move: the queen is the knight's only guard.", '…Qxd5 — guards e4, a piece up.'],
    ["Nc3, the point of the whole line. It hits your queen, the only guard of the knight on e4. Can you take it? …Nxc3 is illegal, because the knight is pinned, and …dxc3 drops your queen to Qxd5. So the queen moves, and the knight falls.", 'Nc3 — hits the queen guarding e4.'],
    ["Where does the queen go? Every square gives the knight back. …Qa5 and …Qh5 are the masters' favourites; …Qd8 goes all the way home, out of reach, and you still stay a pawn up.", '…Qd8 — home, giving the knight back.'],
    ["Rxe4 check takes the knight back. You're a pawn up now, no more. And look where the rook stands: on the open e-file, facing your king, with your d4 pawn in its sights.", 'Rxe4+ — the knight back, with check.'],
    ["Block with a developing move: …Be7, and you're one move from castling. …Ne5 looks active, but it fails: Rxe5 is check, and the knight is gone.", '…Be7 — blocks, ready to castle.'],
    ["Nxd4 wins the pawn back, since …Nxd4 just lets the rook take back. Material is even, and your bishop on e7 is still pinned to your king. How do you get that rook off the e-file?", 'Nxd4 — material even again.'],
    ["…f5 kicks the rook, and the pin goes with it. If the rook takes on e7 instead, your knight takes back and you've won the exchange. The cost is permanent: e6 is a hole now, and their knight on d4 can jump straight in.", '…f5 — kicks the rook, ends the pin.'],
    ["Rf4 sidesteps and hits your f5 pawn, together with the knight on d4. Your bishop on c8 guards it once. Two attackers, one defender, so how do you add a second guard?", 'Rf4 — sidesteps, hits f5.'],
    ["Castle, and the rook on f8 gives f5 its second guard. It's about level. Your plan: if their knight takes on c6, trade queens on d1 with check first, take back on c6 with the pawn, and play the ending with your two bishops.", '…O-O — guards f5, bishops for you.'],
  ],
  'Two Knights: Quiet Italian d3 with ...Be7': [
    ["a4 instead of c3: space on the queenside, and a2 becomes a home for the bishop if you chase it. So …Na5 won't win the bishop this time, and that changes your plan.", 'a4 — space, and a2 for the bishop.'],
    ["Same hunt as before: …Na5 hits the bishop on c4. This time it has a2 to run to, but chasing it still costs them a move, and your c-pawn is free to come forward.", '…Na5 — hits the bishop on c4.'],
    ["Ba2 keeps the bishop on its diagonal to f7, and the pin on that pawn stays. Your knight on a5 can't reach it there. And if you challenge it with …Be6 now, b4 hits your knight first.", 'Ba2 — keeps the diagonal to f7.'],
    ["That's why …c5 comes first: it takes b4 away, so no pawn of theirs can kick your knight. It also stakes a claim on d4, the square their c3 plan is built around.", '…c5 — space; no b4 for them.'],
    ["c3 prepares d4, the break that hits your pawn on c5. It also leaves b3 for good: no pawn of theirs can ever guard it again, and your knight on a5 could land there in one move.", 'c3 — preparing d4.'],
    ["With the bishop safe on a2, your knight has nothing left to chase, so it comes home: …Nc6. There it watches d4 together with your c5 pawn.", '…Nc6 — home again, watches d4.'],
    ["Nbd2 starts the same tour as in the main line: d2, then f1, then on toward the kingside. On d2 it blocks their bishop on c1, so it won't stay long.", 'Nbd2 — the knight tour starts.'],
    ["…Be6 meets their bishop head-on, and it ends the pin on f7, since your bishop now stands in between. If they trade, your f-pawn takes back, and that's the point: a half-open f-file for your rook.", '…Be6 — offers the bishop trade.'],
    ["Bxe6: they take the trade, and the bishops come off. Only one piece can take back, the f-pawn. Doubled pawns, yes, but watch what they buy you.", 'Bxe6 — the bishops come off.'],
    ["…fxe6: doubled e-pawns, but look at what you get. The f-file is half-open for your rook on f8, and the pawn on e6 keeps their pieces off d5 and f5.", '…fxe6 — doubled pawns, half-open f-file.'],
    ["Nf1 continues the tour, and it frees their bishop on c1 to come out. It's about level. Your plan: …h6 and …a5, then the rook to f7 and the queen to d7, gathering your pieces behind the half-open f-file.", 'Nf1 — the tour; …h6 and …a5 next.'],
  ],
  'Two Knights: Fritz Variation 5...Nd4': [
    ["…Nd4, the Fritz. Most players put the knight on the rim with …Na5; this one goes forward instead, toward the center, hitting c2. They are a little better, and it gets sharp fast: c3 kicks it at once, so you have to know what comes next.", '…Nd4 — the Fritz: forward, not the rim.'],
    ["c3 kicks the knight at once. It also leaves d3 for good: no pawn of theirs can cover it again, and your bishop on c8 can land there through f5. So does your knight run?", 'c3 — kicks the knight.'],
    ["No: …b5 hits the bishop on c4 instead. Taking back on d5 can wait, since it isn't going anywhere. If they take your knight, you take their bishop, and if the bishop retreats, …Nxd5 wins your pawn back.", '…b5 — hits c4 instead of retreating.'],
    ["cxd4 takes your knight, but the engine prefers the retreat Bf1. After cxd4 it's about level, and the position opens with both kings still in the middle.", 'cxd4 — takes the knight; Bf1 was better.'],
    ["…bxc4 takes the bishop. Why not …exd4 first? Bxb5 check would win your b5 pawn. You're a pawn down now, but their pawns on d4 and d5 have no guards.", '…bxc4 — the bishop, not d4.'],
    ["dxe5 takes a second pawn and hits your knight on f6. They're two pawns up, and still it's about level. Why? Their d5 pawn has no guard, and taking it opens a road for your queen.", 'dxe5 — hits f6; d5 is loose.'],
    ["…Qxd5 takes it, and the queen hits e5 and g2. Your knight on f6 is still attacked, but follow it one more move: if exf6, your queen looks straight down the fifth rank at the knight on g5.", '…Qxd5 — a pawn back, hits g2.'],
    ["exf6 takes the knight, and now the fifth rank is clear: your queen hits the knight on g5, which has no guard. They're a knight and a pawn up for the moment, and it's about level.", 'exf6 — takes the knight; g5 hangs.'],
    ["…Qxg5 takes it back. Don't grab g2 first: Qf3 hits your rook on a8, and you end up giving the rook for a knight and a pawn. Now count it: you're a pawn down, but their pawns on f6 and g2 are both loose.", '…Qxg5 — the knight back.'],
    ["fxg7 is greedy: the pawn forks your bishop on f8 and your rook on h8. But it's a mistake; the engine prefers Qf3, and now you are clearly better. Watch what your bishop does when it takes back.", 'fxg7 — a fork, and a mistake.'],
    ["…Bxg7, and here's why fxg7 was a mistake: your bishop lands on the long diagonal and hits b2, which can't move because it's pinned to the rook on a1. If they play Qf3, …Qe5 check comes next.", '…Bxg7 — long diagonal, pins b2.'],
    ["They castle, and walk into a second pin: the king lands on g1, on the same file as your queen, so the g2 pawn is pinned. Qf3 was the move, and now you are winning. g2 is still guarded by the king, so which piece do you add?", 'O-O — walks into a pin on g2.'],
    ["…Bb7, and there's the second attacker: the bishop hits g2 too, and …Qxg2 is mate. You are winning. Your plan: keep the queen and both bishops on their king, and if f3 blocks the long diagonal, …Bd4 check is waiting.", '…Bb7 — threatens …Qxg2 mate.'],
  ],
  'Two Knights: Ulvestad Variation': [
    ["…b5, the Ulvestad. Your knight is attacked, and instead of moving it you hit the bishop on c4. If they take your knight, you take their bishop; if the bishop takes on b5, …Qxd5 wins your pawn back.", '…b5 — the Ulvestad: hit the bishop instead.'],
    ["Bf1 looks odd, but most masters choose it. On d3 the bishop gets kicked by …e4, and from f1 it still eyes b5, which nothing guards. They are a little better.", 'Bf1 — back home, eyes b5.'],
    ["…Nd4: the knight gets out of the pawn's attack, goes forward, hits c2 and covers b5, so if the bishop takes there, your knight takes back. You're a pawn down and they are a little better. That's the price of the gambit.", '…Nd4 — forward, covers b5.'],
    ["c3 kicks the knight. The natural d3 doesn't work: …Bg4 hits the queen, and after Qd2 your queen picks up d5. So, do you move the knight on d4? No: your other knight has a better move.", 'c3 — kicks the knight on d4.'],
    ["…Nxd5 takes the pawn back, and with the knight gone from f6, your queen on d8 now hits their knight on g5, which has no guard. A discovered attack: both sides now have a knight hanging.", '…Nxd5 — and your queen hits g5.'],
    ["cxd4 takes your knight. But their knight on g5 is still hanging, and your queen takes it next.", 'cxd4 — takes the knight on d4.'],
    ["…Qxg5: material is level again, and your queen hits g2. But your b5 pawn has no guard, and their bishop on f1 is looking straight at it.", '…Qxg5 — even again, but b5 hangs.'],
    ["Bxb5 check takes the pawn with tempo. But the bishop has left f1, and now nothing guards g2, with your queen right on it.", 'Bxb5+ — the pawn, but g2 is loose.'],
    ["How do you answer the check? Block with …Bd7, and Bxd7 check trades it off and pulls your king out anyway. …Kd8 steps aside, keeps the bishop, and your queen still hits g2.", '…Kd8 — steps aside, keeps the bishop.'],
    ["Qf3 guards g2 and hits your knight on d5, which nothing guards: Qxd5 with check would also hit your rook on a8. The engine prefers castling. After Qf3 it's about level.", 'Qf3 — hits d5; castling was better.'],
    ["…Bb7 guards the knight on d5 and the rook on a8 at once, but the engine prefers …exd4 first. After …Bb7 it's about level. Your plan: your king can't castle, so put a rook on b8, bring the knight to e3, and aim your queen and bishop at g2.", '…Bb7 — guards d5; …exd4 was better.'],
  ],
  'Two Knights: 4.d3 Main Line with ...Be7': [
    ["Bb3 is the natural retreat, keeping the bishop on its diagonal to f7. But here it can be traded: your knight on a5 takes it, and their pawns end up doubled. That's why the main line goes Bb5 instead.", 'Bb3 — natural, but you can take it.'],
    ["Take it: …Nxb3 removes the bishop that pinned f7, and the bishop pair is yours. The knight even hits the rook on a1, so they have to take back at once. And it swaps off a knight that was stuck on the rim.", '…Nxb3 — the bishop pair is yours.'],
    ["axb3 takes back toward the center, and the a-file is half-open for their rook. The cost is doubled b-pawns. And notice there's no pawn on h3 yet, so g4 is open for your bishop.", 'axb3 — doubled pawns, half-open a-file.'],
    ["…Bg4 develops with a pin: the knight on f3 can't move without exposing their queen on d1. If h3 asks the question, the bishop steps back to h5 and keeps the pin.", '…Bg4 — pins the knight to d1.'],
    ["Nbd2 gives the pinned knight a third guard, after the queen and the g2 pawn, and starts the usual tour toward f1. If you take on f3 now, the queen just takes back.", 'Nbd2 — a third guard on f3.'],
    ["…a6 is a quiet move: it covers b5, so their doubled b-pawns can't easily roll forward. And look at the trap it leaves: if they grab e5 with the knight, …Bxd1 takes the queen.", '…a6 — covers b5.'],
    ["Nf1, the tour again, and with d2 clear their bishop on c1 can finally come out. From f1 the knight heads on to the kingside, as it always does in this setup.", 'Nf1 — frees the c1-bishop.'],
    ["…h6 takes g5 away from their bishop and knight. It's about level. Your plan: when h3 asks your bishop, drop it to h5 and then g6, keeping both bishops, and bring a rook to e8. Their doubled b-pawns are a weakness they carry into any endgame.", '…h6 — no g5; keep both bishops.'],
  ],
};

/** Lines that resolve before a middlegame: the Traxler's checks end at move nine
 *  (18 plies), as the hand-written lesson it replaces already declared. */
const ROADMAP_TABS = new Set<string>(['Two Knights: Traxler Counterattack']);

/** File a tab's beats on the first moves it doesn't share with what is already written. */
for (const [tab, moves] of Object.entries(TAB_LINES)) {
  const own = TAB_BEATS[tab] ?? [];
  let k = 0;
  while (k < moves.length && beats[moves.slice(0, k + 1).join(' ')]) k += 1;
  if (own.length !== moves.length - k) throw new Error(`${tab}: ${own.length} beats for ${moves.length - k} unshared moves`);
  own.forEach(([say, sayShort], i) => { beats[moves.slice(0, k + i + 1).join(' ')] = { say, sayShort }; });
}

export const TWO_KNIGHTS_DEFENCE_WATCH: WatchCourse = {
  openingId: 'two-knights-defence',
  title: 'Two Knights Defence — A Master Class',
  orientation: 'black',
  sources: ['book:two-knights-defence', 'concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Two_Knights_Defense'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves, ...(ROADMAP_TABS.has(tab) ? { kind: 'roadmap' as const } : {}) })),
  ],
  beats,
};
