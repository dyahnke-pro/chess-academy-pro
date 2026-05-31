import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — Scandinavian per-variation lessons (Black). Names match
// pro-repertoires.json. Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-ericrosen-scandinavian';
const SRC = ['concept:pos-development', 'https://www.chess.com/openings/Scandinavian-Defense', 'https://api.chess.com/pub/player/imrosen/games/archives'];

const VS_NC3: LessonScript = {
  openingId: OID, title: 'Scandinavian — vs Nc3 (…Nxd5)', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nc3', moves: 'e4 d5 exd5 Nf6 Nc3 Nxd5',
      arrows: [A('f6', 'd5')], highlights: [{ square: 'd5', color: KEY }],
      say: "If White defends the pawn with Nc3, we just take it — …Nxd5 — reaching a comfortable, symmetrical-feeling position a tempo up on a Caro-Kann-style structure. The knight on d5 is well-placed and Black has no problems.",
      sayShort: '…Nxd5 — take it, easy game.' }),
    b({ id: 'g6', moves: 'e4 d5 exd5 Nf6 Nc3 Nxd5 Nf3 g6 Bc4 Nb6 Bb3',
      arrows: [A('f8', 'g7'), A('d5', 'b6')], highlights: [{ square: 'b6', color: KEY }, { square: 'g7', color: SOFT }],
      say: "We fianchetto with …g6 and, when White's bishop comes to c4 eyeing f7, tuck the knight back to b6 to hit it. After Bb3 we have a sound, flexible setup with the dragon-style bishop coming to g7.",
      sayShort: '…g6, …Nb6 — fianchetto, hit Bc4.' }),
    b({ id: 'oo', moves: 'e4 d5 exd5 Nf6 Nc3 Nxd5 Nf3 g6 Bc4 Nb6 Bb3 Bg7 O-O O-O',
      arrows: [A('g7', 'b2')], highlights: [{ square: 'g7', color: KEY }],
      say: "Both castle, and Black has a clean, harmonious position: the bishop on g7 rakes the long diagonal, the knights are active, and there are no structural weaknesses. A solid, fully-equal game where Black can play for a win.",
      sayShort: '…O-O — harmonious, fully equal.' }),
  ],
};

const VS_NF3: LessonScript = {
  openingId: OID, title: 'Scandinavian — vs Nf3 (…Nxd5)', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf3', moves: 'e4 d5 exd5 Nf6 Nf3 Nxd5',
      arrows: [A('f6', 'd5')], highlights: [{ square: 'd5', color: KEY }],
      say: "When White develops Nf3 to hold the pawn, …Nxd5 regains it at once. Black gets quick, easy development with the knight centralised — none of the queen-chasing that plagues the old Scandinavian.",
      sayShort: '…Nxd5 — pawn back, knight centred.' }),
    b({ id: 'bg4', moves: 'e4 d5 exd5 Nf6 Nf3 Nxd5 d4 Bg4',
      arrows: [A('c8', 'g4'), A('g4', 'f3')], highlights: [{ square: 'g4', color: KEY }, { square: 'f3', color: SOFT }],
      say: "…Bg4 pins the f3-knight and develops the problem bishop actively before …e6 shuts it in. This is the recurring Rosen Scandinavian theme — solve the light-bishop first, and the rest of the position plays itself.",
      sayShort: '…Bg4 — pin Nf3, free the bishop.' }),
    b({ id: 'develop', moves: 'e4 d5 exd5 Nf6 Nf3 Nxd5 d4 Bg4 Be2 e6 O-O Be7',
      arrows: [A('f8', 'e7')], highlights: [{ square: 'e7', color: KEY }, { square: 'd5', color: SOFT }],
      say: "After …e6 and …Be7 Black completes a solid, classical setup — bishop already developed outside the chain, knight strong on d5, ready to castle. A risk-free, equal Scandinavian where Black is comfortable in every piece.",
      sayShort: '…e6, …Be7 — solid and equal.' }),
  ],
};

export const PRO_ERICROSEN_SCANDINAVIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs Nc3 (…Nxd5)`]: VS_NC3,
  [`${OID}::vs Nf3 (…Nxd5)`]: VS_NF3,
};
