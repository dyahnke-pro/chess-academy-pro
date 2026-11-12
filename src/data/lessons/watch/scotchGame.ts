// The Scotch Game — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=scotch-game`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move, the app's teaching computers, and (pass two) the second and third
// order: where each move's engine line goes, the squares a pawn move gives up
// for good, what club players get wrong. Said the way Naroditsky teaches in
// his speedruns (the Danya style sheet): the lead spread by moment, their
// moves judged and answered, one idea followed past the board, numbers only
// where they are the lesson. The student plays White. One idea runs through
// every line: d4 strikes at e5 at once, the center opens, and a knight lands
// on d4. Their bishop or knight goes after that knight, and the fights are
// about who holds d4 and what the trades leave behind: doubled c-pawns in the
// main line and the Mieses, the pawn on d5 in the Schmidt, opposite-side
// kings in Kasparov's Nb3, and the gambits that hand over a pawn for time.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6', 'c3', 'Nge7', 'Bc4', 'O-O', 'O-O', 'd6', 'Nxc6', 'Nxc6', 'Bxc5', 'dxc5', 'f4', 'Be6', 'Bb5', 'Rad8', 'Qe2', 'Bc8', 'Nd2', 'a6', 'Ba4', 'b5', 'Bc2', 'c4', 'e5', 'Qh6', 'Ne4', 'Kh8', 'Ng5', 'g6', 'Ne4', 'Bf5', 'Nf6', 'Bxc2', 'Qxc2', 'Ne7', 'Rf3', 'Qg7', 'g4', 'Nd5', 'g5', 'Nxf6'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 takes a central square and opens lines for your queen and the bishop on f1. Keep one square in mind from the very start: d4. Your d-pawn is going there soon, and the whole Scotch is built on that push.", 'e4 — the center, and d4 soon.'],
  ["…e5: pawn meets pawn, and their bishop on f8 can come out. But that pawn on e5 has no guard yet, and your next two moves both go straight at it, first a knight and then a pawn.", '…e5 — pawn meets pawn.'],
  ["A developing move that makes a threat is the best kind. Nf3 comes out and hits the pawn on e5 at once. Why not e2 for the knight? There it would block your bishop on f1. Their next move has to look after e5.", 'Nf3 — develops and hits e5.'],
  ["Guard e5, or hit back at e4? …Nf6 would counterattack and leave e5 hanging. …Nc6 guards it instead, with a piece that wanted to come out anyway. Now the big decision is yours.", '…Nc6 — guards e5, develops.'],
  ["The fork in the road: the Ruy Lopez and the Italian keep the tension with a bishop move. d4 releases it now. Your pawn and your knight both hit e5, only their knight guards it, so they take, and the center opens before anyone has castled.", 'd4 — the Scotch: strike at e5 now.'],
  ["…exd4, and there's really no alternative: holding with …d6 leaves them cramped and rates well below it. Now, how do you take back? With the knight is the main line. Leave the pawn a little longer and you have the gambits, Bc4 or c3, on their own tabs.", '…exd4 — takes, the center opens.'],
  ["Nxd4: the knight takes back and stands in the middle of the board, and material is level. Why not the queen? Qxd4 would drop it to …Nxd4. The knight on d4 is your best piece now, and also the first thing they'll go after.", 'Nxd4 — a knight in the center.'],
  ["Most club players trade on d4 here, and it's a mistake: …Nxd4 just brings your queen to the center with Qxd4. …Bc5 is the Classical instead, and it counts: their bishop and knight both hit your knight on d4, and only your queen guards it.", '…Bc5 — two attackers on d4.'],
  ["Two ways to meet the hit. Nb3 steps away with a hit on the bishop, Kasparov's line on its own tab. Be3 holds your ground: a second guard for the knight, two against two. If they ever take on d4, the bishop takes back and the post stays yours.", 'Be3 — guards d4, two on two.'],
  ["…Qf6 is the point of …Bc5: the queen adds a third attacker on d4, and it guards their knight on c6 too. Count it: three hits, two guards. Do nothing, and your knight falls.", '…Qf6 — a third attacker on d4.'],
  ["c3 makes it three guards against three. Why not Bc4 first, the natural developing move? Then …Bxd4 comes and the knight on d4 simply drops. The price of c3 is quiet but permanent: no pawn of yours can cover d3 again, and their knight could reach it through e5.", 'c3 — a third guard, first.'],
  ["Their knight can't go to f6, where their own queen stands, so it comes to e7. From there it backs up the knight on c6, keeps your knight off f5, and clears their king's road to castle.", '…Nge7 — f6 is taken, so e7.'],
  ["Bc4 develops toward f7 and clears your king's road to castle. If their knight jumps to e5 to hit it, there's no need to panic: Be2 steps back, and you castle next move.", 'Bc4 — eyes f7, castle next.'],
  ["…O-O tucks their king away, and look what your bishop does now: it pins the f7 pawn to that king. While the pin holds, the f-pawn can't step forward to help on the kingside.", '…O-O — f7 is pinned to the king.'],
  ["You castle too, and now look a few moves ahead. Once …d6 comes, you trade on c6, then the bishops on c5, and their d-pawn has to take back. That leaves doubled c-pawns and an open d-file, the structure this whole game runs on.", 'O-O — king safe, the trades come next.'],
  ["…d6 frees the bishop on c8 and props up the bishop on c5. The cost is behind it: the knight on c6 just lost two guards, the pawn that left d7 and the queen, whose sixth rank now runs into d6. That's what lets you start trading.", '…d6 — frees c8, loosens c6.'],
  ["Now the trades begin: Nxc6. Your knight hits theirs on e7 as well, so they must take back. Then your bishop faces theirs on c5, with only the d6 pawn to recapture, and you know where that leads.", 'Nxc6 — the trades begin.'],
  ["Taking with the b-pawn rates far worse for them, so the knight from e7 takes back. Now your bishop on e3 looks straight at theirs on c5, and only the d6 pawn can recapture.", '…Nxc6 — the knight takes back.'],
  ["Bxc5 is a trade that buys something. Only the d6 pawn can take back, and once it does, their c-pawns are doubled and the d-file opens. Before any trade, ask what the recapture does to their pawns.", 'Bxc5 — a trade that doubles pawns.'],
  ["…dxc5, and there's your structure: doubled c-pawns that can't guard each other, and an open d-file. Think ahead to an endgame. Your four kingside pawns can make a passed pawn one day, while their extra queenside pawn is a doubled one, much harder to use. You are a little better.", '…dxc5 — doubled c-pawns, open d-file.'],
  ["f4 starts your kingside plan. With e4 and f4 side by side, the push e5, kicking the queen off f6, becomes a threat you can make later. The price: a pawn never moves back, and your king's cover is a little thinner.", 'f4 — space, e5 comes later.'],
  ["…Be6 develops with a hit on your bishop on c4, which has no guard. And there's a second point: with the bishop out, their rook can come to d8, straight at your queen on d1.", '…Be6 — hits c4, …Rd8 is next.'],
  ["Do you trade on e6? Bxe6 just lets their queen take back. Bb5 sidesteps and hits the knight on c6 instead, which only the b7 pawn guards. And if you ever take there and the b-pawn takes back, their c-pawns are tripled.", 'Bb5 — sidesteps, hits the knight.'],
  ["…Rad8 is what …Be6 was preparing: the rook takes the open d-file and lands opposite your queen on d1. Nothing hangs, but your queen has to move.", '…Rad8 — the d-file, facing your queen.'],
  ["Where does the queen go? Qe2 steps off the file and still works: it backs up e4 and guards your bishop on b5. And if their bishop drops back to d7, Qe3 hits the c5 pawn, the front one of the doubled pair.", 'Qe2 — off the file, guards e4 and b5.'],
  ["…Bc8 looks like a step back, but the bishop wants a better diagonal: from c8 it can jump to g4 and hit your queen on e2.", '…Bc8 — back home, aiming at g4.'],
  ["Nd2 brings out your last minor piece and backs up e4. Look further ahead: once your e-pawn moves on, e4 becomes a square for this knight. Hold that thought until the e5 push.", 'Nd2 — last piece out, e4 later.'],
  ["…a6 puts the question to your bishop on b5. Take on c6, or keep it? Bxc6 now changes nothing for their pawns: the queen would take back, not the b-pawn.", '…a6 — kicks the bishop on b5.'],
  ["Keep it: Ba4 stays on the same diagonal, still eyeing the knight on c6. Dropping back to c4 rates far worse. And if their knight steps away to a5, e5 hits the queen on f6.", 'Ba4 — keeps the bishop, still eyeing c6.'],
  ["…b5 chases the bishop again, and on a4 nothing guards it. Their queenside pawns are rolling, and …c4 is the next step, grabbing space. Where does your bishop go this time?", '…b5 — kicks the bishop again.'],
  ["Why not Bb3? Then …c4 kicks it a third time. On c2 the bishop is safe, and it points down the long diagonal past your e4 pawn toward h7. The moment e4 moves, that diagonal opens on their king.", 'Bc2 — safe, and aimed at h7.'],
  ["…c4 grabs space and takes b3 and d3 away from your pieces. You are clearly better, and it's time for the push your f4 pawn was waiting for.", '…c4 — space on the queenside.'],
  ["Here's the push f4 was built for: e5, with the f4 pawn right behind it. It kicks the queen off f6, and it opens your bishop's diagonal: with e4 empty, the bishop on c2 looks straight at h7.", 'e5 — kicks the queen, opens c2–h7.'],
  ["…Qh6: the queen eyes f4 and h2, but both hold, f4 by the rook and h2 by your king. Careful, though: move the knight from d2 to f3 and the rook no longer guards f4, so …Qxf4 takes it.", '…Qh6 — hits f4 and h2, both hold.'],
  ["Remember the knight that came to d2? Ne4 is its reward: it lands on the square your pawn just left. From there it eyes f6 and g5, and c5, a square no pawn of theirs can ever cover again.", 'Ne4 — onto the square the pawn left.'],
  ["…Kh8 tucks the king into the corner. Tempting now is f5, storming ahead. But then nothing guards e5 any more, and …Nxe5 simply takes it. The f4 pawn's job is to hold e5.", '…Kh8 — the king steps into the corner.'],
  ["Ng5 goes at the king. The knight hits h7 and f7, and h7 now has two attackers, the knight and your bishop on c2, against one defender, their king. You are still clearly better.", 'Ng5 — two attackers on h7.'],
  ["…g6 shuts your bishop's diagonal, but it's a mistake: …Nxe5 was the engine's move, meeting Qxe5 with …f6 against your queen and knight at once. And g6 gives up a square for good: no pawn of theirs can cover f6 again, and your knight is two jumps from it.", '…g6 — a mistake: f6 is weak now.'],
  ["Ne4 drops back, and it's a slip: the engine prefers Qe3. The knight did have a reason, since …f6 was coming to hit it on g5. And from e4 it eyes f6, the square …g6 just gave up.", 'Ne4 — a slip, Qe3 was stronger.'],
  ["…Bf5 hits your knight on e4, but it's guarded twice, by the bishop on c2 and the queen on e2. The real point is the bishops: theirs on f5 and yours on c2 now face each other through your knight.", '…Bf5 — hits e4, the bishops face off.'],
  ["There's the square …g6 gave up: Nf6. No pawn of theirs can ever chase the knight away, the e5 pawn holds it, and it hits h7 beside their king. And with the knight off e4, the two bishops now face each other directly.", 'Nf6 — the knight lands on the hole.'],
  ["…Bxc2 trades off the bishop that had been aimed at h7 since your e5 push. It's the engine's choice, and sensible defence: the fewer attackers near their king, the better. Take back with the queen.", '…Bxc2 — trades off your attacker.'],
  ["Qxc2, and the queen takes over the bishop's diagonal, now hitting g6. Your queen and the knight on f6 both point at their king. You are clearly better.", 'Qxc2 — the queen takes the diagonal.'],
  ["…Ne7 brings the knight back to guard g6, the pawn your queen hits. It also keeps your f-pawn from pushing to f5 for now.", '…Ne7 — guards g6.'],
  ["Rf3 lifts the rook off the back rank, aiming to swing over to h3 and face their queen on h6. That makes three pieces for the attack: queen, knight and rook, all pointed at their king.", 'Rf3 — the rook swings toward h3.'],
  ["…Qg7 gets the queen off h6 before your rook arrives, and it hits the knight on f6. The knight holds, the e5 pawn guards it, but if …Ng8 comes it has two attackers, so it will want a second guard.", '…Qg7 — hits the knight on f6.'],
  ["g4 brings the pawns into the attack: g5 is next, a second guard for the knight on f6. It also keeps their knight off f5. Your own king's cover thins, the usual price of attacking with pawns.", 'g4 — g5 next, backing the knight.'],
  ["…Nd5 jumps to the center and hits three things: your knight on f6, and the pawns on c3 and f4. They don't take on f6 yet, the threat comes first. So, do you take on d5?", '…Nd5 — hits f6, c3 and f4.'],
  ["No: Nxd5 lets their rook take back, and most of your edge is gone. g5 is the answer, a second guard for the knight on f6. And it freezes their h-pawn: …h6 just walks into a capture.", 'g5 — a second guard for f6.'],
  ["…Nxf6, and they trade off your knight. Take back with the e-pawn: a pawn lands on f6 and hits their queen on g7, and you are clearly better. Your plan: once the queen steps away, a rook goes to e1 and on to e7, deep in their camp.", '…Nxf6 — take back with the e-pawn.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move no earlier line shares. */
type TabBeats = Array<[string, string]>;

/** Filed in this order: each tab's beats start where the lines before it end. */
const TAB_LINES: Record<string, string[]> = {
  'Scotch: Classical 4...Bc5 (Be3 Qf6 Main Line)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6', 'c3', 'Nge7', 'Bc4', 'O-O', 'O-O', 'd6', 'Nxc6', 'Nxc6', 'Bxc5', 'dxc5', 'f4', 'Be6'],
  'Scotch: Mieses Variation 4...Nf6 (e5 Push)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nxc6', 'bxc6', 'e5', 'Qe7', 'Qe2', 'Nd5', 'c4', 'Ba6', 'b3', 'g6', 'Ba3', 'd6'],
  'Scotch Gambit (4.Bc4)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Bc4', 'Nf6', 'e5', 'd5', 'Bb5', 'Ne4', 'Nxd4', 'Bd7', 'Bxc6', 'bxc6', 'O-O', 'Bc5', 'Be3', 'Bxd4'],
  'Scotch: Schmidt Variation (4...Nf6 5.Nc3 Bb4)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3', 'Bb4', 'Nxc6', 'bxc6', 'Bd3', 'd5', 'exd5', 'cxd5', 'O-O', 'O-O', 'Bg5', 'c6', 'Qf3', 'Be7', 'Rae1', 'Be6'],
  'Scotch: Göring Gambit (4.c3)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'c3', 'dxc3', 'Nxc3', 'Bb4', 'Bc4', 'd6', 'O-O', 'Bxc3', 'bxc3', 'Nf6', 'e5', 'Nxe5', 'Nxe5', 'dxe5', 'Qb3'],
  'Scotch: 4...Qh4 (Steinitz Variation)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Qh4', 'Nb5', 'Bb4+', 'c3', 'Ba5', 'Nd2', 'a6', 'Na3', 'Bb6', 'g3', 'Qf6', 'Qe2', 'd6', 'Ndc4'],
  'Scotch Four Knights (4...Nf6 5.Nc3 Bb4 6.Nxc6 bxc6 7.Bd3 d5)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3', 'Bb4', 'Nxc6', 'bxc6', 'Bd3', 'd5', 'exd5', 'cxd5', 'O-O', 'O-O', 'Bg5', 'c6', 'Ne2', 'Bd6', 'Ng3', 'h6'],
  "Scotch: Kasparov's Nb3 Line (4...Bc5 5.Nb3)": ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Nb3', 'Bb6', 'Nc3', 'Nf6', 'Qe2', 'd6', 'Be3', 'Bxe3', 'Qxe3', 'O-O', 'O-O-O', 'Be6', 'f3'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The Classical tab is the main line's first 22 moves: every beat is shared.
  'Scotch: Classical 4...Bc5 (Be3 Qf6 Main Line)': [],
  'Scotch: Mieses Variation 4...Nf6 (e5 Push)': [
    ["…Nf6 is the other main answer: the knight develops and hits your e4 pawn, which has no guard. Guard it with Nc3, as in the Schmidt, or trade on c6 first and push e5. That push is the Mieses, and it's this tab.", '…Nf6 — hits your loose e4 pawn.'],
    ["Trade first, push second. Nxc6 hits their queen, so they must take back now, with no time to grab e4. And which pawn takes back? …dxc6 would let the queens come off, so it's the b-pawn, and their c-pawns get doubled.", 'Nxc6 — trade first, hits the queen.'],
    ["…bxc6 takes back toward the center, and the doubled pawn has a use: c6 can support …d5 later. The cost: their a-pawn has no neighbour now. And your e4 pawn is still under attack.", '…bxc6 — doubled c-pawns, e4 still hit.'],
    ["Guard e4 with Bd3, or push past it? e5 is the Mieses: the pawn steps over the attack and kicks the knight off f6. You gain space, and the pawn on e5 becomes the thing they aim at for the rest of the game.", 'e5 — kicks the knight off f6.'],
    ["…Qe7 hits your e5 pawn and pins it to your king. That pawn can't take on f6 now, because stepping off the e-file would leave your king in check. And nothing guards it.", '…Qe7 — pins e5 to your king.'],
    ["Qe2 first. c4, kicking the knight, would be too early: …Qxe5 check just takes the pawn. Your queen steps in front of the king, the pin is gone, e5 has a guard, and taking on f6 is a threat again.", 'Qe2 — breaks the pin, guards e5.'],
    ["…Nd5 is the natural square: the doubled pawn on c6 guards it, so those doubled pawns do have a use. Your next move kicks it anyway.", '…Nd5 — central, guarded by c6.'],
    ["c4 kicks the knight and takes space on the queenside. The cost is permanent: no pawn of yours can cover d3 again, and their knight could reach it through f4. In the Mieses you accept that hole for the space.", 'c4 — space, but d3 is weak now.'],
    ["…Ba6 doesn't move the knight. It pins your c4 pawn to your queen on e2, so if cxd5, their bishop takes the queen. And it clears their king's road to castle long.", '…Ba6 — pins c4 to your queen.'],
    ["b3 gives the c4 pawn a guard, so the pin costs you nothing any more. And it opens a road for your bishop on c1 to a3, where it would hit their queen on e7.", 'b3 — guards c4, frees the c1 bishop.'],
    ["…g6 makes room for their bishop on g7. From there it would aim down the long diagonal at your e5 pawn, a second attacker after the queen.", '…g6 — the bishop heads to g7.'],
    ["Ba3 develops with a hit on their queen on e7, and your knight on b1 guards the bishop. It also lines up on d6: if their d-pawn ever steps up, it would be pinned to the queen.", 'Ba3 — develops, hits the queen.'],
    ["…d6 hits your e5 pawn, but it's a slip: the engine prefers …Nb4. The pawn is pinned, so …dxe5 would drop the queen. Your plan: take on d6 with the e-pawn, hitting the queen so the queens come off, and watch the long diagonal, where a bishop on g7 would hit your rook on a1.", '…d6 — a slip, exd6 trades queens.'],
  ],
  'Scotch Gambit (4.Bc4)': [
    ["Bc4 is the Scotch Gambit. You leave their pawn on d4 for now, aim at f7 and get ready to castle. The pawn comes back later, and if they try to hold it with …Bc5, c3 piles on a third attacker.", 'Bc4 — the gambit, aimed at f7.'],
    ["…Nf6 hits back at once: the knight develops and hits your e4 pawn, which has no guard. Castle now? Then …Nxe4 just takes it. You need a move that deals with e4 first.", '…Nf6 — hits the loose e4 pawn.'],
    ["Not Nxd4 yet: the pawn on d4 isn't going anywhere, and a threat comes first. e5 runs past the attack on e4 and kicks the knight off f6, the same idea as the Mieses push.", 'e5 — threat first, d4 later.'],
    ["…d5 is the main answer: the pawn hits your bishop on c4, which has no guard, and it gives the knight on f6 a home on e4, backed by the pawn. Counterattack beats retreat here.", '…d5 — hits the bishop, frees e4.'],
    ["Bb5 gets the bishop out of the pawn's reach and pins the knight on c6 to their king. Here's why it matters: that knight is the only guard of their d4 pawn. Pin it, and the pawn is yours next.", 'Bb5 — pins the guard of d4.'],
    ["…Ne4 jumps out of the pawn's reach to a central post backed by d5, and from e4 it hits f2. Dropping back to d7 also holds, but on e4 the knight does far more.", '…Ne4 — central knight, hits f2.'],
    ["Now you take the pawn back, and material is level. The knight on c6 is in trouble: pinned to their king, hit by your knight and bishop, and guarded only by the b7 pawn. Your e5 pawn is safe for now, since only that pinned knight hits it.", 'Nxd4 — level, two hits on c6.'],
    ["…Bd7 steps between your bishop and their king, so the knight on c6 is unpinned. And that changes the e5 pawn: the knight really does hit it now, and nothing of yours guards it.", '…Bd7 — unpins, now e5 is hit.'],
    ["So remove the knight: Bxc6. It hits their bishop on d7 and the d5 pawn, so they must take back, and the attacker of e5 is gone. The price is the bishop pair, and if the b-pawn takes back, their c-pawns end up doubled.", 'Bxc6 — removes the knight hitting e5.'],
    ["The pawn or the bishop? Both hold here. …bxc6 takes toward the center and backs up d5, but it leaves doubled c-pawns and a lone a-pawn, the same picture as in the Mieses.", '…bxc6 — doubled c-pawns again.'],
    ["Castle while their king still sits on e8. And look at your plan from here: f3, then f4, chasing their knight around and grabbing space on the kingside.", 'O-O — king safe, f3 and f4 next.'],
    ["…Bc5 develops with a hit on your knight on d4, guarded only by your queen, and clears their king's road to castle. Push f3 at their knight now and it just hops back to g5.", '…Bc5 — hits the knight on d4.'],
    ["Be3 gives the knight a second guard, and it develops. Notice what comes next: once their king castles, Nd2 can challenge the knight on e4 and trade it off.", 'Be3 — a second guard for d4.'],
    ["…Bxd4 is a mistake: the engine prefers …Qe7, piling onto e5. After Qxd4 your queen stands in the center, and you are a little better. Your plan: f3, then f4, chasing their knight around and taking space on the kingside.", '…Bxd4 — a mistake, Qxd4 takes back.'],
  ],
  'Scotch: Schmidt Variation (4...Nf6 5.Nc3 Bb4)': [
    ["The quieter road: instead of trading on c6, Nc3 simply guards e4 and develops. Why c3 and not d2? On d2 the knight would cut your queen off from the knight on d4.", 'Nc3 — guards e4, develops.'],
    ["…Bb4 pins your knight on c3 to your king, and that knight is the only guard of e4. So …Nxe4 is now a real threat, and the pin is the reason.", '…Bb4 — pins the guard of e4.'],
    ["Before dealing with e4, trade: Nxc6 hits their queen and the bishop on b4 at once, so they must take back right now. And if …dxc6, the queens come off and their king loses castling.", 'Nxc6 — trade first, with a double hit.'],
    ["…bxc6: the b-pawn takes back, their c-pawns are doubled, and the a-pawn has no neighbour. But your e4 pawn still needs a guard, and your knight on c3 is still pinned.", '…bxc6 — doubled pawns, e4 still hit.'],
    ["Bd3 or Bc4? On c4 the bishop would have more squares, but …d5 would kick it at once. On d3 it guards e4, it isn't pinned like the knight, and your king can castle next.", 'Bd3 — an unpinned guard for e4.'],
    ["…d5 is the central break: a second hit on e4, and a pawn of their own in the middle. Your answer is to take, and once the pawns are traded, the e-file is open for both sides' rooks.", '…d5 — hits e4 again.'],
    ["exd5: you take, and your pawn on d5 now hits c6, which has no guard. The e-file is open, and the fight from here is about their pawn that takes back on d5.", 'exd5 — takes, hits the loose c6.'],
    ["…cxd5, and the pawns are level. Their pawn on d5 is the target from here on: your knight already hits it, and only pieces guard it until …c6 comes. Pressure on d5 is your plan for the whole middlegame.", '…cxd5 — level, d5 is the target.'],
    ["You castle, and that ends the pin: with your king off e1, the bishop on b4 no longer pins your knight. And if …c6 now, Re1 check takes the e-file with tempo.", 'O-O — castles out of the pin.'],
    ["…O-O is simplest: their king is safe, and the bishop on b4 has no pin left to hold. If you push a3 at it, it drops back to d6.", '…O-O — both kings safe.'],
    ["Bg5 pins the knight on f6 to their queen, and that knight is one of the guards of d5. Attack the guard and you attack the pawn: that's the logic of this pin.", 'Bg5 — pins a guard of d5.'],
    ["…c6 gives d5 a pawn guard, so it no longer leans on pieces alone. But it costs them d6 for good: no pawn can cover it again, and your bishop on g5 can reach it through f4.", '…c6 — guards d5, gives up d6.'],
    ["Qf3 piles onto the pinned knight and hits d5 as well. Count f6: your bishop and queen against their queen and the g7 pawn. And if …h6 asks the bishop, you can take on f6 and trade queens, leaving them doubled f-pawns.", 'Qf3 — piles onto f6, hits d5.'],
    ["…Be7 breaks the pin: with their bishop behind the knight, taking on f6 no longer touches their pawns, because the bishop just takes back.", '…Be7 — unpins the knight.'],
    ["Rae1 takes the open e-file and lines up on their bishop on e7. You got to the file first, so now they have to come and contest it.", 'Rae1 — the open e-file, facing e7.'],
    ["…Be6: their last piece is out, and it guards d5. It's about level. Your plan: h3, then Bf4 once …h6 asks your bishop. From f4 it lines up on d6, the square …c6 gave up, while your queen and knight stay trained on d5.", '…Be6 — guards d5, about level.'],
  ],
  'Scotch: Göring Gambit (4.c3)': [
    ["c3 is the Göring Gambit: you offer a second pawn so your knight can take back on c3 and your pieces come out fast. The engine prefers simply Nxd4, so this is a weapon for open lines, not an edge.", 'c3 — the Göring, a pawn offered.'],
    ["Accept or decline? …dxc3 takes the pawn, and it's the engine's choice, though masters decline with …d5 more often. Now their pawn on c3 hits b2, so you take back at once.", '…dxc3 — accepts, now b2 is hit.'],
    ["Take back with the knight, or play Bc4 and offer b2 as well? Most club players go Bc4, but after the pawn takes on b2 you're two pawns down for development. Nxc3 keeps it to one and develops.", 'Nxc3 — one pawn down, pieces out.'],
    ["…Bb4 pins your knight on c3 to your king, the natural-looking move. But the engine prefers …Bc5, aiming at f2 instead.", '…Bb4 — pins the knight on c3.'],
    ["Bc4 aims at f7, where only their king stands guard: that's the gambit's target. One attacker, one defender for now. And once you castle, the pin on c3 is gone.", 'Bc4 — at f7, ready to castle.'],
    ["Most club players take on c3 here at once, with check, and that's the common mistake: after bxc3 your knight jumps to g5, a second attacker on f7. …d6 is better, opening their bishop on c8 and covering e5.", '…d6 — frees c8, covers e5.'],
    ["You castle, and your king steps out of the pin on c3. Now …Bxc3 comes without check, and after the b-pawn takes back your pawns are split, but you have the two bishops and open lines toward their king.", 'O-O — out of the pin.'],
    ["…Bxc3 gives up their bishop pair to remove your knight, and it's the engine's choice. The bishop hits b2, pinned to your rook on a1, so you take back with the b-pawn at once.", '…Bxc3 — takes the knight, hits b2.'],
    ["bxc3: a pawn down, but with the two bishops and a half-open b-file for your rook. The pawns on a2 and c3 now stand alone, so this is a game you play for the attack, not for the endgame.", 'bxc3 — two bishops for the pawn.'],
    ["…Nf6 develops and hits your e4 pawn, which has no guard. Their king is still on e8, though, and that's the detail your next move uses.", '…Nf6 — develops, e4 is hit.'],
    ["e5 hits the knight on f6 and the d6 pawn at once, a pawn break with their king still in the center. If the d-pawn takes, the queens come off on d8 with their king taking back, and your bishop picks up f7.", 'e5 — hits the knight and d6.'],
    ["…Nxe5: the knight from c6 takes the pawn and now hits your knight on f3 and your bishop on c4, which has no guard. Two of your pieces are attacked at once.", '…Nxe5 — hits f3 and the loose c4.'],
    ["Nxe5 answers both threats: it removes the knight, and yours now hits f7 too. Two attackers on f7, the knight and the bishop on c4, against one defender, their king.", 'Nxe5 — two hits on f7.'],
    ["…dxe5 takes your knight back, and you're two pawns down. But look down the d-file: the queens face each other with their king still on e8. Trade queens on d8 with check, and Bxf7 wins a pawn back.", '…dxe5 — two pawns down, queens face off.'],
    ["Qb3 keeps the queens on, hitting b7 and backing your bishop against f7, and it stops them castling for now. They are a little better. Your plan: Ba3 on the diagonal to f8, keeping their king in the center, then a rook to the open d-file.", 'Qb3 — hits b7, lines up on f7.'],
  ],
  'Scotch: 4...Qh4 (Steinitz Variation)': [
    ["…Qh4 is the Steinitz: an early queen that hits e4, which has no guard, and f2. It's dubious, the engine prefers …Nf6, but it asks a question. Guard e4, or attack something bigger? You are a little better.", '…Qh4 — early queen, hits e4.'],
    ["Nb5 ignores e4 and goes after c7, which has no guard: Nxc7 check would hit the king and the rook on a8 at once. It's sharp, but the engine prefers the quiet Nc3, simply guarding e4.", 'Nb5 — aims at c7.'],
    ["Check first: …Bb4. Before c7 is dealt with, you have to answer the king. And the check has a second point: g3, kicking their queen, has to wait.", '…Bb4+ — check first.'],
    ["Block with a piece or a pawn? Bd2 develops. c3 blocks with a pawn that hits the bishop, and with the check gone, Nxc7 is a threat again. The cost: no pawn of yours can cover d3 now.", 'c3 — blocks, hits the bishop.'],
    ["…Ba5 keeps the pin on your c3 pawn, and look at the bonus: from a5 the bishop also guards c7. The knight's jump to c7 is off.", '…Ba5 — keeps the pin, guards c7.'],
    ["Nd2 finally guards e4, and the knight is one hop from c4. If their queen grabs e4 now, Nxe4 wins it for a pawn.", 'Nd2 — guards e4 at last.'],
    ["…a6 kicks the knight off b5. Can it take on c7 instead? The bishop on a5 just takes it, a knight for a pawn. So the knight has to retreat.", '…a6 — kicks the knight on b5.'],
    ["Back to d4? That rates far worse. Na3 looks odd on the rim, but from a3 the knight covers c4, the square your other knight wants.", 'Na3 — the rim, but it covers c4.'],
    ["…Bb6 aims at f2: the bishop and the queen on h4 both hit it, and only your king guards it. That's a threat of …Qxf2 mate, so something has to block or guard f2 now.", '…Bb6 — threatens mate on f2.'],
    ["g3 blocks the queen's road to f2 and hits the queen, which has no guard, so it must move. The cost: no pawn can cover f3 again, and their knight could reach it through e5.", 'g3 — kicks the queen off h4.'],
    ["…Qf6: the queen moves, but it still hits f2, now down the f-file, so the mate threat is back. It also eyes your c3 pawn.", '…Qf6 — still aims at f2.'],
    ["Qe2 guards f2, and the mate threat is over. Order matters here: Ndc4 first, the move you want, would have allowed …Qxf2 mate. Now the knight can go.", 'Qe2 — guards f2, mate threat over.'],
    ["…d6 opens the road for the bishop on c8 and covers e5, so your e-pawn can't come forward. It's about level.", '…d6 — frees the bishop on c8.'],
    ["There's the square Na3 was covering: Ndc4. The knight hits the bishop on b6 and the d6 pawn. And if their bishop takes on f2 with check, Qxf2 leaves them a bishop down for a pawn. Your plan: Be3 to meet their bishop, then Bg2 and castle.", 'Ndc4 — hits b6 and d6.'],
  ],
  'Scotch Four Knights (4...Nf6 5.Nc3 Bb4 6.Nxc6 bxc6 7.Bd3 d5)': [
    ["Ne2 sends the knight toward g3 and the kingside, but it's slow: the engine prefers Qf3, piling onto the pinned knight on f6, which the Schmidt tab plays. After Ne2 it's about level.", 'Ne2 — heading to g3, but slow.'],
    ["…Bd6 swings the bishop toward your king: it hits h2, which only your king guards. And your knight's next stop sits right on that diagonal.", '…Bd6 — aims at h2.'],
    ["Ng3 completes the trip, and it's a mistake: the engine prefers Qd2. The knight now stands in the bishop's line, and …h6 is coming at your bishop on g5. They are a little better.", 'Ng3 — a mistake, Qd2 was the move.'],
    ["…h6 hits your bishop on g5, which has no guard. They are a little better. Your plan: drop the bishop to d2, and if their knight jumps to g4, Be2 offers to trade it off.", '…h6 — hits the loose bishop on g5.'],
  ],
  "Scotch: Kasparov's Nb3 Line (4...Bc5 5.Nb3)": [
    ["Nb3 is Kasparov's line, and the engine's first choice: the knight simply steps back. Why leave the center? From b3 it hits the bishop on c5, which has no guard, so they must spend a move on it.", 'Nb3 — steps back, hits the bishop.'],
    ["…Bb6 keeps the bishop on its diagonal, still aimed at f2. Why not …Bb4 check? Your c-pawn would kick it, and it would have to move again.", '…Bb6 — still aimed at f2.'],
    ["Nc3 develops and covers d5 and e4. Here's the plan behind the quiet moves: the queen to e2, the bishop to e3, and castle long, so the kings may end up on opposite sides.", 'Nc3 — develops; long castling is the plan.'],
    ["…Nf6 develops and hits e4, which your knight on c3 guards, and it clears their king's road to castle.", '…Nf6 — hits e4, Nc3 guards it.'],
    ["Qe2 gives e4 a second guard and clears d1, the first step toward castling long. Only the bishop on c1 still stands in the way.", 'Qe2 — guards e4, clears d1.'],
    ["…d6 stops your e5 and opens the bishop on c8, but it's a little slow: the engine prefers castling at once.", '…d6 — frees c8, castling was better.'],
    ["Be3 develops your last minor piece and offers a trade, lining up on their bishop on b6, the one aimed at f2. And with c1 empty, long castling is ready.", 'Be3 — offers the trade, c1 is clear.'],
    ["…Bxe3: they trade, and the bishop that was aimed at f2 is gone. Which piece takes back?", '…Bxe3 — the bishops come off.'],
    ["Qxe3, not the f-pawn: fxe3 would double your pawns on e3 and e4, and it rates far worse. The queen lands on e3 and hits a7.", 'Qxe3 — the queen takes, hits a7.'],
    ["…O-O: their king goes short. Yours is about to go long, and once kings sit on opposite wings, you can storm with your pawns without opening your own king.", '…O-O — their king goes short.'],
    ["O-O-O, and the kings are on opposite sides. Your rook lands on d1 with a bonus: it pins the d6 pawn to their queen on d8. You are a little better.", 'O-O-O — opposite kings, d6 pinned.'],
    ["…Be6 develops with a hit on your knight on b3, but the a2 and c2 pawns both guard it. You are clearly better, and it's time to start the storm.", '…Be6 — hits b3, which holds.'],
    ["f3 gives e4 a third guard and takes g4 from their bishop, so your g-pawn can march. Your plan: h4 and g4 at their king on g8, while your own king sits safely on c1. With kings on opposite wings, the faster pawn storm usually decides.", 'f3 — e4 safe, g4 and h4 next.'],
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

export const SCOTCH_GAME_WATCH: WatchCourse = {
  openingId: 'scotch-game',
  title: 'The Scotch Game — A Master Class',
  orientation: 'white',
  sources: ['concept:pos-development', 'concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
