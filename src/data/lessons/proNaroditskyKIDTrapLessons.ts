import type {
  LessonScript,
  LessonBeat,
  AnnotationHighlight,
  PlayableMiddlegameLine,
} from '../../types';
import { lessonToPlayableLine } from './index';

// Pro Naroditsky KID trap lessons — curated weapon lessons for the
// trapLines surfaced in pro-repertoires.json. Mined from his real
// chess.com archive (2,185 White-blunder positions across 2,650 KID
// wins as Black; full mined list at
// data/sources/danielnaroditsky-kid-trap-candidates.json). The 4
// patterns below all carry named 2700+ victims and are the cleanest
// teachable weapons in the mined set. Routes through PlayableLinePlayer
// (modern bigger board + hand-written per-beat narration) via
// getProNaroditskyKIDTrapPlayableLine.

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
  'https://www.chess.com/openings/Kings-Indian-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// =============================================================
// TRAP 1: Mar del Plata Nh5-Nf4-Nxd4 conversion (30 games)
// The canonical Classical KID weapon. After the Mar del Plata setup,
// White plays f3 hoping to defend the centre, but Black's standard
// kingside reroute (Nh5 → Nf4) wins material on d4 via Nxd4.
// =============================================================
const MAR_DEL_PLATA_CRUSH: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: 'Weapon: Mar del Plata Nh5-Nf4-Nxd4 conversion',
  minutes: 4,
  orientation: 'black',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'mdp-setup',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8',
      highlights: [H('e8'), H('d4', SOFT), H('e4', SOFT)],
      say: "We've reached the Mar del Plata mainline after our ...e5 / ...exd4 / ...Re8 sequence. The rook hits e4 and White must defend the pawn. The natural-looking choice is f3 — and that's where the trap closes. 30 of his opponents have walked into the same conversion from this exact position.",
      sayShort: 'Mar del Plata — Re8 hits e4.',
    }),
    b({
      id: 'mdp-f3',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6',
      highlights: [H('f3'), H('c6', SOFT), H('d4', SOFT)],
      say: "f3 ...Nc6 — White defends e4 with the f-pawn and we develop the knight hitting d4. So far normal looking, but the f3 has just locked the kingside dark squares and committed the bishop on c1 to the wrong side of the pawn. The structural weakness is set.",
      sayShort: 'f3 ...Nc6 — set the trap.',
    }),
    b({
      id: 'mdp-nh5',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5',
      highlights: [H('h5'), H('f4', SOFT)],
      say: "Be3 ...Nh5! The signature Mar del Plata reroute. The knight is heading for f4 — the prize square where it attacks the Be2 and pressures the kingside. White's f3 stopped Ng4 but not Nh5; the trap was already inevitable from the moment White committed to the Classical setup.",
      sayShort: '...Nh5 — heading for f4.',
    }),
    b({
      id: 'mdp-cash',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nxd4',
      highlights: [H('d4', ATK)],
      say: "Qd2 ...Nxd4! Black's knight grabs the central piece BEFORE landing on f4. The Be3 was meant to support d4, but now the knight on h5 is loose and we've already won the central piece battle. Material gain + active position = winning Mar del Plata middlegame.",
      sayShort: '...Nxd4 — win the central knight.',
    }),
  ],
};

// =============================================================
// TRAP 2: Bf5 + Ne4 wins the bishop pair (Fianchetto, vs GM Bok)
// In the Fianchetto Variation after ...c6, if White plays Nc3 without
// preparation, Black gets the powerful Bf5 + Ne4 + Nxc3 sequence
// forcing White's dark-square bishop to recapture on c3 (Bxc3) and
// surrendering the bishop pair. Happened vs GMBenjaminBok 2963.
// =============================================================
const BF5_NE4_BISHOP_PAIR: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: 'Weapon: Bf5 + Ne4 wins the bishop pair (Fianchetto)',
  minutes: 3,
  orientation: 'black',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'bf5-setup',
      moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O c6',
      highlights: [H('c6')],
      say: "In the Fianchetto with ...c6 supporting d5, Black's setup looks solid but passive. White's natural development is Nc3 — completing the queen knight's normal post. But that move commits the c3 knight to defending against tactics, and Black has a sharp answer waiting.",
      sayShort: 'Fianchetto + ...c6 setup.',
    }),
    b({
      id: 'bf5-nc3',
      moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O c6 Nc3 Bf5',
      highlights: [H('c3'), H('f5')],
      say: "Nc3 ...Bf5! — Black develops the light-square bishop aggressively. The bishop on f5 supports the coming ...Ne4 outpost. White doesn't yet see the threat because the position looks calm — that's how the trap works. 10 opponents including GM Benjamin Bok at 2963 walked into this exact sequence.",
      sayShort: '...Bf5 — supports Ne4.',
    }),
    b({
      id: 'bf5-ne4',
      moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O c6 Nc3 Bf5 b3 Ne4',
      highlights: [H('e4'), H('c3', ATK)],
      say: "b3 ...Ne4! — White develops the b-pawn and we plant the knight on e4. The Ne4 attacks the Nc3 and the bishop pair becomes vulnerable. If White retreats, Black continues with Nxc3 destroying the structure; if White trades, the dark-square bishop has to recapture on c3.",
      sayShort: '...Ne4 — attack the Nc3.',
    }),
    b({
      id: 'bf5-cash',
      moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O c6 Nc3 Bf5 b3 Ne4 Bb2 Nxc3 Bxc3',
      highlights: [H('c3'), H('b2', SOFT)],
      say: "Bb2 ...Nxc3 Bxc3 — we trade the knight, forcing the bishop onto c3. White has surrendered the bishop pair AND the b2-bishop is now blocked by its own queenside pawns. Black has won the structural fight from move 6 of the Fianchetto.",
      sayShort: 'Nxc3 Bxc3 — bishop pair won.',
    }),
  ],
};

// =============================================================
// TRAP 3: Qxd8 trade hands Black the better endgame (vs Firouzja)
// After ...e5 dxe5 dxe5, if White trades queens with Qxd8 trying to
// simplify, the resulting endgame favours Black: more active pieces,
// knight outpost on c5/d4, weak White pawns. Happened vs Firouzja
// at 3087 and Nihal Sarin at 2949. 11 named-victim games total.
// =============================================================
const QXD8_BETTER_ENDGAME: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: 'Weapon: Qxd8 trade hands Black the better endgame',
  minutes: 3,
  orientation: 'black',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'qxd8-setup',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 dxe5 dxe5',
      highlights: [H('e5'), H('d8', SOFT)],
      say: "Classical mainline — Black has played ...e5 and White trades dxe5 dxe5. Black's pawn on e5 controls the centre, and the queens are now ready to come off. If White takes the queen trade with Qxd8, Black gets a very specific structural endgame.",
      sayShort: 'Queens lining up to trade.',
    }),
    b({
      id: 'qxd8-trade',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 dxe5 dxe5 Qxd8 Rxd8',
      highlights: [H('d8'), H('e5', SOFT)],
      say: "Qxd8 Rxd8 — queens are off. The endgame looks symmetric on paper, but it isn't. Black's rook is on the d-file with tempo, the e5-pawn is supported by the Bg7's long diagonal, and White's pieces still need to coordinate. Firouzja at 3087 played this and lost the endgame.",
      sayShort: 'Qxd8 Rxd8 — Black\'s endgame edge.',
    }),
    b({
      id: 'qxd8-pressure',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 dxe5 dxe5 Qxd8 Rxd8 Bg5 Re8',
      highlights: [H('g5'), H('e8', SOFT)],
      say: "Bg5 ...Re8 — White's bishop pins our f6-knight, but we calmly redirect the rook to e8 protecting the e5-pawn and pointing at the e-file. The pin doesn't help White because we control the d-file AND the e-file.",
      sayShort: '...Re8 — control both central files.',
    }),
    b({
      id: 'qxd8-cash',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 dxe5 dxe5 Qxd8 Rxd8 Bg5 Re8 Nd5 Nxd5 cxd5',
      highlights: [H('d5'), H('e5', SOFT)],
      say: "Nd5 ...Nxd5 cxd5 — knights trade and now White has DOUBLED c-pawns AND the d5-pawn is isolated. Black's structural edge is permanent. From here our knight reroutes to c5/d6, the c-file becomes a target, and the endgame converts on the queenside. Nihal Sarin at 2949 also lost this exact endgame.",
      sayShort: 'cxd5 — doubled c-pawns won.',
    }),
  ],
};

// =============================================================
// TRAP 4: Bg4 pin wins the bishop pair (Four Pawns)
// In the Four Pawns Attack after Black castles, if White develops
// Nf3 + Be2 without prophylaxis, Black plays Bg4 + Bxf3 forcing
// Bxf3 with a structural weakness AND surrendering the bishop pair.
// =============================================================
const BG4_PIN_FOUR_PAWNS: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: 'Weapon: ...Bg4 pin wins bishop pair (Four Pawns)',
  minutes: 3,
  orientation: 'black',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'bg4-setup',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4',
      highlights: [H('f4'), H('g4', SOFT)],
      say: "Four Pawns Attack — White's most aggressive setup. The c4-d4-e4-f4 chain looks intimidating, but every pawn forward is one fewer piece on defence. White's natural follow-up is Nf3 + Be2, and the next move shows why that order has a tactical hole.",
      sayShort: 'Four Pawns — Bg4 is loaded.',
    }),
    b({
      id: 'bg4-castle',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 Bg4',
      highlights: [H('g4'), H('f3', ATK)],
      say: "O-O Nf3 ...Bg4! Black castles and immediately develops the light-square bishop with a pin on the f3-knight. The Nf3 is pinned against the queen on d1 — it can't move without losing the queen. This is the inflection point.",
      sayShort: '...Bg4 — pin Nf3.',
    }),
    b({
      id: 'bg4-be2',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 Bg4 Be2 Bxf3',
      highlights: [H('f3', ATK), H('e2', SOFT)],
      say: "Be2 ...Bxf3! — White develops the bishop trying to break the pin, but we don't wait. ...Bxf3 trades the bishop AND forces White's bishop to recapture on f3, doubling White's f-pawns. The doubled pawns are a permanent weakness AND we keep the bishop pair.",
      sayShort: 'Bxf3 — force the trade.',
    }),
    b({
      id: 'bg4-cash',
      moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 Bg4 Be2 Bxf3 Bxf3',
      highlights: [H('f3'), H('e4', SOFT)],
      say: "Bxf3 — White recaptures with the bishop. Look at the structure: doubled f-pawns, bishop pair gone, the Four Pawns pawn chain becomes brittle. Black's Bg7 + bishop pair vs White's awkward pieces = Black is winning the structural fight from move 7.",
      sayShort: 'Bxf3 — structural win.',
    }),
  ],
};

// =============================================================
// Registry + routing helpers
// =============================================================

interface TrapEntry {
  // Must match the trapLine `name` field in pro-repertoires.json
  name: string;
  lesson: LessonScript;
  kind: 'trap' | 'warning';
}

const TRAPS: TrapEntry[] = [
  { name: 'Mar del Plata Nh5-Nf4-Nxd4 conversion (30 games)', lesson: MAR_DEL_PLATA_CRUSH, kind: 'trap' },
  { name: 'Bf5 + Ne4 wins bishop pair (Fianchetto, GM Bok victim)', lesson: BF5_NE4_BISHOP_PAIR, kind: 'trap' },
  { name: 'Qxd8 trade hands Black the better endgame (Firouzja victim)', lesson: QXD8_BETTER_ENDGAME, kind: 'trap' },
  { name: '...Bg4 pin wins bishop pair (Four Pawns)', lesson: BG4_PIN_FOUR_PAWNS, kind: 'trap' },
];

export function getProNaroditskyKIDTrapLesson(name: string): LessonScript | null {
  const entry = TRAPS.find((t) => t.name === name);
  return entry?.lesson ?? null;
}

export function getProNaroditskyKIDTrapPlayableLine(name: string): PlayableMiddlegameLine | null {
  const lesson = getProNaroditskyKIDTrapLesson(name);
  if (!lesson) return null;
  return lessonToPlayableLine(lesson);
}

export const PRO_NARODITSKY_KID_TRAPS_FOR_REPERTOIRE = TRAPS.map((t) => ({
  name: t.name,
  kind: t.kind,
  pgn: t.lesson.beats[t.lesson.beats.length - 1].moves.join(' '),
}));
