// GothamChess's King's Indian Attack — the Watch course, one beat a move
// (WO-OPENINGS-REWRITE-01). Written from the fact sheet (`LESSON_FACTS=1
// LESSON_IDS=pro-gothamchess-kia`, graded at depth 16): masters' percentages,
// engine lines, the board after each move. The student plays White.
// Standard: docs/OPENING-WATCH-BEATS.md, said in the think-out-loud register
// (§2a). One story runs through both lines: the same setup (Nf3, g3, Bg2,
// castle, d3, Nbd2, e4), and the d-pawn that stops on d3 until the moment is
// right.
//
// The d4 claim in the Sicilian tab (…cxd4, then Nxd4 drops a piece to the
// bishop on g7) was read by Stockfish at depth 16; the sheet's top three at
// that move did not list d4.
//
// The "vs …d5 + …c5" tab plays the main line's own moves, so its lesson is
// the main line's beats, said the same way.
import type { WatchCourse } from './watchCourse';

const MAIN = ['Nf3', 'd5', 'g3', 'c5', 'Bg2', 'Nc6', 'O-O', 'e6', 'd3', 'Nf6', 'Nbd2', 'Be7', 'e4', 'O-O', 'Re1', 'b5', 'e5', 'Nd7', 'Nf1', 'a5', 'h4'];

/** The main line's beats, in order — one per move of `MAIN`. */
const MAIN_BEATS: Array<[string, string]> = [
  ["Nf3: about one master game in ten starts this way; e4 and d4 are more common, and the engine likes them a touch more. The knight covers d4 and e5 and tells them nothing about your pawns. That's the King's Indian Attack in one idea: the same setup, the knight, the fianchetto, castling, d3 and e4, against almost anything they play.", 'Nf3 — covers d4 and e5.'],
  ["…d5, three masters in ten; …Nf6 is more common. The pawn takes the center and covers e4, the very square your setup is built to push to. So their question is how to stop e4, and yours is how to force it.", '…d5 — takes the center, covers e4.'],
  ["g3, four masters in ten, the most popular move here. The pawn makes room for the bishop on g2, the fianchetto: a bishop on the long diagonal, right in front of where your king is going to live.", 'g3 — room for the bishop on g2.'],
  ["…c5, only about one master in fifteen; …Nf6 is the usual move. Pawns on c5 and d5 grab space, and the c-pawn covers d4. That suits you: in this setup your d-pawn only goes to d3, and the center square you want is e4.", '…c5 — space, and the pawn covers d4.'],
  ["Bg2, nine masters in ten, and the engine's first choice. The bishop takes the long diagonal. For now your knight on f3 stands in front of it, but once that knight moves, the bishop looks straight through the center at d5 and their queenside.", 'Bg2 — the fianchetto, the long diagonal.'],
  ["…Nc6, seven masters in ten. The knight joins the c5 pawn in covering d4, and it hits e5 too, so your pawns won't find much room in the center. It's about level.", '…Nc6 — covers d4 and e5.'],
  ["You castle, and here the system has a price. More than half the masters play d4 instead, hitting c5 while most of their pieces are still at home, and the engine prefers it by about half a pawn. Castling keeps you on your setup and gets your king safe, but it gives them time to grab the whole center with …e5. It's about level.", 'O-O — king safe; d4 was stronger.'],
  ["…e6, one master in ten. About half the masters push …e5 instead and take the whole center, and the engine agrees, by about half a pawn. With the pawn only on e6, their center is smaller, and your e4 plan is back on the table. It's about level.", '…e6 — modest; …e5 was stronger.'],
  ["d3, half the masters, and it's the heart of the system: a small pawn move that prepares e4. The pawn covers e4 and c4 and opens the diagonal for your bishop on c1. The engine rates d4 and c4 a little higher, but it's about level.", 'd3 — the heart of the setup.'],
  ["…Nf6, a quarter of masters; half the masters prefer …Bd6. The knight develops and covers e4, so now the d5 pawn and the knight both watch the square you want to push to. Count them before you push: two of theirs.", '…Nf6 — e4 watched twice.'],
  ["Nbd2, eight masters in ten. Why d2 and not c3? From d2 the knight covers e4, adding your second guard next to the d3 pawn, and it leaves the c-pawn free. Remember this knight: later it goes to f1 and on toward the kingside. The engine would push e4 at once; it's about level either way.", 'Nbd2 — guards e4, the c-pawn free.'],
  ["…Be7, eight masters in ten. The bishop develops quietly to e7 and gets their king ready to castle. It's about level.", '…Be7 — ready to castle.'],
  ["e4, and there it is, the move the whole setup was built for. Nearly every master plays it, and the engine agrees. The pawn hits d5, with your d3 pawn and the knight on d2 behind it. Now the two center pawns, e4 and d5, look straight at each other.", 'e4 — the setup move, hits d5.'],
  ["…O-O, six masters in ten castle, and their king goes to g8, the side where your attack will come. Look at your setup now: pawns on d3 and e4, the bishop on g2, the knight on d2. That's the King's Indian Defence setup, played by White, and its plans come with it: you play on the kingside, they play on the queenside.", '…O-O — their king goes to g8.'],
  ["Re1, eight masters in ten, and the engine's first choice. The rook backs up your e4 pawn, and it clears f1, the square your knight on d2 wants to travel through.", 'Re1 — backs up e4, clears f1.'],
  ["…b5, half the masters: the queenside expansion begins. The pawn heads toward b4 to push your pieces around on that side, and it gives their bishop on c8 the b7 square. It's about level. So, the big decision: take on d5, or push past?", '…b5 — the queenside push starts.'],
  ["e5: push past, as seven masters in ten do; the engine rates taking on d5 about the same. The pawn hits the knight on f6, so it has to move. And the center locks: your pawn on e5 against theirs on d5 and e6. When the center is closed, the game goes to the wings, you on the kingside, they on the queenside.", 'e5 — hits the knight, locks the center.'],
  ["…Nd7, nine masters in ten. The knight steps back and hits your e5 pawn at once. Count it: their knights on d7 and c6 attack e5, your knight on f3 and the rook on e1 guard it. Two against two, so the pawn holds. It's about level.", '…Nd7 — hits e5; it holds.'],
  ["Nf1, nine masters in ten, and the engine's first choice. Remember the knight on d2, and the rook that cleared f1 for it? Here's the payoff: from f1 the knight can go on to h2 or e3, closer to their king.", 'Nf1 — the knight heads for the kingside.'],
  ["…a5, the engine's first choice. Their queenside pawns are rolling: …a4 and …b4 are next, to pry open lines against your queenside. That's their race. It's about level.", '…a5 — …a4 and …b4 are coming.'],
  ["h4, rated about the same as a4 and a3. The pawn grabs space and guards g5, so a piece that lands there has a pawn behind it. It's about level. Your plan for the middlegame: the knight from f1 to h2 and on to g4, the bishop to f4, and a kingside attack against their king on g8, while their pawns roll on the other wing.", 'h4 — space, guards g5.'],
];

const beats: Record<string, { say: string; sayShort: string }> = {};
MAIN_BEATS.forEach(([say, sayShort], k) => { beats[MAIN.slice(0, k + 1).join(' ')] = { say, sayShort }; });

/** A tab's beats from the first move the main line doesn't share. */
type TabBeats = Array<[string, string]>;

const SICILIAN = 'vs Sicilian (KIA vs …c5 + …Nf6)';

const TAB_LINES: Record<string, string[]> = {
  'vs …d5 + …c5': ['Nf3', 'd5', 'g3', 'c5', 'Bg2', 'Nc6', 'O-O', 'e6', 'd3', 'Nf6', 'Nbd2', 'Be7', 'e4', 'O-O', 'Re1', 'b5', 'e5', 'Nd7', 'Nf1', 'a5', 'h4'],
  [SICILIAN]: ['Nf3', 'c5', 'g3', 'Nc6', 'Bg2', 'g6', 'O-O', 'Bg7', 'd3', 'Nf6', 'Nbd2', 'd6', 'e4', 'b5', 'c3', 'O-O', 'd4', 'cxd4', 'cxd4', 'a5', 'Re1'],
};

const TAB_BEATS: Record<string, TabBeats> = {
  // The same moves as the main line: every beat is already filed there.
  'vs …d5 + …c5': [],
  [SICILIAN]: [
    ["…c5, about one master in ten. The Sicilian move: the pawn covers d4 and b4. The engine prefers …e6 or …d5 here, and after …c5 you are a little better.", '…c5 — the Sicilian move, covers d4.'],
    ["g3, two masters in ten; six in ten play c4. You stay on your system, the fianchetto first, whatever they do. The engine rates e4 and c4 a touch higher; it's about level.", 'g3 — the fianchetto first.'],
    ["…Nc6, more than half the masters. The knight joins the c5 pawn in covering d4, and it hits e5 too. It's about level.", '…Nc6 — d4 covered twice.'],
    ["Bg2, eight masters in ten. The bishop takes the long diagonal, behind your knight on f3 for now, aimed at the center and their queenside. It's about level.", 'Bg2 — the long diagonal.'],
    ["…g6, seven masters in ten, and they copy you: their bishop is heading for g7, on the other long diagonal, aimed at your queenside.", '…g6 — they fianchetto too.'],
    ["You castle, the engine's first choice: your king goes to g1, safe before anything happens in the center. It's about level.", 'O-O — king safe first.'],
    ["…Bg7, the engine's first choice. Their bishop looks straight down the diagonal at your b2 pawn, and with nothing in between, that pawn is pinned to the rook on a1 behind it. Keep this bishop in mind: it's the reason your d-pawn stops on d3.", '…Bg7 — hits b2.'],
    ["d3, and here's why. The natural d4 runs straight into that bishop: after …cxd4, if your knight takes back, …Nxd4, and your queen can't recapture, because the bishop on g7 is aimed at d4. You'd be a piece down. So the pawn goes one square: it covers e4 and c4, and e4 comes later. The engine rates c3 a touch higher; it's about level.", 'd3 — d4 would run into g7.'],
    ["…Nf6, rated as highly as …d5 and …d6. The knight develops and covers e4 and d5. It's about level.", '…Nf6 — covers e4 and d5.'],
    ["Nbd2, the same knight to the same square as against …d5: from d2 it covers e4, and it leaves your c-pawn free to move. That freedom matters in a few moves.", 'Nbd2 — guards e4, frees the c-pawn.'],
    ["…d6: the pawn props up c5 and covers e5, so your e-pawn won't get to e5 easily. It's about level.", '…d6 — props c5, covers e5.'],
    ["e4, the engine's first choice: your center pawn arrives, with the d3 pawn and the knight on d2 behind it. It takes d5 and f5 away from their pieces. Now the setup is complete. It's about level.", 'e4 — the setup is complete.'],
    ["…b5, the queenside expansion again. The engine prefers …h6 by about a fifth of a pawn. The pawn heads for b4, and it frees the b7 square for their bishop on c8. It's about level.", '…b5 — the queenside push.'],
    ["c3: here's what the knight on d2 left free. A quiet move with a big idea: it covers b4 against their pawn, and it prepares d4 with a pawn behind it, so if they take on d4, the c-pawn takes back. It's about level.", 'c3 — prepares d4, covers b4.'],
    ["…O-O: they castle, and their king goes to g8, behind the bishop on g7. It's about level.", '…O-O — their king goes to g8.'],
    ["d4, the engine's first choice, and remember why it waited? With c3 in, a pawn can take back on d4, so the bishop on g7 has nothing to win there. The pawn hits c5, and now you have the pawn center your setup was hiding.", 'd4 — now it works, hits c5.'],
    ["…cxd4, the engine's first choice. Their pawn on d4 hits c3, so you take back right away.", '…cxd4 — hits c3.'],
    ["cxd4: the pawn takes back, and you have two center pawns, d4 and e4, side by side. The engine slightly prefers taking with the knight, but this is the structure your setup was aiming for. It's about level.", 'cxd4 — two center pawns.'],
    ["…a5, rated about the same as …Bb7 and …e5. The a-pawn joins the b-pawn: …a4 and …b4 are next, to push your pieces off the queenside. It's about level.", '…a5 — the queenside pawns roll.'],
    ["Re1: the rook backs up e4. The engine prefers d5, gaining space and hitting the knight on c6 at once, and after Re1 it's about level. Your plan for the middlegame: d5 to kick the knight, then Nb3 and Bf4, using your big center against their fianchetto while their a- and b-pawns come at your queenside.", 'Re1 — backs up e4; d5 next.'],
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

export const PRO_GOTHAMCHESS_KIA_WATCH: WatchCourse = {
  openingId: 'pro-gothamchess-kia',
  title: "This repertoire's King's Indian Attack — One Setup, Every Game",
  orientation: 'white',
  sources: [
    'concept:pos-development',
    'concept:pos-center',
    'https://www.chess.com/openings/Kings-Indian-Attack',
    'https://en.wikipedia.org/wiki/King%27s_Indian_Attack',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
  ],
  lines: [
    { tab: null, moves: MAIN },
    ...Object.entries(TAB_LINES).map(([tab, moves]) => ({ tab, moves })),
  ],
  beats,
};
