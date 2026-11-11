// Benoni Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=benoni-defence`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. Standard: docs/OPENING-WATCH-BEATS.md; said in the think-out-loud
// register (the question the position asks, the tempting move and what it
// allows, the answer and what it sets up).
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6', 'Nf3', 'g6', 'e4', 'Bg7', 'Be2', 'O-O', 'O-O', 'Re8', 'Nd2', 'Na6', 'Re1', 'Nc7', 'a4', 'b6', 'h3', 'Rb8', 'Bb5', 'Re7', 'Bf1', 'a6', 'Nc4', 'b5', 'Na5', 'Bd7', 'Bf4', 'b4', 'Bxd6', 'Re8', 'e5', 'bxc3'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — they open with the queen's pawn, and look at the two squares it controls: c5 and e5. Keep that pawn in mind, because the whole Benoni is built around hitting it from the side.", "d4 — the queen's pawn takes the center."],
  ["…Nf6 — about six masters in ten start here. Why the knight before any pawn? It covers e4 and d5 at once, so they can't simply plant a second pawn on e4, and you keep your pawn moves in reserve.", "…Nf6 — covers e4 and d5."],
  ["c4 — about seven masters in ten claim more space this way. The pawn covers d5 and b5, and now two pawns stand in the middle. So how do you fight a center like that? Not head-on. You hit it from the side.", "c4 — more space, covers d5."],
  ["…c5 — and this is the Benoni. The pawn hits d4 from the side, and it has no guard. Can they just take it? After dxc5, …e6 opens the road for your bishop on f8, and it wins the pawn back on c5. The engine, and just over half the masters, prefer …e6 here; after …c5 they are a little better. What you buy is an unbalanced fight, and that is the whole spirit of this defence.", "…c5 — the Benoni: hit d4 from the side."],
  ["d5 — nine masters in ten push straight past. On d5 the pawn grabs space and takes c6 and e6 away from your pieces. And here's the consequence: your c-pawn can no longer trade itself for their d-pawn, so if you want to fight d5, it has to come from the other side.", "d5 — space; c6 and e6 covered."],
  ["…e6 — there's the other side. The pawn hits d5 and opens a diagonal for your bishop on f8. About half the masters offer a pawn with …b5 here instead; with …e6 you go straight at d5, planning to trade there and open the e-file.", "…e6 — hits d5 from the other side."],
  ["Nc3 — almost every master plays it, because the knight goes right to the fight: it adds a guard to d5 and covers e4, the square their e-pawn has its eye on.", "Nc3 — guards d5, covers e4."],
  ["…exd5 — almost every master takes now. Look what your pawn on d5 hits: c4, and nothing guards it. So they have to take back, and how they take back decides the structure.", "…exd5 — trade, and c4 hangs."],
  ["cxd5 — every master takes with the pawn. Why not the knight? After Nxd5 you trade it off, and most of their edge is gone. Now the Benoni structure is set: their pawn on d5 cramps you, the e-file is half-open for you and the c-file for them, and you have three pawns against two on the queenside. That queenside majority is your trump.", "cxd5 — the Benoni structure is set."],
  ["…d6 — nine masters in ten play it. The pawn stops d5 in its tracks, guards your c5 pawn and opens the diagonal for your bishop on c8. Next question: where does your other bishop belong?", "…d6 — blocks d5, guards c5."],
  ["Nf3 — the knight develops and covers e5. About six masters in ten push e4 first, and the order matters: with the knight still on g1, the f-pawn can join in with f4, and those setups have their own tabs.", "Nf3 — develops, covers e5."],
  ["…g6 — almost every master plays it, and that answers the question: the bishop goes to g7, on the long diagonal. Right now your knight on f6 is in its way, but the moment that knight steps aside, the bishop looks straight down at c3.", "…g6 — the bishop heads for g7."],
  ["e4 — a second pawn in the center, and now d5 has a pawn behind it. Masters split about evenly here between Bf4, e4 and Nd2, and the Bf4 and g3 setups have tabs of their own. With pawns on d5 and e4, the break they will aim for later is e5.", "e4 — big center, backs up d5."],
  ["…Bg7 — about three masters in four play it: the bishop takes its diagonal, and you are one move from castling. The other quarter play …a6 first, and here's why: with your king still on e8, Bb5 check is in the air, and a pawn on a6 takes b5 away.", "…Bg7 — long diagonal, castling next."],
  ["Be2 — a modest square, so they can castle. About a third of masters choose it, though the engine prefers Nd2 first, starting the knight on its way to c4. Remember that square: a knight on c4 is how they usually lean on your pawn on d6.", "Be2 — modest, castling next."],
  ["…O-O — almost every master castles here. Your king is safe, and the rook on f8 is one step from e8 and the half-open file. The engine prefers …Bg4 first, getting your light-squared bishop out with a hit on the knight on f3.", "…O-O — king safe, rook to e8 next."],
  ["Castle — their king joins yours on the kingside, as about four masters in five play it. The engine prefers Nd2 first, so that e4 has a second guard before your pieces line up on it.", "O-O — both kings safe."],
  ["…Re8 — where does your rook belong? On the half-open e-file. Now count on e4: your rook and your knight on f6 hit it, and only the knight on c3 guards it. About half the masters play this; the engine slightly prefers …a6, but the question you're asking is real, and they have to answer it.", "…Re8 — rook and knight hit e4."],
  ["Nd2 — nine masters in ten answer this way. The knight gives e4 its second guard and clears the way for the f-pawn, and from d2 it can reach c4, where it would lean on your pawn on d6. Keep an eye on that knight for the rest of the game.", "Nd2 — guards e4, heads for c4."],
  ["…Na6 — a knight on the rim? Here it's no accident. From a6 it's bound for c7, where it hits d5 and backs up the …b5 break. On d7, the masters' other choice, it would block your bishop on c8. Masters split almost evenly between the two.", "…Na6 — on its way to c7."],
  ["Re1 — the rook steps onto the e-file, facing yours. For now it sits behind the bishop on e2, but once that bishop moves, the rook backs up e4. About two masters in three give e4 a pawn guard with f3 here instead, and that line has its own tab.", "Re1 — the rook takes the e-file."],
  ["…Nc7 — the knight arrives, as almost nine masters in ten play it. It hits d5 and covers b5, and b5 is the whole point: that's where your queenside pawns want to break. Your plan from here: …a6 and …b5, with your rook behind the b-pawn, to put your extra queenside pawn to work.", "…Nc7 — hits d5, covers b5."],
  ["a4 — and there's their answer: the pawn covers b5. Almost nine masters in ten play it. This is the tug-of-war of the whole Benoni: you want …b5, they want to stop it, and the next moves are all about that one square.", "a4 — covers b5, against your break."],
  ["…b6 — just over half the masters play it. Why a quiet pawn move now? It gives c5 a second guard and opens b7 and a6 for your bishop on c8, your last minor piece still at home.", "…b6 — guards c5, frees the c8 bishop."],
  ["h3 — small but useful. The pawn takes g4 away from your bishop on c8 and your knight on f6, so neither can jump there. From here on, the line has left the masters' games.", "h3 — takes g4 away."],
  ["…Rb8 — the rook goes behind the b-pawn, so when …b5 comes it has support down the file. The idea is right, but the order is slow: the engine prefers …Bb7, getting your last minor piece out first, and now they are clearly better.", "…Rb8 — behind the b-pawn; …Bb7 first."],
  ["Bb5 — look where the bishop lands: on b5, the very square you've been preparing for your pawn, and it hits your rook on e8. Notice the side effect too: with e2 empty, their rook on e1 now backs up e4.", "Bb5 — hits e8, sits on b5."],
  ["…Re7 — the rook steps off the bishop's diagonal and still bears down on e4. Why not take the bishop with the knight? After …Nxb5 and the a-pawn recaptures, the a-file opens for their rook, and the engine likes that less for you.", "…Re7 — sidesteps, still hits e4."],
  ["Bf1 — the bishop drops all the way back. Why not c4? Your b-pawn would kick it there with …b5. From f1 it covers c4 and a6 instead. The engine prefers Nf3.", "Bf1 — retreats, covers c4."],
  ["…a6 — now everything is in place. The pawn covers b5, and count what else is aimed there: the knight on c7, and the rook on b8 standing behind the b-pawn. …b5 is loaded.", "…a6 — covers b5; …b5 is ready."],
  ["Nc4 — the knight finally lands on c4, and look what it hits: your pawns on d6 and b6. But it's standing right where …b5 can kick it. The engine prefers Nf3, and after Nc4 their edge shrinks to a little better.", "Nc4 — hits d6 and b6."],
  ["…b5 — there it is, the break you've been building since …Na6. The pawn hits the knight on c4 and the pawn on a4, and it's guarded three times. That's the queenside majority on the move.", "…b5 — the break, hitting c4 and a4."],
  ["Na5 — the knight gets out of the pawn's way, and look where it's heading: from a5 it eyes c6, and Nc6 would hit your queen on d8, your rook on b8 and your rook on e7 all at once. So before anything else, you have to deal with c6.", "Na5 — dodges, and eyes c6."],
  ["…Bd7 — how do you stop Nc6? Cover the square. Your bishop on d7 guards c6, so Nc6 now runs into …Bxc6, and your last minor piece is finally out.", "…Bd7 — covers c6, develops at last."],
  ["Bf4 — and now they turn on d6. The bishop hits it, and look: d6 has no guard left, because your bishop on d7 now stands between it and your queen. They are clearly better here, so passive defence won't do.", "Bf4 — hits d6, which has no guard."],
  ["…b4 — instead of guarding d6, you hit back: the pawn attacks the knight on c3. Why not defend with …Nfe8? Because Bg5 then hits your rook on e7, and you lose the exchange. With …b4, the game is about level.", "…b4 — counterattack the knight on c3."],
  ["Bxd6 — they take the pawn and leave their knight on c3 under attack. Why? Because the bishop now hits your rook on e7, a bigger piece than their knight, and your knight on c7 is pinned to the rook on b8. That's the counterattack rule: answer a threat with a bigger one. Still, you are clearly better.", "Bxd6 — hits e7, pins the c7 knight."],
  ["…Re8 — first the rook steps out of the bishop's reach, and …bxc3 is still waiting. Taking the knight right away would have dropped your rook to Bxe7. Now you are a little better, and the knight on c3 is still their problem.", "…Re8 — rook first, then the knight."],
  ["e5 — they hit back the same way you did: the pawn attacks your knight on f6 and guards their bishop on d6. Now both sides have a knight under attack, and it's your move. You are clearly better.", "e5 — hits f6, guards d6."],
  ["…bxc3 — you take first, and the pawn on c3 now hits b2. If they take your knight on f6, …cxb2 follows, and a pawn on b2 hits their rook on a1, one step from queening. You are clearly better. Your plan: get that pawn to b2 and use the time it costs them to bring your queen into the game.", "…bxc3 — wins the knight, eyes b2."],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move no earlier line shares. */
type TabBeats = Array<[string, string]>;

// The Czech Benoni (…e5) is not taught (2026-10-29, variationTabs.ts): the
// student is worse than −1.0 for most of the line, and its 19-ply line stops
// short of the lesson depth bar. It keeps no lesson, as before.

const TAB_LINES: Record<string, string[]> = {
  'Modern Main Line (Nd2/f3) with ...b5 Race': ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6', 'Nf3', 'g6', 'e4', 'Bg7', 'Be2', 'O-O', 'O-O', 'Re8', 'Nd2', 'Na6', 'f3', 'Nc7', 'a4', 'b6', 'Kh1', 'Qe7', 'Nc4', 'Ba6'],
  'Fianchetto Variation (g3/Bg2)': ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6', 'Nf3', 'g6', 'g3', 'Bg7', 'Bg2', 'O-O', 'O-O', 'Nbd7', 'Nd2', 'Re8', 'a4', 'Ne5'],
  'Classical Variation (Bf4 — d6 Pressure)': ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6', 'Nf3', 'g6', 'Bf4', 'Bg7', 'e3', 'O-O', 'Be2', 'Re8', 'Nd2', 'Na6', 'O-O', 'Nc7'],
  'Taimanov Variation (f4/Bb5+)': ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6', 'e4', 'g6', 'f4', 'Bg7', 'Bb5+', 'Nfd7', 'a4', 'O-O', 'Nf3', 'Na6', 'O-O', 'Nc7', 'Bd3', 'a6'],
  'Four Pawns Attack (...Ng4 Counter)': ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6', 'e4', 'g6', 'f4', 'Bg7', 'Nf3', 'O-O', 'Be2', 'Re8', 'e5', 'dxe5', 'fxe5', 'Ng4', 'Bg5', 'Qb6', 'O-O', 'Nxe5', 'Nxe5', 'Rxe5', 'Bf4', 'Re8'],
  'Snake Benoni (...Bd7-a4 Maneuver)': ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6', 'Nf3', 'g6', 'e4', 'Bg7', 'Be2', 'O-O', 'O-O', 'Re8', 'Nd2', 'Na6', 'Re1', 'Nc7'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Modern Main Line (Nd2/f3) with ...b5 Race': [
    ["f3 — the most popular move, about two masters in three. Instead of fighting for the e-file, they make e4 rock-solid: three guards now, the knights on c3 and d2 and the pawn on f3. And the pawn takes g4 away from your knight and bishop too.", "f3 — e4 rock-solid, g4 covered."],
    ["…Nc7 — almost every master plays it, and against f3 the plan doesn't change: the knight hits d5 and covers b5, getting ready for …b5. Why not b4 for the knight? a3 would just chase it back.", "…Nc7 — same plan: d5 and b5."],
    ["a4 — almost every master answers with the familiar clamp: the pawn covers b5, so …b5 will need more preparation.", "a4 — covers b5 again."],
    ["…b6 — about three masters in four play it. The pawn guards c5, and it opens the road for your bishop to a6, where it can trade itself for their bishop on e2 or for a knight that lands on c4. That's the idea of this tab: …b6 first, then …Ba6.", "…b6 — guards c5, prepares …Ba6."],
    ["Kh1 — prophylaxis. f3 opened the diagonal from g1 through f2, and the king steps off it before your pieces can ever use it. Most masters, about seven in ten, play Nc4 at once instead; the engine rates the two about the same.", "Kh1 — off the diagonal through f2."],
    ["…Qe7 — the queen steps in front of your rook on e8, so the two line up against e4, and it gives d6 a guard before their knight reaches c4. That's the move-order point: protect d6 first, then go after c4.", "…Qe7 — eyes e4, guards d6."],
    ["Nc4 — there's the knight on c4, hitting your pawns on d6 and b6. But thanks to …Qe7, d6 is covered, and the knight has just walked into the path of your bishop.", "Nc4 — hits d6 and b6."],
    ["…Ba6 — and there's the point of …b6: the bishop hits the knight on c4, the piece leaning on d6. Your plan from here: take on c4 when it suits you, then …a6 and …b5 to get your queenside pawns rolling.", "…Ba6 — hits the knight on c4."],
  ],
  'Fianchetto Variation (g3/Bg2)': [
    ["g3 — a quieter plan: their bishop heads for g2, and the e-pawn stays on e2 for now. About one master in eight plays it; the engine prefers Nd2. Without a pawn on e4, their d5 pawn will lean on that bishop instead.", "g3 — fianchetto, bishop to g2."],
    ["…Bg7 — almost every master plays it. A fianchetto against a fianchetto: your bishop on g7 faces the one they're about to put on g2, and your king can castle next.", "…Bg7 — fianchetto, castling next."],
    ["Bg2 — almost every master plays it. For now the bishop sits behind the knight on f3, but the moment that knight moves, it backs up d5 along the long diagonal.", "Bg2 — behind the knight, aimed at d5."],
    ["…O-O — almost every master castles here, and your king is safe behind the bishop on g7. Next question: where do your rook and your queen's knight go?", "…O-O — king behind the bishop."],
    ["Castle — almost every master does, and their king is safe on g1. With both kings tucked away, the game is about level.", "O-O — about level."],
    ["…Nbd7 — where should this knight go: a6 and c7, or d7 and e5? Here it's d7, a rare choice, about one master in fourteen; most play …Re8 first. On d7 the knight covers e5 and can jump there later, though for now it blocks your bishop on c8.", "…Nbd7 — covers e5, can jump there."],
    ["Nd2 — the knight steps aside, and now the bishop on g2 backs up d5. From d2 it eyes c4, the classic square against your d6 pawn. The engine prefers Bf4 here; the game is about level.", "Nd2 — frees the g2 bishop, eyes c4."],
    ["…Re8 — about a third of masters play it. The rook takes the half-open e-file and hits e2, so their e-pawn stays tied to its guards. Still about level.", "…Re8 — half-open file, hits e2."],
    ["a4 — the familiar clamp on b5, slowing your …b5 down. Almost half the masters play it; h3 is the other common choice.", "a4 — covers b5."],
    ["…Ne5 — the knight lands on the central square it was aiming for, and it contests c4, where their knight on d2 wants to go. It's a bit early, though: the engine prefers …a6 first, and after …Ne5 they are a little better. Your plan: bring the bishop on c8 out through d7, prepare …b5 with …a6 and …Rb8, and keep a square ready for the knight in case f4 kicks it.", "…Ne5 — central knight, contests c4."],
  ],
  'Classical Variation (Bf4 — d6 Pressure)': [
    ["Bf4 — the masters' most popular move here, about one in four. The bishop goes straight at d6, the pawn every Benoni has to look after. For now it holds, because your queen on d8 and your bishop on f8 both guard it. The engine prefers Nd2.", "Bf4 — straight at d6."],
    ["…Bg7 — careful with the count: your bishop leaves f8, so d6 drops to one guard, the queen, against one attacker. One is enough, and the engine likes …Bg7 best, though about six masters in ten play …a6 first.", "…Bg7 — d6 keeps one guard."],
    ["e3 — modest: the pawn frees the bishop on f1 and supports the bishop on f4, which already stands outside the pawn chain. About two masters in three check with Qa4 first; the engine prefers h3.", "e3 — frees f1, supports the bishop."],
    ["…O-O — almost every master castles here, getting your king out of the center before anything opens. The rook on f8 is ready for e8.", "…O-O — king safe, rook to e8."],
    ["Be2 — the bishop develops so they can castle; on b5 it would only be kicked by …a6. The engine prefers h3, keeping your bishop off g4, the square it now wants.", "Be2 — modest; h3 kept g4 covered."],
    ["…Re8 — the rook takes the half-open e-file and hits e3. Natural, but slow: the engine prefers …Nh5, chasing the bishop on f4, the piece that leans on d6. After …Re8 they are a little better.", "…Re8 — e-file; …Nh5 was sharper."],
    ["Nd2 — the knight heads for c4, where it will hit d6 a second time, and it covers e4 for their e-pawn. Now the plan is plain: bishop on f4, knight on c4, and your pawn on d6 under fire. They are clearly better.", "Nd2 — heading for c4 and d6."],
    ["…Na6 — the knight takes the long road to c7, where it will hit d5 and back up …b5. Can they take it? Bxa6 is possible, but after …bxa6 the b-file opens for your rook.", "…Na6 — on the road to c7."],
    ["Castle. Their king is safe on g1, and Nc4, hitting d6, is next on their list. They are clearly better.", "O-O — king safe, Nc4 next."],
    ["…Nc7 — the knight arrives and joins your knight on f6 against d5. Now they are only a little better. Your plan: when their knight reaches c4 and hits d6 twice, bring your bishop back to f8 to hold it, then free your game with …Ne4.", "…Nc7 — hits d5, eyes b5."],
  ],
  'Taimanov Variation (f4/Bb5+)': [
    ["e4 — about six masters in ten push the e-pawn before the knight comes to f3. Here's why the order matters: with the knight still on g1, nothing blocks the f-pawn, and the sharpest setups against the Benoni start with f4.", "e4 — knight stays home; f4 possible."],
    ["…g6 — almost every master plays it, and the bishop heads for g7. But watch their f-pawn: if it reaches f4, e5 becomes a threat against your knight on f6.", "…g6 — bishop to g7."],
    ["f4 — and there it is: three pawns side by side on d5, e4 and f4. About four masters in ten choose it, the most popular move here. The f-pawn backs up e5, and e5 would hit your knight on f6.", "f4 — three pawns, e5 next."],
    ["…Bg7 — almost every master plays it. The bishop develops so you can castle, and if e5 comes, your knight drops back to d7, where the knight and the bishop on g7 both hit that pawn.", "…Bg7 — ready for e5."],
    ["Bb5+ — the point of the whole setup, played by more than eight masters in ten. How do you answer the check? Block with the bishop or the queen's knight on d7, and e5 comes, hitting your knight on f6. So the knight on f6 itself has to block.", "Bb5+ — awkward check, e5 lurking."],
    ["…Nfd7 — nine masters in ten block this way. The knight now covers e5, so the e5 push has lost its sting, and with f6 cleared, your bishop on g7 looks straight at c3. The price: the knight is pinned to your king for now.", "…Nfd7 — blocks, and covers e5."],
    ["a4 — about six masters in ten play it. The pawn guards the bishop on b5 and grabs space on the queenside, so your …b5 ideas are on hold.", "a4 — guards b5, more space."],
    ["…O-O — castling breaks the pin: with your king off e8, the knight on d7 is free again. About two masters in three castle; a fifth first check with …Qh4 along the diagonal f4 opened, but g3 blocks it.", "…O-O — castles, and the pin is gone."],
    ["Nf3 — almost every master plays it. The knight backs up e5 and covers h4, so that queen check is off the table for good.", "Nf3 — backs e5, covers h4."],
    ["…Na6 — where does the queen's knight go? d7 is taken by the other knight, so it comes out by the rim, heading for c7, where it would challenge the bishop on b5.", "…Na6 — heading for c7."],
    ["Castle. Their king is safe on g1. And notice why your knight stays on d7: back on f6, it would walk straight into e5.", "O-O — and e5 still lurks."],
    ["…Nc7 — the knight hits the bishop on b5 and the pawn on d5 at once, and …a6 next would add a second attacker on that bishop. They are clearly better, but now they have to react.", "…Nc7 — hits b5 and d5."],
    ["Bd3 — the bishop steps back before …a6 can hit it. From d3 it guards e4 and covers c4, so your c-pawn stays where it is.", "Bd3 — guards e4, covers c4."],
    ["…a6 — the pawn covers b5 and prepares …b5. But this was the moment to strike in the center: the engine prefers …f5, hitting e4 before they can push e5, and after …a6 they are clearly better. Your plan: if they push f5, plant a knight on the e5 outpost, where no pawn of theirs can chase it, and keep preparing …b5 with …Rb8.", "…a6 — preparing …b5; …f5 was sharper."],
  ],
  'Four Pawns Attack (...Ng4 Counter)': [
    ["Nf3 — the knight develops behind the pawns, ready to support e5. More than eight masters in ten check with Bb5 here instead, and the engine agrees; after Nf3 the game is about level.", "Nf3 — develops, supports e5."],
    ["…O-O — almost every master castles at once, so your king is safe before the center opens. The rook on f8 heads for e8 next.", "…O-O — king safe first."],
    ["Be2 — more than nine masters in ten play it. Why not the more active d3? Because there …c4 would hit the bishop and gain you time.", "Be2 — out of …c4's reach."],
    ["…Re8 — about a third of masters play it, and nearly half go …Bg4. Count on e4: your rook and your knight on f6 hit it, and only the knight on c3 guards it. They have to do something, and the usual something is e5.", "…Re8 — two hits on e4."],
    ["e5 — about three masters in four push. The pawn hits your knight on f6 and your pawn on d6 at once. Do you have to retreat the knight? No — take first.", "e5 — hits f6 and d6."],
    ["…dxe5 — almost every master takes. Your pawn on e5 now hits f4, so they have to recapture. The trade does give them a passed pawn on d5, with nothing in front of it, so remember that pawn later.", "…dxe5 — hits f4, frees their d-pawn."],
    ["fxe5 — every master takes back, and the pawn hits your knight on f6 again. The tempting escape, …Nxd5, just drops the knight to Qxd5. So where does it go?", "fxe5 — hits f6 again."],
    ["…Ng4 — forward, not back. Almost every master plays it, and here's the point: the knight hits e5, and so do your rook on e8 and your bishop on g7. Three attackers against one guard, the knight on f3. This is the counter the tab is named for.", "…Ng4 — three hits on e5."],
    ["Bg5 — the bishop hits your queen on d8, and that defends e5 in a sneaky way: take on e5 now, and Bxd8 wins your queen. The engine much prefers the push e6; after Bg5 the game is about level.", "Bg5 — hits d8, so e5 is taboo."],
    ["…Qb6 — the queen steps out of the attack with a threat of its own: it hits b2, and nothing guards that pawn. Meanwhile e5 is still attacked three times. Now you are a little better.", "…Qb6 — escapes and hits b2."],
    ["Castle. Their king is safe on g1, but b2 still has no guard and e5 is still outnumbered. You are a little better, and you get to choose which pawn to take.", "O-O — b2 still loose."],
    ["…Nxe5 — you take e5, and the knight now hits the knight on f3. Yours is guarded by the rook and the bishop, so a trade there just leaves you a pawn up.", "…Nxe5 — wins e5, hits f3."],
    ["Nxe5 — they trade knights, and for a moment their knight on e5 hits your pawns on f7 and g6. You simply take it back.", "Nxe5 — trades; take back."],
    ["…Rxe5 — the rook takes back, and look what it hits: the bishop on g5, which has no guard, and the pawn on d5. The engine slightly prefers …Bxe5, but you are a pawn up and the game is about level.", "…Rxe5 — hits the loose bishop on g5."],
    ["Bf4 — the bishop escapes with a hit on your rook on e5. Qd2 was the better way: it guards the bishop and the b2 pawn at the same time. Now b2 is still loose, and you are a little better.", "Bf4 — hits e5; Qd2 was better."],
    ["…Re8 — the rook drops back and hits the bishop on e2. The engine prefers grabbing the free pawn first with …Qxb2. You are a pawn up and a little better. Your plan: develop with …Bf5 and …Nd7, keep their passed d-pawn blockaded with your rooks, and collect b2 when it's safe.", "…Re8 — hits e2; …Qxb2 was first."],
  ],
  'Snake Benoni (...Bd7-a4 Maneuver)': [],
};

/** File a tab's beats on the first moves it doesn't share with what is already written. */
for (const [tab, moves] of Object.entries(TAB_LINES)) {
  const own = TAB_BEATS[tab] ?? [];
  let k = 0;
  while (k < moves.length && beats[moves.slice(0, k + 1).join(' ')]) k += 1;
  if (own.length !== moves.length - k) throw new Error(`${tab}: ${own.length} beats for ${moves.length - k} unshared moves`);
  own.forEach(([say, sayShort], i) => { beats[moves.slice(0, k + i + 1).join(' ')] = { say, sayShort }; });
}

export const BENONI_DEFENCE_WATCH: WatchCourse = {
  openingId: 'benoni-defence',
  title: 'Benoni Defence — A Master Class',
  orientation: 'black',
  sources: ['concept:pos-space', 'concept:pos-initiative', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
