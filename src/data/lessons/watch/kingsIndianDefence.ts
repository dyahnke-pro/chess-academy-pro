// King's Indian Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=kings-indian-defence`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a). One story runs through every line: let
// them build the big center, hit it with …e5 or …c5, and when it locks, race
// your kingside pawns against their queenside play.
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7', 'Ne1', 'Nd7', 'Be3', 'f5', 'f3', 'f4', 'Bf2', 'g5', 'Nd3', 'Nf6', 'c5', 'Ng6'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — just over a third of master games begin here; e4 is more common, and the engine prefers it. The pawn takes a central square and covers c5 and e5. Keep e5 in mind. In the King's Indian that's the square your own pawn will fight for, just not yet.", 'd4 — the center; covers c5 and e5.'],
  ["…Nf6 — about six masters in ten. Why not grab the center with …d5? About a quarter of the masters do. The King's Indian takes the other road: the knight comes out first and watches e4 and d5, and your center pawns stay home for now.", '…Nf6 — watches e4 and d5.'],
  ["c4 — about seven masters in ten. Now c4 and d4 stand side by side, and the new pawn covers d5, one of the squares your knight watches. The plan behind it is simple: Nc3, then e4, and a wall of pawns across the middle.", 'c4 — side by side; covers d5.'],
  ["…g6 — here's the crossroads. More than half the masters play …e6; a third choose …g6, and that's your road. The pawn makes room for the bishop on g7, on the long diagonal that runs through d4. You aren't fighting for the center with pawns yet. You're aiming a bishop at it.", '…g6 — the bishop heads for g7.'],
  ["Nc3 — eight masters in ten. The knight covers e4 and d5, so their e-pawn can step up next with support. Should you stop that? In the King's Indian, no. You let them build.", 'Nc3 — backs up the e4 push.'],
  ["…Bg7 — about two masters in three. The bishop settles on the long diagonal, behind your knight on f6 for now. The other third play …d5, the Grünfeld, and the engine prefers that; after …Bg7 they are a little better. But this is the King's Indian deal: you allow e4, and this bishop waits for the day the center opens.", '…Bg7 — the fianchetto, aimed down the diagonal.'],
  ["e4 — more than nine masters in ten take the offer. Look at the board: pawns on c4, d4 and e4, and nothing of yours in the middle. Doesn't that look bad? That's the hypermodern bet. Let them have the pawns now, then hit them from the side with yours and from a distance with your pieces. For now they are a little better.", 'e4 — three pawns abreast.'],
  ["…d6 — nine masters in ten. First question: what does e5 do to you? Right now their e-pawn could jump there and kick your knight off f6. The pawn on d6 covers e5, so that push is off. And it's the base for your own plan: …e5 next, hitting d4.", '…d6 — covers e5, prepares …e5.'],
  ["Nf3 — the most common choice, nearly four masters in ten. The knight develops, adds a second guard to d4 and covers e5. Notice how many systems branch off right here: f3 is the Sämisch, f4 the Four Pawns, h3 the Makogonov. Each one starts a different fight. In this one they simply develop.", 'Nf3 — develops, guards d4.'],
  ["…O-O — almost every master castles now. Your king is safe before anything opens, and the rook lands on f8. Keep that rook in mind: the f-file is where your play will come from later.", '…O-O — king safe, rook on f8.'],
  ["Be2 — more than eight masters in ten. The bishop steps out modestly and clears the way for their king to castle. Nothing flashy. They have the space, and now it's your turn to hit the center.", 'Be2 — castling next.'],
  ["…e5 — about eight masters in ten, and here's your strike: the pawn hits d4. Can they just take it? Not for profit. If they trade on e5 and their knight grabs the pawn, your knight hits back on e4 and the material comes out level. So the center has to declare itself: trade, push past to d5, or hold the tension.", '…e5 — the strike at d4.'],
  ["O-O — about seven masters in ten castle and leave the tension standing. Pushing d5 at once is the Petrosian, about one master in ten. Both kings are tucked away now, and d4 is still under fire from your pawn on e5.", 'O-O — tension kept, both kings safe.'],
  ["…Nc6 — about seven masters in ten. Count d4 now: your pawn on e5 and this knight hit it, and their knight on f3 and queen guard it. The knight also gives e5 a second guard. The question goes to them: keep holding, or close the center?", '…Nc6 — a second hit on d4.'],
  ["d5 — more than nine masters in ten. The pawn kicks your knight, and the center locks: d5 against d6, e4 against e5. Now read the chains. Theirs points toward the queenside, so that's where they'll play, with c5. Yours points toward the kingside, so that's where you'll play, with …f5. Two attacks on opposite wings: this is the race the King's Indian is famous for.", 'd5 — the center locks.'],
  ["…Ne7 — every master. Where does the knight go? …Nd4 looks active, but they trade on d4 and the queen collects your pawn there. On e7 the knight still hits d5, and from here it can head for g6, toward the kingside, where your play is going to be.", '…Ne7 — the knight turns kingside.'],
  ["Ne1 — nearly four masters in ten, while slightly more push b4 at once, the Bayonet. Why retreat the knight? It's on its way to d3, where it will back up the c5 break. And with f3 empty, their f-pawn can step up to guard e4 before your …f5 arrives.", 'Ne1 — heading for d3 and c5.'],
  ["…Nd7 — more than eight masters in ten. Your knight on f6 was standing right in front of the f-pawn, and …f5 is the whole plan, so it steps aside. Why d7? From there it covers c5, the square of their break, and it can come back to f6 later.", '…Nd7 — clears the f-pawn, covers c5.'],
  ["Be3 — a bit over four masters in ten. Look at its diagonals: from e3 the bishop covers c5, for their break, and f4, the square your f-pawn would like to reach. It also hits a7, but your rook on a8 guards it. Remember this bishop, because your f-pawn is about to come after it.", 'Be3 — covers c5 and f4.'],
  ["…f5 — every master, and the race begins. The pawn hits e4, the base of their chain. If they take on f5, your knight on e7 can take back. If they leave it, you can push on to f4 with gain of time. Either way your rook on f8 already stands behind the pawn on the f-file.", '…f5 — hits e4; the race begins.'],
  ["f3 — every master. The pawn guards e4, so taking there gets you nothing: …fxe4 fxe4 only leaves their center standing. It also covers g4. Remember that pawn on f3. It's the one your g-pawn will aim at later.", 'f3 — guards e4, covers g4.'],
  ["…f4 — almost every master. Why push past instead of taking on e4? Because the pawn hits the bishop on e3, so it has to move, and you gain the time. Now f4 is yours, and you have more space on the kingside. The price: your bishop on g7 is shut in behind e5. That's the trade every King's Indian player makes.", '…f4 — kicks the bishop, grabs space.'],
  ["Bf2 — every master. Not c5, where your d6 pawn would take it. On f2 the bishop still looks along the diagonal at c5, backing their break, and the other way it guards g3 and h4, two squares your pieces would like to use.", 'Bf2 — backs c5, guards g3 and h4.'],
  ["…g5 — almost every master, and now the storm has two pawns. The g-pawn guards f4 and takes h4 away from their bishop, which would pin your knight on e7 to the queen from there. And what comes next? …g4, hitting the pawn on f3.", '…g5 — the storm; …g4 is next.'],
  ["Nd3 — about one master in six. The knight from e1 finishes its trip. From d3 it hits your pawns on e5 and f4, both guarded, but its real job is c5: the knight and the bishop on f2 both stand behind the break now. Their attack is ready to go.", 'Nd3 — two pieces behind c5.'],
  ["…Nf6 — the knight comes back. Why? From f6 it covers g4, the square your g-pawn is heading for, and it hits e4. It also clears d7 for your bishop on c8. The engine prefers …h5 first, adding a pawn to the g4 push; after …Nf6 they are a little better.", '…Nf6 — back to cover g4.'],
  ["c5 — there's their break. The pawn hits d6, and if it gets to take there, the c-file opens toward your c7 pawn. Should you take on c5? Their knight just takes back. So you leave it, let them open the file, and get on with your own attack.", 'c5 — hits d6; the c-file is coming.'],
  ["…Ng6 — and look where the knight stands now: it covers h4 and backs up your pawn on f4, aimed at their king's side of the board. That's the race in full, and they are a little better. The plan from here: let them open the c-file with cxd6, guard c7 with …Rf7, and push …h5 and …g4 to break open f3 in front of their king.", '…Ng6 — covers h4; the race is on.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the lines filed before it don't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Classical Main Line (Mar del Plata)': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7', 'Ne1', 'Nd7', 'f3', 'f5', 'Be3', 'f4', 'Bf2', 'g5', 'Nd3', 'Ng6', 'c5', 'Nf6', 'cxd6', 'cxd6', 'Rc1', 'Rf7', 'Nb5', 'a6', 'Na3', 'b5'],
  'Bayonet Attack (9.b4)': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7', 'b4', 'Nh5', 'Re1', 'f5', 'Ng5', 'Nf6', 'f3', 'f4'],
  'Saemisch Variation': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O', 'Be3', 'e5', 'd5', 'Nh5', 'Qd2', 'Qh4+', 'g3', 'Nxg3', 'Qf2', 'Nxf1', 'Qxh4', 'Nxe3'],
  'Four Pawns Attack': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f4', 'O-O', 'Nf3', 'c5', 'd5', 'e6', 'Be2', 'exd5', 'cxd5', 'Re8', 'e5', 'dxe5', 'fxe5', 'Ng4', 'Bg5', 'Qb6', 'O-O', 'Nxe5', 'Nxe5', 'Rxe5', 'Bf4', 'Re8'],
  'Fianchetto Variation': ['d4', 'Nf6', 'c4', 'g6', 'Nf3', 'Bg7', 'g3', 'O-O', 'Bg2', 'd6', 'O-O', 'Nbd7', 'Nc3', 'e5', 'e4', 'c6', 'h3', 'Qb6', 'Re1', 'Re8', 'd5', 'cxd5', 'cxd5', 'Nc5'],
  'Petrosian System (Bg5)': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'd5', 'a5', 'Bg5', 'h6', 'Bh4', 'Na6', 'Nd2', 'Qe8', 'O-O', 'Nh7', 'f3', 'Bd7'],
  'Averbakh Variation': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Be2', 'O-O', 'Bg5', 'c5', 'd5', 'h6', 'Bf4', 'e6', 'dxe6', 'Bxe6', 'Bxd6', 'Re8', 'Nf3', 'Nc6', 'O-O', 'Nd4', 'Bg3'],
  'Makogonov Variation (h3)': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'h3', 'e5', 'd5', 'Nh5', 'Be2', 'Nf4', 'Bxf4', 'exf4', 'Qd2', 'Qf6', 'O-O'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Classical Main Line (Mar del Plata)': [
    ["f3 — about one master in five plays this order. The pawn guards e4 before your …f5 even arrives, and it keeps your pieces off g4. The bishop comes to e3 next, so watch: in two more moves the board is the same as the main line, just reached by a different road.", 'f3 — guards e4 early.'],
    ["…f5 — every master pushes anyway. The pawn hits e4, but e4 is already guarded by the f3 pawn and the knight on c3, so this isn't about winning it. It's about space, and the next step is …f4.", '…f5 — hits e4; …f4 next.'],
    ["Be3 — about a third of the masters. Nearly half try g4 here instead, to stop your f-pawn in its tracks. With the bishop on e3, the board matches the main line, and the bishop stands right where your next move hits it.", 'Be3 — back to the main line.'],
    ["…f4 — almost every master. The pawn hits the bishop on e3, so it has to move again, and you've grabbed space on the kingside with gain of time. Same plan, same position as the main line.", '…f4 — hits the bishop, gains space.'],
    ["Bf2 — every master. The bishop gets out of the pawn's way and still covers c5, the square their c-pawn is aiming for.", 'Bf2 — still covers c5.'],
    ["…g5 — almost every master. The g-pawn joins the f-pawn and guards f4. The next step is …g4 against the pawn on f3, and that's how you pry open the squares in front of their king.", '…g5 — the storm grows.'],
    ["Nd3 — about one master in six. The knight from e1 reaches d3, where it covers c5 alongside the bishop on f2. Their break is ready.", 'Nd3 — two guards on c5.'],
    ["…Ng6 — this time the knight from e7 moves first. On g6 it covers h4 and backs up f4. In the main line the other knight went to f6 first. Two moves from now you'll see both orders land on the same board.", '…Ng6 — covers h4 and f4.'],
    ["c5 — the break. The pawn hits d6, and the c-file is about to open. The engine prefers a4 first, taking more queenside space before the break; after c5 they are a little better.", 'c5 — hits d6.'],
    ["…Nf6 — and here's the main line's final board, reached the other way round. The knight covers g4 and hits e4. Should you grab on c5? The engine rates both captures worse, because their pieces take back and land on c5. So you keep d6 where it is and let them decide.", '…Nf6 — covers g4, hits e4.'],
    ["cxd6 — they open the c-file. For a moment you're a pawn down, and their pawn on d6 hits c7. So how do you take back? It's a real question.", 'cxd6 — the c-file opens.'],
    ["…cxd6 — with the pawn. Why not the queen? …Qxd6 runs into Nb5, which hits the queen, and after it steps back the knight goes on to grab a7. With the pawn, d6 stays solid and the game is about level.", '…cxd6 — the pawn, not the queen.'],
    ["Rc1 — the rook takes the open file. Right now its own knight on c3 stands in the way, so watch that knight: when it jumps, the rook looks straight up the file at c7.", 'Rc1 — the rook takes the c-file.'],
    ["…Rf7 — a quiet move with a big job. Your rook steps up and guards c7 from the side, along the rank. That's the square their rook and knight want, and the rook still keeps its place on the f-file. The game is about level.", '…Rf7 — guards c7 from the side.'],
    ["Nb5 — there's the knight jump. It hits two pawns, a7 and d6, and joins the rook on c1 against c7. Count a7: the knight and the bishop on f2 hit it, and only your rook on a8 guards it. Something has to give.", 'Nb5 — hits a7 and d6.'],
    ["…a6 — the pawn steps off a7 and hits the knight on b5. Can the knight take on d6 instead of running? Then your queen takes back, and they've given a knight for a pawn. So it has to go. The engine prefers …g4 here, pushing on with your own attack; after …a6 the game is about level.", '…a6 — kicks the knight off b5.'],
    ["Na3 — the knight goes back to the rim, hoping to reach c4 next. The engine prefers Na7; after Na3 you are a little better.", 'Na3 — to the rim, eyeing c4.'],
    ["…b5 — the pawn takes c4 away from the knight on a3, so it stays stuck on the rim, and it opens b7 for your bishop on c8. The game is about level. The plan from here: with the queenside settled, go back to the race and push …h5 and …g4 to break open the squares around their king.", '…b5 — takes c4; back to the kingside.'],
  ],
  'Bayonet Attack (9.b4)': [
    ["b4 — the Bayonet, and the most popular move here, about four masters in ten. Why spend two moves on Ne1 and Nd3 when the b-pawn can back up c5 directly? The pawn grabs queenside space and covers c5, and their attack starts sooner.", 'b4 — the Bayonet: queenside space now.'],
    ["…Nh5 — six masters in ten. Same goal as …Nd7 in the main line: get the knight off f6 so the f-pawn can move. But from h5 it also covers f4, the square in front of your pawn storm. About a quarter of the masters play …a5 first, hitting b4 before anything else.", '…Nh5 — frees the f-pawn, covers f4.'],
    ["Re1 — about three masters in four. The rook comes to the e-file behind their bishop on e2. Why there? Once the bishop moves, the rook guards e4, the pawn your …f5 is about to hit.", 'Re1 — ready to guard e4.'],
    ["…f5 — nearly three masters in four, and your break comes right on time. The pawn hits e4. If they take on f5, your e-pawn steps to e4 and hits the knight on f3, so that capture comes with a cost.", '…f5 — the break, hitting e4.'],
    ["Ng5 — two masters in three. The knight jumps toward e6, a square none of your pawns can ever cover, and it adds a guard to e4. It also opens the diagonal from their bishop on e2 to your knight on h5. The engine prefers a4; after Ng5 they are a little better.", 'Ng5 — toward e6, opens the bishop.'],
    ["…Nf6 — nine masters in ten bring the knight back. Their bishop on e2 was now looking at it on h5, so the knight returns to the center, where it hits e4 and d5. The engine prefers …Nf4, going after the bishop on e2 instead; after …Nf6 they are a little better.", '…Nf6 — back to the center, hits e4.'],
    ["f3 — the pawn shores up e4 and takes g4 away from your knight. The engine prefers taking on f5 first; after f3 they are a little better. Notice their knight on g5 is a bit lonely out there, and …h6 can ask it to leave.", 'f3 — shores up e4.'],
    ["…f4 — you gain kingside space and close that side up, the same idea as the main line. The engine prefers …c6 first, hitting d5; after …f4 they are a little better. The plan from here: they push on the queenside and look to plant the knight on e6, and you chase it with …h6 and keep building on the kingside.", '…f4 — space on the kingside.'],
  ],
  'Saemisch Variation': [
    ["f3 — the Sämisch, about one master in five. The pawn guards e4, so it stands rock solid, and it takes g4 away from your knight and bishop. The cost: their knight on g1 loses its best square, f3. Be3 and Qd2 usually come next.", 'f3 — the Sämisch: e4 rock solid.'],
    ["…O-O — nine masters in ten castle first. Your king is safe before their pieces come at it, and your rook gets to f8, behind the f-pawn.", '…O-O — king safe first.'],
    ["Be3 — about two masters in three. The bishop guards d4 and sits on the diagonal toward h6. Remember that square: once the queen comes to d2, Bh6 can offer to trade your bishop on g7. The game is about level.", 'Be3 — guards d4, eyes h6.'],
    ["…e5 — about one master in five strikes this way. The pawn hits d4, the same break as in the Classical lines. The engine prefers …c5, hitting d4 from the other side; after …e5 they are a little better. Now it's their call: close the center or trade.", '…e5 — the classic strike at d4.'],
    ["d5 — six masters in ten close the center. You know the plan by now: the knight on f6 has to step aside so your f-pawn can move. Where should it go this time?", 'd5 — the center closes.'],
    ["…Nh5 — about four masters in ten. The knight clears your f-pawn, and look at what else it clears: the diagonal from your queen on d8 to h4. With their f-pawn gone from f2, a queen on h4 would give check. The engine prefers …Nfd7; after …Nh5 they are clearly better, and the next moves show how sharp this line gets.", '…Nh5 — opens the road to h4.'],
    ["Qd2 — nine masters in ten. The queen stands behind the bishop on e3, both pointed along the diagonal toward h6, and the way is clear for their king to castle long. But it does nothing to stop your queen from coming to h4 with check.", 'Qd2 — castling long next.'],
    ["…Qh4+ — a third of the masters go for it. Check, and the queen also hits e4 and h2. How do they block? If g3, the pawn lands right on the diagonal between your queen and their king, and your knight on h5 is aimed at g3. The engine prefers the calmer …f5; after …Qh4+ they are clearly better.", '…Qh4+ — check, and g3 is a target.'],
    ["g3 — about half the masters block with the pawn, and almost as many with Bf2. The pawn hits your queen. But it stands between your queen and their king, so it's pinned there, and your knight on h5 can take it.", 'g3 — hits the queen, but pinned.'],
    ["…Nxg3 — almost every master. The knight grabs the pawn and hits the rook on h1 and the bishop on f1. And look at the diagonal: the knight now stands between your queen and their king, so any knight move uncovers check. Can they take with the h-pawn? Then …Qxh1, and the rook is gone.", '…Nxg3 — hits h1 and f1.'],
    ["Qf2 — every master. The queen hits your knight and plugs the diagonal, so a knight move no longer gives check. Worse, if the knight moves at all, Qxh4 takes your queen. Grab the rook on h1? Then Qxh4, and nothing takes back. So what's left?", 'Qf2 — blocks the check, hits g3.'],
    ["…Nxf1 — every master. The knight takes the bishop, and yes, they will take your queen now. But from f1 the knight hits their other bishop on e3, so you're collecting pieces for it. Here's the deal: your queen for two bishops and a pawn.", '…Nxf1 — a second bishop is next.'],
    ["Qxh4 — they take the queen. For the moment you have only a bishop and a pawn for it, and they are clearly better. But their bishop on e3 has no guard, and your knight on f1 can take it.", 'Qxh4 — the queen comes off.'],
    ["…Nxe3 — and the second bishop falls. Now the knight hits c4, and it threatens …Ng2 with check, hitting their king and their queen on h4 at once, so they must spend a move on it. Count it up: two bishops and a pawn for the queen, with c4 next, and they are only a little better. The plan from here: take on c4, get your knight from b8 into the game, and keep your pieces guarding each other so their queen finds nothing loose.", '…Nxe3 — two bishops for the queen.'],
  ],
  'Four Pawns Attack': [
    ["f4 — the Four Pawns Attack, about one master in twenty. Now four pawns stand across the board, on c4, d4, e4 and f4, and the new one covers e5. So your usual …e5 is harder to play, and later their own e-pawn can come to e5 and kick your knight. The engine prefers Nf3; after f4 the game is about level, so this huge center can be hit.", 'f4 — four pawns abreast.'],
    ["…O-O — more than eight masters in ten castle first. Your king gets safe before that big center starts moving.", '…O-O — king safe first.'],
    ["Nf3 — almost every master. The knight backs up d4 and e5, ready for the e5 push. The engine slightly prefers Be2 first; after Nf3 they are a little better.", 'Nf3 — backs up d4 and e5.'],
    ["…c5 — about seven masters in ten. Why not …e5, the usual King's Indian break? Because e5 is covered three times now: by the pawns on d4 and f4, and by the knight. So you hit the center from the other side, where it's thinner. The pawn hits d4.", '…c5 — hit the center from the side.'],
    ["d5 — about eight masters in ten push past. If you know the Benoni, you'll recognise this: their pawn on d5, yours on c5 and d6. Now you go after d5 from the other side.", 'd5 — a Benoni structure.'],
    ["…e6 — about eight masters in ten. The pawn hits d5, and it puts a question to it. If they take on e6, their d-pawn is gone from the middle. If you get to take on d5, the e-file opens for your rook. About one master in ten tries …b5 instead, and that costs you about half a pawn.", '…e6 — hits d5.'],
    ["Be2 — about eight masters in ten. They leave the pawn on d5 to its fate for now and get ready to castle, so the decision is yours: take on d5.", 'Be2 — castling next.'],
    ["…exd5 — almost every master. Your pawn on d5 hits two pawns, c4 and e4, so they have to take back right away. And the e-file is half-open now for your rook.", '…exd5 — hits c4 and e4.'],
    ["cxd5 — nearly nine masters in ten take with the c-pawn. Now look at the structure: three central pawns of theirs on d5, e4 and f4, and more pawns for you on the queenside. Their plan is e5, pushing through the middle. Yours is to stop it and pile up on e4.", 'cxd5 — the center: d5, e4, f4.'],
    ["…Re8 — about a third of the masters. The rook comes to the half-open file and hits e4. Count it: your rook and your knight on f6 against only their knight on c3. So they have to act. The engine prefers …Nbd7; after …Re8 they are a little better.", '…Re8 — two hits on e4.'],
    ["e5 — about three masters in four, and here it is. The pawn hits your knight on f6 and the pawn on d6 at once. Their whole system was built for this push.", 'e5 — hits the knight and d6.'],
    ["…dxe5 — almost every master takes, and now the pawn on e5 is yours and hits f4. The price of the capture: their pawn on d5 is passed, and no pawn of yours can stop it.", '…dxe5 — hits f4; d5 is passed.'],
    ["fxe5 — every master takes back, and the pawn hits your knight on f6 again. Where does it go? Not d5: that pawn is guarded, and you'd give a knight for it. The answer is g4, a square none of their pieces covers.", 'fxe5 — hits the knight again.'],
    ["…Ng4 — almost every master. The knight hits e5 from the side, and now count: your rook on e8, your bishop on g7 and this knight all hit e5, and only their knight on f3 guards it. Their center is about to cost them a pawn.", '…Ng4 — three hits on e5.'],
    ["Bg5 — the bishop hits your queen on d8, and it's a trick. If you grab e5 right away, with the bishop or the knight, Bxd8 takes your queen. The engine prefers pushing e6; after Bg5 the game is about level.", 'Bg5 — hits the queen; a trick.'],
    ["…Qb6 — first the queen steps out of the bishop's reach, and it does it with a threat: it hits b2, which nothing guards. Now e5 and b2 are both hanging, and you are a little better.", '…Qb6 — out of reach, hits b2.'],
    ["O-O — they don't bother saving b2; their king comes first. You are still a little better, and now you get to pick which pawn to take.", 'O-O — king safe, b2 left.'],
    ["…Nxe5 — you take the center pawn first, and the knight hits their knight on f3. If they trade on e5, you take back and stay a pawn up. The game is about level.", '…Nxe5 — the e5 pawn falls.'],
    ["Nxe5 — they trade knights, and the knight on e5 hits f7. How do you take back?", 'Nxe5 — the knights come off.'],
    ["…Rxe5 — with the rook, and now it hits both bishops, on e2 and on g5, and the one on g5 has no guard. The engine prefers taking with the bishop; after …Rxe5 the game is about level.", '…Rxe5 — hits both bishops.'],
    ["Bf4 — the loose bishop steps back and hits your rook on e5. The engine prefers Qd2; after Bf4 you are a little better, and b2 is still hanging.", 'Bf4 — hits the rook on e5.'],
    ["…Re8 — the rook goes back home on the e-file. The engine prefers grabbing b2 with the queen first; after …Re8 you are a little better, a pawn up. The plan from here: develop with …Bf5 and …Nd7, and put a rook in front of their passed pawn on d5.", '…Re8 — back on the e-file, a pawn up.'],
  ],
  'Fianchetto Variation': [
    ["Nf3 — fewer than one master in ten, but it keeps their options open. The knight covers e5, and now g3 and a bishop on g2 can come next: the Fianchetto Variation.", 'Nf3 — covers e5; flexible.'],
    ["…Bg7 — almost every master. Nothing changes for you: the bishop takes the long diagonal toward d4, and castling comes next. The game is about level.", '…Bg7 — the long diagonal.'],
    ["g3 — just under half the masters, and this is the Fianchetto Variation. Their bishop is headed for g2, on the other long diagonal, the light-square road through d5 to b7. The engine prefers Nc3; after g3 the game is about level.", 'g3 — the Fianchetto Variation.'],
    ["…O-O — about seven masters in ten. Your king tucks in behind the bishop on g7. You still haven't touched your center pawns, so a setup with …d5 is open too. The King's Indian way is …d6.", '…O-O — the king tucks in.'],
    ["Bg2 — every master. Both sides have their bishops on the long diagonals now. Theirs sits behind their own knight on f3 for the moment.", 'Bg2 — the fianchetto done.'],
    ["…d6 — about seven masters in ten, and now you've committed to the King's Indian. The pawn covers e5 and c5, and it's the base for …e5. For now they are a little better.", '…d6 — the King\'s Indian; …e5 next.'],
    ["O-O — nearly three masters in four castle. The engine prefers Nc3 first; after castling the game is about level. Both kings are safe, and the fight is about the center.", 'O-O — both kings safe.'],
    ["…Nbd7 — about a third of the masters, nearly as many as …Nc6. Why d7? On c6 the knight could be kicked by d5. From d7 it covers e5 and c5, so when …e5 comes, it's already supported.", '…Nbd7 — backs up …e5.'],
    ["Nc3 — eight masters in ten. The knight covers e4 and d5, and e4 is the next thing they want: a full center with pawns on c4, d4 and e4.", 'Nc3 — e4 is coming.'],
    ["…e5 — almost every master, and that's what the knight on d7 was for. The pawn hits d4, and it's already guarded twice, by the d6 pawn and the knight.", '…e5 — hits d4, guarded twice.'],
    ["e4 — two masters in three take the full center. Now there's tension everywhere: your e5 against d4, their d4 against e5. Who blinks first? If you take on d4, their knight takes back and sits in the middle of the board.", 'e4 — the full center.'],
    ["…c6 — just over four masters in ten. A small pawn move with two jobs. It covers d5 and b5, so their pieces can't use those squares. And it opens the diagonal from your queen on d8 to b6, so the queen can come out and join the fight.", '…c6 — covers d5, frees the queen.'],
    ["h3 — two masters in three. A quiet pawn move that takes g4 away from your knight on f6 and your bishop on c8, so neither can land there.", 'h3 — takes away g4.'],
    ["…Qb6 — about four masters in ten bring the queen out, and it hits b2 and d4. The engine prefers taking on d4 first; after …Qb6 they are clearly better, because the queen on b6 can be hit by c5.", '…Qb6 — hits b2 and d4.'],
    ["Re1 — about four masters in ten. The rook guards e4 from behind. But the engine prefers c5, hitting your queen on b6; after Re1 they are a little better.", 'Re1 — guards e4.'],
    ["…Re8 — about one master in six. The rook backs up your e5 pawn from behind. Eight masters in ten take on d4 here instead, and the engine agrees with them; after …Re8 they are a little better.", '…Re8 — backs up e5.'],
    ["d5 — the pawn pushes past and hits your c6 pawn. The center starts to lock, but the c-file is about to open. Do you take on d5, or let them take on c6?", 'd5 — hits c6.'],
    ["…cxd5 — you take, and the pawn hits c4 and e4. They'll take back with the c-pawn, which opens the c-file. The engine prefers …Nc5 at once; after …cxd5 they are clearly better.", '…cxd5 — the c-file opens.'],
    ["cxd5 — the c-pawn takes back. The center is locked now, their d5 and e4 against your d6 and e5, and the c-file is open for both sides' rooks.", 'cxd5 — the center locks.'],
    ["…Nc5 — the knight lands on a strong square. It hits e4, and it looks at d3, a square no pawn of theirs can ever cover. They are clearly better for now. The plan from here: …Bd7 and …a5, so their b-pawn can never kick the knight off c5, then build the pressure on e4.", '…Nc5 — hits e4, looks at d3.'],
  ],
  'Petrosian System (Bg5)': [
    ["d5 — the Petrosian, about one master in ten. They close the center before castling, so the structure is set right away: their pawns on d5 and e4, yours on d6 and e5. The engine prefers castling first; after d5 they are a little better.", 'd5 — the Petrosian: center closed early.'],
    ["…a5 — about three masters in four. Why the a-pawn? It covers b4, so their b-pawn can't march up the queenside, and it prepares a home on c5 for a knight that b4 can never kick. The game is about level.", '…a5 — covers b4.'],
    ["Bg5 — about two masters in three, and here's the Petrosian's idea: the bishop pins your knight on f6 to the queen on d8. That knight needs to move so your f-pawn can go, and now it can't move freely.", 'Bg5 — pins the knight on f6.'],
    ["…h6 — more than eight masters in ten. The pawn hits the bishop and asks it to decide: take your knight, or step back? If it takes on f6, your queen takes back.", '…h6 — asks the bishop to decide.'],
    ["Bh4 — more than eight masters in ten keep the pin from h4. Your knight on f6 is still stuck in front of the queen, so the next few moves are about untangling.", 'Bh4 — keeps the pin.'],
    ["…Na6 — the other knight heads for c5. From a6 it covers c5 and b4, and together with the a5 pawn it makes b4 off limits.", '…Na6 — heading for c5.'],
    ["Nd2 — the knight leaves f3 and guards e4 and c4. It also clears the way for their f-pawn to step up to f3, shoring up e4 before your …f5.", 'Nd2 — guards e4, makes room for f3.'],
    ["…Qe8 — the queen steps off the pin line. Now your knight on f6 is free to move, and the plan of …Nh7 and …f5 is back on. The engine prefers …Nc5 first; after …Qe8 they are a little better.", '…Qe8 — unpins the knight.'],
    ["O-O — they castle. The engine prefers f3 first, guarding e4 before your break arrives; after castling the game is about level.", 'O-O — king safe; f3 was better.'],
    ["…Nh7 — the knight steps aside, and two things open up. Your f-pawn is free to go to f5, and your bishop on g7 can come to f6 to challenge their bishop on h4. The engine prefers …Nc5 first; after …Nh7 the game is about level.", '…Nh7 — clears f5 and f6.'],
    ["f3 — the pawn guards e4 ahead of your …f5 and takes g4 away from your pieces. Their center is solid again.", 'f3 — guards e4, takes g4.'],
    ["…Bd7 — the last piece comes out, and from d7 the bishop backs up the f5 square for your pawn. The game is about level. The plan from here: …h5 and …f5 to open the kingside, and trade your bishop on g7 for theirs on h4 with …Bf6 whenever that helps.", '…Bd7 — backs f5; …f5 next.'],
  ],
  'Averbakh Variation': [
    ["Be2 — about one master in four. This is the Averbakh, and the point is what they don't play: no Nf3 yet. The bishop covers g4 and h5, so your knight on f6 can't jump there, and their other bishop is headed for g5.", 'Be2 — the Averbakh: Bg5 is coming.'],
    ["…O-O — almost every master castles. Your king is safe before the bishop arrives on g5.", '…O-O — king safe first.'],
    ["Bg5 — about a third of the masters. The bishop hits your knight on f6, the piece that watches e4 and d5. It isn't a pin, since your e-pawn still stands on e7, but the knight is under watch. So you hit the center from the other side.", 'Bg5 — hits the knight on f6.'],
    ["…c5 — about a third of the masters, and the engine likes it best. The pawn hits d4 from the side. If they take on c5, your d-pawn takes back.", '…c5 — hits d4 from the side.'],
    ["d5 — nearly nine masters in ten push past. It's a Benoni-style center again: their pawn on d5, yours on c5 and d6. Now the bishop on g5 gets asked a question.", 'd5 — a Benoni center.'],
    ["…h6 — just under half the masters. The pawn hits the bishop on g5, which has no guard, so it has to decide where to go. The engine prefers …e6 first; after …h6 they are a little better.", '…h6 — hits the bishop on g5.'],
    ["Bf4 — about six masters in ten. The bishop steps back and hits two pawns, d6 and h6. Both are guarded for now: your queen and your e-pawn hold d6, and your bishop on g7 holds h6. But keep an eye on d6.", 'Bf4 — hits d6 and h6.'],
    ["…e6 — six masters in ten. The pawn hits d5, and you're ready to open the center. But notice the price: your e-pawn was one of the guards on d6, and their bishop is already looking at it.", '…e6 — hits d5.'],
    ["dxe6 — they take, and their pawn on e6 hits f7. Now look at d6: with the d-file open, their bishop on f4 and their queen on d1 both hit it, and only your queen guards it.", 'dxe6 — d6 is under fire.'],
    ["…Bxe6 — you take back with the bishop, and it hits c4. What about d6? Guarding it with …Qb6 doesn't work, since Bxd6 takes anyway. So you let it go and put your pieces to work. The game is about level.", '…Bxe6 — hits c4; d6 can go.'],
    ["Bxd6 — they take the pawn, and the bishop on d6 hits your rook on f8, your knight on b8 and the c5 pawn. The knight on b8 is guarded twice, so the rook is the one to move.", 'Bxd6 — hits the rook on f8.'],
    ["…Re8 — the rook steps over to the e-file. Why not develop with …Nc6 first? Then Bxf8, and you've lost a rook for a bishop. From e8 the rook stands behind your bishop on e6, ready for the day the file opens.", '…Re8 — the rook escapes.'],
    ["Nf3 — at last the knight comes out, and castling is next. Your c5 pawn has no guard, but you're about to use the time.", 'Nf3 — castling next.'],
    ["…Nc6 — the knight comes out toward d4, a square no pawn of theirs can ever cover. The engine prefers …Qb6 first; after …Nc6 they are a little better.", '…Nc6 — heading for d4.'],
    ["O-O — their king gets safe, and the game is about level. Now you have two good ideas: bring the queen to b4, or plant the knight on d4.", 'O-O — both kings safe.'],
    ["…Nd4 — the knight lands on its outpost and hits their bishop on e2 and their knight on f3. And look at the d-file: the knight now stands between their queen on d1 and their bishop on d6, so that bishop has no guard, and your queen hits it.", '…Nd4 — the outpost; hits e2 and f3.'],
    ["Bg3 — the bishop gets out of your queen's reach. You're a pawn down and they are a little better, but your knight on d4 can't be chased by a pawn. The plan from here: …Rc8, then …Nh5 to go after the bishop on g3, and keep pressing on c4 and e4.", "Bg3 — out of the queen's reach."],
  ],
  'Makogonov Variation (h3)': [
    ["h3 — the Makogonov, about one master in eight. Before anything else they take g4 away: no …Bg4 to pin the knight on f3, and no knight jump there either. It's prophylaxis, stopping your ideas before they start.", 'h3 — the Makogonov: no …Bg4.'],
    ["…e5 — two masters in three. The usual strike: the pawn hits d4. Their extra move doesn't change your plan.", '…e5 — the strike at d4.'],
    ["d5 — they close the center. So, where does the knight on f6 go, so your f-pawn can move?", 'd5 — the center closes.'],
    ["…Nh5 — the engine's first choice. The knight clears your f-pawn and eyes f4. Here's why h5 is the right square this time: with their pawn on h3, a knight on f4 would hit h3 too.", '…Nh5 — heading for f4.'],
    ["Be2 — they develop, but they let your knight in. The engine prefers g3, taking f4 away from it; after Be2 the game is about level.", 'Be2 — and f4 is open.'],
    ["…Nf4 — there it is. The knight hits the bishop on e2 and the pawns on g2, h3 and d5, and g2 has no guard at all. They can't leave it standing there for long.", '…Nf4 — hits e2 and g2.'],
    ["Bxf4 — they take the knight. The engine prefers Bf1, saving the bishop on e2 instead; after Bxf4 the game is about level. Giving up the dark-squared bishop has a cost, and you'll see it on the next move.", 'Bxf4 — the dark bishop goes.'],
    ["…exf4 — you take back, and look at your bishop on g7. With e5 gone, its diagonal is wide open, and it hits the knight on c3. You have the two bishops now too. The price is doubled f-pawns, but your pieces are much freer.", '…exf4 — the bishop on g7 wakes up.'],
    ["Qd2 — the queen hits your pawn on f4, which has no guard, and gives the knight on c3 a second guard against your bishop.", 'Qd2 — hits f4, guards c3.'],
    ["…Qf6 — the queen guards f4 and lands on the long diagonal in front of your bishop, both aimed at the knight on c3. The game is about level.", '…Qf6 — guards f4, hits c3.'],
    ["O-O — they castle, and you are a little better. Notice a square their pawns can never touch: e5. Their d-pawn has gone past it, and your pawn on f4 blocks their f-pawn. The plan from here: bring your knight from b8 to d7 and on to e5, and keep your queen and bishop aimed down the long diagonal.", 'O-O — your knight wants e5.'],
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

export const KINGS_INDIAN_DEFENCE_WATCH: WatchCourse = {
  openingId: 'kings-indian-defence',
  title: "King's Indian Defence — A Master Class",
  orientation: 'black',
  sources: ['concept:pos-center', 'concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
