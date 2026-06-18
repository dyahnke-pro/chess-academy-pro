import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { SublineNarration as SN } from '../../services/sublineLesson';

// HELPER B (claude oversight session jumped in, David 2026-06-18) — Benoni /
// gambit / Dutch bucket of the d4-flank narration tail, OVERRIDE LAYER (spread
// after D4Flank → deeper teach-past versions win, zero collision with C's file).
// Every line below is board-verified against course-sublines.json (G3).
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

// ── anti-Budapest (student WHITE) — neutralise the gambit, keep the edge ──
// Ng4 line, …g5 lunge.  d4 Nf6 c4 e5 dxe5 Ng4 Bf4 g5 Bg3 Nc6 Nf3 Bg7 h4 Ngxe5 Nxe5 Nxe5
const AB_G5: SN = {
  intro: {
    say: "…g5 — Black throws a pawn at your f4-bishop to break the grip on e5. Don't oblige a retreat into trouble: Bg3 keeps the bishop guarding e5, and …g5 has gravely loosened Black's own kingside. You'll strike that weakness with h4 and stand clearly better even once the gambit pawn comes back.",
    sayShort: '…g5 — Bg3 holds, h4 punishes.',
  },
  beats: [
    { atMove: 8, say: "Bg3 — the calm retreat. The bishop still eyes e5 and stays safe, while …g5 has ripped holes around Black's king that can never be repaired. You've given nothing and Black has weakened everything.", highlights: [H('e5', KEY), H('g5', SOFT)] },
    { atMove: 12, say: "h4 — prising open the kingside Black just loosened. Even after he rounds up the e5-pawn, his exposed king and the open h-file leave you with the clearly better game. …g5 was the mistake; h4 is the refutation.", highlights: [H('g5', ATK), H('h4', SOFT)] },
  ],
  sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// Ng4 line, …Bb4+.  d4 Nf6 c4 e5 dxe5 Ng4 Bf4 Bb4+ Nd2 Nc6 Nf3 Qe7 e3 Ngxe5 Nxe5 Nxe5
const AB_BB4: SN = {
  intro: {
    say: "…Bb4+ — a developing check to disrupt your build-up. Just block it: Nd2 brings a piece out and shields the king, and you calmly finish developing with Nf3 and e3 while holding the extra e5-pawn. Black will regain it, but you keep the smoother position and the freer pieces.",
    sayShort: '…Bb4+ — block Nd2, keep developing.',
  },
  beats: [
    { atMove: 8, say: "Nd2 — block the check WITH a developing move. Nothing is loosened, the e5-pawn stays defended for now, and you simply get your pieces out faster than Black can untangle his gambit.", highlights: [H('e5', SOFT)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// Ng4 line, …Nc6.  d4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nc3 Bxc3+ bxc3 Qe7 Qd5 f6 exf6 Nxf6
const AB_NC6: SN = {
  intro: {
    say: "…Nc6 — piling onto the e5-pawn at once. You defend it naturally: Nf3 props e5, and when Black pins with …Bb4+ you meet it with Nc3, accepting doubled c-pawns in return for the bishop pair and a strong centre. Qd5 then hits hard and you emerge comfortably better.",
    sayShort: '…Nc6 — hold e5 with Nf3.',
  },
  beats: [
    { atMove: 8, say: "Nf3 — the knight props up the e5-pawn that …Nc6 is attacking. You hold your extra material and keep developing; the Budapest's whole point is to win e5 back quickly, and you simply don't let it go cheaply.", highlights: [H('e5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// Fajarowicz …Ne4.  d4 Nf6 c4 e5 dxe5 Ne4 a3 d6 Qc2 Nc5 b4 Ne6 exd6 Bxd6 Bb2
const AB_NE4: SN = {
  intro: {
    say: "…Ne4 — the Fajarowicz, betting on piece activity rather than regaining the pawn directly. The clean antidote is space: a3 and b4 build a big queenside bind, Qc2 covers e4, and you hand the pawn back on your terms with exd6 — emerging with the bishop pair, a space advantage, and Black's knights with nowhere to go.",
    sayShort: '…Ne4 — bind with a3, b4.',
  },
  beats: [
    { atMove: 10, say: "b4 — the clamp. You give the gambit pawn back with exd6 in a moment, but in return you seize the whole queenside, keep the bishop pair, and leave Black's adventurous knight short of squares. Activity for a pawn is the Fajarowicz idea — deny the activity and you're just better.", highlights: [H('b4', ATK), H('c4', SOFT)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};

// ── Albin Counter-Gambit (student BLACK) — the …d4 wedge + opposite-wing attack.
// The move-14 deviations all branch from one tabiya; the plan never changes.
// Spine: d4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3 Bg4 Bg2 Qd7 O-O O-O-O
const ALBIN_TABIYA: SN = {
  intro: {
    say: "You're in the Albin main tabiya, and White's move here is just one of many tries — your plan never changes. The …d4 wedge is the soul of the gambit: it jams deep into White's camp and refuses to be shifted. With the kings on opposite wings you've got the head start — storm White's king with …h5-h4 while …Nge7-g6 rounds up the e5-pawn. Sharp, attacking, full of practical venom.",
    sayShort: 'Hold d4, storm with …h5-h4.',
  },
  beats: [
    { atMove: 5, say: "…d4 — the soul of the Albin. Your pawn jams deep into White's position, cramping his pieces and refusing to be dislodged. Every plan you have is built around protecting and using this wedge.", highlights: [H('d4', ATK)] },
    { atMove: 9, say: "…Bg4 — pinning the f3-knight, the very piece that most wants to chip away at your proud d4-pawn. Pin its attacker and the wedge only grows stronger.", highlights: [H('f3', KEY)] },
    { atMove: 13, say: "…O-O-O — castling straight into the attack. Kings on opposite wings means a race, and you have the jump: hurl the h-pawn at White's king while the d4-wedge keeps him too cramped to strike back in time.", highlights: [H('d4', ATK)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Albin_Countergambit'],
};

// ── Staunton Gambit vs Dutch (student WHITE) — gambit the e-pawn for development.
// …d5 grab.  d4 f5 e4 fxe4 Nc3 d5 Qh5+ g6 Qxd5 Nf6 Qxd8+ Kxd8
const STAUNTON_D5: SN = {
  intro: {
    say: "…d5 — Black tries to cling to the extra pawn behind a big centre. Punish it at once: Qh5+ forces …g6 (shredding the light squares Black's …f5 already loosened), and Qxd5 wins the pawn straight back. After Qxd8+ the queens come off and you're simply better — a healthy structure against Black's wrecked kingside.",
    sayShort: '…d5 — Qh5+ then Qxd5 regains it.',
  },
  beats: [
    { atMove: 8, say: "Qxd5 — the gambit pawn is back, and Qxd8+ next trades queens into an ending where your structure is clean and Black's …f5-…g6 kingside is full of holes. The Staunton's investment pays off with no risk at all.", highlights: [H('d5', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// Bg5 line, …e6.  d4 f5 e4 fxe4 Nc3 Nf6 Bg5 e6 Nxe4 Be7 Bxf6 Bxf6 c3 O-O Nf3 Nc6 h4
const STAUNTON_E6: SN = {
  intro: {
    say: "…e6 — Black returns the pawn to develop solidly. That's fine by you: Nxe4 regains it immediately, and the Staunton has done its job — you have a lead in development, the half-open f-file, and the lingering weakness of Black's …f5 to work against. Pure attacking compensation, pawn already recovered.",
    sayShort: '…e6 — Nxe4 regains it, you lead.',
  },
  beats: [
    { atMove: 8, say: "Nxe4 — the pawn's back and the gambit was really just development bait. You stand with the freer pieces, the open f-file pointing at f7, and Black's loosened kingside to target. The Staunton paid for itself.", highlights: [H('e4', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// Bg5 lines where Black holds e4 — White strikes its base with f3.
// …g6: d4 f5 e4 fxe4 Nc3 Nf6 Bg5 g6 f3   |   …c6: …Bg5 c6 f3
const STAUNTON_F3: SN = {
  intro: {
    say: "Black hangs onto the e4-pawn, so undermine it at the base: f3. The whole Staunton idea is that the extra pawn is a liability — once you play f3 and the centre clears, you regain it with a lead in development, the open f-file aimed at f7, and Black's …f5-weakened kingside to attack. The pawn was never the point.",
    sayShort: 'Hold the pawn? — f3 wins it back.',
  },
  beats: [
    { atMove: 8, say: "f3 — striking the e4-pawn at its base. As the centre opens you'll round the pawn back up with your pieces already developed and the f-file pointing at Black's king. The Staunton gambit collects its investment with interest.", highlights: [H('e4', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// Bg5 line, …Nc6.  d4 f5 e4 fxe4 Nc3 Nf6 Bg5 Nc6 d5 Ne5 Qe2 Nf7 Bxf6 exf6 Nxe4
const STAUNTON_NC6: SN = {
  intro: {
    say: "…Nc6 develops but ignores the e4-pawn's fate. Punish the loose play: d5 kicks the knight with gain of tempo, and after the trades Nxe4 simply restores material. You come out with more space, the bishop pair traded into a lead, and the open f-file — a clean Staunton dividend.",
    sayShort: '…Nc6 — d5 kicks, Nxe4 regains.',
  },
  beats: [
    { atMove: 8, say: "d5 — shoving the c6-knight offside with tempo before you scoop the e4-pawn back. …Nc6 spent a move on a piece that now has to retreat, and you convert the time into the better game.", highlights: [H('d5', ATK)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};

// ── anti-Englund (student WHITE) — the 1…e5 gambit refuted by a big centre.
// Shared var-0 spine: d4 e5 dxe5 Nc6 Nf3 Qe7 Nc3 Nxe5 e4  (Black's move 9+ varies)
const ANTI_ENGLUND: SN = {
  intro: {
    say: "1…e5 — the Englund Gambit, an unsound bid for cheap tricks. You grabbed the pawn with dxe5 and now just develop classically: Nf3, Nc3, and a broad e4-centre. Black scrambles to win the pawn back, but his queen is stranded on e7 and his pieces are loose — whatever he throws at you here, you come out with the centre, the development lead, and a clearly better game.",
    sayShort: 'Englund refuted — build the e4 centre.',
  },
  beats: [
    { atMove: 8, say: "e4 — the refutation in a single move. Black has clawed the pawn back, but you've planted a broad centre with the knight on c3 behind it and a clean lead in development, while his queen still languishes on e7. The Englund's tricks are spent; you are simply better.", highlights: [H('e4', KEY), H('e7', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
};

export const SUBLINE_NARRATION_HELP_B: Record<string, SN> = {
  // anti-Englund (var-0 e4-centre cluster)
  'anti-englund::0::Nxf3+@9': ANTI_ENGLUND,
  'anti-englund::0::Nf6@9': ANTI_ENGLUND,
  'anti-englund::0::d6@9': ANTI_ENGLUND,
  'anti-englund::0::Nc6@9': ANTI_ENGLUND,
  'anti-englund::0::Nf6@11': ANTI_ENGLUND,
  'anti-englund::0::d6@11': ANTI_ENGLUND,
  'anti-englund::0::d5@11': ANTI_ENGLUND,
  'anti-englund::0::Nxf3+@11': ANTI_ENGLUND,
  'anti-englund::0::g6@11': ANTI_ENGLUND,
  'anti-englund::0::h6@11': ANTI_ENGLUND,
  // anti-Budapest
  'anti-budapest::0::g5@7': AB_G5,
  'anti-budapest::2::g5@7': AB_G5,
  'anti-budapest::0::Bb4+@7': AB_BB4,
  'anti-budapest::1::Bb4+@7': AB_BB4,
  'anti-budapest::1::Nc6@7': AB_NC6,
  'anti-budapest::2::Nc6@7': AB_NC6,
  'anti-budapest::1::Nc6@9': AB_G5,
  'anti-budapest::0::Ne4@5': AB_NE4,
  'anti-budapest::1::Ne4@5': AB_NE4,
  'anti-budapest::2::Ne4@5': AB_NE4,
  // Albin Counter-Gambit — move-14 tabiya cluster (all var 0)
  'albin-countergambit::0::Nbd2@14': ALBIN_TABIYA,
  'albin-countergambit::0::a3@14': ALBIN_TABIYA,
  'albin-countergambit::0::Qa4@14': ALBIN_TABIYA,
  'albin-countergambit::0::Bf4@14': ALBIN_TABIYA,
  'albin-countergambit::0::Bg5@14': ALBIN_TABIYA,
  'albin-countergambit::0::b3@14': ALBIN_TABIYA,
  'albin-countergambit::0::Re1@14': ALBIN_TABIYA,
  // Staunton Gambit vs Dutch
  'anti-dutch-staunton::0::d5@5': STAUNTON_D5,
  'anti-dutch-staunton::1::d5@5': STAUNTON_D5,
  'anti-dutch-staunton::2::d5@5': STAUNTON_D5,
  'anti-dutch-staunton::0::e6@7': STAUNTON_E6,
  'anti-dutch-staunton::1::e6@7': STAUNTON_E6,
  'anti-dutch-staunton::2::e6@7': STAUNTON_E6,
  'anti-dutch-staunton::0::g6@7': STAUNTON_F3,
  'anti-dutch-staunton::2::g6@7': STAUNTON_F3,
  'anti-dutch-staunton::0::c6@7': STAUNTON_F3,
  'anti-dutch-staunton::1::c6@7': STAUNTON_F3,
  'anti-dutch-staunton::1::Nc6@7': STAUNTON_NC6,
  'anti-dutch-staunton::2::Nc6@7': STAUNTON_NC6,
};
