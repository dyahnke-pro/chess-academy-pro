/**
 * MEASUREMENT, not a gate: what a change to the ONE scoring and to the
 * population table does to a real student's meters. Re-derives the
 * analysed-game half of the record from each game's stored annotations through
 * the record path (`capabilityPliesFromAnnotations` → `capabilityOutcomes`),
 * the way the device backfill does when `POSITIVE_HALF_REV` moves, two ways: a
 * costly ply posed nothing beyond its own fundamentals (the scoring before
 * 2026-10-22), and posed the position's questions.
 *
 *   SKILL_REFIT_SHARD=i/n   derive one shard of the games, both ways, to
 *                           /tmp/claude-0/refit-rows-<i>.json
 *   SKILL_REFIT_MERGE=1 SKILL_REFIT_TABLES=<old.json>,<new.json>
 *                           print the meters for each scoring × each table
 */
import { describe, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { liveSlipBreaks, type SkillRows } from './skillMetersLoader';
import { computeSkillMeters, eventsFromRecord, type HeldRow } from './skillMeters';
import { capabilityPliesFromAnnotations } from './autoAnalyzeGame';
import { capabilityOutcomes } from './capabilityEvidence';
import { resolvePlayerColor } from './playerIdentity';
import { parentSkillTag } from '../data/tacticMotifs';
import type { GameRecord, MoveAnnotation } from '../types';

const PATH = process.env.SKILL_DROP_PATH ?? 'audit-reports/.fixtures/data-drop-david.json';
const OUT = '/tmp/claude-0';
const SHARD = process.env.SKILL_REFIT_SHARD;
const MERGE = process.env.SKILL_REFIT_MERGE === '1';

type Stores = Partial<Record<string, Array<Record<string, unknown>>>>;
const loadStores = (): Stores => (JSON.parse(readFileSync(PATH, 'utf8')) as { stores: Stores }).stores;

describe.skipIf(!SHARD || !existsSync(PATH))('skill meters refit — derive a shard', () => {
  it('derives the analysed-game rows both ways', () => {
    const [i, n] = (SHARD ?? '0/1').split('/').map(Number);
    const stores = loadStores();
    const prefs = (stores.profiles?.[0]?.preferences ?? {}) as { chessComUsername?: string; lichessUsername?: string };
    const identity = { chessComUsername: prefs.chessComUsername ?? null, lichessUsername: prefs.lichessUsername ?? null, profileName: (stores.profiles?.[0]?.name as string | undefined) ?? null };
    const games = ((stores.games ?? []) as unknown as GameRecord[])
      .filter((g) => Array.isArray(g.annotations) && g.annotations.length > 0)
      .filter((_, k) => k % n === i);
    const before: HeldRow[] = [];
    const after: HeldRow[] = [];
    for (const g of games) {
      const color = resolvePlayerColor(g, identity);
      if (!color) continue;
      const c = new Chess();
      try { c.loadPgn(g.pgn); } catch { continue; }
      // The game's own boards: a game set up from a position starts there.
      const moves = c.history({ verbose: true });
      if (moves.length === 0) continue;
      const fens = [moves[0].before, ...moves.map((m) => m.after)];
      const at = Date.parse(g.date) || 0;
      for (const ply of capabilityPliesFromAnnotations(g.annotations as MoveAnnotation[], color, fens)) {
        for (const [rows, posed] of [[before, !ply.bestSan], [after, true]] as const) {
          for (const o of capabilityOutcomes({
            fenBefore: ply.fenBefore, playedSan: ply.playedSan, moverColor: color, cpLoss: ply.cpLoss,
            ...(posed && ply.alsoPosed ? { alsoPosed: ply.alsoPosed } : {}),
            ...(ply.bestSan ? { bestSan: ply.bestSan } : {}), ...(ply.historySans ? { historySans: ply.historySans } : {}),
          })) {
            rows.push({ tag: o.tag, outcome: o.outcome, fen: ply.fenBefore, playedSan: ply.playedSan, recordedAt: at, prompted: ply.prompted ?? false, origin: 'review' });
          }
        }
      }
    }
    writeFileSync(`${OUT}/refit-rows-${i}.json`, JSON.stringify({ games: games.length, before, after }));
  }, 3_600_000);
});

describe.skipIf(!MERGE || !existsSync(PATH))('skill meters refit — compare', () => {
  it('prints the meters for each scoring and table', () => {
    const stores = loadStores();
    const live = ((stores.capabilityEvidence ?? []) as unknown as HeldRow[]).filter((r) => r.origin !== 'review');
    const slips = (stores.misconceptionTags ?? []) as unknown as SkillRows['slips'];
    const startRating = Number(stores.profiles?.[0]?.currentRating ?? 1200);
    const before: HeldRow[] = [];
    const after: HeldRow[] = [];
    let games = 0;
    for (const f of readdirSync(OUT).filter((x) => /^refit-rows-\d+\.json$/.test(x))) {
      const d = JSON.parse(readFileSync(`${OUT}/${f}`, 'utf8')) as { games: number; before: HeldRow[]; after: HeldRow[] };
      games += d.games;
      before.push(...d.before);
      after.push(...d.after);
    }
    for (const tablePath of (process.env.SKILL_REFIT_TABLES ?? 'src/data/skill-difficulty.json').split(',')) {
      const table = (JSON.parse(readFileSync(tablePath, 'utf8')) as { table: Partial<Record<string, { D: number; S: number }>> }).table;
      const difficultyOf = (tag: string): { difficulty: number; scale: number } | null => {
        const parent = parentSkillTag(tag);
        const c = table[tag] ?? (parent ? table[parent] : undefined);
        return c ? { difficulty: c.D, scale: c.S } : null;
      };
      for (const [label, rows] of [['costly ply posed nothing', before], ['costly ply posed', after]] as const) {
        const held = [...live, ...rows];
        console.log(`\n== ${tablePath} · ${label}: ${games} games, ${rows.length} rows, ${rows.filter((r) => r.outcome === 'broken').length} broken`);
        for (const m of computeSkillMeters(eventsFromRecord(held, slips, difficultyOf, liveSlipBreaks), startRating)) {
          console.log(`${m.label.padEnd(22)} ${m.rated ? `Lv${m.level} ~${Math.round(m.rating)} rd${Math.round(m.rd)}` : 'not rated'} events=${m.events}`);
        }
      }
    }
  }, 900_000);
});
