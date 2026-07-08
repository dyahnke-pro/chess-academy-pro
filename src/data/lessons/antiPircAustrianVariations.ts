import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Pirc Austrian Attack — per-variation master class. The student plays
// WHITE. Keyed `${openingId}::${variationName}` to match anti-openings.json. The
// Dragon Formation (…c5): meet the immediate central strike with Bb5+ and e5,
// clamp Black, and centralise for a space edge. Spine rebuilt with build-sound-
// spine.mjs (no both-sides blunder), engine-verified +0.28 from White's side
// (even material, better game). The plain "Austrian Attack" tab was dropped (a
// 10-ply prefix of the main lesson). Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence,_Austrian_Attack'];
const OID = 'anti-pirc-austrian';

const DRAGON_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Austrian vs …c5 (Dragon Formation) — clamp with e5', minutes: 6,
  beats: [
    b({ id: 'pirc-dr-1', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5',
      say: "The Dragon Formation: rather than castle, Black strikes at your big centre at once with c5, Benoni-style. You have the towering e4-d4-f4 pawn front — now you get to prove it. A well-timed check and central push will punish Black's slightly loose, uncastled setup.",
      sayShort: "…c5 — Black strikes the big centre.",
      highlights: [H('c5', SOFT), H('e4', KEY), H('d4', KEY), H('f4', KEY)] }),
    b({ id: 'pirc-dr-2', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 Bb5+ Bd7 e5 Ng4 Bxd7+ Qxd7',
      say: "You insert the check Bb5+ and then ram e5 — kicking the knight out to the rim on g4 and clamping down huge space. After trading the light bishops with Bxd7+, Black is badly cramped: the e5-pawn is a permanent thorn and the knight on g4 is doing nothing useful on the edge.",
      sayShort: "e5 — clamp, knight kicked to the rim.",
      highlights: [H('e5', KEY), H('g4', ATK)] }),
    b({ id: 'pirc-dr-3', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 Bb5+ Bd7 e5 Ng4 Bxd7+ Qxd7 h3 cxd4 Qxd4 Nc6',
      say: "h3 questions the g4-knight, and after Black releases the centre with cxd4 your queen recaptures on d4, dominating the board from the centre. Black develops Nc6 with tempo, but you have the space, the initiative, and the more active army. The Pirc's counterpunch has been absorbed.",
      sayShort: "Qxd4 — centralise, dominate.",
      highlights: [H('d4', KEY), H('e5', SOFT)] }),
    b({ id: 'pirc-dr-4', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 Bb5+ Bd7 e5 Ng4 Bxd7+ Qxd7 h3 cxd4 Qxd4 Nc6 Qe4 Nh6',
      say: "The queen steps to e4 — central and safe — and Black's knight limps back to h6, having achieved nothing on its excursion. You emerge with a clear edge: extra space from the e5-pawn, active pieces, and the safer structure. The Austrian Attack's big centre has done its work against the Dragon setup.",
      sayShort: "Qe4 — clear edge, knight sidelined.",
      highlights: [H('e4', KEY), H('e5', SOFT)] }),
  ],
};

export const ANTI_PIRC_AUSTRIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Austrian Attack, Dragon Formation`]: DRAGON_LESSON,
};
