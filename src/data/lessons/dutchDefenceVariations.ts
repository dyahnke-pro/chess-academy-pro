import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Dutch Defence. Lead-the-eye §5a.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const DUTCH_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'dutch-defence::Stonewall d5 e6 Bd6': {
    openingId: 'dutch-defence', title: 'Dutch — The Stonewall', minutes: 11, orientation: 'black',
    beats: [
      b({ id: 's1', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5', say: "The Stonewall — Black builds an immovable pawn wall on d5, e6 and f5. It looks committal, but it is rock-solid and deeply strategic: the wall clamps the e4-square and hands Black a permanent kingside attacking structure. Carlsen himself wields the Stonewall as a winning weapon.", sayShort: '…d5 — build the Stonewall wall.', highlights: [H('d5'), H('f5', SOFT)] }),
      b({ id: 's2', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6', say: "…Bd6 — the key Stonewall bishop. Rather than a passive piece behind the wall, it points straight at h2 and the white king, the spearhead of the coming kingside attack. The Stonewall's whole point is this bishop plus a knight landing on e4.", sayShort: '…Bd6 — aim the bishop at h2.', highlights: [H('h2', SOFT), H('d6')] }),
      b({ id: 's3', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6 c4 c6 b3 Qe7 Bb2 b6 Nbd2 Bb7', say: "…c6 cements the wall, …Qe7 connects the rooks, and …b6/…Bb7 solves the one Stonewall problem — the light-squared bishop — by fianchettoing it. Now every black piece has a job and the structure is complete: solid behind, menacing in front.", sayShort: '…Bb7 — solve the bad bishop, fianchetto.', highlights: [H('c6')] }),
      b({ id: 's4', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6 c4 c6 b3 Qe7 Bb2 b6 Nbd2 Bb7 Ne5 O-O Ndf3 Nbd7 Nd3 Ne4', say: "…Ne4! The eternal Stonewall knight lands on its dream outpost, supported by the f5-pawn and impossible to dislodge. From e4 it dominates the centre and supports the kingside attack, eyeing g3 and the squares around White's king. There is the Stonewall tabiya: the wall, the d6-bishop and the e4-knight all trained on White's king — a fortress that attacks.", sayShort: '…Ne4 — the eternal outpost knight.', arrows: [A('e4', 'g3')], highlights: [H('e4')] }),
    ],
  },

  'dutch-defence::Classical Be7 Line': {
    openingId: 'dutch-defence', title: 'Dutch — The Classical (…Be7)', minutes: 10, orientation: 'black',
    beats: [
      b({ id: 'c1', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7', say: "The Classical Dutch — the most flexible system. Black develops …e6 and …Be7, keeping options open between a later Stonewall with …d5 or a central …d6 and …e5 break. Solid and adaptable, it sidesteps the sharpest theory while keeping the Dutch's attacking spirit.", sayShort: '…Be7 — the flexible Classical setup.', highlights: [H('e6')] }),
      b({ id: 'c2', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5', say: "Both castle and Black plays …d5, choosing a Stonewall-like structure but with the bishop comfortably on e7. The f5-pawn controls e4, and Black has a sound, harmonious position with the familiar kingside-attacking potential.", sayShort: '…d5 — clamp e4, sound structure.', highlights: [H('d5'), H('e4', SOFT)] }),
      b({ id: 'c3', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5 b3 c6 Bb2 Nbd7 Nbd2 Ne4', say: "…c6 supports the centre, …Nbd7 develops, and …Ne4 plants the knight on the great outpost. As in the Stonewall, the e4-knight is the heart of Black's game — central, secure, eyeing g3 and the kingside.", sayShort: '…Ne4 — the central outpost knight.', arrows: [A('e4', 'g3')], highlights: [H('e4')] }),
      b({ id: 'c4', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5 b3 c6 Bb2 Nbd7 Nbd2 Ne4 Nxe4 fxe4', say: "Nxe4 fxe4! — Black recaptures with the f-pawn, gaining a cramping pawn on e4 and opening the f-file for the rook. The e4-pawn restricts White's pieces while the f-file points at f2. There is the Classical tabiya: a sound structure that has morphed into a kingside attacking position.", sayShort: '…fxe4 — cramping pawn, open f-file.', highlights: [H('e4')] }),
    ],
  },

  'dutch-defence::Ilyin-Zhenevsky System': {
    openingId: 'dutch-defence', title: 'Dutch — The Ilyin-Zhenevsky', minutes: 10, orientation: 'black',
    beats: [
      b({ id: 'i1', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5', say: "The Ilyin-Zhenevsky — a Classical Dutch combining the solid …e6/…Be7/…d5 structure with active piece play and the trademark …Qe8 manoeuvre. Named after the Soviet pioneer, it is a fighting, flexible way to play the Dutch without the rigid Stonewall.", sayShort: '…d5 — the Classical base.', highlights: [H('d5')] }),
      b({ id: 'i2', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5 Nc3 c6 Qc2 Qe8', say: "…c6 supports the centre, then …Qe8 — the Ilyin-Zhenevsky signature. The queen reroutes toward the kingside (h5 or g6) to fuel an attack and clears d8 for a rook. It is the same idea as the Leningrad's …Qe8, here in the solid Classical structure.", sayShort: '…Qe8 — reroute the queen for the attack.', highlights: [H('e8'), H('h5', SOFT)] }),
      b({ id: 'i3', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5 Nc3 c6 Qc2 Qe8 Rb1 a5', say: "White prepares queenside expansion with Rb1, and Black stakes out the queenside too with …a5, gaining space and slowing White's b4. Black fights on both wings — the kingside with the queen and f-pawn, the queenside with the pawns.", sayShort: '…a5 — grab queenside space, slow b4.', highlights: [H('a5')] }),
      b({ id: 'i4', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5 Nc3 c6 Qc2 Qe8 Rb1 a5 a3 b5 cxb5 cxb5', say: "…b5! Black breaks on the queenside, and after cxb5 cxb5 the c-file opens and Black has active play across the board. There is the Ilyin-Zhenevsky tabiya: the solid Classical structure, the queen rerouted for the kingside attack, and queenside counterplay rolling — a rich, double-edged Dutch.", sayShort: '…b5 — open the queenside, play everywhere.', highlights: [H('b5')] }),
    ],
  },

  'dutch-defence::Leningrad e5 Break': {
    openingId: 'dutch-defence', title: 'Dutch — The Leningrad …e5 Break', minutes: 10, orientation: 'black',
    beats: [
      b({ id: 'e1', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6', say: "A Leningrad where Black prepares the other central break. Instead of …Qe8 and a kingside storm, Black plays …c6 to support a quick …e5, striking the centre directly. It is the most classical, principled Leningrad plan — meet White's space with a central counterstrike.", sayShort: '…c6 — prepare the …e5 central break.', highlights: [H('c6'), H('e5', SOFT)] }),
      b({ id: 'e2', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6 d5 e5', say: "d5 grabs space, and Black strikes with …e5! — the thematic break. Black challenges the centre head-on, opening lines for the g7-bishop and freeing the position exactly where White just committed pawns. The Leningrad's central counterpunch.", sayShort: '…e5 — the central counterstrike.', highlights: [H('e5')] }),
      b({ id: 'e3', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6 d5 e5 dxe6 Bxe6', say: "dxe6 Bxe6 — Black recaptures with the bishop, developing it actively to e6 where it eyes c4 and the queenside. The centre has opened, the g7-bishop's diagonal is clear, and Black has free, active piece play with no weaknesses.", sayShort: '…Bxe6 — recapture active, open the centre.', highlights: [H('e6')] }),
      b({ id: 'e4', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6 d5 e5 dxe6 Bxe6 b3 Na6 Ng5 Bc8', say: "b3 Na6 and Ng5 hits the e6-bishop, but Black calmly retreats …Bc8, keeping the structure intact and eyeing a redeploy to f5 or g4. There is the …e5-break tabiya: an open, equal centre with the fianchettoed bishop active and easy development — the classical, low-risk way to play the Leningrad.", sayShort: '…Bc8 — regroup, keep the open-centre game.', highlights: [H('c8')] }),
    ],
  },
};
