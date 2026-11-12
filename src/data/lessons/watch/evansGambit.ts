// Evans Gambit — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=evans-gambit`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move, and the app's teaching computers on every move (pass two). Said the
// way Naroditsky teaches in his speedruns (the Danya style sheet, a trial):
// the lead spread by moment (the plan, the choice, the opening's idea, the
// mistake), their moves judged first, a line played out when it proves the
// point, numbers only where they are the lesson. One story runs through the
// main line: the pawn buys two moves with a threat (c3, d4), the a5-bishop's
// pin on c3 that castling breaks, the two pins castling hands them, the
// knight that h3 chases to the edge and the bishop that comes for it, and the
// e6 hole their …f6 leaves behind.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O', 'd6', 'cxd4', 'Bb6', 'Nc3', 'Nf6', 'Ba3', 'O-O', 'e5', 'Ng4', 'h3', 'Nh6', 'exd6', 'cxd6', 'd5', 'Ne7', 'Ne4', 'Bc7', 'Bc1', 'Ng6', 'Bg5', 'f6', 'Bxh6', 'gxh6', 'Nd4'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 starts the road to the Evans Gambit, a Welsh sea captain's idea from around 1830 that Kasparov brought back in the 1990s. The whole plan in one line: aim a bishop at f7, then pay a pawn to build the center with tempo.", 'e4 — toward the Evans Gambit.'],
  ['…e5 is the classical answer: they take their share of the center and free the bishop on f8. That bishop is about to land on c5, and the whole gambit is built around hitting it there.', '…e5 — classical; the f8 bishop is free.'],
  ['A rule worth keeping: develop with a threat when you can. Nf3 brings a piece out and hits the pawn on e5, which nothing guards yet, so their next move has to deal with it.', 'Nf3 — develops and hits e5.'],
  ['…Nc6 is the most natural move on the board: one move develops a piece and guards e5. The other try is …Nf6, hitting back at e4 and leaving e5 to its fate. Here they keep it simple.', '…Nc6 — guards e5, develops.'],
  ['Where does this bishop belong? On b5 it\'s the Ruy Lopez, leaning on the knight that guards e5. On c4 it\'s the Italian, aimed straight at f7, the one pawn that only their king guards. That pawn is the target of the whole opening.', 'Bc4 — the Italian, aimed at f7.'],
  ['…Bc5, the Giuoco Piano, and a perfectly good move: their bishop mirrors yours and aims at f2. But nothing guards that bishop on c5, and a piece without a guard is the first thing to go after.', '…Bc5 — Giuoco Piano, aimed at f2.'],
  ['And here\'s the Evans Gambit: b4, a pawn thrown at that unguarded bishop. Only about one master in fourteen plays it, while most choose the quiet c3. Why give a pawn away? Count moves, not pawns: if they take, c3 hits the bishop again and d4 follows, so your center arrives with tempo.', 'b4 — the Evans: a pawn for time.'],
  ['…Bxb4 is the main answer, and the engine\'s choice too. Now the bishop on b4 pins your d-pawn to your king, so d4 can\'t come yet. Your next move kicks it away, and the pin goes with it.', '…Bxb4 — takes, and pins your d-pawn.'],
  ['Step one of the payback: c3 hits the bishop, so it has to move, and the pin on your d-pawn goes with it. And when d4 comes next, this pawn stands right behind it.', 'c3 — hits the bishop, prepares d4.'],
  ['…Ba5 is the main retreat, and a sly one: out of the pawn\'s reach, but still on the diagonal to your king. Push d4, and if they go on with …exd4, your c-pawn can\'t take back, because it\'s pinned.', '…Ba5 — still aimed at your king.'],
  ['Step two: d4, joining your knight against e5. That\'s the center the pawn paid for. But don\'t miss the catch: with d2 empty, the bishop on a5 now pins your c3 pawn to your king.', 'd4 — hits e5, but c3 is pinned.'],
  ['…exd4 grabs a second pawn, and now the natural recapture, cxd4, isn\'t even legal: the c-pawn is pinned. Their pawn hits c3 too. The cure is to take your king off that diagonal.', '…exd4 — a second pawn; c3 pinned.'],
  ['Two good ways on: Qb3, lining up on f7 right away, or castle. Castling is the clean one: your king steps off the diagonal, the pin on c3 is gone, and cxd4 is ready. If they grab a third pawn instead, that\'s the Compromised Defence.', 'O-O — unpins c3; cxd4 is next.'],
  ['…d6 is solid and natural: it covers e5 and frees the bishop on c8. If you go for f7 with Qb3, they go on with …Be6, blocking the line and offering a trade of bishops.', '…d6 — covers e5, frees the c8 bishop.'],
  ['cxd4, and here\'s the bargain of the Evans: one pawn down, but two pawns side by side on d4 and e4. Together they cover c5, d5, e5 and f5, and either one can step forward with the other behind it.', 'cxd4 — the center, one pawn down.'],
  ['…Bb6 is a slight slip: the engine prefers …Nf6. The bishop drops back and hits d4. And if you push d5 to hit the knight, they go on with …Na5 and attack your bishop on c4.', '…Bb6 — hits d4; …Nf6 was better.'],
  ['Nc3, on the square your c-pawn just left: the knight backs up e4 and covers d5. What if they go after your bishop with …Na5? It simply drops back to d3, where it guards e4 too, and you keep developing.', 'Nc3 — backs up e4, covers d5.'],
  ['…Nf6 is the most natural developing move on the board, and it\'s a mistake: the engine prefers …Na5. The knight stands right in front of your e-pawn, so e5 hits it with tempo. You are clearly better.', '…Nf6 — natural, but e5 now hits it.'],
  ['Two candidates: e5 at once, or Ba3 first. The engine wants e5 now, while their king is still in the middle. After Ba3 they castle, and it\'s about level. Still, see what Ba3 does: with b2 empty, the bishop takes the a3–f8 diagonal and hits d6.', 'Ba3 — the a3–f8 diagonal; e5 was stronger.'],
  ['…O-O is natural and correct, but look what it walks into. With their king on g8, f7 is pinned by your c4 bishop. With their rook on f8, d6 is pinned by your a3 bishop. Two pins, both from your bishops.', '…O-O — now f7 and d6 are pinned.'],
  ['Now e5, hitting the knight on f6 and the pawn on d6. Taking it is natural, but remember the pin: once the d6 pawn leaves, your bishop sees the rook on f8 and you win the exchange. So the knight has to move.', 'e5 — hits f6 and d6 at once.'],
  ['…Ng4 is a slip: the engine prefers …Nh5. The idea is natural: the knight escapes the pawn and hits e5, f2 and h2. But on g4 it can be kicked at once, and it has nowhere good to go.', '…Ng4 — hits e5; …Nh5 was better.'],
  ['h3 asks the knight where it\'s going. Back to f6 runs into your e5 pawn, and e3 into your f2 pawn. That leaves the edge, where a knight reaches half the squares it would in the center.', 'h3 — chases the knight to the edge.'],
  ['…Nh6 is the best of a bad lot. On h6 the knight hits nothing at all. Remember this knight: it sits there for a while, and later your bishop comes looking for it.', '…Nh6 — on the edge, hitting nothing.'],
  ['Remember the capture on d6 you held back? Now it comes: exd6. Threat first, capture after, and now the pawns come off with their knight already sent to the edge. The e-file opens all the way for your rooks.', 'exd6 — threat first, capture after.'],
  ['…cxd6 is the only way to take back: the queen can\'t, since your a3 bishop hits d6. And the new pawn on d6 is pinned to their rook, just like the old one. The c-file is wide open now, too.', '…cxd6 — and d6 is pinned again.'],
  ['d5 hits the knight on c6, but the real point is d6. With no c- or e-pawns left on their side, that pawn is isolated, and d5 fixes it right where your a3 bishop aims. Fix a weak pawn first, then pile up on it.', 'd5 — hits c6, fixes d6.'],
  ['…Ne7 is natural and clever: it steps between d6 and their rook, breaking that pin, and hits your pawn on d5. Does d5 need help? No: if they go on with …Nxd5, Bxd5 wins a knight for a pawn.', '…Ne7 — breaks the pin, hits d5.'],
  ['Where does this knight belong? e4, and now count on d6: your knight and your a3 bishop hit it, only their queen guards it, and no pawn ever can, with their c- and e-pawns gone. Two attackers, one defender: they need help fast.', 'Ne4 — d6 is hit twice now.'],
  ['…Bc7 gives d6 a second guard, and now it holds. But their bishop is tied to a pawn, doing nothing else. When a target is covered, switch to another, and there\'s an easy one: the knight stranded on h6.', '…Bc7 — guards d6, but passively.'],
  ['A backward move with a point: Bc1. The bishop\'s work on d6 is done, so it switches diagonals, and from c1 it hits the stranded knight on h6. If it ever takes there, the pawns in front of their king are broken for good.', 'Bc1 — switches diagonals, eyes h6.'],
  ['…Ng6 is the right move: the other knight comes over to cover e5 and f4. Why not …Nef5, a more active square? Your g-pawn would kick it from there. And h6? They let it go, since taking there is only a trade.', '…Ng6 — covers e5 and f4.'],
  ['Why not take on h6 right away? It isn\'t going anywhere. Same rule as before: threat first, capture after. Bg5 hits the queen, and from g5 the bishop still eyes h6, so whatever they do about the queen, the knight is still sitting there.', 'Bg5 — hits the queen first; h6 waits.'],
  ['…f6 is their best: it blocks the queen\'s line and hits your bishop. But every pawn move leaves something behind, and here it\'s e6: with their d- and f-pawns gone, no pawn of theirs can ever guard that square again.', '…f6 — blocks, but the e6 hole appears.'],
  ['Bxh6, and there\'s the payoff: instead of retreating, the bishop takes the knight your h3 pawn chased to the edge. When the g-pawn takes back, their king loses the pawn in front of it for good.', 'Bxh6 — takes the knight on the edge.'],
  ['…gxh6, and they get the two bishops. But look at their king: no g-pawn in front of it, two pawns stacked on h6 and h7, and the hole on e6 from a move ago. You are clearly better.', '…gxh6 — two bishops, but a broken king.'],
  ['Nd4 heads for the hole on e6. If they push …f5 to kick your e4 knight, it reroutes and the d4 knight jumps in anyway. If their bishop takes it on e6, your d-pawn takes back and becomes a passed pawn deep in their camp. Your plan: get to e6, then turn your queen and rooks on their broken kingside.', 'Nd4 — heading for the hole on e6.'],
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
    ['…d6 is the solid answer and the engine\'s choice: no second pawn, just a guard on e5. If you castle quietly now, they go on with …Nf6 and hit your e-pawn, so you want something with more bite.', '…d6 — guards e5, frees the c8 bishop.'],
    ['Usually an early queen move just gets kicked around. This one earns it: Qb3 lines up behind your bishop on f7, and hits b7 too. The threat is Bxf7+, and their king can\'t take back, because your queen covers f7.', 'Qb3 — the battery on f7.'],
    ['…Qd7 is the main defence, and the engine\'s choice: the queen guards f7 along the seventh rank. It\'s an awkward square, blocking their own c8 bishop, but now Bxf7+ just loses your bishop, because the queen takes back.', '…Qd7 — guards f7, blocks the c8 bishop.'],
    ['Two ways on: castle, or open the center first. Taking on e5 hits d6, and once they take back, the d-file is open with their queen standing right on it. A queen on an open file is a target for a rook.', 'dxe5 — the d-file opens.'],
    ['…dxe5 is the natural recapture, and now the d-file is open with their queen standing on it. That\'s your next target: castle, and your rook is one step from d1, where it hits the queen.', '…dxe5 — the d-file opens on their queen.'],
    ['Castling does two jobs at once. Your king leaves e1, so the pin on c3 is gone, and your rook on f1 is one step from the open d-file. Rd1 comes next, hitting their queen.', 'O-O — unpins c3, eyes Rd1.'],
    ['…Bb6 is the right move: the bishop drops back and pins f2 to your king. It also makes room for …Na5, which would hit your queen and your bishop at once.', '…Bb6 — pins f2, makes room for …Na5.'],
    ['Rd1, with tempo: the rook takes the open file and hits the queen on d7. Can they just trade? …Qxd1+ Qxd1 hands you a queen for a rook. So the queen has to step off the file, and you\'ve gained a move.', 'Rd1 — the open file, hits the queen.'],
    ['…Qe7 is the best square: off the file, still guarding f7. Why not …Na5, hitting your queen? Bxf7+, the queen takes back, Rd8+ drags the king out, and a few checks later your rook takes on h8. It\'s about level, a pawn down. Your plan: Rd5 to keep the rook active, then Nbd2, with f7 still the target.', '…Qe7 — off the file, still guards f7.'],
  ],
  'Evans Gambit: Compromised Defence': [
    ['…dxc3, the Compromised Defence, and the name says it all: a third pawn, paid for with their position. The engine prefers …Nge7. Their king is still in the middle and most of their pieces are at home, so three pawns down, you are already a little better.', '…dxc3 — a third pawn, at a price.'],
    ['Qb3, and the battery is back: the queen lines up behind your bishop on f7, and it hits c3 too. The threat is Bxf7+, with their king unable to take back. If they guard with …Qf6, e5 kicks the queen and you keep the initiative.', 'Qb3 — battery on f7, hits c3.'],
    ['…Qe7 guards f7 and hits your e4 pawn, which has no guard. So your next move has two jobs: guard e4 and bring a piece out. One move does both and wins a pawn back: the knight takes on c3.', '…Qe7 — guards f7, hits e4.'],
    ['Nxc3 does both jobs: a pawn back, and e4 guarded. Can they take the knight? Play it out: …Bxc3, Qxc3, and you\'ve swapped a knight for their bishop and a pawn, with your queen on the long diagonal. You are a little better.', 'Nxc3 — a pawn back, e4 guarded.'],
    ['…Bxc3 is their best, and it comes with a threat: the bishop hits your rook on a1. But it\'s a loose piece sitting right next to your queen, so you just take it, and the rook is safe.', '…Bxc3 — hits a1, but it\'s loose.'],
    ['Qxc3 takes the bishop and lands on the long diagonal, aimed at g7, which has no guard. And e4? It looks loose, but if they go on with …Qxe4, Re1 pins the queen to their king and wins it for a rook. You are clearly better.', 'Qxc3 — aims at g7; e4 is bait.'],
    ['…Nf6 is their best: it blocks the diagonal to g7 and adds a second attacker on e4. If you push e5 to kick it, it jumps to e4 and hits your queen. So e4 needs another answer, one with a threat.', '…Nf6 — blocks g7, hits e4 again.'],
    ['Ba3, with tempo: the bishop hits their queen, so e4 has to wait. If they grab it anyway with …Qxe4, a rook to e1 pins the queen to their king. Your plan: they have to block with …d6, and then e5 hits the knight and the pawn on d6 at once, tearing the center open while their king is still on e8.', 'Ba3 — hits the queen; …d6, then e5.'],
  ],
  'Evans Gambit Declined': [
    ['…Bb6 declines the gamble: only about one master in eight does this, and the engine prefers taking. The bishop keeps aiming at f2, and your b4 pawn is left alone. Is it hanging? Not quite: grabbing it with the knight would take the only guard off e5.', '…Bb6 — declines; your b4 pawn is loose.'],
    ['a4 starts a plan: a push to a5 next, hitting the bishop on b6 and grabbing queenside space. And if they take on b4 in the meantime, that push comes anyway and the bishop has to run.', 'a4 — a5 next, hitting the bishop.'],
    ['…a6 is the natural answer: if your pawn comes to a5, the bishop has a7 to step back to and stays on its diagonal. That\'s prophylaxis, answering a plan before it arrives.', '…a6 — a7 ready for the bishop.'],
    ['Nc3 develops and covers d5, and it also settles the question of your b4 pawn. If they grab it with …Nxb4, the knight has left e5 unguarded, and Nxe5 wins a pawn of your own, with the knight eyeing f7.', 'Nc3 — covers d5; …Nxb4 drops e5.'],
    ['…Nf6 is natural and good: it develops, hits e4, and gets ready to castle. Right now only your knight on c3 guards e4, so that knight is tied down. Your next move sets it free.', '…Nf6 — hits e4, ties your knight.'],
    ['Two ways to go: jump into d5 at once, or give e4 a pawn guard first. d3 is the quiet way: with e4 guarded, your knight is free, and your c1 bishop\'s diagonal opens all the way to g5.', 'd3 — guards e4, frees the knight.'],
    ['…d6 is solid, and it changes something. Before, grabbing your b4 pawn would have dropped e5. Now the pawn on d6 guards it, so the threat on b4 is real. Castle carelessly and they simply take it. So what does b4 need?', '…d6 — guards e5, so b4 is hanging.'],
    ['The answer is Rb1, the engine\'s first choice: the rook guards b4 and stands behind it, ready for the day the b-file opens. And if they go on with …a5 to hit the pawn again, b5 slips past and attacks the knight on c6.', 'Rb1 — guards b4 from behind.'],
    ['…h6 is a useful little move, and it answers yours. Remember the diagonal d3 opened toward g5? Now neither your bishop nor your knight can land there: no bishop pinning the knight on f6, no knight jumping in to hit f7.', '…h6 — takes g5 away from your pieces.'],
    ['Here\'s the push a4 prepared: a5 hits the bishop on b6, with your b4 pawn guarding it. Where does the bishop go? This is why they played …a6 earlier: the a7 square is waiting for it.', 'a5 — hits the bishop on b6.'],
    ['…Ba7 is the right retreat: same diagonal, still aimed at f2. Why not strike back with …d5 instead? Because the bishop would still be hanging: after exd5, the bishop runs to d4 to save itself, and dxc6 takes a knight. You\'d come out clearly better.', '…Ba7 — still aimed at f2.'],
    ['A simple rule: trade off the enemy piece that\'s aimed at your king. The bishop on a7 has been staring at f2 all along, and Be3 offers to swap it. If they take, your f-pawn takes back, and the new pawn on e3 covers d4.', 'Be3 — offers to trade the a7 bishop.'],
    ['…Nd4 is a natural jump into the center: the knight hits yours on f3 and the pawn on c2, offering a trade. If they go on with …Nxf3+, the queen takes back and comes into the game for free.', '…Nd4 — hits f3, offers a knight trade.'],
    ['What about taking the knight? Nxd4 is the natural move, and it\'s a mistake: …exd4 forks your bishop and your knight. Taking with the bishop is fine, and so is h3, which keeps their bishop off g4. Your plan: castle, and if the knight takes on f3 with check, the queen takes back.', 'h3 — covers g4; Nxd4 loses a piece.'],
  ],
  'Evans Gambit: Stone-Ware Variation': [
    ['…Bd6 is the Stone-Ware, and it looks odd for a reason: the bishop guards e5 but blocks its own d-pawn, so the c8 bishop stays shut in. The engine prefers dropping back to e7. And with no bishop on a5, nothing will pin your c3 pawn.', '…Bd6 — guards e5, blocks their d-pawn.'],
    ['So d4 comes with no strings attached. If they take, cxd4 recaptures at once, since nothing pins the c-pawn this time, and you have two center pawns side by side. It\'s about level.', 'd4 — and this time c3 is free.'],
    ['…h6 is slow: it keeps your knight and bishop off g5 but brings nothing out. With the center about to open, a pawn move that develops nothing is time you can use, and the best use here is getting your king safe.', '…h6 — covers g5, but slow.'],
    ['Castle, the engine\'s first choice: get your king safe before the center opens. And it keeps the tension. Your d4 pawn still leans on e5, and they have to decide what to do about it.', 'O-O — king safe before the center opens.'],
    ['…Nge7 is the best square, rather than …Nf6, because of where the knight goes next: on to g6, guarding e5 a third time. From e7 it also leaves the f-pawn free to push to f5 and hit your e4 pawn.', '…Nge7 — heading for g6.'],
    ['A quiet move with a point. On c4 your bishop had no guard, and on b3 your a-pawn guards it. It still aims at f7, so nothing is lost and a loose piece is gone.', 'Bb3 — guarded now, still on f7.'],
    ['…Ng6 arrives. Count on e5: three guards, the knights on c6 and g6 and the bishop on d6, against your two attackers, the pawn on d4 and the knight on f3. Pressure alone won\'t win it, so you need another way in.', '…Ng6 — e5 guarded three times.'],
    ['So release the tension: the pawn takes on e5 and hits the bishop on d6. It\'s the engine\'s first choice, and you are a little better. Open lines favor the side with the safer king, and yours is already castled.', 'dxe5 — opens the center, hits d6.'],
    ['…Ngxe5 is a natural recapture, and it offers a trade: the knight hits yours on f3. You can take, or step aside to d4 and keep the knights on. Both are fine, and taking is the simpler road.', '…Ngxe5 — offers a knight trade.'],
    ['You take the trade, and look what your knight on e5 hits now: the knight on c6 and the pawns on d7 and f7. And f7 is hit twice, with your b3 bishop behind it. So they have to take back at once.', 'Nxe5 — hits c6, d7 and f7.'],
    ['…Bxe5 is their best, and the bishop lands on the long diagonal: it hits c3, which is pinned to your rook on a1, so pushing c4 would drop the rook. It\'s about level. Your plan: f4 kicks the bishop, e5 kicks it again, and your pawns gain space with tempo.', '…Bxe5 — long diagonal, pins c3.'],
  ],
  'Evans Gambit: Lasker Defence': [
    ['Two moves here: Qb3, going after f7 at once, or castling first. Castling is calm, but it asks them no question, so they get a free move, and that\'s exactly what Lasker\'s idea needs. Watch what they do with it.', 'O-O — calm, and it gives them time.'],
    ['…Bb6 is Lasker\'s Defence: give the pawn back on their terms. Play it out: you take on e5, they take back, the queens come off on d8, and your knight picks up the pawn on e5. After that the material is level and your attack is gone.', "…Bb6 — Lasker's idea: return the pawn."],
    ['You take on e5 anyway, the engine\'s first choice: the pawn hits d6, and once it\'s taken back, the d-file opens straight between the queens. The real decision of this line comes one move from now.', 'dxe5 — opens the d-file between queens.'],
    ['…dxe5 is natural, and now the queens face each other down the open file. Your choice: trade with Qxd8+, and after their knight takes back, your knight wins back the pawn on e5. Or keep the queens on and play for an attack. Which would you pick?', '…dxe5 — the queens face each other.'],
    ['Here\'s a decision strong players often get wrong. Qb3 keeps the queens on and lines up on f7, and masters play it almost as often as the trade, but the engine clearly prefers Qxd8+. After Qb3 they are a little better: you\'re a pawn down with no attack to show for it.', 'Qb3 — keeps queens on; Qxd8+ was better.'],
    ['…Qf6 is a good square: it guards f7, hits your knight on f3, and gives e5 a second guard, so Nxe5 would just drop the knight. If they go on with …Qg6, your e4 pawn is under fire too.', '…Qf6 — guards f7, hits f3.'],
    ['Their queen hits your knight, so you hit the queen: Bg5, the engine\'s first choice. It brings a piece out with tempo and makes her move again before she can settle.', 'Bg5 — hits the queen with tempo.'],
    ['…Qg6 is their best, and it hits back: your bishop on g5 and your e4 pawn are both attacked, and e4 has no guard. Why not drop back to d6? Then Bxf7+ wins a pawn with check, and the king can\'t take back.', '…Qg6 — hits g5 and e4.'],
    ['Bd5 looks right: it guards e4 and hits the knight on c6, the only guard of e5. But the engine prefers a4, and after Bd5 they are clearly better. A centralized bishop that can be kicked is a target, and their next move kicks it.', 'Bd5 — guards e4; a4 was better.'],
    ['…Nge7 is a good move: the knight develops, hits your bishop on d5, backs up c6, and gets their king ready to castle. Your plan: take on e7 first. If the knight takes back, e5 has lost its guard and Nxe5 wins your pawn back. If the king takes, trade on c6 first, then take on e5.', '…Nge7 — hits d5, castling next.'],
  ],
  'Evans Gambit: Morphy Attack': [
    ['Push or develop? d5 is the Morphy Attack: it hits the knight on c6 and grabs space. But the engine prefers Nbd2, getting a piece out first. The cost of pushing: with d4 gone, the bishop on b6 now pins your f2 pawn to your king.', 'd5 — hits c6; Nbd2 was better.'],
    ['…Na5 is the right reply: the knight goes to the edge, but with a point. It hits your bishop on c4, and nothing guards that bishop. So do you have to move it right away?', '…Na5 — hits the loose bishop on c4.'],
    ['Not yet. Bb2 hits g7, and look what\'s behind it: the rook on h8. If they grab your bishop with …Nxc4, Bxg7 hits the rook, and with the knight still on g8 it has nowhere to go. It falls next move: a rook and a pawn for your bishop.', 'Bb2 — hits g7; …Nxc4 runs into Bxg7.'],
    ['…Nf6 is their best: it develops, blocks the long diagonal so the trick on g7 is gone, and hits e4 and d5. Now your c4 bishop really has to move. Your plan: Bd3 to save it and guard e4, then bring out the queen\'s knight, with the b2 bishop waiting for that f6 knight to move.', '…Nf6 — blocks the diagonal, hits e4.'],
  ],
  'Evans Gambit: Anderssen Variation': [
    ['…Bb6 is a different move order: the bishop drops back at once to give their d4 pawn a second guard. You simply take back with the c-pawn, since your king has already left the diagonal, and if they go on with …d6, you\'re right back in the main line.', '…Bb6 — guards d4, a new move order.'],
    ['There are your two center pawns. Can they win d4 back? Play it out: …Nxd4, Nxd4, …Bxd4, Qxd4, and you\'ve come out a piece ahead. So d4 is safe.', 'cxd4 — two center pawns, and d4 holds.'],
    ['…d6, and look: this is the main line\'s position exactly, reached in a different order. The pawn covers e5 and frees the c8 bishop. The plan doesn\'t change: finish developing, then strike in the center.', '…d6 — back in the main line.'],
    ['Nc3, as in the main line: the knight backs up e4 and covers d5, one more piece out before the center opens. And this time, watch what you do with the next chance.', 'Nc3 — backs up e4, covers d5.'],
    ['…Nf6 again, the same natural mistake as in the main line: the engine prefers …Na5. The knight stands right in front of your e-pawn, and you are clearly better. This time, don\'t let the moment pass.', '…Nf6 — the same mistake; punish it now.'],
    ['e5 at once, the move the main line put off. It hits the knight on f6 and the pawn on d6 while their king is still in the middle. Strike before they castle: when you\'re ahead in development, every move of delay lets them catch up.', 'e5 — strike before they castle.'],
    ['They take on e5, their best, and now your d4 pawn is attacked. Taking back is natural, and it\'s a real mistake: …Qxd1 trades the queens, and after you take back, their knight jumps to g4 and goes after f2. Your attack is gone and they\'re the ones pressing. So leave d4 alone.', "…dxe5 — hits d4; don't take back."],
    ['Ba3 instead, and here\'s the point: the bishop covers f8, the square their king has to cross to castle short. Their king is stuck in the middle, and you\'re the one with open lines. You are clearly better.', 'Ba3 — covers f8; no castling.'],
    ['They take on d4, their best, grabbing a third pawn, and the knight hits yours on f3. But it leaves the pawn on e5 with no guard. Your answer is simple: take the knight, and then count again.', '…Nxd4 — a third pawn, but e5 hangs.'],
    ['Take back with the knight, not the queen: taking with the queen would just hang her to …exd4. After Nxd4 the material is level for a moment, and their bishop takes back next. You are clearly better.', 'Nxd4 — the knight, not the queen.'],
    ['…Bxd4 is their best, and it looks scary: it hits your knight on c3, pinned to your rook on a1, and pins your f2 pawn to your king. Is the knight lost? Look for a move that steps out of the pin with a threat.', '…Bxd4 — hits c3, two pins.'],
    ['Here\'s that move: Nb5. The pinned knight steps away and hits back, at the bishop on d4 and the pawn on c7. And if they grab your rook with …Bxa1, the queen takes back and lands on the long diagonal, aimed at e5. You are clearly better.', 'Nb5 — out of the pin, hits d4.'],
    ['…Be6 develops and offers to trade off your c4 bishop, but it doesn\'t solve their real problem: the king can\'t castle while your bishop covers f8. Your plan: Qa4 or Qb3 to bring the queen in. If their queen comes to d7 to meet Qa4, Nxc7+ forks the king and rook.', "…Be6 — hits c4, but the king's stuck."],
  ],
  'Evans Gambit: Main Line with Qb3': [
    ['Two ways on: open the center with dxe5, or castle and keep the tension. Castling is the engine\'s choice here: your king leaves e1, the pin on c3 is gone, and d4 keeps leaning on e5. Tension you hold is a decision they have to make.', 'O-O — unpins c3, keeps the tension.'],
    ['…Bb6 is their best, and it does two jobs: the bishop adds a third attacker on d4, and it makes room for the knight. If they go on with …Na5, your queen and your c4 bishop are both hit at once.', '…Bb6 — hits d4, makes room for …Na5.'],
    ['Nbd2 sees …Na5 coming: from d2 the knight guards both of its targets, your queen on b3 and your bishop on c4, and it backs up e4 as well. When the knight jumps in, nothing hangs.', 'Nbd2 — guards b3 and c4.'],
    ['…exd4 releases the tension, and their pawn on d4 now hits c3. In the main line that was a real problem, but with your king castled, nothing pins the c-pawn, so it simply takes back.', '…exd4 — takes, but c3 is free.'],
    ['Take back, and there\'s the pair the pawn paid for: d4 and e4 side by side. But count d4: their bishop and knight both hit it, and only your knight on f3 defends it. Two against one. Will they notice?', 'cxd4 — the center, but d4 is short.'],
    ['They don\'t notice. …Na5 hits your queen and bishop at once, which looks strong, but both are guarded. The engine prefers taking on d4 with the knight: after you take back and the bishop takes again, they\'ve simply won your d-pawn.', '…Na5 — flashy; taking on d4 was better.'],
    ['The queen has to move, so find the square that does the most. Qc3 hits the knight on a5 right back and still guards your bishop on c4. If they take on c4 anyway, the knight on d2 takes back.', 'Qc3 — hits a5, still guards c4.'],
    ['…Ne7 is their best: the knight develops toward g6, and their king can castle next. You\'re a pawn down and a little better. Your plan: Re1 behind your e-pawn, then a4 and h3, with d4 and e4 as the center your pawn paid for.', '…Ne7 — develops, castling next.'],
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
