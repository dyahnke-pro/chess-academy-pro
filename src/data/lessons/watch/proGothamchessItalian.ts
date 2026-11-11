// GothamChess's Italian Game — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet (`LESSON_FACTS=1
// LESSON_IDS=pro-gothamchess-italian`): masters' percentages, engine lines at a
// fixed depth, the board after each move. The student plays White. The last
// five tabs are lines he teaches (docs/levy-lines/decisions). Standard:
// docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register (§2a).
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Bd2', 'Bxd2+', 'Nbxd2', 'd5', 'exd5', 'Nxd5', 'O-O', 'O-O'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4, close to half of all master games, and the engine's favorite first move. The pawn takes the center and opens two roads at once: one for your queen, and one for the bishop on f1. Keep an eye on that bishop, because this whole course is about where it goes.", "e4 — the center, and the bishop's road."],
  ["…e5, about a quarter of masters. The Sicilian is the more common reply, but the engine rates the two the same. Their pawn meets yours head-on and opens the way for their own bishop and queen. So who gets to hit the other's pawn first?", '…e5 — meets e4 head-on.'],
  ["You do. Nf3, nine masters in ten: the knight develops and hits the pawn on e5, which nothing guards yet. That's development with a threat, so their next move is already spoken for.", 'Nf3 — develops, hits e5.'],
  ["…Nc6, close to nine masters in ten: the knight develops and guards e5 in one move. The other try, about one master in eight, is …Nf6, the Petrov, hitting your e4 pawn back instead of defending.", '…Nc6 — develops, guards e5.'],
  ["Where does your bishop belong? Two masters in three put it on b5, the Ruy Lopez. Bc4, about one in five, is the Italian, and look where it points: f7, the weakest square in their camp, guarded only by their king. That's the opening's whole idea in one move. The c3–d4 break, the Evans pawn on b4, the knight jump to g5: every plan in this course ends up aimed at f7.", 'Bc4 — the Italian bishop, aims at f7.'],
  ["…Bc5, about half the masters: the Giuoco Piano, the quiet game. They mirror you exactly, and their bishop aims at f2, the same weak square next to your king. The other main road, nearly as common, is …Nf6, the Two Knights.", '…Bc5 — the mirror, aims at f2.'],
  ["Now, how do you win the center? With c3, more than half the masters' choice. It looks quiet, but it prepares d4: that pawn will hit the bishop on c5, and if they take it, the c-pawn takes back and you keep two pawns in the middle. The slow d3 and the Evans Gambit with b4 are the other roads.", 'c3 — gets d4 ready.'],
  ["…Nf6, nearly every master: the knight develops and hits your e4 pawn, and nothing guards it. Keep an eye on that pawn. For the next few moves it stays loose, and the main line plays d4 anyway.", '…Nf6 — hits the loose e4 pawn.'],
  ["Here's the break: d4, hitting the bishop on c5 and the pawn on e5 at once. Three masters in four play the calm d3 instead, and the engine slightly prefers it. d4 is the sharp road: it opens the center before anyone has castled, and that's the game you're choosing.", 'd4 — the break, hits c5 and e5.'],
  ["…exd4, every master: they take, and now their pawn on d4 hits your c3 pawn. So how do you answer? Take back, or push on with e5?", '…exd4 — they take, hits c3.'],
  ["cxd4, the engine's choice, though a little more than half the masters push e5 instead. You take back and keep two pawns side by side on d4 and e4, and the d4 pawn hits the bishop on c5 again. One thing hasn't changed: your e4 pawn is still loose.", 'cxd4 — two center pawns, hits c5.'],
  ["…Bb4 check, every master: the bishop gets out of the pawn's way with tempo. And it isn't just a check. While your king is busy, …Nxe4 is in the air, because nothing guards your e4 pawn. So how do you block?", '…Bb4+ — check, with …Nxe4 in the air.'],
  ["Bd2, six masters in ten: block with the bishop and offer a trade. It's pinned to your king for the moment, but it hits their bishop on b4, so now they have to choose: trade bishops, or grab your e4 pawn first.", 'Bd2 — blocks, offers a trade.'],
  ["…Bxd2 check, three masters in four: they trade, and the bishop on d2 checks your king. The greedier …Nxe4 first is about a quarter of masters. Now, which piece takes back?", '…Bxd2+ — bishops off, with check.'],
  ["The knight from b1, and the engine is clear about it. From d2 the knight develops and guards your e4 pawn, the one that's been loose since …Nf6. Take with the queen instead and e4 is still hanging: …Nxe4 comes, and the engine rates that about half a pawn worse for you.", 'Nbxd2 — develops, guards e4.'],
  ["…d5, the engine's choice: strike the center before it can roll forward. The pawn hits your bishop on c4 and your e4 pawn at the same time, so you can't keep both where they are. That's the classic answer to a big pawn center.", '…d5 — strikes the center, hits c4.'],
  ["exd5: take, and your pawn now hits the knight on c6. Why not e5, kicking the knight on f6? Because …dxc4 takes your bishop first, and the engine rates that close to a pawn worse.", 'exd5 — take, hit the c6 knight.'],
  ["…Nxd5: the knight takes back and lands on d5, right in front of your d4 pawn. Look at that pawn now: no pawns of yours beside it on the c- or e-file. That's an isolated queen's pawn. No pawn can ever defend it, but it hands your pieces the squares c5 and e5, and their knight on d5 is already blockading it.", '…Nxd5 — blocks your isolated d-pawn.'],
  ["You castle: your king is safe, and the rook on f1 can now come to e1, on the e-file, which is wide open.", 'O-O — king safe, rook to e1 next.'],
  ["They castle too, and the middlegame is here: your isolated d4 pawn against their knight on d5. It's about level. Your plan for the middlegame: a rook to e1 on the open file, a knight to e5 where your d4 pawn guards it, and play for activity now, because every trade brings them closer to an endgame where that pawn is simply weak.", '…O-O — the isolated-pawn middlegame.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });


/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Giuoco Piano c3-d4': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Bd2', 'Bxd2+', 'Nbxd2', 'd5', 'exd5', 'Nxd5', 'O-O', 'O-O'],
  'Slow Italian d3': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'O-O', 'd6', 'c3', 'a6', 'a4', 'Ba7', 'Re1', 'O-O', 'Nbd2', 'Be6', 'h3', 'h6', 'b4'],
  'Evans Gambit': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O', 'd6', 'cxd4', 'Bb6', 'Nc3', 'Bg4', 'Bb5', 'Bd7', 'd5'],
  'Two Knights (…Nf6)': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'O-O', 'Bc5', 'd4', 'Bxd4', 'Nxd4', 'Nxd4', 'Bg5', 'd6', 'f4', 'Be6', 'Na3', 'Nc6', 'f5', 'Bxc4', 'Nxc4'],
  'Fried Liver Attack': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3', 'Nb4', 'O-O', 'c6', 'd4', 'Qf6', 'Qe2'],
  'Knight Attack …Na5': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Be2', 'h6', 'Nh3', 'Bd6', 'd3', 'O-O', 'Ng1'],
  'Evans: Castle First': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'O-O', 'Nf6', 'd4', 'exd4', 'e5', 'd5', 'exf6', 'dxc4', 'fxg7', 'Rg8', 'Re1+'],
  'Evans: …Be7': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Be7', 'd4', 'Na5', 'Be2', 'exd4', 'Qxd4', 'Nf6', 'e5', 'Nc6', 'Qh4', 'Nd5', 'Qg3'],
  'Scotch Gambit': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Bc4', 'Nf6', 'e5', 'd5', 'Bb5', 'Ne4', 'Nxd4', 'Bd7', 'Bxc6', 'bxc6', 'O-O', 'Bc5', 'f3', 'Ng5', 'f4'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The main line itself: every move is already said by MAIN_BEATS.
  'Giuoco Piano c3-d4': [],
  'Slow Italian d3': [
    ["d3: the slow Italian, about one master in six. Instead of breaking with d4 now, you guard e4 with a pawn and keep the break for later, when your pieces are ready. Quiet, but the engine rates it about as highly as c3.", 'd3 — guards e4, the slow road.'],
    ["…Nf6, more than nine masters in ten: the knight develops and hits e4, but this time your d3 pawn guards it. No rush on either side now. Both armies can simply develop.", '…Nf6 — hits e4; d3 holds it.'],
    ["You castle, about a third of masters; c3 first is a little more common. Notice one side effect: with your king on g1, their bishop on c5 now pins your f2 pawn to it. That pawn can't move for now.", 'O-O — king safe; f2 is pinned.'],
    ["…d6, six masters in ten: a second guard on e5, and the road opens for their bishop on c8. With e5 held by a pawn, your d4 break will need preparing, and that's the job of your next move.", '…d6 — props up e5, frees c8.'],
    ["c3, nine masters in ten: now d4 can come with a pawn behind it. It also takes b4 and d4 away from their knight on c6.", 'c3 — prepares d4, covers b4.'],
    ["…a6, about a third of masters. Why spend a move on the rook's pawn? Because your d4 or b4 push will hit the bishop on c5. Now it has a7 to drop back to, where no pawn of yours can reach it.", '…a6 — a safe home on a7.'],
    ["a4, almost half the masters: the pawn takes b5 away, so …b5, which would hit your bishop on c4 and grab space on the queenside, is off the table.", 'a4 — stops …b5.'],
    ["…Ba7, six masters in ten: the bishop drops back to the square …a6 made for it, before d4 or b4 can come with tempo. And from a7 it still aims down the diagonal at f2 and your king.", '…Ba7 — safe, still aims at f2.'],
    ["Re1, about half the masters: the rook backs up e4 and clears f1, a square your knight from b1 can use on its way to the kingside. The price: with the rook gone, only your king guards f2, the pawn their bishop on a7 is staring at.", 'Re1 — backs up e4, frees f1.'],
    ["…O-O, six masters in ten. And now it's mutual: your bishop on c4 pins their f7 pawn to their king, just as their bishop on a7 pins your f2 pawn to yours.", '…O-O — f7 is pinned now too.'],
    ["Nbd2: the knight starts its trip toward f1 and the kingside. But nearly nine masters in ten play h3 first, and the engine agrees. Why? h3 takes g4 away from their knight. Without it, …Ng4 hits f2 a second time, and only your king guards it.", 'Nbd2 — natural; h3 first stops …Ng4.'],
    ["…Be6: their bishop hits yours on c4 and offers a trade. The engine prefers …Ng4, the very move h3 would have stopped, hitting f2 with knight and bishop. As played, it's about level. So what now: take on e6, or first make sure …Ng4 never comes?", '…Be6 — offers a trade; …Ng4 was stronger.'],
    ["h3, the engine's choice: first things first. A pawn now covers g4, so …Ng4 is gone for good, and the knight on f6 can never jump at f2 that way. The trade on e6 can wait.", 'h3 — …Ng4 is gone for good.'],
    ["…h6: the same idea on their side. Now a pawn covers g5, so neither your bishop on c1 nor the knight on f3 can land there. Both sides have taken away the square the other's pieces wanted.", '…h6 — the mirror, covers g5.'],
    ["b4, the engine's choice: the pawn grabs space on the queenside and covers c5, so their bishop can never come back to that square. It's about level. Your plan for the middlegame: a5 next for more space, the knight from d2 through f1 to e3, where it blocks the bishop on a7 and offers itself in trade, and d4 once your pieces are ready.", 'b4 — queenside space, covers c5.'],
  ],
  'Evans Gambit': [
    ["b4: the Evans Gambit. You throw a pawn at the bishop on c5, and here's the point: if they take it, c3 comes with a hit on the bishop, and d4 follows, building your big center while their bishop runs around. About seven masters in a hundred go for it. The engine prefers c3 and rates the gambit about level; you're playing for time and the initiative, not for the pawn.", 'b4 — the Evans Gambit, a pawn for time.'],
    ["…Bxb4, close to nine masters in ten: they take the pawn. And look where the bishop lands: it pins your d2 pawn to your king, so d4 can't come yet. That's why the next move comes first.", '…Bxb4 — takes, pins d2.'],
    ["c3, every master: the pawn hits the bishop and prepares d4 in one move. That's how the gambit pays: each of your moves builds the center, while they keep moving the same bishop.", 'c3 — hits the bishop, prepares d4.'],
    ["Where does the bishop go? …Ba5, six masters in ten: it hits your c3 pawn and stays on the diagonal to your king. Keep that in mind: once your d-pawn leaves d2, the c3 pawn is pinned. …Be7, the quiet retreat, is the other main move, three in ten.", '…Ba5 — hits c3, keeps the diagonal.'],
    ["d4, nearly every master: the pawn hits e5, and you have your center. But see what it cost: with the d-pawn gone from d2, your c3 pawn is pinned to your king by the bishop on a5. If they take on d4, you can't take back with it.", 'd4 — the center, but c3 is pinned.'],
    ["…exd4, about four masters in ten; …d6, holding e5, is a little more common. Now you're two pawns down, their pawn on d4 hits c3, and your c3 pawn still can't take back while it's pinned. So what comes first?", '…exd4 — two pawns up for them.'],
    ["You castle, six masters in ten: the king leaves e1, so the pin on c3 is gone and cxd4 is back on. The engine prefers Qb3 first, lining the queen up behind your bishop on c4, both aimed at f7.", 'O-O — unpins c3; Qb3 was stronger.'],
    ["…d6, about one master in ten: the pawn covers e5 and opens the road for the bishop on c8. It's slow, though. The engine wants a knight out first, …Nge7 or …Nf6, and with …d6 they give you time to take back on d4.", '…d6 — solid but slow.'],
    ["cxd4: you take back, and there's your big center, pawns on d4 and e4, for one pawn. A little over half the masters play Qb3 first, and the engine prefers it too, with the queen and bishop lined up on f7.", 'cxd4 — the big center, one pawn down.'],
    ["…Bb6, a little more than half the masters: the bishop finally leaves the a5 diagonal and hits your d4 pawn instead. The engine prefers …Nf6, hitting e4 and getting a piece out.", '…Bb6 — hits d4.'],
    ["Nc3, about half the masters: your last minor piece comes out and guards e4. Now take stock: two center pawns, three pieces developed and your king castled, against a bishop that has moved four times. That's what the pawn bought you. You are a little better.", 'Nc3 — develops, guards e4.'],
    ["…Bg4, close to four masters in ten: the bishop pins your knight on f3 to your queen, and that knight is one of the guards of d4. You are a little better. So how do you answer a pin? With one of your own.", '…Bg4 — pins the knight to the queen.'],
    ["Bb5, nearly nine masters in ten and the engine's choice: a pin for a pin. Now their knight on c6 is stuck in front of their king, and a knight that can't move is a target for your d-pawn.", 'Bb5 — a pin for a pin.'],
    ['…Bd7: the bishop drops back to break the pin on c6, and in doing so it lets go of your knight on f3. The engine prefers …Bxf3 first, giving up the bishop to double your f-pawns. Their knight on c6 can move again, but is there time?', '…Bd7 — breaks the pin; …Bxf3 was stronger.'],
    ["d5, the engine's choice: the pawn kicks the knight off c6. But notice what moving it opened: their bishop on b6 now looks straight down at f2 and your king. You are a little better. Your plan for the middlegame: when the knight jumps to e5, trade it off with your knight from f3, then Ba3 to cover f8 and keep their king in the center.", 'd5 — kicks the knight; watch f2.'],
  ],
  'Two Knights (…Nf6)': [
    ["…Nf6, the Two Knights, a little under half the masters: instead of mirroring your bishop, they hit your e4 pawn at once, and nothing guards it. Your answer sets the tone of the game: guard it, open the center, or go after f7 with Ng5.", '…Nf6 — the Two Knights, hits e4.'],
    ["You castle and leave e4 hanging, a rare choice. Three masters in four guard it with d3, and the engine agrees with them. The idea is speed: your king is safe first, and if they grab e4, there are ways to win it back.", 'O-O — king first; d3 was stronger.'],
    ["…Bc5: they don't take. Six masters in ten do, and the engine agrees …Nxe4 is their best; instead the bishop comes to c5 and pins your f2 pawn to your king. Your e4 pawn is still loose.", '…Bc5 — pins f2; …Nxe4 was better.'],
    ["d4, the sharp road: the pawn hits the bishop on c5 and the pawn on e5 at once, and throws the center open. Nearly nine masters in ten play d3 instead, and the engine prefers it; d4 offers a pawn for open lines.", 'd4 — opens the center, offers a pawn.'],
    ["…Bxd4, about eight masters in ten: the bishop takes, and from d4 it hits b2 and f2 and pins both. Take it back with the knight.", '…Bxd4 — takes, hits b2 and f2.'],
    ["Nxd4, every master: you take the bishop back, and your knight hits theirs on c6. They'll trade knights, leaving you a pawn down but with both bishops against their two knights.", 'Nxd4 — takes back, hits c6.'],
    ["…Nxd4, every master: they take, and you're a pawn down. Look at what you have instead: two bishops, a king already castled, and the bishop that pinned f2 is gone.", '…Nxd4 — a pawn up for them.'],
    ["Bg5, about a third of masters and the engine's choice; f4 is the more common move. The bishop pins the knight on f6 to their queen, and look at your e4 pawn: the only piece hitting it is that pinned knight, so it's safe for now.", 'Bg5 — pins f6, holds e4.'],
    ["…d6, close to half the masters: the pawn props up e5 and opens the road for the bishop on c8. The pin on f6 is still there, and your next move goes after e5.", '…d6 — props up e5.'],
    ["f4, every master: the pawn hits e5, and with your rook already on f1, opening the f-file is the plan. It's about level. So how do they meet it?", 'f4 — hits e5, the f-file opens.'],
    ['…Be6, about half the masters: the bishop challenges yours on c4, which nothing guards. The engine prefers …Bg4, hitting your queen, after which both queens come off.', '…Be6 — hits c4; …Bg4 was stronger.'],
    ['Na3, more than half the masters: your last minor piece comes out, and from a3 it guards c4. If they trade bishops, this knight takes back.', 'Na3 — develops, guards c4.'],
    ['…Nc6: the knight leaves d4 and heads home. Why retreat? Your f-pawn is about to roll forward, and on c6 the knight guards e5 a second time.', '…Nc6 — back home, guards e5.'],
    ["f5, the engine's choice: the pawn kicks the bishop off e6 and grabs space on the kingside. Now the bishop has to decide: retreat, or take your bishop on c4 first.", 'f5 — kicks the bishop, grabs space.'],
    ['…Bxc4: they trade first, and the bishop on c4 hits your rook on f1. Take it back with the knight from a3, exactly what Na3 prepared.', '…Bxc4 — trades, hits f1.'],
    ["Nxc4, the engine's choice: the knight takes back and lands on c4, hitting d6 and e5. You're still a pawn down, but it's about level. Your plan for the middlegame: trade on f6 when it breaks up their pawns, bring this knight to e3 to watch d5, and use your f5 pawn's grip on e6 and g6 to keep their kingside cramped.", 'Nxc4 — takes back, hits d6 and e5.'],
  ],
  'Fried Liver Attack': [
    ["Ng5: the knight jumps straight at f7. Count it: this knight and your bishop on c4 against one defender, their king. The threat is Nxf7, taking a pawn and hitting their queen and rook at once. About one master in six goes for it; the calm d3 is the main road, and the engine rates it a hair higher. Yes, you're moving a piece twice in the opening, but you're asking a question they have to answer right now.", 'Ng5 — two attackers on f7.'],
    ["…d5, almost every master: the pawn blocks your bishop's road to f7 and hits it at the same time. Now f7 has only the knight against it, and your bishop on c4 is loose.", '…d5 — blocks the bishop, hits c4.'],
    ["exd5, every master: take, and your pawn hits the knight on c6. Now their choice decides everything. Most masters move that knight to a5, hitting your bishop. Taking back on d5 with the other knight looks natural, and it walks into the Fried Liver.", 'exd5 — takes, hits c6.'],
    ["…Nxd5, about two masters in a hundred: the natural recapture, and a mistake. The engine would rather see …b5 or …Na5, the masters' choice. Here's why. The knight on d5 now stands on your bishop's diagonal toward f7, so if their king ever lands on f7 or e6, that knight is pinned. You are clearly better.", '…Nxd5? — natural, but a mistake.'],
    ["Nxf7: here it is, the Fried Liver. The knight takes on f7 and hits the queen on d8 and the rook on h8 at once, a fork, and close to nine masters in ten play it. You'll lose the knight, but their king gets dragged into the open, and your knight was loose on g5 anyway.", 'Nxf7 — the Fried Liver, forks d8 and h8.'],
    ["…Kxf7, every master: the king takes, the only way to save both queen and rook. Now look at the knight on d5: with the king on f7, your bishop on c4 pins it. You're a knight down for a pawn, so every move from here has to keep their king busy.", '…Kxf7 — the king steps out; d5 is pinned.'],
    ["Qf3 check, every master: the queen checks the king and adds a second attacker to the pinned knight on d5. Now the king has to pick a square, and the wrong one loses on the spot.", 'Qf3+ — check, a second hit on d5.'],
    ["…Ke6, every master: the king walks forward to guard its knight. Back to g8 loses at once: your bishop takes on d5 with check, and mate follows. So the king stays in the middle of the board, and your job is to aim more pieces at it before it finds shelter.", '…Ke6 — the king guards d5.'],
    ["Nc3, every master: a third attacker on the pinned knight. Count it: your queen, bishop and knight on d5, against their queen and king. And that knight can't step away, because the pin holds it there.", 'Nc3 — a third attacker on d5.'],
    ["…Nb4, nearly every master: the other knight jumps in to guard d5, and it hits your c2 pawn, which nothing guards. That's their counterplay: …Nxc2 check would hit your king and the rook on a1.", '…Nb4 — guards d5, eyes c2.'],
    ["You castle, eight masters in ten: your king leaves e1, so …Nxc2 no longer comes with check, and your rook gets closer to the action. You are clearly better.", 'O-O — king safe, no …Nxc2 check.'],
    ["…c6 props up the knight on d5 once more: it's guarded four times now, by the queen, the king, the knight on b4 and this pawn. Their whole defence is holding on to that knight. Your answer is to open the center around their king.", '…c6 — d5 guarded four times.'],
    ["d4, the engine's choice: the pawn hits e5, and opening the center is exactly what a king on e6 can't afford. You are clearly better.", 'd4 — open the center on the king.'],
    ["…Qf6 offers a trade: their queen hits yours on f3. Trading queens is the defender's dream, because without queens a king in the center is safe enough. The engine prefers …Kd6, but either way, keep the queens on.", '…Qf6 — offers a queen trade.'],
    ["Qe2: you dodge the trade, and the queen now pins their e5 pawn to the king on e6, so that pawn can't take on d4. The engine slightly prefers Qd1. You are a little better. Your plan for the middlegame: take on e5 to rip the center open, bring a rook to e1 or d1, and keep piling on the pinned knight on d5.", 'Qe2 — dodges the trade, pins e5.'],
  ],
  'Knight Attack …Na5': [
    ["…Na5, close to nine masters in ten, and the right idea: instead of taking back on d5, the knight hits your bishop on c4, which nothing guards. They leave you the pawn and chase away the piece aimed at f7. The engine rates the rare …b5 a touch higher.", '…Na5 — hits the bishop, gives a pawn.'],
    ["Bb5 check, nearly every master: the bishop gets out of the knight's reach, and with tempo. Keeping it on c4 with d3 is the other try, but the engine rates that more than half a pawn worse.", 'Bb5+ — out of reach, with check.'],
    ["…c6, nine masters in ten: block with a pawn that hits your bishop and your d5 pawn at once. It can't take the bishop yet, because the bishop pins it to their king.", '…c6 — blocks, hits b5 and d5.'],
    ["dxc6, every master: take the pawn that's hitting your bishop. You're two pawns up for the moment, and your pawn on c6 hits b7.", 'dxc6 — takes, two pawns up.'],
    ["…bxc6, every master: back to one extra pawn for you. But look at what they have for it: the bishop on c8 now sees all the way to a6, the b-file is half-open for a rook, and your bishop on b5 still needs a safe square. That's the deal in this line: a pawn for activity.", '…bxc6 — a pawn for activity.'],
    ["Where does the bishop go? Be2, three masters in ten; Bd3 is a little more common, and the engine rates them about the same. On e2 the bishop is safe, and unlike Bd3 it doesn't block your d-pawn.", 'Be2 — safe, d-pawn free.'],
    ["…h6, nearly every master: the pawn kicks your knight, the one that jumped to g5 to start all this. Where does it go?", '…h6 — kicks the knight.'],
    ["Nh3, half the masters and the engine's choice. Why the rim? Because Nf3 runs into …e4, and the knight gets kicked again. From h3 it can come back to f3 later, by way of g1. It's about level. So where do their pieces go against a knight on the rim?", 'Nh3 — dodges …e4, returns later.'],
    ["…Bd6, about four masters in ten and the engine's choice: the bishop props up e5 and clears the way to castle.", '…Bd6 — props up e5, castle next.'],
    ['d3, nearly nine masters in ten: the pawn takes e4 away from their pieces and opens the diagonal for your bishop on c1. And with e4 covered, f3 is a safe square again.', 'd3 — covers e4, frees c1.'],
    ['…O-O, nine masters in ten: their king is safe on g8. Count the deal so far: you have the extra pawn, they have more pieces out and the half-open b-file.', '…O-O — safe, and ahead in development.'],
    ["Ng1: the knight starts back toward f3, the square …e4 kept it from using; with your pawn on d3 covering e4, it's safe there now. It costs time, though. The engine prefers Nc3, developing first, and as played they are a little better. Your plan for the middlegame: Nf3, castle, and hold on to the extra pawn while they push their e- and f-pawns at your kingside.", 'Ng1 — heading for f3; Nc3 first.'],
  ],
  'Evans: Castle First': [
    ["O-O: castle before anything else. Only about four masters in a hundred do; d4 at once is the main move, and the engine prefers it, so here they are a little better. The idea: your king leaves e1 before the center opens, so the bishop on a5 never gets to pin your c3 pawn.", 'O-O — king first; d4 was stronger.'],
    ["…Nf6, about half the masters: the knight develops and hits your e4 pawn, which nothing guards. So the center has to move first.", '…Nf6 — hits e4.'],
    ["d4, every master: the pawn hits e5, and this time, with your king on g1, the bishop on a5 has nothing to pin. If they take, your e-pawn can push on.", 'd4 — hits e5, nothing pinned.'],
    ["…exd4, about a quarter of masters: a second pawn, and it hits your c3 pawn too. Most masters castle instead. You're two pawns down now, so it's time for your e-pawn to make something happen.", '…exd4 — a second pawn for them.'],
    ["e5, the engine's choice: the pawn kicks the knight on f6. Where can it go? …d5, hitting back, is the good answer. If it runs to e4 instead, Re1 hits it, and nothing guards it there. Most masters, three in five, play Ba3 first.", 'e5 — kicks the knight.'],
    ["…d5, nearly nine masters in ten: instead of saving the knight, they hit your bishop on c4. Now both sides have a piece hanging, their knight on f6 and your bishop on c4. Who takes first?", '…d5 — hits back at c4.'],
    ["exf6, every master: take the knight. And look where your pawn lands: on f6 it hits g7, so when they take your bishop, you take on g7 and their kingside cracks open.", 'exf6 — takes the knight, eyes g7.'],
    ["…dxc4: they take your bishop. A piece each, and they're still two pawns up. Now look at g7: it's loose, and your f6 pawn is ready to take it.", '…dxc4 — a piece each, two pawns up.'],
    ["fxg7: the pawn takes and stands one step from queening, hitting the rook on h8. It also covers f8, so their king can't castle short.", 'fxg7 — hits h8, covers f8.'],
    ["…Rg8, the only good move: the rook gets out of the corner and hits your g7 pawn. Anything else, and the pawn queens with check on h8 or f8.", '…Rg8 — saves the rook, hits g7.'],
    ["Re1 check: the rook takes the open e-file with tempo, while their king still sits in the center. Bg5 first is just as good. They are a little better. Your plan for the middlegame: Bg5 to chase their queen, then the knight from b1 to d2 and on to e4, everything aimed at a king that can't castle short. Your g7 pawn will fall, but its job was to keep that king in the middle.", 'Re1+ — the e-file, with check.'],
  ],
  'Evans: …Be7': [
    ["…Be7, three masters in ten: the quiet retreat. No pins, no tricks: the bishop just goes home, and your d4 can come without your c3 pawn ever being pinned. The engine prefers the active …Ba5.", '…Be7 — the quiet retreat.'],
    ["d4, nearly every master: the center, right away. With the bishop on e7, nothing pins your c3 pawn, so it's free to take back on d4.", 'd4 — the center; c3 is free.'],
    ["…Na5, close to nine masters in ten: the knight hits your bishop on c4, the piece aimed at f7. Notice what it left behind, though: e5 has no guard now.", '…Na5 — hits c4, leaves e5.'],
    ["Where does the bishop go? Be2, about half the masters and the engine's choice. Grabbing e5 with Nxe5 is tempting, but then …Nxc4 trades off your bishop anyway. On e2 it stays, and you keep both bishops.", 'Be2 — keeps the bishop.'],
    ["…exd4, about half the masters: a second pawn, and now their pawn on d4 hits c3. Nothing guards that d4 pawn, though, so which piece takes it back?", '…exd4 — a second pawn.'],
    ["Qxd4, more than nine masters in ten: the queen takes back and lands in the center, hitting g7, which nothing guards. cxd4 is solid, but the queen move asks a question at once.", 'Qxd4 — central queen, hits g7.'],
    ["…Nf6: the knight blocks the queen's diagonal to g7 and hits your e4 pawn. The engine prefers …d5, hitting back in the center, and after …Nf6 you are a little better.", '…Nf6 — blocks g7, hits e4.'],
    ["e5, the engine's choice: the pawn hits the knight on f6. Where can it go?", 'e5 — hits the knight.'],
    ["…Nc6, the engine's choice: they leave the knight on f6 where it is. The other knight jumps back to c6 and hits your queen, so you have to deal with that first.", '…Nc6 — hits your queen.'],
    ["Qh4: the queen steps away and still hits the knight on f6, now from the side. Hit by your queen and your e5 pawn, that knight has to move. The engine sends it back to g8; where else could it go?", 'Qh4 — keeps hitting f6.'],
    ['…Nd5: the knight jumps to the center instead and hits your c3 pawn. But it takes their last knight away from the kingside, and your queen can swing to g3 to hit g7. The engine prefers …Ng8. You are a little better.', '…Nd5 — hits c3; …Ng8 was better.'],
    ['Qg3: the queen hits g7, which nothing guards, so they have to spend a move on it, castling or stepping the king to f8. You are a little better. Your plan for the middlegame: castle, bring a rook to d1, and keep the queen on g3 aimed at their king, with Bh6 ready once it sits on g8.', 'Qg3 — hits the loose g7 pawn.'],
  ],
  'Scotch Gambit': [
    ["d4: why wait? Instead of developing the bishop first, the pawn hits e5 right away. Only about one master in eleven plays it here, but the engine likes it best of all. This is the Scotch, and the line you're about to see gives it an Italian twist.", 'd4 — hits e5 at once.'],
    ["…exd4, every master: they take on d4, and for now you're a pawn down. The usual move is to take straight back with the knight. You're going to do something else.", '…exd4 — they take.'],
    ["Bc4: the Scotch Gambit. You leave the pawn on d4 for now and develop the bishop toward f7, two pieces out against their one. About one master in eight goes this way; taking back with Nxd4 is the main move and the engine's choice. It's about level.", 'Bc4 — the Scotch Gambit, aims at f7.'],
    ["…Nf6, two masters in three, and here's a surprise: this is the exact position of the Two Knights after d4 and …exd4, just reached by another road. The knight hits your e4 pawn, and nothing guards it.", '…Nf6 — hits e4; a Two Knights position.'],
    ["e5, seven masters in ten: don't defend e4, push it forward and kick the knight off f6. Castling, letting e4 go, is the other road.", 'e5 — kicks the knight off f6.'],
    ["…d5, three masters in four: the knight stays put, and the pawn hits your bishop on c4. Answer a threat with a threat. If you take on f6, they take your bishop.", '…d5 — hits back at c4.'],
    ["Bb5, every master: the bishop steps out of the way and pins the knight on c6 to their king. Why care? That knight is the only thing guarding their extra pawn on d4.", 'Bb5 — pins the knight guarding d4.'],
    ["…Ne4, more than eight masters in ten: the knight jumps into the center, away from your pawn, and eyes f2.", '…Ne4 — centralizes, eyes f2.'],
    ["Nxd4, nearly every master: now you take the pawn back, and the knight on c6 can't recapture while it's pinned. Material is level, and your knight joins the pressure on c6.", 'Nxd4 — pawn back, hits c6.'],
    ["…Bd7, seven masters in ten: the bishop steps in between, so the knight on c6 is no longer pinned to the king. And now your e5 pawn is loose, because that knight can take it.", '…Bd7 — breaks the pin.'],
    ["Bxc6, nearly every master: take the knight before it can grab e5. When the pawn takes back, their c-pawns are doubled. You are a little better. Which way will they take back?", 'Bxc6 — before …Nxe5; doubles their c-pawns.'],
    ["…bxc6, the engine's choice: material is level again, and their c-pawns are doubled on c6 and c7. That's a long-term weakness. The short-term question is their knight on e4, held in place by the d5 pawn.", '…bxc6 — doubled c-pawns.'],
    ["You castle, the engine's choice: your king is safe, and the rook on f1 stands behind the f-pawn you're about to push.", 'O-O — king safe, rook behind f2.'],
    ["…Bc5, the engine's choice: the bishop develops with a hit on your knight on d4. Notice the diagonal: it runs on through to your king on g1, so the moment your f-pawn moves, that knight is pinned.", '…Bc5 — hits d4, aims at g1.'],
    ["f3: the pawn kicks the knight off e4. And here's the cost: with f2 gone, your knight on d4 is now pinned to your king by the bishop on c5. Be3, guarding d4 first, is just as good.", 'f3 — kicks the knight; d4 is pinned.'],
    ["…Ng5, the engine's choice: the knight steps back and hits your f3 pawn. Will it be allowed to stay there?", '…Ng5 — hits f3.'],
    ["f4: the pawn kicks the knight once more and props up e5 from behind, a pawn chain. The engine prefers Be3 first, breaking the pin on your knight on d4. It's about level. Your plan for the middlegame: Be3 to unpin the knight, c3 to give it a second guard, and Nd2 to challenge their knight when it comes back to e4.", 'f4 — kicks it again, props up e5.'],
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

export const PRO_GOTHAMCHESS_ITALIAN_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-italian',
  title: "This repertoire's Italian — the c3-d4 Giuoco into the IQP",
  orientation: 'white',
  sources: [
    'book:italian-game',
    'concept:pos-center',
    'https://www.chess.com/openings/Italian-Game',
    'https://www.chess.com/openings/Italian-Game-Giuoco-Piano',
    'https://en.wikipedia.org/wiki/Italian_Game',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
