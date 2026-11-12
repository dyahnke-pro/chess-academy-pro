// Dutch Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=dutch-defence`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a). One story runs through every line: …f5
// takes e4 from move one, and every system holds that square (a knight on e4,
// a pawn wedge on e4) while it covers what …f5 gave away, e6 and the light
// squares toward your king.
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'g6', 'Nf3', 'Bg7', 'O-O', 'O-O', 'c4', 'd6', 'Nc3', 'Qe8', 'd5', 'Na6', 'Rb1', 'Bd7', 'b4', 'c6', 'dxc6', 'bxc6', 'a3', 'Nc7', 'Bb2', 'Ne6', 'c5', 'd5', 'Ne5', 'd4', 'Na4', 'Ng4', 'Nf3', 'Rd8', 'Nxd4', 'Nxd4'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — the pawn grabs the center and covers e5, so your e-pawn can't come there for free. Now look next door at e4. A second pawn there is what they want, and your first move is built to make that hard.", 'd4 — covers e5; e4 is next door.'],
  ["…f5 — and here's the Dutch. Your pawn takes e4 from the side, so their e-pawn can't just walk there, and your play will come on the kingside. The price is real, though: e6 has lost a guard, and the diagonal from h5 to your king on e8 is wide open. You'll meet both again.", '…f5 — the Dutch: covers e4.'],
  ["g3 — where is this going? The bishop goes to g2, onto the long diagonal that runs through e4. That's their answer to your f-pawn: if a pawn can't reach e4 cheaply, a bishop will aim at it.", 'g3 — the bishop heads for g2.'],
  ["…Nf6 — now e4 is guarded twice, by the pawn on f5 and this knight. And look at h5: the knight covers it, so a queen can't land there for free and use that open diagonal toward your king.", '…Nf6 — a second guard on e4.'],
  ["Bg2 — the bishop is on the long diagonal now, and all the way down it hits your pawn on b7, which is pinned to the rook on a8. Remember this bishop: whenever that diagonal opens, your queenside feels it.", 'Bg2 — hits e4 and b7.'],
  ["…g6 — the Leningrad. Your bishop goes to g7: the King's Indian setup, with your f-pawn already on f5. The pawn also guards f5 and shuts the h5 diagonal. The cost comes later: no pawn of yours can ever cover h6 again, and their bishop on c1 reaches it in one move.", '…g6 — the Leningrad; bishop to g7.'],
  ["Nf3 — the knight covers e5, a square your e-pawn will want, and clears the way to castle. Notice what it costs them: it stands in front of the bishop on g2, so for now that bishop no longer sees the e4 square.", 'Nf3 — covers e5, castling next.'],
  ["…Bg7 — the bishop sits behind your knight on f6, aimed down the long diagonal at d4. The moment that knight jumps, the bishop wakes up. And now your king can castle.", '…Bg7 — fianchetto; castling next.'],
  ["O-O — their king tucks in behind the bishop on g2. Next comes c4, and with it the fight for d5.", 'O-O — king safe; c4 is next.'],
  ["…O-O — get the king safe before anything opens. Your rook lands on f8, right behind the f-pawn, so if the f-file ever opens, it's already in place.", '…O-O — king safe, rook behind f5.'],
  ["c4 — the pawn covers d5 and grabs space on the queenside. So where's your center? Your d- and e-pawns are still at home, and that's the next decision.", 'c4 — covers d5, grabs space.'],
  ["…d6 — the pawn covers e5 and prepares …e5, your main break in the Leningrad. Here's the cost to remember: with your d- and f-pawns both past it, no pawn of yours can ever cover e6 again, and their knight can reach it through g5.", '…d6 — prepares …e5; e6 is a hole.'],
  ["Nc3 — count e4 now. This knight hits it, the bishop on g2 can't because their own knight on f3 is in the way, and you cover it twice, with the pawn on f5 and the knight on f6. If e4 is coming, they'll need more.", 'Nc3 — eyes e4 and d5.'],
  ["…Qe8 — the masters split almost evenly here between …c6 and this. Why the queen? It steps off the d-file and stands behind your e-pawn, so when …e5 comes, the queen backs it. One quiet move, and your main break has support.", '…Qe8 — backs the coming …e5.'],
  ["d5 — they grab space and take c6 away from your knight. And look at e6, the hole …d6 left behind: now their pawn covers it. A knight of theirs landing there one day would be guarded, and no pawn of yours could ever chase it.", 'd5 — space; e6 is covered.'],
  ["…Na6 — the engine's first choice, rim or not. With c6 off-limits, the knight takes the road through a6, and from there it can go on to c5 or c7. Which one depends on what they do next.", '…Na6 — heading for c5 or c7.'],
  ["Rb1 — why the rook first? Their plan is b4, but your knight on a6 hits b4, so the pawn would just drop. With the rook behind it, the push is ready, and a knight of yours on c5 would get kicked.", 'Rb1 — backs b4 against your knight.'],
  ["…Bd7 — jumping to c5 at once is the other main road. Here the bishop comes out first: it backs c6, where your c-pawn is about to go, covers e6, and takes a4 away from their queen.", '…Bd7 — backs c6, covers e6.'],
  ["b4 — there's the push: it takes c5 from your knight, and b5 would hit it on a6. But every pawn move leaves something behind. With b4 played, no pawn of theirs can ever cover c3 again, and your knight on f6 can reach it through e4.", 'b4 — takes c5; c3 is left behind.'],
  ["…c6 — the engine's choice, and your answer in the center: the pawn hits d5. If they take on c6, the pawn that covered e6 is gone and your b-file opens. If they don't, …cxd5 opens the c-file instead.", '…c6 — hits d5, the spearhead.'],
  ["dxc6 — they take, and the pawn on c6 hits your bishop on d7 and your pawn on b7 together. So you take back at once. The only question is which piece.", 'dxc6 — hits d7 and b7.'],
  ["…bxc6 — with the pawn, not the bishop. After …Bxc6, b5 would hit the bishop and your knight on a6 together. This way the b-file is half-open for your rooks, aimed straight at their pawn on b4.", '…bxc6 — the b-file opens.'],
  ["a3 — why not Bb2 at once? The bishop would stand in front of the rook on b1, and your knight on a6 would just take on b4. So a3 guards the pawn first.", 'a3 — guards b4 before Bb2.'],
  ["…Nc7 — on a6 the knight was stuck watching b4. On c7 it stops b5 for good, and it's on its way to e6, the square no pawn of yours can cover any more.", '…Nc7 — covers b5, heads for e6.'],
  ["Bb2 — the bishop takes the long diagonal, right behind its knight on c3. Now look at your side: your bishop on g7 sits behind your knight on f6 on that same diagonal. Two bishops facing each other, each waiting for its own knight to move.", 'Bb2 — bishop versus bishop, knights between.'],
  ["…Ne6 — and look where the knight lands: e6, the hole …d6 left behind. A hole only hurts when their piece gets there first. With your knight on it, it's a post instead, covering c5 and d4.", '…Ne6 — the knight fills the hole.'],
  ["c5 — the pawn hits d6, and their queen backs it from d1 down the file, so d6 is hit twice and guarded once, by your e-pawn. Should you take? …dxc5 would double your c-pawns, and then Ne5 and the bishop on g2 go straight at c6.", 'c5 — hits d6 twice.'],
  ["…d5 — not the capture: step past. Now c5 can't touch the pawn, e4 is guarded three times, and Qb3 can no longer pin your knight on e6. The price is e5: no pawn of yours can ever cover it again, and their knight on f3 lands there next move.", '…d5 — steps past; e5 is given up.'],
  ["Ne5 — there it is, the outpost …d5 just handed over. Your d- and f-pawns have both gone past e5, so no pawn of yours can chase the knight, and from there it hits your bishop on d7 and the pawns on c6 and g6.", 'Ne5 — the outpost; hits d7, c6, g6.'],
  ["…d4 — the engine's first choice: the pawn hits the knight on c3, so it has to move. It does open one door. With d5 gone, their bishop on g2 sees all the way to c6, but grabbing that pawn now just leaves the knight on c3 to your pawn.", '…d4 — kicks the knight off c3.'],
  ["Na4 — the engine's choice. On a4 the knight backs their pawn on c5, which your knight on e6 hits. And with c3 empty, their bishop on b2 now looks straight at your pawn on d4: their bishop and queen hit it, and only your knight guards it.", 'Na4 — guards c5; d4 under fire.'],
  ["…Ng4 — instead of defending d4, you hit back. The knight goes after e5, and by moving it uncovers your bishop on g7, so two pieces hit their knight and nothing guards it. Now they have to choose.", '…Ng4 — two hits on e5.'],
  ["Nf3 — a slip. The engine prefers Nxd7, taking your bishop first, and after Nf3 the game is about level. The knight runs back and adds a third hit on d4, where your bishop on g7 and knight on e6 guard it, two against three.", 'Nf3 — a slip; three hits on d4.'],
  ["…Rd8 — d4 is hit three times and guarded twice, so how do you hold it? You don't. A natural move like …Qf7 does nothing for d4, and the pawn just falls. …Rd8 sets a trap instead: the rook waits behind your bishop on d7, and the moment that bishop steps off, the d-file is yours.", '…Rd8 — the rook waits behind d7.'],
  ["Nxd4 — they grab the pawn, and it looks safe: your knight takes back, their bishop takes back. It's a real mistake, though. The engine prefers h3, kicking your knight off g4, and now you are clearly better. Can you see why?", "Nxd4 — grabs d4, and it's a mistake."],
  ["…Nxd4 — take back, and let their bishop recapture. Once it does, your bishop leaves d7 for e6 and the d-file opens: your rook on d8 and bishop on g7 both hit that bishop, guarded only by their queen. You are a little better. The plan from here: …Be6 and …Bc4 to push their rook off f1, then …e5 to kick their bishop off d4.", '…Nxd4 — the d-file is about to open.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the lines filed before it don't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Leningrad g6 Main Line': ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'g6', 'Nf3', 'Bg7', 'O-O', 'O-O', 'c4', 'd6', 'Nc3', 'Qe8', 'd5', 'Na6', 'Rb1', 'Nc5', 'b3', 'Nfe4', 'Nxe4', 'Nxe4', 'Bb2'],
  'Stonewall d5 e6 Bd6': ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'e6', 'Nf3', 'd5', 'O-O', 'Bd6', 'c4', 'c6', 'b3', 'Qe7', 'Bb2', 'b6', 'Nbd2', 'Bb7', 'Ne5', 'O-O', 'Ndf3', 'Nbd7', 'Nd3', 'Ne4', 'Nfe5', 'Nxe5'],
  'Classical Be7 Line': ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'e6', 'Nf3', 'Be7', 'O-O', 'O-O', 'c4', 'd5', 'b3', 'c6', 'Bb2', 'Nbd7', 'Nbd2', 'Ne4', 'Nxe4', 'fxe4'],
  'Anti-Dutch 2.Bg5 Response': ['d4', 'f5', 'Bg5', 'g6', 'Nc3', 'Bg7', 'e3', 'Nf6', 'Bd3', 'd5', 'Nge2', 'O-O', 'Nf4', 'c6', 'h4', 'Ne4', 'Bxe4', 'fxe4', 'h5', 'Rf5', 'h6', 'Rxg5', 'hxg7', 'Bf5'],
  'Leningrad e5 Break': ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'g6', 'Nf3', 'Bg7', 'O-O', 'O-O', 'c4', 'd6', 'Nc3', 'c6', 'd5', 'e5', 'dxe6', 'Bxe6', 'b3', 'Na6', 'Ng5', 'Bc8'],
  'Ilyin-Zhenevsky System': ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'e6', 'Nf3', 'Be7', 'O-O', 'O-O', 'c4', 'd5', 'Nc3', 'c6', 'Qc2', 'Qe8', 'Rb1', 'a5', 'a3', 'b5', 'cxb5', 'cxb5'],
  'Leningrad …c6 Line': ['d4', 'f5', 'Nf3', 'Nf6', 'g3', 'g6', 'Bg2', 'Bg7', 'O-O', 'O-O', 'c4', 'd6', 'Nc3', 'c6', 'd5', 'e5', 'dxe6', 'Bxe6', 'b3', 'Na6', 'Bb2', 'Nc5'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Leningrad g6 Main Line': [
    ["…Nc5 — the engine's first choice, and the order is the point: the knight jumps before b4 can take c5 away. From c5 it covers e4 and e6, and if b4 comes now, the knight simply hops on to e4, hitting their knight on c3.", '…Nc5 — in before b4; covers e4.'],
    ["b3 — a slower plan: the pawn guards c4 and takes a4 from your knight. The cost is c3. No pawn of theirs can ever cover it again, and both your knights can reach it through e4.", 'b3 — guards c4, gives up c3.'],
    ["…Nfe4 — and there's c3. Their knight there has no guard, and now it's hit twice: by this knight, and by your bishop on g7, whose diagonal just opened. Take on c3, and your knight lands forking the rook on b1 and the queen on d1.", '…Nfe4 — c3 is hit twice.'],
    ["Nxe4 — they trade it off, and now their knight on e4 hits yours on c5, so you have to take back. Which piece takes is the whole question.", 'Nxe4 — trade; how do you recapture?'],
    ["…Nxe4 — with the knight. …fxe4 looks natural, but then Ng5 and the bishop on g2 both go after that pawn. This way the knight sits on e4, guarded by your f-pawn, and it threatens to jump to c3 again, forking their rook and queen.", '…Nxe4 — back on e4, eyeing c3.'],
    ["Bb2 — two jobs at once: the bishop covers c3, so your knight can't jump there, and it offers a trade of your bishop on g7. They are a little better. The plan from here: …Qf7, trade the dark bishops with …Bxb2, and push …a5 on the queenside, keeping the knight on e4 propped up by your f-pawn.", 'Bb2 — covers c3, hits g7.'],
  ],
  'Stonewall d5 e6 Bd6': [
    ["…e6 — the other road, and the engine's first choice here. The pawn guards f5, covers d5, and stands on e6 itself, the square …f5 weakened. Your bishop on f8 stays flexible, for d6 or e7.", '…e6 — guards f5, covers d5.'],
    ["Nf3 — the knight covers e5 and clears the way to castle. Keep your eye on e5: in the structure you're about to build, it's the one square no pawn of yours can cover.", 'Nf3 — covers e5, castling next.'],
    ["…d5 — and the wall goes up: d5, e6 and f5. This is the Stonewall. Now e4 is covered three times, so a knight of yours can settle there one day. The price mirrors it: no pawn of yours can ever cover e5 again, and your bishop on c8 is shut in behind e6.", '…d5 — the Stonewall: d5, e6, f5.'],
    ["O-O — they castle first and keep c4 for the next move.", 'O-O — king safe; c4 next.'],
    ["…Bd6 — the engine's choice over …Be7, which is the Classical's square. On d6 the bishop does more: it covers e5, the square the wall left behind, and it looks down the diagonal at g3, in front of their king.", '…Bd6 — covers e5, aims at g3.'],
    ["c4 — the pawn hits d5, the front of your wall, and nothing guards it, so you could take. Should you? Taking on c4 gives up the pawn that helps your f-pawn hold e4, and Nbd2 just comes after it. So the wall stays.", 'c4 — hits d5, the front pawn.'],
    ["…c6 — the pawn backs d5, so if they take there, a pawn takes back and the wall stands: c6, d5, e6 and f5. One more square goes for good, though. No pawn of yours can cover d6 now, and their bishop could reach it through f4.", '…c6 — backs d5; the wall holds.'],
    ["b3 — the pawn guards c4 and opens a3 for their bishop, which wants to trade off yours on d6, the piece guarding e5. It cuts both ways: no pawn of theirs can cover a3 or c3 again, and your bishop on d6 can land on a3 first.", 'b3 — guards c4, prepares Ba3.'],
    ["…Qe7 — the queen stands next to your bishop on d6, so if their bishop comes to a3 and takes it, the queen takes back and nothing is lost. It also clears d8 for a rook.", '…Qe7 — guards the bishop on d6.'],
    ["Bb2 — why not f4? Your e-pawn could kick it there. On b2 the bishop sits quietly behind their pawn on d4, and if that pawn ever moves, the long diagonal opens toward your king.", 'Bb2 — waits behind d4.'],
    ["…b6 — the engine's first choice, and it answers the Stonewall's big question: what about the bishop on c8, stuck behind e6? It takes the other road, …b6 and …Bb7. The pawn also covers c5, so their c-pawn can't come there to hit your bishop on d6.", '…b6 — makes room for …Bb7.'],
    ["Nbd2 — the knight covers e4, where your knight wants to land, and it's on its way: to f3 next, and from there to e5, the square your wall gave up.", 'Nbd2 — covers e4, heads for f3.'],
    ["…Bb7 — out at last. For now it stands behind your pawns on c6 and d5, but it guards c6, and the day …c5 opens the long diagonal, it wakes up.", '…Bb7 — out at last; guards c6.'],
    ["Ne5 — there it is: the knight lands on the square your wall gave up, and no pawn of yours can ever kick it. It hits your c6 pawn, and the game is about level.", 'Ne5 — the outpost on e5.'],
    ["…O-O — your king gets safe and the rook comes to f8 behind the f-pawn. Each side now has its outpost in mind: theirs on e5, yours on e4.", '…O-O — king safe; e4 next.'],
    ["Ndf3 — the second knight backs the first. If you ever take on e5, a knight takes back and the outpost is filled again. Trading one knight doesn't get rid of the square.", 'Ndf3 — a second guard on e5.'],
    ["…Nbd7 — your last minor piece comes out and challenges the knight on e5. Count it: your bishop on d6 and knight on d7 hit e5; their pawn on d4 and knight on f3 guard it. Two against two, so there's no rush to take. The trade isn't going anywhere.", '…Nbd7 — challenges e5, two against two.'],
    ["Nd3 — the knight steps back instead of trading. From d3 it still watches e5, ready to jump back in, and it covers c5 and f4.", 'Nd3 — still watching e5.'],
    ["…Ne4 — the engine's first choice, and there's the Stonewall knight, on the square the wall was built for. Your pawns on d5 and f5 guard it, only their f-pawn could ever kick it, and it hits f2 and g3 next to their king.", '…Ne4 — the Stonewall knight lands.'],
    ["Nfe5 — the engine's choice, and here's the plan behind it: with f3 empty again, their f-pawn can come to f3 and kick your knight off e4. On the way, the knight hits your knight on d7 and the pawn on c6.", 'Nfe5 — clears f3 for the f-pawn.'],
    ["…Nxe5 — you take on e5, though the engine prefers …c5 first, hitting d4. After …Nxe5 they are a little better. If their d-pawn takes back, your bishop on d6 is hit and steps to a3 to trade itself for theirs on b2. Then the knight on e4, held by d5 and f5, is your anchor, and the Stonewall's long-term play goes behind it, at their king.", '…Nxe5 — trade; …Ba3 comes next.'],
  ],
  'Classical Be7 Line': [
    ["…Be7 — the Classical. Why so modest? On d6 the bishop would block your d-pawn, and on b4 their c-pawn would kick it. On e7 it leaves the d-pawn free to choose later, and castling comes next.", '…Be7 — modest, flexible, castling next.'],
    ["O-O — they castle. Both kings are nearly safe, so the fight is about to move to the center.", 'O-O — king safe; center next.'],
    ["…O-O — you castle as well, and the rook joins your f-pawn on the f-file.", '…O-O — king safe, rook on f-file.'],
    ["c4 — the pawn covers d5 and b5. What's the idea? d5 next, a pawn pushing straight into your e6 pawn. Do you allow that?", 'c4 — d5 is the idea.'],
    ["…d5 — no, you don't. Your pawn gets to d5 first, so theirs never can, and now it hits c4. The engine agrees. You have the Stonewall's pawns, d5, e6 and f5, but with the bishop on e7 instead of d6.", '…d5 — claims d5 first, hits c4.'],
    ["b3 — the pawn guards c4, so if you take there, a pawn takes back and their center stays. But it leaves c3 behind for good: no pawn can cover it again, and your knight on f6 can reach it through e4.", 'b3 — guards c4; c3 left behind.'],
    ["…c6 — the pawn props up d5, so even if they take there, a pawn takes back and the center holds. The cost: d6 can never be covered by a pawn again, and their bishop could reach it through a3.", '…c6 — props up d5.'],
    ["Bb2 — the bishop waits behind their pawn on d4. On g5 your h-pawn would kick it, so it takes the long diagonal and waits for d4 to move.", 'Bb2 — behind d4, on the long diagonal.'],
    ["…Nbd7 — the knight covers e5 and c5, two squares their pieces would like to use. And if their knight comes to c3, …Ne4 challenges it straight away.", '…Nbd7 — covers e5 and c5.'],
    ["Nbd2 — the knight covers e4, where your knight wants to land. Does that stop it? Count again: your pawns on d5 and f5 still guard e4, so the knight can go there anyway.", 'Nbd2 — guards e4 against your knight.'],
    ["…Ne4 — and it lands, propped up by your pawns on d5 and f5. It hits their knight on d2 and the pawns on f2 and g3, and it takes g5 away from their other knight.", '…Ne4 — lands on its post.'],
    ["Nxe4 — they take it. The engine prefers Ne1, keeping the pieces on, and after Nxe4 the game is about level. Now, which pawn takes back?", 'Nxe4 — which pawn takes back?'],
    ["…fxe4 — the f-pawn, and it hits their knight on f3, so they lose time moving it. Yes, your e-pawns are doubled, but doubled pawns that open a file are often a good deal: the f-file is half-open, aimed at f3. The game is about level. The plan from here: when the knight moves, push …b5 to open the queenside, and keep the pawn on e4, which takes d3 and f3 from their pieces.", '…fxe4 — hits f3, opens the f-file.'],
  ],
  'Anti-Dutch 2.Bg5 Response': [
    ["Bg5 — an anti-Dutch: the point is to bother you before your setup exists. The bishop hits e7, which is pinned to your queen on d8, and if your knight comes to f6, the bishop can take it and double your pawns.", 'Bg5 — pins e7, watches f6.'],
    ["…g6 — your bishop heads for g7, and the pawn shuts the diagonal from h5 to your king before a queen can use it. The price: h6 can never be covered by a pawn again, and their bishop on g5 lands there in one move. Keep that square in mind.", '…g6 — closes h5, bishop to g7.'],
    ["Nc3 — the knight covers e4 and d5, and it backs a push to e4, where their pawn would hit your f5 pawn. Who controls e4: that's the fight here too.", 'Nc3 — backs the e4 push.'],
    ["…Bg7 — the engine's first choice. With no knight on f6 yet, the bishop already hits d4. But notice: the pawn on e7 is still pinned, so …e5 is off for now; it would leave your queen to the bishop on g5.", '…Bg7 — hits d4 already.'],
    ["e3 — the engine's choice, and a quiet one: the pawn guards d4 against your bishop, covers f4, and opens a diagonal for the bishop on f1.", 'e3 — guards d4, frees the bishop.'],
    ["…Nf6 — the natural move, and here it's a real slip: the engine prefers …c6, and now they are clearly better. Why? Their answer is h4, h5 and h6: the h-pawn marches up the board and drives your bishop off g7, and your knight is a piece their bishop on g5 can take whenever it likes.", '…Nf6 — a slip; the h-pawn comes.'],
    ["Bd3 — the bishop hits your f5 pawn, which g6 guards, and backs an e4 push. The engine prefers h4 at once, and after Bd3 they are a little better.", 'Bd3 — hits f5, backs e4.'],
    ["…d5 — the engine's choice. Now e4 is covered by both your pawns and your knight, three guards against their two, so their e-pawn stays put. That's the Dutch habit in every line: when they aim at e4, add a guard.", '…d5 — a third guard on e4.'],
    ["Nge2 — why e2, not f3? It keeps f3 free for their f-pawn, which could back an e4 push, and from e2 the knight can jump to f4, where it would hit your pawn on g6.", 'Nge2 — heading for f4.'],
    ["…O-O — you castle, behind the pawn on g6 and the bishop on g7. Keep an eye on that g6 pawn: their knight and their h-pawn are both about to aim at it.", '…O-O — king safe; watch g6.'],
    ["Nf4 — there's the knight, hitting your pawns on d5 and g6. Look at d5 closely: their knights on c3 and f4 hit it, your queen and your knight on f6 guard it, and their bishop on g5 hits that knight.", 'Nf4 — hits d5 and g6.'],
    ["…c6 — the engine's first choice, and the game is about level. The pawn adds a guard to d5, so trading off your knight no longer costs you the pawn. Why not the active …c5? Because dxc5 just grabs a pawn.", '…c6 — props up d5; about level.'],
    ["h4 — the engine's choice, and the storm starts. The pawn heads for h5 to hit g6, and on the way it guards their bishop on g5. Remember that guard.", 'h4 — the storm; guards g5.'],
    ["…Ne4 — the engine's choice: meet a wing attack in the center. The knight jumps to e4, guarded by your pawns on d5 and f5, and hits their knight on c3 and the bishop on g5. One thing to note: with the knight off f6, e7 is pinned to your queen again.", '…Ne4 — central counter, hits c3 and g5.'],
    ["Bxe4 — they give up the bishop for your knight; the engine prefers Nxe4, taking with the knight instead. Their bishop on e4 hits d5 and f5, so which pawn takes back matters.", 'Bxe4 — bishop for knight; which pawn?'],
    ["…fxe4 — the f-pawn, for two reasons. …dxe4 lets h5 crash into g6 at once. And this one clears f5 for your rook, where it will hit the bishop on g5. You have both bishops now too, and you are a little better.", '…fxe4 — f-file opens, two bishops.'],
    ["h5 — now g6 is hit twice, by this pawn and the knight on f4, and the game is about level. Careful: your e7 pawn is still pinned, so …e6 or …e5 hands them your queen with Bxd8. But look at the bishop on g5. When their h-pawn left h4, it stopped guarding it.", 'h5 — hits g6 twice.'],
    ["…Rf5 — and here's the point. Your rook steps up the half-open file and hits the bishop on g5, which has no guard at all, and the knight on f4 too. If they take on g6, …Rxg5 wins the bishop and nothing takes back.", '…Rf5 — hits the loose bishop on g5.'],
    ["h6 — the engine's choice: they leave the bishop and hit yours on g7 instead. You take a bishop, they take a bishop, and the question is whose pieces stand better afterwards. You are a little better.", 'h6 — hits g7, leaves g5.'],
    ["…Rxg5 — take the bishop; nothing takes back. Yes, they take yours on g7 next, so the material comes out level, but your rook now stands on g5, hitting g2, and e7 is free of the pin.", '…Rxg5 — wins the bishop; nothing recaptures.'],
    ["hxg7 — their pawn takes your bishop and lands on g7, right next to your king. It has no guard there, and it can't move on.", 'hxg7 — a loose pawn on g7.'],
    ["…Bf5 — the last piece comes out. The bishop guards your pawn on e4 and takes g4 away from their queen. You are a little better. The plan from here: when f3 hits your e4 pawn, take on f3, bring the knight out with …Nd7, and push …e5.", '…Bf5 — guards e4, takes g4.'],
  ],
  'Leningrad e5 Break': [
    ["…c6 — instead of …Qe8, the pawn covers d5 and b5 and gets you ready for the other Leningrad plan: …e5 without spending a move on the queen.", '…c6 — covers d5; …e5 next.'],
    ["d5 — they push past and hit c6. If you take, a pawn takes back and their d-pawn stays. Your answer is the break.", 'd5 — hits c6, covers e6.'],
    ["…e5 — the engine's first choice, and the Leningrad strike: d6, e5 and f5, a center of your own. But with all three pawns past it, f6 can never be covered by a pawn again, and their bishop on c1 can reach it through g5. They can also take en passant, and usually do.", '…e5 — the Leningrad break.'],
    ["dxe6 — en passant. The pawn lands on e6 with no guard, so your bishop takes it. And with their d-pawn gone, the queen on d1 looks straight up the file at your pawn on d6.", 'dxe6 — en passant; d6 is exposed.'],
    ["…Bxe6 — the bishop takes back and settles on e6, the very square …f5 weakened, and it hits c4, which has no guard. If they play Bf4, …Bxc4 just wins it.", '…Bxe6 — on e6, hitting c4.'],
    ["b3 — why not Ng5 first, hitting your bishop? Then …Bxc4 takes the pawn. So b3 guards c4 first. The price: no pawn of theirs can cover c3 again, and your knight can reach it through e4.", 'b3 — guards c4 before Ng5.'],
    ["…Na6 — the engine's first choice. Why not d7? There the knight would stand between your queen and the d6 pawn, and their queen is staring at d6 down the file. From a6 it heads for c5, and it covers c7.", '…Na6 — keeps the d-file clear.'],
    ["Ng5 — the knight hits your bishop on e6, which has no guard. And it's worse than a loose bishop: Nxe6 would land with a fork of your queen on d8 and rook on f8. So it has to move now.", 'Ng5 — hits the loose bishop.'],
    ["…Bc8 — the bishop goes home. Not d7, for the same reason the knight avoided it: it would cut your queen off from d6. They are a little better. The plan from here: …h6 to push the knight back from g5, then …Nc5, while your pawns on d6 and f5 hold the e4 and e5 squares.", '…Bc8 — home again; …h6 next.'],
  ],
  'Ilyin-Zhenevsky System': [
    ["Nc3 — the engine's choice. The knight hits d5 and backs an e4 push, but notice what it leaves behind: their pawn on c4 has no guard now. …dxc4 grabs it, though Qa4 hits it right back.", 'Nc3 — hits d5, backs e4.'],
    ["…c6 — d5 gets a fourth guard, so a trade there just brings a pawn back to d5. Your pawns now make a triangle with d5 at its point, c6 and e6 both backing it.", '…c6 — a fourth guard on d5.'],
    ["Qc2 — the engine's choice. The queen looks at your pawn on f5, which e6 guards, and backs e4: that's two pieces behind an e4 push now, the queen and the knight on c3.", 'Qc2 — backs e4, looks at f5.'],
    ["…Qe8 — the Ilyin-Zhenevsky idea. The queen heads for h5: with your g-pawn still on g7, nothing blocks the diagonal, and from h5 it looks down the h-file at h2. It gets there fast, too: …h6 and …Qh5 is the natural follow-up.", '…Qe8 — heading for h5.'],
    ["Rb1 — the rook gets behind the b-pawn, ready for b4. Your bishop on e7 covers b4, so the push needs support first.", 'Rb1 — prepares b4.'],
    ["…a5 — now b4 is covered twice, by this pawn and your bishop on e7, so their push is slowed down. The price: b6 can never be covered by a pawn again, and their knight on c3 can reach it through a4.", '…a5 — covers b4 twice.'],
    ["a3 — now b4 has a pawn behind it, and when the push comes it will hit your pawn on a5. Do you wait for it?", 'a3 — backs b4.'],
    ["…b5 — no, you strike first. The pawn hits c4, which has no guard, and if they take on b5, the c-file opens. If they push b3 instead, …b4 kicks the knight off c3.", '…b5 — hits the loose c4 pawn.'],
    ["cxb5 — they take, and their pawn on b5 now hits c6, so you take back. Once you do, the c-file is open for both sides' rooks.", 'cxb5 — trade; you take back.'],
    ["…cxb5 — the c-file is open, and your knight on b8 finally has c6. They are a little better. The plan from here: …b4 to kick their knight off c3, …Ba6 to bring the bishop out, and the queen still has h5 in mind, toward their king.", '…cxb5 — c-file open; …b4 next.'],
  ],
  'Leningrad …c6 Line': [
    ["Nf3 — the knight comes out first and covers e5. The fianchetto can still follow.", 'Nf3 — covers e5 first.'],
    ["…Nf6 — the engine's first choice, and the same job as ever: your pawn on f5 and this knight both cover e4.", '…Nf6 — two guards on e4.'],
    ["g3 — so it's the fianchetto after all, just with the knight out first.", 'g3 — the fianchetto is coming.'],
    ["…g6 — and you're back in the Leningrad, with the same trade as before: the pawn guards f5 and your bishop gets g7, but h6 is a square no pawn of yours will cover again.", '…g6 — the Leningrad again.'],
    ["Bg2 — the bishop sits behind its own knight on f3 for now, and castling comes next.", 'Bg2 — behind its knight on f3.'],
    ["…Bg7 — look at the board: it's the same position the main line reaches, just by a different order. Move orders meet like this all the time, so learn the position, not only the moves.", '…Bg7 — same position, different order.'],
    ["O-O — their king tucks away behind the bishop on g2.", 'O-O — king tucked away.'],
    ["…O-O — you castle as well, and your f-pawn has a rook behind it.", '…O-O — rook behind the f-pawn.'],
    ["c4 — the pawn grabs space and covers d5, and now you need a plan for the center.", 'c4 — space; covers d5.'],
    ["…d6 — the engine's choice. The pawn takes e5 away from their knight and gets your e-pawn ready for …e5. As before, e6 becomes a square no pawn of yours can cover.", '…d6 — e5 is covered.'],
    ["Nc3 — the knight covers d5 and e4. It's their only piece on e4 so far, and you cover it twice.", 'Nc3 — one hit on e4.'],
    ["…c6 — instead of …Qe8, the pawn covers d5 and b5 and gets you ready to strike with …e5 at once.", '…c6 — …e5 is the plan.'],
    ["d5 — the pawn hits c6 and covers e6. Time to strike back.", 'd5 — space; e6 covered.'],
    ["…e5 — the engine's choice. Now d6, e5 and f5 make a center of your own, and their d5 pawn has to decide: take en passant, or let it stand.", '…e5 — your center appears.'],
    ["dxe6 — en passant, and the pawn on e6 has no guard. Your bishop on c8 can take it.", 'dxe6 — en passant, a loose pawn.'],
    ["…Bxe6 — your bishop now sits on e6 and hits the pawn on c4, which has nothing guarding it. They have to deal with that right now.", '…Bxe6 — c4 has no guard.'],
    ["b3 — they guard c4 with a pawn, and the bishop on c1 can come to b2.", 'b3 — c4 guarded, b2 freed.'],
    ["…Na6 — the engine's choice again. Not d7, which would cut your queen off from d6; the knight heads for c5 instead.", '…Na6 — bound for c5.'],
    ["Bb2 — this time the bishop comes out instead of Ng5. On g5 your h-pawn would kick it; on b2 it takes the long diagonal, behind their knight on c3, aimed through it at your knight on f6.", 'Bb2 — the long diagonal.'],
    ["…Nc5 — the knight arrives. It hits b3, covers e4, and guards your bishop on e6, so Ng5 no longer comes with a free hit on it. They are a little better. The plan from here: if Ng5 comes anyway, …Bc8 and …Qe7, with your pawns on d6 and f5 holding e5 and e4.", '…Nc5 — hits b3, guards e6.'],
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

export const DUTCH_DEFENCE_WATCH: WatchCourse = {
  openingId: 'dutch-defence',
  title: 'The Dutch Defence — A Master Class',
  orientation: 'black',
  sources: ['book:dutch-defence', 'concept:att-kingside-storm', 'concept:pos-outpost', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
