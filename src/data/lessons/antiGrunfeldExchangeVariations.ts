import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Grünfeld (Exchange, 4.cxd5) — per-variation master class. The student
// plays WHITE. Keyed `${openingId}::${variationName}` to match anti-openings.json.
// The Classical …O-O line: build the big c3-d4-e4 centre, develop with Ne2/Be3,
// and hold it against Black's …c5/…Nc6/…Bg4 pressure. Spine rebuilt with
// build-sound-spine.mjs (no both-sides blunder), engine-verified +0.55. The
// …c5 tab was dropped (a 14-ply prefix of the main lesson). Highlights mark
// named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'];
const OID = 'anti-grunfeld-exchange';

const OO_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Grünfeld Exchange vs …O-O — hold the big centre', minutes: 6,
  beats: [
    b({ id: 'gru-oo-1', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 O-O',
      say: "The Grünfeld Exchange: Black hands you a massive pawn centre with c3-d4-e4, betting on tearing it down later. When Black castles rather than striking immediately, you get the classical dream — a broad centre and the bishop on c4 raking toward f7. Develop smoothly and the centre becomes a battering ram.",
      sayShort: "Big centre, Bc4 — the classical dream.",
      highlights: [H('c4', KEY), H('d4', SOFT), H('e4', SOFT)] }),
    b({ id: 'gru-oo-2', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 O-O Ne2 c5 O-O',
      say: "Ne2 is the key square — it supports d4 without blocking the c1-bishop or the f-pawn. Black strikes at the centre with c5; you calmly castle. The centre holds firm, and your pieces are harmoniously placed behind it, ready to meet every attack on d4.",
      sayShort: "Ne2 — support d4 the right way.",
      highlights: [H('e2', KEY), H('d4', SOFT), H('c5', SOFT)] }),
    b({ id: 'gru-oo-3', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 O-O Ne2 c5 O-O Nc6 Be3 Bg4',
      say: "Black develops Nc6, piling onto d4, and pins your knight with Bg4; you reinforce with Be3. The tension is at its peak — but your centre is a fortress. Every black piece is now committed to attacking d4, and it simply holds. Overextension is Black's risk, not yours.",
      sayShort: "Be3 — reinforce, the centre holds.",
      highlights: [H('e3', KEY), H('d4', KEY), H('g4', SOFT)] }),
    b({ id: 'gru-oo-4', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 O-O Ne2 c5 O-O Nc6 Be3 Bg4 f3 Na5',
      say: "f3 kicks the bishop and cements e4; Black's knight jumps to a5 to trade off your strong c4-bishop. But you've weathered the storm — the big centre stands, you own more space, and the engine confirms a clear edge for White. The Grünfeld's pressure has been contained and now the centre is ready to roll.",
      sayShort: "f3 — cement the centre, clear edge.",
      highlights: [H('f3', KEY), H('e4', SOFT), H('a5', SOFT)] }),
  ],
};

export const ANTI_GRUNFELD_EXCHANGE_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Exchange Variation, Classical Variation (O-O)`]: OO_LESSON,
};
