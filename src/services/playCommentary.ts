// playCommentary — what a coach says WHILE you play, computed from the board.
//
// David 2026-08-05, from the Naroditsky speedrun (B7r1bgPEyIQ, ~18-23 min):
// "he talks about making improving moves, trading off opponents best piece,
// and then he finds a tactic." This replaces the blocking cards in Learn: the
// teaching arrives as the game unfolds instead of stopping it to quiz.
//
// G0 — CODE decides, the model only phrases. Every line below is a FACT
// computed here (chess.js + the existing detectors) and handed to the narration
// as grounding. Nothing in this file asks the model what it thinks.
//
// SILENT BY DEFAULT. Returns null on an unremarkable position, which is most of
// them. That is the locked voice law ("speak when it instructs") and the
// narration rules' "silence is acceptable" — a coach who comments on every
// recapture teaches nothing and gets tuned out.
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { detectTactics } from './tacticsDetector';

export type CommentaryKind =
  | 'tactic'
  | 'seeding-observation'
  | 'trade-the-best-piece'
  | 'improving-move';

export interface PlayCommentary {
  kind: CommentaryKind;
  /** Grounded fact lines for the narration package. Each is TRUE of the board
   *  passed in; the model rephrases, it does not extend. */
  facts: string[];
}

type Piece = { type: string; color: 'w' | 'b'; square: string };

const pieces = (chess: Chess): Piece[] => {
  const out: Piece[] = [];
  for (const row of chess.board()) {
    for (const p of row) if (p) out.push({ type: p.type, color: p.color, square: p.square });
  }
  return out;
};

const fileOf = (sq: string): number => sq.charCodeAt(0) - 97;
const rankOf = (sq: string): number => Number(sq[1]);

const NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** Can the side to move capture this square? Used both for "you can trade it"
 *  and to check a piece is genuinely reachable rather than merely annoying. */
function capturesOf(chess: Chess, square: string): string[] {
  try {
    return chess.moves({ verbose: true })
      .filter((m) => m.to === square && m.isCapture())
      .map((m) => m.san);
  } catch {
    return [];
  }
}

/**
 * The opponent's BEST-PLACED piece, when one plainly stands out — the video's
 * "trade off the opponent's best piece".
 *
 * Deliberately narrow: a knight on a pawn-defended outpost in your half, or a
 * rook on a file with no pawns at all. Those are positions a coach actually
 * names. A merely-developed bishop is not, and calling one "their best piece"
 * would be the kind of confident filler the narration rules ban.
 */
function opponentsBestPiece(
  all: Piece[],
  them: 'w' | 'b',
): { piece: Piece; why: string } | null {
  const theirPawns = all.filter((p) => p.type === 'p' && p.color === them);
  const myPawns = all.filter((p) => p.type === 'p' && p.color !== them);
  const dir = them === 'w' ? 1 : -1;

  for (const n of all) {
    if (n.type !== 'n' || n.color !== them) continue;
    const f = fileOf(n.square);
    const r = rankOf(n.square);
    // In OUR half — a knight on its own third rank is not an outpost.
    if (them === 'w' ? r < 5 : r > 4) continue;
    const defended = theirPawns.some((p) =>
      Math.abs(fileOf(p.square) - f) === 1 && rankOf(p.square) === r - dir);
    if (!defended) continue;
    // No pawn of ours can ever challenge it.
    const challengeable = myPawns.some((p) => {
      const pf = fileOf(p.square);
      const pr = rankOf(p.square);
      return Math.abs(pf - f) === 1 && (them === 'w' ? pr < r : pr > r);
    });
    if (!challengeable) {
      return { piece: n, why: `the knight on ${n.square} sits on an outpost no pawn can challenge` };
    }
  }

  for (const rk of all) {
    if (rk.type !== 'r' || rk.color !== them) continue;
    const f = fileOf(rk.square);
    const anyPawn = all.some((p) => p.type === 'p' && fileOf(p.square) === f);
    if (!anyPawn) {
      return { piece: rk, why: `the rook on ${rk.square} owns an open file` };
    }
  }
  return null;
}

/**
 * The video's opening beat — "there is an alignment of the Rooks…". Two big
 * enemy pieces sharing a line the student owns a matching slider for. Not a
 * tactic yet: the NOTICING that precedes one, which is the first thing he
 * teaches students to see.
 *
 * Deliberately conservative, because king+queen share a rank in every game
 * ever played: only king+queen and queen+rook pairs count, the shared rank
 * must not be the opponent's home rank (that is the back-rank detector's
 * lesson), the two pieces must have at most one piece between them, and the
 * student must own a slider that moves along that geometry.
 */
function findAlignmentSeed(
  all: Piece[],
  me: 'w' | 'b',
  them: 'w' | 'b',
): { what: string; line: string; tool: string } | null {
  const bigs = all.filter(
    (p) => p.color === them && (p.type === 'k' || p.type === 'q' || p.type === 'r'),
  );
  const homeRank = them === 'w' ? 1 : 8;
  const occupied = new Set(all.map((p) => p.square));

  // The rank branch used to require `rank !== homeRank`, which was aimed at the
  // untouched opening huddle but hit far more than that: it made a back-rank
  // alignment PERMANENTLY invisible. David 2026-08-07 — "often times the queen
  // and king align when castling long" — and he is right; verified with two
  // identical positions one rank apart, where king-c7 + queen-f7 seeded and
  // king-c8 + queen-f8 said nothing. The back rank is where castling puts the
  // king and where back-rank tactics live, so it is the LAST rank to go blind on.
  //
  // What the filter actually wants is "these pieces have not moved yet". After
  // castling the king stands on c1/c8, not e1/e8, so this admits the castled
  // case and still refuses to narrate the starting position.
  const ORIGINAL: Record<string, string[]> = {
    kw: ['e1'], kb: ['e8'], qw: ['d1'], qb: ['d8'], rw: ['a1', 'h1'], rb: ['a8', 'h8'],
  };
  const unmoved = (p: Piece): boolean =>
    (ORIGINAL[`${p.type}${p.color}`] ?? []).includes(p.square);
  const bothUnmoved = (a: Piece, b: Piece): boolean =>
    rankOf(a.square) === homeRank && unmoved(a) && unmoved(b);

  const betweenCount = (a: Piece, b: Piece): number => {
    const df = Math.sign(fileOf(b.square) - fileOf(a.square));
    const dr = Math.sign(rankOf(b.square) - rankOf(a.square));
    let f = fileOf(a.square) + df;
    let r = rankOf(a.square) + dr;
    let n = 0;
    while (f !== fileOf(b.square) || r !== rankOf(b.square)) {
      if (occupied.has(`${String.fromCharCode(97 + f)}${r}`)) n += 1;
      f += df;
      r += dr;
    }
    return n;
  };

  const myTool = (kinds: string[]): string | null => {
    for (const k of kinds) {
      if (all.some((p) => p.color === me && p.type === k)) return NAME[k];
    }
    return null;
  };

  for (let i = 0; i < bigs.length; i++) {
    for (let j = i + 1; j < bigs.length; j++) {
      const a = bigs[i];
      const b = bigs[j];
      const pair = [a.type, b.type].sort().join('');
      if (pair !== 'kq' && pair !== 'qr') continue;
      const df = fileOf(b.square) - fileOf(a.square);
      const dr = rankOf(b.square) - rankOf(a.square);
      // Adjacent pieces are a huddle, not an alignment worth a word.
      if (Math.max(Math.abs(df), Math.abs(dr)) < 2) continue;

      let line: string | null = null;
      let tool: string | null = null;
      if (df === 0) {
        line = `${a.square[0]}-file`;
        tool = myTool(['r', 'q']);
      } else if (dr === 0 && !bothUnmoved(a, b)) {
        line = `${rankOf(a.square)}th rank`.replace(/^1th/, '1st').replace(/^2th/, '2nd').replace(/^3th/, '3rd');
        tool = myTool(['r', 'q']);
      } else if (Math.abs(df) === Math.abs(dr)) {
        line = 'diagonal';
        tool = myTool(['b', 'q']);
      }
      if (!line || !tool) continue;
      if (betweenCount(a, b) > 1) continue;
      return {
        what: `${NAME[a.type]} on ${a.square} and ${NAME[b.type]} on ${b.square}`,
        line,
        tool,
      };
    }
  }
  return null;
}

/**
 * THE INSTANT REPLY LINE — the ≤1-second voice (David 2026-08-06: "Down to
 * one second after moving", REVISED same day: "I did not like the narrations
 * speaking the opponents move, waste of tokens. I want important teaching
 * moments stated after opponent moves"). The voice never announces the move
 * itself — the student watched it land (Narration Voice Rule 3: don't restate
 * the board). It speaks ONLY when the reply is an EVENT the student must deal
 * with — checkmate, check, or a capture — and names the EFFECT, not the SAN.
 * A quiet reply returns null and the coach stays silent until the warm
 * teaching beat arrives.
 */
export function buildInstantReplyLine(m: {
  san: string;
  captured?: string;
  isCheckmate: boolean;
  isCheck: boolean;
}): string | null {
  const capturedName = m.captured ? (NAME[m.captured] ?? 'piece') : null;
  if (m.isCheckmate) return 'Checkmate.';
  if (capturedName && m.isCheck) return `That takes your ${capturedName} — and it's check.`;
  if (capturedName) return `That takes your ${capturedName}.`;
  if (m.isCheck) return 'Check.';
  return null;
}

/**
 * THE COMPUTED WHY — a speakable clause explaining what a recommended move
 * concretely DOES (David 2026-08-07: "Last narration had a couple
 * hallucinations" — the rec fact named only the move, so the model invented
 * the reason behind it). Everything here is chess.js-verified: the capture it
 * makes, the check it gives, or the most valuable enemy piece it newly
 * attacks. Returns '' when the move does nothing concrete — the fact then
 * stays bare and the prompt forbids inventing a reason.
 */
export function describeMoveConsequence(fenBefore: string, san: string): string {
  try {
    const probe = new Chess(fenBefore);
    const mv = probe.move(san, { strict: false });
    if (mv.san.includes('#')) return ' — checkmate';
    const capturedName = mv.captured ? (NAME[mv.captured] ?? 'piece') : null;
    if (capturedName && mv.san.includes('+')) return `, winning the ${capturedName} on ${mv.to} with check`;
    if (capturedName) return `, winning the ${capturedName} on ${mv.to}`;
    if (mv.san.includes('+')) return ', with check';
    // Quiet move: what does the piece newly attack from its destination?
    // Flip the side to move so the mover's follow-ups generate (legal here —
    // the move gave no check, so the flip is a valid position).
    const parts = probe.fen().split(' ');
    if (parts.length < 4) return '';
    parts[1] = mv.color;
    parts[3] = '-';
    const flipped = new Chess();
    flipped.load(parts.join(' '));
    const value: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let best: { name: string; to: string; score: number } | null = null;
    for (const t of flipped.moves({ square: mv.to, verbose: true })) {
      if (!t.isCapture() || !t.captured) continue;
      const score = value[t.captured] ?? 0;
      if (!best || score > best.score) best = { name: NAME[t.captured] ?? 'piece', to: t.to, score };
    }
    return best ? `, attacking the ${best.name} on ${best.to}` : '';
  } catch {
    return '';
  }
}

/**
 * THE REJECTED TEMPTING MOVE — the speedrun beat "if you play the tempting
 * Knight to c5, Black can push e5". Deterministic: the tempting candidate is
 * a CAPTURE or CHECK the engine's multipv scored ≥1.5 pawns worse than the
 * best line, and the refutation is that line's own reply. Unlike the other
 * beats this one NAMES both moves — it is a warning the video delivers
 * openly, not a quiz — but it never names the BEST move (the honesty
 * contract holds).
 */
export function buildRejectedTempting(args: {
  fen: string;
  studentColor: 'white' | 'black';
  /** Engine multipv lines, best first: first move + its reply (UCI), eval
   *  from the STUDENT's perspective in centipawns. */
  lines: Array<{ uci: string; replyUci?: string | null; evalCp: number }>;
}): { facts: string; temptingSan: string; refutationSan: string } | null {
  if (args.lines.length < 2) return null;
  const me: 'w' | 'b' = args.studentColor === 'white' ? 'w' : 'b';
  let base: Chess;
  try {
    base = new Chess(args.fen);
  } catch {
    return null;
  }
  if (base.turn() !== me) return null;
  const bestEval = args.lines[0].evalCp;
  for (const line of args.lines.slice(1)) {
    if (!line.replyUci || bestEval - line.evalCp < 150) continue;
    try {
      const probe = new Chess(args.fen);
      const tempting = probe.move({ from: line.uci.slice(0, 2) as Square, to: line.uci.slice(2, 4) as Square, promotion: (line.uci[4] as 'q' | undefined) ?? undefined });
      if (!tempting) continue;
      // Tempting = it LOOKS like it wins something or forces something.
      const looksGood = tempting.captured !== undefined || probe.isCheck();
      if (!looksGood) continue;
      const refutation = probe.move({ from: line.replyUci.slice(0, 2) as Square, to: line.replyUci.slice(2, 4) as Square, promotion: (line.replyUci[4] as 'q' | undefined) ?? undefined });
      if (!refutation) continue;
      const dropPawns = ((bestEval - line.evalCp) / 100).toFixed(1);
      const why = tempting.captured !== undefined
        ? `it grabs the ${NAME[tempting.captured] ?? 'piece'} on ${tempting.to}`
        : 'it comes with check';
      return {
        temptingSan: tempting.san,
        refutationSan: refutation.san,
        facts: `TEMPTING BUT REFUTED: ${tempting.san} looks natural — ${why} — but the reply ${refutation.san} leaves the student about ${dropPawns} pawns worse than the best plan. Teach the habit from this: calculate the opponent's most forcing reply BEFORE trusting a tempting move. Name ${tempting.san} and ${refutation.san} exactly as given. Do NOT name or hint at the best move.`,
      };
    } catch { /* malformed line — try the next */ }
  }
  return null;
}

/**
 * PRIORITY-FIRST FRAMING — the speedrun beat "our main priority is to attack
 * the d5 pawn; the moment you tell yourself that, the move becomes obvious".
 * Fires only when the engine's best move ATTACKS a structurally weak enemy
 * pawn (isolated, or doubled with no cover on the file) — then the coach
 * names the PRIORITY and withholds the move, which finds itself.
 */
export function buildPriorityFirst(args: {
  fen: string;
  studentColor: 'white' | 'black';
  /** Engine best move for the student, UCI. */
  bestUci: string;
}): { facts: string; targetSquare: string } | null {
  const me: 'w' | 'b' = args.studentColor === 'white' ? 'w' : 'b';
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  let chess: Chess;
  try {
    chess = new Chess(args.fen);
  } catch {
    return null;
  }
  if (chess.turn() !== me) return null;
  const all = pieces(chess);
  const theirPawns = all.filter((p) => p.type === 'p' && p.color === them);
  const theirFiles = new Set(theirPawns.map((p) => fileOf(p.square)));
  const weakPawns = theirPawns.filter((p) => {
    const f = fileOf(p.square);
    const isolated = !theirFiles.has(f - 1) && !theirFiles.has(f + 1);
    const doubled = theirPawns.filter((q) => fileOf(q.square) === f).length >= 2;
    return isolated || doubled;
  });
  if (weakPawns.length === 0) return null;
  try {
    const probe = new Chess(args.fen);
    const moved = probe.move({ from: args.bestUci.slice(0, 2) as Square, to: args.bestUci.slice(2, 4) as Square, promotion: (args.bestUci[4] as 'q' | undefined) ?? undefined });
    if (!moved || moved.captured !== undefined || probe.isCheck()) return null; // forcing moves are the tactic lane's job
    // After the best move lands, does the MOVED piece attack a weak pawn?
    const parts = probe.fen().split(' ');
    parts[1] = me;
    parts[3] = '-';
    const myTurn = new Chess(parts.join(' '));
    const attacked = new Set(myTurn.moves({ square: moved.to, verbose: true }).map((m) => m.to));
    const target = weakPawns.find((p) => attacked.has(p.square as Square));
    if (!target) return null;
    const flaw = !theirFiles.has(fileOf(target.square) - 1) && !theirFiles.has(fileOf(target.square) + 1)
      ? 'isolated — no pawn can ever defend it'
      : 'doubled — its file is a lasting weakness';
    return {
      targetSquare: target.square,
      facts: `PRIORITY FIRST: the opponent's pawn on ${target.square} is ${flaw}, and the strongest plan ATTACKS it. Frame the thought the way strong players do — "our priority is the ${target.square} pawn" — and let them find the move that fits the priority. Do NOT name the move or the piece that attacks it.`,
    };
  } catch {
    return null;
  }
}

/**
 * The running commentary for the position the student is about to move in.
 *
 * Priority is the coach's: a tactic on the board beats a plan, and a plan beats
 * a quiet improving move. One thing per turn — a coach does not deliver three
 * observations about one position.
 */
export function buildPlayCommentary(args: {
  /** Position with the STUDENT to move (after the coach's reply landed). */
  fen: string;
  studentColor: 'white' | 'black';
  /** Engine's best move for the student, UCI. Optional — the commentary
   *  degrades to board-only observations when the engine is unavailable. */
  bestUci?: string | null;
  /** Engine eval from the STUDENT's perspective, centipawns. */
  evalCpStudentPov?: number | null;
  /** Why the engine likes its move — `explainBestMoveGrounded`'s output,
   *  already board-verified. Passed in rather than recomputed so this file
   *  stays a composer, not a second source of truth. */
  bestMoveWhy?: string | null;
}): PlayCommentary | null {
  let chess: Chess;
  try {
    chess = new Chess(args.fen);
  } catch {
    return null;
  }
  const me: 'w' | 'b' = args.studentColor === 'white' ? 'w' : 'b';
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  if (chess.turn() !== me) return null; // not the student's move — say nothing
  const all = pieces(chess);
  if (all.length === 0) return null;

  // ── 1. A TACTIC. The video's third beat, and the one worth interrupting a
  // quiet plan for. `detectTactics` reports geometry without a beneficiary
  // side, so only the side-attributed HANGING read is used here — the
  // structured tactic list already reaches the narration through the
  // TacticsLiveContext block, which does carry sides. Only the OPPONENT'S
  // hanging pieces: pointing out the student's own would be handing the
  // opponent's game plan to the student's ears mid-game.
  try {
    const t = detectTactics(args.fen);
    // The 2026-08-06 expansion put a beneficiary on every pattern, so the
    // full tactic library speaks here — the STUDENT'S OWN tactics only
    // (naming the opponent's would hand their plan over). Mate outranks
    // everything; the detector already orders mate_threat first.
    const EVENT_ORDER: Record<string, number> = {
      mate_threat: 0, fork: 1, trapped_piece: 2, removal_of_guard: 3, back_rank: 4, discovery: 5,
    };
    const mine = t.tactics
      .filter((tac) => tac.beneficiary === me && tac.type in EVENT_ORDER)
      .sort((a, b) => (EVENT_ORDER[a.type] ?? 9) - (EVENT_ORDER[b.type] ?? 9));
    if (mine.length > 0) {
      const tac = mine[0];
      if (tac.type === 'mate_threat') {
        return {
          kind: 'tactic',
          facts: [
            'MATE IS ON THE BOARD for the student. Say plainly that a checkmate is available right now and they should look for the forcing move. Do NOT name the move or the square.',
          ],
        };
      }
      return {
        kind: 'tactic',
        facts: [
          `TACTIC ON THE BOARD for the student: ${tac.description}. Name the PATTERN and why the geometry works. Do NOT name the winning move — let them find it.`,
        ],
      };
    }
    // Pieces only — a "hanging" PAWN on a repertoire line is usually the
    // gambit itself (measured: 7.9% of theory plies have a pawn en prise,
    // 3.3% a real piece). Narrating every loose pawn is the tuned-out
    // failure, and calling a gambit pawn a tactic-seed is wrong teaching.
    const theirHanging = t.hangingPieces.filter((h) => h.color === them && h.piece !== 'p');
    if (theirHanging.length > 0) {
      const h = theirHanging[0];
      return {
        kind: 'tactic',
        facts: [
          `UNDEFENDED: the opponent's ${NAME[h.piece] ?? 'piece'} on ${h.square} is not defended. Say what you notice — an undefended piece is the seed of a tactic — without naming the move that wins it.`,
        ],
      };
    }
  } catch { /* the detector is a bonus, never a blocker */ }

  // ── 1.5 THE SEEDING OBSERVATION — the video's opening beat ("there is an
  // alignment of the Rooks…"): two big enemy pieces sharing a line the
  // student owns a matching slider for. Not a tactic yet — the NOTICING that
  // precedes one, which is exactly what he teaches students to see first.
  const seed = findAlignmentSeed(all, me, them);
  if (seed) {
    return {
      kind: 'seeding-observation',
      facts: [
        `ALIGNMENT: the opponent's ${seed.what} line up on the same ${seed.line}. The student owns a ${seed.tool} that moves along that geometry. Point out the alignment as something worth noticing — nothing more. Do NOT suggest a move.`,
      ],
    };
  }

  // ── 2. TRADE OFF THEIR BEST PIECE. Only when the trade is actually
  // available on this move — otherwise it is advice about a different position.
  const best = opponentsBestPiece(all, them);
  if (best) {
    const trades = capturesOf(chess, best.piece.square);
    if (trades.length > 0) {
      return {
        kind: 'trade-the-best-piece',
        facts: [
          `THEIR BEST PIECE: ${best.why}. The student can trade it off right now. Teach the idea — the opponent's best piece is the one worth exchanging — and name the piece and its square. Do NOT give the capturing move.`,
        ],
      };
    }
  }

  // ── 3. THE IMPROVING MOVE. The quiet beat, and the one that makes the video
  // teach: nothing is forcing, so the plan is to put a piece on a better square.
  // Requires the engine to have said which — otherwise there is no fact here,
  // only an opinion, and this file does not deal in those.
  if (args.bestMoveWhy && args.bestUci && args.bestUci.length >= 4) {
    const from = args.bestUci.slice(0, 2) as Square;
    const moved = all.find((p) => p.square === from);
    // Quiet only: a capture or a check is not an "improving move", and the
    // tactic branch above would have caught it if it mattered.
    const isQuiet = (() => {
      try {
        const probe = new Chess(args.fen);
        const m = probe.move({ from, to: args.bestUci.slice(2, 4) as Square, promotion: 'q' });
        return !m.captured && !probe.isCheck();
      } catch {
        return false;
      }
    })();
    if (moved && isQuiet) {
      return {
        kind: 'improving-move',
        facts: [
          `IMPROVING MOVE: nothing is forcing here, so the move is to improve a piece. The ${NAME[moved.type] ?? 'piece'} on ${from} is the one with a better square available. Grounded reason: ${args.bestMoveWhy}. Teach the HABIT — when there is no tactic, find your worst-placed piece and improve it — and name the piece, NOT its destination.`,
        ],
      };
    }
  }

  return null; // unremarkable — silence teaches better than filler
}
