/**
 * gemFinder — DISCOVER punish-gems on the line a lesson is about to teach, at
 * runtime, and bake them into the walkthrough (David 2026-08-24: "the gem finder
 * should run before the walkthrough even starts to ID what gem lines there are…
 * shouldn't it calculate a new teaching walkthrough?").
 *
 * The pre-mined corpus (`punish-gems.json`) only covers positions someone mined
 * offline. The finder closes that gap: at each position the lesson walks where
 * the OPPONENT is to move, it asks the amateur explorer what real humans play
 * (the slips), then engine-verifies each candidate has a decisive punish — the
 * SAME bar as the offline miner (WEAPON_CP=100 / EDGE_CP=50 / JUMP_CP=50 cp,
 * quiet-terminus material shown). What survives becomes a baked detour with
 * board-composed narration (finder gems have no hand-authored prose — G3).
 *
 * Explorer-gated (a trap nobody plays is not taught) + engine-verified (a punish
 * the board doesn't pay is dropped). Cached per opening so it calculates once.
 *
 * G0/G3: every move is the explorer's (human) or the engine's, replayed through
 * chess.js; every word is composed from the board. The model decides nothing.
 */
import { Chess } from 'chess.js';
import { lookupAmateurPlay } from './amateurPlayLookup';
import { stockfishEngine } from './stockfishEngine';
import { narrateContinuationMove } from './continuationMoveNarration';
import { db } from '../db/schema';
import { logAppAudit } from './appAuditor';
import type {
  BakedGemLine,
  BakedGemStep,
  WalkthroughTree,
  WalkthroughTreeNode,
} from '../types/walkthroughTree';

const FINDER_REV = '2026-08-24-v2-gentle';
// Centipawn bars — identical to the offline miner (studentEval is white-POV
// engine cp flipped to the student's side).
const WEAPON_CP = 100; // ≥ +1.0 = confirmed
const EDGE_CP = 50; //   +0.5..+1.0 = positional; below → dropped
const JUMP_CP = 50; //   the slip must COST ≥ +0.5 vs not slipping
const FREQ_FLOOR = 0.03; // a candidate slip humans play ≥ 3% of the time
const MIN_GAMES_AT_POS = 20; // the position needs a real human sample
// 🔒 GENTLE BY CONTRACT (David 2026-08-24: "app and computer are both super
// slow now"). The finder shares the SINGLE multi-threaded Stockfish worker with
// the lesson + the UI; depth-16 analysis over dozens of positions saturated
// every core and starved the TTS (a stuttering voice sounded "accented"). So:
// TIME-boxed shallow analysis (never depth-bounded, which can run long), the
// engine's own PV as the punish line (no second multi-second play-out), hard
// caps on positions + candidates, and a yield between every engine call so the
// UI and voice always get CPU back.
const ANALYZE_DEPTH = 12;
const ANALYZE_BUDGET_MS = 350; // per analysis — a hard time box, not depth
const MAX_CANDIDATES = 2; // top-N human moves to test per position
const MAX_POSITIONS = 12; // scan the first N opponent positions (spine-first)
// Engine-only fallback (David 2026-08-27 "do 2"): when the explorer is SILENT at
// a position we still teach a gem — but only from the engine's own refutation,
// held to the STRICTER confirmed tier (≥ +1.0), never the +0.5 positional edge,
// since there's no human-frequency evidence that the slip is natural. A losing
// move that gets decisively punished is always worth knowing; a merely-inferior
// one without a human sample is not.
const MAX_ENGINE_ONLY_POSITIONS = 6; // cap the speculative (no-explorer) scan
const ENGINE_SLIP_DROP = 60; // an opponent top-fan move ≥ 0.6 worse than best = a slip
const PV_PLIES = 8; // punish continuation taken from the engine PV
const YIELD_MS = 250; // hand the CPU back between engine calls
const DEFAULT_BUDGET_MS = 15_000; // overall wall-clock ceiling per opening
const START_DELAY_MS = 4_000; // let the lesson settle before we touch the engine

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}
function cleanSan(san: string): string {
  return san.replace(/[!?]+$/g, '');
}
function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Compose a board-true detour for a discovered [slip, ...punish] line. */
function buildComputedDetour(
  baseFen: string,
  slipSan: string,
  punishSeq: string[],
  gemId: string,
): BakedGemLine | null {
  let board: Chess;
  try {
    board = new Chess(baseFen);
  } catch {
    return null;
  }
  const seq = [slipSan, ...punishSeq];
  const steps: BakedGemStep[] = [];
  for (let i = 0; i < seq.length; i += 1) {
    const fenBefore = board.fen();
    let mv;
    try {
      mv = board.move(seq[i]);
    } catch {
      break;
    }
    if (!mv) break;
    const c = narrateContinuationMove(fenBefore, board.fen(), mv.san, mv.from, mv.to);
    const idea = i === 0
      ? `${cleanSan(mv.san)} looks natural, but it's a mistake here. ${c.say}`.trim()
      : c.say;
    steps.push({ san: mv.san, fen: board.fen(), idea, shortIdea: c.short, arrows: c.arrows });
  }
  if (steps.length === 0) return null;
  const punish = punishSeq[0] ?? '';
  return {
    gemId,
    kind: 'weapon',
    title: punish ? `Punish ${cleanSan(slipSan)} with ${cleanSan(punish)}` : `Punish ${cleanSan(slipSan)}`,
    inaccuracy: cleanSan(slipSan),
    baseFen,
    steps,
  };
}

/**
 * Verify one candidate slip at `baseFen` (opponent to move). Returns a baked
 * detour when the engine confirms a decisive, material-showing punish; else null.
 */
async function verifySlip(
  baseFen: string,
  slipSan: string,
  studentIsWhite: boolean,
  minEdge: number = EDGE_CP,
): Promise<BakedGemLine | null> {
  // Baseline: how the student stands BEFORE the slip. If they're already
  // winning, there's no trap worth teaching here. Time-boxed (never depth-
  // bounded, which can run the worker long and starve the UI/voice).
  let base;
  try {
    base = await stockfishEngine.analyzeWithBudget(baseFen, ANALYZE_DEPTH, ANALYZE_BUDGET_MS);
  } catch {
    return null;
  }
  const E0 = studentIsWhite ? base.evaluation : -base.evaluation;
  if (E0 >= WEAPON_CP) return null;

  let board: Chess;
  try {
    board = new Chess(baseFen);
  } catch {
    return null;
  }
  let slip;
  try {
    slip = board.move(slipSan);
  } catch {
    return null;
  }
  if (!slip) return null;
  const afterSlipFen = board.fen(); // student to move — the punish is theirs

  let after;
  try {
    after = await stockfishEngine.analyzeWithBudget(afterSlipFen, ANALYZE_DEPTH, ANALYZE_BUDGET_MS);
  } catch {
    return null;
  }
  const E1 = studentIsWhite ? after.evaluation : -after.evaluation;
  // Must reach a real edge AND the slip must have COST that edge.
  if (E1 < minEdge || E1 - E0 < JUMP_CP) return null;

  // The punish line is the engine's own PV from after the slip — no second
  // multi-second play-out. Replay it UCI→SAN and keep the first few plies.
  const pv = after.topLines?.[0]?.moves ?? (after.bestMove ? [after.bestMove] : []);
  if (pv.length === 0) return null;
  const b2 = new Chess(afterSlipFen);
  const punishSeq: string[] = [];
  for (const uci of pv.slice(0, PV_PLIES)) {
    if (typeof uci !== 'string' || uci.length < 4) break;
    let mv;
    try {
      mv = b2.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        ...(uci.length > 4 ? { promotion: uci[4] } : {}),
      });
    } catch {
      break;
    }
    if (!mv) break;
    punishSeq.push(mv.san);
  }
  if (punishSeq.length === 0) return null;

  const gemId = `found:${positionKey(baseFen)}:${cleanSan(slipSan)}`;
  return buildComputedDetour(baseFen, slipSan, punishSeq, gemId);
}

/** A position the lesson walks + whose turn it is. */
export interface WalkPosition {
  fen: string;
  /** True when the OPPONENT of the taught side is to move (a slip is theirs). */
  opponentToMove: boolean;
}

/**
 * Run the finder over `positions`, returning discovered detours keyed by
 * position. Weapons only (opponent-to-move slips) in v1. Bounded by `budgetMs`.
 */
export async function findGemsForLine(
  positions: WalkPosition[],
  studentSide: 'white' | 'black',
  budgetMs = DEFAULT_BUDGET_MS,
): Promise<Map<string, BakedGemLine[]>> {
  const studentIsWhite = studentSide === 'white';
  const out = new Map<string, BakedGemLine[]>();
  const seen = new Set<string>();
  const deadline = Date.now() + budgetMs;
  let scanned = 0;
  let engineOnlyScanned = 0;
  for (const pos of positions) {
    if (Date.now() > deadline || scanned >= MAX_POSITIONS) break;
    if (!pos.opponentToMove) continue;
    const key = positionKey(pos.fen);
    if (seen.has(key)) continue;
    seen.add(key);
    let amateur;
    try {
      amateur = await lookupAmateurPlay(pos.fen);
    } catch {
      amateur = null;
    }
    const total = amateur?.totalGames ?? 0;
    const explorerHasData = !!amateur && amateur.source !== 'none' && amateur.moves.length > 0 && total >= MIN_GAMES_AT_POS;

    // Candidate slips + the edge floor they must clear. Explorer-backed: the
    // human moves at the frequency floor, held to the usual +0.5 tier. Engine-
    // only fallback: the engine's top-fan inaccuracies, held to the stricter
    // +1.0 confirmed tier (no frequency evidence → decisive punish or nothing).
    let candidateSans: string[];
    let minEdge: number;
    if (explorerHasData) {
      candidateSans = amateur.moves
        .filter((m) => m.games / Math.max(1, total) >= FREQ_FLOOR)
        .slice(0, MAX_CANDIDATES)
        .map((m) => m.san);
      minEdge = EDGE_CP;
      scanned += 1;
    } else {
      if (engineOnlyScanned >= MAX_ENGINE_ONLY_POSITIONS) continue;
      candidateSans = (await engineOnlySlips(pos.fen)).slice(0, MAX_CANDIDATES);
      if (candidateSans.length === 0) continue;
      minEdge = WEAPON_CP;
      engineOnlyScanned += 1;
      scanned += 1;
    }

    const detours: BakedGemLine[] = [];
    for (const cand of candidateSans) {
      if (Date.now() > deadline) break;
      await sleep(YIELD_MS); // hand the CPU back to the UI/voice before each engine burst
      const d = await verifySlip(pos.fen, cand, studentIsWhite, minEdge);
      if (d) detours.push(d);
    }
    if (detours.length > 0) out.set(key, detours);
  }
  return out;
}

/** Engine-only candidate slips at a position (opponent to move): the top-fan
 *  alternatives that are meaningfully WORSE for the opponent than their best.
 *  Used only when the explorer has no human sample. Pure engine (G0/G3). */
async function engineOnlySlips(fen: string): Promise<string[]> {
  let a;
  try { a = await stockfishEngine.analyzeWithBudget(fen, ANALYZE_DEPTH, ANALYZE_BUDGET_MS); } catch { return []; }
  const lines = a.topLines ?? [];
  if (lines.length < 2) return []; // no alternative to the best move → nothing to test
  const oppSign = fen.split(' ')[1] === 'w' ? 1 : -1; // opponent-POV = white-POV × sign
  const bestOpp = (lines[0]?.evaluation ?? 0) * oppSign;
  const out: string[] = [];
  for (const ln of lines.slice(1)) {
    const oppEval = (ln.evaluation ?? 0) * oppSign;
    if (bestOpp - oppEval < ENGINE_SLIP_DROP) continue; // not a real inaccuracy
    const uci = ln.moves?.[0];
    if (typeof uci !== 'string' || uci.length < 4) continue;
    try {
      const b = new Chess(fen);
      const mv = b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), ...(uci.length > 4 ? { promotion: uci[4] } : {}) });
      if (mv) out.push(mv.san);
    } catch { /* skip an unreplayable line */ }
  }
  return out;
}

/** Serialize/deserialize the found-gems map for the Dexie meta cache. */
function serialize(map: Map<string, BakedGemLine[]>): string {
  return JSON.stringify([...map.entries()]);
}
function deserialize(value: string): Map<string, BakedGemLine[]> {
  try {
    return new Map(JSON.parse(value) as [string, BakedGemLine[]][]);
  } catch {
    return new Map();
  }
}

/**
 * Cached finder: calculates once per opening (keyed by name + FINDER_REV), then
 * returns the cached map instantly. David 2026-08-24: "calculate once, cache it".
 */
export async function findGemsForOpening(
  openingName: string,
  positions: WalkPosition[],
  studentSide: 'white' | 'black',
  budgetMs = DEFAULT_BUDGET_MS,
): Promise<Map<string, BakedGemLine[]>> {
  const cacheKey = `foundGems:${normalizeKey(openingName)}:${FINDER_REV}`;
  try {
    const cached = await db.meta.get(cacheKey);
    if (cached?.value && typeof cached.value === 'string') {
      return deserialize(cached.value);
    }
  } catch {
    /* cache read is a bonus */
  }
  // Cache MISS → real engine work ahead. Let the lesson's opening moves + their
  // own analysis settle first, so the finder never competes during the busiest
  // few seconds (David 2026-08-24: "app and computer are both super slow now").
  await sleep(START_DELAY_MS);
  const found = await findGemsForLine(positions, studentSide, budgetMs);
  try {
    await db.meta.put({ key: cacheKey, value: serialize(found) });
  } catch {
    /* cache write is a bonus */
  }
  return found;
}

/** Walk a tree collecting each node's FEN + whose move it is (for the finder). */
export function collectWalkPositions(
  tree: WalkthroughTree,
  studentSide: 'white' | 'black',
): WalkPosition[] {
  const out: WalkPosition[] = [];
  const seen = new Set<string>();
  const walk = (node: WalkthroughTreeNode, chess: Chess): void => {
    // chess is the position AFTER this node's move already applied by the caller.
    if (node.san) {
      const fen = chess.fen();
      const key = positionKey(fen);
      if (!seen.has(key)) {
        seen.add(key);
        const sideToMove = chess.turn() === 'w' ? 'white' : 'black';
        out.push({ fen, opponentToMove: sideToMove !== studentSide });
      }
    }
    for (const ch of node.children) {
      const next = new Chess(chess.fen());
      if (ch.node.san) {
        try {
          if (!next.move(ch.node.san)) continue;
        } catch {
          continue;
        }
      }
      walk(ch.node, next);
    }
  };
  walk(tree.root, new Chess());
  return out;
}

/** Attach found detours onto the tree's nodes (dedupe by gemId, keep existing). */
export function bakeFoundGemsIntoTree(
  tree: WalkthroughTree | null | undefined,
  found: Map<string, BakedGemLine[]>,
): number {
  if (!tree?.root || found.size === 0) return 0;
  const spliced = new Set<string>();
  const seed = (n: WalkthroughTreeNode): void => {
    for (const g of n.gems ?? []) spliced.add(g.gemId);
    for (const ch of n.children) seed(ch.node);
  };
  seed(tree.root);
  let attached = 0;
  const walk = (node: WalkthroughTreeNode, chess: Chess): void => {
    if (node.san) {
      const detours = found.get(positionKey(chess.fen())) ?? [];
      const fresh = detours.filter((d) => !spliced.has(d.gemId));
      if (fresh.length > 0) {
        for (const d of fresh) spliced.add(d.gemId);
        node.gems = [...(node.gems ?? []), ...fresh];
        attached += fresh.length;
      }
    }
    for (const ch of node.children) {
      const next = new Chess(chess.fen());
      if (ch.node.san) {
        try {
          if (!next.move(ch.node.san)) continue;
        } catch {
          continue;
        }
      }
      walk(ch.node, next);
    }
  };
  walk(tree.root, new Chess());
  return attached;
}

/**
 * Top-level: find + bake discovered gems into a lesson tree (in place). Cached
 * per opening. Best-effort — returns the count attached, 0 on any failure, never
 * throws (gems are a bonus, never a blocker).
 */
export async function findAndBakeGems(
  tree: WalkthroughTree | null | undefined,
  openingName: string,
  studentSide: 'white' | 'black',
  budgetMs = DEFAULT_BUDGET_MS,
): Promise<number> {
  if (!tree?.root) return 0;
  try {
    const positions = collectWalkPositions(tree, studentSide);
    const found = await findGemsForOpening(openingName, positions, studentSide, budgetMs);
    const attached = bakeFoundGemsIntoTree(tree, found);
    if (attached > 0) {
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'gemFinder.findAndBakeGems',
        summary: `finder discovered + baked ${attached} gem(s) into "${openingName}"`,
      });
    }
    return attached;
  } catch {
    return 0;
  }
}
