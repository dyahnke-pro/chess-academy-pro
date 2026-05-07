/**
 * Registry of in-place walkthrough trees, keyed by canonical opening
 * name. The `start_walkthrough_for_opening` tool calls
 * `resolveWalkthroughTree(name)` to get the tree the runtime will
 * walk.
 *
 * To add a new opening: write a `<name>.ts` file in this directory
 * that exports a `WalkthroughTree`, then register it below.
 */
import type { WalkthroughTree } from '../../types/walkthroughTree';
import { VIENNA_GAME } from './vienna';

/** Master list of available walkthrough trees. The order doesn't
 *  matter — resolution is by name match. */
const ALL_TREES: WalkthroughTree[] = [VIENNA_GAME];

/** Resolve an opening name (whatever the brain or surface passes) to
 *  a registered walkthrough tree. Match strategy:
 *
 *    1. Exact case-insensitive match on `openingName`.
 *    2. Sub-string match (e.g. "Vienna" → "Vienna Game").
 *    3. ECO code match (e.g. "C25" → Vienna).
 *
 *  Returns `null` when no tree exists for the requested opening —
 *  caller should fall back to whatever the legacy walkthrough
 *  surface used to do (or surface a "we don't have a curated
 *  walkthrough for this opening yet" message). */
export function resolveWalkthroughTree(query: string): WalkthroughTree | null {
  if (!query || !query.trim()) return null;
  const q = query.trim().toLowerCase();

  // 1. Exact name match.
  const exact = ALL_TREES.find((t) => t.openingName.toLowerCase() === q);
  if (exact) return exact;

  // 2. ECO code match.
  const ecoMatch = ALL_TREES.find((t) => t.eco.toLowerCase() === q);
  if (ecoMatch) return ecoMatch;

  // 3. Sub-string match (cheaper than fuzzy and adequate for
  //    "Vienna" → "Vienna Game" / "Italian" → "Italian Game" etc.).
  const sub = ALL_TREES.find(
    (t) => t.openingName.toLowerCase().includes(q) || q.includes(t.openingName.toLowerCase()),
  );
  if (sub) return sub;

  return null;
}

/** List the names of every registered walkthrough — used by surfaces
 *  that want to render "available openings to learn." */
export function listAvailableWalkthroughs(): { name: string; eco: string }[] {
  return ALL_TREES.map((t) => ({ name: t.openingName, eco: t.eco }));
}
