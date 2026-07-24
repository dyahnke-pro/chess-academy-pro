/**
 * OFFLINE FULL-GAME NARRATION HARNESS (David 2026-07-23: "improve efficiency"
 * + "I want to see an entire game's narration").
 *
 * Drives the REAL production narration (`generateReviewNarration`) over a whole
 * game in SECONDS — no browser, no Vercel build, no flaky IndexedDB seed. The
 * only mock is the engine transport: `stockfishEngine.analyzePosition` is
 * routed to the pre-installed `/usr/games/stockfish` binary (real evals + real
 * PV), and `coachApi.voiceFacts/voiceReviewLines` return '' so we read the RAW
 * deterministic facts (what the house-voice warmer voices when it doesn't fire
 * — exactly what we're dialing). Classification uses the SAME `classifyCpLoss`
 * thresholds production uses (imported, not re-implemented) so a move that's a
 * mistake on prod is a mistake here.
 *
 * It is NOT part of the gate suite (spawns a real engine, slow). Run on demand:
 *   REVIEW_HARNESS=1 AUDIT_PGN='1. e4 c5 …' AUDIT_STUDENT=black AUDIT_RESULT=0-1 \
 *     npx vitest run src/services/reviewFullGameNarration.harness.test.ts --reporter=basic
 * Defaults to Danya's fABTn305 Grand Prix (he's Black, 0-1).
 */
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const HARNESS_ON = process.env.REVIEW_HARNESS === '1';
const SF = '/usr/games/stockfish';
const DEPTH = Number(process.env.HARNESS_DEPTH || 14);

// ── Real Stockfish driver (White-POV centipawns, cached by FEN) ──────────────
const evalCache = new Map<string, { evaluation: number; bestMove: string; pv: string[] }>();
function analyzeReal(fen: string): Promise<{ evaluation: number; bestMove: string; pv: string[] }> {
  const cached = evalCache.get(fen);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const sf = spawn(SF);
    let cp: number | null = null;
    let mate: number | null = null;
    let pv: string[] = [];
    let best = '';
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      try { sf.kill(); } catch { /* noop */ }
      // score cp/mate are side-to-move relative → flip to White POV when Black
      // is to move.
      const stmSign = fen.split(' ')[1] === 'b' ? -1 : 1;
      const whiteCp = mate !== null
        ? (mate > 0 ? 30000 : -30000) * stmSign
        : (cp ?? 0) * stmSign;
      const out = { evaluation: whiteCp, bestMove: best, pv };
      evalCache.set(fen, out);
      resolve(out);
    };
    sf.stdout.on('data', (d: Buffer) => {
      const s = d.toString();
      for (const line of s.split('\n')) {
        const mcp = line.match(/score cp (-?\d+)/);
        if (mcp) { cp = parseInt(mcp[1], 10); mate = null; }
        const mm = line.match(/score mate (-?\d+)/);
        if (mm) { mate = parseInt(mm[1], 10); }
        const mpv = line.match(/ pv (.+)$/);
        if (mpv) pv = mpv[1].trim().split(/\s+/);
        const mb = line.match(/^bestmove (\S+)/);
        if (mb) { best = mb[1]; finish(); }
      }
    });
    sf.on('error', finish);
    sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
    setTimeout(finish, 15000);
  });
}

// Route the app's engine facade to the real binary. Shape matches
// stockfishEngine.analyzePosition: { evaluation (White-POV cp), bestMove (uci),
// topLines: [{ moves: uci[], evaluation }] }.
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn(async (fen: string) => {
      const r = await analyzeReal(fen);
      return { evaluation: r.evaluation, bestMove: r.bestMove || null, topLines: r.pv.length ? [{ moves: r.pv, evaluation: r.evaluation }] : [] };
    }),
  },
}));

// Read the RAW deterministic facts — the warmer is a no-op here.
vi.mock('./coachApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./coachApi')>();
  return { ...actual, voiceFacts: vi.fn(async () => ''), voiceReviewLines: vi.fn(async () => []) };
});

const PGN = process.env.AUDIT_PGN
  || '1. e4 c5 2. Nc3 g6 3. f4 Bg7 4. Nf3 Nc6 5. Bb5 Nd4 6. O-O Nxb5 7. Nxb5 d6 8. d3 Nf6 9. Qe1 Bg4 10. Qh4 Qd7 11. Nc3 Bxf3 12. Rxf3 O-O-O 13. e5 dxe5 14. fxe5 Ng4 15. Ne4 Bxe5 16. Nxc5 Bd4+ 17. Kh1 Bxc5 18. Bf4 h5 19. Re1 f6 20. Be3 Bxe3 21. Rfxe3 Nxe3 22. Rxe3 Qd4 23. Qe1 e5 24. Re4 Qxb2 25. Rc4+ Kb8 26. h3 Rc8 27. Rb4 Qxc2 28. Qe4 Qc1+ 29. Kh2 Qf4+ 30. Qxf4 exf4 0-1';
const STUDENT = (process.env.AUDIT_STUDENT || 'black').toLowerCase() === 'white' ? 'white' : 'black';
const RESULT = process.env.AUDIT_RESULT || '0-1';
const OPENING = process.env.AUDIT_OPENING || 'Sicilian Defense: Grand Prix Attack';
const RATING = Number(process.env.AUDIT_RATING || 1500);

describe.runIf(HARNESS_ON)('offline full-game narration harness', () => {
  it('prints the entire game narration (why → how, every ply)', { timeout: 600000 }, async () => {
    const { classifyCpLoss } = await import('./gameAnalysisService');
    const { generateReviewNarration } = await import('./coachFeatureService');
    type ReviewMoveInput = import('./coachFeatureService').ReviewMoveInput;

    // Load HIS corpus so buildOpeningMoveDetail can ground the opening moves
    // (prod loads it over the network; here we inject it from disk). Masters DB
    // is the prod fallback — not loaded here.
    try {
      const { __setHisPlayDbForTests } = await import('./hisPlayLookup');
      const { readFileSync } = await import('node:fs');
      __setHisPlayDbForTests(JSON.parse(readFileSync('public/data/danya-play-db.json', 'utf8')));
    } catch { /* opening detail falls through to piece-activity */ }

    // Replay → SAN + FEN chain.
    const chess = new Chess();
    const sans = PGN.replace(/\d+\.(\.\.)?\s*/g, '').replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim()
      .split(/\s+/).filter((t) => t && !/^\.+$/.test(t));
    const fens: string[] = [chess.fen()];
    const played: string[] = [];
    for (const san of sans) { const mv = chess.move(san); if (!mv) break; played.push(mv.san); fens.push(chess.fen()); }

    // Eval curve (real engine, White POV).
    const evals: number[] = [];
    for (const fen of fens) evals.push((await analyzeReal(fen)).evaluation);

    // Build ReviewMoveInput[] with production classification.
    const moves: ReviewMoveInput[] = played.map((san, i) => {
      const isWhiteMove = i % 2 === 0;
      const before = evals[i];
      const after = evals[i + 1];
      const cpLoss = isWhiteMove ? before - after : after - before;
      const classification = classifyCpLoss(cpLoss, before, after, isWhiteMove, san.includes('#'));
      return {
        ply: i + 1,
        san,
        isCoachMove: false,
        classification,
        evaluation: after,
        preMoveEval: before,
        bestMove: evalCache.get(fens[i])?.bestMove || null,
        fenAfter: fens[i + 1],
      };
    });

    const narration = await generateReviewNarration({
      moves,
      playerColor: STUDENT,
      openingName: OPENING,
      result: RESULT,
      playerRating: RATING,
      coachNarration: 'full',
      uncapped: false, // capped/production walk
    });

    const bySeg = new Map(narration.segments.map((s) => [s.ply, s]));
    const studentParity = STUDENT === 'white' ? 1 : 0;
    const out: string[] = [];
    out.push(`════════ ${OPENING} — student=${STUDENT}, ${RESULT} (depth ${DEPTH}) ════════`);
    out.push(`moves=${moves.length}  segments=${narration.segments.length}`);
    out.push(`INTRO: ${narration.intro}`);
    out.push('');
    for (const m of moves) {
      const seg = bySeg.get(m.ply);
      const white = m.ply % 2 === 1;
      const you = (m.ply % 2) === studentParity ? 'YOU ' : 'opp ';
      const num = white ? `${Math.ceil(m.ply / 2)}.` : `${Math.ceil(m.ply / 2)}...`;
      const cls = m.classification === 'good' || m.classification === 'great' || m.classification === 'brilliant' ? '' : `[${m.classification}] `;
      const text = seg?.narration ? seg.narration : '(silent)';
      out.push(`p${String(m.ply).padStart(2)} ${you}${num.padStart(6)} ${m.san.padEnd(7)} ${cls}${text}`);
    }
    if (narration.closing) { out.push(''); out.push(`CLOSING: ${narration.closing}`); }
    out.push('════════════════════════════════════════════════════════════');
    const body = out.join('\n');
    console.log('\n' + body + '\n');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(process.env.HARNESS_OUT || '/tmp/danya-narration.txt', body);

    expect(narration.segments.length).toBeGreaterThan(0);
  });
});

// Guard so the file isn't an empty suite when REVIEW_HARNESS is off.
describe.runIf(!HARNESS_ON)('offline full-game narration harness (skipped)', () => {
  it('set REVIEW_HARNESS=1 to run', () => { expect(existsSync(SF) || true).toBe(true); });
});
