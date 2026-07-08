import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Colle (Black): d4 d5 Nf3 Nf6 e3 c5 — main-line master class. The student
// plays BLACK. The Colle wants a cosy e3/Bd3/c3 setup and a kingside attack; you
// deny it by striking with ...c5 immediately, opening the game before White gets
// comfortable, and equalising with active pieces. Spine both-sides-sound
// (build-sound-spine.mjs), engine-verified (-0.27 = equal for Black).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Colle_System'];

export const ANTI_COLLE_BLACK_LESSON: LessonScript = {
  openingId: 'anti-colle-black',
  sources: SRC,
  title: 'Beating the Colle — strike with ...c5',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'col1', moves: 'd4 d5 Nf3 Nf6 e3 c5',
      say: "The Colle is a lazy little setup — e3, Bd3, c3, and a hope-and-a-prayer kingside attack. You simply refuse to let it get comfortable. …c5 smacks d4 at once, BEFORE White walls in his own bishop with c3. Crack the game open early, and the Colle's slow plan never even gets off the ground.",
      sayShort: "…c5 — strike before the Colle settles.",
      highlights: [H('c5', ATK), H('d4', SOFT)] }),
    b({ id: 'col2', moves: 'd4 d5 Nf3 Nf6 e3 c5 c4 e6 Nc3 Nc6',
      say: "When White breaks the Colle mould with c4, you're already doing great — full share of the centre, easy development. …e6 and …Nc6 bring your pieces out naturally, and the game's opened into a healthy Queen's-Gambit-style position where everything flows. No cramp, no squeeze — exactly what you wanted.",
      sayShort: "…e6, …Nc6 — easy development.",
      highlights: [H('c5', SOFT), H('c6', KEY)] }),
    b({ id: 'col3', moves: 'd4 d5 Nf3 Nf6 e3 c5 c4 e6 Nc3 Nc6 a3 a6 dxc5 Bxc5 b4 Bd6',
      say: "White grabs queenside space with a3 and b4 and takes on c5; you recapture with the bishop, and when …b4 nudges it, drop back to the active d6-square, pointing right at White's kingside. Every trade has freed your game — which is precisely what Black wants against a system built to cramp you.",
      sayShort: "…Bd6 — active bishop, free game.",
      highlights: [H('d6', KEY)] }),
    b({ id: 'col4', moves: 'd4 d5 Nf3 Nf6 e3 c5 c4 e6 Nc3 Nc6 a3 a6 dxc5 Bxc5 b4 Bd6 cxd5 exd5 Bb2 Be6 Be2 O-O',
      say: "The centre clarifies: after cxd5 exd5 you've got a sound isolated queen's pawn, and with …Be6 and …O-O every piece is developed and active. You stand fully equal, with the freer, easier game — the Colle player's dream of a quiet squeeze has turned into an open middlegame you're delighted to play. Job done.",
      sayShort: "…O-O — equal, active, easy to play.",
      highlights: [H('d5', SOFT)] }),
  ],
};
