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
// Nc3 Two Knights — White DECLINES the Alekhine; you get an e5 game.
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
      say: "You'll see Nc3 when White declines the Alekhine chase. Instead of kicking your knight with e5, White just develops and defends the e4-pawn. That's a small victory for you: you no longer have to play the provocative Alekhine at all — you can simply grab your fair share of the centre and reach a comfortable, classical game.",
      sayShort: 'Nc3 — White declines the chase.',
    }),
    b({
      id: 'e5', moves: 'e4 Nf6 Nc3 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "e5 — you plant a pawn in the centre and transpose into Four Knights territory, a rock-solid open game. This is the quiet reward for playing the Alekhine: if White will not over-extend, you happily switch to a healthy classical position where you are never worse.",
      sayShort: 'e5 — transpose to a solid open game.',
    }),
    b({
      id: 'nf3-nc6', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Nf3 attacks e5 and you defend it naturally with Nc6. Both sides develop knights to their best squares — this is the Four Knights, one of the soundest, most symmetrical openings there is. Perfectly comfortable for the second player.",
      sayShort: 'Nc6 — defend e5, Four Knights.',
    }),
    b({
      id: 'bb5-nd4', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6 Bb5 Nd4',
      highlights: [{ square: 'b5', color: SOFT }, { square: 'd4', color: KEY }],
      say: "White pins with Bb5, the Spanish idea — and here is his actual answer, played in 103 of his 132 games at this position: Nd4, the Rubinstein. Instead of suffering the pin, the knight jumps INTO the centre and asks the bishop what it is doing. Trade on d4 and you recapture toward the middle; retreat and you have gained time. The pin never happens.",
      sayShort: 'Nd4 — the Rubinstein. His move.',
    }),
    b({
      id: 'bc4-develop', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6 Bb5 Nd4 Bc4 Bc5 d3 d6 h3',
      highlights: [{ square: 'c4', color: SOFT }, { square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "The bishop steps to c4 rather than trade, and you develop classically around your centralized knight — bishop to c5, pawn to d6 propping e5. White spends a move on h3, and notice the ledger: your knight has stood proudly on d4 for three moves and White still has not dislodged it.",
      sayShort: 'Bc5 and d6 — build around d4.',
    }),
    b({
      id: 'castle', moves: 'e4 Nf6 Nc3 e5 Nf3 Nc6 Bb5 Nd4 Bc4 Bc5 d3 d6 h3 O-O',
      highlights: [{ square: 'g8', color: KEY }],
      say: "You castle, and the tabiya is set — twelve of his games reached it, seven wins to two. The plan from here is a chain of trades on Your terms: when White finally takes on d4 you recapture with the bishop, offer the light bishops off with Be6, and recapture fxe6, opening the f-file in front of this very rook. The engine likes Black — a fifth of a pawn — out of an opening White chose to avoid.",
      sayShort: 'O-O — seven wins to two here.',
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
      say: "The Alekhine proper: Nf6 provokes e5, and the knight hops to d5. You have invited White to grab space, and now you watch to see how far the pawns advance — because the further they go, the more targets they become. You'll reach the Modern Main when White backs the centre up with c4 next.",
      sayShort: 'Nd5 — provoke the advance.',
    }),
    b({
      id: 'd4-d6', moves: 'e4 Nf6 e5 Nd5 d4 d6',
      highlights: [{ square: 'd4', color: SOFT }, { square: 'd6', color: KEY }],
      say: "White builds with d4, and you immediately chip at the head of the chain with d6. This is the Alekhine's method: never let the big centre sit undisturbed. You strike at e5 at once, forcing White to make decisions about that advanced pawn.",
      sayShort: 'd6 — strike the e5 head.',
    }),
    b({
      id: 'c4-nb6', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6',
      highlights: [{ square: 'c4', color: KEY }, { square: 'b6', color: SOFT }],
      say: "c4 — the Modern Main. White grabs still more space and kicks your knight to b6. It's the most ambitious try, a giant pawn front of c4-d4-e5. But there is a saying about the Alekhine: the bigger the centre, the harder it falls. All that space is a lot of squares White must defend.",
      sayShort: 'c4 Nb6 — the big centre appears.',
    }),
    b({
      id: 'exchange', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'e8', color: SOFT }],
      say: "White resolves the tension with exd6 and you recapture with the e-pawn — exd6. This is the key choice: taking with the e-pawn opens the e-file for your rook and gives you a healthy, active structure, rather than a cramped one. The imposing centre has already been cut down to size.",
      sayShort: 'exd6 — open the e-file.',
    }),
    b({
      id: 'nc3-be7', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nc3 Be7',
      highlights: [{ square: 'e7', color: KEY }],
      say: "White develops Nc3 and you bring the bishop to e7 — flexible, eyeing the kingside and clearing the way to castle. Your pieces come out fast and freely, while White still has to spend moves supporting that broad but stretched pawn structure.",
      sayShort: 'Be7 — develop, prepare to castle.',
    }),
    b({
      id: 'bd3-castle', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nc3 Be7 Bd3 O-O',
      highlights: [{ square: 'g8', color: KEY }, { square: 'd3', color: SOFT }],
      say: "White develops the bishop to d3, and you castle — immediately. His corpus is nearly unanimous here: sixty of sixty-one games tuck the king away before anything else. King safety first; the pressure on White's stretched pawns comes after, from a position that can never be caught in the centre.",
      sayShort: 'O-O — sixty of sixty-one castle.',
    }),
    b({
      id: 'c6-na6', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nc3 Be7 Bd3 O-O Nge2 c6 O-O Na6',
      highlights: [{ square: 'c6', color: SOFT }, { square: 'a6', color: KEY }],
      say: "Both sides finish developing, you shore up the light squares with c6 — and then the move that looks odd and isn't: knight to a6. The rim is a corridor, not a home. From a6 the knight is headed for c7, where it will guard d5 and e6 and stand ready to jump. Give a corpus line one strange-looking move and it usually turns out to be the best-scoring one.",
      sayShort: 'Na6 — the corridor, not the home.',
    }),
    b({
      id: 'b3-nc7', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 exd6 Nc3 Be7 Bd3 O-O Nge2 c6 O-O Na6 b3 Nc7',
      highlights: [{ square: 'c7', color: KEY }, { square: 'd5', color: SOFT }, { square: 'e6', color: SOFT }],
      say: "White props the c4-pawn with b3, and the knight completes its journey: c7, covering d5 and e6, eyeing b5 forever. This exact position appears five times in his corpus — five wins, no losses. White owns more space; you own a wall without a single hole and the fully open e-file to work on. The middlegame plans pick up right here.",
      sayShort: 'Nc7 — five wins, no losses.',
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
      say: "The Alekhine: Nf6 provokes e5, the knight jumps to d5. You'll reach the Modern Quiet when White develops calmly with Nf3 next, declining to over-extend with c4. It's the restrained, positional way to handle the Alekhine — and it gives you an easy, comfortable game.",
      sayShort: 'Nd5 — provoke, expect quiet play.',
    }),
    b({
      id: 'd4-d6', moves: 'e4 Nf6 e5 Nd5 d4 d6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "d4 builds the centre and you hit it with d6 — the standard Alekhine strike at the e5-pawn. You refuse to let the centre stand unchallenged, forcing White to clarify while you develop with tempo.",
      sayShort: 'd6 — strike at e5.',
    }),
    b({
      id: 'nf3-nb6', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6',
      highlights: [{ square: 'f3', color: SOFT }, { square: 'b6', color: KEY }],
      say: "White develops Nf3 quietly — no c4, no big pawn front — and your knight steps back to b6, a solid square eyeing c4 and d5. This is the calm modern main line, and it suits you perfectly: no sharp theory to memorise, just sound development and good pieces.",
      sayShort: 'Nb6 — retreat to a solid square.',
    }),
    b({
      id: 'be2-bf5', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 Be2 Bf5',
      highlights: [{ square: 'f5', color: KEY }],
      say: "White develops Be2, and you play the key Alekhine move — Bf5, getting the light-squared bishop OUTSIDE the pawn chain before you ever play e6. This is what makes the Alekhine pleasant: unlike the Caro or French, your light bishop never gets buried. It stands active on f5 while you finish the wall behind it.",
      sayShort: 'Bf5 — the good bishop out early.',
    }),
    b({
      id: 'c4-cxd6', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 Be2 Bf5 c4 e6 exd6 cxd6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'c4', color: SOFT }],
      say: "White expands with c4 and resolves the centre, and you recapture with the C-pawn — keeping the wall compact and the c-file half-open for your rook. Now the honest accounting: the engine leans White in this sideline, most of a pawn with best play. His corpus answer is seventeen wins to eight — the structure holds, and the coming a5-a4 march gives real counterplay. Know the toll, play the position; that is what a fighting sideline is.",
      sayShort: 'cxd6 — compact wall, honest toll.',
    }),
  ],
};

export const PRO_NARODITSKY_ALEKHINE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-alekhine::Nc3 Two Knights': NC3_TWO_KNIGHTS,
  'pro-naroditsky-alekhine::c4 Modern Main': C4_MODERN,
  'pro-naroditsky-alekhine::Nf3 / Modern Quiet': NF3_QUIET,
};
