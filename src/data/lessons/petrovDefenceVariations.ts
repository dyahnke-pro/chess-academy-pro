import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Petrov Defence. Lead-the-eye §5a.
// Moves come from repertoire.json variation pgn lines (DB-anchored, G3);
// prose only is authored. Deepest beat ≥20 plies (lessonDepth gate).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['book:petrov-defence', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'];

export const PETROV_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'petrov-defence::Steinitz Variation': {
    openingId: 'petrov-defence', title: 'Petrov — The Steinitz 3.d4', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 's1', moves: 'e4 e5 Nf3 Nf6 d4 Nxe4', say: "The Steinitz approach — instead of 3.Nxe5, White opens the centre at once with 3.d4. Black grabs the e4-pawn with …Nxe4; because the d4-pawn no longer guards e5, there is no rush to recapture and Black simply takes the free centre pawn.", sayShort: '…Nxe4 — grab the centre pawn.', highlights: [H('e4'), H('d4', SOFT)] }),
      b({ id: 's2', moves: 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7', say: "Bd3 hits the e4-knight, …d5 anchors it just as in the main line, and after Nxe5 Black plays the precise …Nd7 — challenging the e5-knight rather than allowing White to keep it on its commanding central post.", sayShort: '…Nd7 — challenge the e5-knight.', arrows: [A('d7', 'e5')], highlights: [H('e5'), H('d5', SOFT)] }),
      b({ id: 's3', moves: 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6', say: "Nxd7 Bxd7 trades a pair of knights and develops Black's light bishop for free. Black castles-to-be and posts the dark bishop on …Bd6, aimed straight at h2 — the start of Black's own kingside intentions.", sayShort: '…Bd6 — active bishop eyeing h2.', arrows: [A('d6', 'h2')], highlights: [H('d6'), H('h2')] }),
      b({ id: 's4', moves: 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6 c4 c6 Nc3 Nxc3 bxc3 O-O', say: "c4 challenges d5; …c6 props it, Black trades on c3 and castles. The recapture bxc3 again hands White the doubled c-pawns — the recurring Petrov dividend — while Black has the safer king and the cleaner structure.", sayShort: '…O-O — castled; the c-pawns stay doubled.', highlights: [H('c3'), H('d5', SOFT)] }),
      b({ id: 's5', moves: 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6 c4 c6 Nc3 Nxc3 bxc3 O-O cxd5 cxd5 Qh5 g6 Qxd5', say: "cxd5 cxd5 resolves the centre, leaving Black an isolated d-pawn but free, easy piece play. White's Qh5 provokes …g6, then snatches the pawn with Qxd5 — a greedy queen raid that hands Black exactly the tempo he is looking for.", sayShort: '…g6 — invite the greedy Qxd5.', highlights: [H('d5'), H('g6', SOFT)] }),
      b({ id: 's6', moves: 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6 c4 c6 Nc3 Nxc3 bxc3 O-O cxd5 cxd5 Qh5 g6 Qxd5 Qc7 Bh6 Rfd8 Qg5 Qxc3', say: "…Qc7 strikes the weak c3-pawn down the open file with tempo, …Rfd8 swings the rook to the centre, and after the queens shuffle Black scoops c3 straight back with …Qxc3. Material is level and Black's pieces are every bit as active as White's. There is the Steinitz tabiya — the comfortable equality the Petrov was built to reach.", sayShort: '…Qxc3 — regain the pawn, dead equal.', highlights: [H('c3')] }),
    ],
  },

  'petrov-defence::Three Knights Game': {
    openingId: 'petrov-defence', title: 'Petrov — The Three Knights 3.Nc3', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 't1', moves: 'e4 e5 Nf3 Nf6 Nc3 Nc6 d4 exd4 Nxd4 Bb4', say: "When White declines the symmetry with 3.Nc3, Black answers …Nc6 and after d4 exd4 Nxd4 plays the active …Bb4 — pinning the c3-knight against the king and breaking the symmetry on Black's own terms.", sayShort: '…Bb4 — pin the c3-knight.', arrows: [A('b4', 'c3')], highlights: [H('c3'), H('b4')] }),
      b({ id: 't2', moves: 'e4 e5 Nf3 Nf6 Nc3 Nc6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5', say: "Nxc6 bxc6 hands Black a half-open b-file and a strong pawn on c6; then …d5! strikes the centre, freeing the position and opening lines for Black's bishops. The doubled c-pawns are no weakness here — they control central squares and feed the …d5 break.", sayShort: '…d5 — strike the centre, free the bishops.', highlights: [H('d5'), H('c6', SOFT)] }),
      b({ id: 't3', moves: 'e4 e5 Nf3 Nf6 Nc3 Nc6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 Be6', say: "exd5 cxd5 leaves Black a healthy central pawn on d5 and the bishop pair in an open position. Both sides castle; White pins with Bg5, and Black completes development with …Be6, guarding d5 and connecting the rooks.", sayShort: '…Be6 — guard d5, finish developing.', arrows: [A('e6', 'd5')], highlights: [H('e6'), H('d5')] }),
      b({ id: 't4', moves: 'e4 e5 Nf3 Nf6 Nc3 Nc6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 Be6 Qf3 Be7 Bxf6 Bxf6 Qxd5', say: "White wins the d5-pawn with Qf3 and Bxf6, but it is a poisoned meal — after …Bxf6 Black's dark bishop rakes the long diagonal, and Qxd5 invites a queen trade that strips White of any attacking chances.", sayShort: '…Bxf6 — long-diagonal bishop, pawn is bait.', highlights: [H('f6'), H('d5', SOFT)] }),
      b({ id: 't5', moves: 'e4 e5 Nf3 Nf6 Nc3 Nc6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 Be6 Qf3 Be7 Bxf6 Bxf6 Qxd5 Qxd5 Nxd5 Bxb2 Rab1 Bf6 Nxf6+ gxf6', say: "…Qxd5 Nxd5 …Bxb2 snatches the b-pawn straight back, restoring material equality, and after Rab1 …Bf6 Nxf6+ gxf6 the queens and minor pieces are gone. There is the Three Knights tabiya: a dead-level endgame with symmetrical material and Black's pieces every bit as active — the comfortable equality the Petrov promises.", sayShort: '…gxf6 — level endgame, fully equal.', highlights: [H('b2'), H('f6')] }),
    ],
  },

  'petrov-defence::Italian Variation': {
    openingId: 'petrov-defence', title: 'Petrov — The dxc3 Bishop-Pair Lines', minutes: 11, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'i1', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Nc3 Nxc3 dxc3', say: "White varies with 5.Nc3, inviting …Nxc3. The recapture dxc3 is the point: White accepts doubled, isolated c-pawns in return for the bishop pair and a half-open d-file. This is the sharpest try — White will castle queenside and play for an attack.", sayShort: '…Nxc3 — hand White doubled c3-pawns.', highlights: [H('c3')] }),
      b({ id: 'i2', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Nc3 Nxc3 dxc3 Be7 Be3 Nc6 Qd2 Be6', say: "Black develops solidly and symmetrically — …Be7, …Nc6, and …Be6 covering d5 and the kingside. Against White's Be3 and Qd2 build-up, Black mirrors the development and prepares to castle long, neutralising any attack before it starts.", sayShort: '…Be6 — solid setup, guard d5.', arrows: [A('e6', 'd5', SOFT)], highlights: [H('e6'), H('d5', SOFT)] }),
      b({ id: 'i3', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Nc3 Nxc3 dxc3 Be7 Be3 Nc6 Qd2 Be6 O-O-O Qd7 Kb1 O-O-O', say: "Both kings head to the queenside; Kb1 tucks White's king to b1, and Black mirrors with queenside castling. With both kings on the same wing there is no pawn-storm race — the game becomes a manoeuvring battle where White's bishop pair is balanced by the broken c3-pawns. (White's Bf4-and-Qd4 Kaufmann set-up reaches the same kind of position.)", sayShort: '…O-O-O — same-side kings, no storm.', highlights: [H('c3'), H('b1', SOFT)] }),
      b({ id: 'i4', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Nc3 Nxc3 dxc3 Be7 Be3 Nc6 Qd2 Be6 O-O-O Qd7 Kb1 O-O-O Bd3 d5 Nd4 Nxd4 Bxd4 Bf6', say: "Bd3 and …d5 fix the centre; Black trades knights on d4 and offers the dark bishops with …Bf6, challenging White's strong d4-bishop on the long diagonal. Every trade brings Black closer to a level, bishop-pair-neutralised endgame.", sayShort: '…Bf6 — challenge the d4-bishop, trade down.', arrows: [A('f6', 'd4')], highlights: [H('f6'), H('d4')] }),
      b({ id: 'i5', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Nc3 Nxc3 dxc3 Be7 Be3 Nc6 Qd2 Be6 O-O-O Qd7 Kb1 O-O-O Bd3 d5 Nd4 Nxd4 Bxd4 Bf6 Bxf6 gxf6 f4 Kb8 Rhe1 Rhe8', say: "Bxf6 gxf6 doubles Black's f-pawns, but they shield the king and control central squares; after f4, …Kb8 tucks the king away and …Rhe8 seizes the open e-file. There is the tabiya: White's bishop pair traded off, both sides carrying doubled pawns, and a balanced middlegame where Black's solidity holds. The famous Cochrane Gambit (Nxf7) is a separate, double-edged piece sacrifice — sound for Black with accurate defence.", sayShort: '…Rhe8 — seize the e-file, balanced game.', highlights: [H('e8'), H('b8')] }),
    ],
  },

  'petrov-defence::5.Bd3 Line': {
    openingId: 'petrov-defence', title: 'Petrov — The 5.Bd3 Classical', minutes: 11, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'b1', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6', say: "White's most natural set-up: 5.d4 d5 6.Bd3, the bishop on its best diagonal aimed at h7. Black mirrors with …Bd6, the bishop pointing back at h2. This is the symmetric heart of the Petrov — both sides build the same harmonious position and fight for the small edges.", sayShort: '…Bd6 — mirror, bishop aimed at h2.', arrows: [A('d6', 'h2')], highlights: [H('d6'), H('h2')] }),
      b({ id: 'b2', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6 O-O O-O c4 c6', say: "Both castle, White challenges the d5-anchor with c4, and …c6 props it firmly. The e4-knight sits unassailable, supported by the d5-pawn, and Black's position is a fortress with no entry squares for White.", sayShort: '…c6 — prop d5, knight unassailable.', highlights: [H('d5'), H('e4')] }),
      b({ id: 'b3', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6 O-O O-O c4 c6 Qc2 Na6 a3 Bg4', say: "Qc2 adds pressure to the e4-knight; Black develops the queenside knight to …Na6 (heading for c7 to overprotect d5 and e6) and pins the f3-knight with …Bg4, leaning on the defender of d4. Every white attempt on e4 is met with another defender.", sayShort: '…Bg4 — pin f3, pile up on e4.', arrows: [A('g4', 'f3')], highlights: [H('f3'), H('e4', SOFT)] }),
      b({ id: 'b4', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6 O-O O-O c4 c6 Qc2 Na6 a3 Bg4 Nbd2 Nxd2 Bxd2 Bxf3 gxf3', say: "Nbd2 offers the trade of Black's proud e4-knight; …Nxd2 Bxd2 and then …Bxf3 gxf3 — Black exchanges into White's pawns, shattering the kingside with doubled, tripled f-pawns. White's bishop pair is small compensation for that wreck of a structure.", sayShort: '…Bxf3 — wreck the kingside pawns.', highlights: [H('f3')] }),
      b({ id: 'b5', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6 O-O O-O c4 c6 Qc2 Na6 a3 Bg4 Nbd2 Nxd2 Bxd2 Bxf3 gxf3 Qh4 Be1 Nc7 f4 f5 Kh1 Ne6 Rg1 Rf6', say: "…Qh4 pounces on the weakened kingside; after Be1 the knight reroutes …Nc7–e6 toward the holes on f4 and g5, and …f5 clamps the centre. …Rf6 lifts the rook toward the open g-file and the white king. There is the 5.Bd3 tabiya: Black's pieces swarming a kingside that White's own structure has ruined — the symmetric Petrov turned into a real initiative.", sayShort: '…Rf6 — rook-lift at the broken king.', arrows: [A('e6', 'f4')], highlights: [H('e6'), H('f4')] }),
    ],
  },
};
