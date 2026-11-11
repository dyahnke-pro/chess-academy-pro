// Semi-Slav Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=semi-slav`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. Said in the think-out-loud register (docs/OPENING-WATCH-BEATS.md).
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'Bg5', 'h6', 'Bh4', 'dxc4', 'e4', 'g5', 'Bg3', 'b5', 'Be2', 'Bb7', 'O-O', 'Nbd7', 'Ne5', 'Bg7', 'Nxd7', 'Nxd7', 'Bd6', 'a6', 'a4', 'b4', 'Bxb4', 'Qb6', 'Ba3', 'Qxd4', 'Qc2', 'c5', 'Rad1', 'Qe5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — they start with the queen's pawn: it takes the center and opens a diagonal for the bishop on c1. Everything you do in this opening is an answer to this pawn, and over the next few moves you build a wall against it on c6, d5 and e6.", 'd4 — center pawn, frees the c1-bishop.'],
  ["…d5 — the direct answer: meet the pawn head-on and take your share of the center. Most masters start with …Nf6, but about a quarter go …d5 at once, and notice what it does right away: the pawn covers e4, so their e-pawn can't simply join it there.", '…d5 — your share of the center.'],
  ["c4 — the Queen's Gambit, the choice of about three masters in four. The pawn hits d5 from the side, and look, it has no guard of its own. So do you grab it? Not yet. First you decide how d5 is going to be held.", 'c4 — the Queen\'s Gambit, hits d5.'],
  ["…c6 — and here's your answer: a second pawn behind d5. If they ever take on d5, the c-pawn takes back and you keep a pawn in the middle. About half of masters choose this, with …e6 next in line. File one more idea away: from c6 the pawn also prepares …b5 one day, against their c4 pawn.", '…c6 — backs up d5, Slav style.'],
  ["Nf3 — natural development, played by two masters in three. The knight covers e5, a square your pieces might want. And notice what it doesn't do: their c4 pawn still has no guard.", 'Nf3 — develops, covers e5.'],
  ["…Nf6 — about nine masters in ten play it, and it does two jobs at once. The knight covers e4, so their e-pawn stays back, and it adds another guard to d5.", '…Nf6 — develops, covers e4 and d5.'],
  ["Nc3 — the second knight comes out, and now d5 is hit twice, by the c4 pawn and the knight. It also backs up e4, the push they would love to make. A little over half of masters choose it.", 'Nc3 — second hit on d5, backs e4.'],
  ["…e6 — and this is the Semi-Slav. Pawns on c6, d5 and e6: d5 is guarded from both sides, and the diagonal opens for your bishop on f8. So what's the catch? Look at your bishop on c8. The pawn on e6 now sits on its diagonal, so it's shut in for now, and a lot of this opening is about letting that bishop out. Half of masters choose …e6; the other main try is …dxc4, which the engine likes a shade better.", '…e6 — the Semi-Slav wall: c6, d5, e6.'],
  ["Bg5 — just under half of masters play it, about as many as play e3. The bishop pins your knight on f6 to your queen on d8. But notice what they haven't done: their c4 pawn still has no guard, and the next few moves turn on that pawn.", 'Bg5 — pins your knight to the queen.'],
  ["…h6 — ask the bishop right away: take on f6, or step back? About six masters in ten put the question first. Why not grab on c4 now? Because it isn't going anywhere. The question to the bishop comes first, and the pawn after.", '…h6 — take on f6, or retreat?'],
  ["Bh4 — they keep the pin, as six masters in ten do; the other four take on f6, and that is the Moscow tab. But look where the bishop stands now: out on the rim on h4, where a pawn on g5 could reach it. Remember that square.", 'Bh4 — keeps the pin, from the rim.'],
  ["…dxc4 — now you take, and nine masters in ten agree. This is the Anti-Moscow Gambit: you are a pawn up, they get time and the center, and your plan is to hold c4 with …b5. They are a little better for now, but the extra pawn is real.", '…dxc4 — grab the pawn, hold it later.'],
  ["e4 — almost every master plays it: the big center, and their bishop on f1 now looks at your c4 pawn. Tempted to take on e4 with the knight? Look again. It's pinned, and …Nxe4 drops your queen to Bxd8.", 'e4 — big center; …Nxe4 drops the queen.'],
  ["…g5 — remember the bishop on the rim? Here's why it mattered. The pawn hits it, and it steps between the bishop and your knight, so the pin is gone. Almost every master plays this: you gain space on the kingside and keep the extra pawn on c4.", '…g5 — hits the h4 bishop, frees the knight.'],
  ["Bg3 — the bishop drops back to a long diagonal, where it eyes your knight on b8. Now count your c4 pawn: their bishop on f1 hits it, and nothing of yours guards it. Developing with …Nbd7 would let Bxc4 win it back, so the pawn needs a guard first.", 'Bg3 — retreats, eyes b8.'],
  ["…b5 — and there's the guard. The pawn holds c4 and grabs space on the queenside. What about kicking the knight with …g4? Tempting, but after Ne5 and h3 the g4 pawn falls, so it's too early.", '…b5 — guards c4, grabs queenside space.'],
  ["Be2 — the bishop develops, clears the way to castle and lines up on c4. That is exactly why …b5 had to come first.", 'Be2 — develops, castling next.'],
  ["…Bb7 — remember the bishop that …e6 shut in? Here it finds a home. Right now your c6 pawn blocks it, but the moment that pawn moves, the bishop looks straight down the long diagonal at their e4 pawn.", '…Bb7 — waits behind c6 for the diagonal.'],
  ["Castle. Their king is tucked away and the rook comes to f1. The engine slightly prefers h4 first, to put the question to your g5 pawn, but after castling the game is still about level.", 'O-O — their king is safe.'],
  ["…Nbd7 — the last minor piece comes out, and look at the squares it covers: e5 and c5. Why those two? Because Ne5 is their main idea, and …c5 is the break that will free your bishop on b7.", '…Nbd7 — covers e5 and c5.'],
  ["Ne5 — and here it is, the engine's first choice. The knight lands in the center and hits a lot at once: your c4 and c6 pawns, your knight on d7 and the pawn on f7.", 'Ne5 — hits c4, c6, d7 and f7.'],
  ["…Bg7 — where does this bishop belong? On g7, right behind your knight on f6. It's blocked for now, but as soon as that knight moves, the bishop stares down the long diagonal at their knight on e5. And with the bishop out, your king can castle.", '…Bg7 — behind the f6 knight, castling next.'],
  ["Nxd7 — they trade knights before you can trade on e5 yourself. The knight on d7 now hits your knight on f6, so the question is simple: how do you take back?", 'Nxd7 — trades knights; how to recapture?'],
  ["…Nxd7 — you take back with the knight, and notice what that does: f6 clears, and your bishop on g7 now looks straight down the long diagonal at their d4 pawn. The engine prefers …Qxd7, keeping the knight on f6; after …Nxd7 they are a little better.", '…Nxd7 — opens the g7 bishop\'s diagonal.'],
  ["Bd6 — the engine's top choice, and a real outpost. Can any pawn of yours ever chase the bishop from d6? No: that would take a pawn on c7 or e7, and those are gone. From d6 it covers f8, so your king can't castle short, and it covers b4 as well.", 'Bd6 — an outpost; no short castling now.'],
  ["…a6 — quiet, but think about why. A natural move like …Rc8 runs into e5: after …c5, their knight takes on b5 and wins a pawn, because only the c6 pawn was guarding it. So you give b5 a second guard first.", '…a6 — second guard on b5.'],
  ["a4 — they hit your b5 pawn and try to break up the chain. The engine prefers e5, shutting your bishop on g7 off the long diagonal; after a4 the game is about level.", 'a4 — hits b5; e5 was stronger.'],
  ["…b4 — your answer: push on and hit the knight on c3. Yes, their bishop on d6 can take it, so this hands the extra pawn back. But on your terms: the capture costs them time, and …Qb6 next hits both that bishop and their d4 pawn.", '…b4 — hits the knight; the pawn returns.'],
  ["Bxb4 — material is level again. The engine prefers d5, breaking open the center first; after Bxb4 the game is about level. And look what that capture left behind: the bishop on b4 has no guard.", 'Bxb4 — level, but b4 is unguarded.'],
  ["…Qb6 — and there's the point of …b4. The queen hits two things at once: the bishop on b4, which has no guard, and their d4 pawn. Something slower like …Qc7 would let Bxc4 grab your c4 pawn as well.", '…Qb6 — hits the bishop and d4.'],
  ["Ba3 — the bishop escapes, and from a3 it still covers f8, so castling short stays off for you. But count the d4 pawn: your queen and your bishop on g7 both hit it, and only their queen guards it.", 'Ba3 — escapes; d4 is short of guards.'],
  ["…Qxd4 — so you take it, and you are a pawn up again. From d4 your queen hits their knight on c3 and the e4 pawn. And if they trade queens on d4? Your bishop on g7 takes back.", '…Qxd4 — center pawn, a pawn up.'],
  ["Qc2 — the queen steps off the d-file and guards the knight on c3 a second time. Why leave d1? So that Rad1 can come next with a hit on your queen. The engine prefers a5; after Qc2 the game is about level.", 'Qc2 — guards c3, clears d1 for a rook.'],
  ["…c5 — and the bishop on b7 wakes up. The pawn steps off c6, so the long diagonal now runs straight to their e4 pawn, and on c5 the pawn also guards your queen on d4.", '…c5 — frees the b7 bishop, guards d4.'],
  ["Rad1 — the rook arrives with a hit on your queen on d4, the piece guarding your c4 pawn. And grabbing on f2 instead doesn't work: Rxf2 simply takes your queen.", 'Rad1 — hits your queen on d4.'],
  ["…Qe5 — where does the queen go? To e5, a central square where nothing of theirs can hit it, and from there it still eyes their knight on c3 and the pawns on e4 and h2. They will win back your c4 pawn with Bxc4, and the game is about level. Your plan from here: castle short once their bishop leaves the a3–f8 diagonal, and keep your bishop on b7 aimed down the long diagonal through e4 at their king.", '…Qe5 — safe square, hits c3 and e4.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });


/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Meran Variation Deeper': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'dxc4', 'Bxc4', 'b5', 'Bd3', 'Bb7', 'O-O', 'a6', 'e4', 'c5', 'd5', 'Qc7', 'dxe6', 'fxe6', 'Bc2', 'Bd6', 'Ng5', 'Nf8', 'Qf3'],
  'Botvinnik Variation Deep': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'Bg5', 'dxc4', 'e4', 'b5', 'e5', 'h6', 'Bh4', 'g5', 'Nxg5', 'hxg5', 'Bxg5', 'Nbd7', 'exf6', 'Bb7', 'g3', 'c5', 'd5', 'Qb6', 'Bg2', 'O-O-O', 'O-O', 'b4', 'Na4', 'Qa6'],
  'Anti-Meran Bd3 Line': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'dxc4', 'Bxc4', 'b5', 'Bd3', 'a6', 'e4', 'c5', 'e5', 'cxd4', 'Nxb5', 'axb5', 'exf6', 'gxf6', 'O-O', 'Qb6', 'Qe2', 'Bb7', 'Rd1', 'Rg8'],
  'Stoltz Qc2 Variation': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Qc2', 'Bd6', 'Bd3', 'O-O', 'O-O', 'dxc4', 'Bxc4', 'b5', 'Bd3', 'Bb7', 'e4', 'e5', 'dxe5', 'Nxe5', 'Nxe5', 'Bxe5', 'f3'],
  'Moscow Variation Bxf6': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'Bg5', 'h6', 'Bxf6', 'Qxf6', 'e3', 'Nd7', 'Bd3', 'dxc4', 'Bxc4', 'g6', 'O-O', 'Bg7', 'e4', 'e5', 'd5', 'O-O', 'Bb3'],
  'Reynolds Variation': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'Bd6', 'O-O', 'O-O', 'e4', 'dxe4', 'Nxe4', 'Nxe4', 'Bxe4', 'Nf6', 'Bc2', 'c5', 'dxc5', 'Bxc5', 'Bg5', 'h6', 'Bh4', 'b6'],
  'Romih ...Bd6 System': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'Bd6', 'O-O', 'O-O', 'Qc2', 'dxc4', 'Bxc4', 'b5', 'Bd3', 'Bb7', 'a3', 'a6', 'e4', 'e5'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Meran Variation Deeper': [
    ["e3 — the quiet road, chosen by about four masters in ten and the engine's top choice. Instead of pinning, they back up d4 with a pawn, and now the bishop on f1 guards c4. Take there, and the bishop simply takes back.", 'e3 — solid, guards d4, frees the bishop.'],
    ["…Nbd7 — nine masters in ten develop here. Why d7? From there the knight covers e5 and c5, the two squares your center pawns want for their breaks, …e5 and …c5.", '…Nbd7 — backs …e5 and …c5.'],
    ["Bd3 — the bishop comes out toward your h7 pawn and clears the way to castle. About a third of masters play it; most prefer Qc2 first, and that has its own tab.", 'Bd3 — aims at h7, castling next.'],
    ["…dxc4 — and now the timing makes sense. Their bishop just spent a move going to d3, and taking on c4 forces it to move again to take back. Then …b5 chases it a third time. More than eight masters in ten take here.", '…dxc4 — the bishop must move again.'],
    ["Bxc4 — every master takes back, and material is level. From c4 the bishop eyes your e6 pawn, but look where it's standing: right where your b-pawn can reach it.", 'Bxc4 — level again; …b5 is coming.'],
    ["…b5 — here's the move this whole setup is built for. The pawn hits the bishop on c4, so you gain a tempo, it grabs space on the queenside, and it clears b7 for your light-squared bishop. Almost every master plays it.", '…b5 — hits the bishop, room for …Bb7.'],
    ["Bd3 — the bishop goes back to d3, as eight masters in ten choose. It's aimed at your h7 pawn again, and now it hits b5 too, together with the knight on c3.", 'Bd3 — back to d3, aims at h7.'],
    ["…Bb7 — half of masters develop the bishop now; about three in ten play …a6 first, and that line has its own tab. The bishop waits behind your c6 pawn, and the long diagonal opens the moment that pawn moves.", '…Bb7 — waits for …c5 to open.'],
    ["Castle. About half of masters tuck the king away here, and e4 is next on their list: the big center push.", 'O-O — king safe, e4 next.'],
    ["…a6 — eight masters in ten play it, and it prepares your break. Ask yourself: what happens to b5 after …c5? The c-pawn no longer guards it. So the a-pawn takes over that job first.", '…a6 — guards b5 before …c5.'],
    ["e4 — eight masters in ten push now and build a big center. What do they want next? e5, kicking your knight off f6.", 'e4 — big center, e5 next.'],
    ["…c5 — the break you prepared. The pawn hits d4, and look at your bishop on b7: with c6 gone, it sees all the way to their e4 pawn. If they take on c5, your knight on d7 takes back.", '…c5 — hits d4, opens the b7 bishop.'],
    ["d5 — more than nine masters in ten push past. The pawn hits your e6 pawn and plants itself in front of your bishop on b7, cutting the long diagonal again.", 'd5 — hits e6, blocks the b7 bishop.'],
    ["…Qc7 — seven masters in ten play it. Why the queen? It covers e5, so their pawn can't come there to kick your knight on f6, and it looks down the diagonal at h2. …c4, kicking the bishop first, is the other main move and the engine's slight choice.", '…Qc7 — stops e5, eyes h2.'],
    ["dxe6 — they take, and the pawn on e6 hits your knight on d7. With both d-pawns gone, the d-file is now open.", 'dxe6 — opens the d-file, hits d7.'],
    ["…fxe6 — do you have a choice? Not really. Move the knight with …Ne5 and their pawn takes on f7 with check. So the f-pawn takes back: your e6 pawn is now isolated, but the f-file is half-open for your rook.", '…fxe6 — forced; e6 isolated, f-file half-open.'],
    ["Bc2 — why step back now? Because …c4 was coming to hit the bishop on d3. On c2 it's safe, and it guards e4, which your bishop on b7 and your knight on f6 both hit.", 'Bc2 — dodges …c4, guards e4.'],
    ["…Bd6 — the bishop develops toward h2, clears the way to castle and makes room on f8 for a rook. And notice the battery: your queen on c7 sits right behind the bishop on the same diagonal.", '…Bd6 — aims at h2, ready to castle.'],
    ["Ng5 — the knight jumps at the weak spot. Your e6 pawn has no pawn left to guard it, and from g5 the knight hits it, and h7 as well.", 'Ng5 — goes after the loose e6 pawn.'],
    ["…Nf8 — the knight drops back and guards both e6 and h7. What about grabbing h2 with the bishop, with check? It looks tempting, but after Kh1 their knight takes on e6 and then on g7, and they come out a pawn ahead.", '…Nf8 — guards e6 and h7.'],
    ["Qf3 — the queen hits your knight on f6, but look what it walks into: your bishop on b7 now pins their e4 pawn to the queen. f4 was much stronger; after Qf3 you are a little better. Your plan from here: take on h2 with the bishop, with check, since your queen on c7 backs it up, then castle queenside and keep leaning on that pinned e4 pawn.", 'Qf3 — a slip; …Bxh2 check is on.'],
  ],
  'Botvinnik Variation Deep': [
    ["…dxc4 — no …h6 first: you grab the pawn while their bishop is still on g5. About one master in six chooses this, and it starts the Botvinnik, where a knight sacrifice on g5 is only a few moves away. The engine prefers …h6 first; after …dxc4 they are a little better.", '…dxc4 — the Botvinnik: grab c4 now.'],
    ["e4 — about nine masters in ten build the big center at once. Can your knight take it? No: it's pinned, and …Nxe4 loses your queen to Bxd8. And their bishop on f1 is already looking at your c4 pawn.", 'e4 — center; the pinned knight can\'t take.'],
    ["…b5 — almost every master guards the extra pawn on c4 this way. But your knight on f6 is still pinned, and their next move goes right after it.", '…b5 — holds the extra pawn on c4.'],
    ["e5 — nine masters in ten push, and the pawn hits your pinned knight on f6. Can the knight step away to d5? No, then Bxd8 takes your queen. So the knight stays where it is, and you look for counterplay.", 'e5 — hits the pinned knight on f6.'],
    ["…h6 — every master answers this way: if they are attacking your knight, you attack their bishop on g5. Ignore it with …Bb7, and exf6 simply wins the knight.", '…h6 — counterattack the bishop on g5.'],
    ["Bh4 — they keep the pin, as every master does. Your knight on f6 is now hit twice, by the pawn and the bishop, and it still can't move. Time to break the pin.", 'Bh4 — keeps the pin on f6.'],
    ["…g5 — every master plays it. The pawn hits the bishop and steps between it and your knight on f6, so the pin is broken. Now what do they do? Their bishop is attacked, your knight is free, and their answer is a sacrifice.", '…g5 — breaks the pin; Nxg5 comes next.'],
    ["Nxg5 — the knight sacrifice, chosen by about nine masters in ten. Here's the idea: if you take, their bishop recaptures on g5 and pins your knight on f6 again, and the e5 pawn is waiting to win it.", 'Nxg5 — a knight sacrifice on g5.'],
    ["…hxg5 — take it, as almost every master does. Now look at the h-file: with your h-pawn gone, your rook on h8 hits the bishop on h4 too, on top of the pawn on g5.", '…hxg5 — a knight up; the h-file opens.'],
    ["Bxg5 — the bishop takes back and pins your knight on f6 all over again. Material is in your favour for the moment, but exf6 is coming to win the knight back.", 'Bxg5 — pins f6 again; exf6 is coming.'],
    ["…Nbd7 — nine masters in ten develop here: the knight guards f6 a second time and hits their e5 pawn. The engine prefers …Be7, which blocks the pin on your queen; after …Nbd7 they are a little better.", '…Nbd7 — guards f6 again, hits e5.'],
    ["exf6 — the pawn takes your knight, and you are a pawn down for now. Just under half of masters take here; slightly more play g3 first. Look at that pawn on f6: it's a wedge driven deep into your kingside.", 'exf6 — knight back; a wedge on f6.'],
    ["…Bb7 — the bishop goes to the long diagonal. Your c6 pawn blocks it for now, but once …c5 comes, it looks straight down at their kingside.", '…Bb7 — long diagonal, waits for …c5.'],
    ["g3 — they prepare Bg2, to put their own bishop on the long diagonal and meet yours head-on.", 'g3 — Bg2 next, to oppose your bishop.'],
    ["…c5 — eight masters in ten play it, and here's the point: the pawn hits d4, and with c6 gone, your bishop on b7 now hits their rook on h1. Take on c5, and …Bxh1 wins the rook.", '…c5 — hits d4; the bishop hits h1.'],
    ["d5 — the pawn pushes past, hits your e6 pawn and stands in front of your bishop, shielding the rook on h1. What about Bxc4 instead? It looks natural, but …bxc4 wins the bishop.", 'd5 — blocks the long diagonal, hits e6.'],
    ["…Qb6 — the queen guards b5 and clears d8, so you can castle queenside. The engine prefers …Nxf6, taking their f6 pawn; after …Qb6 they are a little better.", '…Qb6 — guards b5, castle long next.'],
    ["Bg2 — the bishop lines up against yours on the long diagonal, with their d5 pawn between them, and their king can castle next. They are clearly better here.", 'Bg2 — opposes your bishop, castling next.'],
    ["Castle queenside. Your king leaves the center, and the rook lands on d8, on the same file as their d5 pawn.", 'O-O-O — king safe, rook to d8.'],
    ["Castle. Now the kings sit on opposite wings, yours on c8 and theirs on g1, and your queenside pawns are ready to roll.", 'O-O — kings on opposite wings.'],
    ["…b4 — the pawn rolls forward and hits the knight on c3. Where does the knight go now?", '…b4 — kicks the knight on c3.'],
    ["Na4 — to the edge, but with a point: from a4 the knight hits your queen on b6 and your c5 pawn.", 'Na4 — hits your queen and c5.'],
    ["…Qa6 — the queen steps off b6 and turns on the knight on a4. Your plan from here: win their d5 pawn. Your bishop on b7 and your e6 pawn already hit it, and the knight on d7 can step aside to bring the rook on d8 into the fight.", '…Qa6 — off b6, hits the a4 knight.'],
  ],
  'Anti-Meran Bd3 Line': [
    ["…a6 — about three masters in ten play this before …Bb7. Why the hurry? It gives b5 a second guard right away, so your …c5 break can come next move without leaving b5 hanging.", '…a6 — guards b5, …c5 next.'],
    ["e4 — three masters in four push at once. The pawn takes the center and prepares e5, to kick your knight off f6.", 'e4 — center first, e5 to follow.'],
    ["…c5 — almost every master hits back at d4 straight away. And if they push past with d5 instead, …c4 hits their bishop on d3.", '…c5 — hits d4 at once.'],
    ["e5 — half of masters push here; the other half play d5. The pawn hits your knight on f6. Do you move the knight? Not yet. You have a capture of your own first.", 'e5 — hits the knight on f6.'],
    ["…cxd4 — almost every master takes. Now the pawn on d4 hits their knight on c3, so both sides have a knight under fire. And notice that d4 pawn is a passed pawn.", '…cxd4 — hits the knight on c3.'],
    ["Nxb5 — instead of saving the knight, they throw it into b5, and nine masters in ten do the same. Why? If you take with …axb5, their e5 pawn takes your knight on f6 and the material comes back. From b5 the knight also hits your d4 pawn.", 'Nxb5 — a sacrifice; exf6 is the follow-up.'],
    ["…axb5 — you take the knight, as about six masters in ten do; …Nxe5 is the other main reply. You are a piece up for the moment, and look at the a-file: your rook on a8 now looks straight down at their a2 pawn.", '…axb5 — a knight up, for now.'],
    ["exf6 — every master takes back the knight, and material is level. Their pawn on f6 hits g7, so the question is how you take back.", 'exf6 — knight back; material level.'],
    ["…gxf6 — eight masters in ten take with the g-pawn. You come out a pawn up with doubled pawns on f7 and f6, and the g-file is half-open for your rook on h8.", '…gxf6 — a pawn up; the g-file opens.'],
    ["Castle. Their king is safe, and now count your loose pawns: b5 and d4 both stand without a guard.", 'O-O — king safe; b5 and d4 are loose.'],
    ["…Qb6 — one move, two guards: the queen covers both b5 and d4. Something like …e5 instead lets Bxb5 take a pawn.", '…Qb6 — guards b5 and d4.'],
    ["Qe2 — the queen comes to the open e-file and pins your e6 pawn to your king on e8. With your king still in the center, keep a careful eye on that file.", 'Qe2 — pins e6 to your king.'],
    ["…Bb7 — the bishop develops and hits their knight on f3. But what about b5? Their bishop on d3 hits it, their queen stands right behind, and only your queen guards it. The engine prefers …b4, stepping the pawn out of that line; after …Bb7 they are clearly better.", '…Bb7 — hits f3; …b4 was better.'],
    ["Rd1 — the rook lines up behind their bishop on the d-file, so the moment the bishop moves, the rook hits your d4 pawn. Taking on b5 at once was stronger; after Rd1 they are only a little better.", 'Rd1 — behind the bishop, aimed at d4.'],
    ["…Rg8 — the rook takes the half-open g-file and pins their g2 pawn to their king on g1. But it leaves your h7 pawn loose, and …b4 was stronger; now they are clearly better. Your plan from here: bring your bishop to d6 and the rook up the g-file to g4, while you keep an eye on the pin on e6.", '…Rg8 — g-file, pins g2; …b4 was better.'],
  ],
  'Stoltz Qc2 Variation': [
    ["Qc2 — six masters in ten play it here. The queen covers e4, getting ready for the push there, and it looks down the diagonal at your h7 pawn.", 'Qc2 — covers e4, eyes h7.'],
    ["…Bd6 — nine masters in ten put the bishop here. It aims at h2, clears the way to castle and backs up a later …e5.", '…Bd6 — aims at h2, backs …e5.'],
    ["Bd3 — about half of masters develop here, and now look at the diagonal toward your h7 pawn: their queen and bishop stand on it one behind the other. That's a battery.", 'Bd3 — queen and bishop aim at h7.'],
    ["Castle. Three masters in four tuck the king away now, and your king joins the knight on f6 in guarding h7.", 'O-O — king safe, guards h7.'],
    ["Castle. Nearly every master does the same. Both kings are safe, and the tension between your d5 pawn and their c4 pawn is still there; you decide when to release it.", 'O-O — both kings safe.'],
    ["…dxc4 — nearly nine masters in ten release it now. The pawn hits the bishop on d3, so it has to take back, and then …b5 can chase it again.", '…dxc4 — the bishop must recapture.'],
    ["Bxc4 — the bishop takes back, and from c4 it hits your e6 pawn. But it's standing right where your b-pawn can kick it.", 'Bxc4 — recaptures; …b5 can kick it.'],
    ["…b5 — the pawn kicks the bishop off c4 and makes room for your bishop on b7. The engine prefers …e5 at once, striking in the center first; after …b5 they are a little better.", '…b5 — kicks the bishop; …e5 was better.'],
    ["Bd3 — back to d3, so the queen and bishop line up on h7 again, and the bishop hits your b5 pawn as well.", 'Bd3 — back on the h7 diagonal.'],
    ["…Bb7 — almost every master puts the bishop on the long diagonal. Your c6 pawn blocks it for now; when that pawn moves, it looks straight at e4.", '…Bb7 — long diagonal, behind c6.'],
    ["e4 — only about a quarter of masters push now; most play a3 first, but the engine likes e4 best. What does it want? e5 next, hitting your bishop on d6 and your knight on f6 at once.", 'e4 — center; e5 would hit d6 and f6.'],
    ["…e5 — every master breaks now, and you can see why: take the e5 square before their pawn does. Your pawn hits d4, and if they take on e5, your knight takes back.", '…e5 — the central break, hits d4.'],
    ["dxe5 — they take, and the pawn on e5 hits your bishop on d6 and your knight on f6 at once. Do you have to move one of them? No: your knight on d7 just takes the pawn.", 'dxe5 — hits d6 and f6 at once.'],
    ["…Nxe5 — the knight takes back and hits their bishop on d3 and their knight on f3. A move like …b4, chasing their other knight first, would lose your bishop on d6 to exd6.", '…Nxe5 — hits d3 and f3.'],
    ["Nxe5 — they trade off your active knight, and now their knight on e5 has no guard, so you take it.", 'Nxe5 — trades; the e5 knight hangs.'],
    ["…Bxe5 — your bishop takes back and lands in the center. From e5 it hits their knight on c3 and the h2 pawn, which only their king guards.", '…Bxe5 — hits c3 and h2.'],
    ["f3 — the pawn shores up e4 and keeps your knight off g4, but look at the diagonal it opens toward their king on g1. h3 was stronger; after f3 the game is about level. Your plan from here: …Qd4 with check, then a rook to d8 on the open d-file, while your bishop on e5 stays aimed at h2.", 'f3 — holds e4; h3 was better.'],
  ],
  'Moscow Variation Bxf6': [
    ["Bxf6 — the Moscow: about four masters in ten simply take your knight instead of keeping the pin. The bishop on f6 now hits your queen on d8, so there's nothing to think about: you take back.", 'Bxf6 — takes the knight, hits your queen.'],
    ["…Qxf6 — every master recaptures with the queen, and your pawns stay whole. You now have the bishop pair, and your queen on f6 hits their d4 pawn and the knight on f3.", '…Qxf6 — bishop pair; hits d4 and f3.'],
    ["e3 — eight masters in ten play it. The pawn guards d4 against your queen, and their bishop on f1 can now reach c4.", 'e3 — guards d4 from your queen.'],
    ["…Nd7 — the knight develops behind your pawns, and from d7 it backs up the break you want: …e5, against their d4 pawn.", '…Nd7 — develops, prepares …e5.'],
    ["Bd3 — the bishop develops and clears the way to castle, and from d3 it backs up e4, the push that would hit your d5 pawn.", 'Bd3 — develops, prepares e4.'],
    ["…dxc4 — the same timing trick as in the other Semi-Slav lines: their bishop just moved to d3, and now it has to move again to take back on c4.", '…dxc4 — the bishop moves twice.'],
    ["Bxc4 — material is level again, and the bishop on c4 eyes your e6 pawn.", 'Bxc4 — level material, aims at e6.'],
    ["…g6 — where does your dark-squared bishop belong? On g7, right behind your queen on the long diagonal, where both point at d4. This pawn move makes room for it.", '…g6 — …Bg7 next, behind the queen.'],
    ["Castle. Their king is safe, and e4 is the next step, to take more of the center.", 'O-O — castled; e4 is coming.'],
    ["…Bg7 — there it is: queen in front, bishop behind, both aimed at their d4 pawn. That's a battery on the long diagonal, and your king can castle next.", '…Bg7 — a battery aimed at d4.'],
    ["e4 — the pawn takes more of the center and threatens e5, hitting your queen on f6. Castling right now would allow exactly that, so you deal with it first.", 'e4 — threatens e5 against your queen.'],
    ["…e5 — you get there first. The pawn takes the e5 square away from their e-pawn, so your queen is safe, and it hits their d4 pawn.", '…e5 — claims e5, hits d4.'],
    ["d5 — they push past, keeping their pawn out of reach of yours on e5, and now it hits your c6 pawn.", 'd5 — steps past, hits c6.'],
    ["Castle. Your king is safe, and the tension on c6 can wait: if they take there, your b-pawn takes back. Next, …Nb6 can hit their bishop on c4.", 'O-O — king safe; …Nb6 is next.'],
    ["Bb3 — the bishop steps back from c4 before your knight can hit it from b6. h3 was a touch stronger; the game is about level. Your plan from here: …Nc5, hitting their bishop on b3 and the e4 pawn, then …a5 to chase the bishop further, with your bishop pair as the long-term trump.", 'Bb3 — steps back; …Nc5 hits it.'],
  ],
  'Reynolds Variation': [
    ["…Bd6 — instead of taking on c4, about one master in ten develops the bishop first, aiming at h2 and getting ready to castle. The engine prefers …dxc4, the Meran way; after …Bd6 they are a little better.", '…Bd6 — aims at h2; …dxc4 was better.'],
    ["Castle. Just over half of masters castle here, and four in ten push e4 at once, which the engine prefers: it hits your d5 pawn straight away.", 'O-O — castles; e4 was the alternative.'],
    ["Castle. More than eight masters in ten do the same, and your king sits safely behind the pawns on f7, g7 and h7.", 'O-O — king tucked away.'],
    ["e4 — eight masters in ten break in the center now. The pawn hits d5, and if you take, the e-file opens.", 'e4 — hits d5, central break.'],
    ["…dxe4 — you take, and the pawn on e4 hits their bishop on d3 and their knight on f3 at once, so they must take back. The engine prefers …dxc4, taking the other pawn; after …dxe4 they are a little better.", '…dxe4 — hits d3 and f3; …dxc4 better.'],
    ["Nxe4 — the knight takes back, and look what it hits from e4: your bishop on d6, which has no guard, and your knight on f6. Time to trade it off.", 'Nxe4 — hits d6 and f6.'],
    ["…Nxe4 — you trade knights, and the attacker on your bishop is gone. Their bishop on d3 takes back on e4.", '…Nxe4 — trades off the attacker.'],
    ["Bxe4 — the bishop recaptures and sits in the center, where it hits your h7 pawn, which only your king guards, and your c6 pawn.", 'Bxe4 — centralized, hits h7.'],
    ["…Nf6 — the knight comes back to f6, hits the bishop on e4 and adds a guard to h7. The engine prefers …h6 first, keeping their bishop off g5; after …Nf6 they are a little better.", '…Nf6 — hits the bishop on e4.'],
    ["Bc2 — the bishop steps back, and notice that it keeps its aim on your h7 pawn, now from c2.", 'Bc2 — retreats, still aims at h7.'],
    ["…c5 — finally the break. The pawn hits d4, and it stops their pawn from coming to c5, where it would kick your bishop on d6.", '…c5 — hits d4 at last.'],
    ["dxc5 — they take, and now your bishop on d6 is hit twice: by the pawn, and by their queen down the open d-file. Bg5, pinning your knight first, was stronger; after dxc5 the game is about level.", 'dxc5 — hits d6; Bg5 was stronger.'],
    ["…Bxc5 — the bishop takes back, and from c5 it pins their f2 pawn to their king on g1. Material is level, and the queens face each other on the open d-file.", '…Bxc5 — level, pins f2 to the king.'],
    ["Bg5 — the bishop pins your knight on f6 to your queen on d8. Ne5 was stronger; after Bg5 the game is about level.", 'Bg5 — pins your knight; Ne5 was stronger.'],
    ["…h6 — the same question you asked in the main lines: take on f6, or step back? Trading queens on d1 first was just as good.", '…h6 — asks the bishop again.'],
    ["Bh4 — they keep the pin on your knight on f6, but from the rim on h4. Bd2 was better; after Bh4 the game is about level.", 'Bh4 — keeps the pin; Bd2 was better.'],
    ["…b6 — the pawn steps up to free b7 for your last piece, the bishop on c8. Trading queens on d1 first was a shade better. Your plan from here: …Bb7 onto the long diagonal and your rooks to the open d-file, with your extra center pawn on e6 against their extra pawn on c4.", '…b6 — …Bb7 next, on the long diagonal.'],
  ],
  'Romih ...Bd6 System': [
    ["Qc2 — about one master in ten plays this quieter move instead of e4. The queen lines up behind the bishop on d3, aiming at your h7 pawn. And notice: this is the same position as the Stoltz tab, reached by a different move order.", 'Qc2 — battery toward h7.'],
    ["…dxc4 — nearly nine masters in ten take now. With their bishop already on d3, it has to move a second time to take back, and …b5 will gain more time on it.", '…dxc4 — makes the bishop move again.'],
    ["Bxc4 — they take back, and the bishop on c4 now looks at your e6 pawn. But it's standing right where …b5 can hit it.", 'Bxc4 — recaptures, faces …b5.'],
    ["…b5 — the pawn hits the bishop and clears b7 for your other bishop. …e5 at once was the engine's choice; after …b5 they are a little better.", '…b5 — gains time; …e5 was better.'],
    ["Bd3 — the bishop goes back to d3, and with the queen behind it, the pair aims at h7 again. It hits your b5 pawn too.", 'Bd3 — retreats; the battery on h7 is back.'],
    ["…Bb7 — almost every master develops the bishop here. It sits on the long diagonal behind your c6 pawn, ready for the moment the center opens.", '…Bb7 — on the long diagonal.'],
    ["a3 — six masters in ten play it, preparing b4, which would stop your b-pawn from ever advancing. e4 at once was the engine's choice. And notice: …c5 right now would drop your b5 pawn to Nxb5.", 'a3 — prepares b4; e4 was stronger.'],
    ["…a6 — and that's the fix: the pawn gives b5 a second guard, so …c5 becomes possible. About one master in five plays it; the engine prefers …Rc8.", '…a6 — guards b5, prepares …c5.'],
    ["e4 — only about one master in a hundred plays it here. b4, the move most masters choose, was much stronger; after e4 you are a little better, because your …e5 break is ready.", 'e4 — premature; b4 was much stronger.'],
    ["…e5 — two of the three master games here went this way: the pawn hits their d4 pawn, and your bishop on d6 and knight on d7 both back it up. The game is about level. Your plan from here: …c5 next to open the long diagonal for your bishop on b7, then put your rooks on the files that open.", '…e5 — hits d4, …c5 next.'],
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

export const SEMI_SLAV_WATCH: WatchCourse = {
  openingId: 'semi-slav',
  title: 'Semi-Slav Defence — A Master Class',
  orientation: 'black',
  sources: ['concept:pos-center', 'concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Semi-Slav_Defense'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
