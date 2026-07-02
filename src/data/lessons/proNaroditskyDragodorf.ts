import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Naroditsky DRAGODORF — main-line beat lesson, played out + explained every
// step (David 2026-07-02 house-voice standard). Student plays BLACK.
//
// Spine (18 plies, board-verified, reaches a real middlegame — both sides
// castled, both developed 3 minors):
//   e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3 g6 Bg2 Bg7 O-O O-O h3 Nc6
// Grounded on the masters/club explorer (the g3 fianchetto is White's calm
// anti-Dragodorf try; ...g6 in this structure appears ~265 master games, more
// in club play). The Dragodorf is a TEACHING line — a Najdorf/Dragon hybrid he
// showcases — thin in his own rated blitz corpus (flagged per the instructional-
// content doctrine): moves ground on theory + explorer + engine, not his games.
// Engine (Stockfish d16): Black ≈ -0.34 at the terminus — sound and comfortable.
//
// Voice: the Naroditsky HOUSE STYLE (concept-first, the idea behind every move),
// authored as ORIGINAL prose from the established ideas (fianchetto battle, the
// a6+g6 hybrid, the long diagonal, ...b5 expansion, the Dragon exchange-sac
// heritage) — NEVER quoting his video (plagiarism guard, David 2026-07-02).

const VIS = 'rgba(40,185,95,0.92)'; // green — piece vision / intent (never from a pawn)
const KEY = 'rgba(255,214,0,0.88)'; // yellow — key square the narration names
const SOFT = 'rgba(80,140,255,0.32)'; // blue — soft context square

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const PRO_NARODITSKY_DRAGODORF_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-dragodorf',
  title: 'The Dragodorf — the Najdorf–Dragon hybrid',
  minutes: 12,
  orientation: 'black',
  kind: 'variation',
  sources: [
    'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation',
    'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation',
    'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation',
  ],
  beats: [
    b({
      id: 'sicilian',
      moves: 'e4 c5',
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "This is the Sicilian, and it starts with an argument, not a handshake. White plays into the centre with e4; Black answers on the wing with c5. That little pawn does something the symmetrical e5 never does — it fights for the d4-square from the side while refusing to mirror White. The whole opening flows from that imbalance: unequal pawns, unequal plans, and a full-blooded game where both sides play for a win.",
      sayShort: 'c5 — fight for d4 sideways.',
    }),
    b({
      id: 'd6',
      moves: 'e4 c5 Nf3 d6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'e5', color: SOFT }],
      say:
        "White develops the knight to f3 and Black plays d6 — quiet, flexible, and doing real work. The d6-pawn takes the e5-square away from White's pieces, so no knight or pawn can land there and cramp us. It also opens the door for the queen's bishop later. This is the flexible Sicilian: Black keeps every plan on the table and commits to nothing yet.",
      sayShort: 'd6 — deny e5, keep it flexible.',
    }),
    b({
      id: 'open-sicilian',
      moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4',
      arrows: [{ from: 'd4', to: 'e6', color: VIS }, { from: 'd4', to: 'f5', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say:
        "White strikes with d4, we take, and White recaptures with the knight — the Open Sicilian. This is the crucial signpost: the Dragodorf is our answer WHENEVER White enters the Open Sicilian like this, and against every setup White tries here — the fianchetto, the Classical, the h3 lines, the English Attack. If instead White dodges with an anti-Sicilian that never plays d4 — the Alapin c3, the Rossolimo Bb5, the Grand Prix — there is no Open Sicilian and we reach for those separate systems, not this one. Here White has committed to d4, so the Dragodorf is on. The knight on d4 eyes e6 and f5; we have the half-open c-file and a queenside majority.",
      sayShort: 'Nxd4 — Open Sicilian: Dragodorf is on.',
    }),
    b({
      id: 'najdorf-hub',
      moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6',
      arrows: [{ from: 'f6', to: 'e4', color: VIS }],
      highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say:
        "Nf6 pokes at e4 and forces White to defend it with Nc3. Then comes the move that names half the Sicilian: a6. It looks modest, but it's pure prophylaxis — it denies the b5-square to White's pieces, so no knight or bishop can jump in and harass us there, and it quietly prepares our own b5, the pawn lever that unrolls the whole queenside. This is the Najdorf crossroads, and here the repertoire takes a turn.",
      sayShort: 'a6 — deny b5, prepare our own.',
    }),
    b({
      id: 'g3-fianchetto',
      moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3',
      highlights: [{ square: 'g3', color: KEY }, { square: 'g2', color: SOFT }, { square: 'd5', color: SOFT }],
      say:
        "Instead of the sharpest tries, White reaches for g3 — the calm fianchetto. The idea is honest and dangerous in its own way: park the bishop on g2, aim it down the long light-squared diagonal at our centre and queenside, castle, and sidestep the tons of Najdorf theory. Against a well-prepared opponent this is a smart practical choice. So we meet a system with a system of our own.",
      sayShort: 'g3 — White sidesteps into the fianchetto.',
    }),
    b({
      id: 'dragodorf',
      moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3 g6',
      highlights: [{ square: 'g6', color: KEY }, { square: 'g7', color: SOFT }],
      say:
        "Here is the whole point — g6. We already committed to a6 like the Najdorf; now we add g6 like the Dragon. That is the Dragodorf: one hybrid setup that borrows the best of both. From the Najdorf we keep a6 and the b5 expansion; from the Dragon we take the bishop to g7, where it will rake the long dark diagonal. Two famous plans fused into one, and it catches a lot of players who only prepared for one or the other.",
      sayShort: 'g6 — Najdorf a6 meets Dragon g6.',
    }),
    b({
      id: 'bishops-face-off',
      moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3 g6 Bg2 Bg7',
      highlights: [{ square: 'g7', color: KEY }, { square: 'g2', color: SOFT }, { square: 'd4', color: SOFT }],
      say:
        "Both bishops take their fianchetto squares and stare at each other down the long diagonal. Our g7-bishop is the soul of this whole setup. Right now the knight on f6 stands in front of it, so its power is masked — but the moment that knight steps aside, or we break with e5 or e6 and d5, the bishop breathes fire straight at White's centre and queenside. Everything we do is about opening lines for that bishop.",
      sayShort: 'Bg7 — the masked dragon bishop.',
    }),
    b({
      id: 'both-castle',
      moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3 g6 Bg2 Bg7 O-O O-O',
      highlights: [{ square: 'g8', color: SOFT }, { square: 'g1', color: SOFT }],
      say:
        "Both sides tuck their kings away. Notice something important — because White chose the quiet fianchetto instead of castling long, the kings are on the same side. That changes the whole character. There will be no headlong pawn-storm race at opposite kings here; this becomes a game of manoeuvring and squares, where the better plan wins slowly rather than the faster attack. Patience is the weapon now.",
      sayShort: 'Both castle short — a manoeuvring game.',
    }),
    b({
      id: 'middlegame-reached',
      moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3 g6 Bg2 Bg7 O-O O-O h3 Nc6',
      arrows: [{ from: 'c6', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'c8', color: SOFT }],
      say:
        "White plays h3 to deny our pieces the g4-square, and we finish developing with Nc6, immediately questioning the proud knight on d4. We've reached a healthy middlegame — the engine calls it near-level, a comfortable third of a pawn, which for Black in the Sicilian is exactly the fair fight we came for. Every piece has a job and the position is full of play.",
      sayShort: 'Nc6 — hit d4, the middlegame is set.',
    }),
    b({
      id: 'the-plan',
      moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3 g6 Bg2 Bg7 O-O O-O h3 Nc6',
      arrows: [{ from: 'c6', to: 'd4', color: VIS }],
      highlights: [{ square: 'b5', color: KEY }, { square: 'c8', color: KEY }, { square: 'd4', color: SOFT }],
      say:
        "So what do we actually do here? Three ideas, all pointing the same way. First, b5 — the Najdorf lever — gaining queenside space and giving the g7-bishop a clear runway. Second, the rook swings to c8, seizing the half-open c-file and lining up on White's knight and the c3-square. And third, the Dragon inheritance: if the chance comes, a rook sacrifice on c3 shatters White's queenside pawns and hands the g7-bishop a wide-open diagonal to the enemy king. Space, the c-file, and the long diagonal — that is the Dragodorf's plan in one breath.",
      sayShort: 'Plan: b5, Rc8, and the long diagonal.',
    }),
  ],
};
