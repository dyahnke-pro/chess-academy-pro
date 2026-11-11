// Alekhine's Defence — the Watch course, one beat a move (WO-OPENINGS-REWRITE-01).
// Written from the fact sheet (depth 16): masters' percentages, engine lines,
// the board after each move. The student plays Black. Standard:
// docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register (§2a). One
// idea runs through every line: the knight on f6 invites their pawns forward,
// and you go after whatever they push — e5 first, then d4 and c4 — with …d6,
// the pieces and a pawn break of your own.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'Nf3', 'Bg4', 'Be2', 'e6', 'O-O', 'Be7', 'c4', 'Nb6', 'exd6', 'cxd6', 'Nc3', 'O-O', 'h3', 'Bh5'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — the masters' most common first move, close to half their games. The pawn takes the center and opens lines for their queen and the bishop on f1. But notice: nothing guards it. That's the pawn your knight goes after.", 'e4 — the center, but unguarded.'],
  ["…Nf6 — and here is Alekhine's Defence. Why put your knight right where a pawn can kick it? That's exactly the point. The knight hits e4, which nothing guards, and invites their pawns to chase it forward, each push grabbing space. It's a hypermodern idea: you don't build a center of your own, you let them build a big one, and then you attack it. Masters play …c5 or …e5 far more often, and the engine prefers …c5; after …Nf6 they are a little better.", '…Nf6 — hit e4, invite the chase.'],
  ["e5 — they take the invitation: more than eight masters in ten push, and it's the engine's first choice. The pawn hits your knight on f6 and grabs space, so the knight has to move. Where does it go?", 'e5 — kicks the knight, takes space.'],
  ["…Nd5 — to the center, nearly every master's move and the engine's first choice. Back to g8 or out to e4 both rate well below it. On d5 the knight stands in the middle of the board, and yes, a pawn on c4 could kick it again. Let it: every pawn they push forward is one more pawn you can aim at later.", '…Nd5 — the knight takes the center.'],
  ["d4 — about eight masters in ten build the center first. Look at the shape: e5 out in front, and d4 behind it as its only support. That front pawn is the one you go after. Kicking the knight first with c4 is its own tab, the Two Pawns Attack.", 'd4 — the center, backing up e5.'],
  ["…d6 — and now you hit back, as nearly every master does; it's the engine's first choice. They built the center, so you strike its front pawn: the pawn on d6 attacks e5, which only d4 holds. That's the whole rhythm of the Alekhine. Let them push, then go after what they pushed.", '…d6 — strike at e5.'],
  ["Nf3 — the Modern Variation, about two masters in three. No more pawn pushes for now: the knight gives e5 a second guard and gets their king ready to castle. The engine prefers c4, kicking your knight again, the road to the Four Pawns and the Exchange. But look at the knight on f3. It's one of e5's two guards, and a bishop on g4 would pin it to their queen.", 'Nf3 — a second guard for e5.'],
  ["…Bg4 — there's the pin: the bishop pins the knight on f3 to their queen on d1. It's the masters' most common move here, about a third of their games, and it gets your bishop out before …e6 shuts it in. The engine prefers …dxe5, clearing up the center at once; that has its own tab.", '…Bg4 — pin the knight to the queen.'],
  ['Be2 — nineteen masters in twenty, and the engine\'s first choice. The bishop steps in between, so the knight on f3 is no longer pinned to the queen on d1, and their king can castle next.', 'Be2 — breaks the pin, castling next.'],
  ['…e6 — about six masters in ten, and the engine\'s first choice. Now it costs you nothing: your light bishop is already outside the pawn chain, on g4. The pawn frees your bishop on f8 and gives your knight on d5 a pawn guard.', '…e6 — guards d5, frees your bishop.'],
  ['O-O — about seven masters in ten castle here, the engine\'s first choice. Their king is safe on g1, and c4, kicking your knight once more, is coming.', 'O-O — king safe; c4 is next.'],
  ['…Be7 — more than nine masters in ten. The bishop develops and clears f8, so you can castle next move. Develop first; the fight for their center starts soon enough.', '…Be7 — develop, castle next.'],
  ["c4 — there's the push, the engine's first choice. The pawn hits your knight on d5, and now their center is three pawns wide: c4, d4 and e5. It looks impressive. But each of those pawns has to be held, and the further they go, the harder that gets.", 'c4 — kicks the knight again.'],
  ["…Nb6 — where does the knight go? b6, the engine's choice by far. …Nb4 looks more active, but Qa4 comes with check and hits that knight, and it's in real trouble. From b6 your knight hits c4, one of their three pawns.", '…Nb6 — back, and hitting c4.'],
  ["exd6 — they release the tension and take on d6, about one master in seven; Nc3, keeping it, is more common and starts the Modern tab. For a moment you're a pawn down, and the pawn on d6 hits your bishop on e7 and your c7 pawn. But nothing guards it. So which pawn takes back?", 'exd6 — they trade off e5.'],
  ["…cxd6 — the c-pawn, the engine's choice by far. Why that one? It takes back toward the center, and it opens the c-file for a rook, aimed straight at their pawn on c4. Their front pawn on e5 is gone now; what's left of their center is c4 and d4.", '…cxd6 — the c-file opens toward c4.'],
  ["Nc3 — the queen's knight comes out and covers d5 and e4. Nothing is hanging on either side; both of you are just finishing development, and of their minor pieces only the bishop on c1 is still at home.", 'Nc3 — develops, covers d5 and e4.'],
  ['…O-O — you castle, the engine\'s first choice, and your king is safe on g8. One piece is still at home: the knight on b8. Its square is c6, where it would hit d4.', '…O-O — king safe; …Nc6 comes next.'],
  ['h3 — the engine\'s first choice. They put the question to your bishop: the pawn hits it on g4, and nothing guards it there. Take the knight on f3, or keep the bishop?', 'h3 — hits the bishop on g4.'],
  ["…Bh5 — you keep the bishop, and from h5 it still hits the knight on f3. The engine prefers …Bxf3, giving up the bishop for the knight at once; after …Bh5 they are a little better. Your plan for the middlegame: …Nc6 to hit d4, a rook to the c-file against c4, and keep chipping at the center they built.", '…Bh5 — keep the bishop; …Bxf3 was better.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the lines before it don't share. */
type TabBeats = Array<[string, string]>;

// Filed in this order: a tab shares moves only with the main line and the tabs
// above it (the Exchange and the Voronezh branch off the Four Pawns' c4 Nb6,
// the Chase off the Two Pawns' c4 Nb6).
const TAB_LINES: Record<string, string[]> = {
  'Four Pawns Attack': ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'c4', 'Nb6', 'f4', 'dxe5', 'fxe5', 'Nc6', 'Be3', 'Bf5', 'Nc3', 'e6', 'Nf3', 'Bb4', 'Rc1', 'O-O'],
  'Modern Variation': ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'Nf3', 'Bg4', 'Be2', 'e6', 'O-O', 'Be7', 'c4', 'Nb6', 'Nc3', 'O-O', 'Be3', 'd5', 'c5', 'Bxf3', 'Bxf3', 'Nc4', 'Bf4', 'b6', 'b3', 'Na5'],
  'Exchange Variation': ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'c4', 'Nb6', 'exd6', 'exd6', 'Nf3', 'Be7', 'Be2', 'O-O', 'O-O', 'Nc6', 'Nc3', 'Bf5', 'b3', 'Bf6', 'Be3', 'd5'],
  'Two Pawns Attack': ['e4', 'Nf6', 'e5', 'Nd5', 'c4', 'Nb6', 'd4', 'd6', 'exd6', 'cxd6', 'Nc3', 'g6', 'Nf3', 'Bg7', 'Be3', 'O-O', 'Be2', 'Nc6', 'O-O', 'Bg4', 'b3', 'e5'],
  'Chase Variation': ['e4', 'Nf6', 'e5', 'Nd5', 'c4', 'Nb6', 'c5', 'Nd5', 'd4', 'd6', 'cxd6', 'exd6', 'Nf3', 'dxe5', 'dxe5', 'Bb4+', 'Bd2', 'O-O', 'Bc4', 'Nc6', 'O-O', 'Bg4'],
  'Scandinavian Transposition': ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'Nf3', 'dxe5', 'Nxe5', 'Nd7', 'Nxd7', 'Bxd7', 'c4', 'Nf6', 'Nc3', 'e6', 'Be3', 'Bd6', 'Be2', 'O-O'],
  'Voronezh Variation': ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'c4', 'Nb6', 'exd6', 'cxd6', 'Nc3', 'g6', 'Be3', 'Bg7', 'Rc1', 'O-O', 'b3', 'e5', 'd5', 'h6', 'Nf3', 'Bg4'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  'Four Pawns Attack': [
    ["c4 — the sharper road, about three masters in ten, and the engine's first choice. The pawn kicks your knight on d5, and nothing guards it there, so it has to move now. And look at what they're building: c4, d4, e5.", 'c4 — kicks the loose knight.'],
    ['…Nb6 — every master retreats here, and the engine agrees. The other tries cost you: …Nb4 walks into Qa4 check, and …dxe5 just drops the knight to cxd5. On b6 it still hits c4.', '…Nb6 — back, still hitting c4.'],
    ["f4 — the Four Pawns Attack, the biggest center there is: c4, d4, e5 and now f4, giving e5 a second guard. About a quarter of masters choose it, and it's the engine's first choice; the Exchange, taking on d6, is more common and has its own tab. Four pawns are a lot of space, but look: not one of their pieces has moved. Hit the pawns before the pieces arrive to hold them.", 'f4 — four pawns, the biggest center.'],
    ["…dxe5 — about seven masters in ten take right away, and it's the engine's first choice. You're a pawn up for a moment, and look at the d-file: with your d-pawn gone, your queen on d8 looks straight at d4. They'll take back on e5, but d4 has just become a target.", '…dxe5 — the d-file opens at d4.'],
    ["fxe5 — every master takes back with the f-pawn, and the material is level. But see what's changed: no pawn guards d4 anymore. The c-pawn stands beside it, the e-pawn in front of it, so only their pieces can hold it.", 'fxe5 — level; d4 has no pawn guard.'],
    ['…Nc6 — about two masters in three, and the engine\'s first choice. The knight develops with a hit on two pawns, d4 and e5. Count d4 now: your knight and your queen attack it, and only their queen guards it. Their next move has to deal with that.', '…Nc6 — hits d4 and e5.'],
    ["Be3 — nearly every master, the engine's first choice. The bishop gives d4 a second guard, two against two, so it holds. That's the price of the big center: their pieces come out to guard pawns. Now, where does your other bishop belong?", 'Be3 — a second guard for d4.'],
    ['…Bf5 — outside the pawn chain, before …e6 shuts it in. Nearly every master puts it here, and it\'s the engine\'s first choice. From f5 it looks down the diagonal at their knight on b1, and it covers d3 and e4, squares their pieces would like.', '…Bf5 — outside the chain, hits b1.'],
    ["Nc3 — the knight gets off b1, out of your bishop's line, and develops, as nearly every master plays. Their king is still on e1, though, and that matters: a knight on c3 in front of an uncastled king can be pinned.", "Nc3 — out of the bishop's line."],
    ['…e6 — now it\'s free to play, because your light bishop is already out on f5. The pawn opens the diagonal from your bishop on f8, and look where it leads: all the way to b4, where it would pin the knight on c3 to their king.', '…e6 — opens the road to b4.'],
    ['Nf3 — about eight masters in ten, the engine\'s first choice. The knight gives d4 a third guard and backs up e5. Their bishop on f1 still has to move before they can castle.', 'Nf3 — guards d4 and e5.'],
    ["…Bb4 — there's the pin. Most masters play the quiet …Be7, about half; …Bb4 is rarer, about one in ten, but it's the engine's first choice. The bishop pins their knight on c3 to their king on e1, so the knight can't move while the king stays there.", '…Bb4 — pins the knight on c3.'],
    ['Rc1 — the rook steps to the c-file and backs up the pinned knight on c3. The engine prefers Be2, getting the king ready to castle. Their king is still on e1, and they are a little better.', 'Rc1 — backs up c3; Be2 was better.'],
    ["…O-O — you castle, and your king is safe while theirs still sits on e1, with the knight on c3 pinned in front of it. They have the space; you have the safer king. They are a little better. Your plan for the middlegame: …Na5 to hit c4 and the …c5 break to pry their center open, while your queen and knight keep watching d4.", '…O-O — castled; their king still central.'],
  ],
  'Modern Variation': [
    ["Nc3 — instead of trading on d6, they develop and keep the tension, the masters' most common move here, more than half their games. Your pawn on d6 and theirs on e5 still hit each other. When do you resolve that?", 'Nc3 — develops, keeps the tension.'],
    ['…O-O — first, the king. The engine rates castling and …Nc6 almost the same, and castling settles your king on g8 before the center opens. Every minor piece of yours but the knight on b8 is out.', '…O-O — king safe before the center opens.'],
    ["Be3 — the bishop develops and gives d4 a third guard. The engine slightly prefers exd6, clearing up the center first. Now it's your decision: keep the tension on e5, or close the center?", 'Be3 — develops, another guard for d4.'],
    ["…d5 — you close it: the pawn hits c4. But look at the cost. With your d-pawn gone from d6, nothing attacks e5 anymore, and c5 will hit your knight with a gain of space. The engine prefers …Nc6, keeping the pressure on d4; after …d5 they are clearly better.", '…d5 — closes it; …Nc6 was better.'],
    ["c5 — of course, the engine's first choice. The pawn hits your knight on b6 and grabs more space on the queenside, and they are clearly better. Your knight has to go somewhere. d7 is the calm square, but the line has a sharper idea.", 'c5 — kicks the knight, more space.'],
    ["…Bxf3 — before saving the knight, an in-between move. Here's the idea: c4 would be a great square for your knight, but the bishop on e2 guards it. Take on f3, and if that bishop takes back, it leaves e2 and c4 is free. Grabbing your knight with cxb6 instead runs into …Bxe2, hitting their queen. The engine prefers the quiet …N6d7, and after …Bxf3 they are clearly better.", '…Bxf3 — pull the bishop off e2.'],
    ['Bxf3 — the natural recapture, but the engine prefers gxf3, keeping their bishop on e2 to cover c4. Now they are only a little better. The bishop on f3 hits your d5 pawn, which e6 guards, and c4 has lost its guard.', 'Bxf3 — gxf3 was better; c4 is free.'],
    ["…Nc4 — and the knight lands on the square you cleared. From c4 it hits three things: the bishop on e3, the pawn on e5, and the pawn on b2, which nothing guards. Their c-pawn has marched past to c5, so only b3 can ever chase it away.", '…Nc4 — hits e3, e5 and b2.'],
    ["Bf4 — the engine's first choice. The bishop steps out of your knight's reach and still guards e5 from f4.", 'Bf4 — escapes, still guards e5.'],
    ['…b6 — you go after the wedge on c5: the pawn hits it. But see what it costs. With the b-pawn off b7, the long diagonal opens, and their bishop on f3 now pins your d5 pawn to your rook on a8. The engine prefers …Nc6, bringing the last knight out first.', '…b6 — hits c5; …Nc6 was better.'],
    ["b3 — the engine's first choice, and there it is: the one pawn that could reach c4 kicks your knight away.", 'b3 — kicks the knight off c4.'],
    ["…Na5 — the engine's first choice. The knight hits b3 and waits to jump back to c4. Grabbing …Nxe5 instead just loses the knight for a pawn to dxe5. They are a little better. Your plan for the middlegame: when b4 comes, the knight goes straight back to c4, and …a5 hits their queenside pawns at the base.", '…Na5 — hits b3, aims back at c4.'],
  ],
  'Exchange Variation': [
    ["exd6 — the Exchange Variation, the masters' most common move here, about seven in ten. They trade off e5 before you can hit it again; the engine slightly prefers f4, the Four Pawns. The pawn on d6 hits c7 and e7 and nothing guards it, so you take back. With which pawn? That's the choice between this tab and the Voronezh.", 'exd6 — they trade off e5.'],
    ['…exd6 — masters split exactly evenly between this and …cxd6, and the engine prefers …cxd6, which the Voronezh tab plays. Taking with the e-pawn is the calm choice: no imbalance, the e-file opens, and your bishop on f8 gets out through e7.', '…exd6 — calm, and the e-file opens.'],
    ['Nf3 — the knight develops and guards d4, but only about one master in twelve plays it here; three in four play Nc3, and the engine prefers that too. Their plan is simple either way: develop, castle, and keep the space their pawns on c4 and d4 give them.', 'Nf3 — develops; Nc3 was more precise.'],
    ["…Be7 — about eight masters in ten, and the engine's first choice. The bishop clears your kingside to castle. In this structure you develop first and pick your target later, and that target is d4.", '…Be7 — develop, castle next.'],
    ["Be2 — about half the masters, and the engine's first choice. The bishop develops quietly, and with f1 clear their king can castle next.", 'Be2 — quiet, castling next.'],
    ["…O-O — you castle first, the engine's first choice, and your king is safe on g8. Now the open e-file is there for your rooks.", '…O-O — king safe, e-file ahead.'],
    ['O-O — they castle too. Both kings are safe, so the game is about the center: their pawns on c4 and d4 against your pieces.', 'O-O — both kings safe.'],
    ['…Nc6 — the last knight comes out and hits d4. That\'s your target in this structure: no pawn guards d4, only pieces, and every attacker you add ties another of their pieces to it.', '…Nc6 — develops, hits d4.'],
    ["Nc3 — the queen's knight develops and covers d5 and e4, two squares your pieces would like. Of their minor pieces, only the bishop on c1 is still at home.", 'Nc3 — develops, covers d5 and e4.'],
    ['…Bf5 — a natural square, but here it\'s a slip. On f5 the bishop hits nothing, and it gives them d5, kicking your knight off c6. The engine prefers …Bg4, going after the knight on f3, one of d4\'s guards. They are a little better.', '…Bf5 — natural, but …Bg4 was better.'],
    ['b3 — and they miss it: the engine prefers d5, kicking your knight. b3 gives c4 a second guard against your knight on b6. They are still a little better.', 'b3 — guards c4; d5 was stronger.'],
    ["…Bf6 — the engine's first choice. The bishop moves to the long diagonal and hits d4. Count it: your knight on c6 and this bishop attack it, their queen and the knight on f3 guard it. Two on two.", '…Bf6 — a second attacker on d4.'],
    ['Be3 — the bishop gives d4 a third guard, so it holds. Then hit the other pawn, the one on c4.', 'Be3 — a third guard for d4.'],
    ["…d5 — the engine's first choice, and the freeing break. The pawn hits c4 and stakes your own claim in the center. If they push c5, your knight drops back to c8 and comes around to e7. They are a little better. Your plan for the middlegame: a rook to the open e-file, lined up on their bishops, with your knight and the bishop on f6 kept on d4.", '…d5 — the break, hits c4.'],
  ],
  'Two Pawns Attack': [
    ["c4 — instead of d4, they kick the knight straight away. About one master in ten plays it, and it's the engine's first choice, level with d4. The pawn hits your knight on d5, and nothing guards it there, so it moves now.", 'c4 — kicks the knight at once.'],
    ["…Nb6 — every master goes back to b6, the engine's first choice. …Nb4 and …Nf4 both rate well below it. From b6 the knight hits c4.", '…Nb6 — back, hitting c4.'],
    ["d4 — close to six masters in ten build the center, and it's the engine's first choice: c4, d4 and e5, the Two Pawns Attack. Pushing c5 instead, chasing the knight again, is the Chase, on its own tab.", 'd4 — three pawns in the center.'],
    ["…d6 — same reflex as always: they built a center, you hit its front pawn. Nearly every master plays it, and it's the engine's first choice. The pawn attacks e5, which only d4 guards.", '…d6 — strike at e5 again.'],
    ["exd6 — they trade off e5, the masters' most common move here, about seven in ten; the engine prefers f4, the biggest center of all. Now the pawn on d6 hits c7 and e7 with nothing guarding it, so you take back. Which pawn?", 'exd6 — they trade off e5.'],
    ['…cxd6 — masters split evenly, and the engine prefers this one. Why the c-pawn? It makes the game unbalanced: they get three pawns to two on the queenside, you get four to three on the kingside, and the c-file opens for your rook. Your e-pawn stays home, guarding d6.', '…cxd6 — the unbalanced recapture.'],
    ['Nc3 — about eight masters in ten. The knight develops and covers d5 and e4. Now look at your bishop on f8: the pawns on e7 and g7 both block it. Which one moves?', 'Nc3 — develops, covers d5.'],
    ["…g6 — the g-pawn, nearly every master's choice and the engine's first. The bishop will come out on g7 and aim down the long diagonal at d4, while your e-pawn stays home holding d6. It's the same fianchetto you'd see in a King's Indian.", '…g6 — the bishop goes to g7.'],
    ['Nf3 — a rare order here, about three masters in a hundred; Be3 is the usual move, and the engine rates the main choices close together. The knight guards d4 and gets their kingside ready to castle.', 'Nf3 — guards d4, castling soon.'],
    ["…Bg7 — the engine's first choice. From g7 the bishop looks down the long diagonal, and the first thing it hits is the pawn on d4. That pawn is the pressure point of the whole game.", '…Bg7 — the long diagonal, hits d4.'],
    ['Be3 — it props up d4. The engine prefers h3 first, keeping your bishop off g4, where it would go after the knight on f3, one of d4\'s guards. Remember that square.', 'Be3 — guards d4; h3 was more precise.'],
    ["…O-O — you castle, the engine's first choice. Your king tucks in behind the bishop on g7, and the knight on b8 and the bishop on c8 are next.", '…O-O — king safe behind g7.'],
    ['Be2 — their last bishop leaves f1, and their king can castle next. The engine prefers Rc1, bringing the rook to the c-file first.', 'Be2 — castle next; Rc1 was better.'],
    ["…Nc6 — the knight joins in on d4. Count it: your knight and the bishop on g7 against their queen, the knight on f3 and the bishop on e3. Three guards hold it for now, but every guard on d4 is a piece tied to that pawn.", '…Nc6 — a second attacker on d4.'],
    ["O-O — their king is safe, and the game is about level. But they never played h3, so g4 is still open for your bishop.", 'O-O — level; g4 is still open.'],
    ["…Bg4 — the engine's first choice. The bishop hits the knight on f3, one of d4's three guards. If you ever take that knight, d4 loses a guard. It's about level.", '…Bg4 — hits f3, a guard of d4.'],
    ["b3 — the engine's first choice: the pawn gives c4 a second guard against your knight on b6. It's about level. Now pick your break: …d5, hitting c4, or …e5, hitting d4?", 'b3 — props up c4.'],
    ["…e5 — the central break: the pawn hits d4 and makes them decide. The engine prefers …d5, hitting c4 instead; after …e5 they are a little better. Your plan for the middlegame: if the pawns trade on e5 the d-file opens, so get your rooks there and keep …Bxf3 ready to remove their knight on f3.", '…e5 — hits d4; …d5 was better.'],
  ],
  'Chase Variation': [
    ['c5 — the Chase: the pawn kicks your knight again, in a bit over a third of the masters\' games here. It grabs space, but count their moves: four pawn moves and not one piece out. The engine prefers Nc3 or d4; after c5 the game is about level.', 'c5 — chases the knight; about level.'],
    ["…Nd5 — back to the center, every master's move here. Why not hit the c5 pawn with …d6 right away? Because cxb6 just takes your knight. On d5 it's safe, and that c5 pawn has nothing guarding it.", '…Nd5 — back to the safe center.'],
    ['d4 — rare here, about one master in twenty, and a slip: the engine prefers Bc4, hitting your knight. Now the pawns stand on c5, d4 and e5, and it\'s about level.', 'd4 — Bc4 was better; now level.'],
    ["…d6 — about two masters in three, and the engine's first choice. The pawn hits both c5 and e5 at once. That's the point of letting them run: the further their pawns go, the more of them you can hit.", '…d6 — hits c5 and e5.'],
    ["cxd6 — every master here takes, the engine's first choice. The pawn on d6 hits c7 and e7, so you take back. This time, with the e-pawn.", 'cxd6 — the trade on d6.'],
    ["…exd6 — the engine's clear choice. The pawn hits e5 straight away, the pawn only d4 guards, and your bishop on f8 can come out through e7.", '…exd6 — hits e5, frees the bishop.'],
    ['Nf3 — finally a piece: the knight develops and gives e5 a second guard.', 'Nf3 — first piece out, guards e5.'],
    ["…dxe5 — you take anyway, the engine's first choice, and trade off their center. With your d-pawn gone, the diagonal from your bishop on f8 to b4 is open, and from b4 it gives check.", '…dxe5 — open lines for your pieces.'],
    ["dxe5 — the engine's first choice. Their pawn center has shrunk to one pawn, on e5. And look at the d-file: only your knight on d5 stands between the two queens.", 'dxe5 — their center is one pawn.'],
    ['…Bb4+ — the bishop develops with check. The time they spent chasing your knight comes back to you now: their king is still on e1, and they have to block.', '…Bb4+ — develop with check.'],
    ['Bd2 — they block with the bishop, and now it hits yours on b4. The engine prefers Nbd2, blocking with the knight. Still about level.', 'Bd2 — blocks; Nbd2 was better.'],
    ["…O-O — the engine's first choice. Your bishop on b4 is guarded by the knight on d5, so a trade there costs you nothing, and your king is safe while theirs is still on e1.", '…O-O — castled first; b4 is guarded.'],
    ['Bc4 — the bishop develops with a hit on your knight on d5. Does it have to move? No: your queen on d8 guards it, so you keep developing.', 'Bc4 — develops, hits the knight.'],
    ['…Nc6 — your other knight comes out and hits e5, their one remaining center pawn. Only the knight on f3 guards it.', '…Nc6 — develops, hits e5.'],
    ["O-O — the engine's first choice; their king finally gets to safety. Now look at e5 again: one attacker, your knight, and one guard, the knight on f3.", 'O-O — castled; f3 alone guards e5.'],
    ["…Bg4 — so you go after that guard: the bishop pins the knight on f3 to their queen on d1. The engine prefers trading first with …Bxd2, and it's about level either way. Your plan for the middlegame: keep piling up on e5 with your knight and a rook on e8, and trade on d2 when it suits you.", '…Bg4 — pin the guard of e5.'],
  ],
  'Scandinavian Transposition': [
    ["…dxe5 — instead of the pin, you take on e5 right away: about a quarter of the masters' games, and the engine's first choice. Their front pawn is gone, and with it the big-center fight. This is the simple way to play the Alekhine.", '…dxe5 — clear the center now.'],
    ['Nxe5 — nearly every master takes back with the knight. It lands on e5 in the middle of the board, guarded by d4, and hits f7. A knight that well placed is worth challenging.', 'Nxe5 — a strong knight, hits f7.'],
    ["…Nd7 — you challenge it at once: your knight hits theirs on e5 and offers a trade. About one master in ten plays this; …c6 is the usual move, six in ten, and the engine prefers …g6. Why? Because of Nxf7: the knight takes on f7, and after your king takes back, Qh5 check drags it out to e6. That sacrifice is their best answer here.", '…Nd7 — challenge it; …g6 was better.'],
    ['Nxd7 — they take the trade, only about one master in twenty; a third of them sacrifice on f7 instead, and the engine prefers that. After the trade they are a little better. Their knight on d7 hits your bishop on f8 and nothing guards it, so you take it back.', 'Nxd7 — the trade; Nxf7 was stronger.'],
    ["…Bxd7 — with the bishop, nine masters in ten and the engine's first choice: it develops as it takes back. And the knight that stood on e5 is gone.", '…Bxd7 — recapture and develop.'],
    ['c4 — the pawn kicks your knight on d5, and nothing guards it there, so it must move. Where to?', 'c4 — kicks the loose knight.'],
    ["…Nf6 — back to f6, the engine's first choice. From there the knight covers d5 and e4 and guards h7. …Nb6 rates lower.", '…Nf6 — covers d5 and e4.'],
    ["Nc3 — the engine's first choice. The knight develops and covers d5 and e4 too. They have their pawns on c4 and d4, and the space that comes with them.", 'Nc3 — develops, covers d5.'],
    ["…e6 — the engine's first choice. The pawn takes d5 away from their pieces and opens the way for your bishop on f8.", '…e6 — covers d5, frees the bishop.'],
    ["Be3 — the engine's first choice: the bishop develops and gives d4 a second guard.", 'Be3 — develops, guards d4.'],
    ['…Bd6 — the bishop takes the diagonal toward their kingside and hits h2. …Bc6 and …Bb4 rate about the same.', '…Bd6 — aims at h2.'],
    ['Be2 — the last bishop comes out, and their king can castle next. The engine slightly prefers h3, keeping your knight off g4.', 'Be2 — develops, castling next.'],
    ['…O-O — your king is safe while theirs is still on e1, and every one of your minor pieces is out. They are a little better. Your plan for the middlegame: hit their pawns on c4 and d4 with a pawn break, …c5 or …e5, and keep your bishop on d6 aimed at their kingside.', '…O-O — castled; …c5 or …e5 next.'],
  ],
  'Voronezh Variation': [
    ['…cxd6 — the Voronezh starts here: take back with the c-pawn. Masters split evenly between the two recaptures, and the engine prefers this one. It keeps your e-pawn home, opens the c-file toward their pawn on c4, and unbalances the pawns: your four against three on the kingside, their three against two on the queenside. That imbalance is what you play for.', '…cxd6 — open the c-file, unbalance.'],
    ['Nc3 — about eight masters in ten. The knight develops toward d5 and e4. And look at your bishop on f8: pawns on e7 and g7 shut it in, so it needs another way out.', 'Nc3 — develops, covers d5.'],
    ["…g6 — there's the way out: the bishop goes to g7, nearly every master's plan and the engine's first choice. It's the King's Indian fianchetto, aimed down the long diagonal at d4.", '…g6 — the fianchetto is coming.'],
    ['Be3 — about seven masters in ten. The bishop gives d4 a guard before your bishop even arrives on g7.', 'Be3 — guards d4 in advance.'],
    ["…Bg7 — every master, and the engine's first choice. The bishop sits on the long diagonal and hits d4 at once.", '…Bg7 — hits d4 on the diagonal.'],
    ["Rc1 — nearly nine masters in ten, and the engine's first choice. Look at the long diagonal from your bishop: d4 first, then c3, b2 and a1. The rook steps off that line to c1, where it also backs up the knight on c3.", 'Rc1 — off the long diagonal.'],
    ["…O-O — nearly every master castles here, the engine's first choice. Your king is tucked behind the bishop on g7. Now, the center.", '…O-O — castle, then the center.'],
    ["b3 — about nine masters in ten, and the engine's first choice. The pawn guards c4 against your knight on b6 and takes another pawn off the long diagonal. Their center looks solid, so it's time to hit it.", 'b3 — guards c4, off the diagonal.'],
    ["…e5 — the break: the masters' most common move here, about a third of their games, and the engine's first choice. The pawn hits d4 and asks a question: take on e5, or push past with d5 and lock the center?", '…e5 — the break, hits d4.'],
    ["d5 — they push past, which almost no master does: more than nine in ten take on e5, and the engine prefers that too. Now the center is locked, and it's about level. With the pawns fixed like this, think King's Indian: your play is on the kingside, where your pawns outnumber theirs.", 'd5 — locks the center; dxe5 was better.'],
    ['…h6 — a slow move. It keeps their bishop off g5, but it spends a tempo the position needs. The engine prefers getting on with it: …Na6, …N6d7 or …f5. After …h6 they are a little better.', '…h6 — slow; …f5 or …Na6 was better.'],
    ['Nf3 — natural, but a real mistake: the engine prefers f3, keeping g4 covered. The knight hits e5, but on f3 it can be hit from g4, and it\'s about level again.', 'Nf3 — hits e5; f3 was better.'],
    ["…Bg4 — the bishop hits the knight on f3, the only piece attacking your e5 pawn. The engine prefers …f5 at once; after …Bg4 they are a little better. Your plan for the middlegame: the King's Indian plan, …f5 and play on the kingside, where you have the extra pawn.", '…Bg4 — hits f3; …f5 was better.'],
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

export const ALEKHINE_DEFENCE_WATCH: WatchCourse = {
  openingId: 'alekhine-defence',
  title: "Alekhine's Defence — A Master Class",
  orientation: 'black',
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
