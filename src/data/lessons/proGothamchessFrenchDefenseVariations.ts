import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — French Defense, PER-VARIATION Watch lessons.
// Board-accurate, two-register narration (G9.3 Gates A-D). Student = BLACK.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/French-Defense-Rubinstein-Variation',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

const RUBINSTEIN: LessonScript = {
  openingId: 'pro-gothamchess-french-defense', title: 'French — Rubinstein Main Line',
  minutes: 11, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'gxf6', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6',
      arrows: [{ from: 'g7', to: 'f6', color: VIS }], highlights: [{ square: 'f6', color: KEY }, { square: 'g8', color: SOFT }],
      say: "The Rubinstein French with the bold …gxf6 recapture. Yes, our f-pawns are doubled — but look what we got: a half-open g-file aimed at White's kingside and a pawn on f6 ready to support a big centre. This isn't a weakness; it's a weapon most opponents have no idea how to meet.",
      sayShort: 'gxf6 — open the g-file.' }),
    b({ id: 'e5', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5',
      arrows: [{ from: 'e6', to: 'e5', color: VIS }], highlights: [{ square: 'e5', color: KEY }, { square: 'f6', color: SOFT }],
      say: "We develop …Nc6, pressuring d4, and strike with …e5! Now those 'ugly' doubled pawns pay off: the f6-pawn rock-solidly supports e5, giving us a broad, strong centre. Black is rarely this active in the French — that's the whole point of the …gxf6 line.",
      sayShort: 'e5 — the doubled pawn pays off.' }),
    b({ id: 'mg-bg4', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5 Bg2 Bg4 h3 Bxf3',
      arrows: [{ from: 'g4', to: 'f3', color: VIS }], highlights: [{ square: 'f3', color: KEY }, { square: 'e5', color: SOFT }],
      say: "We develop …Bg4 and, when questioned, trade it on f3 — damaging White's kingside or grabbing the bishop pair, depending how he recaptures. Here's the middlegame: a powerful centre, both our bishops active, and the open g-file ready for a rook once we tuck the king away. We're a touch worse on the cold engine count, but this is rich, double-edged attacking chess — exactly the fight this repertoire wants from the French.",
      sayShort: '…Bxf3 — rooks to the g-file.' }),
  ],
};

const TARRASCH: LessonScript = {
  openingId: 'pro-gothamchess-french-defense', title: 'French — Tarrasch (Nd2)',
  minutes: 11, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'gxf6', moves: 'e4 e6 d4 d5 Nd2 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5',
      arrows: [{ from: 'e6', to: 'e5', color: VIS }], highlights: [{ square: 'e5', color: KEY }, { square: 'f6', color: SOFT }],
      say: "Against the Tarrasch move order (Nd2), we use the same Rubinstein idea — recapture with …gxf6 for the g-file and the big centre, then blast …e5 supported by the f6-pawn. Same powerful, active structure: a broad centre and an open file pointed at White's king.",
      sayShort: '…e5 — the big active centre.' }),
    b({ id: 'd5-nb4', moves: 'e4 e6 d4 d5 Nd2 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5 d5 Nb4',
      arrows: [{ from: 'c6', to: 'b4', color: VIS }], highlights: [{ square: 'b4', color: KEY }, { square: 'c2', color: SOFT }],
      say: "White lunges d5 to kick our knight, but we jump to b4 — and this is the key point. From b4 the knight eyes c2, where it would fork White's king on e1 and the rook on a1. That …Nc2+ threat is real and nasty, and White is suddenly the one with problems.",
      sayShort: 'Nb4 — threatens the …Nc2+ fork.' }),
    b({ id: 'mg-bf5', moves: 'e4 e6 d4 d5 Nd2 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5 d5 Nb4 c4 Bf5',
      arrows: [{ from: 'c8', to: 'f5', color: VIS }], highlights: [{ square: 'f5', color: KEY }, { square: 'c2', color: SOFT }],
      say: "White grabs space with c4; we develop …Bf5, eyeing c2 to support the fork and hitting White's loose queenside. Here's the middlegame, and the engine actually FAVOURS Black: the knight on b4 with the …Nc2+ fork hanging, our bishops raking open lines, and White's king stuck in the centre. We're not just equal here — we're better. Active piece play has beaten White's space grab.",
      sayShort: '…Bf5 — Black is already better.' }),
  ],
};

const EXCHANGE: LessonScript = {
  openingId: 'pro-gothamchess-french-defense', title: 'French — Exchange (exd5)',
  minutes: 10, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 e6 d4 d5 exd5 exd5',
      highlights: [{ square: 'd5', color: KEY }], say: "The Exchange French — White's most harmless try, dissolving the central tension into a symmetric structure. People say it's a draw. We say it's a free, easy game where our bishops are unleashed — the very pieces the French normally struggles to activate.",
      sayShort: '…exd5 — symmetric and free.' }),
    b({ id: 'develop', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Bd6 Bd3 Bg4',
      arrows: [{ from: 'c8', to: 'g4', color: VIS }], highlights: [{ square: 'd6', color: KEY }, { square: 'g4', color: SOFT }],
      say: "We get BOTH bishops out actively — …Bd6 on its best diagonal and …Bg4 pinning White's knight. In a normal French these bishops are problem pieces; in the Exchange they're our best pieces. We develop with total freedom and perfect harmony.",
      sayShort: 'Bd6 + Bg4 — bishops unleashed.' }),
    b({ id: 'mg-plan', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Bd6 Bd3 Bg4',
      arrows: [{ from: 'd8', to: 'd7', color: SOFT }], highlights: [{ square: 'd5', color: KEY }],
      say: "Here's the middlegame — and it's dead level, but full of life if we want it. The plan: …Nc6 and …Qd7, then choose our king. Castle queenside and we can pawn-storm White's king; castle kingside for a calm game. With symmetric pawns but more active pieces, the Exchange French is a draw offer we happily decline and play to win. Don't fear it — relish it.",
      sayShort: '…Nc6, …Qd7 — pick your attack.' }),
  ],
};

export const PRO_GOTHAMCHESS_FRENCH_DEFENSE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-french-defense::Rubinstein Main Line': RUBINSTEIN,
  'pro-gothamchess-french-defense::Tarrasch (Nd2)': TARRASCH,
  'pro-gothamchess-french-defense::Exchange (exd5 lines)': EXCHANGE,
};
