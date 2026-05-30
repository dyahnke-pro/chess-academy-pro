import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — Queen's Gambit Declined, PER-VARIATION Watch
// lessons. Board-accurate, two-register narration (G9.3 Gates A-D). Student = BLACK.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Queens-Gambit-Declined',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

const BF4: LessonScript = {
  openingId: 'pro-gothamchess-qgd', title: 'QGD — Classical 5.Bf4 Line',
  minutes: 11, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O',
      highlights: [{ square: 'e7', color: SOFT }], say: "The Queen's Gambit Declined. We decline the c4-pawn with the solid …e6, develop naturally, and castle. White plays the modern Bf4 line. So far it's textbook: White has a space edge, we have a fortress and a plan to chip at the centre with …c5.",
      sayShort: 'O-O — solid and safe.' }),
    b({ id: 'c5', moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5',
      arrows: [{ from: 'c7', to: 'c5', color: VIS }], highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "We strike with the move that defines the QGD — …c5, hitting d4 and freeing our game. After the trade we recapture with the bishop, and watch it transform: a moment ago passive on e7, now it rakes toward White's king. The break frees us AND activates our worst piece.",
      sayShort: '…c5 then …Bxc5 — free and active.' }),
    b({ id: 'mg-qa5', moves: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5 Qc2 Nc6 a3 Qa5 Rd1 Be7',
      arrows: [{ from: 'a5', to: 'c3', color: VIS }], highlights: [{ square: 'c3', color: SOFT }, { square: 'd5', color: KEY }],
      say: "We develop …Nc6 and swing …Qa5, which pins the c3-knight while White's king is still on e1. Then …Be7 tucks back, sidestepping b4. Here's the middlegame: fully developed, king safe, no weaknesses, queen active. The plan — double on the d-file, eye …e5, and play the easy side of a dead-equal position. The QGD: never worse, always solid.",
      sayShort: '…Qa5 pin, then …e5 break.' }),
  ],
};

const EXCHANGE: LessonScript = {
  openingId: 'pro-gothamchess-qgd', title: 'QGD — Exchange Variation',
  minutes: 11, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7',
      highlights: [{ square: 'd5', color: KEY }], say: "The Exchange QGD — White trades on d5 and we recapture with the e-pawn, reaching the famous Carlsbad structure. White will try a minority attack on the queenside; we get our chances in the centre and kingside. It's one of the most instructive structures in all of chess, and Black is completely solid.",
      sayShort: '…exd5 — the Carlsbad structure.' }),
    b({ id: 'setup', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Nf3 Re8 Qc2 c6',
      arrows: [{ from: 'f8', to: 'e8', color: VIS }], highlights: [{ square: 'e8', color: KEY }, { square: 'c6', color: SOFT }],
      say: "We set up the model defensive formation: …Nbd7, …Re8 on the half-open file, and …c6 to brace the queenside against White's coming b4-b5 minority attack. Every piece has a defensive job and an attacking future. This is textbook Carlsbad handling.",
      sayShort: '…Re8, …c6 — the model setup.' }),
    b({ id: 'mg-nf8', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Nf3 Re8 Qc2 c6 O-O Nf8',
      arrows: [{ from: 'd7', to: 'f8', color: VIS }], highlights: [{ square: 'f8', color: KEY }, { square: 'g6', color: SOFT }],
      say: "The key maneuver: …Nf8, rerouting the knight toward g6 and e6 where it guards the kingside and eyes the strong …Ne4 or …Nf4 squares. Here's the middlegame plan: hold the queenside against the minority attack, reroute the knight, and generate play in the centre with …Ne4. It's a balanced, deeply strategic fight where understanding beats memorisation — and Black is rock-solid throughout.",
      sayShort: '…Nf8-g6 — reroute and hold.' }),
  ],
};

export const PRO_GOTHAMCHESS_QGD_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-qgd::Classical 5.Bf4 Line': BF4,
  'pro-gothamchess-qgd::Exchange Variation': EXCHANGE,
};
