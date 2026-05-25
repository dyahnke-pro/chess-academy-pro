import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Queen's Gambit Accepted. Lead-the-eye §5a.
// Moves from repertoire.json (DB-anchored, G3); prose only. The main lesson
// follows the sound calm tabiya (…b5/…Bb7/…c5) and stops before White's sharp
// piece sacrifice (a separate concrete line, not the teaching backbone).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-development', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'];

export const QGA_LESSON: LessonScript = {
  openingId: 'qga',
  sources: SRC,
  title: "Queen's Gambit Accepted — A Master Class",
  minutes: 12,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 d5 c4 dxc4', say: "The Queen's Gambit Accepted — Black takes the pawn on c4. The point is not to cling to it: it is to remove White's c-pawn from the centre, gain a free hand to develop, and play with a clear conscience against a slightly loosened white centre. Take, then develop — never grovel to hold the extra pawn.", sayShort: '…dxc4 — take, then develop freely.', highlights: [H('c4')] }),
    b({ id: 'e6', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6', say: "Nf3 and e3 prepare to recapture on c4; Black develops …Nf6 and …e6, opening the f8-bishop and keeping a sound, classical structure. No attempt to defend the pawn with …b5 yet — pieces first.", sayShort: '…e6 — develop, open the bishop.', highlights: [H('e6')] }),
    b({ id: 'c5', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5', say: "Bxc4 regains the pawn, and Black strikes at once with …c5! — the defining QGA break, challenging White's d4-pawn and refusing to let White settle into a big centre. The fight is for the centre from move one.", sayShort: '…c5 — strike d4, fight for the centre.', highlights: [H('c5'), H('d4')] }),
    b({ id: 'b5', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5', say: "Castling done, Black expands on the queenside with …a6 and …b5, gaining space and kicking the c4-bishop back. This thrust is the QGA's trademark — Black grabs territory on the wing and clears b7 for the bishop.", sayShort: '…b5 — queenside space, hit the bishop.', highlights: [H('a6'), H('b5')] }),
    b({ id: 'bb7', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7', say: "Bb3 retreats, and …Bb7 fianchettoes onto the great diagonal, the bishop staring straight down at e4 and White's centre. Black's pieces are coming alive while White still has to justify the broad pawn front.", sayShort: '…Bb7 — long diagonal, aim at e4.', arrows: [A('b7', 'e4')], highlights: [H('b7'), H('e4')] }),
    b({ id: 'develop', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Be7', say: "Black completes development naturally — …Nbd7 supporting the centre and eyeing e5, …Be7 ready behind the lines. Every piece has a job, the king is safe, and the queenside space gives Black a comfortable, active game.", sayShort: '…Be7 — finish developing, fully active.', arrows: [A('d7', 'e5')], highlights: [H('e5', SOFT)] }),
    b({ id: 'center', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Be7 e4 cxd4 Nxd4', say: "White finally pushes e4 to claim the centre; Black trades …cxd4 Nxd4 and is fully mobilised, the b7-bishop and the queenside majority giving real counterplay against White's centre. There is the QGA tabiya — equal, active, and double-edged. The other tabs show the Smyslov …a6, the Sadler …Bg4, and the Janowski dxc5 lines.", sayShort: '…cxd4 — equal, active counterplay.', highlights: [H('e4'), H('d4')] }),
  ],
};
