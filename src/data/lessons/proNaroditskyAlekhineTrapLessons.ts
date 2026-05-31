import type {
  LessonScript,
  LessonBeat,
  AnnotationHighlight,
  PlayableMiddlegameLine,
} from '../../types';
import { lessonToPlayableLine } from './index';

// Pro Naroditsky Alekhine trap lessons — mined from 1,834 wins as
// Black, 1,621 White-blunder positions, 1,374 unique patterns.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color: string = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit { id: string; moves: string; say: string; sayShort: string; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'https://www.chess.com/openings/Alekhines-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// TRAP 1: 20g — Nc3 in deep Four Pawns + Bb4 wins bishop pair
const NC3_FOUR_PAWNS_BB4: LessonScript = {
  openingId: 'pro-naroditsky-alekhine', title: 'Weapon: Nc3 in Four Pawns lets ...Bb4 win the bishop pair', minutes: 3, orientation: 'black', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'alek-fp-setup', moves: 'e4 Nf6 e5 Nd5 d4 Nb6 c4 d6 f4 dxe5 fxe5 Bf5 Be3 e6', highlights: [H('e6', SOFT)],
      say: "Deep in the Four Pawns Alekhine: White has built the massive centre, Black has developed Bf5 + ...e6. The correct White move is Nf3 (development). The wrong move is Nc3.",
      sayShort: 'Be3 ...e6 — develop.' }),
    b({ id: 'alek-fp-blunder', moves: 'e4 Nf6 e5 Nd5 d4 Nb6 c4 d6 f4 dxe5 fxe5 Bf5 Be3 e6 Nc3', highlights: [H('c3', ATK)],
      say: "Nc3?? — White develops the queen knight but commits the c3-square. 20 opponents played this including spicycaterpillar (3157) and vi_pranav (3087). The ...Bb4 pin response is devastating.",
      sayShort: 'Nc3 — exposes c3.' }),
    b({ id: 'alek-fp-bb4', moves: 'e4 Nf6 e5 Nd5 d4 Nb6 c4 d6 f4 dxe5 fxe5 Bf5 Be3 e6 Nc3 Bb4', highlights: [H('b4', ATK)],
      say: "...Bb4! Black's bishop pins the Nc3 against the king AND threatens ...Bxc3+ trading favorably (doubled c-pawns for White).",
      sayShort: '...Bb4 — pin Nc3.' }),
    b({ id: 'alek-fp-cash', moves: 'e4 Nf6 e5 Nd5 d4 Nb6 c4 d6 f4 dxe5 fxe5 Bf5 Be3 e6 Nc3 Bb4 Nf3 O-O Bd3 Bxd3', highlights: [H('d3', KEY)],
      say: "Nf3 ...O-O Bd3 ...Bxd3 — Black castles, then trades the Bd3 (forcing White to recapture with the queen — Qxd3, awkward). The bishop pair stays with Black AND White's structure is compromised.",
      sayShort: '...Bxd3 — bishop pair wins.' }),
  ],
};

// TRAP 2: 18g — Be3 + Bb4 same idea, slightly different move order (Jospem victim)
const BE3_BB4_VARIANT: LessonScript = {
  openingId: 'pro-naroditsky-alekhine', title: 'Weapon: Be3 + ...Bb4 wins structure (move-order variant)', minutes: 3, orientation: 'black', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'alek-be3-setup', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Bf5 Nc3 e6', highlights: [H('e6', SOFT)],
      say: "Same Four Pawns structure, slightly different move order. White has already played Nc3 before Be3 — now Be3 is the trap-setter.",
      sayShort: 'Nc3 ...e6.' }),
    b({ id: 'alek-be3-blunder', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Bf5 Nc3 e6 Be3', highlights: [H('e3', ATK)],
      say: "Be3?? — same idea, different timing. 18 opponents including Jospem (3093 twice) and spicycaterpillar (3066) walked in.",
      sayShort: 'Be3 — same trap.' }),
    b({ id: 'alek-be3-bb4', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Bf5 Nc3 e6 Be3 Bb4', highlights: [H('b4', ATK)],
      say: "...Bb4! Same pin idea. White is structurally committed to losing the bishop pair.",
      sayShort: '...Bb4 — pin again.' }),
    b({ id: 'alek-be3-cash', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Bf5 Nc3 e6 Be3 Bb4 Nf3 c5 a3 Bxc3+', highlights: [H('c3', KEY)],
      say: "Nf3 ...c5 a3 ...Bxc3+! Black trades the bishop for the knight, doubling White's c-pawns. The ...c5 push also undermines White's centre. The structural conversion is decisive.",
      sayShort: '...Bxc3+ — wreck the structure.' }),
  ],
};

// TRAP 3: 17g — fxe5 in Anti-Vienna + Nxe4 (Hikaru victim!)
const FXE5_NXE4_HIKARU: LessonScript = {
  openingId: 'pro-naroditsky-alekhine', title: 'Weapon: fxe5 in Anti-Vienna f4 line (Hikaru victim)', minutes: 3, orientation: 'black', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'alek-hik-setup', moves: 'e4 Nf6 Nc3 e5 f4 d5', highlights: [H('d5', KEY)],
      say: "Anti-Vienna with Nc3 e5 f4 — White plays the King's Gambit Declined-style attack. Black answers ...d5 challenging the centre. The wrong White move is the natural-looking fxe5.",
      sayShort: 'f4 ...d5.' }),
    b({ id: 'alek-hik-blunder', moves: 'e4 Nf6 Nc3 e5 f4 d5 fxe5', highlights: [H('e5', ATK)],
      say: "fxe5?? — White takes the pawn but loses material to ...Nxe4. 17 opponents fell into this including Hikaru Nakamura (3316!) and Konavets (3067).",
      sayShort: 'fxe5 — Hikaru\'s mistake.' }),
    b({ id: 'alek-hik-nxe4', moves: 'e4 Nf6 Nc3 e5 f4 d5 fxe5 Nxe4', highlights: [H('e4', ATK)],
      say: "...Nxe4! Black's knight grabs the e4-pawn and attacks the Nc3 too. White's tactics fall apart from here.",
      sayShort: '...Nxe4 — grab + fork.' }),
    b({ id: 'alek-hik-cash', moves: 'e4 Nf6 Nc3 e5 f4 d5 fxe5 Nxe4 Qf3 Nc6 Bb5 Nxc3', highlights: [H('c3', KEY)],
      say: "Qf3 ...Nc6 Bb5 ...Nxc3! Black trades the knight on c3, wrecking White's pawn structure. Material is equal but Black has the better structure AND the bishop pair coming.",
      sayShort: '...Nxc3 — wreck the structure.' }),
  ],
};

// TRAP 4: 15g — Bb5 in Anti-Vienna lets ...Nd4 fork
const BB5_ND4_FORK: LessonScript = {
  openingId: 'pro-naroditsky-alekhine', title: 'Weapon: Bb5 in Anti-Vienna lets ...Nd4 fork', minutes: 3, orientation: 'black', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'alek-bb5-setup', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6', highlights: [H('c6', SOFT)],
      say: "Two Knights Alekhine reached via Nc3 e5. Black develops normally. The correct White move is d4 (challenging the centre) or Bc4 (Sicilian-like). The wrong move is Bb5.",
      sayShort: '...Nc6 — develop.' }),
    b({ id: 'alek-bb5-blunder', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6 Bb5', highlights: [H('b5', ATK)],
      say: "Bb5?? — Ruy Lopez-style pin attempt, but here it's premature. 15 opponents played this. The Nd4 fork is the punishment.",
      sayShort: 'Bb5 — premature pin.' }),
    b({ id: 'alek-bb5-nd4', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6 Bb5 Nd4', highlights: [H('d4', ATK), H('b5', SOFT)],
      say: "...Nd4! The knight forks Bb5 AND the f3-knight. White's bishop has to move or trade.",
      sayShort: '...Nd4 — fork!' }),
    b({ id: 'alek-bb5-cash', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6 Bb5 Nd4 O-O Nxb5 Nxb5 d6', highlights: [H('d6', KEY)],
      say: "O-O ...Nxb5 Nxb5 ...d6 — White castles, Black trades the knight for the bishop AND develops. Black has the bishop pair, the better structure, and a clear advantage.",
      sayShort: '...d6 — bishop pair won.' }),
  ],
};

// TRAP 5: 12g — Bc4 in Modern Alekhine (RaunakSadhwani victim)
const BC4_MODERN_TRADE: LessonScript = {
  openingId: 'pro-naroditsky-alekhine', title: 'Weapon: Bc4 + Nd7 in Modern Alekhine', minutes: 3, orientation: 'black', kind: 'trap', sources: SRC,
  beats: [
    b({ id: 'alek-bc4-setup', moves: 'e4 Nf6 e5 Nd5 Nf3 d6 d4 dxe5 Nxe5 c6', highlights: [H('c6', SOFT)],
      say: "Modern Alekhine reached via Nxe5 c6 — Black supports the d5-knight. The correct White move is Be2 or g3 (quiet development). The wrong move is the aggressive-looking Bc4.",
      sayShort: '...c6 — support d5.' }),
    b({ id: 'alek-bc4-blunder', moves: 'e4 Nf6 e5 Nd5 Nf3 d6 d4 dxe5 Nxe5 c6 Bc4', highlights: [H('c4', ATK), H('d5', SOFT)],
      say: "Bc4?? — White's bishop attacks the d5-knight, but the knight has a safe square AND Black gets to swap centralized pieces. 12 opponents including RaunakSadhwani2005 (3080).",
      sayShort: 'Bc4 — aggressive but wrong.' }),
    b({ id: 'alek-bc4-nd7', moves: 'e4 Nf6 e5 Nd5 Nf3 d6 d4 dxe5 Nxe5 c6 Bc4 Nd7', highlights: [H('d7', KEY)],
      say: "...Nd7! Black challenges the central Ne5 AND prepares to trade it off.",
      sayShort: '...Nd7 — challenge Ne5.' }),
    b({ id: 'alek-bc4-cash', moves: 'e4 Nf6 e5 Nd5 Nf3 d6 d4 dxe5 Nxe5 c6 Bc4 Nd7 O-O Nxe5 dxe5 Be6', highlights: [H('e6', KEY)],
      say: "O-O ...Nxe5 dxe5 ...Be6! Black trades the central knight, recaptures with the d-pawn, and develops the c8-bishop to e6 attacking the Bc4. White's structure is compromised AND the Bc4 has nowhere safe to go.",
      sayShort: '...Be6 — bishop pair wins.' }),
  ],
};

interface TrapEntry { name: string; lesson: LessonScript; }
const TRAPS: TrapEntry[] = [
  { name: 'Nc3 in Four Pawns lets ...Bb4 win the bishop pair', lesson: NC3_FOUR_PAWNS_BB4 },
  { name: 'Be3 + ...Bb4 wins structure (move-order variant)', lesson: BE3_BB4_VARIANT },
  { name: 'fxe5 in Anti-Vienna f4 line (Hikaru victim)', lesson: FXE5_NXE4_HIKARU },
  { name: 'Bb5 in Anti-Vienna lets ...Nd4 fork', lesson: BB5_ND4_FORK },
  { name: 'Bc4 + Nd7 in Modern Alekhine', lesson: BC4_MODERN_TRADE },
];

export function getProNaroditskyAlekhineTrapLesson(name: string): LessonScript | null {
  return TRAPS.find((t) => t.name === name)?.lesson ?? null;
}
export function getProNaroditskyAlekhineTrapPlayableLine(name: string): PlayableMiddlegameLine | null {
  const lesson = getProNaroditskyAlekhineTrapLesson(name);
  return lesson ? lessonToPlayableLine(lesson) : null;
}
