// Sicilian Najdorf — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (`LESSON_FACTS=1 LESSON_IDS=sicilian-najdorf`):
// masters' percentages, engine lines at a fixed depth, the board after each
// move. The student plays Black. Standard: docs/OPENING-WATCH-BEATS.md, said in
// the think-out-loud register (§2a).
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5', 'Nb3', 'Be7', 'O-O', 'O-O', 'Be3', 'Be6', 'Qd2', 'Nbd7'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — the king's pawn, the first move of just under half the masters. It grabs a central square and opens lines for their queen and their bishop on f1. So how do you fight for the center? Not by copying them. You go at it from the side.", 'e4 — they grab the center.'],
  ["…c5 — the Sicilian, almost half the masters' choice. Instead of meeting e4 head-on, the pawn covers d4 from the flank, so when they push d4, you can trade your c-pawn for their d-pawn. Why want that trade? Afterwards you keep your d- and e-pawns against their lone e-pawn. The engine rates …c5 and …e5 the same; for now they are a little better.", '…c5 — the Sicilian: hit d4 from the side.'],
  ["Nf3 — eight masters in ten. The knight develops and covers d4, so the d-pawn can advance there next with support behind it. They're heading for the Open Sicilian.", 'Nf3 — develops, backs up d4.'],
  ["…d6 — almost half the masters play it, and it does two quiet jobs. The pawn covers e5, so their e-pawn can't simply jump to e5 and kick a knight off f6, and it opens the diagonal for your bishop on c8. This is the road to the Najdorf.", '…d6 — covers e5, frees the c8 bishop.'],
  ["d4 — eight masters in ten open the center at once, and the pawn hits your c5 pawn. Should you defend it? No — this is exactly the trade …c5 was asking for.", 'd4 — opens the center, hits c5.'],
  ["…cxd4 — take, as nearly every master does. Your c-pawn has gone for their d-pawn, and two things follow: you keep both center pawns, d6 and e7, and the c-file is half-open for your rooks. The pawn on d4 itself won't survive; it gets taken back at once.", '…cxd4 — a flank pawn for a center pawn.'],
  ["Nxd4 — the knight takes back and stands in the center, nearly every master's move. Now look at their e4 pawn: right now nothing guards it. That tells you your next move.", 'Nxd4 — recaptures; e4 has no guard.'],
  ["…Nf6 — every master plays it: the knight develops and hits e4, which has no guard. And remember …d6? That's why they can't answer with e5 to kick the knight: your d6 pawn would just take it. So they have to defend.", '…Nf6 — develops with a hit on e4.'],
  ["Nc3 — nearly every master: the knight guards e4 and develops. Now look at the square b5. Their knights on d4 and c3 can both jump there, and a bishop on b5 would give check. That square is what your next move is about.", 'Nc3 — guards e4, develops.'],
  ["…a6 — and here is the Najdorf, the choice of seven masters in ten. A pawn move on the edge, in the middle of the opening? Look at what it does. It covers b5, so no knight can land there and no bishop can check you from it. It prepares …b5, space on the queenside, with your bishop coming to b7 behind it. And it keeps your plans hidden: they don't know yet whether your e-pawn goes to e5 or e6. Their next move decides that, and every main line of the Najdorf starts from this position.", '…a6 — the Najdorf: covers b5.'],
  ["Be2 — the quiet system, about one master in eight; Be3 and Bg5 are played more often. Why e2 and not c4? On c4 the bishop could be hit by …b5. On e2 it's safe, and it clears the way for their king to castle short. Both kings on the same side means no race of pawn storms: this game is about the center.", 'Be2 — quiet; castling short next.'],
  ["…e5 — e5 or e6? Seven masters in ten choose e5, and so does the engine. The pawn kicks their knight off d4 and takes your share of the center. Be clear about the price: d5 becomes a hole, a square no pawn of yours can ever guard again, and your d6 pawn is backward, with no pawn left to support it. From here on, you guard d5 with pieces.", '…e5 — kick the knight; d5 is the price.'],
  ["Nb3 — where should the knight go? Nine masters in ten pick b3. Not f5, where your bishop on c8 would take it. On b3 it's out of the way, and it still covers c5 and d4.", 'Nb3 — retreats, covers c5 and d4.'],
  ["…Be7 — nearly every master. Modest, but it does the job: the bishop clears f8, so your king can castle next move. Your other bishop is saved for e6, where it will help guard d5.", '…Be7 — develop, castle next.'],
  ["O-O — they castle, two masters in three, and their king is tucked away on g1. Your turn to do the same.", 'O-O — their king is safe.'],
  ["…O-O — you castle too, nearly nine masters in ten. Both kings are safe, so the real question comes back: which of your pieces watch d5? Right now only your knight on f6 does.", '…O-O — king safe; now, guard d5.'],
  ["Be3 — the bishop develops and covers c5 and d4. And notice the break you'd love to play: …d5, getting rid of your backward pawn. Not yet. Their e4 pawn, the knight on c3 and the queen on d1 all hit d5, one more than you can guard it with, so it would just drop a pawn.", "Be3 — covers c5; …d5 isn't ready."],
  ["…Be6 — nine masters in ten. There's the second guard: the bishop covers d5, and down the same diagonal it reaches their knight on b3. Now the count on d5 is level, and …d5 starts to become a real idea.", '…Be6 — guards d5, reaches b3.'],
  ["Qd2 — four masters in ten play it, the most common move here. The queen steps onto the half-open d-file and lines up on your d6 pawn, and their rooks can join it there later. The engine prefers Bf3. Is d6 in danger? Not yet: your bishop on e7 and your queen both guard it. It's about level.", 'Qd2 — d-file, lines up on d6.'],
  ["…Nbd7 — the last minor piece, nine masters in ten. Why d7? From there the knight backs up your knight on f6, the main guard of d5, and it covers c5 and e5. It's about level. Your plan for the middlegame: rooks to the half-open c-file and the queen to c7, keep every piece pointed at d5, and when …d5 finally lands safely, the backward pawn and the hole are both gone.", '…Nbd7 — backs up f6, covers c5.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line (or an earlier tab) doesn't share. */
type TabBeats = Array<[string, string]>;

const TAB_LINES: Record<string, string[]> = {
  'Najdorf: English Attack (6.Be3 Main Line)': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be7', 'f3', 'Be6', 'Qd2', 'Nbd7', 'O-O-O', 'b5', 'g4', 'b4', 'Na4'],
  'Najdorf: Classical (6.Be2 with ...e5)': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5', 'Nb3', 'Be7', 'O-O', 'O-O', 'Be3', 'Be6', 'Qd2', 'Nbd7', 'a4', 'Qc7', 'a5', 'Rfc8', 'Rfd1'],
  'Najdorf: 6.Bg5 Main Line (with e6 and f4)': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5', 'e6', 'f4', 'Be7', 'Qf3', 'Qc7', 'O-O-O', 'Nbd7', 'Bd3', 'b5', 'Rhe1', 'Bb7', 'Qg3', 'b4'],
  'Najdorf: Poisoned Pawn (6.Bg5 Qb6)': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5', 'e6', 'f4', 'Qb6', 'Qd2', 'Qxb2', 'Rb1', 'Qa3', 'e5', 'dxe5', 'fxe5', 'Nfd7', 'Ne4', 'Qxa2', 'Rd1', 'Qd5', 'Qe3', 'Qxe5', 'Be2', 'Bc5'],
  'Najdorf: 6.f3 English Attack Move Order': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'f3', 'e5', 'Nb3', 'Be6', 'Be3', 'Be7', 'Qd2', 'Nbd7', 'O-O-O', 'b5', 'g4', 'b4', 'Na4'],
  'Najdorf: Fischer-Sozin Attack (6.Bc4)': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bc4', 'e6', 'Bb3', 'b5', 'O-O', 'Be7', 'Qf3', 'Qc7', 'Qg3', 'Nc6', 'Nxc6', 'Qxc6', 'Re1', 'Bb7', 'Bg5', 'O-O', 'Rad1'],
  'Najdorf: Adams Attack (6.g3 Fianchetto)': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'g3', 'e5', 'Nde2', 'Be7', 'Bg2', 'O-O', 'O-O', 'b5', 'a3', 'Bb7'],
  'Najdorf: 6.Be3 ...Ng4 (Bishop Trade Attempt)': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'Ng4', 'Bg5', 'h6', 'Bh4', 'g5', 'Bg3', 'Bg7', 'Be2', 'h5', 'Nf5'],
  'Najdorf: Anti-Najdorf (6.a4)': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'a4', 'Nc6', 'Be2', 'e5', 'Nb3', 'Be7', 'O-O', 'O-O', 'Be3', 'Be6', 'Nd5'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Najdorf: English Attack (6.Be3 Main Line)': [
    ["Be3 — the most popular move here, a third of the masters, and the engine's first choice. This is the English Attack: the bishop on e3, then f3, the queen to d2 and castling long, and then a storm of kingside pawns with g4. Their king goes one way and yours the other, and the game becomes a race.", 'Be3 — the English Attack begins.'],
    ["…e5 — seven masters in ten, the same answer as against Be2: the pawn kicks their knight off d4 and takes space. You accept the hole on d5 again, and a backward pawn on d6, in return for time and room for your pieces.", '…e5 — kick the knight, take space.'],
    ["Nb3 — most masters retreat here. Now look at their bishop on e3: your knight on f6 can jump to g4 and hit it. Keep that idea in mind, because it explains a pawn move they make in a moment.", 'Nb3 — retreats; …Ng4 is possible now.'],
    ["…Be7 — more than eight masters in ten play …Be6 first; this order is rarer, and the engine rates the two the same. The bishop clears f8, so your king can castle when it's time.", '…Be7 — develop, ready to castle.'],
    ["f3 — seven masters in ten, and here's the pawn move. One move, three jobs: it takes g4 away from your knight, it gives e4 a second guard, and it prepares g4 for their own pawn storm. The engine prefers h3, which covers g4 too.", 'f3 — covers g4, braces e4.'],
    ["…Be6 — the bishop takes its post on e6. It covers d5, the hole …e5 left behind, and c4, so their bishop on f1 can't come to c4. And down the diagonal it reaches their knight on b3.", '…Be6 — guards d5, covers c4.'],
    ["Qd2 — the engine's first choice: the queen lines up behind the bishop on e3 and clears the way to castle long. Their whole plan is out in the open now: king to c1, then g4 and g5 against your knight on f6.", 'Qd2 — castling long next.'],
    ["…Nbd7 — the last minor piece: the knight backs up your knight on f6 and covers b6 and c5. The engine prefers …h5, a pawn that covers g4 and slows their storm before it starts; after …Nbd7 they are a little better.", '…Nbd7 — backs up f6; …h5 was better.'],
    ["O-O-O — their king goes to c1 and the rook lands on d1. The engine prefers g4 at once, starting the storm before castling. Now the race is set: their pawns go at your kingside, yours at their king on c1.", 'O-O-O — long castle; g4 was stronger.'],
    ["…b5 — your storm starts. The pawn grabs space and heads for b4, where it will hit their knight on c3, the knight that guards e4 and d5. The engine still leans slightly toward …h5.", '…b5 — the queenside storm starts.'],
    ["g4 — and theirs starts too. The pawn wants g5 next, to kick your knight off f6, the knight that guards d5. So now you know both targets: they're after f6, you're after c3. They are a little better.", 'g4 — g5 next, against the f6 knight.'],
    ["…b4 — you strike first: the pawn hits their knight on c3. It has to move, and wherever it goes, it stops guarding e4.", '…b4 — hits the c3 knight.'],
    ["Na4 — the knight runs to the edge. From a4 it eyes b6 and c5, but your knight on d7 covers both. The engine prefers Nd5, jumping straight into the hole. And look what Na4 uncovers: their queen on d2 now hits your b4 pawn, which has no guard. It's about level. Your plan for the middlegame: hold b4 with …a5 or …Rb8, bring your queen to c7, and keep your pawns rolling at their king.", 'Na4 — to the rim; Nd5 was stronger.'],
  ],
  // The Classical is the main line plus five moves: the main line's last beat
  // already says the plan, and the line's own last beat closes on its own.
  'Najdorf: Classical (6.Be2 with ...e5)': [
    ["a4 — the engine's first choice. The pawn covers b5, so your usual …b5 is off, and next it can go to a5 to grab even more space. Their idea: take away your queenside play before you can start it.", 'a4 — stops …b5, gains space.'],
    ["…Qc7 — the queen takes the half-open c-file and hits their knight on c3. Why that knight? It's the only piece guarding e4, which your knight on f6 attacks. The engine prefers …Rc8, the rook first; after …Qc7 they are a little better.", '…Qc7 — c-file, hits the c3 knight.'],
    ["a5 — one more step. The pawn covers b6, so none of your pieces can settle there, and look at your b7 pawn: if it ever goes to b5, they take it en passant. Your queenside is frozen for now.", 'a5 — covers b6, freezes b7.'],
    ["…Rfc8 — the rook lines up behind your queen on the c-file, a battery: two pieces on one line, both aimed at their knight on c3. Why the f-rook? The a-rook stays on a8, where it still guards a6 against their bishop on e2.", '…Rfc8 — doubles up on the c-file.'],
    ["Rfd1 — and they build their own battery on the d-file: queen and rook behind your d6 pawn. It holds, because your bishop on e7 and your queen on c7 both guard it. They are a little better. Your plan for the middlegame: make room for your king with …h6, keep pressing c3 and e4 from the c-file, and never let d5 or d6 run short of guards.", 'Rfd1 — d-file battery against d6.'],
  ],
  'Najdorf: 6.Bg5 Main Line (with e6 and f4)': [
    ["Bg5 — two masters in ten go straight for your knight: the bishop hits it on f6, the piece that guards d5 and hits e4. And the moment your e-pawn moves, that knight is pinned to your queen. The engine slightly prefers Be3.", 'Bg5 — hits the f6 knight.'],
    ["…e6 — eight masters in ten switch plans here. Why not …e5 again? Because Bxf6 would take away your knight, the one guard of d5, and the hole would be wide open. With …e6 the pawn guards d5 itself. The price: your knight on f6 is now pinned to your queen on d8.", '…e6 — guards d5; f6 is pinned.'],
    ["f4 — nine masters in ten. Now e5 is in the air: with the f-pawn behind it, their e-pawn can push to e5 and hit your pinned knight. Pin, f4, then e5 — that's the attacking scheme of this line.", 'f4 — prepares e5 against the knight.'],
    ["…Be7 — the bishop steps in between, so your knight on f6 is no longer pinned to the queen, and your king can castle. The most popular move here is …Qb6, the Poisoned Pawn, an adventure of its own; …Be7 is the calmer road.", '…Be7 — breaks the pin.'],
    ["Qf3 — almost every master. The queen backs up e4, clears the way to castle long, and stands ready to swing over to the kingside. They are a little better.", 'Qf3 — backs up e4, castles long next.'],
    ["…Qc7 — eight masters in ten. The queen takes the half-open c-file and hits their knight on c3. Your setup is nearly done: …Nbd7, then …b5.", '…Qc7 — c-file, hits c3.'],
    ["O-O-O — nearly every master castles long here, and the rook lands on d1. So the kings live on opposite wings: their pawns will come at your kingside, your b-pawn at their king.", 'O-O-O — opposite wings now.'],
    ["…Nbd7 — nine masters in ten. Your knight on f6 now has three guards, so if Bxf6, you take back with a piece and your pawns stay whole. The knight also covers e5, the square their e-pawn wants.", '…Nbd7 — guards f6, covers e5.'],
    ["Bd3 — the bishop develops and gives e4 a third guard. Most masters push g4 here instead, and the engine prefers Bh4; after Bd3 they are a little better.", 'Bd3 — guards e4; Bh4 was stronger.'],
    ["…b5 — about a third of the masters push now; more play …h6 first. The pawn grabs space and clears b7 for your bishop, and from b7 it will aim straight down the long diagonal at e4.", '…b5 — space, and b7 for the bishop.'],
    ["Rhe1 — nine masters in ten bring the last rook to e1, behind the e4 pawn. Notice what that says: they want e5 one day, with the rook backing it up.", 'Rhe1 — the rook behind the e-pawn.'],
    ["…Bb7 — here's the payoff of …b5. The bishop lands on the long diagonal and hits e4, and look what stands behind that pawn: their queen on f3. The e4 pawn is pinned; if it moves, the queen is exposed to your bishop.", '…Bb7 — pins e4 to the f3 queen.'],
    ["Qg3 — the queen steps off the long diagonal, so e4 is free to move again, and from g3 it stands behind the bishop on g5, aimed down the g-file at your g7 pawn. It's about level.", 'Qg3 — off the diagonal; e4 is free.'],
    ["…b4 — the pawn hits their knight on c3, and wherever it goes, it stops guarding e4. The critical answer is a sacrifice: the knight jumps to d5 anyway. It's about level. Your plan for the middlegame: if the knight lands on d5, take it and keep your king covered; if not, keep hitting e4 with your bishop on b7 and your knight on f6.", '…b4 — hits c3; e4 loses a guard.'],
  ],
  'Najdorf: Poisoned Pawn (6.Bg5 Qb6)': [
    ["…Qb6 — the Poisoned Pawn, the most popular move here, about four masters in ten. Your queen hits their knight on d4 and their b2 pawn, and nothing guards b2. Notice the side effect: with the queen off d8, your knight on f6 is no longer pinned. The engine slightly prefers …Nbd7.", '…Qb6 — the Poisoned Pawn: hits b2.'],
    ["Qd2 — seven masters in ten simply leave b2 to its fate. The queen develops and clears the way to castle long. Nb3, blocking the b-file, is the quieter way, and the engine rates the two about the same. So: do you take the pawn?", 'Qd2 — b2 is offered.'],
    ["…Qxb2 — yes, nine masters in ten take it. You're a pawn up, and your queen now hits their rook on a1, which has no guard. They have to deal with that first. The question for the next dozen moves: can your queen get back before they make it pay?", '…Qxb2 — a pawn up, hits a1.'],
    ["Rb1 — nine masters in ten. The rook gets out of the way and hits your queen on b2 at the same time. Your queen has to move. Where to?", 'Rb1 — hits your queen on b2.'],
    ["…Qa3 — every master plays it. Look at the alternatives: …Qxb1 check gives up your queen for a rook and a pawn, and …Nxe4 lets them trade queens with Rxb2 and win your knight for a pawn. So the queen retreats to a3, where it still hits a2 and their knight on c3.", "…Qa3 — out of the rook's reach."],
    ["e5 — six masters in ten go for it. The pawn hits your knight on f6 and your d6 pawn at once, trying to rip the center open while your queen is far away on a3. The engine prefers f5, and after e5 you are a little better.", 'e5 — hits f6 and d6; f5 was stronger.'],
    ["…dxe5 — the engine's choice; the masters split between this and …h6. You take, and your pawn on e5 hits their knight on d4 and their f4 pawn. That's two pawns up for the moment, and they have to take back.", '…dxe5 — hits d4 and f4.'],
    ["fxe5 — every master takes back, and the pawn hits your knight on f6 once more. Where does the knight go this time?", 'fxe5 — hits the f6 knight again.'],
    ["…Nfd7 — seven masters in ten. The knight steps back to d7, where it hits the e5 pawn, and nothing guards that pawn. Now you're asking the questions: e5 is attacked, and your queen on a3 still hits a2. You are a little better.", '…Nfd7 — hits the loose e5 pawn.'],
    ["Ne4 — the engine's first choice. The knight comes to the center and eyes d6, a square no pawn of yours can ever cover again. But it leaves a2 behind: that pawn has no guard now.", 'Ne4 — eyes d6; a2 is loose.'],
    ["…Qxa2 — the second pawn. Your queen now hits their rook on b1, which has no guard. Two pawns up, but count your development: both bishops and the knight on b8 are still at home.", '…Qxa2 — two pawns up, hits b1.'],
    ["Rd1 — the engine's first choice. The rook steps out of your queen's reach and onto the d-file, right behind their queen. You're two pawns up, and your king is still on e8.", 'Rd1 — the rook escapes to d1.'],
    ["…Qd5 — the queen comes back to the center, and look how much it hits: their knight on e4, which has no guard, the e5 pawn, and the knight on d4. Suddenly it's their pieces that are in trouble.", '…Qd5 — hits e4, e5 and d4.'],
    ["Qe3 — the engine's clear first choice: the queen guards both knights, on d4 and e4. Anything else, like Qe2 or Nd6 check, costs them more than a pawn. But their e5 pawn is still loose.", 'Qe3 — guards both knights.'],
    ["…Qxe5 — a third pawn, and your queen hits their bishop on g5 and both knights. Is grabbing right? Not here: the engine prefers …h6, kicking the bishop first, and after …Qxe5 they are a little better. Three pawns up and still the side with problems — that's the Poisoned Pawn.", '…Qxe5 — a third pawn; …h6 was better.'],
    ["Be2 — the engine's first choice: the bishop develops and clears the way to castle. What do they have for three pawns? Look at the board: their minor pieces are all out, while your king is on e8 and both your bishops are still at home. They are a little better.", 'Be2 — develop, castle next.'],
    ["…Bc5 — at last a bishop comes out, and with a point: it pins their knight on d4 to their queen on e3. They are a little better. Your plan for the middlegame: castle right away, get your last pieces out, and once your king is safe, let the three extra pawns do the talking.", '…Bc5 — pins d4 to the queen.'],
  ],
  'Najdorf: 6.f3 English Attack Move Order': [
    ["f3 — a different road into the English Attack, about seven masters in a hundred. The pawn goes first: it guards e4 and covers g4. Why start with it? When Be3 comes first, your knight can jump to g4 and hit the bishop. With f3 played, that idea is gone before it begins.", 'f3 — guards e4, takes g4 away.'],
    ["…e5 — three masters in four answer the same way, and the pawn kicks the knight off d4. The cost never changes: a hole on d5 and a backward pawn on d6, and your pieces will have to cover both.", '…e5 — kick the knight, accept the hole.'],
    ["Nb3 — every master retreats here, out of your pawn's reach. From b3 the knight still covers c5 and d4.", 'Nb3 — retreats, covers c5 and d4.'],
    ["…Be6 — nine masters in ten develop this bishop first. On e6 it does the most important job in the position: it covers d5. It also covers c4, keeping their bishop on f1 out of there.", '…Be6 — covers d5 and c4.'],
    ["Be3 — now the English Attack setup takes shape: pawn on f3, bishop on e3, and the queen comes to d2 next. The bishop covers c5 and d4, two squares your pieces would like.", 'Be3 — the English setup takes shape.'],
    ["…Be7 — the other bishop clears f8 for castling. And look at the board: this is the very same position as the English Attack with Be3 first. Two move orders, one destination.", '…Be7 — the two move orders meet.'],
    ["Qd2 — the engine's first choice: the queen connects with the bishop on e3 and gets ready to castle long. This is where the Najdorf gets exciting: kings on opposite wings, and pawn storms coming both ways.", 'Qd2 — castling long next.'],
    ["…Nbd7 — the knight supports your knight on f6 and covers b6 and c5. The engine likes …h5 more: a pawn on h5 makes g4 much harder to play. After …Nbd7 the game is about level.", '…Nbd7 — backs up f6; …h5 was better.'],
    ["O-O-O — their king goes long, to c1, and the rook lands on d1 behind the queen. Now both of you know where the other king lives.", 'O-O-O — their king on c1.'],
    ["…b5 — your pawns get moving: b5 now, b4 next against their knight on c3. The engine still prefers …h5, slowing their storm first; after …b5 it's about level.", '…b5 — b4 next; …h5 was better.'],
    ["g4 — their storm is on its way: g5 next will drive your knight from f6, and that knight is a guard of d5. They are a little better.", 'g4 — g5 is coming for f6.'],
    ["…b4 — yours lands first. The pawn hits the knight on c3, so it has to move right now.", '…b4 — the c3 knight must move.'],
    ["Na4 — to the rim. The knight looks at b6 and c5, but your knight on d7 covers both. The engine prefers Nd5, straight into the hole. Meanwhile their queen on d2 now hits your b4 pawn, and nothing guards it. It's about level. Your plan for the middlegame: shore up b4 with …a5 and …Rb8, put your queen on c7, and race your queenside pawns at their king on c1.", 'Na4 — to the edge; b4 is loose.'],
  ],
  'Najdorf: Fischer-Sozin Attack (6.Bc4)': [
    ["Bc4 — the Fischer-Sozin. The bishop aims straight at f7, a pawn only your king guards. Not a common choice among masters, and the engine prefers Be3. Two questions for you: how do you blunt that bishop, and how do you make it pay for standing on c4?", 'Bc4 — the Fischer-Sozin, aims at f7.'],
    ["…e6 — almost every master. The pawn puts a wall in front of f7, so the bishop on c4 now runs into e6, and it guards d5 as well. That's the Scheveningen setup, pawns on d6 and e6. Why not …e5? It would leave d5 weak, right on the bishop's diagonal.", '…e6 — a wall in front of f7.'],
    ["Bb3 — seven masters in ten pull the bishop back now. Why? …b5 was coming to hit it on c4. On b3 it's out of reach and still aimed at e6, with f7 behind it.", 'Bb3 — safe from …b5, aims at e6.'],
    ["…b5 — about half the masters push now. The pawn takes space on the queenside and clears b7 for your bishop, and next it can go to b4 and hit their knight on c3.", '…b5 — space; …Bb7 and …b4 next.'],
    ["O-O — six masters in ten castle short. So there's no pawn race this time: their pieces will come at your king directly, the queen swinging to the kingside and the bishop on b3 already aimed there.", 'O-O — their king goes short.'],
    ["…Be7 — eight masters in ten. Develop, and get ready to castle: your king is still on e8, right next to f7, the pawn the bishop on b3 is aimed at through e6.", '…Be7 — develop, castle soon.'],
    ["Qf3 — about eight masters in ten. The queen hits your knight on f6, which your bishop on e7 and g7 pawn guard, and it's heading for g3, where your g7 pawn lives. The engine prefers a4, challenging your b5 pawn. It's about level.", 'Qf3 — hits f6; a4 was stronger.'],
    ["…Qc7 — the masters split almost evenly between this and …Qb6, and the engine picks …Qc7. The queen takes the half-open c-file and hits their knight on c3.", '…Qc7 — c-file, hits c3.'],
    ["Qg3 — there it is: the queen hits your g7 pawn, which has no guard, and your d6 pawn too. Do you defend g7, or hit back?", 'Qg3 — hits g7 and d6.'],
    ["…Nc6 — hit back. The knight attacks their knight on d4, and nothing of theirs guards it, so they have to deal with it before anything else. Castling first is about as good.", '…Nc6 — hits the unguarded d4 knight.'],
    ["Nxc6 — they trade before you can, and their knight on c6 hits your bishop on e7. You take back at once. But with what?", 'Nxc6 — a trade; it hits e7.'],
    ["…Qxc6 — the queen. Can you grab e4 first with …Nxe4? No: they take back, and their queen eats g7 and h7. Now your queen hits e4 down the diagonal, and their knight on c3 is the only guard of that pawn.", '…Qxc6 — hits e4, guarded only once.'],
    ["Re1 — the engine's first choice: the rook gives e4 a second guard. And remember g7: it still has no guard.", 'Re1 — a second guard on e4.'],
    ["…Bb7 — the bishop lines up behind your queen on the long diagonal, a battery: queen and bishop on one line, both pointed at e4.", '…Bb7 — queen and bishop on the diagonal.'],
    ["Bg5 — the bishop hits your knight on f6. But look what it does to their own queen: the bishop now stands between the queen on g3 and your g7 pawn, so g7 is no longer attacked. The engine prefers Qxg7, simply taking it; after Bg5 it's about level.", 'Bg5 — hits f6; Qxg7 was stronger.'],
    ["…O-O — and now you castle, while the bishop on g5 shields g7 from their queen. The engine rates …h6 about the same.", '…O-O — castle while g7 is shielded.'],
    ["Rad1 — the last rook comes to d1 and hits your d6 pawn. With the queen on g3 that's two attackers, but your bishop on e7 and queen on c6 are two guards. It's about level. Your plan for the middlegame: guard d6 with …Rfd8, trade off their bishop on g5 with …Nh5, and push …a5 and …a4 to chase the bishop from b3.", 'Rad1 — hits d6; it holds.'],
  ],
  'Najdorf: Adams Attack (6.g3 Fianchetto)': [
    ["g3 — the Adams Attack, a rare choice: the bishop is heading for g2, where it will guard e4 from the long diagonal. Quiet and positional, and the engine prefers Be3. With no pin and no f3, you can meet it in the most natural way.", 'g3 — the bishop heads for g2.'],
    ["…e5 — seven masters in ten, and the engine agrees: the pawn kicks their knight off d4 and claims space. The usual price, the hole on d5, is the square this whole game will be fought over.", '…e5 — kick the knight, take space.'],
    ["Nde2 — a little over half the masters retreat this way rather than to b3. On e2 the knight backs up the knight on c3 and covers f4, and it stays close to the kingside.", 'Nde2 — retreats, backs up c3.'],
    ["…Be7 — almost six masters in ten. The bishop develops and your king is ready to castle. In a quiet line like this, that's exactly the order: develop, castle, then pick your plan.", '…Be7 — develop, castle next.'],
    ["Bg2 — nine masters in ten. The bishop arrives on the long diagonal and guards e4, and now both kings are ready to castle short.", 'Bg2 — guards e4 from the diagonal.'],
    ["…O-O — your king is safe. Next comes the question of the queenside, and your answer is …b5.", '…O-O — king safe; …b5 is next.'],
    ["O-O — their king joins yours on the kingside. With no pawn race, the game turns on squares, and the one both sides want is d5.", 'O-O — both kings on the kingside.'],
    ["…b5 — the engine's first choice. The pawn grabs space and heads for b4, where it would kick their knight on c3, a guard of both d5 and e4. It also clears b7 for your bishop.", '…b5 — space; …b4 and …Bb7 next.'],
    ["a3 — they stop …b4 for now: the pawn covers b4, so their knight on c3 stays put. But it costs time, and the engine prefers Nd5 right away. It's about level.", 'a3 — stops …b4; Nd5 was stronger.'],
    ["…Bb7 — the bishop takes the long diagonal and hits e4, which their bishop on g2 and knight on c3 guard. It's about level. Your plan for the middlegame: finish with …Nbd7, and if their knight jumps to d5, trade it off and push …f5 to fight for the kingside.", '…Bb7 — long diagonal, hits e4.'],
  ],
  'Najdorf: 6.Be3 ...Ng4 (Bishop Trade Attempt)': [
    ["…Ng4 — a direct question to the bishop: the knight hits it on e3, and your idea is to trade it off before f3 ever takes g4 away from you. Why go after this bishop? In the English Attack it's one of their key attacking pieces. About one master in ten tries it; …e5 is far more common.", '…Ng4 — go after the e3 bishop.'],
    ["Bg5 — two masters in three dodge to g5, and from there the bishop pins your e7 pawn to your queen on d8. Bc1 is the other retreat. Now the bishop is on g5, so you ask it again.", 'Bg5 — escapes, pins e7 to the queen.'],
    ["…h6 — nearly every master asks: the pawn hits the bishop, which has no guard on g5. It has to move once more.", '…h6 — kick the bishop again.'],
    ["Bh4 — almost every master keeps the pin from h4, still on your e7 pawn. Do you let it stay? No — one more pawn push.", 'Bh4 — keeps the pin on e7.'],
    ["…g5 — every master plays it: the pawn hits the bishop again and grabs space on the kingside. Look at the cost, though. Your h- and g-pawns have both gone forward, so your king won't find a snug home on the kingside. That's the gamble of this line.", '…g5 — hits h4, grabs kingside space.'],
    ["Bg3 — the bishop drops back, out of your pawns' reach, and hits your d6 pawn from g3. The pin is gone, so your e-pawn is free again.", 'Bg3 — retreats, hits d6.'],
    ["…Bg7 — the bishop takes the long diagonal and hits their knight on d4, with the knight on c3 and the b2 pawn lined up behind it.", '…Bg7 — long diagonal, hits d4.'],
    ["Be2 — the bishop develops and hits your knight on g4, which only your bishop on c8 guards. One guard isn't comfortable, so you add another.", 'Be2 — hits the g4 knight.'],
    ["…h5 — the pawn gives your knight on g4 a second guard, and it's not only defense: next, …h4 would hit their bishop on g3. It's about level.", '…h5 — guards g4; …h4 is next.'],
    ["Nf5 — the knight jumps to f5 and hits your bishop on g7, which has no guard, along with d6 and e7. The engine prefers h4. It's about level. Your plan for the middlegame: take the knight with …Bxf5, develop your other knight to c6, and keep your bishop on g7 aimed down the long diagonal at c3 and b2.", 'Nf5 — hits g7; h4 was stronger.'],
  ],
  'Najdorf: Anti-Najdorf (6.a4)': [
    ["a4 — they stop your queenside plan before it starts: the pawn covers b5, so …b5 is off. A quiet way to meet the Najdorf, and the engine rates it only a little below Be3.", 'a4 — takes b5 away.'],
    ["…Nc6 — with …b5 off the menu, you change plans: the knight comes to c6 and hits their knight on d4. About a fifth of the masters play it; …e5 at once is the more common choice.", '…Nc6 — hits the d4 knight.'],
    ["Be2 — seven masters in ten. The bishop develops and their king gets ready to castle short. They don't trade on c6, and your knight stays where it is.", 'Be2 — develops, castling next.'],
    ["…e5 — about half the masters push it now; …e6 is the other choice. The pawn kicks their knight off d4, and you take the old Najdorf bargain: space and time, for the hole on d5.", '…e5 — kick the knight; d5 is the price.'],
    ["Nb3 — the most common retreat, about four masters in ten; Nf3 and the trade on c6 are the others. From b3 the knight covers c5 and d4.", 'Nb3 — retreats, covers c5 and d4.'],
    ["…Be7 — the bishop clears f8 and you're ready to castle. The engine rates …Be6 just the same.", '…Be7 — develop, castle next.'],
    ["O-O — they castle short. Compare this with the Be2 main line: the same setup, except their pawn stands on a4 instead of a2, and your knight is already out on c6.", 'O-O — their king is safe.'],
    ["…O-O — you castle too. Both sides are set up, and the fight is over d5.", '…O-O — castle; the fight is d5.'],
    ["Be3 — the bishop develops and covers c5 and d4. The masters most often push f4 here, and the engine prefers Bg5, going after your knight on f6, a guard of d5. After Be3 it's about level.", 'Be3 — develops; Bg5 was stronger.'],
    ["…Be6 — nearly nine masters in ten. The bishop takes its usual post: it covers d5 and reaches their knight on b3. Now d5 has two guards, the knight on f6 and this bishop.", '…Be6 — a second guard on d5.'],
    ["Nd5 — the knight jumps into the hole, hitting your bishop on e7 and your knight on f6. Tempting, but count what it left behind: the knight on c3 was the only guard of e4, and now that pawn has none. The engine prefers Bf3, and after Nd5 you are clearly better. Your plan for the middlegame: take the free pawn with …Nxe4, and after c4, trade on d5 and hold on to the extra pawn.", 'Nd5 — tempting, but e4 drops.'],
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

export const SICILIAN_NAJDORF_WATCH: WatchCourse = {
  openingId: 'sicilian-najdorf',
  title: 'The Sicilian Najdorf — A Master Class',
  orientation: 'black',
  sources: ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
