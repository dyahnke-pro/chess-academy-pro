import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Pro Naroditsky KIA — variation lessons. The KIA is his most-played
// opening (18,216 games), a system rather than theory. Each variation
// covers Black's most-played response. Spines from the deep tree at
// data/sources/danielnaroditsky-trees/kia.json.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const SRC = [
  'https://www.chess.com/openings/Kings-Indian-Attack',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// ============================================================
// vs Symmetric Fianchetto (...g6) — 2,652 games, 69.3% score
// Mirror fianchetto: Black plays the same setup we do, becoming a
// positional fight where small advantages decide.
// ============================================================
const VS_SYMMETRIC: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'vs Symmetric Fianchetto — mirror setup',
  minutes: 8,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'sym-open', moves: 'Nf3 g6 g3 Bg7 Bg2 d6',
      highlights: [{ square: 'g2', color: KEY }, { square: 'g7', color: SOFT }],
      say: "1.Nf3 …g6 — Black mirrors our fianchetto. The position becomes a positional fight with both bishops on the long diagonal. The key insight: with mirror development, the first side to break the symmetry productively wins the middlegame.",
      sayShort: 'g3 — mirror fianchettos.',
    }),
    b({
      id: 'sym-castle', moves: 'Nf3 g6 g3 Bg7 Bg2 d6 O-O Nf6 d3 O-O',
      highlights: [{ square: 'g1', color: KEY }, { square: 'g8', color: SOFT }],
      say: "Both kings castled, both fianchettos developed. d3 starts the KIA's central plan — we're going to follow up with Nbd2, e4, and a kingside attack. The d3 is modest but supports both e4 and the c1-bishop's later development.",
      sayShort: 'O-O d3 — KIA setup.',
    }),
    b({
      id: 'sym-knight', moves: 'Nf3 g6 g3 Bg7 Bg2 d6 O-O Nf6 d3 O-O Nbd2 e5',
      highlights: [{ square: 'd2', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Nbd2 develops the second knight to its prep square. Black plays …e5 trying to claim the centre. Note: this is the same e5 break we use as Black in the KID — now we're on the other side, with a tempo less, but we know the structures cold.",
      sayShort: 'Nbd2 …e5 — central tension.',
    }),
    b({
      id: 'sym-e4', moves: 'Nf3 g6 g3 Bg7 Bg2 d6 O-O Nf6 d3 O-O Nbd2 e5 e4 Nc6 c3',
      highlights: [{ square: 'e4', color: KEY }, { square: 'c3', color: SOFT }],
      say: "e4 claims the centre, …Nc6 develops, c3 prepares the d4 push. The position is symmetric in development but we have the move advantage to break first. Patience is everything in the KIA — the right break wins.",
      sayShort: 'e4 c3 — prep d4 push.',
    }),
    b({
      id: 'sym-d4', moves: 'Nf3 g6 g3 Bg7 Bg2 d6 O-O Nf6 d3 O-O Nbd2 e5 e4 Nc6 c3 Re8 a4',
      highlights: [{ square: 'a4', color: KEY }],
      say: "After …Re8 develops the rook, a4 starts the queenside expansion. The a-pawn push gains space and prepares the b-pawn deployment. We're attacking on the side where Black's pieces are less coordinated.",
      sayShort: 'a4 — queenside expansion.',
    }),
    b({
      id: 'sym-middlegame', moves: 'Nf3 g6 g3 Bg7 Bg2 d6 O-O Nf6 d3 O-O Nbd2 e5 e4 Nc6 c3 Re8 a4 a5 Nh4',
      highlights: [{ square: 'h4', color: KEY }, { square: 'f5', color: SOFT }],
      say: "After Black's blocking …a5, the knight goes to h4 preparing Nf5 — the prize square for our knight in the KIA. From f5 it attacks the d6-pawn, hits the e7 pawn, and supports a kingside attack. The Nh4 detour pays off.",
      sayShort: 'Nh4 — heading for f5.',
    }),
  ],
};

// ============================================================
// vs Reti ...d5 — 4,382 games, 66.3% score
// Black plays the most theoretically aggressive response: claim the
// centre immediately with ...d5. We answer with the KIA's classical
// plan: g3, Bg2, O-O, d3, Nbd2, e4.
// ============================================================
const VS_RETI_D5: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'vs Reti …d5 — central pawn claim',
  minutes: 8,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'd5-open', moves: 'Nf3 d5 g3 Nf6 Bg2 c5',
      highlights: [{ square: 'd5', color: SOFT }, { square: 'c5', color: KEY }],
      say: "1.Nf3 …d5 — Black claims the centre right away. We fianchetto regardless: g3, Bg2. After …c5 Black has the classical centre, but our system development is unbothered. The KIA works against ANY Black setup; that's the whole point.",
      sayShort: '…d5 — Reti structure.',
    }),
    b({
      id: 'd5-castle', moves: 'Nf3 d5 g3 Nf6 Bg2 c5 O-O Nc6 d3',
      highlights: [{ square: 'g1', color: KEY }, { square: 'd3', color: SOFT }],
      say: "O-O …Nc6 d3 — both develop classically. The d3 is the KIA's signature flexibility: it supports e4 later AND keeps the option of d4 transposing into a Reti-style position. The system runs in any direction Black points.",
      sayShort: 'O-O d3 — KIA setup.',
    }),
    b({
      id: 'd5-e6', moves: 'Nf3 d5 g3 Nf6 Bg2 c5 O-O Nc6 d3 e6 Nbd2',
      highlights: [{ square: 'e6', color: KEY }, { square: 'd2', color: SOFT }],
      say: "Black plays …e6 supporting the d5-pawn and preparing development. We respond with Nbd2 — the queen's knight to its KIA square, ready to support the e4 break.",
      sayShort: 'Nbd2 — prep e4.',
    }),
    b({
      id: 'd5-bd6', moves: 'Nf3 d5 g3 Nf6 Bg2 c5 O-O Nc6 d3 e6 Nbd2 Bd6 e4',
      highlights: [{ square: 'e4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "…Bd6 develops the bishop actively, and we play e4 challenging the centre. After e4, Black has to decide: trade with …dxe4 (opens the position), push …d4 (lock the centre), or maintain tension. Each leads to a different KIA middlegame.",
      sayShort: 'e4 — break the centre.',
    }),
    b({
      id: 'd5-dxe4', moves: 'Nf3 d5 g3 Nf6 Bg2 c5 O-O Nc6 d3 e6 Nbd2 Bd6 e4 dxe4 dxe4',
      highlights: [{ square: 'e4', color: KEY }],
      say: "…dxe4 dxe4 — the standard exchange opens the position. Now the Bg2 has a clear diagonal toward the queenside, the d-file is half-open for our rook, and Black's …Bd6 is awkwardly placed without the central pawn support.",
      sayShort: 'dxe4 — open the centre.',
    }),
    b({
      id: 'd5-attack', moves: 'Nf3 d5 g3 Nf6 Bg2 c5 O-O Nc6 d3 e6 Nbd2 Bd6 e4 dxe4 dxe4 O-O Re1',
      highlights: [{ square: 'e1', color: KEY }, { square: 'e6', color: SOFT }],
      say: "…O-O Re1 — Black castles, we lift the rook to the e-file. The Re1 supports e4 AND prepares the central pressure that defines KIA middlegames. From here Nc4 or e5 are the key breakthrough ideas.",
      sayShort: 'Re1 — central pressure.',
    }),
  ],
};

// ============================================================
// vs Pirc/KID ...d6 — 1,155 games, 70.5% score
// Black plays a quiet setup with ...d6 keeping options open. We
// transpose into a KIA-vs-Pirc structure with broad central plans.
// ============================================================
const VS_PIRC_D6: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'vs Pirc …d6 — quiet central setup',
  minutes: 8,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'd6-open', moves: 'Nf3 d6 g3 g6 Bg2 Bg7',
      highlights: [{ square: 'd6', color: KEY }, { square: 'g7', color: SOFT }],
      say: "1.Nf3 …d6 — Black plays a Pirc-style quiet setup. We continue our system development: g3, Bg2. The d6 is solid but doesn't challenge our centre yet, so we get to set up the broadest possible KIA structure.",
      sayShort: '…d6 — Pirc setup.',
    }),
    b({
      id: 'd6-castle', moves: 'Nf3 d6 g3 g6 Bg2 Bg7 O-O Nf6 d4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "O-O …Nf6 d4! — and we play d4 instead of d3. The Pirc structure invites this transposition: Black can't easily strike at the centre, so we claim the full centre with c4 + d4 + e4 coming.",
      sayShort: 'd4 — claim the centre.',
    }),
    b({
      id: 'd6-c4', moves: 'Nf3 d6 g3 g6 Bg2 Bg7 O-O Nf6 d4 O-O c4',
      highlights: [{ square: 'c4', color: KEY }],
      say: "O-O c4 — both kings safe, we expand with c4. The position has transposed into a King's Indian Reversed structure where WE play Black's side with an extra tempo. The KID's natural plans (e4 + queenside expansion) all work for us here.",
      sayShort: 'c4 — Reversed KID.',
    }),
    b({
      id: 'd6-knight', moves: 'Nf3 d6 g3 g6 Bg2 Bg7 O-O Nf6 d4 O-O c4 e5 Nc3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Black plays …e5 challenging the d4-pawn. We develop Nc3 supporting our centre and preparing d5 to lock the position. The Nc3 also adds pressure on the d5 outpost square.",
      sayShort: 'Nc3 — support centre.',
    }),
    b({
      id: 'd6-d5-push', moves: 'Nf3 d6 g3 g6 Bg2 Bg7 O-O Nf6 d4 O-O c4 e5 Nc3 Nbd7 d5',
      highlights: [{ square: 'd5', color: KEY }],
      say: "…Nbd7 develops the knight, then d5! locks the centre. The position is now a King's Indian Reversed with locked centre — kingside attack territory for whoever has the king on the queenside. We have the extra tempo to organise first.",
      sayShort: 'd5 — lock centre.',
    }),
    b({
      id: 'd6-middlegame', moves: 'Nf3 d6 g3 g6 Bg2 Bg7 O-O Nf6 d4 O-O c4 e5 Nc3 Nbd7 d5 a5 e4',
      highlights: [{ square: 'e4', color: KEY }],
      say: "Black plays …a5 trying to claim queenside space, and we push e4 finally. Now the centre is fully formed: c4-d5-e4 — and the long-diagonal Bg2 has a clear path. The KIA's structural plan converts.",
      sayShort: 'e4 — centre formed.',
    }),
  ],
};

export const PRO_NARODITSKY_KIA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-kia::g6 Modern setup': VS_SYMMETRIC,
  'pro-naroditsky-kia::d5 KIA mainline': VS_RETI_D5,
  'pro-naroditsky-kia::d4 KID transposition': VS_PIRC_D6,
};
