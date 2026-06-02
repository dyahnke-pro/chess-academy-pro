import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Nimzo-Indian / Queen's Gambit Declined complex, BLACK.
// 605 games (online + OTB). His main answer to d4: a flexible ...Nf6 and ...e6
// that becomes the Nimzo if White plays Nc3, or a sound QGD otherwise. Main line
// = the QGD with ...Be7 vs the Bf4 system. Variations cover the Nimzo proper, the
// Queen's Indian, the Catalan and the Bogo-Indian.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence', 'https://www.chess.com/openings/Nimzo-Indian-Defense', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_NIMZO_LESSON: LessonScript = {
  openingId: 'pro-carlsen-nimzo',
  title: "This repertoire's Nimzo / QGD — Sound and Flexible vs d4",
  minutes: 12,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'qgd', moves: 'd4 Nf6 c4 e6 Nf3 d5', highlights: [H('d5'), H('e6')], say: "This repertoire's answer to d4 starts with the most reliable move-order in chess: ...Nf6 and ...e6. If White allows Nc3, Black plays the Nimzo; if not, ...d5 reaches a rock-solid Queen's Gambit Declined. This flexibility means Black is always comfortable, whatever White tries.", sayShort: 'Nf6, e6, d5 — flexible and solid.' }),
    b({ id: 'be7', moves: 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Be7 Bf4', highlights: [H('e7'), H('f4')], say: "Against the Bf4 system Black develops the bishop modestly to e7 — solid and unprovocative. The QGD's reputation is built on resilience: Black has no weaknesses, a sound pawn chain, and a clear plan to free the position with a timely ...c5 or ...dxc4. Patience first.", sayShort: 'Be7 — the solid QGD.' }),
    b({ id: 'oo', moves: 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Be7 Bf4 O-O e3 c5', arrows: [A('c5', 'd4')], highlights: [H('c5')], say: "Black castles and then strikes with ...c5 — the thematic freeing break. Challenging White's d4-pawn opens lines for Black's pieces and removes any cramp. This is the standard QGD recipe: develop soundly, then equalise cleanly with the central pawn break.", sayShort: 'c5 — the freeing break.' }),
    b({ id: 'bxc5', moves: 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5', highlights: [H('c5'), H('d5')], say: "After dxc5, Black recaptures with the bishop, which springs to an active diagonal. Black has fully equalised: active pieces, a sound structure, and the easy ...Nc6 and ...d4 ideas to look forward to. From this balanced, healthy middlegame, this repertoire simply outplays.", sayShort: 'Bxc5 — fully equal, active pieces.' }),
  ],
};

const NIMZO: LessonScript = {
  openingId: 'pro-carlsen-nimzo', title: "Nimzo-Indian Bb4", minutes: 7, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4', arrows: [A('b4', 'c3')], highlights: [H('b4')], say: "The Nimzo-Indian — when White plays Nc3, Black pins it with ...Bb4. The threat is real: trade the bishop for the knight, damage White's pawns, and dominate the dark squares and the e4-square. It's one of the most strategically rich, respected defences in all of chess.", sayShort: 'Bb4 — pin and pressure c3.' }),
    b({ id: 'd5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5', highlights: [H('d5'), H('c5')], say: "Against the Rubinstein e3 system, Black strikes the centre with ...d5 and ...c5, the classical counter. Black is ready to capture on c3 at the right moment, shattering White's queenside, or keep the tension and play on the structure. Rich, balanced, double-edged.", sayShort: 'd5, c5 — hit the centre.' }),
    b({ id: 'nc6', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6', highlights: [H('c6'), H('c5')], say: "Black completes development with ...Nc6, fully mobilised and pressing the centre. The whole battle hinges on the bishop on b4: if Black trades it for the knight, White gets the two bishops but doubled c-pawns; if Black keeps it, the pin nags forever. Pure strategy — This repertoire's home.", sayShort: 'Nc6 — mobilised, the pin nags.' }),
  ],
};

const QID: LessonScript = {
  openingId: 'pro-carlsen-nimzo', title: "Queen's Indian b6", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'b6', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6', arrows: [A('a6', 'c4')], highlights: [H('b6')], say: "When White avoids Nc3 with Nf3, Black plays the Queen's Indian — ...b6 and ...Ba6, immediately pressuring the c4-pawn. The light-squared bishop becomes an active piece on a6 rather than a passive one, fighting for the key central light squares from the flank.", sayShort: 'Ba6 — pressure c4 at once.' }),
    b({ id: 'bb4', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7', highlights: [H('e7')], say: "After ...Bb4+ and the trade-offer dance, Black retreats the bishop to e7 having provoked small concessions. The Queen's Indian is famously hard to crack: Black is solid, flexible, and controls the e4-square. White's space edge is real but harmless against accurate play.", sayShort: 'Be7 — solid and provocative.' }),
    b({ id: 'd5', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6 Bc3 d5', arrows: [A('d5', 'c4')], highlights: [H('d5')], say: "Black strikes the centre with ...c6 and ...d5, the modern equalising plan. The d5-pawn challenges c4 and stakes a claim in the centre, neutralising White's fianchettoed bishop. Black has reached a sound, equal middlegame with no weaknesses — a typical this repertoire springboard.", sayShort: 'd5 — challenge the centre.' }),
  ],
};

const CATALAN: LessonScript = {
  openingId: 'pro-carlsen-nimzo', title: "vs Catalan g3", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd5', moves: 'd4 Nf6 c4 e6 g3 d5', arrows: [A('d5', 'c4')], highlights: [H('d5')], say: "Against the Catalan's g3, Black meets it head-on with ...d5, challenging the c4-pawn before White's fianchettoed bishop gets going. The most principled approach: contest the centre directly and refuse to let White's long-diagonal bishop dominate uncontested.", sayShort: 'd5 — contest c4 directly.' }),
    b({ id: 'dxc4', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4', highlights: [H('c4')], say: "Black develops and then takes the pawn — ...dxc4, the Open Catalan. Grabbing the c4-pawn isn't about winning material; it's about gaining time. While White spends moves regaining it, Black completes development and frees his position with ...a6 and ...b5 or a quick ...c5.", sayShort: 'dxc4 — grab it, gain time.' }),
    b({ id: 'a6', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6', highlights: [H('a6'), H('b5')], say: "The clever ...a6 prepares ...b5, holding the extra pawn for one more move and grabbing queenside space. Black either keeps the pawn with tempo or returns it for a comfortable, free game. The Open Catalan is one of Black's safest, most respected equalisers — and this repertoire plays it both colours.", sayShort: 'a6 — prep b5, hold or free.' }),
  ],
};

const BOGO: LessonScript = {
  openingId: 'pro-carlsen-nimzo', title: "Bogo-Indian Bb4+", minutes: 5, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb4', moves: 'd4 Nf6 c4 e6 Nf3 Bb4+', arrows: [A('b4', 'd2')], highlights: [H('b4')], say: "The Bogo-Indian check — ...Bb4+ when White plays Nf3 instead of Nc3. It's a flexible, low-theory way to develop with tempo and provoke a small concession before Black commits to a structure. A practical, solid choice that sidesteps White's deepest preparation.", sayShort: 'Bb4+ — develop with tempo.' }),
    b({ id: 'be7', moves: 'd4 Nf6 c4 e6 Nf3 Bb4+ Nbd2 O-O a3 Be7 e4 d6', highlights: [H('e7'), H('d6')], say: "After White blocks with Nbd2 and plays a3, Black tucks the bishop to e7 and prepares a King's-Indian-style ...d6 and ...e5 break. Black has provoked White into committing pieces awkwardly and now plays for a rich middlegame. Solid setup, flexible plan.", sayShort: 'Be7, d6 — prep the e5 break.' }),
    b({ id: 'nbd7', moves: 'd4 Nf6 c4 e6 Nf3 Bb4+ Nbd2 O-O a3 Be7 e4 d6 Be2 Nbd7', highlights: [H('d7'), H('e5')], say: "Black completes with ...Nbd7, ready to play ...e5 and challenge White's big centre. The position resembles a comfortable King's Indian where Black has saved time by provoking a3 and Nbd2. A sound, manoeuvring middlegame with chances for both — This repertoire's preferred battleground.", sayShort: 'Nbd7 — ready for e5.' }),
  ],
};

export const PRO_CARLSEN_NIMZO_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-nimzo::Nimzo-Indian Bb4': NIMZO,
  'pro-carlsen-nimzo::Queen\'s Indian b6': QID,
  'pro-carlsen-nimzo::vs Catalan g3': CATALAN,
  'pro-carlsen-nimzo::Bogo-Indian Bb4+': BOGO,
};
