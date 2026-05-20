import type { LessonScript } from '../../types';

// Arrow colors — arrows are reserved for PIECES (vision / threat /
// intent), never pawns. Pawn ideas use highlights instead.
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const INTENT = 'rgba(40,185,95,0.92)';
// Highlight colors. KEY = a strong, near-solid yellow that fills the
// whole coveted square (David 2026-05-20: "yellow filling the entire
// square"). SOFT = subtle blue for secondary context squares.
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

const M = 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8 Bg5 g6 Ng3 Bg7'.split(' ');

/**
 * The Ruy Lopez — A Master Class. Story-first: the lecture is the
 * spine; the board moves, demonstrates, rewinds, and branches to serve
 * it. Grounded in the public-domain classics (Capablanca, Lasker).
 */
export const RUY_LOPEZ_LESSON: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'The Ruy Lopez — A Master Class',
  minutes: 14,
  orientation: 'white',
  beats: [
    {
      id: 'open',
      moves: ['e4', 'e5'],
      highlights: [{ square: 'e4', color: KEY }, { square: 'e5', color: KEY }],
      say: "Welcome. Today we study the oldest opening still played at the very top — the Ruy Lopez, written down by a Spanish priest in 1561. Forget memorizing moves. By the end of this you'll understand the one idea the whole opening is built on. It starts simply: e4 against e5. Equal. Now watch White turn that equality into a question Black has to answer for the next forty moves.",
      sayShort: 'The Ruy Lopez — a four-century argument that begins with one question: who controls e5?',
    },
    {
      id: 'press-e5',
      moves: ['e4', 'e5', 'Nf3'],
      arrows: [{ from: 'f3', to: 'e5', color: ATK }],
      say: 'The first thing White does is lean on the center. The e5-pawn is now under fire, and Black has to decide how to defend it. How he defends will shape the entire game.',
      sayShort: 'White leans on e5; Black must defend it.',
    },
    {
      id: 'the-defender',
      moves: ['e4', 'e5', 'Nf3', 'Nc6'],
      arrows: [{ from: 'c6', to: 'e5', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Black defends with the knight on c6. Look hard at this knight. It is the only thing holding e5 in place. Remember it — because here is the secret of the whole opening.",
      sayShort: 'The c6-knight is the only defender of e5. Remember it.',
    },
    {
      id: 'attack-defender',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
      arrows: [{ from: 'b5', to: 'c6', color: ATK }],
      say: "White does not attack the pawn. White attacks its defender. That is the soul of the Spanish: patient, indirect pressure. White will never win e5 by force — White will simply make it exhausting for Black to hold.",
      sayShort: "The soul of the Ruy: attack the defender, not the pawn.",
    },
    {
      id: 'demo-exchange',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6'],
      highlights: [{ square: 'c6', color: KEY }, { square: 'c7', color: KEY }],
      say: "What if White just takes the knight? Watch. After the trade, Black's queenside pawns are doubled — a weakness that lasts into the endgame. That's a real plan, the Exchange Variation, a lesson of its own. But usually White is greedier than that.",
      sayShort: "Trading on c6 leaves Black with doubled pawns — the Exchange Variation.",
    },
    {
      id: 'keep-pin',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4'],
      arrows: [{ from: 'a4', to: 'c6', color: ATK }],
      say: "So let's rewind. Black pokes the bishop, asking it to decide — and the bishop slides back but never leaves the diagonal. It still stares straight at c6. White keeps the bishop and the pressure. The pin lives.",
      sayShort: 'The bishop retreats but stays on the diagonal — the pressure on c6 lives.',
    },
    {
      id: 'e4-bait',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'],
      highlights: [{ square: 'e4', color: KEY }],
      say: "And now the mirror image. Black's knight attacks White's e4-pawn — and White just castles, leaving it hanging. Why so calm? Because if Black grabs it, that's the Open Ruy Lopez: White answers by striking the center with d4, rips the position open, and his huge lead in development more than pays for a single pawn. The e4-pawn is bait. White is happy to offer it for a roaring initiative — which is exactly why most of the time Black declines and keeps things solid.",
      sayShort: "White leaves e4 hanging on purpose — taking it is the Open Ruy, where White's d4 and fast development pay for the pawn.",
    },
    {
      id: 'develop',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1'],
      arrows: [{ from: 'e1', to: 'e4', color: VIS }],
      say: "Both sides develop calmly — knights and bishops out, kings tucked away. No fireworks. And White's rook slides behind the e-pawn. This is the rhythm of the Ruy: every piece points at the center before it points anywhere else.",
      sayShort: 'Calm development — and every Spanish piece aims at the center first.',
    },
    {
      id: 'bishop-home',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3'],
      arrows: [{ from: 'b3', to: 'f7', color: ATK }],
      highlights: [{ square: 'f7', color: KEY }],
      say: "Black grabs space and shoves the bishop once more — but now the bishop finds its true home. From here it looks straight down the long diagonal at f7, the softest square in front of Black's king. That diagonal will haunt Black for the rest of the game.",
      sayShort: 'The bishop finds its diagonal, boring in on f7.',
    },
    {
      id: 'quiet-prep',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3'],
      highlights: [{ square: 'd4', color: KEY }, { square: 'c2', color: SOFT }],
      say: "Now the humblest-looking move of the whole opening. It does two quiet, enormous things: it prepares to build a full center on d4, and it opens an escape square on c2 for that precious bishop. The Ruy is built on preparation, not threats.",
      sayShort: 'A quiet move readies the d4 center and opens c2 for the bishop.',
    },
    {
      id: 'prophylaxis',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3'],
      highlights: [{ square: 'g4', color: KEY }],
      say: "And then a tiny pawn move that isn't really about the pawn. It's prophylaxis. Before White commits to the big central break, he takes away Black's pin on the g4 square. The master's habit: stop your opponent's plan before you start your own.",
      sayShort: 'Prophylaxis — deny the g4 pin before committing to the center.',
    },
    {
      id: 'breyer',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Nb8'],
      arrows: [{ from: 'b8', to: 'd7', color: INTENT }],
      say: "Now the strangest move you'll see today. Black retreats a fully developed knight all the way home. It looks like a beginner's blunder — it's one of the deepest ideas in chess. The knight is rerouting toward d7, where it will brace the center and free Black's pawns without blocking the bishop. This is the Breyer, and grandmasters have trusted it for a hundred years.",
      sayShort: 'The Breyer — the knight retreats to reroute through d7, deeper than it looks.',
    },
    {
      id: 'the-break',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Nb8', 'd4'],
      highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: KEY }],
      say: "Finally — after nine moves of preparation — the central break lands. The whole opening has circled these two squares, and now they collide. This is the moment the slow build pays off.",
      sayShort: 'After nine moves of preparation, the center breaks open.',
    },
    {
      id: 'capablanca-bishop',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Nb8', 'd4', 'Nbd7', 'Nbd2', 'Bb7'],
      arrows: [{ from: 'b7', to: 'e4', color: ATK }],
      say: "Black's knight finishes its journey, White's queen-knight sets off on one of its own, and Black fianchettoes the queen's bishop to b7. Capablanca prized this diagonal: from b7 the bishop exerts great pressure down the long light squares, bearing straight at e4 and the heart of White's center.",
      sayShort: "Bb7 — Capablanca's long-diagonal bishop, bearing down on e4.",
    },
    {
      id: 'loaded-battery',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Nb8', 'd4', 'Nbd7', 'Nbd2', 'Bb7', 'Bc2'],
      highlights: [{ square: 'h7', color: KEY }],
      say: "The bishop completes its grand tour and points like a loaded gun toward h7, near Black's king. For now its own pawn blocks the view. But the instant the center cracks open, this is the piece that attacks the king. White has spent twelve moves quietly aiming it.",
      sayShort: 'The bishop is loaded toward h7 — primed for when the center opens.',
    },
    {
      id: 'f5-outpost',
      moves: M,
      arrows: [{ from: 'g3', to: 'f5', color: INTENT }],
      highlights: [{ square: 'f5', color: KEY }],
      say: "White's knight marches to the kingside, eyeing one square above all others: f5. Black answers with g6 and Bg7 — and now Capablanca's other half appears: the king's bishop sits on g7 with the king castled safely behind it, the great defensive strength he paired with the diagonal pressure. But that wall does more than shelter — it fights for f5. Lasker warned that in the Ruy Lopez a knight settling on f5 cannot be repelled. That is the prize the whole middlegame revolves around: White hunting the square, Black denying it.",
      sayShort: "Bg7 is Capablanca's fortress; and Lasker's f5 — a knight there can't be repelled — is the prize.",
    },
    {
      id: 'branch-berlin',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'],
      arrows: [{ from: 'f6', to: 'e4', color: ATK }],
      say: "Now — Black doesn't have to follow that path. He can ignore the bishop and strike at e4 immediately. This is the Berlin, the granite wall Vladimir Kramnik used to dethrone Garry Kasparov in 2000. A completely different chapter, often steering into a dry endgame — but it begins with the very same question.",
      sayShort: "The Berlin — Black strikes e4 at once; Kramnik's wall against Kasparov.",
    },
    {
      id: 'branch-marshall',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'O-O', 'c3', 'd5'],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Or Black can do something audacious: castle, then strike in the center and offer a pawn for a furious attack. This is the Marshall Attack — a prepared sacrifice that has terrified White players for over a century. Another chapter entirely. But again, the same root question: who controls the center, and at what price?",
      sayShort: 'The Marshall — Black sacrifices a pawn for a roaring attack.',
    },
    {
      id: 'close',
      moves: M,
      highlights: [{ square: 'f5', color: SOFT }, { square: 'f7', color: SOFT }],
      say: "And that is the Ruy Lopez. Not a trap, not a knockout — a four-century argument about a single pawn and the squares around it. White builds slowly, presses the defender, aims a bishop at the king and a knight at f5. Black holds, reroutes, and waits to counterpunch. Learn this one idea — pressure the defender, not the pawn — and you don't just know the Ruy Lopez. You understand chess a little more deeply than you did fifteen minutes ago. Class dismissed.",
      sayShort: 'Pressure the defender, not the pawn — that is the Ruy Lopez. Class dismissed.',
    },
  ],
};
