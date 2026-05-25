import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Two Knights Defence. Lead-the-eye §5a.
// Moves from repertoire.json (DB-anchored, G3); prose only.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['book:two-knights-defence', 'concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Two_Knights_Defense'];

export const TWO_KNIGHTS_DEFENCE_LESSON: LessonScript = {
  openingId: 'two-knights-defence',
  sources: SRC,
  title: 'Two Knights Defence — A Master Class',
  minutes: 13,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6', say: "The Two Knights — Black's most combative answer to the Italian. Instead of the passive …Bc5, Black plays …Nf6, counterattacking the e4-pawn at once and inviting White to choose between the quiet 4.d3 and the aggressive 4.Ng5. Either way, Black gets a fighting game with chances for both sides.", sayShort: '…Nf6 — counterattack e4, fight.', arrows: [A('f6', 'e4')], highlights: [H('e4')] }),
    b({ id: 'd3', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O', say: "Against the quiet 4.d3 — the modern main line — Black develops solidly with …Be7 and castles. This transposes to a Ruy-Lopez-flavoured manoeuvring game where Black has a sound, flexible position and clear plans on the queenside.", sayShort: '…Be7, …O-O — solid vs the quiet d3.', highlights: [H('e7', SOFT)] }),
    b({ id: 'na5', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3 Na5', say: "…d6 supports e5, and …Na5! — the thematic Italian/Ruy manoeuvre — hits the strong c4-bishop, White's most dangerous attacker. Removing or deflecting that bishop is a key strategic goal in these slow Italian structures.", sayShort: '…Na5 — hit the c4-bishop.', arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4')] }),
    b({ id: 'b5', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3 Na5 Bb5 a6 Ba4 b5 Bc2 c5', say: "Bb5 a6 Ba4 …b5 chases the bishop back to c2, and …c5 grabs queenside space — pure Ruy-Lopez Chigorin geometry. Black gains room on the wing and prepares to expand while White's light bishop is pushed to a passive square.", sayShort: '…c5 — queenside space, Chigorin-style.', highlights: [H('b5'), H('c5')] }),
    b({ id: 'develop', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3 Na5 Bb5 a6 Ba4 b5 Bc2 c5 Nbd2 Nc6 Nf1 Re8', say: "…Nc6 returns the knight to its best square and …Re8 supports the centre, while White reroutes Nbd2–f1–g3. Both sides manoeuvre behind the lines in true Italian/Ruy fashion — the position is balanced, rich, and full of plans for Black.", sayShort: '…Re8 — regroup, support the centre.', highlights: [H('c6'), H('e8')] }),
    b({ id: 'close', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3 Na5 Bb5 a6 Ba4 b5 Bc2 c5 Nbd2 Nc6 Nf1 Re8 h3 h6 Ng3 Be6 d4 cxd4 cxd4', say: "…Be6 develops the last piece, and when White breaks with d4, …cxd4 cxd4 resolves the centre into a balanced, open middlegame where Black's pieces are fully coordinated. There is the quiet Two Knights in full: a sound, double-edged Ruy-style fight where Black has every bit as many chances as White. The other tabs show the sharp 4.d4 Italian, the famous Fried Liver, the Max Lange, and the Ulvestad.", sayShort: '…cxd4 — balanced, fully coordinated.', highlights: [H('d4'), H('e6', SOFT)] }),
  ],
};
