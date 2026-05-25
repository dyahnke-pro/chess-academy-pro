import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the King's Indian Defence (Classical Mar del
// Plata). Lead-the-eye §5a. Moves from repertoire.json (DB-anchored, G3); prose
// only.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'];

export const KINGS_INDIAN_DEFENCE_LESSON: LessonScript = {
  openingId: 'kings-indian-defence',
  sources: SRC,
  title: "King's Indian Defence — A Master Class",
  minutes: 13,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 Nf6 c4 g6 Nc3 Bg7', say: "The King's Indian — the great hypermodern fighting defence. Black hands White a free pawn centre and fianchettoes the bishop to g7, planning to attack that centre rather than occupy it. The g7-bishop on the long diagonal is Black's pride and the soul of the whole opening.", sayShort: '…Bg7 — fianchetto, attack the centre later.', highlights: [H('g7')] }),
    b({ id: 'e5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5', say: "White erects the broad e4/d4 centre and Black invites it — …d6, castle, and then the thematic …e5, striking at d4 and staking Black's own claim to the centre. The battle lines are drawn: White's space against Black's counterpunch.", sayShort: '…e5 — strike at the d4-centre.', highlights: [H('e5'), H('d4')] }),
    b({ id: 'ne7', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7', say: "After …Nc6 White locks the centre with d5, and the knight reroutes …Ne7 — heading not toward the queenside but to g6 and f5, where Black's attack will fall. With the centre closed, the game becomes a race of pawn storms on opposite wings.", sayShort: '…Ne7 — reroute toward the kingside.', arrows: [A('e7', 'g6')], highlights: [H('e7'), H('d5', SOFT)] }),
    b({ id: 'f5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5', say: "White redeploys Ne1 toward the queenside; Black uncorks …f5! The kingside pawn storm — the defining King's Indian plan. Black throws the f-pawn forward to pry open lines straight at the white king while White's pieces are busy on the other wing.", sayShort: '…f5 — launch the kingside storm.', highlights: [H('f5')] }),
    b({ id: 'f4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5 f3 f4', say: "…f4! the pawn jabs forward, gaining space and locking the kingside structure. The g7-bishop's diagonal is closed for now, but that pawn is the spearhead of the attack — next comes …g5–g4 to rip open the white king's cover.", sayShort: '…f4 — spearhead the king-hunt.', highlights: [H('f4')] }),
    b({ id: 'g5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5 f3 f4 Bf2 g5', say: "…g5, and the avalanche rolls. The whole kingside pawn mass marches at the white king, with …g4 and the rook lift to come. This is the King's Indian dream: White may be winning the queenside race on paper, but Black is playing for mate.", sayShort: '…g5 — the avalanche rolls at the king.', highlights: [H('g5'), H('g4', SOFT)] }),
    b({ id: 'storm', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Be3 f5 f3 f4 Bf2 g5 Nd3 Nf6 c5 Ng6', say: "White breaks with c5 on the queenside; Black ignores it and brings the pieces to the attack — …Nf6 and …Ng6 head for h4 and f4, the squares around the white king. There is the Mar del Plata in full: two storms racing in opposite directions, and Black's is aimed at the king. The other tabs show the Bayonet, the Sämisch, the Four Pawns, and the Fianchetto.", sayShort: '…Ng6 — pieces join the king-hunt.', arrows: [A('g6', 'f4')], highlights: [H('g6'), H('f4')] }),
  ],
};
