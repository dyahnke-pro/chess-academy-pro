// Albin Countergambit — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=albin-countergambit`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a). A gambit: …e5 gives a pawn for the wedge on
// d4, every eval is said in the sheet's own words, and a better move is named
// only where the sheet's verdict line has two engine reads agreeing. Pass two
// (2026-11-11): each beat re-read against the app's teaching computers.
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'Nf3', 'Nc6', 'Nbd2', 'Bg4', 'h3', 'Bxf3', 'Nxf3', 'Bb4+', 'Bd2', 'Qe7', 'Bxb4', 'Qxb4+', 'Qd2', 'Qxd2+'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — a pawn in the center, and a free diagonal for the bishop on c1. Roughly one master game in three opens like this; e4 is the more common first move. Look at what else the pawn does: it guards e5, so your e-pawn isn't supposed to go there. Two moves from now you're going to push it there anyway.", 'd4 — center pawn; it guards e5.'],
  ["…d5 — you plant a pawn opposite theirs, and it has a job: it covers e4, so they can't simply put a second pawn there. About a quarter of masters go this way; six in ten prefer …Nf6. Remember this pawn: in a few moves it marches on to d4, and the whole opening grows from it.", '…d5 — a pawn opposite theirs.'],
  ["c4 — the Queen's Gambit. Most masters, about three in four, play it here: the pawn attacks d5, and it stands on c4 with nothing behind it. The usual replies prop up d5 with …c6 or …e6. The Albin props up nothing. It strikes back.", 'c4 — a pawn attacks d5.'],
  ["…e5 — and here it is, the Albin Countergambit. You leave d5 to fend for itself and throw a second pawn into the middle: it hits d4, while your d5 pawn keeps hitting c4. Why hand them a pawn? Because if they take on e5, your d-pawn moves up to d4 and digs in on their half of the board, covering c3 and e3. That's the trade: one pawn for a wedge and quick development. And if they take on d5 instead, your queen takes back. Now the honest part: masters hardly ever play this, about one game in a hundred; half play …c6, a third …e6. After …e5 they are a little better.", '…e5 — the countergambit: a pawn hits d4.'],
  ["dxe5 — nearly nine masters in ten take, and they're a pawn ahead. But look at the pawn they won: it's a second e-pawn, doubled in front of the one on e2. And c4 still has nothing guarding it; your d5 pawn could take it. So what's it going to be: grab c4, or march forward?", 'dxe5 — a pawn ahead, but doubled.'],
  ["…d4 — forward, as almost every master plays, and the engine agrees. Why not grab the c4 pawn? Because Qxd8+ comes at once: your king has to take back, the queens are gone, and you never castle. So the pawn steps out of that c4 pawn's reach instead and settles on d4, where it covers c3 and e3: their queen's knight can't use c3, and their e-pawn can't go to e3 without being captured. That's the wedge. The bill: you're a pawn down, and they are a little better. And if they hit the wedge with e3 too soon, a famous trap is waiting for them, in the Lasker Trap tab.", '…d4 — the wedge covers c3 and e3.'],
  ["Nf3 — more than nine masters in ten play it. The knight attacks the wedge, and their queen on d1 backs it up, so d4 is hit twice and only your queen on d8 defends it. The knight guards their e5 pawn too. Your wedge needs a second defender, now.", 'Nf3 — d4 is hit twice.'],
  ["…Nc6 — every master's choice, and it does two things at once. The knight is the second defender of d4, so the wedge stands, and it goes after the e5 pawn, which has only the knight on f3 to protect it. Count d4 again: two attackers, two defenders. The fight now shifts to e5.", '…Nc6 — defends d4, hits e5.'],
  ["Nbd2 — the choice of only about one master in eight; half play g3, and that has its own tab, the Fianchetto Variation. Why not the obvious Nc3? Your wedge controls c3. On d2 the knight protects c4, and it can jump to b3 next, adding a third attacker on d4.", 'Nbd2 — c3 is covered; b3 next.'],
  ["…Bg4 — the bishop takes aim at the knight on f3. What makes that knight worth chasing? It's attacking your wedge, and it's the one piece keeping e5 alive. About a fifth of masters play this; more than half bring out the other knight with …Nge7, on its way to g6 and a second attack on e5. After …Bg4 they are clearly better.", '…Bg4 — aims at the f3 knight.'],
  ["h3 — just under half the masters challenge the bishop right away. Now you have to decide: capture on f3, or retreat? The engine prefers a3 for them, a quiet move that guards b4, so your other bishop never gets to give check from there. Keep that square in mind.", 'h3 — attacks the bishop on g4.'],
  ["…Bxf3 — capture or retreat? Capture: two masters in three do, and the engine agrees; the retreats …Be6 and …Bf5 both score worse. And what does the trade buy you? The piece that takes back is the knight from d2, and that ends its trip to b3, where it would have hit your wedge. The price is the bishop pair, which is theirs now.", "…Bxf3 — ends the d2 knight's trip to b3."],
  ["Nxf3 — the knight recaptures, as in every master game, and the engine approves. Why not with a pawn? Because then your queen comes out to g5: queen and knight both hit e5, nothing guards it, and you win your pawn back. So a knight stands on f3 again, guarding e5 and attacking d4. They are a pawn up and a little better. How do you keep pace? Your next move should come with a threat.", 'Nxf3 — a knight guards e5 again.'],
  ["…Bb4+ — and here's that threat. Remember a3, the move they skipped? This is the check it would have stopped: the bishop comes out with tempo, as seven in ten masters play it, and the engine has it as the best move. Your knight on c6 protects the bishop, and they must answer the check first. How? Qd2 would simply hand the queen to your bishop, so something has to block on d2: the bishop or the knight.", '…Bb4+ — the check a3 would have stopped.'],
  ["Bd2 — every master blocks with the bishop, and so does the engine. Why not the knight? It would have to leave f3, and then nothing guards e5. So the bishop steps in, pinned against their king on e1, and offers a trade on b4.", 'Bd2 — blocks; pinned to the king.'],
  ["…Qe7 — every master plays it, and it's the engine's first choice. What's the queen doing? First, it goes after the gambit pawn: your knight on c6 and your queen now both hit e5, and the knight on f3 is its only protection. Second, it supports your bishop on b4, so if they capture there, the queen recaptures.", '…Qe7 — two on e5; supports b4.'],
  ["Bxb4 — roughly three masters in ten capture your bishop and break the pin. Their bishop on b4 is now hitting your queen, so you recapture, and the only choice is with what.", 'Bxb4 — breaks the pin, hits your queen.'],
  ["…Qxb4+ — the queen recaptures with check, and from b4 it also attacks c4 and b2, two pawns with no protection. Why not the knight? …Nxb4 runs into Qa4+: you'd have to answer the check, and with the knight gone from c6, nothing would be left to defend the wedge. With the queen, you're the one giving check.", '…Qxb4+ — check, and c4 and b2 hang.'],
  ["Qd2 — the queen steps in between and offers a trade, which is the engine's choice too. It attacks your queen and the wedge on d4, but it's tied to the line: your queen pins it to their king on e1. So you're the one deciding. Trade on d2, or collect the c4 pawn?", 'Qd2 — blocks and offers the queens.'],
  ["…Qxd2+ — trade the queens, with check; it's the engine's first choice. They'll recapture with the king, because Nxd2 would leave e5 with no guard, and your knight would take it. So their king lands on d2, and it will never castle. You're still a pawn down, and they are a little better, but that e5 pawn depends on the knight on f3 alone. Your plan from here: bring the g8 knight around through e7 to g6 so both knights attack e5 and you win back the gambit pawn, and castle long to put a rook on d8 behind the wedge.", '…Qxd2+ — queens off; e5 is the target.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });


/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Fianchetto Variation': ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'Nf3', 'Nc6', 'g3', 'Nge7', 'Bg2', 'Ng6', 'O-O', 'Ngxe5', 'Nxe5', 'Nxe5', 'b3', 'c5', 'Bb2', 'Be7', 'e3', 'Nc6', 'Bxc6+', 'bxc6', 'exd4', 'cxd4', 'Qxd4', 'Qxd4', 'Bxd4', 'O-O', 'Re1'],
  'Lasker Trap': ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'e3', 'Bb4+', 'Bd2', 'dxe3', 'Bxb4', 'exf2+', 'Ke2', 'fxg1=N+', 'Ke1', 'Qh4+', 'Kd2', 'Nc6', 'Kc3', 'Qe4'],
  'Spassky Variation': ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'e4', 'Nc6', 'f4', 'f6', 'exf6', 'Nxf6', 'Bd3', 'Bb4+', 'Nd2', 'O-O', 'Nf3', 'Nh5', 'g3', 'Nxf4'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Fianchetto Variation': [
    ["g3 — the fianchetto, and the choice of half the masters. Picture the bishop on g2: it will gaze down the long diagonal, past f3 and your knight on c6, to b7 and a8. Hold on to that picture. They are a little better at this point, and the first thing you want is the gambit pawn back.", 'g3 — the fianchetto; Bg2 comes next.'],
    ["…Nge7 — a little over half the masters choose it, and the engine likes it most. Why e7? It's a stopover: the knight is on its way to g6, where it will be a second attacker on e5.", '…Nge7 — on its way to g6.'],
    ["Bg2 — nine in ten masters complete the fianchetto right away. For now the bishop on g2 is staring at its own knight on f3. Once that knight leaves, the diagonal is open as far as your knight on c6.", 'Bg2 — the bishop waits behind f3.'],
    ["…Ng6 — nearly every master plays it, and now the point is clear: both your knights, on c6 and g6, attack e5, and the knight on f3 is its lone defender. That pawn can't be held much longer.", '…Ng6 — both knights on e5.'],
    ["O-O — the engine's first choice. Their king tucks away, and they've given up on e5: with two of your knights on it and one of theirs defending, they'd rather finish developing than fight for that pawn.", 'O-O — castles and gives up e5.'],
    ["…Ngxe5 — you collect the pawn, and material is level again. Which knight captures? The one from g6, because the knight on c6 has a job to keep: it's the second defender of your wedge, and without it d4 would simply be taken. From e5 the knight attacks the knight on f3 and the c4 pawn, which has no protection.", '…Ngxe5 — material is level again.'],
    ["Nxe5 — they swap knights. Theirs on e5 attacks c6 and f7 and has no defender, so your knight on c6 takes it straight back.", 'Nxe5 — knights come off.'],
    ["…Nxe5 — the knight returns to the center, material is level, and c4 is under attack again. Now notice the long diagonal: with the knights gone from c6 and f3, their bishop on g2 looks right down to b7, and your b-pawn is pinned to the rook on a8. Don't forget that line.", '…Nxe5 — level, but b7 is pinned.'],
    ["b3 — the pawn protects c4, which your knight was attacking, and clears b2 for their dark-squared bishop: from there it will point down the long diagonal at your wedge. And e3 comes after that, to hit d4 with a pawn as well. After b3 it's about level.", 'b3 — protects c4; Bb2 next.'],
    ["…c5 — Bb2 is about to attack d4, so you back up the wedge with a pawn before it arrives. Natural, but the engine prefers …Bc5: the bishop defends d4 just as well, and it's a piece developed, with castling one move away. After …c5 your king still needs two moves to castle. They are a little better.", '…c5 — guards d4; …Bc5 was better.'],
    ["Bb2 — the bishop arrives on the long dark diagonal and attacks d4. Both their bishops now work on long diagonals: one against d4, the other pinning b7.", 'Bb2 — the bishop attacks d4.'],
    ["…Be7 — the engine's top choice: the bishop comes out and clears f8 for castling. And the wedge is holding: their bishop on b2 and queen on d1 attack d4, while your c5 pawn and your queen defend it.", '…Be7 — develops; castling comes next.'],
    ["e3 — and here's the lever. Now the e-pawn attacks d4 as well: three attackers against your two defenders. Can you just take it? No: your pawn on d4 is all that stands between the bishop on b2 and your knight on e5. Capture on e3, and once the queens come off, that knight is lost.", 'e3 — a lever against the wedge.'],
    ["…Nc6 — three attackers, so you bring a third defender: the knight drops back to c6 and covers d4. It also blocks the long diagonal in front of b7, so that pawn is no longer pinned. The catch? Bxc6+ can take the knight with check. The other way to play it was …Bg4, hitting their queen on d1 first. After …Nc6 they are a little better.", '…Nc6 — a third defender for d4.'],
    ["Bxc6+ — they trade the long-diagonal bishop for your knight, with check, removing a defender of d4 and doubling your c-pawns. The recapture has to be with the b-pawn: if you block with …Bd7, the bishop captures b7 and then the rook on a8.", 'Bxc6+ — a d4 defender goes, with check.'],
    ["…bxc6 — the b-pawn recaptures and the check is gone. Yes, your c-pawns are doubled and the a7 pawn stands alone. But look at what they gave up for that: the bishop that guarded their king. You have two bishops against bishop and knight, and h3 is open to your light-squared one, right beside their king. They are a little better.", '…bxc6 — doubled pawns, but two bishops.'],
    ["exd4 — the e-pawn captures the wedge. Three attackers against two defenders: that's a pawn, and taking back on d4 won't change it. But the bigger news is the e-file: there are no pawns left on it, and your king is still standing on e8.", 'exd4 — the wedge falls; the e-file opens.'],
    ["…cxd4 — the c5 pawn recaptures and puts a pawn back on d4. Count it, though: their bishop on b2 and queen on d1 attack it, and your queen is the only defender. This pawn won't survive. So think about what's left once it goes: a pawn down, the two bishops for it, and a king that still has to castle.", '…cxd4 — a new wedge, attacked twice.'],
    ["Qxd4 — the queen takes the pawn, and you're a pawn down. Now look where it's standing: in front of the bishop on b2, both of them aimed down the long diagonal at g7, which has no defender. Castle now and Qxg7 is mate. So your queen takes on d4 first, and the queens come off.", 'Qxd4 — queen and bishop aim at g7.'],
    ["…Qxd4 — queens off, and the mate on g7 goes with them. Keeping the queens on with …f6 costs over a pawn. Their bishop recaptures on d4.", '…Qxd4 — the queens come off.'],
    ["Bxd4 — the bishop recaptures, and they're up a pawn. Where does it point? At a7, and at g7, which is pinned to your rook on h8 and has no defender. Your next move has to deal with g7.", 'Bxd4 — attacks g7 and a7.'],
    ["…O-O — castling fixes it: the king defends g7 and the rook steps off h8, so the pin disappears. You're a pawn down with the bishop pair for it, and their knight on b1 still hasn't moved. Keep one idea ready: a rook to d8, hitting the bishop on d4. They are a little better.", '…O-O — g7 defended; a rook to d8 next.'],
    ["Re1 — the engine's choice: the rook grabs the open e-file and attacks your bishop on e7, which has no defender. They are a little better. Your plan from here: block the file with …Be6, which also attacks c4, then bring a rook to d8, and make the two bishops count while their knight is still sitting on b1.", 'Re1 — attacks the bishop on e7.'],
  ],
  'Lasker Trap': [
    ["e3 — the obvious answer to a pawn on d4: attack it with a pawn. It's a mistake. More than nine masters in ten play Nf3, which the engine much prefers; after e3 their edge is gone and it's about level. Why? It's all about f2, as you'll see once your pawn captures on e3. But not yet. First, a check.", 'e3 — attacks the wedge; a mistake.'],
    ["…Bb4+ — check first, and the order matters more than anything. Capture on e3 at once and their queen takes yours on d8 with check, because nothing stands between the two queens on the d-file. They'll want to block that check, and the block lands on d2, right in the middle of that file.", '…Bb4+ — check first, capture after.'],
    ["Bd2 — what both master games played, and the engine's top move too. The bishop blocks the check and plugs the d-file between the queens. But it's pinned: your bishop on b4 holds it to their king on e1.", "Bd2 — blocks, but it's pinned."],
    ["…dxe3 — now you capture. The pawn on e3 attacks the pinned bishop on d2 and the pawn on f2, and f2 is the real target. Their correct answer is fxe3, after which …Qh4+ keeps things sharp. But their bishop on d2 is looking right at yours on b4, and grabbing it is so tempting.", '…dxe3 — attacks d2 and f2.'],
    ["Bxb4 — the tempting capture, played in one of the two master games, and it loses on the spot. With their bishop gone from d2, the d-file between the queens is open again. The correct move was fxe3. After Bxb4 you are winning, and here's how.", 'Bxb4 — the blunder: the d-file reopens.'],
    ["…exf2+ — check, and the pawn also attacks the knight on g1. Can the king just take it? No: after Kxf2 your queen captures theirs on d1, straight down the open file. So the king must go to e2.", '…exf2+ — check, and g1 is attacked.'],
    ["Ke2 — the one safe square. Now your f2 pawn is a single step from promotion, by capturing the knight on g1. So the question becomes: what should it turn into?", 'Ke2 — your pawn can promote.'],
    ["…fxg1=N+ — a knight! This is the Lasker Trap. Why not a queen? A new queen on g1 gives no check, so their queen captures yours on d8, with check, and the whole trap falls apart. The knight gives check, and they never get time for that capture. You are winning.", "…fxg1=N+ — a knight, and it's check!"],
    ["Ke1 — the engine's choice: the king heads back home. Why not capture the new knight? Rxg1 walks into …Bg4+, a check that skewers the king and the queen behind it on d1. And f2 was no square for the king either: your queen takes theirs on d1.", 'Ke1 — home; Rxg1 meets …Bg4+.'],
    ["…Qh4+ — check again. Why not just trade queens on d1? Because your new knight on g1 has no way out yet, and once the queens are gone their rook simply takes it. So keep checking and give them no time. From h4 the queen also attacks c4 and h2, and only g3 or Kd2 gets them out of this one.", '…Qh4+ — keep checking; no queen trade.'],
    ["Kd2 — the king steps up to d2. Why not block with g3? Then …Qe4+ is check along the e-file, and your queen collects the rook on h1 next. So the king has to walk.", 'Kd2 — g3 would lose the h1 rook.'],
    ["…Nc6 — a fresh piece joins in, and it attacks two unprotected targets: the bishop on b4 and the pawn on e5. You're a piece up, and they have to rescue the bishop first.", '…Nc6 — attacks b4 and e5.'],
    ["Kc3 — the engine's choice, and it's quite a sight: their king walks up to c3 to protect the bishop on b4. A king in the middle of the board, so any check must be good? Careful. Your queen could take c4 with check, and that would be the end of it: the bishop on f1 guards that pawn.", 'Kc3 — the king protects the bishop.'],
    ["…Qe4 — the queen takes the center and attacks four things: the knight on b1 and the pawns on c4, e5 and g2. The unprotected one is e5, and capturing it would be check along the diagonal to c3. You are winning. Your plan from here: …Bg4 to attack their queen, …Qxe5+ to grab the pawn with check, and bring the g1 knight out through e2 before their rook on h1 can capture it.", '…Qe4 — attacks e5, b1, c4 and g2.'],
  ],
  'Spassky Variation': [
    ["e4 — an ambitious answer and a rare one, about two in a hundred master games, and the engine much prefers Nf3. The pawn grabs space beside the wedge, but see what it gives you: with their e-pawn moved past, no pawn of theirs stands in front of your d4 pawn on the c-, d- or e-file. Your wedge has become a passed pawn. After e4 it's about level.", 'e4 — space, but d4 is now passed.'],
    ["…Nc6 — nearly every master's move. Could you take the e-pawn en passant instead? You could, and it would be a mistake: their queen takes yours on d8 with check, your king has to recapture, and the passed pawn is gone. So the wedge stays where it is, and the knight attacks e5, which nothing protects, because their knight never went to f3.", '…Nc6 — attacks the unprotected e5.'],
    ["f4 — every master here defends e5 with the f-pawn. Look at the center they've built: pawns on c4, e4, e5 and f4. Impressive, but it's only pawns. Not one of their pieces has left its starting square. The engine prefers the quiet a3, which guards b4 and leaves the e5 pawn to look after itself.", 'f4 — defends e5; a3 was better.'],
    ["…f6 — the e5 pawn's only defender now is the pawn on f4. So hit it again, with a pawn: knight and f-pawn against that one defender. If they capture on f6, one of your pieces takes back and develops; if they don't, you take on e5. Roughly half the masters play this; almost as many prefer …g5, attacking f4. …f6 is the engine's first choice, and it's about level.", '…f6 — a pawn challenges e5.'],
    ["exf6 — they capture, and their new pawn on f6 attacks g7. It can't survive there: your queen, your g8 knight and your g-pawn can all take it. Which one should?", 'exf6 — they capture on f6.'],
    ["…Nxf6 — the knight. Why not the others? Take with the g-pawn and Qh5+ is check: your king has to move, and it never castles. Take with the queen and e5 comes, a pawn hitting it with tempo. The knight develops and attacks e4, which has no defender. You are a little better.", '…Nxf6 — develops, attacks e4.'],
    ["Bd3 — the engine's choice, and a necessary one: the bishop defends e4. Nf3 or a3 instead would just let your knight capture on e4.", 'Bd3 — defends e4.'],
    ["…Bb4+ — the engine's top move, and the very check a3 would have stopped. The bishop comes out with tempo, protected by your knight on c6, and f8 is cleared for castling. They have to answer the check first. You are a little better.", '…Bb4+ — the check a3 would have stopped.'],
    ["Nd2 — the engine's choice is to block with the knight; Kf1 would throw away castling for good. Now the knight on d2 is pinned against their king on e1 by your bishop on b4.", 'Nd2 — blocks; the knight is pinned.'],
    ["…O-O — the engine's choice. Castle, and your rook arrives on f8, behind your knight on the half-open f-file. As soon as that knight jumps away, the rook is staring at f4.", '…O-O — a rook on the f-file.'],
    ["Nf3 — their kingside knight develops and attacks your d4 pawn, which your queen and your knight on c6 protect. But look at their f4 pawn: the bishop on c1 can't defend it, because their own knight on d2 blocks the way.", 'Nf3 — attacks d4; f4 is undefended.'],
    ["…Nh5 — and this is why you castled. A move ago the knight couldn't go to h5: their queen on d1 would simply have taken it. Now their own knight on f3 is in the way. So the knight steps to the edge, hits f4, and uncovers your rook on f8, which hits f4 too. Two attackers, zero defenders. You are a little better.", '…Nh5 — knight and rook hit f4.'],
    ["g3 — the engine's best: the pawn defends f4. But count again: your knight and rook attack f4, and that pawn is its only defender. You can capture, at the price of a piece for two pawns. With which piece?", 'g3 — defends f4.'],
    ["…Nxf4 — the knight takes the pawn, material is level again, and it attacks the bishop on d3, which has no defender; it's the engine's first choice. If they castle, you take that bishop for nothing. So they capture, gxf4, and your rook recaptures: a knight for two pawns, and it's about level. Your plan from here: once the rook lands on f4, pin their f3 knight to the queen with …Bg4 and keep piling up on the f-file while their pieces are tied up.", '…Nxf4 — attacks d3; a knight for two pawns.'],
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

export const ALBIN_COUNTERGAMBIT_WATCH: WatchCourse = {
  openingId: 'albin-countergambit',
  title: 'Albin Countergambit — A Master Class',
  orientation: 'black',
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Albin_Countergambit'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
