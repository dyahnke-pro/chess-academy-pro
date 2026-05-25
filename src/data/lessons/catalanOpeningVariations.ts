import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Catalan (WHITE) variation lessons. Student = White. Keyed EXACTLY
// "catalan-opening::<Exact Variation Name>". Spines from the catalan-opening
// repertoire pgns + masters extension (PLAN.md); deepest beat ≥20 ply.
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

// ── Closed Catalan (…c6) — the e4 break ─────────────────────────────────
const CLOSED: LessonScript = {
  openingId: 'catalan-opening', title: 'Catalan — Closed (…c6 System)', minutes: 10, orientation: 'white',
  beats: [
    b({ id: 'cl1', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6',
      say: "The Closed Catalan — Black builds a Slav-like wall with c6 and Nbd7, declining to take on c4. The c6-pawn blunts the Bg2 for now, so White changes plans: prepare the e4 break to rip the centre open.",
      sayShort: '…c6 — the wall; prepare e4.', highlights: [H('c6'), H('e4', SOFT)] }),
    b({ id: 'cl2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 Nbd2 b6 e4',
      say: "Nbd2 supports the break, and e4 fires! White rips the centre open, and the Bg2 — caged a moment ago behind the c6-pawn — suddenly rakes the long diagonal at full power.",
      sayShort: 'e4 — the break unleashes the bishop.', highlights: [H('e4')] }),
    b({ id: 'cl3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 Nbd2 b6 e4 Bb7 e5 Ne8',
      say: "e5 grabs space and kicks the f6-knight back to e8, cramping Black badly. White has the space, the bishop, and a clear kingside attacking plan. The Closed Catalan, cracked open, is White's dream.",
      sayShort: 'e5 — gain space, cramp Black.', highlights: [H('e5')] }),
  ],
};

// ── Open Catalan a6-b5 — a4/Ne5 regains the pawn ────────────────────────
const OPEN_A6: LessonScript = {
  openingId: 'catalan-opening', title: 'Catalan — Open (a6-b5 with a4)', minutes: 10, orientation: 'white',
  beats: [
    b({ id: 'oa1', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6',
      say: "The Open Catalan with …a6 — Black grabs the c4-pawn and prepares …b5 to cling to it. White will not allow Black to keep the booty for free.",
      sayShort: '…dxc4 …a6 — Black holds the pawn.', highlights: [H('c4'), H('b5', SOFT)] }),
    b({ id: 'oa2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O b5 Ne5',
      say: "White castles, Black plays b5, and Ne5! The knight leaps to the centre, eyeing the c4- and c6-squares and combining with the Bg2 to win the queenside pawn back under pressure.",
      sayShort: 'Ne5 — central knight wins the pawn back.', highlights: [H('c4', SOFT), H('c6', SOFT)] }),
    b({ id: 'oa3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O b5 Ne5 Nd5 a4 Bb7 axb5 axb5 Rxa8 Bxa8',
      say: "a4 cracks the queenside, and after the trades on a8 White regains the c4-pawn with a typical Catalan edge — the bishop on g2 dominating the long diagonal against Black's passive setup.",
      sayShort: 'a4 — open lines; regain c4, squeeze.', highlights: [H('c4', SOFT), H('g2', SOFT)] }),
  ],
};

// ── …Nbd7 Line — a4 clamp + …Bd7-c6 ─────────────────────────────────────
const NBD7: LessonScript = {
  openingId: 'catalan-opening', title: 'Catalan — …Nbd7 Line', minutes: 10, orientation: 'white',
  beats: [
    b({ id: 'nb1', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4',
      say: "Against the Open Catalan, White can clamp with a4 first — stopping …b5 cold before bothering to regain the pawn. Black reroutes with …Bd7-c6 to challenge the long diagonal head-on.",
      sayShort: 'a4 — stop …b5 before recapturing.', highlights: [H('b5', SOFT)] }),
    b({ id: 'nb2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4 Bd7 Qxc4 Bc6 Bf4 Nbd7 Nc3',
      say: "…Bd7-c6 offers to trade the great bishops, but White is content: Qxc4 has regained the pawn, and Bf4 with Nc3 complete a harmonious setup, the pressure still raking down the long diagonal toward a8.",
      sayShort: 'Qxc4, Bf4 — harmonious, space intact.', highlights: [H('a8', SOFT)] }),
    b({ id: 'nb3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 a4 Bd7 Qxc4 Bc6 Bf4 Nbd7 Nc3 Nb6 Qd3 Nbd5 Nxd5',
      say: "Black's knights dance to d5 to blockade and trade, but after Nxd5 White keeps a pleasant pull — more space and the long-diagonal pressure toward a8. A classic Catalan grind.",
      sayShort: 'Nxd5 — trade; keep the pull.', highlights: [H('a8', SOFT)] }),
  ],
};

// ── Catalan vs Slav (…c6/…dxc4/…g6) — seize the centre with e4 ───────────
const VS_SLAV: LessonScript = {
  openingId: 'catalan-opening', title: 'Catalan — vs Slav Setup', minutes: 10, orientation: 'white',
  beats: [
    b({ id: 'vs1', moves: 'd4 d5 c4 c6 Nf3 Nf6 g3 dxc4 Bg2',
      say: "When Black mixes the Slav with the Catalan — c6 then dxc4 — White fianchettoes anyway. The Bg2 will hunt the c4-pawn down the long diagonal, the gambit recouped at leisure.",
      sayShort: 'Bg2 — hunt c4 on the long diagonal.', highlights: [H('c4')] }),
    b({ id: 'vs2', moves: 'd4 d5 c4 c6 Nf3 Nf6 g3 dxc4 Bg2 g6 O-O Bg7 a4 Ne4 Qc2',
      say: "Black fianchettoes too with …g6/…Bg7. White castles, clamps the queenside with a4, and after …Ne4 plays Qc2 — preparing the e4 break to seize the full centre while the c4-pawn falls in due course.",
      sayShort: 'a4, Qc2 — clamp; prepare e4.', highlights: [H('e4', SOFT)] }),
    b({ id: 'vs3', moves: 'd4 d5 c4 c6 Nf3 Nf6 g3 dxc4 Bg2 g6 O-O Bg7 a4 Ne4 Qc2 Nd6 e4 Na6 Na3 O-O Rd1 Nb4',
      say: "e4 grabs the big centre on d4 and e4; Black's knights scatter to awkward squares while White's pieces flow to natural posts. White has the centre, the bishop, and the initiative — the Catalan beats the hybrid Slav setup.",
      sayShort: 'e4 — big centre beats the hybrid.', highlights: [H('d4', SOFT), H('e4')] }),
  ],
};

// ── Catalan Declined (…Be7 without …dxc4) — double fianchetto + e4 ───────
const DECLINED: LessonScript = {
  openingId: 'catalan-opening', title: 'Catalan — Declined (…Be7)', minutes: 10, orientation: 'white',
  beats: [
    b({ id: 'de1', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 b3',
      say: "The Catalan Declined — Black sits solid with …c6/…Nbd7 and never takes on c4. White develops with b3 and Bb2, a second fianchetto, and builds slowly toward the e4 break.",
      sayShort: 'b3 — double fianchetto; aim for e4.', highlights: [H('c6', SOFT), H('e4', SOFT)] }),
    b({ id: 'de2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 b3 b6 Bb2 Bb7 Nc3 Rc8 e4',
      say: "Both sides fianchetto and pile up — then White breaks with e4! The centre opens, and White's two long-diagonal bishops and central space give a lasting pull against Black's solid but passive wall.",
      sayShort: 'e4 — break the wall; bishops roar.', highlights: [H('e4')] }),
    b({ id: 'de3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 b3 b6 Bb2 Bb7 Nc3 Rc8 e4 dxe4 Nxe4 Nxe4 Qxe4',
      say: "…dxe4 and the trades open the e-file and the long diagonal at last. After Qxe4 White's queen and Bg2 bear down the centre and at b7; the space and the bishop pair carry a pleasant, durable edge.",
      sayShort: 'Qxe4 — central pressure, durable edge.', highlights: [H('b7', SOFT)] }),
  ],
};

// ── Early Qa4+ Line — Ne5 + Qa4 refute the greedy …Bd7 ──────────────────
const QA4: LessonScript = {
  openingId: 'catalan-opening', title: 'Catalan — Early Qa4+ Line', minutes: 10, orientation: 'white',
  beats: [
    b({ id: 'qa1', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Bd7',
      say: "Against the immediate …dxc4, Black tries …Bd7 to defend the pawn and challenge the diagonal. White has a precise refutation that wins the pawn back with interest.",
      sayShort: '…Bd7 — Black defends the c4-pawn.', highlights: [H('c4')] }),
    b({ id: 'qa2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Bd7 Ne5 Bc6 Nxc6 Nxc6 O-O',
      say: "Ne5! attacks the c6-bishop and the loose pawn at once; after Bc6 Nxc6 Nxc6 the trade leaves White castling with easy development and the c4-pawn ready to fall to a Qa4 swing.",
      sayShort: 'Ne5 — hit the bishop; win c4 soon.', highlights: [H('c4', SOFT)] }),
    b({ id: 'qa3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Bd7 Ne5 Bc6 Nxc6 Nxc6 O-O Qd7 e3 O-O-O Qa4 Nd5 Qxc4 h5',
      say: "Black castles long, but Qa4 and Qxc4 snap the pawn back, the queen lining up against Black's airy king on c8. White has regained the material with the better structure and real attacking chances — the Catalan refutes the greedy …Bd7.",
      sayShort: 'Qxc4 — regain the pawn, hit the king.', highlights: [H('c8', SOFT)] }),
  ],
};

export const CATALAN_OPENING_VARIATION_LESSONS: Record<string, LessonScript> = {
  'catalan-opening::Closed Catalan: ...c6 System': CLOSED,
  'catalan-opening::Open Catalan: a6-b5 with a4 Break': OPEN_A6,
  'catalan-opening::Catalan with ...Nbd7 Line': NBD7,
  'catalan-opening::Catalan vs Slav Setup: ...c6 and ...dxc4': VS_SLAV,
  'catalan-opening::Catalan Declined: ...Be7 without ...dxc4': DECLINED,
  'catalan-opening::Early Qa4+ Line': QA4,
};
