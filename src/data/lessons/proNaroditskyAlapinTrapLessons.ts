import type {
  LessonScript,
  LessonBeat,
  AnnotationHighlight,
  PlayableMiddlegameLine,
} from '../../types';
import { lessonToPlayableLine } from './index';

// Pro Naroditsky Alapin trap lessons — show→snap-back walkthroughs for
// the warningLines + trapLines in pro-repertoires.json. Replaces the
// legacy WalkthroughMode / DrillMode rendering (smaller board, code-
// generated SAN dictation) with the modern PlayableLinePlayer + hand-
// written per-beat narration. Every shown move is from a real game
// sequence (mined trap patterns or chess.js-validated antidotes) per
// §1 + §1b of the pro-rep deep build doctrine.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';

const H = (square: string, color: string = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const SRC = [
  'https://www.chess.com/openings/Alapin-Sicilian-Defense',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// =============================================================
// TRAPS — opponent slips, student punishes
// =============================================================

const NC3_QUEEN_TEMPO: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: 'Weapon: Nc3 wins tempo on the queen (Nc6 Line)',
  minutes: 3,
  orientation: 'white',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'nc3-setup',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5',
      highlights: [H('d5'), H('d4', SOFT)],
      say: "After the …d5 simplification, Black recaptures with the queen on d5. The queen is centralised and looks active — but she's the only developed piece, and our knight on b1 is about to make her uncomfortable.",
      sayShort: 'Black\'s queen sits on d5 — exposed.',
    }),
    b({
      id: 'nc3-develop',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 e6',
      highlights: [H('e6', SOFT)],
      say: "Black plays …e6 preparing development. Solid, but it doesn't address the queen's vulnerability. We develop the queen's knight next — and her position becomes the problem.",
      sayShort: 'Nf3 …e6 — solid but slow.',
    }),
    b({
      id: 'nc3-attack',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 e6 Nc3',
      highlights: [H('c3'), H('d5', ATK)],
      say: "Nc3 — and the queen has to move. This is the difference between our Alapin and a regular open Sicilian: c3 is a knight square now, and Nc3 develops AND attacks at the same time. Black has no good queen square that doesn't lose another tempo.",
      sayShort: 'Nc3! — develop with tempo.',
    }),
    b({
      id: 'nc3-retreat',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 e6 Nc3 Qd8',
      highlights: [H('d8')],
      say: "…Qd8 is the only safe square. The queen is back where she started, but we have two pieces developed and the c-file is wide open for our rook. Black has spent his entire opening just shuffling the queen back home — and that's how the Nc6 line scores 86.2% for us.",
      sayShort: '…Qd8 — back to start, two tempi lost.',
    }),
  ],
};

const BC4_GAMBIT_EXF7: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: 'Weapon: Bc4 Gambit + exf7+ (Nc6 block fails)',
  minutes: 4,
  orientation: 'white',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'bc4-setup',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4 Nb6',
      highlights: [H('c4'), H('e5', SOFT)],
      say: "Inside the …Nf6 spine, Black plays …d6 attacking the e5-pawn. Most beginners would play dxe5 here and transpose to safer territory. We don't — we develop Bc4 instead, eyeing f7 and offering the pawn as a gambit.",
      sayShort: 'Bc4 — ignore e5, aim at f7.',
    }),
    b({
      id: 'bc4-e6',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4 Nb6 e6',
      highlights: [H('e6'), H('f7', ATK)],
      say: "e6! — the pawn marches forward. We're not protecting it, we're using it as a wedge. The pawn touches f7 and Black has to react before we crack open the king. This is the signature move that 62 of his opponents — including Hans Niemann at 3161 — walked into.",
      sayShort: 'e6! — wedge against f7.',
    }),
    b({
      id: 'bc4-nxc4',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4 Nb6 e6 Nxc4 Qa4+ Nc6 exf7+ Kxf7',
      highlights: [H('f7', ATK), H('a4'), H('c6')],
      say: "Black grabs the bishop with …Nxc4 — and we play Qa4+! The check forces Black to interpose with …Nc6 (the only piece that can block). Then exf7+ Kxf7 — the king walks out to f7 and now sits exposed in the centre, with no kingside shelter and no castling rights.",
      sayShort: 'Qa4+ … exf7+ — king exposed.',
    }),
    b({
      id: 'bc4-recover',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bc4 Nb6 e6 Nxc4 Qa4+ Nc6 exf7+ Kxf7 Qxc4+ e6 O-O Qf6',
      highlights: [H('c4'), H('f7', SOFT)],
      say: "Qxc4+ recovers the bishop. Material is even, but Black's king is permanently on f7, the kingside is a wreck, and we get to castle for free while Black has to find precise defence with no king shelter. This is a forced sequence and Black's rating bucket almost never finds the right defence.",
      sayShort: 'Qxc4+ — even material, won position.',
    }),
  ],
};

const D5_OPEN_NB5: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: 'Weapon: Nb5 fork after cxd4 (d5 Open)',
  minutes: 3,
  orientation: 'white',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'nb5-setup',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3',
      highlights: [H('a3', SOFT), H('e3'), H('b5', SOFT)],
      say: "In the d5 Open, we play Na3 — a strange-looking knight move whose whole point is the trip to b5. Be3 supports d4 and waits for Black to commit. Black has to deal with the centre eventually, and the most natural move walks into the trap.",
      sayShort: 'Na3 + Be3 — Nb5 is loaded.',
    }),
    b({
      id: 'nb5-cxd4',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4',
      highlights: [H('d4', ATK)],
      say: "Black plays …cxd4 — completely natural, opens the c-file, looks safe. But the moment d4 is captured the b5-square opens up and the knight on a3 is ready to spring. 17 of Sam Shankland's games at 2934 ended with this exact moment going wrong.",
      sayShort: '…cxd4 — opens the trap door.',
    }),
    b({
      id: 'nb5-jump',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5',
      highlights: [H('b5'), H('d5', ATK), H('c7', SOFT), H('d6', SOFT)],
      say: "Nb5! — the trip pays off. The knight forks d4 AND the c7/d6 outpost squares. Black's queen on d5 has to move OR risk getting trapped, and the d4-pawn is hanging. Either way we win the tempo battle.",
      sayShort: 'Nb5! — fork d4 + c7/d6.',
    }),
    b({
      id: 'nb5-convert',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5 Qd8 Nbxd4 Nd5 Nxc6 bxc6',
      highlights: [H('c6'), H('d5')],
      say: "Black retreats …Qd8, we recapture Nbxd4, Black tries to centralise with …Nd5, and we trade Nxc6 bxc6 — Black ends up with doubled c-pawns AND we keep the bishop pair. The structural edge converts smoothly in the R+min+P endgame.",
      sayShort: 'Nxc6 bxc6 — bishop pair + doubled pawns.',
    }),
  ],
};

const BXF7_WALK_IN: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: 'Weapon: Bxf7+ → e6+ → Kg8 walk-in',
  minutes: 4,
  orientation: 'white',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'bxf7-setup',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bb5+ Bd7 Bc4 Nb6',
      highlights: [H('c4'), H('f7', ATK)],
      say: "Black plays …d6 and we throw in Bb5+ before retreating to c4 — gaining a tempo on the bishop's path to its prize square. Nb6 chases our bishop, but now Bxf7+ is set up: the bishop on c4 and the e5-pawn coordinate against f7.",
      sayShort: 'Bb5+ then Bc4 — f7 loaded.',
    }),
    b({
      id: 'bxf7-sacrifice',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bb5+ Bd7 Bc4 Nb6 Bxf7+',
      highlights: [H('f7', ATK), H('e8', SOFT)],
      say: "Bxf7+! — sacrifice the bishop. Black has no choice but Kxf7 (taking with the king is forced; no piece can block the check). The king walks straight into the centre with no shelter. 10 opponents — including ShadowKing71 at 3122 — followed this exact path.",
      sayShort: 'Bxf7+! — sacrifice the bishop.',
    }),
    b({
      id: 'bxf7-e6',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bb5+ Bd7 Bc4 Nb6 Bxf7+ Kxf7 e6+ Kg8',
      highlights: [H('e6', ATK), H('g8'), H('d7', SOFT)],
      say: "e6+! — the pawn drives the king to g8 with no normal castling shelter. The pawn also attacks the bishop on d7 with discovered tempo. Kg8 is forced (Kxe6 loses to Nfg5+ winning material). Black's king is locked on g8 for the rest of the game.",
      sayShort: 'e6+ — king to g8, no shelter.',
    }),
    b({
      id: 'bxf7-cash',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 d6 Bb5+ Bd7 Bc4 Nb6 Bxf7+ Kxf7 e6+ Kg8 exd7 Qxd7 O-O e5 d4 cxd4',
      highlights: [H('d7'), H('g1', SOFT)],
      say: "exd7 grabs the bishop back — we've recovered the material AND removed Black's most coordinated piece AND wrecked Black's king position. Black recaptures Qxd7, we castle, and play d4 opening the centre while every White piece swarms in. The opening is over and we're already winning.",
      sayShort: 'exd7 + O-O — material recovered, attack rolling.',
    }),
  ],
};

const BG4_PIN_REFLEX: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: 'Weapon: Nc3 ignores the …Bg4 pin (Nc6 Line)',
  minutes: 3,
  orientation: 'white',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'bg4-setup',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3',
      highlights: [H('f3'), H('d5', SOFT)],
      say: "In the Nc6 line, after Black recaptures …Qxd5, we play Nf3 — natural development. But here Black often reaches reflexively for …Bg4 hoping to pin the knight against our queen.",
      sayShort: 'Nf3 — Bg4 pin is coming.',
    }),
    b({
      id: 'bg4-pin',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 Bg4',
      highlights: [H('g4'), H('f3', SOFT), H('d1', SOFT)],
      say: "…Bg4 — the pin reflex. Black thinks this restricts our development, but the queen on d5 is the real victim of this position, not the knight on f3. We ignore the pin entirely and play the move that exposes Black's queen.",
      sayShort: '…Bg4 — pin reflex.',
    }),
    b({
      id: 'bg4-nc3',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 Bg4 Nc3',
      highlights: [H('c3'), H('d5', ATK)],
      say: "Nc3! — same tempo-on-the-queen trick as the main Nc6 weapon, except now Black has TWO awkward problems: the queen has no good square AND the bishop on g4 is committed to the wrong diagonal. The pin doesn't matter because we won't ever play Be2 to break it.",
      sayShort: 'Nc3! — ignore the pin.',
    }),
    b({
      id: 'bg4-trade',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3 Bg4 Nc3 Bxf3 gxf3 Qxd4 Qxd4 Nxd4',
      highlights: [H('d4')],
      say: "Black commits to the trade with …Bxf3 gxf3, then grabs our d4-pawn with the queen, and we exchange queens. The position simplifies into an endgame where we have doubled f-pawns but the bishop pair. The pair compensates for the doubled pawn in every R+min+P endgame — and that's the endgame Black is now stuck with.",
      sayShort: 'Bishop pair vs doubled pawn — we\'re better.',
    }),
  ],
};

// =============================================================
// WARNINGS — student avoids the slip; show wrong, then snap back
// =============================================================

const PREMATURE_D4: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: 'Watch out: Premature d4 — Black equalises with …d5',
  minutes: 3,
  orientation: 'white',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'pre-setup',
      moves: 'e4 c5 c3 Nc6',
      highlights: [H('c6'), H('d4', SOFT)],
      say: "After …Nc6, the temptation is enormous: White is fully set up for d4 with c3 supporting it. But pushing d4 NOW is the cardinal sin of the Alapin — Black has options that cost you the entire opening.",
      sayShort: 'After …Nc6 — d4 looks ready, but isn\'t.',
    }),
    b({
      id: 'pre-d4',
      moves: 'e4 c5 c3 Nc6 d4',
      highlights: [H('d4', ATK)],
      say: "d4?? — White rushes the push BEFORE Black declares with …Nf6 or …e6. Black has the perfect reply available, and the whole Alapin plan is about to collapse.",
      sayShort: 'd4? — too early.',
    }),
    b({
      id: 'pre-punish',
      moves: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nc3 e6 Nf3 Nf6',
      highlights: [H('d5'), H('f6', SOFT)],
      say: "Black plays …cxd4 cxd4 …d5! exd5 …Qxd5 — Black's queen comes out with tempo and reaches a Scandinavian-style position with full equality. Our 73.8% main spine score is dead because Black struck FIRST with d5 before we could set up the c3-d4 cramp.",
      sayShort: '…d5! — Black equalises.',
    }),
    b({
      id: 'pre-fix',
      moves: 'e4 c5 c3 Nc6 Nf3',
      highlights: [H('f3')],
      say: "The fix: WAIT. After c3, do NOT play d4 immediately. Play Nf3 first, develop normally, and let Black declare. If Black plays …Nf6 we play e5 cramping; if …e6 we transpose into French-Advance territory; if …d6 we play d4 with time. The d4-push timing is the whole opening — get it wrong and you're playing a worse Open Sicilian.",
      sayShort: 'Fix: Nf3 first — let Black declare.',
    }),
  ],
};

const BC2_RETREAT: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: 'Watch out: Bc2 retreat instead of Bxe6 trade',
  minutes: 3,
  orientation: 'white',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'bc2-setup',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6',
      highlights: [H('e6'), H('b3', SOFT)],
      say: "After our central trade and short castle, Black plays …Be6 offering the bishop trade. The bishop on e6 is Black's best piece — the light-squared bishop is the coordination anchor for the whole position. Black wants the trade because keeping the bishop pair is worth a tempo.",
      sayShort: 'Black offers …Be6 — bishop trade.',
    }),
    b({
      id: 'bc2-wrong',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bc2',
      highlights: [H('c2', ATK), H('e6', SOFT)],
      say: "Bc2?? — the panic retreat. White worries about the bishop pair, retreats to c2, and refuses the trade. This is exactly backwards: the c2-bishop now has no targets, while Black's e6-bishop is free to coordinate.",
      sayShort: 'Bc2? — refuses the trade.',
    }),
    b({
      id: 'bc2-punish',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bc2 O-O-O',
      highlights: [H('c8'), H('e6', SOFT)],
      say: "Black castles long — …O-O-O — and the picture is grim. Black keeps the bishop pair, gets the rook on the half-open d-file, and has active piece play across the board. Our 73.8% conversion plan (the queenside a4-a5-a6 crawl) is DEAD because the bishop on c2 isn't aiming at anything.",
      sayShort: '…O-O-O — Black equalises with the pair.',
    }),
    b({
      id: 'bc2-fix',
      moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bxe6',
      highlights: [H('e6', ATK)],
      say: "The fix: when Black plays …Be6, ALWAYS take with Bxe6! Trade off Black's best-developed piece, then continue with the queenside crawl a4-a5-a6 to fix Black's pawns permanently. The Alapin's signature conversion depends on this exact trade-initiation timing.",
      sayShort: 'Fix: Bxe6 — take the trade.',
    }),
  ],
};

const BE2_RETREAT_BG4: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: 'Watch out: Be2 retreat against the …Bg4 pin (d5 Open)',
  minutes: 3,
  orientation: 'white',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'be2-setup',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4',
      highlights: [H('g4'), H('f3', SOFT), H('d1', SOFT)],
      say: "In the d5 Open, Black plays …Bg4 pinning our Nf3 against the queen. The pin LOOKS scary — moving the knight loses the queen. The panic move is Be2 to defuse the pin.",
      sayShort: '…Bg4 — pin on Nf3.',
    }),
    b({
      id: 'be2-wrong',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2',
      highlights: [H('e2', ATK), H('f1', SOFT)],
      say: "Be2?? — the panic retreat. It defuses the pin but commits the bishop to e2 instead of its prize square on c4. Now the entire Bc4-Bb3 attacking plan that gives the d5 Open its bite is gone.",
      sayShort: 'Be2? — wrong bishop diagonal.',
    }),
    b({
      id: 'be2-punish',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 Bxf3 Bxf3 Qd6 O-O e6 Nbd2 Be7 Re1 O-O',
      highlights: [H('f3'), H('f1', SOFT)],
      say: "Black trades …Bxf3 Bxf3, retreats …Qd6 to safety, develops calmly with …e6 Be7 O-O, and has fully equalised. Our light-squared bishop never reaches its real diagonal, and the Nb5-outpost / Bc4-Bb3 plan that wins the d5 Open is dead. The whole variation collapses.",
      sayShort: 'Black equalises — plan dead.',
    }),
    b({
      id: 'be2-fix',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 h3 Bh5 g4 Bg6',
      highlights: [H('h3'), H('g4', ATK), H('g6', SOFT)],
      say: "The fix: h3! Black has to retreat …Bh5, then g4! pushes the bishop further to g6 and breaks the pin AND keeps the f1-bishop available for the Bc4-Bb3 plan. The light-squared bishop is the conversion piece in every Alapin variation — protect it.",
      sayShort: 'Fix: h3 + g4 — break the pin.',
    }),
  ],
};

const NBXD4_OUTPOST: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: 'Watch out: Nbxd4 surrenders the outpost early (d5 Open)',
  minutes: 3,
  orientation: 'white',
  kind: 'trap',
  sources: SRC,
  beats: [
    b({
      id: 'nbxd4-setup',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5 Qd7',
      highlights: [H('b5'), H('d4', SOFT)],
      say: "We've reached the d5 Open Nb5-outpost position. Black has retreated …Qd7 saving the queen. Our knight on b5 sits in front of c7 / d6 — the outpost squares we want. The question is which knight recaptures on d4.",
      sayShort: 'Nb5 outpost achieved — recapture coming.',
    }),
    b({
      id: 'nbxd4-wrong',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5 Qd7 Nbxd4',
      highlights: [H('d4', ATK), H('b5', SOFT)],
      say: "Nbxd4?? — the wrong recapture. White grabs the pawn back with the Nb5, immediately surrendering the b5-outpost AND the long-term pressure on c7. The whole point of Na3-Nb5 was the outpost itself; throwing the knight away to grab d4 wastes the entire trip.",
      sayShort: 'Nbxd4? — outpost surrendered.',
    }),
    b({
      id: 'nbxd4-punish',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5 Qd7 Nbxd4 Nxd4 Qxd4 a6',
      highlights: [H('d4'), H('a6', SOFT)],
      say: "Black trades …Nxd4, we recapture …Qxd4, and Black plays …a6 cementing the queenside. Without the Nb5 outpost we have no structural advantage — the position is symmetric and Black equalises completely. The 33.7% R+min+P endgame conversion the d5 Open promises is gone.",
      sayShort: 'Black equalises — outpost wasted.',
    }),
    b({
      id: 'nbxd4-fix',
      moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5 Qd7 Nfxd4',
      highlights: [H('d4', ATK), H('b5')],
      say: "The fix: Nfxd4! Recapture with the f3-knight instead, keeping the Nb5 outpost alive. The knight on b5 keeps eyeing c7 and d6, the structural pressure stays, and we win the resulting middlegame on the queenside crawl. The right knight makes the recapture matter.",
      sayShort: 'Fix: Nfxd4 — keep the outpost.',
    }),
  ],
};

// =============================================================
// Registry + routing helpers
// =============================================================

interface TrapEntry {
  // The exact `name` field from pro-repertoires.json that this lesson serves
  name: string;
  lesson: LessonScript;
  kind: 'trap' | 'warning';
}

const TRAPS: TrapEntry[] = [
  { name: 'Nc3 Queen-Tempo (2…Nc6 Line)', lesson: NC3_QUEEN_TEMPO, kind: 'trap' },
  { name: 'Bc4-Gambit + exf7+ (Nc6 block fails, 62 games incl. Hans Niemann 3161)', lesson: BC4_GAMBIT_EXF7, kind: 'trap' },
  { name: 'd5-Open cxd4 → Nb5 Outpost (17 games incl. Sam Shankland 2934)', lesson: D5_OPEN_NB5, kind: 'trap' },
  { name: 'Bxf7+ → e6+ → Kg8 Walk-In (10 games incl. ShadowKing71 3122)', lesson: BXF7_WALK_IN, kind: 'trap' },
  { name: '...Bg4 Pin Reflex in Nc6 line (7 games)', lesson: BG4_PIN_REFLEX, kind: 'trap' },
  { name: 'Premature d4 push — Black equalises with …d5', lesson: PREMATURE_D4, kind: 'warning' },
  { name: 'Bc2 retreat instead of Bxe6 trade', lesson: BC2_RETREAT, kind: 'warning' },
  { name: 'Be2 retreat against the …Bg4 pin (d5 Open)', lesson: BE2_RETREAT_BG4, kind: 'warning' },
  { name: 'Nbxd4 surrenders the outpost early (d5 Open)', lesson: NBXD4_OUTPOST, kind: 'warning' },
];

/**
 * Resolve a curated trap/warning lesson by the exact name in
 * pro-repertoires.json. Returns null for unknown names so the surface
 * falls back to legacy WalkthroughMode.
 */
export function getProNaroditskyAlapinTrapLesson(name: string): LessonScript | null {
  const entry = TRAPS.find((t) => t.name === name);
  return entry?.lesson ?? null;
}

/**
 * Convert a curated trap/warning lesson into a PlayableMiddlegameLine
 * for PlayableLinePlayer (the modern bigger-board surface).
 */
export function getProNaroditskyAlapinTrapPlayableLine(name: string): PlayableMiddlegameLine | null {
  const lesson = getProNaroditskyAlapinTrapLesson(name);
  if (!lesson) return null;
  return lessonToPlayableLine(lesson);
}
