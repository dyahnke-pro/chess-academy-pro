import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-QGD (Exchange, cxd5 exd5) — per-variation master class. The student plays
// WHITE. Keyed `${openingId}::${variationName}` to match anti-openings.json. The
// …Be7 move order into the Carlsbad: Bg5 pin, Bd3+Qc2 battery, and the minority
// attack plan. Spine rebuilt with build-sound-spine.mjs (no both-sides blunder),
// engine-verified +0.32. The …c6 tab was dropped (a 12-ply prefix of the main
// lesson). Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'];
const OID = 'anti-qgd-exchange';

const BE7_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'QGD Exchange vs …Be7 — the Carlsbad squeeze', minutes: 6,
  beats: [
    b({ id: 'qgd-be7-1', moves: 'd4 d5 c4 e6 cxd5 exd5 Nc3 Nf6 Bg5 Be7',
      say: "The Queen's Gambit Declined Exchange: after cxd5 exd5 you reach the classic Carlsbad structure. Black develops the bishop to e7 rather than committing to …c6. Bg5 pins the f6-knight. Your plan is textbook and time-honoured — the minority attack, b4-b5 on the queenside, to manufacture a lasting weakness in Black's camp.",
      sayShort: "Bg5 pin — head for the minority attack.",
      highlights: [H('g5', KEY), H('d5', SOFT)] }),
    b({ id: 'qgd-be7-2', moves: 'd4 d5 c4 e6 cxd5 exd5 Nc3 Nf6 Bg5 Be7 e3 O-O Bd3 Nbd7',
      say: "You build a harmonious setup: e3 solidifies, and Bd3 trains on the b1-h7 diagonal toward Black's king. Black castles and develops Nbd7 behind the solid wall. This is the classic Carlsbad — you have a clear, two-sided plan while Black must defend patiently and accurately.",
      sayShort: "Bd3 — aim at the king, build the plan.",
      highlights: [H('d3', KEY)] }),
    b({ id: 'qgd-be7-3', moves: 'd4 d5 c4 e6 cxd5 exd5 Nc3 Nf6 Bg5 Be7 e3 O-O Bd3 Nbd7 Nge2 c6 Qc2 Re8',
      say: "Nge2 completes development and Qc2 lines up with the bishop on the b1-h7 diagonal — a battery pointed straight at h7 and Black's king. Black shores up with c6 and Re8. You are fully mobilised behind the Carlsbad, free to choose the minority attack or a kingside pawn storm.",
      sayShort: "Qc2 — the battery aims at h7.",
      highlights: [H('c2', KEY), H('d3', SOFT)] }),
    b({ id: 'qgd-be7-4', moves: 'd4 d5 c4 e6 cxd5 exd5 Nc3 Nf6 Bg5 Be7 e3 O-O Bd3 Nbd7 Nge2 c6 Qc2 Re8 O-O a5 Bh4 h6',
      say: "You castle, Black grabs queenside space with a5, and you keep the pin with Bh4 as Black plays h6. You stand comfortably better — fully developed, the queen-and-bishop battery trained on the king, and the minority attack in hand. A textbook QGD Exchange squeeze with a clear, durable pull.",
      sayShort: "Bh4 — keep the pin, clear pull.",
      highlights: [H('h4', KEY), H('c2', SOFT)] }),
  ],
};

export const ANTI_QGD_EXCHANGE_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Queen's Gambit Declined (Be7)`]: BE7_LESSON,
};
