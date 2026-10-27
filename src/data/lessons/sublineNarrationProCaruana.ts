import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Fabiano Caruana repertoire: Ruy Lopez + Italian
// (student WHITE); Nimzo-Indian, Taimanov Sicilian, French, Caro-Kann, King's
// Indian (student BLACK). House voice, board-safe, line-grounded. Every entry
// answers the opponent's frequent deviation with the student-side plan.

const RUY = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];
const NIM = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'];
const TAI = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const FR = ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'];
const CK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const KID = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'];
const RUY_D6_7: SublineNarration = {
  intro: { say: "d6 — the Modern Steinitz. After O-O build with c3 and d4, and if …b5 comes retreat Bc2; you get a broad centre while Black's setup stays a touch passive. Space and the bishop pair give an easy, lasting edge.", sayShort: 'd6 — O-O, c3 and d4.' }, sources: RUY,
};

export const SUBLINE_NARRATION_PRO_CARUANA: Record<string, SublineNarration> = {
  'pro-caruana-ruy-lopez::0::d6@7': RUY_D6_7,
  'pro-caruana-ruy-lopez::2::d6@7': RUY_D6_7,
  'pro-caruana-nimzo-indian::0::a3@8': {
    intro: { say: "a3 — White forces the bishop to declare. Trade …Bxc3+, saddling White with doubled c-pawns, then blockade with …d6 and …e5 and pile on the weaknesses; the classic Nimzo bargain, and it falls in your favour.", sayShort: 'a3 — …Bxc3+, then blockade.' }, sources: NIM,
  },

  // ===== Taimanov Sicilian (student BLACK) =====
  'pro-caruana-taimanov::0::g3@10': {
    intro: { say: "g3 — the fianchetto Taimanov, White eyeing the light squares. Answer …Bb4 pinning, then …Nf6 and …d5 breaking; you develop fast and fight for the centre before the bishop settles on g2. Active, balanced play.", sayShort: 'g3 — …Bb4, then …Nf6 and …d5.' }, sources: TAI,
  },
  'pro-caruana-taimanov::0::Be3@10': {
    intro: { say: "Be3 — the English-Attack Taimanov. Expand at once with …b5, …Bb7 and …Ne5 hitting the d3-bishop; your queenside space and the Sicilian counterplay give a sharp, double-edged game where Black's pawns roll first.", sayShort: 'Be3 — …b5 and …Bb7, expand.' }, sources: TAI,
  },
  'pro-caruana-taimanov::0::f4@10': {
    intro: { say: "f4 — White grabs kingside space, aiming for e5. Undermine with …b5 and …Bb7 on the long diagonal, and meet e5 with …dxe5 or a knight retreat; the overextended f- and e-pawns become targets for your fast queenside play.", sayShort: 'f4 — …b5 and …Bb7, undermine.' }, sources: TAI,
  },
  'pro-caruana-taimanov::0::a3@12': {
    intro: { say: "a3 — White prevents …Bb4 and prepares a slow build. Just expand: …b5, …Bb7 and …d6, with the standard queenside pawn storm; White's tempo on a3 gives you the time to complete the Sicilian setup comfortably.", sayShort: 'a3 — …b5 and …Bb7, expand.' }, sources: TAI,
  },

  // ===== French (student BLACK) — Winawer / Advance / Tarrasch / Exchange =====
  'pro-caruana-french::0::Ne2@6': {
    intro: { say: "Ne2 — the Alekhine-Maróczy Gambit, White offering e4 for the bishop pair. Grab it with …dxe4, and after a3 retreat …Be7 rather than trade; you return the pawn with …Nf6 and reach a solid, comfortable French, a tempo's worth ahead.", sayShort: 'Ne2 — …dxe4, then …Be7 and …Nf6.' }, sources: FR,
  },
  'pro-caruana-french::0::Nf3@12': {
    intro: { say: "Nf3 — the Positional Winawer, White developing quietly after the pawns are fixed. Continue …Bd7, …Qa4 or …Nbc6 and …c4, clamping the queenside; your play against the doubled c-pawns and the …f6 break give the classic Winawer edge.", sayShort: 'Nf3 — …Bd7 and …c4, clamp.' }, sources: FR,
  },
  'pro-caruana-french::0::Bd2@8': {
    intro: { say: "Bd2 — the Bogoljubow, White unpinning to recapture on c3 with the bishop and keep the structure. Play …Ne7, …b6 and …Ba6, trading off your bad light bishop; you neutralise White's only edge and reach a healthy game.", sayShort: 'Bd2 — …Ne7 and …b6, trade bishops.' }, sources: FR,
  },
  'pro-caruana-french::0::h4@12': {
    intro: { say: "h4 — the sharp h4 Winawer, White grabbing kingside space. Play …Qc7 hitting e5 and …b6 with …Ba6, targeting the c-pawns and the e5-chain; the wild structure favours the side that strikes the base first, and that is you.", sayShort: 'h4 — …Qc7 and …b6, hit e5.' }, sources: FR,
  },
  'pro-caruana-french::0::a4@12': {
    intro: { say: "a4 — White gains queenside space and eyes Ba3. Continue …Nbc6, …Qa5 and …c4 or …f6, breaking at the head or the base of the chain; the doubled c-pawns stay weak and Black's plan runs itself.", sayShort: 'a4 — …Nbc6, then …c4 or …f6.' }, sources: FR,
  },
  'pro-caruana-french::1::a3@10': {
    intro: { say: "a3 — White prepares b4 and Bd3 in the Advance. Strike the head of the chain with …f6, opening lines for your pieces, while …Qb6 and …Nge7-f5 gang up on d4; the French counterattack against e5 and d4 is thematic and strong.", sayShort: 'a3 — …f6, then …Nf5 hits d4.' }, sources: FR,
  },
  'pro-caruana-french::1::dxc5@10': {
    intro: { say: "dxc5 — White releases the tension, handing you the d4-square. Recapture …Bxc5, and the bishop rakes toward f2 while …Nge7-g6 and …f6 pressure e5; with the chain gone Black is comfortably active.", sayShort: 'dxc5 — …Bxc5, then …f6 hits e5.' }, sources: FR,
  },
  'pro-caruana-french::2::Bd3@6': {
    intro: { say: "Bd3 — the Morozevich Tarrasch, White developing actively. Strike …c5 at once, and after dxc5 regain the pawn with …Nf6 and …Nbd7; you free your game and reach an open, comfortable French with no bad bishop.", sayShort: 'Bd3 — …c5, then …Nf6 regains it.' }, sources: FR,
  },
  'pro-caruana-french::2::e5@6': {
    intro: { say: "e5 — White grabs the centre early in the Tarrasch. Undermine at once with …c5 and …Nc6, then …Qb6 and …f6, striking the base and the head of the chain; the classic French plan against e5-d4 gives full counterplay.", sayShort: 'e5 — …c5 and …Nc6, undermine.' }, sources: FR,
  },
  'pro-caruana-french::2::c3@6': {
    intro: { say: "c3 — White props d4 quietly. Play …c5 and after dxc5 …Bxc5, developing the bishop actively toward f2, then …Nf6 and …O-O; you equalise cleanly with the freer game and no bad bishop.", sayShort: 'c3 — …c5, then …Bxc5 active.' }, sources: FR,
  },
  'pro-caruana-french::3::Bd3@6': {
    intro: { say: "Bd3 — the Exchange French, symmetrical with a drawish reputation. Do not wait for the draw: mirror …Bd6 and …Ne7, then seize a file with …Re8, find the better minor piece, and manufacture the imbalance. Black outplays, not out-waits.", sayShort: 'Bd3 — mirror, then outplay actively.' }, sources: FR,
  },
  'pro-caruana-french::3::c4@6': {
    intro: { say: "c4 — the Monte Carlo Exchange, White giving themselves an isolated queen's pawn. Develop …Nf6, …Be7 and …O-O, then blockade d5 with …Nb6 or …Nbd7-b6 and press the isolated pawn; classic isolated-pawn technique in Black's favour.", sayShort: 'c4 — blockade d5, press the IQP.' }, sources: FR,
  },
  'pro-caruana-french::3::c4@8': {
    intro: { say: "c4 — White opens the Exchange into an IQP after …Bb4+. Keep the pin with …Bb4+ and Nc3, then …O-O and blockade d5; you press the isolated pawn with pieces, the reliable route to a Black edge.", sayShort: 'c4 — …Bb4+, blockade and press.' }, sources: FR,
  },
  'pro-caruana-french::3::Bg5@8': {
    intro: { say: "Bg5 — White pins in the Exchange. Break it calmly with …Be7 and …O-O, then …Re8, …c6 and …Bf5 or …Ne4; equal, but Black's straightforward development lets you play for the small imbalance first.", sayShort: 'Bg5 — …Be7 and …O-O, then …Re8.' }, sources: FR,
  },
  'pro-caruana-french::3::h3@8': {
    intro: { say: "h3 — a quiet luft in the Exchange. Mirror with …Bd6 and …O-O, contest the e-file with …Re8, and pick the better square for each piece; the symmetry breaks in favour of whoever plays actively, and that is you.", sayShort: 'h3 — …Bd6, contest the e-file.' }, sources: FR,
  },

  // ===== Caro-Kann (student BLACK) — Advance / Panov / Exchange =====
  'pro-caruana-caro-kann::0::Nc3@6': {
    intro: { say: "Nc3 — the Van der Wiel Attack, White lunging with g4 and h4 to trap your bishop. Stay calm: …e6, then …Bg6 tucking the bishop safe, …h5 fixing the pawns, and …c5 striking the centre; White's committed pawns become targets. Wild but sound for Black.", sayShort: 'Nc3 — …Bg6 and …h5, then …c5.' }, sources: CK,
  },
  'pro-caruana-caro-kann::0::Nd2@6': {
    intro: { say: "Nd2 — a flexible Advance setup. Continue …e6 and …Nd7, meet Nb3 by holding firm, and reroute …Ne7-g6 hitting e5 before the …c5 break; your bishop is already outside on f5, a comfortable Caro.", sayShort: 'Nd2 — …e6 and …Nd7, then …c5.' }, sources: CK,
  },
  'pro-caruana-caro-kann::0::Be3@6': {
    intro: { say: "Be3 — White supports d4 in the Advance. Develop …e6 and …Nd7, then …Ne7-g6 pressuring e5 and the …c5 break; nothing changes the plan — undermine the chain while your light bishop stays active outside it.", sayShort: 'Be3 — …e6 and …Nd7, then …c5.' }, sources: CK,
  },
  'pro-caruana-caro-kann::0::c3@10': {
    intro: { say: "c3 — White props d4 in the Short Advance. Develop …Nc6 and …Qb6, pressuring d4 and b2, then …Nge7-f5 or …cxd4; your active bishop on f5 and the pressure on the base give an easy game.", sayShort: 'c3 — …Nc6 and …Qb6, press d4.' }, sources: CK,
  },
  'pro-caruana-caro-kann::0::c4@12': {
    intro: { say: "c4 — White plays sharply, and it drops b2. Grab it with …Qxb2, then scramble the queen home via …Qc3 or …Qa3 while you finish developing; the extra pawn is real, but keep the queen safe and do not get greedy. Concrete and well-known.", sayShort: 'c4 — …Qxb2, then retreat the queen.' }, sources: CK,
  },
  'pro-caruana-caro-kann::1::c4@6': {
    intro: { say: "c4 — the Panov, an isolated-pawn battle. Develop …Nf6, …e6 and …Bb4 pinning; you blockade d5, trade pieces, and press the isolated d-pawn into the endgame. Classic anti-IQP technique, comfortable for Black.", sayShort: 'c4 — Panov; blockade and press.' }, sources: CK,
  },
  'pro-caruana-caro-kann::1::h3@10': {
    intro: { say: "h3 — a quiet Exchange Caro. Fianchetto with …g6 and …Bg7, castle, and use the half-open c-file with …Rc8; the symmetric structure is level, but Black's easy development lets you press for the small edge.", sayShort: 'h3 — …g6 and …Bg7, then …Rc8.' }, sources: CK,
  },
  'pro-caruana-caro-kann::1::Nf3@6': {
    intro: { say: "Nf3 — the calm Exchange Caro. Develop …Nc6, …Nf6 and …Bg4 or …Bf5, getting the light bishop active outside the chain; the equal structure gives Black a comfortable, weakness-free game to outplay from.", sayShort: 'Nf3 — …Bg4 or …Bf5, active bishop.' }, sources: CK,
  },

  // ===== King's Indian Defence (student BLACK) =====
  'pro-caruana-kid::0::f3@8': {
    intro: { say: "f3 — the Sämisch, White's big-centre bind with f3 supporting e4. Castle and break the standard ways: …e5 or …c5, and if White locks with d5, launch …c6 and …b5 on the queenside or …f5 at the king. A rich, double-edged fight.", sayShort: 'f3 — castle, then …c5 or …e5.' }, sources: KID,
  },
  'pro-caruana-kid::0::h3@8': {
    intro: { say: "h3 — the Makogonov, White clamping g4 and preparing Be3, Nge2. Castle and strike …e5 or …c5; if the centre locks, the …f5 break and the kingside storm are your game, and h3 becomes a target for …h5-h4 later.", sayShort: 'h3 — castle, then …e5 and …f5.' }, sources: KID,
  },
  'pro-caruana-kid::0::f4@8': {
    intro: { say: "f4 — the Four Pawns Attack, White's most violent KID try with four pawns across the board. The overextension is the flaw: counterstrike …c5 and …e5, and if White pushes past, …Re8 and …Bg4 pile on; the proud centre becomes a row of targets.", sayShort: 'f4 — counterstrike …c5, then …e5.' }, sources: KID,
  },
};
