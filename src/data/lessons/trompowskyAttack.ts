import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a): GREEN arrows (vision/intent), YELLOW
// highlights (a key square the narration names), SOFT blue (secondary).
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

// The Trompowsky main line (2...Ne4 3.Bf4) — matches repertoire.json's
// trompowsky-attack.pgn prefix; every ply masters-backed, chess.js FENs.
// d4 Nf6 Bg5 Ne4 Bf4 d5 e3 c5 Bd3 Nf6 c3 Nc6 Nd2 Bg4 Ngf3 e6 O-O Rc8 Qa4 Nd7 Ne5
const M = 'd4 Nf6 Bg5 Ne4 Bf4 d5 e3 c5 Bd3 Nf6 c3 Nc6 Nd2 Bg4 Ngf3 e6 O-O Rc8 Qa4 Nd7 Ne5'.split(' ');

/**
 * The Trompowsky Attack — A Master Class (White). 1.d4 Nf6 2.Bg5: develop the
 * bishop before the knight, dodge every prepared Indian defence, and play for
 * the dark squares and an easy, theory-light game. A MODERN opening, grounded
 * on universal principles (development, the bishop pair, the central outpost)
 * + the DB moves.
 */
export const TROMPOWSKY_ATTACK_LESSON: LessonScript = {
  openingId: 'trompowsky-attack',
  sources: [
    'concept:pos-development',
    'concept:pos-outpost',
    'https://en.wikipedia.org/wiki/Trompowsky_Attack',
  ],
  title: 'Trompowsky Attack — A Master Class',
  minutes: 12,
  orientation: 'white',
  beats: [
    {
      id: 'open',
      moves: ['d4', 'Nf6', 'Bg5'],
      arrows: [{ from: 'g5', to: 'f6', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }],
      say: "1.d4 Nf6 2.Bg5 — the Trompowsky Attack. White develops the bishop BEFORE the king-knight, and that one change of move order tears up Black's entire preparation. There is no Nf3 to allow a King's Indian, no c4 to invite a Nimzo or Grünfeld — just an immediate threat: Bxf6, doubling Black's pawns and handing White the bishop pair. Black must react to the bishop right now, on move two. The Trompowsky is the ultimate sidestep — a sound, low-theory weapon that drags every opponent onto your home ground.",
      sayShort: 'Bg5 — sidestep theory, threaten Bxf6.',
    },
    {
      id: 'ne4-bf4',
      moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4'],
      arrows: [{ from: 'f4', to: 'c7', color: VIS }],
      highlights: [{ square: 'e4', color: KEY }, { square: 'c7', color: SOFT }],
      say: "Black's main reply is Ne4 — leaping the knight forward to hit the bishop and grab a central square, dodging the doubled pawns. White does NOT retreat to h4, where the bishop would sit passively on the rim. He plays Bf4 — the bishop drops to an active diagonal, eyeing c7 and the b8-h2 line, daring the knight to justify its lunge. The whole opening now revolves around whether Black's advanced e4-knight is strong or simply over-extended.",
      sayShort: 'Bf4 — active retreat, eyes c7.',
    },
    {
      id: 'center',
      moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4', 'd5', 'e3', 'c5', 'Bd3', 'Nf6', 'c3', 'Nc6'],
      highlights: [{ square: 'e3', color: SOFT }, { square: 'd5', color: SOFT }],
      say: "Black stakes a classical centre with d5 and c5; White answers with the modest, rock-solid e3 and c3, develops the bishop to d3, and the over-extended knight is chased back to f6. This is the Trompowsky's quiet personality — no early fireworks, just a healthy structure where White's pieces flow to their best squares and Black has to prove his centre is an asset, not a target.",
      sayShort: 'e3, c3, Bd3 — solid and easy.',
    },
    {
      id: 'develop',
      moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'Bf4', 'd5', 'e3', 'c5', 'Bd3', 'Nf6', 'c3', 'Nc6', 'Nd2', 'Bg4', 'Ngf3', 'e6', 'O-O', 'Rc8'],
      highlights: [{ square: 'd2', color: SOFT }, { square: 'f3', color: SOFT }],
      say: "The knights come out behind the pawns — Nd2 and then Ngf3 — and White castles into safety. Black pins with Bg4 and stacks his rook on the half-open c-file, hunting for counterplay against c3 and d4. Everything is developed; the position is balanced and rich. Now White goes looking for the two things the Trompowsky structure offers him: pressure on the queenside and a knight outpost in the centre.",
      sayShort: 'Nd2, Ngf3, O-O — fully mobilised.',
    },
    {
      id: 'outpost',
      moves: M,
      arrows: [{ from: 'a4', to: 'c6', color: VIS }, { from: 'e5', to: 'g4', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'c6', color: KEY }],
      say: "Qa4 swings out, raking the diagonal toward Black's king and pinning the c6-knight to the queenside. Then the move the whole set-up was built for: Ne5! The knight leaps to the central outpost, where it cannot be driven away by a pawn, and from e5 it hits THREE black pieces at once — the c6-knight, the d7-knight, and the g4-bishop. White has emerged from a 'sideline' with the more active pieces, a dominant central knight, and an easy game to play. That is the Trompowsky's promise kept: skip the theory, and still come out on top.",
      sayShort: 'Ne5 — the outpost forks three pieces.',
    },
  ],
};
