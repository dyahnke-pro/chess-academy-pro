import type {
  LessonScript,
  LessonBeat,
  AnnotationHighlight,
  PlayableMiddlegameLine,
} from '../../types';
import { lessonToPlayableLine } from './index';

// Pro Naroditsky Najdorf trap lessons — mined from 2,088 Najdorf wins
// as Black (1,803 White-blunder positions, 1,635 unique patterns).
// Najdorf is highly theoretical so patterns are less concentrated; top
// 5 still feature named 2700+ victims.

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
  'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// TRAP 1: 18 games — Nc3 after early ...e5 lets Black trade and develop with tempo (Firouzja victim)
const NC3_E5_TRADE: LessonScript = {
  openingId: 'pro-naroditsky-najdorf', title: 'Weapon: Nc3 after ...e5 lets us trade with tempo', minutes: 3, orientation: 'black', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'naj-nc3-setup', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 e5', highlights: [H('e5', KEY), H('d4', SOFT)],
      say: "After the Open Sicilian central trades, Black plays an early ...e5 — challenging the centralized knight before completing development. The correct response from White is Nb3 (retreat with tempo) or even sacrifices. The wrong move is Nc3 — and 18 opponents played it.",
      sayShort: '...e5 — early central strike.' }),
    b({ id: 'naj-nc3-blunder', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 e5 Nc3', highlights: [H('c3', ATK)],
      say: "Nc3?? — White develops the queen knight INSTEAD of moving the attacked d4-knight. The d4-knight is loose. Named 2700+ victim: Firouzja2003 (3139). The exd4 takedown wins material.",
      sayShort: 'Nc3 — loose knight.' }),
    b({ id: 'naj-nc3-grab', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 e5 Nc3 exd4', highlights: [H('d4', ATK)],
      say: "...exd4! Black grabs the knight. White must recapture with the queen (Qxd4) — the only piece able to.",
      sayShort: '...exd4 — win the knight.' }),
    b({ id: 'naj-nc3-cash', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 e5 Nc3 exd4 Qxd4 Nc6 Qd3 Nf6', highlights: [H('f6', KEY)],
      say: "Qxd4 ...Nc6 Qd3 ...Nf6 — White's queen sits in the middle, gets kicked by Nc6, retreats to d3, AND Black develops a knight with tempo. Black is ahead in development AND has the better structure. The Nc3 blunder costs an entire opening's worth of tempo.",
      sayShort: '...Nf6 — develop with tempo.' }),
  ],
};

// TRAP 2: 18 games — English Attack Bxf6 trade in the long-castled race
const BXF6_ENGLISH_RACE: LessonScript = {
  openingId: 'pro-naroditsky-najdorf', title: 'Weapon: Bxf6 trade in the English Attack race', minutes: 3, orientation: 'black', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'naj-bxf6-setup', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 h6', highlights: [H('h6', KEY)],
      say: "Deep in the English Attack: White has castled long with the g4 storm coming, Black has played ...h6 forcing White's bishop to declare. The correct retreat is Bh4 (keeping the pin). The wrong move is Bxf6.",
      sayShort: '...h6 — force the question.' }),
    b({ id: 'naj-bxf6-blunder', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 h6 Bxf6', highlights: [H('f6', ATK)],
      say: "Bxf6?? — White trades the bishop voluntarily. The trade looks normal but it gives up White's most active attacker for nothing AND lets Black recapture with the bishop maintaining structural integrity.",
      sayShort: 'Bxf6 — voluntary trade.' }),
    b({ id: 'naj-bxf6-recap', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 h6 Bxf6 Bxf6', highlights: [H('f6', KEY)],
      say: "...Bxf6! Black recaptures with the bishop (keeping the pawn structure intact). The Bf6 covers the dark squares around the queenside king AND eyes the white queenside attack lanes. Now Black's race is faster.",
      sayShort: '...Bxf6 — bishop pair preserved.' }),
    b({ id: 'naj-bxf6-cash', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 h6 Bxf6 Bxf6 h4 Nb6 g5 Bxd4', highlights: [H('d4', KEY)],
      say: "h4 ...Nb6 g5 ...Bxd4! — White continues the kingside push, Black brings the knight to b6, and Black trades the bishop for the centralized d4-knight. Black has won material AND the queenside race.",
      sayShort: '...Bxd4 — win material in the race.' }),
  ],
};

// TRAP 3: 15 games — Nc3 + Be3 lets ...Ng4 + Nxe3 wreck the structure
const NG4_BE3_TRADE: LessonScript = {
  openingId: 'pro-naroditsky-najdorf', title: 'Weapon: ...Ng4 trades for the dark-square bishop', minutes: 3, orientation: 'black', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'naj-ng4-setup', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6', highlights: [H('f6', SOFT)],
      say: "Standard Open Sicilian moves. White's choice here is Nc3 (mainline) or Bc4 (Sozin) or Bg5 (Bg5 attack). The Nc3 lets the Ng4 tactic when followed by an early Be3.",
      sayShort: 'Standard Sicilian.' }),
    b({ id: 'naj-ng4-blunder', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Be3', highlights: [H('e3', ATK)],
      say: "Nc3 ...Nc6 Be3 — White's Be3 develops the dark-square bishop early. 15 opponents made this commitment including AliceWells (3005). The Be3 is the tactical hole.",
      sayShort: 'Be3 — early commitment.' }),
    b({ id: 'naj-ng4-jump', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Be3 Ng4', highlights: [H('g4', ATK), H('e3', SOFT)],
      say: "...Ng4! The knight jumps to g4 attacking the bishop. White's options are bad: Bg5 retreats and gets attacked again, or accept the trade with Qd2 (then ...Nxe3).",
      sayShort: '...Ng4 — attack the bishop.' }),
    b({ id: 'naj-ng4-cash', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Be3 Ng4 Qd2 Nxe3', highlights: [H('e3', ATK)],
      say: "Qd2 ...Nxe3! Black takes the bishop, forcing White's queen to recapture (fxe3 wrecks the structure permanently). Black has won the bishop pair AND damaged White's pawn structure — clear positional advantage.",
      sayShort: '...Nxe3 — bishop pair won.' }),
  ],
};

// TRAP 4: 9 games — Bb5 in deep English Attack position
const BB5_DEEP_ENGLISH: LessonScript = {
  openingId: 'pro-naroditsky-najdorf', title: 'Weapon: Bb5 in deep English Attack (queen-trade trap)', minutes: 3, orientation: 'black', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'naj-bb5-setup', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 Qd2 Be7 O-O-O O-O f3 a5', highlights: [H('a5', KEY)],
      say: "Deep in the English Attack with castles done both sides. Black plays ...a5 starting the queenside attack. The correct White move is to continue with g4. The wrong move is Bb5.",
      sayShort: '...a5 — queenside push.' }),
    b({ id: 'naj-bb5-blunder', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 Qd2 Be7 O-O-O O-O f3 a5 Bb5', highlights: [H('b5', ATK)],
      say: "Bb5?? — White's bishop targets the loose a-pawn, but the bishop is itself loose. 9 opponents including JamesG478 (2828) and lucasmito (2846) played this. The Na6 + Nc7 maneuver wins the bishop.",
      sayShort: 'Bb5 — loose bishop.' }),
    b({ id: 'naj-bb5-attack', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 Qd2 Be7 O-O-O O-O f3 a5 Bb5 Na6', highlights: [H('a6', KEY)],
      say: "...Na6! The knight develops attacking the b4-square and preparing ...Nc7 attacking the loose Bb5.",
      sayShort: '...Na6 — toward Nc7.' }),
    b({ id: 'naj-bb5-cash', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 Qd2 Be7 O-O-O O-O f3 a5 Bb5 Na6 g4 Nc7 a4 Nxb5', highlights: [H('b5', ATK)],
      say: "g4 ...Nc7 a4 ...Nxb5! Black wins the bishop. The position favors Black: extra piece, active queenside, AND White's queenside attack is dead.",
      sayShort: '...Nxb5 — win the bishop.' }),
  ],
};

// TRAP 5: 6 games — Be3+Nd5 trade lets Black grab Nd5 with Bxd5
const BE3_ND5_TRADE: LessonScript = {
  openingId: 'pro-naroditsky-najdorf', title: 'Weapon: Be3+Nd5 lets Black trade with ...Bxd5', minutes: 3, orientation: 'black', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'naj-bd5-setup', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O', highlights: [H('g8', SOFT)],
      say: "Classical Najdorf with Be2 setup. Both sides have developed and castled. The correct White plan is c4 (Maroczy-like) or Re1 (slow improvement). The wrong move is the early Be3.",
      sayShort: 'O-O — both safe.' }),
    b({ id: 'naj-bd5-blunder', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3', highlights: [H('e3', ATK)],
      say: "Be3?? — White's dark-square bishop development. 6 opponents fell into this including dropstoneDP (3015) and sergoy (2986). The Nd5 outpost trade exposes the bishop.",
      sayShort: 'Be3 — exposes the bishop.' }),
    b({ id: 'naj-bd5-be6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Nd5', highlights: [H('d5', SOFT)],
      say: "...Be6 Nd5 — Black develops the bishop to its active square, White tries the central knight outpost. Now Black trades favorably.",
      sayShort: 'Nd5 — central outpost.' }),
    b({ id: 'naj-bd5-cash', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Nd5 Nbd7 Qd3 Bxd5', highlights: [H('d5', ATK)],
      say: "...Nbd7 Qd3 ...Bxd5! Black trades the light-square bishop for the central knight. White must recapture with exd5 or Bxd5 — either way the structure is damaged AND Black has the bishop pair.",
      sayShort: '...Bxd5 — bishop pair.' }),
  ],
};

interface TrapEntry { name: string; lesson: LessonScript; }
const TRAPS: TrapEntry[] = [
  { name: 'Nc3 after ...e5 lets us trade with tempo', lesson: NC3_E5_TRADE },
  { name: 'Bxf6 trade in the English Attack race', lesson: BXF6_ENGLISH_RACE },
  { name: '...Ng4 trades for the dark-square bishop', lesson: NG4_BE3_TRADE },
  { name: 'Bb5 in deep English Attack (queen-trade trap)', lesson: BB5_DEEP_ENGLISH },
  { name: 'Be3+Nd5 lets Black trade with ...Bxd5', lesson: BE3_ND5_TRADE },
];

export function getProNaroditskyNajdorfTrapLesson(name: string): LessonScript | null {
  return TRAPS.find((t) => t.name === name)?.lesson ?? null;
}
export function getProNaroditskyNajdorfTrapPlayableLine(name: string): PlayableMiddlegameLine | null {
  const lesson = getProNaroditskyNajdorfTrapLesson(name);
  return lesson ? lessonToPlayableLine(lesson) : null;
}
