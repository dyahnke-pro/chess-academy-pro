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
  title: "This repertoire's Fantasy — f3 against the Caro",
  minutes: 8,
  orientation: 'white',
  kind: 'variation',
  sources: ['https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
  beats: [
    b({
      id: 'open', moves: 'e4 c6 d4 d5 f3',
      highlights: [{ square: 'f3', color: KEY }, { square: 'e4', color: SOFT }],
      say: "The Fantasy Variation. After Black plays the Caro-Kann with c6 and d5, you play f3 — supporting the e4-pawn from below and building a massive pawn centre. The whole opening is a bet: that the broad centre (e4-d4-f3) will be worth more than the kingside structural concession.",
      sayShort: 'f3 — back up the centre.',
    }),
    b({
      id: 'french-style', moves: 'e4 c6 d4 d5 f3 e6',
      highlights: [{ square: 'e6', color: KEY }, { square: 'c8', color: SOFT }],
      say: "Black's most-played reply is e6 — a French-style setup, refusing to challenge the centre directly and just developing classically. The bishop on c8 gets locked in (the classical Caro problem-bishop), and you have time to mobilise your space.",
      sayShort: '…e6 — French-style, bishop locked.',
    }),
    b({
      id: 'develop', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4',
      arrows: [{ from: 'b4', to: 'c3', color: ATK }],
      highlights: [{ square: 'c3', color: KEY }, { square: 'b4', color: KEY }],
      say: "Nc3 develops the knight and supports the centre. Black answers with Bb4 — pinning the knight, threatening the exchange, and trying to break up your pawn structure. This is the central question of the line.",
      sayShort: 'Nc3 Bb4 — the central pin.',
    }),
    b({
      id: 'kick-it', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3',
      arrows: [{ from: 'a3', to: 'b4', color: ATK }],
      highlights: [{ square: 'a3', color: KEY }],
      say: "a3 — kick the bishop, make Black commit. They can retreat (Ba5 or Be7) or trade. Whichever they pick, you've gained a tempo and the c3-knight stays.",
      sayShort: 'a3 — commit or trade.',
    }),
    b({
      id: 'doubled-pawns', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'c2', color: SOFT }],
      say: "The trade. Black takes on c3, you recapture with the b-pawn — accepting doubled pawns in exchange for the bishop pair and a massive centre. The doubled c-pawns look ugly, but the c3-pawn now controls d4 forever, your centre is rock-solid, and you have two bishops aimed at Black's kingside.",
      sayShort: 'bxc3 — bishop pair + big centre.',
    }),
    b({
      id: 'recapture-centre', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3 dxe4 fxe4',
      highlights: [{ square: 'e4', color: KEY }, { square: 'f1', color: SOFT }],
      say: "Black challenges the centre with dxe4, and you recapture with the f-pawn — fxe4. This is the moment the Fantasy pays off: you still have the broad e4-d4 pawn duo, and now the f-file is wide open, so once you castle the rook will bear down toward f7. The structural concession from move three has turned into an attacking asset.",
      sayShort: 'fxe4 — keep the duo, open the f-file.',
    }),
    b({
      id: 'develop-knight', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3 dxe4 fxe4 c5 Nf3',
      arrows: [{ from: 'f3', to: 'e5', color: VIS }],
      highlights: [{ square: 'c5', color: SOFT }, { square: 'f3', color: KEY }],
      say: "Black strikes at your centre again with c5, and you develop naturally with Nf3 — eyeing the e5-square, the outpost your whole setup is built to occupy. The doubled c-pawns actually help here: the c3-pawn guards d4, so your centre holds firm while your pieces flow to their best squares.",
      sayShort: 'Nf3 — develop, eye the e5 outpost.',
    }),
    b({
      id: 'plan', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3 dxe4 fxe4 c5 Nf3 Nc6 Bd3',
      highlights: [{ square: 'd3', color: KEY }, { square: 'e4', color: SOFT }, { square: 'e5', color: SOFT }],
      say: "Nc6 develops for Black and you bring the bishop to d3 — completing the ideal Fantasy setup. The plan is clear and strong: castle short so the rook lands on the open f-file, then push e5 at the right moment to cramp Black and spring the bishop's diagonal open toward h7, with both bishops trained on the kingside. The engine confirms White is clearly better here — the aggressive bet of move three has paid off in full.",
      sayShort: 'Bd3 — ideal setup, White is better.',
    }),
  ],
};
