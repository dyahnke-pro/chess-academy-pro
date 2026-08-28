/**
 * teachingLedger — the coach's MEMORY of what it has taught (David
 * 2026-07-31: "if a user asks more than once to hear an opening — last time
 * we went over X, today we add Y. Next session we add Z and then we add them
 * all together!!! MEMORY!!!").
 *
 * Per opening, a Dexie meta-blob records every teaching visit: which LAYER
 * was delivered and its one-line takeaway. On a revisit, CODE (G0 — the LLM
 * decides nothing) reads the ledger, picks the next unheard layer from the
 * tree's real structure, and assembles the recap the coach speaks:
 * "Last time we built the f7 story down the main line. Today — the Schofman."
 *
 * Layers, in teaching order:
 *   main            — the main-line walkthrough story
 *   branch:<label>  — one named sideline (from the tree's fork tiles)
 *   continuation    — the narrated middlegame+endgame play-out
 *   weave           — everything together: full line + play it out yourself
 */
import { db } from '../db/schema';
import type { WalkthroughTree, WalkthroughTreeNode } from '../types/walkthroughTree';

const META_KEY = 'teachingLedger';

export interface TeachingVisit {
  layer: string;
  takeaway: string;
  at: number;
}

interface LedgerBlob {
  [openingKey: string]: TeachingVisit[];
}

const keyFor = (openingName: string): string => openingName.trim().toLowerCase();

async function read(): Promise<LedgerBlob> {
  try {
    const rec = await db.meta.get(META_KEY);
    if (rec) return JSON.parse(rec.value) as LedgerBlob;
  } catch { /* fresh ledger */ }
  return {};
}

async function write(blob: LedgerBlob): Promise<void> {
  try {
    await db.meta.put({ key: META_KEY, value: JSON.stringify(blob) });
  } catch { /* best-effort — memory, not correctness */ }
}

/** Record a delivered teaching visit. Idempotent per (opening, layer) — a
 *  re-walk of the same layer refreshes its timestamp, never duplicates. */
export async function recordTeachingVisit(
  openingName: string,
  layer: string,
  takeaway: string,
): Promise<void> {
  const blob = await read();
  const key = keyFor(openingName);
  const visits = blob[key] ?? [];
  const existing = visits.find((v) => v.layer === layer);
  if (existing) {
    existing.at = Date.now();
    if (takeaway.trim()) existing.takeaway = takeaway.trim();
  } else {
    visits.push({ layer, takeaway: takeaway.trim(), at: Date.now() });
  }
  blob[key] = visits;
  await write(blob);
}

export async function getTeachingVisits(openingName: string): Promise<TeachingVisit[]> {
  const blob = await read();
  return blob[keyFor(openingName)] ?? [];
}

/** The most recent teaching visit across ALL openings — fuels the
 *  classroom-entry greeting ("last session we did X on the <opening>; I'd
 *  build on that"). Returns the opening's ledger KEY (lowercased name,
 *  fine for a "teach me <name>" ask) or null when nothing was ever taught. */
export async function getLastTaughtOpening(): Promise<{ openingName: string; visit: TeachingVisit } | null> {
  const blob = await read();
  let best: { openingName: string; visit: TeachingVisit } | null = null;
  for (const [key, visits] of Object.entries(blob)) {
    for (const v of visits) {
      if (!best || v.at > best.visit.at) best = { openingName: key, visit: v };
    }
  }
  return best;
}

/** All fork-tile labels the tree offers (the teachable sidelines). */
function branchLabels(tree: WalkthroughTree): string[] {
  const labels: string[] = [];
  const walk = (node: WalkthroughTreeNode): void => {
    if (node.children.length > 1) {
      for (const c of node.children) {
        if (c.label && !/^main line/i.test(c.label)) labels.push(c.label);
      }
    }
    for (const c of node.children) walk(c.node);
  };
  walk(tree.root);
  return labels;
}

export interface RevisitPlan {
  /** null on the first visit — nothing to recap. */
  recap: string | null;
  /** The layer THIS visit should deliver (recorded on completion). */
  layer: string;
  /** Short spoken name of what's new today. */
  todayLabel: string;
}

/** Decide what this visit teaches, from the ledger + the tree's REAL
 *  structure. Pure code — deterministic teaching progression. */
export async function planTeachingVisit(
  openingName: string,
  tree: WalkthroughTree,
): Promise<RevisitPlan> {
  const visits = await getTeachingVisits(openingName);
  const heard = new Set(visits.map((v) => v.layer));

  let layer = 'main';
  let todayLabel = 'the main line';
  if (heard.has('main')) {
    const unheardBranch = branchLabels(tree).find((l) => !heard.has(`branch:${l}`));
    if (unheardBranch) {
      layer = `branch:${unheardBranch}`;
      todayLabel = unheardBranch;
    } else if (!heard.has('continuation')) {
      layer = 'continuation';
      todayLabel = 'watching the middlegame and endgame play out';
    } else {
      layer = 'weave';
      todayLabel = 'putting it all together — the whole story, then you play it out';
    }
  }

  let recap: string | null = null;
  if (visits.length > 0) {
    const last = visits[visits.length - 1];
    // A takeaway is only usable in the recap if it's a SHORT summary — not a
    // raw walkthrough intro (which starts "Let's walk through …" and reads as
    // "Last time we covered Let's walk through …", the 2026-08-28 prod bug David
    // caught). Anything long or intro-shaped falls back to the clean layer label.
    const usableTakeaway = (t: string | null | undefined): string | null =>
      (t && t.length <= 70 && !/^\s*(let'?s walk through|we (open|start)|today)/i.test(t)) ? t : null;
    const covered = visits.length === 1
      ? (usableTakeaway(last.takeaway) || describeLayer(last.layer))
      : `${describeLayer(visits[0].layer)}${visits.length > 2 ? `, ${visits.slice(1, -1).map((v) => describeLayer(v.layer)).join(', ')},` : ''} and ${describeLayer(last.layer)}`;
    recap = `Last time we covered ${covered}. Today we add ${todayLabel}.`;
  }

  return { recap, layer, todayLabel };
}

function describeLayer(layer: string): string {
  if (layer === 'main') return 'the main line';
  if (layer === 'continuation') return 'the middlegame and endgame play-out';
  if (layer === 'weave') return 'the full story';
  if (layer.startsWith('branch:')) return `the ${layer.slice('branch:'.length)}`;
  return layer;
}

/** The one-line takeaway to remember a tree's MAIN layer by. */
export function takeawayForTree(tree: WalkthroughTree): string {
  return tree.shortIntro?.trim()
    || tree.intro.split(/(?<=[.!?])\s/)[0]?.slice(0, 140)
    || `the ${tree.openingName} main line`;
}
