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
      b({ id: 'ml1', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Bc5 e5 d5', say: "The Max Lange — one of the oldest and wildest attacks in chess. White castles and pushes e5; Black must react precisely with …d5! the freeing break, returning material's worth of complications for piece activity. A line you survive by knowing the theory, not by improvising.", sayShort: '…d5 — the precise freeing break.', highlights: [H('d5'), H('e5', SOFT)] }),
      b({ id: 'ml2', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Bc5 e5 d5 exf6 dxc4 Re1+ Be6', say: "exf6 …dxc4 grabs the bishop, and after Re1+ …Be6! blocks the check with the bishop — the only move, holding everything together. Black is up material with a sound blockade against White's initiative.", sayShort: '…Be6 — the only move, block and hold.', highlights: [H('e6'), H('c4', SOFT)] }),
      b({ id: 'ml3', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Bc5 e5 d5 exf6 dxc4 Re1+ Be6 Ng5 Qd5 Nc3 Qf5', say: "Ng5 attacks the e6-bishop, but …Qd5! defends it and centralises the queen; after Nc3 …Qf5 the queen finds a safe, active square. Black threads the needle through White's threats, keeping the extra material.", sayShort: '…Qf5 — defend and centralise.', highlights: [H('d5'), H('f5')] }),
      b({ id: 'ml4', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Bc5 e5 d5 exf6 dxc4 Re1+ Be6 Ng5 Qd5 Nc3 Qf5 Nce4 Bf8 g4 Qg6', say: "Nce4 and g4 throw everything at the queen, but …Bf8 tucks the bishop to safety and …Qg6 sidesteps the pawn. The storm spends itself, and Black emerges from the forced sequence with the extra piece and a defensible king. There is the Max Lange tabiya: navigated precisely, White's romantic attack runs out of fuel and Black stands better.", sayShort: '…Qg6 — sidestep, the attack burns out.', highlights: [H('g6')] }),
    ],
  },
};
