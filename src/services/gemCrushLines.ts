/**
 * gemCrushLines — the opening's curated gems on the board: the Play rung's live
 * punish callout (`findLivePunishment`, called only from the opening pages) and
 * the early strength signal (`gemMoveSignal`, measurement, never teaching).
 *
 * 🔒 GEMS ARE TAUGHT ON THE OPENING PAGES ONLY (David 2026-10-29: "it's not
 * good to teach them in learn because that's free and I want a reason for ppl
 * to buy the openings" → "Remove"). Learn with Coach (its chat trap menu
 * included) and Review with Coach never teach a gem, and the coach never walks
 * into one on purpose. Gate: `gemCrushLines.computed.test.ts`.
 *
 * G0/G3: nothing invented. The gem (`punish-gems.json`, and the calculator's
 * club gems) is engine-verified; we only look it up by the exact position and
 * compute the arrow squares via chess.js.
 */
import { openSentence } from '../utils/openSentence';
import { settledBalance } from './material';
import { computeExchangeLedger, proofCut } from './exchangeLedger';
import { Chess } from 'chess.js';
import {
  getPunishGemsForOpening,
  getAllPunishGems,
  gemId,
  gemNarrationFor,
  type PunishGem,
  isTeachableSlipGem,
  isWeaponGem,
} from '../data/lessons/punishGems';
import type { NarrationArrow } from '../types/walkthroughTree';
import { positionOf } from '../utils/samePosition';
import { clubGemBoards, clubGemForIndex } from './clubGems';

/** POSITION KEY — placement + turn + castling + en passant. The move counters
 *  are dropped deliberately: two move orders reaching the same board differ in
 *  halfmove clock, and that difference says nothing about whether the gem's
 *  refutation is available. */
function positionKey(fen: string): string {
  return positionOf(fen);
}

/** Gems indexed by the POSITION their spine reaches, so a gem fires whenever
 *  the student stands in that position — not only when they arrived by the
 *  exact move order the gem happens to store (the Alekhine's `d4 d6 c4 Nb6`
 *  and `c4 Nb6 d4 d6` are the same board).
 *
 *  Built once, lazily. A position can host more than one gem (different
 *  inaccuracies from the same board), so the value is a list.
 *
 *  This CANNOT create a false positive: the key is the position, and the caller
 *  still verifies the inaccuracy and the punish are legal from it. */
let gemsByPosition: Map<string, PunishGem[]> | null = null;
function positionIndex(): Map<string, PunishGem[]> {
  if (gemsByPosition) return gemsByPosition;
  const index = new Map<string, PunishGem[]>();
  for (const gem of getAllPunishGems()) {
    // Every KNOWN MISTAKE is indexed; the callout words a trap by the trap
    // bar itself (F04).
    if (!isTeachableSlipGem(gem)) continue;
    const chess = new Chess();
    let ok = true;
    for (const san of gem.lineMoves.split(/\s+/).filter(Boolean)) {
      try {
        if (!chess.move(san)) { ok = false; break; }
      } catch {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const key = positionKey(chess.fen());
    const bucket = index.get(key);
    if (bucket) bucket.push(gem);
    else index.set(key, [gem]);
  }
  gemsByPosition = index;
  return index;
}

/** The calculator's gems by board (`clubGems`, traps + known mistakes), read
 *  once; until they land a lookup sees the hand-written gems alone. */
let computedByBoard: Map<string, PunishGem[]> | null = null;
let computedJob: Promise<void> | null = null;
/** Start reading the calculator's gems — a surface that looks them up warms
 *  them on mount, so its first lookup does not miss. */
export function warmCalculatorGems(): void {
  if (computedJob) return;
  computedJob = clubGemBoards().then((boards) => {
    if (!boards) { computedJob = null; return; }
    const byBoard = new Map<string, PunishGem[]>();
    for (const [board, list] of Object.entries(boards)) {
      const gems = list.map(clubGemForIndex).filter((g): g is PunishGem => g !== null && isTeachableSlipGem(g));
      if (gems.length > 0) byBoard.set(board, gems);
    }
    computedByBoard = byBoard;
  }).catch(() => { computedJob = null; });
}

/** The gems at the position `pathSans` stands in: the hand-written gems, then
 *  the club gems the calculator found on the same board (a hand-written gem
 *  for the same slip wins — it carries narration). */
function gemsAtBoard(pathSans: string[]): PunishGem[] {
  const hand = gemsAtPosition(pathSans);
  warmCalculatorGems();
  let key: string;
  try {
    const chess = new Chess();
    for (const san of pathSans) if (!chess.move(san)) return hand;
    key = positionKey(chess.fen());
  } catch {
    return hand;
  }
  const computed = computedByBoard?.get(key) ?? [];
  return [...hand, ...computed.filter((g) => !hand.some((h) => h.inaccuracy === g.inaccuracy))];
}

/** The gems whose spine reaches the position `pathSans` stands in. */
function gemsAtPosition(pathSans: string[]): PunishGem[] {
  try {
    const chess = new Chess();
    for (const san of pathSans) {
      if (!chess.move(san)) return [];
    }
    return positionIndex().get(positionKey(chess.fen())) ?? [];
  } catch {
    return [];
  }
}


/** A crush's payoff, READ OFF THE BOARD — never inferred from `tier`. Replays
 *  the curated punish line to its quiet end and measures the punisher's real
 *  material swing + checks for mate. G0/G3: the FACT is computed in code; the
 *  LLM only phrases it. */
/** Pure per gem, and looked up on every move — computed once. */
const payoffMemo = new Map<string, { payoff: string; winsMaterial: boolean }>();

function computePayoff(
  staticFen: string,
  inaccuracy: string,
  punishSeq: string[],
  punisher: 'w' | 'b',
  tier: 'confirmed' | 'positional',
): { payoff: string; winsMaterial: boolean } {
  const key = `${staticFen}|${inaccuracy}|${punishSeq.join(' ')}|${punisher}|${tier}`;
  const hit = payoffMemo.get(key);
  if (hit) return hit;
  const out = computePayoffUncached(staticFen, inaccuracy, punishSeq, punisher, tier);
  payoffMemo.set(key, out);
  return out;
}

function computePayoffUncached(
  staticFen: string,
  inaccuracy: string,
  punishSeq: string[],
  punisher: 'w' | 'b',
  tier: 'confirmed' | 'positional',
): { payoff: string; winsMaterial: boolean } {
  // WHAT THE LINE WINS is the ONE ledger rule (WO-OUTCOME-01): the settled net
  // where the playout ends, counted FROM THE START of the line — the absolute
  // end balance this replaces forgot a position that was already unbalanced.
  const proof = proofCut(staticFen, [inaccuracy, ...punishSeq], punisher);
  const mated = !!proof?.mate;
  const gain = proof && !proof.mate && proof.ledger ? proof.ledger.netPawns : 0;
  if (mated) return { payoff: 'with a mating attack', winsMaterial: false };
  if (gain >= 5) return { payoff: 'winning decisive material', winsMaterial: true };
  // Name what was actually won, off the capture ledger — never inferred from
  // the point total. "gain === 2 → the exchange" called two pawns a rook for a
  // minor (Caro-Kann …dxe4 f3 exf3: prod review 2026-09-23). The exchange is a
  // rook won for a minor piece, and nothing else.
  const ledger = computeExchangeLedger(staticFen, [inaccuracy, ...punishSeq], punisher);
  const took = (p: string): number => ledger ? ledger.studentWon.filter((x) => x === p).length : 0;
  const gave = (p: string): number => ledger ? ledger.opponentWon.filter((x) => x === p).length : 0;
  const pawnsOnly = !!ledger && ledger.studentWon.every((x) => x === 'p');
  if (gain >= 3 && pawnsOnly) return { payoff: PAWN_HAUL[gain] ?? 'winning several pawns', winsMaterial: true };
  if (gain >= 3) return { payoff: 'winning a piece', winsMaterial: true };
  if (gain === 2 && took('r') > gave('r') && gave('n') + gave('b') > took('n') + took('b')) {
    return { payoff: 'winning the exchange', winsMaterial: true };
  }
  if (gain === 2) return { payoff: 'winning two pawns', winsMaterial: true };
  if (gain === 1) return { payoff: 'winning a pawn', winsMaterial: true };
  if (gain <= -1) return { payoff: 'sacrificing material for a winning initiative', winsMaterial: false };
  return {
    payoff: tier === 'confirmed' ? 'with a winning position' : 'with a clearly better position',
    winsMaterial: false,
  };
}

/** A material count in words — piece sense, never an eval. */
const PAWN_HAUL: Record<number, string> = { 3: 'winning three pawns', 4: 'winning four pawns' };

function sideWord(turn: 'w' | 'b'): 'white' | 'black' {
  return turn === 'w' ? 'white' : 'black';
}

function cap(s: string): string {
  return openSentence(s);
}

function cleanSan(san: string): string {
  return san.replace(/[!?]+$/g, '');
}

let gemsAfterSlip: Map<string, PunishGem[]> | null = null;
let warming = false;
/** Build both gem indexes a few gems at a time, yielding between chunks, so no
 *  single task holds the main thread (the backfill schedule's shape). */
export function warmGemIndexes(): void {
  if (warming || (gemsByPosition && gemsAfterSlip)) return;
  warming = true;
  const gems = getAllPunishGems().filter(isTeachableSlipGem);
  const byPos = new Map<string, PunishGem[]>();
  const after = new Map<string, PunishGem[]>();
  let i = 0;
  const step = (): void => {
    const end = Math.min(gems.length, i + 8);
    for (; i < end; i += 1) {
      const gem = gems[i];
      const chess = new Chess();
      try {
        for (const san of gem.lineMoves.split(/\s+/).filter(Boolean)) chess.move(san);
        const k1 = positionKey(chess.fen());
        byPos.set(k1, [...(byPos.get(k1) ?? []), gem]);
        chess.move(gem.inaccuracy);
        const k2 = positionKey(chess.fen());
        after.set(k2, [...(after.get(k2) ?? []), gem]);
      } catch { /* an unreplayable gem indexes nowhere */ }
    }
    if (i < gems.length) { setTimeout(step, 0); return; }
    if (!gemsByPosition) gemsByPosition = byPos;
    gemsAfterSlip = after;
    warming = false;
  };
  setTimeout(step, 0);
}
export type GemMoveSignal = 'walked-into' | 'punished' | 'missed-punish';

/** WHAT A MOVE SAID ABOUT THE PLAYER, IN GEM TERMS — the strongest early
 *  strength signal (CLAUDE.md: "a gem blunder … a mistake with a known
 *  population attached"). Gems are mined at amateur rating bands, so:
 *   • playing a gem's inaccuracy = walking into a known trap;
 *   • facing one and playing its punish = finding the refutation;
 *   • facing one and playing anything else = missing it.
 *  Null when the board holds no gem either way. */
export function gemMoveSignal(fenBefore: string, san: string): GemMoveSignal | null {
  // NEVER BUILD ON THE MOVE PATH: both indexes replay ~400 gem lines (1.2 s on
  // a desktop, several on a phone). Until the chunked warm-up has finished the
  // answer is "no signal", which only means this move nudges nothing.
  if (!gemsByPosition || !gemsAfterSlip) { warmGemIndexes(); return null; }
  const bare = (x: string): string => x.replace(/[+#!?]+$/, '');
  const key = positionKey(fenBefore);
  for (const g of gemsByPosition.get(key) ?? []) if (bare(g.inaccuracy) === bare(san)) return 'walked-into';
  const faced = gemsAfterSlip.get(key) ?? [];
  if (faced.length === 0) return null;
  return faced.some((g) => bare(g.punishSeq[0] ?? g.punish) === bare(san)) ? 'punished' : 'missed-punish';
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
  // Exact move order first, then the POSITION the opponent just played into:
  // here the path INCLUDES their slip, so the gem's spine is everything before
  // it and the inaccuracy must be the move they actually just made.
  const gem = pool
    .filter(isTeachableSlipGem)
    .find((g) => `${g.lineMoves.trim()} ${g.inaccuracy}`.trim() === key)
    ?? gemsAtBoard(pathSans.slice(0, -1)).find(
      (g) => g.inaccuracy === pathSans[pathSans.length - 1]
        && (!openingId || g.openingId === openingId || g.computed === true),
    );
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
  const { payoff } = computePayoff(curFen, gem.punish, continuation, punisher, gem.tier);
  const us = cap(sideWord(punisher));
  // Rotate the callout deterministically by gem so it varies without randomness.
  // THE TWO SIDES OF ONE TRAP (David 2026-09-30: "One teaches how to take
  // advantage of a mistake, the other prevents a mistake from happening").
  // Their side names the trap, then asks for the punish (withheld).
  // A TRAP only when it clears the bar (F04); a small edge is a known mistake.
  // Never the club share as a number (reason, not stats — V-rules); the gem
  // being mined at all is what makes it known.
  // "This move", never its square: the punish usually lands on it (…f3 exf3),
  // and a square named here is the answer given away.
  const trap = isWeaponGem(gem);
  const lore = trap ? "That's a known trap at club level. " : "That's a known mistake at club level. ";
  const callout = `${lore}${CALLOUTS[gem.inaccuracy.length % CALLOUTS.length]}`;

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
  // NO SUPPRESSION and NO CAP here (David 2026-08-01: "dont worry about caping
  // narrations. we removed all caps for full narration setting"). Length is the
  // VERBOSITY system's job — `applyBriefVoiceCap` clips the spoken line on
  // Brief, Full is uncapped, Silent never speaks. A second private cap in this
  // file would silently override the setting the student chose.
  const spokenTail = ((): string[] => {
    try {
      const c = new Chess(curFen);
      c.move(gem.punish);
      const played: string[] = [];
      const gains: number[] = [];
      for (const san of continuation) {
        const m = c.move(san);
        if (!m) break;
        played.push(cleanSan(san));
        const b = settledBalance(c.fen(), { to: m.to, captured: m.captured ?? null });
        gains.push(punisher === 'w' ? b : -b);
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

  // SPEAK THE GEM'S OWN NOTES when it has them (David 2026-08-01: "if there are
  // notes associated with the gem i want those narrations spoken"). Every
  // surfaceable gem carries HAND-AUTHORED narration keyed per ply; the punish
  // ply's line is the one written for exactly this moment. Authored prose leads,
  // then the computed line + payoff — so the student hears the teaching, not
  // just the moves. Falls through silently when a gem has no note for that ply.
  const authored = ((): string => {
    try {
      const narr = gemNarrationFor(gemId(gem));
      if (!narr) return '';
      const punishPly = gem.lineMoves.split(/\s+/).filter(Boolean).length + 1;
      const line = (narr.watch ?? [])[punishPly] ?? '';
      return line.trim();
    } catch {
      return '';
    }
  })();
  // DON'T NAME THE PUNISH TWICE. The authored note almost always opens on the
  // move it is teaching ("exf3 — take it. You stay a pawn to the good…"), so
  // bolting the computed "Black crushes with exf3" on the front said the same
  // SAN twice in one breath. When the note already names it, the note IS the
  // announcement and the computed half only has to carry the line and the
  // payoff. Without a note, the computed announcement still does that job.
  const punishSan = cleanSan(gem.punish);
  const noteNamesPunish = authored.length > 0
    && new RegExp(`(^|[^A-Za-z0-9])${punishSan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9]|$)`).test(authored);
  const buildReveal = (): string => {
    const verb = trap ? 'crushes with' : 'punishes it with';
    if (!authored) return `${us} ${verb} ${punishSan}${tail}, ${payoff}.`;
    if (!noteNamesPunish) return `${authored} ${us} ${verb} ${punishSan}${tail}, ${payoff}.`;
    // The note said the move; continue its sentence rather than restart it.
    const line = spokenTail.length > 0 ? `The line runs ${spokenTail.join(', ')} — ${payoff}.` : `${cap(payoff)}.`;
    return `${authored} ${line}`;
  };

  return {
    gemId: gemId(gem),
    inaccuracy: gem.inaccuracy,
    punish: gem.punish,
    studentSide: sideWord(punisher),
    payoff,
    callout,
    revealArrows: [{ from: puFrom, to: puTo, color: 'green' }],
    reveal: buildReveal(),
    continuation,
    punishSeq: gem.punishSeq ?? [gem.punish],
  };
}

/** Test seam: forget the calculator's gems. */
export function __resetCalculatorGems(): void {
  computedByBoard = null;
  computedJob = null;
}
