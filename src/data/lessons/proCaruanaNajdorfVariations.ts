import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Sicilian Najdorf per-variation Watch lessons. Student = BLACK.
// Spines are his real OTB data lines (pgnmentor classical corpus, 30 Najdorf
// games) tree-extended to a middlegame. Board-accurate, two registers, G9.4
// voice. English Attack is the line he faces most over the board (10+ games);
// Classical Be2 is the solid main. No move-number prefixes in spoken prose.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

// English Attack — the sharpest, most-faced line over the board. Be3, f3, Qd2,
// O-O-O and the g4-g5 storm; Black races on the queenside with ...b5-b4.
const ENGLISH_ATTACK: LessonScript = {
  openingId: 'pro-caruana-najdorf', title: 'Najdorf — English Attack 6.Be3', minutes: 9, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5', say: "Be3 is the English Attack — White's most dangerous weapon, planning f3, Qd2, long castling and a g4-g5 avalanche at the king. Black answers in true Najdorf spirit: e5 grabs the centre and kicks the d4-knight, accepting a hole on d5 for space and activity.", sayShort: '…e5 — grab the centre.', highlights: [H('e5'), H('d5')] }),
    b({ id: 'be6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6', say: "The knight retreats to b3, and the light bishop steps out to e6 — the key defender of the d5-square that White is desperate to occupy. Black fights for that square before doing anything else.", sayShort: '…Be6 — guard d5.', arrows: [A('c8', 'e6')], highlights: [H('e6'), H('d5')] }),
    b({ id: 'be7', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7', say: "f3 is the English Attack's signature — it braces e4 and clears the way for the g4-g5 pawn storm. Black calmly develops the dark bishop to e7 and prepares to castle, unafraid of the coming race.", sayShort: '…Be7 — develop and prepare O-O.', arrows: [A('f8', 'e7')], highlights: [H('e7')] }),
    b({ id: 'oo', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O', say: "Qd2 connects the rooks and eyes long castling; Black castles kingside, straight into where the storm is coming. That looks reckless, but it is the whole point of the Najdorf: Black trusts the queenside counterattack to arrive first.", sayShort: '…O-O — trust the counterattack.', highlights: [H('g8')] }),
    b({ id: 'nbd7', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7', say: "White castles queenside — now the kings sit on opposite wings and the game becomes a pure pawn-storm race. Black's last knight comes to d7, supporting the …b5 push and eyeing the fine c5-square. Every tempo counts from here.", sayShort: '…Nbd7 — support the …b5 storm.', arrows: [A('b8', 'd7')], highlights: [H('d7'), H('c5')] }),
    b({ id: 'b5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5', say: "The race is joined: White throws g4-g5 at Black's king, Black hurls b5-b4 at White's. Black's attack is the faster one — …b4 hits the c3-knight and rips open the b- and c-files straight at the white king on c1. This is the Najdorf's promise: the side attacking the enemy king usually wins, and here that side is Black.", sayShort: '…b5 — race with …b4 next.', highlights: [H('b5'), H('b4'), H('c3')] }),
  ],
};

// Classical 6.Be2 — the solid main line: quiet development, contest d5, play on
// the queenside and the half-open c-file.
const CLASSICAL: LessonScript = {
  openingId: 'pro-caruana-najdorf', title: 'Najdorf — Classical 6.Be2', minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5', say: "Be2 is the Classical — solid and unpretentious, White simply developing and castling. Black seizes the moment with e5, claiming central space and driving the knight back. The same Najdorf idea: take the centre, live with the d5-hole, and out-play from a sound position.", sayShort: '…e5 — take the centre.', highlights: [H('e5'), H('d5')] }),
    b({ id: 'oo', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O', say: "The knight steps back to b3, the bishop develops to e7, and both sides castle kingside — a calm, classical picture with none of the English Attack's fireworks. Black has a harmonious setup and a clear plan waiting.", sayShort: '…Be7, …O-O — calm and sound.', highlights: [H('e7'), H('g8')] }),
    b({ id: 'be6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6', say: "White develops the bishop to e3; Black answers Be6, again planting a guard on the critical d5-square. The whole middlegame turns on who controls d5 — Black spends real energy contesting it.", sayShort: '…Be6 — contest d5.', arrows: [A('c8', 'e6')], highlights: [H('e6'), H('d5')] }),
    b({ id: 'nbd7', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Nd5 Nbd7', say: "White finally occupies d5 with the knight; Black brings the last knight to d7, ready to challenge the outpost and reinforce the queenside. The classic Najdorf standoff: White's d5-knight against Black's expanding queenside.", sayShort: '…Nbd7 — challenge the outpost.', arrows: [A('b8', 'd7')], highlights: [H('d5'), H('d7')] }),
    b({ id: 'rc8', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Nd5 Nbd7 Qd2 Rc8', say: "Qd2 centralises the queen; Black swings the rook to c8, loading the half-open c-file. This is where Black's play lives — pressure down the c-file, the …b5-b4 expansion, and the eternal fight for d5. A rich, fully sound middlegame with chances for both sides.", sayShort: '…Rc8 — load the c-file.', arrows: [A('a8', 'c8')], highlights: [H('c8')] }),
  ],
};

export const PRO_CARUANA_NAJDORF_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-caruana-najdorf::English Attack 6.Be3': ENGLISH_ATTACK,
  'pro-caruana-najdorf::Classical 6.Be2': CLASSICAL,
};
