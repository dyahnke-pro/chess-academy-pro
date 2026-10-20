// Replays David's games (his data drop) through the incoming-motif recorder:
// how many rows each motif tag gets, and which come out green.
//   THREAT_ANSWER_MEASURE=1 [SHARD=i/n] npx vitest run src/services/threatAnswerEvidence.measure.test.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { it } from 'vitest';
import { Chess } from 'chess.js';
import { newThreatsAtTurn, threatAnswerOutcome, threatAnswersForGame } from './threatAnswerEvidence';
import { threatPliesFromAnnotations } from './autoAnalyzeGame';
import { replayPgnToFens } from './mistakePuzzleService';
import type { MoveAnnotation } from '../types';
import { summariseEvidence, capabilityProven, type CapabilityEvidenceRecord } from './capabilityEvidence';

const DROP = 'audit-reports/.fixtures/data-drop-david.json';
const ROWS = (i: number, n: number): string => `audit-reports/.fixtures/threat-answer-rows-${i}of${n}.json`;
function report(rows: CapabilityEvidenceRecord[], games: number, name: string): void {
  const profile = summariseEvidence(rows);
  const out: Record<string, unknown> = {};
  for (const [tag, e] of profile) out[tag] = { ...e, green: capabilityProven(e) };
  mkdirSync('audit-reports', { recursive: true });
  writeFileSync(`audit-reports/${name}.json`, JSON.stringify({ games, rows: rows.length, profile: out, sample: rows.filter((r) => r.outcome === 'broken').slice(0, 8) }, null, 1));
  console.log(JSON.stringify(out, null, 1));
}
// THREAT_ANSWER_MERGE=n folds the n shards' rows into one profile, in time order.
it.runIf(!!process.env.THREAT_ANSWER_MERGE)('merge the shards', () => {
  const n = Number(process.env.THREAT_ANSWER_MERGE);
  const all: CapabilityEvidenceRecord[] = [];
  let games = 0;
  for (let i = 1; i <= n; i++) { const s = JSON.parse(readFileSync(ROWS(i, n), 'utf8')) as { games: number; rows: CapabilityEvidenceRecord[] }; games += s.games; all.push(...s.rows); }
  report(all, games, process.env.THREAT_ANSWER_ENGINE === '1' ? 'threat-answer-david-engine' : 'threat-answer-david');
});
it.runIf(process.env.THREAT_ANSWER_MEASURE === '1' && existsSync(DROP))('incoming motifs on his record', () => {
  const d = JSON.parse(readFileSync(DROP, 'utf8')) as { stores: { games: Array<{ id: string; pgn: string; white: string; black: string; date?: string; annotations?: MoveAnnotation[] | null; promptedPlies?: number[] }> } };
  const counts = new Map<string, number>();
  for (const g of d.stores.games) { counts.set(g.white, (counts.get(g.white) ?? 0) + 1); counts.set(g.black, (counts.get(g.black) ?? 0) + 1); }
  const me = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const [shard, of] = (process.env.SHARD ?? '1/1').split('/').map(Number);
  const games = d.stores.games.filter((_, i) => i % of === shard - 1);
  const rows: CapabilityEvidenceRecord[] = [];
  const started = Date.now();
  games.forEach((g, gi) => {
    const student = g.white === me ? 'w' : 'b';
    const base = Date.parse(g.date ?? '') || Date.parse('2026-01-01');
    // WITH ENGINE GRADES (the backfill's own reader) when the game is analysed.
    if (process.env.THREAT_ANSWER_ENGINE === '1') {
      if (!g.annotations?.length) return;
      const plies = threatPliesFromAnnotations(g.annotations, student === 'w' ? 'white' : 'black', replayPgnToFens(g.pgn), g.promptedPlies ?? []);
      for (const a of threatAnswersForGame(plies)) rows.push({ id: `${g.id}:${a.ply}:${a.tag}`, tag: a.tag, outcome: a.outcome, fen: a.fen, playedSan: a.playedSan, posedImportance: a.posedImportance, recordedAt: base + a.ply, origin: 'review', prompted: a.prompted, sourceGameId: g.id });
      if (gi % 50 === 0) console.log(`[threat-answer ${shard}/${of}] ${gi}/${games.length} games, ${rows.length} rows, ${Math.round((Date.now() - started) / 1000)}s`);
      return;
    }
    const c = new Chess();
    try { c.loadPgn(g.pgn); } catch { return; }
    let prev: string | null = null;
    c.history({ verbose: true }).forEach((m, ply) => {
      const fen = m.before;
      const san = m.san;
      if (m.color === student) {
        for (const t of newThreatsAtTurn(fen, prev)) {
          const v = threatAnswerOutcome({ fen, playedSan: san, pattern: t.pattern, targets: t.targets });
          if (v) rows.push({ id: `${g.id}:${ply}:${t.pattern}`, tag: v.tag, outcome: v.outcome, fen, playedSan: san, posedImportance: v.posedImportance, recordedAt: base + ply, origin: 'review', prompted: false, sourceGameId: g.id });
        }
        prev = fen;
      }
    });
    if (gi % 50 === 0) console.log(`[threat-answer ${shard}/${of}] ${gi}/${games.length} games, ${rows.length} rows, ${Math.round((Date.now() - started) / 1000)}s`);
  });
  writeFileSync(ROWS(shard, of), JSON.stringify({ games: games.length, rows }));
  report(rows, games.length, `threat-answer-david-${shard}of${of}`);
}, 3_600_000);
