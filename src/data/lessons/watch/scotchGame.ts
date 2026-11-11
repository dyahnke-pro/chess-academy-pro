// The Scotch Game — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=scotch-game`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. Standard: docs/OPENING-WATCH-BEATS.md; said in the think-out-loud
// register. The student plays White. One idea runs through every line: d4
// strikes at e5 at once, the center opens, and a knight lands on d4. Their
// bishop or knight goes after that knight, and the fights are about who holds
// d4 and what the trades leave behind: doubled c-pawns in the main line and
// the Mieses, the e5 push, and the gambits that hand over a pawn for time.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6', 'c3', 'Nge7', 'Bc4', 'O-O', 'O-O', 'd6', 'Nxc6', 'Nxc6', 'Bxc5', 'dxc5', 'f4', 'Be6', 'Bb5', 'Rad8', 'Qe2', 'Bc8', 'Nd2', 'a6', 'Ba4', 'b5', 'Bc2', 'c4', 'e5', 'Qh6', 'Ne4', 'Kh8', 'Ng5', 'g6', 'Ne4', 'Bf5', 'Nf6', 'Bxc2', 'Qxc2', 'Ne7', 'Rf3', 'Qg7', 'g4', 'Nd5', 'g5', 'Nxf6'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["Every Scotch starts with e4, the masters' most common first move, close to half their games. The pawn takes the center and opens lines for your queen and the bishop on f1. Keep one square in mind from the start: d4. A second pawn is going there very soon.", 'e4 — the center first, d4 soon.'],
  ["…e5 — they meet you pawn for pawn and claim their share of the center. The Sicilian, …c5, is the masters' most common answer, but this is the road to the Scotch. That pawn on e5 is the target of your next two moves.", '…e5 — pawn meets pawn.'],
  ['Nf3, nine masters in ten, and it comes with a threat: the knight hits the pawn on e5, and nothing guards it yet. So their next move has to take care of it.', 'Nf3 — develops, hits e5.'],
  ['…Nc6, close to nine masters in ten: the knight guards e5 and develops in the same move. Now the big decision is yours.', '…Nc6 — guards e5, develops.'],
  ["Here's the Scotch. Most masters play Bb5 here, the Ruy Lopez, about two in three. You don't wait: d4, and it's the engine's first choice. Count the pawn on e5 now. Your pawn and your knight both hit it, and only the knight on c6 guards it, so something has to give right away.", 'd4 — the Scotch: strike at e5 now.'],
  ["…exd4, and every master takes. The engine rates …d6, holding the pawn, well below it. So the center is open, and for a moment they're a pawn up. Taking back with the knight is the main line. Leaving the pawn there a little longer is the gambit idea, on two other tabs.", '…exd4 — takes, the center opens.'],
  ["Nxd4, eight masters in ten: the knight takes back and lands in the middle of the board, and the material is level. Look at what the open center gives you: a pawn on e4, a knight on d4, and free lines for both bishops and your queen. The knight already hits c6, but it's also the piece they'll go after next.", 'Nxd4 — a knight in the center.'],
  ["…Bc5, the Classical: the bishop comes out with a hit on your knight on d4. Count it. Two attackers on d4 now, the bishop and the knight on c6, and one guard, your queen. The masters play …Nf6 a little more often, and the engine prefers it too. It has its own tab.", '…Bc5 — two attackers on d4.'],
  ["Be3, the masters' most common move here, a bit over a third of their games: the bishop develops and guards the knight on d4, so it's two against two. The engine prefers Nb3, stepping the knight away with a hit on the bishop. That retreat has its own tab. After Be3 it's about level.", 'Be3 — guards d4, two on two.'],
  ['…Qf6, nearly every master: the queen piles onto d4, and it also eyes f2. Count again. Three attackers on d4, the knight, the bishop and now the queen, and only two guards. If you do nothing, they win the knight.', '…Qf6 — a third attacker on d4.'],
  ['So you add a third guard: c3, nineteen masters in twenty. The pawn holds d4, three against three, and the knight is safe. Why not Nb5, going after c7? Then …Bxe3 comes, and after fxe3, …Qh4 check picks up your e4 pawn.', 'c3 — a third guard for d4.'],
  ["…Nge7, nine masters in ten. Why not f6 for the knight? Their queen is standing there. So the knight goes to e7, where it guards c6 and clears the way to castle. From e7 it can jump on to g6 or d5 later.", '…Nge7 — f6 is taken, so e7.'],
  ["Bc4, about two masters in three: the bishop develops, aims at f7, and now you're ready to castle. Keep that diagonal in mind. Once their king lands on g8, the f7 pawn stands right in front of it.", 'Bc4 — aims at f7, castle next.'],
  ["…O-O, and this is where the masters' games run out: no master game in the database reaches this position. Their king is safe on g8, but look at your bishop on c4. It now pins the f7 pawn to that king.", '…O-O — f7 is pinned to the king.'],
  ["You castle too, the engine's first choice. Your king is safe, and the rook on f1 now stands behind the f-pawn. Keep that rook in mind: once the f-pawn moves forward, the f-file is its road.", 'O-O — king safe, rook behind f2.'],
  ["…d6 frees the bishop on c8 and gives the bishop on c5 a pawn guard. The engine prefers …Bb6. And here's the catch: the knight on c6 just lost two guards, the pawn that left d7 and the queen, whose line along the sixth rank now runs into d6. You are a little better.", '…d6 — frees c8, guards the bishop.'],
  ["Nxc6, the engine's choice, and it starts a chain of trades. Your knight takes on c6 and hits their knight on e7, so they take back. Then look at their bishop on c5: it faces your bishop on e3, with only the d6 pawn to guard it.", 'Nxc6 — trades, c5 is next.'],
  ['…Nxc6: the knight from e7 takes back. Taking with the b-pawn rates far worse for them. Now your bishop on e3 has a clear look at their bishop on c5, and the trade is on.', '…Nxc6 — the knight takes back.'],
  ["Bxc5, the engine's choice: the bishops come off, and only the pawn on d6 can take back. Watch what that does to their pawns.", 'Bxc5 — trades the bishops.'],
  ["…dxc5, and there's the point of the trades: doubled c-pawns, on c7 and c5. Doubled pawns can't guard each other, and with their d-pawn gone to c5, the d-file is wide open. You are a little better.", '…dxc5 — doubled c-pawns, open d-file.'],
  ["f4, the engine's first choice: the pawn grabs space, and the rook on f1 guards it. Now e4 and f4 stand side by side, and e5, kicking the queen off f6, is an idea for later.", 'f4 — space, e5 comes later.'],
  ["…Be6 develops with a hit on your bishop on c4, which has no guard. The engine prefers …Na5, going after the same bishop with the knight. You are a little better.", '…Be6 — hits your loose bishop on c4.'],
  ["Do you trade on e6? No: Bb5, the engine's choice. The bishop steps out of the trade and hits the knight on c6, which only the b7 pawn guards. Here's the idea: if you ever take on c6 and the b-pawn takes back, their c-pawns are tripled.", 'Bb5 — sidesteps, hits the knight on c6.'],
  ['…Rad8 — the rook takes the open d-file, and it lines up on your queen on d1.', '…Rad8 — the d-file, facing your queen.'],
  ["Qe2, the engine's choice: the queen steps off the d-file. From e2 it backs up your e4 pawn and guards the bishop on b5.", 'Qe2 — off the file, guards e4, b5.'],
  ['…Bc8 drops the bishop back home, and the engine prefers …Na5 again. The idea: from c8 the bishop has the diagonal to g4, where it would hit your queen on e2.', '…Bc8 — back home, aiming for g4.'],
  ["Nd2: your last minor piece finally leaves b1, and the engine rates it level with Rf2. From d2 the knight backs up e4, and once that pawn moves on, e4 becomes a square for the knight itself.", 'Nd2 — last piece out, e4 later.'],
  ['…a6 — the pawn hits your bishop on b5. So, take on c6, or keep the bishop?', '…a6 — kicks the bishop on b5.'],
  ["Keep it: Ba4, the engine's choice. The bishop stays on the same diagonal and keeps the knight on c6 in its sights. Dropping back to c4 rates far worse.", 'Ba4 — keeps the bishop, still on c6.'],
  ['…b5 kicks the bishop again, and on a4 it has no guard. Where does it go this time?', '…b5 — kicks the bishop again.'],
  ["Bc2, the engine's choice. Why not Bb3? Then …c4 kicks it a third time. On c2 the bishop is safe, and look where it points: along the diagonal past your e4 pawn, all the way to h7. Once that pawn moves, the diagonal opens.", 'Bc2 — safe, and aimed at h7.'],
  ["…c4 grabs space and takes b3 and d3 away from your pieces. But …Ne7 was the engine's move, and now you are clearly better. Time for the push your f4 pawn was waiting for.", '…c4 — space, but …Ne7 was better.'],
  ["e5 — here's the push f4 was built for, and the engine's first choice. The pawn kicks the queen off f6, with the f4 pawn standing behind it. And remember the bishop on c2? With e4 empty, it now looks straight at h7, in front of their king.", 'e5 — kicks the queen, frees the bishop.'],
  ['…Qh6, and the queen looks at your f4 and h2 pawns. Both are guarded: f4 by the rook on f1, h2 by your king. The engine slightly prefers …Qh4.', '…Qh6 — hits f4 and h2, both guarded.'],
  ["Ne4, the engine's choice. Remember the knight that went to d2? It jumps into e4, the square your pawn just left. From there it eyes f6 and g5, on their king's side, and you are clearly better.", 'Ne4 — onto the square the pawn left.'],
  ['…Kh8 tucks the king into the corner on h8. The engine prefers …Ne7, bringing the knight back toward the kingside. You are clearly better.', '…Kh8 — the king steps into the corner.'],
  ['Ng5 jumps at the king: the knight hits f7 and h7, and h7 now has two attackers, the knight and your bishop on c2. The engine prefers Qf2. You are still clearly better.', 'Ng5 — hits f7 and h7.'],
  ["…g6 shuts your bishop's diagonal at g6. But …Nxe5 was the engine's move: it takes your e5 pawn, and if your queen takes back, …f6 hits the queen and the knight on g5 at once.", "…g6 — blocks the bishop's road to h7."],
  ['Ne4 — the knight goes back, and the engine rates it far below Qe3, with the queen heading for c5. Look at the board: the knight went to g5 and came straight back, so the only thing that changed is their pawn on g6. You are still clearly better.', 'Ne4 — back again, Qe3 was stronger.'],
  ['…Bf5 hits the knight on e4. The knight is guarded twice, by your bishop on c2 and your queen on e2, so nothing hangs. But now the two bishops face each other through your knight. The engine prefers …Qh4.', '…Bf5 — hits e4, the bishops face off.'],
  ["Nf6 — the knight jumps in and hits h7, and nothing of theirs can touch it on f6, with the e5 pawn behind it. And look: with the knight gone from e4, your bishop on c2 and theirs on f5 now face each other directly.", 'Nf6 — the knight lands, hits h7.'],
  ["…Bxc2, the engine's choice: they trade bishops on c2, and the bishop that had been aiming at their king since e5 is gone. Take back with the queen.", '…Bxc2 — trades off your bishop.'],
  ["Qxc2, and the queen takes over the bishop's diagonal: it hits g6. Now your queen and the knight on f6 both point at their king's side, and you are clearly better.", 'Qxc2 — the queen takes the diagonal.'],
  ['…Ne7 brings the knight back to guard g6, the pawn your queen is hitting. The engine prefers …Rd3, taking the rook into your half of the board.', '…Ne7 — guards g6.'],
  ['Rf3 — the rook lifts off the back rank, heading for h3, where it would face their queen on h6. The engine prefers Rad1, taking on the d-file with your other rook first.', 'Rf3 — the rook swings toward h3.'],
  ["…Qg7, the engine's choice: the queen gets off h6 before your rook arrives, and it hits the knight on f6. The knight is guarded by the e5 pawn, so it stands.", '…Qg7 — hits the knight on f6.'],
  ['g4 — the pawns join in. g5 comes next to give the knight on f6 a second guard, and for now g4 keeps their knight on e7 off f5.', 'g4 — g5 next, backing the knight.'],
  ['…Nd5 jumps to the center and hits three things: your knight on f6, and the pawns on c3 and f4. The engine prefers …Qh6. So, do you take on d5?', '…Nd5 — hits f6, c3 and f4.'],
  ["No: Nxd5 lets the rook take back and gives most of your edge away. Instead g5, the engine's choice: the pawn gives the knight on f6 a second guard, and it takes h6 away from their queen.", 'g5 — a second guard for f6.'],
  ["…Nxf6, the engine's choice: they trade off your knight, and you are clearly better. Your plan: take back with the e-pawn, so a pawn lands on f6 hitting their queen on g7, then bring a rook to e1 and on to e7.", '…Nxf6 — take back with the e-pawn.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move no earlier line shares. */
type TabBeats = Array<[string, string]>;

/** Filed in this order: each tab's beats start where the lines before it end. */
const TAB_LINES: Record<string, string[]> = {
  'Scotch: Classical 4...Bc5 (Be3 Qf6 Main Line)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6', 'c3', 'Nge7', 'Bc4', 'O-O', 'O-O', 'd6', 'Nxc6', 'Nxc6', 'Bxc5', 'dxc5', 'f4', 'Be6'],
  'Scotch: Mieses Variation 4...Nf6 (e5 Push)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nxc6', 'bxc6', 'e5', 'Qe7', 'Qe2', 'Nd5', 'c4', 'Ba6', 'b3', 'g6', 'Ba3', 'd6'],
  'Scotch Gambit (4.Bc4)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Bc4', 'Nf6', 'e5', 'd5', 'Bb5', 'Ne4', 'Nxd4', 'Bd7', 'Bxc6', 'bxc6', 'O-O', 'Bc5', 'Be3', 'Bxd4'],
  'Scotch: Schmidt Variation (4...Nf6 5.Nc3 Bb4)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3', 'Bb4', 'Nxc6', 'bxc6', 'Bd3', 'd5', 'exd5', 'cxd5', 'O-O', 'O-O', 'Bg5', 'c6', 'Qf3', 'Be7', 'Rae1', 'Be6'],
  'Scotch: Göring Gambit (4.c3)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'c3', 'dxc3', 'Nxc3', 'Bb4', 'Bc4', 'd6', 'O-O', 'Bxc3', 'bxc3', 'Nf6', 'e5', 'Nxe5', 'Nxe5', 'dxe5', 'Qb3'],
  'Scotch: 4...Qh4 (Steinitz Variation)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Qh4', 'Nb5', 'Bb4+', 'c3', 'Ba5', 'Nd2', 'a6', 'Na3', 'Bb6', 'g3', 'Qf6', 'Qe2', 'd6', 'Ndc4'],
  'Scotch Four Knights (4...Nf6 5.Nc3 Bb4 6.Nxc6 bxc6 7.Bd3 d5)': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3', 'Bb4', 'Nxc6', 'bxc6', 'Bd3', 'd5', 'exd5', 'cxd5', 'O-O', 'O-O', 'Bg5', 'c6', 'Ne2', 'Bd6', 'Ng3', 'h6'],
  "Scotch: Kasparov's Nb3 Line (4...Bc5 5.Nb3)": ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Nb3', 'Bb6', 'Nc3', 'Nf6', 'Qe2', 'd6', 'Be3', 'Bxe3', 'Qxe3', 'O-O', 'O-O-O', 'Be6', 'f3'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The Classical tab is the main line's first 22 moves: every beat is shared.
  'Scotch: Classical 4...Bc5 (Be3 Qf6 Main Line)': [],
  'Scotch: Mieses Variation 4...Nf6 (e5 Push)': [
    ["…Nf6, the masters' most common move here and the engine's choice: the knight develops and hits your e4 pawn, which has no guard. Now the decision is yours. Guard it with Nc3, or trade on c6 first and push e5. Each road has its own tab.", '…Nf6 — hits your loose e4 pawn.'],
    ['Nxc6, eight masters in ten: trade first. The knight takes on c6 and hits their queen on d8, so they have to take back right now. Grabbing e4 instead fails, because Nxd8 would take the queen.', 'Nxc6 — trade first, hits the queen.'],
    ['…bxc6, every master: the b-pawn takes back toward the center. Their c-pawns are doubled now, on c6 and c7, and their a-pawn has no neighbour. Your e4 pawn is still under attack, though.', '…bxc6 — doubled c-pawns, e4 still hit.'],
    ["Here's the Mieses push: e5, eight masters in ten. Instead of guarding e4, the pawn runs past it and kicks the knight off f6. The engine rates Bd3, simply guarding the pawn, just as high. After e5 it's about level.", 'e5 — kicks the knight off f6.'],
    ["…Qe7, nearly every master: the queen hits your e5 pawn and pins it to your king. That pawn can't take on f6 now: stepping off the e-file would leave your king in check. And nothing guards it.", '…Qe7 — pins e5 to your king.'],
    ['Qe2, every master: the queen steps in front of your king. The pin is gone, e5 has a guard, and taking on f6 is a real threat again, so the knight has to move.', 'Qe2 — breaks the pin, guards e5.'],
    ['…Nd5, every master: the knight jumps to the center, and the doubled pawn on c6 guards it. So those doubled pawns have a use after all.', '…Nd5 — central, guarded by c6.'],
    ['c4 hits the knight on d5 right away, and space on the queenside comes with it. It is about level.', 'c4 — kicks the knight on d5.'],
    ['…Ba6 — they leave the knight where it is. The bishop hits your c4 pawn and pins it to your queen on e2: if the pawn takes on d5, the bishop takes your queen. The engine prefers …Nb6, stepping back.', '…Ba6 — pins c4 to your queen.'],
    ["b3, the engine's choice: now a pawn guards c4, so it is safe. And it opens a road for your bishop on c1 to b2 or a3. You are a little better.", 'b3 — guards c4, frees the c1 bishop.'],
    ['…g6 makes room for the bishop on g7, where it would aim at your e5 pawn from the long diagonal. It is about level.', '…g6 — the bishop heads for g7.'],
    ['Ba3 develops with a hit on their queen on e7, and your knight on b1 guards the bishop. The engine slightly prefers Bb2. It is about level.', 'Ba3 — develops, hits the queen on e7.'],
    ["…d6 hits your e5 pawn, but their pawn is pinned: it stands between your bishop on a3 and their queen on e7, so …dxe5 would drop the queen. The engine preferred …Nb4. Your plan: take on d6 with the e-pawn, hitting the queen so the queens come off, and keep an eye on the long diagonal, where a bishop on g7 would hit your rook on a1.", '…d6 — pinned; exd6 hits the queen.'],
  ],
  'Scotch Gambit (4.Bc4)': [
    ["Bc4 — the Scotch Gambit, about one master game in eight. You leave their pawn on d4 for now and develop toward f7 first. You'll take that pawn back later, with the knight. The engine prefers Nxd4 at once, the main line, and it's about level.", 'Bc4 — the gambit, aimed at f7.'],
    ["…Nf6, two masters in three and the engine's choice: the knight develops and hits your e4 pawn, which has no guard.", '…Nf6 — hits the loose e4 pawn.'],
    ["e5, seven masters in ten and the engine's choice: the same idea as the Mieses push. Don't defend e4, push it, and the pawn kicks the knight off f6.", 'e5 — push past, kick the knight.'],
    ['…d5, three masters in four: they hit back. The pawn hits your bishop on c4, which has no guard, and the knight on f6 gets e4 as a square to jump to, with the d5 pawn behind it.', '…d5 — hits the bishop, frees e4.'],
    ['Bb5, every master: the bishop gets out of the pawn\'s reach and pins the knight on c6 to their king.', 'Bb5 — escapes, pins the knight to e8.'],
    ['…Ne4, more than eight masters in ten: the knight jumps out of the e5 pawn\'s reach to a central square, backed by the d5 pawn, and from e4 it hits f2.', '…Ne4 — central knight, hits f2.'],
    ["Nxd4 — now you take the pawn back, and material is level. Look at the knight on c6: your knight on d4 and your bishop on b5 both hit it, it's pinned to their king, and only the b7 pawn guards it. Your e5 pawn is safe for now, since only that pinned knight hits it.", 'Nxd4 — level material, two hits on c6.'],
    ['…Bd7, seven masters in ten: the bishop steps between your bishop and their king, so the knight on c6 is no longer pinned. And now that knight really does hit your e5 pawn, which has no guard.', '…Bd7 — unpins, now e5 is hit.'],
    ['Bxc6, every master: take the knight that was hitting e5. Your bishop now sits on c6, hitting b7, d5 and their bishop on d7, so they take back. You are a little better.', 'Bxc6 — removes the knight hitting e5.'],
    ['…bxc6, and their c-pawns are doubled on c6 and c7, the same picture as in the Mieses. Taking back with the bishop rates the same.', '…bxc6 — doubled c-pawns again.'],
    ["You castle, the engine's choice: your king is safe, while theirs is still on e8. It's about level.", 'O-O — your king is safe first.'],
    ["…Bc5, the engine's choice: the bishop develops with a hit on your knight on d4, which has only your queen to guard it.", '…Bc5 — hits the knight on d4.'],
    ["Be3, the engine's choice: the bishop develops and gives the knight on d4 a second guard. It's about level.", 'Be3 — a second guard for d4.'],
    ["…Bxd4 takes the knight, but it's a mistake: …Qe7 was the engine's move. Take back with the queen: Qxd4 puts it in the center, and you are a little better. Your plan: then f3 and f4, chasing their knight off e4 and taking space on the kingside.", '…Bxd4 — a mistake, Qxd4 takes back.'],
  ],
  'Scotch: Schmidt Variation (4...Nf6 5.Nc3 Bb4)': [
    ["Nc3, the quieter road, about one master in six: the knight guards e4 and develops. It's about level.", 'Nc3 — guards e4, develops.'],
    ['…Bb4, nine masters in ten: the bishop pins your knight on c3 to your king. And that knight is the only guard of e4, so now …Nxe4 is a real threat.', '…Bb4 — pins the guard of e4.'],
    ['Nxc6, every master: before dealing with e4, trade the knight. It takes on c6 and hits their queen on d8 and the bishop on b4, so they have to take back right away.', 'Nxc6 — trade first, with a hit.'],
    ['…bxc6, every master: the b-pawn takes back, and their c-pawns are doubled. Your e4 pawn still needs a guard.', '…bxc6 — doubled pawns, e4 still hit.'],
    ["Bd3, every master: the bishop guards e4, and unlike your knight on c3, it isn't pinned. Your king can castle next.", 'Bd3 — an unpinned guard for e4.'],
    ['…d5, seven masters in ten: the pawn hits e4 a second time and fights for the center. Your answer is to take it.', '…d5 — hits e4 again.'],
    ['exd5, almost every master: you take, and now your pawn on d5 hits c6, which has no guard.', 'exd5 — takes, hits the loose c6.'],
    ['…cxd5, seven masters in ten: they take back, and the pawns are level again. Their pawn on d5 stands in the middle of the board, and your knight on c3 already hits it.', '…cxd5 — level, a pawn on d5.'],
    ["You castle, the engine's choice, and that ends the pin: with your king off e1, the bishop on b4 no longer pins the knight on c3.", 'O-O — castles out of the pin.'],
    ["…O-O — they castle too, the engine's choice, and their king is safe on g8. It's about level.", '…O-O — both kings safe.'],
    ['Bg5, about two masters in three: the bishop pins the knight on f6 to their queen on d8. And that knight is one of the guards of d5.', 'Bg5 — pins the knight on f6.'],
    ['…c6, close to nine masters in ten: a pawn props up d5, so it no longer leans on pieces alone.', '…c6 — a pawn guard for d5.'],
    ["Qf3, the engine's choice: the queen piles onto the pinned knight on f6 and hits d5 as well. Count f6: two attackers, your bishop and queen, against two guards, their queen and the g7 pawn.", 'Qf3 — piles onto f6, hits d5.'],
    ['…Be7 steps in behind the knight on f6, so it is no longer pinned to the queen.', '…Be7 — unpins the knight.'],
    ['Rae1: the rook takes the open e-file and lines up on their bishop on e7.', 'Rae1 — the open e-file, facing e7.'],
    ["…Be6, the engine's choice: their last piece develops and adds a guard to d5. It's about level. Your plan: h3 so your king has air, Bf4 when …h6 asks the bishop, and keep your queen and knight trained on d5.", '…Be6 — guards d5, about level.'],
  ],
  'Scotch: Göring Gambit (4.c3)': [
    ['c3 — the Göring Gambit, about three master games in a hundred. You offer a second pawn: the c3 pawn hits d4, and if they take, your knight comes to c3 and your pieces get out fast. The engine prefers simply Nxd4. It is about level.', 'c3 — the Göring, a pawn offered.'],
    ["…dxc3 — they take, about a third of the masters, and it's the engine's choice. The more common answer is …d5, hitting back in the center. Now their pawn on c3 hits b2, and they're two pawns up for the moment.", '…dxc3 — accepts, now b2 is hit.'],
    ["Nxc3, the engine's choice: take back on c3 and develop at once. More masters play Bc4 here, offering the b-pawn as well. You're a pawn down, but you have two knights out to their one. It's about level.", 'Nxc3 — a pawn down, two knights out.'],
    ['…Bb4, more than half the masters: the bishop pins your knight on c3 to your king. The engine prefers …Bc5.', '…Bb4 — pins the knight on c3.'],
    ["Bc4, nearly every master: the bishop aims at f7, where only their king stands guard. Now you're ready to castle.", 'Bc4 — at f7, ready to castle.'],
    ['…d6, about seven masters in ten: it opens the bishop on c8 and covers e5, so your e-pawn can\'t run forward for free. They are a little better.', '…d6 — frees c8, covers e5.'],
    ['You castle, about six masters in ten, and your king steps out of the pin on c3. The engine prefers Ng5, going straight at f7. They are a little better.', 'O-O — out of the pin.'],
    ["…Bxc3, the engine's choice: they take your knight before it can jump to d5. Now the bishop on c3 hits b2, and that pawn is pinned to your rook on a1.", '…Bxc3 — takes the knight, hits b2.'],
    ["bxc3: the pawn takes back on c3. You're a pawn down, but you have the two bishops, and the b-file is half-open for your rook. It's about level.", 'bxc3 — two bishops for the pawn.'],
    ["…Nf6, the engine's choice: the knight develops and hits your e4 pawn, which has no guard.", '…Nf6 — develops, e4 is hit.'],
    ["e5, the engine's choice: the pawn hits the knight on f6 and the d6 pawn at once. Instead of defending e4, you open more lines while their king is still in the center.", 'e5 — hits the knight and d6.'],
    ["…Nxe5, the engine's choice: the knight from c6 takes the pawn, and now it hits your knight on f3 and your bishop on c4, which has no guard.", '…Nxe5 — hits f3 and the loose c4.'],
    ['Nxe5 takes the knight, and now yours hits f7: two attackers there, the knight and your bishop on c4, and only their king to guard it.', 'Nxe5 — two hits on f7.'],
    ["…dxe5 takes your knight back. You're two pawns down now, but look down the d-file: the queens face each other, and their king is still on e8.", '…dxe5 — two pawns down, queens face off.'],
    ['Qb3 keeps the queens on: it hits b7 and stands behind your bishop on c4, both aimed at f7. The engine prefers Qxd8 check, trading queens, and then Bxf7. After Qb3 they are a little better. Your plan: Ba3 on the diagonal toward f8, keeping their king in the center, and a rook to d1 on the open file.', 'Qb3 — hits b7, lines up on f7.'],
  ],
  'Scotch: 4...Qh4 (Steinitz Variation)': [
    ['…Qh4, the Steinitz, about one master game in a hundred: the queen comes out early and hits e4, which has no guard, along with f2 and h2. The engine rates it well below …Nf6. You are a little better.', '…Qh4 — early queen, hits e4.'],
    ['Nb5, about a third of the masters: ignore e4 and go after c7, which has no guard. If the knight lands on c7, it checks the king and hits the rook on a8 at once. The engine prefers Nc3, simply guarding e4. You are a little better.', 'Nb5 — aims at c7.'],
    ["…Bb4 check, the engine's choice: before dealing with c7, they check your king. The masters split almost evenly between this and …Bc5.", '…Bb4+ — check first.'],
    ["c3 blocks with a pawn that hits the bishop. About six masters in ten play Bd2 instead, and so does the engine: block with a piece that develops. After c3 it's about level.", 'c3 — blocks the check, hits the bishop.'],
    ['…Ba5 keeps the pin on your c3 pawn, and look at the bonus: from a5 the bishop also guards c7, so the knight\'s jump to c7 is off. The engine slightly prefers …Bc5.', '…Ba5 — keeps the pin, guards c7.'],
    ["Nd2, the engine's choice: at last e4 gets a guard, and the knight is one hop from c4.", 'Nd2 — guards e4 at last.'],
    ["…a6, the engine's choice: the pawn kicks the knight off b5.", '…a6 — kicks the knight on b5.'],
    ["Na3, the engine's choice. It looks odd on the rim, but going back to d4 rates far worse. From a3 the knight covers c4, a square your other knight wants.", 'Na3 — the rim, but it covers c4.'],
    ["…Bb6, the engine's choice, and look at f2: the bishop and the queen on h4 both hit it, and only your king guards it. That's a threat of …Qxf2 mate.", '…Bb6 — threatens mate on f2.'],
    ["g3, the engine's choice: the pawn blocks the queen's diagonal to f2 and hits the queen on h4, which has no guard, so it has to move.", 'g3 — kicks the queen off h4.'],
    ["…Qf6, the engine's choice: the queen moves, but it still hits f2, so the mate threat is back. It also hits your c3 pawn.", '…Qf6 — still aims at f2.'],
    ["Qe2, the engine's choice: the queen guards f2, and the mate threat is over. From e2 it also hits the a6 pawn.", 'Qe2 — guards f2, mate threat over.'],
    ["…d6, the engine's choice: the pawn opens the road for the bishop on c8. It's about level.", '…d6 — frees the bishop on c8.'],
    ["Ndc4 — there's the square Na3 was covering. The knight from d2 hits the bishop on b6 and the d6 pawn, and it's about level. Your plan: Be3 to meet their bishop, then Bg2 and castle.", 'Ndc4 — hits b6 and d6.'],
  ],
  'Scotch Four Knights (4...Nf6 5.Nc3 Bb4 6.Nxc6 bxc6 7.Bd3 d5)': [
    ["Ne2 — the knight leaves c3 on its way to g3. But it's slow: Qf3, piling onto the pinned knight on f6, was the engine's move, and the Schmidt tab plays it. After Ne2 it's about level.", 'Ne2 — heading for g3, but slow.'],
    ["…Bd6 swings the bishop toward your king: it hits h2. The engine prefers …h6, asking your bishop on g5 first. It's about level.", '…Bd6 — aims at h2.'],
    ["Ng3 completes the trip, but it's a mistake: Nd4 was the engine's move. Now the knight sits on g3, right in the line of their bishop on d6, and …h6 is coming. They are a little better.", 'Ng3 — a mistake, Nd4 was the move.'],
    ["…h6, the engine's choice: the pawn hits your bishop on g5, which has no guard, and they are clearly better. Your plan: drop the bishop to d2, and if their knight jumps to g4, meet it with Be2 so it can be traded off.", '…h6 — hits the loose bishop on g5.'],
  ],
  "Scotch: Kasparov's Nb3 Line (4...Bc5 5.Nb3)": [
    ["Nb3 — the knight simply steps back, nearly three masters in ten, and it's the engine's first choice. Why leave the center? From b3 the knight hits the bishop on c5, which has no guard, so they have to spend a move on it. It's about level.", 'Nb3 — steps back, hits the bishop.'],
    ['…Bb6, more than eight masters in ten: the bishop keeps its diagonal and still aims at f2.', '…Bb6 — still aimed at f2.'],
    ['Nc3, three masters in four: the knight develops and covers e4 and d5. You are a little better.', 'Nc3 — develops, covers e4 and d5.'],
    ['…Nf6, about half the masters: the knight develops and hits e4, which your knight on c3 guards.', '…Nf6 — hits e4, Nc3 guards it.'],
    ["Qe2, the engine's choice: a second guard for e4, and the queen leaves d1, the first step toward castling long.", 'Qe2 — guards e4, clears d1.'],
    ["…d6 opens their bishop on c8, but …O-O was the engine's move. You are a little better.", '…d6 — frees c8, castling was better.'],
    ["Be3, the engine's first choice: your bishop develops and offers a trade, lining up on their bishop on b6. And with c1 clear, long castling is ready.", 'Be3 — offers the trade, c1 is clear.'],
    ['…Bxe3 — they trade, and their bishop, the one aimed at f2, is gone. Which piece takes back?', '…Bxe3 — the bishops come off.'],
    ["Qxe3, the engine's choice. Taking with the f-pawn rates far worse: it would double your pawns on e3 and e4. The queen lands on e3 and hits a7.", 'Qxe3 — the queen takes, hits a7.'],
    ['…O-O: their king goes to g8. The engine prefers …a6 first. You are a little better.', '…O-O — their king goes short.'],
    ["O-O-O, the engine's choice, and here's the character of this line: kings on opposite sides. Your rook lands on d1 and pins the d6 pawn to their queen on d8. You are clearly better.", 'O-O-O — opposite kings, d6 pinned.'],
    ['…Be6 develops with a hit on your knight on b3, which is guarded twice, by the pawns on a2 and c2. The engine prefers …a5.', '…Be6 — hits b3, which holds.'],
    ["f3, the engine's choice: a third guard for e4, and the pawn covers g4, so your g-pawn can march. Your plan: push g4 and h4 at their king on g8, while your own king sits safely on c1.", 'f3 — e4 safe, g4 and h4 next.'],
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

export const SCOTCH_GAME_WATCH: WatchCourse = {
  openingId: 'scotch-game',
  title: 'The Scotch Game — A Master Class',
  orientation: 'white',
  sources: ['concept:pos-development', 'concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
