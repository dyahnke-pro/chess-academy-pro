import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro GothamChess (Levy Rozman) — King's Indian Attack, PER-VARIATION Watch
// lessons. Board-accurate, two-register narration (G9.3 Gates A-D). Student = WHITE.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-strategy',
  'https://www.chess.com/openings/Kings-Indian-Attack',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
];

const VS_D5C5: LessonScript = {
  openingId: 'pro-gothamchess-kia', title: 'KIA — vs …d5 + …c5',
  minutes: 11, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'setup', moves: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7',
      arrows: [{ from: 'd2', to: 'f1', color: SOFT }], highlights: [{ square: 'g2', color: KEY }],
      say: "The King's Indian Attack as a SYSTEM — the same setup against Black's French-style …d5/…c5. Bg2 rakes the long diagonal, and the knight on d2 is secretly loaded: its route is f1 then h2 or g4, swinging over to join the kingside attack later.",
      sayShort: 'the system setup, knight loaded.' }),
    b({ id: 'e4', moves: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4 O-O Re1',
      arrows: [{ from: 'e2', to: 'e4', color: VIS }], highlights: [{ square: 'e4', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Now the system shows its teeth: e4, staking our claim to the kingside, then Re1 to back the e-pawn and clear f1 for the knight. Black castles right into the storm. Everything is in place — the next idea on our minds is e5.",
      sayShort: 'e4 + Re1 — prime the e5 push.' }),
    b({ id: 'mg-plan', moves: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4 O-O Re1',
      arrows: [{ from: 'e4', to: 'e5', color: VIS }], highlights: [{ square: 'e5', color: KEY }, { square: 'g4', color: KEY }],
      say: "Here's the famous KIA plan — the one Fischer used to crush opponents. Push e5 to gain space and chase the f6-knight away from its king; reroute the d2-knight via f1 to g4; bring the queen to e2 aiming at h5; and storm with the f- and h-pawns. Black's queenside counterplay is real but slower. In a race for the king, the faster attacker wins — and that's us.",
      sayShort: 'e5 then Nf1-g4 — storm the king.' }),
  ],
};

const VS_SICILIAN: LessonScript = {
  openingId: 'pro-gothamchess-kia', title: 'KIA — vs Sicilian (…c5 + …Nf6)',
  minutes: 10, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'setup', moves: 'Nf3 c5 g3 Nc6 Bg2 g6 O-O Bg7 d3 Nf6 Nbd2 d6',
      highlights: [{ square: 'g2', color: KEY }], say: "Against a Sicilian fianchetto, the KIA shines. Black mirrors our fianchetto, but we still have the extra tempo and the same easy system: Bg2, d3, Nbd2. No theory, no danger — just our familiar setup against a player who has to figure out the position from scratch.",
      sayShort: 'the system vs the Sicilian.' }),
    b({ id: 'e4', moves: 'Nf3 c5 g3 Nc6 Bg2 g6 O-O Bg7 d3 Nf6 Nbd2 d6 e4',
      arrows: [{ from: 'e2', to: 'e4', color: VIS }], highlights: [{ square: 'e4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "e4 — we grab the centre and stake the kingside. Now the position takes on a Closed-Sicilian-with-colours-reversed feel, but WE'RE the one attacking. The pawn front gives us a clear plan and a space advantage while Black sorts out his counterplay.",
      sayShort: 'e4 — claim the centre.' }),
    b({ id: 'mg-plan', moves: 'Nf3 c5 g3 Nc6 Bg2 g6 O-O Bg7 d3 Nf6 Nbd2 d6 e4',
      arrows: [{ from: 'e4', to: 'e5', color: VIS }], highlights: [{ square: 'e5', color: KEY }, { square: 'f4', color: SOFT }],
      say: "Here's the middlegame plan. We expand with the e5-break to gain kingside space, or play Re1 and Nf1-h2-g4 building toward Black's king, with f4-f5 to follow. Black has his own play with …b5 and …Rb8 on the queenside — but again, our attack hits the king while his hits a wing. Same setup, same plan, same kingside pressure. The KIA never lets you down.",
      sayShort: 'e5 / f4 — build the kingside attack.' }),
  ],
};

export const PRO_GOTHAMCHESS_KIA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-kia::vs …d5 + …c5': VS_D5C5,
  'pro-gothamchess-kia::vs Sicilian (KIA vs …c5 + …Nf6)': VS_SICILIAN,
};
