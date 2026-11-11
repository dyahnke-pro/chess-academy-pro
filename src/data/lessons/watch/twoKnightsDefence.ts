// Two Knights Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=two-knights-defence`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. Standard: docs/OPENING-WATCH-BEATS.md. The student plays Black.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Be7', 'O-O', 'O-O', 'Re1', 'd6', 'c3', 'Na5', 'Bb5', 'a6', 'Ba4', 'b5', 'Bc2', 'c5', 'Nbd2', 'Nc6', 'Nf1', 'Re8', 'h3', 'h6', 'Ng3', 'Be6', 'd4', 'cxd4', 'cxd4', 'exd4', 'Nxd4', 'Nxd4', 'Qxd4', 'Rc8', 'Bb3', 'd5', 'e5', 'Nd7', 'Nh5', 'Bc5', 'Qf4', 'Qg5', 'Qxg5', 'hxg5', 'Bxg5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["They open with e4, the most popular first move, a little under half of all master games. The pawn takes the center and opens a road for their queen and for the bishop on f1. Keep an eye on that bishop: it's the one that will aim at f7.", 'e4 — center, frees the f1-bishop.'],
  ["How do you answer? …e5, meeting the pawn head-on and claiming your own share of the center. Masters choose the Sicilian more often, but the engine rates …e5 just as highly, and it opens the way for your bishop on f8 and your queen at once.", '…e5 — meets e4 head-on.'],
  ["Nf3, nine masters in ten: the knight develops and hits your pawn on e5 straight away. Nothing guards it yet, so your next move has a job to do before it can follow a plan.", 'Nf3 — hits your pawn on e5.'],
  ["How do you hold e5? …Nc6, close to nine masters in ten: the knight comes out and guards the pawn in the same move. …d6 would hold it too, but that pawn blocks your bishop on f8. Defend with a piece that wants to develop anyway.", '…Nc6 — develops and guards e5.'],
  ["Bc4, the Italian bishop. About two masters in three go Bb5 here, the Ruy Lopez, but this bishop has a target of its own: f7, the weakest square in your camp, guarded only by your king. Keep that square in mind, because half the lines in this opening turn on it.", 'Bc4 — the bishop aims at f7.'],
  ["And here's the move the opening is named for: …Nf6, the second knight. About half of masters play the calm …Bc5; …Nf6 is the fighting choice, and the engine likes it just as well. Look at what it hits: their e4 pawn, with nothing guarding it. Now the choice is theirs. Defend it with d3, open the center with d4, or ignore it and go after f7 with Ng5.", '…Nf6 — two knights out, hits e4.'],
  ["They take the quiet road: d3, three masters in four. The pawn guards e4 and opens the diagonal for the bishop on c1. No early fight here, just a slow game where both sides finish developing and the plans come later.", 'd3 — guards e4, a quiet game.'],
  ["Where does your dark-squared bishop belong? The active square is c5, and the engine prefers …Bc5. …Be7 is the solid choice, close to four masters in ten: it clears the way to castle, and on e7 no pawn can chase it the way b4 can chase a bishop on c5.", '…Be7 — solid, castle next.'],
  ["They castle, as eight masters in ten do here. The king is safe, and the rook on f1 can now step to e1 and back up the e4 pawn.", 'O-O — king safe, rook to e1 next.'],
  ["You castle too, nine masters in ten. But notice one thing: with your king on g8, the bishop on c4 now pins your f7 pawn to it, so that pawn can't move for now. That bishop is their best piece, and your next few moves are about it.", '…O-O — safe, but f7 is pinned.'],
  ["Re1, about six masters in ten. The rook stands behind e4 and gives it a second guard. It has also cleared f1, a square their queen's knight will use on its way to the kingside.", 'Re1 — backs up e4, frees f1.'],
  ["…d6 gives e5 a second guard and opens the diagonal for your bishop on c8. And here's the quiet point: with e5 held by a pawn, your knight on c6 is free to leave. It has a job waiting.", '…d6 — props up e5, frees c8.'],
  ["c3 prepares d4, so a pawn can stand behind it when it comes. It also empties c2, a retreat square for the bishop on c4. Remember that square: the bishop may need it soon.", 'c3 — prepares d4, empties c2.'],
  ["Here's the job: …Na5 hits the bishop on c4. A knight on the rim, yes, but it's there on business. That bishop pins your f7 pawn to your king, and the knight offers itself in a trade for it. So do they keep the bishop, or let it go?", '…Na5 — hunts the bishop on c4.'],
  ["They keep it: Bb5, the engine's choice. Why not the natural Bb3? Because …Nxb3 trades it off anyway. On b5 your knight can't reach it, and notice the bonus: the pin on f7 is gone.", 'Bb5 — keeps the bishop, unpins f7.'],
  ["…a6 asks the bishop again. It can't take on a6, because …bxa6 just wins a bishop for a pawn. So where does it go now?", '…a6 — chases the bishop again.'],
  ["Ba4, keeping its distance. What about b4, hitting your knight on a5? It looks good, but …axb5 takes the bishop first, and when their pawn takes your knight, your rook takes back on a5. That's a bishop and a pawn for a knight.", 'Ba4 — keeps its distance.'],
  ["Keep pushing: …b5 hits the bishop a third time and grabs space on the queenside. If you know the Chigorin Ruy Lopez, this is the same picture: a knight on a5, pawns on b5 and c5, and their bishop pushed back to c2.", '…b5 — hits the bishop, gains space.'],
  ["Bc2: the bishop finally settles on the square c3 emptied for it. It's out of reach there, and they've kept it from being traded. For now it sits quietly behind their d3 pawn.", 'Bc2 — safe at last, behind d3.'],
  ["…c5, and every master in the database plays it here. The pawn takes d4 under control, so their planned d4 push now runs into it, and it adds to the space b5 gave you. With the bishop gone to c2, the knight on a5 has done its job.", '…c5 — clamps d4, the chase is over.'],
  ["Where does their last knight go? Their own pawn sits on c3, and on a3 your b-pawn could kick it. So Nbd2, the start of a classic tour: d2, then f1, then on to g3. That's what Re1 cleared f1 for. The engine prefers h3 first, keeping your bishop off g4.", 'Nbd2 — the knight heads for f1.'],
  ["Now the knight comes home to c6. Its job on a5 was the bishop, and that's done. On c6 it joins your pawns on c5 and e5 in watching d4: three of yours on that square against two of theirs.", '…Nc6 — back home, eyes d4.'],
  ["Nf1, the middle of the tour. The knight doesn't do much on f1, but from there it goes on to g3, where it watches f5 and h5, right in front of your king.", 'Nf1 — on its way to g3.'],
  ["…Re8 puts your rook on the e-file, facing theirs. If the center opens, that file opens with it, and your rook is already there. It also frees f8, so the bishop on e7 has a square to drop back to.", '…Re8 — meets their rook on the e-file.'],
  ["h3, small but useful: it takes g4 away from your bishop, so …Bg4, pinning the knight on f3 to their queen, is off the table. The engine slightly prefers Bg5, developing first.", 'h3 — keeps your bishop off g4.'],
  ["And you do the same on your side: …h6 takes g5 away from their pieces, so neither the bishop on c1 nor the knight on f3 can land there.", '…h6 — no Bg5, no Ng5.'],
  ["Ng3, and the tour is complete: d2, f1, g3. Now the knight watches f5 and h5, the squares in front of your kingside. So where should your last minor piece go?", 'Ng3 — tour done, watches f5.'],
  ["To e6. Your bishop covers f5, so their knight can't jump there, and it covers d5 for a later …d5 break. Now all four of your minor pieces are out.", '…Be6 — covers f5 and d5.'],
  ["And now the break they prepared with c3: d4, hitting your pawns on c5 and e5 at once. Both sides are developed, so the center opens with everyone ready.", 'd4 — the break, hits c5 and e5.'],
  ["Which pawn takes? Start with …cxd4: it opens the c-file for your rooks, and the e5 pawn can still take on d4 next. The engine rates both captures the same.", '…cxd4 — opens the c-file.'],
  ["They take back with the pawn, the one recapture that keeps the balance. Now there's no pawn left on the c-file, and the first rook to reach it owns it.", 'cxd4 — the c-file is open.'],
  ["…exd4, and you're a pawn up for the moment. But count the attackers on d4: their knight and queen both hit it, and only your knight on c6 guards it. They'll win it back, so be ready for the trade.", '…exd4 — a pawn up, for a moment.'],
  ["Nxd4: the pawn comes back, and the knight lands right in the middle. It hits your knight on c6, your bishop on e6 and your b5 pawn, and the knight on c6 has no guard. What's the simplest answer?", 'Nxd4 — pawn back, hits c6 and e6.'],
  ["Trade it: …Nxd4. Your knight even hits their bishop on c2 on the way, but on d4 it has no guard, so their queen simply takes back.", '…Nxd4 — trade the knights.'],
  ["Qxd4: the queen lands in the center and hits your d6 pawn and the knight on f6. Both are guarded, so nothing hangs. But a queen this far forward can be a target: can you gain a move on it?", 'Qxd4 — central queen, hits d6.'],
  ["Remember the c-file you opened with …cxd4? …Rc8 takes it before either of their rooks can, and hits the bishop on c2, which has no guard.", '…Rc8 — open file, hits c2.'],
  ["Bb3 saves the bishop with an offer: now it faces your bishop on e6. You could take on b3 and double their pawns, and the engine rates that as highly as the central break you're about to play.", 'Bb3 — saves it, offers a trade.'],
  ["…d5, the central break: the pawn hits e4, and it steps between their bishop on b3 and yours on e6. The price is an isolated pawn on d5, with no pawn beside it to help. That's the deal: active pieces for a pawn you'll have to look after.", '…d5 — the break, an isolated pawn.'],
  ["They don't take. e5 kicks the knight off f6, and on e5 the pawn takes d6 and f6 away from your pieces. But there's a trade-off in your favor: your d5 pawn is now passed, with no pawn of theirs left to stop it.", 'e5 — kicks the knight; d5 is passed.'],
  ["Where does the knight go? On e4 it looks active, but f3 would kick it straight back. d7 is the safe square, and from there it hits the e5 pawn and covers c5.", '…Nd7 — safe square, hits e5.'],
  ["Nh5, a sharp jump toward your king: the knight hits g7, which only your king guards. But out there on the rim it has no guard of its own. The engine prefers the calm Be3, developing the last piece.", 'Nh5 — hits g7; Be3 was calmer.'],
  ["…Bc5 hits the queen, and this is why your knight went to d7. Can the queen take on c5? No: your knight takes back, and that's a queen for a bishop. And once the queen moves, your bishop looks straight through to f2.", '…Bc5 — hits the queen on d4.'],
  ["Where does their queen go? Qd1 or Qd3 lets …Qh4 hit the knight on h5 and f2 at once. On f4 it guards f2 and covers h4, so that trick is off. But f2 is still pinned to their king by your bishop.", 'Qf4 — guards f2, covers h4.'],
  ["…Qg5 offers to trade queens, and look at everything it hits: their queen, the e5 pawn and the knight on h5, which has no guard. If they don't trade, that knight is in trouble.", '…Qg5 — offers a trade, hits h5.'],
  ["They take. Once the queens come off, the knight on h5 is out of danger. So, how do you take back?", 'Qxg5 — queens come off.'],
  ["…hxg5. Is there anything better, like …Bxf2 check first? No: the king takes it, and you've given a bishop for a pawn. And notice the new pawn on g5 has no guard: their bishop on c1 can take it.", '…hxg5 — takes back; g5 is loose.'],
  ["Bxg5 picks up that pawn, so they're a pawn up. Still, it's about level: your d5 pawn is passed, your rook owns the c-file, and your bishop on c5 keeps f2 pinned. Your plan: push …d4 to open your bishop on e6, with the passed pawn and the c-file as your trumps.", 'Bxg5 — a pawn for them; …d4 next.'],
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
    ["d4: no slow d3 this time. They open the center at once, fewer than one master in ten, and leave the e4 pawn without a guard. They're betting on speed. The quiet d3 is the engine's choice.", 'd4 — opens the center at once.'],
    ["Take it: …exd4, as almost every master does. Now you're a pawn up, and their e4 pawn still has no guard, with your knight on f6 looking right at it. So what do they do about the knight?", '…exd4 — a pawn up, e4 still loose.'],
    ["e5 kicks the knight off f6 before it can take on e4; seven masters in ten choose this. The engine prefers castling first, which leads to the Max Lange. Here the question is yours: where does the knight go?", 'e5 — kicks the knight off f6.'],
    ["Don't retreat. Hit back: …d5 attacks the bishop on c4, three masters in four. If they take your knight, you take their bishop, and the pawn on d5 stakes your claim in the center.", '…d5 — counterattack, hits c4.'],
    ["Bb5, every master's move: the bishop steps out of the attack and pins your knight on c6 to your king. Why does that matter? That knight is the only piece guarding your d4 pawn.", 'Bb5 — pins the knight guarding d4.'],
    ["The knight on f6 still has to move, and the best square is forward: …Ne4, a strong post in the center, guarded by your d5 pawn. More than eight masters in ten put it there, and from e4 it hits f2.", '…Ne4 — central post, guarded by d5.'],
    ["Nxd4 wins the pawn back, and your knight on c6 can't recapture: it's pinned. Now c6 is hit twice, by the bishop and the knight, and guarded only by your b7 pawn. How do you hold it?", 'Nxd4 — pawn back, two hits on c6.'],
    ["…Bd7, seven masters in ten: a second guard for the knight on c6, and the pin to your king is gone, because the bishop now stands in the way. …Bc5 is the other main try.", '…Bd7 — guards c6, ends the pin.'],
    ["Bxc6: they give up the bishop. On c6 it hits your d5 pawn, which has no guard, and it pins your bishop on d7 to your king. So which piece takes back?", 'Bxc6 — trade, and d5 hangs.'],
    ["The pawn takes: …bxc6. Now d5 is guarded again, and you keep both your bishops. The price is doubled pawns on the c-file, but the engine prefers this to the bishop recapture: two bishops in an open center are worth it.", '…bxc6 — guards d5, bishop pair.'],
    ["They castle and get their king off the e-file before it opens. Watch for f3 next: a pawn that kicks your knight off e4.", 'O-O — king safe, f3 is coming.'],
    ["…Bc5 develops with a hit on the knight on d4 and clears the way for you to castle. Their queen guards that knight, so nothing hangs, but they have to keep it covered.", '…Bc5 — hits d4, castle next.'],
    ["Be3 gives the knight on d4 a second guard. Why e3 and not f4? On f4 your g-pawn could kick it.", 'Be3 — a second guard for d4.'],
    ["You castle, and your king is safe. But look at e5: right now nothing guards it. The engine prefers …Qe7 first, hitting that pawn before they can prop it up.", '…O-O — safe; …Qe7 was sharper.'],
    ["Here's f3: the pawn kicks your knight off e4, and it takes g4 away from your bishop as well.", 'f3 — kicks the knight off e4.'],
    ["Where does the knight go? …f5, propping it up, looks natural. But after fxe4 the knight is gone, and pushing on with …f4 just drops a pawn to the bishop on e3. So the knight drops back to g5.", '…Ng5 — sidesteps; …f5 loses the knight.'],
    ["f4 kicks the knight a second time and backs up the e5 pawn with a pawn. They're a little better now, with space on the kingside. The cost is a thinner cover in front of their king.", 'f4 — kicks it again, backs e5.'],
    ["Back to e4, and now it's a real outpost: their f-pawn has gone past, and none of their pawns can kick it there now. The engine slightly prefers …Ne6, hitting the knight on d4.", '…Ne4 — back to the outpost.'],
    ["Nd2: if they can't kick your knight, they'll trade it off. The knight on d2 challenges it directly.", 'Nd2 — offers to trade knights.'],
    ["…Nxd2 takes the offer, and your knight even hits their rook on f1 before it's recaptured. The engine prefers …f6, striking at e5 first, while your knight still holds e4.", '…Nxd2 — the trade; …f6 was stronger.'],
    ["Why the queen and not the bishop? Bxd2 takes the last guard off the knight on d4, and …Bxd4 with check wins it. So the queen recaptures.", 'Qxd2 — keeps the knight on d4 guarded.'],
    ["…Re8 puts the rook on the e-file against their e5 pawn. The engine prefers …Bb6 first, tucking the bishop away before their knight or pawns can chase it from c5. They are a little better here.", '…Re8 — eyes e5; …Bb6 was better.'],
    ["Rae1 brings their last rook to the center, behind the bishop on e3. They are a little better: the pawns on e5 and f4 give them space on the kingside. Your plan: tuck the bishop back to b6, then strike at e5 with …f6 to open lines for your pieces.", 'Rae1 — rooks central; …Bb6 and …f6 next.'],
  ],
  'Two Knights: Fried Liver Defence 5...Na5': [
    ["Ng5, the sharpest try, about one master game in six. The knight and the bishop on c4 both aim at f7, and only your king guards it. The threat is Nxf7, hitting your queen and your rook on h8 at once. The engine slightly prefers the quiet d3, but you have to know how to meet this.", 'Ng5 — two attackers on f7.'],
    ["How do you defend f7? Not by guarding it. Block the bishop: …d5 stands right on its diagonal to f7, and it hits the bishop on c4 and the e4 pawn at the same time. Almost every master plays it.", '…d5 — blocks the bishop, hits c4.'],
    ["They take, and the pawn on d5 hits your knight on c6. Here's the rule to remember: don't take back with the knight. …Nxd5 lets Nxf7 hit your queen and your rook at once.", "exd5 — hits c6; don't take back."],
    ["So the knight goes to a5, more than eight masters in ten: it leaves the pawn's attack and hits the bishop on c4, the only piece guarding d5. You're a pawn down for now, and what you get for it is time. The engine prefers …b5, the Ulvestad.", '…Na5 — hits the bishop guarding d5.'],
    ["Bb5 check: the bishop escapes with tempo. But look what it left behind: the d5 pawn has no guard now.", 'Bb5+ — escapes with check; d5 is loose.'],
    ["Block with …c6, nine masters in ten. The pawn blocks the check and hits both the bishop and the d5 pawn. If the bishop simply retreats, …cxd5 gets your pawn back.", '…c6 — blocks, hits b5 and d5.'],
    ["dxc6: they take a second pawn, and the new one on c6 hits b7. Two pawns down, but it's about level: you just have to take back the right way.", 'dxc6 — a second pawn, hits b7.'],
    ["Which piece takes? The pawn: …bxc6 hits the bishop on b5 again, so it has to move a second time. …Nxc6 instead lets Bxc6 check, and your pawns end up doubled anyway. Every move the bishop spends running is a move for your development.", '…bxc6 — the pawn takes, hitting b5.'],
    ["Be2, about three masters in ten; Bd3 is the most common. Now count what you have for the pawn: their knight on g5 is far from home, their queenside hasn't moved, and your next two moves both come with a threat.", 'Be2 — retreats; now your moves come with tempo.'],
    ["…h6 kicks the knight on g5, and nothing guards it. Almost every master plays it. Where does the knight go?", '…h6 — kicks the knight on g5.'],
    ["Nf3 hits your e5 pawn, and about half the masters retreat here. But the engine prefers Nh3, because on f3 the knight walks right into your next move. You are a little better now.", 'Nf3 — hits e5; Nh3 was better.'],
    ["Don't defend e5. Push it: …e4 kicks the knight again, and nearly every master plays it. That's the gambit at work, another move with a threat, and you are a little better.", '…e4 — kicks the knight again.'],
    ["Ne5, every master's choice: the knight jumps forward and hits your c6 and f7 pawns. Back to g1 would just lose more time.", 'Ne5 — forward, hits c6 and f7.'],
    ["…Bd6, the masters' favourite, a little over half: the bishop develops with a hit on the knight on e5. The engine prefers …Qd4, hitting the same knight and f2 together. After …Bd6 it's about level.", '…Bd6 — develops, hits e5.'],
    ["f4 props up the knight, a quarter of the masters' games; most play d4, and the engine prefers it too. Here's why: their f-pawn just went past your e4 pawn with a two-square step, so you can take it en passant.", 'f4 — guards e5; d4 was better.'],
    ["…exf3 en passant: your pawn takes as if theirs had only moved one square. Now the knight on e5 has lost its pawn guard, and your bishop on d6 hits it. If a pawn or the bishop takes back on f3, …Bxe5 wins the knight.", '…exf3 — en passant; e5 is loose.'],
    ["So the knight takes back: Nxf3, its fifth move of the game, while their queenside still hasn't moved. You are a little better.", "Nxf3 — forced; the knight's fifth move."],
    ["You castle, and compare the kings: yours is safe on g8, theirs is still on e1, and the e-file has no pawns left on it.", "…O-O — your king is safe, theirs isn't."],
    ["d4 takes the center and opens the road for their bishop on c1, but their king is still on e1. You're a pawn down and still a little better. Your plan: put a rook on e8 to pin the bishop on e2 to their king, then open more lines with …c5 before they can castle.", 'd4 — center; …Re8 pins e2 next.'],
  ],
  'Two Knights: Traxler Counterattack': [
    ["Here's the counterpunch: …Bc5, the Traxler. You ignore the threat to f7 and aim your bishop at f2, a square next to their king. Be honest about the price: the engine prefers …d5, and after …Bc5 they are clearly better if they find the right path. Fewer than one master in twenty plays it. You're betting they won't.", '…Bc5 — the Traxler: ignore f7, hit f2.'],
    ["Nxf7 takes the bait and forks your queen and the rook on h8. About two masters in ten go this way; most check first with Bxf7. So, queen or rook? Neither. You answer with a check.", 'Nxf7 — forks the queen and rook.'],
    ["…Bxf2 check, the move that makes the Traxler work. Why check first, and not …Nxe4? Because then Nxd8 simply takes your queen. With check first, they have no time to take on d8. The bishop is offered to pull their king out.", '…Bxf2+ — check first, no time for Nxd8.'],
    ["Kxf2 grabs the bishop, a little under four masters in ten. The engine prefers Kf1, keeping the king on its back rank. They're still clearly better, but their king now stands on f2, where your knight can check it.", 'Kxf2 — takes it; Kf1 was better.'],
    ["…Nxe4 check: the knight takes a pawn and checks the king. Remember, their knight on f7 still hits your queen and rook, so every move you make has to be a check or a threat.", '…Nxe4+ — another check; keep the initiative.'],
    ["Kg1 runs to the corner, seven masters in ten. No check now, so Nxd8 is a real threat. What do you do with your queen?", 'Kg1 — the corner; Nxd8 is threatened.'],
    ["…Qh4 saves the queen with a threat of its own: …Qf2 is mate. Look at f2: your knight on e4 guards it, and their king has no square to run to. They are a little better here, but only if they see it.", '…Qh4 — threatens …Qf2 mate.'],
    ["g3 blocks the mate and kicks your queen. Can you take the pawn with the queen? No: the h-pawn takes back and wins it. But a piece can take it.", 'g3 — blocks the mate, hits the queen.'],
    ["…Nxg3 takes the pawn and hits the rook on h1. And look what moving the knight did: your queen on h4 now looks down the fourth rank at their bishop on c4, which has no guard. That's a discovered attack.", '…Nxg3 — hits h1, discovers the queen on c4.'],
    ["hxg3 takes the knight and hits your queen. It's the mistake the Traxler hopes for: Nxh8 was the move. Now you are clearly better.", 'hxg3 — the mistake; Nxh8 was right.'],
    ["…Qxg3 check takes back, and their king's pawn cover is gone. Don't grab the bishop on c4 first: Nxh8 would take your rook. You're a piece down and still a little better, because their king has only one square, f1. Your plan: …Rf8, saving your rook and pinning the knight on f7 to their king, then …d5 to bring your last pieces in.", '…Qxg3+ — check; their king is bare.'],
  ],
  'Two Knights: Max Lange Attack': [
    ["O-O: instead of kicking your knight, they castle and leave e4 for you, almost three masters in ten and the engine's top choice. It's an invitation: if you take, the e-file opens toward your king, and their rook gets there first.", 'O-O — e4 is offered.'],
    ["Take it: …Nxe4, three masters in four. You're two pawns up for the moment. But look where your king is: still on e8, on the file their rook is about to take.", '…Nxe4 — two pawns up, for now.'],
    ["Re1, and here's the bill: the rook pins your knight on e4 to your king, and nothing guards the knight. How do you save a pinned piece? Give it a guard.", 'Re1 — pins the knight on e4.'],
    ["…d5, every master's move: the pawn guards the knight and hits the bishop on c4 in one go. It's about level, and the knight is still pinned.", '…d5 — guards e4, hits c4.'],
    ["Bxd5: they give the bishop back to take away the knight's guard. Now the knight on e4 is pinned and hit twice, by the rook and the bishop, with nothing defending it.", "Bxd5 — removes the knight's guard."],
    ["…Qxd5 takes the bishop, and the queen guards your knight on e4. You're a piece and a pawn up on the count, and still it's only about level, because of their next move.", '…Qxd5 — guards e4, a piece up.'],
    ["Nc3, the point of the whole line. It hits your queen, the only guard of your knight on e4. Can you take it? …Nxc3 is illegal, because your knight is pinned, and …dxc3 drops your queen to Qxd5. So the queen has to move.", 'Nc3 — hits the queen guarding e4.'],
    ["…Qd8 goes all the way home, a rare choice; most masters play …Qa5 or …Qh5, and the engine rates all three close. On d8 you give the knight back, but your queen is safe and you stay a pawn up.", '…Qd8 — home, giving the knight back.'],
    ["Rxe4 check: they take the knight back, and the rook hits your d4 pawn too. You're still a pawn up. But first, deal with the check.", 'Rxe4+ — the knight back, with check.'],
    ["…Be7 blocks with a developing move, nearly every master's choice, and puts you one move from castling. Blocking with …Ne7 instead costs you the d4 pawn, and soon a bishop with it.", '…Be7 — blocks, ready to castle.'],
    ["Nxd4 wins the pawn back: …Nxd4 just lets the rook take back. Material is even, and the knight on d4 now hits your knight on c6. Your bishop on e7 is still pinned to your king, though. How do you get rid of that rook?", 'Nxd4 — material even again.'],
    ["…f5 kicks the rook off the e-file, and the pin on your bishop goes with it. If the rook takes on e7 instead, your knight takes back and you've won the exchange: a rook for a bishop.", '…f5 — kicks the rook, ends the pin.'],
    ["Rf4 sidesteps and hits your f5 pawn, along with the knight on d4. Your bishop on c8 guards it once. So how do you add a second guard?", 'Rf4 — sidesteps, hits f5.'],
    ["Castle, and the rook on f8 gives f5 its second guard. It's about level. Your plan: if their knight takes on c6, trade queens on d1 and take back with the pawn, then play for your two bishops in an open position.", '…O-O — guards f5, bishops for you.'],
  ],
  'Two Knights: Quiet Italian d3 with ...Be7': [
    ["a4 instead of c3: the pawn takes space on the queenside and empties a2, a safe home for the bishop if you chase it.", 'a4 — space, and a2 for the bishop.'],
    ["Same idea as before: …Na5 hits the bishop on c4, offering the knight in a trade for it. This time, though, the bishop has a2 to run to.", '…Na5 — hits the bishop on c4.'],
    ["Ba2: the bishop keeps its diagonal to f7 and the pin on that pawn, and on a2 your knight on a5 can't reach it.", 'Ba2 — keeps the diagonal to f7.'],
    ["…c5 grabs space and takes b4 and d4 away from their pawns. Why does b4 matter? A pawn there would kick your knight off a5.", '…c5 — space; no b4 for them.'],
    ["c3 prepares d4, the break that would hit your pawn on c5. And with their bishop safe on a2, your knight on a5 has nothing left to chase.", 'c3 — preparing d4.'],
    ["So the knight comes home to c6, where it watches d4 together with your c5 pawn.", '…Nc6 — home again, watches d4.'],
    ["Nbd2 starts the same knight tour as before: d2, then f1, then on toward the kingside.", 'Nbd2 — the knight tour starts.'],
    ["…Be6 meets their bishop head-on: the two bishops face each other on the diagonal, and the pin on f7 is gone, because your bishop now stands in between. If they trade, your f-pawn takes back.", '…Be6 — offers the bishop trade.'],
    ["Bxe6: they take the trade. Only one piece can take back, the f-pawn.", 'Bxe6 — the bishops come off.'],
    ["…fxe6: doubled e-pawns, yes, but look at what you get. The f-file is now half-open for your rook on f8, and the pawn on e6 guards d5.", '…fxe6 — doubled pawns, open f-file.'],
    ["Nf1, and the tour continues toward g3 or e3. It's about level. Your plan: bring the queen to d7 and get ready for the …d5 break when the time is right, with the pawn on e6 backing it up.", 'Nf1 — the tour; aim for …d5.'],
  ],
  'Two Knights: Fritz Variation 5...Nd4': [
    ["…Nd4, the Fritz. Most masters put the knight on a5; …Nd4 sends it forward instead, toward the center, where it hits c2. Only about one master in twenty-five plays it, and the engine prefers …b5. It's about level, but it gets sharp in a hurry.", '…Nd4 — the Fritz: forward, not the rim.'],
    ["c3 kicks the knight at once, almost every master's choice. They are a little better. So does your knight run?", 'c3 — kicks the knight.'],
    ["No: …b5 hits the bishop on c4 instead, nine masters in ten. If they take your knight, you take their bishop.", '…b5 — hits c4 instead of retreating.'],
    ["cxd4 takes your knight. More than nine masters in ten retreat with Bf1 instead, and the engine prefers that too. After cxd4 it's about level.", 'cxd4 — takes the knight; Bf1 was better.'],
    ["…bxc4 takes the bishop. Why not …exd4? Because Bxb5 check would win your b5 pawn. You're a pawn down now, but their pawns on d4 and d5 have no guards.", '…bxc4 — the bishop, not d4.'],
    ["dxe5: the pawn takes and hits your knight on f6. They're two pawns up and a little better. But their d5 pawn has no guard.", 'dxe5 — hits f6; d5 is loose.'],
    ["…Qxd5 takes it, and your queen now hits e5 and g2. Your knight on f6 is still attacked. But if the pawn takes it, look at the line that opens for your queen.", '…Qxd5 — a pawn back, hits g2.'],
    ["exf6 takes the knight, and now the road is clear: your queen looks straight down the fifth rank at their knight on g5, which has no guard. The engine prefers castling first.", 'exf6 — takes the knight; g5 hangs.'],
    ["…Qxg5 takes it back. Count it up: you're a pawn down, but their pawns on f6 and g2 are both loose, and it's about level.", '…Qxg5 — the knight back.'],
    ["fxg7 is greedy: the pawn forks your bishop on f8 and your rook on h8. But it's a mistake. Castling was the move, and now you are clearly better. Watch what your bishop does when it takes back.", 'fxg7 — a fork, and a mistake.'],
    ["…Bxg7, and here's why it was a mistake: your bishop lands on the long diagonal and hits b2, which can't move because it's pinned to the rook on a1. The engine slightly prefers …Qe5 check first. You are clearly better.", '…Bxg7 — long diagonal, pins b2.'],
    ["They castle, and walk into a second pin: the king lands on g1, on the same file as your queen, so the g2 pawn is pinned. Qf3 was the move, and now you are winning. You can't take g2 yet, since their king guards it. So which piece can you add?", 'O-O — walks into a pin on g2.'],
    ["…Bb7, and there's the second piece: the bishop hits g2 too, and …Qxg2 is mate. You are winning. Your plan: keep the queen and both bishops on their king, and if f3 blocks the long diagonal, …Bd4 check is waiting.", '…Bb7 — threatens …Qxg2 mate.'],
  ],
  'Two Knights: Ulvestad Variation': [
    ["…b5, the Ulvestad, about one master in fourteen, and the engine's top choice here. Instead of moving the knight, you hit the bishop on c4. If they take your knight, you take their bishop, and if the bishop takes on b5, …Qxd5 wins your pawn back.", '…b5 — the Ulvestad: hit the bishop instead.'],
    ["Bf1, an odd-looking retreat that eight masters in ten choose. Why so far back? On d3 your e-pawn would kick it with …e4, and from f1 it still eyes b5, which nothing guards. They are a little better.", 'Bf1 — back home, eyes b5.'],
    ["…Nd4, about four masters in ten: the knight gets out of the pawn's attack and goes forward, hitting c2 and covering b5. You're a pawn down, and they are clearly better for now. This is the price of the gambit.", '…Nd4 — forward, covers b5.'],
    ["c3 kicks the knight, and every master plays it. Do you move it? No: your other knight has a better move.", 'c3 — kicks the knight on d4.'],
    ["…Nxd5 takes the pawn back, and with the knight gone from f6, your queen on d8 now hits their knight on g5, which has no guard. So both sides have a knight hanging: they take yours on d4, you take theirs on g5.", '…Nxd5 — and your queen hits g5.'],
    ["cxd4 takes your knight, as a little over half the masters do. Their knight on g5 is still hanging.", 'cxd4 — takes the knight on d4.'],
    ["…Qxg5: material is even again, and your queen hits g2. But your b5 pawn has no guard, and their bishop on f1 is looking at it.", '…Qxg5 — even again, but b5 hangs.'],
    ["Bxb5 check takes the pawn with tempo. But the bishop has left f1, and now nothing guards g2, with your queen right on it.", 'Bxb5+ — the pawn, but g2 is loose.'],
    ["How do you answer the check? Block with …Bd7, and Bxd7 check trades off your bishop and pulls your king forward anyway. …Kd8 steps aside, keeps the bishop, and your queen still hits g2.", '…Kd8 — steps aside, keeps the bishop.'],
    ["Qf3 guards g2 and hits your knight on d5, which nothing guards. Qxd5 with check would also hit your rook on a8. The engine prefers castling; after Qf3 it's about level.", 'Qf3 — hits d5; castling was better.'],
    ["…Bb7 guards the knight on d5 and the rook on a8 at the same time. The engine prefers …exd4 first; after …Bb7 they are a little better. Your plan: your king can't castle now, so bring a rook to b8 and point your knight and queen at g2, next to their king.", '…Bb7 — guards d5; …exd4 was better.'],
  ],
  'Two Knights: 4.d3 Main Line with ...Be7': [
    ["Bb3, the natural retreat, keeping the bishop on its diagonal to f7. The engine prefers Bb5, as in the main line, because here you can simply take it.", 'Bb3 — natural, but you can take it.'],
    ["So take it: …Nxb3 removes the bishop that pinned f7, and you have the bishop pair. And look, the knight on b3 even hits the rook on a1, so they have to take back right away.", '…Nxb3 — the bishop pair is yours.'],
    ["axb3: they take back toward the center. The a-file is half-open for their rook now, but their b-pawns are doubled.", 'axb3 — doubled pawns, half-open a-file.'],
    ["…Bg4 develops with a pin: the knight on f3 is pinned to their queen on d1. In this line there's no h3, so g4 is yours to use.", '…Bg4 — pins the knight to d1.'],
    ["Nbd2 gives the pinned knight a third guard, after the queen and the g2 pawn, and it starts the usual tour toward f1.", 'Nbd2 — a third guard on f3.'],
    ["…a6 is a quiet move: it covers b5, so their doubled b-pawns can't easily roll forward.", '…a6 — covers b5.'],
    ["Nf1, the knight's tour again, and now their bishop on c1 can finally come out, since the knight no longer blocks it on d2.", 'Nf1 — frees the c1-bishop.'],
    ["…h6 takes g5 away from their bishop and knight. The engine prefers …Nd7, heading for c5 to hit their b3 pawn. It's about level. Your plan: keep the bishop pair, and bring the knight to c5 by way of d7, where it presses the doubled pawn on b3.", '…h6 — no g5; …Nd7 was better.'],
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
