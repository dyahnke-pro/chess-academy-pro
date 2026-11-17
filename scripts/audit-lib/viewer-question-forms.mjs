/**
 * THE QUESTIONS DANYA'S VIEWERS ASK, MADE FOR THE BOARD IN FRONT OF US
 * (David 2026-11-17: "Use those questions as a guide. Ask similar questions but
 * specific to the current board").
 *
 * The forms come from his speedrun transcripts (counted by
 * `scripts/danya-viewer-questions.mjs`): "why not X?" (264), "what if he plays
 * X?" (201), "what about X?" (183), "should we take on X?", "does this weaken
 * X?", "what am I supposed to do here?". Each form is filled from the board in
 * chess.js, never from a guess:
 *   - why not  — the most tempting move: the biggest capture, else a check;
 *   - should I take on — a capture square (a different one when there is one);
 *   - what if they play — their biggest capture or check if it were their move;
 *   - does this weaken — a pawn move that gives up a square no pawn of yours can
 *     cover again, in your half;
 *   - what am I supposed to do — the plan.
 * Every move is legal on the board; a form the board cannot fill is left out.
 */
import { Chess } from 'chess.js';

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const FILES = 'abcdefgh';

/** The board with the other side to move (null move), or null when in check. */
function flipped(fen) {
  const p = fen.split(' ');
  p[1] = p[1] === 'w' ? 'b' : 'w'; p[3] = '-';
  try { const c = new Chess(p.join(' ')); return c.inCheck() ? null : c; } catch { return null; }
}

/** Squares a side's pawns could ever cover (any pawn, pushed any distance up its file). */
function pawnCoverable(c, color) {
  const out = new Set();
  for (const row of c.board()) for (const sq of row) {
    if (!sq || sq.type !== 'p' || sq.color !== color) continue;
    const f = FILES.indexOf(sq.square[0]); const r = Number(sq.square[1]);
    const dir = color === 'w' ? 1 : -1;
    for (let rr = r + dir; rr >= 1 && rr <= 8; rr += dir) for (const df of [-1, 1]) {
      const ff = f + df; if (ff >= 0 && ff < 8) out.add(`${FILES[ff]}${rr}`);
    }
  }
  return out;
}

const tempting = (moves) => [...moves].sort((a, b) =>
  (VALUE[b.captured] ?? -1) - (VALUE[a.captured] ?? -1) || Number(b.san.includes('+')) - Number(a.san.includes('+')));

/**
 * The viewer-style questions for a board, side to move = "I".
 * @param {string} fen
 * @param {{ avoid?: string[] }} [opts] moves already asked about on this board
 * @returns {{ form: string, ask: string, move?: string, square?: string }[]}
 */
export function boardQuestions(fen, opts = {}) {
  const avoid = new Set((opts.avoid ?? []).map((s) => s.replace(/[+#]$/, '')));
  const c = new Chess(fen);
  const me = c.turn();
  const moves = c.moves({ verbose: true }).filter((m) => !avoid.has(m.san.replace(/[+#]$/, '')));
  const out = [];
  const hot = tempting(moves.filter((m) => m.captured || m.san.includes('+')));
  if (hot[0]) out.push({ form: 'why-not', ask: `Why not ${hot[0].san}?`, move: hot[0].san });
  const takeSq = hot.filter((m) => m.captured).map((m) => m.to).find((sq) => sq !== hot[0]?.to) ?? hot.find((m) => m.captured)?.to;
  if (takeSq) out.push({ form: 'should-take', ask: `Should I take on ${takeSq}?`, square: takeSq });
  const them = flipped(fen);
  if (them) {
    const theirs = tempting(them.moves({ verbose: true }).filter((m) => m.captured || m.san.includes('+')))[0];
    if (theirs) out.push({ form: 'what-if-they', ask: `What if they play ${theirs.san} next?`, move: theirs.san });
  }
  // A pawn move that gives up a square in my half no pawn of mine can cover again.
  // The square that matters most: central, and close to my king (the squares
  // viewers ask about — d4, f5, the dark squares round a castled king).
  const before = pawnCoverable(c, me);
  const king = c.board().flat().find((x) => x && x.type === 'k' && x.color === me)?.square;
  const weight = (sq) => {
    const f = FILES.indexOf(sq[0]); const r = Number(sq[1]);
    const centre = 3.5 - Math.abs(f - 3.5) + (3.5 - Math.abs(r - 4.5));
    const near = king ? Math.max(0, 3 - Math.max(Math.abs(FILES.indexOf(king[0]) - f), Math.abs(Number(king[1]) - r))) * 2 : 0;
    return centre + near;
  };
  let weak = null;
  for (const m of moves.filter((x) => x.piece === 'p' && !x.captured && !x.promotion)) {
    const after = new Chess(fen); after.move(m.san);
    for (const sq of [...before].filter((q) => !pawnCoverable(after, me).has(q))
      .filter((q) => (me === 'w' ? Number(q[1]) <= 5 : Number(q[1]) >= 4) && Number(q[1]) > 1 && Number(q[1]) < 8)) {
      if (!weak || weight(sq) > weak.w) weak = { w: weight(sq), move: m.san, square: sq };
    }
  }
  if (weak) out.push({ form: 'weaken', ask: `Does ${weak.move} weaken the ${weak.square} square?`, move: weak.move, square: weak.square });
  out.push({ form: 'plan', ask: 'What am I supposed to do in this position?' });
  return out;
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The checks a viewer-style answer must pass: it answers THIS question. */
export function formFails(q, answer) {
  const f = [];
  const a = answer ?? '';
  if (q.move && !new RegExp(`(?:^|[^A-Za-z0-9])${esc(q.move.replace(/[+#]$/, ''))}(?![A-Za-z0-9])`).test(a)) f.push(`did not answer about ${q.move}`);
  if (q.square && !new RegExp(`\\b${q.square}\\b`).test(a)) f.push(`never named ${q.square}`);
  if (q.form === 'should-take' && !/\b(yes|no|take|takes|capture|recapture|wins|loses|drops|fine|good|bad)\b/i.test(a)) f.push('no verdict on the capture');
  if (q.form === 'weaken' && !/\b(weak|hole|outpost|cover|guard|yes|no|not a problem|fine)\b/i.test(a)) f.push('no verdict on the square');
  if (q.form === 'plan' && a.split(/\s+/).length < 8) f.push('no plan');
  return f;
}
