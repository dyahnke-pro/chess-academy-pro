// COMPUTER-ACCURACY AUDIT (2026-09-11, David: "dig through the computers … make
// sure they emit accurate info … evaluate the level of response vs my standard"
// + "test it from the end of the opening/middle game").
// NOT a gate — an evaluation harness. For REAL end-of-opening / middlegame
// positions (played out from opening lines) it feeds each voice-emitting
// computer a FAITHFUL Stockfish analysis (spawned /usr/games/stockfish,
// MultiPV 3, white-POV cp, UCI pv) AND a faithful perturbation probe (the
// engine's `eval` NNUE table, which positionFacts' leansOn clause needs), then:
//   • ACCURACY: every "<piece> on <sq>" claim must be true on the board
//     (chess.js); the "strongest move" must equal the oracle bestmove.
//   • QUALITY: the prose is printed for a human to judge vs the house standard.
// Run: npx vitest run src/services/computerAccuracy.audit.test.ts --reporter=verbose
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { Chess } from 'chess.js';

// Diagnostic harness, NOT a gate — it drives the real /usr/games/stockfish
// binary (apt v16) as an independent oracle. That binary is present in this
// sandbox but NOT in CI, so the whole suite skips when it's absent (never
// breaks `npm run test:run` for other sessions). Run it by hand with:
//   npx vitest run src/services/computerAccuracy.audit.test.ts --reporter=verbose
const HAS_SF = existsSync('/usr/games/stockfish');
import { computeWhyBestMove } from './whyBestMove';
import { computePositionFacts, clauseText } from './positionFacts';
import { explainBestMoveGrounded, assembleEngineReasoning } from './groundedAnswer';
import { detectTactics } from './tacticsDetector';
import type { StockfishAnalysis } from '../types';

const SF = '/usr/games/stockfish';
const DEPTH = 16;

function sfSend(fen: string, cmds: string, onLine: (l: string) => boolean, timeoutMs = 25000): Promise<void> {
  return new Promise((resolve) => {
    const sf = spawn(SF); let buf = ''; let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(to); try { sf.kill(); } catch { /* already exited */ } resolve(); };
    const to = setTimeout(finish, timeoutMs);
    sf.stdout.on('data', (d) => { buf += String(d); let nl; while ((nl = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, nl); buf = buf.slice(nl + 1); if (onLine(line)) { finish(); return; } } });
    sf.stdin.write(`uci\nsetoption name MultiPV value 3\nsetoption name UCI_ShowWDL value true\nisready\nposition fen ${fen}\n${cmds}\n`);
  });
}

async function sfAnalyze(fen: string): Promise<StockfishAnalysis> {
  const lines = new Map<number, { cp: number | null; mate: number | null; pv: string[]; w?: number; d?: number; l?: number }>();
  const blackToMove = fen.split(' ')[1] === 'b';
  await sfSend(fen, `go depth ${DEPTH}`, (line) => {
    const mpv = /multipv (\d+)/.exec(line);
    if (line.startsWith('info') && mpv && / pv /.test(line)) {
      const cp = /score cp (-?\d+)/.exec(line); const mate = /score mate (-?\d+)/.exec(line); const wdl = /wdl (\d+) (\d+) (\d+)/.exec(line);
      const pv = line.slice(line.indexOf(' pv ') + 4).trim().split(/\s+/);
      lines.set(parseInt(mpv[1], 10), { cp: cp ? +cp[1] : null, mate: mate ? +mate[1] : null, pv, w: wdl ? +wdl[1] : undefined, d: wdl ? +wdl[2] : undefined, l: wdl ? +wdl[3] : undefined });
    }
    return line.startsWith('bestmove');
  });
  const flip = blackToMove ? -1 : 1;
  const topLines = [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([rank, l]) => ({
    rank, evaluation: (l.cp ?? 0) * flip, moves: l.pv, mate: l.mate != null ? l.mate * flip : null,
    wdl: l.w != null ? (blackToMove ? { win: l.l ?? 0, draw: l.d ?? 0, loss: l.w } : { win: l.w, draw: l.d ?? 0, loss: l.l ?? 0 }) : null, seldepth: null, bound: null,
  }));
  const primary = topLines[0];
  return { bestMove: primary?.moves?.[0] ?? '', evaluation: primary?.evaluation ?? 0, isMate: primary?.mate != null, mateIn: primary?.mate ?? null, depth: DEPTH, topLines: topLines as StockfishAnalysis['topLines'], nodesPerSecond: 0, wdl: primary?.wdl ?? null, seldepth: DEPTH };
}

// The perturbation probe positionFacts.leansOn needs: the engine's `eval`
// NNUE board table (parseEvalTable reads it). Faithful to stockfishEngine.evalBoard.
async function sfEvalBoard(fen: string): Promise<string> {
  const out: string[] = []; let seenFinal = false;
  await sfSend(fen, 'eval', (line) => { out.push(line); if (/Final evaluation/i.test(line)) seenFinal = true; return seenFinal && line.trim() === ''; }, 6000);
  return out.join('\n');
}

const uciToSan = (fen: string, uci: string): string | null => { try { const c = new Chess(fen); return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined })?.san ?? null; } catch { return null; } };
const pvToSan = (fen: string, pv: string[]): string[] => { const c = new Chess(fen); const out: string[] = []; for (const u of pv) { try { const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined }); if (!m) break; out.push(m.san); } catch { break; } } return out; };
const fenFromMoves = (sans: string[]): string => { const c = new Chess(); for (const s of sans) { const m = c.move(s); if (!m) throw new Error(`illegal move ${s} in line`); } return c.fen(); };

function checkPieceClaims(fen: string, text: string): string[] {
  const c = new Chess(fen); const bad: string[] = [];
  const re = /\b(king|queen|rook|bishop|knight|pawn)\s+on\s+([a-h][1-8])\b/gi; let m;
  while ((m = re.exec(text))) {
    const want = m[1].toLowerCase() === 'knight' ? 'n' : m[1][0].toLowerCase();
    const pc = c.get(m[2] as never) as { type: string } | undefined;
    if (!pc) bad.push(`"${m[0]}" — ${m[2]} EMPTY`);
    else if (pc.type !== want) bad.push(`"${m[0]}" — ${m[2]} is a ${pc.type}`);
  }
  return bad;
}

// Real opening→middlegame lines (both sides developed, out of book).
const LINES: Array<{ id: string; moves: string[]; note: string }> = [
  { id: 'italian-pianissimo', note: 'quiet equal, both castled (~mv6)', moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d3','d6','O-O','O-O'] },
  { id: 'ruy-closed', note: 'closed Ruy middlegame (~mv9)', moves: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O'] },
  { id: 'najdorf-english', note: 'sharp Najdorf, English Attack (~mv8)', moves: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be3','e5','Nb3','Be6','f3','Be7'] },
  { id: 'qgd', note: "Queen's Gambit Declined middlegame (~mv8)", moves: ['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3','O-O','Nf3','h6','Bh4','b6','Bd3','Bb7'] },
  { id: 'kid-classical', note: 'King\'s Indian, locked center (~mv8)', moves: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5','O-O','Nc6','d5','Ne7'] },
  // sharp / imbalanced — importance should be HIGH so the briefing fires
  { id: 'najdorf-sharp', note: 'opposite-side castling, pawn storms (imbalanced)', moves: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be3','e5','Nb3','Be6','f3','Be7','Qd2','O-O','O-O-O','Nbd7','g4','b5','g5','Nh5'] },
  { id: 'kid-storm', note: 'KID white queenside roll (imbalanced)', moves: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5','O-O','Nc6','d5','Ne7','b4','Nh5','Re1','f5','Ng5','Nf6','f3','f4'] },
];

describe.skipIf(!HAS_SF)('COMPUTER ACCURACY + QUALITY AUDIT (end of opening / middlegame)', () => {
  for (const L of LINES) {
    it(`${L.id} — ${L.note}`, async () => {
      const fen = fenFromMoves(L.moves);
      const sc: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w';
      const studentColor = sc === 'w' ? 'white' : 'black';
      const analysis = await sfAnalyze(fen);
      const oracleBestSan = uciToSan(fen, analysis.bestMove);
      const evalPawns = analysis.mateIn != null ? (analysis.mateIn > 0 ? 999 : -999) : analysis.evaluation / 100;

      const why = await computeWhyBestMove({ fen, studentColor, analysis, rating: 1500 });
      const grounded = explainBestMoveGrounded(fen, null, analysis.bestMove, studentColor);
      const pf = await computePositionFacts({ fen, moverColor: sc, studentColor: sc, analysis, rating: 1500, evalBoard: sfEvalBoard });
      const briefing = clauseText(pf.clauses, []).join(' ');
      const pvSan = pvToSan(fen, analysis.topLines?.[0]?.moves ?? []);
      const reasoningObj = pvSan.length ? assembleEngineReasoning({ fenBefore: fen, pvSan, moverColor: sc === 'w' ? 'white' : 'black', evalCp: analysis.evaluation, mateIn: analysis.mateIn, studentSide: studentColor }) : null;
      const reasoning = reasoningObj ? (reasoningObj as { facts?: string }).facts ?? null : null;
      const tactics = detectTactics(fen);

      // Only grade prose ABOUT THE CURRENT board. assembleEngineReasoning walks
      // hypothetical PV lines ("If Be6, then Bb3 — attacks the bishop on e6"),
      // whose piece claims are true in the VARIATION, not the current FEN — so
      // grading them against `fen` is a checker false-positive, not a defect.
      const pieceBad = [...checkPieceClaims(fen, why), ...checkPieceClaims(fen, briefing)];
      const namesAMove = /strongest move is (\S+)/.exec(why);
      const bestMatch = !namesAMove || !oracleBestSan || namesAMove[1].replace(/[.,]$/, '') === oracleBestSan;
      const leansFired = pf.clauses.some((c) => c.kind === 'student-leans' || c.kind === 'opponent-leans');

      console.log(`\n========== ${L.id} (${L.note}) ==========`);
      console.log(`FEN: ${fen}`);
      console.log(`ORACLE: best=${oracleBestSan}  eval=${evalPawns.toFixed(2)} (white-POV)  wdl=${JSON.stringify(analysis.wdl)}`);
      console.log(`\n-- computeWhyBestMove (the "Why?" button) --\n${why || '(empty)'}`);
      console.log(`\n-- explainBestMoveGrounded --\n${grounded || '(null)'}`);
      console.log(`\n-- assembleEngineReasoning.facts (chat why lane) --\n${reasoning || '(null)'}`);
      console.log(`\n-- computePositionFacts briefing (leansFired=${leansFired}) --\n${briefing || '(empty)'}`);
      console.log(`\n-- detectTactics --\n${tactics.tactics.map((t) => t.description).join('\n') || '(none)'}`);
      console.log(`\n-- ACCURACY -- false piece claims: ${pieceBad.length ? pieceBad.join(' | ') : 'NONE'} | names oracle best: ${bestMatch ? 'yes' : `NO (${namesAMove?.[1]} vs ${oracleBestSan})`}`);

      expect(pieceBad, `false piece-on-square claims: ${pieceBad.join(' | ')}`).toHaveLength(0);
      expect(bestMatch).toBe(true);
    }, 90000);
  }
});
