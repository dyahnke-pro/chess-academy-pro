// The Ruy Lopez — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=ruy-lopez`): masters'
// percentages, engine lines at depth 16, the board after each move. Standard:
// docs/OPENING-WATCH-BEATS.md; said in the think-out-loud register. The student
// plays White. One idea runs through the course: Bb5 leans on the knight on c6,
// the one guard of e5, and the bishop's long trip (b5, a4, b3, c2) is the spine
// of every closed line, with c3, h3 and d4 built around it and the queen's
// knight on its own trip (d2, f1, g3). Each tab is one of their answers: the
// knight home (Breyer), the knight at the bishop (Chigorin), the bishop first
// (Zaitsev), the e4 pawn taken (Open, Berlin), a pawn given (Marshall), and two
// of yours: a4 against the Marshall, and Bxc6 for structure (Exchange).
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Nb8', 'd4', 'Nbd7', 'Nbd2', 'Bb7', 'Bc2', 'Re8', 'Nf1', 'Bf8', 'Bg5', 'g6', 'Ng3', 'Bg7'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["The Ruy Lopez starts with e4, the move close to half the masters open with, and the engine's top pick. Look past the pawn to the piece it lets out: the bishop on f1. That bishop is the hero of this opening.", 'e4 — and the f1 bishop is free.'],
  ["…e5, about a quarter of the masters; the Sicilian, …c5, is the commoner reply. They mirror you and take their own share of the center. One detail matters right away: no piece of theirs protects e5.", '…e5 — mirrors you, e5 unprotected.'],
  ["Nf3, nine masters in ten, and the engine's choice too. Your knight comes out and lands on e5's doorstep: the pawn is attacked, and it's their move to deal with it.", 'Nf3 — develops, attacks e5.'],
  ["How do they hold e5? …Nc6, close to nine masters in ten: the knight comes out and protects the pawn in the same move. Notice it's e5's only guard. That single fact is what the Ruy Lopez goes after.", "…Nc6 — e5's one and only guard."],
  ["Here's the move the opening is named for. Why not go after e5 directly? It already has a guard, so go after the guard: Bb5 hits the knight on c6, the one piece holding e5. Nothing is threatened yet, since the knight has pawns behind it on b7 and d7. The point is pressure that never goes away: while your bishop leans on c6, e5 is never quite comfortable. About two masters in three play it, and it's the engine's first choice. The plan behind it is slow: castle, rook to e1, c3, and only then d4.", 'Bb5 — hits the knight that holds e5.'],
  ["…a6, seven masters in ten: the pawn puts the question to your bishop at once. On b5 it has no guard, so it has to decide: take the knight, or step back. One master in five plays …Nf6 here instead, the Berlin, on its own tab.", '…a6 — kicks the bishop off b5.'],
  ["Take on c6, or keep the bishop? Taking is the Exchange Variation, about one master in ten, on its own tab. Nine in ten step back: Ba4, the engine's first choice. The bishop stays on the same diagonal, still bearing down on the knight on c6. You keep the bishop, and you keep the pressure.", 'Ba4 — steps back, still on c6.'],
  ["…Nf6, close to nine masters in ten: the knight develops and hits back at your e4 pawn, which has no guard. Now it's their turn to ask you something.", '…Nf6 — hits your loose e4 pawn.'],
  ["Do you have to guard e4? Not yet. Nearly nine masters in ten castle here, and so does the engine. If they take the pawn, d4 strikes back in the center while your king is safe and theirs still sits on e8. That's the Open Ruy Lopez, on its own tab, and the pawn comes back a few moves later.", 'O-O — king safe, e4 can wait.'],
  ["…Be7, seven masters in ten: a quiet move. The bishop develops so their king can castle next. They leave your e4 pawn alone for now, and it still has no guard.", '…Be7 — quiet, castling next.'],
  ["Re1, about eight masters in ten and the engine's first choice: now e4 gets its guard. The rook stands behind it on the e-file, so …Nxe4 is no longer free. And when the center opens later, your rook is already on the right file.", 'Re1 — the rook guards e4.'],
  ["…b5, nearly every master's move: the pawn hits your bishop on a4, which has no guard. They gain space on the queenside, and they push your bishop off the knight on c6.", '…b5 — hits the bishop, gains space.'],
  ["Can you leave the bishop and grab e5 with Nxe5? No: …Nxe5 takes your knight back, and you've given a piece for a pawn. So the bishop retreats, Bb3, every master's move. Look at its new target: f7, the pawn next to their king. It has stopped leaning on c6, but it has found a longer diagonal.", 'Bb3 — the bishop now aims at f7.'],
  ["…d6, a little over half the masters: a pawn now backs up e5, and the road opens for the bishop on c8. The engine prefers to castle first, as four masters in ten do, and castling first keeps …d5 in reserve. That's the Marshall Attack, on its own tab.", '…d6 — backs up e5, frees c8.'],
  ["c3, nearly every master. It looks like nothing, but the whole structure stands on it. It gets d4 ready, so a pawn will stand behind it when it comes. And it frees c2 for your bishop, a square to drop back to if it's ever chased off b3.", 'c3 — d4 next, and c2 for the bishop.'],
  ["…O-O, nearly every master: their king is safe. But look at f7. With the king on g8, your bishop on b3 pins that pawn to it, and the pin will stay for a while.", '…O-O — and f7 is pinned now.'],
  ["Is it time for d4? One master in ten plays it right away, but then …Bg4 comes, and the bishop pins your knight on f3 to your queen. That knight is one of d4's guards. So first h3, close to nine masters in ten and the engine's choice: the pawn takes g4 away from that bishop. That's prophylaxis: take away their best square before you make your own break.", 'h3 — takes g4 from their bishop.'],
  ["…Nb8 — the Breyer, about three masters in ten. A developed knight goes all the way home. Why? On c6 it blocks their c-pawn, and it blocks the long diagonal a bishop on b7 would want. From b8 it heads for d7, where it backs up e5 and gets out of everyone's way. The other main answers, …Na5 and …Bb7, each have their own tab.", '…Nb8 — the Breyer: back home, d7 next.'],
  ["Now the break you've been building toward: d4, nearly every master's move and the engine's choice. The pawn hits e5, c3 stands behind it, and with h3 already played there's no …Bg4 to bother your knight.", 'd4 — the break, hits e5.'],
  ["…Nbd7, every master: the knight arrives where the Breyer sent it and gives e5 a second guard. And look at the long diagonal from b7 to e4: with the knight gone from c6, it's open.", '…Nbd7 — e5 guarded, the diagonal opens.'],
  ["Why does this knight go to d2 and not c3? Your own pawn is on c3. So it takes the long road, close to nine masters in ten and the engine's choice: d2 now, then f1, then g3, on its way to the kingside.", 'Nbd2 — the long road to g3.'],
  ["…Bb7, nearly every master: the bishop takes the diagonal the knight cleared and lines up on your e4 pawn. Count it: two attackers, the bishop and the knight on f6, and two guards, your knight on d2 and the rook on e1. It holds, but only just.", '…Bb7 — a second attacker on e4.'],
  ["Bc2, nearly every master: the bishop drops back to the square c3 freed and becomes a third guard for e4. The price: the pin on f7 is gone. The payoff: from c2 it points toward h7, waiting for the day your e4 pawn moves out of its way.", 'Bc2 — a third guard for e4.'],
  ["…Re8, nine masters in ten: the rook takes the e-file and clears f8, the square their bishop is about to use.", '…Re8 — clears f8 for the bishop.'],
  ["Nf1, the engine's choice, and here the line leaves the masters' games. The knight continues its trip toward g3, and leaving d2 does something else: your bishop on c1 can see the kingside again, all the way to g5.", 'Nf1 — on to g3, frees the c1 bishop.'],
  ["…Bf8 — the bishop takes the square the rook cleared. Now the rook on e8 looks straight down at e5 and becomes its third guard, and the bishop on f8 can come to g7 once the g-pawn moves.", '…Bf8 — the rook now backs e5.'],
  ["Bg5 — the bishop the knight just let out comes into play and pins the knight on f6 to their queen on d8. But it's a little early: the engine wanted Ng3 first, finishing the knight's trip, and that's the move the Breyer tab plays. After Bg5 it's about level.", 'Bg5 — pins f6, but Ng3 came first.'],
  ["…g6 opens g7 for their bishop, and it takes f5 away from your knight before it even reaches g3. But it does nothing about the pin. …h6, asking your bishop to decide right away, was the engine's move. Now you are a little better.", '…g6 — covers f5, but …h6 was better.'],
  ["Ng3 — the trip is over. The knight eyes f5 and h5, and it gives e4 a third guard again. Their g6 pawn covers f5 for now, but in the Ruy Lopez that square is where this knight wants to land.", 'Ng3 — eyes f5, guards e4.'],
  ["…Bg7: the bishop sits in front of their king and gives the pinned knight on f6 a third guard. The engine still preferred …h6, putting the question to your bishop on g5. You are a little better. Your plan: Qd2 and Bh6, offering to trade your bishop for theirs on g7, the piece that guards their king.", '…Bg7 — guards f6; Qd2, Bh6 next.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move no earlier line shares. */
type TabBeats = Array<[string, string]>;

/** Filed in this order: each tab's beats start where the lines before it end. */
const TAB_LINES: Record<string, string[]> = {
  'Closed Ruy Lopez (Breyer)': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Nb8', 'd4', 'Nbd7', 'Nbd2', 'Bb7', 'Bc2', 'Re8', 'Nf1', 'Bf8', 'Ng3', 'g6', 'a4', 'c5', 'd5', 'c4', 'Bg5'],
  'Closed Ruy Lopez (Chigorin)': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5', 'Bc2', 'c5', 'd4', 'Qc7', 'Nbd2', 'Nc6', 'd5', 'Nd8', 'Nf1'],
  'Closed Ruy Lopez (Zaitsev)': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Bb7', 'd4', 'Re8', 'Nbd2', 'Bf8', 'a4', 'h6', 'Bc2', 'exd4', 'cxd4', 'Nb4', 'Bb1', 'c5', 'd5', 'Nd7', 'Ra3'],
  'Open Ruy Lopez': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Nxe4', 'd4', 'b5', 'Bb3', 'd5', 'dxe5', 'Be6', 'Nbd2', 'Nc5', 'c3', 'd4', 'Ng5', 'dxc3', 'Nxe6', 'fxe6', 'bxc3', 'Qd3', 'Bc2'],
  'Berlin Defense': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5', 'Qxd8+', 'Kxd8', 'h3', 'Ke8', 'Nc3', 'h5', 'Bf4', 'Be7', 'Rad1', 'Be6', 'Ng5', 'Bxg5', 'Bxg5'],
  'Marshall Attack': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'O-O', 'c3', 'd5', 'exd5', 'Nxd5', 'Nxe5', 'Nxe5', 'Rxe5', 'c6', 'd4', 'Bd6', 'Re1', 'Qh4', 'g3', 'Qh3', 'Be3', 'Bg4', 'Qd3', 'Rae8', 'Nd2', 'Re6', 'a4', 'f5'],
  'Anti-Marshall (8.a4)': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'O-O', 'a4', 'b4', 'd3', 'd6', 'Nbd2', 'Na5', 'Ba2', 'c5', 'c3', 'Rb8', 'Nf1', 'Bd7'],
  'Arkhangelsk Variation': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'b5', 'Bb3', 'Bb7', 'd3', 'Be7', 'Nc3', 'O-O', 'a3', 'd6', 'Ba2', 'Qd7', 'Re1', 'Rfe8'],
  'Exchange Variation': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O', 'f6', 'd4', 'exd4', 'Nxd4', 'c5', 'Nb3', 'Qxd1', 'Rxd1', 'Bg4', 'f3', 'Be6', 'Nc3', 'Bd6', 'Be3', 'b6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Closed Ruy Lopez (Breyer)': [
    ["Here's the engine's choice from the main line: finish the knight's trip before Bg5. Ng3 eyes f5 and h5, gives e4 a third guard, and your bishop on c1 can still come to g5 later.", 'Ng3 — the trip first, Bg5 can wait.'],
    ["…g6 takes f5 and h5 away from your knight, the squares it was just eyeing, and makes room for their bishop on g7.", '…g6 — covers f5 and h5.'],
    ["So open a second front. a4, the engine's first choice: the pawn hits b5, and if the pawns ever trade there, the a-file opens for your rook on a1. Your bishop on c2 backs the pawn up.", 'a4 — hits b5, the a-file next.'],
    ["…c5, the engine's choice: the pawn hits d4. And here's why the knight went back to b8 all those moves ago: standing on c6, it would have blocked this pawn.", "…c5 — hits d4, the Breyer's point."],
    ["d5, the engine's choice: you close the center. The pawn takes c6 and e6 away from their pieces, and it shuts the long diagonal: their bishop on b7 no longer sees e4.", 'd5 — closes the center, blocks b7.'],
    ["…c4, the engine's choice: the pawn takes d3 and b3 away from your pieces and locks the queenside. With the center shut, the fight moves to the wings.", '…c4 — space, covers b3 and d3.'],
    ["Bg5, the engine's choice: now that the center is closed, the bishop comes out and pins the knight on f6 to their queen. You are a little better. Your plan: Ra3 and Qd2, then the other rook to a1, so both rooks stand ready on the a-file the moment it opens.", 'Bg5 — pins f6; rooks to the a-file.'],
  ],
  'Closed Ruy Lopez (Chigorin)': [
    ["…Na5 — the Chigorin, and the masters' most common move here, about a third of their games. The knight jumps to the rim to hit your bishop on b3, the piece pinning f7. If the bishop stays, …Nxb3 trades it off. The engine prefers …Bb7, the Zaitsev, on its own tab.", '…Na5 — the Chigorin, hits your bishop.'],
    ["Here's what c3 was for. Bc2, every master's move: the bishop drops back out of the knight's reach and points toward h7. d4 at once would let …Nxb3 take the bishop, and most of your edge would go with it. The pin on f7 is gone, but your bishop is safe, and their knight is left on the rim.", 'Bc2 — the bishop escapes to c2.'],
    ["…c5, nearly every master: the pawn grabs queenside space and covers d4 and b4, so when d4 comes, a pawn is already hitting it.", '…c5 — space, and an eye on d4.'],
    ["d4 anyway, nearly every master and the engine's choice: the pawn hits c5 and e5 at once, and the center is under tension.", 'd4 — hits c5 and e5.'],
    ["…Qc7, about seven masters in ten: the queen guards c5, so both their pawns stand firm, and they keep the tension instead of taking on d4.", '…Qc7 — guards c5, keeps the tension.'],
    ["Nbd2, about eight masters in ten: the knight sets off on the same road as in the main line, d2 and then f1, and you keep the tension too. About one master in six closes the center with d5 right away.", "Nbd2 — the knight's road, tension kept."],
    ["…Nc6 brings the knight back from the rim and hits d4, so now three of their pawns and pieces bear down on it. But it's a mistake. …cxd4, two masters in three, was the move. Now you are clearly better, and your next move shows why.", '…Nc6 — hits d4, but a mistake.'],
    ["d5, more than eight masters in ten and the engine's choice: the pawn steps past the tension and hits the knight on c6, so it has to move again. Count its trip: c6 to a5, back to c6, and now away again. That's the cost of …Nc6.", 'd5 — hits the knight, closes the center.'],
    ["…Nd8, seven masters in ten: the knight retreats behind its pawns, and from there it can come back out through b7. For now it's a long way from the action. You are clearly better.", '…Nd8 — back behind the pawns.'],
    ["Nf1, about one master in five; three in four play a4 first. The knight heads off on its usual trip toward the kingside. You are clearly better. Your plan: a4 next, hitting b5 to open the a-file for your rook, while their knight is still finding its way back.", 'Nf1 — clearly better; a4 next.'],
  ],
  'Closed Ruy Lopez (Zaitsev)': [
    ["…Bb7 — the Zaitsev, about a quarter of the masters and the engine's first choice. No knight maneuver this time: the bishop goes straight to the long diagonal. Its own knight on c6 stands in front of it for now, but it's pointed at your e4 pawn.", '…Bb7 — the Zaitsev, aimed at e4.'],
    ["d4, nearly every master and the engine's choice: with no knight retreat to wait for, the break comes now. The pawn hits e5.", 'd4 — the break comes at once.'],
    ["…Re8, close to nine masters in ten and the engine's choice: the rook takes the e-file and clears f8 for the bishop. It's the Breyer's regrouping, only faster, and with the knight still on c6 guarding e5.", '…Re8 — the rook clears f8.'],
    ["Nbd2, close to nine masters in ten: the last minor piece comes out, and your e4 pawn gets a second guard.", 'Nbd2 — a second guard for e4.'],
    ["…Bf8, more than nine masters in ten: the bishop steps back, and now the rook on e8 sees all the way to e5, which has three guards: the knight on c6, the d6 pawn and the rook.", '…Bf8 — three guards on e5.'],
    ["a4, the masters' most common move here, about a third of their games, and the engine's first choice. Instead of the knight's trip, a second front: the pawn hits b5.", 'a4 — a second front, hits b5.'],
    ["…h6, the engine's choice. Why spend a move on it? While f7 is pinned, Ng5 jumping at it is a real idea: it was the engine's top choice when you played Nbd2. Now g5 is covered, so your knight can't go there.", '…h6 — keeps your knight off g5.'],
    ["Bc2: the bishop gives up the pin on f7 and drops back to guard e4 a third time. The engine rates Ba2, keeping the pin, just as highly.", 'Bc2 — off the pin, onto e4.'],
    ["…exd4: now they release the tension. The pawn takes on d4 and hits your c3 pawn, so you take back.", '…exd4 — they release the tension.'],
    ["cxd4, the engine's choice: take back with the c-pawn and keep two pawns side by side on d4 and e4. Taking with the knight instead gives most of your edge away.", 'cxd4 — two pawns side by side.'],
    ["…Nb4, the Zaitsev's jump and the engine's choice: the knight hits your bishop on c2. And look what it uncovered: the bishop on b7 now sees straight down to your e4 pawn. If your bishop stays, …Nxc2 trades it off.", "…Nb4 — hits c2, opens b7's diagonal."],
    ["Where does the bishop go? Bb1, the engine's choice: it stays on the diagonal and keeps guarding e4. It's tucked into the corner, but it survives. axb5 instead lets …Nxc2 take it, and that costs you about a pawn.", 'Bb1 — survives, still guards e4.'],
    ["…c5, the engine's choice: the pawn hits d4, and now d4 has only one guard, your knight on f3.", '…c5 — hits d4.'],
    ["d5, the engine's choice: push past and close the center. The pawn takes c6 and e6 away from their pieces, and the bishop on b7 is cut off from e4.", 'd5 — closes the center, cuts off b7.'],
    ["…Nd7, the engine's choice: the knight on f6 makes way. From d7 it can go to c5 or e5, and the f-pawn is free to come to f5 and hit e4.", '…Nd7 — heads for c5, frees …f5.'],
    ["Ra3 — the Zaitsev's rook lift, and the engine's choice. With the bishop on b1, your rook can't come out along the first rank, so it comes up the a-file instead, and from a3 it can slide along the third rank. You are a little better. Your plan: the other rook to e3, so both rooks stand on the third rank, and a close eye on …f5, their way to hit e4.", 'Ra3 — the rook lift, third rank next.'],
  ],
  'Open Ruy Lopez': [
    ["…Nxe4, the Open Ruy Lopez: about one master in ten, and the engine's first choice. They take the pawn you left. Their knight stands in the center and hits d2 and f2. So how do you get the pawn back?", '…Nxe4 — the Open Ruy, a pawn grabbed.'],
    ["Hit back in the center: d4, nearly every master and the engine's choice. The pawn hits e5, and that pawn has one guard, the knight on c6, the same knight your bishop on a4 is leaning on. Re1, going after the knight on e4 first, is about half a pawn worse.", 'd4 — strikes e5, the center opens.'],
    ["…b5, the engine's choice and nearly every master's: first, kick your bishop off the knight on c6. On a4 it has no guard.", '…b5 — kicks the bishop off c6.'],
    ["Bb3, every master: the bishop slides back to its long diagonal, and with their king still on e8, f7 is its target.", 'Bb3 — back to the diagonal, f7 in sight.'],
    ["…d5, nearly every master: the pawn props up the knight on e4, and it blocks your bishop's road to f7.", '…d5 — props up e4, blocks your bishop.'],
    ["dxe5, nearly every master: the pawn comes back, and material is level again. Your new pawn on e5 takes d6 and f6 away from their pieces.", 'dxe5 — the pawn back, material level.'],
    ["…Be6, every master: the bishop gives d5 a second guard, alongside the queen on d8. Your bishop on b3 and queen on d1 both hit that pawn.", '…Be6 — a second guard for d5.'],
    ["Nbd2, about half the masters: the knight challenges the one on e4 right away. The engine prefers c3 first, and after Nbd2 it's about level.", 'Nbd2 — challenges the knight on e4.'],
    ["…Nc5, three masters in four and the engine's choice: the knight steps off e4 before it can be traded, and it hits your bishop on b3.", '…Nc5 — hits your bishop on b3.'],
    ["c3, nearly every master and the engine's choice: the Ruy Lopez's familiar move. It covers d4 and b4, and it gives your bishop c2 to drop back to if the knight ever comes after it. You are a little better.", 'c3 — covers d4, c2 for the bishop.'],
    ["…d4, about three masters in ten and the engine's choice: the pawn pushes on and hits your c3 pawn. But look what it opened: your bishop on b3 now faces their bishop on e6 across the empty d5 square.", '…d4 — hits c3, opens the b3 diagonal.'],
    ["Here's the surprise, about one master in eight, and the engine's first choice: Ng5. The knight hits the bishop on e6 and the pawns on f7 and h7, and it stands on g5 with no guard: their queen can simply take it. Why offer it? After …Qxg5, the masters' main reply, Qf3 comes and you are still a little better. Bxe6, the masters' usual move, is the safe trade, but the engine rates it close to half a pawn lower.", 'Ng5 — offers the knight, hits e6.'],
    ["…dxc3. They don't take the knight. Six masters in ten do, with …Qxg5, and the engine rates that lower for them. Instead the pawn takes on c3 and hits your knight on d2 and the b2 pawn. Now a lot is hanging at once: your knight on g5, your e5 pawn, their pawn on c3.", '…dxc3 — hits d2, everything hangs.'],
    ["So take first: Nxe6, nearly every master and the engine's choice. Look at the knight on e6: it hits their queen on d8, the knight on c5, the bishop on f8 and pawns on c7 and g7. They have to take back. Recapturing on c3 first instead would cost you about a pawn.", 'Nxe6 — takes the bishop, hits everything.'],
    ["…fxe6, every master: the pawn takes back and opens the f-file next to their king. Their pawn on c3 is still deep in your camp, and it has no guard.", '…fxe6 — takes back, c3 still loose.'],
    ["bxc3, the engine's choice: take the pawn back. Material is level again, and look at their pawn on e6: none of their pawns stand on the d- or f-file beside it, so it's isolated.", 'bxc3 — material level, e6 isolated.'],
    ["…Qd3, the engine's choice: the queen jumps into the hole on d3, a square none of your pawns can ever touch, and hits three things: the pawn on c3, your knight on d2 and the rook on f1.", '…Qd3 — hits c3, d2 and f1.'],
    ["Bc2, the engine's choice: the bishop hits the queen on d3, so it has to move again. You are clearly better. Your plan: Nb3 and Be3, developing with hits on their knights, and go after their king while it still sits on e8 with no pawn left on f7 to shelter it.",'Bc2 — hits the queen; clearly better.'],
  ],
  'Berlin Defense': [
    ["…Nf6 — the Berlin Defense, one master in five and the engine's first choice. No …a6 question this time: they hit your e4 pawn at once, and it has no guard. Your bishop's pressure on c6 hasn't won anything yet, so they simply ignore it.", '…Nf6 — the Berlin, hits e4 at once.'],
    ["O-O, a little over half the masters: castle and leave e4 hanging, just as against …a6. The quieter d3, close to four in ten, guards it with a pawn. It's about level.", 'O-O — castles, e4 left hanging.'],
    ["…Nxe4, nine masters in ten: they take it. Their knight hits d2 and f2, and you're a pawn down for the moment.", '…Nxe4 — they take the pawn.'],
    ["d4, two masters in three: hit back in the center. The pawn hits e5, whose only guard is the knight on c6, the knight your bishop is leaning on. Re1, going after the knight on e4 first, was the engine's choice. It's about level.", 'd4 — hits e5; Re1 was the choice.'],
    ["…Nd6, nine masters in ten: the knight steps back with a hit on your bishop on b5, which has no guard.", '…Nd6 — hits your loose bishop.'],
    ["Bxc6, nine masters in ten: take the knight before your bishop has to run. With e5 left without its guard, they have to take back now, and the question is which pawn.", "Bxc6 — takes e5's guard."],
    ["…dxc6, every master: the d-pawn takes, which opens lines for their queen and the bishop on c8. The price is doubled pawns on c6 and c7, and the e5 pawn still has no guard.", '…dxc6 — open lines, doubled pawns.'],
    ["dxe5, every master: you take it, and the pawn hits the knight on d6. Material is level again. That knight is all that stands between the two queens on the d-file.", 'dxe5 — material level, hits the knight.'],
    ["…Nf5, nearly every master: the knight steps aside, and now the queens face each other down the open d-file.", '…Nf5 — the queens face each other.'],
    ["Qxd8 check, nearly every master: trade queens with check. Their king has to take back, and once it moves it can never castle.", 'Qxd8+ — the queens come off.'],
    ["…Kxd8, and here's the Berlin endgame. No queens, their king on d8, and in return they keep both their bishops. Count the pawns: on the kingside you have four, on e5, f2, g2 and h2, against their three, while their four on the queenside include the doubled pair on c6 and c7.", '…Kxd8 — the Berlin endgame begins.'],
    ["h3, about one master in five; two in three develop with Nc3 first. It's slow, but it has a point: the pawn gets g4 ready, and g4 would chase the knight off f5.", 'h3 — g4 next, to chase f5.'],
    ["…Ke8, a third of the masters and the engine's choice: the king walks back to e8, off the d-file before your rook arrives there with check.", '…Ke8 — off the d-file.'],
    ["Nc3, nearly every master and the engine's choice: your queenside knight develops, covering d5 and e4.", 'Nc3 — develops, covers d5 and e4.'],
    ["…h5 takes g4 away for good: now g4 would just be taken, and the knight on f5 stays where it is. Remember h3? This is their answer to it.", '…h5 — covers g4, the knight stays.'],
    ["Bf4 develops your last minor piece and gives e5 a guard. The engine preferred Ne2, heading for f4 with the knight instead, to challenge the one on f5. It's about level.", 'Bf4 — develops, guards e5.'],
    ["…Be7, the engine's choice: the bishop develops and covers h4, so their knight can jump there and trade itself for yours on f3.", '…Be7 — covers h4 for the knight.'],
    ["Rad1, the engine's choice: your rook takes the open d-file, the file the queen trade left behind.", 'Rad1 — the rook takes the d-file.'],
    ["…Be6, the engine's choice: the bishop develops and hits your a2 pawn. Your knight on c3 guards it, so nothing hangs.", '…Be6 — hits a2, which holds.'],
    ["Ng5, the engine's first choice: the knight jumps at the bishop on e6 and the f7 pawn. Their bishop on e7 hits it, but your bishop on f4 guards it.", 'Ng5 — hits e6 and f7.'],
    ["…Bxg5 gives up a bishop for your knight, but it's a mistake. …Rh6, guarding e6 along the sixth rank, was the engine's move. They hand back the two bishops, and now you are a little better.", '…Bxg5 — a mistake, the bishop pair goes.'],
    ["Bxg5 takes back. Their two bishops are down to one, and your bishop on g5 reaches d8 and e7, right next to their king. You are a little better. Your plan: Ne2 and Nf4 to hit their bishop on e6, trade rooks on the d-file, and turn your four pawns against three on the kingside into a passed pawn.", 'Bxg5 — a little better; Nf4 next.'],
  ],
  'Marshall Attack': [
    ["…O-O, about four masters in ten and the engine's first choice: castle first and leave the d-pawn on d7. Why does that matter? From d7 it can still reach d5 in one move, and that's the Marshall Attack.", '…O-O — castles first, …d5 in reserve.'],
    ["c3, close to half the masters and the engine's choice: the usual plan, d4 next. It also allows the Marshall. If you'd rather not allow it, a4 is the Anti-Marshall, on its own tab.", 'c3 — the usual plan, d4 next.'],
    ["…d5 — the Marshall Attack, a little over half the masters. They don't defend e5. They hit your e4 pawn and offer a pawn. Here's the deal: if you take, you win the e5 pawn, but their pieces come at your king with gain of time while your queenside still sits at home. The engine prefers …Na5, and rates you a little better here.", '…d5 — the Marshall: a pawn for an attack.'],
    ["exd5, nine masters in ten and the engine's choice: take it. The pawn hits the knight on c6, which has no guard.", 'exd5 — takes, hits the loose knight.'],
    ["…Nxd5, nearly every master: the knight takes back. Now count e5: two attackers, your knight on f3 and the rook on e1, and one guard, the knight on c6. That's the pawn on offer.", '…Nxd5 — and e5 is on offer.'],
    ["Nxe5, nearly every master: take the pawn. The knight on e5 hits the one on c6 and the f7 pawn.", 'Nxe5 — the pawn is yours.'],
    ["…Nxe5, every master: they trade knights, and you take back with the rook.", '…Nxe5 — knights come off.'],
    ["Rxe5, every master: you're a pawn up, and the rook hits the knight on d5 and the bishop on e7. Both are guarded, so nothing falls. And look at your queenside: the knight on b1 and the bishop on c1 haven't moved yet.", 'Rxe5 — a pawn up, queenside still asleep.'],
    ["…c6, almost every master: the pawn props up the knight on d5 and keeps it firmly in place. The engine prefers …Nf6, but this is the Marshall's main road.", '…c6 — props up the d5 knight.'],
    ["d4, about half the masters: the pawn takes the center and opens the road for your bishop on c1. The engine prefers d3 or Re1, and after d4 it's about level.", 'd4 — center, frees c1; about level.'],
    ["…Bd6, every master: the bishop hits your rook on e5, and behind the rook it points down the diagonal toward h2, next to your king.", '…Bd6 — hits the rook, aims at h2.'],
    ["Re1, nearly every master and the engine's choice: the rook steps back home. Now nothing stands between their bishop on d6 and your h2 pawn.", 'Re1 — back home, h2 now in sight.'],
    ["…Qh4, every master: the queen joins the bishop. Look at h2: it's hit twice, by the queen and the bishop on d6, and only your king guards it. …Qxh2 check is the threat.", '…Qh4 — two attackers on h2.'],
    ["g3, every master: the pawn hits the queen and cuts the bishop's line to h2. Why not h3? Because …Bxh3 rips your king open: the engine rates that more than two pawns worse.", 'g3 — hits the queen, blocks the bishop.'],
    ["…Qh3, every master: the queen digs in on h3, hitting h2 and g3, and it covers g2 and f1, the squares your king might want. It's about level now: that's what the pawn has bought them.", '…Qh3 — boxes in your king.'],
    ["Be3, about half the masters: the bishop finally develops and guards d4. Re4, the rook up to the fourth rank, was the engine's choice. It's about level.", 'Be3 — develops, guards d4.'],
    ["…Bg4, close to nine masters in ten: the last piece joins in and hits your queen on d1.", '…Bg4 — hits your queen.'],
    ["Qd3, every master: the queen steps off the bishop's line and guards f1 and e2 on the way. And it hits back, at h7 and b5. Bxd5 instead would drop the queen to …Bxd1.", 'Qd3 — off the line, guards f1.'],
    ["…Rae8, close to nine masters in ten: the last rook joins the attack and hits your bishop on e3, which is guarded three times.", '…Rae8 — the last rook joins.'],
    ["Nd2, nearly every master and the engine's choice: at last the knight leaves b1, and from d2 it covers f1, f3 and e4.", 'Nd2 — at last, the knight develops.'],
    ["…Re6, about six masters in ten and the engine's choice: the rook lifts to e6 and hits your bishop on e3. But look at the long diagonal: your bishop on b3 now pins their knight on d5 to the rook.", '…Re6 — but the d5 knight is pinned.'],
    ["a4, close to eight masters in ten: hit back on the other wing, at b5. But here the engine finds c4, hitting the pinned knight on d5, and rates it close to a pawn better. After a4 it's about level.", 'a4 — hits b5, but c4 was stronger.'],
    ["…f5 brings another pawn into the attack, heading for f4. But it's a mistake: …Qh5, the masters' main move, was the engine's choice, and now you are a little better, still the pawn up. Your plan: take on b5 to open the a-file, then Bg5, and trade off the rook on e6.", "…f5 — a mistake; you're a little better."],
  ],
  'Anti-Marshall (8.a4)': [
    ["a4, the Anti-Marshall, about one master in five: hit b5 before …d5 can come, and steer the game away from their gambit. The engine prefers the main move c3, which allows the Marshall.", 'a4 — the Anti-Marshall, hits b5.'],
    ["…b4, a little over half the masters and the engine's choice: the pawn steps past, so axb5 never happens, and it takes c3 away from your knight.", '…b4 — past the pawn, covers c3.'],
    ["d3, the masters' most common move here, about four in ten: a pawn guards e4, and the game turns into slow maneuvering instead of a gambit.", 'd3 — guards e4, a slow game.'],
    ["…d6, close to nine masters in ten and the engine's choice: e5 gets a pawn guard, and the bishop on c8 can come out.", '…d6 — guards e5, frees c8.'],
    ["Nbd2, the engine's choice: with c3 covered by their b4 pawn, d2 is this knight's road, toward c4 or f1.", "Nbd2 — the knight's road: c4 or f1."],
    ["…Na5, the engine's choice: the knight hits your bishop on b3, the piece pinning f7.", '…Na5 — hits your bishop on b3.'],
    ["Where does the bishop go? There's no c2 this time, because your c-pawn hasn't moved. So Ba2, the engine's choice: the bishop stays on its diagonal and keeps the pin on f7.", 'Ba2 — keeps the pin on f7.'],
    ["…c5, the engine's choice: queenside space, and the pawn backs up b4.", '…c5 — space, backs up b4.'],
    ["c3: the pawn hits b4 and asks it to decide. If it takes, your b-pawn takes back and the b-file opens.", 'c3 — hits b4.'],
    ["…Rb8, the engine's choice: the rook backs up b4, so if the b-file opens, it's their rook standing on it.", '…Rb8 — backs up b4.'],
    ["Nf1, the knight's usual trip toward g3, but here it's a mistake. Nc4, hitting the knight on a5, was the engine's move. Now …b3 can hit your bishop on a2 and send it to b1. It's about level.", 'Nf1 — a mistake; Nc4 was better.'],
    ["…Bd7 hits your a4 pawn, which your queen guards. But it misses its chance: …b3, kicking your bishop off a2, was the engine's move. It's about level. Your plan: cxb4, then Ne3 and Bc4, bringing the bishop from a2 back into the game.", '…Bd7 — about level; Ne3, Bc4 next.'],
  ],
  'Arkhangelsk Variation': [
    ["…b5 at once, about one master in seven: kick the bishop before they even develop the kingside. Your e4 pawn is still loose, and so is the bishop on a4.", '…b5 — kicks the bishop right away.'],
    ["Bb3, every master and the engine's choice: d4 or Nxe5 instead would leave the bishop to …bxa4. From b3 it aims at f7.", 'Bb3 — the bishop steps back, eyes f7.'],
    ["…Bb7, about four masters in ten and the engine's choice: the bishop goes straight to the long diagonal, aimed past its own knight at e4. Slightly more masters play …Bc5, putting the other bishop on the diagonal toward f2.", '…Bb7 — the long diagonal, aimed at e4.'],
    ["d3, a little over half the masters: a pawn guards e4 at last, and the diagonal opens for your bishop on c1.", 'd3 — guards e4, frees the c1 bishop.'],
    ["…Be7, two masters in three and the engine's choice: a quiet developing move, and they're ready to castle.", '…Be7 — develops, ready to castle.'],
    ["Nc3, the masters' most common move here: with your c-pawn still at home, the knight takes c3 and hits b5. It also covers d5, the square it would like to land on.", 'Nc3 — hits b5, eyes d5.'],
    ["…O-O: their king is safe, and as in the main line, your bishop on b3 now pins f7 to it.", '…O-O — and f7 is pinned.'],
    ["a3 — a quiet move with a purpose. It gives your bishop a2 to step back to, so a knight on a5 can't trade it off, and it takes b4 away from their pawn.", 'a3 — a2 for the bishop, covers b4.'],
    ["…d6, the engine's choice: a pawn guards e5, and d7 is free for their queen.", '…d6 — guards e5, frees d7.'],
    ["Ba2 — the square a3 made: the bishop steps back before …Na5 can hit it, and keeps the pin on f7.", 'Ba2 — out of reach, pin kept.'],
    ["…Qd7, the engine's choice: the queen steps up and connects their rooks.", '…Qd7 — the rooks connect.'],
    ["Re1, the engine's choice: your rook takes the e-file behind the e4 pawn.", 'Re1 — the rook backs e4.'],
    ["…Rfe8: the rook mirrors yours on the e-file. It's about level. Your plan: Bd2 to finish developing, then Nd5, the square your knight has had in mind since it came to c3.", '…Rfe8 — about level; Nd5 is coming.'],
  ],
  'Exchange Variation': [
    ["Bxc6 — the Exchange Variation, about one master in ten. You give up the bishop for the knight that guards e5. Why? After they take back, they'll have two pawns on the c-file, one in front of the other, and those don't go away: you can steer for an endgame where that counts. The engine prefers keeping the bishop with Ba4, and here it's about level.", 'Bxc6 — the Exchange: doubled pawns for them.'],
    ["…dxc6, nearly every master: the d-pawn takes back, which opens the d-file and the diagonal for their bishop on c8. Their e5 pawn has lost its guard.", '…dxc6 — open lines, e5 unguarded.'],
    ["Castle first, as more than eight masters in ten do, and the engine agrees. Their e5 pawn still has no guard.", 'O-O — king safe, e5 still loose.'],
    ["…f6, the masters' most common answer, about a third: a pawn guards e5 for good. It takes f6 from their knight, though. The engine prefers …Bg4, pinning your knight on f3 to your queen.", '…f6 — a pawn guards e5.'],
    ["d4, nearly every master and the engine's choice: open the center. The pawn hits e5, and if they take, your d-pawn is traded for their e-pawn. That trade is the point.", 'd4 — hits e5, opens the center.'],
    ["…exd4, about six masters in ten and the engine's choice: they take, and the pawns trade.", '…exd4 — the pawns trade.'],
    ["Nxd4, nearly every master and the engine's choice. Now count the pawns. On the kingside you have four, on e4, f2, g2 and h2, against their three. They have an extra pawn on the queenside, but it's one of the doubled pair, so making a passed pawn there is much harder for them.", 'Nxd4 — four against three on the kingside.'],
    ["…c5, the engine's choice: the pawn kicks your knight off d4.", '…c5 — kicks the knight.'],
    ["Nb3, the engine's choice: the knight steps back and hits the c5 pawn, and now the queens face each other on the open d-file.", 'Nb3 — hits c5, queens face off.'],
    ["…Qxd1, the engine's choice: the queens come off. That suits the Exchange: the fewer pieces on the board, the more the pawn count matters. In return they keep both bishops.", '…Qxd1 — queens off; they keep two bishops.'],
    ["Rxd1 takes back, and your rook stands on the open d-file.", 'Rxd1 — the rook takes the d-file.'],
    ["…Bg4: the bishop hits your rook on d1, which has no guard.", '…Bg4 — hits your loose rook.'],
    ["f3, the engine's choice: the pawn steps in front of your rook and hits the bishop on g4. Moving the rook away instead costs you close to a pawn.", 'f3 — blocks the bishop, hits it.'],
    ["…Be6, the engine's choice: the bishop steps back and hits your knight on b3, which your a2 and c2 pawns guard.", '…Be6 — hits your knight on b3.'],
    ["Nc3: your last knight develops, covering d5 and backing up e4.", 'Nc3 — develops, backs up e4.'],
    ["…Bd6, the engine's choice: the bishop develops and looks down the diagonal at h2. And it stands on the d-file in front of your rook, guarded by the c7 pawn.", '…Bd6 — develops, aims at h2.'],
    ["Be3 develops your last piece and hits the c5 pawn. Count it: two attackers, the bishop and your knight on b3, and one guard, their bishop on d6. But g3, cutting the diagonal to h2, was the engine's move. It's about level.", 'Be3 — two attackers on c5.'],
    ["…b6, the engine's choice: a second guard for c5, and it's about level. Your plan: a4 and a5, prying at b6 and their queenside, while your four pawns against three on the kingside wait for the endgame.", '…b6 — guards c5; a4, a5 next.'],
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

export const RUY_LOPEZ_WATCH: WatchCourse = {
  openingId: 'ruy-lopez',
  title: 'The Ruy Lopez — A Master Class',
  orientation: 'white',
  sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
