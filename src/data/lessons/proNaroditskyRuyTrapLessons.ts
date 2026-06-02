import type {
  LessonScript,
  LessonBeat,
  AnnotationHighlight,
  PlayableMiddlegameLine,
} from '../../types';
import { lessonToPlayableLine } from './index';

// Pro Naroditsky Ruy Lopez trap lessons — mined from 1,640 wins as
// White, 1,397 Black-blunder positions, 1,025 unique patterns. Top
// pattern (Nf6 Berlin) has 106 GAMES with named 2700+ victims.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color: string = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit { id: string; moves: string; say: string; sayShort: string; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:ruy-lopez',
  'https://www.chess.com/openings/Ruy-Lopez-Opening',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// TRAP 1: 106g — Nf6 + Be7 + Bxc6 doubled pawns (GM Wesley So victim!)
const NF6_BXC6_DOUBLED: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez', title: 'Weapon: Nf6 in Ba4 line walks into Bxc6 doubled-pawns (Wesley So victim)', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'ruy-nf6-setup', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4', highlights: [H('a4', SOFT)],
      say: "After Ba4 in the Ruy Lopez Closed system, Black's choice is critical. The classical move is ...Nf6 (Morphy Defense) — but in this specific move order, 106 opponents played it and lost the Bxc6 trade race. Largest Ruy trap pattern by far.",
      sayShort: 'Ba4 — set the trap.' }),
    b({ id: 'ruy-nf6-blunder', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6', highlights: [H('f6', ATK)],
      say: "...Nf6 — the standard move. But our exchange variation timing is sharper. 106 opponents including GM Wesley So (2787), Coldplace (2833), and GM_dmitrij (2878) walked into the Bxc6 + doubled pawns trap.",
      sayShort: '...Nf6 — standard but trapped.' }),
    b({ id: 'ruy-nf6-castle', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7', highlights: [H('g1', SOFT)],
      say: "O-O ...Be7 — White castles, Black develops. Now we strike.",
      sayShort: 'O-O ...Be7.' }),
    b({ id: 'ruy-nf6-cash', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Bxc6 dxc6 d3', highlights: [H('c6', KEY)],
      say: "Bxc6! ...dxc6 d3 — White trades the bishop voluntarily (Exchange Ruy timing), giving Black doubled c-pawns. The structural advantage compounds over the next 30 moves: White has the better pawn structure, the bishop pair, and the better endgame. 106 wins from here.",
      sayShort: 'Bxc6 — exchange + doubled pawns.' }),
  ],
};

// TRAP 2: 42g — Berlin Nd6 lets Hikaru fall into queen-trade endgame
const ND6_BERLIN_HIKARU: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez', title: 'Weapon: Nd6 in Berlin Defense (top-GM victim)', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'ruy-nd6-setup', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4', highlights: [H('d4', KEY)],
      say: "Berlin Defense with the standard d4 attacking move. Black's correct continuation is ...Nd6 (the textbook Berlin endgame) — but in the specific move order, the natural recapture is the trap.",
      sayShort: 'd4 — Berlin attack.' }),
    b({ id: 'ruy-nd6-blunder', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6', highlights: [H('d6', SOFT)],
      say: "...Nd6 — the textbook move that 42 opponents played, including HIKARU NAKAMURA (2894). The Berlin Endgame transition is supposed to be fine, but the immediate Bxc6+dxe5 sequence is sharper than Black anticipated.",
      sayShort: '...Nd6 — textbook but...' }),
    b({ id: 'ruy-nd6-trade', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5', highlights: [H('e5', KEY)],
      say: "Bxc6 ...dxc6 dxe5 — the standard Berlin sequence but here Black's knight on d6 is loose. Now the queen trade favors White.",
      sayShort: 'dxe5 — Berlin endgame.' }),
    b({ id: 'ruy-nd6-cash', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+', highlights: [H('d8', ATK)],
      say: "...Nf5 Qxd8+! — Black tries to activate the knight, but we force the queen trade. Black recaptures with the king (Kxd8) — the king on d8 is permanently exposed AND we have the structural Berlin endgame edge. A top GM lost this exact way.",
      sayShort: 'Qxd8+ — Berlin endgame won.' }),
  ],
};

// TRAP 3: 30g — Open Ruy Nc5 lets Bxc6 + Nxe5 win the pawn (Firouzja victim)
const NC5_OPEN_RUY_PAWN: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez', title: 'Weapon: Nc5 in Open Ruy lets us win the e5-pawn (Firouzja victim)', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'ruy-nc5-setup', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 Re1', highlights: [H('e1', SOFT)],
      say: "Open Ruy with Re1 setup (the Tarrasch Trap setup). Black must move the knight from e4 to a safe square. The wrong move is Nc5.",
      sayShort: 'Re1 — Tarrasch setup.' }),
    b({ id: 'ruy-nc5-blunder', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 Re1 Nc5', highlights: [H('c5', ATK)],
      say: "...Nc5 — Black tries to retreat actively, but the bishop is loose. 30 opponents made this move including Firouzja2003 (3070), Shant_Sargsyan (3016), and Jospem (3000).",
      sayShort: '...Nc5 — loose knight.' }),
    b({ id: 'ruy-nc5-bxc6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 Re1 Nc5 Bxc6 dxc6 Nxe5', highlights: [H('e5', KEY)],
      say: "Bxc6 ...dxc6 Nxe5! — We trade the bishop AND grab the e5-pawn. The knight on e5 is well-supported AND Black has no compensation for the pawn.",
      sayShort: 'Nxe5 — win the pawn.' }),
    b({ id: 'ruy-nc5-cash', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 Re1 Nc5 Bxc6 dxc6 Nxe5 Be7 d4', highlights: [H('d4', KEY)],
      say: "...Be7 d4 — Black develops, we expand the centre. White is up a clear pawn AND has a stable, well-coordinated position. Conversion is straightforward.",
      sayShort: 'd4 — central + pawn up.' }),
  ],
};

// TRAP 4: 22g — Berlin Bc5 in d3 line + Bxc6 + Bg4 pin (Hikaru victim)
const BC5_D3_HIKARU: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez', title: 'Weapon: Bc5 in d3 Berlin (beat a 2990)', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'ruy-bc5d3-setup', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3', highlights: [H('d3', SOFT)],
      say: "d3 Berlin (avoiding the main Berlin endgame). Black's options include the active ...Bc5. A top GM played this and lost — to the Bxc6 + dxc6 + Bg4 pin sequence.",
      sayShort: 'd3 — quiet Berlin.' }),
    b({ id: 'ruy-bc5d3-blunder', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5', highlights: [H('c5', ATK)],
      say: "...Bc5 — active development. 22 opponents played this including a 2990-rated GM, MichaelRoiz (2710), and Robert_Chessmood (2733).",
      sayShort: '...Bc5 — A top grandmaster\'s move.' }),
    b({ id: 'ruy-bc5d3-trade', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 Bxc6 dxc6 Nbd2 Bg4', highlights: [H('g4', KEY)],
      say: "Bxc6 ...dxc6 Nbd2 ...Bg4! Black trades the bishop pair voluntarily by playing ...Bg4 pinning our knight. But the pin doesn't actually win material because of h3.",
      sayShort: '...Bg4 — pin attempt.' }),
    b({ id: 'ruy-bc5d3-cash', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 Bxc6 dxc6 Nbd2 Bg4 h3', highlights: [H('h3', KEY)],
      say: "h3 — White breaks the pin. Black must trade (Bxf3 Nxf3) and now White has the bishop pair, doubled c-pawns for Black, and a clear positional edge. A 2990-rated GM lost this game.",
      sayShort: 'h3 — pin broken, edge won.' }),
  ],
};

// TRAP 5: 22g — Steinitz d6 + Bxc6+ + d4 hurts Black's structure
const D6_STEINITZ_BXC6: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez', title: 'Weapon: d6 in Steinitz lets Bxc6+ + d4 dominate', minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'ruy-d6-setup', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4', highlights: [H('a4', SOFT)],
      say: "Same Ba4 setup as Trap 1, but Black plays the Steinitz Defense Deferred with ...d6 instead of the classical ...Nf6. The d6 move is solid but the Bxc6 trade timing punishes the early commitment.",
      sayShort: 'Ba4 — Steinitz coming.' }),
    b({ id: 'ruy-d6-blunder', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6', highlights: [H('d6', ATK)],
      say: "...d6 — Steinitz Deferred. 22 opponents played this including LudwigVanBendOver (2997). The structural conversion runs from here.",
      sayShort: '...d6 — Steinitz Deferred.' }),
    b({ id: 'ruy-d6-trade', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 Bxc6+ bxc6', highlights: [H('c6', KEY)],
      say: "Bxc6+ ...bxc6 — White trades the bishop with check. Black is FORCED to recapture with the b-pawn (cxc6 is impossible). Now Black has doubled c-pawns AND a half-open b-file pointing toward his queenside.",
      sayShort: 'Bxc6+ ...bxc6 — doubled b-pawns.' }),
    b({ id: 'ruy-d6-cash', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 Bxc6+ bxc6 d4 f6 O-O', highlights: [H('g1', SOFT), H('c6', KEY)],
      say: "d4 ...f6 O-O — White expands the centre, Black plays the awkward ...f6 to support e5, we castle. The structural edge converts: Black's pawns are awful, White's pieces have clean squares.",
      sayShort: 'O-O — structural conversion.' }),
  ],
};

interface TrapEntry { name: string; lesson: LessonScript; }
const TRAPS: TrapEntry[] = [
  { name: 'Nf6 in Ba4 line walks into Bxc6 doubled-pawns (Wesley So victim)', lesson: NF6_BXC6_DOUBLED },
  { name: 'Nd6 in Berlin Defense (top-GM victim)', lesson: ND6_BERLIN_HIKARU },
  { name: 'Nc5 in Open Ruy lets us win the e5-pawn (Firouzja victim)', lesson: NC5_OPEN_RUY_PAWN },
  { name: 'Bc5 in d3 Berlin (beat a 2990)', lesson: BC5_D3_HIKARU },
  { name: 'd6 in Steinitz lets Bxc6+ + d4 dominate', lesson: D6_STEINITZ_BXC6 },
];

export function getProNaroditskyRuyTrapLesson(name: string): LessonScript | null {
  return TRAPS.find((t) => t.name === name)?.lesson ?? null;
}
export function getProNaroditskyRuyTrapPlayableLine(name: string): PlayableMiddlegameLine | null {
  const lesson = getProNaroditskyRuyTrapLesson(name);
  return lesson ? lessonToPlayableLine(lesson) : null;
}
