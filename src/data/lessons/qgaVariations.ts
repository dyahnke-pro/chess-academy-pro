import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// QGA (BLACK) variation lessons. Student = Black (accepting). Keyed EXACTLY
// "qga::<Exact Variation Name>" (repertoire.json names). Spines from the qga
// repertoire pgns + masters extension (PLAN.md); deepest beat ≥20 ply.
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

// ── Smyslov 3…a6 — flexible modern move-order ───────────────────────────
const SMYSLOV: LessonScript = {
  openingId: 'qga', title: 'QGA — Smyslov Variation (3…a6)', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'sm1', moves: 'd4 d5 c4 dxc4 Nf3 a6',
      say: "The Smyslov — Black's flexible modern treatment. The little move a6 comes first, before the knight, preparing …b5 to grab space and …Bb7 for the long diagonal, all while keeping the rest of the setup open.",
      sayShort: '…a6 — the flexible Smyslov.', highlights: [H('b5', SOFT), H('b7', SOFT)] }),
    b({ id: 'sm2', moves: 'd4 d5 c4 dxc4 Nf3 a6 e3 Nf6 Bxc4 e6 O-O c5',
      say: "White regains the pawn with e3 and Bxc4; Black develops and breaks with …c5, hitting d4 exactly as in the main line. The early …a6 means …b5 is ready the instant the bishop commits.",
      sayShort: '…c5 — the break, …b5 ready.', highlights: [H('c5'), H('d4', SOFT)] }),
    b({ id: 'sm3', moves: 'd4 d5 c4 dxc4 Nf3 a6 e3 Nf6 Bxc4 e6 O-O c5 Qe2 Nc6 Rd1 b5 Bb3',
      say: "…Nc6 develops, then …b5 expands and chases the bishop to b3. Black's queenside rolls with tempo and the pressure builds on the d4-pawn — every piece coming to an active square.",
      sayShort: '…b5 — queenside rolls with tempo.', highlights: [H('d4')] }),
    b({ id: 'sm4', moves: 'd4 d5 c4 dxc4 Nf3 a6 e3 Nf6 Bxc4 e6 O-O c5 Qe2 Nc6 Rd1 b5 Bb3 cxd4 exd4 Be7 Nc3',
      say: "Black clarifies with …cxd4, leaving White an isolated pawn on d4 to blockade and besiege, then completes with …Be7. Comfortable, active equality — the Smyslov's smooth path to a good game.",
      sayShort: '…cxd4 — isolate and blockade d4.', highlights: [H('d4')] }),
  ],
};

// ── Sadler …Bg4 — develop the bishop outside the chain ──────────────────
const SADLER: LessonScript = {
  openingId: 'qga', title: 'QGA — Sadler Variation (…Bg4)', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'sd1', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 Bg4',
      say: "The Sadler — Black solves the bad-bishop problem instantly: …Bg4, developing the light-squared bishop OUTSIDE the pawn chain and pinning the f3-knight before …e6 shuts anything in.",
      sayShort: '…Bg4 — bishop out, pin the knight.', arrows: [A('g4', 'f3', ATK)] }),
    b({ id: 'sd2', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 Bg4 Bxc4 e6 h3 Bh5',
      say: "White takes the pawn; Black plays …e6 with the bishop already developed, and after h3 retreats …Bh5, maintaining the pin on the f3-knight along the diagonal. No bad bishop, no cramp.",
      sayShort: '…Bh5 — keep the pin alive.', highlights: [H('f3', SOFT)] }),
    b({ id: 'sd3', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 Bg4 Bxc4 e6 h3 Bh5 Nc3 Nbd7 g4 Bg6 Nh4',
      say: "White lunges g4 to win the bishop pair; Black calmly drops to g6. After Nh4 White hunts the bishop, but the g4-thrust has loosened White's own kingside, and Black gets full counterplay there.",
      sayShort: "…Bg6 — sidestep; White's kingside loose.", highlights: [H('g4')] }),
    b({ id: 'sd4', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 Bg4 Bxc4 e6 h3 Bh5 Nc3 Nbd7 g4 Bg6 Nh4 Be4 Nxe4 Nxe4',
      say: "…Be4 offers the trade, and after Nxe4 Nxe4 Black has a fine game: a centralised knight, no weaknesses, and White's kingside compromised by the early g4-push. The Sadler equalizes with style.",
      sayShort: '…Nxe4 — centralised knight, equal.', highlights: [H('g4', SOFT)] }),
  ],
};

// ── Central 3.e4 — meet the big centre with …e5 ─────────────────────────
const CENTRAL: LessonScript = {
  openingId: 'qga', title: 'QGA — Central Variation (3.e4)', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'ce1', moves: 'd4 d5 c4 dxc4 e4',
      say: "The Central Variation — White grabs the entire centre at once with e4. Aggressive, space-grabbing, and committal.",
      sayShort: 'e4 — White seizes the full centre.', highlights: [H('e4')] }),
    b({ id: 'ce2', moves: 'd4 d5 c4 dxc4 e4 e5',
      say: "…e5! The principled punch. Black strikes at the d4-pawn immediately, refusing to let White's centre stand unchallenged. Open lines and rapid development are Black's full compensation.",
      sayShort: '…e5! — strike the centre at once.', highlights: [H('e5'), H('d4', SOFT)] }),
    b({ id: 'ce3', moves: 'd4 d5 c4 dxc4 e4 e5 Nf3 exd4 Bxc4 Nc6 O-O Be6',
      say: "White regains a pawn with Nf3 and Bxc4; Black develops actively — …Nc6 piling on the d4-pawn, …Be6 offering to trade White's strong bishop. Black's pieces fly out while White's grand centre has dissolved.",
      sayShort: '…Nc6, …Be6 — active, centre dissolved.', highlights: [H('d4')] }),
    b({ id: 'ce4', moves: 'd4 d5 c4 dxc4 e4 e5 Nf3 exd4 Bxc4 Nc6 O-O Be6 Bb5 Bc5 b4 Bb6 a4 a6 Bxc6+ bxc6 a5 Ba7',
      say: "A sharp tactical skirmish follows — …Bc5 develops with tempo, and after the queenside scramble Black's bishop lands on a7, glaring down the diagonal toward f2 and White's king. The dust settles with active, balanced play; White's broad-centre ambitions came to nothing.",
      sayShort: '…Ba7 — active bishop, balanced game.', highlights: [H('f2', SOFT)] }),
  ],
};

// ── Alekhine 4.Nc3 — dynamic …a6/…b5 + …Nd5 ─────────────────────────────
const ALEKHINE: LessonScript = {
  openingId: 'qga', title: 'QGA — Alekhine Variation (4.Nc3)', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'al1', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 Nc3',
      say: "The Alekhine — White develops the knight to c3 early, eyeing a quick e4 and the full centre. Black meets it with a concrete, dynamic plan rather than passive defence.",
      sayShort: 'Nc3 — the Alekhine; answer dynamically.', highlights: [H('e4', SOFT)] }),
    b({ id: 'al2', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 Nc3 a6 e4 b5',
      say: "…a6 and …b5 — Black grabs queenside space and prepares …Bb7. White builds the centre with e4, but Black's counterplay on the queenside and the long diagonal comes fast.",
      sayShort: '…a6, …b5 — queenside space, …Bb7.', highlights: [H('e4', SOFT), H('b7', SOFT)] }),
    b({ id: 'al3', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 Nc3 a6 e4 b5 e5 Nd5 a4 Nxc3 bxc3 Qd5',
      say: "White clamps with e5; Black's knight hops to d5 and trades on c3, fracturing White's queenside pawns. Then …Qd5 centralises the queen, hitting the loose c3-pawn and raking the long diagonal.",
      sayShort: '…Nxc3 — wreck the queenside pawns.', highlights: [H('c3')] }),
    b({ id: 'al4', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 Nc3 a6 e4 b5 e5 Nd5 a4 Nxc3 bxc3 Qd5 g3 Bb7 Bg2 Qd7 Ba3 g6',
      say: "…Bb7 completes the fianchetto, the bishops face off on the long diagonal, and …Qd7 with …g6 prepares to castle. Black has the superior structure — White's doubled c3-pawn is a permanent weakness — plus active pieces. A rich, balanced battle.",
      sayShort: '…Bb7 — better structure, active play.', highlights: [H('c3')] }),
  ],
};

// ── Modern Tabiya (…Nc6, Rd1) — the IQP main battleground ───────────────
const MODERN: LessonScript = {
  openingId: 'qga', title: 'QGA — Modern Tabiya (Rd1)', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'mt1', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Bb3 Nc6',
      say: "The Modern Tabiya — today's main battleground. Black develops …Nc6 instead of …Nbd7, putting immediate pressure on the d4-pawn and preparing to clarify the centre on his own terms.",
      sayShort: '…Nc6 — modern main; pressure d4.', highlights: [H('d4')] }),
    b({ id: 'mt2', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Bb3 Nc6 Nc3 cxd4 exd4 Be7 Re1 O-O',
      say: "…cxd4 hands White an isolated queen's pawn on d4 — a long-term target. Black develops …Be7 and castles, ready to blockade d4 and pick at it. The isolated pawn is White's burden, not Black's.",
      sayShort: '…cxd4 — saddle White with the IQP.', highlights: [H('d4')] }),
    b({ id: 'mt3', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Bb3 Nc6 Nc3 cxd4 exd4 Be7 Re1 O-O Bg5 b5 d5',
      say: "White tries Bg5 and pushes the isolated pawn with d5 to free it — but Black has …b5 in first, gaining space, and keeps the pawn firmly blockaded. Black is comfortably equal, the d-pawn a permanent worry for White.",
      sayShort: '…b5 — space; blockade the d-pawn.', highlights: [H('b5', SOFT)] }),
  ],
};

// ── Janowski (dxc5 line) — recapture activates the bishop ───────────────
const JANOWSKI: LessonScript = {
  openingId: 'qga', title: 'QGA — Janowski Variation', minutes: 10, orientation: 'black',
  beats: [
    b({ id: 'ja1', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Bxc5',
      say: "Here White releases the central tension early with dxc5, and Black recaptures …Bxc5 — the bishop springs to an active post, eyeing the e3-pawn and White's kingside. Far from helping White, the trade simply activates Black's pieces.",
      sayShort: '…Bxc5 — the bishop springs to life.', highlights: [H('e3', SOFT)] }),
    b({ id: 'ja2', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Bxc5 Qe2 Nc6 Nc3 b5 Bb3 Bb7',
      say: "Black develops with tempo — …Nc6, then …b5 and …Bb7, the familiar QGA queenside expansion with the bishop raking toward e4 on the long diagonal. Every piece is active and harmonious.",
      sayShort: '…b5, …Bb7 — active queenside setup.', highlights: [H('e4', SOFT)] }),
    b({ id: 'ja3', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Bxc5 Qe2 Nc6 Nc3 b5 Bb3 Bb7 Rd1 Qe7 e4',
      say: "White centralises with Rd1 and grabs the centre with e4; Black's …Qe7 connects the rooks and supports a future …e5 of his own. Black is fully developed with active pieces and easy equality — the dxc5 lines hold no terrors.",
      sayShort: '…Qe7 — connect rooks; full equality.', highlights: [H('e4'), H('e5', SOFT)] }),
  ],
};

export const QGA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'qga::Smyslov Variation 3...a6': SMYSLOV,
  'qga::Sadler Variation ...Bg4': SADLER,
  'qga::Central Variation 3.e4': CENTRAL,
  'qga::Alekhine Variation 4.Nc3': ALEKHINE,
  'qga::Modern Tabiya with Rd1': MODERN,
  'qga::Janowski Variation ...Qd5': JANOWSKI,
};
