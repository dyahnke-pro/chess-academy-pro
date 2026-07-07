import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Modern: the 150 Attack (e4 g6 d4 Bg7 Nc3 d6 Be3 + Qd2 + f3 + O-O-O + h4)
// — main-line master class. The student plays WHITE. The classic anti-fianchetto
// recipe: build the Be3/Qd2 battery, castle queenside, and storm the kingside
// with h4-h5 while trading off the Dragon bishop. Spine both-sides-sound
// (build-sound-spine.mjs), engine-verified (+1.63 White — the passive Modern
// gets crushed).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'];

export const ANTI_MODERN_150_LESSON: LessonScript = {
  openingId: 'anti-modern-150',
  sources: SRC,
  title: 'The 150 Attack — storming the Modern',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'm150-1', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3',
      say: "The Modern and Pirc invite you to build a big centre and then hand it over to counterattack. The 150 Attack refuses to be subtle: you build the classic attacking battery with Be3, aiming to follow with Qd2 and Bh6 to trade off Black's fianchettoed bishop — the one piece guarding the dark squares around his king.",
      sayShort: "Be3 — start the attacking battery.",
      highlights: [H('e3', KEY), H('g7', SOFT)] }),
    b({ id: 'm150-2', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 Nf6 f3',
      say: "Qd2 completes the battery — the bishop and queen line up for Bh6 — and f3 braces e4 so the whole pawn front is granite and the g- and h-pawns are freed to storm. This is the setup in a nutshell: solid centre, queenside castling next, and a kingside pawn avalanche to follow.",
      sayShort: "Qd2, f3 — battery set, storm loaded.",
      highlights: [H('d2', KEY), H('f3', SOFT)] }),
    b({ id: 'm150-3', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 Nf6 f3 O-O O-O-O Nc6 Nd5',
      say: "You castle queenside — king safe on the far wing, rooks ready to back the pawn storm — and Black castles into the firing line. Nd5 grabs a dominant central outpost, offering to trade off Black's best developed piece and open lines toward the king. The attack writes itself now.",
      sayShort: "O-O-O, Nd5 — opposite wings, outpost.",
      highlights: [H('d5', KEY)] }),
    b({ id: 'm150-4', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 Nf6 f3 O-O O-O-O Nc6 Nd5 a5 Nxf6+ exf6',
      say: "Nxf6+ trades on Black's terms-wrecking square: after exf6 his kingside pawns are shattered into doubled, isolated f-pawns and the e-file opens toward his king. The Dragon-style structure that was meant to shelter him is now a ruin. Every trade has helped your attack.",
      sayShort: "Nxf6+ — shatter the kingside pawns.",
      highlights: [H('f6', ATK), H('f7', SOFT)] }),
    b({ id: 'm150-5', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 Nf6 f3 O-O O-O-O Nc6 Nd5 a5 Nxf6+ exf6 h4 f5 h5 fxe4',
      say: "Now the avalanche: h4-h5 crashes into g6, prising open the h-file straight at Black's king while his counterplay on the queenside is far too slow. Black flails with f5, but the position is already decisive — you are winning by a clear margin. This is why the 150 Attack terrorises the Modern: pure, direct, and brutally effective.",
      sayShort: "h4-h5 — the avalanche, winning attack.",
      highlights: [H('h5', ATK), H('g6', ATK)] }),
  ],
};
