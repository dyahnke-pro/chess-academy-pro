// Sicilian Dragon — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=sicilian-dragon`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a). One story threads the course: …g6 puts a
// bishop on the long diagonal behind your own knight, …cxd4 opens the c-file,
// and against the Yugoslav Attack the kings live on opposite wings and race.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — the most popular first move, just under half the masters. Which squares does it fight for? d5 and f5, right in front of you. The Dragon answers with a pawn from the wing now and a bishop on the long diagonal later.", 'e4 — they take the center.'],
  ["…c5 — the Sicilian, almost half the masters' choice. Why the c-pawn? It covers d4, so if their d-pawn ever lands there, you trade a wing pawn for a center pawn, and the c-file opens for your rooks. Remember that file: it's where a Dragon's counterattack comes from.", '…c5 — the Sicilian: covers d4.'],
  ["Nf3 — eight masters in ten. One more piece on d4: when the d-pawn steps forward, the knight is there to take back.", 'Nf3 — backs up the d4 push.'],
  ["…d6 — almost half the masters. Why this pawn first? It covers e5, so their e-pawn can't jump forward later and kick a knight off f6, and it opens the way for your bishop on c8. Note the order: in the Accelerated Dragon you play …Nc6 here instead, and that line has its own tab.", '…d6 — covers e5, frees c8.'],
  ["d4 — eight masters in ten strike in the center, and the pawn hits c5. Here comes the trade the Sicilian is built on: your c-pawn for their d-pawn.", 'd4 — hits c5, opens the center.'],
  ["…cxd4 — nearly every master takes. Count what you got: their d-pawn is gone, your d- and e-pawns are still home, and the c-file is half-open, with no pawn of yours left on it. Your pawn on d4 has no guard, so it won't live long.", '…cxd4 — trade; the c-file opens.'],
  ["Nxd4 — nearly every master takes back with the knight, and it sits in the middle of the board. Now find the weak point: e4. No piece of theirs guards that pawn, and your next move goes straight at it.", 'Nxd4 — centralized; e4 is unguarded.'],
  ["…Nf6 — every master plays it: a developing move with a threat, because the knight hits the unguarded pawn on e4. They can't chase it with e5, since your d6 pawn covers that square, so they have to defend.", '…Nf6 — develops, hits e4.'],
  ["Nc3 — nearly every master guards e4 with the knight. Now it's your move, and it sets the shape of the whole game: where should your bishop on f8 live?", 'Nc3 — guards e4.'],
  ["…g6 — the Dragon, about one master in ten. The pawn makes a home for your bishop on g7, on the long diagonal that runs through d4, c3 and b2 toward the queenside. At first your own knight on f6 will block it; the day the knight moves, the bishop comes alive. The price: the pawn on g6 gives their h-pawn something to hit. Seven masters in ten choose the Najdorf's …a6 instead, and so does the engine; after …g6 they are a little better.", '…g6 — the Dragon: bishop to g7.'],
  ["Be3 — about seven masters in ten, and with it the Yugoslav Attack begins. The bishop guards d4, and from e3 it can reach h6, where it would offer a trade for your Dragon bishop. The whole plan is coming: f3, Qd2, castling long, then the pawns.", 'Be3 — the Yugoslav Attack begins.'],
  ["…Bg7 — nearly every master. Here's the Dragon bishop. For now it looks into the back of your knight on f6, but it already guards h6, the square their bishop wants.", '…Bg7 — the Dragon bishop arrives.'],
  ["f3 — nearly every master. Why a pawn move now? Without it, …Ng4 would hit the bishop on e3. Now a knight on g4 would just be taken, e4 has a second guard, and g4 is ready for their own g-pawn.", 'f3 — no …Ng4; e4 doubly guarded.'],
  ["…O-O — a little over half the masters castle now. Think about where the king is going: g8, the exact wing their pawns will storm. The engine prefers to wait with …a6, and after castling they are clearly better. That's the Dragon's deal: a king under fire, in return for an attack of your own on the other wing.", '…O-O — castle, into the coming storm.'],
  ["Qd2 — nine masters in ten. The queen lines up behind the bishop on e3, so Bh6 will come with backup to trade off your Dragon bishop, and d1 is clear for castling long.", 'Qd2 — backs up Bh6; castles long next.'],
  ["…Nc6 — nearly every master. The knight develops and hits the one on d4, which their bishop and queen guard. The plan behind it: the bishop to d7 and a rook to c8, everything aimed down the c-file.", '…Nc6 — develops, hits d4.'],
  ["Bc4 — about four masters in ten; slightly more castle first. Why the bishop before the king? Castle at once and you strike back with …d5. On c4 the bishop makes three of their pieces cover d5, and it pins your f7 pawn to your king.", 'Bc4 — covers d5, pins f7.'],
  ["…Bd7 — almost nine masters in ten. Where is your rook going? c8, so the bishop steps aside to give it the square. The engine prefers …Nxd4 first, trading off their centralized knight; they are a little better.", '…Bd7 — clears c8 for the rook.'],
  ["O-O-O — two masters in three. The kings now live on opposite wings: their pawns head for your king on g8, your pieces head for theirs on c1. From here, every tempo counts.", 'O-O-O — opposite wings: the race is on.'],
  ["…Rc8 — about half the masters. The rook takes the half-open c-file, the road to their king on c1. Your knight on c6 and their bishop on c4 stand in the way for now, but the moment your knight jumps, the rook bears down on that bishop.", '…Rc8 — the rook takes the c-file.'],
  ["Bb3 — nearly every master, and you can see why: on c4 the bishop sat on your rook's file, where …Ne5 would hit it. On b3 it's safe, and it still pins your f7 pawn.", 'Bb3 — off the c-file, still pins f7.'],
  ["…Ne5 — seven masters in ten. Three things at once: the knight hits f3, it's one jump from c4, and it has left c6, so your rook now looks all the way down to the knight on c3. The engine prefers …Nxd4, and they are a little better. Your plan for the middlegame: …Nc4 to hit their queen and the bishop on e3, take back with the rook, and aim everything at c3.", '…Ne5 — heading for c4.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line (or an earlier tab) doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Yugoslav Attack Main Line': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4', 'h5', 'Kb1', 'Nc4', 'Bxc4', 'Rxc4', 'g4', 'hxg4', 'h5', 'Nxh5'],
  'Yugoslav Attack: Soltis Variation': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4', 'h5', 'Bg5', 'Rc5', 'Kb1', 'b5', 'g4', 'hxg4'],
  'Yugoslav Attack: Chinese Dragon': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rb8', 'Bb3', 'Na5', 'Kb1', 'b5', 'Nd5'],
  'Classical Variation': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be2', 'Bg7', 'O-O', 'O-O', 'Be3', 'Nc6', 'Nb3', 'Be6', 'f4', 'Na5', 'f5', 'Bc4', 'Nxa5', 'Bxe2', 'Qxe2', 'Qxa5', 'g4'],
  'Levenfish Variation': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'f4', 'Nc6', 'Nxc6', 'bxc6', 'e5', 'Nd7', 'exd6', 'exd6', 'Be2', 'Be7'],
  'Accelerated Dragon': ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'g6', 'c4', 'Bg7', 'Be3', 'Nf6', 'Nc3', 'O-O', 'Be2', 'd6', 'O-O', 'Bd7', 'Qd2', 'Nxd4', 'Bxd4', 'Bc6', 'f3', 'a5', 'b3', 'Nd7', 'Be3', 'Nc5', 'Rab1', 'Qb6'],
  'Dragadorf Hybrid': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'g6', 'f3', 'Bg7', 'Qd2', 'b5', 'a4', 'bxa4', 'Nxa4', 'O-O', 'Be2', 'Bd7'],
  'Anti-Dragon: Bg5 Line': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Bg5', 'Bg7', 'Bxf6', 'Bxf6', 'Nd5', 'Bg7', 'c3', 'O-O', 'h4', 'Nc6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Yugoslav Attack Main Line': [
    ["h4 — the storm starts: the h-pawn marches for h5 to open the h-file at your king. About four masters in ten play it here; half tuck the king away with Kb1 first, and so does the engine. After h4 they are a little better.", 'h4 — the h-pawn storm begins.'],
    ["…h5 — two masters in three, and the engine's choice. You meet a pawn storm with a pawn: yours steps in front of theirs, and the h4 pawn can't move. To open the file they'll need a second pawn, g4. And now it's about level.", '…h5 — the h-pawn is blocked.'],
    ["Kb1 — the king steps off c1. Why spend a move on it in the middle of a race? Your rook is aimed down the c-file, and on b1 the king is off it and guards a2 and b2. It's about level.", 'Kb1 — the king leaves the c-file.'],
    ["…Nc4 — here's where the knight was going. It hits the queen on d2, the bishop on e3 and the pawn on b2 all at once, and your rook on c8 guards it, so they can't just ignore it.", '…Nc4 — hits queen, bishop and b2.'],
    ["Bxc4 — they can't afford to leave the knight there, so the bishop takes it. Now their bishop on c4 has no guard, and your rook on c8 is lined up on it.", 'Bxc4 — the knight is traded off.'],
    ["…Rxc4 — the rook lands on c4 and hits both knights, on c3 and d4. That's the half-open c-file from …cxd4 paying off. And …Rxc3, giving the rook for that knight, is an idea that stays in the air.", '…Rxc4 — the rook hits both knights.'],
    ["g4 — the lever. Their h-pawn is stuck behind yours, so this pawn hits h5 instead. If you take, h5 is free for their h-pawn, and the h-file starts to open.", 'g4 — hits h5 to open lines.'],
    ["…hxg4 — take it: you're a pawn up, and your pawn on g4 hits f3, where only their knight on d4 still guards it. It's about level.", '…hxg4 — a pawn up, hitting f3.'],
    ["h5 — a pawn down, they push anyway: the pawn hits g6, and one more capture opens the h-file. It's about level, because that pawn is buying them a line toward your king.", 'h5 — hits g6; the h-file opens.'],
    ["…Nxh5 — take with the knight, and look at what changes. You're two pawns up; your knight on h5, guarded by g6, plugs the open h-file; and with the knight gone from f6, your bishop on g7 finally sees down the diagonal to the knight on d4. It's still about level. Your plan for the middlegame: keep the h-file shut, and aim the rook on c4 and the Dragon bishop at d4 and c3 while their rook comes to g1.", '…Nxh5 — two pawns up; the bishop wakes.'],
  ],
  'Yugoslav Attack: Soltis Variation': [
    ["Bg5 — instead of Kb1, the bishop goes after your knight on f6, one of the two guards of h5. The engine prefers Kb1, and after Bg5 it's about level.", 'Bg5 — goes after the f6 knight.'],
    ["…Rc5 — the Soltis rook. From c5 it still hits the knight on c3, and it covers two squares that matter: d5, where their knight wants to land, and b5, where your b-pawn is going.", '…Rc5 — hits c3, covers d5 and b5.'],
    ["Kb1 — now the king tucks away on b1, off the c-file, though your rook on c5 still looks down it at c3.", 'Kb1 — the king gets off the c-file.'],
    ["…b5 — the queenside storm. Next, …b4 kicks the knight off c3. Their knights on c3 and d4 both hit b5, but your rook on c5 and your bishop on d7 guard it.", '…b5 — …b4 is next, against c3.'],
    ["g4 — the same lever against …h5: their h-pawn can't get past yours, so this pawn hits h5. Now both storms are moving.", 'g4 — hits h5; both storms move.'],
    ["…hxg4 — you take the pawn, and it hits f3. The engine prefers …b4 first, kicking the knight off c3 before anything else; after taking, they are a little better. Your plan for the middlegame: …b4 against the knight on c3 and your rook's pressure down the c-file, while they push h5 to open the h-file. It's a straight race.", '…hxg4 — a pawn; …b4 was stronger.'],
  ],
  'Yugoslav Attack: Chinese Dragon': [
    ["…Rb8 — the Chinese Dragon, about one master in six. Instead of the c-file, the rook stands behind your b-pawn: the plan is …b5 and …b4, a pawn ram aimed at their king on c1. The engine prefers …Rc8, and they are a little better.", '…Rb8 — the Chinese Dragon: the b-pawn ram.'],
    ["Bb3 — about seven masters in ten. With the bishop on c4, …b5 would hit it and gain you a move; on b3 it's out of reach, and it still pins your f7 pawn.", "Bb3 — out of …b5's reach."],
    ["…Na5 — nearly every master. The knight hits the bishop on b3, and look at the follow-up: …Nxb3 would come with check against their king on c1.", '…Na5 — hits b3; …Nxb3 is check.'],
    ["Kb1 — the king steps off c1, so …Nxb3 is no longer check. About six masters in ten play Bh6 here instead, trading off your Dragon bishop, and the engine agrees.", 'Kb1 — no more check on b3.'],
    ["…b5 — every master in the database plays it. The rook on b8 was waiting for this: the pawn heads for b4 to kick the knight off c3, and the rook and your bishop on d7 both guard it on the way.", '…b5 — the ram: …b4 next.'],
    ["Nd5 — it looks active: the knight hits your knight on f6 and the pawn on e7. But it's a mistake. The engine prefers h4, and after Nd5 you are a little better. Your plan for the middlegame: trade with …Nxd5, kick their bishop with …e6, then bring your knight to c4.", 'Nd5 — tempting, but h4 was stronger.'],
  ],
  'Classical Variation': [
    ["Be2 — the Classical, about one master in eight. A quiet bishop: it gets their king ready to castle short, and with both kings on the same wing there's no pawn race. The engine prefers Be3, and after Be2 it's about level.", 'Be2 — quiet: castling short next.'],
    ["…Bg7 — nearly every master. The bishop takes the long diagonal and clears f8, so your king is ready to castle.", '…Bg7 — fianchetto; castling is ready.'],
    ["O-O — more than eight masters in ten. Their king goes to g1, the same wing yours is heading for, so a pawn storm would loosen their own king first.", 'O-O — their king goes short.'],
    ["…O-O — three masters in four. Compare it with the Yugoslav: there your king walked into a storm; here castling is simply safe. It's about level.", '…O-O — safe here: no storm.'],
    ["Be3 — about one master in four, with Bg5 and Re1 about as common. The bishop gives the knight on d4 a second guard beside the queen.", 'Be3 — a second guard on d4.'],
    ["…Nc6 — nine masters in ten. The knight develops with a hit on d4, and from c6 it has a road to a5 and c4 later.", '…Nc6 — hits d4; a5 later.'],
    ["Nb3 — the most common move, about four masters in ten. The knight steps back from d4 so you can't trade it off. The engine prefers h3, which keeps your knight off g4; after Nb3 it's about level.", 'Nb3 — avoids the trade; h3 was stronger.'],
    ["…Be6 — seven masters in ten. The bishop hits the knight on b3 and covers c4 and d5, two squares your pieces want.", '…Be6 — hits b3, covers c4.'],
    ["f4 — nine masters in ten. The pawn grabs space and threatens f5, which would kick your bishop off e6.", 'f4 — threatens f5 against e6.'],
    ["…Na5 — about one master in five; …Qc8 is the most common move. The knight hits b3 and heads for c4, a square your bishop already covers, so if f5 chases the bishop, c4 is waiting for it too.", '…Na5 — hits b3, aims at c4.'],
    ["f5 — two masters in three carry out the threat: the pawn hits your bishop on e6 and the pawn on g6. Where should the bishop go?", 'f5 — hits e6 and g6.'],
    ["…Bc4 — nearly every master. The bishop escapes with two hits: on the knight on b3, and on the bishop on e2, which is pinned to their rook on f1.", '…Bc4 — pins e2 to the rook.'],
    ["Nxa5 — about a quarter of the masters; six in ten play Bd3, and so does the engine. The knight takes yours, and now your bishop on c4 is hanging, hit by the knight and their bishop on e2. Take back first, or save the bishop?", 'Nxa5 — your c4 bishop is hanging.'],
    ["…Bxe2 — every master. Neither: take their bishop first. Your bishop on e2 hits the queen on d1 and the rook on f1, so they must take back, and then you collect the knight on a5. Play …Qxa5 first, and Bxc4 simply wins your bishop.", '…Bxe2 — the in-between move.'],
    ["Qxe2 — nearly every master takes back. Now their knight on a5 has no guard, and it's yours.", 'Qxe2 — now a5 is loose.'],
    ["…Qxa5 — the material is level again, and your queen is busy: from a5 it hits the pawns on a2 and f5 and the knight on c3. It's about level.", '…Qxa5 — level, and the queen is busy.'],
    ["g4 — under one master in ten; most play Bd4, and the engine prefers Rad1. The pawn props up f5, but now no pawn covers f3 or h3 around their king. Your plan for the middlegame: …Nd7 clears the long diagonal, so your bishop on g7 joins the queen against c3, and the pawn on a2 stays a target for your queen.", 'g4 — props f5; Rad1 was better.'],
  ],
  'Levenfish Variation': [
    ["f4 — the Levenfish, a rare try: about seven masters in ten play Be3, and so does the engine. The idea is blunt: the pawn backs up e5, so their e-pawn can jump there and kick your knight off f6. After f4 it's about level.", 'f4 — the Levenfish: e5 is coming.'],
    ["…Nc6 — six masters in ten. The knight hits d4 and puts a second guard on e5, beside your d6 pawn. Watch what they do about it.", '…Nc6 — hits d4, guards e5.'],
    ["Nxc6 — about four masters in ten. There it is: they remove the knight guarding e5, and it takes with a hit on your queen on d8. You must take back.", "Nxc6 — removes e5's guard, hits d8."],
    ["…bxc6 — every master. The pawn on c6 covers d5, and the b-file is open for a rook. But e5 is coming.", '…bxc6 — covers d5, opens the b-file.'],
    ["e5 — nearly every master. The push the whole line was built for: the pawn hits your knight on f6 and the pawn on d6. Where does the knight go?", 'e5 — hits f6 and d6.'],
    ["…Nd7 — the knight steps back but keeps hitting e5, together with your d6 pawn, and only their f4 pawn guards it. Now you are a little better.", '…Nd7 — retreats, still hits e5.'],
    ["exd6 — they trade on d6 before e5 falls, and the pawn hits e7, so you take back.", 'exd6 — trades before e5 falls.'],
    ["…exd6 — take with the e-pawn. Now look at the e-file: it's open, with both kings still on it, so getting castled is the next job.", '…exd6 — the e-file is open.'],
    ["Be2 — the bishop steps in front of their king on the e-file and gets ready to castle. The engine prefers Qd4 or Be3, and after Be2 you are a little better.", 'Be2 — blocks the e-file; Qd4 was better.'],
    ["…Be7 — not g7 this time. With the e-file open, the bishop shields your king and clears f8, so you can castle next. Your plan for the middlegame: castle, push …d5 to take the center, and put a rook on the open e-file.", '…Be7 — shields the king; castle next.'],
  ],
  'Accelerated Dragon': [
    ["…Nc6 — about a quarter of the masters, and the engine's first choice. This is the Accelerated Dragon: the knight comes first, the d-pawn stays home for now, and …g6 arrives early.", '…Nc6 — the Accelerated Dragon order.'],
    ["d4 — about six masters in ten; three in ten play Bb5 against your knight, and the engine prefers that. The pawn hits c5, and you trade it off.", 'd4 — hits c5; Bb5 was stronger.'],
    ["…cxd4 — every master. The same trade as in the Dragon proper: your c-pawn for their d-pawn, and a half-open c-file for later.", '…cxd4 — c-pawn for d-pawn.'],
    ["Nxd4 — every master. The knight takes back and hits your knight on c6, which two pawns guard. Now comes the move this tab is named for.", 'Nxd4 — centralized, hits c6.'],
    ["…g6 — about one master in seven; most play …Nf6. Here's the point of the order: with no knight on f6 yet, your bishop on g7 will hit the knight on d4 the moment it arrives.", '…g6 — the bishop will hit d4.'],
    ["c4 — a little over half the masters: the Maroczy Bind. Their pawns on c4 and e4 both cover d5, so the freeing …d5 is very hard to get in. They have space, and you'll have to find play without that break.", 'c4 — the Maroczy Bind clamps d5.'],
    ["…Bg7 — half the masters; the other half play …Nf6 first, the engine's choice. Either way, the reward of the early …g6 is here: the bishop already hits the knight on d4, and only their queen guards it.", '…Bg7 — hits d4 straight away.'],
    ["Be3 — nine masters in ten. The bishop gives d4 a second guard, so the knight stays.", 'Be3 — a second guard on d4.'],
    ["…Nf6 — more than eight masters in ten. The knight develops with a hit on e4, though it now stands in front of your bishop.", '…Nf6 — hits e4, blocks g7 for now.'],
    ["Nc3 — every master. The knight guards e4 and adds a third piece on d5, the square the whole bind is about.", 'Nc3 — guards e4, grips d5.'],
    ["…O-O — about half the masters castle here; three in ten play …Ng4 to hit the bishop on e3. Your king goes to safety first.", '…O-O — king safe first.'],
    ["Be2 — nearly every master. The bishop gets ready for castling, and it covers g4, so a knight there would just be taken.", 'Be2 — covers g4; castling next.'],
    ["…d6 — now the d-pawn moves. It covers c5 and e5, squares your knights can use, and it frees the bishop on c8.", '…d6 — covers c5 and e5.'],
    ["O-O — both kings on the kingside. This is a battle over squares, not a race of pawn storms.", 'O-O — same wing: a slow fight.'],
    ["…Bd7 — the bishop is heading for c6, where it will hit e4 along the long light diagonal. The engine rates trading on d4 first about the same.", '…Bd7 — heading for c6 and e4.'],
    ["Qd2 — the queen develops and backs up the bishop on e3. The engine prefers Nc2, pulling the knight back before you can trade it.", 'Qd2 — Nc2 was stronger.'],
    ["…Nxd4 — trade it now. When you have less space, every trade gives your other pieces more room. Your knight on d4 hits the bishop on e2, so they take back at once.", '…Nxd4 — a trade frees your game.'],
    ["Bxd4 — the bishop takes back and now faces your Dragon bishop on the same diagonal, with your knight on f6 between them. It hits that knight, but your bishop and the e7 pawn guard it.", 'Bxd4 — hits f6, which is guarded.'],
    ["…Bc6 — there's the square the bishop was heading for. It joins your knight on f6 against e4: two pieces hit that pawn, and only the knight on c3 guards it.", '…Bc6 — two hits on e4.'],
    ["f3 — a pawn comes to guard e4. Now the bind is complete, pawns on c4, e4 and f3, and you'll have to work around it.", 'f3 — guards e4; the bind is set.'],
    ["…a5 — a small pawn move with a clear job: it covers b4, so a knight that lands on c5 later can't be kicked away by b4.", '…a5 — covers b4, prepares c5.'],
    ["b3 — the pawn guards c4 and covers a4, so your a-pawn can't push on without being taken.", 'b3 — guards c4, stops …a4.'],
    ["…Nd7 — the knight heads for c5, and look what it uncovers: your bishop on g7 now sees straight down to their bishop on d4.", '…Nd7 — the g7 bishop sees d4.'],
    ["Be3 — they keep their bishop instead of trading it. But the diagonal runs further now: your bishop on g7 pins the knight on c3 to their rook on a1.", 'Be3 — and g7 pins the c3 knight.'],
    ["…Nc5 — here's the square …a5 prepared: no b4 can kick the knight, and it hits b3 and e4.", '…Nc5 — hits b3 and e4.'],
    ["Rab1 — the rook leaves a1, so the pin on c3 is gone, and from b1 it guards b3, the pawn your knight hits.", 'Rab1 — unpins c3, guards b3.'],
    ["…Qb6 — the queen joins the knight against b3: two hits, two guards. One thing to watch: their bishop on e3 pins your knight on c5 to the queen, so that knight can't move freely. They are a little better. Your plan for the middlegame: rooks to the c-file behind your knight and bishop, and keep the pressure on b3 and e4.", '…Qb6 — two hits on b3.'],
  ],
  'Dragadorf Hybrid': [
    ["…a6 — seven masters in ten, the Najdorf move. In the Dragadorf it comes first and …g6 follows: the pawn covers b5 and prepares …b5, and only then does your bishop go to g7.", '…a6 — covers b5; …g6 comes next.'],
    ["Be3 — the most common move, about a third of the masters. The bishop guards d4, and the same setup as against the Dragon is coming: f3 and Qd2.", 'Be3 — same setup: f3 and Qd2 next.'],
    ["…g6 — here's the hybrid. Seven masters in ten play …e5, and the engine prefers …Nc6 or …e5; after …g6 they are a little better. What you get is the Dragon bishop with the Najdorf's …b5 still in hand.", '…g6 — the Dragadorf: …a6 plus …g6.'],
    ["f3 — about three masters in four. The pawn guards e4 and takes g4 away from your knight, the Yugoslav recipe again.", 'f3 — guards e4, covers g4.'],
    ["…Bg7 — about one master in five; about half push …b5 first. The engine prefers the bishop first: get the Dragon bishop out, then expand.", '…Bg7 — the bishop before …b5.'],
    ["Qd2 — more than eight masters in ten. The queen backs up the bishop on e3 and clears d1 for castling long. The engine prefers g4 right away.", 'Qd2 — castling long next; g4 was stronger.'],
    ["…b5 — rare, about one master in twelve, but the engine's first choice. Why not castle first? Your king can wait: …b5 grabs queenside space now, with …b4 coming to hit the knight on c3.", '…b5 — space now, …b4 next.'],
    ["a4 — about half the masters hit back at once: the pawn hits b5, and only your a6 pawn guards it.", 'a4 — hits b5.'],
    ["…bxa4 — take it. The b-file opens for your rook, pointed at b2.", '…bxa4 — the b-file opens.'],
    ["Nxa4 — the knight takes back. It sits on the rim, but from a4 it guards b2 and covers b6 and c5.", 'Nxa4 — rim knight, guards b2.'],
    ["…O-O — now your king goes to safety, with the queenside files already open for your rooks.", '…O-O — king safe, files open.'],
    ["Be2 — the bishop develops and hits a6, but your rook, your knight and your bishop on c8 all guard it.", 'Be2 — develops, hits a6.'],
    ["…Bd7 — the bishop hits the knight on a4, which only their rook on a1 guards. They are a little better. Your plan for the middlegame: the queen to c7, rooks to the half-open b- and c-files, and the Dragon bishop on g7 aimed down the long diagonal at their queenside.", '…Bd7 — hits the a4 knight.'],
  ],
  'Anti-Dragon: Bg5 Line': [
    ["Bg5 — a rare try; about seven masters in ten play Be3. The bishop hits your knight on f6, and the idea is Bxf6 to damage your pawns. The engine prefers Be3, and after Bg5 it's about level.", 'Bg5 — an early hit on f6.'],
    ["…Bg7 — nearly every master. Develop and defend at once: now the knight on f6 has two guards, the bishop and the e7 pawn.", '…Bg7 — a second guard on f6.'],
    ["Bxf6 — about seven masters in ten check with Bb5 instead, and the engine prefers f3. Taking on f6 gives up their bishop for your knight. Now: take back with the bishop, or with the pawn?", 'Bxf6 — their bishop for your knight.'],
    ["…Bxf6 — the bishop. With the pawn, …exf6, your d6 pawn loses a guard and Ndb5 goes after it. Now you have both bishops, and the one on f6 hits the knight on d4: you are a little better.", '…Bxf6 — two bishops, hitting d4.'],
    ["Nd5 — the knight jumps into the center and hits your bishop on f6 and the pawn on e7. The engine prefers Bb5 check; you are still a little better.", 'Nd5 — hits f6 and e7.'],
    ["…Bg7 — back to the long diagonal, where the bishop still hits the knight on d4. Your queen and king guard e7, so the knight on d5 has nothing to take.", '…Bg7 — back home, still hits d4.'],
    ["c3 — the pawn gives d4 a second guard and blocks your bishop's diagonal behind the knight.", 'c3 — guards d4, blunts g7.'],
    ["…O-O — your king goes to safety while theirs is still in the center.", '…O-O — your king is safe first.'],
    ["h4 — even without the Yugoslav setup, they push the h-pawn toward your king, aiming for h5.", 'h4 — the h-pawn heads for h5.'],
    ["…Nc6 — the last minor piece comes out and hits d4, which is guarded twice. You are a little better. Your plan for the middlegame: …h5 to stop their h-pawn, …e6 to kick the knight off d5, and a rook to the c-file.", '…Nc6 — last minor piece, hits d4.'],
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

export const SICILIAN_DRAGON_WATCH: WatchCourse = {
  openingId: 'sicilian-dragon',
  title: 'The Sicilian Dragon — A Master Class',
  orientation: 'black',
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
