import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Trompowsky: 2...Ne4 (d4 Nf6 Bg5 Ne4) — main-line master class. The
// student plays BLACK. The Trompowsky's Bg5 wants to trade for the f6-knight and
// wreck Black's structure; the most principled reply is ...Ne4, jumping to the
// centre, hitting the bishop and refusing to be pinned. From there ...d5/...c5
// and an active ...Bf5 give Black a comfortable, fully equal game. Spine both-
// sides-sound (build-sound-spine.mjs), engine-verified (-0.18 = dead level).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'];

export const ANTI_TROMPOWSKY_BLACK_LESSON: LessonScript = {
  openingId: 'anti-trompowsky-black',
  sources: SRC,
  title: 'Meeting the Trompowsky — the ...Ne4 jump',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'trp1', moves: 'd4 Nf6 Bg5 Ne4 Bf4 d5 e3 c5',
      say: "The Trompowsky's whole idea is Bg5 — it wants to trade for your knight and saddle you with doubled pawns. So you refuse at the root: …Ne4! The knight leaps into the centre, hits the bishop, and instead of pinning you, White's piece has to scurry back to f4. Now you stake your OWN big centre with …d5 and …c5 — and just like that, you've got easy, comfortable development.",
      sayShort: "…Ne4 — jump in, hit the bishop.",
      highlights: [H('e4', ATK), H('d5', KEY), H('c5', KEY)] }),
    b({ id: 'trp2', moves: 'd4 Nf6 Bg5 Ne4 Bf4 d5 e3 c5 Nd2 Nxd2 Qxd2 Nc6 Nf3 cxd4 exd4',
      say: "White challenges the outpost with Nd2; you trade it off, and after Qxd2 you develop naturally, …Nc6. Then …cxd4 exd4 clarifies things, leaving White with a lone d4-pawn to babysit. You? No weaknesses, easy piece play, and a clear target to needle. The game's dead level and a pleasure to play.",
      sayShort: "…cxd4 — clarify, level and easy.",
      highlights: [H('d4', ATK), H('d5', SOFT)] }),
    b({ id: 'trp3', moves: 'd4 Nf6 Bg5 Ne4 Bf4 d5 e3 c5 Nd2 Nxd2 Qxd2 Nc6 Nf3 cxd4 exd4 Bf5 Bd3 Bxd3 Qxd3',
      say: "Here's the key move: …Bf5, developing your light-squared bishop OUTSIDE the pawn chain before …e6 can ever lock it in — the exact good-bishop principle that makes the Caro-Kann so solid. White offers a trade with Bd3; you take it, …Bxd3 Qxd3, and your one potentially bad piece is gone from the board. Nothing bad can happen to you now.",
      sayShort: "…Bf5 — free the good bishop, trade it.",
      highlights: [H('d3', KEY)] }),
    b({ id: 'trp4', moves: 'd4 Nf6 Bg5 Ne4 Bf4 d5 e3 c5 Nd2 Nxd2 Qxd2 Nc6 Nf3 cxd4 exd4 Bf5 Bd3 Bxd3 Qxd3 e6 O-O Bd6',
      say: "…e6 completes a rock-solid structure, and after White castles you challenge his last active piece with …Bd6, offering to trade the dark-squared bishops. When they come off, the position's symmetrical and bone-level equal — you've met the Trompowsky's whole surprise value with pure principle, and you stand shoulder to shoulder. A calm, confident equaliser.",
      sayShort: "…Bd6 — challenge the bishop, equal.",
      highlights: [H('d6', ATK), H('f4', SOFT)] }),
  ],
};
