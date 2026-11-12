// The Four Knights Game — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=four-knights-game`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move, the app's teaching computers, and (pass two, trial 2) the second and
// third order: where each move's engine line goes, the squares a pawn move
// gives up for good, what club players get wrong, and the line's plan. Said
// the way Naroditsky teaches in his speedruns (the Danya style sheet): the
// lead spread by moment, their moves judged and answered, one idea followed
// past the board in front of you, numbers only where they are the lesson.
// One thread runs through the course: four knights out is a mirror, and the
// game is decided by who changes it first and what that change leaves behind
// — the bishop pair against doubled c-pawns and the c4 hole in the Spanish
// lines, the doubled pawns that straighten out in the Scotch, the e3 hole and
// the open e-file in the gambits, the f-file the Glek opens on purpose.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5', 'Bb4', 'O-O', 'O-O', 'd3', 'd6', 'Bg5', 'Bxc3', 'bxc3', 'Qe7', 'Re1', 'Nd8', 'd4', 'Bg4'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["The Four Knights is chess at its most natural: knights out first, hard questions later. It starts with e4, which takes a central square and opens lines for your queen and the bishop on f1.", 'e4 — the center, open lines.'],
  ["…e5, the classical answer: pawn against pawn, and their bishop on f8 can come out. But look at that pawn on e5. Nothing guards it yet, and your next move goes straight at it.", '…e5 — pawn against pawn; e5 unguarded.'],
  ["Develop with a threat whenever you can, and Nf3 is the model: the knight comes out and hits the pawn on e5 in one move. Their next move is decided for them, because that pawn needs a guard.", 'Nf3 — develops and hits e5.'],
  ["Defend e5, or hit back at e4? …Nf6 would counterattack and leave e5 to its fate, which is the Petrov. …Nc6 defends instead, with a piece that wanted to come out anyway.", '…Nc6 — guards e5, develops.'],
  ["Here's the fork in the road. You could play Bb5, the Ruy Lopez, or Bc4, the Italian, or d4, the Scotch. Nc3 is the quietest move: it guards e4, covers d5 and keeps all three for later. It's about level.", 'Nc3 — guards e4, keeps every option.'],
  ["…Nf6, and there are the four knights: the same pieces on the same squares. Their knight hits e4, but your knight on c3 guards it. In a mirror the only question is who breaks it first, and how.", '…Nf6 — four knights, a mirror.'],
  ["Bb5, the Spanish Four Knights. Why b5? It clears f1 for castling and leans on the knight on c6, the only guard of e5. Nothing hangs yet, but if that knight is ever traded off, e5 has no guard at all.", 'Bb5 — leans on the guard of e5.'],
  ["The mirror holds: …Bb4 hits your knight on c3, the only guard of e4, as your bishop leans on the guard of e5. …Nd4 instead, jumping at your bishop, breaks the mirror at once: the Rubinstein tab.", '…Bb4 — the mirror, aimed at c3.'],
  ["Castle before anything opens: your king leaves the e-file, and the rook is one move from e1. And if they take on c3 now? You take back with a pawn: your c-pawns get doubled, but the two bishops are yours.", 'O-O — king safe, rook next.'],
  ["They castle too: same pieces, same squares. So how do you get an edge out of a mirror? Change something first. Bxc6 would double their pawns at once; the main line takes a slower road, starting with d3.", '…O-O — still a perfect mirror.'],
  ["d3 looks modest, but it does two jobs: it gives e4 a pawn guard, so the knight on c3 isn't its only one, and it opens the diagonal for your bishop on c1, the piece that breaks the mirror next move.", 'd3 — guards e4, frees the c1 bishop.'],
  ["…d6 completes the mirror, a pawn behind e5 just like yours. Your move, and two ways to break it: pin their knight with Bg5, the main line, or reroute your own with Ne2, on the Symmetrical tab.", '…d6 — the mirror complete.'],
  ["Now you break the mirror: Bg5 pins the knight on f6 to their queen. Follow it two steps. While the pin holds, that knight can't leave f6, and if a pawn ever has to take back there after Bxf6, their f-pawns end up doubled and their king loses its cover.", 'Bg5 — pins the f6 knight.'],
  ["…Bxc3 costs them the bishop pair, and they pay it on purpose: your knight could jump to d5 and hit the pinned knight a second time, so it goes first. You pay too: you take back with a pawn.", '…Bxc3 — removes the knight before d5.'],
  ["Doubled pawns for the two bishops is a good bargain here. bxc3 takes toward the center, so the pawn on c3 can back up d4, and the b-file is half-open for a rook. Not Bxf6 first: after …Qxf6 the pinning bishop is gone, and your pair with it.", 'bxc3 — two bishops, a pawn for d4.'],
  ["…Qe7 is the Metger Unpin, and the idea is a knight tour: the queen leaves d8 so the knight on c6 can go back there and on to e6, to hit your bishop on g5. Meanwhile the knight on f6 stays pinned, now to the queen.", '…Qe7 — the Metger Unpin begins.'],
  ["Before you break with d4, line up the support. Re1 puts the rook behind your e4 pawn, so it stays guarded when the center opens, and the rook already stands on the same file as their queen on e7.", 'Re1 — behind e4, ready for d4.'],
  ["…Nd8 is slow, but it's the point of …Qe7: the knight heads for e6, to hit your bishop on g5 and cover d4. You are a little better, so use the time: your break is ready.", '…Nd8 — the knight heads for e6.'],
  ["And now the break you built for: d4. The c3 pawn backs it up, and if they take, cxd4 leaves you two pawns side by side in the center. The cost is quieter: no pawn of yours can ever cover c4 again, and their bishop could reach it through e6.", 'd4 — the break; c4 weakens for good.'],
  ["…Bg4 is the engine's choice, though most masters go …Ne6, on its own tab. Their bishop pins your knight on f3 to your queen, a mirror of your pin on f6. It's about level. Your plan: ask with h3, keep your pin with Bh4, and break theirs with g4 once the bishop sits on h5. Your two bishops and the center are the edge that lasts into an endgame.", '…Bg4 — pins f3, a mirror pin.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Spanish Four Knights: 4.Bb5 Bb4 Main Line': ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5', 'Bb4', 'O-O', 'O-O', 'd3', 'd6', 'Bg5', 'Bxc3', 'bxc3', 'Qe7', 'Re1', 'Nd8', 'd4', 'Ne6', 'Bh4'],
  'Scotch Four Knights: 4.d4 exd4 5.Nxd4': ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'exd4', 'Nxd4', 'Bb4', 'Nxc6', 'bxc6', 'Bd3', 'd5', 'exd5', 'cxd5', 'O-O', 'O-O', 'Bg5', 'c6', 'Qf3', 'Be7', 'Rae1', 'Re8', 'Ne2'],
  'Belgrade Gambit: 4.d4 exd4 5.Nd5': ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'exd4', 'Nd5', 'Nxe4', 'Bc4', 'Be7', 'O-O', 'O-O', 'Re1', 'Nf6', 'Nxe7+', 'Nxe7', 'Qxd4', 'Nc6', 'Qf4'],
  'Halloween Gambit: 4.Nxe5': ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Nxe5', 'Nxe5', 'd4', 'Nc6', 'd5', 'Ne5', 'f4', 'Ng6', 'e5', 'Ng8', 'd6', 'cxd6', 'exd6', 'Qf6', 'Nb5'],
  'Symmetrical Variation: 4.Bb5 Bb4': ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5', 'Bb4', 'O-O', 'O-O', 'd3', 'd6', 'Ne2', 'Ne7', 'c3', 'Ba5', 'Ng3', 'Ng6', 'd4', 'Bb6'],
  'Italian Four Knights: 4.Bc4': ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bc4', 'Nxe4', 'Nxe4', 'd5', 'Bd3', 'dxe4', 'Bxe4', 'Bd6', 'O-O', 'O-O', 'Re1', 'Re8', 'd3', 'h6', 'c3'],
  'Rubinstein Variation: 4.Bb5 Nd4': ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5', 'Nd4', 'Nxd4', 'exd4', 'e5', 'dxc3', 'exf6', 'Qxf6', 'dxc3', 'Qe5+', 'Qe2', 'Qxe2+', 'Bxe2', 'Bc5', 'O-O'],
  'Metger Unpin: ...Qe7 System': ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5', 'Bb4', 'O-O', 'O-O', 'd3', 'd6', 'Bg5', 'Bxc3', 'bxc3', 'Qe7', 'Re1', 'Nd8', 'd4', 'Ne6', 'Bc1', 'c6', 'Bd3'],
  'Glek System: 4.g3': ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'g3', 'Bc5', 'Bg2', 'd6', 'd3', 'a6', 'O-O', 'O-O', 'h3', 'h6', 'Be3', 'Bxe3', 'fxe3', 'Ne7', 'Nh4', 'c6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Spanish Four Knights: 4.Bb5 Bb4 Main Line': [
    ["…Ne6 completes the tour, hitting your bishop on g5 and your pawn on d4. The pawn has three guards, so the question is the bishop: keep the pin, or let it go?", '…Ne6 — hits g5 and d4.'],
    ["Keep the pin: Bh4 steps out of the knight's reach and still holds the knight on f6. Bc1, on the Metger Unpin tab, is just as good: more room for the bishop, but no pin. It's about level. Your plan: meet …Nf4 and …g5 by dropping the bishop back to g3, and take queenside space with a4 and a5.", 'Bh4 — keeps the pin on f6.'],
  ],
  'Scotch Four Knights: 4.d4 exd4 5.Nxd4': [
    ["The Scotch Four Knights: no bishop move at all, you open the center right away. d4 hits e5 with both your knights already out, so whatever opens, your pieces are ready for it. Will they take?", 'd4 — open the center, hit e5.'],
    ["…exd4 hits your knight on c3, so something has to happen right now. You could leave the pawn and jump forward with Nd5, the Belgrade Gambit on its own tab. The normal move just takes it back.", '…exd4 — takes, hits c3.'],
    ["Which piece takes back? Not the queen: Qxd4 walks into …Nxd4 from the knight on c6. Nxd4 is the move. Material is level, and your knight stands in the middle of the board, hitting that same knight on c6.", 'Nxd4 — not the queen; knight centralized.'],
    ["Most club players trade here with …Nxd4, a mistake: your queen recaptures in the center, then Bf4 and long castling, and you're well ahead in development. …Bb4 is the main move, and now the pin is serious: the knight on c3, the only guard of e4, is pinned to your king.", '…Bb4 — pins c3; e4 in danger.'],
    ["Why trade now? Your knight was hit, and Nxc6 hits back: from c6 it attacks their queen, so they must take at once, before …Nxe4 can come. And if the d-pawn takes, Qxd8 check trades queens and their king loses castling.", 'Nxc6 — trade with tempo, hits d8.'],
    ["…bxc6, toward the center, is the right way back. Their c-pawns are doubled for now, but once …d5 comes and the c6 pawn takes back there, the doubling is gone, and their rook has the half-open b-file.", '…bxc6 — toward the center, for …d5.'],
    ["…Nxe4 was the threat, and Bd3 stops it by guarding e4. It also clears f1 for castling, which is how you get out of the pin on c3. Why not c4? Their d-pawn would come to d5 and kick it.", 'Bd3 — guards e4, ready to castle.'],
    ["If you do nothing, …dxe4 wins a pawn: …d5 and the knight on f6 both hit e4, your bishop is its only real guard, and the knight on c3 can't take back, because it's pinned. The simplest answer is to take.", '…d5 — hits e4, claims the center.'],
    ["exd5: your pawn leaves e4, where it was hit twice, and hits c6, which has no guard. And look what it leaves behind: with both e-pawns gone, the e-file is open, the road your rooks take later.", 'exd5 — hits c6, and the e-file opens.'],
    ["…cxd5, the payoff of …bxc6: the doubled pawns are gone, and they keep a pawn in the middle. But their bishop on b4 still pins your knight on c3 to your king, so your next move picks itself.", '…cxd5 — their pawns straighten out.'],
    ["The cleanest way out of a pin to the king is often to move the king. Castle, and the pin on c3 is gone: the king has left the diagonal, and the knight is free to go after d5.", 'O-O — the pin on c3 is gone.'],
    ["They castle too, and it's about level. The structure tells you the plan: their pawn on d5 needs constant guarding, and almost every move you make from here leans on it.", '…O-O — d5 becomes the target.'],
    ["A pinned piece is a poor guard, and Bg5 makes one: it pins the knight on f6, the guard of d5, to their queen. If that knight takes on d5, the queen behind it falls, so d5 just got weaker without being touched.", 'Bg5 — pins the knight guarding d5.'],
    ["…c6 shores up d5, so the pinned knight no longer has to. The price is permanent: with the pawn gone from c7, no pawn of theirs can ever cover d6 again, a square your bishop can reach in two moves.", '…c6 — a pawn guards d5.'],
    ["Qf3, the engine's choice: the queen hits d5 and lines up on the pinned knight, so f6 is hit twice. One step further: if they play …h6, Bxf6 and a queen trade leave their f-pawns doubled and split, a weakness that lasts into the endgame.", 'Qf3 — hits d5, piles onto f6.'],
    ["If you trade on f6 now, the bishop takes back and nothing is damaged: …Be7 steps in behind the knight, so the pin is gone and d5 has a real guard back.", '…Be7 — breaks the pin.'],
    ["Remember the file exd5 opened? Rae1 takes it, and the rook already hits the bishop on e7, which only their queen guards. A rook belongs on an open file, and the first one to arrive makes the other side react.", 'Rae1 — rook to the open e-file.'],
    ["If you allow it, …Bg4 hits your queen on f3, so keep an eye on their bishop on c8. For now, …Re8 contests the file and gives the bishop on e7 a second guard.", '…Re8 — contests the e-file.'],
    ["Ne2 has the right idea a move too early: the knight heads for f4 to hit d5, but the engine prefers h3 first, taking g4 away before their bishop lands there with a hit on your queen. After Ne2 it's about level. Your plan: Nf4 against d5, every piece leaning on that pawn, and a rook kept on the e-file.", 'Ne2 — heads for f4; h3 first.'],
  ],
  'Belgrade Gambit: 4.d4 exd4 5.Nd5': [
    ["The Belgrade Gambit: Nd5 leaves the d4 pawn alone and jumps forward, hitting the knight on f6 and the c7 pawn. The price: a pawn, and with the knight gone from c3, e4 has no guard. What you buy is time.", 'Nd5 — the Belgrade Gambit, hits f6.'],
    ["…Nxe4 grabs a second pawn and hits f2. Greedy, but not bad: it's about level. The bill comes in time, because the e-file is now open and their king is still on e8.", '…Nxe4 — a second pawn, hits f2.'],
    ["Bc4 backs up your knight and clears the way to castle, but it's the wrong square: the engine prefers Bd3, hitting the knight on e4 at once. After Bc4, …Bb4 check trades off your d5 knight, then …d5 hits the bishop, and they are a little better.", 'Bc4 — backs d5; Bd3 was better.'],
    ["Why not c5? Your b-pawn could kick the bishop there. So …Be7, quietly, ready to castle. It's about level again, and a race: they want to castle and keep both pawns, you want a rook on the e-file first.", '…Be7 — develops, castling next.'],
    ["Castle, and watch the rook, not the king: it reaches e1 in one move, straight at the knight on e4, which nothing guards. That's how a gambit gets paid: every developing move asks them a question.", 'O-O — safe king, Re1 next.'],
    ["They castle too. You're two pawns down, so how does one come back? Like this: Re1 chases the knight to f6, Nxe7 check forces a recapture, and Qxd4 picks up the pawn on d4.", '…O-O — and Re1 is coming.'],
    ["Re1 hits the knight on e4, which nothing guards, so it has to move. f6 is its best square, where it at least hits your knight on d5. Once it leaves, your rook sees straight down to the bishop on e7.", 'Re1 — hits the loose knight on e4.'],
    ["…Nf6 is the best retreat, and it hits back: the knight attacks your knight on d5, which only your bishop guards. A trade on e7 is coming; the question is which of your pieces makes it.", '…Nf6 — back to safety, hits d5.'],
    ["Which trade? Rxe7 hands over a rook for the bishop. Nxe7 check takes it with the knight and keeps the two bishops for you, and with your knight gone from d5, the bishop on c4 now pins f7 to their king.", 'Nxe7+ — trade with check, f7 pinned.'],
    ["…Nxe7 is forced: if the queen takes, your rook takes the queen, and a king move drops a knight. But look which knight took: the one from c6, the only guard of d4. That pawn now stands alone.", '…Nxe7 — forced; d4 is loose now.'],
    ["Qxd4: one pawn comes back, and your queen lands in the center, hitting the knight on f6 and the pawns on d7 and a7. A pawn down, it's about level, but expect the queen to be chased: their knight is heading for c6.", 'Qxd4 — a pawn back, central queen.'],
    ["…Nc6 hits your queen, and it has to move again. Take stock while it does: a pawn down, but castled, with a rook on the e-file and two bishops against one. That's what the gambit bought.", '…Nc6 — hits your queen.'],
    ["Qf4 steps aside and keeps the knight on f6 and the c7 pawn in its sights. It's about level. Your plan: when …d5 hits your bishop, drop it to d3, finish with Bd2, and aim the queen and bishops at their king. A pawn down, you play for activity, not for the pawn back.", 'Qf4 — steps aside, hits f6 and c7.'],
  ],
  'Halloween Gambit: 4.Nxe5': [
    ["The Halloween Gambit: Nxe5 gives a whole knight for one pawn. Why? Because their knights are about to be chased all over the board, each pawn move with a hit, and your center grows with every tempo. The honest verdict: Bb5 is far stronger, and after Nxe5 they are clearly better. A surprise weapon, not a sound line.", 'Nxe5 — a knight for the center.'],
    ["You're a knight down for a pawn after …Nxe5, so from here every move of yours has to come with a hit, or the gambit is just a lost piece. The chase starts with your d-pawn.", '…Nxe5 — a piece up for them.'],
    ["d4 hits the knight on e5, which nothing guards, so it moves again. Where it goes decides your next pawn. If …Ng6, e5 hits the other knight; if …Nc6, d5 chases this one again.", 'd4 — hits the knight on e5.'],
    ["…Nc6 is a slip: the engine prefers …Ng6, and after …Nc6 they are only a little better. The knight hits d4, but on c6 it stands one pawn push away from being chased again.", '…Nc6 — back home; …Ng6 was stronger.'],
    ["d5 takes a square from them for good: with your pawn there, their d-pawn can never step to d5. And it chases the knight again, which has one good central square left.", 'd5 — chases the knight; d5 is yours.'],
    ["…Ne5, the engine's choice, puts the knight back in the middle, where no pawn of yours hits it, for one move. They are a little better. Your f-pawn is next in line.", '…Ne5 — back to the center.'],
    ["f4 kicks the knight a third time, and it costs something permanent: no pawn of yours can ever cover e3 again. Remember that square. Their bishop can reach c5 in one move, and from there it looks through e3 straight at g1, exactly where your king would castle.", 'f4 — hits e5, but e3 weakens for good.'],
    ["…Ng6 hits your f4 pawn, but your bishop on c1 covers it. So the chase goes on, now with the other knight.", '…Ng6 — safe, hits f4.'],
    ["e5 hits the knight on f6, your fourth pawn move in a row with a hit on a knight. One answer is to give a piece back: …Bc5, and after exf6 they castle and take back with the queen.", 'e5 — hits the knight on f6.'],
    ["…Ng8 goes all the way home. Count: you have pawns on d5, e5 and f4; they have an extra piece and nothing developed. They are a little better, and every move you make now should open lines toward their king.", '…Ng8 — all the way home.'],
    ["d6, the engine's choice, and it's about level. The pawn hits c7, and it cuts the diagonal from f8 to b4, so …Bb4 pinning your knight is off the table. And if they take, exd6 puts a pawn deep in their camp.", 'd6 — hits c7, cuts the f8 bishop.'],
    ["…cxd6 takes, and now the pawn on d6 hits your e5 pawn. So you take back with it, and a pawn lands on d6 for the second time.", '…cxd6 — takes, hits e5.'],
    ["Take back with the pawn, never the queen: on d6 their bishop would just take it. exd6 keeps their d7 pawn stuck, so the bishop on c8 stays shut in, and it opens the e-file toward their king on e8.", 'exd6 — a pawn deep in their camp.'],
    ["…Qf6 has a hidden cost. It hits your knight on c3 and the pawns on d6 and f4, all guarded, and they are a little better. But look at the square it left: with nothing on d8, who guards c7?", '…Qf6 — hits three, but leaves c7.'],
    ["Nb5, the engine's choice, answers that question: nothing guards c7, so Nc7 check would hit the king and the rook on a8 at once. A knight down, you're back to about level. Your plan: Be3, Qd2 and castle long, then go after their king, stuck in the middle.", 'Nb5 — threatens Nc7 check.'],
  ],
  'Symmetrical Variation: 4.Bb5 Bb4': [
    ["The other way to break the mirror: move the knight before it can be taken. Ne2 dodges …Bxc3, so your pawns stay whole, and frees c3 for a pawn to kick the bishop on b4. Then the knight heads for g3 and on toward f5, and d4 comes once it's there.", 'Ne2 — dodges …Bxc3, heads for g3.'],
    ["The mirror again: …Ne7 sends their knight on the same tour, toward g6. It also clears the c-pawn, so …c6 can come with a hit on your bishop on b5.", '…Ne7 — the same knight tour.'],
    ["c3 hits the bishop on b4, which nothing guards, so it has to move, and the pawn will stand behind d4 when the break comes. Knight to the kingside, pawns to the center: that's the whole plan.", 'c3 — hits b4, prepares d4.'],
    ["Where does the bishop go? …Bc5 is more active; …Ba5 stays on the diagonal, aimed at c3, though only a pawn stands there now and b2 guards it. Either way, your pawn gained a tempo.", '…Ba5 — steps back, keeps the diagonal.'],
    ["Ng3 finishes the tour: from g3 the knight covers f5 and h5, and f5 is where it's headed. With the knight in place, the plan's next step is the break in the center.", 'Ng3 — tour done, covers f5.'],
    ["…Ng6 completes their copy of your tour, and the mirror is back. But a mirror favors the side to move: it's your turn, and your c3 pawn is already standing behind d4.", '…Ng6 — the mirror, once more.'],
    ["d4, the engine's choice: the break c3 was for. It hits e5, and if they take, cxd4 keeps two of your pawns side by side in the center. You moved first in the mirror, and now you change it.", 'd4 — you break the mirror first.'],
    ["…Bb6, the engine's choice, hits d4, but c3, the knight on f3 and your queen all guard it. You are a little better. Your plan: h3 to keep their bishop off g4, then Bg5 and Bd3, and hold your pawns on c3, d4 and e4. Central space is the kind of edge that lasts.", '…Bb6 — hits d4; h3 next.'],
  ],
  'Italian Four Knights: 4.Bc4': [
    ["Bc4, the Italian Four Knights, and the most popular move at club level: the bishop aims at f7, which only their king guards. It's about level, but it allows a well-known trick that gives the center straight back. Watch.", 'Bc4 — aims at f7, allows a trick.'],
    ["…Nxe4, and here comes a well-known trick. It looks like a blunder, since your knight on c3 just takes it, which is why fewer than one club player in ten plays it, against more than half the masters. The point comes next move.", '…Nxe4 — a knight for a pawn?'],
    ["Take the knight: Nxe4, and for a moment you're a piece up for a pawn. Castling instead lets their knight take on c3 first, and that's a worse version for you. So you take, and now watch their d-pawn.", 'Nxe4 — a piece up, for now.'],
    ["…d5, and there's the trick: the pawn forks your bishop on c4 and your knight on e4. Moving one loses the other, unless one move saves the bishop and guards the knight. Is there one?", '…d5 — the fork trick.'],
    ["Most club players grab a pawn with Bxd5 here, and it's a mistake: …Qxd5 takes the bishop back with a hit on your knight, the knight has to retreat, and their queen rules the center. Bd3 answers the question: it steps out of the pawn's attack and guards the knight on e4.", 'Bd3 — saves the bishop, guards e4.'],
    ["If your bishop just steps away, …exf3 takes your knight: from e4 the pawn hits both and wins the piece back. But nothing guards the pawn, so one of them can take it. Which one?", '…dxe4 — the piece back; e4 hits two.'],
    ["Bxe4: material is level, and the bishop stands in the center, hitting c6 and h7. In this structure it's your best piece, and the plan to come is built around it.", 'Bxe4 — level, a central bishop.'],
    ["Why not the more active c5? Your d-pawn could hit the bishop there with d4. So …Bd6, where it guards e5 a second time and gets their king ready to castle.", '…Bd6 — guards e5, castle next.'],
    ["Castle, and the next steps are clear: the rook comes to e1 behind your bishop, and later d4 opens the center for your bishops. In a level, symmetrical position like this, you play for small edges, not a knockout.", 'O-O — safe king, rook to e1.'],
    ["With no weak pawns on either side, the game goes to whoever puts the pieces on better squares. They castle, it's about level, and your bishop on e4 already has a great one.", '…O-O — level and quiet.'],
    ["A rook belongs on a file with no pawn of its own, and Re1 takes the half-open e-file behind your bishop. One step ahead: once c3 and d4 come and they take on d4, the file opens with your rook already on it.", 'Re1 — the e-file, behind the bishop.'],
    ["…Re8 contests the e-file and gives e5 a second guard. With the center solid on both sides, the next question is development: your bishop on c1 is the last piece at home.", '…Re8 — guards e5, meets your rook.'],
    ["d3 guards the bishop on e4 and opens the diagonal for the bishop on c1. And there is a sting in it: if they drift with …Bd7, Ng5 adds a second attacker on h7, which only their king guards.", 'd3 — frees c1; Ng5 would hit h7.'],
    ["…h6 is the answer to that idea: neither your knight nor your bishop can land on g5 now, so the h7 trick is off. Quiet moves like this keep a level position level.", '…h6 — no g5 for your pieces.'],
    ["c3 is a small move with a job: it takes d4 and b4 away from their knight and stands ready to back up d4 later. It's about level. Your plan: Bd2 and Qc2 to finish developing, then open the center with d4 when your bishops are ready. Patience first, the break second.", 'c3 — covers d4 and b4.'],
  ],
  'Rubinstein Variation: 4.Bb5 Nd4': [
    ["…Nd4, Rubinstein's answer: instead of copying you, the knight jumps forward and hits your bishop on b5 and your knight on f3 at once. The mirror is broken. What do you do about it?", '…Nd4 — the Rubinstein, hits b5 and f3.'],
    ["Nxd4, the engine's choice, starts a forced sequence worth knowing. …exd4 hits your knight on c3; instead of moving it, you hit back with e5. Both knights fall, and once the dust settles material is level, your c-pawns are doubled and the center is wide open.", 'Nxd4 — trade off the jumping knight.'],
    ["Before you save an attacked piece, look for a counter-hit. …exd4 takes back and hits your knight on c3, and the natural reaction is to move it. But one of your pawns can hit back instead.", '…exd4 — hits your knight on c3.'],
    ["Most club players retreat with Ne2 here, and it's a mistake: …c6 chases your bishop, …d5 hits e4, and their queen lands in the center with an easy game. The right answer is a counterattack: e5 hits the knight on f6, so you're trading a knight, not losing one.", 'e5 — counterattack, hits f6.'],
    ["…dxc3 takes your knight, and the pawn on c3 now hits b2 and d2. You can take the pawn on c3 or the knight on f6. Which first?", '…dxc3 — takes your knight first.'],
    ["Take the piece that can run away: exf6. Take on c3 first and their knight just jumps to d5, leaving you a piece down. Now material is level again, and their pawn on c3 is the one left hanging.", 'exf6 — take the piece that can run.'],
    ["…Qxf6 is the only good recapture, and it hits f2. For one move they're a pawn up, the one on c3, and you take it next. But watch the queen: from f6 it can swing to e5 with check.", '…Qxf6 — takes back, hits f2.'],
    ["Which pawn takes? The d-pawn: dxc3 opens the d-file for your rooks and the diagonal for your bishop on c1. Yes, your c-pawns are doubled, but bxc3 doubles them just the same and keeps the bishop shut in. Material is level.", 'dxc3 — level, opens d-file and c1.'],
    ["…Qe5 check, and it is a fork: the queen checks your king and hits your bishop on b5, which has no guard. So you need a block that also guards the bishop. What does both?", '…Qe5+ — check, and b5 is hit.'],
    ["Blocking with Be3 looks natural and simply loses the bishop on b5 to their queen. Qe2 blocks the check and guards the bishop in one move, and it offers a queen trade too. After Qe2 it's about level.", 'Qe2 — blocks, guards b5, offers trade.'],
    ["…Qxe2 check, and the queens come off on e2. With them gone, nobody attacks a king for a while: the game turns into a race to develop and to use the open files.", '…Qxe2+ — queens off.'],
    ["Take with the bishop and keep the right to castle. Kxe2 is playable too, because with the queens off a king in the middle is safe enough, but there's no reason to give castling away.", 'Bxe2 — keeps castling rights.'],
    ["…Bc5 develops and hits f2, a pawn only your king guards. With the queens off that's no attack, just a reason to castle and let your rook guard it.", '…Bc5 — hits f2.'],
    ["Castle: the rook on f1 now guards f2, though the bishop on c5 pins that pawn to your king. It's about level. Your plan: Re1 for the open e-file, then Bf3, and Re7 if they allow it. With the queens off, a rook on the seventh rank is the strongest thing a rook can do.", 'O-O — castle, the e-file next.'],
  ],
  'Metger Unpin: ...Qe7 System': [
    ["Bc1, the engine's choice, goes all the way home. Why give up the pin? On h4 the bishop can be chased by …h6 and …g5; on c1 it's safe, covers f4 against their knight, and can come back out with Ba3. Keeping both bishops matters more than keeping the pin.", 'Bc1 — home, safe, covers f4.'],
    ["…c6 hits your bishop on b5, which has no guard, and gets ready for …d5 against your center. The bishop has to move, and the square it picks decides what it guards next.", '…c6 — hits the bishop on b5.'],
    ["Bd3 steps back and guards e4, ready for …d5. You are a little better. Your plan: h3 and a4 for space, and if they hit d4 with …c5, push d5 to gain more. The two bishops and that extra space are the kind of edge that lasts all the way into an endgame.", 'Bd3 — guards e4, space next.'],
  ],
  'Glek System: 4.g3': [
    ["The Glek System: g3, named for the grandmaster who made it his weapon. The bishop goes to g2, behind your knight and the e4 pawn, and the game stays slow and flexible. The quiet cost: no pawn of yours can ever cover f3 again.", 'g3 — the Glek, bishop to g2.'],
    ["…Bc5 develops actively and hits f2, a pawn only your king guards. Remember this bishop: once you castle, it pins f2 to your king, and a few moves from now your plan is built around trading it off.", '…Bc5 — active, hits f2.'],
    ["Bg2 completes the fianchetto, and you're ready to castle. For now the bishop sits behind your own knight and e4 pawn. That's normal in the Glek: a piece for later, whose diagonal opens only once both have moved.", 'Bg2 — fianchetto done, castle next.'],
    ["…d6 guards e5 and opens the diagonal for the bishop on c8. Where does that bishop want to go? …Bg4, pinning your knight on f3 to your queen, is the idea to keep an eye on.", '…d6 — guards e5, frees c8.'],
    ["Castling first is just as good here: in a slow setup like this, the order of your moves matters far less than the squares they end up on. d3 guards e4 and frees the bishop on c1.", 'd3 — guards e4, opens the c1 bishop.'],
    ["If you ever chase their bishop with a3 and b4, …a6 has already given it a home on a7. It also takes b5 away from your knight. A small move with two jobs.", '…a6 — covers b5, a7 retreat.'],
    ["Castle, and notice the cost: with your king on g1, their bishop on c5 now pins f2 to it. Harmless today, but f2 can't move, and removing that pin is what your plan a few moves from now is about.", 'O-O — castled, but f2 is pinned.'],
    ["They castle too, and the center is closed: your pawns on d3 and e4 face theirs on d6 and e5. A closed center sends the play to the wings: theirs with …b5, yours on the kingside.", '…O-O — a closed center.'],
    ["h3 is prophylaxis: before …Bg4 can pin your knight to your queen, you take g4 away. Nothing was threatened yet, and that's the point: strong players stop the opponent's best idea before it's played.", 'h3 — keeps them off g4.'],
    ["If you had played Bg5, it would have pinned their knight on f6. …h6 takes g5 away from your bishop and your knight alike: the same prophylaxis as your h3.", '…h6 — no g5 for you.'],
    ["Be3 offers to trade off the bishop that pins f2. If they take, fxe3 is the point: the pin disappears, your rook on f1 gets a half-open file, and the doubled e-pawns cover d4 and f4. A structure you choose on purpose, because it starts a kingside plan.", 'Be3 — challenges the pinning bishop.'],
    ["…Bxe3 is their best: they trade on e3, and you take back with the f-pawn. Don't be tempted by Nxe5 first: …Bxf2 check, Rxf2, …dxe5, and your knight is simply gone.", '…Bxe3 — the trade on e3.'],
    ["fxe3: the pin is gone, and your rook has a half-open f-file, with only your knight on f3 in the way. The price is doubled e-pawns and a little less cover for your king, fair when the file points at their king.", 'fxe3 — the f-file opens up.'],
    ["…Ne7 heads for g6, where it would guard f4 and h4, and it frees their c-pawn for …c6. It's about level.", '…Ne7 — heading for g6.'],
    ["Nh4 puts the knight on the edge on purpose. It clears the f-file, so your rook on f1 looks straight at the knight on f6, and the knight eyes f5. If their knight comes to g6, Nf5 jumps in.", 'Nh4 — opens the f-file for your rook.'],
    ["…c6 prepares …Qb6, aimed at your e3 pawn. It's about level. Your plan: Qe1 and g4, piling up on the f-file. The point can be as sharp as Rxf6, giving a rook for the knight to break open the pawns in front of their king.", '…c6 — prepares …Qb6 against e3.'],
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

export const FOUR_KNIGHTS_GAME_WATCH: WatchCourse = {
  openingId: 'four-knights-game',
  title: 'The Four Knights Game — A Master Class',
  orientation: 'white',
  sources: ['book:four-knights-game', 'concept:pos-development', 'concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Four_Knights_Game', 'https://en.wikipedia.org/wiki/Belgrade_Gambit', 'https://en.wikipedia.org/wiki/Halloween_Gambit'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
