// GothamChess's French Defense — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet (`LESSON_FACTS=1
// LESSON_IDS=pro-gothamchess-french-defense`): masters' percentages, engine
// lines at a fixed depth, the board after each move. The student plays Black.
// The last five tabs are lines he teaches (docs/levy-lines/decisions).
// Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register
// (§2a).
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Nxf6+', 'gxf6', 'Nf3', 'Nc6', 'g3', 'e5', 'Bg2', 'Bg4', 'h3', 'Be6', 'Be3', 'e4'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["They start with e4, close to half of all master games, and the engine's favorite first move. The pawn takes the center and opens lines for their queen and for the bishop on f1. Your reply decides what kind of game this will be.", 'e4 — they take the center.'],
  ["…e6, the French, about one master in eight. The engine prefers …e5 or …c5, and after …e6 they are a little better. So why play it? It prepares …d5, with the e6 pawn ready to back it up. The price is right there on the board: your bishop on c8 is shut in behind its own pawn. Keep an eye on that bishop, because a lot of the French is about getting it out.", '…e6 — the French, …d5 is next.'],
  ["d4, nine masters in ten: with nothing hitting e4 yet, they take the whole center, two pawns side by side on d4 and e4. Now it's your turn to challenge it.", 'd4 — two pawns in the center.'],
  ["…d5, nearly every master: here's the point of …e6. The pawn hits e4, and nothing guards it. If they take on d5, your e-pawn takes back and you still have a pawn in the middle. So they have to choose: guard e4, push it past you, or trade it.", '…d5 — hits e4, which nothing guards.'],
  ["Nc3, about half the masters and the engine's choice: the knight guards e4 and puts a second attacker on your d5 pawn. The knight to d2, the Tarrasch, is the other big road, about three in ten. So what do you do about d5? Hold it, pin the knight, or let the tension go?", 'Nc3 — guards e4, hits d5.'],
  ["Do you have to hold d5? No: …dxe4, the Rubinstein. The pawn takes on e4 and the knight will take back, so the tension is gone. Only about one master in twelve plays it; most pin with …Bb4 or play …Nf6, and the engine prefers …Nf6. What you get is a simple, open center with no pawn chain on e5 to worry about.", '…dxe4 — the Rubinstein: release the tension.'],
  ['Nxe4, every master: the knight takes back and sits right in the middle of the board on e4. Material is level. How do you challenge a knight like that?', 'Nxe4 — a knight on e4.'],
  ["Straight at it: …Nf6 hits the knight on e4, and nothing guards it. Six masters in ten play …Nd7 first, so a knight can take back if they trade on f6; only about four in a hundred go …Nf6 at once, and the engine rates the two about the same. Here's the idea: you're happy for them to trade, because of how you'll take back.", '…Nf6 — challenge the e4 knight.'],
  ['Nxf6 check, seven masters in ten: they take the trade, and the knight on f6 checks your king. Now the question this whole line turns on: which piece takes back?', 'Nxf6+ — the trade, with check.'],
  ["…gxf6: take back with the g-pawn. About half the masters do; the rest take with the queen, which the engine slightly prefers. Yes, your f-pawns are doubled on f7 and f6. But look at what you get. The g-file opens for a rook aimed at their kingside, and the pawn on f6 guards e5, so the …e5 break can come. A damaged structure for open lines and a central break: that's the deal this whole repertoire is built on.", '…gxf6 — the g-file, and f6 guards e5.'],
  ["Nf3, the engine's choice: the knight develops and covers e5, the square your f6 pawn wants to support. So the fight is set: they want e5 under control, you want …e5.", 'Nf3 — develops, covers e5.'],
  ["…Nc6, the engine's choice: the knight hits d4 and puts a second guard on e5, backing up the break.", '…Nc6 — hits d4, backs up …e5.'],
  ['g3: they get ready to put the bishop on g2. It is slow, and the engine prefers Bc4 or c3. Slow moves give you time, and you know what it is for: the break on e5.', 'g3 — slow; Bc4 was better.'],
  ["…e5, the engine's choice: there it is, the break your f6 pawn and your knight on c6 prepared. The pawn hits d4. Now count: your e5 pawn, your knight and your queen down the d-file all hit d4, and it has two guards, the knight on f3 and their queen.", '…e5 — the break, hits d4.'],
  ['Bg2: the bishop takes the long diagonal, but it does nothing for d4. Three of your pieces hit that pawn and only two guard it, so d4 is simply hanging. The engine prefers Be3, a third guard. As played, it is about level.', 'Bg2 — natural, but d4 hangs.'],
  ["…Bg4: the bishop pins the knight on f3 to their queen. It looks active, but there was a simpler move: …Nxd4 just takes the pawn, and the engine rates it most of a pawn better. After …Bg4 they are a little better. Still, notice what the pin does: while it holds, the knight on f3 can't take on d4 without dropping their queen on d1.", '…Bg4 — the pin; …Nxd4 was better.'],
  ["h3, the engine's choice: they put the question to the bishop on g4 right away. Take on f3, or step back?", 'h3 — asks the bishop on g4.'],
  ['…Be6: the bishop steps back, and from e6 it eyes a2 and h3. Giving it up with …Bxf3 to win the d4 pawn is just as good, and that is the other road from here. With …Be6 you keep the bishop and the tension.', '…Be6 — steps back, keeps the bishop.'],
  ["Be3, the engine's choice: the bishop finally gives d4 its third guard, and the pawn is safe for now.", 'Be3 — a third guard on d4.'],
  ["…e4, the engine's choice: if you can't win d4, kick away one of its guards. The pawn hits the knight on f3, and it has to move. They are a little better. Your plan for the middlegame: …f5 to prop up the pawn on e4 before their bishop on g2 can hit it, castle long, and bring a rook to g8 on the half-open g-file, aimed at g3 and their kingside.", '…e4 — kicks the knight off f3.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Rubinstein Main Line': ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Nxf6+', 'gxf6', 'Nf3', 'Nc6', 'g3', 'e5', 'Bg2', 'Bg4', 'h3', 'Bxf3', 'Bxf3', 'Qxd4', 'Qe2', 'O-O-O', 'O-O', 'Qd7', 'Bg2', 'Rg8', 'Qh5', 'Qe6', 'Be3', 'Bd6', 'c4', 'f5', 'Bd5', 'Qg6', 'Qxg6', 'Rxg6'],
  'Tarrasch (Nd2)': ['e4', 'e6', 'd4', 'd5', 'Nd2', 'dxe4', 'Nxe4', 'Nf6', 'Nxf6+', 'gxf6', 'Nf3', 'Nc6', 'g3', 'e5', 'd5', 'Nb4', 'c4', 'Bf5', 'Qa4+', 'b5', 'cxb5', 'Qxd5', 'b6+', 'c6'],
  'Exchange (exd5 lines)': ['e4', 'e6', 'd4', 'd5', 'exd5', 'exd5', 'Nf3', 'Bd6', 'Bd3', 'Bg4', 'O-O', 'Ne7', 'Re1', 'Nc6', 'Bg5', 'f6', 'Bh4', 'Qd7', 'c3', 'O-O-O', 'Nbd2', 'g5', 'Bg3', 'h5'],
  'Advance …Qb6': ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Be2', 'Nh6', 'Bxh6', 'gxh6', 'Qd2', 'Bg7', 'Na3', 'cxd4', 'cxd4', 'Qb4'],
  'Classical Steinitz': ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'e5', 'Nfd7', 'f4', 'c5', 'Nf3', 'Nc6', 'Be3', 'Be7', 'Qd2', 'O-O', 'dxc5', 'Nxc5', 'O-O-O', 'Qa5'],
  'Rubinstein …Nd7': ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7', 'Nf3', 'Ngf6', 'Nxf6+', 'Nxf6', 'Bd3', 'b6', 'O-O', 'Bb7', 'Qe2', 'Bd6', 'Ne5', 'O-O'],
  'Tarrasch …c5': ['e4', 'e6', 'd4', 'd5', 'Nd2', 'c5', 'exd5', 'Qxd5', 'Ngf3', 'cxd4', 'Bc4', 'Qd6', 'O-O', 'Nf6', 'Nb3', 'Nc6', 'Nbxd4', 'Nxd4', 'Nxd4', 'a6'],
  'Rubinstein …b6': ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Nxf6+', 'gxf6', 'Nf3', 'b6', 'Bd3', 'Bb7', 'Qe2', 'Nc6', 'c3', 'Qd7', 'O-O', 'O-O-O'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Rubinstein Main Line': [
    ["Here's the other road: …Bxf3, the engine's top choice by a hair. Why give up the bishop for the knight? Because the knight on f3 was one of d4's two guards. Whichever piece takes back, d4 is short of guards, and your queen and knight are waiting for it.", '…Bxf3 — remove a guard of d4.'],
    ['Bxf3: they take back with the bishop, which now aims at your knight on c6. The engine prefers Qxf3. Either way, look at d4: three of your pieces hit it, and only their queen guards it.', 'Bxf3 — Qxf3 was better; d4 is weak.'],
    ["…Qxd4, the engine's choice: the pawn is yours. Your queen lands in the center and hits b2, f2 and their queen on d1. It's about level, and now they have to decide whether to trade queens.", '…Qxd4 — a pawn up, a central queen.'],
    ["Qe2, the engine's choice: they keep the queens on, and their queen pins your e5 pawn to your king on e8. That pin is your cue to get the king out of the center.", 'Qe2 — pins e5 to your king.'],
    ["…O-O-O: castle long. Your king steps out of the pin, and your rook lands on d8, on the open d-file behind your queen. Why the queenside? Because the g-file is half-open on the other wing, and that's where your rooks will attack, not where your king wants to live.", '…O-O-O — out of the pin, rook to d8.'],
    ['They castle short, but walk into a pin: your queen on d4 now pins their f2 pawn to the king on g1. The engine prefers Bxc6 first, doubling your c-pawns. As played, you are a little better.', 'O-O — f2 is pinned; Bxc6 was better.'],
    ["…Qd7, the engine's choice: the queen steps back from the center and hits h3, a pawn nothing guards. You are a little better.", '…Qd7 — hits the loose h3 pawn.'],
    ['Bg2: the bishop comes back to guard h3, and it aims at your knight on c6 again. The engine prefers Be3, getting the last piece out. You are a little better.', 'Bg2 — guards h3; Be3 was better.'],
    ["…Rg8: here's the payoff for …gxf6. The rook takes the half-open g-file and hits g3, with their bishop on g2 and their king on g1 right behind it. The engine rates it about as good as …Qe6.", '…Rg8 — the g-file, aimed at g3.'],
    ['Qh5: their queen jumps out at your pawns, hitting e5, f7 and h7, and h7 has no guard. The engine prefers Be3, finishing development. You are a little better.', 'Qh5 — hits h7, e5 and f7.'],
    ['Do you have to save h7? Not right now. …Qe6 points the queen at a2 and h3 and keeps guard on e5 and f7. The engine slightly prefers …Bd6, getting the last piece out first. You are a little better.', '…Qe6 — guards e5 and f7.'],
    ["Be3, the engine's choice: their last minor piece comes out, and the bishop hits a7, which your knight on c6 guards. It's about level.", 'Be3 — develops, hits a7.'],
    ["…Bd6, the engine's choice: the bishop guards e5 once more and clears f8, so your rooks on d8 and g8 are connected. You are a little better.", '…Bd6 — guards e5, connects the rooks.'],
    ["c4, the engine's choice: the pawn covers d5, a square for their bishop. It's loose on c4, though: your queen hits it and nothing guards it.", 'c4 — covers d5, but it is loose.'],
    ["So why not just take on c4? Because the engine rates …Qxc4 worse by nearly half a pawn. …f5 is its choice: the pawn takes e4 and g4 away from their pieces, and your doubled pawn finally moves. You are a little better.", '…f5 — not …Qxc4; covers e4 and g4.'],
    ["Bd5, the engine's choice: the bishop lands on the square c4 prepared, and it hits your queen on e6 and your knight on c6. But see what it left behind: with g2 empty, your rook on g8 now pins their g3 pawn to the king.", 'Bd5 — hits e6 and c6; g3 is pinned.'],
    ["…Qg6, the engine's choice: the queen steps out of the attack and offers a trade, hitting their queen on h5, which nothing guards. One thing to watch: your f7 pawn is now pinned to your rook on g8 by the bishop on d5.", '…Qg6 — offers the queen trade.'],
    ["Qxg6, the engine's choice: they trade queens on g6. Now, which way do you take back: with the rook, the h-pawn or the f-pawn?", 'Qxg6 — the queens come off.'],
    ["…Rxg6, the engine's choice: the rook takes back and stays on the g-file, still pinning their g3 pawn to the king. The h-pawn recapture is about half a pawn worse, the f-pawn worse still. You are a pawn up and a little better, though your f7 pawn is loose to the bishop on d5. Your plan from here: if their bishop takes on f7, the rook swings to f6 and hits it, and …f4 comes at their g3 pawn and the bishop on e3.", '…Rxg6 — keeps the pin on g3.'],
  ],
  'Tarrasch (Nd2)': [
    ["Nd2, the Tarrasch, about three masters in ten. The knight guards e4 from d2 and keeps the c-pawn free to come to c3. The cost: unlike a knight on c3, it doesn't hit your d5 pawn. The engine prefers Nc3; after Nd2 it's about level.", 'Nd2 — the Tarrasch, guards e4.'],
    ['…dxe4: the same Rubinstein trade as against Nc3. The pawn takes on e4 and the knight will take back. About one master in twelve plays it here; the engine prefers …c5, hitting d4 at once, and after …dxe4 they are a little better.', '…dxe4 — the Rubinstein trade again.'],
    ["Nxe4, every master: and look at the board. It's exactly the position the main line reaches after Nc3, the knight on e4 by way of d2 instead. Everything you know from there applies.", "Nxe4 — the main line's position again."],
    ['…Nf6: the same challenge. The knight goes after the one on e4, which nothing guards. …Nd7 first is six masters in ten, and the engine rates the two about the same.', '…Nf6 — challenge e4 again.'],
    ['Nxf6 check, seven masters in ten: the trade comes, with check from f6.', 'Nxf6+ — the trade.'],
    ['…gxf6, just as in the main line, and for the same reasons: the half-open g-file for your rook, and a pawn on f6 that guards e5 for the coming break. About half the masters do it.', '…gxf6 — the g-file and e5 again.'],
    ["Nf3, the engine's choice: the knight develops and covers e5, the square your …e5 break needs.", 'Nf3 — covers e5.'],
    ["…Nc6, the engine's choice: the knight hits d4 and backs up …e5, the break you're building toward.", '…Nc6 — hits d4.'],
    ['g3: the fianchetto again, and again a little slow. The engine prefers Bc4 or c3, getting a piece out, and that gives you time for your break against d4.', 'g3 — slow again.'],
    ["…e5, the engine's choice: the break, and it hits d4. Three of your pieces are on that pawn now, and only the knight on f3 and their queen guard it.", '…e5 — three hits on d4.'],
    ['d5: instead of guarding d4, they push past it and hit your knight on c6. It gains a tempo, but it gives up the center for good. The engine prefers Be3 by a full pawn. You are a little better. So where does the knight go?', 'd5 — hits c6; Be3 was better.'],
    ["Not back, but forward: …Nb4, the engine's choice. From b4 the knight hits a2, d5 and c2. Look hard at c2: only their queen guards that pawn, and a knight landing there would check the king on e1 and hit the rook on a1 at the same time.", '…Nb4 — eyes c2, d5 and a2.'],
    ['c4: the pawn props up d5, but it came from c2, and now c2 is an empty square with only their queen watching it. The engine prefers a3, kicking your knight away first. You are clearly better.', 'c4 — guards d5, empties c2.'],
    ["…Bf5, the engine's choice: the bishop joins in on c2. Now your knight and bishop both hit that square and only their queen guards it, so …Nc2 check, hitting the king and the rook on a1, is a real threat. You are clearly better.", '…Bf5 — a second hit on c2.'],
    ["Qa4 check: they try to break out with tempo, checking your king and going after the knight on b4. It's a mistake. The engine prefers Nh4, chasing your bishop, and now you are winning. How do you answer the check?", 'Qa4+ — check, hits b4; a mistake.'],
    ["…b5, the engine's choice: block the check with a pawn that hits their queen on a4 and the pawn on c4. Yes, the b5 pawn is pinned to your king. But a pinned piece can still capture the piece that pins it, so …bxa4 is a real threat. You are winning.", '…b5 — blocks, and hits the queen.'],
    ['cxb5: the pawn takes yours, and their queen is safe again. But the c4 pawn was the guard of d5, and their queen has left d1, so now d5 has no guard at all. The engine prefers Qxb5 check. You are winning.', 'cxb5 — saves the queen, drops d5.'],
    ["…Qxd5: the queen grabs the pawn and hits the knight on f3, which nothing guards. Strong, but the engine found even more: …Nc2 check first, and after Qxc2 your bishop on f5 takes their queen. You are winning.", '…Qxd5 — hits f3; …Nc2+ was stronger.'],
    ['b6 check: the pawn steps off the diagonal and uncovers their queen on a4 against your king, a discovered check, and the pawn hits a7 and c7 too. The engine prefers Be2, guarding the knight on f3. You are winning.', 'b6+ — a discovered check from a4.'],
    ["…c6: block with the pawn. The engine prefers …Bd7, but you are winning either way: the knight on f3 and the pawn on b6 are both loose, and …Nc2 check is still there. Your plan for the middlegame: keep checking, …Nc2 and …Bh3 to drive their king around while it is still in the center, and then collect the loose pieces.", '…c6 — blocks; you are winning.'],
  ],
  'Exchange (exd5 lines)': [
    ["exd5, the Exchange, about six masters in a hundred: they release the tension at once and take on d5. The engine prefers Nc3, and this gives you an easy game, because of how you take back.", 'exd5 — the Exchange, tension gone.'],
    ["…exd5, nearly every master: the e-pawn takes back, and look at your bishop on c8. The pawn on e6 that shut it in is gone, and the diagonal to g4 is open. The French's problem piece is free. It's about level, and the pawns are symmetrical.", '…exd5 — your c8 bishop is free.'],
    ["Nf3, a little more than half the masters and the engine's choice: the knight develops and covers e5. c4, about one master in ten, is the sharper try, hitting your d5 pawn.", 'Nf3 — develops, covers e5.'],
    ["…Bd6, the engine's choice and about three masters in ten: the bishop takes its best diagonal and aims at h2. …Nf6 is a little more common.", '…Bd6 — aims at h2.'],
    ["Bd3, the engine's choice and about three masters in ten: they mirror you, the bishop aimed at h7. Most masters play c4 here instead.", 'Bd3 — the mirror, aims at h7.'],
    ['…Bg4, about one master in ten: here is the bishop that was shut in at the start, pinning the knight on f3 to their queen. Active, but early: the engine prefers …Nf6, and after …Bg4 they are a little better.', '…Bg4 — pins the knight; …Nf6 was better.'],
    ['They castle, nearly two masters in three: the king goes to g1, and their rook gets ready for the open e-file.', 'O-O — king safe, rook to e1.'],
    ["…Ne7, the engine's choice: the knight heads for f5 or g6, and your f-pawn stays free to move. Notice, though, that it now stands on the open e-file in front of your king on e8.", '…Ne7 — toward f5, f-pawn free.'],
    ["Re1: there's the pin. The rook takes the open e-file and pins your knight on e7 to your king. Now it's a pin for a pin: your bishop on g4 holds their knight on f3. The engine slightly prefers h3, asking your bishop the question first.", 'Re1 — pins the knight on e7.'],
    ["…Nc6, the engine's choice: the other knight develops and hits d4. Now count: your knight hits d4, and its only guard is the knight on f3, the one your bishop pins to their queen. So …Nxd4 is a threat: if their knight takes back, your bishop takes the queen on d1.", '…Nc6 — hits d4; f3 is pinned.'],
    ['Bg5: they pile on the knight on e7, now pinned to your king by the rook and to your queen by the bishop. But it does nothing for d4. The engine prefers c3, guarding it, and as played you are a little better.', 'Bg5 — pins e7 again, ignores d4.'],
    ['…f6: the natural move, kicking the bishop off g5. But it misses the point of …Nc6: …Nxd4 just wins a pawn, because the knight on f3 can\'t take back without losing their queen to your bishop on g4. The engine rates …Nxd4 about a pawn better; after …f6 it is about level.', '…f6 — kicks g5; …Nxd4 was stronger.'],
    ['Bh4: the bishop steps back and hits your f6 pawn, but its pin on e7 is gone, since f6 now blocks the diagonal. And d4 is still guarded only by the pinned knight. The engine prefers Be3. As played, you are clearly better.', 'Bh4 — d4 is still weak.'],
    ["…Qd7: the queen clears d8 so you can castle long. Once again, though, …Nxd4 was there, and the engine rates it about a pawn better. Here's the habit: when a piece is pinned, ask what it was guarding. It's about level.", '…Qd7 — ready to castle; …Nxd4 again.'],
    ["c3, the engine's choice: d4 finally gets a pawn guard, and that chance is gone.", 'c3 — d4 is guarded now.'],
    ["…O-O-O, the engine's choice: castle long, and the pin on your knight on e7 goes with the king. Their king is on g1 and yours on c8: opposite sides, which usually means each side throws its pawns at the other king.", '…O-O-O — opposite sides.'],
    ['Nbd2: their last knight comes out to d2. The engine prefers Bg3 first, offering a trade of bishops on d6. It is about level.', 'Nbd2 — develops; Bg3 was better.'],
    ['…g5: here comes the storm, and it kicks the bishop off h4 with tempo. The engine prefers …Nf5 first, hitting the bishop on h4 and the d4 pawn at once. It is about level.', '…g5 — the storm starts, hits h4.'],
    ["Bg3, the engine's choice: the bishop retreats and offers a trade with yours on d6.", 'Bg3 — offers the bishop trade.'],
    ["…h5: the storm goes on, with …h4 next to kick the bishop again. The engine prefers …Kb8 first, tucking your king into the corner before the fight. They are a little better. Your plan for the middlegame: …h4 to chase the bishop off g3, a rook to e8 on the open file, and the knight on e7 to f5. Watch for their pawns coming at your king with b4 and b5.", '…h5 — …h4 is next.'],
  ],
  'Advance …Qb6': [
    ['e5: the Advance, about one master in nine. Instead of defending e4, they push it past your d5 pawn and grab space. The pawn on e5 takes f6 away from your knight and builds a chain, d4 behind e5. The engine prefers Nc3, and they are a little better, but the Advance asks you one clear question: how do you attack that chain?', 'e5 — the Advance, a pawn chain.'],
    ['…c5, nearly every master: hit the chain at its base. The pawn on c5 hits d4, the pawn that holds up e5. If d4 ever goes, the e5 pawn has nothing behind it.', "…c5 — hits d4, the chain's base."],
    ['c3, nearly every master: they back up d4 with another pawn, so if you take on d4, a pawn takes back and the chain stays.', 'c3 — backs up d4.'],
    ['…Nc6, about seven masters in ten: the knight adds a second hit on d4, and it hits e5 as well.', '…Nc6 — more pressure on d4.'],
    ['Nf3, nearly every master: the knight guards d4 and e5 at once.', 'Nf3 — guards d4 and e5.'],
    ['…Qb6, about four masters in ten: the queen lines up behind your c5 pawn on the diagonal to d4, so the moment the c-pawns trade, it hits d4 too. And it hits b2, which only the bishop on c1 guards. Remember that bishop.', '…Qb6 — hits b2, lines up on d4.'],
    ["Be2, about one master in six: a quiet developing move. On e2 the bishop leaves their queen's line to d4 open, so d4 keeps three guards. Seven masters in ten play a3, the engine's choice, getting ready for b4.", 'Be2 — quiet; a3 was better.'],
    ["Where does your king's knight go? Not f6, where the e5 pawn would hit it. …Nh6, about a quarter of masters: the knight heads for f5, where it will hit d4 too. The engine prefers …cxd4 first, as most masters play, and after …Nh6 they are a little better. And look at c1: their bishop now aims straight at your knight on h6.", '…Nh6 — heading for f5.'],
    ['Bxh6, six masters in ten: they take the knight before it reaches f5. But look at what the bishop left behind on c1: the b2 pawn has no guard now, and your queen is hitting it.', 'Bxh6 — but b2 loses its guard.'],
    ["Grab b2 first? No: …gxh6, the engine's choice, and …Qxb2 is about half a pawn worse. Your h-pawns are doubled on h7 and h6, but it's the same deal as …gxf6 in the Rubinstein: the g-file opens for a rook, and your bishop gets g7.", '…gxh6 — take back; the g-file opens.'],
    ["Qd2, the engine's choice: the queen comes back to guard b2, and it hits your h6 pawn, which the bishop on f8 guards.", 'Qd2 — guards b2, hits h6.'],
    ['…Bg7: the bishop takes the long diagonal and hits e5, while still guarding h6. The engine rates it the same as …Bd7.', '…Bg7 — hits e5, guards h6.'],
    ['Na3: the knight heads for c2, a square from which it can guard d4. They are a little better.', 'Na3 — heading for c2.'],
    ["…cxd4, the engine's choice: now the trade, and your queen's diagonal to d4 opens.", "…cxd4 — the queen's diagonal opens."],
    ["cxd4, the engine's choice: the pawn takes back, and d4 is hit by your queen and your knight, guarded by their queen and the knight on f3. It's about level.", 'cxd4 — two hits, two guards on d4.'],
    ['…Qb4: the queen offers a trade, and from b4 it hits a3, b2 and d4, and it pins their queen on d2 to the king on e1. It is about level. Your plan for the middlegame: trade queens if they let you, keep your pieces trained on d4, break with …f6 against e5, and put a rook on the g-file.', '…Qb4 — offers a trade, pins d2.'],
  ],
  'Classical Steinitz': [
    ["…Nf6, the engine's choice and about four masters in ten: the Classical. Instead of trading on e4, you add a second hit on it, from the pawn on d5 and now the knight. …Bb4, pinning the knight on c3, is the other main move.", '…Nf6 — the Classical, a second hit on e4.'],
    ["e5, about half the masters and the engine's choice: the pawn kicks your knight off f6 and grabs space. The pin with Bg5 is nearly as common. Where does the knight go?", 'e5 — kicks the knight.'],
    ['…Nfd7, every master: the knight steps back to d7, where it hits e5 and keeps an eye on c5 and f6, the two squares your pawn breaks will use.', '…Nfd7 — hits e5, backs the breaks.'],
    ["f4, nine masters in ten: the pawn backs up e5 from behind. That's the Steinitz: a big pawn chain running from f4 through e5 to d4, and lots of space. Your job is to hit it, with …c5 against d4 now and …f6 against e5 later.", 'f4 — props up e5.'],
    ['…c5, every master: the first break, straight at d4, the base of their center.', '…c5 — hits d4.'],
    ['Nf3, every master: the knight guards d4 and e5.', 'Nf3 — guards d4 and e5.'],
    ['…Nc6, nine masters in ten: a second piece on d4, and a second on e5 beside your knight on d7.', '…Nc6 — more pressure on d4.'],
    ['Be3, nearly every master: one more guard on d4, which now has three, the bishop, the knight on f3 and their queen.', 'Be3 — a third guard on d4.'],
    ['…Be7, about a quarter of masters: quiet development, clearing f8 so you can castle. …a6, getting …b5 ready, is a little more common, and the engine rates them the same.', '…Be7 — develops, castling next.'],
    ['Qd2, eight masters in ten: the queen backs up the bishop on e3 and clears the way to castle long. Where will each king go?', 'Qd2 — ready to castle long.'],
    ['…O-O, seven masters in ten: your king goes short, to g8. If they castle long, the kings sit on opposite wings, and it becomes a race: your queenside pawns and pieces against their king, theirs against yours.', '…O-O — king to g8.'],
    ['dxc5, about half the masters: they release the tension and take on c5. Which piece takes back, the knight or the bishop?', 'dxc5 — they release the tension.'],
    ["…Nxc5, the engine's choice: the knight takes back and lands on a fine square, with e4 and d3 in reach. Taking with the bishop is about two tenths worse.", '…Nxc5 — the knight on c5.'],
    ['They castle long, king to c1, and the race is on: the kings on opposite wings.', 'O-O-O — opposite wings.'],
    ['…Qa5: the queen goes straight at their king, hitting a2 and the knight on c3. It is about as good as …Bd7. They are a little better. Your plan for the middlegame: the bishop to d7, a rook to c8 or b8, and …b5 and …b4 to kick the knight off c3 and open lines at their king.', '…Qa5 — hits a2 and c3.'],
  ],
  'Rubinstein …Nd7': [
    ["…Nd7, six masters in ten and the engine's choice: the quiet way. The queen's knight comes out first, so that when your other knight lands on f6 and they trade, a knight takes back and your pawns stay whole.", '…Nd7 — first, so …Ngf6 comes safely.'],
    ['Nf3, eight masters in ten: the knight develops and covers e5.', 'Nf3 — develops, covers e5.'],
    ['…Ngf6, nearly every master: now the challenge. The knight goes after the one on e4, which nothing guards, and if they trade on f6, your knight on d7 takes back.', '…Ngf6 — challenges e4.'],
    ['Nxf6 check, about two masters in three: they trade on f6.', 'Nxf6+ — the trade.'],
    ["…Nxf6, every master: the knight takes back on f6, and your pawns stay healthy. Compare the main line's …gxf6: here there's no half-open g-file, but no doubled pawns either. And …gxf6 here would be about six tenths worse.", '…Nxf6 — healthy pawns.'],
    ["Bd3, a third of masters and the engine's choice: the bishop aims at h7, right next to where your king will castle.", 'Bd3 — aims at h7.'],
    ["Here's the old French problem: your bishop on c8 is still stuck behind e6. So give it another road. …b6 opens b7, and from there it gets the long diagonal. The engine prefers …c5 first, hitting d4.", '…b6 — a new road for the bishop.'],
    ['They castle, king to g1. The engine slightly prefers Qe2 or Ne5 first.', 'O-O — king to g1.'],
    ["…Bb7, the engine's choice: there it is. The bishop that looked shut in now runs down the long diagonal, hitting the knight on f3, with g2 and their king's shelter behind it.", '…Bb7 — the long diagonal, hits f3.'],
    ["Qe2, the engine's choice: the queen hits e6 and pins it to your king, still on e8. Time to finish developing and castle.", 'Qe2 — pins e6 to your king.'],
    ['…Bd6: the bishop develops, aims at h2 and clears f8 for castling. …Be7 is just as good.', '…Bd6 — aims at h2, castle next.'],
    ['Ne5: the knight jumps into the center, guarded by the pawn on d4 and the queen on e2, and it hits f7.', 'Ne5 — centralized, hits f7.'],
    ["…O-O, the engine's choice: your king is safe on g8, and the pin on e6 is gone. They are a little better. Your plan for the middlegame: …c5 to strike at d4, the queen to e7 and a rook to the half-open d-file, with your bishop on b7 aimed down the long diagonal at g2.", '…O-O — king safe, pin gone.'],
  ],
  'Tarrasch …c5': [
    ["…c5, the engine's choice and the masters' most common reply, about a third of them: hit the center at once. With the knight on d2 instead of c3, only the e4 pawn presses on your d5 pawn, and their d4 pawn is loose, because the knight on d2 blocks their queen's guard.", '…c5 — hits d4 at once.'],
    ['exd5, about half the masters: they trade off the center before you can take on d4. Take back with the e-pawn, or with the queen?', 'exd5 — the center opens.'],
    ['…Qxd5, six masters in ten: the queen takes back and lands in the center, hitting d4, which nothing guards, and a2 and g2 as well. Why can the queen come out this early? Because their knight is on d2, not c3: no knight of theirs can reach c3 to kick it.', '…Qxd5 — central queen, hits d4.'],
    ['Ngf3, eight masters in ten: the other knight guards d4.', 'Ngf3 — guards d4.'],
    ["…cxd4, every master: you take on d4 anyway. The pawn is safe for now, held by your queen, and they'll spend moves winning it back.", '…cxd4 — a pawn up, for now.'],
    ['Bc4, every master: development with tempo, hitting your queen on d5. Where does it go?', 'Bc4 — hits the queen.'],
    ['…Qd6, three masters in four: the queen keeps guarding d4 and eyes h2. …Qd7 is about the same.', '…Qd6 — guards d4, eyes h2.'],
    ['They castle, nine masters in ten, king to g1: development first, since the d4 pawn will keep.', 'O-O — king safe first.'],
    ['…Nf6, nearly every master: the knight develops and covers d5 and e4, the central squares their pieces want.', '…Nf6 — develops, covers d5 and e4.'],
    ['Nb3, nearly every master: the knight leaves d2, and now three pieces hit d4, this knight, the one on f3 and their queen, against your one guard.', 'Nb3 — three hits on d4.'],
    ["…Nc6, nearly every master: a second guard on d4. It's still three against two, so the pawn will go back. That's fine: when it does, the knights come off.", '…Nc6 — a second guard on d4.'],
    ['Nbxd4, nearly every master: the pawn comes back, and material is level. Their knight on d4 now aims at your knight on c6 and the e6 pawn.', 'Nbxd4 — material level again.'],
    ['…Nxd4, every master: trade knights on d4. Which piece takes back?', '…Nxd4 — the knights come off.'],
    ['Nxd4, eight masters in ten: the knight takes back and stays on d4, aimed at e6.', 'Nxd4 — a central knight.'],
    ['…a6, about seven masters in ten: the pawn takes b5 away from their bishop and knight, so neither can jump there with a check or a hit on your queen. They are a little better. Your plan for the middlegame: …Be7 and castle, then …b5 and a bishop to b7 or d7, and a rook to the open d-file.', '…a6 — takes b5 away.'],
  ],
  'Rubinstein …b6': [
    ['…b6: the other way to play the doubled f-pawns. Instead of …Nc6 and …e5, your bishop goes to b7, and with a rook on the half-open g-file it aims at g2 and their king\'s shelter. The engine prefers …Nc6, and right now they are clearly better, because Bb5 check is their best answer.', '…b6 — the bishop is headed for b7.'],
    ['Bd3: the bishop aims at h7. The engine prefers Bb5 check, and after Bd3 they are only a little better.', 'Bd3 — aims at h7; Bb5+ was better.'],
    ['…Bb7: the bishop lands on the long diagonal, hitting the knight on f3, with g2 behind it. …Qd7 is just as good.', '…Bb7 — the long diagonal, hits f3.'],
    ["Qe2: the queen pins your e6 pawn to your king on e8, so the king can't stay in the center for long.", 'Qe2 — pins e6 to your king.'],
    ["…Nc6, the engine's choice: the knight develops and hits d4. Yes, it stands in front of your bishop on b7 for now; first the pieces come out, so the king can leave e8.", '…Nc6 — develops, hits d4.'],
    ["c3, the engine's choice: a pawn guard for d4.", 'c3 — guards d4.'],
    ['…Qd7: the queen hits d4 down the file and clears d8, so you can castle long.', '…Qd7 — hits d4, castle long next.'],
    ['They castle short, and look where their king lands: g1, on the half-open g-file, right where your rook is about to point.', 'O-O — their king on the g-file.'],
    ['…O-O-O: your king leaves the pinned e6 pawn behind and goes to the queenside, and your rook comes to d8. …h5 first is about as good. They are a little better. Your plan for the middlegame: …Rg8 on the g-file, …e5 to open the center, and your bishop on b7 aimed at g2 once the knight on c6 steps aside. Watch for Ba6, offering to trade that bishop off.', '…O-O-O — king safe, rooks to work.'],
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

export const PRO_GOTHAMCHESS_FRENCH_DEFENSE_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-french-defense',
  title: "This repertoire's French — the Rubinstein …gxf6 Powerhouse",
  orientation: 'black',
  sources: [
    'book:french-defence',
    'concept:pos-development',
    'concept:pos-center',
    'https://www.chess.com/openings/French-Defense',
    'https://www.chess.com/openings/French-Defense-Rubinstein-Variation',
    'https://www.chess.com/openings/French-Defense-Exchange-Variation',
    'https://en.wikipedia.org/wiki/French_Defence',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
