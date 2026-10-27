import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Hikaru Caro-Kann + Pirc/Modern (student BLACK) and
// Closed Sicilian (student WHITE). Transcript-grounded, house voice, board-safe.
// Several Pirc lines are teach-both: the natural move drifts, so the intro names
// the accurate engine move (…d6/…d5/…e6 first) before Black expands.

const CK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const PM = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Modern_Defense'];
const CS = ['concept:pos-king-safety', 'https://www.chess.com/openings/Closed-Sicilian'];

export const SUBLINE_NARRATION_PRO_HIKARU_B: Record<string, SublineNarration> = {
  // ===== Caro-Kann (Black) =====
  'pro-hikaru-caro-kann::0::Nc3@6': {
    intro: { say: "Nc3 — the sharp Advance with an early kingside push. After …e6, meet g4 with …Bg6, and if h4 comes, …h5 fixes the pawns; then strike the centre with …c5. Your light bishop is safe on g6 and White's committed pawns become targets. Wild but sound.", sayShort: 'Nc3 — …Bg6 and …h5, then …c5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::0::Nd2@6': {
    intro: { say: "Nd2 — a flexible Advance setup. Continue …e6 and …Nd7, and meet Nb3 by holding the centre; develop …Ne7-g6 hitting e5, and prepare the …c5 break. Your bishop is already outside on f5 — a comfortable Caro.", sayShort: 'Nd2 — …e6 and …Nd7, then …c5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::1::c4@6': {
    intro: { say: "c4 — the Panov, an isolated-pawn battle from the Exchange. Develop …Nf6, …e6 and …Bb4 pinning; you blockade d5, trade pieces, and press the isolated d-pawn in the endgame. Classic anti-IQP technique.", sayShort: 'c4 — Panov; blockade and press the IQP.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::1::Bf4@10': {
    intro: { say: "Bf4 — White develops actively in the Exchange. Continue …Bg7, …O-O and …Nh5 or …Bf5 to challenge the bishop; your solid structure and the fianchetto give an easy, equal game.", sayShort: 'Bf4 — …Bg7 and …O-O, challenge it.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::2::Be2@10': {
    intro: { say: "Be2 — White develops after you trade on f3. Continue …Nf6, …Nbd7, …Bd6 and …O-O; you gave the bishop pair for a rock-solid structure with no weaknesses. The Caro's resilience shines — develop and equalise.", sayShort: 'Be2 — …Nf6 and …Bd6, stay solid.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::2::d4@10': {
    intro: { say: "d4 — White builds the centre in the Two Knights. Take …dxe4 and after Bxe4 develop …Nf6, …Nbd7 and …Bd6; your solid structure and the half-open lines give a comfortable game despite the bishop-pair concession.", sayShort: 'd4 — …dxe4, then develop solidly.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::2::g3@10': {
    intro: { say: "g3 — White fianchettos after winning the bishop pair. Continue …Nf6, …Nbd7, …Bd6 and …O-O; your compact structure holds firm against the long-diagonal bishop. Solid and resilient — the Caro way.", sayShort: 'g3 — …Nf6 and …Nbd7, hold firm.' }, sources: CK,
  },

  // ===== Pirc / Modern (Black) — several teach-both =====
  'pro-hikaru-pirc-modern::0::Nf3@6': {
    intro: { say: "Nf3 — White develops calmly against your …a6/…b5 Modern. The immediate …b5 push over-reaches here; the accurate move is …d6 first, solidifying before you expand. Play …d6, then …Nd7 and …e5 or …b5 — patient, and Black is fine.", sayShort: 'Nf3 — play …d6 first, then expand.' }, sources: PM,
  },
  'pro-hikaru-pirc-modern::0::a4@6': {
    intro: { say: "a4 — White stops your …b5 break. Adapt: …d6, …Bg4 pinning, and …Nd7 with …e5; when the queenside is shut, switch to the centre and kingside. The Modern is flexible — counter where White isn't.", sayShort: 'a4 — …d6 and …Bg4, hit the centre.' }, sources: PM,
  },
  'pro-hikaru-pirc-modern::0::h4@6': {
    intro: { say: "h4 — a sharp kingside lunge. Freeze it with …h5, then continue the queenside storm: …b5-b4 hitting the c3-knight while White's king lacks a safe home. A race, and the Modern's flank play is fast.", sayShort: 'h4 — …h5, then race …b5-b4.' }, sources: PM,
  },
  'pro-hikaru-pirc-modern::1::Bd3@6': {
    intro: { say: "Bd3 — White develops in the …c6/…d5 Modern. Strike with …d5, and after e5 develop the bishop OUTSIDE with …Bg4 before …e6; pin the knight and pressure the centre. Your light bishop stays active — a comfortable game.", sayShort: 'Bd3 — …d5, then …Bg4 outside.' }, sources: PM,
  },
  'pro-hikaru-pirc-modern::1::h3@6': {
    intro: { say: "h3 — White stops …Bg4. The natural continuation drifts; the accurate move is …d5 immediately, striking before White consolidates. Play …d5, then …c5 hitting the base and …f6 to break the e5-wedge. Precision keeps Black comfortable.", sayShort: 'h3 — strike …d5 at once.' }, sources: PM,
  },
  'pro-hikaru-pirc-modern::1::c3@6': {
    intro: { say: "c3 — a solid Modern setup. The immediate …d5 lets White clamp; the accurate move is …d6 first, keeping flexibility, then …Nd7 and …e5 to break the centre. Solid and patient — Black equalises.", sayShort: 'c3 — …d6 first, then …e5.' }, sources: PM,
  },
  'pro-hikaru-pirc-modern::1::c4@6': {
    intro: { say: "c4 — White grabs a big centre. Meet it in King's-Indian style: …d6, …Bg4 or …Nd7, and prepare …e5 to strike the centre. The Modern invites the space, then counters it. Provoke, then break.", sayShort: 'c4 — …d6, then …e5 breaks it.' }, sources: PM,
  },
  'pro-hikaru-pirc-modern::2::Be3@6': {
    intro: { say: "Be3 — White develops and holds the centre after your …c6/…d5. Reroute the knight via …Nh6-f5 to hit d4 and e3, then …c5 to break; your fianchetto bishop rakes the long diagonal. Standard Modern counterplay.", sayShort: 'Be3 — …Nh6-f5, then …c5.' }, sources: PM,
  },
  'pro-hikaru-pirc-modern::2::f4@6': {
    intro: { say: "f4 — the aggressive Austrian-style front. Strike …d5, and after e5 fix the kingside with …h5 and develop …Bg4 outside; then …c5 hits the base. Meet the big centre with piece pressure and the pawn break.", sayShort: 'f4 — …d5 and …h5, then …c5.' }, sources: PM,
  },

  // ===== Closed Sicilian (White) — Grand Prix f4-f5 =====
  'pro-hikaru-closed-sicilian::0::e6@5': {
    intro: { say: "e6 — Black plays a solid, French-like Closed setup. Develop Nf3 and Bb5 pinning, and prepare the f5 push; your Grand-Prix structure and the kingside storm give a dangerous, one-sided attacking game.", sayShort: 'e6 — Bb5, then the f5 storm.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::0::d6@5': {
    intro: { say: "d6 — Black plays a Dragon-style Closed. Develop Bc4, castle, and roll the f4-f5 storm; the Grand Prix's kingside attack against the fianchetto is your clear, aggressive plan.", sayShort: 'd6 — Bc4, castle, then f5.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::1::a6@7': {
    intro: { say: "a6 — Black prepares queenside expansion in the Closed. Continue g3 and Bg2, or Bb5 pinning; complete your Grand-Prix setup and roll the f4-f5 kingside storm. Your attacking blueprint gives dangerous, easy chances.", sayShort: 'a6 — g3 and Bg2, then f5.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::1::dxe4@9': {
    intro: { say: "dxe4 — Black opens the centre. Bxc6 doubles the pawns, then Nxe4 recaptures with a strong knight; your development lead and Black's damaged structure give a clear edge. Grab the initiative.", sayShort: 'dxe4 — Bxc6 doubles, Nxe4 strong.' }, sources: CS,
  },
};
