import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Sicilian (Black) per-variation lessons. Anti-Sicilians he
// faces most. Names match pro-repertoires.json. Two registers; no move-number
// prefixes in spoken text; green vision arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-sicilian-black';
const SRC = ['concept:pos-development', 'concept:pos-space', 'https://www.chess.com/openings/Sicilian-Defense', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const VS_ALAPIN: LessonScript = {
  openingId: OID, title: 'Sicilian — vs Alapin (2.c3)', minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf6', moves: 'e4 c5 c3 Nf6 e5 Nd5',
      arrows: [], highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Against the Alapin we play …Nf6, provoking e5, then hop the knight to d5. The advanced e5-pawn looks strong but it is also a target, and from d5 our knight is centralised and active — Black gets a comfortable, dynamic game.",
      sayShort: '…Nf6, …Nd5 — centralise the knight.' }),
    b({ id: 'cxd4', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4',
      arrows: [], highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "We strike the centre with …cxd4 and develop …Nc6, hitting d4 and the e5-pawn. White ends up with an isolated d-pawn, and Black has active pieces and clear targets — exactly the kind of position where the Alapin's quiet reputation works in Black's favour.",
      sayShort: '…cxd4, …Nc6 — hit the centre.' }),
    b({ id: 'plan', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb5 dxe5 Nxe5 Bd7',
      arrows: [], highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "The plan: undermine the e5-pawn with …d6, kick the bishop with …Nb6, and trade off into a position where White's isolated d-pawn is a permanent weakness. Black develops easily and plays against the static target. A comfortable, fully-equal game.",
      sayShort: 'Plan: …d6, target the IQP.' }),
  ],
};

const VS_MOSCOW: LessonScript = {
  openingId: OID, title: 'Sicilian — vs Bb5+ (Moscow)', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bd7', moves: 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7',
      arrows: [], highlights: [{ square: 'd7', color: KEY }],
      say: "The Moscow (Bb5+). We block with …Bd7 and, after the trade, recapture with the queen — happily exchanging off White's bishop. Black has a solid, sound structure with the bishop pair gone but no weaknesses, and an easy plan ahead.",
      sayShort: '…Bd7, …Qxd7 — trade and stay solid.' }),
    b({ id: 'develop', moves: 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 c4 Nc6 Nc3 g6',
      arrows: [], highlights: [{ square: 'g6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "When White grabs space with c4 (the Maroczy Bind), we develop solidly — …Nc6 and …g6 to fianchetto. Yes, White has space, but Black's position is rock-solid with no targets, and the …g6 setup pressures the long diagonal.",
      sayShort: '…Nc6, …g6 — solid vs the bind.' }),
    b({ id: 'plan', moves: 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 c4 Nc6 Nc3 g6 d4 cxd4 Nxd4 Bg7',
      arrows: [A('d7', 'd8')], highlights: [{ square: 'g7', color: KEY }, { square: 'd4', color: SOFT }],
      say: "The plan against the Maroczy: fianchetto with …Bg7, castle, trade a pair of knights to relieve the cramp, and expand with …a6 and …b5 or …Nd7-c5. Patient, structural Sicilian play — Black holds firm and waits for White to overextend.",
      sayShort: 'Plan: …Bg7, trade, expand …b5.' }),
  ],
};

const VS_CLOSED: LessonScript = {
  openingId: OID, title: 'Sicilian — vs Closed (2.Nc3)', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nc6', moves: 'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7',
      arrows: [], highlights: [{ square: 'g7', color: KEY }, { square: 'g2', color: SOFT }],
      say: "Against the Closed Sicilian we mirror White's setup: …Nc6, …g6 and …Bg7. Both sides fianchetto and the game becomes a slow, strategic battle for the centre and the queenside — Black has every resource White does.",
      sayShort: '…g6, …Bg7 — mirror the setup.' }),
    b({ id: 'e5', moves: 'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 Be3 e5',
      arrows: [], highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "We grab central space with …e5, fixing the structure and claiming the d4-square for our pieces. This is the principled Closed Sicilian plan for Black: stake out the centre, then expand on the queenside where we are naturally faster.",
      sayShort: '…e5 — grab the centre.' }),
    b({ id: 'plan', moves: 'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 Be3 e5 Qd2 Nge7 Nge2 O-O',
      arrows: [], highlights: [{ square: 'b5', color: KEY }, { square: 'c4', color: SOFT }],
      say: "The plan: develop …Nge7 toward d4 and f5, castle, and launch the queenside expansion with …a6, …Rb8 and …b5-b4 to attack White's knight and open lines. In the opposite-wings race of the Closed Sicilian, Black's queenside play is the faster.",
      sayShort: 'Plan: …Nge7, …b5-b4 queenside storm.' }),
  ],
};

export const PRO_SAMAYRAINA_SICILIAN_BLACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs Alapin (2.c3)`]: VS_ALAPIN,
  [`${OID}::vs Bb5+ (Moscow)`]: VS_MOSCOW,
  [`${OID}::vs Closed (2.Nc3)`]: VS_CLOSED,
};
