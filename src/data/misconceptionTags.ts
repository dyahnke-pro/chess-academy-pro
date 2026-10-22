// The FIXED misconception vocabulary — the spine of the weakness loop
// (David 2026-05-21). Discussion Practice (live games), Game Review
// (past games), and passive import-time auto-analysis all tag a slip
// with ONE of these closed-set ids. A closed set is what makes the
// tags aggregatable ("overvalued-attack 7×") and drillable (each tag
// maps to a drill source). The coach NEVER invents a tag — it must
// pick from this list (the prompt block below enumerates them).
//
// Buckets group tags for the Weaknesses view and the Training Plan
// shares. `drill` is the tag -> position mapping: where the Training
// Plan pulls reps to fix this error. `puzzleThemes` index into
// puzzles.json themes (Lichess CC0). `coachCue` guides the LLM on WHEN
// the tag applies (it is shown the cue list, then asked to classify).

export type MisconceptionBucket =
  | 'opening'
  | 'tactical'
  | 'positional'
  | 'endgame'
  | 'general'
  | 'uncategorized';

export type MisconceptionDrillKind =
  | 'opening-line'
  | 'tactic'
  | 'principle'
  | 'endgame';

export interface MisconceptionTagDef {
  id: string;
  /** Plain-English label shown in the Weaknesses list (no SAN, no jargon). */
  label: string;
  bucket: MisconceptionBucket;
  /** One sentence: what the error IS, in plain English. */
  blurb: string;
  /** Guidance to the classifier LLM on when to apply this tag. */
  coachCue: string;
  drill: {
    kind: MisconceptionDrillKind;
    /** puzzles.json theme tags this error drills against (tactical). */
    puzzleThemes?: string[];
  };
}

export const MISCONCEPTION_TAGS = [
  // ── OPENING ──────────────────────────────────────────────────────
  {
    id: 'left-book-early',
    label: 'Left theory early',
    bucket: 'opening',
    blurb: "You left the known opening line before you had to, into a worse position.",
    coachCue: 'Move departs from established theory while still in the opening AND the new move is objectively worse than the book move.',
    drill: { kind: 'opening-line' },
  },
  {
    id: 'neglected-development',
    label: 'Neglected development',
    bucket: 'opening',
    blurb: "You moved the same piece twice or pushed pawns while pieces sat at home.",
    coachCue: 'In the opening, played a non-developing move (repeat piece move, third+ pawn move, early queen sortie) when minor pieces were still undeveloped.',
    drill: { kind: 'principle' },
  },
  {
    id: 'king-stuck-center',
    label: 'Left the king in the center',
    bucket: 'opening',
    blurb: "You delayed castling and left the king exposed in the middle.",
    coachCue: 'Could have castled but chose another move, leaving the king on its starting file while the center is open or opening.',
    drill: { kind: 'principle' },
  },
  {
    id: 'greedy-pawn-grab',
    label: 'Grabbed material, ignored position',
    bucket: 'opening',
    blurb: "You won a pawn at the cost of development or king safety.",
    coachCue: 'Captured a pawn (often a wing or gambit pawn) at the price of lost time, a stuck king, or a trapped piece — the eval favors the opponent despite the extra material.',
    drill: { kind: 'opening-line' },
  },

  {
    id: 'tempo-handed',
    label: 'Handed over a tempo',
    bucket: 'opening',
    blurb: "Your move let the opponent develop or push with an attack, so you had to move again instead of building.",
    coachCue: 'After the move, the opponent has a safe developing move or pawn advance that attacks a piece with tempo; the best move left no such kick.',
    drill: { kind: 'principle' },
  },
  {
    id: 'space-conceded',
    label: 'Gave up space in the centre',
    bucket: 'opening',
    blurb: "You stepped a piece off a central square and the opponent could push a pawn onto it for free.",
    coachCue: 'A piece retreated from the centre box and a safe central pawn advance onto or past that square became available; the best move kept it covered.',
    drill: { kind: 'principle' },
  },

  // ── TACTICAL ─────────────────────────────────────────────────────
  {
    id: 'hung-material',
    label: 'Hung a piece or pawn',
    bucket: 'tactical',
    blurb: "You left something undefended and the opponent can win it for free.",
    coachCue: 'The move leaves a piece or pawn en prise (capturable for no compensation), or fails to recapture/defend an already-attacked unit.',
    drill: { kind: 'tactic', puzzleThemes: ['hangingPiece', 'fork'] },
  },
  {
    id: 'missed-tactic',
    label: 'Missed a winning tactic',
    bucket: 'tactical',
    blurb: "A concrete shot was available — a fork, pin, or combination — and you played something quiet.",
    coachCue: 'A forcing tactic (fork/pin/skewer/discovered attack/mate) was available and clearly best, but the played move was a quiet alternative that throws away the advantage.',
    drill: { kind: 'tactic', puzzleThemes: ['fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck'] },
  },
  // ── YOUR TACTIC, PER MOTIF (WO-MOTIFS-01, 2026-10-22) ───────────────
  // The shot that was yours, named by the ONE classifier
  // (`missedTacticService.detectTacticType` via `tacticMotifs`) where the move
  // is scored. `missed-tactic` above stays the catch-all for a shot the
  // classifier cannot name ("a shot"). The table of motifs is
  // `src/data/tacticMotifs.ts`.
  {
    id: 'missed-your-free-piece',
    label: 'Let a free piece go',
    bucket: 'tactical',
    blurb: 'Their piece was there for the taking and you played something else.',
    coachCue: 'An undefended enemy piece could be taken for nothing and the played move left it.',
    drill: { kind: 'tactic', puzzleThemes: ['hangingPiece'] },
  },
  {
    id: 'missed-your-fork',
    label: 'Missed a fork',
    bucket: 'tactical',
    blurb: 'One of your pieces could hit two of theirs at once and you did not play it.',
    coachCue: 'A fork that won material was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['fork'] },
  },
  {
    id: 'missed-your-pin',
    label: 'Missed a pin',
    bucket: 'tactical',
    blurb: 'You could pin one of their pieces, or win a piece already pinned, and did not.',
    coachCue: 'A pin that won material was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['pin'] },
  },
  {
    id: 'missed-your-skewer',
    label: 'Missed a skewer',
    bucket: 'tactical',
    blurb: 'Two of their pieces stood on one line and you did not win the one behind.',
    coachCue: 'A skewer that won material was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['skewer'] },
  },
  {
    id: 'missed-your-discovery',
    label: 'Missed a discovered attack',
    bucket: 'tactical',
    blurb: 'Moving one piece would have let the piece behind it win material.',
    coachCue: 'A discovered attack that won material was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['discoveredAttack'] },
  },
  {
    id: 'missed-your-mate',
    label: 'Missed a mate',
    bucket: 'tactical',
    blurb: 'You had a forced mate and played something else.',
    coachCue: 'A forced mate (the back rank included) was on the board and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['mateIn1', 'mateIn2', 'backRankMate'] },
  },
  {
    id: 'missed-your-promotion',
    label: 'Missed a promotion',
    bucket: 'tactical',
    blurb: 'Your pawn could promote, or force its way through, and you did not push it.',
    coachCue: 'Promoting a pawn was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['promotion', 'advancedPawn'] },
  },
  {
    id: 'missed-your-double-check',
    label: 'Missed a double check',
    bucket: 'tactical',
    blurb: 'Two of your pieces could check the king at once and you did not play it.',
    coachCue: 'A double check was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['doubleCheck'] },
  },
  {
    id: 'missed-your-guard-removal',
    label: 'Missed removing the guard',
    bucket: 'tactical',
    blurb: 'Taking or chasing their only guard would have won what it protected.',
    coachCue: 'Removing the lone defender of a piece or square was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['capturingDefender'] },
  },
  {
    id: 'missed-your-overload',
    label: 'Missed an overloaded defender',
    bucket: 'tactical',
    blurb: 'One of their pieces was guarding two things and you did not make it choose.',
    coachCue: 'Exploiting a defender with two jobs was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['deflection'] },
  },
  {
    id: 'missed-your-deflection',
    label: 'Missed a deflection',
    bucket: 'tactical',
    blurb: 'Luring or forcing one of their pieces away would have won what it guarded.',
    coachCue: 'A deflection or decoy was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['deflection', 'attraction'] },
  },
  {
    id: 'missed-your-zwischenzug',
    label: 'Missed an in-between move',
    bucket: 'tactical',
    blurb: 'A stronger forcing move came first, before the obvious reply.',
    coachCue: 'An in-between forcing move was the best move and the played move went straight for the obvious one.',
    drill: { kind: 'tactic', puzzleThemes: ['intermezzo'] },
  },
  {
    id: 'missed-your-trapped-piece',
    label: 'Missed a trapped piece',
    bucket: 'tactical',
    blurb: 'One of their pieces had no safe square and you did not go after it.',
    coachCue: 'Winning a trapped enemy piece was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['trappedPiece'] },
  },
  {
    id: 'missed-your-clearance',
    label: 'Missed a clearance',
    bucket: 'tactical',
    blurb: 'Moving a piece out of the way, with tempo, would have opened a winning line.',
    coachCue: 'A clearance that opened a line or square was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['clearance'] },
  },
  {
    id: 'missed-your-interference',
    label: 'Missed an interference',
    bucket: 'tactical',
    blurb: 'Dropping a piece between their defender and what it guards would have won.',
    coachCue: 'Cutting a defender off with an interposed piece was the best move and the played move missed it.',
    drill: { kind: 'tactic', puzzleThemes: ['interference'] },
  },
  {
    id: 'calculation-depth',
    label: 'Long tactical sequences',
    bucket: 'tactical',
    blurb: 'You find the first move but lose the thread deeper into a forcing line.',
    coachCue: 'Asked to calculate a multi-move winning sequence (review spot-the-sequence), the student found the start but fell off before the end, or could not begin it. The reached/total depth is recorded in the coach note.',
    drill: { kind: 'tactic', puzzleThemes: ['long', 'veryLong', 'crushing'] },
  },
  {
    id: 'missed-opponents-threat',
    label: "Missed the opponent's threat",
    bucket: 'tactical',
    blurb: "You ignored what the opponent was threatening and walked into it.",
    coachCue: 'The opponent had a concrete threat (capture, fork, mate-in-N) on the prior move; the played move does nothing about it and allows it to land.',
    drill: { kind: 'tactic', puzzleThemes: ['defensiveMove', 'fork', 'mate'] },
  },
  // ── THEIR TACTIC, PER MOTIF (2026-10-19, OS-4) ───────────────────────
  // The incoming half of each motif: the opponent's fork/pin/… was on the
  // board at the student's turn, and their reply parried it (held) or let it
  // land (broken). Written by `threatAnswerEvidence.recordThreatAnswer` from the
  // board, so each motif can turn green on its own; the one fundamental that
  // proves a defending miss of a motif ("staying in a pin you could break")
  // files its slip here too (WO-MOTIFS-01) — one move counts once (`holdRate`).
  {
    id: 'missed-their-fork',
    label: "Missed the opponent's fork",
    bucket: 'tactical',
    blurb: "The opponent's piece hit two of yours and you lost one of them.",
    coachCue: 'An opponent fork was on the board at your turn and your reply let it win material.',
    drill: { kind: 'tactic', puzzleThemes: ['defensiveMove', 'fork'] },
  },
  {
    id: 'missed-their-pin',
    label: "Missed the opponent's pin",
    bucket: 'tactical',
    blurb: "A piece of yours was pinned and you let the pin win it.",
    coachCue: 'An opponent pin was on the board at your turn and your reply let it win material.',
    drill: { kind: 'tactic', puzzleThemes: ['defensiveMove', 'pin'] },
  },
  {
    id: 'missed-their-skewer',
    label: "Missed the opponent's skewer",
    bucket: 'tactical',
    blurb: "Two of your pieces stood on one line and the opponent won the one behind.",
    coachCue: 'An opponent skewer was on the board at your turn and your reply let it win material.',
    drill: { kind: 'tactic', puzzleThemes: ['defensiveMove', 'skewer'] },
  },
  {
    id: 'missed-their-discovery',
    label: "Missed the opponent's discovered attack",
    bucket: 'tactical',
    blurb: "A piece moved out of the way and the one behind it won material.",
    coachCue: 'An opponent discovered attack was on the board at your turn and your reply let it win material.',
    drill: { kind: 'tactic', puzzleThemes: ['defensiveMove', 'discoveredAttack'] },
  },
  {
    id: 'missed-their-mate',
    label: "Missed the opponent's mate threat",
    bucket: 'tactical',
    blurb: "The opponent threatened mate and your move did not stop it.",
    coachCue: 'An opponent mate-in-one was on the board at your turn and your reply allowed it.',
    drill: { kind: 'tactic', puzzleThemes: ['defensiveMove', 'mateIn1'] },
  },
  {
    id: 'missed-their-trap',
    label: 'Let a piece get trapped',
    bucket: 'tactical',
    blurb: "One of your pieces had no safe square and you lost it.",
    coachCue: 'A piece of yours was trapped at your turn and your reply let the opponent win it.',
    drill: { kind: 'tactic', puzzleThemes: ['defensiveMove', 'trappedPiece'] },
  },
  {
    id: 'missed-their-double-check',
    label: "Missed the opponent's double check",
    bucket: 'tactical',
    blurb: 'Two of their pieces could check your king at once and you let it happen.',
    coachCue: 'An opponent double check was on the board at your turn and your reply allowed it to land.',
    drill: { kind: 'tactic', puzzleThemes: ['defensiveMove', 'doubleCheck'] },
  },
  {
    id: 'missed-their-guard-removal',
    label: 'Let them remove your guard',
    bucket: 'tactical',
    blurb: 'They could take or chase the only guard of one of your pieces, and they won it.',
    coachCue: "An opponent's removal of your lone defender was on the board at your turn and your reply let it win material.",
    drill: { kind: 'tactic', puzzleThemes: ['defensiveMove', 'capturingDefender'] },
  },
  {
    id: 'missed-their-overload',
    label: 'Left a defender overloaded',
    bucket: 'tactical',
    blurb: 'One of your pieces was guarding two things and they made it choose.',
    coachCue: 'An overloaded defender of yours was on the board at your turn and your reply let them exploit it.',
    drill: { kind: 'tactic', puzzleThemes: ['defensiveMove', 'deflection'] },
  },
  {
    id: 'overvalued-attack',
    label: 'Overvalued the attack',
    bucket: 'tactical',
    blurb: "You sacrificed or committed to an attack that wasn't really there.",
    coachCue: 'Sacrificed material or threw pieces at the king when the attack is unsound — the engine shows the defender consolidating and emerging better.',
    drill: { kind: 'tactic', puzzleThemes: ['sacrifice', 'attackingF2F7', 'kingsideAttack'] },
  },
  {
    id: 'poisoned-pawn',
    label: 'Took a poisoned pawn',
    bucket: 'tactical',
    blurb: "You grabbed a pawn and the capturing piece got trapped or chased down.",
    coachCue: 'Captured a pawn (often with the queen) and the piece is then trapped or harried, losing more material or far more time than the pawn was worth — the engine wins the material straight back.',
    drill: { kind: 'tactic', puzzleThemes: ['trappedPiece', 'hangingPiece'] },
  },

  // ── POSITIONAL ───────────────────────────────────────────────────
  {
    id: 'weakened-king-safety',
    label: "Weakened your king's shelter",
    bucket: 'positional',
    blurb: "You pushed the pawns in front of your own king without need.",
    coachCue: 'Advanced a pawn shielding the castled king (h/g/f or a/b/c) creating lasting holes or open lines toward the king, with no concrete gain.',
    drill: { kind: 'principle' },
  },
  {
    id: 'created-pawn-weakness',
    label: 'Created a lasting pawn weakness',
    bucket: 'positional',
    blurb: "You made a permanent weakness — doubled, isolated, or backward pawns.",
    coachCue: 'A pawn move or trade leaves a structural weakness (isolated/doubled/backward pawn, hole on a key square) the opponent can target long-term.',
    drill: { kind: 'principle' },
  },
  {
    id: 'misplaced-piece',
    label: 'Left a piece passive',
    bucket: 'positional',
    blurb: "A piece went to (or stayed on) a square with no scope or future.",
    coachCue: 'Routed a piece to a passive square (knight on the rim, bishop biting on its own pawns, undeveloped rook) when an active square was available.',
    drill: { kind: 'principle' },
  },
  {
    id: 'bad-trade',
    label: 'Made a bad trade',
    bucket: 'positional',
    blurb: "You traded a good piece for a worse one, or relieved the opponent's cramped position.",
    coachCue: "Exchanged a strong, active piece for a passive one (or traded into the opponent's preferred structure / freed their game) when keeping the tension or avoiding the trade was clearly better.",
    drill: { kind: 'principle' },
  },

  {
    id: 'overextended-pawn',
    label: 'Overextended a pawn',
    bucket: 'positional',
    blurb: "You pushed a pawn past its support and it became a target.",
    coachCue: 'A pawn advanced to the fifth rank or beyond with no pawn behind it on a neighbouring file, and the opponent can attack or win it soundly.',
    drill: { kind: 'principle' },
  },
  {
    id: 'capture-toward-centre',
    label: 'Recaptured the wrong way',
    bucket: 'positional',
    blurb: "You recaptured toward the centre by rote when the other pawn was better here.",
    coachCue: 'Faced a choice of pawn recapture and took toward the centre by the general rule, but the other recapture was concretely better — it opens a file for a rook or another positional gain — and the engine confirms the played capture was worse.',
    drill: { kind: 'principle' },
  },
  {
    id: 'bad-trade-material',
    label: 'Wrong trade for the material situation',
    bucket: 'positional',
    blurb: "Ahead you should trade pieces; behind you should keep them — this trade went the wrong way.",
    coachCue: 'Material lead of two points or more and the best move was a piece trade the played move avoided, or a deficit of two or more and the played move traded pieces the best move kept.',
    drill: { kind: 'principle' },
  },

  // ── ENDGAME ──────────────────────────────────────────────────────
  {
    id: 'passive-king-endgame',
    label: 'Kept the king passive in the endgame',
    bucket: 'endgame',
    blurb: "In the endgame the king is a fighting piece — yours stayed home.",
    coachCue: 'In an endgame (few pieces, queens off), failed to activate the king toward the center/pawns when it was safe and best to do so.',
    drill: { kind: 'endgame' },
  },
  {
    id: 'mistimed-pawn-break',
    label: 'Mistimed a pawn break',
    bucket: 'endgame',
    blurb: "You played (or missed) a pawn break at the wrong moment.",
    coachCue: 'Pushed a pawn break prematurely (creating weaknesses) or missed the moment to break when it was the only way to make progress / hold.',
    drill: { kind: 'endgame' },
  },
  {
    id: 'botched-conversion',
    label: 'Rushed a winning position',
    bucket: 'endgame',
    blurb: "You had it won and rushed — simplify, stay patient, don't give chances.",
    coachCue: 'In a clearly winning position, played a careless or hasty move that surrenders much of the advantage (declined a clean simplification, allowed counterplay).',
    drill: { kind: 'endgame' },
  },
  {
    id: 'passed-pawn-neglected',
    label: 'Left the passed pawn sitting',
    bucket: 'endgame',
    blurb: "A passed pawn is a rocket — it has to be pushed.",
    coachCue: 'In an endgame, the best move advanced a passed pawn (or made/defended one) and the played move left it home to be blockaded.',
    // NB 'passedPawn' was declared here and is carried by ZERO puzzles in
    // puzzles.json — dead weight that matched nothing. The corpus's words for
    // this idea are 'advancedPawn' (996) and 'promotion' (389). Gate:
    // drillVocabulary.test.ts.
    drill: { kind: 'endgame', puzzleThemes: ['advancedPawn', 'promotion'] },
  },
  {
    id: 'passive-rook',
    label: 'Left the rook passive',
    bucket: 'endgame',
    blurb: "A rook wants the seventh rank and open lines, not a passive post.",
    coachCue: 'In an endgame, the best move swung a rook to the seventh rank (an active rook) and the played move left it passive.',
    drill: { kind: 'endgame' },
  },

  // ── GENERAL ──────────────────────────────────────────────────────
  {
    id: 'no-plan',
    label: 'Played without a plan',
    bucket: 'general',
    blurb: "The move had no purpose — no target, no improvement, no idea behind it.",
    coachCue: 'Use sparingly, only when no more specific tag fits: an aimless move with no concrete idea, target, or piece improvement behind it.',
    drill: { kind: 'principle' },
  },

  // ── UNCATEGORIZED ────────────────────────────────────────────────
  // Catch-all holding pen (David 2026-05-21). When a real error exists
  // but none of the tags above fit, the classifier returns `other` plus
  // a short free-text label (stored on the record's customLabel). NOT
  // drillable on its own — it's a review queue. Frequent free-text
  // labels get promoted into first-class tags + their own bucket/tab.
  {
    id: 'other',
    label: 'Uncategorized',
    bucket: 'uncategorized',
    blurb: "A real error that doesn't fit the current categories — held for review.",
    coachCue: 'A genuine mistake worth noting, but none of the specific tags above describe it. Provide a short free-text label of the error instead.',
    drill: { kind: 'principle' },
  },
] as const satisfies readonly MisconceptionTagDef[];

export type MisconceptionTagId = (typeof MISCONCEPTION_TAGS)[number]['id'];

const TAG_BY_ID: Record<string, MisconceptionTagDef> = Object.fromEntries(
  MISCONCEPTION_TAGS.map((t) => [t.id, t]),
);

/** Look up a tag def by id. Returns null for an unknown id (e.g. an
 *  LLM hallucinated one outside the closed set — callers reject it). */
export function getMisconceptionTag(id: string): MisconceptionTagDef | null {
  return TAG_BY_ID[id] ?? null;
}

export function isMisconceptionTagId(id: string): id is MisconceptionTagId {
  return id in TAG_BY_ID;
}

/** THE RULES REVISION OF A CLASSIFIED ROW. Bump when the classifier's rules
 *  change in a way stored rows must follow; rows behind it are re-attributed
 *  by `misconceptionRulesBackfill`. 2026-10-13: hung material requires the
 *  engine reply to take it; an endgame king walk is not "king in the centre".
 *  2026-10-20: a slip whose piece left the guard of a fork square (or of a
 *  piece) is filed as their threat, not "fewer squares" (David's 13.Bc3).
 *  2026-10-22: a missed shot is filed under its motif's own row (WO-MOTIFS-01). */
export const MISCONCEPTION_RULES_REV = '2026-10-22-motif-rows';

/** Bump when analysed games must be re-read for the POSITIVE half
 *  (2026-10-20: re-read from the one-price annotations, `RECORD_PRICE_REV`) (the heat
 *  map's green). 2026-10-13: green is recorded on analysis, not only review.
 *  2026-10-14: one seat resolver. 2026-10-18: the board now asks five skills
 *  that could only be failed (castle in time, the free-looking pawn, the even
 *  trade, which pawn takes, the sacrifice by the king) — each analysed game's
 *  own rows are replaced so the old games answer them too. 2026-10-20b: four
 *  more that could only be failed (the queen's poisoned pawn, the pawn that
 *  runs alone, the trade with the material unbalanced, still in the book). */
export const POSITIVE_HALF_REV = '2026-10-22-motif-rows';
// 2026-10-20: the rev fingerprint gate (recordRevs.gate.test.ts) found the
// recorded held-skill rows of a real game had changed since 10-19 with this rev
// unmoved, so devices kept the old green rows; then the one-price re-price moved
// them again. ONE bump covers both. From here the gate holds it.

/** Bump when analysed games must be re-read for the INCOMING half of each
 *  motif — the opponent's fork, pin, skewer, discovery, mate threat or trap
 *  at the student's turn, held or broken (`threatAnswerEvidence`). Separate
 *  from `POSITIVE_HALF_REV` so a threat-rule change re-reads only this. */
export const THREAT_HALF_REV = '2026-10-22-motif-rows';

/** Bump when analysed games' stored annotations must be RE-PRICED (L6,
 *  2026-10-20): a move priced as the read before minus a separate read after
 *  is re-priced inside ONE search (`annotationReprice`) before the record is
 *  re-read from it. The positive and threat halves were bumped with it, so the
 *  evidence those halves record is rebuilt from the new prices. */
export const RECORD_PRICE_REV = '2026-10-20-one-price';
