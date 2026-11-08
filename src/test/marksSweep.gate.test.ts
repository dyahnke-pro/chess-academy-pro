// THE MARKS SWEEP (David 2026-11-08: "I also want you sweeping for square
// highlights and arrows"). Over the decision baseline's real games, on every
// surface, with each surface's own mark functions:
//   UNLIT     a square a sentence names that the board does not light;
//   UNARROWED a move a sentence names (not one it rules out) with no arrow;
//   SHORTLINE a line said as its key moves ("… and, two moves later, …")
//             whose board does not draw it in full.
//
// The counts are a CEILING per surface that can only come down
// (`fixtures/marks-sweep.ceiling.json`): what is left is a hypothetical ("with
// it back on f4, gxh6 would cost you a bishop") or a move a sentence rules out
// ("e5 sidesteps your fork trick: Nxe4, Nxe4") — said, never arrowed. When a
// fix lowers a count, lower its ceiling. Print every row:
//   MARKS_SWEEP_PRINT=1 npx vitest run src/test/marksSweep.gate.test.ts
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { computePositionFacts } from '../services/positionFacts';
import { lastMoveIfOpponent, lastMoveIfStudent } from '../services/lastMoveOfLine';
import { mateContext } from '../utils/mateContext';
import { analysisOf, linesOf, replayPlies, reviewSegments, type ReplayGame } from './replayGame';
import { segmentNamedArrows, segmentLitSquares, segmentMarks } from '../services/coachFeatureService';
import { markItems } from '../services/markAnchors';
import { placeMarks, type PacedMark } from '../services/markPacing';
import { namedMoveArrows } from '../services/learnBoardTeaching';
import { extractMentionedSanSpans, ruledOutSans } from '../services/arrowEngine';
import type { WalkthroughTreeNode } from '../types/walkthroughTree';

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: async () => { throw Object.assign(new Error('401 sweep'), { status: 401 }); } } };
  },
}));
vi.mock('../services/explorerTeachLine', () => ({
  buildExplorerBranches: vi.fn(async () => ({ branches: [], source: null, results: null, incomplete: false })),
  resultsLine: () => null,
}));

const PRINT = process.env.MARKS_SWEEP_PRINT === '1';
const CEILING = JSON.parse(readFileSync('src/test/fixtures/marks-sweep.ceiling.json', 'utf8')) as Record<'unlit' | 'unarrowed' | 'shortline', Record<string, number>>;
const SQUARE = /\b[a-h][1-8]\b/g;
const SHORT = /\bmoves? later\b/;

interface FixtureGame extends ReplayGame { id: string; rating: number }
function loadGames(): FixtureGame[] {
  const jelena = JSON.parse(readFileSync('src/test/fixtures/gotham-jelena.json', 'utf8')) as ReplayGame;
  const replays = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: FixtureGame[] }).games;
  return [...replays, { ...jelena, id: 'gotham-jelena', rating: 1500 }];
}

const sentencesOf = (text: string): string[] => text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
const destOf = (san: string): string | null => (san.replace(/[+#?!]/g, '').match(/([a-h][1-8])(?:=[QRBN])?$/) ?? [])[1] ?? (/^O-O/.test(san) ? 'castle' : null);

interface Row { surface: string; kind: string; rule: 'unlit' | 'unarrowed' | 'shortline' | 'unstated' | 'described'; what: string; text: string }
const rows: Row[] = [];
interface Tally { lines: number; unlit: number; unarrowed: number; shortline: number; unstated: number; described: number }
const tallies: Record<string, Tally> = {};
const tally = (surface: string): Tally => (tallies[surface] ??= { lines: 0, unlit: 0, unarrowed: 0, shortline: 0, unstated: 0, described: 0 });

/** AS IT IS STATED (David 2026-11-08): every mark the board draws for a line
 *  goes up at the words that state it — its square, its piece's words, its
 *  move, the ply before it in its line — or, for a square the fact describes
 *  without naming ("only four squares"), at its fact's sentence (`described`,
 *  reported and read, not gated). A mark with none goes up at the turn's end
 *  (`markPacing`'s tail): `unstated`, gated. */
function statedCheck(surface: string, kind: string, text: string, items: readonly PacedMark[]): void {
  const byId = new Map(items.map((x) => [x.id, x]));
  for (const p of placeMarks(text, items)) {
    if (p.anchor !== 'tail' && p.anchor !== 'said') continue;
    const it = byId.get(p.id);
    if (!it) continue;
    const rule = p.anchor === 'tail' ? 'unstated' : 'described';
    tally(surface)[rule] += 1;
    rows.push({ surface, kind, rule, what: `${it.id} [${it.squares.join(' ')}]`, text });
  }
}

/** A move token legal on either board — a bare square that is no legal pawn
 *  move there names the square, not a move. */
function legalOn(fens: readonly string[], san: string): boolean {
  for (const f of fens) { try { if (new Chess(f).move(san.replace(/^…/, ''))) return true; } catch { /* not here */ } }
  return false;
}

/** One spoken line against the board's marks. `lit` = squares lit or on an
 *  arrow; `arrowTo` = arrow destinations; `played` = the move on the board
 *  (lit by the last-move highlight); `drawnPlies` = the longest line drawn. */
function check(surface: string, kind: string, text: string, lit: ReadonlySet<string>, arrowTo: ReadonlySet<string>, drawnPlies: number, shapedPlies: number | null, boards: readonly string[], played: string): void {
  const t = tally(surface);
  t.lines += 1;
  const bareSan = (x: string): string => x.replace(/^…/, '').replace(/[+#?!]/g, '');
  for (const s of sentencesOf(text.replace(/\[[a-z][a-z-]*\]\s*/g, ''))) {
    const spans = extractMentionedSanSpans(s).map((sp) => sp.san);
    const moves = spans.filter((san) => !/^[a-h][1-8]$/.test(san) || legalOn(boards, san));
    const moveSq = new Set(moves.flatMap((san) => san.match(SQUARE) ?? []));
    const named = [...new Set(s.match(SQUARE) ?? [])].filter((q) => !moveSq.has(q));
    const unlit = named.filter((q) => !lit.has(q));
    if (unlit.length) { t.unlit += 1; rows.push({ surface, kind, rule: 'unlit', what: unlit.join(' '), text: s }); }
    const ruled = ruledOutSans(s);
    const bare = moves.filter((san) => {
      if (ruled.has(san) || bareSan(san) === bareSan(played)) return false;
      const d = destOf(san);
      return d !== null && d !== 'castle' && !arrowTo.has(d);
    });
    if (bare.length) { t.unarrowed += 1; rows.push({ surface, kind, rule: 'unarrowed', what: bare.join(' '), text: s }); }
    if (SHORT.test(s) && (shapedPlies === null ? drawnPlies < 4 : drawnPlies < shapedPlies)) { t.shortline += 1; rows.push({ surface, kind, rule: 'shortline', what: `drawn ${drawnPlies} of ${shapedPlies ?? '?'}`, text: s }); }
  }
}

function moveSquares(fen: string, san: string): string[] {
  try { const m = new Chess(fen).move(san); return m ? [m.from, m.to] : []; } catch { return []; }
}

async function sweepGame(g: FixtureGame): Promise<void> {
  const plies = replayPlies(g);
  const student: 'w' | 'b' = g.studentSide === 'white' ? 'w' : 'b';
  // LEARN — the live lane the decision baseline walks; the board lights a
  // fact's squares and draws the moves its words name plus its own lines.
  const said = new Set<string>();
  let planHeard: string | null = null;
  for (let k = 0; k + 1 < plies.length; k++) {
    const p = plies[k];
    const r = plies[k + 1];
    if (!p.own || r.after.length === 0) continue;
    const historySans = g.sans.slice(0, k + 1);
    const res = await computePositionFacts({ theory: true,
      boardComputers: 'surface', posture: 'walk', fen: r.fenAfter, history: g.sans.slice(0, k + 2),
      moverColor: student, studentColor: student, rating: g.rating, analysis: analysisOf(r.after),
      lastMove: {
        fenBefore: p.fenBefore, san: p.san, cpLoss: p.costCp, historySans,
        reads: p.best ? {
          historySans, bestMoveUci: p.best.uci, bestPvUci: p.best.pv, playedPvUci: p.reply?.pv ?? [], price: null,
          ...mateContext(analysisOf(p.before), analysisOf(p.after), g.studentSide),
        } : null,
        fanBefore: linesOf(p.before),
      },
      alreadySaid: new Set(said), structurePlanHeard: planHeard, opponentLastMove: { fenBefore: r.fenBefore, san: r.san },
    });
    for (const x of res.remember) said.add(x);
    planHeard = res.structurePlanSaid ?? planHeard;
    for (const c of res.clauses) {
      const claims = namedMoveArrows(c.text, r.fenAfter, student, r.fenBefore);
      const lineSq = (c.lines ?? []).flatMap((l) => { const out: string[] = []; try { const b = new Chess(l.fen); for (const s of l.sans) { const m = b.move(s); out.push(m.from, m.to); } } catch { /* partial */ } return out; });
      const arrowTo = new Set([...claims.map((a) => a.to), ...lineSq]);
      const lit = new Set([...(c.squares ?? []), ...claims.flatMap((a) => [a.from, a.to]), ...lineSq, ...moveSquares(r.fenBefore, r.san)]);
      const drawn = Math.max(0, ...(c.lines ?? []).map((l) => l.sans.length));
      check('learn', c.kind, c.text, lit, arrowTo, drawn, c.proof && typeof c.proof === 'object' && 'line' in c.proof && c.proof.line ? c.proof.line.sans.length : null, [r.fenAfter, r.fenBefore, p.fenBefore], r.san);
      statedCheck('learn', c.kind, c.text, markItems({
        fen: r.fenAfter, viewer: student,
        // Each mark carries its fact's sentence, as CoachTeachPage paces them.
        highlights: (c.squares ?? []).map((square) => ({ square, said: c.text })),
        arrows: claims.map((a) => ({ from: a.from, to: a.to, said: c.text })),
        lines: (c.lines ?? []).map((l) => { const out: { from: string; to: string; fen: string }[] = []; try { const b = new Chess(l.fen); for (const sn of l.sans) { const f0 = b.fen(); const m = b.move(sn); out.push({ from: m.from, to: m.to, fen: f0 }); } } catch { /* partial */ } return { moves: out, said: c.text }; }),
      }));
    }
  }
  // CHAT — the asked read where the student is to move.
  for (const p of plies) {
    if (p.own || p.after.length === 0) continue;
    const sans = g.sans.slice(0, p.ply);
    const lm = lastMoveIfStudent(sans, g.studentSide, p.fenAfter);
    const om = lastMoveIfOpponent(sans, g.studentSide, p.fenAfter);
    const res = await computePositionFacts({ theory: true,
      boardComputers: 'composer', posture: 'asked', fen: p.fenAfter,
      moverColor: p.mover === 'w' ? 'b' : 'w', studentColor: student, analysis: analysisOf(p.after),
      ...(lm ? { lastMove: lm } : {}), ...(om ? { opponentLastMove: om } : {}), history: sans,
    });
    for (const c of res.clauses) {
      const claims = namedMoveArrows(c.text, p.fenAfter, student, p.fenBefore);
      const lineSq = (c.lines ?? []).flatMap((l) => { const out: string[] = []; try { const b = new Chess(l.fen); for (const s of l.sans) { const m = b.move(s); out.push(m.from, m.to); } } catch { /* partial */ } return out; });
      const arrowTo = new Set([...claims.map((a) => a.to), ...lineSq]);
      const lit = new Set([...(c.squares ?? []), ...claims.flatMap((a) => [a.from, a.to]), ...lineSq, ...moveSquares(p.fenBefore, p.san)]);
      const drawn = Math.max(0, ...(c.lines ?? []).map((l) => l.sans.length));
      check('chat', c.kind, c.text, lit, arrowTo, drawn, null, [p.fenAfter, p.fenBefore], p.san);
    }
  }
  // REVIEW — key squares, the played move, the named moves' arrows, the plan arrows.
  for (const s of reviewSegments(g, g.rating)) {
    if (!s.narration) continue;
    // The walk's board: plan arrows, or the better-move arrow on a costly move,
    // plus every move the beat names (CoachGameReview walkArrows).
    const better = !s.planArrows?.length && (s.classification === 'inaccuracy' || s.classification === 'mistake' || s.classification === 'blunder') && s.bestMoveUci
      ? [{ startSquare: s.bestMoveUci.slice(0, 2), endSquare: s.bestMoveUci.slice(2, 4) }] : [];
    const arrows = [...segmentNamedArrows(s, g.studentSide), ...(s.planArrows ?? []), ...better];
    const arrowTo = new Set(arrows.map((a) => a.endSquare));
    // The walk plays a kept fact's line move by move (`spokenLineArrows`).
    const played = (s.spokenLineArrows ?? []).flatMap((a) => [a.uci.slice(0, 2), a.uci.slice(2, 4)]);
    const lit = new Set([...segmentLitSquares(s), ...moveSquares(s.fenBefore, s.san), ...arrows.flatMap((a) => [a.startSquare, a.endSquare]), ...played]);
    for (const a of s.spokenLineArrows ?? []) arrowTo.add(a.uci.slice(2, 4));
    check('review', 'segment', s.narration, lit, arrowTo, Math.max(arrows.length, s.spokenLineArrows?.length ?? 0), null, [s.fenAfter, s.fenBefore], s.san);
    statedCheck('review', 'segment', s.narration, segmentMarks(s, g.studentSide).items);
  }
}

describe('the marks sweep — squares lit, moves arrowed, lines drawn', () => {
  it('every surface: named squares lit, named moves arrowed, lines drawn', async () => {
    for (const g of loadGames()) await sweepGame(g);
    // LESSONS — two generated lessons, as the walkthrough rev gate builds them.
    const { generateOpening } = await import('../services/openingGenerator');
    const LESSONS = [
      { canonicalName: 'Scandinavian Defense: Panov Transfer', eco: 'B01', moves: ['e4', 'd5', 'exd5', 'Nf6', 'c4', 'c6'], studentSide: 'black' as const, corpusNotes: true },
      { canonicalName: 'Ponziani Opening', eco: 'C44', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'c3'], studentSide: 'white' as const, corpusNotes: true },
    ];
    for (const entry of LESSONS) {
      const r = await generateOpening(entry.canonicalName, { mode: 'learn', entryOverride: entry });
      if (!r.ok || !r.tree) continue;
      const walk = (node: WalkthroughTreeNode, fenBefore: string): void => {
        let fenAfter = fenBefore;
        let played: string[] = [];
        if (node.san) { try { const b = new Chess(fenBefore); const m = b.move(node.san); played = [m.from, m.to]; fenAfter = b.fen(); } catch { /* off board */ } }
        for (const seg of node.narration ?? []) {
          const arrows = seg.arrows ?? [];
          const lit = new Set([...(seg.highlights ?? []).map((h) => h.square), ...arrows.flatMap((a) => [a.from, a.to]), ...played]);
          check('lesson', 'beat', seg.text, lit, new Set(arrows.map((a) => a.to)), arrows.length, null, [fenAfter, fenBefore], node.san ?? '');
        }
        for (const ch of node.children) walk(ch.node, fenAfter);
      };
      walk(r.tree.root, r.tree.startFen ?? new Chess().fen());
    }
    if (PRINT) {
      writeFileSync('audit-reports/marks-sweep.json', JSON.stringify({ tallies, rows }, null, 1));
      console.log(JSON.stringify(tallies, null, 1));
      for (const x of rows) console.log(`  ${x.rule} [${x.surface}:${x.kind}] {${x.what}} ${x.text.slice(0, 200)}`);
    }
    const over: string[] = [];
    for (const rule of ['unlit', 'unarrowed', 'shortline', 'unstated'] as const) {
      for (const [surface, t] of Object.entries(tallies)) {
        const cap = CEILING[rule][surface] ?? 0;
        if (t[rule] > cap) over.push(`${rule} ${surface}: ${t[rule]} > ${cap}`);
      }
    }
    const examples = rows.filter((x) => over.some((o) => o.startsWith(`${x.rule} ${x.surface}:`))).slice(0, 20).map((x) => `${x.rule} [${x.surface}:${x.kind}] {${x.what}} ${x.text}`);
    expect(over, examples.join('\n')).toEqual([]);
  }, 900_000);
});
