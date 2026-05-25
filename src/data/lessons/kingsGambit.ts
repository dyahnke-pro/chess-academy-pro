import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a): GREEN arrows (vision / threat /
// intent), YELLOW highlights (a key square the narration names), SOFT blue
// (secondary context). Orange move-squares are auto-painted by the player.
const VIS = 'rgba(40,185,95,0.92)';
const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

// The Main-line pill spine — the KGA Modern / Abbazia Defence (3...d5),
// walked along the most-played master move at every ply (verified against
// the live masters explorer 2026-05-25):
// e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bc4 Nxd5 O-O Be6 Bb3 Be7 c4 Nb6 d4 Nxc4
// Nc3 Nb6 d5 Bg4 Bxf4 O-O  (matches repertoire.json's kings-gambit.pgn line).
const M = 'e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bc4 Nxd5 O-O Be6 Bb3 Be7 c4 Nb6 d4 Nxc4 Nc3 Nb6 d5 Bg4 Bxf4 O-O'.split(' ');

/**
 * The King's Gambit — A Master Class. The most romantic opening in chess:
 * Greco analysed it in the 1620s, Morphy and Anderssen made it sing in the
 * 1850s, Spassky won brilliancies with it in the 1960s. White offers a pawn
 * on move two to lure Black's e-pawn away, rip open the f-file, and hurl
 * everything at f7. The main-line spine is the Modern Defence (3...d5),
 * where White trades the gambit pawn for a towering centre and the f-file;
 * the branch beats fan out to the holding-the-pawn lines (3...g5 Classical,
 * Fischer's 3...d6), the declines (2...Bc5, 2...d5 Falkbeer), and the
 * sacrificial weapons (Kieseritzky, Muzio, Allgaier). Grounded in the DB
 * spine + the public-domain classics on open lines and rapid development.
 */
export const KINGS_GAMBIT_LESSON: LessonScript = {
  openingId: 'kings-gambit',
  sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  title: "The King's Gambit — A Master Class",
  minutes: 14,
  orientation: 'white',
  beats: [
    {
      id: 'open',
      moves: ['e4', 'e5'],
      highlights: [{ square: 'e4', color: KEY }, { square: 'e5', color: KEY }],
      say: "Welcome to the oldest fight in chess — e4 against e5, the open game, where both players stake a claim in the centre and the pieces come straight out swinging. Greco studied this position in the 1620s; Morphy, Anderssen and Spassky all reached for the same second move here when they wanted to attack. That second move is what this masterclass is about. Most openings now play it safe. The King's Gambit does the opposite.",
      sayShort: '…e5 — the open game, where the gambit begins.',
    },
    {
      id: 'the-gambit',
      moves: ['e4', 'e5', 'f4'],
      highlights: [{ square: 'f4', color: KEY }, { square: 'e5', color: KEY }],
      say: "f4 — the King's Gambit. White offers a pawn on move two. The idea is pure and old: lure the e5-pawn away from the centre with a thrust from the side, and the moment it leaves, the f-file cracks open in front of White's own king. That open file is the whole point. White is not giving away a pawn for nothing — he is trading it for the f-file, a lead in development, and a direct road to Black's softest square, f7.",
      sayShort: 'f4 — sacrifice a pawn, rip open the f-file.',
    },
    {
      id: 'accepted',
      moves: ['e4', 'e5', 'f4', 'exf4'],
      highlights: [{ square: 'f4', color: KEY }, { square: 'f7', color: SOFT }],
      say: "Black accepts — exf4. This is the King's Gambit Accepted, and it is the principled reply: take the pawn, make White prove the compensation. Now the f-file is half-open for White, the e5-square is vacated, and the whole game becomes a race to get at f7. White must develop fast and attack before Black returns the pawn and consolidates. The pawn sitting on f4 is Black's; White will win it back later, on his own terms, once the attack is rolling.",
      sayShort: '…exf4 — accepted; now White races to attack.',
    },
    {
      id: 'knight-out',
      moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3'],
      arrows: [{ from: 'f3', to: 'e5', color: VIS }, { from: 'f3', to: 'g5', color: VIS }],
      highlights: [{ square: 'h4', color: KEY }],
      say: "Nf3 — and this move does three jobs at once. It develops with tempo, it grips the e5- and g5-squares, and above all it pre-empts the one annoying check: …Qh4+. Without the knight on f3 Black could throw in Qh4+ and disrupt White's castling. With it, the knight covers h4 and the check is gone. This is the classical King's Knight Gambit — the main road, and the starting point for almost every line in this class.",
      sayShort: 'Nf3 — develops, grips e5, kills the Qh4+ check.',
    },
    {
      id: 'the-modern',
      moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd5'],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e4', color: KEY }],
      say: "Now the main-line reply this masterclass showcases: d5 — the Modern Defence, sometimes called the Abbazia. Instead of clinging to the extra pawn with …g5, Black hits back in the centre, returning the gambit pawn at once to break White's grip on e4 and free his own pieces. It is the soundest, most modern way to meet the King's Gambit — and it leads to the kind of fight White actually wants: open, central, and rich in piece play.",
      sayShort: '…d5 — the Modern: hand the pawn back.',
    },
    {
      id: 'recapture',
      moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd5', 'exd5', 'Nf6'],
      arrows: [{ from: 'f6', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say: "White takes — exd5 — and Black, rather than recapturing the pawn immediately, develops with Nf6, eyeing the d5-pawn and the centre. This is the modern subtlety: Black is in no hurry to grab on d5 because the pawn isn't running anywhere. He gets a piece out first. White, meanwhile, has a passed pawn on d5 and the half-open f-file — the gambit pawn has come back, and the position is dynamically balanced.",
      sayShort: '…Nf6 — develop first, the d5-pawn waits.',
    },
    {
      id: 'italian-bishop',
      moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd5', 'exd5', 'Nf6', 'Bc4'],
      arrows: [{ from: 'c4', to: 'd5', color: ATK }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'f7', color: SOFT }],
      say: "Bc4 — the Italian bishop, the same piece you know from the Italian Game and the Vienna. From c4 it props the passed d5-pawn and trains on the long light diagonal that runs on to f7, the softest square in front of Black's king. This bishop is the soul of the King's Gambit attack: every sacrifice on f7 in this opening, from the Muzio to the Allgaier, is powered by a bishop sitting exactly here.",
      sayShort: 'Bc4 — the Italian bishop, boring at f7.',
    },
    {
      id: 'castle',
      moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd5', 'exd5', 'Nf6', 'Bc4', 'Nxd5', 'O-O'],
      highlights: [{ square: 'f1', color: KEY }, { square: 'f4', color: KEY }, { square: 'f7', color: SOFT }],
      say: "Black finally collects the pawn — Nxd5 — and White castles. Watch what castling does here: the rook lands on f1, directly behind the half-open f-file, ready to bear down it toward f7 the moment the knight on f3 steps aside. This is the King's Gambit dream realised in a single move. The king tucks into the corner, and the rook takes over the file the gambit was played to open. Black's extra pawn on f4 is now a target sitting on White's most dangerous file.",
      sayShort: 'O-O — the rook seizes the f-file behind f4.',
    },
    {
      id: 'bishops-face-off',
      moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd5', 'exd5', 'Nf6', 'Bc4', 'Nxd5', 'O-O', 'Be6', 'Bb3'],
      arrows: [{ from: 'b3', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'f7', color: SOFT }],
      say: "Black develops with Be6, offering to trade off White's dangerous attacking bishop. White slides back to b3 — refusing the trade, keeping the bishop on the long diagonal one square back, exactly the way the Vienna and the Ruy reroute this same bishop. From b3 it eyes the knight on d5 and stays trained on the route to f7. The retreat loses no aim at all.",
      sayShort: 'Bb3 — dodge the trade, keep the diagonal.',
    },
    {
      id: 'space-grab',
      moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd5', 'exd5', 'Nf6', 'Bc4', 'Nxd5', 'O-O', 'Be6', 'Bb3', 'Be7', 'c4', 'Nb6'],
      highlights: [{ square: 'c4', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Be7 finishes Black's kingside, and now White expands: c4. The pawn gains space and kicks the knight on d5 back to b6, gaining a tempo. But c4 is doing something bigger than chasing a knight — it is the first brick of a broad d4 centre. White is about to convert the open, gambit-style position into something Black dreads even more: a King's Gambit player with a massive centre.",
      sayShort: 'c4 — gain space, build the broad centre.',
    },
    {
      id: 'the-big-centre',
      moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd5', 'exd5', 'Nf6', 'Bc4', 'Nxd5', 'O-O', 'Be6', 'Bb3', 'Be7', 'c4', 'Nb6', 'd4'],
      highlights: [{ square: 'd4', color: KEY }, { square: 'c4', color: KEY }],
      say: "d4 — and there it is. The pawn White held in reserve storms to d4, and now White has pawns on c4 and d4 commanding the centre, a bishop raking e6 and f7, a rook on the f-file, and a king safely castled. This is the payoff of the Modern main line: White has handed back the gambit pawn and received, in exchange, a position with more space, more activity, and more targets. The romantic gambit has become a positional bind.",
      sayShort: 'd4 — the broad centre; gambit becomes bind.',
    },
    {
      id: 'recover-pawn',
      moves: M,
      arrows: [{ from: 'f4', to: 'h6', color: ATK }],
      highlights: [{ square: 'f4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "The play flows: Nxc4 Nc3 Nb6 d5 — the centre rolls forward and clamps the position — Bg4 hits nothing for long, and White rounds it off with Bxf4, finally scooping the gambit pawn back with the bishop landing on a wide-open diagonal. Count the score: material is level, but White's bishop now sweeps the c1-h6 diagonal toward Black's king, the rook stands behind the f-file, the pawns own the centre, and Black is still untangling. The King's Gambit promised an attack for a pawn; the Modern main line delivers a lasting initiative for nothing.",
      sayShort: 'Bxf4 — pawn recovered, initiative kept for free.',
    },
    {
      id: 'branch-classical',
      moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5'],
      arrows: [{ from: 'f3', to: 'g5', color: VIS }],
      highlights: [{ square: 'g5', color: KEY }, { square: 'f4', color: SOFT }],
      say: "But Black doesn't have to hand the pawn back. The old, greedy, fighting move is g5 — Black builds a pawn chain to guard f4 and dares White to break it. This is the Classical King's Gambit, and it is where the opening earns its violent reputation. White answers with h4, prying at the g5-pawn, and the game can explode into the Kieseritzky, the Muzio, or the Allgaier — three of the most famous sacrifices in chess, each its own tab in this class.",
      sayShort: '…g5 — hold the pawn; the sacrifices begin.',
    },
    {
      id: 'branch-fischer',
      moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd6'],
      highlights: [{ square: 'd6', color: KEY }, { square: 'g5', color: SOFT }],
      say: "Or Black plays the cool, modern antidote: d6 — Fischer's Defence. Bobby Fischer, after losing to the King's Gambit, wrote a famous article claiming to have busted it, and 3…d6 was his recommendation. The point is quiet and deep: Black prepares …g5 to hold the pawn, but first takes the f7-tricks off the table by covering e5 and shutting the door on the bishop crashing in. It is the most respected way to keep the extra pawn, and it gets its own full tab.",
      sayShort: '…d6 — Fischer’s cool antidote, holds the pawn safely.',
    },
    {
      id: 'branch-declined',
      moves: ['e4', 'e5', 'f4', 'Bc5'],
      arrows: [{ from: 'c5', to: 'g1', color: ATK }],
      highlights: [{ square: 'g1', color: KEY }, { square: 'f4', color: SOFT }],
      say: "Black can also simply decline. Bc5 — the Classical Declined — develops a piece, plants the bishop on the a7-g1 diagonal aimed straight at White's castling square, and keeps the …Qh4+ check alive because White can no longer comfortably play g3. White builds a centre with c3 and d4 instead and plays for the f4-f5 break. And the sharpest decline of all, 2…d5, the Falkbeer Counter-Gambit, throws a pawn straight back at White — its own tab follows too.",
      sayShort: '…Bc5 — declining; the bishop hits the castling square.',
    },
    {
      id: 'close',
      moves: M,
      highlights: [{ square: 'f7', color: SOFT }, { square: 'f4', color: SOFT }, { square: 'd4', color: SOFT }],
      say: "And that is the King's Gambit. One bold second move, f4, and a whole world opens up. Against the Modern main line you trade the pawn for a towering d4 centre, the f-file, and a bishop boring at f7. Against the greedy …g5 you sacrifice pieces in the Kieseritzky, Muzio and Allgaier to hunt the king. Against Fischer's …d6 you fight a patient pawn-storm; against the declines you build and break. Every tab in this masterclass is a different answer to the same question Black asks on move two — do you dare take the pawn? Learn them, and you'll understand why, for three hundred years, the King's Gambit has been the way chess players say: I came here to attack.",
      sayShort: 'One pawn offered, a dozen weapons earned.',
    },
  ],
};
