import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Two Knights Defence. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// Deepest beat ≥20 plies. The sharp Ulvestad/Polerio/Traxler sidelines and the
// <20p 4.d3 line fold in (Ulvestad deferred pending soundness verification).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['book:two-knights-defence', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Two_Knights_Defense'];

export const TWO_KNIGHTS_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'two-knights-defence::Two Knights: Italian Two Knights d4': {
    openingId: 'two-knights-defence', title: 'Two Knights — The 4.d4 Italian', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'i1', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 e5 d5', say: "The 4.d4 line — White opens the centre and follows with e5, kicking the f6-knight and grabbing space. Black answers …d5! the key counter, returning the gambit pawn's tension to gain a free tempo and active piece play.", sayShort: '…d5 — the key central counter.', highlights: [H('d5'), H('e5', SOFT)] }),
      b({ id: 'i2', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 e5 d5 Bb5 Ne4 Nxd4 Bd7', say: "Bb5 pins, but …Ne4! plants the knight on the strong central square, and …Bd7 calmly breaks the pin and develops. Black's pieces find active posts while White's centre pawn on e5 becomes a target.", sayShort: '…Ne4 — knight to the strong centre.', highlights: [H('e4')] }),
      b({ id: 'i3', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5', say: "Bxc6 …bxc6 gives Black a strong central pawn mass and the half-open b-file; …Bc5 develops actively, hitting the d4-knight and the f2-point. The doubled c-pawns control key central squares — a feature, not a weakness, here.", sayShort: '…Bc5 — active bishop, central pawns.', highlights: [H('c5')] }),
      b({ id: 'i4', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5 Be3 O-O f3 Ng5 f4 Ne4 Nd2 Nxd2 Qxd2 Re8 Rae1', say: "Black castles, the knight dances …Ng5–e4 to provoke weaknesses, trades occur, and …Re8 takes the e-file against White's e5-pawn. There is the 4.d4 tabiya: a balanced, open middlegame where Black's bishop pair, central pawns and active pieces fully match White's space. The Italian's most direct try, neutralised.", sayShort: '…Re8 — press e5, fully balanced.', arrows: [A('e8', 'e5')], highlights: [H('e8'), H('e5')] }),
    ],
  },

  'two-knights-defence::Two Knights: Fried Liver Defence 5...Na5': {
    openingId: 'two-knights-defence', title: 'Two Knights — The …Na5 (vs the Fried Liver)', minutes: 11, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'fl1', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5', say: "When White lunges 4.Ng5 — threatening the brutal Fried Liver after a careless …Nxd5?? — Black must know the antidote cold: …d5 and then the precise …Na5! The knight hits the c4-bishop and sidesteps the trap entirely, accepting a gambit pawn for a big lead in development.", sayShort: '…Na5 — the antidote, hit the bishop.', arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4')] }),
      b({ id: 'fl2', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6', say: "Bb5+ …c6 dxc6 …bxc6 returns the pawn structure to Black's favour — a strong centre and open lines — and …h6 kicks the g5-knight back. Black has surrendered a pawn but gained a development lead and the bishop pair, the classic Two-Knights compensation.", sayShort: '…h6 — kick the knight, lead in development.', highlights: [H('h6'), H('c6')] }),
      b({ id: 'fl3', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6', say: "…e4! the pawn surges forward, gaining space and seizing the initiative, and …Bd6 develops while attacking the e5-knight. Black's lead in development translates directly into a dangerous, lasting attack.", sayShort: '…e4 — surge forward, seize the initiative.', highlights: [H('e4')] }),
      b({ id: 'fl4', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6 f4 exf3 Nxf3 O-O d4', say: "f4 …exf3 opens the f-file, and after Nxf3 Black castles with a raging initiative — every piece active, the white king exposed, full compensation for the pawn. There is the …Na5 tabiya: the famous Fried Liver sidestepped, and Black with a long-term, dangerous attack for the sacrificed pawn.", sayShort: '…O-O — castle into a raging attack.', highlights: [H('f3')] }),
    ],
  },

  'two-knights-defence::Two Knights: Max Lange Attack': {
    openingId: 'two-knights-defence', title: 'Two Knights — The Max Lange Attack', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'ml1', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4', say: "The Max Lange is one of the oldest and wildest attacks in chess — and the cleanest answer is to decline the maze entirely. Instead of the razor-sharp 5…Bc5 main line, Black grabs the pawn with …Nxe4: pocket the material and make White prove the gambit. The knight on e4 is the whole point of this safe antidote.", sayShort: '…Nxe4 — decline the maze, grab the pawn.', highlights: [H('e4')] }),
      b({ id: 'ml2', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5', say: "White pins the knight with Re1, the rook glaring down the open e-file at Black's uncastled king. The key equaliser is …d5! — one pawn move that blocks the file and hits the bishop on c4 at the same instant, killing the pin and gaining a tempo.", sayShort: '…d5 — kill the pin, hit the bishop.', highlights: [H('d5'), H('e1', SOFT), H('c4', SOFT)] }),
      b({ id: 'ml3', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3 Qd8', say: "White grabs on d5 and Black recaptures with the queen, which then has to step lively: White's knight had leapt to c3, simultaneously menacing the queen and the e4-knight, so the queen retreats calmly to d8. The dust settles with Black still holding the extra pawn and White scrambling to justify the gambit.", sayShort: '…Qd8 — step back, keep the pawn.', highlights: [H('c3'), H('d8', SOFT), H('e4', SOFT)] }),
      b({ id: 'ml4', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3 Qd8 Rxe4+ Be7 Nxd4 f5 Rf4 O-O', say: "White cashes in — Rxe4+ …Be7 Nxd4 regains the pawn and material is level — then Black finishes cleanly: …f5 kicks the rook to f4 and …O-O tucks the king away. There is the Max Lange tabiya: not a memorised tightrope but a dead-level middlegame, the dangerous attack completely defused with simple forcing moves and not a weakness in sight.", sayShort: '…f5, …O-O — equal, attack defused.', highlights: [H('f5'), H('f4', SOFT)] }),
    ],
  },
};
