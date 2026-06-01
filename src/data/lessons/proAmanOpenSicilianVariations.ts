import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Open Sicilian variation lessons. Real spines.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:sicilian',
  'concept:pos-development',
  'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_OPEN_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  // ── vs Najdorf main tab ──
  'pro-aman-open-sicilian::vs Najdorf (…a6)': {
    openingId: 'pro-aman-open-sicilian',
    title: 'Open Sicilian vs Najdorf — Be2 and the d5-Square',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'be2', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2', arrows: [A('f1', 'e2')], highlights: [H('e2')],
        say: "Against the Najdorf …a6, the solid Be2 prepares quick castling and a healthy, low-risk game — sound development over sharp theory.",
        sayShort: 'Be2 — solid setup.' }),
      b({ id: 'nb3', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3', arrows: [A('d4', 'b3')], highlights: [H('d5')],
        say: "When Black grabs space with …e5, White retreats Nb3 and targets the hole on d5 that …e5 left behind. White's plan crystallises: control d5, press the backward d6-pawn.",
        sayShort: 'Nb3 — target d5.' }),
      b({ id: 'be3', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6', highlights: [H('e6'), H('d5')],
        say: "Both castle and the bishops contest d5 from e3 and e6. White is fully developed with the king safe and the battle squarely on White's favourite square.",
        sayShort: 'Be3 — fight for d5.' }),
      b({ id: 'middlegame', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Nd5 Nbd7 Qd3', arrows: [A('c3', 'd5')], highlights: [H('d5')],
        say: "White lands the knight on the dominant d5-outpost. Even after trades, a pawn recaptures on d5 to clamp the centre, and the long-term light-square pressure gives White a pleasant, lasting edge.",
        sayShort: 'Nd5 — the outpost.' }),
    ],
  },

  // ── vs Classical (…Nc6, Richter-Rauzer) ──
  'pro-aman-open-sicilian::vs Classical (…Nc6)': {
    openingId: 'pro-aman-open-sicilian',
    title: 'Richter-Rauzer — Bg5 and Long Castling',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'bg5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Bg5', arrows: [A('c1', 'g5')], highlights: [H('g5')],
        say: "Against …Nc6, the Richter-Rauzer Bg5 pins the f6-knight and prepares queenside castling with a kingside pawn storm to come. The most aggressive Open Sicilian try.",
        sayShort: 'Bg5 — pin, prepare O-O-O.' }),
      b({ id: 'castle', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Bg5 e6 Qd2 a6 O-O-O', highlights: [H('c1')],
        say: "Qd2 connects the queen to the bishop and supports long castling. With opposite-side castling looming, both kings will be attacked — and White moves first.",
        sayShort: 'O-O-O — opposite-side battle.' }),
      b({ id: 'f3', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Bg5 e6 Qd2 a6 O-O-O Bd7 f3 Be7 h4', highlights: [H('h4')],
        say: "f3 secures e4 and h4 begins the kingside pawn storm — the thematic Rauzer plan. White throws the h- and g-pawns at Black's king while the centre stays locked.",
        sayShort: 'h4 — launch the storm.' }),
      b({ id: 'middlegame', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Bg5 e6 Qd2 a6 O-O-O Bd7 f3 Be7 h4 h6 Be3 h5 Kb1', highlights: [H('g4'), H('b1'), H('h5')],
        say: "Black tries to slow the storm with …h6 and …h5, but White tucks the king to b1 and keeps the initiative. White has the safer king, the attacking pawns, and the clear plan of g4 to crack open the kingside. A sharp, double-edged middlegame where White holds the trumps.",
        sayShort: 'Kb1 — safe, keep attacking.' }),
    ],
  },

  // ── vs Dragon (…g6) — Yugoslav Attack ──
  'pro-aman-open-sicilian::vs Dragon (…g6)': {
    openingId: 'pro-aman-open-sicilian',
    title: 'Yugoslav Attack — Castle Long, Storm the Dragon',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'be3', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3', arrows: [A('c1', 'e3')], highlights: [H('e3'), H('f3')],
        say: "Against the Dragon fianchetto, the Yugoslav Attack is the critical test: Be3 and f3 build a wall around e4 and prepare Qd2 and queenside castling. White sets up to throw the h-pawn at the fianchettoed king.",
        sayShort: 'f3 — build the Yugoslav wall.' }),
      b({ id: 'castle', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 O-O-O', highlights: [H('c1')],
        say: "Qd2 connects to the dark-squared bishop and supports O-O-O. With kings on opposite wings, it's a race — and the Yugoslav gives White's attack a head start against the slightly airy Dragon king.",
        sayShort: 'O-O-O — opposite-wing race.' }),
      b({ id: 'd5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 O-O-O d5 Qe1', highlights: [H('d5'), H('e1')],
        say: "Black strikes the thematic …d5 counter in the centre; White sidesteps with Qe1, keeping the structure intact and the attacking chances alive. Meeting the centre break without panicking is the key Yugoslav skill.",
        sayShort: 'Qe1 — sidestep the …d5 break.' }),
      b({ id: 'middlegame', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 O-O-O d5 Qe1 e5 Nxc6 bxc6', arrows: [A('d4', 'c6')], highlights: [H('c6')],
        say: "White trades on c6 to damage Black's structure, leaving the doubled, weak c-pawns as a long-term target. With the centre clarified, White has the safer king behind the pawn wall and the clear plan of the h-pawn storm against the Dragon. A sharp middlegame where White's attack arrives first.",
        sayShort: 'Nxc6 — weaken, then storm.' }),
    ],
  },
};
