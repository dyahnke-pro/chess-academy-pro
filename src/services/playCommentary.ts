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
import { phaseOfFen } from './boardConcepts';
import { packageForRegister, type HintPackage } from './hintRegister';

export type CommentaryKind =
  | 'tactic'
  | 'seeding-observation'
  | 'trade-the-best-piece'
  | 'improving-move';

export interface PlayCommentary {
  kind: CommentaryKind;
  /** Stable identity of the OBSERVATION — kind plus the square(s) it is about.
   *
   *  A caller suppressing immediate repeats cannot key on `spoken`: the
   *  say-the-principle-once rule strips a trailing clause the second time a
   *  pattern appears, so the same observation produces two different strings
   *  on consecutive plies and an exact-match guard sails right past it. That
   *  is exactly what happened on a Vienna walk — the e4-outpost beat spoke on
   *  moves 4 and 5, the second time minus its moral. Key on this instead; it
   *  is the same shape as the tactic/threat keys in CoachTeachPage. */
  key: string;
  /** Grounded fact lines for the narration package. Each is TRUE of the board
   *  passed in; the model rephrases, it does not extend. */
  facts: string[];
  /** THE SAME OBSERVATION, SPEAKABLE — for the live lane, which has no model.
   *
   *  `facts` are written AT a phrasing model: they shout a header ("TACTIC ON
   *  THE BOARD"), then instruct ("Name the PATTERN…", "Do NOT name the winning
   *  move"). That was correct while a model stood between this and the voice.
   *  Once the live lane started speaking computed text directly, those strings
   *  became unspeakable — measured 2026-08-08 across 2,397 plies of master
   *  games: this fires on 1,049 of them and only 116 survived `buildVoicePackage`,
   *  the other 89% refused as scaffolding. A surface that produces a thousand
   *  observations and can voice a hundred is not working.
   *
   *  So each beat now carries both: `facts` for a model path, `spoken` for the
   *  voice. `spoken` states the observation and stops — it never carries the
   *  instruction, which is the whole point of keeping them in separate fields. */
  spoken: string;
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
    //
    // 🔒 THE DIRECTION WAS BACKWARDS, AND IT SHIPPED A FALSE CLAIM. David's
    // game, 2026-08-11: "the knight on e4 sits on an outpost no pawn can
    // challenge" — with a white pawn on f2, one move from f3, attacking e4.
    //
    // A pawn challenges a knight by advancing to the square DIAGONALLY BEHIND
    // it, so the pawns that can ever do so are the ones that have not yet
    // passed it. White pawns advance up the board, so a white pawn threatens a
    // BLACK knight from below it; black pawns advance down, so a black pawn
    // threatens a WHITE knight from above. The test asked for the opposite in
    // both cases — it looked for pawns that had already gone by and could never
    // come back, which is why it almost always found none and almost always
    // claimed an outpost.
    //
    // The gate could not catch this: "outpost" names a SQUARE, and the knight
    // really is on it. Board-truth grading checks that the pieces named are
    // where the sentence says, not that a positional judgement about them
    // holds. Which is exactly why the judgement has to be right here.
    const challengeable = myPawns.some((p) => {
      const pf = fileOf(p.square);
      const pr = rankOf(p.square);
      return Math.abs(pf - f) === 1 && (them === 'w' ? pr > r : pr < r);
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

  /** Is there an empty square just beyond either end of the pair, on their
   *  shared line, for a slider to stand on? That is what makes an alignment
   *  exploitable rather than merely tidy. */
  const standpointBeyond = (a: Piece, b: Piece): boolean => {
    const df = Math.sign(fileOf(b.square) - fileOf(a.square));
    const dr = Math.sign(rankOf(b.square) - rankOf(a.square));
    const free = (f: number, r: number): boolean =>
      f >= 0 && f <= 7 && r >= 1 && r <= 8 && !occupied.has(`${String.fromCharCode(97 + f)}${r}`);
    return (
      free(fileOf(b.square) + df, rankOf(b.square) + dr) ||
      free(fileOf(a.square) - df, rankOf(a.square) - dr)
    );
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
      // An alignment is only worth a word if a slider can actually GET on the
      // line. This replaced a flat "adjacent pieces are a huddle" skip, which
      // threw away the sharpest version of the pattern: David 2026-08-07 —
      // "the queen often moves to d7 after long castle, the king on c8 and
      // queen on d7 then line up on the same diagonal". They are adjacent, so
      // the huddle rule dropped it, but nothing stands between them and a
      // bishop reaching e6, f5, g4 or h3 pins the queen dead against the king.
      // Adjacency is the STRONGEST form of the alignment, not a disqualifier.
      //
      // What actually disqualifies one is having nowhere to attack it FROM —
      // a king on g8 with the queen on h7 has both ends of its diagonal off
      // the board, so no slider can ever exploit it.
      if (!standpointBeyond(a, b)) continue;
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
    if (best) return `, attacking the ${best.name} on ${best.to}`;

    // ── THE QUIET MOVE STILL HAS A REASON ────────────────────────────────
    //
    // 🔒 DAVID 2026-08-11: "I want to hear why a move is my strongest reply."
    // His game is the evidence — eight recommendations, and six of them bare:
    // "Your strongest reply here is a3." / "h3." / "knight to d2." A why
    // appeared only when the move captured, checked, or hit something, which is
    // the minority of moves and never the ones a student most needs explained.
    //
    // He asked whether the ENGINE DELTA should be wired in for this. It should
    // not, on its own: "it is worth about a third of a pawn" is a number, not a
    // reason, and a student who hears it still does not know what the move DID.
    // The two clauses below are what a coach actually says about a quiet move,
    // and both are provable from the board with no second search.
    const after = probe.fen();

    // IT DEFENDS SOMETHING THAT WAS HANGING. The strongest quiet move is very
    // often the one that quietly saves a piece, and that is invisible to a
    // student looking for activity.
    try {
      const beforeBoard = new Chess(fenBefore);
      const afterBoard = new Chess(after);
      for (const row of afterBoard.board()) {
        for (const sq of row) {
          if (!sq || sq.color !== mv.color || sq.type === 'k') continue;
          if (sq.square === mv.to) continue; // the piece that just moved
          const attacked = afterBoard.attackers(sq.square, mv.color === 'w' ? 'b' : 'w').length > 0;
          if (!attacked) continue;
          const guardedBefore = beforeBoard.attackers(sq.square, mv.color)
            .filter((g) => g !== sq.square && g !== mv.from).length > 0;
          const guardedNow = afterBoard.attackers(sq.square, mv.color)
            .filter((g) => g !== sq.square).length > 0;
          // Newly guarded, by THIS move — it must be the mover doing the
          // guarding, or the sentence credits it with someone else's work.
          if (guardedBefore || !guardedNow) continue;
          if (!afterBoard.attackers(sq.square, mv.color).includes(mv.to)) continue;
          return `, defending the ${NAME[sq.type] ?? 'piece'} on ${sq.square}`;
        }
      }
    } catch { /* the quiet why is a bonus, never a blocker */ }

    // IT TAKES A SQUARE AWAY. The other half of what a quiet move does: h3 and
    // a3 exist to deny g4 and b4, and a student told only the move name never
    // learns that is the whole point. Named only when an enemy PIECE really
    // could have gone there and now cannot — a square nobody wanted is not a
    // reason.
    //
    // 🔒 ATTACKED SQUARES, NOT LEGAL MOVES. The first version asked
    // `moves({square: mv.to})`, which for a pawn on h3 returns h4 — its PUSH —
    // and never g4, the square it actually controls. So the one case the clause
    // exists for produced nothing. A pawn's control of an empty square is a
    // capture that is not legal, so it is invisible to the move generator and
    // has to be read off `attackers`.
    try {
      const beforeBoard = new Chess(fenBefore);
      const afterBoard = new Chess(after);
      const them = mv.color === 'w' ? 'b' : 'w';
      const theirTurn = beforeBoard.fen().split(' ');
      theirTurn[1] = them;
      theirTurn[3] = '-';
      let theirMoves: Array<{ to: string; piece: string }> = [];
      try {
        theirMoves = new Chess(theirTurn.join(' ')).moves({ verbose: true })
          .filter((t) => t.piece !== 'p' && t.piece !== 'k')
          .map((t) => ({ to: t.to, piece: t.piece }));
      } catch { theirMoves = []; }
      for (const cand of theirMoves) {
        const sqr = cand.to as never;
        if (afterBoard.get(sqr)) continue;                       // not an empty square
        if (!afterBoard.attackers(sqr, mv.color).includes(mv.to)) continue;
        if (beforeBoard.attackers(sqr, mv.color).length > 0) continue; // already covered
        return `, taking ${cand.to} away from their ${NAME[cand.piece] ?? 'piece'}`;
      }
    } catch { /* the quiet why is a bonus, never a blocker */ }

    return '';
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
}): { facts: string; hint: HintPackage; temptingSan: string; refutationSan: string } | null {
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
      // Tiered so the REGISTER decides how much of this is handed over
      // (hintRegister.packageForRegister). The anchor carries both moves
      // because the tempting move alone, without its refutation, would read as
      // a recommendation — every tier has to stand on its own.
      const hint: HintPackage = {
        anchor: `TEMPTING BUT REFUTED: ${tempting.san} looks natural — ${why} — but the reply ${refutation.san} refutes it.`,
        detail: `That line leaves the student about ${dropPawns} pawns worse than the best plan.`,
        stakes: 'Teach the habit from this: calculate the opponent\'s most forcing reply BEFORE trusting a tempting move.',
        withhold: `Name ${tempting.san} and ${refutation.san} exactly as given. Do NOT name or hint at the best move.`,
      };
      return {
        temptingSan: tempting.san,
        refutationSan: refutation.san,
        hint,
        facts: packageForRegister(hint, 'moderate'),
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
}): { facts: string; hint: HintPackage; targetSquare: string } | null {
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
    // The detail tier deliberately does NOT name the attacking piece: naming
    // it is naming the move on most boards, and the withhold below would then
    // be contradicting the package it ships with.
    const hint: HintPackage = {
      anchor: `PRIORITY FIRST: the opponent's pawn on ${target.square} is ${flaw}, and the strongest plan ATTACKS it.`,
      detail: `Frame the thought the way strong players do — "our priority is the ${target.square} pawn" — and let them find the move that fits the priority.`,
      stakes: `A pawn like that cannot run and cannot be defended by a pawn, so every piece aimed at ${target.square} keeps working for free.`,
      withhold: 'Do NOT name the move or the piece that attacks it.',
    };
    return {
      targetSquare: target.square,
      hint,
      facts: packageForRegister(hint, 'moderate'),
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
  /** Generic teaching clauses already used this game. See `once` below — the
   *  principle behind a beat is worth saying ONCE; repeating it every time the
   *  same pattern appears is what makes a coach drone. Caller owns the set for
   *  the game; omit it and every clause is spoken every time (the old
   *  behaviour). */
  saidExplainers?: Set<string>;
  /**
   * Beat kinds the CALLER cannot use, so the ladder keeps looking instead of
   * returning one that will be thrown away.
   *
   * This is a single-return ladder, and Learn discards `tactic` beats because
   * its own tactics lane already speaks them. The two interact badly: a whole
   * game (2026-08-09, 24 plies) produced a tactic on six middlegame plies —
   * each one returned early, each one discarded — so `trade-the-best-piece`
   * was never once evaluated. It read as "the trade beat never fires" when the
   * truth was "the trade beat is never reached". Naming what the caller can't
   * use is what lets the ladder do its job.
   */
  skipKinds?: ReadonlySet<CommentaryKind>;
  /** Squares the caller has ALREADY said something about on this turn.
   *
   *  THE ROOT-CAUSE HALF OF THE DOUBLE-SENTENCE FIX (David 2026-08-10:
   *  "Remember root cause fixes. Gates are backups"). The tactics alert and
   *  this composer both read `detectTactics` off the same board, neither aware
   *  of the other, so both announced the same loose piece:
   *
   *    "Their knight on c3 is undefended — there's something to win here."
   *    "Their knight on c3 is undefended — an undefended piece is the seed of
   *     a tactic."
   *
   *  The package can refuse the second, and does, but refusing it is catching
   *  a mistake rather than not making one. Given the alert's square here, the
   *  duplicate is never composed: the ladder falls through to the next real
   *  thing it has to say, so the turn gains a beat instead of losing one. */
  skipSquares?: ReadonlySet<string>;
}): PlayCommentary | null {
  let chess: Chess;
  try {
    chess = new Chess(args.fen);
  } catch {
    return null;
  }
  /** A beat the caller can use, else null so the ladder continues.
   *
   *  A beat about a square the caller has already spoken about is dropped the
   *  same way a skipped KIND is — the ladder keeps descending and the turn
   *  still gets a beat, just a different one. */
  const usable = (beat: PlayCommentary): PlayCommentary | null => {
    if (args.skipKinds?.has(beat.kind)) return null;
    if (args.skipSquares?.size) {
      for (const sq of beat.spoken.match(/\b[a-h][1-8]\b/g) ?? []) {
        if (args.skipSquares.has(sq)) return null;
      }
    }
    return beat;
  };
  // THE PRINCIPLE ONCE, THE FACT EVERY TIME.
  //
  // Measured in David's own 2026-08-08 session log: "See if you can find it."
  // spoken FIVE times, "Worth noticing." three, "an undefended piece is the
  // seed of a tactic" twice — across different pieces on different moves, so
  // no last-value guard catches them. Each clause is a generic lesson bolted
  // to a specific observation; the first time it teaches, and by the third it
  // is the thing he tunes out. The narration voice rules say it directly:
  // "Vary stems. When a phrase MUST repeat, alternate stems rather than
  // copying the same opener verbatim."
  //
  // The FACT ("their bishop on f3 is undefended") always speaks — it is what
  // is true of this board. Only the attached moral goes quiet.
  const once = (key: string, clause: string): string => {
    const said = args.saidExplainers;
    if (!said) return clause;
    if (said.has(key)) return '';
    said.add(key);
    return clause;
  };
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
        const mate: PlayCommentary = {
          kind: 'tactic',
          key: 'tactic:mate_threat',
          spoken: 'There is a checkmate available right now — look for the forcing move.',
          facts: [
            'MATE IS ON THE BOARD for the student. Say plainly that a checkmate is available right now and they should look for the forcing move. Do NOT name the move or the square.',
          ],
        };
        if (usable(mate)) return mate;
      }
      const found: PlayCommentary = {
        kind: 'tactic',
        key: `tactic:${tac.type}:${tac.involvedSquares.join('')}`,
        spoken: `${tac.description}.${once('find-it', ' See if you can find it.')}`,
        facts: [
          `TACTIC ON THE BOARD for the student: ${tac.description}. Name the PATTERN and why the geometry works. Do NOT name the winning move — let them find it.`,
        ],
      };
      if (usable(found)) return found;
    }
    // Pieces only — a "hanging" PAWN on a repertoire line is usually the
    // gambit itself (measured: 7.9% of theory plies have a pawn en prise,
    // 3.3% a real piece). Narrating every loose pawn is the tuned-out
    // failure, and calling a gambit pawn a tactic-seed is wrong teaching.
    const theirHanging = t.hangingPieces.filter((h) => h.color === them && h.piece !== 'p');
    if (theirHanging.length > 0) {
      const h = theirHanging[0];
      const loose: PlayCommentary = {
        kind: 'tactic',
        key: `hanging:${h.piece}${h.square}`,
        spoken: `Their ${NAME[h.piece] ?? 'piece'} on ${h.square} is undefended${once('undefended-seed', ' — an undefended piece is the seed of a tactic')}.`,
        facts: [
          `UNDEFENDED: the opponent's ${NAME[h.piece] ?? 'piece'} on ${h.square} is not defended. Say what you notice — an undefended piece is the seed of a tactic — without naming the move that wins it.`,
        ],
      };
      if (usable(loose)) return loose;
    }
  } catch { /* the detector is a bonus, never a blocker */ }

  // ── 1.5 THE SEEDING OBSERVATION — the video's opening beat ("there is an
  // alignment of the Rooks…"): two big enemy pieces sharing a line the
  // student owns a matching slider for. Not a tactic yet — the NOTICING that
  // precedes one, which is exactly what he teaches students to see first.
  //
  // ONCE A GAME, NOT ONCE A PLY. The alignment key carries the two pieces and
  // the line, so a caller deduping on the key sees a FRESH beat every time one
  // of those pieces moves — and David's log has four in a row:
  //   "Their queen on d8 and rook on f8 line up on the same 8th rank…"
  //   "Their queen on d8 and rook on e8 line up on the same 8th rank…"
  // Different rook, same observation, same breath four plies running. The
  // seeding beat teaches a WAY OF LOOKING; hearing it repeatedly is the
  // tuned-out failure the narration rules name outright. `once` here is keyed
  // on the LINE alone, so a genuinely new geometry — a different file, a
  // diagonal — still speaks.
  const seed = findAlignmentSeed(all, me, them);
  if (seed && once(`alignment-${seed.line}`, 'x') === '') {
    // Already taught this line's alignment — fall through to a quieter beat.
  } else if (seed) {
    const seedBeat: PlayCommentary = {
      kind: 'seeding-observation',
      key: `seed:${seed.what}:${seed.line}`,
      spoken: `Their ${seed.what} line up on the same ${seed.line}, and you have a ${seed.tool} that moves along it.${once('worth-noticing', ' Worth noticing.')}`,
      facts: [
        `ALIGNMENT: the opponent's ${seed.what} line up on the same ${seed.line}. The student owns a ${seed.tool} that moves along that geometry. Point out the alignment as something worth noticing — nothing more. Do NOT suggest a move.`,
      ],
    };
    if (usable(seedBeat)) return seedBeat;
  }

  // ── 2. TRADE OFF THEIR BEST PIECE. Only when the trade is actually
  // available on this move — otherwise it is advice about a different position.
  const best = opponentsBestPiece(all, them);
  if (best) {
    const trades = capturesOf(chess, best.piece.square);
    if (trades.length > 0) {
      const tradeBeat: PlayCommentary = {
        kind: 'trade-the-best-piece',
        key: `trade:${best.piece.square}`,
        spoken: `${best.why}. You can trade it off right now${once('trade-best', " — the opponent's best piece is the one worth exchanging")}.`,
        facts: [
          `THEIR BEST PIECE: ${best.why}. The student can trade it off right now. Teach the idea — the opponent's best piece is the one worth exchanging — and name the piece and its square. Do NOT give the capturing move.`,
        ],
      };
      if (usable(tradeBeat)) return tradeBeat;
    }
  }

  // ── 3. THE IMPROVING MOVE. The quiet beat, and the one that makes the video
  // teach: nothing is forcing, so the plan is to put a piece on a better square.
  // Requires the engine to have said which — otherwise there is no fact here,
  // only an opinion, and this file does not deal in those.
  //
  // 🔒 NOT IN THE OPENING (David 2026-08-09: "Improving move should not be at
  // ply 2. That's still the opening."). The beat teaches a MIDDLEGAME habit —
  // when nothing is forcing, find your worst-placed piece and improve it. In
  // the opening nothing is forcing either, but the answer is development and
  // theory, not "which of my pieces is worst". Wired live, it fired on move 2
  // of a Vienna, which is the wrong lesson at the right-looking moment.
  if (phaseOfFen(args.fen) === 'opening') return null;
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
      const improveBeat: PlayCommentary = {
        kind: 'improving-move',
        key: `improve:${from}`,
        spoken: `${once('nothing-forcing', 'Nothing is forcing here, so improve a piece — t') || 'T'}he ${NAME[moved.type] ?? 'piece'} on ${from} is the one with a better square. ${args.bestMoveWhy}`,
        facts: [
          `IMPROVING MOVE: nothing is forcing here, so the move is to improve a piece. The ${NAME[moved.type] ?? 'piece'} on ${from} is the one with a better square available. Grounded reason: ${args.bestMoveWhy}. Teach the HABIT — when there is no tactic, find your worst-placed piece and improve it — and name the piece, NOT its destination.`,
        ],
      };
      if (usable(improveBeat)) return improveBeat;
    }
  }

  return null; // unremarkable — silence teaches better than filler
}
