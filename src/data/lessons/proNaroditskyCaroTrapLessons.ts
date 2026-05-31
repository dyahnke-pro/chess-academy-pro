import type {
  LessonScript,
  LessonBeat,
  AnnotationHighlight,
  PlayableMiddlegameLine,
} from '../../types';
import { lessonToPlayableLine } from './index';

// Pro Naroditsky Caro-Kann trap lessons — curated weapon lessons for
// the top mined patterns from his real chess.com archive (1,454 unique
// trap patterns across 2,080 Caro wins as Black). Routes through
// PlayableLinePlayer (modern bigger board + hand-written per-beat
// narration) via getProNaroditskyCaroTrapPlayableLine. All 5 patterns
// below carry named 2700+ victims and are the cleanest teachable
// weapons in the mined set.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';

const H = (square: string, color: string = KEY): AnnotationHighlight => ({ square, color });

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
  'book:caro-kann',
  'https://www.chess.com/openings/Caro-Kann-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// =============================================================
// TRAP 1: Qe2 wastes a tempo in the Two Knights KIA setup
// 170 GAMES (the biggest mined trap) — Penguingm1 3165 victim.
// After 1.e4 c6 2.Nf3 d5 3.Nc3 dxe4 4.Nxe4 Nf6 5.Qe2?? Black's
// ...Nxe4 wins because Qxe4 leaves the queen exposed in the centre
// + the Qe2 blocks the f1-bishop's natural development.
// =============================================================
const QE2_KIA_TEMPO: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Weapon: Qe2 wastes a tempo (Two Knights KIA setup)',
  minutes: 3,
  orientation: 'black',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'qe2-setup',
      moves: 'e4 c6 Nf3 d5 Nc3 dxe4 Nxe4 Nf6',
      highlights: [H('f6'), H('e4', SOFT)],
      say: "After the standard Two Knights KIA setup, Black has played ...Nf6 attacking the e4-knight AND preparing classical development. White's correct response is the calm Nxf6+ (trade) or Ng3 (retreat). The wrong response — played 170 times against him! — is Qe2.",
      sayShort: '...Nf6 — attack the knight.',
    }),
    b({
      id: 'qe2-blunder',
      moves: 'e4 c6 Nf3 d5 Nc3 dxe4 Nxe4 Nf6 Qe2',
      highlights: [H('e2', ATK), H('f1', SOFT)],
      say: "Qe2?? — White's queen defends the knight AND blocks his own f1-bishop's natural diagonal to c4 / e2 / b5. The Qe2 looks reasonable (covering e4) but commits the queen to an awkward square that costs serious tempo. Penguingm1 at 3165 fell into this exact position.",
      sayShort: 'Qe2 — wastes the tempo.',
    }),
    b({
      id: 'qe2-trade',
      moves: 'e4 c6 Nf3 d5 Nc3 dxe4 Nxe4 Nf6 Qe2 Nxe4',
      highlights: [H('e4', ATK)],
      say: "...Nxe4! Black takes the knight directly. White MUST recapture with the queen (Qxe4) — the trade simplifies the centre AND exposes the white queen in the middle of the board.",
      sayShort: '...Nxe4 — take the knight.',
    }),
    b({
      id: 'qe2-cash',
      moves: 'e4 c6 Nf3 d5 Nc3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 e6',
      highlights: [H('e6', KEY), H('e4', SOFT)],
      say: "Qxe4 ...e6 — Black calmly develops, AND the white queen is loose on e4 with no good retreat squares. Black continues with ...Be7 + ...O-O + ...Nd7 with a clear development advantage. The Qe2 tempo loss compounds across the whole opening — that's why 170 opponents lost from here.",
      sayShort: '...e6 — queen exposed, develop.',
    }),
  ],
};

// =============================================================
// TRAP 2: h3 lets ...Bxf3 spoil White's structure (KIA Bg4 line)
// 29 games — GM_dmitrij 2940 + Mykola-Bortnyk 2953 victims.
// After 1.e4 c6 2.Nf3 d5 3.Nc3 Bg4 4.h3?? Bxf3 5.Qxf3 — white
// gets doubled f-pawns AND surrenders the bishop pair AND the
// f3 square never recovers.
// =============================================================
const H3_BG4_STRUCTURE: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Weapon: h3 hands Black the bishop pair (KIA Bg4 line)',
  minutes: 3,
  orientation: 'black',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'h3-setup',
      moves: 'e4 c6 Nf3 d5 Nc3 Bg4',
      highlights: [H('g4'), H('f3', SOFT)],
      say: "After Nc3 Black plays ...Bg4 pinning the f3-knight against the queen. This is the Caro's structural advantage: the light-square bishop comes OUTSIDE the pawn chain. The pin is the trap-setter.",
      sayShort: '...Bg4 — pin Nf3.',
    }),
    b({
      id: 'h3-blunder',
      moves: 'e4 c6 Nf3 d5 Nc3 Bg4 h3',
      highlights: [H('h3', ATK), H('g4', SOFT)],
      say: "h3?? — White asks the bishop the question but cannot follow up with g4 (would weaken the king position drastically). The h3 forces the trade that Black wanted anyway. 29 opponents played this including GM_dmitrij at 2940 and Mykola-Bortnyk at 2953.",
      sayShort: 'h3 — forces the trade.',
    }),
    b({
      id: 'h3-trade',
      moves: 'e4 c6 Nf3 d5 Nc3 Bg4 h3 Bxf3',
      highlights: [H('f3', ATK)],
      say: "...Bxf3! Black takes the knight. White's recapture options are limited: Qxf3 (the only good choice — gxf3 wrecks the kingside; Nxf3 doesn't exist).",
      sayShort: '...Bxf3 — bishop trades.',
    }),
    b({
      id: 'h3-cash',
      moves: 'e4 c6 Nf3 d5 Nc3 Bg4 h3 Bxf3 Qxf3 e6',
      highlights: [H('e6', KEY), H('f3', SOFT)],
      say: "Qxf3 ...e6 — Black emerges with the bishop pair AND a structurally healthier kingside (no doubled pawns). White's Qf3 looks active but it's exposed; Black calmly develops ...Nd7 + ...Be7 + ...O-O with a clear long-term advantage.",
      sayShort: '...e6 — bishop pair won.',
    }),
  ],
};

// =============================================================
// TRAP 3: dxe4 → Qxd1+ in the d3 sideline
// 26 games — BrandonJacobson 3136 + TLTLTLTLTLTL 3207 victims.
// After 1.e4 c6 2.Nf3 d5 3.d3 dxe4 4.dxe4?? Qxd1+ 5.Kxd1 — Black's
// queen trade forces the king to d1 where it's permanently exposed
// AND Black has the open d-file + better piece coordination.
// =============================================================
const DXE4_QXD1_KING: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Weapon: dxe4 → Qxd1+ exposes White\'s king (d3 line)',
  minutes: 3,
  orientation: 'black',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'dxe4-setup',
      moves: 'e4 c6 Nf3 d5 d3',
      highlights: [H('d3', SOFT)],
      say: "After d3 (White's quiet sideline), Black plays the standard ...dxe4 challenging the centre. White's correct response is Nxe4 (recapture with the knight). The wrong response — and surprisingly common at amateur level — is dxe4.",
      sayShort: 'd3 — quiet sideline.',
    }),
    b({
      id: 'dxe4-take',
      moves: 'e4 c6 Nf3 d5 d3 dxe4',
      highlights: [H('e4', ATK)],
      say: "...dxe4 — Black opens the d-file. Now White must recapture: dxe4 (the natural-looking but disastrous move) or Nxe4 (the correct move keeping the queen safe).",
      sayShort: '...dxe4 — open d-file.',
    }),
    b({
      id: 'dxe4-blunder',
      moves: 'e4 c6 Nf3 d5 d3 dxe4 dxe4',
      highlights: [H('e4', ATK), H('d1', SOFT)],
      say: "dxe4?? — White takes with the d-pawn, leaving the queen on d1 face-to-face with Black's queen on d8. BrandonJacobson at 3136 and TLTLTLTLTLTL at 3207 both fell into this exact position. The d-file is now wide open and Black's queen trades immediately.",
      sayShort: 'dxe4 — queen-trade trap.',
    }),
    b({
      id: 'dxe4-cash',
      moves: 'e4 c6 Nf3 d5 d3 dxe4 dxe4 Qxd1+ Kxd1',
      highlights: [H('d1', ATK)],
      say: "...Qxd1+ Kxd1! Black forces the queen trade with check, AND the white king has to take with the king (no other piece can recapture). The white king on d1 is permanently exposed — can't castle, blocks the rook, falls victim to future …Nf6+ ideas. The endgame conversion is forced.",
      sayShort: '...Qxd1+ Kxd1 — king on d1.',
    }),
  ],
};

// =============================================================
// TRAP 4: Bd3 trade in the Exchange Caro
// 20 games — Oleksandr_Bortnyk 3278 + Mykola-Bortnyk 3135 victims.
// After Exchange Caro Nf3 + h3 + Bd3, Black plays ...Bf5 then
// after Bd3 takes ...Bxd3, Black recaptures Qxd3 with a clean
// game where the c-file is open and the bishop pair compensates
// the doubled pawns.
// =============================================================
const EXCHANGE_BD3_TRADE: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Weapon: Bd3 voluntary trade in the Exchange Caro',
  minutes: 3,
  orientation: 'black',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'exch-setup',
      moves: 'e4 c6 d4 d5 exd5 cxd5',
      highlights: [H('d5', KEY)],
      say: "Exchange Variation reached: ...cxd5. White has the choice of c4 (Panov, aggressive) or Nf3 (positional). The Nf3 line is supposed to be quieter but tempo-loss traps lurk in the slower White setups.",
      sayShort: 'Exchange Caro — Nf3 awaited.',
    }),
    b({
      id: 'exch-development',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Nf3 Nf6 h3 Bf5 Bd3',
      highlights: [H('d3', ATK), H('f5', KEY)],
      say: "Nf3 ...Nf6 h3 ...Bf5 Bd3 — White develops the bishop to d3 hoping to trade off Black's active light-square bishop. This is the Bortnyk-Naroditsky main line — 20 games where Oleksandr_Bortnyk (3278) and Mykola-Bortnyk (3135) fell into trading the wrong way.",
      sayShort: 'Bd3 — voluntary trade.',
    }),
    b({
      id: 'exch-trade',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Nf3 Nf6 h3 Bf5 Bd3 Bxd3',
      highlights: [H('d3', ATK)],
      say: "...Bxd3! Black takes immediately. White's only good recapture is Qxd3 (cxd3 wrecks the structure). The trade has just happened on White's TERMS but the consequences favour Black.",
      sayShort: '...Bxd3 — accept the trade.',
    }),
    b({
      id: 'exch-cash',
      moves: 'e4 c6 d4 d5 exd5 cxd5 Nf3 Nf6 h3 Bf5 Bd3 Bxd3 Qxd3',
      highlights: [H('d3', KEY)],
      say: "Qxd3 — White's queen sits in the centre but is exposed AND Black has a comfortable game with no problem pieces. Black continues with ...e6 + ...Nc6 + ...Be7 + ...O-O — classical development without any structural weakness. The Exchange Caro's drawishness favours Black who has zero risk.",
      sayShort: 'Qxd3 — Black equalises cleanly.',
    }),
  ],
};

// =============================================================
// TRAP 5: Nxf6+ premature trade (Classical Caro Nc3)
// 6 games — Arambai 3161 + Oleksandr_Bortnyk 3148 victims.
// After Classical Nc3 setup, White's premature Nxf6+ wastes a
// tempo because Black recaptures with the e-pawn opening the
// e-file AND keeping the bishop pair via ...Bg4.
// =============================================================
const NXF6_CLASSICAL_TEMPO: LessonScript = {
  openingId: 'pro-naroditsky-caro-kann',
  title: 'Weapon: Nxf6+ premature trade (Classical Caro)',
  minutes: 3,
  orientation: 'black',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'nxf6-setup',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6',
      highlights: [H('f6'), H('e4', SOFT)],
      say: "Classical Caro Nc3 setup: Black plays ...Nf6 attacking the centralised white knight. The correct White move is Nxf6+ ONLY when it gains tempo or develops behind it; here it doesn't.",
      sayShort: '...Nf6 — attack the knight.',
    }),
    b({
      id: 'nxf6-blunder',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+',
      highlights: [H('f6', ATK)],
      say: "Nxf6+?? — White takes the knight with check, but the check doesn't develop a piece AND gives Black a strong recapture choice. Arambai at 3161 + Oleksandr_Bortnyk at 3148 fell into this exact line.",
      sayShort: 'Nxf6+ — premature trade.',
    }),
    b({
      id: 'nxf6-recapture',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6',
      highlights: [H('f6', KEY), H('e8', SOFT)],
      say: "...exf6! Black recaptures with the e-pawn. The e-file is now open for the king's rook, AND the f-pawn covers the e5/g5 squares perfectly. The doubled f-pawns look ugly but they actually create the most stable Caro pawn structure.",
      sayShort: '...exf6 — open e-file.',
    }),
    b({
      id: 'nxf6-cash',
      moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bg4',
      highlights: [H('g4', KEY), H('f3', ATK)],
      say: "c3 ...Bg4! Black develops the light-square bishop with a pin on whatever White develops next (Nf3 in the typical continuation). Black has the bishop pair, the open e-file, AND a structurally sound position. The premature Nxf6+ just handed Black a 1-move tempo gain for the rest of the game.",
      sayShort: '...Bg4 — bishop pair + pin.',
    }),
  ],
};

// =============================================================
// Registry + routing helpers
// =============================================================

interface TrapEntry {
  name: string;
  lesson: LessonScript;
}

const TRAPS: TrapEntry[] = [
  { name: 'Qe2 wastes a tempo (Two Knights KIA setup)', lesson: QE2_KIA_TEMPO },
  { name: 'h3 hands Black the bishop pair (KIA Bg4 line)', lesson: H3_BG4_STRUCTURE },
  { name: 'dxe4 → Qxd1+ exposes White\'s king (d3 line)', lesson: DXE4_QXD1_KING },
  { name: 'Bd3 voluntary trade in the Exchange Caro', lesson: EXCHANGE_BD3_TRADE },
  { name: 'Nxf6+ premature trade (Classical Caro)', lesson: NXF6_CLASSICAL_TEMPO },
];

export function getProNaroditskyCaroTrapLesson(name: string): LessonScript | null {
  const entry = TRAPS.find((t) => t.name === name);
  return entry?.lesson ?? null;
}

export function getProNaroditskyCaroTrapPlayableLine(name: string): PlayableMiddlegameLine | null {
  const lesson = getProNaroditskyCaroTrapLesson(name);
  if (!lesson) return null;
  return lessonToPlayableLine(lesson);
}
