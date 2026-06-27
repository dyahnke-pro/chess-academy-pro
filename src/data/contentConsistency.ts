/**
 * Content-consistency detectors — the single source of truth for the
 * opening-tab content gate (`contentConsistency.test.ts`) and the fix scripts.
 *
 * Each detector returns a list of stable string keys identifying a violation.
 * The gate asserts the current key set is a SUBSET of the shrinking baseline,
 * so a NEW violation fails the build and every fix lets the baseline shrink.
 *
 * Operates on the raw shipped JSON (not audit packets) so it runs in vitest.
 */
import { Chess } from 'chess.js';
import repertoire from './repertoire.json';
import proRepertoires from './pro-repertoires.json';
import middlegamePlans from './middlegame-plans.json';
import modelGames from './model-games.json';
import chessConcepts from './chess-concepts.json';
import bookPages from './opening-book-pages.json';
import { getVariationLessonScript } from './lessons/index';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-conversion */
const asArray = (v: any): any[] => (Array.isArray(v) ? v : v ? Object.values(v).flat() : []);
const norm = (s: any): string => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

const REP = asArray(repertoire).filter((o: any) => o?.id);
const PRO = asArray((proRepertoires as any).openings ?? (proRepertoires as any).repertoires ?? proRepertoires).filter((o: any) => o?.id);
const PLANS = asArray(middlegamePlans);
const MODELS = asArray(modelGames);
const CW: Record<string, any[]> = (chessConcepts as any).openings ?? {};
const BOOK: Record<string, any[]> = (bookPages as any).pages ?? {};

const ALL_ENTRIES = [...REP, ...PRO];
const COLOR_BY_ID = new Map<string, string>(ALL_ENTRIES.map((o: any) => [o.id, o.color]));
const CURATED_IDS = ALL_ENTRIES.map((o: any) => o.id);

function replaySan(moves: string | string[] | undefined, startFen?: string | null): string {
  if (!moves) return '';
  const list = Array.isArray(moves) ? moves : String(moves).trim().split(/\s+/);
  const cleaned = list.map((m) => m.replace(/^\d+\.+/, '')).filter((m) => m && !/^\d+\.+$/.test(m));
  let g: Chess;
  try { g = startFen ? new Chess(startFen) : new Chess(); } catch { g = new Chess(); }
  const san: string[] = [];
  for (const m of cleaned) {
    try { const mv = g.move(m); if (!mv) break; san.push(mv.san); } catch { break; }
  }
  return san.join(' ');
}

/** Two model games inside one opening that are field-for-field identical. Key = the later (duplicate) id. */
export function detectDuplicateModelGames(): string[] {
  const out: string[] = [];
  const byOpening = new Map<string, any[]>();
  for (const g of MODELS) {
    if (!g?.openingId) continue;
    (byOpening.get(g.openingId) ?? byOpening.set(g.openingId, []).get(g.openingId)!).push(g);
  }
  for (const [id, games] of byOpening) {
    const seen = new Map<string, string>();
    for (const g of games) {
      const key = norm([g.white, g.black, g.result, g.year, g.pgn].join('|'));
      if (seen.has(key)) out.push(`${id}::${g.id}`);
      else seen.set(key, g.id);
    }
  }
  return out.sort();
}

/** Two variation tabs in one opening sharing an identical move line OR identical first Watch beat. */
export function detectDuplicateVariationTabs(): string[] {
  const out: string[] = [];
  for (const o of ALL_ENTRIES) {
    const vs = o.variations ?? [];
    for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
      const a = vs[i], b = vs[j];
      const sameLine = a.pgn && norm(replaySan(a.pgn)) === norm(replaySan(b.pgn));
      const beatA = norm(getVariationLessonScript(o.id, a.name)?.beats?.[0]?.say);
      const beatB = norm(getVariationLessonScript(o.id, b.name)?.beats?.[0]?.say);
      const sameBeat = beatA && beatA === beatB;
      if (sameLine || sameBeat) out.push(`${o.id}::${a.name}==${b.name}`);
    }
  }
  return out.sort();
}

/** Two plans in one opening whose playable line replays to the identical sequence. */
export function detectDuplicatePlanLines(): string[] {
  const out: string[] = [];
  const byOpening = new Map<string, any[]>();
  for (const p of PLANS) {
    if (!p?.openingId) continue;
    (byOpening.get(p.openingId) ?? byOpening.set(p.openingId, []).get(p.openingId)!).push(p);
  }
  for (const [id, plans] of byOpening) {
    const seen = new Map<string, string>();
    for (const p of plans) {
      const line = p.playableLines?.[0];
      const san = norm(replaySan(line?.moves, line?.fen ?? p.criticalPositionFen));
      if (!san) continue;
      if (seen.has(san)) out.push(`${id}::${seen.get(san)}==${p.id}`);
      else seen.set(san, p.id);
    }
  }
  return out.sort();
}

/** Same passage text in Classic-Wisdom (chess-concepts) and From-the-Books with a different author. */
export function detectClassicWisdomBookClash(): string[] {
  const out: string[] = [];
  for (const id of CURATED_IDS) {
    for (const cw of CW[id] ?? []) {
      for (const fb of BOOK[id] ?? []) {
        const ct = norm(cw.text), ft = norm(fb.text);
        if (ct && ft && ct.slice(0, 80) === ft.slice(0, 80) && norm(cw.author) !== norm(fb.author)) {
          out.push(`${id}::${norm(cw.author)}|${norm(fb.author)}`);
        }
      }
    }
  }
  return [...new Set(out)].sort();
}

/** Model game whose result is a LOSS for the student's side (studentSide tag, else opening color). */
export function detectStudentLosingModelGames(): string[] {
  const out: string[] = [];
  for (const g of MODELS) {
    if (!g?.openingId) continue;
    const side = g.studentSide ?? COLOR_BY_ID.get(g.openingId);
    if (!side) continue;
    const loses = (side === 'white' && g.result === '0-1') || (side === 'black' && g.result === '1-0');
    if (loses) out.push(`${g.openingId}::${g.id}`);
  }
  return out.sort();
}

export function detectAllViolations(): Record<string, string[]> {
  return {
    duplicateModelGames: detectDuplicateModelGames(),
    duplicateVariationTabs: detectDuplicateVariationTabs(),
    duplicatePlanLines: detectDuplicatePlanLines(),
    classicWisdomBookClash: detectClassicWisdomBookClash(),
    studentLosingModelGames: detectStudentLosingModelGames(),
  };
}
