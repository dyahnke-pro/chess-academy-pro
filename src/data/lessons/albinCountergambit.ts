import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Albin Countergambit. Lead-the-eye §5a.
// Moves from repertoire.json (DB-anchored, G3); prose only. The Albin is a sharp
// gambit whose lines resolve before the middlegame proper, so the lesson is
// `kind: 'roadmap'` (sanctioned depth-gate opt-out).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Albin_Countergambit'];

export const ALBIN_COUNTERGAMBIT_LESSON: LessonScript = {
  openingId: 'albin-countergambit',
  sources: SRC,
  title: 'Albin Countergambit — A Master Class',
  minutes: 10,
  orientation: 'black',
  kind: 'roadmap',
  beats: [
    b({ id: 'open', moves: 'd4 d5 c4 e5', say: "The Albin Countergambit — 2…e5!?, Black's boldest answer to the Queen's Gambit. Black offers a pawn to strike at the d4-point and seize the initiative. Most Queen's-Gambit players expect a quiet game; the Albin hands them a sharp fight from move two.", sayShort: '…e5 — the bold countergambit punch.', highlights: [H('e5'), H('d4', SOFT)] }),
    b({ id: 'wedge', moves: 'd4 d5 c4 e5 dxe5 d4', say: "dxe5 …d4! — there is the whole idea. The pawn drives forward and lodges as a cramping wedge deep in White's half of the board, splitting the position and cramping the pieces. Black has given a pawn, but that wedge will be a thorn for the entire game.", sayShort: '…d4 — plant the cramping wedge.', highlights: [H('d4')] }),
    b({ id: 'nc6', moves: 'd4 d5 c4 e5 dxe5 d4 Nf3 Nc6 Nbd2 Bg4', say: "…Nc6 develops and eyes the e5-pawn, then …Bg4 pins the f3-knight — the key defender that White needs to round up the d4-pawn. Black develops with threats, getting the pieces out fast in classic gambit style.", sayShort: '…Bg4 — pin the wedge defender.', arrows: [A('g4', 'f3')], highlights: [H('g4'), H('f3')] }),
    b({ id: 'bb4', moves: 'd4 d5 c4 e5 dxe5 d4 Nf3 Nc6 Nbd2 Bg4 h3 Bxf3 Nxf3 Bb4+', say: "…Bxf3 removes a defender of d4, and …Bb4+ develops with check, gaining yet another tempo. Every Albin move comes with a punch — that relentless activity is the compensation for the gambit pawn.", sayShort: '…Bb4+ — develop with check, gain tempo.', highlights: [H('b4')] }),
    b({ id: 'close', moves: 'd4 d5 c4 e5 dxe5 d4 Nf3 Nc6 Nbd2 Bg4 h3 Bxf3 Nxf3 Bb4+ Bd2 Qe7', say: "Bd2 …Qe7 protects the d4-wedge again and clears the way for …O-O-O and a kingside pawn storm. There is the Albin in full: down a pawn, but with a deep cramping wedge, a lead in development, and a clear attacking plan. The other tabs show the modern Fianchetto, the deadly Lasker Trap, and the Spassky e4 line.", sayShort: '…Qe7 — guard the wedge, prep …O-O-O.', highlights: [H('e7'), H('d4', SOFT)] }),
  ],
};
