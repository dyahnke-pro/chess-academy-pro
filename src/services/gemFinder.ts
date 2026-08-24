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
import { playOutPunish, advantageAlreadyShown } from './punishPlayout';
import { narrateContinuationMove } from './continuationMoveNarration';
import { db } from '../db/schema';
import { logAppAudit } from './appAuditor';
import type {
  BakedGemLine,
  BakedGemStep,
  WalkthroughTree,
  WalkthroughTreeNode,
} from '../types/walkthroughTree';

const FINDER_REV = '2026-08-24-v1';
// Centipawn bars — identical to the offline miner (studentEval is white-POV
// engine cp flipped to the student's side).
const WEAPON_CP = 100; // ≥ +1.0 = confirmed
const EDGE_CP = 50; //   +0.5..+1.0 = positional; below → dropped
const JUMP_CP = 50; //   the slip must COST ≥ +0.5 vs not slipping
const FREQ_FLOOR = 0.03; // a candidate slip humans play ≥ 3% of the time
const MIN_GAMES_AT_POS = 20; // the position needs a real human sample
const MAX_CANDIDATES = 4; // top-N human moves to test per position
const MOVE_TIME_MS = 300; // per engine ply during the play-out
const ANALYZE_DEPTH = 16;
const DEFAULT_BUDGET_MS = 30_000; // overall wall-clock ceiling per opening

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
): Promise<BakedGemLine | null> {
  // Baseline: how the student stands BEFORE the slip. If they're already
  // winning, there's no trap worth teaching here.
  let base;
  try {
    base = await stockfishEngine.analyzePosition(baseFen, ANALYZE_DEPTH);
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
    after = await stockfishEngine.analyzePosition(afterSlipFen, ANALYZE_DEPTH);
  } catch {
    return null;
  }
  const E1 = studentIsWhite ? after.evaluation : -after.evaluation;
  // Must reach a real edge AND the slip must have COST that edge.
  if (E1 < EDGE_CP || E1 - E0 < JUMP_CP) return null;

  const punishUci = after.bestMove;
  if (!punishUci || punishUci.length < 4) return null;
  const punisher: 'w' | 'b' = studentIsWhite ? 'w' : 'b';
  let b2: Chess;
  let pm;
  try {
    b2 = new Chess(afterSlipFen);
    pm = b2.move({
      from: punishUci.slice(0, 2),
      to: punishUci.slice(2, 4),
      ...(punishUci.length > 4 ? { promotion: punishUci[4] } : {}),
    });
  } catch {
    return null;
  }
  if (!pm) return null;

  // Play the punish out to a quiet, material-shown terminus (or confirm it's
  // already shown). If best play dissolves the edge, it isn't a real trap.
  const afterPunishFen = b2.fen();
  let punishSeq: string[] = [pm.san];
  if (!advantageAlreadyShown(afterPunishFen, punisher)) {
    let po;
    try {
      po = await playOutPunish(afterPunishFen, punisher, MOVE_TIME_MS);
    } catch {
      return null;
    }
    if (po.terminus === 'dissolved' || po.terminus === 'illegal') return null;
    punishSeq = [pm.san, ...po.steps.map((s) => s.san)];
  }

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
  for (const pos of positions) {
    if (Date.now() > deadline) break;
    if (!pos.opponentToMove) continue;
    const key = positionKey(pos.fen);
    if (seen.has(key)) continue;
    seen.add(key);
    let amateur;
    try {
      amateur = await lookupAmateurPlay(pos.fen);
    } catch {
      continue;
    }
    if (amateur.source === 'none' || amateur.moves.length === 0) continue;
    const total = amateur.totalGames || 0;
    if (total < MIN_GAMES_AT_POS) continue;
    const candidates = amateur.moves
      .filter((m) => m.games / Math.max(1, total) >= FREQ_FLOOR)
      .slice(0, MAX_CANDIDATES);
    const detours: BakedGemLine[] = [];
    for (const cand of candidates) {
      if (Date.now() > deadline) break;
      const d = await verifySlip(pos.fen, cand.san, studentIsWhite);
      if (d) detours.push(d);
    }
    if (detours.length > 0) out.set(key, detours);
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
