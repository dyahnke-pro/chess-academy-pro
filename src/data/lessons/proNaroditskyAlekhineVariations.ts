import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Pro Naroditsky Alekhine — variation lessons, every-step house voice
// (David 2026-07-02). Student plays BLACK. Covers White's three main tries:
// declining with Nc3 (transposing to a Four Knights), the c4 Modern Main, and
// the quiet Nf3. Spines board-verified to middlegames and engine-checked
// (Black -0.21..-0.78, all sound). Original prose; when-to-play framed on each.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

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
  'https://www.chess.com/openings/Alekhines-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// ============================================================
// Nc3 Two Knights — White DECLINES the Alekhine; we get an e5 game.
// ============================================================
const NC3_TWO_KNIGHTS: LessonScript = {
  openingId: 'pro-naroditsky-alekhine',
  title: 'Nc3 — when White declines: a comfortable e5 game',
  minutes: 6,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'nc3', moves: 'e4 Nf6 Nc3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'e5', color: SOFT }],
      say: "You'll see Nc3 when White declines the Alekhine chase. Instead of kicking our knight with e5, White just develops and defends the e4-pawn. That's a small victory for us: we no longer have to play the provocative Alekhine at all — we can simply grab our fair share of the centre and reach a comfortable, classical game.",
      sayShort: 'Nc3 — White declines the chase.',
    }),
    b({
      id: 'e5', moves: 'e4 Nf6 Nc3 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "e5 — we plant a pawn in the centre and transpose into Four Knights territory, a rock-solid open game. This is the quiet reward for playing the Alekhine: if White will not over-extend, we happily switch to a healthy classical position where we are never worse.",
      sayShort: 'e5 — transpose to a solid open game.',
    }),
    b({
      id: 'nf3-nc6', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Nf3 attacks e5 and we defend it naturally with Nc6. Both sides develop knights to their best squares — this is the Four Knights, one of the soundest, most symmetrical openings there is. Perfectly comfortable for the second player.",
      sayShort: 'Nc6 — defend e5, Four Knights.',
    }),
    b({
      id: 'bb5-bb4', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6 Bb5 Bb4',
      highlights: [{ square: 'b5', color: SOFT }, { square: 'b4', color: KEY }],
      say: "White pins our knight with Bb5, the Spanish idea — and we simply mirror it with Bb4, pinning right back. This symmetry is the point: whatever pressure White creates, we create the identical pressure in return, keeping the game in perfect balance.",
      sayShort: 'Bb4 — mirror the pin.',
    }),
    b({
      id: 'castle', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6 Bb5 Bb4 O-O O-O',
      highlights: [{ square: 'g8', color: KEY }, { square: 'g1', color: SOFT }],
      say: "Both sides castle and we have reached a balanced, healthy Four Knights — the engine calls it dead level. Black is completely fine here, with an easy game and no weaknesses. When White ducks the real Alekhine, this comfortable equality is exactly what we are glad to accept.",
      sayShort: 'O-O — dead level, Black is fine.',
    }),
  ],
};

// ============================================================
// c4 Modern Main — the big Four-Pawns-style centre; recapture ...exd6.
// ============================================================
const C4_MODERN: LessonScript = {
  openingId: 'pro-naroditsky-alekhine',
  title: 'c4 Modern Main — undermine the broad centre',
  minutes: 8,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'provoke', moves: 'e4 Nf6 e5 Nd5',
      highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
      say: "The Alekhine proper: Nf6 provokes e5, and the knight hops to d5. We have invited White to grab space, and now we watch to see how far the pawns advance — because the further they go, the more targets they become. You'll reach the Modern Main when White backs the centre up with c4 next.",
      sayShort: 'Nd5 — provoke the advance.',
    }),
    b({
      id: 'd4-d6', moves: 'e4 Nf6 e5 Nd5 d4 d6',
      highlights: [{ square: 'd4', color: SOFT }, { square: 'd6', color: KEY }],
      say: "White builds with d4, and we immediately chip at the head of the chain with d6. This is the Alekhine's method: never let the big centre sit undisturbed. We strike at e5 at once, forcing White to make decisions about that advanced pawn.",
      sayShort: 'd6 — strike the e5 head.',
    }),
    b({
      id: 'c4-nb6', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6',
      highlights: [{ square: 'c4', color: KEY }, { square: 'b6', color: SOFT }],
      say: "c4 — the Modern Main. White grabs still more space and kicks our knight to b6. It's the most ambitious try, a giant pawn front of c4-d4-e5. But there is a saying about the Alekhine: the bigger the centre, the harder it falls. All that space is a lot of squares White must defend.",
      sayShort: 'c4 Nb6 — the big centre appears.',
    }),
    b({
      id: 'exchange', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'e8', color: SOFT }],
      say: "White resolves the tension with exd6 and we recapture with the e-pawn — exd6. This is the key choice: taking with the e-pawn opens the e-file for our rook and gives us a healthy, active structure, rather than a cramped one. The imposing centre has already been cut down to size.",
      sayShort: 'exd6 — open the e-file.',
    }),
    b({
      id: 'nc3-be7', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nc3 Be7',
      highlights: [{ square: 'e7', color: KEY }],
      say: "White develops Nc3 and we bring the bishop to e7 — flexible, eyeing the kingside and clearing the way to castle. Our pieces come out fast and freely, while White still has to spend moves supporting that broad but stretched pawn structure.",
      sayShort: 'Be7 — develop, prepare to castle.',
    }),
    b({
      id: 'bd3-nc6', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nc3 Be7 Bd3 Nc6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "White develops the bishop to d3 and we play Nc6, training our sights on the d4-pawn — the base of White's remaining centre. Every piece we develop comes with pressure on those advanced pawns; this is the Alekhine plan in full flow.",
      sayShort: 'Nc6 — pressure the d4 base.',
    }),
    b({
      id: 'nge2-plan', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nc3 Be7 Bd3 Nc6 Nge2',
      highlights: [{ square: 'd4', color: KEY }, { square: 'c4', color: SOFT }],
      say: "White completes development with Nge2, and we have reached a comfortable middlegame. The plan is clear: castle, then keep piling pressure on d4 and c4 with Bf6, Re8 and the knights, and look for a break to open the position. The engine reads it near-level — White's big centre has become a big responsibility, and we have the easier pieces to play.",
      sayShort: 'Plan: castle, pressure d4 and c4.',
    }),
  ],
};

// ============================================================
// Nf3 Modern Quiet — the good bishop out with ...Bf5.
// ============================================================
const NF3_QUIET: LessonScript = {
  openingId: 'pro-naroditsky-alekhine',
  title: 'Nf3 Modern Quiet — the bishop out before ...e6',
  minutes: 6,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'provoke', moves: 'e4 Nf6 e5 Nd5',
      highlights: [{ square: 'd5', color: KEY }],
      say: "The Alekhine: Nf6 provokes e5, the knight jumps to d5. You'll reach the Modern Quiet when White develops calmly with Nf3 next, declining to over-extend with c4. It's the restrained, positional way to handle the Alekhine — and it gives us an easy, comfortable game.",
      sayShort: 'Nd5 — provoke, expect quiet play.',
    }),
    b({
      id: 'd4-d6', moves: 'e4 Nf6 e5 Nd5 d4 d6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "d4 builds the centre and we hit it with d6 — the standard Alekhine strike at the e5-pawn. We refuse to let the centre stand unchallenged, forcing White to clarify while we develop with tempo.",
      sayShort: 'd6 — strike at e5.',
    }),
    b({
      id: 'nf3-nb6', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6',
      highlights: [{ square: 'f3', color: SOFT }, { square: 'b6', color: KEY }],
      say: "White develops Nf3 quietly — no c4, no big pawn front — and our knight steps back to b6, a solid square eyeing c4 and d5. This is the calm modern main line, and it suits us perfectly: no sharp theory to memorise, just sound development and good pieces.",
      sayShort: 'Nb6 — retreat to a solid square.',
    }),
    b({
      id: 'be2-bf5', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 Be2 Bf5',
      highlights: [{ square: 'f5', color: KEY }],
      say: "White develops Be2, and we play the key Alekhine move — Bf5, getting the light-squared bishop OUTSIDE the pawn chain before we ever play e6. This is the whole point that makes the Alekhine so pleasant: unlike the Caro or French, our light bishop never gets buried. It stands active on f5, and we will follow with e6, Be7 and castling into a comfortable, near-level game where we pressure White's centre at leisure.",
      sayShort: 'Bf5 — the good bishop out early.',
    }),
  ],
};

export const PRO_NARODITSKY_ALEKHINE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-alekhine::Nc3 Two Knights': NC3_TWO_KNIGHTS,
  'pro-naroditsky-alekhine::c4 Modern Main': C4_MODERN,
  'pro-naroditsky-alekhine::Nf3 / Modern Quiet': NF3_QUIET,
};
