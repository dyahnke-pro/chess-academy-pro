import { it } from 'vitest';
import fs from 'node:fs';
import { boardReadFacts } from './boardReadFacts';
it('probe', async () => {
  const ids = new Set(JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user-chess-academy-pro/0f88d73e-3ffc-51d5-9748-a55ad2122b96/scratchpad/wrong-ids.json', 'utf8')) as string[]);
  const boards = fs.readFileSync('audit-reports/danya-havecheck/board-facts-2026-11-19-unlocked.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((b) => ids.has(b.id));
  const out: string[] = [];
  for (const b of boards) {
    const lines = (b.lines ?? []).map((l: { moves: string[]; cp: number | null; mate: number | null }, i: number) => ({ rank: i + 1, evaluation: l.mate != null ? (l.mate > 0 ? 100000 : -100000) : (l.cp ?? 0), moves: l.moves, mate: l.mate, depth: 16 }));
    try {
      const r = await boardReadFacts({ fen: b.fen, studentColor: b.fen.split(' ')[1], rating: 1600, before: lines, read: async () => null, withhold: false, tense: 'now' as never, history: [], theory: false, readTempting: true, engineFutures: false, studentNeedContext: null, story: null });
      out.push(JSON.stringify({ id: b.id, facts: r.facts.map((f) => `[${(f as {kind:string}).kind}] ${(f as {text:string}).text}`) }));
    } catch (e) { out.push(JSON.stringify({ id: b.id, err: String(e).slice(0, 200) })); }
  }
  fs.writeFileSync('/tmp/claude-0/-home-user-chess-academy-pro/0f88d73e-3ffc-51d5-9748-a55ad2122b96/scratchpad/probe.jsonl', out.join('\n'));
}, 600000);
