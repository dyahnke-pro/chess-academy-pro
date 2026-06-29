// Shared loader + helpers for the content-grounding gates. The gates read the
// COMMITTED engine-eval output (grounding-items.json, produced offline by
// scripts/ci/build-grounding.cjs) — no engine runs at test time, so ship-check
// stays fast. Each gate enforces one content type against its ground truth and
// only fails on NEW violations (a shrinking baseline grandfathers the current
// backlog). Rebuild the data with `node scripts/ci/build-grounding.cjs` after
// changing content; a content position missing from the cache fails its gate.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface EvalCp { cp: number | null; mate: number | null; depth: number }
export interface GroundingItem {
  cat: 'line' | 'mistake' | 'trap' | 'warning' | 'gem';
  id?: string;
  openingId?: string;
  color?: 'white' | 'black';
  name?: string;
  isPro?: boolean;
  isGambit?: boolean;
  pgn?: string;
  terminalFen?: string | null;
  fen?: string;
  wrongMove?: string;
  correctMove?: string;
  fenWrong?: string | null;
  fenCorrect?: string | null;
  storedCp?: number | null;
  tier?: string | null;
  eval?: EvalCp | null;
  evalWrong?: EvalCp | null;
  evalCorrect?: EvalCp | null;
}

const DATA = resolve(__dirname, '..');
const ITEMS_PATH = resolve(DATA, 'grounding-items.json');

export function loadItems(cat: GroundingItem['cat'] | GroundingItem['cat'][]): { depth: number; items: GroundingItem[] } {
  if (!existsSync(ITEMS_PATH)) return { depth: 0, items: [] };
  const raw = JSON.parse(readFileSync(ITEMS_PATH, 'utf8')) as { depth: number; items: GroundingItem[] };
  const cats = Array.isArray(cat) ? cat : [cat];
  return { depth: raw.depth, items: (raw.items || []).filter((i) => cats.includes(i.cat)) };
}

/** White-POV eval → the given side's POV, in centipawns. A forced mate maps to
 *  ±100000 (already sign-correct in the cache for white). */
export function toCp(e: EvalCp | null | undefined, color: 'white' | 'black' | undefined): number | null {
  if (!e) return null;
  const whiteCp = e.mate != null ? (e.mate > 0 ? 100000 : -100000) : e.cp;
  if (whiteCp == null) return null;
  return color === 'black' ? -whiteCp : whiteCp;
}

/** The side to move in a FEN ('white' | 'black'). */
export function sideToMove(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

const BASELINE_DIR = resolve(DATA, 'grounding');
export function loadBaseline(name: string): Set<string> {
  const p = resolve(BASELINE_DIR, `${name}.baseline.json`);
  if (!existsSync(p)) return new Set();
  return new Set(JSON.parse(readFileSync(p, 'utf8')) as string[]);
}
/** When GROUNDING_WRITE_BASELINE=1, snapshot the current violations as the
 *  baseline instead of asserting (used once to grandfather the backlog). */
export function maybeWriteBaseline(name: string, violations: string[]): boolean {
  if (process.env.GROUNDING_WRITE_BASELINE !== '1') return false;
  writeFileSync(resolve(BASELINE_DIR, `${name}.baseline.json`), JSON.stringify(violations.sort(), null, 2) + '\n');
  return true;
}
