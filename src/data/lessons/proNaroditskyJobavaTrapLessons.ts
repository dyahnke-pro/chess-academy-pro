import type {
  LessonScript,
  LessonBeat,
  AnnotationHighlight,
  PlayableMiddlegameLine,
} from '../../types';
import { lessonToPlayableLine } from './index';

// Pro Naroditsky Jobava London trap lessons — mined from 1,415 wins
// as White, 1,226 Black-blunder positions, 1,025 unique patterns.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color: string = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit { id: string; moves: string; say: string; sayShort: string; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'https://www.chess.com/openings/Jobava-London-System',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// TRAP 1: 29g — Nf6 lets Nxf6+ wreck the kingside (Firouzja victim 3x!)
const NF6_NXF6_GXF6: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london', title: 'Weapon: Nf6 lets Nxf6+ wreck Black\'s kingside (Firouzja 3x!)', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'job-f6-setup', moves: 'd4 d5 Nc3 e6 e4 dxe4 Nxe4', highlights: [H('e4', SOFT)],
      say: "After 2.Nc3 e6 3.e4 dxe4 4.Nxe4, our knight sits centralised. Black needs to challenge it carefully. The natural ...Nf6 is the wrong move — it walks straight into Nxf6+.",
      sayShort: 'Nxe4 — centralised.' }),
    b({ id: 'job-f6-blunder', moves: 'd4 d5 Nc3 e6 e4 dxe4 Nxe4 Nf6', highlights: [H('f6', ATK)],
      say: "...Nf6?? — Black attacks the e4-knight, but the trade is in our favour. 29 opponents made this move including FIROUZJA THREE TIMES (3020, 3016, 2997). The Nxf6+ wreck-the-kingside response.",
      sayShort: '...Nf6 — walk into Nxf6+.' }),
    b({ id: 'job-f6-trade', moves: 'd4 d5 Nc3 e6 e4 dxe4 Nxe4 Nf6 Nxf6+ gxf6', highlights: [H('f6', KEY)],
      say: "Nxf6+ ...gxf6! Black's only good recapture is the g-pawn (exf6 closes Black's bishop diagonal). Now Black has doubled f-pawns + a structurally damaged kingside + can't castle short safely.",
      sayShort: 'Nxf6+ ...gxf6 — wreck the kingside.' }),
    b({ id: 'job-f6-cash', moves: 'd4 d5 Nc3 e6 e4 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 b6 g3', highlights: [H('g3', KEY)],
      say: "Nf3 ...b6 g3 — White develops calmly. The doubled f-pawns + weak kingside + Bg7 fianchetto blocked = clear positional advantage. Conversion in 20-30 moves.",
      sayShort: 'g3 — convert the structure.' }),
  ],
};

// TRAP 2: 18g — Nd7 same theme but different recapture
const ND7_KNIGHT_TRADE: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london', title: 'Weapon: Nd7 lets us trade both knights favorably', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'job-nd7-setup', moves: 'd4 d5 Nc3 e6 e4 dxe4 Nxe4', highlights: [H('e4', SOFT)],
      say: "Same start as Trap 1. After Nxe4, Black needs to develop without provoking unfavorable trades. The ...Nd7 is the slow-developer's mistake.",
      sayShort: 'Nxe4 — wait for slip.' }),
    b({ id: 'job-nd7-blunder', moves: 'd4 d5 Nc3 e6 e4 dxe4 Nxe4 Nd7', highlights: [H('d7', ATK)],
      say: "...Nd7 — Black develops without addressing the central knight. 18 opponents played this including penguingm1 (2908) and hansen (2955). White's setup just keeps adding pressure.",
      sayShort: '...Nd7 — passive.' }),
    b({ id: 'job-nd7-develop', moves: 'd4 d5 Nc3 e6 e4 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6', highlights: [H('f6', KEY)],
      say: "Nf3 ...Ngf6 Nxf6+ ...Nxf6 — when Black finally develops the knight to f6, we trade with check. Black recaptures with the OTHER knight (not the g-pawn) keeping structure but losing the more flexible knight.",
      sayShort: 'Nxf6+ — knight trade.' }),
    b({ id: 'job-nd7-cash', moves: 'd4 d5 Nc3 e6 e4 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 g3', highlights: [H('g3', KEY)],
      say: "g3 — White completes the fianchetto setup with Bg2 coming. Black's pieces are passively placed AND White has the bishop pair + better development. Slow squeeze.",
      sayShort: 'g3 — fianchetto setup.' }),
  ],
};

// TRAP 3: 15g — Bf5 e3 e6 lets f3 + g4 storm (wonderfultime 3221 victim!)
const BF5_E6_F3_STORM: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london', title: 'Weapon: ...e6 after Bf5 lets f3+g4 kingside storm', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'job-bf5-setup', moves: 'd4 d5 Nc3 Nf6 Bf4 Bf5 e3', highlights: [H('e3', SOFT)],
      say: "Slav-style Jobava: after ...Nf6 ...Bf5, we play e3 keeping options open. Black must choose between active development (...c6 + ...e6) or quieter setups. The ...e6 here invites a kingside storm.",
      sayShort: 'e3 — wait.' }),
    b({ id: 'job-bf5-blunder', moves: 'd4 d5 Nc3 Nf6 Bf4 Bf5 e3 e6', highlights: [H('e6', ATK)],
      say: "...e6 — Black supports d5 but commits the kingside structure. 15 opponents played this including wonderfultime at 3221! The f3 + g4 storm setup is the punishment.",
      sayShort: '...e6 — kingside commit.' }),
    b({ id: 'job-bf5-f3', moves: 'd4 d5 Nc3 Nf6 Bf4 Bf5 e3 e6 f3', highlights: [H('f3', KEY)],
      say: "f3 — preparing g4 chasing the Bf5. Black's bishop must move, AND the kingside expansion gains space.",
      sayShort: 'f3 — prep g4.' }),
    b({ id: 'job-bf5-cash', moves: 'd4 d5 Nc3 Nf6 Bf4 Bf5 e3 e6 f3 Bd6 Bxd6 Qxd6 g4', highlights: [H('g4', KEY)],
      say: "...Bd6 Bxd6 ...Qxd6 g4! Black trades the dark-square bishop (forced eventually), and the g4 push gains the kingside. White has space + structure + safe king with O-O-O potential.",
      sayShort: 'g4 — kingside storm.' }),
  ],
};

// TRAP 4: 14g — Bg5 + dxe4 lets Nxe4 + Bxf6 wreck the structure
const BG5_DXE4_BXF6: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london', title: 'Weapon: Bg5 + dxe4 + Bxf6 doubles Black\'s pawns', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'job-bg5-setup', moves: 'd4 d5 Nc3 e6 e4 Nf6 Bg5', highlights: [H('g5', KEY)],
      say: "Jobava with the Bg5 pin instead of the Bf4 setup. The pin against Black's f6-knight + queen creates immediate tactical pressure.",
      sayShort: 'Bg5 — pin Nf6.' }),
    b({ id: 'job-bg5-blunder', moves: 'd4 d5 Nc3 e6 e4 Nf6 Bg5 dxe4', highlights: [H('e4', ATK)],
      say: "...dxe4?? — Black grabs the central pawn but doesn't address the pin. 14 opponents played this. The Nxe4 + Bxf6 follows.",
      sayShort: '...dxe4 — grab + pin.' }),
    b({ id: 'job-bg5-nxe4', moves: 'd4 d5 Nc3 e6 e4 Nf6 Bg5 dxe4 Nxe4', highlights: [H('e4', KEY), H('f6', ATK)],
      say: "Nxe4! The knight recaptures, AND attacks the f6-knight (which is pinned by Bg5). Black has no good answer.",
      sayShort: 'Nxe4 — attack + pin.' }),
    b({ id: 'job-bg5-cash', moves: 'd4 d5 Nc3 e6 e4 Nf6 Bg5 dxe4 Nxe4 Be7 Bxf6 gxf6 Nf3', highlights: [H('f6', KEY)],
      say: "...Be7 Bxf6 ...gxf6 Nf3 — Black tries to develop but Bxf6 wrecks the structure first. Doubled f-pawns + weak king position + lost bishop pair = winning conversion.",
      sayShort: 'Nf3 — convert.' }),
  ],
};

// TRAP 5: 13g — Bd6 + Bxd6 trade in Bf4 + e6 setup (Firouzja 3169 victim)
const BD6_VOLUNTARY_TRADE: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london', title: 'Weapon: Bd6 voluntary trade hands us c-file pressure', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'job-bd6-setup', moves: 'd4 d5 Nc3 e6 Bf4 Nf6 e3', highlights: [H('f4', SOFT)],
      say: "Classical Jobava + French-style ...e6. Black needs to find active development. The ...Bd6 offering bishop trade is the natural move — but the structural consequences favor White.",
      sayShort: 'e3 — invite ...Bd6.' }),
    b({ id: 'job-bd6-blunder', moves: 'd4 d5 Nc3 e6 Bf4 Nf6 e3 Bd6', highlights: [H('d6', ATK)],
      say: "...Bd6 — offering the bishop trade. 13 opponents played this including Firouzja2003 (3169) and penguingm1 (3081). The Bxd6 cxd6 sequence damages Black's structure.",
      sayShort: '...Bd6 — trade offered.' }),
    b({ id: 'job-bd6-develop', moves: 'd4 d5 Nc3 e6 Bf4 Nf6 e3 Bd6 Bd3 O-O Nf3 c5', highlights: [H('c5', SOFT)],
      say: "Bd3 ...O-O Nf3 ...c5 — develop calmly, eventually Black plays ...c5 to challenge the centre. Now we take the bishop trade on our terms.",
      sayShort: 'Nf3 ...c5.' }),
    b({ id: 'job-bd6-cash', moves: 'd4 d5 Nc3 e6 Bf4 Nf6 e3 Bd6 Bd3 O-O Nf3 c5 Bxd6', highlights: [H('d6', KEY)],
      say: "Bxd6! — taking the trade at the right moment. Black recaptures with the queen or pawn (Qxd6 or cxd6) — either way White gets the open c-file or the structural target. Kingside attack with Qe2 + Ne5 + f4 follows.",
      sayShort: 'Bxd6 — convert the structure.' }),
  ],
};

interface TrapEntry { name: string; lesson: LessonScript; }
const TRAPS: TrapEntry[] = [
  { name: 'Nf6 lets Nxf6+ wreck Black\'s kingside (Firouzja 3x!)', lesson: NF6_NXF6_GXF6 },
  { name: 'Nd7 lets us trade both knights favorably', lesson: ND7_KNIGHT_TRADE },
  { name: '...e6 after Bf5 lets f3+g4 kingside storm', lesson: BF5_E6_F3_STORM },
  { name: 'Bg5 + dxe4 + Bxf6 doubles Black\'s pawns', lesson: BG5_DXE4_BXF6 },
  { name: 'Bd6 voluntary trade hands us c-file pressure', lesson: BD6_VOLUNTARY_TRADE },
];

export function getProNaroditskyJobavaTrapLesson(name: string): LessonScript | null {
  return TRAPS.find((t) => t.name === name)?.lesson ?? null;
}
export function getProNaroditskyJobavaTrapPlayableLine(name: string): PlayableMiddlegameLine | null {
  const lesson = getProNaroditskyJobavaTrapLesson(name);
  return lesson ? lessonToPlayableLine(lesson) : null;
}
