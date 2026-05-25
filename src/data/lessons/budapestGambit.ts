import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Budapest Gambit. Lead-the-eye §5a. Moves
// from repertoire.json (DB-anchored, G3); prose only. The main Bf4 line reaches
// ≥20 plies; the short, sharp gambit sub-lines (Adler/Fajarowicz) are authored
// as `kind: 'roadmap'` since a gambit resolves before the middlegame proper.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Budapest_Gambit'];

export const BUDAPEST_GAMBIT_LESSON: LessonScript = {
  openingId: 'budapest-gambit',
  sources: SRC,
  title: 'Budapest Gambit — A Master Class',
  minutes: 11,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 Nf6 c4 e5', say: "The Budapest Gambit — 2…e5!?, a bold and surprising counter to 1.d4. Black gambits a pawn to strike at the centre and seize fast, active piece play. Its great practical value: most d4 players are simply unprepared for this early punch.", sayShort: '…e5 — the surprise gambit punch.', highlights: [H('e5')] }),
    b({ id: 'ng4', moves: 'd4 Nf6 c4 e5 dxe5 Ng4', say: "dxe5 …Ng4! — the knight pounces, chasing the e5-pawn it intends to win back. This is the gambit's whole idea: Black doesn't sit and regret the pawn, he hunts it down while developing with tempo and gaining the initiative.", sayShort: '…Ng4 — hunt the e5-pawn back.', arrows: [A('g4', 'e5')], highlights: [H('g4'), H('e5')] }),
    b({ id: 'bb4', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+', say: "Bf4 defends the pawn, so …Nc6 piles a second attacker on e5, and …Bb4+ develops with check, gaining yet another tempo. Every black move comes with a threat — that tempo-rich activity is the gambit's compensation.", sayShort: '…Bb4+ — develop with check, gain tempo.', highlights: [H('b4')] }),
    b({ id: 'recoup', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 Nxe5 Nxe5', say: "After Nbd2 …Qe7 (renewing the pressure on e5) and a3, Black recoups the pawn — …Ngxe5 Nxe5 …Nxe5, the knight landing strongly in the centre. Material is level again, and Black has reached an easy, active position with no weaknesses.", sayShort: '…Nxe5 — recoup the pawn, knight centralised.', highlights: [H('e5')] }),
    b({ id: 'close', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 Nxe5 Nxe5 e3 Bxd2+ Qxd2 O-O Be2 d6 O-O Bf5', say: "…Bxd2+ trades into a clean structure, Black castles, and …d6/…Bf5 complete a harmonious, active development. There is the Budapest in full: the pawn recouped, every piece on a good square, no weaknesses — a comfortable, fighting game out of a surprise gambit. The other tabs show the Adler and the wild Fajarowicz.", sayShort: '…Bf5 — harmonious, comfortable, equal.', highlights: [H('d6'), H('f5')] }),
  ],
};
