import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Hikaru — Réti / KIA (1.Nf3), WHITE. 4,749 games, 84%. In his hands the Réti
// MERGES into his b3/Bb2 hypermodern system — same long-diagonal idea as the
// Nimzo-Larsen, reached by a flexible move order (his 1.d3 games live here too).
// Spine to a real middlegame (21 plies). Voice: per-opening/reti.md.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening', 'https://www.chess.com/openings/Reti-Opening', 'https://api.chess.com/pub/player/hikaru/games/archives'];

export const PRO_HIKARU_RETI_LESSON: LessonScript = {
  openingId: 'pro-hikaru-reti',
  title: "Hikaru's Réti — the Flexible Road into the b2-Bishop System",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'nf3', moves: 'Nf3', highlights: [H('f3')], say: "Nf3 — the most flexible first move in chess, and one of Hikaru's favourites. It develops, controls e5, and commits to nothing. He uses it to steer toward the same hypermodern positions he loves, on his terms.", sayShort: 'Nf3 — flexible, commit to nothing.' }),
    b({ id: 'b3', moves: 'Nf3 Nf6 b3 g6 Bb2', arrows: [A('b2', 'g7')], highlights: [H('b2')], say: "And here's the tell: b3 and Bb2. The Réti transposes straight into Hikaru's beloved long-diagonal system — the same b2-bishop weapon as his Nimzo-Larsen, just reached a different way. The bishop owns the long road toward g7.", sayShort: 'Bb2 — the long-diagonal system.' }),
    b({ id: 'd4', moves: 'Nf3 Nf6 b3 g6 Bb2 Bg7 d4 O-O e3', highlights: [H('d4')], say: "Black mirrors the fianchetto and castles; White builds the centre with d4 and e3. Solid, flexible, and comfortable — White has the space and the easier pieces to play.", sayShort: 'd4, e3 — the solid centre.' }),
    b({ id: 'break', moves: 'Nf3 Nf6 b3 g6 Bb2 Bg7 d4 O-O e3 d6 Be2 Nbd7 O-O e5 dxe5', highlights: [H('e5')], say: "Black challenges the centre with e5, and Hikaru takes — dxe5. Opening the position plays into White's hands: the b2-bishop's diagonal stretches further and the pieces get active.", sayShort: 'dxe5 — open it for the bishop.' }),
    b({ id: 'c4', moves: 'Nf3 Nf6 b3 g6 Bb2 Bg7 d4 O-O e3 d6 Be2 Nbd7 O-O e5 dxe5 Ng4 c4 Ngxe5 Nc3', arrows: [A('c2', 'c4')], highlights: [H('c4')], say: "Black recaptures the pawn with the knight, and White expands with c4 and develops the last knight to c3. The big c4-pawn and the two bishops give White a pleasant, space-based pull.", sayShort: 'c4, Nc3 — expand, develop.' }),
    b({ id: 'middlegame', moves: 'Nf3 Nf6 b3 g6 Bb2 Bg7 d4 O-O e3 d6 Be2 Nbd7 O-O e5 dxe5 Ng4 c4 Ngxe5 Nc3 Re8 Qd2', arrows: [A('d1', 'd2')], highlights: [H('d2')], say: "Black centralises a rook and White connects with Qd2. Every piece is harmoniously placed behind the broad centre, the bishop pair rakes the open diagonals, and White has the kind of low-risk, nagging edge Hikaru converts at speed.", sayShort: 'Qd2 — harmony, the Réti pull.' }),
  ],
};
