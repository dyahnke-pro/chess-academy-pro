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
  ["d4 — the queen's pawn, in just over a third of master games; e4 is played more often, and the engine prefers it. The pawn grabs the center and covers e5 and c5. Now look next door at e4. A second pawn there is what they want next, and your first move is going to make that hard.", 'd4 — center pawn; covers e5 and c5.'],
  ["…f5 — and here's the Dutch. Only about three masters in a hundred play it; six in ten choose …Nf6, which the engine prefers, and after …f5 they are a little better. So why play it? Look at e4: your pawn covers it from move one, so their e-pawn can't just walk there, and your play will come on the kingside. The price is real, though. With the f-pawn gone, e6 has lost a guard, and the diagonal from h5 to your king on e8 is wide open. You'll see both of those again.", '…f5 — the Dutch: covers e4.'],
  ["g3 — about four masters in ten. Where is this going? The bishop goes to g2, onto the long diagonal that runs through e4. That's their answer to your f-pawn: if a pawn can't get to e4 cheaply, a bishop will aim at it.", 'g3 — the bishop heads for g2.'],
  ["…Nf6 — more than nine masters in ten. Now e4 has two guards, the pawn on f5 and this knight, and the knight covers d5 as well. And look at h5: the knight covers it, so a queen can't land there for free and use that open diagonal toward your king.", '…Nf6 — a second guard on e4.'],
  ["Bg2 — nearly every master. The bishop is on the long diagonal now, hitting e4 and, all the way down, your pawn on b7, which is pinned to the rook on a8. Remember this bishop: whenever that diagonal is open, e4 and your queenside feel it.", 'Bg2 — hits e4 and b7.'],
  ["…g6 — seven masters in ten, and this is the Leningrad. Your bishop is heading for g7, on the long diagonal toward d4. If you know the King's Indian, it's that setup with your f-pawn already on f5. And notice a bonus: the pawn on g6 guards f5 and shuts the diagonal from h5 to your king.", '…g6 — the Leningrad; bishop to g7.'],
  ["Nf3 — about half the masters. The knight covers e5, a square your e-pawn will want later, and gets their king ready to castle. It also stands in front of the bishop on g2, so for now that bishop no longer sees e4. The engine prefers h4 here; after Nf3 they are a little better.", 'Nf3 — covers e5, castling next.'],
  ["…Bg7 — every master. The bishop sits on the long diagonal behind your knight on f6; when the knight moves, it looks straight down at d4. And now your king can castle.", '…Bg7 — fianchetto; castling next.'],
  ["O-O — more than eight masters in ten castle here. Their king tucks in behind the bishop on g2, and c4 is next.", 'O-O — king safe; c4 is next.'],
  ["…O-O — almost every master. Your king gets safe before anything opens, and your rook lands on f8, right behind the f-pawn. If the f-file ever opens, that rook is already in place.", '…O-O — king safe, rook behind f5.'],
  ["c4 — six masters in ten. The pawn covers d5 and b5 and gives them space on the queenside. So where's your center? Your d- and e-pawns are still at home, and that's the next question.", 'c4 — covers d5, grabs space.'],
  ["…d6 — almost every master. The pawn covers e5, so their knight on f3 can't jump there, and it prepares …e5, your main break in the Leningrad. It also opens a diagonal for your bishop on c8.", '…d6 — covers e5, prepares …e5.'],
  ["Nc3 — nine masters in ten. Count e4 now: this knight hits it, the bishop on g2 can't because their own knight on f3 is in the way, and you cover it twice, with the pawn on f5 and the knight on f6. If e4 is coming, they'll need more.", 'Nc3 — eyes e4 and d5.'],
  ["…Qe8 — the Leningrad's own move, played by almost four masters in ten, about as many as play …c6. Why the queen? It steps off the d-file, and it stands behind your e-pawn: when …e5 comes, the queen backs it from e8. One quiet move, and your main break has support.", '…Qe8 — backs the coming …e5.'],
  ["d5 — they grab space. The pawn takes c6 away from your knight, and look at e6: their pawn covers it, and since your d- and f-pawns have both moved past it, no pawn of yours can ever cover e6 again. That's the hole …f5 and …d6 left behind. The engine prefers Re1; after d5 they are a little better.", 'd5 — space; e6 is covered.'],
  ["…Na6 — the engine's first choice. Why the rim? With c6 off-limits, the knight takes the road through a6, and from there it can go on to c5 or c7. Which one depends on what they do next.", '…Na6 — heading for c5 or c7.'],
  ["Rb1 — why the rook first? Their plan is b4, but your knight on a6 hits b4, so the pawn would just drop. With the rook on b1, the pawn will have the whole b-file behind it.", 'Rb1 — backs b4 against your knight.'],
  ["…Bd7 — the bishop comes out and backs c6, where your c-pawn is about to go, and it covers e6 as well. The engine prefers …Nc5, jumping in before b4 takes that square away; after …Bd7 they are a little better.", '…Bd7 — backs c6, covers e6.'],
  ["b4 — there's the push. The pawn takes c5 away from your knight, and b5 would hit it on a6. Their play is on the queenside, so yours has to come in the center.", 'b4 — takes c5 from your knight.'],
  ["…c6 — the engine's choice, and your answer in the center. The pawn hits d5. If they take on c6, the pawn that covers e6 is gone; if they don't, you can take on d5 yourself and open the c-file.", '…c6 — hits d5, the spearhead.'],
  ["dxc6 — they take, and the pawn on c6 hits your bishop on d7 and your pawn on b7. So you take back right away. The engine prefers c5, hitting d6 instead; after dxc6 they are a little better.", 'dxc6 — hits d7 and b7.'],
  ["…bxc6 — with the pawn, not the bishop. After …Bxc6, b5 would hit the bishop and your knight on a6 together. This way the b-file is half-open for your rooks, aimed at their pawn on b4.", '…bxc6 — the b-file opens.'],
  ["a3 — why not Bb2 at once? The bishop would stand in front of the rook on b1, and your knight on a6 would take on b4. So a3 guards the pawn first.", 'a3 — guards b4 before Bb2.'],
  ["…Nc7 — the knight reroutes. On a6 it was stuck watching b4; on c7 it adds a guard to b5, a square their pawn would like, and it's on its way to e6.", '…Nc7 — covers b5, heads for e6.'],
  ["Bb2 — the bishop takes the long diagonal, right behind its knight on c3. Now look at your side: your bishop on g7 sits behind your knight on f6 on that same diagonal. Two bishops facing each other, each waiting for its own knight to move.", 'Bb2 — bishop versus bishop, knights between.'],
  ["…Ne6 — and look where the knight lands: e6, the square no pawn of yours can cover any more. A hole is only a problem if their piece gets there first; with your knight on it, it's a post instead. From e6 it covers c5 and d4. The engine prefers …h6 first; after …Ne6 they are a little better.", '…Ne6 — the knight fills the hole.'],
  ["c5 — the pawn hits d6, and their queen is behind it on the open d-file, so d6 is attacked twice and guarded only once, by your e-pawn. Should you take on c5? After …dxc5 and bxc5, Ne5 and the bishop on g2 both go after your pawn on c6.", 'c5 — hits d6 twice.'],
  ["…d5 — not the capture: step past. Now the c5 pawn can't touch it, e4 is covered three times, and the pawn blocks the diagonal from b3, so Qb3 can't pin your knight on e6 to your king.", '…d5 — steps past; e4 covered again.'],
  ["Ne5 — the knight jumps into the square the Dutch gives away. Your d-pawn and f-pawn have both gone past e5, so no pawn of yours can ever chase it, and from there it hits your bishop on d7 and the pawns on c6 and g6.", 'Ne5 — the outpost; hits d7, c6, g6.'],
  ["…d4 — the pawn hits the knight on c3, so it has to move. It does open one door: with d5 gone, their bishop on g2 sees all the way to c6, with your rook on a8 behind it. But grabbing c6 now just leaves the knight on c3 to your pawn.", '…d4 — kicks the knight off c3.'],
  ["Na4 — the engine's choice. On a4 the knight backs their pawn on c5, which your knight on e6 hits. And with c3 empty, their bishop on b2 now looks straight at your pawn on d4: their bishop and queen hit it, and only your knight guards it.", 'Na4 — guards c5; d4 under fire.'],
  ["…Ng4 — instead of defending d4, you hit back. It goes after their knight on e5, and by moving, it uncovers your bishop on g7, so two pieces hit e5 and nothing guards it. The engine prefers …Rd8; after …Ng4 they are a little better.", '…Ng4 — two hits on e5.'],
  ["Nf3 — the knight runs back, and from f3 it adds a third hit on your pawn on d4. Your bishop on g7 and knight on e6 guard it, two against three. The engine prefers Nxd7, taking your bishop first; after Nf3 the game is about level.", 'Nf3 — a third hit on d4.'],
  ["…Rd8 — the rook lines up on the d-file, behind your bishop on d7. Right now it looks blocked. But the moment that bishop steps off, the rook sees straight down the file, and that's what makes grabbing d4 dangerous for them. The engine prefers …f4, hitting the pawn on g3 in front of their king; after …Rd8 they are a little better.", '…Rd8 — the rook waits behind d7.'],
  ["Nxd4 — they grab the pawn, and it looks safe: your knight takes back, their bishop takes back, and they're a pawn up. But it's a real mistake, and now you are clearly better. The engine prefers h3, kicking your knight off g4. Here's what they missed.", "Nxd4 — grabs d4, and it's a mistake."],
  ["…Nxd4 — take back, and let their bishop recapture on d4. Then your bishop leaves d7 for e6, and the d-file is open: your rook on d8 and bishop on g7 both hit their bishop on d4, and only their queen guards it. If e3 props it up, …Bc4 hits the rook on f1. You are a little better. The plan from here: pile up on d4 with the rook and the bishop on g7, and use …Bc4 to push their rook off f1.", '…Nxd4 — the d-file is about to open.'],
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
  'Hopton Attack Response': ['d4', 'f5', 'Nf3', 'Nf6', 'g3', 'g6', 'Bg2', 'Bg7', 'O-O', 'O-O', 'c4', 'd6', 'Nc3', 'c6', 'd5', 'e5', 'dxe6', 'Bxe6', 'b3', 'Na6', 'Bb2', 'Nc5'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Leningrad g6 Main Line': [
    ["…Nc5 — the engine's first choice, and the move order is the point: the knight jumps to c5 before b4 can take that square away. From c5 it covers e4, the Dutch square, and e6 too. If b4 comes now, the knight just hops on to e4.", '…Nc5 — in before b4; covers e4.'],
    ["b3 — a slower plan. The pawn guards c4 and takes a4 away from your knight, and Bb2 and a3 can follow.", 'b3 — guards c4, takes a4.'],
    ["…Nfe4 — the other knight jumps in, and look at c3. Their knight there has no guard, and now it's hit twice: by this knight, and by your bishop on g7, whose diagonal just opened. And taking on c3 would put your knight on c3, hitting their rook on b1 and queen on d1.", '…Nfe4 — c3 is hit twice.'],
    ["Nxe4 — they trade it off. Now their knight on e4 hits your knight on c5, so you have to take back. The question is which piece takes.", 'Nxe4 — trade; how do you recapture?'],
    ["…Nxe4 — with the knight. After …fxe4, Ng5 and the bishop on g2 would both go after that pawn on e4. This way the knight sits in the middle, guarded by your f-pawn, and it threatens to jump to c3, hitting their rook on b1 and queen on d1.", '…Nxe4 — back on e4, eyeing c3.'],
    ["Bb2 — two jobs at once: the bishop covers c3, so your knight can't jump there, and it lines up against your bishop on g7. They are a little better. The plan from here: trade the dark bishops with …Bxb2, keep the knight on e4 guarded by your f-pawn, and break with …e5 to open the center.", 'Bb2 — covers c3, hits g7.'],
  ],
  'Stonewall d5 e6 Bd6': [
    ["…e6 — about one master in five; seven in ten play …g6. This is the other road. The pawn guards f5 and covers d5, and it stands on e6 itself, the square …f5 weakened. Your bishop on f8 stays flexible, for d6 or e7.", '…e6 — guards f5, covers d5.'],
    ["Nf3 — four masters in ten, a few fewer than play c4. The knight covers e5, and keep your eye on that square: in the structure you're about to build, it's the one no pawn of yours can cover.", 'Nf3 — covers e5, castling next.'],
    ["…d5 — and the wall goes up: pawns on d5, e6 and f5. This is the Stonewall. Now e4 is covered three times, by the pawns on d5 and f5 and the knight on f6, so a knight of yours can settle there one day. The cost is the mirror image: no pawn of yours can ever cover e5 again, and your bishop on c8 is shut in behind e6.", '…d5 — the Stonewall: d5, e6, f5.'],
    ["O-O — they castle first and keep c4 for the next move.", 'O-O — king safe; c4 next.'],
    ["…Bd6 — the Stonewall bishop. From d6 it covers e5, the square the wall left behind, and it looks down the diagonal at g3, in front of their king.", '…Bd6 — covers e5, aims at g3.'],
    ["c4 — the pawn hits d5, the front of your wall, and it has no guard, so you could take it. Should you? Taking on c4 gives up the pawn that helps your f-pawn hold e4. So you keep the wall.", 'c4 — hits d5, the front pawn.'],
    ["…c6 — eight masters in ten. The pawn backs d5, so if they take there, a pawn takes back and the wall stands. Now four pawns hold the line: c6, d5, e6 and f5.", '…c6 — backs d5; the wall holds.'],
    ["b3 — about six masters in ten. The pawn guards c4, and it opens a3 for their dark-squared bishop: from there, Ba3 would trade off your bishop on d6, the piece that guards e5. The engine prefers Ne5 straight away; after b3 they are a little better.", 'b3 — guards c4, prepares Ba3.'],
    ["…Qe7 — more than nine masters in ten. The queen stands next to your bishop on d6, so if their bishop ever comes to a3 and takes it, the queen takes back. And it clears d8 for a rook.", '…Qe7 — guards the bishop on d6.'],
    ["Bb2 — half the masters. On b2 the bishop sits behind their pawn on d4, quiet for now; if that pawn ever moves, the diagonal opens toward your king.", 'Bb2 — waits behind d4.'],
    ["…b6 — about a third of the masters; six in ten castle first. Here's the Stonewall's big problem: your bishop on c8 is stuck behind e6. So it takes the other road, …b6 and then …Bb7. The pawn also takes c5 away from their c-pawn, which would hit your bishop on d6 from there.", '…b6 — makes room for …Bb7.'],
    ["Nbd2 — the knight covers e4, where your knight wants to go, and it can step to f3 once the other knight jumps to e5. The engine prefers Nc3; after Nbd2 the game is about level.", 'Nbd2 — covers e4, heads for f3.'],
    ["…Bb7 — the bishop is out at last. It stands behind your pawns on c6 and d5 for now, but it guards c6, and it's no longer locked in behind e6.", '…Bb7 — out at last; guards c6.'],
    ["Ne5 — there it is: the knight lands on the square the wall left behind, and no pawn of yours can kick it. It hits your c6 pawn, and the game is about level.", 'Ne5 — the outpost on e5.'],
    ["…O-O — you castle, and the rook comes to f8 behind your f-pawn. Each side now has its outpost in mind: theirs on e5, yours on e4.", '…O-O — king safe; e4 next.'],
    ["Ndf3 — the second knight backs the first. If you ever take on e5, a knight takes back and the outpost is filled again.", 'Ndf3 — a second guard on e5.'],
    ["…Nbd7 — your last minor piece comes out and challenges the knight on e5. Count it: your bishop on d6 and knight on d7 hit e5; their pawn on d4 and knight on f3 guard it. Two against two, so there's no need to take yet.", '…Nbd7 — challenges e5, two against two.'],
    ["Nd3 — the knight steps back instead of trading. From d3 it still watches e5, ready to jump back in, and it covers c5 and f4.", 'Nd3 — still watching e5.'],
    ["…Ne4 — and there's the Stonewall knight, on the square the wall was built for. Your pawns on d5 and f5 guard it, and it hits f2 and g3 next to their king.", '…Ne4 — the Stonewall knight lands.'],
    ["Nfe5 — the knight jumps back in, hitting your knight on d7 and the pawn on c6. Here's the plan behind it: with f3 empty, their f-pawn can come to f3 and kick your knight off e4. And notice their bishop on g2 now sees e4 too.", 'Nfe5 — clears f3 for the f-pawn.'],
    ["…Nxe5 — you take on e5. If their d-pawn takes back, your bishop on d6 is hit and steps to a3 to trade itself for theirs on b2. The engine prefers …c5 first; after …Nxe5 they are a little better. The plan from here: trade the dark bishops with …Ba3, and keep your knight on e4, held by the pawns on d5 and f5, for as long as it can stay.", '…Nxe5 — trade; …Ba3 comes next.'],
  ],
  'Classical Be7 Line': [
    ["…Be7 — the Classical. The bishop takes a modest square on purpose: on d6 it would block your d-pawn, while on e7 it leaves that pawn free to choose d6 or d5 later. Castling comes next.", '…Be7 — modest, flexible, castling next.'],
    ["O-O — they castle. Both sides are nearly done on the kingside, so the fight is about to move to the center.", 'O-O — king safe; center next.'],
    ["…O-O — you castle as well. Your king is safe, and the rook joins your f-pawn on the f-file.", '…O-O — king safe, rook on f-file.'],
    ["c4 — the pawn covers d5 and b5. What's the idea? d5 next, a pawn pushing straight into your e6 pawn. Do you allow that?", 'c4 — d5 is the idea.'],
    ["…d5 — about one master in six; most play …d6. Your pawn gets to d5 first, so theirs never can, and now it hits c4. You have the Stonewall's pawns, d5, e6 and f5, but with the bishop on e7 instead of d6.", '…d5 — claims d5 first, hits c4.'],
    ["b3 — more than half the masters. The pawn guards c4, so if you take there, a pawn takes back and their center stays. It also opens a3 for their bishop, which could come there to trade off yours on e7.", 'b3 — guards c4; Ba3 possible.'],
    ["…c6 — about half the masters. The pawn props up d5, so even if they take there, a pawn takes back and the center holds.", '…c6 — props up d5.'],
    ["Bb2 — only about one master in eight; three in four play Ba3 to trade off your bishop on e7. On b2 the bishop sits behind their pawn on d4 and waits.", 'Bb2 — behind d4, on the long diagonal.'],
    ["…Nbd7 — a rare choice here; the masters most often play …Bd7. The knight covers e5 and c5, two squares their pieces would like to use.", '…Nbd7 — covers e5 and c5.'],
    ["Nbd2 — the knight covers e4, where your knight wants to land. The engine prefers Ng5, going after e6; after Nbd2 they are a little better.", 'Nbd2 — guards e4 against your knight.'],
    ["…Ne4 — the knight lands on e4 anyway, propped up by your pawns on d5 and f5. It hits their knight on d2 and the pawns on f2 and g3.", '…Ne4 — lands on its post.'],
    ["Nxe4 — they take it. The engine prefers Ne1, keeping the pieces on; after Nxe4 the game is about level. Now, which pawn takes back?", 'Nxe4 — which pawn takes back?'],
    ["…fxe4 — the f-pawn takes, and it hits their knight on f3, so they lose time moving it. Look at the f-file too: it's half-open now, and your rook on f8 looks straight down it at that knight. The game is about level. The plan from here: when the knight moves, push …b5 to open the queenside, and keep the pawn on e4, which takes d3 and f3 away from their pieces.", '…fxe4 — hits f3, opens the f-file.'],
  ],
  'Anti-Dutch 2.Bg5 Response': [
    ["Bg5 — fewer than one master in ten tries this. The bishop hits e7, and the pawn there is pinned to your queen on d8. The point is to bother you before your setup exists: if your knight comes to f6, the bishop can take it and double your pawns.", 'Bg5 — pins e7, watches f6.'],
    ["…g6 — the most popular answer, about four masters in ten; about a third play …h6. The bishop is heading for g7, and the pawn shuts the diagonal from h5 to your king before a queen can use it. The engine prefers …h6, asking the bishop where it's going at once; after …g6 they are a little better.", '…g6 — closes h5, bishop to g7.'],
    ["Nc3 — more than half the masters. The knight covers e4 and d5, and it backs a push to e4, where their pawn would hit your f5 pawn. Who controls e4: that's the fight here too.", 'Nc3 — backs the e4 push.'],
    ["…Bg7 — about seven masters in ten. With no knight on f6 yet, the bishop already looks down the diagonal at d4. But notice: the pawn on e7 is still pinned, so …e5 is off for now; it would leave your queen to the bishop on g5.", '…Bg7 — hits d4 already.'],
    ["e3 — the masters split three ways here, between e3, e4 and h4. The quiet e3 guards d4 against your bishop, covers f4, and opens a diagonal for the bishop on f1.", 'e3 — guards d4, frees the bishop.'],
    ["…Nf6 — natural, but here it's a real slip: the engine prefers …c6, and now they are clearly better. Why? Look at the engine's answer: h4, h5 and h6, and their h-pawn drives your bishop off g7. Your knight on f6 is also a piece their bishop on g5 can take whenever it likes.", '…Nf6 — a slip; the h-pawn comes.'],
    ["Bd3 — the bishop hits your f5 pawn, which g6 guards, and it backs an e4 push. The engine prefers h4 at once; after Bd3 they are a little better.", 'Bd3 — hits f5, backs e4.'],
    ["…d5 — the engine's choice. Now e4 is covered by both your pawns and your knight, three guards against their two, so their e-pawn stays put. That's the Dutch habit in every line: when they aim at e4, add a guard.", '…d5 — a third guard on e4.'],
    ["Nge2 — the knight goes to e2, not f3. Why? It keeps f3 free for their f-pawn, which could back an e4 push, and from e2 it can jump to f4, where it would hit your pawn on g6.", 'Nge2 — heading for f4.'],
    ["…O-O — you castle, behind the pawn on g6 and the bishop on g7. Keep an eye on that g6 pawn: their knight and their h-pawn are both about to aim at it.", '…O-O — king safe; watch g6.'],
    ["Nf4 — there's the knight, hitting your pawns on d5 and g6. Look at d5 closely: their knights on c3 and f4 hit it, your queen and your knight on f6 guard it, and their bishop on g5 hits that knight.", 'Nf4 — hits d5 and g6.'],
    ["…c6 — the engine's choice, and the game is about level. The pawn adds a guard to d5, so trading off your knight no longer costs you the pawn. Why not the active …c5? Then h4 comes, and two moves later Nxg6 picks up a pawn.", '…c6 — props up d5; about level.'],
    ["h4 — and the storm starts. The pawn heads for h5 to hit g6, and on the way it guards their bishop on g5.", 'h4 — the storm; guards g5.'],
    ["…Ne4 — meet a wing attack in the center. The knight jumps to e4, guarded by your pawns on d5 and f5, and it hits their knight on c3 and the bishop on g5. One thing to note: with the knight gone from f6, the pawn on e7 is pinned to your queen again.", '…Ne4 — central counter, hits c3 and g5.'],
    ["Bxe4 — they give up the bishop for your knight. Their bishop on e4 hits d5 and f5, so the question is which pawn takes back, and it matters.", 'Bxe4 — bishop for knight; which pawn?'],
    ["…fxe4 — the f-pawn. Why not …dxe4? Then h5 crashes into g6, and they'd be clearly better. This way d5 stays, the f-file opens, and your rook on f8 looks straight down it at their knight on f4. You have both bishops now too, and the game is about level.", '…fxe4 — f-file opens, two bishops.'],
    ["h5 — they push on, and now g6 is hit twice, by this pawn and the knight on f4. But it's not their best: the engine prefers f3, hitting your e4 pawn, and now you are a little better. Careful, though. Your e7 pawn is still pinned, so …e6 or …e5 would hand them your queen with Bxd8.", 'h5 — hits g6 twice.'],
    ["…Rf5 — and here's the point. When their h-pawn moved past h4, it stopped guarding the bishop on g5. Your rook steps up the open file and hits that bishop, which has no guard at all, and the knight on f4 too.", '…Rf5 — hits the loose bishop on g5.'],
    ["h6 — they leave the bishop and hit yours on g7 instead. The engine prefers Qg4, guarding the bishop on g5; after h6 you are a little better.", 'h6 — hits g7, leaves g5.'],
    ["…Rxg5 — take the bishop; nothing takes back. Yes, they take your bishop on g7 next, so the material comes out level, but your rook now stands on g5, hitting g2.", '…Rxg5 — wins the bishop; nothing recaptures.'],
    ["hxg7 — their pawn takes your bishop and lands on g7, right next to your king. It has no guard there, and it can't move on.", 'hxg7 — a loose pawn on g7.'],
    ["…Bf5 — the last piece comes out. The bishop guards your pawn on e4 and takes g4 away from their queen. You are a little better. The plan from here: when f3 hits your e4 pawn, take on f3, bring the knight out with …Nd7 and push …e5; your king can pick up the pawn on g7 whenever it suits you.", '…Bf5 — guards e4, takes g4.'],
  ],
  'Leningrad e5 Break': [
    ["…c6 — almost four masters in ten, a shade more than play …Qe8. The pawn covers d5 and b5, and it gets you ready for the other Leningrad plan: …e5 without spending a move on the queen.", '…c6 — covers d5; …e5 next.'],
    ["d5 — about a third of the masters push past. The pawn hits c6 and covers e6, the square your pawns can no longer cover. Your answer is the break.", 'd5 — hits c6, covers e6.'],
    ["…e5 — three masters in four. There's the Leningrad strike: your pawns now stand on d6, e5 and f5, a real center of your own. Can they ignore it? Their pawn on d5 can take it en passant, and that's what most masters do.", '…e5 — the Leningrad break.'],
    ["dxe6 — more than nine masters in ten take en passant. The pawn lands on e6 with no guard, so your bishop on c8 takes it. Notice too that the d-file is open now: their queen on d1 looks straight at your pawn on d6.", 'dxe6 — en passant; d6 is exposed.'],
    ["…Bxe6 — almost every master. The bishop takes back and settles on e6, the very square …f5 weakened, and it hits c4, which has no guard.", '…Bxe6 — on e6, hitting c4.'],
    ["b3 — the pawn guards c4. Why not Ng5 first, to hit your bishop? Then …Bxc4 just takes the pawn. So b3 comes first.", 'b3 — guards c4 before Ng5.'],
    ["…Na6 — the engine's first choice. Why not d7? There the knight would stand between your queen and the d6 pawn, and their queen on d1 is staring at d6 down the open file. From a6 it heads for c5, and it covers c7.", '…Na6 — keeps the d-file clear.'],
    ["Ng5 — the knight hits your bishop on e6, and nothing guards it, so you have to deal with it now.", 'Ng5 — hits the loose bishop.'],
    ["…Bc8 — the bishop goes home. Not d7, for the same reason the knight avoided it: it would cut your queen off from d6. They are a little better. The plan from here: …Nc5, and …h6 to push the knight back from g5, while your pawns on d6 and f5 keep e5 and e4 covered.", '…Bc8 — home again; …Nc5 next.'],
  ],
  'Ilyin-Zhenevsky System': [
    ["Nc3 — about one master in eight; more than half play b3. The knight puts a second hit on d5, which is guarded three times, and it backs an e4 push.", 'Nc3 — hits d5, backs e4.'],
    ["…c6 — nine masters in ten. The pawn gives d5 a fourth guard, so if they take there, a pawn takes back.", '…c6 — a fourth guard on d5.'],
    ["Qc2 — about one master in five. The queen looks at your pawn on f5, which e6 guards, and it backs e4: that's two pieces behind an e4 push now, the queen and the knight on c3.", 'Qc2 — backs e4, looks at f5.'],
    ["…Qe8 — only about one master in eleven; half play …Ne4. But this is the Ilyin-Zhenevsky idea: the queen goes to e8 so it can swing to h5. With your g-pawn still on g7, nothing blocks the diagonal, and on h5 the queen would look down the h-file at h2. The engine prefers …Bd7; after …Qe8 they are a little better.", '…Qe8 — heading for h5.'],
    ["Rb1 — the rook gets behind the b-pawn. Your bishop on e7 covers b4, so b4 needs support before it can come.", 'Rb1 — prepares b4.'],
    ["…a5 — three of the four masters here. Now b4 is covered twice, by this pawn and your bishop on e7, so their push is slowed down.", '…a5 — covers b4 twice.'],
    ["a3 — now b4 has a pawn behind it. The engine prefers Na4; after a3 they are a little better.", 'a3 — backs b4.'],
    ["…b5 — you strike first. The pawn hits c4, which has no guard, and if they take on b5, the c-file opens.", '…b5 — hits the loose c4 pawn.'],
    ["cxb5 — they take. The engine prefers b3, holding c4; after cxb5 they are a little better. Their pawn on b5 now hits c6, so you take back.", 'cxb5 — trade; you take back.'],
    ["…cxb5 — and the game is about level. Look at the board: the c-file is open, and your knight on b8 finally has c6. The plan from here: …Nc6, then …b4 to kick the knight off c3, and swing the queen to h5, toward their king.", '…cxb5 — c-file open; …Nc6 next.'],
  ],
  'Hopton Attack Response': [
    ["Nf3 — about one master in six starts with the knight. It covers e5, and g3 with Bg2 can still follow.", 'Nf3 — covers e5 first.'],
    ["…Nf6 — nearly nine masters in ten. Same job as ever: your pawn on f5 and this knight both cover e4.", '…Nf6 — two guards on e4.'],
    ["g3 — about two masters in three. So it's the fianchetto after all, just with the knight out first.", 'g3 — the fianchetto is coming.'],
    ["…g6 — about three masters in four, and you're back in the Leningrad. Your bishop goes to g7, and the pawn guards f5.", '…g6 — the Leningrad again.'],
    ["Bg2 — nearly nine masters in ten, but the engine prefers c4 first; after Bg2 they are a little better. The bishop sits behind its own knight on f3 for now.", 'Bg2 — behind its knight on f3.'],
    ["…Bg7 — every master. Look at the board: it's the same position the main line reaches, just by a different order. From here the moves are familiar.", '…Bg7 — same position, different order.'],
    ["O-O — they castle, as more than eight masters in ten do here.", 'O-O — king tucked away.'],
    ["…O-O — you castle as well, and almost every master does. With the rook on f8, your f-pawn has a rook behind it.", '…O-O — rook behind the f-pawn.'],
    ["c4 — six masters in ten. The pawn grabs space and covers d5, and now you need a plan for the center.", 'c4 — space; covers d5.'],
    ["…d6 — nearly every master. The pawn takes e5 away from their knight and prepares your own pawn for e5.", '…d6 — e5 is covered.'],
    ["Nc3 — nine masters in ten. The knight covers d5 and e4; it's the only piece of theirs on e4, and you cover it twice.", 'Nc3 — one hit on e4.'],
    ["…c6 — about four masters in ten. Instead of …Qe8, the pawn covers d5 and b5 and gets you ready to strike with …e5 straight away.", '…c6 — …e5 is the plan.'],
    ["d5 — about a third of the masters. The pawn hits c6 and covers e6. Time to strike back.", 'd5 — space; e6 covered.'],
    ["…e5 — three masters in four play it. Now d6, e5 and f5 make a center of your own, and their d5 pawn has to decide: take en passant, or let it stand.", '…e5 — your center appears.'],
    ["dxe6 — nine masters in ten take en passant. The pawn on e6 has no guard, and your bishop on c8 can take it.", 'dxe6 — en passant, a loose pawn.'],
    ["…Bxe6 — you take back. Your bishop now sits on e6 and hits the pawn on c4, which has nothing guarding it.", '…Bxe6 — c4 has no guard.'],
    ["b3 — they guard c4 with a pawn, and the bishop on c1 can come to b2.", 'b3 — c4 guarded, b2 freed.'],
    ["…Na6 — the engine's choice again. Not d7, which would cut your queen off from d6; the knight heads for c5 instead.", '…Na6 — bound for c5.'],
    ["Bb2 — here they play the bishop instead of Ng5. It goes to the long diagonal, behind their knight on c3, and through it at your knight on f6.", 'Bb2 — the long diagonal.'],
    ["…Nc5 — the knight arrives. It hits b3, covers e4, and guards your bishop on e6, so Ng5 won't come with a free hit on it. The engine prefers …Ne4, hitting their knight on c3 at once; after …Nc5 they are a little better. The plan from here: …Ne4 when the moment comes, …Qe7 to connect your rooks, and keep your pawns on d6 and f5 holding e5 and e4.", '…Nc5 — hits b3, guards e6.'],
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
