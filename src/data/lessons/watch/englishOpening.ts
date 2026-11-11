// The English Opening — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=english-opening`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays White. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a). One story runs through the course: c4
// fights for d5 from the side, against …e5 it is a Sicilian with the colors
// reversed and you a move up, and the bishop on g2 looks down the long
// diagonal at d5 and b7 — every time the knight on f3 moves, that diagonal
// opens. In the main line the fight is the e4 pawn, then the f5 square.
import type { WatchCourse } from './watchCourse';

const MAIN = ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6', 'g3', 'Bb4', 'Bg2', 'O-O', 'O-O', 'e4', 'Ng5', 'Bxc3', 'bxc3', 'Re8', 'f3', 'exf3', 'Nxf3', 'Qe7', 'e3', 'd6', 'd3', 'Ne5', 'Nh4', 'Ng6', 'Nf5', 'Qe5', 'd4', 'Qe6', 'Qd3', 'Ne4', 'h4', 'h5', 'a4', 'Nf8', 'Rf4', 'Qxf5', 'Rxf5', 'Bxf5', 'Qe2', 'g6'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["c4, the English. Why the c-pawn? It hits d5 from the side, and if they meet you in the center with …e5, you're playing a Sicilian with the colors reversed, and a full move up. Only about seven masters in a hundred start this way, and the engine prefers e4, but it's about level. Keep the plan in mind from the very first move: Nc3, g3, and a bishop on g2, aimed down the long diagonal at d5 and b7.", 'c4 — the English, hits d5 from the side.'],
  ["…e5, a quarter of the masters; …Nf6 is a little more common. Now look at the structure: their pawn on e5 against yours on c4 is a Sicilian turned around, with your c-pawn playing the part of their …c5. Same ideas, but you're the one with the extra move. The pawn takes d4 and f4 under control, so your d-pawn won't get to d4 cheaply.", '…e5 — a Sicilian, colors reversed.'],
  ["Nc3, about six masters in ten; g3 first is the other road, about a third. Count the guards on d5: your c-pawn, and now this knight. That square is what the whole English is fighting for.", 'Nc3 — a second guard on d5.'],
  ["…Nf6, close to six masters in ten. The knight covers d5 and e4, exactly the two squares your knight on c3 is looking at. Every piece in this opening argues about those two squares.", '…Nf6 — contests d5 and e4.'],
  ["Nf3, seven masters in ten, and it comes with a hit: the knight attacks the e5 pawn, and nothing guards it yet. So their next move more or less chooses itself.", 'Nf3 — hits the loose e5 pawn.'],
  ["…Nc6, almost every master: the knight guards e5, and now all four knights are out. This is the English Four Knights.", '…Nc6 — guards e5, four knights out.'],
  ["Where does your king's bishop belong? g3, close to half the masters, makes room for it on g2, where it looks down the long diagonal toward d5 and b7. Right now your own knight on f3 is in its way. Remember that: every time that knight moves, the diagonal opens.", 'g3 — the bishop heads for g2.'],
  ["…Bb4, a third of the masters. The most common move is …d5, about half, and it has its own tab, the Reversed Sicilian. The bishop hits your knight on c3, the piece that watches d5 and e4, and the idea is plain: take it, and your c-pawns end up doubled.", '…Bb4 — hits the c3-knight.'],
  ["Do you have to do anything about it? No. Bg2, about seven masters in ten, and the engine agrees: if …Bxc3 comes, a pawn takes back on c3, toward the center, and you keep the two bishops. Nd5, chasing the bishop, is the other try, about a quarter of the masters.", 'Bg2 — fianchetto done, castle next.'],
  ["…O-O, nine masters in ten: their king is safe before anything opens in the center, and the rook comes to f8.", '…O-O — king safe.'],
  ["You castle too, nine masters in ten, the king tucked in behind the bishop on g2. Now watch their e-pawn: it's one step from e4, where it would hit your knight on f3.", 'O-O — king safe; watch …e4.'],
  ["…e4, and there it is: the pawn hits your knight on f3, and the line leaves the masters' games. Notice the order: they kick the knight before taking on c3, because the capture on c3 isn't going anywhere. So where does the knight go?", '…e4 — kicks the knight on f3.'],
  ["Ng5, the engine's choice over the passive Ne1. Look at what the knight does on g5: it hits e4, f7 and h7, and by leaving f3 it opens your bishop's diagonal. Now count e4: your knights on c3 and g5 and the bishop on g2 all hit it, and only the knight on f6 guards it.", 'Ng5 — e4 is hit three times.'],
  ["…Bxc3, and now you see why they take: the knight on c3 was one of the pieces hitting e4. And the bishop on c3 hits b2 and d2, with your rook on a1 standing behind b2, so you have to take back.", '…Bxc3 — removes an attacker of e4.'],
  ["Which pawn takes? The b-pawn, toward the center, where on c3 it covers d4. dxc3 would take back away from the middle, and the engine rates it about a third of a pawn worse. The price is a pair of doubled c-pawns; the prize is the two bishops and a half-open b-file.", 'bxc3 — toward the center, two bishops.'],
  ["…Re8: the rook stands behind the e4 pawn and guards it. Two attackers, your knight on g5 and the bishop on g2, against two guards, the knight on f6 and this rook. The pawn holds, for now. You need one more piece on e4.", '…Re8 — a second guard on e4.'],
  ["So where does the extra attacker come from? The engine prefers Qc2, and that move has its own tab, the Four Knights. f3 is the direct way: the pawn hits e4, and if they take, your rook on f1 gets a half-open f-file.", 'f3 — hits e4, opens the f-file.'],
  ["…exf3: they take, and the pawn on f3 hits your e2 pawn and the bishop on g2 at the same time. There's nothing to think about here: you take back right away.", '…exf3 — hits e2 and the g2-bishop.'],
  ["But with what? The knight. Nxf3 brings it back to the center, where it covers d4 and e5. exf3 would block your own bishop on g2, and the engine rates it a third of a pawn worse. And now there's no pawn of yours on the f-file, so your rook on f1 has a road.", 'Nxf3 — back to the center.'],
  ["…Qe7, and look down the e-file: the queen hits your e2 pawn, with the rook on e8 lined up behind it. Your queen on d1 is the only guard, so …Qxe2 is the threat.", '…Qe7 — hits e2, rook behind.'],
  ["How do you save the pawn? Step it forward. On e3 your d2 pawn guards it, so …Qxe3 would simply lose the queen. d4 is just as good.", 'e3 — the d2 pawn guards it.'],
  ["…d6 covers e5 and opens the road for the bishop on c8. Quiet, but look where that bishop can go now: f5 and g4 are both open to it.", '…d6 — frees the c8-bishop.'],
  ["d3, the engine's choice: the pawn covers e4, a square the knight on f6 would love, and it backs up your c4 pawn. Now your pawns on c4, d3 and e3 hold the center together.", 'd3 — covers e4, backs up c4.'],
  ["…Ne5: the knight hits c4, d3 and your knight on f3, and it offers a trade. Is anything in danger? The knight on f3 is guarded three times, by the bishop, the rook and the queen. So the real question is whether you want to trade.", '…Ne5 — offers a knight trade on f3.'],
  ["You don't. Nh4, the engine's choice: the knight heads for f5, close to their king. And look what moving it uncovers: your bishop on g2 sees all the way down the long diagonal to b7, and that pawn is pinned to the rook on a8. There's the English bishop doing its job.", 'Nh4 — heads for f5, opens the diagonal.'],
  ["…Ng6 hits your knight on h4 and offers the trade again. Your g3 pawn guards it, so you don't have to take. The knight has somewhere better to be anyway.", '…Ng6 — hits the h4-knight.'],
  ["Nf5: that's the square it was heading for. From f5 it hits their queen on e7, the d6 pawn and g7, right in front of their king, and your rook on f1 guards it. The queen has to move.", 'Nf5 — hits the queen on e7.'],
  ["…Qe5, and now you have two problems. The queen joins their bishop on c8 against your knight on f5: two attackers, one guard. And from e5 the queen also hits c3, and nothing guards that pawn. How do you deal with both at once?", '…Qe5 — hits f5 twice, and c3.'],
  ["With a threat of your own: d4 hits the queen. And look at the diagonal from e5 to c3: your d4 pawn now stands right in the middle of it, so c3 is out of the queen's reach. The engine prefers Bh3, a second guard on the knight.", 'd4 — hits the queen, shields c3.'],
  ["…Qe6: the queen still hits your knight on f5, and now your c4 pawn too, which lost its guard when the d-pawn left d3. But notice that on e6 the queen stands in front of their own bishop on c8, so f5 is hit only once.", '…Qe6 — hits c4 and f5.'],
  ["One move, two jobs: Qd3 guards the c4 pawn and the knight on f5 at the same time. It's the engine's top choice.", 'Qd3 — guards c4 and f5.'],
  ["…Ne4, and one knight jump undoes your queen's work. On e4 it stands between your queen on d3 and the knight on f5, so that knight is down to one guard, the rook on f1. It blocks your bishop's diagonal too, so the pin on b7 is gone.", '…Ne4 — cuts the queen off from f5.'],
  ["h4: space on the kingside, with a point. h5 next would kick the knight off g6.", 'h4 — h5 next kicks the g6-knight.'],
  ["…h5 stops it cold: your pawn can't get to h5 now. The cost is a pawn moved in front of their own king, and pawns never move back.", '…h5 — stops h5, loosens their king.'],
  ["a4 looks random, but look at your second rank: with the pawn gone, a2 is free, and your rook on a1 can step up and swing across to f2, toward the f-file.", 'a4 — frees a2 for the rook.'],
  ["…Nf8: why step back? It clears g6 for the pawn, and …g6 next would hit your knight on f5 with a pawn.", '…Nf8 — …g6 next, hits f5.'],
  ["So you act first: Rf4. Now count the knight on e4: your rook, your queen on d3 and your bishop on g2 all hit it, and only their queen guards it. A move ago this didn't work, because the knight on g6 covered f4.", 'Rf4 — e4 is hit three times.'],
  ["…Qxf5: they give up the queen rather than lose the knight. The queen takes your knight on f5, guards e4 and hits your rook on f4, but your e3 and g3 pawns guard the rook, so it simply takes the queen.", '…Qxf5 — takes the knight, gives the queen.'],
  ["Rxf5, and the queen is yours. Their bishop on c8 takes back next, so the real deal is a queen for a rook and a knight.", 'Rxf5 — the queen, for rook and knight.'],
  ["…Bxf5, and the dust settles: your queen against their rook and knight, a point more for you on paper, and about level. Now look at the diagonal from f5: their bishop, then the knight on e4, then your queen on d3. If that knight jumps away, the bishop hits your queen.", '…Bxf5 — level; watch the f5–d3 diagonal.'],
  ["So step off that diagonal first: Qe2, and from e2 the queen hits the h5 pawn, which nothing guards, and still covers c4.", 'Qe2 — off the diagonal, hits h5.'],
  ["…g6 guards h5 and backs up the bishop on f5. It's about level. Your plan for the middlegame: c5, to break up their d6 pawn and open lines, because your queen and two bishops want an open board.", '…g6 — guards h5; c5 next opens lines.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move no earlier line wrote. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'English: Reversed Sicilian': ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6', 'g3', 'd5', 'cxd5', 'Nxd5', 'Bg2', 'Nb6', 'O-O', 'Be7', 'd3', 'O-O', 'Be3', 'Be6', 'Rc1', 'f6', 'Na4', 'Nxa4', 'Qxa4'],
  'English: Symmetrical Variation': ['c4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'Nf3', 'Nf6', 'O-O', 'O-O', 'd3', 'd6', 'a3', 'a6', 'Rb1', 'Rb8', 'b4', 'cxb4', 'axb4', 'b5', 'cxb5', 'axb5', 'Bd2', 'Bd7'],
  'English: Four Knights Variation': ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6', 'g3', 'Bb4', 'Bg2', 'O-O', 'O-O', 'e4', 'Ng5', 'Bxc3', 'bxc3', 'Re8', 'Qc2', 'Qe7', 'd3', 'exd3', 'exd3', 'd6'],
  'English: Botvinnik System': ['c4', 'e5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'e4', 'd6', 'Nge2', 'f5', 'd3', 'Nf6', 'O-O', 'O-O', 'Nd5', 'Nxd5', 'cxd5', 'Ne7', 'f4'],
  'English: Hedgehog System': ['c4', 'e6', 'Nf3', 'c5', 'Nc3', 'Nf6', 'g3', 'b6', 'Bg2', 'Bb7', 'O-O', 'Be7', 'd4', 'cxd4', 'Qxd4', 'd6', 'Rd1', 'a6', 'b3', 'Nbd7', 'e4', 'Qc8', 'Bb2', 'O-O', 'Qe3', 'Qc7'],
  'Mikenas Attack': ['c4', 'e6', 'Nc3', 'Nf6', 'e4', 'd5', 'e5', 'd4', 'exf6', 'dxc3', 'bxc3', 'Qxf6', 'Nf3', 'e5', 'Bd3', 'Na6', 'O-O', 'Bd6', 'Bc2', 'Bg4', 'd4', 'Bxf3'],
  'Bremen System': ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6', 'g3', 'd5', 'cxd5', 'Nxd5', 'Bg2', 'Nb6', 'O-O', 'Be7', 'a3', 'O-O', 'b4', 'Be6', 'd3', 'f6'],
  // Every move of this line is already written by the Symmetrical tab, whose
  // …cxb4 beat closes it (and carries its middlegame plan).
  'Ultra-Symmetrical Variation': ['c4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'Nf3', 'Nf6', 'O-O', 'O-O', 'd3', 'd6', 'a3', 'a6', 'Rb1', 'Rb8', 'b4', 'cxb4'],
};

// Partial: a tab whose every move an earlier line already wrote has no entry.
const TAB_BEATS: Partial<Record<string, TabBeats>> = {
  'English: Reversed Sicilian': [
    ["…d5, about half the masters, the most common move here, and this is the Reversed Sicilian proper. Their d-pawn break is your d4 break in the Open Sicilian, and your g3 is their …g6 in the Dragon: colors reversed, and you're a full move up. The pawn hits c4, and nothing guards it, so you take.", '…d5 — the Reversed Sicilian, hits c4.'],
    ["cxd5, every master. The pawn takes and hits the knight on c6 as well. And look at what's left behind: no c-pawn of yours, so the c-file is half-open, just as it is for them in a Sicilian. Remember that file, because a rook is coming to it.", 'cxd5 — the c-file is half-open.'],
    ["…Nxd5, every master: the knight takes back on the central square and hits your knight on c3. It looks well placed, but d5 is exactly the square a bishop on g2 would look at.", '…Nxd5 — takes back, hits c3.'],
    ["Bg2, almost every master. Now the bishop looks straight at d5, and only your own knight on f3 stands in between. Your knight on c3 hits d5 too, so their knight won't sit there comfortably for long.", 'Bg2 — aimed at d5, through f3.'],
    ["…Nb6, about eight masters in ten. Why b6? Look at a4: your queen could jump there, pin the knight on c6 to their king, and then the e5 pawn loses its guard. On b6 the knight covers a4. …Bc5 is the other try.", '…Nb6 — covers a4, no pin.'],
    ["You castle, more than eight masters in ten, and your king is safe before the center opens. The engine slightly prefers d3 first.", 'O-O — king safe.'],
    ["…Be7, nearly every master. On c5 the bishop could be kicked by your d-pawn, and on b4 by your a-pawn. On e7 it's safe, and they castle next.", '…Be7 — safe square, castle next.'],
    ["Now a choice. Half the masters play a3, aiming for b4, and that's the Bremen System, with its own tab. d3, about three masters in ten, keeps it simple: the pawn takes c4 away from the knight on b6, covers e4, and opens the road for your bishop on c1.", 'd3 — covers c4 and e4.'],
    ["…O-O, nine masters in ten. Their king is safe, and now it's about where the last pieces go: your bishop on c1 is still at home.", '…O-O — king safe.'],
    ["Where does that bishop belong? e3, about half the masters: it hits the knight on b6 and covers d4 and c5. The engine slightly prefers a3 first, and about four masters in ten agree.", 'Be3 — hits the b6-knight.'],
    ["…Be6, about half the masters: the bishop covers d5 and c4, the squares your pieces want. It hits your a2 pawn as well, but your rook on a1 and the knight on c3 guard it.", '…Be6 — covers d5 and c4.'],
    ["Rc1: the rook takes the half-open c-file you opened when you took on d5. Your own knight on c3 stands in front of it for now, but the moment that knight moves, the rook looks straight up the file at the knight on c6. Here the line leaves the masters' games.", 'Rc1 — takes the half-open c-file.'],
    ["…f6 props up the e5 pawn and takes g5 away from your knight, so Ng5, hitting the bishop on e6, is off the table.", '…f6 — guards e5, covers g5.'],
    ["Na4, and the knight does two jobs: it offers a trade with the knight on b6, and it gets out of the c-file, so your rook on c1 now hits the knight on c6. The cost: your a2 pawn has no guard left. The engine prefers d4, opening the center.", 'Na4 — offers a trade, opens the c-file.'],
    ["…Nxa4: they take, and the knight on a4 hits your b2 pawn. Your queen on d1 is the piece to take back.", '…Nxa4 — they take on a4.'],
    ["Qxa4, and the queen lands with a hit on a7 and on the knight on c6, which your rook on c1 is hitting as well. The b7 pawn guards it, so nothing falls, but your pieces are all pointed at their queenside. It's about level. Your plan for the middlegame: keep the rook on the c-file, aimed at the knight on c6, and bring your own knight round through d2 toward b3 and c5.", 'Qxa4 — queen and rook on the c6-knight.'],
  ],
  'English: Symmetrical Variation': [
    ["…c5, about one master in ten: they copy you. This is the Symmetrical English, and their c-pawn covers d4 the way yours covers d5. In a mirror like this, the question is who breaks the symmetry first, and you're the one with the extra move.", '…c5 — the Symmetrical English.'],
    ["Nc3, about a quarter of the masters: the knight puts a second guard on d5. Half the masters play Nf3 instead, and the engine prefers it.", 'Nc3 — a second guard on d5.'],
    ["…Nc6, half the masters: the mirror again. The knight covers d4 and e5, so d4 is now covered twice.", '…Nc6 — d4 covered twice.'],
    ["g3, two masters in three: the bishop is going to g2. And this time your knight is still on g1, not f3, so the long diagonal will be wide open when it gets there.", 'g3 — the bishop heads for g2.'],
    ["…g6, nearly every master, and the mirror holds: their bishop is heading for g7.", '…g6 — their bishop heads for g7.'],
    ["Bg2, nearly every master, and look how far it sees: down the open diagonal, straight at the knight on c6. That's the English bishop with nothing in its way. The engine prefers e3 first, but the bishop move is the natural one.", 'Bg2 — hits the c6-knight.'],
    ["…Bg7, the exact mirror: their bishop hits your knight on c3 the same way. Both knights are guarded by pawns, so nothing happens yet.", '…Bg7 — the mirror, hits c3.'],
    ["Nf3, about a third of the masters: the knight comes out so you can castle. Notice that it now blocks your bishop's view of c6. That's fine; the diagonal opens again whenever the knight moves.", 'Nf3 — develops, castle next.'],
    ["…Nf6 completes the mirror: every piece of theirs stands where yours does. Fewer than one master in ten plays it; about a third play …d6, and the engine prefers that too. You are a little better.", '…Nf6 — the full mirror; …d6 was better.'],
    ["You castle, just over half the masters. d4, breaking the symmetry right away, is the other big choice, about four masters in ten. You are a little better.", 'O-O — king safe.'],
    ["…O-O, nearly nine masters in ten: their king goes to g8, and the board is still a perfect mirror. So how do you break it?", '…O-O — still a mirror.'],
    ["d3 is the slow way: the pawn covers e4, backs up c4, and lets your bishop on c1 out. Seven masters in ten play d4 here instead, and the engine prefers it, hitting c5 right away. d3 keeps the symmetry for now and saves the break for the queenside.", 'd3 — quiet; d4 was the engine\'s pick.'],
    ["…d6, about half the masters: the mirror again, and their bishop on c8 has a road out.", '…d6 — mirror again, frees c8.'],
    ["Here's your plan: a3, close to half the masters. The pawn covers b4, so your b-pawn can go there with support and hit their c5 pawn. The queenside is where you break the mirror.", 'a3 — prepares b4.'],
    ["…a6, about a third of the masters: the mirror, and the same idea. They want …b5, hitting your c4 pawn.", '…a6 — they want …b5.'],
    ["Rb1, more than eight masters in ten: the rook gets behind the b-pawn, so when it goes to b4 and the files open, the rook is already there.", 'Rb1 — behind the b-pawn.'],
    ["…Rb8: the mirror one more time, the rook on b8 behind their b-pawn, and here the line leaves the masters' games. Now it's a race to the same break, b4 against …b5, and you get there first, because you move first.", "…Rb8 — a race, and you're first."],
    ["b4, the engine's choice, and the mirror finally breaks. The pawn hits c5, and now the queenside files are about to open.", 'b4 — hits c5, breaks the mirror.'],
    ["…cxb4: they take, and the pawn on b4 hits your a3 pawn and the knight on c3, which nothing guards, so you take back at once. Your plan for the middlegame: take back with the a-pawn, and the half-open a-file becomes a road for your rooks into their queenside.", '…cxb4 — hits c3; take back.'],
    ["axb4: the a-file is half-open now, and your pawn on b4 is guarded by the rook on b1.", 'axb4 — the a-file opens.'],
    ["…b5 hits your c4 pawn, and it stops your b-pawn from reaching b5, where it would hit the knight on c6.", '…b5 — hits c4, stops b5.'],
    ["cxb5: take it, and the pawn on b5 hits the a6 pawn and the knight on c6, which nothing guards. So they take back.", 'cxb5 — hits a6 and the c6-knight.'],
    ["…axb5 puts their pawn back on b5, and look at the files: the a-file and the c-file are both fully open now, with no pawns on them at all. Whoever gets the rooks there first will run them.", '…axb5 — a- and c-files open.'],
    ["Bd2, and here's a quiet point: your knight on c3 had no guard, and their bishop on g7 is lined up on it, right behind the knight on f6. Now the bishop guards it, and c1 is free for a heavy piece on the c-file. The engine prefers Be3.", 'Bd2 — guards c3, clears c1.'],
    ["…Bd7 does the same job for them: the knight on c6 had no guard, and now it does. The engine prefers …Be6. It's about level. Your plan for the middlegame: Qc2 and Rfc1, lining up on the open c-file, so that when your knight on c3 moves, they both point at the knight on c6.", '…Bd7 — guards c6; Qc2 and Rfc1 next.'],
  ],
  'English: Four Knights Variation': [
    ["Qc2, the engine's choice, and here the third attacker on e4 is your queen. Count again: the queen, the knight on g5 and the bishop on g2, against their knight on f6 and rook on e8. Three against two.", 'Qc2 — three attackers on e4.'],
    ["…Qe7 adds a third guard on e4, down the e-file: three against three. So who adds the next piece?", '…Qe7 — three guards on e4.'],
    ["You do: d3 hits e4 with a pawn, the cheapest attacker there is. The engine's choice.", 'd3 — a pawn hits e4.'],
    ["…exd3: they take, and the pawn on d3 hits your queen on c2 and your e2 pawn at the same time. So you take back, but with which piece?", '…exd3 — hits c2 and e2.'],
    ["exd3. Qxd3 looks natural, but the engine rates it about a pawn worse. The e-pawn takes back on d3 instead, and with it gone, the e-file is open.", 'exd3 — the e-pawn takes back.'],
    ["…d6 opens the road for the bishop on c8. The engine prefers …h6, kicking your knight off g5 first. It's about level. Your plan for the middlegame: bring the knight back to f3 and on to d4, put a rook on the half-open b-file against b7, and let your two bishops work the open diagonals.", '…d6 — frees c8; Nf3 and Nd4 next.'],
  ],
  'English: Botvinnik System': [
    ["…Nc6, about one master in five; close to six in ten play …Nf6, and the engine prefers it. The knight backs up e5 and covers d4.", '…Nc6 — covers d4, guards e5.'],
    ["g3, more than half the masters: your bishop is headed for g2, and with your knight not on f3, the long diagonal will be wide open.", 'g3 — the bishop heads for g2.'],
    ["…g6, more than half the masters. Now look at the whole board: your knight on c3 and pawn on g3 against their knight on c6 and pawn on g6. If you know the Closed Sicilian, this is it with the colors reversed, and you're a move up.", '…g6 — a Closed Sicilian, reversed.'],
    ["Bg2, nearly every master: down the open diagonal, the bishop hits the knight on c6.", 'Bg2 — hits the c6-knight.'],
    ["…Bg7, nearly every master. For now their bishop sits behind their own e5 pawn. You are a little better.", '…Bg7 — behind its own e5 pawn.'],
    ["And here's the Botvinnik System: e4, about one master in six. Your c4 and e4 pawns both cover d5, along with the knight on c3: a clamp on the square their pieces want most. The price is d4, because no pawn of yours can ever cover it again.", 'e4 — the Botvinnik clamp on d5.'],
    ["…d6, eight masters in ten: the pawn backs up e5 and opens the road for the bishop on c8.", '…d6 — backs up e5.'],
    ["Where does this knight go? Not f3, where it would stand in front of your f-pawn. Eight masters in ten put it on e2, and look: from e2 it covers d4, the square your e4 push gave up.", 'Nge2 — covers d4, the f-pawn stays free.'],
    ["…f5, about one master in five: their own pawn break, hitting e4. Take on f5, and their bishop on c8 takes back and comes out for free.", '…f5 — their break, hits e4.'],
    ["d3, the engine's choice: the pawn guards e4, so you don't have to take on f5, and it opens the road for your bishop on c1.", 'd3 — guards e4, frees c1.'],
    ["…Nf6, about eight masters in ten: a second piece on e4. Their f5 pawn and this knight hit it; your d3 pawn, the knight on c3 and the bishop on g2 guard it. Three against two, so it holds.", '…Nf6 — e4 hit twice, guarded three times.'],
    ["You castle, eight masters in ten, and your king is safe on g1. Nd5 right away is the other try, about one master in ten.", 'O-O — king safe.'],
    ["…O-O: their king goes to g8 as well. Now it's time to use the square you clamped.", '…O-O — king safe.'],
    ["Nd5, the engine's choice: the knight lands on the square your c4 and e4 pawns built for it. From d5 it hits c7 and the knight on f6, offering a trade.", 'Nd5 — the outpost, hits c7 and f6.'],
    ["…Nxd5: they trade it off on d5. Now, which pawn takes back?", '…Nxd5 — they trade.'],
    ["The c-pawn: cxd5 hits the knight on c6, and the engine rates exd5 about a fifth of a pawn worse. With your c-pawn gone, the c-file is half-open for your rooks. You are a little better.", 'cxd5 — hits c6, opens the c-file.'],
    ["…Ne7: the knight steps out of the pawn's reach and hits d5 right back. Your e4 pawn guards it.", '…Ne7 — hits d5.'],
    ["And now the f-pawn your knight on e2 left free: f4 hits e5. You are a little better. Your plan for the middlegame: Be3 and a rook to c1, pressing down the half-open c-file toward c7, while f4 stands ready to open the f-file toward their king.", 'f4 — hits e5; Be3 and Rc1 next.'],
  ],
  'English: Hedgehog System': [
    ["…e6, about one master in six: a quiet, flexible move. It covers d5 and f5 and opens the road for the bishop on f8.", '…e6 — flexible, frees f8.'],
    ["Nf3, about a third of the masters: the knight develops and covers d4 and e5.", 'Nf3 — covers d4 and e5.'],
    ["…c5, only two masters in a hundred; about six in ten play …d5. With …c5 and …e6, they're heading for a Hedgehog: little pawns on the sixth rank, with all their pieces waiting behind them. You are a little better.", '…c5 — the Hedgehog setup begins.'],
    ["Nc3, about a quarter of the masters: a second guard on d5, the square their …d5 break needs. You are a little better.", 'Nc3 — a second guard on d5.'],
    ["…Nf6, about six masters in ten: the knight covers d5 and e4.", '…Nf6 — covers d5 and e4.'],
    ["g3, seven masters in ten: the bishop is going to g2, where it will look down the long diagonal toward b7.", 'g3 — the bishop heads for g2.'],
    ["…b6, about three masters in four: their bishop is going to b7, onto the same long diagonal from the other end. Bishop against bishop.", '…b6 — their bishop heads for b7.'],
    ["Bg2, nearly every master: your bishop takes the diagonal first, with the knight on f3 in front of it. You are a little better.", 'Bg2 — fianchetto done.'],
    ["…Bb7, every master. Now the two bishops face each other down the long diagonal, and the only piece between them is your knight on f3, which their bishop hits. Your bishop on g2 and the e2 pawn guard it.", '…Bb7 — bishop against bishop, f3 between.'],
    ["You castle, nearly every master, and your king tucks in behind the bishop on g2. You are a little better.", 'O-O — king safe.'],
    ["…Be7, three masters in four: on e7 the bishop stays out of the way, and they're ready to castle. You are a little better.", '…Be7 — castle next.'],
    ["Now the break: d4, about half the masters. The pawn hits c5, and if they take, the d-file opens and your queen comes into the center.", 'd4 — hits c5, opens the d-file.'],
    ["…cxd4, nearly every master: the pawn hits your knight on c3. How do you take back?", '…cxd4 — hits c3.'],
    ["With the queen, nearly every master. Why not Nxd4? Then your knight leaves f3, their bishop on b7 sees all the way to g2, and it trades itself for your bishop. On d4 the queen hits the knight on f6 and the b6 and d7 pawns.", 'Qxd4 — and the g2-bishop stays covered.'],
    ["…d6, about two masters in three: the pawn takes e5 away from your knight, and look at their pawns now: b6, d6 and e6, all on the sixth rank. That's the Hedgehog shell.", '…d6 — the Hedgehog shell forms.'],
    ["Rd1, about four masters in ten: the rook lines up behind your queen on the d-file, and both point at the d6 pawn. The bishop on e7 and the queen on d8 guard it, so nothing falls yet, but d6 is the pawn to aim at.", 'Rd1 — queen and rook on d6.'],
    ["…a6, nine masters in ten: now …b5 is possible, one of their two breaks. …d5 is the other.", '…a6 — gets …b5 ready.'],
    ["b3, about half the masters: the pawn guards c4 and makes room for your bishop on b2, the second fianchetto.", 'b3 — guards c4, Bb2 next.'],
    ["…Nbd7, nearly every master: the knight comes out behind the d6 pawn, where it doesn't block the bishop on b7, and covers c5 and e5.", '…Nbd7 — covers c5 and e5.'],
    ["e4, close to six masters in ten, and the bind is complete: your c4 and e4 pawns cover d5, and the c4 pawn covers b5 too. Those are the two squares their breaks need. That's how you meet a Hedgehog: take away the breaks first.", 'e4 — the bind, b5 and d5 covered.'],
    ["…Qc8, about four masters in ten: the queen hits your c4 pawn down the half-open c-file. Your b3 pawn and your queen guard it. The engine prefers …Rc8. It's about level.", '…Qc8 — hits c4; …Rc8 was better.'],
    ["Bb2, two masters in three: the second fianchetto. Your bishop sits on the long diagonal behind the knight on c3 and the queen on d4. You are a little better.", 'Bb2 — the second fianchetto.'],
    ["…O-O, every master: their king goes to g8, and they wait. It's about level.", '…O-O — king safe.'],
    ["Qe3: from e3 the queen covers c5, where their knight on d7 wants to go, keeps e4 guarded, and looks down the diagonal at b6. Here the line leaves the masters' games.", 'Qe3 — covers c5, hits b6.'],
    ["…Qc7 hits c4 again, and the b3 pawn guards it. The engine prefers …Re8. You are a little better. Your plan for the middlegame: double your rooks on the d-file with Rd2 and Rad1, aimed at d6, while your c4 and e4 pawns keep both their breaks, …b5 and …d5, under guard.", '…Qc7 — hits c4; Rd2 and Rad1 next.'],
  ],
  'Mikenas Attack': [
    ["Nc3, about three masters in ten: the knight covers d5 and e4, and that second square is a hint. Against …e6, you can try to take the whole center with e4.", 'Nc3 — covers d5 and e4.'],
    ["…Nf6, only about seven masters in a hundred; eight in ten play …d5, and the engine prefers …Bb4. The knight covers e4, but your knight on c3 covers it too. You are a little better.", '…Nf6 — covers e4; …d5 is more common.'],
    ["e4, about half the masters: the Mikenas Attack. The pawn stands next to c4, guarded by the knight on c3, and the threat is e5, kicking the knight off f6. You are a little better.", 'e4 — the Mikenas, e5 is coming.'],
    ["…d5, about two masters in three: they hit back at once, and the pawn attacks both c4 and e4. So, do you take, or push?", '…d5 — hits c4 and e4.'],
    ["Push: e5, three masters in four. The pawn hits the knight on f6, and on e5 it's out of the d5 pawn's reach. cxd5 is the other try, about a quarter. You are a little better.", 'e5 — kicks the knight on f6.'],
    ["…d4, more than eight masters in ten: instead of moving the knight, they hit yours. The pawn attacks your knight on c3, so both knights are under attack now.", '…d4 — hits the c3-knight back.'],
    ["exf6: every master takes their knight first. Now the pawn on f6 hits g7.", 'exf6 — takes the knight first.'],
    ["…dxc3, every master: they take yours back. And now their pawn on c3 hits b2 and d2, while your pawn on f6 has no guard.", '…dxc3 — hits b2 and d2.'],
    ["bxc3, nearly every master, and the engine's choice: the b-pawn takes on c3, toward the center. Yes, your c-pawns are doubled, but the b-file is half-open for your rook. You are a little better.", 'bxc3 — toward the center, b-file half-open.'],
    ["…Qxf6: the queen collects the pawn, and material is level again. From f6 the queen hits c3 and f2, but your d2 pawn guards c3 and your king guards f2. Here the line leaves the masters' games.", '…Qxf6 — material level.'],
    ["Nf3, the engine's choice: the knight develops and covers d4 and e5. You are a little better.", 'Nf3 — develops, covers d4 and e5.'],
    ["…e5 takes the center, guarded by the queen on f6. The engine prefers …b6. You are a little better.", '…e5 — takes the center.'],
    ["Bd3 does two jobs: it covers e4, so …e4 can't kick your knight, and it aims down the diagonal at h7. But the engine prefers d4 at once, hitting e5, and after Bd3 it's about level.", 'Bd3 — covers e4; d4 was stronger.'],
    ["…Na6: why the rim? On c6 the knight would stand in front of their c-pawn, and on d7 it would block their bishop on c8. From a6 it heads for c5, where it would hit your bishop on d3.", '…Na6 — heading for c5.'],
    ["You castle, the engine's choice. Your king is safe, while theirs is still on e8.", 'O-O — king safe.'],
    ["…Bd6 guards e5 and gets them ready to castle. The engine prefers …Nc5, going after your bishop at once. You are a little better.", '…Bd6 — guards e5; …Nc5 was better.'],
    ["Bc2, the engine's choice: the bishop steps back but stays on the same diagonal, still aimed at h7, and it clears d3 so your d-pawn can go to d4.", 'Bc2 — still aimed at h7; d4 next.'],
    ["…Bg4 pins your knight on f3 to your queen on d1. The knight is guarded twice, by the g2 pawn and the queen, and hit twice, by the bishop and their queen on f6, so nothing falls yet.", '…Bg4 — pins the f3-knight.'],
    ["Now d4, the engine's top choice: the pawn hits e5, and it opens the center for your bishops, pin or no pin. You are a little better.", 'd4 — hits e5, opens the center.'],
    ["…Bxf3: they cash in the pin, and the bishop hits your queen on d1. Take back with the queen. You are a little better. Your plan for the middlegame: after the queens come off on f3, c5 kicks the bishop off d6 and opens the board for your two bishops.", '…Bxf3 — take back with the queen.'],
  ],
  'Bremen System': [
    ["a3, half the masters' choice and the engine's: the Bremen System. The pawn covers b4, so b4 can follow, and b5 after that would hit the knight on c6. That's the whole plan: space on the queenside.", 'a3 — b4 is coming.'],
    ["…O-O, eight masters in ten: their king goes to g8.", '…O-O — king safe.'],
    ["b4, the engine's choice: space on the queenside, and b5 next would hit the knight on c6. Here the line leaves the masters' games.", 'b4 — space; b5 next hits c6.'],
    ["…Be6 covers d5 and c4, keeping your knight off d5. On f5 the bishop could be kicked by your e-pawn.", '…Be6 — covers d5 and c4.'],
    ["d3, the engine's choice: the pawn takes c4 and e4 away from their pieces and frees your bishop on c1. And if they play …a5 to hit your b4 pawn, b5 comes with a hit on the knight on c6.", 'd3 — covers c4 and e4.'],
    ["…f6 props up e5 and takes g5 away from your knight. It's about level. Your plan for the middlegame: Qc2 and then b5, driving the knight off c6, with your rooks coming to the half-open c-file.", '…f6 — guards e5; Qc2 and b5 next.'],
  ],
};

/** File a tab's beats on the first moves it doesn't share with what is already written. */
for (const [tab, moves] of Object.entries(TAB_LINES)) {
  const own = TAB_BEATS[tab] ?? [];
  let k = 0;
  while (k < moves.length && moves.slice(0, k + 1).join(' ') in beats) k += 1;
  if (own.length !== moves.length - k) throw new Error(`${tab}: ${own.length} beats for ${moves.length - k} unshared moves`);
  own.forEach(([say, sayShort], i) => { beats[moves.slice(0, k + i + 1).join(' ')] = { say, sayShort }; });
}

export const ENGLISH_OPENING_WATCH: WatchCourse = {
  openingId: 'english-opening',
  title: 'The English Opening — A Master Class',
  orientation: 'white',
  sources: ['concept:pos-center', 'concept:pos-space', 'concept:pos-development', 'concept:pos-bishop-pair', 'concept:pos-open-file', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/English_Opening', 'https://en.wikipedia.org/wiki/Hedgehog_(chess)'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
