// GothamChess's Anti-Sicilian (the Rossolimo) — the Watch course, one beat a
// move (WO-OPENINGS-REWRITE-01). Written from the fact sheet (`LESSON_FACTS=1
// LESSON_IDS=pro-gothamchess-anti-sicilian`, graded at depth 16): masters'
// percentages, engine lines, the board after each move. The student plays
// White. Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud
// register (§2a). One question runs through every line: the bishop on b5 hits
// the knight on c6, and when to take it is the decision of the opening. The
// last tab is a line taught for this opening in the repertoire's videos; its
// placement is recorded in docs/levy-lines/decisions/pro-gothamchess-anti-sicilian.json.
//
// Moves the sheet's top three did not list (exd5 against …d5 in the
// accelerated tab, d4 and its …cxd4 Nxd4 follow-up) were read by Stockfish at
// depth 16 before a beat names what they allow.
//
// The "Rossolimo 3.Bb5 e6" tab plays the main line's own moves, so its lesson
// is the main line's beats, said the same way.
import type { WatchCourse } from './watchCourse';

const MAIN = ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'e6', 'O-O', 'Nge7', 'Re1', 'a6', 'Bf1', 'd5', 'exd5', 'Nxd5', 'd4', 'cxd4', 'Nxd4', 'Nxd4', 'Qxd4', 'Nf6', 'Qxd8+'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["e4: a little under half of all master games start here, and it's the engine's first choice. The pawn takes a central square and opens the way for your queen and for the bishop on f1. Keep an eye on that bishop: the whole Rossolimo is built around where it goes next.", 'e4 — the center, frees f1.'],
  ["…c5, the Sicilian, almost half the masters' answer. Why the c-pawn and not the e-pawn? From c5 it watches d4 from the side, so if you ever push d4, they can trade a wing pawn for your center pawn. It's about level.", '…c5 — the Sicilian, watches d4.'],
  ["Nf3, eight masters in ten, and the engine's first choice. The knight develops toward the center and covers d4 and e5. The real decision comes a move later, once you see where their queen's knight goes.", 'Nf3 — covers d4 and e5.'],
  ["…Nc6, about a quarter of masters; …d6 is played more often, but this is the engine's first choice. The knight adds a second guard on d4, next to the pawn on c5. So now the question: the Open Sicilian with d4, and all of its theory, or something else?", '…Nc6 — a second guard on d4.'],
  ["Something else: Bb5, and that's the Rossolimo. Almost six masters in ten play d4 here and go into the Open Sicilian; about three in ten play Bb5, and the engine actually rates it first. Look at what the bishop hits: the knight on c6, the piece covering d4 and e5. It isn't a pin, because their pawn on d7 stands between the knight and the king. It's an offer that hangs over the whole game: take on c6 now, and only a pawn can take back, so their c-pawns end up doubled. Take or keep, that's the question every line in this course answers.", 'Bb5 — the Rossolimo, eyes the c6-knight.'],
  ["…e6, a quarter of masters; half of them prefer …g6, which has its own tab. The pawn prepares …d5 and opens a road for their bishop on f8. And it gives their other knight a new square: e7, from where it could take back on c6 and keep their pawns whole.", '…e6 — prepares …d5 and …Nge7.'],
  ["You castle, as two masters in three do, and the engine agrees. Why not take on c6 right now? Three masters in ten do, but the engine rates it about a fifth of a pawn worse. There's no hurry: your king gets safe, and your rook on f1 is one move from e1.", 'O-O — king safe, the rook next.'],
  ["…Nge7, practically every master. The knight heads for e7 so that if your bishop ever takes on c6, a knight takes back and their pawns stay whole. From e7 it also watches g6 and f5. You are a little better.", '…Nge7 — ready to take back on c6.'],
  ["Re1, the most common move here, about four masters in ten. The rook backs up your e4 pawn and takes the e-file before anything has opened. Remember where their king is: e8. If this file ever opens, your rook is already on it. The engine rates Ba4 and c3 a touch higher; you are a little better either way.", 'Re1 — backs up e4, takes the file.'],
  ["…a6, and here the masters' figures run out. The pawn hits your bishop on b5, which has no guard, so the question can't wait any longer: take on c6, or step back?", '…a6 — the bishop must decide.'],
  ["Bf1, the engine's first choice: the bishop goes all the way home. Taking on c6 is close behind, but after …Nxc6 their knight is back on a good square with their pawns intact, which is exactly what …Nge7 was for. On f1 the bishop guards g2 in front of your king, and look, it still eyes a6 down the same diagonal. It's about level.", 'Bf1 — all the way home, eyes a6.'],
  ["…d5, the engine's first choice, and the break their whole setup was built for. The pawn hits your e4 pawn. Do you push past it to e5, or take?", '…d5 — the break, hits e4.'],
  ["Take. The push to e5 looks natural, but it's about half a pawn worse; holding the pawn with d3 is as good as taking. Now your pawn on d5 hits the knight on c6 and the pawn on e6, so they have to take back at once. And watch the e-file open, the file your rook took two moves ago.", 'exd5 — the e-file opens.'],
  ["…Nxd5, the engine's first choice; taking with the pawn would cost them about a pawn. Now look down the e-file: your rook on e1, nothing on e2 through e5, then their pawn on e6, then their king on e8. That pawn is pinned to the king. You are a little better.", '…Nxd5 — the e6 pawn is pinned.'],
  ["d4, the engine's first choice. The pawn hits c5, and this is the moment your setup was waiting for: their king is still on e8 with the e6 pawn pinned in front of it, so opening the center is exactly what you want. It's about level.", 'd4 — open the center now.'],
  ["…cxd4: they take, and for one move you're a pawn down. So which piece takes back on d4?", '…cxd4 — the files open.'],
  ["Nxd4, the engine's first choice by a long way; anything else gives back most of your edge. From d4 the knight hits their knight on c6 and the pinned pawn on e6. You are a little better.", 'Nxd4 — hits c6 and e6.'],
  ["…Nxd4: they trade knights. Their knight on d4 hits c2, and nothing guards it, so you have to take back right now.", '…Nxd4 — knights off, take back.'],
  ["Qxd4, and it's the only good move: anything else just leaves you a piece down. Look where the queen lands: d4, in the middle of the board, hitting the knight on d5 and the pawn on g7. And look at the d-file: their queen on d8 faces yours, with only that knight on d5 between them.", 'Qxd4 — central queen, hits d5 and g7.'],
  ["…Nf6, the engine's first choice. The knight steps off d5 and stands in front of g7, so your queen no longer hits that pawn. But it also opens the d-file: now the queens look straight at each other, and yours on d4 has no guard, while theirs is guarded by the king. So what do you do?", '…Nf6 — the queens face each other.'],
  ["Qxd8+: take first, and it comes with check. The engine's first choice; Qh4 is nearly as good. Their only move is to take back with the king, and here's the point: after …Kxd8 their king sits on d8, it can never castle, and it's stuck in the middle with the d-file open. You are a little better. Your plan for the middlegame: the knight to d2 and on to c4 or b3, the bishop out from f1, and your rooks onto the open files against a king that can't castle.", 'Qxd8+ — trade, their king stays central.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const ACCELERATED = 'Accelerated Pawn Storm (positional squeeze)';

const TAB_LINES: Record<string, string[]> = {
  'Rossolimo 3.Bb5 e6': ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'e6', 'O-O', 'Nge7', 'Re1', 'a6', 'Bf1', 'd5', 'exd5', 'Nxd5', 'd4', 'cxd4', 'Nxd4', 'Nxd4', 'Qxd4', 'Nf6', 'Qxd8+'],
  'Rossolimo 3.Bb5 g6': ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'g6', 'O-O', 'Bg7', 'Re1', 'e5', 'Bxc6', 'dxc6', 'd3', 'b6', 'a4', 'a5', 'Na3', 'Ne7', 'Nc4', 'Qc7', 'Bd2'],
  [ACCELERATED]: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'e6', 'Bxc6', 'bxc6', 'd3', 'd5', 'e5', 'Ne7', 'b3', 'Ng6', 'Bb2', 'a5', 'Nc3', 'Ba6', 'O-O', 'Be7', 'Ba3'],
  'Wing Gambit': ['e4', 'c5', 'Nf3', 'Nc6', 'b4', 'cxb4', 'd4', 'd5', 'exd5', 'Qxd5', 'c4', 'bxc3', 'Nxc3', 'Qa5', 'Rb1', 'Qxc3+', 'Bd2', 'Qa3', 'd5', 'e6', 'dxc6'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The same moves as the main line: every beat is already filed there.
  'Rossolimo 3.Bb5 e6': [],
  'Rossolimo 3.Bb5 g6': [
    ["…g6, the most popular move here, half of all masters, and the engine's first choice. Their bishop is heading for g7 and the long diagonal. Now think about the trade on c6: with their other knight still on g8, only a pawn can take back there, so whenever you take, their c-pawns end up doubled.", '…g6 — the bishop heads for g7.'],
    ["You castle, as about half the masters do; four in ten take on c6 at once, and the engine slightly prefers that. Either way the trade on c6 can wait a move, and castling gets your king safe and the rook on its way to e1. It's about level.", 'O-O — king first, the trade waits.'],
    ["…Bg7, almost every master. The bishop lands on the long diagonal, and with nothing in the way it hits your b2 pawn, which is pinned to the rook on a1 behind it. You are a little better.", '…Bg7 — the long diagonal, hits b2.'],
    ["Re1, a little over four masters in ten. The rook backs up e4 and gets ready for the center to open. The engine prefers taking on c6 right now, as it did a move ago, and after Re1 it's about level.", 'Re1 — backs up e4.'],
    ["…e5, a bit under half the masters, and the engine's first choice. The pawn grabs space and takes d4 and f4 away from your pieces. But look at their bishop on g7: its own pawn now blocks it on e5, and the pin on b2 is gone. It's about level.", '…e5 — space, but it blocks g7.'],
    ["Bxc6: now you take, as two masters in three do, and the engine agrees. The bishop hits b7 and d7, and both of those pawns are pinned, one to the king, one to the rook on a8. A pinned pawn may still take the piece that pins it, so a pawn will take back. And whichever one does, their c-pawns end up doubled.", 'Bxc6 — doubles their c-pawns.'],
    ["…dxc6, the engine's first choice; taking with the b-pawn costs them about a third of a pawn. The d-pawn's capture opens the d-file for their queen and a diagonal for their bishop on c8. They have the two bishops now; you have the healthier pawns. It's about level.", '…dxc6 — the two bishops for them.'],
    ["d3, the engine's first choice: a modest move with a clear job. The pawn guards e4, so your center pawn is solid, and it opens the diagonal for your bishop on c1. It's about level.", 'd3 — guards e4, frees c1.'],
    ["…b6, the engine's first choice. The pawn props up c5, the front pawn of the doubled pair. Remember those doubled pawns: they're the long-term target, and they're already being looked after.", '…b6 — props up c5.'],
    ["a4: the pawn wants to go to a5 and hit b6, the pawn holding c5 together. The engine slightly prefers a3, and it's about level.", 'a4 — aims at a5 and b6.'],
    ["…a5, the engine's first choice: they stop your a-pawn cold. But that fixes their pawns on a5 and b6, and those are exactly the squares a knight on c4 would hit.", '…a5 — stops a5, fixes their pawns.'],
    ["Na3: the knight heads for c4, and from a3 the road to c4 is open. The engine rates h3 a touch higher; it's about level.", 'Na3 — on its way to c4.'],
    ["…Ne7, the engine's first choice. Their last minor piece comes out, covering d5 and f5, and now their king can castle. It's about level.", '…Ne7 — covers d5 and f5.'],
    ["Nc4: there it is. Look at what the knight hits from c4: the pawns on a5 and b6, and the pawn on e5. It's about level.", 'Nc4 — hits a5, b6 and e5.'],
    ["…Qc7, the engine's first choice. The queen gives e5 a second guard: your knights on c4 and f3 hit it, their queen and the bishop on g7 guard it. Two against two, so it holds. Chasing your knight with …b5 instead would cost them about a pawn. It's about level.", '…Qc7 — a second guard on e5.'],
    ["Bd2: the bishop develops and hits a5, so now that pawn is hit twice. The engine rates h3, Be3 and b3 about the same. Your plan for the middlegame: b3, so the knight on c4 has a pawn behind it, then h3 and Qe2, and keep pressing their doubled pawns and the pawn on e5.", 'Bd2 — develops, hits a5.'],
  ],
  [ACCELERATED]: [
    ["Bxc6 at once: about three masters in ten take right away, before their knight can reach e7. The engine prefers castling first by about a fifth of a pawn, but the point is clear: only a pawn can take back, so their c-pawns end up doubled. The pawns on b7 and d7 are both pinned, but either may still take the bishop that pins it.", 'Bxc6 — at once, before …Nge7.'],
    ["…bxc6, nearly every master: the b-pawn takes, toward the center, and the engine agrees; …dxc6 would cost them about half a pawn. Now the pawns on c6 and c5 are doubled, but the one on c6 helps guard d5, where their d-pawn wants to go. It's about level.", '…bxc6 — toward the center, guards d5.'],
    ["d3, six masters in ten: the pawn guards e4 and opens the diagonal for your bishop on c1. The engine slightly prefers b3, which puts that bishop on b2 at once. It's about level.", 'd3 — guards e4, frees c1.'],
    ["…d5, and with the pawn on c6 behind it, d5 is solid. The pawn hits your e4 pawn. So do you take, or push past?", '…d5 — hits e4, backed by c6.'],
    ["Push. Taking on d5 costs almost a pawn: …cxd5, and suddenly their pawns aren't doubled any more, with two healthy center pawns side by side. On e5 your pawn takes d6 and f6 away from their pieces and keeps the doubled pawns where they are. The engine likes b3 first, a little more than this; it's about level.", 'e5 — push past, keep them doubled.'],
    ["…Ne7, the engine's first choice. The knight is heading for g6 or f5; from g6 it would hit your e5 pawn. That pawn is out in front now, so it will need looking after.", '…Ne7 — heading for g6 or f5.'],
    ["b3, the engine's first choice. Your bishop goes to b2 next, where it will guard e5 down the long diagonal. You are a little better.", 'b3 — the bishop heads for b2.'],
    ["…Ng6, and there's the hit on e5. The engine prefers the check …Qa5 first by about a fifth of a pawn. Count it: their knight on g6 attacks e5, and your knight on f3 guards it. You are a little better.", '…Ng6 — hits e5.'],
    ["Bb2: the bishop arrives and gives e5 a second guard. The engine prefers h4, which threatens h5 to kick the knight off g6; you are a little better.", 'Bb2 — a second guard on e5.'],
    ["…a5: the pawn heads down the a-file, with …a4 next to pry at your queenside. You are a little better.", '…a5 — …a4 is coming.'],
    ["Nc3: the knight develops and hits d5. The engine prefers a4, stopping their a-pawn where it stands; you are a little better.", 'Nc3 — develops, hits d5.'],
    ["…Ba6, the engine's first choice. Here's the other side of taking with the b-pawn: their bishop on c8 found the open a6 square, and from there it hits your d3 pawn. You are a little better.", '…Ba6 — hits d3.'],
    ["You castle, the engine's first choice. But notice what castling did: your rook is on f1 now, on the same diagonal as their bishop on a6, so the d3 pawn is pinned to it. You are a little better.", 'O-O — king safe, d3 pinned.'],
    ["…Be7, the engine's first choice: the last bishop develops to e7, and their king gets ready to castle. It's about level.", '…Be7 — ready to castle.'],
    ["Ba3: the bishop switches diagonals and hits c5, the front pawn of the doubled pair. The engine rates g3 about the same; you are a little better. Your plan for the middlegame: Na4 for a second hit on c5, pressure on the doubled pawns, and the pawn on e5 keeping their kingside cramped.", 'Ba3 — hits c5.'],
  ],
  'Wing Gambit': [
    ["b4: a gambit. About one master game in a thousand goes this way; d4 and Bb5 are the main roads, and the engine rates b4 almost a pawn worse than Bb5. So why give a pawn? The pawn hits c5, and if they take, their pawn has left c5, so your d4 can take the center with no pawn there to trade it off. After b4 they are a little better: this is a surprise weapon, not the engine's choice.", 'b4 — the gambit, hits c5.'],
    ["…cxb4, six masters in ten; three in ten take with the knight, which the engine rates just as highly. Now c5 is empty, and your d-pawn can claim the center. It's about level.", '…cxb4 — c5 is empty.'],
    ["d4, nine masters in ten, and the engine's first choice. Two center pawns, on d4 and e4, for a wing pawn: that's the deal the gambit offers. It's about level.", 'd4 — two center pawns.'],
    ["…d5, two masters in three, and the engine's first choice. They hit back at e4 at once, and right now nothing guards that pawn.", '…d5 — hits e4.'],
    ["exd5: almost every master takes, and the engine agrees; guarding e4 with Bd3 costs about half a pawn. Your pawn on d5 hits the knight on c6, so they have to deal with it now.", 'exd5 — hits the c6-knight.'],
    ["…Qxd5, the engine's first choice; moving the knight away instead costs them well over a pawn. From d5 the queen hits a2, d4 and your knight on f3. They are a little better: you're a pawn down and their queen is in the middle of the board. Can you make it pay for being there?", '…Qxd5 — hits a2, d4 and f3.'],
    ["c4, the engine's first choice: hit the queen with a pawn and gain time. But there's a catch you need to see coming. Your c-pawn has jumped two squares, right past their pawn on b4, and a pawn that does that can be taken en passant.", 'c4 — hits the queen.'],
    ["…bxc3, en passant, the engine's first choice: their b4 pawn takes your c-pawn as if it had moved only one square, and lands on c3. For the moment they are two pawns up, but the pawn on c3 has no guard. It's about level.", '…bxc3 — en passant.'],
    ["Nxc3, the engine's first choice: the knight takes the pawn back, develops, and hits the queen on d5 again. One pawn down, and your pieces come out with gain of time. It's about level.", 'Nxc3 — develops, hits the queen.'],
    ["…Qa5, the engine's first choice; every other queen move costs them well over a pawn. From a5 the queen hits a2, and it pins your knight on c3 to your king on e1, with nothing guarding the knight. So how do you save it?", '…Qa5 — pins the c3-knight.'],
    ["Rb1: you don't save it. The rook takes the half-open b-file and hits b7. Breaking the pin with Bd2 is the engine's first choice by a hair, but Rb1 sets them a question: what happens if they grab the knight?", 'Rb1 — the knight is offered.'],
    ["…Qxc3+, the engine's first choice: they take the knight with check. Now they're a piece and a pawn up, and the queen on c3 hits your bishop on c1, the pawn on d4, your king and your knight on f3. Looks grim? It's still about level. There's one move that turns it around.", '…Qxc3+ — a piece up, with check.'],
    ["Bd2, the only move: blocking with the knight or the queen loses about five pawns. The bishop blocks the check and hits the queen. It's pinned to your king, but a pinned piece can still capture along the line of the pin, so the queen on c3 really is attacked and has to move.", 'Bd2 — blocks, hits the queen.'],
    ["…Qa3, the engine's first choice by a mile: the next best moves give the queen up on d2 or f3 for a minor piece. From a3 it hits a2 and your knight on f3. They're a piece and a pawn up, and still it's about level. Why? Look at their development: besides the queen, only the knight on c6 is out.", '…Qa3 — the queen escapes.'],
    ["d5, the engine's first choice; the natural Ne5 or Bb5 lose more than two pawns. The pawn hits the knight on c6, their only developed minor piece.", 'd5 — hits the c6-knight.'],
    ["…e6, the engine's first choice: they don't move the knight, they hit back at d5. Your pawn there is attacked and has no guard, so it takes first.", '…e6 — hits d5.'],
    ["dxc6, the engine's first choice: the pawn takes the knight, and you've won your piece back. Your pawn on c6 hits b7; after …bxc6 you're two pawns down, and it's about level, because the lines are open and their pieces are still at home. Your plan for the middlegame: the queen to c2 or a4, the bishop to e2 and castle, and use the b-file your rook already holds before they catch up in development.", 'dxc6 — the piece back, lines open.'],
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

export const PRO_GOTHAMCHESS_ANTI_SICILIAN_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-anti-sicilian',
  title: "This repertoire's Anti-Sicilian — the Rossolimo, No Theory Required",
  orientation: 'white',
  sources: [
    'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation',
    'https://en.wikipedia.org/wiki/Sicilian_Defence,_Rossolimo_Variation',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
