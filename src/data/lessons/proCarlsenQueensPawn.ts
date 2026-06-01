import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Queen's Pawn / Catalan complex, WHITE. 1,107 games
// (online + OTB), 74%. Carlsen's d4 is a universal positional system: c4 and a
// fight for the centre, then a slow technical squeeze. Main line = the QGD with
// the Ragozin pin met by the Bf4 exchange structure. Variations cover his answer
// to the King's Indian, Nimzo, Catalan, Queen's Indian and Bogo set-ups.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined', 'https://www.chess.com/openings/Queens-Gambit-Declined', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_QUEENS_PAWN_LESSON: LessonScript = {
  openingId: 'pro-carlsen-queens-pawn',
  title: "Carlsen's Queen's Pawn — the d4 Squeeze",
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'qgd', moves: 'd4 Nf6 c4 e6 Nf3 d5 Nc3', highlights: [H('c4'), H('d4')], say: "Carlsen's d4 is a universal positional weapon. With c4 he fights for the centre and the d5-square; Nf3 and Nc3 build pressure without committing. Against a classical ...d5 setup he heads for the Queen's Gambit Declined — the soundest, most strategic of all openings.", sayShort: 'c4, Nc3 — fight for d5.' }),
    b({ id: 'ragozin', moves: 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Bb4', arrows: [A('b4', 'c3')], highlights: [H('b4')], say: "Black pins the c3-knight with the Ragozin's Bb4, adding pressure to the centre. It's an active try, but it also commits the bishop early — and Carlsen knows exactly how to make that commitment a liability rather than an asset.", sayShort: 'Bb4 — the Ragozin pin.' }),
    b({ id: 'exchange', moves: 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Bb4 cxd5 exd5', highlights: [H('d5')], say: "cxd5 — the exchange. Capturing in the centre fixes Black with an isolated, slightly loose pawn on d5 and opens the position for White's pieces. This clean, classical structure is the Carlsen recipe: trade into a position with one clear, permanent target.", sayShort: 'cxd5 — fix the d5 target.' }),
    b({ id: 'bf4', moves: 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Bb4 cxd5 exd5 Bf4', arrows: [A('f4', 'c7')], highlights: [H('f4')], say: "Bf4 develops the bishop to its best diagonal, eyeing the c7-square and the queenside. White's plan is textbook: pile up on the d5-pawn, exchange the right pieces, and steer into an endgame where that pawn becomes a chronic weakness.", sayShort: 'Bf4 — best diagonal, target d5.' }),
    b({ id: 'rc1', moves: 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Bb4 cxd5 exd5 Bf4 Ne4 Rc1', highlights: [H('c1'), H('c7')], say: "Black jumps into e4 for activity, and White calmly tucks the rook to c1, lining up on the half-open c-file toward c7. Every White piece points at Black's queenside and the d5-pawn. No tactics, just suffocating positional pressure — Carlsen at the wheel.", sayShort: 'Rc1 — the c-file pressure.' }),
  ],
};

const KID: LessonScript = {
  openingId: 'pro-carlsen-queens-pawn', title: "vs King's Indian g6", minutes: 7, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4', highlights: [H('e4'), H('d4')], say: "Against the King's Indian, Carlsen grabs the whole centre with e4. Big pawns on d4 and e4 give White a space advantage across the board; Black will hit back with ...e5, but for now White simply has more room to manoeuvre.", sayShort: 'e4 — take the full centre.' }),
    b({ id: 'classical', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2', highlights: [H('e2')], say: "The Classical main line: Nf3 and Be2, a calm, solid development that refuses Black any cheap counterplay. White is in no hurry — he completes development and lets his space advantage do the talking. This is how Carlsen neutralises the King's Indian's famous attacks.", sayShort: 'Nf3, Be2 — solid and patient.' }),
    b({ id: 'oo', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O', highlights: [H('e5'), H('d5')], say: "Black strikes with e5 and White castles, keeping the central tension. From here White typically closes with d5 or trades, aiming for a queenside pawn advance while Black storms the kingside. White's flank is faster — and Carlsen defends the king better than anyone.", sayShort: 'O-O — race on opposite wings.' }),
  ],
};

const NIMZO: LessonScript = {
  openingId: 'pro-carlsen-queens-pawn', title: "Nimzo-Indian Nc3", minutes: 7, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nc3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4', arrows: [A('b4', 'c3')], highlights: [H('b4')], say: "The Nimzo-Indian: Black pins the c3-knight, threatening to swap it off and damage White's structure for control of the dark squares. It's one of the most respected defences in chess — so Carlsen meets it head-on and plays to turn the bishop pair into a long-term trump.", sayShort: 'Bb4 — the Nimzo pin.' }),
    b({ id: 'e3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3', highlights: [H('e3'), H('d3')], say: "The Rubinstein System — e3, Bd3, Nf3, the most flexible and durable setup. White develops behind the pawns and prepares to expand in the centre with the eventual a3 and the freeing of the bishop pair. Quiet, classical, and built to outlast.", sayShort: 'e3, Bd3 — the Rubinstein.' }),
    b({ id: 'c5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5', highlights: [H('c5'), H('d5')], say: "Black challenges the centre with c5 and the main strategic battle is joined: White wants to play a3, take the bishop, and use the two bishops in an open position; Black wants to trade pieces and keep the structure closed. Pure strategy — Carlsen's element.", sayShort: 'c5 — the central tension breaks.' }),
  ],
};

const CATALAN: LessonScript = {
  openingId: 'pro-carlsen-queens-pawn', title: "Catalan g3", minutes: 7, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'g3', moves: 'd4 Nf6 c4 e6 Nf3 d5 g3', highlights: [H('g3')], say: "The Catalan — g3 to fianchetto the bishop. The bishop on the long light diagonal is the soul of the opening: it bears down on Black's queenside and the d5-pawn from a distance, combining the solidity of the QGD with the bite of a fianchetto.", sayShort: 'g3 — the Catalan bishop.' }),
    b({ id: 'bg2', moves: 'd4 Nf6 c4 e6 Nf3 d5 g3 Be7 Bg2 O-O O-O', arrows: [A('g2', 'b7')], highlights: [H('g2')], say: "Bg2 and castling complete the setup. The bishop on g2 rakes the whole long diagonal toward b7 and a8 — a slow-burning pressure that lasts the entire game. Carlsen has won countless games where this single bishop quietly decides the outcome.", sayShort: 'Bg2 — rake the long diagonal.' }),
    b({ id: 'qxc4', moves: 'd4 Nf6 c4 e6 Nf3 d5 g3 Be7 Bg2 O-O O-O dxc4 Qc2 a6 Qxc4', highlights: [H('c4')], say: "Black grabs the c4-pawn but can't hold it; White recaptures with the queen and enjoys a lasting space edge and that magnificent bishop. The Open Catalan is one of the safest ways in chess to play for a win with White — exactly why it's a Carlsen staple.", sayShort: 'Qxc4 — regain it, keep the pull.' }),
  ],
};

const QID: LessonScript = {
  openingId: 'pro-carlsen-queens-pawn', title: "Queen's Indian b6", minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'g3', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3', highlights: [H('g3')], say: "Against the Queen's Indian's ...b6, Carlsen fianchettoes with g3 to neutralise Black's light-squared bishop before it gets active. It becomes a battle of the two long-diagonal bishops — and White's, supported by more central space, holds the upper hand.", sayShort: 'g3 — contest the light squares.' }),
    b({ id: 'bd2', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2', highlights: [H('b3'), H('d2')], say: "Black's Ba6 pressures the c4-pawn, so White props it with b3 and meets the check with Bd2. The position is solid and slightly more comfortable for White, who keeps the bishop pair and the central majority. A textbook squeeze in the making.", sayShort: 'b3, Bd2 — defend c4, keep it tidy.' }),
    b({ id: 'bg2', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6', arrows: [A('g2', 'b7')], highlights: [H('g2')], say: "White finishes with Bg2, and the fianchettoed bishop again owns the long diagonal toward b7. Black is solid but passive; White has a free, harmonious game and the easier plan. Carlsen converts these tiny pulls more reliably than anyone in history.", sayShort: 'Bg2 — the easier, freer game.' }),
  ],
};

const BOGO: LessonScript = {
  openingId: 'pro-carlsen-queens-pawn', title: "Bogo-Indian Bb4+", minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nbd2', moves: 'd4 Nf6 c4 e6 Nf3 Bb4+ Nbd2', highlights: [H('d2')], say: "The Bogo-Indian check: Bb4+. Carlsen blocks with Nbd2 rather than the bishop, keeping his structure flexible and inviting Black to trade off the bishop that just developed. Giving up a bishop so early rarely solves Black's problems.", sayShort: 'Nbd2 — block, keep flexible.' }),
    b({ id: 'a3', moves: 'd4 Nf6 c4 e6 Nf3 Bb4+ Nbd2 b6 a3 Bxd2+ Bxd2 Bb7 g3 O-O', arrows: [A('d2', 'a5')], highlights: [H('a3')], say: "a3 puts the question to the bishop, and after the trade White recaptures with the bishop, gaining the two bishops and a free hand in the centre. Black has surrendered his good bishop for a knight — a small concession that Carlsen will press for the rest of the game.", sayShort: 'a3 — win the bishop pair.' }),
  ],
};

export const PRO_CARLSEN_QUEENS_PAWN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-queens-pawn::vs King\'s Indian g6': KID,
  'pro-carlsen-queens-pawn::Nimzo-Indian Nc3': NIMZO,
  'pro-carlsen-queens-pawn::Catalan g3': CATALAN,
  'pro-carlsen-queens-pawn::Queen\'s Indian b6': QID,
  'pro-carlsen-queens-pawn::Bogo-Indian Bb4+': BOGO,
};
