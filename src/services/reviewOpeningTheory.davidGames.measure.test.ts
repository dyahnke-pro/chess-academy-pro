// The Review theory lecture, read on David's own games (his "Send my data"
// drop) against the real masters file. A READING instrument, not a gate: it
// prints every opening line the coach would say so it can be graded by hand.
//   THEORY_MEASURE=1 npx vitest run src/services/reviewOpeningTheory.davidGames.measure.test.ts
import { it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildOpeningTheoryLecture, buildTheoryLectureBeats, lectureNoteSelector, lectureSequence, resolveCuratedOpeningIdeas } from './reviewOpeningTheory';
import { setOpeningIdentity } from './openingIdentity';
import { openingNameForKey } from './coachFeatureService';
import { loadFullCorpus } from '../test/loadFullCorpus';

const DROP = 'audit-reports/.fixtures/data-drop-david.json';
const MASTERS = 'public/data/openings-masters-db.json';
const GAMES = (process.env.THEORY_GAMES ?? 'chesscom-1038626480,chesscom-1034830120,chesscom-1040709576').split(',');
const ME = 'Knight_Mare_01';

interface Ann { evaluation: number | null }
interface G { id: string; pgn: string; white: string; black: string; openingId?: string; annotations?: Ann[] }

it.runIf(process.env.THEORY_MEASURE === '1' && existsSync(DROP) && existsSync(MASTERS))('theory lecture on David\'s games', async () => {
  expect(loadFullCorpus().reduce((n, c) => n + c.notes, 0)).toBeGreaterThan(10_000);
  const db = JSON.parse(readFileSync(MASTERS, 'utf8'));
  setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')));
  const games = (JSON.parse(readFileSync(DROP, 'utf8')).stores.games as G[]).filter((g) => GAMES.includes(g.id));
  const out: string[] = [];
  for (const g of games) {
    const c = new Chess();
    c.loadPgn(g.pgn);
    const sans = c.history();
    const r = new Chess();
    const fens = [r.fen()];
    for (const s of sans) { r.move(s); fens.push(r.fen()); }
    const studentColor = g.white === ME ? 'white' as const : 'black' as const;
    const ann = g.annotations ?? [];
    const gameReads = sans.map((_, i) => {
      const before = i === 0 ? 0 : ann[i - 1]?.evaluation;
      const now = ann[i]?.evaluation;
      if (typeof before !== 'number' || typeof now !== 'number') return null;
      return { cpLoss: Math.max(0, (before - now) * (i % 2 === 0 ? 1 : -1)), replyLineUci: [] };
    });
    const name = openingNameForKey((g.openingId ?? null) as Parameters<typeof openingNameForKey>[0]) ?? 'this opening';
    const lookup = async (fen: string) => (await import('./masterPlayLookup')).lookupMasterPlay(fen, { triggeredBy: 'manual', surface: 'game-review', __testLocalDb: db } as never);
    const pos = db.positions ?? db;
    const movesAt = (f: string) => { const v = pos[f.split(' ').slice(0, 4).join(' ')]; return Array.isArray(v) ? v : v?.moves ?? null; };
    const lec = await buildOpeningTheoryLecture(fens, sans, name, { lookup, gameReads, studentColor, movesAt });
    out.push(`\n=== ${g.id} — ${name} — David is ${studentColor} — ${sans.slice(0, 16).join(' ')}`);
    if (!lec) { out.push('(no lecture)'); continue; }
    const beats = buildTheoryLectureBeats(lec, resolveCuratedOpeningIdeas(name, studentColor) ?? [], studentColor, lectureNoteSelector(name, studentColor));
    // THE TAPE, as performed: each line with the move it is said on.
    let onMove = '(no move)';
    for (const st of lectureSequence(beats)) {
      if (st.kind === 'position') { onMove = '(position)'; continue; }
      if (st.kind === 'move') { onMove = st.san; continue; }
      const line = st.moveSan ? `${st.moveSan}${st.text ? ` — ${st.text}` : ''}` : st.text;
      if (line) out.push(`  [on ${onMove}] ${line}`);
    }
    for (const b of beats) for (const e of b.explore ?? []) out.push(`  ▸ explore ${e.san}: ${e.steps.map((x) => x.san).join(' ')}`);
  }
  const text = out.join('\n');
  writeFileSync(process.env.THEORY_OUT ?? 'audit-reports/theory-lecture-david.txt', text);
  console.log(text);
}, 600_000);
