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
    b({ id: 'e6', moves: 'e4 c6 c4 e6 Nc3 d5 e5',
      arrows: [], highlights: [{ square: 'e5', color: KEY }, { square: 'd5', color: SOFT }],
      say: "When Black plays …e6 and …d5, we get a French structure but with our c-pawn already on c4. We advance e5, grabbing space and locking the centre — and Black's light-squared bishop is buried behind the e6-pawn, the chronic French problem.",
      sayShort: 'e5 — French with c4 in hand.' }),
    b({ id: 'space', moves: 'e4 c6 c4 e6 Nc3 d5 e5 d4 Nce2 c5 Ng3 Nc6 Nf3',
      arrows: [], highlights: [{ square: 'g3', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Black tries to clamp with …d4, so we reroute the knight via e2 to g3, eyeing the f5 and h5 squares for a kingside attack. The e5-pawn cramps Black and our pieces flow to the kingside — a classic space-and-attack setup.",
      sayShort: 'Nce2-g3 — reroute to the kingside.' }),
    b({ id: 'plan', moves: 'e4 c6 c4 e6 Nc3 d5 e5 d4 Nce2 c5 Ng3 Nc6 Nf3 Nge7',
      arrows: [A('f1', 'd3'), A('f3', 'g5')], highlights: [{ square: 'f5', color: KEY }, { square: 'h7', color: SOFT }],
      say: "The plan: develop Bd3 and castle, then use the g3-knight and the space advantage to attack on the kingside with Nf5 or h4-h5. Behind the e5-wedge, White has the freer game and the attacking chances while Black stays cramped.",
      sayShort: 'Plan: Bd3, Nf5, kingside attack.' }),
  ],
};

const EXCHANGE: LessonScript = {
  openingId: OID, title: 'vs Caro — Exchange (2.d4 d5 3.exd5)', minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'exd5', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3',
      arrows: [], highlights: [{ square: 'd3', color: KEY }, { square: 'h7', color: SOFT }],
      say: "When we keep it simple with d4 and the Exchange, we develop the bishop to d3 aiming at h7 and brace the centre with c3. A solid, low-theory structure where White has a tiny but pleasant space edge and easy development.",
      sayShort: 'Bd3, c3 — solid Exchange.' }),
    b({ id: 'bf4', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3',
      arrows: [], highlights: [{ square: 'b3', color: KEY }, { square: 'b7', color: SOFT }],
      say: "We develop Bf4 and, when Black pins with …Bg4, hit the queenside with Qb3 — double-attacking the b7-pawn and the d5-pawn. Black must react carefully; White grabs the initiative with simple, natural moves.",
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
