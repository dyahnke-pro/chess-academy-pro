import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Rossolimo / Moscow variation lessons.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:sicilian-rossolimo',
  'concept:pos-development',
  'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_ROSSOLIMO_VARIATION_LESSONS: Record<string, LessonScript> = {
  // ── vs …g6 main tab ──
  'pro-aman-rossolimo::vs …g6 (Bxc6)': {
    openingId: 'pro-aman-rossolimo',
    title: 'Rossolimo vs …g6 — Double the Pawns, Clamp the Centre',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'bxc6', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 Re1', arrows: [A('b5', 'c6')], highlights: [H('e5'), H('c6')],
        say: "Against the fianchetto, Bxc6 doubles Black's pawns and damages the structure behind the Dragon bishop. White castles and plays Re1, readying the e5 break.",
        sayShort: 'Bxc6 — double the pawns.' }),
      b({ id: 'e5', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 Re1 Nf6 e5 Nd5 c4', highlights: [H('e5'), H('d5')],
        say: "e5 grabs space and kicks the knight; c4 challenges it with tempo, clamping the centre and blunting the g7-bishop. White's pawn majority does the cramping.",
        sayShort: 'e5, c4 — clamp.' }),
      b({ id: 'd4', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 Re1 Nf6 e5 Nd5 c4 Nc7 d4', arrows: [A('d2', 'd4')], highlights: [H('d4')],
        say: "The knight retreats and d4 completes the big centre. White has more space, the better structure, and the e5-pawn shutting the Dragon bishop out.",
        sayShort: 'd4 — complete the centre.' }),
      b({ id: 'middlegame', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 Re1 Nf6 e5 Nd5 c4 Nc7 d4 cxd4 Qxd4', arrows: [A('d1', 'd4')], highlights: [H('d4')],
        say: "Qxd4 centralises the queen on the dominant square. White has the ideal Rossolimo middlegame: a space edge, Black's doubled c-pawns as a target, and the cramping e5-pawn. A clean, lasting structural squeeze.",
        sayShort: 'Qxd4 — centralise, squeeze.' }),
    ],
  },

  // ── vs …e6 ──
  'pro-aman-rossolimo::vs …e6': {
    openingId: 'pro-aman-rossolimo',
    title: 'Rossolimo vs …e6 — Classical Centre',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'oo', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1', highlights: [H('c3'), H('d4'), H('e1')],
        say: "Against …e6, White castles and develops naturally; the bishop on b5 keeps its pressure while White prepares a healthy classical centre with c3 and d4.",
        sayShort: 'O-O — natural development.' }),
      b({ id: 'bf1', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1', arrows: [A('b5', 'f1')], highlights: [H('f1')],
        say: "When Black questions the bishop with …a6, it retreats to f1 — keeping the bishop pair and re-routing it toward a better diagonal, the modern way to handle the Anti-Sicilian.",
        sayShort: 'Bf1 — keep the bishop pair.' }),
      b({ id: 'd4', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4', highlights: [H('d4')],
        say: "Black breaks with …d5; White trades and plays d4, opening the centre with a comfortable lead in development and the bishop pair in hand.",
        sayShort: 'd4 — open with development lead.' }),
      b({ id: 'middlegame', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4 Nf6 Be3 Be7 c4 O-O Nc3 cxd4 Nxd4', arrows: [A('b1', 'c3')], highlights: [H('d4')],
        say: "White expands with c4, develops Nc3 and recaptures on d4, reaching an open middlegame with the bishop pair and a small space edge. The pieces are harmonious, the structure sound, and White has the easy long-term plan against Black's slightly passive setup.",
        sayShort: 'Nxd4 — bishop pair, small edge.' }),
    ],
  },

  // ── Moscow vs …d6 (Bb5+) ──
  'pro-aman-rossolimo::Moscow vs …d6': {
    openingId: 'pro-aman-rossolimo',
    title: 'Moscow Variation — Bb5+ and a Quiet Squeeze',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'bb5', moves: 'e4 c5 Nf3 d6 Bb5+', arrows: [A('f1', 'b5')], highlights: [H('b5')],
        say: "Against …d6, the Moscow Bb5-check is the Anti-Sicilian cousin of the Rossolimo. It forces Black to commit a blocker and steers the game into quiet, structural channels White understands well.",
        sayShort: 'Bb5+ — force a commitment.' }),
      b({ id: 'c3', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 c3 Nf6 Qe2', highlights: [H('d4'), H('c3')],
        say: "Black blocks with …Nd7; White plays c3 to prepare d4 and Qe2 to keep the bishop's options. A flexible, low-risk build-up aiming for a small, durable centre.",
        sayShort: 'c3 — prepare d4.' }),
      b({ id: 'ba4', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 c3 Nf6 Qe2 a6 Ba4 b5 Bc2', arrows: [A('a4', 'c2')], highlights: [H('c2')],
        say: "When chased with …a6 and …b5, the bishop reroutes Ba4-Bc2 — the same Spanish manoeuvre as the Ruy, landing on a fine diagonal aimed at Black's kingside.",
        sayShort: 'Bc2 — the Spanish reroute.' }),
      b({ id: 'middlegame', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 c3 Nf6 Qe2 a6 Ba4 b5 Bc2 Bb7 O-O g6 d4 Bg7 Rd1', highlights: [H('d4'), H('d1')],
        say: "Both sides complete development and White plays d4, reaching the centre on White's terms with the rook eyeing the d-file. White has a pleasant space edge, the bishop well placed on c2, and the easy plan of central pressure. A quiet, comfortable squeeze in the Spanish spirit.",
        sayShort: 'd4 — central pressure, squeeze.' }),
    ],
  },
};
