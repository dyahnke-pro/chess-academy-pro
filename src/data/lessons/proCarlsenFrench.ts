import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — French Defence, BLACK. 317 games (online + OTB). A solid,
// counter-attacking answer to e4: Black builds a strong pawn chain and strikes
// at the centre with ...c5 and ...f6. Main line = the Classical/Steinitz with
// e5. Variations cover the Tarrasch, the Advance, the Exchange and the Winawer.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/French_Defence', 'https://www.chess.com/openings/French-Defense', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_FRENCH_LESSON: LessonScript = {
  openingId: 'pro-carlsen-french',
  title: "Carlsen's French — Counter-Attack with a Pawn Chain",
  minutes: 11,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'french', moves: 'e4 e6 d4 d5 Nc3 Nf6', arrows: [A('f6', 'e4')], highlights: [H('e6'), H('d5')], say: "The French Defence — ...e6 and ...d5, meeting the centre with a solid pawn chain. Black's one structural concession is the light-squared bishop, hemmed in behind the pawns; in exchange he gets a rock-solid, resilient position and clear counter-attacking plans. Against Nc3, ...Nf6 pressures e4 and asks the question.", sayShort: 'Nf6 — the French, pressure e4.' }),
    b({ id: 'e5', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5', arrows: [A('c5', 'd4')], highlights: [H('c5'), H('e5')], say: "White advances e5, gaining space and kicking the knight to d7. This is the Steinitz: White has a big centre, Black has the counterplay. Black immediately attacks the base of the chain with ...c5 — the thematic French break. Strike the pawn chain where it's anchored.", sayShort: 'c5 — hit the chain\'s base.' }),
    b({ id: 'nc6', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 a6', highlights: [H('c6'), H('a6')], say: "Black piles up on d4 with ...Nc6 and prepares queenside expansion with ...a6 and ...b5. The whole French strategy is here: pressure the d4-pawn, fight for the c-file, and break White's centre while he's busy on the kingside. Black's position is a coiled spring.", sayShort: 'Nc6, a6 — pressure d4, prep b5.' }),
    b({ id: 'b5', moves: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 a6 Qd2 b5', arrows: [A('b5', 'b4')], highlights: [H('b5')], say: "The queenside roller arrives — ...b5, gaining space and preparing ...b4 to chip away at White's defence of the d4-pawn. Black has a clear, attacking plan on the side of the board where he's strongest. The French is far from passive: it's a counter-attacking machine, and Carlsen plays it for the win.", sayShort: 'b5 — the queenside roller.' }),
  ],
};

const TARRASCH: LessonScript = {
  openingId: 'pro-carlsen-french', title: "vs Tarrasch Nd2", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c5', moves: 'e4 e6 d4 d5 Nd2 c5', arrows: [A('c5', 'd4')], highlights: [H('c5')], say: "Against the Tarrasch, where White plays the modest Nd2 to keep the c-file flexible, Black strikes immediately with ...c5. Because the knight on d2 is passive, this open-game approach gives Black easy, active development and full equality. Hit the centre while White's pieces are tangled.", sayShort: 'c5 — punish the passive Nd2.' }),
    b({ id: 'nc6', moves: 'e4 e6 d4 d5 Nd2 c5 Ngf3 cxd4 Nxd4 Nc6', arrows: [A('c6', 'd4')], highlights: [H('c6')], say: "After the central trades, Black develops with tempo — ...Nc6 hits the knight on d4 and accelerates Black's pieces into the game. This open Tarrasch is one of the most comfortable lines in the whole French: Black's bishops get active and the position is fully equal.", sayShort: 'Nc6 — develop with tempo.' }),
    b({ id: 'bd3', moves: 'e4 e6 d4 d5 Nd2 c5 Ngf3 cxd4 Nxd4 Nc6 Bb5 Bd7 Nxc6 bxc6 Bd3', highlights: [H('c6'), H('d5')], say: "The pieces come off and Black is left with a sound structure and the open b-file for his rook. Black's so-called bad bishop is freed by the open position, and the half-open files give real counterplay. A balanced, healthy middlegame where Carlsen's technique tips the scales.", sayShort: 'Sound structure, open b-file.' }),
  ],
};

const ADVANCE: LessonScript = {
  openingId: 'pro-carlsen-french', title: "vs Advance e5", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c5', moves: 'e4 e6 d4 d5 e5 c5', arrows: [A('c5', 'd4')], highlights: [H('c5'), H('e5')], say: "The Advance Variation — White grabs maximum space with e5, locking the centre. Black knows the antidote by heart: ...c5, attacking the base of the pawn chain on d4. In a locked French structure, you always strike the chain at its root, and that root is d4.", sayShort: 'c5 — attack the chain\'s base.' }),
    b({ id: 'nc6', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Bd7 Be2 cxd4 cxd4 Nge7', arrows: [A('e7', 'f5')], highlights: [H('c6'), H('e7')], say: "Black builds the pressure: ...Nc6 on d4, ...Bd7 to develop the problem bishop toward the queenside, and the clever ...Nge7 routing the knight to f5 where it hits d4 and the kingside. Every piece targets White's centre. The French bishop even finds a future via ...Bb5 or the queenside.", sayShort: 'Nge7 — reroute toward f5.' }),
    b({ id: 'nf5', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Bd7 Be2 cxd4 cxd4 Nge7 Na3 Nf5', arrows: [A('f5', 'd4')], highlights: [H('f5'), H('d4')], say: "The knight lands on f5, a dream square: it attacks the d4-pawn and the dark squares around White's king, and it can never be easily chased. Black has achieved everything the French dreams of — pressure on d4, active pieces, and a clear plan. White's space means nothing if the centre falls.", sayShort: 'Nf5 — the dream square, hit d4.' }),
  ],
};

const EXCHANGE: LessonScript = {
  openingId: 'pro-carlsen-french', title: "vs Exchange", minutes: 5, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'exd5', moves: 'e4 e6 d4 d5 exd5 exd5', highlights: [H('d5')], say: "The Exchange Variation has a drawish reputation, but Carlsen welcomes it — the symmetry just means the better player wins. With the centre opened, Black's problem bishop is suddenly free, and Black develops actively to play for a full point rather than accept the handshake.", sayShort: 'exd5 — symmetry, play for more.' }),
    b({ id: 'bd6', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Bd6 c4 Nf6 Nc3 O-O', arrows: [A('d6', 'h2')], highlights: [H('d6')], say: "Black develops the bishop to its active diagonal with ...Bd6, aiming at White's kingside, and castles. When White plays the isolating c4, Black gets a rich game against the resulting structure. Far from a dead draw — Black has all the pieces active and real winning chances in a long game.", sayShort: 'Bd6 — active bishop, play on.' }),
  ],
};

const WINAWER: LessonScript = {
  openingId: 'pro-carlsen-french', title: "Winawer Bb4", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb4', moves: 'e4 e6 d4 d5 Nc3 Bb4', arrows: [A('b4', 'c3')], highlights: [H('b4')], say: "The Winawer — instead of ...Nf6, Black pins the c3-knight with ...Bb4, the sharpest French of all. Black is happy to trade this bishop for the knight to shatter White's queenside pawns and grab the dark squares. It's a razor-edged, deeply strategic battle of structure versus the bishop pair.", sayShort: 'Bb4 — the sharp Winawer pin.' }),
    b({ id: 'bxc3', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Nc6 Nf3 Qa5', highlights: [H('c3'), H('c5')], say: "Black takes on c3, doubling and weakening White's queenside pawns, then attacks the centre with ...c5 and ...Nc6. Black gives up the bishop pair for a permanent structural target on c3 and complete control of the dark squares. The resulting imbalance is one of the richest in all of chess — Carlsen's strategic playground.", sayShort: 'Bxc3 — shatter the queenside.' }),
  ],
};

export const PRO_CARLSEN_FRENCH_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-french::vs Tarrasch Nd2': TARRASCH,
  'pro-carlsen-french::vs Advance e5': ADVANCE,
  'pro-carlsen-french::vs Exchange': EXCHANGE,
  'pro-carlsen-french::Winawer Bb4': WINAWER,
};
