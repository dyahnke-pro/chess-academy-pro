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
import { planFromUci } from './lookaheadPlan';
import { classifyMove, type MoveQuality } from './moveRating';
import { MISTAKE_CP, BLUNDER_CP } from './engineConstants';
import { MATERIAL_VALUE } from './pieceValues';

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
  | { kind: 'line-wins'; why: string };

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
  const better = whyBetter(fenBefore, bestLineUci, moverColor);
  return better ? { kind: 'line-wins', why: better.why } : null;
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
      return `it would ${f.why}`;
  }
}

/** Convenience: the fact, computed and worded — or null. */
export function betterMoveReason(
  fenBefore: string, playedSan: string, bestSan: string, bestLineUci: readonly string[], moverColor: 'white' | 'black',
): string | null {
  const f = betterMoveFact(fenBefore, playedSan, bestSan, bestLineUci, moverColor);
  return f ? phraseBetterMove(f) : null;
}

function whyBetter(
  fenBefore: string,
  bestUci: readonly string[],
  moverColor: 'white' | 'black',
): { why: string; square: string } | null {
  if (bestUci.length < 4) return null;
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
    if (first?.captured && NAME[first.captured] && MATERIAL_VALUE[first.captured] > MATERIAL_VALUE[first.piece]) {
      return { why: `take the ${NAME[first.captured]} on ${first.to}`, square: first.to };
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
  const lead = plan?.mine.spokenClauses[0];
  if (lead?.text) return { why: lead.text, square: lead.squares[0] ?? '' };
  // No clause carried a square (the drift line, and anything square-less that
  // outranked it) — fall back to the sentence, which in that case IS one clause.
  const want = /^You want to ([^.]+)\./.exec(text);
  if (!want) return null;
  const square = plan?.mine.spokenClauses.flatMap((c) => c.squares)[0] ?? '';
  return { why: want[1], square };
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
  /** The mover's eval after the move (their perspective), when a real
   *  centipawn read — null/absent when unknown or a mate score. */
  moverEvalAfterCp?: number | null;
  /** Whose move it was. */
  side: 'student' | 'coach';
  moverColor: 'white' | 'black';
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
    ? { why: 'stop the mate', square: '' }
    : args.bestLineUci
      ? whyBetter(args.fenBefore, args.bestLineUci, args.moverColor)
      : null;
  const cost = Math.round(Math.max(0, args.cpLoss));

  // THE COACH OWNS ITS OWN MISTAKES, IN THE FIRST PERSON, AND HANDS THE STUDENT
  // THE PUNISHMENT. Naming the move here is correct and is NOT the honesty
  // contract being bent: that contract withholds the STUDENT's move so they
  // have something to find. A move the coach has already played is on the
  // board — hiding it would be coyness, not teaching.
  if (args.side === 'coach') {
    const head = quality === 'blunder'
      ? `That was a blunder from me — ${args.playedSan} gives away real material.`
      : quality === 'mistake'
        ? `That was a mistake from me. ${args.playedSan} is not what the position wanted.`
        : `A touch inaccurate from me — ${args.playedSan} is not quite right.`;
    const should = better ? ` ${args.bestSan} was the move, to ${better.why}.` : ` ${args.bestSan} was the move.`;
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
    return { call: { quality, side: 'student', cost, said, square: better?.square ?? '' } };
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
  if (typeof after === 'number' && after >= BLUNDER_CP && (args.allowedMate ?? null) === null) {
    const said = reason
      ? `${args.playedSan} still wins, but ${args.bestSan} was cleaner — ${reason}.`
      : `${args.playedSan} still wins, but ${args.bestSan} was cleaner.`;
    return { call: { quality, side: 'student', cost, said, square: better?.square ?? '' } };
  }
  const head = quality === 'blunder'
    ? `${args.playedSan} was a blunder.`
    : quality === 'mistake'
      ? `${args.playedSan} was a mistake.`
      : `${args.playedSan} was a little loose.`;
  const should = reason ? ` ${args.bestSan} was the move — ${reason}.` : ` ${args.bestSan} was the move.`;
  return { call: { quality, side: 'student', cost, said: `${head}${should}`, square: better?.square ?? '' } };
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
