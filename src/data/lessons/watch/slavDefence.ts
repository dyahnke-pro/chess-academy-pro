// Slav Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=slav-defence`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a). One story runs through every line: …c6
// holds d5 without closing the road of the bishop on c8, so that bishop comes
// out to f5 or g4 first and …e6 builds the wall behind it; then the game turns
// on the e4 square and on the breaks that open the center.
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6', 'Bxc4', 'Bb4', 'O-O', 'Nbd7', 'Qe2', 'Bg6', 'e4', 'O-O', 'Bg5', 'h6', 'Bh4'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — they open with the queen's pawn, as about a third of master games do. It takes a central square and opens a diagonal for the bishop on c1. Keep one question in mind from the very start: how do you hold the center without shutting in your own bishop on c8? The Slav is one long answer to it.", 'd4 — center pawn, opens the bishop\'s diagonal.'],
  ["…d5 — you put a pawn right opposite theirs. About a quarter of masters choose it here; more start with …Nf6, and the engine rates the two about the same. Look at what it covers: e4. So their e-pawn can't simply step up next to d4.", '…d5 — your share; covers e4.'],
  ["c4 — the Queen's Gambit, about three masters in four. The pawn leans on d5 and stands there with no guard, almost asking to be taken. But your d5 pawn is your stake in the center, so the first job is to back it up. Grabbing on c4 can wait.", 'c4 — leans on d5 from the side.'],
  ["…c6 — and this is the Slav. Here's the whole idea in one move. Both …c6 and …e6 give d5 a second guard, so if they ever take there, a pawn takes back. But …e6 would sit on the diagonal of your bishop on c8 and shut it in. …c6 leaves that road open, so the bishop can come out to f5 or g4 first, and only then does …e6 build the wall behind it. About half of masters play it, and the engine rates it level with …e6.", '…c6 — the Slav: guards d5, frees c8.'],
  ["Nf3 — two masters in three develop this knight first. It covers e5 and gives d4 a second guard alongside the queen. And notice what it doesn't do: their c4 pawn still has no guard. That will matter in a moment.", 'Nf3 — covers e5, guards d4.'],
  ["…Nf6 — nine masters in ten play it, and so does the engine. The knight covers e4, keeping their e-pawn at home, and it makes three guards on d5: the c6 pawn, the queen and now the knight.", '…Nf6 — covers e4, third guard on d5.'],
  ["Nc3 — a little over half of masters bring out the second knight. Now d5 is hit twice, and the knight covers e4 too, so the e-pawn push is in their plans. But look at c4 again: still no guard. With both their knights out, it's time to ask whether you can take that pawn.", 'Nc3 — two hits on d5 now.'],
  ["…dxc4 — so you take it. About three masters in ten do, and the engine rates it best. The pawn had no guard, and if they're careless, …b5 holds on to it. Either way they now spend time getting it back, and you spend that time on the move this opening is built for: your bishop comes out before …e6. Half of masters play …e6 here instead, and that's the Semi-Slav.", '…dxc4 — grab it; …b5 may hold it.'],
  ["a4 — nine masters in ten play it. Why spend a move on a rook's pawn? Because …b5 was coming to hold your extra pawn, and now a4 is ready to take on b5. There's a price, though. The a-pawn can never go back to a3, and their c-pawn is gone, so for now no pawn of theirs covers b4. Remember that square.", 'a4 — stops …b5, gives up b4.'],
  ["…Bf5 — and here's the payoff of …c6. The bishop walks out to f5 while its diagonal is still open, before …e6 can close it. Eight masters in ten play it, and the engine agrees. From f5 it covers e4, the very square their e-pawn wants.", '…Bf5 — the bishop gets out first.'],
  ["e3 — a little under half of masters play it, about as many as jump Ne5. The pawn opens a road for their bishop on f1, and that bishop now hits your c4 pawn, which nothing of yours guards. So the extra pawn is going back. That's fine: you took it for time, not to keep it, and your bishop is already out.", 'e3 — opens f1 bishop; c4 will fall.'],
  ["…e6 — almost every master plays it, and now it costs you nothing. The bishop is already outside on f5, so this pawn shuts nothing in. Instead it covers d5, guards the bishop on f5, and opens the diagonal for your other bishop on f8. Don't try to hold c4; finish your development.", '…e6 — the wall goes up behind f5.'],
  ["Bxc4 — almost every master takes back, and material is level. Their bishop on c4 now looks at your e6 pawn, which the f7 pawn and your bishop on f5 both guard. So where does your other bishop belong? Think back to the square a4 gave up.", 'Bxc4 — level again, aimed at e6.'],
  ["…Bb4 — there's b4, the square no pawn of theirs covers. Over nine masters in ten put the bishop on it. It hits the knight on c3 and pins it to their king on e1, and that knight is one of the pieces backing up e4. And a3 to chase it is no longer possible: the a-pawn is already on a4.", '…Bb4 — pins the c3 knight.'],
  ["Castle. Almost every master does, and it also takes care of the pin: with the king gone from e1, your bishop on b4 no longer pins the knight on c3. Next on their list is e4, the push they've been building toward.", 'O-O — king safe, the pin is gone.'],
  ["…Nbd7 — masters split almost evenly between this and castling, and the engine leans toward the knight. From d7 it covers e5 and c5, the two squares your pawn breaks will need one day, …e5 and …c5.", '…Nbd7 — covers e5 and c5.'],
  ["Qe2 — about six masters in ten choose it. Look at what it prepares: the queen guards the bishop on c4 and stands right behind the e3 pawn, ready to back it up when it goes to e4. And when it does, a pawn on e4 will hit your bishop on f5. So what do you do about that now?", 'Qe2 — getting ready for e4.'],
  ["…Bg6 — you answer before the question is asked. The bishop steps back to g6, still on the same diagonal toward e4 and b1, so when e4 comes it doesn't gain them a move. About six masters in ten play it, and it's the engine's choice. That's prophylaxis: fix the problem one move before it exists.", '…Bg6 — steps back before e4 comes.'],
  ["e4 — there it is: two pawns side by side on d4 and e4. It's the engine's best move here, and they are a little better. What does it hit? Nothing, because your bishop already left f5. Your bishop on g6 and knight on f6 both bear on e4, so the pawn needs its guards, the knight on c3 and the queen. Next they'd like e5, kicking your knight off f6.", 'e4 — the big center, e5 next.'],
  ["…O-O — your king is safe and the rook comes to f8. Take stock: your pawns on c6 and e6 hold d5, and both bishops, on b4 and g6, stand outside the pawn chain. That's the Slav setup in full. The fight now is about their center, and above all about who can keep enough guards on e4.", '…O-O — setup complete; the fight is e4.'],
  ["Bg5 — they pin your knight on f6 to your queen on d8. It looks active, but it's a real slip. Count the e4 pawn: their knight on c3 and queen guard it, and your bishop on b4 can take that knight. So after …Bxc3 and bxc3, your bishop on g6 takes on e4 and you're a pawn up. The engine wanted Bd3, giving e4 another guard. After Bg5 you are a little better.", 'Bg5 — a pin, but e4 gets weak.'],
  ["…h6 — you ask the bishop at once: take on f6, or step back? It's natural, but the engine preferred …Bxc3 right away, cashing in on e4 before anything changes. After …h6 the game is about level.", '…h6 — asks the bishop; …Bxc3 was stronger.'],
  ["Bh4 — they keep the pin, the engine's choice here; Bf4 or Bxf6 would be worse. The game is about level. But notice that nothing has changed around e4: …Bxc3, then bxc3, and your bishop on g6 can still take the pawn. Your plan from here: win e4 that way and tuck the bishop back to h7, while your c6 and e6 pawns keep d5 under control.", 'Bh4 — keeps the pin; e4 still weak.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Main Line (a4 Bf5)': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6', 'Bxc4', 'Bb4', 'O-O', 'Nbd7', 'Qe2', 'Bg6', 'e4', 'O-O', 'Bd3', 'Bh5'],
  'Exchange Variation': ['d4', 'd5', 'c4', 'c6', 'cxd5', 'cxd5', 'Bf4', 'Nc6', 'e3', 'Nf6', 'Bd3', 'Bg4', 'Nf3', 'e6', 'Nbd2', 'Bd6', 'Bg3', 'O-O', 'O-O', 'Rc8', 'Rc1', 'Bxg3'],
  'Chebanenko Variation (4...a6)': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'a6', 'e3', 'Bf5', 'Be2', 'e6', 'O-O', 'Nbd7', 'b3', 'Bd6', 'Bb2', 'O-O', 'Rc1', 'Rc8', 'h3', 'Bb8'],
  'Quiet Variation (4.e3)': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'e3', 'Bf5', 'Nc3', 'e6', 'Nh4', 'Bg6', 'Nxg6', 'hxg6', 'Bd3', 'Nbd7', 'O-O', 'Bd6', 'h3', 'O-O', 'Qc2', 'dxc4'],
  'Geller Gambit': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'e4', 'b5', 'e5', 'Nd5', 'a4', 'e6', 'axb5', 'Nxc3', 'bxc3', 'cxb5', 'Ng5', 'Bb7'],
  'Schlechter Variation (...g6 Fianchetto)': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'g6', 'e3', 'Bg7', 'Bd3', 'O-O', 'O-O', 'Bg4', 'h3', 'Bxf3', 'Qxf3', 'e6', 'Qe2', 'Nbd7'],
  'Winawer Countergambit (...e5!?)': ['d4', 'd5', 'c4', 'c6', 'Nc3', 'e5', 'dxe5', 'd4', 'Ne4', 'Qa5+', 'Bd2', 'Qxe5', 'Ng3', 'Nf6', 'Nf3', 'Qd6', 'Qc2', 'Be7', 'O-O-O', 'O-O', 'e3', 'dxe3', 'fxe3', 'Qc7'],
  'Modern Qc2/Qb3 Line': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Qc2', 'dxc4', 'Qxc4', 'Bf5', 'g3', 'e6', 'Bg2', 'Nbd7', 'O-O', 'Be7', 'Nc3', 'O-O', 'Re1', 'Ne4', 'Qb3', 'Qb6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Main Line (a4 Bf5)': [
    ["Bd3 — the engine's first choice, and it solves their biggest problem. Why does e4 matter so much? Your bishop on b4 can take the knight on c3, one of its guards, and then your bishop on g6 would have the pawn. With the bishop on d3, e4 has a guard to spare. Next they'd like e5, driving your knight off f6.", 'Bd3 — guards e4; e5 next.'],
    ["…Bh5 — the engine's choice. The bishop slides along to h5 and pins the knight on f3 to their queen on e2. Why that knight? It's the only piece guarding d4, and it covers e5, the square their pawn wants. The game is about level. Your plan from here: if e5 comes, your knight jumps to d5, a square your c6 and e6 pawns both cover, and the pressure on f3 and d4 stays.", '…Bh5 — pins the f3 knight to e2.'],
  ],
  'Exchange Variation': [
    ["cxd5 — the Exchange Slav, chosen by fewer than one master in ten. They release the tension at once, and it costs them a little: the engine prefers Nc3. The pawn on d5 hits your c6 pawn, so the question is simple: which piece takes back?", 'cxd5 — the Exchange: tension released.'],
    ["…cxd5 — every master takes with the pawn, and it's far better than the alternatives. Why not the queen? After …Qxd5, Nc3 hits it straight away and you lose time. Now the pawns are symmetrical, the c-file is open for both sides, and your bishop on c8 still has its diagonal.", '…cxd5 — pawn takes; open c-file.'],
    ["Bf4 — about three masters in ten bring the bishop out at once, before e3 closes its road. Sound familiar? It's your Slav idea, played from their side. From f4 it looks at your knight on b8. But notice what it left behind: with the bishop gone from c1, nothing guards b2.", 'Bf4 — out early; b2 left unguarded.'],
    ["…Nc6 — seven masters in ten play it, and it's the engine's top choice. With your c-pawn gone, c6 is free for the knight, and from there it hits d4. And remember b2: …Qb6 is now an idea, hitting b2 and d4 together.", '…Nc6 — hits d4; …Qb6 in reserve.'],
    ["e3 — the engine's top choice. The pawn guards d4 and the bishop on f4 at once, and it opens a road for the bishop on f1. Their dark-squared bishop is already outside the chain, so this pawn shuts nothing in.", 'e3 — guards d4 and f4.'],
    ["…Nf6 — the engine's top move. The knight covers e4 and adds a guard to d5 alongside your queen. Now think about your bishop on c8: where does it go before …e6 closes its road?", '…Nf6 — covers e4, guards d5.'],
    ["Bd3 — the bishop aims at your h7 pawn, which your knight on f6 and rook on h8 guard. But look at their king's knight: it's still on g1. That's your chance. With no knight on f3, your bishop can come to g4 and hit their queen on d1.", 'Bd3 — aims at h7.'],
    ["…Bg4 — the engine's top choice. The bishop gets out before …e6, and it hits their queen on d1, so they have to spend their move answering. Your knight on f6 guards it there.", '…Bg4 — out first, hits the queen.'],
    ["Nf3 — the knight steps in between and blocks the attack on d1, but now it's pinned: if it moves, your bishop takes their queen. So the jump to e5 they'd like is off for now.", 'Nf3 — blocks, but pinned to d1.'],
    ["…e6 — only now does the e-pawn move, with your bishop already outside on g4. The pawn gives d5 a third guard and opens the diagonal for your bishop on f8, which is headed for d6 to meet their bishop on f4.", '…e6 — wall up, f8 bishop free.'],
    ["Nbd2 — the knight goes to d2, a quieter square than c3. From there it backs up the pinned knight on f3, so if you ever take on f3, they can take back with a piece and keep their pawns whole.", 'Nbd2 — backs up the f3 knight.'],
    ["…Bd6 — remember the bishop that came out to f4 before e3? Now you offer to trade it. Your bishop on d6 hits it, and if they take, your queen takes back on a good central square. The engine rated …Nh5, chasing that bishop with a knight, a touch higher, but the game is about level.", '…Bd6 — offers the dark-bishop trade.'],
    ["Bg3 — they step back rather than trade on d6, which the engine slightly preferred. So the two bishops still face each other along the diagonal. Who takes first, and when? That question runs through the next few moves.", 'Bg3 — no trade yet; bishops face off.'],
    ["…O-O — your king is safe on g8, and every minor piece of yours is out. What's still at home? The rooks. Before you move one, ask where they belong.", '…O-O — king safe; rooks come next.'],
    ["Castle. Now look at the pawns: they're a mirror image, and the c-file is the only open file on the board. That's where the rooks belong, and it's your move.", 'O-O — mirror pawns, one open file.'],
    ["…Rc8 — so you take the file first. The rook stands behind your knight on c6 for now, and the moment that knight moves, it looks straight down the file toward c2 and c1.", '…Rc8 — first to the open file.'],
    ["Rc1 — they answer on the same file, and the rook now hits your knight on c6. It's safe: the b7 pawn and your rook on c8 both guard it.", 'Rc1 — contests the file, hits c6.'],
    ["…Bxg3 — you settle the bishop question yourself. Once the h-pawn takes back, they have two pawns on the g-file. The engine preferred …Qe7, keeping the tension a move longer; after …Bxg3 the game is about level. Your plan from here: put your queen on d6, double your rooks on the c-file, and press down it toward c2 and c3.", '…Bxg3 — trade bishops; their g-pawns get doubled.'],
  ],
  'Chebanenko Variation (4...a6)': [
    ["…a6 — the Chebanenko, chosen by about one master in six. A rook's pawn, so what's the idea? It covers b5, so your b-pawn can go there with a pawn behind it, hitting c4 and grabbing space on the queenside. And it commits nothing else: your bishop on c8 can still go wherever it's needed.", '…a6 — covers b5, prepares …b5.'],
    ["e3 — a quarter of masters play it, and the engine rates it best. The pawn guards d4 and opens the bishop on f1, which now covers c4, so …dxc4 would just be taken back. The most popular move, c5, is close behind.", 'e3 — solid; c4 now covered.'],
    ["…Bf5 — the Slav bishop comes out before …e6. But this is a different moment: about six masters in ten play …b5 here, the move …a6 was preparing, and the engine prefers …e6. After …Bf5 they are a little better. One cost to notice: with the bishop gone from c8, your b7 pawn has no guard.", '…Bf5 — bishop out; …e6 was better.'],
    ["Be2 — a modest square, played by about one master in ten. It covers c4 and prepares to castle, but it asks your bishop on f5 nothing. The engine wanted Nh4, chasing that bishop, and the most common move, Qb3, goes straight for your unguarded b7 pawn. After Be2 the game is about level.", 'Be2 — modest; Nh4 was stronger.'],
    ["…e6 — now the wall goes up behind the bishop: the pawn guards d5 and your bishop on f5, and frees the bishop on f8. About seven masters in ten play …h6 first, making a retreat square on h7 for the bishop, but the engine rates …e6 a shade higher.", '…e6 — the wall behind your bishop.'],
    ["Castle. About eight masters in ten play Nh4 instead, going after your bishop on f5 with the knight. Keep that jump in mind: it's their main way to bother the bishop, and it keeps coming back in this line.", 'O-O — safe; Nh4 was the masters\' move.'],
    ["…Nbd7 — the last minor piece comes out, covering e5 and c5. The engine prefers …h6 first, so your bishop on f5 has a retreat on h7 before Nh4 arrives; after …Nbd7 the game is about level.", '…Nbd7 — develops; …h6 first was better.'],
    ["b3 — the pawn guards c4 and makes room for their bishop to come to b2. It's slow, though. The engine wanted Nh4 once more, by a good margin, and after b3 the game is about level.", 'b3 — guards c4, but slow.'],
    ["…Bd6 — the engine's top choice. The bishop takes the b8–h2 diagonal and hits the pawn on h2. And now …Ne4, jumping into the center, is in the air.", '…Bd6 — aims at h2.'],
    ["Bb2 — the bishop goes where b3 sent it. For now it sits behind its own knight on c3, guarding it, and once that knight moves, it backs up d4 from a distance.", 'Bb2 — behind the c3 knight.'],
    ["…O-O — your king goes to g8, and your setup is complete: knights on f6 and d7, bishops on f5 and d6, and the c6, d5 and e6 pawns holding the center.", '…O-O — everything developed.'],
    ["Rc1 — the rook comes to the c-file, opposite your c6 pawn, ready if the center opens. Nh4, going after your bishop on f5, was again the engine's preference, but the game is about level.", 'Rc1 — onto the c-file.'],
    ["…Rc8 — you mirror them on the c-file, so your rook is ready too if it opens. The engine preferred …Qe7 or …Ne4; after …Rc8 the game is about level.", '…Rc8 — mirrors on the c-file.'],
    ["h3 — a waiting move that takes g4 away from your knight and gives their king some air. The engine wanted Nh4 yet again; after h3 the game is about level.", 'h3 — waiting; Nh4 was better.'],
    ["…Bb8 — why move a bishop that's already well placed? Because on d6 it could be hit by c5, and on b8 it keeps the same diagonal toward h2, out of the pawn's reach. The engine preferred …Ne4, putting the knight in the center at once; after …Bb8 the game is about level. Your plan from here: jump into e4 with a knight, bring your queen to e7 and a rook to e8, and watch for Nh4 coming after your bishop on f5.", '…Bb8 — dodges c5, keeps the h2 diagonal.'],
  ],
  'Quiet Variation (4.e3)': [
    ["e3 — about three masters in ten choose this quiet move. The pawn guards d4 and opens the bishop on f1, so c4 is covered and …dxc4 would just be taken back. But see what it costs them: the e3 pawn shuts in their bishop on c1. That's the very problem the Slav saves you from.", 'e3 — solid, but shuts in c1.'],
    ["…Bf5 — so you do what their c1 bishop no longer can: get out before the e-pawn moves. About a third of masters play it, more than any other move, and it's the engine's first choice. It even hits their knight on b1, which the rook on a1 guards.", '…Bf5 — out before …e6.'],
    ["Nc3 — over eight masters in ten play it, and it's the engine's top choice. The knight leaves your bishop's line, hits d5 and covers e4. Your bishop on f5 covers e4 as well, so that square is contested.", 'Nc3 — hits d5, covers e4.'],
    ["…e6 — over nine masters in ten build the wall now. Your bishop is already on f5, so the pawn shuts nothing in. It guards d5 and the bishop, and it frees your bishop on f8.", '…e6 — wall up, bishop already out.'],
    ["Nh4 — and here's their answer to your free bishop. The knight goes to the rim, where it hits the bishop on f5. Why spend two moves on that? To win the two bishops. Over eight masters in ten play it, and so does the engine.", 'Nh4 — goes after your bishop.'],
    ["…Bg6 — do you run? Not far. About half of masters keep the bishop on the same diagonal at g6, and four in ten play …Be4. If the knight takes on g6, your h-pawn takes back, and that recapture is where your compensation comes from.", '…Bg6 — let them take it.'],
    ["Nxg6 — about half of masters take at once. The knight on g6 hits your rook on h8 and bishop on f8, but it won't live long: just take it back.", 'Nxg6 — takes the bishop.'],
    ["…hxg6 — take with the h-pawn, the engine's clear choice. Taking with the f-pawn would leave your e6 pawn with no pawn to guard it. So who came out ahead? They have the two bishops. You have a half-open h-file, and your rook on h8 already looks down it at the pawn on h2.", '…hxg6 — opens the h-file for h8.'],
    ["Bd3 — the bishop comes out and hits your g6 pawn, which the f7 pawn guards. Notice where it stands, though: on d3, right where your d-pawn lands if it ever takes on c4. Keep that in mind for later.", 'Bd3 — hits g6, guarded by f7.'],
    ["…Nbd7 — quiet development. From d7 the knight backs up its partner on f6 and watches e5, the square for your …e5 break.", '…Nbd7 — backs up f6, watches e5.'],
    ["Castle. Their king goes to g1, on the side where your h-file is already open. Remember that rook on h8: it's aimed at h2, right next to their king.", 'O-O — king to g1, near your h-file.'],
    ["…Bd6 — and now look at h2. Your bishop hits it, and your rook on h8 covers the square from the far end of the open file, so their king could never take back. That makes …Bxh2 with check a real threat.", '…Bd6 — threatens …Bxh2 with check.'],
    ["h3 — they meet the threat by pushing the pawn out of the way: now h2 is empty and your bishop has nothing to bite on. But the engine preferred g3, blocking the diagonal instead; after h3 the game is about level.", 'h3 — sidesteps; g3 was better.'],
    ["…O-O — the king tucks in behind the f7 and g6 pawns and the rook comes to f8. Your development is finished. What's left is the question in the center: when do you release d5?", '…O-O — king safe, rook to f8.'],
    ["Qc2 — the queen lines up behind the bishop on d3, both on the diagonal toward your g6 pawn. The engine preferred c5, hitting your bishop on d6; after Qc2 the game is about level.", 'Qc2 — lines up on g6; c5 was better.'],
    ["…dxc4 — remember the bishop that stood where your d-pawn would land? Now you take, and the pawn hits it on d3, so it has to move again to take back on c4. The game is about level. Your plan from here: queen to e7 and a rook to c8, then the …c5 break to open the center for your bishop on d6.", '…dxc4 — the d3 bishop must move again.'],
  ],
  'Geller Gambit': [
    ["e4 — the Geller Gambit. Instead of stopping …b5 with a4, they ignore your extra pawn and grab the center with pawns on d4 and e4. Here's the deal they offer: you keep the extra pawn on c4 for now, though their bishop on f1 already hits it, and they get space and fast development. Only about one master in twenty plays it, the engine prefers a4, and after e4 the game is about level.", 'e4 — the Geller Gambit: center for a pawn.'],
    ["…b5 — almost every master holds the pawn this way, and the engine agrees by a wide margin. The b5 pawn guards c4, and your c6 pawn guards b5, so the chain holds. Anything slower and Bxc4 gets the pawn back, with their big center on top.", '…b5 — holds the extra pawn.'],
    ["e5 — two masters in three push, and the pawn hits your knight on f6. That's the gambit's spirit: gain time, take space. But it comes too soon. The engine prefers Be2, and after e5 you are a little better.", 'e5 — hits f6; Be2 was better.'],
    ["…Nd5 — every master answers this way. Where should a kicked knight go? To the center, d5, where your c6 pawn guards it. And look what it hits: their knight on c3, which only the b2 pawn guards.", '…Nd5 — central, hits the c3 knight.'],
    ["a4 — nine masters in ten now strike at b5, the pawn that holds everything together. If b5 falls, c4 falls with it. So do you defend b5 again, or let them take?", 'a4 — strikes at b5.'],
    ["…e6 — three masters in four play it, and so does the engine. You don't defend b5 directly. Instead the pawn gives your knight on d5 another guard and frees your bishop on f8. If they take on b5, you have a strong answer ready.", '…e6 — guards d5, frees f8.'],
    ["axb5 — they take, and material is level for the moment, with your c4 pawn now unguarded. The engine preferred h4; after axb5 you are a little better. Before you recapture, though, look at their knight on c3.", 'axb5 — takes; h4 was better.'],
    ["…Nxc3 — here's the point. Why not …cxb5 at once? Because their knight takes on b5 and later lands on d6 with check. So you take the knight first, and your knight on c3 now hits their queen on d1. They have to deal with that before anything else, and only then do you take on b5.", '…Nxc3 — first the knight, hitting d1.'],
    ["bxc3 — they have to take back; anything else loses far more. Their b-pawn has moved to c3, and the pawn on b5 is still loose.", 'bxc3 — forced; b5 still loose.'],
    ["…cxb5 — now you take back, and the dust settles. You're a pawn up, with pawns on b5 and c4 side by side. What do they have for it? A big pawn on e5, more space, and open lines for their pieces. That's what the gambit bought them, and you are a little better.", '…cxb5 — a clean extra pawn.'],
    ["Ng5 — the knight jumps toward your king and hits three pawns at once: e6, f7 and h7. That's where their play lies, pieces aimed at your kingside. All three pawns are guarded, and you are clearly better.", 'Ng5 — hits e6, f7 and h7.'],
    ["…Bb7 — the bishop takes the long diagonal, the engine's choice by a wide margin. Look how far it reaches: through d5 and e4 all the way to g2, which it pins to their rook on h1. You are a little better. Your plan from here: kick the knight with …h6, bring out your bishop on f8, and push your queenside pawns with …a5.", '…Bb7 — long diagonal, pins g2.'],
  ],
  'Schlechter Variation (...g6 Fianchetto)': [
    ["…g6 — the Schlechter, a rare guest: about two masters in a hundred choose it. You keep the Slav pawns on c6 and d5 and put your dark-squared bishop on g7, the same fianchetto as the Grünfeld, but with the c6 pawn holding d5. They are a little better.", '…g6 — Slav pawns plus a fianchetto.'],
    ["e3 — about three masters in ten play it. The pawn guards d4 and opens the road for the bishop on f1, which now covers c4. The most common move here is cxd5, settling the center first.", 'e3 — solid; c4 now covered.'],
    ["…Bg7 — almost every master plays it, and it's the engine's choice. The bishop sits on the long diagonal. Your knight on f6 blocks it for now, but once that knight moves, the bishop looks straight at d4.", '…Bg7 — long diagonal, toward d4.'],
    ["Bd3 — about three masters in ten put the bishop here; most prefer Be2. From d3 it hits your g6 pawn, which the f7 and h7 pawns guard, and it points at the side where your king is about to go.", 'Bd3 — hits g6, guarded twice.'],
    ["…O-O — nearly every master castles now, and it's the engine's first choice. Your king tucks in behind the bishop on g7, which covers the dark squares around it.", '…O-O — king behind the g7 bishop.'],
    ["Castle. Nine masters in ten do. But notice what's missing: there's no pawn on h3, so nothing of theirs covers g4, and your bishop on c8 can go there. That's why the engine slightly preferred h3 first.", 'O-O — but g4 is open.'],
    ["…Bg4 — about half of masters take that square. The bishop pins the knight on f3 to their queen on d1, and that knight guards d4 and e5, two squares that matter for your …e5 break.", '…Bg4 — pins the f3 knight.'],
    ["h3 — almost every master puts the question to the bishop at once: the pawn hits it on g4. Step back, or take the knight?", 'h3 — asks the bishop on g4.'],
    ["…Bxf3 — nearly every master takes, and the engine agrees by a wide margin. You hand over the bishop pair, but you remove the knight that guarded d4 and e5, and they have to take back with the queen or spoil their pawns.", '…Bxf3 — trade it off.'],
    ["Qxf3 — the queen takes back and keeps their pawns intact. From f3 it hits your d5 pawn and your knight on f6, but both are guarded: d5 is attacked three times and guarded three times.", 'Qxf3 — hits d5 and f6.'],
    ["…e6 — the wall goes up. The pawn gives d5 a fourth guard, so you don't have to count there anymore, and your pawns on c6, d5 and e6 form the same chain as the Semi-Slav, with your light-squared bishop already traded.", '…e6 — fourth guard on d5.'],
    ["Qe2 — the queen steps back to e2, behind the e3 pawn, where it can back up e4 one day. It's one of several quiet moves here, and the game is about level.", 'Qe2 — a quiet regroup.'],
    ["…Nbd7 — the last piece comes out: the knight backs up the one on f6 and covers e5. Every piece of yours is developed, and the game is about level. Your plan from here: queen to c7 and a rook to e8, getting ready for the …e5 break to open the center.", '…Nbd7 — fully developed; …e5 next.'],
  ],
  'Winawer Countergambit (...e5!?)': [
    ["Nc3 — about a quarter of masters bring this knight out before the other one, and it's the engine's first choice. Now d5 is hit twice. But look at e5: with their king's knight still on g1, only the d4 pawn watches it. That opens the door to a bold idea.", 'Nc3 — d5 hit twice; e5 thin.'],
    ["…e5 — the Winawer Countergambit, and only about one master in a hundred dares it. Instead of guarding d5 again, you strike at d4 and offer your e-pawn. What do you give? The pawn on e5, which dxe5 takes. What do you get? After dxe5, your d-pawn jumps to d4 with a hit on their knight, and your queen comes after the e5 pawn with check. The engine rates it close to the main moves; they are a little better.", '…e5 — the countergambit: strike at d4.'],
    ["dxe5 — half of masters take, and so does the engine. You're a pawn down for now, and their c4 pawn is still loose. Tempted to grab it back with …dxc4? That trades queens on d8 with check, and your king loses the right to castle.", 'dxe5 — takes; a pawn down for now.'],
    ["…d4 — every master plays it. The pawn jumps past and hits the knight on c3, so they have no time to settle: the knight must move first.", '…d4 — hits the knight on c3.'],
    ["Ne4 — almost every master puts the knight in the center rather than back on b1. But look what's left behind: nothing guards their pawn on e5 now. Can you reach it with check?", 'Ne4 — central, but e5 unguarded.'],
    ["…Qa5+ — yes. The queen gives check along the diagonal to e1, and on the same move it hits the e5 pawn along the fifth rank. They have to answer the check first, and then the pawn falls.", '…Qa5+ — check, and hits e5.'],
    ["Bd2 — the bishop blocks the check and hits your queen on a5. Can it take next move? No: the bishop is pinned to their own king on e1, so your queen is safe, and e5 is still there for the taking.", 'Bd2 — blocks; pinned, can\'t take.'],
    ["…Qxe5 — the pawn comes back and material is level. The queen now hits their knight on e4, which nothing guards, and it keeps your d4 pawn covered. They are still a little better, but your pawn on d4 is a thorn in their position.", '…Qxe5 — pawn back, hits e4.'],
    ["Ng3 — the knight steps back to g3, out of the queen's reach. And notice their e2 pawn: your queen on e5 pins it to their king on e1, so it can't move up to challenge d4 just yet.", 'Ng3 — retreats; e2 is pinned.'],
    ["…Nf6 — the knight comes out and covers e4 and d5, and the queen keeps the pin on the e-file. Development first; the pin holds e2 back for now.", '…Nf6 — develops; e2 stays pinned.'],
    ["Nf3 — and now the knight hits your queen on e5, and your d4 pawn as well. The queen has to move, and wherever it goes, it should keep an eye on d4.", 'Nf3 — hits your queen and d4.'],
    ["…Qd6 — the engine's top choice. The queen steps back to d6, where it guards the d4 pawn from behind and hits their knight on g3. …Qe7 or …Qc5 would be worse.", '…Qd6 — guards d4, hits g3.'],
    ["Qc2 — the queen lines up on the diagonal toward your h7 pawn, and it clears the way for castling long. That's their plan: king to c1, a rook on d1, and pressure on your d4 pawn.", 'Qc2 — toward h7, long castling next.'],
    ["…Be7 — the bishop develops so you can castle. The engine prefers …c5 first, giving your d4 pawn a pawn to lean on; after …Be7 they are a little better.", '…Be7 — castling next; …c5 was better.'],
    ["Castling long, the engine's top move. Their king goes to c1 and the rook lands on d1, right behind the bishop on d2. Once that bishop moves, the rook looks straight up the file at your d4 pawn.", 'O-O-O — rook to d1, behind d2.'],
    ["…O-O — your king goes to g8, the engine's first choice, so the kings now sit on opposite wings. Keep your eye on their rook on d1: it's the piece aimed at your d4 pawn.", '…O-O — kings on opposite wings.'],
    ["e3 — remember the pin on e2? Your queen has left the e-file, so the pawn is free at last, and it hits d4 straight away.", 'e3 — free at last, hits d4.'],
    ["…dxe3 — you take, and the pawn on e3 hits their bishop on d2 and the f2 pawn. It won't live long there, but it makes them choose how to take back, and the choice matters.", '…dxe3 — hits d2 and f2.'],
    ["fxe3 — they take with the f-pawn, and that's a real concession: the engine much preferred Bxe3. After fxe3 the game is about level. Why? Their pawn on e3 now stands alone, with no pawn on the d- or f-file to guard it, and the d-file is open from their rook to your queen, with only their bishop in between.", 'fxe3 — isolated e3; Bxe3 was better.'],
    ["…Qc7 — why move the queen now? On d6 it stood on the open d-file, and the moment their bishop on d2 stepped aside, the rook on d1 would hit it. On c7 it's off the file and still aimed at their knight on g3. The game is about level. Your plan from here: bring your knights to g4 and a6, with the lonely pawn on e3 and the squares around it as your targets.", '…Qc7 — off the d-file, aims at g3.'],
  ],
  'Modern Qc2/Qb3 Line': [
    ["Qc2 — about one master in twenty brings the queen out this early. It guards c4 along the file and aims down the diagonal at your h7 pawn. The engine prefers Nc3; after Qc2 the game is about level.", 'Qc2 — guards c4, aims at h7.'],
    ["…dxc4 — over four masters in ten take, and the engine rates it about as highly as …g6. Yes, the queen takes back, but that's a second queen move this early, and your bishop on c8 is ready to come out next.", '…dxc4 — makes the queen move again.'],
    ["Qxc4 — the queen takes back, the engine's choice, and now it hits your pawns on c6 and f7. Both are guarded: c6 by the b7 pawn and your knight on b8, f7 by your king.", 'Qxc4 — hits c6 and f7.'],
    ["…Bf5 — seven masters in ten play it, and so does the engine: the Slav bishop gets out before …e6. It even hits their knight on b1. One thing to file away: with the bishop gone from c8, your b7 pawn has no guard.", '…Bf5 — out first; b7 now unguarded.'],
    ["g3 — the engine's top move. They prepare a fianchetto: the bishop heads for g2, on the long diagonal that runs all the way to your rook on a8.", 'g3 — the bishop heads for g2.'],
    ["…e6 — with your bishop already outside, the e-pawn moves without closing anything. It guards the bishop on f5, covers d5 and frees your bishop on f8.", '…e6 — guards f5, frees f8.'],
    ["Bg2 — the bishop takes the long diagonal. Their own knight on f3 blocks it for now, but if that knight moves, the bishop looks down at your c6 pawn, with b7 and the rook on a8 behind it.", 'Bg2 — long diagonal, behind the f3 knight.'],
    ["…Nbd7 — the engine's first choice. The knight develops toward the center and covers e5, the square their knight on f3 would like to jump to.", '…Nbd7 — covers e5.'],
    ["Castle. The engine preferred Qb3 first, hitting your b7 pawn, which nothing guards now that your bishop has left c8. After castling the game is about level.", 'O-O — safe; Qb3 was stronger.'],
    ["…Be7 — modest but solid, and the engine's top choice. The bishop clears f8 so your king can castle next.", '…Be7 — castling next.'],
    ["Nc3 — the last minor piece comes out, covering e4 and b5. Now look at e4: it's the square their e-pawn wants, and your bishop on f5 and knight on f6 are standing guard over it.", 'Nc3 — covers e4 and b5.'],
    ["…O-O — your king is safe, and every piece of yours has a square. Where is your play? Look again at e4: it's where their pawn wants to go, and it's where your knight can go first.", '…O-O — king safe; e4 is the square.'],
    ["Re1 — the engine's choice. The rook lines up behind the e2 pawn, so when it goes to e4, the rook backs it up. They're getting ready to take the center.", 'Re1 — preparing e4.'],
    ["…Ne4 — you take the square before their pawn can. The knight sits on e4, guarded by your bishop on f5, and hits their knight on c3 and the pawns on f2 and g3. With your knight there, their e-pawn can't come to e4.", '…Ne4 — takes e4 first.'],
    ["Qb3 — there's the move in this line's name: the queen goes after your b7 pawn, which nothing guards, and it hits e6 too.", 'Qb3 — goes after b7.'],
    ["…Qb6 — the engine's choice. You meet queen with queen: b7 is guarded now, and your queen hits theirs on b3 and their d4 pawn, which only the knight on f3 guards. The game is about level. Your plan from here: put a rook on d8, keep the knight on e4, and if their knight goes to h4 to hit your bishop, take it with your bishop on e7 and leave them doubled h-pawns.", '…Qb6 — guards b7, offers the trade.'],
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

export const SLAV_DEFENCE_WATCH: WatchCourse = {
  openingId: 'slav-defence',
  title: 'Slav Defence — A Master Class',
  orientation: 'black',
  sources: ['concept:pos-center', 'concept:pos-development', 'concept:pos-prophylaxis', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Slav_Defense'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
