import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — King's Gambit per-variation lessons (White). His real
// declined / Falkbeer responses from the corpus. Names match pro-repertoires.json.
// Two registers; no move-number prefixes; green vision arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-kings-gambit';
const SRC = ['concept:att-kingside-storm', 'concept:pos-development', 'https://www.chess.com/openings/Kings-Gambit', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const VS_DECLINED: LessonScript = {
  openingId: OID, title: "vs King's Gambit Declined (…Nc6)", minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf3', moves: 'e4 e5 f4 Nc6 Nf3 d6 Bc4',
      arrows: [A('c4', 'f7')], highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: SOFT }],
      say: "When Black declines with Nc6, Samay just builds the dream setup: Nf3, Bc4 on the a2-g8 diagonal, and the centre intact. Declining hands White a free, harmonious King's-Gambit position with no pawn given.",
      sayShort: 'Nf3, Bc4 — build, no pawn given.' }),
    b({ id: 'oo', moves: 'e4 e5 f4 Nc6 Nf3 d6 Bc4 Bg4 O-O Nf6 Nc3 Be7 d3',
      highlights: [{ square: 'f4', color: KEY }, { square: 'e4', color: SOFT }],
      say: "We castle, develop Nc3 and brace with d3. The tension on f4 and e5 is ours to release; White stands ready to open the f-file at the perfect moment.",
      sayShort: 'O-O, Nc3, d3 — coil the spring.' }),
    b({ id: 'plan', moves: 'e4 e5 f4 Nc6 Nf3 d6 Bc4 Bg4 O-O Nf6 Nc3 Be7 d3 O-O fxe5 Nxe5',
      arrows: [A('f1', 'f7')], highlights: [{ square: 'f7', color: KEY }, { square: 'e5', color: SOFT }],
      say: "The plan: open the f-file with fxe5, pile the rook and pieces on f7, and use the e4-d5 break to blow the centre open. Even when Black declines, the King's Gambit attack arrives — just a move later.",
      sayShort: 'Plan: fxe5, hammer f7.' }),
  ],
};

const VS_FALKBEER: LessonScript = {
  openingId: OID, title: 'vs Falkbeer (…d5)', minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'exd5', moves: 'e4 e5 f4 d5 exd5 exf4',
      arrows: [], highlights: [{ square: 'd5', color: KEY }, { square: 'f4', color: SOFT }],
      say: "The Falkbeer counter-strike d5; Samay takes exd5 and lets Black recapture on f4. The d5-pawn is a thorn that cramps Black, and White keeps a clean development edge.",
      sayShort: 'exd5 — keep the d5 thorn.' }),
    b({ id: 'd4', moves: 'e4 e5 f4 d5 exd5 exf4 Nf3 Nf6 d4 Nxd5 Bc4',
      arrows: [A('c4', 'd5')], highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "We develop Nf3, build the centre with d4, and hit the knight with Bc4. Black's pieces get bounced around while White finishes development with tempo and the better structure.",
      sayShort: 'Nf3, d4, Bc4 — develop with tempo.' }),
    b({ id: 'plan', moves: 'e4 e5 f4 d5 exd5 exf4 Nf3 Nf6 d4 Nxd5 Bc4 Nb6 Bb3 Bg4 Bxf4',
      arrows: [A('b3', 'f7')], highlights: [{ square: 'f7', color: KEY }, { square: 'f4', color: SOFT }],
      say: "The plan: regain f4 with the bishop, keep the strong b3-bishop trained on f7, and castle into a centre where White's freer pieces and pawn front carry the initiative. The Falkbeer is met with calm, classical development.",
      sayShort: 'Plan: Bxf4, press f7, castle.' }),
  ],
};

export const PRO_SAMAYRAINA_KINGS_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs King's Gambit Declined (…Nc6)`]: VS_DECLINED,
  [`${OID}::vs Falkbeer (…d5)`]: VS_FALKBEER,
};
