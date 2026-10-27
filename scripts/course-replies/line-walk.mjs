// THE ONE WAY a course line is continued to the middlegame (WO-COURSE-01 C).
// Used by the subline builder, the anti-opening builder and the subline repair,
// so a fix here reaches every line they write.
//
// Why it exists: the builders asked Stockfish for a move with
//   execFileSync(SF, { input: 'uci\nposition fen …\ngo depth 12\n' })
// — stdin closes at once, Stockfish treats end-of-input as `quit`, stops the
// search before it starts, and prints whatever move it holds: usually the
// first legal move in its list. That is how 4.a3, 5.b3 and their kind landed
// in sublines wherever the masters data ran dry (measured 2026-10-27). And the
// masters step took the most-played move from ANY sample, one game included,
// against the masterclass rule's floor of 8.
//
// Each ply, by the side to move:
//   1. the opponent just played a KNOWN MISTAKE (an engine-verified gem) →
//      the student plays its punishment, move by move (`punishSeq`);
//   2. the masters reached this board in ≥ MIN_GAMES games → their most
//      played move; for the STUDENT it must also be within STUDENT_SLACK_CP of
//      the engine's best, or the engine's best is played instead;
//   3. otherwise → the engine's best move, from a search that finished.
// It stops at the middlegame (the shared `reachesMiddlegame` rule) — but only
// once the line is at least `minLength` plies, every owed punishment is played
// and the last move is the STUDENT's: a taught line ends on the student's own
// move, never on the opponent's (863 pro sublines ended on the opponent's
// deviation with no answer at all, 2026-10-27) — or at maxPlies.
import { Chess } from 'chess.js';
import { reachesMiddlegame } from '../../src/data/variationMiddlegameDepth.shared.mjs';

export const MIN_GAMES = 8;
export const STUDENT_SLACK_CP = 50;

const pos = (fen) => fen.split(' ').slice(0, 4).join(' ');

/** Known mistakes by (opening, board before, move): the engine-verified gems. */
export function indexKnownMistakes(gems) {
  const at = new Map();
  for (const g of gems) {
    if (g.tier !== 'confirmed' && g.tier !== 'positional') continue;
    const c = new Chess();
    try { for (const s of g.lineMoves.trim().split(/\s+/).filter(Boolean)) c.move(s); } catch { continue; }
    at.set(`${g.openingId}|${pos(c.fen())}|${g.inaccuracy}`, g);
  }
  return at;
}

/**
 * Continue `startSans` to the middlegame.
 * @param {object} o
 * @param {'white'|'black'} o.studentColor
 * @param {import('./engine.mjs').Engine} o.engine
 * @param {Record<string, Array<{san:string,games:number}>>} o.masters
 * @param {Map<string, object>} o.knownMistakes  from indexKnownMistakes
 * @param {string} o.openingId
 * @param {number} [o.maxPlies]
 */
export async function walkToMiddlegame(startSans, { studentColor, engine, masters, knownMistakes, openingId, minLength = 0, maxPlies = Math.max(startSans.length, minLength) + 24, depth = 12 }) {
  const c = new Chess();
  const out = [];
  for (const s of startSans) { c.move(s); out.push(c.history().at(-1)); }
  const studentTurn = studentColor === 'white' ? 'w' : 'b';

  // A punishment already owed: the line ends on the opponent's known mistake.
  let owed = [];
  const owedAt = (sans) => {
    if (sans.length === 0) return [];
    const before = new Chess();
    for (const s of sans.slice(0, -1)) before.move(s);
    const gem = knownMistakes.get(`${openingId}|${pos(before.fen())}|${sans.at(-1)}`);
    return gem ? [...gem.punishSeq] : [];
  };
  owed = owedAt(out);

  while (out.length < maxPlies) {
    const lastByStudent = out.length > 0 && ((out.length - 1) % 2 === 0 ? 'w' : 'b') === studentTurn;
    if (owed.length === 0 && out.length >= minLength && lastByStudent && reachesMiddlegame(out.join(' ')).pass) break;
    const fen = c.fen();
    let san = null;
    if (owed.length) {
      san = owed.shift();
    } else {
      const ms = masters[pos(fen)] ?? [];
      const total = ms.reduce((t, m) => t + m.games, 0);
      const top = total >= MIN_GAMES ? [...ms].sort((a, b) => b.games - a.games)[0] : null;
      if (top && c.turn() !== studentTurn) {
        san = top.san;
      } else {
        const best = await engine.analyse(fen, { depth });
        if (!best.best) break;
        san = uciToSan(fen, best.best);
        if (top && top.san !== san) {
          const uci = sanToUci(fen, top.san);
          const played = uci ? await engine.analyse(fen, { depth, searchmoves: [uci] }) : null;
          if (played && best.score !== null && played.score !== null && best.score - played.score < STUDENT_SLACK_CP) san = top.san;
        }
      }
    }
    let mv;
    try { mv = c.move(san); } catch { break; }
    out.push(mv.san);
    if (!owed.length && c.turn() === studentTurn) owed = owedAt(out);
  }
  return out;
}

function uciToSan(fen, uci) {
  const c = new Chess(fen);
  try { return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; }
}
function sanToUci(fen, san) {
  const c = new Chess(fen);
  try { const m = c.move(san); return m.from + m.to + (m.promotion ?? ''); } catch { return null; }
}
