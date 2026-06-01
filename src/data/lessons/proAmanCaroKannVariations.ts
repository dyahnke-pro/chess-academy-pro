import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Caro-Kann variation lessons. Real data spines.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:chess-fundamentals',
  'concept:pos-development',
  'https://www.chess.com/openings/Caro-Kann-Defense',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_CARO_KANN_VARIATION_LESSONS: Record<string, LessonScript> = {
  // ── Advance main tab (its own tab alongside the keystone) ──
  'pro-aman-caro-kann::Advance (…Bf5)': {
    openingId: 'pro-aman-caro-kann',
    title: 'Caro Advance — the Bishop Out Before the Wall',
    minutes: 8,
    orientation: 'black',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'bf5', moves: 'e4 c6 d4 d5 e5 Bf5', arrows: [A('c8', 'f5')], highlights: [H('f5')],
        say: "White grabs space with e5, and here is the Caro's whole point: …Bf5! The light-squared bishop develops OUTSIDE the pawn chain — the very piece that stays trapped in the French.",
        sayShort: '…Bf5 — bishop out first.' }),
      b({ id: 'e6', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6', highlights: [H('e6')],
        say: "Only now …e6 builds the solid wall, behind the already-freed bishop. The dream version of the French — the problem bishop is already outside.",
        sayShort: '…e6 — build the wall.' }),
      b({ id: 'ne7', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7 O-O Ne7', arrows: [A('g8', 'e7')], highlights: [H('e7')],
        say: "Black develops …Nd7 and reroutes …Ne7 toward g6, adding pressure on the e5-pawn while keeping the …f6 break in reserve. Harmonious play around the wall.",
        sayShort: '…Ne7 — reroute toward g6.' }),
      b({ id: 'bg6', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7 O-O Ne7 Nh4 Bg6', arrows: [A('f5', 'g6')], highlights: [H('g6')],
        say: "White tries Nh4 to trade the good bishop, but …Bg6 keeps it on a safe diagonal. The classic Caro: solid wall, good bishop alive, and the …c5 and …f6 breaks in hand. Comfortable equality.",
        sayShort: '…Bg6 — keep the good bishop.' }),
    ],
  },

  // ── Two Knights: 2.Nf3 (235 games) ──
  'pro-aman-caro-kann::vs Two Knights (2.Nf3)': {
    openingId: 'pro-aman-caro-kann',
    title: 'Caro vs Two Knights — Trade and Solidify',
    minutes: 8,
    orientation: 'black',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'd5', moves: 'e4 c6 Nf3 d5 Nc3 dxe4 Nxe4', highlights: [H('e4')],
        say: "Against the knight to f3, Black plays …d5 and trades in the centre with …dxe4. White recaptures with the knight, and Black has the standard Caro plan: simple, solid, no weaknesses.",
        sayShort: '…d5, …dxe4 — trade the centre.' }),
      b({ id: 'nf6', moves: 'e4 c6 Nf3 d5 Nc3 dxe4 Nxe4 Nf6', arrows: [A('g8', 'f6')], highlights: [H('e4')],
        say: "…Nf6 challenges the centralised knight immediately. Black is happy to trade pieces — fewer pieces means White's small space edge matters less, and Black's structure stays rock-solid.",
        sayShort: '…Nf6 — challenge the knight.' }),
      b({ id: 'exf6', moves: 'e4 c6 Nf3 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6', highlights: [H('f6'), H('e6')],
        say: "White trades on f6; …exf6 recaptures toward the centre, opening the e-file for the rook and giving Black the half-open file plus a sound, flexible structure. The doubled f-pawns control key central squares.",
        sayShort: '…exf6 — open the e-file.' }),
      b({ id: 'bd6', moves: 'e4 c6 Nf3 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6', arrows: [A('f8', 'd6')], highlights: [H('d6')],
        say: "…Bd6 develops the bishop to its best diagonal, eyeing the kingside and preparing to castle. Black has easy, harmonious development and a structure with no targets.",
        sayShort: '…Bd6 — best diagonal.' }),
      b({ id: 'middlegame', moves: 'e4 c6 Nf3 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 d4 O-O Bd3 Re8+ Be3 Bg4 Qc2 Nd7', arrows: [A('c8', 'g4')], highlights: [H('g4')],
        say: "Black castles, swings the rook to the half-open e-file with check, and develops …Bg4 to pin. With …Nd7 completing the setup, Black reaches a comfortable, equal middlegame — every piece active, no weaknesses, and the easy long-term plan against White's slightly looser structure.",
        sayShort: '…Bg4, …Nd7 — active, equal.' }),
    ],
  },

  // ── Exchange: 3.exd5 (125 games) ──
  'pro-aman-caro-kann::vs Exchange (3.exd5)': {
    openingId: 'pro-aman-caro-kann',
    title: 'Caro vs Exchange — Easy, Symmetrical Equality',
    minutes: 7,
    orientation: 'black',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'cxd5', moves: 'e4 c6 d4 d5 exd5 cxd5', highlights: [H('d5')],
        say: "The Exchange trades in the centre, leaving a clean symmetrical structure. Black has the half-open c-file and an easy game where understanding outweighs memory — exactly the Caro player's comfort zone.",
        sayShort: '…cxd5 — symmetrical, easy.' }),
      b({ id: 'nc6', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6', arrows: [A('b8', 'c6')], highlights: [H('c6')],
        say: "White develops the bishop to d3; Black answers …Nc6, developing naturally and putting a piece on the d4-pawn's defender. No tricks, just sound principled play toward equality.",
        sayShort: '…Nc6 — natural development.' }),
      b({ id: 'qc7', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Qc7', arrows: [A('d8', 'c7')], highlights: [H('c7')],
        say: "…Qc7 takes the c-file and stops White's bishop from settling on f4 with comfort. Black plays on the half-open c-file while keeping a flexible kingside, ready to develop and castle.",
        sayShort: '…Qc7 — claim the c-file.' }),
      b({ id: 'bg4', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Qc7 Ne2 Bg4', arrows: [A('c8', 'g4')], highlights: [H('g4')],
        say: "…Bg4 develops the last minor piece actively, pinning the e2-knight and ensuring Black's pieces are every bit as active as White's. The structure is symmetrical, the pieces are out, and Black has full, comfortable equality.",
        sayShort: '…Bg4 — active, full equality.' }),
    ],
  },
};
