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
// "lots of traps/weapons") — so you don't cap to the Ruy's 5-trap cadence.
//
// Slate: 6 weapons + 1 warning, distributed across the 4 variation tabs.
//
//   WEAPONS (Black slips → White punishes, PGN ends with White better):
//     1. wurzburger          → gambit                 — Wurzburger Trap
//     2. hamppe-allgaier     → vs 2…nc6              — the f7 sacrifice
//     3. hamppe-muzio        → vs 2…nc6              — castle into the gambit
//     4. frankenstein-nxa8   → frankenstein-dracula   — Nxc7+ Nxa8 raid
//     5. copycat-qg4         → main (Classical)       — Qg4 on g7 when Black mirrors
//     6. steinitz-gambit     → vs 2…nc6              — d4 Qh4+ Ke2!? king-walk
//
//   WARNINGS (White must avoid):
//     1. nxe4-no-qh5         → frankenstein-dracula   — must play Qh5 vs ...Nxe4
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
// Lives in the Vienna Gambit (f4 d5 fxe5 Nxe4). After d3 — looking
// like a normal Gambit move — Black ventures the natural-looking
// Qh4+ g3 Nxg3 sequence thinking he wins material. Nf3! is the
// only-move that springs the trap, and Nxd5! collapses Black's whole
// idea. Full-coverage 9-beat treatment per the playbook's locked rule.
const WURZBURGER: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Weapon: The Wurzburger Trap',
  minutes: 6,
  orientation: 'white',
  beats: [
    {
      id: 'wt1',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3'],
      highlights: [H('e4', KEY), H('d3', SOFT)],
      say: "Welcome to the Vienna Gambit's signature trap. The position so far is the Vienna Gambit Modern Variation: Black declined the gambit with the principled d5, White accepted with fxe5, Black grabbed the e4-pawn with the knight, and now White attacks that knight with the modest d3. The d3-pawn looks like the most obvious developing move on the board — but it sets up a trap that has caught players for over a century. Black has one ambitious-looking reply that LOSES the entire game inside four moves.",
      sayShort: "d3 — attacks the knight; a quiet-looking trap.",
    },
    {
      id: 'wt2',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+'],
      arrows: [A('h4', 'e1', ATK)],
      highlights: [H('h4', KEY), H('e1', SOFT)],
      say: "Qh4+! The queen leaps to h4 with check on the e1-king. Black's reasoning is razor-sharp: the d3-pawn attacks the e4-knight, but the knight has Qh4+ available to force White's hand. White must address the check, and the only way to do it without giving up a piece is with g3 — which then leaves the e4-knight free to grab the g-pawn with check. Black sees a forced material win. It would be brilliant, if it worked.",
      sayShort: "Qh4+! — the check forces White's g3 weakness.",
    },
    {
      id: 'wt3',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3'],
      highlights: [H('g3', KEY)],
      say: "g3 — forced. White cannot interpose with anything else: the f-pawn is gone (captured at fxe5), so g3 is the only block. Black's plan now seems to crash through. The e4-knight is no longer just attacked — it can grab the new g3-pawn with check ideas and threats against the rook on h1.",
      sayShort: "g3 — forced; now the e4-knight eyes g3.",
    },
    {
      id: 'wt4',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3'],
      arrows: [A('g3', 'h1', ATK)],
      highlights: [H('g3', KEY), H('h1', KEY)],
      say: "Nxg3! Black grabs the pawn, and now look at what's threatened. The Black knight on g3 attacks the rook on h1 — next move plays Nxh1, and Black has won a rook plus a pawn for a knight. Decisive material. White's army looks paralysed: take the knight back with hxg3 and the queen on h4 captures the rook on h1; recapture any other way and Black just takes the rook. Black is one move away from winning the game.",
      sayShort: "Nxg3! — threatens Nxh1; Black looks winning.",
    },
    {
      id: 'wt5',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3'],
      arrows: [A('f3', 'h4', ATK)],
      highlights: [H('f3', KEY), H('h4', KEY)],
      say: "Nf3! The trap springs — and it is the LAST thing Black is expecting. White completely ignores the knight on g3 and develops with TEMPO, attacking the Black queen on h4. Suddenly Black must save their queen before they save their knight. The greedy plan reverses on them in a single move. This is the Wurzburger Trap: White's saving idea is not defence but counter-attack on the most powerful Black piece.",
      sayShort: "Nf3! — ignores it, attacks the queen; trap sprung.",
    },
    {
      id: 'wt6',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3','Qh5'],
      highlights: [H('h5', KEY)],
      say: "Qh5 — Black retreats the queen, but every queen-move now has consequences. They picked h5 because it still hovers near the kingside and pins the f3-knight along the h5-d1 diagonal. Black hopes the pin saves the day and that their knight on g3 will be defendable next move. But the pin is illusory — White's queen on d1 has an answer — and the g3-knight is hanging to the h2-pawn the entire time.",
      sayShort: "Qh5 — retreats; the g3-knight still hangs.",
    },
    {
      id: 'wt7',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3','Qh5','Nxd5'],
      arrows: [A('d5', 'c7', ATK)],
      highlights: [H('d5', KEY), H('c7', KEY), H('h1', SOFT)],
      say: "Nxd5! The counter-attack lands. The knight takes the d5-pawn and threatens Nxc7+, forking the king and the a8-rook. Black is not lost, though: …Nxh1 grabs White's rook in return, and after Nxc7+ Kd8 Nxa8 both sides have raided a corner. The engine calls the resulting mess roughly level.",
      sayShort: "Nxd5! — threatens Nxc7+; Black grabs h1.",
    },
    {
      id: 'wt8',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3','Qh5','Nxd5'],
      say: "What makes this line worth knowing? Every Black move from Qh4+ to Qh5 looks natural — Qh4+ feels like the winning blow, Nxg3 looks like cashing in. White's answer is not to defend but to counter-attack the most valuable Black piece with Nf3 and then Nxd5. That is the method to take away: when the opponent's idea relies on a forced sequence, break it by changing the subject.",
      sayShort: "The lesson: change the subject with Nf3.",
      highlights: [H('f3', SOFT)],
    },
    {
      id: 'wt9',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3','Qh5','Nxd5'],
      say: "Look at what the position now produces: an unbalanced, double-edged fight. Black's knight is about to take the h1-rook; White's knight is about to take the a8-rook via c7; Black's king will be stuck in the centre. Neither side has a clear edge — the engine calls it roughly level — so the side that calculates the next few moves better wins.",
      sayShort: "A wild, level fight — calculate it.",
      highlights: [H('h1', SOFT), H('a8', SOFT)],
    },
    {
      id: 'wt10',
      moves: ['e4','e5','Nc3','Nf6','f4','d5','fxe5','Nxe4','d3','Qh4+','g3','Nxg3','Nf3','Qh5','Nxd5'],
      say: "The Wurzburger line arrives when Black plays the Vienna Gambit with …d5 and then ventures Qh4+ against your d3. It is not a trap that wins by force: with accurate play Black reaches a messy, level position. Its value is surprise — over the board the counter-attack with Nf3 and Nxd5 is hard to meet, and the position suits the player who knows it.",
      sayShort: "Not forced — a surprise weapon, roughly level.",
      highlights: [H('d5', SOFT)],
    },
  ],
};

// ── WEAPON: The Hamppe-Allgaier Sacrifice ──────────────────────
// Lives in the vs Nc6 line, after the Vienna Gambit Accepted (f4
// exf4) and Black's greedy …g5 hold. The knight launches from g5 with
// Nxf7! — the famous sacrifice that strips Black's king open. Two
// pawns and a huge initiative for the knight; against an unprepared
// opponent this is one of the most dangerous practical weapons in the
// White repertoire. Full-coverage 8-beat treatment.
const HAMPPE_ALLGAIER: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Weapon: The Hamppe-Allgaier Sacrifice',
  minutes: 6,
  orientation: 'white',
  beats: [
    {
      id: 'ha1',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5'],
      arrows: [A('g5', 'f7', ATK), A('g5', 'h7', ATK)],
      highlights: [H('g5', KEY), H('f7', KEY)],
      say: "Here you are at the launchpad. Black has accepted the Vienna Gambit with exf4, held the gambit pawn with g5, and now after h4 g4 Ng5 the knight leaps to g5 deep in Black's territory, eyeing the f7-square AND the h7-pawn at once. Black thinks the knight is trapped, but in this position it has work to do. The most famous sacrifice in the Vienna's entire history is coming.",
      sayShort: "Ng5 — the launchpad; the knight isn't trapped.",
    },
    {
      id: 'ha2',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6'],
      highlights: [H('h6', KEY), H('g5', SOFT)],
      say: "h6 — Black attacks the knight on g5, fully expecting it to retreat to h3 or f3 in shame. Every developing instinct says the knight must move. But the Hamppe-Allgaier, named after the players who made it famous, does something else here: the knight refuses to retreat and SACRIFICES itself instead. Losing a knight for a pawn is normally madness, and the moves that follow show what White gets for it.",
      sayShort: "h6 — Black expects retreat; the knight stays.",
    },
    {
      id: 'ha3',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7'],
      arrows: [A('f7', 'd8', ATK), A('f7', 'h8', ATK)],
      highlights: [H('f7', KEY), H('d8', SOFT), H('h8', SOFT)],
      say: "Nxf7! The sacrifice. White's knight crashes into f7 — the softest square in front of Black's king — and from there it forks the queen on d8 and the rook on h8. Refusing the knight loses the queen or rook immediately. Black has no choice but to capture, and the moment they do their king is dragged out into the open in the middle of the board. Steinitz wrote that the king is a fighting piece, but they meant in the endgame. On move seven they are a target.",
      sayShort: "Nxf7! — forks queen and rook; king exposed.",
    },
    {
      id: 'ha4',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7'],
      highlights: [H('f7', KEY)],
      say: "Kxf7 — forced. So the king is hauled onto f7 in the middlegame, no shelter overhead, no pawn cover, no pieces around to defend it. The whole board is now a hunting ground. White is a knight down for one pawn, but Black is two miles from safety and ten moves of careful defence away from consolidating.",
      sayShort: "Kxf7 — forced; the king walks out naked.",
    },
    {
      id: 'ha5',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7','Bc4+'],
      arrows: [A('c4', 'f7', ATK)],
      highlights: [H('c4', KEY), H('f7', KEY)],
      say: "Bc4+! The bishop checks the king on f7 along the a2-g8 diagonal. It is the same bishop and the same diagonal White uses against f7 in the other Vienna lines, now hitting a king that has already been dragged out.",
      sayShort: "Bc4+! — the bishop hits the king on f7.",
    },
    {
      id: 'ha6',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7','Bc4+','d5'],
      highlights: [H('d5', KEY)],
      say: "d5 — Black blocks the check with the only pawn that can intervene, sacrificing it to interpose. The d-pawn was Black's central development; now it's already gone. White will recapture next move and the centre will collapse in their favour. Each defensive move Black makes from here strips off another shield.",
      sayShort: "d5 — blocks the check, loses the centre pawn.",
    },
    {
      id: 'ha7',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7','Bc4+','d5','Bxd5+','Ke8'],
      highlights: [H('d5', KEY), H('e8', SOFT)],
      say: "Bxd5+ — bishop takes the d-pawn WITH CHECK on the king once more. Black plays Ke8, retreating the king back to its original square — but the king's right to castle has been permanently destroyed. The bishop on d5 now sits in the heart of the board, eyeing both wings the moment the c6-knight steps aside. White has recovered one of the pawns they sacrificed, AND they have rebuilt a centralised attacking force with every piece aimed at the Black king.",
      sayShort: "Bxd5+ — second check; the king loses castling.",
    },
    {
      id: 'ha8',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7','Bc4+','d5','Bxd5+','Ke8','d4'],
      highlights: [H('d4', KEY), H('e4', KEY)],
      say: "d4 — White completes the centre with the d4-e4 pawn duo. Count the material honestly: White has given a knight for a pawn. In return Black's king is stuck on e8 without castling rights and the Bd5 rakes the board. The engine still prefers Black by about a pawn — this is a gambit you play for practical chances, not a forced win.",
      sayShort: "d4 — a knight down for a pawn, attacking.",
    },
    {
      id: 'ha9',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','h4','g4','Ng5','h6','Nxf7','Kxf7','Bc4+','d5','Bxd5+','Ke8','d4'],
      highlights: [H('d5', KEY), H('e4', KEY), H('f4', SOFT)],
      say: "What does the position produce? White's d4-e4 pawn duo dominates the centre and Black has no central pawn to challenge it; the Bd5 owns the long light diagonal; Black's queen, bishops and a8-rook are still at home. The plan: Bxf4 to win back a gambit pawn, Qd3 or Qf3 toward the kingside, and O-O-O to bring the rook in. Be honest about the verdict: with accurate defence Black keeps the extra piece and the engine prefers Black — the Hamppe-Allgaier is a sharp surprise weapon whose dangers lie in how hard it is to defend at the board.",
      sayShort: "Big centre and Bd5 — but Black is better.",
    },
  ],
};

// ── WEAPON: The Hamppe-Muzio — Castle Into the Sacrifice ───────
// Lives in the vs Nc6 line, alongside the Hamppe-Allgaier. After
// f4 exf4 Nf3 g5, INSTEAD of h4 (Hamppe-Allgaier setup) White
// plays Bc4 g4 O-O!? — castling INTO a knight sacrifice, the
// most insane practical line in the entire Vienna. Two pawns AND
// the right to castle, all for a knight that's about to fall. Pure
// 19th-century Romantic chess: a permanent attack on the f-file
// against a king with no easy way to safety. Full-coverage 8 beats.
const HAMPPE_MUZIO: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Weapon: The Hamppe-Muzio — Castle Into the Sacrifice',
  minutes: 6,
  orientation: 'white',
  beats: [
    {
      id: 'hm1',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4'],
      arrows: [A('c4', 'f7', ATK)],
      highlights: [H('c4', KEY), H('f7', KEY)],
      say: "Same launchpad as the Hamppe-Allgaier — Black has taken the gambit, played …g5 to hold, and now White makes a different fifth move. Bc4! — the Italian-Vienna bishop swings out IMMEDIATELY, before the h4-g5 lever, eyeing f7 from the very square the Hamppe-Allgaier saves for later. This is a completely different attacking idea, and the move that follows is the most insane in the whole Vienna catalogue.",
      sayShort: "Bc4 — bishop first; a different attacking idea.",
    },
    {
      id: 'hm2',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4'],
      highlights: [H('g4', KEY), H('f3', KEY)],
      say: "g4 — Black, having already been promised this kingside expansion, attacks the f3-knight. They think the knight has to retreat or trade itself for a pawn. They think White will play Ne5 or Nh4 in shame. But there is a third option that has terrified opponents for nearly two centuries.",
      sayShort: "g4 — attacks the knight; White's third option.",
    },
    {
      id: 'hm3',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O'],
      arrows: [A('c4', 'f7', ATK)],
      highlights: [H('g1', KEY), H('f1', KEY), H('f7', KEY)],
      say: "O-O!! White CASTLES — king to g1, leaving the knight on f3 hanging — and the rook lands on f1 ready to fire down the f-file the instant the f3-knight steps aside. This is the Hamppe-Muzio: White willingly gives up the knight to put a major piece behind the f-file with the bishop on c4 already targeting f7. Two pawns AND the knight, gone in three moves, for a permanent attack against a king that cannot easily castle. Even Steinitz, who built his reputation tearing down Romantic-era attackers, respected this line.",
      sayShort: "O-O!! — castle into the sacrifice.",
    },
    {
      id: 'hm4',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3'],
      highlights: [H('f3', KEY)],
      say: "gxf3 — Black takes the knight. They have to: refusing gives White the f3-knight back AND keeps all the attacking pressure. So now Black is up a full piece and TWO pawns. Materially they are winning by a wide margin. Practically, they're about to defend a kingside the entire rest of the game with no pieces developed and a king stuck in the centre.",
      sayShort: "gxf3 — up a piece, practically doomed.",
    },
    {
      id: 'hm5',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3','Qxf3'],
      arrows: [A('c4', 'f7', ATK)],
      highlights: [H('f3', KEY), H('f7', KEY), H('f4', SOFT)],
      say: "Qxf3 — the queen recaptures and now THREE White pieces are aimed at the kingside attack: the queen on f3 driving down the centre, the bishop on c4 staring straight at f7, and the rook on f1 sitting behind both with the f-file primed to open. Black's f4-pawn is the only thing blocking the queen's reach toward f7; one trade and the line opens. The c1-bishop and the c3-knight are still home and ready to join. White is down a knight but every piece is pointed at the same square.",
      sayShort: "Qxf3 — queen, bishop, rook all aim kingside.",
    },
    {
      id: 'hm6',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3','Qxf3','Qf6'],
      arrows: [A('f6', 'f7', VIS)],
      highlights: [H('f6', KEY), H('f7', SOFT)],
      say: "Qf6 — the natural defensive move. Black brings the queen out to f6 to defend f7 and contest the f-file. It looks like consolidation, but the queen on f6 is about to become a target.",
      sayShort: "Qf6 — defends f7, but becomes a target.",
    },
    {
      id: 'hm7',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3','Qxf3','Qf6','Nd5'],
      arrows: [A('d5', 'f6', ATK), A('d5', 'c7', ATK)],
      highlights: [H('d5', KEY), H('f6', KEY), H('c7', SOFT)],
      say: "Nd5! The knight jumps into the centre with tempo on the queen on f6, and it eyes c7, where Nxc7+ would hit the king and the a8-rook. Careful: the natural-looking e5 here is a mistake — after …Nxe5 Black consolidates and the engine swings to Black. Nd5 keeps the initiative.",
      sayShort: "Nd5! — hit the queen, eye c7.",
    },
    {
      id: 'hm8',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3','Qxf3','Qf6','Nd5','Qd4+','Kh1','Bd6'],
      highlights: [H('d6', KEY), H('c7', SOFT), H('h1', SOFT)],
      say: "…Qd4+ Kh1 Bd6 — Black checks, then shields c7 with the bishop. White's king steps into the corner, and the half-open f-file stays ready for the rook.",
      sayShort: "…Bd6 — Black shields c7.",
    },
    {
      id: 'hm9',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','Nf3','g5','Bc4','g4','O-O','gxf3','Qxf3','Qf6','Nd5','Qd4+','Kh1','Bd6','d3','Qg7','Bxf4'],
      arrows: [A('f4', 'd6', ATK)],
      highlights: [H('f4', KEY), H('d6', SOFT)],
      say: "d3 Qg7 Bxf4 — White opens the c1-bishop, wins back a gambit pawn, and the bishop now hits d6. Count it honestly: White is a knight down for a pawn, but Black's king is stuck in the centre and every White piece is active. The engine gives White a small edge — the Hamppe-Muzio is a sharp, playable gambit, not a forced win.",
      sayShort: "Bxf4 — pawn back, small White edge.",
    },
  ],
};

// ── WEAPON: Frankenstein-Dracula — the Nxa8 Raid ──────────────
// The Frankenstein-Dracula variation lesson teaches the trunk; this
// weapon zooms into the famous queen-chase-then-rook-raid that fires
// when Black picks Nc6 instead of Be7. Nine moves of forced
// sequences ending with White's knight devouring the a8-rook — the
// single most memorable mini-combination in the Vienna's repertoire.
// Full-coverage 9 beats.
const FRANKENSTEIN_NXA8: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Weapon: Frankenstein-Dracula — the Nxa8 Raid',
  minutes: 7,
  orientation: 'white',
  beats: [
    {
      id: 'fn1',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6'],
      arrows: [A('b3', 'f7', ATK)],
      highlights: [H('c6', KEY), H('f7', SOFT)],
      say: "Here is where the Frankenstein-Dracula tree forks. After Qh5 Nd6 Bb3, the bishop has dodged onto b3 still raking f7. Black now has two ways to develop. The calm path is Be7 — the modern grandmaster's choice, taught in the variation lesson. The wild path is Nc6 — natural-looking knight development that walks straight into one of the most spectacular tactical sequences in chess history. The next nine moves are nearly forced. The picture unfolds.",
      sayShort: "Nc6 — natural, but walks into the Nxa8 raid.",
    },
    {
      id: 'fn2',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5'],
      arrows: [A('b5', 'c7', ATK), A('b5', 'a7', ATK), A('b5', 'd6', ATK)],
      highlights: [H('b5', KEY), H('c7', KEY)],
      say: "Nb5! The c3-knight pivots to b5, suddenly threatening Nxc7+ which would FORK the king and the a8-rook — losing the rook to a knight check is the textbook nightmare. The knight on b5 also attacks the d6-knight AND eyes a7, AND if the king moves to d8 to dodge the fork, Nxd6 is winning. Three threats in one move. Black is one move from material disaster and must play actively to survive.",
      sayShort: "Nb5! — threatens Nxc7+ fork and hits d6.",
    },
    {
      id: 'fn3',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6'],
      highlights: [H('g6', KEY), H('h5', KEY)],
      say: "g6 — Black attacks White's queen on h5 to gain a tempo for defence. He has to: any other move loses to Nxc7+ next turn. The pawn move opens up the king's house, but Black has no choice. Notice that White's queen MUST move now, but every queen-move keeps the pressure going.",
      sayShort: "g6 — hits the queen to buy a tempo.",
    },
    {
      id: 'fn4',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3'],
      arrows: [A('f3', 'f7', ATK)],
      highlights: [H('f3', KEY), H('f7', KEY)],
      say: "Qf3 — the queen retreats but to a SQUARE THAT STILL ATTACKS f7. With the Bb3 already raking the same square, f7 is attacked twice. Black has to defend it. And the Nb5 hasn't moved — Nxc7+ is still on the menu. White's pieces are juggling threats like a circus performer.",
      sayShort: "Qf3 — still hits f7; Bb3 and Nb5 join.",
    },
    {
      id: 'fn5',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5'],
      highlights: [H('f5', KEY), H('f7', SOFT)],
      say: "f5 — Black blocks the queen's line to f7 with the f-pawn. It defends f7 AND blocks the queen's diagonal. But the pawn is now WAY out of position, leaving e6 and g6 holes around the king. And Nxc7+ is still on the board. Every Black move plugs one leak while opening another.",
      sayShort: "f5 — blocks but holes; Nxc7+ still threatened.",
    },
    {
      id: 'fn6',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5','Qd5'],
      highlights: [H('d5', KEY), H('f5', SOFT), H('a8', SOFT), H('c6', SOFT)],
      say: "Qd5! The queen returns to the centre with two simultaneous threats: it attacks the f5-pawn AND lines up against the a8-rook through the c6-knight. The Nb5 STILL hasn't moved. Black is now under four different active threats and must address all of them — which is impossible.",
      sayShort: "Qd5! — hits f5 and the a8-rook.",
    },
    {
      id: 'fn7',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5','Qd5','Qe7'],
      highlights: [H('e7', KEY)],
      say: "Qe7 — Black brings the queen out to defend everything at once. She covers the d6-knight, plugs the e-file, and tries to hold the position together. It's the best try — but Black has spent eight moves of FORCED defensive moves and not developed a single attacking piece. White's Nxc7+ is ready.",
      sayShort: "Qe7 — best try, but nothing developed.",
    },
    {
      id: 'fn8',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5','Qd5','Qe7','Nxc7+'],
      arrows: [A('c7', 'a8', ATK), A('c7', 'e8', ATK)],
      highlights: [H('c7', KEY), H('a8', KEY), H('e8', SOFT)],
      say: "Nxc7+!! There it is — the threat that has hung over the board for four moves now lands. The knight crashes through, giving check to the king on e8 AND attacking the rook on a8. Black must move the king (no piece can capture the checking knight). And after the king moves, the knight is FREE to take the rook.",
      sayShort: "Nxc7+!! — check now, the a8-rook next.",
    },
    {
      id: 'fn9',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5','Qd5','Qe7','Nxc7+','Kd8','Nxa8'],
      highlights: [H('a8', KEY), H('d8', SOFT)],
      say: "Kd8 (forced) Nxa8! White takes the rook. For the moment White is a rook up, but the knight on a8 is trapped, and Black will win it back with …b6 and …Bb7. After that White keeps the exchange — a rook for a knight. This is the Nxa8 raid, the most famous mini-combination in the Vienna's history: when Black plays Nc6 here, the sequence ends with White a clean exchange ahead.",
      sayShort: "Nxa8! — the exchange, once a8 falls.",
    },
    {
      id: 'fn10',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5','Nd6','Bb3','Nc6','Nb5','g6','Qf3','f5','Qd5','Qe7','Nxc7+','Kd8','Nxa8'],
      highlights: [H('a8', KEY), H('b6', SOFT), H('b7', SOFT)],
      say: "Now what does the position PRODUCE? Black will play …b6 and …Bb7 trying to trap the Na8 — and theory says yes, the knight on a8 is dead, Black will recover it within a few moves. But that's the WHOLE POINT: in the four-or-five moves Black spends maneuvering to win back the knight, White develops freely, completes castling, and consolidates the extra exchange. The conversion plan is simple: castle long, get the king-knight out, push the d2-pawn to d4 to claim the centre while Black is busy with the queenside knight-hunt. By the time Black wins the Na8 back, White is fully developed with the exchange in the bank — the engine gives White a modest edge, under a pawn. Adams played the White side and won; Mamedyarov plays the Black side and tolerates the trapped knight as the price of the wild line. Theory: equal. Practice: White wins more often than not.",
      sayShort: "…b6, …Bb7 wins a8 back — White consolidates.",
    },
  ],
};

// ── WEAPON: Copycat Qg4 — Punish the Mirror ────────────────────
// Lives in the Classical (Main) tab. When Black plays Nc6 then
// answers Bc4 with the SYMMETRICAL Bc5 — the "copycat" — White
// punishes the mirror with Qg4!, threatening Qxg7 before Black has
// castled. The Black-side reply Qf6 leads to the famous Nd5!
// shot where the knight pins the queen on the f-file. Full-coverage
// 8 beats — pure Romantic-era Vienna at its quickest.
const COPYCAT_QG4: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Weapon: Copycat — Punish the Mirror with Qg4',
  minutes: 5,
  orientation: 'white',
  beats: [
    {
      id: 'cq1',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5'],
      arrows: [A('c5', 'f2', ATK), A('c4', 'f7', ATK)],
      highlights: [H('c5', KEY), H('c4', KEY), H('f2', SOFT), H('f7', SOFT)],
      say: "Symmetrical Italian-Vienna. Black has answered Bc4 with the mirror move Bc5, and the position looks balanced — White's Bc4 aimed at f7, Black's Bc5 aimed at f2. But the symmetry is an illusion. White has the move, and that single tempo is enough to break the mirror with a thunderbolt.",
      sayShort: "Bc5 — mirrors, but White moves first.",
    },
    {
      id: 'cq2',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4'],
      arrows: [A('g4', 'g7', ATK)],
      highlights: [H('g4', KEY), H('g7', KEY)],
      say: "Qg4! The queen jumps to g4 and threatens Qxg7, which would then hit the h8-rook, since Black has not castled. This is the punishment for mirroring without the extra tempo. Black has to deal with g7 right now. The mirror move Bc5 does not help: the c5-bishop does not defend g7.",
      sayShort: "Qg4! — threatens Qxg7; the mirror fails.",
    },
    {
      id: 'cq3',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6'],
      arrows: [A('f6', 'g7', VIS), A('f6', 'f2', ATK)],
      highlights: [H('f6', KEY), H('g7', SOFT), H('f2', KEY)],
      say: "Qf6 — the natural defence. The queen covers g7 and looks straight down the f-file at White's f2-pawn. With the king still on e1, Qxf2+ would come with check, backed by the c5-bishop. Black now thinks they hold the attacking chances. They are about to find otherwise.",
      sayShort: "Qf6 — defends g7, threatens Qxf2+.",
    },
    {
      id: 'cq4',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5'],
      arrows: [A('d5', 'f6', ATK), A('d5', 'c7', ATK)],
      highlights: [H('d5', KEY), H('f6', KEY), H('c7', KEY)],
      say: "Nd5! White's c3-knight jumps to d5 with two threats at once: it hits the queen on f6 and eyes Nxc7+, forking the king and the a8-rook. The queen must move, and the cleanest try is the counter-punch on f2.",
      sayShort: "Nd5! — hits the queen, eyes Nxc7+.",
    },
    {
      id: 'cq5',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5','Qxf2+'],
      arrows: [A('d5', 'c7', ATK)],
      highlights: [H('f2', KEY), H('c5', SOFT)],
      say: "Qxf2+ — Black's best try. The queen takes the f2-pawn with check, supported by the c5-bishop. It looks frightening, but White's king has one square, and the knight on d5 is still aiming at c7.",
      sayShort: "Qxf2+ — all in, check on the king.",
    },
    {
      id: 'cq6',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5','Qxf2+','Kd1'],
      highlights: [H('d1', KEY), H('c7', SOFT)],
      say: "Kd1 — the only legal move, and it is enough. The king steps out of check, and the d5-knight still threatens Nxc7, forking the e8-king and the a8-rook. Black has won the f2-pawn, but the queen is far from home and Black's king is still in the centre.",
      sayShort: "Kd1 — only move; Nxc7 still threatened.",
    },
    {
      id: 'cq7',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5','Qxf2+','Kd1','Kf8','Nh3','Qd4','d3'],
      highlights: [H('d4', KEY), H('d3', KEY)],
      say: "Black plays Kf8, taking the king off e8 so Nxc7 no longer comes with check. White develops with Nh3, hitting the queen on f2 and freeing the h1-rook. Black's queen retreats to d4, and White answers d3, opening the c1-bishop. Every move White makes develops; Black's queen and king are still out of place.",
      sayShort: "White develops; Black's queen is far from home.",
    },
    {
      id: 'cq8',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5','Qxf2+','Kd1','Kf8','Nh3','Qd4','d3','Bb6','Qf3'],
      highlights: [H('f3', KEY)],
      say: "Qf3 — the queen comes back to the f-file, aiming straight at f7. Black is a pawn up, but White's pieces are all in play, the d5-knight dominates the centre, and Black's king on f8 has lost the right to castle. The engine already rates White clearly winning here.",
      sayShort: "Qf3 — eyes f7; Black's king is stuck.",
    },
    {
      id: 'cq9',
      moves: ['e4','e5','Nc3','Nc6','Bc4','Bc5','Qg4','Qf6','Nd5','Qxf2+','Kd1','Kf8','Nh3','Qd4','d3','Bb6','Qf3'],
      highlights: [H('d5', KEY), H('f7', SOFT), H('f3', SOFT)],
      say: "What does the position give White? The d5-knight sits in the centre, guarded by the c4-bishop and the e4-pawn. The f3-queen and the h1-rook, which can swing to f1, line up on the f-file against f7. Black's king on f8 cannot castle, and the h8-rook is shut in behind it. The plan: c3 to chase the queen from d4, Rf1 to pile onto f7, and bring the c1-bishop into play. The pawn Black grabbed on f2 cost them their development.",
      sayShort: "Nd5 outpost, f-file on f7, king stuck.",
    },
  ],
};

// ── WEAPON: Steinitz Gambit (d4 Qh4+ Ke2!?) ────────────────
// The most outrageous weapon in the Vienna: in response to d4 Black
// plays Qh4+ thinking he wins the f4-pawn AND development. White
// answers Ke2!? — the king walks to e2 instead of blocking the
// check. Pure Steinitz audacity: the king is the centre of the army.
// The opening was named after him because he played it in serious
// games. Theoretically dubious; practically devastating against any
// opponent who hasn't memorised the right defensive sequence.
const STEINITZ_GAMBIT: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: "Weapon: Steinitz's King-Walk Gambit",
  minutes: 6,
  orientation: 'white',
  beats: [
    {
      id: 'sg1',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4'],
      highlights: [H('d4', KEY)],
      say: "d4! — the Steinitz Gambit: White ignores the f4-pawn and grabs the centre. Now suppose Black ventures the most aggressive reply imaginable.",
      sayShort: "d4 — the Steinitz; Black gets ambitious.",
    },
    {
      id: 'sg2',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+'],
      arrows: [A('h4', 'e1', ATK)],
      highlights: [H('h4', KEY), H('e1', KEY)],
      say: "Qh4+! Black's queen rushes out with check on the e1-king, threatening to plant herself in White's face. This is the move that creates one of the most famous lines in chess history. Black's reasoning: White must block the check, and the natural block (g3) loses the f4-pawn AND weakens the kingside permanently. Surely White is in trouble?",
      sayShort: "Qh4+! — the early queen-check gamble.",
    },
    {
      id: 'sg3',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2'],
      highlights: [H('e2', KEY), H('h4', SOFT)],
      say: "Ke2!? The king steps to e2 instead of blocking with g3, which would give up the f4-pawn structure and weaken the kingside. This is the move that names the gambit: Wilhelm Steinitz, the first world champion, played it. The king loses the right to castle, but with the e4- and d4-pawns in front of it Black has no quick way to reach it, and White's pieces will come out with gain of time against the queen on h4.",
      sayShort: "Ke2!? — the king walks; that is the Steinitz.",
    },
    {
      id: 'sg4',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6'],
      highlights: [H('d6', KEY)],
      say: "d6 — Black develops solidly, opening the c8-bishop. Every Black move now has to choose between chasing the e2-king and developing normally. White's king on e2 looks odd, but nothing attacks it yet: the queen on h4 has no line to e2.",
      sayShort: "d6 — develops; now every move juggles.",
    },
    {
      id: 'sg5',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6','Nf3'],
      arrows: [A('f3', 'h4', ATK)],
      highlights: [H('f3', KEY), H('h4', KEY)],
      say: "Nf3! The king-knight develops, and most importantly it ATTACKS the queen on h4 directly. Black must move the queen — and every queen move from h4 is unappealing: Qh5 or Qg4 stays in the kingside but Black has nothing to do there; back to f6 loses tempo. White gains a tempo on the queen and rapidly catches up in development.",
      sayShort: "Nf3 — develops, attacks the queen; lost tempo.",
    },
    {
      id: 'sg6',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6','Nf3','Bg4'],
      highlights: [H('g4', KEY)],
      say: "Bg4 — Black pins the f3-knight to the king on e2. It is a real pin, so White does not rush to break it: development comes first, and later Kd2 or h3 deals with the bishop. Meanwhile White's army is mobilising.",
      sayShort: "Bg4 — a real pin; develop first.",
    },
    {
      id: 'sg7',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6','Nf3','Bg4','Bxf4'],
      arrows: [A('f4', 'd6', ATK)],
      highlights: [H('f4', KEY)],
      say: "Bxf4! White wins back the gambit pawn and gets the bishop into play, eyeing the d6-pawn through the empty e5-square. Material is level again, White has two pieces out and the big centre, and Black's queen on h4 can still be chased. The king on e2 is the price White has paid.",
      sayShort: "Bxf4 — pawn back, eyes d6.",
    },
    {
      id: 'sg8',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6','Nf3','Bg4','Bxf4'],
      highlights: [H('h4', SOFT)],
      say: "The verdict on the Steinitz Gambit: the engine calls this position level. Black can defend with accurate play, but the defence is hard to find over the board — the queen on h4 is a target and White's pieces come out with tempo. A balanced fight that favours whoever knows it better.",
      sayShort: 'Verdict: level, but hard to defend.',
    },
    {
      id: 'sg9',
      moves: ['e4','e5','Nc3','Nc6','f4','exf4','d4','Qh4+','Ke2','d6','Nf3','Bg4','Bxf4'],
      highlights: [H('e2', KEY), H('h4', KEY), H('d4', SOFT), H('e4', SOFT)],
      say: "What does the Steinitz position produce? White has the d4-e4 pawn duo in the centre, the Bf4 has won back the gambit pawn and eyes the d6-pawn, and Black's queen on h4 is far from her army — every White piece can attack her as it comes out. The king on e2 looks exposed, but Black has no quick way to reach it. The plan: develop, bring the king to safety via d2, and press against the queen and the d6-pawn. With best play the position stays level.",
      sayShort: "Centre, Bf4 on d6 — a level fight.",
    },
  ],
};

// ── WARNING: Nxe4 demands Qh5 — show-the-trap-then-rewind ──
// Lives in the Frankenstein-Dracula tab. When Black plays Nxe4, the
// ONLY refutation is Qh5! threatening Qxf7#. If White recaptures
// (Nxe4) or plays any normal-looking development move, Black plays
// …d5 and equalises with a free pawn. Warning pattern: show the
// natural White move that loses the edge, then snap the board back
// to the correct Qh5.
const NXE4_NO_QH5: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Watch out: Nxe4 demands Qh5',
  minutes: 3,
  orientation: 'white',
  beats: [
    {
      id: 'wn1',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4'],
      highlights: [H('e4', KEY)],
      say: "The Frankenstein-Dracula starting position. Black has just played Nxe4 — grabbing the e4-pawn, banking on a trick: if Nxe4, …d5 hits the bishop and the knight together. The e-pawn is gone, and White's instinct is to either recapture with Nxe4 or to develop calmly. Either instinct loses White's entire opening advantage.",
      sayShort: "Nxe4 — only one right reply keeps the edge.",
    },
    {
      id: 'wn2',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Nxe4','d5'],
      highlights: [H('d5', KEY), H('c4', KEY), H('e4', KEY)],
      say: "Nxe4?? d5! And Black has equalised completely. The d5-pawn forks the c4-bishop AND attacks the e4-knight. White must move the bishop, Black plays …dxe4, and the position is dead equal with no compensation for the lost initiative. The Vienna Gambit's pawn sacrifice loses its punch entirely — this is the slip every player must avoid.",
      sayShort: "Nxe4?? d5! — Black forks and equalises.",
    },
    {
      id: 'wn3',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5'],
      arrows: [A('h5', 'f7', ATK), A('h5', 'e5', ATK)],
      highlights: [H('h5', KEY), H('f7', KEY), H('e5', SOFT), H('e4', SOFT)],
      say: "Rewind. The ONLY refutation is Qh5! From h5 the queen attacks two squares at once: the f7-square (threatening Qxf7 MATE) and the e5-pawn straight down the h5-e5 diagonal. Forget the natural recapture. The Frankenstein-Dracula begins HERE with the queen leap — every other White move just gifts Black equality. Lock this in: Nxe4 demands Qh5, full stop. The dragon must wake up immediately.",
      sayShort: "Rewind: Qh5! — the only move; threatens mate.",
    },
    {
      id: 'wn4',
      moves: ['e4','e5','Nc3','Nf6','Bc4','Nxe4','Qh5'],
      highlights: [H('h5', SOFT), H('f7', SOFT), H('d6', SOFT)],
      say: "Why is Qh5 the ONLY move? Because every other White reply lets Black equalise or seize the initiative. Nxe4 d5! forks the c4-bishop and the e4-knight — Black wins a piece back with an active centre. Bxf7+ Kxf7 Nxe4 d5 — same idea, Black just trades pieces and emerges with central control. d3 Nxc3 — Black trades into a clean position a pawn up. The Qh5 leap is the ONLY move that fights for an edge because it threatens Qxf7 MATE in one — a threat so concrete it forces Black to play the awkward Nd6 burying their own knight on a square it doesn't want. Memorise this: in the Vienna's Bc4 line, …Nxe4 is the moment the Qh5 must come out. No development move, no recapture — just Qh5.",
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
  // Copycat lives on the vs Nc6 tab — in the Nf6 mainline the
  // f6-knight attacks g4, so the Qg4 punishment only works after Nc6.
  { id: 'copycat-qg4', name: 'Copycat: Qg4 punishes the mirror', kind: 'weapon', appliesTo: ['vs 2…nc6'] },
  { id: 'steinitz-gambit', name: "Steinitz's King-Walk Gambit", kind: 'weapon', appliesTo: ['vs 2…nc6'] },
  { id: 'nxe4-no-qh5', name: 'Watch out: Nxe4 demands Qh5', kind: 'warning', appliesTo: ['frankenstein-dracula'] },
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
