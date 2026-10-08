/**
 * THE PROOF BACKLOG, MEASURED (one-coach P3, 2026-10-07). Runs Review over real
 * corpus games and counts, per fact kind, the CONCLUSIONS that spoke without
 * the proof their computer should have handed in. Writes
 * `audit-reports/proof-backlog.json` — the work list for P3, biggest first.
 * The engine is mocked (legal lines, not best ones), so the counts rank
 * producers; they are not a production rate. Since 2026-10-08 it is also the
 * gate: the backlog is zero and must stay zero.
 */
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';
import { mkdirSync, writeFileSync } from 'node:fs';

vi.mock('./stockfishEngine', async () => {
  const { Chess } = await import('chess.js');
  const legalLine = (fen: string, plies: number): string[] => {
    const uci: string[] = [];
    let c: InstanceType<typeof Chess>;
    try { c = new Chess(fen); } catch { return uci; }
    for (let i = 0; i < plies; i++) {
      const ms = c.moves({ verbose: true });
      if (!ms.length) break;
      const m = ms[i % ms.length]; // deterministic (no Math.random — banned)
      uci.push(`${m.from}${m.to}${m.promotion ?? ''}`);
      c.move(m.san);
    }
    return uci;
  };
  return {
    stockfishEngine: {
      analyzePosition: vi.fn(async (fen: string) => {
        const line = legalLine(fen, 6);
        return { evaluation: 0, bestMove: line[0] ?? null, topLines: line.length ? [{ moves: line, evaluation: 0 }] : [] };
      }),
    },
  };
});

import { generateReviewNarration } from './coachFeatureService';
import type { ReviewMoveInput } from './coachFeatureService';
import { onCoachDecision } from './coachDecisionEvents';
import modelGamesRaw from '../data/model-games.json';

const PIECE_PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
interface RawGame { id?: string; pgn?: string; openingId?: string; studentSide?: string }
const games = (Array.isArray(modelGamesRaw) ? modelGamesRaw : []) as RawGame[];

/** Strip PGN to bare SANs (headers + move numbers + result removed). */
function pgnToSans(pgn: string): string[] {
  const c = new Chess();
  try { c.loadPgn(pgn); return c.history(); } catch { /* fall through */ }
  // Manual fallback for header-less movetext.
  const toks = pgn.replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, '').replace(/(1-0|0-1|1\/2-1\/2|\*)/g, '').trim().split(/\s+/).filter(Boolean);
  const g = new Chess(); const sans: string[] = [];
  for (const t of toks) { try { const mv = g.move(t); if (!mv) break; sans.push(mv.san); } catch { break; } }
  return sans;
}

function synthMoves(sans: string[]): ReviewMoveInput[] {
  const c = new Chess();
  const out: ReviewMoveInput[] = [];
  let prevEval = 20;
  sans.forEach((san, i) => {
    const fenBefore = c.fen();
    // Every 4th ply is marked a synthetic mistake WITH a real legal best-move
    // (≠ the played move), so the best-line facets — explainBestMoveGrounded /
    // describeMoveGeometry(bestMove) / the "here's how you take advantage" walk
    // and their seat-stamping — actually FIRE and get scanned across the corpus
    // (the blind spot that let "a your passed pawn" hide; prod line-read 2026-07-23).
    let bestMove: string | null = null;
    let classification = 'good';
    if (i % 4 === 3) {
      try {
        const alt = new Chess(fenBefore).moves({ verbose: true }).find((m) => m.san !== san);
        if (alt) { bestMove = `${alt.from}${alt.to}${alt.promotion ?? ''}`; classification = 'mistake'; }
      } catch { /* leave good */ }
    }
    c.move(san);
    // White-POV material balance × 100 — a real, board-derived eval so the
    // [eval] attribution has an honest number to explain (no mate sentinels).
    let bal = 0;
    for (const row of c.board()) for (const cell of row) if (cell && cell.type !== 'k') bal += (cell.color === 'w' ? 1 : -1) * (PIECE_PTS[cell.type] ?? 0);
    const evaluation = bal * 100;
    out.push({
      ply: i + 1, san, isCoachMove: (i + 1) % 2 === 0,
      classification, evaluation, preMoveEval: prevEval, bestMove, fenAfter: c.fen(),
    } as unknown as ReviewMoveInput);
    prevEval = evaluation;
  });
  return out;
}


describe('proof backlog — which producers owe a proof', { timeout: 600_000 }, () => {
  it('measures it on real games', async () => {
    const kinds: Record<string, number> = {};
    let rows = 0; let unproven = 0;
    const off = onCoachDecision((r) => { rows += 1; unproven += r.unproven; for (const k of r.unprovenKinds) kinds[k] = (kinds[k] ?? 0) + 1; });
    const picked = games.filter((g) => g.pgn && pgnToSans(g.pgn).length >= 40).slice(0, Number(process.env.BACKLOG_GAMES ?? 2));
    // THE TAPE (one coach P1, 2026-10-07): every spoken review line, per ply,
    // so a change to the door is diffed by TEXT, not only by counts.
    const tape: Array<{ game: string | undefined; intro: string; plies: Array<{ ply: number; text: string }> }> = [];
    for (const g of picked) {
      const n = await generateReviewNarration({
        moves: synthMoves(pgnToSans(g.pgn ?? '')), playerColor: g.studentSide === 'black' ? 'black' : 'white',
        openingName: null, result: '*', playerRating: 1500, coachNarration: 'silent', uncapped: true,
      });
      tape.push({ game: g.id, intro: n.intro, plies: n.segments.map((sg) => ({ ply: sg.ply, text: sg.narration ?? '' })) });
    }
    off();
    const ranked = Object.entries(kinds).sort((a, b) => b[1] - a[1]);
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/review-tape-corpus.json', JSON.stringify(tape, null, 2));
    writeFileSync('audit-reports/proof-backlog.json', JSON.stringify({ games: picked.map((g) => g.id), rows, unproven, byKind: ranked }, null, 2));
    console.log(`proof backlog: ${unproven} unproven over ${rows} decisions — ${ranked.map(([k, n]) => `${k}:${n}`).join(' ')}`);
    expect(rows).toBeGreaterThan(0);
    // CLEARED 2026-10-08 (one-coach P3): every Review conclusion over this
    // corpus carries its proof. A new producer that speaks a conclusion bare
    // fails here — hand in the line, the squares or the count it found.
    expect(unproven, `unproven by kind: ${ranked.map(([k, n]) => `${k}:${n}`).join(' ')}`).toBe(0);
  });
});
