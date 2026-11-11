// The Four Knights Game — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=four-knights-game`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. Standard: docs/OPENING-WATCH-BEATS.md; said in the think-out-loud
// register. The student plays White. One thread runs through the course: four
// knights out is a mirror, and the game is decided by who changes it first and
// how — the Bg5 pin and the d4 break in the Spanish lines, d4 at once in the
// Scotch, a pawn or a whole knight given in the two gambits, the quiet g3.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5', 'Bb4', 'O-O', 'O-O', 'd3', 'd6', 'Bg5', 'Bxc3', 'bxc3', 'Qe7', 'Re1', 'Nd8', 'd4', 'Bg4'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["Where do you start? e4, a little under half the masters' games and the engine's first choice. The pawn takes a central square and opens the way for your queen and for the bishop on f1.", 'e4 — the center, open lines.'],
  ["…e5: they claim their own central square, pawn facing pawn. The Sicilian, …c5, is the masters' most common answer, close to twice as popular, but this is the road to the Four Knights. And notice: nothing guards the e5 pawn yet.", '…e5 — pawn against pawn.'],
  ["So go after it. Nf3, nine masters in ten: the knight comes out and hits the pawn on e5 in the same move. Development and a question for them at once, and they have to answer it before anything else.", 'Nf3 — develops, hits e5.'],
  ["How do they hold e5? …Nc6, close to nine masters in ten: the knight guards the pawn and develops at the same time. About one in eight hit back at e4 with …Nf6 instead, but defending with a piece that wants to come out anyway is the natural choice.", '…Nc6 — guards e5, develops.'],
  ["Here's the big decision. Two masters in three play Bb5, the Ruy Lopez, and d4, the Scotch, is the engine's first choice. The Four Knights picks the quietest move of all: Nc3, about six masters in a hundred. The knight guards e4 and covers d5, and it commits to nothing. Bb5 and d4 are both still there next move, and so is g3, and each has its own tab. The engine prefers d4 right now. After Nc3 it's about level.", 'Nc3 — the third knight, guards e4.'],
  ["…Nf6, nine masters in ten, and there are the four knights. Their knight hits your e4 pawn, but your knight on c3 already guards it, so nothing hangs. Look at the board: the same pieces on the same squares for both sides. The question for the next few moves is who breaks the mirror first.", '…Nf6 — four knights, a mirror.'],
  ["Bb5, the Spanish Four Knights: about four masters in ten, and the engine's first choice. Look at what the bishop hits: the knight on c6, the only piece guarding e5. Nothing is threatened yet, but if that knight ever disappears, e5 has no guard at all.", 'Bb5 — leans on the c6 knight.'],
  ["They copy you: …Bb4, about four masters in ten. Their bishop hits your knight on c3, the piece that guards e4, just as yours leans on c6. The engine's first choice, and just as common, is …Nd4, jumping at your bishop instead. That's the Rubinstein, on its own tab.", '…Bb4 — the mirror, on c3.'],
  ['Castle, as more than nine masters in ten do, and so does the engine. Your king steps off the e-file before anything opens there, and the rook on f1 is one move from e1.', 'O-O — king safe, rook next.'],
  ["They castle too, nineteen masters in twenty, and the mirror holds: same pieces, same squares, both kings tucked away. So how does anyone get an edge from here? By being the first to change something, and your next few moves are about choosing what.", '…O-O — still a perfect mirror.'],
  ["d3, eight masters in ten, and here's the quiet point. Right now your knight on c3 is the only guard of e4, and their bishop on b4 can take it any time. With a pawn on d3, …Bxc3 no longer costs you the e4 pawn. And the diagonal opens for your bishop on c1. Remember that bishop.", 'd3 — guards e4, frees the c1 bishop.'],
  ["…d6, two masters in three: the same move on their side, a pawn behind e5 and an open diagonal for their bishop on c8. The engine prefers …Bxc3 first, doubling your c-pawns straight away.", '…d6 — guards e5, mirror again.'],
  ["Now you break the mirror. Bg5, seven masters in ten: the bishop pins the knight on f6 to their queen on d8. While that pin holds, the knight can't leave f6, and Bxf6 is always in reserve: if a pawn ever has to take back on f6, the cover in front of their king breaks. Ne2, the other plan here, has its own tab.", 'Bg5 — pins the f6 knight.'],
  ["They take first: …Bxc3, more than eight masters in ten. Why give up the bishop? Your knight on c3 was the piece that could jump to d5 and add a second attacker on the pinned knight. So they remove it, and your pawns get doubled in the bargain. Their bishop also hits b2 now, so you take back at once.", '…Bxc3 — removes the knight, doubles pawns.'],
  ["bxc3, every master's move, toward the center. Yes, your c-pawns are doubled, but count what you got: two bishops against their one, a pawn on c3 ready to back up d4, and the b-file half-open for a rook. Don't throw in Bxf6 first: after …Qxf6 you've swapped off the pinning bishop, and the pair of bishops goes with it.", 'bxc3 — two bishops, a pawn for d4.'],
  ["…Qe7, close to six masters in ten: this is the Metger Unpin. The queen steps off d8 so their knight on c6 can drop back there and head for e6, where it will hit your bishop on g5. For now the knight on f6 is still pinned, to the queen on e7 this time. You are a little better.", '…Qe7 — the Metger Unpin begins.'],
  ["Re1, eight masters in ten: the rook takes the e-file and stands behind your e4 pawn. That's the support d4 will need, and when the center opens, your rook is already on the file their queen stands on.", 'Re1 — behind e4, ready for d4.'],
  ["…Nd8, nearly nine masters in ten, and there's the plan: the knight backs up on its way to e6, where it will hit your bishop on g5 and cover d4. It's slow, and the engine prefers …h6, putting the question to the bishop right away. You are a little better.", '…Nd8 — the knight heads for e6.'],
  ["And now the break you've built for: d4, nearly every master's move. The pawn on c3 backs it up, the rook on e1 stands behind e4, and the pawn hits e5. The engine slightly prefers Bc1 first, tucking the bishop away before …Ne6 can hit it, but d4 is the idea of the whole structure.", 'd4 — the break, hits e5.'],
  ["…Bg4, the engine's first choice, though only about one master in seven plays it. Most go …Ne6, on its own tab. Now their bishop pins your knight on f3 to your queen, the mirror of your own pin on f6. It's about level. Your plan: ask the bishop with h3, keep your own pin with Bh4, and break theirs with g4 if the bishop holds on from h5. The bishop pair and the d4 pawn are your long-term trumps.", '…Bg4 — pins f3, a mirror pin.'],
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
    ["…Ne6, eight masters in ten, and the Metger knight has arrived: it hits your bishop on g5 and your pawn on d4 at the same time. The pawn is well covered, by c3, the knight on f3 and the queen, so the real question is the bishop. Where does it go? You are a little better.", '…Ne6 — hits g5 and d4.'],
    ["Bh4 keeps the pin: the bishop steps out of the knight's reach and still holds the knight on f6 against their queen on e7. Bc1, the engine's first choice, goes home instead, on the Metger Unpin tab. It's about level. Your plan: answer …Nf4 and a later …g5 by dropping the bishop to g3, and push your a-pawn up the board for queenside space, with the bishop pair in hand.", 'Bh4 — keeps the pin on f6.'],
  ],
  'Scotch Four Knights: 4.d4 exd4 5.Nxd4': [
    ["The Scotch Four Knights: no bishop move first, you open the center now. d4, close to four masters in ten: the pawn hits e5, and with both your knights already out, the center opens with your pieces ready for it. Will they take?", 'd4 — open the center, hit e5.'],
    ["…exd4, nine masters in ten: they take, and now their pawn on d4 hits your knight on c3. So the recapture comes right away.", '…exd4 — takes, hits c3.'],
    ["Nxd4: material is level, and your knight stands in the middle of the board, hitting the knight on c6. About one master in twelve leaves the pawn and plays Nd5 instead. That's the Belgrade Gambit, on its own tab.", 'Nxd4 — level, knight in the center.'],
    ["…Bb4, nine masters in ten, and this time it's a real pin: your d-pawn has left d2, so the bishop pins the knight on c3 to your king. And here's what that means: that knight is the only guard of e4, so …Nxe4 is coming if you allow it. How do you deal with it?", '…Bb4 — pins c3, e4 is in danger.'],
    ["Nxc6, every master's move. Why trade now? Your knight was hit on d4, and by taking, it hits their queen on d8 and their bishop on b4, so they have to take back right away, before …Nxe4 can happen. Then you'll guard e4 next move.", 'Nxc6 — trade with tempo, hits d8.'],
    ["…bxc6, the best recapture: the pawn takes toward the center. Taking with the d-pawn lets you trade queens with check on d8, and their king loses its castling. Now their c-pawns are doubled, but the b-file is half-open for their rook, and …d5 is coming.", '…bxc6 — toward the center, doubled pawns.'],
    ["Bd3, every master's move: the bishop guards e4, so …Nxe4 is off the table, and it clears f1 so you can castle and get out of the pin.", 'Bd3 — guards e4, ready to castle.'],
    ["…d5, seven masters in ten: their pawn hits e4 and claims the center. Count the pressure: the knight on f6 and the d5 pawn both hit e4, and your knight on c3 can't help, because it's still pinned. …O-O first, about one master in four, usually comes to the same thing.", '…d5 — hits e4, claims the center.'],
    ["Take it: exd5. Your pawn leaves e4, where it was hit twice, and on d5 it hits c6, a pawn with no guard. So they take back.", 'exd5 — out of trouble, hits c6.'],
    ["…cxd5, seven masters in ten: their doubled pawns are gone, and now their pawns stand on c7 and d5. But their bishop on b4 still pins your knight to your king, so your next move picks itself.", '…cxd5 — their pawns straighten out.'],
    ['Castle: your king leaves e1, and the pin on the knight on c3 is gone with it. That knight is free to move again, and it\'s about level.', 'O-O — the pin on c3 is gone.'],
    ["They castle too, and it's about level. Look at d5: that pawn, in the middle of the board, is what your pieces will aim at for the rest of this line.", '…O-O — d5 becomes the target.'],
    ['Bg5, six masters in ten: the same pin as in the Spanish lines, the knight on f6 tied to their queen on d8. And look what that knight was doing: guarding d5. A pinned piece is a poor guard.', 'Bg5 — pins the knight guarding d5.'],
    ['…c6, nearly nine masters in ten: now a pawn guards d5, so it no longer leans on the pinned knight. Their pawns on c6 and d5 make a small, solid chain.', '…c6 — a pawn guards d5.'],
    ["Qf3, the engine's first choice: the queen hits d5 and lines up on the knight on f6, so that knight is now hit twice, by the bishop on g5 and the queen. It's guarded twice too, so nothing falls yet. But if the pin holds, Bxf6 and a queen trade can leave their f-pawns doubled.", 'Qf3 — hits d5, piles onto f6.'],
    ["…Be7: the bishop drops back and steps between your bishop on g5 and their queen, so the pin is gone and the knight on f6 is free again. It's about level.", '…Be7 — breaks the pin.'],
    ['Rae1: the rook from a1 takes the open e-file and lines up on the bishop on e7, which only their queen guards for now.', 'Rae1 — rook to the open e-file.'],
    ['…Re8 meets your rook on the e-file and gives the bishop on e7 a second guard. The rooks now face each other down the open file.', '…Re8 — contests the e-file.'],
    ["Ne2: the knight leaves c3 to head for f4, where it would hit d5 again. But it's a move too early. The engine prefers h3 first, taking g4 away from their bishop, which could land there with a hit on your queen. After Ne2 it's about level. Your plan: bring the knight to f4, trade on f6 when it helps, and use the e-file to keep pressing the d5 pawn.", 'Ne2 — heads for f4; h3 first.'],
  ],
  'Belgrade Gambit: 4.d4 exd4 5.Nd5': [
    ["The Belgrade Gambit: instead of taking back on d4, Nd5, about one master in twelve. The knight jumps forward and hits the knight on f6 and the c7 pawn, and it leaves the d4 pawn alone. The price: you're a pawn down, and your e4 pawn now has no guard. The engine prefers simply taking back with Nxd4. After Nd5 it's about level, and now you have to show what the pawn bought.", 'Nd5 — the Belgrade Gambit, hits f6.'],
    ["…Nxe4: they take a second pawn, about one master in nine. …Be7, close to half the masters, is the main move. Now you're two pawns down, and their knight on e4 hits f2. Still, it's about level, and your next moves have to make that knight uncomfortable.", '…Nxe4 — a second pawn, hits f2.'],
    ["Bc4, about four masters in ten: the bishop backs up your knight on d5 and clears the way to castle. But it's the wrong square. The engine much prefers Bd3, which hits the knight on e4 right away, and after Bc4 they are a little better: …Bb4 check is their strongest answer.", 'Bc4 — backs d5; Bd3 was better.'],
    ["…Be7, four masters in ten: the bishop develops and their king gets ready to castle. Just as common, and stronger, was …Bb4 check: your knight takes it, their knight takes back, and your knight on d5 is traded off. After …Be7 it's about level again.", '…Be7 — develops; …Bb4 check was stronger.'],
    ["Castle, the engine's first choice: your king is safe, and the rook can come to e1, straight at the knight on e4.", 'O-O — safe king, Re1 next.'],
    ["They castle too, the engine's first choice. You're two pawns down, but look at the e-file: one rook move, and their knight on e4 is hit with nothing to guard it.", '…O-O — and Re1 is coming.'],
    ['Re1: the rook hits the knight on e4, which has no guard, so it has to move. And notice what opens when it does: the e-file, straight down to their bishop on e7.', 'Re1 — hits the loose knight on e4.'],
    ["…Nf6, the engine's first choice: the knight drops back to safety and hits your knight on d5, which only your bishop on c4 guards. Your knight has to do something now.", '…Nf6 — back to safety, hits d5.'],
    ["Nxe7 check: your knight was hit, so it trades itself for their bishop with check, and they have to take back. Rxe7 instead gives up a rook for the bishop. And look what the trade opens: with your knight gone from d5, your bishop on c4 now pins f7 to their king.", 'Nxe7+ — trade with check, f7 pinned.'],
    ['…Nxe7, the only good way back: if the queen takes, Rxe7 wins it for a rook, and stepping aside with the king just drops a piece. Now their d4 pawn has lost its guard.', '…Nxe7 — forced; d4 is loose now.'],
    ["Qxd4: one pawn back, and your queen lands in the center, hitting the knight on f6 and the pawns on d7 and a7. You're a pawn down, and it's about level.", 'Qxd4 — a pawn back, central queen.'],
    ["…Nc6, the engine's first choice: the knight comes back to c6 with a hit on your queen, so it has to move again.", '…Nc6 — hits your queen.'],
    ["Qf4: the queen steps aside and keeps the knight on f6 and the c7 pawn in its sights. Qh4 was a touch more precise. It's about level. Your plan: Bd3 once …d5 hits your bishop, Bd2 to finish developing, and point the queen and bishop at their king, a pawn down but with active pieces.", 'Qf4 — steps aside, hits f6 and c7.'],
  ],
  'Halloween Gambit: 4.Nxe5': [
    ["The Halloween Gambit: Nxe5, a whole knight for one pawn. Why would anyone do that? Because their knights are about to be chased around the board: in this line your pawns come to d4, d5, f4 and e5, each one hitting a knight, and you take over the center. Here's the honest price: Bb5 is the engine's first choice, and after Nxe5 they are clearly better. It's a surprise weapon, not a sound line.", 'Nxe5 — a knight for the center.'],
    ["…Nxe5: of course they take, in every master game. You're a knight down for a pawn, and now the chase begins.", '…Nxe5 — a piece up for them.'],
    ['d4: the first pawn, and it hits the knight on e5, which has no guard. It has to move again.', 'd4 — hits the knight on e5.'],
    ["…Nc6, about four masters in ten: the knight goes back home and hits your d4 pawn. …Ng6 was stronger, and after …Nc6 they are a little better.", '…Nc6 — back home; …Ng6 was stronger.'],
    ['d5: chase it again. The pawn hits the knight on c6, and the knight has to find another square.', 'd5 — hits the knight on c6.'],
    ["…Ne5, the engine's first choice: the knight jumps back to the middle, where no pawn of yours hits it right now, and they are clearly better again. But you have a pawn ready for that too.", '…Ne5 — back to the center.'],
    ['f4: there it is. The pawn hits the knight on e5, which has no guard, so it has to move yet again.', 'f4 — hits e5 again.'],
    ['…Ng6: the knight finds a square at last, and it hits your f4 pawn. Your bishop on c1 guards it, so you can keep pushing.', '…Ng6 — safe, hits f4.'],
    ['e5: now the other knight. The pawn hits the knight on f6, your fourth pawn move in a row with a hit on a knight.', 'e5 — hits the knight on f6.'],
    ["…Ng8: the knight goes all the way home. Look at their side now: one knight on g8, the other on g6, and nothing else developed. The engine preferred …Bc5, giving the knight back to get their pieces out. After …Ng8 they are a little better.", '…Ng8 — all the way home.'],
    ["d6, the engine's first choice: one step further. The pawn hits c7, and it stands right in front of their d7 pawn, so that pawn can't move. It's about level now.", 'd6 — hits c7, blocks d7.'],
    ['…cxd6 takes the pawn, and now their pawn on d6 hits your e5 pawn. You take back with that pawn.', '…cxd6 — takes, hits e5.'],
    ["exd6, the engine's first choice: your pawn lands on d6, deep in their camp. It hits c7 and e7, keeps their d7 pawn stuck, and so their bishop on c8 stays shut in behind it. Your queen on d1 guards it all the way down the open file.", 'exd6 — a pawn deep in their camp.'],
    ["…Qf6, the engine's first choice: the queen comes out and hits three things at once: your knight on c3, the pawn on d6 and the pawn on f4. Each one has a guard, but they are clearly better again.", '…Qf6 — hits c3, d6 and f4.'],
    ["Nb5, the engine's first choice, and here's the surprise: you're a knight down, and now you are a little better. Why? Their queen has left d8, and nothing guards c7 any more. Your knight threatens Nc7 check, hitting the king and the rook on a8 at once, and it gives d6 a second guard. Your plan: Be3 and Qd2, castle queenside, and play against a king that is stuck in the middle.", 'Nb5 — threatens Nc7 check.'],
  ],
  'Symmetrical Variation: 4.Bb5 Bb4': [
    ["Ne2, about a quarter of the masters and the engine's first choice. Why move the knight back? Their bishop on b4 was waiting to take it and double your pawns. Now there's nothing on c3 to take. The knight heads for g3 and the kingside, and your c-pawn is free to come to c3. You are a little better.", 'Ne2 — dodges …Bxc3, heads for g3.'],
    ['…Ne7, three masters in four: they copy you again. Their knight leaves c6 for the same tour, toward g6.', '…Ne7 — the same knight tour.'],
    ['c3, nearly nine masters in ten: the pawn hits the bishop on b4, which has no guard, and it gets ready to support d4.', 'c3 — hits b4, prepares d4.'],
    ['…Ba5, almost every master\'s move: the bishop steps back and stays on its diagonal. It still hits c3, but there\'s only a pawn there now, and your b2 pawn guards it.', '…Ba5 — steps back, keeps the diagonal.'],
    ['Ng3: the tour is done. The knight now covers f5 and h5, two squares on their kingside.', 'Ng3 — tour done, covers f5.'],
    ["…Ng6: their knight lands on g6, the mirror one more time. But it's your move, and you have a break ready that they don't. You are a little better.", '…Ng6 — the mirror, once more.'],
    ["d4, the engine's first choice, and there's the break c3 was for. The pawn hits e5, and now you're the one changing the position while they're still copying. That's what moving first is worth in a mirror. You are a little better.", 'd4 — you break the mirror first.'],
    ["…Bb6, the engine's first choice: the bishop gets off a5 and hits your d4 pawn, which c3, the knight on f3 and your queen all guard. You are a little better. Your plan: h3 to keep their bishop off g4, then Bg5 and Bd3, and hold the center with your pawns on c3, d4 and e4.", '…Bb6 — hits d4; h3 next.'],
  ],
  'Italian Four Knights: 4.Bc4': [
    ["Bc4, the Italian Four Knights: the bishop aims at f7, the pawn only their king guards. It looks like the most natural square, but it lets them use a well-known trick, and the engine prefers Bb5 here. After Bc4 it's about level.", 'Bc4 — aims at f7.'],
    ['…Nxe4, close to six masters in ten: the knight grabs your e4 pawn, and it looks like a blunder, because your knight on c3 simply takes it. So why do so many masters play it? The answer comes next move.', '…Nxe4 — a knight for a pawn?'],
    ["Nxe4, seven masters in ten: take the knight. For a moment you're a piece up for a pawn. Bxf7 check, about one master in eight, is the flashy try, but the main road is simply taking.", 'Nxe4 — a piece up, for now.'],
    ["…d5, every master's move, and here's the fork trick: the pawn hits your bishop on c4 and your knight on e4 at the same time. You can't keep both, so they win the piece back.", '…d5 — the fork trick, hits c4 and e4.'],
    ['Bd3, more than eight masters in ten: one move does both jobs. The bishop steps out of the pawn\'s attack and guards your knight on e4, so when the pawn takes the knight, the bishop takes back.', 'Bd3 — saves the bishop, guards e4.'],
    ['…dxe4: the piece comes back, and material is level. Their new pawn on e4 hits your bishop on d3 and your knight on f3, but nothing guards it.', '…dxe4 — level, hits d3 and f3.'],
    ["Bxe4, every master's move, and the only good one: if the bishop just steps away, …exf3 wins your knight. On e4 the bishop is centralized and hits the knight on c6 and the h7 pawn.", 'Bxe4 — level, a central bishop.'],
    ["…Bd6, the engine's first choice: the bishop develops, guards e5 a second time and clears the way for their king to castle.", '…Bd6 — guards e5, castle next.'],
    ['Castle: your king is safe, and the rook on f1 can come to e1 next, behind your bishop.', 'O-O — safe king, rook to e1.'],
    ["They castle too, and it's about level: a quiet, symmetrical position with no weak pawns on either side.", '…O-O — level and quiet.'],
    ["Re1, the engine's first choice: the rook takes the e-file and stands behind your bishop on e4, on the same file as their e5 pawn.", 'Re1 — the e-file, behind the bishop.'],
    ["…Re8 meets your rook on the e-file and gives e5 another guard. The engine prefers …Nb4, but it's about level.", '…Re8 — guards e5, meets your rook.'],
    ["d3, the engine's first choice: the pawn guards your bishop on e4 and opens the diagonal for your bishop on c1, your last minor piece still at home.", 'd3 — guards e4, frees c1.'],
    ["…h6, the engine's first choice: a quiet move that takes g5 away from your knight and your bishop, so neither can land there.", '…h6 — no g5 for your pieces.'],
    ["c3: a small move with a job. The pawn takes d4 and b4 away from their knight on c6, and it can support a later d4. It's about level. Your plan: Bd2 and Qc2 to finish developing, then b4 for space on the queenside, improving your pieces one square at a time.", 'c3 — covers d4 and b4.'],
  ],
  'Rubinstein Variation: 4.Bb5 Nd4': [
    ["…Nd4, the Rubinstein: as common as …Bb4 among masters, and the engine's first choice. Instead of copying you, the knight jumps forward and hits your bishop on b5 and your knight on f3. So what do you do about the knight on d4?", '…Nd4 — the Rubinstein, hits b5 and f3.'],
    ["Nxd4, the engine's first choice and about one master in four: take the knight that was hitting your bishop. Ba4 and Bc4, keeping the bishop out of reach, are a little more common among masters.", 'Nxd4 — trade off the jumping knight.'],
    ["…exd4, every master's move: the pawn takes back, and now it hits your knight on c3. What do you do about that knight?", '…exd4 — hits your knight on c3.'],
    ["Don't move it. Hit back: e5, nineteen masters in twenty. The pawn hits their knight on f6, so now both sides have a knight under a pawn's attack. You're not losing a piece, you're trading one.", 'e5 — counterattack, hits f6.'],
    ['…dxc3: they take your knight first, and their pawn on c3 now hits b2 and d2. Take theirs back right away.', '…dxc3 — takes your knight first.'],
    ["exf6: material is level again. Why not take on c3 first? That's a big mistake: their knight escapes with …Nd5, and you'd be more than two pawns worse.", 'exf6 — the knight back, level again.'],
    ["…Qxf6: the queen takes back and hits f2. Count the pawns: they're one up for now, the one on c3, and you take it next.", '…Qxf6 — takes back, hits f2.'],
    ["dxc3, the engine's first choice: the pawn comes off, and material is level. Take with the d-pawn, not the b-pawn: it opens the d-file for your queen and the diagonal for your bishop on c1.", 'dxc3 — level, opens d-file and c1.'],
    ['…Qe5 check: the queen checks your king and hits your bishop on b5, which has no guard. So you need a block that also saves the bishop.', '…Qe5+ — check, and b5 is hit.'],
    ["Qe2 blocks the check and guards the bishop on b5 in one move, and it offers a queen trade. Blocking with Be2 was a little more precise. After Qe2 it's about level.", 'Qe2 — blocks, guards b5, offers trade.'],
    ['…Qxe2 check: they take the trade, and the queens come off the board.', '…Qxe2+ — queens off.'],
    ["Bxe2, the engine's first choice: take back with the bishop, and your king keeps the right to castle. Kxe2 is playable too, but the king would give up castling for good.", 'Bxe2 — keeps castling rights.'],
    ['…Bc5: the bishop comes out and hits f2, a pawn only your king guards.', '…Bc5 — hits f2.'],
    ["Castle: your king is safe, and the rook on f1 guards f2, though the bishop on c5 now pins that pawn to your king. It's about level. Your plan: Re1 for the open e-file, then Bf3, and a rook landing on e7 if they let it.", 'O-O — castle, the e-file next.'],
  ],
  'Metger Unpin: ...Qe7 System': [
    ["Bc1, the engine's first choice: the bishop goes all the way home. Why give up the pin? On h4 it can be chased again with …g5, while on c1 it's safe, it guards f4 against their knight, and it can come back out on a3 later. You are a little better.", 'Bc1 — home, safe, guards f4.'],
    ['…c6 hits your bishop on b5, which has no guard. The engine preferred …a6, and after …c6 you are a little better.', '…c6 — hits the bishop on b5.'],
    ["Bd3: the bishop steps back to d3, where it guards e4. The engine slightly prefers Bf1. You are a little better. Your plan: a4 for space on the queenside, and if they hit d4 with …c5, push d5 to gain more, with the bishop pair as your long-term edge.", 'Bd3 — guards e4; Bf1 was better.'],
  ],
  'Glek System: 4.g3': [
    ["The Glek System: g3, about one master in nine. Instead of putting the bishop on b5 or c4, you'll put it on g2, on the long diagonal through f3 and e4. It's slower, and the engine prefers Bb5, but after g3 it's about level, and the game stays quiet and flexible.", 'g3 — the Glek, bishop to g2.'],
    ['…Bc5, close to half the masters: the bishop develops actively and hits f2, a pawn only your king guards. …d5, hitting your center right away, is the other main answer.', '…Bc5 — active, hits f2.'],
    ["Bg2, nearly every master's move: the fianchetto is done, and with the bishop and the knight gone from f1 and g1, you're ready to castle.", 'Bg2 — fianchetto done, castle next.'],
    ['…d6, more than nine masters in ten: the pawn guards e5 and opens the diagonal for their bishop on c8. Solid and simple.', '…d6 — guards e5, frees c8.'],
    ["d3, the engine's first choice: the pawn guards e4 and frees the diagonal for your bishop on c1. Castling first comes to the same thing. In a closed position like this, the setup matters more than the order.", 'd3 — guards e4, opens the c1 bishop.'],
    ['…a6: a small, useful move. It takes b5 away from your knight on c3, and it gives their bishop on c5 a retreat on a7 if you ever chase it.', '…a6 — covers b5, a7 retreat.'],
    ["Castle, the engine's first choice. But notice what it does: now their bishop on c5 pins your f2 pawn to your king. Keep that in mind, because it's the reason for your plan a few moves from now.", 'O-O — castled, but f2 is pinned.'],
    ["They castle too, and it's about level: a closed center, with your pawns on e4 and d3 against theirs on e5 and d6.", '…O-O — a closed center.'],
    ["h3, the engine's first choice: it takes g4 away from their bishop on c8 and their knight on f6, so neither can jump in there.", 'h3 — keeps them off g4.'],
    ['…h6: they do the same on their side. Now neither your bishop on c1 nor your knight on f3 can land on g5.', '…h6 — no g5 for you.'],
    ['Be3: offer to trade off the bishop that pins your f2 pawn. Your bishop hits theirs on c5, and the h6 pawn as well, so they have to decide what to do with it.', 'Be3 — challenges the pinning bishop.'],
    ["…Bxe3, the engine's first choice: they take, and here's the point of all this. Only your f2 pawn can take back, and that's exactly what you want.", '…Bxe3 — the trade on e3.'],
    ['fxe3: the pawn takes back toward the center, and look at what changed. The pin is gone, the pawn on e3 covers d4 and f4, and your rook on f1 sits on a half-open file, with only your knight on f3 in the way.', 'fxe3 — the f-file opens up.'],
    ["…Ne7, the engine's first choice: the knight heads for g6, where it would cover f4 and h4. They are a little better here.", '…Ne7 — heading for g6.'],
    ["Nh4, the engine's first choice: the knight goes to the rim on purpose. Now your rook on f1 looks straight up the file at the knight on f6, and from h4 your knight covers g6, so theirs can't settle there, with f5 one jump away. It's about level.", 'Nh4 — opens the f-file for your rook.'],
    ["…c6: the pawn covers d5 and b5, so …d5 or …b5 can come next. It's about level. Your plan: Qe1 and g4, then bring the queen to g3 and pile up on the f-file, with your knight jumping into f5 when the moment comes.", '…c6 — prepares …d5 or …b5.'],
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
