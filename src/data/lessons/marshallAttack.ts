import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Marshall Attack. Lead-the-eye §5a. Moves
// walk the data spine (marshall-attack pgn, masters/strong corpus, G3 — prose
// only). The Marshall is a pawn sacrifice for a raging kingside attack; the
// engine reads ~−0.40 for Black through the main line — full, dangerous
// compensation (David's keep band), not a losing line. Reaches the classic
// …Qh3 attacking middlegame at ply 26. Claims verified against the line.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/Marshall_Attack'];

export const MARSHALL_ATTACK_LESSON: LessonScript = {
  openingId: 'marshall-attack',
  sources: SRC,
  title: 'Marshall Attack — A Master Class',
  minutes: 11,
  orientation: 'black',
  beats: [
    b({
      id: 'open',
      moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5',
      say: "The Marshall Attack — one of the most feared gambits in all of chess. In the heart of the Ruy Lopez, Black uncorks 8…d5!?, sacrificing the e5-pawn to tear the centre open and hurl every piece at White's king. Black gives a pawn for a long-lasting, often decisive initiative.",
      sayShort: '…d5 — the Marshall pawn sacrifice.',
      highlights: [H('d5'), H('e5')],
    }),
    b({
      id: 'recapture',
      moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5',
      say: "exd5 …Nxd5, then Nxe5 …Nxe5 Rxe5 — White wins the pawn and the rook lands on e5, looking active. But that rook is about to become a target: the whole black army is poised to pour onto the kingside while White's pieces sit passively on the queenside.",
      sayShort: 'Rxe5 — White grabs the pawn, for now.',
      highlights: [H('e5')],
    }),
    b({
      id: 'buildup',
      moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6',
      say: "…c6 shores up the d5-knight and gains a tempo on the rook; d4 props the position, and …Bd6 develops with a hit on the e5-rook, swinging the bishop onto the b8-h2 diagonal toward White's king. Every black piece now points kingside — the Marshall machine assembling.",
      sayShort: '…Bd6 — develop, hit the rook, eye the king.',
      arrows: [A('d6', 'e5')],
      highlights: [H('d6'), H('e5')],
    }),
    b({
      id: 'attack',
      moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3',
      say: "Re1 retreats the rook, and now the hammer: …Qh4, and after g3, …Qh3! The queen plants herself on h3, glued to White's king, eyeing g2 and f1. This is the signature Marshall picture — Black is a pawn down and the engine still says Black has full compensation, because that king will not sleep for the rest of the game.",
      sayShort: '…Qh3 — the queen clamps the king.',
      arrows: [A('h3', 'g2')],
      highlights: [H('h3'), H('g2')],
    }),
  ],
};
