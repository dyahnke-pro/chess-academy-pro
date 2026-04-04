import { db } from '../db/schema';
import { detectTacticType } from './missedTacticService';
import { mistakePuzzleToPuzzleRecord } from './puzzleService';
import type { MistakePuzzle, TacticType, PuzzleRecord } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface TacticDrillItem {
  puzzle: PuzzleRecord;
  originalMistake: MistakePuzzle;
  tacticType: TacticType;
}

// ─── Recency Buffer ───────────────────────────────────────────────────────
// Persisted in the meta table so cross-session deduplication works.

const RECENCY_META_KEY = 'tactic_drill_recency';
const RECENCY_BUFFER_SIZE = 3;

interface RecencyEntry {
  tacticType: TacticType;
  timestamp: string;
}

async function getRecencyBuffer(): Promise<RecencyEntry[]> {
  const meta = await db.meta.get(RECENCY_META_KEY);
  if (!meta) return [];
  try {
    return JSON.parse(meta.value) as RecencyEntry[];
  } catch {
    return [];
  }
}

async function pushRecency(tacticType: TacticType): Promise<void> {
  const buffer = await getRecencyBuffer();
  buffer.push({ tacticType, timestamp: new Date().toISOString() });
  // Keep only the last N entries
  const trimmed = buffer.slice(-RECENCY_BUFFER_SIZE);
  await db.meta.put({ key: RECENCY_META_KEY, value: JSON.stringify(trimmed) });
}

// ─── Queue Builder ─────────────────────────────────────────────────────────

/**
 * Builds a drill queue of tactic-only mistake puzzles from the user's games.
 *
 * When filterTypes is provided (user tapped a specific row), the queue is
 * filtered to those types only — no round-robin logic.
 *
 * When filterTypes is omitted ("Begin Your Training"), the queue uses:
 * 1. Weighted random across weak types (miss count as weight)
 * 2. Round-robin so types alternate — no back-to-back repeats
 * 3. Persisted recency buffer to avoid same type across sessions
 */
export async function buildTacticDrillQueue(
  count: number = 20,
  filterTypes?: TacticType[],
): Promise<TacticDrillItem[]> {
  const today = new Date().toISOString().split('T')[0];

  // Get all mistake puzzles with meaningful CP loss
  const allMistakes = await db.mistakePuzzles
    .filter((m) => m.cpLoss >= 50)
    .toArray();

  // Classify each by tactic type and filter
  const classified: Array<{ mistake: MistakePuzzle; tacticType: TacticType }> = [];
  for (const m of allMistakes) {
    const tacticType = detectTacticType(m.fen, m.bestMove);
    if (filterTypes && !filterTypes.includes(tacticType)) continue;
    classified.push({ mistake: m, tacticType });
  }

  if (classified.length === 0) return [];

  // If filtering to specific types, use simple priority sort
  if (filterTypes) {
    return sortByPriority(classified, today).slice(0, count).map(toItem);
  }

  // Otherwise: round-robin weighted selection
  return buildRoundRobinQueue(classified, count, today);
}

// ─── Round-Robin Queue ────────────────────────────────────────────────────

async function buildRoundRobinQueue(
  classified: Array<{ mistake: MistakePuzzle; tacticType: TacticType }>,
  count: number,
  today: string,
): Promise<TacticDrillItem[]> {
  // Group by tactic type
  const byType = new Map<TacticType, Array<{ mistake: MistakePuzzle; tacticType: TacticType }>>();
  for (const item of classified) {
    const existing = byType.get(item.tacticType) ?? [];
    existing.push(item);
    byType.set(item.tacticType, existing);
  }

  // Sort each group by priority (SRS due first, then unsolved, then recent)
  for (const [type, items] of byType) {
    byType.set(type, sortByPriority(items, today));
  }

  // Build weights: miss count per type (more misses = higher weight)
  const typeWeights: Array<{ type: TacticType; weight: number; cursor: number }> = [];
  for (const [type, items] of byType) {
    typeWeights.push({ type, weight: items.length, cursor: 0 });
  }

  // Read persisted recency buffer to avoid cross-session repeats
  const recency = await getRecencyBuffer();
  const recentTypes = new Set(recency.map((r) => r.tacticType));

  const result: TacticDrillItem[] = [];
  let lastType: TacticType | null = null;

  for (let i = 0; i < count; i++) {
    // Pick next type via weighted random, excluding last type + recency buffer on first pick
    const picked = pickWeightedType(typeWeights, byType, lastType, i === 0 ? recentTypes : null);
    if (!picked) break;

    const group = byType.get(picked.type);
    if (!group) break;

    const entry = group.at(picked.cursor);
    if (!entry) break;

    picked.cursor++;
    result.push(toItem(entry));
    lastType = picked.type;
  }

  // Persist the first type we picked for cross-session deduplication
  if (result.length > 0) {
    await pushRecency(result[0].tacticType);
  }

  return result;
}

function pickWeightedType(
  typeWeights: Array<{ type: TacticType; weight: number; cursor: number }>,
  byType: Map<TacticType, Array<{ mistake: MistakePuzzle; tacticType: TacticType }>>,
  excludeType: TacticType | null,
  excludeRecent: Set<TacticType> | null,
): { type: TacticType; weight: number; cursor: number } | null {
  // Filter to types that still have items available
  const available = typeWeights.filter((tw) => {
    const group = byType.get(tw.type);
    if (!group || tw.cursor >= group.length) return false;
    if (tw.type === excludeType) return false;
    if (excludeRecent && excludeRecent.has(tw.type)) return false;
    return true;
  });

  // If nothing available after exclusions, relax constraints
  if (available.length === 0) {
    const relaxed = typeWeights.filter((tw) => {
      const group = byType.get(tw.type);
      return group !== undefined && tw.cursor < group.length;
    });
    if (relaxed.length === 0) return null;
    return weightedRandomPick(relaxed);
  }

  return weightedRandomPick(available);
}

function weightedRandomPick(
  items: Array<{ type: TacticType; weight: number; cursor: number }>,
): { type: TacticType; weight: number; cursor: number } | null {
  if (items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }

  return items[items.length - 1];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function sortByPriority(
  items: Array<{ mistake: MistakePuzzle; tacticType: TacticType }>,
  today: string,
): Array<{ mistake: MistakePuzzle; tacticType: TacticType }> {
  return [...items].sort((a, b) => {
    // Due items first
    const aDue = a.mistake.srsDueDate <= today;
    const bDue = b.mistake.srsDueDate <= today;
    if (aDue !== bDue) return aDue ? -1 : 1;

    // Unsolved before solved
    const aUnsolved = a.mistake.status === 'unsolved';
    const bUnsolved = b.mistake.status === 'unsolved';
    if (aUnsolved !== bUnsolved) return aUnsolved ? -1 : 1;

    // Mastered items last
    const aMastered = a.mistake.status === 'mastered';
    const bMastered = b.mistake.status === 'mastered';
    if (aMastered !== bMastered) return aMastered ? 1 : -1;

    // Newest first
    const dateA = a.mistake.gameDate ? new Date(a.mistake.gameDate).getTime() : new Date(a.mistake.createdAt).getTime();
    const dateB = b.mistake.gameDate ? new Date(b.mistake.gameDate).getTime() : new Date(b.mistake.createdAt).getTime();
    return dateB - dateA;
  });
}

function toItem(entry: { mistake: MistakePuzzle; tacticType: TacticType }): TacticDrillItem {
  return {
    puzzle: mistakePuzzleToPuzzleRecord(entry.mistake),
    originalMistake: entry.mistake,
    tacticType: entry.tacticType,
  };
}

/**
 * Returns counts of available tactic drills per type.
 */
export async function getTacticDrillCounts(): Promise<Map<TacticType, number>> {
  const allMistakes = await db.mistakePuzzles
    .filter((m) => m.cpLoss >= 50 && m.status !== 'mastered')
    .toArray();

  const counts = new Map<TacticType, number>();
  for (const m of allMistakes) {
    const tacticType = detectTacticType(m.fen, m.bestMove);
    counts.set(tacticType, (counts.get(tacticType) ?? 0) + 1);
  }

  return counts;
}
