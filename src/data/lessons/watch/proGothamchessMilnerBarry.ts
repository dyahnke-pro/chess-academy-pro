// Milner-Barry Gambit (the pro repertoire) — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet: masters' percentages,
// engine lines at a fixed depth, the board after each move. The student plays
// White. Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud
// register (§2a). One story runs through every line: the Advance French locks
// the c8-bishop in, their pawns and pieces pile on d4, and in the gambit you
// let d4 go for time. The …Nxd4 / Bb5+ trick (why every master plays …Bd7
// first) was replayed with chess.js and read by Stockfish at depth 16. The last
// tab is a line taught for this opening in the repertoire's videos; the
// decision is recorded in docs/levy-lines/decisions/pro-gothamchess-milner-barry.json.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Bd3', 'cxd4', 'cxd4', 'Bd7', 'O-O', 'Nxd4', 'Nxd4', 'Qxd4', 'Nc3', 'a6', 'Qe2', 'Ne7', 'Kh1', 'Rc8', 'f4'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4 — just under half of all master games start here, and it's the engine's first choice. The pawn grabs the center and covers d5 and f5. Against the French, this pawn is about to become the head of a whole chain.", "e4 — grabs the center."],
  ["…e6 — the French, about one master in eight. The pawn covers d5, so their d-pawn can come forward next with a guard behind it. The price: the bishop on c8 is now shut in behind e6. Remember that bishop. It's about level.", "…e6 — the French; c8 bishop shut in."],
  ["d4 — nine masters in ten. Now you have the full center, pawns on d4 and e4, and you are a little better. The French answers at once: …d5 is coming, straight at e4.", "d4 — the full center."],
  ["…d5 — almost every master. The pawn hits e4, and nothing guards it. So here's the French's question: what do you do with that pawn? Guard it with a knight, trade it, or push it past d5.", "…d5 — hits e4."],
  ["e5 — the Advance. Only about one master in ten pushes here; most guard e4 with Nc3 or Nd2, but the engine rates all three nearly the same. The pawn grabs space and takes d6 and f6 away from their pieces. And notice what holds it up: only the pawn on d4. Guess which pawn they'll go after.", "e5 — the Advance; space, d6 and f6."],
  ["…c5 — nearly every master, and it goes straight at the base of your chain. The pawn hits d4, and d4 is the only thing guarding e5. Knock out d4 and e5 is left hanging. So d4 needs a friend.", "…c5 — hits d4, the base."],
  ["c3 — almost every master, and the engine's first choice. The pawn guards d4, so if they ever take there, a pawn takes back and the chain stays whole. Keep an eye on this little pawn: it's the one that lands on d4 and gets offered as the gambit.", "c3 — props up d4."],
  ["…Nc6 — about seven masters in ten. The knight hits d4 a second time, and it looks at e5 as well. Count d4: their c5 pawn and this knight attack it; your c3 pawn and the queen on d1 guard it. Two against two, so it holds for now.", "…Nc6 — a second hit on d4."],
  ["Nf3 — nearly every master. A third guard on d4, and it covers e5 too. Three against two now. Watch what they throw at d4 next.", "Nf3 — guards d4 and e5."],
  ["…Qb6 — about four masters in ten; slightly more play …Bd7 first. The queen hits b2, which your bishop on c1 still guards, and look at the diagonal: the queen stands behind the c5 pawn, aimed at d4. The moment …cxd4 opens that line, the queen is a third attacker. So here's the Milner-Barry question: defend d4 again, or let it go?", "…Qb6 — hits b2, aims at d4."],
  ["Bd3 — and here's the gambit. Seven masters in ten play a3 here, and the engine rates it a touch higher; Bd3, about one master in eight, simply lets d4 go. Why? The bishop comes out aimed straight at h7, and your king is one move from castling. If they grab d4, they win a pawn and you get time: while their knight and queen go after it, you castle and bring your pieces out. It's about level.", "Bd3 — offer d4, aim at h7."],
  ["…cxd4 — seven masters in ten take now. The pawn hits c3, so you take back. And with the c5 pawn gone, the diagonal from their queen on b6 to d4 is open.", "…cxd4 — the queen's diagonal to d4 opens."],
  ["cxd4 — just under half the masters take back; slightly more castle first, and the engine prefers that, O-O. Now count d4 again: their queen and knight attack it, and only your knight on f3 guards it, because your own bishop on d3 blocks the queen. Two against one, and that's on purpose: d4 is the bait.", "cxd4 — d4: two attackers, one guard."],
  ["…Bd7 — almost every master, and here's why they don't grab d4 right away. Say the knight takes now: Nxd4 Qxd4, and then Bb5 comes with check. The bishop steps off d3, and your queen on d1 suddenly sees their queen on d4. They block the check, and you take the queen. With a bishop on d7 standing between b5 and their king, that trick is gone. Now the pawn really is on offer.", "…Bd7 — first, so Bb5 check fails."],
  ["O-O — about three masters in four. Your king is safe before anything opens, and you've stopped guarding d4 for good. They can take it. The question is what it costs them.", "O-O — king safe; d4 is offered."],
  ["…Nxd4 — and they take, nearly every master. The knight hits yours on f3, with their queen on b6 behind it. You're a pawn down. Do you take back right away?", "…Nxd4 — they grab the pawn."],
  ["Nxd4 — six masters in ten take back, but the engine prefers Nbd2, bringing a piece out first and keeping the knights on. After the trade your knight on d4 has no guard, and their queen takes it. They are a little better.", "Nxd4 — trade; Nbd2 was stronger."],
  ["…Qxd4 — every master. Their queen lands in the middle and hits four things: b2, your bishop on d3, e5 and f2. The bishop is guarded by your queen and b2 by your bishop on c1, but e5 has no guard at all, and f2 is pinned to your king on g1. They're a pawn up and a little better, so your next moves have to bring pieces out.", "…Qxd4 — hits e5, pins f2."],
  ["Nc3 — more than eight masters in ten. The last knight comes out, hits d5 and looks at b5. The engine prefers Qe2 first, guarding the loose pawn on e5. After Nc3 that pawn is still unguarded, and it's their choice: grab it?", "Nc3 — hits d5; Qe2 was stronger."],
  ["…a6 — the engine's choice. The pawn takes b5 away from your knight. And what about a second pawn with …Qxe5? Re1 hits the queen, it has to step back, and Nxd5 takes a pawn back. The engine rates that more than half a pawn worse for them.", "…a6 — takes b5 from your knight."],
  ["Qe2 — the queen steps off d1 and guards e5, so it isn't loose anymore. It also clears d1 for a rook: on d1 it would line up behind your bishop on d3, straight at their queen on d4.", "Qe2 — guards e5, clears d1."],
  ["…Ne7 — the knight finally develops; from e7 it covers d5 and can come to c6. But look at the rest of their army: the king on e8 and the bishop on f8 haven't moved, while your king is castled. That's what the pawn bought you. They are still a little better.", "…Ne7 — develops; king still on e8."],
  ["Kh1 — a quiet move with a clear job. Their queen on d4 pins your f2 pawn to the king on g1. Step the king to h1 and the pin is gone, so f4 can come next, guarding e5 a second time. Your plan from here: f4 to lock in e5, then Be3, hitting their queen with your last minor piece.", "Kh1 — unpins f2; f4 next."],
  ["…Rc8 — the rook takes the open c-file and lines up on your knight on c3, which the b2 pawn guards. They're a pawn up and a little better, and their play comes down the c-file.", "…Rc8 — the c-file, aimed at c3."],
  ["f4 — the engine's first choice. Now e5 has two guards, your queen on e2 and this pawn, and the f-pawn takes g5 away from their pieces. Their queen hits it, but your bishop on c1 and rook on f1 both guard it. They are a little better, a pawn up, but your king is safe and theirs is still on e8. Your plan for the middlegame: Be3, hitting their queen with your last minor piece, then a rook to c1 to fight for the c-file.", "f4 — e5 guarded twice; Be3 next."],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line (or an earlier tab) doesn't share. */
type TabBeats = Array<[string, string]>;

const BD3 = 'Anti-French 3.Bd3';

const TAB_LINES: Record<string, string[]> = {
  'Main Gambit Line': ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Bd3', 'cxd4', 'cxd4', 'Bd7', 'O-O', 'Nxd4', 'Nxd4', 'Qxd4', 'Nc3', 'a6', 'Qe2', 'Ne7', 'Kh1'],
  'Black Declines with Bd7': ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Bd3', 'Bd7', 'O-O', 'cxd4', 'cxd4', 'Nxd4', 'Nxd4', 'Qxd4', 'Nc3', 'Qb6'],
  'Anti-French 3.e5 Advance': ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Nh6', 'Bd3', 'cxd4', 'cxd4', 'Nf5', 'Bxf5', 'exf5', 'Nc3', 'Be6', 'O-O', 'Be7'],
  [BD3]: ['e4', 'e6', 'd4', 'd5', 'Bd3', 'dxe4', 'Bxe4', 'Nf6', 'Bf3', 'c5', 'Ne2', 'Nc6', 'c3', 'Be7', 'O-O', 'O-O', 'Bf4', 'h6', 'a4', 'Bd6', 'dxc5'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The main line's own moves, to Kh1: every beat is already written above.
  'Main Gambit Line': [],
  'Black Declines with Bd7': [
    ["…Bd7 — about a quarter of the masters develop first and leave the pawn on c5 where it is. The engine prefers taking on d4 right away, and now you are a little better. So the question changes: with c5 still on the board, do you keep offering d4, or take on c5 yourself?", "…Bd7 — develops first; c5 stays."],
    ["O-O — about half the masters castle; the other half take on c5, and the engine prefers that, dxc5. Castling keeps the gambit alive: if they take on d4 and you take back, you're in the main line's position, a pawn down for time. It's about level.", "O-O — keeps the gambit; dxc5 stronger."],
    ["…cxd4 — almost nine masters in ten take now. The pawn hits c3, and the diagonal from their queen on b6 to d4 opens up.", "…cxd4 — b6 now sees d4."],
    ["cxd4 — only about one master in six takes back; three in four play Re1 first, guarding e5, and the engine prefers that. After cxd4 you're in the main line's exact position, reached in a different order: d4 is offered again.", "cxd4 — back in the main line."],
    ["…Nxd4 — nearly every master takes. The knight hits yours on f3, and the queen on b6 backs it up, so you're a pawn down again.", "…Nxd4 — the pawn goes."],
    ["Nxd4 — six masters in ten trade. The engine prefers Nbd2, getting the queenside knight out first. After the trade nothing guards your knight on d4, so their queen takes it, and they are a little better.", "Nxd4 — trade; Nbd2 was stronger."],
    ["…Qxd4 — every master. The queen hits b2, e5 and your bishop on d3, and it pins f2 to your king on g1. Of those, e5 is the one with no guard.", "…Qxd4 — a pawn up, e5 loose."],
    ["Nc3 — eight masters in ten. The knight develops and hits d5. Again the engine prefers Qe2, guarding e5 before anything else.", "Nc3 — hits d5; Qe2 stronger."],
    ["…Qb6 — here they leave the road the main line took. The engine preferred …a6, taking b5 from your knight. Instead the queen drops back to b6, where it still hits b2 and still pins f2 to your king, along the diagonal from b6 to g1. They are a pawn up and a little better. Your plan for the middlegame: a4 to gain space on the queenside, and Re1 to guard e5.", "…Qb6 — still pins f2; a4 next."],
  ],
  'Anti-French 3.e5 Advance': [
    ["…Nh6 — only about one master in twenty-five. A knight on the rim? It's heading for f5, where it will hit d4 a third time. The engine prefers …Bd7, and after …Nh6 you are a little better.", "…Nh6 — heading for f5."],
    ["Bd3 — the most common answer, about four masters in ten. The bishop takes f5 away from their knight before it gets there, and it aims at h7. The engine slightly prefers Bxh6, giving up the bishop to double their h-pawns.", "Bd3 — covers f5, aims at h7."],
    ["…cxd4 — seven masters in ten clear the tension. The pawn hits c3, and you take back. Then d4 is a lone pawn, and their knight still wants f5.", "…cxd4 — clears the tension."],
    ["cxd4 — eight masters in ten, and the engine's first choice. But count d4: their knight on c6 hits it, and only your knight on f3 guards it, because your bishop on d3 blocks the queen. If …Nf5 comes, it's two against one.", "cxd4 — d4 has one guard."],
    ["…Nf5 — the engine's choice, right into your bishop's reach. The knight hits d4: two attackers now, and one guard. Something has to give.", "…Nf5 — two hits on d4."],
    ["Bxf5 — take off the attacker. The bishop captures the knight on f5, and d4 is safe again. Castling instead would let them take on d4 and keep the pawn. They take back with the e-pawn, and that leaves them doubled f-pawns.", "Bxf5 — remove the attacker."],
    ["…exf5 — the engine's choice. Their f-pawns are doubled on f7 and f5. But look at the bishop on c8, shut in since …e6: with the e-pawn gone, it's free. Worse pawns for them, a freer bishop.", "…exf5 — doubled pawns, but c8 is free."],
    ["Nc3 — the engine's choice. The knight hits d5, and with the e6 pawn gone, only their queen on d8 guards it.", "Nc3 — hits d5."],
    ["…Be6 — the freed bishop comes out and guards d5 a second time. The engine slightly prefers …h6 first, and you are a little better.", "…Be6 — guards d5."],
    ["O-O — natural, but it costs about two-thirds of a pawn. The engine wanted Ne2 first, on the way to f4, where the knight would hit d5 and the bishop on e6. After castling it's about level.", "O-O — natural; Ne2 was much stronger."],
    ["…Be7 — the engine's choice: their last minor piece is out, and castling comes next. It's about level. Your plan for the middlegame: the knight on f3 goes through e1 to c2, where it guards d4, and the other knight heads through e2 to f4, aiming at d5.", "…Be7 — castling next; knights to c2, f4."],
  ],
  [BD3]: [
    ["Bd3 — a rare move, about one master in a hundred, and the engine rates it more than a third of a pawn worse than Nc3 or Nd2. The bishop guards e4 and dares them to take. Why play it? After …dxe4 the bishop takes back onto the long diagonal, and it's heading for f3, where it looks down at b7. It's about level.", "Bd3 — guards e4, invites …dxe4."],
    ["…dxe4 — six masters in ten take. The pawn hits your bishop on d3, so it takes back. Notice d4 for a moment: with your bishop on d3 in the way of the queen, nothing guards it. That changes as soon as the bishop moves.", "…dxe4 — hits your bishop."],
    ["Bxe4 — every master takes back. Now look where the bishop stands: on the long diagonal, hitting b7, which is pinned to the rook on a8, and h7 too. And with d3 empty, your queen guards d4 again.", "Bxe4 — long diagonal, pins b7."],
    ["…Nf6 — nearly every master. The knight develops with a hit on your bishop on e4, and nothing guards it. So the bishop moves a third time. Where?", "…Nf6 — hits your bishop on e4."],
    ["Bf3 — almost every master, and the engine's first choice. Three moves with one bishop looks like a waste, but look where it ended up: still on the long diagonal, still pinning b7 to the rook on a8. So …b6 would leave the rook hanging, and their bishop on c8 can't come out that way.", "Bf3 — still pins b7 to a8."],
    ["…c5 — the engine's choice. The pawn hits d4, so count it: the c5 pawn and their queen on d8 attack it, and only your queen guards it. d4 needs a second guard, and Nf3 is out, since your bishop sits on f3.", "…c5 — two hits on d4."],
    ["Ne2 — the engine's first choice. f3 belongs to the bishop, so the knight goes to e2, where it guards d4. Two against two.", "Ne2 — guards d4; f3 is taken."],
    ["…Nc6 — the engine's choice, and a third hit on d4: the c5 pawn, the queen on d8, and now this knight. Your queen and the knight on e2 guard it, so it's three against two. And notice the knight also blocks your bishop's diagonal: b7 isn't pinned anymore.", "…Nc6 — a third hit on d4."],
    ["c3 — the engine's choice. A third guard, and d4 holds, three against three. It's the same job the c3 pawn does in the main line: propping up d4.", "c3 — props up d4 again."],
    ["…Be7 — the bishop develops to e7, and castling is next. The engine rates …cxd4 about the same.", "…Be7 — ready to castle."],
    ["O-O — the engine's first choice. Your king is safe. Two minor pieces are still at home, the bishop on c1 and the knight on b1, and the bishop goes first.", "O-O — king safe."],
    ["…O-O — they castle too, and both kings are safe. It's about level, and the fight is still about d4: three of theirs against three of yours.", "…O-O — both kings safe."],
    ["Bf4 — the engine's first choice. The last bishop comes out and covers e5, the square their knight on c6 could jump to.", "Bf4 — out, covers e5."],
    ["…h6 — a little air for their king, and the pawn takes g5 away from your bishop.", "…h6 — takes g5 away."],
    ["a4 — a pawn move with a job: it grabs space on the queenside and covers b5, so …b5 can't come easily.", "a4 — space; covers b5."],
    ["…Bd6 — they offer a trade: the bishop on d6 faces yours on f4, which the knight on e2 guards. So do you take on d6, or is there something better first?", "…Bd6 — offers a bishop trade."],
    ["dxc5 — the engine's choice, and it's all about the move order. Take on c5 first and the pawn hits the bishop on d6; after it takes back on c5, the bishops no longer face each other. Trading on d6 instead is about a third of a pawn worse. It's about level. Your plan for the middlegame: Nd2 to bring out the last knight, and if they push …e5 at your bishop, Bxc6 splits their a-pawn from their c-pawn.", "dxc5 — first, before trading bishops."],
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

export const PRO_GOTHAMCHESS_MILNER_BARRY_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-milner-barry',
  title: "This repertoire's Milner-Barry Gambit — a Pawn for the Storm",
  orientation: 'white',
  sources: ['book:french-defence', 'concept:pos-development', 'https://www.chess.com/openings/French-Defense-Advance-Variation-Milner-Barry-Gambit', 'https://en.wikipedia.org/wiki/French_Defence'],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
