// READ THE COMPUTED TAB PLANS AGAINST THEIR BOARDS (2026-10-29). Picks N of the
// computed plans the coverage measure found (spread over the courses and both
// seats), rebuilds each through the page's own path (`tabPlanFor` on the stored
// trees) and checks every claim with chess.js on the board it is made about:
//
//   board      the plan's board is the line + its approach, replayed
//   middlegame both kings settled, no exchange half-played (`isMiddlegameBoard`)
//   gate C     the plan's line moves are the whole tab line: its board is the
//              line's end, or the middlegame its approach carries it on to
//   seat       every break is the student's (…X for Black), every route a
//              student piece standing on its first square
//   pawn       a break's pawn is on its file; a route's hops are the piece's
//              own geometry
//   counts     every share ≤ 100%
//   line       the plan line is legal from its first board, its arrows on
//              its moves, and reaches the tabia after the approach
//   structure  the card's structure sentence: each pawn it names is there,
//              owned as said, isolated / passed as said; a pawn on its
//              starting square is flagged for a second look; each lever it
//              names has a pawn on its file
//
// Prints each plan with its board for a read by eye.
//
//   npx tsx scripts/all-openings/tab-plan-read.ts <coverage-label> [N]
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';

const ROOT = new URL('../..', import.meta.url).pathname;
(globalThis as unknown as { fetch: unknown }).fetch = async (url: string) => {
  const path = String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  const file = join(ROOT, 'public', path);
  if (!existsSync(file)) return { ok: false, status: 404, json: async () => null, text: async () => '' };
  const text = readFileSync(file, 'utf8');
  return { ok: true, status: 200, json: async () => JSON.parse(text) as unknown, text: async () => text };
};
const { tabPlanFor } = await import('../../src/services/computedPlan');
const { storedTreeAnswer } = await import('../../src/services/deepTree');
const { tabLineSans } = await import('../../src/services/tabLine');
const { isMiddlegameBoard } = await import('../../src/services/gamesCourse');
const { tabiaStructure } = await import('../../src/services/tabiaStructure');
type OpeningRecord = import('../../src/types').OpeningRecord;
type MiddlegamePlan = import('../../src/types').MiddlegamePlan;

const label = process.argv[2] ?? 'after';
const N = Number(process.argv[3] ?? 30);
const cov = JSON.parse(readFileSync(join(ROOT, `audit-reports/tab-plan-coverage-${label}.json`), 'utf8')) as {
  rows: Array<{ source: string; openingId: string; tab: string; lineIndex: number; side: 'white' | 'black'; shown: string }>;
};
const read = (f: string): unknown => JSON.parse(readFileSync(join(ROOT, 'src/data', f), 'utf8'));
const openings = [read('repertoire.json'), read('pro-repertoires.json'), read('gambits.json'), read('anti-openings.json')]
  .flatMap((r) => (Array.isArray(r) ? r : (r as { openings: unknown[] }).openings)) as OpeningRecord[];

// Spread over the list: every k-th computed plan.
const computed = cov.rows.filter((r) => r.shown === 'computed');
const step = computed.length / Math.min(N, computed.length);
const picked = Array.from({ length: Math.min(N, computed.length) }, (_, i) => computed[Math.floor(i * step)]);

const replay = (sans: readonly string[]): Chess | null => { const c = new Chess(); try { for (const s of sans) c.move(s); } catch { return null; } return c; };
const pos = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');
const PIECE: Record<string, string> = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
function geometryOk(piece: string, from: string, to: string): boolean {
  const df = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
  const dr = Math.abs(Number(from[1]) - Number(to[1]));
  if (piece === 'n') return (df === 1 && dr === 2) || (df === 2 && dr === 1);
  if (piece === 'b') return df === dr && df > 0;
  if (piece === 'r') return (df === 0) !== (dr === 0);
  if (piece === 'q') return (df === dr && df > 0) || ((df === 0) !== (dr === 0));
  return true;
}
function pawnsOf(c: Chess, color: 'w' | 'b'): string[] {
  return c.board().flat().filter((p) => p && p.type === 'p' && p.color === color).map((p) => p!.square);
}
function isIsolated(c: Chess, sq: string, color: 'w' | 'b'): boolean {
  const f = sq.charCodeAt(0);
  return !pawnsOf(c, color).some((p) => Math.abs(p.charCodeAt(0) - f) === 1);
}
function isPassed(c: Chess, sq: string, color: 'w' | 'b'): boolean {
  const f = sq.charCodeAt(0); const r = Number(sq[1]);
  const enemy = color === 'w' ? 'b' : 'w';
  return !pawnsOf(c, enemy).some((p) => Math.abs(p.charCodeAt(0) - f) <= 1 && (color === 'w' ? Number(p[1]) > r : Number(p[1]) < r));
}

interface Check { name: string; ok: boolean; note?: string }
const report: string[] = [];
let failed = 0; let flagged = 0;
for (const row of picked) {
  const opening = openings.find((o) => o.id === row.openingId)!;
  const plan = await tabPlanFor(opening, row.lineIndex, storedTreeAnswer) as MiddlegamePlan;
  const me: 'w' | 'b' = opening.color === 'white' ? 'w' : 'b';
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const tabLine = tabLineSans(opening, row.lineIndex);
  const approach = plan.approach ?? [];
  const toBoard = [...(plan.lineMoves ?? []), ...approach];
  const board = replay(toBoard);
  const checks: Check[] = [];
  checks.push({ name: 'board', ok: !!board && pos(board.fen()) === pos(plan.criticalPositionFen) });
  checks.push({ name: 'middlegame', ok: isMiddlegameBoard(toBoard), note: `board at ply ${toBoard.length}` });
  const lm = plan.lineMoves ?? [];
  // Gate C: the board is the line's own end, or the middlegame the games
  // carry it on to — never a board the line has left.
  const gateC = lm.length === tabLine.length && lm.every((s, i) => s === tabLine[i]);
  checks.push({ name: 'gate C', ok: gateC, note: approach.length ? `approach of ${approach.length} from the line's end` : 'at the line\'s end' });
  for (const b of plan.pawnBreaks) {
    const seatOk = me === 'b' ? b.move.startsWith('…') : !b.move.startsWith('…');
    const san = b.move.replace(/^…/, '');
    const file = san[0];
    const hasPawn = !!board && pawnsOf(board, me).some((p) => p[0] === file);
    checks.push({ name: `break ${b.move}`, ok: seatOk && hasPawn, note: seatOk ? (hasPawn ? `a ${me} pawn on the ${file}-file` : `NO ${me} pawn on the ${file}-file`) : 'WRONG SEAT' });
  }
  for (const m of plan.pieceManeuvers) {
    const sqs = m.route.split('–');
    const type = PIECE[m.piece.toLowerCase()];
    const at = board?.get(sqs[0] as Square);
    const ok = !!at && at.type === type && at.color === me && sqs.slice(1).every((s, i) => geometryOk(type, sqs[i], s));
    checks.push({ name: `route ${m.piece} ${m.route}`, ok, note: at ? `${at.color}${at.type} on ${sqs[0]}` : `nothing on ${sqs[0]}` });
  }
  const pcts = [...plan.overview.matchAll(/(\d+)%/g)].map((x) => Number(x[1]));
  checks.push({ name: 'counts', ok: pcts.every((p) => p <= 100) });
  const line = plan.playableLines?.[0];
  if (line) {
    const c = new Chess(line.fen);
    let legal = true;
    for (const s of line.moves) { try { c.move(s); } catch { legal = false; break; } }
    const after = new Chess(line.fen);
    for (const s of approach) after.move(s);
    const startOk = pos(line.fen) === pos(replay(lm)?.fen() ?? '');
    checks.push({ name: 'line', ok: legal && startOk && pos(after.fen()) === pos(plan.criticalPositionFen) && line.arrows.length === line.moves.length && line.moves.slice(0, approach.length).every((s, i) => s === approach[i]) });
  }
  const structure = board ? tabiaStructure(board.fen(), opening.color) : null;
  if (structure && board) {
    for (const m of structure.matchAll(/(Your|your|You're playing with|Their|their|They have|They hold|You hold|you|they) ([^.—]*?)pawn on ([a-h][1-8])/g)) {
      const owner = /^(Their|their|They|they)/.test(m[1]) ? them : me;
      const sq = m[3];
      const p = board.get(sq as Square);
      const there = !!p && p.type === 'p' && p.color === owner;
      const iso = /isolated/.test(m[0]) ? isIsolated(board, sq, owner) : true;
      const passed = /passed/.test(m[0]) ? isPassed(board, sq, owner) : true;
      const start = owner === 'w' ? sq[1] === '2' : sq[1] === '7';
      checks.push({ name: `structure ${sq}`, ok: there && iso && passed, note: `${there ? 'there' : 'NOT THERE'}${iso ? '' : ', NOT isolated'}${passed ? '' : ', NOT passed'}${start ? ', ON ITS START SQUARE (read by eye)' : ''}` });
      if (start) flagged += 1;
    }
    // A lever the sentence names ("with …c5 and …f6", "with c5") needs a pawn
    // of that side on that file.
    for (const m of structure.matchAll(/with ((?:…?[a-h][1-8](?:-[a-h][1-8])?)(?: and …?[a-h][1-8])*)/g)) {
      for (const lever of m[1].split(' and ')) {
        const who = lever.startsWith('…') ? 'b' : 'w';
        const file = lever.replace('…', '')[0];
        const ok = pawnsOf(board, who).some((p) => p[0] === file);
        checks.push({ name: `lever ${lever}`, ok, note: ok ? `a ${who} pawn on the ${file}-file` : `NO ${who} pawn on the ${file}-file` });
      }
    }
  }
  const bad = checks.filter((x) => !x.ok);
  failed += bad.length ? 1 : 0;
  report.push(`### ${opening.name} — ${row.tab} (${opening.id}, ${opening.color})`);
  report.push('');
  report.push(`- Line: ${tabLine.join(' ')}`);
  if (approach.length) report.push(`- The way here: ${approach.join(' ')}`);
  report.push(`- Plan: **${plan.title}** — ${plan.overview}`);
  report.push(`- Structure: ${structure ?? '(none)'}`);
  report.push(`- Checks: ${checks.map((x) => `${x.ok ? '✓' : '✗'} ${x.name}${x.note ? ` (${x.note})` : ''}`).join('; ')}`);
  report.push('');
  report.push('```');
  report.push(board ? board.ascii() : '(no board)');
  report.push('```');
  report.push('');
}
const head = `${picked.length} computed plans read, ${failed} with a failed check, ${flagged} structure claims on a start-square pawn (read by eye).`;
console.log(head);
writeFileSync(join(ROOT, `audit-reports/tab-plan-read-${label}.md`), `${head}\n\n${report.join('\n')}`);
console.log(report.join('\n'));
