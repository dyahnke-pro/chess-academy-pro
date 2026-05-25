import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a): GREEN arrows (vision / intent), YELLOW
// highlights (a key square the narration names), SOFT BLUE (secondary context).
// Orange move-squares are auto-painted by the LessonPlayer — don't author them.
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

// The Exchange QGD spine — the "Main line" pill's PGN (matches
// repertoire.json's queens-gambit.pgn): the Carlsbad structure, where White's
// minority attack is the whole point.
// d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Nf3 Re8 Qc2 c6 O-O Nf8 Bf4 Bg4
const M = 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Nf3 Re8 Qc2 c6 O-O Nf8 Bf4 Bg4'.split(' ');

/**
 * The Queen's Gambit — A Master Class. Story-first: the lecture is the spine.
 * The QG's pitch is that the "gambit" is a feint — White rarely loses the
 * pawn for nothing; the real prize is a lead in development and a pawn lever
 * (c4 against d5) that pries open the centre on White's terms. The main line
 * teaches the Exchange Variation's Carlsbad structure and its signature plan:
 * the queenside minority attack. Grounded in the classical understanding
 * (Capablanca's Carlsbad games are the canon) + the concept corpus
 * (minority attack, development, the pawn chain).
 */
export const QUEENS_GAMBIT_LESSON: LessonScript = {
  openingId: 'queens-gambit',
  sources: [
    'concept:pawn-minority-attack',
    'concept:pos-development',
    'concept:pawn-chain',
    'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined',
  ],
  title: "The Queen's Gambit — A Master Class",
  minutes: 13,
  orientation: 'white',
  beats: [
    {
      id: 'open',
      moves: M.slice(0, 2), // d4 d5
      highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: KEY }],
      say: "Welcome. The Queen's Gambit is the oldest respected opening in chess and still the backbone of elite repertoires — Capablanca, Botvinnik, Kasparov, Carlsen all leaned on it. We begin in the centre, but not the king's pawn centre you may be used to: d4 meets d5, two queen-pawns locking horns. This is a slower, more strategic fight than 1.e4 — the battle is about pawn structure and the d5-square, and it rewards the player who understands plans over tricks.",
      sayShort: 'd4 d5 — the queen-pawn centre.',
    },
    {
      id: 'the-gambit',
      moves: M.slice(0, 3), // c4
      arrows: [{ from: 'c4', to: 'd5', color: VIS }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Here is the gambit: c4, offering a pawn. But it's a gambit in name more than deed. White isn't sacrificing material for an attack — he's using the c4-pawn as a lever against d5. If Black grabs it, White wins the time back and seizes the centre; if Black holds the centre with a pawn, White gets a lasting structural pull. The whole opening turns on this one lever — c4 leaning on d5 is the engine of everything that follows.",
      sayShort: 'c4 — the lever against d5, not a real sacrifice.',
    },
    {
      id: 'declined',
      moves: M.slice(0, 4), // e6
      highlights: [{ square: 'e6', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Black declines with e6 — the Queen's Gambit Declined, the most solid answer in the opening. The e6-pawn props up d5 so the centre holds firm. There's a price, though, and it's the theme of Black's whole game: that little e6-pawn locks in the c8-bishop, Black's problem piece. Freeing it later — usually after a trade on d5 or a careful …b6 and …Bb7 — is a task Black carries the entire middlegame.",
      sayShort: '…e6 — solid, but the c8-bishop is jailed.',
    },
    {
      id: 'central-knights',
      moves: M.slice(0, 6), // Nc3 Nf6
      arrows: [{ from: 'c3', to: 'd5', color: VIS }, { from: 'f6', to: 'd5', color: SOFT }],
      highlights: [{ square: 'd5', color: KEY }],
      say: "Both sides bring out a knight, and both knights point at the same square: d5. White's Nc3 adds a second attacker to d5; Black's Nf6 adds a second defender. This is the quiet truth of the Queen's Gambit — the d5-square is the contested ground, and most of the manoeuvring is about who controls it. Develop with purpose: every piece in this opening has a relationship to d5.",
      sayShort: 'Nc3, …Nf6 — the fight is all about d5.',
    },
    {
      id: 'the-exchange',
      moves: M.slice(0, 8), // cxd5 exd5
      arrows: [{ from: 'b2', to: 'b5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "Now the defining choice of our main line: White takes — cxd5 — and Black must recapture with the e-pawn, exd5. This is the Exchange Variation, and it hands us the Carlsbad pawn structure, the most instructive structure in all of chess. Look at the queenside: White has pawns on a2 and b2 against Black's a7, b7 and c6-to-be — a pawn minority. That minority is not a weakness; it is a weapon. White's plan writes itself: push a2-a4 and b2-b4-b5, trade on c6, and saddle Black with a permanent weak pawn to besiege. This is the minority attack.",
      sayShort: 'cxd5 exd5 — Carlsbad structure, minority attack looms.',
    },
    {
      id: 'the-pin',
      moves: M.slice(0, 10), // Bg5 Be7
      arrows: [{ from: 'g5', to: 'f6', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }],
      say: "Bg5 pins the f6-knight against Black's queen and leans on d5 a third time — classic Queen's Gambit pressure. Black calmly breaks the pin with Be7, offering to trade the dark bishops if White wants. Notice White is in no rush to take: the bishop on g5 is doing useful work, eyeing f6 and the d5-square behind it. Develop the pieces that pressure d5 first; the pawn storm comes later.",
      sayShort: 'Bg5, …Be7 — pin and quiet unpin.',
    },
    {
      id: 'solid-setup',
      moves: M.slice(0, 12), // e3 O-O
      highlights: [{ square: 'e3', color: SOFT }, { square: 'g8', color: SOFT }],
      say: "e3 — modest, but exactly right. It opens the f1-bishop and gives the d4-pawn a granite support; White is in no hurry because his structure is better and time is on his side. Black tucks the king away with castling. There are no fireworks here, and that's the lesson: in the Carlsbad, the better-structured side improves slowly and the worse-structured side waits. Patience is the Queen's Gambit virtue.",
      sayShort: 'e3 and …O-O — slow, sound, structural.',
    },
    {
      id: 'the-diagonal',
      moves: M.slice(0, 14), // Bd3 Nbd7
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'h7', color: KEY }],
      say: "Bd3 places the light bishop on the b1-h7 diagonal, aiming at h7 — the seed of a kingside idea that balances the queenside minority attack. White can play on BOTH wings, and that double threat is what stretches Black. Black develops the queen's knight to d7, deliberately not c6: keeping c6 free preserves the pawn there and gives the knight a route to f8 and g6, guarding the kingside White is starting to eye.",
      sayShort: 'Bd3 eyes h7; …Nbd7 keeps c6 free.',
    },
    {
      id: 'develop',
      moves: M.slice(0, 16), // Nf3 Re8
      highlights: [{ square: 'e8', color: SOFT }],
      say: "Nf3 completes White's minor-piece development — every piece is out, the king is about to be safe, and not a single move has been wasted. That is the Queen's Gambit dividend: the small lead in time and the better structure, banked. Black's Re8 takes the half-open e-file and prepares to contest the centre with the rook behind it. Both sides are now fully mobilised; the strategic battle begins.",
      sayShort: 'Nf3 finishes development; …Re8 takes the e-file.',
    },
    {
      id: 'the-battery',
      moves: M.slice(0, 18), // Qc2 c6
      arrows: [{ from: 'c2', to: 'h7', color: VIS }],
      highlights: [{ square: 'h7', color: KEY }, { square: 'c6', color: SOFT }],
      say: "Qc2 lines the queen up behind the d3-bishop — a battery on the b1-h7 diagonal pointed straight at h7, the standard Carlsbad attacking gesture. Black answers c6, the move the whole structure has been building toward: it cements d5 into a rock. But it also commits the pawn to c6 — exactly the square White's minority attack wants to hit with b4-b5. Both plans are now on the board, racing in opposite directions.",
      sayShort: 'Qc2 battery at h7; …c6 cements d5 (and invites b5).',
    },
    {
      id: 'castle-regroup',
      moves: M.slice(0, 20), // O-O Nf8
      arrows: [{ from: 'f8', to: 'g6', color: VIS }],
      highlights: [{ square: 'f8', color: KEY }, { square: 'h7', color: SOFT }],
      say: "White castles — king safe, plan intact. Black plays the most instructive regrouping move in the Carlsbad: Nf8. The knight that sat on d7 reroutes toward g6, where it shores up the kingside against White's Qc2-Bd3 battery and frees Black's other pieces. This is the Carlsbad in miniature — White prepares a queenside pawn storm while Black calmly reinforces the kingside. Two plans, two wings, one tense board.",
      sayShort: '…Nf8 reroutes to g6, guarding the kingside.',
    },
    {
      id: 'redeploy',
      moves: M.slice(0, 22), // Bf4 Bg4
      arrows: [{ from: 'f4', to: 'b8', color: VIS }, { from: 'g4', to: 'f3', color: SOFT }],
      highlights: [{ square: 'f4', color: KEY }],
      say: "With the f6-knight no longer pinnable to good effect, White redeploys Bg5-f4, where the bishop rakes the b8-h2 diagonal and keeps an eye on the queenside dark squares the minority attack will open. Black finally solves his oldest problem: the light-squared bishop, jailed since move three by e6, slips out to g4 and leans on the f3-knight. Both armies are fully unwound now — and the position is the model Carlsbad we set out to reach.",
      sayShort: 'Bf4 redeploys; …Bg4 frees the bad bishop at last.',
    },
    {
      id: 'the-plan',
      moves: M.slice(0, 22),
      arrows: [{ from: 'a2', to: 'a4', color: VIS }, { from: 'b2', to: 'b4', color: VIS }],
      highlights: [{ square: 'b5', color: KEY }, { square: 'c6', color: KEY }],
      say: "Here is the whole opening in one picture. White's path: a4, b4, b5 — push the pawn minority into Black's c6 and trade, leaving Black a chronically weak pawn on c6 or an isolated one on d5 to besiege for the rest of the game. Black's path: counterplay on the kingside and in the centre with …Ne4 or a timely …Ng6 and piece pressure, racing before the queenside cracks. Master this structure and you've mastered a third of all closed openings — the Carlsbad reappears everywhere. That is the Queen's Gambit's real gift: not a trap, but an understanding.",
      sayShort: 'a4-b4-b5 vs c6 — the minority attack decides it.',
    },
  ],
};
