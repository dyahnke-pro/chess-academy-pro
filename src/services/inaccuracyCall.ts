// "That was inaccurate — here is what should have been played, and why."
//
// David 2026-08-10: "The coach needs to call out inaccurate play for both sides
// and explain what should have been played and why. Is that part of the PV?"
//
// NO, AND THE DISTINCTION MATTERS. A principal variation is the engine's best
// line FROM a position: it says what should happen. A mistake is by definition a
// move that is NOT in that line, so the line can never name one. What identifies
// a mistake is the COMPARISON — eval before the move against eval after — and
// the PV supplies only the second half: WHY the better move was better.
//
// 🔒 THE BANDS ARE NOT MINE. `classifyMove` in `moveRating` owns them and this
// file defers to it completely. The first draft invented its own thresholds at
// 50/100/200 — which would have made the same move a "mistake" here and an
// "inaccuracy" in review, teaching the student that the words mean nothing.
// David caught it: "We already have a delta built for review with coach."
//
// The bands themselves have since moved to `engineConstants` and are SHARED with
// the review's own classifier (50/100/300, the Stockfish convention), because
// `moveRating` and `classifyCpLoss` had been carrying different numbers all
// along — the same drift, one level up. See that file.
//
// It also costs NO extra search. The eval after the student's move is the eval
// BEFORE the coach's reply, and the eval after the coach's reply is already
// computed to build the plan. The delta sits between two numbers the app has.
//
// G0 throughout: severity is arithmetic, the better move comes from the engine,
// and the reason comes from replaying the engine's own line. Nothing here asks a
// model what it thinks.
import { Chess, type Square } from 'chess.js';
import { planFromUci, isCostClause } from './lookaheadPlan';
import { classifyMove, type MoveQuality } from './moveRating';
import { MISTAKE_CP, BLUNDER_CP, costWords } from './engineConstants';
export { costWords };
import { MATERIAL_VALUE } from './pieceValues';
import { legalSeeGain } from './positionReadingService';

export interface InaccuracyCall {
  /** Straight from `moveRating.classifyMove` — never re-derived here. */
  quality: MoveQuality;
  /** Who played it. */
  side: 'student' | 'coach';
  /** Centipawns handed over, always positive. */
  cost: number;
  /** The spoken line. Past tense — the move has happened. */
  said: string;
  /** The square to mark: where the better move was going. '' when unknown. */
  square: string;
  /** The student's piece the move left to be taken, when the grade names one
   *  ("it let them take your rook on b2"). Structured so a caller that already
   *  said that loss can tell it is the same claim without reading the prose. */
  lostSquare?: string;
  /** The better move this line NAMES ("Nf3 was the move — …"), when it names
   *  one — so a verdict beside it can leave the move out (one fact once). */
  namesBetter?: string;
}

/** Only the three that are worth stopping for. `good` and above stay silent —
 *  a coach that comments on every move teaches nothing. */
const WORTH_SAYING: ReadonlySet<MoveQuality> = new Set(['inaccuracy', 'mistake', 'blunder']);

/** What the better move was FOR, read off the engine's own line from it.
 *
 *  This is the PV doing the half it can do. Not "the engine likes it by 40
 *  centipawns" — a number a student can neither see nor use — but the plan the
 *  move actually produces: the piece it wins, the file it opens, the square it
 *  takes. Null when the line is too short to describe, in which case the call
 *  still names the move and simply stops there. */
/**
 * CHECKS FIRST — the move-order lesson (David 2026-09-25, on 22.gxh5 / Rxf8+:
 * "checks captures threats"). When the better move is a CHECK and the move the
 * student played comes back as their own move later in that check's line, the
 * reason is the ORDER: the check forces a reply, and the capture is still there
 * afterwards — they get both. Proven from the engine line by coordinates (a
 * pawn capture reads "gxh5" or "g4xh5"; the squares do not change). Null when
 * the better move is not a check, or the played move never returns in its line.
 */
export function checksFirst(
  fenBefore: string, playedSan: string, bestSan: string, bestLineUci: readonly string[],
): { best: string; reply: string | null; played: string } | null {
  let played: { from: string; to: string };
  let reply: string | null = null;
  try {
    const p = new Chess(fenBefore).move(playedSan);
    if (!p) return null;
    played = { from: p.from, to: p.to };
    const b = new Chess(fenBefore);
    const best = b.move(bestSan);
    if (!best || !b.isCheck()) return null;
    if (best.from === played.from && best.to === played.to) return null;
    // The line must START with the best move, then walk it.
    const first = bestLineUci[0];
    if (!first || first.slice(0, 2) !== best.from || first.slice(2, 4) !== best.to) return null;
    for (let i = 1; i < bestLineUci.length && i <= 4; i += 1) {
      const u = bestLineUci[i];
      const mv = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined });
      if (!mv) return null;
      if (i === 1) reply = mv.san;
      // The mover's own moves sit at even indices; the played move returning
      // there is the proof that it was still available.
      if (i % 2 === 0 && mv.from === played.from && mv.to === played.to) {
        return { best: bestSan, reply, played: playedSan };
      }
    }
  } catch { return null; }
  return null;
}

/** The reason a better move is better, as a FACT — computed once, worded by
 *  each surface in its own register (the two-register rule: share the
 *  computer, never the phrasing). */
export type BetterMoveFact =
  | { kind: 'checks-first'; best: string; reply: string | null; played: string }
  /** `own`: the reason is the move's own work (a cost, or a clause on its
   *  squares). Otherwise it is the plan the move serves, and says so. */
  | { kind: 'line-wins'; why: string; own: boolean };

/**
 * WHY THE BETTER MOVE IS BETTER — the one computer every coach surface reads
 * (David 2026-09-25: "this is a unified coach so whatever changes on one coach
 * are made to all of them"). Learn's verdict, the review walk's "the stronger
 * move was X" and review's key moments all take their reason from here: the
 * move order first (checks first — you get both), then what the line wins or
 * threatens. Null when neither can be proved.
 */
export function betterMoveFact(
  fenBefore: string, playedSan: string, bestSan: string, bestLineUci: readonly string[], moverColor: 'white' | 'black',
): BetterMoveFact | null {
  const order = checksFirst(fenBefore, playedSan, bestSan, bestLineUci);
  if (order) return { kind: 'checks-first', ...order };
  const better = whyBetter(fenBefore, bestLineUci, moverColor, playedSan);
  if (!better) return null;
  // A KING MOVE DOES NOT SERVE ANOTHER PIECE'S PLAN (Bowdler walk 2026-09-27:
  // "Kf8 was the move — the idea is to park a piece on d4"). A plan clause that
  // is not the move's own work is only honest when the move is a step in it;
  // a king step is its own reason (the endgame king rule names it) or none.
  if (!better.own && /^K/.test(bestSan)) return null;
  return { kind: 'line-wins', why: better.why, own: better.own };
}

/** The fact, worded. A verdict on a move already PLAYED is retrospective on
 *  every surface — Learn says it the moment after the move, review says it
 *  after the game, and both are about a decision that has been made — so there
 *  is one wording, not a register switch. */
export function phraseBetterMove(f: BetterMoveFact): string {
  switch (f.kind) {
    case 'checks-first':
      return `checks first: ${f.best}, ${f.reply ?? 'they answer'}, and ${f.played} would still have been there — you'd have had both`;
    case 'line-wins':
      // A plan clause about another piece is the IDEA the move serves, never
      // something the move itself does (Blumenfeld re-walk: "Rad8 was the move —
      // it would walk the knight round to e5").
      return f.own ? `it would ${f.why}` : `the idea is to ${f.why}`;
  }
}

/** Convenience: the fact, computed and worded — or null. */
export function betterMoveReason(
  fenBefore: string, playedSan: string, bestSan: string, bestLineUci: readonly string[], moverColor: 'white' | 'black',
): string | null {
  const f = betterMoveFact(fenBefore, playedSan, bestSan, bestLineUci, moverColor);
  return f ? phraseBetterMove(f) : null;
}

/** What a "win …" clause is worth, in pawns — null when it is not a material
 *  win (a mate, a trap, the shelter). */
function winClauseValue(text: string): number | null {
  const m = /^win (?:a |an |the |two |their |your )?(pawns?|knight|bishop|rook|queen|exchange|piece)\b/.exec(text.trim());
  if (!m) return null;
  if (/^win two/.test(text.trim())) return 2;
  const V: Record<string, number> = { pawn: 1, pawns: 2, knight: 3, bishop: 3, piece: 3, exchange: 2, rook: 5, queen: 9 };
  return V[m[1]] ?? null;
}

/** Material the PLAYED move itself took, in pawns (0 when it took nothing). */
function playedGain(fenBefore: string, playedSan: string | null): number {
  if (!playedSan) return 0;
  try {
    const m = new Chess(fenBefore).move(playedSan);
    return m?.captured ? MATERIAL_VALUE[m.captured] : 0;
  } catch { return 0; }
}

function whyBetter(
  fenBefore: string,
  bestUci: readonly string[],
  moverColor: 'white' | 'black',
  // The move actually played, when there is one. Required so a new caller
  // decides it: a reason the played move ALSO delivers is not why the other
  // move was better (Alekhine walk 2026-09-27: "Qxa7 was a blunder. Rhc1 was
  // the move — it would win a pawn", one breath after Qxa7 took the a-pawn).
  playedSan: string | null,
): { why: string; square: string; own: boolean } | null {
  if (bestUci.length < 4) return null;
  const alreadyWon = playedGain(fenBefore, playedSan);
  const sharedWin = (text: string): boolean => {
    const v = winClauseValue(text);
    return v !== null && alreadyWon > 0 && v <= alreadyWon;
  };
  // THE CAPTURE IS THE REASON. When the better move itself takes a real piece,
  // say what it takes — the plan's material read is the NET over the line
  // ("win a rook" for Bxd8, which takes the QUEEN and gives the bishop back;
  // hand walk 2026-09-24).
  try {
    const b = new Chess(fenBefore);
    const u = bestUci[0];
    const first = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    const NAME: Record<string, string> = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
    // Only when it takes MORE than the capturer is worth — an even trade is not
    // the reason a move is better.
    // …or when it wins the piece OUTRIGHT: an undefended queen taken by a
    // queen is not an even trade (review walk 2065, 2026-09-26: Qxh5 took a
    // hanging queen and the line's net read called it "win a rook").
    const winsOutright = first?.captured ? legalSeeGain(fenBefore, first.to) >= MATERIAL_VALUE[first.captured] : false;
    if (first?.captured && NAME[first.captured] && (MATERIAL_VALUE[first.captured] > MATERIAL_VALUE[first.piece] || winsOutright)) {
      return { why: `take the ${NAME[first.captured]} on ${first.to}`, square: first.to, own: true };
    }
    // A CAPTURE THAT "WINS A PAWN" MAY ONLY BE TAKING IT BACK (Colle walk
    // 2026-09-27: "cxd4 was the move — it would win a pawn" one move after
    // …cxd4). The board cannot say whether the pawn just arrived, so the
    // reason says what is certainly true of both: it takes the pawn.
    if (first?.captured === 'p') {
      const plan0 = planFromUci(fenBefore, bestUci, moverColor)?.mine.text?.trim() ?? '';
      if (/win a pawn/.test(plan0) && alreadyWon === 0) return { why: `take the pawn on ${first.to}`, square: first.to, own: true };
    }
  } catch { /* fall through to the plan read */ }
  const plan = planFromUci(fenBefore, bestUci, moverColor);
  const text = plan?.mine.text?.trim();
  if (!text) return null;
  // "You want to win a pawn and open the d-file." → "win a pawn and open the
  // d-file". The clause is reused; the frame is not.
  //
  // FIRST SENTENCE ONLY (`[^.]+`, not `.+?` to the end of the string). The plan
  // may append a second, separate observation — "Worth noticing: your pieces on
  // a1, d1 and f1 sit this one out entirely" — and an end-anchored match
  // swallows it, so the callout becomes "Na5 was the move — it would win a pawn.
  // Worth noticing: your pieces on a1…". Grammatically it promotes a noticing
  // into a reason; that is the same defect that took the idle-piece clause out
  // of the want-list in the first place, arriving by a different door.
  // ── ONE REASON, THE BEST ONE — NOT THE WHOLE WANT-LIST ──────────────────
  //
  // Caught on prod 2026-08-11: "Nxe5 was the move — it would walk the bishop
  // round to b3, by way of f7, swing pieces toward their king, pull the pawns
  // away from their king and win a pawn." Five clauses in one breath. Every one
  // true and board-verified; the sentence is still unusable.
  //
  // The plan is UNCAPPED on purpose (David 2026-08-10: "I want to hear
  // everything the PV has to say. Do not limit it.") and that is right FOR THE
  // PLAN — it is the forward-looking read, and the student is listening to it
  // as such. The callout is a different register: it names one move and says
  // why that move, so it wants the single strongest reason.
  //
  // This is not a cap put back. `describePlan` already SORTS its clauses by
  // weight and `spokenClauses` preserves that order, so the leader is the plan's
  // own answer to "the most important thing this move does". Taking it is a
  // selection from ranked data, and it reads the STRUCTURE rather than
  // re-splitting the joined prose — which cannot be split safely anyway, since a
  // clause carries its own commas ("walk the bishop round to b3, by way of f7").
  // THE REASON IS ABOUT THE MOVE (Blumenfeld re-walk: "Rad8 was the move — it
  // would walk the knight round to e5", "f5 was the move — it would walk the
  // rook round to c8"). A cost counts wherever it lands; any other clause must
  // touch the move's own squares, or it describes some other piece's journey.
  const firstFrom = bestUci[0].slice(0, 2);
  const firstTo = bestUci[0].slice(2, 4);
  const clauses = plan?.mine.spokenClauses.filter((c) => !sharedWin(c.text)) ?? [];
  if (plan && clauses.length === 0) return null;
  const lead = clauses.find((c) => !c.drift && (isCostClause(c.text) || c.squares.includes(firstFrom) || c.squares.includes(firstTo)))
    ?? clauses[0];
  // WHERE THE PIECES END UP IS NOT WHY THE MOVE WAS BETTER (review walks 900 +
  // 2065, 2026-09-26: "the stronger move was c6 — it would bring pieces to a5
  // and c6 over the next few moves"). With nothing but drift, name the move
  // and give no reason — empty beats a reason that says nothing.
  if (lead?.drift) return null;
  if (lead?.text) {
    // A cost is the move's own consequence ("it would win a pawn") — but a
    // NAMED capture on another square is a different move's work: "Bxb4 was
    // the move — it would take the bishop on d7" (Baltic walk 2026-09-27; the
    // bishop falls to …Kxd7 later). That one is the idea, said as such.
    const namedCapture = /\btake (?:the|their|your) \w+ on ([a-h][1-8])/.exec(lead.text);
    const costIsOwn = isCostClause(lead.text) && (!namedCapture || namedCapture[1] === firstTo);
    const own = costIsOwn || lead.squares.includes(firstFrom) || lead.squares.includes(firstTo);
    return { why: lead.text, square: lead.squares[0] ?? '', own };
  }
  // No clause carried a square (anything square-less that outranked the rest)
  // — fall back to the sentence, which in that case IS one clause.
  const want = /^You want to ([^.]+)\./.exec(text);
  if (!want) return null;
  const square = plan?.mine.spokenClauses.flatMap((c) => c.squares)[0] ?? '';
  return { why: want[1], square, own: false };
}

/**
 * Call an inaccuracy, on either side.
 *
 * Silent when the move was good enough, silent when it WAS the best move, and
 * silent when the engine offered no alternative — "you should have played
 * something else" is not teaching.
 */
/**
 * The verdict, or the REASON there wasn't one.
 *
 * 🔒 A REFUSAL MUST SAY WHICH GUARD REFUSED. `callInaccuracy` returns a bare
 * null for five different reasons, and its caller in Learn logged one of them
 * as fact: `coach move ${san} cost ${cp}cp — under the floor, nothing to call`.
 * That sentence is printed whether the floor refused or not.
 *
 * It cost a whole diagnosis. A real 22-ply game logged it for a 122cp move and
 * a 184cp move, and the backlog concluded from those two lines that "whatever
 * floor coachVerdict applies is mis-scaled or inverted". It is neither:
 * `MISTAKE_CP` is 100, both moves clear it, and both produce a full verdict
 * when called directly. The floor was never involved — the log named the one
 * guard that had passed, and three sessions would have gone looking at it.
 *
 * So the reason is COMPUTED by the same pass that decides, and there is one
 * implementation: `callInaccuracy` is a view over this. An instrument that
 * asserts its own cause is worse than one that says nothing, because it
 * answers a question nobody re-asks.
 */
export type InaccuracyDecline =
  | 'quality-not-worth-saying'
  | 'under-the-floor'
  | 'no-better-move-supplied'
  | 'played-the-best-move'
  | 'best-move-illegal-here';

export type InaccuracyVerdict =
  | { call: InaccuracyCall; declined?: undefined }
  | { call: null; declined: InaccuracyDecline };

export function callInaccuracyDetailed(args: {
  /** Position before the move in question. */
  fenBefore: string;
  /** What was actually played, SAN. */
  playedSan: string;
  /** The engine's preferred move for the same side, SAN. */
  bestSan: string | null;
  /** The engine's whole line from `fenBefore`, UCI — the "why". */
  bestLineUci?: readonly string[];
  /** Centipawns the played move cost its own side, mover's perspective. */
  cpLoss: number;
  /** Mate the mover missed / walked into — `classifyMove` treats either as a
   *  blunder regardless of the centipawns, and so must this. */
  missedMate?: number | null;
  allowedMate?: number | null;
  /** The mover's eval after the move (their perspective): a real centipawn
   *  read, a large positive number when the mover now has a forced mate, and
   *  null/absent when unknown or when the mate is against them. */
  moverEvalAfterCp?: number | null;
  /** Whose move it was. */
  side: 'student' | 'coach';
  moverColor: 'white' | 'black';
  /** The engine's best line for the OTHER side after the played move, UCI —
   *  the punishment, which is what a "blunder" COST. REQUIRED (`[]` when
   *  unknown): Blumenfeld walk F16/F23/F31 heard "Qd7 was a blunder", "Bd6 was
   *  a mistake", "d4 was a mistake" and never what any of them gave away. */
  replyLineUci: readonly string[];
  /** Their ACTUAL reply, SAN, or null when not played yet — so a punishment
   *  they did not play is "and they missed it", never a loss that happened. */
  replySan: string | null;
}): InaccuracyVerdict {
  const bare = (s: string): string => s.replace(/[+#]$/, '');
  const wasBest = Boolean(args.bestSan) && bare(args.playedSan) === bare(args.bestSan ?? '');
  const quality = classifyMove({
    wasBest,
    cpLoss: Math.max(0, args.cpLoss),
    missedMate: args.missedMate ?? null,
    allowedMate: args.allowedMate ?? null,
  });
  if (!WORTH_SAYING.has(quality)) return { call: null, declined: 'quality-not-worth-saying' };
  // THE BANDS ARE STOCKFISH'S; THE FLOOR IS PEDAGOGY, AND THEY ARE NOT THE SAME
  // DECISION. Sharing `classifyMove`'s thresholds with the review (2026-08-10)
  // moved the start of 'inaccuracy' from 100 centipawns down to 50, which is
  // what the review has always called it — but a coach that stops to comment on
  // every half-pawn wobble teaches the student to stop listening. So the WORD
  // now means the same thing on both surfaces while the coach speaks from
  // exactly the same point it always did. Mate is exempt: walking into one is
  // worth saying whatever the centipawns read.
  const forcedMate = (args.missedMate ?? null) !== null || (args.allowedMate ?? null) !== null;
  if (!forcedMate && Math.max(0, args.cpLoss) < MISTAKE_CP) return { call: null, declined: 'under-the-floor' };
  if (!args.bestSan) return { call: null, declined: 'no-better-move-supplied' };
  // SHADOWED, and kept as a precondition rather than a live path: `classifyMove`
  // already returns 'best' when `wasBest`, so the quality guard above answers
  // first and this never fires (measured — `liveVoiceDefects.test.ts` asserts
  // the observed reason, not this one). It stays because everything below
  // depends on there being a DIFFERENT move to name, and a future change to the
  // quality bands must not silently make that assumption false.
  if (wasBest) return { call: null, declined: 'played-the-best-move' };

  // A "best move" that is not legal from this board means the caller handed in
  // a mismatched pair; say nothing rather than narrate a phantom.
  try {
    const board = new Chess(args.fenBefore);
    if (!board.moves().some((m) => bare(m) === bare(args.bestSan ?? ''))) return { call: null, declined: 'best-move-illegal-here' };
  } catch {
    return { call: null, declined: 'best-move-illegal-here' };
  }

  // ── WHEN THE MOVE WALKED INTO MATE, THAT IS THE WHY ─────────────────────
  //
  // David 2026-08-15: "Stating why a certain move is better than another?"
  // Measured on a Scholar's-mate blunder, the answer was "g6 was the move — it
  // would bring pieces to d6 and d7 over the next few moves." True, and a
  // ludicrous thing to say about the move that stops mate in one. `whyBetter`
  // reads the want-list of the line the better move produces, and a line that
  // simply survives has no want-list worth the name — so the weakest clause on
  // the board wins by default at the single highest-stakes moment in a game.
  //
  // COMPUTED, NOT ASSERTED (G0) — and at WHATEVER DEPTH STOCKFISH SAW.
  //
  // David 2026-08-15: "Can it see mate further out? Stockfish can, the computer
  // should see everything that Stockfish does." He is right, and the first cut
  // of this was scoped to `allowedMate === 1` because I reached for a one-ply
  // chess.js scan to prove it. That was solving a problem the engine had already
  // solved: `allowedMate` IS Stockfish's depth, at any N, and the engine's own
  // line from the better move is right here in `bestLineUci`.
  //
  // So the proof is the PV. Replay the engine's preferred line and ask whether
  // the MOVER ends up checkmated anywhere along it. If they do not, the better
  // move genuinely does avoid the mate the played move walked into — true for
  // mate in one, mate in five, mate in twelve, with no depth ceiling of our own
  // invention bolted under Stockfish's.
  //
  // Still refuses rather than guesses: no line, or a line that runs out before
  // the mate would have landed, produces no claim and the callout falls back to
  // the plan's own reason.
  const stopsMate = ((): boolean => {
    if (args.allowedMate === null || args.allowedMate === undefined) return false;
    if (!args.bestLineUci || args.bestLineUci.length < 2) return false;
    const moverChar = args.moverColor === 'white' ? 'w' : 'b';
    try {
      const b = new Chess(args.fenBefore);
      for (const uci of args.bestLineUci) {
        if (!uci || uci.length < 4) break;
        const mv = b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
        if (!mv) return false;
        // The mover being mated anywhere in their own best line means the mate
        // was not the played move's fault and this claim is not ours to make.
        if (b.isCheckmate() && b.turn() === moverChar) return false;
      }
      // The line has to be long enough to have carried the mate if it were
      // coming — a two-ply PV proves nothing about a mate in six.
      //
      // ABSOLUTE VALUE: `allowedMate` arrives SIGNED (the engine's mate score is
      // relative to a side, so walking into mate reads -1 as readily as 1). Used
      // raw, a negative depth makes this comparison `length >= -2`, which is
      // every line ever — the guard would pass vacuously on exactly the half of
      // the cases it exists to check. Only the magnitude is a depth.
      return args.bestLineUci.length >= Math.min(2 * Math.abs(args.allowedMate), 8);
    } catch { return false; }
  })();

  const better = stopsMate
    ? { why: 'stop the mate', square: '', own: true }
    : args.bestLineUci
      ? whyBetter(args.fenBefore, args.bestLineUci, args.moverColor, args.playedSan)
      : null;
  const cost = Math.round(Math.max(0, args.cpLoss));

  // THE COACH OWNS ITS OWN MISTAKES, IN THE FIRST PERSON, AND HANDS THE STUDENT
  // THE PUNISHMENT. Naming the move here is correct and is NOT the honesty
  // contract being bent: that contract withholds the STUDENT's move so they
  // have something to find. A move the coach has already played is on the
  // board — hiding it would be coyness, not teaching.
  if (args.side === 'coach') {
    const head = quality === 'blunder'
      // The cost named is the real one: a move that walks into mate gave away
      // no material (Damiano walk 2026-09-27, 42…Kf8 in a mating net).
      ? ((args.allowedMate ?? null) !== null
        ? `That was a blunder from me — ${args.playedSan} walks into mate.`
        : `That was a blunder from me — ${args.playedSan} gives away real material.`)
      : quality === 'mistake'
        ? `That was a mistake from me. ${args.playedSan} is not what the position wanted.`
        : `A touch inaccurate from me — ${args.playedSan} is not quite right.`;
    // NAMED WITH ITS REASON, OR NOT NAMED (the Learn rule, 2026-09-24): a move
    // with no computed reason is an order, not teaching.
    const should = better ? ` ${args.bestSan} was the move, to ${better.why}.` : '';
    // WHICH KIND OF SLIP, read off the board (walk 6, L4). The coach's move can
    // cost by GIVING something (the student now has a capture to find) or by
    // MISSING a capture of the student's piece — and then that piece is still
    // hanging and the student has nothing to take. The old line promised
    // "something here for you — go and take it" after the coach had merely
    // declined Qxg5, with the student's knight still en prise.
    const stillHanging = missedCaptureStillOn(args.fenBefore, args.playedSan, args.bestSan);
    const punish = quality === 'inaccuracy'
      ? ''
      : stillHanging
        ? ` Your ${stillHanging.piece} on ${stillHanging.square} is still hanging, though — see to it.`
        : ' There is something here for you now — go and take it.';
    return { call: { quality, side: 'coach', cost, said: `${head}${should}${punish}`, square: better?.square ?? '' } };
  }

  // THE STUDENT'S OWN MOVE, in the retroactive register the backward look uses:
  // past tense, second person, no scolding. `whatItAllowed` already says what
  // the move LET THEM DO; this is the half that was missing — what should have
  // been played, and what it would have done.
  // A GAMBIT IS TAUGHT FROM BOTH SIDES, NOT GRADED (hand walk 2026-09-24:
  // Naroditsky's b4 against the long-castled king was called "a mistake. a3
  // was the move"; his point — "if Black takes, the b-file opens straight onto
  // the king" — never came up). When the pushed pawn can be taken and taking
  // it opens a file beside their king, name the idea first and the engine's
  // preference second. A blunder is still called a blunder.
  const gambit = quality === 'blunder' ? null : gambitFile(args.fenBefore, args.playedSan, args.moverColor);
  if (gambit) {
    const said = `${args.playedSan} offers a pawn — if they take, the ${gambit}-file opens toward their king. The engine prefers ${args.bestSan}${better ? `, to ${better.why}` : ''}, so it is a practical try, not a free one.`;
    return { call: { quality, side: 'student', cost, said, square: better?.square ?? '', namesBetter: args.bestSan } };
  }
  // STILL WINNING IS SAID FIRST (hand walk 1380, move 22: "gxh5 was a
  // mistake" — it won two pieces and left White +4). When the mover is still
  // clearly winning after the move, the teaching is the cleaner way, not a
  // grade: "gxh5 still wins, but Rxf8+ was cleaner — it would land a fork."
  // THE REASON — the one computer every surface speaks (`betterMoveReason`):
  // checks first, then what the line wins. A mate stop overrides it.
  const reason = stopsMate
    ? 'it would stop the mate'
    : args.bestLineUci ? betterMoveReason(args.fenBefore, args.playedSan, args.bestSan, args.bestLineUci, args.moverColor) : null;
  const after = args.moverEvalAfterCp;
  // …and CLEARLY BETTER is not a mistake either (pass-2 walk 2026-09-30: his
  // Bxc5 went +3.1 → +1.9 and was graded "a mistake" where he said "knocking
  // on the door of victory"). Still clearly on top: the teaching is the cleaner
  // way. "Wins" only where the eval says so.
  if (typeof after === 'number' && after >= STILL_BETTER_CP && quality !== 'blunder' && (args.allowedMate ?? null) === null) {
    const stands = after >= BLUNDER_CP ? 'still wins' : 'keeps you clearly on top';
    const said = reason
      ? `${args.playedSan} ${stands}, but ${args.bestSan} was cleaner — ${reason}.`
      : `${args.playedSan} ${stands}.`;
    return { call: { quality, side: 'student', cost, said, square: better?.square ?? '', ...(reason ? { namesBetter: args.bestSan } : {}) } };
  }
  if (typeof after === 'number' && after >= BLUNDER_CP && (args.allowedMate ?? null) === null) {
    const said = reason
      ? `${args.playedSan} still wins, but ${args.bestSan} was cleaner — ${reason}.`
      : `${args.playedSan} still wins.`;
    return { call: { quality, side: 'student', cost, said, square: better?.square ?? '', ...(reason ? { namesBetter: args.bestSan } : {}) } };
  }
  // THE GRADE CARRIES ITS COST (Blumenfeld walk F16/F23/F31): what the move
  // let them do, read off their own best line by the same reader that says why
  // a better move is better — and whether they actually did it.
  const punishment = quality === 'inaccuracy' ? null : punishmentOf(args.fenBefore, args.playedSan, args.replyLineUci, args.moverColor);
  // NAMED WITH ITS REASON, OR NOT NAMED (Learn walk, fresh Nimzo game,
  // 2026-09-26: "exd5 was a mistake. e5 was the move." — nothing said why).
  const should = reason ? ` ${args.bestSan} was the move — ${reason}.` : '';
  const grade = quality === 'blunder' ? 'a blunder' : quality === 'mistake' ? 'a mistake' : 'a little loose';
  const head = punishment
    ? `${args.playedSan} was ${grade} — it let them ${punishment.why}${punishment.first && args.replySan !== null && bare(args.replySan) !== bare(punishment.first) ? ', and they missed it' : ''}.`
    : (args.missedMate ?? null) !== null
      // A LOST MATE is the cost when nothing was taken (Damiano walk, 32.Rxc7).
      ? `${args.playedSan} was ${grade} — it let a forced mate slip.`
      // NEVER A BARE GRADE (run B walk 2026-09-30: "Nf5 was a mistake." and
      // nothing else). With no punishment and no better-move reason, the one
      // computed fact left is what it cost.
      : `${args.playedSan} was ${grade}${should ? '' : ` — it gave away ${costWords(cost)}`}.`;
  return { call: { quality, side: 'student', cost, said: `${head}${should}`, square: better?.square ?? '', ...(punishment?.lostSquare ? { lostSquare: punishment.lostSquare } : {}), ...(should ? { namesBetter: args.bestSan } : {}) } };
}

/** What the played move let the OTHER side do: their best line after it, read
 *  by `whyBetter` (the capture it wins, else the plan's leading clause), plus
 *  that line's first move as SAN so the caller can say whether it was played. */
function punishmentOf(
  fenBefore: string, playedSan: string, replyLineUci: readonly string[], moverColor: 'white' | 'black',
): { why: string; first: string | null; lostSquare?: string } | null {
  if (!replyLineUci || replyLineUci.length < 4) return null;
  let fenAfter: string;
  let first: string | null = null;
  try {
    const c = new Chess(fenBefore);
    c.move(playedSan);
    fenAfter = c.fen();
    const u = replyLineUci[0];
    first = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })?.san ?? null;
  } catch { return null; }
  // A CAPTURE THAT WINS is the cost, said as what they take — same rule as
  // `whyBetter` (more than the capturer is worth, or outright).
  try {
    const b = new Chess(fenAfter);
    const u = replyLineUci[0];
    const m = b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    const NAME: Record<string, string> = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
    const outright = m?.captured ? legalSeeGain(fenAfter, m.to) >= MATERIAL_VALUE[m.captured] : false;
    if (m?.captured && NAME[m.captured] && (MATERIAL_VALUE[m.captured] > MATERIAL_VALUE[m.piece] || outright)) {
      return { why: `take your ${NAME[m.captured]} on ${m.to}`, first, lostSquare: m.to };
    }
  } catch { /* fall through to the plan read */ }
  // Otherwise THEIR half of the plan, seated from the student's side so its
  // pronouns point the right way ("toward your king", not "their king").
  // Only a clause that IS a cost — material, mate, the king's shelter. "Trade
  // off the knight" was the lead for …Qd7 (Blumenfeld walk), true and not why it
  // cost three pawns; then the punishing move itself is the honest answer.
  const plan = planFromUci(fenAfter, replyLineUci, moverColor);
  const lead = plan?.theirs.spokenClauses[0];
  if (lead?.text && !lead.drift && isCostClause(lead.text)) return { why: lead.text, first };
  // A FORCED ANSWER IS NOT AN OPENING (1200 Sicilian walk 2026-09-27: "Nf6+
  // was a mistake — it let them in with Kg7"). When the played move gave check,
  // their first move is the reply the check forced; naming it as what the move
  // "let them" do is a sentence about nothing.
  // …unless the answer is itself a CHECK: then it is not what the check forced
  // but what the check walked into (Bowdler walk 2026-09-27, 29…Rd4+ Kf5+ — the
  // king stepped off the g-file and the rook on g1 checked behind it).
  if (/[+#]$/.test(playedSan) && first && !/x|[+#]$/.test(first)) return null;
  if (first && /[+#]$/.test(first)) {
    const disc = discoveredBy(fenAfter, replyLineUci[0]);
    if (disc) return { why: `in with ${first}, a discovered check from the ${disc}`, first };
  }
  // Nor is a QUIET reply something the move "let them in with": "let them in
  // with Kg6" (Damiano walk), "let them in with Neg6", "…with e5" (Colle walk,
  // 2026-09-27) named a retreat and a pawn push as if they broke in. Only a
  // capture or a check is an entry the mistake opened; anything else is what
  // the cost clause above exists to name, and when it can't, the grade stands
  // alone.
  if (first && !/x|[+#]$/.test(first)) return null;
  // …and a capture is an entry only when THEIR LINE WINS something: "it let
  // them in with Bxf3" (Alekhine re-walk ply 49) named a bishop trade that
  // nets nothing over the line. Counted over the whole line, not the first
  // capture — Bxf6 Bxf6 Nxe4 (Blumenfeld F16) opens with an even trade and
  // still wins the pawn.
  if (first && !/[+#]$/.test(first) && lineNetFor(fenAfter, replyLineUci) <= 0) return null;
  // …and only an entry THE MOVE OPENED (walk 2026-09-30: "Raf8 let them in with
  // Nxb6" — Nxb6 was there before Raf8; the cost was missing …Nd4). The same
  // line on the board before the move, them to play, winning as much, is not
  // what it let in.
  if (first && wonBefore(fenBefore, replyLineUci) >= lineNetFor(fenAfter, replyLineUci)) return null;
  return first ? { why: `in with ${first}`, first } : null;
}

/** What the same line nets for them on the board BEFORE the student's move
 *  (them to move). -Infinity when the line cannot be played there — then the
 *  move is what made it possible. */
function wonBefore(fenBefore: string, lineUci: readonly string[]): number {
  try {
    const parts = fenBefore.split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
    const c = new Chess(parts.join(' '));
    const me = c.turn();
    let net = 0;
    for (const u of lineUci) {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) return -Infinity;
      if (m.captured) net += (m.color === me ? 1 : -1) * MATERIAL_VALUE[m.captured];
    }
    return net;
  } catch { return -Infinity; }
}

/** Clearly better after the move (+1.5): a drop that leaves you here is a
 *  cleaner way missed, not a mistake. */
export const STILL_BETTER_CP = 150;


/** Material the side to move nets over a line (captures only, in pawns). */
function lineNetFor(fen: string, lineUci: readonly string[]): number {
  try {
    const c = new Chess(fen);
    const me = c.turn();
    let net = 0;
    for (const u of lineUci) {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (m?.captured) net += (m.color === me ? 1 : -1) * MATERIAL_VALUE[m.captured];
    }
    return net;
  } catch { return 0; }
}

/** The verdict alone — the shape every existing caller already expects.
 *  One implementation (`callInaccuracyDetailed`), two views, so the reason can
 *  never drift from the decision that produced it. */
export function callInaccuracy(args: Parameters<typeof callInaccuracyDetailed>[0]): InaccuracyCall | null {
  return callInaccuracyDetailed(args).call;
}

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The coach's best move was a capture it did not play, and after the move it
 *  DID play that capture is still on: the student's piece is still hanging. */
function missedCaptureStillOn(fenBefore: string, playedSan: string, bestSan: string | null): { piece: string; square: string } | null {
  if (!bestSan) return null;
  try {
    const probe = new Chess(fenBefore);
    const best = probe.move(bestSan);
    if (!best?.captured) return null;
    const after = new Chess(fenBefore);
    after.move(playedSan);
    const victim = after.get(best.to);
    if (!victim || victim.color === best.color) return null;
    // Student to move now; would the coach still win it next turn?
    const parts = after.fen().split(' ');
    parts[1] = best.color;
    parts[3] = '-';
    const again = new Chess(parts.join(' '));
    const stillOn = again.moves({ verbose: true }).some((m) => m.to === best.to && !!m.captured);
    return stillOn ? { piece: PIECE_NAME[victim.type] ?? 'piece', square: best.to } : null;
  } catch { return null; }
}

/** The file a pawn push offers to open toward the enemy king: the pushed pawn
 *  can be captured, and after that capture the mover has no pawn left on the
 *  file, which lies within one file of their king. Null otherwise. Computed
 *  from the board — never inferred from the move's name. */
export function gambitFile(fenBefore: string, playedSan: string, moverColor: 'white' | 'black'): string | null {
  try {
    const b = new Chess(fenBefore);
    const mv = b.move(playedSan);
    if (!mv || mv.piece !== 'p' || mv.captured) return null;
    const me = moverColor === 'white' ? 'w' : 'b';
    const them = me === 'w' ? 'b' : 'w';
    const takers = b.moves({ verbose: true }).filter((m) => m.to === mv.to && m.captured === 'p');
    if (takers.length === 0) return null;
    // A DEFENDED pawn is not offered: taking it costs them the taker (hand walk
    // 2026-09-24: 18.h3 against …Bg4 was called "h3 offers a pawn" — g2
    // guards h3, so …Bxh3 gxh3 is a bishop for a pawn).
    if (b.attackers(mv.to, me).length > 0) return null;
    const file = mv.to[0];
    let kingFile: string | null = null;
    for (const row of b.board()) for (const c of row) if (c && c.type === 'k' && c.color === them) kingFile = c.square[0];
    if (!kingFile) return null;
    const kf = kingFile;
    const near = (f: string): boolean => Math.abs(kf.charCodeAt(0) - f.charCodeAt(0)) <= 1;
    // A LEVER ON THEIR KING'S COVER: the pushed pawn now hits one of their
    // pawns on a file beside the king (Naroditsky's a5 against b6, "prying
    // open the king") — the file it pries is that pawn's.
    const dir = me === 'w' ? 1 : -1;
    for (const df of [-1, 1]) {
      const f = String.fromCharCode(file.charCodeAt(0) + df);
      const sq = `${f}${Number(mv.to[1]) + dir}` as Square;
      const hit = b.get(sq);
      if (hit && hit.type === 'p' && hit.color === them && near(f)) return f;
    }
    if (!near(file)) return null;
    const after = new Chess(b.fen());
    after.move({ from: takers[0].from, to: takers[0].to });
    for (let r = 1; r <= 8; r += 1) {
      const p = after.get(`${file}${r}` as Square);
      if (p && p.type === 'p' && p.color === me) return null;
    }
    return file;
  } catch { return null; }
}

/** The piece that gives check when `uci` is played on `fen` — but only when it
 *  is NOT the piece that moved (a discovered check), named "rook on g1". */
function discoveredBy(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (!m || !c.inCheck()) return null;
    const kingSq = c.board().flat().find((x) => x && x.type === 'k' && x.color === c.turn())?.square;
    if (!kingSq) return null;
    const checkers = c.attackers(kingSq, m.color).filter((sq) => sq !== m.to);
    if (checkers.length === 0) return null;
    const p = c.get(checkers[0]);
    return p ? `${PIECE_NAME[p.type]} on ${checkers[0]}` : null;
  } catch { return null; }
}
