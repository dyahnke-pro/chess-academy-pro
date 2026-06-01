import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Modern Defence, BLACK. 535 games (online + OTB), 77%.
// The ultimate flexible system: …g6 and …Bg7, cede the centre, then chip at it
// with …d6, …a6/…b5 and a timely …c5 or …e5. Main line = the …a6/…b5 Modern.
// Variations cover the Classical Nf3, the …c6/…d5 set-up and the Austrian f4.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Modern_Defense', 'https://www.chess.com/openings/Modern-Defense', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_MODERN_LESSON: LessonScript = {
  openingId: 'pro-carlsen-modern',
  title: "Carlsen's Modern — Fianchetto and Counterpunch",
  minutes: 11,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'g6', moves: 'e4 g6 d4 Bg7 Nc3 d6', arrows: [A('g7', 'a1')], highlights: [H('g7'), H('d6')], say: "The Modern — Black fianchettoes the bishop to g7 and cedes the centre, planning to undermine it later. It's hypermodern and supremely flexible: no early commitments, the g7-bishop rakes the long diagonal, and Black keeps every counter-break in reserve. A favourite Carlsen surprise.", sayShort: 'Bg7 — fianchetto, cede the centre.' }),
    b({ id: 'a6', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6', highlights: [H('a6')], say: "The modern treatment — …a6, preparing …b5 to expand on the queenside and challenge White's setup. Black avoids the old passive lines and plays actively, gaining space on the wing where White can't easily respond. Flexible and aggressive at once.", sayShort: 'a6 — prep the …b5 expansion.' }),
    b({ id: 'b5', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 f4 b5 Nf3 Nd7', arrows: [A('b5', 'b4')], highlights: [H('b5'), H('d7')], say: "Black grabs queenside space with …b5 and develops the knight to d7, supporting the …c5 and …e5 breaks. White builds a big centre with f4; Black's whole plan is to let it advance and then blow it up from the flanks. The g7-bishop waits patiently for the centre to open.", sayShort: 'b5, Nd7 — space and central breaks.' }),
    b({ id: 'bb7', moves: 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 f4 b5 Nf3 Nd7 Bd3 Bb7', arrows: [A('b7', 'e4')], highlights: [H('b7')], say: "…Bb7 puts the second bishop on the long diagonal, doubling the pressure on e4 and the centre. Black is fully mobilised with both bishops raking White's position, ready to strike with …c5 or …e5. The Modern has done its job: a rich, double-edged middlegame with all the counterplay.", sayShort: 'Bb7 — both bishops, hit the centre.' }),
  ],
};

const CLASSICAL_NF3: LessonScript = {
  openingId: 'pro-carlsen-modern', title: 'Classical Nf3', minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf3', moves: 'e4 g6 d4 Bg7 Nf3 d6 Bd3 Nf6', arrows: [A('f6', 'e4')], highlights: [H('f6')], say: "Against the calm Nf3 and Bd3, Black develops …d6 and …Nf6, hitting e4 and transposing toward Pirc-style structures. Black's setup is solid and well-known; he completes development and waits for the right central break.", sayShort: 'Nf6 — hit e4, solid setup.' }),
    b({ id: 'e5', moves: 'e4 g6 d4 Bg7 Nf3 d6 Bd3 Nf6 O-O O-O Re1 e5', arrows: [A('e5', 'd4')], highlights: [H('e5')], say: "Both sides castle and Black strikes the centre with …e5 — the principled Pirc/Modern break. The g7-bishop comes alive if the centre opens, and Black has a comfortable, fully-developed game with clear plans on both wings.", sayShort: 'e5 — the central break, bishop wakes.' }),
  ],
};

const C6_D5: LessonScript = {
  openingId: 'pro-carlsen-modern', title: 'vs Nc3 with …c6/…d5', minutes: 5, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c6', moves: 'e4 g6 d4 Bg7 Nc3 c6', highlights: [H('c6')], say: "The flexible …c6, the Gurgenidze-style Modern. Black prepares …d5 in one go, challenging White's centre directly rather than from behind. It's a cunning move-order that sidesteps the sharpest anti-Modern systems.", sayShort: 'c6 — prepare …d5 directly.' }),
    b({ id: 'd5', moves: 'e4 g6 d4 Bg7 Nc3 c6 Nf3 d5 h3 Nf6', arrows: [A('d5', 'e4')], highlights: [H('d5'), H('f6')], say: "…d5 hits e4 head-on. Black resolves the central tension early and gets a sound, French-Caro-flavoured structure with the bishop already developed on g7 — the best of both worlds. Comfortable, solid, and theory-light.", sayShort: 'd5 — strike the centre, comfy.' }),
  ],
};

const AUSTRIAN: LessonScript = {
  openingId: 'pro-carlsen-modern', title: 'vs Austrian f4', minutes: 5, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'f4', moves: 'e4 g6 d4 Bg7 Nc3 d6 f4 Nf6', arrows: [A('f6', 'e4')], highlights: [H('f6'), H('f4')], say: "The aggressive Austrian Attack — White grabs the centre with f4, dreaming of e5 and a kingside storm. Black develops …Nf6 to pressure e4 and prepares to counter in the centre. The bigger White's centre, the bigger the target.", sayShort: 'Nf6 — meet the Austrian, hit e4.' }),
    b({ id: 'c5', moves: 'e4 g6 d4 Bg7 Nc3 d6 f4 Nf6 Nf3 c5', arrows: [A('c5', 'd4')], highlights: [H('c5')], say: "Black strikes at the base of the centre with …c5, the thematic Austrian counter. If White pushes past or trades, the position opens for the g7-bishop and Black's pieces flood in. This is the Modern's whole philosophy: invite the centre, then detonate it.", sayShort: 'c5 — detonate the big centre.' }),
  ],
};

export const PRO_CARLSEN_MODERN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-modern::Classical Nf3': CLASSICAL_NF3,
  'pro-carlsen-modern::vs Nc3 with …c6/…d5': C6_D5,
  'pro-carlsen-modern::vs Austrian f4': AUSTRIAN,
};
