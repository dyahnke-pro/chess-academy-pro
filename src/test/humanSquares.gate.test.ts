// SQUARES ARE NAMED THE WAY A PERSON NAMES THEM (David 2026-11-05: "Instead of
// naming a bunch of squares, can we replace them with arrows and highlights?
// It sounds too robotic." → "We still need to name squares. We just need to do
// it like a human would. If a single square is being named it must also be
// highlighted.").
//
// Over the decision baseline's real games, on every surface:
//   LISTS — no spoken sentence names three or more squares. A piece is named
//           by what it is ("their queen", "your f-pawn", `pieceRef`), a set of
//           squares by what they are ("the dark squares around their king");
//           the board shows which.
//   LIT   — every square a Learn or chat sentence names is among its fact's
//           `squares`, the squares the board lights while the line is said.
//           (Review and the lessons speak the same producers.)
//
// The lines that break it today are a ceiling per surface and kind that can
// only come down (`fixtures/human-squares.ceiling.json`): a kind not in it,
// or a count above it, fails. When a fix lowers a count, lower its ceiling.
//   HUMAN_SQUARES_PRINT=1 npx vitest run src/test/humanSquares.gate.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computePositionFacts } from '../services/positionFacts';
import { lastMoveIfOpponent, lastMoveIfStudent } from '../services/lastMoveOfLine';
import { mateContext } from '../utils/mateContext';
import { analysisOf, lessonLines, linesOf, replayPlies, reviewSegments, type ReplayGame } from './replayGame';

interface FixtureGame extends ReplayGame { id: string; rating: number }
interface Ceiling { lists: Record<string, number>; unlit: Record<string, number> }

const CEILING = JSON.parse(readFileSync('src/test/fixtures/human-squares.ceiling.json', 'utf8')) as Ceiling;
const SQUARE = /\b[a-h][1-8]\b/g;

function loadGames(): FixtureGame[] {
  const jelena = JSON.parse(readFileSync('src/test/fixtures/gotham-jelena.json', 'utf8')) as ReplayGame;
  const replays = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: FixtureGame[] }).games;
  return [...replays, { ...jelena, id: 'gotham-jelena', rating: 1500 }];
}

const sentencesOf = (text: string): string[] => text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);

interface Tally { lists: Record<string, number>; unlit: Record<string, number>; examples: string[] }

function tallyLine(t: Tally, key: string, text: string, squares: readonly string[] | null): void {
  for (const s of sentencesOf(text)) {
    const named = [...new Set(s.match(SQUARE) ?? [])];
    if (named.length >= 3) { t.lists[key] = (t.lists[key] ?? 0) + 1; t.examples.push(`LIST ${key}: ${s}`); }
    if (squares) {
      const unlit = named.filter((q) => !squares.includes(q));
      if (unlit.length > 0) { t.unlit[key] = (t.unlit[key] ?? 0) + 1; t.examples.push(`UNLIT ${key} [${unlit.join(' ')}]: ${s}`); }
    }
  }
}

async function tallyGame(g: FixtureGame, t: Tally): Promise<void> {
  const plies = replayPlies(g);
  const student: 'w' | 'b' = g.studentSide === 'white' ? 'w' : 'b';
  // Learn's live lane, as the decision baseline walks it.
  const said = new Set<string>();
  let planHeard: string | null = null;
  for (let k = 0; k + 1 < plies.length; k++) {
    const p = plies[k];
    const r = plies[k + 1];
    if (!p.own || r.after.length === 0) continue;
    const historySans = g.sans.slice(0, k + 1);
    const res = await computePositionFacts({ theory: true, namesPlayedMove: true,
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
    for (const c of res.clauses) tallyLine(t, `learn:${c.kind}`, c.text, c.squares ?? []);
  }
  // Chat's asked read where the student is to move.
  for (const p of plies) {
    if (p.own || p.after.length === 0) continue;
    const sans = g.sans.slice(0, p.ply);
    const lm = lastMoveIfStudent(sans, g.studentSide, p.fenAfter);
    const om = lastMoveIfOpponent(sans, g.studentSide, p.fenAfter);
    const res = await computePositionFacts({ theory: true, namesPlayedMove: true,
      boardComputers: 'composer', posture: 'asked', fen: p.fenAfter,
      moverColor: p.mover === 'w' ? 'b' : 'w', studentColor: student, analysis: analysisOf(p.after),
      ...(lm ? { lastMove: lm } : {}), ...(om ? { opponentLastMove: om } : {}), history: sans,
    });
    for (const c of res.clauses) tallyLine(t, `chat:${c.kind}`, c.text, c.squares ?? []);
  }
  for (const s of reviewSegments(g, g.rating)) tallyLine(t, 'review', s.narration ?? '', null);
  for (const l of lessonLines(g)) tallyLine(t, 'lesson', l, null);
}

describe('squares are named the way a person names them', () => {
  it('no list of squares in a sentence, every named square lit — never above the ceiling', async () => {
    const t: Tally = { lists: {}, unlit: {}, examples: [] };
    for (const g of loadGames()) await tallyGame(g, t);
    if (process.env.HUMAN_SQUARES_PRINT === '1') {
      console.log(JSON.stringify({ lists: t.lists, unlit: t.unlit }, null, 1));
      for (const e of t.examples) console.log(e);
    }
    const over: string[] = [];
    for (const rule of ['lists', 'unlit'] as const) {
      for (const [key, n] of Object.entries(t[rule])) {
        const cap = CEILING[rule][key] ?? 0;
        if (n > cap) over.push(`${rule} ${key}: ${n} > ${cap}`);
      }
    }
    expect(over, t.examples.slice(0, 20).join('\n')).toEqual([]);
  }, 1_800_000);
});
