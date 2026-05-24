import type {
  LessonScript,
  AnnotationArrow,
  AnnotationHighlight,
  PlayableMiddlegameLine,
} from '../../types';

// Vienna named weapons + warnings — playbook §3, locked 2026-05-21:
// "FULL COVERAGE on weapons — NO SHORT NARRATIONS." Each weapon gets a
// 6-10 beat lesson at variation-lesson depth (set up the position, name
// the threat, show the slip, walk the punishment move-by-move with the
// WHY of each move, show the safe alternative, tie back to the opening's
// identity). The Vienna's arsenal IS its identity (David 2026-05-21:
// "lots of traps/weapons") — so we don't cap to the Ruy's 5-trap cadence.
//
// Slate: 7 weapons + 1 warning, distributed across the 4 variation tabs.
//
//   WEAPONS (Black slips → White punishes, PGN ends with White better):
//     1. wurzburger          → gambit                 — Wurzburger Trap
//     2. hamppe-allgaier     → vs 2…nc6              — the f7 sacrifice
//     3. hamppe-muzio        → vs 2…nc6              — castle into the gambit
//     4. frankenstein-nxa8   → frankenstein-dracula   — Nxc7+ Nxa8 raid
//     5. copycat-qg4         → main (Classical)       — Qg4 on g7 when Black mirrors
//     6. pierce-gambit       → vs 2…nc6              — 4.d4 attacking gambit
//     7. steinitz-gambit     → vs 2…nc6              — 4.d4 Qh4+ 5.Ke2!? king-walk
//
//   WARNINGS (White must avoid):
//     1. nxe4-no-qh5         → frankenstein-dracula   — must play 4.Qh5 vs ...Nxe4
//
// Lessons authored progressively; this stub ships the routing so the
// wiring can land first.

// Lead-the-eye colours per the playbook §5a — ORANGE move squares are
// auto-painted; GREEN = vision/threat arrows, YELLOW = a called-out key
// square, SOFT BLUE = secondary context.
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

// ── WEAPON: The Wurzburger Trap ─────────────────────────────────
// Lives in the Vienna Gambit (3.f4 d5 fxe5 Nxe4). After 5.d3 — looking
// like a normal Gambit move — Black ventures the natural-looking
// 5…Qh4+ 6.g3 Nxg3 sequence thinking he wins material. 7.Nf3! is the
// only-move that springs the trap, and 8.Nxd5! collapses Black's whole
// idea. Full-coverage 9-beat treatment per the playbook's locked rule.
const WURZBURGER: LessonScript = {
  openingId: 'vienna-game',
  title: 'Weapon: The Wurzburger Trap',
  minutes: 6,
  orientation: 'white',
  beats: [
    {
      id: 'wt1',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3'],
      highlights: [H('e4', KEY), H('d3', SOFT)],
      say: "Welcome to the Vienna Gambit's signature trap. The position so far is the Vienna Gambit Modern Variation: Black declined the gambit with the principled 3…d5, White accepted with 4.fxe5, Black grabbed the e4-pawn with the knight, and now White attacks that knight with the modest 5.d3. The d3-pawn looks like the most obvious developing move on the board — but it sets up a trap that has caught players for over a century. Black has one ambitious-looking reply that LOSES the entire game inside four moves.",
      sayShort: "5.d3 — attacks the knight; a quiet-looking trap.",
    },
    {
      id: 'wt2',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+'],
      arrows: [A('h4', 'e1', ATK)],
      highlights: [H('h4', KEY), H('e1', SOFT)],
      say: "5…Qh4+! The queen leaps to h4 with check on the e1-king. Black's reasoning is razor-sharp: the d3-pawn attacks the e4-knight, but the knight has Qh4+ available to force White's hand. White must address the check, and the only way to do it without giving up a piece is with g3 — which then leaves the e4-knight free to grab the g-pawn with check. Black sees a forced material win. It would be brilliant, if it worked.",
      sayShort: "5…Qh4+! — the check forces White's g3 weakness.",
    },
    {
      id: 'wt3',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3'],
      highlights: [H('g3', KEY)],
      say: "6.g3 — forced. White cannot interpose with anything else: the f-pawn is gone (captured at fxe5), so g3 is the only block. Black's plan now seems to crash through. The e4-knight is no longer just attacked — it can grab the new g3-pawn with check ideas and threats against the rook on h1.",
      sayShort: "6.g3 — forced; now the e4-knight eyes g3.",
    },
    {
      id: 'wt4',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3'],
      arrows: [A('g3', 'h1', ATK)],
      highlights: [H('g3', KEY), H('h1', KEY)],
      say: "6…Nxg3! Black grabs the pawn, and now look at what's threatened. The Black knight on g3 attacks the rook on h1 — next move plays Nxh1, and Black has won a rook plus a pawn for a knight. Decisive material. White's army looks paralysed: take the knight back with hxg3 and the queen on h4 captures the rook on h1; recapture any other way and Black just takes the rook. Black is one move away from winning the game.",
      sayShort: "6…Nxg3! — threatens Nxh1; Black looks winning.",
    },
    {
      id: 'wt5',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3'],
      arrows: [A('f3', 'h4', ATK)],
      highlights: [H('f3', KEY), H('h4', KEY)],
      say: "7.Nf3! The trap springs — and it is the LAST thing Black is expecting. White completely ignores the knight on g3 and develops with TEMPO, attacking the Black queen on h4. Suddenly Black must save his queen before he saves his knight. The greedy plan reverses on him in a single move. This is the Wurzburger Trap: White's saving idea is not defence but counter-attack on the most powerful Black piece.",
      sayShort: "7.Nf3! — ignores it, attacks the queen; trap sprung.",
    },
    {
      id: 'wt6',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3','Qh5'],
      highlights: [H('h5', KEY)],
      say: "7…Qh5 — Black retreats the queen, but every queen-move now has consequences. He picked h5 because it still hovers near the kingside and pins the f3-knight along the h5-d1 diagonal. Black hopes the pin saves the day and that his knight on g3 will be defendable next move. But the pin is illusory — White's queen on d1 has an answer — and the g3-knight is hanging to the h2-pawn the entire time.",
      sayShort: "7…Qh5 — retreats; the g3-knight still hangs.",
    },
    {
      id: 'wt7',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3','Qh5','Nxd5'],
      arrows: [A('d5', 'c7', ATK)],
      highlights: [H('d5', KEY), H('c7', KEY), H('g3', SOFT)],
      say: "8.Nxd5! The hammer falls. The c3-knight gobbles the d5-pawn AND lands on a central square threatening Nxc7+ — a fork of king and rook on a8. The g3-knight is still hanging to hxg3 next move. The pin on f3 is broken because White's queen has Qe2 ideas to swap pieces. Black is losing material on at least three fronts simultaneously: the d5-pawn already gone, the c7-fork incoming, the g3-knight set to fall, and White's king-knight escapes the pin. Black's whole plan from move 5 onward has collapsed.",
      sayShort: "8.Nxd5! — d5 lost, Nxc7+ looms, g3 hangs.",
    },
    {
      id: 'wt8',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3','Qh5','Nxd5'],
      say: "Why does this trap work? Because every single Black move from 5…Qh4+ to 7…Qh5 was the MOST natural-looking response in the position. Qh4+ feels like the winning blow; Nxg3 looks like cashing in; Qh5 keeps the queen active. The trap depends on White ignoring the obvious — not recapturing the g3-knight, not running from the queen — and instead playing the silent, devastating Nf3 that turns the position inside out. Steinitz's school called this principle the indirect refutation: when the opponent's idea relies on a forced sequence, break the sequence by changing the subject entirely.",
      sayShort: "The lesson: change the subject with Nf3.",
      highlights: [H('f3', SOFT)],
    },
    {
      id: 'wt9',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3','Qh5','Nxd5'],
      say: "Look at what the position now produces. The Nd5 is the IMMOVABLE outpost — central knight on a square Black cannot challenge with a pawn (the c-pawn would have to first move to c6, but Nxc7+ punishes that). The d5-pawn that Black built his whole opening around is gone. The g3-knight is hanging to hxg3 next turn — Black will lose THAT piece too. The Qh5 is far from the queenside where the c7-fork is incoming. And White still has the bishop pair, an open f-file for the rook once Nf3 develops, and full kingside safety with O-O-O coming any time. The Wurzburger doesn't just trap material — it produces a position with EVERY ADVANTAGE.",
      sayShort: "Every White piece dominant — Nd5, bishops, open f-file.",
      highlights: [H('d5', SOFT)],
    },
    {
      id: 'wt10',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3','Qh5','Nxd5'],
      say: "The Wurzburger Trap is a weapon you wield when Black plays the Vienna Gambit Accepted, declines with 3…d5, and then ventures the Qh4+ adventure. It will not arrive in every Vienna Gambit you play — strong players know about it and avoid Qh4+ entirely. But against an opponent who reaches for the natural-looking attack the moment you allow 5.d3, the trap is utterly decisive. Steinitz himself used Vienna Gambit ideas in his match preparation, and his students at the Viennese club drilled this exact d5-square sequence. Keep it loaded.",
      sayShort: "Keep loaded — …Qh4+ turns Black's plan inside out.",
      highlights: [H('d5', SOFT)],
    },
  ],
};

// ── WEAPON: The Hamppe-Allgaier Sacrifice ──────────────────────
// Lives in the vs 2…Nc6 line, after the Vienna Gambit Accepted (3.f4
// exf4) and Black's greedy …g5 hold. The knight launches from g5 with
// 7.Nxf7! — the famous sacrifice that strips Black's king open. Two
// pawns and a huge initiative for the knight; against an unprepared
// opponent this is one of the most dangerous practical weapons in the
// White repertoire. Full-coverage 8-beat treatment.
const HAMPPE_ALLGAIER: LessonScript = {
  openingId: 'vienna-game',
  title: 'Weapon: The Hamppe-Allgaier Sacrifice',
  minutes: 6,
  orientation: 'white',
  beats: [
    {
      id: 'ha1',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5'],
      arrows: [A('g5', 'f7', ATK), A('g5', 'h7', ATK)],
      highlights: [H('g5', KEY), H('f7', KEY)],
      say: "Here we are at the launchpad. Black has accepted the Vienna Gambit with 3…exf4, held the gambit pawn with 4…g5, and now after 5.h4 g4 6.Ng5 the knight leaps to g5 deep in Black's territory, eyeing the f7-square AND the h7-pawn at once. Black thinks the knight is trapped, but in this position it has work to do. The most famous sacrifice in the Vienna's entire history is coming.",
      sayShort: "6.Ng5 — the launchpad; the knight isn't trapped.",
    },
    {
      id: 'ha2',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6'],
      highlights: [H('h6', KEY), H('g5', SOFT)],
      say: "6…h6 — Black attacks the knight on g5, fully expecting it to retreat to h3 or f3 in shame. Every developing instinct says the knight must move. But Hamppe and Allgaier, two 19th-century Viennese players, saw something else here: the knight refuses to retreat, and SACRIFICES itself instead. This was a revolutionary idea when it was first played — losing a knight for a pawn is normally madness — and the moves that follow have terrified Black players for two centuries.",
      sayShort: "6…h6 — Black expects retreat; the knight stays.",
    },
    {
      id: 'ha3',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7'],
      arrows: [A('f7', 'd8', ATK), A('f7', 'h8', ATK)],
      highlights: [H('f7', KEY), H('d8', SOFT), H('h8', SOFT)],
      say: "7.Nxf7! The sacrifice. White's knight crashes into f7 — the softest square in front of Black's king — and from there it forks the queen on d8 and the rook on h8. Refusing the knight loses the queen or rook immediately. Black has no choice but to capture, and the moment he does his king is dragged out into the open in the middle of the board. Steinitz wrote that the king is a fighting piece, but he meant in the endgame. On move seven he is a target.",
      sayShort: "7.Nxf7! — forks queen and rook; king exposed.",
    },
    {
      id: 'ha4',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7'],
      highlights: [H('f7', KEY)],
      say: "7…Kxf7 — forced. So the king is hauled onto f7 in the middlegame, no shelter overhead, no pawn cover, no pieces around to defend it. The whole board is now a hunting ground. White is a knight down for one pawn, but Black is two miles from safety and ten moves of careful defence away from consolidating.",
      sayShort: "7…Kxf7 — forced; the king walks out naked.",
    },
    {
      id: 'ha5',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7','Bc4+'],
      arrows: [A('c4', 'f7', ATK)],
      highlights: [H('c4', KEY), H('f7', KEY)],
      say: "8.Bc4+! Check! The Italian-Vienna bishop snaps onto the long light diagonal and hits the king directly. The Bc4 is the Vienna's signature attacking piece — you've seen it pressing f7 in the Classical lesson, you've seen it on the Bb3-pivot in the Wurzburger setup — and now it appears in this completely different line, on the same diagonal, pinning the king to its naked f7 square. Three different Vienna tabs, same bishop, same target square.",
      sayShort: "8.Bc4+! — the bishop hits the king on f7.",
    },
    {
      id: 'ha6',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7','Bc4+','d5'],
      highlights: [H('d5', KEY)],
      say: "8…d5 — Black blocks the check with the only pawn that can intervene, sacrificing it to interpose. The d-pawn was Black's central development; now it's already gone. White will recapture next move and the centre will collapse in his favour. Each defensive move Black makes from here strips off another shield.",
      sayShort: "8…d5 — blocks the check, loses the centre pawn.",
    },
    {
      id: 'ha7',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7','Bc4+','d5','Bxd5+','Ke8'],
      highlights: [H('d5', KEY), H('e8', SOFT)],
      say: "9.Bxd5+ — bishop takes the d-pawn WITH CHECK on the king once more. Black plays 9…Ke8, retreating the king back to its original square — but the king's right to castle has been permanently destroyed. The bishop on d5 now sits in the heart of the board, eyeing both wings the moment the c6-knight steps aside. White has recovered one of the pawns he sacrificed, AND he has rebuilt a centralised attacking force with every piece aimed at the Black king.",
      sayShort: "9.Bxd5+ — second check; the king loses castling.",
    },
    {
      id: 'ha8',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7','Bc4+','d5','Bxd5+','Ke8','d4'],
      highlights: [H('d4', KEY), H('e4', KEY)],
      say: "10.d4 — White completes the centre with the d4-e4 pawn duo, builds a huge pawn-front, and now the position is exactly what Steinitz's school dreamed of: knight down, two pawns up plus a permanent positional grip, Black's king stuck on e8 with no castling rights, an open h-file, and the Bd5 raking everything in sight.",
      sayShort: "10.d4 — knight for two pawns, every piece aimed.",
    },
    {
      id: 'ha9',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7','Bc4+','d5','Bxd5+','Ke8','d4'],
      highlights: [H('d5', KEY), H('e4', KEY), H('h1', SOFT)],
      say: "What does the position PRODUCE? Look at the structural facts: White's d4-e4 pawn duo dominates the centre and Black has NO central pawns to push back; the Bd5 owns the long light diagonal and aims at b7 + the queenside; the h-file is open for the rook on h1 to swing toward h7 if Black ever brings his king to f7 or g8; Black's queenside pieces (Nb8, Bc8, Qd8, Ra8) are ALL still on their starting squares while White has 5 active pieces. The conversion plan: Bxf4 to recover one of the gambit pawns and aim at the h6-pawn, then Qd3 or Qf3 hitting the kingside, then O-O-O to bring the king-rook into the attack via the open h-file. Black will eventually develop, but the king on e8 is a permanent target — every White attacking move costs Black another defensive tempo. The verdict on the Hamppe-Allgaier: theoretically Black survives with computer-perfect defence, practically White wins more often than he loses. Steinitz's club's pet line, two centuries later still one of the most dangerous practical weapons in chess. Keep it loaded for when Black gives you …g5.",
      sayShort: "d4-e4 centre, open h-file, Bd5 — crushing.",
    },
  ],
};

// ── WEAPON: The Hamppe-Muzio — Castle Into the Sacrifice ───────
// Lives in the vs 2…Nc6 line, alongside the Hamppe-Allgaier. After
// 3.f4 exf4 4.Nf3 g5, INSTEAD of 5.h4 (Hamppe-Allgaier setup) White
// plays 5.Bc4 g4 6.O-O!? — castling INTO a knight sacrifice, the
// most insane practical line in the entire Vienna. Two pawns AND
// the right to castle, all for a knight that's about to fall. Pure
// 19th-century Romantic chess: a permanent attack on the f-file
// against a king with no easy way to safety. Full-coverage 8 beats.
const HAMPPE_MUZIO: LessonScript = {
  openingId: 'vienna-game',
  title: 'Weapon: The Hamppe-Muzio — Castle Into the Sacrifice',
  minutes: 6,
  orientation: 'white',
  beats: [
    {
      id: 'hm1',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4'],
      arrows: [A('c4', 'f7', ATK)],
      highlights: [H('c4', KEY), H('f7', KEY)],
      say: "Same launchpad as the Hamppe-Allgaier — Black has taken the gambit, played …g5 to hold, and now White makes a different fifth move. 5.Bc4! — the Italian-Vienna bishop swings out IMMEDIATELY, before the h4-g5 lever, eyeing f7 from the very square the Hamppe-Allgaier saves for later. This is a completely different attacking idea, and the move that follows is the most insane in the whole Vienna catalogue.",
      sayShort: "5.Bc4 — bishop first; a different attacking idea.",
    },
    {
      id: 'hm2',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4'],
      highlights: [H('g4', KEY), H('f3', KEY)],
      say: "5…g4 — Black, having already been promised this kingside expansion, attacks the f3-knight. He thinks the knight has to retreat or trade itself for a pawn. He thinks White will play Ne5 or Nh4 in shame. But there is a third option that has terrified opponents for nearly two centuries.",
      sayShort: "5…g4 — attacks the knight; White's third option.",
    },
    {
      id: 'hm3',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O'],
      arrows: [A('c4', 'f7', ATK)],
      highlights: [H('g1', KEY), H('f1', KEY), H('f7', KEY)],
      say: "6.O-O!! White CASTLES — king to g1, leaving the knight on f3 hanging — and the rook lands on f1 ready to fire down the f-file the instant the f3-knight steps aside. This is the Hamppe-Muzio: White willingly gives up the knight to put a major piece behind the f-file with the bishop on c4 already targeting f7. Two pawns AND the knight, gone in three moves, for a permanent attack against a king that cannot easily castle. Even Steinitz, who built his reputation tearing down Romantic-era attackers, respected this line.",
      sayShort: "6.O-O!! — castle into the sacrifice.",
    },
    {
      id: 'hm4',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3'],
      highlights: [H('f3', KEY)],
      say: "6…gxf3 — Black takes the knight. He has to: refusing gives White the f3-knight back AND keeps all the attacking pressure. So now Black is up a full piece and TWO pawns. Materially he is winning by a wide margin. Practically, he's about to defend a kingside the entire rest of the game with no pieces developed and a king stuck in the centre.",
      sayShort: "6…gxf3 — up a piece, practically doomed.",
    },
    {
      id: 'hm5',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3','Qxf3'],
      arrows: [A('c4', 'f7', ATK)],
      highlights: [H('f3', KEY), H('f7', KEY), H('f4', SOFT)],
      say: "7.Qxf3 — the queen recaptures and now THREE White pieces are aimed at the kingside attack: the queen on f3 driving down the centre, the bishop on c4 staring straight at f7, and the rook on f1 sitting behind both with the f-file primed to open. Black's f4-pawn is the only thing blocking the queen's reach toward f7; one trade and the line opens. The c1-bishop and the c3-knight are still home and ready to join. White is down a knight but every piece is pointed at the same square.",
      sayShort: "7.Qxf3 — queen, bishop, rook all aim kingside.",
    },
    {
      id: 'hm6',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3','Qxf3','Qf6'],
      arrows: [A('f6', 'f7', VIS)],
      highlights: [H('f6', KEY), H('f7', SOFT)],
      say: "7…Qf6 — the natural defensive move. Black brings the queen out to f6 to defend f7 directly, contest the f-file, and prepare to develop. It looks like he's consolidating. But the move opens the e-file as well, and White's reply is going to exploit BOTH new lines at once.",
      sayShort: "7…Qf6 — defends f7 but opens new lines.",
    },
    {
      id: 'hm7',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3','Qxf3','Qf6','e5'],
      highlights: [H('e5', KEY), H('f6', KEY)],
      say: "8.e5! Now the e-pawn surges forward attacking the queen on f6, gaining a critical tempo for the development of the rest of White's army. Black must lose another tempo moving the queen out of attack. Every move White plays creates a new threat; every Black move is purely reactive. This is what compensation in 19th-century chess looked like — pieces sacrificed, but the opponent cannot breathe.",
      sayShort: "8.e5! — surges with tempo on the queen.",
    },
    {
      id: 'hm8',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3','Qxf3','Qf6','e5'],
      say: "8.e5! The e-pawn surges with tempo on the queen on f6. Black has to move her again, losing another precious tempo. Every White move now creates a NEW threat: the Bc4 still rakes f7, the Qf3 still hits f7 from the centre, the Rf1 stares straight down the f-file, and the e5-pawn opens the long h2-b8 diagonal for a future Qg3 or Bxh6 ideas. White is down a knight but every piece is firing at Black's king.",
      sayShort: "8.e5! — surges with tempo on the queen.",
      highlights: [H('e5', KEY), H('f6', KEY)],
    },
    {
      id: 'hm9',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3','Qxf3','Qf6','e5'],
      say: "Look at what the position PRODUCES. Black is up a knight and two pawns on paper, but he can't develop — every move costs him tempo defending the f7-square. The Bc4 + Qf3 + Rf1 trinity makes …Nf6 or …Be7 impossible for Black; if Black ever castles the f-file rains down. White's plan from here is mechanical: bring the queen-bishop to f4 with Bxf4 (recovering the third pawn), bring the a1-rook to e1 to triple on the e-file, and feed pieces toward h7 and f7. Modern engines say Black is materially better, but only by computer-level defence. Against a human, the Hamppe-Muzio is the most punishing weapon White has when Black ventures 4…g5 — and that's the entire pitch: don't play it every game, but keep it loaded for when Black gives you the kingside chase.",
      sayShort: "Every piece aims at f7 and h7.",
      highlights: [H('f7', KEY), H('h7', SOFT), H('f4', SOFT)],
    },
  ],
};

// ── WEAPON: Frankenstein-Dracula — the Nxa8 Raid ──────────────
// The Frankenstein-Dracula variation lesson teaches the trunk; this
// weapon zooms into the famous queen-chase-then-rook-raid that fires
// when Black picks 5…Nc6 instead of 5…Be7. Nine moves of forced
// sequences ending with White's knight devouring the a8-rook — the
// single most memorable mini-combination in the Vienna's repertoire.
// Full-coverage 9 beats.
const FRANKENSTEIN_NXA8: LessonScript = {
  openingId: 'vienna-game',
  title: 'Weapon: Frankenstein-Dracula — the Nxa8 Raid',
  minutes: 7,
  orientation: 'white',
  beats: [
    {
      id: 'fn1',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6'],
      arrows: [A('b3', 'f7', ATK)],
      highlights: [H('c6', KEY), H('f7', SOFT)],
      say: "Here is where the Frankenstein-Dracula tree forks. After 4.Qh5 Nd6 5.Bb3, the bishop has dodged onto b3 still raking f7. Black now has two ways to develop. The calm path is 5…Be7 — the modern grandmaster's choice, taught in the variation lesson. The wild path is 5…Nc6 — natural-looking knight development that walks straight into one of the most spectacular tactical sequences in chess history. The next nine moves are nearly forced. The picture unfolds.",
      sayShort: "5…Nc6 — natural, but walks into the Nxa8 raid.",
    },
    {
      id: 'fn2',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5'],
      arrows: [A('b5', 'c7', ATK), A('b5', 'a7', ATK), A('b5', 'd6', ATK)],
      highlights: [H('b5', KEY), H('c7', KEY)],
      say: "6.Nb5! The c3-knight pivots to b5, suddenly threatening Nxc7+ which would FORK the king and the a8-rook — losing the rook to a knight check is the textbook nightmare. The knight on b5 also attacks the d6-knight AND eyes a7, AND if the king moves to d8 to dodge the fork, Nxd6 is winning. Three threats in one move. Black is one move from material disaster and must play actively to survive.",
      sayShort: "6.Nb5! — threatens Nxc7+ fork and hits d6.",
    },
    {
      id: 'fn3',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6'],
      highlights: [H('g6', KEY), H('h5', KEY)],
      say: "6…g6 — Black attacks White's queen on h5 to gain a tempo for defence. He has to: any other move loses to Nxc7+ next turn. The pawn move opens up the king's house, but Black has no choice. Notice that White's queen MUST move now, but every queen-move keeps the pressure going.",
      sayShort: "6…g6 — hits the queen to buy a tempo.",
    },
    {
      id: 'fn4',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3'],
      arrows: [A('f3', 'f7', ATK)],
      highlights: [H('f3', KEY), H('f7', KEY)],
      say: "7.Qf3 — the queen retreats but to a SQUARE THAT STILL ATTACKS f7. With the Bb3 already raking the same square, f7 is attacked twice. Black has to defend it. And the Nb5 hasn't moved — Nxc7+ is still on the menu. White's pieces are juggling threats like a circus performer.",
      sayShort: "7.Qf3 — still hits f7; Bb3 and Nb5 join.",
    },
    {
      id: 'fn5',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5'],
      highlights: [H('f5', KEY), H('f7', SOFT)],
      say: "7…f5 — Black blocks the queen's line to f7 with the f-pawn. It defends f7 AND blocks the queen's diagonal. But the pawn is now WAY out of position, leaving e6 and g6 holes around the king. And Nxc7+ is still on the board. Every Black move plugs one leak while opening another.",
      sayShort: "7…f5 — blocks but holes; Nxc7+ still threatened.",
    },
    {
      id: 'fn6',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5','Qd5'],
      highlights: [H('d5', KEY), H('f5', SOFT), H('a8', SOFT), H('c6', SOFT)],
      say: "8.Qd5! The queen returns to the centre with two simultaneous threats: it attacks the f5-pawn AND lines up against the a8-rook through the c6-knight. The Nb5 STILL hasn't moved. Black is now under four different active threats and must address all of them — which is impossible.",
      sayShort: "8.Qd5! — hits f5 and the a8-rook.",
    },
    {
      id: 'fn7',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5','Qd5','Qe7'],
      highlights: [H('e7', KEY)],
      say: "8…Qe7 — Black brings the queen out to defend everything at once. She covers the d6-knight, plugs the e-file, and tries to hold the position together. It's the best try — but Black has spent eight moves of FORCED defensive moves and not developed a single attacking piece. White's tactical haymaker is loaded for the killing blow.",
      sayShort: "8…Qe7 — best try, but nothing developed.",
    },
    {
      id: 'fn8',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5','Qd5','Qe7','Nxc7+'],
      arrows: [A('c7', 'a8', ATK), A('c7', 'e8', ATK)],
      highlights: [H('c7', KEY), H('a8', KEY), H('e8', SOFT)],
      say: "9.Nxc7+!! There it is — the threat that has hung over the board for four moves now lands. The knight crashes through, giving check to the king on e8 AND attacking the rook on a8. Black must move the king (no piece can capture the checking knight). And after the king moves, the knight is FREE to take the rook.",
      sayShort: "9.Nxc7+!! — check now, the a8-rook next.",
    },
    {
      id: 'fn9',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5','Qd5','Qe7','Nxc7+','Kd8','Nxa8'],
      highlights: [H('a8', KEY), H('d8', SOFT)],
      say: "9…Kd8 (forced) 10.Nxa8! White gobbles the rook. White is up an EXCHANGE and a pawn — a winning material edge that defines the position for the rest of the game. This is the Nxa8 raid, the most famous mini-combination in the Vienna's history. Lock it in: when Black plays 5…Nc6, the nine-move waterfall starts, and at the end of it White owns the rook.",
      sayShort: "10.Nxa8! — wins the exchange and a pawn.",
    },
    {
      id: 'fn10',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5','Qd5','Qe7','Nxc7+','Kd8','Nxa8'],
      highlights: [H('a8', KEY), H('b6', SOFT), H('b7', SOFT)],
      say: "Now what does the position PRODUCE? Black will play …b6 and …Bb7 trying to trap the Na8 — and theory says yes, the knight on a8 is dead, Black will recover it within a few moves. But that's the WHOLE POINT: in the four-or-five moves Black spends maneuvering to win back the knight, White develops freely, completes castling, and consolidates the exchange-plus-pawn material edge. The conversion plan is simple: castle long, get the king-knight out, push the d2-pawn to d4 to claim the centre while Black is busy with the queenside knight-hunt. By the time Black wins the Na8 back, White is fully developed with the exchange in the bank. Adams played the White side and won; Mamedyarov plays the Black side and tolerates the trapped knight as the price of the wild line. Theory: equal. Practice: White wins more often than not.",
      sayShort: "…b6, …Bb7 wins a8 back — White consolidates.",
    },
  ],
};

// ── WEAPON: Copycat Qg4 — Punish the Mirror ────────────────────
// Lives in the Classical (Main) tab. When Black plays 2...Nc6 then
// answers 3.Bc4 with the SYMMETRICAL 3...Bc5 — the "copycat" — White
// punishes the mirror with 4.Qg4!, threatening Qxg7 before Black has
// castled. The Black-side reply 4...Qf6 leads to the famous 5.Nd5!
// shot where the knight pins the queen on the f-file. Full-coverage
// 8 beats — pure Romantic-era Vienna at its quickest.
const COPYCAT_QG4: LessonScript = {
  openingId: 'vienna-game',
  title: 'Weapon: Copycat — Punish the Mirror with Qg4',
  minutes: 5,
  orientation: 'white',
  beats: [
    {
      id: 'cq1',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5'],
      arrows: [A('c5', 'f2', ATK), A('c4', 'f7', ATK)],
      highlights: [H('c5', KEY), H('c4', KEY), H('f2', SOFT), H('f7', SOFT)],
      say: "Symmetrical Italian-Vienna. Black has answered 3.Bc4 with the mirror move 3…Bc5, and the position looks balanced — White's Bc4 aimed at f7, Black's Bc5 aimed at f2. But the symmetry is an illusion. White has the move, and that single tempo is enough to break the mirror with a thunderbolt.",
      sayShort: "3…Bc5 — mirrors, but White moves first.",
    },
    {
      id: 'cq2',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4'],
      arrows: [A('g4', 'g7', ATK)],
      highlights: [H('g4', KEY), H('g7', KEY)],
      say: "4.Qg4! The queen jumps to g4 and immediately threatens Qxg7 — winning the h8-rook with the queen, since Black hasn't castled. This is the punishment for mirroring without addressing the difference in tempo. Black has to drop everything and defend g7 right now. Notice: Black's mirror move Bc5 doesn't help — his bishop on c5 doesn't defend g7.",
      sayShort: "4.Qg4! — threatens Qxg7; the mirror fails.",
    },
    {
      id: 'cq3',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6'],
      arrows: [A('f6', 'g7', VIS), A('f6', 'f2', ATK)],
      highlights: [H('f6', KEY), H('g7', SOFT), H('f2', KEY)],
      say: "4…Qf6 — the natural defense. The queen lands on f6 defending g7 AND, more importantly, attacking White's f2-pawn through the f-file. With the king still on e1, Qxf2+ would be checkmate — yes, mate, because the king has no escape squares. Suddenly Black thinks HE'S the one with the killing threat. He's about to discover otherwise.",
      sayShort: "4…Qf6 — defends g7, threatens Qxf2+.",
    },
    {
      id: 'cq4',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5'],
      arrows: [A('d5', 'f6', ATK), A('d5', 'c7', ATK)],
      highlights: [H('d5', KEY), H('f6', KEY), H('c7', KEY)],
      say: "5.Nd5!! White's c3-knight leaps to d5 — the IMMOVABLE outpost — with two simultaneous knight threats: it forks the queen on f6 AND threatens Nxc7+ next move forking king and rook. The queen on f6 must move, but every queen move loses material or position. This is the moment Black's mirror strategy collapses in a single tactic.",
      sayShort: "5.Nd5!! — forks queen, threatens Nxc7+; mirror falls.",
    },
    {
      id: 'cq5',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5','Qxf2+'],
      arrows: [A('f2', 'e1', ATK)],
      highlights: [H('f2', KEY), H('e1', KEY)],
      say: "5…Qxf2+! Black goes all-in on his original counter-attack. The queen captures the f2-pawn with check on the White king on e1. To a club player this looks decisive — the queen and bishop are now both threatening checkmate, and the c4-bishop is still on the long diagonal. Surely White must give up the king's right to castle and run? Yes. But that's exactly what he wants.",
      sayShort: "5…Qxf2+ — all in, check on the king.",
    },
    {
      id: 'cq6',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5','Qxf2+','Kd1'],
      highlights: [H('d1', KEY), H('e1', SOFT)],
      say: "6.Kd1!! White WALKS the king to d1 — a brilliant in-between move that refuses to spend tempo on defence. The king steps off e1 onto d1 where no Black piece can reach with check, and crucially the Nd5 STILL threatens Nxc7+ winning the rook. Black has temporarily won a pawn at f2, but his queen is dangerously exposed and his entire game-plan is hanging by a thread. Steinitz himself walked his king like this in attacking lines; the principle is the same — when you have the initiative, you can afford the king-walk.",
      sayShort: "6.Kd1!! — king walks; Nxc7+ still threatened.",
    },
    {
      id: 'cq7',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5','Qxf2+','Kd1','Kf8','Nh3','Qd4','d3'],
      highlights: [H('d4', KEY), H('d3', KEY)],
      say: "Black tries 6…Kf8 to dodge the Nxc7+ fork by removing the rook target. White develops with 7.Nh3 — bringing the other knight into play with eyes on g5 and f4 — and Black tries to consolidate with 7…Qd4 threatening to trade queens off and escape the storm. White answers 8.d3! protecting the position and continuing to develop. Black's queen is far from his army; every piece White brings out makes the queen's situation worse.",
      sayShort: "White develops; the Black queen is trapped.",
    },
    {
      id: 'cq8',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5','Qxf2+','Kd1','Kf8','Nh3','Qd4','d3','Bb6','Qf3'],
      highlights: [H('f3', KEY)],
      say: "9.Qf3 — the queen returns to defend and develop. Material is roughly equal (Black's pawn-grab balances White's better position), but White has a king safer than Black's, every piece developing onto active squares, the Nd5 dominating the centre, and the Bc4 still on the long diagonal. Black has a queen out of play, a king stuck on f8, and zero piece-coordination.",
      sayShort: "9.Qf3 — safer king, Nd5 outpost; mirror punished.",
    },
    {
      id: 'cq9',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5','Qxf2+','Kd1','Kf8','Nh3','Qd4','d3','Bb6','Qf3'],
      highlights: [H('d5', KEY), H('f7', SOFT), H('f3', SOFT)],
      say: "What does the position PRODUCE? The structural facts: White's Nd5 sits on an unassailable central square supported by the Qf3 and the c2/e4 pawn duo; the Bc4 still rakes the a2-g8 diagonal at f7; the rook on h1 will swing to f1 via Re1-Rf1 to attack the f-file once Black's queen leaves; and Black's king on f8 has lost castling rights forever, blocked the rook on h8 from coordinating, and stares at White's three-piece kingside attack with no defenders behind. The conversion plan: trade pieces if Black wants (every trade favours the side with the safer king + better structure), play c3 to clamp the d4-square and chase Black's queen, then bring the king-rook to f1 or e1. Steinitz used Qg4 ideas exactly like this to set up complete positional binds against his contemporaries — the prize for punishing the mirror move is not just the pawn, but the long-term game.",
      sayShort: "Nd5 outpost, Bc4 on f7, Black king stuck.",
    },
  ],
};

// ── WEAPON: The Pierce Gambit (4.d4) ───────────────────────────
// Lives in the vs 2…Nc6 line, alongside Hamppe-Allgaier/Muzio. After
// 3.f4 exf4, instead of 4.Nf3 (developing with tempo), Pierce played
// 4.d4 — a classical pawn-storm gambit, accepting an even WORSE
// material balance for control of the centre. Sharp positional gambit
// rather than the Hamppe sacrifice complex; same vs 2…Nc6 territory
// but a completely different attacking idea. Full-coverage 7 beats.
const PIERCE_GAMBIT: LessonScript = {
  openingId: 'vienna-game',
  title: 'Weapon: The Pierce Gambit (4.d4)',
  minutes: 5,
  orientation: 'white',
  beats: [
    {
      id: 'pg1',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4'],
      highlights: [H('d4', KEY), H('f4', SOFT)],
      say: "The Pierce Gambit: 4.d4! Instead of recapturing the f4-pawn with the knight (which gives Hamppe-Allgaier territory) or playing 4.Nf3 (the most common move), White DOUBLES DOWN on the gambit by sacrificing a SECOND pawn — the d4-pawn — for central control. Pierce, a 19th-century English player, found that the open d-file and the central pawn duo were worth more than the two pawns Black grabs.",
      sayShort: "4.d4! — the Pierce; sacrifice a second pawn.",
    },
    {
      id: 'pg2',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','d5'],
      highlights: [H('d5', KEY), H('e4', KEY)],
      say: "4…d5 — Black's best reply, the principled counter in the centre (exactly the same idea as Lasker's recommendation against the regular Vienna Gambit). Black challenges White's e4-pawn back. The tension between the central pawns is immediate, and the position will open dramatically with the next pawn trade.",
      sayShort: "4…d5 — counter in the centre; tension snaps.",
    },
    {
      id: 'pg3',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','d5','exd5'],
      highlights: [H('d5', KEY)],
      say: "5.exd5 — White exchanges in the centre. The e-file is now wide open, the d5-square is contested, and Black's queen-knight on c6 is attacked by the d5-pawn. Black must respond to the central thrust, and the only way to do so is to capture the d5-pawn — but with WHICH piece?",
      sayShort: '5.exd5 — open centre, contested d5, c6-knight under threat.',
    },
    {
      id: 'pg4',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','d5','exd5','Qxd5'],
      arrows: [A('d5', 'd4', ATK)],
      highlights: [H('d5', KEY), H('d4', KEY)],
      say: "5…Qxd5 — Black grabs the pawn with the queen, putting maximum pressure on the d4-square. The Black queen now sits in the middle of the board attacking the d4-pawn that White sacrificed. From Black's view, two pawns in hand, queen actively placed, position should be winning. From Pierce's view, White is one move away from chasing the queen with tempo and unleashing a full development.",
      sayShort: "5…Qxd5 — grabs the pawn, over-extends the queen.",
    },
    {
      id: 'pg5',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','d5','exd5','Qxd5','Nf3'],
      arrows: [A('c3', 'd5', ATK)],
      highlights: [H('f3', KEY), H('c3', KEY), H('d5', KEY)],
      say: "6.Nf3 — develop with tempo. Critically, the Nc3 has been ATTACKING the d5-queen since Black's queen landed there last move. Black must move the queen, which is one more lost tempo on top of the two pawns he chased. White is rapidly equalising material through development pressure.",
      sayShort: "6.Nf3 — develops, hits d5; the queen flees again.",
    },
    {
      id: 'pg6',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','d5','exd5','Qxd5','Nf3','Bg4'],
      highlights: [H('g4', KEY), H('f3', SOFT)],
      say: "6…Bg4 — Black pins the f3-knight to the queen on d1, trying to maintain his developmental edge. But the pin is just a tactical resource, not a winning advantage. White has the e-file, the d4-pawn lever still in his pocket (to be replaced by Bxf4 next), the bishop on f1 ready for c4 with attack on the queen again, and full piece coordination right around the corner. The two pawns Black grabbed cost him five tempi of forced reactions.",
      sayShort: "6…Bg4 — pins, but White's lead compensates.",
    },
    {
      id: 'pg7',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','d5','exd5','Qxd5','Nf3','Bg4'],
      say: "The verdict on the Pierce Gambit: theoretically the position after these moves is balanced — engines say Black is slightly better with the two extra pawns IF he can survive the development race. The queen on d5 is the practical problem: every White piece comes out with tempo on it.",
      sayShort: 'The verdict: engine equal, human practical White edge.',
      highlights: [H('d5', SOFT)],
    },
    {
      id: 'pg8',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','d5','exd5','Qxd5','Nf3','Bg4'],
      highlights: [H('d5', KEY), H('f4', SOFT), H('g4', SOFT)],
      say: "What does the Pierce position PRODUCE? Three concrete facts: the queen on d5 is a magnet — Bc4 hits it next move with another tempo, Nc3 already attacked it once, and every developing move continues the chase; the open e-file is wide open for White to throw the rook there with Re1 once castling lands; and the Bg4-pin on the f3-knight is FRAGILE because h3 just asks the bishop to commit, and any pin-piece-trade leaves Black even more behind in development. The conversion plan: 7.Bc4 (third attack on d5, queen moves yet again), 8.O-O (king-side safety + Re1), 9.h3 (challenge the Bg4-pin), 10.Bxf4 (recover the gambit pawn). By move 12 White will have full development, the bishop pair, the open e-file, and Black's queen still wandering. The Pierce is less wild than the Hamppe sacrifices but works the same way: punish Black for accepting a free pawn by making him spend every move defending.",
      sayShort: "Queen on d5 hunted; convert with Bc4, O-O.",
    },
  ],
};

// ── WEAPON: Steinitz Gambit (4.d4 Qh4+ 5.Ke2!?) ────────────────
// The most outrageous weapon in the Vienna: in response to 4.d4 Black
// plays 4…Qh4+ thinking he wins the f4-pawn AND development. White
// answers 5.Ke2!? — the king walks to e2 instead of blocking the
// check. Pure Steinitz audacity: the king is the centre of the army.
// The opening was named after him because he played it in serious
// games. Theoretically dubious; practically devastating against any
// opponent who hasn't memorised the right defensive sequence.
const STEINITZ_GAMBIT: LessonScript = {
  openingId: 'vienna-game',
  title: "Weapon: Steinitz's King-Walk Gambit",
  minutes: 6,
  orientation: 'white',
  beats: [
    {
      id: 'sg1',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4'],
      highlights: [H('d4', KEY)],
      say: "Same Pierce setup — 4.d4! the central pawn gambit. But now suppose Black ventures the most aggressive reply imaginable.",
      sayShort: "4.d4 — same Pierce setup; Black gets ambitious.",
    },
    {
      id: 'sg2',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+'],
      arrows: [A('h4', 'e1', ATK)],
      highlights: [H('h4', KEY), H('e1', KEY)],
      say: "4…Qh4+! Black's queen rushes out with check on the e1-king, threatening to plant herself in White's face. This is the move that creates one of the most famous lines in chess history. Black's reasoning: White must block the check, and the natural block (g3) loses the f4-pawn AND weakens the kingside permanently. Surely White is in trouble?",
      sayShort: "4…Qh4+! — the early queen-check gamble.",
    },
    {
      id: 'sg3',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2'],
      highlights: [H('e2', KEY), H('e1', SOFT)],
      say: "5.Ke2!! Wilhelm Steinitz himself, the first world champion, walked his king from e1 to e2 — refusing to block the check, refusing to commit a pawn. The king moves INTO the centre on move five. Every modern player's instinct screams against this. But Steinitz's positional theory held that the king is a fighting piece, and that with the queens still on the board, White's king on e2 is no MORE exposed than Black's on e8 — the difference is just the right to castle, which Steinitz judged a fair trade for keeping the pawn structure intact. Steinitz brings his pieces out one by one; the Black queen on h4 stays stuck in enemy territory.",
      sayShort: "5.Ke2!! — Steinitz walked the king himself.",
    },
    {
      id: 'sg4',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6'],
      highlights: [H('d6', KEY)],
      say: "5…d6 — Black develops solidly, opening lines for the queen-bishop. He could try 5…b6 or 5…Nf6 instead but every Black move now has to balance attacking the e2-king against developing pieces normally. White's king on e2 is unconventional, but it's not actually being attacked — the queen on h4 doesn't reach e2 because the e1-h4 diagonal route is blocked by White's own e-pawn (currently on e4).",
      sayShort: "5…d6 — develops; now every move juggles.",
    },
    {
      id: 'sg5',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6','Nf3'],
      arrows: [A('f3', 'h4', ATK)],
      highlights: [H('f3', KEY), H('h4', KEY)],
      say: "6.Nf3! The king-knight develops, and most importantly it ATTACKS the queen on h4 directly. Black must move the queen — and every queen move from h4 is unappealing: Qh5 or Qg4 stays in the kingside but Black has nothing to do there; back to f6 loses tempo. White gains a tempo on the queen and rapidly catches up in development.",
      sayShort: "6.Nf3 — develops, attacks the queen; lost tempo.",
    },
    {
      id: 'sg6',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6','Nf3','Bg4'],
      highlights: [H('g4', KEY)],
      say: "6…Bg4 — Black tries to pin the f3-knight. The bishop also defends the queen via the long diagonal. But the pin is illusory: the king on e2 is defended by the queen on d1, and even if White wants to break the pin, h3 attacks the bishop. Meanwhile White's army is mobilising.",
      sayShort: "6…Bg4 — pins, but the pin is fragile.",
    },
    {
      id: 'sg7',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6','Nf3','Bg4','Bxf4'],
      arrows: [A('f4', 'h6', VIS), A('f4', 'd6', ATK)],
      highlights: [H('f4', KEY)],
      say: "7.Bxf4! White recaptures the gambit pawn, getting his bishop into the attack on a square that eyes h6 (Black's kingside) AND attacks the d6-pawn. White has now caught up in pieces developed, recovered one of the sacrificed pawns, and his king on e2 is annoyingly still safer than Black's queen on h4. This is what Steinitz meant — opening rules don't apply when the centre is full of pieces and the opponent's queen is misplaced.",
      sayShort: "7.Bxf4 — regains the pawn, hits d6; fully developed.",
    },
    {
      id: 'sg8',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6','Nf3','Bg4','Bxf4'],
      say: "The verdict on the Steinitz Gambit: modern theory considers it dubious because Black can defend correctly with deep computer preparation. But against a human who hasn't done that preparation, the line is murderous — White just hunts the misplaced queen and uses every tempo to attack.",
      sayShort: 'Verdict: dubious against engines, devastating against humans.',
    },
    {
      id: 'sg9',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6','Nf3','Bg4','Bxf4'],
      highlights: [H('e2', KEY), H('h4', KEY), H('d4', SOFT), H('e4', SOFT)],
      say: "What does the Steinitz position PRODUCE? Three structural facts that explain why a world champion played it: White has the d4-e4 pawn duo controlling the centre absolutely; the Bf4 just recovered the gambit pawn AND threatens Bxd6 next move winning ANOTHER pawn; and the Black queen on h4 is FAR from her army, a magnet that every White piece can attack as it comes out. The king on e2 looks scary but is actually well-protected: the Nf3 covers the e1-h4 diagonal-check threat, the Bf4 covers c1 ideas, and Black has no rook on the e-file to exploit. The conversion plan: Kd2 (eventually) to slide the king to safety on c1 after the queen is pacified, then Re1 swings the king-rook onto the open e-file, then push for an exchange of queens via Qd3-h7+ tactics to enter an endgame UP material. The opening's NAME is the verdict — a world champion played it because the practical chances are that good. Treat this as a weapon for blitz, rapid, and any game where your opponent can't memorise twenty-move only-move sequences. The king on e2 is not a bug — it's the feature.",
      sayShort: "Centre, Bf4 on d6, queen a magnet — convert.",
    },
  ],
};

// ── WARNING: 3…Nxe4 demands 4.Qh5 — show-the-trap-then-rewind ──
// Lives in the Frankenstein-Dracula tab. When Black plays 3…Nxe4, the
// ONLY refutation is 4.Qh5! threatening Qxf7#. If White recaptures
// (4.Nxe4) or plays any normal-looking development move, Black plays
// …d5 and equalises with a free pawn. Warning pattern: show the
// natural White move that loses the edge, then snap the board back
// to the correct 4.Qh5.
const NXE4_NO_QH5: LessonScript = {
  openingId: 'vienna-game',
  title: 'Watch out: 3…Nxe4 demands 4.Qh5',
  minutes: 3,
  orientation: 'white',
  beats: [
    {
      id: 'wn1',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4'],
      highlights: [H('e4', KEY)],
      say: "The Frankenstein-Dracula starting position. Black has just played 3…Nxe4 — grabbing the e4-pawn, banking on the pin from Bc4 to make the recapture awkward. The c3-knight is pinned, the e-pawn is gone, and White's instinct is to either recapture with Nxe4 or to develop calmly. Either instinct loses White's entire opening advantage.",
      sayShort: "3…Nxe4 — only one right reply keeps the edge.",
    },
    {
      id: 'wn2',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Nxe4','d5'],
      highlights: [H('d5', KEY), H('c4', KEY), H('e4', KEY)],
      say: "4.Nxe4?? d5! And Black has equalised completely. The d5-pawn forks the c4-bishop AND attacks the e4-knight. White must move the bishop, Black plays …dxe4, and the position is dead equal with no compensation for the lost initiative. The Vienna Gambit's pawn sacrifice loses its punch entirely — this is the slip every player must avoid.",
      sayShort: "4.Nxe4?? d5! — Black forks and equalises.",
    },
    {
      id: 'wn3',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5'],
      arrows: [A('h5', 'f7', ATK), A('h5', 'e5', ATK)],
      highlights: [H('h5', KEY), H('f7', KEY), H('e5', SOFT), H('e4', SOFT)],
      say: "Rewind. The ONLY refutation is 4.Qh5! From h5 the queen attacks two squares at once: the f7-square (threatening Qxf7 MATE) and the e5-pawn straight down the h5-e5 diagonal. Forget the natural recapture. The Frankenstein-Dracula begins HERE with the queen leap — every other White move just gifts Black equality. Lock this in: 3…Nxe4 demands 4.Qh5, full stop. The dragon must wake up immediately.",
      sayShort: "Rewind: 4.Qh5! — the only move; threatens mate.",
    },
    {
      id: 'wn4',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5'],
      highlights: [H('h5', SOFT), H('f7', SOFT), H('d6', SOFT)],
      say: "Why is 4.Qh5 the ONLY move? Because every other White reply lets Black equalise OR seize the initiative. 4.Nxe4 d5! forks the c4-bishop and the e4-knight — Black wins a piece back with an active centre. 4.Bxf7+ Kxf7 5.Nxe4 d5 — same idea, Black just trades pieces and emerges with central control. 4.d3 Nxc3 — Black trades into a clean position a pawn up. The Qh5 leap is the ONLY move that fights for an edge because it threatens Qxf7 MATE in one — a threat so concrete it forces Black to play the awkward 4…Nd6 burying his own knight on a square it doesn't want. Memorise this: in the Vienna's Bc4 line, …Nxe4 is the moment the Qh5 must come out. No development move, no recapture — just Qh5.",
      sayShort: "Only Qh5 keeps the edge — others allow …d5.",
    },
  ],
};

/** Trap lessons keyed by trap id. Populated as the lessons land. */
export const VIENNA_TRAP_LESSONS: Record<string, LessonScript> = {
  wurzburger: WURZBURGER,
  'hamppe-allgaier': HAMPPE_ALLGAIER,
  'hamppe-muzio': HAMPPE_MUZIO,
  'frankenstein-nxa8': FRANKENSTEIN_NXA8,
  'copycat-qg4': COPYCAT_QG4,
  'pierce-gambit': PIERCE_GAMBIT,
  'steinitz-gambit': STEINITZ_GAMBIT,
  'nxe4-no-qh5': NXE4_NO_QH5,
};

export type ViennaTrapKind = 'weapon' | 'warning';
export interface ViennaTrapDef {
  id: string;
  name: string;
  kind: ViennaTrapKind;
  /** Hand-picked tab labels (lower-case) this trap appears on. */
  appliesTo: string[];
}

/** HAND-PICKED routing — which trap shows on which tab. No algo. The
 *  defs ship now (so the tabs surface tiles for them); the LessonScripts
 *  land into VIENNA_TRAP_LESSONS progressively as each weapon is authored. */
export const VIENNA_TRAP_DEFS: ViennaTrapDef[] = [
  { id: 'wurzburger', name: 'The Wurzburger Trap', kind: 'weapon', appliesTo: ['gambit'] },
  { id: 'hamppe-allgaier', name: 'Hamppe-Allgaier Sacrifice', kind: 'weapon', appliesTo: ['vs 2…nc6'] },
  { id: 'hamppe-muzio', name: 'Hamppe-Muzio Sacrifice', kind: 'weapon', appliesTo: ['vs 2…nc6'] },
  { id: 'frankenstein-nxa8', name: 'Frankenstein-Dracula: the Nxa8 Raid', kind: 'weapon', appliesTo: ['frankenstein-dracula'] },
  // Copycat lives on the vs 2…Nc6 tab — in the 2…Nf6 mainline the
  // f6-knight attacks g4, so the Qg4 punishment only works after 2…Nc6.
  { id: 'copycat-qg4', name: 'Copycat: Qg4 punishes the mirror', kind: 'weapon', appliesTo: ['vs 2…nc6'] },
  { id: 'pierce-gambit', name: 'The Pierce Gambit', kind: 'weapon', appliesTo: ['vs 2…nc6'] },
  { id: 'steinitz-gambit', name: "Steinitz's King-Walk Gambit", kind: 'weapon', appliesTo: ['vs 2…nc6'] },
  { id: 'nxe4-no-qh5', name: 'Watch out: 3…Nxe4 demands 4.Qh5', kind: 'warning', appliesTo: ['frankenstein-dracula'] },
];

/** Trap defs for a given tab label ('main' for the main line). Returns
 *  ONLY the defs whose lessons have actually been authored — keeps half-
 *  built tiles off the tab until the lesson lands. */
export function getViennaTrapsForTab(tabKey: string): ViennaTrapDef[] {
  return VIENNA_TRAP_DEFS.filter(
    (t) => t.appliesTo.includes(tabKey) && t.id in VIENNA_TRAP_LESSONS,
  );
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Convert a Vienna trap lesson into a playable line for Learn/Practice.
 *  Same converter shape as ruyTrapLessons.getRuyTrapPlayableLine — see
 *  that file for the contract (last beat = teaching line; prefix beats'
 *  say text carried VERBATIM onto their move). */
export function getViennaTrapPlayableLine(id: string): PlayableMiddlegameLine | null {
  const lesson = VIENNA_TRAP_LESSONS[id];
  if (!lesson || lesson.beats.length === 0) return null;
  const lineBeat = lesson.beats[lesson.beats.length - 1];
  const moves = lineBeat.moves;
  const annotations: string[] = moves.map(() => '');
  const arrows: AnnotationArrow[][] = moves.map(() => []);
  const highlights: AnnotationHighlight[][] = moves.map(() => []);
  for (const beat of lesson.beats) {
    if (beat.moves.length > moves.length) continue;
    if (!beat.moves.every((m, i) => m === moves[i])) continue;
    const ply = beat.moves.length - 1;
    if (ply < 0) continue;
    annotations[ply] = beat.say;
    if (beat.arrows) arrows[ply] = beat.arrows;
    if (beat.highlights) highlights[ply] = beat.highlights;
  }
  return { fen: START_FEN, moves, annotations, arrows, highlights, title: lesson.title };
}
