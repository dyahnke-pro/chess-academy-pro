import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-QGD: the Exchange (d4 d5 c4 e6 cxd5 exd5) — main-line master class. The
// student plays WHITE. The Carlsbad structure: White gets the classic minority-
// attack plan (b4-b5 to fix a weakness on c6) plus easy piece play with Bg5/Bd3.
// Spine both-sides-sound (build-sound-spine.mjs), engine-verified (+0.28 White).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'];

export const ANTI_QGD_EXCHANGE_LESSON: LessonScript = {
  openingId: 'anti-qgd-exchange',
  sources: SRC,
  title: 'The QGD Exchange — the Carlsbad squeeze',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'qgd1', moves: 'd4 d5 c4 e6 cxd5 exd5',
      say: "Against the QGD you take on d5 — the Exchange. After exd5 you've got the Carlsbad structure, and with it comes a clear, famous plan: the minority attack. You'll roll b4-b5 to trade on c6 and leave Black with a weak, backward pawn to besiege for the rest of the game. Simple, and brutally effective.",
      sayShort: "cxd5 — the Carlsbad, minority attack ahead.",
      highlights: [H('d5', SOFT), H('c6', ATK)] }),
    b({ id: 'qgd2', moves: 'd4 d5 c4 e6 cxd5 exd5 Nc3 Nf6 Bg5 c6 e3 Be7',
      say: "You develop with purpose: Nc3, then Bg5 to pin the knight and lean on d5, and e3 to free the light bishop. Black shores up d5 with …c6 — which is EXACTLY the pawn your minority attack is coming for. Everything's dropping neatly into the classic plan.",
      sayShort: "Bg5 — pin and pressure d5.",
      highlights: [H('d5', KEY), H('c6', SOFT)] }),
    b({ id: 'qgd3', moves: 'd4 d5 c4 e6 cxd5 exd5 Nc3 Nf6 Bg5 c6 e3 Be7 Bd3 O-O Nf3 Nbd7 O-O',
      say: "Bd3 drops the bishop onto the b1-h7 diagonal, aimed at Black's king; Nf3 and O-O finish your harmonious setup. You've got the comfier side of what LOOKS like a symmetrical structure — but it isn't symmetrical at all, because your queenside pawn majority is the one that manufactures the target.",
      sayShort: "Bd3, O-O — harmonious, comfortable setup.",
      highlights: [H('d3', KEY)] }),
    b({ id: 'qgd4', moves: 'd4 d5 c4 e6 cxd5 exd5 Nc3 Nf6 Bg5 c6 e3 Be7 Bd3 O-O Nf3 Nbd7 O-O Ne4 Bf4 Ndf6 Ne5 Bd6',
      say: "Black bids for freedom with …Ne4; you keep the tension — Bf4 slides the bishop to an active square, and Ne5 plants a monster in the centre, supported and untouchable. Now two clean routes open up: the minority attack with b4-b5, or a direct kingside build behind that e5-knight and the Bd3. A pleasant, thoroughly one-sided middlegame.",
      sayShort: "Ne5 — a monster knight, two plans.",
      arrows: [],
      highlights: [H('e5', KEY), H('b4', SOFT)] }),
  ],
};
