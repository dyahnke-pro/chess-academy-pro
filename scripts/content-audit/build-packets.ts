/**
 * Content-audit packet builder.
 *
 * Slices every CURATED opening's content (the prose + move lines + the
 * resolved Classic-Wisdom / From-the-Books passages + lesson Watch/Learn
 * beats) out of the big data files into one compact, judge-ready JSON
 * packet per opening at audit-reports/content-packets/<id>.json.
 *
 * The audit judges what the USER SEES, so each section is sourced the
 * same way OpeningDetailPage sources it:
 *   - Overview / Key Ideas / variations  → repertoire.json (masterclass)
 *                                           or pro-repertoires.json (pro)
 *   - Watch/Learn beats                   → src/data/lessons (getLessonScript)
 *   - Middlegame / Endgame plans          → middlegame-plans.json by openingId
 *   - Model games                         → model-games.json by openingId
 *   - Common mistakes                     → common-mistakes.json by openingId
 *   - Punish gems                         → punish-gems.json by openingId
 *   - Classic Wisdom                      → chess-concepts.json openings[id]
 *   - From the Books                      → opening-book-pages.json pages[id]
 *
 * chess.js replays each move line to a SAN array + final FEN so the judge
 * grounds prose against the ACTUAL position, never its own chess memory.
 *
 * Run:  npx tsx scripts/content-audit/build-packets.ts
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';

import repertoire from '../../src/data/repertoire.json';
import proRepertoires from '../../src/data/pro-repertoires.json';
import middlegamePlans from '../../src/data/middlegame-plans.json';
import modelGames from '../../src/data/model-games.json';
import commonMistakes from '../../src/data/common-mistakes.json';
import punishGems from '../../src/data/punish-gems.json';
import chessConcepts from '../../src/data/chess-concepts.json';
const CW_DEFS: Record<string, any> = (chessConcepts as any).openingDefinitions ?? {};
import bookPages from '../../src/data/opening-book-pages.json';
import manifests from '../../src/data/opening-manifests.json';
import { getLessonScript, getVariationLessonScript } from '../../src/data/lessons/index';

/* eslint-disable @typescript-eslint/no-explicit-any */
const asArray = (v: any): any[] => (Array.isArray(v) ? v : v ? Object.values(v).flat() : []);

const REP = asArray(repertoire);
const PRO = asArray((proRepertoires as any).openings ?? (proRepertoires as any).repertoires ?? proRepertoires);
const PLANS = asArray(middlegamePlans);
const MODELS = asArray(modelGames);
const GEMS = asArray(punishGems);
const CW_OPENINGS: Record<string, any[]> = (chessConcepts as any).openings ?? {};
const BOOK: Record<string, any[]> = (bookPages as any).pages ?? {};
const CM: any = commonMistakes;

/** Replay a SAN/PGN move string or array into a clean SAN list + final FEN.
 *  Plan playable-lines start from their own FEN, not move 1 — pass startFen. */
function replay(moves: string | string[] | undefined, startFen?: string | null): { san: string[]; fen: string | null; illegalAt: number | null } {
  if (!moves) return { san: [], fen: null, illegalAt: null };
  const list = Array.isArray(moves) ? moves : moves.trim().split(/\s+/).filter((m) => m && !/^\d+\.+$/.test(m));
  const cleaned = list.map((m) => m.replace(/^\d+\.+/, '')).filter(Boolean);
  let game: Chess;
  try { game = startFen ? new Chess(startFen) : new Chess(); } catch { game = new Chess(); }
  const san: string[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    try {
      const mv = game.move(cleaned[i]);
      if (!mv) return { san, fen: game.fen(), illegalAt: i };
      san.push(mv.san);
    } catch {
      return { san, fen: game.fen(), illegalAt: i };
    }
  }
  return { san, fen: game.fen(), illegalAt: null };
}

const cmFor = (id: string): any[] => {
  if (Array.isArray(CM)) return CM.filter((x: any) => x.openingId === id);
  return CM[id] ?? [];
};

function beatsFor(lesson: any): any[] {
  if (!lesson?.beats) return [];
  return lesson.beats.map((b: any) => ({
    moves: Array.isArray(b.moves) ? b.moves.join(' ') : b.moves,
    say: b.say ?? '',
    sayShort: b.sayShort ?? '',
  }));
}

function buildPacket(id: string, entry: any, isPro: boolean): any {
  const variations = (entry.variations ?? []).map((v: any) => {
    const r = replay(v.pgn);
    const vLesson = getVariationLessonScript(id, v.name) ?? null;
    return {
      name: v.name,
      pgn: v.pgn,
      sanLine: r.san.join(' '),
      finalFen: r.fen,
      illegalAt: r.illegalAt,
      explanation: v.explanation ?? '',
      watchLearnBeats: beatsFor(vLesson),
    };
  });

  const plansAll = PLANS.filter((p: any) => p.openingId === id);
  const mapPlan = (p: any) => {
    const line = p.playableLines?.[0];
    const startFen = line?.fen ?? p.criticalPositionFen ?? null;
    const r = replay(line?.moves, startFen);
    return {
      id: p.id,
      title: p.title,
      overview: p.overview ?? '',
      criticalPositionFen: p.criticalPositionFen ?? null,
      lineStartFen: startFen,
      pawnBreaks: p.pawnBreaks ?? [],
      pieceManeuvers: p.pieceManeuvers ?? [],
      strategicThemes: p.strategicThemes ?? [],
      lineSan: r.san.join(' '),
      lineFinalFen: r.fen,
      annotations: line?.annotations ?? [],
    };
  };

  const mainLesson = getLessonScript(id);

  return {
    id,
    kind: isPro ? 'pro' : 'masterclass',
    name: entry.name,
    eco: entry.eco ?? null,
    color: entry.color ?? null,
    style: entry.style ?? null,
    playerId: entry.playerId ?? null,
    spinePgn: entry.pgn ?? null,
    spineSan: replay(entry.pgn).san.join(' '),

    overview: entry.overview ?? '',
    keyIdeas: entry.keyIdeas ?? [],
    variations,
    watchLearnBeatsMain: beatsFor(mainLesson),

    middlegamePlans: plansAll.filter((p: any) => !/-endgame$/.test(p.id)).map(mapPlan),
    endgamePlans: plansAll.filter((p: any) => /-endgame$/.test(p.id)).map(mapPlan),

    modelGames: MODELS.filter((g: any) => g.openingId === id).map((g: any) => ({
      id: g.id,
      white: g.white, black: g.black, result: g.result, year: g.year, event: g.event,
      studentSide: g.studentSide, variation: g.variation ?? null,
      middlegameTheme: g.middlegameTheme ?? '',
      overview: g.overview ?? '',
      openingSan: replay(g.pgn).san.slice(0, 20).join(' '),
    })),

    commonMistakes: cmFor(id).map((m: any) => ({
      fen: m.fen, wrongMove: m.wrongMove, correctMove: m.correctMove,
      explanation: m.explanation ?? '', shortNarration: m.shortNarration ?? '',
    })),

    punishGems: GEMS.filter((g: any) => g.openingId === id).map((g: any) => ({
      lineMoves: g.lineMoves, inaccuracy: g.inaccuracy, punish: g.punish,
      punishSeq: g.punishSeq, tier: g.tier, engineCp: g.engineCp, freqPct: g.freqPct,
      why: g.why ?? '',
    })),

    traps: entry.traps ?? [],
    warnings: entry.warnings ?? [],

    classicWisdom: (CW_OPENINGS[id] ?? []).map((p: any) => ({
      author: p.author, section: p.section ?? null, text: p.text,
    })),
    // When no book passage matched, the card renders this modern definition
    // instead — include it so the redundancy-vs-Overview check can see it.
    classicWisdomFallbackDefinition: (CW_OPENINGS[id]?.length ? null : (CW_DEFS[id] ?? null)),
    fromTheBooks: (BOOK[id] ?? []).map((p: any) => ({
      bookTitle: p.bookTitle, author: p.author, chapter: p.chapter ?? null,
      section: p.section ?? null, wordCount: p.wordCount, text: p.text,
    })),
  };
}

// ---- assemble the curated id set ------------------------------------------
const masterIds: string[] = Object.keys(manifests as any).filter((k) => !k.startsWith('_'));
const repById = new Map(REP.filter((o: any) => o?.id).map((o: any) => [o.id, o]));
const proById = new Map(PRO.filter((o: any) => o?.id).map((o: any) => [o.id, o]));

const outDir = resolve('audit-reports/content-packets');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const manifest: any[] = [];
let written = 0;

const emit = (id: string, entry: any, isPro: boolean) => {
  const packet = buildPacket(id, entry, isPro);
  writeFileSync(resolve(outDir, `${id}.json`), JSON.stringify(packet, null, 2));
  written++;
  manifest.push({
    id, kind: packet.kind, name: packet.name, playerId: packet.playerId,
    sections: {
      overview: packet.overview ? packet.overview.length : 0,
      keyIdeas: packet.keyIdeas.length,
      variations: packet.variations.length,
      watchBeatsMain: packet.watchLearnBeatsMain.length,
      mgPlans: packet.middlegamePlans.length,
      egPlans: packet.endgamePlans.length,
      modelGames: packet.modelGames.length,
      commonMistakes: packet.commonMistakes.length,
      gems: packet.punishGems.length,
      classicWisdom: packet.classicWisdom.length,
      fromTheBooks: packet.fromTheBooks.length,
    },
  });
};

for (const id of masterIds) {
  const entry = repById.get(id);
  if (!entry) { console.warn(`[warn] manifest id '${id}' not in repertoire.json — skipped`); continue; }
  emit(id, entry, false);
}
for (const [id, entry] of proById) emit(id, entry as any, true);

writeFileSync(resolve(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Wrote ${written} packets → ${outDir}`);
console.log(`  masterclass: ${manifest.filter((m) => m.kind === 'masterclass').length}, pro: ${manifest.filter((m) => m.kind === 'pro').length}`);
