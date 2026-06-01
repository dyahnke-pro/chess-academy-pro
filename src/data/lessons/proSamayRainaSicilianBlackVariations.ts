import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Sicilian (Black) per-variation lessons. DATA-REBUILT
// 2026-06-01: his REAL anti-Sicilian responses from his corpus (Bc4 626g,
// Alapin …d5 332g, Rossolimo …Nd4 214g, Closed 555g), not theory defaults.
// Names match pro-repertoires.json. Two registers; no move-number prefixes.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-sicilian-black';
const SRC = ['concept:pos-development', 'concept:pos-space', 'https://www.chess.com/openings/Sicilian-Defense', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const VS_BC4: LessonScript = {
  openingId: OID, title: 'Sicilian — vs Bc4 (Bowdler)', minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e6-d5', moves: 'e4 c5 Bc4 e6 Nf3 d5',
      arrows: [], highlights: [{ square: 'd5', color: KEY }, { square: 'c4', color: SOFT }],
      say: "The early Bc4 is Samay's most-faced anti-Sicilian. He meets it the principled way: e6 then d5, striking the centre and hitting the c4-bishop in one stroke. Black seizes space and gains a tempo.",
      sayShort: '…e6, …d5 — hit the c4-bishop.' }),
    b({ id: 'nc6', moves: 'e4 c5 Bc4 e6 Nf3 d5 exd5 exd5 Bb5+ Nc6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'd5', color: SOFT }],
      say: "After the trade on d5 White tries Bb5 with check; we simply block with Nc6, developing with tempo. Black has an open, free position and the easier pieces to play.",
      sayShort: '…Nc6 — block the check, develop.' }),
    b({ id: 'plan', moves: 'e4 c5 Bc4 e6 Nf3 d5 exd5 exd5 Bb5+ Nc6 O-O Nf6 Re1+ Be7 Nc3 O-O d3',
      highlights: [{ square: 'd5', color: KEY }, { square: 'e8', color: SOFT }],
      say: "We finish naturally — Nf6, Be7, castle — meeting the e-file check with a calm Be7. With central space and harmonious development, Black equalises comfortably and plays for the initiative against White's loose bishop sorties.",
      sayShort: 'Plan: develop, castle, press the centre.' }),
  ],
};

const VS_ALAPIN: LessonScript = {
  openingId: OID, title: 'Sicilian — vs Alapin (2.c3)', minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd5', moves: 'e4 c5 c3 d5',
      arrows: [], highlights: [{ square: 'd5', color: KEY }, { square: 'e4', color: SOFT }],
      say: "Against the Alapin's c3, Samay plays the principled d5 — hitting e4 in the centre at once. This is far stronger than a passive knight move: Black equalises in the centre immediately and frees every piece.",
      sayShort: '…d5 — strike the centre.' }),
    b({ id: 'bg4', moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4',
      arrows: [A('g4', 'f3')], highlights: [{ square: 'g4', color: KEY }, { square: 'f3', color: KEY }],
      say: "We recapture with Qxd5, develop Nf6, and pin the f3-knight with Bg4. Every move develops with purpose, and Black already eyes White's isolated d-pawn as the long-term target.",
      sayShort: '…Bg4 — pin the f3-knight.' }),
    b({ id: 'plan', moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6 O-O Be7 h3 Bh5',
      highlights: [{ square: 'd4', color: KEY }, { square: 'h5', color: SOFT }],
      say: "The plan: complete development with e6 and Be7, keep the pin alive by retreating the bishop to h5, and play against the isolated d-pawn. A comfortable, equal game where Black holds the clearer targets.",
      sayShort: 'Plan: …e6, …Be7, target the IQP.' }),
  ],
};

const VS_ROSSOLIMO: LessonScript = {
  openingId: OID, title: 'Sicilian — vs Rossolimo (Bb5)', minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nd4', moves: 'e4 c5 Nf3 Nc6 Bb5 Nd4',
      arrows: [A('d4', 'b5')], highlights: [{ square: 'd4', color: KEY }, { square: 'b5', color: SOFT }],
      say: "Against the Rossolimo Bb5, Samay's choice is the bold Nd4 — leaping into the centre and offering the trade. It hits the b5-bishop and, after the exchange, leaves Black with a strong pawn on d4 and easy development.",
      sayShort: '…Nd4 — central leap, hit b5.' }),
    b({ id: 'e5', moves: 'e4 c5 Nf3 Nc6 Bb5 Nd4 Nxd4 cxd4 O-O e5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: KEY }],
      say: "After Nxd4 cxd4 we castle and clamp the centre with e5. The d4-pawn cramps White and hands Black a broad, mobile pawn front — a rich, double-edged game where Black calls the tune.",
      sayShort: '…e5 — clamp, build the centre.' }),
    b({ id: 'plan', moves: 'e4 c5 Nf3 Nc6 Bb5 Nd4 Nxd4 cxd4 O-O e5 c3 Bc5 cxd4 Bxd4 Nc3 Nf6',
      highlights: [{ square: 'd4', color: KEY }, { square: 'f6', color: SOFT }],
      say: "The plan: post the bishop actively on c5 and d4, finish with Nf6, and use the central space and bishop pair. Black plays for the initiative with the freer, more active game.",
      sayShort: 'Plan: …Bc5/…Bd4, …Nf6, press.' }),
  ],
};

const VS_CLOSED: LessonScript = {
  openingId: OID, title: 'Sicilian — vs Closed (2.Nc3)', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nc6-e6', moves: 'e4 c5 Nc3 Nc6 Nf3 e6 d4',
      highlights: [{ square: 'e6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "When White develops Nc3 and Nf3 and then opens with d4, the game heads toward an Open Sicilian. Samay meets it flexibly with Nc6 and e6 — a solid, resilient setup that keeps all the structures open.",
      sayShort: '…Nc6, …e6 — flexible setup.' }),
    b({ id: 'bc5', moves: 'e4 c5 Nc3 Nc6 Nf3 e6 d4 cxd4 Nxd4 Bc5',
      arrows: [A('c5', 'd4')], highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: KEY }],
      say: "After cxd4 Nxd4 we develop the bishop with bite to c5, eyeing the d4-knight and fighting for the dark squares and the centre.",
      sayShort: '…Bc5 — pressure the d4-knight.' }),
    b({ id: 'plan', moves: 'e4 c5 Nc3 Nc6 Nf3 e6 d4 cxd4 Nxd4 Bc5 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O',
      highlights: [{ square: 'd5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "The plan: recapture bxc6 to build a centre, break with d5 to free the position, and castle into a comfortable middlegame with active pieces and no weaknesses. Black equalises with ease.",
      sayShort: 'Plan: …bxc6, …d5, free the game.' }),
  ],
};

export const PRO_SAMAYRAINA_SICILIAN_BLACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs Bc4 (Bowdler)`]: VS_BC4,
  [`${OID}::vs Alapin (2.c3)`]: VS_ALAPIN,
  [`${OID}::vs Rossolimo (Bb5)`]: VS_ROSSOLIMO,
  [`${OID}::vs Closed (2.Nc3)`]: VS_CLOSED,
};
