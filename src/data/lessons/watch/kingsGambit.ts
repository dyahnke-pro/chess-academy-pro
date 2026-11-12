// The King's Gambit — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=kings-gambit`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move, the app's teaching computers, and (pass two) the second and third
// order: where each move's engine line goes, the squares a pawn move gives up
// for good, what club players get wrong. Said the way Naroditsky teaches in
// his speedruns (the Danya style sheet): the lead spread by moment, their
// moves judged and answered, one idea followed past the board in front of
// you, numbers only where they are the lesson.
// The student plays White. It is a gambit, so the evals are said honestly.
// One story runs through the course: f4 pulls their e-pawn out of the center;
// Nf3 shuts the h4 check that f4 opened; d4 points the c1 bishop at the pawn
// on f4, and every line is about winning that pawn back (remove its guard in
// the main line, hit the g5 chain with h4, or give pieces for time in the
// Muzio and the Allgaier). The other thread is the price of d3 or d4: e3 can
// never again be covered by a pawn, and in the Falkbeer and the Bishop's
// Gambit a piece of theirs heads straight for it.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd5', 'exd5', 'Nf6', 'Bc4', 'Nxd5', 'O-O', 'Be7', 'd4', 'O-O', 'Bxd5', 'Qxd5', 'Nc3', 'Qd8', 'Bxf4', 'Bf5', 'Qe2', 'Nc6', 'Kh1', 'Re8', 'Nb5', 'Rc8', 'Rae1', 'Nb4', 'Nxa7', 'Nxc2', 'Nxc8', 'Nxe1', 'Rxe1'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["The King's Gambit starts like a hundred other games: e4 takes a central square and opens lines for your queen and the bishop on f1. The difference is the pawn beside it on f2. In this opening, that pawn goes forward next.", 'e4 — the center; f2 goes next.'],
  ["…e5 is the move that makes the King's Gambit possible. Their pawn takes its share of the center, and it stands on e5 with no guard, right where your f-pawn can hit it.", '…e5 — the pawn f4 will hit.'],
  ["Here it is: f4, one of the oldest openings in chess, a pawn offered on the second move. Why? If they take, their e-pawn has left the center, so d4 comes with nothing to hit it, no pawn of yours stands on the f-file, and once you castle your rook looks straight up it. The price is real: the engine would rather develop with Nc3, and after f4 they are a little better. And with f2 empty, the diagonal from h4 to your king on e1 is open.", 'f4 — a pawn for the center and f-file.'],
  ["…exf4, the engine's choice: take the pawn and make you prove it was worth it. Look at what it cost them, though. The pawn that held the center has left e5, and the one on f4 is the target the rest of this course chases.", '…exf4 — accepted; e5 is empty now.'],
  ["First, shut the door you just opened. Nf3 covers h4, so …Qh4+ can't come. Skip it and the check is real: after Nc3 instead, …Qh4+ lands and your king walks to e2. From f3 the knight also backs up a d4 push later.", 'Nf3 — covers h4, no …Qh4+.'],
  ["Instead of clinging to the extra pawn, they hit back: …d5 strikes your e4 pawn, which nothing guards. It's the most direct way to open the center, but the engine prefers …g5, holding f4 with a pawn, which has its own tab.", '…d5 — strikes back at e4.'],
  ["Take it: exd5, and material is level again. Look at the e-file now: with both e-pawns gone, it is open from end to end, a road your queen and rooks use later in this line. The pawn on d5 has no guard, though, and it is their next target.", 'exd5 — level, and the e-file opens.'],
  ["Most club players take back with the queen here, and it's a mistake: after …Qxd5 and d4, their queen spends the next moves on …Qe6+ and …Qh6 while you develop, with Bb5+ coming. …Nf6 is the right way: develop first and hit d5, which has no guard.", '…Nf6 — hits d5; not the queen recapture.'],
  ["How do you hold d5? There are three ways: c4 with a pawn, Bb5+ with a check, or Bc4, the developing move. Bc4 guards the pawn and clears f1, so your king is ready to castle. A move earlier, their pawn on d5 would simply have taken it.", 'Bc4 — guards d5, ready to castle.'],
  ["…Nxd5 wins the pawn back, so they're a pawn up again, still holding the one on f4. Now notice the knight's second job: from d5 it guards f4. That knight is what the next phase is about. If it ever leaves or is taken, f4 has no guard.", '…Nxd5 — and the knight guards f4.'],
  ["Castle before anything opens. Your king steps off the e-file, which is open now, and the rook lands on f1, on the file your f-pawn left. Once the knight on f3 steps aside, that rook looks straight at f4.", 'O-O — king off the open e-file.'],
  ["…Be7 develops and clears the way to castle. Why not the more active c5 square? Your d-pawn would kick the bishop from there with d4. On e7 it also shuts the e-file in front of their king.", '…Be7 — castling next; c5 meets d4.'],
  ["d4, and now the knight on d5 has two jobs. It guards f4, which your bishop on c1 suddenly hits, and it is under fire from your bishop on c4. The price of d4: no pawn can cover e3 any more, and that knight is one jump from it.", 'd4 — the d5 knight has two jobs.'],
  ["Their king gets safe, and now it's your move with a target in front of you. The knight on d5 holds f4 all by itself. Remove it, and the pawn falls. That is the whole plan from here.", '…O-O — f4 hangs on one knight.'],
  ["Removing the defender: Bxd5, the engine's choice, takes the one piece guarding f4. You hand over the bishop pair to do it, and that's the right price here, because once they take back, f4 has no guard and your bishop on c1 collects it.", "Bxd5 — removes f4's only guard."],
  ["…Qxd5, and their queen lands in the center with a hit on your pawns on a2 and d4 and the knight on f3. Now the question for you: take on f4 at once, or hit the queen first and take after?", '…Qxd5 — central queen; f4 unguarded.'],
  ["Hitting the queen first looks like free time: Nc3 develops with a threat. But it's a slip, and the engine prefers Bxf4 at once. The queen doesn't have to go home. …Qf5 steps over and guards f4, and the pawn you've been chasing is safe again.", 'Nc3 — hits the queen; Bxf4 was better.'],
  ["…Qd8 is the slip you were hoping for: the queen goes all the way home and leaves f4 to its fate. The engine wanted …Qf5, the square that keeps a guard on the pawn. Now Bxf4 is free.", '…Qd8 — retreats, and f4 is free.'],
  ["Bxf4, and there's the payoff of the whole story: the gambit pawn comes home and material is level. Look at what f4 bought you. Every minor piece is out, the bishop on f4 hits c7, and the e-file is open for your queen and rooks.", 'Bxf4 — the gambit pawn is back.'],
  ["…Bf5: their last minor piece comes out, and it aims at c2. Right now your queen on d1 guards that pawn, so keep an eye on it the moment the queen leaves.", '…Bf5 — develops, eyes c2.'],
  ["Where does the queen belong? On the open file. Qe2 takes the e-file and hits the bishop on e7, it still guards c2, and with d1 empty your rooks see each other.", 'Qe2 — the e-file, hits e7, guards c2.'],
  ["…Nc6 develops with a threat: their knight and queen now both hit d4, held only by your knight. Count it out: …Nxd4, Nxd4, …Qxd4, and their queen lands on d4 with check on your king on g1, a pawn up.", '…Nc6 — threatens d4, with check.'],
  ["Kh1 is prophylaxis, a quiet move that kills their threat. Off g1, your king is off the queen's diagonal, so …Nxd4, Nxd4, …Qxd4 no longer comes with check, and Qxe7 grabs the bishop that nothing guards any more.", 'Kh1 — d4 now holds by a trick.'],
  ["…Re8 takes the e-file and backs up the bishop on e7 from behind. That ends the trick on e7: the rook, the queen and the knight all guard it now, so your queen on e2 won't win it.", '…Re8 — e7 is guarded for good.'],
  ["Nb5 is tempting: it hits c7, and a knight landing there would hit both rooks at once. It also adds a guard to d4. But it's a slip, and the engine prefers Qf2. After …Rc8 the fork is gone, and the knight on b5 can be chased with …a6.", 'Nb5 — eyes c7; Qf2 was better.'],
  ["…Rc8 is the clean answer: the rook leaves a8 before your knight can land on c7 and hit it, and it guards c7 a second time. The cost is on the other wing: a7 is now held only by the knight on c6.", '…Rc8 — rook off a8, c7 guarded.'],
  ["Rae1 lines up your queen and rook on the e-file against e7, but look what it leaves behind: the pawn on a2 has no guard. It's a slip, and the engine prefers Qf2. After Rae1, …a6 chases your knight off b5, and then …Nxd4 wins the pawn.", 'Rae1 — e-file battery; a2 left loose.'],
  ["…Nb4 goes after a2 and c2, but it's a slip: the engine wanted …a6, chasing your knight first. The knight just left c6, and that was the only guard of a7. Your knight on b5 is one jump from it.", '…Nb4 — hits a2, c2; a7 loose.'],
  ["Two pawns to take. Nxc7 looks greedier, but c7 is guarded twice now. Nxa7, the engine's choice, takes the pawn with no guard, and the knight hits the rook on c8 on the way.", 'Nxa7 — free pawn, hits c8.'],
  ["…Nxc2: the knight takes c2, guarded by the bishop on f5, and it hits your rook on e1 and the pawn on d4. Your rook is attacked, and your knight is attacking a rook. Who cashes in first?", '…Nxc2 — hits your rook on e1.'],
  ["You take first: Nxc8 grabs the rook. Follow the trades out: …Nxe1, Rxe1, …Bxc8, and everything comes off evenly, because your knight on c8 has no guard and their queen and bishop both hit it. What's left is the open e-file and your isolated d4 pawn.", 'Nxc8 — the trades all even out.'],
  ["…Nxe1 takes your rook right back. Now each side has a knight sitting on the other's back rank, theirs on e1 and yours on c8, and both are about to be taken.", '…Nxe1 — the rook back; knights hang.'],
  ["Rxe1 takes the knight and puts your rook back on the open e-file, behind your queen. Your knight on c8 falls to …Bxc8, and material is level. Your plan: Bg5, a third piece aimed at e7, so the pressure down the e-file forces trades, while your knight on f3 guards the isolated pawn on d4.", 'Rxe1 — the e-file, then Bg5.'],
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
    ["…g5 is the main answer: the pawn guards f4, so they keep the extra pawn. Its next step is …g4, kicking your knight off f3, the piece that covers h4.", '…g5 — the chain holds f4.'],
    ["You have to choose how to fight the chain. h4 attacks g5 at once. Bc4 develops instead and aims at f7, a pawn only their king guards, but it lets …g4 hit your knight, and the Muzio, on its own tab, is what happens if you leave it there.", 'Bc4 — aims at f7, allows …g4.'],
    ["…Bg7 takes the long diagonal, and from g7 it reaches all the way to your b2 pawn, pinning it to the rook on a1. What it doesn't do is help g5, and that's where your next move goes.", '…Bg7 — long diagonal, pins b2.'],
    ["Now strike the chain: h4 hits g5, the pawn that holds f4. Knock out the base, and the pawn on f4 has no guard. They'll prop it up with …h6, and then the h-file is the next question.", 'h4 — hits the chain at g5.'],
    ["…h6 is the right answer: now g5 has a pawn behind it. And if you take on g5, …hxg5 opens the h-file, and their rook on h8 trades off yours.", '…h6 — g5 is guarded.'],
    ["Take on g5 or build? hxg5 trades rooks down the h-file and helps them. d4 takes the center, opens your bishop on c1 toward f4, and blocks the long diagonal, so b2 is no longer pinned.", 'd4 — center, unpins b2.'],
    ["…d6 does two quiet jobs: it covers e5, so your knight can never settle there, and it opens the road for the bishop on c8. Look at their kingside now: f4, g5 and h6, with g5 guarding f4 and h6 guarding g5.", '…d6 — e5 covered; the chain set.'],
    ["Nc3 develops and guards e4, and it keeps a trick ready. If they grab your h-pawn with …gxh4, the chain is broken, and Bxf4 takes the gambit pawn back.", 'Nc3 — develops; …gxh4 drops f4.'],
    ["…Nc6 develops and hits d4: their knight and the bishop on g7 against your queen and the knight on f3. Two against two holds for now. But that knight is one of the guards, and …g4 can kick it.", '…Nc6 — two on d4; f3 is a guard.'],
    ["Ne2 reroutes the knight toward f4 and gives d4 a second guard, but it spends a move, and it's a slip. The engine prefers Qd3, guarding d4 and e4 with the queen, and after Ne2 they are clearly better.", 'Ne2 — reroutes; Qd3 was better.'],
    ["…Qf6 answers your knight: f4 gets a second guard, and the queen joins the knight on c6 against d4. Meanwhile …g4 is still waiting.", '…Qf6 — guards f4, hits d4.'],
    ["Qd3 guards d4 and e4 at once and clears d1. That's the first step of a plan: once the bishop on c1 moves too, your king can castle long, away from their kingside pawns.", 'Qd3 — guards d4 and e4.'],
    ["…Nge7 brings out their last knight and clears g8, so their king can castle short behind the pawn chain. Both kings are choosing where to live, and they're heading for opposite sides.", '…Nge7 — ready to castle short.'],
    ["Why d2? The bishop clears c1, so b1, c1 and d1 are all empty and your king can castle long. And it stays on the diagonal aimed at f4.", 'Bd2 — clears the way to castle long.'],
    ["…g4 finally kicks your knight off f3. But look at what it costs: g5 was the pawn guarding f4, and now f4 has only their queen behind it. Where your knight goes next decides how you get that pawn.", '…g4 — kicks the knight; f4 loosens.'],
    ["Where does the knight go? Not h2: …Qxh4+ takes a pawn with check. Not Nxf4 with the other knight: …gxf3 takes the one on f3, and you get two pawns for a piece. So back to g1, the engine's choice. Your plan: castle long, then the knight on e2 takes on f4. In the engine's line they take d4 and you take f4, pawn for pawn.", 'Nfg1 — the only safe retreat.'],
  ],
  'Fischer Defense': [
    ["…d6 is the Fischer Defence, a quiet move with a sharp point: it takes e5 away from your knight before they hold f4 with …g5. In the Kieseritzky, e5 is your knight's best square. Here it is covered in advance.", '…d6 — the Fischer; e5 covered first.'],
    ["d4: it takes the center and opens your bishop on c1, so f4 is attacked and nothing guards it. They have to decide right now how to hold that pawn.", 'd4 — the c1 bishop hits f4.'],
    ["…g5 holds f4 with a pawn. The most common club move here is …Bg4, pinning your knight, and it's a mistake: Nc3, …Nc6, and Bxf4 simply takes the gambit pawn back.", '…g5 — holds f4; …Bg4 drops it.'],
    ["The club move here is Bc4, and it's a mistake: …g4 kicks your knight, and you end up giving it away to …gxf3. h4 goes after the chain first: it hits g5, the pawn holding f4. And if they grab it with …gxh4, Bxf4 takes f4 back.", 'h4 — hit the chain, not Bc4.'],
    ["…g4 steps past your h-pawn and kicks the knight. The cost: g5 was what held f4, and now that pawn stands alone in front of your bishop on c1. Don't grab it yet, though: Bxf4 lets …gxf3 take your knight.", '…g4 — kicks the knight; f4 alone.'],
    ["Where does the knight go? Ng5 is the club favourite, and it leads to a piece sacrifice on f7, the Allgaier idea. The engine's choice is humbler: back to g1, so it can come out again to e2 and hit f4 from there.", 'Ng1 — back home, heading for e2.'],
    ["…Bh6 takes over the pawn's old job: from h6 the bishop guards f4, so your bishop on c1 still can't take it. The two dark-squared bishops now share one diagonal, with f4 in between.", '…Bh6 — the bishop guards f4.'],
    ["Nc3 develops and guards e4, which frees your other knight for the long road: g1 to e2, and from there it hits f4.", 'Nc3 — guards e4; Nge2 next.'],
    ["…Nc6 hits d4, and with your knight back on g1, only your queen guards it. That's the price of the retreat: until the knight reaches e2, d4 is thin.", '…Nc6 — hits d4, guarded once.'],
    ["Moving a piece twice in the opening is usually a waste of time, but this is the point of the retreat. From e2 the knight hits f4 and guards d4. Now f4 is hit twice, by the knight and the bishop on c1, and held once, by the bishop on h6.", 'Nge2 — f4 hit twice, held once.'],
    ["So how do they save f4? They don't. …f3 pushes the pawn on with a hit on your knight on e2 and your g2 pawn. And Bxh6 fails now: …fxe2 hits your queen on d1 and your bishop on f1 at once.", '…f3 — kicks the knight; Bxh6 fails.'],
    ["Ng3 gets the knight out of the pawn's way and guards e4, but it's a slip: the engine prefers Nf4, on the square the pawn just left.", 'Ng3 — out of the way; Nf4 was better.'],
    ["…Qf6 hits d4 and h4. Count d4: their knight and queen against your queen alone, so something has to give. Your rook on h1 holds h4.", '…Qf6 — two on d4, one guard.'],
    ["Bxh6, and the recapture is the point: when their queen takes back on h6, it leaves f6, and d4 is hit only once again.", 'Bxh6 — the queen must leave f6.'],
    ["…Qxh6 hits h4, which your rook on h1 guards, and from h6 the queen also eyes e3. That's the square to watch: if you take on f3 with your g-pawn, …Qe3+ comes with check and a second hit on d4.", '…Qxh6 — eyes e3 for a check.'],
    ["Qd3 covers e3, so the queen check is gone, and with your g2 pawn it hits the pawn on f3 twice. Your plan: Rd1 and gxf3, winning back the pawn on f3 while your queen and rook hold d4.", 'Qd3 — covers e3, hits f3.'],
  ],
  'Muzio Gambit': [
    ["…g4 kicks your knight, and this is the moment that sets up one of the wildest gambits in chess. Normally the knight just moves. In the Muzio, you leave it where it is.", '…g4 — the knight is attacked.'],
    ["Retreat or castle? Ng1 lets …Qh4+ in, and your king walks to f1. So you castle and leave the knight: that's the Muzio Gambit, a whole piece for time, and nine masters in ten choose it here. If they take, your queen recaptures on f3, already on the f-file with your rook behind it.", 'O-O — the Muzio: a knight for time.'],
    ["They take, and they should: …gxf3, the engine's choice, leaves them a piece and a pawn up. Notice what they gave to do it: their g-pawn is gone, so the g-file in front of their king has no pawn on it.", '…gxf3 — a piece up, the g-pawn gone.'],
    ["Qxf3 takes back and hits f4, which nothing guards. Count what points at their king: your queen and rook on the f-file, with only the f4 pawn in the way, and your bishop on c4 aimed at f7.", 'Qxf3 — hits f4; the f-file battery.'],
    ["…Qf6 does two jobs: it guards f4 and f7, the two pawns your pieces are aimed at. From f6 the queen also hits b2 down the long diagonal.", '…Qf6 — guards f4 and f7.'],
    ["e5 throws in a second pawn: if the queen takes it, it leaves f6, and f7 is guarded only by their king. It's the sharp try, but the engine prefers the quiet d3, and after e5 they are clearly better.", 'e5 — deflect the queen from f7.'],
    ["…Qxe5: a second pawn, and the queen still hits b2. But it has left f6, and f7 has only their king to guard it now.", '…Qxe5 — two pawns, but f7 thins.'],
    ["Bxf7+, the engine's choice, gives the bishop to drag their king onto f7, right on the file where your queen and rook stand. If the king runs to d8 instead, d4 hits the queen.", 'Bxf7+ — drag the king to the f-file.'],
    ["…Kxf7, and now the f4 pawn is pinned: it can't move, because your queen on f3 stands behind it on the king's file. You're down a lot of material. What you have is time and a king with no pawns around it.", '…Kxf7 — f4 is pinned now.'],
    ["d4: the pawn hits the queen and opens your bishop on c1 onto f4, the pinned pawn. If they grab it with …Qxd4+, Be3 blocks and hits the queen again.", 'd4 — hits the queen, opens c1.'],
    ["…Qf5: the queen steps in front of its king, guards f4 and hits your c2 pawn, which nothing guards. With the queen on f5, the pin on f4 is broken too.", '…Qf5 — guards f4, hits c2.'],
    ["g4 hits the queen, and it's the natural move, but it's a real mistake. The engine wanted Bxf4, taking the pawn back. After g4 the queen just steps aside, and your own king has lost a pawn in front of it: they are winning.", 'g4 — a mistake; Bxf4 was right.'],
    ["…Qg6 steps aside and pins your g4 pawn to your king, while still hitting c2. They are winning. Your plan: Bxf4 wins back a pawn, then Nc3 brings your last pieces out, against a king on f7 with no pawns left in front of it.", '…Qg6 — pins g4; Bxf4 next.'],
  ],
  'Falkbeer Counter-Gambit': [
    ["…d5 is the Falkbeer Counter-Gambit: they ignore your pawn and hit back in the center at once. Now three pawns touch in the middle of the board, e4, e5 and f4, and nothing guards any of them.", '…d5 — the Falkbeer, a counter-strike.'],
    ["Take it: exd5, and you're a pawn up for now. The tension that's left is on the other side: their e5 pawn and your f4 pawn still hit each other, and neither has a guard. If they take back with the queen, Nc3 hits it.", 'exd5 — a pawn up; the tension stays.'],
    ["…e4 is the Falkbeer's wedge: the pawn steps out of the tension and plants itself on e4, where it takes f3 away from your knight. It's a slip, though: the engine prefers …exf4, and after …e4 you are a little better.", '…e4 — the wedge; …exf4 was better.'],
    ["Hit the wedge before they can support it: d3 attacks e4, which nothing guards. One cost to file away: with your d-pawn gone from d2, no pawn can cover e3 again, and their bishop can reach it through c5. Watch that bishop.", 'd3 — hits the wedge; e3 weakens.'],
    ["…Nf6 guards e4 and hits your extra pawn on d5, which has no guard. You can't hold everything: if you push d4 instead of dealing with the wedge, …Qxd5 takes the pawn back.", '…Nf6 — guards e4, hits d5.'],
    ["dxe4 takes the wedge off the board, and for a moment you're two pawns up. One comes straight back when the knight takes on e4, and the extra pawn on d5 is what they'll be working on next.", 'dxe4 — the wedge is gone.'],
    ["…Nxe4 takes back, and look what's in the air: f2 and g3 are empty, so …Qh4+ is coming, and the knight on e4 covers g3, the square you'd block on with a pawn.", '…Nxe4 — and …Qh4+ is in the air.'],
    ["Nf3 shuts the h4 diagonal, the same idea as in the accepted lines. The timing matters too: a move earlier, their pawn on e4 would simply have taken the knight on f3.", 'Nf3 — shuts the h4 check.'],
    ["…Bc5 develops with a threat: …Nf2 would hit your queen on d1 and your rook on h1 at once, and the bishop guards f2. So the knight on e4 has to be dealt with right now.", '…Bc5 — …Nf2 would hit queen and rook.'],
    ["Qe2 answers the threat with a pin: the knight on e4 is pinned to their king on e8, attacked and unguarded, so …Nf2 is off. And if they castle to break the pin, Qxe4 simply takes it.", 'Qe2 — pins the knight; …Nf2 is off.'],
    ["…Bf5 guards the pinned knight. The club favourite here is castling, and it's a mistake: the pin goes, but the knight on e4 still has no guard, and Qxe4 takes it.", '…Bf5 — guards e4; castling drops it.'],
    ["Nc3 piles on: two pieces hit the pinned knight, one guards it. And if they try …Bf2+ first, Kd1 steps aside, and the knight on e4 still falls.", 'Nc3 — two on the pinned knight.'],
    ["…Qe7 steps between the knight and its king, so the pin is gone, and it gives e4 a second guard. Now the two queens face each other on the e-file with the knight in between.", '…Qe7 — breaks the pin, guards e4.'],
    ["Remember e3, the square no pawn of yours can cover? Your bishop gets there first. Be3 offers a trade of the bishop on c5, the piece aimed at f2 and g1.", 'Be3 — challenges the c5 bishop.'],
    ["…Bxe3 takes the trade, and their bishop on e3 hits your f4 pawn on the way. It has no guard, though: your queen takes it.", '…Bxe3 — the bishops come off.'],
    ["Qxe3 is the only good recapture: taking on e4 first loses material. Now your queen stands on the e-file, hitting a7 and the knight on e4.", 'Qxe3 — the only good recapture.'],
    ["…Nxc3 takes your knight and hits a2 and d5. Now look at the e-file: the queens face each other with nothing between them, each pinned to its own king. Whoever takes first does it with check.", '…Nxc3 — queens face off, both pinned.'],
    ["So take first, with check: Qxe7+. After the king takes back, bxc3 wins the knight back, and the queens are off. Your a-pawn ends up isolated, but their king is stuck on e7 and can never castle.", 'Qxe7+ — trade queens, then bxc3.'],
    ["…Kxe7: their king takes back and has lost the right to castle. Your plan: bxc3 wins back the knight, and if their bishop grabs c2, Kd2 and Re1+ bring your king and rook into the ending with tempo, while their king stands in the open on e7.", '…Kxe7 — then bxc3 and Re1+.'],
  ],
  "King's Gambit Declined": [
    ["…Bc5 declines the gambit: the bishop develops and aims down the diagonal at g1, so castling short is off for now. The engine prefers taking the pawn, …exf4, but this is a real way to say no.", '…Bc5 — declined; the bishop eyes g1.'],
    ["Nf3 develops with a threat: now the knight and the f4 pawn both hit e5, which nothing guards. If they grab your pawn with …exf4, d4 hits the bishop on c5 and takes the center.", 'Nf3 — two hits on e5.'],
    ["…d6: the pawn guards e5 and opens the road for the bishop on c8. Their setup is simple: hold e5, and keep the bishop on the g1 diagonal.", '…d6 — guards e5.'],
    ["c3 prepares d4: that push kicks the bishop off the c5 diagonal and takes the center, and with c3 behind it, d4 is supported. It also takes b4 away from that bishop.", 'c3 — prepares d4 against the bishop.'],
    ["…Nf6 develops and hits e4. Neither of your e4 and f4 pawns has a guard right now, so they're asking whether d4 really works.", '…Nf6 — hits e4.'],
    ["d4 hits the bishop on c5 and puts a third piece on e5. Yes, e4 is still loose, but a bishop under attack comes first. The cost to remember: with d2 empty and f2 gone, no pawn can cover e3 again, and their knight can reach it through g4.", 'd4 — hits the bishop; e3 weakens.'],
    ["…exd4: they take, and the pawn on d4 hits c3, so you take back with that pawn. Their bishop on c5 gets hit again.", '…exd4 — and cxd4 comes.'],
    ["cxd4 takes back and hits the bishop again, and now you have what the gambit is for: two pawns side by side on d4 and e4, with the f-pawn beside them.", 'cxd4 — two center pawns, bishop hit.'],
    ["…Bb6 keeps the bishop on the long diagonal, pointing at d4. Most club players check with …Bb4+ instead, and it's a mistake: Bd2 meets it, the bishops come off, and your center stays whole while your knight develops on d2.", '…Bb6 — keeps the diagonal; not …Bb4+.'],
    ["Nc3 develops and guards e4, which has been loose since …Nf6. Now your three central pawns on d4, e4 and f4 are all guarded, and the front one is ready to move.", 'Nc3 — guards e4; the center is set.'],
    ["…O-O tucks their king away. But look at what's in front of it: your pawns on d4, e4 and f4, three in a row, and e5 is coming with the knight on f6 as its first target.", '…O-O — and e5 is coming.'],
    ["e5 is the break. It hits the knight on f6 and the pawn on d6, with d4 and f4 behind it. The price: no pawn of yours can cover d5 again, and their knight is one jump from it. Keep that square in mind.", 'e5 — the break; d5 is theirs.'],
    ["…dxe5 takes, and the new pawn hits both d4 and f4. Now you have three ways to take back, and only one is right.", '…dxe5 — three ways to recapture.'],
    ["Which one takes? dxe5 lets their queen take on d1 with check, and the queens come off. Nxe5 leaves d4 to their bishop on b6. So fxe5: the pawn hits the knight on f6 again.", 'fxe5 — hits the knight again.'],
    ["…Nd5 takes the square your e5 push gave up, and it hits your knight on c3. But it's a mistake: the engine wanted …Nc6, and now you are a little better. Look at the knight's guards: only their queen on d8.", '…Nd5 — a mistake; only the queen guards.'],
    ["So hit the guard: Bg5 develops with a hit on the queen on d8, the only piece holding the knight on d5. If they kick the bishop with …f6, Bc4 piles a second attacker on that knight.", 'Bg5 — the queen guarding d5 is hit.'],
    ["…Nxc3 cashes the knight in before it can be lost: it takes yours and hits your queen on d1. Their queen is still hit by your bishop, though.", '…Nxc3 — trades off, hits your queen.'],
    ["bxc3 takes back toward the center, so the pawn on c3 backs up d4. It leaves your a-pawn isolated, but the bishop on g5 still hits their queen, and that's the move that matters.", 'bxc3 — c3 backs up d4.'],
    ["…Qd5 escapes into the center, hitting a2, d4, e5 and your knight on f3, but every one of them is guarded. It's not the best square: the engine prefers …Qe8. You are clearly better. Your plan: Bd3 and Qc2, lining up on h7 next to their king, and then castle.", '…Qd5 — central, but nothing loose.'],
  ],
  'Kieseritzky Gambit': [
    ["h4 hits the chain at once, before …Bg7 and …h6 can prop it up: the pawn attacks g5, the one holding f4. Knock out the base, and the pawn on f4 has no guard.", 'h4 — strike the chain now.'],
    ["…g4 steps past your h-pawn and hits the knight on f3. Retreating loses time, so the knight goes forward: Ne5 is the Kieseritzky, and nineteen masters in twenty play it. Ng5, a piece sacrifice on f7, is the Allgaier on its own tab.", '…g4 — the knight must go forward.'],
    ["Ne5: the knight sits in the center and hits d7, f7 and the pawn on g4, which nothing guards. It also has a road back: from e5 it can drop to d3, and from there it hits f4.", 'Ne5 — central, hits g4.'],
    ["…Nf6 guards g4 and hits your e4 pawn. The common club move is …d6, kicking your knight at once, and it's a mistake: Nxg4 just takes the pawn that …Nf6 would have guarded.", '…Nf6 — guards g4; …d6 drops it.'],
    ["d4 guards your knight on e5 and opens the bishop on c1, which now hits f4. Your e4 pawn is loose, but if they grab it with …Nxe4, Bxf4 takes the gambit pawn back.", 'd4 — guards e5, opens c1.'],
    ["…d6 kicks your knight, and it stops your grab: Bxf4 now runs into …dxe5, and you've lost the knight for two pawns. So the knight moves first.", '…d6 — kicks the knight first.'],
    ["Nd3 steps back to the square it was heading for: the knight and the bishop on c1 both hit f4, and nothing guards it. Your e4 pawn is loose too, so a trade of pawns is coming.", 'Nd3 — two hits on f4.'],
    ["…Nxe4 grabs your e-pawn: two pawns up, for now. But the pawn on f4 still has no guard, and it's about to come back.", '…Nxe4 — two pawns up, for now.'],
    ["Bxf4: the gambit pawn comes back, and the bishop hits d6. They're still a pawn up, the one from e4, and their knight sits in your center.", 'Bxf4 — one pawn back.'],
    ["…Bg7 takes the long diagonal and hits d4. Look at that pawn: your queen can't reach it with the knight on d3 in the way, so nothing guards it.", '…Bg7 — hits d4, unguarded.'],
    ["Do you guard d4? Hit back instead: Nc3 develops and hits the knight on e4, which nothing guards either. If they castle and ignore it, Nxe4 wins the knight. Guarding d4 with the c-pawn instead is about as good.", 'Nc3 — counterattack the e4 knight.'],
    ["…f5 gives the knight on e4 a pawn guard. Now it's an outpost: no pawn of yours can ever challenge e4. And your d4 pawn is still hanging to the bishop on g7.", '…f5 — the e4 knight is an outpost.'],
    ["So trade off the outpost knight: Nxe4. After …fxe4 they get a passed pawn on e4 that hits your knight on d3, and your answer to that is already prepared: Bg5.", 'Nxe4 — trade off the outpost.'],
    ["…fxe4 takes back with a passed pawn, and it hits your knight on d3. Do you have to move the knight right now?", '…fxe4 — a passed pawn hits d3.'],
    ["Not yet. Bg5 hits their queen on d8 first: if they take your knight with …exd3, Bxd8 takes the queen. Once the queen moves, Nf2 gets the knight out with a hit on e4 and g4. Your plan: Nf2, go after those two pawns, and keep an eye on d4, which their bishop on g7 still hits.", 'Bg5 — the queen first, then Nf2.'],
  ],
  'Allgaier Gambit': [
    ["Ng5 is the Allgaier, and you play it knowing what's coming. The knight hits f7 and h7, but after …h6 it has no safe square: g4 covers f3 and h3, and their d- and f-pawns cover e6. So the plan is set: when it's kicked, it takes on f7.", 'Ng5 — the Allgaier; f7 is the target.'],
    ["…h6 springs the trap: the knight is attacked and has nowhere to go. Your whole game now is to sell that piece as dearly as you can.", '…h6 — the knight is trapped.'],
    ["Nxf7: the knight goes down fighting, and it forks their queen on d8 and their rook on h8, so the king has to take it. Retreating is no better: Nh7 just loses the knight to …Rxh7.", 'Nxf7 — the sacrifice, forking d8 and h8.'],
    ["…Kxf7: they take, and you're a knight down for a pawn, with their king pulled out to f7. Saving the rook with …Qf6 instead looks natural, but Nxh8 grabs it.", '…Kxf7 — a knight down, king exposed.'],
    ["There are two loose pawns, on f4 and g4. d4 goes after the first: it opens your bishop on c1 onto f4 and takes the center, so your pieces come out before you collect anything. Grabbing g4 with the queen is the club move, and it's fine too.", 'd4 — opens c1 onto f4.'],
    ["…d5 strikes your e4 pawn, which nothing guards. If you take on d5, …Bd6 guards f4, and the pawn you wanted gets a defender.", '…d5 — strikes e4.'],
    ["Bxf4: one pawn back, and the bishop now hits c7 and h6. Your e4 pawn is still loose, so it needs a guard next.", 'Bxf4 — one back, hits c7 and h6.'],
    ["…Nf6 develops with a second hit on e4: the knight and the pawn on d5 against nothing.", '…Nf6 — two hits on e4.'],
    ["Nc3 guards e4 and hits d5. And if they take on e4 with the pawn, Bc4+ comes with check, aimed straight at their king on f7.", 'Nc3 — guards e4; Bc4+ waits.'],
    ["Where does their king go? …Kg7 steps off the f-file and away from the center, where lines open first. From g7 it also guards h6, which your bishop hits.", '…Kg7 — king off the f-file.'],
    ["Bd3 develops and gives e4 a second guard, and it clears f1, so your king can castle next and put a rook on the f-file.", 'Bd3 — guards e4, castling next.'],
    ["…dxe4: the pawn takes and hits your bishop on d3. Take back with the knight, so it lands on e4 with a hit on f6.", '…dxe4 — hits the bishop on d3.'],
    ["Nxe4 takes back and hits the knight on f6, with your bishop on d3 behind it. Your plan, from the engine's line: if they trade on e4, play Be5+ first, and when …Nf6 blocks, that knight is pinned to their king. Then castle and bring a rook to f4 to pile on it.", 'Nxe4 — then Be5+ and Rf4.'],
  ],
  "Bishop's Gambit (3.Bc4)": [
    ["Bc4 is the Bishop's Gambit: the bishop goes straight to the diagonal aimed at f7 before the knight comes out. The cost is the check you allow: with no knight on f3, …Qh4+ can come, and after Kf1 your king has lost the right to castle.", "Bc4 — the Bishop's Gambit; …Qh4+ allowed."],
    ["…Nf6 develops with a hit on your e4 pawn, which nothing guards. The check on h4 can wait: first they make you spend a move on the center.", '…Nf6 — hits e4.'],
    ["Nc3 guards e4, and it covers d5 too, the square their pawn wants for its counter-strike. That's the fight of this line: whether …d5 comes with enough support.", 'Nc3 — guards e4, covers d5.'],
    ["…c6 gets that support: now …d5 can come with a pawn behind it, and when it does, it will hit your bishop on c4. So your bishop has a decision to make first.", '…c6 — prepares …d5.'],
    ["Bb3 steps out of the way before …d5 arrives, and from b3 it still aims at f7 through d5, so when the center opens, the diagonal is still yours. On d3 it would block your own d-pawn.", "Bb3 — out of …d5's way, on f7."],
    ["…d5: the pawn hits e4 and blocks your bishop's line to f7. Take it, or let it take?", '…d5 — hits e4, blocks the diagonal.'],
    ["Take it: exd5, and the e-file opens, with no e-pawn left on either side. When they take back, their new pawn on d5 has no pawn beside it on the c- or e-file.", 'exd5 — the e-file opens.'],
    ["…cxd5: they take back and they're a pawn up again, the one on f4. But look at the pawn on d5: no pawn beside it on either file. That's an isolated pawn, and your bishop and knight are already hitting it.", '…cxd5 — an isolated pawn on d5.'],
    ["d4 takes the center, opens your bishop on c1 onto f4, and fixes their isolated pawn on d5, so it can never come forward. The price is a square: no pawn can cover e3 any more, and their knight can reach it through g4. Remember that.", 'd4 — fixes d5; e3 weakens.'],
    ["…Bd6 guards f4 and clears the way to castle. Two of your pieces will soon be on that pawn; now it has a defender too.", '…Bd6 — guards f4.'],
    ["Nge2: the knight hits f4, so two of your pieces are on it against one guard, and it backs up d4 too. Taking on f4 is now a real threat.", 'Nge2 — two on f4.'],
    ["…O-O, though the engine prefers …Qe7. Castling has a point: their rook can come to e8, and once the bishops come off on f4, your king on e1 stands on the open file. So: take on f4 now, or castle first?", '…O-O — and …Re8 is in reserve.'],
    ["You take now: Bxf4. Watch what follows: …Bxf4 and Nxf4, the bishops are off, and the e-file is open with your king still on e1. That's where their rook checks next.", 'Bxf4 — the pawn back, the e-file open.'],
    ["…Bxf4: the bishops come off, and theirs hits h2 on the way. Your knight takes back.", '…Bxf4 — the bishops come off.'],
    ["Nxf4 takes back, and material is level. Look at d5 now: your knights on f4 and c3 and your bishop on b3 all hit it, and only their queen and knight guard it. But they have a check first.", 'Nxf4 — level; three hits on d5.'],
    ["…Re8+: the rook drops onto the open e-file with check, the check castling would have dodged. Now you have to block.", '…Re8+ — check down the e-file.'],
    ["Nfe2 blocks. But see what it costs: that knight is now pinned to your king on e1, and it no longer hits d5. The fix is castling, as soon as you can.", 'Nfe2 — blocks, but the knight is pinned.'],
    ["And here's the knight using the square d4 gave up: …Ng4 heads for e3, where no pawn can ever kick it, and from there it would hit your queen on d1. Your plan: castle at once to break the pin on e2. Even if …Ne3 then wins the exchange on f1, they are only a little better.", '…Ng4 — heading for e3; castle now.'],
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
