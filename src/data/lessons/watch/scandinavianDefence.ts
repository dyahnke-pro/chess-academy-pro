// The Scandinavian Defence — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet
// (`LESSON_FACTS=1 LESSON_IDS=scandinavian-defence`): masters' percentages,
// engine lines at a fixed depth, the board after each move. The student plays
// Black. Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud
// register (§2a). One story runs through every line: …d5 settles the center on
// move one, and the piece that takes back on d5 decides the game's shape. The
// queen lines (a5, d6, d8) pay a tempo to Nc3 and get the light-squared bishop
// out before …e6; the knight lines (the Modern, the Portuguese) take back
// later, and the Icelandic gives a second pawn for time.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'Bf5', 'Bc4', 'e6', 'Bd2', 'Bb4', 'O-O', 'Nc6', 'a3', 'Bxc3', 'Bxc3', 'Qb6', 'Re1', 'O-O-O', 'Qc1', 'Nd5', 'Bxd5', 'Rxd5', 'h3', 'Rg8'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — they open with the king's pawn, the masters' most common first move, close to half their games. It takes the center and opens lines for their queen and the bishop on f1. So how do you meet it? The Scandinavian doesn't wait a single move.", 'e4 — they take the center.'],
  ["Here's the Scandinavian: …d5, straight at their pawn on e4. Look at that pawn: yours hits it, and nothing of theirs guards it. So the center gets settled on move one, before they've brought out a single piece. Is it a master favorite? Not at all: …d5 doesn't even make their top five here, and the engine prefers the two big replies, …c5 and …e5. After …d5 they are a little better. The price shows up in a moment: whatever takes back on d5 will stand in the middle of the board, and seven masters in ten use the queen.", '…d5 — strike at e4 at once.'],
  ["exd5 — nearly every master takes, and it's the engine's first choice. For a moment you're a pawn down. But look at their pawn on d5: nothing guards it. So the only question is which piece takes it back.", 'exd5 — they take; d5 is unguarded.'],
  ["…Qxd5, seven masters in ten: the queen takes back at once and the material is level. From d5 it already hits three pawns, a2, d2 and g2. But a queen in the center this early is something their pieces can hit while they develop, and you'll see that next move. About three masters in ten play …Nf6 instead and take back later with the knight; that's the Modern, on its own tab.", '…Qxd5 — pawn back, queen in the center.'],
  ["Nc3, nine masters in ten, and there's the price of the early queen: the knight develops and hits your queen on d5 in the same move. They gain a tempo, and your queen has to move again. So where does it go? The masters use three squares, a5, d6 and d8, and each one has its own line in this course.", 'Nc3 — develops, hits your queen.'],
  ["Where does the queen go? …Qa5, just over half the masters. From a5 it hits the knight on c3, and look down the diagonal toward their king on e1: only their d2 pawn stands in between. The engine prefers …Qd6, the Tiviakov, and after …Qa5 they are clearly better. But this is the masters' main road, and the next move shows why a5 matters.", '…Qa5 — eyes c3 and the e1 diagonal.'],
  ["d4, nearly eight masters in ten: the pawn takes the center. But see what it does to their knight on c3. With the pawn gone from d2, your queen on a5 now pins that knight to their king on e1. That's the point of a5: the c3 knight can't move.", 'd4 — center pawn; now c3 is pinned.'],
  ["…Nf6, three masters in four, and the engine's first choice. No tricks yet: the knight develops toward the center and covers d5 and e4. About a quarter of masters play …c6 first. Next comes the question every Scandinavian player has to answer: where does your light-squared bishop go?", '…Nf6 — develop, cover d5 and e4.'],
  ["Nf3, seven masters in ten and the engine's first choice: the knight develops and covers e5 and d4. Their knight on c3 is still pinned, so that's the piece they'll want to free.", 'Nf3 — develops; c3 still pinned.'],
  ["So, where does the bishop go? Outside the pawns, and before …e6. …Bf5 is the engine's first choice, and about three masters in ten play it. Here's why the order matters: play …e6 first and the bishop on c8 is shut in behind its own pawn. On f5 it's already out, and it hits c2. It's the same idea as …Bf5 in the Caro-Kann. Most masters play …c6 here, and …Bg4 is the other square for the bishop.", '…Bf5 — the bishop out before …e6.'],
  ["Bc4, about four masters in ten: the bishop develops and aims at f7, a pawn only your king guards. Ne5, jumping into the center, rates about the same. Their king is now one move from castling.", 'Bc4 — aims at f7.'],
  ["…e6, three masters in four and the engine's first choice. Now the pawn can come to e6, because your bishop is already outside on f5. It does two jobs: it opens the road for your bishop on f8, and it blocks the c4 bishop's line to f7.", '…e6 — frees f8, blocks the c4 bishop.'],
  ["Bd2, eight masters in ten and the engine's choice. Remember the pin on c3? The bishop steps into the diagonal between your queen and their king, so the knight on c3 is free again. So what now: keep up the pressure on c3, or shore up your position first?", 'Bd2 — breaks the pin on c3.'],
  ["Keep the pressure on: …Bb4, about half the masters and the engine's first choice. The bishop develops and hits the knight on c3 again, with your queen lined up behind it on a5. And with f8 clear, castling short is ready whenever you want it. Nearly as many masters play …c6, the solid way, on its own tab.", '…Bb4 — back at the c3 knight.'],
  ["They castle, and their king is safe on g1. The engine slightly prefers a3 first, asking your bishop the question at once. From here on, no master game in the database reaches the board, so the engine's lines are the guide.", 'O-O — their king is safe.'],
  ["…Nc6: your last minor piece comes out and hits their pawn on d4. Look at your queenside now: b8, c8 and d8 are all empty, so castling long is possible as well. Castling short rates about the same.", '…Nc6 — hits d4; both castles ready.'],
  ["a3 — the pawn hits your bishop on b4. It's about level now; the engine much prefers d5, kicking at your knight on c6. So do you retreat the bishop, or take on c3?", 'a3 — hits the bishop on b4.'],
  ["Take. If the bishop stays on b4, axb4 just takes it; if it drops back to d6, b4 comes and hits your queen on a5. The engine has both more than four pawns worse. So …Bxc3, its first choice: you give up the bishop for the knight, and it's about level.", "…Bxc3 — trade, don't retreat."],
  ["Bxc3, the engine's choice: the bishop takes back, and now it hits your queen on a5. Taking with the b-pawn would leave them doubled pawns on c2 and c3, and it rates lower. So your queen is on the move again.", 'Bxc3 — recaptures, hits your queen.'],
  ["…Qb6, the engine's clear choice: the queen steps off the diagonal and lands where it hits two pawns at once, b2 and d4. Both are guarded for now, but both are targets.", '…Qb6 — hits b2 and d4.'],
  ["Re1, as good as anything here for them: the rook takes the e-file and hits your pawn on e6, pinning it to your king on e8. That pin is a hint: your king shouldn't stay in the middle much longer.", 'Re1 — pins e6 to your king.'],
  ["Which side for the king? …O-O-O: your king steps off the e-file, so the pin on e6 is gone, and your rook lands on d8, where it pins their d4 pawn to the queen on d1. The engine prefers castling short, though, and after …O-O-O they are a little better. With the kings on opposite wings, each side can now throw pawns at the other king.", '…O-O-O — the rook pins d4.'],
  ["Qc1 — the queen steps off the d-file, so the pin on d4 is gone. The engine slightly prefers a4 first, a pawn heading for your side of the board, where your king now lives.", 'Qc1 — off the d-file, unpins d4.'],
  ["…Nd5: the knight jumps into the center and hits their bishop on c3, the piece that guards both b2 and d4. The engine prefers …Be4, going after the knight on f3 first, and after …Nd5 they are a little better.", '…Nd5 — hits the bishop on c3.'],
  ["Bxd5 — they trade off your knight with the bishop that came to c4 to aim at f7. The engine much prefers a4, and after the trade it's about level. Their bishop on d5 has no guard, so you simply take it back. But with what?", 'Bxd5 — trades; take back on d5.'],
  ["…Rxd5, the engine's first choice: the rook takes back and stands in the middle of the board, hitting the pawn on d4. Taking with the e-pawn rates a little lower. A rook on the fifth rank, right in front of their center: that's an active rook.", '…Rxd5 — the rook hits d4.'],
  ["h3, the engine's first choice: a quiet move that takes g4 away from your bishop on f5. But a pawn on h3 is also something to aim at. Keep that in mind for your next move.", 'h3 — takes g4 away.'],
  ["…Rg8, the engine's first choice, and now you are a little better. Why the g-file? The kings are on opposite sides, yours on c8 and theirs on g1, so your rook belongs behind your g-pawn. Your plan from here: push …g5 and …g4 at the h3 pawn and their king, while your rook on d5 keeps d4 under fire.", '…Rg8 — the g-pawn storm is next.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the lines already written don't share. */
type TabBeats = Array<[string, string]>;

/** Filed in this order: each tab's beats start where the lines before it end. */
const TAB_LINES: Record<string, string[]> = {
  'Qa5 Main Line': ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'Bf5', 'Bc4', 'e6', 'Bd2', 'c6', 'Qe2', 'Bb4', 'O-O-O', 'Nbd7', 'Kb1', 'O-O'],
  'Nf6 Modern Variation': ['e4', 'd5', 'exd5', 'Nf6', 'd4', 'Nxd5', 'Nf3', 'g6', 'Be2', 'Bg7', 'O-O', 'O-O', 'c4', 'Nb6', 'Nc3', 'Nc6', 'd5', 'Na5', 'c5', 'Bxc3', 'bxc3', 'Nxd5', 'Qd4', 'Nc6'],
  'Icelandic Gambit': ['e4', 'd5', 'exd5', 'Nf6', 'c4', 'e6', 'dxe6', 'Bxe6', 'd4', 'Bb4+', 'Bd2', 'Qe7', 'Bxb4', 'Qxb4+', 'Qd2', 'Nc6', 'd5', 'O-O-O', 'Nc3', 'Bg4', 'f3', 'Rhe8+', 'Be2', 'Bf5'],
  'Qd6 Tiviakov Variation': ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qd6', 'd4', 'Nf6', 'Nf3', 'a6', 'g3', 'Bg4', 'Bg2', 'Nc6', 'O-O', 'O-O-O', 'd5', 'Ne5', 'Bf4', 'Nxf3+', 'Bxf3', 'Bxf3'],
  'Portuguese Variation': ['e4', 'd5', 'exd5', 'Nf6', 'd4', 'Bg4', 'Be2', 'Bxe2', 'Qxe2', 'Qxd5', 'Nf3', 'e6', 'O-O', 'Nc6', 'c4', 'Nxd4', 'Nxd4', 'Qxd4', 'Rd1', 'Qg4', 'f3', 'Qf5'],
  'Gubinsky-Melts (3...Qd8)': ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qd8', 'd4', 'Nf6', 'Nf3', 'Bg4', 'Bc4', 'e6', 'h3', 'Bh5', 'O-O', 'c6', 'Bg5', 'Be7', 'Re1', 'O-O', 'Qd3', 'Nbd7', 'Ne5', 'Nxe5'],
  'Qa5 with Bd2 Main Line': ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Bd2', 'Bg4', 'Be2', 'Bxe2', 'Ngxe2', 'Nc6', 'O-O', 'O-O-O', 'Ne4', 'Qf5', 'Nxf6', 'gxf6', 'c3', 'Rg8'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Qa5 Main Line': [
    ["Shore up first: …c6, nearly half the masters, the solid way. The pawn covers b5 and d5, two squares their knight on c3 would like, and it opens c7 as a retreat for your queen. The engine prefers …Bb4, the main line, and after …c6 they are a little better.", '…c6 — solid; c7 for the queen.'],
    ["Qe2 — the queen pins your e6 pawn to your king on e8, and it clears d1, so they can castle long. The engine prefers Ne4, challenging your knight on f6; after Qe2 they are a little better.", 'Qe2 — pins e6; castling long next.'],
    ["…Bb4, the engine's first choice: the bishop hits the knight on c3, with your queen lined up behind it, and it clears f8 so you can castle short. Now watch which way their king goes.", '…Bb4 — hits c3, clears f8.'],
    ["They castle long, and their king goes to c1, on the queenside, the same side where your queen and bishop already stand. Their rook comes to d1, behind the d4 pawn. a3 and Ne5 rate about the same.", 'O-O-O — their king goes queenside.'],
    ["…Nbd7, the engine's first choice: your last minor piece develops and backs up the knight on f6. Why d7 and not c6? Your c-pawn already stands on c6.", '…Nbd7 — the last piece comes out.'],
    ["Kb1 — the king steps deeper into the corner. But look where it lands: on your bishop's diagonal. Your bishop on f5 now pins their c2 pawn to the king on b1. a3 rates about the same.", 'Kb1 — into the pin from f5.'],
    ["…O-O, the engine's first choice, and your king is safe on g8, on the other wing from theirs. Your plan from here: roll your queenside pawns at their king with …b5 and …b4, while your queen on a5 and your bishop on f5 already point at that side.", '…O-O — then …b5 and …b4.'],
  ],
  'Nf6 Modern Variation': [
    ["…Nf6 — the Modern Scandinavian, about three masters in ten, and the engine's first choice. Why not take with the queen? Because Nc3 would hit it. So the knight hits the pawn on d5 instead, which has no guard, and you'll take it back with a piece. No early queen, no tempo handed over.", '…Nf6 — win d5 back with the knight.'],
    ["d4, about half the masters, and the engine's first choice. They don't try to hold on to the pawn: the d-pawn takes the center instead, and d5 is left for you. Holding it with c4 leads to the Icelandic Gambit tab.", 'd4 — the center first; d5 is yours.'],
    ["…Nxd5, two masters in three: the pawn is back, and your knight stands in the center. Playing …Bg4 first is the Portuguese, on its own tab. Enjoy the knight on d5 while it lasts: c4 will come to kick it sooner or later.", '…Nxd5 — pawn back, knight in the center.'],
    ["Nf3, about half the masters and the engine's first choice: the knight develops and covers e5. Four masters in ten push c4 at once; here they develop first and keep c4 for later.", 'Nf3 — develops; c4 can wait.'],
    ["…g6, about six masters in ten. You're preparing the fianchetto: the bishop goes to g7, on the long diagonal, aimed at d4. It's the Grünfeld idea: no pawn of yours in the center, just pieces pointed at theirs.", '…g6 — the bishop is heading for g7.'],
    ["Be2, about a third of masters: a modest square, but it clears the way to castle. More masters push c4 here first, to kick your knight. After Be2 they are clearly better.", 'Be2 — modest; castling next.'],
    ["…Bg7, every master: the bishop lands on the long diagonal and already hits d4. Their knight on f3 and their queen guard it, so nothing hangs. But that pawn is now your target, and every piece you add raises the pressure.", '…Bg7 — the long diagonal hits d4.'],
    ["They castle, nine masters in ten. c4, kicking your knight, rates a little higher, and it's still coming.", 'O-O — their king tucked away.'],
    ["…O-O, nearly every master: your king joins the bishop on the kingside. The engine prefers …e6 first, so that your knight on d5 has a pawn guarding it before c4 arrives. After …O-O they are a little better.", '…O-O — king safe; …e6 was better.'],
    ["c4 — there it is: the pawn hits your knight on d5, and the knight has to go. Now they have two pawns side by side on c4 and d4, and they are clearly better. A big center, yes, but your bishop on g7 and your knights will spend the next moves hitting it.", 'c4 — kicks the knight off d5.'],
    ["Where does the knight go? …Nb6, the engine's first choice: from b6 it hits the c4 pawn, which their bishop on e2 guards. Dropping back to f6 rates lower.", '…Nb6 — hits c4.'],
    ["Nc3, the engine's first choice: the knight develops and covers d5 and e4, the squares in front of their pawns. Only their bishop on c1 is still at home.", 'Nc3 — covers d5 and e4.'],
    ["…Nc6, the engine's first choice. Now count d4: your knight on c6, your bishop on g7 and your queen on d8 all hit it, and only their knight on f3 and their queen guard it. Three against two, so they have to do something about it right now.", '…Nc6 — three pieces on d4.'],
    ["d5 — the engine's choice, by more than a pawn over anything else. The pawn steps out of the pressure on d4 and hits your knight on c6. They are clearly better, and your knight has to find a new square.", 'd5 — escapes, hits your knight.'],
    ["…Na5 — the knight hits c4, joining the knight on b6. Count c4 now: two knights hit it, and only the bishop on e2 guards it. But on a5 the knight sits on the rim, and the engine prefers …Ne5, offering a trade in the center. After …Na5 they are clearly better.", '…Na5 — two knights on c4.'],
    ["c5, by far the engine's choice: the pawn escapes the double attack by stepping forward, and it hits your knight on b6. Any slower move lets your knight take on c4. Both your knights are on the edge now. Is there a way out?", 'c5 — escapes and hits b6.'],
    ["Yes: …Bxc3, the engine's first choice. Your bishop takes the knight on c3, one of the two pieces guarding d5. Here's the point: your knight on b6 is attacked by the c5 pawn, and if they take back, it escapes by capturing on d5.", '…Bxc3 — removes a guard of d5.'],
    ["bxc3, and taking your knight on b6 instead rates about the same. Look at their pawns now: doubled on c3 and c5. And d5 has lost its knight, so it's down to one guard, their queen on d1.", 'bxc3 — doubled c-pawns.'],
    ["…Nxd5, the engine's first choice: your knight escapes the c5 pawn by taking on d5, and now you're a pawn up. Your queen on d8 guards it, and it hits c3, which nothing guards. Still, they are clearly better: with your bishop gone from g7, their bishop on c1 has a clear road to h6, right next to your king.", '…Nxd5 — a pawn up, eyes c3.'],
    ["Qd4 — the queen comes to the center and hits your knight on d5. The engine much prefers Bh6, hitting your rook on f8, and after Qd4 they are only a little better.", 'Qd4 — hits your knight on d5.'],
    ["…Nc6, the engine's first choice: your knight on a5 comes back into the game with a hit on their queen on d4. You're a pawn up, and they are a little better. Your plan from here: when their queen moves away, the c3 pawn loses its last guard and your knight on d5 takes it; then a pawn on e6 shelters your king.", '…Nc6 — hits the queen; c3 next.'],
  ],
  'Icelandic Gambit': [
    ["c4, about one master in eight: they try to keep the extra pawn, and the c-pawn now guards d5. The engine prefers d4, and after c4 it's about level. So do you chase the pawn on d5? No. You offer them another one.", 'c4 — they hold on to d5.'],
    ["…e6 — the Icelandic Gambit, nearly half the masters. Your e-pawn hits d5, and if they take on e6, you take back with your bishop and come out fast. That's the bargain: a pawn for open lines and quick development while their king is still on e1. The engine prefers the quieter …c6, and after …e6 they are a little better, so the time you gain has to be used.", '…e6 — a second pawn offered.'],
    ["dxe6, two masters in three: they take, and you're two pawns down for a moment. Their pawn on e6 hits f7, but nothing guards it. Take it back at once.", 'dxe6 — two pawns down, briefly.'],
    ["…Bxe6, every master: the bishop takes back and develops in one move, and from e6 it hits the c4 pawn, which their bishop on f1 guards. One pawn down, but count the developed pieces: you have two, they have none.", '…Bxe6 — develops with a hit on c4.'],
    ["d4, about three masters in ten: the pawn takes the center. But look at the diagonal from b4 to e1: with the pawn gone from d2, it's empty all the way to their king. The engine prefers Nf3, and after d4 it's about level.", 'd4 — opens the b4–e1 diagonal.'],
    ["…Bb4+, nearly every master, and the engine's choice by a long way: your bishop develops with check, down the diagonal d4 just opened. In a gambit, this is the best kind of move: it brings a piece out and costs them a move to answer.", '…Bb4+ — develop with check.'],
    ["Bd2 blocks the check and offers a trade of bishops; Nc3 rates about the same. Their bishop on d2 is pinned to their king, but it can still take yours on b4.", 'Bd2 — blocks, offers a bishop trade.'],
    ["…Qe7: the queen backs up your bishop on b4, so after a trade there your queen takes back. But here the engine prefers to take first, …Bxd2+, and after …Qe7 it's about level.", '…Qe7 — backs up the b4 bishop.'],
    ["Bxb4: they trade, and their bishop on b4 now hits your queen on e7. It has no guard, though, so you simply take it back. The engine prefers Be2, developing first, and after Bxb4 it's about level.", 'Bxb4 — the trade on b4.'],
    ["…Qxb4+, with check: the queen takes back, and from b4 it hits their king, the pawn on c4 and the pawn on b2, which has no guard. Still a pawn down, but you are a little better.", '…Qxb4+ — check, hits b2 and c4.'],
    ["Qd2 blocks the check and offers to trade queens; Nc3 rates about the same. Their queen on d2 is pinned to their king on e1 by yours, but it hits your queen on b4 too. So do you trade?", 'Qd2 — blocks, offers a queen trade.'],
    ["No: …Nc6, the engine's choice by a long way. The knight develops and hits their d4 pawn, and the queens stay on. With a pawn less, you want pieces on the board, not off it. You are a little better.", '…Nc6 — develop, keep the queens on.'],
    ["d5 — the pawn forks your knight on c6 and your bishop on e6. The engine prefers Nc3 for them, and after d5 you are still a little better. Should you save one of the pieces? Neither. There's a stronger move.", 'd5 — hits c6 and e6.'],
    ["…O-O-O, the engine's choice by a long way, and here's the point: your rook lands on d8 and pins the d5 pawn to their queen on d2. If that pawn takes your knight or your bishop, your rook takes their queen. So the pawn can't take either piece without dropping the queen, and your king is safe on c8.", '…O-O-O — the rook pins d5.'],
    ["Nc3, the engine's first choice: the knight develops, gives d5 a second guard, and blocks your queen's line to their king, so their queen isn't pinned any more. They're untangling, so keep the pressure on.", 'Nc3 — guards d5, blocks the pin.'],
    ["…Bg4: the bishop steps off e6, out of reach of the d5 pawn, and looks at e2 and d1, the squares next to their king. The engine prefers …Ne5, heading for c4 to win the pawn back, and after …Bg4 you are a little better.", '…Bg4 — out of reach, eyes e2.'],
    ["f3 kicks your bishop, and b3 rates about the same. But look at the e-file: there isn't a pawn on it from e1 to e8, and their king is still sitting on e1. Before your bishop moves, is there something better?", 'f3 — kicks the bishop on g4.'],
    ["Yes: …Rhe8+, the engine's choice by a long way. The rook comes to the open e-file with check, and they have to answer it before they can take your bishop. Moving the bishop off g4 first rates more than a pawn worse. When a piece is attacked, look for a check first.", '…Rhe8+ — check first, bishop later.'],
    ["Be2 blocks the check, and it's their only good move: stepping the king to d1 rates more than a pawn and a half worse. But now their bishop on e2 is pinned to the king by your rook on e8, and the d5 pawn is still pinned to their queen. Your bishop on g4 is still attacked by the f3 pawn, though.", 'Be2 — blocks, but now it is pinned.'],
    ["…Bf5, the engine's first choice: the bishop steps back to f5, still on an active diagonal. It's about level: a pawn down, but their bishop and their d5 pawn are both pinned, and their king is still in the middle. Your plan from here: …Na5 and then …Nxc4 win back the pawn, while your rooks stay on the d- and e-files, where their queen and king stand.", '…Bf5 — next …Na5, going for c4.'],
  ],
  'Qd6 Tiviakov Variation': [
    ["…Qd6 — the Tiviakov, nearly four masters in ten, and the engine's first choice. The queen steps back only one square and stays central, hitting d2 down the file and h2 down the diagonal. One thing to watch on d6: a knight landing on b5 would hit it.", '…Qd6 — central, but watch b5.'],
    ["d4, nine masters in ten and the engine's first choice: the pawn takes the center and opens a diagonal for their bishop on c1, a diagonal that runs to f4, where the bishop would hit your queen on d6.", 'd4 — the center, and Bf4 ideas.'],
    ["…Nf6, nearly nine masters in ten and the engine's first choice: the knight develops and covers d5 and e4. Your queen is fine for now, so you simply develop.", '…Nf6 — simple development.'],
    ["Nf3, three masters in four: the knight develops and covers e5. Now look at b5: their knight on c3 could jump there and hit your queen on d6 and the pawn on c7 at once.", 'Nf3 — and Nb5 is in the air.'],
    ["…a6, the masters' most common move here, about four in ten. It's prophylaxis: the pawn takes b5 away from their knight, so your queen can't be hit from there. The engine prefers …g6, getting on with development, and after …a6 they are clearly better.", '…a6 — prophylaxis, b5 covered.'],
    ["g3, about half the masters and the engine's first choice: their bishop is heading for g2, on the long diagonal. The pawn also blocks your queen's diagonal at g3, so h2 is out of its reach now.", 'g3 — Bg2 next; h2 is shut off.'],
    ["…Bg4, seven masters in ten and the engine's first choice: the bishop comes out and pins their knight on f3 to the queen on d1. That knight guards d4, so the pin is pressure on their center.", '…Bg4 — pins the f3 knight.'],
    ["Bg2, about two masters in three: the bishop takes the long diagonal and backs up the knight on f3. The engine prefers h3 first, putting the question to your bishop on g4; after Bg2 they are a little better, and your pin is still on.", 'Bg2 — the long diagonal; h3 was stronger.'],
    ["…Nc6, more than eight masters in ten: the knight comes out and hits d4. Count it: your knight and your queen on d6 both hit d4. Their guards are the queen on d1 and the knight on f3, the one your bishop pins. And with b8, c8 and d8 now clear, you can castle long. After …Nc6 they are clearly better.", '…Nc6 — two attackers on d4.'],
    ["They castle short, and their king is tucked away on g1. The engine slightly prefers Bf4, hitting your queen, but castling costs them little. So, where does your king go?", 'O-O — their king on g1.'],
    ["Long: …O-O-O, the engine's first choice. Your king goes to c8, and the rook lands on d8, behind your queen. That's a battery on the d-file, queen in front and rook behind, aimed at d4.", '…O-O-O — a battery aimed at d4.'],
    ["d5 — the pawn steps out of the pressure on d4 and hits your knight on c6. The engine much prefers h3, and after d5 they are only a little better.", 'd5 — escapes, kicks the knight.'],
    ["Where does the knight go? …Ne5, the engine's first choice: into the center, where it hits the knight on f3 a second time. That's the knight already pinned to their queen. Taking on d5 instead rates a little lower.", '…Ne5 — a second hit on f3.'],
    ["Bf4 — the bishop hits your knight on e5 and pins it to your queen on d6. The engine much prefers Nxe5, taking your knight at once; after Bf4 it's about level. Now both sides have a knight pinned to a queen. Who cashes in first?", 'Bf4 — pins your knight on e5.'],
    ["You do: …Nxf3+, taking the pinned knight on f3 with check. Your own knight was pinned to your queen on d6 too, but it's check, so they have no time to take that queen. Taking with the bishop first rates about the same.", '…Nxf3+ — capture with check.'],
    ["Bxf3, the engine's choice: the bishop takes back, and now it hits your bishop on g4. And look at f4: with your knight gone from e5, their bishop there hits your queen on d6. Taking back with the queen instead rates more than four pawns worse.", 'Bxf3 — and now your queen is hit.'],
    ["…Bxf3, and now your bishop on f3 hits their queen on d1, while their bishop on f4 hits your queen on d6. The engine prefers …Qd7 first, stepping off that diagonal, and after …Bxf3 they are a little better. Your plan from here: when their queen takes back on f3, block the f4 bishop's line to your queen with …e5, then put your rooks to work on the d-file.", '…Bxf3 — then …e5 blocks the bishop.'],
  ],
  'Portuguese Variation': [
    ["…Bg4 — the Portuguese, three masters in ten. You leave the pawn on d5 for now and bring the bishop out first, with a hit on their queen on d1. Is it a real gambit? The pawn on d5 has no guard, so you plan to take it back later. The engine prefers simply …Nxd5, and after …Bg4 they are a little better.", '…Bg4 — hit the queen first, d5 later.'],
    ["Be2, a quarter of the masters: the bishop blocks and offers a trade. The engine prefers f3, hitting your bishop and keeping pieces on; after Be2 they are only a little better. And look: their pawn on d5 still has nothing guarding it.", 'Be2 — blocks; d5 is still loose.'],
    ["…Bxe2, every master: you trade bishops, and yours on e2 hits their queen, so they have to take back right away.", '…Bxe2 — trade the bishops.'],
    ["Qxe2, about eight masters in ten: the queen takes back and lands on the e-file, pinning your e7 pawn to your king. Taking with the knight rates lower. And the d5 pawn is still there for you.", 'Qxe2 — pins e7; d5 still loose.'],
    ["…Qxd5, every master: the pawn is back and the material is level. Compare the main line: there Nc3 came with a hit on your queen. Here their knights are still at home, so your queen sits in the center untouched, hitting a2, d4 and g2, and d4 and g2 have no guard.", '…Qxd5 — pawn back, queen untouched.'],
    ["Nf3, every master: one move fixes two problems. The knight guards d4, and it blocks your queen's diagonal to g2. It's about level now.", 'Nf3 — guards d4, shields g2.'],
    ["…e6, the engine's first choice: the pawn opens a road for your bishop on f8 and gets your king ready to castle. It's pinned to your king along the e-file for now, which is one more reason to castle soon.", '…e6 — frees f8; castle next.'],
    ["They castle. The engine prefers Nc3, developing with a hit on your queen first, and after castling it's about level. Their king is safe; the pawn to watch is d4, guarded only by the knight on f3.", 'O-O — Nc3 was stronger.'],
    ["…Nc6, the engine's first choice: the knight develops and hits d4. Count it now: your knight and your queen both hit d4, and only their knight on f3 guards it. They have to deal with that.", '…Nc6 — two on d4, one guard.'],
    ["c4 hits your queen, and it looks natural, but it's a mistake: it does nothing for d4. Rd1, guarding the pawn, was the engine's move, and after c4 you are clearly better. Your queen is attacked, so does it have to move? Look at d4 first.", 'c4 — hits the queen, forgets d4.'],
    ["…Nxd4 — there's the punishment, and it's the engine's first choice. Your knight takes the d4 pawn and hits their queen on e2. If they take your queen with the c-pawn, your knight takes theirs with check. So they have to take back on d4, and then your queen takes back too.", '…Nxd4 — wins the d4 pawn.'],
    ["Nxd4, their only good move: everything else rates nearly two pawns worse. The knight takes back, and it stands on d4 with no guard, right in front of your queen.", 'Nxd4 — forced, and unguarded.'],
    ["…Qxd4, the engine's first choice, and you're a clean pawn up. Your queen on d4 hits b2, c4 and f2, and it pins the f2 pawn to their king on g1. You are a little better.", '…Qxd4 — a clean pawn up.'],
    ["Rd1 — the rook hits your queen on d4, which has no guard. The engine prefers Nc3, developing first, and after Rd1 you are clearly better. Your queen has to move. Can it move with a threat?", 'Rd1 — hits your queen.'],
    ["Yes: …Qg4, the engine's first choice. The queen steps away and hits their queen on e2, which has no guard, and the pawn on c4, and it pins g2 to their king. A pawn up, you're happy to trade queens.", '…Qg4 — offers the queen trade.'],
    ["f3, the engine's first choice for them: the pawn kicks your queen and blocks the diagonal between the two queens, so there's no trade. They're the ones a pawn down, so they keep the queens on.", 'f3 — kicks the queen, avoids the trade.'],
    ["…Qf5, the engine's first choice: the queen stays active and hits the knight on b1 and the pawn on f3. You are clearly better, a clean pawn up. Your plan from here: castle, and bring your bishop to c5, where it looks straight down the diagonal at their king on g1 now that f2 is empty.", '…Qf5 — next …Bc5 and castle.'],
  ],
  'Gubinsky-Melts (3...Qd8)': [
    ["…Qd8 — the queen goes all the way home, one master in ten. It looks like a wasted move, and it does cost time. But on d8 your queen is out of reach of their developing moves, so the rest of your pieces can come out in peace. The engine's first choice, …Qd6, rates only slightly higher.", '…Qd8 — back home, out of reach.'],
    ["d4, more than eight masters in ten: the pawn takes the center. Notice your queen on d8 looks straight down the open d-file at it, with their queen behind it on d1.", 'd4 — your queen faces it.'],
    ["…Nf6, more than eight masters in ten and the engine's first choice: the knight develops and covers d5 and e4. Next comes the same question as always in the Scandinavian: the light-squared bishop, before …e6.", '…Nf6 — then the bishop.'],
    ["Nf3, about six masters in ten and the engine's first choice: the knight develops and guards d4. That knight is about to become your bishop's target.", 'Nf3 — guards d4.'],
    ["…Bg4, about half the masters and the engine's first choice: the bishop comes out before …e6 and pins the knight on f3 to their queen. That's the knight guarding d4, the pawn your queen is already looking at.", '…Bg4 — pins the d4 guard.'],
    ["Bc4 — rare among masters, who mostly put the question to your bishop with h3. Their bishop develops and aims at f7, a pawn only your king guards.", 'Bc4 — the bishop points at f7.'],
    ["…e6, the engine's first choice. Just as in the main line, the pawn comes to e6 only once your bishop is out: it opens the road for the f8 bishop and blocks the c4 bishop's line to f7.", '…e6 — the bishop is already out.'],
    ["h3, the engine's first choice: the pawn hits your bishop on g4. So, take on f3, or keep the pin?", 'h3 — asks the g4 bishop.'],
    ["Keep it: …Bh5, the engine's first choice, though most masters take on f3. From h5 the bishop still pins the knight to their queen, and you keep your bishop instead of handing them the two bishops.", '…Bh5 — keep the pin.'],
    ["They castle, and their king leaves the center. The engine slightly prefers Qe2, but castling costs little, and your pin on f3 is still there.", 'O-O — king to g1.'],
    ["…c6, the engine's first choice: a quiet pawn move that takes b5 and d5 away from their knight on c3 and gives your queen the c7 square. Solid first, active later.", '…c6 — covers b5 and d5.'],
    ["Bg5 — their bishop pins your knight on f6 to your queen on d8, the same trick you're playing on f3. The engine prefers Re1, and after Bg5 it's about level. How do you break the pin?", 'Bg5 — pins your knight on f6.'],
    ["…Be7, the engine's first choice: the bishop steps in between, so your knight on f6 is no longer pinned to the queen. And with f8 clear, you can castle next.", '…Be7 — breaks the pin.'],
    ["Re1, the engine's first choice: the rook takes the e-file and lines up on your e6 pawn, with your bishop and your king behind it on the same file. Time to get the king off it.", 'Re1 — the e-file, at e6.'],
    ["…O-O: your king is safe on g8, and the engine rates it level with …Nbd7. Among your minor pieces, only the knight on b8 is still at home.", '…O-O — king safe.'],
    ["Qd3 lines up on h7, but it's a mistake: the engine prefers Be2, and after Qd3 you are a little better. Here's why. With the queen gone from d1, d4 has two guards, the queen on d3 and the knight on f3, and you can take the knight. Trade it off with …Bxf3, and when their queen takes back, neither guard is left on d4.", 'Qd3 — a slip; d4 gets weak.'],
    ["…Nbd7 develops your last minor piece, but it misses the shot: …Bxf3 first, and after their queen takes back, your queen takes d4. The engine much prefers that, and after …Nbd7 it's about level. Now your knight on d7 stands between your queen and d4.", '…Nbd7 — …Bxf3 was the shot.'],
    ["Ne5, the engine's first choice: with their queen gone from d1, the knight on f3 isn't pinned any more, so it jumps into e5. From there it hits your knight on d7 and the pawns on c6 and f7.", 'Ne5 — free of the pin, hits d7.'],
    ["…Nxe5: you trade off the knight that just jumped in, and yours on e5 now hits their queen on d3 and the bishop on c4. It has no guard, so they take back with the d-pawn, and it's about level. Your plan from here: after the recapture, put your other knight on d5, where your pawns on c6 and e6 hold it, and meet a trade of the dark-squared bishops by taking back with your queen.", '…Nxe5 — then …Nd5.'],
  ],
  'Qa5 with Bd2 Main Line': [
    ["Bd2 at once, fewer than one master in ten: the bishop steps in front of their king, so the knight on c3 isn't pinned any more. The engine much prefers Nf3, and after Bd2 it's about level. Keep an eye on that knight: the bishop stands right behind it on the diagonal to your queen.", 'Bd2 — unpins c3 right away.'],
    ["…Bg4, about four masters in ten: the bishop comes out with a hit on their queen on d1. With no knight on f3 there's nothing to pin, so it's a direct attack, and they have to answer it. The engine prefers …Qb6, hitting b2, and after …Bg4 they are clearly better.", '…Bg4 — hits the queen on d1.'],
    ["Be2, about one master in six: the bishop blocks and offers a trade. The engine prefers f3, kicking your bishop instead, and after Be2 it's about level.", "Be2 — blocks the bishop's attack."],
    ["…Bxe2, nearly every master: you take, and your bishop on e2 hits their queen, so they must take back. The real question is with which piece.", '…Bxe2 — trade; they must recapture.'],
    ["Ngxe2 — the g1 knight takes back. The engine prefers taking with the c3 knight, and after Ngxe2 you are a little better. Look at d4: the bishop on d2 blocks their queen's view of it, so the knight on e2 is its only guard.", 'Ngxe2 — d4 has one guard now.'],
    ["…Nc6, the engine's first choice: the knight hits d4, guarded only by the knight on e2. And with b8, c8 and d8 empty, you can castle long and bring a rook to the d-file too.", '…Nc6 — hits d4; castle long next.'],
    ["They castle short, the engine's first choice, and their king goes to g1. So which side for yours?", 'O-O — their king on g1.'],
    ["…O-O-O, the engine's first choice: your king goes to c8, the opposite side from theirs, and your rook lands on d8, a second piece aimed at d4.", '…O-O-O — the rook joins on d4.'],
    ["Ne4, the engine's choice by a long way, and it's a discovered attack. The knight leaves c3, and that uncovers the bishop on d2: it now hits your queen on a5. The knight hits your knight on f6 at the same time. But look at e4: the knight there has no guard.", 'Ne4 — a discovered attack on a5.'],
    ["…Qf5: your queen steps off the bishop's diagonal and hits the loose knight on e4 on the way. Now that knight is attacked twice, by your queen and your knight, and nothing guards it. …Qd5 rates about the same.", '…Qf5 — hits the loose e4 knight.'],
    ["Nxf6 — they trade their attacked knight for yours. The engine prefers Ng5, keeping the knight in play, and after Nxf6 you are a little better. Their knight on f6 has no guard, so take it back. With a pawn, or the queen?", 'Nxf6 — trades knights.'],
    ["…gxf6, the engine's first choice by a long way; taking with the queen rates far lower. Yes, your pawns are doubled on f6 and f7. But look what you get: the g-file is open, right in front of their king on g1, and your own king is safe on the other wing.", '…gxf6 — the g-file opens.'],
    ["c3, the engine's first choice: the pawn gives d4 a solid guard. Now two of theirs hold d4, the knight on e2 and the c3 pawn, against your knight and rook.", 'c3 — d4 is held twice.'],
    ["…Rg8: the rook takes the open g-file and pins the g2 pawn to their king on g1. The engine prefers …e5 first, a pawn hitting d4 a third time, and after …Rg8 it's about level. Your plan from here: …e5 to break open d4, and …h5 to bring another pawn toward their king, with your rook on g8 and your queen on f5 already aimed at that side.", '…Rg8 — the g-file, at their king.'],
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

export const SCANDINAVIAN_DEFENCE_WATCH: WatchCourse = {
  openingId: 'scandinavian-defence',
  title: 'The Scandinavian Defence — A Master Class',
  orientation: 'black',
  sources: ['book:scandinavian-defence', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
