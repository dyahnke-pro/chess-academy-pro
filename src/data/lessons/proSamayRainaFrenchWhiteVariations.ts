import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — vs French (Exchange) per-variation lessons (White). Names
// match pro-repertoires.json. Two registers; no move-number prefixes in spoken
// text; green vision arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-french-white';
const SRC = ['concept:pawn-isolated', 'concept:pos-open-file', 'https://www.chess.com/openings/French-Defense-Exchange-Variation', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const VS_C5: LessonScript = {
  openingId: OID, title: 'French Exchange — vs …c5', minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c5', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 c5',
      arrows: [], highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "In the Exchange, when Black strikes with …c5 to break the symmetry, we are happy — it hands us an isolated-queen's-pawn position where our pieces become very active. The symmetry is gone and the game opens up in White's favour.",
      sayShort: '…c5 — Black opens the game.' }),
    b({ id: 'dxc5', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 c5 dxc5 Bxc5 O-O O-O',
      arrows: [A('f1', 'd3')], highlights: [{ square: 'd5', color: KEY }, { square: 'd3', color: SOFT }],
      say: "We take on c5 and castle, leaving Black with the isolated d5-pawn. The bishop on d3 eyes h7, our pieces flow to active squares, and the d5-pawn is a long-term target. White has the easier, more pleasant game.",
      sayShort: 'dxc5 — Black gets the IQP.' }),
    b({ id: 'plan', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 c5 dxc5 Bxc5 O-O O-O Nc3 Nc6',
      arrows: [A('c1', 'g5'), A('f3', 'e5')], highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
      say: "The plan: develop Nc3 and Bg5 to pile on d5, blockade the pawn with a knight on the d4-square, and pressure it down the d-file. Trade the right pieces and the isolated pawn becomes a chronic weakness. White presses a small but persistent edge.",
      sayShort: 'Plan: Bg5, blockade and press d5.' }),
  ],
};

const VS_BD6: LessonScript = {
  openingId: OID, title: 'French Exchange — vs …Bd6 symmetry', minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bd6', moves: 'e4 e6 d4 d5 exd5 exd5 Bd3 Bd6',
      arrows: [], highlights: [{ square: 'd3', color: KEY }, { square: 'd6', color: SOFT }],
      say: "Black mirrors our development with …Bd6. In the symmetrical Exchange, the player who gets to the good squares FIRST and breaks the symmetry gets the edge — so we play actively and grab the open e-file before Black does.",
      sayShort: '…Bd6 — race for the e-file.' }),
    b({ id: 'develop', moves: 'e4 e6 d4 d5 exd5 exd5 Bd3 Bd6 Nf3 Ne7 O-O O-O Re1 Bg4',
      arrows: [], highlights: [{ square: 'e1', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Nf3, castle, and Re1 — seizing the open e-file first. Black develops …Bg4 to pin, but we have the initiative and the more harmonious setup. The half-open e-file points at Black's position.",
      sayShort: 'Re1 — grab the e-file first.' }),
    b({ id: 'plan', moves: 'e4 e6 d4 d5 exd5 exd5 Bd3 Bd6 Nf3 Ne7 O-O O-O Re1 Bg4 c3 Nbd7',
      arrows: [A('c1', 'g5')], highlights: [{ square: 'b4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "The plan: brace the centre with c3, pin with Bg5, and launch the minority attack with b4-b5 to create a weakness on Black's queenside. Break the symmetry, target a pawn, and the small initiative snowballs — the Exchange played for a win, not a draw.",
      sayShort: 'Plan: Bg5, b4-b5 minority attack.' }),
  ],
};

export const PRO_SAMAYRAINA_FRENCH_WHITE_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs c5 break`]: VS_C5,
  [`${OID}::vs …Bd6 symmetry`]: VS_BD6,
};
