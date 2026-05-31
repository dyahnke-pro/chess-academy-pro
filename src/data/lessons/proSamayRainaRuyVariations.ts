import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Ruy Lopez per-variation lessons (White). Names match
// pro-repertoires.json. Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-ruy';
const SRC = ['concept:pos-development', 'concept:end-bishop-vs-knight', 'https://www.chess.com/openings/Ruy-Lopez', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const BERLIN: LessonScript = {
  openingId: OID, title: 'Ruy Lopez — Berlin Defense', minutes: 6,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf6', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4',
      arrows: [], highlights: [{ square: 'e4', color: SOFT }, { square: 'd4', color: KEY }],
      say: "The rock-solid Berlin: Black grabs e4 and we strike the centre with d4. Rather than fear the famous Berlin endgame, we play it with understanding — White keeps a small, durable edge thanks to the kingside pawn majority.",
      sayShort: 'd4 — meet the Berlin head-on.' }),
    b({ id: 'endgame', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',
      arrows: [], highlights: [{ square: 'e5', color: KEY }, { square: 'd8', color: SOFT }],
      say: "The Berlin endgame. Queens come off and Black's king is stuck on d8 having lost the right to castle. In return Black has the bishop pair, but our extra kingside pawn and Black's shattered queenside structure give White the long-term pull.",
      sayShort: 'Berlin endgame — White’s pull.' }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',
      arrows: [A('b1', 'c3'), A('f1', 'd1')], highlights: [{ square: 'e5', color: KEY }, { square: 'd1', color: SOFT }],
      say: "The plan: develop Nc3 and Rd1 with tempo against the stuck king, advance the kingside majority with g4 and f4 to create a passed pawn, and restrain Black's bishop pair. Patient technique converts the structural edge — the way to play the Berlin for a win.",
      sayShort: 'Plan: Nc3, Rd1, push the majority.' }),
  ],
};

const EXCHANGE: LessonScript = {
  openingId: OID, title: 'Ruy Lopez — Exchange Variation', minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bxc6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6',
      arrows: [], highlights: [{ square: 'c6', color: KEY }],
      say: "The Exchange Ruy — a clean, low-theory try. We trade on c6, doubling Black's pawns. We concede the bishop pair, but in return Black's pawn structure is permanently damaged: the queenside majority can never make a healthy passed pawn.",
      sayShort: 'Bxc6 — double Black’s pawns.' }),
    b({ id: 'd4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5',
      highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: SOFT }],
      say: "We castle and break with d4, trading into a position where the pawn structure does all the talking. Black's bishop pair is real, but in the endgame White's healthy 4-vs-3 kingside majority creates an outside passed pawn while Black's queenside majority is crippled.",
      sayShort: 'd4 — head for the better ending.' }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5',
      arrows: [A('b1', 'c3')], highlights: [{ square: 'e5', color: SOFT }, { square: 'f4', color: KEY }],
      say: "The plan: trade pieces to reach an endgame, then advance the kingside majority with f4-e5 and create a passed pawn. Keep the queens off and the knights on — knights are perfect for exploiting Black's static pawn weaknesses. A textbook structural grind.",
      sayShort: 'Plan: trade down, run the majority.' }),
  ],
};

const STEINITZ: LessonScript = {
  openingId: OID, title: 'Ruy Lopez — vs 3…d6 (Steinitz)', minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd6', moves: 'e4 e5 Nf3 Nc6 Bb5 d6 d4 Bd7 Nc3 Nf6 O-O Be7',
      arrows: [], highlights: [{ square: 'd6', color: SOFT }, { square: 'd4', color: KEY }],
      say: "Against the solid but passive Steinitz (…d6), we grab the centre with d4 at once. Black's setup is cramped; we develop classically with Nc3 and castle, enjoying more space and easier development.",
      sayShort: 'd4 — punish the passive …d6.' }),
    b({ id: 'center', moves: 'e4 e5 Nf3 Nc6 Bb5 d6 d4 Bd7 Nc3 Nf6 O-O Be7 Re1 exd4 Nxd4 O-O',
      arrows: [], highlights: [{ square: 'd4', color: KEY }],
      say: "Re1 piles on e5, and after Black releases with …exd4 we recapture with the knight, reaching an Open-Sicilian-style position with a strong knight on d4 and a clear space edge. Black is solid but passive — perfect to squeeze.",
      sayShort: 'Re1, Nxd4 — central grip.' }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 Bb5 d6 d4 Bd7 Nc3 Nf6 O-O Be7 Re1 exd4 Nxd4 O-O',
      arrows: [A('d4', 'f5'), A('b5', 'f1')], highlights: [{ square: 'f5', color: SOFT }, { square: 'd5', color: KEY }],
      say: "The plan: keep the space advantage, reroute the light bishop, and probe with Nd4-f5 or the central e4-e5 break. Black's lack of space means any inaccuracy lets White seize the initiative. Pure positional pressure.",
      sayShort: 'Plan: keep space, probe Nf5/e5.' }),
  ],
};

export const PRO_SAMAYRAINA_RUY_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Berlin Defense`]: BERLIN,
  [`${OID}::Exchange Variation`]: EXCHANGE,
  [`${OID}::vs 3…d6 (Steinitz)`]: STEINITZ,
};
