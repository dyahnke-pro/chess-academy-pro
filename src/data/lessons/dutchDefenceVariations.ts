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
  'dutch-defence::Hopton Attack Response': {
    openingId: 'dutch-defence', title: 'Dutch — The Leningrad System', minutes: 10, orientation: 'black',
    sources: ['book:dutch-defence', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
    beats: [
      b({ id: 'dh1', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O', say: "The Leningrad Dutch — Black's most aggressive answer to 1.d4. The …f5 pawn stakes out the kingside light squares and fights for e4, while the …Bg7 fianchetto adds King's-Indian punch on the long diagonal. Both sides castle, and Black is set up for a real fight, not a passive defence.", sayShort: '…f5, …Bg7 — the fighting Leningrad set-up.', highlights: [H('g7', KEY), H('f5', SOFT)] }),
      b({ id: 'dh2', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6 d5 e5', say: "White grabs space with c4, and Black supports the centre with …d6 and …c6 before striking with the thematic …e5 break. That advance is the heart of the Leningrad — it opens lines for the g7-bishop and the f5-pawn and seizes central space of Black's own.", sayShort: '…e5 — the thematic Leningrad break.', highlights: [H('e5', KEY), H('c6', SOFT)] }),
      b({ id: 'dh3', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6 d5 e5 dxe6 Bxe6 b3 Na6 Bb2 Nc5', say: "White takes en passant, and Black recaptures …Bxe6, developing the light bishop to an active post; then the knight swings …Na6-c5 to a powerful central square, eyeing White's queenside pawns. There is the Leningrad tabiya: active pieces on e6 and c5, the half-open f-file for the rook, and the dynamic, double-edged counterplay the opening is built for. It scores 50% against masters.", sayShort: '…Bxe6, …Nc5 — active pieces, half-open f-file.', highlights: [H('e6', KEY), H('c5', SOFT)] }),
    ],
  },
  'dutch-defence::Stonewall d5 e6 Bd6': {
    openingId: 'dutch-defence', title: 'Dutch — The Stonewall', minutes: 11, orientation: 'black',
    sources: ['book:dutch-defence', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
    beats: [
      b({ id: 's1', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5', say: "The Stonewall — Black builds an immovable pawn wall on d5, e6 and f5. It looks committal, but it is rock-solid and deeply strategic: the wall clamps the e4-square and hands Black a permanent kingside attacking structure. Carlsen himself wields the Stonewall as a winning weapon.", sayShort: '…d5 — build the Stonewall wall.', highlights: [H('d5'), H('f5', SOFT)] }),
      b({ id: 's2', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6', say: "…Bd6 — the key Stonewall bishop. Rather than a passive piece behind the wall, it points straight at h2 and the white king, the spearhead of the coming kingside attack. The Stonewall's whole point is this bishop plus a knight landing on e4.", sayShort: '…Bd6 — aim the bishop at h2.', highlights: [H('h2', SOFT), H('d6')] }),
      b({ id: 's3', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6 c4 c6 b3 Qe7 Bb2 b6 Nbd2 Bb7', say: "…c6 cements the wall, …Qe7 connects the rooks, and …b6/…Bb7 solves the one Stonewall problem — the light-squared bishop — by fianchettoing it. Now every black piece has a job and the structure is complete: solid behind, menacing in front.", sayShort: '…Bb7 — solve the bad bishop, fianchetto.', highlights: [H('c6')] }),
      b({ id: 's4', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6 c4 c6 b3 Qe7 Bb2 b6 Nbd2 Bb7 Ne5 O-O Ndf3 Nbd7 Nd3 Ne4', say: "…Ne4! The eternal Stonewall knight lands on its dream outpost, supported by the f5-pawn and impossible to dislodge. From e4 it dominates the centre and supports the kingside attack, eyeing g3 and the squares around White's king. There is the Stonewall tabiya: the wall, the d6-bishop and the e4-knight all trained on White's king — a fortress that attacks.", sayShort: '…Ne4 — the eternal outpost knight.', arrows: [A('e4', 'g3')], highlights: [H('e4')] }),
    ],
  },

  'dutch-defence::Classical Be7 Line': {
    openingId: 'dutch-defence', title: 'Dutch — The Classical (…Be7)', minutes: 10, orientation: 'black',
    sources: ['book:dutch-defence', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
    beats: [
      b({ id: 'c1', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7', say: "The Classical Dutch — the most flexible system. Black develops …e6 and …Be7, keeping options open between a later Stonewall with …d5 or a central …d6 and …e5 break. Solid and adaptable, it sidesteps the sharpest theory while keeping the Dutch's attacking spirit.", sayShort: '…Be7 — the flexible Classical setup.', highlights: [H('e6')] }),
      b({ id: 'c2', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5', say: "Both castle and Black plays …d5, choosing a Stonewall-like structure but with the bishop comfortably on e7. The f5-pawn controls e4, and Black has a sound, harmonious position with the familiar kingside-attacking potential.", sayShort: '…d5 — clamp e4, sound structure.', highlights: [H('d5'), H('e4', SOFT)] }),
      b({ id: 'c3', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5 b3 c6 Bb2 Nbd7 Nbd2 Ne4', say: "…c6 supports the centre, …Nbd7 develops, and …Ne4 plants the knight on the great outpost. As in the Stonewall, the e4-knight is the heart of Black's game — central, secure, eyeing g3 and the kingside.", sayShort: '…Ne4 — the central outpost knight.', arrows: [A('e4', 'g3')], highlights: [H('e4')] }),
      b({ id: 'c4', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5 b3 c6 Bb2 Nbd7 Nbd2 Ne4 Nxe4 fxe4', say: "Nxe4 fxe4! — Black recaptures with the f-pawn, gaining a cramping pawn on e4 and opening the f-file for the rook. The e4-pawn restricts White's pieces while the f-file points at f2. There is the Classical tabiya: a sound structure that has morphed into a kingside attacking position.", sayShort: '…fxe4 — cramping pawn, open f-file.', highlights: [H('e4')] }),
    ],
  },

  'dutch-defence::Ilyin-Zhenevsky System': {
    openingId: 'dutch-defence', title: 'Dutch — The Ilyin-Zhenevsky', minutes: 10, orientation: 'black',
    sources: ['book:dutch-defence', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
    beats: [
      b({ id: 'i1', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5', say: "The Ilyin-Zhenevsky — a Classical Dutch combining the solid …e6/…Be7/…d5 structure with active piece play and the trademark …Qe8 manoeuvre. Named after the Soviet pioneer, it is a fighting, flexible way to play the Dutch without the rigid Stonewall.", sayShort: '…d5 — the Classical base.', highlights: [H('d5')] }),
      b({ id: 'i2', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5 Nc3 c6 Qc2 Qe8', say: "…c6 supports the centre, then …Qe8 — the Ilyin-Zhenevsky signature. The queen reroutes toward the kingside (h5 or g6) to fuel an attack and clears d8 for a rook. It is the same idea as the Leningrad's …Qe8, here in the solid Classical structure.", sayShort: '…Qe8 — reroute the queen for the attack.', highlights: [H('e8'), H('h5', SOFT)] }),
      b({ id: 'i3', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5 Nc3 c6 Qc2 Qe8 Rb1 a5', say: "White prepares queenside expansion with Rb1, and Black stakes out the queenside too with …a5, gaining space and slowing White's b4. Black fights on both wings — the kingside with the queen and f-pawn, the queenside with the pawns.", sayShort: '…a5 — grab queenside space, slow b4.', highlights: [H('a5')] }),
      b({ id: 'i4', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d5 Nc3 c6 Qc2 Qe8 Rb1 a5 a3 b5 cxb5 cxb5', say: "…b5! Black breaks on the queenside, and after cxb5 cxb5 the c-file opens and Black has active play across the board. There is the Ilyin-Zhenevsky tabiya: the solid Classical structure, the queen rerouted for the kingside attack, and queenside counterplay rolling — a rich, double-edged Dutch.", sayShort: '…b5 — open the queenside, play everywhere.', highlights: [H('b5')] }),
    ],
  },

  'dutch-defence::Leningrad e5 Break': {
    openingId: 'dutch-defence', title: 'Dutch — The Leningrad …e5 Break', minutes: 10, orientation: 'black',
    sources: ['book:dutch-defence', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
    beats: [
      b({ id: 'e1', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6', say: "A Leningrad where Black prepares the other central break. Instead of …Qe8 and a kingside storm, Black plays …c6 to support a quick …e5, striking the centre directly. It is the most classical, principled Leningrad plan — meet White's space with a central counterstrike.", sayShort: '…c6 — prepare the …e5 central break.', highlights: [H('c6'), H('e5', SOFT)] }),
      b({ id: 'e2', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6 d5 e5', say: "d5 grabs space, and Black strikes with …e5! — the thematic break. Black challenges the centre head-on, opening lines for the g7-bishop and freeing the position exactly where White just committed pawns. The Leningrad's central counterpunch.", sayShort: '…e5 — the central counterstrike.', highlights: [H('e5')] }),
      b({ id: 'e3', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6 d5 e5 dxe6 Bxe6', say: "dxe6 Bxe6 — Black recaptures with the bishop, developing it actively to e6 where it eyes c4 and the queenside. The centre has opened, the g7-bishop's diagonal is clear, and Black has free, active piece play with no weaknesses.", sayShort: '…Bxe6 — recapture active, open the centre.', highlights: [H('e6')] }),
      b({ id: 'e4', moves: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 c6 d5 e5 dxe6 Bxe6 b3 Na6 Ng5 Bc8', say: "b3 Na6 and Ng5 hits the e6-bishop, but Black calmly retreats …Bc8, keeping the structure intact and eyeing a redeploy to f5 or g4. There is the …e5-break tabiya: an open, equal centre with the fianchettoed bishop active and easy development — the classical, low-risk way to play the Leningrad.", sayShort: '…Bc8 — regroup, keep the open-centre game.', highlights: [H('c8')] }),
    ],
  },

  "dutch-defence::Leningrad g6 Main Line": {
    openingId: "dutch-defence", title: "Leningrad Dutch — the main line grip on e4", minutes: 8, orientation: "black",
    sources: ["concept:pos-outpost", "concept:pawn-fianchetto", "https://en.wikipedia.org/wiki/Dutch_Defence"],
    beats: [
      { id: "lg1", moves: ["d4", "f5", "g3", "Nf6", "Bg2", "g6", "Nf3", "Bg7", "O-O", "O-O", "c4", "d6"], say: "The Leningrad: the Dutch …f5 married to a King's Indian fianchetto. Black's stake is simple — the f5-pawn owns e4, the g7-bishop owns the long diagonal, and the …e5 break is the north star of every plan.", sayShort: "…d6 — aim everything at e5.", highlights: [{ square: "e4", color: "rgba(80,140,255,0.32)" }, { square: "g7", color: "rgba(255,214,0,0.88)" }] },
      { id: "lg2", moves: ["d4", "f5", "g3", "Nf6", "Bg2", "g6", "Nf3", "Bg7", "O-O", "O-O", "c4", "d6", "Nc3", "Qe8"], say: "…Qe8 — the Leningrad's signature move. The queen slips off the d-file before it opens, backs the coming …e5 from behind, and keeps the h5-swing in the bag for kingside emergencies. One square, three jobs.", sayShort: "…Qe8 — one square, three jobs.", highlights: [{ square: "e8", color: "rgba(255,214,0,0.88)" }, { square: "e5", color: "rgba(80,140,255,0.32)" }] },
      { id: "lg3", moves: ["d4", "f5", "g3", "Nf6", "Bg2", "g6", "Nf3", "Bg7", "O-O", "O-O", "c4", "d6", "Nc3", "Qe8", "d5", "Na6", "Rb1", "Nc5", "b3"], say: "d5 clamps the centre, and …Na6-c5 finds the structure's soft spot: from c5 the knight bites e4 and d3, and no White pawn evicts it without concessions. Rb1 and b3 begin preparing b4 — the eviction notice is in the mail.", sayShort: "…Nc5 — the knight finds the hole.", arrows: [{ from: "c5", to: "e4", color: "rgba(40,185,95,0.92)" }, { from: "c5", to: "d3", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "c5", color: "rgba(255,214,0,0.88)" }] },
      { id: "lg4", moves: ["d4", "f5", "g3", "Nf6", "Bg2", "g6", "Nf3", "Bg7", "O-O", "O-O", "c4", "d6", "Nc3", "Qe8", "d5", "Na6", "Rb1", "Nc5", "b3", "Nfe4", "Nxe4", "Nxe4", "Bb2"], say: "…Nfe4! — the second knight jumps in before b4 ever lands. White trades, and the c5-knight recaptures, re-planting the outpost in the centre of the board. Bb2 answers diagonal with diagonal. The engine gives White the usual small Dutch pull; Black has the e4-grip, the f-file, and the …e5 break still loaded — every Leningrad plan alive and pointed at the white king.", sayShort: "…Nxe4 — the outpost re-plants itself.", highlights: [{ square: "e4", color: "rgba(255,214,0,0.88)" }, { square: "b2", color: "rgba(80,140,255,0.32)" }] },
    ],
  },

  "dutch-defence::Anti-Dutch 2.Bg5 Response": {
    openingId: "dutch-defence", title: "Anti-Dutch 2.Bg5 — know the storm before it lands", minutes: 8, orientation: "black",
    sources: ["concept:pos-king-safety", "concept:pawn-fianchetto", "https://en.wikipedia.org/wiki/Dutch_Defence"],
    beats: [
      { id: "db1", moves: ["d4", "f5", "Bg5", "g6"], say: "2.Bg5 — the anti-Dutch needle, aiming to provoke weaknesses before Black's setup exists. …g6 is the modern answer: blunt the bishop's diagonal and prepare the fianchetto rather than chase the bishop with …h6 and …g5 loosening everything.", sayShort: "…g6 — blunt it, don't chase it.", highlights: [{ square: "g6", color: "rgba(255,214,0,0.88)" }, { square: "g5", color: "rgba(80,140,255,0.32)" }] },
      { id: "db2", moves: ["d4", "f5", "Bg5", "g6", "Nc3", "Bg7", "e3", "Nf6", "Bd3", "d5", "Nge2"], say: "Both sides build: …Bg7, …Nf6, …d5 — a solid Leningrad-like shell. White's Bd3 and Nge2 look modest, but watch the plan behind them: the e2-knight is headed for f4, and the h-pawn is coming with it.", sayShort: "…d5 — solid shell; watch the h-pawn.", highlights: [{ square: "d5", color: "rgba(255,214,0,0.88)" }, { square: "e2", color: "rgba(80,140,255,0.32)" }] },
      { id: "db3", moves: ["d4", "f5", "Bg5", "g6", "Nc3", "Bg7", "e3", "Nf6", "Bd3", "d5", "Nge2", "O-O", "Nf4", "c6", "h4"], say: "There it is: Nf4 leans on g6 and h4! declares the storm. This is the position the whole line exists for — and the engine says White's attack is real. Black's defensive scheme must be ready-made, not improvised: …c6 first, solidifying d5 before anything on the kingside cracks.", sayShort: "h4 — the storm declared; …c6 holds d5.", arrows: [{ from: "f4", to: "g6", color: "rgba(40,185,95,0.92)" }], highlights: [{ square: "h4", color: "rgba(255,214,0,0.88)" }, { square: "c6", color: "rgba(80,140,255,0.32)" }] },
      { id: "db4", moves: ["d4", "f5", "Bg5", "g6", "Nc3", "Bg7", "e3", "Nf6", "Bd3", "d5", "Nge2", "O-O", "Nf4", "c6", "h4", "Ne4", "Bxe4", "fxe4", "h5", "Rf5", "h6", "Rxg5", "hxg7", "Bf5"], say: "…Ne4! is the central counter — the Dutch player's eternal answer to a wing attack, meeting the storm in the middle rather than on the flank. White trades and pushes on: h5. The accurate reply is …Rf5!, swinging the rook along the fifth rank onto the g5-bishop, the storm's key attacker. After h6, …Rxg5 lifts the bishop off; hxg7 trades the fianchetto bishop back, and …Bf5 completes the regrouping — the e4-wedge cramps White, the stranded g7-pawn is going nowhere, and the engine calls it level-to-better for Black. You weather the Anti-Dutch by trading its attacker down, not by clutching pawns with …h6.", sayShort: "…Rf5 — trade the storm's bishop off.", highlights: [{ square: "e4", color: "rgba(255,214,0,0.88)" }, { square: "g7", color: "rgba(80,140,255,0.32)" }] },
    ],
  },
};
