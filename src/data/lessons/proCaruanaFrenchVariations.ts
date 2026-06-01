import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — French per-variation Watch lessons. Student = BLACK. Spine from
// his real data (tree-extended). Board-accurate, two registers, G9.4 voice.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pawn-minority-attack', 'https://en.wikipedia.org/wiki/French_Defence', 'https://www.chess.com/openings/French-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

const WINAWER: LessonScript = {
  openingId: 'pro-caruana-french', title: 'French — Winawer 3...Bb4', minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb4', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5', say: "The Winawer — the sharpest French. Black pins the c3-knight with Bb4 and strikes the pawn chain at once with c5, refusing White any quiet build-up.", sayShort: '…Bb4, …c5 — pin and strike.', arrows: [A('f8', 'b4')], highlights: [H('c5')] }),
    b({ id: 'bxc3', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7', say: "White questions the bishop with a3; Black trades on c3, doubling White's pawns and damaging the queenside for good, then ...Ne7 heads to attack the centre.", sayShort: '…Bxc3 — double White’s pawns.', arrows: [A('b4', 'c3')], highlights: [H('c3')] }),
    b({ id: 'qc7', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7', say: "White lunges Qg4 at g7; Black ignores it with Qc7, eyeing the weak c3-pawns and e5. The poisoned-pawn main line — Black gives up the kingside pawns for a crushing structural and central counterattack.", sayShort: '…Qc7 — counterattack the centre.', arrows: [A('d8', 'c7')], highlights: [H('c7')] }),
    b({ id: 'cxd4', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4', say: "White grabs g7 and h7; Black opens the c-file with cxd4, smashing into White's tripled, shattered queenside. Black has a raging initiative against the weak pawns and centre — full compensation and more. Winawer chaos, in Black's favour.", sayShort: '…cxd4 — smash the queenside.', arrows: [A('c5', 'd4')], highlights: [H('d4')] }),
  ],
};

// Advance (3.e5) — spine from his real Advance games.
const ADVANCE: LessonScript = {
  openingId: 'pro-caruana-french', title: 'French — Advance 3.e5', minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c5', moves: 'e4 e6 d4 d5 e5 c5', say: "White grabs space and locks the centre with e5. Caruana hits the base of the pawn chain at once with c5 — the thematic French strike at the d4-pawn that props the whole structure.", sayShort: '…c5 — hit the chain’s base.', highlights: [H('c5'), H('d4')] }),
    b({ id: 'nc6', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6', say: "White props the chain with c3; Black piles onto d4 with the knight to c6, the standard pressure against the weak base of White's centre.", sayShort: '…Nc6 — pile on d4.', highlights: [H('c6'), H('d4')] }),
    b({ id: 'bd7', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Bd7', say: "White defends with the knight to f3; Black develops the light bishop to d7, the piece that is often the French problem child, preparing to reroute it and the king's knight to their best squares.", sayShort: '…Bd7 — free the bad bishop.', highlights: [H('d7')] }),
    b({ id: 'nge7', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Bd7 Be2 Nge7', say: "The king's knight goes to e7 rather than f6 — staying off the path of the e5-pawn and heading for the great f5- or g6-square. This is the classic French regrouping behind the chain.", sayShort: '…Nge7 — reroute toward f5/g6.', highlights: [H('e7')] }),
    b({ id: 'ng6', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Bd7 Be2 Nge7 O-O Ng6', say: "White castles; Black completes the maneuver with the knight to g6, pressing the e5-pawn and eyeing the f4-square. Black has comfortable, well-organised French counterplay against the d4-base — Caruana's reliable setup.", sayShort: '…Ng6 — press e5.', highlights: [H('g6'), H('e5')] }),
  ],
};

// Tarrasch (3.Nd2) — spine from his real Tarrasch games (…Be7 line).
const TARRASCH: LessonScript = {
  openingId: 'pro-caruana-french', title: 'French — Tarrasch 3.Nd2', minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'be7', moves: 'e4 e6 d4 d5 Nd2 Be7', say: "Against the Tarrasch knight to d2, Caruana chooses the flexible bishop to e7 — keeping the structure fluid rather than committing early to the sharp c5 lines.", sayShort: '…Be7 — keep it flexible.', highlights: [H('e7')] }),
    b({ id: 'nf6', moves: 'e4 e6 d4 d5 Nd2 Be7 Ngf3 Nf6', say: "Both sides develop the king's knights; Black's knight to f6 challenges the e4-pawn and forces White to resolve the central tension.", sayShort: '…Nf6 — hit e4.', highlights: [H('f6'), H('e4')] }),
    b({ id: 'nfd7', moves: 'e4 e6 d4 d5 Nd2 Be7 Ngf3 Nf6 e5 Nfd7', say: "White pushes e5, gaining space and kicking the knight back to d7, where it supports the coming break and the e5-pawn is now a target.", sayShort: '…Nfd7 — regroup, prep …c5.', highlights: [H('d7'), H('e5')] }),
    b({ id: 'c5', moves: 'e4 e6 d4 d5 Nd2 Be7 Ngf3 Nf6 e5 Nfd7 c3 c5', say: "White props the chain with c3; Black strikes with c5, the standard French lever against the d4-base. The pawn tension defines the middlegame.", sayShort: '…c5 — the French lever.', highlights: [H('c5'), H('d4')] }),
    b({ id: 'bd3', moves: 'e4 e6 d4 d5 Nd2 Be7 Ngf3 Nf6 e5 Nfd7 c3 c5 Bd3', say: "White develops the bishop to d3, aiming at the kingside. Black continues with the knight to c6 and queenside counterplay against d4 — the classic Tarrasch middlegame Caruana navigates with ease.", sayShort: 'Bd3 — the Tarrasch middlegame.', arrows: [A('f1', 'd3')], highlights: [H('d3')] }),
  ],
};

// Exchange (3.exd5) — spine from his real Exchange games.
const EXCHANGE: LessonScript = {
  openingId: 'pro-caruana-french', title: 'French — Exchange 3.exd5', minutes: 7, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'exd5', moves: 'e4 e6 d4 d5 exd5 exd5', say: "White trades on d5 — the Exchange French. It looks symmetrical and drawish, but Caruana plays the resulting open position for a win with the more active pieces.", sayShort: '…exd5 — open and symmetric.', highlights: [H('d5')] }),
    b({ id: 'nf6', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6', say: "Both sides develop naturally in the symmetrical structure; the fight is for the open e-file and the active central squares.", sayShort: '…Nf6 — natural development.', highlights: [H('f6')] }),
    b({ id: 'bd6', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6', say: "The bishops come to the natural d3 and d6 squares, mirror images both aiming at the enemy kingside. Black mirrors White and waits to seize the initiative.", sayShort: '…Bd6 — mirror, eye the king.', arrows: [A('f8', 'd6')], highlights: [H('d6')] }),
    b({ id: 'oo', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O', say: "Both castle and the symmetry is intact — but whoever grabs the open e-file or lands the first c-pawn break takes over. Caruana plays this tabiya for the long technical squeeze, not the draw.", sayShort: '…O-O — play for the squeeze.', highlights: [H('g8')] }),
  ],
};

export const PRO_CARUANA_FRENCH_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-caruana-french::Winawer 3...Bb4': WINAWER,
  'pro-caruana-french::Advance 3.e5': ADVANCE,
  'pro-caruana-french::Tarrasch 3.Nd2': TARRASCH,
  'pro-caruana-french::Exchange 3.exd5': EXCHANGE,
};
