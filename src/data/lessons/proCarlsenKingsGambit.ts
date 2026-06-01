import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — King's Gambit, WHITE. 170 games (online + OTB), 74%. His
// romantic surprise weapon — sacrifice the f-pawn for a roaring lead in
// development and an open f-file at Black's king. Main line = the Kieseritzky.
// Variations cover the Falkbeer 2…d5, the Bishop's Gambit and the …Bc5 Declined.
// (A true gambit: White is down a pawn by design, banking on the attack.)

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/King%27s_Gambit', 'https://www.chess.com/openings/Kings-Gambit', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_KINGS_GAMBIT_LESSON: LessonScript = {
  openingId: 'pro-carlsen-kings-gambit',
  title: "Carlsen's King's Gambit — the Kieseritzky",
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'f4', moves: 'e4 e5 f4 exf4 Nf3', highlights: [H('f4'), H('f3')], say: "The King's Gambit — the most romantic opening in chess. White offers the f-pawn to rip open the f-file and seize a huge lead in development. Nf3 stops the …Qh4+ check and prepares to round up the f4-pawn later. Carlsen wheels this out to drag opponents into a street fight.", sayShort: 'f4 — the romantic gambit.' }),
    b({ id: 'g5', moves: 'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5', arrows: [A('e5', 'g4')], highlights: [H('e5'), H('g5')], say: "Black clings to the extra pawn with …g5, and White strikes with h4 to open the h-file, sending the knight to e5 — the Kieseritzky. The knight sits on a magnificent central outpost, eyeing f7 and g4, while the h-file opens toward Black's king. White is down a pawn but coming hard.", sayShort: 'Ne5 — the Kieseritzky outpost.' }),
    b({ id: 'd5', moves: 'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6', arrows: [A('c4', 'f7')], highlights: [H('c4'), H('d6')], say: "Black develops …Nf6 and hits back in the centre with …d5; White takes and develops the bishop to c4, aiming at f7. After …Bd6 attacking the e5-knight, the position is a wild, double-edged battlefield where White's development and attacking chances fully compensate the pawn. Pure calculation — Carlsen's home turf.", sayShort: 'Bc4 — aim at f7, full attack.' }),
  ],
};

const FALKBEER: LessonScript = {
  openingId: 'pro-carlsen-kings-gambit', title: 'Falkbeer 2…d5', minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd5', moves: 'e4 e5 f4 d5 exd5 exf4', highlights: [H('d5'), H('f4')], say: "The Falkbeer Counter-Gambit — Black declines to grab and instead strikes with …d5, returning the pawn for activity. White takes on d5 and Black recaptures the f4-pawn. White will round it up and emerge with a sound, slightly-better structure rather than a wild gambit.", sayShort: 'exd5 — meet the counter-gambit.' }),
    b({ id: 'bb5', moves: 'e4 e5 f4 d5 exd5 exf4 Nf3 Nf6 Bb5+ c6 dxc6 Nxc6', highlights: [H('c6'), H('f3')], say: "White develops with tempo — Bb5+ — and after …c6 grabs the pawn back via dxc6. The dust settles into a healthy, open position where White's lead in development and Black's loose f4-pawn give White comfortable, risk-light chances.", sayShort: 'Bb5+, dxc6 — grab it back, develop.' }),
  ],
};

const BISHOPS_GAMBIT: LessonScript = {
  openingId: 'pro-carlsen-kings-gambit', title: "Bishop's Gambit 3.Bc4", minutes: 5, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bc4', moves: 'e4 e5 f4 exf4 Bc4', arrows: [A('c4', 'f7')], highlights: [H('c4')], say: "The Bishop's Gambit — instead of Nf3, White develops the bishop to c4 straight away, aiming at f7 and inviting the …Qh4+ check, which only helps White develop with tempo after g3. A sharp, attacking alternative that keeps the f-file dream alive.", sayShort: 'Bc4 — aim at f7 at once.' }),
    b({ id: 'nf6', moves: 'e4 e5 f4 exf4 Bc4 Nf6 Nc3 c6 d4 d5 exd5 Bd6', highlights: [H('d4'), H('f4')], say: "Black develops …Nf6 and …c6 to blunt the bishop; White builds the big centre with Nc3 and d4. White has a massive pawn centre and a lead in development for the pawn — a classic gambit bargain that Carlsen is happy to calculate.", sayShort: 'Nc3, d4 — big centre for the pawn.' }),
  ],
};

const DECLINED: LessonScript = {
  openingId: 'pro-carlsen-kings-gambit', title: 'Declined …Bc5', minutes: 5, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bc5', moves: 'e4 e5 f4 Bc5 Nf3 d6 Nc3 Nf6', highlights: [H('c5'), H('f4')], say: "The King's Gambit Declined — Black ignores the pawn and develops …Bc5, taking aim at the sensitive f2-square and keeping the centre tense. White develops naturally with Nf3 and Nc3; the f4-pawn keeps Black's …d5 break in check and White retains a space edge.", sayShort: 'Nf3, Nc3 — develop, keep f4.' }),
    b({ id: 'na4', moves: 'e4 e5 f4 Bc5 Nf3 d6 Nc3 Nf6 Bc4 Nc6 d3', highlights: [H('c4'), H('d3')], say: "White completes development with Bc4 and d3, a solid King's-Gambit-Declined structure. White has more space and the half-open f-file after a later fxe5, with a pleasant, double-edged middlegame where his initiative on the kingside outweighs the slight loosening.", sayShort: 'Bc4, d3 — space and the f-file.' }),
  ],
};

export const PRO_CARLSEN_KINGS_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-kings-gambit::Falkbeer 2…d5': FALKBEER,
  "pro-carlsen-kings-gambit::Bishop's Gambit 3.Bc4": BISHOPS_GAMBIT,
  'pro-carlsen-kings-gambit::Declined …Bc5': DECLINED,
};
