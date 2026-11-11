// The Philidor Defence — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet
// (`LESSON_FACTS=1 LESSON_IDS=philidor-defence`): masters' percentages, engine
// lines at a fixed depth, the board after each move, and every fact the app's
// teaching computers found on the move. Standard: docs/OPENING-WATCH-BEATS.md,
// said in the think-out-loud register (§2a). The student plays Black. One
// story runs through every line: the pawn on e5. …d6 guards it with a pawn,
// …Nbd7 guards it a second time, and from then on the question is when to let
// it go (…exd4, for the half-open e-file and the …Re8 / …Bf8 regrouping) and
// when to hit back in the center with …d5, which …c6 gets ready. The sheet
// has them a little better on most of these boards, and the beats say so.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'Nbd7', 'Bc4', 'Be7', 'O-O', 'O-O', 'Re1', 'c6', 'a4', 'b6', 'Be3', 'Bb7', 'Qd2', 'd5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — they open with the king's pawn, the masters' most common first move, a bit under half their games. It takes the center and opens lines for their pieces. So how do you meet it? You're going to answer in kind, with a pawn on e5. And then this whole opening is about one question: how do you hold that pawn?", 'e4 — they take the center.'],
  ["…e5 — you meet the pawn head on and take your share of the center. About a quarter of the masters play this, and the Sicilian, …c5, is their most common reply. Keep your eye on this pawn on e5. It's the first thing their pieces will go after.", '…e5 — your share of the center.'],
  ["Nf3, nine masters in ten, and here it comes: the knight develops and hits your pawn on e5, which nothing guards yet. So the question is on the board already. How do you defend e5?", 'Nf3 — hits your pawn on e5.'],
  ["Here's the Philidor: …d6. Nearly nine masters in ten guard e5 with the knight, …Nc6, and the engine prefers that too. You guard it with a pawn instead, and e5 and d6 make a small chain that's very hard to break. The opening is named after Philidor, the best player of the 1700s, who put the pawns at the heart of the game. The name fits: here the pawns decide what kind of game you get. What does it cost? Room. Your bishop on f8 is shut in behind d6 now, and they are a little better. What do you get? A sound structure with nothing loose in it, an open diagonal for the bishop on c8, and a plan: stay compact, keep e5, and hit back in the center when the moment comes.", '…d6 — the Philidor: a pawn guards e5.'],
  ["d4, nine masters in ten and the engine's first choice. Now count what's on e5. Their knight on f3 and their pawn on d4 both hit it, and only your pawn on d6 guards it. Two against one. So you have a decision to make: take on d4 and let the center go, or find a way to hold e5?", 'd4 — two attackers on e5 now.'],
  ["You hold it, and not by adding a guard. …Nf6 is the engine's first choice: the knight develops and hits their pawn on e4, which nothing guards. So if their pawn takes on e5, your knight takes on e4, and it's pawn for pawn. Two masters in three simply take on d4 here, and that road is the Exchange tab. Fewer than one master in five plays …Nf6.", '…Nf6 — counterattack on e4.'],
  ["Nc3, three masters in four: the knight guards e4, so your counterattack is answered. Now look back at e5. It's still two attackers against one guard, and this time there's nothing of theirs hanging for you to hit back at. So what gives e5 its second guard?", 'Nc3 — guards e4, and e5 needs help.'],
  ["The knight does: …Nbd7, nine masters in ten. This knight setup is called the Hanham. Why not bring the bishop out to e7 first? Because the order matters. With only the d6 pawn guarding e5, they take on e5, trade queens on d8, and the knight on f3 wins the pawn. So the knight comes to d7 first. Yes, it stands in front of your bishop on c8. That's a problem for later, and it has a solution.", '…Nbd7 — second guard for e5.'],
  ["Where does their bishop belong? c4, eight masters in ten. Follow its diagonal: it runs through d5, the square your d-pawn dreams of, and ends on f7, a pawn only your king guards. Remember this bishop. Half of what you do from here is about getting it off that diagonal.", 'Bc4 — aims at f7, covers d5.'],
  ["Now the bishop can come out: …Be7, nearly every master. Remember why it had to wait? The knight on d7 holds e5 now, so nothing drops. It's a modest square, behind your own pawn on d6, but the bishop's first job is simple: it clears f8, and you castle next.", '…Be7 — safe now, castle next.'],
  ["They castle, more than eight masters in ten. Their king is tucked away on g1, and the rook comes to f1, one step from the e-file and the pawn on e4.", 'O-O — their king goes to g1.'],
  ["…O-O, nine masters in ten: your king leaves the middle before anything opens. One thing to notice from g8. Their bishop on c4 looks down the diagonal at f7, and your king now stands right behind that pawn, so it's pinned. Nothing comes of it yet. But it's one more reason to want that bishop gone.", '…O-O — king safe, f7 is pinned.'],
  ["Re1, a bit over half the masters: the rook stands behind the pawn on e4. It guards that pawn now, and if the e-file ever opens, the rook is already there. About three masters in ten play a4 first. Keep a4 in mind, because it's coming.", 'Re1 — the rook backs up e4.'],
  ["…c6, the engine's first choice. A small move with two ideas behind it. The first is …b5: a pawn there would hit their bishop on c4 and chase it off the diagonal to f7. The second is the big one: …d5. One day your d-pawn goes forward to strike at e4, and now there's a pawn on c6 to back it up. That break is how the Philidor comes out of its shell.", '…c6 — prepares …b5 and …d5.'],
  ["a4, the engine's first choice, and it's pure prophylaxis. They saw …b5 coming, so they stop it. Count the b5 square now: their a-pawn, their bishop and the knight on c3 all cover it, and you have only the c6 pawn behind it. So the bishop keeps its diagonal, and your first idea is off the table. That leaves the second one.", 'a4 — stops …b5 before it starts.'],
  ["So what about that bishop on c8? Its own knight on d7 blocks the way out. …b6 is the answer: it opens b7, and the bishop will come out there instead. It takes two moves to bring one bishop out, and they are a little better.", '…b6 — b7 for the bishop.'],
  ["Be3 — their last minor piece comes out. The bishop backs up the pawn on d4, and now every piece of theirs is developed. You're one move behind: the bishop on c8 is still at home.", 'Be3 — their last piece comes out.'],
  ["…Bb7, and now your minor pieces are all out too. But what is the bishop doing there? Right now it's looking at the back of your own pawn on c6. It's waiting. The day that pawn moves or gets traded, the long diagonal opens, and the bishop looks straight down it toward e4.", '…Bb7 — waits behind c6.'],
  ["Qd2 — the queen lines up behind the bishop on e3 and connects their rooks. Natural, but it's a slip. The engine prefers Ba2, pulling the bishop back where none of your pawns can reach it. And look at what Qd2 allows: g4. Your knight can jump there and go after the bishop on e3.", 'Qd2 — a slip, Ba2 was better.'],
  ["…d5 — the line doesn't wait for the knight jump. It goes straight for the break, and it hits two things at once: the bishop on c4 and the pawn on e4. This is what …c6 and …Bb7 were building toward. So does it win something? No, and here's the catch. If they take on e5 and you take the bishop on c4, Rad1 lines up their rook and queen against your knight on d7 and the queen behind it, and the piece comes back. Material stays level, and they are a little better. Your plan: step your queen off the d-file to c8, then bring your rooks to the center files.", '…d5 — the break hits c4 and e4.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move no earlier line shares. */
type TabBeats = Array<[string, string]>;

// The Philidor Counter-Gambit (…f5) is not taught (2026-10-28,
// variationTabs.ts): the student is worse than −1.2 on every board of its
// line and losing by its end, and a lesson here would bring its tab back. It
// keeps no lesson, as before.

/** Filed in this order: each tab's beats start where the lines before it end. */
const TAB_LINES: Record<string, string[]> = {
  'Hanham Variation': ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'Nbd7', 'Bc4', 'Be7', 'O-O', 'O-O', 'Re1', 'c6', 'a4', 'a5', 'd5', 'Nc5', 'Bg5', 'Qc7', 'Bxf6', 'Bxf6', 'Nd2', 'Be7', 'Nb3', 'Nxb3'],
  'Nimzowitsch Variation': ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'Nbd7', 'Bc4', 'Be7', 'O-O', 'O-O', 'Qe2', 'c6', 'a4', 'exd4', 'Nxd4', 'Re8', 'Ba2', 'Bf8', 'Qf3'],
  'Exchange Variation': ['e4', 'e5', 'Nf3', 'd6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3', 'Be7', 'Be2', 'O-O', 'O-O', 'Re8', 'f4', 'Bf8', 'Bf3', 'c5', 'Nb3', 'Nc6', 'Re1', 'a5'],
  'Antoshin Variation': ['e4', 'e5', 'Nf3', 'd6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3', 'Be7', 'Be2', 'O-O', 'O-O', 'Re8', 'f3', 'Bf8', 'Be3', 'c6', 'Qd2', 'd5'],
  'Modern d3 Hybrid': ['e4', 'e5', 'Nf3', 'd6', 'd3', 'Nf6', 'g3', 'Be7', 'Bg2', 'O-O', 'O-O', 'Nc6', 'Nbd2', 'Be6', 'Re1', 'Qd7', 'a4', 'a5', 'Nc4', 'Bxc4', 'dxc4', 'Nb4', 'b3', 'Na6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Hanham Variation': [
    ["Here the line turns off: …a5 instead of …b6. Why? Their a-pawn was ready to march on to a5 and squeeze your queenside. Now it's stopped cold on a4. It's a small move, but it means you can't be cramped any further on that wing. They are a little better.", '…a5 — stops their a-pawn.'],
    ["d5 — the pawn pushes on and hits c6. It looks like it gains space, but it lets you off the hook: the engine prefers the quiet h3 and rates d5 far below it. Now it's about level. Why? Look at what the pawn gave up when it left d4. It doesn't attack e5 any more. And it doesn't cover c5 any more. That square is yours now.", 'd5 — hits c6, gives up c5.'],
    ["…Nc5 — and there it goes. From c5 the knight hits the pawns on a4 and e4, and with your pawn on a5 covering b4, it's hard to chase away. It also steps out of your bishop's way at last: the diagonal from c8 to g4 is open. One catch, though. The engine prefers …Nb6, hitting their bishop on c4 straight away, and rates …Nc5 well below it. They are a little better.", '…Nc5 — lands on c5, frees c8.'],
    ["Bg5 — the bishop comes out and hits your knight on f6. Natural, but the engine rates it far below Nd2, the move that gets their knight off f3 before your bishop can pin it from g4. Now it's about level, and you have a choice: put the question to the bishop with …h6, or play the pin.", 'Bg5 — hits f6, Nd2 was better.'],
    ["…Qc7 — the queen adds a guard to c6, the pawn their d-pawn is hitting. Solid, but it misses the moment. The engine prefers …h6, asking the bishop on g5 what it wants, and rates …Qc7 well below it. They are a little better again.", '…Qc7 — guards c6, …h6 was better.'],
    ["Bxf6 — they take the knight and give up a bishop to do it. The engine rates this far below Nd2: it hands you the bishop pair for nothing, and it's about level again. One question left. Which piece takes back on f6?", 'Bxf6 — they give up the bishop.'],
    ["…Bxf6 — the bishop, not the pawn. Taking with the g-pawn would double your pawns on the f-file and strip your king's cover on g7, and the engine rates it more than a pawn and a half worse. With the bishop you keep your pawns whole, and now you have the bishop pair.", '…Bxf6 — bishop takes, pawns stay whole.'],
    ["Nd2 — remember …Bg4, the pin your bishop was waiting for? They step out of it before it lands: the knight steps off f3. From d2 it can go on to b3, toward your knight on c5. You are a little better now.", 'Nd2 — sidesteps the …Bg4 pin.'],
    ["Where does this bishop belong? The engine prefers g5, the active diagonal, where it has twice as many squares. The line plays …Be7 instead. The idea is real: on f6 the bishop stood in front of your f-pawn, and now …f5 can come and hit e4. But it's slower, and it's about level again.", '…Be7 — clears the way for …f5.'],
    ["Nb3 — the knight goes after yours on c5 and offers a trade. It hits your pawn on a5 too, but your rook and your queen both guard that. The engine prefers Bf1, bringing the bishop home first, and you are a little better. So: trade knights, or pull yours back?", 'Nb3 — offers a knight trade.'],
    ["…Nxb3 — you trade. They take back on b3, and what's left is what you wanted: your two bishops, with the center closed for now, and you are a little better. Your plan: tuck the king on h8, play …g6, and then …f5 to open the game for the bishops.", '…Nxb3 — trade, keep the bishops.'],
  ],
  'Nimzowitsch Variation': [
    ["Qe2 — a rarer move, about one master game in twenty. The queen backs up the pawn on e4 and leaves d1 for a rook. But look where it stands: on the e-file. If that file ever opens, a rook of yours on e8 will be staring at it. The engine rates Qe2 well below a4, and it's about level.", 'Qe2 — backs up e4, frees d1.'],
    ["…c6, eight masters in ten. Same move as in the main line, for the same reasons: it gets …d5 ready with a pawn behind it, and it takes b5 away from their bishop. One thing is different this time: their queen is standing on the e-file.", '…c6 — backs …d5, covers b5.'],
    ["a4, eight masters in ten: the same prophylaxis as before. With their pawn on a4, your pawn can't come to b5 and hit the bishop on c4. It's about level, and now it's your move with their queen still on e2.", 'a4 — stops …b5 again.'],
    ["Now you take: …exd4, the engine's first choice, and the masters' most common move here at about a third of their games. Why give up e5 now, after holding it so long? Because of the queen on e2. With your pawn gone from e5, the e-file is half open, and you know what's coming next: a rook to e8, looking down the file at e4 and the queen behind it.", '…exd4 — opens the e-file.'],
    ["Nxd4, every master: the knight takes back, and material is level. It stands well in the middle and hits your pawn on c6, which the b7 pawn guards. But the trade has changed the center. Their pawn on e4 stands alone there now, on a half-open file, with their queen right behind it.", 'Nxd4 — takes back, hits c6.'],
    ["…Re8, nearly eight masters in ten. The rook takes the half-open e-file, just as planned. For the moment your own bishop on e7 is in its way. So what's the next move going to be? The bishop steps aside, and the rook sees all the way to e4.", '…Re8 — the rook takes the e-file.'],
    ["Ba2, a bit over half the masters. Why retreat a bishop that nothing attacks? Because …d5 is in the air, and on c4 the bishop would be hit by it. On a2 no pawn can reach it, and it's still on the same diagonal, aimed at f7. Notice f7, by the way: your rook has left f8, so only your king guards that pawn now.", 'Ba2 — safe from …d5, still on f7.'],
    ["…Bf8, the engine's first choice. The bishop goes home, and look at the e-file: your rook on e8 now hits the pawn on e4, and their queen stands right behind it on e2. That pawn is pinned to the queen. And on f8 the bishop sits beside your king and guards g7.", '…Bf8 — the rook pins e4.'],
    ["Qf3 — the queen steps off the e-file, so the pin on e4 is over. And it lines up on your knight on f6. So can that knight just take on e4? No, and this is the trap in the position. The knight on f6 is the only thing standing between their queen and f7. The moment it leaves, Qxf7 is check, backed up by the bishop on a2. Your king has to go to h8, and Qg8 is mate. So the knight stays. It's about level. Your plan: hit the queen with …Ne5, then get …d5 in when it's safe.", 'Qf3 — unpins e4, and …Nxe4 gets mated.'],
  ],
  'Exchange Variation': [
    ["…exd4 — two masters in three take here. It's the other answer to the pressure on e5: stop guarding the pawn and trade it off. What do you get? No more worries about e5, a half-open e-file for a rook, and easy squares for your pieces. What do you give? The center. Their pawn stays on e4, the only pawn left in the middle, and yours on d6 just watches it. They are a little better.", '…exd4 — trade e5, open the e-file.'],
    ["Nxd4, more than eight masters in ten. The knight takes back and settles in the middle, where it covers e6 and f5, two squares your bishop on c8 would like. About one master in seven takes with the queen instead.", 'Nxd4 — a knight in the center.'],
    ["…Nf6, more than eight masters in ten and the engine's first choice. Same idea as in the main line: develop with a threat. The knight hits their pawn on e4, and right now nothing guards it.", '…Nf6 — hits the loose e4 pawn.'],
    ["Nc3, nearly every master. The knight guards e4, and it had to come first. Bring the bishop out to e2 instead, and your knight simply takes the pawn.", 'Nc3 — guards e4 first.'],
    ["…Be7, more than nine masters in ten. Nothing fancy: the bishop comes to e7 so you can castle. With the e-file half open, your king shouldn't sit on e8 a move longer than it has to.", '…Be7 — clears the way to castle.'],
    ["Where does their bishop go? The masters split three ways here, between Be2, g3 and Bf4, and the engine prefers Bf4, where the bishop aims at your pawn on d6. Be2 is the quiet choice. Why not a more active square? On c4 your d-pawn can kick the bishop, and on b5 your c-pawn can. On e2 nothing bothers it, and they castle next.", 'Be2 — the quiet square, castle next.'],
    ["…O-O, nearly every master. Your king is safe on g8, and your rook is free. Remember the half-open e-file you got from …exd4? That's where the rook is going.", '…O-O — king safe, rook next.'],
    ["They castle short, more than eight masters in ten, and it's about level. Take a look at your bishop on e7 while it's quiet. It looks stuck, and the reason is your own pawn on d6. The day that pawn moves, the bishop comes to life.", 'O-O — about level, your e7 bishop waits.'],
    ["…Re8, seven masters in ten. The rook takes the half-open file. It's behind your own bishop for now, so hold that thought: when the bishop steps back to f8, the rook will be looking straight at e4.", '…Re8 — the rook takes its file.'],
    ["f4 — and here's their plan: e5. With the f-pawn beside it, the e-pawn can push on, hit your knight on f6 and take over the center. It's ambitious, and it costs them something. That pawn was part of their king's cover, and pawns don't move backward. So how do you stop e5?", 'f4 — wants e5, loosens the king.'],
    ["…Bf8 — the regrouping. The bishop steps back, and your rook on e8 sees all the way down the file. That's what stops e5: push the pawn there now and your d-pawn takes it, with the rook right behind. And look at e4 itself. Your knight and your rook both hit it, and only the knight on c3 guards it. It's their move, though, and they are still a little better.", '…Bf8 — now the rook hits e4.'],
    ["So e4 needs a second guard, and Bf3 is the engine's clear first choice: two attackers, two guards. They had to do it right now. A slower move, Nb3 say, and your knight takes on e4 and wins a pawn. Now if the knight takes, it's just a knight lost for a pawn.", 'Bf3 — a second guard for e4.'],
    ["…c5, the engine's first choice. e4 is covered, so you go after the piece in the middle instead: the pawn hits the knight on d4, and it has to move. You gain time, and space on the queenside. There is a price, and it's worth seeing clearly: d5 is now a square none of your pawns can ever cover.", '…c5 — kicks the knight off d4.'],
    ["Nb3 — the knight has to go somewhere, and it picks b3, where it hits your pawn on c5. Your d6 pawn guards that, so nothing drops. Remember this knight on b3. It's a long way from the center now, and your a-pawn can come and bother it.", 'Nb3 — retreats, hits c5.'],
    ["…Nc6, the engine's first choice. Why c6 and not d7? On d7 the knight would stand in front of your bishop on c8, the old Philidor problem. On c6 it covers d4, so their knight can't come back there, and it covers e5, so that pawn push is held up again.", '…Nc6 — covers d4 and e5.'],
    ["Re1 — a third guard for e4, and their rook now faces yours down the e-file. It's about level. One line to know before you break in the center: on …d5 they push e5 and hit your knight on f6, and you answer with …c4, kicking their knight on b3.", 'Re1 — a third guard for e4.'],
    ["…a5 — remember the knight on b3? Here comes the pawn after it: …a4 would kick it again. It's about level. Your plan: if they stop your pawn with a4, drop the knight into b4, then bring the bishop out to d7 and finish developing.", '…a5 — …a4 next, chasing the knight.'],
  ],
  'Antoshin Variation': [
    ["f3 — the solid way. Instead of pushing the f-pawn two squares and dreaming of e5, they put it right under e4 as a guard, and it takes g4 away from your bishop on c8. Safe, but it asks you no questions, and it's about level.", 'f3 — props up e4, covers g4.'],
    ["…Bf8 — the regrouping again: the bishop steps back and your rook looks down the e-file. But here it runs into a wall. With a pawn on f3, e4 is solid, and there's nothing on the file for the rook to win. So the rook does less in this line, and you'll need a pawn break to get anything going. It's about level.", '…Bf8 — the rook meets a solid e4.'],
    ["Be3 — their last minor piece comes out, right behind the knight on d4. Everything of theirs is developed, and it's about level. Now, what's your pawn break? You've seen it in every line of this opening.", 'Be3 — every piece is out.'],
    ["…c6 — and here's the preparation. The pawn backs up d5, so when your d-pawn goes forward it has support. It also takes b5 away from their knights.", '…c6 — backs up …d5.'],
    ["Qd2, the engine's first choice. The queen lines up behind the bishop on e3 and leaves d1 for a rook. They're fully set up now. If you're going to break in the center, this is the moment.", 'Qd2 — clears d1 for a rook.'],
    ["…d5 — the break. Count e4: your pawn, your knight on f6 and your rook on e8 all hit it, three attackers against two guards, the knight on c3 and the pawn on f3. So they have to trade. And look at your bishop on f8: with the d-pawn out of its way, its diagonal runs all the way to a3. It's about level, no more than that. Your plan: take back on d5 with the knight, trade a pair of knights there, and bring your other knight out to d7.", '…d5 — the break, three on e4.'],
  ],
  'Modern d3 Hybrid': [
    ["d3 — they don't take up the fight. Nine masters in ten play d4 here, and the engine prefers it. d3 just guards e4 and opens the diagonal for the bishop on c1. So nothing attacks e5 a second time, your little chain stands untouched, and it's about level already.", 'd3 — no d4, no pressure on e5.'],
    ["…Nf6 — the knight comes to its natural square. It hits e4, which the pawn on d3 guards, and it adds its weight to d5, the square your d-pawn would like to reach one day.", '…Nf6 — develops, backs up d5.'],
    ["g3, about half the masters who get here, and the engine's first choice. The bishop is going to g2. Add a knight on d2 and a rook on e1 and you have the King's Indian Attack: a quiet setup that commits to nothing in the center yet.", 'g3 — the bishop goes to g2.'],
    ["…Be7 — the bishop goes to its usual Philidor square, e7, and it clears f8 so you can castle next. Nothing fancy is needed yet. It's about level.", '…Be7 — the usual square, castle next.'],
    ["Bg2 — the bishop takes the long diagonal. For now it's looking at the back of its own knight on f3, with the pawn on e4 behind that. It's a piece for later: when those two move, the diagonal opens toward your queenside.", 'Bg2 — the long diagonal, for later.'],
    ["…O-O, the engine's first choice. Your king goes to g8. Nothing is attacking anything yet, so both sides simply finish their setups.", '…O-O — king safe on g8.'],
    ["They castle too. Compare the two sides: their pawns on e4 and d3, yours on e5 and d6. It's close to a mirror. Nobody is attacking, so the game will be decided by where the pieces go from here.", 'O-O — close to a mirror.'],
    ["…Nc6 — here the knight goes to c6, not d7. Why the difference from the main line? There the knight was needed on d7 to guard e5 against the pawn on d4. Here nothing attacks e5, so it takes the more active square. From c6 it covers d4, the square their d-pawn would like to reach.", '…Nc6 — active square, covers d4.'],
    ["Nbd2 — the knight develops behind its own pawns, and it has a route in mind: c4. One cost of Nbd2: their bishop on c1 is shut in behind it for now. It's about level.", 'Nbd2 — heading for c4.'],
    ["…Be6 — your last minor piece, and look how easily it came out. No knight on d7 in its way this time. From e6 the bishop watches c4, the square their knight is heading for, and it backs up d5 for your pawn.", '…Be6 — watches c4, backs up d5.'],
    ["Re1 — the rook stands behind the pawn on e4, the same move as in the main line. It guards the pawn, and it clears f1, a square the knight on d2 can use.", 'Re1 — backs up e4, clears f1.'],
    ["…Qd7 — the queen steps up behind the bishop on e6, and your rooks are connected. There's an idea in lining them up on that diagonal: …Bh3, offering to trade off their bishop on g2, the piece that guards their king.", '…Qd7 — rooks connected, …Bh3 an idea.'],
    ["a4 — space on the queenside. The pawn covers b5, so when their knight lands on c4, you can't chase it away with …b5. So what do you do about a pawn like that?", 'a4 — space, and b5 is covered.'],
    ["…a5 — you stop it in its tracks. Their pawn is fixed on a4 now, and notice the color of that square: light, the color of your bishop on e6. A pawn that can't move, on your bishop's color, is something to aim at later.", '…a5 — fixes their pawn on a4.'],
    ["Nc4 — there's the square the knight wanted. It hits three of your pawns at once, on a5, d6 and e5. All three are guarded, so nothing drops. But it's a strong post, and with the knight watching e5, the push d4 is their next idea. One thing in your favor: your bishop on e6 is looking right at it.", 'Nc4 — hits a5, d6 and e5.'],
    ["…Bxc4 — you take the knight, and when the d-pawn takes back, their c-pawns are doubled. That's a real gain. But count the cost too. You've given up the light-squared bishop, the one that was going to aim at a4, and they keep both of theirs. You've traded one kind of advantage for another, and it's about level.", '…Bxc4 — doubles their pawns, costs a bishop.'],
    ["dxc4 — the only way to take back. So here's the picture: they have doubled pawns on c2 and c4, and they have the two bishops. Now look closer at the pawn on c4. It covers d5, the square your d-pawn wanted, and the d-file is half open for their rooks, leading to your pawn on d6. Doubled pawns aren't always weak. Sometimes they do a job.", 'dxc4 — doubled pawns that cover d5.'],
    ["…Nb4 — the knight jumps in behind their a-pawn and hits c2. Their queen guards that pawn, so it's not a threat yet. So what is the knight doing there? Two things. If they kick it with c3, it drops back to a6. And it has stepped off c6, so your c-pawn is free to go there and cover d5 again.", '…Nb4 — hits c2, frees the c-pawn.'],
    ["b3 — the pawn guards c4, and it opens a3 for the bishop on c1. From a3 that bishop would look down the diagonal toward your pawn on d6.", 'b3 — guards c4, opens a3.'],
    ["…Na6 — a step back, but it isn't a retreat: the knight is on its way to c5. Why not back to c6? There it would block your c-pawn again. On c5 the knight will hit e4 and stand in front of their doubled pawns, and it's hard to chase: their d-pawn is gone, and your pawn on a5 covers b4. They are a little better for now. Your plan: bring the knight to c5, the queen to e6 to lean on c4, and hold it all together with …b6.", '…Na6 — heading for c5.'],
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

export const PHILIDOR_DEFENCE_WATCH: WatchCourse = {
  openingId: 'philidor-defence',
  title: 'Philidor Defence — A Master Class',
  orientation: 'black',
  sources: ['book:philidor-defence', 'concept:pos-center', 'concept:pos-prophylaxis', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Philidor_Defence'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
