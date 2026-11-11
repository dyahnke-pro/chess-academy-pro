// The Italian Game — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=italian-game`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. Standard: docs/OPENING-WATCH-BEATS.md; said in the think-out-loud
// register. The student plays White. One thread runs through the course: Bc4
// points at f7, the pawn only their king guards, and their bishop on c5 points
// back at f2. The main line is the slow Pianissimo (d3, the knight's trip
// d2–f1–e3, the d4 break saved until the pieces stand behind it); the tabs are
// the louder faces: d4 at once and the check on b4 (Bd2 or the Nc3 pawn
// offer), the Evans pawn, the Two Knights, the passive Hungarian and the
// Møller grab that hands over a rook for an attack on f7.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O', 'Re1', 'a5', 'h3', 'h6', 'Nbd2', 'Be6', 'Bb5', 'Qb8', 'Nf1', 'Qa7', 'Be3', 'Bxe3', 'Nxe3', 'Ne7', 'a4', 'Ng6', 'd4', 'Nxe4', 'Bd3', 'Nf6', 'Bxg6', 'fxg6', 'dxe5', 'dxe5', 'Nxe5', 'g5', 'Nc2', 'Rfe8'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["Where does the Italian begin? With e4, the masters' most common first move, a little under half their games, and the engine's first choice too. The pawn grabs a central square and opens the diagonal for your bishop on f1. That bishop is the hero of this opening, and in a few moves it will be pointing at f7.", 'e4 — center, and the f1 bishop is free.'],
  ["…e5: they answer pawn for pawn and take their own share of the center. The Sicilian, …c5, is more popular with the masters, close to half their games, while about one in four choose …e5. Notice that nothing guards the pawn on e5 yet.", '…e5 — pawn for pawn in the center.'],
  ['So hit it. Nf3, more than nine masters in ten: the knight comes out and attacks e5 in the same move. Development with a threat means their next move is already decided for them: they have to look after that pawn.', 'Nf3 — develops, attacks e5.'],
  ["…Nc6, close to nine masters in ten, does two jobs in one move: the knight develops and guards e5. About one in eight hit back at your e4 pawn with …Nf6, a different opening altogether. Now the question is where your light-squared bishop goes.", '…Nc6 — guards e5, develops.'],
  ["Here's the Italian. Where does the bishop belong? Two masters in three put it on b5, the Ruy Lopez, and the engine prefers d4. The Italian puts it on c4, about one master in five, and look where it points: straight at f7. That pawn is guarded only by their king, so it's the softest spot in their camp, and the ideas in this opening keep coming back to it. It's about level.", 'Bc4 — the Italian bishop, aimed at f7.'],
  ["…Bc5: they copy you. Just over half the masters play it, and it's the engine's first choice. Their bishop aims at f2, the pawn only your king guards, the exact twin of yours aiming at f7. This is the Giuoco Piano, the quiet game. …Nf6 is almost as popular, and that's the Two Knights, on its own tab.", '…Bc5 — the twin bishop, aimed at f2.'],
  ["c3, just over half the masters and the engine's first choice. A quiet pawn move, so what's it for? d4. With c3 in place, a pawn can land on d4 with a pawn behind it, and that pawn would hit their bishop on c5. The other move orders have tabs of their own: d3 first, the slow Pianissimo, and b4, the Evans Gambit, which gives a pawn to speed things up.", 'c3 — gets d4 ready.'],
  ["…Nf6, nearly every master's move and the engine's choice: the knight develops and hits e4, and right now nothing guards that pawn. So you have a decision. Guard it, or push d4 and open the center?", '…Nf6 — hits your loose e4 pawn.'],
  ["Guard it: d3, three masters in four, and the engine's first choice. The pawn holds e4 and keeps the center closed. That's the Giuoco Pianissimo, the very quiet game. You aren't giving up on d4; you're saving it until your pieces stand ready behind it. d4 right now, about one master in five, is the sharper road, on three tabs of its own.", 'd3 — holds e4, saves d4 for later.'],
  ["…d6, about half the masters, and the engine's choice: the same idea on their side, a pawn behind e5 and an open diagonal for the bishop on c8. About one in four play …a6 first, to give the bishop on c5 a hideout on a7; you'll meet that idea on the Pianissimo tab.", '…d6 — a pawn behind e5.'],
  ["Castle, as just over half the masters do. Your king is safe on g1, but notice the side effect: their bishop on c5 now pins your f2 pawn to the king. Nothing is threatened yet. Just remember that diagonal; it comes back later in this line.", 'O-O — king to g1, f2 now pinned.'],
  ["…O-O, about a third of the masters; nearly as many play …a6 first. Look at the pins now: your bishop on c4 pins f7 to their king on g8, and their bishop on c5 pins f2 to yours. Neither side has a target it can hit yet, so the next stretch is about placing the pieces.", '…O-O — f7 and f2 both pinned.'],
  ["Re1, about one master in four. The rook backs up e4 and clears f1, a square your knight on b1 is going to use. But think about the order. The engine prefers h3 first, and here's why: with the rook gone from f1, the pinned f2 pawn has only your king to guard it, so …Ng4 would hit it straight away. After Re1 it's about level.", 'Re1 — backs e4, clears f1.'],
  ["…a5, the masters' favourite here at about four in ten: the pawn takes space on the queenside, keeps an eye on b4 and makes room on a7 for their bishop. But it misses the chance your last move gave them. The engine wanted …Ng4, going straight for f2.", '…a5 — queenside space; …Ng4 was stronger.'],
  ["Now h3, three masters in four and the engine's first choice. The pawn takes g4 away from their knight and their light-squared bishop: no …Ng4 at f2, and no …Bg4 pinning your knight on f3 to the queen. That's prophylaxis, stopping their idea before you start your own.", 'h3 — takes g4 away.'],
  ["…h6 does the same job on their side: g5 is off-limits, so your bishop on c1 can't come out to g5 and pin the knight on f6. From here no master game in the database follows the line; the engine takes over.", '…h6 — takes g5 away.'],
  ["Nbd2, the engine's first choice, and the knight's long trip begins. Why d2? Your pawn has taken c3, the natural square, so the knight goes round: d2, then f1, then on to g3 or e3, nearer their king. You are a little better.", 'Nbd2 — the knight starts its trip.'],
  ["…Be6, and the bishop asks you a question: it hits your bishop on c4 and offers a trade. If you take on e6, the f-pawn takes back toward the center and their rook on f8 gets a half-open file. So do you trade? There's a better square.", '…Be6 — offers a bishop trade on e6.'],
  ["Bb5, the engine's first choice: the bishop sidesteps the trade and hits the knight on c6, which only the b7 pawn guards. Why that knight? It's one of the two guards of e5. If you ever take it, e5 is down to the d6 pawn. You are a little better.", 'Bb5 — dodges the trade, hits c6.'],
  ["…Qb8, the engine's choice, and a strange-looking one. The queen isn't staying on b8; it's on its way to a7, behind the bishop on c5. Why there? Queen and bishop on the same diagonal make a battery, and that diagonal runs through f2 to your king.", '…Qb8 — the queen heads for a7.'],
  ["Nf1, the second step of the trip: from f1 the knight can hop to g3 or e3. The engine rates Re2, guarding f2 from the side, a touch higher; after Nf1 it's about level.", 'Nf1 — next stop g3 or e3.'],
  ["…Qa7, the engine's choice, and the battery is built: the queen on a7 behind the bishop on c5, both aimed down the diagonal at f2 and your king on g1. If that bishop ever leaves c5, the queen's line is open.", '…Qa7 — queen behind bishop, aimed at f2.'],
  ["How do you deal with a battery? Go after its front piece. Be3 offers the trade on c5, and look: your bishop pins theirs to the queen on a7, so it can't simply leave the diagonal. Trading is their natural answer. It's about level.", 'Be3 — pins the c5 bishop to a7.'],
  ["…Bxe3, the engine's choice: they trade first. Their bishop now stands on e3, hitting f2 and pinning it to your king, so you take back right away. With which piece?", '…Bxe3 — the bishops come off on e3.'],
  ["Nxe3: the knight from f1 takes back, and its long trip ends on e3. Rxe3 is just as good; fxe3 rates much worse, doubling your e-pawns. From e3 the knight eyes d5 and f5, and it blocks the diagonal their queen was aiming down at your king.", 'Nxe3 — the trip ends on e3.'],
  ["…Ne7, the engine's choice: the knight leaves c6, where your bishop was hitting it, and heads for g6. It's their version of your knight's trip, a piece swinging over to the kingside.", '…Ne7 — heading for g6.'],
  ["a4, the engine's first choice: the pawn guards your bishop on b5 and blocks their a5 pawn for good. Neither side's a-pawn can move now.", 'a4 — guards b5, fixes a5.'],
  ["…Ng6, and their knight has arrived. From g6 it guards e5 a second time, and later it can jump to f4. The engine rates …Rad8 a hair higher.", '…Ng6 — guards e5 again, f4 later.'],
  ["Now the break the whole setup was built for: d4. The engine slightly prefers Bc4, but d4 is the move your pieces were waiting behind. The pawn hits e5. And see what it leaves: with d3 empty and your knight on e3 blocking the rook, e4 has no guard at all. A blunder? No. If they take it, your bishop comes back to d3 and hits the knight. It's about level.", 'd4 — the break, e4 left loose.'],
  ["…Nxe4: they take the pawn, and the knight hits f2 and c3. But nothing guards the knight on e4, and a loose piece in the middle of the board is easy to hit. The engine prefers the calm …c6. Where's your answer?", '…Nxe4 — grabs the pawn, hits f2.'],
  ["Bd3, and by a long way the engine's choice: your bishop drops back and hits the knight on e4, which has no guard. Qc2 also hits it but rates far worse. And look past the knight: the same diagonal runs on to g6.", 'Bd3 — hits the loose knight on e4.'],
  ["…Nf6: the knight goes home to f6. The engine rates …f5 a touch higher. Now your bishop's diagonal is open all the way to the knight on g6, and only the f7 pawn guards that knight.", '…Nf6 — retreats; g6 is hit now.'],
  ["Bxg6, the engine's choice. Why give up your bishop for a knight? Look at e5. That knight on g6 was one of its two guards. Take it off the board and e5 is down to one guard, the d6 pawn, while your d4 pawn and your knight on f3 both hit it.", 'Bxg6 — removes a guard of e5.'],
  ["…fxg6, the engine's choice by far: the f-pawn takes back and the f-file opens for their rook on f8. The cost is in the pawns: their g-pawns are doubled on g7 and g6.", '…fxg6 — doubled g-pawns, open f-file.'],
  ["dxe5, the engine's first choice; Qc2 or Nf1 rate well over a pawn worse. Your pawn takes and attacks two things at once, the pawn on d6 and the knight on f6, so they have to take back.", 'dxe5 — hits d6 and the f6 knight.'],
  ["…dxe5, the engine's choice: the d-pawn takes back. But now count the guards of that pawn on e5: none. The knight on g6 that used to cover it is gone, and the d6 pawn has just moved onto e5 itself.", '…dxe5 — the e5 pawn has no guard.'],
  ["Nxe5, the engine's choice: the knight collects it, and the material is level again. The pawn you left on e4 has come back, and your knight on e5 now hits g6, one of those doubled pawns. It's about level.", 'Nxe5 — the pawn is back on e5.'],
  ["…g5, the engine's choice: the pawn steps off g6, away from your knight, and takes f4 away from your pieces. The doubled pawns now stand on g7 and g5.", '…g5 — out of reach, covers f4.'],
  ["Nc2, the engine's choice: the knight leaves e3 and heads for d4, right in the middle. But see what that unblocks: their queen on a7 looks down the diagonal again, so f2 is pinned to your king. You are a little better, and a knight on d4 will close that diagonal once more.", 'Nc2 — on the way to d4.'],
  ["…Rfe8: the rook takes the e-file, right behind their bishop on e6. If that bishop ever moves, the rook looks straight at your knight on e5, which your rook on e1 guards. The engine prefers …Qc5. It's about level. Your plan: Nd4, which hits the bishop on e6 and blocks their queen's diagonal at the same time, then your queen to d3 or e2 and a rook to d1, playing against the doubled g-pawns in front of their king.", '…Rfe8 — the rook lines up behind e6.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move no earlier line shares. */
type TabBeats = Array<[string, string]>;

/** Filed in this order: each tab's beats start where the lines before it end. */
const TAB_LINES: Record<string, string[]> = {
  'Giuoco Piano: Main Line with Nc3': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Nc3', 'Nxe4', 'O-O', 'Bxc3', 'bxc3', 'd5', 'Bd3', 'O-O'],
  'Giuoco Piano: Greco Attack (Bd2 line)': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Bd2', 'Bxd2+', 'Nbxd2', 'd5', 'exd5', 'Nxd5', 'Qb3', 'Na5', 'Qa4+', 'Nc6', 'Qb3', 'Nce7', 'O-O', 'O-O', 'Rfe1', 'c6', 'a4'],
  'Giuoco Pianissimo: Closed Italian with a4/Ba2': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'O-O', 'd6', 'c3', 'O-O', 'Re1', 'a6', 'a4', 'Ba7', 'Nbd2', 'Ng4', 'Re2', 'Kh8', 'h3', 'Nh6'],
  'Evans Gambit Accepted: Main Line': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O', 'd6', 'cxd4', 'Bb6', 'd5', 'Na5', 'Bb2', 'Nf6', 'Bd3'],
  'Italian: Hungarian Defense': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Be7', 'd4', 'd6', 'dxe5', 'Nxe5', 'Nxe5', 'dxe5', 'Qh5', 'g6', 'Qxe5', 'Nf6', 'Bg5', 'O-O', 'Nc3', 'Re8', 'Rd1', 'Bd7'],
  'Italian: Two Knights with d4': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd4', 'exd4', 'O-O', 'Nxe4', 'Re1', 'd5', 'Bxd5', 'Qxd5', 'Nc3', 'Qa5', 'Nxe4', 'Be6', 'Neg5', 'O-O-O', 'Nxe6', 'fxe6', 'Rxe6', 'Bd6'],
  'Italian: Modern Moller Attack': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Nc3', 'Nxe4', 'O-O', 'Nxc3', 'bxc3', 'Bxc3', 'Qb3', 'Bxa1', 'Bxf7+', 'Kf8', 'Bg5', 'Ne7', 'Ne5', 'Bxd4', 'Bg6', 'd5', 'Qf3+', 'Bf5', 'Bxf5'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Giuoco Piano: Main Line with Nc3': [
    ["Or strike now: d4, about one master in five. This is the classical Giuoco Piano, and the pawn hits two things at once, the pawn on e5 and the bishop on c5. The price is e4, which is left with no guard. The engine prefers the quiet d3; after d4 it's about level.", 'd4 — hits e5 and the c5 bishop.'],
    ["…exd4, every master's move. Retreating the bishop rates nearly a pawn worse, so they take, and now their pawn on d4 hits c3. You can't let it sit there.", '…exd4 — takes, and hits c3.'],
    ["cxd4, the engine's first choice and about a third of the masters. Now look at your center: pawns on d4 and e4, side by side, and the d4 pawn hits their bishop on c5 again. Just over half the masters push e5 here instead, going after the knight on f6.", 'cxd4 — two pawns in the center.'],
    ["…Bb4 check, every master's move: the bishop gets out of the pawn's way with check. Now the big choice. Block with Bd2, six masters in ten, and the bishops come off; that's the Greco tab. Block with Nc3, and you're offering the e4 pawn. Each road has its own tab.", '…Bb4+ — check, and a big choice.'],
    ["Nc3, about one master in five: the knight blocks the check and develops. Its other job is guarding e4, but it's pinned to your king now, so that guard doesn't really count. That's the offer: e4 is there for the taking. The engine prefers Bd2, and after Nc3 it's about level.", 'Nc3 — blocks on c3, and offers e4.'],
    ["…Nxe4, nearly every master: they take the pawn, and their knight now hits your pinned knight on c3 and the pawn on f2. They are a little better, a pawn up while your king still sits in the center. So get it out of there.", '…Nxe4 — a pawn up, hits c3.'],
    ["Castle, nearly every master's move and the engine's first choice. With your king on g1 the pin is gone, so your knight on c3 really hits e4 now, and that knight on e4 has no guard. They are a little better, but they have to deal with it.", 'O-O — unpins c3, e4 is hit.'],
    ["…Bxc3, nearly every master: they take your knight before it can take theirs. Their bishop on c3 now hits d4 and pins your b2 pawn to the rook on a1. You take back.", '…Bxc3 — removes the knight on c3.'],
    ["bxc3: the pawn takes back toward the center. Nearly every master plays d5 instead, hitting the knight on c6 and leaving their bishop where it is; the engine rates the two about the same. Now your c3 pawn has no guard, and they are a little better.", 'bxc3 — takes back toward the center.'],
    ["…d5, every master game here, though there are only six: the pawn hits your bishop on c4 and gives the knight on e4 a pawn guard. Where does the bishop go?", '…d5 — hits c4, guards e4.'],
    ["Bd3, the engine's choice along with Qc2: the bishop gets out of danger and hits the knight on e4 at once. The d5 pawn guards that knight, so it stays, but behind it the diagonal runs on to h7.", 'Bd3 — hits the e4 knight.'],
    ["…O-O, the engine's choice: their king is safe and they keep the extra pawn. They are a little better. Your plan: Qc2, lining your queen up behind the bishop on d3, then Bf4 and your rooks onto the e-file, because your active pieces are what you have for the pawn on e4.", '…O-O — they keep the extra pawn.'],
  ],
  'Giuoco Piano: Greco Attack (Bd2 line)': [
    ["Bd2, six masters in ten and the engine's first choice: block the check with your bishop and offer a trade. It's the calm answer. Your bishop hits theirs on b4, so they must decide between trading and grabbing e4, which still has no guard.", 'Bd2 — blocks, offers the bishops.'],
    ["…Bxd2 check, three masters in four: they trade bishops on d2, with check. The engine slightly prefers grabbing the pawn on e4 first, which about one in four choose.", '…Bxd2+ — the trade on d2, with check.'],
    ["Nbxd2, the engine's choice: take back with the knight from b1. It develops a piece and guards e4, and your other knight stays on f3. Taking with the queen rates clearly worse.", 'Nbxd2 — develops, guards e4.'],
    ["…d5, the engine's choice: the pawn hits your bishop on c4 and your e4 pawn at the same time. Something has to give.", '…d5 — hits c4 and e4.'],
    ["Take it: exd5, the engine's choice. Your pawn leaves e4, where it was hit, takes away the attack on your bishop, and hits the knight on c6.", 'exd5 — takes, and hits c6.'],
    ["…Nxd5, the engine's choice: the knight takes back and settles on d5. Now look at your d4 pawn: no pawn on the c-file or the e-file beside it. That's an isolated queen's pawn. Its downside is that no pawn can ever guard it; its upside is space and open lines for your pieces.", '…Nxd5 — your d4 pawn is isolated.'],
    ["Qb3: the queen hits b7, and it lines up behind your bishop on c4, so the knight on d5 now faces two of your pieces. The engine prefers castling first. It's about level.", 'Qb3 — hits b7, backs the c4 bishop.'],
    ["…Na5, the engine's choice: the knight jumps to a5 and hits your queen on b3 and your bishop on c4 at once. A fork, so how do you answer it?", '…Na5 — hits b3 and c4 at once.'],
    ["Qa4 check, the engine's choice: the queen escapes with check, and from a4 it hits the knight on a5, which has no guard. Any other queen move rates clearly worse.", 'Qa4+ — check, and hits a5.'],
    ["…Nc6, the engine's choice: the knight comes back to block the check, but on c6 it's pinned to their king by your queen. It still hits your d4 pawn, which your knight on f3 guards.", '…Nc6 — blocks, but pinned to e8.'],
    ["Qb3, the engine's choice: back to b3, hitting b7 again. If they go …Na5 once more, Qa4 check comes again, and the game would be drawn by repetition.", 'Qb3 — back to b3, hitting b7.'],
    ["…Nce7: they won't repeat. The knight drops back to e7, where it guards the knight on d5. But the engine prefers …Na5, and now you are a little better.", '…Nce7 — avoids the repetition, guards d5.'],
    ["Castle, the engine's first choice: your king goes to g1, and the rook on f1 is ready for the e-file. It's about level.", 'O-O — king safe, rook to e1 next.'],
    ["…O-O: they castle too, and the plans are set. Their knight sits on d5, right in front of your isolated pawn, blocking it. You want your pieces active before that blockade gets comfortable.", '…O-O — their knight blocks your d4 pawn.'],
    ["Rfe1, the engine's choice: the rook takes the open e-file and hits the knight on e7. Their queen guards it, so nothing falls, but your rook is already on its best file.", 'Rfe1 — the open file, hits e7.'],
    ["…c6: a pawn now guards the knight on d5, so it can stay there for good. The engine slightly prefers …Nb6.", '…c6 — a pawn guard for d5.'],
    ["a4 takes space on the queenside; pushed on to a5, the pawn would take b6 away from their pieces. The engine rates Ne4 a little higher, and it's about level. Your plan: knights to e4 and e5, with your d4 pawn supporting the one on e5, and your rooks on the e-file and the half-open c-file.", 'a4 — space on the queenside.'],
  ],
  'Giuoco Pianissimo: Closed Italian with a4/Ba2': [
    ["d3 at once, about one master in six: the quietest way to play the Italian. The pawn guards e4 before anything can hit it, and c3 can wait. The engine prefers c3 first, as in the main line. It's about level.", 'd3 — e4 guarded early.'],
    ["…Nf6, nine masters in ten: the knight hits e4, but your d3 pawn already guards it, so nothing hangs.", '…Nf6 — hits e4, which holds.'],
    ["Castle, the engine's first choice, about a third of the masters; a few more play c3 first. With your king on g1, their bishop on c5 pins the f2 pawn to it, the same pin as in the main line.", 'O-O — king to g1, f2 pinned.'],
    ["…d6, about six masters in ten: a pawn behind e5 and an open road for the bishop on c8. The engine rates …a6 a hair higher.", '…d6 — props up e5.'],
    ["c3, nine masters in ten and the engine's choice: the pawn that gets d4 ready. And look at the board: it's exactly the main line's position, reached by a different move order. That's a transposition: different moves, the same position on c3, d3 and e4.", 'c3 — back in the main line.'],
    ["…O-O, about a third of the masters; nearly as many play …a6 first, and the engine slightly prefers it. Now each side's bishop pins an f-pawn to the enemy king: yours pins f7, theirs pins f2.", '…O-O — both f-pawns pinned.'],
    ["Re1, about one master in four: the rook backs up e4 and frees f1 for your knight. The engine prefers h3 or Nbd2. Keep an eye on f2: with the rook gone from f1, only your king guards it.", 'Re1 — backs e4, frees f1.'],
    ["…a6, a third of the masters: the pawn makes room on a7, so their bishop can drop back there when b4 or d4 comes. But the engine wanted …Ng4, hitting f2 at once.", '…a6 — a hideout on a7.'],
    ["a4, about half the masters: the pawn takes space and makes …b5, chasing your bishop on c4, much harder to play. The engine prefers Bb3, stepping back before it's asked; after a4 it's about level.", 'a4 — space, and …b5 is harder.'],
    ["…Ba7, two masters in three: the bishop steps back before a pawn can hit it. From a7 it's still on the same diagonal, so f2 stays pinned to your king, just from further away.", '…Ba7 — same diagonal, safer square.'],
    ["Nbd2, the start of the knight's trip, but a move too early. Nearly nine masters in ten play h3 here, and so does the engine, by a lot. Why? Look at f2: their bishop on a7 hits it, only your king guards it, and nothing stops …Ng4 from hitting it a second time. They are a little better.", 'Nbd2 — too early; h3 was needed.'],
    ["…Ng4, the engine's choice: now f2 is hit twice, by the knight and the bishop on a7, and guarded only by your king. Something has to come back and help. They are a little better.", '…Ng4 — f2 hit twice.'],
    ["Re2, the engine's choice: the rook steps sideways to guard f2. Ugly, but it holds. Hitting back in the center with d4 would cost more than a pawn, and Rf1, back where it came from, rates worse too.", 'Re2 — the rook guards f2.'],
    ["…Kh8, the engine's choice: the king steps off g8 and out of your bishop's line, so f7 is free to move. Watch for …f5 now, a pawn break aimed at your e4.", '…Kh8 — unpins f7, …f5 next.'],
    ["h3, finally: the pawn hits the knight on g4 and asks it where it's going. The engine rates b4, grabbing space first, a touch higher. It's about level.", 'h3 — kicks the knight on g4.'],
    ["…Nh6: the knight drops back to the edge. The engine prefers …f5 at once, leaving the knight where it is and hitting e4. It's about level. Your plan: d4 at last, the break this setup saves for, and if …f5 comes, put your bishop on d5, right in the center.", '…Nh6 — back to the edge.'],
  ],
  'Evans Gambit Accepted: Main Line': [
    ["Here's the Evans Gambit: b4, about seven masters in a hundred. You hand them a pawn: the bishop on c5 is hit, and nothing guards b4, so it can simply take. What do you get? Time. A bishop that takes on b4 gets kicked again by c3, and then d4 arrives, so you build the center while they're busy moving one piece. And b2, now empty, is a square for your other bishop. The engine prefers c3; after b4 it's about level.", 'b4 — the Evans: a pawn for time.'],
    ["Take it they do: …Bxb4, close to nine masters in ten, and the engine's choice too. You're a pawn down, and see where their bishop sits: it pins your d2 pawn to the king, so your d-pawn is stuck for a moment.", '…Bxb4 — a pawn, and d2 pinned.'],
    ["Every master plays c3 here. The bishop is hit, so it has to move, and the pawn on c3 is in place to back up d4. That's the first thing the pawn bought you.", 'c3 — kicks the bishop, prepares d4.'],
    ["…Ba5: six masters in ten keep the bishop on the same diagonal, now pointed through c3 at your king on e1. About three in ten drop back to e7 instead, the engine's slight favourite.", '…Ba5 — still aimed at e1.'],
    ["d4, nineteen masters in twenty: there's your center, e4 and d4 side by side, and the pawn hits e5. One catch: now that d2 is empty, the bishop on a5 pins your c3 pawn to the king. So if they take on d4, can the c-pawn take back? Not while your king sits on e1.", 'd4 — the center, but c3 is pinned.'],
    ["…exd4: about four masters in ten grab a second pawn. You're two pawns down, and their pawn on d4 leans on your pinned c3. Most masters, and the engine, keep things closed with …d6 instead. It's about level.", '…exd4 — a second pawn, on d4.'],
    ["Castle, and the pin disappears: with your king on g1, the bishop on a5 has nothing behind c3, so cxd4 is back on. About six masters in ten castle here. The engine prefers Qb3 first, lining your queen up behind the bishop on c4, aimed at f7.", 'O-O — the c3 pin is gone.'],
    ["…d6 covers e5 and opens the bishop on c8, but it's slow: fewer than one master in ten plays it. Most go …Nge7, and the engine prefers …Nf6, hitting e4. Now you are a little better.", '…d6 — solid on e5, but slow.'],
    ["cxd4, the engine's first choice and a little under half the masters: your center is whole again, pawns on d4 and e4, and you're only one pawn down. That's what the gambit was for.", 'cxd4 — d4 and e4, side by side.'],
    ["…Bb6, just over half of the few masters here: the bishop leaves a5 and hits d4. The engine much prefers …Nf6. Look past d4, too: the diagonal runs on through f2 to your king on g1.", '…Bb6 — leans on d4.'],
    ["d5: the pawn takes space and hits the knight on c6, so it has to move. But look what it gives up: with d4 empty, their bishop on b6 now pins your f2 pawn to the king. Only about one master in twelve pushes here; half play Nc3, and the engine prefers Nbd2.", 'd5 — space, and hits c6.'],
    ["…Na5, the engine's choice: the knight jumps to the edge and hits your bishop on c4, which has no guard.", '…Na5 — hits your loose bishop on c4.'],
    ["Bb2: the other bishop takes the long diagonal and hits g7, with the rook on h8 behind it. But your bishop on c4 is still hit by the knight and still has no guard. The engine prefers Bd3, getting that bishop safe first; after Bb2 it's about level.", 'Bb2 — the long diagonal, at g7.'],
    ["…Nf6, the engine's choice: the knight develops and hits your pawns on e4 and d5. Your bishop on c4 is still hanging to the knight on a5 as well. Time to tidy up.", '…Nf6 — hits e4 and d5.'],
    ["Bd3, the engine's choice: the bishop steps out of the knight's reach and guards e4 at the same time. It's about level: you're a pawn down, but your pawns on d5 and e4 take a lot of space. Your plan: h3, so their bishop can't use g4, then Nc3 to back up e4 before you think about pushing in the center.", 'Bd3 — safe, and guards e4.'],
  ],
  'Italian: Hungarian Defense': [
    ["…Be7, the Hungarian Defense, about two masters in a hundred. The bishop hides on e7: it steers clear of every sharp line, but it hits nothing and leaves you the center. The engine prefers …Nf6 or …Bc5, and now you are a little better.", '…Be7 — the Hungarian, quiet and passive.'],
    ["So take the center: d4, about half the masters and the engine's first choice. The pawn hits e5, which the knight on c6 guards.", 'd4 — the center, hits e5.'],
    ["…d6, about seven masters in ten: they hold e5 with a pawn rather than give up the center. The engine slightly prefers taking on d4.", '…d6 — holds e5.'],
    ["dxe5, about four masters in ten: you open the center now. The engine rates d5, grabbing space, just as high. So how do they take back on e5, with the pawn or with the knight?", 'dxe5 — opens the center.'],
    ["…Nxe5 is the natural recapture, and a big mistake. The knight hits your bishop on c4, which has no guard, so you'd think you have to save it. You don't. The engine wanted …dxe5, trading queens, and now you are winning.", '…Nxe5? — natural, and a big mistake.'],
    ["Nxe5, the engine's choice by a mile: take the knight that's hitting your bishop. Saving the bishop with Bb3 would throw the whole advantage away. And if they take back on e5, your queen goes to h5.", 'Nxe5 — take the attacker instead.'],
    ["…dxe5, their best: they take back, and the material is level for a moment. But look at two pawns: e5, which nothing guards, and f7, which only their king guards. Is there one move that hits both?", '…dxe5 — level, but e5 and f7 are weak.'],
    ["Qh5, the engine's choice: the queen hits e5 and f7 at once. And f7 is hit twice, by the queen and your bishop on c4, with only the king to guard it. They can't hold both pawns.", 'Qh5 — hits e5 and f7 at once.'],
    ["…g6, their best try: the pawn hits your queen and shuts its line to f7. But it can't protect e5 too.", '…g6 — hits the queen, blocks f7.'],
    ["Qxe5, the engine's choice: you win the pawn, and look where the queen lands. It hits the rook on h8, which has no guard, and it pins the bishop on e7 to their king.", 'Qxe5 — a pawn up, hits h8.'],
    ["…Nf6, the engine's choice: the knight develops and blocks your queen's line to h8. It also hits e4, which your queen guards.", '…Nf6 — blocks the line to h8.'],
    ["Bg5: the bishop hits the knight on f6. And its natural guard, the bishop on e7, is pinned to their king by your queen, so it can't take back. The engine rates Bh6, which stops them castling, just as high. You are winning.", 'Bg5 — hits f6; its guard is pinned.'],
    ["…O-O, the engine's choice: the king leaves e8, so the bishop on e7 is no longer pinned and guards the knight again. But their king has walked onto your bishop's diagonal: f7 is now pinned to it.", '…O-O — unpins e7, but f7 is pinned.'],
    ["Nc3, the engine's choice: your last minor piece comes out and guards e4. You are winning, so there's no rush to castle; get everything into play first.", 'Nc3 — develops, guards e4.'],
    ["…Re8, the engine's choice: the rook takes the e-file, with their bishop on e7 between it and your queen. If that bishop ever moves, the rook hits your queen on e5.", '…Re8 — the rook behind the e7 bishop.'],
    ["Rd1, the engine's choice: the rook takes the open d-file and hits their queen on d8. You are clearly better.", 'Rd1 — the open file, hits d8.'],
    ["…Bd7 blocks the d-file, but now that bishop is pinned to their queen by your rook. The engine wanted …Nd7, and now you are winning. Your plan: Qf4, so the knight on f6 is hit a second time, and keep squeezing both pins, the f7 pawn against their king and the bishop on d7 against their queen.", '…Bd7 — blocks d1–d8, but pinned.'],
  ],
  'Italian: Two Knights with d4': [
    ["…Nf6, the Two Knights Defence, a little over four masters in ten. Instead of copying your bishop, the knight hits e4 right away, and that pawn has no guard. How sharp do you want this to be?", '…Nf6 — the Two Knights, hits e4.'],
    ["d4, about one master in twelve: you hit back in the center instead of guarding e4. Three in four play the quiet d3, and the engine agrees with them; Ng5, going straight at f7, is the wild try.", 'd4 — strike back in the center.'],
    ["…exd4, almost every master: they take. You're a pawn down, and e4 is still loose. What next?", '…exd4 — a pawn, and e4 still loose.'],
    ["Castle. Seven masters in ten push e5 here, hitting the knight; about a quarter castle instead, and the engine rates the two close. Your king gets to g1 before the center opens, and the pawn on e4 stays on offer.", 'O-O — king to g1, e4 on offer.'],
    ["…Nxe4, about three masters in four: a second pawn, and the knight hits f2. They are a little better. But look where that knight stands: on the e-file, with their king behind it on e8. Which of your pieces can use that?", '…Nxe4 — a second pawn, on the e-file.'],
    ["Re1, almost every master: the rook hits the knight and pins it to their king on e8. It can't move, so they need to guard it.", 'Re1 — pins the knight to e8.'],
    ["…d5, every master's move: the pawn guards the knight on e4 and hits your bishop on c4 in one go.", '…d5 — guards e4, hits c4.'],
    ["Bxd5, nearly every master's choice: take the pawn that was guarding e4. Now your bishop hits the knight on e4 again, along with the knight on c6 and the f7 pawn. Yes, their queen can take it, and then Nc3 hits the queen and the knight together.", 'Bxd5 — removes the guard of e4.'],
    ["…Qxd5, every master: the queen takes, and for a moment you're a piece and a pawn down. But their queen on d5 has no guard, and the knight on e4 is still pinned.", '…Qxd5 — a piece up on d5, for now.'],
    ["Nc3, every master's move, and here's the point: the knight forks their queen and the pinned knight on e4. The queen has to move, and then you take the knight back.", 'Nc3 — forks the queen and e4.'],
    ["…Qa5, about half the masters: the queen steps out of your knight's reach and hits that knight on c3, which the b2 pawn guards. About a third go to h5 instead.", '…Qa5 — escapes, hits c3.'],
    ["Nxe4, nearly every master: the knight collects the pinned one, and you're just a pawn down again. And look at the e-file: your rook on e1, your knight on e4, their king on e8. If that knight moves, it's check.", 'Nxe4 — the knight back, discovered check ready.'],
    ["…Be6, nearly every master: the bishop develops and steps onto the e-file, so a knight move from e4 is no longer check.", '…Be6 — blocks the e-file on e6.'],
    ["Neg5, a little over half the masters and the engine's choice: the knight hits the bishop on e6, and that bishop is pinned to their king by your rook, so it can't step away. They need to guard it again or get the king out of the way.", 'Neg5 — hits the pinned bishop on e6.'],
    ["…O-O-O: the king escapes to c8, and the bishop on e6 is no longer pinned. The f7 pawn still guards it, but now you can trade it off.", '…O-O-O — the king runs to c8.'],
    ["Nxe6, the engine's choice: the knight takes the bishop and hits the rook on d8 and the bishop on f8. They have to take it.", 'Nxe6 — takes, hits d8 and f8.'],
    ["…fxe6, the engine's choice by far: the f-pawn takes back. But that pawn on e6 now stands on your rook's file with nothing to guard it.", '…fxe6 — the e6 pawn is loose.'],
    ["Rxe6, the engine's choice: the rook takes it, and the material is level again. And the rook already hits the knight on c6.", 'Rxe6 — material level, hits c6.'],
    ["…Bd6 develops and aims at h2, though the engine prefers …Be7. It's about level. Your plan: Bg5, your last piece out with a hit on the rook on d8, then Qe2 to back up your rook on e6.", '…Bd6 — develops, aims at h2.'],
  ],
  'Italian: Modern Moller Attack': [
    ["…Nxc3, only about two masters in a hundred: the knight takes on c3 and hits your queen on d1. Nearly every master takes with the bishop instead, and the engine agrees: this knight capture throws away their edge. It's about level now.", '…Nxc3 — hits your queen on d1.'],
    ["bxc3: the pawn takes back and hits the bishop on b4. Re1 check first is about the same.", 'bxc3 — takes, hits the b4 bishop.'],
    ["…Bxc3, greedy: the bishop takes a second pawn and hits your rook on a1. But count their development. The queen, the c8 bishop and both rooks are still at home, and their king hasn't castled. The engine wanted …d5, and now you are clearly better.", '…Bxc3 — greedy, hits a1.'],
    ["Qb3: let the rook go. The queen hits the bishop on c3 and lines up behind your bishop on c4, both aimed at f7, the pawn only their king guards. The engine prefers Ba3, which stops them castling; after Qb3 you are a little better.", 'Qb3 — ignore a1, aim at f7.'],
    ["…Bxa1: they take the rook, and that grab loses. They're up a rook and two pawns, and you are winning anyway, because their king is about to come under fire on f7. The engine wanted …d5, giving material back to block your bishop.", '…Bxa1 — grabs the rook, and loses.'],
    ["Bxf7 check, the engine's choice: the bishop takes the pawn only their king guarded. Can the king take back? No: your queen on b3 guards f7.", 'Bxf7+ — check, and f7 is guarded.'],
    ["…Kf8, the better of the king's two squares: it steps aside and hits your bishop on f7, but it can't take while your queen guards it. Their king has lost the right to castle, and it's stuck out in the open.", '…Kf8 — no castling now.'],
    ["Bg5, the engine's choice: the other bishop comes out with a hit on their queen on d8. Every move you make now comes with a threat.", 'Bg5 — hits the queen on d8.'],
    ["…Ne7 blocks, but now that knight is pinned to their queen by your bishop on g5. The engine preferred …Nxd4, hitting your queen. You are winning.", '…Ne7 — blocks, but pinned to d8.'],
    ["Ne5: the knight jumps into the center. It guards your bishop on f7, and it clears f3 for your queen. Taking back the bishop on a1 with Rxa1 is about as strong. You are winning.", 'Ne5 — guards f7, clears f3.'],
    ["…Bxd4: the bishop comes back from a1, takes a pawn and hits your knight on e5, which has no guard. The engine wanted …d5 instead. You are still winning.", '…Bxd4 — hits your loose knight on e5.'],
    ["Do you save the knight? No: Bg6, the engine's choice. The bishop steps off f7, which clears the f-file for a queen check, and from g6 it still covers e8 and f7, two squares next to their king.", 'Bg6 — clears the f-file for a check.'],
    ["…d5, their best defence: the pawn opens the road from c8 to f5, so a piece can block on f5 when your queen checks.", '…d5 — opens the road to f5.'],
    ["Qf3 check, the engine's choice: the queen comes down the f-file at their king. …Kg8 walks into Qf7, mate, so they have to block on f5.", 'Qf3+ — check down the f-file.'],
    ["…Bf5 blocks, and the bishop is pinned to their king the moment it lands. It even hits your bishop on g6, but it can't take: leaving f5 would expose its own king. The engine preferred blocking with the knight. You are winning.", '…Bf5 — blocks on f5, and is pinned.'],
    ["Bxf5, the engine's choice: take the pinned bishop. Now your bishop on f5 sits between your queen and their king, so any move it makes is a discovered check, and the knight on e7 is still pinned to their queen by your bishop on g5. You're still down material, and you are winning. Your plan: keep their king in the open with that discovered check, and take the queen with Bxd8 the moment the knight on e7 lets go.", 'Bxf5 — a discovered check is loaded.'],
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

export const ITALIAN_GAME_WATCH: WatchCourse = {
  openingId: 'italian-game',
  title: 'The Italian Game — A Master Class',
  orientation: 'white',
  sources: ['book:italian-game', 'concept:pos-center', 'concept:pos-development', 'https://www.chess.com/openings/Italian-Game', 'https://en.wikipedia.org/wiki/Giuoco_Piano'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
