import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Hikaru Nimzo-Larsen + Réti (student WHITE), the b3 /
// Bb2 hypermodern systems. Grounded in his own teaching (transcripts reference-
// only, prose original, house voice). Core plan: b3 and Bb2 on the long
// diagonal, e3/Nf3, then undermine Black's centre with c4 and d4 and manoeuvre.
// Board-safe forward-looking plans. Keyed by deviation.

const NL = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Larsen%27s_Opening'];
const RE = ['concept:pos-center', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'];

export const SUBLINE_NARRATION_PRO_HIKARU_B3: Record<string, SublineNarration> = {
  'pro-hikaru-nimzo-larsen::0::g6@5': {
    intro: { say: "g6 — Black fianchettos against your Larsen. Strike the centre with d4, opening the long diagonal for your Bb2; develop Nf3 and Be2, and the pressure down the a1-h8 diagonal gives active, hypermodern play.", sayShort: 'g6 — d4 opens the diagonal, develop.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::1::e6@5': {
    intro: { say: "e6 — Black plays solidly. Develop e3, Be2 and c4, building the flexible Réti-Larsen structure; pressure d5 with c4 and the Bb2, and manoeuvre for the central break. A comfortable, low-theory game.", sayShort: 'e6 — e3 and c4, pressure d5.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::1::c5@5': {
    intro: { say: "c5 — Black claims queenside space. Develop e3, Be2, and prepare c4 or d4; the Bb2 eyes the long diagonal and your flexible pieces handle the broad Black centre. Hypermodern manoeuvring.", sayShort: 'c5 — e3, then c4 or d4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::3::d5@5': {
    intro: { say: "d5 — Black builds a broad centre. Develop e3, Be2 and c4, undermining d5; your Bb2 pressures from the flank and c4 chips at the centre. Flexible, low-risk manoeuvring.", sayShort: 'd5 — e3 and c4, undermine it.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::4::e6@5': {
    intro: { say: "e6 — Black mirrors your double fianchetto. Play g3 and Bg2, completing your own setup; against the symmetric structure the extra tempo lets you break first with c4 or d4. Manoeuvre patiently, then strike.", sayShort: 'e6 — g3 and Bg2, break first.' }, sources: NL,
  },
  'pro-hikaru-reti::1::c5@7': {
    intro: { say: "c5 — Black stakes the queenside. Play c4, developing into a Réti/English structure; your Bb2 and the pressure down the c-file and long diagonal give a comfortable game. Manoeuvre and break when ready.", sayShort: 'c5 — c4, into a Réti structure.' }, sources: RE,
  },
  'pro-hikaru-reti::1::g6@5': {
    intro: { say: "g6 — Black double-fianchettos. Play c4 and g3 with Bg2, a Catalan-Réti structure; pressure d5 with c4 and both bishops on the long diagonals. Flexible, positional, one-sided manoeuvring.", sayShort: 'g6 — c4 and g3, pressure d5.' }, sources: RE,
  },
  'pro-hikaru-reti::2::d6@5': {
    intro: { say: "d6 — Black plays solidly against your …c5 line. Strike with d4, opening the position for your Bb2; develop Be2 or g3 and Bg2 and castle, pressing with the long-diagonal bishop. A comfortable Réti-into-open game.", sayShort: 'd6 — d4 opens it, the Bb2 fires.' }, sources: RE,
  },
};
