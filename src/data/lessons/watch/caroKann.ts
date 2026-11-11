// The Caro-Kann Defence — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet
// (`LESSON_FACTS=1 LESSON_IDS=caro-kann`): masters' percentages, engine lines
// at a fixed depth, the board after each move. The student plays Black.
// Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register
// (§2a). One story runs through every line: …c6 gets a pawn ready to stand on
// d5, and the light-squared bishop leaves c8 before …e6 can shut it in. The
// tabs are what they do about it: chase the bishop with the h-pawn (the
// Classical), lock the centre and get hit at the base (the Advance), pin and
// trade it (the Two Knights), take it away from f5 (the Exchange), isolate
// their own d-pawn (the Panov), prop up e4 with f3 (the Fantasy), or take
// doubled f-pawns for an open e-file (the Tartakower).
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7', 'h5', 'Bh7', 'Bd3', 'Bxd3', 'Qxd3', 'e6', 'Bf4', 'Ngf6', 'O-O-O', 'Be7', 'Ne4', 'O-O', 'Kb1', 'c5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — the king's pawn takes the centre, the masters' most common first move, close to half their games. It opens the way for their queen and the bishop on f1. How do you meet it? The Caro-Kann doesn't hit back at once. It gets ready first.", 'e4 — they take the centre.'],
  ["…c6, the Caro-Kann. Only about one master in twelve plays it; …c5 is far more popular. So what does a pawn on c6 do? It covers d5, so your d-pawn can go there next with a pawn behind it. The French gets the same support from …e6, but that pawn shuts in your bishop on c8. Here, the moment your d-pawn moves, that bishop's road is open.", '…c6 — d5 next, the bishop stays free.'],
  ['d4, eight masters in ten: now they have two pawns side by side in the centre, on d4 and e4. You haven\'t challenged either one yet. That changes right now.', 'd4 — two pawns in the centre.'],
  ["…d5, nearly every master, and there's the point of …c6. Your pawn hits e4, and nothing guards it, so they have to decide at once: push past, trade, or defend. And if they ever take on d5, the c6 pawn takes back and you still have a pawn in the middle.", '…d5 — hits e4, backed by c6.'],
  ["Nc3 — they defend with a piece: the knight guards e4 and hits your d5 pawn. About a quarter of the masters play it. The Advance, e5, is more common, and it's the engine's choice; it has its own tab.", 'Nc3 — guards e4, hits d5.'],
  ["…dxe4, more than nine masters in ten. Why give up the centre? Holding d5 with …e6 rates far worse, and it would shut in your bishop on c8 — the French problem. Take on e4 instead, and that bishop's diagonal is clear for good. Your pawn on e4 has no guard, so they take it back.", '…dxe4 — trade, and free the bishop.'],
  ["Nxe4, every master: the knight takes back and material is level. Now comes the big choice of the Caro-Kann, and you have three good roads: …Bf5, more than half the masters, or …Nd7 and …Nf6, about one in five each. Notice that nothing guards the knight on e4, so whatever you choose can hit it.", 'Nxe4 — level again; your big choice.'],
  ["…Bf5, the Classical, and here is the whole idea of the Caro-Kann in one move. Your light-squared bishop gets outside the pawn chain before …e6 is ever played, so it never gets buried behind your own pawns. And it comes with a hit: the bishop attacks the knight on e4, which has no guard. More than half the masters play it, and it's about level.", '…Bf5 — the bishop out first, hits e4.'],
  ['Ng3, nineteen masters in twenty: the knight steps away and hits back at your bishop on f5, which has no guard. So the bishop moves again. But look at g3 for a second: from there the knight also covers h5, and their h-pawn is about to use that.', 'Ng3 — hits the loose bishop on f5.'],
  ["…Bg6, every master: the bishop keeps its diagonal and still eyes c2. Dropping back to e6 rates far worse, and there it would block your own e-pawn. On g6, though, it sits right in front of their h-pawn. Can they use that?", '…Bg6 — keeps the diagonal, eyes c2.'],
  ['h4, about two masters in three, and here is the threat. If the pawn reaches h5, where does your bishop on g6 go? Not h7: your own pawn stands there. Not f5: the knight on g3 covers it. The bishop would be running out of squares.', 'h4 — h5 next, against your bishop.'],
  ['…h6, every master, and it answers the threat a move early. The pawn steps off h7, so when h5 comes, your bishop has a square to drop back to. It also takes g5 away from their pieces. Stopping the pawn with …h5 instead rates far worse.', '…h6 — makes room on h7.'],
  ['Nf3, nearly nine masters in ten: the knight develops, guards the h4 pawn, and eyes e5. Keep e5 in mind. From there their knight would hit your bishop on g6 and the f7 pawn at once, so your next move takes that square away.', 'Nf3 — develops, eyes e5.'],
  ['…Nd7, eight masters in ten: the knight covers e5, so theirs can\'t jump in there for free. It also covers f6, so when your other knight lands there, it has a partner behind it. First, though, the h-pawn takes one more step.', '…Nd7 — covers e5 and f6.'],
  ['h5, more than nine masters in ten: the pawn hits your bishop on g6. Remember …h6? This is why you played it. The pawn on h5 now takes g6 away from your bishop, but the bishop has h7 to go to.', 'h5 — hits the bishop on g6.'],
  ['…Bh7, every master: the bishop drops into the square …h6 cleared for it, and it never left its diagonal. From h7 it still eyes c2. Going back to f5 instead rates far worse.', '…Bh7 — into the pocket, still eyes c2.'],
  ['Bd3, every master: their bishop lines up against yours on h7 and offers a trade. Do you avoid it? No. That bishop on d3 points straight at your kingside, and taking it is exactly what you want.', 'Bd3 — offers the bishop trade.'],
  ["…Bxd3, every master. Look at the trip your bishop made: it came out before …e6, drew their h-pawn all the way up to h5, and now it trades itself for the bishop that pointed at your king. In the French, that bishop often stays shut in on c8. Yours never got stuck at all.", '…Bxd3 — trade off their attacking bishop.'],
  ['Qxd3, every master: the queen takes back, and taking with the c-pawn rates far worse. Look where the queen stands now, on the bishop\'s old diagonal, aiming at h7. And with your bishop traded, there\'s no reason to hold back …e6 any longer.', 'Qxd3 — takes back, aims at h7.'],
  ["…e6, about three masters in four, and only now. The pawn opens the road for your bishop on f8, and together with the c6 pawn it covers d5, so no piece of theirs can settle there. That's the Caro-Kann setup: solid, nothing loose, and no bad bishop left behind.", '…e6 — frees f8, guards d5.'],
  ['Bf4, a bit over four masters in ten, and the engine\'s first choice; a few more play Bd2. The bishop takes an active diagonal toward c7 and your h6 pawn. And look at their back rank: b1, c1 and d1 are all empty now. You can guess where their king is going.', 'Bf4 — active bishop, long castling ready.'],
  ['…Ngf6: your last minor piece comes out and hits the h5 pawn, which is guarded twice. Now the knights on d7 and f6 cover each other. The engine prefers …Qa5 check first, pulling their bishop back to d2 before you develop. They are a little better.', '…Ngf6 — develops, hits h5.'],
  ["They castle long, the engine's first choice. Their king goes to c1, far from the h-pawn they've pushed to h5, and your king is heading the other way. Kings on opposite wings usually means a race: each side's pawns march at the other king.", 'O-O-O — kings head for opposite wings.'],
  ['…Be7: the bishop develops quietly and clears f8, so your king can castle. The engine prefers …Qa5 first, getting the queen to the queenside where their king now lives. They are a little better.', '…Be7 — clears f8 for castling.'],
  ['Ne4: the knight from g3 jumps back to the centre and hits your knight on f6. Nothing hangs: f6 is guarded three times, by the knight on d7, the bishop on e7 and the g7 pawn. It\'s an offer to trade.', 'Ne4 — hits f6, offers a trade.'],
  ["…O-O: your king goes short, to the opposite wing from theirs, and the race is on. The engine prefers taking on e4 first, trading the knights before your king commits. They are a little better.", '…O-O — kings on opposite wings.'],
  ["Kb1, the engine's first choice, and a typical quiet move. The king steps off the c-file and guards a2. Why bother? Because the c-file is exactly where your next move is aimed. That's prophylaxis: getting out of the way before the trouble arrives.", 'Kb1 — off the c-file, guards a2.'],
  ["…c5, the engine's first choice, and here's the break your whole setup was waiting for. The pawn hits d4, their only pawn left in the centre, and it starts opening the c-file toward their king. Your plan: take on d4 when it suits you, trade knights on e4 to blunt their attack, and get a rook to the c-file while they push g4 and g5 at your king.", '…c5 — hits d4, opens the c-file.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move no earlier line shares. */
type TabBeats = Array<[string, string]>;

/** Filed in this order: each tab's beats start where the lines before it end. */
const TAB_LINES: Record<string, string[]> = {
  'Classical Variation': ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7', 'h5', 'Bh7', 'Bd3', 'Bxd3', 'Qxd3', 'e6', 'Bf4', 'Ngf6', 'O-O-O', 'Be7', 'Ne4', 'O-O'],
  'Advance Variation': ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5', 'Be3', 'Nd7', 'O-O', 'Ne7', 'Nbd2', 'Nc6', 'c3', 'cxd4', 'cxd4', 'Be7', 'Ne1', 'O-O', 'Bd3', 'Bxd3'],
  'Two Knights Variation': ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'Bg4', 'h3', 'Bxf3', 'Qxf3', 'e6', 'Be2', 'Nf6', 'O-O', 'Nbd7', 'd4', 'dxe4', 'Nxe4', 'Nxe4', 'Qxe4', 'Nf6', 'Qd3', 'Be7', 'c4', 'O-O'],
  'Panov-Botvinnik Attack': ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4', 'Nf6', 'Nc3', 'e6', 'Nf3', 'Bb4', 'cxd5', 'Nxd5', 'Bd2', 'Nc6', 'Bd3', 'O-O', 'O-O', 'Be7', 'a3', 'Bf6', 'Be3', 'Nce7', 'Ne4', 'b6', 'Qe2', 'Bb7'],
  'Fantasy Variation': ['e4', 'c6', 'd4', 'd5', 'f3', 'dxe4', 'fxe4', 'e5', 'Nf3', 'Bg4', 'Bc4', 'Nd7', 'O-O', 'Ngf6', 'c3', 'Bd6', 'Nbd2', 'O-O', 'Qe1', 'Re8'],
  'Exchange Variation': ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'Bd3', 'Nc6', 'c3', 'Nf6', 'Bf4', 'Bg4', 'Qb3', 'Qd7', 'Nd2', 'e6', 'Ngf3', 'Bd6', 'Bxd6', 'Qxd6', 'O-O', 'O-O', 'Rfe1', 'Rab8', 'Ne5', 'Bh5', 'a4', 'Bg6'],
  'Tartakower/Breyer Variation': ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Nxf6+', 'exf6', 'c3', 'Bd6', 'Bd3', 'O-O', 'Qc2', 'Re8+', 'Ne2', 'h5', 'Be3', 'Nd7', 'O-O-O', 'Nf8', 'Kb1', 'Be6', 'c4', 'Rc8'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The Classical tab is the main line's first 26 moves: every beat is shared.
  'Classical Variation': [],
  'Advance Variation': [
    ["e5, the Advance: the masters' most common move here, four games in ten, and the engine's first choice. The pawn grabs space and takes d6 and f6 away from your pieces. It looks like a French. But in the French, …e6 is already on the board and your bishop on c8 is shut in. Here it isn't, yet.", 'e5 — the Advance, grabs space.'],
    ["…Bf5, nearly eight masters in ten, and the engine's first choice. That's the Caro's answer to the Advance: the bishop gets outside the chain first and aims at c2, and only then does …e6 come. Same idea as the Classical, without the trade on e4. Striking with …c5 at once rates lower.", '…Bf5 — bishop out before …e6.'],
    ["Nf3, half the masters: the calm approach. The knight develops, guards d4 and e5, and their king can castle soon. About one in five push h4 instead, chasing your bishop the way the Classical does.", 'Nf3 — develops, guards d4 and e5.'],
    ["…e6, every master, and now it costs you nothing, because the bishop is already out on f5. The pawn guards d5 and the bishop, and it frees the one on f8. Now look at their chain, d4 and e5. Where do you hit a pawn chain? At its base: d4.", '…e6 — chain built, bishop already out.'],
    ['Be2, nearly every master: the bishop comes out quietly, outside the reach of your bishop on f5, and clears the way to castle. On d3 it would have run straight into yours.', 'Be2 — develops, castling next.'],
    ["…c5, about a third of the masters and the engine's first choice: there's the strike at the base. The pawn hits d4, and if d4 ever falls, the e5 pawn loses its support. Many masters play …Nd7 or …Ne7 first, but the pawn break is what the whole setup is for.", '…c5 — hits d4, the base.'],
    ['Be3, nearly three masters in four: the bishop adds a guard to d4, so the pawn holds. But see what it gave up on c1: nothing guards b2 any more. Keep that pawn in mind.', 'Be3 — guards d4, leaves b2.'],
    ["…Nd7: the knight hits e5 and guards c5. But remember b2? That was the urgent question. The engine prefers …Qb6 right away, hitting the pawn the bishop just left behind. After …Nd7 they are a little better.", '…Nd7 — hits e5; …Qb6 was stronger.'],
    ["They castle, and their king is safe on g1. Now think about your king's knight: where does it go? Not f6 — their e5 pawn covers that square.", 'O-O — their king is safe.'],
    ["…Ne7, the engine's first choice: with f6 off-limits, the knight goes to e7. It guards your bishop on f5 and the d5 pawn there, and it's on its way to c6.", '…Ne7 — f6 is covered, so e7.'],
    ['Nbd2: the last knight develops, backing up c4 and e4. The engine prefers c4 at once, hitting your d5 pawn from the side. They are a little better.', 'Nbd2 — develops; c4 was stronger.'],
    ["…Nc6, the engine's first choice: the knight arrives where it was headed and hits d4 and e5 together. Count d4: two attackers, the c5 pawn and the knight; two guards, the knight on f3 and the bishop on e3. Their pieces are tied to their pawn chain.", '…Nc6 — hits d4 and e5.'],
    ['c3 props up d4 with a pawn. Solid, but passive: the engine prefers c4, hitting your d5 pawn instead. After c3 it\'s about level.', 'c3 — props up d4; c4 was better.'],
    ["…cxd4 releases the tension too early. The engine prefers …Be7, leaving the pawns where they are. Your pawn on d4 hits their bishop on e3 and the c3 pawn, so they have to take back right away. They are a little better.", '…cxd4 — early; …Be7 was stronger.'],
    ['cxd4: the pawn takes back and their chain, d4 and e5, stands again. The engine prefers Nxd4. Now the c-file is open for both sides, and both will want a rook there. It\'s about level.', 'cxd4 — the c-file opens.'],
    ['…Be7: the bishop develops and your king can castle next. The engine prefers …Bg6. It\'s about level.', '…Be7 — develops, castling next.'],
    ["Ne1, the engine's first choice. A knight going backwards? It wants d3. If the bishops come off on d3, this knight takes back there, and from d3 it guards e5.", 'Ne1 — bound for d3.'],
    ["…O-O, the engine's first choice: king safe first. Their bishop is about to come to d3 to challenge yours, and you're ready for it.", '…O-O — king safe first.'],
    ["Bd3, the engine's first choice: their bishop hits yours on f5, which the e6 pawn guards, and offers the trade. Take, keep, or retreat?", 'Bd3 — challenges your bishop on f5.'],
    ["…Bxd3, the engine's first choice: take it, and their knight comes back to d3 as planned. Your light-squared bishop leaves the board without ever being shut in behind …e6, the Caro's promise kept. They are a little better. Your plan: …Nb4 to challenge the knight on d3, and a rook to the open c-file.", '…Bxd3 — trade, then …Nb4 and the c-file.'],
  ],
  'Two Knights Variation': [
    ['Nc3, the Two Knights. Only about one master in fourteen plays it; most push d4. They hold the d-pawn back and develop first, and the knight already guards e4 and covers d5, the square your next move wants.', 'Nc3 — the Two Knights, pieces first.'],
    ['…d5, nearly every master: the same strike as always. The pawn hits e4, which the knight guards, and the c6 pawn backs it up. The Caro works without their d-pawn on d4 too.', '…d5 — hits e4 anyway.'],
    ['Nf3, eight masters in ten: the second knight, and that\'s the Two Knights. d4 now would turn it straight back into the main line. With both knights out and the d-pawn at home, e4 is held. So where does your light-squared bishop go?', 'Nf3 — both knights out.'],
    ["…Bg4, more than half the masters: the bishop comes out with a pin. It hits the knight on f3, and that knight can't move without exposing their queen on d1. Same Caro rule as ever: the bishop gets out before …e6.", '…Bg4 — pins the knight on f3.'],
    ['h3, nine masters in ten: they ask the bishop right away. It has no guard on g4, so it must decide now: take the knight, or keep the pin with …Bh5.', 'h3 — asks the bishop on g4.'],
    ["…Bxf3, nearly nine masters in ten. Why hand over the bishop? Retreating to h5 rates far worse here: after exd5 and g4, it gets chased again. And with your pawns about to stand on c6, d5 and e6, all light squares, this bishop matters less than usual.", '…Bxf3 — trade it before g4 chases.'],
    ['Qxf3, every master: the queen takes back and already hits f7, though your king guards it. They have the two bishops now. Your answer is a solid pawn wall, and it goes up next move.', 'Qxf3 — the queen hits f7.'],
    ['…e6, three masters in four: d5 now has two pawns behind it, c6 and e6, and your bishop on f8 is free. It\'s a sturdy wall, and you develop calmly behind it.', '…e6 — d5 doubly guarded, f8 free.'],
    ['Be2, the masters\' most common choice here, but only about three in ten; d3 and d4 are close behind. The bishop develops and clears the way to castle.', 'Be2 — develops, castling next.'],
    ['…Nf6, the masters\' most common move, nearly four in ten: the knight develops and hits e4, which their knight and queen guard. Nothing falls, but both of those pieces are now tied to that pawn.', '…Nf6 — develops, hits e4.'],
    ["They castle, and their king is safe. Their centre is still just one pawn on e4, and d4, backing it up, is the move they'll want next.", 'O-O — their king is safe.'],
    ['…Nbd7: your last knight develops and backs up the one on f6. Now the question is e4, because their d-pawn is about to arrive.', '…Nbd7 — backs up the f6 knight.'],
    ["d4, the engine's first choice: now their centre is e4 and d4. What do you do with all that tension on e4? Release it on your terms: take.", 'd4 — they claim the centre.'],
    ["…dxe4, the engine's first choice: the pawn takes and hits their queen on f3. They can't ignore it, so they take back with the knight, and the trades begin on e4.", '…dxe4 — takes, hits the queen.'],
    ["Nxe4, the engine's first choice: the knight takes back and hits your knight on f6. Nothing hangs: f6 is guarded three times. So which way do you go? With less space, you usually want trades.", 'Nxe4 — hits your knight on f6.'],
    ['…Nxe4: you trade, and their queen has to take back on e4. Your knight on d7 is ready to jump to f6 next and hit it again.', '…Nxe4 — trade the knights.'],
    ["Qxe4, the engine's first choice: the queen takes back in the centre, hits c6 and h7, and pins your e6 pawn to your king on e8. A little uncomfortable, but you have a move that develops and hits the queen at once.", 'Qxe4 — the queen pins e6.'],
    ['…Nf6, and it comes with a hit: the knight attacks their queen on e4, so the queen has to move again. That\'s a free move for you to bring out your last piece, the bishop on f8.', '…Nf6 — hits the queen, gains time.'],
    ['Qd3: the queen retreats to d3, where it backs up d4 and looks down the diagonal at h7. Nothing is threatened yet. Your job is to finish developing.', 'Qd3 — retreats, guards d4.'],
    ["…Be7, the engine's first choice: modest, but solid. …Bd6 looks more active and rates lower. One more move and your king is safe.", '…Be7 — solid, castle next.'],
    ['c4: the pawn takes d5 away from your pieces and gains space on the queenside. They are a little better.', 'c4 — space, and d5 covered.'],
    ["…O-O, and your king is safe. Two pairs of minor pieces are gone, and they have the bishop pair, but your wall stands and nothing of yours is loose. Your plan: the queen to c7 or b6, a rook to d8, and pressure on d4, which no pawn guards.", '…O-O — then pressure on d4.'],
  ],
  'Panov-Botvinnik Attack': [
    ['exd5: they release the tension, about one master in five. The engine prefers the Advance, e5. The question now is how you take back, and the answer is the other half of …c6.', 'exd5 — they trade in the centre.'],
    ["…cxd5, every master: the c-pawn takes back and you keep a pawn on d5. That's the other job of …c6: if they ever trade on d5, a pawn steps in. Taking with the queen rates far worse: Nc3 would hit it.", '…cxd5 — a pawn stays on d5.'],
    ["c4, the Panov, and more than half the masters choose it. The pawn hits d5, and it changes the game: if pawns get traded on d5, their d4 pawn is left with no pawn beside it on the c- or e-file. That isolated pawn is the whole story of the Panov. It gives them space and open lines, and it gives you a target.", 'c4 — the Panov, hits d5.'],
    ['…Nf6, nearly every master: the knight develops and adds a guard to d5, so the pawn holds for now.', '…Nf6 — develops, guards d5.'],
    ['Nc3, nearly every master: a second attacker on d5. Count it: their c4 pawn and knight hit it, your knight and queen guard it. Two against two, so it holds.', 'Nc3 — a second attacker on d5.'],
    ['…e6, about half the masters: a pawn now backs up d5, and your bishop on f8 can come out. The engine prefers …Nc6, getting a piece into play first. It\'s about level.', '…e6 — guards d5, frees f8.'],
    ["Nf3, more than nine masters in ten, and the engine's first choice: the knight develops and guards d4, the pawn that matters most in this structure.", 'Nf3 — develops, guards d4.'],
    ["…Bb4, six masters in ten, and the engine's first choice: the bishop pins the knight on c3 to their king. Why there? That knight is one of the two pieces hitting d5, and pinned, it can't take part. …Be7 rates just as well and is the quieter road.", '…Bb4 — pins the knight on c3.'],
    ['cxd5, about two masters in three: the pawns come off on d5, and you choose how to take back. Here\'s the whole structure in one decision. Take with the e-pawn, and you have an isolated pawn of your own on d5. Take with the knight, and theirs on d4 is the only one.', 'cxd5 — how do you take back?'],
    ["…Nxd5, nearly nine masters in ten, and the engine's first choice: the knight takes back and lands on d5, right in front of their isolated pawn. That's the blockade square: the pawn can't advance past it, and with no c- or e-pawn left, no pawn of theirs can ever kick your knight off d5. It also piles onto the pinned knight on c3.", '…Nxd5 — blockade in front of d4.'],
    ['Bd2, nearly two masters in three: the bishop adds a guard to the pinned knight, so c3 holds. Qc2 is the other try, about a third.', 'Bd2 — guards the pinned knight.'],
    ["…Nc6, three masters in four: the knight hits the isolated pawn on d4. That's how you play against it: blockade it with one piece and hit it with the others.", '…Nc6 — hits the pawn on d4.'],
    ["Bd3, the engine's first choice: the bishop develops toward your king and aims at h7. That's what the isolated pawn gives them: open lines and active pieces. They want to attack, and you want to trade.", 'Bd3 — aims at h7.'],
    ['…O-O: your king goes to safety. The bishop on d3 points at h7, but your king guards it now and nothing else joins the attack yet.', '…O-O — king safe.'],
    ["They castle, the engine's first choice. Now look at your bishop on b4: is it doing anything? With their king off e1, the pin on c3 is gone, and the bishop stands a long way from d4.", 'O-O — the pin on c3 is gone.'],
    ['…Be7: so the bishop comes home, closer to your king and ready to step to f6, where it would join the pressure on d4.', '…Be7 — back home, f6 next.'],
    ['a3: a quiet move that takes b4 away from your knights. The engine prefers Nxd5, trading on d5 first. It\'s about level.', 'a3 — takes b4 away.'],
    ["…Bf6, the engine's first choice: the bishop takes the long diagonal and hits d4. Count it now: two attackers, the knight on c6 and the bishop, and one guard, the knight on f3. Their next move has to look after that pawn.", '…Bf6 — two hits on d4.'],
    ['Be3 guards d4 a second time, but it puts the bishop where your knight on d5 can take it. The engine prefers Nxd5, trading that knight off first. It\'s about level.', 'Be3 — guards d4; Nxd5 was better.'],
    ['…Nce7: the knight from c6 steps back to e7, where it backs up your knight on d5. From e7 it can also go to f5, hitting d4 and e3 from the other side.', '…Nce7 — backs up d5, eyes f5.'],
    ["Ne4: the knight hits your bishop on f6, the piece that was pressing d4. Do you have to move it? No: the g7 pawn guards it, and if pieces come off, that suits you. Every trade makes an isolated pawn weaker.", 'Ne4 — hits the bishop on f6.'],
    ["…b6, the engine's first choice, and it answers the last question. Your bishop on c8, shut in behind e6: where does it go? b7, on the long diagonal, right behind your knight on d5.", '…b6 — the bishop heads for b7.'],
    ['Qe2: the queen leaves d1, and now their rooks see each other. The next step is a rook to d1, on the isolated pawn\'s file.', 'Qe2 — connects the rooks.'],
    ["…Bb7, the engine's first choice: every piece is out, the bishop sits behind the knight on d5, and the blockade holds. It's about level. Your plan: a rook to c8 on the open c-file, keep the knight on d5, and trade pieces whenever you can, because the fewer pieces on the board, the weaker their pawn on d4 becomes.", '…Bb7 — blockade, c-file, trade down.'],
  ],
  'Fantasy Variation': [
    ['f3, the Fantasy: instead of trading or pushing, they guard e4 with a pawn. Only about three masters in a hundred play it, and the engine prefers e5. The price is their king\'s safety: with the f-pawn gone from f2, the diagonal from h4 to e1 is open.', 'f3 — the Fantasy, guards e4.'],
    ["…dxe4, about one master in five: you take, knowing the f-pawn takes back. The engine prefers …e6, the choice of about half the masters, keeping d5 solid. After …dxe4 they are a little better. So why play it? Because of your next move.", '…dxe4 — take; …e6 was stronger.'],
    ['fxe4, nearly every master: the pawn takes back and they have the full centre, e4 and d4, with the f-file half-open for their rook. Taking with the knight instead rates far worse. So how do you hit that centre?', 'fxe4 — full centre, open f-file.'],
    ["…e5, every master, and there's the point of taking on e4: the pawn hits d4 at once. It looks loose on e5, but if they take it, …Qh4 check comes down the diagonal f3 opened. Block with g3, and the queen takes e4 with check.", '…e5 — strike d4 right away.'],
    ['Nf3, nearly every master: the knight develops, hits e5 and covers h4, so that queen check is off. Now e5 is attacked twice and guarded by nothing. Something has to give.', 'Nf3 — hits e5, covers h4.'],
    ["…Bg4, about six masters in ten: rather than defend e5, you pin the knight that hits it. The knight can't take on e5 now without giving up the queen on d1 behind it. It's about level.", '…Bg4 — pins the knight on f3.'],
    ['Bc4: the bishop aims at f7, the weak spot beside your king, guarded only by the king itself. The engine prefers Nbd2, giving the pinned knight a guard first. It\'s about level.', 'Bc4 — aims at f7.'],
    ["…Nd7, the engine's first choice: the knight finally guards e5, and it covers f6 for your other knight. Pulling the bishop back to h5 instead rates far worse.", '…Nd7 — guards e5, covers f6.'],
    ["They castle, but it's slow: the engine prefers h3 first, asking your bishop the question. Meanwhile their e4 pawn has no guard, and your next move goes after it. It's about level.", 'O-O — slow; h3 was better.'],
    ["…Ngf6, the engine's first choice: your last knight comes out and hits e4, which nothing guards. That big centre is starting to look like a pair of targets.", '…Ngf6 — hits the loose e4 pawn.'],
    ["c3, the engine's first choice: a pawn props up d4, so if you ever take on d4, they take back with a pawn and keep their centre.", 'c3 — props up d4.'],
    ["…Bd6, the engine's first choice: the bishop develops and guards e5 a second time, and your king is one move from safety.", '…Bd6 — guards e5, castle next.'],
    ['Nbd2: at last the knight guards e4 and backs up the pinned knight on f3. The engine prefers Be3, developing the other bishop. It\'s about level.', 'Nbd2 — guards e4 and f3.'],
    ["…O-O, the engine's first choice, and your king is safe. Notice one thing, though: the bishop on c4 now pins your f7 pawn to the king on g8, so that pawn can't move while the bishop stays there.", '…O-O — safe, but f7 is pinned.'],
    ['Qe1: the queen steps off d1, so the knight on f3 is no longer pinned, and from e1 it can swing to h4, toward your king. But it\'s slow. The engine prefers a4, and after Qe1 you are a little better.', 'Qe1 — unpins f3; a4 was better.'],
    ["…Re8, the engine's first choice: the rook backs up e5, and you are a little better. Your plan: keep e5 solid, tuck the bishop back to h5, then take on d4 and hit their centre again with …c5.", '…Re8 — backs up e5, then …c5.'],
  ],
  'Exchange Variation': [
    ["Bd3, about a third of the masters and the engine's first choice: the bishop covers f5, so your light-squared bishop can't come out there. That's the Exchange's idea: take away the Caro's favourite square.", 'Bd3 — takes f5 from your bishop.'],
    ["…Nc6, more than eight masters in ten: the knight develops with a hit on d4, and nothing guards that pawn, because their bishop on d3 blocks the queen's file. So they have to deal with it right away.", '…Nc6 — hits the loose d4 pawn.'],
    ["c3, every master: a pawn guards d4, and it takes b4 away from your knight.", 'c3 — guards d4, covers b4.'],
    ["…Nf6, about half the masters and the engine's first choice: your king's knight develops, covering e4 and g4. Remember, f5 is off-limits for your bishop. g4 isn't.", '…Nf6 — develops, covers g4.'],
    ['Bf4, about two masters in three, and the engine\'s first choice: their dark-squared bishop comes out before any e3, toward c7 and b8. The same trick the Caro plays with its own bishop.', 'Bf4 — active bishop, outside the chain.'],
    ["…Bg4, three masters in four, and the engine's first choice: f5 was taken, so the bishop comes out on g4 instead, with a hit on their queen on d1. They have to answer it.", '…Bg4 — out anyway, hits the queen.'],
    ["Qb3, nine masters in ten, and the engine's first choice: the queen steps away and hits two pawns at once, b7 and d5. Here's the catch: your bishop left c8, so b7 lost its guard.", 'Qb3 — hits b7 and d5.'],
    ["…Qd7, close to half the masters and the engine's first choice: the queen guards b7 along the seventh rank, and it also backs up your bishop on g4. …Qc8 is the other main answer, about a third.", '…Qd7 — guards b7 and g4.'],
    ['Nd2, nearly every master: the knight develops and keeps an eye on e4 and f3. Their kingside knight still has to come out, and f3 is where it will land.', 'Nd2 — develops, covers e4.'],
    ["…e6, the engine's first choice: with your bishop already outside on g4, …e6 costs nothing. The pawn guards d5 and frees your bishop on f8.", '…e6 — guards d5, frees f8.'],
    ["Ngf3, the engine's first choice: their last minor piece comes out, right in front of your bishop on g4. You can take it whenever it suits you, but there's a more useful trade first.", 'Ngf3 — develops, into your bishop\'s path.'],
    ["…Bd6, the engine's first choice: bishop against bishop, and theirs on f4 has no guard, so they have to decide right now. Trade, or step back?", '…Bd6 — challenges the loose f4 bishop.'],
    ['Bxd6: they take, a move the engine rates close to the best, and your queen takes back.', 'Bxd6 — the bishops come off.'],
    ["…Qxd6, the engine's first choice: the queen takes back and eyes h2. But see what moved: the queen no longer guards b7, and their queen on b3 hits it. Keep that pawn in mind.", '…Qxd6 — eyes h2; b7 is loose.'],
    ["They castle, the engine's first choice, and their king is safe. The position is close to symmetrical, and b7 is still the one loose pawn on the board.", 'O-O — their king is safe.'],
    ["…O-O, the engine's first choice: your king is safe too. Now the question is b7: it still has no guard. Can you fix that and make the move useful at the same time?", '…O-O — and b7 still needs care.'],
    ["Rfe1, the engine's first choice: the rook takes the e-file, lines up on your e6 pawn and backs up a knight jump to e5.", 'Rfe1 — the e-file, eyes e5.'],
    ["…Rab8, the engine's first choice, and it solves b7 in style. The rook guards it and stands behind your b-pawn, ready to back up …b5. Two pawns against three on the queenside, pushed at their c3 pawn: that's the minority attack, the classic plan in this structure.", '…Rab8 — guards b7, prepares …b5.'],
    ["Ne5, the engine's first choice: the knight lands on e5 and hits three things, your knight on c6, the f7 pawn and the bishop on g4. Everything is guarded, but that knight would happily trade itself for your bishop.", 'Ne5 — hits c6, f7 and g4.'],
    ['…Bh5: the bishop steps out of the knight\'s reach. From h5 it has a plan: g6, where it would face their bishop on d3.', '…Bh5 — out of the knight\'s reach.'],
    ['a4, rated as high as anything here: the pawn takes b5 away, so your …b5 now needs more preparation. That\'s prophylaxis: they stop your plan before it starts.', 'a4 — takes b5 away from you.'],
    ["…Bg6 offers to trade the light-squared bishops, but the engine prefers …Nd7, challenging their knight on e5 first. After …Bg6 they are a little better. Your plan: take back on g6 with the h-pawn if they trade, push their knight off e5 with …Nd7, and prepare …b5 with …a6.", '…Bg6 — offers a trade; …Nd7 was better.'],
  ],
  'Tartakower/Breyer Variation': [
    ['…Nf6, about one master in five: the Tartakower. The knight hits the knight on e4, which has no guard, and the engine rates it level with …Bf5. The catch: if they take on f6, one of your pawns has to take back, and your structure changes. You accept that on purpose.', '…Nf6 — the Tartakower, hits e4.'],
    ['Nxf6 check, nineteen masters in twenty: they take with check, and a pawn has to take back. Which one?', 'Nxf6+ — a pawn must take back.'],
    ["…exf6, about two masters in three, and the engine's first choice: the e-pawn takes, and you accept doubled f-pawns. What do you get for them? The e-file opens for your rook, and both your bishops have free roads. Taking with the g-pawn rates far worse.", '…exf6 — doubled pawns, open e-file.'],
    ["c3, about seven masters in ten, and the engine's first choice: a pawn guards d4 and takes b4 away from your bishop, so a check on b4 is off.", 'c3 — guards d4, covers b4.'],
    ['…Bd6, nine masters in ten: the bishop takes the open diagonal toward h2, aimed at their kingside. The engine slightly prefers …g6. They are a little better.', '…Bd6 — aims at h2.'],
    ["Bd3, every master, and the engine's first choice: their bishop mirrors yours and aims at h7. Both sides now point a bishop at the other's king.", 'Bd3 — mirrors you, aims at h7.'],
    ["…O-O, nine masters in ten, and the engine's first choice. Your king is safe, and here's one plus of the doubled pawns: the pawn on f6 covers e5 and g5, so their pieces can't settle there. Next, a rook to the open e-file.", '…O-O — safe; e-file next.'],
    ['Qc2, about two masters in three: the queen lines up behind the bishop on d3, both aimed at h7. That\'s a battery, and h7 is guarded only by your king. How do you meet it? With a check first.', 'Qc2 — a battery aimed at h7.'],
    ["…Re8 check, more than eight masters in ten, and the engine's first choice: the rook takes the open e-file with check, while their king still sits in the centre. They have to block.", '…Re8+ — check down the open e-file.'],
    ["Ne2, the engine's first choice: the knight blocks the check, and now it's pinned to their king on e1. Until that king moves, the knight is stuck.", 'Ne2 — blocks, and it\'s pinned.'],
    ['…h5: the pawn steps off h7, out of the battery\'s line, and grabs space, taking g4 away from their pieces. …h6 rates a touch higher, but the idea is the same: no target on h7.', '…h5 — off the battery\'s line.'],
    ['Be3, rated close to castling short: the bishop develops, guards d4 and clears c1, so their king can go either way.', 'Be3 — develops, long castling ready.'],
    ["…Nd7, the engine's first choice: your last minor piece comes out. Where is it going? Not f6, your own pawn is there. It goes d7, then f8, a quiet road to your kingside, where it will guard h7 and g6.", '…Nd7 — heading for f8.'],
    ["They castle long, the engine's first choice, and the kings sit on opposite wings. That usually means a race, each side's pawns marching at the other king. Your h-pawn already has a head start.", 'O-O-O — opposite kings, a race.'],
    ['…Nf8 completes the knight\'s trip: it guards h7 and g6 in front of your king. But the engine prefers …b5, starting the queenside race at once. They are a little better.', '…Nf8 — guards h7; …b5 was stronger.'],
    ['Kb1, about as good as anything here: the king steps off the c-file and tucks in beside a2, which it now guards. Prophylaxis again, the same move as in the main line.', 'Kb1 — king tucked away.'],
    ["…Be6, the engine's first choice: your last piece develops and aims all the way down to a2, toward their king. The king guards a2, so nothing falls, but the diagonal points where you want to attack.", '…Be6 — aims at a2.'],
    ["c4, the engine's first choice: the pawn grabs space and cuts your bishop's diagonal to a2 at c4. Now the c4 pawn is the point of contact.", "c4 — blocks your bishop's diagonal."],
    ["…Rc8, rated about level with the best: the rook comes to the c-file, the road toward their king on b1. They are a little better. Your plan: …a6 and …b5 to hit c4 and open lines there, while the f6 pawn and the knight on f8 keep your own king safe.", '…Rc8 — then …a6 and …b5.'],
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

export const CARO_KANN_WATCH: WatchCourse = {
  openingId: 'caro-kann',
  title: 'The Caro-Kann Defence — A Master Class',
  orientation: 'black',
  sources: ['book:caro-kann', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
