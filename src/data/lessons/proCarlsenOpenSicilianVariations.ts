import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Open Sicilian per-variation Watch lessons. Student = WHITE.
// Hand-authored from his real combined-corpus data spines. Board-accurate, two
// registers, G9.4 voice. His Sicilian answer mixes the Open Najdorf main with
// the Rossolimo and quiet anti-Sicilian set-ups — pick the structure, then squeeze.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Sicilian_Defence', 'https://www.chess.com/openings/Sicilian-Defense', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

const ROSSOLIMO: LessonScript = {
  openingId: 'pro-carlsen-open-sicilian', title: "Rossolimo vs ...Nc6", minutes: 7, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb5', moves: 'e4 c5 Nf3 Nc6 Bb5', arrows: [A('b5', 'c6')], highlights: [H('c6')], say: "When Black develops the knight to c6, Magnus often sidesteps the heavy theory and plays the Rossolimo — Bb5, pinning the knight to nothing in particular but threatening to take it. The whole idea is structural: trade the bishop for the knight and damage Black's pawns.", sayShort: 'Bb5 — the Rossolimo squeeze.' }),
    b({ id: 'setup', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1', arrows: [A('f1', 'b5')], highlights: [H('f1')], say: "Black tucks the knight to e6 and e7, so the bishop slips back to f1 rather than be exchanged on poor terms. White keeps the bishop pair in reserve and builds with Re1, ready to break in the centre with d4 at the perfect moment.", sayShort: 'Bf1 — keep the bishop, prep d4.' }),
    b({ id: 'mid', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 d3', highlights: [H('d3'), H('e4')], say: "Black strikes with d5; White holds the centre with d3 and a small, durable space edge. This is pure Carlsen — no fireworks, just a sound structure and the better pieces, the kind of position he grinds for eighty moves until you crack.", sayShort: 'd3 — the slow Carlsen squeeze.' }),
  ],
};

const TAIMANOV: LessonScript = {
  openingId: 'pro-carlsen-open-sicilian', title: "Open vs ...e6", minutes: 7, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3', arrows: [A('d4', 'c6')], highlights: [H('d4')], say: "Against the flexible ...e6 Taimanov, Magnus opens the centre and grabs the d4 outpost for the knight. The knight on d4 is the dream Sicilian piece — central, untouchable, and eyeing both wings.", sayShort: 'Open it — the d4 knight.' }),
    b({ id: 'be3', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3', highlights: [H('e3')], say: "Black plays the typical Qc7, eyeing the e5-square and the c-file. White develops the bishop to e3, the same English-Attack idea — point the dark-squared bishop at the queenside and prepare to castle long and storm.", sayShort: 'Be3 — English-Attack setup.' }),
    b({ id: 'bd3', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Bd3', highlights: [H('d3')], say: "Bd3 develops onto the b1-h7 diagonal — the kingside attacker's bishop, waiting for the centre to open so it can train on Black's king. White is fully mobilised and ready to castle long; the heavy pieces will follow the bishops across. A classic Sicilian attacking machine.", sayShort: 'Bd3 — the attacker\'s diagonal.' }),
  ],
};

const MOSCOW: LessonScript = {
  openingId: 'pro-carlsen-open-sicilian', title: "Moscow Bb5+", minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'check', moves: 'e4 c5 Nf3 d6 Bb5+', arrows: [A('b5', 'd7')], highlights: [H('d7')], say: "Against ...d6, the Moscow check — Bb5+ — is Magnus's quiet weapon. It provokes a slightly awkward block and steers the game away from the sharpest Najdorf theory into a calm, manoeuvring fight where understanding beats memorisation.", sayShort: 'Bb5+ — duck the Najdorf theory.' }),
    b({ id: 'a4', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 a4 Nf6 Nc3 g6 a5', highlights: [H('a5'), H('a6')], say: "Black blocks with the knight to d7, and White clamps the queenside with a4 and a5 — fixing Black's pawns and stealing the b6-square. It's a tiny, nagging space grab on the wing, exactly the kind of edge Carlsen lives on.", sayShort: 'a4-a5 — clamp the queenside.' }),
    b({ id: 'mid', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 a4 Nf6 Nc3 g6 a5 Bg7 O-O', highlights: [H('a5')], say: "Black fianchettoes and the game settles into a Maroczy-flavoured manoeuvring battle: White owns more space, the a5-pawn cramps Black forever, and there is no quick counterplay. Slow, technical, and right in Magnus's wheelhouse.", sayShort: 'O-O — space, no counterplay for Black.' }),
  ],
};

const SOZIN: LessonScript = {
  openingId: 'pro-carlsen-open-sicilian', title: "Classical Bc4", minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bc4', moves: 'e4 c5 Nf3 d6 Bc4', arrows: [A('c4', 'f7')], highlights: [H('f7')], say: "The other quiet try against ...d6: Bc4, dropping the bishop onto the a2-g8 diagonal and staring at f7 — the eternal Sicilian sore spot. White keeps it positional, a Italian-style slow build rather than the d4 onslaught.", sayShort: 'Bc4 — eye the f7 weakness.' }),
    b({ id: 'build', moves: 'e4 c5 Nf3 d6 Bc4 Nf6 d3 Nc6 O-O e6 Bb3', highlights: [H('b3')], say: "White plays a restrained d3, castles, and tucks the bishop back to b3 where it sits safe on the long light diagonal, ready to bite at f7 the instant the e6-pawn moves or the centre opens. The slow Italian-Sicilian hybrid: no pawn breaks yet, just harmonious development and a long-term plan.", sayShort: 'Bb3 — safe, latent pressure.' }),
    b({ id: 'mid', moves: 'e4 c5 Nf3 d6 Bc4 Nf6 d3 Nc6 O-O e6 Bb3 Be7 c3 O-O', highlights: [H('c3'), H('d4')], say: "With c3 White prepares the d3-d4 central lever at the moment of his choosing. Both sides are castled and complete; the position is balanced but pleasant for White, who dictates when and where the game opens. Patience, then the squeeze.", sayShort: 'c3 — prepare d4, then squeeze.' }),
  ],
};

const HYPER: LessonScript = {
  openingId: 'pro-carlsen-open-sicilian', title: "Hyperaccelerated ...g6", minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 c5 Nf3 g6 d4 cxd4 Nxd4 Bg7 c4', highlights: [H('c4'), H('d5'), H('e4')], say: "When Black rushes the fianchetto with ...g6, Magnus answers with the strongest antidote — the Maroczy Bind. The c4-pawn joins e4 to build a broad pawn duo that clamps the d5-square and chokes Black's natural ...d5 freeing break.", sayShort: 'c4 — the Maroczy Bind.' }),
    b({ id: 'be3', moves: 'e4 c5 Nf3 g6 d4 cxd4 Nxd4 Bg7 c4 Nc6 Be3', highlights: [H('e3')], say: "Nc6 challenges the centre and White calmly develops Be3, defending the knight and the bind. The whole pawn structure smothers Black: no pawn breaks, no space, just a long passive defence — the Bind is one of the great squeezing weapons, and Carlsen plays it to perfection.", sayShort: 'Be3 — hold the bind, smother Black.' }),
  ],
};

export const PRO_CARLSEN_OPEN_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-open-sicilian::Rossolimo vs ...Nc6': ROSSOLIMO,
  'pro-carlsen-open-sicilian::Open vs ...e6': TAIMANOV,
  'pro-carlsen-open-sicilian::Moscow Bb5+': MOSCOW,
  'pro-carlsen-open-sicilian::Classical Bc4': SOZIN,
  'pro-carlsen-open-sicilian::Hyperaccelerated ...g6': HYPER,
};
