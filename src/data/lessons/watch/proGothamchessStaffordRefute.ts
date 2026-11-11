// GothamChess's Stafford Gambit Refutation — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet (`LESSON_FACTS=1
// LESSON_IDS=pro-gothamchess-stafford-refute`): masters' percentages, engine
// lines at a fixed depth, the board after each move. The student plays White
// and meets the gambit: they are a pawn down by choice, and the course is how
// you keep that pawn without walking into the traps around f2. The last tab is
// a line taught for this opening in the repertoire's videos
// (docs/levy-lines/decisions). Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a).
//
// Moves the sheet's top three does not list (d4 at their sixth move, Bg5 and
// Be3 against …Bc5, castling against …h5, h3 against …Ng4, d3 in the e5 tab)
// were read by Stockfish at depth 16 before a beat names what they allow;
// the Bg5 mate and the h3 fork were replayed with chess.js.
//
// The "Main Refutation d3" tab plays exactly the main line's moves, so it has
// no beats of its own: every one is filed by the main line, said the same way.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Be2', 'h5', 'c3', 'Ng4', 'd4', 'Bd6', 'e5', 'Be7', 'Bc4', 'Bf5', 'h3'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4, close to half the masters' first move and the engine's favorite. The pawn grabs the center and opens lines for your queen and the bishop on f1. Keep an eye on this pawn: in the Stafford, it's the first thing they go after.", 'e4 — the center, lines open.'],
  ["…e5, about a quarter of masters. They answer pawn for pawn, and lines open for their queen and the bishop on f8. Their pawn on e5 has no guard yet, so the obvious question is: why not go after it?", '…e5 — pawn for pawn.'],
  ["Nf3, nine masters in ten. The knight develops and hits e5 at once, and nothing defends that pawn. Most players simply guard it with …Nc6. What if they don't?", 'Nf3 — hits the loose e5.'],
  ["…Nf6, the Petrov, about one master in eight. Instead of guarding e5, they hit back at your pawn on e4, so now both e-pawns are hanging. The engine prefers the plain …Nc6. Whose pawn goes first?", '…Nf6 — the Petrov, hits e4.'],
  ["Nxe5, about two masters in three, and the engine's first choice. You take first, and from e5 the knight hits f7 and d7. Yes, your own e4 pawn is hanging now. Nearly every master first kicks your knight with …d6, and only then takes the pawn. The Stafford player has a different idea.", 'Nxe5 — takes first, hits f7.'],
  ["…Nc6, and here's the Stafford Gambit. Almost no master plays it; about ninety-eight in a hundred kick your knight with …d6, and the engine rates …Nc6 more than a pawn worse. You are clearly better. So why do people play it? The knight hits yours on e5, and after the trade their pieces come out fast, and their favorite target is f2. The whole gambit is a web of traps around that pawn, and this course is about stepping around every one of them.", '…Nc6 — the Stafford, a pawn for traps.'],
  ["Nxc6, eight masters in ten here, and the engine's first choice. Take the knight, and look what yours hits now: their queen on d8, so they have to take back. Why not keep the pieces on with Nf3? Because then …Nxe4 takes your pawn, and nearly all of your edge is gone.", 'Nxc6 — takes, hits the queen.'],
  ["…dxc6, every master here. Taking away from the center looks odd, but it's the point: the d-file opens for their queen, and the bishop on c8 gets its diagonal. They're a pawn down, and their pieces are about to come out fast. So what's your first concern? Your pawn on e4, which nothing guards.", '…dxc6 — their pieces get open lines.'],
  ["d3, half the master games here, and the engine's first choice. The pawn guards e4, and your bishop on c1 gets its diagonal. Why not the bigger d4? Because then nothing guards e4, …Nxe4 takes the pawn back, and the game is level. That extra pawn is your whole advantage, so first you keep it.", 'd3 — guards e4, keeps the pawn.'],
  ["…Bc5, every master game here. The bishop aims straight at f2, a pawn only your king defends, and that is the square the Stafford is built around. Their next idea is …Ng4, a second piece on f2. How do you get ready for it?", '…Bc5 — aims at f2.'],
  ["Where does this bishop belong? e2. It looks modest, but it covers g4, so when their knight lands there, you can simply take it. Compare the natural Bg5, pinning the knight: …Nxe4! opens their queen's diagonal onto your bishop on g5, and if you grab the queen on d8, …Bxf2 check and …Bg4 is mate. That's the most famous trap in the Stafford, and Be2, the engine's first choice, steps around it.", 'Be2 — covers g4, avoids the trap.'],
  ["…h5, a move out of the master games. Here's the idea: the pawn backs up …Ng4, so if your bishop takes the knight, …hxg4 opens the h-file, and their rook on h8 looks straight down it at h2. The engine prefers …Ng4 at once, and you are winning. But it changes one thing for you: where your king should go.", '…h5 — backs up …Ng4.'],
  ["Time to castle? Not with that pawn on h5. After castling, …Ng4 comes, and taking it opens the h-file at your king; nearly all of your edge is gone. So c3, the engine's pick: the pawn takes d4 away from their queen and their bishop, and it gets your own d4 ready, hitting the bishop on c5.", 'c3 — covers d4, d4 next.'],
  ["…Ng4: there's the knight, and now f2 is hit twice, by the knight and by the bishop on c5, with only your king to defend it. The threat is …Nxf2, forking your queen on d1 and your rook on h1. The engine prefers …Bb6, moving the bishop before d4 can hit it. So what's your answer?", '…Ng4 — f2 is hit twice.'],
  ["d4, and here's the point of c3. The pawn hits the bishop on c5, and it also cuts that bishop's road to f2, so if the knight takes on f2 now, your king simply takes it. Look at the other tries. h3, kicking the knight, loses to …Nxf2: the bishop still guards f2, so the knight forks your queen and rook. Bxg4 opens the h-file and gives away nearly all of your edge. You are winning.", 'd4 — hits c5, cuts the f2 diagonal.'],
  ["…Bd6: the bishop drops back and finds a new target, h2. Now the knight on g4 and the bishop both hit it, and only your rook on h1 defends it. The engine prefers …Qh4, bringing the queen in. You are winning, but h2 needs an answer.", '…Bd6 — aims at h2.'],
  ["e5: the pawn hits the bishop on d6, so it has to leave the diagonal to h2, and the pawn takes d6 and f6 away from their pieces for good. The engine prefers Nd2 first, heading for f3, where the knight guards h2. You are winning either way.", 'e5 — kicks the bishop off h2.'],
  ["…Be7, the engine's choice. Why not take on e5 instead? That just gives the bishop for two pawns. On e7 the bishop is safe, and later it can come out to h4 and look at f2 again.", '…Be7 — back, not …Bxe5.'],
  ["Bc4. Remember the bishop's job on e2: covering g4. With your pawns on d4 and e5 holding the center, it finds a better diagonal, aimed at f7, a pawn only their king guards. And leaving e2 opens the road for your queen on d1, which now hits the knight on g4.", 'Bc4 — aims at f7, frees the queen.'],
  ["…Bf5: the bishop develops and hits your knight on b1. …Be6, offering to trade bishops, is just as good for them. But look at f2 now: with their other bishop back on e7, only the knight on g4 hits that pawn. Is it finally time to kick the knight?", '…Bf5 — develops, hits b1.'],
  ["h3, and now it works. Earlier, h3 lost to …Nxf2. Now the bishop has left c5, so if the knight takes on f2, your king takes back. The knight has to retreat, and you are winning. Your plan for the middlegame: once the knight drops to h6, nothing guards the h5 pawn, so Qxh5 grabs a second pawn; then Nd2 and castle, a pawn or two up with the space your pawns on d4 and e5 give you.", 'h3 — kicks the knight; now it works.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Main Refutation d3': ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Be2', 'h5', 'c3', 'Ng4', 'd4', 'Bd6', 'e5', 'Be7', 'Bc4', 'Bf5', 'h3'],
  '4...dxc6 5.e5 Line': ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'e5', 'Ne4', 'd4', 'Qh4', 'Qf3', 'Be6', 'c3', 'f6', 'Bd3', 'Ng5', 'Qg3', 'Qxg3', 'hxg3'],
  'Modern Attack d4': ['e4', 'e5', 'Nf3', 'Nf6', 'd4', 'exd4', 'e5', 'Ne4', 'Qxd4', 'd5', 'exd6', 'Nxd6', 'Nc3', 'Nc6', 'Qa4', 'Bd7', 'Be3', 'Nf5', 'O-O-O', 'Nxe3', 'fxe3'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The same moves as the main line: every beat is already filed there.
  'Main Refutation d3': [],
  '4...dxc6 5.e5 Line': [
    ["What about kicking the knight right away? e5, one master game in ten: the pawn hits the knight on f6 and grabs space. The engine prefers the calm d3 by almost a pawn, but you are still clearly better. The cost: this pawn on e5 is out in front now, and sooner or later it will be a target.", 'e5 — kicks the knight; d3 was stronger.'],
    ["…Ne4: the knight jumps forward instead of back, and from e4 it hits f2 and d2. The engine prefers the calmer …Nd5. Watch their bishop on f8: from c5 it would join the knight against f2.", '…Ne4 — hits f2; …Nd5 was better.'],
    ["d4, the engine's first choice, and it's all about c5. The pawn takes that square away from their bishop, so it can't join the knight against f2. The natural d3, kicking the knight, is a serious mistake: …Bc5 ignores it, and with the knight and the bishop both on f2, your kingside falls apart. You are winning.", 'd4 — takes c5 from their bishop.'],
    ["…Qh4: the queen hits f2, and that pawn is pinned to your king on e1. Count the attackers: the queen and the knight on e4 against f2, with only your king to defend it. …Qxf2 would be mate, so this move has to deal with it. You are clearly better.", '…Qh4 — threatens mate on f2.'],
    ["Qf3 guards f2 and fights back at the same time: from f3 the queen hits the knight on e4 and the pawn on f7. Against an attack, a defensive move that makes threats of its own is the best kind.", 'Qf3 — guards f2, hits e4 and f7.'],
    ["…Be6, the engine's choice: the bishop develops and guards f7, the pawn your queen was hitting, and it looks down the diagonal at a2. Now count the knight on e4: your queen hits it, their queen on h4 guards it. One against one, so it holds, for now.", '…Be6 — guards f7.'],
    ["c3: a quiet move with two jobs. It guards your d4 pawn, and it covers b4, so their bishop on f8 has no check there.", 'c3 — guards d4, covers b4.'],
    ["…f6: they go after your e5 pawn, the one cramping their pieces. Remember the cost of pushing it? Here it is. But d4 guards it, so there's no hurry, and you are winning.", '…f6 — hits the e5 pawn.'],
    ["Bd3: the bishop develops with a threat on the knight on e4. Now two of your pieces hit that knight, and only their queen defends it, so it has to move.", 'Bd3 — two pieces on e4.'],
    ["…Ng5: the knight retreats with a threat of its own, at your queen on f3. Where should the queen go?", '…Ng5 — hits your queen.'],
    ["Qg3, the engine's first choice: the queen steps away and offers a trade. From g3 it hits their queen on h4, which has no guard, and the knight on g5 as well. A pawn up, you're happy to trade queens: their attack on your king leaves the board with their queen.", 'Qg3 — offers the queen trade.'],
    ["…Qxg3: they take, and the queens come off. Now, which pawn takes back?", '…Qxg3 — the queens come off.'],
    ["hxg3, the engine's choice: take toward the center with the h-pawn, and your rook on h1 gets the open h-file, aimed at h7. fxg3 is about half a pawn worse. You are clearly better, a clean pawn up with the queens gone. Your plan for the middlegame: Bxg5 to double their g-pawns, then a bishop check on g6, using the h-file and the extra pawn.", 'hxg3 — the h-file opens.'],
  ],
  'Modern Attack d4': [
    ["d4, about one master in five: open the center at once. Here's a practical bonus: with no knight on e5, there's nothing for …Nc6 to gambit against, so the Stafford never happens. The pawn hits e5, and now both e-pawns are hanging. Nxe5 remains the masters' main road, and the rest of this course.", 'd4 — sidesteps the Stafford, hits e5.'],
    ["…exd4: they take, and for a moment you're a pawn down. More than nine masters in ten grab your e4 pawn with the knight instead, and the engine prefers that too. Taking on d4 has a catch: your e-pawn is now free to push, straight at the knight on f6.", '…exd4 — takes; …Nxe4 was better.'],
    ["e5, nearly every master, and the engine's first choice. The pawn hits the knight on f6, so they have no time to hold on to d4. Their pawn there has no guard, and you'll take it back next.", 'e5 — hits the knight on f6.'],
    ["…Ne4, almost every master: the knight jumps forward instead of retreating, and from e4 it hits f2. So how do you take back on d4, and with what?", '…Ne4 — forward, hits f2.'],
    ["Qxd4, nineteen masters in twenty, and the engine's first choice. The queen takes the pawn back, so material is level, and from d4 it hits the knight on e4, which has no guard. An early queen is usually a target, but this one comes with a threat.", 'Qxd4 — level, hits the knight.'],
    ["…d5, nearly every master: the pawn steps up to guard the knight on e4. But look where it stands, right beside your pawn on e5. That pawn can be taken en passant.", '…d5 — guards the knight.'],
    ["exd6, en passant, and nearly every master takes. The pawn removes the knight's only guard, and from d6 it hits c7. Their knight on e4 is hanging again, so they have to take back.", 'exd6 — en passant, hits c7.'],
    ["…Nxd6: the knight takes back, and the material is level. The center has opened, you have more pieces out, and you are a little better. The next job: develop, with a threat if you can.", '…Nxd6 — level, the center open.'],
    ["Nc3: a new piece joins, and the knight eyes d5 and b5, two squares in their half of the board. The engine rates Qf4 just as highly; either way, you're developing while their queenside pieces still sit at home.", 'Nc3 — develops, eyes d5 and b5.'],
    ["…Nc6: the knight develops and hits your queen on d4. That's the price of an early queen: they develop with tempo. So where does it go, and can it make a threat of its own?", '…Nc6 — hits your queen.'],
    ["Qa4: yes, it can. The queen pins the knight on c6 to their king on e8, so that knight can't move, and it also hits a7. The queen was chased, and it still found a threat.", 'Qa4 — pins the knight to the king.'],
    ["…Bd7: the bishop steps between the knight and the king, so the knight on c6 is free again. Now it's a race to finish developing, and your queenside pieces are next.", '…Bd7 — breaks the pin.'],
    ["Be3, the engine's first choice: the bishop develops, hits a7, and clears the way to castle long. With your queen and knight already on the queenside, that's where your king wants to go.", 'Be3 — develops, long castling next.'],
    ["…Nf5: the knight goes straight for your bishop on e3, to win the bishop pair. Do you move the bishop, or let it go?", '…Nf5 — hits the bishop.'],
    ["Let it go: you castle long, the engine's first choice by a wide margin. Anything else, Qf4 or a check on e4, gives away most of your edge. Now your rook lands on d1 and pins the bishop on d7 to their queen on d8.", 'O-O-O — the rook pins d7.'],
    ["…Nxe3: they take the bishop, and for a moment the knight forks your rook on d1 and the bishop on f1. But it's hanging itself, so you just take it back.", '…Nxe3 — takes the bishop.'],
    ["fxe3, the engine's choice: the f-pawn takes back and opens the f-file for your rook later. They have the two bishops, but their bishop on d7 is still pinned to the queen, and you are a little better. Your plan for the middlegame: develop the last bishop to b5 or c4, bring the knight to e5 to pile up on d7, and use your lead in development before their king gets safe.", 'fxe3 — takes back, the pin stays.'],
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

export const PRO_GOTHAMCHESS_STAFFORD_REFUTE_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-stafford-refute',
  title: "This repertoire's Stafford Refutation — Take the Pawn, Refuse the Trap",
  orientation: 'white',
  sources: [
    'concept:pos-development',
    'concept:pos-king-safety',
    'https://www.chess.com/openings/Petrovs-Defense-Stafford-Gambit',
    'https://en.wikipedia.org/wiki/Petrov%27s_Defence',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
