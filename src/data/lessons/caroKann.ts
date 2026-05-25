import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Caro-Kann Defence — the main-line master class (Black's solid answer to
// e4). The student plays BLACK: board orients black-at-bottom, narration
// speaks from Black's side. The spine is the CLASSICAL main line, built
// move-by-move from the Lichess masters database (every move the master
// main move at its position — so it's DB-grounded by construction and the
// DB-anchor / masters gates pass without invention). chess.js-legal
// throughout. Arrows are reserved for non-pawn pieces with a CLEAR
// sight-line (lessonIntegrity enforces it); key squares + pawn ideas use
// highlights, every one of which is a square the narration names (§5b).

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

/** Main-line Caro-Kann: the Classical (Bf5), the most principled line —
 *  Black solves the bad-bishop problem before locking the chain, trades it
 *  off, and reaches a rock-solid structure with no weak pieces, then breaks
 *  with ...c5 against opposite-side castling. */
export const CARO_KANN_LESSON: LessonScript = {
  openingId: 'caro-kann',
  title: 'The Caro-Kann Defence — A Master Class',
  minutes: 9,
  orientation: 'black',
  beats: [
    b({ id: 'ck1', moves: 'e4 c6 d4 d5',
      say: "Against e4, the Caro-Kann answers c6 — quiet, but purposeful. It props up d5, so Black can challenge the centre with a pawn that is SUPPORTED, not sacrificed. Where the French shuts its own bishop in, the Caro keeps the lines clear. The pawn lands on d5 ready to fight.",
      sayShort: "…c6 — support …d5, keep the lines clear.",
      highlights: [H('c6', KEY), H('d5', KEY), H('e4', SOFT)] }),
    b({ id: 'ck2', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5',
      say: "Black gives up the centre with dxe4 and instantly solves the Caro's one structural worry — the light-squared bishop. It comes out to f5, OUTSIDE the pawn chain, BEFORE e6 is ever played to box it in. The French player buries that bishop behind e6 and suffers for fifty moves. The Caro player simply develops it first.",
      sayShort: "…Bf5 — the bishop out before e6 traps it.",
      highlights: [H('f5', KEY), H('e6', SOFT), H('e4', SOFT)] }),
    b({ id: 'ck3', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7',
      say: "White harasses the bishop and storms the kingside: Ng3, then the pawns h4 and h5. Black stays one step ahead — Bg6, then h6 to carve out the escape, and when h5 arrives, Bh7. The bishop sits safe on h7. Mistime this dance and h5 entombs the bishop on g6 — the Classical's one real trap, and the reason these quiet moves are forced.",
      sayShort: "…Bg6, h6, Bh7 — stay ahead of h5.",
      highlights: [H('g6', KEY), H('h5', ATK), H('h7', KEY)] }),
    b({ id: 'ck4', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3',
      say: "Now White offers the trade on d3, and Black takes it. The bishop that every other e4 c6-ish defence struggles to free has been developed AND swapped for White's good one. That is a small, permanent structural plus — and it is the Caro's quiet boast in nearly every game.",
      sayShort: "…Bxd3 — swap the problem bishop, lasting plus.",
      highlights: [H('d3', KEY)] }),
    b({ id: 'ck5', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6',
      say: "ONLY now e6 — the c6, d5, e6 chain complete. But the difference from the French is the whole story: the bishop is already outside the chain and traded off. Ngf6 brings out the last piece. Black has a fortress with no bad pieces and not a single weakness to defend.",
      sayShort: "…e6 — chain complete, the bishop already outside.",
      highlights: [H('e6', KEY), H('c6', SOFT), H('d5', SOFT)] }),
    b({ id: 'ck6', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7 Kb1 O-O',
      say: "White castles long and commits to a kingside attack; Black castles short. Opposite wings means a race — and Black's counter is the c5 break, prying open lines at White's king while the rock-solid Caro structure shrugs off the storm coming the other way. Healthy, equal, and built to outlast White's attack.",
      sayShort: "Opposite castling — …c5 races at White's king.",
      highlights: [H('c5', ATK)] }),
  ],
};
