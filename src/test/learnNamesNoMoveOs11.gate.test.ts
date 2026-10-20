// LEARN NAMES NO MOVE UNASKED — the OS-11 producers (acceptance 2026-10-20,
// audit-reports/os11-acceptance-2026-10-20.md, C2). Each producer that a Learn
// door receives with NAMES_NO_MOVE must not name a move the student can play
// next. Run on the real boards of the OS-1 games (g3, the 1.b3 replay in
// audit-reports/os1-g3-nimzo-larsen-2026-10-19.pgn). The detector reads the
// sentence ONLY to check the producer; nothing in production reads prose.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';
import { intentWithFallback } from '../services/movePurpose';
import { centralKingDangerClause, detectCentralKingDanger } from '../services/kingSafety';
import { principleLine } from '../services/moveFundamentals';
import { linesStructure } from '../services/structureReads';
import { decisiveReason } from '../services/decisiveReason';
import { namesMoves, namesPlayableStudentMove } from '../services/studentMoveNaming';
import type { AnalysisLine, StockfishAnalysis } from '../types';
import { studentMoveTeaching, theirMoveTeaching, learnMoveReason } from '../services/learnBoardTeaching';
import { computePositionFacts } from '../services/positionFacts';
import { nullMoveFen } from '../services/moveIntent';
import { namesFromArrows, studentMovesInLine, NAMES_NO_MOVE } from '../services/studentMoveNaming';
import type { NamesStudentMove } from '../services/studentMoveNaming';

const G3 = 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3 Na5 Be2 a6 c4 O-O Nc2 Re8 d3 b5 Nf3 c5 O-O Bc7 b4 cxb4 Nxb4 Bb7 Rc1 d5 c5 Nc6 a3 a5'.split(' ');
/** The board before ply `n` (0 = the start). */
const g3At = (n: number): string => { const c = new Chess(); for (const s of G3.slice(0, n)) c.move(s); return c.fen(); };

/** The student's moves a sentence names on `fen` (the student to move there):
 *  a SAN token, "<piece> to/takes <square>", castling while it is legal or one
 *  piece away, or a lone-move pawn named as "the pawn on X … moving it". */
function namedMoves(text0: string, fen: string, student: 'w' | 'b'): string[] {
  // Not a move offered to the student: one weighed and ruled out ("Nd5? Then
  // they play…" — the weighing is said, LEARN NAMES NO MOVE UNASKED), the slow
  // plan tested and found wanting, their move ("they play …Qg4", or any
  // "…X" when the student is White), and castling said to be impossible.
  const text = text0
    .replace(/(?:^|\s)…?[A-Za-z0-9=+#-]+\?(?:\s[^.]*)?(?:\.|$)/g, ' ')
    .replace(/\bplan with \S+ by its best case/g, '')
    .replace(/\blike \S+, (?:gives up|lets the mate go|loses)/g, '')
    .replace(/\bthey (?:play|answer|go ahead with) \S+/g, '')
    .replace(student === 'w' ? /…\S+/g : /(?!)/g, '')
    .replace(/\bcan't castle\b/gi, '');
  const parts = fen.split(' ');
  parts[1] = student; parts[3] = '-';
  const c = new Chess(parts.join(' '));
  const legal = c.moves({ verbose: true });
  const hits = new Set<string>();
  for (const m of legal) {
    const san = m.san.replace(/[+#]$/, '');
    // A bare square is a pawn push only when said as one ("prepares e5",
    // "push d4"); "guards d4" names a square, not a move.
    const bare = /^[a-h][1-8]$/.test(san);
    const token = `(^|[^A-Za-z0-9…])…?${san.replace(/[-]/g, '\\-')}(?![A-Za-z0-9])`;
    if (new RegExp(bare ? `\\b(?:prepares|push(?:es)?|pawn to|then|play)\\s+…?${san}\\b` : token).test(text)) hits.add(m.san);
    const word = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king', p: 'pawn' }[m.piece];
    // A pawn is named by its capture ("pawn takes c3"); "the pawn to c3" is the
    // move just played.
    const verb = m.piece === 'p' ? '(?:takes)' : '(?:to|takes)';
    if (new RegExp(`\\b${word}\\b[^.]{0,40}?\\b${verb} ${m.to}\\b`, 'i').test(text) || (m.piece === 'b' && new RegExp(`fianchetto[^.]{0,30}\\bto ${m.to}\\b`, 'i').test(text))) hits.add(m.san);
  }
  const rights = fen.split(' ')[2] ?? '-';
  if (/\bcastl/i.test(text) && rights.split('').some((r) => (student === 'w' ? /[KQ]/ : /[kq]/).test(r))) hits.add('castle');
  const lone = new RegExp(`pawn on ([a-h][1-8])[^.]*moving it`, 'i').exec(text);
  if (lone && legal.filter((m) => m.from === lone[1]).length === 1) hits.add(`${lone[1]}-push`);
  return [...hits];
}

const line = (rank: number, evaluation: number, moves: string[]): AnalysisLine => ({ rank, evaluation, mate: null, moves });

describe('the detector is not vacuous — it flags every OS-11 sentence as heard', () => {
  it('flags the five lines the acceptance heard', () => {
    expect(namedMoves('You play knight to f3 first, so you can castle next.', g3At(19), 'w')).toContain('castle');
    expect(namedMoves('Move your knight on g1, then castle short before the centre opens.', g3At(18), 'w')).toContain('castle');
    expect(namedMoves('The rule behind b3: fianchetto the bishop to b2, because a bishop shut in behind its own pawns is a spectator.', g3At(2), 'w')).toContain('Bb2');
    expect(namedMoves('Your bishop on f8 looks dead for now, but your pawn on d6 is what blocks it — moving it brings it to life.', '4k1b1/8/3p4/8/8/8/8/4K3 b - - 0 1', 'b')).toContain('d6-push');
    expect(namedMoves('Rook to g5 wins by force — it lands two moves later with knight takes f6.', '4k3/8/5p2/8/4N3/8/8/4K3 w - - 0 1', 'w').some((m) => m.startsWith('Nxf6'))).toBe(true);
  });
});

describe('each producer, on the g3 board, names no move it declares it does not', () => {
  it('moveIntent: 10.Nf3 prepares castling — said without the castle (all four games)', () => {
    const fen = g3At(18);
    const reads = {
      before: [line(1, 20, ['g1f3', 'c7c5', 'e1g1'])],
      after: [line(1, -20, ['c7c5', 'e1g1'])],
      passBefore: [line(1, -10, ['c7c5'])],
      passAfter: [line(1, 30, ['e1g1'])],
      reply: 'c7c5',
    };
    const learn = intentWithFallback(fen, 'Nf3', reads, 'student', false, false);
    const review = intentWithFallback(fen, 'Nf3', reads, 'student', false, true);
    expect(review?.text ?? '').toMatch(/castle/);
    expect(learn?.text ?? '').not.toBe('');
    expect(namedMoves(learn!.text, g3At(20), 'w')).toEqual([]);
  });

  it('kingSafety: the centre-king danger in Learn says the danger, not the cure (9.d3)', () => {
    const fen = g3At(18);
    const d = detectCentralKingDanger(fen, 'w');
    expect(d).not.toBeNull();
    expect(centralKingDangerClause(d!, true)).toMatch(/castle short/);
    expect(namedMoves(centralKingDangerClause(d!, false), fen, 'w')).toEqual([]);
  });

  it('moveFundamentals: the fianchetto rule declares the bishop move it names (1.b3)', () => {
    const r = principleLine(g3At(0), 'b3', 'white', new Set(), 0);
    expect(r?.text).toMatch(/b2/);
    expect(r?.names).toEqual({ from: 'c1', to: 'b2' });
    expect(namesPlayableStudentMove(namesMoves('w', g3At(2), r?.names))).toBe(true);
  });

  it('planJudgement: a blocked bishop in Learn names no blocking pawn', () => {
    const fen = new Chess('7k/pp3p1p/6p1/8/3P4/2P5/PB3PPP/6K1 w - - 0 20').fen();
    const lines = [{ moves: ['c3c4', 'a7a6', 'd4d5'], evaluation: 0 }];
    const [named] = linesStructure(fen, 'w', lines, true);
    expect(named.text).toMatch(/pawns on c3 and d4/);
    const [held] = linesStructure(fen, 'w', lines, false);
    expect(held.text).not.toMatch(/c3|d4/);
    expect(namedMoves(held.text, fen, 'w')).toEqual([]);
  });

  it('decisiveReason: a forced line in Learn counts the later move, never names it', () => {
    // decisiveReason.test Q6: Bxc5+ wins by force, paying off with Bxg4.
    const fen = 'r1b2b1r/pp2k1p1/5nBp/2p1p3/1B2P1q1/8/PPP2PPP/RN1Q1RK1 w - - 0 12';
    const reads = { before: [line(1, 592, 'b4c5 e7e6 g6f5 e6f7 f5g4 c8g4 d1d3 f8c5 d3c4 g4e6 c4c5'.split(' ')), line(2, 331, 'd1g4 f6g4 b4c5 e7f6 c5f8 h8f8 g6h5 g7g6 h5g4 c8g4'.split(' '))], after: [], passBefore: [], passAfter: [] };
    const say = (namesPreparedMove: boolean): string => decisiveReason({ namesPreparedMove, fenBefore: fen, san: 'Bxc5+', seat: 'student', opponentLastSan: 'c5', reads })?.text ?? '';
    const learn = say(false);
    const review = say(true);
    expect(review).toMatch(/later with /);
    expect(learn).toMatch(/later/);
    expect(learn).not.toMatch(/later with /);
  });
});

/** The four OS-11 games as played (src/test/fixtures/os11, from the auditor). */
const GAMES = ['os11-g1-smith-morra', 'os11-g2-najdorf-english-attack', 'os11-g3-nimzo-larsen', 'os11-g4-ruy-lopez-qf6', 'david-white-2026-10-06', 'david-black-2026-10-17'].map((name) => {
  const pgn = readFileSync(`src/test/fixtures/os11/${name}.pgn`, 'utf8');
  const side = /\[StudentSide "(white|black)"\]/.exec(pgn)?.[1] === 'black' ? 'b' as const : 'w' as const;
  const c = new Chess();
  c.loadPgn(pgn);
  return { name, side, sans: c.history() };
});

describe('every student move of the OS-11 games and David\'s two: the engine-free producers name nothing undeclared', () => {
  it('loaded all four games', () => {
    expect(GAMES.map((g) => g.sans.length)).toEqual([99, 29, 32, 33, 52, 51]);
  });
  for (const g of GAMES) {
    it(g.name, () => {
      const c = new Chess();
      const leaks: string[] = [];
      let checked = 0;
      g.sans.forEach((san, i) => {
        const before = c.fen();
        c.move(san);
        if ((i % 2 === 0 ? 'w' : 'b') !== g.side) return;
        // The board the student moves on next: after the reply.
        const next = new Chess(c.fen());
        if (g.sans[i + 1]) next.move(g.sans[i + 1]);
        const r = principleLine(before, san, g.side === 'w' ? 'white' : 'black', new Set(), i);
        if (r) {
          checked += 1;
          if (!r.names && namedMoves(r.text, next.fen(), g.side).length) leaks.push(`${i + 1}.${san} rule: ${r.text}`);
        }
        const d = next.turn() === g.side ? detectCentralKingDanger(next.fen(), g.side) : null;
        if (d) {
          checked += 1;
          const t = centralKingDangerClause(d, false);
          if (namedMoves(t, next.fen(), g.side).length) leaks.push(`${i + 1}.${san} king: ${t}`);
        }
      });
      expect(checked).toBeGreaterThan(0);
      expect(leaks).toEqual([]);
    });
  }
});

/** REAL STOCKFISH READS of every board of those games and of each board with
 *  the side to move passing (MultiPV 3, depth 14 — scripts/os11-engine-reads.mjs).
 *  The engine-backed producers run on them exactly as Learn feeds them. */
const READS = JSON.parse(readFileSync('src/test/fixtures/os11/engine-reads.json', 'utf8')) as Record<string, StockfishAnalysis>;
const readOf = (fen: string | null): StockfishAnalysis | null => (fen ? READS[fen] ?? null : null);

describe('every student move of the six games: the engine-backed producers name nothing undeclared', () => {
  it('has a read for every board it walks', () => {
    for (const g of GAMES) {
      const c = new Chess();
      for (const san of g.sans) { expect(readOf(c.fen()), `${g.name} ${san}`).not.toBeNull(); c.move(san); }
    }
  });
  for (const g of GAMES) {
    it(g.name, async () => {
      const c = new Chess();
      const leaks: string[] = [];
      let checked = 0;
      /** A line the producer said it names nothing in, that names a student move. */
      const check = (who: string, ply: number, san: string, text: string, declared: NamesStudentMove, next: string): void => {
        checked += 1;
        if (namesPlayableStudentMove(declared)) return;
        const named = namedMoves(text, next, g.side);
        if (named.length) leaks.push(`${g.name} ${ply}.${san} ${who} [${named.join(',')}]: ${text}`);
      };
      for (let i = 0; i < g.sans.length; i += 1) {
        const san = g.sans[i];
        const before = c.fen();
        c.move(san);
        if ((i % 2 === 0 ? 'w' : 'b') !== g.side || !g.sans[i + 1]) continue;
        const afterMove = c.fen();
        const nextBoard = new Chess(afterMove);
        const reply = nextBoard.move(g.sans[i + 1]);
        const next = nextBoard.fen();
        const pre = readOf(before);
        const mid = readOf(afterMove);
        if (!pre || !mid) continue;
        const sign = g.side === 'w' ? 1 : -1;
        const best = pre.topLines[0];
        const cpLoss = best && !pre.isMate && !mid.isMate ? Math.max(0, best.evaluation * sign - mid.evaluation * sign) : null;
        const bestSan = ((): string | null => { try { const m = new Chess(before).move({ from: pre.bestMove.slice(0, 2), to: pre.bestMove.slice(2, 4), promotion: pre.bestMove.slice(4, 5) || undefined }); return m.san; } catch { return null; } })();
        const history = g.sans.slice(0, i + 1);
        // The student's move: what it did and cost.
        for (const h of studentMoveTeaching({ fenBefore: before, san, history, cpLoss, bothCp: cpLoss !== null, bestSan, bestLine: best, topLines: pre.topLines, reply: reply.san, cpAfter: mid.isMate ? null : mid.evaluation * sign, popularTopSan: null, saidClaims: new Set() })) {
          check(`studentMove/${h.lane}`, i + 1, san, h.text, h.namesStudentMove, next);
        }
        // Their reply's cost.
        const their = theirMoveTeaching(afterMove, reply.san, g.side);
        if (their) check('theirMove', i + 1, san, their.text, their.namesStudentMove, next);
        // What the move was for — the intent and the reason, on Learn's reads.
        const intentReads = { before: pre.topLines, after: mid.topLines, passBefore: readOf(nullMoveFen(before))?.topLines ?? [], passAfter: readOf(nullMoveFen(afterMove))?.topLines ?? [], reply: `${reply.from}${reply.to}${reply.promotion ?? ''}` };
        if (intentReads.passBefore.length) {
          const playedUci = ((): string => { const m = new Chess(before).move(san); return `${m.from}${m.to}${m.promotion ?? ''}`; })();
          const intent = intentWithFallback(before, san, intentReads, 'student', false, false);
          if (intent) {
            const arrows = intent.prepares && !intent.prepares.san.startsWith('O-O') ? [{ from: intent.prepares.uci.slice(0, 2), to: intent.prepares.uci.slice(2, 4), role: 'play' as const, source: 'gate' }] : [];
            check('moveIntent', i + 1, san, intent.text, namesFromArrows(arrows, g.side, next), next);
          }
          // Learn asks the reason only of the engine's own move.
          const learned = pre.topLines[0]?.moves[0] === playedUci && learnMoveReason({ fenBefore: before, san, reads: intentReads, seat: 'student', opponentLastSan: i > 0 ? g.sans[i - 1] : null });
          if (learned) {
            // What Learn SAYS of it: a material reason in full, any other only
            // its tail (the worse move, named as the weighing).
            const r = learned.reason;
            if (r.kind === 'the' && r.source === 'material') check('reason', i + 1, san, r.text, r.line ? studentMovesInLine(r.line.fen, r.line.sans, g.side, next, 1) : NAMES_NO_MOVE, next);
            else if (r.kind === 'the' && r.tail) check('reason-tail', i + 1, san, r.tail, NAMES_NO_MOVE, next);
          }
        }
        // The composer on the board the student moves on next.
        const at = readOf(next);
        if (at) {
          const pf = await computePositionFacts({
            boardComputers: 'surface', posture: 'walk', fen: next, history: g.sans.slice(0, i + 2), moverColor: g.side, studentColor: g.side,
            rating: 1500, analysis: at, evalBoard: () => Promise.reject(new Error('no eval table in the gate')),
            lastMove: { fenBefore: before, san, cpLoss, historySans: history, reads: { historySans: history, bestMoveUci: pre.bestMove || null, bestPvUci: best?.moves ?? [], playedPvUci: mid.topLines[0]?.moves ?? [], price: null }, popular: null, fanBefore: pre.topLines },
          });
          for (const cl of pf.clauses) check(`facts/${cl.kind}`, i + 1, san, cl.text, cl.namesStudentMove, next);
        }
      }
      // Not vacuous: at least one producer line read per student move.
      expect(checked).toBeGreaterThanOrEqual(Math.floor(g.sans.length / 2));
      expect(leaks).toEqual([]);
    }, 120_000);
  }
});
