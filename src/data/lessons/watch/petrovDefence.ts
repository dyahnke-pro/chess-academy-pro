// Petrov Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=petrov-defence`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a).
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'd4', 'd5', 'Bd3', 'Nc6', 'O-O', 'Be7', 'c4', 'Nb4', 'Be2', 'O-O', 'Nc3', 'Bf5', 'a3', 'Nxc3', 'bxc3', 'Nc6', 'Bf4', 'Na5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — the most common first move: it takes the center and opens lines for their bishop on f1 and their queen. The Petrov meets it head on, pawn for pawn and then knight for knight.", "e4 — they take the center."],
  ["…e5 — your pawn stands right opposite theirs, so their e-pawn can't advance, and your bishop on f8 and your queen get room. Symmetry is the whole spirit of the Petrov, and it starts here.", "…e5 — your share of the center."],
  ["Nf3 — the knight develops with a threat: it hits your e5 pawn, and nothing guards it. The usual answer is …Nc6. But their e4 pawn has no guard either, and that is the question the Petrov asks.", "Nf3 — develops, hits e5."],
  ["…Nf6 — the Petrov. Do you have to defend e5? No: you hit back at e4, which is just as loose. Whatever they take, you take. That is why it is known as a rock-solid drawing weapon, but it hides one trap you must know, and you meet it on your very next move.", "…Nf6 — the Petrov: hit e4 back."],
  ["Nxe5 — the main move and the most testing: they grab your pawn, and their knight on e5 eyes f7. Their e4 pawn is still hanging, so you will win yours back. The only question is how, and the obvious way is wrong.", "Nxe5 — grabs a pawn, eyes f7."],
  ["…d6 — the move-order trap every Petrov player has to know. Grab …Nxe4 at once and Qe2 hits the knight, which can't step away: Nc6 would uncover check on your king and win your queen. So kick their knight first, take on e4 after. Masters play …d6 almost every time, while club players grab …Nxe4 in about one game in four.", "…d6 — kick the knight, then take e4."],
  ["Nf3 — where does the knight go? Back to f3: on d3 it would block their d-pawn, and on c4 your …b5 could kick it. The wild Nxf7 has a tab of its own. And now their e4 pawn has no guard.", "Nf3 — retreats, e4 is unguarded."],
  ["…Nxe4 — now you take, and material is level. The e-pawns are gone and the e-file is open, with your knight in the center on e4. It looks comfortable, but a knight that far forward needs a guard, and their next moves are all about attacking it.", "…Nxe4 — pawn back, level material."],
  ["d4 — the main road. The pawn takes the center and frees the bishop on c1, and Bd3 is coming to hit your knight. So what does your knight need before that happens? A guard. The quieter Nc3 has tabs of its own.", "d4 — center pawn, Bd3 comes next."],
  ["…d5 — there's the guard, and your stake in the center. When Bd3 hits your knight, the pawn already holds it. And look at the structure it makes: their d4 pawn is fixed on a dark square, a target your dark-squared bishop can aim at later.", "…d5 — guards the e4 knight."],
  ["Bd3 — the bishop hits your knight and clears the way to castle. Why not Bb5 with check? Your …c6 would simply kick it. Your knight is held by d5, so no panic: you just keep developing.", "Bd3 — hits e4, castling next."],
  ["…Nc6 — which piece first? Either bishop move is fine, but the knight comes with a point: it hits d4. Follow it forward: when c4 and cxd5 come and your queen takes back, their d4 pawn is left isolated, and this knight is already aimed at it.", "…Nc6 — develops, hits d4."],
  ["O-O — king safe, rook to f1. Now look at your knight on e4 again: its only support is the d5 pawn. Knock out d5 and the knight wobbles, and that is exactly what their next move goes after.", "O-O — king safe, d5 is next."],
  ["…Be7 — why not the active …Bb4? Their a-pawn would kick it. On e7 the bishop is modest but safe, and it clears your king's way to castle. One idea to keep for later: if their knight ever comes to c3, you take it, and bxc3 leaves them doubled c-pawns.", "…Be7 — develop, castle next."],
  ["c4 — the pawn break, hitting d5, the pawn that holds your knight. But every pawn move leaves something behind: with the c-pawn gone from c2, no pawn of theirs can ever cover d3 again, and your knight on c6 reaches it in two hops, via b4.", "c4 — hits d5, the knight's support."],
  ["…Nb4 — there's the hop. Instead of just defending d5, the knight guards it and hits their bishop on d3, the only piece guarding c4. And if they take your other knight with Bxe4, the d-pawn takes back and hits their knight on f3. Pressure, answered with pressure.", "…Nb4 — hits d3, guards d5."],
  ["Be2 — the main move. They won't give up the bishop, so it steps back to e2, still guarding c4. The cost is time: your knight on b4 stays a nuisance, and they will have to spend a3 to send it away.", "Be2 — keeps the bishop, guards c4."],
  ["…O-O — castle before the center opens. Why not grab c4? After …dxc4 Bxc4 their bishop is back in play on an active square, and you've given up your central pawn to put it there. Castling keeps the tension, and your king is safe before Nc3 arrives.", "…O-O — king safe first."],
  ["Nc3 — the main move, and a direct one: the knight hits your knight on e4 and adds a second attacker on d5. If you take on c3, the b-pawn takes back toward the center. First, though, how do you keep e4 held?", "Nc3 — hits e4 and d5."],
  ["…Bf5 — with a developing move. The bishop comes out ahead of your pawns and gives the knight a second guard, and that finishes your minor pieces. …Be6, guarding d5 instead, is the main alternative.", "…Bf5 — develops, guards e4 again."],
  ["a3 — now they come for the knight on b4. Where does it go? The natural …Nc6 drops d5, since Nxd5 takes it with their knight still on c3. And a3 has a cost of its own: no pawn of theirs can ever cover b3 again.", "a3 — kicks the b4 knight."],
  ["…Nxc3 — not the retreat yet: first take the knight that hits d5. On c3 yours hits their queen and the bishop on e2, so they must take back, and bxc3 leaves them doubled pawns on c3 and c4. Those two pawns are what you play against from here on.", "…Nxc3 — trade first, bxc3 doubles their c-pawns."],
  ["bxc3 — forced, with a sting: the new pawn on c3 hits your knight on b4. Where can it go? …dxc4 drops it to axb4, and …Nd3 runs into Bxd3. Back to c6 is the safe square.", "bxc3 — doubled pawns, hits b4."],
  ["…Nc6 — back to its natural square, hitting d4 again. …Na6 looks just as safe, but on the rim the knight does little, and after Qb3 and cxd5 it costs you a pawn.", "…Nc6 — back to c6, eyes d4."],
  ["Bf4 — their last minor piece comes out, aimed at your c7 pawn. It also covers d6, so …Bd6 now would just trade bishops. With their pieces all out, the fight turns to the structure, and the doubled c-pawns are yours to press.", "Bf4 — eyes c7, development done."],
  ["…Na5 — remember the doubled c-pawns? The knight goes after the front one: c4 is now hit by your knight and your d5 pawn, with only their bishop on e2 holding it. And remember b3, the square a3 gave up? The knight eyes that too. Your plan for the middlegame: get the knight to c4, clamp the queenside with …b5, and grind those weak pawns into a better endgame.", "…Na5 — hits c4, eyes b3."],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });


/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Classical Variation': ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'd4', 'd5', 'Bd3', 'Nc6', 'O-O', 'Be7', 'c4', 'Nb4', 'Be2', 'O-O', 'Nc3', 'Bf5', 'a3', 'Nxc3'],
  'Steinitz Variation': ['e4', 'e5', 'Nf3', 'Nf6', 'd4', 'Nxe4', 'Bd3', 'd5', 'Nxe5', 'Nd7', 'Nxd7', 'Bxd7', 'O-O', 'Bd6', 'c4', 'c6', 'Nc3', 'Nxc3', 'bxc3', 'O-O', 'cxd5', 'cxd5', 'Qh5', 'g6', 'Qxd5', 'Qc7', 'Bh6', 'Rfd8', 'Qg5', 'Qxc3'],
  'Three Knights Game': ['e4', 'e5', 'Nf3', 'Nf6', 'Nc3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bb4', 'Nxc6', 'bxc6', 'Bd3', 'd5', 'exd5', 'cxd5', 'O-O', 'O-O', 'Bg5', 'Be6', 'Qf3', 'Be7', 'Bxf6', 'Bxf6'],
  'Cochrane Gambit': ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nxf7', 'Kxf7', 'd4', 'Be7', 'Nc3', 'Re8', 'Bc4+', 'Be6', 'Bxe6+'],
  'Italian Variation': ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'Nc3', 'Nxc3', 'dxc3', 'Be7', 'Be3', 'Nc6', 'Qd2', 'Be6', 'O-O-O', 'Qd7', 'Kb1', 'O-O-O', 'Bd3', 'd5', 'Nd4', 'Nxd4', 'Bxd4', 'Bf6', 'Bxf6', 'gxf6', 'f4', 'Kb8', 'Rhe1', 'Rhe8'],
  '5.Bd3 Line': ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'd4', 'd5', 'Bd3', 'Bd6', 'O-O', 'O-O', 'c4', 'c6', 'Qc2', 'Na6', 'a3', 'Bg4', 'Nbd2', 'Nxd2', 'Nxd2', 'Qh4'],
  'Kaufmann Attack': ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'Nc3', 'Nxc3', 'dxc3', 'Be7', 'Bf4', 'Nc6', 'Qd2', 'Be6', 'O-O-O', 'Qd7', 'Kb1', 'O-O-O', 'Ng5', 'Bxg5', 'Bxg5', 'f6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The Classical Variation is the main line up to …Nxc3: every move is
  // already written, and that beat closes on the plan.
  'Classical Variation': [],
  'Steinitz Variation': [
    ["d4 — the Steinitz Variation: instead of taking on e5, they open the center at once. Now both e-pawns are hanging. Whose do you take?", "d4 — both e-pawns now hang."],
    ["…Nxe4 — theirs, first. …exd4 is tempting, but then e5 hits your knight on f6 and it has to move again. Take on e4 and the knight is already on a central square, a pawn up for the moment.", "…Nxe4 — grab e4 first."],
    ["Bd3 — the threat before the pawn. The bishop hits your knight on e4, which has no guard, and the e5 pawn can wait, since it isn't going anywhere. And if you grab d4 now? Bxe4 simply wins the knight.", "Bd3 — hits the unguarded e4 knight."],
    ["…d5 — guard the knight with a pawn, and claim the center. Your e5 pawn will fall to Nxe5, but that only puts material back to level, and your knight on e4 stands firm.", "…d5 — guards e4, takes the center."],
    ["Nxe5 — the pawn comes back, and material is level. Their knight now sits on a fine central square, eyeing f7. Do you leave it there?", "Nxe5 — level material, eyes f7."],
    ["…Nd7 — no, challenge it at once. The knight offers a trade on e5, and if they take, your bishop takes back and develops. Then …Qf6 hits f2. Hold that thought for two moves.", "…Nd7 — challenge the e5 knight."],
    ["Nxd7 — they take the trade. Their knight on d7 is attacked three times, so it won't survive. The only question is what takes back.", "Nxd7 — the knights come off."],
    ["…Bxd7 — the bishop, because it develops with the capture. And see the idea it leaves behind: …Qf6 would hit f2 together with your knight on e4, and with their king still on e1, that is mate.", "…Bxd7 — develop, …Qf6 is in the air."],
    ["O-O — and they see it. The rook on f1 now guards f2, so …Qf6 is no longer mate. Play it anyway and Nc3 piles a second attacker onto your knight on e4.", "O-O — king safe, f2 covered."],
    ["…Bd6 — the bishop takes the diagonal toward h2 and clears the way to castle. Now look at your pieces: the bishop aims at h2, the knight on e4 at f2, both at their king. And if Nc3 comes, you take, and bxc3 leaves them doubled c-pawns.", "…Bd6 — aims at h2, castle next."],
    ["c4 — the pawn break, hitting d5, the unguarded pawn that holds your knight on e4. Take on c4 and your knight loses the pawn that supports it. So how do you keep d5?", "c4 — hits the unguarded d5 pawn."],
    ["…c6 — the simple guard: if they take on d5, your c-pawn takes back and keeps a pawn in the center. But notice the cost: with no pawn left on c7 or e7, nothing can ever cover d6 with a pawn again, and their dark bishop can reach it via f4.", "…c6 — props up d5."],
    ["Nc3 — the threat before the trade: the knight piles onto your knight on e4 beside the bishop on d3, and the d5 pawn is its only guard. Two attackers, one defender. Time to cash the knight in.", "Nc3 — a second attacker on e4."],
    ["…Nxc3 — trade it before it's lost. On c3 your knight hits their queen, so they must take back, and bxc3 leaves them doubled pawns on c3 and c4 and a lonely a2 pawn.", "…Nxc3 — trade, their c-pawns double."],
    ["bxc3 — doubled c-pawns, but a fair deal for them: the pawn on c3 props up d4, and the half-open b-file becomes a road toward your b7 pawn. One cost is permanent, though: no pawn of theirs can ever cover a3 again.", "bxc3 — doubled pawns, solid d4."],
    ["…O-O — king out of the center first. …dxc4 runs into Re1 check with your king still on e8, and …Be6 lets them open the b-file and pick off your b7 pawn.", "…O-O — king out of the center first."],
    ["cxd5 — they release the tension, and your recapture decides the structure for the rest of the game. Only one move makes sense: the c-pawn.", "cxd5 — a trade in the center."],
    ["…cxd5 — here's the trade-off. Your d5 pawn is isolated now: no pawn on the c- or e-file can ever guard it, so pieces must. In return the c-file is half-open for your rooks, with their c3 pawn at the end of it. Their target is d5, yours is c3.", "…cxd5 — isolated pawn, half-open c-file."],
    ["Qh5 — a real threat: Qxh7 is mate, with the bishop on d3 behind the queen. Your d5 pawn is hanging too. You can't save both, so the king comes first.", "Qh5 — threatens mate on h7."],
    ["…g6 — the pawn hits the queen and cuts the bishop off from h7, so the mate is gone. …h6 fails to Bxh6. But …g6 never comes back: h6 is a hole now, and their dark bishop reaches it in one move. Remember that square.", "…g6 — stops the mate, hits the queen."],
    ["Qxd5 — the queen takes the pawn, and now it hits your bishop on d6 and your b7 pawn, neither guarded, and pins your f7 pawn to your king. You're a pawn down, so you need one move that fixes both.", "Qxd5 — a pawn up, hits d6 and b7."],
    ["…Qc7 — there's that move. The queen guards d6 and b7 and, from the half-open c-file, hits their c3 pawn, which has no guard. Win it back and you are level, with your queen deep in their camp.", "…Qc7 — guards d6 and b7, hits c3."],
    ["Bh6 — remember the hole …g6 left? There it is: the bishop lands on h6 and hits your rook on f8. And it hides a trap: grab c3 now, and your queen stops guarding d6, so Qxd6 picks up your bishop.", "Bh6 — into the hole, hits f8."],
    ["…Rfd8 — rook first. It steps out of the bishop's attack to d8, where it guards your bishop on d7. Grab c3 right away and Qxd6 takes your bishop, so the order matters: save the rook, then take the pawn.", "…Rfd8 — rook safe, guards d7."],
    ["Qg5 — the queen hits your rook on d8 and pins your g6 pawn to your king. But look what it gave up: with the queen off d5, nothing attacks your bishop on d6, so c3 is free to take.", "Qg5 — hits d8, now c3 is free."],
    ["…Qxc3 — the pawn comes back and material is level. Your queen hits their rook on a1, their bishop on d3 and their d4 pawn. Grab your rook with Qxd8 check and …Rxd8 wins their queen for it. Your plan for the middlegame: offer the dark bishops with …Bf8, put a rook on the open c-file, and go after their isolated d4 pawn. Win it, and the extra pawn makes a pleasant ending.", "…Qxc3 — pawn back, hits a1 and d3."],
  ],
  'Three Knights Game': [
    ["Nc3 — they leave the main road: instead of taking on e5, the knight guards e4. Quieter, but now your e5 pawn is the one hanging. What do you do with it?", "Nc3 — guards e4, e5 now hangs."],
    ["…Nc6 — just guard it. The knight develops and covers e5. Why not pin first with …Bb4? Then Nxe5 takes the pawn, because nothing holds it.", "…Nc6 — guards e5, develops."],
    ["d4 — they open the center: the pawn hits e5 a second time, and now you have to decide whether to hold it or take.", "d4 — opens the center, hits e5."],
    ["…exd4 — take it, and look: your pawn on d4 hits their knight on c3, so they must recapture at once. What you have now is a Scotch Game with their Nc3 and your …Nf6 already in.", "…exd4 — take, it's a Scotch now."],
    ["Nxd4 — the knight takes back and stares at your knight on c6. What's your best move here? Work it out, because many club players get it wrong.", "Nxd4 — recaptures, faces c6."],
    ["…Bb4 — the pin. About four club players in ten swap knights with …Nxd4 here, and it costs you over a pawn: Qxd4 puts their queen in the center, and Bf4 and long castling follow. …Bb4 instead pins their knight on c3, the only guard of e4, which your knight attacks.", "…Bb4 — pin c3, e4 loses its guard."],
    ["Nxc6 — they don't wait for you to pile up: the knights come off, and their knight on c6 hits your queen and your bishop on b4 at once. You have to take back right now. Which pawn?", "Nxc6 — hits d8 and b4."],
    ["…bxc6 — toward the center. …dxc6 lets them trade queens with check on d8, and your king loses castling. This way the queens stay on, and the b-file half-opens for your rook.", "…bxc6 — toward the center, b-file half-opens."],
    ["Bd3 — the bishop guards e4, so your knight can't take it, and clears the way to castle. Keep an eye on its diagonal, too: once their e4 pawn leaves, it points straight at h7.", "Bd3 — guards e4, castling next."],
    ["…d5 — the pawn break: it hits e4 with your c6 pawn behind it, so when the pawns trade, you keep a pawn on d5. Castling first is the other main move, and it can reach the same position.", "…d5 — the break, hits e4."],
    ["exd5 — they take, and their pawn hits c6. Two things changed: the e-file is open with both kings still in the middle, and their bishop on d3 now sees all the way to h7.", "exd5 — hits c6, e-file opens."],
    ["…cxd5 — take back, and your pawn on d5 takes c4 and e4 away from their pieces. With the e-file open, mind the check: Qe2 is met by …Be7, and their knight on c3 is still pinned.", "…cxd5 — covers c4 and e4."],
    ["O-O — king safe, and with it off e1, their knight on c3 is no longer pinned. Your bishop on b4 now just stares at it.", "O-O — king safe, c3 unpinned."],
    ["…O-O — you castle too. Both kings are safe, the half-open b-file waits for a rook, and your bishop can take on c3 whenever doubling their pawns is worth it.", "…O-O — castle, the b-file waits."],
    ["Bg5 — the pin: your knight on f6 is tied to your queen, and their next moves pile up on it. What do you do against a pin? Break it before the second attacker arrives.", "Bg5 — pins f6 to the queen."],
    ["…Be6 — the bishop develops and guards d5, finishing your minor pieces. …c6 is the other way to hold d5. Now …h6 is in the air, asking their bishop whether it wants to take your knight or retreat.", "…Be6 — develops, guards d5."],
    ["Qf3 — the queen piles up on your pinned knight on f6 and hits d5 as well. The knight can't move without exposing your queen, so how do you get out of the pin?", "Qf3 — piles up on f6 and d5."],
    ["…Be7 — step back between them, and your knight on f6 is no longer pinned. Does d5 still hold? Yes: Nxd5 now loses a piece, because …Qxd5 takes the knight, the queens trade, and your knight takes back.", "…Be7 — breaks the pin."],
    ["Bxf6 — a real mistake. They give up their bishop for your knight, and after you take back you hold the two bishops. The engine prefers h3, keeping the tension, and now you are a little better.", "Bxf6 — gives up the bishop, h3 was better."],
    ["…Bxf6 — the bishop, never the g-pawn: …gxf6 would wreck your king's cover. Now the bishop pair is yours, and you are a little better. Your plan for the middlegame: …c6 to keep d5 solid, …g6 to shut their bishop off h7, then your bishop to e5 with the queen behind it on d6, aimed at h2, which only their king guards.", "…Bxf6 — the bishop pair is yours."],
  ],
  'Cochrane Gambit': [
    ["Nxf7 — the Cochrane Gambit. They throw the knight onto f7, hitting your queen and rook, just to drag your king out. One master in a hundred tries it, but about one club player in eleven. The engine prefers Nf3, and once you take you are a little better.", "Nxf7 — a knight sacrifice for your king."],
    ["…Kxf7 — take it. You're a knight up for two pawns, and the price is your king on f7, where it can't castle anymore. One defender stays home on purpose: your bishop on c8, which blocks on e6 if their bishop ever checks from c4.", "…Kxf7 — a knight for two pawns."],
    ["d4 — a big center to throw at your king, with e5 coming to kick your knight. About half of club players check with Bc4 here instead, and it's a real mistake: …d5 blocks the check and hits the bishop, and it costs them more than a pawn.", "d4 — big center, e5 coming."],
    ["…Be7 — you can't castle anymore, so you castle by hand: bishop out, then a rook to e8 or f8, then the king to g8. This is step one. …c5, hitting d4, is the popular alternative.", "…Be7 — start castling by hand."],
    ["Nc3 — the knight develops and guards e4, so that pawn is off the menu. Their whole setup points at your king now, and the check from c4 is still coming.", "Nc3 — guards e4, develops."],
    ["…Re8 — step two: the rook leaves h8, takes the half-open e-file and guards your bishop on e7. One king move to g8 and castling by hand is done, if they give you the time.", "…Re8 — e-file, the king heads to safety."],
    ["Bc4+ — check, and this is the Cochrane's danger: your king on f7 sits right on the bishop's diagonal. Step aside, or block? Remember the bishop you kept at home.", "Bc4+ — check on f7."],
    ["…Be6 — block, and offer a trade of the bishop that gave the check. Your bishop is pinned for now, but it hits theirs. What about …d5 instead? Then Nxd5 just wins a pawn.", "…Be6 — block and offer a trade."],
    ["Bxe6+ — they trade with check, and your king takes back on e6, out in the open for a moment. Still a knight for two pawns, and you are a little better. Expect g4 next, more pawns thrown at your king. Your plan for the middlegame: walk the king back to f7 and then g8, finish developing, and let the extra piece tell.", "Bxe6+ — the trade, king takes back."],
  ],
  'Italian Variation': [
    ["Nc3 — instead of d4, they offer a knight trade at once. Your knight on e4 is attacked and unguarded, so you decide now: trade, and their c-pawns end up doubled, or retreat with …Nf6 and keep it quiet.", "Nc3 — challenges the e4 knight."],
    ["…Nxc3 — take it. From c3 your knight hits their queen, so they must take back, and either pawn leaves them doubled c-pawns. Which pawn they choose decides their whole plan.", "…Nxc3 — trade, their c-pawns get doubled."],
    ["dxc3 — here's the trade-off: doubled c-pawns, but the d-file half-opens and the bishop on c1 is free. And that tells you their plan: develop fast, castle long, and put a rook on that d-file.", "dxc3 — open lines, doubled c-pawns."],
    ["…Be7 — modest but useful: the bishop clears your kingside so you can castle. Notice you don't commit your king yet. Where it goes depends on where theirs goes.", "…Be7 — develop, ready to castle."],
    ["Be3 — the bishop develops and aims at your a7 pawn, and the plan is plain: Qd2, castle long, rooks on the half-open d-file.", "Be3 — develops, Qd2 and castling next."],
    ["…Nc6 — the knight develops and covers d4 and e5, so their pieces can't settle there, and it guards a7 too.", "…Nc6 — covers d4 and e5."],
    ["Qd2 — the queen steps onto the d-file, aims at your d6 pawn and clears the way to castle long.", "Qd2 — castling long next."],
    ["…Be6 — where does this bishop belong? e6, aiming at their a2 pawn. Right now the rook on a1 guards it, but once they castle long that guard is gone, and their king will have to spend a move on it.", "…Be6 — develops, eyes a2."],
    ["O-O-O — they castle long, and the rook lands on d1 behind the queen. Notice what it leaves behind: with the rook gone from a1, a2 has no guard.", "O-O-O — rook to d1, a2 loose."],
    ["…Qd7 — the queen guards your bishop on e6 and clears the back rank, so you can castle long as well.", "…Qd7 — ready to castle long."],
    ["Kb1 — the king steps over to guard a2 before your bishop can take it.", "Kb1 — guards a2."],
    ["…O-O-O — you castle long too, and your rook lands on d8 behind your queen. Both kings on the same wing: this becomes a mirror grind, where the better-placed minor piece decides. For now they are a little better.", "…O-O-O — long castle, a mirror position."],
    ["Bd3 — natural, but not the best: the engine prefers Nd4, hitting your knight on c6 and your bishop on e6 at once. Bd3 aims at h7 and makes way for a rook on e1, and the game is about level again.", "Bd3 — eyes h7, Nd4 was stronger."],
    ["…d5 — space in the center, but it costs you: the pawn now blocks your bishop on e6 from a2. The engine prefers …Ne5, hitting their knight and bishop at once, and now they are a little better.", "…d5 — space, …Ne5 was better."],
    ["Nd4 — there's the knight jump: it hits your knight on c6 and your bishop on e6 at once. Trade it off, or keep the tension?", "Nd4 — hits c6 and e6."],
    ["…Nxd4 — trading looks natural, but see who takes back: their bishop, landing on d4, where it hits your a7 and g7 pawns. The engine prefers …a6, keeping the tension, and now they are clearly better.", "…Nxd4 — trade, …a6 was better."],
    ["Bxd4 — and now you see the problem: the bishop hits two loose pawns, a7 and g7. The g7 pawn can't even move, because it's pinned to your rook on h8.", "Bxd4 — hits a7 and g7."],
    ["…Bf6 — guard g7 and offer the bishop trade. Your a7 pawn is still loose, but if the bishops come off, the piece hitting it is gone.", "…Bf6 — guards g7, offers a trade."],
    ["Bxf6 — they take, and the bishop on f6 now hits your rook on d8 as well as g7. You have to take back right now.", "Bxf6 — hits d8 and g7."],
    ["…gxf6 — the only way to take back, with your rook on d8 under fire. Look at the cost: your f-pawns are doubled and your h7 pawn stands alone, so their pieces have targets on your kingside.", "…gxf6 — forced, doubled f-pawns."],
    ["f4 — the pawn takes e5 and g5 away from your pieces and makes room for Qf2, aiming at a7. But it's slow: the engine prefers Qf4, going after your f6 pawn at once. After f4 they are a little better.", "f4 — covers e5, Qf4 was stronger."],
    ["…Kb8 — the king steps into the corner and guards a7, the pawn their queen was heading for.", "…Kb8 — guards a7, king safe."],
    ["Rhe1 — the rook takes the open e-file and hits your bishop on e6.", "Rhe1 — open file, hits e6."],
    ["…Rhe8 — the rook meets theirs and gives your bishop on e6 a third guard. But it leaves h7 loose to their bishop on d3, and the engine prefers …d4, hitting their c3 pawn. Now they are clearly better. Your plan for the middlegame: queen to d6, …h5 for kingside space, and trade rooks on the e-file toward a minor-piece endgame you can hold.", "…Rhe8 — e-file, …d4 was stronger."],
  ],
  '5.Bd3 Line': [
    ["…Bd6 — another road: mirror their setup. Your bishop goes to d6, opposite theirs on d3, aimed at h2, and you castle next. In a mirror position the question is who breaks first, and their break is c4.", "…Bd6 — mirror their bishop, eye h2."],
    ["O-O — king safe. Next comes c4, the break that goes after your d5 pawn and the knight it holds.", "O-O — king safe."],
    ["…O-O — every master castles here. Still a mirror image, and still the same question: when c4 comes, how do you hold d5?", "…O-O — king safe, symmetry holds."],
    ["c4 — there it is: the pawn hits d5, which has no guard, and that pawn holds your knight on e4. Take on c4, and the knight loses its support. So d5 has to be guarded instead.", "c4 — hits the unguarded d5 pawn."],
    ["…c6 — the guard: if they take on d5, your c-pawn takes back and the knight keeps its support. Look at the chain it makes, b7, c6, d5: its base on b7 is the one pawn no other pawn guards, and Qb3 would aim straight at it.", "…c6 — guards d5."],
    ["Qc2 — look at the line the queen joins: it stacks behind their bishop on d3, aimed through your knight on e4 at h7. A battery like that means your knight can't step off e4 carelessly.", "Qc2 — a battery toward e4 and h7."],
    ["…Na6 — why the rim? Because b4 is next: from there the knight would hit their queen on c2 and their bishop on d3 together. And if they open the position with cxd5 or c5, …Nb4 comes at once, hitting the queen.", "…Na6 — heading for b4."],
    ["a3 — they stop it at once: the pawn covers b4, so your knight can't land there. The knight on a6 has to wait, and your bishop on c8 is the next piece to find a job.", "a3 — keeps your knight off b4."],
    ["…Bg4 — the bishop develops and hits their knight on f3. Why that knight? Besides their king, it's the only piece guarding h2 against your bishop on d6. Take it away and h2 has nothing but the king.", "…Bg4 — hits the f3 knight."],
    ["Nbd2 — natural, but a slip. The knight hits your knight on e4 and guards f3 again, yet it invites a trade that drags the f3 knight off h2. The engine prefers Ne5, and the game is about level. Can you see the trade?", "Nbd2 — a slip, Ne5 was the move."],
    ["…Nxd2 — trade, and now your knight hits their rook on f1 and their knight on f3, so they must take back. With what? Bxd2 lets …Bxf3 wreck their kingside pawns, and Qxd2 lets …dxc4 hit their bishop. So it has to be the knight from f3, the knight that guarded h2.", "…Nxd2 — trade, the f3 knight must recapture."],
    ["Nxd2 — the only good recapture, and here's what it costs: f3 is empty now, and nothing but their king guards h2.", "Nxd2 — forced, h2 loses its guard."],
    ["…Qh4 — remember the knight that guarded h2? It's gone. Now your queen and your bishop on d6 both hit h2, and …Qxh2 is mate. They block with f4, and the game is about level. Your plan for the middlegame: once f4 shuts the diagonal, switch targets: rooks to the open e-file, and the bishop round via e7 to f6 to hit d4.", "…Qh4 — threatens mate on h2."],
  ],
  'Kaufmann Attack': [
    ["Bf4 — the Kaufmann Attack: the bishop goes to f4 instead of e3. From there it aims at your d6 pawn and keeps your bishop on e7 off g5. Qd2 and castling long come next.", "Bf4 — eyes d6, covers g5."],
    ["…Nc6 — the knight develops and covers d4 and e5, the two central squares their pieces would like.", "…Nc6 — covers d4 and e5."],
    ["Qd2 — the queen lines up behind the bishop and clears the way to castle long. Together they hit your d6 pawn twice, but d6 has three guards, so it holds.", "Qd2 — backs the bishop, castles long next."],
    ["…Be6 — the bishop develops and eyes their a2 pawn. The rook on a1 guards it now, but not once they castle long.", "…Be6 — develops, eyes a2."],
    ["O-O-O — they castle long, the rook arrives on d1, and a2 has just lost its guard.", "O-O-O — long castle, a2 now loose."],
    ["…Qd7 — the queen guards your bishop on e6 and clears b8, c8 and d8, so you can castle long too.", "…Qd7 — clears the way to castle."],
    ["Kb1 — the king steps over to guard a2, so your bishop has nothing to take.", "Kb1 — guards a2."],
    ["…O-O-O — you castle long too, both kings on the same wing, your rook on d8 behind the queen. Now watch g5: their knight on f3 can jump there and hit your bishop on e6.", "…O-O-O — long castle, watch g5."],
    ["Ng5 — there it is: the knight lands on g5 and hits your bishop on e6 and the pawns on f7 and h7. Do you have to retreat? No, your bishop on e7 can simply take it.", "Ng5 — hits e6, f7 and h7."],
    ["…Bxg5 — count the moves: their knight spent four to reach g5, and your bishop removes it in two. Now your bishop pins their bishop on f4 to the queen on d2, so they take back at once.", "…Bxg5 — trade off the intruder."],
    ["Bxg5 — they take back and keep the two bishops. But look: their bishop on g5 now hits your rook on d8, and Bxd8 would win the exchange.", "Bxg5 — bishop pair, hits d8."],
    ["…f6 — block and kick in one move: the pawn cuts the bishop off from d8 and hits it, so it has to retreat. The cost is permanent: no pawn can cover e6 again, and their light bishop can reach c4 to hit your bishop there. Your plan for the middlegame: once the bishop backs off, rooks to the open e-file, starting with …Rhe8.", "…f6 — blocks d8, kicks the bishop."],
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

export const PETROV_DEFENCE_WATCH: WatchCourse = {
  openingId: 'petrov-defence',
  title: 'Petrov Defence — A Master Class',
  orientation: 'black',
  sources: ['book:petrov-defence', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'],
  lines: [
    { tab: null, moves: MAIN },
    // The Cochrane is a sacrifice sideline that ends at the trade on e6, before
    // a middlegame: a roadmap, as its hand-written lesson was.
    ...Object.entries(TAB_LINES).map(([tab, moves]) => (tab === 'Cochrane Gambit' ? { tab, moves, kind: 'roadmap' as const } : { tab, moves })),
  ],
  beats,
};
