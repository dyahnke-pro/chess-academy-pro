import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — King's Indian Attack, WHITE side. The universal
// system: the same fianchetto setup against almost anything, then the e4 break, a
// rook to e1, and the thematic e5 advance launching the classic KIA kingside
// attack (Nf1-h2-g4, Qe2, the f6/h-file storm Fischer made famous). Reaches a
// balanced, strategically clear middlegame (15 plies, both castled; engine ~level,
// G9.3 Gates A-D). Student = WHITE. Board-accurate, two registers per beat.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const PRO_GOTHAMCHESS_KIA_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-kia',
  title: "GothamChess's King's Indian Attack — One Setup, Every Game",
  minutes: 11,
  orientation: 'white',
  kind: 'variation',
  sources: [
    'book:chess-strategy',
    'https://www.chess.com/openings/Kings-Indian-Attack',
    'https://api.chess.com/pub/player/gothamchess/games/archives',
    'https://en.wikipedia.org/wiki/King%27s_Indian_Attack',
  ],
  beats: [
    b({
      id: 'open',
      moves: 'Nf3 d5 g3 c5 Bg2',
      arrows: [{ from: 'g2', to: 'b7', color: VIS }],
      highlights: [{ square: 'g2', color: KEY }],
      say:
        "The King's Indian Attack — and the beauty of it is in the name: it's a SYSTEM. Nf3, g3, Bg2. We play almost the exact same setup no matter what Black does, so we never get caught in someone's preparation. The bishop on g2 rakes the long diagonal, and the whole kingside is being quietly armed.",
      sayShort: 'Bg2 — the system fianchetto.',
    }),
    b({
      id: 'castle',
      moves: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6',
      highlights: [{ square: 'g1', color: SOFT }],
      say:
        "Black builds a sturdy French-style centre with …e6; we castle. There's no early skirmish here — both sides just develop. The KIA is a slow burn: we get our pieces home, and THEN we light the fire on the kingside.",
      sayShort: 'O-O — calm development.',
    }),
    b({
      id: 'd3-nbd2',
      moves: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7',
      arrows: [{ from: 'd2', to: 'f1', color: SOFT }],
      highlights: [{ square: 'd2', color: KEY }],
      say:
        "d3 and Nbd2 — the signature KIA moves. That knight on d2 looks humble, but remember its route: it's heading for f1, then h2 or e3, swinging over to join the kingside attack later. Every quiet move here is loading a spring.",
      sayShort: 'Nbd2 — the attacking knight routes up.',
    }),
    b({
      id: 'e4',
      moves: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4',
      arrows: [{ from: 'e2', to: 'e4', color: VIS }],
      highlights: [{ square: 'e4', color: KEY }, { square: 'd5', color: SOFT }],
      say:
        "Now the system shows its teeth: e4. We confront Black's centre and stake our claim to the kingside. The fight lines up exactly the way the KIA wants — Black will expand on the queenside, and we throw everything at his king.",
      sayShort: 'e4 — stake the kingside.',
    }),
    b({
      id: 're1',
      moves: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4 O-O Re1',
      arrows: [{ from: 'f1', to: 'e1', color: VIS }],
      highlights: [{ square: 'e1', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "Black castles right into the storm; we lift the rook to e1, backing the e-pawn and clearing f1 for the knight. Everything is now in place. The next move on our minds is e5 — gaining space and kicking the f6-knight away from defending its king.",
      sayShort: 'Re1 — prime the e5 push.',
    }),
    b({
      id: 'mg-summary',
      moves: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4 O-O Re1',
      arrows: [{ from: 'e4', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'g4', color: KEY }],
      say:
        "Here's the middlegame plan that makes the KIA so dangerous, the one Fischer used to score crushing wins. Play e5 to gain space and chase the f6-knight; reroute the d2-knight to f1 and then g4; bring the queen to e2 and aim at h5; and storm the kingside with the f- and h-pawns. Black's counterplay on the queenside is real but slower — and in a race for the king, the faster attacker wins. Same setup every game, same plan, same kingside avalanche.",
      sayShort: 'e5 then Nf1-g4 — storm the king.',
    }),
  ],
};
