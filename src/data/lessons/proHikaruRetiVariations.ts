import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Hikaru — Réti (1.Nf3) per-variation Watch lessons. Hand-authored from his
// real data spines. Student = WHITE. Board-accurate, two registers, G9.4 voice.
// His Réti merges into the b3/Bb2 hypermodern system — the long diagonal is the weapon.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening', 'https://www.chess.com/openings/Reti-Opening', 'https://api.chess.com/pub/player/hikaru/games/archives'];

const KIA: LessonScript = {
  openingId: 'pro-hikaru-reti', title: "Réti into the b3 System", minutes: 8, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb2', moves: 'Nf3 Nf6 b3 g6 Bb2', arrows: [A('b2', 'g7')], highlights: [H('b2')], say: "From the flexible Nf3, this repertoire transposes into his favourite structure — b3 and Bb2. It's the same long-diagonal weapon as his Nimzo-Larsen, just reached a different way; the bishop owns the road toward g7.", sayShort: 'Bb2 — the long-diagonal system.' }),
    b({ id: 'd4', moves: 'Nf3 Nf6 b3 g6 Bb2 Bg7 d4 O-O e3', highlights: [H('d4')], say: "Black mirrors the fianchetto and castles; White builds the centre with d4 and e3. Solid and flexible — White has the space and the easier pieces to handle.", sayShort: 'd4, e3 — the solid centre.' }),
    b({ id: 'open', moves: 'Nf3 Nf6 b3 g6 Bb2 Bg7 d4 O-O e3 d6 Be2 Nbd7 O-O e5 dxe5 Ng4 c4 Ngxe5 Nc3', arrows: [A('c2', 'c4')], highlights: [H('c4')], say: "Black challenges with e5 and White takes — opening the position plays into White's hands. After the knight recaptures, c4 expands and Nc3 completes development; the big centre and the bishop pair give a pleasant pull.", sayShort: 'c4, Nc3 — expand, develop.' }),
    b({ id: 'mid', moves: 'Nf3 Nf6 b3 g6 Bb2 Bg7 d4 O-O e3 d6 Be2 Nbd7 O-O e5 dxe5 Ng4 c4 Ngxe5 Nc3 Re8 Qd2', arrows: [A('d1', 'd2')], highlights: [H('d2')], say: "Black centralises a rook and White connects with Qd2. Every piece is harmonious behind the broad centre, the bishops rake the open diagonals, and White holds the low-risk, nagging edge this repertoire converts at speed.", sayShort: 'Qd2 — harmony, the Réti pull.' }),
  ],
};

const VS_D5: LessonScript = {
  openingId: 'pro-hikaru-reti', title: "Réti vs ...d5 — Reversed London", minutes: 7, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb2', moves: 'Nf3 d5 b3 Nf6 Bb2', arrows: [A('b2', 'g7')], highlights: [H('b2')], say: "Against the solid ...d5, this repertoire fianchettoes — Bb2. The setup becomes a reversed London with an extra tempo: the dark-squared bishop leans down the long diagonal while White prepares the centre.", sayShort: 'Bb2 — reversed London, a tempo up.' }),
    b({ id: 'd4', moves: 'Nf3 d5 b3 Nf6 Bb2 e6 e3 Be7 d4', highlights: [H('d4')], say: "White builds the d4-e3 pawn chain behind the bishop. The position is rock-solid and flexible — White can press on either wing while the b2-bishop bides its time.", sayShort: 'd4 — build the centre.' }),
    b({ id: 'mid', moves: 'Nf3 d5 b3 Nf6 Bb2 e6 e3 Be7 d4 O-O Bd3 b6 O-O Bb7 Nbd2', arrows: [A('f1', 'd3')], highlights: [H('d3')], say: "Both sides finish developing and fianchetto; White drops the bishop to d3 onto the b1-h7 diagonal toward Black's king. Two bishops, a broad centre, the freer game — the comfortable reversed-London pull.", sayShort: 'Bd3 — two bishops, easier game.' }),
  ],
};

const VS_C5: LessonScript = {
  openingId: 'pro-hikaru-reti', title: "Réti vs ...c5 — Take the Centre", minutes: 7, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb2', moves: 'Nf3 c5 b3 Nc6 Bb2', arrows: [A('b2', 'g7')], highlights: [H('b2')], say: "Against ...c5, this repertoire fianchettoes again — Bb2 — and the bishop's diagonal already points toward Black's kingside. The flexible move order keeps White comfortable.", sayShort: 'Bb2 — claim the diagonal.' }),
    b({ id: 'd4', moves: 'Nf3 c5 b3 Nc6 Bb2 d5 e3 a6 d4', arrows: [A('d2', 'd4')], highlights: [H('d4')], say: "White strikes with d4, opening the centre. The lines crack open in White's favour — the b2-bishop and the active pieces get to work.", sayShort: 'd4 — open the centre.' }),
    b({ id: 'mid', moves: 'Nf3 c5 b3 Nc6 Bb2 d5 e3 a6 d4 cxd4 Nxd4 Nf6 Nxc6 bxc6 Nd2', highlights: [H('d4')], say: "After the trades on d4 and c6, Black is left with damaged queenside pawns while White develops harmoniously with Nd2. A clean structural edge in a comfortable middlegame.", sayShort: 'Nd2 — damaged pawns, White is better.' }),
  ],
};

export const PRO_HIKARU_RETI_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-hikaru-reti::Réti into the b3 system': KIA,
  'pro-hikaru-reti::vs ...d5': VS_D5,
  'pro-hikaru-reti::vs ...c5': VS_C5,
};
