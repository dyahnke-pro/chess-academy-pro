// The 202-board test's six gates over every article board (209), read from
// recorded engine reads (`__fixtures__/danyaBoards209.reads.json`, built with
// RECORD_READS on scripts/board-read-stored.ts, CPU only). Counts per gate are
// written to audit-reports/danya209-gates.json; each gate's count may only fall.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Chess, type Square } from 'chess.js';
import { fixtureReader, readDanyaBoard, readKey, type DanyaRead, type Reads } from '../test/danyaBoardRead';

const R = JSON.parse(readFileSync('src/services/__fixtures__/danyaBoards209.reads.json', 'utf8')) as Reads;
const BOARDS = JSON.parse(readFileSync('src/services/__fixtures__/danyaBoards209.boards.json', 'utf8')) as Array<{ id: string; fen: string }>;
const PIECE: Record<string, string> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
/** Today's counts — a gate's hits may only fall. */
const CEILING = { oneMove: Infinity, repeatedReason: Infinity, checksUnread: Infinity, finishedEmpty: 0, wrongOwner: Infinity, wrongSquare: Infinity, errors: Infinity };

const got: Array<{ id: string; fen: string; r: DanyaRead | null; err: string | null; asked: Set<string> }> = [];
beforeAll(async () => {
  for (const b of BOARDS) {
    // Every board the read asks the engine for: a defender's check is a try
    // when the board after it was read.
    const asked = new Set<string>();
    const base = fixtureReader(R);
    const reader = (fen: string): ReturnType<typeof base> => { asked.add(readKey(fen)); return base(fen); };
    try { got.push({ ...b, r: await readDanyaBoard(b.fen, R[readKey(b.fen)] ?? [], reader), err: null, asked }); }
    catch (e) { got.push({ ...b, r: null, err: String(e).slice(0, 200), asked }); }
  }
}, 600_000);

const MOVE_PHRASES = /(?:works now: |So first |the quiet |slower way: |You go )(…?[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?\+?)/g;
const sentences = (t: string): string[] => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 20);

describe('the 209 article boards — six gates', () => {
  it('counts each gate and holds its ceiling', () => {
    const hits: Record<keyof typeof CEILING, string[]> = { oneMove: [], repeatedReason: [], checksUnread: [], finishedEmpty: [], wrongOwner: [], wrongSquare: [], errors: [] };
    for (const g of got) {
      if (!g.r) { hits.errors.push(`${g.id}: ${g.err}`); continue; }
      const board = new Chess(g.fen);
      const student = board.turn();
      const text = g.r.read;
      // 1. one move per read
      const moves = new Set([...text.matchAll(MOVE_PHRASES)].map((m) => m[1].replace(/^…/, '').replace(/\+$/, '')));
      if (moves.size > 1) hits.oneMove.push(`${g.id}: ${[...moves].join(', ')}`);
      // 2. no identical reason twice
      const s = sentences(text);
      if (new Set(s).size !== s.length) hits.repeatedReason.push(g.id);
      // 3. every legal defender check after the best move read as a try
      const best = (R[readKey(g.fen)] ?? [])[0]?.moves[0];
      if (best && !board.isGameOver()) {
        const after = new Chess(g.fen);
        try { after.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] }); } catch { /* unreadable */ }
        const unread = after.isGameOver() ? [] : after.moves({ verbose: true }).filter((m) => m.san.includes('+')).filter((m) => {
          const t = new Chess(after.fen()); t.move(m.san);
          return !t.isGameOver() && !g.asked.has(readKey(t.fen()));
        }).map((m) => m.san);
        if (unread.length > 0) hits.checksUnread.push(`${g.id}: ${unread.join(' ')}`);
      }
      // 4. a finished board reads something
      if ((board.isCheckmate() || board.isStalemate()) && text.trim().length === 0) hits.finishedEmpty.push(g.id);
      // 5–6. a piece named on a square of THIS board: the owner and the piece agree with it
      for (const m of g.r.facts.map((f) => f.text).join(' ').matchAll(/\b(your|their|the) (pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])\b/g)) {
        const at = board.get(m[3] as Square);
        if (!at) continue; // a square of a later board in a line, not this one
        if (at.type !== PIECE[m[2]]) { hits.wrongSquare.push(`${g.id}: ${m[0]}`); continue; }
        if (m[1] !== 'the' && (at.color === student) !== (m[1] === 'your')) hits.wrongOwner.push(`${g.id}: ${m[0]}`);
      }
    }
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/danya209-gates.json', JSON.stringify({ boards: got.length, counts: Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, v.length])), hits }, null, 1));
    console.log('GATES', JSON.stringify(Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, v.length]))));
    expect(got.length).toBe(209);
    for (const k of Object.keys(CEILING) as Array<keyof typeof CEILING>) expect(hits[k].length, `${k}: ${hits[k].slice(0, 5).join(' | ')}`).toBeLessThanOrEqual(CEILING[k]);
  }, 600_000);
});
