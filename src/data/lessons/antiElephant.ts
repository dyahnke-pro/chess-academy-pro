import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Elephant Gambit — video-grounded Watch build (David 2026-07-15). The
// student plays WHITE. The gambit David's own weakness page flagged as his
// worst matchup — now a curated answer. Corpus: 63 games @ 72.2% (data/
// sources/danielnaroditsky-trees/anti-elephant.json; the rare 2.exd5 tries
// scored only 35.7% — the DATA itself teaches the right capture). Teaching
// mined from the dedicated video — paraphrased, never quoted. Engine-verified
// 2026-07-15: main +0.37 at 26 plies (queens traded, comfortable edge); the
// greedy …Qg5 trick REFUTED by Bxf7+! at +1.35. Red-target grammar.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const RED = 'rgba(239,68,68,0.72)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = 'green'): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:tac-fork', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Elephant_Gambit'];

export const ANTI_ELEPHANT_LESSON: LessonScript = {
  openingId: 'anti-elephant',
  sources: SRC,
  title: 'Taming the Elephant Gambit',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'ael-1', moves: 'e4 e5 Nf3 d5',
      say: "The Elephant Gambit: instead of defending the attacked e-pawn, Black counterattacks in the centre and dares you to get greedy. It looks scary the first time — two pawns hanging, everything loose — and that shock value is the entire opening. Objectively it's just unsound. The plan you're about to learn scores seventy-two percent across the corpus, and it starts by capturing the RIGHT pawn.",
      sayShort: "The Elephant — dare accepted.",
      highlights: [H('d5', KEY), H('e5', RED)] }),
    b({ id: 'ael-2', moves: 'e4 e5 Nf3 d5 Nxe5',
      say: "Take with the KNIGHT, not the pawn. The data is blunt about this: capturing on d5 with the pawn scores barely a third — it hands Black exactly the open, tricky game the gambit prays for. Knight takes e5 keeps the centre fluid on your terms: the knight sits on a monster square, eyes f7 and d7, and Black must now prove compensation that doesn't exist.",
      sayShort: "Nxe5 — the right capture.",
      arrows: [A('e5', 'f7'), A('e5', 'd7')],
      highlights: [H('e5', SOFT), H('f7', RED), H('d7', RED)] }),
    b({ id: 'ael-3', moves: 'e4 e5 Nf3 d5 Nxe5 Bd6 d4 dxe4 Bc4',
      say: "Black develops with tempo against your knight and grabs your e-pawn; you calmly reinforce with d4 and bring the bishop to its favorite diagonal — locked onto f7 again. Count the position: material level, but every White piece works while Black's compensation is a single advanced pawn that will drop. Notice the pattern with every unsound gambit: you don't refute it by grabbing everything. You refute it by developing while it flails.",
      sayShort: "d4, Bc4 — calm, f7 again.",
      arrows: [A('c4', 'f7')],
      highlights: [H('c4', SOFT), H('f7', RED), H('e4', RED)] }),
    b({ id: 'ael-4', moves: 'e4 e5 Nf3 d5 Nxe5 Bd6 d4 dxe4 Bc4 Bxe5 Qh5',
      say: "Black wins the knight — and walks into the move the whole line is built around. Queen to h5, forking mate on f7 and the loose bishop on e5. There is no answer that keeps both: Black must defend the mate, and the bishop comes off next move. This is the punishment for the gambit's whole philosophy — every Black move so far LOOKED active, and none of them addressed what White was actually doing.",
      sayShort: "Qh5 — f7 and e5, both burn.",
      arrows: [A('h5', 'f7'), A('h5', 'e5')],
      highlights: [H('h5', SOFT), H('f7', RED), H('e5', RED)] }),
    b({ id: 'ael-5', moves: 'e4 e5 Nf3 d5 Nxe5 Bd6 d4 dxe4 Bc4 Bxe5 Qh5 Qe7 Qxe5 Qxe5 dxe5 Nc6',
      say: "Black blocks with the queen, you collect the bishop, and the queens come off. Take stock of what the Elephant bought its owner: a queenless position, no attack, no tricks left — just your freer pieces against a pair of loose stragglers on e4 and e5. When Black rounds up your e5-pawn, development and the bishop pair keep the pull — the engine confirms a steady edge. Gambits live on chaos; this one just died of order.",
      sayShort: "Queens off — the gambit is dead.",
      highlights: [H('e5', SOFT), H('c6', KEY)] }),
    b({ id: 'ael-6', moves: 'e4 e5 Nf3 d5 Nxe5 Bd6 d4 dxe4 Bc4 Bxe5 Qh5 Qe7 Qxe5 Qxe5 dxe5 Nc6 Nc3 Nxe5 Bb3 Ne7 Bf4 N7g6 Bg3',
      say: "Into the endgame-flavored middlegame: develop the knight, tuck the bishop to b3 — still glaring at f7 from a safe distance — and post the dark-squared bishop where it harasses the e5-knight into awkwardness. Black spent the whole opening on one trick that didn't work, and now faces a long defense with zero winning chances. That's the Elephant tamed: one correct capture, one queen move, and order beats chaos for the rest of the game.",
      sayShort: "Bb3, Bg3 — order beats chaos.",
      arrows: [A('b3', 'f7'), A('g3', 'e5')],
      highlights: [H('b3', SOFT), H('f7', RED), H('e5', RED)] }),
  ],
};
