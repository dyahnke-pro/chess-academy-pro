import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — ...e5 (Open Games / Ruy / Berlin), BLACK. 1,011 games
// (online + OTB). The classical, rock-solid answer to e4 — Carlsen's drawing-
// weapon-turned-winning-machine. Main line = the Closed Ruy (Chigorin set-up
// with ...Na5 and ...c5). Variations cover the Italian, the famous Berlin
// endgame, the anti-Marshall, the Scotch and the Four Knights.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Ruy_Lopez', 'https://www.chess.com/openings/Ruy-Lopez-Closed', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_1E5_LESSON: LessonScript = {
  openingId: 'pro-carlsen-1e5',
  title: "This repertoire's ...e5 — the Closed Ruy",
  minutes: 12,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'morphy', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7', highlights: [H('e5'), H('e7')], say: "Answering e4 with e5 is the most classical decision in chess — meet the centre with the centre. Against the Ruy Lopez, Black plays the rock-solid Morphy setup: ...a6, ...Nf6, ...Be7. Everything is sound, everything is flexible. This repertoire has drawn impregnable games and won long grinds from exactly here.", sayShort: 'The Morphy — sound and solid.' }),
    b({ id: 'chigorin', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d6', highlights: [H('b5'), H('d6')], say: "Black expands with ...b5, kicks the bishop to b3, castles, and props the centre with ...d6 — the Closed Ruy main line. The position is a slow, strategic marathon where Black is solid as granite and waits for the right moment to break with ...d5 or expand on the queenside.", sayShort: 'b5, d6 — the Closed Ruy.' }),
    b({ id: 'na5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d6 h3 Na5 Bc2', arrows: [A('a5', 'b3')], highlights: [H('a5')], say: "The classic Chigorin manoeuvre — ...Na5 hits the strong b3-bishop and forces it back to c2, dimming its bite. The knight will reroute via c6 or stay to support ...c5. This is the heartbeat of the Closed Ruy: trade off White's best piece, then claim queenside space.", sayShort: 'Na5 — chase the strong bishop.' }),
    b({ id: 'c5d4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d6 h3 Na5 Bc2 c5 d4', highlights: [H('c5'), H('d4')], say: "Black grabs space with ...c5, and White finally strikes the centre with d4. The tension between the pawn chains is the defining battle of the Closed Ruy — who breaks, who holds. Black's structure is resilient and his counterplay real. From here it's a deep strategic war, and nobody navigates those better than this repertoire.", sayShort: 'c5 then d4 — the central battle.' }),
  ],
};

const ITALIAN: LessonScript = {
  openingId: 'pro-carlsen-1e5', title: "vs Italian Bc4", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf6', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6', arrows: [A('f6', 'e4')], highlights: [H('f6')], say: "Against the Italian's Bc4, Black plays the active ...Nf6, hitting the e4-pawn at once and steering toward the solid Two Knights and Giuoco Pianissimo structures. No passive defence — Black fights for the centre from the start.", sayShort: 'Nf6 — hit e4 immediately.' }),
    b({ id: 'be7', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6', highlights: [H('e7'), H('d6')], say: "In the quiet d3 Italian, Black mirrors White's setup: ...Be7, castle, ...d6. The position is nearly symmetrical and supremely solid. Black simply develops sensibly, keeps the structure sound, and waits — this is the kind of slow, balanced game this repertoire turns into a win from nothing.", sayShort: 'Be7, d6 — solid symmetry.' }),
    b({ id: 'a4', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 a4', highlights: [H('a4'), H('a5')], say: "White probes with a4 on the queenside, and Black responds in kind, contesting space and preparing to reroute knights to active squares. The game becomes a manoeuvring battle of small details — exactly where the better player, not the better preparation, decides the result.", sayShort: 'Meet a4 — manoeuvring battle.' }),
  ],
};

const OPEN_BERLIN: LessonScript = {
  openingId: 'pro-carlsen-1e5', title: "Berlin ...Nf6", minutes: 7, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf6', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6', arrows: [A('f6', 'e4')], highlights: [H('f6')], say: "The Berlin Defence — ...Nf6 hits e4 and invites the famous Berlin Wall. This was this repertoire's choice in World Championship play: the soundest, most fortress-like answer to the Ruy Lopez, where Black heads straight for an endgame he knows how to hold and his opponent must break down.", sayShort: 'Nf6 — the Berlin Wall.' }),
    b({ id: 'endgame', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8', highlights: [H('d8'), H('f5')], say: "The Berlin endgame: queens come off and Black's king walks to d8. It looks strange, but it's a famous fortress — Black has the bishop pair and a solid structure to offset the lost castling rights. This repertoire has held this position against the best players alive and won it more than once.", sayShort: 'Queens off — the Berlin endgame.' }),
    b({ id: 'nf5', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 h3 Ke8 Nc3 Ne7', highlights: [H('f5'), H('e7')], say: "Black regroups: the king tucks to e8 and the knight reroutes from f5 to e7 and on toward d5 or g6. Black's two bishops are a long-term asset; White's extra kingside pawn is hard to make count. A deep technical battle where Black is fully equal — and this repertoire's endgame mastery makes it dangerous for White.", sayShort: 'Reroute — bishops hold the draw.' }),
  ],
};

const ANTI_MARSHALL: LessonScript = {
  openingId: 'pro-carlsen-1e5', title: "vs Anti-Marshall d3", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O d3', highlights: [H('d3')], say: "When White avoids the Marshall with the quiet d3, Black simply develops naturally and aims for the same Closed-Ruy themes. There's no need to force matters — Black has a sound, flexible position and the long game ahead, which is precisely how this repertoire likes it.", sayShort: 'vs d3 — develop, play the long game.' }),
    b({ id: 'd6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O d3 d6 c3 Na5 Bc2', arrows: [A('a5', 'b3')], highlights: [H('a5')], say: "The same Chigorin idea reappears: ...d6, then ...Na5 to swap off the powerful b3-bishop and ease the position. Black trades White's best attacker and gets a comfortable, solid game with chances to expand on either wing. Patient, sound, dangerous.", sayShort: 'Na5 — trade the strong bishop.' }),
  ],
};

const SCOTCH: LessonScript = {
  openingId: 'pro-carlsen-1e5', title: "vs Scotch d4", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf6', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6', arrows: [A('f6', 'e4')], highlights: [H('f6')], say: "Against the Scotch, Black hits the centre with ...Nf6, attacking e4 and forcing White to make a concrete decision. This is the most reliable, well-tested antidote — Black gets active piece play and equal chances without memorising oceans of theory.", sayShort: 'Nf6 — hit e4, the Scotch antidote.' }),
    b({ id: 'nd5', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5', highlights: [H('d5'), H('c6')], say: "After the knight trade and e5, Black's knight hops to the superb d5-outpost while the queen pressures the advanced e5-pawn. Black's doubled c-pawns control central squares and his pieces are active; the e5-pawn is more weakness than strength. Fully equal and full of life.", sayShort: 'Nd5 — strong outpost, target e5.' }),
  ],
};

const FOUR_KNIGHTS: LessonScript = {
  openingId: 'pro-carlsen-1e5', title: "vs Four Knights", minutes: 5, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb4', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4', arrows: [A('b4', 'c3')], highlights: [H('b4')], say: "The symmetrical Four Knights — Black mirrors with ...Bb4, pinning White's c3-knight just as his own is pinned. The symmetry is Black's friend here: equal development, equal chances, and a comfortable, well-understood structure where mistakes, not preparation, decide.", sayShort: 'Bb4 — mirror the pin.' }),
    b({ id: 'd6', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6', highlights: [H('d6'), H('e5')], say: "Both sides castle and play d3/...d6, reaching a solid, balanced Italian-style middlegame. Black has equalised comfortably and can play for a win in a long game by gradually improving his pieces. Risk-free, sound, and exactly the kind of position this repertoire outplays opponents in.", sayShort: 'd6 — comfortable equality.' }),
  ],
};

export const PRO_CARLSEN_1E5_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-1e5::vs Italian Bc4': ITALIAN,
  'pro-carlsen-1e5::Berlin ...Nf6': OPEN_BERLIN,
  'pro-carlsen-1e5::vs Anti-Marshall d3': ANTI_MARSHALL,
  'pro-carlsen-1e5::vs Scotch d4': SCOTCH,
  'pro-carlsen-1e5::vs Four Knights': FOUR_KNIGHTS,
};
