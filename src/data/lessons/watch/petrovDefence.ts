// Petrov Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=petrov-defence`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a).
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'd4', 'd5', 'Bd3', 'Nc6', 'O-O', 'Be7', 'c4', 'Nb4', 'Be2', 'O-O', 'Nc3', 'Bf5', 'a3', 'Nxc3', 'bxc3', 'Nc6', 'Bf4', 'Na5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — the king's pawn, the most common first move among masters. It takes the center and opens the way for their bishop on f1 and their queen. So what do you do against it? You meet it head on.", 'e4 — they take the center.'],
  ["…e5 — your own pawn goes right opposite theirs, so their e-pawn can't advance any further, and your bishop on f8 and your queen get room too. About a quarter of masters choose it; only the Sicilian's …c5 is more popular.", '…e5 — your share of the center.'],
  ['Nf3 — nine masters in ten play it, and you can see why: the knight develops and hits your e5 pawn in the same move. Nothing guards that pawn. The usual answer is to defend it with …Nc6. The Petrov does something else.', 'Nf3 — develops, hits e5.'],
  ["…Nf6 — and here is the Petrov. Do you have to defend e5? No. You hit back: the knight attacks their e4 pawn, which is just as unguarded as yours. Whatever they do to your pawn, you can do to theirs, so the position stays symmetrical and solid. And notice what it skips: with no knight on c6, there is no Ruy Lopez, because a bishop on b5 would hit nothing. About one master in eight plays it, and the engine rates …Nc6 a shade higher.", '…Nf6 — the Petrov: hit e4 back.'],
  ["Nxe5 — they take, about two masters in three. Now look at the board: their knight on e5 hits your f7 pawn, and their own e4 pawn is still hanging. So you'll win your pawn back. The only question is how.", 'Nxe5 — grabs a pawn, eyes f7.'],
  ["…d6 — the one move-order point every Petrov player has to know. The natural move is …Nxe4 right away, but then Qe2 hits your knight on e4, on a file that runs straight to your king, and you have to block with your queen. So …d6 first: kick their knight off e5, and only then take on e4. Nearly every master plays it in this order.", '…d6 — kick the knight, then take e4.'],
  ["Nf3 — where does the knight go? Back home to f3, almost every master's choice, where it guards h2 and covers d4. The wild Nxf7 has a tab of its own. And now their e4 pawn has nobody guarding it.", 'Nf3 — retreats; e4 is unguarded.'],
  ["…Nxe4 — now you take, as every master does, and the material is level. Look at the structure: both e-pawns are gone, and your knight sits on e4 hitting f2. That symmetry is exactly what the Petrov is after.", '…Nxe4 — pawn back, level material.'],
  ["d4 — just over half the masters play it. The pawn takes the center and frees their bishop on c1, and Bd3 is coming next to hit your knight. So what does your knight need? A guard. The quieter Nc3, offering a knight trade, has tabs of its own.", 'd4 — center pawn; Bd3 comes next.'],
  ["…d5 — there's the guard. The pawn supports your knight on e4, so when Bd3 hits it, it's already defended, and you claim your share of the center. Nearly every master plays it.", '…d5 — guards the e4 knight.'],
  ["Bd3 — every master plays it: the bishop develops with a hit on your knight on e4 and clears the way for their king to castle. Is the knight in danger? Not yet, the d5 pawn holds it. So you just keep developing.", 'Bd3 — hits e4, castling next.'],
  ["…Nc6 — which piece first? About four masters in ten bring this knight out, and it comes with a point: it hits their d4 pawn. …Bd6 and …Be7 are the other main moves, and …Bd6 gets a tab of its own.", '…Nc6 — develops, hits d4.'],
  ["O-O — they castle, as almost every master does, and their king is safe. Now look at your knight on e4: its only support is the d5 pawn. That pawn is exactly what their next move goes after.", 'O-O — king safe; d5 is next.'],
  ["…Be7 — more than nine masters in ten play it. It's modest, but it does the job: the bishop clears your kingside so you can castle next move.", '…Be7 — develop, castle next.'],
  ["c4 — the pawn break, chosen by just over half the masters. It hits d5, the pawn that holds up your knight on e4. Knock that support out and the knight starts to wobble, so you need an answer right away.", "c4 — hits d5, the knight's support."],
  ["…Nb4 — do you just defend d5? Better: the knight jumps to b4, where it guards d5 and hits their bishop on d3, the only piece guarding c4. Nearly nine masters in ten play it. You meet pressure with pressure.", '…Nb4 — hits d3, guards d5.'],
  ["Be2 — they won't hand you the trade. The bishop steps back to e2, where it still guards c4; nearly nine masters in ten choose this. Your knight on b4 is a little offside now, and a3 will come for it soon.", 'Be2 — keeps the bishop, guards c4.'],
  ["…O-O — you castle before the center opens, as nine masters in ten do. Your knight on e4 still needs watching: Nc3 is coming to challenge it.", '…O-O — king safe first.'],
  ["Nc3 — nearly nine masters in ten. The knight hits your knight on e4 and your d5 pawn at once, and if you take on c3, the b-pawn takes back toward the center.", 'Nc3 — hits e4 and d5.'],
  ["…Bf5 — how do you hold e4? With a developing move: the bishop comes out to f5, outside your pawn chain, and gives the knight a second guard. About three masters in four play it; …Be6, guarding d5 instead, is the other choice.", '…Bf5 — develops, guards e4 again.'],
  ["a3 — now they come after the knight on b4. Where does it go? Back to c6 looks natural, but as you'll see, that drops a pawn. So you have to solve the knight on b4 and the pressure on d5 together.", 'a3 — kicks the b4 knight.'],
  ["…Nxc3 — the move order matters. Retreating …Nc6 straight away lets Nxd5 win your pawn, since their knight still hits it. So take that knight first: on c3 yours hits their queen and the bishop on e2, they must take back, and bxc3 leaves them doubled pawns on c3 and c4. Your plan from here: rescue the b4 knight and aim your pieces at those doubled c-pawns.", '…Nxc3 — trade first; doubled c-pawns.'],
  ["bxc3 — they have to take back, and the b-pawn does it. Look what the new pawn on c3 does: it hits your knight on b4, so that knight has to move now. In return for the doubled c-pawns, the b-file is half-open for their rook.", 'bxc3 — doubled pawns, hits b4.'],
  ["…Nc6 — where does the knight go? Back to c6, its natural square, where it hits d4 again. …Na6 instead would strand it on the rim.", '…Nc6 — back to c6, eyes d4.'],
  ["Bf4 — where does their last minor piece go? f4, an active diagonal, aimed at your c7 pawn. The engine prefers cxd5, settling the center first; after Bf4 the game is about level.", 'Bf4 — eyes c7; cxd5 was stronger.'],
  ["…Na5 — remember those doubled c-pawns? Here's where you use them. The knight goes after the front one: c4 is now hit by your knight and your d5 pawn, and only their bishop on e2 guards it. The knight also eyes b3, a square no pawn of theirs can ever cover again. It's about level. Your plan for the middlegame: keep piling up on c4 while your d5 pawn and your bishop on f5 hold the center.", '…Na5 — hits c4, eyes b3.'],
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
    ["d4 — instead of taking on e5, they open the center at once. About one master in five tries it, and the engine prefers Nxe5. Now look: both e-pawns are hanging. Whose do you take?", 'd4 — both e-pawns now hang.'],
    ["…Nxe4 — theirs, first. Take on d4 instead and e5 hits your knight on f6, so it would have to move anyway. Nine masters in ten grab the e4 pawn, and for the moment you're a pawn up.", '…Nxe4 — grab e4 first.'],
    ["Bd3 — the bishop develops with a hit on your knight on e4, which has no guard yet, and your e5 pawn is loose too. Most masters play this; the engine prefers Nxe5 at once. So which one do you look after?", 'Bd3 — hits the unguarded e4 knight.'],
    ["…d5 — the knight, with a pawn: d5 guards it and claims the center. Nine masters in ten play it. Your e5 pawn will fall, but that only makes the material level again.", '…d5 — guards e4, takes the center.'],
    ["Nxe5 — they take the pawn back, and the material is level. Their knight now sits on a strong central square, aimed at f7. Do you let it stay there?", 'Nxe5 — level material, eyes f7.'],
    ["…Nd7 — no, you challenge it right away. About eight masters in ten put the knight on d7, offering a trade on e5. And if they take, your bishop takes back and comes into the game.", '…Nd7 — challenge the e5 knight.'],
    ["Nxd7 — they take the trade. Their knight on d7 is attacked three times, so it won't survive. The only question is what takes back.", 'Nxd7 — the knights come off.'],
    ["…Bxd7 — the bishop, because it develops with the capture. And look at the idea it leaves behind: …Qf6 would hit f2 together with your knight on e4, and with their king still on e1, that's mate.", '…Bxd7 — develop; …Qf6 is in the air.'],
    ["O-O — and they see it. Castling puts the rook on f1, a second guard for f2, so …Qf6 is no longer mate, and their king is safe.", 'O-O — king safe, f2 covered.'],
    ["…Bd6 — the bishop takes the diagonal toward their h2 pawn and clears the way to castle. Look at your pieces now: the bishop aims at h2, the knight on e4 at f2, both pointed at their king.", '…Bd6 — aims at h2, castle next.'],
    ["c4 — the pawn break, and it hits d5, which has no guard. That's the pawn holding your knight on e4. The engine prefers Nc3 first, but c4 goes straight for the support.", 'c4 — hits the unguarded d5 pawn.'],
    ["…c6 — the simple answer: the pawn guards d5, so if they take, your c-pawn takes back and you keep a pawn in the center. The engine prefers castling first.", '…c6 — props up d5.'],
    ["Nc3 — now your knight on e4 is attacked twice, by this knight and by the bishop on d3, and the d5 pawn is its only guard. It can't hold, so it's time to cash it in.", 'Nc3 — a second attacker on e4.'],
    ["…Nxc3 — trade it before it's lost. On c3 your knight hits their queen, so they must take back, and the b-pawn's recapture doubles their pawns on c3 and c4.", '…Nxc3 — trade; their c-pawns double.'],
    ["bxc3 — the doubled c-pawns are the price, but look at the gain: the pawn on c3 props up d4, and the b-file is half-open for their rook.", 'bxc3 — doubled pawns, solid d4.'],
    ["…O-O — why not take on c4? Because …dxc4 leaves you doubled c-pawns of your own. Castling keeps your pawns whole and gets your king safe.", '…O-O — castle, keep your pawns whole.'],
    ["cxd5 — they release the tension and hit your c6 pawn. You take back, and that decides your structure for the rest of the game.", 'cxd5 — a trade in the center.'],
    ["…cxd5 — here's the trade-off. Your pawn on d5 is isolated now: with no pawn on the c- or e-file, only pieces can ever guard it. In return the c-file is half-open for your rooks, and their pawn on c3 sits right at the end of it.", '…cxd5 — isolated pawn, half-open c-file.'],
    ["Qh5 — and here's the threat: Qxh7 is mate, with their bishop on d3 backing up the queen. On top of that, your d5 pawn is hanging. You can't save everything, so the king comes first.", 'Qh5 — threatens mate on h7.'],
    ["…g6 — the pawn hits the queen and cuts the bishop on d3 off from h7, so the mate is gone. What about …h6 instead? Then Bxh6 tears into your king. The d5 pawn is the price; their queen takes it next.", '…g6 — stops the mate, hits the queen.'],
    ["Qxd5 — the queen grabs the pawn, and now it hits your bishop on d6 and your b7 pawn, and neither has a guard. You're a pawn down, so one move has to fix both.", 'Qxd5 — a pawn up, hits d6 and b7.'],
    ["…Qc7 — and there's that move. The queen guards the bishop on d6 and the b7 pawn, and from the half-open c-file it hits their c3 pawn, which has no guard. Win that back and the material is level.", '…Qc7 — guards d6 and b7, hits c3.'],
    ["Bh6 — the bishop hits your rook on f8, and it hides a trap: grab c3 now and your queen stops guarding d6, so Qxd6 picks up your bishop. The engine prefers c4.", 'Bh6 — hits f8; c4 was stronger.'],
    ["…Rfd8 — so first the rook steps out of the bishop's attack, to d8, where it guards your bishop on d7. Why not grab c3 right away? Because Qxd6 would take your bishop. …Rfe8 and …Rfc8 are both weaker.", '…Rfd8 — rook safe, guards d7.'],
    ["Qg5 — the queen leaves the d-file to hit your rook on d8 and pin your g6 pawn to your king. But look what it gave up: with the queen off d5, nothing attacks your bishop on d6 anymore, so c3 is free to take. h4 was a touch more precise.", 'Qg5 — hits d8; now c3 is free.'],
    ["…Qxc3 — and the pawn comes back: the material is level. Your queen now hits their rook on a1, the bishop on d3 and the d4 pawn, and the bishop and the pawn have no guard. If they grab your rook with Qxd8 check, …Rxd8 wins their queen for it. Your plan for the middlegame: their isolated d4 pawn and loose bishop are your targets, and the open c-file belongs to your rooks.", '…Qxc3 — pawn back, hits a1 and d3.'],
  ],
  'Three Knights Game': [
    ["Nc3 — they leave the Petrov's main road: instead of taking on e5, the knight guards e4. About one master in ten plays it, and the engine prefers Nxe5. But now your e5 pawn is the one hanging. What do you do with it?", 'Nc3 — guards e4; e5 now hangs.'],
    ["…Nc6 — just guard it, as three masters in four do. The knight develops and covers e5. …Bb4 instead gives up the e5 pawn.", '…Nc6 — guards e5, develops.'],
    ["d4 — they open the center, and the pawn hits e5 a second time. Masters split almost evenly between this and Bb5.", 'd4 — opens the center, hits e5.'],
    ["…exd4 — take it, nine masters in ten do, and look: the pawn on d4 now hits their knight on c3. They take back at once, and what you have is a Scotch with both sides' knights already out.", "…exd4 — take; it's a Scotch now."],
    ["Nxd4 — the knight takes back and stares at your knight on c6. What's the main move now? …Bb4, and it's worth seeing why.", 'Nxd4 — recaptures, faces c6.'],
    ["…Bb4 — nine masters in ten. The bishop pins their knight on c3 to their king, and that knight is the only piece guarding e4, which your knight on f6 attacks. So e4 is suddenly short of help, and you're one move from castling.", '…Bb4 — pin c3; e4 loses its guard.'],
    ["Nxc6 — they don't wait for you to pile up: the knights come off, and their knight on c6 hits your queen and your bishop on b4 at once. You have to take back right now. Which pawn?", 'Nxc6 — hits d8 and b4.'],
    ["…bxc6 — toward the center, every master's choice. Take with the d-pawn instead and the d-file opens, so they trade queens with check and your king loses castling. This way the queens stay on, and the b-file is half-open for your rook.", '…bxc6 — toward the center, b-file opens.'],
    ["Bd3 — every master plays it: the bishop gives e4 a second guard and gets their king ready to castle.", 'Bd3 — guards e4, castling next.'],
    ["…d5 — the pawn break. It hits e4, with your c6 pawn behind it, and about seven masters in ten play it; castling first is the other choice.", '…d5 — the break, hits e4.'],
    ["exd5 — they take, and their pawn on d5 hits your c6 pawn. With both e-pawns gone the e-file is open, so watch for checks along it while both kings are still in the center.", 'exd5 — hits c6, e-file opens.'],
    ["…cxd5 — you take back, as seven masters in ten do, and your pawn on d5 takes c4 and e4 away from their pieces. Their knight on c3 is still pinned.", '…cxd5 — covers c4 and e4.'],
    ["O-O — they castle, and with the king off e1 their knight on c3 is free again. Your bishop on b4 no longer pins anything.", 'O-O — king safe, c3 unpinned.'],
    ["…O-O — you castle too. Both kings are safe now, and the half-open b-file is waiting for a rook.", '…O-O — castle; the b-file waits.'],
    ["Bg5 — about two masters in three play it: the bishop pins your knight on f6 to your queen on d8. That pin is what their next few moves are about.", 'Bg5 — pins f6 to the queen.'],
    ["…Be6 — the bishop develops and gives d5 a guard. Nearly nine masters in ten prefer …c6 here; …Be6 is the rarer move, and there's almost nothing between them.", '…Be6 — develops, guards d5.'],
    ["Qf3 — the queen piles up on your pinned knight on f6 and hits d5 as well. The knight can't move without exposing your queen, so how do you get out of the pin?", 'Qf3 — piles up on f6 and d5.'],
    ["…Be7 — the bishop steps back between them, and the knight on f6 is no longer pinned to your queen. The engine prefers …c5 here.", '…Be7 — breaks the pin.'],
    ["Bxf6 — a real mistake. They give up their bishop for your knight, and after you take back you have the two bishops against bishop and knight. The engine prefers h3, keeping the tension; now you are a little better.", 'Bxf6 — gives up the bishop; h3 was better.'],
    ["…Bxf6 — with the bishop, never the g-pawn: …gxf6 would double your f-pawns and strip your king. Now your bishop on f6 hits their knight on c3, and the bishop pair is yours; you are a little better. Your plan for the middlegame: a rook to the half-open b-file against b2, and let your two bishops do the work.", '…Bxf6 — the bishop pair is yours.'],
  ],
  'Cochrane Gambit': [
    ["Nxf7 — the Cochrane Gambit. They throw the knight onto f7, where it hits your queen and your rook on h8, just to drag your king out. About one master in a hundred tries it, and the engine prefers Nf3. Take it calmly and you are clearly better.", 'Nxf7 — a knight sacrifice for your king.'],
    ["…Kxf7 — take it; every master does. You're a knight up for two pawns, and the price is your king on f7, where it can no longer castle. The whole game now is about getting that king safe.", '…Kxf7 — a knight for two pawns.'],
    ["d4 — they build a big center to throw at your king, with e5 in mind. About three masters in four play it, but the engine prefers Nc3: after d4 their e4 pawn has no guard.", 'd4 — big center, e4 left loose.'],
    ["…Be7 — you can't castle anymore, so you castle by hand: develop, bring a rook to e8 or f8, and walk the king to g8. The bishop starts that. About half the masters play …c5 instead, hitting d4, and the engine prefers it too.", '…Be7 — start castling by hand.'],
    ["Nc3 — every master here plays it: the knight develops and guards e4, so that pawn is off the menu.", 'Nc3 — guards e4, develops.'],
    ["…Re8 — step two of castling by hand: the rook comes to e8, guards your bishop on e7 and takes the half-open e-file. Masters split about evenly between this and …c6, and the engine prefers …c6.", '…Re8 — e-file; the king heads to safety.'],
    ["Bc4+ — check, and this is the danger in the Cochrane: your king on f7 sits right on the bishop's diagonal. Step aside, or block?", 'Bc4+ — check on f7.'],
    ["…Be6 — block, and offer to trade off the bishop that gave the check. Your bishop is pinned for the moment, but it attacks theirs. What about …d5? Then Nxd5 just wins a pawn.", '…Be6 — block and offer a trade.'],
    ["Bxe6+ — they trade with check, and your king takes back on e6. The engine prefers d5, pushing your bishop back first. After the trade you're still a knight up for two pawns, a little better. Your plan for the middlegame: tuck the king back to f7 and then g8, finish developing, and let the extra piece tell.", 'Bxe6+ — the trade; d5 was stronger.'],
  ],
  'Italian Variation': [
    ["Nc3 — instead of d4, they offer a knight trade at once, about a quarter of the masters' choice. Your knight on e4 is attacked and unguarded, so you have to decide now. The engine prefers d4.", 'Nc3 — challenges the e4 knight.'],
    ["…Nxc3 — take it, as most masters do. From c3 your knight hits their queen, so they must take back, and either pawn does it with doubled c-pawns.", '…Nxc3 — trade; doubled c-pawns follow.'],
    ["dxc3 — every master takes with the d-pawn, and here's why: it opens the d-file and frees the bishop on c1. Doubled c-pawns, but quick development, and that's their plan: develop fast and castle queenside.", 'dxc3 — open lines, doubled c-pawns.'],
    ["…Be7 — more than nine masters in ten. The bishop clears your kingside so you can castle when you choose.", '…Be7 — develop, ready to castle.'],
    ["Be3 — the bishop develops and aims at your a7 pawn, and the plan is plain: Qd2, castle queenside, rooks on the half-open d-file.", 'Be3 — develops; Qd2 and castling next.'],
    ["…Nc6 — the knight develops and covers d4 and e5, so their pieces can't settle there, and it guards a7 too.", '…Nc6 — covers d4 and e5.'],
    ["Qd2 — the queen climbs onto the d-file, aims at your d6 pawn and clears the way to castle long.", 'Qd2 — castling long next.'],
    ["…Be6 — where does this bishop belong? e6, where it eyes their a2 pawn. Right now the rook on a1 guards it, but once they castle long that guard is gone.", '…Be6 — develops, eyes a2.'],
    ["O-O-O — they castle long, and the rook lands on d1 behind the queen. Notice what it costs them: the rook has left a1, so a2 is loose to your bishop.", 'O-O-O — rook to d1; a2 loose.'],
    ["…Qd7 — the queen guards your bishop on e6 and clears the back rank, so you can castle long as well.", '…Qd7 — ready to castle long.'],
    ["Kb1 — the king steps over to guard a2 before your bishop can take it.", 'Kb1 — guards a2.'],
    ["…O-O-O — you castle long too, and your rook lands on d8 behind your queen. The engine prefers …Bf6 first; after castling they are a little better.", '…O-O-O — long castle; …Bf6 was better.'],
    ["Bd3 — the bishop develops toward your h7 pawn. The engine prefers Nd4, hitting your knight on c6 and your bishop on e6 at once; after Bd3 the game is about level again.", 'Bd3 — eyes h7; Nd4 was stronger.'],
    ["…d5 — space in the center, but at a cost: the pawn now blocks your own bishop on e6 from a2. The engine prefers …Bf6, and now they are a little better.", '…d5 — space; …Bf6 was better.'],
    ["Nd4 — there's the knight jump: it hits your knight on c6 and your bishop on e6 at once. Bb5 was a shade stronger.", 'Nd4 — hits c6 and e6.'],
    ["…Nxd4 — trading looks natural, but see who takes back: their bishop, landing on d4, where it hits your a7 and g7 pawns. The engine prefers …a6, keeping the tension; now they are clearly better.", '…Nxd4 — trade; …a6 was better.'],
    ["Bxd4 — and now you see the problem: the bishop hits two loose pawns, a7 and g7. The g7 pawn can't even move, because it's pinned to your rook on h8.", 'Bxd4 — hits a7 and g7.'],
    ["…Bf6 — guard g7 and offer the bishop trade. Your a7 pawn is still loose, but if the bishops come off, the piece hitting it is gone.", '…Bf6 — guards g7, offers a trade.'],
    ["Bxf6 — they take, and the bishop on f6 now hits your rook on d8 as well as g7. You have to take back right now.", 'Bxf6 — hits d8 and g7.'],
    ["…gxf6 — the only way to take back, with your rook on d8 under fire. Look at the cost: your f-pawns are doubled and your h7 pawn stands alone, so their pieces have targets on your kingside.", '…gxf6 — forced; doubled f-pawns.'],
    ["f4 — the pawn takes e5 and g5 away from your pieces and makes room for Qf2, aiming at a7. But it's slow: the engine prefers Qf4, going after your f6 pawn at once. After f4 they are a little better.", 'f4 — covers e5; Qf4 was stronger.'],
    ["…Kb8 — the king steps into the corner and guards a7, the pawn their queen was heading for.", '…Kb8 — guards a7, king safe.'],
    ["Rhe1 — the rook takes the open e-file and hits your bishop on e6.", 'Rhe1 — open file, hits e6.'],
    ["…Rhe8 — the rook meets theirs and gives your bishop on e6 a third guard. But look what it left behind: your h7 pawn is now loose to their bishop on d3. The engine prefers …d4, hitting their c3 pawn; now they are clearly better. Your plan for the middlegame: cover your loose kingside pawns, fight for the e-file, and look for …c5 and …d4 to open lines toward their king on b1.", '…Rhe8 — e-file; …d4 was stronger.'],
  ],
  '5.Bd3 Line': [
    ["…Bd6 — another way to play it: mirror their setup. Your bishop goes to d6, opposite theirs on d3, aimed at their h2 pawn, and you castle next. About three masters in ten choose it.", '…Bd6 — mirror their bishop, eye h2.'],
    ["O-O — they castle, as nearly every master does. Next, c4 goes after your center.", 'O-O — king safe.'],
    ["…O-O — every master castles here. Still a mirror image, and still the same question: when c4 comes, how do you hold d5?", '…O-O — king safe, symmetry holds.'],
    ["c4 — there it is, nine masters in ten. The pawn hits d5, which has no guard, and that's the pawn holding your knight on e4.", 'c4 — hits the unguarded d5 pawn.'],
    ["…c6 — almost every master answers this way. The pawn guards d5, so if they take, your c-pawn takes back and your knight on e4 keeps its support.", '…c6 — guards d5.'],
    ["Qc2 — look at the line the queen joins: it stacks up behind their bishop on d3, aimed at your knight on e4 and, behind it, h7. About one master in five plays this; Re1 is the most common move.", 'Qc2 — a battery toward e4 and h7.'],
    ["…Na6 — why the rim? Because b4 is next: from there the knight would hit their queen on c2 and their bishop on d3. About seven masters in ten play it; the engine prefers …h6.", '…Na6 — heading for b4.'],
    ["a3 — nearly every master stops it at once: the pawn covers b4, so your knight can't land there.", 'a3 — keeps your knight off b4.'],
    ["…Bg4 — the bishop develops and hits their knight on f3. Why that knight? It's the piece that guards h2 against your bishop on d6. Keep that in mind.", '…Bg4 — hits the f3 knight.'],
    ["Nbd2 — the knight develops, hits your knight on e4 and gives f3 a second guard. Natural, but a mistake: the engine prefers Ne5, and now you are a little better. Can you see why?", 'Nbd2 — a slip; Ne5 was the move.'],
    ["…Nxd2 — trade, and your knight on d2 hits their rook on f1 and their knight on f3, so they must take back. The question is with what: Qxd2 or Bxd2 runs into …Bxf3, smashing their kingside pawns, so it has to be the knight from f3.", '…Nxd2 — trade; the f3 knight must recapture.'],
    ["Nxd2 — the only good recapture, and here's what it costs: f3 is empty now, and nothing but their king guards h2.", 'Nxd2 — forced; h2 loses its guard.'],
    ["…Qh4 — remember the knight on f3 that guarded h2? It's gone. Now your queen and your bishop on d6 both hit h2, and Qxh2 is mate. They have to block, and f4 is the engine's answer; the game is about level. Your plan for the middlegame: a rook to e8 on the open file, and keep your queen and bishops aimed at their king.", '…Qh4 — threatens mate on h2.'],
  ],
  'Kaufmann Attack': [
    ["Bf4 — the Kaufmann Attack: the bishop goes to f4 instead of e3. From there it aims at your d6 pawn and keeps your bishop on e7 off g5. Qd2 and castling long come next.", 'Bf4 — eyes d6, covers g5.'],
    ["…Nc6 — the knight develops and covers d4 and e5, the two central squares their pieces would like.", '…Nc6 — covers d4 and e5.'],
    ["Qd2 — the queen lines up behind the bishop and clears the way to castle long. Together they hit your d6 pawn twice, but d6 has three guards, so it holds.", 'Qd2 — backs the bishop, castles long next.'],
    ["…Be6 — the bishop develops and eyes their a2 pawn. The rook on a1 guards it now, but not once they castle long.", '…Be6 — develops, eyes a2.'],
    ["O-O-O — they castle long, the rook arrives on d1, and a2 has just lost its guard.", 'O-O-O — long castle, a2 now loose.'],
    ["…Qd7 — the queen guards your bishop on e6 and clears b8, c8 and d8, so you can castle long too.", '…Qd7 — clears the way to castle.'],
    ["Kb1 — the king steps over to guard a2, so your bishop has nothing to take.", 'Kb1 — guards a2.'],
    ["…O-O-O — you castle long too, both kings on the same wing. The engine prefers …h6 first, keeping their pieces off g5, and you'll see why in a move. Now they are a little better.", '…O-O-O — long castle; …h6 was better.'],
    ["Ng5 — there it is: the knight lands on g5 and hits your bishop on e6 and the pawns on f7 and h7. Do you have to retreat? No, your bishop on e7 can simply take it.", 'Ng5 — hits e6, f7 and h7.'],
    ["…Bxg5 — count the moves: their knight spent four to reach g5, and your bishop removes it in two. Now your bishop pins their bishop on f4 to the queen on d2, so they take back at once.", '…Bxg5 — trade off the intruder.'],
    ["Bxg5 — they take back and keep the two bishops. But look: their bishop on g5 now hits your rook on d8, and Bxd8 would win the exchange.", 'Bxg5 — bishop pair; hits d8.'],
    ["…f6 — block and kick in one move: the pawn cuts the bishop off from d8 and hits it, so it has to retreat. The game is about level. Your plan for the middlegame: once the bishop backs off, put your rooks on the open e-file and bring your bishop to f5.", '…f6 — blocks d8, kicks the bishop.'],
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
