// GothamChess's Closed Sicilian — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet (`LESSON_FACTS=1
// LESSON_IDS=pro-gothamchess-closed-sicilian`): masters' percentages, engine
// lines at a fixed depth, the board after each move. The student plays White.
// The last two tabs are lines he teaches (docs/levy-lines/decisions): the Grand
// Prix with Bc4 and Qe1, and the g3 / Bg2 build against an early …g6. Standard:
// docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register (§2a).
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'c5', 'Nc3', 'Nc6', 'Bb5', 'Nd4', 'Nf3', 'Nxb5', 'Nxb5', 'a6', 'Nc3', 'd6', 'd4', 'cxd4', 'Qxd4', 'Nf6', 'Bg5', 'e5', 'Qd3', 'Be6', 'O-O-O', 'Be7', 'Bxf6', 'gxf6'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4, nearly half the masters' first move and the engine's top choice. The pawn takes a central square and opens the way for your queen and the bishop on f1. Against the Sicilian, everything in this course turns on one question: when do you open the center, and with what?", 'e4 — a central pawn, lines open.'],
  ["…c5, the Sicilian: nearly half the masters answer this way, and the engine agrees. Instead of meeting you in the middle with …e5, the pawn comes from the side and covers d4, so a pawn of yours that lands on d4 can simply be taken. It's about level.", '…c5 — the Sicilian, covering d4.'],
  ["Nc3, and this is the Closed Sicilian. More than eight masters in ten play Nf3, usually with d4 to follow, and the engine prefers that by about a quarter of a pawn. So why c3? The knight guards e4 and covers d5, and it commits you to nothing else. You can still open the center with d4, put a bishop on b5, push the f-pawn, or fianchetto with g3, and you'll meet each of those plans here.", 'Nc3 — the Closed Sicilian, every plan open.'],
  ["…Nc6, about six masters in ten: the knight develops and covers d4 a second time, alongside the pawn on c5. The engine's top pick is …d6, but the two are close. So d4 is well watched. Is there a piece of yours that can go after the knight doing the watching?", '…Nc6 — d4 covered twice.'],
  ["Bb5: there it is, the bishop lands on the knight on c6. About one master in five plays it; three in ten fianchetto with g3, and the engine prefers the simple Nf3, by about a third of a pawn. The idea is to give the bishop for that knight whenever it suits you, so their pawns end up doubled and d4 loses a guard. It's about level.", 'Bb5 — straight at the c6 knight.'],
  ["…Nd4, about seven masters in ten, and the engine's first choice too. The knight doesn't wait to be taken: it jumps forward and hits your bishop on b5, and your c2 pawn as well, which only your queen guards. So do you have to move the bishop?", '…Nd4 — hits the b5 bishop.'],
  ["No: Nf3. More than half the masters retreat with Bc4, and the engine rates the two the same, but here you develop and hit the knight on d4 right back. If it takes on b5, your other knight takes back, and their knight will have spent three moves just to trade itself for your bishop.", 'Nf3 — develops, hits the d4 knight.'],
  ["…Nxb5, about one master in five: they take the bishop, and now their knight on b5 is loose and hits your knight on c3. The engine prefers …a6, keeping the tension a move longer. You take back, of course.", '…Nxb5 — takes; …a6 was stronger.'],
  ["Nxb5, every master. The trade is done: they have the two bishops, but you have both knights out, and with f1 and g1 already cleared, your king can castle whenever you like. Your knight on b5 also hits a7, which the rook on a8 guards.", 'Nxb5 — takes back, ready to castle.'],
  ["…a6: the pawn kicks your knight, which has nothing guarding it on b5. No master game reaches this position any more, and the engine slightly prefers …d6 first. So where does the knight go?", '…a6 — kicks the b5 knight.'],
  ["Nc3, the engine's first choice: back to c3, guarding e4 and covering d5 again. Now count who watches d4. Their knight has left c6 for good, so only the pawn on c5 is left. That's your signal.", 'Nc3 — home again; d4 barely guarded.'],
  ["…d6: the pawn backs up c5, covers e5, and opens the diagonal for their bishop on c8. The engine rates …b5 and …e6 about the same. You are a little better.", '…d6 — backs up c5, frees c8.'],
  ["d4, the engine's first choice: this is the moment to open the center. Your knights are out while their bishops are still at home, and the pawn hits c5.", 'd4 — open the center now.'],
  ["…cxd4, the engine's choice: they take, and the new pawn on d4 hits your knight on c3, with nothing guarding it. You are a little better, but you have to take back right now. With the knight on f3, or the queen?", '…cxd4 — hits c3, take back.'],
  ["Qxd4, about half a pawn better than Nxd4. Why is it safe to bring the queen out this early? Their queenside knight is gone, traded on b5, so no …Nc6 can arrive with a hit on it. From d4 the queen hits d6 and g7, and you are a little better.", 'Qxd4 — central queen, no knight to chase it.'],
  ["…Nf6: the knight develops and hits your e4 pawn, which your knight on c3 and the queen guard. The engine prefers …e5, kicking your queen at once. With …Nf6 instead, you are a little better, and the knight on f6 hands your bishop a target.", '…Nf6 — hits e4; …e5 was stronger.'],
  ["Bg5, the engine's first choice: the bishop develops onto the knight on f6. Look at the diagonal behind it: the pawn on e7, then their queen on d8. One pawn move on e7, and that knight is pinned to the queen. You are clearly better.", 'Bg5 — on the f6 knight.'],
  ["…e5, the engine's choice: the pawn kicks your queen, and there's the pin, the knight on f6 now stuck in front of the queen on d8. Look at d5, too. Their c-pawn is gone and the e-pawn has gone straight past e6, so no pawn of theirs covers d5 any more. You are a little better.", '…e5 — hits the queen, d5 left behind.'],
  ["Qd3: the queen steps back but keeps working, hitting d6 and a6 and watching d5. The engine prefers Qb4, which also hits b7, by nearly four tenths of a pawn. You are a little better.", 'Qd3 — hits d6; Qb4 was stronger.'],
  ["…Be6, the engine's first choice: the bishop develops and covers d5, the square their pawns gave up. From e6 it also looks down the diagonal at a2, which your rook and knight guard. So the fight of the middlegame is already set: d5.", '…Be6 — covers d5, eyes a2.'],
  ["You castle long, rated about the same as castling short or taking on f6 at once. Your king goes to c1, and the rook lands on d1, behind your queen, so the two of them are lined up on the pawn on d6. You are a little better.", 'O-O-O — the rook behind the queen.'],
  ["…Be7: the bishop develops and steps in front of their queen, so the knight on f6 is no longer pinned to it. But the engine prefers …Rc8, and now you are clearly better. Here's why: the bishop on e7 is the second guard of d6, along with their queen. If it ever has to leave e7, d6 is short of defenders.", '…Be7 — breaks the pin; …Rc8 was stronger.'],
  ["Bxf6, the engine's first choice, and here's where that bishop on e7 matters. Your bishop on f6 hits the bishop on e7 and the pawn on g7, and both are pinned, the bishop to their queen and the pawn to the rook on h8. If they take back with the bishop, it leaves e7, and Qxd6 picks up the pawn. You are clearly better.", 'Bxf6 — e7 and g7 both pinned.'],
  ["…gxf6: they keep the d6 pawn and take with the g-pawn instead. The engine prefers …Bxf6, giving up d6. Their kingside pawns are broken now, and look at d5 and f5: no pawn guards either square, only the bishop on e6. You are clearly better. Your plan for the middlegame: Nh4 heading for f5 and the other knight to d5, two knights for two holes that only one bishop guards.", '…gxf6 — broken pawns; …Bxf6 was stronger.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Closed Sicilian Main': ['e4', 'c5', 'Nc3', 'Nc6', 'Bb5', 'Nd4', 'Nf3', 'Nxb5', 'Nxb5', 'a6', 'Nc3', 'd6', 'd4', 'cxd4', 'Qxd4', 'e5', 'Qb4', 'Ne7', 'Be3', 'Nc6', 'Qb3'],
  'vs …d6': ['e4', 'c5', 'Nc3', 'd6', 'd4', 'cxd4', 'Qxd4', 'Nc6', 'Qd2', 'g6', 'b3', 'Bh6', 'f4', 'Nf6', 'Bb2', 'O-O', 'O-O-O', 'e5', 'g3', 'Re8', 'Kb1'],
  'vs …e6': ['e4', 'c5', 'Nc3', 'e6', 'd4', 'cxd4', 'Qxd4', 'Nc6', 'Qd3', 'Nf6', 'Bf4', 'Bb4', 'O-O-O', 'e5', 'Bd2', 'O-O', 'Nge2', 'd6', 'a3', 'Bc5', 'Bg5'],
  'vs …g6 (Bxc6)': ['e4', 'c5', 'Nc3', 'Nc6', 'Bb5', 'g6', 'Bxc6', 'dxc6', 'd3', 'Bg7', 'Be3', 'c4', 'h3', 'cxd3', 'cxd3', 'e5', 'Nf3', 'Ne7', 'O-O', 'O-O', 'a4'],
  'Grand Prix Attack': ['e4', 'c5', 'Nc3', 'Nc6', 'f4', 'g6', 'Nf3', 'Bg7', 'Bc4', 'd6', 'O-O', 'Nf6', 'd3', 'O-O', 'Qe1', 'Bg4', 'Qh4', 'Bxf3', 'Rxf3', 'e6', 'f5'],
  'Fianchetto vs …g6': ['e4', 'c5', 'Nc3', 'g6', 'g3', 'Bg7', 'Bg2', 'Nc6', 'd3', 'd6', 'Be3', 'Rb8', 'Qd2', 'b5', 'Nge2', 'b4', 'Nd1', 'Nd4', 'O-O', 'h5', 'h3'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Closed Sicilian Main': [
    ["…e5 this time, the engine's first choice: before developing anything, they kick your queen at once. It's about level. The price is a square: their c-pawn is gone and the e-pawn has skipped e6, so a piece of yours on d5 can't be chased away by a pawn.", '…e5 — hits the queen, gives up d5.'],
    ["Qb4, the engine's choice: the queen hits two pawns, b7 and d6. Both are guarded, but b7 only by the bishop on c8, so the moment that bishop comes out, b7 drops. It's about level, and their light-squared bishop is tied to its post for now.", 'Qb4 — hits b7 and d6.'],
    ["…Ne7: the knight takes the long way round, heading for c6, where it would hit your queen again. The engine rates …Rb8, guarding b7 with the rook, about the same. You are a little better.", '…Ne7 — bound for c6.'],
    ["Be3: the bishop develops and covers c5 and b6. The engine prefers Bg5, by about half a pawn, putting the bishop on the knight on e7 instead. As played, it's about level, and their knight is on its way to c6.", 'Be3 — develops; Bg5 was stronger.'],
    ["…Nc6, the engine's first choice: there's the knight, hitting your queen on b4, and nothing guards the queen there. It has to move once more. Is there a square where it still bites?", '…Nc6 — hits the queen again.'],
    ["Qb3, the engine's first choice: the queen hits b7 down the b-file and, across the board, f7, a pawn only their king guards. It's about level. Your plan for the middlegame: castle, put a knight on d5, a square no pawn of theirs covers, and add Ng5 to aim a second piece at f7.", 'Qb3 — hits b7 and f7.'],
  ],
  'vs …d6': [
    ["…d6, about one master in five and the engine's top pick: the pawn backs up c5 and opens the diagonal for their bishop on c8, while their queenside knight stays at home for now. With no knight on c6 to press, the plan changes: you strike in the center straight away.", '…d6 — solid, no knight out yet.'],
    ["d4: only about one master in ten plays it here; about a third push f4, and the engine prefers Nge2, by about a third of a pawn. But the plan is the one from the main line: open the center at once, and take back on d4 with the queen. The pawn hits c5. It's about level.", 'd4 — straight at c5.'],
    ["…cxd4, every master: the pawn takes and hits your knight on c3, and nothing guards that pawn on d4. Notice what's missing: you never played Nf3, so there's no knight to take back. It has to be the queen.", '…cxd4 — only the queen can recapture.'],
    ["Qxd4, every master and the engine's first choice. The queen lands in the center and hits three pawns, a7, d6 and g7, each one guarded. The catch: their knight on b8 is still at home, ready to come to c6 with a hit on the queen.", 'Qxd4 — central queen, three pawns hit.'],
    ["…Nc6, about eight masters in ten: the knight develops and hits your queen, which has no guard on d4. So the queen moves again, and the square it picks decides the plan.", '…Nc6 — develops, hits the queen.'],
    ["Qd2, more than eight masters in ten: the queen drops back to d2, still hitting d6 down the file. But look at what it does to your bishop on c1: the queen stands right in front of it, and the pawn on b2 blocks the other diagonal. So how does that bishop get out? You are a little better.", 'Qd2 — hits d6, blocks the c1 bishop.'],
    ["…g6, about two masters in three: they fianchetto, the Dragon setup, and their bishop on f8 now has two roads, to g7 or to h6. It's about level.", '…g6 — the fianchetto, two roads.'],
    ["b3, nearly every master: there's the way out for the bishop your queen boxed in. The pawn steps aside so the bishop on c1 can go to b2 and the long diagonal. It's about level.", 'b3 — clears b2 for the bishop.'],
    ["…Bh6, nine masters in ten: the bishop takes the other road, and it hits your queen on d2 down the diagonal. The engine slightly prefers …f5, and you are a little better, but the queen can't stay where a bishop hits it. Move it, or block the diagonal?", '…Bh6 — hits the queen.'],
    ["Block it: f4, every master and the engine's first choice. The pawn steps into the diagonal, so your queen is safe, and it grabs space, covering e5 and g5. It's pinned to your queen now, so moving it would hand over the queen, but it has no need to move. You are a little better.", 'f4 — blocks the bishop, grabs space.'],
    ["…Nf6: the knight develops and hits your e4 pawn, which the knight on c3 guards. The engine prefers …f5, going after e4 with a pawn instead. You are a little better.", '…Nf6 — hits e4; …f5 was stronger.'],
    ["Bb2, the engine's first choice: the bishop arrives where b3 sent it, guarding your knight on c3. For now that knight blocks its view, but the bishop is aimed down the long diagonal at f6 and h8, ready for the day the knight moves. You are a little better.", 'Bb2 — the long diagonal, behind c3.'],
    ["…O-O: their king goes short. The engine slightly prefers …e5 first. A king on g8 tells you where your own king belongs: on the other wing.", '…O-O — short; …e5 first was better.'],
    ["You castle long, the engine's first choice. Now the kings sit on opposite wings, and your rook on d1 lines up behind the queen on the d-file, aimed at the pawn on d6. You are a little better.", 'O-O-O — opposite wings, rook on d1.'],
    ["…e5, the engine's choice: the pawn hits f4, and here's the trouble. Your f4 pawn is pinned to the queen, so fxe5 would let their bishop take your queen, and taking back on f4 with the queen walks into the same bishop. If nothing changes, …exf4 would win a pawn. You are a little better.", '…e5 — hits the pinned f4 pawn.'],
    ["g3, the engine's first choice: a pawn now guards f4, so if they take there, gxf4 takes back and your queen never gets involved. It also opens g2 for your bishop on f1. You are a little better.", 'g3 — guards f4, opens g2.'],
    ["…Re8, the engine's choice: the rook backs up the e5 pawn and takes the e-file, in case it opens. You are a little better.", '…Re8 — backs up e5.'],
    ["Kb1, the engine's first choice: the king steps off c1, the square at the far end of the h6 bishop's diagonal, behind your queen and the f4 pawn. Now even if that diagonal opens, there's no king at the end of it. You are a little better. Your plan for the middlegame: finish with Bg2 and Nge2, and keep the rook and queen trained on the d6 pawn, which only their queen guards now.", 'Kb1 — off the bishop\'s diagonal.'],
  ],
  'vs …e6': [
    ["…e6, about one master in seven: a flexible pawn move that covers d5 and opens a road for their bishop on f8. The engine prefers …d6, and after …e6 you are a little better.", '…e6 — covers d5, frees f8.'],
    ["d4: only about one master in a hundred, and the engine prefers Nf3, so this is a deliberate choice. It's the plan from the main line: the pawn hits c5, and after the trade the queen takes back in the middle. It's about level.", 'd4 — the queen will take back.'],
    ["…cxd4, every master: the pawn takes and hits your knight on c3, and the pawn on d4 has no guard. With no knight on f3, your queen is the piece that takes back.", '…cxd4 — hits c3, queen takes back.'],
    ["Qxd4, every master. From d4 the queen hits a7, d7 and g7, all of them guarded. It won't stay long: their queenside knight comes to c6 next, and the question is where the queen goes then.", 'Qxd4 — the queen takes back.'],
    ["…Nc6, nearly every master: the knight comes out with a hit on your queen, unguarded on d4, so the queen has to move. The engine rates …Nf6 the same.", '…Nc6 — the queen must move.'],
    ["Qd3: the queen drops back one square and keeps the d-file, hitting d7. The engine slightly prefers Qe3. Here's the difference from the …d6 line: on d3 the queen doesn't stand in front of your bishop on c1, so the road to f4 and g5 is open.", 'Qd3 — hits d7, the c1 bishop free.'],
    ["…Nf6, the engine's first choice: the knight develops and hits your e4 pawn, which your knight on c3 and the queen guard. It's about level.", '…Nf6 — hits e4.'],
    ["Bf4, the engine's first choice: the bishop develops onto the open diagonal and covers e5 and d6, the squares their center pawns want. Long castling comes next.", 'Bf4 — covers e5 and d6.'],
    ["…Bb4: the bishop pins your knight on c3 to your king, and that knight is one of the guards of e4. The engine prefers …a6, and after the pin you are a little better. So how do you get out of it?", '…Bb4 — pins the c3 knight.'],
    ["You castle long, and the pin is gone: the king steps off e1, so the knight on c3 is free again, and your rook arrives on d1 behind the queen. The engine slightly prefers Ne2, guarding c3 first. It's about level.", 'O-O-O — the pin is gone.'],
    ["…e5, the engine's first choice: the pawn kicks your bishop on f4, which has no guard. And there's the same hole as in the main line: with their c-pawn gone and the e-pawn on e5, nothing but their knight covers d5.", '…e5 — kicks the bishop, leaves d5.'],
    ["Bd2, the engine's first choice: the bishop drops back to d2, where it guards your knight on c3 against the bishop on b4. Why not Be3? Then …Bxc3 and …Nxe4 pick off your e4 pawn, and the engine rates that more than a third of a pawn worse. It's about level.", 'Bd2 — guards c3.'],
    ["…O-O, the engine's choice: their king goes short, and yours sits on c1. Kings on opposite wings again, so the game becomes a race. It's about level.", '…O-O — opposite wings.'],
    ["Nge2, the engine's first choice: your last minor piece comes out, guarding the knight on c3 a second time and covering d4 and f4. It's about level.", 'Nge2 — a second guard on c3.'],
    ["…d6, the engine's choice: the pawn backs up e5 and opens the diagonal for their bishop on c8. But it also puts a pawn on the d-file, right where your queen and rook are aimed. For now their queen and the bishop on b4 guard it.", '…d6 — backs up e5.'],
    ["a3: the pawn hits the bishop on b4 and asks the question: trade on c3, or go back? The engine rates Bg5 a touch higher. It's about level.", 'a3 — questions the b4 bishop.'],
    ["…Bc5, the engine's choice: the bishop goes back, but to a square with a new target, f2, a pawn with no guard. It hits a3 too, which the pawn on b2 covers. It's about level.", '…Bc5 — eyes the loose f2 pawn.'],
    ["Bg5, the engine's first choice: the bishop pins the knight on f6 to their queen, and that knight is the only piece of theirs covering d5. It's about level. Your plan for the middlegame: take on f6 to remove that guard, plant a knight on d5, and push f4, which hits e5 and takes the loose pawn off f2.", 'Bg5 — pins the guard of d5.'],
  ],
  'vs …g6 (Bxc6)': [
    ["…g6, about one master in six: they ignore your bishop and get ready to fianchetto. The engine prefers …Nd4. Their bishop is headed for g7, where it would look down the long diagonal at your knight on c3. Before it gets there, do you take the knight on c6?", '…g6 — the fianchetto is coming.'],
    ["Yes: Bxc6, nine masters in ten and the engine's first choice. You give the bishop for the knight right away, and whichever pawn takes back, their c-pawns end up doubled. It's about level.", 'Bxc6 — the c-pawns get doubled.'],
    ["…dxc6, six masters in ten: the d-pawn takes, which opens the d-file and frees their bishop on c8. The engine prefers …bxc6, keeping the d-pawn for the center. After …dxc6 you are a little better.", '…dxc6 — frees c8; …bxc6 was stronger.'],
    ["d3: a modest move with two jobs. The pawn guards e4, and it opens the road for your bishop on c1. The engine rates Nge2 and a4 about the same. You are a little better.", 'd3 — guards e4, frees c1.'],
    ["…Bg7: the bishop arrives on the long diagonal and hits your knight on c3, which the pawn on b2 guards. The engine slightly prefers …Nf6. Now look at their doubled pawns: the front one, on c5, has nothing guarding it at all.", '…Bg7 — hits the c3 knight.'],
    ["Be3, the engine's first choice: the bishop develops with a hit on that loose c5 pawn. They have to do something about it right away. You are a little better.", 'Be3 — hits the loose c5 pawn.'],
    ["…c4: instead of guarding the pawn, they push it, and now it hits your d3 pawn. The engine rates …b6, guarding c5, about the same. The pawn on c4 has no guard of its own, and you are a little better.", '…c4 — pushes past, hits d3.'],
    ["h3: why a quiet pawn move now? It takes g4 away from their bishop on c8, which could otherwise jump there and hit your queen on d1. The engine rates it about the same as d4. You are a little better.", 'h3 — keeps their bishop off g4.'],
    ["…cxd3, the engine's choice: they trade the pawn off before it can be taken, and the new pawn on d3 hits c2. Which pawn takes back?", '…cxd3 — trades, hits c2.'],
    ["cxd3, the engine's first choice, about half a pawn better than Qxd3: take toward the center. Now you have two center pawns, d3 and e4, against their lone e-pawn, and the c-file is half-open for a rook. You are a little better.", 'cxd3 — two center pawns to one.'],
    ["…e5, the engine's choice: the pawn grabs its share of the center and takes d4 and f4 from your pieces. But look at their bishop on g7: the pawn on e5 now stands right in front of it, cutting the long diagonal in half.", '…e5 — a center pawn, blocking its bishop.'],
    ["Nf3, the engine's first choice: the knight develops with a hit on e5, a pawn only their bishop on g7 guards. And you're one move from castling.", 'Nf3 — hits e5, ready to castle.'],
    ["…Ne7, the engine's choice: the knight develops behind its pawns, guarding c6 and covering d5 and f5, and their king can castle next.", '…Ne7 — guards c6, covers d5.'],
    ["You castle short, and the king is safe on g1. The engine rates Qa4 and a4 about the same. You are a little better.", 'O-O — king safe.'],
    ["…O-O, the engine's choice: they castle too. Now take stock of the pawns: you have the extra center pawn, and they have three pawns to your two on the queenside.", '…O-O — both kings safe.'],
    ["a4: the pawn takes space on the queenside and gets ready for a5. The engine slightly prefers Qc2, but it's close, and you are a little better. Your plan for the middlegame: a5 to gain more room, then the d4 break with your extra center pawn, while their bishop on g7 stays shut in behind e5.", 'a4 — queenside space, a5 next.'],
  ],
  'Grand Prix Attack': [
    ["f4: this is the Grand Prix Attack, about one master in six. Remember the f-pawn your knight on c3 left free? Here it goes. The plan is a straight kingside attack: the knight to f3 behind the pawn, the bishop to c4, castle, then the queen swings toward h4 and the pawn pushes on to f5. The engine prefers Nf3, by about a third of a pawn, so this is a fighting choice, and it's about level.", 'f4 — the Grand Prix Attack.'],
    ["…g6, about seven masters in ten: they fianchetto, so their bishop will watch the long diagonal and, once they castle, guard their king. The engine rates …e6 about the same. It's about level.", '…g6 — the fianchetto again.'],
    ["Nf3, nearly every master and the engine's first choice: the knight develops behind the f-pawn and covers d4 and e5. Two more moves, the bishop and castling, and your king is safe.", 'Nf3 — behind the f-pawn.'],
    ["…Bg7, every master: the bishop takes the long diagonal and hits your knight on c3, with b2 and a1 behind it. Two pawns guard that knight, so it's safe. It's about level.", '…Bg7 — the bishop on the long diagonal.'],
    ["Bc4: the bishop goes to the diagonal aimed at f7, a pawn only their king guards. About three masters in ten put it here; nearly six in ten play Bb5 against the knight on c6, and the engine slightly prefers a4 or d3 first. On c4 the bishop backs up the attack, and if they castle, f7 will be pinned to their king.", 'Bc4 — aims at f7.'],
    ["…d6, about one master in ten. More than eight in ten play …e6, the engine's choice by about a third of a pawn, and a pawn on e6 would shut your bishop out of f7. With …d6, that diagonal stays open. It's about level.", '…d6 — the f7 diagonal stays open.'],
    ["You castle, rated the same as Bb3 by the engine. The king is safe on g1, and the rook arrives on f1, on the file of your knight and the f4 pawn. That's the Grand Prix setup: everything pointed at their kingside.", 'O-O — the rook joins the f-file.'],
    ["…Nf6: the knight develops and hits your e4 pawn, which the knight on c3 guards. Once more the engine prefers …e6, closing the bishop's diagonal first. It's about level.", '…Nf6 — on the e4 pawn.'],
    ["d3, the engine's first choice: a second guard for e4, and the road opens for your bishop on c1. It's about level.", 'd3 — e4 guarded twice.'],
    ["…O-O: their king goes to g8, and there's the pin. The pawn on f7 is now pinned to their king by your bishop on c4, so it can't step forward. It's about level.", '…O-O — f7 pinned to the king.'],
    ["Qe1, the engine's first choice and the key move of the setup. The queen steps off d1 onto the road to h4, where it would hit h7, right next to their king. Then f5 can follow to pry their kingside open. It's about level.", 'Qe1 — heading for h4.'],
    ["…Bg4, the engine's choice: the bishop hits your knight on f3, the knight that guards h4, the square your queen wants. You are a little better. So which comes first, the queen or f5?", '…Bg4 — hits the f3 knight.'],
    ["Qh4: the queen arrives and hits three things at once, the knight on f6, the bishop on g4 and the pawn on h7. But the order matters here: the engine wants f5 first, by almost a pawn, and after Qh4 they are a little better.", 'Qh4 — hits three; f5 first was stronger.'],
    ["…Bxf3, the engine's choice: the bishop gives itself up for your knight and sits loose on f3, hitting e4 and g2. You take back, but with which piece? They are a little better.", '…Bxf3 — takes the knight.'],
    ["Rxf3, the engine's choice over gxf3: the rook takes back and stays in the attack. From f3 it can slide to h3, right behind your queen on the h-file. They are a little better.", 'Rxf3 — the rook eyes h3.'],
    ["…e6, the engine's choice: the pawn closes the diagonal from c4 to f7, so the pin is gone, and it covers f5, the very square your pawn wants. They are a little better.", '…e6 — the pin is gone.'],
    ["f5, the engine's first choice: the pawn goes anyway and hits both e6 and g6, trying to pry open the files in front of their king. They are a little better, so this attack has to keep moving. Your plan for the middlegame: when …d5 hits your bishop, step it out of the way, then lift the rook to h3 so it and the queen both bear down on h7.", 'f5 — hits e6 and g6.'],
  ],
  'Fianchetto vs …g6': [
    ["…g6, only about three masters in a hundred: they fianchetto at once, before choosing a square for the knight. The engine prefers …d6, and now you are a little better. Their bishop is heading for g7. So where does yours belong?", '…g6 — an early fianchetto.'],
    ["g3, the masters' top choice here at about a quarter: this is the classic Closed Sicilian. You answer the fianchetto with one of your own, the bishop to g2 behind your e4 pawn, and keep the center shut: d3 and Be3 come next, then the queen to d2, slow and solid. The engine prefers Nf3 or d4, by about four tenths of a pawn, so you're choosing a quiet game. It's about level.", 'g3 — a fianchetto of your own.'],
    ["…Bg7, nine masters in ten: the bishop lands on the long diagonal and hits your knight on c3, which the pawns on b2 and d2 guard. It's about level.", '…Bg7 — hits c3.'],
    ["Bg2, nearly every master: your bishop takes the other long diagonal and guards e4. Mirror images: each side's bishop now sits on a long diagonal. It's about level.", 'Bg2 — guards e4.'],
    ["…Nc6, the engine's choice along with …d6: the knight develops and covers d4, a square it will want later.", '…Nc6 — covers d4.'],
    ["d3, nine masters in ten: a second guard for e4 and a road for your bishop on c1. No d4 push in this plan: the center stays closed, and both sides will play on the wings.", 'd3 — e4 guarded, the center closed.'],
    ["…d6, about three masters in four, and the engine's top pick: the pawn covers e5 and opens the diagonal for their bishop on c8. Both sides have their shape now: a fianchetto each and a closed center.", '…d6 — covers e5, frees c8.'],
    ["Be3, the masters' top choice here at about four in ten, just ahead of f4: the bishop develops onto the c5 pawn and covers h6. That square matters: with Qd2 next, Bh6 can come and trade off their bishop on g7, the piece that will guard their king.", 'Be3 — on c5, eyeing h6.'],
    ["…Rb8, the masters' top choice at about a third, and the engine's too: the rook steps behind the b-pawn. Their plan is plain: …b5 and …b4, rolling the pawn at your knight on c3.", '…Rb8 — the b-pawn will march.'],
    ["Qd2, eight masters in ten: the queen lines up behind the bishop on e3, so Bh6 is ready to trade off their bishop on g7. The engine prefers a4 first, taking b5 away from their pawn. It's about level.", 'Qd2 — Bh6 is coming.'],
    ["…b5, more than nine masters in ten and the engine's choice: the pawn marches, and …b4 will hit your knight on c3. That's the shape of the race: they push on the queenside, you build on the kingside. It's about level.", '…b5 — the queenside race starts.'],
    ["Nge2, about six masters in ten: the last knight comes out to e2, where it guards the knight on c3 and leaves your f-pawn free to go to f4 later. It's about level.", 'Nge2 — guards c3, f-pawn free.'],
    ["…b4: the pawn hits your knight on c3, and a knight can't sit where a pawn hits it. The engine slightly prefers …h5 first. So where does the knight go?", '…b4 — hits the c3 knight.'],
    ["Nd1, the engine's choice, and by far. Nd5 looks more active, but it runs into …e6 and then …Bxb2, more than a pawn worse. On d1 the knight is passive but guards b2, and it needs to: with c3 empty, their bishop on g7 now hits that pawn, pinned to your rook on a1. It's about level.", 'Nd1 — passive, but b2 is guarded.'],
    ["…Nd4, the engine's choice: the knight jumps to the square it was covering all along and hits c2 and your knight on e2. Now they are a little better, so it's time to get your king safe.", '…Nd4 — hits c2 and e2.'],
    ["You castle short, the engine's choice. Your king tucks in behind the bishop on g2, and the rook on f1 now stands behind the f-pawn, ready for f4. It's about level.", 'O-O — king safe, f4 ready.'],
    ["…h5, the engine's choice: a pawn move on your king's wing. It covers g4, and right now nothing of yours does, so their bishop on c8 could land there and hit your knight on e2. It's about level.", '…h5 — covers g4.'],
    ["h3: your pawn covers g4 too, so their bishop can't settle there. The engine slightly prefers c3, kicking the knight off d4 at once, but it's close, and it's about level. Your plan for the middlegame: c3 to send that knight away, then f4 and g4 to start your own pawns rolling on the kingside, while theirs press on the queenside.", 'h3 — g4 covered.'],
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

export const PRO_GOTHAMCHESS_CLOSED_SICILIAN_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-closed-sicilian',
  title: "This repertoire's Closed Sicilian — 2.Nc3 and a Theory-Light Pull",
  orientation: 'white',
  sources: [
    'concept:pos-development',
    'concept:pos-center',
    'https://www.chess.com/openings/Closed-Sicilian',
    'https://en.wikipedia.org/wiki/Sicilian_Defence,_Closed_Variation',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
