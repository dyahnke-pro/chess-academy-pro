import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — French per-variation lessons (Black). Names match
// pro-repertoires.json. Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-ericrosen-french';
const SRC = ['concept:pawn-chain', 'concept:pos-development', 'https://www.chess.com/openings/French-Defense', 'https://api.chess.com/pub/player/imrosen/games/archives'];

const VS_ADVANCE: LessonScript = {
  openingId: OID, title: 'French — vs Advance (…c5)', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e5', moves: 'e4 e6 d4 d5 e5 c5',
      arrows: [A('c5', 'd4')], highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: KEY }],
      say: "Against the Advance, White grabs space with e5 and locks the centre — so we immediately strike the base of the chain with …c5. The whole Advance French is a fight over the d4-pawn; we attack it from move three.",
      sayShort: '…c5 — hit the chain at d4.' }),
    b({ id: 'qb6', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6',
      arrows: [A('d8', 'b6'), A('b6', 'd4')], highlights: [{ square: 'b6', color: KEY }, { square: 'd4', color: KEY }],
      say: "…Nc6 and …Qb6 pile up on d4 and the soft b2/d4 squares. The queen on b6 is a classic French battery piece — it pressures the centre and the queenside while White is tied to defending the base of the chain.",
      sayShort: '…Qb6 — pressure d4 and b2.' }),
    b({ id: 'c4', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5',
      arrows: [A('c5', 'c4'), A('c6', 'a5')], highlights: [{ square: 'c4', color: KEY }, { square: 'a5', color: SOFT }],
      say: "…c4! A thematic space-gaining clamp: it fixes the queenside, grabs the b3-square, and frees Black to expand. …Na5 follows, heading for the juicy b3-hole and supporting the …b5-b4 minority attack. Black has a clear, comfortable plan against White's locked centre.",
      sayShort: '…c4, …Na5 — clamp and expand.' }),
  ],
};

const VS_TARRASCH: LessonScript = {
  openingId: OID, title: 'French — vs Tarrasch (Nd2)', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nd2', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7',
      highlights: [{ square: 'd2', color: SOFT }, { square: 'd7', color: KEY }],
      say: "The Tarrasch (Nd2) avoids the …Bb4 pin. We play the classical …Nf6 and, after e5, retreat …Nfd7 — ready to undermine the centre. The knight on d2 is more passive than on c3, which gives us an easy target structure.",
      sayShort: '…Nf6, …Nfd7 — classical Tarrasch.' }),
    b({ id: 'c5', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6',
      arrows: [A('c7', 'c5'), A('b8', 'c6')], highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: KEY }],
      say: "…c5 and …Nc6 hit d4 with everything, the standard French recipe. Because White's knight sits passively on d2, the pressure on the centre is even more effective here than in the Classical.",
      sayShort: '…c5, …Nc6 — hammer d4.' }),
    b({ id: 'plan', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2',
      arrows: [A('d8', 'b6'), A('f7', 'f6')], highlights: [{ square: 'b6', color: SOFT }, { square: 'f6', color: KEY }],
      say: "White props the centre with Ne2; Black continues with …Qb6 hitting d4 and, at the right moment, …f6 to blast open the centre against White's slightly passive setup. Black gets active, comfortable play with a clear plan — and Rosen scores well here.",
      sayShort: 'Plan: …Qb6, then …f6 break.' }),
  ],
};

const VS_EXCHANGE: LessonScript = {
  openingId: OID, title: 'French — vs Exchange', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'exd5', moves: 'e4 e6 d4 d5 exd5 exd5',
      arrows: [A('e6', 'd5')], highlights: [{ square: 'd5', color: KEY }],
      say: "The Exchange French is White's bid for a quiet draw — symmetrical pawns after exd5 exd5. We are happy: the position opens up our normally-cramped pieces, and with accurate, active development Black has full equality and can play for more.",
      sayShort: '…exd5 — symmetrical, play for more.' }),
    b({ id: 'bd6', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6',
      arrows: [A('f8', 'd6')], highlights: [{ square: 'd6', color: KEY }],
      say: "We mirror White's development but aim for activity: …Nf6 and …Bd6, placing the bishop on its best diagonal toward h2. The trick in the Exchange is to NOT be symmetrical for too long — grab a useful square or tempo before White does.",
      sayShort: '…Bd6 — active bishop, break symmetry.' }),
    b({ id: 'oo', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O',
      arrows: [A('c8', 'g4'), A('b8', 'c6')], highlights: [{ square: 'd5', color: KEY }],
      say: "Both castle into a balanced, open game. From here Black develops …Bg4 or …Bf5, …Nc6 or …c6, and plays for an initiative on whichever side White commits to. A 'drawish' line that, played actively, gives Black every chance to outplay an opponent who only wanted a handshake.",
      sayShort: '…O-O — balanced, active chances.' }),
  ],
};

export const PRO_ERICROSEN_FRENCH_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs Advance (…c5)`]: VS_ADVANCE,
  [`${OID}::vs Tarrasch (Nd2)`]: VS_TARRASCH,
  [`${OID}::vs Exchange`]: VS_EXCHANGE,
};
