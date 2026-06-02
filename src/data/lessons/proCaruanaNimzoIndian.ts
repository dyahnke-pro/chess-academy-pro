import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Nimzo-Indian MAIN Watch lesson. Student = BLACK. Spine is his
// real data line (caruana-nimzo-indian-classical-oo), tree-extended to a 20-ply
// middlegame. Board-accurate, two registers, G9.4 voice. His method: pin with
// Bb4, trade on c3 to double White's pawns, then win the bishop pair with the
// ...g5/...Ne4 break.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pawn-minority-attack', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence', 'https://www.chess.com/openings/Nimzo-Indian-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

export const PRO_CARUANA_NIMZO_INDIAN_LESSON: LessonScript = {
  openingId: 'pro-caruana-nimzo-indian',
  title: "This repertoire's Nimzo-Indian",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'bb4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4', say: "The Nimzo-Indian — This repertoire's principled answer to d4. The bishop pins the c3-knight, and behind it Black fights for the centre with pieces rather than pawns. One of the soundest defences in chess.", sayShort: '…Bb4 — pin the knight.', arrows: [A('f8', 'b4')], highlights: [H('b4')] }),
    b({ id: 'qc2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O', say: "White chooses the Classical Qc2, defending the knight and preparing to recapture on c3 with the queen — keeping the pawn structure intact for now. Black calmly castles and completes his kingside.", sayShort: '…O-O — castle, stay flexible.', highlights: [H('g8')] }),
    b({ id: 'bxc3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d6', say: "After a3 questions the bishop, Black trades it for the knight; White recaptures with the queen. Black plays d6, building a small centre. The bishop pair is given up for clear strategic targets to come.", sayShort: '…Bxc3, …d6 — trade and build.', arrows: [A('b4', 'c3')], highlights: [H('c3')] }),
    b({ id: 'bg5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d6 Bg5 h6 Bh4', say: "White pins with Bg5; Black puts the question with h6 and White keeps the pin with Bh4. The bishop is now committed to the h4-d8 diagonal, where Black can target it with a pawn advance.", sayShort: '…h6 — question the bishop.', highlights: [H('h6')] }),
    b({ id: 'g5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d6 Bg5 h6 Bh4 g5 Bg3 Ne4', say: "Black strikes with g5, kicking the bishop to g3, then leaps the knight into e4 — hitting the g3-bishop and the queen. A bold central thrust that grabs the initiative and forces White to part with the dark-squared bishop.", sayShort: '…g5, …Ne4 — grab the initiative.', arrows: [A('f6', 'e4')], highlights: [H('e4')] }),
    b({ id: 'mid', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d6 Bg5 h6 Bh4 g5 Bg3 Ne4 Qc2 Nxg3', say: "White retreats the queen and Black captures the g3-bishop with the knight. Black has traded his pieces to leave White with shattered, doubled pawns and no good bishop — the Nimzo strategy fulfilled: structural damage and a comfortable game.", sayShort: '…Nxg3 — win the bishop pair.', arrows: [A('e4', 'g3')], highlights: [H('g3')] }),
  ],
};
