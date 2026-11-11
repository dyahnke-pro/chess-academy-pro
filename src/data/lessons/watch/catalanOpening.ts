// The Catalan Opening — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet
// (`LESSON_FACTS=1 LESSON_IDS=catalan-opening`): masters' percentages, engine
// lines at a fixed depth, the board after each move. The student plays White.
// Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register
// (§2a). One story runs through every line: the bishop on g2 and the long
// diagonal to b7 and a8, the c4 pawn you let go and win back, and, when they
// keep the centre closed, the e4 break.
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O', 'O-O', 'dxc4', 'Qc2', 'a6', 'Qxc4', 'b5', 'Qc2', 'Bb7', 'Bd2', 'Nc6', 'Nc3'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — the queen's pawn takes a square in the middle and covers c5 and e5. A bit over a third of master games start this way; e4 is the more common first move. The Catalan is built on top of this pawn: c4 comes next, and then the bishop that gives the opening its character.", 'd4 — the centre first, c4 next.'],
  ["…Nf6, the reply of six masters in ten. About a quarter play …d5 at once, and the two rate about the same. The knight covers d5 and e4 without committing a single pawn, so you don't know yet what setup they're after.", '…Nf6 — covers d5 and e4.'],
  ["c4, played by seven masters in ten. The pawn grabs space on the queenside and covers d5 ahead of time, so if their d-pawn arrives there, it's already under fire.", 'c4 — space, and d5 covered.'],
  ["…e6, just over half the masters. The pawn opens the road for their bishop on f8 and gets ready for …d5 with a pawn behind it. About a third go …g6 instead and fianchetto a bishop of their own. Notice the cost of …e6, though: their bishop on c8 is shut in. Keep an eye on that piece.", '…e6 — frees f8, shuts in c8.'],
  ["Here's the Catalan: g3. Only about one master in eight plays it, Nf3 and Nc3 are far more common, and yet it's the engine's top choice, and you're a little better. Why g3? It makes room for the bishop on g2, on the long diagonal from h1 to a8. Look down that line: d5, where their pawn wants to stand, then b7, then the rook on a8. That bishop is the whole opening. Much of what follows is about it: opening its diagonal, and pointing it at their queenside.", 'g3 — the bishop is coming to g2.'],
  ["…d5, six masters in ten. Now the setup looks like a Queen's Gambit Declined, pawns on d5 and e6. But look at your c4 pawn: their pawn on d5 hits it, and nothing of yours guards it. So do you have to defend it?", '…d5 — hits your c4 pawn.'],
  ["No — Bg2, and you let it go. Just over half the masters play this now, the rest play Nf3 first. Your bishop is on the long diagonal, and it already hits the pawn on d5. If that pawn takes on c4, it leaves the diagonal, and your bishop looks straight through to b7 and a8. That's the Catalan's bargain: a pawn for the long diagonal.", 'Bg2 — c4 can go; the diagonal matters.'],
  ["…Be7, nearly four masters in ten: the calm road. The bishop develops and clears f8 so they can castle. They aren't taking on c4 yet. About three in ten do take straight away, and that's the Open Catalan tab. Here they put the king away first and decide about c4 later.", '…Be7 — castle first, c4 later.'],
  ["Nf3, nearly every master. The knight covers d4 and e5, and your king is one move from castling. One thing to notice: the knight on f3 stands on your bishop's diagonal. For now it blocks your own bishop; the day it jumps away, the diagonal opens again.", 'Nf3 — develops; it blocks g2 for now.'],
  ["…O-O, and almost every master castles here. Their king is safe, so the question of your c4 pawn comes back.", '…O-O — their king is safe.'],
  ["You castle too, as eight masters in ten do. Your setup is done: bishop on g2, knight on f3, king on g1. And your pawn on c4 is still there for the taking. Now they decide.", 'O-O — your setup is done.'],
  ["…dxc4, about seven masters in ten. They're a pawn up, and the d5 pawn has left your bishop's diagonal. So is your bishop free now? Not quite: your own knight on f3 still stands in the way. First things first: how do you get the pawn back?", '…dxc4 — they are a pawn up.'],
  ["Qc2, three masters in four. The queen hits the pawn on c4, which has no guard, and it also looks down the diagonal at h7. The threat is simple: Qxc4, and material is level again.", 'Qc2 — hits the loose pawn on c4.'],
  ["…a6, over eight masters in ten. They can't guard c4, so they make you pay for taking it. …a6 prepares …b5, and the moment your queen lands on c4, that pawn will hit it.", '…a6 — …b5 is coming.'],
  ["Qxc4 — the pawn comes back, and material is level. But look at the move order: two masters in three play a4 first, so that …b5 would run into your a-pawn. Taking at once lets their b-pawn hit your queen right away. You'll see a4 in another tab.", 'Qxc4 — level again; a4 first is more common.'],
  ["…b5, and there's the point of …a6. The pawn hits your queen on c4, so it has to move again, and their queenside pawns gain space.", '…b5 — hits the queen.'],
  ["Where does the queen go? Back to c2, the engine's clear choice; Qd3 and Qc3 score well below it. From c2 it hits the pawn on c7 and keeps looking at h7.", 'Qc2 — back home, hitting c7.'],
  ["…Bb7, and now the two bishops face each other on the long diagonal. Their bishop on b7 hits your knight on f3, with your bishop on g2 right behind it. Here's what the Catalan is really about: whose bishop owns that diagonal?", '…Bb7 — bishop against bishop.'],
  ["Bd2, a quiet developing move. The engine rates it level with Bf4 and Bg5. From d2 the bishop covers b4 and c3, and it clears c1 for a rook or the queen. Remember c1.", 'Bd2 — develops, clears c1.'],
  ["…Nc6 — the knight develops and hits your pawn on d4. Count it: the knight and their queen on d8 hit d4, and only your knight on f3 guards it. And look what the knight does to its own bishop: on c6 it stands in the bishop's path, so b7 no longer sees your knight. The engine prefers …Be4, hitting your queen — that's another tab.", '…Nc6 — hits d4, blocks its own bishop.'],
  ["Nc3 develops your last minor piece and hits the pawn on b5. But d4 still has one guard, and the engine prefers e3, which props it up with a pawn. Now their knight can take on d4, and after a run of trades on d4, g2 and e6 it comes out about level. Your plan from here: shore up d4 with e3, bring a rook to the c- or d-file, and keep your bishop on g2 aimed down the long diagonal for the day the knight on c6 moves.", 'Nc3 — hits b5; e3 was stronger.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the lines already written don't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Open Catalan: dxc4 Qc2 Recovery': ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'dxc4', 'Nf3', 'Be7', 'O-O', 'O-O', 'Qc2', 'a6', 'Qxc4', 'b5', 'Qc2', 'Bb7', 'Bd2', 'Be4', 'Qc1', 'Bb7'],
  'Closed Catalan: ...c6 System': ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O', 'O-O', 'Nbd7', 'Qc2', 'c6', 'Nbd2', 'b6', 'e4', 'Bb7', 'e5', 'Ne8', 'cxd5', 'cxd5', 'Re1', 'Rc8', 'Qa4', 'Nc7', 'Nf1', 'b5'],
  'Open Catalan: a6-b5 with a4 Break': ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'dxc4', 'Nf3', 'a6', 'O-O', 'b5', 'Ne5', 'Nd5', 'a4', 'Bb7', 'axb5', 'axb5', 'Rxa8', 'Bxa8'],
  'Catalan with ...Nbd7 Line': ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O', 'O-O', 'dxc4', 'Qc2', 'a6', 'a4', 'Bd7', 'Qxc4', 'Bc6', 'Bf4', 'Nbd7', 'Nc3', 'Nb6', 'Qd3', 'Nbd5', 'Nxd5'],
  'Catalan vs Slav Setup: ...c6 and ...dxc4': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'g3', 'dxc4', 'Bg2', 'b5', 'a4', 'Bb7', 'Ne5', 'a6', 'axb5', 'axb5', 'Rxa8', 'Bxa8', 'O-O', 'e6', 'b3'],
  'Catalan Declined: ...Be7 without ...dxc4': ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O', 'O-O', 'Nbd7', 'Qc2', 'c6', 'b3', 'b6', 'Bb2', 'Bb7', 'Nc3', 'Rc8', 'e4', 'dxe4', 'Nxe4', 'Nxe4', 'Qxe4'],
  'Early Qa4+ Line': ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'dxc4', 'Nf3', 'Bd7', 'Ne5', 'Bc6', 'Nxc6', 'Nxc6', 'O-O', 'Qd7', 'e3', 'O-O-O', 'Qa4', 'Nd5', 'Qxc4'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Open Catalan: dxc4 Qc2 Recovery': [
    ["…dxc4 — they take straight away, almost three masters in ten, and it's the engine's first choice. This is the Open Catalan. Now look down your bishop's diagonal: the d5 pawn is gone, so it runs past c6 to b7, with the rook on a8 right behind. That b7 pawn is pinned. If it moves, your bishop takes the rook. That pin is part of what you get for the pawn.", '…dxc4 — the b7 pawn is pinned to a8.'],
    ["Nf3, about eight masters in ten. The knight develops and lets you castle, but see what it does to the pin: it stands on f3, in your bishop's path, so b7 is free again. When that knight jumps to e5 later, the diagonal opens back up. About one in six check with Qa4+ instead, to go after c4 at once.", 'Nf3 — develops, blocks the diagonal for now.'],
    ["…Be7, a calm move: the bishop develops and clears f8 for castling. The masters' favourite here is …a6, about a third of them, getting ready to hold the pawn with …b5. That one has a tab of its own.", '…Be7 — develop, castle next.'],
    ["You castle, as six masters in ten do. About three in ten give the check Qa4+ first, and the two rate the same. King first; the pawn can wait.", 'O-O — king first, the pawn can wait.'],
    ["…O-O, and look where you are: this is the main line's position, reached by another order. Their pawn on c4, both kings castled, your move. Same position, same plan.", '…O-O — back in the main line.'],
    ["Qc2, three masters in four, just as in the main line. The queen hits the pawn on c4, which has no guard, and the plan is simply Qxc4.", 'Qc2 — hits the pawn on c4.'],
    ["…a6, over eight masters in ten. It's the same idea as before: …b5 is coming, to kick your queen the moment it takes on c4.", '…a6 — getting ready for …b5.'],
    ["Qxc4, and the pawn is back. Material is level. Two masters in three would play a4 first; taking now lets …b5 come with a gain of time.", 'Qxc4 — material level again.'],
    ["…b5 — the pawn hits your queen on c4, and it has to step back.", '…b5 — the queen must move.'],
    ["Qc2 — the queen goes home, the engine's choice, and it hits the pawn on c7 from there.", 'Qc2 — back, hitting c7.'],
    ["…Bb7 — their bishop takes the long diagonal and hits your knight on f3, with your bishop on g2 behind it. Bishop against bishop, as in the main line.", '…Bb7 — faces your g2 bishop.'],
    ["Bd2, the same quiet move as in the main line, clearing c1. Keep that square in mind: it matters two moves from now.", 'Bd2 — clears c1.'],
    ["…Be4, the engine's first choice. The bishop jumps in front of your knight on f3 and hits your queen on c2, which has no guard. The queen has to move, and c1 is ready for it.", '…Be4 — hits the queen on c2.'],
    ["Qc1 — that's what your bishop cleared c1 for. Qd1 and Qc3 score far below it. From c1 the queen still hits the pawn on c7, straight down the c-file.", 'Qc1 — still on the c-file, hits c7.'],
    ["…Bb7, the engine's first choice: the bishop goes back to b7, facing yours on g2 again. So what did its trip to e4 win? Your queen stands on c1 instead of c2, and it's about level. Your plan from here: a rook to d1, the bishop from d2 to f4, and be ready for …c5, their freeing break, when it comes.", '…Bb7 — back home; rook to d1 next.'],
  ],
  'Closed Catalan: ...c6 System': [
    ["…Nbd7 — the Closed Catalan. They leave c4 alone. Fewer than one master in ten plays this, while about seven in ten take on c4. The knight backs up f6 and covers e5 and c5. So your plan changes: with no pawn to win back, you go for the centre, and the break you want is e4.", '…Nbd7 — they keep the centre closed.'],
    ["Qc2, three masters in four. The queen guards c4, and it lines up on e4, the square your pawn wants. That's the plan: a knight to d2 next, then e4.", 'Qc2 — guards c4, lines up on e4.'],
    ["…c6, eight masters in ten. The pawn gives d5 one more guard, and their centre becomes a wall: pawns on c6, d5 and e6. Solid, but look at their bishop on c8. It still has no road out.", '…c6 — a solid wall; c8 is stuck.'],
    ["Nbd2, about half the masters, and the engine's first choice. Why d2 and not c3? From d2 the knight guards both c4 and e4, so your break comes with every piece behind it. On c3 it would cover e4, but not c4. About three in ten play b3 instead, and that has a tab of its own.", 'Nbd2 — guards c4 and e4.'],
    ["…b6, over eight masters in ten. Here's their answer to the c8 problem: the bishop will come out on b7. The engine prefers …c5, hitting your d4 pawn right away.", '…b6 — a road for the c8 bishop.'],
    ["e4 — there it is, the move the whole setup was built for, and nearly nine masters in ten play it. The pawn hits d5, with your queen on c2 and your knight on d2 behind it. Two of yours against two of theirs on e4, and their bishop is still on c8.", 'e4 — the central break.'],
    ["…Bb7, about half the masters: they develop and leave the tension. The engine prefers …dxe4, clearing the centre at once. Now your pawn gets to go one step further.", '…Bb7 — develops; …dxe4 was stronger.'],
    ["e5, seven masters in ten. The pawn hits the knight on f6 and grabs space. Where does the knight go? Its best square is back on e8.", 'e5 — hits the f6 knight, grabs space.'],
    ["…Ne8, and nearly every master goes back there. Now look at the space: your pawn on e5 takes d6 and f6 away from their pieces, and their knight is back on its home rank.", '…Ne8 — back home, cramped.'],
    ["cxd5, about eight masters in ten. Your pawn on d5 hits the pawns on c6 and e6, so they take back, and the c-file is about to open.", 'cxd5 — the c-file will open.'],
    ["…cxd5, the engine's choice, and the structure is set: their pawns on d5 and e6, yours on d4 and e5. Now look at their bishop on b7. It stares straight at its own pawn on d5. That's a bad bishop: stuck behind pawns on its own colour. And the c-file is open, with your queen standing on it.", '…cxd5 — their b7 bishop is bad.'],
    ["Re1, the engine's choice. The rook backs up your pawn on e5, and it clears f1 for the knight on d2, which has done its job and wants a better square.", 'Re1 — guards e5, clears f1.'],
    ["…Rc8 — the rook takes the open c-file and hits your queen on c2, which has no guard. The engine prefers …Qc7. You're clearly better now, but the queen has to move.", '…Rc8 — the rook hits your queen.'],
    ["Where does the queen go? Qa4, off the c-file and with threats of its own: it hits the pawn on a7, which has no guard, and the knight on d7. No other square comes close.", 'Qa4 — hits a7 and d7.'],
    ["…Nc7 — the knight comes off e8 at last and covers b5 and d5. The engine prefers …a5, putting the pawn where their b6 pawn guards it. As it is, your queen still hits a7.", '…Nc7 — out at last; …a5 was better.'],
    ["Nf1, the engine's first choice, and the knight starts its trip. Remember f1, the square your rook cleared: from there the knight heads for e3, where it would hit d5.", 'Nf1 — the knight reroutes toward e3.'],
    ["…b5 — the pawn hits your queen on a4 and grabs space on the queenside. You're clearly better. Your plan from here: the queen steps back to d1, the knight comes back into play from f1, and you push h4 on the kingside, where your e5 pawn gives you the room, while their bishop on b7 stays shut in behind d5.", '…b5 — queen back, then h4.'],
  ],
  'Open Catalan: a6-b5 with a4 Break': [
    ["…a6 — the masters' most popular move here, about a third of them. Can they keep the extra pawn? This is how they try: …a6 gets ready for …b5, and a pawn on b5 would guard c4.", '…a6 — preparing …b5 to hold c4.'],
    ["You castle, as eight masters in ten do. The engine prefers Ne5 right away: the knight hits c4 and gets off your bishop's diagonal.", 'O-O — Ne5 at once was stronger.'],
    ["…b5, and the pawn on c4 has a guard. But look at the price. With the b-pawn gone from b7, the long diagonal runs from your bishop on g2 all the way to their rook on a8, and only your own knight on f3 stands in between. Nine masters in ten play …Nc6 here instead, and the engine agrees with them.", '…b5 — holds c4, opens the line to a8.'],
    ["Ne5, so move the knight! It hits the pawns on c4 and f7. But the real point is behind it: with f3 empty, your bishop on g2 now hits the rook on a8, which has no guard. Every other move is far behind this one, and you're a little better.", 'Ne5 — unleashes g2 onto a8.'],
    ["…Nd5, the engine's choice: the knight jumps into d5 and blocks the diagonal. But now that knight is pinned to the rook on a8. If it moves, your bishop takes the rook.", '…Nd5 — blocks, but pinned to a8.'],
    ["a4 — now go after the chain. The pawn on b5 is what holds c4, so a4 hits b5. If b5 goes, c4 has nothing left.", 'a4 — hits b5, the pawn holding c4.'],
    ["…Bb7 — the bishop steps in behind the knight and guards the rook on a8. The knight on d5 still stands on your bishop's diagonal, but now it shields a bishop, not the rook.", '…Bb7 — guards a8; the knight shields it.'],
    ["axb5 — you take, and this is where your edge slips away: it's about level now. The engine much prefers b3 first, hitting c4 while b5 still has to hold it. Remember the method: against a chain of pawns on a6, b5 and c4, hit it in two places at once.", 'axb5 — b3 first was much stronger.'],
    ["…axb5 — they take back, and the a-file opens, rook facing rook. Your rook on a1 has no guard, so the trade comes now.", '…axb5 — rooks face off on the a-file.'],
    ["Rxa8 — you trade first. Your rook on a8 hits the knight on b8, which is pinned to their queen, so they have to take back at once.", 'Rxa8 — they must take back.'],
    ["…Bxa8 — the bishop takes back into the corner, still on the long diagonal, and you're a little better. Your plan from here: e4, kicking the knight off d5, then Nc3 to go after the pawns on b5 and c4.", '…Bxa8 — next e4 hits d5.'],
  ],
  'Catalan with ...Nbd7 Line': [
    ["a4 — two masters in three play this before taking back, and it's the engine's first choice. Why wait? Remember …b5 from the main line. Your pawn on a4 covers b5, so that kick would land on a square your pawn hits. The pawn on c4 can wait a move.", 'a4 — stop …b5 before taking.'],
    ["…Bd7, the engine's first choice. The bishop hits your pawn on a4, which your queen guards, and it's heading for c6, where it can challenge your bishop on the long diagonal.", '…Bd7 — on its way to c6.'],
    ["Qxc4 — now you take, and material is level. Your queen on c4 hits the pawns on a6, c7 and e6, and each one is guarded, so this is just a good square for it.", 'Qxc4 — material level.'],
    ["…Bc6 — there it is: the bishop lands on the long diagonal, aimed at yours on g2. It hits your knight on f3, the piece standing between them, and the pawn on a4.", '…Bc6 — challenges the long diagonal.'],
    ["Bf4 — your dark-squared bishop comes out and hits the pawn on c7, and you're a little better. Bg5 rates about the same.", 'Bf4 — develops, hits c7.'],
    ["…Nbd7, the engine's choice: their last minor piece comes out. Watch it, though. From d7 the knight can jump to b6, where it hits your queen.", '…Nbd7 — b6 is next.'],
    ["Nc3 — your last minor piece develops too, covering d5 and e4, and you're a little better.", 'Nc3 — covers d5 and e4.'],
    ["…Nb6, and there's the jump: the knight hits your queen on c4 and the pawn on a4.", '…Nb6 — hits the queen.'],
    ["Qd3 — the queen steps back, and from d3 it hits a6 and h7. The engine prefers Qb3, which also guards your pawn on a4. After Qd3 it's about level.", 'Qd3 — back; Qb3 was better.'],
    ["…Nbd5 — the knight jumps into d5 and hits two of your pieces at once, the knight on c3 and the bishop on f4. Both are guarded, so it's an offer to trade.", '…Nbd5 — hits c3 and f4.'],
    ["Nxd5 — you take the trade. Your knight on d5 hits the bishop on e7 and the knight on f6, but it has no guard, so they take back, and it's about level. Your plan from here: when their knight takes back on d5, it hits your bishop on f4, so the bishop drops to d2 and a rook comes to d1, behind your d4 pawn.", 'Nxd5 — the trade; Bd2 and Rd1 next.'],
  ],
  'Catalan vs Slav Setup: ...c6 and ...dxc4': [
    ["…d5, about a quarter of masters: they meet your pawn head-on. This tab is about a different move order. They head for a Slav, and you still build the Catalan.", '…d5 — head-on in the centre.'],
    ["c4, three masters in four: the Queen's Gambit. The pawn hits d5, and nothing guards your c4 pawn. As always in the Catalan, that's fine.", 'c4 — the gambit pawn hits d5.'],
    ["…c6 — the Slav, about half the masters. The pawn props up d5, and unlike …e6 it keeps the road open for their bishop on c8. That's the Slav's whole point: no shut-in bishop.", '…c6 — the Slav; c8 stays free.'],
    ["Nf3, two masters in three. The knight covers d4 and e5 and keeps your options open. You haven't shown yet where your bishops go.", 'Nf3 — develops, keeps options open.'],
    ["…Nf6, nine masters in ten. The knight develops and gives d5 another guard.", '…Nf6 — another guard on d5.'],
    ["g3 — and here's the Catalan against the Slav. Few masters play it: most choose Nc3 or e3, and the engine prefers Nc3. After g3 it's about level. The idea is the same as always: your bishop goes to g2, and if they take on c4, you go after it with your pieces.", 'g3 — the Catalan bishop, against the Slav.'],
    ["…dxc4, the engine's first choice; about a quarter of masters take, and more of them develop with …Bf5 first. Here's the difference from the …e6 lines: their pawn on c6 can back up …b5, so they can try to keep this pawn.", '…dxc4 — and c6 can back up …b5.'],
    ["Bg2, nearly every master. The bishop takes its place on the long diagonal, behind your knight on f3 for now.", 'Bg2 — the bishop on its diagonal.'],
    ["…b5, about a third of masters. The pawn guards c4, with the c6 pawn behind it. The engine prefers …g6, developing instead of clinging to the pawn.", '…b5 — holds c4; …g6 was better.'],
    ["a4 — straight at the chain. The pawn hits b5, the pawn that holds c4. Castling and Ne5 rate about the same.", 'a4 — hits b5, the pawn holding c4.'],
    ["…Bb7, the engine's first choice, and you're a little better. The bishop develops, but for now it stares at its own pawn on c6.", '…Bb7 — develops behind its c6 pawn.'],
    ["Ne5, the engine's first choice. The knight hits the pawns on c4 and c6, and with f3 empty your bishop on g2 hits c6 too.", 'Ne5 — hits c4, opens the diagonal.'],
    ["…a6 — they give b5 another guard, and the chain holds: a6 guards b5, b5 guards c4.", '…a6 — now a6 holds b5, b5 holds c4.'],
    ["axb5, and it's about level. The engine prefers b3, hitting c4 first, the same method as in the a4-break tab: hit the chain in two places.", 'axb5 — b3 first was stronger.'],
    ["…axb5 — they take back, and the a-file opens with the rooks facing each other. Your rook on a1 has no guard, so the trade comes now.", '…axb5 — rooks face off on the a-file.'],
    ["Rxa8 — you trade. Your rook hits the knight on b8, which is pinned to their queen, so they take back at once.", 'Rxa8 — they must take back.'],
    ["…Bxa8 — the bishop takes back into the corner. It's on the long diagonal, facing your bishop on g2, with their own pawn on c6 in between.", '…Bxa8 — back on the long diagonal.'],
    ["You castle, and it's about level; Nc3 rates the same. They're still a pawn up, but the pawn on c4 has only b5 to lean on.", 'O-O — king safe; c4 is next.'],
    ["…e6 — the pawn opens the road for their bishop on f8, so they can castle next.", '…e6 — frees the f8 bishop.'],
    ["b3 — and now count the pawn on c4: your knight on e5 and the b3 pawn hit it, and only the pawn on b5 guards it. It's about level. Your plan from here: if they take on b3, your knight comes to c3 and goes after b5, and your bishop on g2 keeps leaning on c6.", 'b3 — c4 is hit twice now.'],
  ],
  'Catalan Declined: ...Be7 without ...dxc4': [
    ["b3 — the other way, about three masters in ten. Instead of a knight to d2 to prepare e4, you give c4 a pawn guard and get ready for a second fianchetto, with the bishop on b2.", 'b3 — guards c4, Bb2 next.'],
    ["…b6, three masters in four, the engine's first choice. They answer in kind: the c8 bishop gets a road out through b7.", '…b6 — a road for their c8 bishop.'],
    ["Bb2, the engine's first choice; about six masters in ten play Rd1 first. Now both your bishops sit on long diagonals: one on g2, one on b2 behind your d4 pawn.", 'Bb2 — the second fianchetto.'],
    ["…Bb7, seven masters in ten. They mirror you, but their bishop on b7 stands behind its own pawns on c6 and d5.", '…Bb7 — behind its own pawns.'],
    ["Nc3, seven masters in ten and the engine's first choice. The knight hits d5 and covers e4, the square for your break.", 'Nc3 — hits d5, covers e4.'],
    ["…Rc8 — the rook goes to the c-file, behind their c6 pawn, ready for …c5 one day.", '…Rc8 — ready for …c5.'],
    ["e4, the engine's first choice: the break. The pawn hits d5, and your queen and knight back it up. You're a little better.", 'e4 — the central break.'],
    ["…dxe4, the engine's first choice. They take, and the pawn on e4 now hits your knight on f3.", '…dxe4 — hits your f3 knight.'],
    ["Nxe4 — you take back with the knight, and it hits the knight on f6.", 'Nxe4 — recaptures, hits f6.'],
    ["…Nxe4 — they trade knights, and their knight on e4 has no guard, so your queen takes it next. The engine prefers …c5, hitting your d4 pawn first.", '…Nxe4 — trade; …c5 was better.'],
    ["Qxe4 — the queen takes back and stands in the centre, hitting the pawns on c6, e6 and h7, and you're a little better. Your plan from here: a rook to d1 behind your d4 pawn, and meet their …c5 break with every piece ready, both bishops already on their long diagonals.", 'Qxe4 — centralised; rook to d1 next.'],
  ],
  'Early Qa4+ Line': [
    ["…Bd7 — fewer than one master in ten. Two ideas in one move. The bishop heads for c6 to fight your bishop on the long diagonal. And it stands on the line from a4 to e8, so your queen can't come to a4 with check.", '…Bd7 — blocks Qa4 check, heads for c6.'],
    ["Ne5, eight masters in ten and the engine's choice. The knight hits the bishop on d7 and the pawn on c4. And by leaving f3 it opens your bishop's diagonal: the pawn on b7 is pinned to the rook on a8 again.", 'Ne5 — hits d7, reopens the diagonal.'],
    ["…Bc6, nearly every master. The bishop blocks your diagonal and offers a trade: it hits your bishop on g2, which has no guard, with your rook on h1 behind it.", '…Bc6 — hits your g2 bishop.'],
    ["Nxc6, the engine's choice. Should you castle first? No: that lets them take on g2 first. So you remove their bishop now, and your knight on c6 hits the queen on d8, so they take back at once.", 'Nxc6 — trade it off before it trades.'],
    ["…Nxc6 — the knight takes back and hits your pawn on d4. Taking with the b-pawn would be much worse. Look at what's left: you have the two bishops, they have a bishop and two knights.", '…Nxc6 — you have the bishop pair.'],
    ["You castle, the engine's first choice. Now your bishop on g2 has your king next to it, and you're a little better.", 'O-O — the g2 bishop is guarded.'],
    ["…Qd7, the engine's first choice. The queen still hits d4, and now b8, c8 and d8 are all clear, so they can castle long.", '…Qd7 — castling long is next.'],
    ["e3 — the pawn gives d4 a second guard. Now the centre is solid, and you can turn to c4.", 'e3 — d4 is solid now.'],
    ["…O-O-O — they castle long, and the kings are on opposite sides. Their king on c8 sits on the same side as the c4 pawn you want back.", '…O-O-O — kings on opposite sides.'],
    ["Qa4, at last — the queen hits the pawn on c4, which has no guard, and the knight on c6, which your bishop on g2 hits too. This is the square …Bd7 was meant to keep your queen from, but that bishop is gone. The engine prefers developing with Nc3 or Nd2, and Nd2 hits c4 with a knight; after Qa4 it's about level.", 'Qa4 — hits c4 and c6; Nd2 was stronger.'],
    ["…Nd5, the engine's first choice. They don't try to save c4: the knight leaves c6, steps into the centre and hits your pawn on e3.", '…Nd5 — centralises; c4 is given up.'],
    ["Qxc4 — the pawn is back, and material is level, about level on the board too. Your plan from here: their king is on c8, so push your queenside pawns toward it with a3 and b4, while they go for your king with …h5 and …h4. With the kings on opposite sides, it's a race.", 'Qxc4 — level; a3 and b4 next.'],
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

export const CATALAN_OPENING_WATCH: WatchCourse = {
  openingId: 'catalan-opening',
  title: 'The Catalan — A Master Class',
  orientation: 'white',
  sources: ['concept:pos-center', 'concept:pos-development', 'concept:pos-open-file', 'concept:pos-outpost', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
