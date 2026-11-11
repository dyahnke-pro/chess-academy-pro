// Bird's Opening — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=birds-opening`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays White. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a).
import type { WatchCourse } from './watchCourse';

const MAIN = ['f4', 'd5', 'Nf3', 'g6', 'g3', 'Bg7', 'Bg2', 'Nf6', 'O-O', 'O-O', 'd3', 'c5', 'Nc3', 'Nc6', 'e4', 'dxe4', 'dxe4', 'Qxd1', 'Rxd1', 'e5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["f4 — Bird's Opening. Why this pawn? It grabs e5 from the side, the square their e-pawn would love to reach, and if you know the Dutch Defence, this is it with the colors reversed and a full move up. It's no main road: f4 isn't even among the masters' five most common first moves, and the engine prefers e4. But it stays about level, and from the very first move both of you are out of e4 and d4 theory. The plan is simple: Nf3 next, and e5 belongs to you.", 'f4 — grabs e5 from the side.'],
  ["…d5, just over half the masters' choice. The pawn takes the center and covers e4, so your e-pawn can't simply walk up to e4. Remember that, because a lot of this line is about getting e4 in anyway.", '…d5 — center, covers e4.'],
  ["Nf3, close to nine masters in ten. Count the guards on e5 now: the f4 pawn and the knight. Their e-pawn isn't getting there any time soon, and you haven't committed your other pawns yet, so every setup is still open.", 'Nf3 — a second guard on e5.'],
  ["…g6, close to half the masters: their bishop is heading for g7, on the long diagonal that runs down to your b2 pawn. …Nf6 is the other main move, about a third.", '…g6 — the bishop heads for g7.'],
  ["How do you meet a fianchetto? With one of your own. g3, about six masters in ten, gets your bishop ready for g2 and gives your king a safe home behind it. If you know the Leningrad Dutch, this is it, colors reversed. e3 is the other road, about three masters in ten.", 'g3 — a fianchetto of your own.'],
  ["…Bg7, more than nine masters in ten. Look down the diagonal: the bishop hits your b2 pawn, with your rook on a1 standing right behind it. Your bishop on c1 guards b2 for now; just never leave that pawn without a guard while this bishop is staring at it.", '…Bg7 — the long diagonal, hits b2.'],
  ["Bg2 completes your fianchetto and clears the way to castle. Notice where it points: straight through e4 at d5. For now your own knight on f3 is in the way, but the moment it moves, that diagonal opens.", 'Bg2 — fianchetto done, castle next.'],
  ["…Nf6 develops, and now count e4: their pawn on d5 and this knight both cover it, and none of your pieces does yet. That's the square you want to push your e-pawn to, so your next few moves are about changing that count.", '…Nf6 — e4 covered twice.'],
  ["You castle: the king tucks in behind the g3 pawn and the bishop on g2, safe before anything opens up in the center.", 'O-O — king safe first.'],
  ["They castle too. Both kings are safe, both bishops sit on the long diagonals. So now the real question: who gets their pawn break in first? Yours is e4. Theirs is …c5, and then …d4.", '…O-O — both kings safe.'],
  ["d3, step one toward e4. The pawn covers e4, so the count is one of yours against two of theirs, and it takes that square away from their knight as well. One more piece on e4, and the push is ready.", 'd3 — covers e4, the push is coming.'],
  ["…c5 grabs queenside space and covers d4. Keep an eye on that: with the c-pawn behind it, …d4 can jump forward and kick any knight that lands on c3.", '…c5 — space, backs up …d4.'],
  ["Nc3, the piece you were missing. The knight hits d5 and covers e4, so it's two against two now, and e4 is ready. The risk is the one you just saw: …d4 would kick this knight before e4 ever happens.", 'Nc3 — hits d5, second guard on e4.'],
  ["…Nc6 develops toward d4 and e5, but it lets you go. The engine prefers …d4, kicking your knight off c3 before your break arrives. Now nothing stops e4.", '…Nc6 — natural, but …d4 was stronger.'],
  ["And here's the break the whole setup was built for: e4, hitting d5. If they take, you take back with the d-pawn, and your e- and f-pawns stand side by side in the center. If they push past with …d4, your knight has to move, but you've gained space. It's about level.", 'e4 — the break, hits d5.'],
  ["…dxe4: they take, and the pawn now hits your d3 pawn and the knight on f3. The engine prefers …d4, keeping the center closed; this capture opens it up. So how do you take back?", '…dxe4 — hits d3 and f3.'],
  ["With the pawn. Nxe4 looks active, but …c4 answers it, and a few moves later their queen checks on b6, down the diagonal to g1 that your f-pawn left open. dxe4 puts your e- and f-pawns side by side, and it opens the d-file: queen now faces queen.", 'dxe4 — pawns side by side.'],
  ["…Qxd1: with the d-file open, they trade queens straight away. Now the open file is the prize. Which piece takes back on d1?", '…Qxd1 — queens off.'],
  ["The rook, so it lands right on the open d-file. What about Nxd1? Then nothing guards your e4 pawn anymore, and …Nxe4 takes it for free.", 'Rxd1 — the rook takes the d-file.'],
  ["…e5: why now? Because your own push to e5 was coming, to kick the knight off f6. So they plant a pawn there first, and it hits your f4 pawn. It's about level. Your plan for the middlegame: take on e5 with the knight, and once the trades are done, put a knight on d5, the hole their c- and e-pawns left behind, with your rook on d1 backing it up.", '…e5 — hits f4; d5 is a hole.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });


/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  "Bird's: Leningrad Formation": ['f4', 'd5', 'Nf3', 'g6', 'g3', 'Bg7', 'Bg2', 'Nf6', 'O-O', 'O-O', 'd3', 'c5', 'c3', 'Nc6', 'Na3', 'Rb8', 'Nc2', 'b5', 'Be3', 'Qd6'],
  "Bird's: From's Gambit Accepted": ['f4', 'e5', 'fxe5', 'd6', 'exd6', 'Bxd6', 'Nf3', 'g5', 'd4', 'g4', 'Ne5', 'Bxe5', 'dxe5', 'Qxd1+', 'Kxd1', 'Nc6', 'Bf4', 'Bf5', 'Nc3', 'O-O-O+'],
  "Bird's: Nimzo-Larsen Hybrid": ['f4', 'd5', 'Nf3', 'Nf6', 'b3', 'g6', 'Bb2', 'Bg7', 'e3', 'O-O', 'Be2', 'c5', 'O-O', 'Nc6', 'Qe1', 'd4', 'Na3', 'Nd5', 'Bc4', 'Rb8'],
  "Bird's: Stonewall Formation": ['f4', 'd5', 'e3', 'Nf6', 'Nf3', 'e6', 'd4', 'c5', 'c3', 'Nc6', 'Bd3', 'Bd6', 'O-O', 'O-O', 'Ne5', 'Ne7', 'Nd2', 'b6', 'Rf3', 'h6'],
  "Bird's: Swiss Gambit": ['f4', 'f5', 'e4', 'fxe4', 'd3', 'exd3', 'Bxd3', 'Nf6', 'Nf3', 'd5', 'O-O', 'Nc6', 'h3', 'e6', 'Be3', 'Nb4', 'Bb5+', 'c6', 'Be2', 'c5', 'Ne5', 'Nc6'],
  "Bird's: From's Gambit Declined": ['f4', 'd5', 'Nf3', 'Nf6', 'e3', 'g6', 'b3', 'Bg7', 'Bb2', 'O-O', 'Be2', 'c5', 'O-O', 'Nc6', 'Ne5', 'Nxe5', 'Bxe5', 'Nd7', 'Bxg7', 'Kxg7'],
  "Bird's: Williams Variation": ['f4', 'd5', 'Nf3', 'Nf6', 'b3', 'Bf5', 'Bb2', 'e6', 'e3', 'Be7', 'Be2', 'O-O', 'O-O', 'Nbd7', 'Nh4', 'Ne4', 'Nf3', 'Bg6', 'd3', 'Nd6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  "Bird's: Leningrad Formation": [
    ["c3: the quieter road. Instead of a knight on c3, a pawn, covering d4 and b4, so …d4 can be met by a capture and your own b4 push will have support later. If you know the Leningrad Dutch, this is its Warsaw setup with the colors reversed, and you're a move up. They are a little better for now.", 'c3 — covers d4 and b4.'],
    ["…Nc6, the natural square: the knight adds weight to d4 and e5, and on d7 it would block their bishop on c8.", '…Nc6 — eyes d4 and e5.'],
    ["Na3? A knight on the rim, but it's only passing through. With your pawn on c3, the knight can't use that square, so it goes to a3 and then c2, where it backs up b4 and d4.", 'Na3 — on its way to c2.'],
    ["…Rb8: the rook gets behind the b-pawn, and the idea is plain: …b5, grabbing space on the queenside.", '…Rb8 — …b5 is coming.'],
    ["Nc2, and the trip is done. From c2 the knight covers b4 and d4, the two squares your queenside play needs, and b4 is the push it's getting ready.", 'Nc2 — covers b4 and d4.'],
    ["…b5 grabs space, but look what it leaves behind: no pawn guards c5 anymore. The engine prefers …b6, which keeps it guarded. So can you go after it?", '…b5 — space, but c5 is loose.'],
    ["You can: Be3 hits the c5 pawn, and nothing guards it. Every move they spend holding c5 is a move you spend getting b4 ready.", 'Be3 — hits the loose c5 pawn.'],
    ["…Qd6 guards c5 and hits your f4 pawn, which the g3 pawn and your bishop on e3 both hold. They are a little better. Your plan for the middlegame: b4, the push your knight on c2 was built for, to break up their queenside, and then that knight jumps to d4.", '…Qd6 — guards c5, hits f4.'],
  ],
  "Bird's: From's Gambit Accepted": [
    ["…e5: From's Gambit. They offer a pawn to tear open the diagonal your f-pawn left behind, the one from h4 to your king on e1. About six masters in a hundred try it, and the engine prefers …Nf6 or …d5. Take it calmly, and you're a little better.", "…e5 — From's Gambit, a pawn offered."],
    ["Take it: fxe5, eight masters in ten. e4, turning it into a King's Gambit, is the other try, about one in six, but it gives up your edge. Just watch for a queen check on h4: if it comes, g3 blocks.", 'fxe5 — take the pawn.'],
    ["…d6, nine masters in ten, and here's the point: they don't try to win the pawn back. The pawn hits e5 so that, if you take, their bishop comes to d6 for free, aimed at your king's side. Do you take again?", '…d6 — hits e5, opens the bishop.'],
    ["Yes, three masters in four do, and the engine rates exd6 the same as Nf3. You keep the extra pawn either way. The real question is what you do about the bishop that's about to land on d6.", 'exd6 — take again.'],
    ["…Bxd6, every master. Now look at that bishop: d6 to h2, a straight road toward your king, and their queen can join from h4 with check. That's the whole gambit: you're a pawn up, and they're aiming at h2 and the diagonal down to e1.", '…Bxd6 — aims at h2.'],
    ["Nf3, and every master plays it. Why? The knight covers h4, so that queen check is off the table, and it guards h2 as well. Play d3 instead, and …Qh4 check drives your king to d2.", 'Nf3 — covers h4 and h2.'],
    ["…g5, and the idea is plain: …g4 next, to kick away the knight that guards h2 and h4. Close to six masters in ten go for it, but the engine prefers the calm …Nf6, and this lunge leaves you a little better.", '…g5 — …g4 next, kicks the knight.'],
    ["So what do you do about …g4? Eight masters in ten stop it with g3, but d4 is just as good, and look what it does: it takes e5 under control, so your knight has a square waiting, and it opens your bishop on c1, which now hits g5. You are clearly better.", 'd4 — e5 ready, Bc1 hits g5.'],
    ["…g4, as planned: the pawn hits your knight on f3. Where does it go?", '…g4 — kicks the knight.'],
    ["Ne5, six masters in ten, and that's why d4 came first: on e5 the knight is guarded by the d4 pawn, and from there it hits f7 and g4. Ng5, the other master choice, runs into …f5 and throws your edge away.", 'Ne5 — the d4 pawn holds it.'],
    ["…Bxe5, nine masters in ten: they give up the bishop for your knight. It now hits d4 and h2, but nothing guards it, so you simply take.", '…Bxe5 — bishop for knight.'],
    ["dxe5: now you have the two bishops and an extra pawn. The price: your e-pawns are doubled, and the d-file is open, queen facing queen, while your king still sits on e1.", 'dxe5 — two bishops, a pawn up.'],
    ["…Qxd1 check: they trade queens, and this is what they get for the pawn. Your king on e1 has to take back, so it can never castle, while theirs still can.", '…Qxd1+ — queens off, with check.'],
    ["Kxd1, the only move: Kf2 lets their queen take your bishop on c1 and then the rook on h1. And without queens, a king in the middle is no disaster. You're a pawn up with the two bishops; now develop quickly.", 'Kxd1 — king takes back.'],
    ["…Nc6 develops with a hit on your e5 pawn, and nothing guards it. That's the first problem to solve.", '…Nc6 — hits the loose e5 pawn.'],
    ["Bf4: the bishop develops and guards e5 in one move. Nc3 first is about as good.", 'Bf4 — guards e5, develops.'],
    ["…Bf5 hits your c2 pawn, and only your king guards it. The engine prefers …Be6. Keep that pawn in mind: once they castle long with check, your king has to stay next to c2.", '…Bf5 — hits c2; …Be6 was better.'],
    ["Nc3 develops and covers e4, so e4 can come next and kick the bishop off f5.", 'Nc3 — e4 next, kicks f5.'],
    ["…O-O-O check: their king is safe, and the rook arrives on the open d-file with check. Where does your king go? Not e1, where …Bxc2 wins a pawn; c1 keeps guarding c2. You are a little better. Your plan for the middlegame: Kc1, then e4 to kick the bishop off f5, and hold your e5 pawn with the bishop on f4.", '…O-O-O+ — check; Kc1 guards c2.'],
  ],
  "Bird's: Nimzo-Larsen Hybrid": [
    ["…Nf6, about a third of masters: the knight develops and gives e4 a second guard, so your e-pawn stays home for now.", '…Nf6 — e4 covered twice.'],
    ["b3: the Nimzo-Larsen idea. Instead of g3, your bishop goes to b2, on the long diagonal, and from there it joins f4 and the knight on f3 in watching e5. About one master in twenty goes this way; g3 and e3 are the main roads.", 'b3 — the bishop heads for b2.'],
    ["…g6, two masters in three: a fianchetto of their own, so a bishop on g7 can meet yours on the same diagonal.", '…g6 — a fianchetto to meet yours.'],
    ["Bb2, and look what it hits: the knight on f6, with their rook on h8 behind it. The knight is pinned for now, because if it moves, your bishop takes the rook. That's why their bishop has to come to g7 next.", 'Bb2 — pins the knight to h8.'],
    ["…Bg7 steps in between: the knight on f6 isn't pinned anymore, and their bishop is ready to fight yours for the long diagonal. Castling comes next.", '…Bg7 — breaks the pin.'],
    ["e3: where does your other bishop go? This pawn opens its road to e2, and it props up your f4 pawn. c4, hitting d5 at once, is the engine's pick by a hair.", 'e3 — props up f4, frees f1.'],
    ["…O-O: their king is safe. The engine prefers …c5 first, grabbing space before you've castled.", '…O-O — …c5 was stronger.'],
    ["Be2: modest, but think about the alternatives. On d3 the bishop blocks your d-pawn, and on b5 their a-pawn can chase it. On e2 it's safe, and you can castle.", 'Be2 — modest, castle next.'],
    ["…c5 grabs space and covers d4. And now …d4 is in the air: a pawn there would hit e3 and cut your bishop on b2 off from the rest of the long diagonal.", '…c5 — space, …d4 in the air.'],
    ["You castle, king safe. Your queen and the knight on b1 are the last pieces left to bring out.", 'O-O — king safe.'],
    ["…Nc6 develops and puts a second piece behind d4, so the …d4 push is ready.", '…Nc6 — backs up …d4.'],
    ["Qe1, the classic Bird's queen move: from e1 the queen can swing to h4, toward their king. But it's slow here. The engine prefers Ne5, challenging the knight on c6 at once, and after Qe1 they are a little better.", 'Qe1 — heads for h4; Ne5 was better.'],
    ["…d4: there's the push. The pawn hits e3, blocks your bishop on b2 from the rest of the long diagonal, and takes c3 away from your knight.", '…d4 — hits e3, blocks the diagonal.'],
    ["So where does your last knight go? Not c3, because the d4 pawn covers it. Na3 is the way out, heading for c4.", 'Na3 — c3 is covered; c4 next.'],
    ["…Nd5: the knight jumps forward and hits your e3 and f4 pawns. Count e3: it's hit twice and guarded only by your d2 pawn, because your bishop on e2 blocks the queen's way.", '…Nd5 — hits e3 and f4.'],
    ["Bc4 does two jobs: it hits the knight on d5, and by leaving e2 it lets your queen on e1 guard e3. The engine slightly prefers Nc4.", 'Bc4 — hits d5, frees the e-file.'],
    ["…Rb8 gets the rook behind the b-pawn, ready for …b5 to chase your bishop. The engine prefers …Ndb4, and after …Rb8 it's about level. Your plan for the middlegame: c3, hitting their d4 pawn to reopen the long diagonal for your bishop on b2, and then your knight heads for b5.", '…Rb8 — …b5 next; …Ndb4 was stronger.'],
  ],
  "Bird's: Stonewall Formation": [
    ["e3: the Stonewall road. Only about three masters in a hundred go this way, but the engine rates it as highly as Nf3. The pawn props up f4 and opens the road for your bishop on f1 to reach d3, and d4 comes later to finish the wall. If you know the Stonewall Dutch, that's where this is heading, colors reversed.", 'e3 — props up f4.'],
    ["…Nf6, about a third of masters: the knight develops and covers e4. Keep that square in mind: once your d-pawn goes to d4, no pawn of yours can ever cover it again.", '…Nf6 — watches e4.'],
    ["Nf3, three masters in four. Now e5 has two of your guards, the f4 pawn and the knight. That's the trade the Stonewall makes: e5 becomes your square, and e4 becomes theirs.", 'Nf3 — e5 is your square.'],
    ["…e6, a rare choice, about six masters in a hundred. It opens the road for their bishop on f8, but look at the one on c8: shut in behind the pawns on b7 and e6. The engine prefers …g6.", '…e6 — locks in the c8-bishop.'],
    ["d4, and the wall is up: now d4, f4 and the knight on f3 all cover e5. The price is e4, which no pawn of yours can cover anymore.", 'd4 — the Stonewall is built.'],
    ["…c5: how do you fight a Stonewall? From the side. The pawn hits d4. So what's your answer: let them take, or make sure a pawn takes back?", '…c5 — hits d4 from the side.'],
    ["c3, about eight masters in ten: now if they take on d4, a pawn takes back, and the wall stays whole.", 'c3 — d4 stays a pawn.'],
    ["…Nc6, about four masters in ten: a second piece hits d4, and the knight watches e5 too. The engine prefers …Bd6 first.", '…Nc6 — a second hit on d4.'],
    ["Where does your bishop belong? d3, aimed straight at h7. In the Stonewall this is your attacking piece.", 'Bd3 — aimed at h7.'],
    ["…Bd6 mirrors you: their bishop aims at your f4 pawn, and the e3 pawn holds it. Both sides are a move from castling.", '…Bd6 — aims at f4.'],
    ["You castle, king safe before anything starts. Next, the knight on f3 jumps.", 'O-O — king safe, Ne5 next.'],
    ["They castle too, onto the very side your bishop on d3 is pointing at.", '…O-O — toward your bishop.'],
    ["Ne5: here's the square the whole setup was built for. The knight is guarded by d4 and f4, it hits their knight on c6 and the f7 pawn, and no pawn can kick it except an …f6 push.", 'Ne5 — the outpost.'],
    ["…Ne7: they don't trade on e5. The knight reroutes toward the squares in front of their king, and from e7 it covers f5 and g6.", '…Ne7 — covers f5.'],
    ["Nd2: the last minor piece comes out, and look where it points: e4, the hole the Stonewall left. With your bishop on d3 it's covered twice now.", 'Nd2 — covers the e4 hole.'],
    ["…b6: remember that bishop on c8, locked in by …e6? This is its way out: …Bb7 next, with b7 cleared for it.", '…b6 — …Bb7 next.'],
    ["Rf3: the rook lift. It guards your f4 pawn and is one move from h3, where it lines up on their h-pawn, right next to the king.", 'Rf3 — the rook lift toward h3.'],
    ["…h6 gives their king a little air on h7. The engine prefers …Bb7. It's about level. Your plan for the middlegame: Rh3 and Qf3, lining up on the h6 pawn, with g4 to follow.", '…h6 — luft; …Bb7 was better.'],
  ],
  "Bird's: Swiss Gambit": [
    ["…f5: they copy you, pawn for pawn. It isn't among the masters' five most common answers, and the engine prefers …Nf6 or …d5. And copying has a cost: their king's diagonal, from e8 to h5, is open now, the same weakness your f-pawn left on your side.", '…f5 — the mirror; e8 to h5 opens.'],
    ["So how do you punish the copy? e4, the Swiss Gambit. You offer the e-pawn to blow open the center while their king sits on that open diagonal. About a quarter of masters go for it; Nf3 is the calm main move. It's about level.", 'e4 — the Swiss Gambit.'],
    ["…fxe4: every master takes, and they're a pawn up. But that pawn on e4 is a long way from home, and you go after it straight away.", "…fxe4 — they're a pawn up."],
    ["d3, every master's move: the pawn hits e4 and opens the road for your bishop on c1. If they take, your bishop on f1 takes back and lands on d3.", 'd3 — hits e4, frees c1.'],
    ["…exd3, about a third of masters: they grab again, but nothing guards that pawn on d3, so your bishop takes it back right away.", '…exd3 — loose on d3.'],
    ["Bxd3: look where the bishop lands, aimed at h7. You're a pawn down, but your pieces are coming fast, and that open diagonal toward their king is a real target. Watch what happens if they play …d5 here.", 'Bxd3 — the bishop aims at h7.'],
    ["…Nf6 is the careful move: the knight covers h5. Why does that matter? Play …d5 instead, and Qh5 check comes. Block with …g6, and Bxg6 check breaks through, because if they take back with the h-pawn, your queen takes the rook on h8.", '…Nf6 — covers h5.'],
    ["Nf3 develops and clears the way for your king to reach g1. A pawn down, every move has to bring a piece out, and for now they are a little better.", 'Nf3 — develop, castle next.'],
    ["…d5: now it's safe, because the knight covers h5. The pawn claims the center and opens the road for their bishop on c8.", '…d5 — center, frees c8.'],
    ["You castle, king safe. And look at the e-file: your e-pawn is gone, so it's half-open, and your queen can step to e1 to use it.", 'O-O — king safe, e-file half-open.'],
    ["…Nc6 develops and adds a guard to e5, the square your knight would love.", '…Nc6 — develops, covers e5.'],
    ["Where's their bishop on c8 heading? g4, to pin your knight on f3 to your queen. h3 takes that square away first.", 'h3 — no pin on g4.'],
    ["…e6 props up d5 and covers f5. But notice their bishop on c8: kept off g4 by your h3, it's now shut in behind the e6 pawn.", '…e6 — guards d5; c8 shut in.'],
    ["Be3: the last minor piece comes out. It covers c5 and d4, so their bishop can't use c5 to aim at your king.", 'Be3 — covers c5 and d4.'],
    ["…Nb4 goes after your best piece: the bishop on d3, the one aimed at h7. Trade it off, and most of your attack goes with it.", '…Nb4 — chases the d3-bishop.'],
    ["Do you let them trade? No: Bb5 check. On b5 the bishop is out of the knight's reach, and the check has to be answered first.", 'Bb5+ — out of reach, with check.'],
    ["…c6 blocks and hits your bishop at once. That pawn is pinned to their king, but it can still take the bishop that pins it, so the bishop on b5 has to move.", '…c6 — blocks and hits b5.'],
    ["Be2: back to safety, out of the knight's reach. And keep an eye on h5: once the knight on f3 moves, this bishop can give check from there.", 'Be2 — safe; h5 later.'],
    ["…c5: the pawn guards their knight on b4 and covers d4, so …d4 next would hit your bishop on e3.", '…c5 — guards b4, eyes d4.'],
    ["Ne5, and here's what the gambit bought you. The knight sits on e5, guarded by f4, and no pawn of theirs can ever chase it: their f-pawn is gone and their d-pawn has already moved past d6. A permanent outpost. And with the knight off f3, your bishop can check on h5.", 'Ne5 — a permanent outpost.'],
    ["…Nc6: the knight comes back to challenge yours on e5. They are a little better, because a pawn is a pawn. Your plan for the middlegame: c4 to hit d5 and open the center, with the bishop check on h5 ready to loosen their king.", '…Nc6 — challenges e5; c4 next.'],
  ],
  "Bird's: From's Gambit Declined": [
    ["e3, about four masters in ten: the pawn props up f4 and frees your bishop on f1.", 'e3 — props up f4.'],
    ["…g6, half the masters: their bishop is heading for g7 and the long diagonal.", '…g6 — the bishop heads for g7.'],
    ["b3: so your dark-squared bishop goes to b2, to meet theirs on that same long diagonal, the Nimzo-Larsen setup by a different order.", 'b3 — the bishop heads for b2.'],
    ["…Bg7: their bishop gets to the diagonal first, sitting behind the knight on f6.", '…Bg7 — the long diagonal.'],
    ["Bb2: now the bishops face each other with their knight on f6 in between. Your bishop hits it and their bishop on g7 guards it, so nothing is hanging, but that diagonal is going to matter.", 'Bb2 — hits f6, faces g7.'],
    ["…O-O: their king goes to g8, tucked in behind the bishop on g7.", '…O-O — king safe.'],
    ["Be2: on d3 the bishop would get in your d-pawn's way, and on b5 a pawn could chase it. On e2 it's out of the way, and you're ready to castle.", 'Be2 — out of the way, castle next.'],
    ["…c5 grabs space and covers d4, the square their d-pawn would like to reach.", '…c5 — space, covers d4.'],
    ["You castle, the king tucks in on g1, and look at the board: it's the same position as in the Nimzo-Larsen tab, reached by a different move order. There you played Qe1 a move later. This time there's something better.", 'O-O — the Nimzo-Larsen position again.'],
    ["…Nc6 develops and backs up a …d4 push. Now it's your move, and here's the improvement on Qe1.", '…Nc6 — backs up …d4.'],
    ["Ne5, the engine's choice: the knight jumps to the square that f4 and your bishop on b2 have been watching from the start, and it hits their knight on c6. So, do they trade, or let it sit there?", 'Ne5 — the outpost, hits c6.'],
    ["…Nxe5: they trade on e5. Now, how do you take back: with the f-pawn or the bishop?", '…Nxe5 — they trade.'],
    ["The bishop. fxe5 kicks the knight off f6, but it just hops to e4, and the engine prefers the bishop. After Bxe5 your bishop stares down the diagonal at their knight on f6.", 'Bxe5 — the bishop takes back.'],
    ["…Nd7 hits your bishop, and here's the catch: it's pinned. If it steps off the long diagonal, their bishop on g7 takes your rook on a1.", "…Nd7 — hits e5, and the bishop's pinned."],
    ["So trade: Bxg7, and the pin is gone. What about d4, propping up the bishop on e5? Then …f6, and the pinned bishop falls for a pawn.", "Bxg7 — trade, and the pin's gone."],
    ["…Kxg7, forced: anything else and you keep the extra piece. It's about level. Your plan for the middlegame: Bf3, hitting their d5 pawn, which nothing guards now, then Qe1 and d3 to fight for e4.", '…Kxg7 — level; Bf3 hits d5.'],
  ],
  "Bird's: Williams Variation": [
    ["…Bf5, about one master in ten: the bishop comes out before …e6 can lock it in. Now e4 is covered three times, by the d5 pawn, the knight on f6 and this bishop, and it hits your c2 pawn too. The engine prefers …g6.", '…Bf5 — out before …e6.'],
    ["Bb2 hits the knight on f6 and joins f4 and the knight on f3 on e5: three of your pieces on that square now.", 'Bb2 — three of yours on e5.'],
    ["…e6: now that the bishop is outside, the pawn can come to e6 without shutting it in, and it opens the road for their bishop on f8.", '…e6 — frees the f8-bishop.'],
    ["e3 props up f4 and opens the road for your bishop on f1, the same quiet setup as the Nimzo-Larsen.", 'e3 — props up f4.'],
    ["…Be7: not c5, where your d-pawn could kick it, and not b4, where a3 does. On e7 it's safe, and they're ready to castle.", '…Be7 — safe square, castle next.'],
    ["Be2: why not d3? Because their bishop on f5 is waiting there to trade itself for yours. On e2 your bishop stays, and you castle next.", 'Be2 — castle next.'],
    ["…O-O: their king goes to g8.", '…O-O — king safe.'],
    ["You castle too. Now, what's bothering you most? That bishop on f5. It covers e4 and d3, so neither of your center pawns can step up freely.", 'O-O — now, the f5-bishop.'],
    ["…Nbd7 gives the knight on f6 a third guard against your bishop on b2. On c6 it would block their c-pawn.", '…Nbd7 — backs up f6.'],
    ["Nh4 goes after that bishop on f5: trade it off, and your d- and e-pawns are free. The engine prefers the quieter d3 first, and you'll see why in a move.", 'Nh4 — after f5; d3 was better.'],
    ["…Ne4, and look what it uncovers: with the knight off f6, their bishop on e7 now hits your knight on h4, and nothing guards it. A discovered attack.", '…Ne4 — uncovers an attack on h4.'],
    ["Nf3: back it goes, and it's the best move here. Guarding the knight with g3 instead loses material after …Bxh4. So the trip to h4 cost you two moves, and that's why d3 was better.", 'Nf3 — back to safety.'],
    ["…Bg6: the bishop steps back, still covering f5, and now it guards the knight on e4.", '…Bg6 — guards the e4 knight.'],
    ["d3: finally, and now it comes with a hit. The pawn kicks the knight off e4.", 'd3 — kicks the knight off e4.'],
    ["…Nd6: the knight drops back but keeps an eye on e4, f5 and c4. It's about level. Your plan for the middlegame: g4 to grab space on the kingside, then c4 to hit their d5 pawn.", '…Nd6 — still watches e4.'],
  ],
};

/** File a tab's beats on the first moves it doesn't share with what is already written. */
for (const [tab, moves] of Object.entries(TAB_LINES)) {
  const own = TAB_BEATS[tab] ?? [];
  let k = 0;
  while (k < moves.length && beats[moves.slice(0, k + 1).join(' ')]) k += 1;
  if (own.length !== moves.length - k) throw new Error(`${tab}: ${own.length} beats for ${moves.length - k} unshared moves`);
  own.forEach(([say, sayShort], i) => { beats[moves.slice(0, k + i + 1).join(' ')] = { say, sayShort }; });
}

export const BIRDS_OPENING_WATCH: WatchCourse = {
  openingId: 'birds-opening',
  title: "Bird's Opening — A Master Class",
  orientation: 'white',
  sources: ['concept:pos-outpost', 'concept:pos-space', 'concept:pos-development', 'concept:pawn-chain', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Bird%27s_Opening'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
