import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Naroditsky Fantasy Variation vs Caro-Kann (white). Spine derived
// from his actual game corpus — the standard 5...e6 / 6.Nc3 setup. Both
// `say` (full Watch) and `sayShort` (≤8w Learn cue) on every beat per
// G5. Voice paraphrases his recurring framing; no stats/numbers in
// narration per the masterclass voice contract.

const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const PRO_NAR_FANTASY_CARO_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-fantasy-caro',
  title: "Naroditsky's Fantasy — f3 against the Caro",
  minutes: 6,
  orientation: 'white',
  kind: 'variation',
  sources: ['https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
  beats: [
    b({
      id: 'open', moves: 'e4 c6 d4 d5 f3',
      highlights: [{ square: 'f3', color: KEY }, { square: 'e4', color: SOFT }],
      say: "The Fantasy Variation. After Black plays the Caro-Kann with c6 and d5, we play f3 — supporting the e4-pawn from below and building a massive pawn centre. The whole opening is a bet: that the broad centre (e4-d4-f3) will be worth more than the kingside structural concession.",
      sayShort: 'f3 — back up the centre.',
    }),
    b({
      id: 'french-style', moves: 'e4 c6 d4 d5 f3 e6',
      highlights: [{ square: 'e6', color: KEY }, { square: 'c8', color: SOFT }],
      say: "Black's most-played reply is e6 — a French-style setup, refusing to challenge the centre directly and just developing classically. The bishop on c8 gets locked in (the classical Caro problem-bishop), and we have time to mobilise our space.",
      sayShort: '…e6 — French-style, bishop locked.',
    }),
    b({
      id: 'develop', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4',
      arrows: [{ from: 'b4', to: 'c3', color: ATK }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'b4', color: KEY }],
      say: "Nc3 develops the knight and supports the centre. Black answers with Bb4 — pinning the knight, threatening the exchange, and trying to break up our pawn structure. This is the central question of the line.",
      sayShort: 'Nc3 Bb4 — the central pin.',
    }),
    b({
      id: 'kick-it', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3',
      arrows: [{ from: 'a3', to: 'b4', color: ATK }],
      highlights: [{ square: 'a3', color: KEY }],
      say: "a3 — kick the bishop, make Black commit. They can retreat (Ba5 or Be7) or trade. Whichever they pick, we've gained a tempo and the c3-knight stays.",
      sayShort: 'a3 — commit or trade.',
    }),
    b({
      id: 'doubled-pawns', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'c2', color: SOFT }],
      say: "The trade. Black takes on c3, we recapture with the b-pawn — accepting doubled pawns in exchange for the bishop pair and a massive centre. The doubled c-pawns look ugly, but the c3-pawn now controls d4 forever, our centre is rock-solid, and we have two bishops aimed at Black's kingside.",
      sayShort: 'bxc3 — bishop pair + big centre.',
    }),
    b({
      id: 'plan', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3',
      arrows: [{ from: 'f1', to: 'a6', color: VIS }, { from: 'c1', to: 'h6', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }, { square: 'e2', color: KEY }],
      say: "The plan from here: develop Bd3 or Be2, castle short, push e5 at the right moment cramping Black's kingside, and use the bishop pair to attack down both diagonals. The doubled c-pawns become a strength — they support the centre and the c-file opens for our rook.",
      sayShort: 'Plan: Bd3, O-O, e5, bishop pair attacks.',
    }),
  ],
};
