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

// ============================================================
// vs ...e5 (Open) — 582 games, 72.2% score
// Black plays ...e5 challenging the centre immediately. White accepts
// the central gambit territory: Nxe5 grabbing the pawn.
// ============================================================
const VS_E5_OPEN: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'vs ...e5 — Reti gambit accepted',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'e5-open', moves: 'Nf3 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "1.Nf3 ...e5 — Black plays the most aggressive response, treating our Nf3 as if it were a regular 1.e4 opening. The pawn on e5 attacks our knight, but we grab it: 2.Nxe5 starts the Reti gambit-accepted line.",
      sayShort: '...e5 — Black overcommits.',
    }),
    b({
      id: 'e5-nxe5', moves: 'Nf3 e5 Nxe5',
      highlights: [{ square: 'e5', color: ATK }],
      say: "Nxe5 — we accept the pawn. Black's choices now are limited: ...d6 chasing the knight, or ...Nc6 attacking the knight. The most common reply is ...Nc6 attacking with tempo.",
      sayShort: 'Nxe5 — accept the pawn.',
    }),
    b({
      id: 'e5-nc6', moves: 'Nf3 e5 Nxe5 Nc6',
      highlights: [{ square: 'c6', color: SOFT }],
      say: "...Nc6 — Black develops with attack on the knight. We must move it back.",
      sayShort: '...Nc6 — attacks Nxe5.',
    }),
    b({
      id: 'e5-nf3', moves: 'Nf3 e5 Nxe5 Nc6 Nf3',
      highlights: [{ square: 'f3', color: KEY }],
      say: "Nf3 — knight retreats. We've won a clean pawn AND Black has to spend tempo proving compensation. The classical follow-up: d4 + e3 + Be2 + O-O, defending the extra pawn through the middlegame.",
      sayShort: 'Nf3 — pawn safely won.',
    }),
    b({
      id: 'e5-d5', moves: 'Nf3 e5 Nxe5 Nc6 Nf3 d5',
      highlights: [{ square: 'd5', color: SOFT }],
      say: "...d5 — Black plays the central pawn trying to gain space compensation for the lost pawn. The d5 supports c4 development plans but doesn't recover material.",
      sayShort: '...d5 — central try.',
    }),
    b({
      id: 'e5-d4-development', moves: 'Nf3 e5 Nxe5 Nc6 Nf3 d5 d4 Bd6',
      highlights: [{ square: 'd4', color: KEY }, { square: 'd6', color: SOFT }],
      say: "d4 ...Bd6 — we play our own central pawn blunting Black's compensation, Black develops the bishop actively. The d4 fixes the centre, and Black has limited targets for the pawn deficit.",
      sayShort: 'd4 — solid centre.',
    }),
    b({
      id: 'e5-develop', moves: 'Nf3 e5 Nxe5 Nc6 Nf3 d5 d4 Bd6 e3 Nf6 Be2',
      highlights: [{ square: 'e3', color: SOFT }, { square: 'e2', color: KEY }],
      say: "e3 ...Nf6 Be2 — we play e3 supporting d4, Black develops the king knight, we develop the bishop to e2. The classical KIA-Reti structure is set up with the extra pawn AND piece coordination.",
      sayShort: 'Be2 — develop.',
    }),
    b({
      id: 'e5-middlegame', moves: 'Nf3 e5 Nxe5 Nc6 Nf3 d5 d4 Bd6 e3 Nf6 Be2 O-O O-O',
      highlights: [{ square: 'g1', color: KEY }, { square: 'g8', color: SOFT }],
      say: "...O-O O-O — both sides castle, completing development. White has reached the early middlegame UP A PAWN with a solid central structure. Conversion plan: Nbd2 + queenside expansion (c4 + b3) + slow conversion. 72.2% score across 582 games confirms the pawn-up technique.",
      sayShort: 'O-O — middlegame, pawn up.',
    }),
  ],
};

// ============================================================
// vs ...c6 (Slav-like) — 555 games, 77.7% score (his BEST scoring KIA)
// Black plays ...c6 supporting a future ...d5. We respond with the
// classical KIA mirror fianchetto.
// ============================================================
const VS_C6_SLAV: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'vs ...c6 — KIA Slav-like setup',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'c6-open', moves: 'Nf3 c6',
      highlights: [{ square: 'c6', color: KEY }],
      say: "1.Nf3 ...c6 — Black plays the Slav-like setup, supporting a future ...d5 push. The c6 is solid but slow; we develop our KIA system with full freedom.",
      sayShort: '...c6 — Slav-like.',
    }),
    b({
      id: 'c6-g3', moves: 'Nf3 c6 g3',
      highlights: [{ square: 'g3', color: SOFT }],
      say: "g3 — our standard KIA fianchetto setup. The Bg2 will dominate the long diagonal pointing at Black's queenside.",
      sayShort: 'g3 — fianchetto.',
    }),
    b({
      id: 'c6-d5', moves: 'Nf3 c6 g3 d5',
      highlights: [{ square: 'd5', color: KEY }],
      say: "...d5 — Black claims the centre, supported by the c6-pawn. This is the standard Slav setup but a tempo slower because of c6.",
      sayShort: '...d5 — central pawn.',
    }),
    b({
      id: 'c6-bg2', moves: 'Nf3 c6 g3 d5 Bg2 Nf6 O-O',
      highlights: [{ square: 'g2', color: KEY }, { square: 'g1', color: SOFT }],
      say: "Bg2 ...Nf6 O-O — we complete development with the fianchetto + castle. Black mirrors with knight development. So far symmetric, but we have the move advantage AND clearer KIA plans.",
      sayShort: 'O-O — KIA setup done.',
    }),
    b({
      id: 'c6-d3', moves: 'Nf3 c6 g3 d5 Bg2 Nf6 O-O Bg4 d3',
      highlights: [{ square: 'd3', color: KEY }],
      say: "...Bg4 d3 — Black tries the active ...Bg4 pin, we play the small d3 keeping flexibility. The d3 supports e4 later AND avoids the central trade that would help Black.",
      sayShort: 'd3 — flexible setup.',
    }),
    b({
      id: 'c6-middlegame', moves: 'Nf3 c6 g3 d5 Bg2 Nf6 O-O Bg4 d3 Nbd7 Nbd2 e6 e4',
      highlights: [{ square: 'e4', color: KEY }],
      say: "...Nbd7 Nbd2 ...e6 e4 — both sides finish development AND we push e4 immediately. The e4 break is the climax: it challenges Black's d5-pawn AND opens lines for the Bg2.",
      sayShort: 'e4 — central break.',
    }),
    b({
      id: 'c6-castle', moves: 'Nf3 c6 g3 d5 Bg2 Nf6 O-O Bg4 d3 Nbd7 Nbd2 e6 e4 Be7 Re1 O-O',
      highlights: [{ square: 'g8', color: SOFT }, { square: 'e1', color: KEY }],
      say: "...Be7 Re1 ...O-O — Black completes development with Be7 + O-O, we lift the rook to e1 supporting the central pawn. Both kings safe, structure defined: White's central pressure vs Black's passive c6-Nbd7-Be7 setup. The middlegame plan from here: Qe2 + Nf1-Ng3 reroute toward kingside attack.",
      sayShort: 'O-O — middlegame set.',
    }),
  ],
};

// ============================================================
// vs ...b6 (Owen/Hypermodern) — 530 games, 75.8% score
// Black fianchettos the queen-bishop first. The b6 setup is
// hypermodern and gives White free reign in the centre.
// ============================================================
const VS_B6_OWEN: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'vs ...b6 — Owen-style fianchetto',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'b6-open', moves: 'Nf3 b6',
      highlights: [{ square: 'b6', color: KEY }],
      say: "1.Nf3 ...b6 — Black plays the Owen-style hypermodern setup, fianchettoing the queen-bishop first. The b6 gives White free central space.",
      sayShort: '...b6 — hypermodern.',
    }),
    b({
      id: 'b6-g3', moves: 'Nf3 b6 g3',
      highlights: [{ square: 'g3', color: SOFT }],
      say: "g3 — mirror fianchetto. Now both bishops will eye the central squares from the flanks. The structural fight will be decided in the centre.",
      sayShort: 'g3 — mirror.',
    }),
    b({
      id: 'b6-bb7', moves: 'Nf3 b6 g3 Bb7',
      highlights: [{ square: 'b7', color: KEY }],
      say: "...Bb7 — Black completes the queen-bishop fianchetto. The bishop aims at the centre + our kingside. Now we develop our own fianchetto AND claim the centre.",
      sayShort: '...Bb7 — bishop developed.',
    }),
    b({
      id: 'b6-bg2', moves: 'Nf3 b6 g3 Bb7 Bg2 Nf6',
      highlights: [{ square: 'g2', color: KEY }, { square: 'f6', color: SOFT }],
      say: "Bg2 ...Nf6 — mirror fianchettos complete. Black develops the knight. The position is symmetric on the fianchettos but the central play favors whoever expands first.",
      sayShort: 'Bg2 ...Nf6 — symmetric.',
    }),
    b({
      id: 'b6-castle', moves: 'Nf3 b6 g3 Bb7 Bg2 Nf6 O-O e6 d4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "O-O ...e6 d4! — we castle, Black plays solidly with ...e6, and now we GRAB the centre with d4. The d4 push is justified because Black has no central counter-strike available. White's space advantage converts in 75.8% of his games.",
      sayShort: 'd4 — claim the centre.',
    }),
    b({
      id: 'b6-c4', moves: 'Nf3 b6 g3 Bb7 Bg2 Nf6 O-O e6 d4 Be7 c4',
      highlights: [{ square: 'c4', color: KEY }],
      say: "...Be7 c4 — Black develops, we expand with c4. The c4 + d4 + Bg2 + Nf3 setup is a Reversed-Slav structure where White has all the active plans.",
      sayShort: 'c4 — queenside expansion.',
    }),
    b({
      id: 'b6-castle', moves: 'Nf3 b6 g3 Bb7 Bg2 Nf6 O-O e6 d4 Be7 c4 O-O Nc3',
      highlights: [{ square: 'g8', color: SOFT }, { square: 'c3', color: KEY }],
      say: "...O-O Nc3 — Black castles, we develop the queen knight to c3 completing the queenside setup. Both kings safe, full central structure.",
      sayShort: 'Nc3 — finish development.',
    }),
    b({
      id: 'b6-middlegame', moves: 'Nf3 b6 g3 Bb7 Bg2 Nf6 O-O e6 d4 Be7 c4 O-O Nc3 d5 cxd5',
      highlights: [{ square: 'd5', color: SOFT }, { square: 'd5', color: ATK }],
      say: "...d5 cxd5 — Black tries the central counter, we trade pawns opening the c-file for our rook AND keeping the central pressure. The Reversed-Slav middlegame favors White's space + active piece play. 75.8% score confirms.",
      sayShort: 'cxd5 — central trade.',
    }),
  ],
};

// ============================================================
// vs ...e6 (French-style) — 451 games, 67.0% score
// Black plays ...e6 setting up a French Defense structure. We
// transpose into a KIA-vs-French (which Naroditsky knows cold).
// ============================================================
const VS_E6_FRENCH: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'vs ...e6 — KIA vs French structure',
  minutes: 7,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'e6-open', moves: 'Nf3 e6',
      highlights: [{ square: 'e6', color: KEY }],
      say: "1.Nf3 ...e6 — Black plays a French-style setup, supporting a future ...d5. The e6 commits Black to a slow positional fight. We transpose into the KIA-vs-French structure where White's plans are well-known.",
      sayShort: '...e6 — French setup.',
    }),
    b({
      id: 'e6-g3', moves: 'Nf3 e6 g3 d5',
      highlights: [{ square: 'd5', color: KEY }],
      say: "g3 ...d5 — Black plays the central pawn, supported by the e6-pawn. This is the French Defense structure but with White's knight already on f3 and the fianchetto coming.",
      sayShort: '...d5 — central pawn.',
    }),
    b({
      id: 'e6-bg2', moves: 'Nf3 e6 g3 d5 Bg2 Nf6 O-O',
      highlights: [{ square: 'g2', color: SOFT }, { square: 'g1', color: KEY }],
      say: "Bg2 ...Nf6 O-O — we complete the fianchetto + castle. Black develops the knight. The position resembles a Catalan in structure but from a different move order.",
      sayShort: 'O-O — Catalan-like.',
    }),
    b({
      id: 'e6-be7', moves: 'Nf3 e6 g3 d5 Bg2 Nf6 O-O Be7 d3',
      highlights: [{ square: 'd3', color: KEY }],
      say: "...Be7 d3 — Black continues classical development, we play the small d3 keeping options open. The d3 supports e4 later AND avoids committing to d4 (which would block our Bg2's diagonal).",
      sayShort: 'd3 — flexibility.',
    }),
    b({
      id: 'e6-nbd2', moves: 'Nf3 e6 g3 d5 Bg2 Nf6 O-O Be7 d3 O-O Nbd2',
      highlights: [{ square: 'd2', color: KEY }],
      say: "...O-O Nbd2 — Black castles, we develop the queen knight to its KIA-square. From d2, the knight prepares e4 push AND can reroute via Nf1-Ng3 toward the kingside attack.",
      sayShort: 'Nbd2 — KIA reroute square.',
    }),
    b({
      id: 'e6-e4-break', moves: 'Nf3 e6 g3 d5 Bg2 Nf6 O-O Be7 d3 O-O Nbd2 c5 e4',
      highlights: [{ square: 'e4', color: KEY }],
      say: "...c5 e4 — Black plays the central counter, we strike with e4! The e4 challenges Black's centre AND opens lines for our Bg2 + future kingside attack. This is the standard KIA-vs-French middlegame where White's attack is faster than Black's.",
      sayShort: 'e4 — central break.',
    }),
  ],
};

export const PRO_NARODITSKY_KIA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-kia::g6 Modern setup': VS_SYMMETRIC,
  'pro-naroditsky-kia::d5 KIA mainline': VS_RETI_D5,
  'pro-naroditsky-kia::d4 KID transposition': VS_PIRC_D6,
  'pro-naroditsky-kia::vs ...e5 (Reti gambit)': VS_E5_OPEN,
  'pro-naroditsky-kia::vs ...c6 (Slav-like)': VS_C6_SLAV,
  'pro-naroditsky-kia::vs ...b6 (Owen)': VS_B6_OWEN,
  'pro-naroditsky-kia::vs ...e6 (French-style)': VS_E6_FRENCH,
};
