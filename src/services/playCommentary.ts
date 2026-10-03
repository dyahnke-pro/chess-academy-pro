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
import { captureNet } from './material';
import { THINK_MARK } from '../utils/thinkPause';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import { phaseOfFen } from './boardConcepts';
import { packageForRegister, type HintPackage } from './hintRegister';
import { CAPTURE_VALUE } from './pieceValues';
import { quietMovePoint } from './reviewMoveTeaching';
import { settledExchange } from './exchangeLedger';
import { seatBare } from '../utils/seatPieces';

export type CommentaryKind =
  | 'tactic'
  | 'seeding-observation'
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

// `capturesOf` + `opponentsBestPiece` REMOVED 2026-08-26 — the hand-written
// "their best piece / outpost" heuristic (with the direction-reversed outpost
// bug that shipped a false claim) is superseded by the engine lane
// `pieceQualityLines(parseEvalTable())` in pieceValueRead.ts. See CLAUDE.md
// "THE COMPUTER DECIDES WHAT IS SPOKEN".

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
/** Rewrite side-to-move (and clear en-passant) so we can ask "what could `color`
 *  do here?" for a short plan, independent of whose turn it is. */
function withTurn(fen: string, color: 'w' | 'b'): string {
  const p = fen.split(' ');
  p[1] = color; p[3] = '-';
  return p.join(' ');
}

/** EXPLOITABILITY for an alignment (David 2026-08-23: "only call it out if it can
 *  actually be exploited"). Can a student slider of `types` reach a square from
 *  which it ATTACKS one of the aligned pieces — already, or within ~2 moves? An
 *  alignment no slider can contest is tidy geometry, not a threat. */
function toolCanContest(fen: string, aSq: Square, bSq: Square, me: 'w' | 'b', types: PieceSymbol[], skipKingEnd = false): PieceSymbol | null {
  // A move that TAKES one of the aligned pair has destroyed the alignment, not
  // exploited it (hand walk 2026-09-24: Rd7 + Qd6 "line up on the d-file" was
  // "contested" by Rxd7 then Rxd6 — the rook ate the geometry it was naming).
  const gen = (f: string): { from: Square; to: Square }[] => {
    try {
      return new Chess(f).moves({ verbose: true })
        .filter((m) => types.includes(m.piece) && m.to !== aSq && m.to !== bSq);
    } catch { return []; }
  };
  // ALONG THE LINE, not from anywhere (hand walk 2026-09-24: queen a5 + rook a8
  // "line up on the a-file, and you have a rook that moves along it" — the only
  // contest was the QUEEN hitting a5 diagonally from d2; no rook could reach the
  // a-file). The attacker must stand on the same line as the pair.
  const fa = aSq.charCodeAt(0); const ra = Number(aSq[1]);
  const fb = bSq.charCodeAt(0); const rb = Number(bSq[1]);
  const onLine = (sq: Square): boolean => {
    const f = sq.charCodeAt(0); const r = Number(sq[1]);
    if (fa === fb) return f === fa;
    if (ra === rb) return r === ra;
    // diagonal through a and b: same slope
    const slope = (rb - ra) / (fb - fa);
    return f !== fa && (r - ra) / (f - fa) === slope;
  };
  // …and from a square it can STAND on: a queen "contesting" from a6 where the
  // b7-pawn takes it contests nothing. Returns the piece that can do it, so
  // the sentence names THAT piece rather than whichever one the student owns.
  const VAL = CAPTURE_VALUE;
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const contests = (c: Chess): PieceSymbol | null => {
    // WITH A PIECE BETWEEN, HITTING THE KING IS ONLY A CHECK (hand walk 1690,
    // 2026-09-27: queen d8 / rook f8 / king g8 "line up on the 8th rank, and
    // you have a queen that moves along it" — the only standpoint was h8,
    // beside the king, and the rook blocks any x-ray to the queen). The
    // alignment is used only by hitting the OTHER end through the gap.
    const ends = [aSq, bSq].filter((e) => !(skipKingEnd && c.get(e)?.type === 'k'));
    for (const sq of ends.flatMap((e) => c.attackers(e, me))) {
      const p = c.get(sq);
      if (!p || !types.includes(p.type) || !onLine(sq)) continue;
      const hitters = c.attackers(sq, them);
      const hitByCheaper = hitters.some((e) => (VAL[c.get(e)?.type ?? 'k'] ?? 100) < (VAL[p.type] ?? 0));
      const hangs = hitters.length > 0 && c.attackers(sq, me).filter((d) => d !== sq).length === 0;
      if (hitByCheaper || hangs) continue;
      return p.type;
    }
    return null;
  };
  const start = withTurn(fen, me);
  let c0: Chess;
  try { c0 = new Chess(start); } catch { return null; }
  const now = contests(c0);
  if (now) return now;
  const m1 = gen(start);
  for (const m of m1) {
    try { const mid = new Chess(start); mid.move({ from: m.from, to: m.to }); const t = contests(mid); if (t) return t; } catch { /* skip */ }
  }
  for (const m of m1.slice(0, 18)) {
    let mid: Chess;
    try { mid = new Chess(start); mid.move({ from: m.from, to: m.to }); } catch { continue; }
    const nf = withTurn(mid.fen(), me);
    for (const mm of gen(nf)) {
      try { const c2 = new Chess(nf); c2.move({ from: mm.from, to: mm.to }); const t = contests(c2); if (t) return t; } catch { /* skip */ }
    }
  }
  return null;
}

function findAlignmentSeed(
  all: Piece[],
  me: 'w' | 'b',
  them: 'w' | 'b',
  fen: string,
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

  const pawnAt = new Set(all.filter((p) => p.color === them && p.type === 'p').map((p) => p.square));
  const pawnBetween = (a: Piece, b: Piece): boolean => {
    const df = Math.sign(fileOf(b.square) - fileOf(a.square));
    const dr = Math.sign(rankOf(b.square) - rankOf(a.square));
    let f = fileOf(a.square) + df;
    let r = rankOf(a.square) + dr;
    while (f !== fileOf(b.square) || r !== rankOf(b.square)) {
      if (pawnAt.has(`${String.fromCharCode(97 + f)}${r}`)) return true;
      f += df;
      r += dr;
    }
    return false;
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

  const myTool = (kinds: PieceSymbol[]): string | null => {
    for (const k of kinds) {
      if (all.some((p) => p.color === me && p.type === k)) return NAME[k as string];
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
      let toolKinds: PieceSymbol[] = [];
      if (df === 0) {
        line = `${a.square[0]}-file`;
        toolKinds = ['r', 'q']; tool = myTool(toolKinds);
      } else if (dr === 0 && !bothUnmoved(a, b)) {
        line = `${rankOf(a.square)}th rank`.replace(/^1th/, '1st').replace(/^2th/, '2nd').replace(/^3th/, '3rd');
        toolKinds = ['r', 'q']; tool = myTool(toolKinds);
      } else if (Math.abs(df) === Math.abs(dr)) {
        line = 'diagonal';
        toolKinds = ['b', 'q']; tool = myTool(toolKinds);
      }
      if (!line || !tool) continue;
      if (betweenCount(a, b) > 1) continue;
      // …and not through one of THEIR PAWNS (hand walk 2026-09-24): with the
      // a7-pawn between queen a5 and rook a8 there is no pin or skewer to set
      // up — a pawn is structure, not an x-ray target. A PIECE between stays
      // allowed (the c8-king / d8-rook / f8-queen back rank, David 2026-08-07).
      if (pawnBetween(a, b)) continue;
      // EXPLOITABILITY (David 2026-08-23): the tool must be able to CONTEST the
      // line — attack an aligned piece now or within ~2 moves. "You have a rook
      // that moves along it" is a lie if no rook can ever get onto that line.
      const contester = toolCanContest(fen, a.square as Square, b.square as Square, me, toolKinds, betweenCount(a, b) === 1);
      if (!contester) continue;
      tool = NAME[contester as string] ?? tool;
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
/** Material the mover nets from a capture once the square is fought over.
 *
 *  🚨 A CAPTURE IS NOT A WIN (David's prod game, 2026-08-16: "a lot of
 *  suggestions are bad"). The clause below used to read `mv.captured` and say
 *  "winning the pawn on f5" for ANY capture, with no question asked about
 *  whether anything defends f5. In his game it recommended Nxf5 "winning the
 *  pawn on f5" — with his opponent's bishop on e6 covering f5, so the knight
 *  comes off next move and the "win" is a two-point loss. Engine agreed:
 *  Nf3 was best at every depth I checked, and Nxf5 was the fourth-best move.
 *  A move sold with a false reason is worse than a bare move name, because
 *  the student learns to distrust the reason on the moves where it IS true.
 *
 *  Legal-move-driven swap: each side recaptures with its least valuable
 *  attacker until nobody wants to, which is exactly what a coach means by
 *  "does this win anything". Bounded, and it needs no engine.
 */
export function describeMoveConsequence(fenBefore: string, san: string): string {
  try {
    const probe = new Chess(fenBefore);
    const mv = probe.move(san, { strict: false });
    if (mv.san.includes('#')) return ' — checkmate';
    const capturedName = mv.captured ? (NAME[mv.captured] ?? 'piece') : null;
    if (capturedName) {
      const net = captureNet(fenBefore, mv.san) ?? 0;
      const check = mv.san.includes('+') ? ' with check' : '';
      // WINS material → say so. BREAKS EVEN → it is a trade, and calling a
      // trade a win is the lie. LOSES material → the engine may still like it
      // (a sound sacrifice), so make no material claim at all and let the
      // quiet-move reasons below speak instead.
      if (net > 0) return `, winning the ${capturedName} on ${mv.to}${check}`;
      if (net === 0) return `, trading off the ${capturedName} on ${mv.to}${check}`;
      if (check) return ', with check';
      // Loses material on the swap — the engine may still want it, so the move
      // keeps its recommendation and falls through to the positional reasons
      // below. Silence about material beats a false claim about it.
    } else if (mv.san.includes('+')) {
      return ', with check';
    }
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
  /** Where the opponent's last move landed. A tempting capture ON it is
   *  their BAIT (census #48: "f4 invites exf4, then Bxf4+"). */
  baitSquare?: string | null;
}): { facts: string; hint: HintPackage; temptingSan: string; refutationSan: string; bait: boolean; spoken: string; refutation: { from: string; to: string; fenBefore: string } } | null {
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
      // Not bait, not refuted (manual claim check 2026-09-30, items 37, 144):
      // "Can you take the rook on d7? No — it's bait" when Rxd7 was the BEST
      // move, and "Bxg5 runs into h6" when Qxg5 won the pawn and Bxg5 still
      // came out clearly ahead. The best move taking on the same square means
      // the capture is right, just with another piece; a line that still
      // leaves the student two pawns up is not refuted.
      if (tempting.captured !== undefined && args.lines[0].uci.slice(2, 4) === tempting.to) continue;
      if (line.evalCp >= 200) continue;
      const fenBeforeRefutation = probe.fen();
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
      // THEIR BAIT, question first (David 2026-09-30): the piece their last
      // move put en prise, taken, runs into the refutation.
      const bait = !!args.baitSquare && tempting.captured !== undefined && tempting.to === args.baitSquare;
      // THE SPOKEN PACKAGE — question first, the answer, then what the
      // register adds (2026-09-30: the old package carried prompt text —
      // "Name X exactly as given. Do NOT…" — and Learn speaks it raw).
      const hint: HintPackage = {
        anchor: bait
          ? `Can you take the ${NAME[tempting.captured ?? 'p'] ?? 'piece'} on ${tempting.to}? ${THINK_MARK} No — it's bait: ${tempting.san} runs into ${refutation.san}.`
          : `Why not ${tempting.san}? ${THINK_MARK} ${why.charAt(0).toUpperCase()}${why.slice(1)}, but ${refutation.san} refutes it.`,
        detail: `That line gives up about ${dropPawns} points against the best move.`,
        stakes: 'Before trusting a tempting move, calculate their most forcing reply.',
      };
      return {
        temptingSan: tempting.san,
        refutationSan: refutation.san,
        bait,
        spoken: hint.anchor,
        refutation: { from: refutation.from, to: refutation.to, fenBefore: fenBeforeRefutation },
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
}): { facts: string; hint: HintPackage; targetSquare: string; spoken: string; arrow: { from: string; to: string } } | null {
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
      ? 'isolated — no pawn beside it can defend it'
      : 'doubled — its file is a weakness';
    // The detail tier deliberately does NOT name the attacking piece: naming
    // it is naming the move on most boards, and the withhold below would then
    // be contradicting the package it ships with.
    // THE SPOKEN PACKAGE — the register decides how much is handed over:
    // the priority always, the move from moderate up, the habit at obvious.
    const hint: HintPackage = {
      anchor: `What's the priority here? ${THINK_MARK} Their pawn on ${target.square} — it's ${flaw}.`,
      detail: `Aim at it: ${moved.san} does.`,
      stakes: `A pawn like that cannot be defended by a pawn, so every piece aimed at ${target.square} keeps working for free.`,
    };
    return {
      targetSquare: target.square,
      hint,
      facts: packageForRegister(hint, 'moderate'),
      // WHAT THE STUDENT HEARS — question first, then the priority and the
      // move that serves it, with its reason (Learn names the move with its
      // reason, 2026-09-24). The package above is prompt material and must
      // never reach the voice raw (2026-09-30).
      spoken: packageForRegister(hint, 'moderate'),
      arrow: { from: moved.from, to: moved.to },
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
  /** The square of a capture the student is about to take back (the position
   *  is mid-exchange) — a piece standing there is a trade coming back, never
   *  "undefended" (hand walk 2340, move 24: "Their bishop on b3 is undefended"
   *  as axb3 recaptured). `pendingRecapture` computes it. */
  midExchangeOn?: string | null;
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
  let lootOnBoard = false;
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
        // SEATED — the detector names pieces bare ("Knight on g3 forks rook on
        // f1…", hand walk 2026-09-25), and whose each piece is IS the lesson.
        // No "See if you can find it" — Learn names the move (David
        // 2026-09-24), and the stem survived alone once its sentence was
        // deduped (walk 900, 28…cxb3+).
        spoken: `${seatBare(tac.description, args.fen, args.studentColor === 'white' ? 'w' : 'b')}.`,
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
    const theirHanging = t.hangingPieces.filter((h) => h.color === them && h.piece !== 'p' && h.square !== args.midExchangeOn);
    // …or any real tactic for EITHER side (walk 1500, 11.c5 Nd5: the seed
    // spoke beside their fork of bishop and knight).
    lootOnBoard = theirHanging.length > 0
      || t.tactics.some((x) => x.type in EVENT_ORDER || x.type === 'pin' || x.type === 'skewer');
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
  // …and never while there is material to WIN (re-walk 1380, 13.Rxd8 Qe7:
  // the knight on h5 hung, another lane had said so, and this fell through to
  // "their rook and queen line up on the same diagonal"). The seed is the
  // noticing BEFORE a tactic; with a piece already loose the question on the
  // board is taking it, whoever said so first.
  const seed = lootOnBoard ? null : findAlignmentSeed(all, me, them, args.fen);
  if (seed && once(`alignment-${seed.line}`, 'x') === '') {
    // Already taught this line's alignment — fall through to a quieter beat.
  } else if (seed) {
    const seedBeat: PlayCommentary = {
      kind: 'seeding-observation',
      key: `seed:${seed.what}:${seed.line}`,
      // WHY it matters, not "worth noticing" (walk 2026-09-30): two pieces on
      // one line are where a pin or a skewer comes from.
      spoken: `Their ${seed.what} line up on the same ${seed.line}, and you have a ${seed.tool} that moves along it${once('alignment-why', ' — two pieces on one line is where a pin or a skewer comes from, so keep an eye on it')}.`,
      facts: [
        `ALIGNMENT: the opponent's ${seed.what} line up on the same ${seed.line}. The student owns a ${seed.tool} that moves along that geometry. Point out the alignment as something worth noticing — nothing more. Do NOT suggest a move.`,
      ],
    };
    if (usable(seedBeat)) return seedBeat;
  }

  // ── 2. TRADE OFF THEIR BEST PIECE — REMOVED 2026-08-26. The hand-written
  // `opponentsBestPiece` heuristic (with the direction-reversed outpost bug that
  // shipped a false claim) is superseded by the engine lane
  // `pieceQualityLines(parseEvalTable())` (pieceValueRead.ts), which reads
  // "their best piece — trade it off" straight off Stockfish's eval table — a
  // number that cannot have its direction reversed. Both ran side-by-side (the
  // walk-over this build removes); the engine lane is the one true source now.
  // See CLAUDE.md "THE COMPUTER DECIDES WHAT IS SPOKEN".

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

/**
 * THE POINT OF THE STUDENT'S OWN SOUND MOVE, when the board proves a notable
 * one (hand walk 2340 — his lines on those moves: "that's a free pawn", "now
 * you have the two bishops", "you unpin yourself"). Only these, in this order:
 *   1. material won — a capture whose exchange, counted out, nets material;
 *   2. the bishop pair gained — their second bishop just came off and you keep
 *      both of yours;
 *   3. an unpin or luft — the review walk's own clauses.
 * Null otherwise: a routine move has no point worth saying (not every ply).
 */
/** The board test behind "now you have the two bishops": this move took
 *  their second-to-last bishop and the mover keeps both of theirs. Exported
 *  so the standing bishop-pair read can stand aside on the move the pair was
 *  WON — one fact, one owner on that turn (re-walk 1380, 19.Rxf3: "You hold
 *  the bishop pair — keep it open" beside "Now you have the two bishops — open
 *  the position"). */
export function gainedBishopPair(fenBefore: string, san: string): boolean {
  let before: Chess;
  let after: Chess;
  try { before = new Chess(fenBefore); after = new Chess(fenBefore); } catch { return false; }
  let mv;
  try { mv = after.move(san); } catch { return false; }
  if (!mv || mv.captured !== 'b') return false;
  const bishops = (c: Chess, color: 'w' | 'b'): number =>
    c.board().flat().filter((x) => x && x.type === 'b' && x.color === color).length;
  const them = mv.color === 'w' ? 'b' : 'w';
  return bishops(before, them) === 2 && bishops(after, them) === 1 && bishops(after, mv.color) === 2;
}

export function studentMovePoint(
  fenBefore: string,
  san: string,
  /** The opponent's move just before (SAN), or null at the start. REQUIRED:
   *  a capture on the square they just captured on is a RECAPTURE — the trade
   *  finishing, never material won (Bxc3 after …Bxc3). */
  opponentLastSan: string | null,
  /** The engine's line from `fenBefore`, UCI, starting with `san`, or null.
   *  REQUIRED (WO-OUTCOME-01): "that wins the X — nothing takes it back" is
   *  an outcome, read off this line by the one ledger. No line, no claim. */
  lineUci: readonly string[] | null,
): string | null {
  let after: Chess;
  try {
    after = new Chess(fenBefore);
  } catch {
    return null;
  }
  let mv;
  try { mv = after.move(san); } catch { return null; }
  if (!mv) return null;
  const recapture = !!opponentLastSan && new RegExp(`x${mv.to}(?![1-8])`).test(opponentLastSan);
  let net = 0;
  if (mv.captured && !recapture && lineUci && lineUci[0] === `${mv.from}${mv.to}${mv.promotion ?? ''}`) {
    const sans: string[] = [];
    const r = new Chess(fenBefore);
    for (const u of lineUci) {
      let m;
      try { m = r.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
      if (!m) break;
      sans.push(m.san);
    }
    const ledger = settledExchange(fenBefore, sans, mv.color, null);
    net = ledger ? ledger.netPawns : 0;
  }
  if (mv.captured && net > 0) {
    const takenVal = CAPTURE_VALUE[mv.captured] ?? 0;
    // Free only when the whole piece is kept; otherwise they take back and the
    // gain is what the trade nets (hand walk 2026-09-25: Nxf1 Bxf1 is the
    // exchange, not a free rook).
    if (net >= takenVal) return `That wins the ${NAME[mv.captured] ?? 'piece'} on ${mv.to} — nothing takes it back safely.`;
    const exchange = mv.captured === 'r' && (mv.piece === 'n' || mv.piece === 'b');
    return exchange
      ? `That wins the exchange — your ${NAME[mv.piece]} for their rook on ${mv.to}.`
      : `That takes the ${NAME[mv.captured] ?? 'piece'} on ${mv.to}, and even after they take back you come out ahead.`;
  }
  if (gainedBishopPair(fenBefore, san)) {
    return 'Now you have the two bishops — open the position and they get stronger.';
  }
  // A capture's point is the capture — Raxd8 taking the queen back is not
  // "unpins your rook on e8" (hand walk 2026-09-25).
  if (mv.captured) return null;
  // THE MOVE IS THE SUBJECT (Blumenfeld re-walk): "Unpins your pawn on d5 —
  // and the queen eyes f2" was queued behind "what is their last move doing?"
  // and read as its answer. A verb-first point says whose move it is.
  const point = quietMovePoint(fenBefore, san);
  return point ? `${san} ${point.charAt(0).toLowerCase()}${point.slice(1)}` : null;
}

/** THEIR SLIP IS YOUR CHANCE — the one wording, Learn and Review (David
 *  2026-10-02: "adding in teachings on opponents moves"). The student's answer
 *  to the opponent's slip, said with its computed point:
 *   - `found`: the student played it — "You found it: c5 kicks their rook…"
 *   - `missed`: they did not — "c5 was the answer to their slip, which…"
 *   - `review`: retrospective — "your answer was c5, which…"
 *   - `now`: asked in Play's chat — "Your answer is c5, which…"
 *  Null when the move-point computer finds no point: a move is named with its
 *  reason or not at all, and a bare "you found it" is the acknowledgment
 *  Voice Rule 5 bans. */
export function slipAnswerText(
  fenAfterSlip: string,
  theirSan: string,
  answerSan: string | null,
  when: 'found' | 'missed' | 'review' | 'now',
  /** The engine's line from `fenAfterSlip` starting with the answer, UCI, or
   *  null — what the answer wins is read off it (WO-OUTCOME-01). */
  answerLineUci: readonly string[] | null,
): string | null {
  if (!answerSan) return null;
  const point = studentMovePoint(fenAfterSlip, answerSan, theirSan, answerLineUci);
  // No point → nothing: a bare "you found it" is an acknowledgment, and the
  // board changing is the acknowledgment (Voice Rule 5; Learn walk 2026-10-02).
  if (!point) return null;
  const body = point.replace(/\.$/, '');
  const sanLed = body.startsWith(`${answerSan} `);
  const rest = sanLed ? body.slice(answerSan.length + 1) : `${body.charAt(0).toLowerCase()}${body.slice(1)}`;
  if (when === 'found') return sanLed ? `You found it: ${answerSan} ${rest}.` : `You found it: ${rest}.`;
  if (when === 'now') return sanLed ? `Your answer is ${answerSan}, which ${rest}.` : `Your answer is ${answerSan}: ${rest}.`;
  if (when === 'missed') return sanLed ? `${answerSan} was the answer to their slip, which ${rest}.` : `${answerSan} was the answer to their slip: ${rest}.`;
  return sanLed ? `your answer was ${answerSan}, which ${rest}` : `your answer was ${answerSan}: ${rest}`;
}
