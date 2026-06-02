import type {
  LessonScript,
  LessonBeat,
  AnnotationHighlight,
  PlayableMiddlegameLine,
} from '../../types';
import { lessonToPlayableLine } from './index';

// Pro Naroditsky KIA trap lessons — mined from his real chess.com
// archive (12,023 KIA wins as White, 10,369 White-blunder positions,
// 9,559 unique trap patterns). Top 5 patterns below all carry named
// 2700+ victims (Hikaru 3121, Firouzja 3045, BrandonJacobson 3141,
// Oleksandr_Bortnyk 3155, Mykola-Bortnyk 3190).

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
  'https://www.chess.com/openings/Kings-Indian-Attack',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// TRAP 1: 48 games — O-O after e5 wedge (Anti-Grünfeld setup)
const OO_ANTI_GRUNFELD: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'Weapon: O-O lets us crash through with exf6 (Anti-Grünfeld)',
  minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({
      id: 'kia-og-setup', moves: 'Nf3 Nf6 g3 g6 e4 Bg7 e5',
      highlights: [H('e5', ATK), H('f6', SOFT)],
      say: "Anti-Grünfeld setup: after Nf3 ...Nf6 g3 ...g6 e4 ...Bg7 we play e5! attacking the knight on f6. The pawn wedge is the trap — Black has to move the knight cleanly or pay the price.",
      sayShort: 'e5 — attack the knight.',
    }),
    b({
      id: 'kia-og-blunder', moves: 'Nf3 Nf6 g3 g6 e4 Bg7 e5 O-O',
      highlights: [H('g8', ATK), H('f6', SOFT)],
      say: "...O-O?? — Black castles INSTEAD of moving the knight. The natural-looking castle move walks straight into a structural disaster. 48 opponents played this including BrandonJacobson (3141), Oleksandr_Bortnyk (3155), and Mykola-Bortnyk (3136).",
      sayShort: '...O-O — castle into the trap.',
    }),
    b({
      id: 'kia-og-crash', moves: 'Nf3 Nf6 g3 g6 e4 Bg7 e5 O-O exf6 exf6',
      highlights: [H('f6', KEY)],
      say: "exf6 ...exf6 — the trade rips Black's kingside. Black recaptures with the e-pawn (the only recapture — Bxf6 surrenders the Bg7, and the f6-pawn locks the bishop's diagonal). Black has doubled f-pawns AND the bishop on g7 is partially boxed in.",
      sayShort: 'exf6 — wreck the kingside.',
    }),
    b({
      id: 'kia-og-cash', moves: 'Nf3 Nf6 g3 g6 e4 Bg7 e5 O-O exf6 exf6 Be2 Re8 O-O',
      highlights: [H('e2', SOFT), H('g1', KEY)],
      say: "Be2 ...Re8 O-O — White develops calmly while Black tries to use the open e-file as compensation. But the doubled f-pawns + locked dark-square bishop + structural weakness on the f-file = clear positional edge that converts in 25-30 moves.",
      sayShort: 'O-O — clean positional win.',
    }),
  ],
};

// TRAP 2: 31 games — d6 then e5 trade lets us swap queens favorably
const D6_E5_QUEEN_TRADE: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'Weapon: d6 + e5 trade hands us the better endgame',
  minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({
      id: 'kia-d6-setup', moves: 'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 O-O d4',
      highlights: [H('d4', KEY), H('e4', SOFT)],
      say: "After d4 in the symmetric KID transposition, White has the broad centre. Black needs to challenge with ...e5 or play ...d6 carefully. The careless ...d6 — Black's natural KID move — actually loses the queen-trade race here.",
      sayShort: 'd4 — broad centre.',
    }),
    b({
      id: 'kia-d6-blunder', moves: 'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 O-O d4 d6',
      highlights: [H('d6', ATK), H('e7', SOFT)],
      say: "...d6 — supports e5 but commits the e-pawn to a forced trade. 31 opponents played this including Firouzja (2989), Arambai (3154), and wonderfultime (3182). The queen trade that follows leaves Black with a permanent structural disadvantage.",
      sayShort: '...d6 — natural but wrong.',
    }),
    b({
      id: 'kia-d6-strike', moves: 'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 O-O d4 d6 Be2 e5 dxe5 dxe5',
      highlights: [H('e5', KEY), H('d8', ATK)],
      say: "Be2 ...e5 dxe5 ...dxe5 — Black plays the central break, we trade pawns, and now the d-file is open with both queens on it. The trade looks balanced but Black's queen is loose AND her recapture options are limited.",
      sayShort: 'dxe5 ...dxe5 — open d-file.',
    }),
    b({
      id: 'kia-d6-trade', moves: 'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 O-O d4 d6 Be2 e5 dxe5 dxe5 Qxd8',
      highlights: [H('d8', ATK)],
      say: "Qxd8! — we trade queens directly. Black MUST recapture with the rook (Rxd8) — the king can't take and the f-rook isn't there. The resulting R+B+N endgame favors White: better pawn structure, more active pieces, and Black's …Bg7 has no targets.",
      sayShort: 'Qxd8 — force the endgame.',
    }),
  ],
};

// TRAP 3: 17 games — Be7 vs Bg5 pin in QGD (penguingm1 victim)
const BE7_QGD_PIN: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'Weapon: Be7 vs Bg5 pin in QGD-style structure',
  minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({
      id: 'kia-be7-setup', moves: 'Nf3 Nf6 d4 d5 c4 e6 Nc3',
      highlights: [H('c3', SOFT), H('d4', KEY)],
      say: "Queen's Gambit transposition: after Nf3 ...Nf6 d4 ...d5 c4 ...e6 Nc3 we have the QGD structure. The critical decision for Black is which bishop to develop first. The Be7 move IS the textbook play but the timing matters.",
      sayShort: 'Nc3 — QGD structure.',
    }),
    b({
      id: 'kia-be7-blunder', moves: 'Nf3 Nf6 d4 d5 c4 e6 Nc3 Be7',
      highlights: [H('e7', ATK), H('f6', SOFT)],
      say: "...Be7 — the natural development move. But here it's premature because Black hasn't dealt with the f6-knight's vulnerability to the Bg5 pin. 17 opponents made this exact move at this exact ply, including penguingm1 at 3064 and idontknowchess75 at 3125.",
      sayShort: '...Be7 — natural but early.',
    }),
    b({
      id: 'kia-be7-pin', moves: 'Nf3 Nf6 d4 d5 c4 e6 Nc3 Be7 Bg5',
      highlights: [H('g5', ATK), H('f6', SOFT)],
      say: "Bg5! — the pin. Black's f6-knight is pinned against the Be7-bishop, AND the f6-knight is the only piece defending d5. The natural ...h6 to chase the bishop ends in disaster.",
      sayShort: 'Bg5 — pin the knight.',
    }),
    b({
      id: 'kia-be7-cash', moves: 'Nf3 Nf6 d4 d5 c4 e6 Nc3 Be7 Bg5 h6 Bxf6 Bxf6 cxd5',
      highlights: [H('d5', KEY)],
      say: "...h6 Bxf6 ...Bxf6 cxd5! — White trades the bishop AND grabs the central pawn. Black ends up with: isolated d-pawn (or no d-pawn after exd5), traded bishop, lost tempo. The structural conversion runs from here.",
      sayShort: 'cxd5 — grab the centre.',
    }),
  ],
};

// TRAP 4: 12 games — same Be7 pin vs Hikaru (3121!) in slightly different move order
const BE7_HIKARU_PIN: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'Weapon: Be7 vs Bg5 pin (top-GM victim, QGD inverted)',
  minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({
      id: 'kia-hik-setup', moves: 'Nf3 d5 c4 e6 d4 Nf6 Nc3',
      highlights: [H('c3', SOFT)],
      say: "QGD reached via the KIA move order. A top GM played the wrong response from here — at this exact position with these exact prior moves. The trap that catches even the world's best blitz player.",
      sayShort: 'Nc3 — QGD ready.',
    }),
    b({
      id: 'kia-hik-blunder', moves: 'Nf3 d5 c4 e6 d4 Nf6 Nc3 Be7',
      highlights: [H('e7', ATK)],
      say: "...Be7?? — a top GM's exact move. 12 opponents played this including a 3121-rated GM, Hrant_ChessMood (2947), and penguingm1 in three different games. The Bg5 pin response is the trap.",
      sayShort: '...Be7 — A top grandmaster\'s mistake.',
    }),
    b({
      id: 'kia-hik-pin', moves: 'Nf3 d5 c4 e6 d4 Nf6 Nc3 Be7 Bg5',
      highlights: [H('g5', ATK)],
      say: "Bg5 — same pin pattern as Trap 3, just from a different move order. The f6-knight is pinned, Black has no way to relieve the pressure without conceding structure.",
      sayShort: 'Bg5 — pin again.',
    }),
    b({
      id: 'kia-hik-cash', moves: 'Nf3 d5 c4 e6 d4 Nf6 Nc3 Be7 Bg5 h6 Bxf6 Bxf6 e3',
      highlights: [H('e3', KEY)],
      say: "...h6 Bxf6 ...Bxf6 e3 — White trades the bishop and consolidates with e3. Black's bishop pair claim is gone (the dark-square bishop traded), the f6-bishop has limited mobility, and White has the classical positional plan: c5 lock + queenside expansion. A top GM lost this exact way.",
      sayShort: 'e3 — consolidate the win.',
    }),
  ],
};

// TRAP 5: 12 games — Nb6 vs c5 in Anti-Alekhine (Mykola-Bortnyk 3190 victim)
const NB6_ANTI_ALEKHINE: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: 'Weapon: Nb6 vs c5 cramping (Anti-Alekhine setup)',
  minutes: 3, orientation: 'white', kind: 'trap', sources: SRC,
  beats: [
    b({
      id: 'kia-nb6-setup', moves: 'Nf3 g6 e4 Nf6 e5 Nd5 c4',
      highlights: [H('c4', KEY), H('d5', ATK)],
      say: "Anti-Alekhine setup. After Black's hyper-modern ...g6 + ...Nf6 + ...Nd5, we play c4 chasing the knight to b6. The retreat Nb6 looks safe but it lets White play c5 cramping Black's queenside permanently.",
      sayShort: 'c4 — chase the knight.',
    }),
    b({
      id: 'kia-nb6-blunder', moves: 'Nf3 g6 e4 Nf6 e5 Nd5 c4 Nb6',
      highlights: [H('b6', ATK)],
      say: "...Nb6 — the textbook retreat. But here it lets White grab significant queenside space. 12 opponents fell into this including Mykola-Bortnyk (3190), OminousOmen (3007), and wonderfultime (2931).",
      sayShort: '...Nb6 — passive retreat.',
    }),
    b({
      id: 'kia-nb6-c5', moves: 'Nf3 g6 e4 Nf6 e5 Nd5 c4 Nb6 c5',
      highlights: [H('c5', ATK), H('b6', SOFT)],
      say: "c5! — White's space-grabbing push. The pawn drives Black's knight to d5 (the only square), AND the c5-pawn cramps Black's queenside permanently. Black's b-pawn can't advance, queenside development is halted.",
      sayShort: 'c5 — cramp the queenside.',
    }),
    b({
      id: 'kia-nb6-cash', moves: 'Nf3 g6 e4 Nf6 e5 Nd5 c4 Nb6 c5 Nd5 Nc3 c6 Nxd5',
      highlights: [H('d5', KEY)],
      say: "...Nd5 Nc3 ...c6 Nxd5 — Black's knight retreats again, we develop and trade the central knight. Black's structure is now a mess: c5-pawn cramps, c6 fixes the d6/d5 weakness, no good piece placement. The conversion is structural — Black is just permanently worse.",
      sayShort: 'Nxd5 — convert structural edge.',
    }),
  ],
};

interface TrapEntry { name: string; lesson: LessonScript; }
const TRAPS: TrapEntry[] = [
  { name: 'O-O lets us crash through with exf6 (Anti-Grünfeld)', lesson: OO_ANTI_GRUNFELD },
  { name: 'd6 + e5 trade hands us the better endgame', lesson: D6_E5_QUEEN_TRADE },
  { name: 'Be7 vs Bg5 pin in QGD-style structure', lesson: BE7_QGD_PIN },
  { name: 'Be7 vs Bg5 pin (top-GM victim)', lesson: BE7_HIKARU_PIN },
  { name: 'Nb6 vs c5 cramping (Anti-Alekhine setup)', lesson: NB6_ANTI_ALEKHINE },
];

export function getProNaroditskyKIATrapLesson(name: string): LessonScript | null {
  const entry = TRAPS.find((t) => t.name === name);
  return entry?.lesson ?? null;
}

export function getProNaroditskyKIATrapPlayableLine(name: string): PlayableMiddlegameLine | null {
  const lesson = getProNaroditskyKIATrapLesson(name);
  if (!lesson) return null;
  return lessonToPlayableLine(lesson);
}
