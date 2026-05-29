import type {
  LessonScript,
  LessonBeat,
  AnnotationHighlight,
  PlayableMiddlegameLine,
} from '../../types';
import { lessonToPlayableLine } from './index';

// Pro Naroditsky Fantasy Caro trap lessons — mined from 258 Fantasy
// wins as White (smaller archive than other openings; patterns mostly
// occur in 2 games each). Per §1a TRAP RULE, the named 2700+ victims
// in these patterns (Nihal Sarin 3204 twice, Parhamov 3175, etc.)
// justify authoring despite the lower game counts.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color: string = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit { id: string; moves: string; say: string; sayShort: string; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// TRAP 1: 2g — O-O Anti-Winawer setup (Nihal Sarin 3204 + 3170 victim!)
const OO_ANTI_WINAWER_NIHAL: LessonScript = {
  openingId: 'pro-naroditsky-fantasy-caro', title: 'Weapon: O-O in Anti-Winawer line (Nihal Sarin victim 2x)', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'fan-nihal-setup', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3 Ne7 Bd3 b6 Ne2 Ba6', highlights: [H('a6', SOFT)],
      say: "Deep in the Fantasy Caro with Black's French/Winawer-style ...Bb4 + ...Bxc3+. White has the bishop pair via the doubled c-pawns. Black needs to challenge our development carefully — but Nihal Sarin played the natural O-O TWICE in different games and lost both times.",
      sayShort: '...Ba6 — challenges Bd3.' }),
    b({ id: 'fan-nihal-blunder', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3 Ne7 Bd3 b6 Ne2 Ba6 O-O', highlights: [H('g1', ATK)],
      say: "...O-O?? — Nihal Sarin's exact move TWICE at 3170 and 3204 ratings. Black castles into a kingside structure that we can directly attack with our centre + bishop pair + open f-file.",
      sayShort: '...O-O — Nihal\'s mistake.' }),
    b({ id: 'fan-nihal-bxd3', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3 Ne7 Bd3 b6 Ne2 Ba6 O-O Bxd3', highlights: [H('d3', KEY)],
      say: "...Bxd3 — Black trades the light-square bishops. The trade looks fine for Black (simplifying) but actually fixes the structural problems for White.",
      sayShort: '...Bxd3 — bishop trade.' }),
    b({ id: 'fan-nihal-cash', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3 Ne7 Bd3 b6 Ne2 Ba6 O-O Bxd3 Qxd3 O-O e5', highlights: [H('e5', KEY)],
      say: "Qxd3 ...O-O e5! — Queen recaptures, Black castles, and we push e5! The central push gains space AND cramps Black's pieces. With the doubled c-pawns + central control + queen on the kingside diagonal, White has a clear positional advantage. Nihal couldn't hold either game.",
      sayShort: 'e5 — central squeeze.' }),
  ],
};

// TRAP 2: 2g — Bc5 in Italian-style Fantasy (Parhamov 3175 victim)
const BC5_ITALIAN_FANTASY: LessonScript = {
  openingId: 'pro-naroditsky-fantasy-caro', title: 'Weapon: Bc5 in Italian-style Fantasy (Parhamov victim)', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'fan-bc5-setup', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O', highlights: [H('c4', SOFT), H('g1', SOFT)],
      say: "Fantasy Caro with central trades + Bc4 development. Black has won the d4-pawn and developed ...Nf6. The natural Italian-style ...Bc5 looks safe — but the Bc4-O-O setup exploits the weak f7-square.",
      sayShort: 'O-O — Italian setup.' }),
    b({ id: 'fan-bc5-blunder', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O Bc5', highlights: [H('c5', ATK)],
      say: "...Bc5?? — natural development. Named victims at 2700+: Parhamov (3175), LiamPutnam2008 (3131 + 3042), RaunakSadhwani2005 (3026). The development looks fine but ignores the central tactical pressure.",
      sayShort: '...Bc5 — natural but wrong.' }),
    b({ id: 'fan-bc5-bxf7', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O Bc5 e5', highlights: [H('e5', KEY)],
      say: "e5! — central push attacks the Nf6 and prepares Bxf7+ tactics. Black has limited responses.",
      sayShort: 'e5 — attack Nf6.' }),
    b({ id: 'fan-bc5-cash', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O Bc5 e5 Ng4', highlights: [H('g4', KEY)],
      say: "...Ng4 — Black's only reasonable knight move. But White continues with h3 + central control. White has a strong attack, the bishop pair on the e-file, and Black's king is exposed. Conversion follows.",
      sayShort: '...Ng4 — desperate.' }),
  ],
};

// TRAP 3: 2g — Be7 in deep Fantasy + Bc4 setup (vi_pranav 3089 victim)
const BE7_DEEP_FANTASY: LessonScript = {
  openingId: 'pro-naroditsky-fantasy-caro', title: 'Weapon: Be7 in deep Fantasy (vi_pranav 3089 victim)', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'fan-be7-setup', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O', highlights: [H('c4', SOFT)],
      say: "Same Italian-style Fantasy setup as Trap 2. Black has many development choices. The ...Be7 is the seemingly-safe quiet move — but the timing is wrong.",
      sayShort: 'O-O — quiet position.' }),
    b({ id: 'fan-be7-blunder', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O Be7', highlights: [H('e7', ATK)],
      say: "...Be7?? — passive development. vi_pranav (3089) and vugarrasulov (2743) both played this. The ...Be7 doesn't address the d4-pawn weakness AND blocks the queen's path.",
      sayShort: '...Be7 — too passive.' }),
    b({ id: 'fan-be7-nxd4', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O Be7 Nxd4', highlights: [H('d4', ATK)],
      say: "Nxd4 — White recaptures the central pawn. Now White has the central knight outpost, the bishop pair, and full development against Black's passive position.",
      sayShort: 'Nxd4 — central + active.' }),
    b({ id: 'fan-be7-cash', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Nf6 O-O Be7 Nxd4 O-O Nc3', highlights: [H('c3', KEY)],
      say: "...O-O Nc3 — Black castles, we develop the queen knight. White has reached a textbook Fantasy middlegame position: central knight on d4, bishop pair, opened files, classical setup. Conversion is standard positional play.",
      sayShort: 'Nc3 — textbook middlegame.' }),
  ],
};

interface TrapEntry { name: string; lesson: LessonScript; }
const TRAPS: TrapEntry[] = [
  { name: 'O-O in Anti-Winawer line (Nihal Sarin victim 2x)', lesson: OO_ANTI_WINAWER_NIHAL },
  { name: 'Bc5 in Italian-style Fantasy (Parhamov victim)', lesson: BC5_ITALIAN_FANTASY },
  { name: 'Be7 in deep Fantasy (vi_pranav victim)', lesson: BE7_DEEP_FANTASY },
];

export function getProNaroditskyFantasyTrapLesson(name: string): LessonScript | null {
  return TRAPS.find((t) => t.name === name)?.lesson ?? null;
}
export function getProNaroditskyFantasyTrapPlayableLine(name: string): PlayableMiddlegameLine | null {
  const lesson = getProNaroditskyFantasyTrapLesson(name);
  return lesson ? lessonToPlayableLine(lesson) : null;
}
