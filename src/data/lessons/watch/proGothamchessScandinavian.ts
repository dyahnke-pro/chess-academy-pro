// GothamChess's Scandinavian — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet: masters' percentages,
// engine lines at a fixed depth, the board after each move. The student plays
// Black. Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud
// register (§2a). The last five tabs are lines taught for this opening in the
// repertoire's videos; where each of the others went is recorded in
// docs/levy-lines/decisions/pro-gothamchess-scandinavian.json.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'Bf5', 'Bc4', 'e6', 'Bd2', 'c6', 'Qe2', 'Bb4', 'O-O-O', 'Nbd7', 'Bb3', 'Nd5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["They open with e4, close to half of all master games and the engine's favorite first move. The pawn takes the center and opens lines for their queen and the bishop on f1. So here's your first decision: let that pawn sit on e4, or hit it right away?", 'e4 — they take the center.'],
  ["…d5: hit it right away. This is the Scandinavian, and it's a rare guest at master level; most answer with …c5 or …e5, and the engine prefers those by about half a pawn and gives them a clear edge here. What you get instead is a game on your terms from the first move. The pawn hits e4, nothing guards it, and after the trade your pieces head for squares you'll know by heart: the queen to a5, and the light bishop out before …e6.", '…d5 — the Scandinavian, hits e4.'],
  ["exd5, almost every master: they take, and for a moment you're a pawn down. Now look at their pawn on d5: nothing guards it. So which piece takes it back, the queen right now, or a knight a move later?", 'exd5 — takes; d5 is loose.'],
  ["…Qxd5, seven masters in ten: the queen takes back at once, and material is level. Yes, it breaks the rule about bringing the queen out early, and you're about to see the price. From d5 it hits g2 and a2, but in the middle of the board it's a target, and their next move develops with tempo. The other road, …Nf6 first, has its own tab.", '…Qxd5 — the pawn back, queen out.'],
  ["Nc3, nine masters in ten: the knight develops and hits your queen, which nothing guards. That's the price of …Qxd5: they get a free developing move. So where does the queen go?", 'Nc3 — develops, hits your queen.'],
  ["…Qa5, a little over half the masters. Look at the diagonal from a5: it runs through the knight on c3 and the pawn on d2 to their king on e1. The moment the d-pawn moves, that knight is pinned. …Qd6, close to four masters in ten, is the other main road, and it has its own tab.", '…Qa5 — aimed through c3 at e1.'],
  ["d4, about eight masters in ten: they take the center and open the road for the bishop on c1. But see what it cost: with d2 empty, the knight on c3 is now pinned to their king by your queen on a5.", 'd4 — the center; c3 is pinned.'],
  ["…Nf6, three masters in four: the knight develops and covers e4 and d5, two squares their pieces would love. Now the real question: your light bishop is still on c8. Where should it go before …e6 shuts it in?", '…Nf6 — develops, covers e4.'],
  ["Nf3, seven masters in ten: the knight develops and covers e5. Bc4 and Bd2 are their other ideas, and both come in this line anyway. Now it's your move, and it's the one the whole setup is built around.", 'Nf3 — develops, covers e5.'],
  ["…Bf5. Why now, before …e6? Because …e6 would close the road from c8, and the bishop would be stuck behind its own pawns, the same problem French players fight all game. On f5 it's outside the pawn chain, and it already hits c2. Three masters in ten play it; …c6 first, about four in ten, is the other way, and the engine rates the two the same. …Bg4 has a tab of its own.", '…Bf5 — out before …e6, hits c2.'],
  ["Bc4, about four masters in ten: the bishop develops and aims at f7. The engine prefers Ne5, hopping toward f7 and getting g4 ready to chase your bishop, and after Bc4 they are a little better. For now f7 is safe: only their bishop is on it, and your king guards it.", 'Bc4 — aims at f7; Ne5 was stronger.'],
  ['…e6, three masters in four, and now it costs you nothing, because the bishop is already out on f5. The pawn blocks the bishop on c4 from f7, and it opens the road for your other bishop to b4, where it can add to the pressure on the pinned knight on c3.', '…e6 — free now, opens the f8 bishop.'],
  ['Bd2, eight masters in ten: the bishop steps between your queen and their king, so the knight on c3 is free again, and they can castle long. Now think about your queen: if that knight jumps away, the bishop on d2 is suddenly looking straight at a5.', 'Bd2 — unpins c3, castling long next.'],
  ["…c6, the engine's choice, and almost half the masters. Why spend a move on a pawn? Remember the bishop on d2: the moment the knight on c3 jumps, it looks straight at your queen. With the pawn on c6, a knight landing on b5 or d5 can be taken, and your queen has c7 to step back to. A bit over half the masters play …Bb4 right away, and that has its own tab.", '…c6 — covers b5 and d5, frees c7.'],
  ['Qe2: the queen lines up on the e-file, so your pawn on e6 is pinned to your king, and d1 is cleared for castling long. The engine prefers Ne4, offering to trade off your knight on f6. Notice what they left behind: the pawn on c2 has no guard now, and your bishop on f5 is aimed right at it.', 'Qe2 — pins e6; Ne4 was stronger.'],
  ["…Bb4, the engine's choice: the bishop develops and hits the knight on c3, with your queen right behind it on the same diagonal. Two of your pieces are now aimed down the line toward e1, and their king is still standing there.", '…Bb4 — on c3, queen behind it.'],
  ["They castle long, the engine's choice: the king leaves e1, out of the line your bishop and queen are aimed down, and the rook lands on d1 behind the d4 pawn. Your king is still in the center, and the e6 pawn is still pinned by the queen on e2, so finish developing first.", 'O-O-O — king off the diagonal.'],
  ['…Nbd7: the last minor piece comes out. From d7 the knight can go to b6 or f6, and it watches e5, the square their knight on f3 would like. The engine rates …Nd5 about the same.', '…Nbd7 — the last piece out.'],
  ['Bb3: the bishop steps back before your knight can reach b6 and hit it there. The engine prefers Nh4, going straight after your bishop on f5, the piece aimed at c2. From b3 the bishop looks down at e6, the pawn that is pinned to your king.', 'Bb3 — steps back; Nh4 was stronger.'],
  ["…Nd5: the knight jumps to the center and hits the knight on c3 a second time, along with your bishop on b4. It's about level. Your knight on d5 is guarded by the pawn on c6; the e6 pawn can't help while it's pinned. Your plan for the middlegame: when the knights come off on d5, trade bishops on d2, take back with the c-pawn, and use the half-open c-file against their king on c1.", '…Nd5 — a second hit on c3.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the lines before it don't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Main Line Qa5': ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'Bf5', 'Bc4', 'e6', 'Bd2', 'c6', 'Qe2', 'Bb4', 'O-O-O', 'Nbd7', 'Bb3', 'Nd5'],
  '2...Nf6 Scandinavian': ['e4', 'd5', 'exd5', 'Nf6', 'd4', 'Nxd5', 'c4', 'Nb6', 'Nf3', 'g6', 'Nc3', 'Bg7', 'Be3', 'O-O', 'Be2', 'Nc6', 'O-O', 'e5', 'Nxe5', 'Nxe5'],
  'Portuguese …Bg4': ['e4', 'd5', 'exd5', 'Nf6', 'd4', 'Bg4', 'Be2', 'Bxe2', 'Qxe2', 'Qxd5', 'Nf3', 'Nc6', 'Be3', 'O-O-O', 'c4', 'Qf5', 'Nc3', 'e6', 'a3', 'g5'],
  'vs Nc3 (Nxd5)': ['e4', 'd5', 'exd5', 'Nf6', 'Nc3', 'Nxd5', 'Bc4', 'c6', 'Qf3', 'Nf6', 'Nge2', 'Nbd7', 'd4', 'Nb6', 'Bd3', 'g6', 'O-O', 'Bg4', 'Qg3', 'Bg7'],
  'vs Bb5+': ['e4', 'd5', 'exd5', 'Nf6', 'Bb5+', 'Nbd7', 'Nc3', 'a6', 'Be2', 'b5', 'a3', 'Bb7', 'Nf3', 'g6', 'O-O', 'Bg7', 'Re1', 'O-O', 'd4', 'Nxd5'],
  'Qa5 with …Bg4': ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'Bg4', 'Be2', 'e6', 'O-O', 'Be7', 'Ne5', 'Bxe2', 'Qxe2', 'O-O', 'Bg5', 'h6'],
  'Early …Bb4': ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'Bf5', 'Bc4', 'e6', 'Bd2', 'Bb4', 'a3', 'Bxc3', 'Bxc3', 'Qb6', 'O-O', 'Nc6', 'Re1', 'O-O', 'Nh4', 'Bg6'],
  'Qd6 with …a6': ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qd6', 'd4', 'Nf6', 'Nf3', 'a6', 'g3', 'Bg4', 'Bg2', 'Nc6', 'O-O', 'O-O-O', 'h3', 'Bxf3', 'Qxf3', 'Qxd4'],
  'vs the Advance': ['e4', 'd5', 'e5', 'Bf5', 'd4', 'e6', 'Nf3', 'c5', 'c3', 'Nc6', 'Be2', 'Bg6', 'O-O', 'a6', 'Be3', 'Qb6', 'Qb3', 'Qxb3', 'axb3', 'cxd4'],
  'vs Tennison Gambit': ['e4', 'd5', 'Nf3', 'dxe4', 'Ng5', 'e5', 'd4', 'exd3', 'Bxd3', 'Be7', 'Nf3', 'Nc6', 'Qe2', 'Bg4', 'Be3', 'f5', 'Bb5', 'e4', 'Nbd2', 'exf3'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The main line itself: every move is already said by MAIN_BEATS.
  'Main Line Qa5': [],
  '2...Nf6 Scandinavian': [
    ["…Nf6, about three masters in ten, and the engine's first choice: instead of the queen, the knight. Why not take right away? Because the knight hits the pawn on d5 too, nothing guards it, and taking back with the knight next move keeps your queen out of reach of their pieces.", '…Nf6 — knight first, d5 can wait.'],
    ["d4, about half the masters and the engine's choice: they don't try to hold the pawn, they take the center instead. c4, propping up d5 with another pawn, is the try about one master in eight makes.", 'd4 — the center, not the pawn.'],
    ["…Nxd5, about two masters in three and the engine's choice: the pawn comes back, and material is level. The knight looks great on d5, but a knight in the center is a target for pawns, and one is coming.", '…Nxd5 — level, but a target.'],
    ["c4, about four masters in ten and the engine's choice: the pawn hits your knight on d5 and grabs space. Their idea is a big center with pawns on c4 and d4, and every move you spend on the knight, they spend building.", 'c4 — kicks the knight, takes space.'],
    ['…Nb6, nine masters in ten: the knight steps back and hits the c4 pawn, so that pawn is a target and not just space. The engine prefers …Nf6, back toward the kingside. Either way, the next question is where your bishop on f8 can do the most against their center.', '…Nb6 — hits c4.'],
    ["Nf3, about half the masters and the engine's choice: the knight develops and guards d4. Now look at that pawn: it's the base of their whole center. Which diagonal would hit it from far away?", 'Nf3 — develops, guards d4.'],
    ["…g6, two masters in three and the engine's choice: the bishop goes to g7, on the long diagonal, aimed straight at d4. It's the Grünfeld idea: let them build the big center, then hit it from the side.", '…g6 — the bishop heads for g7.'],
    ['Nc3, about half the masters: the knight develops and covers e4 and d5, the squares your pieces would use. About one in five plays h3 first, taking g4 away from your bishop on c8.', 'Nc3 — develops, covers e4.'],
    ["…Bg7, every master: there's the bishop on the long diagonal, hitting d4. Count it: the bishop hits d4 once, and …Nc6 or …c5 can hit it again.", '…Bg7 — the long diagonal, hits d4.'],
    ['Be3: the bishop guards d4 again. The engine prefers c5, kicking your knight off b6 and grabbing more space. Be3 is solid, but it lets you finish developing in peace.', 'Be3 — guards d4; c5 was stronger.'],
    ['…O-O: castle first, and your king is safe behind the bishop on g7. The engine slightly prefers …Nc6 first, and that is where your next move goes anyway.', '…O-O — king safe behind g7.'],
    ['Be2: the bishop develops so they can castle. The engine prefers h3 first, to keep your bishop on c8 off g4, where it would go after the knight on f3, the piece guarding d4.', 'Be2 — develops; h3 was stronger.'],
    ["…Nc6, the engine's choice: the knight hits d4, and now your bishop on g7 and the knight are both on it. It also covers e5, the square your e-pawn wants next.", '…Nc6 — a second hit on d4.'],
    ["They castle, and it's about level now. The engine prefers h3, and here's the point: with g4 still open, your bishop on c8 can come to g4 and go after the knight on f3. Castling leaves that door open.", 'O-O — about level; h3 was stronger.'],
    ['…e5: the break, hitting d4 with a pawn. It looks natural, but the engine prefers …Bg4 first, going after the knight on f3 that guards d4, and rates …e5 here about half a pawn worse. They are a little better.', '…e5 — the break; …Bg4 first was better.'],
    ["Nxe5, the engine's choice: the knight grabs the pawn and hits your knight on c6, along with the pawns on f7 and g6. Don't worry, there's a recapture.", 'Nxe5 — takes, hits c6.'],
    ["…Nxe5, the engine's choice: take back, and the knight hits the pawn on c4. They are a little better. When they take on e5 with the d-pawn, the queens come off on d1 and your bishop on g7 wins the e5 pawn back. Your plan for the middlegame: trade queens on d1, take e5 with the bishop, and bring your rooks to the open d-file.", '…Nxe5 — back, hits c4.'],
  ],
  'Portuguese …Bg4': [
    ['…Bg4, the Portuguese, about three masters in ten: instead of taking the pawn back, the bishop hits the queen on d1. Why now? The pawn on d5 can wait a move, and you would rather develop with a threat. The engine prefers simply taking back with …Nxd5.', '…Bg4 — the Portuguese, hits the queen.'],
    ['Be2, a quarter of the masters: block, and offer to trade bishops. For now the bishop on e2 is pinned to their queen on d1. The engine prefers f3, kicking your bishop at once, the sharp road a third of the masters take.', 'Be2 — blocks, offers the trade.'],
    ['…Bxe2, every master: trade off the light-squared bishops. Your bishop on e2 hits the queen on d1, so they have to take back.', '…Bxe2 — trade; they must take back.'],
    ['Qxe2, about eight masters in ten: the queen takes back and lands on the e-file, pinning your e7 pawn to your king. But look at d5: their pawn is still there, and nothing guards it.', 'Qxe2 — pins e7; d5 is loose.'],
    ['…Qxd5, every master: the pawn comes back, and now your queen hits d4 and g2, and nothing guards either one. So their next move has two jobs.', '…Qxd5 — hits d4 and g2.'],
    ["Nf3, every master: one move does both. The knight guards d4 and blocks your queen's diagonal to g2.", 'Nf3 — guards d4, blocks g2.'],
    ['…Nc6: the knight develops and hits d4 a second time, together with your queen. The engine prefers …e6 first, opening the road for the bishop on f8. But …Nc6 tells you where your king is going: the long way, to c8.', '…Nc6 — a second hit on d4.'],
    ['Be3: the bishop develops and guards d4. The engine prefers c4 first, hitting your queen and grabbing space.', 'Be3 — guards d4; c4 was stronger.'],
    ["…O-O-O, the engine's choice, and it's about level: your king goes to c8 and your rook lands on d8, right behind your queen on d5. The knight on c6, the queen and the rook behind it all bear down on d4.", '…O-O-O — the rook joins on d8.'],
    ["c4, the engine's choice: the pawn hits your queen and grabs space. So the queen has to move again. Where is it most useful?", 'c4 — kicks your queen.'],
    ["…Qf5, the engine's choice: the queen steps aside and hits both their knights, the one on f3 and the one still at home on b1.", '…Qf5 — hits both knights.'],
    ["Nc3: the knight on b1 develops, out of your queen's reach. Their king is still on e1, while yours is already castled.", "Nc3 — develops; their king's still on e1."],
    ['…e6: solid, and your bishop on f8 can finally come out. But the engine prefers …e5, hitting d4 at once while their king is still in the center, and rates …e6 about half a pawn worse. They are a little better.', '…e6 — solid; …e5 was stronger.'],
    ["a3: the pawn takes b4 away from your bishop and your knight. The engine prefers Rd1, another guard for d4 first. It's about level.", 'a3 — takes b4 away.'],
    ["…g5, the engine's choice, and it's about level: the pawn heads up the kingside, toward the knight on f3, the piece that guards d4. Your plan for the middlegame: …g4 to kick that knight, the rook to g8 behind the pawn, and the knight from f6 to e4.", '…g5 — the pawn goes after f3.'],
  ],
  'vs Nc3 (Nxd5)': [
    ["Nc3, only about four masters in a hundred: the knight develops and guards d5. But you hit that pawn twice, with the knight on f6 and the queen down the d-file, so it still falls. The engine prefers d4, and after Nc3 it's about level.", 'Nc3 — guards d5, but not enough.'],
    ["…Nxd5, nearly every master and the engine's choice: the pawn comes back, and your knight hits the one on c3. If they take, your queen takes back on d5.", '…Nxd5 — pawn back, hits c3.'],
    ["Bc4, about seven masters in ten and the engine's choice: the bishop hits your knight on d5 a second time. Count it: two attackers, the knight on c3 and the bishop, against one guard, your queen. So the knight needs help or a new square.", 'Bc4 — a second hit on d5.'],
    ["…c6, about one master in four: the pawn guards the knight on d5, so now it's held twice, by the pawn and the queen. The most common choice, about half the masters, is …Nb6, stepping back and hitting the bishop on c4 instead.", '…c6 — d5 guarded twice.'],
    ['Qf3: the queen joins in, hitting your knight on d5 a third time, and the f7 pawn up the f-file. Three attackers, two guards. What now: add a third guard, or move the knight?', 'Qf3 — a third hit on d5.'],
    ["…Nf6: the knight goes back home, out of the triple attack, and it blocks the queen's line to f7. Adding a third guard with …e6 was the other way.", '…Nf6 — back home, blocks f7.'],
    ["Nge2: the knight develops to e2, so it doesn't stand in front of the queen on f3. The engine prefers h3, and that's a hint about your next moves: it takes g4 away from your bishop on c8, where it would hit the queen.", 'Nge2 — develops; h3 was stronger.'],
    ['…Nbd7: the last knight comes out, on its way to b6, where it can hit the bishop on c4. The engine slightly prefers …Bg4 right away, going after the queen.', '…Nbd7 — on the way to b6.'],
    ["d4, the engine's choice: the pawn takes the center and opens the road for the bishop on c1. They are a little better.", 'd4 — center, frees c1.'],
    ["…Nb6, the engine's choice: there it is, the knight hits the bishop on c4, and nothing guards it. That's the theme of this line: you develop, and their pieces keep having to move.", '…Nb6 — hits the loose bishop.'],
    ["Bd3: the bishop steps out of reach and aims at h7 instead. Bb3, keeping it on the diagonal toward f7, is the engine's slight favorite.", 'Bd3 — out of reach, aims at h7.'],
    ['…g6: the pawn blocks the bishop\'s line to h7 and makes room for your bishop on g7, where your king can castle behind it.', '…g6 — blocks h7, bishop to g7.'],
    ["They castle, the engine's choice. Now look at their queen on f3: g4 is still open, and your bishop on c8 is one move from hitting it there.", 'O-O — king safe; g4 is open.'],
    ["…Bg4, the engine's choice: the bishop hits the queen on f3, exactly what h3 would have stopped. The queen has to move again.", '…Bg4 — hits the queen.'],
    ["Qg3, the engine's choice: the queen steps away and now hits your bishop on g4 from the side. The knight on f6 guards it, so there's no rush.", 'Qg3 — out of the way, hits g4.'],
    ["…Bg7, the engine's choice: the bishop takes the long diagonal, and your king is ready to castle. It's about level. Your plan for the middlegame: castle, trade your bishop on g4 for their knight on e2, and bring a knight back to d5, the square in front of their d4 pawn.", '…Bg7 — ready to castle.'],
  ],
  'vs Bb5+': [
    ['Bb5 check, about one master in seven: the bishop checks your king, hoping to win time before you take back on d5. The engine prefers d4.', 'Bb5+ — a check to win time.'],
    ["…Nbd7, about one master in six and the engine's choice; most block with …Bd7. The knight on d7 is pinned to your king for now, but it's well guarded, and …a6 will soon ask the bishop to leave.", '…Nbd7 — block with the knight.'],
    ['Nc3: the knight guards d5, so for now the pawn is safe. The engine prefers Nf3, and the masters most often play c4, holding the pawn with another pawn.', 'Nc3 — guards d5; Nf3 was stronger.'],
    ["…a6, about eight masters in ten and the engine's choice: the pawn hits the bishop on b5. If it takes on d7, you take back and the pin is over. If it retreats, the pin is over anyway.", '…a6 — hits the bishop.'],
    ["Be2, the engine's choice: the bishop steps back, and your knight on d7 is free. From e2 it looks down at a6, the pawn you just pushed.", 'Be2 — retreats; d7 is free.'],
    ["…b5, the engine's choice: the pawn blocks the bishop's road to a6 and grabs space on the queenside. It also clears b7 for your bishop, where it will hit the d5 pawn down the long diagonal.", '…b5 — space, and b7 for the bishop.'],
    ["a3: the pawn stops …b4, which would kick the knight off c3, the only guard of d5. The engine prefers d4 at once. It's about level.", 'a3 — stops …b4.'],
    ["…Bb7, the engine's choice: the bishop takes the long diagonal and hits d5, the pawn you'll take back soon. With the knight on f6 also on it, d5 is under fire twice.", '…Bb7 — long diagonal, hits d5.'],
    ["Nf3, the engine's choice: they don't add a guard to d5, they finish developing. It's about level, and you can take your time too.", 'Nf3 — they develop and wait.'],
    ["…g6, the engine's choice: no rush to take on d5. The bishop goes to g7, the king castles, and the pawn will still be there.", '…g6 — develop first, d5 can wait.'],
    ["They castle, the engine's choice, and their rook on f1 can come to the e-file next.", 'O-O — king safe.'],
    ["…Bg7, the engine's choice: both your bishops now sit on long diagonals, b7 and g7. Next comes your king.", '…Bg7 — both bishops on long diagonals.'],
    ['Re1: the rook comes to the e-file, with your king still on e8. Time to get it out of there.', 'Re1 — the rook takes the e-file.'],
    ["…O-O, the engine's choice: your king is safe on g8, and every piece is out. Now back to d5, the pawn that has been in front of your bishop on b7 the whole time.", '…O-O — king safe; d5 is next.'],
    ["d4, the engine's choice: the pawn takes the center and frees the bishop on c1. But it doesn't guard d5: that pawn still has only the knight on c3.", 'd4 — center, but d5 is still weak.'],
    ["…Nxd5, the engine's choice: the pawn comes back at last, material is level, and your knight hits the one on c3. It's about level. Your plan for the middlegame: trade knights on d5 and take back with the bishop, then …e5 to hit d4, with both bishops on their long diagonals.", '…Nxd5 — pawn back, level.'],
  ],
  'Qa5 with …Bg4': [
    ['…Bg4, about one master in five: the bishop still gets out before …e6, but this time it pins the knight on f3 to their queen on d1. Look at both their knights now: c3 pinned to the king by your queen, f3 pinned to the queen by your bishop. Next come …e6, …Be7 and a short castle.', '…Bg4 — pins f3 to the queen.'],
    ["Be2, only about one master in twenty: the bishop breaks the pin on f3. Nine masters in ten play h3 instead, and the engine likes it better by a full pawn: it asks your bishop right away whether it takes on f3 or runs. As played, it's about level.", 'Be2 — breaks the pin; h3 was stronger.'],
    ["…e6, about one master in five: now the pawn can come, because the bishop is already out on g4. It opens the road for your bishop on f8, and your king can castle short. Six masters in ten prefer …Nc6 here, getting ready to castle long instead.", "…e6 — the bishop's out, so e6 is free."],
    ['They castle: the king leaves e1, so the knight on c3 is no longer pinned. h3, asking your bishop the question first, was just as good.', 'O-O — c3 is no longer pinned.'],
    ['…Be7: modest, but it clears f8, so your king can castle next move.', '…Be7 — castling is next.'],
    ['Ne5: the knight jumps forward and hits your bishop on g4. The engine prefers h3. And see what the jump opened: with f3 empty, your bishop on g4 now pins their bishop on e2 to the queen on d1.', 'Ne5 — hits g4; h3 was stronger.'],
    ["…Bxe2, the engine's choice: trade the bishops before yours gets chased. It lands on e2 hitting the queen and the rook on f1, so they have to take back right away.", '…Bxe2 — trade the bishops.'],
    ["Qxe2, the engine's choice: the queen takes back, and the light-squared bishops are gone. One job left for you: your king is still on e8.", 'Qxe2 — the bishops are off.'],
    ["…O-O, and it's about level: your king is safe on g8, and every piece of yours is out except the knight on b8.", '…O-O — king safe, about level.'],
    ["Bg5, the engine's choice: the bishop hits your knight on f6, the piece that guards your king's h7 pawn.", 'Bg5 — hits the knight on f6.'],
    ["…h6: the pawn asks the bishop on g5 a question, and nothing guards it there. It's about level. Your plan for the middlegame: if the bishop drops back to h4, jump to d5 and trade it off, put a rook on d8 against d4, and bring the last knight to c6 to challenge the one on e5.", '…h6 — asks the bishop to decide.'],
  ],
  'Early …Bb4': [
    ['…Bb4, a bit over half the masters, just ahead of …c6: skip the pawn move and go straight at the knight on c3. Your bishop and your queen are lined up on it, and their bishop on d2 and pawn on b2 guard it. You save a move, and you are ready to take on c3 whenever it helps.', '…Bb4 — straight at c3, no …c6.'],
    ["a3, the engine's choice: the pawn hits your bishop and asks the question right away. Retreat, or take on c3?", 'a3 — asks the bishop.'],
    ["…Bxc3, the engine's choice: take, and look at the pins. Your bishop on c3 pins their bishop on d2 to their king, and their bishop on d2 pins yours to your queen on a5. Retreating costs more than a pawn: after …Be7, Nd5 uncovers their bishop on d2 against your queen.", '…Bxc3 — take; retreating costs material.'],
    ["Bxc3, the engine's choice: the bishop takes back and hits your queen on a5. But it can't take: it's pinned to their own king on e1 by that very queen. So you have a free move to step aside.", "Bxc3 — hits your queen, but it's pinned."],
    ["…Qb6, the engine's choice: the queen steps off the bishop's diagonal and hits two pawns, b2 and d4. Both are guarded for now, but their pieces are tied to them.", '…Qb6 — hits b2 and d4.'],
    ["They castle. The engine prefers d5 at once, opening the center while your king is still on e8, and after castling it's about level. Their king is safe on g1. Where does yours belong?", 'O-O — king safe; d5 was stronger.'],
    ["…Nc6, the engine's choice: the knight hits d4, with your queen already on it, so d4 is under fire twice. And you still haven't castled, which keeps both sides open for your king.", '…Nc6 — a second hit on d4.'],
    ["Re1: the rook lands on the e-file and pins your e6 pawn to your king. And a pinned pawn can't take anything that lands on d5, so it's time to stop waiting.", 'Re1 — pins e6 to your king.'],
    ["…O-O, the engine's choice: castle short, and the pin on e6 is gone. It's about level.", '…O-O — the pin is gone.'],
    ["Nh4: the knight goes after your bishop on f5. The engine prefers b4, grabbing space on the queenside. It's about level.", 'Nh4 — after the bishop on f5.'],
    ["…Bg6, the engine's choice: the bishop steps back, still aimed at c2, and if the knight takes it, your h-pawn takes back toward the center. It's about level. Your plan for the middlegame: a rook to d8 to add to the pressure on d4, and …Ne4 or …Nd5 to go after the bishop on c3.", '…Bg6 — still aimed at c2.'],
  ],
  'Qd6 with …a6': [
    ["…Qd6, close to four masters in ten, and the engine's first choice: the queen steps back to d6, closer to home, where it hits h2 and stays on the d-file. The catch: a knight on b5 or e4 would hit it there, and the knight on c3 can reach both. That's what your next moves take care of.", "…Qd6 — the queen's other home."],
    ['d4, nine masters in ten: the center, and the bishop on c1 can come out. Remember the diagonal to f4: a bishop there would hit your queen on d6.', 'd4 — center; watch f4.'],
    ['…Nf6, nearly nine masters in ten: develop, and the knight covers e4, one of the two squares a knight could use to hit your queen.', '…Nf6 — covers e4.'],
    ['Nf3, three masters in four: the knight develops and guards d4. Now only b5 is left, and a knight there would hit your queen on d6 and the pawn on c7 at once.', 'Nf3 — develops; watch b5.'],
    ["…a6, about four masters in ten, and here's the point: the pawn takes b5 away, so the knight on c3 can never jump there to hit your queen and c7 at once. …c6 does the same job just as often. The engine prefers …g6, developing first.", '…a6 — no knight on b5.'],
    ["g3, about half the masters and the engine's choice: their bishop is heading for g2, the long diagonal toward b7 and your queenside, which is exactly where your king is going.", 'g3 — the bishop heads for g2.'],
    ['…Bg4, seven masters in ten: the bishop pins the knight on f3 to their queen on d1, and that knight is a guard of d4. The engine prefers …Bf5. The plan behind …Bg4 is pressure on d4: pin the guard, then pile on.', '…Bg4 — pins the guard of d4.'],
    ['Bg2, about two masters in three: the bishop takes the long diagonal. h3, about a third of the masters, asks your bishop on g4 the question first.', 'Bg2 — on the long diagonal.'],
    ["…Nc6, eight masters in ten and the engine's choice: the knight hits d4, and so does your queen. Two hits on d4, and one of its guards, the knight on f3, still pinned.", '…Nc6 — a second hit on d4.'],
    ['They castle short, and now it is your king\'s turn. Which side? Look at the d-file: your queen is already on it.', 'O-O — their king is safe.'],
    ["…O-O-O, the engine's choice: castle long, and your rook lands on d8, behind your queen on the d-file. Count the pieces on d4 now: the knight on c6, the queen on d6, and the rook behind it.", '…O-O-O — the rook joins on d8.'],
    ["h3, the engine's choice: the pawn hits your bishop on g4. Retreat, or take?", 'h3 — asks the bishop.'],
    ["…Bxf3, the engine's choice: take the knight, the guard of d4. And your bishop on f3 hits the queen on d1, so they have to take back right now.", '…Bxf3 — removes a guard of d4.'],
    ["Qxf3, the engine's choice: the queen takes back and hits both your knights, on c6 and on f6. But look at d4: with the knight gone, nothing guards it.", 'Qxf3 — but d4 is loose.'],
    ['…Qxd4: the pawn is yours, and your queen hits the knight on c3 and pins f2 to their king. They are a little better even so. Your plan for the middlegame: when their rook comes to d1, trade rooks on d8 or step the queen off the d-file, and hold on to the extra pawn.', '…Qxd4 — the d4 pawn falls.'],
  ],
  'vs the Advance': [
    ["e5: instead of taking on d5, they push past it. Almost no master plays this; taking is the engine's choice by more than half a pawn. Now it's a French or Caro-Kann kind of structure, with one big difference: your bishop on c8 isn't locked in yet. It's about level.", 'e5 — they push past d5.'],
    ['…Bf5, about one master in eight; most strike at once with …c5, and the engine rates the two about the same. Same rule as in your main line: the bishop gets out before …e6, and on f5 it already hits c2.', '…Bf5 — out before …e6, hits c2.'],
    ['d4, half the masters: the pawn props up e5 and takes the center. This is the Advance structure, and the pawn on e5 takes f6 away from your knight.', 'd4 — props up e5.'],
    ["…e6: now you can close the diagonal, because the bishop is already outside on f5. It's a French Advance without the French's usual headache: your light bishop is free.", '…e6 — the chain, bishop already out.'],
    ["Nf3, the engine's choice: the knight develops and guards d4, the pawn that holds up e5.", 'Nf3 — guards d4.'],
    ["…c5, the engine's choice: hit the chain at its base. The pawn hits d4, and if that pawn ever falls, e5 has no support. That's the French plan, and it works the same here.", '…c5 — hits the base, d4.'],
    ["c3, the engine's choice: a second guard on d4, so if you take there, a pawn takes back and the chain holds.", 'c3 — d4 guarded again.'],
    ["…Nc6, the engine's choice: the knight hits d4 and e5, the two pawns of their chain.", '…Nc6 — hits d4 and e5.'],
    ["Be2, the engine's choice: the bishop develops quietly so they can castle. On d3 it would have walked into a trade with your bishop on f5.", 'Be2 — develops, dodges the trade.'],
    ['…Bg6: the bishop steps back to g6, out of reach of a pawn on g4, and it still looks all the way down the diagonal to b1.', '…Bg6 — safe from g4.'],
    ["They castle, the engine's choice. Nothing is open in the center yet, so your king can wait a move while you deal with the queenside.", 'O-O — king safe.'],
    ['…a6: the pawn takes b5 away, so no bishop can come there to pin your knight on c6. The engine prefers …Nh6, bringing the last knight out toward f5.', '…a6 — no bishop on b5.'],
    ["Be3, the engine's choice: the bishop guards d4. But see what it left: on c1 it guarded b2, and now b2 has no guard at all.", 'Be3 — guards d4, leaves b2.'],
    ["…Qb6, the engine's choice: the queen hits b2, which nothing guards now, and stands behind your c5 pawn on the diagonal to d4. In the French Advance this is the standard way to pile on d4 and b2.", '…Qb6 — hits the loose b2.'],
    ["Qb3, the engine's choice: the queen guards b2 and hits yours on b6, which nothing guards. So you have to act now: take on b3, or step away?", 'Qb3 — offers the trade, hits b6.'],
    ["…Qxb3, the engine's choice: take, and the queens come off. They take back with the a-pawn, which opens the a-file for their rook.", '…Qxb3 — the queens come off.'],
    ["axb3, the engine's choice: the pawn takes back, and their rook on a1 now looks up the open a-file at your a6 pawn.", 'axb3 — the a-file opens.'],
    ["…cxd4, the engine's choice: the pawn takes on d4 and hits the bishop on e3. It's about level. Your plan for the middlegame: when they take back on d4, trade pieces there, put your bishop on c5 and your king on e7, and keep the bishop on g6 aimed at their queenside.", '…cxd4 — hits the bishop on e3.'],
  ],
  'vs Tennison Gambit': [
    ["Nf3: they leave the e4 pawn hanging. This is the Tennison Gambit, and it's a trick more than a sound gambit: the engine prefers taking on d5 by a pawn and a half, and after Nf3 you are clearly better.", 'Nf3 — the Tennison Gambit; e4 is loose.'],
    ["…dxe4, about half the masters and the engine's choice: take the pawn, and it hits the knight on f3 at once. Don't be scared of a gambit just because it's a gambit: here the pawn is free.", '…dxe4 — take it, hit the knight.'],
    ['Ng5, every master: the knight jumps forward and hits three pawns, e4, f7 and h7. The one in danger is e4, which nothing guards. So: defend the pawn, or do something better?', 'Ng5 — hits e4, f7 and h7.'],
    ["…e5, the engine's choice and four masters in ten: don't cling to e4, take the center instead. And look, the queen on d8 now sees all the way to g5, so their knight is the loose one.", '…e5 — the queen now sees g5.'],
    ["d4, the engine's choice, though the few masters here took on e4: the pawn hits e5 and opens the diagonal from c1, so their bishop now guards g5. Both your center pawns are loose.", 'd4 — hits e5, guards g5.'],
    ['…exd3, taking en passant: your e4 pawn captures the d-pawn as it passes, lands on d3, and hits c2. The engine prefers …h6, kicking the knight on g5 first.', '…exd3 — en passant, hits c2.'],
    ["Bxd3, the engine's choice: the bishop takes back and points at h7, with the knight on g5 already aimed there too. That's their whole idea: pieces at your kingside before you've castled.", 'Bxd3 — bishop and knight on h7.'],
    ['…Be7: the bishop hits the knight on g5, so it has to decide where to go. The engine prefers …Nc6, developing first and guarding e5.', '…Be7 — hits the knight on g5.'],
    ["Nf3, the engine's choice: the knight steps back and hits your e5 pawn, which nothing guards.", 'Nf3 — back, hits e5.'],
    ["…Nc6, the engine's choice: the knight guards e5, and you're a pawn up with your pieces coming out. You are clearly better.", '…Nc6 — guards e5, a pawn up.'],
    ["Qe2, the engine's choice: the queen adds a second hit on e5 and lines up on the e-file toward your king on e8.", 'Qe2 — a second hit on e5.'],
    ["…Bg4, the engine's choice: the bishop pins the knight on f3 to their queen on e2, and that knight is one of the two pieces hitting e5. It can't take there without losing the queen behind it.", '…Bg4 — pins the knight to the queen.'],
    ['Be3: the bishop develops and hits a7. The engine prefers Bb5, pinning your knight on c6 in return. You are clearly better.', 'Be3 — develops; Bb5 was stronger.'],
    ['…f5: the pawn guards e4, the square your e-pawn wants next, and it backs up your bishop on g4. When the e-pawn gets to e4, it will hit the pinned knight on f3.', '…f5 — getting …e4 ready.'],
    ['Bb5: the bishop pins your knight on c6 to your king. But it is too slow: the engine prefers h3, kicking your bishop, and after Bb5 you are winning. Why? Their knight on f3 is still pinned, and your e-pawn is one step from hitting it.', 'Bb5 — too slow; h3 was needed.'],
    ["…e4, the engine's choice: there it is, the pawn hits the knight on f3, and the knight can't run, because your bishop on g4 would take the queen on e2. A pinned piece attacked by a pawn is usually lost.", '…e4 — hits the pinned knight.'],
    ["Nbd2, the engine's choice: the other knight guards f3 and hits your e4 pawn. It doesn't help: you just take.", 'Nbd2 — guards f3, too late.'],
    ["…exf3, the engine's choice: the pawn takes the knight and now hits the queen on e2. You are winning. Your plan for the middlegame: after they take on c6 and on f3, drop the bishop back to h5, get your king safe, and use the extra piece.", '…exf3 — wins the knight.'],
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

export const PRO_GOTHAMCHESS_SCANDINAVIAN_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-scandinavian',
  title: "This repertoire's Scandinavian — Qa5 and Effortless Development",
  orientation: 'black',
  sources: [
    'book:scandinavian-defence',
    'concept:pos-development',
    'https://www.chess.com/openings/Scandinavian-Defense',
    'https://en.wikipedia.org/wiki/Scandinavian_Defense',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
