// GothamChess's Ponziani — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet (`LESSON_FACTS=1
// LESSON_IDS=pro-gothamchess-ponziani`, graded at depth 16): masters'
// percentages, engine lines, the board after each move. The student plays
// White. Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud
// register (§2a). One story runs through every line: c3 prepares d4 and opens
// the road from d1 to a4 for the queen. The last two tabs are lines taught for
// this opening in the repertoire's videos; where each of the others went is
// recorded in docs/levy-lines/decisions/pro-gothamchess-ponziani.json.
//
// The "Main Line 3...Nf6 4.d4" tab plays the main line's own moves, so its
// lesson is the main line's beats, said the same way.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'Nf6', 'd4', 'exd4', 'e5', 'Nd5', 'Qb3', 'Nb6', 'cxd4', 'd6', 'Bb5', 'Be6', 'Bxc6+', 'bxc6', 'Qc2', 'Qd7', 'O-O'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4: a little under half of all master games begin this way, and it's the engine's first pick too. The pawn grabs a central square and frees your queen and the bishop on f1. Keep the c-pawn in mind: a quiet push with it is the idea this whole course is built on.", 'e4 — grabs the center.'],
  ["…e5, about a quarter of masters; the Sicilian, …c5, is played about twice as often. Their pawn takes its own share of the center, and now there's a target right in front of you: e5.", '…e5 — a pawn, and a target.'],
  ["Nf3, nine masters in ten, and the engine's choice. The knight comes out with a threat: it hits e5, and right now nothing guards that pawn. So they have to look after it first.", 'Nf3 — hits the loose e5.'],
  ["…Nc6, almost nine masters in ten, and the engine's first pick: the knight guards e5 and develops toward the center. Now most masters reach for a bishop, Bb5 or Bc4. You're going to do something quieter.", '…Nc6 — guards e5.'],
  ["Here's the Ponziani: c3. Only about one master in a hundred plays it; two in three play Bb5, and the engine prefers Bb5 too. So why c3? It prepares d4 with a second pawn behind it: if they ever take on d4, your c-pawn takes back and you still have two pawns in the center. It also opens the diagonal from d1 to a4 for your queen, and that matters later. The price is the c3 square, which your knight on b1 no longer gets. It's about level: a surprise weapon, not a refutation.", 'c3 — prepares d4, frees the queen.'],
  ["…Nf6, about six masters in ten, and it goes straight at your e4 pawn. With c3 played, your knight can't come to c3 to guard it, and right now nothing guards e4 at all. You could prop it up with d3, but then …d5 hits it a second time. So: defend, or hit back?", '…Nf6 — hits the loose e4.'],
  ["d4, eight masters in ten, and the engine's choice: you hit back instead of defending. The pawn attacks e5: this is the move c3 prepared, and it has an answer ready for both captures. If they take on d4, the c-pawn recaptures. If the knight takes e4, d5 kicks the knight on c6, the only guard of e5.", 'd4 — hits e5, as c3 planned.'],
  ["…exd4, about one master in five; most grab your e4 pawn with the knight instead. Their pawn on d4 now hits c3, and your e4 pawn is still loose. So, take back on d4 as planned? Not yet.", '…exd4 — takes; your e4 still loose.'],
  ["e5 first, nearly every master's choice and the engine's too. The pawn hits the knight on f6, and it steps your e-pawn off the square where it was loose. Take on d4 instead, and the knight on f6 is still hitting e4. The pawn on d4 can wait; the knight can't. Where does it go?", 'e5 — kicks the knight first.'],
  ["…Nd5, six masters in ten: the knight jumps to the center, away from your e-pawn, and from d5 it hits c3. …Ne4 is the other main try, about one in three. But look closely at d5: nothing of theirs guards that knight. Remember that.", '…Nd5 — central, but unguarded.'],
  ["Qb3. Remember that unguarded knight? The queen hits it, and the b7 pawn too: a double attack. Bringing the queen out this early is usually a way to lose time, but here it arrives with threats. And your c3 pawn, still hit by their pawn on d4? If they grab it with …dxc3, Qxd5 wins the knight. It's about level, and they have to spend their move on the knight.", 'Qb3 — hits d5 and b7.'],
  ["…Nb6, the engine's choice, and by a lot: the other knight moves cost them more than a pawn. On b6 the knight is safe, and it stands in front of b7, so your queen no longer hits that pawn either. One move, both threats answered. Now you can take back on d4.", '…Nb6 — saves the knight, shields b7.'],
  ["cxd4, the engine's choice: now the pawn comes back. Why the pawn and not the knight? A knight on d4 has let go of e5, and …Nxe5 simply takes it. This way the d4 pawn stands behind e5 and guards it: the big center c3 was played for. Material is level again. How will they attack it?", 'cxd4 — the d4–e5 center.'],
  ["…d6, the engine's choice: they strike at the front of your chain, the e5 pawn, and open the diagonal for their bishop on c8. Count it: e5 is hit by the d6 pawn and the knight on c6, and guarded by your d4 pawn and the knight on f3. Two against two, so it holds. But can you take one of those attackers out of the fight?", '…d6 — hits the front of the chain.'],
  ["Bb5, the engine's first choice, and there's the answer: the bishop pins the knight on c6 to their king. That knight was one of the two pieces hitting e5, and a knight pinned to the king can't move at all. And if they take anyway with …dxe5? Then Nxe5, and your knight is hitting the pinned knight too.", 'Bb5 — pins c6, eases e5.'],
  ["…Be6, the engine's choice: the bishop develops and hits your queen on b3. So the queen has to move. But before it does, look for a capture with check.", '…Be6 — hits your queen.'],
  ["Bxc6 check. You give up the bishop for the knight, and because it's check, your queen on b3 gets its free move afterward. Only one recapture makes sense, with the b-pawn: blocking with the knight or the bishop instead costs them more than five pawns.", 'Bxc6+ — the trade, with check.'],
  ["…bxc6: material is level again, but look at their pawns. The c-pawns are doubled on c6 and c7, and the a7 pawn has no neighbor left. And your queen, still hit by the bishop on e6, gets its move now.", '…bxc6 — doubled c-pawns.'],
  ["Qc2, the engine's choice: the queen steps out of the bishop's way and onto the half-open c-file. Look what's at the end of it: the c6 pawn, with no guard, and Qxc6 would come with check. They'll want to cover it.", 'Qc2 — hits the loose c6.'],
  ["…Qd7, the engine's choice: the queen guards c6, so the check is off. It also backs up the bishop on e6: watch for …Bf5, hitting your queen. It's about level: you gave up your light-squared bishop for those doubled pawns, and your king is still in the center. Time to fix that.", '…Qd7 — guards c6, backs …Bf5.'],
  ["You castle, and it's about level: the king is safe on g1, and your rook can come to e1, right behind the e5 pawn. Your plan for the middlegame: Nc3 and Re1 to support the d4–e5 center, and keep your queen trained on their doubled c-pawns, the c6 pawn first.", 'O-O — king safe, Re1 next.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line (or an earlier tab) doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Main Line 3...Nf6 4.d4': MAIN,
  '3...d5 Central Counter': ['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'd5', 'Qa4', 'Nf6', 'Nxe5', 'Bd6', 'Nxc6', 'bxc6', 'd3', 'O-O', 'Be2', 'Re8', 'Nd2', 'Bg4', 'f3', 'Bc8', 'Qd4'],
  '4…Nxe4 (dxc6)': ['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'Nf6', 'd4', 'Nxe4', 'd5', 'Bc5', 'dxc6', 'Bxf2+', 'Ke2', 'Bb6', 'Qd5', 'Nf2', 'Rg1', 'O-O', 'cxb7', 'Bxb7', 'Qxb7'],
  '3...Bc5 Big Center': ['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'Bc5', 'd4', 'exd4', 'cxd4', 'Bb6', 'd5', 'Nce7', 'd6', 'cxd6', 'Nc3', 'Nf6', 'Bg5', 'd5', 'Bxf6', 'gxf6', 'Qd2'],
  '6.Bc4 Gambit': ['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'Nf6', 'd4', 'exd4', 'e5', 'Nd5', 'Bc4', 'Nb6', 'Bb3', 'dxc3', 'Nxc3', 'd5', 'Nxd5', 'Be6', 'Bg5', 'Qd7', 'Nxb6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Main Line 3...Nf6 4.d4': [],
  '3...d5 Central Counter': [
    ["…d5, about a third of masters, and the engine's first choice: instead of developing, they hit your center at once, before d4 can come. The pawn attacks e4, and nothing of yours guards it. You could take on d5, but then their queen recaptures right in the middle of the board. Is there something sharper?", '…d5 — hits the loose e4.'],
    ["Qa4, eight masters in ten and the engine's choice, and here's the second point of c3: the road from d1 to a4 is open. The queen pins the knight on c6 to their king, so that knight no longer really guards e5. And along the fourth rank, the queen guards your e4 pawn too.", 'Qa4 — pins c6, guards e4.'],
    ["…Nf6, only about six masters in a hundred; the masters' top answer is …f6, propping up e5. The knight hits e4 a second time, but count the guards of e5: only the knight on c6, and it's pinned. So what's loose?", '…Nf6 — hits e4, forgets e5.'],
    ["Nxe5, nearly nine masters in ten, and the engine's choice: take the pawn. That's the pin paying off: the one piece that could take your knight back is the knight on c6, and it can't move. But isn't your e4 pawn hanging now? Let them take it: after …dxe4, Bc4 joins your knight, both of them aimed at f7, and only their king guards f7.", "Nxe5 — the pinned knight can't recapture."],
    ["…Bd6, every master: the bishop hits your knight on e5, and this time the attacker isn't pinned. The knight can't stay. Should it retreat, or take something on the way out?", '…Bd6 — hits your e5 knight.'],
    ["Nxc6, nine masters in ten: the knight takes the pinned piece on its way out, and from c6 it hits their queen on d8. Your queen on a4 guards it, so they have to take back right now.", 'Nxc6 — takes, hits their queen.'],
    ["…bxc6: you're a pawn up, and their c-pawns are doubled. Qxc6 check looks like a free second pawn. It isn't: …Bd7 blocks with a hit on your queen, and while it runs, e4 falls. Look at e4: the d5 pawn and the knight on f6 both hit it, and only your queen guards it. So it's only about level, and that pawn needs help.", '…bxc6 — a pawn up; leave c6 alone.'],
    ["d3, the engine's choice: the pawn guards e4 a second time, so it holds, and it opens the diagonal for your bishop on c1. Be2 first looks natural, but then …dxe4 comes, and that costs you about two thirds of a pawn.", 'd3 — e4 holds.'],
    ["…O-O, the engine's choice: their king leaves the e-file, so the pin on c6 is gone, and the rook on f8 can come to e8 and line up against e4.", '…O-O — the pin is gone.'],
    ["Be2: the bishop develops and clears f1, so you're one move from castling. With d3 in, the quiet move is safe now.", 'Be2 — develops, castling next.'],
    ["…Re8: the rook arrives on the e-file and hits e4. Count again: the rook, the d5 pawn and the knight on f6 hit it; your d3 pawn and the queen guard it. Three against two. And your king is still on e1, on that same file.", '…Re8 — a third hit on e4.'],
    ["Nd2: the knight guards e4 a third time, three against three, so it holds. Why not castle first? Then they take twice on e4 and win the pawn, and that costs you about a full pawn. Defend first, castle after.", 'Nd2 — e4 holds; castle later.'],
    ["…Bg4, the engine's choice: the bishop develops and hits yours on e2, offering a trade. Do you take it, or keep your bishop?", '…Bg4 — hits your e2 bishop.'],
    ["f3, the engine's choice: the pawn hits the bishop and guards e4 a fourth time, so that pawn is solid for good. Why not trade on g4? Then their knight lands on g4 and their queen follows to h4, both aimed at f2, right next to your king.", 'f3 — kicks the bishop, e4 solid.'],
    ["…Bc8, the engine's choice: the bishop goes all the way home. Why so far? From c8 it still sees down the diagonal to h3, it can come out to a6 with the b-pawn gone, and it keeps …Bd7 in reserve: the answer, again, if your queen ever grabs on c6.", '…Bc8 — back home, still active.'],
    ["Qd4: the queen leaves the edge for the center, where it hits a7, d5 and the knight on f6, and it's about level. You're still a pawn up, with e4 held by the pawns on d3 and f3. Your plan for the middlegame: bring the queen to f2 and castle, then go after their doubled c-pawns while e4 stays solid.", 'Qd4 — central; Qf2 and castle next.'],
  ],
  '4…Nxe4 (dxc6)': [
    ["…Nxe4, the masters' main move, almost six in ten, and the engine's first choice: they take the pawn you left loose. From e4 the knight hits c3 and f2. Remember f2. Can you just take back on e5 with the pawn? No: …Bc5 brings a second piece to f2, and only your king guards it. So first you kick the piece that guards their e5 pawn.", '…Nxe4 — grabs the loose pawn.'],
    ["d5, nearly every master: the pawn hits the knight on c6. Why that knight? It's the only piece guarding e5, so once it moves, your knight on f3 can take e5. Bd3, hitting the knight on e4, is about as good.", 'd5 — kicks the guard of e5.'],
    ["…Bc5: only about one master in ten plays it, yet it's the engine's first choice. They ignore the attack on c6 and bring that second piece to f2 anyway: knight and bishop against your king alone. They are a little better, so you need to know what comes next.", '…Bc5 — ignores c6, hits f2.'],
    ["Do you have to defend f2? No. Take the knight on c6 first: nine masters in ten do, and the engine agrees. Guarding f2 with your bishop on e3 costs more than a pawn. For the moment you're a piece up for a pawn, and your pawn on c6 hits b7 and d7. But f2 is about to go.", 'dxc6 — takes the knight first.'],
    ["…Bxf2 check, nearly every master, and the engine's choice. Why not take with the knight and hit your queen and rook at once? Because then your queen jumps to d5, hitting the loose bishop on c5, and next move the rook steps aside. So the bishop takes, with check, and your king has only one square, e2.", '…Bxf2+ — check; only Ke2.'],
    ["Ke2, the only legal move. Your king is out in the open, but it now touches the bishop on f2. That bishop is guarded only by the knight on e4, so the moment the knight moves, your king takes it.", 'Ke2 — forced, next to f2.'],
    ["…Bb6, the engine's choice: the bishop steps back to safety, and look at the square it left. f2 is free for their knight now, and from there it would hit your queen on d1 and the rook on h1 at once. They are a little better. But that knight on e4 has no guard: can your queen get off d1 with a threat of its own?", '…Bb6 — clears f2 for the knight.'],
    ["Qd5, the engine's choice: the queen gets off d1 before the knight can land on f2, and it leaves with threats. The knight on e4 and the e5 pawn have no guard, and f7 is hit as well. If they stop to take on c6, Qxe4 wins the knight.", 'Qd5 — hits e4, e5 and f7.'],
    ["…Nf2, the engine's choice: the knight escapes, and from f2 it hits your rook on h1, which nothing guards. So: save the rook, or grab something first?", '…Nf2 — hits your h1 rook.'],
    ["Rg1: save the rook. What about grabbing first? Qxe5 check gains nothing: …Kf8, and your rook still hangs. The engine does prefer cxb7 here, letting the rook go for their bishop, and after Rg1 they are clearly better. But the rook is safe, and b7 is still there to take next.", 'Rg1 — saves the rook.'],
    ["…O-O, the engine's choice: their king gets safe and the rook comes to f8. But now the f7 pawn is pinned to their king by your queen on d5. They are a little better, and b7 is next.", '…O-O — f7 pinned by your queen.'],
    ["cxb7, the engine's choice: the pawn takes and forks the rook on a8 and the bishop on c8, so they have to take it right away. Anything else costs them more than two pawns.", 'cxb7 — forks a8 and c8.'],
    ["…Bxb7: the bishop takes back and hits your queen on d5. But look: nothing guards that bishop on b7.", '…Bxb7 — hits your queen, unguarded.'],
    ["Qxb7: the queen takes the bishop, and now you have two extra pieces for two pawns, with your queen hitting a7, a8, b6 and c7. Even so, they are a little better: your king is stuck on e2, and their pieces are coming, the queen first, to f6. Your plan for the middlegame: Na3 and Nc4 to challenge the bishop on b6, the queen back to d5, your king to safety, and only then cash in the extra material.", 'Qxb7 — two pieces up; king first.'],
  ],
  '3...Bc5 Big Center': [
    ["…Bc5: the bishop heads for its square from the Italian, aiming at f2. It looks natural, but hardly any master plays it here, and the engine prefers …d5 by more than a pawn, because this walks straight into what c3 prepared. You are a little better. What does your d-pawn hit if it steps forward now?", '…Bc5 — natural, but walks into d4.'],
    ["d4, the engine's choice, and there's the point of c3. The pawn hits two things at once: the e5 pawn, and the bishop on c5, which nothing guards. And if they take on d4, your c-pawn takes back and hits the bishop all over again.", 'd4 — hits e5 and c5.'],
    ["…exd4, the engine's choice: they take, and now their pawn on d4 hits c3. So you take back, with the pawn, as planned.", '…exd4 — takes on d4.'],
    ["cxd4, the engine's choice: two pawns side by side on d4 and e4, the big center c3 was played for, and the bishop on c5 is hit again. You are a little better.", 'cxd4 — the big center, hits c5.'],
    ["…Bb6: the bishop steps back to a diagonal where it still hits your d4 pawn. A check on b4 was the other try, but there Nc3 simply blocks and develops. Now your center gets to move: which pawn goes first?", '…Bb6 — still hits d4.'],
    ["d5: the pawn marches on and hits the knight on c6, so they spend another move retreating while your pieces are still at home. Nc3 first is about as good.", 'd5 — kicks the knight.'],
    ["…Nce7, the engine's choice: the knight backs off to e7, where it hits your d5 pawn. Your pawn there is guarded by the queen and the e4 pawn. Hold it, or push it further?", '…Nce7 — hits d5.'],
    ["Push it, and right now: d6, the engine's first choice. Wait one move with Nc3 and they play …d6 themselves, and the door is shut. Now your pawn hits c7 and the knight on e7. They can win it, but look at what the capture leaves behind.", 'd6 — now, before …d6 shuts it.'],
    ["…cxd6, the engine's choice: they win the pawn, so you're a pawn down. But see the price: their d-pawns are doubled on d6 and d7, and the front one has no guard. Your queen on d1 is already looking straight at it.", '…cxd6 — wins a pawn, doubles d-pawns.'],
    ["Nc3, the engine's choice: develop first, grab later. Why not Qxd6 right now? Because …Nf6 hits e4 while your queen is out on d6, and their knight goes on to g4, where it hits f2. So your knight comes out first: it guards e4 and covers d5, the square their d6 pawn would like to reach.", 'Nc3 — develop first, grab later.'],
    ["…Nf6, the engine's choice: the second knight comes out and hits e4, which your knight on c3 guards. Which of your pieces comes out next, and with what threat?", '…Nf6 — hits e4.'],
    ["Bg5, the engine's choice: the bishop develops with a hit on the knight on f6, the piece pressing on your e4 pawn. You are clearly better.", 'Bg5 — hits the f6 knight.'],
    ["…d5, the engine's choice: the front d-pawn steps up and hits e4, so now the pawn and the knight on f6 are both aimed at it, against your knight on c3 alone. Take on d5, or take on f6 first?", '…d5 — a second hit on e4.'],
    ["Bxf6, the engine's choice: remove the knight first, one of the two pieces hitting e4. And they have to take back with the g-pawn at once. Leave your bishop on f6, and next it takes on g7, hitting the rook in the corner, or on e7. So the recapture is forced. Watch what it does to their kingside.", 'Bxf6 — the g-pawn must take back.'],
    ["…gxf6, the engine's choice: the g-pawn takes back, and their kingside is broken: doubled f-pawns, and an h-pawn with no neighbor. Now only the d5 pawn hits e4.", '…gxf6 — the kingside is broken.'],
    ["Qd2, the engine's choice: the queen steps up the d-file and hits d5, together with your knight on c3. You're a pawn down, but you are a little better: their pawns are doubled on the d-file and the f-file. Your plan for the middlegame: castle long, so your rook lands on d1 behind the queen, then take on d5 and go after the broken kingside.", 'Qd2 — hits d5; castle long next.'],
  ],
  '6.Bc4 Gambit': [
    ["Bc4: instead of the queen, the bishop goes after the knight on d5, which nothing guards. And notice what you're leaving alone: their pawn on d4 still hits c3, and you're not taking it back. Can they just grab it? Not yet: after …dxc3, Qxd5 wins the knight. So the knight has to move first, and only then does the pawn on c3 become a real gambit. It's about level.", 'Bc4 — hits d5, gambit style.'],
    ["…Nb6, the engine's choice: the knight retreats and hits your bishop on c4 in return, and nothing guards your bishop. So it has to move again.", '…Nb6 — hits your c4 bishop.'],
    ["Bb3, the engine's choice: the bishop keeps its diagonal, aimed at f7, a pawn only their king guards. Bd3 or Be2 would cost you about four tenths of a pawn.", 'Bb3 — stays on the f7 diagonal.'],
    ["…dxc3, the engine's choice: with the knight safe, now they take the gambit pawn, so for the moment you're two pawns down, and their pawn on c3 hits b2. But nothing guards it.", '…dxc3 — accepts; c3 unguarded.'],
    ["Nxc3, the engine's choice: the knight takes back and develops in one move. Castling first lets …cxb2 grab a second pawn, about three quarters of a pawn worse for you. Now you're one pawn down, with your bishop and knight out and the e5 pawn covering d6 and f6, so their pieces can't use them.", 'Nxc3 — recaptures and develops.'],
    ["…d5, the engine's choice: the pawn steps up two squares and frees their bishop on c8. It's about level. But now your knight on c3 and the bishop on b3 both hit d5, and your e5 pawn can take it en passant.", '…d5 — frees the c8 bishop.'],
    ["Nxd5: two ways to take, and you pick the knight. Taking en passant would trade away your e5 pawn, the one that covers d6 and f6 and keeps their pieces off them. This way it stays, and from d5 your knight hits the knight on b6 and the pawn on c7. If they trade with …Nxd5, your queen takes back. Material is even again, and it's about level.", 'Nxd5 — keeps the e5 pawn.'],
    ["…Be6, the engine's choice: the bishop develops and hits your knight on d5. Counting the queen on d8 and the knight on b6, that's three attackers, against your bishop on b3 and your queen. So you need something with force.", '…Be6 — a third hit on d5.'],
    ["Do you have to save the knight? No. Bg5, the engine's choice: the bishop hits their queen, one of the three pieces aimed at d5, so they have no time to take. The trade on b6 will still be there next move; their queen can't wait.", 'Bg5 — hits their queen.'],
    ["…Qd7, the engine's choice: the queen steps out of the attack and still hits d5, along with the bishop on e6 and the knight on b6. Time to cash in before the knight is lost.", '…Qd7 — still hits d5.'],
    ["Nxb6: the knight takes the knight, and from b6 it hits the rook on a8 and the queen on d7, so they have to take back. It's about level. Your plan for the middlegame: after …axb6, trade queens on d7 and get castled, with the d-file open for your rook and your bishop on b3 aimed at their bishop on e6.", 'Nxb6 — takes; queens off next.'],
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

export const PRO_GOTHAMCHESS_PONZIANI_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-ponziani',
  title: "This repertoire's Ponziani — the c3-d4 Centre and Qb3 Bind",
  orientation: 'white',
  sources: [
    'concept:pos-center',
    'concept:pos-development',
    'https://www.chess.com/openings/Ponziani-Opening',
    'https://en.wikipedia.org/wiki/Ponziani_Opening',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
