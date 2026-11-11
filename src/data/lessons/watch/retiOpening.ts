// The Réti Opening — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=reti-opening`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays White. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a).
import type { WatchCourse } from './watchCourse';

const MAIN = ['Nf3', 'd5', 'c4', 'd4', 'e3', 'Nc6', 'exd4', 'Nxd4', 'Nxd4', 'Qxd4', 'Nc3', 'e5', 'd3', 'Bc5', 'Be3', 'Qd6', 'Nb5', 'Qe7', 'Bxc5', 'Qxc5', 'd4', 'exd4', 'Qxd4', 'Qxd4', 'Nxd4', 'Bd7', 'O-O-O', 'O-O-O', 'c5', 'Nh6', 'Bc4', 'Rhe8', 'c6', 'Bxc6', 'Nxc6', 'bxc6'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["Nf3. Notice what it doesn't do: no pawn goes to the middle. The knight covers d4 and e5 and waits to see how they set up before you commit a single pawn. That's the hypermodern idea: control the center from a distance first, then strike at it. About one master in ten starts this way. e4 and d4 are far more common, and the engine prefers e4, but it's about level.", 'Nf3 — covers d4 and e5, no commitment.'],
  ["…d5, about three masters in ten. They take the center the classical way: the pawn stands on d5 and covers c4 and e4. So here's the question the whole opening asks: how do you fight that pawn without planting one of your own next to it?", '…d5 — the classical center, covers e4.'],
  ["Here's the answer, and the move the Réti is built on: c4. The pawn hits d5 from the side. You still have no pawn on d4 or e4. You let them build the center, and then you attack it from the flank. Now they have to choose: hold d5, take on c4, or push past with …d4. Your c4 pawn has no guard yet, and that's fine. About two masters in ten play c4 here, g3 is more common, and the engine rates e3 and d4 a touch higher. It's about level.", 'c4 — hits d5 from the side.'],
  ["…d4: they don't hold d5 and they don't take on c4. They push past. About one master in four does it, and it's the engine's first choice. The pawn grabs space and covers c3, so your knight can't come there. This is a reversed Benoni: they have the space, and your job is to attack that pawn.", '…d4 — pushes past, grabs space.'],
  ["How do you fight a pawn on d4? Hit it at once: e3, and it's the engine's choice. About two masters in ten play it; b4 is more popular. The pawn on e3 hits d4 and opens a road for your bishop on f1. Now they have to decide whether to hold d4 or let it go.", 'e3 — hits d4, frees the f1-bishop.'],
  ["…Nc6, three masters in four: the knight gives d4 a second guard, alongside the queen on d8. The other master move, about two in ten, is …c5, holding d4 with a pawn instead.", '…Nc6 — a second guard on d4.'],
  ["exd4, six masters in ten: you take, and for a moment you're a pawn up. Their knight takes right back, so the real question is where the pieces end up after that.", 'exd4 — take the pawn.'],
  ["…Nxd4, and every master takes back this way. The knight lands in the middle and hits your knight on f3. Trade, or step aside?", '…Nxd4 — takes back, hits f3.'],
  ["Trade: Nxd4. Now their queen has to take back on d4, and that pulls it into the middle of the board very early. Remember that queen, because much of what follows is about gaining time on it.", 'Nxd4 — trade, their queen must recapture.'],
  ["…Qxd4: the queen takes back and lands in the center, hitting four of your pawns: b2, c4, d2 and f2. Each one has a guard, so nothing hangs, but you have to keep it that way while you develop.", '…Qxd4 — the queen in the center.'],
  ["Nc3 develops and steps into the queen's path: the line from d4 to b2 is blocked now, so that pawn is safe. The engine prefers Be2, getting ready to castle.", 'Nc3 — develops, blocks the line to b2.'],
  ["…e5 grabs the center and puts a pawn behind the queen, so it can stay on d4. It also opens the way for their bishop on f8. Watch where that bishop goes.", '…e5 — props up the queen on d4.'],
  ["d3 looks quiet, but it does two jobs. The pawn guards c4 and covers e4, and it opens the diagonal for your bishop on c1. Where's that bishop going? To e3, where it hits the queen.", 'd3 — guards c4, frees the c1-bishop.'],
  ["…Bc5, and now look at f2. The bishop backs up the queen on that diagonal, so …Qxf2 would be checkmate. That's the threat you have to answer right now. The engine prefers the quieter …Nh6.", '…Bc5 — threatens mate on f2.'],
  ["How do you stop the mate? Nb5, hitting c7, is tempting, but …Qxf2 ends the game at once. Be3 does it with a gain of time: the bishop blocks the diagonal to f2 and attacks the queen on d4. The engine prefers Qe2, which guards f2 more quietly.", 'Be3 — blocks f2, hits the queen.'],
  ["…Qd6: the queen has to move, and on d6 it keeps guarding the bishop on c5, which your bishop on e3 now hits. But notice: the queen is that bishop's only guard. Hit the queen again, and c5 is in trouble.", '…Qd6 — the only guard of c5.'],
  ["Nb5, and here's that hit: the knight attacks the queen on d6, the bishop's only guard. Why not take on c5 first? The bishop isn't going anywhere, so make the threat first. And from b5 the knight also covers d4, the square your d-pawn wants.", 'Nb5 — hits the queen, covers d4.'],
  ["…Qe7 steps out of the knight's reach and still guards the bishop on c5. So now you take.", '…Qe7 — still guards c5.'],
  ["Bxc5: bishop for bishop. The queen has to take back, and look where it lands: on c5, one step in front of your d-pawn.", 'Bxc5 — the queen must take back.'],
  ["…Qxc5: the queen takes back and hits three things at once, your knight on b5, the c4 pawn and f2. Each has a guard. So do you defend? No: you hit the queen again.", '…Qxc5 — hits b5, c4 and f2.'],
  ["d4, and that's the third time you've gained a move on the queen. The pawn hits it on c5, and it's guarded twice, by the knight on b5 and your queen on d1.", 'd4 — kicks the queen again.'],
  ["…exd4: they take, and the e-file is wide open now, with both kings still standing on it. Your queen takes back on d4.", '…exd4 — the e-file opens.'],
  ["Qxd4: your queen takes back and stands face to face with theirs. It also hits g7, and nothing guards that pawn. Their best answer is to trade queens.", 'Qxd4 — offers the trade, hits g7.'],
  ["…Qxd4: they trade. Your knight takes back, and the queens are gone.", '…Qxd4 — queens come off.'],
  ["Nxd4: the knight takes back on d4, right in the middle. Without queens, the question is simple: who gets the king and the rooks to the right squares first?", 'Nxd4 — back to the center.'],
  ["…Bd7 develops and clears c8 so they can castle long. Why not g4 for the bishop? There f3 would just kick it.", '…Bd7 — clears the way to castle long.'],
  ["You castle long as well. The king goes to c1, and the rook lands on d1, behind your knight, so the knight on d4 finally has a guard.", 'O-O-O — king safe, rook guards d4.'],
  ["…O-O-O: their rook comes to d8 too. Now the d-file has a rook at each end, with your knight and their bishop in between.", '…O-O-O — rooks face down the d-file.'],
  ["c5: the pawn grabs space on the queenside and clears c4 for your bishop. From c4 it aims straight at f7.", 'c5 — clears c4 for the bishop.'],
  ["…Nh6 brings out the last knight, aiming for g4, and from h6 it also guards f7. The engine prefers …Nf6, where the knight has more squares.", '…Nh6 — out, and guards f7.'],
  ["Bc4, onto the square c5 cleared. The bishop aims at f7, and the knight on h6 is the only piece guarding it.", 'Bc4 — aims at f7.'],
  ["…Rhe8: the other rook takes the open e-file. But look at their bishop on d7, standing right in front of their rook on d8. What can hit it there?", '…Rhe8 — the rook takes the e-file.'],
  ["The pawn can: c6, hitting the bishop on d7 and the pawn on b7. If the bishop takes, your knight takes back on c6 and hits their rook on d8. You give up a pawn in the end, but the lines toward their king open.", 'c6 — hits the bishop on d7.'],
  ["…Bxc6: they take, and now the bishop looks down the long diagonal at g2, with your rook on h1 behind it. So don't wait: one slow move and …Bxg2 hits the rook. Take back now.", '…Bxc6 — the bishop eyes g2.'],
  ["Nxc6: the knight takes the bishop and lands on c6, hitting the rook on d8 and the pawn on a7. You're a little better.", 'Nxc6 — hits the rook on d8.'],
  ["…bxc6: they take the knight, and now you're a pawn down. Yet it's about level, and here's why: their b-pawn is gone, their c-pawns are doubled on c6 and c7, and the diagonal from a6 to c8 is open in front of their king. Your plan from here: Ba6 check to push the king to b8, trade rooks on the d-file, and go after those doubled pawns.", '…bxc6 — doubled pawns, an open king.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });


/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Reti: KIA Setup g3 Bg2 d3 e4': ['Nf3', 'd5', 'g3', 'c6', 'Bg2', 'Bg4', 'O-O', 'Nd7', 'd3', 'Ngf6', 'Nbd2', 'e5', 'e4', 'dxe4', 'dxe4', 'Bc5', 'h3', 'Bh5', 'Qe1', 'O-O'],
  'Reti: Advance c4 d4': ['Nf3', 'd5', 'c4', 'e6', 'g3', 'Nf6', 'Bg2', 'Be7', 'O-O', 'O-O', 'd4', 'c6', 'Nc3', 'Nbd7', 'Qc2', 'b6', 'e4', 'dxe4', 'Nxe4', 'Bb7'],
  'Reti: Accepted dxc4 Bxc4': ['Nf3', 'd5', 'c4', 'dxc4', 'e3', 'Nf6', 'Bxc4', 'e6', 'O-O', 'c5', 'd4', 'a6', 'dxc5', 'Bxc5', 'Qe2', 'O-O', 'e4', 'b5', 'Bd3', 'Nc6', 'e5', 'Nb4'],
  'Reti: LSB Fianchetto': ['Nf3', 'd5', 'g3', 'Nf6', 'Bg2', 'e6', 'O-O', 'Be7', 'd3', 'O-O', 'Nbd2', 'c5', 'e4', 'Nc6', 'Re1', 'b5', 'e5', 'Nd7', 'Nf1', 'a5', 'Bf4', 'Ba6'],
  'Reti: Nimzo-English Hybrid': ['Nf3', 'd5', 'c4', 'e6', 'g3', 'Nf6', 'Bg2', 'Be7', 'O-O', 'O-O', 'b3', 'c5', 'Bb2', 'Nc6', 'e3', 'b6', 'd4', 'Bb7', 'Nc3', 'Rc8', 'Rc1', 'cxd4'],
  'Reti: Reti Gambit': ['Nf3', 'd5', 'c4', 'd4', 'e3', 'Nc6', 'exd4', 'Nxd4', 'Nxd4', 'Qxd4', 'Nc3', 'e5', 'd3', 'Bc5', 'Be3', 'Qd6', 'Ne4', 'Bb4+', 'Bd2', 'Bxd2+', 'Qxd2'],
  'Reti: Anti-Slav': ['Nf3', 'd5', 'c4', 'c6', 'g3', 'Nf6', 'Bg2', 'Bf5', 'b3', 'e6', 'Bb2', 'Nbd7', 'O-O', 'Be7', 'd3', 'O-O', 'Nbd2', 'h6', 'Rc1', 'Bh7'],
  'Reti: Reversed Benoni': ['Nf3', 'd5', 'c4', 'd4', 'b4', 'g6', 'Bb2', 'Bg7', 'g3', 'e5', 'd3', 'Ne7', 'Bg2', 'O-O', 'O-O', 'Nd7', 'Nbd2', 'c5', 'a3', 'Rb8', 'Ne4', 'b6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Reti: KIA Setup g3 Bg2 d3 e4': [
    ["g3: the other road, and in fact the most popular one, close to four masters in ten. Before deciding anything about c4, you get the bishop ready for g2 and the king ready to castle. For now your own knight on f3 stands on that bishop's long diagonal; the moment it moves, the bishop sees d5.", 'g3 — the bishop heads for g2.'],
    ["…c6, about two masters in ten: a Slav-style pawn that props up d5. Their bishop on c8 is free to come out, and …Bg4 is the plan.", '…c6 — props up d5.'],
    ["Bg2, nearly every master. The fianchetto's done and castling comes next. And here's the plan for this whole line: d3, then e4. This is the King's Indian Attack, the King's Indian setup with the colors reversed.", 'Bg2 — fianchetto done, castle next.'],
    ["…Bg4, two masters in three: the bishop comes out and presses on your knight on f3. It's guarded twice, by the bishop on g2 and the e2 pawn, so nothing's in danger yet.", '…Bg4 — presses on your f3 knight.'],
    ["You castle, close to half the masters' choice. The king is safe before anything happens in the center.", 'O-O — king safe first.'],
    ["…Nd7, close to eight masters in ten. Why d7 and not f6? From d7 the knight covers e5, so if your knight jumps there to hit the bishop on g4, it simply gets taken. And it backs up a later …e5.", '…Nd7 — keeps your knight off e5.'],
    ["d3, more than half the masters: the pawn covers e4, and that's where your e-pawn is headed. One more piece on e4, and the push is ready.", 'd3 — covers e4, e4 is next.'],
    ["…Ngf6, close to half the masters: the other knight comes out and adds a guard on e4. So it's their pawn on d5 and this knight against your d3 pawn. You need one more.", '…Ngf6 — e4 covered twice.'],
    ["Nbd2, about half the masters: there's your second guard on e4. Two against two, and the knight on d2 also backs up your knight on f3. Now e4 is ready.", 'Nbd2 — two guards on e4.'],
    ["…e5, three masters in four: they grab more of the center and free their bishop on f8. Does that stop your break? No, e4 comes anyway.", '…e5 — more center, frees the f8-bishop.'],
    ["e4: the break you built for. The pawn hits d5. But one thing changes: your e-pawn has left e2, so their bishop on g4 now pins your knight on f3 to the queen on d1. Remember that pin.", 'e4 — the break, hits d5.'],
    ["…dxe4: they take, and the pawn hits your pinned knight on f3. Which piece takes back?", '…dxe4 — hits your pinned knight.'],
    ["The pawn. Nxe4 lets them trade knights, and you can't simply ignore the hit on f3 either: Re1 gives up the knight for a pawn after …exf3. dxe4 keeps a pawn on e4. Notice, though, that this pawn now blocks your own bishop on g2, so here your play comes from space in the center, not that diagonal.", 'dxe4 — the pawn takes back.'],
    ["…Bc5 aims down the diagonal at f2, and that pawn is now pinned to your king on g1. So your knight on f3 is pinned and so is f2: time to untangle.", '…Bc5 — aims at f2.'],
    ["h3 asks the bishop on g4 a question: take on f3, or step back and keep the pin?", 'h3 — asks the g4-bishop.'],
    ["…Bh5 keeps the pin: the bishop still hits your knight on f3, with the queen on d1 behind it.", '…Bh5 — keeps the pin on f3.'],
    ["Qe1 steps off that line, so the knight on f3 is free again, and from e1 the queen guards both e4 and f2. The engine slightly prefers Qe2.", 'Qe1 — breaks the pin, guards e4.'],
    ["They castle, and it's about level. Your plan for the middlegame: Nb3 to hit the bishop on c5, then a4 for queenside space and Be3 to challenge the diagonal it uses toward your king.", '…O-O — about level.'],
  ],
  'Reti: Advance c4 d4': [
    ["…e6, about a third of masters: the solid answer. The pawn backs up d5, so if you take on d5, a pawn takes back, and it opens the road for their bishop on f8. The engine prefers …d4.", '…e6 — backs up d5.'],
    ["g3, about four masters in ten. Your c4 pawn still has no guard, but you don't need one yet: if …dxc4, Qa4 check picks the pawn up again. The bishop is going to g2.", 'g3 — the bishop heads for g2.'],
    ["…Nf6, six masters in ten: the knight develops and covers e4, the square your own e-pawn would love.", '…Nf6 — develops, covers e4.'],
    ["Bg2: the fianchetto's done. Look down the diagonal: f3, e4, d5. Your own knight is in the way for now, but this bishop is aimed straight at their center, and that's the Réti: pressure from the corner instead of pawns in the middle.", 'Bg2 — aimed at the center from the corner.'],
    ["…Be7, half the masters: a quiet square. On b4 your a-pawn could chase it, and on c5 your d-pawn could. Castling comes next.", '…Be7 — quiet, castle next.'],
    ["You castle, eight masters in ten. The king is tucked in behind the bishop on g2.", 'O-O — king behind the g2-bishop.'],
    ["They castle too, nearly every master. Both kings are safe, and now the real Réti question comes up: when does your d-pawn finally go to d4?", '…O-O — both kings safe.'],
    ["Now. d4, about half the masters, and the engine's choice. You held the center pawns back while your pieces came out; now the pawn arrives with two guards behind it, and the structure is a Catalan: pawns on c4 and d4, bishop on g2.", 'd4 — the center, with support.'],
    ["…c6, about one master in six; most take on c4 here, about seven in ten. The pawn props up d5, so their center holds.", '…c6 — props up d5.'],
    ["Nc3, about two masters in ten, while Qc2 is the main move. The knight hits d5 and covers e4, the square your e-pawn is aiming for. With the knight here, this is the Closed Catalan.", 'Nc3 — hits d5, covers e4.'],
    ["…Nbd7: the last knight develops behind the pawns and covers c5 and e5, the two squares their pawn breaks would use.", '…Nbd7 — covers c5 and e5.'],
    ["Qc2 gets behind e4: now the knight on c3 and the queen both cover it, and the queen also looks down the diagonal at h7. But the engine prefers Qd3 here, and after Qc2 it's about level.", 'Qc2 — backs e4; Qd3 was stronger.'],
    ["…b6, six masters in ten: their bishop on c8 is heading for b7, on the long diagonal. The engine prefers …dxc4.", '…b6 — the bishop heads for b7.'],
    ["e4: there's the break. Your c4, d4 and e4 pawns now stand side by side, and the e-pawn hits d5. What do they do?", 'e4 — the break, hits d5.'],
    ["…dxe4: they take, and the pawn on e4 hits your knight on f3. The engine prefers …dxc4, taking the other pawn, and after this capture you're a little better. So how do you take back?", '…dxe4 — hits your f3 knight.'],
    ["With the knight: Nxe4. Why not the queen? Qxe4 runs into …Nxe4, and the queen is gone. The knight lands in the center and hits their knight on f6.", 'Nxe4 — centralized, hits f6.'],
    ["…Bb7: the bishop finally reaches the long diagonal, but their own pawn on c6 blocks it. The engine prefers …Nxe4, and now you are clearly better. Your plan for the middlegame: Nxf6 check, Rd1 behind your d-pawn, and then Ne5, which clears f3 so your bishop on g2 hits c6.", '…Bb7 — blocked by c6; you are clearly better.'],
  ],
  'Reti: Accepted dxc4 Bxc4': [
    ["…dxc4: they simply take the pawn, about six masters in a hundred. It's a real pawn, but look what it cost them: their d-pawn has left the center. You'll win it back. The engine prefers …d4, and after this capture you're a little better.", '…dxc4 — grabs the pawn.'],
    ["e3, half the masters: the pawn opens the road for your bishop on f1, and suddenly the c4 pawn has a problem. Nothing guards it, and Bxc4 is coming.", 'e3 — frees the f1-bishop for Bxc4.'],
    ["…Nf6, six masters in ten: they don't try to hold the pawn. The knight develops and covers e4.", '…Nf6 — develops, lets the pawn go.'],
    ["Bxc4, nearly every master: the pawn's back, and the bishop comes out with it. Look at its diagonal, down to f7, a pawn only their king guards.", 'Bxc4 — pawn back, bishop aims at f7.'],
    ["…e6, nine masters in ten: the pawn takes d5 away from your bishop and opens their bishop on f8. The price: the other bishop, on c8, is now shut in behind it.", '…e6 — solid, but shuts in c8.'],
    ["You castle: king safe before anything opens in the center.", 'O-O — king safe.'],
    ["…c5 strikes from the side, the same idea you used with c4: the pawn covers d4 before your d-pawn can settle there.", '…c5 — fights for d4 from the side.'],
    ["d4, the engine's choice: the pawn hits c5 and stakes out the center. Now the pawns face each other, d4 against c5.", 'd4 — hits c5.'],
    ["…a6, more than eight masters in ten: room for …b5, which will kick your bishop off c4.", '…a6 — …b5 is coming.'],
    ["dxc5, about a quarter of masters, and the engine's first choice. You take first, and the d-file opens with the queens facing each other. If …Qxd1, your rook takes back and owns that file.", 'dxc5 — opens the d-file.'],
    ["…Bxc5, half the masters; the other half trade queens first. The bishop takes back and now aims at your e3 pawn.", '…Bxc5 — takes back, aims at e3.'],
    ["Qe2 keeps the queens on. Nine masters in ten trade with Qxd8 check instead, and that's simpler. On e2 the queen steps off the d-file, guards e3 and gets behind the e-pawn, ready for e4.", 'Qe2 — queens stay on, e4 next.'],
    ["…O-O, about one master in eight; …Nc6 and …b5 are more common, and the engine prefers …Nbd7. Their king is safe, and you're a little better.", '…O-O — …Nbd7 was better.'],
    ["e4, close to nine masters in ten, and the engine's choice: the pawn takes the center, with your queen behind it. Watch one thing: with e3 gone, their bishop on c5 now looks straight down the diagonal at f2 and your king on g1.", 'e4 — the center, queen behind it.'],
    ["…b5, the push …a6 prepared: the pawn hits your bishop on c4. Where does it go?", '…b5 — kicks the bishop.'],
    ["Bd3: the bishop backs up e4 and keeps an eye on b5. Right now your own pawn on e4 blocks its view of h7, but if that pawn moves forward, the bishop looks straight at their king's corner.", 'Bd3 — backs up e4, hits b5.'],
    ["…Nc6 develops toward e5. But the engine prefers …e5 at once, putting a pawn on that square before yours gets there.", '…Nc6 — natural, but …e5 was better.'],
    ["And yours gets there first: e5 hits the knight on f6, and their own …e5 can never come now. With e4 clear, look at your bishop on d3: it sees all the way to h7.", 'e5 — kicks f6, the bishop sees h7.'],
    ["…Nb4: they don't save the knight on f6. They counter instead: the knight hits your bishop on d3, which their queen on d8 also hits down the open file, and only your queen guards it. What about …Nd5? Then Bxh7 comes with check. It's about level. Your plan for the middlegame: Rd1, so that if the knight takes on d3 your rook takes back on the open d-file, then Nc3 to finish developing.", '…Nb4 — a counterattack on d3.'],
  ],
  'Reti: LSB Fianchetto': [
    ["…Nf6, the most common answer, close to four masters in ten: the knight develops and covers e4.", '…Nf6 — develops, covers e4.'],
    ["Bg2, nearly every master. Fianchetto done, castling next, and you still haven't committed a single central pawn.", 'Bg2 — fianchetto done.'],
    ["…e6, about a quarter of masters: solid. The pawn backs up d5 and opens their bishop on f8, but it shuts in the one on c8. The engine prefers …g6 or …c6, and now you're a little better.", '…e6 — solid, shuts in c8.'],
    ["You castle, eight masters in ten. Now the choice: hit d5 with c4, the Réti way, or build for e4?", 'O-O — king safe.'],
    ["…Be7, about eight masters in ten: the bishop steps aside, and their king is ready to castle.", '…Be7 — castle next.'],
    ["d3: you build for e4. The pawn covers e4, and the plan is the King's Indian Attack, with e4 next. c4, hitting d5 the Réti way, is just as common among masters, about four in ten each, and the engine prefers it. After d3 it's about level.", 'd3 — covers e4; c4 was stronger.'],
    ["…O-O, about two masters in three: their king is safe too.", '…O-O — king safe.'],
    ["Nbd2, more than eight masters in ten: a second guard on e4. Why d2 and not c3? On c3, …d4 would kick it.", 'Nbd2 — a second guard on e4.'],
    ["…c5, six masters in ten: space on the queenside and a pawn covering d4.", '…c5 — space, covers d4.'],
    ["e4, nearly every master: the break. The pawn hits d5, and it's guarded twice, by the d3 pawn and the knight on d2.", 'e4 — the break, hits d5.'],
    ["…Nc6 develops and covers e5 and d4. Look at the structure now: it's the King's Indian structure with the colors reversed.", '…Nc6 — covers e5 and d4.'],
    ["Re1, about eight masters in ten: the rook gets behind your e4 pawn. It guards the pawn now, and it keeps backing it up when the pawn goes to e5. If the e-file ever opens, the rook is already there.",'Re1 — behind the e-pawn.'],
    ["…b5, about half the masters, and here's their plan: a pawn storm on the queenside. In this structure that's the race: they attack there, and you attack on the other side, toward their king.", '…b5 — their queenside storm begins.'],
    ["e5, seven masters in ten: the pawn kicks the knight off f6 and grabs space right in front of their king. The engine prefers exd5, opening the center instead, and after e5 it's about level.", 'e5 — kicks the knight, grabs space.'],
    ["…Nd7, nine masters in ten, and from d7 the knight hits your e5 pawn at once, with the knight on c6 hitting it too. Two attackers, two guards: the knight on f3 and the rook on e1.", '…Nd7 — e5 is hit twice.'],
    ["Nf1, nine masters in ten: the knight on d2 reroutes toward the kingside, heading for h2 or e3, and by leaving d2 it opens the way for your bishop on c1.", 'Nf1 — rerouting, frees the c1-bishop.'],
    ["…a5: the a-pawn joins the storm, with …a4 and …b4 to come. The engine slightly prefers …Qb6.", '…a5 — the a-pawn joins in.'],
    ["Bf4 adds a third guard to e5, so it looks natural, but it's a slip. Why? …g5 chases the bishop, then …g4 chases your knight on f3, and e5 loses its guards. The engine prefers h4, which stops …g5 before it starts, and after Bf4 they are a little better.", 'Bf4 — guards e5, but h4 was better.'],
    ["…Ba6: remember the bishop that …e6 shut in? It comes out the other way, guarding b5 from a6. But …g5 was the shot, and the engine prefers it; after …Ba6 it's about level. Your plan for the middlegame: h4 so …g5 never comes, a3 to meet …a4, and the knight to h2 on its way toward their king.", '…Ba6 — the c8-bishop is out.'],
  ],
  'Reti: Nimzo-English Hybrid': [
    ["b3: you still hold back the d-pawn. The pawn props up c4, and your other bishop is heading for b2: two bishops on two long diagonals, the double fianchetto. About half the masters go this way and the other half play d4, which the engine prefers.", 'b3 — the double fianchetto is coming.'],
    ["…c5, about four masters in ten: space, and a pawn covering d4. The engine prefers …d4.", '…c5 — space, covers d4.'],
    ["Bb2, about half the masters: the second bishop arrives on the long diagonal, and look how far it reaches, through d4 and e5 all the way to the knight on f6. The engine prefers cxd5 first.", 'Bb2 — the long diagonal to f6.'],
    ["…Nc6, more than eight masters in ten: the knight covers d4 and e5, the two squares in the middle of your bishop's diagonal. The engine prefers …d4.", '…Nc6 — covers d4 and e5.'],
    ["e3, seven masters in ten: the pawn takes d4 away from their knight and gets your own d4 ready for later. The engine prefers cxd5.", 'e3 — keeps their knight off d4.'],
    ["…b6, more than half the masters: their bishop on c8 is heading for b7, a fianchetto to meet yours. The engine prefers …d4.", '…b6 — …Bb7 next.'],
    ["d4, the rare choice, two masters in a hundred: now the pawn finally comes, hitting c5. Six in ten bring the knight to c3 first, and the engine prefers Nc3. After d4 it's about level.", 'd4 — finally, hits c5.'],
    ["…Bb7, close to half the masters: the fianchetto's done, but their own knight on c6 and the pawn on d5 block the bishop. The engine prefers …Ba6, where the bishop would hit your c4 pawn.", '…Bb7 — blocked by its own pieces.'],
    ["Nc3 puts another piece on d5, but it's a slip: the engine prefers dxc5, settling the tension first. With your knight on c3 and their rook about to reach c8, the c-file is going to matter. After Nc3 they are a little better.", 'Nc3 — hits d5; dxc5 was better.'],
    ["…Rc8 brings the rook to the c-file, where the pawns face off, c5 against c4. The engine prefers …dxc4, and after the rook move you are a little better.", '…Rc8 — the rook to the c-file.'],
    ["Rc1: rook against rook on the c-file, and now your knight on c3 has a second guard. But the engine prefers cxd5, releasing the tension, and after Rc1 they are a little better.", 'Rc1 — mirrors them; cxd5 was better.'],
    ["…cxd4: the pawn takes and hits your knight on c3 and your e3 pawn. They are a little better, and the engine prefers …dxc4. Your plan for the middlegame: take back with Nxd4, which clears f3 so your bishop on g2 finally hits d5, with their knight on c6 and bishop on b7 on the same diagonal behind it.", '…cxd4 — hits c3 and e3.'],
  ],
  'Reti: Reti Gambit': [
    ["Ne4: the other knight jump at the same queen. From e4 the knight hits the queen on d6 and the bishop on c5 at once. And if …Bxe3? Then Nxd6 is check, and their queen is gone.", 'Ne4 — hits the queen and c5.'],
    ["…Bb4 check: the bishop escapes with tempo. …Qc6 looks natural, but then Nxc5 simply wins the bishop.", '…Bb4+ — escapes with check.'],
    ["Bd2 blocks the check from b4 and offers a trade of bishops. Your bishop on d2 is pinned to your king for the moment, but it's guarded three times.", 'Bd2 — blocks the check.'],
    ["…Bxd2 check: they take. Three pieces can take back: the queen, the knight or the king. Which one?", '…Bxd2+ — which piece takes back?'],
    ["The queen. Nxd2 or Kxd2 are both about a pawn worse; with the king, …Qd4 would hit your b2 pawn. It's about level. Your plan for the middlegame: if their queen comes to d4, Qc3 offers the trade, and then you castle long and take the d-file, the way the main line went.", 'Qxd2 — the queen takes back.'],
  ],
  'Reti: Anti-Slav': [
    ["…c6, the masters' most common answer, about a third of them: a Slav setup. The pawn props up d5, so if you take on d5, a pawn takes back. The engine prefers …d4, and after …c6 you're a little better.", '…c6 — a Slav setup, props up d5.'],
    ["g3, about one master in six; e3 and d4 are more common. With no pawn on d4 it isn't a real Slav: you keep it a Réti, with the bishop going to g2.", 'g3 — keep it a Réti.'],
    ["…Nf6, two masters in three: the knight develops and covers e4.", '…Nf6 — covers e4.'],
    ["Bg2, three masters in four. The bishop sits on the long diagonal, behind your knight for now, aimed at their pawn on d5.", 'Bg2 — aimed at d5.'],
    ["…Bf5, two masters in ten, and here's the point of their setup: the bishop comes out before …e6 can lock it in. From f5 it covers e4 and d3, and reaches all the way to your knight on b1.", '…Bf5 — out before …e6.'],
    ["b3, one master in ten: the pawn props up c4 and gets b2 ready for your other bishop. But the engine prefers Qb3, and here's why: with the bishop gone from c8, nothing guards b7, and Qb3 hits it. After b3 it's about level.", 'b3 — props up c4; Qb3 was stronger.'],
    ["…e6, eight masters in ten: with the bishop already out, the pawn can come to e6 without locking anything in, and it opens their bishop on f8.", '…e6 — frees the f8-bishop.'],
    ["Bb2: two bishops on two long diagonals, and this one reaches all the way to the knight on f6.", 'Bb2 — the long diagonal to f6.'],
    ["…Nbd7, about a third of masters: the knight backs up f6 against your bishop. …h6 and …Be7 are almost as common.", '…Nbd7 — backs up f6.'],
    ["You castle. The engine's other idea was Nh4 at once, going after the bishop on f5.", 'O-O — king safe.'],
    ["…Be7: their last minor piece is out, and they're ready to castle.", '…Be7 — ready to castle.'],
    ["d3 takes e4 away from their knight, gives c4 a second guard and frees d2 for your other knight.", 'd3 — covers e4, frees d2.'],
    ["…O-O: their king is safe. The engine prefers …h6 first.", '…O-O — king safe.'],
    ["Nbd2: the last minor piece comes out and covers e4. Why not c3? There the knight would block your bishop on b2.", 'Nbd2 — covers e4.'],
    ["…h6 gives the bishop on f5 a safe home on h7, out of reach of Nh4, and gives their king some air.", '…h6 — a home on h7 for the bishop.'],
    ["Rc1: the rook gets behind your c4 pawn, so if the c-file ever opens, it's already there. The engine prefers a3.", 'Rc1 — behind the c-pawn.'],
    ["…Bh7: the bishop tucks away and keeps aiming at your d3 pawn, which only the e2 pawn guards. It's about level. Your plan for the middlegame: Qc2 to stack up on the c-file, then Ne5, which clears f3 so your bishop on g2 hits d5 at last.", '…Bh7 — tucked away, aims at d3.'],
  ],
  'Reti: Reversed Benoni': [
    ["b4, the most popular move here, close to half the masters: the pawn grabs space on the queenside, and b2 is free for your bishop, which will lean on d4. That's the reversed Benoni plan: they have the center, and you play on the queenside and the long diagonals. The engine prefers e3, hitting d4 at once.", 'b4 — queenside space, b2 for the bishop.'],
    ["…g6, one master in ten: their bishop is heading for g7 to guard d4 from behind. The engine prefers …c5, propping up d4 with a pawn and hitting b4, and after …g6 you're a little better.", '…g6 — the bishop heads for g7.'],
    ["Bb2, about a third of masters, and look what it does: it hits d4, and behind d4, with g7 empty, stands the rook on h8. So that pawn can't move, and it's hit twice, by the bishop and your knight on f3, with only the queen guarding it. The engine prefers g3.", 'Bb2 — hits d4, the h8-rook behind.'],
    ["…Bg7, every master: the bishop steps in front of the rook and guards d4 from behind.", '…Bg7 — guards d4, blocks the line.'],
    ["g3: your second fianchetto is on its way, with the bishop going to g2.", 'g3 — the second fianchetto.'],
    ["…e5 props up d4 with a pawn and grabs more space. But notice what it costs: their bishop on g7 now runs straight into its own pawn on e5.", '…e5 — props up d4, blocks g7.'],
    ["d3: the pawn takes e4 away from them, where a pawn would hit your knight on f3, and it fixes their d4 pawn in place, where your pieces can work on it.", 'd3 — fixes d4, covers e4.'],
    ["…Ne7 develops and clears the way to castle. The engine prefers …b6 or …Nh6.", '…Ne7 — castle next.'],
    ["Bg2: both bishops are on their long diagonals now, and you're ready to castle.", 'Bg2 — both bishops on long diagonals.'],
    ["…O-O: their king is safe. The engine slightly prefers …a5 first, hitting b4.", '…O-O — king safe.'],
    ["You castle too, and now the queenside is where your play is.", 'O-O — king safe.'],
    ["…Nd7: why d7? On c6 or a6 your b-pawn could kick the knight with b5. From d7 it covers c5, getting ready for …c5.", '…Nd7 — covers c5.'],
    ["Nbd2 develops and covers e4, a square your knight can use next. The engine slightly prefers b5, grabbing more space first.", 'Nbd2 — covers e4.'],
    ["…c5 hits your b4 pawn, and nothing guards it. The engine prefers …a5. So: defend b4, or let it go?", '…c5 — hits the loose b4 pawn.'],
    ["a3 guards b4 the simple way, but it's a slip: the engine much prefers Ba3, guarding it with the bishop. After a3, …a5 can hit b4 again, and it's about level.", 'a3 — guards b4; Ba3 was better.'],
    ["…Rb8 gets the rook behind the b-pawn, ready for …b6 and …b5. The engine prefers …a5, and after the rook move you're a little better.", '…Rb8 — behind the b-pawn.'],
    ["Ne4: the knight jumps forward and hits c5, so that pawn is hit twice now, by b4 and the knight. And from e4 it eyes d6 and f6, squares no pawn of theirs can ever cover again.", 'Ne4 — hits c5, eyes d6.'],
    ["…b6 gives c5 a second guard. You're a little better. Your plan for the middlegame: Nd6, planting the knight in the hole on d6, where it hits the bishop on c8 and the f7 pawn, then trade it for that bishop.", '…b6 — a second guard on c5.'],
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

export const RETI_OPENING_WATCH: WatchCourse = {
  openingId: 'reti-opening',
  title: 'The Réti Opening — A Master Class',
  orientation: 'white',
  sources: ['concept:pos-center', 'concept:pos-development', 'concept:pos-space', 'concept:pawn-fianchetto', 'concept:pos-tempo', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
