import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision /
// threat / intent), highlights YELLOW (key square called out in narration)
// and SOFT BLUE (secondary context). Move squares are auto-painted orange
// by the LessonPlayer — we don't author those.
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
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

// ── The Vienna Gambit (3.f4) ─────────────────────────────────────
// Spine: Lasker's "lure the pawn away" principle made concrete. Black's
// most principled reply is 3...d5 (the counterstrike Edward Lasker himself
// recommended in Chess Strategy). White accepts with 4.fxe5, both knights
// trade in the centre, and White builds a big d4 centre against Black's
// piece activity. The Wurzburger Trap and the Hamppe-Allgaier sacrifice
// live in the WEAPONS layer — this lesson teaches the principled spine.
const GAMBIT: LessonScript = {
  openingId: 'vienna-game',
  title: 'Vienna Game — The Gambit (3.f4)',
  minutes: 10,
  orientation: 'white',
  beats: [
    b({ id: 'g1', moves: 'e4 e5 Nc3 Nf6 f4',
      say: "Welcome to the Vienna Gambit, the opening's loudest weapon. After 2.Nc3 Nf6 White does what Edward Lasker called the most natural reply at the side of the board: he plays f4, hurling a pawn at the centre to lure the e5-pawn away. Lasker wrote in *Chess Strategy*: 'It would seem a good plan to lure that pawn away, and this is rendered feasible by playing P-KB4 when he has a pawn on K4.' That is exactly the move you just saw. The pawn looks like a gift. It isn't.",
      sayShort: "3.f4 — Lasker's lure: pull the e5-pawn off the centre with a side-thrust.",
      highlights: [H('f4', KEY), H('e5', KEY)] }),
    b({ id: 'g2', moves: 'e4 e5 Nc3 Nf6 f4 d5',
      say: "And here is the principled reply: 3…d5! Black refuses to take the gambit pawn and counters in the centre instead — exactly the same idea on the other side of the board. White's f4 attacked e5; Black's d5 attacks e4 and f4 at once. This is what Lasker called the only fully sound reply, and it is the spine of this variation. The Vienna Gambit Accepted, where Black grabs with 3…exf4 instead, lives on its own page in this masterclass because that is where the named weapons live.",
      sayShort: "3…d5! — Lasker's principled counterstrike. Refuse the pawn, attack the centre back.",
      highlights: [H('d5', KEY), H('e4', KEY), H('f4', SOFT)] }),
    b({ id: 'g3', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4',
      say: "Now Lasker's exact passage from the book describes the next four plies: 'In answer to 4. PxKP, Black can play KtxP without having the slightest difficulty with his development.' White captures with 4.fxe5 — taking the gambit on the kingside, opening the f-file — and Black recaptures with 4…Nxe4, the knight grabbing the e4-pawn that f4 originally protected. Pawn structures cracked open, knights racing through the centre, the position is suddenly wide open.",
      sayShort: "4.fxe5 Nxe4 — Lasker's exact line: White's f-file opens, Black's knight grabs e4.",
      highlights: [H('e4', KEY), H('e5', KEY), H('f4', SOFT)] }),
    b({ id: 'g4', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4',
      say: "Here is what makes the Vienna Gambit dangerous. White develops the king-knight to f3 — Black answers Be7 — and then White plays d4! A huge central pawn duo on d4 and e5, supported by the c3-knight, the Nf3, and a future Bd3. This is what Lasker quietly endorsed: White accepts the gambit's tactical risk in exchange for the BIGGEST possible centre. Capablanca's rule is the law of this position: 'No violent attack can succeed without controlling at least two of the centre squares.' White just controls four.",
      sayShort: "6.d4! — the gambit's payoff. A huge central duo, the Capablanca dream.",
      highlights: [H('d4', KEY), H('e5', KEY)] }),
    b({ id: 'g5', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 Nxc3 bxc3',
      say: "Both sides race to safety. Black castles, then trades the e4-knight off — 7…Nxc3 — and White recaptures with the b-pawn, bxc3. The position settles. White has the bishop pair, a giant centre, and three centre pawns versus Black's two — a near-permanent structural edge. Black has the bishop on e7 ready to swing to g5 and the standard …c5 break against the centre. The Vienna Gambit has done its job: traded a pawn for a long-term positional grip.",
      sayShort: 'Black trades the e4-knight, White recaptures bxc3 — the bishop pair plus a big centre.',
      highlights: [H('d4', KEY), H('e5', KEY), H('c3', SOFT)] }),
    b({ id: 'g6', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 Nxc3 bxc3 c5 O-O Nc6',
      say: "Black strikes back the only way he can — 8…c5, opening the long diagonal for his light-squared bishop and challenging the d4-pawn. White castles, Black brings out the queen-knight to c6, and the modern middlegame begins. White's plan: hold the centre and unleash the d3-bishop, aimed straight at h7 once the …c5 break opens lines. Black's plan: dissolve the centre and prove his piece activity is worth a structural pawn. This is the canonical Vienna Gambit position, reached in Ivanchuk-Svidler 2009 and many other modern grandmaster games.",
      sayShort: '…c5 challenges the centre, both sides castle. The canonical Gambit middlegame.',
      arrows: [A('d3', 'h7', ATK)],
      highlights: [H('h7', KEY)] }),
    b({ id: 'g7', moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 Nxc3 bxc3 c5 O-O Nc6',
      say: "And one branch you must know — if Black plays the OTHER reply and takes the gambit with 3…exf4, you are no longer in this strategic line. You are in territory that has been studied for two centuries: the Vienna Gambit Accepted. That is where the Wurzburger Trap waits if Black develops too naturally, where Hamppe-Allgaier and Hamppe-Muzio sacrifices live if Black ALSO played 2…Nc6 instead of 2…Nf6, and where Steinitz himself walked his king to e2 and attacked. The Vienna Gambit has TWO completely different personalities: this one — Lasker's principled centre fight — and a tactical jungle one tab away. Learn this calmer one first; the named weapons are the reward when Black drifts.",
      sayShort: "If Black takes with 3…exf4 you're in the named-trap jungle — that's the next layer.",
      highlights: [H('f4', SOFT)] }),
  ],
};

// ── Vienna vs 2…Nc6 ─────────────────────────────────────────────
// Spine: the sharpest reply, 3.f4 — the launchpad for the historical
// Vienna sacrifices (Hamppe-Allgaier, Hamppe-Muzio, Pierce, Steinitz).
// This lesson lays out the strategic landscape and points at the named-
// weapon lessons that teach each individual sacrifice in depth.
const VS_NC6: LessonScript = {
  openingId: 'vienna-game',
  title: 'Vienna Game — Black plays 2…Nc6',
  minutes: 10,
  orientation: 'white',
  beats: [
    b({ id: 'nc6-1', moves: 'e4 e5 Nc3 Nc6',
      say: "At amateur level Black plays 2…Nc6 even more often than 2…Nf6 — almost forty per cent of the time. He defends e5 the classical Ruy way, with the knight, and waits to see what White does. The Vienna meets this with two completely different personalities: one calm, one furious. The calm path is 3.Bc4 — straight back into Italian-Vienna themes. The furious path is 3.f4 — and that is where almost every famous Vienna brilliancy in chess history was played.",
      sayShort: '2…Nc6 — Black\'s most common amateur reply. Two White answers: Bc4 (calm) or f4 (fury).',
      highlights: [H('c6', KEY), H('e5', SOFT)] }),
    b({ id: 'nc6-2', moves: 'e4 e5 Nc3 Nc6 f4',
      say: "We take the furious path. 3.f4 — exactly the same lever Lasker described, the side-thrust to lure the e5-pawn away. But against 2…Nc6 the consequences are completely different from the 2…Nf6 Gambit: the c6-knight is on e5's defender's square, so taking …exf4 doesn't expose the knight on e4 the way it does in the Nf6 line. Black almost always accepts the pawn — and that acceptance is the doorway to the Vienna's greatest historical attacks.",
      sayShort: '3.f4 against Nc6 — the doorway to the Vienna\'s historical brilliancies.',
      highlights: [H('f4', KEY)] }),
    b({ id: 'nc6-3', moves: 'e4 e5 Nc3 Nc6 f4 exf4',
      say: "Black accepts: 3…exf4. He has the gambit pawn. But look at White's centre — the e4-pawn now controls d5 and f5 alone, the f-file is wide open in front of White's king-rook, and White's whole army is poised to develop with tempo. The pawn is bait. Steinitz built his entire opening repertoire around the principle: a pawn sacrificed for development and initiative is almost always a sound investment.",
      sayShort: '3…exf4 — Black takes the bait. White\'s f-file opens, every piece poised to develop.',
      highlights: [H('f4', KEY)] }),
    b({ id: 'nc6-4', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3',
      say: "4.Nf3 — develop with tempo, eye the kingside. White doesn't waste a move recovering the pawn. He builds. And now Black is at a fork: hold the gambit pawn with …g5 (the greedy try, the one that walks into the Hamppe-Allgaier and Hamppe-Muzio sacrifices) or give it back to neutralise (the safer, less ambitious choice). The amateur usually grabs the pawn AND tries to hold it.",
      sayShort: '4.Nf3 develops with tempo. Black\'s next move decides which historical brilliancy he walks into.',
      highlights: [H('f3', KEY)] }),
    b({ id: 'nc6-5', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5',
      say: "4…g5 — Black tries to hold the f4-pawn with his g-pawn. This is the move that creates immortal chess. Edward Lasker noted that lines like this 'lead to the most brilliant complications,' and history bears him out: every important Vienna sacrifice of the nineteenth century launches from approximately this position. The g4-square is about to become a weapon Black thinks is his and isn't.",
      sayShort: '4…g5 — the greedy hold. The move that creates immortal chess.',
      highlights: [H('g5', KEY), H('f4', SOFT)] }),
    b({ id: 'nc6-6', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 h4 g4 Ng5',
      arrows: [{ from: 'g5', to: 'f7', color: ATK }, { from: 'g5', to: 'h7', color: ATK }],
      highlights: [H('f7', KEY), H('g5', KEY)] ,
      say: "Here is the launchpad. 5.h4 g4 6.Ng5 — White's knight leaps to g5, attacking the soft f7-square AND the h7-pawn, with a fork of devastating threats hanging in the air. From this exact position three of chess history's most famous sacrifices fire: the Hamppe-Allgaier (7.Nxf7! — the knight sacrifices itself to drag Black's king into the open), the Hamppe-Muzio (a knight sac AND the right to castle in one go), and Steinitz's king-walk attack. Each of those is its own lesson in the Weapons layer.",
      sayShort: 'The launchpad: 6.Ng5! Three historical sacrifices fire from this exact position.' }),
    b({ id: 'nc6-7', moves: 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 h4 g4 Ng5',
      say: "If sharp historical attacks aren't your weapon of choice, the calm answer to 2…Nc6 is simply 3.Bc4 — Italian-Vienna pressure on f7, exactly the patient build you saw in the Classical lesson, just with Black's knight on c6 instead of f6. Same Bb3 retreat when Black plays …Na5, same Bc2 pivot, same slow squeeze. The Vienna against 2…Nc6 has two completely opposite personalities, and you choose which one fits the day. Steinitz himself played both — sometimes the violent sacrifice, sometimes the patient grind. The opening lets you decide.",
      sayShort: '3.Bc4 is the calm alternative — Italian-Vienna pressure on f7. Two personalities, one Vienna.',
      highlights: [H('c4', SOFT), H('f7', SOFT)] }),
  ],
};

// ── Frankenstein-Dracula ────────────────────────────────────────
// The wildest line in the Vienna. After 3.Bc4 Black plays …Nxe4? thinking
// it's a safe pawn-grab; White answers 4.Qh5! and the game enters a
// forced sequence that ends with the Nxa8 raid — White wins the
// exchange, Black gets compensation in piece activity. Famous for a
// reason. Note: the calmer 5…Be7 sub-line absorbs into a branch beat
// (David's Falkbeer-merge call, 2026-05-21).
const FRANKENSTEIN_DRACULA: LessonScript = {
  openingId: 'vienna-game',
  title: 'Vienna Game — The Frankenstein-Dracula',
  minutes: 12,
  orientation: 'white',
  beats: [
    b({ id: 'fd-1', moves: 'e4 e5 Nc3 Nf6 Bc4',
      say: "The Frankenstein-Dracula begins quietly enough: 3.Bc4, the Italian-Vienna bishop pointing at f7, exactly as in the Classical lesson. But what follows is the wildest known line in the entire Vienna repertoire, born when Black makes one ambitious choice on his third move.",
      sayShort: '3.Bc4 — quiet start. The choice Black makes next decides whether you stay calm or enter chaos.',
      highlights: [H('c4', SOFT), H('f7', SOFT)] }),
    b({ id: 'fd-2', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4',
      say: "3…Nxe4! Black grabs the e4-pawn, reasoning that the c3-knight is pinned to the f1-h3 diagonal by the Bc4 (if Nxe4, then …Bxc4 takes White's bishop too). On the surface it looks safe — a free pawn, a developed knight on e4. In reality, Black has just walked into the deepest forced sequence in the Vienna's repertoire.",
      sayShort: '3…Nxe4 — the bold pawn-grab. Looks like a free pawn. Isn\'t.',
      highlights: [H('e4', KEY)] }),
    b({ id: 'fd-3', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5',
      say: "4.Qh5! The bombshell. White's queen leaps to h5 with TWO threats at once: capture the e4-knight, and — far worse — checkmate on f7 next move (Qxf7#). Black's e4-knight cannot move because the queen-takes-on-f7 mates. Black has exactly one defensive move that meets both threats, and it isn't pretty.",
      sayShort: '4.Qh5! — attacks the knight AND threatens Qxf7 mate. The Frankenstein wakes up.',
      arrows: [A('h5', 'f7', ATK), A('h5', 'e5', ATK)],
      highlights: [H('f7', KEY), H('e4', SOFT)] }),
    b({ id: 'fd-4', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6',
      say: "4…Nd6 is forced — the only move that defends f7 AND saves the knight. The knight retreats from e4 to d6, blocking the queen's path to f7 and dodging the c3-knight's attack. Black has rescued the knight. He's lost three tempi in the process, but materially he is still up a pawn.",
      sayShort: '4…Nd6 — the only-move. The knight retreats to block Qxf7 and save itself.',
      highlights: [H('d6', KEY), H('f7', SOFT)] }),
    b({ id: 'fd-5', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3',
      say: "5.Bb3 — White slides the bishop one square back. This isn't just dodging the …Nxc4 threat that Black would land next; it RELOADS the bishop on the b3-f7 diagonal, where it once again stares at f7 from a square Black can no longer reach. The threats keep regenerating, exactly the way Frankenstein keeps coming back.",
      sayShort: '5.Bb3 — bishop reloads on f7. The threats regenerate.',
      arrows: [A('b3', 'f7', ATK)],
      highlights: [H('f7', KEY)] }),
    b({ id: 'fd-6', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6',
      say: "Now Black has a real choice. The classical move is 5…Nc6 — the ambitious one, developing AND defending e5. This is the line that walks straight into the Nxa8 raid you're about to see. The calmer 5…Be7 develops more conservatively, blocks the queen-bishop diagonal, and avoids the pyrotechnics — it's the path the modern grandmaster picks if he doesn't want to memorise a forced waterfall. Both moves exist in master practice; the Nxa8 main line is famous because it's UNFORGETTABLE.",
      sayShort: '5…Nc6 (this lesson) is the wild path. 5…Be7 is the calm alternative.',
      highlights: [H('c6', KEY), H('e7', SOFT)] }),
    b({ id: 'fd-7', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5',
      say: "Here it comes. 6.Nb5! — the c3-knight leaps to attack c7 with check ideas, threatening Nxc7+ which would win the rook on a8. Black plays …g6 to chase the queen away from h5, but White answers Qf3 — the queen pivots to attack f7 from a new diagonal. Black plays …f5 to block the queen, but this is exactly what White wanted — every Black pawn move is a future weakness. The position is dripping with tactics.",
      sayShort: '6.Nb5 attacks c7; …g6 Qf3 f5 — every Black defensive move creates a new weakness.',
      arrows: [A('b5', 'c7', ATK)],
      highlights: [H('c7', KEY), H('f7', KEY), H('f5', SOFT)] }),
    b({ id: 'fd-8', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8',
      say: "The famous raid lands. 8.Qd5 — queen attacks f5 AND c-file — Black plays …Qe7 to defend. And now 9.Nxc7+! Kd8 10.Nxa8! The knight gobbles the rook on a8. Steinitz-era players called this the most dramatic mini-combination in chess: two captures in a row, a queen-trap-then-rook-raid that turns the whole opening into a tactical demonstration. White is up the exchange and a pawn in raw material.",
      sayShort: '9.Nxc7+! 10.Nxa8! — the Frankenstein\'s raid. Exchange and pawn won in two moves.',
      arrows: [A('a8', 'b6', VIS)],
      highlights: [H('a8', KEY), H('c7', KEY)] }),
    b({ id: 'fd-9', moves: 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8 b6',
      say: "But the knight on a8 is trapped — Black plans …b6 and …Bb7 to win it back, and theory says Black has practical compensation despite the material deficit. So the verdict on the Frankenstein-Dracula main line is sharp but technically equal — White wins the exchange, Black wins activity. Yet at the board, against a player who hasn't memorised this exact 20-move sequence, the line is utterly winning practically. Adams played it as White and was happy to be there. The Frankenstein-Dracula is theory-soaked, but every move from move 4 onward has ONE answer — and if Black doesn't know it, the line is just won.",
      sayShort: 'a8-knight is trapped; …b6, Bb7 wins it back. Theory: equal. Practice: winning.',
      highlights: [H('a8', SOFT), H('b7', SOFT)] }),
  ],
};

// ── Paulsen (3.g3) ─────────────────────────────────────────────
// The modern grandmaster's choice. At amateur level only 4% of Vienna
// players reach for the fianchetto, but at the very top it's the most
// popular reply to 2...Nf6 (35.1%). Carlsen, Caruana, Mamedyarov all
// play it. The pitch: slow squeeze from a distance, no theory race,
// pure positional Vienna.
const PAULSEN: LessonScript = {
  openingId: 'vienna-game',
  title: 'Vienna Game — The Paulsen (3.g3)',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'p1', moves: 'e4 e5 Nc3 Nf6 g3',
      say: "3.g3 — the Paulsen Variation, named for Louis Paulsen who pioneered fianchetto systems in the 19th century. At amateur level it's almost never seen, but at the very top of chess today it's the MOST popular White reply to 2…Nf6 — more popular than the Gambit and the Classical combined. Carlsen, Caruana, Mamedyarov, So have all leaned on it. The pitch is the opposite of the Gambit's fury: a slow squeeze from a distance, no theory race, no memorisation, just patient positional Vienna.",
      sayShort: "3.g3 — the modern elite's Vienna. Slow squeeze from a fianchetto.",
      highlights: [H('g3', KEY)] }),
    b({ id: 'p2', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2',
      say: "Black develops the king-bishop to c5, eyeing f2 — the natural reply — and White fianchettoes with Bg2. The g2-bishop now rakes the long light diagonal from a corner of the board, looking through White's own e4-pawn toward the d5 outpost where a knight might one day plant. For now the diagonal is screened by White's own centre pawn, but every later pawn break that clears e4 unleashes the bishop instantly.",
      sayShort: 'Bg2 — fianchetto, the long diagonal loaded toward d5.',
      highlights: [H('d5', KEY), H('e4', SOFT)] }),
    b({ id: 'p3', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2',
      say: "The Vienna knight-maneuver returns, exactly as in the Classical: Nge2! White re-routes his king-knight via e2 toward g3 or f4, keeping every option open. Same Nc3-Ne2 dance you saw in the Classical lesson, but now with a fianchettoed bishop already supporting the centre from below. The Paulsen IS the Classical Vienna with the g2-bishop swapped in for the Bc4.",
      sayShort: 'Nge2 — same Vienna knight reroute as the Classical, with Bg2 swapped for Bc4.',
      arrows: [A('e2', 'g3', INTENT)] }),
    b({ id: 'p4', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O',
      say: "Black brings out the queen-knight to c6, White castles short, and the position settles into a quiet maneuvering battle. No central commitment yet from either side. The Vienna's c3-knight still backs e4, the fianchettoed bishop quietly cooks on the long diagonal, and the king-knight on e2 stares at three different forward squares (c3-trade, g3-reroute, f4-attack). White has flexibility; Black has solidity. The fight is over who improves their pieces faster.",
      sayShort: 'Both develop, both castle. The fight is who improves their pieces fastest.',
      highlights: [H('e4', SOFT)] }),
    b({ id: 'p5', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3',
      say: "White's setup completes: …a4 to gain queenside space and stop a future …Na5, d3 to solidify, and the position has reached its canonical Paulsen middlegame structure. White's plan: Nd5 at the right moment (the long-diagonal bishop supports it), and slow expansion on either wing depending on where Black commits. Black's plan: develop solidly, contest the d5 outpost, and pray for an opening of the long diagonals where his own bishop-pair might shine.",
      sayShort: 'White\'s setup completes. Nd5 is the dream move, slow expansion is the plan.',
      arrows: [A('c3', 'd5', INTENT)],
      highlights: [H('d5', KEY)] }),
    b({ id: 'p6', moves: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O a6 a4 O-O d3',
      say: "Why is the Paulsen the modern grandmaster's choice when amateurs rarely see it? Two reasons. First, the FORCED LINES are extremely short — there is no fifteen-move memorised waterfall like the Frankenstein-Dracula. The student of the Paulsen only needs to understand the structure, not memorise the moves. Second, the Vienna Gambit at the very top has been worked out so thoroughly that even Black has computer-verified equalising paths; the Paulsen sidesteps all of that prep. Treat the Paulsen as the Vienna's grown-up form: less spectacle, more solidity. Mamedyarov has built half his Vienna career on it.",
      sayShort: 'The Paulsen: no forced lines to memorise, sidesteps modern theory — Mamedyarov\'s favourite.',
      highlights: [H('e4', SOFT)] }),
  ],
};

export const VIENNA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'vienna-game::Vienna Gambit': GAMBIT,
  'vienna-game::Vienna vs 2...Nc6': VS_NC6,
  // Frankenstein-Dracula tab — the CURATED regex matches the "Falkbeer
  // Variation" repertoire.json entry FIRST (its PGN is the wild Nxa8 line,
  // canonically the F-D main line per the lichess DB naming). The repertoire
  // also has a separate "Frankenstein-Dracula" entry (the calmer 5…Be7 sub-
  // line). Key the lesson under BOTH names so the tab finds it either way.
  'vienna-game::Falkbeer Variation': FRANKENSTEIN_DRACULA,
  'vienna-game::Frankenstein-Dracula': FRANKENSTEIN_DRACULA,
  'vienna-game::Paulsen Attack': PAULSEN,
};
