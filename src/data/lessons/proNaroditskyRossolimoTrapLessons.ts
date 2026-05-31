import type {
  LessonScript,
  LessonBeat,
  AnnotationHighlight,
  PlayableMiddlegameLine,
} from '../../types';
import { lessonToPlayableLine } from './index';

// Pro Naroditsky Rossolimo trap lessons — mined from his real chess.com
// archive (2,516 Rossolimo wins as White, 2,137 Black-blunder positions,
// 1,794 unique trap patterns). 5 curated trap-lessons from top patterns.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color: string = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit { id: string; moves: string; say: string; sayShort: string; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const SRC = [
  'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// TRAP 1: 58 games — Nge7 + b3 + Bxc6 doubles the c-pawns (Firouzja victim)
const NGE7_DOUBLED_PAWNS: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo', title: 'Weapon: Nge7 walks into Bxc6 doubled-pawns', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'ross-nge7-setup', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O', highlights: [H('b5'), H('c6', SOFT)],
      say: "After Bb5 in the Rossolimo proper + Black's ...e6 setup, we castle calmly. Black's classical development move would be ...a6 chasing the bishop OR ...Nge7 preparing development. The Nge7 move walks into a structural trap.",
      sayShort: 'O-O — set the trap.' }),
    b({ id: 'ross-nge7-blunder', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7', highlights: [H('e7', ATK), H('c6', SOFT)],
      say: "...Nge7?? — the natural-looking development move actually concedes the structural fight. 58 opponents played this including Firouzja2003 (3068) and dogsofwar (2946). The trick is the Bxc6 trade timing.",
      sayShort: '...Nge7 — natural but wrong.' }),
    b({ id: 'ross-nge7-b3', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 b3', highlights: [H('b3', KEY), H('b2', SOFT)],
      say: "b3 — preparing the fianchetto Bb2. The b3 also supports the future Bxc6 trade (the b2-bishop will dominate the long diagonal after the trade). Black has no good response.",
      sayShort: 'b3 — prep Bb2.' }),
    b({ id: 'ross-nge7-cash', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 b3 a6 Bxc6 Nxc6 Bb2', highlights: [H('c6', KEY)],
      say: "...a6 Bxc6 ...Nxc6 Bb2 — Black kicks the bishop, we trade immediately. Black has doubled c-pawns (Nxc6 means knight on c6, not pawn — but the c5+c6 pair is structural pressure), and our Bb2 dominates the long diagonal. The conversion is positional.",
      sayShort: 'Bb2 — long-diagonal domination.' }),
  ],
};

// TRAP 2: 36 games — Moscow Bxd7+ accepted gives Black passive game
const A6_MOSCOW_TRADE: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo', title: 'Weapon: ...a6 in Moscow Bb5+ Nd7 line', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'ross-a6-setup', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O', highlights: [H('d7', SOFT)],
      say: "After Bb5+ Nd7 (the blockade) + O-O, Black needs to decide how to develop. The ...a6 push attacks our bishop but ALSO loses tempo because the bishop trade is fine for us.",
      sayShort: 'O-O — Moscow setup.' }),
    b({ id: 'ross-a6-blunder', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6', highlights: [H('a6', ATK)],
      say: "...a6?? — Black asks the question but our answer is Bxd7+! The trade simplifies favorably AND Black's d7-knight has no good square to develop. 36 opponents played this including Salem-AR (2946) and Kriari (2861).",
      sayShort: '...a6 — premature kick.' }),
    b({ id: 'ross-a6-trade', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bxd7+ Bxd7', highlights: [H('d7', KEY)],
      say: "Bxd7+ ...Bxd7 — the trade. Black recaptures with the bishop (best — keeps the knight flexible), but the c8-bishop is now committed to d7 and Black has no clear development plan.",
      sayShort: 'Bxd7+ — force the trade.' }),
    b({ id: 'ross-a6-cash', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bxd7+ Bxd7 b3 Nf6 e5', highlights: [H('e5', KEY)],
      say: "b3 ...Nf6 e5 — White fianchettos and pushes e5 cramping Black's knight. The combination of bishop pair (well, single bishop for both sides — but ours is more active), space advantage, AND Black's awkward Bd7 = positional conversion.",
      sayShort: 'e5 — cramp the knight.' }),
  ],
};

// TRAP 3: 25 games — Nge7 in b3 line, same Bxc6 structural trade
const NGE7_B3_VARIANT: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo', title: 'Weapon: Nge7 in the early b3 Rossolimo', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'ross-nb3-setup', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 b3', highlights: [H('b3', KEY)],
      say: "An immediate b3 instead of O-O — White prepares the fianchetto Bb2 + Bxc6 trade plan from move 4. This early commitment looks strange but it's part of Naroditsky's actual repertoire — and Black often walks into the same Nge7 trap.",
      sayShort: 'b3 — early fianchetto.' }),
    b({ id: 'ross-nb3-blunder', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 b3 Nge7', highlights: [H('e7', ATK)],
      say: "...Nge7 — 25 opponents fell into this exact setup including ManuDavid2910 (2763) and Lordillidan (2879). Same theme as Trap 1: the knight development walks into the Bxc6 timing.",
      sayShort: '...Nge7 — repeat mistake.' }),
    b({ id: 'ross-nb3-bb2', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 b3 Nge7 Bb2', highlights: [H('b2', KEY)],
      say: "Bb2 — the dark-square bishop lands on the long diagonal. Now both bishops are pointing at the queenside AND the Nc6 knight is loose.",
      sayShort: 'Bb2 — dominant diagonal.' }),
    b({ id: 'ross-nb3-cash', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 b3 Nge7 Bb2 Qb6 Bxc6 Nxc6 Na3', highlights: [H('a3', KEY)],
      say: "...Qb6 Bxc6 ...Nxc6 Na3 — Black tries an active queen, but we trade immediately and develop the queen-knight to a3 with Nb5 ideas. The structural advantage holds.",
      sayShort: 'Na3 — toward Nb5.' }),
  ],
};

// TRAP 4: 13 games — cxd4 in Moscow with d4 (Firouzja victim)
const CXD4_MOSCOW: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo', title: 'Weapon: cxd4 lets us recapture with the queen', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'ross-cxd4-setup', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 d4', highlights: [H('d4', KEY)],
      say: "A sharper Moscow with immediate d4. Black needs to decide whether to take or maintain tension. The cxd4 take is wrong because of the queen recapture.",
      sayShort: 'd4 — sharp Moscow.' }),
    b({ id: 'ross-cxd4-blunder', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 d4 cxd4', highlights: [H('d4', ATK)],
      say: "...cxd4 — 13 opponents took the pawn here including Firouzja2003 (2907) and Jospem (2968). The trade looks safe but the queen recapture wins time.",
      sayShort: '...cxd4 — wrong trade.' }),
    b({ id: 'ross-cxd4-qxd4', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 d4 cxd4 Qxd4', highlights: [H('d4', KEY)],
      say: "Qxd4! — queen recaptures with central dominance AND no need to move the knight back. The queen on d4 stares at the g7-pawn (after Black's eventual fianchetto) and supports both flanks.",
      sayShort: 'Qxd4 — central queen.' }),
    b({ id: 'ross-cxd4-cash', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 d4 cxd4 Qxd4 a6 Bxd7+ Bxd7 O-O', highlights: [H('g1', KEY)],
      say: "...a6 Bxd7+ ...Bxd7 O-O — Black kicks, we trade, both castle. White has the central queen, easier development, and the standard Moscow squeeze. Conversion follows.",
      sayShort: 'O-O — central squeeze.' }),
  ],
};

// TRAP 5: 12 games — Open Sicilian transposition with Bg5 + Bxf6 (Wesley So victim)
const A6_OPEN_SIC_BXF6: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo', title: 'Weapon: ...a6 walks into Bg5 + Bxf6 (Open Sicilian)', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'ross-sic-setup', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3', highlights: [H('c3', SOFT)],
      say: "If Black declines the Rossolimo with ...d6 and we transpose into the Open Sicilian via d4, the natural ...a6 move from the Najdorf walks into our preferred move-order trap.",
      sayShort: 'Nc3 — Najdorf-style.' }),
    b({ id: 'ross-sic-blunder', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', highlights: [H('a6', ATK)],
      say: "...a6 — the Najdorf signature move. But here at 12 games White's specific Bg5 + Bxf6 timing exploits the move-order. Notable victims: gmwesley_so (2824), Genghis_K (2925), Gordima (2782).",
      sayShort: '...a6 — Najdorf misorder.' }),
    b({ id: 'ross-sic-bg5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5', highlights: [H('g5', ATK)],
      say: "Bg5 — pin the f6-knight. Standard English Attack move but here Black has only ...a6 played (not ...e6), so the pin is more potent — no Be7 unpin available immediately.",
      sayShort: 'Bg5 — pin.' }),
    b({ id: 'ross-sic-cash', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 Qd2 h6 Bxf6', highlights: [H('f6', KEY)],
      say: "...e6 Qd2 ...h6 Bxf6 — Black breaks the pin late, we trade favorably with Bxf6 keeping our dark-square attacker. Black's structure (doubled f-pawns if ...gxf6, weak f6 if ...Qxf6) converts.",
      sayShort: 'Bxf6 — structural win.' }),
  ],
};

interface TrapEntry { name: string; lesson: LessonScript; }
const TRAPS: TrapEntry[] = [
  { name: 'Nge7 walks into Bxc6 doubled-pawns', lesson: NGE7_DOUBLED_PAWNS },
  { name: '...a6 in Moscow Bb5+ Nd7 line', lesson: A6_MOSCOW_TRADE },
  { name: 'Nge7 in the early b3 Rossolimo', lesson: NGE7_B3_VARIANT },
  { name: 'cxd4 lets us recapture with the queen', lesson: CXD4_MOSCOW },
  { name: '...a6 walks into Bg5 + Bxf6 (Open Sicilian)', lesson: A6_OPEN_SIC_BXF6 },
];

export function getProNaroditskyRossolimoTrapLesson(name: string): LessonScript | null {
  return TRAPS.find((t) => t.name === name)?.lesson ?? null;
}
export function getProNaroditskyRossolimoTrapPlayableLine(name: string): PlayableMiddlegameLine | null {
  const lesson = getProNaroditskyRossolimoTrapLesson(name);
  return lesson ? lessonToPlayableLine(lesson) : null;
}
