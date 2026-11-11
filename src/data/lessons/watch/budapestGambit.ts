// Budapest Gambit — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=budapest-gambit`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a). A gambit: every eval is said in the sheet's
// own words, and the engine's better move is named where the line's move costs.
import type { WatchCourse } from './watchCourse';

const MAIN = ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'Bf4', 'Nc6', 'Nf3', 'Bb4+', 'Nbd2', 'Qe7', 'a3', 'Ngxe5', 'Nxe5', 'Nxe5', 'e3', 'Bxd2+', 'Qxd2', 'O-O', 'Be2', 'd6', 'O-O', 'Bf5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["d4 — they open with the queen's pawn, the choice of more than a third of masters and second only to e4. It takes the center and opens a diagonal for their bishop on c1. Keep your eye on this pawn: on your second move you'll hit it with a gambit.", "d4 — the queen's pawn takes the center."],
  ["…Nf6 — six masters in ten start here. The knight covers e4 and d5, so their e-pawn can't simply march to e4. And watch this knight: in a couple of moves it's the piece that goes after your gambit pawn.", '…Nf6 — develops, covers e4 and d5.'],
  ["c4 — about seven masters in ten add the c-pawn and grab more space. But look at what they've spent: two pawn moves, and not one piece out. And the pawn on d4 now has only their queen behind it. That's the moment the Budapest is built for.", 'c4 — space, but no pieces out.'],
  ["…e5 — and here is the Budapest Gambit. The pawn hits d4, and you're offering it: if they take, you're a pawn down. Why give it away? Because your knight goes straight after it, and you'll win it back while developing with threats. Be honest about the price: most masters play …e6 or …g6 here, the engine prefers …e6, and after …e5 they are a little better. You're trading a small edge for fast, active pieces.", '…e5 — the gambit: hit d4, offer a pawn.'],
  ["dxe5 — almost every master takes. Now they're a pawn up, and the pawn on e5 kicks your knight on f6, so the knight has to move. The only question is where.", 'dxe5 — a pawn up, kicks your knight.'],
  ["…Ng4 — where does the knight go? Not home to g8. It jumps to g4 and goes straight back at the pawn on e5, which nothing of theirs guards. Nearly nine masters in ten choose g4; the other jump, to e4, is the Fajarowicz, which has its own tab and costs you more. From g4 the knight also eyes f2 and h2, so they can't just ignore it.", '…Ng4 — straight back at the e5 pawn.'],
  ["Bf4 — about half of masters guard the pawn with the bishop. So count: your knight hits e5 once, their bishop guards it once. What do you need? A second attacker.", 'Bf4 — the bishop guards e5.'],
  ["…Nc6 — there's the second attacker: two knights on e5, one bishop guarding it. About six masters in ten play this. A quarter try …g5 to kick the bishop first, but the engine is happier simply developing, and the knight on c6 is a piece you want out anyway.", '…Nc6 — a second knight on e5.'],
  ["Nf3 — nearly every master's answer: a second guard on e5. Two attackers, two guards, so the pawn holds for now. You need a third piece, and the next one comes with check.", 'Nf3 — a second guard on e5.'],
  ["…Bb4+ — develop with check, as nearly every master does, and the game is about level now. Why not …Bc5? That runs into e3, and the bishop has to come round to b4 anyway. The check makes them choose a block, and both blocks have a catch: Nc3 can simply be taken, doubling their pawns, and Nbd2 leaves a knight pinned to their king.", '…Bb4+ — develops with check.'],
  ["Nbd2 — three masters in four block with this knight; the engine leans slightly to Nc3, which is the Rubinstein tab. The knight is pinned to the king by your bishop on b4. And look at their king on e1: the queen on d1, the knight on d2, the bishop on f1 and the pawns on e2 and f2 surround it. Remember that crowd.", "Nbd2 — blocks, but the knight is pinned."],
  ["…Qe7 — the third attacker: your queen joins both knights against e5, three on two. And look down the e-file. Your queen stands on the same file as their king, with only the pawns on e5 and e2 in between. If the e5 pawn ever disappears, that e2 pawn is pinned.", '…Qe7 — three on e5, lined up on e1.'],
  ["a3 — the natural move: kick your bishop on b4 and make it decide. The obvious replies are to take on d2 or to step back. But do you have to move it right now? No, and that's the trap in this line.", 'a3 — kicks your bishop on b4.'],
  ["…Ngxe5 — take the pawn and leave the bishop where it is. Material is level again. And if they grab the bishop now with axb4? …Nd3 is checkmate. The knight jumps off e5, your queen pins the e2 pawn so it can't take, and the king is boxed in by its own pieces on d1, d2, f1 and f2. A smothered mate. Why the g4 knight and not the one on c6? Because this way the c6 knight backs up the new one on e5.", '…Ngxe5 — level; axb4 allows …Nd3 mate.'],
  ["Nxe5 — they trade off the knight before it can land on d3. Their knight on e5 hits c6, d7 and f7, so you take back straight away.", 'Nxe5 — trades off the dangerous knight.'],
  ["…Nxe5 — the knight takes back, and the gambit pawn is fully won back: material is level. Why not the queen? …Qxe5 walks into Bxe5. And notice the mate is on again: …Nd3 is threatened once more, so they still have to deal with d3.", '…Nxe5 — level, and …Nd3 is threatened again.'],
  ["e3 — that's their fix. With the pawn off e2, their bishop on f1 now covers d3, and the king gets e2 to step to. It also opens the way for that bishop to come out so they can castle.", 'e3 — covers d3, ends the mate threat.'],
  ["…Bxd2+ — your bishop is still hit by the a3 pawn, so cash it in: take the pinned knight, with check. Dropping back with …Bc5 instead runs into b4, and the bishop gets chased again. Once they take back they'll have the two bishops, but your knight on e5 sits in the middle of the board, and their d-pawn, which could have kicked it, is gone.", '…Bxd2+ — trade the pinned knight, with check.'],
  ["Qxd2 — the queen takes back. Material is level, they have the bishop pair, and their queen on d2 now looks at your d7 pawn. It's about level.", 'Qxd2 — level; they keep two bishops.'],
  ["…O-O — natural, but here the move order matters, and the engine prefers …d6 first. Why? Because now c5 can jump in, and then …d6 only gets you an isolated pawn after cxd6. After castling they are clearly better, with c5 the move that shows it. The better order, …d6 first, is the Main Bf4 Line tab.", '…O-O — natural, but …d6 first was better.'],
  ["Be2 — they develop and get ready to castle, and that lets you off the hook. c5 was stronger, taking d6 away from your pawn. After Be2 they are only a little better, and …d6 comes just in time.", 'Be2 — develops; c5 was stronger.'],
  ["…d6 — now the pawn gets there first. It gives your knight on e5 a second guard against the bishop on f4, and it opens the diagonal for your bishop on c8, the last piece still at home. It's about level.", '…d6 — guards e5, frees the c8 bishop.'],
  ["O-O — both kings are tucked away. Material is level, they have the two bishops, and you have a knight planted on e5. One piece of yours is still at home, the bishop on c8. Where should it go?", 'O-O — kings safe; your c8 bishop waits.'],
  ["…Bf5 — out to f5, where the bishop covers e4 and d3. Why d3? Because no pawn of theirs can ever cover it again: their c-pawn and e-pawn have both moved past it. That square is a home for your knight one day. They are a little better. Your plan from here: aim your knight and bishop at d3, and if they push f3 and e4, step the bishop back to e6.", '…Bf5 — covers d3 and e4.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });


/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Budapest Gambit: Adler Variation': ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'Nf3', 'Bc5', 'e3', 'Nc6', 'Be2', 'Ngxe5', 'Nxe5', 'Nxe5', 'O-O', 'O-O', 'b3'],
  'Budapest Gambit: Fajarowicz Variation': ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ne4', 'Nf3', 'Bb4+', 'Nbd2', 'Nc6', 'a3', 'Nxd2', 'Bxd2', 'Bxd2+', 'Qxd2', 'Qe7', 'Qc3', 'b6', 'e3', 'Bb7', 'Be2', 'O-O-O'],
  'Budapest Gambit: Rubinstein Variation': ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'Bf4', 'Nc6', 'Nf3', 'Bb4+', 'Nc3', 'Bxc3+', 'bxc3', 'Qe7', 'Qd5', 'f6', 'exf6', 'Nxf6', 'Qd3', 'd6', 'g3', 'O-O'],
  'Budapest Gambit: Main Bf4 Line': ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'Bf4', 'Nc6', 'Nf3', 'Bb4+', 'Nbd2', 'Qe7', 'a3', 'Ngxe5', 'Nxe5', 'Nxe5', 'e3', 'Bxd2+', 'Qxd2', 'd6', 'Be2', 'O-O', 'O-O', 'Bf5', 'Rfd1'],
  'Budapest Gambit: Alekhine Variation': ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'e4', 'Nxe5', 'f4', 'Nec6', 'Nc3', 'Bc5', 'Na4', 'Bb4+', 'Bd2', 'Qe7', 'Bd3', 'Qd6', 'Ke2', 'Bxd2'],
  'Budapest Gambit: Alekhine Variation with Bc5': ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'Nf3', 'Bc5', 'e3', 'Nc6', 'Nc3', 'Ngxe5', 'Nxe5', 'Nxe5', 'Be2', 'd6', 'O-O', 'O-O', 'b3', 'Re8'],
  'Budapest Gambit: 3...Ne4 Trappy Line': ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ne4', 'Nd2', 'Nc5', 'Ngf3', 'Nc6', 'g3', 'Qe7', 'Bg2', 'g6', 'O-O', 'Bg7', 'Nb3', 'Ne6', 'Be3', 'O-O'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Budapest Gambit: Adler Variation': [
    ["Nf3 — about a third of masters skip Bf4 and simply guard e5 with the knight. This is the Adler. With no bishop out on their side yet, f2 is guarded only by the king, so where does your own bishop want to go?", 'Nf3 — the Adler: the knight guards e5.'],
    ["…Bc5 — three masters in four aim it straight at f2. Your bishop and your knight on g4 both hit f2 now, and only their king guards it. The threat is …Nxf2: from f2 your knight would hit their queen on d1 and their rook on h1 at once.", '…Bc5 — two pieces on f2.'],
    ["e3 — every master plays it. The pawn steps into your bishop's path, so the line from c5 to f2 is shut, and it opens a diagonal for their bishop on f1. Grabbing space with e4 instead would let …Nxf2 crash in.", "e3 — blocks the c5 bishop's diagonal."],
    ["…Nc6 — every master's move: the second attacker on e5. Your two knights hit it, and only their knight on f3 guards it. Two against one, so the pawn is about to come back to you.", '…Nc6 — two attackers on e5, one guard.'],
    ["Be2 — half of masters develop the bishop and get ready to castle. Notice they've stopped defending e5: two attackers, one guard, so they're handing the pawn back. The engine prefers Nc3 here, and the Alekhine Variation with Bc5 tab covers it.", 'Be2 — develops; the e5 pawn goes.'],
    ["…Ngxe5 — the pawn comes back, and material is level. Take with the g4 knight, so the c6 knight stays behind it on guard. From e5 your knight hits their knight on f3 and the c4 pawn.", '…Ngxe5 — the gambit pawn is back.'],
    ["Nxe5 — they trade knights. Their knight on e5 hits c6, d7 and f7, so you take back at once. The engine prefers a3, gaining space with b4 in mind against your bishop on c5; after the trade it's about level.", 'Nxe5 — trades knights; a3 was stronger.'],
    ["…Nxe5 — back in the center, and nothing of theirs hits the knight there. Material is level, your bishop on c5 and knight on e5 are both active, and your king is one move from safety.", '…Nxe5 — centralized, material level.'],
    ["O-O — their king tucks away. What do they want next? f4, kicking your knight off e5, is the push they'd like to make; the engine slightly prefers a3 first.", 'O-O — king safe; f4 is their idea.'],
    ["…O-O — you castle too; …d6 first was just as good. Both kings are safe, and the fight now is about the middle of the board: your knight on e5 against the pawns that want to kick it.", '…O-O — both kings safe.'],
    ["b3 — the bishop on c1 is heading for b2, where it will hit your knight on e5 down the long diagonal, and the pawn also gives c4 a second guard. The engine prefers a3, taking queenside space first. One trap to avoid: a quick …d5 lets Qxd5 hit your bishop on c5 and your knight on e5 at once. They are a little better. Your plan from here: …d6 to put a pawn behind the knight on e5, then …Bf5 to bring out your last minor piece.", 'b3 — Bb2 next, aimed at e5.'],
  ],
  'Budapest Gambit: Fajarowicz Variation': [
    ["…Ne4 — the Fajarowicz, the wilder road, about one master in eight. Instead of chasing e5 from g4, the knight jumps into the center and eyes f2. But notice what it doesn't do: it doesn't hit e5 at all, so the pawn isn't coming back quickly. The engine much prefers …Ng4, and after …Ne4 they are clearly better. You play this for a messy fight, not for the pawn.", '…Ne4 — the Fajarowicz: the knight jumps in.'],
    ["Nf3 — four masters in ten develop and guard e5, and the knight also covers g5, a square your queen might use. The engine slightly prefers a3, taking b4 away from your bishop before it can give check.", 'Nf3 — develops, guards e5.'],
    ["…Bb4+ — check, and it develops a piece. A little under half of masters play it, about as many as play …Nc6. Here's the point of the question it asks: every block, on c3 or on d2, lands on a square your knight on e4 hits.", '…Bb4+ — check; every block meets your knight.'],
    ["Nbd2 — two masters in three block with the knight, and it hits your knight on e4. Can it take? No, it's pinned to their king by your bishop on b4, so your knight sits there safely for now. The engine prefers Bd2.", "Nbd2 — hits e4, but it's pinned."],
    ["…Nc6 — eight masters in ten bring the knight out and hit e5; the engine slightly prefers …d6, hitting e5 with a pawn instead. But think ahead: a3 is coming to kick your bishop, and once the bishop leaves b4, the pin is gone and your knight on e4 can be taken.", '…Nc6 — develops, hits e5.'],
    ["a3 — the bishop on b4 has to make up its mind. If it steps back, the pin is gone and their knight takes on e4. So you trade on d2, and the only question is which piece goes first.", 'a3 — your bishop must decide.'],
    ["…Nxd2 — the knight goes first. From d2 it hits their knight on f3, their bishop on f1 and the c4 pawn, so if they grab your bishop with axb4, …Nxf3 comes with check. The cleaner order was …Bxd2+ first; after …Nxd2 they are clearly better.", '…Nxd2 — hits f3 and f1; …Bxd2+ was cleaner.'],
    ["Bxd2 — the bishop takes back and now faces your bishop on b4, though for the moment it's pinned to their king. The engine prefers axb4, grabbing your bishop first.", 'Bxd2 — recaptures; axb4 was stronger.'],
    ["…Bxd2+ — trade bishops, with check. That clears the minor pieces off d2, and once they take back you're still a pawn down. So what's the compensation? Their extra pawn on e5 has to be held, and your pieces are lined up to keep hitting it.", '…Bxd2+ — trade bishops, with check.'],
    ["Qxd2 — the queen takes back and lands on the d-file their pawn left, looking at your d7 pawn. They're a pawn up and a little better, and everything now turns on the pawn on e5.", 'Qxd2 — a pawn up; e5 is the key.'],
    ["…Qe7 — a second attacker on e5, next to your knight on c6. The pawn is guarded only by their knight on f3, so it's two against one, and they have to find another defender.", '…Qe7 — two attackers on e5.'],
    ["Qc3 — there's the second defender: the queen guards e5 along the diagonal. Two against two, so the pawn holds for now, and you go back to developing.", 'Qc3 — guards e5 a second time.'],
    ["…b6 — where does your last bishop go? To b7, on the long diagonal, and this pawn makes the room. Castling short first was just as good.", '…b6 — room for …Bb7.'],
    ["e3 — a quiet move: it opens the diagonal for their bishop on f1 and takes d4 away from your knight on c6. They are clearly better here.", 'e3 — frees the f1 bishop.'],
    ["…Bb7 — the bishop arrives on the long diagonal behind your knight on c6, so it bites the moment that knight moves. Every minor piece of yours is out, and with b8, c8 and d8 all empty you can castle on either side.", '…Bb7 — your last minor piece is out.'],
    ["Be2 — their bishop comes out and they're one move from castling short. So where does your king go: next to theirs, or on the other side?", "Be2 — they're ready to castle."],
    ["…O-O-O — you castle long, away from where their king is heading, and that makes it a race. Be honest about where you stand: you're a pawn down, and they are clearly better. Your plan from here: …Rhe8 to stack your rook behind the queen against e5, kingside pawns forward with …g5, and watch for c5, the push they'll use to open lines at your king.", '…O-O-O — castles long; …Rhe8 next.'],
  ],
  'Budapest Gambit: Rubinstein Variation': [
    ["Nc3 — about a quarter of masters block with this knight, and it's the engine's first choice. But it's pinned to their king by your bishop on b4, and you can simply take it. This is the Rubinstein.", 'Nc3 — the Rubinstein: a pinned knight.'],
    ["…Bxc3+ — take it, with check. You give up the bishop, but look at what it costs them: they have to take back with the b-pawn, because blocking with Bd2 or Nd2 loses heavily. That leaves them doubled pawns on c3 and c4.", '…Bxc3+ — doubles their c-pawns.'],
    ["bxc3 — and there are the doubled c-pawns, with no b-pawn or d-pawn beside them, so no pawn can ever guard c4. In return they have the two bishops. That trade, structure for bishops, is what the Rubinstein is about.", 'bxc3 — doubled pawns for the bishop pair.'],
    ["…Qe7 — a third attacker on e5: both knights and the queen, against their bishop and knight. Why not break it open with …d6 instead? Then exd6, …cxd6 and Bxd6 just wins a pawn.", '…Qe7 — three on e5.'],
    ["Qd5 — the queen comes to guard e5 a third time, and it also eyes f7 and your knight on c6. Three against three, so piling up won't win the pawn. You need a new idea.", 'Qd5 — guards e5 a third time.'],
    ["…f6 — and there's the new idea: hit the pawn with a pawn. And if they take on f6, your knight takes back and hits their queen on d5, so you gain a move.", '…f6 — hit the pawn with a pawn.'],
    ["exf6 — they take, and the pawn on f6 hits your queen on e7. You have three ways to take back, and two of them go wrong. Also notice c7: with the e5 pawn gone, their bishop on f4 now hits it.", 'exf6 — hits your queen; c7 is loose.'],
    ["…Nxf6 — the knight takes back and hits their queen on d5, so you gain a move. The other two cost you: …Qxf6 walks into Qe4 check, and …gxf6 lets Qh5 give check and then take your knight on g4.", '…Nxf6 — hits the queen, gains time.'],
    ["Qd3 — the queen steps back, and from d3 it looks at your pawns on h7 and d7. But the bigger issue is c7: their bishop on f4 hits it, and nothing of yours guards it.", 'Qd3 — retreats; c7 still hangs.'],
    ["…d6 — one move, two jobs. The pawn steps in front of c7, so the bishop on f4 can't take it, and it opens the diagonal for your bishop on c8.", '…d6 — shields c7, frees the c8 bishop.'],
    ["g3 — their bishop is heading for g2 and their king for the short side. Notice the pin that's still there: your queen on e7 pins their e2 pawn to the king on e1, so that pawn can't move until the king does.", 'g3 — fianchetto; e2 is still pinned.'],
    ["…O-O — king safe first; …b6 and …Bg4 were just as good. They are a little better. Your plan from here: put your bishop on g4 or b7, bring a rook to e8 on the half-open e-file, and send the knight to a5 against c4, the doubled pawn no pawn of theirs can ever defend.", '…O-O — king safe; c4 is the target.'],
  ],
  'Budapest Gambit: Main Bf4 Line': [
    ["…d6 — this time the pawn comes before castling, and that's the engine's choice. It gives your knight on e5 a second guard against the bishop on f4, opens the way for your bishop on c8, and covers c5, so their c5 push can't cramp you. It's about level.", '…d6 first — guards e5, covers c5.'],
    ["Be2 — the bishop develops and their king can castle next. Compare the main line: there, castling first let c5 in. Here, c5 would simply be taken by your d6 pawn.", 'Be2 — develops, castling next.'],
    ["…O-O — now castling comes at the right moment, with the d6 pawn already in place. Your king is safe, and your rook on f8 can come to the center later.", '…O-O — castling at the right moment.'],
    ["O-O — both kings are safe and material is level. They have the bishop pair; you have the knight on e5, guarded by your pawn on d6, and their f-pawn can't come forward to kick it while their own bishop sits on f4.", 'O-O — level; your knight holds e5.'],
    ["…Bf5 — the last minor piece comes out to f5, where it covers e4 and d3. And d3 is a square no pawn of theirs can ever cover again, so it's a real hole in their camp.", '…Bf5 — covers d3, a hole.'],
    ["Rfd1 — the rook lines up behind the queen on the d-file, a battery aimed at your d6 pawn. The engine prefers Rac1, and they are a little better. Your plan from here: keep d6 held by the c7 pawn and your queen, bring a rook to e8 on the half-open e-file, and keep your pieces pointed at the hole on d3.", 'Rfd1 — a battery on the d-file.'],
  ],
  'Budapest Gambit: Alekhine Variation': [
    ["e4 — the Alekhine, chosen by fewer than one master in ten. Instead of guarding e5, they build a big center. And look at your knight on g4: with the e-pawn gone from e2, their queen on d1 now hits it, and nothing of yours guards it. So the knight has to move, and luckily it has a good square.", 'e4 — a big center; your knight is hit.'],
    ["…Nxe5 — almost every master takes the pawn back at once, and the knight gets out of the queen's line in the same move. Material is level, and from e5 your knight hits c4.", '…Nxe5 — the pawn is back, knight safe.'],
    ["f4 — nearly nine masters in ten kick the knight right away. Now they have pawns on c4, e4 and f4: a lot of space, and every one of those pawns has to be looked after. Where does your knight go?", 'f4 — kicks the knight, more center.'],
    ["…Nec6 — about seven masters in ten drop back to c6, and here's why it's the right square: the knight eyes d4, and no pawn of theirs can ever cover d4 again, because their c- and e-pawns have both moved past it. About three in ten go …Ng6 instead, which the engine likes much less.", '…Nec6 — eyes d4, a hole for good.'],
    ["Nc3 — fewer than one master in five plays it; nearly half prefer Be3. The knight covers d5, but their bishop on c1 stays at home, and your next move uses that time.", 'Nc3 — develops, covers d5.'],
    ["…Bc5 — nearly nine masters in ten put the bishop here, and look how far it sees: with their f-pawn gone from f2, the diagonal runs all the way to their knight on g1. That's the square their king castles to, so while this bishop stands on c5, short castling is off.", '…Bc5 — aims at g1; no short castling.'],
    ["Na4 — about a third of masters go straight after the bishop: the knight hits c5, and nothing of yours guards it. Do you trade it for a knight on the rim? Not if you don't have to.", 'Na4 — hits the unguarded bishop on c5.'],
    ["…Bb4+ — the bishop escapes with check, the choice of three masters in four here. The engine prefers …Na6, guarding the bishop so it can stay on the diagonal toward g1.", '…Bb4+ — escapes with check.'],
    ["Bd2 — they block with the bishop and offer a trade on d2. For now it's pinned to their king by your bishop on b4, so it can't leave.", 'Bd2 — blocks; offers a bishop trade.'],
    ["…Qe7 — the queen joins in along the e-file, and look at e4: that pawn is pinned to their king on e1, and nothing guards it. So they have to deal with it right now.", '…Qe7 — pins and hits e4.'],
    ["Bd3 — the bishop guards e4. But now look at the bishop itself: their queen can't reach d3 through their own bishop on d2, so nothing guards it.", "Bd3 — guards e4, but it's unguarded."],
    ["…Qd6 — the queen hits two things: the bishop on d3, which has no guard, and the pawn on f4. Queens that come out early usually get kicked around; this one keeps landing on squares with a threat.", '…Qd6 — hits the bishop on d3 and f4.'],
    ["Ke2 — the king itself steps up to guard the bishop on d3. It looks strange, but it's the engine's first choice, and the game is about level. The price: their king can never castle now.", 'Ke2 — the king guards d3.'],
    ["…Bxd2 — take the bishop that was guarding f4. If the king takes back, …Qxf4 comes with check and wins a pawn; if the queen takes back, …Nb4 hits the bishop on d3, and once it moves the queens come off on d2. They are a little better. Your plan from here: trade queens when they let you, then go after e4, which no pawn of theirs can ever guard again, while their king sits on e2.", "…Bxd2 — removes f4's guard."],
  ],
  'Budapest Gambit: Alekhine Variation with Bc5': [
    ["Nc3 — nearly three masters in ten choose it, and it's the engine's first choice here: the knight develops before the bishop and covers d5 and e4. But it adds no guard to e5, so the pawn is still two against one.", 'Nc3 — develops, but e5 still falls.'],
    ["…Ngxe5 — the pawn comes back and material is level; castling first was just as good. The g4 knight takes, so the knight on c6 stays behind it on guard, and from e5 it hits their knight on f3 and the c4 pawn.", '…Ngxe5 — the gambit pawn is back.'],
    ["Nxe5 — they trade knights, the engine's first choice. Their knight on e5 hits c6, d7 and f7, so you take back straight away.", 'Nxe5 — trades knights.'],
    ["…Nxe5 — back in the center, and material is level. Now what would they love to play? f4, kicking your knight and grabbing space. When it comes, the knight drops back to c6 or g6.", '…Nxe5 — centralized; watch for f4.'],
    ["Be2 — a quiet developing move, and it lets you breathe. f4 at once, kicking your knight, was much stronger. After Be2 it's about level.", 'Be2 — quiet; f4 was much stronger.'],
    ["…d6 — the pawn gives your knight on e5 a solid guard and opens the diagonal for your bishop on c8, which is heading for f5.", '…d6 — guards e5, frees the bishop.'],
    ["O-O — their king tucks away on g1. Notice your bishop on c5: it hits the e3 pawn, and right behind it is f2, in front of their king.", 'O-O — their king is safe on g1.'],
    ["…O-O — you castle too, and now your rook on f8 can come to e8, onto the half-open e-file.", '…O-O — castle; …Re8 next.'],
    ["b3 — the pawn gives c4 a second guard and makes room for their bishop on c1 to come to b2. With their own knight on c3 in the way, that bishop won't see your knight on e5 just yet.", 'b3 — guards c4; Bb2 next.'],
    ["…Re8 — the rook takes the half-open e-file, right behind your knight on e5. They are a little better. Your plan from here: …Bf5 for your last minor piece, then …Qh4, bringing the queen over toward their king.", '…Re8 — the rook on the half-open e-file.'],
  ],
  'Budapest Gambit: 3...Ne4 Trappy Line': [
    ["Nd2 — about one master in seven challenges your knight at once: the knight on d2 hits e4, and nothing of yours guards it. The engine prefers a3, taking b4 away from your bishop first. Either way, your knight on e4 has to do something.", 'Nd2 — hits your knight on e4.'],
    ["…Nc5 — half of masters step back to c5; the other half pin with …Bb4. On c5 the knight is safe and still in play, watching d3 and b3. But be honest about this line: they are clearly better.", '…Nc5 — the knight steps back.'],
    ["Ngf3 — three masters in four develop the other knight and guard e5. The engine prefers b4, chasing your knight off c5 straight away; after Ngf3 they are a little better.", 'Ngf3 — guards e5; b4 was stronger.'],
    ["…Nc6 — almost every master plays it. The knight hits e5, and it also covers b4, so their pawn can't come there to chase your knight on c5.", '…Nc6 — hits e5, covers b4.'],
    ["g3 — their bishop is heading for g2, and their king for g1. The engine prefers a3 for them, backing up b4 to chase your knight on c5. While they spend time on the fianchetto, how do you get at e5?", 'g3 — a fianchetto is coming.'],
    ["…Qe7 — the queen joins the knight on c6 against e5. But this is the slip in the line. The better answer was …d6, breaking the center open while their bishop is still at home, and the engine likes it much more. After …Qe7 they are clearly better.", '…Qe7 — hits e5; …d6 was much stronger.'],
    ["Bg2 — the bishop settles on g2, and their king is one move from castling.", 'Bg2 — castling is next.'],
    ["…g6 — you'll fianchetto as well. The pawn makes room for your bishop on g7, where it will hit e5 from a third direction. The engine still slightly prefers …d6.", '…g6 — making room for …Bg7.'],
    ["O-O — they castle. Rb1 first, preparing b4 to chase your knight on c5, was stronger. After castling they are still clearly better.", 'O-O — castles; Rb1 was stronger.'],
    ["…Bg7 — and there's the third attacker: the bishop, the knight on c6 and the queen on e7 all hit e5, and only their knight on f3 guards it. Now they have to react.", '…Bg7 — three on e5, one guard.'],
    ["Nb3 — instead of guarding e5, they hit your knight on c5 and offer a trade. Do you take? No: the knight steps aside and keeps its eye on the center.", 'Nb3 — hits your knight on c5.'],
    ["…Ne6 — the knight steps back to e6, where it covers d4 and f4, two squares their pieces would like. Notice it now stands in front of your queen, so for the moment e5 is hit twice, not three times.", '…Ne6 — covers d4 and f4.'],
    ["Be3 — the bishop comes out to e3, eyeing your a7 pawn. Why not f4? Your knight on e6 covers it. The engine prefers Qd5.", 'Be3 — develops; Qd5 was stronger.'],
    ["…O-O — your king is safe, and the e5 pawn is still in your sights: your bishop on g7 and knight on c6 hit it, and only their knight on f3 guards it. They are a little better. Your plan from here: win back e5 with your pieces, and push …a5 and …a4 to drive their knight off b3.", '…O-O — king safe; e5 is next.'],
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

export const BUDAPEST_GAMBIT_WATCH: WatchCourse = {
  openingId: 'budapest-gambit',
  title: 'Budapest Gambit — A Master Class',
  orientation: 'black',
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
  lines: [
    { tab: null, moves: MAIN },
    // The Adler stops at b3, three plies short of the depth gate, once the
    // pawn is won back: a roadmap, as its hand-written lesson was.
    ...Object.entries(TAB_LINES).map(([tab, moves]) => (tab === 'Budapest Gambit: Adler Variation' ? { tab, moves, kind: 'roadmap' as const } : { tab, moves })),
  ],
  beats,
};
