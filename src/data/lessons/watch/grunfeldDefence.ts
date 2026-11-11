// Grünfeld Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=grunfeld-defence`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a). One story runs through every line: let
// them build the big center, then count the attackers and guards on d4 and
// go after the pieces that hold it.
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7', 'Nf3', 'c5', 'Be3', 'Qa5', 'Qd2', 'O-O', 'Rc1', 'cxd4', 'cxd4', 'Nc6', 'Qxa5', 'Nxa5', 'Be2', 'b6', 'Rc7', 'Bb7', 'Rxe7', 'Rfd8', 'O-O'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — just over a third of master games start this way, second only to e4, which the engine prefers. The pawn takes the center and covers c5 and e5. Keep one thing in mind from the very first move: in the Grünfeld you let them have even more center than this, and then you go after it.", "d4 — the queen's pawn takes the center."],
  ["…Nf6 — about six masters in ten answer this way. The knight covers e4 and d5, the two squares their pawns would like next, and you haven't committed a single pawn yet.", "…Nf6 — covers e4 and d5."],
  ["c4 — about seven masters in ten add the c-pawn. Now two pawns stand side by side, and the new one covers d5. If you sit still, Nc3 and e4 come next, and they own the middle of the board.", "c4 — a second pawn, covering d5."],
  ["…g6 — a third of masters choose it, while just over half play …e6. Where is this heading? The bishop goes to g7, on the long diagonal that runs through d4. So far this could still turn into a King's Indian. The next move decides.", "…g6 — the bishop heads for g7."],
  ["Nc3 — eight masters in ten bring the knight out. It covers e4 and d5, so e4 is ready to come with support, and then they'd have three pawns abreast. So what do you do about that center?", "Nc3 — backs up the e4 push."],
  ["…d5 — and this is the Grünfeld. About a third of masters play it, while two in three go …Bg7 and the King's Indian. The pawn hits c4, and nothing guards it. But here's the real idea: you aren't planning to hold d5. You let them take it and build the big center with e4. Then you hit that center from the side: the bishop from g7, the c-pawn from c5, and your pieces after them. The engine likes …d5 best here, and the game is about level.", "…d5 — the Grünfeld: strike at the center now."],
  ["cxd5 — about half the masters take at once, and three in ten play Nf3 first, the road to the Russian System. For one move you're a pawn down. How do you take back?", "cxd5 — they take, and you're a pawn down."],
  ["…Nxd5 — every master takes back with the knight. Not with the queen: …Qxd5 runs into Nxd5, and your queen goes for a knight. Now your knight sits on d5, in the center, looking at their knight on c3. Watch the next two moves, because they're the whole point.", "…Nxd5 — the knight takes back."],
  ["e4 — more than eight masters in ten push, and the pawn hits your knight on d5. Now they have what the Grünfeld offered them: pawns on d4 and e4 side by side. Your knight has to move, and where it goes shapes the whole game.", "e4 — the big center, hitting d5."],
  ["…Nxc3 — every master trades. Why not retreat to b6 or f6? Then their knight on c3 stays to guard e4, and the engine rates both retreats far worse. The trade removes that guard. And look at what your knight hits right now: their queen on d1. So they have to take back, and the pawn that does it lands on c3.", "…Nxc3 — trade off the knight on c3."],
  ["bxc3 — every master takes toward the center. Here's their center in full: c3, d4 and e4. Big, but look at what it leaves behind. The pawn on a2 has no neighbor, and no knight is left to guard e4. Those pawns are your targets from now on.", "bxc3 — the center: c3, d4, e4."],
  ["…Bg7 — almost every master plays it, and here's the first piece on d4: the bishop looks straight down the long diagonal at it. Your queen on d8 hits d4 too. Count the guards: the pawn on c3 and the queen on d1. Two against two, so it holds for now. Your job over the next few moves is to add attackers until it doesn't.", "…Bg7 — the long diagonal, aimed at d4."],
  ["Nf3 — the knight develops and gives d4 a third guard. Masters split almost evenly between this and Bc4, which aims at f7 instead. On f3 the knight is useful, but remember it for later: …Bg4 can pin it to their queen on d1.", "Nf3 — a third guard on d4."],
  ["…c5 — nine masters in ten strike now, and this is the second wave. The pawn hits d4 from the side. Count again: your pawn, your bishop on g7 and your queen on d8, against the pawn on c3, the queen on d1 and the knight on f3. Three against three. Can they take on c5? Then d4 is gone, and the diagonal opens for your bishop all the way to c3.", "…c5 — hit d4 from the side."],
  ["Be3 — nearly three masters in ten choose it, while just over half play Rb1. The engine likes Be3 best. The bishop gives d4 a fourth guard, so now it's four against three. Why e3 and not f4? On f4 your e-pawn could chase it with …e5.", "Be3 — a fourth guard on d4."],
  ["…Qa5 — about seven masters in ten play it, and here's the idea: if d4 has four guards, go after one of the guards. The queen hits the pawn on c3, and nothing guards it. Worse for them, that pawn can't even move, because it shields their king on e1. So …Qxc3 check is threatened, with the rook on a1 attacked as well.", "…Qa5 — hits c3, a guard of d4."],
  ["Qd2 — more than eight masters in ten. The queen guards c3, so …Qxc3 is off the table. And look at what it lines up with: the bishop on e3. Next could be Bh6, offering to trade off your bishop on g7, the piece this whole defence leans on.", "Qd2 — guards c3, Bh6 next."],
  ["…O-O — your king goes to safety, and from here the line has left the masters' games. Castling also sets a trap. If they grab with dxc5, …Bxc3 hits their queen on d2 and pins it to the king, so the queen goes for a bishop. The engine rates …Nc6 just as highly as castling.", "…O-O — king safe, and a trap."],
  ["Rc1 — the rook leaves a1, where it sat on your bishop's diagonal, and backs up c3 from behind. That matters more than it looks: once the pawns trade on d4, the c-file opens, and this rook is already on it.", "Rc1 — guards c3, ready for the c-file."],
  ["…cxd4 — now you trade. The pawn takes and hits c3 and the bishop on e3, so they must take back. Why now? When their c-pawn recaptures, it leaves c3, and the diagonal from your queen on a5 runs straight to their queen on d2.", "…cxd4 — trade, and open the diagonal."],
  ["cxd4 — the pawn takes back. Now the queens stare at each other along the diagonal from a5 to d2. Their queen is pinned to the king on e1, but it can still take yours, so a queen trade is in the air. And their center is d4 and e4 now, with no pawn behind it.", "cxd4 — the queens face each other."],
  ["…Nc6 — do you trade the queens yourself? Here you don't. The knight comes out with a hit on d4, and it guards your queen on a5, so if the queens come off, the knight takes back. The engine prefers …Qxd2 check first, and after …Nc6 they are a little better.", "…Nc6 — hits d4, guards the queen."],
  ["Qxa5 — they trade queens, and the pin on the diagonal from a5 to e1 goes with them. From here the fight is their two center pawns against your pieces, with no queens on the board.", "Qxa5 — the queens come off."],
  ["…Nxa5 — the knight takes back. It's on the rim for now, but from a5 it can come back to c6 when it's needed. Look at d4: only the knight on f3 and the bishop on e3 guard it, and your bishop on g7 is still on it.", "…Nxa5 — take back, d4 still the target."],
  ["Be2 — the last minor piece comes out so the king can castle. Why not b5? Your a-pawn would chase it with …a6. Now look at the c-file: their rook on c1 runs all the way up to your bishop on c8, and c7 is the square it wants.", "Be2 — castling next, Rc7 is coming."],
  ["…b6 — where does your bishop on c8 belong? On b7, on the long diagonal, where it will hit e4, and this pawn makes room. On d7 it would just walk into Rc7. The pawn on b6 also gives your knight on a5 a guard.", "…b6 — b7 for the bishop, guards a5."],
  ["Rc7 — there's the rook on your second rank, and look at what it hits: your bishop on c8 and the pawns on a7 and e7. The bishop and the a7 pawn are guarded, but e7 is not. So which do you save?", "Rc7 — deep in your camp, hitting e7."],
  ["…Bb7 — you save the bishop and let e7 go. On b7 it's still on the rook's rank, but your knight on a5 guards it. And look at what it hits: e4, which has no guard at all. You can't cover everything, so you get your pieces working instead.", "…Bb7 — hits e4, lets e7 go."],
  ["Rxe7 — they take the pawn, and they're a pawn up. The rook on e7 now guards e4 from behind and hits your bishop on b7 and the pawn on f7, but both are guarded. The real question is how long that rook can stay so deep in your camp.", "Rxe7 — they're a pawn up."],
  ["…Rfd8 — why this rook, and why d8? It takes the half-open d-file and hits d4, which only the knight on f3 and the bishop on e3 still guard. And it clears f8. Next, …Bf8 would hit the rook on e7.", "…Rfd8 — hits d4, clears f8."],
  ["Castle — their king gets to safety at last, and the game is about level. Your plan: …Bf8 to chase the rook off e7, and if it grabs your bishop on b7, the knight takes back and you're up the exchange for a pawn.", "O-O — now …Bf8 chases the rook."],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the lines filed before it don't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Exchange Variation: Main Line': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7', 'Nf3', 'c5', 'Be3', 'Qa5', 'Qd2', 'O-O', 'Rc1', 'cxd4', 'cxd4', 'Qxd2+', 'Nxd2', 'Rd8', 'd5', 'e6', 'Bc4', 'exd5', 'Bxd5', 'Nc6'],
  'Exchange: Be3 Qa5 Qd2 with Rc1': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7', 'Nf3', 'c5', 'Be3', 'Qa5', 'Qd2', 'Nc6', 'Rc1', 'cxd4', 'cxd4'],
  'Russian System (Qb3)': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'Nf3', 'Bg7', 'Qb3', 'dxc4', 'Qxc4', 'O-O', 'e4', 'Nc6', 'Be2', 'Nd7', 'Be3', 'Nb6', 'Qd3', 'f5'],
  'Fianchetto Variation': ['d4', 'Nf6', 'c4', 'g6', 'Nf3', 'Bg7', 'g3', 'd5', 'Bg2', 'dxc4', 'Na3', 'c3', 'bxc3', 'c5', 'O-O', 'O-O', 'Rb1', 'Nc6', 'Ne5', 'Nd5'],
  'Bc4 Classical': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7', 'Bc4', 'c5', 'Ne2', 'O-O', 'O-O', 'Nc6', 'Be3', 'Bg4', 'f3', 'Na5', 'Bxf7+', 'Rxf7', 'fxg4', 'Rxf1+', 'Kxf1', 'cxd4', 'cxd4', 'Qd6'],
  'Neo-Grünfeld (g3 without Nc3)': ['d4', 'Nf6', 'c4', 'g6', 'g3', 'd5', 'Bg2', 'Bg7', 'Nf3', 'O-O', 'O-O', 'dxc4', 'Na3', 'c3', 'bxc3', 'c5', 'dxc5', 'Qa5', 'Qb3', 'Qxc5', 'Be3', 'Qa5'],
  'Exchange: Nf3 c5 Rb1 (Modern)': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7', 'Nf3', 'c5', 'Rb1', 'O-O', 'Be2', 'cxd4', 'cxd4', 'Qa5+', 'Bd2', 'Qxa2', 'O-O', 'Bg4', 'Rxb7', 'Bxf3', 'Bxf3'],
  'Taimanov Variation (f3)': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7', 'Bc4', 'c5', 'Ne2', 'Nc6', 'Be3', 'O-O', 'O-O', 'cxd4', 'cxd4', 'Bd7', 'Rc1', 'Rc8'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Exchange Variation: Main Line': [
    ["…Qxd2+ — this time you trade the queens yourself, with check, and the engine likes it best. Without queens the game is about structure: their center on d4 and e4 against your bishop on g7 and the rooks you'll bring to the d-file.", "…Qxd2+ — trade queens with check."],
    ["Nxd2 — they take back with the knight, the engine's choice over the king or the bishop. But look at what it costs: the knight has left f3, so d4 has only one guard now, the bishop on e3, and your bishop on g7 is already looking at it.", "Nxd2 — d4 is down to one guard."],
    ["…Rd8 — the rook goes straight to the d-file, and now two of your pieces hit d4, the rook and the bishop on g7, against that one guard. They have to do something about it.", "…Rd8 — two hits on d4."],
    ["d5 — the pawn runs forward, off your bishop's diagonal, and grabs space. But it's a commitment. The engine prefers Nb3, guarding d4 with a piece, and after d5 the game is about level. Now the pawn sits on d5 with only the e4 pawn behind it.", "d5 — off the diagonal, but committed."],
    ["…e6 — hit it again. The pawn on e6 and your rook on d8 both attack d5, and only the pawn on e4 guards it. If they take on e6, your bishop takes back.", "…e6 — two hits on d5."],
    ["Bc4 — the bishop brings a second guard to d5, and it clears the way for their king to castle. Two against two, so the pawn holds. Time to trade.", "Bc4 — a second guard on d5."],
    ["…exd5 — you take, and the new pawn on d5 hits the bishop on c4 and the pawn on e4. They have to take back, and whichever way they do, your bishop on c8 is free: the pawn that blocked it has left e6.", "…exd5 — hits c4 and e4."],
    ["Bxd5 — the bishop takes back, and look where it lands: it hits b7 and f7, and both pawns are pinned, f7 to your king and b7 to your rook on a8. Careful here. The natural …Be6 drops the only guard of b7, and Bxb7 would go after your rook on a8 next.", "Bxd5 — hits b7 and f7, both pinned."],
    ["…Nc6 — the knight steps in front of b7, so that pawn is no longer pinned, and the game is about level. From c6 it can jump to b4 and hit the bishop on d5 a second time, alongside your rook on d8. Your plan: …Nb4 to go after the bishop, then …Be6 to trade it off, leaving their lone e-pawn against your active pieces.", "…Nc6 — unpins b7, …Nb4 next."],
  ],
  'Exchange: Be3 Qa5 Qd2 with Rc1': [
    ["…Nc6 — this time the knight comes out before you castle, with another hit on d4: the knight, the pawn on c5 and the bishop on g7. The same trap is waiting as with castling: if they take on c5, …Bxc3 hits their queen on d2 and the rook on a1, and the queen is pinned to the king.", "…Nc6 — develop first, castle later."],
    ["Rc1 — the rook steps off the long diagonal and guards c3 from behind, as in the main line. Here, though, the engine prefers Rb1, putting the rook on the half-open b-file, and after Rc1 the game is about level.", "Rc1 — guards c3, but Rb1 was better."],
    ["…cxd4 — now the trade: the pawn hits c3 and the bishop on e3, so they must take back. If the bishop takes, your knight takes back on d4.", "…cxd4 — trade, open the c-file."],
    ["cxd4 — they take back with the pawn. Compared with the main line, your knight is already on c6 and your king is still on e8. Their queen is pinned to the king again, so …Qxd2 check is ready, and the game is about level. Your plan: trade queens with …Qxd2 check, castle, and bring a rook to d8, with your knight and the bishop on g7 both aimed at d4.", "cxd4 — the queens face off again."],
  ],
  'Russian System (Qb3)': [
    ["Nf3 — about three masters in ten develop instead of taking on d5. The knight covers d4 and e5, and the tension on d5 stays. Notice c4, though: your pawn hits it, and nothing guards it, so …dxc4 is always there for you.", "Nf3 — develops, leaves c4 loose."],
    ["…Bg7 — every master develops the bishop first. It takes the long diagonal, with your knight on f6 in front of it for now, and you're a move from castling. The pawn on c4 can wait.", "…Bg7 — develop, castle next."],
    ["Qb3 — and this is the Russian System, chosen by nearly three masters in ten. The queen guards c4 and hits b7, and your pawn on d5 is now under fire from the pawn on c4 and the knight on c3. Do you hold d5? Not here. You take on c4, and the queen has to come and get the pawn.", "Qb3 — guards c4, hits b7."],
    ["…dxc4 — almost every master takes, and the pawn hits the queen on b3. So it has to take back, and it lands on c4, out in front, where your pieces can hit it and gain time.", "…dxc4 — hits the queen."],
    ["Qxc4 — every master takes back. The queen hits c7 and f7, and from c4 it guards d4, with e4 coming next. But a queen this far forward is a target, and that's the theme of the next few moves.", "Qxc4 — the queen recaptures, e4 next."],
    ["…O-O — nineteen masters in twenty castle. Your king is safe, though the queen on c4 now looks through f7 at it. The engine slightly prefers …Be6 first, hitting the queen, and after castling they are a little better.", "…O-O — king safe, f7 under watch."],
    ["e4 — almost every master pushes. Now they have what they wanted: pawns on d4 and e4, with the queen on c4 behind them. Watch for the e5 push from here, because it would kick your knight off f6.", "e4 — the center, and e5 is coming."],
    ["…Nc6 — about one master in six plays it, and half choose …a6. The knight hits d4 straight away, so the center has to answer: your queen on d8 and the knight against the queen on c4 and the knight on f3. The engine prefers …a6, getting …b5 ready to chase the queen, and after …Nc6 they are a little better.", "…Nc6 — hits d4 at once."],
    ["Be2 — eight masters in ten develop the bishop so the king can castle. d4 still has its two guards, the queen and the knight on f3, and your next move decides how you go after it. The engine prefers h3 first, and after Be2 they are a little better.", "Be2 — develops, castling next."],
    ["…Nd7 — where is this knight going? To b6, to go after the queen on c4. And look at what stepping off f6 does: your bishop on g7 now sees all the way down to d4. About one master in ten plays it, most choose …Bg4, and the engine prefers …e5. After …Nd7 they are a little better.", "…Nd7 — frees the bishop, heading for b6."],
    ["Be3 — nearly nine masters in ten play it, and d4 gets a third guard: the queen, the knight on f3 and now the bishop. Your bishop on g7 and the knight on c6 hit it, two against three, so it holds. Why e3 and not f4? On f4 your e-pawn could chase it.", "Be3 — a third guard on d4."],
    ["…Nb6 — there's the point of …Nd7: the knight hits the queen on c4, and it has to move. Can it grab f7 with check instead? No, …Rxf7 just wins the queen for a pawn. And with the knight gone from d7, your queen on d8 sees d4 again: three of your pieces against three guards.", "…Nb6 — hits the queen."],
    ["Qd3 — the queen steps back to d3, where it still guards d4 and backs up e4. The engine prefers Qc5, and after Qd3 the game is about level. Notice what changed: with the queen off c4, nothing pins f7 anymore, and your f-pawn is free to move.", "Qd3 — still guards d4 and e4."],
    ["…f5 — and here's the break the whole line was building toward. The pawn hits e4, the front of their center, and if they take, your rook on f8 gets the f-file. The price is a looser king, and after …f5 they are a little better. Your plan: keep hitting the center with …fxe4 or …f4 against the bishop on e3, while your knight on c6 and the bishop on g7 lean on d4.", "…f5 — the break, hitting e4."],
  ],
  'Fianchetto Variation': [
    ["Nf3 — about one master in twelve develops this knight instead of Nc3. It covers d4 and e5, and the other knight can wait.", "Nf3 — develops, Nc3 can wait."],
    ["…Bg7 — almost every master develops the bishop first, and you don't have to show your hand yet. …d6 next would make it a King's Indian, …d5 a Grünfeld, and the bishop on g7 is at home in both.", "…Bg7 — keep the choice open."],
    ["g3 — almost half the masters choose it, and their bishop is headed for g2, facing yours across the long diagonal. This is the Fianchetto Variation, a quiet setup where king safety comes first. The engine prefers Nc3, and after g3 the game is about level.", "g3 — their bishop heads for g2."],
    ["…d5 — about one master in ten strikes now, and most castle first. The pawn hits c4, which has no guard, and it turns the game into a Grünfeld. The engine prefers …c6 first, so that a pawn would back up d5, and after …d5 they are a little better.", "…d5 — Grünfeld style, hitting c4."],
    ["Bg2 — about a quarter of masters finish the fianchetto and leave c4 hanging. Most take on d5 first, and so does the engine, but after Bg2 the game is about level. So the pawn on c4 still has no guard. Do you take it?", "Bg2 — c4 left hanging."],
    ["…dxc4 — four masters in ten take, and you're a pawn up. Nothing of theirs hits the pawn yet, so winning it back will cost them time. If Qa4 check, …Nc6 blocks.", "…dxc4 — a pawn up, for now."],
    ["Na3 — just over half the masters go after the pawn this way. The knight hits c4, and nothing of yours guards it. Why a3 and not d2? On d2 it would block their bishop on c1. So can you keep the pawn? Not really, but you can choose how to give it back.", "Na3 — after the pawn on c4."],
    ["…c3 — you give the pawn back, but on your terms. It hits b2, and when they take, their queenside pawns are a2 and c3, split apart, with c3 in front of d4. That's the same target as in the Exchange lines. From here the line has left the masters' games.", "…c3 — give it back, split their pawns."],
    ["bxc3 — they take, and the material is level again. Look at what's left: no pawn of theirs on the b-file, a2 on its own, and c3 holding up d4.", "bxc3 — level, but their pawns are split."],
    ["…c5 — and there's the Grünfeld's usual blow: the pawn hits d4 from the side, and your queen on d8 hits it too. If they take on c5, the d-file opens and …Qxd1 check trades the queens.", "…c5 — hit d4 from the side."],
    ["Castle — their king tucks in behind the bishop on g2, and the game is about level.", "O-O — king safe behind the bishop."],
    ["…O-O — your king joins theirs on the kingside, and the rook comes to f8. Next question: where does your queen's knight belong? On c6, where it hits d4 a third time.", "…O-O — king safe, Nc6 next."],
    ["Rb1 — the rook takes the half-open b-file and hits b7. Your bishop on c8 guards it, so it holds for now, but that bishop is tied to the pawn. The engine prefers Re1, getting ready for e4, and after Rb1 the game is about level.", "Rb1 — the b-file, hitting b7."],
    ["…Nc6 — the knight hits d4, and now it's three of your pieces against three guards: the knight, the pawn on c5 and the queen on d8. Why not …Bf5, going after the rook on b1? Because the bishop leaves b7 behind, and Rxb7 just takes the pawn.", "…Nc6 — three hits on d4."],
    ["Ne5 — the knight jumps into the center and hits your knight on c6, and the bishop on g2 hits it too. Two attackers, and only the pawn on b7 guards it. The knight on e5 also eyes f7. They're asking you a question.", "Ne5 — two hits on c6."],
    ["…Nd5 — the knight steps in front of the bishop on g2, so c6 is only hit once now, and it hits c3, which has no guard. Nxc3 next would win that pawn, and from c3 the knight would attack both the rook on b1 and the queen on d1. And with the knight off f6, your bishop on g7 looks at the knight on e5. The engine prefers …cxd4 first, and after …Nd5 they are a little better. Your plan: take on c3 or on d4 when it suits you, and keep their split queenside pawns as your target.", "…Nd5 — blocks the bishop, hits c3."],
  ],
  'Bc4 Classical': [
    ["Bc4 — the most popular move here, about four masters in ten. The bishop aims at f7, which only your king guards. And their other knight has a plan of its own: e2, where it can back up d4 without blocking the f-pawn.", "Bc4 — aimed at f7."],
    ["…c5 — about eight masters in ten hit d4 right away. Now three of your pieces are on it, the pawn, the bishop on g7 and the queen on d8, against two guards, the pawn on c3 and the queen on d1. So they need a guard at once.", "…c5 — three hits on d4."],
    ["Ne2 — almost every master plays it, and there's the third guard on d4. Three against three. And look at what the knight doesn't do on e2: it doesn't block the f-pawn. Remember that, because f3 comes soon.", "Ne2 — guards d4, f-pawn free."],
    ["…O-O — about three masters in ten castle now, while most play …Nc6 first, the order the Taimanov line uses. Your king is safe, but look at f7: the bishop on c4 pins it to your king. That pin will matter later.", "…O-O — king safe, f7 pinned."],
    ["Castle — more than eight masters in ten put their king on g1 too. Both kings are safe, and the bishop on c4 still points through f7 at yours.", "O-O — both kings safe."],
    ["…Nc6 — nineteen masters in twenty play it, and that's a fourth hit on d4: the knight, the pawn on c5, the bishop on g7 and the queen on d8. Only three pieces guard it, so they have to find a fourth.", "…Nc6 — a fourth hit on d4."],
    ["Be3 — every master finds it: the bishop is the fourth guard. Four against four, and d4 holds. So now you look for a different way in.", "Be3 — four guards, d4 holds."],
    ["…Bg4 — the most common choice, about three masters in ten. The bishop hits the knight on e2 and pins it to the queen on d1. Why care? That knight is one of the four guards of d4, and a pinned guard is a shaky one: if it ever takes on d4, …Bxd1 takes the queen.", "…Bg4 — pins a guard of d4."],
    ["f3 — almost every master hits your bishop with the pawn. So where does the bishop go? Here's the surprise: nowhere. You leave it there and go after their bishop on c4 instead.", "f3 — hits the bishop on g4."],
    ["…Na5 — almost six masters in ten leave the bishop on g4 hanging and hit the bishop on c4 instead. Why does that work? If they take with fxg4, …Nxc4 takes their bishop right back. So they cash in on f7 first.", "…Na5 — hits the bishop on c4."],
    ["Bxf7+ — just under half the masters take on f7 with check, and about as many retreat with Bd3. The bishop grabs a pawn, steps out of the knight's reach and checks your king. Which piece takes it? Not the king: …Kxf7 runs into fxg4, which opens the f-file onto your king and wins the bishop with check.", "Bxf7+ — grabs f7 with check."],
    ["…Rxf7 — every master takes with the rook. You have a bishop for a pawn now, but your bishop on g4 is still hanging, and they're about to take it.", "…Rxf7 — the rook takes back."],
    ["fxg4 — every master takes, and they're a pawn up. The f-file is open now, and your rook on f7 faces their rook on f1. Their king has lost its f-pawn too.", "fxg4 — a pawn up, the f-file open."],
    ["…Rxf1+ — every master trades rooks with check. If the queen takes back, …Nc4 hits the bishop on e3, so the king takes back instead.", "…Rxf1+ — trade rooks with check."],
    ["Kxf1 — the king takes back, and the queen stays on d1, guarding d4. They're a pawn up, but look at their king: on f1, with no f-pawn in front of it.", "Kxf1 — a pawn up, king exposed."],
    ["…cxd4 — you trade on d4, and the pawn hits c3 and the bishop on e3, which has no guard. The engine prefers …Qd6 first, and after …cxd4 they are a little better.", "…cxd4 — hits the bishop on e3."],
    ["cxd4 — they take back, and look at your bishop on g7: it hits d4, and behind d4 stands the rook on a1. The pawn is pinned to the rook.", "cxd4 — pinned to the rook on a1."],
    ["…Qd6 — the queen comes out with two targets: d4, which is pinned, and h2, which nothing guards now that the king has left g1. The engine prefers …e5 first, and after …Qd6 they are a little better. Your plan: go after their loose pawns on d4, h2 and g4 with the queen while the bishop on g7 keeps d4 pinned, and win the pawn back.", "…Qd6 — hits d4 and h2."],
  ],
  'Neo-Grünfeld (g3 without Nc3)': [
    ["g3 — fewer than one master in ten play it here, and this is the Neo-Grünfeld: no knight on c3, and the bishop heads straight for g2. The engine prefers Nf3, and after g3 the game is about level.", "g3 — the fianchetto, no Nc3."],
    ["…d5 — only about two masters in a hundred strike this early. Most develop with …Bg7 first, and the engine prefers …c6, so that a pawn could back up d5. The pawn hits c4, which has no guard, and after …d5 they are a little better.", "…d5 — an early strike at c4."],
    ["Bg2 — about one master in six finishes the fianchetto instead of taking. Look at d5 now: the bishop hits it, and so does the pawn on c4. Two attackers, and your knight on f6 and queen on d8 guard it, so it holds.", "Bg2 — two hits on d5."],
    ["…Bg7 — masters split almost evenly between this and …c6. Your bishop faces theirs across the long diagonal, and you're a move from castling. If they take on d5, your knight takes back.", "…Bg7 — fianchetto against fianchetto."],
    ["Nf3 — fewer than one master in ten develop here, while nine in ten take on d5 first, and the engine prefers that too. After Nf3 the game is about level. The knight now stands between their bishop and d5, and c4 still has no guard.", "Nf3 — develops, c4 still loose."],
    ["…O-O — about one master in five castles first. Why not grab c4 at once? Qa4 check would hit it right back. With your king on g8, that check is gone. The engine prefers …c6 here, and after castling they are a little better.", "…O-O — castle first, then take."],
    ["Castle — three masters in ten put their king on g1 too and leave c4 where it is. Now it's a real offer: do you take the pawn?", "O-O — c4 is on offer."],
    ["…dxc4 — almost half the masters take, and you're a pawn up. Nothing of theirs hits it yet. The question is how they get it back.", "…dxc4 — take the pawn."],
    ["Na3 — nearly nine masters in ten go after the pawn with the knight, and c4 has no guard. Why a3? On d2 it would block their bishop on c1. You won't keep the pawn. The real question is how you give it back.", "Na3 — the knight hits c4."],
    ["…c3 — just over half the masters give it back this way. The pawn hits b2, and when they take with the b-pawn, their queenside is a2 and c3, split apart, with c3 in front of d4. That's the same structure your pieces go after in the Exchange.", "…c3 — return the pawn, split their queenside."],
    ["bxc3 — every master takes back, and material is level. Their pawns on c3 and d4 stand on one diagonal, and the a-pawn is cut off on a2.", "bxc3 — level, a2 cut off."],
    ["…c5 — the pawn hits d4, the Grünfeld's usual blow, and the line leaves the masters' games here. Your queen on d8 hits d4 too.", "…c5 — the usual blow at d4."],
    ["dxc5 — they take, and you're a pawn down for a moment. But look at their pawns now: c3 and c5, and neither has a pawn to guard it. The engine prefers Re1, and after dxc5 the game is about level.", "dxc5 — their pawns split on c3, c5."],
    ["…Qa5 — one queen move, three targets: the knight on a3 and the pawns on c3 and c5, and the two pawns have no guard. They can't hold everything. The engine prefers …Ne4, going after both pawns with the knight first, and after …Qa5 the game is about level.", "…Qa5 — three targets at once."],
    ["Qb3 — the queen steps off d1, guards c3 and the knight on a3, and hits b7 and f7, with f7 pinned to your king. But c5 is left hanging. The engine prefers Nd4, and after Qb3 the game is about level.", "Qb3 — guards c3, leaves c5."],
    ["…Qxc5 — you take the pawn back, and material is level. The queen on c5 hits c3, the knight on a3 and f2, and f2 is pinned to their king. The engine prefers …Ne4 first, and after …Qxc5 the game is about level.", "…Qxc5 — level again, hitting f2."],
    ["Be3 — the bishop develops and hits your queen on c5. The engine prefers Nc2, and after Be3 the game is about level. So where does the queen go?", "Be3 — hits the queen on c5."],
    ["…Qa5 — back to a5, out of the bishop's reach, where it hits the knight on a3 and the pawn on c3 again. The engine prefers …Qh5, and after …Qa5 the game is about level. Your plan: develop with …Nc6 and keep leaning on their split queenside, where the pawn on c3 has no partner.", "…Qa5 — back to a5, on c3."],
  ],
  'Exchange: Nf3 c5 Rb1 (Modern)': [
    ["Rb1 — the most popular move here, just over half the masters. The rook leaves your bishop's long diagonal and goes to the half-open b-file, where it hits b7. The engine slightly prefers Be3, and after Rb1 the game is about level.", "Rb1 — the b-file, hitting b7."],
    ["…O-O — almost every master castles, and b7 is still guarded by your bishop on c8. Notice a trick in the position: if they ever push d5, your bishop takes on c3 with check, because that pawn has no guard.", "…O-O — king safe, b7 still covered."],
    ["Be2 — almost every master develops so they can castle. Why not b5? Your a-pawn would chase it with …a6.", "Be2 — develops, castling next."],
    ["…cxd4 — almost half the masters trade now, and the pawn hits c3, which has no guard. The engine prefers …Bg4 first, going after the knight on f3, and after …cxd4 they are a little better.", "…cxd4 — trade, hitting c3."],
    ["cxd4 — they take back with the pawn. Now your bishop on g7 and your queen on d8 hit d4, and the knight on f3 and the queen on d1 guard it. Grabbing it with the bishop fails: Qxd4, and the trades leave you a bishop down for a pawn. So you look elsewhere.", "cxd4 — d4 is guarded twice."],
    ["…Qa5+ — check, and the queen hits a2, which has no guard. How do they block? Qd2 offers a queen trade, and Bd2 lets you take the pawn.", "…Qa5+ — check, hitting a2."],
    ["Bd2 — they block with the bishop, and it hits your queen. Pinned or not, it can take on a5, so the queen has to move. Don't take on d2: …Qxd2 check, Qxd2, and your queen goes for a bishop. So where does it go? To the free pawn on a2.", "Bd2 — blocks, and hits your queen."],
    ["…Qxa2 — the queen takes the pawn, and now it hits the rook on b1 and the bishop on d2, both guarded. You're a pawn up.", "…Qxa2 — a pawn up."],
    ["Castle — they leave the pawn behind and get the king safe. They're a pawn down, but their pieces are out, and the rook on b1 is still aimed at b7.", "O-O — a pawn down, pieces out."],
    ["…Bg4 — the bishop comes out and hits the knight on f3, the only piece left guarding d4, since the bishop on d2 blocks their queen. It leaves b7 without a guard, so Rxb7 is coming. That's the trade you're making: b7 for d4.", "…Bg4 — hits the last guard of d4."],
    ["Rxb7 — they take b7, and the rook on your second rank hits a7, your knight on b8 and e7, which has no guard. Material is level. Now it's your turn to cash in.", "Rxb7 — level again, e7 loose."],
    ["…Bxf3 — you take the knight, and d4 has lost its last guard. Your bishop on g7 is already on it. They'll take back on f3, and then the pawn on d4 is yours.", "…Bxf3 — d4 loses its last guard."],
    ["Bxf3 — they take back with the bishop, which now guards e4. But d4 hangs, and your bishop on g7 is looking right at it. Your plan: take d4 with the bishop, bring the knight out to a6 or c6, and remember that your a-pawn is passed, with no pawn of theirs left on the a- or b-file.", "Bxf3 — and d4 is hanging."],
  ],
  'Taimanov Variation (f3)': [
    ["…Nc6 — about seven masters in ten develop the knight first and castle later. It adds a fourth attacker on d4, against three guards: the pawn on c3, the knight on e2 and the queen on d1.", "…Nc6 — a fourth attacker on d4."],
    ["Be3 — almost every master answers with the fourth guard. Four against four, and the pawn holds.", "Be3 — the fourth guard."],
    ["…O-O — more than nine masters in ten castle now. The bishop on c4 pins f7 to your king, the same pin as in the Bc4 Classical line.", "…O-O — castle, f7 pinned."],
    ["Castle — nine masters in ten put their king on g1, and now this is the same position the Bc4 Classical line reached by another order. There you played …Bg4. Here you trade on d4 first.", "O-O — the Bc4 position again."],
    ["…cxd4 — a rare choice here, since masters most often play …Bg4. The trade is fine too: the pawn hits c3 and the bishop on e3, so they take back.", "…cxd4 — trade first, then develop."],
    ["cxd4 — every master takes back with the pawn. Look at your bishop on g7: it hits d4, and the rook on a1 stands behind it, so the pawn is pinned. Your knight on c6 and your queen on d8 hit d4 too.", "cxd4 — d4 pinned to the rook."],
    ["…Bd7 — a quiet square, played by about two masters in a hundred, while most choose …Bg4 or …Na5. Why d7? On g4 the bishop runs into f3, and on d7 it's safe and clears c8 for a rook.", "…Bd7 — clears c8 for a rook."],
    ["Rc1 — the rook takes the open c-file first and backs up the bishop on c4. The engine likes it best here.", "Rc1 — the c-file, backing up c4."],
    ["…Rc8 — rook meets rook on the c-file, with your knight on c6 in front of yours. Now …Na5 would hit the bishop on c4 and open your rook onto it at the same time, a discovered attack. They are a little better. Your plan: …e6 to shut the bishop on c4 off from f7, then …Na5 to go after it, with your rook on c8 behind.", "…Rc8 — rook meets rook on the c-file."],
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

export const GRUNFELD_DEFENCE_WATCH: WatchCourse = {
  openingId: 'grunfeld-defence',
  title: 'Grünfeld Defence — A Master Class',
  orientation: 'black',
  sources: ['concept:pos-center', 'concept:pos-initiative', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
