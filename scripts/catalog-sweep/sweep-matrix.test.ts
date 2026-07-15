import { describe, it } from 'vitest';
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { ALL_LESSONS } from '../../src/data/lessons/registry';
import { getLessonScript, getVariationLessonScript } from '../../src/data/lessons';
import { isSurfaceableGem, isWeaponGem } from '../../src/data/lessons/punishGems';
import { isNarratedModelGame } from '../../src/services/modelGameService';
import { getOpeningPassages } from '../../src/services/chessConceptService';
import repertoire from '../../src/data/repertoire.json';
import proRepertoires from '../../src/data/pro-repertoires.json';
import antiOpenings from '../../src/data/anti-openings.json';
import punishGems from '../../src/data/punish-gems.json';
import middlegamePlans from '../../src/data/middlegame-plans.json';
import modelGames from '../../src/data/model-games.json';
import commonMistakes from '../../src/data/common-mistakes.json';
import bookPages from '../../src/data/opening-book-pages.json';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore shared mjs helper
import { reachesMiddlegame } from '../../src/data/variationMiddlegameDepth.shared.mjs';

interface Row { [k: string]: unknown }

function fenOf(pgn: string): string | null {
  try {
    const c = new Chess();
    for (const m of pgn.trim().split(/\s+/).filter(Boolean)) if (!c.move(m)) return null;
    return c.fen();
  } catch { return null; }
}
function gateB(pgn: string): { pass: boolean; plies: number } {
  try { const r = reachesMiddlegame(pgn); return { pass: r.pass, plies: r.plies }; }
  catch { return { pass: false, plies: -1 }; }
}
// Gate C: does the plan's criticalPositionFen match (piece placement + side)
// the terminus of the main pgn or any variation pgn — or a position reached
// along those lines (a plan may anchor a few plies before the deep tail)?
function fenKey(fen: string): string { return fen.split(' ').slice(0, 2).join(' '); }
function lineFenKeys(pgn: string): Set<string> {
  const keys = new Set<string>();
  try {
    const c = new Chess();
    keys.add(fenKey(c.fen()));
    for (const m of pgn.trim().split(/\s+/).filter(Boolean)) { if (!c.move(m)) break; keys.add(fenKey(c.fen())); }
  } catch { /* partial */ }
  return keys;
}

describe('masterclass full-catalog sweep matrix', () => {
  it('emits the matrix', () => {
    const gems = punishGems as Array<{ openingId: string } & Record<string, unknown>>;
    const plans = middlegamePlans as Array<{ id: string; openingId: string; criticalPositionFen: string }>;
    const games = modelGames as Array<{ openingId: string } & Record<string, unknown>>;
    const mistakes = commonMistakes as Record<string, unknown[]>;
    const pages = (bookPages as { pages: Record<string, unknown[]> }).pages;

    // ── the universe ──
    interface Entry { id: string; name: string; catalog: string; pgn: string; variations: Array<{ name: string; pgn: string }>; warningsCount: number; trapLinesCount: number }
    const universe: Entry[] = [];
    const repList = repertoire as Array<Record<string, unknown>>;
    const registryIds = new Set(ALL_LESSONS.filter((l) => l.scope === 'main').map((l) => l.lesson.openingId));
    for (const r of repList) {
      universe.push({
        id: r.id as string, name: r.name as string,
        catalog: registryIds.has(r.id as string) ? 'masterclass' : 'repertoire-only',
        pgn: (r.pgn as string) ?? '',
        variations: ((r.variations as Array<{ name: string; pgn: string }>) ?? []),
        warningsCount: ((r.warningLines as unknown[]) ?? []).length + (((r.warnings as unknown[]) ?? [])?.length ?? 0),
        trapLinesCount: ((r.trapLines as unknown[]) ?? []).length,
      });
    }
    const proList = (proRepertoires as { openings: Array<Record<string, unknown>> }).openings;
    for (const p of proList) {
      universe.push({
        id: p.id as string, name: p.name as string, catalog: 'pro',
        pgn: (p.pgn as string) ?? '',
        variations: ((p.variations as Array<{ name: string; pgn: string }>) ?? []),
        warningsCount: (((p.warningLines as unknown[]) ?? [])?.length ?? 0) + (((p.warnings as unknown[]) ?? [])?.length ?? 0),
        trapLinesCount: ((p.trapLines as unknown[]) ?? [])?.length ?? 0,
      });
    }
    for (const a of antiOpenings as Array<Record<string, unknown>>) {
      universe.push({
        id: a.id as string, name: a.name as string, catalog: 'anti',
        pgn: (a.pgn as string) ?? '',
        variations: ((a.variations as Array<{ name: string; pgn: string }>) ?? []),
        warningsCount: ((a.warnings as unknown[] | null) ?? []).length,
        trapLinesCount: ((a.traps as unknown[] | null) ?? []).length,
      });
    }
    // registry mains not in repertoire.json (gambit-tab)
    for (const l of ALL_LESSONS.filter((x) => x.scope === 'main')) {
      if (!universe.some((u) => u.id === l.lesson.openingId)) {
        universe.push({ id: l.lesson.openingId, name: l.lesson.title, catalog: 'gambit-tab', pgn: '', variations: [], warningsCount: 0, trapLinesCount: 0 });
      }
    }

    const rows: Row[] = [];
    for (const u of universe) {
      const lesson = getLessonScript(u.id);
      const mainB = u.pgn ? gateB(u.pgn) : { pass: false, plies: 0 };
      const lineKeys = new Set<string>();
      if (u.pgn) for (const k of lineFenKeys(u.pgn)) lineKeys.add(k);
      const varRows = u.variations.map((v) => {
        const b = gateB(v.pgn);
        for (const k of lineFenKeys(v.pgn)) lineKeys.add(k);
        return { name: v.name, plies: b.plies, gateB: b.pass, hasLesson: !!getVariationLessonScript(u.id, v.name) };
      });
      const myGems = gems.filter((g) => g.openingId === u.id);
      const myPlans = plans.filter((p) => p.openingId === u.id);
      const mg = myPlans.filter((p) => !p.id.endsWith('-endgame'));
      const eg = myPlans.filter((p) => p.id.endsWith('-endgame'));
      const unanchored = myPlans.filter((p) => p.criticalPositionFen && !lineKeys.has(fenKey(p.criticalPositionFen))).map((p) => p.id);
      const myGames = games.filter((g) => g.openingId === u.id);
      const wisdom = getOpeningPassages(u.name);
      const myPages = pages[u.id] ?? [];
      // redundancy: wisdom passage text also present in book pages
      const pageTexts = JSON.stringify(myPages);
      const overlap = wisdom.filter((w) => (w as { text?: string }).text && pageTexts.includes((w as { text: string }).text.slice(0, 80))).length;
      rows.push({
        id: u.id, catalog: u.catalog,
        lesson: !!lesson,
        mainPlies: mainB.plies, mainGateB: mainB.pass,
        variations: varRows.length,
        varLessons: varRows.filter((v) => v.hasLesson).length,
        varGateBFail: varRows.filter((v) => !v.gateB).map((v) => `${v.name}(${v.plies}p)`),
        gems: myGems.length, weaponGems: myGems.filter((g) => isWeaponGem(g as never)).length, surfaceableGems: myGems.filter((g) => isSurfaceableGem(g as never)).length,
        mgPlans: mg.length, endgamePlans: eg.length, unanchoredPlans: unanchored,
        modelGames: myGames.length, narratedModelGames: myGames.filter((g) => isNarratedModelGame(g as never)).length,
        pitfalls: (mistakes[u.id] ?? []).length,
        warnings: u.warningsCount, trapLines: u.trapLinesCount,
        classicWisdom: wisdom.length, bookPages: myPages.length, wisdomBookOverlap: overlap,
      });
    }
    fs.mkdirSync('audit-reports/masterclass-sweep', { recursive: true });
    fs.writeFileSync('audit-reports/masterclass-sweep/matrix.json', JSON.stringify(rows, null, 1));
    console.log(`MATRIX: ${rows.length} openings written`);
  });
});
