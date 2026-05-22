import type { LessonScript } from '../../types';

// Lead-the-eye colour language (playbook §5a, locked 2026-05-21):
// arrows are GREEN (vision / threat / intent), highlights are YELLOW
// (key square the narration is calling out) and SOFT BLUE (secondary
// context). The orange move-squares are painted automatically by the
// LessonPlayer; we don't author them as highlights here.
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const INTENT = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

// The Classical (Italian-Vienna) spine — the "Main line" pill's PGN.
// e4 e5 Nc3 Nf6 Bc4 Bc5 d3 O-O Nf3 d6 O-O c6 Bb3 Nbd7 Ne2 Bb6 c3 Nc5
// Bc2 Bg4 Ng3 Nh5 d4 exd4 cxd4 Ne6 Nf5 d5 h3 Bxf5 exf5 Nc7 Bg5 Qd6
// (matches repertoire.json's vienna-game.pgn).
const M = 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 O-O Nf3 d6 O-O c6 Bb3 Nbd7 Ne2 Bb6 c3 Nc5 Bc2 Bg4 Ng3 Nh5 d4 exd4 cxd4 Ne6 Nf5'.split(' ');

/**
 * The Vienna Game — A Master Class. Story-first: the lecture is the
 * spine; the board moves, demonstrates, branches, and returns to serve
 * it. The Vienna's pitch is its FLEXIBILITY — White's c3-knight backs
 * three different attacking setups (Bc4, f4, g3), and the punishment
 * waits in whichever one Black underestimates. Grounded in the
 * public-domain classics (Capablanca on the centre, Edward Lasker on
 * the f4 lever and the f5 outpost, Bird's record of Blackburne's
 * Vienna at the Nineteenth-Century tournaments).
 */
export const VIENNA_GAME_LESSON: LessonScript = {
  openingId: 'vienna-game',
  title: 'The Vienna Game — A Master Class',
  minutes: 14,
  orientation: 'white',
  beats: [
    {
      id: 'open',
      moves: ['e4', 'e5'],
      highlights: [{ square: 'e4', color: KEY }, { square: 'e5', color: KEY }],
      say: "Welcome. Today we study the opening forged in the Viennese chess clubs of the 1860s — the chosen weapon of Steinitz, the first world champion, and a favorite at the great nineteenth-century tournaments. The Vienna begins the way every classical fight begins: e4 against e5, two pawns staring at each other. The question isn't who controls e5 yet. The question is which knight White develops first — and that single decision is what makes the Vienna different from everything else.",
      sayShort: 'The Vienna — Steinitz\'s opening. The fight begins with which knight White develops first.',
    },
    {
      id: 'the-queens-knight',
      moves: ['e4', 'e5', 'Nc3'],
      arrows: [{ from: 'c3', to: 'e4', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'e4', color: SOFT }],
      say: "Here it is. In the Italian and the Ruy, White always plays Nf3 first — committing the king's knight to e5-pressure straight away. The Vienna refuses. White develops the queen's knight to c3, which does TWO jobs: it supports the e4-pawn so Black can never strike there without a fight, and — far more importantly — it keeps the king-knight free. Watch this square. From c3 alone, White can still choose between three completely different attacking setups, depending entirely on what Black gives him.",
      sayShort: 'Nc3 — queen-knight first. White keeps the king-knight free and the menu of attacks open.',
    },
    {
      id: 'mirror',
      moves: ['e4', 'e5', 'Nc3', 'Nf6'],
      arrows: [{ from: 'f6', to: 'e4', color: ATK }],
      highlights: [{ square: 'e4', color: KEY }],
      say: "Black answers the most-played move — 2…Nf6 — staring back at the e4-pawn. Now both sides claim the centre with a knight. This is the canonical Vienna position, and Edward Lasker called this the moment of real choice for White: he must decide HOW to fight for the centre. Three setups are now in front of him, each with its own personality, and each one a different lesson in this class.",
      sayShort: 'Black mirrors with …Nf6. White now picks the weapon Black has invited.',
    },
    {
      id: 'the-arsenal',
      moves: ['e4', 'e5', 'Nc3', 'Nf6'],
      highlights: [{ square: 'f4', color: KEY }, { square: 'c4', color: KEY }, { square: 'g3', color: KEY }],
      say: "Here is the menu. f4 — the Vienna Gambit, the sharpest weapon, where White hurls a pawn at the centre exactly the way Lasker prescribed: lure the e5-pawn away with a thrust from the side. Bc4 — the Classical, where the bishop bores down the long diagonal at f7, building an Italian-Vienna pressure cooker. And g3 — the Paulsen, where White fianchettoes calmly and squeezes from a distance. Today's lesson walks the Classical spine, because it's the line a careful Black player invites most often. But every other tab in this masterclass is a tooth in the same jaw.",
      sayShort: 'The Vienna\'s arsenal: f4 (Gambit), Bc4 (Classical), g3 (Paulsen). Same Nc3, three weapons.',
    },
    {
      id: 'classical-bishop',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4'],
      arrows: [{ from: 'c4', to: 'f7', color: ATK }],
      highlights: [{ square: 'f7', color: KEY }],
      say: "The Classical begins with 3.Bc4 — the Italian bishop. From c4 it aims straight down the long light diagonal at f7, the softest square in front of Black's king. If you've ever played the Italian Game, you already know this bishop. The Vienna borrows it, but here the Nc3 is already on the board behind it — which means White can support a future d4 break with extra force the moment the position cracks open.",
      sayShort: 'Bc4 — the Italian bishop, aimed at f7, backed by the c3-knight.',
    },
    {
      id: 'black-mirrors',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Bc5'],
      arrows: [{ from: 'c5', to: 'f2', color: ATK }],
      highlights: [{ square: 'f2', color: KEY }, { square: 'f7', color: SOFT }],
      say: "Black mirrors again with Bc5, aiming his own bishop at f2 — the corresponding soft square in front of White's king. The position is now symmetrical. Both sides are pointing at the other's f-pawn. Capablanca's rule is the law of this position: control of the centre is of great importance, and no violent attack can succeed without controlling at least two of the centre squares. So whoever cracks the symmetry FIRST in his favor wins the opening.",
      sayShort: 'Symmetrical Italian-Vienna — both bishops aim at f-pawns. Whoever cracks the centre first leads.',
    },
    {
      id: 'quiet-d3',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Bc5', 'd3'],
      highlights: [{ square: 'e4', color: KEY }, { square: 'c1', color: SOFT }],
      say: "3.d3 — quiet, modest, fundamental. It does three jobs at once: it overprotects e4, it frees the queen's bishop to come out via Bg5 or Be3, and crucially it KEEPS the option of d3-d4 alive for later, when the pieces are coordinated. The Vienna's Classical is the patient brother of the Italian — White builds first, fights second.",
      sayShort: 'd3 overprotects e4, frees the queen-bishop, and keeps d4 waiting in reserve.',
    },
    {
      id: 'castle-and-stabilize',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Bc5', 'd3', 'O-O', 'Nf3', 'd6', 'O-O'],
      arrows: [{ from: 'f3', to: 'e5', color: VIS }],
      say: "Now the king-knight finally comes out — 4.Nf3 — and lands where it would have stood on move two in any other opening. Both sides castle. Black plays d6 to underprop e5. The position is stable, the kings are safe, and the real game — the middlegame fight — is about to begin. This is exactly the structure Blackburne reached when he played the Vienna at the great nineteenth-century events; Bird records his games with Mason in this position as 'enterprising and full of interest.'",
      sayShort: "Nf3 at last, both castle, …d6 props e5. The Classical's middlegame begins.",
    },
    {
      id: 'preparation',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Bc5', 'd3', 'O-O', 'Nf3', 'd6', 'O-O', 'c6', 'Bb3'],
      arrows: [{ from: 'b3', to: 'f7', color: ATK }],
      highlights: [{ square: 'f7', color: KEY }],
      say: "Black plays c6 to free his queen-bishop, which forces White's bishop off the long diagonal. But watch — White doesn't retreat to e2 or d2. He plays Bb3, keeping the bishop aimed at f7 from the SAME diagonal, one square back. This is the Vienna's signature: when Black harasses, the bishop reroutes WITHOUT losing its angle of attack. Compare this to the Ruy Lopez, where the bishop on a4-b3-c2 plays the exact same dance — the geometries rhyme.",
      sayShort: 'Bb3 — bishop steps back without leaving the diagonal. The pressure on f7 is permanent.',
    },
    {
      id: 'the-vienna-knight',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Bc5', 'd3', 'O-O', 'Nf3', 'd6', 'O-O', 'c6', 'Bb3', 'Nbd7', 'Ne2'],
      arrows: [{ from: 'e2', to: 'g3', color: INTENT }],
      highlights: [{ square: 'g3', color: KEY }, { square: 'f5', color: SOFT }],
      say: "Now the move that defines the Classical Vienna: Ne2!? White retreats his own knight to start a slow trek — c3 to e2 to g3, and from g3 the knight will leap toward f5. Edward Lasker's rule from the Spanish applies word-for-word in the Vienna: a knight on f5 cannot be repelled. The whole middlegame organizes around this square. White is willing to spend three tempi to get a knight there.",
      sayShort: 'Ne2 — bound for g3 and then f5. Lasker: a knight on f5 cannot be repelled.',
    },
    {
      id: 'bishop-tour',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Bc5', 'd3', 'O-O', 'Nf3', 'd6', 'O-O', 'c6', 'Bb3', 'Nbd7', 'Ne2', 'Bb6', 'c3', 'Nc5', 'Bc2'],
      highlights: [{ square: 'h7', color: KEY }],
      say: "Black retreats his bishop to b6 — out of the way of …c6 and c5 ideas — and dances his knight to c5 to hit the Bb3. So White slides the bishop once more: Bc2. Now it points down a NEW diagonal, the b1-h7 diagonal — for now blocked by his own e4-pawn, but loaded for the moment the centre breaks open and clears the line. The c2-square is the Vienna's loaded gun, the same way Bc2 loads in the Ruy. Two diagonals from one piece, chosen depending on which side of the board the attack lands.",
      sayShort: 'Bc2 — bishop loads the b1-h7 diagonal, primed for when the centre opens.',
    },
    {
      id: 'the-break',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Bc5', 'd3', 'O-O', 'Nf3', 'd6', 'O-O', 'c6', 'Bb3', 'Nbd7', 'Ne2', 'Bb6', 'c3', 'Nc5', 'Bc2', 'Bg4', 'Ng3', 'Nh5', 'd4'],
      highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: KEY }],
      say: "After almost a dozen quiet preparing moves, the central break finally lands. d4! The pawn White held back since move three storms forward. The c3-pawn supports it, the Bc2 supports it from behind, every piece on the board is aimed at the centre exactly the way Capablanca described — no violent attack can succeed without controlling the centre, and now White does. This is the moment the Vienna becomes the SAME OPENING you've been studying all along: a slow Italian-Vienna squeeze that detonates in the centre.",
      sayShort: 'd4! — after twelve preparing moves, the central break detonates.',
    },
    {
      id: 'f5-arrival',
      moves: M,
      arrows: [{ from: 'f5', to: 'd6', color: ATK }, { from: 'f5', to: 'h6', color: ATK }],
      highlights: [{ square: 'f5', color: KEY }],
      say: "And here is the prize. After d4 exd4 cxd4 the e-file opens, Black's knight scrambles to e6, and White plants the c3-e2-g3 knight on f5 — the immovable outpost Lasker named. From f5 the knight presses d6 and h6, eyes the kingside, and cannot be chased by a pawn. The Classical Vienna's whole plan, twelve quiet moves long, was to reach THIS square. The slow preparation pays in one beautiful piece.",
      sayShort: "Nf5 — the Lasker outpost lands. The whole twelve-move plan was about THIS square.",
    },
    {
      id: 'branch-gambit',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4'],
      highlights: [{ square: 'f4', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Now — Black doesn't have to walk into the slow squeeze. He can avoid the Classical entirely by playing more carefully. So White has a second weapon, the one that gives the opening its violent reputation: f4. Edward Lasker wrote: 'It would seem a good plan to lure that pawn away, and this is rendered feasible by playing P-KB4 when he has a pawn on K4.' That is exactly the Vienna Gambit. White doesn't wait for the centre to crack open — he RIPS it open from the side. A completely different chapter, an entire tab of this masterclass, but it begins from the same Nc3 you've already seen.",
      sayShort: "The Vienna Gambit — Lasker's lure: f4 to rip the centre open. An entire other chapter.",
    },
    {
      id: 'branch-paulsen',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'g3'],
      arrows: [{ from: 'f1', to: 'b5', color: INTENT }],
      highlights: [{ square: 'g2', color: KEY }],
      say: "Or White can refuse fireworks altogether and play 3.g3 — the Paulsen Variation. The bishop fianchettoes to g2, raking the long light diagonal from a corner of the board, and White builds a slow squeeze from a distance. The Paulsen is the modern grandmaster's choice — Carlsen and Caruana play it at the very top level — even though at amateur ranks it's rarely seen. Same Nc3 spine, third completely different personality. The Vienna's whole pitch is right here: one move, three weapons, depending on what Black gives you.",
      sayShort: 'The Paulsen — 3.g3, slow squeeze from a distance. The modern elite\'s choice.',
    },
    {
      id: 'branch-nc6',
      moves: ['e4', 'e5', 'Nc3', 'Nc6'],
      arrows: [{ from: 'c6', to: 'e5', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }],
      say: "And one last branch — Black doesn't have to play …Nf6. At amateur level Black plays 2…Nc6 even more often than 2…Nf6, defending e5 with the knight in the classical Ruy way. White's response can be Bc4 — back into Italian themes — but the historical brilliancies of the Vienna live HERE: the Hamppe-Allgaier, the Hamppe-Muzio, the Pierce and Steinitz gambits. Sacrifice the gambit pawn, sacrifice a knight on f7, sacrifice the right to castle — Steinitz himself walked his king to e2 and won. An entire tab of this masterclass is dedicated to the lines that arise from 2…Nc6.",
      sayShort: '2…Nc6 — Black\'s other reply, the home of the Vienna\'s wildest sacrifices.',
    },
    {
      id: 'close',
      moves: M,
      highlights: [{ square: 'f5', color: SOFT }, { square: 'f7', color: SOFT }],
      say: "And that is the Vienna Game. Not one opening — a flexible launcher. The c3-knight supports e4, keeps the king-knight free, and lets White choose his weapon depending on what Black volunteers. Classical Bc4 against careful play; f4 Gambit against passive play; g3 Paulsen against complications; and against 2…Nc6, an entire arsenal of historical sacrifices. Learn the four weapons in the four tabs that follow, and you don't just know the Vienna. You know how Steinitz thought about chess: the position dictates the plan, not the other way around. Class dismissed.",
      sayShort: 'The Vienna is a flexible launcher — four weapons backed by one knight. Class dismissed.',
    },
  ],
};
