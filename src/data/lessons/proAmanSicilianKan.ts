import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Sicilian Kan / Taimanov (...e6), BLACK.
// His crown jewel: the most-played line in his entire 35,738-game corpus
// (2006 games matching, 74.8%). Spine = the Open Kan with ...a6/...Qc7/...Bd3
// walked to a real middlegame (move 10, ...b5 queenside expansion underway).
// Voice: data/sources/chessbrah-voice/per-opening/sicilian-kan.md.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:chess-fundamentals',
  'concept:pos-development',
  'https://www.chess.com/openings/Sicilian-Defense-Kan-Variation',
  'https://en.wikipedia.org/wiki/Sicilian_Defence,_Kan_Variation',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_SICILIAN_KAN_LESSON: LessonScript = {
  openingId: 'pro-aman-sicilian-kan',
  title: "Aman's Sicilian Kan — Flexible by Design",
  minutes: 11,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'c5', moves: 'e4 c5', highlights: [H('c5'), H('d4')],
      say: "The Sicilian — Aman's number-one weapon, the most-played line in his whole library. …c5 stakes a claim on d4 and fights for the centre asymmetrically, the fighting answer to e4.",
      sayShort: '…c5 — the fighting Sicilian.' }),
    b({ id: 'e6', moves: 'e4 c5 Nf3 e6', highlights: [H('e6'), H('a6')],
      say: "…e6 is the Kan and Taimanov move order — quiet, flexible, low-theory. It keeps the choice open between …a6 and …Nc6, and it builds a small, solid pawn shell instead of committing early. This is Aman's habit: get a sound structure, then outplay.",
      sayShort: '…e6 — flexible Kan setup.' }),
    b({ id: 'a6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6', highlights: [H('d6'), H('a6'), H('b5')],
      say: "After the centre trade, here's the Kan's signature: …a6. It does two jobs — it slams the door on Nb5, so White gets no knight hop into d6 or b5, and it clears the way for …b5, the queenside expansion that powers Black's whole plan.",
      sayShort: '…a6 — stop Nb5, prep …b5.' }),
    b({ id: 'qc7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7', arrows: [A('d8', 'c7')], highlights: [H('c7'), H('e5'), H('b5')],
      say: "…Qc7 is the Bastrikov setup. The queen eyes the e5-square and sits on the half-open c-file, quietly discouraging White's e5 break and supporting the coming …b5 and …Bb7. Natural, useful, no commitment yet.",
      sayShort: '…Qc7 — eye e5, back …b5.' }),
    b({ id: 'nf6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nf6', arrows: [A('g8', 'f6')], highlights: [H('e4')],
      say: "White develops the bishop to d3; Black answers …Nf6, hitting the e4-pawn and forcing White to attend to the centre before launching anything. Develop with a purpose — every move asks a question.",
      sayShort: '…Nf6 — hit e4, develop.' }),
    b({ id: 'd6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nf6 O-O d6', highlights: [H('d6'), H('e5')],
      say: "Both sides castle and Black plays …d6 — the small-centre Scheveningen shell. It controls e5, takes the sting out of any e4-e5 push, and gives the pieces a stable home. Solid first; the expansion comes next.",
      sayShort: '…d6 — control e5, solid shell.' }),
    b({ id: 'nbd7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nf6 O-O d6 f4 Nbd7', arrows: [A('b8', 'd7')], highlights: [H('d7'), H('b5'), H('e5')],
      say: "White grabs kingside space with f4, signalling a pawn-storm plan. Black stays unfazed with …Nbd7 — flexible development that keeps the knight ready to reroute and supports the …b5 and …e5 breaks. This is the classic opposite-wings picture.",
      sayShort: '…Nbd7 — flexible, ready to break.' }),
    b({ id: 'middlegame', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nf6 O-O d6 f4 Nbd7 Kh1 b5', highlights: [H('b5'), H('b7'), H('b4')],
      say: "White tucks the king with Kh1 and Black strikes: …b5! The queenside expansion is the whole point of …a6 and …Qc7 — Black pushes where Black is strong, ready to follow with …Bb7 on the long diagonal and …b4 to kick the c3-knight. White races on the kingside, Black races on the queenside. A rich, double-edged middlegame where Black is fully in the fight.",
      sayShort: '…b5 — expand, race the queenside.' }),
  ],
};
