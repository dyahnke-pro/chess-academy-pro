// The Queen's Gambit — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet
// (`LESSON_FACTS=1 LESSON_IDS=queens-gambit`): masters' percentages, the
// settled engine verdict per move (depth 16), the board after each move, and
// every fact the teaching computers found. Standard:
// docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register (§2a). The
// student plays White. One story runs through every line: c4 puts a question
// to d5 — hold it or give it up — and each answer leaves something behind.
// When they hold with …e6, the bishop on c8 is shut in behind its own pawns;
// when they take, the centre is yours; when they play …c6, the bishop gets
// out but b4 and the e4 break become the fight. Your tools repeat: pressure
// on d5, a rook on the c-file, and one pawn break per line (b5 in the
// Exchange, d5 in the Accepted and the Semi-Slav, e4 against the Slav).
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6', 'Bd3', 'dxc4', 'Bxc4', 'Nd5', 'Bxe7', 'Qxe7', 'O-O', 'Nxc3', 'Rxc3'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["Every Queen's Gambit starts with d4, a bit over a third of master games. The pawn takes its share of the center and opens the diagonal for your bishop on c1. Now watch the pawn next door, on c2.", 'd4 — the center, c1 bishop freed.'],
  ["…d5 — they meet you head-on, about a quarter of the masters; …Nf6 is the more common reply. Their pawn stops yours from coming to e4 for free. It's the pawn this whole opening is about.", '…d5 — the pawn everything turns on.'],
  ["Here's the Queen's Gambit: c4, about three masters in four, and the engine's first choice. Your pawn hits d5 from the side, and nothing of yours guards it. So can they just take it? They can, but then their pawn has left d5, the center is yours, and the pawn they grabbed is very hard to keep. It isn't really a sacrifice. It's a question put to d5: hold your ground, or give it up?", 'c4 — the gambit: a question for d5.'],
  ["…e6 — the Queen's Gambit Declined, about a third of the masters; …c6, the Slav, is played even more. The pawn backs up d5, so if you take there, a pawn takes back. But look at the price: it stands right in the path of their own bishop on c8. Remember that bishop.", '…e6 — holds d5, shuts in c8.'],
  ["Nc3 — about six masters in ten. The knight puts a second attacker on d5 and backs up e4, the push you'd love to get in. Why c3 and not d2? On d2 it would block your bishop on c1.", 'Nc3 — a second attacker on d5.'],
  ["…Nf6 — the knight adds a guard to d5 and covers e4, so your e-pawn can't go there. Count d5 now: two attackers, three guards. So how do you add pressure?", '…Nf6 — guards d5, covers e4.'],
  ["You go after the guard: Bg5, the engine's first choice. The bishop pins the knight on f6 to their queen on d8, and a guard that can't move isn't much of a guard. More than half the masters trade pawns on d5 here instead; that's the Exchange tab.", 'Bg5 — pins the knight on f6.'],
  ["…Be7, two masters in three. The bishop steps between your bishop and their queen, so the knight on f6 is free again, and castling is next. Why so modest a square? On d6 your c-pawn could push to c5 and kick it.", '…Be7 — breaks the pin, castles next.'],
  ["e3 — three masters in four. It props up d4 and opens the diagonal from f1, and look what that does for your pawn on c4: after standing loose all this time, it finally has a guard. You never spent a move defending it. You developed, and the defence came with it.", 'e3 — guards d4, covers c4.'],
  ["…O-O — a bit over half the masters; their king is safe on g8. Three in ten play …h6 first, asking your bishop on g5 what it intends to do. Hold on to that idea: the Tartakower tab starts with it.", '…O-O — king safe on g8.'],
  ["Nf3 — three masters in four. The knight covers e5. Why does that square matter? They have two pawn breaks to free their game, …c5 and …e5, and your knight is already watching the second.", 'Nf3 — develops, holds back …e5.'],
  ["…Nbd7 — a third of the masters. Why on d7 and not on c6, the natural square? On c6 the knight would block their c-pawn, and that pawn still has work to do. The cost: one more piece stands in front of the bishop on c8.", '…Nbd7 — keeps the c-pawn free.'],
  ["Rc1 — half the masters, and the engine's first choice. Why put a rook on a closed file? Because it won't stay closed: sooner or later a pawn trade on c4 or d5 takes your c-pawn off it, and your rook is already there.", 'Rc1 — waiting for the c-file.'],
  ["…c6, close to half the masters. Now look at their pawns: c6, d5, e6, every one on a light square, and their bishop on c8 is the light-squared one. A bishop hemmed in by its own pawns has a name: a bad bishop.", '…c6 — solid, but c8 is hemmed in.'],
  ["Bd3 — three masters in four. The bishop points at h7, next to their king, and backs up e4. Here's the catch: it has now moved once, so if they take on c4, it needs a second move to take back. That's what they've been waiting for.", 'Bd3 — aims at h7, backs e4.'],
  ["…dxc4 — seven masters in ten, the moment your bishop has left f1. The pawn hits the bishop on d3, so you'll recapture: two bishop moves to reach c4 instead of one. What did they pay for that? Their pawn is gone from d5.", '…dxc4 — gives up d5 for time.'],
  ["Bxc4 — every master, and material is level. Look at the c-file: your c-pawn is gone, so the file is half-open, and your rook has been waiting on c1 for exactly this.", 'Bxc4 — level; the c-file is half-open.'],
  ["…Nd5 — more than eight masters in ten. They're short of room, so what do they want? Trades. The knight offers two at once: knight for knight on c3, and bishop for bishop, because it has uncovered their bishop on e7 to yours on g5.", '…Nd5 — offers two trades at once.'],
  ["Bxe7 — nearly every master. One thing to like about this trade: the bishop you remove is their good one, on the dark squares. The one they keep is the bishop on c8, still behind its own pawns.", 'Bxe7 — trades off their good bishop.'],
  ["…Qxe7 — every master. Could their knight take on c3 first, with a hit on your queen? No: your bishop takes the queen on d8, their knight takes yours on d1, and then the bishop slips back to e7 and hits the rook on f8. That leaves them about two pawns worse off. So the queen recaptures, and stands behind …c5 and …e5.", '…Qxe7 — backs …c5 and …e5.'],
  ["You castle — about six masters in ten; most of the rest play Ne4, sidestepping the knight trade. You don't mind the trade on c3. Look at which of your pieces would take back.", 'O-O — king safe; let them trade.'],
  ["…Nxc3, nearly nine masters in ten: the second trade they wanted. The knight lands with a hit on your queen on d1, but two of your pieces cover that square, the pawn on b2 and the rook on c1. Which one takes back?", '…Nxc3 — the second trade.'],
  ["The rook: Rxc3, nineteen masters in twenty. The pawn would close the file your rook has been waiting on. Now the rook stands on the half-open c-file, and once the bishop steps off c4 it looks straight at c6. You are a little better. Your plan: when they break with …e5, drop the bishop back to b3, put the queen on c2, and bring your other rook to the middle.", 'Rxc3 — the rook owns the c-file.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the lines already written don't share. */
type TabBeats = Array<[string, string]>;

/** Filed in this order: each tab's beats start where the lines before it end. */
const TAB_LINES: Record<string, string[]> = {
  'Exchange Variation': ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'Nbd7', 'Qc2', 'Re8', 'Nf3', 'c6', 'O-O', 'Nf8', 'Rab1', 'a5', 'a3', 'Ng6', 'b4', 'axb4', 'axb4', 'Bd6', 'b5'],
  'Classical Mainline': ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6', 'Bd3', 'dxc4', 'Bxc4', 'Nd5', 'Bxe7', 'Qxe7', 'O-O', 'Nxc3', 'Rxc3', 'e5', 'dxe5', 'Nxe5', 'Nxe5', 'Qxe5'],
  'Tartakower Variation': ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4', 'b6', 'cxd5', 'Nxd5', 'Bxe7', 'Qxe7', 'Nxd5', 'exd5', 'Rc1', 'Be6', 'Qa4', 'c5', 'Qa3', 'Rc8', 'Bb5'],
  "Queen's Gambit Accepted": ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'a6', 'Qe2', 'b5', 'Bb3', 'Bb7', 'Rd1', 'Nbd7', 'Nc3', 'Qb8', 'd5', 'exd5', 'Nxd5', 'Nxd5', 'Bxd5', 'Bxd5', 'Rxd5', 'Be7'],
  'Slav Defence Response': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6', 'Bxc4', 'Bb4', 'O-O', 'O-O', 'Qe2', 'Nbd7', 'e4', 'Bg6', 'Bd3'],
  'Semi-Slav Response': ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'dxc4', 'Bxc4', 'b5', 'Bd3', 'Bb7', 'O-O', 'a6', 'e4', 'c5', 'd5', 'e5'],
  'Catalan Transposition': ['d4', 'd5', 'c4', 'e6', 'Nf3', 'Nf6', 'g3', 'Be7', 'Bg2', 'O-O', 'O-O', 'dxc4', 'Qc2', 'a6', 'Qxc4', 'b5', 'Qc2', 'Bb7', 'Bd2', 'Be4'],
  'Anti-QGD: Early Bf4 System': ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bf4', 'Bd6', 'Bg3', 'O-O', 'e3', 'c5', 'dxc5', 'Bxc5', 'a3', 'Nc6', 'Nf3', 'Be7', 'Qc2', 'Bd7'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Exchange Variation': [
    ["cxd5 — the Exchange Variation, more than half the masters. Instead of keeping the tension on d5, you resolve it at once. Why? Your c-pawn disappears, so the c-file is half-open for your rooks, and the pawns in the center are fixed. When the pawns are fixed, the plan is easy to learn.", 'cxd5 — fixed pawns, a half-open c-file.'],
    ["…exd5 — nine masters in ten. Why the pawn and not the knight? If the knight takes, e4 hits it, and you get the big center for nothing. Now the files are lopsided: the c-file is half-open for you, the e-file for them. If you know the Exchange Caro-Kann, it's the same pawn picture with the colours switched.", '…exd5 — c-file yours, e-file theirs.'],
    ["Bg5 — nearly every master. The bishop comes out before you play e3, so it's never shut in behind its own pawn, and it pins the knight on f6 to their queen on d8.", 'Bg5 — out before e3, pins f6.'],
    ["…Be7 — four masters in ten; …c6 is a little more common, and the two usually go together. The bishop steps between your bishop and their queen, so the knight on f6 is no longer pinned.", '…Be7 — unpins the knight on f6.'],
    ["e3 — nearly every master. With your dark-squared bishop outside the pawns, the e-pawn can come up: it guards d4 and opens the diagonal for the other bishop, which is heading for d3.", 'e3 — guards d4, Bd3 next.'],
    ["…O-O — four masters in ten. Their king goes to g8, behind the pawns on f7, g7 and h7. Remember h7: your next two moves both point at it.", '…O-O — king on g8; watch h7.'],
    ["Bd3 — nine masters in ten. Where does this bishop belong? On the diagonal to h7. And there's a second point: it covers f5, the best square their bishop on c8 could hope for. Their problem bishop is free now, but its favourite square is taken.", 'Bd3 — aims at h7, covers f5.'],
    ["…Nbd7 — about a third of the masters. The knight gives the knight on f6 a third guard, so your bishop on g5 wins nothing there. Keep watching this knight: d7 is only a stop on the way to f8.", '…Nbd7 — guards f6, heading for f8.'],
    ["Qc2 — about a quarter of the masters; Nge2 and Nf3 are both more common. The queen takes the half-open c-file and lines up behind the bishop on d3, both pointed at h7. That's a battery. It wins nothing yet, because the knight on f6 guards h7, but they have to keep a guard there.", 'Qc2 — queen and bishop at h7.'],
    ["…Re8 — a bit over half the masters. The rook takes their half-open file, the e-file, and it does something less obvious: it empties f8. Remember the knight on d7?", '…Re8 — the e-file; f8 is empty.'],
    ["Nf3 — the masters split almost evenly between this and Nge2. From f3 the knight covers e5, and your king is ready to castle.", 'Nf3 — covers e5, castle next.'],
    ["…c6 — the pawn shores up d5. Now look at their queenside pawns: a7, b7 and c6. You have two pawns over there, on a2 and b2, against their three, and you're going to attack with the two.", '…c6 — the pawns your plan targets.'],
    ["You castle, the engine's first choice. Notice which side: the kingside, away from the pawns you're about to push. The b-pawn can run to b5 without opening anything in front of your king.", 'O-O — king safe; the b-pawn can run.'],
    ["…Nf8 — here's where that knight was going. Why f8? It's one more guard for h7, where your queen and bishop are pointed. And by leaving d7 it uncorks the bishop on c8, which can come out to e6.", '…Nf8 — guards h7, frees c8.'],
    ["Rab1 — here the plan starts. The rook goes behind the b-pawn so that b4 can come next, and then on to b5. This is the minority attack: your two pawns advance against their three, to force a trade on c6 that leaves them a weak pawn on the file your rooks own.", 'Rab1 — the minority attack: b4 next.'],
    ["…a5 — they see it coming. The pawn covers b4, so your b-pawn can't go there yet without being taken. Does that stop the plan? No. You need one more preparing move.", '…a5 — covers b4, for now.'],
    ["a3 — the preparing move. Now when the b-pawn goes to b4 and they take it, your a-pawn takes back, and you still have a pawn on b4, one step from b5.", 'a3 — now b4 can be recaptured.'],
    ["…Ng6 — the knight finishes its trip: d7, f8, g6. From g6 it covers e5 and f4, so your knight can't settle on e5 and your bishop can't drop back to f4.", '…Ng6 — covers e5 and f4.'],
    ["b4 — the pawn goes. It hits their pawn on a5, and because you prepared with a3, nothing is lost: if they take, your a-pawn takes back and a pawn stands on b4 again.", 'b4 — hits a5; b5 is next.'],
    ["They trade pawns on b4, and you simply take back. What they get from the trade is the a-file: once the pawns are gone, their rook on a8 has an open road.", '…axb4 — trades; the a-file opens.'],
    ["axb4 — the pawn takes back, the engine's first choice. Not the rook: on b4 it would be taken by their bishop on e7. Your pawn is on b4 again. One more step.", 'axb4 — the pawn, not the rook.'],
    ["…Bd6, the engine's first choice. The bishop hits your pawn on b4 and looks the other way at h2. But see what it left behind: with the bishop gone from e7, the knight on f6 is pinned to their queen again by your bishop on g5.", '…Bd6 — hits b4 and h2; f6 pinned.'],
    ["b5 — the engine's first choice, and the whole plan in one move. The pawn hits c6. If they take on b5, their pawn on d5 loses its neighbour and stands alone. If you take on c6 and they recapture with the b-pawn, they're left with a pawn on c6 that no pawn can guard, on a file your rooks own. It's about level. Your plan: trade on c6, bring a rook to the c-file against that pawn, and remember the pin on f6 — if …h6 chases your bishop, taking the knight and pushing e4 opens the center.", 'b5 — hits c6; the plan lands.'],
  ],
  'Classical Mainline': [
    ["…e5 — nearly nine masters in ten. Here's the break they've been building toward: the knight on d7 and the queen on e7 both stand behind it, and the pawn hits d4. What do you do about it?", '…e5 — the freeing break, hits d4.'],
    ["dxe5 — about a quarter of the masters; Qc2 is a little more common, and Bb3 is played about as often. The engine prefers Bb3: keep the tension, and step the bishop off c4 so your rook sees down the c-file. Taking is the simple road, and after it it's about level.", 'dxe5 — simple; Bb3 kept more.'],
    ["Every master takes back with the knight on e5. It hits two of your pieces, the bishop on c4 and the knight on f3. And look behind it: the knight has left d7 and the pawn has left e6, so the bishop on c8 can finally see the board.", '…Nxe5 — hits c4 and f3; c8 is free.'],
    ["Nxe5 — nearly every master. Their knight was hitting your bishop on c4, so the simplest answer is to take it off. The queen will recapture on e5.", 'Nxe5 — trades off the knight hitting c4.'],
    ["…Qxe5 — every master, and it's about level. They've freed their game, so what's left for you? Your bishop on c4 still pins the pawn on f7 to their king, and the d-file is open. Your plan: Qb3, lining up queen and bishop against f7 and hitting b7, then a rook to d1 — and f4 is there when you want to push their queen off e5.", '…Qxe5 — level; Qb3 and the d-file.'],
  ],
  'Tartakower Variation': [
    ["…h6 — the most common move here, a bit over half the masters. The pawn asks your bishop on g5 a question: take the knight, or step back?", '…h6 — asks the bishop on g5.'],
    ["Bh4 — three masters in four keep the bishop; about a quarter take on f6. Why keep it? On h4 the bishop is on the same diagonal as before, still looking at the knight on f6. You've given nothing up.", 'Bh4 — keeps the bishop, same diagonal.'],
    ["…b6 — the Tartakower, about three masters in four. Remember the bishop on c8, shut in behind e6? This is their answer. If it can't come out on its own diagonal, it goes around the side: to b7, on the long diagonal, right behind d5.", '…b6 — the c8 bishop heads for b7.'],
    ["cxd5 — about one master in seven; Be2 or Bd3 is the more common choice. Why trade now? Timing. Their bishop is about to land on b7. If you make them recapture on d5 first, something of theirs has to stand on that diagonal, in the bishop's way.", 'cxd5 — trade before …Bb7 lands.'],
    ["More than eight masters in ten take back on d5 with the knight, hoping to keep the long diagonal clear of pawns. It's the same idea as …Nd5 in the main line: the knight offers a trade on c3 and uncovers their bishop on e7 to yours on h4.", '…Nxd5 — keeps the diagonal, offers trades.'],
    ["Bxe7 — more than nine masters in ten. Bishop takes bishop, and their queen will take back. Then comes the important part: what do you do about the knight on d5?", 'Bxe7 — bishops off first.'],
    ["…Qxe7 — nearly every master. Taking your knight on c3 first doesn't work: your bishop takes the queen on d8, their knight takes yours on d1, and the bishop drops back to e7 and hits the rook on f8. That costs them about three pawns.", '…Qxe7 — the queen must take back.'],
    ["Nxd5 — about eight masters in ten, and here's the point of the whole sequence. Your knight takes theirs with a hit on the queen on e7, so they must take back at once, and the only piece that can is the pawn on e6. A pawn on d5 is exactly what you wanted: it stands on the diagonal their bishop was heading for.", 'Nxd5 — forces a pawn onto d5.'],
    ["…exd5 — every master. Their pawn on d5 stands on the long diagonal, so a bishop on b7 would stare straight into the back of it. One warning: their queen on e7 looks down the e-file at your pawn on e3, and that pawn is pinned to your king. Don't leave the king on e1 for long.", '…exd5 — d5 blocks the long diagonal.'],
    ["Rc1 — nearly six masters in ten. The rook takes the half-open c-file and looks all the way down to c7, the pawn left behind by b6 and d5.", 'Rc1 — the c-file, down to c7.'],
    ["…Be6 — nearly every master. So this is where the problem bishop ends up: not on b7 after all, but on e6, guarding the pawn on d5. It's out, but it's doing a defender's job.", '…Be6 — the bishop guards d5.'],
    ["Qa4 — about half the masters. The queen covers c6, so the knight on b8 can't develop there, and it looks at a7. It's also the first half of a trip: from a4 the queen is going on to a3.", 'Qa4 — covers c6, heading for a3.'],
    ["…c5 — more than eight masters in ten. Their freeing break: the pawn hits d4, backed by the pawn on b6. If you take, they take back with the b-pawn, and their pawns on c5 and d5 stand side by side with no pawn left to guard either. Those are called hanging pawns.", '…c5 — the break; hanging pawns loom.'],
    ["Qa3 — about eight masters in ten, and here's why the queen went to a4 first. From a3 it's the third attacker on c5: the pawn on d4, the rook on c1, and now the queen. They have two guards, the pawn on b6 and the queen on e7.", 'Qa3 — a third attacker on c5.'],
    ["…Rc8, the engine's first choice. Three attackers on c5, so a third guard: the pawn on b6, the queen on e7, and now the rook. That's the tug-of-war of the Tartakower: their pieces are tied to guarding c5 and d5, and yours are busy attacking them.", '…Rc8 — a third guard for c5.'],
    ["Bb5 — your last minor piece comes out, and it's about level. From b5 the bishop covers c4, so their c-pawn can't push past, and your king can finally castle. Your plan: castle, then take on c5 at the right moment so they're left with hanging pawns on c5 and d5, and aim your rooks and queen at them.", 'Bb5 — covers c4, castle next.'],
  ],
  "Queen's Gambit Accepted": [
    ["…dxc4 — the Queen's Gambit Accepted, about one master in eight. You're a pawn down, for now. But look at what they paid: their pawn is gone from d5. Can they keep the extra pawn? Their idea is …b5, to guard it. Yours is to get it back without wasting a move.", '…dxc4 — a pawn up, the center gone.'],
    ["Nf3 — about half the masters. How do you win the pawn back? Not with the queen check on a4, which only drags the queen out early. You develop: the knight covers e5, so they can't strike back with …e5, and the pawn on c4 isn't going anywhere.", 'Nf3 — develop first, stops …e5.'],
    ["…Nf6 — seven masters in ten. The knight covers e4, so the big pawn center isn't free any more, and it watches d5.", '…Nf6 — covers e4 and d5.'],
    ["e3 — four masters in five. The pawn opens the diagonal from f1, and now your bishop hits the pawn on c4, which has no guard. You'll take it back by developing a piece. That's the secret of this gambit: the pawn was only ever on loan.", 'e3 — the bishop now hits c4.'],
    ["…e6 — seven masters in ten. They don't try to hold the pawn. They let it go and develop: the pawn opens the diagonal for their bishop on f8 and covers d5.", '…e6 — lets c4 go, frees f8.'],
    ["Bxc4 — every master, and the pawn is back. Count what the gambit cost you: nothing. Material is level, and you have a pawn on d4 where they have none. That's what you play with in this line: the center.", 'Bxc4 — pawn back, bishop out.'],
    ["…c5 — seven masters in ten. They can't have a pawn in the center, so they attack yours: the pawn hits d4 from the side. Do you take it? You can, but then they trade queens on d1. Most masters keep the tension.", '…c5 — hits d4 from the side.'],
    ["You castle — nine masters in ten. No hurry in the center. If they take on d4, your e-pawn takes back, and you get open lines for every piece in return for a pawn on d4 that stands alone.", 'O-O — king safe, tension stays.'],
    ["…a6 — more than eight masters in ten. A small move with a big follow-up: …b5 is coming, to kick your bishop off c4 and clear b7 for their own bishop. That's how the Accepted gets the bishop on c8 out.", '…a6 — …b5 is coming.'],
    ["Qe2 — about one master in eight; taking on c5, Bb3 and a4 are all played more. What's the idea? The queen steps off the d-file, so a pawn trade there no longer swaps queens. It clears d1 for a rook, and it stands behind the e-pawn, ready to back e4. You want the queens on for what's coming.", 'Qe2 — off the d-file, backs e4.'],
    ["…b5 — eight masters in ten. There's the follow-up to …a6: the pawn hits your bishop on c4. Where should the bishop go: back to d3, or to b3?", '…b5 — kicks the bishop on c4.'],
    ["Bb3 — six masters in ten; the rest play Bd3. Why b3? Because of d5. From b3 the bishop still looks through d5 to e6, and d5 is the square your d-pawn wants to reach.", 'Bb3 — keeps the diagonal through d5.'],
    ["…Bb7 — nearly every master. Their bishop gets its long diagonal, looking through the center at your knight on f3. Compare the Declined, where the bishop on c8 sat behind a pawn on e6. Here it's already out.", '…Bb7 — the long diagonal, toward f3.'],
    ["Rd1 — a bit over half the masters; a third play a4, going after the pawn on b5. The rook guards d4, and more than that, it stands behind the pawn: if that pawn ever moves forward and gets traded, the rook is already on an open file, facing their queen on d8.", 'Rd1 — behind the d-pawn.'],
    ["…Nbd7 — nine masters in ten. Why not c6, the more active square? Because your d-pawn would push to d5 and kick it. On d7 the knight guards c5 and leaves the long diagonal open for the bishop on b7.", '…Nbd7 — safe from d5, guards c5.'],
    ["Nc3 — two masters in three. Your last knight hits the pawn on b5, which your queen on e2 is also looking at. And count what's lined up on d5 now: the bishop on b3, the knight, and the rook on d1 behind the pawn. The break is loaded.", 'Nc3 — hits b5, loads d5.'],
    ["…Qb8 — about a third of the masters; the queen goes to b6 or c7 nearly as often. All three moves get the queen off the d-file, away from your rook on d1. But it has left the middle of the board, and their king is still on e8. That's your cue.", '…Qb8 — off the d-file.'],
    ["d5 — the engine's first choice, and the move your last four were building toward. The pawn hits e6, with the bishop on b3, the knight on c3 and the rook on d1 all behind it. And their king is still on e8. That's the question the break asks: can they get castled before the center opens?", 'd5 — the break, their king on e8.'],
    ["…exd5 — they take. Their other choice was to push past with …c4, hitting your bishop on b3. You're a pawn down for the moment, and three of your pieces can take on d5. Which one?", '…exd5 — which piece takes back?'],
    ["You take on d5 with the knight, and material is level. But the engine prefers e4 here: don't recapture at all, push a second pawn at d5. If their pawn steps past to d4, your knight jumps into d5 anyway. Taking is simpler, and it's about level.", 'Nxd5 — level; e4 was stronger.'],
    ["…Nxd5 — knight takes knight. Now the bishop or the rook can recapture, and it matters which. Before you choose, look at their bishop on b7 and their pawn on c5.", '…Nxd5 — bishop or rook takes back?'],
    ["The bishop takes on d5, the engine's first choice. Why not the rook? Because of …c4: that pawn would hit your bishop on b3 while their bishop on b7 hits the rook on d5, and you can't save both. From d5 the bishop hits f7 and pins their bishop on b7 to the rook on a8.", 'Bxd5 — not the rook: …c4.'],
    ["…Bxd5 — they trade the pinned bishop off at once. Developing with …Be7 instead would run into Bxf7 check, pulling their king out so your rook can take the knight on d7.", '…Bxd5 — trades off the pin.'],
    ["Rxd5 — and material is level again. Look where the rook stands: in the middle of an open file, hitting the pawn on c5 and the knight on d7. Every minor piece that fought over d5 is gone, and your rook is standing on it.", 'Rxd5 — a rook in the center.'],
    ["…Be7 — their bishop develops at last, and they're one move from castling. It's about level, but you hold the open d-file. Your plan: e4, giving the rook on d5 a pawn behind it, then b3 and Bb2 to put your last bishop on the long diagonal, and a second rook to the d-file.", '…Be7 — castles next; e4, then b3.'],
  ],
  'Slav Defence Response': [
    ["…c6 — the Slav, the masters' most common answer, about half their games. It does the same job as …e6: a pawn stands behind d5. But compare the two. …e6 shut in the bishop on c8. …c6 doesn't: the diagonal from c8 stays wide open, and that bishop is coming out.", '…c6 — holds d5, keeps c8 open.'],
    ["Nf3 — two masters in three. You develop and cover e5. Notice what you haven't done: your pawn on c4 still has no guard. e3 would guard it, but it would also shut in your bishop on c1.", 'Nf3 — develops; c4 stays loose.'],
    ["…Nf6 — nine masters in ten. The knight covers e4 and adds a guard to d5. The real question, what happens on c4, is still open.", '…Nf6 — develops; c4 still undecided.'],
    ["Nc3 — more than half the masters. The knight hits d5 and backs up e4. Now the choice is theirs: play …e6 and build a wall of pawns, the Semi-Slav tab, or do what the Slav was designed for and take on c4 while the bishop on c8 is still free.", 'Nc3 — hits d5; their choice now.'],
    ["…dxc4 — about three masters in ten, and the engine's first choice. They take, and this time they mean to keep it: …b5 is next, with the pawn on c6 behind it. In the Accepted you got the pawn back just by developing. Here you have to stop …b5 first.", '…dxc4 — and …b5 would hold it.'],
    ["a4 — nine masters in ten. That's the stop sign: if their pawn goes to b5 now, your a-pawn takes it. Does a4 cost anything? One thing. No pawn of yours can ever cover b4 again. Remember that square.", 'a4 — stops …b5; b4 is the price.'],
    ["…Bf5 — eight masters in ten. Here's the bishop the Slav was built around: it comes out in front of its pawns, before …e6 closes the door behind it. And it covers e4, so your e-pawn can't go there yet.", '…Bf5 — the free bishop covers e4.'],
    ["e3 — the masters split between this and Ne5, the knight going after c4 directly. e3 is the simple way: it opens the diagonal from f1, and your bishop hits the pawn on c4. Thanks to a4, nothing can guard it.", 'e3 — the bishop hits c4.'],
    ["…e6 — nearly every master. Now the pawn can go to e6 without regret, because the bishop is already outside on f5. It opens the way for their other bishop, on f8. Guess which square that one is headed for.", '…e6 — bishop outside, f8 opens.'],
    ["Bxc4 — nearly every master, and material is level. The pawn is back, your bishop looks at e6, and you're ready to castle.", 'Bxc4 — level again, bishop out.'],
    ["…Bb4 — more than nine masters in ten. There's the square you gave up with a4. No pawn of yours can chase a piece off b4, and from there the bishop pins your knight on c3 to the king. Why does that matter? That knight is the piece backing up e4.", '…Bb4 — the outpost; pins c3.'],
    ["You castle — nearly every master. The king leaves e1, so the knight on c3 is no longer pinned, and you are a little better. The next job is the e-pawn.", 'O-O — the pin on c3 is gone.'],
    ["…O-O — the masters split evenly between castling and …Nbd7. Now look at the center: you have pawns on d4 and e3, and theirs are back on c6 and e6. Everything they've done — the bishop on f5, the knight on f6, the bishop on b4 — has been about stopping e4.", '…O-O — the fight is over e4.'],
    ["Qe2 — six masters in ten. How do you get e4 in? Count. Their knight on f6 and bishop on f5 both cover e4. Your knight on c3 covers it, and now the queen stands behind the pawn, so when it gets there it has two guards.", 'Qe2 — a second backer for e4.'],
    ["…Nbd7 — four masters in ten. Their last minor piece develops, backing up the two breaks, …c5 and …e5. But it adds nothing to the fight for e4. So nothing stops your pawn now.", '…Nbd7 — develops; e4 is still on.'],
    ["e4 — nearly nine masters in ten. Two pawns side by side in the center, and the pawn hits the bishop on f5. Can their knight just take it? No. Your knight takes back, their bishop takes that, and your queen takes the bishop: a piece for a pawn. That's what Qe2 was for.", 'e4 — the big center, hits f5.'],
    ["…Bg6 — nearly nine masters in ten. The bishop stays on its diagonal, still hitting your pawn on e4. Count again: their bishop and knight hit e4, your knight and queen guard it. It holds, but your knight on c3 could be traded off by the bishop on b4 at any moment.", '…Bg6 — still hitting e4.'],
    ["Bd3 — the engine's first choice. A third guard for e4, so the pawn center is secure. It's about level, but you have what you were playing for: pawns on d4 and e4. Your plan: bring the bishop on c1 out to f4, and when the moment is right, push the e-pawn on to e5 and drive the knight off f6.", 'Bd3 — a third guard for e4.'],
  ],
  'Semi-Slav Response': [
    ["…e6 — the Semi-Slav, a bit over half the masters. They play both pawn moves, …c6 and …e6: a triangle of pawns on c6, d5 and e6, about as solid as a center gets. The cost is the same as in the Declined: the bishop on c8 is behind its own pawns again.", '…e6 — the triangle: c6, d5, e6.'],
    ["e3 — about four masters in ten, and the engine's first choice; Bg5 is played a little more. e3 is the solid road: it guards c4 at last, by opening the diagonal from f1. The price is that your bishop on c1 stays at home.", 'e3 — guards c4, solid.'],
    ["…Nbd7 — nine masters in ten. With a pawn on c6 the knight can't use that square, so it goes to d7. From there it backs up the …c5 break, and in this line everything they do is aimed at that break.", '…Nbd7 — backs the …c5 break.'],
    ["Bd3 — a third of the masters, and the engine's first choice; Qc2 is the more common move. The bishop points at h7 and backs up e4. One thing to know: on d3 it stands where a pawn capture on c4 will hit it.", 'Bd3 — best diagonal, backs e4.'],
    ["…dxc4 — nearly nine masters in ten. They take with a hit on your bishop, so it has to recapture. But that's not the real point. Once your bishop is pulled onto c4, …b5 hits it again. Every step of their queenside expansion comes with a threat.", '…dxc4 — pulls the bishop to c4.'],
    ["Bxc4 — every master. Material is level, but the bishop won't be allowed to stay on c4 for long.", 'Bxc4 — level; the bishop is a target.'],
    ["…b5 — virtually every master. The pawn hits your bishop, and it clears b7 for the bishop that has been sitting on c8. That's the Semi-Slav's answer to its problem piece. Now, where does your bishop go?", '…b5 — kicks the bishop, clears b7.'],
    ["Bd3 — more than eight masters in ten. Why not e2, out of everyone's way? Because on d3 the bishop works in three directions: it points at h7, it supports e4, and together with your knight on c3 it hits the pawn on b5.", 'Bd3 — h7, e4 and b5.'],
    ["…Bb7 — half the masters. The bishop is out, but look at its diagonal: its own pawn on c6 is in the way. It's waiting. The day that pawn goes to c5, the diagonal opens all the way to your knight on f3.", '…Bb7 — waits for …c5.'],
    ["You castle — half the masters; a third push e4 at once. Castling first is the careful order: the center is about to open, and your king is already off e1.", 'O-O — king off e1 first.'],
    ["…a6 — eight masters in ten. Why this little move? Your bishop and knight both hit b5, and only the pawn on c6 guards it. But c6 is the pawn that wants to go to c5. Before it can leave, b5 needs another guard.", '…a6 — guards b5 so …c5 can go.'],
    ["e4 — more than eight masters in ten. You get your break in first: pawns on d4 and e4, the bishop on c1 has its diagonal at last, and e5 is coming, hitting the knight on f6. So …c5 has to happen now.", 'e4 — the center; e5 is next.'],
    ["…c5 — the engine's first choice, and the move their whole setup was built for. The pawn hits d4, and the bishop on b7 wakes up: its diagonal is open now, straight through to your pawn on e4. You have three answers: take, push e5, or push d5. Which one keeps that bishop quiet?", '…c5 — hits d4, opens b7.'],
    ["d5 — nearly every master. You don't take, you push past. The pawn steps onto the long diagonal, right in front of their bishop, and hits e6. So the bishop that waited so long for …c5 is looking at a pawn again.", 'd5 — blocks b7, hits e6.'],
    ["…e5 — they close the center, and it's a mistake: the masters almost never play it, and the engine prefers …Qc7, keeping the tension. Look at what it hands you: a passed pawn on d5, guarded by the pawn on e4, with their bishop on b7 shut in behind it. You are clearly better. Your plan: b3 and Nd2 to cover c4, so their queenside pawns can't roll forward, then Qe2 — and the passed pawn on d5 is your trump for the rest of the game.", '…e5 — a mistake: a passed d-pawn.'],
  ],
  'Catalan Transposition': [
    ["Nf3 — about four masters in ten; Nc3 is the more common move. The knight covers e5, and you haven't yet shown what kind of Queen's Gambit this will be. Your pawn on c4 still has no guard. Hold that thought.", 'Nf3 — flexible, covers e5.'],
    ["…Nf6 — more than six masters in ten. The knight covers e4 and adds a guard to d5. So far it's a normal Declined setup.", '…Nf6 — the normal setup.'],
    ["g3 — the Catalan, about three masters in ten, and the engine's first choice. Your bishop is going to g2, onto the long diagonal that runs through d5 all the way to b7 and a8. And the pawn on c4? It stays without a guard, on purpose. If they take it, the queen check on a4 wins it straight back, and their pawn has left your bishop's diagonal.", 'g3 — the Catalan: bishop to g2.'],
    ["…Be7 — one of three roads the masters take here, alongside the check on b4 and grabbing c4 right away. This is the patient one: the bishop clears f8 for castling, and the question of your c4 pawn is put off.", '…Be7 — patient; c4 can wait.'],
    ["Bg2 — every master. The bishop is on its diagonal, with a lot in the way for now: your own knight on f3, then their pawn on d5. But if that pawn ever takes on c4, only the knight is left, and one knight move later your bishop is looking at b7.", 'Bg2 — the long diagonal, toward d5.'],
    ["They castle, as nearly every master does. Their king is safe on g8, and your pawn on c4 is still sitting there without a guard.", '…O-O — king safe; c4 still loose.'],
    ["You castle too — more than eight masters in ten. You still haven't guarded c4, and you're not going to. If they want the pawn, they can take it and find out what the bishop on g2 thinks.", 'O-O — c4 stays on offer.'],
    ["…dxc4 — two masters in three. They take it, and they'd like to keep it with …b5. But look at the long diagonal: their pawn is gone from d5, and the only thing between your bishop and b7 is your own knight on f3.", '…dxc4 — the diagonal clears.'],
    ["Qc2 — three masters in four. An early queen move usually just gets kicked around. This one earns its keep: it hits the pawn on c4, which has no guard, so the pawn comes back next move unless they find a way to hold it.", 'Qc2 — the queen wins c4 back.'],
    ["…a6 — more than eight masters in ten. They can't save the pawn, so they arrange to gain something when you take it: once your queen lands on c4, …b5 will hit it. Why not the simpler …b6? Then Ne5: your knight steps off the long diagonal, and the bishop on g2 is hitting the rook on a8.", '…a6 — sets up …b5.'],
    ["Qxc4 — a third of the masters; two in three play a4 first, to stop …b5 before taking. This is the direct way: material is level, and the cost is that …b5 now comes with a hit on your queen.", 'Qxc4 — level; …b5 is allowed.'],
    ["…b5 — the engine's first choice. The pawn hits your queen and clears b7 for the bishop on c8. But pawns don't move backward. Look at c7: that pawn is left behind on a half-open file, with your queen about to settle in front of it.", '…b5 — kicks the queen, clears b7.'],
    ["Qc2 — the engine's first choice. The queen stays on the c-file, looking at the pawn on c7. Their c-pawn would love to get to c5 and trade itself off. If it tries right now, Ne5 uncovers your bishop on g2 against the rook on a8.", 'Qc2 — stays on the c-file.'],
    ["…Bb7 — the engine's first choice. The problem bishop is out, and it stands opposite yours on the long diagonal, with only your knight on f3 between them. That knight is also the only guard of your pawn on d4. And next the bishop heads for e4.", '…Bb7 — bishop meets bishop.'],
    ["Bd2 — it looks modest, so what is it for? The bishop is on its way to a5. From there it would hit the pawn on c7, the same pawn your queen is watching from c2. Two attackers on one backward pawn.", 'Bd2 — heading for a5, at c7.'],
    ["…Be4 — the engine's first choice. There's the square their bishop was heading for: it hits your queen on c2, which has no guard. It's about level. Your plan: step the queen to c1, where it still watches c7; then Ba5 or Be3, a rook to d1, and your knight from b1 into the game. And keep asking: can their c-pawn ever get to c5?", '…Be4 — hits the queen; Qc1 next.'],
  ],
  'Anti-QGD: Early Bf4 System': [
    ["Bf4 — a different square for the bishop, and a rare one here: the masters nearly always choose between taking on d5, the pin from g5, and Nf3. Why f4? The bishop looks down the diagonal at c7, it covers e5, and it gets out before e3 shuts the door. The trade-off: with no pin on f6, there's less pressure on d5.", 'Bf4 — no pin; aims at c7.'],
    ["…Bd6 — about one master in ten; more often their bishop stops on e7, or the c-pawn strikes first. Theirs hits yours, and yours has no guard. So decide right now: trade on d6, or step back? What you can't do is carry on with cxd5, because then they simply take the bishop.", '…Bd6 — challenges your loose bishop.'],
    ["Bg3 — in the handful of master games here, a bit over half trade on d6 and about a third step back like this. Why not trade? Trading develops their queen for them. On g3 your bishop has two pawns guarding it, and if they take, the h-pawn takes back and your rook on h1 gets a half-open file without moving.", 'Bg3 — let them trade; hxg3.'],
    ["…O-O — they leave the bishops alone and castle. Notice where their king has gone, though: to g8. If the bishops are ever traded on g3 now, your rook on the h-file will be looking at their king's side of the board.", '…O-O — king on g8, bishops wait.'],
    ["e3 — the engine's first choice. With the bishop outside, the pawn can come to e3: it holds d4 and opens the diagonal from f1, so the pawn on c4 is guarded at last. Why e3 before Nf3? With the knight first, c4 would still be loose, and they could just take it.", 'e3 — guards c4 before Nf3.'],
    ["…c5 — the standard break against your center: the pawn hits d4. Now there's tension everywhere: pawns facing each other on c4 and d5, on c5 and d4, and bishops facing each other on d6 and g3. Which do you release first?", '…c5 — the break; hits d4.'],
    ["dxc5 — you take, and the pawn lands with a hit on the bishop on d6, so they have no time for anything else. And your d-pawn is off the d-file, so your queen now looks straight at their pawn on d5, with their queen behind it.", 'dxc5 — hits d6, clears the d-file.'],
    ["…Bxc5 — and material is level. Their bishop has a new diagonal, pointing at e3, and it would like one more jump: to b4, pinning your knight on c3. Can you stop that?", '…Bxc5 — level; …Bb4 is next.'],
    ["a3 — the engine's first choice, and a small move that does two jobs. It takes b4 away from their bishop, so the pin on c3 never happens. And it puts a pawn behind b4, so your b-pawn could go there one day and hit the bishop on c5. That's prophylaxis: stop their idea before it starts.", 'a3 — stops …Bb4, covers b4.'],
    ["…Nc6 — the knight comes to its natural square. In the Declined main line a pawn stood on c6 and the knight had to settle for d7; here the c-pawn is gone, so the knight gets the better post, backing up …e5. It's about level: this system gives you an easy game, and it gives them one too.", '…Nc6 — natural square, backs …e5.'],
    ["Nf3 — the knight covers d4 and e5, the two squares their center pawns want to step onto, and your king is nearly ready to castle.", 'Nf3 — covers d4 and e5.'],
    ["…Be7 — why retreat a developed piece? On c5 the bishop stood where your b-pawn could hit it, now that a3 covers b4. So it steps back in good time, and from e7 it guards the knight on f6.", '…Be7 — steps away from b4.'],
    ["Qc2 — the engine's first choice. The queen gets off the d-file, so a trade of pawns on c4 no longer comes with a trade of queens. It looks along the diagonal at h7, and it frees d1 for a rook.", 'Qc2 — off the d-file, toward h7.'],
    ["…Bd7 — their last minor piece develops, and it clears c8 for a rook: the c-file is half-open for them, and your queen is standing on it. It's about level. Your plan: Rd1, lining the rook up against their queen on d8, then Bd3 and castle, with queen and bishop both pointed at h7.", '…Bd7 — clears c8; Rd1 next.'],
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

export const QUEENS_GAMBIT_WATCH: WatchCourse = {
  openingId: 'queens-gambit',
  title: "Queen's Gambit — A Master Class",
  orientation: 'white',
  sources: ['book:queens-gambit', 'concept:pos-center', 'concept:pos-development', 'concept:pawn-minority-attack', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
