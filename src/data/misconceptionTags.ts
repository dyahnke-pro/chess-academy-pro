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
  {
    id: 'missed-opponents-threat',
    label: "Missed the opponent's threat",
    bucket: 'tactical',
    blurb: "You ignored what the opponent was threatening and walked into it.",
    coachCue: 'The opponent had a concrete threat (capture, fork, mate-in-N) on the prior move; the played move does nothing about it and allows it to land.',
    drill: { kind: 'tactic', puzzleThemes: ['defensiveMove', 'fork', 'mate'] },
  },
  {
    id: 'overvalued-attack',
    label: 'Overvalued the attack',
    bucket: 'tactical',
    blurb: "You sacrificed or committed to an attack that wasn't really there.",
    coachCue: 'Sacrificed material or threw pieces at the king when the attack is unsound — the engine shows the defender consolidating and emerging better.',
    drill: { kind: 'tactic', puzzleThemes: ['sacrifice', 'attackingF2F7', 'kingsideAttack'] },
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

/** The enumerated list rendered into the classifier's system prompt so
 *  the LLM tags from the closed set. Plain text, no digits. */
export function buildMisconceptionTagMenu(): string {
  const lines = MISCONCEPTION_TAGS.map(
    (t) => `- ${t.id} (${t.label}): ${t.coachCue}`,
  );
  return [
    'MISCONCEPTION TAGS — choose the SINGLE best-fitting id from this list.',
    'Return "none" if the move is fine. Return "other" with a short free-text',
    'label only when a real error exists but no specific tag fits.',
    ...lines,
  ].join('\n');
}
