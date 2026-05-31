import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Scotch Gambit variation lessons (white). Data spines (sc__haxo-bc5 / london-bb4
// / main-nf6, masters/strong corpus, G3). Each reaches a sound ≥20-ply position
// (engine ≥ +0.0 white). Keyed `${openingId}::${variationName}` matching
// gambits.json. Board claims verified against the line.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'];

export const SCOTCH_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'scotch-gambit::Bc5 Defence (4…Bc5)': {
    openingId: 'scotch-gambit', sources: SRC, title: 'Scotch Gambit — Bc5 Defence', minutes: 9, orientation: 'white',
    beats: [
      b({ id: 'b1', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3', say: "Black develops the bishop to c5 and White plays c3 — offering to build the big centre with a later d4 recapture rather than rushing. Classical Scotch Gambit handling.", sayShort: 'c3 — prepare the broad centre.', highlights: [H('c3'), H('c5')] }),
      b({ id: 'b2', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3 Nf6 e5 d5', say: "…Nf6 hits e4, so e5! drives it back and grabs space; …d5 hits the bishop in return. The centre locks into a sharp pawn race typical of the Max Lange family.", sayShort: 'e5 — gain space, sharpen.', highlights: [H('e5'), H('d5')] }),
      b({ id: 'b3', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3 Nf6 e5 d5 Bb5 Ne4 cxd4 Bb6', say: "Bb5 pins the c6-knight, cxd4 recaptures the gambit pawn and builds a broad centre, and …Bb6 tucks the bishop away. Material is level and White owns the centre.", sayShort: 'cxd4 — regain the pawn, big centre.', highlights: [H('b5'), H('d4'), H('e5')] }),
      b({ id: 'b4', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3 Nf6 e5 d5 Bb5 Ne4 cxd4 Bb6 Nc3 O-O Be3 Bg4 h3 Bh5', say: "Nc3 challenges the e4-knight, Be3 reinforces the d4-e5 chain, and both sides finish developing. White is fully equal with the broad pawn centre and easy piece play — a healthy game from the gambit.", sayShort: 'Be3 — shore the centre, equal.', highlights: [H('d4'), H('e5'), H('e3')] }),
    ],
  },
  'scotch-gambit::Bb4+ Check (4…Bb4+)': {
    openingId: 'scotch-gambit', sources: SRC, title: 'Scotch Gambit — Bb4+ Check', minutes: 9, orientation: 'white',
    beats: [
      b({ id: 'c1', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bb4+ c3', say: "…Bb4+ is a check that looks like it wins time — but c3! invites Black to grab a second pawn, and after …dxc3 White's development explodes forward. A trap-flavoured line where greed is punished.", sayShort: 'c3 — invite the greedy capture.', highlights: [H('c3'), H('b4')] }),
      b({ id: 'c2', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bb4+ c3 dxc3 O-O Nf6 e5 d5', say: "…dxc3 takes, and O-O! ignores the pawns entirely — White is two pawns down with a colossal lead in development. e5 kicks the knight and the attack rolls.", sayShort: 'O-O — ignore the pawns, develop.', highlights: [H('e5')] }),
      b({ id: 'c3', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bb4+ c3 dxc3 O-O Nf6 e5 d5 exf6 dxc4 fxg7 Rg8', say: "exf6! and fxg7 rip open Black's kingside; …dxc4 and …Rg8 try to hold the extra material, but Black's king has no shelter and his pieces are undeveloped.", sayShort: 'fxg7 — tear open the king.', highlights: [H('g7'), H('g8')] }),
      b({ id: 'c4', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bb4+ c3 dxc3 O-O Nf6 e5 d5 exf6 dxc4 fxg7 Rg8 Qe2+ Be6 bxc3 Bd6', say: "Qe2+ develops with check, …Be6 blocks, and after bxc3 White has a raging attack down the e-file and the long diagonals — the engine reads White close to winning. Greed for the gambit pawns left Black's king fatally exposed.", sayShort: 'Qe2+ — develop with check, near winning.', arrows: [A('e2', 'e6')], highlights: [H('e2'), H('e6')] }),
    ],
  },
  'scotch-gambit::Sharp f3 Centre (…Nf6)': {
    openingId: 'scotch-gambit', sources: SRC, title: 'Scotch Gambit — Sharp f3 Centre', minutes: 9, orientation: 'white',
    beats: [
      b({ id: 'f1', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4', say: "The 4…Nf6 main: e5 kicks the knight, …d5 hits the bishop, Bb5 pins, and Nxd4 regains the pawn with a centralised knight. Level material, White with the e5 wedge.", sayShort: 'Nxd4 — regain, centralise.', highlights: [H('d4'), H('e5')] }),
      b({ id: 'f2', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5', say: "…Bd7 unpins, White trades on c6 to hand Black doubled c-pawns, castles, and meets …Bc5 — the bishop eyeing the d4-knight.", sayShort: 'Bxc6 — doubled c-pawns for Black.', highlights: [H('c6'), H('c7')] }),
      b({ id: 'f3', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5 f3', say: "f3! — the sharp choice, kicking the e4-knight and preparing to build a broad f3-e5 pawn front. White plays for space and a kingside clamp rather than the quiet Be3.", sayShort: 'f3 — kick the knight, clamp.', arrows: [A('f3', 'e4')], highlights: [H('f3'), H('e4')] }),
      b({ id: 'f4', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5 f3 Ng5 f4 Ne4', say: "…Ng5 retreats, f4 grabs more space, and …Ne4 hops back to the outpost. The position is balanced and double-edged — White's big pawn front and the e5-wedge against Black's bishop pair. A fighting game, fully sound for White.", sayShort: 'f4 — big pawn front, balanced.', highlights: [H('e5'), H('f4'), H('e4')] }),
    ],
  },
};
