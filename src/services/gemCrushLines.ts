/**
 * gemCrushLines — surface a curated punish-gem as an ARROW-traced crush line, in
 * BOTH the Learn Watch walkthrough AND the post-game review.
 *
 * David 2026-07-24: "I want learn to play as close to his videos as possible …
 * how to crush if they don't [refute]. The gem lines would be extremely
 * beneficial here!!!!" — then: "Add the gem calculator into review with coach as
 * well! I want it calculating and showing crush lines during review!!! And during
 * learn!!!"
 *
 * THE LOCKED MECHANISM: arrows show the lines, the board NEVER moves. Naroditsky
 * can't shove the pieces around a live position — he traces the crush with arrows
 * and talks through it. So this returns arrows on the CURRENT static position; the
 * caller draws them without advancing the board.
 *
 * THE TWO REGISTERS (2026-07-19 law — do not blur):
 *   - Learn / Watch  → present-tense, a DEMO line: "If White tries f3 here —
 *     natural, but a mistake — Black crushes with exf3." (`buildWatchGemSay`)
 *   - Review         → retrospective, the USER'S OWN game: "Your opponent played
 *     f3 — a known mistake; the crush was exf3." (`buildReviewGemSay`)
 * The CALCULATION (`computeGemCrush`) is register-neutral and shared.
 *
 * G0/G3: nothing invented. The gem (`punish-gems.json`) is hand-curated and
 * engine-verified; we only look it up by the exact position and compute the two
 * arrow squares via chess.js. Only surfaceable (weapon-tier + narrated) gems
 * qualify.
 */
import { Chess } from 'chess.js';
import {
  getPunishGemsForOpening,
  getAllPunishGems,
  isSurfaceableGem,
  gemId,
} from '../data/lessons/punishGems';
import type { NarrationArrow } from '../types/walkthroughTree';

/** Register-neutral crush facts + arrows. Both surfaces build their voicing from
 *  this; neither invents chess. */
export interface GemCrush {
  gemId: string;
  /** The opponent's natural-but-losing move (SAN). */
  inaccuracy: string;
  /** Our crushing reply (SAN). */
  punish: string;
  /** [ inaccuracy (red warning), punish (green) ] — drawn on the CURRENT static
   *  position; the board is never advanced. Both origins are real occupied
   *  squares (the punisher sits on its origin before the inaccuracy is played). */
  arrows: NarrationArrow[];
  /** Side that would play the inaccuracy (the opponent of the taught side). */
  opponentSide: 'white' | 'black';
  /** The taught side — the one that plays the punish. */
  studentSide: 'white' | 'black';
  /** 'confirmed' = engine ≥ +1.0; 'positional' = +0.5..+1.0. NOT a material
   *  claim — see `payoff`. */
  tier: 'confirmed' | 'positional';
  /** FEN of the position the arrows are drawn on (after the gem's spine). */
  staticFen: string;
  /** BOARD-COMPUTED payoff clause (participial), never a tier proxy — the FACT
   *  handed to the LLM warmer / spoken. Replays the punish line and reads the
   *  real material swing off chess.js. David 2026-07-24: the "win material"
   *  over-claim is a PACKAGING error — the payoff is a board fact, computed here.
   *  ("winning a pawn" / "winning the exchange" / "winning a piece" / "with a
   *  clearly better position" / "with a mating attack" / "sacrificing material
   *  for a winning initiative".) */
  payoff: string;
  /** True iff the punisher is genuinely ahead in material at the quiet end of
   *  the punish line, so callers can gate a "wins material" phrasing honestly. */
  winsMaterial: boolean;
}

const PIECE_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Net material (white − black, pawns) read straight off a FEN board. */
function boardMaterial(fen: string): number {
  let net = 0;
  for (const ch of fen.split(' ')[0]) {
    const v = PIECE_VAL[ch.toLowerCase()];
    if (v === undefined) continue;
    net += ch === ch.toUpperCase() ? v : -v;
  }
  return net;
}

/** A crush's payoff, READ OFF THE BOARD — never inferred from `tier`. Replays
 *  the curated punish line to its quiet end and measures the punisher's real
 *  material swing + checks for mate. G0/G3: the FACT is computed in code; the
 *  LLM only phrases it. */
function computePayoff(
  staticFen: string,
  inaccuracy: string,
  punishSeq: string[],
  punisher: 'w' | 'b',
  tier: 'confirmed' | 'positional',
): { payoff: string; winsMaterial: boolean } {
  let mated = false;
  let endMaterial = boardMaterial(staticFen);
  try {
    const c = new Chess(staticFen);
    c.move(inaccuracy);
    for (const s of punishSeq) {
      const m = c.move(s);
      if (!m) break;
      if (m.san.includes('#')) mated = true;
    }
    if (c.isCheckmate()) mated = true;
    endMaterial = boardMaterial(c.fen());
  } catch {
    /* keep fallback */
  }
  const gain = punisher === 'w' ? endMaterial : -endMaterial;
  if (mated) return { payoff: 'with a mating attack', winsMaterial: false };
  if (gain >= 5) return { payoff: 'winning decisive material', winsMaterial: true };
  if (gain >= 3) return { payoff: 'winning a piece', winsMaterial: true };
  if (gain === 2) return { payoff: 'winning the exchange', winsMaterial: true };
  if (gain === 1) return { payoff: 'winning a pawn', winsMaterial: true };
  if (gain <= -1) return { payoff: 'sacrificing material for a winning initiative', winsMaterial: false };
  return {
    payoff: tier === 'confirmed' ? 'with a winning position' : 'with a clearly better position',
    winsMaterial: false,
  };
}

function sideWord(turn: 'w' | 'b'): 'white' | 'black' {
  return turn === 'w' ? 'white' : 'black';
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cleanSan(san: string): string {
  return san.replace(/[!?]+$/g, '');
}

/**
 * If the SAN path sits EXACTLY on a surfaceable gem's opening spine (the position
 * where the opponent could play the natural mistake), compute the crush facts +
 * arrows. Register-neutral — the caller adds the voicing. Otherwise null.
 */
export function computeGemCrush(
  openingId: string | undefined | null,
  pathSans: string[],
): GemCrush | null {
  const key = pathSans.join(' ').trim();
  if (key.length === 0) return null;

  // Scope to the opening's gems when we know the id; otherwise scan all gems —
  // a gem's `lineMoves` is a unique full opening spine, so a position match is
  // unambiguous even without the kebab id (the walkthrough has the SAN path,
  // not the id).
  const pool = openingId ? getPunishGemsForOpening(openingId) : getAllPunishGems();
  const gem = pool
    .filter(isSurfaceableGem)
    .find((g) => g.lineMoves.trim() === key);
  if (!gem || (gem.tier !== 'confirmed' && gem.tier !== 'positional')) return null;

  // Static position = after the gem's opening spine (opponent to move).
  let staticFen: string;
  try {
    const c = new Chess();
    for (const s of gem.lineMoves.split(/\s+/).filter(Boolean)) {
      if (!c.move(s)) return null;
    }
    staticFen = c.fen();
  } catch {
    return null;
  }

  // Compute inaccuracy + punish geometry. Both arrows are drawable on the static
  // board: the punishing piece sits on its origin square before the inaccuracy.
  let inFrom: string;
  let inTo: string;
  let puFrom: string;
  let puTo: string;
  let opponent: 'w' | 'b';
  try {
    const c = new Chess(staticFen);
    opponent = c.turn();
    const im = c.move(gem.inaccuracy);
    if (!im) return null;
    inFrom = im.from;
    inTo = im.to;
    const pm = c.move(gem.punish);
    if (!pm) return null;
    puFrom = pm.from;
    puTo = pm.to;
  } catch {
    return null;
  }

  const punisher: 'w' | 'b' = opponent === 'w' ? 'b' : 'w';
  const { payoff, winsMaterial } = computePayoff(
    staticFen,
    gem.inaccuracy,
    gem.punishSeq ?? [gem.punish],
    punisher,
    gem.tier,
  );

  return {
    gemId: gemId(gem),
    inaccuracy: gem.inaccuracy,
    punish: gem.punish,
    arrows: [
      { from: inFrom, to: inTo, color: 'red' }, // the tempting mistake
      { from: puFrom, to: puTo, color: 'green' }, // our crush
    ],
    opponentSide: sideWord(opponent),
    studentSide: sideWord(punisher),
    tier: gem.tier,
    staticFen,
    payoff,
    winsMaterial,
  };
}

// ─── Learn / Watch voicing — PRESENT TENSE, a demo line ────────────────────
export interface GemAside {
  gemId: string;
  arrows: NarrationArrow[];
  say: string;
  short: string;
}

/** Present-tense crush aside for the Watch walkthrough (Naroditsky's in-game
 *  register). "If White tries f3 here — natural, but a mistake — Black crushes
 *  with exf3." */
export function buildWatchGemSay(crush: GemCrush): string {
  const opp = cap(crush.opponentSide);
  const us = cap(crush.studentSide);
  // Payoff is READ OFF THE BOARD (crush.payoff), never a tier guess.
  return `If ${opp} tries ${cleanSan(crush.inaccuracy)} here — natural-looking, but a mistake — ${us} crushes with ${cleanSan(crush.punish)}, ${crush.payoff}.`;
}

export function computeWatchGemAside(
  openingId: string | undefined | null,
  pathSans: string[],
): GemAside | null {
  const crush = computeGemCrush(openingId, pathSans);
  if (!crush) return null;
  return {
    gemId: crush.gemId,
    arrows: crush.arrows,
    say: buildWatchGemSay(crush),
    short: `${cleanSan(crush.inaccuracy)}? Punish ${cleanSan(crush.punish)}.`,
  };
}

// ─── Review voicing — RETROSPECTIVE, the user's own game ───────────────────
export interface ReviewGemOptions {
  /** Did the opponent actually play the gem inaccuracy in this game? */
  opponentPlayedInaccuracy: boolean;
  /** Did the student then actually play the crushing punish? */
  studentPlayedPunish?: boolean;
}

/**
 * Retrospective crush note for the post-game review. Framed around what actually
 * happened in the USER'S game (never the present-tense demo register):
 *   - opponent played the mistake + student found the crush → confirm it landed
 *   - opponent played the mistake + student missed it        → the missed crush
 *   - opponent avoided it                                    → they sidestepped it
 */
export function buildReviewGemSay(crush: GemCrush, opts: ReviewGemOptions): string {
  const opp = cap(crush.opponentSide);
  const inSan = cleanSan(crush.inaccuracy);
  const puSan = cleanSan(crush.punish);
  const payoff = crush.payoff; // board-computed, honest
  if (!opts.opponentPlayedInaccuracy) {
    // The opponent stayed on the main move — a teaching aside, not a live line.
    return `${opp} avoided ${inSan} here — the natural move that loses to ${puSan}, ${payoff}.`;
  }
  if (opts.studentPlayedPunish) {
    return `${opp} played ${inSan} — a known mistake — and you punished it correctly with ${puSan}, ${payoff}. Well spotted.`;
  }
  return `${opp} played ${inSan} here — a known mistake — and the crush was ${puSan}, ${payoff}.`;
}

// ─── LIVE punishment — the opponent JUST slipped, it's the student's move ────
/**
 * A curated punishment that is available RIGHT NOW, because the opponent's LAST
 * move was a gem inaccuracy (David 2026-07-24: "I want the llm to call out when a
 * punishment line is found for the user"). Detection is a pure string-compare —
 * NO engine, NO LLM — so the callout can fire the instant the move lands, before
 * the user replies. The `callout` WITHHOLDS the move (a guided find-the-move); the
 * `reveal` (Show-the-line button) names it and draws the green arrow.
 */
export interface LivePunishment {
  gemId: string;
  /** The opponent's just-played mistake (SAN), for logging — NOT spoken in the callout. */
  inaccuracy: string;
  /** Our crushing reply (SAN). Withheld from the callout; spoken in the reveal. */
  punish: string;
  /** The taught side — the one to move now, who plays the punish. */
  studentSide: 'white' | 'black';
  /** Board-computed payoff clause (honest). */
  payoff: string;
  /** Instant, move-WITHHOLDING callout ("there's a punish here — can you find it?"). */
  callout: string;
  /** Green arrow on the punish (origin occupied on the CURRENT board). */
  revealArrows: NarrationArrow[];
  /** The plies AFTER the punish, played out to a quiet position where the
   *  material is on the board. The reveal speaks the first few; a surface that
   *  can animate should play the whole thing rather than stop at the punish. */
  continuation: string[];
  /** Reveal line — names the punish + the board payoff (spoken when Show-the-line is tapped). */
  reveal: string;
  /** Full curated punish continuation (SAN), for a played-out reveal if wanted. */
  punishSeq: string[];
}

const CALLOUTS = [
  'Hold on — your opponent just slipped. There is a punish right here. Can you find it?',
  'That is a mistake. There is a strong shot for you in this position — look for it.',
  'Careful — your opponent gave you a chance. A punish is on the board. Do you see it?',
];

/**
 * If the LAST move in `pathSans` was a curated gem's inaccuracy (so the student is
 * now to move with the punish available), return the live punishment. Otherwise
 * null. Pure + instant.
 */
export function findLivePunishment(
  openingId: string | undefined | null,
  pathSans: string[],
): LivePunishment | null {
  if (pathSans.length === 0) return null;
  const key = pathSans.join(' ').trim();
  const pool = openingId ? getPunishGemsForOpening(openingId) : getAllPunishGems();
  const gem = pool
    .filter(isSurfaceableGem)
    .find((g) => `${g.lineMoves.trim()} ${g.inaccuracy}`.trim() === key);
  if (!gem || (gem.tier !== 'confirmed' && gem.tier !== 'positional')) return null;

  // Current board = after spine + inaccuracy (student to move). Draw the punish
  // from HERE — its origin piece is on the board right now.
  let curFen: string;
  let puFrom: string;
  let puTo: string;
  let punisher: 'w' | 'b';
  try {
    const c = new Chess();
    for (const s of gem.lineMoves.split(/\s+/).filter(Boolean)) if (!c.move(s)) return null;
    if (!c.move(gem.inaccuracy)) return null;
    curFen = c.fen();
    punisher = c.turn();
    const pm = c.move(gem.punish);
    if (!pm) return null;
    puFrom = pm.from;
    puTo = pm.to;
  } catch {
    return null;
  }

  const continuation = (gem.punishSeq ?? []).slice(1);
  const { payoff, winsMaterial } = computePayoff(curFen, gem.punish, continuation, punisher, gem.tier);
  const concrete = winsMaterial || /mating attack/.test(payoff);
  const us = cap(sideWord(punisher));
  // Rotate the callout deterministically by gem so it varies without randomness.
  const callout = CALLOUTS[gem.inaccuracy.length % CALLOUTS.length];

  // SHOW THE LINE LANDING, not just its first move (David 2026-08-01: "make
  // sure the gem lines are not sparse and play out fully"). The gem carries a
  // sequence played out to a quiet position where the material is actually on
  // the board — naming only the punish told the student they won something
  // they never saw arrive. Speak the next few plies so the payoff is earned.
  //
  // NO PLY CAP (David 2026-08-01: "what if it takes longer for the advantage to
  // play out?"). A fixed cut is arbitrary and re-creates the very defect this
  // fixes — a line that stops before the advantage lands. It is also redundant:
  // `extend-punish-gems` already trims every sequence to its MINIMUM terminus,
  // halting the moment the position is quiet, settled and the material is on
  // the board. So the continuation's length IS "as long as it takes", and
  // speaking all of it is correct by construction.
  // Stop where the ADVANTAGE LANDS, computed off the board — never a fixed ply
  // count. The sequence runs to a QUIET terminus (settled, nothing hanging),
  // which is right for the board but too long to recite: the deepest line is 26
  // plies, and 25 spoken SANs is not teaching. The material almost always
  // arrives earlier, and everything after it is consolidation. So walk the line,
  // find the first ply where the punisher's material reaches the value it ends
  // on, and speak to there. A line that genuinely needs 20 plies to win the
  // piece gets all 20; a line that wins it on ply 3 stops at 3.
  // ONLY recite the line when the payoff is CONCRETE — material or mate. A
  // positional gem has no landing moment, so the material rule above would walk
  // the entire grind: one gem spoke 22 SANs to demonstrate "a winning position",
  // which teaches nothing. There the punish + the payoff clause is the lesson,
  // and the board shows the rest.
  const spokenTail = !concrete ? [] : ((): string[] => {
    try {
      const c = new Chess(curFen);
      c.move(gem.punish);
      const finalGain = (): number => (punisher === 'w' ? boardMaterial(c.fen()) : -boardMaterial(c.fen()));
      const played: string[] = [];
      const gains: number[] = [];
      for (const san of continuation) {
        if (!c.move(san)) break;
        played.push(cleanSan(san));
        gains.push(finalGain());
      }
      if (played.length === 0) return [];
      const end = gains[gains.length - 1];
      const landed = gains.findIndex((g) => g >= end);
      return landed >= 0 ? played.slice(0, landed + 1) : played;
    } catch {
      return continuation.map(cleanSan);
    }
  })();
  const tail = spokenTail.length > 0 ? ` — and after ${spokenTail.join(', ')}` : '';
  return {
    gemId: gemId(gem),
    inaccuracy: gem.inaccuracy,
    punish: gem.punish,
    studentSide: sideWord(punisher),
    payoff,
    callout,
    revealArrows: [{ from: puFrom, to: puTo, color: 'green' }],
    reveal: `${us} crushes with ${cleanSan(gem.punish)}${tail}, ${payoff}.`,
    continuation,
    punishSeq: gem.punishSeq ?? [gem.punish],
  };
}
