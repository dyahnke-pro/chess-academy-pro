// The King's Gambit — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=kings-gambit`):
// masters' percentages, engine lines at depth 16, the board after each move.
// Standard: docs/OPENING-WATCH-BEATS.md; said in the think-out-loud register.
// The student plays White. It is a gambit, so the evals are said honestly: f4
// costs most of a pawn against Nf3, and most lines leave them a little better.
// One story runs through the course: f4 pulls their e-pawn out of the center;
// Nf3 shuts the h4 check that f4 opened; d4 points the c1 bishop at the pawn
// on f4, and every line is about winning that pawn back (remove its guard in
// the main line, hit the g5 chain with h4, or give pieces for time in the
// Muzio and the Allgaier).
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd5', 'exd5', 'Nf6', 'Bc4', 'Nxd5', 'O-O', 'Be7', 'd4', 'O-O', 'Bxd5', 'Qxd5', 'Nc3', 'Qd8', 'Bxf4', 'Bf5', 'Qe2', 'Nc6', 'Kh1', 'Re8', 'Nb5', 'Rc8', 'Rae1', 'Nb4', 'Nxa7', 'Nxc2', 'Nxc8', 'Nxe1', 'Rxe1'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — the king's pawn takes the center and opens the way for your queen and the bishop on f1. Close to half the masters' games start here. Now look at the pawn beside it on f2: in the King's Gambit, that's the pawn you throw forward next.", 'e4 — the center; the f-pawn waits.'],
  ["…e5 — they meet you pawn for pawn. The Sicilian, …c5, is the masters' most common answer, close to half their games, and …e5 comes in about a quarter. But …e5 is the move that makes the King's Gambit possible: e5 is the pawn your f-pawn is about to hit.", '…e5 — the pawn f4 will hit.'],
  ["Here it is: f4, a pawn offered on the second move. Why give it away? Look at what it hits: the pawn on e5, and nothing guards that pawn. If they take, their e-pawn leaves the center, so d4 can come with no pawn on e5 to hit it, and the f-file is yours: no pawn of yours stands on it, and once you castle your rook looks straight up it. It's one of the oldest openings in chess. The price is real, though. Nine masters in ten play Nf3, the engine prefers it too, and after f4 they are a little better. Your own pawn on f4 has no guard, and with f2 empty, the diagonal from h4 to your king on e1 is open.", 'f4 — a pawn for the center and f-file.'],
  ["…exf4 — two masters in three take it, and the engine agrees: grab the pawn and make you prove it was worth it. They're a pawn up now, but look what left the center: their e-pawn. The road to d4 is clear for you, and winning back the pawn on f4 is half the plan from here. They are a little better.", '…exf4 — accepted; their e-pawn left the center.'],
  ["Remember that open diagonal from h4 to your king? Nf3 shuts it: the knight covers h4, so …Qh4+ can't come. Without the knight there, the check is real: after Nc3 instead, …Qh4+ comes and your king ends up on e2. About seven masters in ten play Nf3, the King's Knight Gambit. The engine prefers Bc4, the Bishop's Gambit, which has its own tab. They are a little better.", 'Nf3 — covers h4, no …Qh4+.'],
  ["…d5 — instead of holding on to the extra pawn, they hit back in the center: the pawn strikes your e4 pawn, which nothing guards. About one master in seven plays it. …g5, guarding f4 with a pawn, is the masters' most common move and the engine's choice; it has its own tab, and so does …d6. After …d5 it's about level.", '…d5 — strikes back at e4.'],
  ["Every master takes. exd5 removes the pawn that was hitting e4, and material is level again: you've won back a pawn for the one on f4. But the new pawn on d5 has no guard. It's about level.", 'exd5 — material level, but d5 is loose.'],
  ['…Nf6, almost nine masters in ten: the knight develops and hits your d5 pawn, which has no guard. So how do you hold it? They are a little better.', '…Nf6 — develops, hits d5.'],
  ['About half the masters bring the bishop out: Bc4 guards the pawn on d5, and with f1 empty your king is ready to castle. The engine prefers c4, holding d5 with a pawn instead, and Bb5+ is the masters\' other try. They are a little better.', 'Bc4 — guards d5, ready to castle.'],
  ["…Nxd5 — about eight masters in ten take it, and they're a pawn up again: the gambit pawn on f4 is still theirs. The knight stands in the center, guarded by their queen. And notice its other job: from d5 it guards the pawn on f4. Remember that. The engine prefers …c6 first, so a pawn can take on d5 instead. It's about level.", '…Nxd5 — a pawn up again.'],
  ['You castle, and look where the rook lands: f1, on the file your f-pawn left. Once the knight on f3 steps aside, that rook looks straight at f4. About six masters in ten castle here. They are a little better.', 'O-O — king safe, rook on f1.'],
  ["…Be7 develops the bishop and clears f8, so their king can castle. From here the line has left the masters' games. The engine prefers …Be6, a second guard for the knight on d5. It's about level.", '…Be7 — develops, castling next.'],
  ["d4 — the center pawn steps up, and look what it opens: with d2 empty, your bishop on c1 looks straight down the diagonal at f4. The gambit pawn is attacked, and only the knight on d5 guards it. It's about level.", 'd4 — the c1 bishop now hits f4.'],
  ["…O-O — their king gets safe. But it does nothing for f4, and the engine prefers …Be6, guarding the knight on d5. Why does that knight matter so much? It's the only thing holding the pawn on f4. Take it off the board, and f4 falls. It's about level.", '…O-O — but f4 hangs on one knight.'],
  ["So you take it. Bxd5 removes the knight that was guarding f4: that's called removing the defender. Yes, you give up your bishop for it, but once they take back, nothing guards f4. It's about level.", "Bxd5 — removes f4's only guard."],
  ['…Qxd5 takes back, and the queen lands in the center, hitting your pawns on a2 and d4 and your knight on f3. But look at f4: no piece of theirs guards it now. Do you take it right away, or hit the queen first? It\'s about level.', '…Qxd5 — central queen; f4 unguarded.'],
  ['Nc3 develops with a hit on the queen, and from c3 the knight guards a2. But it gives them a move, and the engine prefers taking on f4 at once: after Nc3, …Qf5 can step over to guard the pawn. They are a little better.', 'Nc3 — hits the queen; Bxf4 was better.'],
  ["…Qd8 — the queen goes all the way home and leaves f4 to its fate. …Qd6 or …Qf5, the engine's choices, would keep a guard on that pawn. Back on d8 the queen still hits d4, but now Bxf4 is free. It's about level.", '…Qd8 — retreats, and f4 is free.'],
  ["Bxf4 — and there it is: the gambit pawn comes home, and material is level. Your bishop sits on an open diagonal, hitting c7, and your rook on f1 waits on the f-file for the knight on f3 to step aside. That's what f4 bought: quick development and open lines. It's about level.", 'Bxf4 — the gambit pawn back, level.'],
  ["…Bf5, the engine's first choice: their last minor piece comes out and hits your pawn on c2. Right now your queen on d1 guards it. Keep an eye on that pawn. It's about level.", '…Bf5 — develops, hits c2.'],
  ["Where does the queen belong? e2, the engine's first choice. It takes the open e-file and hits the bishop on e7, it keeps guarding c2, and with d1 empty your rooks now see each other. It's about level.", 'Qe2 — the e-file, hits e7, guards c2.'],
  ["…Nc6 — the last knight comes out and hits d4. Count it: their knight and queen both hit that pawn, and only your knight on f3 guards it. So why don't they just take it? Look at e7: their queen is one of its guards. If they trade on d4 and the queen takes back, nothing is left guarding e7, and your queen takes the bishop. It's about level.", '…Nc6 — a second attacker on d4.'],
  ["Kh1 — a quiet move, tucking your king into the corner. But it does nothing for d4, and the engine prefers Rad1, a rook behind that pawn to guard it. It's about level.", 'Kh1 — quiet; Rad1 guarded d4.'],
  ["…Re8 takes the e-file and backs up the bishop on e7 from behind. Count its guards now: the queen, the knight on c6 and the rook. Your queen on e2 won't win it. It's about level.", '…Re8 — backs up e7.'],
  ['Nb5 — the knight hits a7 and c7, and from b5 it gives d4 a second guard. Look at c7: your knight and your bishop on f4 both hit it, and only their queen guards it. And if the knight ever lands on c7, it hits both rooks, on a8 and e8. But the engine prefers Qf2 or Qc4, and after Nb5 they are a little better.', 'Nb5 — hits a7 and c7.'],
  ["…Rc8, the engine's first choice: the rook leaves a8 before your knight can land on c7, and it gives c7 a second guard. Notice what holds a7 now: only the knight on c6. They are a little better.", '…Rc8 — guards c7, rook off a8.'],
  ['Rae1 — the rook joins your queen on the e-file, lining up on e7. But look what it leaves behind: the pawn on a2 has no guard now. The engine prefers Qf2, and after Rae1 they are clearly better: …a6 can chase your knight off b5, and then d4 has lost a guard.', 'Rae1 — e-file battery, but a2 unguarded.'],
  ['…Nb4 — the knight jumps at your queenside and hits a2 and c2. Count c2: their knight and bishop hit it, and only your queen guards it. But the knight just left c6, and that was the only guard on a7. The engine prefers …a6, chasing your knight first; after …Nb4 it\'s about level.', '…Nb4 — hits a2 and c2; a7 loose.'],
  ["Nxa7 — take the pawn that just lost its guard, and the knight hits the rook on c8 on the way. Your c2 pawn is still hit twice, but now you're hitting something too. It's about level.", 'Nxa7 — grabs a7, hits the rook.'],
  ['…Nxc2 — the knight takes c2, guarded by their bishop on f5, and now it hits your rook on e1 and your pawn on d4. Your rook is attacked, and your knight is hitting their rook. Who takes first? They are a little better.', '…Nxc2 — hits your rook on e1.'],
  ['Nxc8 — you take first: the knight grabs the rook on c8 and hits the bishop on e7. But it has no guard there, and their queen and bishop both hit it. The engine prefers Rd1, saving your rook before anything else. They are a little better.', 'Nxc8 — takes the rook, hits e7.'],
  ['…Nxe1 — they take your rook right back, and the knight on e1 now hits your knight on f3 and your g2 pawn. Material is level for the moment. They are a little better.', '…Nxe1 — the rook back, level.'],
  ["Rxe1 — you take the knight, and for a moment you're a piece up. But your knight on c8 has no guard, and their queen and bishop both hit it, so after …Bxc8 the material is level again, and they are a little better. Your plan: after …Bxc8, Bg5 adds a bishop to your queen and rook against e7 on the open e-file, while your knight on f3 keeps guarding the isolated pawn on d4.", 'Rxe1 — c8 will fall; e-file pressure.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move no earlier line shares. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  "King's Knight Gambit Classical": ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'Bg7', 'h4', 'h6', 'd4', 'd6', 'Nc3', 'Nc6', 'Ne2', 'Qf6', 'Qd3', 'Nge7', 'Bd2', 'g4', 'Nfg1'],
  'Fischer Defense': ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd6', 'd4', 'g5', 'h4', 'g4', 'Ng1', 'Bh6', 'Nc3', 'Nc6', 'Nge2', 'f3', 'Ng3', 'Qf6', 'Bxh6', 'Qxh6', 'Qd3'],
  'Muzio Gambit': ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'g4', 'O-O', 'gxf3', 'Qxf3', 'Qf6', 'e5', 'Qxe5', 'Bxf7+', 'Kxf7', 'd4', 'Qf5', 'g4', 'Qg6'],
  'Falkbeer Counter-Gambit': ['e4', 'e5', 'f4', 'd5', 'exd5', 'e4', 'd3', 'Nf6', 'dxe4', 'Nxe4', 'Nf3', 'Bc5', 'Qe2', 'Bf5', 'Nc3', 'Qe7', 'Be3', 'Bxe3', 'Qxe3', 'Nxc3', 'Qxe7+', 'Kxe7'],
  "King's Gambit Declined": ['e4', 'e5', 'f4', 'Bc5', 'Nf3', 'd6', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb6', 'Nc3', 'O-O', 'e5', 'dxe5', 'fxe5', 'Nd5', 'Bg5', 'Nxc3', 'bxc3', 'Qd5'],
  'Kieseritzky Gambit': ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ne5', 'Nf6', 'd4', 'd6', 'Nd3', 'Nxe4', 'Bxf4', 'Bg7', 'Nc3', 'f5', 'Nxe4', 'fxe4', 'Bg5'],
  'Allgaier Gambit': ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ng5', 'h6', 'Nxf7', 'Kxf7', 'd4', 'd5', 'Bxf4', 'Nf6', 'Nc3', 'Kg7', 'Bd3', 'dxe4', 'Nxe4'],
  "Bishop's Gambit (3.Bc4)": ['e4', 'e5', 'f4', 'exf4', 'Bc4', 'Nf6', 'Nc3', 'c6', 'Bb3', 'd5', 'exd5', 'cxd5', 'd4', 'Bd6', 'Nge2', 'O-O', 'Bxf4', 'Bxf4', 'Nxf4', 'Re8+', 'Nfe2', 'Ng4'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  "King's Knight Gambit Classical": [
    ["…g5 — the masters' most common move here, nearly four in ten, and the engine's first choice. The pawn guards f4, so the gambit pawn stays, and next it can push on to g4 and kick your knight off f3. They are a little better.", '…g5 — the pawn chain holds f4.'],
    ["Bc4 — the bishop aims straight at f7, a pawn only their king guards. But it's not what most masters do: about half of them play h4 at once, hitting g5 before the chain settles, and the engine prefers d4. Here's the risk: …g4 can now hit your knight on f3, and that's where the Muzio begins. They are clearly better.", 'Bc4 — aims at f7, invites …g4.'],
    ['…Bg7 — just over half the masters choose it. The bishop takes the long diagonal: it covers e5 and d4, and at the far end it pins your b2 pawn to the rook on a1. The engine prefers …g4, hitting your knight. They are a little better.', '…Bg7 — long diagonal, pins b2.'],
    ['Now strike the chain. h4 hits g5, the pawn that holds f4: if g5 falls, f4 falls with it. About one master in six plays it here; most castle or play d4 first. They are a little better.', 'h4 — hits g5, which holds f4.'],
    ['…h6, nine masters in ten: the pawn guards g5, so the chain holds. And if you take on g5 and they take back, their rook on h8 faces yours down the open h-file.', '…h6 — props up g5.'],
    ["So leave g5 alone for now. d4, about eight masters in ten, takes the center and does two more jobs: it opens your bishop on c1 toward f4, and it blocks the long diagonal, so b2 is no longer pinned. Taking on g5 first trades rooks on the h-file and costs you more. They are a little better.", 'd4 — center, opens c1, frees b2.'],
    ['…d6 — about three masters in four. The pawn covers e5, so a knight of yours landing there would just be taken, and it opens the road for the bishop on c8. Look at their pawns now: f4, g5 and h6, all holding each other. They are a little better.', '…d6 — covers e5, frees c8.'],
    ['Nc3 develops and guards your e4 pawn. Most masters play c3 or castle here, but Nc3 costs nothing against the engine\'s best. They are a little better.', 'Nc3 — develops, guards e4.'],
    ['…Nc6, four masters in five: the knight develops and hits d4. Count it: their knight and the bishop on g7 hit it, and your queen and knight guard it, so it holds. They are a little better.', '…Nc6 — hits d4, which holds.'],
    ['Ne2 — the knight swings over to hit f4 and guard d4. But it spends a move rerouting, and the engine prefers Qd3, as about six masters in ten play. They are clearly better.', 'Ne2 — hits f4; Qd3 was better.'],
    ['…Qf6 hits d4 and gives f4 a second guard. The engine prefers …g4 at once, kicking your knight off f3. They are clearly better.', '…Qf6 — hits d4, guards f4.'],
    ["Qd3, the engine's first choice: the queen guards d4 and e4, and it leaves d1, one step closer to castling long. They are clearly better.", 'Qd3 — guards d4 and e4.'],
    ["…Nge7: the last knight comes out behind their queen, and from e7 it covers d5 and f5. They are clearly better.", '…Nge7 — develops, covers d5 and f5.'],
    ["Why Bd2? The bishop keeps its aim at f4 and clears c1, so b1, c1 and d1 are all empty and your king can castle long. They are clearly better.", 'Bd2 — hits f4, ready to castle long.'],
    ["…g4 — here's the push the chain was waiting for: the pawn hits your knight on f3. But notice what it gives up: f4 has lost its pawn guard, and only their queen holds it now. They are a little better.", '…g4 — hits f3; f4 loses its guard.'],
    ["Where does the knight go? Back to g1, the engine's choice. It looks ugly, but castling or c3 would leave the knight to be taken, and the engine rates those a pawn and a half worse. They are clearly better. Your plan: castle long, then Nxf4 to win back the gambit pawn, while you watch d4, which their knight and queen both hit.", 'Nfg1 — the knight retreats home.'],
  ],
  'Fischer Defense': [
    ["…d6 — the Fischer Defence, played by nearly one master in five. Before holding the pawn with …g5, they cover e5, so your knight can't use that square the way it does in the Kieseritzky. The engine prefers …g5 at once. It's about level.", '…d6 — covers e5 before …g5.'],
    ["d4 — about six masters in ten. The pawn takes the center, and it opens your bishop on c1: now it hits f4, and nothing guards that pawn. So they have to decide right now how to hold it. It's about level.", 'd4 — center; c1 now hits f4.'],
    ['…g5, almost every master: the pawn guards f4, the move …d6 was getting ready for. They are a little better.', '…g5 — now f4 is held.'],
    ["h4, about two masters in three: hit the chain at g5, the pawn that holds f4. It's about level.", 'h4 — hits g5, the f4 guard.'],
    ['…g4, almost every master: the pawn steps past your h-pawn and hits your knight on f3. But look what it costs them: g5 was the guard of f4, and now f4 stands alone, hit by your bishop on c1. They are a little better.', '…g4 — hits f3, leaves f4 alone.'],
    ["Where does the knight go? The natural grab is Bxf4, but then …gxf3 takes your knight. Ng5 ends in a sacrifice on f7. So the engine's choice is the humble one: back home to g1. From there it can come out again to e2, where it hits f4. They are a little better.", 'Ng1 — retreats, heading for e2.'],
    ["…Bh6 — the bishop takes over the pawn's old job: from h6 it guards f4. The engine prefers …Qf6. They are a little better.", '…Bh6 — guards f4.'],
    ["Nc3 develops and guards e4, so your other knight is free to take the long road through e2. It's about level.", 'Nc3 — develops, guards e4.'],
    ["…Nc6 develops and hits d4, which only your queen guards. It's about level.", '…Nc6 — hits d4.'],
    ["Nge2 — and here's why the knight went home: from e2 it hits f4 and guards d4. Now f4 is hit twice, by the knight and the bishop on c1, and guarded once, by the bishop on h6. It's about level.", 'Nge2 — hits f4, guards d4.'],
    ["So how do they save f4? They don't: …f3, the engine's first choice, pushes it forward with a hit on your knight on e2 and your g2 pawn, so you have to spend a move on it. It's about level.", '…f3 — hits e2 and g2.'],
    ['Ng3 steps out of the pawn\'s way and guards e4. The engine prefers Nf4, on the square the pawn just left. They are a little better.', 'Ng3 — guards e4; Nf4 was better.'],
    ["…Qf6: the queen hits d4 and h4. Count d4: their knight and queen hit it, and only your queen guards it now. Your rook on h1 holds h4. They are a little better.", '…Qf6 — hits d4 and h4.'],
    ["Bxh6 — trade off their bishop, the engine's choice, and watch what the recapture does: when their queen takes back, it leaves f6, the square where it was hitting d4. They are a little better.", 'Bxh6 — trades, pulls the queen off f6.'],
    ['…Qxh6 — the queen takes back and now hits h4, which your rook on h1 guards. And look at its diagonal: from h6 the queen also covers c1, so for now you can\'t castle long. They are a little better.', '…Qxh6 — hits h4, covers c1.'],
    ["Qd3 hits the pawn on f3, guards d4, and covers e3, where their queen could check you. But the engine prefers Nd5, jumping into the center first, and after Qd3 they are clearly better. Your plan: take the f3 pawn back with gxf3, and get your king to safety once their queen stops covering c1.", 'Qd3 — hits f3; Nd5 was better.'],
  ],
  'Muzio Gambit': [
    ["…g4 — about a third of the masters play it, and it's the engine's first choice: the pawn hits your knight on f3. Normally you'd move the knight. In the Muzio, you don't. They are a little better.", '…g4 — hits your knight on f3.'],
    ["Castle, and leave the knight hanging. That's the Muzio Gambit, and nine masters in ten play it here: a whole knight offered for time. If they take it, your queen takes back on f3, lined up with your rook on the f-file, and your bishop on c4 is aimed at f7. Retreating with Ng1, the engine's second choice, is a little worse. They are a little better.", 'O-O — the Muzio: give up the knight.'],
    ["…gxf3, nine masters in ten: they take the knight, and they're a piece and a pawn up. Their pawn on f3 hits g2, and it has no guard. They are clearly better.", "…gxf3 — they're a piece up."],
    ['Qxf3, every master: the queen takes back and hits f4, which nothing guards. Now count what points at their king: your queen and your rook on f1 on the f-file, and the bishop on c4 aimed at f7. They are clearly better.', 'Qxf3 — hits f4, the f-file loads.'],
    ['…Qf6, nine masters in ten: the queen guards f4 and f7 at once, and it hits your b2 pawn down the long diagonal. They are clearly better.', '…Qf6 — guards f4 and f7.'],
    ['e5 — a second pawn thrown in, and half the masters play it: the pawn hits the queen, and if the queen takes it, it leaves f6, and f7 is left with only their king to guard it. The engine prefers the quiet d3. They are clearly better.', 'e5 — hits the queen, pulls it off f7.'],
    ['…Qxe5, every master: they take a second pawn, and the queen hits b2. But f7 now has only their king to guard it. They are clearly better.', '…Qxe5 — f7 left to the king.'],
    ['Bxf7+ — a little over half the masters play it: the bishop takes f7 with check, and if the king takes, it\'s dragged onto f7, the file your queen and rook are lined up on. The quiet d3 is just as good. They are clearly better.', 'Bxf7+ — drags the king to f7.'],
    ["…Kxf7, every master. Now their king stands on f7, and look at the pawn on f4: it's pinned to that king by your queen on f3, so it can't move. You're down a lot of material. Can the attack make up for it? They are clearly better.", '…Kxf7 — f4 is pinned to the king.'],
    ["d4, every master: the pawn hits the queen on e5 and opens your bishop on c1, which now hits f4 too. The pawn on d4 has no guard, though, and half the masters' games go …Qxd4+. They are clearly better.", 'd4 — hits the queen, opens c1.'],
    ["…Qf5 — the other half of the masters' games, and the engine's first choice. The queen steps onto the f-file in front of its king: it guards f4 and hits your c2 pawn, which has no guard. They are clearly better.", '…Qf5 — guards f4, hits c2.'],
    ['g4 hits the queen, and it\'s tempting, but it\'s a real mistake: the engine wanted Bxf4, taking back the pinned pawn, and after g4 they are winning.', 'g4 — hits the queen; Bxf4 was the move.'],
    ["…Qg6: the queen steps away and pins your g4 pawn to your king, and it still hits c2. They are winning. Your plan: Bxf4 to win back the pinned pawn, then Nc3 to bring your last pieces out, while their king on f7 has no pawns left in front of it on the f- and g-files.", '…Qg6 — pins g4, hits c2.'],
  ],
  'Falkbeer Counter-Gambit': [
    ["…d5 — the Falkbeer Counter-Gambit: they don't take your pawn, they offer one back and hit e4. Nearly one master in five chooses it. The engine prefers …exf4. It's about level.", '…d5 — a counter-gambit, hits e4.'],
    ["exd5, almost every master: you take the pawn, and now you're a pawn up. Their e5 pawn and your f4 pawn are still hitting each other, and neither has a guard. It's about level.", 'exd5 — a pawn up, tension stays.'],
    ["…e4 — the Falkbeer's wedge, about one master in four. The pawn leaves the tension and plants itself on e4, where it takes f3 away from your knight. The engine prefers …exf4, and after …e4 you are a little better.", '…e4 — the wedge, takes f3 away.'],
    ['d3, more than eight masters in ten and the engine\'s choice: hit the wedge at once, before they can support it. The pawn attacks e4, which has no guard. You are a little better.', 'd3 — hits the wedge on e4.'],
    ['…Nf6, about eight masters in ten: the knight guards e4 and hits your pawn on d5, the extra one, which has no guard. You are a little better.', '…Nf6 — guards e4, hits d5.'],
    ["dxe4 takes the wedge off the board. For the moment you're two pawns up, though the pawn on e4 is loose, hit by their knight. You are a little better.", 'dxe4 — the wedge is gone.'],
    ["…Nxe4, every master: the knight takes back, and you're one pawn up. But look at the diagonal from h4 to your king: f2 and g3 are empty, and the knight on e4 covers g3. …Qh4+ is in the air. You are a little better.", '…Nxe4 — …Qh4+ is in the air.'],
    ['Nf3 — the same idea as in the accepted lines: the knight covers h4, so …Qh4+ is off. About eight masters in ten play it, and so does the engine. You are a little better.', 'Nf3 — covers h4, no check.'],
    ["…Bc5, about eight masters in ten: the bishop takes the diagonal to g1, empty all the way, so your king can't castle short while it sits there. You are a little better.", '…Bc5 — covers g1, no castling short.'],
    ["Qe2, nearly every master: the queen hits the knight on e4, and that knight is pinned to their king on e8. It's attacked, it has no guard, and it can't step away. You are a little better.", 'Qe2 — pins the knight on e4.'],
    ["…Bf5 — the bishop guards the pinned knight on e4. It's about level.", '…Bf5 — guards the pinned knight.'],
    ['Nc3, nearly every master: a second attacker on the pinned knight on e4. Two of your pieces hit it, one of theirs guards it. You are a little better.', 'Nc3 — a second attacker on e4.'],
    ['…Qe7, every master: the queen steps onto the e-file between the knight and its king, so the pin is gone, and it gives the knight on e4 a second guard. Now the two queens face each other through the knight. You are a little better.', '…Qe7 — breaks the pin, guards e4.'],
    ['Be3, every master: the bishop hits the one on c5, the piece that was keeping your king from castling short. Trade it off, and g1 is free. You are a little better.', 'Be3 — offers to trade the c5 bishop.'],
    ['…Bxe3 — they take, about as good as the engine\'s first choice, …Bb4. Their bishop on e3 hits your f4 pawn, but it has no guard: your queen takes it. You are a little better.', '…Bxe3 — trades the bishops.'],
    ["Qxe3 is the only good recapture: the queen takes back and hits a7 and the knight on e4. You are a little better.", 'Qxe3 — hits a7 and the knight.'],
    ["…Nxc3: the knight takes yours and hits a2 and d5. And look at the e-file: the two queens face each other, each pinned to its own king. Whoever takes first does it with check. You are a little better.", '…Nxc3 — the queens pin each other.'],
    ["So take first: Qxe7+, trading queens with check. Their king has to take back, and then your b-pawn takes the knight on c3. You are a little better.", 'Qxe7+ — queens off, with check.'],
    ["…Kxe7 — their king takes back and stands on e7, and it can't castle any more. You are a little better. Your plan: bxc3 takes the knight back, and if their bishop grabs c2, Kd2 and Re1+ bring your king and rook into the ending while theirs sits on e7.", "…Kxe7 — their king can't castle now."],
  ],
  "King's Gambit Declined": [
    ["…Bc5 — they decline. About one master in ten does this: the bishop develops and aims down the diagonal at your knight on g1, the square your king wants for castling. The engine prefers taking the pawn. It's about level.", '…Bc5 — declines, aims at g1.'],
    ["Nf3, nine masters in ten: the knight develops and hits e5, which nothing guards, so now f4 and the knight are both after it. And with g1 empty, their bishop covers that square, so castling short has to wait. It's about level.", 'Nf3 — e5 attacked twice, unguarded.'],
    ["…d6, almost every master: the pawn guards e5 and opens the road for their bishop on c8. It's about level.", '…d6 — guards e5.'],
    ["c3, the engine's first choice and the masters' most common move, about four in ten: the pawn covers d4, getting ready to push d4 and hit the bishop on c5. It's about level.", 'c3 — prepares d4.'],
    ["…Nf6, half the masters: the knight develops and hits e4, and neither your e4 pawn nor your f4 pawn has a guard. It's about level.", '…Nf6 — hits e4.'],
    ["d4, about seven masters in ten: the pawn hits the bishop on c5 and puts a third attacker on e5. Yes, e4 is still loose, but now they have a bishop to worry about. It's about level.", 'd4 — hits the bishop, piles on e5.'],
    ["…exd4, about eight masters in ten: they take, and the pawn on d4 hits c3, so you take back with that pawn. It's about level.", '…exd4 — takes, hits c3.'],
    ["cxd4 takes back and hits the bishop on c5 again. You have pawns on d4 and e4 side by side. It's about level.", 'cxd4 — the center, and c5 is hit.'],
    ["…Bb6: the bishop steps back and hits d4. It still points down the diagonal at g1, but your d4 pawn blocks the way now, so your king can castle short again. It's about level.", '…Bb6 — hits d4; d4 blocks g1.'],
    ["Nc3 develops and guards e4, which has been loose for a while. The engine slightly prefers a4, or pushing e5 at once. It's about level.", 'Nc3 — finally guards e4.'],
    ["…O-O: their king gets safe. Now look at your pawns on d4, e4 and f4: three in a row, and the front one is ready to go. It's about level.", '…O-O — king safe; e5 is coming.'],
    ["e5, the engine's first choice: the break. The pawn hits the knight on f6 and the pawn on d6, with d4 and f4 both standing behind it. It's about level.", 'e5 — the break, hits f6 and d6.'],
    ["…dxe5 — they take, and their pawn on e5 hits d4 and f4. Now you have three ways to take back. It's about level.", '…dxe5 — hits d4 and f4.'],
    ["Which one takes? dxe5 lets their queen take on d1 with check, and the queens come off. Nxe5 drops d4 to their bishop on b6. So fxe5, the engine's first choice: the pawn hits the knight on f6 again. It's about level.", 'fxe5 — keeps d4, hits f6 again.'],
    ['…Nd5 — the knight jumps to the center and hits your knight on c3. But it\'s a mistake: …Re8 or …Nc6 was the move, and now you are a little better. Look at what guards the knight on d5: only their queen.', '…Nd5 — hits c3, but a mistake.'],
    ["So hit that queen. Bg5, the engine's first choice, develops with a hit on the queen on d8, the knight's only guard. You are clearly better.", "Bg5 — hits the queen, the knight's guard."],
    ["…Nxc3 — the knight takes yours and hits your queen on d1. The engine prefers …Qd7, getting the queen out of the bishop's reach while it still guards d5. You are clearly better.", '…Nxc3 — hits your queen; …Qd7 was better.'],
    ["bxc3 takes back, and their queen on d8 is still hit by your bishop. You are clearly better.", 'bxc3 — and the queen is still hit.'],
    ['…Qd5 — the queen escapes into the center, hitting a2, d4, e5 and your knight on f3, but every one of them is guarded. The engine prefers …Qe8. You are clearly better. Your plan: Bd3 and Qc2, lining up on h7 next to their king, and then castle.', '…Qd5 — central, but everything is guarded.'],
  ],
  'Kieseritzky Gambit': [
    ['h4, about half the masters: hit the chain right away, before …Bg7 and …h6 can prop it up. The pawn attacks g5, the one holding f4. The engine prefers d4. They are a little better.', "h4 — hits g5 before it's propped."],
    ['…g4, almost every master: the pawn steps past h4 and hits your knight on f3. Retreat? Nineteen masters in twenty jump forward to e5 instead, the Kieseritzky; jumping to g5 is the Allgaier. They are a little better.', '…g4 — hits f3; the knight jumps.'],
    ["Ne5, the engine's choice. Look at the knight: right in the center, hitting d7, f7 and the pawn on g4, which nothing guards. They are a little better.", 'Ne5 — center, hits f7 and g4.'],
    ['…Nf6, just over half the masters: the knight develops, guards g4 and hits your e4 pawn. About one master in three plays …d6 instead, kicking your knight at once. They are a little better.', '…Nf6 — guards g4, hits e4.'],
    ['d4 — the pawn guards your knight on e5 and opens the bishop on c1, which now hits f4. About a third of the masters play it; Bc4 is the most common. They are a little better.', 'd4 — guards e5, c1 hits f4.'],
    ['…d6, almost every master: the pawn hits your knight on e5, so now it has to move. They are a little better.', '…d6 — kicks the knight.'],
    ['Nd3, almost every master: the knight steps back and hits f4. Now your knight and your bishop on c1 both hit that pawn, and nothing guards it. Your e4 pawn is loose too, though. They are a little better.', 'Nd3 — hits f4 with c1.'],
    ["…Nxe4, nine masters in ten: they grab your e-pawn, and now they're two pawns up. But the pawn on f4 still has no guard. They are a little better.", '…Nxe4 — two pawns up; f4 loose.'],
    ["Bxf4: one pawn back, and the bishop hits d6. They are a little better.", 'Bxf4 — a pawn back, hits d6.'],
    ["…Bg7 — the bishop takes the long diagonal and hits d4. Look at that pawn: your queen can't reach it with the knight on d3 in the way, so nothing guards it. The engine prefers …Nc6. They are a little better.", '…Bg7 — hits d4, which is loose.'],
    ['Do you guard d4? Hit back instead: Nc3 develops and hits the knight on e4, which nothing guards either. c3, guarding d4, is about as good. They are a little better.', 'Nc3 — hits the loose knight on e4.'],
    ["…f5 gives the knight on e4 a pawn guard. Your d4 pawn is still loose. They are a little better.", '…f5 — guards the knight on e4.'],
    ['Nxe4 — trade off the knight that was sitting in your center. Your knight hits d6 for a moment, but the pawn on f5 takes it back. They are a little better.', 'Nxe4 — trades off the e4 knight.'],
    ['…fxe4: the pawn takes back and hits your knight on d3. Do you have to move it right now? They are a little better.', '…fxe4 — hits your knight on d3.'],
    ['Not yet. Bg5 hits their queen on d8 first, so if they take your knight with …exd3, Bxd8 takes the queen. They deal with the queen, and then your knight gets out to f2, where it hits e4 and g4. They are a little better. Your plan: Nf2 next, going after those two pawns, and keep an eye on d4, which their bishop on g7 still hits.', 'Bg5 — hits the queen first.'],
  ],
  'Allgaier Gambit': [
    ['Ng5 — the Allgaier, about one master in twenty. The knight hits f7 and h7, and here\'s the catch: after …h6 it has no safe square left. The g4 pawn covers f3 and h3, and their d- and f-pawns cover e6. So the plan is already set: when it\'s kicked, it takes on f7. The engine prefers Ne5, the Kieseritzky. They are clearly better.', 'Ng5 — the Allgaier, aims at f7.'],
    ['…h6 — the masters split evenly between this and …d5, and the engine prefers …h6: the pawn hits the knight, and the knight has nowhere to go. They are clearly better.', '…h6 — the knight is trapped.'],
    ['Nxf7, every master: the knight goes down fighting, and it forks their queen on d8 and their rook on h8. The king can take it. Retreating with Nf3 or Nh7 would just lose the knight, and the engine rates both more than two pawns worse. They are clearly better.', 'Nxf7 — forks the queen and rook.'],
    ['…Kxf7, every master: they take, and now you\'re a knight down for one pawn, with the gambit pawn on f4 still theirs. Their king has been pulled out to f7, and their pawn on g4 has no guard. They are clearly better.', '…Kxf7 — a knight down, king exposed.'],
    ['d4 — the pawn takes the center and opens your bishop on c1, which now hits f4, a pawn with no guard. About six masters in ten play Nc3 here, and the engine prefers Qxg4, taking the other loose pawn first. They are clearly better.', 'd4 — center; c1 now hits f4.'],
    ["…d5 — they hit back at e4 right away, and your e4 pawn has no guard. They are clearly better.", '…d5 — hits e4.'],
    ["Bxf4: one pawn back, and the bishop hits c7 and h6. They are clearly better.", 'Bxf4 — a pawn back, hits c7 and h6.'],
    ['…Nf6: the knight develops and hits e4, which now has two attackers, the knight and the pawn on d5. They are clearly better.', '…Nf6 — e4 hit twice.'],
    ["Nc3 — the knight guards e4 and hits d5. They are clearly better.", 'Nc3 — guards e4, hits d5.'],
    ["Where does their king go? …Kg7, the engine's choice: off the f-file to g7, where it guards h6, the pawn your bishop hits, and the knight on f6. They are clearly better.", '…Kg7 — king to g7, guards h6.'],
    ['Bd3 develops and gives e4 a second guard. The engine prefers Nxd5, taking a pawn. They are clearly better.', 'Bd3 — guards e4; Nxd5 was better.'],
    ["…dxe4: the pawn takes and hits your bishop on d3. They are clearly better.", '…dxe4 — hits your bishop on d3.'],
    ['The knight takes back on e4 and hits the knight on f6, with your bishop on d3 behind it. But look at d4: their queen hits it, and nothing guards it. They are clearly better. Your plan: castle and bring a rook to the f-file against their king on g7. Be5 is ready too: it would pin the knight on f6 to that king.', 'Nxe4 — hits f6; d4 is loose.'],
  ],
  "Bishop's Gambit (3.Bc4)": [
    ["Bc4 — the Bishop's Gambit, about a quarter of the masters, and the engine's first choice here. The bishop goes straight to its best square, aimed at f7, before the knight comes out. The cost: with no knight on f3, …Qh4+ is possible, and after Kf1 your king can't castle. They are a little better.", 'Bc4 — aims at f7, allows …Qh4+.'],
    ["…Nf6, about four masters in ten: the knight develops and hits your e4 pawn, which has no guard. The engine prefers …d5. It's about level.", '…Nf6 — hits e4.'],
    ["Nc3, almost every master: the knight guards e4 and covers d5, the square their pawn wants. It's about level.", 'Nc3 — guards e4, covers d5.'],
    ['…c6, about three masters in four: the pawn covers d5 too, so …d5 can come with a pawn behind it, and when it comes, it will hit your bishop on c4. They are a little better.', '…c6 — gets …d5 ready.'],
    ['Bb3 — the bishop steps back before …d5 can hit it, and from b3 it still aims at f7. Just over half the masters play it; the engine prefers d4 at once. They are a little better.', 'Bb3 — steps back, still aims at f7.'],
    ["…d5, almost every master: the pawn hits e4 and blocks your bishop's line to f7. They are a little better.", '…d5 — hits e4, blocks the bishop.'],
    ["exd5, almost every master: take it, and your pawn hits c6. Material is level for now. It's about level.", 'exd5 — takes, hits c6.'],
    ["…cxd5: they take back, and they're a pawn up again, the one on f4. The new pawn on d5 is hit by your bishop and knight and guarded by their queen and knight. They are a little better.", '…cxd5 — a pawn up again.'],
    ["Now the move that runs through almost every line of this course: d4. The pawn takes the center and opens your bishop on c1, which now hits f4, a pawn with no guard. They are a little better.", 'd4 — c1 now hits f4.'],
    ["…Bd6 — the bishop steps in to guard f4. They are a little better.", '…Bd6 — guards f4.'],
    ["Nge2 — the knight develops and hits f4 too: two of your pieces against one guard. It also guards d4, and it's the engine's first choice. They are a little better.", 'Nge2 — hits f4, guards d4.'],
    ["…O-O: their king castles, and their rook comes to f8. And here's the question for you: take on f4 now, or castle first? It's about level.", '…O-O — they castle first.'],
    ["Bxf4 takes the pawn back, but it's a move too early. The engine prefers castling first, and the reason is the e-file: once the bishops come off, …Re8+ arrives with your king still on e1. They are a little better.", 'Bxf4 — the pawn back, but O-O first.'],
    ["…Bxf4: the bishops come off, and their bishop on f4 hits h2. You take it back with the knight. They are a little better.", '…Bxf4 — trades the bishops.'],
    ['Nxf4: material is level, and look at d5: your knight on f4, your knight on c3 and your bishop on b3 all hit it, and only their queen and knight guard it. But they have a check first. They are a little better.', 'Nxf4 — level, and d5 is hit three times.'],
    ["…Re8+ — here's the check castling would have stopped. The rook comes down the open e-file at your king on e1. They are a little better.", '…Re8+ — the e-file check.'],
    ["Nfe2 blocks, and it's the engine's choice. But now that knight is pinned to your king on e1, and it no longer hits d5. They are a little better.", 'Nfe2 — blocks, but pinned.'],
    ['…Ng4 — the knight hits h2 and heads for e3, a square their rook covers too, where it would hit your queen on d1. They are a little better. Your plan: castle short right away, which breaks the pin on your knight on e2; even if …Ne3 then takes your rook on f1 for the knight, they are only a little better.', '…Ng4 — hits h2, eyes e3.'],
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

export const KINGS_GAMBIT_WATCH: WatchCourse = {
  openingId: 'kings-gambit',
  title: "The King's Gambit — A Master Class",
  orientation: 'white',
  sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
