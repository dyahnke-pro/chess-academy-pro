// Evans Gambit — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=evans-gambit`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. Standard: docs/OPENING-WATCH-BEATS.md; said in the think-out-loud
// register (the question the position asks, the tempting move and what it
// allows, the answer and what it sets up). One story runs through the main
// line: the pawn buys two moves with a threat (c3, d4), the a5-bishop's pin on
// c3 that castling breaks, the two pins castling hands them, and the knight
// that h3 chases to the rim.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O', 'd6', 'cxd4', 'Bb6', 'Nc3', 'Nf6', 'Ba3', 'O-O', 'e5', 'Ng4', 'h3', 'Nh6', 'exd6', 'cxd6', 'd5', 'Ne7', 'Ne4', 'Bc7', 'Bc1', 'Ng6', 'Bg5', 'f6', 'Bxh6', 'gxh6', 'Nd4'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — the king's pawn takes the center, and it opens the road for your bishop on f1. Close to half the masters' games start this way. Keep an eye on that bishop: it's about to aim at f7, and the whole Evans grows from there.", 'e4 — center, and the f1-bishop is free.'],
  ["…e5 — they meet you head-on and take their share of the center. The Sicilian, …c5, is the masters' most common answer, about twice as popular, but this is the road to the Evans.", '…e5 — meets you in the center.'],
  ['Nf3 — nine masters in ten play it, because it develops with a threat: the knight hits the pawn on e5, and nothing guards it yet.', 'Nf3 — develops and hits e5.'],
  ['…Nc6 — almost nine masters in ten answer this way. The knight guards e5 and develops in the same move. …Nf6, hitting your e-pawn back instead, is the other try.', '…Nc6 — guards e5, develops.'],
  ['Where does this bishop belong? About two masters in three play Bb5, the Ruy Lopez. Bc4 is the Italian, and look where it points: straight at f7, the one square in their camp that only their king guards. That pawn is the target of the whole opening.', 'Bc4 — aims at f7, the weak spot.'],
  ['…Bc5 — the mirror image. Their bishop aims at f2, the square only your king guards. This is the Giuoco Piano, chosen by just over half the masters; …Nf6, the Two Knights, is nearly as common.', '…Bc5 — mirrors you, aims at f2.'],
  ["And here's the Evans Gambit: b4, a pawn thrown at the bishop on c5. Why give it away? Count moves, not pawns. Their bishop has no guard, so they can't ignore the pawn, and if they take it, c3 hits the bishop again and d4 comes next: two moves toward a big center, each with a threat. Even the empty b2 square helps, opening a road from c1 to a3 for your other bishop. The quiet c3 is the engine's choice and about half the masters' too; after b4 it's about level.", 'b4 — the Evans: a pawn for time.'],
  ["…Bxb4 — almost nine masters in ten take it. Now you're a pawn down, and look at the bishop on b4: it pins your d-pawn to your king, so d4 can't come yet. That's what your next move is for.", '…Bxb4 — takes, and pins your d-pawn.'],
  ['c3 — the first of the two moves the pawn paid for. It hits the bishop on b4, so the pin on your d-pawn has to go, and when d4 comes, this pawn will stand behind it. Every master plays it.', 'c3 — hits the bishop, prepares d4.'],
  ['Where does the bishop go? About six masters in ten choose a5: out of the pawn\'s reach, and still aimed down the diagonal through c3 and d2 at your king on e1. Remember that diagonal: the moment your d-pawn moves, c3 is pinned. …Be7 is the main other retreat, and …Bd6 has its own tab.', '…Ba5 — still aimed at your king.'],
  ["d4 — almost every master plays it: the second move with a threat, since the pawn hits e5, and here's the center the gambit was for. But look at the a5 bishop. With d2 empty, your c3 pawn is pinned to your king, so if they take on d4, the c-pawn can't take back yet.", 'd4 — hits e5, but c3 is pinned.'],
  ["…exd4 — about four masters in ten take, and now you're two pawns down. Their pawn on d4 hits c3 as well. Can you take back? Not with the c-pawn: it's pinned. Just over half the masters hold the center with …d6 instead, and those lines have their own tabs.", '…exd4 — a second pawn; c3 pinned.'],
  ['So how do you free the c-pawn? Take the king off the diagonal. Castle, and with your king on g1 the pin on c3 is gone, so cxd4 is ready next. About six masters in ten castle here; the engine prefers Qb3 first.', 'O-O — unpins c3, cxd4 next.'],
  ["…d6 — solid: the pawn covers e5, so your e-pawn can't simply advance there, and it opens the road for the bishop on c8. But it's slow. About half the masters play …Nge7, and the engine prefers it.", '…d6 — solid, covers e5.'],
  ["cxd4 — and there it is: two pawns side by side on d4 and e4, and you're only one pawn down. That's the bargain of the Evans: the pawn bought time, and the time bought the center. Nearly half the masters take right away; the engine prefers Qb3 first.", 'cxd4 — the center, one pawn down.'],
  ['…Bb6 — the bishop finally leaves a5 and hits d4. And look behind that pawn: the diagonal runs on through f2 to your king on g1, so if d4 ever moves forward, your f2 pawn will be pinned. The engine prefers …Nf6.', '…Bb6 — hits d4, aims at g1.'],
  ["Nc3 — the knight takes the square your c-pawn left: it backs up e4 and covers d5. About half the masters play it. And look at the count: one pawn down, and you are a little better already. That's what the development is worth.", 'Nc3 — backs up e4, covers d5.'],
  ['…Nf6 — the knight hits e4. But look where it stands: right in front of your e-pawn, so e5 would hit it. Most masters play …Na5 here, going after your bishop on c4; the engine prefers …Bg4 or …Na5.', '…Nf6 — hits e4, but e5 looms.'],
  ["Ba3 — remember the b-pawn you gave away? With b2 empty, the bishop gets out to a3 and takes the a3–f8 diagonal. It hits d6, and behind that pawn sits f8, where their rook lands when they castle. The engine prefers e5 at once, hitting the knight before they can castle; after Ba3 it's about level.", 'Ba3 — takes the a3–f8 diagonal.'],
  ["…O-O — they castle, and look what it costs them. Their king on g8 now sits on your c4 bishop's diagonal, so f7 is pinned. And the rook on f8 stands behind d6 on your a3 bishop's diagonal, so d6 is pinned too. Two pins, and both come from your bishops.", '…O-O — now f7 and d6 are pinned.'],
  ["Now e5. The pawn hits the knight on f6 and the pawn on d6. Can they take it? Not comfortably: the d6 pawn is pinned, so …dxe5 opens your bishop's line to the rook on f8. From here the line has left the masters' games.", 'e5 — hits the knight on f6.'],
  ['…Ng4 — the knight jumps out of the pawn\'s reach, and from g4 it hits e5, f2 and h2. The engine prefers …Nh5.', '…Ng4 — escapes, hits e5 and f2.'],
  ['h3 — where does the knight go now? f6 is covered by your e5 pawn and e3 by your f2 pawn, so the only decent square left is on the rim. You are a little better.', 'h3 — chases the knight to the rim.'],
  ['…Nh6 — the best of a bad lot. On h6 the knight hits nothing at all. Remember it: later your bishop comes for it.', '…Nh6 — on the rim, doing nothing.'],
  ['exd6 — your e-pawn takes on d6, trading itself for their d-pawn. Why now? It opens the e-file all the way for your rooks, and they have to take back. You are a little better.', 'exd6 — opens the e-file.'],
  ["…cxd6 — they take back, and you're a pawn down again. But notice: the new pawn on d6 is pinned to the rook on f8 by your bishop on a3, just like the old one. And with no c-pawns left, the c-file is open for both sides' rooks.", '…cxd6 — the new d6 pawn is pinned.'],
  ["d5 — the pawn hits the knight on c6 and grabs space. Yes, it's isolated now, but look what it does to d6: that pawn is frozen on a dark square, right where your bishop on a3 can keep hitting it. The price: with d4 gone, the bishop on b6 now pins your f2 pawn to your king. You are clearly better.", 'd5 — hits c6, freezes d6.'],
  ['…Ne7 — the knight steps away and hits your d5 pawn. And look where it stands: on e7, between d6 and the rook on f8, so the pin on d6 is gone.', '…Ne7 — hits d5, breaks the pin.'],
  ['Where does this knight belong? e4, and now count on d6. Your knight and your bishop on a3 both hit it, only their queen guards it, and no pawn can ever come to its defence: their c- and e-pawns are gone.', 'Ne4 — d6 is hit twice now.'],
  ['…Bc7 — the bishop comes back to give d6 a second guard. That holds the pawn, but now their bishop is a defender, tied to d6. The engine prefers …Nhf5.', '…Bc7 — guards d6, passively.'],
  ["The bishop's work on d6 is done, so it switches diagonals. From c1 it hits the knight on h6, the one stranded on the rim. Bxh6 next would break up the pawns in front of their king.", 'Bc1 — switches diagonals, hits h6.'],
  ['…Ng6 — the other knight comes to the kingside, where it covers e5 and f4. But it does nothing about the threat to take on h6.', '…Ng6 — covers e5 and f4.'],
  ["Bg5 — first the bishop hits the queen on d8. Why not take on h6 right away? The knight isn't going anywhere, so gain a move on the queen first and keep h6 under fire. You are clearly better.", 'Bg5 — hits the queen, keeps h6.'],
  ['…f6 — the pawn shuts the line to the queen and hits your bishop on g5. So where does the bishop go? Nowhere: it takes something on the way out.', '…f6 — blocks, and hits your bishop.'],
  ['Bxh6 — instead of retreating, the bishop takes the knight on h6, the one your h3 pawn chased to the rim. When the g-pawn takes back, the pawns in front of their king are broken for good.', "Bxh6 — breaks their king's pawns."],
  ['…gxh6 — they get the two bishops, but look at their king now: no g-pawn in front of it, two pawns stacked on h6 and h7, and the f6 pawn cut off on its own. You are clearly better.', '…gxh6 — two bishops, a broken king.'],
  ['Nd4 — the knight heads for e6, a real hole in their camp: no pawn of theirs can ever cover it again. You are a little better. Your plan: plant a knight on e6, and bring your queen and rooks against their broken kingside, with the pawns on d6 and h6 as targets.', 'Nd4 — heading for the e6 hole.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move no earlier line shares. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Evans Gambit: Slow Variation': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'd6', 'Qb3', 'Qd7', 'dxe5', 'dxe5', 'O-O', 'Bb6', 'Rd1', 'Qe7'],
  'Evans Gambit: Compromised Defence': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O', 'dxc3', 'Qb3', 'Qe7', 'Nxc3', 'Bxc3', 'Qxc3', 'Nf6', 'Ba3'],
  'Evans Gambit Declined': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bb6', 'a4', 'a6', 'Nc3', 'Nf6', 'd3', 'd6', 'Rb1', 'h6', 'a5', 'Ba7', 'Be3', 'Nd4', 'h3'],
  'Evans Gambit: Stone-Ware Variation': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Bd6', 'd4', 'h6', 'O-O', 'Nge7', 'Bb3', 'Ng6', 'dxe5', 'Ngxe5', 'Nxe5', 'Bxe5'],
  'Evans Gambit: Lasker Defence': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'd6', 'O-O', 'Bb6', 'dxe5', 'dxe5', 'Qb3', 'Qf6', 'Bg5', 'Qg6', 'Bd5', 'Nge7'],
  'Evans Gambit: Morphy Attack': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O', 'd6', 'cxd4', 'Bb6', 'd5', 'Na5', 'Bb2', 'Nf6'],
  'Evans Gambit: Anderssen Variation': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O', 'Bb6', 'cxd4', 'd6', 'Nc3', 'Nf6', 'e5', 'dxe5', 'Ba3', 'Nxd4', 'Nxd4', 'Bxd4', 'Nb5', 'Be6'],
  'Evans Gambit: Main Line with Qb3': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'd6', 'Qb3', 'Qd7', 'O-O', 'Bb6', 'Nbd2', 'exd4', 'cxd4', 'Na5', 'Qc3', 'Ne7'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Evans Gambit: Slow Variation': [
    ['…d6 — just over half the masters choose it. Instead of grabbing a second pawn, they hold e5 with a pawn and open the road for the bishop on c8. The engine prefers …exd4, and after …d6 you are a little better.', '…d6 — holds e5, frees c8.'],
    ["Qb3 — nine masters in ten play it. The queen lines up behind your bishop on c4, a battery aimed at f7, and it hits b7 too. Here's the threat: Bxf7+, and their king can't take back, because your queen covers f7.", 'Qb3 — the battery on f7.'],
    ['…Qd7 — almost every master plays it: the queen guards f7 along the seventh rank. It blocks their own bishop on c8, but it holds.', '…Qd7 — guards f7, blocks c8.'],
    ['dxe5 — why open the center now? The pawn hits d6, and when they take back, the d-file opens with their queen standing on it. About four masters in ten play this; slightly more castle first.', 'dxe5 — opens the d-file.'],
    ["…dxe5 — and there's the open d-file, with their queen on d7 and nothing in front of it. That's a file your rook wants. The engine prefers …Bb6, as almost nine masters in ten play.", '…dxe5 — the d-file opens.'],
    ['Castle. Your king leaves e1, so the pin on c3 is gone, and the rook on f1 is one step from d1, facing their queen. You are a little better.', 'O-O — unpins c3, rook to d1 next.'],
    ['…Bb6 — the bishop leaves a5 and aims at f2, which is now pinned to your king on g1. It also clears a5 for the knight: …Na5 next would hit your queen and your bishop.', '…Bb6 — pins f2, prepares …Na5.'],
    ["Rd1 — here it is: the rook takes the open file and hits their queen on d7. And …Qxd1+ is no answer: your queen takes back, and they've given a queen for a rook.", 'Rd1 — the open file, hits the queen.'],
    ["…Qe7 — the queen steps off the file and still guards f7. Why not …Na5, hitting your queen? Then Bxf7+ and Rd8+ tear into their king. It's about level, a pawn down. Your plan: Rd5 to keep the rook active, then Nbd2 and Ba3 to finish developing, with f7 still the target.", '…Qe7 — off the file, guards f7.'],
  ],
  'Evans Gambit: Compromised Defence': [
    ["…dxc3 — the Compromised Defence: they grab a third pawn. Now count what it cost: their king is still in the middle with most of their pieces at home, while your king is castled and the lines are opening for your pieces. Three pawns down, and it's still about level. The engine prefers …Nge7.", '…dxc3 — a third pawn, at a price.'],
    ['Qb3 — the battery again: the queen lines up behind your bishop at f7, so Bxf7+ is coming, and it hits b7 and the pawn on c3 as well. Suddenly you are a little better.', 'Qb3 — battery on f7, hits c3.'],
    ['…Qe7 guards f7 and hits your e4 pawn. About eight masters in ten play …Qf6 instead, and the engine agrees: now you are clearly better.', '…Qe7 — guards f7, hits e4.'],
    ['Nxc3 — one pawn back, and the knight guards e4. You are clearly better, still two pawns down. So what do they do about the knight?', 'Nxc3 — a pawn back, e4 guarded.'],
    ["…Bxc3 — they take it, the engine's first choice, and their bishop now hits your rook on a1. But that bishop is loose too, and your e4 pawn has just lost its guard. You are clearly better.", '…Bxc3 — hits a1, but is loose.'],
    ['Qxc3 — the queen takes back, saving the rook, and lands on the long diagonal, aimed at g7. That pawn has no guard. You are a little better.', 'Qxc3 — saves a1, aims at g7.'],
    ["…Nf6 — the knight steps in front of g7, cutting your queen off from it, and hits e4, which nothing of yours guards now. You are clearly better, but e4 is hanging. How do you handle that?", '…Nf6 — blocks the g7 diagonal, hits e4.'],
    ["Ba3 — with tempo: the bishop hits their queen on e7, so they have to deal with that before they can take on e4. The engine prefers Rb1, taking the open b-file first. You are clearly better. Your plan for the middlegame: if …d6 blocks the bishop, push e5, hitting the knight on f6 and the pawn on d6 at once, and open the center while their king is still on e8.", 'Ba3 — hits the queen; e5 next.'],
  ],
  'Evans Gambit Declined': [
    ["…Bb6 — they don't take. The bishop drops back and keeps its aim at f2, and now your pawn on b4 is just loose, with nothing guarding it. About one master in eight declines like this; the engine prefers taking.", '…Bb6 — declines; b4 is loose.'],
    ["a4 — eight masters in ten play it. The idea is a5, hitting the bishop on b6, and your queenside pawns gain space. It's about level.", 'a4 — a5 next, hitting the bishop.'],
    ['…a6 — nine masters in ten. If a5 comes, the bishop has a7 to step back to, and the pawn takes b5 away from your b-pawn.', '…a6 — a7 ready for the bishop.'],
    ['Nc3 — the knight develops and covers d5. About half the masters play it; the engine prefers c3, getting ready for d4.', 'Nc3 — develops, covers d5.'],
    ['…Nf6 develops and hits your e4 pawn. For now only your knight on c3 guards it, so that knight is tied to e4.', '…Nf6 — hits e4.'],
    ['d3 — before anything else, a pawn guard: it covers e4 and your bishop on c4, so the knight on c3 is free to jump to d5 later. It also opens the c1–g5 diagonal for your other bishop. Most masters, about seven in ten, jump to d5 at once.', 'd3 — guards e4 and c4.'],
    ['…d6 — solid: e5 has a pawn guard now, and the bishop on c8 is free. But look at your b4 pawn: their knight on c6 hits it, and nothing of yours guards it. What do you do about that?', '…d6 — solid; b4 is loose.'],
    ["Rb1 — the rook guards b4, the engine's first choice. It also stands behind the pawn on the b-file, ready for when that file opens. It's about level.", 'Rb1 — guards b4.'],
    ["…h6 — the engine's first choice: the pawn covers g5, so neither your bishop nor your knight can land there to pin the knight on f6 or hit f7. It's about level.", '…h6 — covers g5.'],
    ['a5 — now the pawn hits the bishop on b6, with your b4 pawn guarding it. Where does the bishop go?', 'a5 — hits the b6 bishop.'],
    ["…Ba7 — it keeps the same diagonal, the engine's first choice, still aimed down at your f2 pawn. It's about level.", '…Ba7 — still aimed at f2.'],
    ["Be3 — the bishop steps into that diagonal: it hits the bishop on a7 and the pawn on h6, and offers a trade of the dark-squared bishops. It's about level.", 'Be3 — hits a7, offers a trade.'],
    ["…Nd4 — the knight jumps into the center and hits c2 and your knight on f3. Count d4: your bishop on e3 and knight on f3 hit it, and their e5 pawn and bishop on a7 guard it. It's about level.", '…Nd4 — hits c2 and f3.'],
    ["h3 — the pawn covers g4, so their bishop can't come there to pin your knight on f3. The engine prefers Bxd4, taking the knight at once. It's about level. Your plan for the middlegame: castle short, and settle the knight on d4: take it with the bishop, or if it takes on f3 with check, take back with the queen.", 'h3 — covers g4; Bxd4 was better.'],
  ],
  'Evans Gambit: Stone-Ware Variation': [
    ['…Bd6 — the Stone-Ware. The bishop drops back where it guards e5, but look at the cost: it stands in front of their own d-pawn, so the bishop on c8 stays shut in. Fewer than one master in ten plays it; the engine prefers …Ba5, the main line.', '…Bd6 — guards e5, blocks the d-pawn.'],
    ["d4 — almost nine masters in ten play it, and here's the difference from the main line: no bishop on a5, so nothing pins your c3 pawn. If they take on d4, cxd4 takes back at once with a big center. You are a little better.", 'd4 — hits e5, and c3 is free.'],
    ["…h6 takes g5 away from your knight and your bishop. But it's slow: about eight masters in ten develop with …Nf6 instead, and the engine agrees.", '…h6 — covers g5, but slow.'],
    ['Castle. Your king gets to safety before the center opens up. You are a little better.', 'O-O — king safe first.'],
    ["…Nge7 — not f6, and here's why: from e7 the knight goes on to g6, where it guards e5, and the f-pawn stays free to push to f5 later, hitting your e4 pawn.", '…Nge7 — heading for g6.'],
    ['Bb3 — a quiet move with a point. On c4 nothing guards the bishop; on b3 your a-pawn does, and it still aims at f7.', 'Bb3 — guarded now, still aims at f7.'],
    ['…Ng6 — the knight arrives. Count on e5: three guards, the knights on c6 and g6 and the bishop on d6, against your two attackers, the pawn on d4 and the knight on f3. So e5 holds.', '…Ng6 — e5 guarded three times.'],
    ["dxe5 — so release the tension instead. The pawn takes and hits the bishop on d6, and they have to take back. It's about level.", 'dxe5 — trades, hits the bishop.'],
    ['…Ngxe5 — they take with the g6 knight, and it hits your knight on f3, offering a trade.', '…Ngxe5 — offers a knight trade.'],
    ["Nxe5 — you take the trade, and the position simplifies. The engine prefers Nd4, keeping the knights on. It's about level.", 'Nxe5 — trades knights.'],
    ['…Bxe5 — the bishop takes back and lands on the long diagonal: it hits c3 and h2, and your c3 pawn is pinned to the rook on a1. Your plan: f4 to kick the bishop off e5, then e5 to gain space, with your bishop on b3 still aimed at f7.', '…Bxe5 — long diagonal, pins c3.'],
  ],
  'Evans Gambit: Lasker Defence': [
    ['Castle. It takes the king off the diagonal, so your c3 pawn is free again. But nine masters in ten play Qb3 here first, lining up on f7, and the engine agrees. Castling gives them time for Lasker\'s idea.', 'O-O — unpins c3; Qb3 was first.'],
    ["…Bb6 — Lasker's Defence, about six masters in ten. The bishop leaves a5 and hits d4, and the plan is to give the pawn back on their terms: if you take on e5 and they take back, the queens can come off.", "…Bb6 — Lasker's: return the pawn, trade queens."],
    ["dxe5 — three masters in four take here. The pawn hits d6, and once it's taken back, the d-file opens between the two queens.", 'dxe5 — the d-file opens.'],
    ['…dxe5 — and the queens face each other down the open file. Now you have a choice: trade them with Qxd8+ and win the pawn back on e5, or keep them on and play for an attack. Right now they are a little better.', '…dxe5 — the queens face each other.'],
    ['Qb3 keeps the queens on: it hits the bishop on b6 and lines up behind your bishop at f7. But here it costs you. About half the masters trade with Qxd8+ instead, and the engine agrees: after the trade, Nxe5 wins the pawn back.', 'Qb3 — keeps queens on; Qxd8+ was simpler.'],
    ['…Qf6 — the queen guards f7 and hits your knight on f3. It also gives e5 a second guard, so Nxe5 would just lose the knight. They are a little better.', '…Qf6 — guards f7, hits f3.'],
    ['Bg5 — their queen hits your knight, so you hit the queen. The bishop on g5 hits the queen on f6 and gains a move.', 'Bg5 — hits the queen on f6.'],
    ['…Qg6 — the queen steps away and hits back: your bishop on g5 and your e4 pawn are both under fire now, and e4 has no guard. …Qd6 instead would run into Bxf7+.', '…Qg6 — hits g5 and e4.'],
    ['Bd5 — the bishop guards e4 and hits the knight on c6, the only piece guarding e5. But the engine prefers a4, and after Bd5 they are clearly better.', 'Bd5 — guards e4, hits c6.'],
    ['…Nge7 — the knight develops, hits your bishop on d5 and gives c6 another guard. The engine prefers …f6. They are a little better. Your plan: trade on e7 so their king has to take back and can\'t castle, then bring the knight to d2 and keep their king busy with queen checks from b4 or a3.', '…Nge7 — hits d5, guards c6.'],
  ],
  'Evans Gambit: Morphy Attack': [
    ["d5 — the Morphy Attack: the pawn hits the knight on c6 and grabs space. The price: with d4 gone, the bishop on b6 now pins your f2 pawn to your king. The engine prefers h3 first; after d5 it's about level.", 'd5 — hits c6, grabs space.'],
    ['…Na5 — the knight goes to the rim, but with a point: it hits your bishop on c4, which nothing guards.', '…Na5 — hits the loose bishop on c4.'],
    ['Do you have to save the bishop on c4? Not yet. Bb2 hits g7, and g7 is pinned to the rook on h8. If …Nxc4, Bxg7 hits the rook, and you win a rook and a pawn for your bishop. The engine prefers saving it first with Be2 or Bd3.', 'Bb2 — hits g7; …Nxc4 runs into Bxg7.'],
    ['…Nf6 — the knight blocks the long diagonal, so the trick on g7 is gone, and it hits e4 and d5. Now the bishop on c4 really has to move. Your plan: Bd3 to save it and guard e4, then Nc3, with the bishop on b2 waiting for the knight on f6 to move.', '…Nf6 — blocks the diagonal, hits e4.'],
  ],
  'Evans Gambit: Anderssen Variation': [
    ['…Bb6 — the bishop leaves a5 right away and backs up their pawn on d4. About half the masters play …Nge7 here, and the engine prefers it.', '…Bb6 — guards d4.'],
    ['cxd4 — with your king castled, the c-pawn is free, and every master takes back. Two pawns side by side on d4 and e4, for one pawn.', 'cxd4 — the full center, one pawn down.'],
    ["…d6 — and look: this is the same position as the main line, reached with the moves in the other order. The plan doesn't change: finish developing, then strike in the center.", '…d6 — back into the main line.'],
    ['Nc3 — as in the main line, the knight takes the square your c-pawn left, backing up e4 and covering d5.', 'Nc3 — backs up e4, covers d5.'],
    ['…Nf6 hits e4, but it stands right in front of your e-pawn. Most masters play …Na5 here, and the engine prefers …h6 or …Na5.', '…Nf6 — hits e4, invites e5.'],
    ['e5 — the move the engine wanted in the main line, played at once. The pawn hits the knight on f6 and the pawn on d6. You are clearly better.', 'e5 — hits the knight on f6.'],
    ['…dxe5 — they take, and their pawn on e5 hits d4. The natural move is to take back with the d-pawn, but then …Qxd1 trades queens, and your attack goes with them. So leave it.', "…dxe5 — hits d4; don't recapture."],
    ["Ba3 — instead of taking back, the bishop takes the a3–f8 diagonal. Now their king can't castle short: your bishop covers f8, the square it has to cross. You are clearly better.", 'Ba3 — covers f8, no castling.'],
    ['…Nxd4 — they grab a third pawn, and the knight hits your knight on f3. But it leaves their pawn on e5 loose.', '…Nxd4 — a third pawn; e5 loose.'],
    ['Nxd4 — take the knight. For a moment the material is level, and their bishop takes back on d4 next. You are clearly better.', 'Nxd4 — takes the knight.'],
    ['…Bxd4 — the bishop takes back, and look what it hits: your knight on c3, which is pinned to the rook on a1, and your f2 pawn, pinned to your king. It looks like trouble.', '…Bxd4 — hits c3, two pins.'],
    ['Nb5 — the pinned knight simply steps away, and with a threat: it hits the bishop on d4 and the pawn on c7. If they grab the rook with …Bxa1, Qxa1 takes back, and your queen lands on the long diagonal, hitting e5. You are clearly better.', 'Nb5 — out of the pin, hits d4.'],
    ["…Be6 — the bishop develops and hits your bishop on c4, offering a trade. The engine prefers …c5. Your plan: their king can't castle while your bishop covers f8, so bring the queen in with Qb3 or Qa4 and hunt it with the knight on b5.", '…Be6 — hits your bishop on c4.'],
  ],
  'Evans Gambit: Main Line with Qb3': [
    ["Castle — the masters' most common choice here, just under half of them. Your king leaves e1, so the pin on c3 is gone, and the tension on e5 can wait.", 'O-O — unpins c3, keeps the tension.'],
    ['…Bb6 — every master plays it. The bishop leaves a5 and adds a third attacker on d4, and it clears a5 for the knight: …Na5 would hit your queen and your bishop.', '…Bb6 — hits d4, clears a5.'],
    ['Nbd2 — the knight comes out to d2, and look what it guards: your bishop on c4 and your queen on b3. So when …Na5 comes, both are covered.', 'Nbd2 — guards c4 and b3.'],
    ['…exd4 — they take, two pawns up for a moment, and the pawn on d4 hits c3. But with your king castled, nothing pins c3 any more.', '…exd4 — takes, but c3 is free.'],
    ["cxd4 — take back, and there's the pair you played for: pawns on d4 and e4, for one pawn. It's about level.", 'cxd4 — d4 and e4 side by side.'],
    ["…Na5 — there it is: the knight hits your queen on b3 and your bishop on c4 at once. Both are guarded, but the queen can't stay where a knight hits it.", '…Na5 — hits the queen and bishop.'],
    ['Qc3 — the queen steps off b3 and hits the knight on a5 back, and from c3 it still guards your bishop on c4. You are a little better.', 'Qc3 — hits a5, guards c4.'],
    ["…Ne7 — the knight develops, heading for g6, and their king can castle next. It's about level, a pawn down. Your plan: a4 and a5 to chase the bishop off b6, then the rook to e1 behind your e-pawn, with d4 and e4 as the center your pawn paid for.", '…Ne7 — develops, castling next.'],
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

export const EVANS_GAMBIT_WATCH: WatchCourse = {
  openingId: 'evans-gambit',
  title: 'The Evans Gambit — A Master Class',
  orientation: 'white',
  sources: ['book:evans-gambit', 'concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
