import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Sicilian Rossolimo — per-variation master classes. The student plays
// WHITE. Keyed `${openingId}::${variationName}` to match the anti-openings.json
// variation names. Each spine is the masters-DB main line for Black's reply to
// 3.Bb5, walked to a middlegame (DB-grounded by construction, chess.js-legal).
// Arrows: non-pawn pieces, clear sight-line (lessonIntegrity). Highlights mark
// squares the narration names.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

interface BeatInit {
  id: string; moves: string; say: string; sayShort?: string;
  arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Rossolimo_Variation'];

const OID = 'anti-sicilian-rossolimo';

/** vs 3...e6 — DON'T trade on c6; retreat the bishop to f1, build the d4+c4
 *  centre, and press a lasting space edge (a Maróczy-flavoured squeeze). */
const E6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Rossolimo vs 3...e6 — the f1 retreat + space squeeze', minutes: 6,
  beats: [
    b({ id: 're6-1', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7',
      say: "When Black answers Bb5 with e6, the doubling trick is gone — after Bxc6 Black just recaptures with a knight from e7 and keeps a clean structure. So DON'T rush the trade. Black develops Nge7, flexible; you castle and keep your options open.",
      sayShort: "…e6 — no rush to trade on c6.",
      highlights: [H('e6', KEY), H('c6', SOFT)] }),
    b({ id: 're6-2', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1',
      say: "Re1 backs the e-pawn; then, when a6 puts the question, the bishop simply steps home to f1. This is the whole point against e6 — you KEEP the bishop pair instead of giving it up, and from f1 it will help support a big pawn centre. No structural concession made.",
      sayShort: "Bf1 — keep the bishop, no concession.",
      arrows: [A('f1', 'a6', SOFT)], highlights: [H('f1', KEY)] }),
    b({ id: 're6-3', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4',
      say: "Black strikes the centre with d5; you trade and then hit back with d4. The centre opens on your terms — your pieces are the more harmoniously placed, and the d4-break stakes out the space you were angling for all along.",
      sayShort: "d4 — open the centre on your terms.",
      highlights: [H('d4', ATK), H('d5', SOFT)] }),
    b({ id: 're6-4', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4 Nf6 Be3 Be7 c4',
      say: "The knight retreats to f6, you develop the bishop to e3, and then c4 — the space-grabbing move. The pawns on c4 and d4 clamp down on d5 and e5, a Maróczy-style bind: Black is solid but passive, with no easy break and no counterplay. You have the whole board to work with.",
      sayShort: "c4 — the Maróczy clamp.",
      highlights: [H('c4', KEY), H('d4', KEY), H('d5', SOFT), H('e5', SOFT)] }),
    b({ id: 're6-5', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4 Nf6 Be3 Be7 c4 O-O Nc3 cxd4 Nxd4',
      say: "Black castles and tries cxd4 to unbind; you recapture with the knight, and it lands beautifully on d4 in the centre. Bishop pair, more space, a knight on the best square on the board, and a rock-solid position — the Rossolimo squeeze against e6 is exactly what you signed up for.",
      sayShort: "Nxd4 — centralized, bishop pair, more space.",
      arrows: [A('d4', 'e6')], highlights: [H('d4', KEY), H('c4', SOFT)] }),
  ],
};

/** vs 3...d6 — keep the bishop with Bf1, let Black trade on f3 (you take the
 *  bishop pair), reroute the knight and prepare d4: a bishop-pair squeeze. */
const D6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Rossolimo vs 3...d6 — bishop pair + a slow squeeze', minutes: 6,
  beats: [
    b({ id: 'rd6-1', moves: 'e4 c5 Nf3 Nc6 Bb5 d6 O-O Bd7 Re1 Nf6 c3 a6 Bf1',
      say: "Against d6 you build a small, flexible centre — Re1 and c3 preparing a later d4 — and when a6 hits the bishop, it steps back to f1. Same theme as the e6 line: don't hand over the bishop, keep it for the long game. Nothing committal, everything sound.",
      sayShort: "c3, Bf1 — small centre, keep the bishop.",
      highlights: [H('c3', KEY), H('f1', KEY)] }),
    b({ id: 'rd6-2', moves: 'e4 c5 Nf3 Nc6 Bb5 d6 O-O Bd7 Re1 Nf6 c3 a6 Bf1 Bg4 h3 Bxf3 Qxf3',
      say: "Black pins with Bg4 and, prodded by h3, trades it off — Bxf3, and you recapture with the queen. That is a quiet triumph: Black has voluntarily given up his light-squared bishop, so you own the bishop pair in a semi-open position where it will only grow in strength.",
      sayShort: "Qxf3 — you own the bishop pair now.",
      highlights: [H('f3', KEY)] }),
    b({ id: 'rd6-3', moves: 'e4 c5 Nf3 Nc6 Bb5 d6 O-O Bd7 Re1 Nf6 c3 a6 Bf1 Bg4 h3 Bxf3 Qxf3 g6 d3 Bg7 Be3',
      say: "Black fianchettoes with g6 and Bg7; you slot the pawn on d3 and develop the bishop to e3, eyeing the c5-pawn and the dark squares. Your structure is a coiled spring — c3 and d3 ready to unleash d4 the moment Black loosens.",
      sayShort: "Be3 — coil the centre, eye d4.",
      arrows: [A('e3', 'c5')], highlights: [H('e3', KEY), H('d3', SOFT), H('c5', ATK)] }),
    b({ id: 'rd6-4', moves: 'e4 c5 Nf3 Nc6 Bb5 d6 O-O Bd7 Re1 Nf6 c3 a6 Bf1 Bg4 h3 Bxf3 Qxf3 g6 d3 Bg7 Be3 Nd7 Nd2 O-O',
      say: "The knight reroutes via d2 — heading for f1 and g3, or c4 — while both sides finish developing and castle. You have reached the Rossolimo dream against d6: the bishop pair, a flexible centre poised to strike with d4, and a rich, riskless middlegame you can push for a hundred moves.",
      sayShort: "Nd2 — reroute; bishop pair, push for two results.",
      highlights: [H('d2', KEY), H('d4', SOFT)] }),
  ],
};

/** vs 3...Nf6 — meet the hit on e4 with Nc3; after Black's ...Nd4 and the
 *  trades, castle into a solid, riskless setup and fianchetto with b3. */
const NF6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Rossolimo vs 3...Nf6 — Nc3 and a rock-solid setup', minutes: 6,
  beats: [
    b({ id: 'rn6-1', moves: 'e4 c5 Nf3 Nc6 Bb5 Nf6 Nc3',
      say: "Nf6 pokes at your e4-pawn; you simply guard it with Nc3, developing toward the fight. No need for the space-gaining e5 here — the knight defends and eyes d5, and you keep the clean Rossolimo structure with the bishop still pressuring c6.",
      sayShort: "Nc3 — guard e4, keep developing.",
      arrows: [A('b5', 'c6')], highlights: [H('e4', KEY), H('c6', SOFT), H('d5', SOFT)] }),
    b({ id: 'rn6-2', moves: 'e4 c5 Nf3 Nc6 Bb5 Nf6 Nc3 Qc7 O-O Nd4 Re1 a6 Bf1',
      say: "Black centralizes with Qc7 and Nd4, planting the knight on your doorstep, then puts the question with a6. You castle, back the e-pawn with Re1, and step the bishop home to f1 — unbothered. The d4-knight looks scary but has no support; it will be traded or chased.",
      sayShort: "Bf1 — castle, keep it, the Nd4 is loose.",
      highlights: [H('d4', ATK), H('f1', KEY)] }),
    b({ id: 'rn6-3', moves: 'e4 c5 Nf3 Nc6 Bb5 Nf6 Nc3 Qc7 O-O Nd4 Re1 a6 Bf1 Ng4 g3 Nxf3+ Qxf3 Ne5 Qe2 e6 b3',
      say: "The knights come off — Nxf3+ and the sortie Ng4 are chased away by g3 — and after Ne5 your queen tucks to e2. Then b3, preparing to fianchetto the bishop to b2 where it rakes the long diagonal at Black's centre. Solid, harmonious, and a shade better: exactly the low-theory game the Rossolimo promises against every Black try.",
      sayShort: "b3 — fianchetto to b2, small pull.",
      arrows: [A('c1', 'b2', SOFT)], highlights: [H('b3', KEY), H('b2', KEY), H('e2', SOFT)] }),
  ],
};

export const ANTI_SICILIAN_ROSSOLIMO_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Nyezhmetdinov-Rossolimo Attack (e6)`]: E6_LESSON,
  [`${OID}::Nyezhmetdinov-Rossolimo Attack (d6)`]: D6_LESSON,
  [`${OID}::Nyezhmetdinov-Rossolimo Attack (Nf6)`]: NF6_LESSON,
};
