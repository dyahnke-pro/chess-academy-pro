import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Pro Naroditsky Alekhine — variation lessons for his 2,830-game
// Alekhine's Defense as Black. The most provocative defense in
// chess: 1...Nf6 attacking the e4-pawn from move one.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const SRC = [
  'https://www.chess.com/openings/Alekhines-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// ============================================================
// Nc3 Two Knights — 839g 68.9%
// White declines the chase with Nc3 — transposes to a Petroff-style
// game. Black gets a tempo from Nc6 / Bb4 development.
// ============================================================
const NC3_TWO_KNIGHTS: LessonScript = {
  openingId: 'pro-naroditsky-alekhine',
  title: 'Nc3 Two Knights — Petroff-style transposition',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'tk-open', moves: 'e4 Nf6 Nc3',
      highlights: [{ square: 'c3', color: KEY }],
      say: "Nc3 — White refuses to chase our knight with e5, developing instead. The position transposes toward a Vienna or Two Knights structure. We're happy: Black already has the …Nf6 developed and the rest follows classically.",
      sayShort: 'Nc3 — refused chase.',
    }),
    b({
      id: 'tk-e5', moves: 'e4 Nf6 Nc3 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "…e5 — Black claims the centre. The position now resembles a Vienna Game where Black has been freed of any unusual move-order obligations. The Nf6 + e5 + Nc6 development is straightforward.",
      sayShort: '…e5 — claim centre.',
    }),
    b({
      id: 'tk-nf3', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "Nf3 …Nc6 — classical development for both sides. We've reached a position that's a Four Knights game with one specific difference: White is fully committed to a normal opening, and our Alekhine never developed its punching power.",
      sayShort: '…Nc6 — Four Knights game.',
    }),
    b({
      id: 'tk-bb5', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6 Bb5 Bb4',
      highlights: [{ square: 'b5', color: SOFT }, { square: 'b4', color: KEY }],
      say: "Bb5 …Bb4 — both sides pin each other's knights. The symmetric setup is fine for Black: we get the same plans as White, with a tempo less but no structural concerns.",
      sayShort: '…Bb4 — symmetric pin.',
    }),
    b({
      id: 'tk-castle', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6 Bb5 Bb4 O-O O-O',
      highlights: [{ square: 'g8', color: KEY }],
      say: "O-O O-O — both castle. The position is symmetric, balanced, and quiet. Black's structure is fine, the pieces are coordinated, and the middlegame will be decided by small tactical opportunities. The Alekhine 'provocation' transposed into solid normalcy.",
      sayShort: 'O-O — both safe.',
    }),
  ],
};

// ============================================================
// c4 Modern Main — 290g 72.1%
// The Modern Mainline with c4 chasing the knight. We retreat to Nb6,
// recapture with the e-pawn, and reach a healthy structure.
// ============================================================
const C4_MODERN: LessonScript = {
  openingId: 'pro-naroditsky-alekhine',
  title: 'c4 Modern Main — Nb6 retreat + recapture',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'c4-open', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4',
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "After the standard chase (e5 Nd5 d4 d6), White plays c4 attacking our knight. The c4 is the modern mainline; it forces the knight to declare. We retreat to b6 keeping the knight alive and well-placed.",
      sayShort: 'c4 — chase the knight.',
    }),
    b({
      id: 'c4-nb6', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6',
      highlights: [{ square: 'b6', color: KEY }],
      say: "…Nb6 — knight to the rim with a purpose. From b6 the knight eyes c4 (attacking the pawn) and a4 (defending against the bishop). The position is also flexible: the knight can later reroute via Nc8 or N6d7 depending on what White does.",
      sayShort: '…Nb6 — attack c4.',
    }),
    b({
      id: 'c4-exd6', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6',
      highlights: [{ square: 'd6', color: KEY }],
      say: "exd6 — White trades pawns, opening the e-file. The trade is forced (otherwise dxe5 favours us). Now we have a choice: recapture with the e-pawn (opens our development) or the c-pawn (supports …d5 ideas).",
      sayShort: 'exd6 — pawn trade.',
    }),
    b({
      id: 'c4-recapture', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6',
      highlights: [{ square: 'e8', color: SOFT }, { square: 'd6', color: KEY }],
      say: "…exd6 — we recapture with the e-pawn. The d6 pawn is now central, the e-file is half-open for our rook, and our pieces have natural squares for development. The structure is healthy.",
      sayShort: '…exd6 — open e-file.',
    }),
    b({
      id: 'c4-nc3', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nc3 Nc6',
      highlights: [{ square: 'c3', color: SOFT }, { square: 'c6', color: KEY }],
      say: "Nc3 …Nc6 — both knights develop. White's setup is broad (c4 + d4) but we have classical development without structural issues. The position resembles an Isolated Queen Pawn from White's side with the additional c4-pawn supporting d5.",
      sayShort: '…Nc6 — develop.',
    }),
    b({
      id: 'c4-be7', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nc3 Nc6 Be3 Be7 Nf3 O-O',
      highlights: [{ square: 'g8', color: KEY }],
      say: "Be3 …Be7 Nf3 …O-O — both complete development. The position is positional: White has central space, Black has piece coordination and the better long-term structure. Long game, our pieces win.",
      sayShort: 'O-O — complete setup.',
    }),
  ],
};

// ============================================================
// Nf3 / Modern Quiet — 291g 70.3%
// White plays Nf3 instead of c4. We develop our pieces classically.
// ============================================================
const NF3_QUIET: LessonScript = {
  openingId: 'pro-naroditsky-alekhine',
  title: 'Nf3 / Modern Quiet — classical Bf5 setup',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'nf3-open', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3',
      highlights: [{ square: 'f3', color: KEY }],
      say: "Nf3 — White develops calmly without c4. The system is more flexible: White can choose Be2, Bc4, or Bd3 later depending on what we do. We respond with the classical Nb6 + Bf5 development that defines the Modern Alekhine.",
      sayShort: 'Nf3 — quiet system.',
    }),
    b({
      id: 'nf3-nb6', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6',
      highlights: [{ square: 'b6', color: KEY }],
      say: "…Nb6 — preventive retreat. Even without c4, the knight on b6 has a better future than d5 (where it can be attacked). The Nb6 also clears the d-file for the queen.",
      sayShort: '…Nb6 — preemptive retreat.',
    }),
    b({
      id: 'nf3-be2', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 Be2',
      highlights: [{ square: 'e2', color: KEY }],
      say: "Be2 — White's quiet development. The bishop on e2 doesn't pin or attack; it just develops. White accepts the symmetric central position and plays for a slow positional game.",
      sayShort: 'Be2 — quiet development.',
    }),
    b({
      id: 'nf3-bf5', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 Be2 Bf5',
      highlights: [{ square: 'f5', color: KEY }],
      say: "…Bf5! Our light-square bishop comes out actively. Unlike the Caro-Kann or Slav where the c8-bishop is hard to develop, the Alekhine's Bf5 is natural and pressures White's structure immediately.",
      sayShort: '…Bf5 — active bishop.',
    }),
    b({
      id: 'nf3-castle', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 Be2 Bf5 O-O e6',
      highlights: [{ square: 'g1', color: SOFT }, { square: 'e6', color: KEY }],
      say: "O-O …e6 — White castles, we play e6 supporting d5 and preparing …Be7 + …Nc6 + O-O. The setup is classical and harmonious.",
      sayShort: '…e6 — support d5.',
    }),
    b({
      id: 'nf3-develop', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 Be2 Bf5 O-O e6 c4 Nc6',
      highlights: [{ square: 'c4', color: SOFT }, { square: 'c6', color: KEY }],
      say: "c4 …Nc6 — White finally pushes c4, we develop the knight to c6. From here we can play …Be7 + O-O completing development, then break with …f6 or …d5. The Modern Alekhine has converted its provocation into a classical game.",
      sayShort: '…Nc6 — classical development.',
    }),
  ],
};

export const PRO_NARODITSKY_ALEKHINE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-alekhine::Nc3 Two Knights': NC3_TWO_KNIGHTS,
  'pro-naroditsky-alekhine::c4 Modern Main': C4_MODERN,
  'pro-naroditsky-alekhine::Nf3 / Modern Quiet': NF3_QUIET,
};
