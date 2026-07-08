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
      say: "The Modern and Pirc practically beg you to build a big centre so they can swarm it later. The 150 Attack refuses to play along — it's not subtle, it's a haymaker. You set up the classic attacking battery with Be3, and the plan is Qd2 and Bh6 next, to trade off Black's fianchettoed bishop — the one piece guarding every dark square around his king.",
      sayShort: "Be3 — start the attacking battery.",
      highlights: [H('e3', KEY), H('g7', SOFT)] }),
    b({ id: 'm150-2', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 Nf6 f3',
      say: "Qd2 completes the battery — bishop and queen stacked for Bh6 — and f3 turns the whole pawn front to granite while freeing the g- and h-pawns to storm. There's the entire setup in a sentence: solid centre, castle queenside next, then unleash a kingside pawn avalanche.",
      sayShort: "Qd2, f3 — battery set, storm loaded.",
      highlights: [H('d2', KEY), H('f3', SOFT)] }),
    b({ id: 'm150-3', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 Nf6 f3 O-O O-O-O Nc6 Nd5',
      say: "You castle queenside — king safe on the far wing, rooks primed behind the coming storm — and Black castles right into the firing line. Nd5 grabs a monster central outpost, offering to trade off his best-developed piece and crack open lines toward his king. From here, the attack practically writes itself.",
      sayShort: "O-O-O, Nd5 — opposite wings, outpost.",
      highlights: [H('d5', KEY)] }),
    b({ id: 'm150-4', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 Nf6 f3 O-O O-O-O Nc6 Nd5 a5 Nxf6+ exf6',
      say: "Nxf6+ trades on exactly the square that hurts: after …exf6, Black's kingside pawns shatter into doubled, isolated f-pawns and the e-file swings open toward his king. The shelter that was supposed to keep him safe is now a ruin. Every single trade has fed your attack.",
      sayShort: "Nxf6+ — shatter the kingside pawns.",
      highlights: [H('f6', ATK), H('f7', SOFT)] }),
    b({ id: 'm150-5', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 Nf6 f3 O-O O-O-O Nc6 Nd5 a5 Nxf6+ exf6 h4 f5 h5 fxe4',
      say: "And now the avalanche. h4-h5 smashes into g6, prising open the h-file straight at Black's king — while his queenside counterplay is hopelessly, laughably slow. He flails with …f5, but it's already over: you're winning by a clear margin. THIS is why the 150 terrorises the Modern — pure, direct, and brutally effective.",
      sayShort: "h4-h5 — the avalanche, winning attack.",
      highlights: [H('h5', ATK), H('g6', ATK)] }),
  ],
};
