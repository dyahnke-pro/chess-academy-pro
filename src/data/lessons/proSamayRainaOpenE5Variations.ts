import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Open Games / …e5 per-variation lessons (Black). Names match
// pro-repertoires.json. Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-open-e5';
const SRC = ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const VS_RUY: LessonScript = {
  openingId: OID, title: 'vs Ruy Lopez (3.Bb5)', minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'a6-nf6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6',
      arrows: [A('f6', 'e4')], highlights: [{ square: 'a6', color: KEY }, { square: 'f6', color: SOFT }],
      say: "When White tries the Ruy with Bb5, we play the main line: a6 to question the bishop, then Nf6 hitting e4. The most respected, most principled answer to the Spanish.",
      sayShort: '…a6, …Nf6 — the Ruy main.' }),
    b({ id: 'be7', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3',
      highlights: [{ square: 'b5', color: KEY }, { square: 'b3', color: SOFT }],
      say: "We develop Be7, castle, and expand with b5, kicking the bishop to b3; d6 then supports e5 and frees the c8-bishop. This is the rock-solid Closed Ruy that has served champions for a century.",
      sayShort: '…b5, …d6 — solid Closed Ruy.' }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O',
      arrows: [A('c6', 'a5')], highlights: [{ square: 'a5', color: SOFT }, { square: 'c5', color: KEY }],
      say: "The plan: the Chigorin maneuver Na5 to hit the b3-bishop, then c5 to challenge White's coming d4 and grab queenside space. Black holds the centre, expands, and looks for the d5 break — a complete, dynamic counter to the Ruy.",
      sayShort: 'Plan: …Na5, …c5, fight for d5.' }),
  ],
};

const VS_SCOTCH: LessonScript = {
  openingId: OID, title: 'vs Scotch (3.d4)', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd4', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4',
      arrows: [], highlights: [{ square: 'b4', color: KEY }, { square: 'e4', color: SOFT }],
      say: "Against the Scotch, after …exd4 and Nxd4 we hit e4 with …Nf6 and pin the c3-knight with …Bb4 — the solid Schmidt approach. We get rapid development and pressure on e4, fully equalising.",
      sayShort: '…Bb4 — pin and hit e4.' }),
    b({ id: 'trade', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5',
      arrows: [], highlights: [{ square: 'd5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "White trades on c6 and we recapture …bxc6, then strike the centre with …d5! The doubled c-pawns are a small concession; in return Black gets a strong centre, the bishop pair, and active piece play.",
      sayShort: '…d5 — strike the centre.' }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5',
      arrows: [A('c8', 'a6'), A('d8', 'd6')], highlights: [{ square: 'e4', color: KEY }],
      say: "The plan: castle, develop the bishops actively (…Ba6 or …Bg4), and use the central majority and the two bishops. Black's structure is slightly loose but the dynamic activity fully compensates — equal and double-edged.",
      sayShort: 'Plan: develop bishops, use the centre.' }),
  ],
};

const VS_FOUR_KNIGHTS: LessonScript = {
  openingId: OID, title: 'vs Four Knights (3.Nc3)', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf6', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4',
      arrows: [], highlights: [{ square: 'b4', color: KEY }, { square: 'c3', color: SOFT }],
      say: "The symmetrical Four Knights. We copy with …Nf6 and, when White pins with Bb5, we pin right back with …Bb4 — the principled, fully-equal Symmetrical Variation. Black keeps the balance with easy development.",
      sayShort: '…Bb4 — pin for pin, equal.' }),
    b({ id: 'oo', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3 Qe7',
      arrows: [], highlights: [{ square: 'c3', color: KEY }],
      say: "Both castle; we break the symmetry at the right moment with …Bxc3, damaging White's queenside pawns, and regroup with …Qe7. Black has a sound structure and a clear plan against the doubled c-pawns.",
      sayShort: '…Bxc3 — double White’s pawns.' }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3 Qe7',
      arrows: [A('c6', 'd8'), A('f6', 'd7')], highlights: [{ square: 'c5', color: SOFT }, { square: 'd5', color: KEY }],
      say: "The plan: reroute the knights toward the holes in White's queenside (…Nd8-e6 or …Nd7-c5), pressure the doubled c-pawns, and aim for …d5 or …Bg4 to free the position. Solid equality with the easier game to play.",
      sayShort: 'Plan: target c3/c4, free with …d5.' }),
  ],
};

export const PRO_SAMAYRAINA_OPEN_E5_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs Ruy Lopez (3.Bb5)`]: VS_RUY,
  [`${OID}::vs Scotch (3.d4)`]: VS_SCOTCH,
  [`${OID}::vs Four Knights (3.Nc3)`]: VS_FOUR_KNIGHTS,
};
