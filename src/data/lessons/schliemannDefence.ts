import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Schliemann Defence (Jänisch Gambit) vs the
// Ruy Lopez. Lead-the-eye §5a. Moves from repertoire.json (DB-anchored, G3);
// prose only. Sharp gambit lines → `kind: 'roadmap'` (depth-gate opt-out).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Schliemann_Defense'];

export const SCHLIEMANN_DEFENCE_LESSON: LessonScript = {
  openingId: 'schliemann-defence',
  sources: SRC,
  title: 'Schliemann Defence — A Master Class',
  minutes: 10,
  orientation: 'black',
  kind: 'roadmap',
  beats: [
    b({ id: 'open', moves: 'e4 e5 Nf3 Nc6 Bb5 f5', say: "The Schliemann — also called the Jänisch Gambit — is Black's most aggressive reply to the Ruy Lopez: 3…f5!? Rather than the slow main lines, Black strikes at the e4-pawn at once, throwing the f-pawn forward to blow the position open and seize the initiative. A genuine fighting weapon for the player who wants a sharp battle, not a quiet game.", sayShort: '…f5 — strike e4, open the fight.', highlights: [H('f5'), H('e4')] }),
    b({ id: 'nc3', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 Nc3 fxe4 Nxe4 d5', say: "Against the main 4.Nc3, …fxe4 opens the f-file and 5.Nxe4 invites the key central thrust …d5! The pawn hits the e4-knight with tempo and stakes a big claim in the centre. This thrust is the heart of the Classical Schliemann — gaining time while opening lines.", sayShort: '…d5 — hit the knight, claim the centre.', highlights: [H('d5'), H('e4')] }),
    b({ id: 'dxe4', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 Nc3 fxe4 Nxe4 d5 Nxe5 dxe4', say: "Nxe5 grabs a pawn, but …dxe4 wins the knight back, and the position blows wide open with pawns and pieces flying. Black has surrendered structure for a roaring open game where the initiative and the f-file are the trumps.", sayShort: '…dxe4 — win the knight back, open lines.', highlights: [H('e4')] }),
    b({ id: 'qg5', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 Nc3 fxe4 Nxe4 d5 Nxe5 dxe4 Nxc6 Qg5', say: "Nxc6 wins a piece for the moment — but …Qg5! is the point: the queen springs out, hitting the loose g2-pawn and the rook behind it, and threatening to round up the c6-knight with …bxc6. Black's initiative more than answers the brief material deficit.", sayShort: '…Qg5 — threaten …Qxg2, regain material.', arrows: [A('g5', 'g2')], highlights: [H('g5'), H('g2')] }),
    b({ id: 'qe2', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 Nc3 fxe4 Nxe4 d5 Nxe5 dxe4 Nxc6 Qg5 Qe2 Nf6', say: "White holds everything together with Qe2 — guarding g2 and eyeing the loose e4-pawn. Black answers in kind: …Nf6 develops the last knight with tempo, planting it where it shields the e4-pawn and covers the d5- and g4-squares. Both armies finish mobilising before the position ignites.", sayShort: '…Nf6 — develop, guard the e4-pawn.', arrows: [A('f6', 'e4')], highlights: [H('f6'), H('e4')] }),
    b({ id: 'f4', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 Nc3 fxe4 Nxe4 d5 Nxe5 dxe4 Nxc6 Qg5 Qe2 Nf6 f4 Qxf4', say: "f4 lunges at the queen, hoping to win time — but …Qxf4! is the cool reply. Black pockets the pawn and the queen stays planted deep in White's camp, raking the now half-open f-file toward the f2-square right beside White's uncastled king. The pawn grab cost White nothing but trouble.", sayShort: '…Qxf4 — grab the pawn, stay active.', arrows: [A('f4', 'f2')], highlights: [H('f4'), H('f2')] }),
    b({ id: 'ne5', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 Nc3 fxe4 Nxe4 d5 Nxe5 dxe4 Nxc6 Qg5 Qe2 Nf6 f4 Qxf4 Ne5+ c6', say: "Now the trick that saves the knight: Ne5+ leaps it away with a discovered check — uncovering the b5-bishop's aim straight down the diagonal at the e8-king. Black blocks coolly with …c6, which strikes the b5-bishop in the same breath. There's the Classical Schliemann tabiya: a sharp, double-edged battle where Black's active queen and wide-open lines give real play for the structural imbalance. With best play White keeps a small edge — Black plays this for the fight, not for dead equality. The other tabs show the Schönemann 4.d4, the Jänisch-Accepted 4.exf5, and the solid Dyckhoff 4.d3.", sayShort: '…c6 — block the check, hit the bishop.', arrows: [A('b5', 'c6')], highlights: [H('c6'), H('e8'), H('e5')] }),
  ],
};
