// THE REVIEW'S PLAYED-OUT LINES, READ BACK WITH A REAL ENGINE.
//
// The review plays the engine's stronger line out on the board, one spoken
// sentence per ply (`playBetterLineOut`, and the shot sequence). This drives
// that voice over REAL games: at every position the engine's own line for the
// side to move, narrated as the review narrates it for a student in that seat.
//
// It counts the four defects found on the Tactics tab (2026-10-03) in what the
// line says — a motif credited to the opponent's reply, a commentary clause on
// a reply, "trains on … pressure they have to answer" after the line has
// already made its point, and the king's clause on a forced reply — and holds
// each at zero. (The student's own FREE king move keeps the positional teacher;
// it is counted separately, as `kingClauseFree`, not held.) Report: audit-reports/projected-line-voice.json.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { computePlyFacts, type PrevCaptureContext } from './pvPlayback';
import { SAMPLE_GAMES } from './reviewSampleGames';
import { projectedLineVoice, type ProjectedLinePly } from './projectedLineVoice';
import { proofCut } from './exchangeLedger';

const DEPTH = 10;
const MAX_PLIES = 6;

class Engine {
  private p: ChildProcessWithoutNullStreams;
  private buf = '';
  private waiting: ((pv: string[]) => void) | null = null;
  private pv: string[] = [];

  constructor() {
    this.p = spawn('node', ['node_modules/stockfish/bin/stockfish-18-lite-single.js']);
    this.p.stdout.on('data', (d: Buffer) => {
      this.buf += d.toString();
      const lines = this.buf.split('\n');
      this.buf = lines.pop() ?? '';
      for (const raw of lines) {
        const l = raw.trim();
        const m = /\bpv (.+)$/.exec(l);
        if (l.startsWith('info ') && m) this.pv = m[1].split(/\s+/).filter(Boolean);
        else if (l.startsWith('bestmove')) {
          const done = this.waiting;
          this.waiting = null;
          if (done) done([...this.pv]);
        }
      }
    });
    this.p.stdin.write('uci\nisready\n');
  }

  async line(fen: string): Promise<string[]> {
    this.pv = [];
    return new Promise<string[]>((resolve) => {
      this.waiting = resolve;
      this.p.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
    });
  }

  stop(): void { try { this.p.kill(); } catch { /* gone */ } }
}

function playLine(fen: string, uci: readonly string[]): ProjectedLinePly[] {
  const c = new Chess(fen);
  const out: ProjectedLinePly[] = [];
  let prev: PrevCaptureContext = { square: null, capturedValue: 0 };
  const PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  for (const u of uci.slice(0, MAX_PLIES)) {
    const fenBefore = c.fen();
    let mv: ReturnType<Chess['move']>;
    try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u.slice(4) : undefined }); } catch { break; }
    out.push({
      san: mv.san, moverColor: mv.color === 'w' ? 'white' : 'black', fenBefore, fenAfter: c.fen(),
      facts: computePlyFacts(fenBefore, c.fen(), mv, prev),
    });
    prev = { square: mv.to, capturedValue: mv.captured ? PTS[mv.captured] ?? 0 : 0 };
  }
  return out;
}

const MOTIF = /\b(lands?|landing|sets? up|setting up) an? /i;
const PLAIN_REPLY = /^(They (have to )?(answer|take|play)\b|[^ ]+ — checkmate\.$)/;
const TRAINS = /trains on .* pressure they have to answer/i;
const KING = /steps toward safety|king marches up/i;

interface Tape { game: string; ply: number; seat: 'white' | 'black'; mode: string; lines: Array<{ san: string; who: 'you' | 'they'; text: string | null }> }

describe('projected-line voice over real games', () => {
  let eng: Engine;
  beforeAll(() => { eng = new Engine(); }, 60_000);
  afterAll(() => { eng.stop(); });

  it('never credits a reply, comments on a reply, or talks past the point', async () => {
    const tapes: Tape[] = [];
    const counts = { lines: 0, kingClauseFree: 0, plies: 0, opponentMotif: 0, opponentCommentary: 0, trainsAfterPoint: 0, trainsTotal: 0, kingClause: 0 };
    for (const g of SAMPLE_GAMES) {
      const c = new Chess();
      c.loadPgn(g.pgn);
      const sans = c.history();
      const r = new Chess();
      for (let i = 0; i < sans.length; i += 1) {
        const fen = r.fen();
        r.move(sans[i]);
        const uci = await eng.line(fen);
        const plies = playLine(fen, uci);
        if (plies.length < 2) continue;
        const seat = plies[0].moverColor;
        const proof = proofCut(fen, plies.map((p) => p.san), seat === 'white' ? 'w' : 'b');
        const won = !!proof && (proof.mate || (proof.ledger?.netPawns ?? 0) > 0);
        const end = proof && won ? Math.min(Math.max(1, proof.plies), plies.length) : plies.length;
        for (const mode of ['walk', 'shot'] as const) {
          const voice = projectedLineVoice(plies, seat, { teachQuiet: mode === 'walk', explainTemptation: mode === 'walk' });
          counts.lines += 1;
          const lines = plies.map((p, k): Tape['lines'][number] => ({ san: p.san, who: p.moverColor === seat ? 'you' : 'they', text: voice[k] }));
          tapes.push({ game: g.id, ply: i + 1, seat, mode, lines });
          lines.forEach((l, k) => {
            counts.plies += 1;
            if (!l.text) return;
            if (l.who === 'they' && MOTIF.test(l.text)) counts.opponentMotif += 1;
            if (l.who === 'they' && !PLAIN_REPLY.test(l.text)) counts.opponentCommentary += 1;
            if (TRAINS.test(l.text)) { counts.trainsTotal += 1; if (k >= end) counts.trainsAfterPoint += 1; }
            // A king clause on a FORCED king move (in check, or the only legal
            // move) or on any reply — the describer guessing at a move that
            // had no choice. A student's own free king walk keeps its teacher.
            const b = new Chess(plies[k].fenBefore);
            const forced = b.inCheck() || b.moves().length === 1;
            if (KING.test(l.text) && !forced && l.who === 'you') counts.kingClauseFree += 1;
            if (KING.test(l.text) && (forced || l.who === 'they')) counts.kingClause += 1;
          });
        }
      }
    }
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/projected-line-voice.json', JSON.stringify({ generatedAt: new Date().toISOString(), counts, tapes }, null, 2));
    console.log('[projected-line-voice]', JSON.stringify(counts));
    expect(counts.lines).toBeGreaterThan(50);
    expect(counts.opponentMotif).toBe(0);
    expect(counts.opponentCommentary).toBe(0);
    expect(counts.trainsAfterPoint).toBe(0);
    expect(counts.kingClause).toBe(0);
  }, 900_000);
});
