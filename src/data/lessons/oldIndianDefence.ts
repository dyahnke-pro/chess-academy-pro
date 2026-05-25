import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Old Indian Defence. Lead-the-eye §5a.
// Moves from repertoire.json (DB-anchored, G3); prose only.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['book:old-indian-defence', 'concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Old_Indian_Defense'];

export const OLD_INDIAN_DEFENCE_LESSON: LessonScript = {
  openingId: 'old-indian-defence',
  sources: SRC,
  title: 'Old Indian Defence — A Master Class',
  minutes: 12,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'd4 Nf6 c4 d6', say: "The Old Indian — the classical, restrained cousin of the King's Indian. Black plays …d6 and will follow with …e5, building a solid central foothold WITHOUT the …g6 fianchetto. The dark bishop goes to e7, not g7: less dynamic, but rock-solid and easy to handle.", sayShort: '…d6 — the solid, restrained Indian.', highlights: [H('d6')] }),
    b({ id: 'e5', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5', say: "…Nbd7 supports the key advance, and …e5 stakes a claim in the centre, challenging White's d4-pawn head-on. This is the heart of the Old Indian: a small but firm central presence the knight on d7 underpins.", sayShort: '…e5 — stake the centre.', arrows: [A('d7', 'e5')], highlights: [H('e5'), H('d4', SOFT)] }),
    b({ id: 'be7', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O', say: "Black develops the bishop modestly to …Be7 and castles. No fireworks — the Old Indian completes development behind the e5/d6 pawns and waits for White to commit, then chooses its plan based on how the centre resolves.", sayShort: '…Be7, …O-O — develop, stay solid.', highlights: [H('e7')] }),
    b({ id: 'nc5', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5 Nc5', say: "…c6 prepares to question the centre, and when White closes with d5, …Nc5! — the knight leaps to a superb outpost, attacking the e4-pawn and eyeing d3. With the centre locked, this knight becomes Black's best piece.", sayShort: '…Nc5 — the knight to its outpost.', arrows: [A('c5', 'e4')], highlights: [H('c5'), H('e4')] }),
    b({ id: 'a5', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5 Nc5 Qc2 a5 Be3 Qc7', say: "…a5! secures the c5-knight by taking the b4-square away from White's pawns, and …Qc7 connects the rooks. Black makes the outpost permanent — the knight on c5 can never be chased, a long-term positional trump.", sayShort: '…a5 — make the c5-outpost permanent.', highlights: [H('a5'), H('c5')] }),
    b({ id: 'close', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5 Nc5 Qc2 a5 Be3 Qc7 Nd2 Bd7 Rfc1 h6', say: "Black completes the set-up — …Bd7 develops the last minor piece, …h6 makes luft, and the maneuvering battle begins around the locked centre. There is the Old Indian in full: a solid, weakness-free position with a dominant knight on c5, where Black manoeuvres patiently for the …f5 or …b5 break. The other tabs show the Czech and Be2 systems.", sayShort: '…Bd7 — finish up, manoeuvre patiently.', highlights: [H('d7'), H('c5', SOFT)] }),
  ],
};
