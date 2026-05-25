import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Grünfeld Defence (Exchange main). Lead-the-
// eye §5a. Moves from repertoire.json (DB-anchored, G3); prose only.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-initiative', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'];

export const GRUNFELD_DEFENCE_LESSON: LessonScript = {
  openingId: 'grunfeld-defence',
  sources: SRC,
  title: 'Grünfeld Defence — A Master Class',
  minutes: 13,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 Nf6 c4 g6 Nc3 d5', say: "The Grünfeld — the boldest hypermodern defence. Where the King's Indian lets White build the centre slowly, the Grünfeld strikes it head-on with …d5! Black invites White to capture and erect a broad pawn centre, planning to bombard it with a kingside fianchetto and the …c5 break until it crumbles.", sayShort: '…d5 — strike the centre head-on.', highlights: [H('d5')] }),
    b({ id: 'bg7', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7', say: "cxd5 …Nxd5, then e4 kicks the knight and …Nxc3 bxc3 hands White a huge-looking centre on e4 and d4 — but with doubled c-pawns. …Bg7 takes its post on the long diagonal, glaring straight through to d4. That bishop is the whole point of the Grünfeld.", sayShort: '…Bg7 — the great diagonal, aim at d4.', arrows: [A('g7', 'd4')], highlights: [H('g7'), H('d4')] }),
    b({ id: 'c5', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5', say: "…c5! the thematic break, hitting the base of White's centre. Combined with the g7-bishop's pressure, it begins the demolition: the proud e4/d4 duo is now a target, not a strength.", sayShort: '…c5 — hit the base of the centre.', highlights: [H('c5'), H('d4')] }),
    b({ id: 'qa5', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5 Qd2 O-O', say: "…Qa5 develops with pressure on the c3-pawn and the queenside, and Black castles into safety. Every Black piece is being trained on White's centre and the weak doubled c-pawns — the strategic battle is joined.", sayShort: '…Qa5 — pressure c3, then castle.', highlights: [H('a5'), H('c3')] }),
    b({ id: 'cxd4', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5 Qd2 O-O Rc1 cxd4 cxd4 Nc6', say: "Rc1 defends; …cxd4 cxd4 isolates White's d-pawn, and …Nc6 piles a third attacker onto it. White is left with a lone d4-pawn that the g7-bishop, the c6-knight, and the rooks will hound for the rest of the game.", sayShort: '…Nc6 — a third attacker on the IQP.', arrows: [A('c6', 'd4')], highlights: [H('c6'), H('d4')] }),
    b({ id: 'trade', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5 Qd2 O-O Rc1 cxd4 cxd4 Nc6 Qxa5 Nxa5 Be2 b6', say: "Qxa5 …Nxa5 trades queens into a favourable endgame, and …b6 prepares …Bb7 to add the light bishop to the assault on the centre. With queens off, the isolated d4-pawn becomes a long-term endgame liability.", sayShort: '…b6 — prep …Bb7, hound the d4-pawn.', highlights: [H('b6'), H('d4', SOFT)] }),
    b({ id: 'close', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5 Qd2 O-O Rc1 cxd4 cxd4 Nc6 Qxa5 Nxa5 Be2 b6 Rc7 Bb7 Rxe7 Rfd8 O-O', say: "White grabs a pawn with Rc7xe7, but …Bb7 and …Rfd8 give Black a storm of activity — both bishops raking the long diagonals at e4 and d4, the rook on the open d-file, all pointed at White's centre and loose pieces. There is the Grünfeld bargain in full: White's centre and extra pawn against Black's roaring piece activity. The other tabs show the Russian System, the Bc4 Classical, and the modern Rb1 Exchange.", sayShort: '…Rfd8 — total activity for the pawn.', arrows: [A('b7', 'e4')], highlights: [H('b7'), H('d8')] }),
  ],
};
