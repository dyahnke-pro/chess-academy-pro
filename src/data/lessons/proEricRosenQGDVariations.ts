import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — QGD per-variation lessons (Black). Names match
// pro-repertoires.json. Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-ericrosen-qgd';
const SRC = ['concept:pos-development', 'concept:pawn-isolated', 'https://www.chess.com/openings/Queens-Gambit-Declined', 'https://api.chess.com/pub/player/imrosen/games/archives'];

const VS_NF3: LessonScript = {
  openingId: OID, title: 'QGD — vs Nf3 (grab the c4-pawn)', minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf3', moves: 'd4 d5 c4 e6 Nf3 Nf6 g3 dxc4',
      arrows: [], highlights: [{ square: 'c4', color: KEY }],
      say: "When White heads for a Catalan with g3, we snatch the c4-pawn — …dxc4. We are not trying to hold it forever; we take it to disrupt White's smooth setup and gain time developing while White recoups it.",
      sayShort: '…dxc4 — grab it, gain time.' }),
    b({ id: 'bb4', moves: 'd4 d5 c4 e6 Nf3 Nf6 g3 dxc4 Bg2 Bb4+ Bd2 c5',
      arrows: [], highlights: [{ square: 'b4', color: KEY }, { square: 'c5', color: KEY }],
      say: "…Bb4+ forces a trade or a block, and …c5 strikes at the centre before White is organised. This is the modern Catalan antidote: hit d4 immediately so White never gets the long-term bind the Catalan bishop dreams of.",
      sayShort: '…Bb4+, …c5 — hit the centre fast.' }),
    b({ id: 'free', moves: 'd4 d5 c4 e6 Nf3 Nf6 g3 dxc4 Bg2 Bb4+ Bd2 c5 O-O O-O dxc5 Bxc5',
      arrows: [], highlights: [{ square: 'c5', color: KEY }],
      say: "After both castle and the central trades, our bishop lands actively on c5 and we have an easy, equal game with no weaknesses — White's extra space is gone and the famous Catalan bishop on g2 bites on granite. Exactly what Black wants.",
      sayShort: '…Bxc5 — equal, active, no weaknesses.' }),
  ],
};

const VS_BG5: LessonScript = {
  openingId: OID, title: 'QGD — Cambridge Springs (vs Bg5)', minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bg5', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 c6 e3 Nbd7',
      arrows: [A('g5', 'f6')], highlights: [{ square: 'c6', color: KEY }, { square: 'd7', color: SOFT }],
      say: "Against an early Bg5 we set up the Cambridge Springs: …c6 and …Nbd7, a deceptively venomous system. It looks passive, but it is loaded with a queen sortie that exploits the bishop's absence from the queenside.",
      sayShort: '…c6, …Nbd7 — Cambridge Springs.' }),
    b({ id: 'qa5', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 c6 e3 Nbd7 Nf3 Qa5',
      arrows: [A('a5', 'g5')], highlights: [{ square: 'a5', color: KEY }, { square: 'c3', color: SOFT }],
      say: "…Qa5! The point. The queen pins the c3-knight to the king and combines with …Bb4 and …Ne4 ideas to hit the g5-bishop and the c3-knight at once. White must be precise or drop a piece to the double attack.",
      sayShort: '…Qa5 — the pin-and-fork threat.' }),
    b({ id: 'bb4', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 c6 e3 Nbd7 Nf3 Qa5 Nd2 Bb4',
      arrows: [], highlights: [{ square: 'b4', color: KEY }, { square: 'c3', color: KEY }],
      say: "White untangles with Nd2; we pile on with …Bb4, doubling the pressure on c3. Black has a comfortable, fully-equal game with active pieces and a clear plan — the Cambridge Springs has done its job of seizing the initiative from a 'declined' opening.",
      sayShort: '…Bb4 — pile on c3, fully equal.' }),
  ],
};

export const PRO_ERICROSEN_QGD_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs Nf3 (Catalan)`]: VS_NF3,
  [`${OID}::Cambridge Springs (vs Bg5)`]: VS_BG5,
};
