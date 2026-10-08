import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — vs Caro per-variation lessons (White), 2.c4 Panov complex.
// Names match pro-repertoires.json. Two registers; no move-number prefixes;
// green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-caro-white';
const SRC = ['concept:pos-center', 'concept:pawn-isolated', 'https://www.chess.com/openings/Caro-Kann-Defense-Panov-Attack', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const VS_E6: LessonScript = {
  openingId: OID, title: 'vs Caro — 2…e6 (French-style)', minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e6', moves: 'e4 c6 c4 e6 Nc3 d5 cxd5',
      arrows: [], highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
      say: "When Black plays …e6 and …d5, the push e5 looks tempting, but it lets Black clamp the centre with …d4 and the engine soon prefers Black. Instead trade: cxd5 opens the position while you are the one with pieces ready to use it.",
      sayShort: 'cxd5 — open it up, skip e5.' }),
    b({ id: 'space', moves: 'e4 c6 c4 e6 Nc3 d5 cxd5 cxd5 exd5 exd5 Nf3 Nc6',
      arrows: [], highlights: [{ square: 'd5', color: KEY }, { square: 'f3', color: SOFT }],
      say: "After the trades the centre is symmetrical — each side keeps one d-pawn — and the e-file and c-file are open. You develop Nf3, and Black answers …Nc6.",
      sayShort: 'Nf3 — develop into the open game.' }),
    b({ id: 'plan', moves: 'e4 c6 c4 e6 Nc3 d5 cxd5 cxd5 exd5 exd5 Nf3 Nc6 Bb5 Bc5 d4 Bb6',
      arrows: [A('b5', 'c6')], highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Bb5 puts pressure on the c6-knight, d4 fixes the centre, and Black's bishop drops back to b6. The engine calls the position level. The game is about piece play around the d4- and d5-pawns: castle, put a rook on the open e-file, and develop the dark-squared bishop to g5 or e3.",
      sayShort: 'Plan: castle, e-file, piece play.' }),
  ],
};

const EXCHANGE: LessonScript = {
  openingId: OID, title: 'vs Caro — Exchange (2.d4 d5 3.exd5)', minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'exd5', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3',
      arrows: [], highlights: [{ square: 'd3', color: KEY }, { square: 'h7', color: SOFT }],
      say: "When you keep it simple with d4 and the Exchange, you develop the bishop to d3 aiming at h7 and brace the centre with c3. A solid, low-theory structure where White has a tiny but pleasant space edge and easy development.",
      sayShort: 'Bd3, c3 — solid Exchange.' }),
    b({ id: 'bf4', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3',
      arrows: [], highlights: [{ square: 'b3', color: KEY }, { square: 'b7', color: SOFT }],
      say: "You develop Bf4 and, when Black pins with …Bg4, hit the queenside with Qb3 — double-attacking the b7-pawn and the d5-pawn. Black must react carefully; White grabs the initiative with simple, natural moves.",
      sayShort: 'Qb3 — hit b7 and d5.' }),
    b({ id: 'plan', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bd6',
      arrows: [A('f4', 'd6'), A('d2', 'f3')], highlights: [{ square: 'd5', color: KEY }],
      say: "The plan: complete development with Nd2-f3, trade off Black's good pieces, and pressure the slightly weak d5-pawn and the queenside. The minority attack with b4-b5 is a standard way to create a target. A risk-free positional grind.",
      sayShort: 'Plan: pressure d5, minority attack.' }),
  ],
};

export const PRO_SAMAYRAINA_CARO_WHITE_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::2…e6 (French-style)`]: VS_E6,
  [`${OID}::Exchange (3.exd5)`]: EXCHANGE,
};
