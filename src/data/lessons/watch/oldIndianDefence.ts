// Old Indian Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=old-indian-defence`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a).
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'Nf6', 'c4', 'd6', 'Nc3', 'Nbd7', 'e4', 'e5', 'Nf3', 'Be7', 'Be2', 'O-O', 'O-O', 'c6', 'd5', 'Nc5', 'Qc2', 'a5', 'Be3', 'Qc7', 'Nd2', 'Bd7', 'Rfc1', 'h6', 'b3', 'Nh7', 'a3', 'Bg5', 'Bxg5', 'Nxg5', 'h4', 'Nh7', 'Rab1', 'Na6', 'Qd1', 'c5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — the queen's pawn, the start of just over a third of master games. Look at the two squares it covers, c5 and e5. Keep your eye on e5: the whole Old Indian is built to plant a pawn there and challenge this one.", "d4 — the queen's pawn; covers e5."],
  ["…Nf6 — the move about six masters in ten choose. The knight comes out and watches two central squares, e4 and d5, and not a single pawn is committed yet. In the Old Indian your pawns come next, and they're headed for d6 and e5.", '…Nf6 — watches e4 and d5.'],
  ["c4 — seven masters in ten add the second pawn. Now c4 and d4 stand side by side, and the new one covers d5 and b5. They're taking space, and your setup lets them keep some of it while you build a solid wall of your own.", 'c4 — more space, covers d5.'],
  ["…d6 — and this is the Old Indian. Only about two masters in a hundred play it; more than half choose …e6 and a third …g6, and the engine prefers …e6 too. So what's the idea? The pawn on d6 is the backstop for …e5: when your e-pawn steps up to hit d4, it's already guarded. And here's the difference from the King's Indian: no …g6. Your bishop will go to e7 instead, a modest square but a very solid one. The price is space, and after …d6 they are a little better.", '…d6 — the Old Indian; …e5 comes next.'],
  ["Nc3 — two masters in three bring this knight out first. It covers e4 and d5, so their e-pawn can step forward next with support. The engine prefers Nf3; after Nc3 they are a little better.", 'Nc3 — backs up the e4 push.'],
  ["…Nbd7 — almost half the masters play this, and it's the Old Indian move order. Why d7 and not c6? On c6 the knight could be kicked by d5. From d7 it covers c5 and e5, so when …e5 comes it has two guards behind it. The engine prefers the direct …e5, about a quarter of the masters' choice, and that has a tab of its own; after …Nbd7 they are a little better.", '…Nbd7 — a second guard for …e5.'],
  ["e4 — six masters in ten grab the full center: pawns on c4, d4 and e4. That's a lot of territory. So how do you fight three pawns abreast? Not the whole wall at once. You go after the middle one, d4.", 'e4 — three pawns abreast.'],
  ["…e5 — there it is, and almost every master plays it. The pawn hits d4, and the pawn itself is guarded twice, by the d6 pawn and your knight on d7. Now the decision is theirs: take on e5, push past with d5, or leave the tension where it is.", '…e5 — hits d4, guarded twice.'],
  ["Nf3 — six masters in ten keep the tension this way; about a quarter push d5 at once. The knight develops and hits e5. Count it: the d4 pawn and the knight hit e5, and the d6 pawn and your knight on d7 guard it. It holds.", 'Nf3 — develops, second hit on e5.'],
  ["…Be7 — about half the masters play it; a third prefer …g6 and the King's Indian bishop on g7. Look where this bishop stands: behind your own pawns on d6 and e5, which sit on its colour. That makes it a bit of a bad bishop. Remember that, because later on you'll find a way to trade it. For now it does its job and clears the way to castle.", '…Be7 — modest, castling next.'],
  ["Be2 — more than nine masters in ten choose it. The bishop guards c4 and clears the way for their king to castle. Their center gives them more room, and they are clearly better for now, so your job is to finish developing and pick the right moment to hit back.", 'Be2 — guards c4, castling next.'],
  ['…O-O — more than eight masters in ten castle now. Your king is safe, the rook comes to f8, and only one minor piece is still at home: the bishop on c8.', '…O-O — king safe, rook to f8.'],
  ['O-O — almost every master castles here. The engine prefers Qc2 first; after castling they are a little better. Both kings are tucked away, and the tension between d4 and e5 is still standing.', 'O-O — both kings safe.'],
  ["…c6 — a quiet move with three jobs. The pawn covers b5 and d5, so their knight never gets to use b5. It clears c7 for your queen. And it puts a question to the d4 pawn: if it pushes to d5, your c-pawn can take there, opening the c-file.", '…c6 — covers b5 and d5.'],
  ["d5 — they close the center. Now d5 faces d6, e4 faces e5, and their pawn hits your c6 pawn. The engine prefers keeping the tension with Qc2; after d5 they are a little better. But look what d5 gives you: with no pawn left on d4, no pawn of theirs can ever hit c5 except the b-pawn. That square is about to become your knight's home.", 'd5 — closes the center; c5 opens up.'],
  ["…Nc5 — the knight jumps to the square d5 just handed you. From c5 it hits e4 and eyes d3, a square no pawn of theirs covers anymore. Count e4 now: your knights on c5 and f6 both hit it, and only their knight on c3 guards it. Taking on d5 first with …cxd5 is the engine's slight preference.", '…Nc5 — the outpost; hits e4.'],
  ['Qc2 — they answer that count. The queen gives e4 its second guard, so it\'s two attackers against two defenders and the pawn holds. Notice the order, too: first secure e4, then develop the bishop.', 'Qc2 — a second guard on e4.'],
  ["…a5 — here's how you keep the knight on c5. The only pawn that could ever kick it is their b-pawn, from b4, and now b4 is covered by your a5 pawn. To chase the knight they'd need a3 first, and even then …axb4 opens the a-file for your rook.", '…a5 — covers b4; the knight stays.'],
  ['Be3 — the bishop develops and hits your knight on c5, which only the d6 pawn guards. Look at the diagonal it sits on, too: from e3 it covers g5. Keep that in mind, because this is the bishop you\'ll want to trade yours for.', 'Be3 — hits c5, covers g5.'],
  ["…Qc7 — the queen steps up to guard the pawns that matter: d6, which holds your knight on c5, and a5, which keeps b4 covered. It also clears d8, so your rooks can start to talk to each other once the bishop on c8 moves.", '…Qc7 — guards d6 and a5.'],
  ['Nd2 — the knight leaves f3, where it was only hitting e5, and from d2 it guards e4 a third time and backs up c4. Notice what else it does: with f3 empty, the bishop on e2 now looks down the diagonal at g4 and h5.', 'Nd2 — a third guard on e4.'],
  ['…Bd7 — the last minor piece comes out. On d7 the bishop gives c6 another guard, and look at your back rank: from a8 to f8 nothing stands in the way, so your rooks are connected. Development is done.', '…Bd7 — development done, rooks connected.'],
  ['Rfc1 — their rook comes to the c-file, behind the c4 pawn. Right now the file is shut, but your c6 pawn and their d5 pawn still face each other. If you ever take on d5 and their c-pawn takes back, the file is wide open and this rook is already there.', 'Rfc1 — a rook ready for the c-file.'],
  ['…h6 — it looks like a small pawn move, but it starts a plan. Remember the bad bishop on e7? Its road out runs through f6 to g5, and this pawn covers g5 so the bishop can land there safely. Soon the knight on f6 steps aside to clear the road.', '…h6 — covers g5 for your bishop.'],
  ['b3 — the pawn guards c4 and takes a4 away from your knight. It\'s also the first step of their plan: a3, then b4, to finally kick your knight off c5.', 'b3 — guards c4, prepares a3 and b4.'],
  ['…Nh7 — there\'s the knight stepping aside. With f6 empty, your bishop on e7 now sees all the way to g5, and the knight on h7 guards that square too. It also frees your f-pawn, so …f5, hitting their e4 pawn, becomes a real option later.', '…Nh7 — clears the road, frees the f-pawn.'],
  ['a3 — they get ready for b4, the push that finally kicks your knight off c5. The engine prefers Rd1 here; after a3 they are a little better, and before b4 comes, your bishop gets its move in.', 'a3 — prepares b4 against c5.'],
  ["…Bg5 — and here's what h6 and Nh7 were for. Your bad bishop offers itself for their good one on e3. If they ignore it, …Bxe3 and the f-pawn has to take back, leaving doubled pawns on e3 and e4. Either way, the piece that was stuck behind d6 and e5 gets traded for their good bishop.", '…Bg5 — trade the bad bishop.'],
  ['Bxg5 — they take, and the trade you wanted happens. Their bishop on g5 has no guard, so you simply take it back.', 'Bxg5 — the dark bishops come off.'],
  ["…Nxg5 — with the knight, not the pawn: …hxg5 would leave you doubled g-pawns. And look where the knight lands: on g5 it hits e4. Your bad bishop is gone, and the bishop you kept, on d7, works on the light squares, where your center pawns on d6 and e5 never get in its way.", '…Nxg5 — the knight recaptures, hits e4.'],
  ["h4 — the pawn kicks your knight off g5. Should you grab e4 on the way out? No: e4 has three guards against your two knights, so taking there costs you a knight for a pawn. The engine prefers b4, going after your other knight; after h4 they are a little better.", 'h4 — kicks the knight off g5.'],
  ['…Nh7 — where can the knight go? To e6, and dxe6 takes it; to h3 with check, and gxh3 takes it. So it\'s back to h7, the one safe square, where it still guards g5.', '…Nh7 — the only safe square.'],
  ['Rab1 — the second rook lines up behind the b-pawn, getting ready for b4. The engine prefers b4 straight away; after Rab1 the game is about level.', 'Rab1 — behind the b-pawn, b4 next.'],
  ['…Na6 — the knight leaves c5 on its own terms. From a6 it covers b4 a second time, so their push there gets harder, and it clears c5 for your c-pawn. But this was the moment for …f5, the break your knight on h7 set up: the engine prefers it, and after …Na6 they are a little better.', '…Na6 — covers b4; …f5 was stronger.'],
  ['Qd1 — the queen backs off the c-file. Look at the diagonal from d1 to h5: if the bishop on e2 ever steps to g4 to offer a trade with yours on d7, the queen stands right behind it.', 'Qd1 — off the c-file, backs Bg4.'],
  ['…c5 — the pawn steps up, and now your pawns on a5, c5 and d6 face theirs on a3, b3, c4 and d5. Look at d4: your c5 and e5 pawns both cover it, and no pawn of theirs ever can. That\'s a ready-made outpost. The engine prefers …f5 at once; after …c5 they are a little better. Your plan from here: with the queenside settled, the fight moves to the kingside, so bring the knight from a6 to c7 and break with …f5 against e4, the push your knight on h7 cleared the way for.', '…c5 — d4 is yours; …f5 next.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the lines filed before it don't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Old Indian: Czech Variation': ['d4', 'Nf6', 'c4', 'd6', 'Nc3', 'Nbd7', 'e4', 'e5', 'Nf3', 'Be7', 'Be2', 'O-O', 'O-O', 'c6', 'Re1', 'a6', 'Bf1', 'b5', 'a3', 'Bb7', 'Bg5', 'h6'],
  'Old Indian: Janowski Variation': ['d4', 'Nf6', 'c4', 'd6', 'Nc3', 'Bf5', 'f3', 'e5', 'e4', 'Bg6', 'd5', 'Be7', 'Be3', 'h6', 'Nh3', 'Nbd7', 'Bd3', 'O-O', 'O-O', 'c6', 'Qe2', 'cxd5'],
  'Old Indian: Tartakower Variation': ['d4', 'Nf6', 'c4', 'd6', 'Nc3', 'Nbd7', 'e4', 'e5', 'Nf3', 'Be7', 'Be2', 'O-O', 'O-O', 'exd4', 'Nxd4', 'Re8', 'f3', 'Bf8', 'g4', 'Nc5', 'Kh1', 'c6'],
  'Old Indian: Ukrainian Variation': ['d4', 'Nf6', 'c4', 'd6', 'Nc3', 'e5', 'Nf3', 'Nbd7', 'g3', 'Be7', 'Bg2', 'O-O', 'O-O', 'c6', 'e4', 'a5', 'h3', 'Re8', 'Be3', 'a4', 'Qc2', 'Qa5'],
  'Old Indian: Main Line with d5': ['d4', 'Nf6', 'c4', 'd6', 'Nc3', 'Nbd7', 'e4', 'e5', 'Nf3', 'Be7', 'Be2', 'O-O', 'O-O', 'c6', 'd5', 'a5', 'a3', 'Nh5', 'Nxe5', 'Nxe5', 'Bxh5', 'Nxc4'],
  'Old Indian: Seirawan System': ['d4', 'Nf6', 'c4', 'd6', 'Nc3', 'Nbd7', 'e4', 'e5', 'Nf3', 'Be7', 'Be2', 'O-O', 'O-O', 'c6', 'd5', 'a5', 'Qc2', 'Qc7', 'Be3', 'Ng4', 'Bd2', 'Nc5'],
  'Old Indian: Be2 Development': ['d4', 'Nf6', 'c4', 'd6', 'Nc3', 'Nbd7', 'e4', 'e5', 'Nf3', 'Be7', 'Be2', 'O-O', 'O-O', 'c6', 'Qc2', 'a6', 'Rd1', 'Qc7', 'Bg5', 'Re8', 'Rac1', 'h6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Old Indian: Czech Variation': [
    ['Re1 — instead of closing the center, they bring the rook to the e-file, behind their e4 pawn. Right now their own bishop on e2 stands in between, so watch for that bishop to move. The engine prefers Qc2; after Re1 they are a little better.', 'Re1 — the rook lines up behind e4.'],
    ['…a6 — you start a plan of your own on the queenside. The target is their c4 pawn, and the tool is …b5. With a6 in place, b5 will be covered twice, by the a6 and c6 pawns.', '…a6 — prepares …b5 against c4.'],
    ['Bf1 — there\'s the bishop clearing the way. Now the rook on e1 guards e4 directly, and from f1 the bishop still covers c4, the pawn your …b5 is aimed at.', 'Bf1 — now the rook guards e4.'],
    ['…b5 — the push lands and hits c4. You have space on the queenside now, and b7 is free for your bishop. And if you ever take on c4, the b-file half-opens for a rook.', '…b5 — hits c4, grabs space.'],
    ['a3 — a bit of prophylaxis. Your b-pawn would love to reach b4, where it would hit their knight on c3, so they take that square away first.', 'a3 — stops …b4 hitting the knight.'],
    ['…Bb7 — the bishop takes the long diagonal and waits behind your c6 pawn. If they ever take on c6, it recaptures and looks straight down at e4. The engine prefers …exd4 first; after …Bb7 they are a little better.', '…Bb7 — long diagonal, behind c6.'],
    ['Bg5 — the bishop comes out and hits your knight on f6. Behind the knight stands your bishop on e7, so the knight isn\'t pinned, but it is the piece that hits e4 and covers d5.', 'Bg5 — hits the knight on f6.'],
    ['…h6 — the bishop has to decide now: take your knight, or retreat. Your plan from here: the same idea as the main line, …Nh7 to trade off the dark-squared bishops, then use your space on b5, where taking on c4 half-opens the b-file for a rook.', '…h6 — kicks the bishop on g5.'],
  ],
  'Old Indian: Janowski Variation': [
    ['…Bf5 — the Janowski, about one master in ten. Why the bishop now? In the main line it waits behind your knight on d7 for a long time; here it comes out first, to f5, where it covers e4 and d3. The engine prefers …e5 at once; after …Bf5 they are a little better.', '…Bf5 — the Janowski: bishop out first.'],
    ['f3 — a bit over a third of masters choose it. The pawn covers e4, so their e-pawn can still get there despite your bishop. But it costs them something: f3 was the natural square for their knight on g1, and now that knight has to look elsewhere.', 'f3 — covers e4, prepares the push.'],
    ['…e5 — almost every master strikes now. The pawn hits d4, and since your light-squared bishop is already out on f5, this pawn doesn\'t lock it in.', '…e5 — hits d4.'],
    ['e4 — the push comes, played by about two masters in three, and it hits your bishop on f5. Before you move the bishop, notice that d4 is still hit by your e5 pawn.', 'e4 — hits the bishop on f5.'],
    ['…Bg6 — the bishop steps back to g6, outside your pawn chain, and hits e4. Why not e6? There d5 would kick it again. Almost every master hits back with …exd4 instead, and the engine agrees with them; after …Bg6 they are clearly better.', '…Bg6 — outside the chain, hits e4.'],
    ['d5 — they close the center: d5 against d6, e4 against e5. Look at your pawns on d6 and e5, both on dark squares. Your bishop on g6 works on the light ones, outside the chain, where those pawns never get in its way.', 'd5 — the center closes.'],
    ['…Be7 — the other bishop develops and clears the way to castle. It\'s the modest square from the main line, behind d6 and e5.', '…Be7 — castling next.'],
    ['Be3 — the bishop develops with a look at your a7 pawn. Is it in danger? No, the rook on a8 guards it. The bishop\'s real job is c5, a square it now covers, and the one your knight would like to land on.', 'Be3 — eyes a7, covers c5.'],
    ['…h6 — a little prophylaxis. The pawn takes g5 away from their pieces, and it gives your bishop on g6 a retreat to h7 if their h-pawn ever comes after it.', '…h6 — covers g5, opens h7.'],
    ['Nh3 — remember f3? Here\'s what it cost them. Their knight has no f3, so it develops to the rim on h3. From there it covers f4 and g5, and later it can head for f2.', 'Nh3 — the knight goes to the rim.'],
    ['…Nbd7 — now the other knight comes out. From d7 it guards e5 and looks at c5, the square their bishop on e3 is watching.', '…Nbd7 — guards e5, looks at c5.'],
    ['Bd3 — the bishop develops and clears the way for their king to castle. Count e4: your bishop on g6 and knight on f6 hit it, and now the f3 pawn, the knight on c3 and this bishop guard it.', 'Bd3 — a third guard on e4.'],
    ['…O-O — you castle, and your king is safe. Both knights and both bishops are out; what\'s left is to find a pawn break.', '…O-O — king safe.'],
    ['O-O — they castle too. Now it\'s your move in a closed center, and the question is where to strike.', 'O-O — both kings safe.'],
    ['…c6 — here\'s the strike. The pawn hits d5, the front of their chain. If they take on c6, your b-pawn takes back; if they let you take on d5, the c-file opens for your rook.', '…c6 — hits d5.'],
    ['Qe2 — the queen steps off d1, which connects their rooks, and from e2 it guards both bishops, on d3 and e3.', 'Qe2 — connects rooks, guards both bishops.'],
    ['…cxd5 — you take, and your pawn on d5 hits both c4 and e4. How they take back matters: if the e-pawn takes, your bishop on g6 suddenly sees all the way to d3. So the c-pawn is the natural recapture. Your plan from here: put a rook on c8 on the open c-file, while your bishop on g6 keeps leaning on e4.', '…cxd5 — hits c4 and e4.'],
  ],
  'Old Indian: Tartakower Variation': [
    ['…exd4 — the Tartakower idea: don\'t wait for d5 to clamp the center, release it yourself. You trade your e5 pawn for their d4 pawn, and the e-file half-opens for your rook. The engine prefers …Re8 first; after …exd4 they are clearly better.', '…exd4 — release the center, open the e-file.'],
    ['Nxd4 — the knight takes back and settles in the center. Material is level, and now the e-file is half-open for you, with their e4 pawn standing on it.', 'Nxd4 — recaptures, centralized.'],
    ['…Re8 — the rook takes the half-open file. But look along it: your own bishop on e7 stands between the rook and e4. Keep that in mind; your next move fixes it.', '…Re8 — the rook takes the e-file.'],
    ['f3 — they shore up e4 with a pawn, and it also keeps your knight off g4. The engine prefers Be3; after f3 they are clearly better.', 'f3 — guards e4, takes g4.'],
    ['…Bf8 — there\'s the fix. The bishop goes back home, and now the rook on e8 looks straight down the file at e4. From f8 the bishop also guards d6, which stands on a half-open file now that their d-pawn is gone.', '…Bf8 — clears the e-file, guards d6.'],
    ['g4 — they grab space on the kingside, and the next idea is g5 to kick your knight off f6. But a pawn never moves back, and every step forward loosens the cover around their king.', 'g4 — kingside space, g5 next.'],
    ['…Nc5 — the knight comes to c5 and adds a third piece aimed at e4, alongside your rook and the other knight. From c5 it also eyes d3, a square no pawn of theirs covers.', '…Nc5 — a third piece on e4.'],
    ['Kh1 — the king steps into the corner so a rook can come to g1, behind the g4 pawn. The engine prefers Be3; after Kh1 they are a little better.', 'Kh1 — makes room for Rg1.'],
    ['…c6 — the pawn covers b5 and d5, so neither of their knights can settle there. The engine slightly prefers …g6. Your plan from here: keep your rook and knights trained on e4 and get ready for …d5, a break the c6 pawn now supports.', '…c6 — covers d5, prepares …d5.'],
  ],
  'Old Indian: Ukrainian Variation': [
    ['…e5 — the Ukrainian: you strike at d4 right away, without …Nbd7 first. About a quarter of masters choose it, and the engine likes it best of all here. The pawn hits d4, and for now only the d6 pawn guards it.', '…e5 — hit d4 at once.'],
    ['Nf3 — two masters in three develop with a hit on e5. Count it: the d4 pawn and the knight hit e5, and only your d6 pawn guards it. So e5 needs help right now.', 'Nf3 — a second hit on e5.'],
    ['…Nbd7 — there\'s the help, played by about two masters in three. Now e5 has two guards. You have the main line\'s setup; the difference is that their e-pawn is still at home.', '…Nbd7 — a second guard on e5.'],
    ['g3 — about one master in five goes this way, to put the bishop on g2. Most push e4 instead, and the engine prefers that too; after g3 they are a little better. From g2 their bishop will aim down the long diagonal toward your queenside.', 'g3 — a fianchetto; e4 was stronger.'],
    ['…Be7 — about four masters in ten; the rest split between …c6 and …g6. The bishop goes to its usual Old Indian square, and you can castle next move.', '…Be7 — castling next.'],
    ['Bg2 — almost every master completes the fianchetto. For now their own knight on f3 blocks the bishop, but once it moves, the bishop looks down the long diagonal at your b7 pawn.', 'Bg2 — the fianchetto, behind the knight.'],
    ['…O-O — you castle, and the rook comes to f8. Your king is safe before anything opens up in the center.', '…O-O — king safe.'],
    ['O-O — they castle as well. Notice they still haven\'t played e4, so the center is more flexible than in the main line.', 'O-O — both kings safe.'],
    ['…c6 — the pawn covers d5 and b5 and clears c7 and a5 for your queen. And look at what else it does: it stands on the long diagonal, right in the way of their bishop on g2.', '…c6 — blunts the bishop on g2.'],
    ['e4 — now they take the full center: c4, d4 and e4. The pawn also keeps your e5 pawn from ever stepping to e4 to hit their knight on f3.', 'e4 — the full center.'],
    ['…a5 — queenside space, and the pawn takes b4 away from their b-pawn. It\'s also the first step of a plan you\'ll see in a moment: …a4, then your queen to a5.', '…a5 — queenside space, covers b4.'],
    ['h3 — prophylaxis. The pawn covers g4, so your knight on f6 can\'t jump there later to harass a bishop on e3.', 'h3 — keeps your knight off g4.'],
    ['…Re8 — the rook comes to e8. With …Bf8 later, it would stand right behind your e5 pawn and add a guard to it.', '…Re8 — ready to back up e5.'],
    ['Be3 — the bishop develops and guards d4. And because h3 came first, your knight can\'t come to g4 and hit it.', 'Be3 — guards d4, safe from …Ng4.'],
    ['…a4 — the pawn goes one step further and takes b3 away from their queen. It also freezes their b-pawn: b3 runs into a capture, and if it jumps two squares to b4, your a4 pawn takes it en passant.', '…a4 — freezes their b-pawn.'],
    ['Qc2 — the queen turns to your a4 pawn. Count it: their queen and the knight on c3 both hit it, and only your rook on a8 guards it. So a4 needs a second guard.', 'Qc2 — two hits on a4.'],
    ['…Qa5 — and there\'s the second guard. From a5 the queen also hits the knight on c3 and guards e5 along the rank. Your plan from here: …b5, opening the queenside where your queen on a5 and the a4 pawn are already waiting.', '…Qa5 — guards a4, hits c3.'],
  ],
  'Old Indian: Main Line with d5': [
    ['…a5 — this time the pawn goes before the knight. It takes b4 away from their b-pawn, so a knight that lands on c5 later can\'t be kicked by b4. If they take on c6, your b-pawn takes back.', '…a5 — covers b4 before the knight comes.'],
    ['a3 — they prepare b4 anyway, so the pawn can challenge your a5 pawn with support. The engine prefers Qc2; after a3 they are a little better.', 'a3 — prepares b4.'],
    ['…Nh5 — the knight heads for f4. But look at what it leaves behind: on h5 it has no guard, and only their knight on f3 stands between it and the bishop on e2. Remember that. The engine prefers …Nc5 here; after …Nh5 they are a little better.', '…Nh5 — eyes f4; …Nc5 was better.'],
    ['Nxe5 — and there it is. The knight grabs your e5 pawn and gets out of the bishop\'s way, so the bishop on e2 now hits your knight on h5. That\'s a discovered attack. So what do you do? If your d-pawn takes back, Bxh5 grabs the knight and you\'re simply a pawn down.', 'Nxe5 — a discovered attack on h5.'],
    ['…Nxe5 — so you take with the knight. And look at c4: your new knight on e5 hits it, and its only guard is the bishop on e2, the same bishop that wants to take your knight on h5. It can\'t do both. That\'s an overloaded piece.', '…Nxe5 — hits c4; the bishop is overloaded.'],
    ['Bxh5 — they take the knight, and the bishop on h5 hits f7, which your rook and king guard. But the bishop has left e2, so c4 now hangs.', 'Bxh5 — takes the knight; c4 hangs.'],
    ['…Nxc4 — and material is level again. Look at what the sequence did: a pair of knights is gone, along with your e5 pawn and their c4 pawn, and with e5 gone your dark-squared bishop isn\'t stuck behind it anymore. Your plan from here: when Be2 hits the knight, drop it back to b6, and bring the bishop to f6, where it sees all the way to their knight on c3.', '…Nxc4 — material level again.'],
  ],
  'Old Indian: Seirawan System': [
    ['Qc2 — the slower plan: no a3, just the queen to c2, where it gives e4 a second guard. It\'s the same queen move as the main line, only here your knight is still on d7.', 'Qc2 — a second guard on e4.'],
    ['…Qc7 — the same square as in the main line. The queen guards d6, a5 and your knight on d7, and it clears d8 for a rook.', '…Qc7 — guards d6 and a5.'],
    ['Be3 — the bishop develops and covers c5, the square your knight on d7 wants. If the knight lands there now, Bxc5 can trade it off.', 'Be3 — covers c5.'],
    ['…Ng4 — so you chase the bishop first. The knight hits it on e3, and if you capture there, the f-pawn has to take back and they get doubled pawns. And nothing of theirs can hit the knight on g4: the bishop on e2 is blocked by its own knight on f3.', '…Ng4 — chases the bishop on e3.'],
    ['Bd2 — the bishop keeps itself, stepping back to d2. But from there it no longer covers c5, so the road is clear for your other knight.', 'Bd2 — retreats; c5 is free.'],
    ['…Nc5 — the knight lands on c5, the same outpost as in the main line, hitting e4 and eyeing d3. Your plan from here: when h3 kicks your knight on g4, bring it back to f6 to hit e4 again, then follow with …Bd7 and the …cxd5 trade, so the c-file starts to open for your queen on c7.', '…Nc5 — the outpost again, hits e4.'],
  ],
  'Old Indian: Be2 Development': [
    ['Qc2 — the engine\'s top choice here: instead of closing the center with d5, they keep the tension and give e4 a second guard. Now it\'s on you to decide what happens between d4 and e5.', 'Qc2 — keeps the tension, guards e4.'],
    ['…a6 — the same idea as the Czech: get ready for …b5, which would hit c4. The a6 pawn makes sure b5 is covered twice.', '…a6 — prepares …b5.'],
    ['Rd1 — the rook goes behind their d4 pawn and guards it. And look down the d-file: at the other end sits your queen on d8, with the d4 and d6 pawns and your knight on d7 in between.', 'Rd1 — lines up with your queen.'],
    ['…Qc7 — why move the queen now? Picture dxe5 dxe5: the d-file opens, and your knight on d7 is pinned to the queen by the rook on d1, so it can\'t guard e5 and Nxe5 wins a pawn. So the queen steps off the file first, to c7, where it also guards the knight.', '…Qc7 — off the d-file, guards d7.'],
    ['Bg5 — the bishop develops and hits your knight on f6; your bishop on e7 stands behind it, so nothing is pinned. The engine prefers Be3; after Bg5 they are a little better.', 'Bg5 — hits the knight on f6.'],
    ['…Re8 — the rook comes to the e-file and gives your bishop on e7 a guard. It also clears f8, so the bishop can drop back there later, the same regrouping as in the Tartakower.', '…Re8 — guards e7, makes room on f8.'],
    ['Rac1 — their last piece comes into play, a rook on the c-file behind their queen. Every one of their pieces is developed now, and they\'re waiting to see what you do with the center.', 'Rac1 — every piece developed.'],
    ['…h6 — a question for the bishop on g5: take on f6, or back away? Your plan from here: if it retreats to e3, …Ng4 chases it again, and then the …exd4 trade half-opens the e-file for your rook on e8.', '…h6 — questions the bishop on g5.'],
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

export const OLD_INDIAN_DEFENCE_WATCH: WatchCourse = {
  openingId: 'old-indian-defence',
  title: 'Old Indian Defence — A Master Class',
  orientation: 'black',
  sources: ['book:old-indian-defence', 'concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Old_Indian_Defense'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
