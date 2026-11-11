// The Fantasy Variation against the Caro-Kann (the pro repertoire) — the Watch
// course, one beat a move (WO-OPENINGS-REWRITE-01). Written from the fact sheet:
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays White. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a). The last two tabs are lines taught for
// this opening in the repertoire's videos; where each of the others went is
// recorded in docs/levy-lines/decisions/pro-gothamchess-fantasy-caro.json.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'c6', 'd4', 'd5', 'f3', 'dxe4', 'fxe4', 'e5', 'Nf3', 'exd4', 'Bc4', 'Nf6', 'O-O', 'Bc5', 'Ng5', 'O-O', 'e5', 'd3+', 'Kh1', 'Ng4', 'Nxf7'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4: close to half the masters start here, and it's the engine's favorite first move. The pawn takes the center and opens the way for your queen and for the bishop on f1.", 'e4 — the center, and roads out.'],
  ["…c6, the Caro-Kann: about one master in twelve, where nearly half go for the Sicilian. Why such a modest move? It gets …d5 ready, so when the pawns meet, the c-pawn can take back on d5. And it keeps the road open for their bishop on c8 once the d-pawn moves.", '…c6 — the Caro-Kann, …d5 next.'],
  ["d4, eight masters in ten. Now you have two pawns side by side on e4 and d4, the classic center. And you already know what …c6 was for: …d5 is coming.", 'd4 — two pawns in the center.'],
  ["…d5, almost every master. The pawn hits e4, and right now nothing guards it. So what do you do with that pawn? Push it to e5, guard it with a knight, take on d5, or play the move this course is named for.", '…d5 — hits e4, which is loose.'],
  ["f3: the Fantasy. Only about three masters in a hundred play it; the engine prefers Nd2 or e5, and after f3 it's about level. So why play it? Look at e4: it has a pawn behind it now. If they take there, the f-pawn takes back, you keep two pawns side by side on d4 and e4, and the f-file opens up for your rook. And it sidesteps the Advance and the knight moves most masters choose. The price is your king: with the f-pawn gone from f2, the diagonal from h4 to e1 is open, so remember h4. Their queen would love to check you there.", 'f3 — the Fantasy, a pawn behind e4.'],
  ["…dxe4, about one master in five. Nearly half play …e6 instead, and the engine agrees with them. But they take, and their pawn on e4 now hits f3 with nothing behind it. So you take back, and how you take back is the whole point of f3.", '…dxe4 — they take; you take back.'],
  ["fxe4, almost every master, and the engine's clear choice. Look at what you have: two pawns on d4 and e4, and the f-file open for your rook once you castle. Leaving the pawn for a move with Bc4 is more than a pawn worse; the recapture always comes first.", 'fxe4 — two center pawns, f-file open.'],
  ["…e5, every master: the counter-punch. The pawn hits d4, and there's a trick behind it. Take on e5, and their queen checks on h4, down the diagonal f3 opened. So don't take. Guard d4, and do it in a way that also covers h4.", '…e5 — hits d4; don\'t take on e5.'],
  ["Nf3, almost every master. One move, three jobs: the knight guards d4, hits the pawn on e5, and covers h4, so the queen check is off the table. You are a little better.", 'Nf3 — guards d4, hits e5, covers h4.'],
  ["…exd4, about one master in seven. Six in ten pin your knight on f3 with …Bg4 instead, and the engine agrees. Now they're a pawn up, and the pawn on d4 can be taken back. But do you want to?", '…exd4 — a pawn up for them.'],
  ["No: Bc4, almost every master, and the engine's choice. You leave the pawn on d4 and put the bishop where it hits f7, a square only their king guards. That's the gambit: a pawn for time, open lines and a target, and you are still a little better.", 'Bc4 — leave d4, aim at f7.'],
  ["…Nf6, about a third of the masters, and the engine's pick. The knight develops and hits your e4 pawn, and nothing guards it now. It's about level, and both kings are still in the middle. So what comes first?", '…Nf6 — develops, hits e4.'],
  ["You castle, nearly nine masters in ten. The king is safe, and the rook lands on f1, right behind your knight on f3. Remember that: the moment the knight moves, the rook looks straight up the file at f7.", 'O-O — rook to f1, behind the knight.'],
  ["…Bc5, only one master in twenty; four in ten play …Nbd7, and the engine agrees with them. The bishop props up their pawn on d4, but their king is still on e8, and your knight on f3 is one jump from g5, where it would hit f7 too. After …Bc5 you are clearly better.", '…Bc5 — props up d4; …Nbd7 was better.'],
  ["Ng5, the move both master games here chose. Now f7 is hit twice, by the bishop and the knight, and only their king guards it. And look what the jump did for the rook on f1: with f3 empty, it sees all the way up to their knight on f6. You are clearly better.", 'Ng5 — f7 hit twice.'],
  ["…O-O: their king gets out of the middle, and the rook on f8 now guards f7. But look at the diagonal from c4. f7 sits right in front of their king on g8, so that pawn is pinned and can't move. You are clearly better.", '…O-O — castles, but f7 is pinned.'],
  ["e5: kick the defender. The pawn hits the knight on f6, and that knight is the only thing blocking your rook's view of f7. Wherever it goes, the rook on f1 joins in, and f7 is hit three times.", 'e5 — kicks the knight off the f-file.'],
  ["…d3 check! The d-pawn steps forward and uncovers their bishop on c5, aimed straight down the diagonal at your king on g1. The pawn on d3 hits c2 as well. The engine prefers …Nd5 for them, and after the check you are winning, if your king finds the right square. So where does it go?", '…d3+ — a discovered check from c5.'],
  ["Kh1, by far the best. Block with Be3, and their bishop takes it with check and then takes your knight on g5 too; Rf2 is just as bad. In the corner the king is safe, the attack on f7 is still there, and you are winning.", 'Kh1 — the king steps into the corner.'],
  ["…Ng4: the knight gets out of the pawn's way and jumps at e5 and h2. But look at what it left behind. With f6 empty, your rook on f1 sees f7, so bishop, knight and rook all hit f7, and only their rook and king guard it.", '…Ng4 — f7 now hit three times.'],
  ["Three on two, so take. Nxf7 grabs the pawn this whole line has been aiming at, and now the knight hits their queen on d8. Can they take back? Not with the king: your bishop and rook both guard f7. They can with the rook, but then Bxf7 comes with check, and you've won a rook and a pawn for your knight. You are clearly better. Your plan for the middlegame: after …Rxf7 Bxf7 check, win back the d3 pawn with your queen and play the exchange and a pawn up, with your rook on the open f-file.", 'Nxf7 — three on two; hits the queen.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Main Line 3...dxe4 4.fxe4': ['e4', 'c6', 'd4', 'd5', 'f3', 'dxe4', 'fxe4', 'e5', 'Nf3', 'exd4', 'Bc4', 'Nf6', 'O-O', 'Bc5', 'Ng5', 'O-O', 'e5', 'd3+', 'Kh1', 'Ng4', 'Nxf7'],
  'Solid 3...e6': ['e4', 'c6', 'd4', 'd5', 'f3', 'e6', 'Nc3', 'Bb4', 'Bf4', 'Ne7', 'Qd3', 'b6', 'Ne2', 'O-O', 'O-O-O', 'Ba6', 'Qe3', 'Bd6', 'h4', 'c5', 'Bxd6'],
  'Aggressive 3...g6': ['e4', 'c6', 'd4', 'd5', 'f3', 'g6', 'Nc3', 'Bg7', 'Be3', 'dxe4', 'fxe4', 'Nf6', 'Nf3', 'O-O', 'Bd3', 'Ng4', 'Bg1', 'e5', 'd5', 'Nf6', 'dxc6'],
  'Counter 3...Qb6': ['e4', 'c6', 'd4', 'd5', 'f3', 'Qb6', 'Nc3', 'dxe4', 'fxe4', 'e5', 'Nf3', 'exd4', 'Nxd4', 'Bc5', 'Na4', 'Qa5+', 'c3', 'Bd6', 'Nf3', 'Bc7', 'Qd4'],
  'Closed 3...g6 5.e5': ['e4', 'c6', 'd4', 'd5', 'f3', 'g6', 'Nc3', 'Bg7', 'e5', 'f6', 'f4', 'Nh6', 'Nf3', 'O-O', 'h3', 'Nf5', 'g4', 'Ng3', 'Rg1', 'Nxf1', 'Rxf1'],
  'Alien Gambit': ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Ng5', 'h6', 'Nxf7', 'Kxf7', 'Nf3', 'Bf5', 'Ne5+', 'Ke8', 'g4', 'Be4', 'Bc4', 'e6', 'f3'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The main line itself: every move is already said by MAIN_BEATS.
  'Main Line 3...dxe4 4.fxe4': [],
  'Solid 3...e6': [
    ["…e6, the most common answer: close to half the masters, and the engine's choice. The pawn props up d5, French-style, and it opens a road for their queen: d8 to h4 is clear now. So if they take on e4 and you take back, …Qh4 check is waiting. How do you take the sting out of that?", '…e6 — solid; the queen\'s road to h4.'],
    ["Nc3, nearly nine masters in ten, and the engine's choice. The knight hits d5 and guards e4 a second time. That's the answer to the queen check: if their queen ever lands on h4, you block with g3 and e4 still holds.", 'Nc3 — hits d5, guards e4.'],
    ["…Bb4, seven masters in ten and the engine's choice: the bishop pins your knight on c3 to your king. Now that knight's guard on e4 doesn't count for much. What do you do about the pin?", '…Bb4 — pins the c3-knight.'],
    ["Bf4, about a third of the masters, a few more than play Bd2. The bishop comes out to f4, covers e5, and looks down the diagonal toward b8. The engine prefers Bd2, which breaks the pin at once, and after Bf4 it's about level.", 'Bf4 — out early, covers e5.'],
    ["…Ne7, the engine's choice. Why not …Nf6? Because e5 would kick it straight back. From e7 the knight props up d5, and it can come to g6, where it would hit your bishop on f4.", '…Ne7 — dodges e5, eyes g6.'],
    ["Qd3: the queen guards e4 a third time and clears d1, so your king can castle long. It's about level, and the plan is taking shape: king to c1, pawns forward on the other wing.", 'Qd3 — guards e4, clears d1.'],
    ["…b6: their bishop on c8 is shut in behind the pawn on e6, so it takes the other road, through b7 or a6. Keep an eye on a6: from there it would hit your queen on d3.", '…b6 — the c8-bishop heads for a6.'],
    ["Ne2, the engine's choice. The knight backs up c3, so if they ever take there, a knight takes back and your pawns stay whole. It guards d4 and f4 as well, and you are a little better.", 'Ne2 — backs up c3, d4 and f4.'],
    ["…O-O: their king goes short. The engine prefers …c5 first, hitting d4 while your king is still in the middle. After castling you are a little better, and now you know where their king lives.", '…O-O — king short; …c5 was better.'],
    ["You castle long, onto the other wing. The rook lands on d1, behind your queen, and the pin is gone: their bishop on b4 has nothing left to pin. Kings on opposite sides means a race. Your pawns go at their king, theirs at yours.", 'O-O-O — opposite sides, the race is on.'],
    ["…Ba6, and there it is: the bishop hits your queen on d3. The queen has to move, and it's about level.", '…Ba6 — hits the queen on d3.'],
    ["Qe3, the engine's choice. The queen steps aside but keeps guarding e4, and from e3 it backs up the bishop on f4 and the knight on e2. It's about level.", 'Qe3 — steps aside, still guards e4.'],
    ["…Bd6: the bishop drops back and offers a trade with yours on f4. The engine prefers …c5, going at your center first, and after …Bd6 you are a little better.", '…Bd6 — offers the bishop trade.'],
    ["h4, the engine's choice: the first pawn of the storm. Their king is on g8, yours is on c1, so your h-pawn is free to run, and the rook on h1 is already behind it.", 'h4 — the storm begins.'],
    ["…c5, the engine's choice: they hit back at d4, on the side of the board where your king lives. You are a little better.", '…c5 — hits d4, near your king.'],
    ["Bxd6: take first. Your bishop on d6 hits b8, c5 and e7, so their queen takes back, and the dark-squared bishops are gone. You are a little better. Your plan for the middlegame: push the h-pawn on to h5 and h6 to pry at the squares around their king, and open the center with exd5 when it suits you.", 'Bxd6 — trades off the dark bishops.'],
  ],
  'Aggressive 3...g6': [
    ["…g6, about one master in seven. Their bishop is heading for g7, aimed at your d4 pawn. The engine prefers …e6, and after …g6 you are a little better.", '…g6 — the bishop heads for g7.'],
    ["Nc3, eight masters in ten and the engine's choice. The knight hits d5 and guards e4, so if they take on e4, you can take back with the knight or the pawn.", 'Nc3 — hits d5, guards e4.'],
    ["…Bg7, nearly every master: the bishop arrives on the long diagonal and hits d4. Right now only your queen guards that pawn, and it's about level. So, prop up d4, or shut the diagonal?", '…Bg7 — hits d4.'],
    ["Be3, nine masters in ten: prop it up. The bishop guards d4, so the long diagonal hits a wall. The other plan is to shut the diagonal with e5, and that is the engine's own first choice.", 'Be3 — props up d4.'],
    ["…dxe4, about a third of the masters. Four in ten play …Qb6 here, going after your b2 pawn, and the engine agrees with them. Their pawn on e4 hits f3, so you take back.", '…dxe4 — they take on e4.'],
    ["fxe4, the engine's choice. Back to the Fantasy picture: pawns on d4 and e4, and the f-file open. Taking with the knight is more than half a pawn worse.", 'fxe4 — the two-pawn center again.'],
    ["…Nf6, the engine's choice: the knight hits e4, which your knight on c3 guards. But look at the d-file. With the d-pawns gone from the middle, their queen on d8 hits d4 now.", '…Nf6 — hits e4; the queen hits d4.'],
    ["Nf3, the engine's choice: the last knight comes out, guarding d4 a third time and covering e5 and g5.", 'Nf3 — d4 guarded three times.'],
    ["…O-O: their king tucks in behind the bishop on g7. You are a little better, with every minor piece out but one, the bishop on f1.", '…O-O — their king goes short.'],
    ["So where does that last bishop go? Bd3 looks natural, but it does nothing about g4: their knight can jump there and hit your bishop on e3, which nothing guards. The engine wants Qd2, guarding e3, or h3, taking g4 away. After Bd3 it's only about level.", 'Bd3 — natural, but g4 is open.'],
    ["…Ng4, the engine's choice: the knight hits your bishop on e3 and the pawn on h2. Now they are a little better.", '…Ng4 — hits e3 and h2.'],
    ["Bg1, the engine's choice: the bishop backs all the way into the corner, but it still guards d4. Bd2 drops the d4 pawn, and Bf4 runs into …e5.", 'Bg1 — back, but still guards d4.'],
    ["…e5, the engine's choice: they strike at d4 with a pawn, backed by the bishop on g7 and the knight on g4. They are a little better.", '…e5 — the break at d4.'],
    ["d5, the engine's choice: push past instead of trading. The pawn hits c6, and with their pawn still on e5, the bishop on g7 stays shut out of the long diagonal. It's about level.", 'd5 — pushes past, hits c6.'],
    ["…Nf6, the engine's choice: the knight comes back and hits d5 and e4. But it leaves e5 with no guard, because the knight on f6 now blocks the bishop on g7. They are a little better.", '…Nf6 — hits d5 and e4.'],
    ["dxc6, the engine's choice: take on c6 before they take on d5. The pawn now hits b7, and you are a pawn up for the moment, but they are a little better. Your plan for the middlegame: drop the bishop back to f2, play h3 so their knight can't return to g4, and castle; their knights will aim at d4, so keep that square covered.", 'dxc6 — takes first, hits b7.'],
  ],
  'Counter 3...Qb6': [
    ["…Qb6, about one master in eight: the queen comes out early and hits b2 and d4 at once. Both are guarded for now, b2 by your bishop on c1 and d4 by your queen. It's about level.", '…Qb6 — hits b2 and d4.'],
    ["Nc3, eight masters in ten and the engine's choice: just develop. The knight hits d5 and guards e4, and b2 is still covered by the bishop on c1. Keep this knight in mind: from c3 it has a jump to a4, right next to their queen on b6.", 'Nc3 — develop; b2 stays guarded.'],
    ["…dxe4, seven masters in ten. Their pawn on e4 hits f3, so you take back.", '…dxe4 — they take on e4.'],
    ["fxe4, about half the masters. The engine prefers Bc4 first, leaving the pawn on e4 for a moment. But the recapture keeps the Fantasy shape: pawns on d4 and e4, and the f-file open. It's about level.", 'fxe4 — the two-pawn center.'],
    ["…e5, the engine's choice: the same counter-punch as the main line, but with their queen already on b6. Count the hits on d4: the pawn and the queen, against your queen alone.", '…e5 — d4 hit twice.'],
    ["Nf3: just like the main line, the knight guards d4, hits e5, and covers h4.", 'Nf3 — guards d4, hits e5.'],
    ["…exd4, the engine's choice: they take, and the pawn on d4 hits your knight on c3. How do you take back?", '…exd4 — hits the knight on c3.'],
    ["Nxd4: the knight takes back and lands in the center, hitting c6. The engine slightly prefers Qxd4, offering the queens off, and after Nxd4 it's about level.", 'Nxd4 — takes back, hits c6.'],
    ["…Bc5: the bishop piles onto your knight on d4. Count it: their queen and bishop hit it, and only your queen guards it. The engine prefers …Nd7. Can you see what the bishop just walked into?", '…Bc5 — piles onto d4.'],
    ["Na4! Remember that jump? The knight goes to the rim, and look at it: it hits the queen on b6 and the bishop on c5, the two pieces attacking your knight on d4. A fork, and it's about level.", 'Na4 — forks queen and bishop.'],
    ["…Qa5 check, the engine's choice: the queen gets out with a check and hits your knight on a4. You have to block, so make the block do some work.", '…Qa5+ — check, and hits a4.'],
    ["c3, the engine's choice: three jobs in one. It blocks the check, it guards your knight on d4, and it opens the diagonal so your queen on d1 guards the knight on a4. The c3 pawn is pinned to your king for now, but you are a little better.", 'c3 — blocks, guards d4 and a4.'],
    ["…Bd6, the engine's choice: the bishop on c5 was hit by your knight on a4, so it steps back to d6, where it aims at h2.", '…Bd6 — retreats, aims at h2.'],
    ["Nf3, the engine's choice: the knight steps back to guard h2, and stepping off d4 it opens the d-file. Now your queen on d1 hits their bishop on d6, and nothing guards it.", 'Nf3 — guards h2, opens the d-file.'],
    ["…Bc7: the bishop gets off the open file and still aims at h2. You are a little better.", '…Bc7 — off the d-file, still at h2.'],
    ["Qd4, the engine's choice: the queen takes the center and hits g7 and a7, and nothing guards g7. You are a little better. Your plan for the middlegame: bring the knight on a4 back through c5, push b4 to kick their queen off a5, and put your bishop on c4.", 'Qd4 — central queen, hits g7.'],
  ],
  'Closed 3...g6 5.e5': [
    ["e5, about one master in ten, and the engine's first choice: shut the diagonal. Now their bishop on g7 runs into your pawns on d4 and e5, and the pawn takes f6 and d6 away from their pieces. Next comes f4, propping up e5.", 'e5 — shut the center, blunt g7.'],
    ["…f6, half the masters and the engine's choice: hit the chain at its head. The pawn attacks e5 together with the bishop on g7, and only your d4 pawn guards it.", '…f6 — hits e5 twice.'],
    ["f4, the engine's choice: a second guard on e5. Yes, the f-pawn has moved twice now, but taking on f6 would release the tension, and the engine rates it worse. With pawns on d4, e5 and f4, the bishop on g7 is biting on a wall.", 'f4 — a second guard on e5.'],
    ["…Nh6, the engine's choice. With f6 taken by their own pawn, the knight goes the long way round: h6 now, f5 next, where it will hit d4.", '…Nh6 — heading for f5.'],
    ["Nf3: the knight guards d4 and e5, the two pawns their pieces are aiming at, and you are a little better.", 'Nf3 — guards d4 and e5.'],
    ["…O-O: their king tucks in behind the bishop on g7. It's about level. Now, what about that knight on h6? It wants f5, and maybe g4.", '…O-O — their king goes short.'],
    ["h3, the engine's choice: the pawn takes g4 away from their knight and from their bishop on c8. And it gets g4 ready for your own pawn.", 'h3 — takes g4 away.'],
    ["…Nf5, the engine's choice: the knight arrives and hits d4, and from f5 it also looks at e3 and g3. It's about level.", '…Nf5 — hits d4.'],
    ["g4 kicks the knight at once, but look where it can land: g3, hitting your rook and your bishop. The engine prefers Ne2 first, because from e2 the knight guards d4 and covers g3. After g4 it's about level.", 'g4 — kicks the knight; Ne2 first.'],
    ["…Ng3, the engine's choice: the knight forks your bishop on f1 and your rook on h1, and nothing of yours hits g3. Even so, it's about level.", '…Ng3 — forks f1 and h1.'],
    ["Rg1, the engine's choice: the rook gets off h1, and now it hits the knight on g3, which nothing guards. So the knight takes something on its way out.", 'Rg1 — saves the rook, hits g3.'],
    ["…Nxf1: the knight takes your bishop, and now the knight is the one standing on f1 with nothing behind it. It's about level.", '…Nxf1 — takes the bishop.'],
    ["Rxf1, the engine's choice: take back, and it's knight for bishop, about level. Your plan for the middlegame: Be3 to guard d4 and keep your wall on d4, e5 and f4, and watch for their breaks, …fxe5 and …c5.", 'Rxf1 — knight for bishop, about level.'],
  ],
  'Alien Gambit': [
    ["Nc3, about a quarter of the masters: the knight hits d5 and guards e4. It's a different road from f3, and it leads to a different gambit, one aimed at the same weak square, f7.", 'Nc3 — guards e4, a new road.'],
    ["…dxe4, nine masters in ten and the engine's choice: they take, and their pawn on e4 has nothing behind it.", '…dxe4 — they take on e4.'],
    ["Nxe4, every master: the knight takes back and sits in the center.", 'Nxe4 — the knight takes back.'],
    ["…Nf6, about one master in five: the knight hits yours on e4, which nothing guards. Most masters play …Bf5, but the engine likes …Nf6 best. So does your knight take, retreat, or jump forward?", '…Nf6 — hits the e4-knight.'],
    ["Ng5: forward. The knight jumps to g5 and hits f7 and h7. Nineteen masters in twenty simply trade on f6, and the engine agrees; after Ng5 it's about level. This is the first step of the Alien Gambit.", 'Ng5 — hits f7 and h7.'],
    ["…h6, nearly half the masters: the pawn hits your knight on g5, which only your bishop on c1 guards. Almost every master retreats the knight to f3 now. The Alien Gambit doesn't.", '…h6 — hits the knight on g5.'],
    ["Nxf7! The sacrifice: the knight takes on f7 and forks their queen on d8 and rook on h8. The masters' move is the quiet retreat, N5f3, and the engine agrees: after Nxf7 they are clearly better. You're giving a knight for a pawn and their king's cover, so play it as a gambit, where every move has to make a threat.", 'Nxf7 — the sacrifice, forks d8 and h8.'],
    ["…Kxf7, the engine's choice: the king takes the knight. They are clearly better, a knight for a pawn up, but their king is standing out on f7.", '…Kxf7 — the king takes.'],
    ["Nf3: the other knight comes out, and it's heading for e5, where it would check the king on f7. They are still clearly better, so every move from here has to keep up the pressure.", 'Nf3 — Ne5 check is coming.'],
    ["…Bf5: the natural move, developing the bishop and hitting c2. The engine prefers …c5, hitting d4 first. After …Bf5 they are still clearly better, but now your knight jumps in with check.", '…Bf5 — develops; …c5 was better.'],
    ["Ne5 check, the engine's choice: the knight lands in the center, guarded by your d4 pawn, checks the king on f7 and hits c6. Now they are only a little better.", 'Ne5+ — check, guarded by d4.'],
    ["…Ke8: the king goes back home. The engine prefers …Kg8, and after …Ke8 they are clearly better. But look at that king: it has moved, so it can never castle, and it's still sitting in the middle.", '…Ke8 — back home, no castling.'],
    ["g4: the pawn hits the bishop on f5, which nothing guards. The engine prefers Bc4 first, and after g4 they are clearly better, but their bishop has to move again.", 'g4 — hits the loose bishop.'],
    ["…Be4: the bishop jumps forward and hits c2 and your rook on h1, which nothing guards now that the g-pawn has moved. They are clearly better.", '…Be4 — hits the rook on h1.'],
    ["Bc4, the engine's choice: don't save the rook yet. The bishop covers e6 and f7, the squares next to their king, and f3 is coming to hit their bishop. They are a little better.", 'Bc4 — covers e6 and f7.'],
    ["…e6, the engine's choice: the pawn blocks your bishop's road to f7. But now that pawn is the target: the bishop on c4 hits it, and nothing guards it. They are a little better.", '…e6 — blocks c4, but it\'s loose.'],
    ["f3, the engine's choice: the pawn hits the bishop on e4 and shields your rook on h1. They are a little better. Your plan for the middlegame: once the bishop steps back, take the pawn on e6, and you have two pawns for the knight with their king stuck on e8.", 'f3 — hits the bishop, shields h1.'],
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

export const PRO_GOTHAMCHESS_FANTASY_CARO_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-fantasy-caro',
  title: "This repertoire's Fantasy Caro — the f3 Gambit and the f7 Attack",
  orientation: 'white',
  sources: [
    'book:caro-kann',
    'concept:pos-center',
    'concept:pos-development',
    'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation',
    'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
