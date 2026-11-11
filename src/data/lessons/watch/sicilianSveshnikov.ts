// Sicilian Sveshnikov — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=sicilian-sveshnikov`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a). One story threads the course: …e5 hands
// them the d5 hole and a backward d6 pawn, and buys time, the bishop pair and
// the …f5 break in return.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Nd5', 'Be7', 'Bxf6', 'Bxf6', 'c3', 'O-O', 'Nc2', 'Bg5', 'Be2', 'Be6', 'O-O', 'Rb8'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — just under half the masters open this way. The pawn grabs a central square and already covers d5. Remember that square, because the whole Sveshnikov is a fight over it.", 'e4 — they take the center.'],
  ["…c5 — the Sicilian, almost half the masters' choice. The pawn doesn't touch e4 at all. It watches d4, so the day their d-pawn lands there, you can swap your c-pawn for it and keep two center pawns of your own. The engine rates this the same as …e5; they are a little better.", '…c5 — the Sicilian: watch d4.'],
  ["Nf3 — eight masters in ten. The knight develops and covers d4, so their d-pawn can go there with support behind it. They're heading for an open fight in the center.", 'Nf3 — develops, backs up d4.'],
  ["…Nc6 — about a quarter of the masters, while …d6 is the most common move. Which squares does this knight watch? d4, where their pawn is heading, and e5. Hold on to that second one: later your e-pawn goes to e5, and this knight will stand right behind it.", '…Nc6 — watches d4 and e5.'],
  ["d4 — about six masters in ten open it up; Bb5, going after your knight, is the other common choice. The pawn hits your c5 pawn, and nothing guards it. Do you defend? No. This is exactly the trade …c5 was waiting for.", 'd4 — opens the center, hits c5.'],
  ["…cxd4 — every master takes. Your c-pawn is gone for their d-pawn, the c-file is half-open for your rooks, and you still have both center pawns. The pawn on d4 won't last; they take it back right away.", '…cxd4 — a flank pawn for a center one.'],
  ["Nxd4 — every master takes back with the knight, and now it stands in the center, aimed at your knight on c6. And look at e4: no piece of theirs guards it. That tells you what to do next.", 'Nxd4 — recaptures; e4 has no guard.'],
  ["…Nf6 — about six masters in ten develop with a hit on e4, the pawn nothing guards. Why not push …e5 straight away? You can: that's the Kalashnikov, the engine's slight preference, and it has its own tab. Here the knight comes first, so they have to look after e4 before anything else.", '…Nf6 — develops, hits the loose e4.'],
  ["Nc3 — every master guards e4 this way, and the knight covers d5 as well. Now look at the knight on d4: it stands in the middle of the board, and only their queen backs it up. Can you kick it?", 'Nc3 — guards e4, covers d5.'],
  ["…e5 — the Sveshnikov, chosen by six masters in ten. The pawn kicks their knight off d4, and it covers d4 and f4 for good. Now look at the price. Your c-pawn is gone and your e-pawn has gone past d5, so no pawn of yours can ever cover that square again: d5 is a hole, and their knight on c3 is one jump away. Your d-pawn will be left backward, with no pawn beside it to support it. In return you get time, because the knight has to run, and room for your pieces. That trade is the whole Sveshnikov. The engine rates it the same as …e6; they are a little better.", '…e5 — kick the knight; d5 is the price.'],
  ["Ndb5 — almost every master, and the engine's choice: the trade on c6 or a jump to f5 gives up most of their edge. From b5 the knight looks at d6. Count it: their knight and their queen on d1 both aim at d6, only your bishop on f8 covers it, and a knight landing there would give check.", 'Ndb5 — the knight eyes d6.'],
  ["…d6 — nearly every master. The pawn takes d6 for itself, so no knight can land there with check. Try a slower move like …h6 and Nd6 check comes at once, and after the trade there their queen sits on d6. So here is your backward pawn. Their knight and queen hit it, your queen and your bishop on f8 guard it, and it holds.", '…d6 — no knight lands on d6.'],
  ["Bg5 — eight masters in ten. The bishop goes after your knight on f6 and pins it to your queen. Why that knight? Count the guards of d5: their pawn on e4, the knight on c3 and the queen all cover it, and the knight on f6 is the only piece of yours that does. Take it away, and the hole belongs to them.", 'Bg5 — pins the f6 knight.'],
  ["…a6 — every master plays it. The pawn hits the knight on b5, and it has to go. Where? c3 is taken by its partner, d4 is covered by your e5 pawn, and on c7 or d6 it would just be lost. So it's headed for the edge.", '…a6 — the knight on b5 must go.'],
  ["Na3 — almost every master. A knight on the rim, and look at its future: from a3 it can only head for b5 or c4, and your next move shuts both doors. That's part of what …e5 bought you. Their knight has walked from d4 to the edge of the board.", 'Na3 — the knight runs to the rim.'],
  ["…b5 — nearly every master, and the timing matters. Their knight wanted c4, where it would hit your d6 pawn; play a slower move like …Be7 and Nc4 comes, and later d6 drops. The pawn on b5 covers c4 and grabs space, and the knight on a3 stays shut out.", '…b5 — covers c4, shuts out the knight.'],
  ["Nd5 — a little over half the masters jump into the hole now; about four in ten take on f6 first, and that has its own tab. The knight lands on d5 and hits your knight on f6, the piece already pinned by the bishop on g5. And look at e4: nothing guards it. Can you take it? No. Your knight is pinned to your queen, and …Nxe4 loses the queen to Bxd8.", 'Nd5 — into the hole, hits f6.'],
  ["…Be7 — nearly every master. The bishop comes to e7, right behind the knight, so if the knight moves, only a bishop stands behind it now, not your queen. Your king is one move from castling too. And e4 still has no guard. How do they deal with that?", '…Be7 — breaks the pin on the queen.'],
  ["Bxf6 — nearly every master takes now. Their bishop goes for your knight, the last piece of yours guarding d5, and with it gone the hole really belongs to them. You take back. But with what?", 'Bxf6 — removes the guard of d5.'],
  ["…Bxf6 — every master takes with the bishop; taking with the g-pawn here costs more than a pawn. Now look at what you've got: two bishops against their one. This one is a bad bishop for now, though: your pawns on d6 and e5 stand on its color and block it. Getting it outside that pawn chain is a job for later.", '…Bxf6 — two bishops against one.'],
  ["c3 — three masters in four play it; about one in four grab space with c4, and that's the Chelyabinsk tab. The pawn covers b4 and d4, so your b-pawn can't push to b4 and your knight can't jump to d4. And it frees c2, the road back into the game for the knight on a3.", 'c3 — covers b4 and d4.'],
  ["…O-O — from here on, the line leaves the masters' games. Your king is tucked away first, and the engine rates …Rb8 about the same. Now the real question: none of your pieces hits the knight on d5. How will you challenge it?", '…O-O — king safe; now, the d5 knight.'],
  ["Nc2 — the knight comes off the rim. From c2 it can go to e3, giving d5 one more guard, or to b4, hitting your knight on c6. And with a3 empty, their a-pawn can now come to a4 and hit your b5 pawn.", 'Nc2 — off the rim; a4 is possible.'],
  ["…Bg5 — remember the bad bishop on f6? Here it walks outside your pawn chain. On g5 it covers e3, a square their knight on c2 can use, and it clears f6, so your f-pawn is free to come to f5 one day and hit e4. The engine rates …Bh4 about the same.", '…Bg5 — the bishop escapes; covers e3.'],
  ["Be2 — the bishop develops, hits your b5 pawn, which your a6 pawn guards, and clears the way to castle. The engine prefers h4, kicking your bishop on g5 at once. It's about level.", 'Be2 — castling next; h4 was stronger.'],
  ["…Be6 — finally a piece of yours hits the knight on d5. It's guarded twice, by the e4 pawn and the queen, so you can't win it, but now …Bxd5 is always there: the knight in your hole can be traded off whenever it suits you. The bishop also covers f5, the square your f-pawn has in mind.", '…Be6 — hits the d5 knight.'],
  ["O-O — their king joins yours on the kingside, and both sides are set. It's about level. Your plan for the middlegame: bring your knight from c6 to e7 to challenge d5 a second time, keep …Bxd5 in reserve, and get your rook behind the b-pawn.", 'O-O — both kings are safe.'],
  ["…Rb8 — the rook steps behind your b-pawn, so b5 now has two guards, and the day the b-file opens, the rook is already on it. It's about level. Your plan for the middlegame: …g6 and …Ne7 to trade off the knight on d5, then …f5 against e4, the break your bishop on g5 cleared the way for.", '…Rb8 — behind the b-pawn; b5 guarded twice.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line (or an earlier tab) doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Sveshnikov: Main Line 9.Nd5 (Deep)': ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Nd5', 'Be7', 'Bxf6', 'Bxf6', 'c3', 'O-O', 'Nc2', 'Bg5', 'Be2', 'Be6', 'O-O'],
  'Sveshnikov: 9.Bxf6 gxf6 Early Exchange': ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Bxf6', 'gxf6', 'Nd5', 'Bg7', 'c3', 'f5', 'exf5', 'Bxf5', 'Nc2', 'Be6', 'Nce3', 'O-O', 'Bd3', 'f5', 'Qh5'],
  'Sveshnikov: Chelyabinsk (c4 System)': ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Nd5', 'Be7', 'Bxf6', 'Bxf6', 'c4', 'b4', 'Nc2', 'a5', 'Be2', 'O-O', 'O-O', 'Bg5', 'Qd3', 'Be6'],
  'Sveshnikov: Novosibirsk (...Bg5 System)': ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Nd5', 'Be7', 'Bxf6', 'Bxf6', 'c3', 'Bg5', 'Nc2', 'Rb8', 'h4', 'Bh6', 'Be2', 'O-O'],
  'Anti-Sveshnikov: 6.Nf3 Quiet Retreat': ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Nf3', 'Bb4', 'Bd3', 'd5', 'exd5', 'Nxd5', 'Bd2', 'Bxc3', 'bxc3', 'O-O'],
  'Sveshnikov: 11.c4 Queenside Grip': ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Nd5', 'Be7', 'Bxf6', 'Bxf6', 'c4', 'b4', 'Nc2', 'O-O', 'g3', 'a5', 'Bg2', 'Bg5', 'O-O', 'Be6', 'Qd3'],
  'Sveshnikov: Kalashnikov (4...e5 5.Nb5 d6)': ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'e5', 'Nb5', 'd6', 'N1c3', 'a6', 'Na3', 'b5', 'Nd5', 'Nf6', 'c4', 'b4', 'Nc2', 'Nxe4'],
  'Sveshnikov: ...Rb8 Expansion Plan': ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Nd5', 'Be7', 'Bxf6', 'Bxf6', 'c3', 'O-O', 'Nc2', 'Rb8', 'a4', 'bxa4', 'Rxa4', 'a5'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The Deep line is the main line one move short: every beat is already
  // written, and its last one (their castling) closes on the plan.
  'Sveshnikov: Main Line 9.Nd5 (Deep)': [],
  'Sveshnikov: 9.Bxf6 gxf6 Early Exchange': [
    ["Bxf6 — about four masters in ten take before jumping to d5. The bishop hits your queen, so you have to take back, and the question is what with. The queen? Then Nd5 hits it again and you've lost time. So it's a pawn.", 'Bxf6 — trades early, hits your queen.'],
    ["…gxf6 — every master takes with the g-pawn. Your pawns look a mess: doubled on the f-file, and the h-pawn left on its own. But look at what you get. You keep two bishops against one, the g-file opens for a rook, and the pawn on f6 can go to f5 and hit e4, the pawn that supports d5.", '…gxf6 — doubled pawns, but two bishops.'],
    ["Nd5 — every master: the knight lands in the hole and hits your f6 pawn, which your queen guards. Is Naxb5 a sacrifice to try? Not here: after …axb5 and Bxb5 they've given a knight for two pawns.", 'Nd5 — the knight takes the hole.'],
    ["…Bg7 — about three masters in ten. The bishop guards f6 and clears f8 so you can castle. Most masters, and the engine, play …f5 at once instead, hitting e4 right away.", '…Bg7 — guards f6; …f5 was better.'],
    ["c3 — a little over a third of the masters; about half develop with Bd3, and the engine prefers Qh5. The pawn covers b4 and d4, and it frees c2, the road home for the knight on a3. It's about level.", 'c3 — clears c2 for the a3 knight.'],
    ["…f5 — more than eight masters in ten, and here's the break. The pawn hits e4, the pawn that backs up their knight on d5, and nothing guards e4. Why now? A slower move like …Ne7 gives away more than half a pawn; the f-pawn can't wait.", '…f5 — the break: hits e4.'],
    ["exf5 — about three masters in four take. Look what it costs them: the e4 pawn is gone, so their knight on d5 has lost its pawn support, and your pawns on d6 and e5 have no pawn of theirs left in front of them. Their pawn on f5 has no guard, and your bishop on c8 takes it next.", 'exf5 — takes, but d5 loses its pawn.'],
    ["…Bxf5 — every master takes back, and the material is level. The bishop lands on an open diagonal, covering d3 and e4, and it backs up a push of your e-pawn to e4 one day. Both your bishops are out now.", '…Bxf5 — material level, open diagonal.'],
    ["Nc2 — the knight leaves the rim and heads for e3. From there it would hit your bishop on f5 and give d5 a second guard. Right now the bishop on f5 has no guard of its own, so it's worth a thought before they get there.", 'Nc2 — e3 next, against your bishop.'],
    ["…Be6 — the bishop steps back before Ne3 can hit it, and on e6 it does two jobs. It hits the knight on d5, which only their queen guards now. And it covers f5, because your second f-pawn, the one on f7, can go there too.", '…Be6 — hits d5, covers f5.'],
    ["Nce3 — the knight gives d5 a second guard. Why not develop with Bd3 first? Because the bishop on d3 would block their queen's view of d5, and …Bxd5 would win the knight. The engine prefers g3.", 'Nce3 — a second guard on d5.'],
    ["…O-O — the king goes to g8, and look where your rook lands: f8, right behind the f7 pawn. That will matter in a moment.", '…O-O — king safe, rook behind the f-pawn.'],
    ["Bd3 — now the bishop can come out, since the knight on e3 guards d5. It hits your b5 pawn and h7, both guarded, and it lines up on f5, the square your f-pawn wants.", 'Bd3 — develops, eyes f5 and h7.'],
    ["…f5 — the second f-pawn goes, and it holds: their knight on e3 and bishop on d3 hit it, and your rook on f8 and bishop on e6 guard it. It also prepares …e4, with the f5 pawn behind it.", '…f5 — the second break, and it holds.'],
    ["Qh5 — the queen piles on: now three pieces hit f5 against your two guards, and the queen hits h7 too. The engine prefers Bc2. It's about level. Your plan for the middlegame: push …e4 to hit the bishop on d3, which nothing guards, so that once it moves it no longer reaches f5, and bring your knight to e7 to guard f5 a third time.", 'Qh5 — three on f5; Bc2 was stronger.'],
  ],
  'Sveshnikov: Chelyabinsk (c4 System)': [
    ["c4 — about one master in four; most play c3. This is the Chelyabinsk idea: a pawn on c4 backs up the knight on d5, so now two pawns and the queen guard it. And the pawn hits your b5 pawn, together with the knight on a3: two attackers against your one guard on a6.", 'c4 — grips d5, hits b5.'],
    ["…b4 — your b5 pawn was hit twice and guarded once, so something had to give. Castle now and cxb5 wins it. So the pawn steps forward, and on b4 it hits the knight on a3, which has to move again.", '…b4 — hits the a3 knight.'],
    ["Nc2 — the knight steps out of reach and turns around to hit your b4 pawn. Count it: their knights on c2 and d5 both hit b4, and only your knight on c6 guards it. You need one more.", 'Nc2 — two knights on your b4 pawn.'],
    ["…a5 — there's the second guard: the pawn on a5 backs up b4. Your queenside pawns now stand on a5 and b4, taking space, and the b4 pawn takes a3 and c3 away from their pieces.", '…a5 — b4 has two guards now.'],
    ["Be2 — the bishop develops and their king can castle. The engine prefers h4. It's about level.", 'Be2 — develops, castling next.'],
    ["…O-O — your king is safe. Notice that the knight on d5 can take your bishop on f6 with check whenever it likes; keep that in mind.", '…O-O — king safe; watch Nxf6 check.'],
    ["O-O — they castle too. The engine prefers Nxf6 check first, trading the knight for your bishop while it still stands on f6. It's about level.", 'O-O — castles; Nxf6 check was stronger.'],
    ["…Bg5 — and the bishop takes its chance to leave f6. It's out of the knight's reach now and outside your pawn chain, where it covers e3 and d2. And with f6 empty, your f-pawn is free to go to f5.", '…Bg5 — leaves f6, covers e3.'],
    ["Qd3 — the queen guards d5 and the c4 pawn, and clears d1 for a rook. A rook there would line up on your d6 pawn, the backward pawn …e5 left you with.", 'Qd3 — guards d5, clears d1.'],
    ["…Be6 — the bishop hits the knight on d5 and covers f5. It's about level. Your plan for the middlegame: …g6 and then …f5, the break against e4, the pawn that holds the knight on d5 together with c4, and keep …Bxd5 as an option.", '…Be6 — hits d5; …f5 is the plan.'],
  ],
  'Sveshnikov: Novosibirsk (...Bg5 System)': [
    ["…Bg5 — before castling, the bad bishop goes straight outside your pawn chain. On g5 it covers d2 and e3, keeping their pieces off both, and it frees f6 for your f-pawn. Your king can castle later.", '…Bg5 — the bishop first, castling later.'],
    ["Nc2 — the knight leaves a3, and now their a-pawn can come to a4. Look at b5: if a4 lands, the pawn and their bishop on f1 both hit it, and only your a6 pawn guards it. So b5 needs help first.", 'Nc2 — a4 is coming for b5.'],
    ["…Rb8 — the rook gives b5 its second guard, so the pawn holds even after a4, and if the b-file ever opens, the rook is there first.", '…Rb8 — a second guard for b5.'],
    ["h4 — the pawn hits your bishop on g5. The engine prefers g3 or a4 here; the pawn on h4 has only the rook on h1 behind it, and it's about level. So where does the bishop go? Or does it have to go at all?", 'h4 — hits your g5 bishop.'],
    ["…Bh6 — the bishop keeps its diagonal: from h6 it still covers f4, e3 and d2. But it didn't have to move at all. The engine prefers …Bxh4: only the rook on h1 guards that pawn, and if the rook takes back, your queen takes the rook. After …Bh6 they are a little better.", '…Bh6 — keeps the diagonal; …Bxh4 was better.'],
    ["Be2 — the bishop develops and hits your b5 pawn, which your rook and a6 pawn guard. The engine prefers g4. It's about level.", 'Be2 — develops; g4 was stronger.'],
    ["…O-O — now you castle, and keep an eye on h4: your queen hits it, and only the rook on h1 guards it, so if they castle short, …Qxh4 picks it up. It's about level. Your plan for the middlegame: if they push g4 to kick your bishop, …Bf4 offers it for the knight on d5, and once that knight takes, your hole is empty again.", '…O-O — castle; h4 hangs if they do.'],
  ],
  'Anti-Sveshnikov: 6.Nf3 Quiet Retreat': [
    ["Nf3 — a quiet retreat, while almost every master plays Ndb5. The knight hits your e5 pawn, which your knight on c6 guards. But count the moves: this knight went f3, d4 and back to f3, and it is nowhere near d6. The engine much prefers Ndb5; now you are a little better.", 'Nf3 — retreats; Ndb5 was much stronger.'],
    ["…Bb4 — nearly nine masters in ten. The bishop pins their knight on c3 to the king, and that knight is the only piece guarding e4. A pinned knight can't take anything, so your knight on f6 is now threatening …Nxe4.", '…Bb4 — pins c3; e4 is hanging.'],
    ["Bd3 — about one master in five guard e4 this way; three in four play Bc4. The bishop holds e4 and gets the king ready to castle, which would end the pin. You are a little better. So what now? Can you hit e4 again?", 'Bd3 — guards e4, castling next.'],
    ["…d5 — eight masters in ten, and here's the reward for their slow knight. Remember the price of …e5: a hole on d5 and a backward d-pawn. With no knight on b5 hitting d6, your d-pawn goes to d5 in one step, and both problems are gone. It also hits e4. The engine slightly prefers …Bxc3 check first.", '…d5 — no hole, no backward pawn.'],
    ["exd5 — nearly nine masters in ten take, and the pawn hits your knight on c6. You'll take back on d5; the only question is with which piece.", 'exd5 — takes, and hits c6.'],
    ["…Nxd5 — the knight takes back and lands in the center, hitting the knight on c3 again. That knight is still pinned to the king, now hit twice and guarded only by the b2 pawn. The engine's first choice was …Qxd5. It's about level.", '…Nxd5 — hits the pinned c3 knight.'],
    ["Bd2 — the bishop gives c3 a second guard and steps in between your bishop and their king, so the pin is gone. The engine prefers castling. It's about level. So do you keep the tension, or trade on c3?", 'Bd2 — breaks the pin; castling was better.'],
    ["…Bxc3 — you trade, and it's the engine's first choice. Your bishop on c3 now hits their bishop on d2 and the b2 pawn, and it pins that bishop to their king, so they have to take back at once. You are a little better.", '…Bxc3 — trades, pins the d2 bishop.'],
    ["bxc3 — the pawn takes back, the engine's first choice, and the bishop stays on d2. The price is the structure: their c-pawns are doubled on c2 and c3, and a doubled pawn can't guard the one in front of it. You are a little better.", 'bxc3 — doubled c-pawns for them.'],
    ["…O-O — your king goes to safety, a hair behind …Bg4 in the engine's list. You are a little better. Your plan for the middlegame: …Bg4 next, pinning their knight on f3 to the queen on d1, then …f6 to give your e5 pawn a second guard, with the doubled c-pawns as their long-term weakness.", '…O-O — king safe; …Bg4 next.'],
  ],
  'Sveshnikov: 11.c4 Queenside Grip': [
    ["…O-O — this time you castle before …a5. The engine rates …a5 first, as in the Chelyabinsk tab, a little higher, but the idea is the same: king safe, then shore up b4. It's about level.", '…O-O — castle first, …a5 later.'],
    ["g3 — a new plan for them. The pawn takes f4 away from your bishop and prepares Bg2, where their bishop will guard e4 from the long diagonal. It also gets h4 ready, to hit a bishop that comes to g5.", 'g3 — fianchetto coming, f4 covered.'],
    ["…a5 — now the second guard: the pawn on a5 backs up b4, which their knights on c2 and d5 both hit. Your queenside pawns hold, with space to spare.", '…a5 — b4 has two guards.'],
    ["Bg2 — the bishop takes the long diagonal and guards e4. Look how solid their center is: two pawns and the queen guard the knight on d5, and the bishop on g2 stands behind e4. It's about level.", 'Bg2 — guards e4 from the long diagonal.'],
    ["…Bg5 — the bishop leaves f6 and gets outside your pawn chain again, covering e3 and d2. The engine prefers …g6 first. If h4 comes, the bishop simply drops back to h6 and keeps the same diagonal.", '…Bg5 — outside the chain; …g6 first was better.'],
    ["O-O — they castle, and both kings are on the kingside. It's about level. Now the question for you: how do you get at the knight on d5?", 'O-O — both kings castled.'],
    ["…Be6 — the bishop hits the knight on d5 and covers f5. The knight is guarded three times, so this isn't a threat to win it; it's a standing offer to trade, …Bxd5, whenever that helps you.", '…Be6 — hits d5, covers f5.'],
    ["Qd3 — the queen steps up to guard d5 and c4, and clears d1 for a rook on the half-open d-file, aimed at your d6 pawn. They are a little better. Your plan for the middlegame: bring your knight to e7 to challenge d5 again, and if they kick your bishop with h4, drop it to h6, where it still covers e3.", 'Qd3 — guards d5; d1 for a rook.'],
  ],
  'Sveshnikov: Kalashnikov (4...e5 5.Nb5 d6)': [
    ["…e5 — the Kalashnikov, about one master in eight, and the engine's own first choice here. It's the same bargain as the Sveshnikov: you kick the knight off d4 and accept the hole on d5 and a backward d-pawn. The difference is the move order. With no knight on f6 yet, there's nothing for a bishop on g5 to pin, and e4 isn't under attack, so they don't have to spend a move on Nc3.", '…e5 — the Kalashnikov: kick the knight first.'],
    ["Nb5 — almost every master, and the target is the same as before: d6. Their knight and queen both aim at it, only your bishop on f8 covers it, and a knight on d6 would give check.", 'Nb5 — the knight eyes d6 again.'],
    ["…d6 — more than eight masters in ten. Why not chase the knight with …a6 first? Because then it jumps to d6 with check, and after the trade there their queen lands on d6. So the pawn takes the square first. It also opens the c8–h3 diagonal for your bishop.", '…d6 — before …a6, or Nd6 check.'],
    ["N1c3 — about half the masters develop this knight; about four in ten grab space with c4 instead, a pawn that would also guard d5. From c3 the knight guards e4 and the knight on b5, and it covers d5, the hole it wants to sit on.", 'N1c3 — guards e4, covers d5.'],
    ["…a6 — nearly every master. Now the chase works: d6 is covered by your pawn, so the knight on b5 has nowhere good to go forward, and it has to go back.", '…a6 — chases the knight from b5.'],
    ["Na3 — every master retreats to the rim. Why not ignore the knight and develop with Be3? Because …axb5 takes it, and they'd have given a knight for a pawn. The knight on a3 is out of play for now.", 'Na3 — back to the rim.'],
    ["…b5 — about half the masters; others develop first with …Be7 or …Be6. Same job as in the main line: the pawn covers c4, the square the knight on a3 would use, and it takes space. The engine rates it the same as …Nf6.", '…b5 — covers c4, takes space.'],
    ["Nd5 — from here the line leaves the masters' games. The knight takes the hole, and no pawn of yours can ever chase it away. But it left something behind: e4 has no guard now.", 'Nd5 — the hole; e4 left unguarded.'],
    ["…Nf6 — at last the knight comes out, and with a point: it hits the loose e4 pawn and challenges the knight on d5. Since you held …Nf6 back, there's no bishop on g5 to pin it.", '…Nf6 — hits e4, challenges d5.'],
    ["c4 — they leave e4 alone for now. The pawn backs up the knight on d5 and, together with the knight on a3, hits your b5 pawn, which only a6 guards.", 'c4 — guards d5, hits b5.'],
    ["…b4 — the pawn steps out of the double attack and hits the knight on a3, so it has to move once more. And their e4 pawn is still waiting, with nothing guarding it.", '…b4 — hits the a3 knight.'],
    ["Nc2 — the knight steps off the rim and hits your b4 pawn, alongside the knight on d5. The engine prefers Nxf6 check first, trading knights. They are a little better. And e4 still has no guard. Can you take it?", 'Nc2 — hits b4; e4 is still loose.'],
    ["…Nxe4 — yes: nothing guards e4, so the knight takes a pawn, and it's the engine's first choice. It now hits f2. But they are still a little better, because their pieces get busy. Look at c7: their knight on d5 hits it, and only your queen on d8 guards it, so a knight check there would fork your king and the rook on a8. Your plan for the middlegame: bring the knight back to c5, get your bishop to e7 and castle, and keep your queen watching c7 until then.", '…Nxe4 — takes e4; watch c7.'],
  ],
  'Sveshnikov: ...Rb8 Expansion Plan': [
    ["…Rb8 — the rook goes behind the b-pawn before the bishop moves. The engine prefers getting the bishop out first, …Bh4 or …Bg5. After …Rb8 they are a little better, but now b5 has two guards and the rook is ready for the b-file.", '…Rb8 — behind the b-pawn; bishop first was better.'],
    ["a4 — here's why the knight left a3: the a-pawn can now hit your b5 pawn. Do you defend it? No. Take, and the b-file opens for the rook you just put on b8.", 'a4 — hits b5, opens the queenside.'],
    ["…bxa4 — you take, and look down the b-file: your rook on b8 now hits their b2 pawn, and nothing guards it. Your pawn on a4 is loose too, so it's a race between two loose pawns.", '…bxa4 — the rook on b8 hits b2.'],
    ["Rxa4 — the rook takes back and hits your a6 pawn, which their bishop on f1 also hits and only your bishop on c8 guards. But their b2 pawn still has no guard. Which do you look after first?", 'Rxa4 — hits a6; b2 is still loose.'],
    ["…a5 — you save the a-pawn: on a5 your queen and your knight on c6 guard it, and it takes b4 away from their knight on c2. The engine prefers …Rxb2, grabbing the b2 pawn first. They are a little better. Your plan for the middlegame: keep your rook on the open b-file against b2, bring the knight round to e7 to challenge d5, and get the bishop to g5, where it covers e3.", '…a5 — a-pawn safe; …Rxb2 was better.'],
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

export const SICILIAN_SVESHNIKOV_WATCH: WatchCourse = {
  openingId: 'sicilian-sveshnikov',
  title: 'The Sicilian Sveshnikov — A Master Class',
  orientation: 'black',
  sources: ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
