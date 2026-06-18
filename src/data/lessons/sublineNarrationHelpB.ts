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

export const SUBLINE_NARRATION_HELP_B: Record<string, SN> = {
  'anti-budapest::0::g5@7': AB_G5,
  'anti-budapest::2::g5@7': AB_G5,
  'anti-budapest::0::Bb4+@7': AB_BB4,
  'anti-budapest::1::Bb4+@7': AB_BB4,
  'anti-budapest::1::Nc6@7': AB_NC6,
  'anti-budapest::2::Nc6@7': AB_NC6,
  'anti-budapest::1::Nc6@9': AB_G5, // Nc6@9 is the …g5 main line — same teaching
  'anti-budapest::0::Ne4@5': AB_NE4,
  'anti-budapest::1::Ne4@5': AB_NE4,
  'anti-budapest::2::Ne4@5': AB_NE4,
};
