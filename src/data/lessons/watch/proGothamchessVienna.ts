// GothamChess's Vienna — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet (`LESSON_FACTS=1
// LESSON_IDS=pro-gothamchess-vienna`): masters' percentages, engine lines at a
// fixed depth, the board after each move. The student plays White. The last
// three tabs are lines he teaches (docs/levy-lines/decisions). Standard:
// docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register (§2a).
//
// The …Nc6 + …Bc5 tab leaves the quiet tab's line at their sixth move with
// …a6 (as many masters play it as …Bg4): both tabs' own lines are prefixes of
// one walk, so carried on the same moves they taught the same game twice.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Qf3', 'Nxc3', 'bxc3', 'c5', 'Qg3', 'Nc6', 'Nf3', 'Be6', 'Rb1', 'Qd7', 'Bb5', 'O-O-O', 'O-O', 'Be7', 'd4', 'c4'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4, nearly half the masters' first move and the engine's first pick. The pawn takes a central square and opens lines for your queen and the bishop on f1. Keep an eye on its neighbor on f2, though: in this course that is the pawn that starts the fight.", 'e4 — the center, lines open.'],
  ["…e5, about a quarter of masters. The Sicilian is played more often, but the engine likes both replies the same. This is the classical answer: a pawn of their own in the middle, with lines open for their bishop on f8 and their queen. So how do you go after the pawn on e5?", '…e5 — the classical answer.'],
  ["Nc3, and this is the Vienna. Nine masters in ten play Nf3 here, hitting e5 at once; only about three in a hundred choose c3, yet the engine rates the two almost the same. Why c3? Because a knight on f3 stands in front of your f-pawn. On c3 it guards e4 and stays out of the way, so the f-pawn is free to march.", 'Nc3 — the Vienna; the f-pawn stays free.'],
  ["…Nf6, about seven masters in ten: the knight comes out and hits your e4 pawn, which your knight on c3 guards. …Nc6 is the other main reply, about one master in five. With their knight on f6 rather than c6, the question is obvious: is it time for the f-pawn?", '…Nf6 — hits e4.'],
  ["Here's the Vienna Gambit: f4. The pawn hits e5, and right now both pawns are loose, theirs on e5 and yours on f4, so either side can take. If they take on f4, the center is yours; and whichever way the pawns trade, your f-pawn has left the f-file, so once you castle, your rook has a road toward f7. Only about two masters in ten choose it, and the engine prefers the calm Nf3, so this is a choice, not a necessity. It's about level, and the game turns sharp at once.", 'f4 — the Vienna Gambit, hits e5.'],
  ["…d5, nearly every master. Instead of taking your f-pawn, they strike back in the middle: the pawn hits e4. That's the classical way to meet a pawn thrown forward on the wing, a counterpunch in the center. Now pawns are hitting pawns all over the center. Which capture comes first?", '…d5 — the counterpunch in the center.'],
  ["fxe5, nine masters in ten, and the engine agrees. You take toward the center, and the pawn hits the knight on f6, so they have no time for anything calm. Why not exd5? Because …e4 comes, and their pawn pushes past yours and grabs space. Now that knight has to move. Where does it go?", 'fxe5 — takes, hits the f6 knight.'],
  ["…Nxe4, every master. The knight doesn't retreat: it takes your e4 pawn, so the material is level again. From e4 it hits your knight on c3 and the pawn on d2, and their pawn on d5 guards it. That knight is what your next move goes after.", '…Nxe4 — takes, hits c3 and d2.'],
  ["Qf3, about three masters in ten; Nf3 is played more, and the engine rates the two about the same. Look at what the queen hits: the knight on e4, and straight up the f-file, the pawn on f7. Remember the open f-file the gambit promised? Here it is, already at work.", 'Qf3 — hits e4 and f7.'],
  ["…Nxc3, the most common move here, a little over four masters in ten: the knight trades itself off before it can be chased. The engine prefers …Nc6, which develops and leaves the knight on e4. For now their knight on c3 is loose, so you take it. The only question is which pawn.", '…Nxc3 — trades; …Nc6 was stronger.'],
  ["bxc3, about a third of masters; two in three take with the d-pawn, and the engine rates the two close. Why toward the center? Your c-pawns are doubled, but the b-file is half-open for a rook, and your d-pawn stays home, ready for d4. Hold on to that b-file: a rook lands on it soon.", 'bxc3 — the b-file opens.'],
  ["…c5, the masters' top choice here, nearly four in ten, and the engine's first pick. The pawn grabs space on the queenside and covers d4, so your d-pawn can't simply march there. And notice your queen on f3: its target on e4 is gone. Where does it go to keep the pressure on?", '…c5 — space, covers d4.'],
  ["Qg3: the queen slides over and hits g7, a pawn only their bishop on f8 guards. The engine rates Bb5 check and Ne2 about the same. There's a second point, too: with the queen gone from f3, that square is free for your knight.", 'Qg3 — hits g7, frees f3.'],
  ["…Nc6: the knight develops and hits your e5 pawn, which only your queen guards right now. The engine slightly prefers …Qb6 first, but they're close. So e5 wants a second defender, and the piece that does it is the one that still has to come out.", '…Nc6 — hits e5.'],
  ["Nf3: the knight takes the square your queen just left and gives e5 a second guard. Now only the bishop on f1 stands between your king and castling.", 'Nf3 — a second guard on e5.'],
  ["…Be6: the bishop develops behind the d5 pawn and guards it a second time. But look at their queenside: with the bishop gone from c8, nothing guards the pawn on b7.", '…Be6 — guards d5, leaves b7.'],
  ["Rb1: remember the half-open b-file? Here's the rook on it, hitting b7, a pawn with no guard since their bishop left c8. That's what taking toward the center with the b-pawn was for. Now they have to spend a move on b7.", 'Rb1 — the b-file rook hits b7.'],
  ["…Qd7: the queen guards b7 along the seventh rank and clears d8, so they can castle long. The engine prefers …Qc7, which guards b7 and hits your e5 pawn as well. After …Qd7 it's about level.", '…Qd7 — guards b7; …Qc7 was stronger.'],
  ["Bb5: the bishop comes out with a pin. Their knight on c6 can't move without exposing the queen on d7, and that knight is the piece hitting your e5 pawn. The engine rates d4 and Be2 a touch higher, but they're close, and now you're ready to castle.", 'Bb5 — pins the c6 knight.'],
  ["…O-O-O: they castle long, putting their king on c8, the wing where your rook already sits on the b-file. The engine prefers …h6 first. Now the kings head for opposite wings, and that turns the game into a race: whoever opens lines toward the other king first usually wins. It's about level.", '…O-O-O — kings on opposite wings.'],
  ["You castle short, and the king is safe on g1. The rook on f1 now stands on the half-open f-file, the one the gambit pawn left behind. Your rook on b1 watches the wing their king lives on, your bishop pins c6, your queen on g3 hits g7, and you are a little better.", 'O-O — king safe, rook on the f-file.'],
  ["…Be7: the bishop develops, but look at what it leaves behind. It was the bishop on f8 that guarded g7, and your queen on g3 is hitting that pawn. The engine prefers …h6, and now you are a little better. So can you just take on g7?", '…Be7 — leaves g7 unguarded.'],
  ["d4: the center first, and that's the engine's first choice, ahead of the grab on g7. The pawn hits c5, and with the d-pawn gone from d2, your bishop on c1 can now come out toward g5 and h6. You are a little better.", 'd4 — hits c5, frees the c1 bishop.'],
  ["…c4: the pawn steps past, so dxc5 is off, and the queenside closes up. The engine slightly prefers …a6, putting the question to your bishop on b5. You are clearly better. Your plan for the middlegame: Ng5 to go after their bishop on e6, then pick up the g7 pawn your queen has been hitting, with the rook on b1 and the pin on c6 ready for the race against their king.", '…c4 — the queenside closes.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Vienna Gambit Main Line': ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Qf3', 'Nxc3', 'bxc3', 'c5', 'Qg3', 'Nc6', 'Nf3', 'Be6', 'Rb1', 'Qc7', 'Bb5', 'O-O-O', 'O-O'],
  'Vienna Quiet (Bc4 + d3)': ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Nc6', 'd3', 'Bc5', 'f4', 'd6', 'Nf3', 'Bg4', 'Na4', 'Bxf3', 'Qxf3', 'Nd4', 'Qd1', 'b5', 'Nxc5', 'bxc4', 'Na4'],
  'Vienna with …Nc6 + …Bc5': ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Nc6', 'd3', 'Bc5', 'f4', 'd6', 'Nf3', 'a6', 'f5', 'Na5', 'Bb3', 'b5', 'Qe2', 'Nxb3', 'axb3', 'h6', 'Be3'],
  'Vienna Gambit Accepted': ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'exf4', 'e5', 'Ng8', 'Nf3', 'd6', 'd4', 'dxe5', 'Bb5+', 'c6', 'Bc4', 'exd4', 'O-O', 'Be7', 'Ne5', 'dxc3', 'Qh5'],
  'Accepted with Qe2': ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'exf4', 'e5', 'Ng8', 'Nf3', 'd6', 'd4', 'dxe5', 'Qe2', 'Be7', 'Qxe5', 'Nc6', 'Bb5', 'Bd7', 'Bxc6', 'bxc6', 'Bxf4'],
  'Copycat with Qg4': ['e4', 'e5', 'Nc3', 'Nc6', 'Bc4', 'Bc5', 'Qg4', 'g6', 'Qf3', 'Nf6', 'Nge2', 'd6', 'd3', 'h6', 'Bd2', 'Bd7', 'h3', 'Qe7', 'O-O-O', 'O-O-O', 'Kb1'],
  'Quiet vs …Na5': ['e4', 'e5', 'Nc3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Na5', 'Bb3', 'Nxb3', 'axb3', 'd5', 'Nf3', 'd4', 'Ne2', 'Bd6', 'Ng3', 'a5', 'O-O', 'Ra6', 'Bd2'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Vienna Gambit Main Line': [
    ["…Qc7, the engine's choice: the queen guards b7 along the seventh rank and, at the same time, hits your e5 pawn. Count the fight for e5: their queen and the knight on c6 against your queen on g3 and the knight on f3. Two against two, so it holds, and it's about level.", '…Qc7 — guards b7, hits e5.'],
    ["Bb5: the same bishop move, but with the queen gone from d7, it now pins the knight on c6 to their king itself. A knight pinned to the king can't move at all, so only their queen is left hitting e5.", 'Bb5 — pins c6 to the king.'],
    ["…O-O-O: they castle long, and that also breaks the pin, because the king steps off e8 and the knight on c6 is free again. The kings are heading for opposite wings, with your rook already on the b-file, right next to their king's file.", '…O-O-O — breaks the pin, castles long.'],
    ["You castle short. With their queen on c7 hitting e5, they are a little better here, so the job is to get your last pieces working. Your plan for the middlegame: Ba3, where your bishop hits the c5 pawn along the diagonal the bxc3 capture opened, then d4 to open the center, with your rook on b1 already pointing at their king's wing.", 'O-O — king safe; Ba3 and d4 next.'],
  ],
  'Vienna Quiet (Bc4 + d3)': [
    ["Bc4, about a quarter of masters. Instead of the gambit at once, you develop first: the bishop aims at f7, a pawn only their king defends. The engine prefers Nf3, but the bishop keeps your f-pawn free, and that's the whole idea of the Vienna.", 'Bc4 — aims at f7, f-pawn free.'],
    ["…Nc6, about half the masters: the knight develops and guards e5. About one in four grab your e4 pawn with the knight instead. Here they simply develop.", '…Nc6 — develops, guards e5.'],
    ["d3, nearly every master. Why now? If you play Nf3 instead, …Nxe4 grabs your pawn. With d3, a pawn guards e4 for good, and the diagonal opens for your bishop on c1.", 'd3 — e4 is safe for good.'],
    ["…Bc5: the mirror image. Their bishop aims at f2, a pawn only your king defends, just as yours aims at f7. About one master in five plays it; half of them chase your bishop with …Na5 instead.", '…Bc5 — the mirror, aims at f2.'],
    ["And now, with your pieces out, the Vienna pawn: f4, more than half the masters' choice. It hits e5 and starts your play on the kingside. The engine prefers h3 first, which takes g4 away from their pieces, but f4 is the move this setup was built for.", 'f4 — the Vienna pawn, hits e5.'],
    ["…d6, about eight masters in ten: the pawn props up e5 and opens the road for their bishop on c8. And that bishop already has a square in mind: g4.", '…d6 — props up e5.'],
    ["Nf3, nine masters in ten: the knight hits e5 a second time, together with your f4 pawn, and gets you ready to castle. But notice the square it stands on: from g4, their bishop would pin it to your queen.", 'Nf3 — hits e5, but g4 looms.'],
    ["…Bg4, the masters' top choice, just ahead of …a6, and the engine's too. There's the pin: your knight on f3 can't move without exposing the queen on d1, and it's one of the pieces hitting e5. So how do you fight back?", '…Bg4 — the pin on f3.'],
    ["Na4, nearly eight masters in ten and the engine's choice. Instead of breaking the pin, you hit the bishop on c5. Why that piece? It's the one aimed at f2, next to your king. h3, the obvious way to question the pin, the engine rates about half a pawn worse.", 'Na4 — goes after the c5 bishop.'],
    ["…Bxf3: they take the knight first, before you can take their bishop. Their bishop on f3 now hits your queen, and it's loose, so you take back. With what?", '…Bxf3 — takes the knight first.'],
    ["Qxf3: the queen takes back, and your kingside pawns stay whole; gxf3 would leave them broken, and the engine rates it more than a pawn worse. Their bishop on c5 is still hit by your knight on a4.", 'Qxf3 — takes back, pawns intact.'],
    ["…Nd4: the knight jumps in and hits your queen on f3 and the c2 pawn, which has no guard. …Nxc2 check would hit your king and the rook on a1 at once, so the queen has to find a square that covers c2.", '…Nd4 — hits the queen and c2.'],
    ["Qd1, the engine's choice: back home, guarding c2, so …Nxc2 check is off. It looks like a retreat, but it's the right one, and it's about level.", 'Qd1 — home, guards c2.'],
    ["…b5, a pawn fork: it hits your bishop on c4 and the knight on a4 together, and the knight has no guard. Only one of them can move. So which one, and how? You are a little better, but only if you find the right answer.", '…b5 — a pawn fork, c4 and a4.'],
    ["Nxc5: the knight takes the bishop. But here's the point the engine sees: your bishop on c4 was lost either way, so Bxf7 check first spends it on a pawn with check, dragging their king out, and only then does Nxc5 follow. That's a desperado: a piece that's doomed sells itself as dearly as it can. After Nxc5 it's only about level.", 'Nxc5 — takes; Bxf7+ first was stronger.'],
    ["…bxc4: they take the bishop, so each side has given up a bishop. Now both sides have something loose: your knight on c5, hit by the d6 pawn, and their pawn on c4.", '…bxc4 — a bishop each.'],
    ["Na4: the knight runs back to a4, out of the d6 pawn's reach. The engine slightly prefers c3, hitting their knight on d4 first. It's about level. Your plan for the middlegame: c3 to kick the knight off d4, castle, then go after the loose pawn on c4, part of their doubled c-pawns.", 'Na4 — back to safety.'],
  ],
  'Vienna with …Nc6 + …Bc5': [
    ["…a6: almost exactly as many masters play this as …Bg4, about a third each. Why a quiet pawn move? It clears a7 as a retreat for their bishop on c5, and it prepares …b5 to chase your bishop on c4. No pin this time: they're thinking about your bishop instead.", '…a6 — a7 for the bishop, …b5 next.'],
    ["f5, the engine's first choice: the pawn grabs space on the kingside and takes e6 and g6 away from their pieces. Remember …Bg4, the pin from the quiet line? With your pawn on f5, their bishop on c8 can't get to g4 at all. The cost: no pawn of yours hits e5 any more, so that pawn stands solid now.", 'f5 — space, and no …Bg4.'],
    ["…Na5, the engine's choice: the knight goes after your bishop on c4, the piece aimed at f7, with …b5 ready to back it up. So where should the bishop go?", '…Na5 — hunts the c4 bishop.'],
    ["Bb3: the bishop steps back and keeps its aim at f7. The engine prefers Bd5, right in the center, but on b3 it's about level, and if their knight takes it, your a-pawn takes back and the a-file opens for your rook.", 'Bb3 — keeps f7; Bd5 was stronger.'],
    ["…b5: more space on the queenside, and the pawn clears b7 for their light-squared bishop, the one your f5 pawn shut out of the kingside.", '…b5 — space, b7 for the bishop.'],
    ["Qe2: the queen steps up behind your e4 pawn and clears d1, so once the bishop on c1 comes out, you can castle long.", 'Qe2 — behind e4, clears d1.'],
    ["…Nxb3: they take the bishop, and the knight on b3 now hits your rook on a1 and the bishop on c1. It has to be taken right now.", '…Nxb3 — hits a1 and c1.'],
    ["axb3: take with the a-pawn, toward the center. That opens the a-file, and your rook on a1 looks straight up it at a6. cxb3 would keep the file closed, and the engine rates it about half a pawn worse.", 'axb3 — the a-file opens.'],
    ["…h6: the pawn takes g5 away from your bishop, so there's no Bg5 to pin their knight on f6 to the queen.", '…h6 — covers g5, no pin.'],
    ["Be3, the engine's first choice: if not g5, then e3. The bishop challenges theirs on c5, the one aimed at f2 next to your king, and it's about level. Your plan for the middlegame: trade off that bishop and take back with the queen on e3, get your king safe, then use the open a-file and the space your e4 and f5 pawns give you on the kingside.", 'Be3 — challenges the c5 bishop.'],
  ],
  'Vienna Gambit Accepted': [
    ["…exf4: they take the pawn. Almost no master does; nearly all of them strike with …d5, and the engine agrees. Here's why taking is risky: your e-pawn is now free to push, and it will kick their only developed piece. You are a little better, a pawn down.", '…exf4 — takes; …d5 was stronger.'],
    ["e5, the engine's first choice, and there's the point. The pawn hits the knight on f6, and look at its options: every square forward is far worse than going home.", 'e5 — kicks the knight.'],
    ["…Ng8, the engine's choice: the knight goes all the way back. Now take stock. You're a pawn down, but they have no piece developed at all, and your e5 pawn takes d6 and f6 away from them. You are a little better.", '…Ng8 — all the way home.'],
    ["Nf3, the engine's first choice: the knight develops, guards e5, and covers h4, so their queen can't give a check from there.", 'Nf3 — guards e5, covers h4.'],
    ["…d6, the engine's choice: they go straight at your e5 pawn, the one cramping them. Hitting the pawn that cramps you is the natural way to free your pieces.", '…d6 — hits the cramping e5 pawn.'],
    ["d4, the engine's first choice: build the center. The pawn backs up e5, and with the d-pawn gone from d2, your bishop on c1 now looks straight at f4. That gambit pawn has no guard, and it won't be easy to keep.", 'd4 — the center; f4 is loose.'],
    ["…dxe5: they take a second pawn, so you're two pawns down. But look at the new pawn on e5: nothing guards it, and it hits your d4 pawn. There are two ways to go after it: Bb5 check first, or Qe2 at once.", '…dxe5 — two pawns up for them.'],
    ["Bb5 check, the engine's first choice, rated the same as Qe2. Why check first? Their answer has to deal with your bishop, so the pawns on e5 and f4 get no help in the meantime.", 'Bb5+ — check first, gain time.'],
    ["…c6: the pawn blocks the check and hits your bishop on b5, so the bishop has to move. Where to?", '…c6 — blocks and hits b5.'],
    ["Bc4, the engine's first choice, far ahead of Bd3 or Be2: the bishop finds its real diagonal, aimed at f7, a pawn only their king defends, while their army is still at home.", 'Bc4 — the real diagonal, aims at f7.'],
    ["…exd4: a third pawn, and this one hits your knight on c3. You're three pawns down, so every move from here has to make something happen.", '…exd4 — a third pawn, hits c3.'],
    ["You castle and let the knight on c3 stay under attack. The engine prefers Bxf4, taking a pawn back first. But look what castling does: the king leaves the center, and your rook arrives on the f-file. You are a little better.", 'O-O — king out; Bxf4 was stronger.'],
    ["…Be7, the engine's choice: the bishop develops at last and covers g5 and h4. But notice f7: nothing new defends it, and your knight is one jump from e5.", '…Be7 — develops, covers h4.'],
    ["Ne5, the engine's first choice: the knight jumps in and hits f7, a second attacker with your bishop on c4, and it hits the c6 pawn too. Your knight on c3 is still under attack, and you let it go: the attack on f7 matters more. It's about level.", 'Ne5 — a second hit on f7.'],
    ["…dxc3: they take the knight, so you're down a piece and three pawns, and they are a little better. But their king is still on e8, with f7 under fire from your knight and bishop. Time to bring the queen.", '…dxc3 — a piece and three pawns.'],
    ["Qh5, the engine's choice: the queen hits f7 and h7, and the f7 pawn is pinned to their king. That's three attackers on f7, the queen, the bishop and the knight. Still, they are a little better, so this is a gambit you play for the attack, not for the material. Your plan for the middlegame: after their check with …Qd4, step the king to h1, then Bxf7 check and Rxf4, the rook joining through the file you opened at the very start.", 'Qh5 — three attackers on f7.'],
  ],
  'Accepted with Qe2': [
    ["Qe2, rated just as highly as the bishop check, and it goes straight at e5. Look down the e-file: their pawn on e5 is pinned to the king on e8, so it can't take your d4 pawn, and nothing guards it. You are a little better.", 'Qe2 — pins the e5 pawn.'],
    ["…Be7, the engine's choice: the bishop steps in front of the king and breaks the pin, so the e5 pawn is free to move again. From e7 it also looks at h4, with …Bh4 check as an idea. It's about level.", '…Be7 — breaks the pin.'],
    ["Qxe5, the engine's first choice: the queen takes a pawn back, and look at what it hits from e5: c7, g7, f4, and the bishop on e7, now pinned to their king. g7 and f4 have no guard. That's the payoff of the pin: one pawn back, and two more loose.", 'Qxe5 — one back, two more loose.'],
    ["…Nc6: the knight develops and hits your queen on e5 and the pawn on d4. The engine prefers …Nf6. So your queen is attacked: do you move it, or is there something better?", '…Nc6 — hits your queen; …Nf6 was better.'],
    ["Bb5, the engine's choice: don't move the queen, pin the knight. The knight on c6 is pinned to their king, so it can't take your queen at all. Two pins at once now: the knight by your bishop, and the bishop on e7 by your queen. You are a little better.", 'Bb5 — pins c6; the queen stays.'],
    ["…Bd7, the engine's choice: the bishop steps in and breaks the pin on c6, so the knight is free again, and it still hits your queen. Time to act on c6 before it moves.", '…Bd7 — breaks the pin on c6.'],
    ["Bxc6: take the knight first, before it can take your queen. Your bishop on c6 now hits their bishop on d7 and the b7 pawn, so they have to take back. You are a little better.", 'Bxc6 — takes, pins the d7 bishop.'],
    ["…bxc6: the b-pawn takes back, and their c-pawns are doubled. Two pawns of theirs still have no guard: f4 and g7.", '…bxc6 — doubled c-pawns.'],
    ["Bxf4, the engine's choice: the last gambit pawn comes back, so material is level, your pieces are out, and you are a little better. Your plan for the middlegame: castle long, then go after the weak pawns their trades left behind, c7 first, which your queen already hits, while their bishop on e7 stays pinned.", 'Bxf4 — the pawns are back.'],
  ],
  'Copycat with Qg4': [
    ["…Nc6, about one master in five, and the engine's own first pick. The knight guards e5 at once, and their other knight hasn't committed yet. Against this, the gambit with f4 costs you more than half a pawn, so you change plans: the bishop comes out first.", '…Nc6 — guards e5.'],
    ["Bc4, the masters' most common move here, nearly four in ten. The bishop aims at f7, next to their king, and you keep your options open for the f-pawn.", 'Bc4 — aims at f7.'],
    ["…Bc5: the copycat. Their bishop mirrors yours and aims at f2. About one master in eight does this; eight in ten bring the knight to f6, and the engine prefers that too. And see what the copy cost them: the bishop on f8 was the piece guarding g7.", '…Bc5 — the copycat; …Nf6 was better.'],
    ["Qg4, half the masters, and the engine's first choice. The queen hits g7, which nothing guards now, and d7 too. Bringing the queen out early is usually a mistake, but this one comes with a threat they must answer right now.", 'Qg4 — hits the loose g7.'],
    ["…g6, six masters in ten: the pawn steps forward, so g7 is no longer a target. …Qf6 looks just as natural, guarding g7 with the queen, but it walks into Nd5, hitting the queen and c7 at once. You are a little better.", '…g6 — covers g7; avoid …Qf6.'],
    ["Qf3, the engine's choice: the queen swings across and hits f7 instead, together with your bishop on c4. Two attackers on a pawn only their king defends, so they have to deal with f7 right now.", 'Qf3 — two attackers on f7.'],
    ["…Nf6, the engine's choice: the knight blocks the f-file, so your queen no longer hits f7, and it hits your e4 pawn in return.", '…Nf6 — blocks the f-file.'],
    ["Nge2, the engine's choice. The usual square, f3, is taken by your queen, and on e2 the knight covers d4, so their knight on c6 can't jump in there for free and hit your queen and c2.", 'Nge2 — covers d4.'],
    ["…d6, the engine's choice: the pawn props up e5 and opens the diagonal for their bishop on c8.", '…d6 — props up e5.'],
    ["d3: the pawn guards e4, and now your bishop on c1 can come out too.", 'd3 — guards e4, frees c1.'],
    ["…h6: the pawn takes g5 away from your bishop, so no Bg5 to pin their knight on f6 to the queen.", '…h6 — covers g5.'],
    ["Bd2: the bishop develops on the diagonal toward h6, and with c1 and d1 empty, your king can now castle long.", 'Bd2 — develops, long castling ready.'],
    ["…Bd7: a modest square, but it clears c8, so they can castle long once the queen moves.", '…Bd7 — clears the back rank.'],
    ["h3, the engine's choice: the pawn takes g4 away from their bishop and knight, so neither can land there, and it gets your g-pawn ready to advance.", 'h3 — covers g4, g4 next.'],
    ["…Qe7, the engine's choice: the queen steps off d8, and now both sides can castle long.", '…Qe7 — clears d8.'],
    ["You castle long: the king goes to c1 and the rook to d1. The engine slightly prefers g4 first, starting your kingside pawns, but they're close.", 'O-O-O — king to c1, rook to d1.'],
    ["…O-O-O: they castle long as well, so both kings sit on the queenside. The engine prefers …Na5 first, going after your bishop on c4.", '…O-O-O — both kings on the queenside.'],
    ["Kb1: a quiet safety move, the usual one after castling long. The king steps off the c-file and into the corner, before any line toward it can open. That's prophylaxis: take care of your own king before you start the real plan. You are a little better. Your plan for the middlegame: g4 and g5 to drive their knight off f6, which opens the f-file to f7 for your queen again; with both kings on the queenside, your kingside pawns can advance freely.", 'Kb1 — safety first, then g4.'],
  ],
  'Quiet vs …Na5': [
    ["…Nf6, eight masters in ten: the second knight comes out and hits your e4 pawn. By a different road, this is exactly the position of the quiet line, with your bishop on c4 and their knights on c6 and f6. That's a transposition.", '…Nf6 — hits e4, a transposition.'],
    ["d3, nearly every master: your e4 pawn gets a pawn behind it for good, and the bishop on c1 has a diagonal again.", 'd3 — e4 protected for good.'],
    ["…Na5, the masters' main move here, half of them, and the engine's first choice. The knight goes straight after your bishop on c4, the piece aimed at f7. A knight on the rim looks odd, but trading it for that bishop is worth the trip.", '…Na5 — hunts the c4 bishop.'],
    ["Bb3, about one master in five; half of them simply develop with Nge2 and let the trade happen. On b3 the bishop keeps its aim at f7, and if the knight takes it, your a-pawn takes back toward the center.", 'Bb3 — keeps the aim at f7.'],
    ["…Nxb3, nearly eight masters in ten: they take at once. The bishop pair is theirs now, and the knight on b3 hits your rook on a1 and the bishop on c1, so it has to go.", '…Nxb3 — the bishop pair for them.'],
    ["axb3, the engine's choice; cxb3 is about half a pawn worse. The a-pawn takes, and your rook on a1 looks straight up the half-open a-file at a7. They have two bishops, but your pawns are solid.", 'axb3 — the a-file for your rook.'],
    ["…d5, the engine's choice: with your bishop gone, they strike in the center at once and hit your e4 pawn.", '…d5 — strikes at e4.'],
    ["Nf3, the engine's choice. Instead of defending e4 or taking on d5, you hit back at e5, which has no guard. A threat answered with a threat.", 'Nf3 — hits the loose e5.'],
    ["…d4: the pawn pushes past, grabbing space and hitting your knight on c3. So you can't take on e5 yet: the knight on c3 has to move first.", '…d4 — space, hits c3.'],
    ["Ne2, the engine's choice: the knight steps aside and hits the d4 pawn, and from e2 it can head for the kingside.", 'Ne2 — hits d4, heads kingside.'],
    ["…Bd6, the engine's choice: the bishop finally guards e5.", '…Bd6 — guards e5.'],
    ["Ng3: the knight reaches the kingside, where f5 is in its reach. The engine prefers to castle first.", 'Ng3 — f5 in reach; castle first.'],
    ["…a5, the engine's choice: the pawn takes b4 away from your pieces and frees a6 for their rook on a8.", '…a5 — covers b4, frees a6.'],
    ["You castle: the king is safe, and the rook on f1 stands behind your f-pawn, ready for when f4 comes.", 'O-O — king safe, rook behind f2.'],
    ["…Ra6, an unusual move and the engine's first choice: the rook lifts to a6, from where it can slide across to b6 and hit your b3 pawn.", '…Ra6 — the rook lift.'],
    ["Bd2: the bishop develops and hits a5. But look at e5 first: the engine prefers Nxe5, because if their bishop takes back, f4 hits it and your center pawns start rolling. As played, it's about level. Your plan for the middlegame: Nf5, where the knight hits the bishop on d6, and then f4 to open the f-file for your rook.", 'Bd2 — develops; Nxe5 was stronger.'],
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

export const PRO_GOTHAMCHESS_VIENNA_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-vienna',
  title: "This repertoire's Vienna Gambit — Rb1 and the Opposite-Castle Attack",
  orientation: 'white',
  sources: [
    'book:vienna-game',
    'concept:pos-development',
    'concept:pos-center',
    'https://www.chess.com/openings/Vienna-Game',
    'https://www.chess.com/openings/Vienna-Game-Vienna-Gambit',
    'https://en.wikipedia.org/wiki/Vienna_Game',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
