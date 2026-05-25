import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Nimzo-Indian Defence. Lead-the-eye §5a:
// GREEN arrows (non-pawn origin, clear sight-line, named endpoint), YELLOW
// highlights (named key square), SOFT BLUE (secondary). DB-anchored ≥20p.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const NIMZO_INDIAN_LESSON: LessonScript = {
  openingId: 'nimzo-indian',
  sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
  title: 'The Nimzo-Indian Defence — A Master Class',
  minutes: 12,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 Nf6 c4 e6 Nc3 Bb4', say: "The Nimzo-Indian — Aron Nimzowitsch's hypermodern masterpiece, and one of Black's most respected answers to 1.d4. With 3…Bb4 Black pins the c3-knight, the piece defending the e4-square. Instead of occupying the centre, Black controls it from afar and threatens to damage White's structure by trading the bishop for the knight. Control over conquest — the hypermodern creed.", sayShort: '…Bb4 — pin the knight, fight for e4.', arrows: [A('b4', 'c3')], highlights: [H('c3'), H('e4', SOFT)] }),
    b({ id: 'qc2-oo', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O', say: "4.Qc2 — the Classical, the most popular line. White protects the knight and prepares to recapture on c3 with the queen, avoiding the doubled pawns that define the other variations. Black castles, develops, and bides his time: the bishop will trade on c3 at the right moment, and Black plays for control of e4 and the light squares.", sayShort: 'O-O — castle, keep the …Bxc3 idea ready.', highlights: [H('c3', SOFT)] }),
    b({ id: 'bxc3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5', say: "a3 questions the bishop, and Black takes — …Bxc3+ Qxc3. Black gives up the bishop pair, but for a real prize: White's grip on e4 is loosened and Black gets a clear plan. Then …d5 strikes the centre at once, the principled follow-up that opens the position for Black's pieces.", sayShort: '…Bxc3+, …d5 — trade, then strike the centre.', highlights: [H('d5'), H('e4', SOFT)] }),
    b({ id: 'dxc4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5 Nf3 dxc4 Qxc4 b6', say: "Nf3 develops; Black clarifies with …dxc4 Qxc4 and then …b6, preparing to fianchetto the light bishop. The plan is taking shape: Black will plant the bishop on a6 to pressure White's queenside and the c4-square, exploiting the position's open lines.", sayShort: '…b6 — prepare the light-bishop fianchetto.', highlights: [H('b6')] }),
    b({ id: 'ba6', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5 Nf3 dxc4 Qxc4 b6 Bg5 Ba6', say: "Bg5 pins the knight, but Black has …Ba6! — the light bishop swings out with tempo, attacking the white queen on c4 down the a6-f1 diagonal. White's queen must move, and Black gains time while activating his last piece. This is the Nimzo's positional precision.", sayShort: '…Ba6 — hit the queen, activate the bishop.', arrows: [A('a6', 'c4')], highlights: [H('c4')] }),
    b({ id: 'c5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5 Nf3 dxc4 Qxc4 b6 Bg5 Ba6 Qa4 c5 dxc5 bxc5', say: "Qa4 retreats, and Black breaks with …c5! After dxc5 bxc5 the position opens fully. Black has the half-open b-file, active bishops, and pressure all over White's slightly loose queenside. The bishop pair White won is offset by Black's superior activity and structure.", sayShort: '…c5 — break open, activate everything.', highlights: [H('c5')] }),
    b({ id: 'close', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5 Nf3 dxc4 Qxc4 b6 Bg5 Ba6 Qa4 c5 dxc5 bxc5 Rc1 Qb6 Bxf6 gxf6 Rc2 Rd8 e3 Bxf1 Rxf1 Nd7 Ke2 Rab8 Rd1 Ne5', say: "The game flows into a comfortable endgame: Black trades the light bishops, doubles rooks on the open b- and d-files, and centralises the knight to e5 — a dominant square. There is the Classical Nimzo: Black surrendered the bishop pair but holds the better structure, the open files, and the more active pieces. That is the Nimzo's bargain — trade the bishop, take the squares and the files, and outplay from there. The other tabs show White's other tries: the Rubinstein and Hübner e3 lines, the sharp Leningrad and 4.f3, the Sämisch doubled-pawn battle, and Kasparov's 4.Nf3.", sayShort: '…Ne5 — the active Nimzo endgame edge.', highlights: [H('e5')] }),
  ],
};
