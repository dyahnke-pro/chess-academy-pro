import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration for the Naroditsky Caro-Kann (student BLACK) — every
// frequent opponent deviation across all variations, grounded in his own Caro
// teaching video (transcript reference-only, prose original, house voice).
// Keyed `${openingId}::${variationIndex}::${triggerMove}@${atPly}`. Intros carry
// the when-to-play + the idea + the plan (the soul of the app); the line plays
// out on the board beneath. Sources = the public-domain concept corpus + Caro refs.

const S = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const SC = ['concept:pos-center', 'https://www.chess.com/openings/Caro-Kann-Defense'];
const SA = ['concept:pos-center', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation'];

export const SUBLINE_NARRATION_PRO_NAR_CARO: Record<string, SublineNarration> = {
  // [0] Two Knights (Nc3)
  'pro-naroditsky-caro-kann::0::Ng3@8': {
    intro: { say: "Ng3 — White nudges the knight back, eyeing f5 and your h5-square. Seize the initiative on the flank: …h5, and after h3, …h4 kicks the knight offside. You gain kingside space for free and White’s pieces end up shoved around while your structure stays flawless.", sayShort: 'Ng3 — gain space with h5 and h4.' }, sources: S,
  },
  'pro-naroditsky-caro-kann::0::Nxf6+@8': {
    intro: { say: "Nxf6 — White trades knights, and you recapture toward the centre with …exf6. The doubled f-pawns look odd, but they hand you the half-open e-file, the two bishops, and a rock-solid centre. This resilient structure is a Caro staple — comfortable, and famously hard to crack.", sayShort: 'Nxf6 — recapture exf6, open the e-file.' }, sources: S,
  },
  'pro-naroditsky-caro-kann::0::d4@12': {
    intro: { say: "d4 — White builds the centre in the queen-sortie line. Simply develop: …Nf6 hits the queen with tempo, then …Bf5 or …g6 and castle. Black’s structure is spotless and White’s early queen moves have already cost precious time.", sayShort: 'd4 — Nf6 hits the queen, develop.' }, sources: S,
  },
  'pro-naroditsky-caro-kann::0::Bd3@18': {
    intro: { say: "Bd3 — deep in the Two Knights, White completes a natural setup. Keep rolling your plan: …b5 has grabbed queenside space, so follow with …Bb7 and …a5, expanding while your solid structure holds firm. A pleasant middlegame with space and no weaknesses.", sayShort: 'Bd3 — expand with b5 and Bb7.' }, sources: S,
  },
  // [1] KIA (Nf3)
  'pro-naroditsky-caro-kann::1::exd5@6': {
    intro: { say: "exd5 — White clarifies the centre in the quiet Nf3 setup. Recapture …cxd5 and use the open c-file your queen already eyes from c7; then …Nf6, …e6, and the active …Bb4 pin. Black develops freely with an easy, open game.", sayShort: 'exd5 — recapture, use the c-file.' }, sources: S,
  },
  'pro-naroditsky-caro-kann::1::Nxe4@8': {
    intro: { say: "Nxe4 — White recaptures in the Nc3 line. Trade with …Nf6 challenging the knight, then …Nbd7 and a solid classical setup. No weaknesses, easy development — the Caro doing exactly what it does best.", sayShort: 'Nxe4 — Nf6 and Nbd7, stay solid.' }, sources: S,
  },
  // [2] Exchange (exd5)
  'pro-naroditsky-caro-kann::2::Nf3@6': {
    intro: { say: "Nf3 — quiet Exchange development, nothing to fear. Continue …Nf6 and …Nc6, and get your light bishop out to g4 or f5 before you ever play …e6. Symmetrical and comfortable — you equalise with clean development and outplay from there.", sayShort: 'Nf3 — develop, bishop out before e6.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::2::h3@8': {
    intro: { say: "h3 — White spends a move to stop …Bg4 in the Exchange. No matter: strike the centre with …e5, and after the trade your pieces spring to life. …Nxe5 centralises the knight and Black is fully equal with the more active game.", sayShort: 'h3 — hit back with e5.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::2::c3@6': {
    intro: { say: "c3 — a slow Exchange setup. Develop naturally and prepare the …e5 break; once it lands, …Nxe5 centralises and Black takes the freer game. White’s passivity is exactly what invites the central strike.", sayShort: 'c3 — prepare and play e5.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::2::Ne2@10': {
    intro: { say: "Ne2 — White reroutes the knight to sidestep the …Bg4 pin. Keep developing: your bishop is already active on g4, so continue …e6, …Bd6 and castle. A comfortable, symmetrical Exchange where Black stands perfectly well.", sayShort: 'Ne2 — develop, the bishop is active.' }, sources: SC,
  },
  // [3] Classical (Nc3)
  'pro-naroditsky-caro-kann::3::Bd3@10': {
    intro: { say: "Bd3 — White develops and dreams of Qh5 on the kingside. Meet it calmly: …Bd6 covers the key squares, and …Qe7-check lets you trade queens or blunt the attack. The doubled f-pawns give you the half-open e-file and the bishop pair — solid, and better in the long run.", sayShort: 'Bd3 — Bd6, then check on e7.' }, sources: S,
  },
  'pro-naroditsky-caro-kann::3::Bc4@10': {
    intro: { say: "Bc4 — White develops actively with a check on e2. Block with …Be7, keep your solid structure and the bishop pair, and untangle with …O-O and …Re8 down the half-open e-file. Comfortable and resilient.", sayShort: 'Bc4 — block Be7, then castle.' }, sources: S,
  },
  'pro-naroditsky-caro-kann::3::Ne2@14': {
    intro: { say: "Ne2 — White completes a quiet setup. Keep improving the position: your …Bd6 and castled king are secure, so play …Re8 for the e-file and reroute the knight …Nd7-f8-g6. A pleasant, solid Caro middlegame with the two bishops in hand.", sayShort: 'Ne2 — Re8 and regroup the knight.' }, sources: S,
  },
  'pro-naroditsky-caro-kann::3::Nf3@10': {
    intro: { say: "Nf3 — natural development in the Classical. With the recapture done, continue …Bd6 and castle; the half-open e-file and the bishop pair give Black a comfortable, resilient game with no weaknesses to nurse.", sayShort: 'Nf3 — Bd6 and castle, stay solid.' }, sources: S,
  },
  // [5] Modern transposition (d4 g6)
  'pro-naroditsky-caro-kann::5::c4@4': {
    intro: { say: "c4 — White grabs a big centre against your …g6 Modern setup. Play flexibly: …d6, …Nf6, castle, then prepare the …e5 or …c5 break to strike back. It is a King’s-Indian-flavoured game — invite the space, then counter it.", sayShort: 'c4 — develop, then break e5 or c5.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::5::Nf3@4': {
    intro: { say: "Nf3 — White develops toward a broad pawn centre. Challenge it at once with …d5, and after e5, …c5 hits the base of the chain. You play against the advanced pawns in true Caro-Modern style — provoke, then undermine.", sayShort: 'Nf3 — strike with d5 and c5.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::5::f4@6': {
    intro: { say: "f4 — the aggressive Austrian-style front. Strike the centre with …d5, and after e5 reroute the knight via …Nh6-f5 to pressure d4 and the dark squares. Meet the big centre with piece pressure and the …c5 break.", sayShort: 'f4 — hit d5, reroute Nh6-f5.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::5::h3@6': {
    intro: { say: "h3 — a restrained setup. Break with …d5 and trade on e4, then …Nf6 develops with tempo. The quiet h3 hands you the time to equalise comfortably with clean, natural development.", sayShort: 'h3 — break d5, then Nf6.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::5::Be3@6': {
    intro: { say: "Be3 — White develops and holds the centre. Strike with …d5, and after e5 the knight reroutes via …Nh6-f5 to hit d4 and the e3-bishop. Standard Modern-Caro counterplay against the broad pawn front.", sayShort: 'Be3 — d5, then Nh6-f5.' }, sources: SC,
  },
  // [6] Advance (3.e5 c5)
  'pro-naroditsky-caro-kann::6::a3@8': {
    intro: { say: "a3 — White stops …Bb4 and prepares Qg4 in the Advance. Recapture the pawn with …Bxc5, meet Qg4 with …Ne7 defending g6, then …Nbc6. Black regains the pawn with an active, fully equal game — the Advance holds no fears.", sayShort: 'a3 — Bxc5, then Ne7 and Nbc6.' }, sources: SA,
  },
  'pro-naroditsky-caro-kann::6::Be3@8': {
    intro: { say: "Be3 — White tries to hang on to the extra c5-pawn. Round it up: …Nd7 and …Bxc5 regain it while you develop. The resulting position is comfortable, with Black’s pieces active and the centre firmly contested.", sayShort: 'Be3 — Nd7 and Bxc5, regain it.' }, sources: SA,
  },
  'pro-naroditsky-caro-kann::6::a3@10': {
    intro: { say: "a3 — White prevents …Bb4 after you regain the pawn. Continue …Nd7, developing toward the queenside and the …b5 expansion. A balanced Advance middlegame where Black is comfortably placed and ready to push on the flank.", sayShort: 'a3 — Nd7, prepare b5.' }, sources: SA,
  },
  'pro-naroditsky-caro-kann::6::c3@6': {
    intro: { say: "c3 — White props up d4 solidly. Develop actively: …Nc6, …Bg4 pinning, and after the trades …e6 gives a sound French-like structure. Black is a touch passive but rock-solid, with the pin doing real work.", sayShort: 'c3 — Nc6 and Bg4, stay solid.' }, sources: SA,
  },
  'pro-naroditsky-caro-kann::6::Qg4@8': {
    intro: { say: "Qg4 — White lunges the queen at g7. Defend simply: …Nd7 covers, then …Nxc5 regains the pawn and …a6 prepares queenside space. The premature queen sortie only hands Black time and targets.", sayShort: 'Qg4 — Nd7 defends, then Nxc5.' }, sources: SA,
  },
  'pro-naroditsky-caro-kann::6::Bd3@8': {
    intro: { say: "Bd3 — White develops and eyes Qg4. Take the pawn with …Bxc5, meet Qg4 with …Ne7 guarding g6, and complete development. Black regains the material and stands comfortably, with the initiative already changing hands.", sayShort: 'Bd3 — Bxc5, then Ne7.' }, sources: SA,
  },
  'pro-naroditsky-caro-kann::6::Re1@14': {
    intro: { say: "Re1 — White shores up the e5-wedge deep in the Advance. Continue the plan: …Ng6 hits e5, then …O-O and pile pieces onto the wedge. A rich, balanced middlegame where Black’s pressure on e5 is the story.", sayShort: 'Re1 — Ng6, pressure the wedge.' }, sources: SA,
  },
  'pro-naroditsky-caro-kann::6::a3@12': {
    intro: { say: "a3 — White prevents …Nb4 and …Bb4. Keep developing: …Nge7-g6 targets e5, then castle. Black is fully equal with active piece play against the wedge and an easy game to conduct.", sayShort: 'a3 — Nge7-g6, hit e5.' }, sources: SA,
  },
  // [7] Advance (3.e5 Bf5)
  'pro-naroditsky-caro-kann::7::h4@6': {
    intro: { say: "h4 — the aggressive Tal thrust, going straight at your bishop. Counter in the centre with …c5, and after the trades your open b-file and the bishop pair give real, lasting play. Sharp, but Black’s activity fully compensates.", sayShort: 'h4 — strike back with c5.' }, sources: SA,
  },
  // [8] Panov (4.c4)
  'pro-naroditsky-caro-kann::8::Bd3@6': {
    intro: { say: "Bd3 — the critical Exchange setup, the bishop trained on h7. Neutralise it precisely: …Nf6, …Bg4 pinning, and …Qc7 covering the b1-h7 diagonal before White builds a battery. Accurate move-order defuses it and Black equalises cleanly.", sayShort: 'Bd3 — Bg4 and Qc7, blunt the diagonal.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::8::Nf3@6': {
    intro: { say: "Nf3 — quiet development in the Exchange. Continue …Nf6, …Nc6, and get the light bishop out before …e6. Symmetrical, comfortable, and easy to play from equality.", sayShort: 'Nf3 — develop, bishop out early.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::8::Nf3@10': {
    intro: { say: "Nf3 — the true Panov, White developing behind an isolated d-pawn. Blockade it: …Nc6 and later …Nd5 sit squarely in front of the IQP, then trade pieces to press the weakness in the endgame. Textbook anti-isolani technique.", sayShort: 'Nf3 — blockade the isolated pawn.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::8::c3@6': {
    intro: { say: "c3 — a modest Exchange build. Develop …Nf6 and …Nc6 and prepare the …e5 or …Bg4 ideas; Black comfortably equalises against the passive setup and can even play for more.", sayShort: 'c3 — develop, prepare e5.' }, sources: SC,
  },
  // [9] d3 sideline
  'pro-naroditsky-caro-kann::9::Ngf3@6': {
    intro: { say: "Ngf3 — a quiet King’s-Indian-Attack in reverse. You already own a fine centre with …d5 and …e5, so continue …Bd6, …Nf6 and castle. Black is comfortable, even preferable — the extra central space quietly tells.", sayShort: 'Ngf3 — Bd6 and Nf6, you are comfortable.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::9::Nf3@4': {
    intro: { say: "Nf3 — White develops in the d3 sideline. Pin with …Bg4, and after the trade develop …Nf6 and …e6 solidly; even if White lunges with g4-g5, your compact position holds and the over-extended pawns become targets.", sayShort: 'Nf3 — pin with Bg4, stay compact.' }, sources: SC,
  },
  'pro-naroditsky-caro-kann::9::Ne2@10': {
    intro: { say: "Ne2 — White finishes a passive KIA setup. You are already the better side: …d5 and …e5 hand you a strong centre, so continue …O-O and …Re8 and expand. A pleasant, space-based edge for Black straight out of the opening.", sayShort: 'Ne2 — castle and expand, you are better.' }, sources: SC,
  },
};
