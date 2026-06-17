import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision /
// threat / intent), highlights YELLOW (key square called out in narration)
// and SOFT BLUE (secondary context). Move squares are auto-painted orange
// by the LessonPlayer — we don't author those.
const ATK = 'rgba(40,185,95,0.92)';
const INTENT = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color: string): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

// ── The Vienna Gambit (f4) ─────────────────────────────────────
// Spine (locked 2026-05-21): the modern MAIN line is Qf3 — the
// Bardeleben Variation — the trendy Eric Rosen / online weapon that
// hits the e4-knight DIRECTLY with the queen and threatens Qxd5 with
// tempo. The older Nf3 (Breyer/Lasker calm line) is taught as the
// alternative branch. Black's principled reply d5 is the Lasker
// counterstrike — same as it ever was. The Wurzburger Trap and the
// Hamppe sacrifices live in the WEAPONS layer.
const GAMBIT: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna Game — The Gambit (f4)',
  minutes: 11,
  orientation: 'white',
  beats: [
    b({ id: 'g1', moves: 'e4 e5 Nc3 Nf6 f4',
      say: "Welcome to the Vienna Gambit, the opening's loudest weapon. After Nc3 Nf6 White does what Edward Lasker called the most natural reply at the side of the board: he plays f4, hurling a pawn at the centre to lure the e5-pawn away. Lasker wrote in *Chess Strategy*: 'It would seem a good plan to lure that pawn away, and this is rendered feasible by playing P-KB4 when he has a pawn on K4.' That is exactly the move you just saw. The pawn looks like a gift. It isn't.",
      sayShort: "f4 — Lasker's lure, pull e5 off-centre.",
      highlights: [H('f4', KEY), H('e5', KEY)] }),
    b({ id: 'g2', moves: 'e4 e5 Nc3 Nf6 f4 d5',
      say: "And here is the principled reply: d5! Black refuses to take the gambit pawn and counters in the centre instead — exactly the same idea on the other side of the board. White's f4 attacked e5; Black's d5 attacks e4 and f4 at once. This is what Lasker called the only fully sound reply, and it is the spine of this variation. The Vienna Gambit Accepted, where Black grabs with exf4 instead, lives on its own page in this masterclass because that is where the named weapons live.",
      sayShort: "d5! — Lasker's counterstrike, hit the centre back.",
      highlights: [H('d5', KEY), H('e4', KEY), H('f4', SOFT)] }),
    b({ id: 'g3', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4',
      say: "Now Lasker's exact passage from the book describes the next four plies: 'In answer to 4. PxKP, Black can play KtxP without having the slightest difficulty with his development.' White captures with fxe5 — taking the gambit on the kingside, opening the f-file — and Black recaptures with Nxe4, the knight grabbing the e4-pawn that f4 originally protected. Pawn structures cracked open, knights racing through the centre, the e4-knight now sits inside White's territory begging to be hit.",
      sayShort: "fxe5 Nxe4 — f-file opens, knight grabs e4.",
      highlights: [H('e4', KEY), H('e5', KEY), H('f4', SOFT)] }),
    b({ id: 'g4', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3',
      arrows: [A('f3', 'e4', ATK)],
      highlights: [H('f3', KEY), H('e4', KEY), H('d5', SOFT)],
      say: "Qf3! And THIS is the move that has turned the Vienna Gambit from a dusty 19th-century opening into one of the hottest weapons on Lichess in the 2020s. The queen leaps to f3, attacks the e4-knight directly, AND lines up against the d5-pawn down the f3-a8 diagonal. Black is suddenly facing two threats at once, and his natural moves are all walking into something. This is the Bardeleben Variation, and Eric Rosen's video tutorials on it have rebuilt the Vienna Gambit's whole online reputation. Older books recommend Nf3 — the calm developmental move — but in modern theory Qf3 is the main line: hit the knight, threaten d5, dare Black to defend BOTH at once.",
      sayShort: "Qf3! — Bardeleben main line, hits e4 and d5." }),
    b({ id: 'g5', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 f5',
      highlights: [H('f5', KEY), H('e4', KEY)],
      say: "f5! — Black's best try. The pawn comes to f5 doing two jobs: it shields the d5-pawn from the Qf3, and it defends the e4-knight from being captured. It looks like the perfect answer. But every Black move costs structure, and this one is no exception — the f5-pawn now sits as a permanent weakness on a light square, and the f7-pawn that used to shield Black's king has surrendered the f6 hole behind it. Black has solved the immediate tactical problem and walked into a long-term positional one.",
      sayShort: "f5 — saves the knight, weakens the structure." }),
    b({ id: 'g6', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 f5 d3',
      highlights: [H('d3', KEY), H('e4', KEY)],
      say: "d3 — the simple kick. The d3-pawn attacks the e4-knight a second time, and Black cannot defend it a second time. Black is forced to trade with …Nxc3 next move, and after bxc3 White ends up with the bishop pair, the open b-file for the rook, the Qf3 already active, and a permanent grip on the dark squares (f6, e5) the …f5 push abandoned.",
      sayShort: "d3 — kicks the knight again; Black must trade." }),
    b({ id: 'g7', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 f5 d3 Nxc3 bxc3',
      arrows: [A('a1', 'b1', INTENT)],
      highlights: [H('b1', KEY), H('c3', KEY)],
      say: "Nxc3 bxc3 — and here is what makes this whole line a quiet positional masterpiece. The b-file is wide open for the rook to come to b1, the doubled c-pawns are a tiny structural cost for the bishop pair, and the Qf3 stays active on its central square. Eric Rosen's mantra in his Vienna tutorials: 'open the b-file and let the queen sit on f3 — everything else is set up by those two facts.' White's plan from here writes itself: Rb1 to seize the b-file, Bd2 to complete development, and Nh3 (yes, Nh3 — the king-knight to the rim — because it's heading to f4 to support the e5-pawn and pressure d5).",
      sayShort: "bxc3 — open b-file, bishop pair, Qf3 hot." }),
    b({ id: 'g8', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 f5 d3 Nxc3 bxc3 Nc6 Bd2 Be7 Nh3 O-O',
      arrows: [A('h3', 'f4', INTENT)],
      highlights: [H('f4', KEY), H('e5', KEY), H('f3', SOFT)],
      say: "And the middlegame arrives. Black has developed normally — Nc6, Be7, O-O — and White completes his setup: Bd2 finishes the queen-bishop, Nh3 sends the king-knight on the curious-looking detour to h3, but it has a purpose. From h3 the knight goes to f4, attacking the d5-pawn and supporting the dominating e5-pawn. Every White piece now has a job: Qf3 hits f5, Nh3-f4 hits d5, Bd2 prepares Rb1 + Bb4 manoeuvres, and the open b-file is waiting for the a1-rook. Black has piece activity but no real plan against this structure. The Bardeleben Vienna Gambit at its purest.",
      sayShort: "Qf3, Nh3-f4, Rb1 — a coordinated grip." }),
    // ── DEEP — 24-ply Bardeleben middlegame (g11→g14) ───────────────
    // Authored 2026-05-22. David's call: "lines do not go deep enough".
    // Pushes the Gambit spine from 18p (after Black's O-O) into the
    // recognisable Bardeleben middlegame at 24p — opposite-side castling,
    // Nf4 outpost landed, kings tucked, rooks centralised. Every move
    // chess.js-legal + matches mainstream Bardeleben theory.
    b({ id: 'g11', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 f5 d3 Nxc3 bxc3 Nc6 Bd2 Be7 Nh3 O-O O-O-O Be6',
      say: "O-O-O — the queenside castle that defines the Bardeleben. White's king lands on c1 behind the c2-c3 doubled-pawn shield, the a1-rook swings to d1 with one move, and the b-file becomes a future highway for a Rb1 attack down the queenside. Black answers Be6 — the queen-bishop develops to a natural square, reinforcing the d5-pawn from the side and connecting Black's rooks. Both armies are now fully primed.",
      sayShort: "O-O-O — castle long; …Be6 holds d5.",
      highlights: [H('c1', KEY), H('d1', SOFT), H('e6', KEY), H('d5', SOFT)] }),
    b({ id: 'g12', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 f5 d3 Nxc3 bxc3 Nc6 Bd2 Be7 Nh3 O-O O-O-O Be6 Nf4 Qd7',
      arrows: [A('f4', 'd5', INTENT), A('f4', 'e6', INTENT)],
      say: "Nf4 — the knight finally arrives. From f4 it pressures BOTH the d5-pawn AND the e6-bishop, the central battery now firing on every key light square. Black plays Qd7 — queen comes off d8 to develop and connect the rooks. Notice the harmony: every White piece has a target on the queenside or in the centre, while Black is still reorganising for the long fight ahead.",
      sayShort: "Nf4 — the dream square, hitting d5 and e6.",
      highlights: [H('f4', KEY), H('d5', SOFT), H('e6', SOFT), H('d7', KEY)] }),
    b({ id: 'g13', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 f5 d3 Nxc3 bxc3 Nc6 Bd2 Be7 Nh3 O-O O-O-O Be6 Nf4 Qd7 Kb1 Rad8',
      say: "Kb1 — the prophylactic king move that every queenside-castled position needs. The king steps off the c1-a7 diagonal where a future …Bb4 or …Qa5 could check it. Black completes development with Rad8 — both rooks centralised on the d-file. THIS is the canonical Bardeleben middlegame: opposite-side castling, kings prepared, doubled c2-c3 pawns balancing the bishop pair, e5-pawn cramping Black's centre. Every coming move will be a play for tempo on the opposite wing's pawn-storm.",
      sayShort: "Kb1 — king tucked, the structure locked in.",
      highlights: [H('b1', KEY), H('d8', KEY), H('e5', SOFT), H('c3', SOFT)] }),
    b({ id: 'g14', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 f5 d3 Nxc3 bxc3 Nc6 Bd2 Be7 Nh3 O-O O-O-O Be6 Nf4 Qd7 Kb1 Rad8',
      say: "What does the position PRODUCE? Look at the structural facts. White owns the e5-pawn deep in Black's camp — a permanent space advantage that cramps every Black piece. The doubled c2-c3 pawns are a small structural debt, but they shield the Kb1 from any …c5 break by Black. White's plan from here: Rdg1 then g4-g5 to crack open Black's kingside (Black's king is castled there, White's king is on b1, opposite-side attacks favour whoever arrives first). Black's plan: …c5 to attack the c3-pawn AND open the c-file against White's king, then …Nb4 or …Na5 jumping to attacking squares. The race is on. This is the soul of the Bardeleben Vienna: not a tactical knockout, but a sustained positional grip that converts to a winning attack in long games. Eric Rosen's Vienna mantra in one breath: 'castle long, open the b-file, plant the knight on f4, push the g-pawn.' That is the entire plan from here.",
      sayShort: "The race: g4-g5 against …c5.",
      highlights: [H('e5', KEY), H('c3', SOFT), H('b1', SOFT), H('c5', SOFT), H('g4', SOFT), H('g5', SOFT)] }),
    b({ id: 'g9', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7',
      highlights: [H('f3', SOFT)],
      say: "Now the alternative — older books recommend Nf3 instead of Qf3. The Nf3 line is calmer: White just develops, doesn't engage the e4-knight immediately, and steers toward the same big-centre middlegame Lasker described in *Chess Strategy*. After Nf3 Be7, White plays d4 and builds a giant d4-e5 pawn duo. The Nf3 line is less ambitious tactically — it doesn't punish Black's natural moves the way Qf3 does — but it's structurally sound and gives White a free positional edge.",
      sayShort: "Nf3 — the calm Lasker line, build the centre." }),
    b({ id: 'g10', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 f5 d3 Nxc3 bxc3 Nc6 Bd2 Be7 Nh3 O-O',
      highlights: [H('f4', SOFT)],
      say: "And one branch you must know — if Black plays the OTHER reply and takes the gambit with exf4, you are no longer in this strategic line. You are in territory that has been studied for two centuries: the Vienna Gambit Accepted. That is where the Wurzburger Trap waits if Black develops too naturally into the old d3 line, where Hamppe-Allgaier and Hamppe-Muzio sacrifices live if Black ALSO played Nc6 instead of Nf6, and where Steinitz himself walked his king to e2 and attacked. The Vienna Gambit has TWO completely different personalities: this strategic Bardeleben + Lasker spine, and a tactical jungle one tab away. Learn this calm-but-clinical one first; the named weapons are the reward when Black drifts.",
      sayShort: "exf4 — the Gambit Accepted, where the weapons live." }),
  ],
};

// ── Vienna vs Nc6 ─────────────────────────────────────────────
// Spine: the sharpest reply, f4 — the launchpad for the historical
// Vienna sacrifices (Hamppe-Allgaier, Hamppe-Muzio, Pierce, Steinitz).
// This lesson lays out the strategic landscape and points at the named-
// weapon lessons that teach each individual sacrifice in depth.
const VS_NC6: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna Game — Black plays Nc6',
  minutes: 10,
  orientation: 'white',
  // Intentional roadmap (depth gate opt-out, 2026-05-22). The vs Nc6
  // spine stops at the 11-ply launchpad position (h4 g4 Ng5) because
  // from there it FANS OUT to four full beat lessons in the WEAPONS layer
  // (Hamppe-Allgaier, Hamppe-Muzio, Pierce Gambit, Steinitz Gambit). Each
  // weapon is its own 8-10 beat lesson that runs DEEP into the middlegame
  // /endgame conversion. The roadmap design is the right shape here —
  // forcing a single 20+ ply continuation would have to PICK one weapon's
  // line and lose the others. See viennaTrapLessons.ts.
  kind: 'roadmap',
  beats: [
    b({ id: 'nc6-1', moves: 'e4 e5 Nc3 Nc6',
      say: "At amateur level Black plays Nc6 even more often than Nf6 — almost forty per cent of the time. He defends e5 the classical Ruy way, with the knight, and waits to see what White does. The Vienna meets this with two completely different personalities: one calm, one furious. The calm path is Bc4 — straight back into Italian-Vienna themes. The furious path is f4 — and that is where almost every famous Vienna brilliancy in chess history was played.",
      sayShort: "Nc6 — meet it with Bc4 or f4.",
      highlights: [H('c6', KEY), H('e5', SOFT)] }),
    b({ id: 'nc6-2', moves: 'e4 e5 Nc3 Nc6 f4',
      say: "We take the furious path. f4 — exactly the same lever Lasker described, the side-thrust to lure the e5-pawn away. But against Nc6 the consequences are completely different from the Nf6 Gambit: the c6-knight is on e5's defender's square, so taking …exf4 doesn't expose the knight on e4 the way it does in the Nf6 line. Black almost always accepts the pawn — and that acceptance is the doorway to the Vienna's greatest historical attacks.",
      sayShort: "f4 vs …Nc6 — door to the brilliancies.",
      highlights: [H('f4', KEY)] }),
    b({ id: 'nc6-3', moves: 'e4 e5 Nc3 Nc6 f4 exf4',
      say: "Black accepts: exf4. He has the gambit pawn. But look at White's centre — the e4-pawn now controls d5 and f5 alone, the f-file is wide open in front of White's king-rook, and White's whole army is poised to develop with tempo. The pawn is bait. Steinitz built his entire opening repertoire around the principle: a pawn sacrificed for development and initiative is almost always a sound investment.",
      sayShort: "exf4 — bait taken; the f-file opens.",
      highlights: [H('f4', KEY)] }),
    b({ id: 'nc6-4', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3',
      say: "Nf3 — develop with tempo, eye the kingside. White doesn't waste a move recovering the pawn. He builds. And now Black is at a fork: hold the gambit pawn with …g5 (the greedy try, the one that walks into the Hamppe-Allgaier and Hamppe-Muzio sacrifices) or give it back to neutralise (the safer, less ambitious choice). The amateur usually grabs the pawn AND tries to hold it.",
      sayShort: "Nf3 — develops with tempo; the brilliancy looms.",
      highlights: [H('f3', KEY)] }),
    b({ id: 'nc6-5', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5',
      say: "g5 — Black tries to hold the f4-pawn with his g-pawn. This is the move that creates immortal chess. Edward Lasker noted that lines like this 'lead to the most brilliant complications,' and history bears him out: every important Vienna sacrifice of the nineteenth century launches from approximately this position. The g4-square is about to become a weapon Black thinks is his and isn't.",
      sayShort: "g5 — the greedy hold; immortal chess begins.",
      highlights: [H('g5', KEY), H('f4', SOFT)] }),
    b({ id: 'nc6-6', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 h4 g4 Ng5',
      arrows: [{ from: 'g5', to: 'f7', color: ATK }, { from: 'g5', to: 'h7', color: ATK }],
      highlights: [H('f7', KEY), H('g5', KEY)] ,
      say: "Here is the launchpad. h4 g4 Ng5 — White's knight leaps to g5, attacking the soft f7-square AND the h7-pawn, with a fork of devastating threats hanging in the air. From this exact position three of chess history's most famous sacrifices fire: the Hamppe-Allgaier (Nxf7! — the knight sacrifices itself to drag Black's king into the open), the Hamppe-Muzio (a knight sac AND the right to castle in one go), and Steinitz's king-walk attack. Each of those is its own lesson in the Weapons layer.",
      sayShort: "Ng5! — the launchpad for three sacrifices." }),
    b({ id: 'nc6-7', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 h4 g4 Ng5',
      say: "If sharp historical attacks aren't your weapon of choice, the calm answer to Nc6 is simply Bc4 — Italian-Vienna pressure on f7, exactly the patient build you saw in the Classical lesson, just with Black's knight on c6 instead of f6. Same Bb3 retreat when Black plays …Na5, same Bc2 pivot, same slow squeeze. The Vienna against Nc6 has two completely opposite personalities, and you choose which one fits the day. Steinitz himself played both — sometimes the violent sacrifice, sometimes the patient grind. The opening lets you decide.",
      sayShort: "Bc4 — the calm alternative, pressure on f7.",
      highlights: [H('c4', SOFT), H('f7', SOFT)] }),
  ],
};

// ── Frankenstein-Dracula ────────────────────────────────────────
// The wildest line in the Vienna. After Bc4 Black plays …Nxe4? thinking
// it's a safe pawn-grab; White answers Qh5! and the game enters a
// forced sequence that ends with the Nxa8 raid — White wins the
// exchange, Black gets compensation in piece activity. Famous for a
// reason. Note: the calmer Be7 sub-line absorbs into a branch beat
// (David's Falkbeer-merge call, 2026-05-21).
const FRANKENSTEIN_DRACULA: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna Game — The Frankenstein-Dracula',
  minutes: 12,
  orientation: 'white',
  beats: [
    b({ id: 'fd-1', moves: 'e4 e5 Nc3 Nf6 Bc4',
      say: "The Frankenstein-Dracula begins quietly enough: Bc4, the Italian-Vienna bishop pointing at f7, exactly as in the Classical lesson. But what follows is the wildest known line in the entire Vienna repertoire, born when Black makes one ambitious choice on his third move.",
      sayShort: "Bc4 — quiet start; the next choice decides chaos.",
      highlights: [H('c4', SOFT), H('f7', SOFT)] }),
    b({ id: 'fd-2', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4',
      say: "Nxe4! Black grabs the e4-pawn, reasoning that the c3-knight is pinned to the f1-h3 diagonal by the Bc4 (if Nxe4, then …Bxc4 takes White's bishop too). On the surface it looks safe — a free pawn, a developed knight on e4. In reality, Black has just walked into the deepest forced sequence in the Vienna's repertoire.",
      sayShort: "Nxe4 — the pawn-grab that only looks free.",
      highlights: [H('e4', KEY)] }),
    b({ id: 'fd-3', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5',
      say: "Qh5! The bombshell. White's queen leaps to h5 with TWO threats at once: capture the e4-knight, and — far worse — checkmate on f7 next move (Qxf7#). The h5-e5 diagonal hits the knight; the h5-f7 diagonal mates the king. Black's e4-knight cannot move because Qxf7 mates. Black has exactly one defensive move that meets both threats, and it isn't pretty.",
      sayShort: "Qh5! — hits the knight, threatens Qxf7 mate.",
      arrows: [A('h5', 'f7', ATK), A('h5', 'e5', ATK)],
      highlights: [H('f7', KEY), H('e4', SOFT), H('e5', SOFT)] }),
    b({ id: 'fd-4', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6',
      say: "Nd6 is forced — the only move that defends f7 AND saves the knight. The knight retreats from e4 to d6, blocking the queen's path to f7 and dodging the c3-knight's attack. Black has rescued the knight. He's lost three tempi in the process, but materially he is still up a pawn.",
      sayShort: "Nd6 — the only move, blocking Qxf7.",
      highlights: [H('d6', KEY), H('f7', SOFT)] }),
    b({ id: 'fd-5', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3',
      say: "Bb3 — White slides the bishop one square back. This isn't just dodging the …Nxc4 threat that Black would land next; it RELOADS the bishop on the b3-f7 diagonal, where it once again stares at f7 from a square Black can no longer reach. The threats keep regenerating, exactly the way Frankenstein keeps coming back.",
      sayShort: 'Bb3 — bishop reloads on f7. The threats regenerate.',
      arrows: [A('b3', 'f7', ATK)],
      highlights: [H('f7', KEY)] }),
    b({ id: 'fd-6', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6',
      say: "Now Black has a real choice. The classical move is Nc6 — the ambitious one, developing AND defending e5. This is the line that walks straight into the Nxa8 raid you're about to see. The calmer Be7 develops more conservatively, blocks the queen-bishop diagonal, and avoids the pyrotechnics — it's the path the modern grandmaster picks if he doesn't want to memorise a forced waterfall. Both moves exist in master practice; the Nxa8 main line is famous because it's UNFORGETTABLE.",
      sayShort: "Nc6 — the wild path; …Be7 stays calm.",
      highlights: [H('c6', KEY), H('e7', SOFT)] }),
    b({ id: 'fd-7', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5',
      say: "Here it comes. Nb5! — the c3-knight leaps to attack c7 with check ideas, threatening Nxc7+ which would win the rook on a8. Black plays …g6 to chase the queen away from h5, but White answers Qf3 — the queen pivots to attack f7 from a new diagonal. Black plays …f5 to block the queen, but this is exactly what White wanted — every Black pawn move is a future weakness. The position is dripping with tactics.",
      sayShort: "Nb5 hits c7 — each defence makes a weakness.",
      arrows: [A('b5', 'c7', ATK)],
      highlights: [H('c7', KEY), H('f7', KEY), H('f5', SOFT)] }),
    b({ id: 'fd-8', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8',
      say: "The famous raid lands. Qd5 — queen attacks f5 AND the c-file — Black plays …Qe7 to defend. And now Nxc7+! Kd8 Nxa8! The knight gobbles the rook on a8 and immediately needs Black to play …b6 to escape being trapped. Steinitz-era players called this the most dramatic mini-combination in chess: two captures in a row, a queen-trap-then-rook-raid that turns the whole opening into a tactical demonstration. White is up the exchange and a pawn in raw material.",
      sayShort: "Nxc7+ then Nxa8 — the Frankenstein raid.",
      highlights: [H('a8', KEY), H('c7', KEY), H('b6', SOFT)] }),
    b({ id: 'fd-9', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8 b6',
      say: "But the knight on a8 is trapped — Black plans …b6 and …Bb7 to win it back, and theory says Black has practical compensation despite the material deficit. So the verdict on the Frankenstein-Dracula main line is sharp but technically equal — White wins the exchange, Black wins activity. Yet at the board, against a player who hasn't memorised this exact 20-move sequence, the line is utterly winning practically. Adams played it as White and was happy to be there. The Frankenstein-Dracula is theory-soaked, but every move from move 4 onward has ONE answer — and if Black doesn't know it, the line is just won.",
      sayShort: "…b6, Bb7 traps a8 — practice favours White.",
      highlights: [H('a8', SOFT), H('b7', SOFT)] }),
    // ── DEEP — Frankenstein-Dracula structural closer (fd-10) ──────
    // Authored 2026-05-22. Same 20p position as fd-9 — depth-narration
    // teaching the resulting material balance and the four-or-five-move
    // race that converts it.
    b({ id: 'fd-10', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8 b6',
      say: "What does the position PRODUCE? Count the material first. White has won a ROOK (the a8-rook) plus a PAWN (the c7-pawn) for a KNIGHT — that's the exchange plus a pawn, roughly two points of material in raw count. Black's compensation is concrete: the Na8 is dead in the corner, and …b6 followed by …Bb7 will recover that knight inside four moves. But here's the WHOLE POINT of the line — in those four moves of Black hunting the trapped knight, White develops freely. Castle long. Bring the king-knight out via g1-e2-g3 or e2-d4. Stack rooks on the d-file and the open c-file (the c-file is half-open after Nxc7+ took the c7-pawn). By the time Black's bishop arrives on b7 and the knight is recovered, White has finished development with a 7-piece army aimed at Black's king on d8 — a king that has no castling rights, no pawn shield on the kingside (Black pushed g6 + f5), and rooks not yet connected. Bobby Fischer dismissed the whole line as a tactical curiosity. Mamedyarov plays the Black side AS Black and tolerates the trapped knight as the price of admission. Theory says equal. Master practice says White wins more often than not. Amateur practice says: if Black doesn't have all 20 moves memorised in order, the line is just won.",
      sayShort: "Up the exchange and a pawn — practically winning.",
      highlights: [H('a8', KEY), H('c7', SOFT), H('b6', SOFT), H('b7', SOFT), H('d8', SOFT)] }),
  ],
};

// ── Paulsen (g3) ─────────────────────────────────────────────
// The modern grandmaster's choice. At amateur level only 4% of Vienna
// players reach for the fianchetto, but at the very top it's the most
// popular reply to Nf6 (35.1%). Carlsen, Caruana, Mamedyarov all
// play it. The pitch: slow squeeze from a distance, no theory race,
// pure positional Vienna.
const PAULSEN: LessonScript = {
  openingId: 'vienna-game',
  sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna Game — The Paulsen (g3)',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'p1', moves: 'e4 e5 Nc3 Nf6 g3',
      say: "g3 — the Paulsen Variation, named for Louis Paulsen who pioneered fianchetto systems in the 19th century. At amateur level it's almost never seen, but at the very top of chess today it's the MOST popular White reply to Nf6 — more popular than the Gambit and the Classical combined. Carlsen, Caruana, Mamedyarov, So have all leaned on it. The pitch is the opposite of the Gambit's fury: a slow squeeze from a distance, no theory race, no memorisation, just patient positional Vienna.",
      sayShort: "g3 — the modern elite's Vienna, slow squeeze.",
      highlights: [H('g3', KEY)] }),
    b({ id: 'p2', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2',
      say: "Black develops the king-bishop to c5, eyeing f2 — the natural reply — and White fianchettoes with Bg2. The g2-bishop now rakes the long light diagonal from a corner of the board, looking through White's own e4-pawn toward the d5 outpost where a knight might one day plant. For now the diagonal is screened by White's own centre pawn, but every later pawn break that clears e4 unleashes the bishop instantly.",
      sayShort: 'Bg2 — fianchetto, the long diagonal loaded toward d5.',
      highlights: [H('d5', KEY), H('e4', SOFT)] }),
    b({ id: 'p3', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2',
      say: "The Vienna knight-maneuver returns, exactly as in the Classical: Nge2! White re-routes his king-knight via e2 toward g3 or f4, keeping every option open. Same Nc3-Ne2 dance you saw in the Classical lesson, but now with a fianchettoed bishop already supporting the centre from below. The Paulsen IS the Classical Vienna with the g2-bishop swapped in for the Bc4.",
      sayShort: "Nge2 — the Vienna reroute, now behind Bg2.",
      arrows: [A('e2', 'g3', INTENT)] }),
    b({ id: 'p4', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O',
      say: "Black brings out the queen-knight to c6, White castles short, and the position settles into a quiet maneuvering battle. No central commitment yet from either side. The Vienna's c3-knight still backs e4, the fianchettoed bishop quietly cooks on the long diagonal, and the king-knight on e2 stares at three different forward squares (c3-trade, g3-reroute, f4-attack). White has flexibility; Black has solidity. The fight is over who improves their pieces faster.",
      sayShort: "Both castle — the race to improve pieces.",
      highlights: [H('e4', SOFT)] }),
    b({ id: 'p5', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3',
      say: "White's setup completes: …a4 to gain queenside space and stop a future …Na5, d3 to solidify, and the position has reached its canonical Paulsen middlegame structure. White's plan: Nd5 at the right moment (the long-diagonal bishop supports it), and slow expansion on either wing depending on where Black commits. Black's plan: develop solidly, contest the d5 outpost, and pray for an opening of the long diagonals where his own bishop-pair might shine.",
      sayShort: "Setup done — Nd5 the dream, slow expansion.",
      arrows: [A('c3', 'd5', INTENT)],
      highlights: [H('d5', KEY)] }),
    // ── DEEP — 21-ply Paulsen middlegame (p7→p10) ──────────────────
    // Authored 2026-05-22. Pushes the Paulsen spine from 15p (setup
    // complete) into the canonical Nd5-jump squeeze. Every move
    // chess.js-legal + matches mainstream Paulsen theory.
    b({ id: 'p7', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3 Be6 Nd5',
      say: "Black develops the queen-bishop: Be6, eyeing the d5-outpost AND the long-diagonal that the Bg2 has been claiming. And now White strikes: Nd5! — the knight finally lands on the dream square the whole opening has been pointing at since move three. The c3-knight became this knight, the Bg2 will support d5 the moment the centre opens, and Black's natural response is …Nxd5 (the f6-knight trades) because keeping White's knight on d5 forever would be unbearable.",
      sayShort: "Nd5! — the knight lands on the dream square.",
      highlights: [H('e6', KEY), H('d5', KEY)] }),
    b({ id: 'p8', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3 Be6 Nd5 Nxd5 exd5',
      say: "Nxd5 exd5 — the trade, the recapture, and the position transforms. White's e4-pawn is gone, replaced by a far better pawn on d5: the d5-pawn now cramps Black's whole position, hits the c6-knight AND the e6-bishop, and unscreens the Bg2 down the long diagonal toward b7. The same pawn that used to be a passive central foot-soldier on e4 is now a wedge inside Black's territory.",
      sayShort: "Nxd5 exd5 — the e-pawn becomes a wedge.",
      highlights: [H('d5', KEY), H('c6', KEY), H('e6', KEY)] }),
    b({ id: 'p9', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3 Be6 Nd5 Nxd5 exd5 Bd7 Be3',
      say: "Black saves the bishop with Bd7 — the only good square, since e6 is attacked by the d5-pawn. White completes development with Be3, offering to trade the dark-square bishop with the Bc5 (the Bc5 has been a key Black piece since move three; trading it weakens Black's grip on the dark squares). Both sides have finished primary development. The recognisable Paulsen middlegame structure stands on the board: White's d5-pawn wedge + the bishop pair on the dark squares + slow expansion lining up, Black's bishop pair contesting but cramped.",
      sayShort: "Be3 — offers the trade; the squeeze stands.",
      highlights: [H('d7', KEY), H('e3', KEY), H('c5', SOFT), H('d5', SOFT)] }),
    b({ id: 'p10', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3 Be6 Nd5 Nxd5 exd5 Bd7 Be3',
      say: "What does the position PRODUCE? Look at the structural facts. The d5-pawn is the cornerstone — it cramps Black, controls e6 and c6 forever, and creates a permanent space advantage that converts in the long game. Black's c6-knight and Bd7 have to coordinate to undermine d5, but Black has no pawn break available: …c6 just gives White the dxc6 capture, and …e4 weakens the d-pawn. White's plan from here: trade dark-square bishops with the Be3-Bxc5 swap, then play Qd2 + Rae1 + Nf4 to pile up on the e-file. Black has no clear plan beyond rerouting — exactly why this position is the modern grandmaster's choice. Slow squeeze, no theory race, structural advantages that compound move after move. Mamedyarov has built his Vienna career on this exact picture.",
      sayShort: "The d5 wedge cramps Black — the elite Vienna.",
      highlights: [H('d5', KEY), H('c5', SOFT), H('e3', SOFT)] }),
    b({ id: 'p6', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3',
      say: "Why is the Paulsen the modern grandmaster's choice when amateurs rarely see it? Two reasons. First, the FORCED LINES are extremely short — there is no fifteen-move memorised waterfall like the Frankenstein-Dracula. The student of the Paulsen only needs to understand the structure, not memorise the moves. Second, the Vienna Gambit at the very top has been worked out so thoroughly that even Black has computer-verified equalising paths; the Paulsen sidesteps all that prep, the e4-pawn unchallenged for now and the long diagonal aimed at the centre. Treat the Paulsen as the Vienna's grown-up form: less spectacle, more solidity. Mamedyarov has built half his Vienna career on it.",
      sayShort: "The Paulsen — no theory, Mamedyarov's pick.",
      highlights: [H('e4', SOFT)] }),
  ],
};

const STANLEY: LessonScript = {
  openingId: 'vienna-game',
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna — The Stanley Variation',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'st1', moves: 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 d6', say: "The Stanley Variation — White marries the Vienna's Nc3 with the Italian bishop on c4. It is a calm, solid system: d3 braces the centre and White develops harmoniously, aiming for a slow build-up rather than an early skirmish. Low theory, no risk.", sayShort: 'Bc4 — the calm Vienna-Italian system.', highlights: [H('c4', KEY)] }),
    b({ id: 'st2', moves: 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 d6 Nf3 O-O O-O Bg4 h3 Bh5 Bg5', say: "Both sides castle and develop symmetrically; White pins the f6-knight with Bg5 while Black pins back with …Bg4-h5. A quiet, manoeuvring middlegame where small positional improvements decide the game.", sayShort: 'Bg5 — pin and manoeuvre.', highlights: [H('g5', KEY), H('h5', SOFT)] }),
    b({ id: 'st3', moves: 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 d6 Nf3 O-O O-O Bg4 h3 Bh5 Bg5 h6 Bh4 Nbd7 Nd5 c6 Nxf6+ Nxf6', say: "White probes the d5-square with the knight, but …c6 meets it and the knights come off on f6. There is the Stanley tabiya: a calm, balanced, low-theory middlegame where White has an easy, risk-free game with simple plans and the safer structure — a sound system to reach a playable position every time.", sayShort: 'Nxf6 — simplify to a balanced game.', highlights: [H('f6', KEY), H('c6', SOFT)] }),
  ],
};

const VGA: LessonScript = {
  openingId: 'vienna-game',
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna — The Gambit Accepted',
  minutes: 7,
  orientation: 'white',
  kind: 'roadmap',
  beats: [
    b({ id: 'vg1', moves: 'e4 e5 Nc3 Nf6 f4 exf4 e5', say: "The Vienna Gambit Accepted: White plays f4 and, after …exf4, strikes with e5 — kicking the f6-knight and grabbing the centre. White gives up the f4-pawn for a big lead in space and development, the classic gambit bargain that powers the Vienna's attacking reputation.", sayShort: 'e5 — gambit the pawn, seize the centre.', highlights: [H('e5', KEY), H('f4', SOFT)] }),
    b({ id: 'vg2', moves: 'e4 e5 Nc3 Nf6 f4 exf4 e5 Ng8 Nf3 d5 d4 g5 h4 g4', say: "The knight is driven home to …Ng8, and White erects the big centre with d4 while Black grabs kingside space with …g5; White hits straight back with h4, prising the kingside open. From this launchpad White's broad centre and initiative fan out into the sharp Vienna attacking lines — well worth a pawn.", sayShort: 'd4, h4 — big centre, prise the kingside.', highlights: [H('d4', KEY)] }),
  ],
};

const COPYCAT: LessonScript = {
  openingId: 'vienna-game',
  sources: ['concept:pos-development', 'concept:att-greek-gift', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  title: 'Vienna — Punishing the Copycat',
  minutes: 7,
  orientation: 'white',
  kind: 'roadmap',
  beats: [
    b({ id: 'cp1', moves: 'e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4', say: "The Copycat trap — when Black mindlessly mirrors White move for move, White shatters the symmetry with Qg4!, swinging out to hit g7 and daring Black to keep copying. This is the one move Black cannot safely mirror, and the punishment for trying is severe.", sayShort: 'Qg4! — break the mirror, hit g7.', arrows: [A('g4', 'g7', ATK)], highlights: [H('g7', KEY)] }),
    b({ id: 'cp2', moves: 'e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5 Qxf2+ Kd1 Kf8 Nh3 Qd4 d3', say: "Black copies with …Qf6, but Nd5 sets the trap: the greedy …Qxf2+ runs into Kd1 and Nh3, and the queen is chased to d4 while White develops with tempo. There is the verdict — Black's queen raid is repelled, White is winning with a commanding lead in development and the knight dominating d5. The lesson: never copy into an attack.", sayShort: 'Nd5 — trap the copying queen.', highlights: [H('d5', KEY), H('d4', SOFT)] }),
  ],
};

export const VIENNA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'vienna-game::Stanley Variation': STANLEY,
  'vienna-game::Vienna Gambit Accepted': VGA,
  'vienna-game::Copycat Variation': COPYCAT,
  'vienna-game::Vienna Gambit': GAMBIT,
  'vienna-game::Vienna vs 2...Nc6': VS_NC6,
  // Frankenstein-Dracula tab — the CURATED regex matches the "Falkbeer
  // Variation" repertoire.json entry FIRST (its PGN is the wild Nxa8 line,
  // canonically the F-D main line per the lichess DB naming). The repertoire
  // also has a separate "Frankenstein-Dracula" entry (the calmer Be7 sub-
  // line). Key the lesson under BOTH names so the tab finds it either way.
  'vienna-game::Falkbeer Variation': FRANKENSTEIN_DRACULA,
  'vienna-game::Frankenstein-Dracula': FRANKENSTEIN_DRACULA,
  'vienna-game::Paulsen Attack': PAULSEN,
};
